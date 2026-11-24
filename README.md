<div align="center">
  <img src="./packages/dsh-plugin-jphone/assets/icon.png" alt="小鲸同学 JingChan" width="108" height="108" />
  <h1>小鲸同学 · JingChanOS</h1>
  <p><strong>把你的 DeepSeek Harness 变成一部随身 AI 伴侣手机</strong></p>
  <p><em>Your Personal AI Companion OS & Mobile Virtual Phone for DeepSeek Harness (DSH)</em></p>
  <p>
    <a href="https://github.com/easychen/jing-chan-os/releases/latest">
      <img alt="Android APK" src="https://img.shields.io/badge/Android_APK-GitHub_Releases-0EA5E9?style=flat-square&logo=android&logoColor=white" />
    </a>
    <a href="./packages/dsh-plugin-jphone">
      <img alt="DSH Plugin" src="https://img.shields.io/badge/DSH_Plugin-dsh--plugin--jphone-14B8A6?style=flat-square" />
    </a>
    <a href="./workshop">
      <img alt="Workshop" src="https://img.shields.io/badge/Workshop-Decentralized_Git-6366F1?style=flat-square" />
    </a>
    <a href="./LICENSE">
      <img alt="License" src="https://img.shields.io/badge/License-MIT_%2F_Open--Core-F59E0B?style=flat-square" />
    </a>
  </p>
</div>

---

## ✨ 这是什么？

**小鲸同学（英文名 JingChan，项目代号 JPhone）** 是一套专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) 打造的桌面伴侣 + 移动端虚拟手机操作系统：

- **🐋 桌面 Q 版小人**：在 DSH 桌面实时陪伴，同步监听 Agent 工作状态（思考 / 干活 / 开心 / 喝茶 / 听歌 / 犯困）。
- **📱 随身虚拟手机（Web + Android）**：iOS 风格磨砂玻璃桌面、支持竖屏与横屏 iPad 布局、状态栏文字随壁纸明暗自适应。
- **📞 实时语音电话 & 后台任务协同**：边和「小鲸电话」聊天边把复杂任务（查资料、写代码、打包发布）派发给 DSH 后台异步执行，完成后主动汇报。
- **⏱️ 沉浸式「小鲸专注」工作台**：透明 VP9+Alpha 互动立绘（多姿势 + 抚摸反馈）、宿主级后台白噪音与番茄钟、一键纯享沉浸全屏。
- **📔 小鲸日记 & 分层记忆**：自动沉淀每日工作与陪伴日记，联动长期记忆。
- **🧩 去中心化创意工坊（Workshop）**：无需注册账号，通过 GitHub / Gitee 链接即可分享和安装 HTML5 Mini-App、DSH Skills、`.panime.png` 动态壁纸与角色包。
- **🔗 局域网直连 + 一键公网穿透**：手机扫码一键配对本地 DSH，支持同 Wi-Fi 局域网直连与 Cloudflare Tunnel 远程访问，并内置 Server酱推送提醒。

---

## 🚀 快速开始

### 第一步：安装 DeepSeek Harness 插件

在你的电脑端 DeepSeek Harness 中安装 `dsh-plugin-jphone`（安装后在插件列表中会自动显示为中文名 **小鲸同学** / 英文名 **JingChan**）：

```bash
# 方式 A：克隆本仓库后本地安装（推荐立即体验）
git clone https://github.com/easychen/jing-chan-os.git
dsh plugin add ./jing-chan-os/packages/dsh-plugin-jphone

# 方式 B：通过 npm 安装（发布至 npm 后可用）
dsh plugin add dsh-plugin-jphone
```

启用插件后，DSH 桌面右下角与侧边栏将立即出现 **小鲸同学**，点击即可在桌面浏览器中完整体验全部功能。

