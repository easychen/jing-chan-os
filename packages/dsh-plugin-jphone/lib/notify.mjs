/**
 * Server酱 (ServerChan Turbo / AppKey / Server酱³) Notification Integration
 * Follows https://sct.ftqq.com/docs/developers/partner/
 * Accepts SendKey (SCT...), AppKey (SCT{uid}TA-...), and ServerChan³ (sctp{uid}t...).
 */

export function isValidServerChanKey(rawKey) {
  const key = String(rawKey || '').trim()
  if (key.length < 8) return false
  return /^sct/i.test(key)
}

export function maskServerChanKey(rawKey) {
  const key = String(rawKey || '').trim()
  if (!key) return ''
  if (key.length <= 8) return `${key.slice(0, 3)}****`
  return `${key.slice(0, 6)}****${key.slice(-4)}`
}

export function resolveServerChanEndpoint(rawKey) {
  const key = String(rawKey || '').trim()
  const sc3 = /^sctp(\d+)t/i.exec(key)
  if (sc3) {
    return `https://${sc3[1]}.push.ft07.com/send/${encodeURIComponent(key)}.send`
  }
  return `https://sctapi.ftqq.com/${encodeURIComponent(key)}.send`
}

export function buildAppKeyCreateUrl({ origin, appName = '小鲸同学', ref = '' } = {}) {
  const cleanOrigin = String(origin || 'http://127.0.0.1:3188').replace(/\/+$/, '')
  const callbackUrl = `${cleanOrigin}/jphone/api/notify/serverchan/callback?key={key}`
  const params = new URLSearchParams()
  params.set('name', appName)
  params.set('url', callbackUrl)
  if (ref) params.set('ref', String(ref))
  return `https://sct.ftqq.com/appkey/create/forward?${params.toString()}`
}

export async function sendServerChanNotification({
  sendKey,
  title,
  desp = '',
  short = '',
  fetchImpl = globalThis.fetch,
} = {}) {
  const key = String(sendKey || '').trim()
  if (!isValidServerChanKey(key)) {
    return { ok: false, error: 'invalid_sendkey', message: 'SendKey / AppKey 需以 SCT 或 sctp 开头' }
  }
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'fetch_unavailable', message: '当前运行环境不支持 HTTP 请求' }
  }
  const endpoint = resolveServerChanEndpoint(key)
  const form = new URLSearchParams()
  form.set('title', String(title || '小鲸同学 通知').slice(0, 32))
  if (desp) form.set('desp', String(desp))
  if (short) form.set('short', String(short).slice(0, 64))

  try {
    const resp = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: form.toString(),
    })
    const data = await resp.json().catch(() => ({}))
    const code = data?.code ?? (resp.ok ? 0 : resp.status)
    const ok = resp.ok && (code === 0 || code === '0')
    return {
      ok,
      status: resp.status,
      code,
      pushId: data?.data?.pushid || data?.data?.id || '',
      message: ok ? '推送成功' : (data?.message || data?.info || `HTTP ${resp.status}`),
      raw: data,
    }
  } catch (err) {
    return { ok: false, error: 'network_error', message: err?.message || String(err) }
  }
}

export async function notifyIfEnabled(store, eventType, { title, desp = '', short = '', fetchImpl } = {}) {
  const cfg = store?.getNotificationConfig?.()
  if (!cfg || !cfg.enabled || !isValidServerChanKey(cfg.sendKey)) {
    return { ok: false, skipped: true, reason: 'disabled_or_unconfigured' }
  }
  if (eventType === 'task_done' && cfg.notifyOnTaskDone === false) return { ok: false, skipped: true }
  if (eventType === 'focus_done' && cfg.notifyOnFocusDone === false) return { ok: false, skipped: true }
  if (eventType === 'diary_post' && cfg.notifyOnDiaryPost === false) return { ok: false, skipped: true }
  return sendServerChanNotification({
    sendKey: cfg.sendKey,
    title,
    desp,
    short,
    fetchImpl,
  })
}
