// Smoke test for dsh-skill-hub host side.
//
// Phase A (sandbox): a fake OS home with skills spread over several agent
//   directories verifies discovery, cross-agent merge, link/copy import,
//   batch load, duplicate rejection, and removal semantics — end to end,
//   against a throwaway DSH home.
// Phase B (real machine, read-only): runs the exact production code paths
//   against the real user home and prints the discovery summary.
// Phase C (real machine, round-trip): loads one small real skill into the
//   real ~/.dsh/skills as a link, verifies it, then removes it — proving
//   the real scan+import path without leaving anything behind.
//
// Usage: node scripts/smoke-test.mjs [--skip-real]

import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile, lstat, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { SkillHubCore } from "../lib/index.js";

const skipReal = process.argv.includes("--skip-real");
let passed = 0;
const ok = (label) => { passed += 1; console.log(`  ✓ ${label}`); };
const section = (label) => console.log(`\n== ${label} ==`);

async function makeSkill(root, name, extra = "") {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: sandbox skill ${name}\n---\n\n# ${name}\n\nsandbox body\n${extra}`,
    "utf8");
  return dir;
}

// ── Phase A: sandbox end-to-end ─────────────────────────────────────────────
section("Phase A: sandbox scan / merge / import");

const sandbox = await mkdtemp(join(tmpdir(), "dsh-skill-hub-test-"));
const fakeHome = join(sandbox, "home"); // DSH home (library root = home/skills)
const fakeAgents = join(sandbox, "agents"); // fake OS home with agent dirs

const claudeDir = join(fakeAgents, ".claude", "skills");
const qwenDir = join(fakeAgents, ".qwen", "skills");
const iflowDir = join(fakeAgents, ".iflow", "skills");
const codexDir = join(fakeAgents, ".codex", "skills");
const traeDir = join(fakeAgents, ".trae", "skills");

await makeSkill(claudeDir, "dbs"); // same skill on 3 agents → must merge
await makeSkill(claudeDir, "dbs-goal");
await makeSkill(claudeDir, "solo");
await makeSkill(qwenDir, "dbs");
await makeSkill(qwenDir, "other");
await makeSkill(iflowDir, "dbs");
await makeSkill(codexDir, "codex-only");
await mkdir(join(traeDir, ".hidden"), { recursive: true }); // dot dir → ignored
await writeFile(join(traeDir, ".hidden", "SKILL.md"), "---\nname: hidden\n---\n", "utf8");
await mkdir(join(traeDir, "no-skill-md"), { recursive: true }); // no SKILL.md → ignored
// .gemini/skills intentionally absent → agent must not appear

const core = new SkillHubCore({ homePath: fakeHome, agentHome: fakeAgents });

{
  const state = await core.getState();
  const agentIds = state.agents.map((agent) => agent.id).sort();
  assert.deepEqual(agentIds, ["claude", "codex", "iflow", "qwen"], `agents discovered: ${agentIds}`);
  assert.ok(!agentIds.includes("gemini"), "absent agent directories must not be reported");
  ok(`discovered agents: ${agentIds.join(", ")}`);

  const entries = state.catalog.entries;
  assert.equal(state.catalog.installCount, 7, "install count");
  assert.equal(entries.length, 5, `merged entries: ${entries.length}`);
  assert.equal(state.catalog.mergedCount, 2, "merged duplicates");
  assert.equal(state.catalog.unloadedCount, 5, "unloaded count on empty library");
  ok(`catalog: 7 installs → 5 entries (2 duplicate installs merged)`);

  const dbs = entries.find((entry) => entry.name === "dbs");
  assert.ok(dbs, "dbs entry exists");
  assert.equal(dbs.installs.length, 3, "dbs installs");
  assert.deepEqual([...dbs.agents].sort(), ["claude", "iflow", "qwen"], "dbs agents");
  ok("dbs shows ONE card with 3 installs (claude + qwen + iflow)");

  const claudeAgent = state.agents.find((agent) => agent.id === "claude");
  assert.equal(claudeAgent.entryCount, 3, "claude entry count");
  const qwenAgent = state.agents.find((agent) => agent.id === "qwen");
  assert.equal(qwenAgent.entryCount, 2, "qwen entry count");
  ok("per-agent filter counts are merge-aware");
}

{
  // Link import of the merged dbs skill from the claude source.
  const state = await core.getState();
  const claudeSource = state.sources.find((source) => source.agentId === "claude");
  const res = await core.importSkill({ sourceId: claudeSource.id, dirName: "dbs", mode: "link" });
  assert.equal(res.ok, true);
  const libEntry = join(fakeHome, "skills", "dbs");
  const stats = await lstat(libEntry);
  assert.ok(stats.isSymbolicLink(), "library entry is a link");
  const resolved = await realpath(libEntry);
  assert.equal(resolved, join(claudeDir, "dbs"), "link resolves to the source");
  ok("link import creates junction/symlink pointing at the source");

  const after = await core.getState();
  assert.equal(after.library.length, 1);
  const dbsAfter = after.catalog.entries.find((entry) => entry.name === "dbs");
  assert.equal(dbsAfter.inLibrary, true, "catalog marks dbs loaded");
  assert.equal(after.catalog.unloadedCount, 4);
  ok("catalog + unloaded counters update after load");
}

{
  // Copy import synthesizes nothing here (frontmatter present) and copies files.
  const state = await core.getState();
  const qwenSource = state.sources.find((source) => source.agentId === "qwen");
  const res = await core.importSkill({ sourceId: qwenSource.id, dirName: "other", mode: "copy" });
  assert.equal(res.ok, true);
  const stats = await lstat(join(fakeHome, "skills", "other"));
  assert.ok(stats.isDirectory(), "copy import is a real directory");
  const raw = await readFile(join(fakeHome, "skills", "other", "SKILL.md"), "utf8");
  assert.ok(raw.includes("name: other"));
  const stateFile = JSON.parse(await readFile(join(fakeHome, "skills", ".skill-manager.json"), "utf8"));
  assert.equal(stateFile.skills.other.mode, "copy");
  ok("copy import creates an independent directory and records state");
}

