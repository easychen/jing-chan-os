import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'

test('orchestrator uses real DSH sessionController.create({ workspaceId }) and prompt() for tasks & chat', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-real-dsh-'))
  const store = await JPhoneStore.open(dir)

  const calls = { create: [], prompt: [] }
  const mockSessionController = {
    async create(req) {
      calls.create.push(req)
      return { sessionId: `session-real-${calls.create.length}` }
    },
    async prompt(req, source) {
      calls.prompt.push({ req, source })
      return { accepted: true }
    },
  }
  const mockWorkspaceRegistry = {
    defaultWorkspaceId: 'ws-default-123',
    list() {
      return [{ id: 'ws-default-123', path: '/tmp/ws-default' }]
    },
  }

  const orch = new JPhoneOrchestrator({
    store,
    workspaceDir: join(dir, 'workspace'),
    skillsDir: null,
    sessionController: mockSessionController,
    workspaceRegistry: mockWorkspaceRegistry,
  })

  const task = await orch.dispatchTask({
    title: '检查当前工作区状态',
    prompt: '请列出当前目录文件并用一句话总结',
  })

  assert.equal(task.sessionId, 'session-real-1')
  assert.equal(calls.create.length, 1)
  assert.equal(calls.create[0].workspaceId, 'ws-default-123')
  assert.equal(calls.prompt.length, 1)
  assert.equal(calls.prompt[0].req.sessionId, 'session-real-1')
  assert.equal(calls.prompt[0].req.mode, 'queue')
  assert.equal(calls.prompt[0].req.content[0].text, '请列出当前目录文件并用一句话总结')

  const chatRes = await orch.sendChat('你好小鲸同学')
  assert.equal(chatRes.routedToDsh, true)
  assert.equal(chatRes.mainSessionId, 'session-real-2')
  assert.equal(calls.create.length, 2)
  assert.equal(calls.create[1].workspaceId, 'ws-default-123')
  assert.equal(calls.prompt.length, 2)
  assert.equal(calls.prompt[1].req.sessionId, 'session-real-2')
})
