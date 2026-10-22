import { createMulti } from '../multiselect.js';
import { dragBadge, gripDrag, placeIds } from '../sortable.js';
import { groupByFolder } from '../../data/service.js';
import { isDev, openPatchMaker } from './devtools.js';
import { applyPatchFile, changedKeys, exportMyChanges } from './patchui.js';
import { createStore } from '../../engine/store.js';
import { buildRisum, moduleJson, safeFileName } from '../../engine/export.js';
import { hasAssets, loadCharacters, moduleCounts, moduleFlags } from '../../data/modules.js';
import { copyText, download, fmtWhen, h, replace, vanish } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, chip, trayBtn, tray, sortChips, sortLabel, sortShort, sortBy, fmtSize, colorDialog, loading, spinner, confirmDialog, folderDialog, folderPickPrefs, iconBtn, note, openMenu, promptDialog, setSwitch, switchEl } from '../kit.js';
import { FOLDER_SWATCHES, NAME_SWATCHES, folderTint, readableName } from '../theme.js';
import { loadPersonaMap, setPersonaLink } from '../../data/persona.js';
import { addProjects, findProject } from './dev.js';

var FILTERS = [["all", "전체"], ["on", "켜짐"], ["off", "꺼짐"], ["global", "전역"], ["lla", "LLA"], ["mcp", "MCP"]];
function searchText(m) {
  const parts = [m.name, m.namespace, m.description];
  for (const l of m.lorebook ?? []) parts.push(l?.comment, l?.key, l?.secondkey);
  for (const r of m.regex ?? []) parts.push(r?.comment);
  for (const r of m.trigger ?? []) parts.push(r?.comment);
  return parts.filter(Boolean).join("\n").toLowerCase();
}
var COARSE2 = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
// 모듈 크기: 글자 데이터(로어·정규식·트리거 등)의 크기. 에셋 파일 자체는 포함하지 않는다
var sizeCache = /* @__PURE__ */ new WeakMap();
function moduleSize(m) {
  let n = sizeCache.get(m);
  if (n === void 0) {
    try {
      n = new TextEncoder().encode(JSON.stringify(m)).length;
    } catch {
      n = 0;
    }
    sizeCache.set(m, n);
  }
  return n;
}
export async function renderModules(ctx) {
  const st = ctx.state;
  st.modFilter ??= "all";
  if (!st.modData || st.modDirty) {
    if (!st.modData) replace(ctx.main, loading("모듈을 불러오는 중", { rows: 7 }));
    st.modData = await ctx.svc.load();
    st.modDirty = false;
    st.modIndex = new Map(st.modData.entries.map((e) => [e.module.id, searchText(e.module)]));
  }
  draw(ctx);
}
function draw(ctx) {
  const st = ctx.state;
  const { entries, globalOn } = st.modData;
  const meta = ctx.prefs.meta;
  ctx.setNavCount("modules", entries.length);
  const q = st.search.trim().toLowerCase();
  const filtering = !!q || st.modFilter !== "all";
  if (st.modFolder && !meta.folders.some((f) => f.id === st.modFolder)) st.modFolder = void 0;
  const fv = st.modFolder;
  const inView = (e) => fv === void 0 || (meta.mapping[e.module.id] ?? "") === fv;
  const pass = (e) => {
    if (!inView(e)) return false;
    const f = moduleFlags(e.module, globalOn);
    if (st.modFilter === "on" && !e.enabled) return false;
    if (st.modFilter === "off" && e.enabled) return false;
    if (["global", "lla", "mcp"].includes(st.modFilter) && !f[st.modFilter]) return false;
    return !q || st.modIndex.get(e.module.id)?.includes(q);
  };
  const count = (id) => entries.filter((e) => inView(e)).filter((e) => id === "all" || id === "on" && e.enabled || id === "off" && !e.enabled || moduleFlags(e.module, globalOn)[id]).length;
  const shown = entries.filter(pass);
  if (!st.modSel || !entries.some((e) => e.module.id === st.modSel)) st.modSel = shown[0]?.module.id ?? null;
  const sort = ctx.prefs.ui?.modSort ?? null;
  st.modSorted = !!sort;
  const toolbar = h(
    "div",
    { class: "rb-chips", role: "toolbar", "aria-label": "필터" },
    FILTERS.map(([id, label]) => chip(label, { pressed: st.modFilter === id, count: count(id), onClick: () => {
      st.modFilter = id;
      draw(ctx);
    } })),
    trayBtn("정렬", { icon: "preset", value: sortShort(sort), title: sortLabel(sort), open: !!st.modTray, active: !!sort, onClick: () => {
      st.modTray = !st.modTray;
      draw(ctx);
    } }),
    h("div", { class: "rb-spacer" }),
    filtering ? null : btn(multiOf(ctx).active ? "선택 끝" : "선택", { size: "sm", icon: "check", id: "rb-pick-toggle", onClick: () => {
      const mu2 = multiOf(ctx);
      mu2.setMode(!mu2.active);
    } }),
    btn("폴더", { size: "sm", icon: "folderPlus", onClick: () => newFolder(ctx) }),
    btn("새 모듈", { size: "sm", kind: "primary", icon: "plus", onClick: () => newModule(ctx) })
  );
  const sortTray = st.modTray ? tray(
    ...sortChips(sort, (next) => {
      ctx.prefs.saveUi({ modSort: next }).catch(() => {
      });
      draw(ctx);
    }),
    h("span", { class: "rb-muted", style: "font-size:12px;white-space:nowrap" }, sort ? "폴더마다 따로 정렬해요 · 끌어서 순서 바꾸기는 원래대로에서" : "끌어서 정한 순서예요")
  ) : null;
  const inFolder2 = (id) => entries.filter((e) => (meta.mapping[e.module.id] ?? "") === id).length;
  const setView = (v) => {
    st.modFolder = v;
    draw(ctx);
  };
  const folderBar = meta.folders.length ? h(
    "div",
    { class: "rb-chips rb-fchips", role: "toolbar", "aria-label": "폴더별 보기" },
    chip("모든 폴더", { pressed: fv === void 0, onClick: () => setView(void 0) }),
    meta.folders.map((f) => {
      const tint = folderTint(f.color, st.mode);
      const c = chip(
        h("span", { style: "display:inline-flex;align-items:center;gap:6px" }, h("span", { style: { color: tint?.stroke ?? "var(--rb-sub)", display: "flex" } }, icon("folder", 14)), f.name || "(이름 없음)"),
        { pressed: fv === f.id, count: inFolder2(f.id), onClick: () => setView(fv === f.id ? void 0 : f.id) }
      );
      c.dataset.folderView = f.id;
      return c;
    }),
    chip("폴더 없음", { pressed: fv === "", count: inFolder2(""), onClick: () => setView(fv === "" ? void 0 : "") })
  ) : null;
  const list = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "모듈 목록" });
  const grouped = groupByFolder(shown, meta);
  const srt = (arr) => sortBy(arr, sort, (e) => e.module.name ?? "", (e) => moduleSize(e.module));
  for (const g of grouped.folders) g.items = srt(g.items);
  const folders = fv === void 0 ? grouped.folders : [];
  const loose = srt(fv === void 0 ? grouped.loose : shown);
  for (const g of folders) {
    if (filtering && !g.items.length) continue;
    const f = g.folder;
    const tint = folderTint(f.color, ctx.state.mode) ?? { stroke: "var(--rb-sub)", fill: "transparent" };
    const open = filtering || !f.collapsed;
    const head = h(
      "div",
      { style: "display:flex;align-items:center;gap:4px", dataset: filtering ? {} : { dropFolder: f.id } },
      h(
        "button",
        { type: "button", class: "rb-folder", "aria-expanded": open ? "true" : "false", dataset: { folder: f.id }, onClick: () => {
          if (filtering) return;
          ctx.svc.toggleFolder(f.id).catch((err) => ctx.toast(err?.message ?? String(err), { error: true }));
          if (!open) ctx.state.justOpened = f.id;
          draw(ctx);
        } },
        h("span", { class: "chev" }, icon("chevron", 14)),
        h("span", { style: { color: tint.stroke, display: "flex" } }, icon("folder", 16)),
        h("b", null, f.name),
        h("small", null, String(g.items.length))
      ),
      iconBtn("more", `${f.name} 폴더 메뉴`, { onClick: (e) => folderMenu(ctx, f, e.currentTarget) })
    );
    list.appendChild(head);
    if (open) {
      const body = h("div", { class: ["rb-folder-body", ctx.state.justOpened === f.id && "just-opened"] });
      for (const e of g.items) body.appendChild(row(ctx, e, filtering));
      if (!g.items.length) body.appendChild(h("div", { class: "rb-muted", style: "padding:8px 10px" }, "모듈을 여기로 끌어다 놓으세요"));
      list.appendChild(body);
    }
  }
  if (fv !== void 0 && !filtering) list.dataset.dropFolder = fv;
  if (folders.length) list.appendChild(h("div", { class: "rb-label", style: "padding:14px 12px 6px;border-radius:10px", dataset: filtering ? {} : { dropFolder: "" } }, "폴더 없음"));
  for (const e of loose) list.appendChild(row(ctx, e, filtering));
  if (!shown.length) list.appendChild(h("div", { class: "rb-empty" }, fv !== void 0 && !filtering ? '이 폴더에 모듈이 없어요. 폴더 메뉴의 "넣을 모듈 고르기"로 넣을 수 있어요.' : entries.length ? "조건에 맞는 모듈이 없어요." : '설치된 모듈이 없어요. 위의 "가져오기"나 파일을 창에 끌어 놓아서 추가하세요.'));
  const scroll = ctx.main.querySelector(".rb-list")?.scrollTop ?? 0;
  const bar = h("div", { class: "rb-pickbar", role: "toolbar", "aria-label": "고른 모듈" });
  replace(ctx.main, toolbar, sortTray, folderBar, bar, list);
  list.scrollTop = scroll;
  ctx.state.justOpened = null;
  ctx.state.justMoved = null;
  const mu = multiOf(ctx);
  if (filtering) mu.clear();
  mu.bar = bar;
  mu.ctx = ctx;
  mu.attach(list);
  paintBar(ctx);
  showDetail(ctx);
}
function multiOf(ctx) {
  const st = ctx.state;
  st.modMulti ??= createMulti({ onChange: () => paintBar(ctx) });
  return st.modMulti;
}
function paintBar(ctx) {
  const mu = multiOf(ctx), bar = mu.bar;
  if (!bar) return;
  const tb = ctx.main.querySelector("#rb-pick-toggle");
  if (tb) tb.lastChild.textContent = mu.active ? "선택 끝" : "선택";
  bar.hidden = !mu.active;
  if (!mu.active) {
    bar.replaceChildren();
    return;
  }
  const n = mu.sel.size;
  const visible = () => [...ctx.main.querySelectorAll(".rb-list [data-pick]")].map((r) => r.dataset.pick);
  bar.replaceChildren(
    h("b", null, n ? `${n}개 고름` : "고를 모듈을 누르세요"),
    btn("폴더로", { size: "sm", icon: "folder", disabled: !n, onClick: (ev) => pickFolderFor(ctx, mu.ordered(), ev.currentTarget) }),
    btn("폴더 밖으로", { size: "sm", disabled: !n, onClick: () => applyDrop(ctx, mu.ordered(), { folderId: null }) }),
    btn("보이는 것 모두", { size: "sm", onClick: () => {
      const v = visible();
      mu.set(v.every((id) => mu.has(id)) ? [] : v);
    } }),
    iconBtn("x", "고르기 끝내기", { onClick: () => mu.clear() })
  );
}
function pickFolderFor(ctx, ids, anchor) {
  const meta = ctx.prefs.meta;
  openMenu(ctx.win, anchor, [
    ...meta.folders.map((f) => ({ label: f.name || "(이름 없는 폴더)", icon: "folder", onClick: () => applyDrop(ctx, ids, { folderId: f.id }) })),
    meta.folders.length ? "sep" : null,
    { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "새 폴더", label: `고른 모듈 ${ids.length}개를 넣어요`, placeholder: "폴더 이름" });
      if (!n?.trim()) return;
      const f = await ctx.svc.createFolder(n.trim(), FOLDER_SWATCHES[meta.folders.length % FOLDER_SWATCHES.length]);
      await applyDrop(ctx, ids, { folderId: f.id });
    } }
  ].filter(Boolean));
}
function row(ctx, e, filtering) {
  const st = ctx.state, m = e.module, c = moduleCounts(m), f = moduleFlags(m, st.modData.globalOn);
  const meta = [c.lore && `로어 ${c.lore}`, c.regex && `정규식 ${c.regex}`, c.trigger && `트리거 ${c.trigger}`, c.assets && `에셋 ${c.assets}`, ctx.prefs.ui?.modSort?.key === "size" && fmtSize(moduleSize(m))].filter(Boolean).join(" · ") || "비어 있음";
  const color = readableName(ctx.prefs.meta.nameColors?.[m.id], st.mode);
  const sw = switchEl(e.enabled, { label: `${m.name} ${e.enabled ? "끄기" : "켜기"}`, onChange: (on) => toggleEnabled(ctx, e, on, sw) });
  if (!e.enabled && !hasAssets(m)) sw.title = "켜기";
  else if (hasAssets(m)) sw.title = "에셋이 있는 모듈은 끌 수 없어요";
  let grip = null;
  const mu = multiOf(ctx);
  const el = h(
    "div",
    {
      class: ["rb-row", !e.enabled && "off", st.justMoved?.includes(m.id) && "just-moved"],
      role: "option",
      tabindex: "0",
      "aria-selected": st.modSel === m.id ? "true" : "false",
      dataset: filtering ? { id: m.id } : st.modSorted ? { id: m.id, pick: m.id } : { id: m.id, dropRow: m.id, pick: m.id },
      onClick: (ev) => {
        if (!filtering && mu.click(ev, m.id, st.modSel)) return;
        select(ctx, m.id, el);
      },
      onKeydown: (ev) => {
        if (ev.target !== el) return;
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          select(ctx, m.id, el);
        }
        if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
          ev.preventDefault();
          move(ctx, m.id, ev.key === "ArrowUp" ? -1 : 1);
        }
        if (!ev.altKey && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) {
          ev.preventDefault();
          const rows = [...ctx.main.querySelectorAll(".rb-row")];
          rows[rows.indexOf(el) + (ev.key === "ArrowDown" ? 1 : -1)]?.focus();
        }
      }
    },
    filtering ? null : h("span", { class: "rb-mcb", role: "checkbox", "aria-checked": "false", "aria-label": `${m.name} 고르기` }),
    filtering ? null : grip = h("span", { class: "grip", title: "끌어서 순서 바꾸기 (Alt+↑↓) · Ctrl/⌘·Shift+클릭으로 여러 개", "aria-hidden": "true" }, icon("grip", 14)),
    h(
      "div",
      { class: "txt" },
      h(
        "div",
        { class: "ttl" },
        h("span", { class: "name", style: color && e.enabled ? { color } : null }, m.name || "(이름 없음)"),
        f.global && badge("전역", "acc"),
        f.lla && badge("LLA", "warn"),
        f.mcp && badge("MCP", "ok"),
        !e.enabled && badge("꺼짐", "mute")
      ),
      h("span", { class: "meta" }, meta)
    ),
    sw,
    iconBtn("more", `${m.name} 메뉴`, { onClick: (ev) => {
      ev.stopPropagation();
      moduleMenu(ctx, e, ev.currentTarget);
    } })
  );
  if (!filtering) {
    queueMicrotask(() => {
      const list = el.closest(".rb-list");
      if (list) gripDrag({ grip, row: el, root: list, scroller: list, count: () => mu.dragIds(m.id).length, skip: (t) => mu.dragIds(m.id).includes(t.getAttribute("data-drop-row")), onDrop: (d) => applyDrop(ctx, mu.dragIds(m.id), d) });
    });
  }
  return el;
}
function select(ctx, id, el) {
  ctx.state.modSel = id;
  ctx.main.querySelectorAll(".rb-row[aria-selected=true]").forEach((r) => r.setAttribute("aria-selected", "false"));
  el?.setAttribute("aria-selected", "true");
  showDetail(ctx);
  if (ctx.isMobile()) ctx.openSheet();
}
async function toggleEnabled(ctx, e, on, sw) {
  setSwitch(sw, on);
  try {
    await ctx.svc.run("setEnabled", e.module.id, on);
    ctx.toast(on ? `'${e.module.name}'을(를) 켰어요` : `'${e.module.name}'을(를) 껐어요`, on ? {} : { action: { label: "되돌리기", run: () => ctx.svc.run("setEnabled", e.module.id, true).then(() => reload(ctx)) }, seconds: 8 });
    await reload(ctx);
  } catch (err) {
    setSwitch(sw, !on);
    ctx.toast(err?.message ?? String(err), { error: true });
  }
}
export async function reload(ctx) {
  ctx.state.modDirty = true;
  ctx.state.modData = await ctx.svc.load();
  ctx.state.modIndex = new Map(ctx.state.modData.entries.map((e) => [e.module.id, searchText(e.module)]));
  ctx.state.modDirty = false;
  if (ctx.state.tab === "modules") draw(ctx);
}
var dragIds = null;
function dragSource(ctx, el, id) {
  el.addEventListener("dragstart", (ev) => {
    dragIds = multiOf(ctx).dragIds(id);
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/x-rbm-module", dragIds.join("\n"));
    if (dragIds.length > 1) {
      const g = el.cloneNode(true);
      Object.assign(g.style, { position: "absolute", top: "-1000px", left: "0", width: `${el.offsetWidth}px`, background: "var(--rb-surf2)", borderRadius: "12px" });
      g.appendChild(dragBadge(el.ownerDocument, dragIds.length));
      ctx.win.appendChild(g);
      ev.dataTransfer.setDragImage(g, 24, 20);
      setTimeout(() => g.remove(), 0);
      ctx.main.querySelectorAll(".rb-row.picked").forEach((r) => {
        r.style.opacity = "0.5";
      });
    }
    el.style.opacity = "0.5";
  });
  el.addEventListener("dragend", () => {
    dragIds = null;
    ctx.main.querySelectorAll(".rb-row").forEach((r) => {
      r.style.opacity = "";
    });
    ctx.main.querySelectorAll("[data-drop]").forEach((x) => {
      x.removeAttribute("data-drop");
      x.style.boxShadow = "";
    });
  });
}
function dropTarget(ctx, el, { beforeId, folderId, onlySelf }) {
  const ok = (ev) => dragIds && [...ev.dataTransfer?.types ?? []].includes("text/x-rbm-module") && (!onlySelf || ev.target === el) && !(beforeId && dragIds.includes(beforeId));
  el.addEventListener("dragover", (ev) => {
    if (!ok(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const after = beforeId && ev.offsetY > el.clientHeight / 2;
    const d = after ? "after" : "before";
    if (el.dataset.drop === d) return;
    el.dataset.drop = d;
    el.style.boxShadow = beforeId ? after ? "inset 0 -2px 0 var(--rb-acc-text)" : "inset 0 2px 0 var(--rb-acc-text)" : "inset 0 0 0 2px var(--rb-sel-ring)";
  });
  el.addEventListener("dragleave", (ev) => {
    if (el.contains(ev.relatedTarget)) return;
    el.style.boxShadow = "";
    el.removeAttribute("data-drop");
  });
  el.addEventListener("drop", (ev) => {
    if (!ok(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const ids = dragIds, after = el.dataset.drop === "after";
    el.style.boxShadow = "";
    el.removeAttribute("data-drop");
    if (!ids?.length) return;
    applyDrop(ctx, ids, { beforeId, after, folderId });
  });
}
function applyDrop(ctx, ids, { beforeId, after, folderId }) {
  ids = [].concat(ids);
  if (beforeId && ids.includes(beforeId)) return;
  const st = ctx.state, meta = ctx.prefs.meta;
  const fail = (err) => {
    ctx.toast(`옮기지 못했어요: ${err?.message ?? err}`, { error: true });
    reload(ctx);
  };
  const target = beforeId ? meta.mapping[beforeId] ?? null : folderId ?? null;
  const moveFolder2 = ids.filter((id) => (meta.mapping[id] ?? null) !== target);
  if (moveFolder2.length) ctx.svc.setFolder(moveFolder2, target).catch(fail);
  if (beforeId) {
    const before = st.modData.entries.map((e) => e.module.id);
    const next = placeIds(before, ids, beforeId, after);
    if (next.join("\n") !== before.join("\n")) {
      const pos = new Map(next.map((id, i) => [id, i]));
      st.modData.entries.sort((a, b) => pos.get(a.module.id) - pos.get(b.module.id));
      ctx.svc.queueOrder(() => ctx.state.modData.entries.map((e) => e.module.id)).catch(fail);
    }
  }
  st.justMoved = ids;
  if (ids.length > 1) ctx.toast(target ? `모듈 ${ids.length}개를 '${meta.folders.find((f) => f.id === target)?.name ?? "폴더"}'(으)로 옮겼어요` : `모듈 ${ids.length}개를 옮겼어요`);
  draw(ctx);
}
async function move(ctx, id, dir) {
  if (ctx.state.modSorted) {
    ctx.toast("정렬 중이라 순서를 바꿀 수 없어요. 정렬에서 원래대로를 누른 뒤 바꿔 주세요.");
    return;
  }
  const meta = ctx.prefs.meta;
  const entries = ctx.state.modData.entries;
  const group = entries.filter((e) => (meta.mapping[e.module.id] ?? null) === (meta.mapping[id] ?? null)).map((e) => e.module.id);
  const i = group.indexOf(id), j = i + dir;
  if (j < 0 || j >= group.length) return;
  const ids = entries.map((e) => e.module.id).filter((x) => x !== id);
  const at = ids.indexOf(group[j]) + (dir > 0 ? 1 : 0);
  ids.splice(at, 0, id);
  await ctx.svc.run("reorder", ids);
  await reload(ctx);
  ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(id)}"]`)?.focus();
}
function moduleMenu(ctx, e, anchor) {
  const m = e.module;
  openMenu(ctx.win, anchor, [
    { label: "편집", icon: "edit", onClick: () => ctx.openEditor(m.id) },
    { label: "에셋 관리", icon: "image", onClick: () => ctx.openAssets(m.id) },
    "sep",
    { label: "이름 색", icon: "palette", onClick: () => pickNameColor(ctx, m) },
    { label: "폴더로 옮기기", icon: "folder", onClick: () => pickFolder(ctx, m) },
    { label: "위로", icon: "up", onClick: () => move(ctx, m.id, -1) },
    { label: "아래로", icon: "down", onClick: () => move(ctx, m.id, 1) },
    "sep",
    { label: ".risum으로 내보내기", icon: "download", onClick: () => exportRisum(ctx, m) },
    isDev(ctx) && !findProject(ctx, "module", m.id) ? { label: "개발 목록에 넣기", icon: "code", onClick: async () => {
      await addProjects(ctx, [{ kind: "module", id: m.id }]);
      ctx.state.devSel = `m:${m.id}`;
      ctx.toast(`'${m.name}'을(를) 개발 목록에 넣었어요`, { action: { label: "개발 탭", run: () => ctx.go("dev") } });
    } } : null,
    isDev(ctx) ? { label: "패치 만들기 (개발자)", icon: "code", onClick: () => openPatchMaker(ctx, { kind: "module", key: `m:${m.id}`, id: m.id, name: m.name ?? "" }) } : { label: "내 수정만 내보내기 (.rbupatch)", icon: "download", onClick: () => exportMyChanges(ctx, "module", m) },
    { label: "패치 적용…", icon: "upload", onClick: () => applyPatchFile(ctx, "module", async () => (await ctx.svc.load()).entries.find((x) => x.module.id === m.id)?.module ?? m, async (res, cur) => {
      await ctx.svc.run("update", m.id, changedKeys(cur, res));
      await reload(ctx);
    }) },
    { label: "JSON 복사", icon: "link", onClick: async () => ctx.toast(await copyText(moduleJson(m)) ? "JSON을 복사했어요" : "복사하지 못했어요", { error: false }) },
    { label: "이름 바꾸기", icon: "edit", onClick: () => renameModule(ctx, m) },
    "sep",
    { label: "삭제", icon: "trash", danger: true, onClick: () => removeModule(ctx, m) }
  ]);
}
function folderMenu(ctx, f, anchor) {
  openMenu(ctx.win, anchor, [
    { label: "넣을 모듈 고르기…", icon: "plus", onClick: () => pickFolderMembers(ctx, f) },
    { label: "이름 바꾸기", icon: "edit", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "폴더 이름", value: f.name });
      if (n?.trim()) {
        await ctx.svc.renameFolder(f.id, n.trim());
        draw(ctx);
      }
    } },
    { label: "폴더 색", icon: "palette", onClick: async () => {
      const c = await colorDialog(ctx.win, { title: "폴더 색", swatches: FOLDER_SWATCHES, value: f.color, previewText: f.name });
      if (c !== null) {
        await ctx.svc.colorFolder(f.id, c);
        draw(ctx);
      }
    } },
    { label: "위로", icon: "up", onClick: async () => {
      await ctx.svc.moveFolder(f.id, -1);
      draw(ctx);
    } },
    { label: "아래로", icon: "down", onClick: async () => {
      await ctx.svc.moveFolder(f.id, 1);
      draw(ctx);
    } },
    "sep",
    { label: "폴더 삭제 (모듈은 남음)", icon: "trash", danger: true, onClick: async () => {
      if (await confirmDialog(ctx.win, { title: `'${f.name}' 폴더를 지울까요?`, body: '안에 있던 모듈은 지워지지 않고 "폴더 없음"으로 옮겨져요.', ok: "폴더 삭제", danger: true })) {
        await ctx.svc.deleteFolder(f.id);
        draw(ctx);
      }
    } }
  ]);
}
function moduleItems(ctx) {
  const meta = ctx.prefs.meta, names = new Map(meta.folders.map((f) => [f.id, f.name]));
  return ctx.state.modData.entries.map((e) => ({
    id: e.module.id,
    label: e.module.name,
    folder: meta.mapping[e.module.id] ?? null,
    sub: [meta.mapping[e.module.id] ? `지금: ${names.get(meta.mapping[e.module.id]) ?? "폴더"}` : "폴더 없음", !e.enabled && "꺼짐"].filter(Boolean).join(" · ")
  }));
}
async function newFolder(ctx) {
  const r = await folderDialog(ctx.win, { title: "새 폴더", items: moduleItems(ctx), noun: "모듈", ...folderPickPrefs(ctx) });
  if (!r) return;
  const f = await ctx.svc.createFolder(r.name, FOLDER_SWATCHES[ctx.prefs.meta.folders.length % FOLDER_SWATCHES.length]);
  if (r.ids.length) await ctx.svc.setFolder(r.ids, f.id);
  draw(ctx);
  ctx.toast(`'${r.name}' 폴더를 만들었어요${r.ids.length ? ` (모듈 ${r.ids.length}개)` : ""}`);
}
async function pickFolderMembers(ctx, f) {
  const before = Object.entries(ctx.prefs.meta.mapping).filter(([, v]) => v === f.id).map(([k]) => k);
  const r = await folderDialog(ctx.win, { title: `'${f.name}' 폴더에 넣을 모듈`, items: moduleItems(ctx), checked: before, ok: "저장", withName: false, noun: "모듈", current: f.id, ...folderPickPrefs(ctx) });
  if (!r) return;
  const out = before.filter((id) => !r.ids.includes(id));
  if (out.length) await ctx.svc.setFolder(out, null);
  if (r.ids.length) await ctx.svc.setFolder(r.ids, f.id);
  draw(ctx);
}
async function newModule(ctx) {
  const n = await promptDialog(ctx.win, { title: "새 모듈", label: "모듈 이름", placeholder: "예: 내 로어북" });
  if (!n?.trim()) return;
  const m = ctx.svc.newModule(n.trim());
  await ctx.svc.run("create", m);
  ctx.state.modSel = m.id;
  await reload(ctx);
  ctx.toast(`'${m.name}' 모듈을 만들었어요`);
}
async function renameModule(ctx, m) {
  const n = await promptDialog(ctx.win, { title: "모듈 이름", value: m.name });
  if (!n?.trim() || n.trim() === m.name) return;
  await ctx.svc.run("update", m.id, { name: n.trim() });
  await reload(ctx);
}
async function pickNameColor(ctx, m) {
  const c = await colorDialog(ctx.win, { title: "이름 색", swatches: NAME_SWATCHES, value: ctx.prefs.meta.nameColors?.[m.id] ?? "", previewText: m.name });
  if (c === null) return;
  await ctx.svc.setNameColor(m.id, c);
  draw(ctx);
}
async function pickFolder(ctx, m) {
  const meta = ctx.prefs.meta;
  if (!meta.folders.length) {
    await newFolder(ctx);
    if (!ctx.prefs.meta.folders.length) return;
  }
  const anchor = ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(m.id)}"] .rb-icon-btn`) ?? ctx.main;
  openMenu(ctx.win, anchor, [
    ...ctx.prefs.meta.folders.map((f) => ({ label: (meta.mapping[m.id] === f.id ? "✓ " : "") + f.name, icon: "folder", onClick: async () => {
      await ctx.svc.setFolder(m.id, f.id);
      draw(ctx);
    } })),
    "sep",
    { label: "폴더에서 빼기", icon: "x", onClick: async () => {
      await ctx.svc.setFolder(m.id, null);
      draw(ctx);
    } },
    { label: "새 폴더…", icon: "folderPlus", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "새 폴더", label: "폴더 이름" });
      if (n?.trim()) {
        const f = await ctx.svc.createFolder(n.trim(), FOLDER_SWATCHES[meta.folders.length % FOLDER_SWATCHES.length]);
        await ctx.svc.setFolder(m.id, f.id);
        draw(ctx);
      }
    } }
  ]);
}
async function removeModule(ctx, m) {
  const ok = await confirmDialog(ctx.win, { title: `'${m.name}'을(를) 지울까요?`, body: '모든 캐릭터·채팅·페르소나 연결에서도 빠져요. 지우기 전 상태는 백업해 두니 "기록" 탭에서 되살릴 수 있어요.', ok: "삭제", danger: true });
  if (!ok) return;
  try {
    await createStore(ctx.api).addBackup({ kind: "module", target: m.id, name: m.name, snapshot: m, note: "삭제 전" });
  } catch (err) {
    if (!await confirmDialog(ctx.win, { title: "백업을 만들지 못했어요", body: `${err?.message ?? err}
그래도 지울까요?`, ok: "그래도 삭제", danger: true })) return;
  }
  await vanish(ctx.main.querySelector(`.rb-row[data-id="${CSS.escape(m.id)}"]`));
  await ctx.svc.run("remove", m.id);
  await reload(ctx);
  ctx.toast(`'${m.name}'을(를) 지웠어요`);
}
async function exportRisum(ctx, m) {
  const t = ctx.toast(`'${m.name}' 내보내는 중…`, { seconds: 60 });
  try {
    const blob = await buildRisum(m, (p) => ctx.assets.read(p));
    download(`${safeFileName(m.name)}.risum`, blob);
    t.close();
    ctx.toast("내보냈어요");
  } catch (err) {
    t.close();
    ctx.toast(`내보내지 못했어요: ${err?.message ?? err}`, { error: true });
  }
}
async function showDetail(ctx) {
  const st = ctx.state, data = st.modData;
  const e = data?.entries.find((x) => x.module.id === st.modSel);
  if (!e) {
    ctx.showDetail(h("div", { class: "rb-empty" }, "모듈을 고르면 여기에 자세히 보여요."));
    return;
  }
  const m = e.module, c = moduleCounts(m), f = moduleFlags(m, data.globalOn);
  const stat = (label, v) => h("div", { class: "rb-stat" }, h("small", null, label), h("b", null, String(v)));
  const globalSw = switchEl(f.global, { label: "글로벌 활성화", disabled: !e.enabled, onChange: async (on) => {
    setSwitch(globalSw, on);
    try {
      await ctx.svc.run("setGlobal", m.id, on);
      await reload(ctx);
    } catch (err) {
      setSwitch(globalSw, !on);
      ctx.toast(err?.message ?? String(err), { error: true });
    }
  } });
  const links = h(
    "div",
    { class: "rb-card" },
    h("div", { class: "rb-kv" }, h("span", null, "글로벌 활성화", h("br"), h("small", { class: "rb-muted" }, "모든 캐릭터·채팅에서 켜짐")), globalSw)
  );
  const personaBox = h("div", { class: "rb-card" }, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted", style: "display:flex;align-items:center;gap:8px" }, spinner(), "불러오는 중")));
  const charBox = h("div", { class: "rb-card" });
  const chatBox = h("div", { class: "rb-card" });
  const timeline = h("div", { style: "display:flex;flex-direction:column" });
  ctx.showDetail(
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:6px" },
      m.namespace ? h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, m.namespace) : null,
      h("h2", { class: "rb-h2", style: readableName(ctx.prefs.meta.nameColors?.[m.id], st.mode) ? { color: readableName(ctx.prefs.meta.nameColors[m.id], st.mode) } : null }, m.name || "(이름 없음)"),
      m.description ? h("p", { class: "rb-p", style: "white-space:pre-line;max-height:120px;overflow:auto" }, m.description) : null,
      !e.enabled ? note("info", "꺼진 모듈이에요. 켜면 다시 연결할 수 있어요.") : null
    ),
    h("div", { class: "rb-stats" }, stat("로어북", c.lore), stat("정규식", c.regex), stat("트리거", c.trigger), stat("에셋", c.assets)),
    h(
      "div",
      { class: "rb-field" },
      h("span", { class: "rb-label" }, "연결"),
      links,
      h("span", { class: "rb-label", style: "margin-top:6px" }, "페르소나 — 그 페르소나를 쓰는 동안 자동으로 켜짐"),
      personaBox,
      h("span", { class: "rb-label", style: "margin-top:6px" }, "캐릭터 — 그 캐릭터의 모든 채팅에서 켜짐"),
      charBox,
      h("span", { class: "rb-label", style: "margin-top:6px" }, "지금 채팅"),
      chatBox
    ),
    h("div", { class: "rb-field" }, h(
      "div",
      { style: "display:flex;align-items:center" },
      h("span", { class: "rb-label", style: "flex:1" }, "버전 타임라인"),
      h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: (ev) => {
        ev.preventDefault();
        ctx.state.histTarget = m.id;
        ctx.go("history");
      } }, "전체 보기")
    ), timeline),
    h("div", { style: "flex:1" }),
    h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("편집", { kind: "primary", size: "lg", icon: "edit", onClick: () => ctx.openEditor(m.id) }),
      btn("에셋", { size: "lg", icon: "image", onClick: () => ctx.openAssets(m.id) }),
      btn("내보내기", { size: "lg", icon: "download", onClick: () => exportRisum(ctx, m) })
    ),
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("삭제", { kind: "danger", size: "lg", icon: "trash", onClick: () => removeModule(ctx, m) }))
  );
  (async () => {
    const [db, pm] = await Promise.all([ctx.api.getDatabase(["personas"]), loadPersonaMap(ctx.api)]);
    const personas = (db?.personas ?? []).filter((p) => p?.id);
    const linked = (p) => (pm.map[p.id] ?? []).includes(m.id);
    personas.sort((a, b) => Number(linked(b)) - Number(linked(a)));
    const box = h("div", { class: "rb-scroll", style: "max-height:232px;overflow:auto;overscroll-behavior:contain", id: "rb-persona-box" });
    const q = personas.length > 6 ? h("input", { class: "rb-input", type: "search", placeholder: `페르소나 ${personas.length}개에서 찾기`, "aria-label": "페르소나 찾기", style: "height:36px;border-radius:0;border-width:0 0 1px 0" }) : null;
    const rows = personas.length ? personas.map((p) => {
      const on = (pm.map[p.id] ?? []).includes(m.id);
      const sw = switchEl(on, { label: `${p.name} 페르소나에 연결`, disabled: !e.enabled, onChange: async (v) => {
        setSwitch(sw, v);
        try {
          await setPersonaLink(ctx.api, p.id, m.id, v, data.entries.map((x) => x.module.id));
          ctx.onPersonaChanged?.();
          ctx.toast(v ? `'${p.name}' 페르소나를 쓰면 켜져요` : `'${p.name}' 연결을 풀었어요`);
        } catch (err) {
          setSwitch(sw, !v);
          ctx.toast(err?.message ?? String(err), { error: true });
        }
      } });
      const r = h("div", { class: "rb-kv" }, h("span", null, p.name || "(이름 없음)"), sw);
      r.dataset.name = String(p.name ?? "").toLowerCase();
      return r;
    }) : [h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "페르소나가 없어요"))];
    box.append(...rows);
    q?.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      for (const r of rows) r.hidden = !!v && !r.dataset.name?.includes(v);
    });
    replace(personaBox, q, box);
  })().catch(() => replace(personaBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "페르소나를 읽지 못했어요"))));
  const loadChars = async () => {
    replace(charBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted", style: "display:flex;align-items:center;gap:8px" }, spinner(), "캐릭터 불러오는 중")));
    const db = await ctx.api.getDatabase(["characters"]);
    db.characters = (await loadCharacters(ctx.api, db?.characters)).list;
    const chars = (db?.characters ?? []).map((ch, i) => ({ ch, i })).filter((x) => x.ch && !x.ch.trashTime && x.ch.type !== "group");
    const linked = chars.filter((x) => x.ch.modules?.includes(m.id));
    const filterBox = h("input", { class: "rb-input", style: "height:36px;margin:8px 14px;width:calc(100% - 28px)", placeholder: "캐릭터 검색", "aria-label": "캐릭터 검색" });
    const listEl = h("div", { class: "rb-scroll", style: "max-height:240px" });
    const paint = () => {
      const q = filterBox.value.trim().toLowerCase();
      replace(listEl, chars.filter((x) => !q || String(x.ch.name ?? "").toLowerCase().includes(q)).slice(0, 200).map(({ ch, i }) => {
        const on = ch.modules?.includes(m.id) ?? false;
        const sw = switchEl(on, { label: `${ch.name}에 연결`, disabled: !e.enabled, onChange: async (v) => {
          setSwitch(sw, v);
          try {
            await ctx.svc.run("setCharacterLink", i, m.id, v);
            ch.modules = v ? [...ch.modules ?? [], m.id] : (ch.modules ?? []).filter((x) => x !== m.id);
          } catch (err) {
            setSwitch(sw, !v);
            ctx.toast(err?.message ?? String(err), { error: true });
          }
        } });
        return h("div", { class: "rb-kv" }, h("span", null, ch.name || "(이름 없음)"), sw);
      }));
    };
    filterBox.addEventListener("input", paint);
    replace(charBox, h("div", { class: "rb-kv" }, h("span", null, `연결된 캐릭터 ${linked.length}명`), h("span", null, linked.slice(0, 3).map((x) => x.ch.name).join(", ") + (linked.length > 3 ? " 외" : ""))), filterBox, listEl);
    paint();
  };
  replace(charBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "캐릭터 목록은 눌러서 불러와요"), btn("불러오기", { size: "sm", onClick: () => loadChars().catch((err) => ctx.toast(err?.message ?? String(err), { error: true })) })));
  (async () => {
    const ci = await ctx.api.getCurrentCharacterIndex(), chi = await ctx.api.getCurrentChatIndex?.();
    if (ci < 0 || chi === void 0 || chi < 0) {
      replace(chatBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "열린 채팅이 없어요")));
      return;
    }
    const chat = await ctx.api.getChatFromIndex(ci, chi);
    const on = chat?.modules?.includes(m.id);
    replace(chatBox, h(
      "div",
      { class: "rb-kv" },
      h("span", null, on ? "이 채팅에서 켜짐" : "이 채팅에는 따로 연결 안 됨", h("br"), h("small", { class: "rb-muted" }, "채팅 연결 추가는 RisuAI 채팅 화면에서 해요")),
      on ? btn("이 채팅에서 해제", { size: "sm", onClick: async () => {
        await ctx.svc.run("unlinkChat", ci, chi, m.id);
        ctx.toast("이 채팅에서 해제했어요");
        showDetail(ctx);
      } }) : null
    ));
  })().catch(() => replace(chatBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "채팅 정보를 읽지 못했어요"))));
  (async () => {
    const list = (await createStore(ctx.api).listBackups()).filter((b) => b.target === m.id).slice(0, 3);
    replace(timeline, list.length ? list.map((b, i) => h(
      "div",
      { style: "display:flex;gap:12px" },
      h(
        "div",
        { style: "display:flex;flex-direction:column;align-items:center;width:12px" },
        h("span", { style: `width:12px;height:12px;border-radius:999px;margin-top:3px;flex-shrink:0;${i === 0 ? "background:var(--rb-deco-grad)" : "box-shadow:inset 0 0 0 2px var(--rb-line3)"}` }),
        h("span", { style: "width:2px;flex:1;background:var(--rb-line)" })
      ),
      h(
        "div",
        { style: "flex:1;padding-bottom:14px;display:flex;flex-direction:column;gap:2px" },
        h("div", { style: "display:flex;gap:8px;align-items:baseline" }, h("span", { style: "font-size:13px;font-weight:600" }, b.note || "업데이트 전"), h("span", { class: "rb-muted" }, fmtWhen(b.t))),
        b.summary ? h("span", { class: "rb-muted" }, b.summary) : null
      )
    )) : h("div", { class: "rb-muted", style: "padding:12px 14px;border-radius:12px;border:1px dashed var(--rb-line)" }, "아직 기록이 없어요. 이 플러그인으로 업데이트하거나 편집하면 쌓여요."));
  })().catch(() => {
  });
}
