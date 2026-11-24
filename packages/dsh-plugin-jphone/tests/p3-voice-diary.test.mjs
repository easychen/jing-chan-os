import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { JPhoneStore } from '../lib/store.mjs'
import { JPhoneOrchestrator } from '../lib/orchestrator.mjs'
import { createJPhoneHttpHandler } from '../lib/http.mjs'
import { repairStreamingWavHeader } from '../lib/voice.mjs'

test('P3 ships pre-installed 小鲸日记 Mini-App and proxies DeepSeek ASR/TTS/VoiceTurn & Diary generation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jphone-p3-'))
  const store = await JPhoneStore.open(dir)
  const orchestrator = new JPhoneOrchestrator({ store, workspaceDir: join(dir, 'ws') })

  // Verify 小鲸日记 is pre-installed and uses window.jing
  const diaryApp = store.getMiniApp('jing-diary')
  assert.ok(diaryApp, '小鲸日记 should be pre-installed')
  assert.equal(diaryApp.name, '小鲸日记')
  assert.ok(diaryApp.html.includes('window.jing'))

  // Mock DeepSeek fetch for deterministic TDD testing
  const fakeWav = Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ', 'binary')
  const calls = []
  const mockFetch = async (url, opts) => {
    calls.push({ url: String(url), method: opts?.method })
    if (String(url).includes('/v1/tools/tts')) {
      return new Response(fakeWav, { status: 200, headers: { 'content-type': 'audio/wav' } })
    }
    if (String(url).includes('/v1/tools/asr')) {
      return new Response(JSON.stringify({ request_id: 'r1', text: '小鲸今天开心吗', duration_ms: 1200 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (String(url).includes('/chat/completions')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: '超开心的呀！刚帮主人整理完桌面壁纸呢～' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('not found', { status: 404 })
  }

  const handler = createJPhoneHttpHandler({
    store,
    orchestrator,
    voiceConfig: { apiKey: 'sk-test-mock', fetchImpl: mockFetch },
  })
  const server = http.createServer(async (req, res) => { await handler(req, res) })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  try {
    // 1. TTS proxy returns audio/wav
    const ttsRes = await fetch(`${base}/jphone/api/voice/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '你好呀', voice_id: 'stella' }),
    })
    assert.equal(ttsRes.status, 200)
    assert.ok(ttsRes.headers.get('content-type').includes('audio/wav'))
    assert.deepEqual(Buffer.from(await ttsRes.arrayBuffer()), fakeWav)

    // 2. ASR proxy returns recognized text
    const asrRes = await fetch(`${base}/jphone/api/voice/asr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: fakeWav.toString('base64') }),
    }).then((r) => r.json())
    assert.equal(asrRes.ok, true)
    assert.equal(asrRes.text, '小鲸今天开心吗')

    // 3. Full Voice Turn (ASR -> Chat -> TTS)
    const turnRes = await fetch(`${base}/jphone/api/voice/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: fakeWav.toString('base64'), voiceId: 'stella' }),
    }).then((r) => r.json())
    assert.equal(turnRes.ok, true)
    assert.equal(turnRes.userText, '小鲸今天开心吗')
    assert.ok(turnRes.replyText.includes('超开心'))
    assert.equal(Buffer.from(turnRes.audioBase64, 'base64').toString('binary'), fakeWav.toString('binary'))

    // 4. Diary generation endpoint
    const diaryGen = await fetch(`${base}/jphone/api/diary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '记录一下今天和主人一起调试新功能' }),
    }).then((r) => r.json())
    assert.equal(diaryGen.ok, true)
    assert.ok(diaryGen.post.text.length > 0)
  } finally {
    server.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('repairStreamingWavHeader fixes DeepSeek streaming WAV 0xFFFFFFFF RIFF & data chunk sizes', () => {
  const pcm = Buffer.alloc(1600, 0x11)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(0xffffffff, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(24000, 24)
  header.writeUInt32LE(48000, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(0xffffffff, 40)

  const streamingWav = Buffer.concat([header, pcm])
  const fixed = repairStreamingWavHeader(streamingWav)
  assert.equal(fixed.length, streamingWav.length)
  assert.equal(fixed.readUInt32LE(4), streamingWav.length - 8)
  assert.equal(fixed.readUInt32LE(40), pcm.length)
  assert.deepEqual(fixed.subarray(44), pcm)
})
