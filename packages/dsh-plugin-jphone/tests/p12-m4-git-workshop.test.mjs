import { existsSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

import { JPhoneStore } from '../lib/store.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import {
  validateWorkshopManifest,
  parseGitRepoUrl,
  fetchWorkshopIndex,
  inspectGitPackage,
  installGitPackage,
} from '../lib/workshop.mjs'

test('M4 Workshop: manifest validation & Git URL parsing (GitHub + Gitee + subdir)', () => {
  const ok = validateWorkshopManifest({
    id: 'ocean-weather',
    name: '深海气象台',
    type: 'miniapp',
    version: '1.0.0',
    entry: 'index.html',
    permissions: ['storage', 'ui.notify'],
    author: 'easychen',
    description: '实时深海潮汐与天气卡片',
  })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.manifest.permissions, ['storage', 'ui.notify'])

  const badTraversal = validateWorkshopManifest({
    id: 'evil',
    name: 'Evil',
    type: 'miniapp',
    version: '1.0.0',
    entry: '../etc/passwd',
  })
  assert.equal(badTraversal.ok, false)

  const badType = validateWorkshopManifest({
    id: 'x',
    name: 'X',
    type: 'kernel-rootkit',
    version: '1.0.0',
    entry: 'index.html',
  })
  assert.equal(badType.ok, false)

  const gh = parseGitRepoUrl('https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water-tracker')
  assert.equal(gh.provider, 'github')
  assert.equal(gh.owner, 'easychen')
  assert.equal(gh.repo, 'jing-chan-os')
  assert.equal(gh.branch, 'main')
  assert.equal(gh.subpath, 'workshop/packages/water-tracker')
  assert.equal(
    gh.rawUrl('manifest.json'),
    'https://raw.githubusercontent.com/easychen/jing-chan-os/main/workshop/packages/water-tracker/manifest.json'
  )

  const gitee = parseGitRepoUrl('https://gitee.com/easychen/jing-chan-os')
  assert.equal(gitee.provider, 'gitee')
  assert.equal(
    gitee.rawUrl('index.json'),
    'https://gitee.com/easychen/jing-chan-os/raw/main/index.json'
  )
})

