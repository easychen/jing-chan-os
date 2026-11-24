import { existsSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import { encodeWsTextFrame, decodeWsFrames } from '../lib/ws.mjs'


const PLUGIN_SKILLS_DIR = existsSync(join(import.meta.dirname, '../skills'))
  ? join(import.meta.dirname, '../skills')
  : join(import.meta.dirname, '../../../skills')
const PLUGIN_CHAR_DIR = existsSync(join(import.meta.dirname, '../assets/character'))
  ? join(import.meta.dirname, '../assets/character')
  : join(import.meta.dirname, '../../../assets/character')

test('ws frame encode and decode roundtrip (small and medium payloads)', () => {
  for (const payload of ['hello 小鲸同学', 'x'.repeat(300)]) {
    const encoded = encodeWsTextFrame(payload)
    const { frames, remaining } = decodeWsFrames(encoded)
    assert.equal(remaining.length, 0)
    assert.equal(frames.length, 1)
    assert.equal(frames[0].opcode, 0x1)
    assert.equal(frames[0].payload.toString('utf8'), payload)
  }
})

test('store persists mood, mini-apps, window.jing KV, and memory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-store-'))
  try {
    const store = await JPhoneStore.open(dir)
    assert.equal(store.getState().character.name, '小鲸同学')
    assert.ok(store.listMiniApps().length >= 1, 'ships built-in demo mini-app')

    await store.setMood('happy', '刚刚学会一个新技能！')
    assert.equal(store.getState().mood, 'happy')

    await store.setMiniAppKv('jing-notes', 'note_1', { text: '记得喝水' })
    assert.deepEqual(store.getMiniAppKv('jing-notes', 'note_1'), { text: '记得喝水' })

    // Reload from disk to verify persistence
    const reloaded = await JPhoneStore.open(dir)
    assert.equal(reloaded.getState().mood, 'happy')
    assert.deepEqual(reloaded.getMiniAppKv('jing-notes', 'note_1'), { text: '记得喝水' })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('orchestrator dispatches non-blocking worker session into native DSH workspace', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-orch-'))
  try {
    const store = await JPhoneStore.open(dir)
    const createdSessions = []
    const followups = []
    const fakeSessionController = {
      async createSession(req) {
        const sessionId = `sess-${createdSessions.length + 1}`
        createdSessions.push({ sessionId, ...req })
        return { sessionId }
      },
      async resolveAgent(sessionId) {
        return {
          id: sessionId,
          followup(msg) { followups.push({ sessionId, msg }) },
          steer(msg) { followups.push({ sessionId, steer: true, msg }) },
        }
      },
    }

    const orch = new JPhoneOrchestrator({
      store,
      workspaceDir: join(dir, 'workspace'),
      skillsDir: PLUGIN_SKILLS_DIR,
      sessionController: fakeSessionController,
    })

    const task = await orch.dispatchTask({
      title: '配置内网穿透',
      prompt: '请帮我配置 cloudflared 指向 3189',
    })

    assert.equal(task.status, 'running')
    assert.equal(task.sessionId, 'sess-1')
    assert.equal(createdSessions[0].agentPreset, 'standard')
    assert.equal(followups.length, 1)
    assert.equal(orch.listTasks().length, 1)

    const skills = await orch.listSkills()
    assert.ok(skills.some(s => s.name === 'jphone-miniapp-builder'))
    assert.ok(skills.some(s => s.name === 'jphone-remote-tunnel'))
    assert.ok(skills.some(s => s.name === 'jphone-asset-creator'))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('http API serves state, chat, tasks, and window.jing miniapp KV over local server', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-http-'))
  try {
    const store = await JPhoneStore.open(dir)
    const orch = new JPhoneOrchestrator({
      store,
      workspaceDir: join(dir, 'workspace'),
      skillsDir: PLUGIN_SKILLS_DIR,
    })
    const handler = createJPhoneHttpHandler({
      store,
      orchestrator: orch,
      webDistDir: join(dir, 'empty-web-dist'),
      characterAssetsDir: PLUGIN_CHAR_DIR,
    })

    const server = http.createServer((req, res) => handler(req, res))
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`

    try {
      const health = await fetch(`${base}/jphone/api/health`).then(r => r.json())
      assert.equal(health.ok, true)
      assert.equal(health.product, 'JPhone')

      const state = await fetch(`${base}/jphone/api/state`).then(r => r.json())
      assert.equal(state.character.name, '小鲸同学')

      const sendRes = await fetch(`${base}/jphone/api/chat/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '你好呀小鲸同学' }),
      }).then(r => r.json())
      assert.equal(sendRes.ok, true)
      assert.ok(sendRes.reply.text.length > 0)

      const kvPut = await fetch(`${base}/jphone/api/miniapps/jing-notes/kv/demo`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: { count: 42 } }),
      }).then(r => r.json())
      assert.equal(kvPut.ok, true)

      const kvGet = await fetch(`${base}/jphone/api/miniapps/jing-notes/kv/demo`).then(r => r.json())
      assert.deepEqual(kvGet.value, { count: 42 })
    } finally {
      server.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('store handles rapid concurrent save calls without ENOENT rename collisions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-store-race-'))
  try {
    const store = await JPhoneStore.open(dir)
    await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        i % 2 === 0
          ? store.setMood('working', `step-${i}`)
          : store.upsertTask({ taskId: `t-${i}`, sessionId: `s-${i}`, title: `T${i}`, status: 'running' })
      )
    )
    const reloaded = await JPhoneStore.open(dir)
    assert.ok(reloaded.listTasks().length === 12)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
