import { FOCUS_NOISE_TRACKS, FOCUS_LOFI_TRACKS } from '../lib/focus-miniapp.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import { installGitPackage } from '../lib/workshop.mjs'

test('P18 Focus Custom Video Import: upload, serve, select, sandbox isolation & delete', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p18-focus-'))
  try {
    const store = await JPhoneStore.open(dir)
    const handler = createJPhoneHttpHandler({
      store,
      orchestrator: { listSkills: async () => [] },
    })
    const srv = createServer(handler)
    await new Promise((r) => srv.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${srv.address().port}`

    const authHeaders = {}
    try {
      // 1. Default list includes builtin xiaojing
      const list0 = await fetch(`${base}/jphone/api/focus/packs`, { headers: authHeaders }).then((r) => r.json())
      assert.equal(list0.ok, true)
      assert.equal(list0.activeId, 'xiaojing')
      assert.equal(list0.packs.length, 1)
      assert.equal(list0.packs[0].id, 'xiaojing')

      // 2. Upload custom animated .webm video (simulated EBML header bytes)
      const fakeWebm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04])
      const up = await fetch(`${base}/jphone/api/focus/packs/upload`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name: '深海猫猫伴学',
          filename: 'cat_loop.webm',
          dataBase64: fakeWebm.toString('base64'),
        }),
      }).then((r) => r.json())
      assert.equal(up.ok, true)
      assert.equal(up.pack.name, '深海猫猫伴学')
      assert.equal(up.activeId, up.pack.id)
      assert.ok(up.pack.poses.stand.url.startsWith('/jphone/focus-packs/'))

      // 2b. Unprivileged third-party miniapp capability token is blocked from modifying Focus packs
      await store.installMiniApp({
        id: 'third-party-app',
        name: 'Third Party',
        html: '<html></html>',
        permissions: ['kv.read'],
      })
      const appHtml = await fetch(`${base}/jphone/miniapp/third-party-app`).then((r) => r.text())
      const capMatch = appHtml.match(/const APP_TOKEN = "([^"]+)"/)
      assert.ok(capMatch && capMatch[1], 'expected miniapp capability token')
      const blocked = await fetch(`${base}/jphone/api/focus/packs/select`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-jphone-app-token': capMatch[1] },
        body: JSON.stringify({ id: 'xiaojing' }),
      })
      assert.equal(blocked.status, 403)

      // 3. Static serve returns exact uploaded bytes with video/webm
      const mediaRes = await fetch(`${base}${up.pack.poses.stand.url}`)
      assert.equal(mediaRes.status, 200)
      assert.equal(mediaRes.headers.get('content-type'), 'video/webm')
      const servedBuf = Buffer.from(await mediaRes.arrayBuffer())
      assert.deepEqual(servedBuf, fakeWebm)

      // 4. Switch back to official xiaojing
      const sel = await fetch(`${base}/jphone/api/focus/packs/select`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({ id: 'xiaojing' }),
      }).then((r) => r.json())
      assert.equal(sel.ok, true)
      assert.equal(sel.activeId, 'xiaojing')

      // 5. Delete custom pack works; deleting builtin xiaojing fails cleanly
      const delBad = await fetch(`${base}/jphone/api/focus/packs/xiaojing`, { method: 'DELETE', headers: authHeaders })
      assert.equal(delBad.status, 400)
      const delOk = await fetch(`${base}/jphone/api/focus/packs/${encodeURIComponent(up.pack.id)}`, { method: 'DELETE', headers: authHeaders }).then((r) => r.json())
      assert.equal(delOk.ok, true)
      assert.equal(delOk.packs.length, 1)

      // 6. Focus HTML exposes import button & window.jing.focus bridge
      const focusHtml = await fetch(`${base}/jphone/miniapp/jing-focus`).then((r) => r.text())
      assert.match(focusHtml, /btn-import-focus-video/)
      assert.match(focusHtml, /focus-pack-list/)
      assert.match(focusHtml, /window\.jing =/)
      assert.match(focusHtml, /uploadMedia\(payload\)/)
    } finally {
      srv.closeAllConnections?.(); srv.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('P18 Workshop Character Focus Pack: installGitPackage downloads LAV clips into Focus packs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p18-ws-char-'))
  try {
    const store = await JPhoneStore.open(dir)
    const fakeIdle = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x10, 0x20])
    const fakeDesk = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x30, 0x40])
    const fakeBg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

    const mockFetch = async (url) => {
      const s = String(url)
      if (s.endsWith('/manifest.json')) {
        return new Response(JSON.stringify({
          id: 'starry-cat',
          name: '星夜小猫伴学包',
          type: 'character',
          version: '1.0.0',
          entry: 'character.json',
          author: 'community',
          description: '透明星夜小猫专注动态包',
          permissions: [],
        }), { status: 200 })
      }
      if (s.endsWith('/character.json')) {
        return new Response(JSON.stringify({
          id: 'starry-cat',
          name: '星夜小猫伴学包',
          lav: {
            stand: 'clips/idle.webm',
            desk: 'clips/desk.webm',
          },
          bg: 'bg/night.jpg',
        }), { status: 200 })
      }
      if (s.endsWith('/clips/idle.webm')) return new Response(fakeIdle, { status: 200 })
      if (s.endsWith('/clips/desk.webm')) return new Response(fakeDesk, { status: 200 })
      if (s.endsWith('/bg/night.jpg')) return new Response(fakeBg, { status: 200 })
      return new Response('not found', { status: 404 })
    }

    const res = await installGitPackage(
      'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/starry-cat',
      { store, fetchImpl: mockFetch, useGhCli: false }
    )
    assert.equal(res.ok, true)
    assert.equal(res.type, 'character')
    assert.equal(res.focusPack.id, 'starry-cat')
    assert.ok(res.focusPack.poses.stand.url.includes('/jphone/focus-packs/starry-cat/'))
    assert.ok(res.focusPack.poses.desk.url.includes('/jphone/focus-packs/starry-cat/'))
    assert.ok(res.focusPack.bgUrl.includes('/jphone/focus-packs/starry-cat/'))
    assert.equal(store.getActiveFocusPackId(), 'starry-cat')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('P18 Focus Built-in Audio: all 12 noise tracks and 6 Lo-Fi tracks return 200 audio/mpeg', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p18-audio-'))
  try {
    const store = await JPhoneStore.open(dir)
    const handler = createJPhoneHttpHandler({ store, orchestrator: null })
    const server = createServer(handler)
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`
    try {
      for (const item of FOCUS_NOISE_TRACKS) {
        const res = await fetch(`${base}/jphone/media/focus/noise/${encodeURIComponent(item.file)}`)
        assert.equal(res.status, 200, `Noise ${item.id} (${item.file}) should return 200`)
        assert.equal(res.headers.get('content-type'), 'audio/mpeg')
        const buf = Buffer.from(await res.arrayBuffer())
        assert.ok(buf.length > 10_000, `Noise ${item.file} should be >10KB, got ${buf.length}`)
      }
      for (const item of FOCUS_LOFI_TRACKS) {
        const res = await fetch(`${base}/jphone/media/focus/music/${encodeURIComponent(item.file)}`)
        assert.equal(res.status, 200, `Lo-Fi ${item.id} (${item.file}) should return 200`)
        assert.equal(res.headers.get('content-type'), 'audio/mpeg')
        const buf = Buffer.from(await res.arrayBuffer())
        assert.ok(buf.length > 100_000, `Lo-Fi ${item.file} should be >100KB, got ${buf.length}`)
      }
    } finally {
      await new Promise((r) => server.close(r))
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
