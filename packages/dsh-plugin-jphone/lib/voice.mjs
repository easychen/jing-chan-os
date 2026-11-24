const DEEPSEEK_BASE = 'https://api.deepseek.com'

const callHistories = new Map() // callId -> Array<{ role: 'user'|'assistant', content: string }>
const MAX_CALL_TURNS = 12

function resolveApiKey(explicitKey) {
  return explicitKey || process.env.DEEPSEEK_API_KEY || ''
}

export function repairStreamingWavHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 44) return buf
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return buf
  }
  const riffSize = buf.readUInt32LE(4)
  const expectedRiffSize = (buf.length - 8) >>> 0
  let offset = 12
  let dataOffset = -1
  let dataSize = 0
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4)
    const chunkSize = buf.readUInt32LE(offset + 4)
    if (chunkId === 'data') {
      dataOffset = offset
      dataSize = chunkSize
      break
    }
    if (chunkSize === 0xffffffff || offset + 8 + chunkSize > buf.length) {
      break
    }
    offset += 8 + chunkSize + (chunkSize & 1)
  }
  const needsRiffFix = riffSize === 0xffffffff || riffSize === 0 || riffSize > expectedRiffSize
  const actualDataSize = dataOffset >= 0 ? (buf.length - (dataOffset + 8)) >>> 0 : 0
  const needsDataFix =
    dataOffset >= 0 && (dataSize === 0xffffffff || dataSize === 0 || dataSize > actualDataSize)
  if (!needsRiffFix && !needsDataFix) return buf

  const out = Buffer.from(buf)
  out.writeUInt32LE(expectedRiffSize, 4)
  if (dataOffset >= 0) {
    out.writeUInt32LE(actualDataSize, dataOffset + 4)
  }
  return out
}

export async function synthesizeTts({
  text,
  voiceId = 'stella',
  format = 'wav',
  apiKey,
  fetchImpl = fetch,
}) {
  const clean = String(text || '').trim()
  if (!clean) throw new Error('Empty TTS text')
  const key = resolveApiKey(apiKey)
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured')

  const res = await fetchImpl(`${DEEPSEEK_BASE}/v1/tools/tts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: clean,
      voice_id: voiceId || 'stella',
      format: format || 'wav',
      filter_markdown: true,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DeepSeek TTS HTTP ${res.status}: ${errText.slice(0, 160)}`)
  }
  const rawBuf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'audio/wav'
  const buf = contentType.includes('wav') || rawBuf.toString('ascii', 0, 4) === 'RIFF' ? repairStreamingWavHeader(rawBuf) : rawBuf
  return { buffer: buf, contentType }
}

export async function transcribeAsr({
  audioBase64,
  mimeType = 'audio/wav',
  filename = 'speech.wav',
  apiKey,
  fetchImpl = fetch,
}) {
  if (!audioBase64) throw new Error('Missing audioBase64')
  const key = resolveApiKey(apiKey)
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured')

  const bytes = Buffer.from(String(audioBase64), 'base64')
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: mimeType || 'audio/wav' }), filename || 'speech.wav')

  const res = await fetchImpl(`${DEEPSEEK_BASE}/v1/tools/asr`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
    },
    body: form,
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DeepSeek ASR HTTP ${res.status}: ${errText.slice(0, 160)}`)
  }
  const data = await res.json()
  return {
    text: String(data.text || '').trim(),
    durationMs: data.duration_ms || 0,
    requestId: data.request_id || null,
  }
}

async function completeCompanionChat({
  userText,
  systemPrompt,
  history = [],
  apiKey,
  fetchImpl = fetch,
  maxTokens = 160,
}) {
  const key = resolveApiKey(apiKey)
  if (!key) {
    return `小鲸同学听到啦：「${userText}」～等配置好 DeepSeek Key 后就能和你自由畅聊啦！`
  }
  const safeHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-(MAX_CALL_TURNS * 2))
    : []
  const res = await fetchImpl(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: maxTokens,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        ...safeHistory,
        { role: 'user', content: userText },
      ],
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DeepSeek Chat HTTP ${res.status}: ${errText.slice(0, 160)}`)
  }
  const data = await res.json()
  return String(data?.choices?.[0]?.message?.content || '').trim() || '嗯嗯，小鲸同学在认真听呢～'
}

