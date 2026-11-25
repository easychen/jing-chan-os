<div align="center">
  <img src="./packages/dsh-plugin-jphone/assets/icon.png" alt="小鲸同学 JingChan" width="104" height="104" />
  <h1>小鲸同学 · JingChanOS</h1>
  <p><strong>把你的 DeepSeek Harness 变成一部随身 AI 伴侣手机</strong></p>
  <p><em>AI Companion Desktop Pet, Hands-Free Voice Calls, Focus Studio & Mobile Virtual Phone Plugin for DeepSeek Harness (DSH)</em></p>
  <p>
    <a href="https://www.npmjs.com/package/dsh-plugin-jphone">
      <img alt="npm version" src="https://img.shields.io/npm/v/dsh-plugin-jphone?style=flat-square&logo=npm&color=14B8A6&label=dsh-plugin-jphone" />
    </a>
    <a href="https://github.com/easychen/jing-chan-os/releases/latest">
      <img alt="Android APK" src="https://img.shields.io/github/v/release/easychen/jing-chan-os?style=flat-square&logo=android&logoColor=white&color=0EA5E9&label=Android%20APK" />
    </a>
    <a href="./workshop">
      <img alt="Workshop" src="https://img.shields.io/badge/Workshop-Decentralized_Git-6366F1?style=flat-square" />
    </a>
    <a href="./LICENSE">
      <img alt="License" src="https://img.shields.io/badge/License-MIT_%2F_Open--Core-F59E0B?style=flat-square" />
    </a>
  </p>

  <br />
  <img src="./docs/screenshots/hero-desktop.jpg" alt="DeepSeek Harness 桌面 + 小鲸同学悬浮虚拟手机" width="92%" />
  <p><sub>在 DeepSeek Harness 桌面中一键展开「小鲸同学」悬浮虚拟手机与 Q 版桌宠</sub></p>
</div>

---

## 📸 界面一览

### 沉浸式「小鲸专注」伴学工作台（宽屏 & 移动端自适应）

<div align="center">
  <img src="./docs/screenshots/focus-widescreen.jpg" alt="小鲸专注宽屏模式" width="92%" />
  <p><sub>VP9+Alpha 原生透明互动立绘 · 内置 12 路离线白噪音与 6 首 Lo-Fi · 支持导入自定义动态视频与工坊角色包</sub></p>
</div>

### 手机端核心体验（Web 嵌入 & Android 随身客户端一致）

<table>
  <tr>
    <td align="center" width="33%">
      <img src="./docs/screenshots/mobile-home.jpg" alt="随身虚拟手机主屏" width="240" /><br />
      <sub><strong>随身虚拟手机主屏</strong><br />iOS 磨砂玻璃质感 · 状态栏明暗自适应</sub>
    </td>
    <td align="center" width="33%">
      <img src="./docs/screenshots/mobile-call.jpg" alt="小鲸电话免提实时语音" width="240" /><br />
      <sub><strong>小鲸电话 · 免提实时语音</strong><br />随时打断 · 边聊边派发 DSH 后台任务</sub>
    </td>
    <td align="center" width="33%">
      <img src="./docs/screenshots/focus-packs.jpg" alt="小鲸专注角色与自定义动态视频" width="240" /><br />
      <sub><strong>小鲸专注 · 自定义动态视频</strong><br />支持导入 .webm / .mp4 / 动图与工坊角色包</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="./docs/screenshots/focus-mixer.jpg" alt="12轨白噪音与Lo-Fi混音台" width="240" /><br />
      <sub><strong>12 轨白噪音 & Lo-Fi 混音</strong><br />离线内置 18 首音频 · 退出后后台持续播放</sub>
    </td>
    <td align="center" width="33%">
      <img src="./docs/screenshots/mobile-diary.jpg" alt="小鲸日记与分层记忆" width="240" /><br />
      <sub><strong>小鲸日记 & 分层记忆</strong><br />自动回顾每日工作与陪伴点滴</sub>
    </td>
    <td align="center" width="33%">
      <img src="./docs/screenshots/mobile-workshop.jpg" alt="去中心化Git创意工坊" width="240" /><br />
      <sub><strong>去中心化 Git 创意工坊</strong><br />粘贴 GitHub/Gitee 链接安装小应用/壁纸/角色</sub>
    </td>
  </tr>
