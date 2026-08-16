window.__ModuleLoader__.load({
  id: "dsh-skill-hub",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const { useCallback, useEffect, useState } = React;

    const NS = "settings.skillHub";

    const CSS = `
.dsk-root{display:flex;flex-direction:column;gap:14px;width:100%;max-width:820px;color:var(--dsw-alias-label-primary)}
.dsk-heading-row{display:flex;align-items:center;gap:10px}
.dsk-heading{margin:0;font-size:18px;font-weight:600;line-height:26px}
.dsk-status{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}
.dsk-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;margin:0}
.dsk-section{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:12px 14px}
.dsk-section h3{margin:0 0 6px;font-size:14px;font-weight:600;line-height:22px}
.dsk-section .dsk-intro{margin:0 0 10px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;word-break:break-all}
.dsk-card{border-top:1px solid var(--dsw-alias-border-l2);padding:10px 0;display:flex;flex-direction:column;gap:8px}
.dsk-card:first-of-type{border-top:none;padding-top:0}
.dsk-card-head{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.dsk-card-title{font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary)}
.dsk-card-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.dsk-card-desc[data-open=true]{display:block;-webkit-line-clamp:unset}
.dsk-tag{flex:none;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 6px;font-size:11px;line-height:16px}
.dsk-tag-on{border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent);color:var(--dsw-alias-state-success-primary)}
.dsk-tag-warn{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);color:var(--dsw-alias-state-error-primary)}
.dsk-tag-link{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);color:var(--dsw-alias-state-business-primary)}
.dsk-field{display:flex;align-items:center;gap:8px;min-width:0}
.dsk-field input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;height:32px;padding:0 10px;font:inherit;font-size:12px;outline:none;min-width:0}
.dsk-field input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}
.dsk-field input.dsk-grow{flex:1}
.dsk-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;height:30px;padding:0 12px;font:inherit;font-size:12px;cursor:pointer;flex:none}
.dsk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsk-btn:disabled{opacity:.55;cursor:default}
.dsk-btn-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border:none}
.dsk-btn-danger{color:var(--dsw-alias-state-error-primary)}
.dsk-notice{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.dsk-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsk-source-tabs{display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap}
.dsk-source-tab{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;height:30px;padding:0 14px;font:inherit;font-size:12px;cursor:pointer}
.dsk-source-tab[data-active=true]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.dsk-search{width:100%}
.dsk-editor{width:100%;min-height:220px;resize:vertical;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:10px;font:12px/1.6 ui-monospace,Consolas,monospace;outline:none}
.dsk-editor:focus-visible{border-color:var(--dsw-alias-state-business-primary)}
.dsk-saved{color:var(--dsw-alias-state-success-primary);font-size:12px;line-height:18px}
.dsk-group{gap:0}
.dsk-group-head{display:flex;align-items:center;gap:8px;min-width:0;cursor:pointer;flex-wrap:wrap;padding:2px 0}
.dsk-group-head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;border-radius:4px}
.dsk-chevron{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;transition:transform .12s ease;display:inline-block}
.dsk-chevron-open{transform:rotate(90deg)}
.dsk-group-summary{flex:1;min-width:120px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsk-group-body{display:flex;flex-direction:column;gap:8px;margin-top:6px;padding-left:14px;border-left:2px solid var(--dsw-alias-border-l2)}
.dsk-group-item{display:flex;flex-direction:column;gap:2px}
.dsk-group-item>.dsk-tag{align-self:flex-start;font-size:10px;line-height:14px;padding:0 4px}
.dsk-group-item .dsk-card{border-top:1px solid var(--dsw-alias-border-l2);padding-top:8px}
.dsk-group-item-base>.dsk-tag{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);color:var(--dsw-alias-state-business-primary)}
.dsk-install-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;line-height:18px}
.dsk-install-path{color:var(--dsw-alias-label-tertiary);font-size:11px;word-break:break-all;flex:1;min-width:140px}
.dsk-install-list{display:flex;flex-direction:column;gap:6px;border-left:2px solid var(--dsw-alias-border-l2);padding-left:10px}
`;

    if (typeof document !== "undefined" && document.getElementById("dsh-skill-hub-style") === null) {
      const style = document.createElement("style");
      style.id = "dsh-skill-hub-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function h(type, props, ...children) {
      const flat = [];
      const push = (child) => {
        if (child === null || child === void 0 || child === false || child === "") return;
        if (Array.isArray(child)) {
          child.forEach(push);
          return;
        }
        flat.push(child);
      };
      for (const child of children) push(child);
      return React.createElement(type, props, ...flat);
    }

    function useRemoteData(remote, method, args) {
      const argsKey = JSON.stringify(args ?? {});
      const [state, setState] = useState({ status: "loading" });
      const reload = useCallback(async () => {
        setState((current) => ({ ...current, status: "loading" }));
        try {
          const value = await remote(method, args);
          setState({ status: "ready", value });
        } catch (error) {
          setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
        }
      }, [remote, method, argsKey]);
      useEffect(() => {
        reload();
      }, [reload]);
      return [state, reload];
    }

    function modeBadge(skill, t) {
      if (skill.broken) return h("span", { className: "dsk-tag dsk-tag-warn" }, t("mode.broken"));
      if (skill.mode === "link") return h("span", { className: "dsk-tag dsk-tag-link", title: skill.sourcePath }, t("mode.link"), " → ", skill.sourceId || "?");
      if (skill.mode === "copy") return h("span", { className: "dsk-tag" }, t("mode.copy"));
      return h("span", { className: "dsk-tag" }, t("mode.local"));
    }

    /**
     * Prefix of a skill dirName: the part before the first "-" ("dbs" for
     * "dbs-benchmark"). Returns null when the name has no usable dash.
     */
    function skillPrefix(dirName) {
      const idx = String(dirName).indexOf("-");
      if (idx <= 0 || idx === String(dirName).length - 1) return null;
      return String(dirName).slice(0, idx);
    }

    /**
     * Merge same-prefix skills into groups. A group is formed when at least
     * two prefixed skills share a prefix, or when a base skill named exactly
     * like the prefix exists (e.g. "dbs" + "dbs-*"). Ungrouped skills are
     * returned standalone.
     */
    function groupSkills(items) {
      const byDir = new Map(items.map((skill) => [skill.dirName, skill]));
      const prefixMembers = new Map();
      for (const skill of items) {
        const prefix = skillPrefix(skill.dirName);
        if (prefix === null) continue;
        if (!prefixMembers.has(prefix)) prefixMembers.set(prefix, []);
        prefixMembers.get(prefix).push(skill);
      }
      const groups = [];
      const groupedDirNames = new Set();
      for (const [prefix, members] of prefixMembers) {
        const base = byDir.get(prefix);
        if (members.length < 2 && base === undefined) continue;
        members.sort((a, b) => a.dirName.localeCompare(b.dirName));
        groups.push({ prefix, base: base ?? null, members });
        if (base !== undefined) groupedDirNames.add(base.dirName);
        for (const member of members) groupedDirNames.add(member.dirName);
      }
      groups.sort((a, b) => a.prefix.localeCompare(b.prefix));
      const standalone = items.filter((skill) => !groupedDirNames.has(skill.dirName));
      return { groups, standalone };
    }

    function LibraryCard({ skill, t, busy, onEdit, onDelete }) {
      const [open, setOpen] = useState(false);
      const [confirming, setConfirming] = useState(false);
      return h("div", { className: "dsk-card" },
        h("div", { className: "dsk-card-head" },
          h("span", { className: "dsk-card-title" }, skill.name),
          modeBadge(skill, t),
          skill.hasSkillMd ? null : h("span", { className: "dsk-tag dsk-tag-warn" }, t("noSkillMd")),
          skill.frontmatterOk === false && skill.hasSkillMd ? h("span", { className: "dsk-tag dsk-tag-warn" }, t("noFrontmatter")) : null,
          h("span", { className: "dsk-tag" }, `${skill.resourceCount} ${t("resources")}`),
        ),
        skill.description
          ? h("p", {
              className: "dsk-card-desc",
              "data-open": open ? "true" : "false",
              onClick: () => setOpen(!open),
              title: t("descToggle"),
            }, skill.description)
          : null,
        h("div", { className: "dsk-actions" },
          h("button", { className: "dsk-btn", type: "button", disabled: busy === skill.dirName || skill.broken || !skill.hasSkillMd, onClick: () => onEdit(skill.dirName) }, t("edit")),
          confirming
            ? h("button", {
                className: "dsk-btn dsk-btn-danger",
                type: "button",
                disabled: busy === skill.dirName,
                onClick: () => { setConfirming(false); onDelete(skill.dirName); },
              }, t("confirmDelete"))
            : h("button", {
                className: "dsk-btn dsk-btn-danger",
                type: "button",
                disabled: busy === skill.dirName,
                onClick: () => setConfirming(true),
              }, t("delete")),
          skill.mode === "link" && !skill.broken ? h("span", { className: "dsk-notice" }, t("linkRemoveHint")) : null,
          skill.broken ? h("span", { className: "dsk-notice" }, t("brokenHint")) : null,
        ),
      );
    }

    /**
     * One merged same-prefix family in the library: collapsed shows the group
     * header (prefix + count + base summary); expanded reveals the base skill
     * card plus every sub-skill card with full edit/delete actions.
     */
    function LibraryGroupCard({ group, expanded, onToggle, t, BaseCard, ChildCard }) {
      const summary = group.base?.description ?? group.members[0]?.description ?? "";
      const resources = (group.base?.resourceCount ?? 0) + group.members.reduce((sum, m) => sum + (m.resourceCount ?? 0), 0);
      return h("div", { className: "dsk-card dsk-group" },
        h("div", {
          className: "dsk-group-head",
          role: "button",
          tabIndex: 0,
          onClick: onToggle,
          onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(); } },
        },
          h("span", { className: `dsk-chevron${expanded ? " dsk-chevron-open" : ""}`, "aria-hidden": "true" }, "▸"),
          h("span", { className: "dsk-card-title" }, group.prefix),
          h("span", { className: "dsk-tag dsk-tag-link" }, `${group.members.length} ${t("subSkills")}`),
          group.base !== null ? h("span", { className: "dsk-tag" }, t("hasBase")) : null,
          h("span", { className: "dsk-tag" }, `${resources} ${t("resources")}`),
          h("span", { className: "dsk-group-summary" }, summary),
        ),
        expanded ? h("div", { className: "dsk-group-body" },
          group.base !== null
            ? h("div", { className: "dsk-group-item dsk-group-item-base" },
                h("span", { className: "dsk-tag dsk-tag-link" }, t("baseSkill")),
                BaseCard,
              )
            : null,
          group.members.map((skill) => h("div", { className: "dsk-group-item", key: skill.dirName }, ChildCard(skill))),
        ) : null,
      );
    }

    /**
     * One merged catalog entry in the discover view: the skill title, one
     * badge per agent it is installed on (duplicates never repeat), a
     * not-loaded warning when it is missing from the library, and an
     * expandable per-agent install list with individual load buttons.
     */
    function CatalogCard({ entry, t, busy, onImport, expandedDefault }) {
      const [open, setOpen] = useState(false);
      const [descOpen, setDescOpen] = useState(false);
      const agentBadges = [...new Map(entry.installs.map((install) => [install.agentId, install])).values()];
      const preferred = entry.installs[0];
      return h("div", { className: "dsk-card" },
        h("div", { className: "dsk-card-head" },
          h("span", { className: "dsk-card-title" }, entry.name),
          entry.inLibrary
            ? h("span", { className: "dsk-tag dsk-tag-on" }, t("inLibrary"))
            : h("span", { className: "dsk-tag dsk-tag-warn" }, t("notLoaded")),
          entry.installs.length > 1 ? h("span", { className: "dsk-tag dsk-tag-link", title: entry.installs.map((install) => `${install.agentLabel}: ${install.path}`).join("\n") }, `${entry.installs.length} ${t("agentsInstalled")}`) : null,
          h("span", { className: "dsk-tag" }, `${entry.resourceCount} ${t("resources")}`),
        ),
        h("div", { className: "dsk-install-row" },
          agentBadges.map((install) => h("span", { className: "dsk-tag", key: install.agentId, title: install.path }, install.agentLabel)),
        ),
        entry.description
          ? h("p", {
              className: "dsk-card-desc",
              "data-open": descOpen ? "true" : "false",
              onClick: () => setDescOpen(!descOpen),
              title: t("descToggle"),
            }, entry.description)
          : null,
        entry.inLibrary ? null : h("div", { className: "dsk-actions" },
          h("button", {
            className: "dsk-btn dsk-btn-primary",
            type: "button",
            disabled: busy === `link:${preferred.sourceId}:${preferred.dirName}`,
            onClick: () => onImport(preferred.sourceId, preferred.dirName, "link"),
          }, t("loadLink")),
          h("button", {
            className: "dsk-btn",
            type: "button",
            disabled: busy === `copy:${preferred.sourceId}:${preferred.dirName}`,
            onClick: () => onImport(preferred.sourceId, preferred.dirName, "copy"),
          }, t("loadCopy")),
        ),
        h("div", { className: "dsk-actions" },
          h("button", { className: "dsk-btn", type: "button", onClick: () => setOpen(!open) }, open ? t("hideInstalls") : t("showInstalls")),
          entry.inLibrary ? h("span", { className: "dsk-notice" }, t("alreadyLoadedHint")) : null,
        ),
        open || expandedDefault ? h("div", { className: "dsk-install-list" },
          entry.installs.map((install) => h("div", { className: "dsk-install-row", key: `${install.sourceId}:${install.dirName}` },
            h("span", { className: "dsk-tag" }, install.agentLabel),
            install.frontmatterOk ? null : h("span", { className: "dsk-tag dsk-tag-warn", title: t("noFrontmatterHint") }, t("noFrontmatter")),
            h("span", { className: "dsk-install-path" }, install.path),
            install.inLibrary ? h("span", { className: "dsk-tag dsk-tag-on" }, t("inLibrary")) : h("button", {
              className: "dsk-btn",
              type: "button",
              disabled: busy === `link:${install.sourceId}:${install.dirName}`,
              onClick: () => onImport(install.sourceId, install.dirName, "link"),
            }, t("importLink")),
          )),
        ) : null,
      );
    }

    /**
     * Same-prefix family in the discover view: header with pending count and
     * a "load whole group" action; expanded shows merged member cards.
     */
    function CatalogGroupCard({ group, expanded, onToggle, t, pending, busyKey, busy, onLinkGroup, renderEntry }) {
      const summary = group.base?.description ?? group.members[0]?.description ?? "";
      return h("div", { className: "dsk-card dsk-group" },
        h("div", {
          className: "dsk-group-head",
          role: "button",
          tabIndex: 0,
          onClick: onToggle,
          onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(); } },
        },
          h("span", { className: `dsk-chevron${expanded ? " dsk-chevron-open" : ""}`, "aria-hidden": "true" }, "▸"),
          h("span", { className: "dsk-card-title" }, group.prefix),
          h("span", { className: "dsk-tag dsk-tag-link" }, `${group.members.length} ${t("subSkills")}`),
          group.base !== null ? h("span", { className: "dsk-tag" }, t("hasBase")) : null,
          pending.length === 0
            ? h("span", { className: "dsk-tag dsk-tag-on" }, t("allInLibrary"))
            : h("span", { className: "dsk-tag dsk-tag-warn" }, `${pending.length} ${t("pendingCount")}`),
          pending.length === 0 ? null : h("button", {
            className: "dsk-btn",
            type: "button",
            disabled: busy === busyKey,
            onClick: (event) => {
              event.stopPropagation();
              onLinkGroup(pending, busyKey);
            },
          }, busy === busyKey ? t("saving") : t("loadGroup")),
          h("span", { className: "dsk-group-summary" }, summary),
        ),
        expanded ? h("div", { className: "dsk-group-body" },
          group.base !== null
            ? h("div", { className: "dsk-group-item dsk-group-item-base" },
                h("span", { className: "dsk-tag dsk-tag-link" }, t("baseSkill")),
                renderEntry(group.base),
              )
            : null,
          group.members.map((entry) => h("div", { className: "dsk-group-item", key: entry.dirName }, renderEntry(entry))),
        ) : null,
      );
    }

    function SkillHubSection({ t, remote, close }) {
      const [state, reload] = useRemoteData(remote, "getState", {});
      const [view, setView] = useState("discover");
      const [query, setQuery] = useState("");
      const [agentFilter, setAgentFilter] = useState("all");
      const [notice, setNotice] = useState(null);
      const [busy, setBusy] = useState(null);
      const [editing, setEditing] = useState(null); // { dirName, content, draft, saving, saved }
      const [newSkill, setNewSkill] = useState({ name: "", description: "" });
      const [creating, setCreating] = useState(false);
      const [openGroups, setOpenGroups] = useState(() => new Set());

      const toggleGroup = (key) => {
        setOpenGroups((current) => {
          const next = new Set(current);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      };

      const run = async (label, action) => {
        setBusy(label);
        setNotice(null);
        try {
          return await action();
        } catch (error) {
          setNotice(error instanceof Error ? error.message : String(error));
          return null;
        } finally {
          setBusy(null);
        }
      };

      const importSkill = (sourceId, dirName, mode) => run(`${mode}:${sourceId}:${dirName}`, async () => {
        const res = await remote("importSkill", { sourceId, dirName, mode });
        if (res?.ok === false) setNotice(res.error ?? t("opFailed"));
        else { setNotice(t("loadDone").replace("{name}", dirName)); reload(); }
      });

      const loadUnloaded = (agentId) => run(`unloaded:${agentId ?? "all"}`, async () => {
        const res = await remote("importUnloaded", { mode: "link", agentId: agentId ?? "" });
        if (res?.ok === false) setNotice(res.error ?? t("opFailed"));
        else {
          const failed = (res?.results ?? []).filter((item) => !item.ok);
          setNotice(failed.length === 0
            ? t("loadAllDone").replace("{n}", String(res?.imported ?? 0))
            : `${t("loadAllDone").replace("{n}", String(res?.imported ?? 0))}；${failed[0].dirName}: ${failed[0].error}`);
          reload();
        }
      });

      const importGroup = (installs, busyKey) => run(busyKey, async () => {
        let ok = 0;
        const failures = [];
        for (const { sourceId, dirName } of installs) {
          try {
            const res = await remote("importSkill", { sourceId, dirName, mode: "link" });
            if (res?.ok !== false) ok += 1;
          } catch (error) {
            failures.push(`${dirName}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        setNotice(failures.length === 0
          ? t("loadAllDone").replace("{n}", String(ok))
          : `${t("loadAllDone").replace("{n}", String(ok))}；${failures[0]}`);
        reload();
      });

      const removeSkill = (dirName) => run(`remove:${dirName}`, async () => {
        const res = await remote("removeSkill", { dirName });
        if (res?.ok === false) setNotice(res.error ?? t("opFailed"));
        else reload();
      });

      const startEdit = async (dirName) => run(`read:${dirName}`, async () => {
        const res = await remote("readSkill", { dirName });
        setEditing({ dirName, draft: res.content, saving: false, saved: false });
      });

      const saveEdit = async () => {
        if (editing === null) return;
        const dirName = editing.dirName;
        setEditing({ ...editing, saving: true });
        const res = await run(`save:${dirName}`, async () => remote("saveSkill", { dirName, content: editing.draft }));
        if (res?.ok !== false && res !== null) setEditing({ dirName, draft: editing.draft, saving: false, saved: true });
        else setEditing({ ...editing, saving: false, saved: false });
      };

      const createSkill = async () => {
        setCreating(true);
        setNotice(null);
        try {
          const res = await remote("createSkill", { name: newSkill.name, description: newSkill.description });
          if (res?.ok === false) setNotice(res.error ?? t("opFailed"));
          else {
            setNewSkill({ name: "", description: "" });
            reload();
          }
        } catch (error) {
          setNotice(error instanceof Error ? error.message : String(error));
        } finally {
          setCreating(false);
        }
      };

      if (state.status === "loading") return h("p", { className: "dsk-status" }, t("loading"));
      if (state.status === "error") return h("p", { className: "dsk-error" }, t("loadError"), " ", state.message);

      const data = state.value;
      const library = data.library ?? [];
      const agents = data.agents ?? [];
      const entries = data.catalog?.entries ?? [];
      const unloadedCount = data.catalog?.unloadedCount ?? 0;
      const normalizedQuery = query.trim().toLocaleLowerCase();
      const matches = (...values) => normalizedQuery === "" || values.some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedQuery));
      const entryMatch = (entry) => matches(entry.dirName, entry.name, entry.description, entry.installs.map((install) => install.agentLabel).join(" "));
      const hasQuery = normalizedQuery !== "";

      // Discover: agent filter first, then search; entries split into two
      // categories — "not loaded yet" (actionable) and "already loaded" —
      // with same-prefix families grouped inside each.
      const filteredEntries = agentFilter === "all"
        ? entries
        : entries.filter((entry) => entry.agents.includes(agentFilter));
      const visibleEntries = filteredEntries.filter(entryMatch);
      const unloadedEntries = visibleEntries.filter((entry) => !entry.inLibrary);
      const loadedEntries = visibleEntries.filter((entry) => entry.inLibrary);
      const filteredUnloaded = filteredEntries.filter((entry) => !entry.inLibrary).length;

      /** One discover category: header with count + grouped merged cards. */
      const renderDiscoverCategory = (category, title, emptyHint, items) => {
        const { groups, standalone } = groupSkills(items);
        return h("div", { key: category },
          h("div", { className: "dsk-src-head" },
            h("span", { className: "dsk-src-title" }, title),
            h("span", { className: "dsk-tag" }, String(items.length)),
          ),
          items.length === 0 && !hasQuery ? h("p", { className: "dsk-status" }, emptyHint) : null,
          groups.map((group) => {
            const groupKey = `cat:${category}:${agentFilter}:${group.prefix}`;
            const expanded = hasQuery ? true : openGroups.has(groupKey);
            const pending = [
              ...(group.base !== null && !group.base.inLibrary ? [{ sourceId: group.base.installs[0].sourceId, dirName: group.base.dirName }] : []),
              ...group.members.filter((entry) => !entry.inLibrary).map((entry) => ({ sourceId: entry.installs[0].sourceId, dirName: entry.dirName })),
            ];
            return h(CatalogGroupCard, {
              key: groupKey,
              group,
              expanded,
              onToggle: () => toggleGroup(groupKey),
              t,
              pending,
              busyKey: `group:${category}:${agentFilter}:${group.prefix}`,
              busy,
              onLinkGroup: importGroup,
              renderEntry: (entry) => h(CatalogCard, {
                key: `${entry.installs[0]?.sourceId}:${entry.dirName}`,
                entry,
                t,
                busy,
                onImport: importSkill,
                expandedDefault: hasQuery,
              }),
            });
          }),
          standalone.map((entry) => h(CatalogCard, {
            key: `${entry.installs[0]?.sourceId}:${entry.dirName}`,
            entry,
            t,
            busy,
            onImport: importSkill,
          })),
        );
      };

      // Library: group same-prefix families; searching filters children inside
      // groups and auto-expands groups with matches.
      const { groups: libraryGroups, standalone: libraryStandalone } = groupSkills(library);
      const skillMatch = (skill) => matches(skill.dirName, skill.name, skill.description);
      const visibleLibraryGroups = libraryGroups
        .map((group) => {
          const baseVisible = group.base === null ? false : skillMatch(group.base);
          const matchingMembers = group.members.filter(skillMatch);
          const prefixMatch = matches(group.prefix);
          return { group, baseVisible, matchingMembers, prefixMatch };
        })
        .filter(({ group, baseVisible, matchingMembers, prefixMatch }) =>
          hasQuery ? (baseVisible || matchingMembers.length > 0 || prefixMatch) : true);
      const visibleLibraryStandalone = libraryStandalone
        .filter((skill) => editing === null || skill.dirName !== editing.dirName)
        .filter(skillMatch);
      const visibleLibraryCount = visibleLibraryGroups.length + visibleLibraryStandalone.length;

      return h("div", { className: "dsk-root" },
        h("div", { className: "dsk-heading-row" },
          h("h2", { className: "dsk-heading" }, t("sectionTitle")),
        ),
        h("div", { className: "dsk-source-tabs" },
          h("button", { type: "button", className: "dsk-source-tab", "data-active": view === "discover" ? "true" : "false", onClick: () => setView("discover") }, t("view.discover"), ` (${entries.length})`),
          h("button", { type: "button", className: "dsk-source-tab", "data-active": view === "library" ? "true" : "false", onClick: () => setView("library") }, t("view.library"), ` (${library.length})`),
        ),
        h("div", { className: "dsk-field dsk-search" },
          h("input", {
            className: "dsk-grow",
            type: "search",
            placeholder: view === "library" ? t("searchLibrary") : t("searchDiscover"),
            value: query,
            onChange: (event) => setQuery(event.currentTarget.value),
          })),
        notice ? h("p", { className: "dsk-error", role: "alert" }, notice) : null,

        view === "discover" ? h("section", { className: "dsk-section" },
          h("h3", null, t("discoverTitle")),
          h("p", { className: "dsk-intro" },
            t("discoverIntro")
              .replace("{agents}", String(agents.length))
              .replace("{skills}", String(entries.length))
              .replace("{merged}", String(data.catalog?.mergedCount ?? 0))
              .replace("{unloaded}", String(unloadedCount)),
          ),
          h("div", { className: "dsk-source-tabs" },
            h("button", {
              type: "button",
              className: "dsk-source-tab",
              "data-active": agentFilter === "all" ? "true" : "false",
              onClick: () => setAgentFilter("all"),
            }, t("allAgents"), ` (${entries.length})`),
            agents.map((agent) => h("button", {
              key: agent.id,
              type: "button",
              className: "dsk-source-tab",
              "data-active": agentFilter === agent.id ? "true" : "false",
              title: agents.find((item) => item.id === agent.id)?.label,
              onClick: () => setAgentFilter(agent.id),
            }, agent.label, ` (${agent.entryCount})`)),
          ),
          h("div", { className: "dsk-actions" },
            filteredUnloaded > 0 ? h("button", {
              className: "dsk-btn dsk-btn-primary",
              type: "button",
              disabled: busy === `unloaded:${agentFilter}`,
              onClick: () => loadUnloaded(agentFilter === "all" ? "" : agentFilter),
            }, busy === `unloaded:${agentFilter}` ? t("saving") : t("loadAll").replace("{n}", String(filteredUnloaded))) : null,
            unloadedCount === 0 ? h("span", { className: "dsk-notice" }, t("allLoadedHint")) : null,
          ),
          visibleEntries.length === 0
            ? h("p", { className: "dsk-status" }, entries.length === 0 ? t("noDiscover") : t("emptySearch"))
            : null,
          renderDiscoverCategory("unloaded", t("cat.unloaded"), t("cat.unloadedEmpty"), unloadedEntries),
          renderDiscoverCategory("loaded", t("cat.loaded"), t("cat.loadedEmpty"), loadedEntries),
        ) : null,

        view === "library" ? h("section", { className: "dsk-section" },
          h("h3", null, t("libraryTitle")),
          h("p", { className: "dsk-intro" }, t("libraryIntro"), " ", data.libraryRoot ?? ""),
          visibleLibraryCount === 0
            ? h("p", { className: "dsk-status" }, library.length === 0 ? t("noLibrary") : t("emptySearch"))
            : null,
          editing !== null ? (() => {
            const skill = library.find((item) => item.dirName === editing.dirName);
            return h("div", { className: "dsk-card", key: `edit-${editing.dirName}` },
              h("div", { className: "dsk-card-head" },
                h("span", { className: "dsk-card-title" }, t("editing"), "：", editing.dirName),
                skill !== undefined ? modeBadge(skill, t) : null,
              ),
              h("textarea", {
                className: "dsk-editor",
                spellCheck: false,
                value: editing.draft,
                onChange: (event) => setEditing({ ...editing, draft: event.currentTarget.value }),
              }),
              h("div", { className: "dsk-actions" },
                h("button", { className: "dsk-btn dsk-btn-primary", type: "button", disabled: editing.saving, onClick: saveEdit }, editing.saving ? t("saving") : t("save")),
                h("button", { className: "dsk-btn", type: "button", onClick: () => setEditing(null) }, t("cancel")),
                editing.saved ? h("span", { className: "dsk-saved" }, t("saved")) : null,
                h("span", { className: "dsk-notice" }, t("editHint")),
              ),
            );
          })() : null,
          visibleLibraryGroups.map(({ group, baseVisible, matchingMembers }) => {
            const expanded = hasQuery
              ? true
              : openGroups.has(`lib:${group.prefix}`);
            const shownBase = hasQuery && !baseVisible ? null : group.base;
            const shownMembers = hasQuery ? matchingMembers : group.members;
            return h(LibraryGroupCard, {
              key: `lib:${group.prefix}`,
              group: { ...group, base: shownBase },
              expanded,
              onToggle: () => toggleGroup(`lib:${group.prefix}`),
              t,
              BaseCard: shownBase === null ? null : h(LibraryCard, {
                skill: shownBase,
                t, busy,
                onEdit: startEdit,
                onDelete: removeSkill,
              }),
              ChildCard: (skill) => (editing !== null && editing.dirName === skill.dirName ? null : h(LibraryCard, {
                skill,
                t, busy,
                onEdit: startEdit,
                onDelete: removeSkill,
              })),
            });
          }),
          visibleLibraryStandalone.map((skill) => h(LibraryCard, {
            key: skill.dirName,
            skill,
            t,
            busy,
            onEdit: startEdit,
            onDelete: removeSkill,
          })),
          h("div", { className: "dsk-card" },
            h("div", { className: "dsk-card-head" },
              h("span", { className: "dsk-card-title" }, t("createTitle")),
            ),
            h("div", { className: "dsk-field" },
              h("input", {
                className: "dsk-grow",
                type: "text",
                placeholder: t("createName"),
                value: newSkill.name,
                onChange: (event) => setNewSkill({ ...newSkill, name: event.currentTarget.value }),
              }),
              h("input", {
                className: "dsk-grow",
                type: "text",
                placeholder: t("createDesc"),
                value: newSkill.description,
                onChange: (event) => setNewSkill({ ...newSkill, description: event.currentTarget.value }),
              }),
              h("button", {
                className: "dsk-btn dsk-btn-primary",
                type: "button",
                disabled: creating,
                onClick: createSkill,
              }, creating ? t("saving") : t("create")),
            ),
          ),
        ) : null,
      );
    }

    const zh = {
      section: "技能",
      sectionTitle: "技能 Hub（跨 Agent 扫描 · 合并 · 加载）",
      loading: "正在读取…",
      loadError: "读取失败：",
      opFailed: "操作失败",
      saving: "处理中…",
      save: "保存",
      saved: "已保存",
      cancel: "取消",
      delete: "删除",
      confirmDelete: "确认删除？",
      edit: "编辑 SKILL.md",
      editing: "正在编辑",
      editHint: "链接类技能：保存会直接写回源目录。",
      searchLibrary: "搜索全局技能库",
      searchDiscover: "搜索本机发现的技能",
      "view.discover": "发现技能",
      "view.library": "全局技能库",
      discoverTitle: "本机 Agent 技能扫描",
      discoverIntro: "已发现 {agents} 个 Agent、{skills} 个技能（跨端重复已合并 {merged} 个安装，同一技能只显示一张卡片），其中 {unloaded} 个尚未加载到 DSH。选择 Agent 筛选后点击「加载」，即可在输入框「/」菜单中使用。",
      "cat.unloaded": "未加载（待入库）",
      "cat.unloadedEmpty": "没有待加载的技能——发现的技能已全部入库。",
      "cat.loaded": "已加载（可在 “/” 菜单使用）",
      "cat.loadedEmpty": "还没有加载任何技能，从上面的「未加载」分类开始。",
      allAgents: "全部 Agent",
      noDiscover: "没有在本机发现任何 Agent 技能目录。",
      notLoaded: "未加载",
      agentsInstalled: "端安装",
      loadLink: "加载（链接）",
      loadCopy: "复制加载",
      loadAll: "加载全部未入库（{n}）",
      loadAllDone: "批量加载完成：{n} 个",
      loadDone: "已加载「{name}」，在输入框「/」菜单中即可使用。",
      loadGroup: "整组加载",
      pendingCount: "个未加载",
      showInstalls: "查看各端安装",
      hideInstalls: "收起安装详情",
      alreadyLoadedHint: "已在库；各端安装仍可单独链接。",
      allLoadedHint: "发现的技能已全部加载。",
      libraryTitle: "全局技能库（~/.dsh/skills）",
      libraryIntro: "放在这里的技能对所有会话生效（技能文件系统实时监听，加载后即可在输入框“/”菜单中调用）：",
      noLibrary: "技能库还是空的。切换到「发现技能」，把本机各 Agent 的技能加载进来。",
      "mode.link": "链接",
      "mode.copy": "副本",
      "mode.local": "本地创建",
      "mode.broken": "断链",
      resources: "个资源文件",
      subSkills: "个子技能",
      hasBase: "含主技能",
      baseSkill: "主技能",
      allInLibrary: "整组已在库",
      noSkillMd: "缺少 SKILL.md",
      noFrontmatter: "缺 frontmatter",
      noFrontmatterHint: "SKILL.md 没有 name/description frontmatter：复制导入会自动补全；链接导入需先在源目录补全。",
      descToggle: "点击展开 / 收起",
      linkRemoveHint: "删除只移除链接，不动源目录",
      brokenHint: "源目录已不存在，删除可清理断链",
      createTitle: "新建技能",
      createName: "技能名（如 my-skill）",
      createDesc: "技能描述（description）",
      create: "创建",
      inLibrary: "已在库",
      importLink: "链接导入",
      emptySearch: "没有匹配的技能。",
    };

    const en = {
      section: "Skills",
      sectionTitle: "Skill Hub (cross-agent scan · merge · load)",
      loading: "Loading…",
      loadError: "Load failed: ",
      opFailed: "Operation failed",
      saving: "Working…",
      save: "Save",
      saved: "Saved",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Confirm delete?",
      edit: "Edit SKILL.md",
      editing: "Editing",
      editHint: "Linked skills: saving writes straight to the source directory.",
      searchLibrary: "Search the global library",
      searchDiscover: "Search discovered skills",
      "view.discover": "Discover",
      "view.library": "Global library",
      discoverTitle: "Local agent skill scan",
      discoverIntro: "Found {agents} agents and {skills} skills ({merged} cross-agent installs merged — one card per skill). {unloaded} are not loaded into DSH yet. Pick an agent filter and press Load to use them from the \"/\" menu.",
      "cat.unloaded": "Not loaded (pending)",
      "cat.unloadedEmpty": "Nothing pending — every discovered skill is loaded.",
      "cat.loaded": "Loaded (usable from the \"/\" menu)",
      "cat.loadedEmpty": "Nothing loaded yet — start from the \"Not loaded\" category above.",
      allAgents: "All agents",
      noDiscover: "No agent skill directories discovered on this machine.",
      notLoaded: "Not loaded",
      agentsInstalled: "installs",
      loadLink: "Load (link)",
      loadCopy: "Load (copy)",
      loadAll: "Load all unloaded ({n})",
      loadAllDone: "Batch load done: {n}",
      loadDone: "Loaded \"{name}\" — available from the \"/\" menu.",
      loadGroup: "Load group",
      pendingCount: "not loaded",
      showInstalls: "Show per-agent installs",
      hideInstalls: "Hide install details",
      alreadyLoadedHint: "In library; individual installs can still be linked.",
      allLoadedHint: "Every discovered skill is loaded.",
      libraryTitle: "Global skill library (~/.dsh/skills)",
      libraryIntro: "Skills here apply to every session (the skill filesystem watches live; loaded skills appear in the \"/\" menu): ",
      noLibrary: "The library is empty. Switch to Discover and load skills from your local agents.",
      "mode.link": "Link",
      "mode.copy": "Copy",
      "mode.local": "Created locally",
      "mode.broken": "Broken link",
      resources: " resources",
      subSkills: " sub-skills",
      hasBase: "has base",
      baseSkill: "base",
      allInLibrary: "all in library",
      noSkillMd: "No SKILL.md",
      noFrontmatter: "No frontmatter",
      noFrontmatterHint: "SKILL.md lacks a name/description frontmatter: copy import synthesizes one; link import needs it fixed in the source first.",
      descToggle: "Click to expand / collapse",
      linkRemoveHint: "Deleting removes the link only, never the source",
      brokenHint: "Source directory is gone; delete to clean up the broken link",
      createTitle: "New skill",
      createName: "Skill name (e.g. my-skill)",
      createDesc: "Description",
      create: "Create",
      inLibrary: "In library",
      importLink: "Link",
      emptySearch: "No matching skills.",
    };

    const inject = [
      "slots",
      "locale",
      "connection",
    ];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-skill-hub: dictionaries");
      const t = ctx.locale.bind(NS);
      const connection = ctx.get("connection");
      const remote = async (method, args = {}) => {
        const result = await connection.rpc.call("/api", `skillHub/${method}`, { args });
        if (!result.ok) throw new Error(result.error?.message ?? `${method} failed`);
        return result.value;
      };
      const injected = () => ({ remote });

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "skills",
        order: 20,
        label: () => t("section"),
        locale: NS,
        inject: injected,
      }, SkillHubSection));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
