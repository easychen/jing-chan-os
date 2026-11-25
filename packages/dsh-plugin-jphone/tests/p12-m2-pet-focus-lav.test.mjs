import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JING_FOCUS_MINIAPP_HTML } from '../lib/focus-miniapp.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = join(__dirname, '..')
const REPO_ROOT = join(__dirname, '..', '..', '..')
const SPRITES_DIR = existsSync(join(PLUGIN_ROOT, 'assets', 'character', 'sprites'))
  ? join(PLUGIN_ROOT, 'assets', 'character', 'sprites')
  : join(REPO_ROOT, 'assets', 'character', 'sprites')
const LAV_DIR = join(PLUGIN_ROOT, 'assets', 'lav', 'xiaojing')
const CLIENT_JS = join(PLUGIN_ROOT, 'lib', 'client.js')

function readPngDimensions(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'must be PNG')
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25], // 6 = RGBA
  }
}

test('M2 Pet: unified 2-head calm idle sprites + matched working & sleepy exist as 1024x256 RGBA strips', async () => {
  const required = [
    'sprite_idle.png',
    'sprite_idle_sway.png',
    'sprite_idle_hair.png',
    'sprite_idle_pose.png',
    'sprite_idle_drowsy.png',
    'sprite_idle_look.png',
    'sprite_working.png',
    'sprite_sleepy.png',
    'sprite_walk_down.png',
    'sprite_walk_up.png',
    'sprite_walk_dr.png',
    'sprite_walk_ur.png',
    'sprite_tea.png',
    'sprite_music.png',
    'sprite_happy.png',
  ]
  for (const name of required) {
    const buf = await readFile(join(SPRITES_DIR, name))
    const dim = readPngDimensions(buf)
    assert.equal(dim.width, 1024, `${name} width should be 1024`)
    assert.equal(dim.height, 256, `${name} height should be 256`)
    assert.equal(dim.colorType, 6, `${name} must be RGBA (colorType 6)`)
  }
})

test('M2 Pet: client.js preloads sprites without flash and rotates calm idle micro-animations', async () => {
  const src = await readFile(CLIENT_JS, 'utf8')
  for (const key of ['idle_sway', 'idle_hair', 'idle_pose', 'idle_drowsy', 'idle_look']) {
    assert.match(src, new RegExp(key), `client.js must register calm idle action ${key}`)
  }
  assert.match(src, /CALM_IDLE_ACTIONS/, 'client.js must define CALM_IDLE_ACTIONS rotation list')
  assert.match(src, /decode\(\)/, 'client.js must preload & decode sprites to prevent flash on switch')
})

test('M2 Focus LAV: multi-pose & multi-zone transparent VP9+Alpha webm and HEVC+Alpha mov clips exist', async () => {
  const stems = [
    'xiaojing_idle',
    'xiaojing_desk',
    'xiaojing_glance',
    'xiaojing_sit',
    'xiaojing_touch_head',
    'xiaojing_touch_body',
    'xiaojing_touch_tail',
  ]
  for (const stem of stems) {
    const webmSt = await stat(join(LAV_DIR, `${stem}.webm`))
    assert.ok(webmSt.size > 40_000, `${stem}.webm should be valid encoded VP9+Alpha webm (>40KB)`)
    const movSt = await stat(join(LAV_DIR, `${stem}.mov`))
    assert.ok(movSt.size > 40_000, `${stem}.mov should be valid encoded HEVC+Alpha mov (>40KB)`)
  }
  for (const poster of ['xiaojing_idle.png', 'xiaojing_desk.png', 'xiaojing_glance.png', 'xiaojing_sit.png']) {
    const buf = await readFile(join(LAV_DIR, poster))
    const dim = readPngDimensions(buf)
    assert.equal(dim.colorType, 6, `${poster} must be native RGBA`)
  }
})

