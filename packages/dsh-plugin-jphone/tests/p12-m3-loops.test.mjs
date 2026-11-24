import { existsSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import { runVoiceTurn, consumeVoiceTaskFollowups, endVoiceCall, generateDiaryPost } from '../lib/voice.mjs'
import { JING_FOCUS_MINIAPP_HTML } from '../lib/focus-miniapp.mjs'

test('M3 Voice: rolling multi-turn history, daily memory injection, [DISPATCH_TASK] & hangup summary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m3-voice-'))
  try {
    const store = await JPhoneStore.open(dir)
    const capturedRequests = []
    const dispatched = []
    const dailyEntries = []

    const workspaceMemory = {
      async appendDailyEntry(entry) { dailyEntries.push(entry) },
      async buildDailyBootstrapContext() { return '今日记忆摘要：上午调试了 Flutter 壁纸。' },
      async readDailyLog() { return '## 今日记录\n- 完成了 M2 透明立绘与壁纸调试' },
    }
    const orchestrator = {
      workspaceMemory,
      async dispatchTask(opts) {
        const task = { taskId: 'task-voice-1', sessionId: 'sess-v1', ...opts, status: 'running' }
        dispatched.push(task)
        return task
      },
    }

    let turnNum = 0
    const mockFetch = async (url, init) => {
      const sUrl = String(url)
      if (sUrl.includes('/chat/completions')) {
        turnNum += 1
        const body = JSON.parse(init.body)
        capturedRequests.push(body)
        const content = turnNum === 1
          ? '好呀，刚才壁纸调得可好看了！你还想聊点什么呀？'
          : '明白啦，我马上去后台帮你写个脚本！[DISPATCH_TASK: 整理日志脚本 | 写一个脚本把今天的日志按时间排序]'
        return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (sUrl.includes('/audio/speech')) {
        return new Response(Buffer.from('RIFF....WAVEfmt '), { status: 200 })
      }
      throw new Error(`Unexpected fetch URL: ${sUrl}`)
    }

    const r1 = await runVoiceTurn({
      text: '小鲸，我们刚才在干嘛来着？',
      callId: 'call-m3-1',
      store,
      workspaceMemory,
      orchestrator,
      apiKey: 'sk-test-m3',
      fetchImpl: mockFetch,
    })
    assert.equal(r1.ok, true)
    assert.equal(r1.turnCount, 1)
    assert.match(capturedRequests[0].messages[0].content, /调试了 Flutter 壁纸/)

    const r2 = await runVoiceTurn({
      text: '那顺便帮我写个整理日志的脚本吧',
      callId: 'call-m3-1',
      store,
      workspaceMemory,
      orchestrator,
      apiKey: 'sk-test-m3',
      fetchImpl: mockFetch,
    })
    assert.equal(r2.ok, true)
    assert.equal(r2.turnCount, 2)
    // Turn 2 must include turn 1's user + assistant messages in rolling history!
    assert.ok(
      capturedRequests[1].messages.some((m) => m.role === 'user' && m.content.includes('刚才在干嘛')),
      'turn 2 must carry turn 1 user message in history'
    )
    assert.ok(
      capturedRequests[1].messages.some((m) => m.role === 'assistant' && m.content.includes('壁纸调得可好看了')),
      'turn 2 must carry turn 1 assistant message in history'
    )
    // [DISPATCH_TASK] tag must be stripped from spoken reply and dispatched via orchestrator
    assert.doesNotMatch(r2.replyText, /DISPATCH_TASK/)
    assert.equal(dispatched.length, 1)
    assert.equal(dispatched[0].title, '整理日志脚本')
    assert.equal(r2.dispatchedTask?.taskId, 'task-voice-1')

    const endRes = await endVoiceCall({ callId: 'call-m3-1', workspaceMemory })
    assert.equal(endRes.ok, true)
    assert.equal(endRes.turns, 2)
    assert.ok(
      dailyEntries.some((e) => e.channel === 'voice-summary' && e.text.includes('通话结束')),
      'endVoiceCall should write a summary entry into daily memory'
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M3 Diary: generateDiaryPost reads daily log, tasks & focus stats, and jing-diary auto-triggers Xiaojing reply', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m3-diary-'))
  try {
    const store = await JPhoneStore.open(dir)
    await store.upsertTask({ taskId: 't1', sessionId: 's1', title: '修复透明视频抠图', status: 'done', summary: '全部边缘清理完毕' })
    await store.setMiniAppKv('jing-focus', 'stats', { totalMinutes: 75, totalPomodoros: 3 })

    let capturedBody = null
    const mockFetch = async (_url, init) => {
      capturedBody = JSON.parse(init.body)
      return new Response(JSON.stringify({
        choices: [{ message: { content: '今天陪主人专注了75分钟还修好了透明视频抠图，海盐乌龙茶都显得格外香甜～' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const workspaceMemory = {
      async readDailyLog() { return '今天一起完成了小鲸专注的静谧高定改版。' },
    }
    const post = await generateDiaryPost({
      store,
      workspaceMemory,
      apiKey: 'sk-test-m3',
      fetchImpl: mockFetch,
    })
    assert.ok(post.text.includes('75分钟'))
    const promptCombined = capturedBody.messages.map((m) => m.content).join('\n')
    assert.match(promptCombined, /修复透明视频抠图/)
    assert.match(promptCombined, /75/)
    assert.match(promptCombined, /静谧高定改版/)

    const diaryApp = store.getMiniApp('jing-diary')
    assert.ok(diaryApp, 'jing-diary should exist')
    assert.match(diaryApp.html, /\/jphone\/api\/diary\/reply/, 'jing-diary should call diary reply endpoint')
    assert.match(diaryApp.html, /autoXiaojingInteract|autoReplyUserPost/, 'jing-diary should auto like/comment when user posts')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M3 Orchestrator: heavy background task dispatch does NOT duplicate-send prompt to main session', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-m3-orch-'))
  try {
    const store = await JPhoneStore.open(dir)
    const prompts = []
    let seq = 0
    const sessionController = {
      async create({ workspaceId }) {
        seq += 1
        return { sessionId: `sess-${seq}`, workspaceId }
      },
      async prompt(args) {
        prompts.push(args)
        return { ok: true }
      },
      async rename() {},
    }
    const orch = new JPhoneOrchestrator({
      store,
      sessionController,
      workspaceDir: join(dir, 'ws'),
    })

    const res = await orch.sendChat('帮我写一个番茄钟统计小应用')
    assert.ok(res.dispatchedTask, 'heavy task should dispatch background task')
    assert.equal(res.routedToDsh, false, 'should NOT also route duplicate heavy prompt to main session')
    assert.equal(prompts.length, 1, 'sessionController.prompt should be called exactly once (worker only)')
    assert.equal(prompts[0].sessionId, res.dispatchedTask.sessionId)

    // Normal chat still routes to main session
    const res2 = await orch.sendChat('今晚月色真美')
    assert.equal(res2.dispatchedTask, null)
    assert.equal(res2.routedToDsh, true)
    assert.equal(prompts.length, 2)
    assert.equal(prompts[1].sessionId, res2.mainSessionId)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('M3 Host Focus & Audio Ducking: index.html + focus-miniapp.mjs support persistent host Pomodoro and call ducking', async () => {
  const appWebHtml = join(import.meta.dirname, '../../../app/web/index.html')
  const indexHtml = await readFile(existsSync(appWebHtml) ? appWebHtml : join(import.meta.dirname, '../web-dist/index.html'), 'utf8')
  assert.match(indexHtml, /window\.__jphoneFocus\s*=/, 'index.html should expose host-level window.__jphoneFocus')
  assert.match(indexHtml, /duckForCall/, 'window.__jphoneMedia should support duckForCall')
  assert.match(indexHtml, /unduckFromCall/, 'window.__jphoneMedia should support unduckFromCall')
  assert.match(indexHtml, /focus_done/, 'host Pomodoro should trigger focus_done ServerChan notification')
  assert.match(JING_FOCUS_MINIAPP_HTML, /__jphoneFocus/, 'focus-miniapp.mjs should sync with host window.__jphoneFocus')
})

test('Voice lookup auto-dispatches DSH task when LLM forgets [DISPATCH_TASK] and speaks back completed result via followups', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-voice-lookup-'))
  try {
    const store = await JPhoneStore.open(dir)
    const orch = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })

    const mockFetch = async (url) => {
      const sUrl = String(url)
      if (sUrl.includes('/chat/completions')) {
        return new Response(
          JSON.stringify({ choices: [{ message: { content: '我帮你查一下重庆今天的天气，稍等哦。' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (sUrl.includes('/v1/tools/tts')) {
        return new Response(Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ', 'binary'), {
          status: 200,
          headers: { 'content-type': 'audio/wav' },
        })
      }
      throw new Error(`Unexpected URL: ${sUrl}`)
    }

    const r1 = await runVoiceTurn({
      text: '重庆今天的天气怎么样？',
      callId: 'call-weather-1',
      store,
      orchestrator: orch,
      apiKey: 'sk-test-weather',
      fetchImpl: mockFetch,
    })
    assert.equal(r1.ok, true)
    assert.ok(r1.dispatchedTask, 'weather query must auto-dispatch background task even without explicit tag')
    assert.equal(r1.dispatchedTask.sourceCallId, 'call-weather-1')

    // While still running, followups reports pendingCount=1, items=[]
    const fPending = await consumeVoiceTaskFollowups({
      callId: 'call-weather-1',
      store,
      apiKey: 'sk-test-weather',
      fetchImpl: mockFetch,
    })
    assert.equal(fPending.pendingCount, 1)
    assert.equal(fPending.items.length, 0)

    // Simulate DSH task completion with real weather result
    await store.upsertTask({
      ...r1.dispatchedTask,
      status: 'completed',
      summary: '重庆今天阴转多云，气温 13 到 19 度，微风。',
      resultText: '重庆今天阴转多云，气温 13 到 19 度，微风。',
    })

    const fDone = await consumeVoiceTaskFollowups({
      callId: 'call-weather-1',
      store,
      apiKey: 'sk-test-weather',
      fetchImpl: mockFetch,
    })
    assert.equal(fDone.pendingCount, 0)
    assert.equal(fDone.items.length, 1)
    assert.match(fDone.items[0].replyText, /13 到 19 度/)
    assert.ok(fDone.items[0].audioBase64, 'followup must synthesize TTS audio')

    // Second poll must NOT duplicate already-reported task
    const fSecond = await consumeVoiceTaskFollowups({
      callId: 'call-weather-1',
      store,
      apiKey: 'sk-test-weather',
      fetchImpl: mockFetch,
    })
    assert.equal(fSecond.items.length, 0)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('Daily chat isolation: listMessages(today) excludes yesterday messages even before today text session starts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-daily-chat-'))
  try {
    const store = await JPhoneStore.open(dir)
    const orch = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })

    // Simulate yesterday (2026-11-23) session & messages
    await store.setMainSession('sess-2026-11-23', join(dir, 'ws'), { dateKey: '2026-11-23' })
    await store.appendFallbackMessage('user', '昨天发的消息不应该出现在今天', { dateKey: '2026-11-23' })
    await store.appendFallbackMessage('assistant', '昨天的回复也不应该出现在今天', { dateKey: '2026-11-23' })

    // Today (2026-11-24) before any message -> fresh daily greeting only, NO yesterday messages
    const morningMsgs = await orch.listMessages({ dateKey: '2026-11-24' })
    assert.equal(morningMsgs.length, 1)
    assert.match(morningMsgs[0].text, /2026-11-24/)
    assert.ok(!morningMsgs.some((m) => m.text.includes('昨天')))

    // Today (2026-11-24) after a voice call -> ONLY today's messages appear
    await store.appendFallbackMessage('user', '[语音通话] 今天的新消息', { dateKey: '2026-11-24' })
    const todayMsgs = await orch.listMessages({ dateKey: '2026-11-24' })
    assert.equal(todayMsgs.length, 1)
    assert.equal(todayMsgs[0].text, '[语音通话] 今天的新消息')
    assert.ok(!todayMsgs.some((m) => m.text.includes('昨天')))

    // Yesterday's messages are still queryable explicitly by date
    const yestMsgs = await orch.listMessages({ dateKey: '2026-11-23' })
    assert.ok(yestMsgs.some((m) => m.text.includes('昨天发的消息')))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
