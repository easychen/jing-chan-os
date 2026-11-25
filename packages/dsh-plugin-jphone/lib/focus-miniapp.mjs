/**
 * 旗舰预装 Mini-App：「小鲸专注」v2 — Origo 级沉浸式影音专注空间
 * - 全屏氛围场景壁纸（深海雨夜 / 午夜咖啡馆）+ 现代极简悬浮大时钟
 * - 小鲸同学原创原生 VP9+Alpha（ALPHA_MODE=1）透明互动角色（呼吸/眨眼/摸头害羞反应）
 * - 宿主级后台持续音频引擎（window.jing.audio）：退出小鲸专注后白噪音与 Lo-Fi 持续后台播放
 * - 苹果音乐/Origo 风格玻璃悬浮播放器 + 上滑抽屉（场景 / 12 路白噪音混音 / Lo-Fi 专辑 / 番茄设置）
 */

export const FOCUS_NOISE_TRACKS = [
  { id: 'rain_light', name: '小雨', file: '小雨.mp3', emoji: '雨', defaultVol: 0.65 },
  { id: 'waves', name: '海浪', file: '海浪.mp3', emoji: '浪', defaultVol: 0.55 },
  { id: 'cafe', name: '咖啡馆', file: '咖啡馆.mp3', emoji: '咖', defaultVol: 0.50 },
  { id: 'fireplace', name: '炉火', file: '炉火.mp3', emoji: '火', defaultVol: 0.50 },
  { id: 'wind', name: '微风', file: '微风.mp3', emoji: '风', defaultVol: 0.45 },
  { id: 'stream', name: '小溪', file: '小溪.mp3', emoji: '溪', defaultVol: 0.50 },
  { id: 'snow', name: '雪夜', file: '雪夜.mp3', emoji: '雪', defaultVol: 0.45 },
  { id: 'rain_heavy', name: '大雨', file: '大雨.mp3', emoji: '暴', defaultVol: 0.40 },
  { id: 'birds', name: '鸟鸣', file: '鸟鸣.mp3', emoji: '鸟', defaultVol: 0.40 },
  { id: 'office', name: '办公室', file: '办公室.mp3', emoji: '办', defaultVol: 0.35 },
  { id: 'street', name: '市街', file: '市街.mp3', emoji: '街', defaultVol: 0.35 },
  { id: 'thunder', name: '雷鸣', file: '雷鸣.mp3', emoji: '鸣', defaultVol: 0.35 },
]

export const FOCUS_LOFI_TRACKS = [
  { id: 'lofi-rain-a', name: '雨的假设 A', en: 'Hypothesis of Rain A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_01_雨的假设A_Hypothesis_of_Rain.mp3' },
  { id: 'lofi-leaves-a', name: '叶的呼吸 A', en: 'Respiration of Leaves A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_03_叶的呼吸A_Respiration_of_Leaves.mp3' },
  { id: 'lofi-waves-a', name: '浪的层叠 A', en: 'Folding the Waves A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_05_浪的层叠A_Folding_the_Waves.mp3' },
  { id: 'lofi-embers-a', name: '篝火余烬 A', en: 'Embers of Civilization A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_07_篝火余烬A_Embers_of_Civilization.mp3' },
  { id: 'lofi-stars-a', name: '星空幻梦 A', en: 'Echoes from Light Years A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_11_星空幻梦A_Echoes_from_Light_Years.mp3' },
  { id: 'lofi-cafe-a', name: '午夜咖啡馆 A', en: 'Solace in Third Space A', albumId: 'echoes', album: '回声重映集', cover: '/jphone/media/focus/covers/echoes.jpg', file: '回声重映集_17_午夜咖啡馆A_Solace_in_Third_Space.mp3' },
]

