import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const TRYCF_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

export function findCloudflaredBinary(customPath) {
  const candidates = [
    customPath,
    process.env.CLOUDFLARED_BIN,
    '/opt/homebrew/bin/cloudflared',
    '/usr/local/bin/cloudflared',
    '/usr/bin/cloudflared',
  ].filter(Boolean)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  try {
    const res = spawnSync('which', ['cloudflared'], { encoding: 'utf8', timeout: 1500 })
    if (res.status === 0) {
      const found = String(res.stdout || '').trim().split('\n')[0]
      if (found && existsSync(found)) return found
    }
  } catch {}
  return null
}

export function createTunnelManager({ bridgePort = 3189, store, spawnImpl = spawn, binaryPath } = {}) {
  let child = null
  let status = 'idle' // idle | starting | running | error
  let publicUrl = ''
  let lastError = ''
  let startedAt = null
  let startPromise = null

  function resolvedBinary() {
    return binaryPath !== undefined ? binaryPath : findCloudflaredBinary()
  }

  function getStatus() {
    const bin = resolvedBinary()
    return {
      available: Boolean(bin),
      binaryPath: bin || null,
      status,
      publicUrl,
      provider: status === 'running' ? 'cloudflare-quick' : '',
      error: lastError,
      startedAt,
      target: `http://127.0.0.1:${bridgePort}`,
    }
  }

  async function clearQuickEndpointIfOwned() {
    try {
      const ep = store?.data?.remoteEndpoint
      const curUrl = String(ep?.publicUrl || '')
      if (ep?.provider === 'cloudflare-quick' || TRYCF_URL_RE.test(curUrl)) {
        await store.bindRemoteEndpoint('', '')
      }
    } catch {}
  }

  // On fresh startup, any previously persisted quick trycloudflare.com URL is already dead
  void clearQuickEndpointIfOwned()

  async function start({ timeoutMs = 25000 } = {}) {
    if (status === 'running' && child && publicUrl) {
      return { ok: true, ...getStatus() }
    }
    if (startPromise) return startPromise

    const bin = resolvedBinary()
    if (!bin) {
      status = 'error'
      lastError = '未检测到 cloudflared，请先安装：brew install cloudflared'
      return { ok: false, ...getStatus() }
    }

    status = 'starting'
    lastError = ''
    publicUrl = ''

    startPromise = new Promise((resolve) => {
      let settled = false
      let proc = null
      const finish = (result) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        startPromise = null
        resolve(result)
      }

      try {
        proc = spawnImpl(bin, [
          'tunnel',
          '--url',
          `http://127.0.0.1:${bridgePort}`,
          '--no-autoupdate',
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (err) {
        status = 'error'
        lastError = `启动 cloudflared 失败：${err.message}`
        finish({ ok: false, ...getStatus() })
        return
      }

      child = proc

      const onOutput = (chunk) => {
        const text = String(chunk || '')
        const match = TRYCF_URL_RE.exec(text)
        if (match && !publicUrl) {
          publicUrl = match[0]
          status = 'running'
          startedAt = Date.now()
          lastError = ''
          Promise.resolve(store?.bindRemoteEndpoint?.(publicUrl, 'cloudflare-quick'))
            .catch(() => {})
            .finally(() => finish({ ok: true, ...getStatus() }))
        }
      }

      proc.stdout?.on('data', onOutput)
      proc.stderr?.on('data', onOutput)

      proc.on('error', (err) => {
        if (child === proc) child = null
        status = 'error'
        lastError = `cloudflared 进程异常：${err.message}`
        publicUrl = ''
        void clearQuickEndpointIfOwned()
        finish({ ok: false, ...getStatus() })
      })

      proc.on('exit', (code, signal) => {
        if (child === proc) child = null
        const wasStarting = status === 'starting'
        const wasRunning = status === 'running'
        publicUrl = ''
        startedAt = null
        if (wasStarting) {
          status = 'error'
          lastError = lastError || `cloudflared 提前退出（code=${code ?? signal ?? 'unknown'}）`
        } else if (wasRunning) {
          status = 'idle'
        }
        void clearQuickEndpointIfOwned()
        finish({ ok: false, ...getStatus() })
      })

      const timer = setTimeout(() => {
        if (!settled) {
          status = 'error'
          lastError = '等待 Cloudflare 分配临时域名超时，请检查网络连接'
          try { proc.kill('SIGTERM') } catch {}
          if (child === proc) child = null
          finish({ ok: false, ...getStatus() })
        }
      }, timeoutMs)
    })

    return startPromise
  }

  async function stop() {
    const proc = child
    child = null
    status = 'idle'
    publicUrl = ''
    startedAt = null
    lastError = ''
    if (proc) {
      try { proc.kill('SIGTERM') } catch {}
      setTimeout(() => {
        try {
          if (proc.exitCode === null && !proc.killed) proc.kill('SIGKILL')
        } catch {}
      }, 1500).unref?.()
    }
    await clearQuickEndpointIfOwned()
    return { ok: true, ...getStatus() }
  }

  function dispose() {
    const proc = child
    child = null
    if (proc) {
      try { proc.kill('SIGTERM') } catch {}
    }
  }

  return { getStatus, start, stop, dispose }
}