</table>

<details>
<summary>查看更多截图：Panime 动态壁纸与动效设置</summary>
<br />
<div align="center">
  <img src="./docs/screenshots/mobile-wallpaper.jpg" alt="Panime 动态壁纸设置" width="280" />
  <p><sub>支持导入 <code>.panime.png</code> 果冻视差动态壁纸，内置 <a href="https://panime.ft07.com/">Panime 官网</a> 在线制作入口（支持网页版、iOS 与 Android APK）</sub></p>
</div>
</details>

---

## ✨ 核心特性

**小鲸同学（JingChan / 项目代号 JPhone）** 是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 打造的桌面伴侣 + 移动端虚拟手机操作系统：

- **🐋 桌面 Q 版桌宠**：在 DSH 桌面实时陪伴，自动监听 Agent 会话与工具调用状态（思考 / 干活 / 开心 / 喝茶 / 听歌 / 犯困）。
- **📱 随身虚拟手机（Web + Android）**：磨砂玻璃桌面、竖屏手机 & 横屏平板自适应、支持 [Panime](https://panime.ft07.com/) 动态果冻视差壁纸（网页版 / iOS / Android APK 均可自制）。
- **📞 实时语音电话 & 后台任务协同**：免提实时语音通话（支持系统默认麦克风记忆、随时开口打断），边聊边把复杂任务派发给 DSH 后台异步执行，完成后主动汇报。
- **⏱️ 沉浸式「小鲸专注」工作台**：透明 VP9+Alpha 互动立绘（多姿态 + 抚摸反馈）、内置 12 路离线白噪音与 6 首 Lo-Fi 音乐、宿主级后台番茄钟、支持**用户自行导入动态视频（`.webm` / `.mp4` / `.webp` / `.gif`）**及工坊角色包。
- **📔 小鲸日记 & 分层记忆**：自动沉淀每日工作与陪伴日记，联动长期记忆。
- **🧩 去中心化创意工坊（Workshop）**：无需注册账号，通过 GitHub / Gitee 链接即可分享与安装 HTML5 Mini-App、DSH Skills、`.panime.png` 动态壁纸与专注角色包（`character`）。
- **🔗 局域网直连 + 一键公网穿透**：手机扫码一键配对本地 DSH，支持局域网直连、一键 Cloudflare Tunnel 远程访问与 Server酱推送提醒。

---

## 🚀 快速开始

### 第一步：一行安装 DeepSeek Harness 插件

在你的电脑端 DeepSeek Harness 中安装 `dsh-plugin-jphone`（安装后插件列表中自动显示为 **小鲸同学** / **JingChan**）：

```bash
# 方式 A：通过 npm 一行安装（推荐）
dsh plugin add dsh-plugin-jphone

# 方式 B：克隆本仓库后从本地路径安装
git clone https://github.com/easychen/jing-chan-os.git
dsh plugin add ./jing-chan-os/packages/dsh-plugin-jphone
```

启用插件后，DSH 桌面右下角与侧边栏将立即出现 **小鲸同学**，点击即可在桌面浏览器中完整体验全部功能。

### 第二步：安装安卓随身客户端（可选）

1. 前往 [**GitHub Releases**](https://github.com/easychen/jing-chan-os/releases/latest) 下载最新安卓安装包：
   - 推荐下载 `JingChan-v*-android-arm64.apk`（主流 64 位安卓手机）
   - 通用备选 `JingChan-v*-android-universal.apk`
2. 打开电脑端「小鲸同学 → 控制台」，选择「局域网直连」或一键开启「公网穿透」；
3. 打开手机端「设置 → 扫码配对连接」，扫描二维码即可远程掌控你电脑上的 DeepSeek Harness！

详细配对与 Server酱推送配置请参阅 [Android 安装与配对指南](./docs/android-install.md)。

---

## 📦 仓库结构（JingChanOS 开放生态）

| 目录 | 说明 | 协议 |
| :--- | :--- | :--- |
| [`packages/dsh-plugin-jphone/`](./packages/dsh-plugin-jphone) | 完整可运行的 DSH 插件包（含 `locale`、内置音频与角色 `assets`、预编译 `web-dist` 与测试集） | MIT（代码） / 免费分发（预编译 `web-dist`） |
| [`workshop/`](./workshop) | 官方去中心化创意工坊索引与示例扩展包（Mini-App / Skill / 壁纸 / 角色包） | MIT |
| [`skills/`](./skills) | 官方 AI 共创 Skills（小应用生成、素材制作、工坊发布、内网穿透） | MIT |
| [`docs/`](./docs) | 开放生态文档：[`window.jing` SDK](./docs/miniapp-sdk.md)、[`.panime.png` 规范](./docs/panime-format.md)、[工坊贡献指南](./docs/workshop-contributing.md) | MIT |
| [GitHub Releases](https://github.com/easychen/jing-chan-os/releases) | 预编译 Android Release APK（arm64 + universal + SHA256 校验） | 免费个人使用 |

---

## 🧩 参与共创（创意工坊 & Skills）

- **开发一个 Mini-App**：遵循 [Mini-App SDK 规范](./docs/miniapp-sdk.md)，单个 HTML 文件即可调用 `window.jing` 私有存储、AI 对话、宿主音频与顶栏控制。
- **上架官方精选工坊**：向 [`workshop/index.json`](./workshop/index.json) 提交 PR，支持 `miniapp` / `skill` / `wallpaper` / `character` 四类作品，详情见 [创意工坊贡献指南](./docs/workshop-contributing.md)。
- **使用官方 Skills**：本仓库 [`skills/`](./skills) 包含 4 个开箱即用的 DSH Skills：
  - `jphone-miniapp-builder`：让小鲸一句话帮你编写并安装新的手机小应用
  - `jphone-asset-creator`：制作统一风格的角色立绘、动态视频与 `.panime.png` 壁纸
  - `jphone-workshop-publisher`：自动打包 `manifest.json`、推送 GitHub 并准备工坊 PR
  - `jphone-remote-tunnel`：自动配置 Cloudflare / Tailscale / frp 公网穿透

---

## 🔓 开源策略说明（Open-Core）

为了兼顾**社区自由扩展**与**项目长期可持续演进**，JingChanOS 采用 **Open-Core + 开放生态** 模式：
- **完全开源（MIT）**：DSH 插件服务端、桥接协议与 `window.jing` SDK、创意工坊索引与校验工具、全部官方 Skills 与示范包；
- **免费预编译分发**：桌面端预编译 Web 资源（`web-dist/`）与 Android 客户端 APK（通过 GitHub Releases 提供）。

---

## 🙏 致谢 · Acknowledgments

- [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) — 提供开放的 Cordis 插件底座与 Agent 运行时。
- [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) (MIT) — 桌面宠物监听 DSH 会话事件流的状态机架构与透明视频动画思路深受该项目启发（本项目全部美术与视频素材均为独立原创制作）。

---

## 📣 社区与反馈

- **问题反馈 / 功能建议**：[GitHub Issues](https://github.com/easychen/jing-chan-os/issues)
- **创意工坊作品投稿**：[Submit a PR to `workshop/index.json`](./docs/workshop-contributing.md)

<details>
<summary>English Overview</summary>

**JingChanOS (小鲸同学 / `dsh-plugin-jphone`)** is an AI companion plugin and virtual mobile phone OS for **DeepSeek Harness (DSH)**.

- **Install in 1 command**: `dsh plugin add dsh-plugin-jphone`
- **Desktop Companion & Virtual Phone**: Live Q-chibi desktop pet reacting to DSH agent events, floating iPhone-style virtual phone, hands-free real-time voice calls with background task delegation, immersive Focus Studio (VP9+Alpha animated companion, 12 offline ambient noises + 6 Lo-Fi tracks, custom animated video import), AI diary & tiered memory.
- **Android Client**: Download prebuilt APKs from [GitHub Releases](https://github.com/easychen/jing-chan-os/releases/latest) and pair with your desktop DSH via QR code over LAN or Cloudflare Tunnel.
- **Decentralized Git Workshop**: Share and install Mini-Apps (`window.jing` SDK), DSH Skills, `.panime.png` live wallpapers ([panime.ft07.com](https://panime.ft07.com/)), and Focus Character Packs directly from any GitHub/Gitee repository.

</details>
