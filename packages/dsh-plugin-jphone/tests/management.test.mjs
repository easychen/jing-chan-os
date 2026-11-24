import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'

test('P2 management APIs: memories CRUD, miniapp uninstall, KV inspector, workshop install/publish, console export', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p2-'))
  const store = await JPhoneStore.open(dir)
  const orchestrator = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })
  const broadcasts = []
  const handler = createJPhoneHttpHandler({
    store,
    orchestrator,
    wsHub: { broadcast: (m) => broadcasts.push(m) },
  })
  const server = http.createServer(async (req, res) => { await handler(req, res) })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  try {
    // 1. Memories CRUD
    const addMem = await fetch(`${base}/jphone/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '主人最喜欢喝冰美式' }),
    }).then((r) => r.json())
    assert.equal(addMem.ok, true)
    assert.ok(addMem.memory.id)

    const updMem = await fetch(`${base}/jphone/api/memories/${addMem.memory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '主人最喜欢喝燕麦拿铁' }),
    }).then((r) => r.json())
    assert.equal(updMem.ok, true)
    assert.equal(updMem.memory.text, '主人最喜欢喝燕麦拿铁')

    const delMem = await fetch(`${base}/jphone/api/memories/${addMem.memory.id}`, {
      method: 'DELETE',
    }).then((r) => r.json())
    assert.equal(delMem.ok, true)
    assert.ok(!delMem.memories.some((m) => m.id === addMem.memory.id))

    // 2. Workshop discover, install a downloadable Mini-App, then uninstall via Mini-Apps manager
    const wsList = await fetch(`${base}/jphone/api/workshop`).then((r) => r.json())
    assert.equal(wsList.ok, true)
    const downloadable = wsList.items.find((i) => i.kind === 'miniapp' && !i.installed)
    assert.ok(downloadable, 'should ship at least one downloadable miniapp in workshop catalog')

    const instRes = await fetch(`${base}/jphone/api/workshop/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: downloadable.id }),
    }).then((r) => r.json())
    assert.equal(instRes.ok, true)
    assert.ok(store.getMiniApp(downloadable.miniApp.id))

    // Publish custom item to workshop
    const pubRes = await fetch(`${base}/jphone/api/workshop/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'miniapp', title: '我的番茄钟', author: '本机创作者', description: '专注 25 分钟' }),
    }).then((r) => r.json())
    assert.equal(pubRes.ok, true)
    assert.equal(pubRes.item.title, '我的番茄钟')

    // Uninstall installed mini-app
    const uninst = await fetch(`${base}/jphone/api/miniapps/${downloadable.miniApp.id}`, {
      method: 'DELETE',
    }).then((r) => r.json())
    assert.equal(uninst.ok, true)
    assert.equal(store.getMiniApp(downloadable.miniApp.id), undefined)

    // 3. KV Database inspector & clear
    await store.setMiniAppKv('jing-notes', 'k1', { a: 1 })
    await store.setMiniAppKv('jing-notes', 'k2', { b: 2 })
    const kvAll = await fetch(`${base}/jphone/api/kv`).then((r) => r.json())
    assert.equal(kvAll.ok, true)
    assert.ok(kvAll.namespaces.some((n) => n.appId === 'jing-notes' && n.keys.length >= 2))

    await fetch(`${base}/jphone/api/kv/jing-notes/k1`, { method: 'DELETE' })
    assert.equal(store.getMiniAppKv('jing-notes', 'k1'), null)
    await fetch(`${base}/jphone/api/kv/jing-notes`, { method: 'DELETE' })
    assert.equal(store.listMiniAppKvKeys('jing-notes').length, 0)

    // 4. DSH Console info & backup export
    const info = await fetch(`${base}/jphone/api/console/info`).then((r) => r.json())
    assert.equal(info.ok, true)
    assert.equal(typeof info.stats.miniApps, 'number')
    assert.equal(typeof info.apiKeyConfigured, 'boolean')

    const exp = await fetch(`${base}/jphone/api/console/export`).then((r) => r.json())
    assert.equal(exp.ok, true)
    assert.ok(exp.backup.character)
  } finally {
    server.close()
    await rm(dir, { recursive: true, force: true })
  }
})
