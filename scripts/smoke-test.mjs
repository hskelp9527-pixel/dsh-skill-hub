// Smoke test for dsh-skill-hub host side.
//
// Phase 0 (gateway parity): replays the Typert gateway's parameter parsing
//   against SkillHubService method sources and checks every client
//   remote(...) call site sends only declared fields — the regression guard
//   for "args fields do not match the descriptor" errors.
// Phase A (sandbox): a fake OS home mirrors a real multi-agent layout —
//   ~/.agents/skills as the physical store that agent directories link into,
//   a skills-src folder that must NOT count as installed, the same skill on
//   several agents — and verifies discovery, store/agent dedup, cross-agent
//   merge, link/copy import, batch load, duplicate rejection, and removal
//   semantics end to end against a throwaway DSH home.
// Phase B (real machine, read-only): runs the exact production code paths
//   against the real user home and prints the discovery summary, asserting
//   the dedup invariants (no skills-src source, no same-agent duplicates,
//   store only contributes uncovered skills).
// Phase C (real machine, round-trip): loads one small real skill into the
//   real ~/.dsh/skills as a link, verifies it, then removes it — proving
//   the real scan+import path without leaving anything behind.
//
// Usage: node scripts/smoke-test.mjs [--skip-real]

import { mkdtemp, mkdir, readFile, rm, stat, writeFile, lstat, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { SkillHubCore, SkillHubService } from "../lib/index.js";

const skipReal = process.argv.includes("--skip-real");
let passed = 0;
const ok = (label) => { passed += 1; console.log(`  ✓ ${label}`); };
const section = (label) => console.log(`\n== ${label} ==`);

// ── Phase 0: typert gateway signature parity ────────────────────────────────
section("Phase 0: typert gateway signature parity");

const REMOTE_METHODS = ["getState", "importSkill", "importAll", "importUnloaded", "removeSkill", "readSkill", "saveSkill", "createSkill"];

function gatewayParameterNames(method) {
  const descriptor = Object.getOwnPropertyDescriptor(SkillHubService.prototype, method);
  assert.ok(descriptor !== undefined && typeof descriptor.value === "function", `${method} must live on SkillHubService.prototype`);
  const source = Function.prototype.toString.call(descriptor.value);
  const open = source.indexOf("(");
  const close = source.indexOf(")", open + 1);
  assert.ok(open >= 0 && close >= 0, `${method} needs a parenthesized parameter list`);
  const body = source.slice(open + 1, close).trim();
  if (body.length === 0) return [];
  const names = new Set();
  for (const part of body.split(",").map((piece) => piece.trim())) {
    assert.match(part, /^[$A-Z_a-z][$\w]*$/u, `${method}: parameter "${part}" must be a plain identifier (the gateway rejects destructuring, defaults, and rest)`);
    assert.ok(!names.has(part), `${method}: duplicate parameter ${part}`);
    names.add(part);
  }
  return [...names];
}

{
  const signatures = new Map(REMOTE_METHODS.map((method) => [method, gatewayParameterNames(method)]));
  assert.deepEqual(signatures.get("getState"), [], "getState takes no parameters");
  assert.deepEqual(signatures.get("importSkill"), ["sourceId", "dirName", "mode"], "importSkill wire fields");
  ok(`parsed ${REMOTE_METHODS.length} method signatures with plain identifier parameters`);

  const clientSource = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const callPattern = /\bremote\(\s*"([A-Za-z]+)"\s*,\s*\{([^}]*)\}/g;
  let callSites = 0;
  for (const match of clientSource.matchAll(callPattern)) {
    const method = match[1];
    const params = signatures.get(method);
    assert.ok(params !== undefined, `client calls unknown Remote method "${method}"`);
    const fields = match[2].split(",").map((piece) => piece.trim()).filter(Boolean).map((piece) => piece.split(":")[0].trim());
    for (const field of fields) {
      assert.ok(
        params.includes(field),
        `client sends "${field}" to ${method}(${params.join(", ") || "…"}) which does not declare it — the gateway would reject with arguments-invalid`,
      );
    }
    callSites += 1;
  }
  assert.ok(callSites >= 6, `expected at least 6 client remote(...) call sites, found ${callSites}`);
  ok(`all ${callSites} client remote(...) call sites send only declared fields`);
}

async function makeSkill(root, name, extra = "") {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: sandbox skill ${name}\n---\n\n# ${name}\n\nsandbox body\n${extra}`,
    "utf8");
  return dir;
}

/** Dir junction/symlink pointing at target (junction on Windows needs no privilege). */
async function linkSkill(root, name, target) {
  await mkdir(root, { recursive: true });
  const dir = join(root, name);
  await symlink(target, dir, process.platform === "win32" ? "junction" : "dir");
  return dir;
}

