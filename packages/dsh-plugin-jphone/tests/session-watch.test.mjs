import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JPhoneStore } from '../lib/store.mjs'
import { createSessionWatcher, describeToolCall } from '../lib/session-watch.mjs'

test('describeToolCall converts native DSH tool calls into playful safe captions', () => {
  assert.equal(describeToolCall('read_file', { path: '/src/app/index.ts' }), '翻翻 index.ts 看看嘛')
  assert.equal(describeToolCall('edit_file', { file_path: '/a/b/desktop_page.dart' }), '正在改 desktop_page.dart 啦')
  assert.equal(describeToolCall('bash', { command: 'npm test --watch' }), '跑一下 npm test 咯')
  assert.equal(describeToolCall('bash', { command: 'git push origin main' }), '准备推上去了，我来看着～')
})

test('createSessionWatcher folds DSH session/event stream into live working -> happy -> idle transitions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-watch-'))
  const store = await JPhoneStore.open(dir)
  const broadcasts = []
  const wsHub = { broadcast: (m) => broadcasts.push(m) }
  const watcher = createSessionWatcher({ store, wsHub, celebrateMs: 60 })

  watcher.handleSessionEvent({ header: { id: 'sess-1' } }, { type: 'turn/start' })
  await new Promise((r) => setTimeout(r, 15))
  assert.equal(store.data.mood, 'working')

  watcher.handleSessionEvent(
    { header: { id: 'sess-1' } },
    { type: 'tool/call', data: { callId: 'c1', name: 'edit_file', arguments: { path: '/repo/client.js' } } },
  )
  await new Promise((r) => setTimeout(r, 15))
  assert.equal(store.data.mood, 'working')
  assert.equal(store.data.moodText, '正在改 client.js 啦')

  watcher.handleSessionEvent(
    { header: { id: 'sess-1' } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
  )
  await new Promise((r) => setTimeout(r, 15))
  assert.equal(store.data.mood, 'happy')
  assert.ok(broadcasts.some((b) => b.type === 'character:mood' && b.bubble && b.bubble.includes('搞定啦')))

  await new Promise((r) => setTimeout(r, 90))
  assert.equal(store.data.mood, 'idle')
  watcher.dispose()
})

test('createSessionWatcher extracts DSH v4 data.message.content into task summary', async () => {
  let latestTask = { taskId: 't1', sessionId: 'session-v4', title: '巡检', status: 'running', summary: '' }
  const store = {
    data: { mood: 'idle', mainSessionId: 'session-main', tasks: [latestTask] },
    listTasks() { return [latestTask] },
    async setMood(m) { this.data.mood = m },
    async upsertTask(t) { latestTask = t; return t },
    async appendFallbackMessage() {},
  }
  const wsHub = { broadcast() {} }
  const watcher = createSessionWatcher({ store, wsHub, celebrateMs: 50 })
  watcher.handleSessionEvent(
    { header: { id: 'session-v4' } },
    {
      type: 'assistant/message',
      data: {
        message: {
          role: 'assistant',
          content: [
            { type: 'reasoning', text: 'thinking' },
            { type: 'text', text: 'Hello 小鲸同学，工作区一切正常！' },
          ],
        },
      },
    },
  )
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(latestTask.summary, 'Hello 小鲸同学，工作区一切正常！')
  watcher.dispose()
})