export const JING_FOCUS_MINIAPP_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<meta name="jphone-header-bg" content="#0A1328" />
<meta name="jphone-header-style" content="light" />
<meta name="jphone-header-border" content="rgba(255,255,255,0.06)" />
<title>小鲸专注</title>
<style>
  :root {
    --accent: #38BDF8;
    --accent2: #818CF8;
    --warm: #F59E0B;
    --text: #F8FAFC;
    --sub: rgba(248,250,252,0.68);
    --glass: rgba(11, 19, 36, 0.56);
    --glass-border: rgba(255, 255, 255, 0.16);
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; }
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0A1328;
    color: var(--text);
    user-select: none;
  }

  /* 1. Full-bleed Atmospheric Scene Backdrop */
  .stage {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0A1328;
  }
  .bg-layer {
    position: absolute;
    inset: -8px;
    background-size: cover;
    background-position: center;
    transition: opacity 0.6s ease, transform 0.8s ease;
    transform: scale(1.03);
  }
  .bg-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg,
      rgba(10, 19, 40, 0.0) 0%,
      rgba(10, 19, 40, 0.08) 44%,
      rgba(7, 11, 22, 0.78) 100%);
    pointer-events: none;
    transition: opacity 0.42s ease;
  }
  .stage.immersive .bg-scrim {
    opacity: 0;
  }
  /* Subtle ambient rain / starlight shimmer */
  .ambient-glow {
    position: absolute;
    top: -40px;
    left: 50%;
    width: 280px;
    height: 180px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse at center, rgba(56,189,248,0.22), transparent 72%);
    pointer-events: none;
    animation: breatheGlow 5s ease-in-out infinite;
  }
  @keyframes breatheGlow {
    0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.95; transform: translateX(-50%) scale(1.1); }
  }

  /* 2. Frameless Transparent Active-Only Pomodoro Float (Hidden until started!) */
  .pomo-float {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    z-index: 14;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: transparent;
    border: none;
    box-shadow: none;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1), transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
    cursor: pointer;
    user-select: none;
  }
  .pomo-float.active {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }
  .stage.immersive .pomo-float {
    top: max(46px, calc(env(safe-area-inset-top, 0px) + 18px));
  }
  .stage.light-top .pomo-float-phase {
    color: rgba(15, 23, 42, 0.76);
    text-shadow: 0 1px 8px rgba(255, 255, 255, 0.65);
  }
  .stage.light-top .pomo-float-time {
    color: rgba(15, 23, 42, 0.92);
    text-shadow: 0 1px 10px rgba(255, 255, 255, 0.7);
  }
  .pomo-float-phase {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.6px;
    color: rgba(241, 245, 249, 0.72);
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.45);
  }
  .pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(186, 230, 253, 0.90);
    box-shadow: 0 0 8px rgba(186, 230, 253, 0.65);
  }
  .pill-dot.break { background: #A7F3D0; box-shadow: 0 0 8px rgba(167, 243, 208, 0.65); }
  .pill-dot.running { animation: pulseDot 1.8s ease-in-out infinite; }
  @keyframes pulseDot { 0%,100% { opacity: 0.95; } 50% { opacity: 0.28; } }
  .big-clock {
    font-size: 40px;
    font-weight: 200;
    letter-spacing: 1.5px;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.94);
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.42);
  }
  .pomo-float-ctrls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.22s ease, max-height 0.22s ease;
  }
  .pomo-float.show-ctrls .pomo-float-ctrls {
    opacity: 1;
    max-height: 36px;
  }
  .pomo-ghost {
    border: 0.5px solid rgba(255, 255, 255, 0.22);
    background: rgba(8, 13, 26, 0.34);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: rgba(255, 255, 255, 0.90);
    font-size: 11px;
    padding: 4px 11px;
    border-radius: 999px;
    cursor: pointer;
  }
  .pomo-ghost:hover { background: rgba(255, 255, 255, 0.16); }

  /* 3. Large Commanding Transparent VP9+Alpha 小鲸同学 Companion */
  .lav-zone {
    position: absolute;
    left: 50%;
    bottom: 96px;
    transform: translateX(-50%);
    width: min(100vw, 450px);
    height: calc(100% - 136px);
    max-height: 650px;
    min-height: 360px;
    z-index: 4;
    pointer-events: none;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    transition: bottom 0.42s cubic-bezier(0.22, 1, 0.36, 1),
                height 0.42s cubic-bezier(0.22, 1, 0.36, 1),
                max-height 0.42s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .stage.immersive .lav-zone {
    bottom: 0;
    height: calc(100% - 36px);
    max-height: 780px;
  }
  .lav-zone.poke-hop {
    animation: pokeHop 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes pokeHop {
    0% { transform: translateX(-50%) translateY(0) scale(1); }
    35% { transform: translateX(-50%) translateY(-8px) scale(1.022); }
    70% { transform: translateX(-50%) translateY(2px) scale(0.992); }
    100% { transform: translateX(-50%) translateY(0) scale(1); }
  }
  .lav-vid {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: 100%;
    object-fit: contain;
    object-position: center bottom;
    pointer-events: none;
    transition: opacity 0.26s ease;
    filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.36));
  }
  .lav-hotspots {
    position: absolute;
    z-index: 7;
    pointer-events: none;
  }
  .lav-hotspot {
    position: absolute;
    pointer-events: auto;
    cursor: pointer;
    border-radius: 50%;
    background: transparent;
    -webkit-tap-highlight-color: transparent;
  }

  /* Unclipped stage-level floating speech bubble */
  .speech-bubble {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%) translateY(6px);
    max-width: min(78vw, 276px);
    padding: 8px 14px;
    border-radius: 18px;
    background: rgba(12, 19, 36, 0.72);
    border: 0.5px solid rgba(255, 255, 255, 0.20);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    color: #F0F9FF;
    font-size: 12.5px;
    line-height: 1.42;
    text-align: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease, transform 0.24s ease, top 0.28s ease;
    z-index: 25;
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.36);
  }
  .stage.has-pomo .speech-bubble {
    top: 84px;
  }
  .speech-bubble.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* Immersive collapse / expand animation for the unified dock */
  .player-dock {
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.30s ease;
  }
  .stage.immersive .player-dock {
    transform: translateY(135%);
    opacity: 0;
    pointer-events: none;
  }
  .immersive-pill {
    position: absolute;
    top: 14px;
    right: 14px;
    transform: translateY(-10px);
    z-index: 22;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(8, 13, 26, 0.38);
    border: 0.5px solid rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: rgba(241, 245, 249, 0.78);
    font-size: 11px;
    letter-spacing: 0.4px;
    opacity: 0;
    pointer-events: none;
    cursor: pointer;
    transition: opacity 0.32s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .immersive-pill,
  .stage.immersive .immersive-pill {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Unified drawer helpers: Pose cards, Audio sub-tabs, Pomodoro presets */
  .pose-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .pose-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 13px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.06);
    border: 0.5px solid rgba(255, 255, 255, 0.12);
    color: rgba(248, 250, 252, 0.92);
    text-align: left;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.14s ease;
  }
  .pose-card:active { transform: scale(0.97); }
  .pose-card.on {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.38);
  }
  .pose-card-name { font-size: 14px; font-weight: 600; }
  .pose-card-desc { font-size: 11.5px; color: var(--sub); }

  .seg-bar {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 3px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    margin-bottom: 12px;
  }
  .seg-btn {
    border: none;
    background: transparent;
    color: var(--sub);
    font-size: 12.5px;
    font-weight: 500;
    padding: 7px 0;
    border-radius: 9px;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .seg-btn.on {
    background: rgba(255, 255, 255, 0.16);
    color: #FFFFFF;
  }
  .preset-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .preset-chip {
    border: 0.5px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(248, 250, 252, 0.88);
    font-size: 12.5px;
    font-weight: 500;
    padding: 9px 0;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.16s ease, border-color 0.16s ease;
  }
  .preset-chip.on {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.42);
    color: #FFFFFF;
  }
  .pomo-sheet-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
  .pomo-primary-btn {
    flex: 1;
    border: 0.5px solid rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.16);
    color: #FFFFFF;
    font-size: 13.5px;
    font-weight: 600;
    padding: 11px 16px;
    border-radius: 14px;
    cursor: pointer;
    transition: background 0.16s ease;
  }
  .pomo-primary-btn:hover { background: rgba(255, 255, 255, 0.24); }
  .pomo-sec-btn {
    border: 0.5px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(241, 245, 249, 0.82);
    font-size: 13px;
    padding: 11px 16px;
    border-radius: 14px;
    cursor: pointer;
  }

  /* Ambient Audio-Reactive Halo softly breathing behind 小鲸同学 */
  .lav-halo {
    position: absolute;
    left: 50%;
    bottom: 34px;
    width: 240px;
    height: 240px;
    transform: translateX(-50%) scale(0.92);
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-glow, rgba(56, 189, 248, 0.34)) 0%, rgba(56, 189, 248, 0.06) 52%, transparent 74%);
    opacity: 0.25;
    pointer-events: none;
    transition: opacity 0.45s ease, transform 0.45s ease;
    z-index: 0;
  }
  .lav-halo.playing {
    opacity: 0.92;
    animation: haloBreathe 3.2s ease-in-out infinite;
  }
  @keyframes haloBreathe {
    0%, 100% { transform: translateX(-50%) scale(0.94); opacity: 0.72; }
    50% { transform: translateX(-50%) scale(1.07); opacity: 1; }
  }

  /* 4. 2026-11 Liquid Glass Floating Media Player Dock (Multi-Layer Refraction + Audio Visualizer) */
  .player-dock {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 12;
    border-radius: 26px;
    background: linear-gradient(155deg, rgba(255, 255, 255, 0.13) 0%, rgba(12, 19, 36, 0.76) 36%, rgba(8, 13, 26, 0.84) 100%);
    border: 0.5px solid rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(28px) saturate(185%);
    -webkit-backdrop-filter: blur(28px) saturate(185%);
    padding: 11px 12px 10px;
    box-shadow:
      0 18px 42px rgba(0, 0, 0, 0.48),
      inset 0 1px 0 rgba(255, 255, 255, 0.32),
      inset 0 -1px 0 rgba(255, 255, 255, 0.06),
      0 0 0 0.5px var(--accent-rim, rgba(56, 189, 248, 0.16));
  }
  .player-main {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 9px;
  }
  .vinyl-wrap {
    position: relative;
    width: 46px;
    height: 46px;
    flex: 0 0 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .vinyl-ring {
    position: absolute;
    inset: -3px;
    border-radius: 14px;
    border: 1.5px solid var(--accent-rim, rgba(56, 189, 248, 0.55));
    opacity: 0;
    transform: scale(0.94);
    pointer-events: none;
    transition: opacity 0.28s ease;
  }
  .vinyl-wrap.playing .vinyl-ring {
    opacity: 0.75;
    animation: ringPulse 2.4s ease-out infinite;
  }
  @keyframes ringPulse {
    0% { transform: scale(0.96); opacity: 0.75; }
    100% { transform: scale(1.16); opacity: 0; }
  }
  .vinyl {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    overflow: hidden;
    background: #0E1525;
    border: 1px solid rgba(255,255,255,0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 6px 16px rgba(0,0,0,0.42), 0 0 14px var(--accent-glow, rgba(14,165,233,0.28));
    transition: transform 0.24s ease;
  }
  .vinyl.spin { transform: scale(1.02); }
  .vinyl-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  @keyframes spinVinyl { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .viz-bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2.5px;
    height: 12px;
    margin-right: 6px;
    vertical-align: middle;
    opacity: 0.35;
    transition: opacity 0.25s ease;
  }
  .viz-bars.playing { opacity: 1; }
  .viz-bars i {
    display: block;
    width: 2.5px;
    height: 4px;
    border-radius: 999px;
    background: rgba(241, 245, 249, 0.88);
    transform-origin: bottom center;
  }
  .viz-bars.playing i:nth-child(1) { animation: eqBar 0.92s ease-in-out infinite 0.00s; }
  .viz-bars.playing i:nth-child(2) { animation: eqBar 0.74s ease-in-out infinite 0.16s; }
  .viz-bars.playing i:nth-child(3) { animation: eqBar 1.05s ease-in-out infinite 0.08s; }
  .viz-bars.playing i:nth-child(4) { animation: eqBar 0.82s ease-in-out infinite 0.24s; }
  .viz-bars.playing i:nth-child(5) { animation: eqBar 0.96s ease-in-out infinite 0.12s; }
  @keyframes eqBar {
    0%, 100% { transform: scaleY(0.45); opacity: 0.65; }
    50% { transform: scaleY(2.65); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lav-halo.playing, .vinyl.spin, .vinyl-wrap.playing .vinyl-ring, .viz-bars.playing i {
      animation: none !important;
    }
  }
  .vinyl-hole {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #0A1328;
    border: 1.5px solid rgba(255,255,255,0.65);
  }
  .track-meta {
    flex: 1;
    min-width: 0;
  }
  .track-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .track-sub {
    font-size: 11px;
    color: var(--sub);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ctrl-group {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.09);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s, transform 0.12s;
  }
  .icon-btn:active { transform: scale(0.92); }
  .icon-btn.play {
    width: 38px;
    height: 38px;
    background: rgba(255, 255, 255, 0.94);
    color: #0B1220;
    border: 0.5px solid rgba(255, 255, 255, 0.65);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.34);
  }
  .icon-btn.play:hover { background: #FFFFFF; }

  .dock-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .dock-tab {
    border: 0.5px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.06);
    color: rgba(248,250,252,0.82);
    border-radius: 11px;
    padding: 6px 4px;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: all 0.16s;
  }
  .dock-tab.on {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.34);
    color: #FFFFFF;
  }


  .pack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--sub);
  }
  .pack-import-btn {
    border: 0.5px solid rgba(125,211,252,0.45);
    background: rgba(56,189,248,0.16);
    color: #E0F2FE;
    border-radius: 999px;
    padding: 5px 11px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.16s;
  }
  .pack-import-btn:hover { background: rgba(56,189,248,0.28); }
  .pack-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 12px;
  }
  .pack-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0.5px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(248,250,252,0.88);
    border-radius: 12px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.16s;
  }
  .pack-chip.on {
    background: rgba(255,255,255,0.18);
    border-color: rgba(125,211,252,0.58);
    color: #FFFFFF;
  }
  .pack-chip-tag {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    color: rgba(226,232,240,0.85);
  }
  .pack-chip-del {
    margin-left: 2px;
    border: none;
    background: rgba(248,113,113,0.20);
    color: #FCA5A5;
    border-radius: 999px;
    width: 18px;
    height: 18px;
    font-size: 12px;
    line-height: 16px;
    text-align: center;
    cursor: pointer;
    padding: 0;
  }
  .pack-hint {
    font-size: 11px;
    color: rgba(203,213,225,0.68);
    margin-top: 8px;
    line-height: 1.45;
  }

  /* 5. Frosted Slide-Up Bottom Sheet Drawer */
  .sheet-backdrop {
    position: absolute;
    inset: 0;
    z-index: 18;
    background: rgba(2, 6, 16, 0.48);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }
  .sheet-backdrop.open { opacity: 1; pointer-events: auto; }
  .sheet {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    max-height: 70%;
    z-index: 20;
    border-radius: 26px;
    background: rgba(13, 21, 38, 0.90);
    border: 0.5px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    transform: translateY(110%);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.55);
  }
  .sheet.open { transform: translateY(0); }
  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,0.26);
    margin: 9px auto 6px;
  }
  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 16px 10px;
    border-bottom: 0.5px solid rgba(255,255,255,0.08);
  }
  .sheet-title { font-size: 14.5px; font-weight: 600; color: #fff; }
  .sheet-close {
    border: none;
    background: rgba(255,255,255,0.10);
    color: rgba(255,255,255,0.85);
    border-radius: 999px;
    padding: 4px 11px;
    font-size: 11.5px;
    cursor: pointer;
  }
  .sheet-body {
    padding: 12px 14px 18px;
    overflow-y: auto;
    flex: 1;
  }

  /* Scene cards inside sheet */
  .scene-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .scene-card {
    position: relative;
    height: 96px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.16);
    cursor: pointer;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 10px;
  }
  .scene-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.1), rgba(4,9,20,0.82));
  }
  .scene-card.on { border-color: #38BDF8; box-shadow: 0 0 0 1.5px rgba(56,189,248,0.55); }
  .scene-card > * { position: relative; z-index: 1; }
  .scene-name { font-size: 13.5px; font-weight: 600; color: #fff; }
  .scene-desc { font-size: 10.5px; color: rgba(248,250,252,0.72); margin-top: 2px; }

  /* White Noise Mixer Grid */
  .noise-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .noise-tile {
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 10px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.16s;
  }
  .noise-tile.on { background: rgba(56,189,248,0.22); border-color: rgba(56,189,248,0.65); }
  .noise-badge {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    margin: 0 auto 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    background: rgba(255,255,255,0.12);
    color: #E0F2FE;
  }
  .noise-tile.on .noise-badge { background: #38BDF8; color: #091224; }
  .noise-name { font-size: 12px; font-weight: 600; }
  .noise-vol { width: 100%; margin-top: 6px; accent-color: #38BDF8; height: 4px; }

  /* Lo-Fi Album Showcase & Track List */
  .icon-btn svg, .mode-icon-btn svg, .mode-pill svg, .album-cta-btn svg, .album-sec-btn svg, .album-del-btn svg, .album-badge svg, .lofi-eq svg {
    display: block;
    flex-shrink: 0;
  }
  .mode-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.08);
    color: rgba(248,250,252,0.88);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.16s ease, border-color 0.16s ease, transform 0.12s ease;
  }
  .mode-icon-btn:active { transform: scale(0.92); }
  .mode-icon-btn.accent {
    background: rgba(56,189,248,0.20);
    border-color: rgba(56,189,248,0.45);
    color: #BAE6FD;
  }
  .album-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .album-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border-radius: 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.14s ease;
  }
  .album-card:active { transform: scale(0.97); }
  .album-card.on {
    background: rgba(56,189,248,0.16);
    border-color: rgba(56,189,248,0.62);
    box-shadow: 0 6px 18px rgba(56,189,248,0.16);
  }
  .album-cover-box {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(15,23,42,0.65);
  }
  .album-cover-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .album-badge {
    position: absolute;
    right: 5px;
    bottom: 5px;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    background: rgba(8,13,26,0.78);
    border: 0.5px solid rgba(255,255,255,0.22);
    color: #E2E8F0;
    backdrop-filter: blur(8px);
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .album-badge.done {
    background: rgba(16,185,129,0.85);
    border-color: rgba(167,243,208,0.65);
    color: #052E16;
  }
  .album-card-name {
    font-size: 12px;
    font-weight: 600;
    color: #F8FAFC;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 2px;
  }
  .album-hero {
    display: flex;
    gap: 11px;
    padding: 10px 11px;
    border-radius: 16px;
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.13);
    margin-bottom: 10px;
    align-items: center;
  }
  .album-hero-cover {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    object-fit: cover;
    flex: 0 0 60px;
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 6px 14px rgba(0,0,0,0.35);
  }
  .album-hero-info {
    flex: 1;
    min-width: 0;
  }
  .album-hero-title {
    font-size: 14px;
    font-weight: 700;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .album-hero-en {
    font-size: 10.5px;
    color: rgba(186,230,253,0.78);
    font-weight: 500;
  }
  .album-hero-desc {
    font-size: 11.5px;
    color: var(--sub);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .album-hero-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 7px;
    flex-wrap: wrap;
  }
  .album-cta-btn {
    border: 0.5px solid rgba(56,189,248,0.52);
    background: linear-gradient(135deg, rgba(56,189,248,0.28), rgba(129,140,248,0.26));
    color: #F0F9FF;
    font-size: 11.5px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .album-cta-btn:disabled {
    opacity: 0.72;
    cursor: default;
  }
  .album-sec-btn {
    border: 0.5px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: rgba(241,245,249,0.88);
    font-size: 11px;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .album-del-btn {
    border: 0.5px solid rgba(248,113,113,0.28);
    background: rgba(248,113,113,0.10);
    color: #FCA5A5;
    font-size: 11px;
    padding: 5px 9px;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .album-prog-bar {
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    overflow: hidden;
    margin-top: 6px;
  }
  .album-prog-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #38BDF8, #818CF8);
    transition: width 0.25s ease;
  }
  .mode-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .mode-pill {
    border: 0.5px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: var(--sub);
    font-size: 11.5px;
    font-weight: 500;
    padding: 6px 4px;
    border-radius: 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }
  .mode-pill.on {
    background: rgba(56,189,248,0.22);
    border-color: rgba(56,189,248,0.52);
    color: #F0F9FF;
    font-weight: 600;
  }
  .lofi-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px;
    border-radius: 13px;
    background: rgba(255,255,255,0.05);
    border: 0.5px solid transparent;
    margin-bottom: 7px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .lofi-row.on { background: rgba(56,189,248,0.20); border-color: rgba(56,189,248,0.52); }
  .lofi-row.locked { opacity: 0.56; }
  .lofi-eq {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    flex: 0 0 24px;
  }
  .lofi-row.on .lofi-eq { background: #38BDF8; color: #091224; font-weight: 700; }
  .lofi-info { flex: 1; min-width: 0; }
  .lofi-title { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lofi-en { font-size: 10.5px; color: var(--sub); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lofi-tag {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: rgba(226,232,240,0.72);
    flex: 0 0 auto;
  }
  .lofi-tag.cloud {
    background: rgba(56,189,248,0.14);
    color: #7DD3FC;
  }

  /* Pomodoro settings rows */
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 2px;
    border-bottom: 0.5px solid rgba(255,255,255,0.08);
    font-size: 13px;
  }
  .setting-row:last-child { border-bottom: none; }
  .stepper { display: flex; align-items: center; gap: 10px; }
  .stepper button {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.09);
    color: #fff;
    font-size: 16px;
    cursor: pointer;
  }
  .hidden { display: none !important; }
</style>
</head>
<body>
  <div id="stage" class="stage">
    <!-- 1. Atmospheric Scene Backdrop (tap empty space to smoothly collapse/expand controls!) -->
    <div id="bg-layer" class="bg-layer" style="background-image:url('/jphone/media/focus/bg/rainy_ocean.jpg')"></div>
    <div class="bg-scrim"></div>
    <div class="ambient-glow"></div>

    <!-- 2. Frameless Transparent Active-Only Pomodoro Float (invisible until started, zero card/line!) -->
    <div id="pomo-float" class="pomo-float" title="轻触控制番茄钟">
      <div class="pomo-float-phase">
        <span id="phase-dot" class="pill-dot"></span>
        <span id="phase-text">专注 · 第 1/4 轮</span>
      </div>
      <div id="time-txt" class="big-clock">25:00</div>
      <div class="pomo-float-ctrls">
        <button id="btn-float-toggle" class="pomo-ghost" type="button">暂停</button>
        <button id="btn-float-reset" class="pomo-ghost" type="button">结束</button>
      </div>
    </div>

    <!-- Unclipped Stage-Level Speech Bubble -->
    <div id="speech-bubble" class="speech-bubble">今天也要和小鲸同学一起进入心流哦～</div>

    <!-- 3. Large Commanding Multi-Pose VP9+Alpha LAV Companion -->
    <div id="lav-zone" class="lav-zone">
      <div id="lav-halo" class="lav-halo"></div>
      <video id="xj-pose-stand" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_idle.webm?v=m2v4" poster="/jphone/media/lav/xiaojing/xiaojing_idle.png?v=m2v4" autoplay loop muted playsinline style="opacity:1"></video>
      <video id="xj-pose-desk" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_desk.webm?v=m2v4" poster="/jphone/media/lav/xiaojing/xiaojing_desk.png?v=m2v4" loop muted playsinline preload="auto" style="opacity:0"></video>
      <video id="xj-pose-glance" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_glance.webm?v=m2v4" poster="/jphone/media/lav/xiaojing/xiaojing_glance.png?v=m2v4" loop muted playsinline preload="auto" style="opacity:0"></video>
      <video id="xj-pose-sit" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_sit.webm?v=m2v4" poster="/jphone/media/lav/xiaojing/xiaojing_sit.png?v=m2v4" loop muted playsinline preload="auto" style="opacity:0"></video>
      <video id="xj-react-head" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_touch_head.webm?v=m2v4" muted playsinline preload="auto" style="opacity:0"></video>
      <video id="xj-react-body" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_touch_body.webm?v=m2v4" muted playsinline preload="auto" style="opacity:0"></video>
      <video id="xj-react-tail" class="lav-vid" src="/jphone/media/lav/xiaojing/xiaojing_touch_tail.webm?v=m2v4" muted playsinline preload="auto" style="opacity:0"></video>
      <video id="custom-lav-vid" class="lav-vid" autoplay loop muted playsinline style="opacity:0;pointer-events:none"></video>
      <img id="custom-lav-img" class="lav-vid" alt="" style="opacity:0;pointer-events:none;object-fit:contain;object-position:bottom center" />
      <div id="lav-hotspots" class="lav-hotspots">
        <div class="lav-hotspot" data-zone="head" title="摸摸小鲸的头" style="left:23%;top:4%;width:52%;height:31%;"></div>
        <div class="lav-hotspot" data-zone="body" title="轻拍小鲸加油" style="left:20%;top:35%;width:48%;height:34%;"></div>
        <div class="lav-hotspot" data-zone="tail" title="戳戳鲸鱼尾巴" style="left:58%;top:55%;width:42%;height:36%;"></div>
      </div>
    </div>

    <!-- Keep element hidden for pure edge-to-edge immersion (tap empty stage to restore) -->
    <button id="immersive-pill" class="immersive-pill" type="button" hidden aria-hidden="true">展开菜单</button>

    <!-- 4. Single Unified Floating Frosted Glass Dock -->
    <div id="player-dock" class="player-dock">
      <div class="player-main">
        <div id="vinyl-wrap" class="vinyl-wrap" title="查看专辑歌单">
          <div class="vinyl-ring"></div>
          <div id="vinyl" class="vinyl"><img id="vinyl-cover" class="vinyl-cover" src="/jphone/media/focus/covers/echoes.jpg" alt="专辑封面" /></div>
        </div>
        <div class="track-meta" id="open-audio-meta" style="cursor:pointer">
          <div class="track-title" style="display:flex;align-items:center">
            <span id="viz-bars" class="viz-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span id="now-title" style="overflow:hidden;text-overflow:ellipsis">深海雨夜 · 轻音乐待机</span>
          </div>
          <div id="now-sub" class="track-sub">轻触空白处可收起界面沉浸陪伴</div>
        </div>
        <div class="ctrl-group">
          <button id="btn-play-mode" class="mode-icon-btn" type="button" title="顺序循环" aria-label="切换播放模式"></button>
          <button id="btn-play-toggle" class="icon-btn play" type="button" title="播放/暂停" aria-label="播放或暂停"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-left:1.5px"><polygon points="6 3 20 12 6 21 6 3"/></svg></button>
          <button id="btn-next-track" class="icon-btn" type="button" title="下一首" aria-label="下一首"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/><line x1="19" x2="19" y1="5" y2="19"/></svg></button>
          <button id="btn-collapse-ui" class="icon-btn" type="button" title="沉浸收起" aria-label="沉浸收起" style="width:28px;height:28px;opacity:0.80"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
        </div>
      </div>
      <div class="dock-tabs">
        <button class="dock-tab" data-sheet="scenes">场景</button>
        <button class="dock-tab" data-sheet="audio" id="tab-audio-lbl">声音</button>
        <button class="dock-tab" data-sheet="poses">角色</button>
        <button class="dock-tab" data-sheet="pomo" id="tab-pomo-lbl">番茄钟</button>
      </div>
    </div>

    <!-- 5. Unified Slide-up Frosted Bottom Sheet Drawer -->
    <div id="sheet-backdrop" class="sheet-backdrop"></div>
    <div id="sheet" class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div id="sheet-title" class="sheet-title">氛围场景</div>
        <button id="sheet-close" class="sheet-close">完成</button>
      </div>
      <div class="sheet-body">
        <div id="pane-scenes" class="hidden">
          <div class="scene-grid" id="scene-grid"></div>
        </div>
        <div id="pane-audio" class="hidden">
          <div class="seg-bar">
            <button class="seg-btn on" data-audio-tab="noise" type="button">白噪音混音</button>
            <button class="seg-btn" data-audio-tab="lofi" type="button">专辑歌单</button>
          </div>
          <div id="sub-noise">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:12px;color:var(--sub)">
              <span>多轨自由叠加 · 退出后台继续播放</span>
              <button id="btn-stop-all" class="sheet-close" style="background:rgba(248,113,113,0.18);color:#FCA5A5">静音</button>
            </div>
            <div class="noise-grid" id="noise-grid"></div>
          </div>
          <div id="sub-lofi" class="hidden">
            <div id="album-strip" class="album-strip"></div>
            <div id="album-hero"></div>
            <div id="mode-bar" class="mode-bar">
              <button class="mode-pill on" data-mode="order" type="button"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg><span>顺序循环</span></button>
              <button class="mode-pill" data-mode="shuffle" type="button"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg><span>随机播放</span></button>
              <button class="mode-pill" data-mode="single" type="button"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg><span>单曲循环</span></button>
            </div>
            <div id="lofi-list"></div>
          </div>
        </div>
        <div id="pane-poses" class="hidden">
          <div class="pack-header">
            <span>伴学角色 · 预制 / 自定义 / 工坊包</span>
            <button id="btn-import-focus-video" class="pack-import-btn" type="button">+ 导入动态视频</button>
            <input id="focus-video-input" type="file" accept="video/webm,video/mp4,video/quicktime,image/png,image/webp,image/gif" style="display:none" />
          </div>
          <div id="focus-pack-list" class="pack-list"></div>
          <div id="pose-section-title" style="font-size:12px;color:var(--sub);margin-bottom:8px">伴学姿态</div>
          <div id="pose-grid" class="pose-grid" role="tablist" aria-label="小鲸伴学姿态">
            <button class="pose-card on" data-pose="stand" type="button">
              <span class="pose-card-name">站立</span>
              <span class="pose-card-desc">优雅迎候 · 轻摆鲸尾</span>
            </button>
            <button class="pose-card" data-pose="desk" type="button">
              <span class="pose-card-name">托腮</span>
              <span class="pose-card-desc">伏案凝望 · 近景陪伴</span>
            </button>
            <button class="pose-card" data-pose="glance" type="button">
              <span class="pose-card-name">侧眸</span>
              <span class="pose-card-desc">回眸拂发 · 窗畔夜色</span>
            </button>
            <button class="pose-card" data-pose="sit" type="button">
              <span class="pose-card-name">抱膝</span>
              <span class="pose-card-desc">慵懒小憩 · 温柔治愈</span>
            </button>
          </div>
          <div id="focus-pack-hint" class="pack-hint">支持导入透明 .webm（VP9+Alpha）/ .mp4 / 透明动图，也可以在「创意工坊」下载社区角色包，电脑与手机自动同步。</div>
        </div>
        <div id="pane-pomo" class="hidden">
          <div class="preset-row">
            <button class="preset-chip" data-min="15" type="button">15 分钟</button>
            <button class="preset-chip on" data-min="25" type="button">25 分钟</button>
            <button class="preset-chip" data-min="45" type="button">45 分钟</button>
            <button class="preset-chip" data-min="60" type="button">60 分钟</button>
          </div>
          <div class="setting-row">
            <span>自定义专注时长（分钟）</span>
            <div class="stepper"><button id="f-dec">-</button><span id="f-val">25</span><button id="f-inc">+</button></div>
          </div>
          <div class="setting-row">
            <span>休息时长（分钟）</span>
            <div class="stepper"><button id="b-dec">-</button><span id="b-val">5</span><button id="b-inc">+</button></div>
          </div>
          <div class="setting-row">
            <span>休息时自动暂停声音</span>
            <input type="checkbox" id="pause-on-break" checked style="width:18px;height:18px;accent-color:#38BDF8" />
          </div>
          <div class="setting-row">
            <span>今日累计专注</span>
            <span id="today-stats" style="color:#7DD3FC;font-weight:600">0 分钟 · 0 轮</span>
          </div>
          <div class="pomo-sheet-actions">
            <button id="btn-start" class="pomo-primary-btn" type="button">开始专注</button>
            <button id="btn-reset" class="pomo-sec-btn" type="button">重置</button>
          </div>
        </div>
      </div>
    </div>
  </div>

<script>
(async function () {
  const NOISES = ${JSON.stringify(FOCUS_NOISE_TRACKS)};
  const LOFIS = ${JSON.stringify(FOCUS_LOFI_TRACKS)};
  const SCENES = [
    {
      id: 'rainy-ocean',
      name: '深海雨夜',
      desc: '月夜海窗 · 小雨 + 海浪',
      bg: '/jphone/media/focus/bg/rainy_ocean.jpg',
      headerBg: '#0A1328',
      accent: '#38BDF8',
      accentGlow: 'rgba(56, 189, 248, 0.36)',
      accentRim: 'rgba(56, 189, 248, 0.24)',
      noises: { rain_light: 0.62, waves: 0.48 },
      trackId: 'lofi-rain-a',
    },
    {
      id: 'midnight-cafe',
      name: '午夜咖啡馆',
      desc: '雨夜爵士吧 · 咖啡馆 + 炉火',
      bg: '/jphone/media/focus/bg/midnight_cafe.jpg',
      headerBg: '#16100C',
      accent: '#F59E0B',
      accentGlow: 'rgba(245, 158, 11, 0.34)',
      accentRim: 'rgba(245, 158, 11, 0.24)',
      noises: { cafe: 0.54, fireplace: 0.42 },
      trackId: 'lofi-cafe-a',
    },
    {
      id: 'snow-fire',
      name: '雪夜篝火',
      desc: '寒夜暖炉 · 雪夜 + 炉火',
      bg: '/jphone/media/focus/bg/rainy_ocean.jpg',
      headerBg: '#0A1328',
      accent: '#FB923C',
      accentGlow: 'rgba(251, 146, 60, 0.34)',
      accentRim: 'rgba(251, 146, 60, 0.24)',
      noises: { snow: 0.58, fireplace: 0.56 },
      trackId: 'lofi-embers-a',
    },
    {
      id: 'morning-stream',
      name: '溪涧清晨',
      desc: '林间清流 · 小溪 + 鸟鸣',
      bg: '/jphone/media/focus/bg/midnight_cafe.jpg',
      headerBg: '#101A26',
      accent: '#34D399',
      accentGlow: 'rgba(52, 211, 153, 0.34)',
      accentRim: 'rgba(52, 211, 153, 0.24)',
      noises: { stream: 0.56, birds: 0.36, wind: 0.28 },
      trackId: 'lofi-leaves-a',
    },
  ];

  let currentHeaderBg = '#0A1328';
  let currentHeaderHidden = false;
  let currentHeaderFg = 'light';
  let currentBgUrl = '';

  function hexLuminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 0.1;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function detectTopForeground(imgUrl, fallbackHex) {
    currentBgUrl = imgUrl || '';
    const fallbackFg = hexLuminance(fallbackHex) >= 0.56 ? 'dark' : 'light';
    if (!imgUrl) {
      syncHeader(currentHeaderBg, currentHeaderHidden, fallbackFg);
      return;
    }
    const targetUrl = imgUrl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (currentBgUrl !== targetUrl) return;
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;
        const vpW = window.innerWidth || 390;
        const vpH = window.innerHeight || 844;
        const vpAspect = vpW / Math.max(1, vpH);
        const imgAspect = iw / ih;
        let sx = 0, sy = 0, sw = iw, sh = ih;
        if (imgAspect > vpAspect) {
          sw = ih * vpAspect;
          sx = (iw - sw) / 2;
        } else {
          sh = iw / vpAspect;
          sy = (ih - sh) / 2;
        }
        const bandH = Math.max(1, sh * 0.12);
        const cw = 48, ch = 12;
        const cv = document.createElement('canvas');
        cv.width = cw;
        cv.height = ch;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, sx, sy, sw, bandH, 0, 0, cw, ch);
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let sum = 0;
        const pxCount = cw * ch;
        for (let i = 0; i < data.length; i += 4) {
          sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }
        const avgLum = sum / Math.max(1, pxCount);
        const nextFg = avgLum >= 0.56 ? 'dark' : 'light';
        syncHeader(currentHeaderBg, currentHeaderHidden, nextFg);
      } catch {
        syncHeader(currentHeaderBg, currentHeaderHidden, fallbackFg);
      }
    };
    img.onerror = () => {
      if (currentBgUrl === targetUrl) syncHeader(currentHeaderBg, currentHeaderHidden, fallbackFg);
    };
    img.src = imgUrl;
  }

  const syncHeader = (bg, hidden, fg) => {
    if (typeof bg === 'string' && bg) currentHeaderBg = bg;
    if (typeof hidden === 'boolean') currentHeaderHidden = hidden;
    if (fg === 'light' || fg === 'dark') currentHeaderFg = fg;
    const st = document.getElementById('stage');
    if (st) st.classList.toggle('light-top', currentHeaderFg === 'dark');
    if (window.jing && window.jing.ui && typeof window.jing.ui.setHeaderStyle === 'function') {
      window.jing.ui.setHeaderStyle({
        backgroundColor: currentHeaderBg,
        foregroundColor: currentHeaderFg,
        borderColor: currentHeaderFg === 'dark' ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.06)',
        title: '小鲸专注',
        hidden: currentHeaderHidden,
      });
    }
  };
  syncHeader('#0A1328', false, 'light');
  window.addEventListener('resize', () => {
    if (currentBgUrl) detectTopForeground(currentBgUrl, currentHeaderBg);
  });

  // Host persistent audio engine (stays alive when exiting Mini-App!)
  const hostAudio = (window.jing && window.jing.audio && window.jing.audio.isHostSupported())
    ? window.jing.audio
    : null;

  // Album & Playback Mode state
  const PLAY_MODE_LABELS = { order: '顺序循环', shuffle: '随机播放', single: '单曲循环' };
  const LUCIDE = {
    play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-left:1.5px"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    playSm: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg>',
    download: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    downloadXs: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    checkXs: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    cloudDown: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13v8l-4-4"/><path d="m12 21 4-4"/><path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/></svg>',
    audioLines: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>',
    trash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  };
  const PLAY_MODE_SVGS = {
    order: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
    shuffle: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>',
    single: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>',
  };

  function buildFallbackAlbums() {
    return [{
      id: 'echoes',
      name: '回声重映集',
      en: 'Echoes Replayed',
      desc: '雨夜深海与模拟磁带的温柔回响',
      cover: '/jphone/media/focus/covers/echoes.jpg',
      totalTracks: LOFIS.length,
      availableTracks: LOFIS.length,
      downloadedTracks: 0,
      builtinTracks: LOFIS.length,
      totalBytes: 0,
      downloadedBytes: 0,
      remainingBytes: 0,
      complete: true,
      download: { downloading: false, done: 0, total: 0, currentTrack: '', error: '', failedCount: 0 },
      tracks: LOFIS.map((t, i) => ({
        id: t.id,
        num: String(i + 1).padStart(2, '0'),
        name: t.name,
        en: t.en,
        albumId: 'echoes',
        album: t.album,
        cover: t.cover || '/jphone/media/focus/covers/echoes.jpg',
        builtin: true,
        available: true,
        downloaded: false,
        url: '/jphone/media/focus/music/' + encodeURIComponent(t.file),
      })),
    }];
  }

  let albumsList = buildFallbackAlbums();
  let selectedAlbumId = 'echoes';
  let activeQueueAlbumId = 'echoes';
  let albumPollTimer = null;
  const previouslyDownloading = new Set();

  function formatMb(bytes) {
    const mb = (Number(bytes || 0) / 1048576);
    return mb >= 1 ? (mb.toFixed(1) + ' MB') : '< 1 MB';
  }

  function trackToHostPayload(track, album) {
    const al = album || albumsList.find(a => a.id === (track.albumId || selectedAlbumId)) || albumsList[0];
    const albumName = track.album || (al ? al.name : '回声重映集');
    const coverUrl = track.cover || track.coverUrl || (al ? al.cover : '/jphone/media/focus/covers/echoes.jpg');
    const url = track.url || ('/jphone/media/focus/music/' + encodeURIComponent(track.file || ''));
    return {
      id: track.id,
      title: track.name || track.title || 'Lo-Fi',
      subtitle: albumName + (track.en ? (' · ' + track.en) : ''),
      url,
      coverUrl,
      albumId: track.albumId || (al ? al.id : 'echoes'),
      albumName,
    };
  }

  function getAlbumAvailableQueue(albumId) {
    const al = albumsList.find(a => a.id === albumId) || albumsList[0];
    if (!al) return LOFIS.map(t => trackToHostPayload(t));
    const avail = (al.tracks || []).filter(t => t.available);
    return avail.map(t => trackToHostPayload(t, al));
  }

  // Fallback local players ONLY if opened outside JPhone host
  const localNoises = new Map();
  let localLofi = null;
  let localQueue = getAlbumAvailableQueue('echoes');
  let localPlayMode = (() => {
    try {
      const m = localStorage.getItem('jphone_focus_play_mode_v1');
      if (m === 'order' || m === 'shuffle' || m === 'single') return m;
    } catch {}
    return 'order';
  })();
  let localState = { playing: false, hasActiveAudio: false, track: null, noises: {}, sceneName: '深海雨夜', playMode: localPlayMode, coverUrl: '/jphone/media/focus/covers/echoes.jpg' };

  function getMediaState() {
    if (hostAudio) return hostAudio.getState();
    return localState;
  }

  function getCurrentPlayMode() {
    const st = getMediaState();
    const m = st.playMode || localPlayMode || 'order';
    return (m === 'shuffle' || m === 'single' || m === 'order') ? m : 'order';
  }

  function setPlayMode(mode, announce = false) {
    const m = (mode === 'shuffle' || mode === 'single' || mode === 'order') ? mode : 'order';
    localPlayMode = m;
    localState.playMode = m;
    try { localStorage.setItem('jphone_focus_play_mode_v1', m); } catch {}
    if (hostAudio && typeof hostAudio.setPlayMode === 'function') {
      hostAudio.setPlayMode(m);
    } else if (localLofi) {
      localLofi.loop = (m === 'single');
    }
    if (announce) sayBubble('播放模式：' + PLAY_MODE_LABELS[m]);
    renderAudioUi();
  }

  function cyclePlayMode() {
    const order = ['order', 'shuffle', 'single'];
    const cur = getCurrentPlayMode();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setPlayMode(next, true);
  }

  function syncQueueForAlbum(albumId) {
    const q = getAlbumAvailableQueue(albumId);
    if (!q.length) return q;
    activeQueueAlbumId = albumId;
    localQueue = q;
    if (hostAudio && typeof hostAudio.setQueue === 'function') {
      hostAudio.setQueue(q, { playMode: getCurrentPlayMode() });
    }
    return q;
  }

  function pickLocalNextTrack(delta, isAutoEnded) {
    const list = localQueue.length ? localQueue : getAlbumAvailableQueue(activeQueueAlbumId);
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const curId = localState.track ? localState.track.id : '';
    const idx = list.findIndex(t => t.id === curId);
    const mode = getCurrentPlayMode();
    if (mode === 'single' && isAutoEnded && idx >= 0) return list[idx];
    if (mode === 'shuffle') {
      let ni = Math.floor(Math.random() * list.length);
      if (ni === idx) ni = (ni + 1) % list.length;
      return list[ni];
    }
    const base = idx >= 0 ? idx : (delta > 0 ? -1 : 0);
    return list[(base + delta + list.length) % list.length];
  }

  function playTrackObj(track, album) {
    const al = album || albumsList.find(a => a.id === (track.albumId || selectedAlbumId)) || albumsList[0];
    if (al) syncQueueForAlbum(al.id);
    const payload = trackToHostPayload(track, al);
    if (hostAudio) {
      hostAudio.playTrack(payload);
    } else {
      if (localLofi) { localLofi.onended = null; localLofi.pause(); localLofi = null; }
      localLofi = new Audio(payload.url);
      localLofi.loop = (getCurrentPlayMode() === 'single');
      localLofi.volume = 0.58;
      localLofi.onended = () => {
        if (!localState.playing) return;
        if (getCurrentPlayMode() === 'single') {
          localLofi.currentTime = 0;
          localLofi.play().catch(() => {});
          return;
        }
        const next = pickLocalNextTrack(1, true);
        if (next) playTrackObj(next, al);
      };
      localLofi.play().catch(() => {});
      localState.track = payload;
      localState.coverUrl = payload.coverUrl;
      localState.playing = true;
      localState.hasActiveAudio = true;
    }
    renderAudioUi();
  }

  function playWholeAlbum(albumId) {
    const al = albumsList.find(a => a.id === albumId);
    if (!al) return;
    const avail = (al.tracks || []).filter(t => t.available);
    if (!avail.length) {
      startDownloadAlbum(albumId);
      return;
    }
    syncQueueForAlbum(al.id);
    const mode = getCurrentPlayMode();
    const startIdx = mode === 'shuffle' ? Math.floor(Math.random() * avail.length) : 0;
    playTrackObj(avail[startIdx], al);
    sayBubble('开始播放《' + al.name + '》（' + PLAY_MODE_LABELS[mode] + '）');
  }

  async function refreshAlbums() {
    try {
      let data = null;
      if (window.jing && window.jing.focus && typeof window.jing.focus.listAlbums === 'function') {
        data = await window.jing.focus.listAlbums();
      } else {
        const res = await fetch('/jphone/api/focus/albums');
        if (res.ok) data = await res.json();
      }
      if (data && Array.isArray(data.albums) && data.albums.length > 0) {
        albumsList = data.albums;
        let anyDownloading = false;
        for (const al of albumsList) {
          const dl = al.download || {};
          if (dl.downloading) {
            anyDownloading = true;
            previouslyDownloading.add(al.id);
          } else if (previouslyDownloading.has(al.id)) {
            previouslyDownloading.delete(al.id);
            if (al.complete) {
              sayBubble('《' + al.name + '》完整专辑已下载完成（' + al.totalTracks + ' 首）！');
              if (activeQueueAlbumId === al.id) syncQueueForAlbum(al.id);
            } else if (dl.error) {
              sayBubble('《' + al.name + '》部分曲目下载失败，可点击重试');
            }
          }
        }
        if (anyDownloading && !albumPollTimer) {
          albumPollTimer = setInterval(() => { refreshAlbums(); }, 1100);
        } else if (!anyDownloading && albumPollTimer) {
          clearInterval(albumPollTimer);
          albumPollTimer = null;
        }
        // Keep active queue refreshed if user already plays this album
        const st = getMediaState();
        if (st.track && st.track.albumId && st.track.albumId === activeQueueAlbumId) {
          const q = getAlbumAvailableQueue(activeQueueAlbumId);
          if (q.length > (st.queueLength || 0) && hostAudio && typeof hostAudio.setQueue === 'function') {
            hostAudio.setQueue(q);
          }
        }
        renderAudioUi();
      }
    } catch {}
  }

  async function startDownloadAlbum(albumId) {
    const al = albumsList.find(a => a.id === albumId);
    if (!al) return;
    previouslyDownloading.add(albumId);
    sayBubble('正在从 GitHub 获取《' + al.name + '》完整专辑…');
    try {
      if (window.jing && window.jing.focus && typeof window.jing.focus.downloadAlbum === 'function') {
        await window.jing.focus.downloadAlbum(albumId);
      } else {
        await fetch('/jphone/api/focus/albums/' + encodeURIComponent(albumId) + '/download', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
      }
      if (!albumPollTimer) {
        albumPollTimer = setInterval(() => { refreshAlbums(); }, 1100);
      }
      await refreshAlbums();
    } catch (err) {
      sayBubble('专辑下载启动失败：' + (err?.message || '请检查网络'));
    }
  }

  async function removeDownloadedAlbum(albumId) {
    const al = albumsList.find(a => a.id === albumId);
    if (!al) return;
    try {
      if (window.jing && window.jing.focus && typeof window.jing.focus.deleteAlbum === 'function') {
        await window.jing.focus.deleteAlbum(albumId);
      } else {
        await fetch('/jphone/api/focus/albums/' + encodeURIComponent(albumId), { method: 'DELETE' });
      }
      sayBubble('已清理《' + al.name + '》本地下载缓存');
      await refreshAlbums();
    } catch {}
  }

  function setNoiseChannel(item, active, volume) {
    const vol = Math.max(0, Math.min(1, volume ?? item.defaultVol));
    const url = '/jphone/media/focus/noise/' + encodeURIComponent(item.file);
    if (hostAudio) {
      hostAudio.setNoise(item.id, { id: item.id, name: item.name, url, active, volume: vol });
    } else {
      if (active) {
        let a = localNoises.get(item.id);
        if (!a) {
          a = new Audio(url);
          a.loop = true;
          localNoises.set(item.id, a);
        }
        a.volume = vol;
        a.play().catch(() => {});
        localState.noises[item.id] = { name: item.name, volume: vol, active: true };
        localState.playing = true;
      } else {
        const a = localNoises.get(item.id);
        if (a) a.pause();
        delete localState.noises[item.id];
      }
      localState.hasActiveAudio = !!localState.track || Object.keys(localState.noises).length > 0;
    }
    renderAudioUi();
  }

  function applyScenePreset(scene) {
    currentSceneId = scene.id;
    bgLayer.style.backgroundImage = 'url(' + scene.bg + ')';
    syncHeader(scene.headerBg);
    detectTopForeground(scene.bg, scene.headerBg);

    const track = LOFIS.find(t => t.id === scene.trackId) || LOFIS[0];
    const noiseList = Object.entries(scene.noises).map(([id, vol]) => {
      const item = NOISES.find(n => n.id === id);
      return item ? { id: item.id, name: item.name, url: '/jphone/media/focus/noise/' + encodeURIComponent(item.file), volume: vol, active: true } : null;
    }).filter(Boolean);

    syncQueueForAlbum('echoes');
    if (hostAudio) {
      hostAudio.applyScene({
        sceneName: scene.name,
        noises: noiseList,
        track: trackToHostPayload(track),
      });
    } else {
      localNoises.forEach(a => a.pause());
      localState.noises = {};
      localState.sceneName = scene.name;
      for (const n of noiseList) {
        const item = NOISES.find(x => x.id === n.id);
        if (item) setNoiseChannel(item, true, n.volume);
      }
      playTrackObj(track);
    }
    sayBubble('已切换到「' + scene.name + '」，安心开始专注吧～');
    renderScenes();
    renderAudioUi();
  }

  // ---- Multi-Pose & Multi-Zone Interactive Transparent VP9+Alpha 小鲸同学 ----
  const poseVideos = {
    stand: document.getElementById('xj-pose-stand'),
    desk: document.getElementById('xj-pose-desk'),
    glance: document.getElementById('xj-pose-glance'),
    sit: document.getElementById('xj-pose-sit'),
  };
  const reactVideos = {
    head: document.getElementById('xj-react-head'),
    body: document.getElementById('xj-react-body'),
    tail: document.getElementById('xj-react-tail'),
  };
  const POSE_HOTSPOTS = {
    stand:  { head: 'left:23%;top:4%;width:52%;height:31%;',  body: 'left:20%;top:35%;width:48%;height:34%;', tail: 'left:58%;top:55%;width:42%;height:36%;' },
    desk:   { head: 'left:16%;top:10%;width:48%;height:38%;', body: 'left:20%;top:48%;width:52%;height:38%;', tail: 'left:68%;top:22%;width:30%;height:46%;' },
    glance: { head: 'left:22%;top:4%;width:46%;height:30%;',  body: 'left:16%;top:34%;width:50%;height:38%;', tail: 'left:56%;top:62%;width:42%;height:34%;' },
    sit:    { head: 'left:22%;top:4%;width:50%;height:32%;',  body: 'left:18%;top:36%;width:58%;height:38%;', tail: 'left:24%;top:76%;width:66%;height:22%;' },
  };
  const lavZone = document.getElementById('lav-zone');
  const lavHotspots = document.getElementById('lav-hotspots');
  const bubbleEl = document.getElementById('speech-bubble');
  let bubbleTimer = null;
  let currentPose = 'stand';
  let userPinnedPose = false;
  let activeReact = null;

  const ZONE_LINES = {
    head: [
      '嘿嘿～摸摸头能量补满，继续进入心流吧！',
      '鲸鱼鳍耳很敏感的啦，轻轻摸一下就好哦～',
      '被夸奖了好开心，我会一直在窗边安静陪你！',
    ],
    body: [
      '加油加油！这一轮番茄一定能稳稳拿下 ✨',
      '深呼吸一次，把注意力轻轻放回眼前这件事～',
      '累了就歇口气，小鲸同学一直在你身边！',
    ],
    tail: [
      '呀！！尾巴是敏感禁区啦，不许偷偷戳尾巴！',
      '呜…突然碰鲸鱼尾会被吓一跳的啦！',
      '再戳尾巴的话…我就把你的 Lo-Fi 音量调小一点哦（骗你的～）',
    ],
  };
  const zoneIdx = { head: 0, body: 0, tail: 0 };

  function sayBubble(text) {
    bubbleEl.textContent = text;
    bubbleEl.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubbleEl.classList.remove('show'), 3200);
  }

  function applyPoseHotspots(pose) {
    const map = POSE_HOTSPOTS[pose] || POSE_HOTSPOTS.stand;
    lavHotspots.querySelectorAll('.lav-hotspot').forEach(el => {
      const z = el.dataset.zone;
      if (map[z]) el.setAttribute('style', map[z]);
    });
  }

  function syncHotspotRect() {
    const refVid = poseVideos[currentPose] || poseVideos.stand;
    if (!refVid || !lavHotspots) return;
    const zRect = lavZone.getBoundingClientRect();
    const vw = refVid.videoWidth || 640;
    const vh = refVid.videoHeight || 864;
    const scale = Math.min(zRect.width / vw, zRect.height / vh);
    const rw = vw * scale;
    const rh = vh * scale;
    const ox = (zRect.width - rw) / 2;
    const oy = zRect.height - rh;
    lavHotspots.style.left = ox + 'px';
    lavHotspots.style.top = oy + 'px';
    lavHotspots.style.width = rw + 'px';
    lavHotspots.style.height = rh + 'px';
    applyPoseHotspots(currentPose);
  }
  window.addEventListener('resize', syncHotspotRect);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => syncHotspotRect()).observe(lavZone);
  }
  lavZone.addEventListener('transitionend', syncHotspotRect);
  poseVideos.stand.addEventListener('loadedmetadata', syncHotspotRect);
  setTimeout(syncHotspotRect, 120);

  const POSE_STORAGE_KEY = 'jphone_focus_pose_v1';

  function persistPose(pose) {
    try { localStorage.setItem(POSE_STORAGE_KEY, pose); } catch {}
    try { window.jing?.storage?.set?.('focus_pose', pose); } catch {}
  }

  function setPose(pose, isManual = false, opts = {}) {
    if (!poseVideos[pose]) return;
    if (isManual || opts.pin) userPinnedPose = true;
    currentPose = pose;
    if (isManual && opts.persist !== false) {
      persistPose(pose);
    }
    document.querySelectorAll('.pose-card').forEach(b => b.classList.toggle('on', b.dataset.pose === pose));
    applyPoseHotspots(pose);
    if (activeReact) return;
    Object.entries(poseVideos).forEach(([k, v]) => {
      if (k === pose) {
        v.play().catch(() => {});
        v.style.opacity = '1';
      } else {
        v.style.opacity = '0';
      }
    });
    if (isManual && !opts.silent) {
      const msg = pose === 'desk'
        ? '托着腮认真看你专注的样子，加油哦～'
        : pose === 'glance'
          ? '窗外夜色真好，回头就能看见你在努力呢 ✨'
          : pose === 'sit'
            ? '抱膝坐下来安静陪着你，不用着急慢慢来～'
            : '站姿待命中，随时陪你进入心流～';
      sayBubble(msg);
    }
  }

  function restoreSavedPose() {
    let applied = false;
    try {
      const cached = localStorage.getItem(POSE_STORAGE_KEY);
      if (cached && poseVideos[cached]) {
        setPose(cached, false, { pin: true, silent: true, persist: false });
        applied = true;
      }
    } catch {}
    if (window.jing?.storage?.get) {
      Promise.resolve(window.jing.storage.get('focus_pose')).then((saved) => {
        const val = typeof saved === 'string' ? saved : (saved && typeof saved.value === 'string' ? saved.value : '');
        if (val && poseVideos[val] && (!applied || val !== currentPose)) {
          setPose(val, false, { pin: true, silent: true, persist: false });
          try { localStorage.setItem(POSE_STORAGE_KEY, val); } catch {}
        }
      }).catch(() => {});
    }
  }

  document.querySelectorAll('.pose-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeCustomPack) {
        currentPose = btn.dataset.pose;
        applyActiveFocusPack({ silent: true });
        return;
      }
      setPose(btn.dataset.pose, true);
    });
  });

  async function triggerZoneReaction(zone) {
    const lines = ZONE_LINES[zone] || ZONE_LINES.head;
    sayBubble(lines[zoneIdx[zone]++ % lines.length]);
    if (activeCustomPack || currentPose !== 'stand') {
      lavZone.classList.remove('poke-hop');
      void lavZone.offsetWidth;
      lavZone.classList.add('poke-hop');
      return;
    }
    const vid = reactVideos[zone];
    if (!vid || activeReact) return;
    activeReact = zone;
    try {
      vid.currentTime = 0;
      await vid.play();
      vid.style.opacity = '1';
      Object.values(poseVideos).forEach(v => { v.style.opacity = '0'; });
    } catch {
      activeReact = null;
      setPose(currentPose, false);
    }
  }

  Object.entries(reactVideos).forEach(([zone, vid]) => {
    vid.addEventListener('ended', () => {
      vid.style.opacity = '0';
      activeReact = null;
      setPose(currentPose, false);
    });
  });

  lavHotspots.querySelectorAll('.lav-hotspot').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerZoneReaction(el.dataset.zone);
    });
  });

  // ---- Immersive Mode (tap empty background or collapse chevron to hide/show controls smoothly!) ----
  const stageEl = document.getElementById('stage');
  const playerDockEl = document.getElementById('player-dock');
  const immersivePillEl = document.getElementById('immersive-pill');
  const pomoFloatEl = document.getElementById('pomo-float');

  function setImmersive(on) {
    const next = !!on;
    if (next && activeSheet) closeSheet();
    stageEl.classList.toggle('immersive', next);
    syncHeader(currentHeaderBg, next);
    setTimeout(syncHotspotRect, 440);
  }
  document.getElementById('btn-collapse-ui').addEventListener('click', (e) => {
    e.stopPropagation();
    setImmersive(true);
  });
  immersivePillEl.addEventListener('click', (e) => {
    e.stopPropagation();
    setImmersive(false);
  });
  stageEl.addEventListener('click', (e) => {
    if (activeSheet) return;
    if (e.target.closest('.player-dock, #sheet, #sheet-backdrop, .lav-hotspot, #pomo-float, #immersive-pill')) return;
    setImmersive(!stageEl.classList.contains('immersive'));
  });

  // ---- Unified Bottom Sheet Drawer ----
  const sheet = document.getElementById('sheet');
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  const sheetTitle = document.getElementById('sheet-title');
  const SHEET_TITLES = { scenes: '沉浸场景', audio: '声音 · 白噪音 & Lo-Fi', poses: '角色与姿态', pomo: '番茄专注' };
  let activeSheet = null;

  function openSheet(name) {
    if (stageEl.classList.contains('immersive')) setImmersive(false);
    activeSheet = name;
    sheetTitle.textContent = SHEET_TITLES[name] || '';
    ['scenes', 'audio', 'poses', 'pomo'].forEach(k => {
      document.getElementById('pane-' + k).classList.toggle('hidden', k !== name);
    });
    document.querySelectorAll('.dock-tab').forEach(b => b.classList.toggle('on', b.dataset.sheet === name));
    sheetBackdrop.classList.add('open');
    sheet.classList.add('open');
  }
  function closeSheet() {
    activeSheet = null;
    sheetBackdrop.classList.remove('open');
    sheet.classList.remove('open');
    document.querySelectorAll('.dock-tab').forEach(b => b.classList.remove('on'));
  }
  document.querySelectorAll('.dock-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.sheet;
      if (activeSheet === target) closeSheet();
      else openSheet(target);
    });
  });
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectAudioSubTab(btn.dataset.audioTab);
    });
  });
  sheetBackdrop.addEventListener('click', closeSheet);
  document.getElementById('sheet-close').addEventListener('click', closeSheet);
  const bgLayer = document.getElementById('bg-layer');
  function selectAudioSubTab(tab) {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('on', b.dataset.audioTab === tab));
    document.getElementById('sub-noise').classList.toggle('hidden', tab !== 'noise');
    document.getElementById('sub-lofi').classList.toggle('hidden', tab !== 'lofi');
    if (tab === 'lofi') refreshAlbums();
  }
  document.getElementById('open-audio-meta').addEventListener('click', () => { openSheet('audio'); selectAudioSubTab('lofi'); });
  document.getElementById('vinyl-wrap').addEventListener('click', () => { openSheet('audio'); selectAudioSubTab('lofi'); });

  // Close poses sheet smoothly right after selecting a pose so user enjoys full unobstructed view!
  document.querySelectorAll('.pose-card').forEach(btn => {
    btn.addEventListener('click', () => { setTimeout(closeSheet, 180); });
  });

  // ---- Render Scenes / Noise Mixer / Lo-Fi List ----
  let currentSceneId = 'rainy-ocean';
  const sceneGrid = document.getElementById('scene-grid');
  function renderScenes() {
    sceneGrid.innerHTML = '';
    for (const sc of SCENES) {
      const card = document.createElement('div');
      card.className = 'scene-card' + (currentSceneId === sc.id ? ' on' : '');
      card.style.backgroundImage = 'url(' + sc.bg + ')';
      card.innerHTML = '<div class="scene-name">' + sc.name + '</div><div class="scene-desc">' + sc.desc + '</div>';
      card.addEventListener('click', () => { applyScenePreset(sc); closeSheet(); });
      sceneGrid.appendChild(card);
    }
  }

  const noiseGrid = document.getElementById('noise-grid');
  const albumStrip = document.getElementById('album-strip');
  const albumHero = document.getElementById('album-hero');
  const lofiList = document.getElementById('lofi-list');
  const vinylEl = document.getElementById('vinyl');
  const vinylCoverEl = document.getElementById('vinyl-cover');
  const nowTitle = document.getElementById('now-title');
  const nowSub = document.getElementById('now-sub');
  const playToggleBtn = document.getElementById('btn-play-toggle');
  const playModeBtn = document.getElementById('btn-play-mode');
  const tabAudioLbl = document.getElementById('tab-audio-lbl');

  function resolveDisplayCover(st) {
    if (st && st.track && st.track.coverUrl) return st.track.coverUrl;
    if (st && st.coverUrl) return st.coverUrl;
    const playingAlbumId = (st && st.track && st.track.albumId) || selectedAlbumId;
    const found = albumsList.find(a => a.id === playingAlbumId);
    return (found && found.cover) || '/jphone/media/focus/covers/echoes.jpg';
  }

  function renderAudioUi() {
    const st = getMediaState();
    const activeNoises = st.noises || {};
    const activeNoiseIds = Object.keys(activeNoises).filter(k => activeNoises[k] && activeNoises[k].active !== false);
    const mode = getCurrentPlayMode();

    const isPlayingNow = !!st.playing;
    vinylEl.classList.toggle('spin', isPlayingNow);
    const nextCover = resolveDisplayCover(st);
    if (vinylCoverEl && vinylCoverEl.getAttribute('src') !== nextCover) {
      vinylCoverEl.setAttribute('src', nextCover);
    }
    const vinylWrapEl = document.getElementById('vinyl-wrap');
    const vizBarsEl = document.getElementById('viz-bars');
    const lavHaloEl = document.getElementById('lav-halo');
    if (vinylWrapEl) vinylWrapEl.classList.toggle('playing', isPlayingNow);
    if (vizBarsEl) vizBarsEl.classList.toggle('playing', isPlayingNow);
    if (lavHaloEl) lavHaloEl.classList.toggle('playing', isPlayingNow);
    playToggleBtn.innerHTML = st.playing ? LUCIDE.pause : LUCIDE.play;
    if (playModeBtn) {
      playModeBtn.innerHTML = PLAY_MODE_SVGS[mode] || PLAY_MODE_SVGS.order;
      playModeBtn.title = '播放模式：' + (PLAY_MODE_LABELS[mode] || '顺序循环');
      playModeBtn.classList.toggle('accent', mode !== 'order');
    }
    document.querySelectorAll('#mode-bar .mode-pill').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.mode === mode);
    });
    tabAudioLbl.textContent = activeNoiseIds.length > 0 ? ('声音(' + activeNoiseIds.length + ')') : '声音';

    if (st.track && st.track.title) {
      nowTitle.textContent = st.track.title;
      const mixNames = activeNoiseIds.map(id => (activeNoises[id]?.name || id)).slice(0, 3).join(' + ');
      const alLabel = st.track.albumName ? ('《' + st.track.albumName + '》') : '';
      const modeLabel = PLAY_MODE_LABELS[mode] || '顺序循环';
      nowSub.textContent = mixNames
        ? ('混音：' + mixNames + (alLabel ? (' · ' + alLabel) : ''))
        : ((alLabel ? (alLabel + ' · ') : '') + modeLabel + ' · 后台持续播放');
    } else if (activeNoiseIds.length > 0) {
      const mixNames = activeNoiseIds.map(id => (activeNoises[id]?.name || id)).join(' + ');
      nowTitle.textContent = '白噪音 · ' + mixNames;
      nowSub.textContent = '退出小鲸专注后仍将在后台继续播放';
    } else {
      nowTitle.textContent = '深海雨夜 · 轻触开始陪伴';
      nowSub.textContent = '三张 Origo 专辑 · 顺序/随机/单曲循环';
    }

    // Update Noise Tiles
    noiseGrid.innerHTML = '';
    for (const item of NOISES) {
      const info = activeNoises[item.id];
      const on = !!(info && info.active !== false);
      const vol = info ? info.volume : item.defaultVol;
      const tile = document.createElement('div');
      tile.className = 'noise-tile' + (on ? ' on' : '');
      tile.innerHTML =
        '<div class="noise-badge">' + item.emoji + '</div>' +
        '<div class="noise-name">' + item.name + '</div>' +
        '<input class="noise-vol" type="range" min="0.05" max="1" step="0.05" value="' + vol + '" />';
      tile.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        setNoiseChannel(item, !on, vol);
      });
      const slider = tile.querySelector('input');
      slider.addEventListener('input', (e) => {
        const v = Number(e.target.value);
        setNoiseChannel(item, true, v);
      });
      noiseGrid.appendChild(tile);
    }

    // Update 3-Album Strip
    const selectedAlbum = albumsList.find(a => a.id === selectedAlbumId) || albumsList[0];
    if (selectedAlbum) selectedAlbumId = selectedAlbum.id;

    if (albumStrip) {
      albumStrip.innerHTML = '';
      for (const al of albumsList) {
        const dl = al.download || {};
        const card = document.createElement('div');
        card.className = 'album-card' + (al.id === selectedAlbumId ? ' on' : '');
        const badgeHtml = dl.downloading
          ? (LUCIDE.downloadXs + '<span>' + (dl.done || 0) + '/' + (dl.total || al.totalTracks) + '</span>')
          : (al.complete ? (LUCIDE.checkXs + '<span>' + al.totalTracks + '首</span>') : ('<span>' + al.availableTracks + '/' + al.totalTracks + '</span>'));
        card.innerHTML =
          '<div class="album-cover-box">' +
            '<img src="' + al.cover + '" alt="' + al.name + '" loading="lazy" />' +
            '<span class="album-badge' + (al.complete ? ' done' : '') + '">' + badgeHtml + '</span>' +
          '</div>' +
          '<div class="album-card-name">' + al.name + '</div>';
        card.addEventListener('click', () => {
          selectedAlbumId = al.id;
          renderAudioUi();
        });
        albumStrip.appendChild(card);
      }
    }

    // Update Selected Album Hero Banner
    if (albumHero && selectedAlbum) {
      const dl = selectedAlbum.download || {};
      const pct = dl.total > 0 ? Math.min(100, Math.round(((dl.done || 0) / dl.total) * 100)) : 0;
      const statusText = dl.downloading
        ? ('下载中 ' + (dl.done || 0) + '/' + (dl.total || 0) + (dl.currentTrack ? (' · ' + dl.currentTrack) : ''))
        : (selectedAlbum.complete
          ? ('完整专辑已就绪 · 共 ' + selectedAlbum.totalTracks + ' 首')
          : ('已就绪 ' + selectedAlbum.availableTracks + ' / ' + selectedAlbum.totalTracks + ' 首 · 剩余 ' + formatMb(selectedAlbum.remainingBytes)));

      albumHero.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'album-hero';
      const img = document.createElement('img');
      img.className = 'album-hero-cover';
      img.src = selectedAlbum.cover;
      img.alt = selectedAlbum.name;
      const info = document.createElement('div');
      info.className = 'album-hero-info';
      info.innerHTML =
        '<div class="album-hero-title"><span>' + selectedAlbum.name + '</span><span class="album-hero-en">' + (selectedAlbum.en || '') + '</span></div>' +
        '<div class="album-hero-desc">' + statusText + '</div>';

      if (dl.downloading) {
        const bar = document.createElement('div');
        bar.className = 'album-prog-bar';
        bar.innerHTML = '<div class="album-prog-fill" style="width:' + Math.max(6, pct) + '%"></div>';
        info.appendChild(bar);
      }

      const acts = document.createElement('div');
      acts.className = 'album-hero-actions';

      if (selectedAlbum.availableTracks > 0) {
        const playAllBtn = document.createElement('button');
        playAllBtn.type = 'button';
        playAllBtn.className = 'album-sec-btn';
        playAllBtn.innerHTML = LUCIDE.playSm + '<span>播放专辑</span>';
        playAllBtn.addEventListener('click', () => playWholeAlbum(selectedAlbum.id));
        acts.appendChild(playAllBtn);
      }

      if (!selectedAlbum.complete) {
        const dlBtn = document.createElement('button');
        dlBtn.type = 'button';
        dlBtn.className = 'album-cta-btn';
        dlBtn.disabled = !!dl.downloading;
        dlBtn.innerHTML = dl.downloading
          ? (LUCIDE.download + '<span>下载中 ' + pct + '%</span>')
          : (LUCIDE.download + '<span>获取完整专辑 (' + formatMb(selectedAlbum.remainingBytes) + ')</span>');
        dlBtn.addEventListener('click', () => startDownloadAlbum(selectedAlbum.id));
        acts.appendChild(dlBtn);
      }

      if (selectedAlbum.downloadedTracks > 0 && !dl.downloading) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'album-del-btn';
        delBtn.innerHTML = LUCIDE.trash + '<span>清理缓存</span>';
        delBtn.addEventListener('click', () => removeDownloadedAlbum(selectedAlbum.id));
        acts.appendChild(delBtn);
      }

      info.appendChild(acts);
      box.appendChild(img);
      box.appendChild(info);
      albumHero.appendChild(box);
    }

    // Update Selected Album Track List
    lofiList.innerHTML = '';
    const tracks = selectedAlbum ? (selectedAlbum.tracks || []) : LOFIS;
    for (const tr of tracks) {
      const on = !!(st.track && st.track.id === tr.id);
      const avail = tr.available !== false;
      const row = document.createElement('div');
      row.className = 'lofi-row' + (on ? ' on' : '') + (avail ? '' : ' locked');
      const eqLabel = on && st.playing ? LUCIDE.audioLines : (avail ? (tr.num || LUCIDE.playSm) : LUCIDE.cloudDown);
      const tagHtml = tr.builtin
        ? '<span class="lofi-tag">内置</span>'
        : (avail ? '<span class="lofi-tag">本地</span>' : '<span class="lofi-tag cloud">云端</span>');
      row.innerHTML =
        '<div class="lofi-eq">' + eqLabel + '</div>' +
        '<div class="lofi-info"><div class="lofi-title">' + tr.name + '</div><div class="lofi-en">' + (tr.en || '') + '</div></div>' +
        tagHtml;
      row.addEventListener('click', () => {
        if (!avail) {
          startDownloadAlbum(selectedAlbum.id);
          return;
        }
        if (on && st.playing && hostAudio) {
          hostAudio.togglePlay();
          renderAudioUi();
        } else {
          playTrackObj(tr, selectedAlbum);
        }
      });
      lofiList.appendChild(row);
    }
  }

  if (playModeBtn) {
    playModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      cyclePlayMode();
    });
  }
  document.querySelectorAll('#mode-bar .mode-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      setPlayMode(btn.dataset.mode, true);
    });
  });

  playToggleBtn.addEventListener('click', () => {
    const st = getMediaState();
    if (!st.hasActiveAudio) {
      applyScenePreset(SCENES.find(s => s.id === currentSceneId) || SCENES[0]);
      return;
    }
    if (hostAudio) hostAudio.togglePlay();
    else {
      localState.playing = !localState.playing;
      if (localLofi) localState.playing ? localLofi.play().catch(() => {}) : localLofi.pause();
      localNoises.forEach(a => localState.playing ? a.play().catch(() => {}) : a.pause());
    }
    renderAudioUi();
  });

  document.getElementById('btn-next-track').addEventListener('click', () => {
    if (hostAudio && typeof hostAudio.nextTrack === 'function') {
      const st = getMediaState();
      if (!st.queueLength) syncQueueForAlbum(selectedAlbumId);
      hostAudio.nextTrack();
    } else {
      const next = pickLocalNextTrack(1, false);
      if (next) playTrackObj(next);
    }
    renderAudioUi();
  });

  // Hydrate full 3-album catalog from local DSH plugin
  refreshAlbums();

  document.getElementById('btn-stop-all').addEventListener('click', () => {
    if (hostAudio) hostAudio.stopAll();
    else {
      localNoises.forEach(a => a.pause());
      if (localLofi) localLofi.pause();
      localState = { playing: false, hasActiveAudio: false, track: null, noises: {}, sceneName: '' };
    }
    renderAudioUi();
  });

  if (hostAudio && typeof hostAudio.subscribe === 'function') {
    hostAudio.subscribe(() => renderAudioUi());
  }

  // ---- M3: Host-synced Persistent Pomodoro State Machine (survives exit!) ----
  const hostFocus = (() => {
    try { return (window.parent && window.parent.__jphoneFocus) || window.__jphoneFocus || null; } catch { return null; }
  })();

  let cfg = { focusMin: 25, breakMin: 5, pauseOnBreak: true, completedCount: 0, todayMinutes: 0 };
  try {
    if (window.jing?.storage) {
      const saved = await window.jing.storage.get('focus_cfg_v2');
      if (saved && typeof saved === 'object') cfg = { ...cfg, ...saved };
    }
  } catch {}
  const saveCfg = () => {
    try {
      window.jing?.storage?.set('focus_cfg_v2', cfg);
      window.jing?.storage?.set('stats', { totalMinutes: cfg.todayMinutes, totalPomodoros: cfg.completedCount });
    } catch {}
  };

  let phase = 'focus';
  let cycle = 1;
  let totalSec = cfg.focusMin * 60;
  let remainSec = totalSec;
  let running = false;
  let timerId = null;
  let lastCompletedCount = cfg.completedCount;

  const timeTxt = document.getElementById('time-txt');
  const phaseText = document.getElementById('phase-text');
  const phaseDot = document.getElementById('phase-dot');
  const btnStart = document.getElementById('btn-start');
  const btnFloatToggle = document.getElementById('btn-float-toggle');
  const btnFloatReset = document.getElementById('btn-float-reset');
  const tabPomoLbl = document.getElementById('tab-pomo-lbl');
  const fVal = document.getElementById('f-val');
  const bVal = document.getElementById('b-val');
  const pauseOnBreak = document.getElementById('pause-on-break');
  const todayStats = document.getElementById('today-stats');
  let pomoActivated = false;

  function applyHostFocusSnapshot(snap) {
    if (!snap) return;
    running = !!snap.running;
    phase = snap.phase || 'focus';
    cycle = snap.cycle || 1;
    totalSec = snap.totalSec || (cfg.focusMin * 60);
    remainSec = typeof snap.remainSec === 'number' ? snap.remainSec : totalSec;
    cfg.focusMin = snap.focusMin || cfg.focusMin;
    cfg.breakMin = snap.breakMin || cfg.breakMin;
    cfg.pauseOnBreak = snap.pauseOnBreak !== false;
    if (running || remainSec < totalSec || phase === 'break') {
      pomoActivated = true;
    }
    if (typeof snap.completedCount === 'number' && snap.completedCount > lastCompletedCount) {
      lastCompletedCount = snap.completedCount;
      cfg.completedCount = snap.completedCount;
      cfg.todayMinutes = snap.todayMinutes || cfg.todayMinutes;
      saveCfg();
      sayBubble('完成一轮番茄啦！起来伸个懒腰休息一下吧～');
    } else if (typeof snap.completedCount === 'number') {
      cfg.completedCount = snap.completedCount;
      cfg.todayMinutes = snap.todayMinutes || cfg.todayMinutes;
    }
    renderPomo();
  }

  function renderPomo() {
    const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
    const ss = String(remainSec % 60).padStart(2, '0');
    timeTxt.textContent = mm + ':' + ss;
    phaseText.textContent = (phase === 'focus' ? '专注' : '休息') + ' · ' + cycle + '/4';
    phaseDot.className = 'pill-dot' + (phase === 'break' ? ' break' : '') + (running ? ' running' : '');
    const showFloat = pomoActivated || running;
    pomoFloatEl.classList.toggle('active', showFloat);
    stageEl.classList.toggle('has-pomo', showFloat);
    btnStart.textContent = running ? '暂停专注' : (showFloat ? '继续专注' : '开始专注');
    btnFloatToggle.textContent = running ? '暂停' : '继续';
    tabPomoLbl.textContent = showFloat ? mm + ':' + ss : '番茄钟';
    fVal.textContent = String(cfg.focusMin);
    bVal.textContent = String(cfg.breakMin);
    document.querySelectorAll('.preset-chip').forEach(ch => {
      ch.classList.toggle('on', Number(ch.dataset.min) === cfg.focusMin);
    });
    pauseOnBreak.checked = !!cfg.pauseOnBreak;
    todayStats.textContent = cfg.todayMinutes + ' 分钟 · ' + cfg.completedCount + ' 轮';
  }

  pomoFloatEl.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    pomoFloatEl.classList.toggle('show-ctrls');
  });

  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      cfg.focusMin = Number(chip.dataset.min) || 25;
      if (hostFocus) applyHostFocusSnapshot(hostFocus.setDurations({ focusMin: cfg.focusMin }));
      else if (!running && phase === 'focus') { totalSec = cfg.focusMin * 60; remainSec = totalSec; }
      saveCfg();
      renderPomo();
    });
  });

  if (hostFocus) {
    applyHostFocusSnapshot(hostFocus.seed(cfg));
    const unsubFocus = hostFocus.subscribe(applyHostFocusSnapshot);
    window.addEventListener('beforeunload', () => { try { unsubFocus(); } catch {} });
  }

  function tick() {
    if (remainSec > 0) {
      remainSec--;
      renderPomo();
      return;
    }
    if (phase === 'focus') {
      cfg.completedCount += 1;
      cfg.todayMinutes += cfg.focusMin;
      saveCfg();
      phase = 'break';
      totalSec = cfg.breakMin * 60;
      remainSec = totalSec;
      if (cfg.pauseOnBreak && hostAudio && getMediaState().playing) hostAudio.togglePlay();
      try {
        window.jing?.notify?.send('focus_done', '🍅 小鲸专注完成一轮！', '刚完成 ' + cfg.focusMin + ' 分钟深度专注，今日累计 ' + cfg.todayMinutes + ' 分钟～');
      } catch {}
      sayBubble('完成一轮番茄啦！起来伸个懒腰休息一下吧～');
    } else {
      phase = 'focus';
      cycle = (cycle % 4) + 1;
      totalSec = cfg.focusMin * 60;
      remainSec = totalSec;
      sayBubble('休息结束，新一轮专注开始！');
    }
    renderPomo();
    renderAudioUi();
  }

  function togglePomodoro() {
    pomoActivated = true;
    pomoFloatEl.classList.remove('show-ctrls');
    if (hostFocus) {
      const snap = hostFocus.toggle();
      applyHostFocusSnapshot(snap);
      if (snap.running) {
        if (!getMediaState().hasActiveAudio) {
          applyScenePreset(SCENES.find(s => s.id === currentSceneId) || SCENES[0]);
        }
        closeSheet();
        sayBubble('计时开始啦，小鲸在窗边陪你进入心流～');
      }
      return;
    }
    running = !running;
    if (running) {
      clearInterval(timerId);
      timerId = setInterval(tick, 1000);
      if (!getMediaState().hasActiveAudio) {
        applyScenePreset(SCENES.find(s => s.id === currentSceneId) || SCENES[0]);
      }
      closeSheet();
      sayBubble('计时开始啦，小鲸同学陪你进入心流～');
    } else {
      clearInterval(timerId);
      timerId = null;
    }
    renderPomo();
  }

  function resetPomodoro() {
    pomoActivated = false;
    pomoFloatEl.classList.remove('show-ctrls');
    if (hostFocus) {
      applyHostFocusSnapshot(hostFocus.reset());
      return;
    }
    running = false;
    clearInterval(timerId);
    timerId = null;
    phase = 'focus';
    totalSec = cfg.focusMin * 60;
    remainSec = totalSec;
    renderPomo();
  }

  btnStart.addEventListener('click', togglePomodoro);
  btnFloatToggle.addEventListener('click', (e) => { e.stopPropagation(); togglePomodoro(); });
  btnFloatReset.addEventListener('click', (e) => { e.stopPropagation(); resetPomodoro(); });
  document.getElementById('btn-reset').addEventListener('click', resetPomodoro);

  document.getElementById('f-dec').addEventListener('click', () => {
    cfg.focusMin = Math.max(5, cfg.focusMin - 5);
    if (hostFocus) applyHostFocusSnapshot(hostFocus.setDurations({ focusMin: cfg.focusMin }));
    else if (!running && phase === 'focus') { totalSec = cfg.focusMin * 60; remainSec = totalSec; }
    saveCfg(); renderPomo();
  });
  document.getElementById('f-inc').addEventListener('click', () => {
    cfg.focusMin = Math.min(90, cfg.focusMin + 5);
    if (hostFocus) applyHostFocusSnapshot(hostFocus.setDurations({ focusMin: cfg.focusMin }));
    else if (!running && phase === 'focus') { totalSec = cfg.focusMin * 60; remainSec = totalSec; }
    saveCfg(); renderPomo();
  });
  document.getElementById('b-dec').addEventListener('click', () => {
    cfg.breakMin = Math.max(1, cfg.breakMin - 1);
    if (hostFocus) applyHostFocusSnapshot(hostFocus.setDurations({ breakMin: cfg.breakMin }));
    else if (!running && phase === 'break') { totalSec = cfg.breakMin * 60; remainSec = totalSec; }
    saveCfg(); renderPomo();
  });
  document.getElementById('b-inc').addEventListener('click', () => {
    cfg.breakMin = Math.min(30, cfg.breakMin + 1);
    if (hostFocus) applyHostFocusSnapshot(hostFocus.setDurations({ breakMin: cfg.breakMin }));
    else if (!running && phase === 'break') { totalSec = cfg.breakMin * 60; remainSec = totalSec; }
    saveCfg(); renderPomo();
  });
  pauseOnBreak.addEventListener('change', () => {
    cfg.pauseOnBreak = pauseOnBreak.checked;
    if (hostFocus) hostFocus.setDurations({ pauseOnBreak: cfg.pauseOnBreak });
    saveCfg();
  });

  // ---- Custom & Workshop Focus Video / Character Packs ----
  const customLavVid = document.getElementById('custom-lav-vid');
  const customLavImg = document.getElementById('custom-lav-img');
  const focusPackListEl = document.getElementById('focus-pack-list');
  const poseGridEl = document.getElementById('pose-grid');
  const poseSectionTitleEl = document.getElementById('pose-section-title');
  const importFocusBtn = document.getElementById('btn-import-focus-video');
  const focusVideoInput = document.getElementById('focus-video-input');
  let focusPacks = [];
  let activeFocusPackId = 'xiaojing';
  let activeCustomPack = null;

  function getActiveFocusPack() {
    return focusPacks.find((p) => p.id === activeFocusPackId) || null;
  }

  function applyActiveFocusPack(opts = {}) {
    const pack = getActiveFocusPack();
    const isCustom = !!(pack && !pack.builtin && pack.id !== 'xiaojing');
    activeCustomPack = isCustom ? pack : null;

    if (!isCustom) {
      if (customLavVid) {
        try { customLavVid.pause(); } catch {}
        customLavVid.style.opacity = '0';
      }
      if (customLavImg) customLavImg.style.opacity = '0';
      if (poseGridEl) poseGridEl.style.display = '';
      if (poseSectionTitleEl) poseSectionTitleEl.textContent = '小鲸伴学姿态';
      setPose(currentPose || 'stand', false, { silent: true, persist: false });
      return;
    }

    // Hide official xiaojing clips when displaying custom/workshop pack
    Object.values(poseVideos).forEach((v) => {
      try { v.pause(); } catch {}
      v.style.opacity = '0';
    });
    Object.values(reactVideos).forEach((v) => {
      try { v.pause(); } catch {}
      v.style.opacity = '0';
    });
    activeReact = null;

    const poses = pack.poses || {};
    const poseKeys = Object.keys(poses);
    const chosenKey = poses[currentPose] ? currentPose : (poses.stand ? 'stand' : poseKeys[0]);
    const entry = chosenKey ? poses[chosenKey] : null;

    if (poseGridEl) {
      const hasMulti = poseKeys.length > 1;
      poseGridEl.style.display = hasMulti ? '' : 'none';
      if (poseSectionTitleEl) {
        poseSectionTitleEl.textContent = hasMulti ? (pack.name + ' · 姿态') : (pack.name + ' · 单循环伴学动态');
      }
      poseGridEl.querySelectorAll('.pose-card').forEach((btn) => {
        const k = btn.dataset.pose;
        btn.style.display = poses[k] ? '' : 'none';
        btn.classList.toggle('on', k === chosenKey);
      });
    }

    if (entry && entry.url) {
      const isImg = entry.mediaType === 'image' || /\\.(png|webp|gif|jpg|jpeg)(\\?|$)/i.test(entry.url);
      if (isImg) {
        if (customLavVid) {
          try { customLavVid.pause(); } catch {}
          customLavVid.style.opacity = '0';
        }
        if (customLavImg) {
          customLavImg.src = entry.url;
          customLavImg.style.opacity = '1';
        }
      } else {
        if (customLavImg) customLavImg.style.opacity = '0';
        if (customLavVid) {
          if (customLavVid.getAttribute('src') !== entry.url) {
            customLavVid.src = entry.url;
            customLavVid.load();
          }
          customLavVid.play().catch(() => {});
          customLavVid.style.opacity = '1';
        }
      }
    }

    if (pack.bgUrl) {
      const bgLayer = document.getElementById('bg-layer');
      if (bgLayer) {
        bgLayer.style.backgroundImage = 'url("' + pack.bgUrl + '")';
        if (typeof detectTopForeground === 'function') {
          detectTopForeground(pack.bgUrl);
        }
      }
    }
    if (!opts.silent) {
      sayBubble('已切换伴学角色：' + pack.name + ' ✨');
    }
  }

  function renderFocusPackList() {
    if (!focusPackListEl) return;
    focusPackListEl.innerHTML = '';
    const list = focusPacks.length > 0
      ? focusPacks
      : [{ id: 'xiaojing', name: '小鲸同学（官方）', builtin: true, source: 'builtin' }];

    list.forEach((pack) => {
      const chip = document.createElement('div');
      chip.className = 'pack-chip' + (pack.id === activeFocusPackId ? ' on' : '');
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;

      const label = document.createElement('span');
      label.textContent = pack.name || pack.id;
      chip.appendChild(label);

      const tag = document.createElement('span');
      tag.className = 'pack-chip-tag';
      tag.textContent = pack.builtin ? '官方' : (String(pack.source || '').startsWith('git:') ? '工坊' : '本地');
      chip.appendChild(tag);

      chip.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (pack.id === activeFocusPackId) return;
        activeFocusPackId = pack.id;
        renderFocusPackList();
        applyActiveFocusPack();
        try {
          if (window.jing?.focus?.selectPack) {
            await window.jing.focus.selectPack(pack.id);
          }
        } catch {}
      });

      if (!pack.builtin) {
        const del = document.createElement('button');
        del.className = 'pack-chip-del';
        del.type = 'button';
        del.title = '删除自定义视频包';
        del.textContent = '×';
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            if (window.jing?.focus?.deletePack) {
              const res = await window.jing.focus.deletePack(pack.id);
              if (res && res.ok) {
                focusPacks = Array.isArray(res.packs) ? res.packs : focusPacks.filter((x) => x.id !== pack.id);
                activeFocusPackId = res.activeId || 'xiaojing';
                renderFocusPackList();
                applyActiveFocusPack({ silent: true });
                sayBubble('已移除自定义伴学视频包');
              }
            }
          } catch {}
        });
        chip.appendChild(del);
      }

      focusPackListEl.appendChild(chip);
    });
  }

  async function loadFocusPacks(opts = { silent: true }) {
    try {
      if (!window.jing?.focus?.listPacks) {
        renderFocusPackList();
        return;
      }
      const res = await window.jing.focus.listPacks();
      if (res && res.ok && Array.isArray(res.packs)) {
        focusPacks = res.packs;
        activeFocusPackId = res.activeId || 'xiaojing';
        renderFocusPackList();
        applyActiveFocusPack(opts);
      }
    } catch {
      renderFocusPackList();
    }
  }

  if (importFocusBtn && focusVideoInput) {
    importFocusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      focusVideoInput.value = '';
      focusVideoInput.click();
    });
    focusVideoInput.addEventListener('change', async () => {
      const file = focusVideoInput.files && focusVideoInput.files[0];
      if (!file) return;
      if (file.size > 40 * 1024 * 1024) {
        sayBubble('视频文件请控制在 40MB 以内哦～');
        return;
      }
      const prevText = importFocusBtn.textContent;
      importFocusBtn.textContent = '上传中...';
      importFocusBtn.disabled = true;
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('read_failed'));
          reader.readAsDataURL(file);
        });
        const cleanName = file.name.replace(/\\.(webm|mp4|mov|png|webp|gif|jpg|jpeg)$/i, '').trim() || '自定义伴学视频';
        const res = await window.jing.focus.uploadMedia({
          name: cleanName,
          slot: 'stand',
          filename: file.name,
          dataBase64: dataUrl,
          activate: true,
        });
        if (res && res.ok) {
          focusPacks = Array.isArray(res.packs) ? res.packs : focusPacks;
          activeFocusPackId = res.activeId || (res.pack && res.pack.id) || 'xiaojing';
          renderFocusPackList();
          applyActiveFocusPack();
          window.jing?.ui?.notify?.({ title: '导入成功', body: '已启用自定义动态视频：' + cleanName });
        } else {
          sayBubble('导入失败：' + (res?.error || '请检查网络连接'));
        }
      } catch (err) {
        sayBubble('导入失败：' + (err?.message || '读取文件异常'));
      } finally {
        importFocusBtn.textContent = prevText;
        importFocusBtn.disabled = false;
      }
    });
  }

  restoreSavedPose();
  loadFocusPacks({ silent: true });
  renderScenes();
  renderPomo();
  renderAudioUi();
})();
</script>
</body>
</html>`

export function createFocusMiniAppRecord(installedAt = Date.now()) {
  return {
    id: 'jing-focus',
    name: '小鲸专注',
    icon: 'timer',
    description: 'Origo 风格沉浸式影音专注空间：小鲸同学透明互动陪伴、12 路白噪音混音与后台持续 Lo-Fi 播放',
    version: '2.0.0',
    source: 'builtin',
    installedAt,
    html: JING_FOCUS_MINIAPP_HTML,
  }
}
