# dsh-skill-hub

[English](README.en.md) | 简体中文

> 把 DeepSeek Harness（DSH）Web 设置里的「技能」页升级为**跨 Agent 技能中枢**：自动扫描本机所有编码 Agent 的技能目录，同名技能多端合并成一张卡片，按 Agent 筛选，一键加载进全局技能库。

`dsh-skill-hub` 是一个 [DSH Web](https://www.npmjs.com/package/@deepseek-ai/dsh) 本地插件（与 [dsh-plugin-market](https://github.com/hskelp9527-pixel/dsh-plugin-market) 同一套插件体系）。它基于 [dbskill](https://github.com/dontbesilent2025/dbskill)、[Kami](https://github.com/tw93/Kami) 等多端技能生态的实际使用场景打磨：当同一个技能被 `npx skills add` 安装到 Claude Code、Codex、Qwen、iFlow、Trae 等多个 Agent 时，你需要的不是五遍重复列表，而是**一处汇总、按端筛选、随手加载**。

## 功能

**动态扫描（发现技能视图）**

- 自动发现本机所有装了技能的 Agent 目录，**扫到几个就有几个筛选分类**，没装的不会出现：

  | Agent | 扫描目录 |
  | --- | --- |
  | Claude Code | `~/.claude/skills`、`~/.claude/skills-src` |
  | Codex | `~/.codex/skills` |
  | OpenCode | `~/.config/opencode/skill`、`~/.config/opencode/agent`、`~/.opencode/skill`、`~/.local/share/opencode/skill` |
  | Qwen Code | `~/.qwen/skills` |
  | iFlow CLI | `~/.iflow/skills` |
  | Trae | `~/.trae/skills` |
  | 通用 Agents | `~/.agents/skills` |
  | Gemini CLI / Cursor / Windsurf / Goose | `~/.gemini/skills`、`~/.cursor/skills`、`~/.windsurf/skills`、`~/.goose/skills` |

- 顶部汇总：发现几个 Agent、几个技能、多少个跨端重复安装已合并、几个尚未加载。

**跨端合并去重**

- 合并键 = SKILL.md frontmatter 的 `name`（缺失时用目录名）。同一个技能装在多个端 → **只显示一张卡片**，卡片上带每个端的徽章，展开可看各端安装路径并单独链接。
- 按某个 Agent 筛选时显示该端的技能（合并后的数量，不是安装数）。

**加载提醒与一键加载**

- 未加载到 DSH 的技能带「未加载」徽章；「加载全部未入库（N）」按当前筛选批量入库。
- 每个技能两种加载方式：
  - **加载（链接）**（推荐，Windows 下用 junction）：`~/.dsh/skills/<name>` 指向源目录，两边同一份文件，编辑即改源；删除只移除链接。
  - **复制加载**：完整复制一份独立演化；源缺 frontmatter 时自动补全 `name` / `description`。
- 全局技能库是官方 skill-filesystem 的用户级扫描根，加载后立即可在输入框 `/` 菜单使用，无需重启。

**全局技能库管理（沿用并增强原 dsh-skill-manager）**

- 同前缀技能自动分组合并（如 `dbs` + `dbs-benchmark`… 展开成一张分组卡片，支持「整组加载」）。
- 编辑 SKILL.md（链接类技能保存时写回源目录）、两步确认删除、断链清理、内联新建技能。
- 搜索命中分组自动展开、只显示匹配项。

实测（本机）：6 个 Agent、277 个安装 → 合并为 124 张技能卡片，其中 `dbs` 系列五个端的重复全部合并。

## 安装

前置：已安装并初始化 DSH（`npm i -g @deepseek-ai/dsh` 后运行过 `dsh web` 或桌面端，`$DSH_HOME` 已生成）。

1. 把本仓库放进 DSH 能找到的插件目录（示例放在工作区的 `local-plugins/`）：

   ```bash
   git clone https://github.com/hskelp9527-pixel/dsh-skill-hub.git
   ```

2. 在 `$DSH_HOME/profiles/node_modules/` 建立指向源码的 junction（Windows）或符号链接（macOS/Linux）：

   ```powershell
   # Windows PowerShell
   cmd /c mklink /J "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-skill-hub" "<仓库路径>\dsh-skill-hub"
   ```

   ```bash
   # macOS / Linux
   ln -s "<仓库路径>/dsh-skill-hub" ~/.dsh/profiles/node_modules/dsh-skill-hub
   ```

3. 编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`，插入加载行（若装过旧版 `@dsh-local/dsh-skill-manager`，删除对应 insert 段，两个插件注册同一个「技能」页会冲突）：

   ```yaml
   - insert:
       - id: skill-hub
         name: 'dsh-skill-hub'
   ```

4. 重启 `dsh web`（或桌面端），设置 → 技能 → 「发现技能」。

> 卸载：删除 patch 行 + 删除 junction 即可；已加载到 `~/.dsh/skills` 的技能不受影响，可在页面里逐个删除。

## 使用

1. 打开 **设置 → 技能 → 发现技能**：顶部即显示本机扫描结果汇总。
2. 点击 Agent 筛选片（如 Claude Code / Codex / Qwen Code…）只看该端的技能。
3. 对需要的技能点 **加载（链接）**，或点 **加载全部未入库** 批量入库；同前缀分组可 **整组加载**。
4. 在输入框敲 `/` 即可调用已加载技能；后续维护在 **全局技能库** 视图完成。

## 工作原理

- **宿主端**（`lib/index.js`）：无 UI 依赖的 `SkillHubCore`（扫描/合并/加载，全部方法可注入根目录，便于测试）+ `TypertRemoteService` 薄封装，通过 `skillHub/*` Remote 方法暴露给 Web。
- **客户端**（`lib/client.js`）：注册 `settings.section`（id `skills`）设置页，中英双语词典，深色浅色主题变量取自 DSW alias。
- **状态文件**：`~/.dsh/skills/.skill-manager.json` 记录每个已加载技能的 `{mode, sourceId, sourcePath, addedAt}`（兼容旧 dsh-skill-manager 的记录）。
- 插件只做扫描、合并与加载，**不复制、不再分发任何第三方技能内容**；技能本体仍归属其各自仓库与协议。

## 开发与测试

```bash
git clone https://github.com/hskelp9527-pixel/dsh-skill-hub.git
cd dsh-skill-hub

# 宿主端冒烟测试：
#   Phase A 沙箱：伪造多 Agent 目录 → 发现/跨端合并/链接与复制加载/批量加载/重复拒绝/删除语义
#   Phase B 真实本机：只读扫描，打印各 Agent 与合并统计
#   Phase C 真实本机：加载一个真实技能为链接 → 校验 → 删除还原（不留痕迹）
node scripts/smoke-test.mjs            # 加 --skip-real 只跑沙箱

# 客户端冒烟测试：模拟 __ModuleLoader__ 加载、ctx 装配、zh/en 词典键覆盖、SSR 渲染
node scripts/client-smoke-test.mjs
```

两个测试都不需要真实启动 DSH，也不污染真实技能库（Phase C 会还原）。

## 贡献

- 问题与功能建议请开 [Issue](https://github.com/hskelp9527-pixel/dsh-skill-hub/issues)，尽量带上：Agent 名称、技能目录路径、期望行为。
- PR 欢迎：fork → 分支（`feat/xxx`、`fix/xxx`）→ 改动 → 补/过测试（`node scripts/smoke-test.mjs && node scripts/client-smoke-test.mjs`）→ 提交。
- 提交信息使用 Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:`）。
- 新增支持某 Agent 时：在 `AGENT_DEFINITIONS` 加目录候选 + README 表格补一行 + 沙箱测试补断言。

## 许可证

[MIT](LICENSE) © hskelp9527-pixel

## 致谢

- [dontbesilent2025/dbskill](https://github.com/dontbesilent2025/dbskill) 与 [tw93/Kami](https://github.com/tw93/Kami)——多端技能生态的实践样本
- [skills](https://github.com/vercel-labs/skills)（`npx skills add`）——跨 Agent 技能安装的事实标准
- [CocoSgt/dsh-skills](https://github.com/CocoSgt/dsh-skills) 与 [dsh-plugin-market](https://github.com/hskelp9527-pixel/dsh-plugin-market)——DSH 插件化的先行探索
