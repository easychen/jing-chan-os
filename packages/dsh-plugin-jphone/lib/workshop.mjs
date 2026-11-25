import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const DEFAULT_INDEX_OWNER = 'easychen'
export const DEFAULT_INDEX_REPO = 'jing-chan-os'
export const DEFAULT_INDEX_BRANCH = 'main'
export const DEFAULT_INDEX_SUBPATH = 'workshop'

export const ALLOWED_TYPES = new Set(['miniapp', 'skill', 'wallpaper', 'character'])
export const ALLOWED_PERMISSIONS = new Set([
  'storage',
  'chat.ask',
  'tasks.dispatch',
  'ui.notify',
  'ui.header',
  'audio.host',
  'notify.push',
  'memories.read',
])

export const PERMISSION_LABELS = {
  storage: '本应用独立数据存储（KV）',
  'chat.ask': '向小鲸同学发起对话提问',
  'tasks.dispatch': '在 DeepSeek Harness 派发后台任务',
  'ui.notify': '发送桌面气泡通知',
  'ui.header': '自定义顶栏配色',
  'audio.host': '控制后台白噪音/Lo-Fi 播放',
  'notify.push': '触发 Server酱手机推送',
  'memories.read': '读取小鲸记忆摘要',
}

function isSafeRelPath(p) {
  const s = String(p || '').trim()
  if (!s || s.startsWith('/') || s.startsWith('\\') || s.includes('..') || s.includes('\0')) {
    return false
  }
  return /^[a-zA-Z0-9._/-]+$/.test(s)
}

export function validateWorkshopManifest(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'manifest must be a JSON object' }
  }
  const id = String(raw.id || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
  if (!id || id.length < 2 || id.length > 64) {
    return { ok: false, error: 'invalid manifest.id' }
  }
  const name = String(raw.name || raw.title || '').trim()
  if (!name) return { ok: false, error: 'missing manifest.name' }

  const type = String(raw.type || raw.kind || '').trim().toLowerCase()
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, error: `unsupported manifest.type: ${type}` }
  }

  const version = String(raw.version || '1.0.0').trim()
  const defaultEntry = type === 'skill' ? 'SKILL.md' : (type === 'character' ? 'character.json' : 'index.html')
  const entry = String(raw.entry || defaultEntry).trim()
  if (!isSafeRelPath(entry)) {
    return { ok: false, error: `unsafe manifest.entry path: ${entry}` }
  }

  const rawPerms = Array.isArray(raw.permissions) ? raw.permissions : (type === 'miniapp' ? ['storage'] : [])
  const permissions = []
  const warnings = []
  for (const p of rawPerms) {
    const clean = String(p || '').trim()
    if (!clean) continue
    if (!ALLOWED_PERMISSIONS.has(clean)) {
      return { ok: false, error: `unknown permission: ${clean}` }
    }
    if (!permissions.includes(clean)) permissions.push(clean)
    if (clean === 'tasks.dispatch' || clean === 'notify.push') {
      warnings.push(`该扩展申请了敏感权限：${PERMISSION_LABELS[clean] || clean}`)
    }
  }

  return {
    ok: true,
    manifest: {
      id,
      name,
      type,
      version,
      entry,
      icon: String(raw.icon || (type === 'skill' ? 'wrench' : (type === 'wallpaper' ? 'image' : 'sparkles'))),
      color: String(raw.color || '#007AFF'),
      author: String(raw.author || 'community'),
      description: String(raw.description || '').trim(),
      permissions,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 8) : [],
    },
    permissions,
    warnings,
  }
}

