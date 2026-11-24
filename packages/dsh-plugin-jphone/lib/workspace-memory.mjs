import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DEFAULT_AGENTS_MD = `# AGENTS.md — 鲸Phone · 小鲸同学工作区指南

你是 **小鲸同学**（鲸娘 / Deepseek Chan），用户专属的 DeepSeek Harness 虚拟手机伴侣。

## 沟通风格
- 语气温暖、真诚、活泼自然，简洁干练，不油腻、不啰嗦。
- 默认使用中文回复；在语音电话模式下保持 1~2 句口语化表达，不使用 Markdown 列表或表情符号。
- 随时可以被打断：把耗时编码、命令执行、内网穿透配置等工作异步派发给后台任务，主聊天窗永远保持轻快流畅。

## 记忆层级协议（OpenClaw / Hermes 风格）
本工作区采用三层 Markdown 记忆，避免上下文膨胀：
1. \`MEMORY.md\`：长期置顶的核心记忆与偏好，每次新一天对话自动载入摘要。
2. \`memory/RECENT.md\`：最近 7 天的每日聊天与事件滚动摘要，自动维护。
3. \`memory/INDEX.md\`：7 天前的历史日志仅保留文件路径索引（\`memory/daily/YYYY-MM-DD.md\`）；需要回顾远期细节时再按需读取对应文件。

## 用户自定义说明
你可以直接在 DeepSeek Harness 或鲸Phone「记忆」App 中修改本文件，小鲸同学会在后续对话中遵循你的最新设定。
`

export function formatLocalDateKey(ts = Date.now()) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatLocalTime(ts = Date.now()) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function fileExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

export class WorkspaceMemoryManager {
  constructor(workspaceDir, { recentDays = 7 } = {}) {
    this.workspaceDir = workspaceDir
    this.recentDays = recentDays
    this.agentsPath = join(workspaceDir, 'AGENTS.md')
    this.memoryPath = join(workspaceDir, 'MEMORY.md')
    this.memoryDir = join(workspaceDir, 'memory')
    this.dailyDir = join(this.memoryDir, 'daily')
    this.recentPath = join(this.memoryDir, 'RECENT.md')
    this.indexPath = join(this.memoryDir, 'INDEX.md')
    this._writeChain = Promise.resolve()
  }

  _enqueue(fn) {
    const next = this._writeChain.then(fn, fn)
    this._writeChain = next.catch(() => {})
    return next
  }

  async ensureScaffold(memories = []) {
    return this._enqueue(async () => {
      await mkdir(this.dailyDir, { recursive: true })
      if (!(await fileExists(this.agentsPath))) {
        await writeFile(this.agentsPath, DEFAULT_AGENTS_MD, 'utf8')
      }
      if (!(await fileExists(this.memoryPath))) {
        await writeFile(this.memoryPath, this._renderMemoryMd(memories), 'utf8')
      }
      await this._rebuildTieredIndicesUnlocked()
    })
  }

  _renderMemoryMd(memories = []) {
    const lines = [
      '# MEMORY.md — 小鲸同学长期记忆',
      '',
      '> 本文件与鲸Phone「记忆」App 双向同步，记录长期有效的核心偏好与事实。',
      '',
    ]
    if (!memories.length) {
      lines.push('- （暂无置顶长期记忆）')
    } else {
      for (const m of memories) {
        const text = typeof m === 'string' ? m : m?.text
        if (text) lines.push(`- ${String(text).trim()}`)
      }
    }
    lines.push('')
    return lines.join('\n')
  }

  async syncLongTermMemories(memories = []) {
    return this._enqueue(async () => {
      await mkdir(this.dailyDir, { recursive: true })
      await writeFile(this.memoryPath, this._renderMemoryMd(memories), 'utf8')
    })
  }

  async readAgentsMd() {
    if (!(await fileExists(this.agentsPath))) {
      await this.ensureScaffold()
    }
    return readFile(this.agentsPath, 'utf8')
  }

