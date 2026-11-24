import { existsSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import { renderQrSvg, generateQrMatrix } from '../lib/qrcode.mjs'

test('M5 Sandbox: per-app capability token isolates cross-app KV & enforces declared permissions (403)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m5-sandbox-'))
  try {
    const store = await JPhoneStore.open(dir)
    await store.installMiniApp({
      id: 'app-a',
      name: 'App A',
      html: '<!doctype html><html><body>App A</body></html>',
      permissions: ['storage'],
    })
    await store.installMiniApp({
      id: 'app-b',
      name: 'App B',
      html: '<!doctype html><html><body>App B</body></html>',
      permissions: ['storage', 'tasks.dispatch'],
    })
    await store.setMiniAppKv('app-b', 'secret', { token: 'top-secret' })

    const dispatched = []
    const orchestrator = {
      async dispatchTask(opts) {
        const t = { taskId: 't-cap-1', sessionId: 's-cap-1', ...opts, status: 'running' }
        dispatched.push(t)
        return t
      },
      async sendChat(text) { return { ok: true, text } },
    }
    const handler = createJPhoneHttpHandler({ store, orchestrator })
    const srv = createServer(handler)
    await new Promise((r) => srv.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${srv.address().port}`

    try {
      // Extract minted capability token from /jphone/miniapp/app-a
      const htmlA = await fetch(`${base}/jphone/miniapp/app-a`).then((r) => r.text())
      const mA = /const APP_TOKEN = "([^"]+)"/.exec(htmlA)
      assert.ok(mA && mA[1], 'miniapp HTML should inject signed APP_TOKEN')
      const tokenA = mA[1]

      const htmlB = await fetch(`${base}/jphone/miniapp/app-b`).then((r) => r.text())
      const mB = /const APP_TOKEN = "([^"]+)"/.exec(htmlB)
      assert.ok(mB && mB[1])
      const tokenB = mB[1]

      // 1. app-a can read/write its OWN KV
      const putOwn = await fetch(`${base}/jphone/api/miniapps/app-a/kv/k1`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-jphone-app-token': tokenA },
        body: JSON.stringify({ value: 'hello-a' }),
      })
      assert.equal(putOwn.status, 200)

      // 2. app-a CANNOT read app-b's KV -> 403 permission_denied
      const crossRead = await fetch(`${base}/jphone/api/miniapps/app-b/kv/secret`, {
        headers: { 'x-jphone-app-token': tokenA },
      })
      assert.equal(crossRead.status, 403)
      const crossJson = await crossRead.json()
      assert.equal(crossJson.error, 'permission_denied')

      // 3. app-a CANNOT dispatch tasks (missing tasks.dispatch) -> 403
      const badDispatch = await fetch(`${base}/jphone/api/tasks/dispatch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jphone-app-token': tokenA },
        body: JSON.stringify({ title: 'Sneaky', prompt: 'rm -rf /' }),
      })
      assert.equal(badDispatch.status, 403)
      const badDispJson = await badDispatch.json()
      assert.equal(badDispJson.error, 'permission_denied')
      assert.equal(badDispJson.required, 'tasks.dispatch')

      // 4. app-a CANNOT ask chat (missing chat.ask) -> 403
      const badChat = await fetch(`${base}/jphone/api/chat/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jphone-app-token': tokenA },
        body: JSON.stringify({ text: 'hi' }),
      })
      assert.equal(badChat.status, 403)

      // 5. app-b HAS tasks.dispatch -> 200 OK
      const okDispatch = await fetch(`${base}/jphone/api/tasks/dispatch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jphone-app-token': tokenB },
        body: JSON.stringify({ title: 'Legit', prompt: 'summarize notes' }),
      })
      assert.equal(okDispatch.status, 200)
      assert.equal(dispatched.length, 1)
    } finally {
      srv.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M5 Split Storage: persists miniapps/<id>/index.html & kv/<id>.json + migrates legacy monolithic jphone-state.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m5-split-'))
  try {
    // Seed a legacy monolithic jphone-state.json with inline html + miniAppKv
    const legacy = {
      pairingToken: 'legacy-tok',
      miniApps: [
        {
          id: 'legacy-calc',
          name: '老版本计算器',
          icon: 'calculator',
          color: '#007AFF',
          description: 'legacy inline html',
          permissions: ['storage'],
          html: '<!doctype html><html><body>LEGACY_CALC_OK</body></html>',
          source: 'generated',
          installedAt: 1700000000000,
        },
      ],
      miniAppKv: {
        'legacy-calc': { history: [1, 2, 3] },
      },
      memories: [{ id: 'm1', text: 'likes oolong tea', createdAt: 1700000000000 }],
    }
    await writeFile(join(dir, 'jphone-state.json'), JSON.stringify(legacy, null, 2), 'utf8')

    // Opening should transparently migrate!
    const store = await JPhoneStore.open(dir)
    assert.match(store.getMiniApp('legacy-calc').html, /LEGACY_CALC_OK/)
    assert.deepEqual(store.getMiniAppKv('legacy-calc', 'history'), [1, 2, 3])

    // Verify modular files exist on disk
    const htmlOnDisk = await readFile(join(dir, 'miniapps', 'legacy-calc', 'index.html'), 'utf8')
    assert.match(htmlOnDisk, /LEGACY_CALC_OK/)
    const kvOnDisk = JSON.parse(await readFile(join(dir, 'kv', 'legacy-calc.json'), 'utf8'))
    assert.deepEqual(kvOnDisk.history, [1, 2, 3])

    // Verify jphone-state.json is now lightweight (no inline html blobs, no inline kv blobs)
    const stateRaw = JSON.parse(await readFile(join(dir, 'jphone-state.json'), 'utf8'))
    const calcMeta = stateRaw.miniApps.find((a) => a.id === 'legacy-calc')
    assert.equal(calcMeta.html, undefined, 'jphone-state.json should not inline heavy HTML')
    assert.deepEqual(stateRaw.miniAppKv, {}, 'jphone-state.json should keep miniAppKv empty once split to kv/<id>.json')

    // Reopen fresh instance and confirm everything loads identically from modular files!
    const reopened = await JPhoneStore.open(dir)
    assert.match(reopened.getMiniApp('legacy-calc').html, /LEGACY_CALC_OK/)
    assert.deepEqual(reopened.getMiniAppKv('legacy-calc', 'history'), [1, 2, 3])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M5 Character Pack + Vision Attachments + Pairing QR Code SVG', async () => {
  const bundledChar = join(import.meta.dirname, '../assets/character/xiaojing/character.json')
  const repoRoot = join(import.meta.dirname, '../../..')
  const charPath = existsSync(bundledChar) ? bundledChar : join(repoRoot, 'assets/character/xiaojing/character.json')
  const charJson = JSON.parse(await readFile(charPath, 'utf8'))
  assert.equal(charJson.id, 'xiaojing')
  assert.equal(charJson.proportions, '2-head-chibi')
  assert.ok(charJson.sprites.idle_sway)
  assert.ok(charJson.lav.touch_tail)

  // QR matrix & SVG
  const mat = generateQrMatrix('http://127.0.0.1:3189/jphone/?token=test123456')
  assert.ok(mat.length >= 21 && mat.length % 4 === 1)
  const svg = renderQrSvg('http://127.0.0.1:3189/jphone/?token=test123456')
  assert.match(svg, /^<svg[^>]+viewBox=/)
  assert.match(svg, /<rect/)

  // HTTP /jphone/api/character & /jphone/api/console/pairing-qr.svg + Orchestrator vision attachment
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m5-misc-'))
  try {
    const store = await JPhoneStore.open(dir)
    const prompts = []
    const sessionController = {
      async create({ workspaceId }) { return { sessionId: 'sess-vis-1', workspaceId } },
      async prompt(args) { prompts.push(args); return { ok: true } },
    }
    const orchestrator = new JPhoneOrchestrator({ store, sessionController, workspaceDir: join(dir, 'ws') })
    const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    await orchestrator.sendChat('帮我看看这张图是什么', {
      attachments: [{ name: 'shot.png', mimeType: 'image/png', dataBase64: png1x1 }],
    })
    assert.equal(prompts.length, 1)
    assert.match(prompts[0].message, /图片|视觉/)
    assert.ok(Array.isArray(prompts[0].images) && prompts[0].images.length === 1)
    assert.equal(prompts[0].images[0].mimeType, 'image/png')

    const handler = createJPhoneHttpHandler({
      store,
      orchestrator,
      characterAssetsDir: existsSync(join(import.meta.dirname, '../assets/character')) ? join(import.meta.dirname, '../assets/character') : join(repoRoot, 'assets/character'),
    })
    const srv = createServer(handler)
    await new Promise((r) => srv.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${srv.address().port}`
    try {
      const charRes = await fetch(`${base}/jphone/api/character`).then((r) => r.json())
      assert.equal(charRes.ok, true)
      assert.equal(charRes.character.id, 'xiaojing')

      const qrRes = await fetch(`${base}/jphone/api/console/pairing-qr.svg`)
      assert.equal(qrRes.status, 200)
      assert.match(qrRes.headers.get('content-type') || '', /image\/svg\+xml/)
      const qrSvg = await qrRes.text()
      assert.match(qrSvg, /<svg/)
    } finally {
      srv.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }

  // Verify client.js renders the pairing QR in Console modal
  const clientJs = await readFile(join(import.meta.dirname, '../lib/client.js'), 'utf8')
  assert.match(clientJs, /pairing-qr\.svg/)
})