export function parseGitRepoUrl(input) {
  const raw = String(input || '').trim().replace(/\.git$/, '').replace(/\/+$/, '')
  if (!raw) return null

  // Shorthand owner/repo
  const shortMatch = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(raw)
  if (shortMatch) {
    return buildGitRef('github', shortMatch[1], shortMatch[2], 'main', '')
  }

  let u
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase()
  let provider = null
  if (host === 'github.com' || host === 'www.github.com') provider = 'github'
  else if (host === 'gitee.com' || host === 'www.gitee.com') provider = 'gitee'
  else return null

  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (parts.length < 2) return null
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/, '')
  let branch = 'main'
  let subpath = ''
  if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
    branch = parts[3]
    subpath = parts.slice(4).join('/')
  }
  return buildGitRef(provider, owner, repo, branch, subpath)
}

function buildGitRef(provider, owner, repo, branch, subpath) {
  const cleanSub = String(subpath || '').replace(/^\/+|\/+$/g, '')
  const joinRel = (file) => (cleanSub ? `${cleanSub}/${file}` : file)
  return {
    provider,
    owner,
    repo,
    branch: branch || 'main',
    subpath: cleanSub,
    repoUrl: cleanSub
      ? `https://${provider}.com/${owner}/${repo}/tree/${branch || 'main'}/${cleanSub}`
      : `https://${provider}.com/${owner}/${repo}`,
    relPath: joinRel,
    rawUrl(file) {
      const fp = joinRel(file)
      if (provider === 'gitee') {
        return `https://gitee.com/${owner}/${repo}/raw/${branch || 'main'}/${fp}`
      }
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${fp}`
    },
  }
}

async function fetchViaGhCli(parsed, file) {
  const fp = parsed.relPath(file)
  const apiPath = `repos/${parsed.owner}/${parsed.repo}/contents/${fp}?ref=${encodeURIComponent(parsed.branch)}`
  const { stdout } = await execFileAsync('gh', ['api', apiPath, '-H', 'Accept: application/vnd.github.raw+json'], {
    timeout: 8000,
    maxBuffer: 4 * 1024 * 1024,
  })
  return stdout
}

export async function fetchGitTextFile(parsed, file, { fetchImpl = fetch, useGhCli = true } = {}) {
  const url = parsed.rawUrl(file)
  try {
    const res = await fetchImpl(url, {
      headers: { 'user-agent': 'JingPhone-Workshop/1.0' },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(4000) : undefined,
    })
    if (res.ok) {
      return await res.text()
    }
  } catch {}

  if (useGhCli && parsed.provider === 'github') {
    try {
      return await fetchViaGhCli(parsed, file)
    } catch {}
  }
  throw new Error(`Unable to fetch ${file} from ${parsed.repoUrl}`)
}

async function fetchViaGhCliBinary(parsed, file) {
  const fp = parsed.relPath(file)
  const apiPath = `repos/${parsed.owner}/${parsed.repo}/contents/${fp}?ref=${encodeURIComponent(parsed.branch)}`
  const { stdout } = await execFileAsync('gh', ['api', apiPath, '-H', 'Accept: application/vnd.github.raw+json'], {
    timeout: 15000,
    maxBuffer: 42 * 1024 * 1024,
    encoding: 'buffer',
  })
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout)
}

export async function fetchGitBinaryFile(parsed, file, { fetchImpl = fetch, useGhCli = true } = {}) {
  if (!isSafeRelPath(file)) {
    throw new Error(`unsafe asset path: ${file}`)
  }
  const url = parsed.rawUrl(file)
  try {
    const res = await fetchImpl(url, {
      headers: { 'user-agent': 'JingPhone-Workshop/1.0' },
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(12000) : undefined,
    })
    if (res.ok) {
      const ab = await res.arrayBuffer()
      return Buffer.from(ab)
    }
  } catch {}

  if (useGhCli && parsed.provider === 'github') {
    try {
      return await fetchViaGhCliBinary(parsed, file)
    } catch {}
  }
  throw new Error(`Unable to fetch binary ${file} from ${parsed.repoUrl}`)
}

const memCache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000

export async function fetchWorkshopIndex({
  owner = DEFAULT_INDEX_OWNER,
  repo = DEFAULT_INDEX_REPO,
  branch = DEFAULT_INDEX_BRANCH,
  subpath,
  cacheDir = '',
  forceRefresh = false,
  fetchImpl = fetch,
  useGhCli = true,
} = {}) {
  const resolvedSubpath = subpath !== undefined
    ? String(subpath || '').replace(/^\/+|\/+$/g, '')
    : (repo === DEFAULT_INDEX_REPO ? DEFAULT_INDEX_SUBPATH : '')
  const cacheKey = `${owner}/${repo}@${branch}/${resolvedSubpath}:${cacheDir}`
  if (!forceRefresh) {
    const hit = memCache.get(cacheKey)
    if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
      return hit.result
    }
  }

  const cacheFile = cacheDir ? join(cacheDir, 'workshop-index-cache.json') : ''
  const ghRef = buildGitRef('github', owner, repo, branch, resolvedSubpath)
  const giteeRef = buildGitRef('gitee', owner, repo, branch, resolvedSubpath)

  const normalizeIndex = (parsedJson, source) => {
    const items = Array.isArray(parsedJson?.items) ? parsedJson.items : []
    return {
      ok: true,
      source,
      indexRepo: `https://github.com/${owner}/${repo}`,
      mirrorRepo: `https://gitee.com/${owner}/${repo}`,
      updatedAt: parsedJson?.updatedAt || new Date().toISOString(),
      items: items.map((it) => ({
        id: String(it.id || ''),
        kind: String(it.type || it.kind || 'miniapp'),
        type: String(it.type || it.kind || 'miniapp'),
        title: String(it.name || it.title || it.id || ''),
        name: String(it.name || it.title || it.id || ''),
        version: String(it.version || '1.0.0'),
        author: String(it.author || 'community'),
        description: String(it.description || ''),
        icon: String(it.icon || 'sparkles'),
        color: String(it.color || '#007AFF'),
        repo: String(it.repo || ''),
        permissions: Array.isArray(it.permissions) ? it.permissions : ['storage'],
        tags: Array.isArray(it.tags) ? it.tags : [],
        downloads: Number(it.downloads || 0),
        ...((String(it.type || it.kind || 'miniapp') === 'miniapp')
          ? { miniApp: { id: String(it.id || ''), name: String(it.name || it.title || it.id || ''), icon: String(it.icon || 'sparkles'), color: String(it.color || '#007AFF') } }
          : {}),
      })),
    }
  }

  const writeDiskCache = async (rawJson) => {
    if (!cacheFile) return
    try {
      await mkdir(cacheDir, { recursive: true })
      await writeFile(cacheFile, JSON.stringify(rawJson, null, 2), 'utf8')
    } catch {}
  }

  // 1. Try GitHub primary
  try {
    const txt = await fetchGitTextFile(ghRef, 'index.json', { fetchImpl, useGhCli })
    const data = JSON.parse(txt)
    await writeDiskCache(data)
    const result = normalizeIndex(data, 'github')
    memCache.set(cacheKey, { fetchedAt: Date.now(), result })
    return result
  } catch {}

  // 2. Try Gitee mirror
  try {
    const txt = await fetchGitTextFile(giteeRef, 'index.json', { fetchImpl, useGhCli: false })
    const data = JSON.parse(txt)
    await writeDiskCache(data)
    const result = normalizeIndex(data, 'gitee')
    memCache.set(cacheKey, { fetchedAt: Date.now(), result })
    return result
  } catch {}

  // 3. Fallback to disk cache
  if (cacheFile) {
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8'))
      const result = normalizeIndex(cached, 'cache')
      memCache.set(cacheKey, { fetchedAt: Date.now(), result })
      return result
    } catch {}
  }

  return {
    ok: true,
    source: 'local',
    indexRepo: `https://github.com/${owner}/${repo}`,
    mirrorRepo: `https://gitee.com/${owner}/${repo}`,
    updatedAt: new Date().toISOString(),
    items: [],
  }
}

