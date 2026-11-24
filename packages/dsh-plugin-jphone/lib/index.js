import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JPhoneStore } from './store.mjs'
import { JPhoneWsHub } from './ws.mjs'
import { JPhoneOrchestrator } from './orchestrator.mjs'
import { createJPhoneHttpHandler } from './http.mjs'
import { createTunnelManager } from './tunnel.mjs'
import { createSessionWatcher } from './session-watch.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(PLUGIN_ROOT, '..', '..')

export const name = 'dsh-plugin-jphone'
export const inject = ['webServer']

function getDataRoot() {
  if (process.env.JPHONE_DATA_DIR) return resolve(process.env.JPHONE_DATA_DIR)
  const dshHome = process.env.DSH_HOME || join(process.env.HOME || '/tmp', '.dsh')
  return join(dshHome, 'jphone')
}

export function apply(ctx, config = {}) {
  const dataRoot = config.dataDir ? resolve(config.dataDir) : getDataRoot()
  const workspaceDir = config.workspaceDir ? resolve(config.workspaceDir) : join(dataRoot, 'workspace')
  const skillsDir = config.skillsDir
    ? resolve(config.skillsDir)
    : (existsSync(join(PLUGIN_ROOT, 'skills')) ? join(PLUGIN_ROOT, 'skills') : join(REPO_ROOT, 'skills'))
  const characterAssetsDir = config.characterAssetsDir
    ? resolve(config.characterAssetsDir)
    : (existsSync(join(PLUGIN_ROOT, 'assets', 'character'))
      ? join(PLUGIN_ROOT, 'assets', 'character')
      : join(REPO_ROOT, 'assets', 'character'))
  const webDistDir = config.webDistDir ? resolve(config.webDistDir) : join(PLUGIN_ROOT, 'web-dist')
  const bridgePort = Number(config.bridgePort ?? process.env.JPHONE_BRIDGE_PORT ?? 3189)
  const explicitBridgeHost = config.bridgeHost ?? null

  const wsHub = new JPhoneWsHub()
  const svcRefs = {
    sessionController: null,
    agents: null,
    sessions: null,
    workspaceRegistry: null,
  }

  let bridgeServer = null
  let activeBridgeHost = null
  let bridgeBindChain = Promise.resolve()

  const bridgeHttpHandler = async (req, res) => {
    const rt = await readyPromise
    return rt.bridgeRawHttpHandler(req, res)
  }

  const bindBridgeServer = (host) => {
    const run = async () => {
      if (bridgePort <= 0) return null
      if (bridgeServer && activeBridgeHost === host) return activeBridgeHost
      if (bridgeServer) {
        const prev = bridgeServer
        bridgeServer = null
        activeBridgeHost = null
        await new Promise((resolveClose) => {
          try { prev.closeAllConnections?.() } catch {}
          try { prev.close(() => resolveClose()) } catch { resolveClose() }
        })
      }
      const nextServer = createServer((req, res) => {
        void bridgeHttpHandler(req, res)
      })
      nextServer.on('upgrade', (req, socket, head) => {
        const pathname = (req.url || '/').split('?')[0]
        if (pathname === '/jphone/ws') {
          wsHub.handleUpgrade(req, socket, head)
        } else {
          socket.destroy()
        }
      })
      await new Promise((resolveListen, rejectListen) => {
        const onErr = (err) => {
          console.warn(`[dsh-plugin-jphone] bridge listener on ${host}:${bridgePort} error:`, err.message)
          rejectListen(err)
        }
        nextServer.once('error', onErr)
        nextServer.listen(bridgePort, host, () => {
          nextServer.off('error', onErr)
          nextServer.on('error', (err) => {
            console.warn(`[dsh-plugin-jphone] bridge listener on ${host}:${bridgePort} error:`, err.message)
          })
          console.log(`[dsh-plugin-jphone] mobile bridge listening at http://${host}:${bridgePort}/jphone/`)
          resolveListen()
        })
      })
      bridgeServer = nextServer
      activeBridgeHost = host
      return host
    }
    bridgeBindChain = bridgeBindChain.then(run, run)
    return bridgeBindChain
  }

  const rebindBridge = async (enableLan) => {
    const targetHost = enableLan ? '0.0.0.0' : '127.0.0.1'
    return bindBridgeServer(targetHost)
  }

  let runtime = null
  const readyPromise = (async () => {
    const store = await JPhoneStore.open(dataRoot)
    const orchestrator = new JPhoneOrchestrator({
      store,
      workspaceDir,
      skillsDir,
      sessionController: svcRefs.sessionController,
      agents: svcRefs.agents,
      sessions: svcRefs.sessions,
      workspaceRegistry: svcRefs.workspaceRegistry,
      onBroadcast: (msg) => wsHub.broadcast(msg),
    })
    await orchestrator.ensureWorkspace()
    const tunnelManager = createTunnelManager({ bridgePort, store })
    const rawHttpHandler = createJPhoneHttpHandler({
      store,
      orchestrator,
      wsHub,
      webDistDir,
      characterAssetsDir,
      bridgePort,
      tunnelManager,
      rebindBridge,
      requireToken: false,
    })
    const bridgeRawHttpHandler = createJPhoneHttpHandler({
      store,
      orchestrator,
      wsHub,
      webDistDir,
      characterAssetsDir,
      bridgePort,
      tunnelManager,
      rebindBridge,
      requireToken: true,
    })
    runtime = { store, orchestrator, tunnelManager, rawHttpHandler, bridgeRawHttpHandler, createSessionWatcher }
    if (bridgePort > 0) {
      const initialHost = explicitBridgeHost || (store.isLanBridgeEnabled() ? '0.0.0.0' : '127.0.0.1')
      void bindBridgeServer(initialHost).catch(() => {})
    }
    return runtime
  })().catch((err) => {
    console.error('[dsh-plugin-jphone] init error:', err)
    throw err
  })

  // Inject optional DSH services strictly via Cordis sub-scopes
  for (const svc of ['sessionController', 'agents', 'sessions', 'workspaceRegistry']) {
    if (typeof ctx.inject === 'function') {
      ctx.inject([svc], (sub) => {
        svcRefs[svc] = sub[svc]
        if (runtime) {
          runtime.orchestrator[svc] = sub[svc]
          if (svc === 'workspaceRegistry') void runtime.orchestrator.ensureWorkspace().catch(() => {})
        }
        sub.effect(() => () => {
          if (svcRefs[svc] === sub[svc]) svcRefs[svc] = null
          if (runtime && runtime.orchestrator[svc] === sub[svc]) runtime.orchestrator[svc] = null
        })
      })
    }
  }

  const httpHandler = async (req, res) => {
    const rt = await readyPromise
    return rt.rawHttpHandler(req, res)
  }

  // 1. Register routes on DSH WebServer (Desktop/Web embedded JPhone + Mini-pet)
  // Note: dsh-host-webserver matches prefix as pathname === prefix || pathname.startsWith(prefix + "/")
  const disposeExact = () => {}
  const disposePrefix = ctx.webServer.register({
    kind: 'prefix',
    path: '/jphone',
    handler: httpHandler,
  })
  const disposeUpgrade = ctx.webServer.registerUpgrade({
    path: '/jphone/ws',
    handler: (req, socket, head) => {
      wsHub.handleUpgrade(req, socket, head)
    },
  })

  // 2. Local/LAN bridge HTTP/WS server is started by readyPromise based on persisted store.isLanBridgeEnabled()

  // 3. Register JPhone built-in Skills provider into DSH SkillRegistry
  if (typeof ctx.inject === 'function') {
    ctx.inject(['skills'], (skillCtx) => {
      if (!skillCtx.skills?.registerProvider) return
      const provider = {
        name: 'jphone-workshop',
        async list() {
          const rt = await readyPromise
          const items = await rt.orchestrator.listSkills()
          return items.map((s) => ({
            name: s.name,
            description: s.description,
            invocation: { modelInvocable: true, userInvocable: true },
            provider: 'jphone-workshop',
            source: 'bundled',
            resourceBase: { kind: 'directory', path: join(skillsDir, s.name) },
            rank: 600,
            locator: s.path,
          }))
        },
        async get(candidate) {
          const content = await readFile(candidate.locator, 'utf8')
          return {
            name: candidate.name,
            description: candidate.description,
            invocation: candidate.invocation,
            provider: 'jphone-workshop',
            source: 'bundled',
            resourceBase: candidate.resourceBase,
            content,
          }
        },
      }
      skillCtx.skills.registerProvider(() => provider)
    })

    // 4. Register 小鲸同学 fast companion orchestration & presentation tools
    ctx.inject(['tools'], (toolCtx) => {
      if (!toolCtx.tools?.register) return
      const registerJsonTool = ({ toolName, description, parameters, execute }) => {
        toolCtx.tools.register({
          name: toolName,
          description,
          parameters,
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
          },
          execute: async (args) => {
            const rt = await readyPromise
            return execute(rt, args)
          },
        })
      }

      registerJsonTool({
        toolName: 'jphone_dispatch_task',
        description: '为小鲸同学在 DeepSeek Harness 工作区派发一个异步后台子任务（原生 DSH Session），不阻塞主聊天窗口。',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '简短任务标题' },
            prompt: { type: 'string', description: '交给后台子 Agent 执行的完整指令' },
            preset: { type: 'string', description: '可选 DSH preset，默认 standard' },
          },
          required: ['title', 'prompt'],
        },
        execute: async (rt, args) => rt.orchestrator.dispatchTask({
          title: String(args.title || '后台任务'),
          prompt: String(args.prompt || ''),
          preset: args.preset ? String(args.preset) : 'standard',
        }),
      })

      registerJsonTool({
        toolName: 'jphone_set_mood',
        description: '更新小鲸同学在鲸Phone虚拟桌面和桌面Q版小人上的当前表情状态（idle / happy / thinking / sleepy）。',
        parameters: {
          type: 'object',
          properties: {
            mood: { type: 'string', enum: ['idle', 'happy', 'thinking', 'sleepy'] },
          },
          required: ['mood'],
        },
        execute: async (rt, args) => {
          const character = await rt.store.setMood(String(args.mood || 'idle'))
          wsHub.broadcast({ type: 'character:mood', mood: character.mood })
          return { ok: true, character }
        },
      })

      registerJsonTool({
        toolName: 'jphone_install_miniapp',
        description: '将一个 HTML Mini-App 安装到鲸Phone桌面（支持 window.jing 桥接 API）。',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '英文短 ID，如 pomotimer' },
            name: { type: 'string', description: '应用显示名称' },
            icon: { type: 'string', description: 'Lucide 图标名称，如 notebook-pen / timer / sparkles' },
            description: { type: 'string', description: '一句话介绍' },
            html: { type: 'string', description: '完整的 HTML5 单页源码' },
          },
          required: ['id', 'name', 'html'],
        },
        execute: async (rt, args) => {
          const app = await rt.store.installMiniApp({
            id: String(args.id),
            name: String(args.name),
            icon: args.icon ? String(args.icon) : 'sparkles',
            description: args.description ? String(args.description) : '',
            html: String(args.html),
          })
          wsHub.broadcast({ type: 'miniapp:installed', app: { id: app.id, name: app.name, icon: app.icon, description: app.description } })
          return { ok: true, app: { id: app.id, name: app.name, icon: app.icon } }
        },
      })

      registerJsonTool({
        toolName: 'jphone_bind_endpoint',
        description: '绑定鲸Phone 的公网穿透地址（Cloudflare Tunnel / Tailscale / frp），以便手机端远程连接本地 DSH。',
        parameters: {
          type: 'object',
          properties: {
            publicUrl: { type: 'string', description: '公网可访问 HTTPS 地址，如 https://xxx.trycloudflare.com' },
            provider: { type: 'string', description: '穿透方式，如 cloudflared / tailscale / frp / custom' },
          },
          required: ['publicUrl'],
        },
        execute: async (rt, args) => {
          const urlStr = String(args.publicUrl || '').trim()
          const provider = String(args.provider || 'custom').trim()
          await rt.store.bindRemoteEndpoint(urlStr, provider)
          wsHub.broadcast({ type: 'endpoint:updated', publicUrl: urlStr, provider })
          return { ok: true, remoteEndpoint: rt.store.data.remoteEndpoint }
        },
      })
    })
  }

  // 5. Subscribe to DSH native session/agent events (inspired by PC2005-cloud/dsh-pet)
  let sessionWatcher = null
  const onSessionEvent = (sessionOrEv, maybeEvent) => {
    if (!runtime) return
    if (!sessionWatcher && runtime.createSessionWatcher) {
      sessionWatcher = runtime.createSessionWatcher({ store: runtime.store, wsHub, workspaceMemory: runtime.orchestrator?.workspaceMemory })
    }
    if (sessionWatcher) {
      sessionWatcher.handleSessionEvent(sessionOrEv, maybeEvent)
      return
    }
    const sid = sessionOrEv?.header?.id || sessionOrEv?.id || sessionOrEv?.sessionId
    if (sid && sid === runtime.store.data.mainSessionId) {
      wsHub.broadcast({ type: 'chat:update', sessionId: sid })
    }
  }
  const disposeEv1 = typeof ctx.on === 'function' ? ctx.on('session/event', onSessionEvent) : () => {}
  const disposeEv2 = typeof ctx.on === 'function' ? ctx.on('agent/assistant-stream', onSessionEvent) : () => {}

  ctx.effect(() => () => {
    try { disposeExact?.() } catch {}
    try { disposePrefix?.() } catch {}
    try { disposeUpgrade?.() } catch {}
    try { disposeEv1?.() } catch {}
    try { disposeEv2?.() } catch {}
    try { sessionWatcher?.dispose() } catch {}
    try { runtime?.tunnelManager?.dispose() } catch {}
    wsHub.closeAll()
    if (bridgeServer) {
      try { bridgeServer.close() } catch {}
    }
  })
}
