import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { stat, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'

const execFileAsync = promisify(execFile)

export function isStackedAlphaFilename(name) {
  return /[-_](stacked|alpha[-_]?stack|sbs[-_]?alpha)\.(mp4|webm|mov)$/i.test(String(name || '').trim())
}

/**
 * Inspect a local video file with ffprobe to detect whether it carries an alpha channel.
 * Fast-paths tiny/placeholder buffers (< 4KB) so unit tests never pay subprocess overhead.
 */
export async function probeVideoAlphaCodec(filePath) {
  try {
    const st = await stat(filePath)
    if (!st.isFile() || st.size < 4096) return null
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,pix_fmt:stream_tags=alpha_mode',
      '-of', 'json',
      filePath,
    ], { timeout: 6000 })
    const parsed = JSON.parse(stdout || '{}')
    const stream = Array.isArray(parsed.streams) ? parsed.streams[0] : null
    if (!stream) return null
    const codec = String(stream.codec_name || '').toLowerCase()
    const pixFmt = String(stream.pix_fmt || '').toLowerCase()
    const alphaMode = String(stream.tags?.alpha_mode || stream.tags?.ALPHA_MODE || '')
    const hasAlpha = alphaMode === '1' || pixFmt.startsWith('yuva') || pixFmt.includes('rgba') || pixFmt.includes('bgra')
    return hasAlpha ? codec : null
  } catch {
    return null
  }
}

/**
 * Strategy B fallback: transcode a VP9/VP8+Alpha .webm into a vertically stacked-alpha H.264 .mp4
 * (top half = RGB, bottom half = grayscale alpha) so WebKit/Safari renders transparency via WebGL
 * even when no HEVC-with-Alpha .mov companion exists (works on macOS, Linux, and Windows).
 */
export async function transcodeToStackedAlphaMp4(srcPath, outPath, codec = 'vp9') {
  const decoder = codec === 'vp8' ? 'libvpx' : (codec === 'vp9' ? 'libvpx-vp9' : null)
  const inputArgs = decoder ? ['-c:v', decoder, '-i', srcPath] : ['-i', srcPath]
  const filter = [
    '[0:v]split[rgb][a]',
    '[rgb]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[rgb0]',
    '[a]alphaextract,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[a0]',
    '[rgb0][a0]vstack[out]',
  ].join(';')
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-loglevel', 'error',
      ...inputArgs,
      '-filter_complex', filter,
      '-map', '[out]',
      '-an',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '23',
      '-preset', 'veryfast',
      '-movflags', '+faststart',
      outPath,
    ], { timeout: 45_000 })
    const st = await stat(outPath)
    if (st.isFile() && st.size > 1024) return true
    await unlink(outPath).catch(() => {})
    return false
  } catch {
    await unlink(outPath).catch(() => {})
    return false
  }
}

/**
 * Given a stored custom/workshop focus video, build Strategy B stacked-alpha sidecar if no .mov exists.
 */
export async function ensureFocusVideoWebKitCompat(srcPath, { packDir, stem, hasMov = false } = {}) {
  if (hasMov) return {}
  if (isStackedAlphaFilename(srcPath)) {
    return { alphaLayout: 'stacked' }
  }
  const ext = extname(String(srcPath || '')).toLowerCase()
  if (ext !== '.webm') return {}
  const alphaCodec = await probeVideoAlphaCodec(srcPath)
  if (!alphaCodec) return {}
  const outName = `${stem}_stacked.mp4`
  const outPath = join(packDir, outName)
  const ok = await transcodeToStackedAlphaMp4(srcPath, outPath, alphaCodec)
  return ok ? { stackedFile: outName } : {}
}
