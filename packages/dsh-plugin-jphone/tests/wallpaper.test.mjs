import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'

test('wallpaper API persists config and serves raw uploaded .panime.png bytes intact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-wp-'))
  const store = await JPhoneStore.open(dir)
  const orchestrator = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })
  const broadcasts = []
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator,
    wsHub: { broadcast: (m) => broadcasts.push(m) },
  })
  const server = http.createServer(async (req, res) => {
    await handler(req, res)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  try {
    // 1. Default wallpaper state
    const defRes = await fetch(`${base}/jphone/api/wallpaper`).then((r) => r.json())
    assert.equal(defRes.ok, true)
    assert.equal(defRes.wallpaper.parallaxEnabled, true)
    assert.equal(defRes.wallpaper.shakeEnabled, true)
    assert.equal(defRes.wallpaper.touchJiggleEnabled, true)

    // 2. Upload fake .panime.png bytes (PNG header + paNe marker bytes)
    const rawBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x70, 0x61, 0x4e, 0x65, 1, 2, 3, 4])
    const upRes = await fetch(`${base}/jphone/api/wallpaper/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'whale.panime.png',
        name: '小鲸果冻壁纸',
        hasPanime: true,
        base64: rawBytes.toString('base64'),
      }),
    }).then((r) => r.json())
    assert.equal(upRes.ok, true)
    assert.equal(upRes.wallpaper.hasPanime, true)
    assert.ok(upRes.wallpaper.url.startsWith('/jphone/wallpapers/'))

    // 3. Binary served byte-for-byte intact (zero recompression)
    const fetched = Buffer.from(await fetch(`${base}${upRes.wallpaper.url}`).then((r) => r.arrayBuffer()))
    assert.deepEqual(fetched, rawBytes)

    // 4. Update parallax/shake settings and verify reload persistence
    const cfgRes = await fetch(`${base}/jphone/api/wallpaper/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parallaxEnabled: false,
        shakeIntensity: 1.6,
        touchJiggleEnabled: true,
      }),
    }).then((r) => r.json())
    assert.equal(cfgRes.ok, true)
    assert.equal(cfgRes.wallpaper.parallaxEnabled, false)
    assert.equal(cfgRes.wallpaper.shakeIntensity, 1.6)
    assert.ok(broadcasts.some((b) => b.type === 'wallpaper:updated'))

    const reloaded = await JPhoneStore.open(dir)
    assert.equal(reloaded.getWallpaper().parallaxEnabled, false)
    assert.equal(reloaded.getWallpaper().shakeIntensity, 1.6)
    assert.equal(reloaded.getWallpaper().hasPanime, true)
  } finally {
    server.close()
    await rm(dir, { recursive: true, force: true })
  }
})
