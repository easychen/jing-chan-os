export const LAV_POC_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>鲸Phone LAV 透明互动视频 POC（原生 VP9+Alpha 零 Shader 方案）</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif; }
  body { margin: 0; min-height: 100vh; background: #0B1120; color: #F8FAFC; display: flex; flex-direction: column; align-items: center; padding: 18px; }
  .header { width: 100%; max-width: 920px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .title { font-size: 18px; font-weight: 700; }
  .sub { font-size: 12.5px; color: #94A3B8; margin-top: 2px; }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
  button { border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.08); color: #fff; border-radius: 10px; padding: 7px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  button.on { background: #2563EB; border-color: #60A5FA; }
  .main { width: 100%; max-width: 920px; display: grid; grid-template-columns: 380px 1fr; gap: 18px; align-items: start; }
  @media (max-width: 780px) { .main { grid-template-columns: 1fr; } }
  .stage {
    position: relative;
    width: 380px;
    height: 620px;
    border-radius: 32px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.18);
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    user-select: none;
  }
  .stage.bg-checker {
    background-image:
      linear-gradient(45deg, #334155 25%, transparent 25%),
      linear-gradient(-45deg, #334155 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #334155 75%),
      linear-gradient(-45deg, transparent 75%, #334155 75%);
    background-size: 24px 24px;
    background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    background-color: #1E293B;
  }
  .stage.bg-ocean {
    background: radial-gradient(circle at 50% 20%, #38BDF8 0%, #1D4ED8 48%, #0F172A 100%);
  }
  .stage.bg-desk {
    background: linear-gradient(160deg, #F8FAFC 0%, #DBEAFE 55%, #C7D2FE 100%);
  }
  .vid-layer {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 100%;
    height: auto;
    max-height: 92%;
    object-fit: contain;
    pointer-events: none;
    transition: opacity 0.22s ease;
  }
  #hotspot-svg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    z-index: 5;
  }
  #hotspot-badge {
    position: absolute;
    left: 10px;
    top: 10px;
    z-index: 6;
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(15,23,42,0.82);
    border: 0.5px solid rgba(125,211,252,0.5);
    color: #BAE6FD;
    pointer-events: none;
    opacity: 0;
    transition: opacity .15s;
  }
  .hud {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    padding: 16px;
  }
  .kv { display: grid; grid-template-columns: 120px 1fr; gap: 8px 12px; font-size: 13px; margin-bottom: 14px; }
  .k { color: #94A3B8; }
  .v { font-weight: 600; font-variant-numeric: tabular-nums; }
  .v.good { color: #4ADE80; }
  .log { background: rgba(0,0,0,0.35); border-radius: 12px; padding: 10px 12px; font-size: 12px; font-family: ui-monospace, SFMono-Regular, monospace; height: 170px; overflow-y: auto; line-height: 1.55; color: #CBD5E1; }
  .trigger-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; background: rgba(52,199,89,0.2); color: #86EFAC; border: 1px solid rgba(52,199,89,0.4); }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">鲸Phone LAV 透明互动视频 POC <span class="badge">Native VP9+Alpha · 零 Shader</span></div>
      <div class="sub">使用浏览器原生 &lt;video&gt; 硬件/合成器透明解码 + Origo WebVTT 多边形触摸热区状态机</div>
    </div>
    <div class="toolbar">
      <button id="bg-checker" class="on">透明棋盘格</button>
      <button id="bg-ocean">深海壁纸</button>
      <button id="bg-desk">浅色桌面</button>
      <button id="toggle-debug" class="on">显示热区线框</button>
    </div>
  </div>

  <div class="main">
    <div id="stage" class="stage bg-checker">
      <!-- Dual native VP9+Alpha video elements for zero-flash crossfade -->
      <video id="vid-idle" class="vid-layer" src="/jphone/poc/lav/assets/lumia_alpha_pingpon_60.webm" autoplay loop muted playsinline></video>
      <video id="vid-react" class="vid-layer" muted playsinline style="opacity:0"></video>
      <svg id="hotspot-svg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
      <div id="hotspot-badge"></div>
    </div>

    <div class="hud">
      <div class="kv">
        <div class="k">渲染路径</div><div class="v good">HTML5 &lt;video&gt; 原生 VP9 Alpha（无 FragmentShader）</div>
        <div class="k">当前状态</div><div class="v" id="st-state">idle (lumia_alpha_pingpon_60.webm)</div>
        <div class="k">实时视频帧率</div><div class="v good" id="st-fps">测量中...</div>
        <div class="k">丢帧 / 总帧</div><div class="v" id="st-drop">0 / 0 (0.0%)</div>
        <div class="k">透明通道验证</div><div class="v" id="st-alpha">检测中...</div>
        <div class="k">已载入热区</div><div class="v" id="st-hotspots">解析 touch.vtt 中...</div>
      </div>

      <div style="font-size:12px;color:#94A3B8;margin-bottom:8px;">手动触发互动节点（也可直接点击左侧人物头部/耳朵/肩膀/双手）：</div>
      <div class="trigger-grid">
        <button data-react="head">摸头 (05_touch_head)</button>
        <button data-react="ear">戳耳朵 (01_touch_ear)</button>
        <button data-react="shoulder">拍肩膀 (02_touch_shoulder)</button>
        <button data-react="hands">牵手 (07_touch_hands)</button>
        <button data-react="idle">回到待机</button>
      </div>

      <div class="log" id="log"></div>
    </div>
  </div>

<script>
(async function () {
  const vidIdle = document.getElementById('vid-idle');
  const vidReact = document.getElementById('vid-react');
  const svg = document.getElementById('hotspot-svg');
  const stage = document.getElementById('stage');
  const logEl = document.getElementById('log');

  const REACTIONS = {
    head: { file: '05_touch_head_60.webm', label: '摸头反应' },
    ear: { file: '01_touch_ear_60.webm', label: '戳耳朵反应' },
    shoulder: { file: '02_touch_shoulder_60.webm', label: '拍肩膀反应' },
    hands: { file: '07_touch_hands_60.webm', label: '牵手反应' },
  };
  const HOTSPOT_TO_REACT = {
    headfront: 'head', ear1: 'ear', ear2: 'ear',
    shoulder1: 'shoulder', shoulder2: 'shoulder',
    hands: 'hands', hand1: 'hands', hand2: 'hands',
  };

  let showDebug = true;
  let hotspots = [];
  let activeState = 'idle';
  let frameCount = 0;
  let fpsStart = performance.now();
  let lastFps = 0;

  function log(msg) {
    const t = new Date().toTimeString().slice(0, 8);
    logEl.textContent = '[' + t + '] ' + msg + '\\n' + logEl.textContent;
  }

  // Parse Origo WebVTT polygon hotspots
  function parseVtt(text) {
    const out = [];
    const lines = text.split(/\\r?\\n/);
    for (const line of lines) {
      const s = line.trim();
      if (s.startsWith('{') && s.endsWith('}')) {
        try {
          const obj = JSON.parse(s);
          if (obj.name && Array.isArray(obj.points) && obj.points.length >= 3) {
            out.push(obj);
          }
        } catch {}
      }
    }
    return out;
  }

  function pointInPolygon(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const badgeEl = document.getElementById('hotspot-badge');
  let hoveredName = '';

  // Compute exact rendered video rectangle inside #stage.
  // Origo touch.vtt coordinates (0..100%) are normalized to the video frame itself (e.g. 704x748),
  // NOT the outer 380x640 stage!
  function syncHotspotRect() {
    const activeVid = (activeState === 'idle' || !vidReact.videoWidth) ? vidIdle : vidReact;
    const stageRect = stage.getBoundingClientRect();
    const vidRect = activeVid.getBoundingClientRect();
    const vw = activeVid.videoWidth || 704;
    const vh = activeVid.videoHeight || 748;
    if (!vidRect.width || !vidRect.height || !stageRect.width) return;
    // Account for object-fit: contain inside the <video> box
    const scale = Math.min(vidRect.width / vw, vidRect.height / vh);
    const rw = vw * scale;
    const rh = vh * scale;
    const left = (vidRect.left - stageRect.left) + (vidRect.width - rw) / 2;
    const top = (vidRect.top - stageRect.top) + (vidRect.height - rh) / 2;
    svg.style.left = left.toFixed(2) + 'px';
    svg.style.top = top.toFixed(2) + 'px';
    svg.style.width = rw.toFixed(2) + 'px';
    svg.style.height = rh.toFixed(2) + 'px';
    window.__lavPocMetrics = Object.assign(window.__lavPocMetrics || {}, {
      overlayRect: { left: Math.round(left), top: Math.round(top), width: Math.round(rw), height: Math.round(rh) },
    });
  }

  function renderHotspots() {
    syncHotspotRect();
    svg.innerHTML = '';
    if (!showDebug) return;
    for (const h of hotspots) {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', h.points.map(p => p.x + ',' + p.y).join(' '));
      const isHover = hoveredName && h.name === hoveredName;
      poly.setAttribute('fill', isHover ? 'rgba(56, 189, 248, 0.34)' : 'rgba(56, 189, 248, 0.14)');
      poly.setAttribute('stroke', isHover ? '#38BDF8' : 'rgba(125, 211, 252, 0.72)');
      poly.setAttribute('stroke-width', isHover ? '0.8' : '0.45');
      svg.appendChild(poly);
    }
  }

  svg.addEventListener('mousemove', (ev) => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    let found = '';
    for (let i = hotspots.length - 1; i >= 0; i--) {
      if (pointInPolygon(x, y, hotspots[i].points)) { found = hotspots[i].name; break; }
    }
    if (found !== hoveredName) {
      hoveredName = found;
      if (found) {
        badgeEl.textContent = '热区: ' + found + '（点击触发互动）';
        badgeEl.style.opacity = '1';
      } else {
        badgeEl.style.opacity = '0';
      }
      if (showDebug) renderHotspots();
    }
  });
  svg.addEventListener('mouseleave', () => {
    if (hoveredName) {
      hoveredName = '';
      badgeEl.style.opacity = '0';
      if (showDebug) renderHotspots();
    }
  });
  window.addEventListener('resize', syncHotspotRect);
  vidIdle.addEventListener('loadedmetadata', () => { syncHotspotRect(); renderHotspots(); });
  vidReact.addEventListener('loadedmetadata', () => { syncHotspotRect(); renderHotspots(); });

  async function triggerReaction(key) {
    if (key === 'idle' || !REACTIONS[key]) {
      vidReact.style.opacity = '0';
      vidIdle.style.opacity = '1';
      vidReact.pause();
      syncHotspotRect();
      activeState = 'idle';
      document.getElementById('st-state').textContent = 'idle (lumia_alpha_pingpon_60.webm)';
      return;
    }
    const r = REACTIONS[key];
    activeState = key;
    document.getElementById('st-state').textContent = r.label + ' (' + r.file + ')';
    log('触发互动热区 -> ' + r.label + ' (' + r.file + ')');
    vidReact.src = '/jphone/poc/lav/assets/' + r.file;
    vidReact.currentTime = 0;
    try {
      await vidReact.play();
      vidReact.style.opacity = '1';
      vidIdle.style.opacity = '0';
      syncHotspotRect();
    } catch (e) {
      log('播放失败: ' + e);
    }
  }

  vidReact.onended = () => {
    log('反应视频播完，平滑切回待机循环');
    triggerReaction('idle');
  };

  svg.addEventListener('click', (ev) => {
    const rect = svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    for (const h of hotspots) {
      if (pointInPolygon(x, y, h.points)) {
        const mapped = HOTSPOT_TO_REACT[h.name] || 'head';
        log('命中多边形热区: ' + h.name + ' (' + x.toFixed(1) + '%, ' + y.toFixed(1) + '%)');
        triggerReaction(mapped);
        return;
      }
    }
    log('点击空白区域 (' + x.toFixed(1) + '%, ' + y.toFixed(1) + '%)');
  });

  // Load touch.vtt
  try {
    const vtt = await (await fetch('/jphone/poc/lav/assets/touch.vtt')).text();
    hotspots = parseVtt(vtt);
    document.getElementById('st-hotspots').textContent = hotspots.length + ' 个部位 (' + hotspots.map(h => h.name).join(', ') + ')';
    renderHotspots();
    log('已加载 Origo touch.vtt，共 ' + hotspots.length + ' 个多边形热区');
  } catch (e) {
    document.getElementById('st-hotspots').textContent = '加载失败';
  }

  // Verify real alpha transparency once video renders a frame (draw 1 corner pixel onto offscreen canvas)
  function verifyAlpha() {
    if (vidIdle.videoWidth <= 0) return;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.drawImage(vidIdle, 0, 0, 64, 64);
    const cornerAlpha = ctx.getImageData(2, 2, 1, 1).data[3];
    const centerAlpha = ctx.getImageData(32, 36, 1, 1).data[3];
    const ok = cornerAlpha < 15 && centerAlpha > 180;
    const el = document.getElementById('st-alpha');
    el.textContent = ok
      ? '通过 (边缘 alpha=' + cornerAlpha + ', 人物主体 alpha=' + centerAlpha + ')'
      : '边缘=' + cornerAlpha + ', 主体=' + centerAlpha;
    if (ok) el.classList.add('good');
    window.__lavPocMetrics = Object.assign(window.__lavPocMetrics || {}, {
      alphaVerified: ok, cornerAlpha, centerAlpha,
      videoWidth: vidIdle.videoWidth, videoHeight: vidIdle.videoHeight,
      hotspotCount: hotspots.length,
    });
  }

  function trackFrames() {
    frameCount++;
    const now = performance.now();
    if (now - fpsStart >= 1000) {
      lastFps = Math.round((frameCount * 1000) / (now - fpsStart));
      frameCount = 0;
      fpsStart = now;
      const activeVid = activeState === 'idle' ? vidIdle : vidReact;
      const q = activeVid.getVideoPlaybackQuality ? activeVid.getVideoPlaybackQuality() : { droppedVideoFrames: 0, totalVideoFrames: 0 };
      const ratio = q.totalVideoFrames ? ((q.droppedVideoFrames / q.totalVideoFrames) * 100).toFixed(1) : '0.0';
      document.getElementById('st-fps').textContent = lastFps + ' fps (源视频 24fps)';
      document.getElementById('st-drop').textContent = q.droppedVideoFrames + ' / ' + q.totalVideoFrames + ' (' + ratio + '%)';
      window.__lavPocMetrics = Object.assign(window.__lavPocMetrics || {}, {
        fps: lastFps,
        droppedFrames: q.droppedVideoFrames,
        totalFrames: q.totalVideoFrames,
        activeState,
      });
      if (!window.__lavPocMetrics.alphaVerified) verifyAlpha();
    }
    if (vidIdle.requestVideoFrameCallback) {
      vidIdle.requestVideoFrameCallback(trackFrames);
    } else {
      requestAnimationFrame(trackFrames);
    }
  }
  vidIdle.addEventListener('loadeddata', () => {
    verifyAlpha();
    log('待机透明视频已就绪：' + vidIdle.videoWidth + 'x' + vidIdle.videoHeight);
  });
  if (vidIdle.requestVideoFrameCallback) vidIdle.requestVideoFrameCallback(trackFrames);
  else requestAnimationFrame(trackFrames);

  // Toolbar controls
  for (const id of ['bg-checker', 'bg-ocean', 'bg-desk']) {
    document.getElementById(id).onclick = () => {
      stage.className = 'stage ' + id;
      ['bg-checker', 'bg-ocean', 'bg-desk'].forEach(k => document.getElementById(k).classList.toggle('on', k === id));
    };
  }
  document.getElementById('toggle-debug').onclick = (ev) => {
    showDebug = !showDebug;
    ev.target.classList.toggle('on', showDebug);
    renderHotspots();
  };
  document.querySelectorAll('[data-react]').forEach(btn => {
    btn.onclick = () => triggerReaction(btn.dataset.react);
  });

  window.__lavPocTrigger = triggerReaction;
})();
</script>
</body>
</html>`
