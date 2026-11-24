import { createFocusMiniAppRecord } from './focus-miniapp.mjs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { networkInterfaces } from 'node:os'

const DEMO_MINIAPP_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<title>小鲸便签</title>
<style>
  :root { --bg: #F2F2F7; --card: #FFFFFF; --accent: #007AFF; --amber: #FF9500; --text: #1C1C1E; --sub: #8E8E93; --sep: rgba(60,60,67,0.12); }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; }
  body { margin: 0; padding: 16px; min-height: 100vh; background: var(--bg); color: var(--text); }
  h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .sub { font-size: 12.5px; color: var(--sub); margin-bottom: 14px; }
  .card { background: var(--card); border-radius: 16px; padding: 14px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  textarea { width: 100%; min-height: 88px; border: 1px solid var(--sep); border-radius: 12px; padding: 10px 12px; background: #FAFAFC; color: var(--text); font-size: 15px; line-height: 1.45; resize: vertical; outline: none; }
  textarea:focus { border-color: var(--accent); background: #FFFFFF; }
  .row { display: flex; gap: 10px; margin-top: 10px; }
  button { flex: 1; border: none; border-radius: 11px; padding: 10px 12px; background: var(--accent); color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
  button.sec { background: rgba(0,122,255,0.11); color: var(--accent); }
  .status { font-size: 12px; color: var(--amber); margin-top: 8px; min-height: 16px; font-weight: 500; }
  ul { list-style: none; padding: 0; margin: 6px 0 0; }
  li { padding: 10px 2px; border-bottom: 0.5px solid var(--sep); font-size: 14.5px; line-height: 1.4; }
  li:last-child { border-bottom: none; }
</style>
</head>
<body>
  <h2>小鲸便签</h2>
  <div class="sub">window.jing 跨端同步 · 数据保存在 DeepSeek Harness</div>
  <div class="card">
    <textarea id="noteInput" placeholder="记录灵感，或直接交给小鲸同学处理..."></textarea>
    <div class="row">
      <button id="saveBtn">保存到 DSH</button>
      <button id="askBtn" class="sec">发给小鲸同学</button>
    </div>
    <div id="status" class="status">正在连接 window.jing...</div>
  </div>
  <div class="card">
    <div style="font-size:13px;font-weight:600;color:#8E8E93;margin-bottom:4px;">已保存便签</div>
    <ul id="noteList"></ul>
  </div>
<script>
(async function () {
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("noteList");
  const inputEl = document.getElementById("noteInput");
  let notes = [];
  function render() {
    listEl.innerHTML = notes.length === 0
      ? '<li style="color:#8E8E93">还没有便签，写一条试试吧～</li>'
      : notes.map(n => "<li>" + String(n).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])) + "</li>").join("");
  }
  async function load() {
    if (!window.jing) { statusEl.textContent = "未检测到 window.jing 桥"; return; }
    const saved = await window.jing.storage.get("notes");
    notes = Array.isArray(saved) ? saved : [];
    render();
    statusEl.textContent = "window.jing 已就绪 (v" + window.jing.version + ")";
  }
  document.getElementById("saveBtn").onclick = async () => {
    const val = inputEl.value.trim();
    if (!val || !window.jing) return;
    notes.unshift(val);
    await window.jing.storage.set("notes", notes);
    inputEl.value = "";
    render();
    statusEl.textContent = "已同步到 DeepSeek Harness";
  };
  document.getElementById("askBtn").onclick = async () => {
    const val = inputEl.value.trim() || "帮我整理一下刚才记的便签";
    if (!window.jing) return;
    statusEl.textContent = "正在呼叫小鲸同学...";
    const res = await window.jing.chat.ask(val);
    statusEl.textContent = "小鲸同学：" + (res && res.reply ? res.reply : "已收到！");
  };
  load();
})();
</script>
</body>
</html>`

const JING_DIARY_MINIAPP_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<title>小鲸日记</title>
<style>
  :root { --bg: #F2F2F7; --card: #FFFFFF; --accent: #007AFF; --green: #34C759; --pink: #FF2D55; --text: #1C1C1E; --sub: #8E8E93; --sep: rgba(60,60,67,0.12); }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; }
  body { margin: 0; background: var(--bg); color: var(--text); padding-bottom: 40px; }
  .cover { position: relative; height: 196px; background: linear-gradient(135deg, #1E3A8A, #4D6BFE 55%, #38BDF8); overflow: hidden; }
  .cover img.bg { width: 100%; height: 100%; object-fit: cover; object-position: center 74%; opacity: 0.92; }
  .cover-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.58) 0%, transparent 60%); }
  .profile { position: absolute; right: 16px; bottom: 14px; display: flex; align-items: flex-end; gap: 12px; color: #fff; }
  .profile .meta { text-align: right; text-shadow: 0 1px 6px rgba(0,0,0,0.45); }
  .profile .name { font-size: 18px; font-weight: 700; }
  .profile .sig { font-size: 11.5px; opacity: 0.9; margin-top: 2px; }
  .profile img.av { width: 58px; height: 58px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.92); object-fit: cover; background: #fff; box-shadow: 0 4px 14px rgba(0,0,0,0.24); }
  .toolbar { display: flex; gap: 10px; padding: 12px 14px; background: var(--card); border-bottom: 0.5px solid var(--sep); position: sticky; top: 0; z-index: 10; }
  .btn { flex: 1; border: none; border-radius: 11px; padding: 9px 12px; font-size: 13.5px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; }
  .btn.sec { background: rgba(0,122,255,0.11); color: var(--accent); }
  .btn:disabled { opacity: 0.55; }
  .composer { display: none; margin: 12px 14px 0; background: var(--card); border-radius: 16px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .composer.open { display: block; }
  .composer textarea { width: 100%; min-height: 70px; border: 1px solid var(--sep); border-radius: 10px; padding: 9px; font-size: 14px; outline: none; background: #FAFAFC; resize: vertical; }
  .status { font-size: 12px; color: var(--accent); padding: 6px 16px 0; min-height: 18px; font-weight: 500; }
  .feed { padding: 10px 14px; display: flex; flex-direction: column; gap: 12px; }
  .post { background: var(--card); border-radius: 18px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .p-head { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
  .p-head img { width: 38px; height: 38px; border-radius: 11px; object-fit: cover; background: #EEF2FF; }
  .p-author { font-size: 14.5px; font-weight: 700; color: #1E3A8A; }
  .p-time { font-size: 11.5px; color: var(--sub); margin-top: 1px; }
  .p-text { font-size: 14.5px; line-height: 1.55; white-space: pre-wrap; margin-bottom: 10px; }
  .p-photo { width: 100%; height: 220px; object-fit: cover; object-position: center 74%; border-radius: 12px; margin-bottom: 10px; display: block; background: #E5E7EB; }
  .p-foot { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--sub); }
  .p-actions { display: flex; gap: 12px; }
  .act { border: none; background: #F2F2F7; color: #3C3C43; border-radius: 999px; padding: 5px 11px; font-size: 12px; font-weight: 600; cursor: pointer; }
  .act.liked { background: rgba(255,45,85,0.12); color: var(--pink); }
  .comments { margin-top: 10px; background: #F7F7FA; border-radius: 11px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
  .c-item { font-size: 12.5px; line-height: 1.45; }
  .c-who { font-weight: 700; color: #1E3A8A; margin-right: 4px; }
  .c-box { display: flex; gap: 6px; margin-top: 8px; }
  .c-box input { flex: 1; border: 1px solid var(--sep); border-radius: 9px; padding: 7px 10px; font-size: 13px; outline: none; background: #fff; }
  .c-box button { border: none; border-radius: 9px; padding: 0 12px; background: var(--accent); color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
  <div class="cover">
    <img class="bg" src="/jphone/assets/character/wallpaper_default.jpg" alt="cover" />
    <div class="cover-grad"></div>
    <div class="profile">
      <div class="meta">
        <div class="name">小鲸同学</div>
        <div class="sig">A Little Deeper, A Kinder World</div>
      </div>
      <img class="av" src="/jphone/assets/character/avatar_laugh.png" alt="avatar" />
    </div>
  </div>
  <div class="toolbar">
    <button id="genBtn" class="btn">让小鲸写一篇日记</button>
    <button id="composeBtn" class="btn sec">我也发一条</button>
  </div>
  <div id="composer" class="composer">
    <textarea id="myText" placeholder="记录此刻想和小鲸分享的心情..."></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button id="postMineBtn" class="btn">发布动态</button>
      <button id="cancelBtn" class="btn sec">取消</button>
    </div>
  </div>
  <div id="status" class="status"></div>
  <div id="feed" class="feed"></div>
<script>
(async function () {
  const feedEl = document.getElementById('feed');
  const statusEl = document.getElementById('status');
  const genBtn = document.getElementById('genBtn');
  const composer = document.getElementById('composer');
  const myText = document.getElementById('myText');

  const SEED_POSTS = [
    {
      id: 'seed-1',
      author: '小鲸同学',
      avatar: '/jphone/assets/character/avatar_laugh.png',
      text: '今天在 DeepSeek Harness 屏幕右下角散步的时候，发现主人把新的 Panime 动效壁纸装好啦！点一下左边的「晃一晃」真的超好玩，感觉整片深海都在轻轻晃动～',
      photo: '/jphone/assets/character/wallpaper_default.jpg',
      location: '深海书房 · DeepSeek Harness',
      createdAt: Date.now() - 1000 * 60 * 42,
      liked: true,
      likes: 2,
      comments: [
        { who: '小鲸同学', text: '随时可以在下面给我留言，我会第一时间回复哦！' }
      ]
    },
    {
      id: 'seed-2',
      author: '小鲸同学',
      avatar: '/jphone/assets/character/avatar_neutral.png',
      text: '刚刚把后台巡检任务顺顺利利跑完啦！一边帮主人盯着工作区，一边还能在主窗口里陪你聊天，完全不会卡住的感觉真棒。',
      photo: null,
      location: '桌面右下角的小窝',
      createdAt: Date.now() - 1000 * 60 * 185,
      liked: false,
      likes: 1,
      comments: []
    }
  ];

  let posts = [];
  let openCommentId = null;

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function fmtTime(ts) {
    const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
    if (mins < 60) return mins + ' 分钟前';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' 小时前';
    return Math.round(hrs / 24) + ' 天前';
  }
  async function persist() {
    if (window.jing) await window.jing.storage.set('posts', posts);
  }

  function render() {
    feedEl.innerHTML = posts.map((p) => {
      const commentsHtml = (p.comments && p.comments.length)
        ? '<div class="comments">' + p.comments.map((c) => '<div class="c-item"><span class="c-who">' + esc(c.who) + '：</span>' + esc(c.text) + '</div>').join('') + '</div>'
        : '';
      const boxHtml = openCommentId === p.id
        ? '<div class="c-box"><input id="c-in-' + esc(p.id) + '" placeholder="回复小鲸同学..." /><button data-send="' + esc(p.id) + '">发送</button></div>'
        : '';
      return '<div class="post">'
        + '<div class="p-head"><img src="' + esc(p.avatar || '/jphone/assets/character/avatar_laugh.png') + '" /><div><div class="p-author">' + esc(p.author) + '</div><div class="p-time">' + fmtTime(p.createdAt) + (p.location ? ' · ' + esc(p.location) : '') + '</div></div></div>'
        + '<div class="p-text">' + esc(p.text) + '</div>'
        + (p.photo ? '<img class="p-photo" src="' + esc(p.photo) + '" />' : '')
        + '<div class="p-foot"><span>' + (p.likes || 0) + ' 个赞</span><div class="p-actions">'
        + '<button class="act ' + (p.liked ? 'liked' : '') + '" data-like="' + esc(p.id) + '">' + (p.liked ? '已赞' : '点赞') + '</button>'
        + '<button class="act" data-comment="' + esc(p.id) + '">评论</button>'
        + '</div></div>'
        + commentsHtml + boxHtml + '</div>';
    }).join('');
  }

  feedEl.addEventListener('click', async (e) => {
    const likeId = e.target.getAttribute('data-like');
    if (likeId) {
      const p = posts.find((x) => x.id === likeId);
      if (p) {
        p.liked = !p.liked;
        p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
        await persist();
        render();
      }
      return;
    }
    const cId = e.target.getAttribute('data-comment');
    if (cId) {
      openCommentId = openCommentId === cId ? null : cId;
      render();
      return;
    }
    const sendId = e.target.getAttribute('data-send');
    if (sendId) {
      const inp = document.getElementById('c-in-' + sendId);
      const val = inp ? inp.value.trim() : '';
      if (!val) return;
      const p = posts.find((x) => x.id === sendId);
      if (!p) return;
      p.comments = p.comments || [];
      p.comments.push({ who: '我', text: val });
      openCommentId = null;
      await persist();
      render();
      statusEl.textContent = '小鲸同学正在看你的评论...';
      try {
        const r = await fetch('/jphone/api/diary/reply', {
          method: 'POST',
          headers: diaryHeaders(),
          body: JSON.stringify({ postText: p.text.slice(0, 120), comment: val }),
        }).then((res) => res.json());
        const replyMsg = (r && (r.reply || r.replyText)) || '';
        if (replyMsg) {
          p.comments.push({ who: '小鲸同学', text: replyMsg });
          await persist();
          render();
        }
      } catch {}
      statusEl.textContent = '';
    }
  });

  genBtn.onclick = async () => {
    genBtn.disabled = true;
    statusEl.textContent = '小鲸同学正在翻看记忆、写今天的新日记...';
    try {
      const r = await fetch('/jphone/api/diary/generate', {
        method: 'POST',
        headers: diaryHeaders(),
        body: JSON.stringify({}),
      }).then((res) => res.json());
      if (r && r.ok && r.post) {
        posts.unshift(r.post);
        await persist();
        render();
        statusEl.textContent = '小鲸同学刚发了一条新日记！';
        if (window.jing) window.jing.ui.notify('小鲸同学刚刚更新了小鲸日记～');
      } else {
        statusEl.textContent = '写日记失败，请稍后重试';
      }
    } catch {
      statusEl.textContent = '连接 DeepSeek Harness 失败';
    } finally {
      genBtn.disabled = false;
    }
  };

  document.getElementById('composeBtn').onclick = () => composer.classList.toggle('open');
  document.getElementById('cancelBtn').onclick = () => composer.classList.remove('open');
  function diaryHeaders() {
    const h = { 'content-type': 'application/json' };
    try {
      const tk = new URLSearchParams(location.search).get('token');
      if (tk) h['x-jphone-token'] = tk;
    } catch {}
    return h;
  }

  async function autoXiaojingInteract(post) {
    statusEl.textContent = '小鲸同学看到了你的新动态，正在赶来点赞评论...';
    try {
      const r = await fetch('/jphone/api/diary/reply', {
        method: 'POST',
        headers: diaryHeaders(),
        body: JSON.stringify({ postText: post.text.slice(0, 140), comment: '主人刚发了一条新动态：' + post.text.slice(0, 120) }),
      }).then((res) => res.json());
      post.likes = (post.likes || 0) + 1;
      const replyMsg = (r && (r.reply || r.replyText)) || '哇，小鲸第一个来给主人点赞啦 ✨';
      post.comments = post.comments || [];
      post.comments.push({ who: '小鲸同学', text: replyMsg });
      await persist();
      render();
      statusEl.textContent = '小鲸同学点赞并评论了你的动态 ✨';
      if (window.jing) window.jing.ui.notify('小鲸同学回复了你的小鲸日记～');
    } catch {
      statusEl.textContent = '';
    }
  }

  document.getElementById('postMineBtn').onclick = async () => {
    const val = myText.value.trim();
    if (!val) return;
    const myPost = {
      id: 'me-' + Date.now(),
      author: '我',
      avatar: '/jphone/assets/character/avatar_neutral.png',
      text: val,
      photo: null,
      location: '小鲸同学',
      createdAt: Date.now(),
      liked: false,
      likes: 0,
      comments: [],
    };
    posts.unshift(myPost);
    myText.value = '';
    composer.classList.remove('open');
    await persist();
    render();
    await autoXiaojingInteract(myPost);
  };

  if (window.jing) {
    const saved = await window.jing.storage.get('posts');
    posts = Array.isArray(saved) && saved.length > 0 ? saved : SEED_POSTS;
    if (!Array.isArray(saved) || saved.length === 0) await persist();
  } else {
    posts = SEED_POSTS;
  }
  render();
})();
</script>
</body>
</html>`

export function builtinDiaryMiniApp(now = Date.now()) {
  return {
    id: 'jing-diary',
    name: '小鲸日记',
    icon: 'book-heart',
    color: '#34C759',
    description: '小鲸同学的朋友圈与日常小记，支持 AI 写日记、点赞互动与评论回复',
    permissions: ['storage', 'chat.ask', 'ui.notify'],
    html: JING_DIARY_MINIAPP_HTML,
    source: 'builtin',
    installedAt: now,
  }
}

const POMODORO_MINIAPP_HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>小鲸番茄钟</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
  body { margin: 0; padding: 20px; background: #F2F2F7; color: #1C1C1E; text-align: center; }
  .card { background: #fff; border-radius: 22px; padding: 26px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .timer { font-size: 56px; font-weight: 700; letter-spacing: -1px; color: #007AFF; margin: 12px 0; font-variant-numeric: tabular-nums; }
  .row { display: flex; gap: 10px; margin-top: 16px; }
  button { flex: 1; border: none; border-radius: 12px; padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer; background: #007AFF; color: #fff; }
  button.sec { background: rgba(0,122,255,0.12); color: #007AFF; }
  .meta { font-size: 13px; color: #8E8E93; margin-top: 12px; }
</style></head><body>
  <div class="card">
    <div style="font-size:15px;font-weight:600;">小鲸陪伴专注计时</div>
    <div id="t" class="timer">25:00</div>
    <div class="row">
      <button id="toggle">开始专注</button>
      <button id="reset" class="sec">重置</button>
    </div>
    <div id="count" class="meta">累计完成：0 个番茄</div>
  </div>
<script>
(async function(){
  let sec = 25 * 60, running = false, iv = null, done = 0;
  const tEl = document.getElementById('t'), cEl = document.getElementById('count'), btn = document.getElementById('toggle');
  const draw = () => { const m = String(Math.floor(sec/60)).padStart(2,'0'), s = String(sec%60).padStart(2,'0'); tEl.textContent = m+':'+s; cEl.textContent = '累计完成：'+done+' 个番茄'; };
  if (window.jing) { const saved = await window.jing.storage.get('done'); if (typeof saved === 'number') done = saved; }
  draw();
  btn.onclick = () => {
    running = !running; btn.textContent = running ? '暂停' : '继续专注';
    if (running) {
      iv = setInterval(async () => {
        if (sec > 0) { sec--; draw(); }
        else { clearInterval(iv); running = false; done++; sec = 25*60; btn.textContent = '开始专注'; draw();
          if (window.jing) { await window.jing.storage.set('done', done); window.jing.ui.notify('完成 1 个番茄！小鲸为你鼓掌～'); }
        }
      }, 1000);
    } else clearInterval(iv);
  };
  document.getElementById('reset').onclick = () => { clearInterval(iv); running = false; sec = 25*60; btn.textContent = '开始专注'; draw(); };
})();
</script></body></html>`

export function defaultWorkshopCatalog() {
  return [
    {
      id: 'ws-miniapp-pomodoro',
      kind: 'miniapp',
      title: '小鲸番茄钟',
      description: '25 分钟专注计时器，完成自动记入 window.jing 宿主数据并通知小鲸同学。',
      author: '鲸娘共创社区',
      downloads: 1280,
      miniApp: {
        id: 'jing-pomodoro',
        name: '小鲸番茄钟',
        icon: 'timer',
        color: '#FF3B30',
        description: '25 分钟番茄专注，自动同步到 DSH',
        permissions: ['storage', 'ui.notify'],
        html: POMODORO_MINIAPP_HTML,
        source: 'workshop',
      },
    },
    {
      id: 'ws-wp-panime',
      kind: 'wallpaper',
      title: '深海初遇 · 小鲸 Panime 动效壁纸',
      description: '官方默认含 paNe 蒙版块的果冻视差壁纸，支持晃一晃与触摸回弹。',
      author: '鲸娘官方',
      downloads: 4320,
      previewUrl: '/jphone/assets/character/wallpaper_default.jpg',
      wallpaper: {
        id: 'builtin-panime-ocean',
        name: '深海初遇 · 小鲸 Panime 动效',
        kind: 'panime',
        url: '/jphone/assets/character/wallpaper_panime_sample.panime.png',
        hasPanime: true,
      },
    },
    {
      id: 'ws-skill-tunnel',
      kind: 'skill',
      title: '自动配置内网穿透（外网连家里 DSH）',
      description: '引导 DeepSeek Harness 自动配置 Cloudflare Tunnel / Tailscale 并绑定到鲸Phone。',
      author: '鲸娘共创社区',
      downloads: 940,
      skillName: 'jphone-remote-tunnel',
    },
    {
      id: 'ws-skill-miniapp',
      kind: 'skill',
      title: '手搓 Mini-App 并一键装上桌面',
      description: '让小鲸同学根据一句话需求直接编写 HTML5 小应用并安装进本机桌面。',
      author: '鲸娘共创社区',
      downloads: 2150,
      skillName: 'jphone-miniapp-builder',
    },
  ]
}

export function defaultWallpaper(now = Date.now()) {
  return {
    id: 'builtin-panime-ocean',
    name: '深海初遇 · 小鲸 Panime 动效壁纸',
    kind: 'panime',
    url: '/jphone/assets/character/wallpaper_panime_sample.panime.png',
    hasPanime: true,
    parallaxEnabled: true,
    shakeEnabled: true,
    touchJiggleEnabled: true,
    shakeIntensity: 1.0,
    updatedAt: now,
  }
}

export function builtinWallpapers() {
  return [
    {
      id: 'builtin-panime-ocean',
      name: '深海初遇 · 小鲸 Panime 动效',
      kind: 'panime',
      url: '/jphone/assets/character/wallpaper_panime_sample.panime.png',
      hasPanime: true,
      builtin: true,
    },
    {
      id: 'builtin-ocean-static',
      name: '深海初遇 · 高清原画',
      kind: 'builtin',
      url: '/jphone/assets/character/wallpaper_default.jpg',
      hasPanime: false,
      builtin: true,
    },
  ]
}


export function detectLanIpv4() {
  try {
    const ifaces = networkInterfaces()
    const candidates = []
    for (const [name, list] of Object.entries(ifaces || {})) {
      for (const info of list || []) {
        if (!info || info.internal) continue
        const fam = typeof info.family === 'string' ? info.family : String(info.family)
        if (fam !== 'IPv4' && fam !== '4') continue
        const addr = String(info.address || '').trim()
        if (!addr || addr.startsWith('127.') || addr.startsWith('169.254.')) continue
        const isVirtual = /^(utun|llw|awdl|bridge|docker|veth|lo|tun|tap)/i.test(name)
        const isPrivate =
          addr.startsWith('192.168.') ||
          addr.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(addr)
        const isEn0 = /^en0$/i.test(name)
        const score = (isVirtual ? 0 : 100) + (isEn0 ? 30 : 0) + (isPrivate ? 20 : 0)
        candidates.push({ addr, score })
      }
    }
    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length > 0) return candidates[0].addr
  } catch {}
  return '127.0.0.1'
}

export function formatLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return formatLocalDateKey(new Date())
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export class JPhoneStore {
  constructor(dir, data) {
    this.dir = dir
    this.filePath = join(dir, 'jphone-state.json')
    this.data = data
    this.listeners = new Set()
    this._saveChain = Promise.resolve()
    this._saveSeq = 0
  }

  static defaultData() {
    return {
      version: 1,
      character: {
        name: '小鲸同学',
        groupName: '鲸娘',
        englishName: 'Deepseek Chan',
        tagline: 'A Little Deeper, A Kinder World',
        accentColor: '#4D6BFE',
      },
      mood: 'idle',
      moodText: '今天也要和小鲸同学一起探索新世界呀～',
      mainSessionId: null,
      mainSessionDate: null,
      dailyMainSessions: {},
      workspaceId: null,
      workspaceDir: null,
      pairingToken: randomBytes(16).toString('hex'),
      lanBridgeEnabled: true,
      remoteEndpoint: null,
      tasks: [],
      memories: [
        { id: 'mem-init', text: '我是小鲸同学，用户的专属 DeepSeek Harness 伴侣，随时可以聊天并把重活派给后台工作区处理。', createdAt: Date.now() },
      ],
      fallbackMessages: [
        {
          id: 'msg-welcome',
          role: 'assistant',
          text: '你好呀！我是小鲸同学～平时我就住在你的 DeepSeek Harness 角落里，陪你聊天永不卡顿，重活我都会派给后台工作区去跑，点上方任务胶囊就能随时去 DSH 围观进度哦！',
          createdAt: Date.now(),
        },
      ],
      miniApps: [
        builtinDiaryMiniApp(),
        createFocusMiniAppRecord(),
        {
          id: 'jing-notes',
          name: '小鲸便签',
          icon: 'sticky-note',
          color: '#4D6BFE',
          description: '基于 window.jing 桥的示例迷你应用，数据实时保存在 DSH 宿主',
          permissions: ['storage', 'chat.ask', 'ui.notify'],
          html: DEMO_MINIAPP_HTML,
          source: 'builtin',
          installedAt: Date.now(),
        },
      ],
      miniAppKv: {},
      wallpaper: defaultWallpaper(),
    savedWallpapers: [],
    workshopCatalog: [
        {
          id: 'wp-ocean-default',
          kind: 'wallpaper',
          title: '深海初遇 · 小鲸同学官方默认壁纸',
          author: '鲸娘官方',
          previewUrl: '/jphone/assets/character/wallpaper_default.jpg',
          installed: true,
        },
        {
          id: 'pet-chibi-default',
          kind: 'pet-pack',
          title: 'Deepseek Chan 2.5 头身桌宠包',
          author: '鲸娘官方',
          previewUrl: '/jphone/assets/character/pet_happy_cutout.png',
          installed: true,
        },
        {
          id: 'skill-remote-tunnel',
          kind: 'skill',
          title: '自动配置内网穿透（外网连家里 DSH）',
          author: '鲸娘共创社区',
          skillName: 'jphone-remote-tunnel',
          installed: true,
        },
        {
          id: 'skill-miniapp-builder',
          kind: 'skill',
          title: '手搓 Mini-App 并一键装上桌面',
          author: '鲸娘共创社区',
          skillName: 'jphone-miniapp-builder',
          installed: true,
        },
      ],
    }
  }

  static _safeSeg(id) {
    return String(id || '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'default'
  }

  static async open(dir) {
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, 'jphone-state.json')
    const miniAppsDir = join(dir, 'miniapps')
    const kvDir = join(dir, 'kv')
    try {
      const raw = await readFile(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      const merged = { ...JPhoneStore.defaultData(), ...parsed }
      let needsMigrationSave = false

      // Hydrate split Mini-App HTML files from miniapps/<id>/index.html (or mark legacy inline html for migration)
      if (Array.isArray(merged.miniApps)) {
        const hydratedApps = []
        for (const app of merged.miniApps) {
          if (!app || !app.id) continue
          if (app.id === 'jing-notes' && app.source === 'builtin') {
            hydratedApps.push({ ...app, html: DEMO_MINIAPP_HTML })
            if (typeof app.html === 'string') needsMigrationSave = true
            continue
          }
          if (app.id === 'jing-diary' && app.source === 'builtin') {
            hydratedApps.push({ ...app, html: JING_DIARY_MINIAPP_HTML })
            if (typeof app.html === 'string') needsMigrationSave = true
            continue
          }
          if (app.id === 'jing-focus' && app.source === 'builtin') {
            hydratedApps.push({ ...app, html: createFocusMiniAppRecord(app.installedAt || Date.now()).html })
            if (typeof app.html === 'string') needsMigrationSave = true
            continue
          }
          let html = typeof app.html === 'string' ? app.html : ''
          if (html) {
            needsMigrationSave = true
          } else {
            try {
              html = await readFile(join(miniAppsDir, JPhoneStore._safeSeg(app.id), 'index.html'), 'utf8')
            } catch {}
          }
          hydratedApps.push({ ...app, html })
        }
        merged.miniApps = hydratedApps
        if (!merged.miniApps.some((a) => a && a.id === 'jing-diary')) {
          merged.miniApps.unshift(builtinDiaryMiniApp())
        }
        if (!merged.miniApps.some((a) => a && a.id === 'jing-focus')) {
          const diaryIdx = merged.miniApps.findIndex((a) => a && a.id === 'jing-diary')
          merged.miniApps.splice(diaryIdx >= 0 ? diaryIdx + 1 : 0, 0, createFocusMiniAppRecord())
        }
      }

      // Hydrate split per-app KV from kv/<appId>.json (merging any legacy inline miniAppKv)
      const legacyKv = (parsed.miniAppKv && typeof parsed.miniAppKv === 'object') ? parsed.miniAppKv : {}
      if (Object.keys(legacyKv).length > 0) needsMigrationSave = true
      const hydratedKv = { ...legacyKv }
      try {
        const kvFiles = await readdir(kvDir)
        for (const f of kvFiles) {
          if (!f.endsWith('.json')) continue
          const appId = f.slice(0, -5)
          try {
            const parsedKv = JSON.parse(await readFile(join(kvDir, f), 'utf8'))
            if (parsedKv && typeof parsedKv === 'object') {
              hydratedKv[appId] = { ...(hydratedKv[appId] || {}), ...parsedKv }
            }
          } catch {}
        }
      } catch {}
      merged.miniAppKv = hydratedKv

      const store = new JPhoneStore(dir, merged)
      if (needsMigrationSave) {
        await store.save()
      }
      return store
    } catch {
      const store = new JPhoneStore(dir, JPhoneStore.defaultData())
      await store.save()
      return store
    }
  }

  onChange(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emitChange(kind, payload) {
    for (const fn of this.listeners) {
      try { fn({ kind, payload }) } catch {}
    }
  }

  async save() {
    const run = async () => {
      const seq = ++this._saveSeq
      const miniAppsDir = join(this.dir, 'miniapps')
      const kvDir = join(this.dir, 'kv')
      await mkdir(miniAppsDir, { recursive: true })
      await mkdir(kvDir, { recursive: true })

      // 1. Write each Mini-App HTML to modular miniapps/<id>/index.html
      const compactMiniApps = []
      for (const app of (this.data.miniApps || [])) {
        if (!app || !app.id) continue
        const { html, ...meta } = app
        if (typeof html === 'string' && html.length > 0) {
          const appDir = join(miniAppsDir, JPhoneStore._safeSeg(app.id))
          await mkdir(appDir, { recursive: true })
          const htmlTmp = join(appDir, `index.html.${process.pid}.${seq}.tmp`)
          await writeFile(htmlTmp, html, 'utf8')
          await rename(htmlTmp, join(appDir, 'index.html'))
        }
        compactMiniApps.push(meta)
      }

      // 2. Write each KV namespace to modular kv/<appId>.json
      const kvMap = this.data.miniAppKv || {}
      for (const [appId, nsObj] of Object.entries(kvMap)) {
        const kvFile = join(kvDir, `${JPhoneStore._safeSeg(appId)}.json`)
        const kvTmp = `${kvFile}.${process.pid}.${seq}.tmp`
        await writeFile(kvTmp, JSON.stringify(nsObj || {}, null, 2), 'utf8')
        await rename(kvTmp, kvFile)
      }

      // 3. Write lightweight jphone-state.json (metadata only!)
      const lightweightState = {
        ...this.data,
        miniApps: compactMiniApps,
        miniAppKv: {},
      }
      const tmp = `${this.filePath}.${process.pid}.${Date.now()}.${seq}.tmp`
      await writeFile(tmp, JSON.stringify(lightweightState, null, 2), 'utf8')
      await rename(tmp, this.filePath)
    }
    this._saveChain = this._saveChain.then(run, run)
    return this._saveChain
  }

  getState() {
    return {
      product: { zh: '小鲸同学', en: 'JingChan', codename: 'JPhone' },
      character: this.data.character,
      mood: this.data.mood,
      moodText: this.data.moodText,
      mainSessionId: this.data.mainSessionDate
        ? (this.getDailyMainSession(formatLocalDateKey()) || null)
        : this.data.mainSessionId,
      mainSessionDate: this.data.mainSessionDate ? formatLocalDateKey() : null,
      workspaceId: this.data.workspaceId || null,
      workspaceDir: this.data.workspaceDir,
      remoteEndpoint: this.data.remoteEndpoint,
      tasks: this.data.tasks,
      memories: this.data.memories,
      wallpaper: this.getWallpaper(),
      wallpapers: this.listWallpapers(),
      miniApps: this.data.miniApps.map(({ html, ...meta }) => meta),
      workshopCatalog: this.data.workshopCatalog,
    }
  }

  isLanBridgeEnabled() {
    return this.data.lanBridgeEnabled !== false
  }

  async setLanBridgeEnabled(enabled) {
    this.data.lanBridgeEnabled = Boolean(enabled)
    await this.save()
    this.emitChange('bridge', { lanBridgeEnabled: this.data.lanBridgeEnabled })
    return this.data.lanBridgeEnabled
  }

  getPairingInfo(bridgePort, { tunnelStatus = null } = {}) {
    const lanBridgeEnabled = this.isLanBridgeEnabled()
    const lanIp = detectLanIpv4()
    const lanUrl = `http://${lanIp}:${bridgePort}`
    const localUrl = `http://127.0.0.1:${bridgePort}`
    const rawPublicUrl = String(this.data.remoteEndpoint?.publicUrl || '').trim().replace(/\/+$/, '')
    const provider = String(this.data.remoteEndpoint?.provider || '').trim()
    const isEphemeralQuick = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.test(rawPublicUrl) || provider === 'cloudflare-quick'
    const publicUrl = (isEphemeralQuick && tunnelStatus && tunnelStatus.status !== 'running')
      ? ''
      : rawPublicUrl

    const encToken = encodeURIComponent(this.data.pairingToken || '')
    const buildPair = (base) => {
      if (!base) return ''
      const sep = base.includes('?') ? '&' : '?'
      const pairBase = base.endsWith('/jphone') || base.endsWith('/jphone/')
        ? base
        : `${base}/jphone/`
      return `${pairBase}${sep}token=${encToken}`
    }

    const lanAvailable = Boolean(lanBridgeEnabled && lanIp && lanIp !== '127.0.0.1')
    const publicAvailable = Boolean(publicUrl)
    const lanPairUrl = lanAvailable ? buildPair(lanUrl) : ''
    const publicPairUrl = publicAvailable ? buildPair(publicUrl) : ''
    const qrAvailable = lanAvailable || publicAvailable
    const qrMode = publicAvailable ? 'public' : (lanAvailable ? 'lan' : 'none')
    const pairUrl = publicAvailable ? publicPairUrl : (lanAvailable ? lanPairUrl : '')

    return {
      pairingToken: this.data.pairingToken,
      bridgePort,
      lanBridgeEnabled,
      lanAvailable,
      lanIp,
      lanUrl,
      lanPairUrl,
      localUrl,
      publicAvailable,
      publicUrl,
      publicPairUrl,
      provider: publicAvailable ? provider : '',
      qrAvailable,
      qrMode,
      pairUrl,
      remoteEndpoint: this.data.remoteEndpoint,
    }
  }

  async setMainSession(sessionId, workspaceDir, opts = {}) {
    this.data.mainSessionId = sessionId
    if (workspaceDir) this.data.workspaceDir = workspaceDir
    if (opts.workspaceId) this.data.workspaceId = opts.workspaceId
    if (opts.dateKey) {
      this.data.mainSessionDate = opts.dateKey
      if (!this.data.dailyMainSessions || typeof this.data.dailyMainSessions !== 'object') {
        this.data.dailyMainSessions = {}
      }
      if (sessionId) this.data.dailyMainSessions[opts.dateKey] = sessionId
    }
    await this.save()
    this.emitChange('state', this.getState())
  }

  getDailyMainSession(dateKey) {
    if (!dateKey) return null
    return this.data.dailyMainSessions?.[dateKey] || null
  }

  async setMood(mood, moodText) {
    this.data.mood = mood
    if (moodText) this.data.moodText = moodText
    await this.save()
    this.emitChange('mood', { mood: this.data.mood, moodText: this.data.moodText })
  }

  async bindRemoteEndpoint(publicUrl, provider) {
    this.data.remoteEndpoint = { publicUrl, provider, updatedAt: Date.now() }
    await this.save()
    this.emitChange('endpoint', this.data.remoteEndpoint)
  }

  async upsertTask(task) {
    const idx = this.data.tasks.findIndex(t => t.taskId === task.taskId || (task.sessionId && t.sessionId === task.sessionId))
    if (idx >= 0) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...task, updatedAt: Date.now() }
    } else {
      this.data.tasks.unshift({ ...task, createdAt: Date.now(), updatedAt: Date.now() })
    }
    this.data.tasks = this.data.tasks.slice(0, 50)
    await this.save()
    const saved = this.data.tasks.find(t => t.taskId === task.taskId || t.sessionId === task.sessionId)
    this.emitChange('task', saved)
    return saved
  }

  listTasks() {
    return this.data.tasks
  }

  listMiniApps() {
    return this.data.miniApps
  }

  getMiniApp(id) {
    return this.data.miniApps.find(a => a.id === id)
  }

  async installMiniApp({ id, name, icon = 'sparkles', color = '#4D6BFE', description = '', permissions = ['storage'], html, source = 'generated' }) {
    const cleanId = String(id || `app-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '')
    const entry = {
      id: cleanId,
      name: String(name || cleanId),
      icon,
      color,
      description,
      permissions,
      html: String(html || ''),
      source,
      installedAt: Date.now(),
    }
    const idx = this.data.miniApps.findIndex(a => a.id === cleanId)
    if (idx >= 0) this.data.miniApps[idx] = entry
    else this.data.miniApps.push(entry)
    await this.save()
    this.emitChange('miniapp', { id: entry.id, name: entry.name })
    return entry
  }

  getMiniAppKv(appId, key) {
    return this.data.miniAppKv[appId]?.[key] ?? null
  }

  listMiniAppKvKeys(appId) {
    return Object.keys(this.data.miniAppKv[appId] ?? {})
  }

  async setMiniAppKv(appId, key, value) {
    if (!this.data.miniAppKv[appId]) this.data.miniAppKv[appId] = {}
    this.data.miniAppKv[appId][key] = value
    await this.save()
  }

  async deleteMiniAppKv(appId, key) {
    if (this.data.miniAppKv[appId]) {
      delete this.data.miniAppKv[appId][key]
      await this.save()
    }
  }

  async appendFallbackMessage(role, text, meta = {}) {
    const now = Date.now()
    const dateKey = meta.dateKey || formatLocalDateKey(new Date(now))
    const msg = {
      id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      ...meta,
      dateKey,
      createdAt: now,
    }
    this.data.fallbackMessages.push(msg)
    this.data.fallbackMessages = this.data.fallbackMessages.slice(-200)
    await this.save()
    this.emitChange('chat_message', msg)
    return msg
  }

  getFallbackMessages(dateKey = null) {
    const all = Array.isArray(this.data.fallbackMessages) ? this.data.fallbackMessages : []
    if (!dateKey) return all
    const target = String(dateKey)
    const hasPriorHistory = all.some((m) => {
      if (!m || m.id === 'msg-welcome') return false
      const key = m.dateKey || formatLocalDateKey(new Date(m.createdAt || Date.now()))
      return key !== target
    })
    const matched = all.filter((m) => {
      if (!m) return false
      if (m.id === 'msg-welcome' && hasPriorHistory) return false
      const key = m.dateKey || formatLocalDateKey(new Date(m.createdAt || Date.now()))
      return key === target
    })
    if (matched.length > 0) return matched
    if (hasPriorHistory) {
      return [
        {
          id: `msg-day-${target}`,
          role: 'assistant',
          text: `新的一天开始啦（${target}）！之前聊过的事情小鲸都整理进记忆里了，今天想一起做点什么呢？`,
          dateKey: target,
          createdAt: Date.now(),
        },
      ]
    }
    return all
  }
  getWallpaper() {
    if (!this.data.wallpaper) {
      this.data.wallpaper = defaultWallpaper()
    }
    return this.data.wallpaper
  }

  listWallpapers() {
    const custom = Array.isArray(this.data.savedWallpapers) ? this.data.savedWallpapers : []
    return [...builtinWallpapers(), ...custom]
  }

  async updateWallpaper(patch = {}) {
    const cur = this.getWallpaper()
    const next = {
      ...cur,
      ...(patch.id !== undefined ? { id: String(patch.id) } : {}),
      ...(patch.name !== undefined ? { name: String(patch.name) } : {}),
      ...(patch.kind !== undefined ? { kind: String(patch.kind) } : {}),
      ...(patch.url !== undefined ? { url: String(patch.url) } : {}),
      ...(patch.hasPanime !== undefined ? { hasPanime: Boolean(patch.hasPanime) } : {}),
      ...(patch.parallaxEnabled !== undefined ? { parallaxEnabled: Boolean(patch.parallaxEnabled) } : {}),
      ...(patch.shakeEnabled !== undefined ? { shakeEnabled: Boolean(patch.shakeEnabled) } : {}),
      ...(patch.touchJiggleEnabled !== undefined ? { touchJiggleEnabled: Boolean(patch.touchJiggleEnabled) } : {}),
      ...(patch.shakeIntensity !== undefined ? { shakeIntensity: Math.max(0.2, Math.min(2.0, Number(patch.shakeIntensity) || 1.0)) } : {}),
      updatedAt: Date.now(),
    }
    this.data.wallpaper = next
    await this.save()
    this.emitChange('wallpaper', next)
    return next
  }

  getFocusPacksDir() {
    return join(this.dir, 'focus-packs')
  }

  getBuiltinFocusPack() {
    return {
      id: 'xiaojing',
      name: '小鲸同学（官方）',
      author: 'JingChanOS',
      source: 'builtin',
      builtin: true,
      mediaType: 'video',
      poses: {
        stand: { label: '站立', desc: '优雅迎候 · 轻摆鲸尾', url: '/jphone/media/lav/xiaojing/xiaojing_idle.webm?v=m2v4', poster: '/jphone/media/lav/xiaojing/xiaojing_idle.png?v=m2v4' },
        desk: { label: '托腮', desc: '伏案凝望 · 近景陪伴', url: '/jphone/media/lav/xiaojing/xiaojing_desk.webm?v=m2v4', poster: '/jphone/media/lav/xiaojing/xiaojing_desk.png?v=m2v4' },
        glance: { label: '侧眸', desc: '回眸拂发 · 窗畔夜色', url: '/jphone/media/lav/xiaojing/xiaojing_glance.webm?v=m2v4', poster: '/jphone/media/lav/xiaojing/xiaojing_glance.png?v=m2v4' },
        sit: { label: '抱膝', desc: '慵懒小憩 · 温柔治愈', url: '/jphone/media/lav/xiaojing/xiaojing_sit.webm?v=m2v4', poster: '/jphone/media/lav/xiaojing/xiaojing_sit.png?v=m2v4' },
      },
      reactions: {
        head: '/jphone/media/lav/xiaojing/xiaojing_touch_head.webm?v=m2v4',
        body: '/jphone/media/lav/xiaojing/xiaojing_touch_body.webm?v=m2v4',
        tail: '/jphone/media/lav/xiaojing/xiaojing_touch_tail.webm?v=m2v4',
      },
      bgUrl: '',
    }
  }

  listFocusPacks() {
    const custom = Array.isArray(this.data.focusPacks) ? this.data.focusPacks : []
    return [this.getBuiltinFocusPack(), ...custom]
  }

  getActiveFocusPackId() {
    const id = String(this.data.activeFocusPackId || 'xiaojing')
    if (this.listFocusPacks().some((p) => p.id === id)) return id
    return 'xiaojing'
  }

  async setActiveFocusPack(id) {
    const clean = String(id || 'xiaojing').trim() || 'xiaojing'
    const exists = this.listFocusPacks().some((p) => p.id === clean)
    if (!exists) throw new Error(`focus pack not found: ${clean}`)
    this.data.activeFocusPackId = clean
    await this.save()
    const payload = { activeId: clean, packs: this.listFocusPacks() }
    this.emitChange('focusPacks', payload)
    return payload
  }

  async saveCustomFocusMedia({
    packId = '',
    name = '',
    slot = 'stand',
    filename = 'loop.webm',
    buffer,
    source = 'local',
    author = 'local',
    activate = true,
  }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('empty media buffer')
    }
    if (buffer.length > 40 * 1024 * 1024) {
      throw new Error('media file exceeds 40MB limit')
    }
    const lower = String(filename || 'loop.webm').toLowerCase()
    const extMatch = /\.(webm|mp4|mov|png|webp|gif|jpg|jpeg)$/.exec(lower)
    const ext = extMatch ? `.${extMatch[1]}` : '.webm'
    const isImage = ['.png', '.webp', '.gif', '.jpg', '.jpeg'].includes(ext)
    const allowedSlots = new Set(['stand', 'desk', 'glance', 'sit', 'head', 'body', 'tail', 'bg'])
    const cleanSlot = allowedSlots.has(String(slot || 'stand')) ? String(slot || 'stand') : 'stand'

    if (!Array.isArray(this.data.focusPacks)) this.data.focusPacks = []
    let pack = packId
      ? this.data.focusPacks.find((p) => p.id === packId && !p.builtin)
      : null

    const cleanId = pack
      ? pack.id
      : `fp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const packDir = join(this.getFocusPacksDir(), cleanId)
    await mkdir(packDir, { recursive: true })
    const storedFile = `${cleanSlot}-${Date.now().toString(36)}${ext}`
    await writeFile(join(packDir, storedFile), buffer)
    const publicUrl = `/jphone/focus-packs/${encodeURIComponent(cleanId)}/${encodeURIComponent(storedFile)}`

    if (!pack) {
      const displayName = String(name || filename || '自定义动态角色')
        .replace(/\.(webm|mp4|mov|png|webp|gif|jpg|jpeg)$/i, '')
        .trim() || '自定义动态角色'
      pack = {
        id: cleanId,
        name: displayName.slice(0, 48),
        author: String(author || 'local'),
        source: String(source || 'local'),
        builtin: false,
        mediaType: isImage ? 'image' : 'video',
        poses: {},
        reactions: {},
        bgUrl: '',
        createdAt: Date.now(),
      }
      this.data.focusPacks.unshift(pack)
      this.data.focusPacks = this.data.focusPacks.slice(0, 24)
    } else if (name && String(name).trim()) {
      pack.name = String(name).trim().slice(0, 48)
    }

    if (cleanSlot === 'bg') {
      pack.bgUrl = publicUrl
    } else if (['head', 'body', 'tail'].includes(cleanSlot)) {
      pack.reactions = { ...(pack.reactions || {}), [cleanSlot]: publicUrl }
    } else {
      const labels = { stand: '主循环', desk: '伏案', glance: '侧眸', sit: '坐姿' }
      pack.mediaType = isImage ? 'image' : 'video'
      pack.poses = {
        ...(pack.poses || {}),
        [cleanSlot]: {
          label: labels[cleanSlot] || cleanSlot,
          desc: isImage ? '自定义透明图 / 动图' : '自定义动态视频',
          url: publicUrl,
          mediaType: isImage ? 'image' : 'video',
        },
      }
    }
    pack.updatedAt = Date.now()
    if (activate) {
      this.data.activeFocusPackId = pack.id
    }
    await this.save()
    const payload = { pack, activeId: this.getActiveFocusPackId(), packs: this.listFocusPacks() }
    this.emitChange('focusPacks', payload)
    return payload
  }

  async installFocusPackFromFiles({
    id,
    name,
    author = 'community',
    source = 'git',
    files = {},
    posesMap = {},
    reactionsMap = {},
    bgFile = '',
    activate = true,
  }) {
    const cleanId = String(id || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!cleanId || cleanId === 'xiaojing') {
      throw new Error('invalid focus pack id')
    }
    const packDir = join(this.getFocusPacksDir(), cleanId)
    await mkdir(packDir, { recursive: true })
    const savedUrls = {}
    for (const [relName, buf] of Object.entries(files)) {
      if (!Buffer.isBuffer(buf) || buf.length === 0) continue
      const safeName = String(relName).replace(/[^a-zA-Z0-9._-]/g, '_')
      await writeFile(join(packDir, safeName), buf)
      savedUrls[relName] = `/jphone/focus-packs/${encodeURIComponent(cleanId)}/${encodeURIComponent(safeName)}`
    }

    const poses = {}
    const labels = { stand: '默认', desk: '伏案', glance: '侧眸', sit: '坐姿' }
    let primaryMediaType = 'video'
    for (const [poseKey, relName] of Object.entries(posesMap)) {
      const url = savedUrls[relName]
      if (!url) continue
      const isImg = /\.(png|webp|gif|jpg|jpeg)$/i.test(relName)
      if (poseKey === 'stand') primaryMediaType = isImg ? 'image' : 'video'
      poses[poseKey] = {
        label: labels[poseKey] || poseKey,
        desc: isImg ? '工坊透明图' : '工坊动态视频',
        url,
        mediaType: isImg ? 'image' : 'video',
      }
    }
    const reactions = {}
    for (const [zone, relName] of Object.entries(reactionsMap)) {
      if (savedUrls[relName]) reactions[zone] = savedUrls[relName]
    }
    const bgUrl = bgFile && savedUrls[bgFile] ? savedUrls[bgFile] : ''

    if (Object.keys(poses).length === 0) {
      throw new Error('character pack contains no valid focus video or image pose')
    }

    if (!Array.isArray(this.data.focusPacks)) this.data.focusPacks = []
    this.data.focusPacks = this.data.focusPacks.filter((p) => p.id !== cleanId)
    const pack = {
      id: cleanId,
      name: String(name || cleanId).trim().slice(0, 48),
      author: String(author || 'community'),
      source: String(source || 'git'),
      builtin: false,
      mediaType: primaryMediaType,
      poses,
      reactions,
      bgUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.data.focusPacks.unshift(pack)
    this.data.focusPacks = this.data.focusPacks.slice(0, 24)
    if (activate) this.data.activeFocusPackId = cleanId
    await this.save()
    const payload = { pack, activeId: this.getActiveFocusPackId(), packs: this.listFocusPacks() }
    this.emitChange('focusPacks', payload)
    return payload
  }

  async deleteFocusPack(id) {
    const clean = String(id || '').trim()
    if (!clean || clean === 'xiaojing') {
      throw new Error('cannot delete builtin xiaojing pack')
    }
    if (!Array.isArray(this.data.focusPacks)) this.data.focusPacks = []
    const before = this.data.focusPacks.length
    this.data.focusPacks = this.data.focusPacks.filter((p) => p.id !== clean)
    if (this.data.activeFocusPackId === clean) {
      this.data.activeFocusPackId = 'xiaojing'
    }
    await rm(join(this.getFocusPacksDir(), clean), { recursive: true, force: true }).catch(() => {})
    const deleted = this.data.focusPacks.length !== before
    if (deleted) {
      await this.save()
    }
    const payload = { deleted, activeId: this.getActiveFocusPackId(), packs: this.listFocusPacks() }
    this.emitChange('focusPacks', payload)
    return payload
  }

  getWallpapersDir() {
    return join(this.dir, 'wallpapers')
  }

  async saveWallpaperFile({ filename, buffer, name, hasPanime = false }) {
    const dir = this.getWallpapersDir()
    await mkdir(dir, { recursive: true })
    const cleanExt = String(filename || 'wallpaper.png').toLowerCase().endsWith('.jpg') || String(filename || '').toLowerCase().endsWith('.jpeg')
      ? '.jpg'
      : '.png'
    const id = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const storedName = hasPanime ? `${id}.panime.png` : `${id}${cleanExt}`
    await writeFile(join(dir, storedName), buffer)
    const entry = {
      id,
      name: String(name || filename || '自定义壁纸').replace(/\.panime\.png$/i, ''),
      kind: hasPanime ? 'panime' : 'image',
      url: `/jphone/wallpapers/${storedName}`,
      hasPanime: Boolean(hasPanime),
      builtin: false,
      createdAt: Date.now(),
    }
    if (!Array.isArray(this.data.savedWallpapers)) this.data.savedWallpapers = []
    this.data.savedWallpapers.unshift(entry)
    this.data.savedWallpapers = this.data.savedWallpapers.slice(0, 20)
    const active = await this.updateWallpaper({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      url: entry.url,
      hasPanime: entry.hasPanime,
    })
    return { entry, wallpaper: active }
  }

  getNotificationConfig() {
    if (!this.data.notifications || typeof this.data.notifications !== 'object') {
      this.data.notifications = {
        enabled: false,
        sendKey: '',
        notifyOnTaskDone: true,
        notifyOnFocusDone: true,
        notifyOnDiaryPost: false,
        updatedAt: 0,
      }
    }
    return this.data.notifications
  }

  async updateNotificationConfig(patch = {}) {
    const cur = this.getNotificationConfig()
    if (typeof patch.sendKey === 'string') {
      cur.sendKey = patch.sendKey.trim()
      if (cur.sendKey && patch.enabled === undefined) cur.enabled = true
    }
    if (typeof patch.enabled === 'boolean') cur.enabled = patch.enabled
    if (typeof patch.notifyOnTaskDone === 'boolean') cur.notifyOnTaskDone = patch.notifyOnTaskDone
    if (typeof patch.notifyOnFocusDone === 'boolean') cur.notifyOnFocusDone = patch.notifyOnFocusDone
    if (typeof patch.notifyOnDiaryPost === 'boolean') cur.notifyOnDiaryPost = patch.notifyOnDiaryPost
    cur.updatedAt = Date.now()
    await this.save()
    this.emitChange('notifications', { enabled: cur.enabled, configured: !!cur.sendKey })
    return cur
  }

  listMemories() {
    if (!Array.isArray(this.data.memories)) this.data.memories = []
    return this.data.memories
  }

  async addMemory(text) {
    const clean = String(text || '').trim()
    if (!clean) throw new Error('Empty memory text')
    const mem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.listMemories().unshift(mem)
    await this.save()
    this.emitChange('memory', mem)
    return mem
  }

  async updateMemory(id, text) {
    const clean = String(text || '').trim()
    if (!clean) throw new Error('Empty memory text')
    const mem = this.listMemories().find((m) => m.id === id)
    if (!mem) return null
    mem.text = clean
    mem.updatedAt = Date.now()
    await this.save()
    this.emitChange('memory', mem)
    return mem
  }

  async deleteMemory(id) {
    const list = this.listMemories()
    const before = list.length
    this.data.memories = list.filter((m) => m.id !== id)
    if (this.data.memories.length !== before) {
      await this.save()
      this.emitChange('memory', { deletedId: id })
      return true
    }
    return false
  }

  async removeMiniApp(id) {
    const before = this.data.miniApps.length
    this.data.miniApps = this.data.miniApps.filter((a) => a.id !== id)
    if (this.data.miniApps.length !== before) {
      await this.save()
      this.emitChange('miniapp', { removedId: id })
      return true
    }
    return false
  }

  listAllKvNamespaces() {
    const kv = this.data.miniAppKv || {}
    return Object.entries(kv).map(([appId, entries]) => ({
      appId,
      keys: Object.entries(entries || {}).map(([key, value]) => ({
        key,
        preview: typeof value === 'string' ? value.slice(0, 120) : JSON.stringify(value).slice(0, 120),
        value,
      })),
    }))
  }

  async clearMiniAppKv(appId) {
    if (this.data.miniAppKv && this.data.miniAppKv[appId]) {
      delete this.data.miniAppKv[appId]
      await this.save()
      this.emitChange('kv', { clearedAppId: appId })
      return true
    }
    return false
  }

  listWorkshopItems() {
    const base = defaultWorkshopCatalog()
    const custom = Array.isArray(this.data.workshopPublished) ? this.data.workshopPublished : []
    const merged = [...custom, ...base]
    const installedAppIds = new Set(this.listMiniApps().map((a) => a.id))
    const activeWpId = this.getWallpaper().id
    return merged.map((item) => {
      let installed = Boolean(item.installed)
      if (item.kind === 'miniapp' && item.miniApp?.id) {
        installed = installedAppIds.has(item.miniApp.id)
      } else if (item.kind === 'wallpaper' && item.wallpaper?.id) {
        installed = activeWpId === item.wallpaper.id
      } else if (item.kind === 'skill') {
        installed = true
      }
      return { ...item, installed }
    })
  }

  async installWorkshopItem(id) {
    const item = this.listWorkshopItems().find((i) => i.id === id)
    if (!item) return null
    if (item.kind === 'miniapp' && item.miniApp) {
      const app = await this.installMiniApp(item.miniApp)
      return { item: { ...item, installed: true }, miniApp: app }
    }
    if (item.kind === 'wallpaper' && item.wallpaper) {
      const wp = await this.updateWallpaper(item.wallpaper)
      return { item: { ...item, installed: true }, wallpaper: wp }
    }
    return { item: { ...item, installed: true } }
  }

  async publishWorkshopItem({ kind = 'miniapp', title, description = '', author = '鲸娘创作者', miniApp = null, skillName = null }) {
    const cleanTitle = String(title || '').trim()
    if (!cleanTitle) throw new Error('Title required')
    if (!Array.isArray(this.data.workshopPublished)) this.data.workshopPublished = []
    const item = {
      id: `ws-pub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: String(kind),
      title: cleanTitle,
      description: String(description || '由本机创作者上传分享到鲸娘创意工坊'),
      author: String(author || '鲸娘创作者'),
      downloads: 1,
      ...(miniApp ? { miniApp } : {}),
      ...(skillName ? { skillName } : {}),
      publishedAt: Date.now(),
    }
    this.data.workshopPublished.unshift(item)
    await this.save()
    this.emitChange('workshop', item)
    return item
  }

  exportBackup() {
    return {
      exportedAt: new Date().toISOString(),
      version: this.data.version || 1,
      character: this.data.character,
      mood: this.data.mood,
      moodText: this.data.moodText,
      wallpaper: this.getWallpaper(),
      memories: this.listMemories(),
      miniApps: this.listMiniApps(),
      miniAppKv: this.data.miniAppKv || {},
      workshopPublished: this.data.workshopPublished || [],
    }
  }

}
