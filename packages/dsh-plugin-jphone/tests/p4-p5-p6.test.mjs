import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator, JPHONE_WORKSPACE_TITLE } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'

test('P4 dedicated DSH workspace, AGENTS.md, daily chat rotation & OpenClaw/Hermes tiered memory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p4-'))
  try {
    const store = await JPhoneStore.open(dir)
    const wsDir = join(dir, 'workspace')
    const createdWorkspaces = []
    const createdSessions = []
    const renamedSessions = []
    const submittedPrompts = []

    const fakeWorkspaceRegistry = {
      defaultWorkspaceId: 'ws-default-do-not-use',
      async resolveByPath(p) {
        return createdWorkspaces.find((w) => w.path === p)
      },
      async create(p, title) {
        const ws = { id: 'ws-jphone-dedicated', path: p, title }
        createdWorkspaces.push(ws)
        return ws
      },
      list() {
        return [{ id: 'ws-default-do-not-use', path: '/tmp/default', title: 'Default workspace' }, ...createdWorkspaces]
      },
    }

    let seq = 0
    const fakeSessionController = {
      async create(req) {
        const sid = `session-day-${++seq}`
        createdSessions.push({ sid, ...req })
        return { sessionId: sid }
      },
      async rename({ sessionId, title }) {
        renamedSessions.push({ sessionId, title })
      },
      async prompt(req) {
        submittedPrompts.push(req)
      },
    }

    const orch = new JPhoneOrchestrator({
      store,
      workspaceDir: wsDir,
      sessionController: fakeSessionController,
      workspaceRegistry: fakeWorkspaceRegistry,
    })

    // 1. Dedicated workspace is created with proper title (never Default workspace!)
    await orch.ensureWorkspace()
    assert.equal(createdWorkspaces.length, 1)
    assert.equal(createdWorkspaces[0].title, JPHONE_WORKSPACE_TITLE)
    assert.equal(orch.jphoneWorkspaceId, 'ws-jphone-dedicated')

    // 2. Seed an old daily entry (> 7 days ago) + yesterday + today
    await orch.workspaceMemory.appendDailyEntry({
      role: 'user',
      text: '两周前的旧聊天记录，应该只进 INDEX.md 路径索引',
      dateKey: '2026-11-01',
    })
    await orch.sendChat('昨天的你好呀', { dateKey: '2026-11-22' })
    await orch.sendChat('今天继续聊呀', { dateKey: '2026-11-23' })
    await orch.sendChat('今天的第二句话', { dateKey: '2026-11-23' })

    // Verify daily session rotation: 2 distinct DSH sessions created in dedicated workspace!
    assert.equal(createdSessions.length, 2)
    assert.equal(createdSessions[0].workspaceId, 'ws-jphone-dedicated')
    assert.equal(createdSessions[1].workspaceId, 'ws-jphone-dedicated')
    assert.equal(renamedSessions[0].title, '小鲸同学 · 2026-11-22')
    assert.equal(renamedSessions[1].title, '小鲸同学 · 2026-11-23')

    // Verify first message of new day includes AGENTS.md + MEMORY.md + RECENT.md bootstrap, second message does NOT repeat it!
    assert.ok(submittedPrompts[1].content[0].text.includes('AGENTS.md'))
    assert.ok(!submittedPrompts[2].content[0].text.includes('--- AGENTS.md ---'))

    // Verify OpenClaw/Hermes tiered memory files!
    const agentsMd = await readFile(join(wsDir, 'AGENTS.md'), 'utf8')
    const recentMd = await readFile(join(wsDir, 'memory', 'RECENT.md'), 'utf8')
    const indexMd = await readFile(join(wsDir, 'memory', 'INDEX.md'), 'utf8')
    assert.ok(agentsMd.includes('小鲸同学'))
    assert.ok(recentMd.includes('2026-11-23'))
    assert.ok(recentMd.includes('今天继续聊呀'))
    assert.ok(!recentMd.includes('两周前的旧聊天记录'))
    assert.ok(indexMd.includes('memory/daily/2026-11-01.md'))
    assert.ok(!indexMd.includes('两周前的旧聊天记录')) // path-only archive!

    // 3. Verify HTTP endpoints for workspace files, AGENTS.md edit, 小鲸专注 Mini-App & LAV POC!
    const handler = createJPhoneHttpHandler({ store, orchestrator: orch, webDistDir: dir })
    const server = createServer((req, res) => void handler(req, res))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${server.address().port}`
    try {
      // Pre-installed 小鲸专注 exists
      const stRes = await (await fetch(`${base}/jphone/api/state`)).json()
      assert.ok(stRes.miniApps.some((m) => m.id === 'jing-focus' && m.name === '小鲸专注'))

      // Workspace files + AGENTS.md update
      const wf1 = await (await fetch(`${base}/jphone/api/workspace/files`)).json()
      assert.equal(wf1.ok, true)
      assert.equal(wf1.workspaceId, 'ws-jphone-dedicated')
      assert.ok(wf1.dailyFiles.length >= 3)

      const putRes = await (await fetch(`${base}/jphone/api/workspace/agents`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: '# Custom AGENTS.md\n请叫我船长！' }),
      })).json()
      assert.equal(putRes.ok, true)
      const wf2 = await (await fetch(`${base}/jphone/api/workspace/files`)).json()
      assert.ok(wf2.agentsMd.includes('请叫我船长'))

      // LAV POC HTML route
      const pocRes = await fetch(`${base}/jphone/poc/lav/`)
      assert.equal(pocRes.status, 200)
      const pocHtml = await pocRes.text()
      assert.ok(pocHtml.includes('Native VP9+Alpha'))
    } finally {
      server.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('P7 bridge exposes window.jing.ui.setHeaderStyle, scrollbar polish, and LAV hotspot video-rect alignment', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p7-'))
  const store = await JPhoneStore.open(dir)
  const port = 33000 + Math.floor(Math.random() * 10000)
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator: { async sendChat() { return {} }, async dispatchTask() { return {} } },
    voice: { async voiceTurn() { return { ok: true } }, async tts() { return { ok: true } }, async generateDiary() { return { ok: true } } },
    getWebDistDir: () => null,
    getToken: () => 'tok',
  })
  const server = createServer((req, res) => handler(req, res))
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  try {
    const focusRes = await fetch(`http://127.0.0.1:${port}/jphone/miniapp/jing-focus`)
    assert.equal(focusRes.status, 200)
    const focusHtml = await focusRes.text()
    assert.match(focusHtml, /setHeaderStyle/)
    assert.match(focusHtml, /jphone-scrollbar-polish/)
    assert.match(focusHtml, /jphone-header-bg/)

    const lavRes = await fetch(`http://127.0.0.1:${port}/jphone/poc/lav/`)
    assert.equal(lavRes.status, 200)
    const lavHtml = await lavRes.text()
    assert.match(lavHtml, /syncHotspotRect/)
  } finally {
    await new Promise((r) => server.close(r))
    await rm(dir, { recursive: true, force: true })
  }
})

