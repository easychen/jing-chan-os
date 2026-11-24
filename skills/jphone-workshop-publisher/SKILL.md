---
name: jphone-workshop-publisher
description: Package a 鲸Phone Mini-App, Skill, Wallpaper, or Character Pack with standard manifest.json, publish it to GitHub/Gitee, and submit a PR to the official decentralized workshop index easychen/jing-chan-os.
---

# 小鲸同学（JingChan / JPhone）创意工坊发布指南（jphone-workshop-publisher）

鲸Phone 采用**去中心化 Git 创意工坊**架构（无需自建账号体系或中心化审核服务器）：
- **创作者作品**：托管在创作者自己的 GitHub 或 Gitee 仓库中（遵循标准 `manifest.json` 协议）。
- **官方精选索引**：托管在 `https://github.com/easychen/jing-chan-os`（自动镜像到 `https://gitee.com/easychen/jing-chan-os`）。
- **零门槛分享**：任何用户只需把你的 GitHub/Gitee 仓库链接粘贴到「创意工坊 → Git 链接安装」，即可在确认权限后一键安装！

## 标准 `manifest.json` 协议

```json
{
  "id": "water-tracker",
  "name": "深海喝水打卡",
  "type": "miniapp",
  "version": "1.0.0",
  "entry": "index.html",
  "icon": "droplets",
  "color": "#0EA5E9",
  "author": "your-github-handle",
  "description": "每天 8 杯水健康打卡，配合小鲸提醒",
  "permissions": ["storage", "ui.notify"],
  "tags": ["健康", "打卡"]
}
```

### 支持的类型 (`type`)
- `miniapp`：单文件或静态 HTML 迷你应用，入口默认 `index.html`，可使用 `window.jing` 安全桥接 API。
- `skill`：DeepSeek Harness 技能包，入口默认 `SKILL.md`。
- `wallpaper`：动态壁纸 / `.panime.png` 视觉包。
- `character`：角色形象包（包含 `character.json` 动作与立绘声明）。

### 支持声明的权限 (`permissions`)
- `storage`：仅读写本应用自己的私有 KV 命名空间。
- `ui.header`：调用 `window.jing.ui.setHeaderStyle(...)` 匹配顶栏配色。
- `ui.notify`：在手机内弹出原生 Toast 提示。
- `chat.ask`：向小鲸同学发起 AI 提问。
- `audio.host`：控制宿主后台白噪音/Lo-Fi 音频。
- `tasks.dispatch`（敏感权限）：派发 DeepSeek Harness 后台任务。
- `notify.push`（敏感权限）：触发 Server酱手机推送。

## 发布步骤（AI Agent 自动执行流程）

1. **生成标准包目录**：
   - 将作品整理为包含 `manifest.json`、入口文件（`index.html` 或 `SKILL.md`）与 `README.md` 的干净目录。
   - 校验 `manifest.json` 不包含路径穿越（`..`）且只申请最小必要权限。
2. **推送至创作者 GitHub 仓库**：
   - 使用 `gh repo create` 或推送至已有仓库，确保 `main` 分支可访问。
   - 告诉用户直接可用的 Git 安装链接（例如 `https://github.com/<user>/<repo>`）。
3. **提交到官方精选索引 `easychen/jing-chan-os`（可选）**：
   - Fork `https://github.com/easychen/jing-chan-os`
   - 在 `workshop/index.json` 的 `items` 数组中追加一条作品元数据（`id`, `name`, `type`, `version`, `author`, `repo`, `description`, `permissions`, `icon`, `color`）
   - 使用 `gh pr create` 提交 Pull Request，合并后会自动同步到 Gitee 国内镜像，所有鲸Phone 用户即可在创意工坊首页直接发现并一键安装！