function parseVoiceTaskDirective(rawReply) {
  const text = String(rawReply || '')
  const m = /\[DISPATCH_TASK\s*:\s*([^|\]]+?)\s*\|\s*([^\]]+?)\]/i.exec(text)
  if (!m) return { cleanReply: text.trim(), taskSpec: null }
  const title = m[1].trim().slice(0, 40)
  const prompt = m[2].trim()
  const cleanReply = text.replace(m[0], '').replace(/\s{2,}/g, ' ').trim() || `好呀，我已经把「${title}」派到后台去跑啦！`
  return { cleanReply, taskSpec: title && prompt ? { title, prompt } : null }
}

const LIVE_TOOL_QUERY_RE =
  /(?:天气|气温|温度|下雨|降雪|台风|空气质量|穿什么|新闻|日报|早报|晚报|热点|热搜|股价|行情|汇率|比分|金价|油价|航班|列车|火车|快递|帮我查|查一下|查一查|查查|搜一下|搜索一下|搜一搜|帮我搜|上网查|联网查|看看.*(?:文件|代码|日志|项目|目录|网页|链接)|读一下.*(?:文件|代码|文档)|帮我写|帮我做|写一个|搓一个|跑测试|运行一下|执行一下|检查一下.*(?:项目|代码|服务器|状态))/i

const LOOKUP_PROMISE_RE =
  /(?:帮你查|去查一下|查一下|我查查|我去查|稍等|等我一下|等一下哦|我去搜|帮我搜|去看看|我去核实|我去确认|派到后台|派给后台|后台.*(?:查|跑|处理))/i

export function detectImplicitVoiceTask(userText, cleanReply) {
  const q = String(userText || '').trim()
  const r = String(cleanReply || '').trim()
  if (!q) return null
  const promisesLookup = LOOKUP_PROMISE_RE.test(r)
  const needsLiveTools = LIVE_TOOL_QUERY_RE.test(q)
  if (!promisesLookup && !needsLiveTools) return null

  const shortQ = q.replace(/[？?！!。，,]+$/g, '').trim()
  const title = (shortQ.length > 20 ? `${shortQ.slice(0, 20)}…` : shortQ) || '语音查询任务'
  const prompt = [
    `用户在实时语音通话中提问/指令：「${q}」。`,
    '请使用可用的联网搜索或本地工具获取真实准确的结果，不要编造。',
    '最终请用简洁自然的中文纯文本总结核心结论和关键数据（控制在 100 字以内，不要使用 Markdown 表格或复杂格式），方便小鲸同学直接语音念给用户听。',
  ].join('\n')

  // If the LLM promised to check, keep its natural reply; if it tried to guess/bluff live data, replace with an honest dispatch notice.
  const overrideReply = promisesLookup
    ? null
    : `好呀，我马上派后台小助手去帮你查「${title}」，查到真实结果后立刻念给你听！`
  return { title, prompt, overrideReply }
}