test('P8 chat attachments upload/serve, 小鲸同学 LAV webm assets, and window.jing.audio host bridge', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p8-'))
  const store = await JPhoneStore.open(dir)
  const wsDir = join(dir, 'workspace')
  const orchestrator = new JPhoneOrchestrator({
    store,
    dshCtx: { workspaceRegistry: { resolveByPath: () => null, create: () => ({ id: 'ws-p8' }) } },
    workspaceDir: wsDir,
  })
  const port = 33000 + Math.floor(Math.random() * 10000)
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator,
    characterAssetsDir: fileURLToPath(new URL('../assets/character', import.meta.url)),
    getWebDistDir: () => null,
    getToken: () => 'tok',
  })
  const server = createServer((req, res) => handler(req, res))
  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  try {
    // 1. Send chat with a text attachment
    const sampleB64 = Buffer.from('# Hello JPhone Attachment\nLine 2', 'utf8').toString('base64')
    const chatRes = await fetch(`http://127.0.0.1:${port}/jphone/api/chat/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: '请看附件',
        attachments: [{ name: 'notes.md', mimeType: 'text/markdown', dataBase64: sampleB64 }],
      }),
    })
    assert.equal(chatRes.status, 200)
    const chatData = await chatRes.json()
    assert.equal(chatData.ok, true)
    assert.equal(chatData.userMsg.attachments.length, 1)
    const attUrl = chatData.userMsg.attachments[0].url
    const fetchAtt = await fetch(`http://127.0.0.1:${port}${attUrl}`)
    assert.equal(fetchAtt.status, 200)
    assert.match(await fetchAtt.text(), /Hello JPhone Attachment/)

    // 2. Verify Focus Mini-App v2 has window.jing.audio bridge & 小鲸同学 LAV webm
    const focusHtml = await (await fetch(`http://127.0.0.1:${port}/jphone/miniapp/jing-focus`)).text()
    assert.match(focusHtml, /window\.jing =/)
    assert.match(focusHtml, /__jphoneMedia/)
    assert.match(focusHtml, /xiaojing_idle\.webm/)

    // 3. Verify 小鲸同学 VP9+Alpha LAV webm & rainy_ocean backdrop are served
    const lavHead = await fetch(`http://127.0.0.1:${port}/jphone/media/lav/xiaojing/xiaojing_idle.webm`, { method: 'HEAD' })
    assert.equal(lavHead.status, 200)
    const bgHead = await fetch(`http://127.0.0.1:${port}/jphone/media/focus/bg/rainy_ocean.jpg`, { method: 'HEAD' })
    assert.equal(bgHead.status, 200)
  } finally {
    await new Promise((r) => server.close(r))
    await rm(dir, { recursive: true, force: true })
  }
})