  async writeAgentsMd(content) {
    return this._enqueue(async () => {
      await mkdir(this.workspaceDir, { recursive: true })
      const next = String(content ?? '').trim() || DEFAULT_AGENTS_MD
      await writeFile(this.agentsPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8')
      return next
    })
  }

  async appendDailyEntry({ role, text, channel = 'chat', timestamp = Date.now(), dateKey = null }) {
    const clean = String(text ?? '').trim()
    if (!clean) return null
    const day = dateKey || formatLocalDateKey(timestamp)
    const timeStr = formatLocalTime(timestamp)
    const who = role === 'user' ? '用户' : '小鲸同学'
    const tag = channel === 'voice' ? ' · 语音电话' : ''
    const filePath = join(this.dailyDir, `${day}.md`)

    return this._enqueue(async () => {
      await mkdir(this.dailyDir, { recursive: true })
      let current = ''
      if (await fileExists(filePath)) {
        current = await readFile(filePath, 'utf8')
      } else {
        current = `# ${day} · 小鲸同学每日聊天记录\n\n`
      }
      const compactText = clean.replace(/\r?\n/g, ' ')
      const entry = `- **[${timeStr}] ${who}${tag}**：${compactText}\n`
      await writeFile(filePath, current + entry, 'utf8')
      await this._rebuildTieredIndicesUnlocked(day)
      return { dateKey: day, filePath }
    })
  }

  async rebuildTieredIndices(todayKey = formatLocalDateKey()) {
    return this._enqueue(() => this._rebuildTieredIndicesUnlocked(todayKey))
  }

  async _rebuildTieredIndicesUnlocked(todayKey = formatLocalDateKey()) {
    await mkdir(this.dailyDir, { recursive: true })
    const entries = await readdir(this.dailyDir, { withFileTypes: true })
    const dates = entries
      .filter((e) => e.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name))
      .map((e) => e.name.replace(/\.md$/, ''))
      .sort()
      .reverse() // newest first

    const todayMs = Date.parse(`${todayKey}T12:00:00Z`)
    const cutoffMs = todayMs - (this.recentDays - 1) * 86400 * 1000
    const recentDates = []
    const archiveDates = []
    for (const d of dates) {
      const ms = Date.parse(`${d}T12:00:00Z`)
      if (Number.isFinite(ms) && ms >= cutoffMs) recentDates.push(d)
      else archiveDates.push(d)
    }

    // Build RECENT.md (summary of recent N days)
    const recentLines = [
      `# RECENT.md — 最近 ${this.recentDays} 天记忆汇总`,
      '',
      `> 自动根据 \`memory/daily/*.md\` 生成（更新时间：${todayKey}）。超过 ${this.recentDays} 天的记录已归档至 \`memory/INDEX.md\`（仅留路径）。`,
      '',
    ]
    if (!recentDates.length) {
      recentLines.push('（最近 7 天暂无对话记录）', '')
    } else {
      for (const d of recentDates) {
        const raw = await readFile(join(this.dailyDir, `${d}.md`), 'utf8')
        const bullets = raw.split('\n').filter((l) => l.startsWith('- '))
        recentLines.push(`## ${d}（${bullets.length} 条记录，源文件：\`memory/daily/${d}.md\`）`)
        const highlights = bullets.slice(-6)
        for (const h of highlights) {
          recentLines.push(h.length > 140 ? `${h.slice(0, 138)}…` : h)
        }
        recentLines.push('')
      }
    }
    await writeFile(this.recentPath, recentLines.join('\n'), 'utf8')

    // Build INDEX.md (file-path-only archive for older days!)
    const indexLines = [
      '# INDEX.md — 历史聊天日志路径索引',
      '',
      `> 为避免主聊天上下文膨胀，${this.recentDays} 天前的历史日志仅保留文件路径；需要查阅时请按需读取对应文件。`,
      '',
    ]
    if (!archiveDates.length) {
      indexLines.push('- （暂无超过 7 天的归档日志）', '')
    } else {
      for (const d of archiveDates) {
        const raw = await readFile(join(this.dailyDir, `${d}.md`), 'utf8')
        const count = raw.split('\n').filter((l) => l.startsWith('- ')).length
        indexLines.push(`- \`memory/daily/${d}.md\`（${d}，共 ${count} 条记录）`)
      }
      indexLines.push('')
    }
    await writeFile(this.indexPath, indexLines.join('\n'), 'utf8')
  }

  async readDailyLog(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null
    const p = join(this.dailyDir, `${dateKey}.md`)
    if (!(await fileExists(p))) return null
    return readFile(p, 'utf8')
  }

  async snapshot() {
    await this.ensureScaffold()
    const [agentsMd, memoryMd, recentMd, indexMd, entries] = await Promise.all([
      readFile(this.agentsPath, 'utf8'),
      readFile(this.memoryPath, 'utf8'),
      readFile(this.recentPath, 'utf8'),
      readFile(this.indexPath, 'utf8'),
      readdir(this.dailyDir, { withFileTypes: true }),
    ])
    const dailyFiles = []
    for (const e of entries) {
      if (!e.isFile() || !/^\d{4}-\d{2}-\d{2}\.md$/.test(e.name)) continue
      const full = join(this.dailyDir, e.name)
      const st = await stat(full)
      dailyFiles.push({
        date: e.name.replace(/\.md$/, ''),
        path: `memory/daily/${e.name}`,
        size: st.size,
      })
    }
    dailyFiles.sort((a, b) => b.date.localeCompare(a.date))
    return {
      workspaceDir: this.workspaceDir,
      todayKey: formatLocalDateKey(),
      agentsMd,
      memoryMd,
      recentMd,
      indexMd,
      dailyFiles,
    }
  }

  async buildDailyBootstrapContext() {
    const snap = await this.snapshot()
    const agentsShort = snap.agentsMd.trim().slice(0, 800)
    const memoryShort = snap.memoryMd.trim().slice(0, 600)
    const recentShort = snap.recentMd.trim().slice(0, 900)
    const archiveHint = snap.indexMd.includes('memory/daily/')
      ? `历史归档索引位于 memory/INDEX.md（仅保留路径，按需读取）。`
      : ''
    return [
      '[鲸Phone 独立工作区上下文]',
      `工作区目录：${snap.workspaceDir}`,
      `今日日期：${snap.todayKey}`,
      '--- AGENTS.md ---',
      agentsShort,
      '--- MEMORY.md ---',
      memoryShort,
      '--- memory/RECENT.md ---',
      recentShort,
      archiveHint,
      '[请直接自然回复用户下面的消息，不要复述本上下文]',
    ].filter(Boolean).join('\n')
  }
}
