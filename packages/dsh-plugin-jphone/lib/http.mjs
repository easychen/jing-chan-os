import { createHmac, timingSafeEqual } from 'node:crypto'
import { renderQrSvg } from './qrcode.mjs'
import { fileURLToPath } from 'node:url'
import { LAV_POC_HTML } from './lav-poc.mjs'
import { synthesizeTts, transcribeAsr, runVoiceTurn, consumeVoiceTaskFollowups, endVoiceCall, generateDiaryPost, generateDiaryReply } from './voice.mjs'
import { formatLocalDateKey } from './store.mjs'
import { isValidServerChanKey, maskServerChanKey, buildAppKeyCreateUrl, sendServerChanNotification, notifyIfEnabled } from './notify.mjs'
import { fetchWorkshopIndex, inspectGitPackage, installGitPackage } from './workshop.mjs'
import { listAlbumsWithStatus, startAlbumDownload, deleteDownloadedAlbum, resolveDownloadedAlbumTrackPath } from './focus-albums.mjs'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.vtt': 'text/vtt; charset=utf-8',
  '.mov': 'video/quicktime',
  '.frag': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8').trim()
  return text ? JSON.parse(text) : {}
}

function resolveAllowedOrigin(req, store) {
  const origin = String(req?.headers?.origin || '').trim()
  if (!origin) return ''
  try {
    const u = new URL(origin)
    const host = u.hostname.toLowerCase()
    if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return origin
    const reqHost = String(req?.headers?.host || '').split(':')[0].toLowerCase()
    if (reqHost && host === reqHost) return origin
    const pub = store?.data?.remoteEndpoint?.publicUrl
    if (pub) {
      const pu = new URL(pub)
      if (pu.origin === u.origin) return origin
    }
  } catch {}
  return ''
}

function corsHeaders(req, store) {
  const allowed = resolveAllowedOrigin(req, store)
  const h = {
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-jphone-app-token',
  }
  if (allowed) {
    h['access-control-allow-origin'] = allowed
    h['vary'] = 'Origin'
  }
  return h
}

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(body)
}

function sendMediaBuffer(req, res, buf, mime, cacheControl = 'public, max-age=300') {
  const total = buf.length
  const baseHeaders = {
    'content-type': mime,
    'accept-ranges': 'bytes',
    'cache-control': cacheControl,
    'access-control-allow-origin': '*',
  }
  const rangeHdr = String(req?.headers?.range || '').trim()
  if (rangeHdr && rangeHdr.startsWith('bytes=')) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHdr)
    if (m) {
      let start = m[1] === '' ? 0 : parseInt(m[1], 10)
      let end = m[2] === '' ? total - 1 : parseInt(m[2], 10)
      if (m[1] === '' && m[2] !== '') {
        const suffix = parseInt(m[2], 10)
        start = Math.max(0, total - suffix)
        end = total - 1
      }
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start < total) {
        end = Math.min(total - 1, Math.max(start, end))
        const slice = buf.subarray(start, end + 1)
        res.writeHead(206, {
          ...baseHeaders,
          'content-range': `bytes ${start}-${end}/${total}`,
          'content-length': String(slice.length),
        })
        res.end(req?.method === 'HEAD' ? undefined : slice)
        return
      }
      res.writeHead(416, {
        ...baseHeaders,
        'content-range': `bytes */${total}`,
      })
      res.end()
      return
    }
  }
  res.writeHead(200, {
    ...baseHeaders,
    'content-length': String(total),
  })
  res.end(req?.method === 'HEAD' ? undefined : buf)
}

async function serveFileFromDir(res, rootDir, relPath, req = null) {
  const cleanRel = decodeURIComponent(relPath).replace(/^\/+/, '')
  const root = resolve(rootDir)
  const target = resolve(normalize(join(root, cleanRel)))
  if (target !== root && !target.startsWith(root + sep)) {
    res.writeHead(403)
    res.end('Forbidden')
    return true
  }
  try {
    const bytes = await readFile(target)
    const mime = MIME[extname(target).toLowerCase()] || 'application/octet-stream'
    sendMediaBuffer(req, res, bytes, mime, target.endsWith('.html') ? 'no-cache' : 'public, max-age=300')
    return true
  } catch {
    return false
  }
}

const PLUGIN_ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url))
const PLUGIN_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
    return String(pkg.version || '0.0.0')
  } catch {
    return '0.0.0'
  }
})()


function capabilitySecret(store) {
  return String(store?.data?.pairingToken || 'jphone-local-cap-secret')
}

function mintAppCapabilityToken(store, app) {
  const payload = Buffer.from(JSON.stringify({
    appId: app.id,
    permissions: Array.isArray(app.permissions) ? app.permissions : ['storage'],
  })).toString('base64url')
  const sig = createHmac('sha256', capabilitySecret(store)).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyAppCapabilityToken(store, token) {
  const raw = String(token || '').trim()
  const dot = raw.indexOf('.')
  if (dot <= 0) return null
  const payload = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = createHmac('sha256', capabilitySecret(store)).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed.appId !== 'string') return null
    return {
      appId: parsed.appId,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    }
  } catch {
    return null
  }
}

