// dsh-skill-hub — host side.
//
// A dual-face DSH Web plugin that upgrades the Settings > "技能" section
// into a cross-agent skill hub:
//
//   - Dynamically discovers every local coding agent's skill directory
//     (Claude Code, Codex, OpenCode, Qwen Code, iFlow, Trae, Gemini,
//     Cursor, Windsurf, Goose, the universal ~/.agents/skills …) — only
//     directories that actually exist are reported, so the agent filter
//     list always mirrors what is installed on this machine.
//   - Builds one merged catalog entry per skill: the same skill installed
//     on several agents (e.g. dbs on Claude Code + Qwen + iFlow + Trae)
//     shows up once, with one install row per agent.
//   - Loads skills into the global DSH library (~/.dsh/skills) as a link
//     (junction/symlink — edits sync both ways) or as a full copy; the
//     library root is the official skill-filesystem user root, so loaded
//     skills appear in the "/" menu immediately.
//   - Keeps the previous manager surface: list / edit SKILL.md / create /
//     remove, with same-prefix family grouping in both views.
//
// The testable core (SkillHubCore) takes injected roots; the TypertRemote
// Service is a thin wrapper so the smoke test can exercise the exact same
// logic the Web client calls.

import { cp, lstat, mkdir, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { parse as parseYaml } from "yaml";

const IS_WINDOWS = process.platform === "win32";
const STATE_FILENAME = ".skill-manager.json";
const RESOURCE_COUNT_LIMIT = 500;

/**
 * Agent → candidate skill roots, relative to the OS home directory. A source
 * is only reported when its directory exists, so the agent filter chips in
 * the UI are derived from what is actually installed locally. OpenCode keeps
 * several historical locations; all found locations become sources of the
 * same "opencode" agent.
 *
 * `store: true` marks a shared backing store, not an agent: `npx skills add
 * -g` parks the real directories in ~/.agents/skills and links them into
 * each agent directory. A store is scanned last and only contributes skills
 * that no real agent directory covers (by physical path or by merge key),
 * so a linked skill is never double-counted as installed on the store.
 *
 * ~/.claude/skills-src is deliberately NOT a source: it is source storage
 * for symlinks, not an installed location.
 */
export const AGENT_DEFINITIONS = [
  { id: "claude", label: "Claude Code", dirs: [join(".claude", "skills")] },
  { id: "codex", label: "Codex", dirs: [join(".codex", "skills")] },
  {
    id: "opencode",
    label: "OpenCode",
    dirs: [
      join(".config", "opencode", "skill"),
      join(".config", "opencode", "agent"),
      join(".opencode", "skill"),
      join(".local", "share", "opencode", "skill"),
    ],
  },
  { id: "qwen", label: "Qwen Code", dirs: [join(".qwen", "skills")] },
  { id: "iflow", label: "iFlow CLI", dirs: [join(".iflow", "skills")] },
  { id: "trae", label: "Trae", dirs: [join(".trae", "skills")] },
  { id: "gemini", label: "Gemini CLI", dirs: [join(".gemini", "skills")] },
  { id: "cursor", label: "Cursor", dirs: [join(".cursor", "skills")] },
  { id: "windsurf", label: "Windsurf", dirs: [join(".windsurf", "skills")] },
  { id: "goose", label: "Goose", dirs: [join(".goose", "skills")] },
  { id: "agents", label: "全局存储（~/.agents）", dirs: [join(".agents", "skills")], store: true },
];

function fail(message) {
  throw new Error(message);
}

/** Existing sources under a home directory; missing roots are skipped. */
export async function discoverSources(homeDir) {
  const sources = [];
  for (const agent of AGENT_DEFINITIONS) {
    for (let index = 0; index < agent.dirs.length; index += 1) {
      const path = join(homeDir, agent.dirs[index]);
      let entries;
      try {
        entries = await readdir(path, { withFileTypes: true });
      } catch {
        continue; // agent not installed (or unreadable) — not a source
      }
      // Only advertise directories that contain at least one skill bundle;
      // an existing-but-empty root would add a useless filter chip.
      const hasSkillDir = entries.some((entry) => !entry.name.startsWith(".") && (entry.isDirectory() || entry.isSymbolicLink()));
      if (!hasSkillDir) continue;
      const sourceId = agent.dirs.length === 1 ? agent.id : `${agent.id}#${index + 1}`;
      sources.push({
        id: sourceId,
        agentId: agent.id,
        agentLabel: agent.label,
        label: agent.label,
        store: agent.store === true,
        path,
      });
    }
  }
  return sources;
}

/**
 * Parse the YAML frontmatter of a SKILL.md. Returns null when the file has
 * no usable frontmatter (name + description).
 */
function parseSkillDoc(raw) {
  const firstLineEnd = raw.indexOf("\n");
  if (firstLineEnd < 0) return null;
  if (raw.slice(0, firstLineEnd).replace(/\r$/, "") !== "---") return null;
  const start = firstLineEnd + 1;
  const closing = raw.indexOf("\n---", start);
  if (closing < 0) return null;
  // Normalize CRLF before parsing: a trailing CR breaks the YAML parser.
  const frontmatter = raw.slice(start, closing).replace(/\r\n/g, "\n").replace(/\r$/, "");
  let data;
  try {
    data = parseYaml(frontmatter);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (name === "" || description === "") return null;
  return {
    name,
    description,
    whenToUse: typeof data.whenToUse === "string" ? data.whenToUse.trim() : "",
  };
}

/** Single-line, length-capped plain-text summary used to synthesize frontmatter. */
function summarizeBody(raw) {
  let body = raw;
  const firstLineEnd = raw.indexOf("\n");
  if (firstLineEnd > 0 && raw.slice(0, firstLineEnd).replace(/\r$/, "") === "---") {
    const closing = raw.indexOf("\n---", firstLineEnd + 1);
    if (closing >= 0) body = raw.slice(closing + 1);
  }
  const lines = body.split(/\r?\n/).map((line) => line.trim());
  for (const line of lines) {
    if (line === "" || line === "---" || line.startsWith("#")) continue;
    if (/^[A-Za-z0-9_-]{1,64}:\s/.test(line)) continue;
    const clean = line.replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim();
    if (clean === "") continue;
    return clean.length > 160 ? `${clean.slice(0, 157)}…` : clean;
  }
  return "（无描述：请在 SKILL.md 中补充 name / description）";
}

function yamlQuote(value) {
  const text = String(value).replace(/\r?\n/g, " ").trim();
  if (/^[A-Za-z0-9_@/:\-.（）()\u4e00-\u9fa5，、；：“”‘’ ？?！!，。]+$/.test(text) && !text.includes(": ")) return text;
  return JSON.stringify(text);
}

/** SKILL.md content with a synthesized frontmatter when the source lacks one. */
function ensureFrontmatter(dirName, raw) {
  if (parseSkillDoc(raw) !== null) return raw;
  const summary = summarizeBody(raw);
  return `---\nname: ${yamlQuote(dirName)}\ndescription: ${yamlQuote(summary)}\n---\n\n${raw}`;
}

async function readSkillDoc(skillDirPath) {
  let raw;
  try {
    raw = await readFile(join(skillDirPath, "SKILL.md"), "utf8");
  } catch {
    return { hasSkillMd: false };
  }
  const parsed = parseSkillDoc(raw);
  return {
    hasSkillMd: true,
    frontmatterOk: parsed !== null,
    ...(parsed === null ? {} : {
      name: parsed.name,
      description: parsed.description,
      whenToUse: parsed.whenToUse,
    }),
  };
}

async function countResources(skillDirPath) {
  let count = 0;
  const walk = async (dir, depth) => {
    if (count >= RESOURCE_COUNT_LIMIT || depth > 6) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (count >= RESOURCE_COUNT_LIMIT) return;
      if (entry.name === "SKILL.md" && depth === 0) continue;
      count += 1;
      if (entry.isDirectory()) await walk(join(dir, entry.name), depth + 1);
    }
  };
  await walk(skillDirPath, 0);
  return count;
}

/** Directory entries of a skill root that look like skill bundles. */
async function listSkillDirs(rootPath) {
  let entries;
  try {
    entries = await readdir(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    dirs.push(join(rootPath, entry.name));
  }
  return dirs;
}

/** Merge key of a skill: frontmatter name when present, else the dir name. */
function mergeKey(doc, dirName) {
  const raw = typeof doc.name === "string" && doc.name.trim() !== "" ? doc.name : dirName;
  return raw.trim().toLocaleLowerCase();
}

/**
 * Testable core. `homePath` is the DSH home (library = homePath/skills);
 * `agentHome` overrides the directory scanned for agent skill roots — the
 * production wrapper passes the real OS home, tests pass a sandbox.
 */
export class SkillHubCore {
  constructor({ homePath, agentHome } = {}) {
    this.homePath = homePath ?? resolveDshHome();
    this.agentHome = agentHome ?? homedir();
  }

  libraryRootPath() {
    return join(this.homePath, "skills");
  }

  statePath() {
    return join(this.libraryRootPath(), STATE_FILENAME);
  }

  async readState() {
    try {
      const raw = await readFile(this.statePath(), "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && typeof parsed.skills === "object") {
        return parsed;
      }
    } catch {
      // missing or corrupt state — rebuild
    }
    return { version: 1, skills: {} };
  }

  async writeState(state) {
    await mkdir(this.libraryRootPath(), { recursive: true });
    await writeFile(this.statePath(), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  }

  async scanLibrary(state) {
    const root = this.libraryRootPath();
    const skills = [];
    for (const dirPath of await listSkillDirs(root)) {
      const dirName = basename(dirPath);
      let stats;
      try {
        stats = await lstat(dirPath);
      } catch {
        continue;
      }
      const isLink = stats.isSymbolicLink();
      let sourcePath = "";
      let broken = false;
      if (isLink) {
        try {
          sourcePath = await realpath(dirPath);
          await lstat(sourcePath);
        } catch {
          broken = true;
        }
      }
      const recorded = state.skills[dirName];
      let mode = "local";
      if (isLink) mode = "link";
      else if (recorded?.mode === "copy") mode = "copy";
      const doc = await readSkillDoc(dirPath);
      skills.push({
        dirName,
        path: dirPath,
        mode,
        broken,
        sourceId: recorded?.sourceId ?? "",
        sourcePath: broken ? (recorded?.sourcePath ?? "") : (sourcePath || recorded?.sourcePath || ""),
        addedAt: recorded?.addedAt ?? null,
        resourceCount: broken ? 0 : await countResources(dirPath),
        ...doc,
        name: doc.name ?? dirName,
        description: doc.description ?? "",
        whenToUse: doc.whenToUse ?? "",
      });
    }
    return skills;
  }

  async scanSource(source, libraryDirNames) {
    const skills = [];
    for (const dirPath of await listSkillDirs(source.path)) {
      const dirName = basename(dirPath);
      const doc = await readSkillDoc(dirPath);
      if (!doc.hasSkillMd) continue;
      // Canonical physical path (junctions/symlinks resolved) so the same
      // content linked from several agent directories can be recognized.
      let realPath = dirPath;
      try {
        realPath = await realpath(dirPath);
      } catch {
        // unreadable link chain — fall back to the literal path
      }
      skills.push({
        sourceId: source.id,
        agentId: source.agentId,
        agentLabel: source.agentLabel,
        dirName,
        path: dirPath,
        realPath,
        inLibrary: libraryDirNames.has(dirName),
        resourceCount: await countResources(dirPath),
        ...doc,
        name: doc.name ?? dirName,
        description: doc.description ?? "",
        whenToUse: doc.whenToUse ?? "",
      });
    }
    return skills;
  }

  /**
   * Claim-based dedup across sources, run before the catalog is built:
   *
   *   - Real agent sources are processed first (in discovery order). Within
   *     one agent, the same skill (merge key) or the same physical directory
   *     reached through two of the agent's directories is claimed once.
   *   - Store sources (`store: true`, e.g. ~/.agents/skills — the backing
   *     store `npx skills add -g` links from) only contribute skills that no
   *     real agent covers, neither by physical path nor by merge key. A
   *     skill that is only parked in a store, reachable from no agent, still
   *     shows up under the store so it can be loaded.
   */
  static dedupeSourceSkills(sources) {
    const agentFirst = [...sources].sort((a, b) => Number(a.store) - Number(b.store));
    const claimedKeys = new Set();
    const claimedRealPaths = new Set();
    for (const source of agentFirst) {
      const perAgentKeys = new Set();
      const kept = [];
      for (const skill of source.skills) {
        const key = mergeKey(skill, skill.dirName);
        if (source.store) {
          // Store: skip anything a real agent already covers.
          if (claimedRealPaths.has(skill.realPath) || claimedKeys.has(key)) continue;
        } else {
          // Agent: one install per skill per agent, first directory wins.
          if (perAgentKeys.has(key)) continue;
          perAgentKeys.add(key);
        }
        claimedKeys.add(key);
        claimedRealPaths.add(skill.realPath);
        kept.push(skill);
      }
      source.skills = kept;
      source.count = kept.length;
    }
    return sources.filter((source) => source.skills.length > 0);
  }

  /**
   * One catalog entry per skill across all agents: installs from different
   * agents that share a merge key (frontmatter name, else dir name) collapse
   * into a single entry with one install row per agent directory.
   */
  buildCatalog(sources) {
    const entries = new Map();
    let installCount = 0;
    for (const source of sources) {
      for (const skill of source.skills) {
        const key = mergeKey(skill, skill.dirName);
        let entry = entries.get(key);
        if (entry === undefined) {
          entry = {
            key,
            dirName: skill.dirName,
            name: skill.name,
            description: skill.description,
            whenToUse: skill.whenToUse,
            inLibrary: false,
            installs: [],
          };
          entries.set(key, entry);
        }
        entry.installs.push({
          sourceId: skill.sourceId,
          agentId: skill.agentId,
          agentLabel: skill.agentLabel,
          dirName: skill.dirName,
          path: skill.path,
          frontmatterOk: skill.frontmatterOk !== false,
          resourceCount: skill.resourceCount,
          inLibrary: skill.inLibrary,
        });
        if (skill.description !== "" && entry.description === "") entry.description = skill.description;
        if (skill.inLibrary) entry.inLibrary = true;
        installCount += 1;
      }
    }
    const list = [...entries.values()].map((entry) => ({
      ...entry,
      resourceCount: entry.installs.reduce((max, install) => Math.max(max, install.resourceCount ?? 0), 0),
      agents: [...new Set(entry.installs.map((install) => install.agentId))],
    }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return { entries: list, installCount, mergedCount: installCount - list.length };
  }

  /** Discovered sources with scanned, deduplicated skill lists. */
  async scanSources(libraryDirNames = new Set()) {
    const discovered = await discoverSources(this.agentHome);
    const sources = [];
    for (const source of discovered) {
      const skills = await this.scanSource(source, libraryDirNames);
      if (skills.length === 0) continue;
      sources.push({ ...source, skills, count: skills.length });
    }
    return SkillHubCore.dedupeSourceSkills(sources);
  }

  async getState() {
    const state = await this.readState();
    const library = await this.scanLibrary(state);
    const libraryDirNames = new Set(library.map((skill) => skill.dirName));
    const sources = await this.scanSources(libraryDirNames);
    const catalog = this.buildCatalog(sources);
    const agents = [];
    for (const source of sources) {
      let agent = agents.find((item) => item.id === source.agentId);
      if (agent === undefined) {
        agent = { id: source.agentId, label: source.agentLabel, sourceIds: [], count: 0 };
        agents.push(agent);
      }
      agent.sourceIds.push(source.id);
      agent.count += source.count;
    }
    const perAgentEntries = new Map(agents.map((agent) => [agent.id, 0]));
    for (const entry of catalog.entries) {
      for (const agentId of entry.agents) perAgentEntries.set(agentId, (perAgentEntries.get(agentId) ?? 0) + 1);
    }
    for (const agent of agents) agent.entryCount = perAgentEntries.get(agent.id) ?? 0;
    agents.sort((a, b) => a.label.localeCompare(b.label));
    return {
      libraryRoot: this.libraryRootPath(),
      library,
      agents,
      sources,
      catalog: {
        ...catalog,
        unloadedCount: catalog.entries.filter((entry) => !entry.inLibrary).length,
      },
      scannedAt: new Date().toISOString(),
    };
  }

  async importSkill({ sourceId, dirName, mode } = {}) {
    const state = await this.getStateForImport();
    const source = state.sources.find((item) => item.id === sourceId);
    if (source === undefined) fail(`未知的技能来源：${sourceId}`);
    if (!validDirName(dirName)) fail(`无效的技能目录名：${dirName}`);
    const wanted = mode === "copy" ? "copy" : "link";
    const sourceDirPath = join(source.path, dirName);
    const doc = await readSkillDoc(sourceDirPath);
    if (!doc.hasSkillMd) fail(`来源目录中没有 SKILL.md：${sourceDirPath}`);

    await mkdir(this.libraryRootPath(), { recursive: true });
    const target = join(this.libraryRootPath(), dirName);
    let targetExists = false;
    try {
      await lstat(target);
      targetExists = true;
    } catch {
      // not present — good
    }
    if (targetExists) fail(`全局技能库中已存在同名技能「${dirName}」，请先删除再导入`);

    if (wanted === "link") {
      await symlink(sourceDirPath, target, IS_WINDOWS ? "junction" : "dir");
    } else {
      await cp(sourceDirPath, target, { recursive: true, force: true });
      if (doc.frontmatterOk === false) {
        const raw = await readFile(join(target, "SKILL.md"), "utf8");
        await writeFile(join(target, "SKILL.md"), ensureFrontmatter(dirName, raw), "utf8");
      }
    }

    const next = await this.readState();
    next.skills[dirName] = {
      mode: wanted,
      sourceId: source.id,
      sourcePath: sourceDirPath,
      addedAt: new Date().toISOString(),
    };
    await this.writeState(next);
    return { ok: true, dirName, mode: wanted, synthesized: wanted === "copy" && doc.frontmatterOk === false };
  }

  /** Source list with fresh library membership (used by import paths). */
  async getStateForImport() {
    const state = await this.readState();
    const library = await this.scanLibrary(state);
    const libraryDirNames = new Set(library.map((skill) => skill.dirName));
    return { sources: await this.scanSources(libraryDirNames) };
  }

  async importAll({ sourceId, mode, dirNames } = {}) {
    const { sources } = await this.getStateForImport();
    const source = sources.find((item) => item.id === sourceId);
    if (source === undefined) fail(`未知的技能来源：${sourceId}`);
    const wanted = Array.isArray(dirNames)
      ? new Set(dirNames.map((name) => String(name)))
      : null;
    const results = [];
    let okCount = 0;
    for (const skill of source.skills) {
      if (skill.inLibrary) continue;
      if (wanted !== null && !wanted.has(skill.dirName)) continue;
      try {
        await this.importSkill({ sourceId, dirName: skill.dirName, mode });
        okCount += 1;
        results.push({ dirName: skill.dirName, ok: true });
      } catch (error) {
        results.push({ dirName: skill.dirName, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { ok: true, sourceId, imported: okCount, results };
  }

  /**
   * Load every catalog entry that is not in the library yet. When `agentId`
   * is given, the install from that agent is preferred (entries the agent
   * does not have are skipped); otherwise the first install wins.
   */
  async importUnloaded({ mode, agentId } = {}) {
    const data = await this.getState();
    const results = [];
    let okCount = 0;
    for (const entry of data.catalog.entries) {
      if (entry.inLibrary) continue;
      const install = agentId === undefined || agentId === "" || agentId === null
        ? entry.installs[0]
        : (entry.installs.find((item) => item.agentId === agentId) ?? null);
      if (install === null) continue;
      try {
        await this.importSkill({ sourceId: install.sourceId, dirName: install.dirName, mode });
        okCount += 1;
        results.push({ dirName: install.dirName, ok: true });
      } catch (error) {
        results.push({ dirName: install.dirName, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { ok: true, imported: okCount, results };
  }

  async removeSkill({ dirName } = {}) {
    if (!validDirName(dirName)) fail(`无效的技能目录名：${dirName}`);
    const target = join(this.libraryRootPath(), dirName);
    let stats;
    try {
      stats = await lstat(target);
    } catch {
      fail(`全局技能库中没有这个技能：${dirName}`);
    }
    if (!stats.isSymbolicLink() && !stats.isDirectory()) fail("只能删除目录形式的技能");
    // A symlink/junction removes only the link itself; a real directory
    // removes the tree — both stay inside the library root by construction.
    await rm(target, { recursive: true, force: true });
    const state = await this.readState();
    if (state.skills[dirName] !== undefined) {
      delete state.skills[dirName];
      await this.writeState(state);
    }
    return { ok: true, dirName };
  }

  async readSkill({ dirName } = {}) {
    if (!validDirName(dirName)) fail(`无效的技能目录名：${dirName}`);
    const skillDir = join(this.libraryRootPath(), dirName);
    const content = await readFile(join(skillDir, "SKILL.md"), "utf8");
    return { dirName, content };
  }

  async saveSkill({ dirName, content } = {}) {
    if (!validDirName(dirName)) fail(`无效的技能目录名：${dirName}`);
    if (typeof content !== "string" || content.trim() === "") fail("SKILL.md 内容不能为空");
    const skillDir = join(this.libraryRootPath(), dirName);
    await lstat(skillDir);
    // For linked skills this writes straight through to the source directory.
    await writeFile(join(skillDir, "SKILL.md"), content, "utf8");
    return { ok: true, dirName };
  }

  async createSkill({ name, description } = {}) {
    const skillName = String(name ?? "").trim();
    const desc = String(description ?? "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_\-]{0,63}$/.test(skillName)) {
      fail("技能名需以字母或数字开头，仅含字母、数字、下划线和连字符（≤64 字符）");
    }
    if (desc === "") fail("请填写技能描述（description）");
    await mkdir(this.libraryRootPath(), { recursive: true });
    const target = join(this.libraryRootPath(), skillName);
    let targetExists = false;
    try {
      await lstat(target);
      targetExists = true;
    } catch {
      // not present — good
    }
    if (targetExists) fail(`全局技能库中已存在同名技能「${skillName}」`);
    await mkdir(target);
    await writeFile(
      join(target, "SKILL.md"),
      `---\nname: ${yamlQuote(skillName)}\ndescription: ${yamlQuote(desc)}\n---\n\n# ${skillName}\n\n在这里编写技能指令。\n`,
      "utf8",
    );
    const state = await this.readState();
    state.skills[skillName] = { mode: "local", sourceId: "", sourcePath: "", addedAt: new Date().toISOString() };
    await this.writeState(state);
    return { ok: true, dirName: skillName };
  }
}

function validDirName(dirName) {
  return typeof dirName === "string" && /^[^\\/:\*?"<>|]{1,80}$/.test(dirName.trim()) && !dirName.trim().startsWith(".");
}

function markRemote(prototype, method) {
  Remote(method)(void 0, {
    private: false,
    static: false,
    name: method,
    addInitializer(init) {
      init.call(Object.create(prototype));
    },
  });
}

class SkillHubService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "skillHub");
    this.core = new SkillHubCore({ homePath: resolveDshHome() });
  }

  getState() { return this.core.getState(); }
  importSkill(args) { return this.core.importSkill(args); }
  importAll(args) { return this.core.importAll(args); }
  importUnloaded(args) { return this.core.importUnloaded(args); }
  removeSkill(args) { return this.core.removeSkill(args); }
  readSkill(args) { return this.core.readSkill(args); }
  saveSkill(args) { return this.core.saveSkill(args); }
  createSkill(args) { return this.core.createSkill(args); }
}

markRemote(SkillHubService.prototype, "getState");
markRemote(SkillHubService.prototype, "importSkill");
markRemote(SkillHubService.prototype, "importAll");
markRemote(SkillHubService.prototype, "importUnloaded");
markRemote(SkillHubService.prototype, "removeSkill");
markRemote(SkillHubService.prototype, "readSkill");
markRemote(SkillHubService.prototype, "saveSkill");
markRemote(SkillHubService.prototype, "createSkill");

export default SkillHubService;
export { SkillHubService };
