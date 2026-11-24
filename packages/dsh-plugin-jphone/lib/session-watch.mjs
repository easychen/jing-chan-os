import { notifyIfEnabled } from './notify.mjs'
/**
 * Real-time DeepSeek Harness `session/event` watcher for 小鲸同学.
 * Folds native DSH turn/tool events into live pet animations & playful Chinese status bubbles.
 *
 * Architecture inspired by PC2005-cloud/dsh-pet (MIT: https://github.com/PC2005-cloud/dsh-pet).
 */
import { basename } from 'node:path'

function parseArgs(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(String(raw))
  } catch {
    return {}
  }
}

function shortFile(args) {
  const candidate = args.path || args.file_path || args.filePath || args.target_file || args.filename
  if (!candidate || typeof candidate !== 'string') return null
  const name = basename(candidate)
  return name.length > 26 ? name.slice(0, 23) + '…' : name
}

function shortCmd(args) {
  const raw = args.command || args.cmd || args.CommandLine
  if (!raw || typeof raw !== 'string') return null
  const first = raw.trim().split(/\s+/).slice(0, 2).join(' ')
  return first.length > 24 ? first.slice(0, 21) + '…' : first
}

/**
 * Convert a DSH `tool/call` event into a concise, playful Chinese status caption
 * without leaking sensitive argument values.
 */
export function describeToolCall(name, rawArgs) {
  const tool = String(name || '').toLowerCase()
  const args = parseArgs(rawArgs)
  const file = shortFile(args)
  const cmd = shortCmd(args)

  if (tool.includes('read') || tool.includes('view') || tool.includes('cat')) {
    return file ? `翻翻 ${file} 看看嘛` : '在仔细读文件呢～'
  }
  if (tool.includes('edit') || tool.includes('write') || tool.includes('replace') || tool.includes('patch')) {
    return file ? `正在改 ${file} 啦` : '认真敲代码中…'
  }
  if (tool.includes('grep') || tool.includes('search') || tool.includes('glob') || tool.includes('find')) {
    return '帮你在代码里翻找一下～'
  }
  if (tool.includes('bash') || tool.includes('shell') || tool.includes('exec') || tool.includes('command') || tool.includes('run')) {
    if (cmd && cmd.startsWith('git push')) return '准备推上去了，我来看着～'
    if (cmd && cmd.startsWith('git')) return `跑一下 ${cmd} 咯`
    return cmd ? `跑一下 ${cmd} 咯` : '正在跑终端命令呢…'
  }
  if (tool.includes('web') || tool.includes('fetch') || tool.includes('http')) {
    return '去网上帮你查查资料～'
  }
  if (tool.includes('jphone_')) {
    return '正在同步鲸Phone 状态～'
  }
  return '专注干活中，别打扰我哦～'
}

/**
 * Stateful session-event folder that drives 小鲸同学's mood & speech bubble
 * across ALL active DeepSeek Harness sessions.
 */
