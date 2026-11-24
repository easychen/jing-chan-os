import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import {
  isValidServerChanKey,
  resolveServerChanEndpoint,
  buildAppKeyCreateUrl,
  sendServerChanNotification,
} from '../lib/notify.mjs'

async function startTestServer({ requireToken = true, fetchImpl } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m1-'))
  const store = await JPhoneStore.open(dir)
  const orchestrator = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })
  await orchestrator.ensureWorkspace()
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator,
    webDistDir: join(dir, 'web-dist'),
    characterAssetsDir: join(dir, 'char'),
    bridgePort: 3189,
    requireToken,
    notifyFetchImpl: fetchImpl,
  })
  const server = createServer((req, res) => void handler(req, res))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  return { server, baseUrl: `http://127.0.0.1:${port}`, store, dir }
}

test('M1: ServerChan helper validates SendKey/AppKey/SC3 and builds partner AppKey create URL', async () => {
  assert.equal(isValidServerChanKey('SCT123456abcdef'), true)
  assert.equal(isValidServerChanKey('SCT9876TA-abcdef1234'), true)
  assert.equal(isValidServerChanKey('sctp1234tABCDEF'), true)
  assert.equal(isValidServerChanKey('invalid-key'), false)
  assert.equal(isValidServerChanKey(''), false)

  assert.equal(
    resolveServerChanEndpoint('SCT9876TA-abc'),
    'https://sctapi.ftqq.com/SCT9876TA-abc.send',
  )
  assert.equal(
    resolveServerChanEndpoint('sctp4321tXYZ'),
    'https://4321.push.ft07.com/send/sctp4321tXYZ.send',
  )

  const link = buildAppKeyCreateUrl({ origin: 'http://127.0.0.1:3188', appName: '鲸Phone' })
  assert.ok(link.startsWith('https://sct.ftqq.com/appkey/create/forward?'))
  assert.ok(link.includes(encodeURIComponent('{key}')))

  let calledUrl = ''
  let calledBody = ''
  const res = await sendServerChanNotification({
    sendKey: 'SCT9876TA-demo',
    title: '测试标题',
    desp: '测试内容',
    fetchImpl: async (url, init) => {
      calledUrl = String(url)
      calledBody = String(init?.body || '')
      return {
        ok: true,
        status: 200,
        json: async () => ({ code: 0, message: '', data: { pushid: 'p1' } }),
      }
    },
  })
  assert.equal(res.ok, true)
  assert.equal(calledUrl, 'https://sctapi.ftqq.com/SCT9876TA-demo.send')
  assert.ok(calledBody.includes('title='))
})

test('M1: requireToken enforces mandatory pairingToken & CORS rejects untrusted origins', async () => {
  const { server, baseUrl, store } = await startTestServer({ requireToken: true })
  try {
    // Health remains public
    const health = await fetch(`${baseUrl}/jphone/api/health`)
    assert.equal(health.status, 200)

    // Missing token MUST be rejected with 401!
    const noTok = await fetch(`${baseUrl}/jphone/api/state`)
    assert.equal(noTok.status, 401)

    // Wrong token MUST be rejected with 401!
    const badTok = await fetch(`${baseUrl}/jphone/api/state`, {
      headers: { authorization: 'Bearer wrong-token' },
    })
    assert.equal(badTok.status, 401)

    // Valid Bearer token succeeds!
    const okTok = await fetch(`${baseUrl}/jphone/api/state`, {
      headers: { authorization: `Bearer ${store.data.pairingToken}` },
    })
    assert.equal(okTok.status, 200)

    // Untrusted Origin does NOT receive wildcard or reflected CORS header
    const evilCors = await fetch(`${baseUrl}/jphone/api/health`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.attacker.example' },
    })
    const acao = evilCors.headers.get('access-control-allow-origin')
    assert.notEqual(acao, '*')
    assert.notEqual(acao, 'https://evil.attacker.example')

    // Loopback Origin is allowed
    const localCors = await fetch(`${baseUrl}/jphone/api/health`, {
      method: 'OPTIONS',
      headers: { origin: 'http://127.0.0.1:3188' },
    })
    assert.equal(localCors.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3188')
  } finally {
    server.close()
  }
})