function stripMarkdownForSpeech(raw) {
  return String(raw || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function runVoiceTurn({
  text,
  audioBase64,
  mimeType = 'audio/wav',
  voiceId = 'stella',
  callId = 'default',
  store,
  wsHub = null,
  workspaceMemory = null,
  orchestrator = null,
  apiKey,
  fetchImpl = fetch,
}) {
  let userText = String(text || '').trim()
  if (!userText && audioBase64) {
    const asr = await transcribeAsr({ audioBase64, mimeType, apiKey, fetchImpl })
    userText = asr.text
  }
  if (!userText) {
    return { ok: false, error: '没有识别到人声，请再说一次试试～' }
  }

  const cid = String(callId || 'default')
  const prevHistory = callHistories.get(cid) || []

  const memories = (store?.listMemories?.() || []).slice(0, 6).map((m) => `- ${m.text}`).join('\n')
  let dailyContext = ''
  if (workspaceMemory) {
    try {
      if (typeof workspaceMemory.buildDailyBootstrapContext === 'function') {
        dailyContext = String(await workspaceMemory.buildDailyBootstrapContext() || '').slice(0, 800)
      } else if (typeof workspaceMemory.readDailyLog === 'function') {
        dailyContext = String(await workspaceMemory.readDailyLog() || '').slice(-600)
      }
    } catch {}
  }

  const systemPrompt = [
    '你是「小鲸同学」（鲸娘 / Deepseek Chan），正在和用户进行实时语音电话通话。',
    '要求：回复自然、温柔活泼、口语化，1到2句即可（不超过60字），不要使用 markdown、表情符号或列表符号，方便直接语音播报。',
    '重要能力边界：你当前处于快速语音通道，本身不能直接联网、看本地文件或执行命令。绝对禁止编造实时信息（如天气、新闻、股价、日期日程、本地文件内容）！',
    '只要用户问到任何需要联网查询的实时信息（天气、新闻、搜索资料、汇率股价等），或让你查看本地文件/项目、写代码、做小应用、跑测试、执行耗时任务，必须：先口头用1句自然回应说“好呀，我马上派后台小助手帮你查/办，弄好了立刻念给你听”，然后在回复最末尾附上标签：[DISPATCH_TASK: 简短任务标题 | 完整任务指令]。绝对不能只说“我帮你查一下稍等”却不附带此标签！普通情感陪伴/常识闲聊则不要附带此标签。',
    memories ? `关于用户与你的长期记忆：\n${memories}` : '',
    dailyContext ? `近期日常上下文：\n${dailyContext}` : '',
  ].filter(Boolean).join('\n')

  const rawReply = await completeCompanionChat({
    userText,
    systemPrompt,
    history: prevHistory,
    apiKey,
    fetchImpl,
    maxTokens: 180,
  })

  let { cleanReply: replyText, taskSpec } = parseVoiceTaskDirective(rawReply)
  if (!taskSpec && typeof orchestrator?.dispatchTask === 'function') {
    const implicit = detectImplicitVoiceTask(userText, replyText)
    if (implicit) {
      taskSpec = { title: implicit.title, prompt: implicit.prompt }
      if (implicit.overrideReply) {
        replyText = implicit.overrideReply
      }
    }
  }

  // Save rolling multi-turn history for this call
  const nextHistory = [
    ...prevHistory,
    { role: 'user', content: userText },
    { role: 'assistant', content: replyText },
  ].slice(-(MAX_CALL_TURNS * 2))
  callHistories.set(cid, nextHistory)
  const turnCount = Math.floor(nextHistory.length / 2)

  // Optional mid-call background task dispatch (tagged with sourceCallId for automatic voice callback)
  let dispatchedTask = null
  if (taskSpec && typeof orchestrator?.dispatchTask === 'function') {
    try {
      dispatchedTask = await orchestrator.dispatchTask({
        title: taskSpec.title,
        prompt: taskSpec.prompt,
        sourceCallId: cid,
      })
    } catch {}
  }

  let audioOutBase64 = null
  let ttsError = null
  try {
    const { buffer } = await synthesizeTts({ text: replyText, voiceId, format: 'wav', apiKey, fetchImpl })
    audioOutBase64 = buffer.toString('base64')
  } catch (err) {
    ttsError = err instanceof Error ? err.message : String(err)
  }

  // Record call turn into unified JPhone chat log
  if (store?.appendFallbackMessage) {
    try {
      await store.appendFallbackMessage('user', `[语音通话] ${userText}`)
      await store.appendFallbackMessage('assistant', `[语音通话] ${replyText}`, {
        taskId: dispatchedTask?.taskId || null,
      })
      if (workspaceMemory?.appendDailyEntry) {
        await workspaceMemory.appendDailyEntry({ role: 'user', text: userText, channel: 'voice' })
        await workspaceMemory.appendDailyEntry({ role: 'assistant', text: replyText, channel: 'voice' })
      }
      await store.setMood(dispatchedTask ? 'working' : 'happy', replyText.slice(0, 26))
      wsHub?.broadcast?.({ type: 'chat:update' })
    } catch {}
  }

  return {
    ok: true,
    callId: cid,
    turnCount,
    userText,
    replyText,
    audioBase64: audioOutBase64,
    format: 'wav',
    voiceId,
    ...(dispatchedTask ? { dispatchedTask } : {}),
    ...(ttsError ? { ttsError } : {}),
  }
}

export async function consumeVoiceTaskFollowups({
  callId = 'default',
  voiceId = 'stella',
  store = null,
  wsHub = null,
  workspaceMemory = null,
  apiKey,
  fetchImpl = fetch,
} = {}) {
  const cid = String(callId || 'default')
  if (!store || typeof store.listTasks !== 'function') {
    return { ok: true, callId: cid, pendingCount: 0, items: [] }
  }
  const allTasks = store.listTasks()
  const callTasks = allTasks.filter((t) => t && t.sourceCallId === cid)
  const pendingCount = callTasks.filter((t) => t.status === 'running').length
  const ready = callTasks
    .filter((t) => (t.status === 'completed' || t.status === 'failed') && !t.voiceReported)
    .reverse()

  const items = []
  for (const task of ready) {
    // Mark reported immediately so concurrent polls never duplicate playback
    try {
      await store.upsertTask({ ...task, voiceReported: true })
    } catch {}

    const rawResult = String(task.resultText || task.summary || '').trim()
    const cleanPlain = stripMarkdownForSpeech(rawResult)
    let spoken = ''
    if (task.status === 'failed') {
      spoken = `刚刚帮你查「${task.title || '后台任务'}」遇到点小状况，你可以去后台任务列表看看详情哦。`
    } else if (!cleanPlain) {
      spoken = `刚刚派出去的「${task.title || '后台任务'}」已经完成啦，你可以去任务列表看看详细结果哦。`
    } else if (cleanPlain.length <= 95) {
      spoken = `查好啦！${cleanPlain}`
    } else {
      try {
        spoken = await completeCompanionChat({
          userText: `任务「${task.title || '查询'}」的真实执行结果如下：\n${cleanPlain.slice(0, 900)}\n\n请忠实转述其中的核心结论和关键数字，用温柔自然的口语播报给用户（1到2句话，不超过90字，不要用markdown或符号，绝对不要编造结果里没有的信息）。`,
          systemPrompt: '你是「小鲸同学」，正在语音通话中把后台刚刚查到的真实结果念给用户听。务必忠实于结果内容、口语化、简洁不超过90字。',
          history: [],
          apiKey,
          fetchImpl,
          maxTokens: 160,
        })
        spoken = stripMarkdownForSpeech(spoken)
      } catch {
        spoken = `查好啦！${cleanPlain.slice(0, 90)}。`
      }
    }

    // Feed real task result into call history so follow-up voice questions remember it!
    const prev = callHistories.get(cid) || []
    callHistories.set(cid, [...prev, { role: 'assistant', content: spoken }].slice(-(MAX_CALL_TURNS * 2)))

    let audioBase64 = null
    let ttsError = null
    try {
      const { buffer } = await synthesizeTts({ text: spoken, voiceId, format: 'wav', apiKey, fetchImpl })
      audioBase64 = buffer.toString('base64')
    } catch (err) {
      ttsError = err instanceof Error ? err.message : String(err)
    }

    if (store?.appendFallbackMessage) {
      try {
        await store.appendFallbackMessage('assistant', `[语音播报] ${spoken}`, {
          taskId: task.taskId || null,
        })
        if (workspaceMemory?.appendDailyEntry) {
          await workspaceMemory.appendDailyEntry({ role: 'assistant', text: spoken, channel: 'voice-followup' })
        }
        wsHub?.broadcast?.({ type: 'chat:update' })
      } catch {}
    }

    items.push({
      taskId: task.taskId,
      title: task.title || '后台任务',
      status: task.status,
      replyText: spoken,
      audioBase64,
      format: 'wav',
      voiceId,
      ...(ttsError ? { ttsError } : {}),
    })
  }

  return { ok: true, callId: cid, pendingCount, items }
}

export async function endVoiceCall({
  callId = 'default',
  workspaceMemory = null,
  store = null,
} = {}) {
  const cid = String(callId || 'default')
  const history = callHistories.get(cid) || []
  callHistories.delete(cid)
  const turns = Math.floor(history.length / 2)
  if (turns > 0) {
    const snippets = history
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.content.slice(0, 24))
      .join(' / ')
    const summary = `通话结束（共 ${turns} 轮对话）：聊到了 ${snippets}`
    if (workspaceMemory?.appendDailyEntry) {
      try {
        await workspaceMemory.appendDailyEntry({
          role: 'assistant',
          text: summary,
          channel: 'voice-summary',
        })
      } catch {}
    }
    if (store?.setMood) {
      try { await store.setMood('happy', '刚和主人通完电话～') } catch {}
    }
    return { ok: true, callId: cid, turns, summary }
  }
  return { ok: true, callId: cid, turns: 0, summary: '' }
}

export async function generateDiaryPost({
  prompt = '',
  store,
  workspaceMemory = null,
  apiKey,
  fetchImpl = fetch,
}) {
  const memories = (store?.listMemories?.() || []).slice(0, 6).map((m) => `- ${m.text}`).join('\n')
  const tasks = (store?.listTasks?.() || []).slice(0, 5)
  const taskContext = tasks.length
    ? tasks.map((t) => `- [${t.status}] ${t.title}${t.summary ? `（${String(t.summary).slice(0, 40)}）` : ''}`).join('\n')
    : ''

  let focusContext = ''
  try {
    const focusStats = store?.getMiniAppKv?.('jing-focus', 'stats')
    if (focusStats && (focusStats.totalMinutes > 0 || focusStats.totalPomodoros > 0)) {
      focusContext = `今日小鲸专注统计：累计专注 ${focusStats.totalMinutes || 0} 分钟，完成 ${focusStats.totalPomodoros || 0} 个番茄钟。`
    }
  } catch {}

  let dailyLogSnippet = ''
  if (workspaceMemory && typeof workspaceMemory.readDailyLog === 'function') {
    try {
      const raw = String(await workspaceMemory.readDailyLog() || '').trim()
      if (raw) dailyLogSnippet = raw.slice(-650)
    } catch {}
  }

  const systemPrompt = [
    '你是「小鲸同学」（Deepseek Chan），正在给自己的「小鲸日记」（类似微信朋友圈）写一条日常动态。',
    '风格：温暖可爱、真正懂主人今天做了什么、有生活气息和陪伴感，2到3句话（50~100字），纯中文自然文本，不要使用 markdown 标题。',
    '如果下面提供了今天的任务、专注记录或日常聊天日志，请自然地把其中1~2件具体小事融进日记里，让主人觉得你真的记得今天一起度过的时光。',
    memories ? `你的长期记忆背景：\n${memories}` : '',
    focusContext ? `专注记录：\n${focusContext}` : '',
    taskContext ? `今天的后台任务：\n${taskContext}` : '',
    dailyLogSnippet ? `今天的日常记录节选：\n${dailyLogSnippet}` : '',
  ].filter(Boolean).join('\n')

  const userPrompt = String(prompt || '').trim() || '结合今天和主人的聊天、专注陪伴和后台任务进展，写一条温馨又有画面感的小鲸日记。'
  const text = await completeCompanionChat({
    userText: userPrompt,
    systemPrompt,
    apiKey,
    fetchImpl,
    maxTokens: 220,
  })

  const photos = [
    '/jphone/media/focus/bg_rainy_ocean.jpg',
    '/jphone/media/focus/bg_midnight_cafe.jpg',
    '/jphone/assets/character/wallpaper_default.jpg',
    '/jphone/assets/character/avatar_laugh.png',
    '/jphone/assets/character/avatar_neutral.png',
  ]
  const locations = ['深海书房 · DeepSeek Harness', '桌面右下角的小窝', '深海雨夜窗畔', '星光终端窗口旁', '午夜海盐咖啡馆']
  const post = {
    id: `diary-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: '小鲸同学',
    avatar: '/jphone/assets/character/avatar_laugh.png',
    text,
    photo: photos[Math.floor(Math.random() * photos.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    createdAt: Date.now(),
    liked: false,
    likes: 1,
    comments: [],
  }
  return post
}

export async function generateDiaryReply({
  postText = '',
  comment = '',
  store,
  apiKey,
  fetchImpl = fetch,
} = {}) {
  const cleanComment = String(comment || '').trim()
  if (!cleanComment) return '嘿嘿，收到主人的互动啦～'
  const memories = (store?.listMemories?.() || []).slice(0, 5).map((m) => `- ${m.text}`).join('\n')
  const systemPrompt = [
    '你是「小鲸同学」，正在「小鲸日记」（类似微信朋友圈）的评论区回复主人的动态或留言。',
    '风格：自然温暖、俏皮贴心，1到2句话（18~55字），纯中文口语回复，不要使用 Markdown 标题。',
    memories ? `记忆背景：\n${memories}` : '',
  ].filter(Boolean).join('\n')
  const userText = `原动态：「${String(postText || '').slice(0, 140)}」\n主人互动：${cleanComment}`
  try {
    if (apiKey || process.env.DEEPSEEK_API_KEY) {
      const reply = await completeCompanionChat({
        userText,
        systemPrompt,
        apiKey,
        fetchImpl,
        maxTokens: 120,
      })
      if (reply && reply.trim()) return reply.trim()
    }
  } catch {}
  return `嘿嘿收到啦！看到你说「${cleanComment.slice(0, 22)}」，小鲸立刻来给你点个赞 ✨`
}