export function createSessionWatcher({ store, wsHub, workspaceMemory = null, celebrateMs = 4500 }) {
  const activeSessions = new Map() // sessionId -> { tools: Map<callId, detail>, state }
  const lastAssistantText = new Map() // sessionId -> full assistant reply text
  let celebrateTimer = null

  function clearCelebrateTimer() {
    if (celebrateTimer) {
      clearTimeout(celebrateTimer)
      celebrateTimer = null
    }
  }

  async function applyMood(mood, moodText, transientBubble = false, extra = {}) {
    try {
      const current = store.data
      // Never wake up a user-set sleeping pet purely on background idle resets
      if (current.mood === 'sleepy' && mood === 'idle') return
      await store.setMood(mood, moodText)
      wsHub.broadcast({
        type: 'character:mood',
        mood,
        moodText,
        bubble: transientBubble ? moodText : (mood === 'working' ? moodText : null),
        ...extra,
      })
    } catch {}
  }

  function handleSessionEvent(sessionOrEv, maybeEvent) {
    // Support both Cordis `ctx.on('session/event', (session, event) => ...)` and single-arg event tests
    const session = maybeEvent ? sessionOrEv : null
    const event = maybeEvent || sessionOrEv
    if (!event || typeof event !== 'object') return

    const sessionId = String(
      session?.header?.id ?? session?.id ?? event?.sessionId ?? event?.id ?? 'unknown',
    )
    const type = String(event.type || '')

    if (sessionId === store.data.mainSessionId) {
      wsHub.broadcast({ type: 'chat:update', sessionId })
    } else if (store.data.tasks.some((t) => t.sessionId === sessionId)) {
      wsHub.broadcast({ type: 'task:update', sessionId })
    }

    if (!type) return

    if (type === 'turn/start') {
      clearCelebrateTimer()
      activeSessions.set(sessionId, { tools: new Map(), state: 'thinking' })
      void applyMood('working', '小鲸同学正在思考方案…', true, { sessionId, phase: 'thinking' })
      return
    }

    if (type === 'tool/call') {
      clearCelebrateTimer()
      const entry = activeSessions.get(sessionId) || { tools: new Map(), state: 'working' }
      const callId = String(event.data?.callId ?? `call-${Date.now()}`)
      const caption = describeToolCall(event.data?.name, event.data?.arguments)
      entry.tools.set(callId, caption)
      entry.state = 'working'
      activeSessions.set(sessionId, entry)
      void applyMood('working', caption, true, { sessionId, phase: 'working', tool: event.data?.name || null })
      return
    }

    if (type === 'tool/result') {
      const entry = activeSessions.get(sessionId)
      if (!entry) return
      const callId = String(event.data?.message?.source?.callId ?? event.data?.callId ?? '')
      if (callId) entry.tools.delete(callId)
      if (entry.tools.size > 0) {
        const nextCaption = [...entry.tools.values()].at(-1)
        void applyMood('working', nextCaption, true, { sessionId, phase: 'working' })
      } else {
        entry.state = 'thinking'
        void applyMood('working', '正在整理刚才的结果…', true, { sessionId, phase: 'organizing' })
      }
      return
    }

    if (type === 'approval/asked') {
      void applyMood('working', '需要你点头确认一下哦～', true, { sessionId, phase: 'waiting' })
      return
    }

    if (type === 'assistant/message') {
      // Extract final assistant text for real-time projection into JPhone Chat & Task summary
      const chunks = event.data?.message?.content ?? event.data?.stream?.chunks ?? event.data?.content ?? []
      let text = ''
      if (typeof event.data?.text === 'string') text = event.data.text
      else if (Array.isArray(chunks)) {
        for (const c of chunks) {
          if (c?.type === 'text-delta' && typeof c.text === 'string') text += c.text
          else if (c?.type === 'text' && typeof c.text === 'string') text += c.text
        }
      }
      if (text.trim()) {
        const trimmed = text.trim()
        lastAssistantText.set(sessionId, trimmed)
        if (sessionId === store.data.mainSessionId) {
          void store.appendFallbackMessage('assistant', trimmed, {
            sessionId,
            ...(store.data.mainSessionDate ? { dateKey: store.data.mainSessionDate } : {}),
          }).then(() => {
            wsHub.broadcast({ type: 'chat:update', sessionId })
          })
          if (workspaceMemory?.appendDailyEntry) {
            void workspaceMemory.appendDailyEntry({ role: 'assistant', text: trimmed, channel: 'chat' })
          }
        } else {
          const existingTask = store.listTasks().find((t) => t.sessionId === sessionId)
          if (existingTask) {
            const brief = trimmed.replace(/\s+/g, ' ').slice(0, 160)
            void store.upsertTask({
              ...existingTask,
              summary: brief,
              resultText: trimmed.slice(0, 1600),
            }).then((t) => {
              wsHub.broadcast({ type: 'task:update', sessionId, task: t })
            })
          }
        }
      }
      return
    }

    if (type === 'turn/end') {
      activeSessions.delete(sessionId)
      const matchedTask = store.listTasks().find((t) => t.sessionId === sessionId)
      if (matchedTask) {
        const endKind = String(event.data?.reason?.kind || 'completed')
        const nextStatus = (endKind === 'error' || endKind === 'failed') ? 'failed' : 'completed'
        const finalText = (lastAssistantText.get(sessionId) || matchedTask.resultText || '').trim()
        lastAssistantText.delete(sessionId)
        const nextSummary = finalText ? finalText.replace(/\s+/g, ' ').slice(0, 160) : matchedTask.summary
        void store.upsertTask({
          ...matchedTask,
          status: nextStatus,
          ...(nextSummary ? { summary: nextSummary } : {}),
          ...(finalText ? { resultText: finalText.slice(0, 1600) } : {}),
        }).then((t) => {
          wsHub.broadcast({ type: 'task:update', sessionId, task: t })
          const statusLabel = nextStatus === 'failed' ? '执行遇到异常' : '已完成'
          void notifyIfEnabled(store, 'task_done', {
            title: `小鲸任务${statusLabel}：${t.title || '后台任务'}`,
            desp: t.summary
              ? `**任务**：${t.title}\n\n**结果摘要**：\n${String(t.summary).slice(0, 800)}`
              : `**任务**：${t.title}\n\n状态：${statusLabel}`,
          }).catch(() => {})
        })
      }
      if (activeSessions.size > 0) {
        // Another DSH session is still running
        const remaining = [...activeSessions.values()].at(-1)
        const caption = [...remaining.tools.values()].at(-1) || '后台还有任务在跑哦～'
        void applyMood('working', caption, true, { phase: 'working' })
        return
      }
      const kind = String(event.data?.reason?.kind || 'completed')
      if (kind === 'error' || kind === 'failed') {
        void applyMood('idle', '咦，好像遇到点小状况…', true, { sessionId, phase: 'error' })
      } else if (kind === 'aborted' || kind === 'cancelled') {
        void applyMood('idle', '好哒，先停下来休息一下～', true, { sessionId, phase: 'aborted' })
      } else {
        void applyMood('happy', '搞定啦！快来看看结果吧～', true, { sessionId, phase: 'completed' })
        clearCelebrateTimer()
        celebrateTimer = setTimeout(() => {
          if (activeSessions.size === 0 && store.data.mood === 'happy') {
            void applyMood('idle', '今天也要和小鲸同学一起探索新世界呀～', false, { phase: 'idle' })
          }
        }, celebrateMs)
      }
    }
  }

  return {
    handleSessionEvent,
    dispose() {
      clearCelebrateTimer()
      activeSessions.clear()
    },
  }
}