test('M1: ServerChan API config, AppKey callback, test push & text-only diary reply', async () => {
  let pushCount = 0
  const { server, baseUrl, store } = await startTestServer({
    requireToken: false,
    fetchImpl: async () => {
      pushCount++
      return {
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { pushid: 'test-123' } }),
      }
    },
  })
  try {
    // 1. AppKey partner callback auto-saves key
    const cb = await fetch(`${baseUrl}/jphone/api/notify/serverchan/callback?key=SCT777TA-autokey`)
    assert.equal(cb.status, 200)
    assert.equal(store.data.notifications.sendKey, 'SCT777TA-autokey')
    assert.equal(store.data.notifications.enabled, true)

    // 2. GET config returns masked key & quick-create link
    const cfg = await (await fetch(`${baseUrl}/jphone/api/notify/config`)).json()
    assert.equal(cfg.ok, true)
    assert.equal(cfg.configured, true)
    assert.ok(cfg.appKeyCreateUrl.includes('sct.ftqq.com/appkey/create/forward'))
    assert.ok(!cfg.maskedKey.includes('autokey'))

    // 3. Test push endpoint sends notification immediately
    const testRes = await (await fetch(`${baseUrl}/jphone/api/notify/serverchan/test`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })).json()
    assert.equal(testRes.ok, true)
    assert.equal(pushCount, 1)

    // 4. Diary text-only reply does NOT pollute fallbackMessages with [语音通话]
    const beforeCount = store.data.fallbackMessages.length
    const replyRes = await (await fetch(`${baseUrl}/jphone/api/diary/reply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postText: '今天写完了代码', comment: '辛苦啦小鲸！' }),
    })).json()
    assert.equal(replyRes.ok, true)
    assert.ok(typeof replyRes.reply === 'string' && replyRes.reply.length > 0)
    assert.equal(store.data.fallbackMessages.length, beforeCount)

    // 5. Built-in Diary HTML no longer calls /jphone/api/voice/turn
    const diaryHtml = await (await fetch(`${baseUrl}/jphone/miniapp/jing-diary`)).text()
    assert.ok(!diaryHtml.includes('/jphone/api/voice/turn'))
    assert.ok(diaryHtml.includes('/jphone/api/diary/reply'))

    // 6. Bridge injects window.jing.events & window.jing.db & normalized ui.notify
    assert.ok(diaryHtml.includes('events:'))
    assert.ok(diaryHtml.includes('window.jing.db'))
  } finally {
    server.close()
  }
})

test('M1: store.mjs has no duplicate addMemory & index.js registers jphone_bind_endpoint', async () => {
  const storeSrc = await readFile(new URL('../lib/store.mjs', import.meta.url), 'utf8')
  const matches = storeSrc.match(/async\s+addMemory\s*\(/g) || []
  assert.equal(matches.length, 1, 'store.mjs should define addMemory exactly once')

  const indexSrc = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
  assert.ok(indexSrc.includes('jphone_bind_endpoint'), 'index.js must register jphone_bind_endpoint tool')
  assert.ok(indexSrc.includes('requireToken: true'), 'bridge listener must enforce requireToken: true')
})


test('M1 P0: POST /jphone/api/tasks/steer appends instruction to running task', async () => {
  const { server, baseUrl } = await startTestServer({ requireToken: false })
  try {
    const dRes = await fetch(`${baseUrl}/jphone/api/tasks/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '检查日报', prompt: '汇总今日 AI 动态' }),
    })
    const dData = await dRes.json()
    assert.equal(dRes.status, 200)
    const sid = dData.task.sessionId

    const sRes = await fetch(`${baseUrl}/jphone/api/tasks/steer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, message: '重点关注开源模型' }),
    })
    const sData = await sRes.json()
    assert.equal(sRes.status, 200)
    assert.equal(sData.ok, true)
    assert.match(sData.task.summary, /重点关注开源模型/)
  } finally {
    await new Promise((r) => server.close(r))
  }
})
