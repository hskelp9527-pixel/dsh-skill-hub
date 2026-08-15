// Client-side smoke test for dsh-skill-hub.
//
// Loads lib/client.js exactly the way the DSH Web module loader does
// (window.__ModuleLoader__.load + factory(require)), then:
//   1. verifies the exported surface (apply / inject),
//   2. runs apply() against a stub Cordis ctx and captures the registered
//      settings section (id "skills"),
//   3. checks zh/en dictionaries have identical key sets and cover every
//      t("...") literal used by the component,
//   4. server-renders the section (loading state) to catch structural
//      crashes in React.createElement usage.
//
// Usage: node scripts/client-smoke-test.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createElement } = require("react");
const { renderToString } = require("react-dom/server");

let passed = 0;
const ok = (label) => { passed += 1; console.log(`  ✓ ${label}`); };

// 1. Load the client bundle through a fake module loader.
globalThis.window = globalThis;
let definition = null;
globalThis.__ModuleLoader__ = { load(def) { definition = def; } };
const source = await readFile(join(here, "..", "lib", "client.js"), "utf8");
(0, eval)(source);
assert.equal(definition?.id, "dsh-skill-hub", "module loader id");
assert.equal(typeof definition?.factory, "function", "factory is a function");
ok("client.js loads through __ModuleLoader__ with id dsh-skill-hub");

// 2. Run the factory the way the web app does.
const exports = definition.factory(require);
assert.deepEqual(exports.inject, ["slots", "locale", "connection"], "inject surface");
assert.equal(typeof exports.apply, "function", "apply is a function");
ok("factory(require) exports { apply, inject }");

// 3. apply() against a stub ctx — captures the registered settings section.
const dictionaries = {};
let section = null;
const ctx = {
  effect(fn) { fn(); },
  locale: {
    register(ns, dict) { dictionaries[ns] = dict; },
    bind(ns) {
      const bundle = dictionaries[ns] ?? {};
      return (key) => bundle.zh?.[key] ?? key;
    },
  },
  get(name) {
    if (name !== "connection") throw new Error(`unexpected ctx.get(${name})`);
    return { rpc: { call: async () => ({ ok: true, value: null }) } };
  },
  slots: {
    inject(slot, register) {
      assert.equal(slot, "settings.section", "injects into settings.section");
      section = register();
    },
    register(options, component) { return { options, component }; },
  },
};
exports.apply(ctx);
assert.ok(section, "section registered");
assert.equal(section.options.id, "skills", "section id");
assert.equal(section.options.order, 20, "section order");
assert.equal(typeof section.component, "function", "section component");
ok('apply(ctx) registers the "skills" settings section');

// 4. Dictionary parity + coverage of every t("...") literal in the source.
const { zh, en } = dictionaries["settings.skillHub"] ?? {};
assert.ok(zh && en, "dictionaries registered under settings.skillHub");
const zhKeys = Object.keys(zh).sort();
const enKeys = Object.keys(en).sort();
assert.deepEqual(zhKeys, enKeys, "zh/en key sets identical");
const usedKeys = [...source.matchAll(/\bt\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]);
const uniqueUsedKeys = [...new Set(usedKeys)];
for (const key of uniqueUsedKeys) {
  assert.ok(key in zh, `missing zh key: ${key}`);
  assert.ok(key in en, `missing en key: ${key}`);
}
ok(`dictionaries: ${zhKeys.length} keys, parity ok, all ${uniqueUsedKeys.length} used keys covered`);

// 5. SSR-render the section (loading state) to catch structural crashes.
const t = ctx.locale.bind("settings.skillHub");
const html = renderToString(createElement(section.component, {
  t,
  remote: async () => { throw new Error("not reached during SSR"); },
  close: () => {},
}));
assert.ok(html.length > 0, "renders non-empty markup");
assert.ok(html.includes("正在读取"), "renders the loading state");
ok(`SSR render ok (${html.length} chars, no component crash)`);

console.log(`\n${passed} checks passed.`);
