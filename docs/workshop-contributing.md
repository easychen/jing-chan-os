# 去中心化创意工坊贡献指南（Workshop）

小鲸同学采用 **去中心化 Git 创意工坊** 架构，不需要注册账号、不需要中心化审核服务器：
- 任意创作者只需将作品发布到自己的 GitHub 或 Gitee 仓库，用户粘贴链接即可安装；
- 希望被所有小鲸同学用户在首页「官方精选」发现的作品，欢迎向本仓库 `workshop/index.json` 提交 PR！

## 1. 准备你的作品目录

作品根目录（或仓库中的任意子目录）需包含 `manifest.json` 和入口文件（如 `index.html` 或 `SKILL.md`）：

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
  "description": "极简深海喝水记录，每天 8 杯水，小鲸陪你养成健康节律",
  "permissions": ["storage", "ui.header", "ui.notify"],
  "tags": ["健康", "打卡"]
}
```

### 字段校验规则（见 `workshop/schema/manifest.schema.json`）
- `id`：2~64 位小写字母、数字、`-` 或 `_`
- `type`：`miniapp` | `skill` | `wallpaper` | `character`
- `entry`：相对路径，禁止 `..` 路径穿越（`miniapp` 默认 `index.html`，`skill` 默认 `SKILL.md`，`character` 默认 `character.json`）
- `permissions`：遵循最小权限原则，仅申请实际调用的权限

## 2. 本地测试直链安装
1. 将你的作品推送到公开的 GitHub 或 Gitee 仓库（支持子目录链接，例如 `https://github.com/<user>/<repo>/tree/main/my-app`）；
2. 打开小鲸同学「创意工坊 → Git 链接安装」，粘贴链接并点击「检测权限与安装」验证效果。

## 3. 提交 PR 上架官方精选
1. Fork `https://github.com/easychen/jing-chan-os`；
2. 在 `workshop/index.json` 的 `items` 数组中追加你的作品条目（填写 `repo` 指向你的 GitHub 仓库或子目录，或者将小型开源示范包放到 `workshop/packages/<id>/`）；
3. 提交 Pull Request —— GitHub Actions 会自动校验 `workshop/index.json` 与 `manifest.json` 格式；
4. 合并后会自动同步到 Gitee 国内镜像，所有用户即可在创意工坊首页一键安装！

> 提示：你也可以直接在小鲸同学「创意工坊」里点「让小鲸打包发布」，小鲸会自动调用内置的 `jphone-workshop-publisher` Skill 帮你完成打包与推送。