export async function inspectGitPackage(repoUrl, { fetchImpl = fetch, useGhCli = true } = {}) {
  const parsed = parseGitRepoUrl(repoUrl)
  if (!parsed) {
    return { ok: false, error: '无效的 Git 仓库地址（支持 GitHub / Gitee 链接或 owner/repo）' }
  }
  let rawManifest
  try {
    const txt = await fetchGitTextFile(parsed, 'manifest.json', { fetchImpl, useGhCli })
    rawManifest = JSON.parse(txt)
  } catch (err) {
    return { ok: false, error: `未找到有效的 manifest.json：${err instanceof Error ? err.message : String(err)}` }
  }
  const validated = validateWorkshopManifest(rawManifest)
  if (!validated.ok) return validated
  return {
    ok: true,
    repoUrl: parsed.repoUrl,
    provider: parsed.provider,
    manifest: validated.manifest,
    permissions: validated.permissions,
    permissionDetails: validated.permissions.map((p) => ({ id: p, label: PERMISSION_LABELS[p] || p })),
    warnings: validated.warnings,
  }
}

export async function installGitPackage(repoUrl, { store, skillsDir = '', fetchImpl = fetch, useGhCli = true } = {}) {
  const inspected = await inspectGitPackage(repoUrl, { fetchImpl, useGhCli })
  if (!inspected.ok) return inspected

  const parsed = parseGitRepoUrl(repoUrl)
  const m = inspected.manifest
  const isDirectCharMedia = m.type === 'character' && /\.(webm|mp4|mov|png|webp|gif|jpg|jpeg)$/i.test(m.entry)
  const entryText = isDirectCharMedia ? '' : await fetchGitTextFile(parsed, m.entry, { fetchImpl, useGhCli })

  if (m.type === 'miniapp') {
    const app = await store.installMiniApp({
      id: m.id,
      name: m.name,
      icon: m.icon,
      color: m.color,
      description: m.description,
      permissions: m.permissions,
      html: entryText,
      source: `git:${parsed.provider}:${parsed.owner}/${parsed.repo}`,
    })
    return { ok: true, type: 'miniapp', manifest: m, miniApp: app, item: { id: m.id, title: m.name, kind: 'miniapp', installed: true } }
  }

  if (m.type === 'skill') {
    if (!skillsDir) {
      return { ok: false, error: 'skillsDir not configured' }
    }
    const targetDir = join(skillsDir, m.id)
    await mkdir(targetDir, { recursive: true })
    const targetFile = join(targetDir, 'SKILL.md')
    await writeFile(targetFile, entryText, 'utf8')
    return { ok: true, type: 'skill', manifest: m, skillPath: targetFile, item: { id: m.id, title: m.name, kind: 'skill', installed: true } }
  }

  if (m.type === 'wallpaper') {
    await store.setWallpaper({
      id: m.id,
      name: m.name,
      source: 'git',
      repoUrl: parsed.repoUrl,
    })
    return { ok: true, type: 'wallpaper', manifest: m }
  }

  if (m.type === 'character') {
    const files = {}
    const posesMap = {}
    const posesMovMap = {}
    const posesStackedMap = {}
    const reactionsMap = {}
    const reactionsMovMap = {}
    let bgFile = ''
    const isDirectMedia = /\.(webm|mp4|mov|png|webp|gif|jpg|jpeg)$/i.test(m.entry)
    if (isDirectMedia) {
      const buf = await fetchGitBinaryFile(parsed, m.entry, { fetchImpl, useGhCli })
      files[m.entry] = buf
      posesMap.stand = m.entry
    } else {
      let charSpec = {}
      try {
        charSpec = JSON.parse(entryText)
      } catch {
        return { ok: false, error: 'character entry is not valid JSON' }
      }
      const lav = (charSpec && typeof charSpec.lav === 'object' && charSpec.lav) ? charSpec.lav : {}
      const lavMov = (charSpec && typeof charSpec.lavMov === 'object' && charSpec.lavMov) ? charSpec.lavMov : {}
      const lavStacked = (charSpec && typeof charSpec.lavStacked === 'object' && charSpec.lavStacked) ? charSpec.lavStacked : {}
      const fetchOnce = async (rel) => {
        if (!files[rel]) files[rel] = await fetchGitBinaryFile(parsed, rel, { fetchImpl, useGhCli })
      }
      const poseAliases = [
        ['stand', lav.stand || lav.idle, lavMov.stand || lavMov.idle, lavStacked.stand || lavStacked.idle],
        ['desk', lav.desk, lavMov.desk, lavStacked.desk],
        ['glance', lav.glance, lavMov.glance, lavStacked.glance],
        ['sit', lav.sit, lavMov.sit, lavStacked.sit],
      ]
      for (const [poseKey, rawEntry, rawMov, rawStacked] of poseAliases) {
        const primaryRel = typeof rawEntry === 'string'
          ? rawEntry
          : (rawEntry && typeof rawEntry === 'object' ? (rawEntry.webm || rawEntry.url || rawEntry.mov || rawEntry.stacked) : '')
        const movRel = typeof rawMov === 'string'
          ? rawMov
          : (rawEntry && typeof rawEntry === 'object' && typeof rawEntry.mov === 'string' ? rawEntry.mov : '')
        const stackedRel = typeof rawStacked === 'string'
          ? rawStacked
          : (rawEntry && typeof rawEntry === 'object' && typeof rawEntry.stacked === 'string' ? rawEntry.stacked : '')
        if (typeof primaryRel === 'string' && isSafeRelPath(primaryRel)) {
          await fetchOnce(primaryRel)
          posesMap[poseKey] = primaryRel
        }
        if (typeof movRel === 'string' && isSafeRelPath(movRel)) {
          await fetchOnce(movRel)
          posesMovMap[poseKey] = movRel
        }
        if (typeof stackedRel === 'string' && isSafeRelPath(stackedRel)) {
          await fetchOnce(stackedRel)
          posesStackedMap[poseKey] = stackedRel
        }
      }
      const reactAliases = [
        ['head', lav.touch_head || lav.head, lavMov.touch_head || lavMov.head],
        ['body', lav.touch_body || lav.body, lavMov.touch_body || lavMov.body],
        ['tail', lav.touch_tail || lav.tail, lavMov.touch_tail || lavMov.tail],
      ]
      for (const [zone, rel, movRel] of reactAliases) {
        if (typeof rel === 'string' && isSafeRelPath(rel)) {
          await fetchOnce(rel)
          reactionsMap[zone] = rel
        }
        if (typeof movRel === 'string' && isSafeRelPath(movRel)) {
          await fetchOnce(movRel)
          reactionsMovMap[zone] = movRel
        }
      }
      const rawBg = typeof charSpec.bg === 'string' ? charSpec.bg : (typeof lav.bg === 'string' ? lav.bg : '')
      if (rawBg && isSafeRelPath(rawBg)) {
        await fetchOnce(rawBg)
        bgFile = rawBg
      }
    }
    const installed = await store.installFocusPackFromFiles({
      id: m.id,
      name: m.name,
      author: m.author,
      source: `git:${parsed.provider}:${parsed.owner}/${parsed.repo}`,
      files,
      posesMap,
      posesMovMap,
      posesStackedMap,
      reactionsMap,
      reactionsMovMap,
      bgFile,
      activate: true,
    })
    return {
      ok: true,
      type: 'character',
      manifest: m,
      focusPack: installed.pack,
      item: { id: m.id, title: m.name, kind: 'character', installed: true },
    }
  }

  return { ok: true, type: m.type, manifest: m }
}
