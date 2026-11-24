# 小鲸同学 · 官方去中心化创意工坊（Workshop）

本目录是 **小鲸同学（JingChan / JPhone）** 去中心化创意工坊的官方精选索引（原 `jing-phone-index` 已合并至此）。

- **主源（GitHub）**：`https://github.com/easychen/jing-chan-os/tree/main/workshop`
- **国内镜像（Gitee）**：`https://gitee.com/easychen/jing-chan-os/tree/main/workshop`（定期同步镜像）

## 架构特点
- **零账号门槛 / 去中心化**：创作者作品托管在自己的 GitHub 或 Gitee 仓库中，遵循标准 `manifest.json` 协议。
- **直链一键安装**：用户可直接粘贴任意 GitHub/Gitee 仓库链接到小鲸同学「创意工坊 → Git 链接安装」，确认权限后一键安装。
- **PR 上架精选**：向本仓库 `workshop/index.json` 提交 PR，通过 CI 校验并合并后，所有用户即可在首页发现。

## 目录结构
- `index.json`：官方精选目录
- `schema/manifest.schema.json`：标准扩展包协议校验 Schema
- `packages/`：官方内置示范包（Mini-App / Skill）

详细开发与提交流程请参阅 [创意工坊贡献指南](../docs/workshop-contributing.md)。
