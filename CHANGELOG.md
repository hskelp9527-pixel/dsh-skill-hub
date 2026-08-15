# Changelog

本项目的所有显著变更都记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-08-17

### Added

- **跨 Agent 技能扫描**：动态发现本机已装技能的 Agent 目录（Claude Code、Codex、OpenCode、Qwen Code、iFlow CLI、Trae、通用 `~/.agents`、Gemini CLI、Cursor、Windsurf、Goose），扫到几个就显示几个筛选分类，未安装的不出现。
- **跨端合并去重**：同一技能（frontmatter `name` 或目录名相同）安装在多个 Agent 时合并为一张卡片，带各端徽章与逐端安装详情，绝不重复显示。
- **加载提醒与批量加载**：未入库技能标「未加载」，支持按当前 Agent 筛选批量加载（`importUnloaded`）。
- **链接 / 复制两种加载方式**：链接（junction/symlink，双向同步、删除不动源）与复制（独立副本、自动补全 frontmatter）。
- **同前缀分组**：`dbs` + `dbs-*` 等技能族合并为分组卡片，支持「整组加载」；搜索时自动展开并过滤成员。
- **全局技能库管理**：编辑 SKILL.md（链接写回源目录）、两步确认删除、断链清理、内联新建；沿用 `.skill-manager.json` 状态文件，兼容旧 dsh-skill-manager 记录。
- **中英双语界面**与深浅色主题适配。
- **冒烟测试**：宿主端 16 项（沙箱端到端 + 真实本机只读扫描 + 真实导入往返还原）、客户端 5 项（模块加载、ctx 装配、词典键覆盖、SSR 渲染）。
- 开源管理基础：MIT 协议、中英双语 README、CHANGELOG、贡献指南。
