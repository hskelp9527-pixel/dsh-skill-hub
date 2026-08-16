# dsh-skill-hub

English | [简体中文](README.md)

> Upgrades the Settings → "Skills" page of DeepSeek Harness (DSH) Web into a **cross-agent skill hub**: it scans every local coding agent's skill directory, merges skills installed on multiple agents into a single card, filters by agent, and loads them into the global DSH skill library.

`dsh-skill-hub` is a local [DSH Web](https://www.npmjs.com/package/@deepseek-ai/dsh) plugin (same plugin family as [dsh-plugin-market](https://github.com/hskelp9527-pixel/dsh-plugin-market)). It was shaped by real multi-agent skill ecosystems such as [dbskill](https://github.com/dontbesilent2025/dbskill) and [Kami](https://github.com/tw93/Kami): when the same skill is installed by `npx skills add` into Claude Code, Codex, Qwen, iFlow, Trae and friends, you don't want five repeated listings — you want **one aggregated view, per-agent filtering, and one-click loading**.

## Features

**Dynamic discovery (Discover view)**

- Detects every local agent directory that actually holds skills — **as many filter chips as agents found**; absent agents never appear:

  | Source | Scanned directories | Notes |
  | --- | --- | --- |
  | Claude Code | `~/.claude/skills` | `~/.claude/skills-src` is symlink source storage, **not an install** — never scanned |
  | Codex | `~/.codex/skills` | |
  | OpenCode | `~/.config/opencode/skill`, `~/.config/opencode/agent`, `~/.opencode/skill`, `~/.local/share/opencode/skill` | historical locations collapse into one agent |
  | Qwen Code | `~/.qwen/skills` | |
  | iFlow CLI | `~/.iflow/skills` | |
  | Trae | `~/.trae/skills` | |
  | Gemini CLI / Cursor / Windsurf / Goose | `~/.gemini/skills`, `~/.cursor/skills`, `~/.windsurf/skills`, `~/.goose/skills` | |
  | Global store | `~/.agents/skills` | physical store of `npx skills add -g`, **not an agent**: shown only for skills no real agent directory covers (by physical path or name), so links are never double-counted |

- Header summary: how many agents and skills were found, how many cross-agent installs were merged, how many are not loaded yet.

**Cross-agent merge (no duplicates)**

- Merge key = the SKILL.md frontmatter `name` (falls back to the directory name). A skill installed on several agents renders **one card** with a badge per agent; expand it to see each install path and link it individually.
- Several directories of the same agent (OpenCode's historical locations, say) count a skill once; junctions/symlinks are resolved to physical paths first, so installs linking the same content never double-count.
- Source-storage directories never inflate the list: `~/.claude/skills-src` is not scanned at all, and `~/.agents/skills` only back-fills skills no agent covers.
- Filtering by an agent shows that agent's skills counted post-merge, not per-install.

**Load reminders and one-click loading**

- Skills missing from the DSH library carry a "Not loaded" badge; "Load all unloaded (N)" batch-loads whatever the current filter shows.
- Two load modes per skill:
  - **Load (link)** (recommended; junction on Windows): `~/.dsh/skills/<name>` points at the source — one copy on both sides, edits sync; deleting removes only the link.
  - **Load (copy)**: an independent clone; a missing frontmatter gets a synthesized `name` / `description`.
- The global library is the official skill-filesystem user root, so loaded skills appear in the "/" menu immediately — no restart.

**Global library management (carried over from dsh-skill-manager, enhanced)**

- Same-prefix families collapse into one group card (e.g. `dbs` + `dbs-benchmark`…) with a "Load group" action.
- Edit SKILL.md (linked skills save straight to the source), two-step delete, broken-link cleanup, inline creation.
- Searching auto-expands matching groups and hides non-matching members.

Verified on the author's machine: 5 agents, 242 installs → 123 merged cards, with the whole `dbs` family deduplicated across 4 agents; the `~/.agents` store disappears when fully covered by real agents, and uninstalled skills parked in `skills-src` never show up.

## Install

Prerequisite: DSH initialized (`npm i -g @deepseek-ai/dsh`, then run `dsh web` or the desktop app once so `$DSH_HOME` exists).

1. Clone the repo somewhere DSH can reach (here: a workspace `local-plugins/`):

   ```bash
   git clone https://github.com/hskelp9527-pixel/dsh-skill-hub.git
   ```

2. Junction (Windows) or symlink (macOS/Linux) it into `$DSH_HOME/profiles/node_modules/`:

   ```powershell
   # Windows PowerShell
   cmd /c mklink /J "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-skill-hub" "<repo-path>\dsh-skill-hub"
   ```

   ```bash
   # macOS / Linux
   ln -s "<repo-path>/dsh-skill-hub" ~/.dsh/profiles/node_modules/dsh-skill-hub
   ```

3. Edit `$DSH_HOME/profiles/web/cordis.patch.yml` and insert the loader line (if you previously installed `@dsh-local/dsh-skill-manager`, remove its insert block — both plugins register the same "Skills" section and would collide):

   ```yaml
   - insert:
       - id: skill-hub
         name: 'dsh-skill-hub'
   ```

4. Restart `dsh web` (or the desktop app) → Settings → Skills → Discover.

> Uninstall: remove the patch line and the junction; skills already loaded into `~/.dsh/skills` stay untouched and can be deleted from the page.

## Usage

1. Open **Settings → Skills → Discover**: the scan summary is right at the top.
2. Click an agent chip (Claude Code / Codex / Qwen Code / …) to filter to that agent's skills.
3. Press **Load (link)** on the skills you want, or **Load all unloaded** in bulk; same-prefix groups offer **Load group**.
4. Invoke loaded skills from the "/" menu; maintain them later in the **Global library** view.

## How it works

- **Host side** (`lib/index.js`): a UI-free `SkillHubCore` (scan / merge / load, every root injectable for tests) wrapped in a thin `TypertRemoteService` exposed via `skillHub/*` Remote methods.
- **Client side** (`lib/client.js`): registers the `settings.section` (id `skills`) settings page with zh/en dictionaries; theming uses DSW alias variables.
- **State**: `~/.dsh/skills/.skill-manager.json` records `{mode, sourceId, sourcePath, addedAt}` per loaded skill (compatible with the old dsh-skill-manager records).
- The plugin only scans, merges and loads — it **never copies or redistributes third-party skill content**; skills stay under their own repos and licenses.

## Development & testing

```bash
git clone https://github.com/hskelp9527-pixel/dsh-skill-hub.git
cd dsh-skill-hub

# Host smoke test:
#   Phase A sandbox: fake multi-agent dirs → discovery / cross-agent merge / link & copy
#                    load / batch load / duplicate rejection / removal semantics
#   Phase B real machine: read-only scan, prints per-agent and merge stats
#   Phase C real machine: loads one real skill as a link, verifies, removes it
node scripts/smoke-test.mjs            # add --skip-real for sandbox only

# Client smoke test: fake __ModuleLoader__ load, ctx wiring, zh/en key coverage, SSR render
node scripts/client-smoke-test.mjs
```

Neither test needs a running DSH, and neither pollutes the real library (Phase C restores it).

## Contributing

- Open an [Issue](https://github.com/hskelp9527-pixel/dsh-skill-hub/issues) for bugs and ideas; include the agent name, skill directory path, and expected behavior.
- PRs welcome: fork → branch (`feat/xxx`, `fix/xxx`) → change → keep tests green (`node scripts/smoke-test.mjs && node scripts/client-smoke-test.mjs`) → submit.
- Use Conventional Commits (`feat:` / `fix:` / `docs:` / `chore:`).
- Adding an agent: append a directory candidate in `AGENT_DEFINITIONS`, a README table row, and a sandbox-test assertion.

## License

[MIT](LICENSE) © hskelp9527-pixel

## Acknowledgements

- [dontbesilent2025/dbskill](https://github.com/dontbesilent2025/dbskill) and [tw93/Kami](https://github.com/tw93/Kami) — reference multi-agent skill ecosystems
- [skills](https://github.com/vercel-labs/skills) (`npx skills add`) — the de-facto cross-agent skill installer
- [CocoSgt/dsh-skills](https://github.com/CocoSgt/dsh-skills) and [dsh-plugin-market](https://github.com/hskelp9527-pixel/dsh-plugin-market) — prior DSH plugin explorations