test('M4 Workshop: GitHub primary -> Gitee mirror -> offline cache fallback', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m4-idx-'))
  try {
    const sampleIndex = {
      schemaVersion: 1,
      updatedAt: '2026-11-24T00:00:00Z',
      items: [
        {
          id: 'gh-water-tracker',
          name: '深海饮水记录',
          type: 'miniapp',
          version: '1.0.0',
          author: 'easychen',
          repo: 'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water-tracker',
          description: '记录每天 8 杯水',
          permissions: ['storage', 'ui.notify'],
        },
      ],
    }

    // 1. GitHub succeeds -> source = 'github' + writes cache
    const resGh = await fetchWorkshopIndex({
      cacheDir: dir,
      forceRefresh: true,
      useGhCli: false,
      fetchImpl: async (url) => {
        if (String(url).includes('raw.githubusercontent.com')) {
          return new Response(JSON.stringify(sampleIndex), { status: 200 })
        }
        throw new Error('should not hit mirror')
      },
    })
    assert.equal(resGh.source, 'github')
    assert.equal(resGh.items.length, 1)
    assert.equal(resGh.items[0].id, 'gh-water-tracker')

    // 2. GitHub fails, Gitee succeeds -> source = 'gitee'
    const resGitee = await fetchWorkshopIndex({
      cacheDir: dir,
      forceRefresh: true,
      useGhCli: false,
      fetchImpl: async (url) => {
        if (String(url).includes('gitee.com')) {
          return new Response(JSON.stringify(sampleIndex), { status: 200 })
        }
        return new Response('down', { status: 503 })
      },
    })
    assert.equal(resGitee.source, 'gitee')
    assert.equal(resGitee.items[0].id, 'gh-water-tracker')

    // 3. Both network sources fail -> source = 'cache' (served from cached file!)
    const resCache = await fetchWorkshopIndex({
      cacheDir: dir,
      forceRefresh: true,
      useGhCli: false,
      fetchImpl: async () => { throw new Error('offline') },
    })
    assert.equal(resCache.source, 'cache')
    assert.equal(resCache.items[0].id, 'gh-water-tracker')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M4 Workshop: inspect-git permission preview + install-git Mini-App & Skill over HTTP', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m4-http-'))
  const skillsDir = join(dir, 'skills')
  try {
    const store = await JPhoneStore.open(dir)
    const mockGitFetch = async (url) => {
      const s = String(url)
      if (s.endsWith('/packages/water/manifest.json')) {
        return new Response(JSON.stringify({
          id: 'water-tracker',
          name: '深海喝水打卡',
          type: 'miniapp',
          version: '1.1.0',
          entry: 'index.html',
          icon: 'droplets',
          color: '#0EA5E9',
          author: 'easychen',
          description: '每天 8 杯水健康打卡',
          permissions: ['storage', 'ui.notify'],
        }), { status: 200 })
      }
      if (s.endsWith('/packages/water/index.html')) {
        return new Response('<!doctype html><html><body><h1>深海喝水打卡</h1></body></html>', { status: 200 })
      }
      if (s.endsWith('/packages/daily-brief-skill/manifest.json')) {
        return new Response(JSON.stringify({
          id: 'daily-brief',
          name: '每日早报整理 Skill',
          type: 'skill',
          version: '1.0.0',
          entry: 'SKILL.md',
          author: 'easychen',
          description: '整理科技早报并生成摘要',
          permissions: [],
        }), { status: 200 })
      }
      if (s.endsWith('/packages/daily-brief-skill/SKILL.md')) {
        return new Response('---\nname: daily-brief\ndescription: 整理科技早报\n---\n# Daily Brief\n', { status: 200 })
      }
      return new Response('not found', { status: 404 })
    }

    const inspect = await inspectGitPackage(
      'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water',
      { fetchImpl: mockGitFetch, useGhCli: false }
    )
    assert.equal(inspect.ok, true)
    assert.equal(inspect.manifest.id, 'water-tracker')
    assert.deepEqual(inspect.permissions, ['storage', 'ui.notify'])

    const instApp = await installGitPackage(
      'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water',
      { store, skillsDir, fetchImpl: mockGitFetch, useGhCli: false }
    )
    assert.equal(instApp.ok, true)
    assert.equal(instApp.type, 'miniapp')
    const app = store.getMiniApp('water-tracker')
    assert.ok(app)
    assert.match(app.html, /深海喝水打卡/)
    assert.deepEqual(app.permissions, ['storage', 'ui.notify'])

    const instSkill = await installGitPackage(
      'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/daily-brief-skill',
      { store, skillsDir, fetchImpl: mockGitFetch, useGhCli: false }
    )
    assert.equal(instSkill.ok, true)
    assert.equal(instSkill.type, 'skill')
    const skillMd = await readFile(join(skillsDir, 'daily-brief', 'SKILL.md'), 'utf8')
    assert.match(skillMd, /Daily Brief/)

    // Verify HTTP API endpoints
    const handler = createJPhoneHttpHandler({
      store,
      orchestrator: { skillsDir },
      workshopOptions: { fetchImpl: mockGitFetch, useGhCli: false, cacheDir: dir },
    })
    const srv = createServer(handler)
    await new Promise((r) => srv.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${srv.address().port}`
    try {
      const r1 = await fetch(`${base}/jphone/api/workshop/inspect-git`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repoUrl: 'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water' }),
      }).then((r) => r.json())
      assert.equal(r1.ok, true)
      assert.equal(r1.manifest.id, 'water-tracker')

      const r2 = await fetch(`${base}/jphone/api/workshop/install-git`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repoUrl: 'https://github.com/easychen/jing-chan-os/tree/main/workshop/packages/water' }),
      }).then((r) => r.json())
      assert.equal(r2.ok, true)
      assert.equal(r2.type, 'miniapp')
    } finally {
      srv.close()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M4 Skill: official jphone-workshop-publisher SKILL.md exists', async () => {
  const bundledSkill = join(import.meta.dirname, '../skills/jphone-workshop-publisher/SKILL.md')
  const skillPath = existsSync(bundledSkill) ? bundledSkill : join(import.meta.dirname, '../../../skills/jphone-workshop-publisher/SKILL.md')
  const st = await stat(skillPath)
  assert.ok(st.size > 400)
  const md = await readFile(skillPath, 'utf8')
  assert.match(md, /manifest\.json/)
  assert.match(md, /easychen\/jing-chan-os/)
})