// ── Phase A: sandbox end-to-end ─────────────────────────────────────────────
section("Phase A: sandbox scan / dedup / merge / import");

const sandbox = await mkdtemp(join(tmpdir(), "dsh-skill-hub-test-"));
const fakeHome = join(sandbox, "home"); // DSH home (library root = home/skills)
const fakeAgents = join(sandbox, "agents"); // fake OS home with agent dirs

const claudeDir = join(fakeAgents, ".claude", "skills");
const skillsSrcDir = join(fakeAgents, ".claude", "skills-src"); // must be ignored
const qwenDir = join(fakeAgents, ".qwen", "skills");
const iflowDir = join(fakeAgents, ".iflow", "skills");
const codexDir = join(fakeAgents, ".codex", "skills");
const traeDir = join(fakeAgents, ".trae", "skills");
const storeDir = join(fakeAgents, ".agents", "skills"); // backing store

// Physical store: dbs (linked into 3 agents), kami (duplicate copy in claude),
// store-only (reachable from no agent → must stay visible under the store).
const storeDbs = await makeSkill(storeDir, "dbs");
await makeSkill(storeDir, "kami");
await makeSkill(storeDir, "store-only");

// Claude: junction to store + own real skills.
await linkSkill(claudeDir, "dbs", storeDbs);
await makeSkill(claudeDir, "dbs-goal");
await makeSkill(claudeDir, "solo");
await makeSkill(claudeDir, "kami"); // separate physical copy, same name
await makeSkill(claudeDir, "gbro"); // also parked in skills-src → src copy must be ignored
// Qwen / iFlow link the same physical dbs.
await linkSkill(qwenDir, "dbs", storeDbs);
await makeSkill(qwenDir, "other");
await linkSkill(iflowDir, "dbs", storeDbs);
await makeSkill(codexDir, "codex-only");
// skills-src: source storage, never an installed location.
await makeSkill(skillsSrcDir, "gbro");
await makeSkill(skillsSrcDir, "Eva-skill");
// Trae: only hidden dirs / no SKILL.md → must not become a source.
await mkdir(join(traeDir, ".hidden"), { recursive: true });
await writeFile(join(traeDir, ".hidden", "SKILL.md"), "---\nname: hidden\n---\n", "utf8");
await mkdir(join(traeDir, "no-skill-md"), { recursive: true });
// .gemini/skills intentionally absent → agent must not appear

const core = new SkillHubCore({ homePath: fakeHome, agentHome: fakeAgents });

{
  const state = await core.getState();

  // Source invariants: no numbered claude#2, no skills-src path anywhere.
  assert.ok(state.sources.every((source) => !source.id.includes("#")), `numbered source ids: ${state.sources.map((s) => s.id).join(",")}`);
  assert.ok(state.sources.every((source) => !source.path.includes("skills-src")), "skills-src must never be a source");
  ok("no claude#2 source and no skills-src source (source storage ≠ installed)");

  // Agent chips: 4 real agents + the store (it has one uncovered skill).
  const agentIds = state.agents.map((agent) => agent.id);
  for (const expected of ["claude", "codex", "iflow", "qwen", "agents"]) {
    assert.ok(agentIds.includes(expected), `agent chip missing: ${expected} (have ${agentIds.join(",")})`);
  }
  assert.ok(!agentIds.includes("trae"), "trae has no valid skills → no chip");
  assert.ok(!agentIds.includes("gemini"), "absent agent directories must not be reported");
  ok(`agent chips: ${agentIds.join(", ")} (trae/gemini correctly absent)`);

  // The store only contributes what no agent covers.
  const storeSource = state.sources.find((source) => source.store === true);
  assert.deepEqual(storeSource.skills.map((skill) => skill.dirName), ["store-only"], "store keeps only uncovered skills");
  ok("store (~/.agents) only lists skills no agent directory covers");

  // Catalog: no same-agent duplicates inside any entry.
  const entries = state.catalog.entries;
  for (const entry of entries) {
    const ids = entry.installs.map((install) => install.agentId);
    assert.deepEqual(ids, [...new Set(ids)], `duplicate agent in entry ${entry.name}`);
  }
  assert.ok(entries.every((entry) => entry.name !== "Eva-skill"), "skills-src-only skill must not appear");
  ok("no entry lists the same agent twice; skills-src-only skills never appear");

  const dbs = entries.find((entry) => entry.name === "dbs");
  assert.equal(dbs.installs.length, 3, "dbs installs");
  assert.deepEqual([...dbs.agents].sort(), ["claude", "iflow", "qwen"], "dbs agents");
  assert.equal(state.catalog.installCount, 10, `install count (${state.catalog.installCount})`);
  assert.equal(entries.length, 8, `entries (${entries.length})`);
  assert.equal(state.catalog.unloadedCount, 8, "unloaded count on empty library");
  ok("dbs = ONE card, 3 installs (claude+qwen+iflow), store copy not double-counted");

  const kami = entries.find((entry) => entry.name === "kami");
  assert.equal(kami.installs.length, 1, "kami installs");
  assert.equal(kami.installs[0].agentId, "claude", "kami attribution");
  ok("same-name copy parked in the store is dropped (claude already has kami)");

  const storeOnly = entries.find((entry) => entry.name === "store-only");
  assert.equal(storeOnly.installs.length, 1);
  assert.equal(storeOnly.installs[0].agentId, "agents");
  ok("store-only skill stays visible under the store and can be loaded");

  const claudeAgent = state.agents.find((agent) => agent.id === "claude");
  assert.equal(claudeAgent.entryCount, 5, "claude entry count");
  ok("per-agent counts stay merge-aware");
}