### 第二步：在安卓手机上安装「小鲸同学」客户端（可选）

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
| [`packages/dsh-plugin-jphone/`](./packages/dsh-plugin-jphone) | 完整可运行的 DSH 服务端插件（含 `locale`、`assets`、内置 `web-dist` 与测试集） | MIT（代码） / 免费分发（预编译 `web-dist`） |
| [`workshop/`](./workshop) | 官方去中心化创意工坊索引（原 `jing-phone-index` 已合并）与示例扩展包 | MIT |
| [`skills/`](./skills) | 官方 AI 共创 Skills（小应用生成、素材制作、工坊发布、内网穿透） | MIT |
| [`docs/`](./docs) | 开放生态文档：[`window.jing` SDK](./docs/miniapp-sdk.md)、[`.panime.png` 规范](./docs/panime-format.md)、[工坊贡献指南](./docs/workshop-contributing.md) | MIT |
| [GitHub Releases](https://github.com/easychen/jing-chan-os/releases) | 预编译 Android Release APK（arm64 + universal + SHA256 校验） | 免费个人使用 |

---

## 🧩 参与共创（创意工坊 & Skills）

- **开发一个 Mini-App**：遵循 [Mini-App SDK 规范](./docs/miniapp-sdk.md)，单个 HTML 文件即可调用 `window.jing` 私有存储、AI 对话与顶栏控制。
- **上架官方精选工坊**：向 [`workshop/index.json`](./workshop/index.json) 提交 PR，详情见 [创意工坊贡献指南](./docs/workshop-contributing.md)。
- **使用官方 Skills**：本仓库 [`skills/`](./skills) 包含 4 个开箱即用的 DSH Skills：
  - `jphone-miniapp-builder`：让小鲸一句话帮你编写并安装新的手机小应用
  - `jphone-asset-creator`：制作统一风格的角色立绘与 `.panime.png` 动态壁纸
  - `jphone-workshop-publisher`：自动打包 `manifest.json`、推送 GitHub 并准备工坊 PR
  - `jphone-remote-tunnel`：自动配置 Cloudflare / Tailscale / frp 公网穿透

---

## 🔓 开源策略说明（Open-Core）

为了兼顾**社区自由扩展**与**项目长期可持续演进**，JingChanOS 采用 **Open-Core + 开放生态** 模式：
- **完全开源（MIT）**：DSH 插件服务端、桥接协议与 `window.jing` SDK、创意工坊索引与校验工具、全部官方 Skills 与示范包；
- **免费预编译分发**：桌面端预编译 Web 资源（`web-dist/`）与 Android 客户端 APK（通过 GitHub Releases 提供）；
- **可持续支持**：后续将提供可选的托管云增值服务（稳定免折腾的国内穿透中继、开箱即用语音/多模态额度包、官方精选工坊服务等），开源用户永远可以免费自托管与使用自己的 API Key。

---

## 📣 社区与反馈

- **问题反馈 / 功能建议**：[GitHub Issues](https://github.com/easychen/jing-chan-os/issues)
- **创意工坊作品投稿**：[Submit a PR to `workshop/index.json`](./docs/workshop-contributing.md)

<details>
<summary>English Summary</summary>

**JingChanOS (小鲸同学 / Project JPhone)** is an AI companion plugin and virtual mobile phone OS for **DeepSeek Harness (DSH)**.
- **Desktop Companion & Virtual Phone**: Install `packages/dsh-plugin-jphone` into DSH to get a live desktop pet, voice call companion, immersive focus studio with transparent VP9+Alpha animations, AI diary, and embedded Flutter Web phone UI.
- **Android Client**: Download prebuilt APKs from [GitHub Releases](https://github.com/easychen/jing-chan-os/releases/latest) and pair with your desktop DSH via QR code over LAN or Cloudflare Tunnel.
- **Decentralized Git Workshop**: Share and install Mini-Apps (`window.jing` SDK), DSH Skills, `.panime.png` wallpapers, and Character Packs directly from any GitHub/Gitee repository.

</details>
