# 小鲸同学 Mini-App SDK（`window.jing` 桥接规范）

小鲸同学（JingChan）的虚拟手机支持运行单文件 HTML5 迷你应用（Mini-App）。所有运行在宿主容器内的 Mini-App 都会由宿主自动注入安全的 `window.jing` 桥接对象，实现数据持久化、AI 对话、后台任务派发、沉浸式顶栏控制与后台白噪音协作。

## 1. 页面结构与沉浸式顶栏约定

推荐单文件 HTML5（内联 CSS + JS），面向移动端 `390px` 视口设计，不依赖外网 CDN：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="jphone-header-bg" content="#0A1328" />
  <meta name="jphone-header-style" content="light" />
  <meta name="jphone-header-border" content="transparent" />
  <title>我的小应用</title>
</head>
<body>
  <!-- 你的应用界面 -->
</body>
</html>
```

### 支持的 `<meta>` 声明
- `jphone-header-bg`：顶部导航栏背景色（十六进制，如 `#0A1328` 或 `#F2F2F7`）
- `jphone-header-style`：`light`（深色背景配白色文字）或 `dark`（浅色背景配深色文字）
- `jphone-header-border`：顶栏底部分割线颜色（无缝融合设为 `transparent`）

## 2. `window.jing` 完整 API

### 2.1 隔离 KV 存储（需权限 `storage`）
每个 Mini-App 拥有独立的 Capability Token 与 KV 命名空间，无法跨应用读取数据：

```js
await window.jing.storage.set('count', 8)
const count = await window.jing.storage.get('count')
const keys = await window.jing.storage.keys()
await window.jing.storage.delete('count')
// 也可使用别名 window.jing.db.*
```

### 2.2 AI 对话与后台任务派发（需权限 `chat.ask` / `tasks.dispatch`）

```js
// 向主对话窗口发消息
await window.jing.chat.send('帮我总结今天喝水记录')

// 直接向小鲸提问（前台同步 / 后台异步）
const res = await window.jing.chat.ask('给我一句温柔的鼓励', { background: false })

// 派发原生 DeepSeek Harness 后台子任务（敏感权限 tasks.dispatch）
await window.jing.tasks.dispatch('整理周报', '请读取本周工作记录并输出 Markdown 周报', 'standard')
```

### 2.3 原生顶栏与气泡通知（需权限 `ui.header` / `ui.notify` / `notify.push`）

```js
// 动态调整顶栏样式与沉浸式显隐
window.jing.ui.setHeaderStyle({
  backgroundColor: '#0A1328',
  foregroundColor: 'light', // 'light' | 'dark'
  borderColor: 'transparent',
  title: '深海专注',
  hidden: false,            // true 时隐藏原生顶栏，进入全屏沉浸态
})

// 手机端原生悬浮 Toast 通知
window.jing.ui.notify({ title: '打卡成功', body: '今天已完成第 8 杯水！' })

// 触发 Server酱外部手机推送（敏感权限 notify.push）
await window.jing.notify.push('custom', '专注完成', '本轮 25 分钟番茄钟已完成')
```

### 2.4 宿主级后台音频协作（需权限 `audio.host`）
退出 Mini-App 返回桌面后，宿主后台音频仍可持续播放并与语音电话自动闪避（Audio Ducking）：

```js
window.jing.audio.setState({
  active: true,
  playing: true,
  title: '深海雨声',
  subtitle: '小鲸专注 · 白噪音',
  sceneId: 'rainy-ocean',
})
window.jing.audio.onCommand((cmd) => {
  // 处理桌面小组件发来的 play / pause / stop 指令
})
```

### 2.5 角色状态与实时事件总线

```js
const charInfo = window.jing.character.get()
await window.jing.character.setMood('happy', '太棒啦！')

const unsub = window.jing.events.on('mood', (ev) => console.log(ev))
```

## 3. 权限清单（`manifest.json`）

| 权限 ID | 说明 | 是否敏感 |
| :--- | :--- | :---: |
| `storage` | 读写本应用私有 KV 命名空间 | 否 |
| `ui.header` | 自定义原生顶栏配色与沉浸式显隐 | 否 |
| `ui.notify` | 弹出应用内悬浮 Toast 通知 | 否 |
| `chat.ask` | 向小鲸同学发起 AI 提问 | 否 |
| `audio.host` | 控制宿主后台白噪音 / Lo-Fi 音频 | 否 |
| `memories.read` | 读取小鲸记忆摘要 | 否 |
| `tasks.dispatch` | 在 DeepSeek Harness 派发后台任务 | **是** |
| `notify.push` | 触发 Server酱手机推送通知 | **是** |