test('M2 Focus UI: quiet-luxury de-tacky styling + multi-pose switcher + 3 touch hotspots', () => {
  const html = JING_FOCUS_MINIAPP_HTML
  // Tacky neon-blue button gradients must be completely gone!
  assert.doesNotMatch(html, /rgba\(14,\s*165,\s*233,\s*0\.92\)/, 'tacky neon-blue Start button gradient must be removed')
  assert.doesNotMatch(html, /linear-gradient\(135deg,\s*#38BDF8,\s*#2563EB\)/, 'tacky neon-blue Play button gradient must be removed')

  // Multi-pose (4 distinct body postures) & multi-zone LAV hooks present
  assert.match(html, /pomo-float/, 'must use frameless transparent on-demand Pomodoro float')
  assert.match(html, /immersive-pill/, 'must support tap-empty-space immersive collapse/expand')
  assert.match(html, /\.stage\.immersive \.immersive-pill\s*\{[^}]*display:\s*none\s*!important/, 'immersive-pill must remain hidden in pure immersive mode')
  assert.match(html, /hidden:\s*currentHeaderHidden/, 'syncHeader must forward hidden flag to host MiniApp header')
  assert.match(html, /syncHeader\(currentHeaderBg,\s*next\)/, 'setImmersive must toggle host MiniApp header visibility')
  assert.match(html, /\.stage\.immersive \.bg-scrim\s*\{[^}]*opacity:\s*0/, 'immersive mode must remove top dark scrim')
  assert.match(html, /function detectTopForeground\(/, 'must sample scene background top strip luminance for adaptive status bar color')
  assert.match(html, /xiaojing_desk\.webm/, 'must reference desk chin-rest pose LAV')
  assert.match(html, /xiaojing_glance\.webm/, 'must reference over-shoulder glance pose LAV')
  assert.match(html, /xiaojing_sit\.webm/, 'must reference cozy knees-up sit pose LAV')
  assert.match(html, /xiaojing_touch_body\.webm/, 'must reference body/hand touch reaction LAV')
  assert.match(html, /xiaojing_touch_tail\.webm/, 'must reference whale-tail touch reaction LAV')
  assert.match(html, /data-zone="head"/, 'must expose head touch hotspot')
  assert.match(html, /data-zone="body"/, 'must expose body/hands touch hotspot')
  assert.match(html, /data-zone="tail"/, 'must expose whale-tail touch hotspot')
  assert.match(html, /data-pose="desk"/, 'must expose desk posture selector')
  assert.match(html, /data-pose="glance"/, 'must expose glance posture selector')
  assert.match(html, /data-pose="sit"/, 'must expose sit posture selector')
})

test('Android WebView JPhoneBridge: bootstraps window.__jphoneMedia & window.__jphoneFocus and syncs playing state on re-entry', async () => {
  const vm = await import('node:vm')
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { createServer } = await import('node:http')
  const { JPhoneStore } = await import('../lib/store.mjs')
  const { createJPhoneHttpHandler } = await import('../lib/http.mjs')

  const dataDir = await mkdtemp(join(tmpdir(), 'jphone-webview-bridge-'))
  const store = await JPhoneStore.open(dataDir)
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator: {
      listMessages: () => [],
      getStatus: () => ({ ok: true }),
    },
    logger: { info() {}, warn() {}, error() {} },
  })
  const server = createServer((req, res) => handler(req, res))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    const res = await fetch(`http://127.0.0.1:${port}/jphone/miniapp/jing-focus`)
    assert.equal(res.status, 200)
    const html = await res.text()
    const m = /<script>([\s\S]*?)<\/script>/.exec(html)
    assert.ok(m, 'injected bridge script must be present in miniapp HTML')

    const posted = []
    const sandbox = {
      document: { readyState: 'complete', querySelector: () => null, addEventListener() {} },
      fetch: async () => ({ ok: true, json: async () => ({}) }),
      JPhoneBridge: {
        postMessage(raw) {
          posted.push(JSON.parse(raw))
        },
      },
    }
    sandbox.window = sandbox
    sandbox.window.parent = sandbox
    vm.runInNewContext(m[1], sandbox)

    assert.equal(sandbox.window.jing.audio.isHostSupported(), true, 'native WebView must report host audio supported')
    assert.ok(posted.some((p) => p.type === 'jphone:media:sync'), 'must request initial media sync on load')
    assert.ok(posted.some((p) => p.type === 'jphone:focus:sync'), 'must request initial focus sync on load')

    let notifiedCount = 0
    sandbox.window.jing.audio.subscribe(() => { notifiedCount += 1 })

    // Simulate Flutter native host hydrating currently-playing background music upon Mini-App re-entry
    sandbox.window.__jphoneNativeMediaPush({
      playing: true,
      hasActiveAudio: true,
      title: '雨的假设 A',
      subtitle: '混音: 小雨',
      sceneName: '深海雨夜',
      track: { id: 'lofi-rain-a', title: '雨的假设 A', subtitle: '回声重映集', url: '/jphone/media/focus/music/test.mp3' },
      noises: { rain: { id: 'rain', name: '小雨', volume: 0.6, active: true } },
      noiseCount: 1,
    })

    const hydrated = sandbox.window.jing.audio.getState()
    assert.equal(hydrated.playing, true, 're-entered Mini-App must see playing=true from native host')
    assert.equal(hydrated.hasActiveAudio, true)
    assert.equal(hydrated.track.id, 'lofi-rain-a')
    assert.equal(notifiedCount, 1)

    // Clicking play/pause toggles native host instead of layering audio
    sandbox.window.jing.audio.togglePlay()
    assert.equal(sandbox.window.jing.audio.getState().playing, false)
    assert.ok(posted.some((p) => p.type === 'jphone:media:togglePlay'))

    // Focus timer proxy works synchronously and posts to native host
    const focusSnap = sandbox.window.__jphoneFocus.toggle()
    assert.equal(focusSnap.running, true)
    assert.ok(posted.some((p) => p.type === 'jphone:focus:toggle'))
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(dataDir, { recursive: true, force: true })
  }
})
