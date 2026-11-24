import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { WorkspaceMemoryManager, formatLocalDateKey } from './workspace-memory.mjs'

export const JPHONE_WORKSPACE_TITLE = '鲸Phone · 小鲸同学'

function parseFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(md)
  if (!m) return { meta: {}, body: md }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return { meta, body: m[2].trim() }
}

function extractTextFromContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && part.type === 'text' && typeof part.text === 'string') return part.text
      return ''
    })
    .filter(Boolean)
    .join('')
}

function makeRequestId(prefix = 'jphone') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export class JPhoneOrchestrator {
  constructor({ store, workspaceDir, skillsDir, sessionController, agents, sessions, workspaceRegistry, onBroadcast }) {
    this.store = store
    this.workspaceDir = workspaceDir
    this.skillsDir = skillsDir
    this.sessionController = sessionController ?? null
    this.agents = agents ?? null
    this.sessions = sessions ?? null
    this.workspaceRegistry = workspaceRegistry ?? null
    this.onBroadcast = onBroadcast ?? (() => {})
    this.workspaceMemory = new WorkspaceMemoryManager(workspaceDir)
    this.jphoneWorkspaceId = store?.data?.workspaceId || null
    this._bootstrappedSessions = new Set()
  }

  async _ensureDedicatedDshWorkspace() {
    const reg = this.workspaceRegistry
    if (!reg) return null

    // 1. Official DSH v4 WorkspaceRegistry: resolveByPath(dir) / create(dir, title)
    if (typeof reg.resolveByPath === 'function') {
      try {
        const existing = await reg.resolveByPath(this.workspaceDir)
        if (existing?.id) {
          this.jphoneWorkspaceId = existing.id
          return existing.id
        }
      } catch {
        // continue to create
      }
    }
    if (typeof reg.create === 'function') {
      try {
        const created = await reg.create(this.workspaceDir, JPHONE_WORKSPACE_TITLE)
        if (created?.id) {
          this.jphoneWorkspaceId = created.id
          return created.id
        }
      } catch (err) {
        console.warn('[dsh-plugin-jphone] workspaceRegistry.create failed:', err?.message || err)
      }
    }
    // Legacy test mock compatibility
    if (typeof reg.registerWorkspace === 'function') {
      try {
        const res = await reg.registerWorkspace(this.workspaceDir, JPHONE_WORKSPACE_TITLE)
        if (res?.id) {
          this.jphoneWorkspaceId = res.id
          return res.id
        }
      } catch {}
    }
    return this.jphoneWorkspaceId
  }

  _resolveWorkspaceId() {
    // Always prioritize our dedicated 鲸Phone workspace over Default workspace!
    if (this.jphoneWorkspaceId) return this.jphoneWorkspaceId
    const reg = this.workspaceRegistry
    if (!reg) return null
    if (typeof reg.list === 'function') {
      const list = reg.list()
      if (Array.isArray(list)) {
        const matched = list.find(
          (w) => w && (w.path === this.workspaceDir || w.title === JPHONE_WORKSPACE_TITLE),
        )
        if (matched?.id) {
          this.jphoneWorkspaceId = matched.id
          return matched.id
        }
      }
    }
    if (reg.defaultWorkspaceId) return reg.defaultWorkspaceId
    if (typeof reg.list === 'function') {
      const list = reg.list()
      if (Array.isArray(list) && list.length > 0 && list[0]?.id) return list[0].id
    }
    return null
  }

  async _createRealSession(agentPreset) {
    if (!this.sessionController) return null
    const workspaceId = this._resolveWorkspaceId()

    if (typeof this.sessionController.create === 'function') {
      const baseReq = workspaceId ? { workspaceId } : { cwd: this.workspaceDir }
      if (agentPreset && agentPreset !== 'standard') {
        try {
          const created = await this.sessionController.create({ ...baseReq, agentPreset })
          if (created?.sessionId) return created.sessionId
        } catch {
          // fall back to default preset
        }
      }
      try {
        const created = await this.sessionController.create(baseReq)
        if (created?.sessionId) return created.sessionId
      } catch (err) {
        console.warn('[dsh-plugin-jphone] sessionController.create failed:', err?.message || err)
      }
    }

    if (typeof this.sessionController.createSession === 'function') {
      try {
        const created = await this.sessionController.createSession({
          cwd: this.workspaceDir,
          ...(agentPreset ? { agentPreset } : {}),
        })
        if (created?.sessionId) return created.sessionId
      } catch {
        const created = await this.sessionController.createSession({ cwd: this.workspaceDir })
        if (created?.sessionId) return created.sessionId
      }
    }
    return null
  }

  async _submitPrompt(sessionId, text, mode = 'queue', { images = [] } = {}) {
    if (!this.sessionController || !sessionId) return false
    const clean = String(text ?? '').trim()
    if (!clean) return false

    if (typeof this.sessionController.prompt === 'function') {
      const content = [{ type: 'text', text: clean }]
      const payload = {
        sessionId,
        requestId: makeRequestId('jphone'),
        mode,
        message: clean,
        content,
        ...(Array.isArray(images) && images.length > 0 ? { images } : {}),
      }
      try {
        await this.sessionController.prompt(payload, new AbortController().signal)
        return true
      } catch (err) {
        console.warn('[dsh-plugin-jphone] sessionController.prompt failed:', err?.message || err)
      }
    }

    if (typeof this.sessionController.submitPrompt === 'function') {
      try {
        await this.sessionController.submitPrompt(sessionId, clean, { mode })
        return true
      } catch (err) {
        console.warn('[dsh-plugin-jphone] submitPrompt failed:', err?.message || err)
      }
    }

    if (typeof this.sessionController.resolveAgent === 'function') {
      try {
        const agent = await this.sessionController.resolveAgent(sessionId)
        if (agent) {
          if (mode === 'steer' && typeof agent.steer === 'function') {
            await agent.steer(clean)
            return true
          }
          if (typeof agent.followup === 'function') {
            await agent.followup(clean)
            return true
          }
        }
      } catch (err) {
        console.warn('[dsh-plugin-jphone] resolveAgent followup failed:', err?.message || err)
      }
    }
    return false
  }

  async ensureWorkspace() {
    await mkdir(this.workspaceDir, { recursive: true })
    await this.workspaceMemory.ensureScaffold(this.store.listMemories())
    const wsId = await this._ensureDedicatedDshWorkspace()
    if (this.store.data.workspaceDir !== this.workspaceDir || (wsId && this.store.data.workspaceId !== wsId)) {
      await this.store.setMainSession(this.store.data.mainSessionId, this.workspaceDir, {
        workspaceId: wsId || this.store.data.workspaceId,
      })
    }
    return this.workspaceDir
  }

  /**
   * OpenClaw/Hermes-style daily main chat session:
   * Each calendar day (YYYY-MM-DD) gets its own fresh DSH session inside the dedicated
   * 「鲸Phone · 小鲸同学」 workspace so context stays crisp and bounded.
   */
  async ensureMainSession(dateKey = formatLocalDateKey()) {
    await this.ensureWorkspace()
    if (!this.sessionController) return null

    const todaySessionId = this.store.getDailyMainSession(dateKey)
    if (todaySessionId && !todaySessionId.startsWith('local-')) {
      try {
        if (typeof this.sessionController.resolveAgent === 'function') {
          const agent = await this.sessionController.resolveAgent(todaySessionId)
          if (agent) {
            if (this.store.data.mainSessionId !== todaySessionId) {
              await this.store.setMainSession(todaySessionId, this.workspaceDir, {
                dateKey,
                workspaceId: this.jphoneWorkspaceId,
              })
            }
            return { sessionId: todaySessionId, dateKey, isFreshDay: false, agent }
          }
        } else {
          if (this.store.data.mainSessionId !== todaySessionId) {
            await this.store.setMainSession(todaySessionId, this.workspaceDir, {
              dateKey,
              workspaceId: this.jphoneWorkspaceId,
            })
          }
          return { sessionId: todaySessionId, dateKey, isFreshDay: false, agent: null }
        }
      } catch {
        // fall through to create fresh daily session
      }
    }

    const sessionId = await this._createRealSession()
    if (!sessionId) return null
    await this.store.setMainSession(sessionId, this.workspaceDir, {
      dateKey,
      workspaceId: this.jphoneWorkspaceId,
    })
    try {
      if (typeof this.sessionController.rename === 'function') {
        await this.sessionController.rename({ sessionId, title: `小鲸同学 · ${dateKey}` })
      }
    } catch {}
    return { sessionId, dateKey, isFreshDay: true, agent: null }
  }

  async listMessages(opts = {}) {
    const dateKey = opts?.dateKey || formatLocalDateKey()
    const todayMainId =
      this.store.getDailyMainSession(dateKey) ||
      (!this.store.data.mainSessionDate ? this.store.data.mainSessionId : null)
    const todayFallback = this.store.getFallbackMessages(dateKey)

    if (todayMainId && this.sessions?.get) {
      try {
        const session = this.sessions.get(todayMainId)
        const events = session?.events ?? session?.getEvents?.()
        if (Array.isArray(events) && events.length > 0) {
          const projected = []
          for (const ev of events) {
            if (ev.type === 'user/message') {
              const text = extractTextFromContent(ev.data?.content)
              if (text && !text.startsWith('<system-reminder>') && !text.startsWith('Time sampled while preparing')) {
                const cleaned = text
                  .replace(/^\[鲸Phone 独立工作区上下文\][\s\S]*?\[请直接自然回复用户下面的消息，不要复述本上下文\]\n?/, '')
                  .replace(/^（你是小鲸同学[^）]*）\n?/, '')
                if (cleaned) projected.push({ id: ev.id ?? `ev-${ev.seq}`, role: 'user', text: cleaned, seq: ev.seq, dateKey, createdAt: ev.timestamp ?? Date.now() })
              }
            } else if (ev.type === 'assistant/message') {
              const chunks = ev.data?.message?.content ?? ev.data?.stream?.chunks ?? ev.data?.content ?? []
              let text = ''
              if (Array.isArray(chunks)) {
                for (const c of chunks) {
                  if (c?.type === 'text-delta' && typeof c.text === 'string') text += c.text
                  else if (c?.type === 'text' && typeof c.text === 'string') text += c.text
                }
              }
              if (text) projected.push({ id: ev.id ?? `ev-${ev.seq}`, role: 'assistant', text, seq: ev.seq, dateKey, createdAt: ev.timestamp ?? Date.now() })
            }
          }
          if (projected.length > 0) {
            // Merge today's voice-call transcript lines alongside DSH main session turns
            const voiceExtras = todayFallback.filter(
              (m) => m && typeof m.text === 'string' && (m.text.startsWith('[语音通话]') || m.text.startsWith('[语音播报]'))
            )
            if (voiceExtras.length > 0) {
              return [...projected, ...voiceExtras].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            }
            return projected
          }
        }
      } catch {
        // fallback below
      }
    }
    return todayFallback
  }

  async sendChat(text, opts = {}) {
    const rawAttachments = Array.isArray(opts.attachments) ? opts.attachments : []
    const cleanText = String(text ?? '').trim()
    if (!cleanText && rawAttachments.length === 0) throw new Error('Empty message')
    const dateKey = opts.dateKey || formatLocalDateKey()

    // Persist uploaded attachments into workspace/attachments/YYYY-MM-DD/
    const savedAttachments = []
    const promptAttachmentNotes = []
    const visionImages = []
    if (rawAttachments.length > 0) {
      await this.ensureWorkspace()
      const attDir = join(this.workspaceMemory.workspaceDir, 'attachments', dateKey)
      await mkdir(attDir, { recursive: true })
      for (const att of rawAttachments.slice(0, 6)) {
        if (!att || typeof att !== 'object') continue
        const rawName = String(att.name || 'attachment').replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_').slice(0, 64)
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${rawName}`
        const mimeType = String(att.mimeType || 'application/octet-stream')
        const fullPath = join(attDir, fileName)
        let size = 0
        let inlineText = ''
        if (typeof att.dataBase64 === 'string' && att.dataBase64.length > 0) {
          const buf = Buffer.from(att.dataBase64, 'base64')
          size = buf.length
          await writeFile(fullPath, buf)
          if (/^text\/|json|markdown|xml|yaml|javascript|typescript|csv/.test(mimeType) || /\.(md|txt|json|js|ts|py|dart|html|css|csv|log|yaml|yml)$/i.test(rawName)) {
            inlineText = buf.toString('utf8').slice(0, 4000)
          }
        } else if (typeof att.textContent === 'string') {
          const buf = Buffer.from(att.textContent, 'utf8')
          size = buf.length
          await writeFile(fullPath, buf)
          inlineText = att.textContent.slice(0, 4000)
        } else {
          continue
        }
        const url = `/jphone/api/attachments/${encodeURIComponent(dateKey)}/${encodeURIComponent(fileName)}`
        savedAttachments.push({
          name: rawName,
          mimeType,
          size,
          url,
          isImage: mimeType.startsWith('image/'),
          workspacePath: fullPath,
        })
        if (mimeType.startsWith('image/') && typeof att.dataBase64 === 'string' && att.dataBase64.length > 0) {
          visionImages.push({ name: rawName, mimeType, dataBase64: att.dataBase64, workspacePath: fullPath })
          promptAttachmentNotes.push(`[用户附带图片（视觉附件）: ${rawName} (${mimeType}, ${Math.round(size / 1024)}KB), 本地路径: ${fullPath}。请直接结合图片视觉内容或通过文件工具查看后回答]`)
        } else if (inlineText) {
          promptAttachmentNotes.push(`[用户附件: ${rawName} (${mimeType}), 已保存到 ${fullPath}]\n\`\`\`\n${inlineText}\n\`\`\``)
        } else {
          promptAttachmentNotes.push(`[用户附件: ${rawName} (${mimeType}, ${Math.round(size / 1024)}KB), 本地文件路径: ${fullPath}]`)
        }
      }
    }

    const displayClean = cleanText || (savedAttachments.length > 0 ? `发送了 ${savedAttachments.length} 个附件` : '')
    const clean = promptAttachmentNotes.length > 0
      ? `${displayClean}\n\n${promptAttachmentNotes.join('\n\n')}`
      : displayClean

    const userMsg = await this.store.appendFallbackMessage('user', displayClean, {
      dateKey,
      attachments: savedAttachments.length > 0 ? savedAttachments : undefined,
    })
    await this.workspaceMemory.appendDailyEntry({
      role: 'user',
      text: savedAttachments.length > 0
        ? `${displayClean} [附件: ${savedAttachments.map((a) => a.name).join(', ')}]`
        : displayClean,
      channel: 'chat',
      dateKey,
    })

    let dispatchedTask = null
    const looksLikeHeavyTask = opts.background === true || /(?:帮我做|写一个|搓一个|内网穿透|配置隧道|跑测试|后台任务)/.test(clean)
    if (looksLikeHeavyTask) {
      dispatchedTask = await this.dispatchTask({
        title: clean.length > 22 ? `${clean.slice(0, 22)}…` : clean,
        prompt: clean,
      })
    }

    let routedToDsh = false
    const main = await this.ensureMainSession(dateKey)
    if (main?.sessionId && !dispatchedTask) {
      let promptPayload = clean
      if (main.isFreshDay || !this._bootstrappedSessions.has(main.sessionId)) {
        const ctxBanner = await this.workspaceMemory.buildDailyBootstrapContext()
        promptPayload = `${ctxBanner}\n\n${clean}`
        this._bootstrappedSessions.add(main.sessionId)
      }
      routedToDsh = await this._submitPrompt(main.sessionId, promptPayload, 'queue', { images: visionImages })
    }

    let reply = null
    if (dispatchedTask) {
      const replyText = '收到啦！我已经把这个任务派给独立工作区去跑啦，你可以点顶部任务胶囊去 DSH 围观实时过程，咱们这边继续聊不耽误～'
      reply = await this.store.appendFallbackMessage('assistant', replyText, {
        dateKey,
        sessionId: main?.sessionId ?? null,
        taskId: dispatchedTask.taskId,
      })
      await this.workspaceMemory.appendDailyEntry({ role: 'assistant', text: replyText, channel: 'chat', dateKey })
    } else if (!routedToDsh) {
      const replyText = `小鲸同学收到啦：「${clean}」～随时可以让我派后台任务，或者帮你手搓迷你应用装到桌面上哦！`
      reply = await this.store.appendFallbackMessage('assistant', replyText, {
        dateKey,
        sessionId: main?.sessionId ?? null,
      })
      await this.workspaceMemory.appendDailyEntry({ role: 'assistant', text: replyText, channel: 'chat', dateKey })
    }

    await this.store.setMood(
      dispatchedTask || routedToDsh ? 'working' : 'happy',
      dispatchedTask ? `后台处理中：${dispatchedTask.title}` : '小鲸同学正在组织回复…',
    )
    this.onBroadcast({ type: 'chat:update', sessionId: main?.sessionId ?? null })
    return {
      ok: true,
      userMsg,
      reply,
      dispatchedTask,
      routedToDsh,
      mainSessionId: main?.sessionId ?? null,
      dateKey,
      workspaceId: this.jphoneWorkspaceId,
    }
  }

  async dispatchTask({ title, prompt, preset = 'standard', sourceCallId = null }) {
    await this.ensureWorkspace()
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    let sessionId = `local-${taskId}`
    let realSession = false

    const createdId = await this._createRealSession(preset)
    if (createdId) {
      sessionId = createdId
      realSession = true
      try {
        if (typeof this.sessionController?.rename === 'function') {
          await this.sessionController.rename({ sessionId, title: String(title || '后台任务') })
        }
      } catch {}
      await this._submitPrompt(sessionId, String(prompt || title), 'queue')
    }

    const task = await this.store.upsertTask({
      taskId,
      sessionId,
      title: String(title || '后台任务'),
      prompt: String(prompt || title || ''),
      preset,
      status: 'running',
      realSession,
      ...(sourceCallId ? { sourceCallId: String(sourceCallId), voiceReported: false } : {}),
      summary: realSession
        ? '已在「鲸Phone · 小鲸同学」独立工作区运行，点右侧即可围观'
        : '离线模拟任务（未检测到 DSH sessionController）',
    })
    await this.store.setMood('working', `后台处理中：${task.title}`)
    this.onBroadcast({ type: 'task:updated', task })
    return task
  }

  async steerTask(sessionId, message) {
    await this._submitPrompt(sessionId, message, 'steer')
    const existing = this.store.listTasks().find(t => t.sessionId === sessionId)
    if (existing) {
      return this.store.upsertTask({ ...existing, summary: `已补充指令：${message}` })
    }
    return null
  }

  listTasks() {
    return this.store.listTasks()
  }

  async listSkills() {
    if (!this.skillsDir) return []
    try {
      const entries = await readdir(this.skillsDir, { withFileTypes: true })
      const skills = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillPath = join(this.skillsDir, entry.name, 'SKILL.md')
        try {
          const raw = await readFile(skillPath, 'utf8')
          const { meta, body } = parseFrontmatter(raw)
          skills.push({
            name: meta.name || entry.name,
            description: meta.description || entry.name,
            path: skillPath,
            body,
          })
        } catch {}
      }
      return skills
    } catch {
      return []
    }
  }
}