export function createJPhoneHttpHandler({ store, orchestrator, wsHub = null, voiceConfig = {}, webDistDir, characterAssetsDir, bridgePort = 3189, tunnelManager = null, rebindBridge = null, requireToken = false, notifyFetchImpl, workshopOptions = {} }) {
  return async function handleJPhoneRequest(req, res) {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const pathname = url.pathname
    const cors = corsHeaders(req, store)
    const replyJson = (status, data) => sendJson(res, status, data, cors)

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      res.end()
      return
    }

    // M5: Parse optional per-app capability token (X-JPhone-App-Token)
    const rawAppToken = String(req.headers['x-jphone-app-token'] || '').trim()
    let appCap = null
    if (rawAppToken) {
      appCap = verifyAppCapabilityToken(store, rawAppToken)
      if (!appCap) {
        replyJson(403, { ok: false, error: 'permission_denied', reason: 'invalid_app_token' })
        return
      }
    }

    // Mandatory token gate for external mobile bridge port (health & partner callback remain reachable; valid appCap also allowed)
    const publicApiPaths = new Set(['/jphone/api/health', '/jphone/api/notify/serverchan/callback'])
    if (requireToken && pathname.startsWith('/jphone/api/') && !publicApiPaths.has(pathname) && !appCap) {
      const auth = req.headers.authorization || ''
      const queryToken = url.searchParams.get('token')
      const hdrToken = String(req.headers['x-jphone-token'] || '').trim()
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (hdrToken || queryToken || '').trim()
      if (!token || token !== store.data.pairingToken) {
        replyJson(401, { ok: false, error: token ? 'invalid_pairing_token' : 'missing_pairing_token' })
        return
      }
    }

    // M5 Sandbox Enforcement: When request originates from a Mini-App capability token, isolate KV & enforce declared permissions!
    if (appCap && pathname.startsWith('/jphone/api/')) {
      const kvTarget = /^\/jphone\/api\/miniapps\/([^/]+)\/kv(?:\/([^/]+))?$/.exec(pathname)
      if (kvTarget) {
        const targetAppId = decodeURIComponent(kvTarget[1])
        if (targetAppId !== appCap.appId) {
          replyJson(403, { ok: false, error: 'permission_denied', reason: 'cross_app_kv_forbidden', appId: appCap.appId, targetAppId })
          return
        }
        if (!appCap.permissions.includes('storage')) {
          replyJson(403, { ok: false, error: 'permission_denied', required: 'storage' })
          return
        }
      } else if (pathname === '/jphone/api/tasks/dispatch' && !appCap.permissions.includes('tasks.dispatch')) {
        replyJson(403, { ok: false, error: 'permission_denied', required: 'tasks.dispatch' })
        return
      } else if (pathname === '/jphone/api/chat/send' && !appCap.permissions.includes('chat.ask')) {
        replyJson(403, { ok: false, error: 'permission_denied', required: 'chat.ask' })
        return
      } else if (pathname === '/jphone/api/notify/event' && !appCap.permissions.includes('notify.push') && !appCap.permissions.includes('ui.notify')) {
        replyJson(403, { ok: false, error: 'permission_denied', required: 'notify.push' })
        return
      } else if (pathname.startsWith('/jphone/api/focus/packs') && req.method !== 'GET' && appCap.appId !== 'jing-focus') {
        replyJson(403, { ok: false, error: 'permission_denied', reason: 'focus_packs_restricted' })
        return
      } else if (pathname.startsWith('/jphone/api/focus/albums') && req.method !== 'GET' && appCap.appId !== 'jing-focus') {
        replyJson(403, { ok: false, error: 'permission_denied', reason: 'focus_albums_restricted' })
        return
      }
    }

    try {
      if (pathname === '/jphone/api/health') {
        replyJson(200, { ok: true, product: 'JPhone', zhName: '小鲸同学', enName: 'JingChan', character: '小鲸同学', version: PLUGIN_VERSION, pluginVersion: PLUGIN_VERSION, bridgePort })
        return
      }

      // M1: Server酱 Notification Configuration, Partner AppKey Callback & Test Push
      if (pathname === '/jphone/api/notify/config' && req.method === 'GET') {
        const cfg = store.getNotificationConfig()
        const hostHdr = req.headers.host || `127.0.0.1:${bridgePort}`
        const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
        const origin = store.data.remoteEndpoint?.publicUrl || `${proto}://${hostHdr}`
        replyJson(200, {
          ok: true,
          enabled: !!cfg.enabled,
          configured: isValidServerChanKey(cfg.sendKey),
          maskedKey: maskServerChanKey(cfg.sendKey),
          notifyOnTaskDone: cfg.notifyOnTaskDone !== false,
          notifyOnFocusDone: cfg.notifyOnFocusDone !== false,
          notifyOnDiaryPost: cfg.notifyOnDiaryPost === true,
          appKeyCreateUrl: buildAppKeyCreateUrl({ origin, appName: '小鲸同学' }),
        })
        return
      }
      if (pathname === '/jphone/api/notify/config' && req.method === 'POST') {
        const body = await readJsonBody(req)
        if (typeof body.sendKey === 'string' && body.sendKey.trim() && !isValidServerChanKey(body.sendKey)) {
          replyJson(400, { ok: false, error: 'invalid_sendkey', message: 'SendKey / AppKey 需以 SCT 或 sctp 开头' })
          return
        }
        const cfg = await store.updateNotificationConfig(body || {})
        replyJson(200, {
          ok: true,
          enabled: !!cfg.enabled,
          configured: isValidServerChanKey(cfg.sendKey),
          maskedKey: maskServerChanKey(cfg.sendKey),
          notifyOnTaskDone: cfg.notifyOnTaskDone !== false,
          notifyOnFocusDone: cfg.notifyOnFocusDone !== false,
          notifyOnDiaryPost: cfg.notifyOnDiaryPost === true,
        })
        return
      }
      if (pathname === '/jphone/api/notify/serverchan/test' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const cfg = store.getNotificationConfig()
        const keyToUse = (typeof body.sendKey === 'string' && body.sendKey.trim()) ? body.sendKey.trim() : cfg.sendKey
        if (!isValidServerChanKey(keyToUse)) {
          replyJson(400, { ok: false, error: 'missing_sendkey', message: '请先填入有效的 Server酱 SendKey 或 AppKey' })
          return
        }
        const pushRes = await sendServerChanNotification({
          sendKey: keyToUse,
          title: String(body.title || '小鲸同学 · Server酱测试通知'),
          desp: String(body.desp || '恭喜！你的「小鲸同学」消息通道已联通。后续后台任务完成、番茄专注结束时将第一时间通知你 ✨'),
          fetchImpl: notifyFetchImpl || globalThis.fetch,
        })
        replyJson(pushRes.ok ? 200 : 502, pushRes)
        return
      }
      if (pathname === '/jphone/api/notify/serverchan/callback' && req.method === 'GET') {
        const key = (url.searchParams.get('key') || url.searchParams.get('serverchan') || '').trim()
        if (!isValidServerChanKey(key)) {
          res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
          res.end('<!doctype html><html><body style="font-family:sans-serif;padding:32px"><h3>无效的 Server酱 AppKey</h3><p>请返回「小鲸同学」重新创建或手动粘贴。</p></body></html>')
          return
        }
        await store.updateNotificationConfig({ sendKey: key, enabled: true })
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Server酱已绑定 · 小鲸同学</title></head><body style="font-family:-apple-system,sans-serif;background:#0A1328;color:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="max-width:380px;padding:28px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);text-align:center"><h2 style="margin:0 0 10px">Server酱 AppKey 绑定成功</h2><p style="opacity:.82;font-size:14px;line-height:1.6">已自动保存 Key（${maskServerChanKey(key)}）到「小鲸同学」设置，现在可以返回点击「发送测试通知」验证啦～</p><a href="/jphone/" style="display:inline-block;margin-top:14px;padding:10px 22px;border-radius:999px;background:#fff;color:#0B1220;text-decoration:none;font-weight:600;font-size:14px">返回 小鲸同学</a></div></body></html>`)
        return
      }
      if (pathname === '/jphone/api/notify/event' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await notifyIfEnabled(store, String(body.eventType || 'focus_done'), {
          title: String(body.title || '小鲸同学 提醒'),
          desp: String(body.desp || ''),
          fetchImpl: notifyFetchImpl || globalThis.fetch,
        })
        replyJson(200, result)
        return
      }
      if (pathname === '/jphone/api/diary/reply' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const reply = await generateDiaryReply({
          postText: body.postText,
          comment: body.comment,
          store,
          apiKey: voiceConfig.apiKey,
          fetchImpl: voiceConfig.fetchImpl,
        })
        replyJson(200, { ok: true, reply })
        return
      }
      if (pathname === '/jphone/api/state' && req.method === 'GET') {
        replyJson(200, { ...store.getState(), pairing: store.getPairingInfo(bridgePort) })
        return
      }
      if (pathname === '/jphone/api/chat/messages' && req.method === 'GET') {
        const dateKey = String(url.searchParams.get('date') || '').trim() || formatLocalDateKey()
        const messages = await orchestrator.listMessages({ dateKey })
        const mainSessionId = store.getDailyMainSession(dateKey) || (!store.data.mainSessionDate ? store.data.mainSessionId : null)
        replyJson(200, { ok: true, dateKey, mainSessionId, messages })
        return
      }
      if (pathname === '/jphone/api/chat/send' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await orchestrator.sendChat(body.text, { background: body.background === true, attachments: body.attachments })
        replyJson(200, result)
        return
      }
      if (pathname === '/jphone/api/tasks' && req.method === 'GET') {
        replyJson(200, { ok: true, workspaceDir: store.data.workspaceDir, tasks: orchestrator.listTasks() })
        return
      }
      if (pathname === '/jphone/api/tasks/dispatch' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const task = await orchestrator.dispatchTask({ title: body.title, prompt: body.prompt, preset: body.preset })
        replyJson(200, { ok: true, task })
        return
      }
      if (pathname === '/jphone/api/tasks/steer' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const sessionId = String(body.sessionId || body.taskId || '').trim()
        const message = String(body.message || body.prompt || '').trim()
        if (!sessionId || !message) {
          replyJson(400, { ok: false, error: 'sessionId and message are required' })
          return
        }
        const task = await orchestrator.steerTask(sessionId, message)
        try { wsHub?.broadcast?.({ type: 'task:update', task }) } catch {}
        replyJson(200, { ok: true, task })
        return
      }
      if (pathname === '/jphone/api/wallpaper' && req.method === 'GET') {
        replyJson(200, { ok: true, wallpaper: store.getWallpaper(), wallpapers: store.listWallpapers() })
        return
      }
      if (pathname === '/jphone/api/wallpaper/config' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const wallpaper = await store.updateWallpaper(body)
        try { wsHub?.broadcast?.({ type: 'wallpaper:updated', wallpaper }) } catch {}
        replyJson(200, { ok: true, wallpaper, wallpapers: store.listWallpapers() })
        return
      }
      if (pathname === '/jphone/api/wallpaper/upload' && req.method === 'POST') {
        const body = await readJsonBody(req)
        if (!body.base64) {
          replyJson(400, { ok: false, error: 'missing_base64' })
          return
        }
        const buffer = Buffer.from(String(body.base64), 'base64')
        const { entry, wallpaper } = await store.saveWallpaperFile({
          filename: body.filename || 'wallpaper.png',
          name: body.name,
          hasPanime: Boolean(body.hasPanime),
          buffer,
        })
        try { wsHub?.broadcast?.({ type: 'wallpaper:updated', wallpaper }) } catch {}
        replyJson(200, { ok: true, entry, wallpaper, wallpapers: store.listWallpapers() })
        return
      }

      // P18: Focus Custom Video / Workshop Character Packs
      if (pathname === '/jphone/api/focus/packs' && req.method === 'GET') {
        replyJson(200, {
          ok: true,
          activeId: store.getActiveFocusPackId(),
          packs: store.listFocusPacks(),
        })
        return
      }
      if (pathname === '/jphone/api/focus/packs/select' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const id = String(body.id || 'xiaojing').trim()
        try {
          const res = await store.setActiveFocusPack(id)
          try { wsHub?.broadcast?.({ type: 'focusPacks:updated', ...res }) } catch {}
          replyJson(200, { ok: true, ...res })
        } catch (err) {
          replyJson(404, { ok: false, error: err?.message || 'pack_not_found' })
        }
        return
      }
      if (pathname === '/jphone/api/focus/packs/upload' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const raw = String(body.dataBase64 || body.base64 || '').trim()
        if (!raw) {
          replyJson(400, { ok: false, error: 'missing_media_data' })
          return
        }
        const stripped = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
        const buffer = Buffer.from(stripped, 'base64')
        try {
          const res = await store.saveCustomFocusMedia({
            packId: body.packId || '',
            name: body.name || '',
            slot: body.slot || 'stand',
            filename: body.filename || 'loop.webm',
            buffer,
            source: 'local',
            author: 'local',
            activate: body.activate !== false,
          })
          try { wsHub?.broadcast?.({ type: 'focusPacks:updated', activeId: res.activeId, packs: res.packs }) } catch {}
          replyJson(200, { ok: true, ...res })
        } catch (err) {
          replyJson(400, { ok: false, error: err?.message || 'upload_failed' })
        }
        return
      }
      if (pathname.startsWith('/jphone/api/focus/packs/') && req.method === 'DELETE') {
        const id = decodeURIComponent(pathname.slice('/jphone/api/focus/packs/'.length)).trim()
        if (!id || id === 'xiaojing') {
          replyJson(400, { ok: false, error: 'cannot_delete_builtin' })
          return
        }
        const res = await store.deleteFocusPack(id)
        if (!res.deleted) {
          replyJson(404, { ok: false, error: 'pack_not_found' })
          return
        }
        try { wsHub?.broadcast?.({ type: 'focusPacks:updated', activeId: res.activeId, packs: res.packs }) } catch {}
        replyJson(200, { ok: true, ...res })
        return
      }

      // Focus Lo-Fi Albums (on-demand download from GitHub Releases into local DSH dataDir)
      if (pathname === '/jphone/api/focus/albums' && req.method === 'GET') {
        const res = await listAlbumsWithStatus({ dataDir: store.dir, pluginAssetsDir: PLUGIN_ASSETS_DIR })
        replyJson(200, res)
        return
      }
      const focusAlbumDlMatch = /^\/jphone\/api\/focus\/albums\/([^/]+)\/download$/.exec(pathname)
      if (focusAlbumDlMatch && req.method === 'POST') {
        const albumId = decodeURIComponent(focusAlbumDlMatch[1]).trim()
        let body = {}
        try { body = await readJsonBody(req) } catch {}
        const result = await startAlbumDownload(albumId, {
          dataDir: store.dir,
          baseUrl: typeof body?.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl.trim() : undefined,
          onProgress: (prog) => {
            try { wsHub?.broadcast?.({ type: 'focusAlbums:progress', ...prog }) } catch {}
          },
        })
        if (!result.ok) {
          replyJson(404, result)
          return
        }
        const { _donePromise, ...publicRes } = result
        replyJson(200, publicRes)
        return
      }
      const focusAlbumDelMatch = /^\/jphone\/api\/focus\/albums\/([^/]+)$/.exec(pathname)
      if (focusAlbumDelMatch && req.method === 'DELETE') {
        const albumId = decodeURIComponent(focusAlbumDelMatch[1]).trim()
        const result = await deleteDownloadedAlbum(albumId, { dataDir: store.dir })
        if (!result.ok) {
          replyJson(404, result)
          return
        }
        try { wsHub?.broadcast?.({ type: 'focusAlbums:updated', albumId }) } catch {}
        const updated = await listAlbumsWithStatus({ dataDir: store.dir, pluginAssetsDir: PLUGIN_ASSETS_DIR })
        replyJson(200, { ...result, albums: updated.albums })
        return
      }
      if (pathname === '/jphone/api/mood' && req.method === 'POST') {
        const body = await readJsonBody(req)
        await store.setMood(body.mood || 'idle', body.moodText)
        replyJson(200, { ok: true, mood: store.data.mood, moodText: store.data.moodText })
        return
      }
      // P3: DeepSeek Official Voice (TTS / ASR / Turn) & Diary Generation
      if (pathname === '/jphone/api/voice/tts' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const { buffer, contentType } = await synthesizeTts({
          text: body.text,
          voiceId: body.voice_id || body.voiceId || 'stella',
          format: body.format || 'wav',
          ...voiceConfig,
        })
        res.writeHead(200, {
          'content-type': contentType,
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        })
        res.end(buffer)
        return
      }
      if (pathname === '/jphone/api/voice/asr' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await transcribeAsr({
          audioBase64: body.audioBase64,
          mimeType: body.mimeType || 'audio/wav',
          filename: body.filename || 'speech.wav',
          ...voiceConfig,
        })
        replyJson(200, { ok: true, ...result })
        return
      }
      if (pathname === '/jphone/api/voice/turn' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await runVoiceTurn({
          text: body.text,
          audioBase64: body.audioBase64,
          mimeType: body.mimeType || 'audio/wav',
          voiceId: body.voiceId || body.voice_id || 'stella',
          callId: body.callId || 'default',
          store,
          wsHub,
          workspaceMemory: orchestrator?.workspaceMemory || null,
          orchestrator,
          ...voiceConfig,
        })
        replyJson(200, result)
        return
      }
      if (pathname === '/jphone/api/voice/followups' && req.method === 'GET') {
        const callId = String(url.searchParams.get('callId') || 'default').trim() || 'default'
        const voiceId = String(url.searchParams.get('voiceId') || 'stella').trim() || 'stella'
        const result = await consumeVoiceTaskFollowups({
          callId,
          voiceId,
          store,
          wsHub,
          workspaceMemory: orchestrator?.workspaceMemory || null,
          ...voiceConfig,
        })
        replyJson(200, result)
        return
      }
      if (pathname === '/jphone/api/voice/hangup' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await endVoiceCall({
          callId: body.callId || 'default',
          workspaceMemory: orchestrator?.workspaceMemory || null,
          store,
        })
        replyJson(200, result)
        return
      }
      if (pathname === '/jphone/api/diary/generate' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const post = await generateDiaryPost({
          prompt: body.prompt || '',
          store,
          workspaceMemory: orchestrator?.workspaceMemory || null,
          ...voiceConfig,
        })
        replyJson(200, { ok: true, post })
        return
      }

            // P4: Dedicated Workspace Markdown Files (AGENTS.md, MEMORY.md, RECENT.md, INDEX.md, daily logs)
      if (pathname === '/jphone/api/workspace/files' && req.method === 'GET') {
        const wm = orchestrator?.workspaceMemory
        if (!wm) {
          replyJson(200, { ok: true, workspaceDir: store.data.workspaceDir, workspaceId: store.data.workspaceId || null, dailyFiles: [] })
          return
        }
        const snap = await wm.snapshot()
        replyJson(200, {
          ok: true,
          workspaceId: orchestrator?.jphoneWorkspaceId || store.data.workspaceId || null,
          mainSessionId: store.data.mainSessionId || null,
          mainSessionDate: store.data.mainSessionDate || null,
          ...snap,
        })
        return
      }
      if (pathname === '/jphone/api/workspace/agents' && req.method === 'PUT') {
        const body = await readJsonBody(req)
        const wm = orchestrator?.workspaceMemory
        if (!wm) {
          replyJson(400, { ok: false, error: 'workspace_memory_unavailable' })
          return
        }
        const agentsMd = await wm.writeAgentsMd(body.content ?? body.agentsMd ?? '')
        try { wsHub?.broadcast?.({ type: 'memory:updated' }) } catch {}
        replyJson(200, { ok: true, agentsMd })
        return
      }
      const dailyMatch = /^\/jphone\/api\/workspace\/daily\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)
      if (dailyMatch && req.method === 'GET') {
        const content = await orchestrator?.workspaceMemory?.readDailyLog(dailyMatch[1])
        if (content == null) {
          replyJson(404, { ok: false, error: 'daily_log_not_found' })
          return
        }
        replyJson(200, { ok: true, date: dailyMatch[1], content })
        return
      }

      // P5: 「小鲸专注」Audio Media Hosting (noise + Lo-Fi from local assets or Origo sibling repo)
      // Serve uploaded chat attachments from workspace/attachments/:date/:file
      const attMatch = /^\/jphone\/api\/attachments\/(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(pathname)
      if (attMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const dKey = attMatch[1]
        const fname = decodeURIComponent(attMatch[2])
        if (fname.includes('/') || fname.includes('\\') || fname.includes('..')) {
          replyJson(400, { ok: false, error: 'invalid_attachment' })
          return
        }
        const wsDir = orchestrator?.workspaceMemory?.workspaceDir
        if (wsDir) {
          const target = join(wsDir, 'attachments', dKey, fname)
          try {
            const buf = await readFile(target)
            res.writeHead(200, {
              'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
              'content-length': String(buf.length),
              'cache-control': 'public, max-age=86400',
              'access-control-allow-origin': '*',
            })
            res.end(req.method === 'HEAD' ? undefined : buf)
            return
          } catch {}
        }
        replyJson(404, { ok: false, error: 'attachment_not_found' })
        return
      }

      // Serve 小鲸同学 original VP9+Alpha LAV assets & touch.vtt
      const xjLavMatch = /^\/jphone\/media\/lav\/xiaojing\/(.+)$/.exec(pathname)
      if (xjLavMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const fname = decodeURIComponent(xjLavMatch[1])
        if (fname.includes('/') || fname.includes('\\') || fname.includes('..')) {
          replyJson(400, { ok: false, error: 'invalid_lav_name' })
          return
        }
        const lavCandidates = [
          join(PLUGIN_ASSETS_DIR, 'lav', 'xiaojing', fname),
          characterAssetsDir ? resolve(characterAssetsDir, '..', 'lav', 'xiaojing', fname) : null,
        ].filter(Boolean)
        for (const target of lavCandidates) {
          try {
            const buf = await readFile(target)
            const mime = MIME[extname(target).toLowerCase()] || 'application/octet-stream'
            sendMediaBuffer(req, res, buf, mime, 'no-cache, must-revalidate')
            return
          } catch {}
        }
        replyJson(404, { ok: false, error: 'xiaojing_lav_not_found' })
        return
      }

      const focusMediaMatch = /^\/jphone\/media\/focus\/(noise|noise-bg|music|bg|covers)\/(.+)$/.exec(pathname)
      if (focusMediaMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const kind = focusMediaMatch[1]
        const rawRel = decodeURIComponent(focusMediaMatch[2])
        if (rawRel.includes('\\') || rawRel.includes('..') || rawRel.startsWith('/')) {
          replyJson(400, { ok: false, error: 'invalid_media_name' })
          return
        }
        const candidateFiles = []
        if (kind === 'music' && rawRel.includes('/')) {
          const parts = rawRel.split('/')
          if (parts.length !== 2) {
            replyJson(400, { ok: false, error: 'invalid_media_name' })
            return
          }
          const dlTarget = resolveDownloadedAlbumTrackPath(store.dir, parts[0], parts[1])
          if (!dlTarget) {
            replyJson(400, { ok: false, error: 'invalid_media_name' })
            return
          }
          candidateFiles.push(dlTarget)
        } else {
          if (rawRel.includes('/')) {
            replyJson(400, { ok: false, error: 'invalid_media_name' })
            return
          }
          const candidateDirs = [
            join(PLUGIN_ASSETS_DIR, 'focus', kind),
            characterAssetsDir ? resolve(characterAssetsDir, '..', 'focus', kind) : null,
            process.env.JPHONE_FOCUS_MEDIA_DIR ? join(process.env.JPHONE_FOCUS_MEDIA_DIR, kind) : null,
          ]
          for (const dir of candidateDirs) {
            if (dir) candidateFiles.push(join(dir, rawRel))
          }
        }
        for (const target of candidateFiles) {
          try {
            const buf = await readFile(target)
            res.writeHead(200, {
              'content-type': MIME[extname(target).toLowerCase()] || 'audio/mpeg',
              'content-length': String(buf.length),
              'accept-ranges': 'bytes',
              'cache-control': 'public, max-age=86400',
              'access-control-allow-origin': '*',
            })
            res.end(req.method === 'HEAD' ? undefined : buf)
            return
          } catch {}
        }
        replyJson(404, { ok: false, error: 'focus_audio_not_found' })
        return
      }

      // P6: Transparent Interactive Video (Native VP9+Alpha) Standalone POC
      if ((pathname === '/jphone/poc/lav' || pathname === '/jphone/poc/lav/') && req.method === 'GET') {
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache',
          'access-control-allow-origin': '*',
        })
        res.end(LAV_POC_HTML)
        return
      }
      const lavAssetMatch = /^\/jphone\/poc\/lav\/assets\/(.+)$/.exec(pathname)
      if (lavAssetMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        const fname = decodeURIComponent(lavAssetMatch[1])
        if (fname.includes('/') || fname.includes('\\') || fname.includes('..')) {
          replyJson(400, { ok: false, error: 'invalid_lav_asset' })
          return
        }
        const lavDir = process.env.JPHONE_LAV_POC_DIR || join(PLUGIN_ASSETS_DIR, 'lav', 'xiaojing')
        try {
          const target = join(lavDir, fname)
          const buf = await readFile(target)
          res.writeHead(200, {
            'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
            'content-length': String(buf.length),
            'accept-ranges': 'bytes',
            'cache-control': 'public, max-age=3600',
            'access-control-allow-origin': '*',
          })
          res.end(req.method === 'HEAD' ? undefined : buf)
          return
        } catch {
          replyJson(404, { ok: false, error: 'lav_asset_not_found' })
          return
        }
      }

      // Memories CRUD
      if (pathname === '/jphone/api/memories' && req.method === 'GET') {
        replyJson(200, { ok: true, memories: store.listMemories() })
        return
      }
      if (pathname === '/jphone/api/memories' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const memory = await store.addMemory(body.text)
        try { await orchestrator?.workspaceMemory?.syncLongTermMemories(store.listMemories()) } catch {}
        try { wsHub?.broadcast?.({ type: 'memory:updated', memory }) } catch {}
        replyJson(200, { ok: true, memory, memories: store.listMemories() })
        return
      }
      const memMatch = /^\/jphone\/api\/memories\/([^/]+)$/.exec(pathname)
      if (memMatch) {
        const memId = decodeURIComponent(memMatch[1])
        if (req.method === 'PUT') {
          const body = await readJsonBody(req)
          const memory = await store.updateMemory(memId, body.text)
          if (!memory) { replyJson(404, { ok: false, error: 'memory_not_found' }); return }
          try { await orchestrator?.workspaceMemory?.syncLongTermMemories(store.listMemories()) } catch {}
          try { wsHub?.broadcast?.({ type: 'memory:updated', memory }) } catch {}
          replyJson(200, { ok: true, memory, memories: store.listMemories() })
          return
        }
        if (req.method === 'DELETE') {
          await store.deleteMemory(memId)
          try { await orchestrator?.workspaceMemory?.syncLongTermMemories(store.listMemories()) } catch {}
          try { wsHub?.broadcast?.({ type: 'memory:updated', deletedId: memId }) } catch {}
          replyJson(200, { ok: true, memories: store.listMemories() })
          return
        }
      }

      // Uninstall Mini-App
      const delAppMatch = /^\/jphone\/api\/miniapps\/([^/]+)$/.exec(pathname)
      if (delAppMatch && req.method === 'DELETE') {
        const appId = decodeURIComponent(delAppMatch[1])
        const removed = await store.removeMiniApp(appId)
        try { wsHub?.broadcast?.({ type: 'miniapp:installed', removedId: appId }) } catch {}
        replyJson(200, { ok: true, removed, miniApps: store.listMiniApps() })
        return
      }

      // Database (KV) Inspector & Clear
      if (pathname === '/jphone/api/kv' && req.method === 'GET') {
        replyJson(200, { ok: true, namespaces: store.listAllKvNamespaces() })
        return
      }
      const kvAdminMatch = /^\/jphone\/api\/kv\/([^/]+)(?:\/([^/]+))?$/.exec(pathname)
      if (kvAdminMatch && req.method === 'DELETE') {
        const appId = decodeURIComponent(kvAdminMatch[1])
        const key = kvAdminMatch[2] ? decodeURIComponent(kvAdminMatch[2]) : null
        if (key) {
          await store.deleteMiniAppKv(appId, key)
        } else {
          await store.clearMiniAppKv(appId)
        }
        try { wsHub?.broadcast?.({ type: 'kv:updated', appId }) } catch {}
        replyJson(200, { ok: true, namespaces: store.listAllKvNamespaces() })
        return
      }

      // M4: Decentralized Git-Based Workshop (GitHub primary + Gitee mirror + cache + direct Git URL)
      if (pathname === '/jphone/api/workshop' && req.method === 'GET') {
        const forceRefresh = url.searchParams.get('refresh') === '1'
        const localItems = store.listWorkshopItems()
        const installedAppIds = new Set(store.listMiniApps().map((a) => a.id))
        let installedSkillNames = new Set()
        try {
          const sks = await orchestrator?.listSkills?.()
          if (Array.isArray(sks)) installedSkillNames = new Set(sks.map((s) => s.name))
        } catch {}

        const remote = await fetchWorkshopIndex({
          cacheDir: workshopOptions.cacheDir || store.dir,
          forceRefresh,
          ...workshopOptions,
        })
        const mergedMap = new Map()
        for (const it of remote.items) {
          mergedMap.set(it.id, {
            ...it,
            installed: installedAppIds.has(it.id) || installedSkillNames.has(it.id),
          })
        }
        for (const loc of localItems) {
          if (!mergedMap.has(loc.id)) {
            mergedMap.set(loc.id, loc)
          }
        }
        replyJson(200, {
          ok: true,
          source: remote.source,
          indexRepo: remote.indexRepo,
          mirrorRepo: remote.mirrorRepo,
          updatedAt: remote.updatedAt,
          items: Array.from(mergedMap.values()),
        })
        return
      }
      if (pathname === '/jphone/api/workshop/inspect-git' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await inspectGitPackage(body.repoUrl || body.url || '', workshopOptions)
        replyJson(result.ok ? 200 : 400, result)
        return
      }
      if (pathname === '/jphone/api/workshop/install-git' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const result = await installGitPackage(body.repoUrl || body.url || '', {
          store,
          skillsDir: orchestrator?.skillsDir || '',
          ...workshopOptions,
        })
        if (result.ok) {
          try { wsHub?.broadcast?.({ type: 'miniapp:installed', workshopId: result.manifest?.id }) } catch {}
        }
        replyJson(result.ok ? 200 : 400, {
          ...result,
          miniApps: store.listMiniApps(),
        })
        return
      }
      if (pathname === '/jphone/api/workshop/install' && req.method === 'POST') {
        const body = await readJsonBody(req)
        let repoTarget = body.repoUrl || body.repo || ''
        if (!repoTarget && body.id) {
          const localHit = store.listWorkshopItems().find((it) => it.id === body.id)
          if (!localHit) {
            try {
              const remote = await fetchWorkshopIndex({
                cacheDir: workshopOptions.cacheDir || store.dir,
                ...workshopOptions,
              })
              const rHit = remote.items.find((it) => it.id === body.id)
              if (rHit && rHit.repo) repoTarget = rHit.repo
            } catch {}
          }
        }
        if (repoTarget) {
          const gitRes = await installGitPackage(repoTarget, {
            store,
            skillsDir: orchestrator?.skillsDir || '',
            ...workshopOptions,
          })
          if (gitRes.ok) {
            try { wsHub?.broadcast?.({ type: 'miniapp:installed', workshopId: gitRes.manifest?.id || body.id }) } catch {}
          }
          replyJson(gitRes.ok ? 200 : 400, {
            ...gitRes,
            items: store.listWorkshopItems(),
            miniApps: store.listMiniApps(),
          })
          return
        }
        const result = await store.installWorkshopItem(body.id)
        if (!result) { replyJson(404, { ok: false, error: 'workshop_item_not_found' }); return }
        try { wsHub?.broadcast?.({ type: 'miniapp:installed', workshopId: body.id }) } catch {}
        replyJson(200, { ok: true, ...result, items: store.listWorkshopItems(), miniApps: store.listMiniApps() })
        return
      }
      if (pathname === '/jphone/api/workshop/publish' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const item = await store.publishWorkshopItem(body)
        try { wsHub?.broadcast?.({ type: 'workshop:updated', item }) } catch {}
        replyJson(200, { ok: true, item, items: store.listWorkshopItems() })
        return
      }

      // DSH Native Plugin Console Info & Backup Export
      if (pathname === '/jphone/api/console/info' && req.method === 'GET') {
        const skills = await orchestrator.listSkills()
        replyJson(200, {
          ok: true,
          workspaceDir: store.data.workspaceDir,
          bridgePort,
          pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
          tunnel: tunnelManager ? tunnelManager.getStatus() : { available: false, status: 'idle', publicUrl: '', error: '' },
          apiKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
          voiceEndpoints: {
            tts: '/jphone/api/voice/tts',
            asr: '/jphone/api/voice/asr',
          },
          stats: {
            miniApps: store.listMiniApps().length,
            skills: skills.length,
            memories: store.listMemories().length,
            kvNamespaces: store.listAllKvNamespaces().length,
            wallpapers: store.listWallpapers().length,
            tasks: orchestrator.listTasks().length,
          },
        })
        return
      }
      if (pathname === '/jphone/api/console/export' && req.method === 'GET') {
        replyJson(200, { ok: true, backup: store.exportBackup() })
        return
      }
      if (pathname === '/jphone/api/console/pairing-qr.svg' && req.method === 'GET') {
        const tunnelStatus = tunnelManager ? tunnelManager.getStatus() : null
        const p = store.getPairingInfo(bridgePort, { tunnelStatus })
        const mode = String(url.searchParams.get('mode') || '').trim().toLowerCase()
        let pairUrl = ''
        if (mode === 'lan') {
          pairUrl = p.lanPairUrl || ''
        } else if (mode === 'public') {
          pairUrl = p.publicPairUrl || ''
        } else {
          pairUrl = p.pairUrl || ''
        }
        if (!pairUrl) {
          replyJson(404, { ok: false, error: 'pairing_qr_disabled', qrAvailable: p.qrAvailable, qrMode: p.qrMode })
          return
        }
        const svg = renderQrSvg(pairUrl, { margin: 2, dark: '#0F172A', light: '#FFFFFF' })
        res.writeHead(200, {
          ...cors,
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(svg)
        return
      }
      if (pathname === '/jphone/api/bridge/lan' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : !store.isLanBridgeEnabled()
        await store.setLanBridgeEnabled(nextEnabled)
        if (typeof rebindBridge === 'function') {
          try {
            await rebindBridge(nextEnabled)
          } catch (err) {
            replyJson(500, {
              ok: false,
              error: err?.message || 'bridge_rebind_failed',
              lanBridgeEnabled: store.isLanBridgeEnabled(),
              pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
            })
            return
          }
        }
        try { wsHub?.broadcast?.({ type: 'bridge:updated', lanBridgeEnabled: nextEnabled }) } catch {}
        replyJson(200, {
          ok: true,
          lanBridgeEnabled: nextEnabled,
          pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
        })
        return
      }

      if (pathname === '/jphone/api/tunnel/status' && req.method === 'GET') {
        replyJson(200, {
          ok: true,
          tunnel: tunnelManager ? tunnelManager.getStatus() : { available: false, status: 'idle', publicUrl: '', error: '' },
          pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
        })
        return
      }
      if (pathname === '/jphone/api/tunnel/start' && req.method === 'POST') {
        if (!tunnelManager) {
          replyJson(501, { ok: false, error: 'tunnel_unavailable' })
          return
        }
        const result = await tunnelManager.start()
        try { wsHub?.broadcast?.({ type: 'tunnel:updated', tunnel: result }) } catch {}
        replyJson(result.ok ? 200 : 500, {
          ok: result.ok,
          tunnel: result,
          pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
        })
        return
      }
      if (pathname === '/jphone/api/tunnel/stop' && req.method === 'POST') {
        if (!tunnelManager) {
          replyJson(200, { ok: true, tunnel: { available: false, status: 'idle', publicUrl: '' }, pairing: store.getPairingInfo(bridgePort) })
          return
        }
        const result = await tunnelManager.stop()
        try { wsHub?.broadcast?.({ type: 'tunnel:updated', tunnel: result }) } catch {}
        replyJson(200, {
          ok: true,
          tunnel: result,
          pairing: store.getPairingInfo(bridgePort, { tunnelStatus: tunnelManager ? tunnelManager.getStatus() : null }),
        })
        return
      }
      if (pathname === '/jphone/api/character' && req.method === 'GET') {
        const charFile = characterAssetsDir ? join(characterAssetsDir, 'xiaojing', 'character.json') : ''
        try {
          if (charFile) {
            const raw = await readFile(charFile, 'utf8')
            replyJson(200, { ok: true, activeId: 'xiaojing', character: JSON.parse(raw) })
            return
          }
        } catch {}
        replyJson(200, {
          ok: true,
          activeId: 'xiaojing',
          character: { id: 'xiaojing', name: '小鲸同学', proportions: '2-head-chibi' },
        })
        return
      }

      if (pathname === '/jphone/api/skills' && req.method === 'GET') {
        const skills = await orchestrator.listSkills()
        replyJson(200, { ok: true, skills })
        return
      }
      if (pathname === '/jphone/api/miniapps' && req.method === 'GET') {
        replyJson(200, { ok: true, miniApps: store.listMiniApps() })
        return
      }
      if (pathname === '/jphone/api/miniapps' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const installed = await store.installMiniApp(body)
        replyJson(200, { ok: true, miniApp: installed })
        return
      }
      if (pathname === '/jphone/api/endpoint' && req.method === 'POST') {
        const body = await readJsonBody(req)
        await store.bindRemoteEndpoint(body.publicUrl, body.provider || 'custom')
        replyJson(200, { ok: true, pairing: store.getPairingInfo(bridgePort) })
        return
      }

      // Mini-App HTML content & window.jing KV endpoints
      const kvMatch = /^\/jphone\/api\/miniapps\/([^/]+)\/kv(?:\/([^/]+))?$/.exec(pathname)
      if (kvMatch) {
        const appId = decodeURIComponent(kvMatch[1])
        const key = kvMatch[2] ? decodeURIComponent(kvMatch[2]) : null
        if (!key && req.method === 'GET') {
          replyJson(200, { ok: true, keys: store.listMiniAppKvKeys(appId) })
          return
        }
        if (key && req.method === 'GET') {
          replyJson(200, { ok: true, value: store.getMiniAppKv(appId, key) })
          return
        }
        if (key && req.method === 'PUT') {
          const body = await readJsonBody(req)
          await store.setMiniAppKv(appId, key, body.value)
          replyJson(200, { ok: true })
          return
        }
        if (key && req.method === 'DELETE') {
          await store.deleteMiniAppKv(appId, key)
          replyJson(200, { ok: true })
          return
        }
      }

      const appHtmlMatch = /^\/jphone\/miniapp\/([^/]+)$/.exec(pathname)
      if (appHtmlMatch && req.method === 'GET') {
        const app = store.getMiniApp(decodeURIComponent(appHtmlMatch[1]))
        if (!app) {
          res.writeHead(404)
          res.end('Mini-App not found')
          return
        }
        const appCapabilityToken = mintAppCapabilityToken(store, app)
        const bridgeScript = `<script>
(function(){
  if (window.jing) return;
  const APP_ID = ${JSON.stringify(app.id)};
  const APP_TOKEN = ${JSON.stringify(appCapabilityToken)};
  const api = async (path, opts) => {
    const o = opts ? { ...opts } : {};
    o.headers = { ...(o.headers || {}), "x-jphone-app-token": APP_TOKEN };
    const r = await fetch(path, o);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  };
  // Native mobile WebView host bridge (Android/iOS Flutter JPhoneBridge)
  const hasParentMedia = (() => {
    try { return !!(window.parent && window.parent !== window && window.parent.__jphoneMedia); } catch { return false; }
  })();
  if (typeof window.JPhoneBridge !== "undefined" && window.JPhoneBridge && !hasParentMedia) {
    const postNative = (payload) => {
      try { window.JPhoneBridge.postMessage(JSON.stringify(payload)); } catch {}
    };
    const mediaListeners = new Set();
    let mediaState = {
      playing: false,
      hasActiveAudio: false,
      title: "",
      subtitle: "",
      sceneName: "",
      playMode: "order",
      queueLength: 0,
      track: null,
      noises: {},
      noiseCount: 0,
    };
    const recomputeMediaDerived = () => {
      const noises = mediaState.noises || {};
      const activeList = Object.values(noises).filter((n) => n && n.active);
      const activeNames = activeList.map((n) => n.name || n.id || "");
      mediaState.noiseCount = activeList.length;
      mediaState.hasActiveAudio = !!mediaState.track || mediaState.noiseCount > 0;
      mediaState.playing = !!mediaState.playing && mediaState.hasActiveAudio;
      mediaState.title = mediaState.track
        ? (mediaState.track.title || "Lo-Fi")
        : (activeNames.length > 0 ? ("白噪音 · " + activeNames.slice(0, 2).join("+")) : "");
      mediaState.subtitle = mediaState.track && activeNames.length > 0
        ? ("混音: " + activeNames.slice(0, 3).join(" + "))
        : (mediaState.track ? (mediaState.track.subtitle || "小鲸专注") : (mediaState.sceneName || "小鲸专注"));
    };
    const emitMedia = () => {
      const snap = { ...mediaState, noises: { ...(mediaState.noises || {}) } };
      mediaListeners.forEach((fn) => { try { fn(snap); } catch {} });
    };
    window.__jphoneNativeMediaPush = (snap) => {
      if (!snap || typeof snap !== "object") return;
      mediaState = {
        playing: !!snap.playing,
        hasActiveAudio: !!snap.hasActiveAudio,
        title: typeof snap.title === "string" ? snap.title : "",
        subtitle: typeof snap.subtitle === "string" ? snap.subtitle : "",
        sceneName: typeof snap.sceneName === "string" ? snap.sceneName : "",
        playMode: (snap.playMode === "shuffle" || snap.playMode === "single" || snap.playMode === "order") ? snap.playMode : (mediaState.playMode || "order"),
        queueLength: typeof snap.queueLength === "number" ? snap.queueLength : (mediaState.queueLength || 0),
        track: snap.track && typeof snap.track === "object" ? { ...snap.track } : null,
        noises: snap.noises && typeof snap.noises === "object" ? { ...snap.noises } : {},
        noiseCount: typeof snap.noiseCount === "number" ? snap.noiseCount : 0,
      };
      emitMedia();
    };
    window.__jphoneMedia = {
      getStateObj: () => ({ ...mediaState, noises: { ...(mediaState.noises || {}) } }),
      getStateJson: () => JSON.stringify(mediaState),
      playTrack(track) {
        if (!track || !track.url) return;
        mediaState.track = {
          id: track.id || "",
          title: track.title || "Lo-Fi",
          subtitle: track.subtitle || "",
          url: track.url,
          coverUrl: track.coverUrl || "",
          albumId: track.albumId || "",
          albumName: track.albumName || "",
        };
        mediaState.playing = true;
        recomputeMediaDerived();
        emitMedia();
        postNative({ type: "jphone:media:playTrack", track: mediaState.track });
      },
      pauseTrack() {
        mediaState.playing = false;
        recomputeMediaDerived();
        emitMedia();
        postNative({ type: "jphone:media:pauseTrack" });
      },
      togglePlay() {
        if (mediaState.hasActiveAudio) {
          mediaState.playing = !mediaState.playing;
          recomputeMediaDerived();
          emitMedia();
        }
        postNative({ type: "jphone:media:togglePlay" });
      },
      nextTrack() {
        postNative({ type: "jphone:media:nextTrack" });
      },
      prevTrack() {
        postNative({ type: "jphone:media:prevTrack" });
      },
      setQueue(tracks, opts) {
        const list = Array.isArray(tracks) ? tracks.filter((t) => t && t.url).map((t) => ({
          id: t.id || "",
          title: t.title || "Lo-Fi",
          subtitle: t.subtitle || "",
          url: t.url,
          coverUrl: t.coverUrl || "",
          albumId: t.albumId || "",
          albumName: t.albumName || "",
        })) : [];
        mediaState.queueLength = list.length;
        const o = opts && typeof opts === "object" ? opts : {};
        if (o.playMode === "order" || o.playMode === "shuffle" || o.playMode === "single") {
          mediaState.playMode = o.playMode;
        }
        emitMedia();
        postNative({ type: "jphone:media:setQueue", tracks: list, opts: o });
      },
      setPlayMode(mode) {
        const m = (mode === "shuffle" || mode === "single" || mode === "order") ? mode : "order";
        mediaState.playMode = m;
        emitMedia();
        postNative({ type: "jphone:media:setPlayMode", mode: m });
      },
      cyclePlayMode() {
        const order = ["order", "shuffle", "single"];
        const next = order[(order.indexOf(mediaState.playMode || "order") + 1) % order.length];
        mediaState.playMode = next;
        emitMedia();
        postNative({ type: "jphone:media:setPlayMode", mode: next });
        return next;
      },
      setNoise(id, opts) {
        if (!id) return;
        const o = opts && typeof opts === "object" ? opts : {};
        const active = !!o.active;
        const vol = Math.max(0, Math.min(1, Number(o.volume ?? 0.5)));
        const nextNoises = { ...(mediaState.noises || {}) };
        if (active) {
          nextNoises[id] = { id, name: o.name || id, volume: vol, active: true };
          mediaState.playing = true;
        } else {
          delete nextNoises[id];
        }
        mediaState.noises = nextNoises;
        recomputeMediaDerived();
        emitMedia();
        postNative({ type: "jphone:media:setNoise", id, opts: { id, name: o.name || id, url: o.url || "", active, volume: vol } });
      },
      applyScene(scene) {
        if (!scene || typeof scene !== "object") return;
        mediaState.sceneName = scene.sceneName || "";
        const nextNoises = {};
        if (Array.isArray(scene.noises)) {
          for (const item of scene.noises) {
            if (item && item.id) {
              nextNoises[item.id] = { id: item.id, name: item.name || item.id, volume: Number(item.volume ?? 0.5), active: true };
            }
          }
        }
        mediaState.noises = nextNoises;
        if (scene.track && scene.track.url) {
          mediaState.track = {
            id: scene.track.id || "",
            title: scene.track.title || "Lo-Fi",
            subtitle: scene.track.subtitle || "",
            url: scene.track.url,
            coverUrl: scene.track.coverUrl || "",
            albumId: scene.track.albumId || "",
            albumName: scene.track.albumName || "",
          };
        }
        mediaState.playing = true;
        recomputeMediaDerived();
        emitMedia();
        postNative({ type: "jphone:media:applyScene", scene });
      },
      stopAll() {
        mediaState = { playing: false, hasActiveAudio: false, title: "", subtitle: "", sceneName: "", playMode: mediaState.playMode || "order", queueLength: mediaState.queueLength || 0, track: null, noises: {}, noiseCount: 0 };
        emitMedia();
        postNative({ type: "jphone:media:stopAll" });
      },
      subscribe(fn) {
        mediaListeners.add(fn);
        return () => mediaListeners.delete(fn);
      },
    };

    const focusListeners = new Set();
    let focusState = {
      running: false,
      active: false,
      phase: "focus",
      cycle: 1,
      focusMin: 25,
      breakMin: 5,
      pauseOnBreak: true,
      totalSec: 1500,
      remainSec: 1500,
      completedCount: 0,
      todayMinutes: 0,
    };
    const emitFocus = () => {
      const snap = { ...focusState };
      focusListeners.forEach((fn) => { try { fn(snap); } catch {} });
    };
    window.__jphoneNativeFocusPush = (snap) => {
      if (!snap || typeof snap !== "object") return;
      focusState = { ...focusState, ...snap };
      emitFocus();
    };
    window.__jphoneFocus = {
      getStateObj: () => ({ ...focusState }),
      getStateJson: () => JSON.stringify(focusState),
      seed(cfg) {
        if (cfg && typeof cfg === "object" && !focusState.active && !focusState.running) {
          if (typeof cfg.focusMin === "number") focusState.focusMin = cfg.focusMin;
          if (typeof cfg.breakMin === "number") focusState.breakMin = cfg.breakMin;
          if (typeof cfg.pauseOnBreak === "boolean") focusState.pauseOnBreak = cfg.pauseOnBreak;
          if (typeof cfg.completedCount === "number") focusState.completedCount = cfg.completedCount;
          if (typeof cfg.todayMinutes === "number") focusState.todayMinutes = cfg.todayMinutes;
          focusState.totalSec = focusState.focusMin * 60;
          focusState.remainSec = focusState.totalSec;
        }
        postNative({ type: "jphone:focus:seed", cfg: cfg || {} });
        return { ...focusState };
      },
      start() {
        focusState.running = true;
        focusState.active = true;
        emitFocus();
        postNative({ type: "jphone:focus:start" });
        return { ...focusState };
      },
      pause() {
        focusState.running = false;
        emitFocus();
        postNative({ type: "jphone:focus:pause" });
        return { ...focusState };
      },
      toggle() {
        focusState.running = !focusState.running;
        if (focusState.running) focusState.active = true;
        emitFocus();
        postNative({ type: "jphone:focus:toggle" });
        return { ...focusState };
      },
      reset() {
        focusState.running = false;
        focusState.active = false;
        focusState.phase = "focus";
        focusState.totalSec = focusState.focusMin * 60;
        focusState.remainSec = focusState.totalSec;
        emitFocus();
        postNative({ type: "jphone:focus:reset" });
        return { ...focusState };
      },
      setDurations(opts) {
        if (opts && typeof opts === "object") {
          if (typeof opts.focusMin === "number") {
            focusState.focusMin = Math.max(5, Math.min(90, opts.focusMin));
            if (!focusState.running && focusState.phase === "focus") {
              focusState.totalSec = focusState.focusMin * 60;
              focusState.remainSec = focusState.totalSec;
            }
          }
          if (typeof opts.breakMin === "number") {
            focusState.breakMin = Math.max(1, Math.min(30, opts.breakMin));
            if (!focusState.running && focusState.phase === "break") {
              focusState.totalSec = focusState.breakMin * 60;
              focusState.remainSec = focusState.totalSec;
            }
          }
          if (typeof opts.pauseOnBreak === "boolean") focusState.pauseOnBreak = opts.pauseOnBreak;
        }
        emitFocus();
        postNative({ type: "jphone:focus:setDurations", opts: opts || {} });
        return { ...focusState };
      },
      subscribe(fn) {
        focusListeners.add(fn);
        return () => focusListeners.delete(fn);
      },
    };
    postNative({ type: "jphone:media:sync" });
    postNative({ type: "jphone:focus:sync" });
  }
  window.jing = {
    version: "1.0.0",
    appId: APP_ID,
    character: { name: "小鲸同学", groupName: "鲸娘" },
    storage: {
      async get(key) {
        const d = await api("/jphone/api/miniapps/" + encodeURIComponent(APP_ID) + "/kv/" + encodeURIComponent(key));
        return d.value;
      },
      async set(key, value) {
        await api("/jphone/api/miniapps/" + encodeURIComponent(APP_ID) + "/kv/" + encodeURIComponent(key), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value }),
        });
      },
      async remove(key) {
        await api("/jphone/api/miniapps/" + encodeURIComponent(APP_ID) + "/kv/" + encodeURIComponent(key), { method: "DELETE" });
      },
      async keys() {
        const d = await api("/jphone/api/miniapps/" + encodeURIComponent(APP_ID) + "/kv");
        return d.keys || [];
      },
    },
    chat: {
      async ask(text, opts) {
        const o = opts && typeof opts === "object" ? opts : {};
        return api("/jphone/api/chat/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: String(text || ""), background: o.background === true }),
        });
      },
    },
    tasks: {
      async dispatch(title, prompt, preset) {
        return api("/jphone/api/tasks/dispatch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, prompt, preset }),
        });
      },
    },
    events: (() => {
      const bus = new Map();
      return {
        on(name, fn) {
          if (!bus.has(name)) bus.set(name, new Set());
          bus.get(name).add(fn);
          return () => bus.get(name)?.delete(fn);
        },
        off(name, fn) { bus.get(name)?.delete(fn); },
        emit(name, payload) {
          (bus.get(name) || []).forEach((fn) => { try { fn(payload); } catch {} });
        },
      };
    })(),
    notify: {
      async push(eventType, title, desp) {
        return api("/jphone/api/notify/event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventType, title, desp }),
        });
      },
    },
    focus: {
      async listPacks() {
        return await api("/jphone/api/focus/packs");
      },
      async selectPack(id) {
        return await api("/jphone/api/focus/packs/select", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
      },
      async uploadMedia(payload) {
        return await api("/jphone/api/focus/packs/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload || {}),
        });
      },
      async deletePack(id) {
        return await api("/jphone/api/focus/packs/" + encodeURIComponent(id), {
          method: "DELETE",
        });
      },
      async listAlbums() {
        return await api("/jphone/api/focus/albums");
      },
      async downloadAlbum(albumId) {
        return await api("/jphone/api/focus/albums/" + encodeURIComponent(albumId) + "/download", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
      },
      async deleteAlbum(albumId) {
        return await api("/jphone/api/focus/albums/" + encodeURIComponent(albumId), {
          method: "DELETE",
        });
      },
    },
    audio: {
      _host() {
        try {
          if (window.parent && window.parent !== window && window.parent.__jphoneMedia) return window.parent.__jphoneMedia;
          if (window.__jphoneMedia) return window.__jphoneMedia;
          return null;
        } catch {
          return window.__jphoneMedia || null;
        }
      },
      isHostSupported() { return !!this._host(); },
      getState() {
        const h = this._host();
        if (h && typeof h.getStateObj === "function") return h.getStateObj();
        return { playing: false, hasActiveAudio: false, track: null, noises: {}, sceneName: "" };
      },
      playTrack(track) {
        const h = this._host();
        if (h) return h.playTrack(track);
      },
      pauseTrack() {
        const h = this._host();
        if (h) return h.pauseTrack();
      },
      togglePlay() {
        const h = this._host();
        if (h) return h.togglePlay();
      },
      nextTrack() {
        const h = this._host();
        if (h && typeof h.nextTrack === "function") return h.nextTrack();
      },
      prevTrack() {
        const h = this._host();
        if (h && typeof h.prevTrack === "function") return h.prevTrack();
      },
      setQueue(tracks, opts) {
        const h = this._host();
        if (h && typeof h.setQueue === "function") return h.setQueue(tracks, opts);
      },
      setPlayMode(mode) {
        const h = this._host();
        if (h && typeof h.setPlayMode === "function") return h.setPlayMode(mode);
      },
      cyclePlayMode() {
        const h = this._host();
        if (h && typeof h.cyclePlayMode === "function") return h.cyclePlayMode();
      },
      setNoise(id, opts) {
        const h = this._host();
        if (h) return h.setNoise(id, opts);
      },
      applyScene(scene) {
        const h = this._host();
        if (h) return h.applyScene(scene);
      },
      stopAll() {
        const h = this._host();
        if (h) return h.stopAll();
      },
      subscribe(fn) {
        const h = this._host();
        if (h && typeof h.subscribe === "function") return h.subscribe(fn);
        return () => {};
      },
    },
    ui: {
      notify(messageOrOpts) {
        let msg = "";
        if (messageOrOpts && typeof messageOrOpts === "object") {
          msg = [messageOrOpts.title, messageOrOpts.body || messageOrOpts.message].filter(Boolean).join(" · ");
        } else {
          msg = String(messageOrOpts || "");
        }
        const payload = { type: "jphone:notify", appId: APP_ID, message: msg };
        try { window.parent && window.parent.postMessage(payload, "*"); } catch {}
        try { window.JPhoneBridge && window.JPhoneBridge.postMessage(JSON.stringify(payload)); } catch {}
      },
      setHeaderStyle(opts) {
        const o = opts && typeof opts === "object" ? opts : {};
        const payload = {
          type: "jphone:headerStyle",
          appId: APP_ID,
          backgroundColor: typeof o.backgroundColor === "string" ? o.backgroundColor : "",
          foregroundColor: typeof o.foregroundColor === "string" ? o.foregroundColor : "",
          borderColor: typeof o.borderColor === "string" ? o.borderColor : "",
          title: typeof o.title === "string" ? o.title : "",
        };
        if (typeof o.hidden === "boolean") {
          payload.hidden = o.hidden;
        }
        try { window.parent && window.parent.postMessage(payload, "*"); } catch {}
        try { window.JPhoneBridge && window.JPhoneBridge.postMessage(JSON.stringify(payload)); } catch {}
      },
    },
  };
  window.jing.db = window.jing.storage;
  // Auto-apply declarative header theme meta tags if provided
  const syncHeaderMeta = () => {
    try {
      const bg = document.querySelector('meta[name="jphone-header-bg"]')?.getAttribute('content') || '';
      const fg = document.querySelector('meta[name="jphone-header-style"]')?.getAttribute('content') || '';
      const border = document.querySelector('meta[name="jphone-header-border"]')?.getAttribute('content') || '';
      if (bg || fg || border) {
        window.jing.ui.setHeaderStyle({ backgroundColor: bg, foregroundColor: fg, borderColor: border });
      }
    } catch {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHeaderMeta, { once: true });
  } else {
    syncHeaderMeta();
  }
})();
</script><style id="jphone-scrollbar-polish">
  html, body, * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
    background: transparent !important;
  }
</style>`;
        const htmlWithBridge = app.html.includes("</head>")
          ? app.html.replace("</head>", bridgeScript + "</head>")
          : bridgeScript + app.html;
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        res.end(htmlWithBridge)
        return
      }

      // Uploaded wallpapers & .panime.png files (served untouched)
      if (pathname.startsWith('/jphone/focus-packs/')) {
        const rel = pathname.slice('/jphone/focus-packs/'.length)
        if (await serveFileFromDir(res, store.getFocusPacksDir(), rel, req)) return
        res.writeHead(404)
        res.end('Focus pack media not found')
        return
      }

      if (pathname.startsWith('/jphone/wallpapers/')) {
        const rel = pathname.slice('/jphone/wallpapers/'.length)
        if (await serveFileFromDir(res, store.getWallpapersDir(), rel)) return
        res.writeHead(404)
        res.end('Wallpaper not found')
        return
      }

      // Character assets
      if (pathname.startsWith('/jphone/assets/character/')) {
        const rel = pathname.slice('/jphone/assets/character/'.length)
        if (await serveFileFromDir(res, characterAssetsDir, rel)) return
        res.writeHead(404)
        res.end('Asset not found')
        return
      }

      // Redirect /jphone -> /jphone/ so Flutter Web relative assets resolve cleanly
      if (pathname === '/jphone') {
        res.writeHead(302, { location: '/jphone/' })
        res.end()
        return
      }

      // Flutter Web static dist
      if (pathname.startsWith('/jphone/')) {
        const rel = pathname.slice('/jphone/'.length) || 'index.html'
        if (await serveFileFromDir(res, webDistDir, rel)) return
        if (await serveFileFromDir(res, webDistDir, 'index.html')) return
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end('<!doctype html><html><body style="background:#0b132b;color:#fff;font-family:sans-serif;padding:24px;"><h2>小鲸同学 · JingChan (JPhone) Web 容器尚未构建</h2><p>请运行 Flutter Web 构建以输出 web-dist。</p></body></html>')
        return
      }

      res.writeHead(404)
      res.end('Not found')
    } catch (err) {
      replyJson(500, { ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
}