{
  // Link import of the merged dbs skill through the claude junction.
  const state = await core.getState();
  const claudeSource = state.sources.find((source) => source.agentId === "claude");
  const res = await core.importSkill({ sourceId: claudeSource.id, dirName: "dbs", mode: "link" });
  assert.equal(res.ok, true);
  const libEntry = join(fakeHome, "skills", "dbs");
  const stats = await lstat(libEntry);
  assert.ok(stats.isSymbolicLink(), "library entry is a link");
  assert.equal(await realpath(libEntry), await realpath(join(claudeDir, "dbs")), "link chain resolves to the physical store copy");
  ok("link import through a junction resolves to the physical source");

  const after = await core.getState();
  assert.equal(after.library.length, 1);
  assert.equal(after.catalog.entries.find((entry) => entry.name === "dbs").inLibrary, true);
  assert.equal(after.catalog.unloadedCount, 7);
  ok("catalog + unloaded counters update after load");
}

{
  // Copy import.
  const state = await core.getState();
  const qwenSource = state.sources.find((source) => source.agentId === "qwen");
  const res = await core.importSkill({ sourceId: qwenSource.id, dirName: "other", mode: "copy" });
  assert.equal(res.ok, true);
  const stats = await lstat(join(fakeHome, "skills", "other"));
  assert.ok(stats.isDirectory(), "copy import is a real directory");
  const stateFile = JSON.parse(await readFile(join(fakeHome, "skills", ".skill-manager.json"), "utf8"));
  assert.equal(stateFile.skills.other.mode, "copy");
  ok("copy import creates an independent directory and records state");
}

{
  // Loading the store-only skill straight from the store source.
  const state = await core.getState();
  const storeSource = state.sources.find((source) => source.store === true);
  const res = await core.importSkill({ sourceId: storeSource.id, dirName: "store-only", mode: "link" });
  assert.equal(res.ok, true);
  assert.equal(await realpath(join(fakeHome, "skills", "store-only")), join(storeDir, "store-only"));
  ok("loading an uncovered skill from the store works");
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
  assert.equal(resAll.imported, 5, `unscoped batch loads remaining skills (got ${resAll.imported})`);
  const after = await core.getState();
  assert.equal(after.catalog.unloadedCount, 0, "everything loaded");
  assert.equal(after.library.length, 8);
  ok("batch load fills the library to 8/8 with zero unloaded left");
}

{
  // Removing a linked skill must not touch the source directory.
  const res = await core.removeSkill({ dirName: "dbs" });
  assert.equal(res.ok, true);
  await assert.rejects(() => lstat(join(fakeHome, "skills", "dbs")));
  const sourceRaw = await readFile(join(storeDbs, "SKILL.md"), "utf8");
  assert.ok(sourceRaw.includes("name: dbs"), "physical store copy untouched after link removal");
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

  // Dedup invariants on real data.
  assert.ok(state.sources.every((source) => !source.path.includes("skills-src")), "no skills-src source");
  assert.ok(state.sources.every((source) => !source.id.includes("#")), "no numbered duplicate sources");
  for (const entry of state.catalog.entries) {
    const ids = entry.installs.map((install) => install.agentId);
    assert.deepEqual(ids, [...new Set(ids)], `duplicate agent in entry ${entry.name}`);
  }
  const store = state.sources.find((source) => source.store === true);
  if (store !== undefined) {
    console.log(`  · store contributes ${store.skills.length} uncovered skill(s)`);
  }
  const multi = state.catalog.entries.filter((entry) => entry.installs.length >= 3).slice(0, 5);
  for (const entry of multi) {
    console.log(`  · merged: ${entry.name} ← ${entry.installs.map((install) => install.agentId).join(", ")}`);
  }
  assert.ok(state.catalog.mergedCount > 0, "real machine has cross-agent duplicates to merge");
  ok("real-machine scan: dedup invariants hold, duplicates merged");
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
    assert.equal(await realpath(libPath), await realpath(install.path), "loaded skill resolves to its source");
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