{
  // Duplicate import must fail cleanly instead of clobbering.
  const state = await core.getState();
  const claudeSource = state.sources.find((source) => source.agentId === "claude");
  await assert.rejects(
    () => core.importSkill({ sourceId: claudeSource.id, dirName: "dbs", mode: "link" }),
    /已存在/,
  );
  ok("importing an already-loaded skill fails with a clear error");
}

{
  // Agent-scoped batch load: everything not yet loaded, preferring qwen.
  const res = await core.importUnloaded({ mode: "link", agentId: "qwen" });
  assert.equal(res.ok, true);
  assert.equal(res.imported, 0, `qwen has nothing unloaded left (got ${res.imported})`);
  ok("agent-scoped batch load skips skills the agent does not have");

  const resAll = await core.importUnloaded({ mode: "link" });
  assert.equal(resAll.imported, 3, `unscoped batch loads remaining skills (got ${resAll.imported})`);
  const after = await core.getState();
  assert.equal(after.catalog.unloadedCount, 0, "everything loaded");
  assert.equal(after.library.length, 5);
  ok("batch load fills the library to 5/5 with zero unloaded left");
}

{
  // Removing a linked skill must not touch the source directory.
  const res = await core.removeSkill({ dirName: "dbs" });
  assert.equal(res.ok, true);
  await assert.rejects(() => lstat(join(fakeHome, "skills", "dbs")));
  const sourceRaw = await readFile(join(claudeDir, "dbs", "SKILL.md"), "utf8");
  assert.ok(sourceRaw.includes("name: dbs"), "source untouched after link removal");
  const stateFile = JSON.parse(await readFile(join(fakeHome, "skills", ".skill-manager.json"), "utf8"));
  assert.equal(stateFile.skills.dbs, undefined, "state entry cleaned");
  ok("removing a link deletes only the link and cleans state");
}

{
  // Create / read / save round-trip on the library itself.
  await core.createSkill({ name: "my-skill", description: "created in sandbox" });
  const read = await core.readSkill({ dirName: "my-skill" });
  assert.ok(read.content.includes("name: my-skill"));
  await core.saveSkill({ dirName: "my-skill", content: read.content.replace("sandbox", "edited") });
  const reloaded = await core.readSkill({ dirName: "my-skill" });
  assert.ok(reloaded.content.includes("edited"));
  ok("create / read / save round-trip works");
}

await rm(sandbox, { recursive: true, force: true });
ok("sandbox cleaned up");

// ── Phase B: real machine, read-only discovery ──────────────────────────────
if (!skipReal) {
  section("Phase B: real machine discovery (read-only)");
  const real = new SkillHubCore();
  const state = await real.getState();
  assert.ok(state.agents.length >= 2, `agents discovered on this machine: ${state.agents.length}`);
  assert.ok(state.catalog.entries.length > 20, `catalog entries: ${state.catalog.entries.length}`);
  for (const agent of state.agents) {
    console.log(`  · ${agent.label.padEnd(24)} skills=${String(agent.count).padStart(3)}  mergedEntries=${agent.entryCount}`);
  }
  console.log(`  → ${state.agents.length} agents, ${state.catalog.installCount} installs, ${state.catalog.entries.length} unique skills, ${state.catalog.mergedCount} duplicate installs merged, ${state.catalog.unloadedCount} not loaded`);
  const multi = state.catalog.entries.filter((entry) => entry.installs.length >= 3).slice(0, 5);
  for (const entry of multi) {
    console.log(`  · merged: ${entry.name} ← ${entry.installs.map((install) => install.agentId).join(", ")}`);
  }
  assert.ok(state.catalog.mergedCount > 0, "real machine has cross-agent duplicates to merge");
  ok("real-machine scan sees every installed agent and merges duplicates");
}

// ── Phase C: real machine, single import round-trip ─────────────────────────
if (!skipReal) {
  section("Phase C: real machine import round-trip");
  const real = new SkillHubCore();
  const before = await real.getState();
  const candidate = before.catalog.entries
    .filter((entry) => !entry.inLibrary && entry.installs[0] !== undefined)
    .sort((a, b) => (a.resourceCount ?? 0) - (b.resourceCount ?? 0))[0];
  if (candidate === undefined) {
    console.log("  (library already has everything — skipping round-trip)");
  } else {
    const install = candidate.installs[0];
    const res = await real.importSkill({ sourceId: install.sourceId, dirName: install.dirName, mode: "link" });
    assert.equal(res.ok, true);
    const libPath = join(before.libraryRoot, install.dirName);
    const resolved = await realpath(libPath);
    assert.equal(resolved, await realpath(install.path), "loaded skill resolves to its source");
    const mid = await real.getState();
    const entry = mid.catalog.entries.find((item) => item.name === candidate.name);
    assert.equal(entry.inLibrary, true);
    ok(`loaded real skill "${install.dirName}" from ${install.agentId} and verified it`);
    const removed = await real.removeSkill({ dirName: install.dirName });
    assert.equal(removed.ok, true);
    await assert.rejects(() => stat(libPath), null, "library entry gone after removal");
    const sourceStats = await stat(install.path);
    assert.ok(sourceStats.isDirectory(), "source directory untouched");
    ok("round-trip clean: link removed, agent source untouched");
  }
}

console.log(`\n${passed} checks passed.`);
