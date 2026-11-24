import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { JPhoneStore, detectLanIpv4 } from '../lib/store.mjs'
import { createTunnelManager } from '../lib/tunnel.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'

test('P16: LAN IP pairing info + one-click Cloudflare Tunnel start/stop + plugin persistence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p16-'))
  try {
    const store = await JPhoneStore.open(dir)
    const lanIp = detectLanIpv4()
    assert.ok(typeof lanIp === 'string' && lanIp.length > 0)

    const initialPairing = store.getPairingInfo(3189)
    assert.equal(initialPairing.lanUrl, `http://${lanIp}:3189`)
    assert.ok(initialPairing.pairUrl.includes(initialPairing.lanUrl), 'QR pairUrl should use LAN URL, not hardcoded 127.0.0.1 when LAN exists')
    assert.ok(initialPairing.pairUrl.includes(`token=${encodeURIComponent(initialPairing.pairingToken)}`))

    // Mock cloudflared child process
    let killed = false
    const mockSpawn = () => {
      const child = new EventEmitter()
      child.stdout = new EventEmitter()
      child.stderr = new EventEmitter()
      child.exitCode = null
      child.killed = false
      child.kill = () => {
        killed = true
        child.killed = true
        child.exitCode = 0
        child.emit('exit', 0, 'SIGTERM')
      }
      setTimeout(() => {
        child.stderr.emit('data', 'INF |  https://whale-demo-99.trycloudflare.com  |\n')
      }, 20)
      return child
    }

    const tunnelManager = createTunnelManager({
      bridgePort: 3189,
      store,
      spawnImpl: mockSpawn,
      binaryPath: '/mock/cloudflared',
    })

    const orchestrator = { listSkills: async () => [], listTasks: () => [] }
    const handler = createJPhoneHttpHandler({
      store,
      orchestrator,
      bridgePort: 3189,
      tunnelManager,
      requireToken: false,
    })
    const server = createServer((req, res) => void handler(req, res))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`

    try {
      // 1. Start tunnel via HTTP API
      const startRes = await fetch(`${base}/jphone/api/tunnel/start`, { method: 'POST' })
      assert.equal(startRes.status, 200)
      const startData = await startRes.json()
      assert.equal(startData.ok, true)
      assert.equal(startData.tunnel.status, 'running')
      assert.equal(startData.tunnel.publicUrl, 'https://whale-demo-99.trycloudflare.com')
      assert.equal(startData.pairing.qrMode, 'public')
      assert.ok(startData.pairing.pairUrl.startsWith('https://whale-demo-99.trycloudflare.com/jphone/?token='))

      // 2. QR SVG renders cleanly for both public & lan modes
      const qrRes = await fetch(`${base}/jphone/api/console/pairing-qr.svg?mode=public`)
      assert.equal(qrRes.status, 200)
      const svg = await qrRes.text()
      assert.ok(svg.includes('<svg'))
      const qrLanRes = await fetch(`${base}/jphone/api/console/pairing-qr.svg?mode=lan`)
      assert.equal(qrLanRes.status, 200)
      assert.ok((await qrLanRes.text()).includes('<svg'))

      // 3. Stop tunnel -> reverts QR back to LAN URL
      const stopRes = await fetch(`${base}/jphone/api/tunnel/stop`, { method: 'POST' })
      assert.equal(stopRes.status, 200)
      const stopData = await stopRes.json()
      assert.equal(killed, true)
      assert.equal(stopData.tunnel.status, 'idle')
      assert.equal(stopData.pairing.publicUrl, '')
      assert.ok(stopData.pairing.pairUrl.includes(stopData.pairing.lanUrl))

      // 4. Verify client.js persists phoneOpen state & exposes one-click tunnel toggle
      const clientJs = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
      assert.ok(clientJs.includes('jphone_phone_open_v1'), 'client.js should persist phoneOpen in localStorage')
      assert.ok(clientJs.includes('/jphone/api/tunnel/start'), 'client.js should call tunnel start endpoint')
      assert.ok(clientJs.includes('/jphone/api/tunnel/stop'), 'client.js should call tunnel stop endpoint')
    } finally {
      tunnelManager.dispose()
      await new Promise((r) => server.close(r))
    }
  } finally {
    await new Promise((r) => setTimeout(r, 40))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 30 })
  }
})

test('P17: one-click LAN bridge toggle persists, rebinds host, and updates QR mode + focus pose persists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p17-lan-'))
  try {
    const store = await JPhoneStore.open(dir)
    assert.equal(store.isLanBridgeEnabled(), true, 'LAN bridge should default to enabled')

    const rebindCalls = []
    const handler = createJPhoneHttpHandler({
      store,
      orchestrator: { listSkills: async () => [] },
      wsHub: { broadcast() {} },
      webDistDir: dir,
      characterAssetsDir: dir,
      bridgePort: 3189,
      rebindBridge: async (enabled) => {
        rebindCalls.push(enabled)
      },
    })
    const server = createServer((req, res) => void handler(req, res))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const { port } = server.address()

    try {
      // Turn LAN bridge OFF
      const offRes = await fetch(`http://127.0.0.1:${port}/jphone/api/bridge/lan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      assert.equal(offRes.status, 200)
      const offBody = await offRes.json()
      assert.equal(offBody.ok, true)
      assert.equal(offBody.lanBridgeEnabled, false)
      assert.equal(offBody.pairing.lanBridgeEnabled, false)
      assert.equal(offBody.pairing.qrMode, 'none')
      assert.equal(offBody.pairing.qrAvailable, false)
      assert.equal(offBody.pairing.pairUrl, '')
      const qrOffRes = await fetch(`http://127.0.0.1:${port}/jphone/api/console/pairing-qr.svg`)
      assert.equal(qrOffRes.status, 404, 'QR endpoint should return 404 when both LAN and public tunnel are disabled')
      assert.deepEqual(rebindCalls, [false])

      // Verify persisted on disk
      const reloaded = await JPhoneStore.open(dir)
      assert.equal(reloaded.isLanBridgeEnabled(), false)

      // Turn LAN bridge back ON
      const onRes = await fetch(`http://127.0.0.1:${port}/jphone/api/bridge/lan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      assert.equal(onRes.status, 200)
      const onBody = await onRes.json()
      assert.equal(onBody.ok, true)
      assert.equal(onBody.lanBridgeEnabled, true)
      assert.equal(onBody.pairing.lanBridgeEnabled, true)
      assert.deepEqual(rebindCalls, [false, true])

      // Verify client.js exposes LAN toggle and focus-miniapp persists posture
      const clientJs = await readFile(join(import.meta.dirname, '..', 'lib', 'client.js'), 'utf8')
      assert.ok(clientJs.includes('/jphone/api/bridge/lan'), 'client.js should call /jphone/api/bridge/lan')
      const focusMjs = await readFile(join(import.meta.dirname, '..', 'lib', 'focus-miniapp.mjs'), 'utf8')
      assert.ok(focusMjs.includes('jphone_focus_pose_v1'), 'focus-miniapp should persist posture in localStorage')
      assert.ok(focusMjs.includes("focus_pose"), 'focus-miniapp should persist posture in window.jing.storage')
    } finally {
      await new Promise((r) => server.close(r))
    }
  } finally {
    await new Promise((r) => setTimeout(r, 40))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 30 })
  }
})
