# Android 客户端安装与配对指南

## 1. 下载安装包（APK）

前往本仓库的 [GitHub Releases](https://github.com/easychen/jing-chan-os/releases/latest) 页面下载最新版本：

- **`JingChan-v*-android-arm64.apk`（推荐）**：适用于绝大多数现代安卓手机（ARM64 架构），体积更小。
- **`JingChan-v*-android-universal.apk`**：全架构通用版，如安装 arm64 版本提示不兼容时使用。

> 客户端支持根据手机系统语言自动显示应用名称：中文系统显示 **「小鲸同学」**，英文及其他语言显示 **「JingChan」**。

## 2. 连接你的电脑端 DeepSeek Harness

1. 确保电脑端 DeepSeek Harness 已安装并启用 `dsh-plugin-jphone`（在 DSH 插件列表显示为 **小鲸同学**）；
2. 在电脑端点击「小鲸同学」右上角设置按钮，打开 **控制台**；
3. 根据你的网络环境选择配对二维码 Tab：
   - **局域网直连（同 Wi-Fi）**：默认开启，零延迟，手机与电脑连接同一 Wi-Fi 即可扫码；
   - **公网穿透（Cloudflare Tunnel）**：出门在外使用 4G/5G 时，点击「一键开启」公网穿透，切换至「公网穿透」Tab 扫码。
4. 在安卓端打开「小鲸同学 → 设置 → 扫码配对连接」，扫描二维码（或复制配对链接粘贴）即可秒连。

## 3. 可选：开启 Server酱 外部推送
在手机端「设置 → Server酱推送」中，点击 **「一键创建 Server酱 AppKey」** 即可通过系统浏览器快速获取推送密钥，配置后即可在后台任务完成、番茄钟结束或小鲸写完日记时收到手机系统通知。
