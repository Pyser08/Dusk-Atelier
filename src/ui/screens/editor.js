import { CBS } from '../cbs.js';
import { codeEditor } from '../codeedit.js';
import { regexRun } from '../../engine/devcheck.js';
import { newId, stableJson } from '../../engine/util.js';
import { createStore } from '../../engine/store.js';
import { copyText, h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, folderDialog, folderPickPrefs, iconBtn, loading, note, openMenu, promptDialog, segmented, switchEl } from '../kit.js';
import { gripDrag } from '../sortable.js';
import { entryPicker } from '../entrypicker.js';
import { sortLoreByName } from '../../engine/lorelist.js';
import { estimateTokens } from '../../engine/memoryinject.js';
import { reload } from './modules.js';
import { attachUndo } from '../undo.js';
import { openAiPopup, loadPopupGeom } from './aibuild.js';
import { bbInstalled } from '../../engine/firstrun.js';
import { attachProbPick } from '../probpick.js';
import { segments, summarize } from '../../engine/regexview.js';
import { parseVars, serializeVars, duplicateKeys } from '../../engine/vars.js';
import { openLoreDusk } from './loredusk.js';
import { AFF_PREFIX, COND_TYPES, PLACE_PREFIX, SET_OPS, VAR_OPS, affName, affOf, affsOf, ancestorsOf, applySets, bodyOf, checkExpr, collectManaged, defaultAff, defaultRule, evaluate, folderIdOf, folderMap, gateVar, isAff, isDuskFolder, isFolder, isManaged, isPlace, nativeContent, parentOf, placeLinks, plainContent, ridOf, ruleOf, validateRules } from '../../engine/lorerules.js';
import { FOLDER_SWATCHES, folderTint } from '../theme.js';
// 관리 항목의 내용 머리(@@activate·{{#if}})를 규칙에 맞춘다
export function syncRuleContent(lorebook) {
  // 리스의 복제 등으로 같은 식별자가 두 항목에 있으면 뒤쪽에 새 식별자를 준다 (연쇄·조건 대상은 다시 골라야 한다)
  const seen = new Set();
  for (const l of lorebook ?? []) {
    const id = ridOf(l);
    if (!id) continue;
    if (seen.has(id)) l.extentions = { ...l.extentions, da_rid: newId() };
    seen.add(ridOf(l));
  }
  // Dusk 폴더·소속·장소 정리
  const fmap = folderMap(lorebook);
  for (const l of lorebook ?? []) {
    if (isDuskFolder(l) && !isAff(l)) {
      // 그냥 폴더는 리스가 건너뛰게 키·내용을 비운다
      l.key = "";
      l.alwaysActive = false;
      if (l.mode === "constant") l.mode = "normal";
    }
    if (isAff(l) && !String(l.comment ?? "").startsWith(AFF_PREFIX)) l.comment = AFF_PREFIX + affName(l);
    if (isPlace(l) && !String(l.comment ?? "").startsWith(PLACE_PREFIX)) l.comment = PLACE_PREFIX + affName(l);
    // 소속 폴더·장소·소속 안 항목은 Dusk 규칙이 있어야 소속과 함께 켜진다
    if (!isFolder(l) || isAff(l)) {
      if (isAff(l) || isPlace(l) || affsOf(l, fmap).length) enableRule(l, lorebook);
    }
  }
  for (const l of lorebook ?? []) {
    const r = ruleOf(l);
    if (r && r.on !== false && ridOf(l)) {
      l.content = nativeContent(l.content, r, ridOf(l));
      // 리스는 키가 비어 있고 '항상 켜짐'도 아닌 항목을 @@ 장식을 읽기 전에 건너뛴다. 키 없는 관리 항목은 항상 켜짐으로 둔다(켜질지는 {{#if}}가 정함)
      if (!String(l.key ?? "").trim() && !l.alwaysActive && l.mode !== "constant") {
        l.alwaysActive = true;
        l.extentions = { ...l.extentions, da_aa: true };
      }
    }
  }
}

// 항목에 Dusk 규칙을 켠다 (소속 구성원으로 넣을 때 등). 이미 켜져 있으면 식별자만 확인한다
export function enableRule(l, lorebook) {
  l.extentions = { ...(l.extentions ?? {}) };
  l.extentions.da_rid ||= newId();
  if ((lorebook ?? []).some((x) => x !== l && ridOf(x) === l.extentions.da_rid)) l.extentions.da_rid = newId();
  if (isManaged(l)) return l.extentions.da_rid;
  const nr = { ...(ruleOf(l) ?? defaultRule()), on: true };
  if ((l.alwaysActive && !l.extentions?.da_aa) || l.mode === "constant") nr.cond = [];
  l.extentions.da_rule = nr;
  l.content = nativeContent(l.content, nr, l.extentions.da_rid);
  return l.extentions.da_rid;
}
export function disableRule(l) {
  l.extentions = { ...(l.extentions ?? {}) };
  delete l.extentions.da_rule;
  if (l.extentions.da_aa) {
    l.alwaysActive = false;
    delete l.extentions.da_aa;
  }
  l.content = plainContent(l.content);
}
// 폴더 색: 정해 둔 색, 없으면 폴더 순서대로 자동
export function folderColorOf(f, lorebook) {
  const c = f?.extentions?.da_folder?.color;
  if (c) return c;
  const all = (lorebook ?? []).filter(isFolder);
  const i = Math.max(0, all.indexOf(f));
  return FOLDER_SWATCHES[i % FOLDER_SWATCHES.length];
}
export function newFolderEntry(name, lorebook, { aff = false } = {}) {
  const id = newId();
  const n = (lorebook ?? []).filter(isDuskFolder).length;
  const e = { key: "", secondkey: "", insertorder: 100, comment: (aff ? AFF_PREFIX : "") + name, content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { da_folder: { id, color: FOLDER_SWATCHES[n % FOLDER_SWATCHES.length], ...(aff ? { aff: defaultAff() } : {}) } } };
  if (aff) enableRule(e, lorebook);
  return e;
}
export function newPlaceEntry() {
  const rid = newId();
  const rule = { ...defaultRule(), on: true };
  return { key: "", secondkey: "", insertorder: 100, comment: PLACE_PREFIX + "새 장소", content: nativeContent("", rule, rid), mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { da_rid: rid, da_rule: rule, da_place: { links: [] } } };
}
var LORE_MODES = [["normal", "일반"], ["constant", "항상 켜짐"], ["multiple", "여러 키"], ["child", "하위"], ["folder", "폴더"]];
var REGEX_TYPES = [["editinput", "입력 수정"], ["editoutput", "출력 수정"], ["editprocess", "요청 데이터 수정"], ["editdisplay", "화면 표시 수정"], ["edittrans", "번역 표시 수정"], ["disabled", "사용 안 함"]];
var TRIGGER_TYPES = [["start", "채팅 시작"], ["input", "입력할 때"], ["output", "출력할 때"], ["display", "화면 표시"], ["request", "요청할 때"], ["manual", "수동(버튼)"]];
var newLore = () => ({ key: "", secondkey: "", insertorder: 100, comment: "새 항목", content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false });
var newLoreFolder = () => ({ key: "folder:" + newId(), comment: "새 폴더", content: "", mode: "folder", insertorder: 100, alwaysActive: false, secondkey: "", selective: false });
var newRegex = () => ({ comment: "새 정규식", in: "", out: "", type: "editoutput", flag: "g", ableFlag: false });
var newTrigger = () => ({ comment: "새 트리거", type: "output", conditions: [], effect: [{ type: "triggerlua", code: "" }], lowLevelAccess: false });
var DIV = /^\s*[-=─━═~*#_—–·•+<>]{2,}|[-=─━═~*#_—–·•+<>]{2,}\s*$/;
var isDividerName = (s) => DIV.test(String(s ?? ""));
var isLoreDivider = (l) => !String(l?.key ?? "").trim() && !l?.alwaysActive && l?.mode !== "constant" && (isDividerName(l?.comment) || !String(l?.content ?? "").trim());
var isRegexDivider = (r) => !r?.in && (isDividerName(r?.comment) || !String(r?.out ?? "").trim());
export function validateModule(m) {
  const out = [];
  if (!String(m.name ?? "").trim()) out.push({ level: "err", tab: "info", msg: "이름이 비어 있어요" });
  (m.lorebook ?? []).forEach((l, i) => {
    if (l.mode === "folder" || isDuskFolder(l) || isLoreDivider(l)) return;
    if (!l.alwaysActive && l.mode !== "constant" && !String(l.key ?? "").trim()) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 활성화 키가 없고 항상 켜짐도 아니라서 쓰이지 않아요` });
    if (l.useRegex) for (const k of String(l.key ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      const mm = /^\/(.*)\/([a-z]*)$/s.exec(k);
      if (!mm) {
        out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 키는 /패턴/플래그 모양이어야 해요` });
        continue;
      }
      try {
        new RegExp(mm[1], mm[2]);
      } catch (e) {
        out.push({ level: "err", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 정규식 오류 — ${e.message}` });
      }
    }
    if (l.folder && !(m.lorebook ?? []).some((f) => f.mode === "folder" && f.key === l.folder)) out.push({ level: "warn", tab: "lorebook", index: i, msg: `로어북 '${l.comment || i + 1}': 없는 폴더에 들어 있어요` });
  });
  (m.regex ?? []).forEach((r, i) => {
    if (isRegexDivider(r)) return;
    if (!r.in) {
      out.push({ level: "warn", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': 찾을 패턴이 비어 있어요` });
      return;
    }
    if (String(r.in).includes("{{")) return;
    try {
      new RegExp(r.in, String(r.ableFlag ? r.flag ?? "" : "g").replace(/[^dgimsuyv]/g, ""));
    } catch (e) {
      out.push({ level: "err", tab: "regex", index: i, msg: `정규식 '${r.comment || i + 1}': ${e.message}` });
    }
  });
  (m.trigger ?? []).forEach((t, i) => {
    if (!Array.isArray(t.conditions)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': conditions가 배열이 아니에요` });
    if (!Array.isArray(t.effect)) out.push({ level: "err", tab: "trigger", index: i, msg: `트리거 '${t.comment || i + 1}': effect가 배열이 아니에요` });
  });
  for (const x of validateRules(m.lorebook)) out.push({ ...x, tab: "lorebook" });
  if (m.mcp !== void 0 && m.mcp !== null && typeof m.mcp !== "object") out.push({ level: "err", tab: "info", msg: "MCP 설정은 객체여야 해요" });
  return out;
}
var MOD_INFO_LABELS = { name: "이름", description: "설명", namespace: "네임스페이스", lowLevelAccess: "저수준 접근", hideIcon: "아이콘 숨김", backgroundEmbedding: "배경 HTML", customModuleToggle: "모듈 토글", cjs: "스크립트", mcp: "MCP" };
export function diffSummary(a, b, { infoLabels = MOD_INFO_LABELS, infoTitle = "모듈 정보" } = {}) {
  const lines = [];
  const changedInfo = Object.keys(infoLabels).filter((k) => stableJson(a[k] ?? null) !== stableJson(b[k] ?? null));
  if (changedInfo.length) lines.push(`${infoTitle}: ${changedInfo.map((k) => infoLabels[k]).join(", ")}`);
  for (const [k, label] of [["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ["assets", "에셋"]]) {
    const A = (a[k] ?? []).map((x) => stableJson(x)), B = (b[k] ?? []).map((x) => stableJson(x));
    const count = (arr) => arr.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), /* @__PURE__ */ new Map());
    const ca = count(A), cb = count(B);
    let added = 0, removed = 0;
    for (const [x, n] of cb) added += Math.max(0, n - (ca.get(x) ?? 0));
    for (const [x, n] of ca) removed += Math.max(0, n - (cb.get(x) ?? 0));
    const moved = !added && !removed && A.join("\n") !== B.join("\n");
    const changed = Math.min(added, removed);
    if (added || removed || moved) lines.push(`${label}: ${[changed && `수정 ${changed}`, added - changed && `추가 ${added - changed}`, removed - changed && `삭제 ${removed - changed}`, moved && "순서 바뀜"].filter(Boolean).join(" · ")}`);
  }
  return lines;
}
export async function openEditor(ctx, id) {
  // 목록에서 이미 읽어 둔 것을 쓴다 (저장할 때는 어차피 봇·모듈을 새로 읽어 확인한다)
  let data = await ctx.svc.load();
  let entry2 = data.entries.find((e) => e.module.id === id);
  if (!entry2) {
    data = await ctx.svc.load({ fresh: true });
    entry2 = data.entries.find((e) => e.module.id === id);
  }
  if (!entry2) {
    ctx.toast("모듈을 찾지 못했어요", { error: true });
    return;
  }
  return openEditorCore(ctx, {
    view: entry2.module,
    kindLabel: "모듈 편집",
    idKey: "id",
    validate: validateModule,
    async save(draft, original) {
      // 백업은 저장과 함께 진행 (편집 전 상태는 이미 메모리에 있다)
      const backup = createStore(ctx.api).addBackup({ kind: "module", target: original.id, name: original.name, snapshot: structuredClone(original), note: "편집 전" }).catch(() => null);
      const patch = {};
      for (const k of /* @__PURE__ */ new Set([...Object.keys(original), ...Object.keys(draft)])) if (k !== "id" && stableJson(original[k] ?? null) !== stableJson(draft[k] ?? null)) patch[k] = draft[k];
      await ctx.svc.run("update", original.id, patch);
      reload(ctx).catch(() => {
      });
      backup.catch(() => {
      });
    }
  });
}
export async function openEditorCore(ctx, cfg) {
  const E7_CSS = `
.rb-side-tools.rb-bar{padding:8px;border-radius:14px;border:1px solid var(--rb-line2);background:var(--rb-surf);margin:0 0 8px;gap:6px}
.rb-adv{border-radius:12px;border:1px solid var(--rb-line2);background:var(--rb-surf)}
.rb-adv>summary{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;list-style:none;font-size:13px;font-weight:600;min-height:24px}
.rb-adv>summary::-webkit-details-marker{display:none}
.rb-adv>summary .h{font-weight:400;color:var(--rb-sub);font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-adv>summary svg{flex:none;transition:transform .15s}
.rb-adv[open]>summary svg{transform:rotate(180deg)}
.rb-adv>.in{padding:2px 12px 12px}
.rb-emptycard{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:22px 14px;border:1px dashed var(--rb-line3);border-radius:14px;color:var(--rb-sub);font-size:13px;line-height:1.6}
.rb-emptycard b{color:var(--rb-text);font-size:14px}
.rb-emptycard .acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px}
.rb-kind{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--rb-surf2);border:1px solid var(--rb-line2)}
.rb-rx-in{white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.7;padding:8px 10px;border-radius:10px;background:var(--rb-surf2);max-height:220px;overflow:auto}
.rb-rx-in mark{background:var(--rb-sel-bg);color:inherit;border-radius:4px;outline:1px solid var(--rb-sel-ring);padding:0 1px}
.rb-rx-lines{font-size:12px;line-height:1.7;font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;color:var(--rb-sub)}
.rb-rx-out{white-space:pre-wrap;word-break:break-word;font-size:13px;padding:8px 10px;border-radius:10px;border:1px solid var(--rb-line2);max-height:220px;overflow:auto}
.rb-vars{display:flex;flex-direction:column;gap:8px}
.rb-var{display:grid;grid-template-columns:minmax(80px,1fr) minmax(80px,2fr) auto;gap:6px;align-items:center}
.rb-var .rb-input{min-width:0}
@media (max-width:640px){.rb-var{grid-template-columns:minmax(0,1fr) auto}.rb-var .k{grid-column:1 / 2}.rb-var .v{grid-column:1 / 2}.rb-var .x{grid-row:1 / 3;grid-column:2}}
@media (prefers-reduced-motion:reduce){.rb-adv>summary svg{transition:none}}
`;
  if (!document.getElementById("rb-e7-style")) document.head.appendChild(h("style", { id: "rb-e7-style" }, E7_CSS));
  const original = structuredClone(cfg.view);
  let draft = structuredClone(cfg.view);
  for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
  const es = { tab: "info", loreTab: "all", sel: { lorebook: 0, regex: 0, trigger: 0 }, q: { lorebook: "", regex: "", trigger: "" }, lastField: null, mItem: false, listScroll: { lorebook: 0, regex: 0, trigger: 0 }, itemView: /* @__PURE__ */ new WeakMap(), shown: null };
  const dirty = () => stableJson(draft) !== stableJson(original);
  const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${original.name} 편집` });
  const titleB = h("b", null, original.name || "(이름 없음)");
  const issuesBtn = btn("", { size: "sm", kind: "ghost", onClick: () => showIssues() });
  const saveState = h("small", { class: "rb-muted", style: "white-space:nowrap;font-size:11px", "aria-live": "polite" });
  const applyBtn = btn("적용", { kind: "primary", icon: "check", onClick: () => apply() });
  const head = h(
    "div",
    { class: "rb-full-head" },
    iconBtn("back", "닫기", { onClick: () => close() }),
    h("div", { class: "ttl" }, h("small", null, cfg.kindLabel), titleB),
    saveState,
    issuesBtn,
    btn("CBS 사전", { size: "sm", onClick: () => cbsPanel() }),
    applyBtn
  );
  const tabsEl = h("div", { class: "rb-tabs", role: "tablist" });
  const body = h("div", { class: "rb-split" });
  // 우측 하단 버튼 하나: 누르면 [AI 창 · 규칙 시험] 두 개가 펼쳐진다 (AI 창은 봇 편집에서만, 모듈은 규칙 시험만)
  const hasAi = cfg.idKey === "chaId";
  const fabItem = (label, ic, title, fn) => {
    const b = btn(label, { kind: "primary", icon: ic, title, onClick: () => { closeDial(); fn(); } });
    b.style.cssText = "box-shadow:0 6px 20px rgba(0,0,0,.4);border-radius:999px;transition:opacity .16s ease,transform .16s ease";
    return b;
  };
  let aiItem = null;
  const dialItems = h("div", { style: "display:flex;flex-direction:column;align-items:flex-end;gap:8px;transition:opacity .16s ease,transform .16s ease;opacity:0;transform:translateY(8px);pointer-events:none;visibility:hidden" },
    hasAi ? (aiItem = fabItem("AI 창", "sparkle", "AI로 로어북·설명·정규식·Lua를 만들고 바로 반영", () => aiWindow())) : null,
    fabItem("규칙 시험", "zap", "가상 대화로 Dusk 규칙이 어떻게 켜지는지 시험", () => ruleTester()));
  let dialOpen = false;
  const closeDial = () => { dialOpen = false; dialItems.style.opacity = "0"; dialItems.style.transform = "translateY(8px)"; dialItems.style.pointerEvents = "none"; dialItems.style.visibility = "hidden"; fabMain.setAttribute("aria-expanded", "false"); };
  const openDial = () => { dialOpen = true; dialItems.style.visibility = "visible"; dialItems.style.opacity = "1"; dialItems.style.transform = "none"; dialItems.style.pointerEvents = "auto"; fabMain.setAttribute("aria-expanded", "true"); };
  const fabMain = hasAi
    ? btn("도구", { kind: "primary", icon: "sparkle", title: "AI 창 · 규칙 시험", onClick: () => (dialOpen ? closeDial() : openDial()) })
    : btn("규칙 시험", { kind: "primary", icon: "zap", title: "가상 대화로 Dusk 규칙이 어떻게 켜지는지 시험", onClick: () => ruleTester() });
  fabMain.style.cssText = "box-shadow:0 6px 20px rgba(0,0,0,.4);border-radius:999px";
  if (hasAi) fabMain.setAttribute("aria-haspopup", "true");
  const testFab = h("div", { id: "rb-rule-test-fab", style: "position:absolute;right:16px;bottom:16px;z-index:30;display:flex;flex-direction:column;align-items:flex-end;gap:8px" }, hasAi ? dialItems : null, fabMain);
  // 버튼 표시: 대기 중이면 깜빡이는 점, 수정안이 도착하면 숫자 배지 (창이 닫혀 있어도 보임)
  if (!document.getElementById("rb-fab-style")) document.head.appendChild(h("style", { id: "rb-fab-style" }, "@keyframes rb-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}@media (prefers-reduced-motion:reduce){.rb-fab-dot{animation:none!important}}"));
  const fabMark = (host) => {
    if (!host) return null;
    host.style.position = "relative";
    return host.appendChild(h("span", { class: "rb-fab-mark", "aria-hidden": "true", style: "position:absolute;top:-6px;right:-4px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:var(--rb-warn,#e8a33d);color:#111;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;line-height:1" }));
  };
  let fabMarks = [];
  function paintFab() {
    if (!hasAi) return;
    if (!fabMarks.length) fabMarks = [fabMark(fabMain), fabMark(aiItem)].filter(Boolean);
    const busy = !!build?.state?.job, n = build?.pendingCount?.() ?? 0;
    for (const m of fabMarks) {
      m.classList.toggle("rb-fab-dot", busy && !n);
      m.style.animation = busy && !n ? "rb-fab-pulse 1.1s ease-in-out infinite" : "";
      m.style.display = busy || n ? "flex" : "none";
      m.style.width = busy && !n ? "12px" : "";
      m.style.minWidth = busy && !n ? "12px" : "18px";
      m.style.height = busy && !n ? "12px" : "18px";
      m.style.padding = busy && !n ? "0" : "0 5px";
      m.textContent = busy && !n ? "" : n ? String(n) : "";
    }
    const label = busy ? "AI가 응답을 만드는 중" : n ? `새 수정안 ${n}개` : "";
    fabMain.title = (hasAi ? "AI 창 · 규칙 시험" : "") + (label ? ` — ${label}` : "");
    fabMain.setAttribute("aria-label", "도구" + (label ? ` (${label})` : ""));
  }
  panel.append(head, tabsEl, body, testFab);
  ctx.win.appendChild(panel);
  panel.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !ctx.win.querySelector(".rb-modal, .rb-menu, #rb-rule-test")) {
      ev.stopPropagation();
      close();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      apply();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "p" && ["lorebook", "regex", "trigger"].includes(es.tab)) {
      ev.preventDefault();
      quickJump();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "h" && ["lorebook", "regex", "trigger"].includes(es.tab)) {
      ev.preventDefault();
      findReplace();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "f") {
      const s = panel.querySelector(".rb-side-tools input");
      if (s) {
        ev.preventDefault();
        s.focus();
        s.select();
      }
    }
  });
  panel.addEventListener("focusin", (ev) => {
    if (ev.target.matches("textarea, input[type=text], input:not([type])")) es.lastField = ev.target;
  });
  const TABS2 = [["info", "정보"], ["lorebook", "로어북"], ["regex", "정규식"], ["trigger", "트리거"], ...(hasAi ? [["ai", "AI로 제작"]] : []), ["json", "JSON"]];
  function goTab(k) {
    if (!TABS2.some(([t]) => t === k)) return;
    es.tab = k;
    es.mItem = false;
    render();
    panel.querySelector("#rb-ai-popup")?.syncTab?.(k);
  }
  // 정보 탭 안에서 인사말 칸에 있는지 아닌지를 AI 창이 알 수 있게 (작업 종류 자동 선택)
  panel.addEventListener("da-area", (ev) => panel.querySelector("#rb-ai-popup")?.syncTab?.(ev.detail));
  function paintTabs() {
    replace(tabsEl, TABS2.map(([k, label]) => h(
      "button",
      { type: "button", role: "tab", "aria-selected": es.tab === k ? "true" : "false", onClick: () => goTab(k) },
      label,
      ["lorebook", "regex", "trigger"].includes(k) ? h("small", null, String(draft[k].length)) : k === "ai" && build?.pendingCount() ? h("small", null, String(build.pendingCount())) : null
    )));
  }
  function paintHead() {
    const iss = cfg.validate(draft);
    const errs = iss.filter((i) => i.level === "err").length, warns = iss.length - errs;
    replace(issuesBtn, icon(errs || warns ? "alert" : "check", 16), h("span", null, errs ? `오류 ${errs}` : warns ? `경고 ${warns}` : "검증 통과"));
    issuesBtn.style.color = errs ? "var(--rb-danger)" : warns ? "var(--rb-warn)" : "var(--rb-teal)";
    applyBtn.disabled = !dirty();
    titleB.textContent = (draft.name || "(이름 없음)") + (dirty() ? " •" : "");
    paintSaveState();
  }
  let headTimer = null, tabsTimer = null;
  const changed = () => {
    titleB.textContent = (draft.name || "(이름 없음)") + " •";
    applyBtn.disabled = false;
    clearTimeout(headTimer);
    headTimer = setTimeout(paintHead, 250);
    clearTimeout(tabsTimer);
    tabsTimer = setTimeout(paintTabs, 120);
  };
  const field = (label, input, wide) => h("label", { class: ["rb-field", wide && "wide"] }, h("span", { class: "rb-label" }, label), input);
  // 접는 '고급' 칸: 열림 상태는 항목을 바꿔도 기억 (처음 쓰는 사람은 기본 칸만 보게)
  const advFold = (key, title, hint, ...kids) => {
    es.adv ??= {};
    const d = h("details", { class: "rb-adv wide" }, h("summary", null, h("span", null, title), h("span", { class: "h" }, hint), icon("down", 16)), h("div", { class: "in" }, h("div", { class: "rb-form" }, ...kids)));
    d.open = !!es.adv[key];
    d.addEventListener("toggle", () => { es.adv[key] = d.open; });
    return d;
  };
  const text = (obj, key, { placeholder, onInput } = {}) => {
    const el = h("input", { class: "rb-input", value: obj[key] ?? "", placeholder });
    el.addEventListener("input", () => {
      obj[key] = el.value;
      onInput?.();
      changed();
    });
    return el;
  };
  const num = (obj, key) => {
    const el = h("input", { class: "rb-input", type: "number", value: obj[key] ?? "" });
    el.addEventListener("input", () => {
      obj[key] = el.value === "" ? void 0 : Number(el.value);
      changed();
    });
    return el;
  };
  const area = (obj, key, { tall, placeholder, mono = true, probPick, tokens } = {}) => {
    const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false", placeholder, style: mono ? null : "font-family:inherit;font-size:14px" });
    el.value = obj[key] ?? "";
    el.addEventListener("input", () => {
      obj[key] = el.value;
      changed();
    });
    attachUndo(el);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Tab" && !ev.shiftKey && !ev.ctrlKey) {
        ev.preventDefault();
        el.setRangeText("	", el.selectionStart, el.selectionEnd, "end");
        el.dispatchEvent(new Event("input"));
      }
    });
    const base = probPick ? attachProbPick(el, ctx.win) : el;
    if (!tokens) return base;
    // 내용 토큰 수(추정): 한글은 글자당 약 0.67, 그 밖은 4글자당 1토큰. 규칙 항목의 @@activate/#if 장식은 빼고 센다.
    const tk = h("div", { class: "rb-muted", style: "font-size:12px;margin-top:4px;text-align:right", "aria-live": "polite" });
    const upd = () => { const n = estimateTokens(bodyOf(el.value)); tk.textContent = `약 ${n.toLocaleString()} 토큰 (추정) · ${el.value.length.toLocaleString()}자`; };
    el.addEventListener("input", upd);
    upd();
    return h("div", null, base, tk);
  };
  // 코드 편집기 모양의 칸 (정규식 IN/OUT): 색 입히기 + 괄호 짝 표시
  const codeArea = (obj, key, { lang, tall, placeholder } = {}) => {
    const ed = codeEditor(obj[key] ?? "", {
      lang,
      // 정규식 IN/OUT은 긴 줄을 칸 너비에서 줄바꿈 (Lua는 코드답게 가로로)
      wrap: lang === "regex" || lang === "replace",
      tab: "\t",
      placeholder,
      label: key,
      minHeight: tall ? "max(300px,46vh)" : "96px",
      maxHeight: tall ? "70vh" : "40vh",
      onChange: (v) => {
        obj[key] = v;
        changed();
      }
    });
    return ed.el;
  };
  const check = (obj, key, label) => {
    const el = h("input", { type: "checkbox", checked: !!obj[key] });
    el.addEventListener("change", () => {
      obj[key] = el.checked;
      changed();
    });
    return h("label", { class: "rb-check" }, el, h("span", null, label));
  };
  const select2 = (obj, key, options, onChange) => {
    const el = h("select", { class: "rb-input" }, options.map(([v, l]) => h("option", { value: v, selected: (obj[key] ?? options[0][0]) === v }, l)));
    el.addEventListener("change", () => {
      obj[key] = el.value;
      changed();
      onChange?.();
    });
    return el;
  };
  const jsonArea = (obj, key, { tall } = {}) => {
    const el = h("textarea", { class: ["rb-textarea", tall && "tall"], spellcheck: "false" });
    el.value = obj[key] === void 0 ? "" : JSON.stringify(obj[key], null, 2);
    const err = h("span", { class: "rb-muted" });
    el.addEventListener("input", () => {
      if (!el.value.trim()) {
        delete obj[key];
        err.textContent = "";
        changed();
        return;
      }
      try {
        obj[key] = JSON.parse(el.value);
        err.textContent = "";
        el.style.borderColor = "";
        changed();
      } catch (e) {
        err.textContent = `JSON 오류: ${e.message}`;
        el.style.borderColor = "var(--rb-danger)";
      }
    });
    return h("div", { style: "display:flex;flex-direction:column;gap:4px" }, el, err);
  };
  function renderInfo() {
    if (cfg.renderInfo) {
      replace(body, h("div", { class: "pane" }, cfg.renderInfo({ draft, field, text, area, check, num, jsonArea, select: select2, changed, goTab, ui: es.infoUi ??= {}, emitArea: (a) => panel.dispatchEvent(new CustomEvent("da-area", { detail: a })) })));
      return;
    }
    replace(body, h(
      "div",
      { class: "pane" },
      h(
        "div",
        { class: "rb-form" },
        field("이름", text(draft, "name")),
        field("네임스페이스", text(draft, "namespace", { placeholder: "다른 모듈·트리거가 이 모듈을 가리킬 때 쓰는 이름" })),
        field("설명", area(draft, "description", { mono: false }), true),
        h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근 (AI 호출·이미지 생성 등 고급 기능)"), check(draft, "hideIcon", "채팅에서 아이콘 숨기기")),
        field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle", { placeholder: "예) toggle_이름=보여줄 이름" }), true),
        field("배경 HTML (backgroundEmbedding)", area(draft, "backgroundEmbedding"), true),
        field("스크립트 (cjs)", area(draft, "cjs"), true),
        field("MCP 설정 (JSON)", jsonArea(draft, "mcp"), true)
      ),
      draft.lowLevelAccess ? note("warn", "저수준 접근을 켠 모듈은 믿을 수 있는 출처일 때만 쓰세요.") : null
    ));
  }
  function renderList(kind) {
    const list = draft[kind];
    const isLore = kind === "lorebook";
    const q = es.q[kind].trim().toLowerCase();
    const match = (it2) => !q || [it2.comment, it2.key, it2.secondkey, it2.content, it2.in, it2.out, JSON.stringify(it2.effect ?? "")].some((v) => String(v ?? "").toLowerCase().includes(q));
    if (es.sel[kind] >= list.length) es.sel[kind] = list.length - 1;
    if (isLore) maybeConvertNative();
    // ---------- 로어북 폴더 트리 (Dusk 폴더: 중첩·색·소속) ----------
    const fmap = isLore ? folderMap(list) : new Map();
    const pid = (x) => {
      const p = parentOf(x);
      return p && fmap.has(p) && fmap.get(p) !== x ? p : null;
    };
    const kidsOf = (id) => list.filter((x) => pid(x) === id);
    const leafCount = (id) => list.filter((x) => !isFolder(x) && ancestorsOf(x, fmap).some((f) => folderIdOf(f) === id)).length;
    const under = (id, fid) => {
      // id 폴더가 fid 폴더 안(또는 같음)인가
      if (id === fid) return true;
      const f = fmap.get(id);
      return !!f && ancestorsOf(f, fmap).some((a) => folderIdOf(a) === fid);
    };
    const setParent = (x, p) => {
      x.extentions = { ...(x.extentions ?? {}) };
      if (!p) {
        delete x.extentions.da_parent;
        delete x.folder;
        return true;
      }
      const f = fmap.get(p);
      if (!f) return false;
      if (isFolder(x) && under(p, folderIdOf(x))) {
        ctx.toast("폴더를 자기 안으로 넣을 수 없어요", { error: true });
        return false;
      }
      if (f.mode === "folder") {
        // 리스 순정 폴더: 한 단계만
        if (isFolder(x)) {
          ctx.toast("리스 순정 폴더에는 폴더를 넣을 수 없어요. Dusk 폴더로 바꾸면 돼요", { error: true });
          return false;
        }
        delete x.extentions.da_parent;
        x.folder = f.key;
      } else {
        delete x.folder;
        x.extentions.da_parent = p;
      }
      return true;
    };
    const selObj = () => list[es.sel[kind]];
    const reselect = (obj) => {
      es.sel[kind] = obj ? list.indexOf(obj) : es.sel[kind];
    };
    // 새 항목이 들어갈 폴더: 고른 것이 폴더면 그 안, 아니면 고른 것과 같은 폴더
    const targetParent = () => {
      const cur = selObj();
      if (!isLore || !cur) return null;
      return isFolder(cur) ? folderIdOf(cur) : pid(cur);
    };
    const add = (mk, { parent } = {}) => {
      const at = es.sel[kind] >= 0 ? es.sel[kind] + 1 : list.length;
      const it2 = mk();
      if (isLore) {
        const p = parent === void 0 ? targetParent() : parent;
        if (p) setParent(it2, p);
      }
      list.splice(at, 0, it2);
      es.sel[kind] = at;
      es.mItem = true;
      if (isLore) syncRuleContent(list);
      changed();
      render();
      return it2;
    };
    const search = h("input", { class: "rb-input", style: "height:36px;flex:1;min-width:120px", placeholder: "찾기 (Ctrl+F) — 이름·키·내용", value: es.q[kind], "aria-label": "찾기" });
    search.addEventListener("input", () => {
      es.q[kind] = search.value;
      paintItems();
    });
    es.multi ??= /* @__PURE__ */ new Set();
    const selecting = isLore && !!es.selMode;
    const collapsedAll = () => fmap.size > 0 && [...fmap.values()].every((f) => es.loreCollapsed?.has(folderIdOf(f)));
    function sortByName() {
      const cur = selObj();
      const cmp = (a, b) => String(a.comment || a.key || "").localeCompare(String(b.comment || b.key || ""), "ko", { numeric: true, sensitivity: "base" });
      const out = [], seen = /* @__PURE__ */ new Set();
      const walk = (parent) => {
        for (const x of kidsOf(parent).sort(cmp)) {
          if (seen.has(x)) continue;
          seen.add(x);
          out.push(x);
          if (isFolder(x)) walk(folderIdOf(x));
        }
      };
      walk(null);
      for (const x of list) if (!seen.has(x)) out.push(x);
      list.splice(0, list.length, ...out);
      if (cur) es.sel[kind] = list.indexOf(cur);
      syncRuleContent(list);
      changed();
      render();
      ctx.toast("이름순으로 정렬했어요 (폴더 안에서만)");
    }
    // 로어북 더스크화: 결과는 초안에만 반영하고, 저장 전에는 되돌릴 수 있다
    async function duskify() {
      const r = await openLoreDusk(ctx, { list });
      if (!r) return;
      const before = structuredClone(list);
      const cur = selObj();
      list.splice(0, list.length, ...r.entries);
      syncRuleContent(list);
      es.sel[kind] = Math.max(0, cur ? list.indexOf(cur) : 0);
      es.loreCollapsed?.clear();
      changed();
      render();
      ctx.toast(`더스크화 적용: ${r.text}`, { seconds: 12, action: { label: "되돌리기", run: () => {
        list.splice(0, list.length, ...before);
        syncRuleContent(list);
        es.sel[kind] = Math.min(es.sel[kind], list.length - 1);
        changed();
        render();
        ctx.toast("더스크화를 되돌렸어요");
      } } });
    }
    const newMenu = (ev) => openMenu(ctx.win, ev.currentTarget, [
      { label: "폴더", icon: "folderPlus", onClick: () => newFolderPicked(false) },
      { label: "소속 폴더", icon: "link", onClick: () => newFolderPicked(true) },
      "sep",
      { label: "장소 (지금 폴더 안)", icon: "plus", onClick: () => add(() => newPlaceEntry()) },
      { label: "장소 (독립)", icon: "plus", onClick: () => add(() => newPlaceEntry(), { parent: null }) }
    ]);
    // 이름순 정렬: 폴더 구조(부모 표시)는 건드리지 않고 배열 순서만 바꾼다. 구분선(-- 이름 --) 사이 구간 안에서만 정렬.
    const applySort = (scope) => {
      const out = sortLoreByName(list, { isDivider: isLoreDivider, scope });
      const cur = selObj();
      if (out.length !== list.length || out.every((x, i) => x === list[i])) {
        ctx.toast("이미 이름순이에요");
        return;
      }
      list.splice(0, list.length, ...out);
      reselect(cur);
      changed();
      render();
      ctx.toast(scope === null ? "전체를 이름순으로 정렬했어요 (저장하면 적용돼요)" : "이 폴더 안을 이름순으로 정렬했어요 (저장하면 적용돼요)");
    };
    const sortMenu = (ev) => {
      const cur = selObj();
      const fid = cur ? (isFolder(cur) ? folderIdOf(cur) : pid(cur)) : null;
      openMenu(ctx.win, ev.currentTarget, [
        { label: "전체 이름순 (폴더 안에서만)", icon: "list", onClick: () => applySort(null) },
        fid ? { label: "고른 폴더 안만 이름순", icon: "folder", onClick: () => applySort(fid) } : null
      ].filter(Boolean));
    };
    // 위쪽 바: 검색 · 추가 · (로어북) 만들기 · 더보기. 자주 안 쓰는 건 '더보기' 안으로
    const moreMenu = (ev) => openMenu(ctx.win, ev.currentTarget, [
      isLore && fmap.size ? { label: collapsedAll() ? "모든 폴더 펴기" : "모든 폴더 접기", icon: "folder", onClick: () => {
        es.loreCollapsed ??= /* @__PURE__ */ new Set();
        if (collapsedAll()) es.loreCollapsed.clear();
        else for (const f of fmap.values()) es.loreCollapsed.add(folderIdOf(f));
        render();
      } } : null,
      isLore ? { label: "여러 개 고르기", icon: "check", onClick: () => {
        es.selMode = !es.selMode;
        es.multi.clear();
        render();
      } } : null,
      isLore && list.length > 1 ? "sep" : null,
      isLore && list.length > 1 ? { label: "전체 이름순 (폴더 안에서만)", icon: "list", onClick: () => applySort(null) } : null,
      isLore && list.length > 1 && (() => { const cur = selObj(); return cur && (isFolder(cur) ? folderIdOf(cur) : pid(cur)); })() ? { label: "고른 폴더 안만 이름순", icon: "folder", onClick: () => { const cur = selObj(); applySort(isFolder(cur) ? folderIdOf(cur) : pid(cur)); } } : null,
      isLore && list.length > 1 ? { label: "더스크화 (구분선 변환 + AI 분석)", icon: "sparkle", onClick: () => duskify() } : null,
      !isLore ? { label: "찾아 바꾸기 (Ctrl+H)", icon: "search", onClick: () => findReplace() } : null,
      !isLore ? { label: "빠른 이동 (Ctrl+P)", icon: "list", onClick: () => quickJump() } : null
    ].filter((x, i, arr) => x && !(x === "sep" && (i === 0 || !arr[i + 1]))));
    const tools = h(
      "div",
      { class: "rb-side-tools rb-bar" },
      search,
      btn("추가", { size: "sm", icon: "plus", onClick: () => add(isLore ? newLore : kind === "regex" ? newRegex : newTrigger) }),
      isLore ? btn("만들기", { size: "sm", icon: "folderPlus", onClick: newMenu }) : null,
      isLore && selecting ? btn("선택 끝", { size: "sm", kind: "primary", onClick: () => {
        es.selMode = false;
        es.multi.clear();
        render();
      } }) : null,
      iconBtn("more", "더보기", { boxed: true, onClick: moreMenu })
    );
    // 로어북: 전체 / 캐릭터 / 소속 탭
    const loreTabs = isLore ? h("div", { class: "rb-lore-tabs", style: "padding:0 0 6px" }, segmented([["all", "전체"], ["char", "캐릭터"], ["aff", "소속"]], es.loreTab, (v) => {
      es.loreTab = v;
      render();
    }, "로어북 보기")) : null;
    // 여러 개 고르기 도구줄
    const bulkBar = selecting ? (() => {
      const picked = () => list.filter((x) => es.multi.has(x));
      const n = es.multi.size;
      const leaves = () => picked().filter((x) => !isFolder(x));
      return h(
        "div",
        { class: "rb-card pad", style: "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px;padding:8px" },
        h("b", { style: "font-size:13px" }, `${n}개 고름`),
        btn(n ? "모두 해제" : "모두 고르기", { size: "sm", onClick: () => {
          if (n) es.multi.clear();
          else for (const x of list) es.multi.add(x);
          render();
        } }),
        btn("규칙 켜기", { size: "sm", disabled: !n, onClick: () => {
          for (const x of leaves()) enableRule(x, list);
          syncRuleContent(list);
          changed();
          render();
          ctx.toast(`${leaves().length}개에 Dusk 규칙을 켰어요`);
        } }),
        btn("규칙 끄기", { size: "sm", disabled: !n, onClick: () => {
          let k = 0;
          for (const x of leaves()) {
            if (!ruleOf(x)) continue;
            disableRule(x);
            k++;
          }
          changed();
          render();
          ctx.toast(`${k}개의 Dusk 규칙을 껐어요 (소속 폴더 안 항목은 저장할 때 다시 켜져요)`);
        } }),
        btn("폴더로 옮기기", { size: "sm", disabled: !n, onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
          { label: "폴더 밖으로", onClick: () => moveMany(picked(), null) },
          ...[...fmap.values()].filter((f) => !es.multi.has(f)).map((f) => ({ label: (isAff(f) ? "소속 · " : "") + (affName(f) || "(이름 없는 폴더)"), onClick: () => moveMany(picked(), folderIdOf(f)) }))
        ]) }),
        btn("삭제", { size: "sm", kind: "danger", disabled: !n, onClick: async () => {
          if (!await confirmDialog(ctx.win, { title: `${n}개를 지울까요?`, body: "폴더를 지우면 안의 항목은 한 단계 위로 나와요.", ok: "삭제", danger: true })) return;
          for (const x of picked()) removeEntry(x);
          es.multi.clear();
          es.sel[kind] = Math.min(es.sel[kind], list.length - 1);
          changed();
          render();
        } })
      );
    })() : null;
    function moveMany(arr, p) {
      let ok = 0;
      for (const x of arr) if (setParent(x, p)) ok++;
      syncRuleContent(list);
      changed();
      render();
      ctx.toast(`${ok}개를 옮겼어요`);
    }
    function removeEntry(x) {
      const i = list.indexOf(x);
      if (i < 0) return;
      if (isFolder(x)) {
        const up = pid(x);
        const id = folderIdOf(x);
        for (const k of list) if (pid(k) === id) setParent(k, up);
      }
      list.splice(list.indexOf(x), 1);
    }
    const items = h("div", { class: "rb-side-list", role: "listbox", "aria-label": "항목" });
    const uid = /* @__PURE__ */ new WeakMap();
    let seq = 0;
    const idOf = (it2) => {
      if (!uid.has(it2)) uid.set(it2, "i" + ++seq);
      return uid.get(it2);
    };
    const byUid = (id) => list.find((x) => uid.get(x) === id);
    es.loreCollapsed ??= /* @__PURE__ */ new Set();
    const dropTo = ({ beforeId, after, folderId }, dragged) => {
      const keepSel = selObj();
      const from = list.indexOf(dragged);
      if (from < 0) return;
      // 여러 개 고른 상태에서 고른 것 하나를 끌면 고른 것 모두 옮긴다
      const group = selecting && es.multi.has(dragged) ? list.filter((x) => es.multi.has(x)) : [dragged];
      if (beforeId) {
        const target = byUid(beforeId);
        if (!target || group.includes(target)) return;
        if (isLore) {
          const p = pid(target);
          for (const x of group) if (!setParent(x, p)) return;
        }
        for (const x of group) list.splice(list.indexOf(x), 1);
        list.splice(list.indexOf(target) + (after ? 1 : 0), 0, ...group);
      } else if (isLore) {
        for (const x of group) if (!setParent(x, folderId || null)) return;
        // 폴더 안 맨 뒤로
        for (const x of group) list.splice(list.indexOf(x), 1);
        let at = list.length;
        if (folderId) {
          const f = fmap.get(folderId);
          at = list.indexOf(f) + 1;
          list.forEach((x, k) => {
            if (pid(x) === folderId) at = k + 1;
          });
        }
        list.splice(at, 0, ...group);
      }
      reselect(keepSel);
      if (isLore) syncRuleContent(list);
      changed();
      render();
    };
    const tintOf = (f) => folderTint(folderColorOf(f, list), ctx.state?.mode) ?? { stroke: "var(--rb-acc-text)", fill: "transparent" };
    const checkBox = (it2) => {
      const c = h("input", { type: "checkbox", checked: es.multi.has(it2), "aria-label": "고르기", style: "flex:none;margin:0 2px 0 4px" });
      c.addEventListener("click", (ev) => ev.stopPropagation());
      c.addEventListener("change", () => {
        if (c.checked) es.multi.add(it2);
        else es.multi.delete(it2);
        render();
      });
      return c;
    };
    const origSet = new Set((original[kind] ?? []).map((x) => stableJson(x)));
    const unsaved = (x) => !origSet.has(stableJson(x));
    const rowFor = (it2, i2, { child = false, grip = true, depth = 0 } = {}) => {
      const divider = isLore ? isLoreDivider(it2) : kind === "regex" ? isRegexDivider(it2) : false;
      const label = it2.comment || (isLore ? it2.key : it2.in) || "(이름 없음)";
      const off = kind === "regex" ? it2.type === "disabled" : isLore ? it2.enabled === false : false;
      const affPath = isLore && es.loreTab === "char" ? affsOf(it2, fmap) : [];
      const b = h(
        "button",
        { type: "button", class: ["rb-item", off && "off", child && "child", divider && "divider"], role: "option", "aria-selected": es.sel[kind] === i2 ? "true" : "false", onClick: () => {
          if (selecting) {
            if (es.multi.has(it2)) es.multi.delete(it2);
            else es.multi.add(it2);
            render();
            return;
          }
          es.sel[kind] = i2;
          es.mItem = true;
          render();
        } },
        h("span", { class: "t" }, label),
        unsaved(it2) ? h("span", { class: "rb-dot", title: "저장 안 된 변경", "aria-label": "저장 안 된 변경", style: "flex:none;width:7px;height:7px;border-radius:50%;background:var(--rb-warn)" }) : null,
        isLore && isPlace(it2) ? badge("장소", "ok") : null,
        isLore && !divider && (it2.alwaysActive || it2.mode === "constant") && !isManaged(it2) ? badge("항상", "acc") : null,
        isLore && isManaged(it2) && !isPlace(it2) ? badge("규칙", "acc") : null,
        affPath.length ? badge(affName(affPath[0]) + (affPath.length > 1 ? ` +${affPath.length - 1}` : ""), "mute") : null,
        kind === "trigger" ? badge(TRIGGER_TYPES.find((x) => x[0] === it2.type)?.[1] ?? it2.type, "mute") : null
      );
      const pad = depth ? `margin-left:${depth * 14}px` : "";
      if (!grip) return h("div", { class: "rb-item-row", style: pad }, selecting ? checkBox(it2) : null, b);
      const g = h("span", { class: "grip", title: "끌어서 순서 바꾸기·폴더에 넣기", "aria-hidden": "true" }, icon("grip", 14));
      const w = h("div", { class: "rb-item-row", style: pad, dataset: { dropRow: idOf(it2) } }, g, selecting ? checkBox(it2) : null, b);
      gripDrag({ grip: g, row: w, root: items, scroller: items, onDrop: (d) => dropTo(d, it2) });
      return w;
    };
    const folderRow = (f, depth, { grip = true } = {}) => {
      const id = folderIdOf(f);
      const open = !es.loreCollapsed.has(id);
      const tint = tintOf(f);
      const i2 = list.indexOf(f);
      const aff = isAff(f);
      const g = grip ? h("span", { class: "grip", title: "끌어서 옮기기 · 가운데에 놓으면 폴더 안으로", "aria-hidden": "true" }, icon("grip", 14)) : null;
      const row = h(
        "div",
        { class: "rb-item-row", style: depth ? `margin-left:${depth * 14}px` : "", dataset: grip ? { dropFolder: id, dropRow: idOf(f) } : { dropFolder: id } },
        g,
        selecting ? checkBox(f) : null,
        h("button", { type: "button", class: "rb-folder-chev", style: "flex:none;background:none;border:0;padding:4px;cursor:pointer;color:var(--rb-sub);display:flex;transform:" + (open ? "rotate(90deg)" : "none"), "aria-label": open ? "접기" : "펼치기", "aria-expanded": open ? "true" : "false", onClick: () => {
          if (open) es.loreCollapsed.add(id);
          else es.loreCollapsed.delete(id);
          paintItems();
        } }, icon("chevron", 14)),
        h(
          "button",
          { type: "button", class: "rb-folder", role: "option", "aria-selected": es.sel[kind] === i2 ? "true" : "false", style: `flex:1;margin-top:2px;background:${tint.fill};${es.sel[kind] === i2 ? "box-shadow:inset 0 0 0 2px var(--rb-sel-ring);" : ""}`, onClick: () => {
            if (selecting) {
              if (es.multi.has(f)) es.multi.delete(f);
              else es.multi.add(f);
              render();
              return;
            }
            es.sel[kind] = i2;
            es.mItem = true;
            render();
          } },
          h("span", { style: { display: "flex", color: tint.stroke } }, icon(aff ? "link" : "folder", 15)),
          h("b", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left" }, affName(f) || "(이름 없는 폴더)"),
          aff ? badge("소속", "acc") : f.mode === "folder" ? badge("리스", "mute") : null,
          h("small", null, String(leafCount(id)))
        )
      );
      if (g) gripDrag({ grip: g, row, root: items, scroller: items, onDrop: (d) => dropTo(d, f) });
      return row;
    };
    // 소속 탭에서 보일지: 소속 폴더이거나, 소속 안이거나, 안에 소속이 있거나
    const affVisible = (x) => {
      if (isAff(x) || affsOf(x, fmap).length) return true;
      if (!isFolder(x)) return false;
      const id = folderIdOf(x);
      return [...fmap.values()].some((f) => f !== x && isAff(f) && under(folderIdOf(f), id));
    };
    let vis = null;
    if (isLore && q) {
      vis = /* @__PURE__ */ new Set();
      for (const x of list) {
        if (!match(x)) continue;
        vis.add(x);
        for (const f of ancestorsOf(x, fmap)) vis.add(f);
      }
    }
    function paintTree(out, parent, depth, seen) {
      for (const x of kidsOf(parent)) {
        if (seen.has(x)) continue;
        seen.add(x);
        if (vis && !vis.has(x)) continue;
        if (es.loreTab === "aff" && !affVisible(x)) continue;
        if (isFolder(x)) {
          out.push(folderRow(x, depth, { grip: !q }));
          if (q || !es.loreCollapsed.has(folderIdOf(x))) {
            const before = out.length;
            paintTree(out, folderIdOf(x), depth + 1, seen);
            if (!q && out.length === before) out.push(h("div", { class: "rb-muted", style: `padding:4px 10px 6px;font-size:12px;margin-left:${(depth + 1) * 14}px`, dataset: { dropFolder: folderIdOf(x) } }, "비어 있어요 — 항목을 여기로 끌어다 놓으세요"));
          }
        } else out.push(rowFor(x, list.indexOf(x), { depth, grip: !q }));
      }
    }
    if (!items.__kb) {
      items.__kb = true;
      items.addEventListener("keydown", (ev) => {
        const opts = [...items.querySelectorAll("[role=option]")];
        const i = opts.indexOf(document.activeElement ?? ev.target);
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault();
          opts[Math.max(0, Math.min(opts.length - 1, (i < 0 ? 0 : i) + (ev.key === "ArrowDown" ? 1 : -1)))]?.focus();
        } else if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && i >= 0) {
          const row = opts[i].closest(".rb-item-row");
          const id = row?.dataset?.dropFolder;
          if (!id) return;
          const open = !es.loreCollapsed?.has(id);
          if (ev.key === "ArrowRight" === !open) {
            ev.preventDefault();
            row.querySelector(".rb-folder-chev")?.click();
          }
        }
      });
    }
    // 비어 있을 때: 이게 뭔지 한 줄 + 첫 행동 버튼
    function emptyCard() {
      const E = {
        lorebook: ["book", "아직 로어북이 없어요", "인물·장소·설정을 적어 두면, 그 키워드가 나올 때만 AI에게 전달돼요.", "첫 로어북 만들기", newLore],
        regex: ["code", "아직 정규식이 없어요", "채팅에 나온 글을 찾아 바꾸거나 꾸밀 때 써요. 예: 상태창을 예쁘게 보여주기.", "첫 정규식 만들기", newRegex],
        trigger: ["zap", "아직 트리거가 없어요", "대화를 시작하거나 입력·출력할 때 자동으로 실행되는 Lua 코드예요.", "첫 트리거 만들기", newTrigger]
      }[kind];
      return h("div", { class: "rb-emptycard" }, icon(E[0], 28), h("b", null, E[1]), h("span", null, E[2]),
        h("div", { class: "acts" }, btn(E[3], { kind: "primary", icon: "plus", onClick: () => add(E[4]) }),
          hasAi ? btn("AI로 만들기", { icon: "sparkle", onClick: () => aiWindow() }) : null));
    }
    function paintItems() {
      const out = [];
      if (!isLore) {
        list.forEach((it2, i2) => {
          if (match(it2)) out.push(rowFor(it2, i2, { grip: !q }));
        });
      } else if (q && es.loreTab !== "char") {
        paintTree(out, null, 0, /* @__PURE__ */ new Set());
      } else if (q) {
        list.forEach((it2, i2) => {
          if (!match(it2)) return;
          out.push(isFolder(it2) ? folderRow(it2, 0, { grip: false }) : rowFor(it2, i2, { grip: false }));
        });
      } else if (es.loreTab === "char") {
        list.forEach((it2, i2) => {
          if (!isFolder(it2) && !isPlace(it2)) out.push(rowFor(it2, i2, { grip: false }));
        });
      } else {
        paintTree(out, null, 0, /* @__PURE__ */ new Set());
        // 부모를 잃은 항목(지워진 폴더 등)은 맨 뒤에
        if (fmap.size) out.push(h("div", { class: "rb-label", style: "padding:10px 10px 6px;border-radius:8px", dataset: { dropFolder: "" } }, "여기에 놓으면 폴더 밖으로"));
      }
      if (!out.length && !list.length && !q) return replace(items, emptyCard());
      replace(items, out.length ? out : h("div", { class: "rb-empty" }, list.length ? (q ? "찾는 항목이 없어요" : es.loreTab === "aff" ? '소속이 없어요. "만들기 → 소속 폴더"로 만드세요.' : "항목이 없어요") : '항목이 없어요. "추가"를 눌러 만드세요.'));
    }
    async function newFolderPicked(aff) {
      const cands = list;
      const r = await folderDialog(ctx.win, { title: aff ? "새 소속 폴더" : "새 로어북 폴더", name: "", items: cands.map((x) => ({ id: idOf(x), label: (isFolder(x) ? "📁 " : "") + (affName(x) || x.key || "(이름 없음)"), folder: null, sub: (() => {
        const a = ancestorsOf(x, fmap);
        return a.length ? `지금: ${a.map((f) => affName(f)).reverse().join(" › ")}` : "폴더 밖";
      })() })), noun: "항목" });
      if (!r) return;
      const f = newFolderEntry(r.name || (aff ? "새 소속" : "새 폴더"), list, { aff });
      const parent = targetParent();
      const picked = r.ids.map(byUid).filter(Boolean);
      let at = picked.length ? Math.min(...picked.map((x) => list.indexOf(x))) : es.sel[kind] >= 0 ? es.sel[kind] + 1 : list.length;
      list.splice(Math.min(at, list.length), 0, f);
      const nf = folderMap(list);
      fmap.clear();
      for (const [k, v] of nf) fmap.set(k, v);
      if (!picked.length && parent) setParent(f, parent);
      else if (picked.length) {
        // 고른 항목들의 공통 부모 아래에 만든다
        const ps = new Set(picked.map((x) => pid(x)));
        if (ps.size === 1) setParent(f, [...ps][0]);
      }
      for (const x of picked) setParent(x, folderIdOf(f));
      syncRuleContent(list);
      es.sel[kind] = list.indexOf(f);
      es.mItem = true;
      changed();
      render();
    }
    paintItems();
    const i = es.sel[kind], it = list[i];
    const moveIt = (d) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      es.sel[kind] = j;
      changed();
      render();
    };
    const itemTools = it ? h(
      "div",
      { style: "display:flex;gap:6px;flex-wrap:wrap" },
      btn("복제", { size: "sm", onClick: () => {
        const c = structuredClone(it);
        if (c.mode === "folder") c.key = "folder:" + newId();
        if (c.extentions?.da_folder) c.extentions.da_folder = { ...c.extentions.da_folder, id: newId() };
        delete c.id;
        if (c.extentions?.da_rid) c.extentions.da_rid = newId();
        // 복사본은 이름을 그대로 둔다 (여러 소속에 같은 인물을 둘 때 한 번만 들어가게). 폴더는 (복사)를 붙인다
        if (isFolder(c)) c.comment = (c.comment || "") + " (복사)";
        list.splice(i + 1, 0, c);
        syncRuleContent(list);
        es.sel[kind] = i + 1;
        changed();
        render();
        if (isLore && !isFolder(c)) ctx.toast("복제했어요. 다른 폴더로 끌어 옮기면 그 소속에도 속해요");
      } }),
      isLore ? null : btn("위로", { size: "sm", icon: "up", onClick: () => moveIt(-1) }),
      isLore ? null : btn("아래로", { size: "sm", icon: "down", onClick: () => moveIt(1) }),
      h("div", { class: "rb-spacer" }),
      btn("삭제", { size: "sm", kind: "danger", icon: "trash", onClick: async () => {
        if (isLore && isFolder(it) && kidsOf(folderIdOf(it)).length && !await confirmDialog(ctx.win, { title: "폴더를 지울까요?", body: "안의 항목은 한 단계 위로 나와요.", ok: "삭제", danger: true })) return;
        if (isLore) removeEntry(it);
        else list.splice(i, 1);
        es.sel[kind] = Math.min(i, list.length - 1);
        changed();
        render();
      } })
    ) : null;
    const pane = h("div", { class: "pane" });
    body.classList.toggle("m-item", !!(es.mItem && it));
    body.classList.toggle("m-list", !(es.mItem && it));
    pane.appendChild(h("div", { class: "rb-mobile-only" }, btn("목록으로", { size: "sm", icon: "back", onClick: () => {
      es.mItem = false;
      render();
    } })));
    if (!it) pane.appendChild(h("div", { class: "rb-empty" }, list.length ? "왼쪽에서 항목을 고르세요." : "왼쪽의 버튼으로 첫 항목을 만들어 보세요."));
    else pane.append(itemTools, isLore ? loreForm(it) : kind === "regex" ? regexForm(it) : triggerForm(it));
    replace(body, h("div", { class: "side" }, kind === "trigger" && hasAi ? h("div", { style: "padding:0 0 8px" }, trigSeg()) : null, tools, loreTabs, bulkBar, items), pane);
    es.shown = { kind, items, pane, item: it };
    restoreView(kind, items, pane, it);
  }
  // 리스 순정 폴더가 있으면 Dusk 폴더로 바꿀지 한 번 묻는다
  function maybeConvertNative() {
    const nat = draft.lorebook.filter((x) => x.mode === "folder");
    if (!nat.length || es.askedNative) return;
    es.askedNative = true;
    setTimeout(async () => {
      const ok = await confirmDialog(ctx.win, { title: `리스 폴더 ${nat.length}개를 Dusk 폴더로 바꿀까요?`, body: "Dusk 폴더는 폴더 안에 폴더 넣기, 자동 색, 소속을 쓸 수 있어요. 대신 Dusk가 없는 리스에서는 폴더 구조가 보이지 않아요(로어북은 그대로 작동해요). 바꾸지 않으면 리스 폴더는 그대로 두고 한 단계로만 써요.", ok: "Dusk 폴더로 바꾸기" });
      if (!ok) return;
      let n = 0;
      for (const f of draft.lorebook.filter((x) => x.mode === "folder")) {
        const id = newId();
        const key = f.key;
        for (const x of draft.lorebook) {
          if (x.folder === key) {
            delete x.folder;
            x.extentions = { ...(x.extentions ?? {}), da_parent: id };
          }
        }
        f.mode = "normal";
        f.key = "";
        f.content = "";
        f.alwaysActive = false;
        f.extentions = { ...(f.extentions ?? {}), da_folder: { id, color: FOLDER_SWATCHES[n % FOLDER_SWATCHES.length] } };
        n++;
      }
      changed();
      render();
      ctx.toast(`폴더 ${n}개를 Dusk 폴더로 바꿨어요`);
    }, 50);
  }
  function loreForm(l) {
    if (l.mode === "folder") return h("div", { class: "rb-form" }, field("폴더 이름 (리스 폴더)", text(l, "comment")), h("p", { class: "rb-muted wide" }, `이 폴더 안 항목 ${draft.lorebook.filter((x) => x.folder === l.key).length}개 · 리스 폴더는 한 단계만 돼요. 로어북을 다시 열면 Dusk 폴더로 바꿀 수 있어요.`));
    if (isDuskFolder(l)) return folderForm(l);
    const fmap = folderMap(draft.lorebook);
    const path = ancestorsOf(l, fmap);
    const myAffs = path.filter(isAff);
    const affLine = path.length ? h("div", { class: "wide", style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" }, h("span", { class: "rb-muted" }, myAffs.length ? "소속" : "폴더"), ...[...path].reverse().map((g) => btn((isAff(g) ? "" : "📁 ") + (affName(g) || "(이름 없음)"), { size: "sm", onClick: () => goEntry(g) }))) : null;
    // 같은 이름 복사본이 어긋났는지
    const twins = draft.lorebook.filter((x) => x !== l && !isFolder(x) && String(x.comment ?? "").trim() && String(x.comment ?? "").trim() === String(l.comment ?? "").trim());
    const diff = twins.filter((x) => bodyOf(x.content) !== bodyOf(l.content) || String(x.key ?? "") !== String(l.key ?? ""));
    const twinNote = twins.length ? h(
      "div",
      { class: "wide", style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid var(--rb-line3)" },
      h("span", { style: "flex:1;min-width:200px;font-size:13px" }, diff.length ? `같은 이름 항목 ${twins.length}개 중 ${diff.length}개의 내용·키가 달라요. 한 턴에 같이 켜지면 둘 다 들어가요.` : `같은 이름 복사본 ${twins.length}개와 내용이 같아요. 한 턴에 같이 켜져도 한 번만 들어가요.`),
      diff.length ? btn("다른 쪽도 이 내용으로 맞추기", { size: "sm", kind: "primary", onClick: () => {
        const body2 = bodyOf(l.content);
        for (const x of diff) {
          x.key = l.key;
          const r = ruleOf(x);
          x.content = r && r.on !== false && ridOf(x) ? nativeContent(body2, r, ridOf(x)) : isManaged(l) ? body2 : l.content;
        }
        changed();
        render();
        ctx.toast(`${diff.length}개를 맞췄어요`);
      } }) : null
    ) : null;
    const enabled = h("input", { type: "checkbox", checked: l.enabled !== false });
    enabled.addEventListener("change", () => {
      if (enabled.checked) delete l.enabled;
      else l.enabled = false;
      changed();
    });
    return h(
      "div",
      { class: "rb-form" },
      affLine,
      twinNote,
      field(isPlace(l) ? "장소 이름" : "이름", isPlace(l) ? prefixedName(l, PLACE_PREFIX) : text(l, "comment")),
      isPlace(l) ? null : field("방식", select2(l, "mode", LORE_MODES.filter((x) => x[0] !== "folder"))),
      field(isPlace(l) ? "장소 키 (쉼표로 구분) — 이 말이 나오면 장소가 켜져요" : "활성화 키 (쉼표로 구분)", text(l, "key"), true),
      field(isPlace(l) ? "장소 설명" : "내용", area(l, "content", { tall: true, mono: false, probPick: true, tokens: true }), true),
      isPlace(l) ? placeCard(l, fmap) : null,
      h(
        "div",
        { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" },
        h("label", { class: "rb-check" }, enabled, h("span", null, "사용")),
        isPlace(l) ? null : check(l, "alwaysActive", "항상 켜짐")
      ),
      advFold("lore", "고급 설정", "보조 키 · 키를 정규식으로 · 삽입 순서 · 켜질 확률",
        h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(l, "selective", "보조 키 사용"), check(l, "useRegex", "키를 정규식으로")),
        field("보조 키", text(l, "secondkey", { placeholder: "보조 키 사용을 켜면 둘 다 있어야 켜짐" })),
        field("삽입 순서", num(l, "insertorder")),
        isManaged(l) ? null : field("켜질 확률 (%)", num(l, "activationPercent"))),
      myAffs.length || isPlace(l) ? h("p", { class: "rb-muted wide", style: "margin:0;font-size:12.5px" }, isPlace(l) ? "장소는 Dusk 규칙으로 켜져요 (규칙은 끌 수 없어요)." : "소속 폴더 안 항목은 Dusk 규칙이 늘 켜져 있어요 (소속이 켜질 때 함께 켜지려면 필요해요).") : null,
      ruleSection(l)
    );
  }
  // 접두사([소속]·[장소])를 뺀 이름을 고치는 칸
  function prefixedName(l, pre) {
    const el = h("input", { class: "rb-input", value: affName(l), placeholder: "이름" });
    el.addEventListener("input", () => {
      l.comment = pre + el.value.trim();
      changed();
    });
    return el;
  }
  function goEntry(x) {
    const k = draft.lorebook.indexOf(x);
    if (k < 0) return;
    es.sel.lorebook = k;
    es.mItem = true;
    render();
  }
  // 장소: 들어 있는 소속(종속)과 따로 연결할 소속(독립)
  function placeCard(l, fmap) {
    l.extentions = { ...(l.extentions ?? {}) };
    const pl = l.extentions.da_place = { links: [], ...(l.extentions.da_place ?? {}) };
    pl.links = (pl.links ?? []).filter((id) => fmap.has(id));
    const inside = affsOf(l, fmap);
    const affs = [...fmap.values()].filter((f) => isAff(f) && !inside.includes(f));
    return h(
      "div",
      { class: "wide rb-da on" },
      h("section", { class: "rb-da-card" }, h("header", null, icon("link", 16), h("b", null, "이 장소가 켜지면 같이 켜질 소속"), h("small", null, inside.length ? "폴더 위치로 정해진 소속 + 아래에서 더 고른 소속" : "독립 장소 — 아래에서 고른 소속만 켜져요 (안 고르면 장소만 켜져요)")),
        inside.length ? h("div", { class: "rb-da-line", style: "flex-wrap:wrap;gap:6px" }, h("span", { class: "rb-da-lab" }, "들어 있는 소속"), ...inside.map((f) => btn(affName(f), { size: "sm", onClick: () => goEntry(f) }))) : null,
        affs.length ? h("div", { class: "rb-da-line", style: "flex-wrap:wrap;gap:12px" }, h("span", { class: "rb-da-lab" }, "더 연결"), ...affs.map((f) => {
          const id = folderIdOf(f);
          const c = h("input", { type: "checkbox", checked: pl.links.includes(id) });
          c.addEventListener("change", () => {
            pl.links = c.checked ? [...new Set([...pl.links, id])] : pl.links.filter((x) => x !== id);
            changed();
          });
          return h("label", { class: "rb-check" }, c, h("span", null, affName(f)));
        })) : h("p", { class: "rb-da-empty" }, inside.length ? "더 연결할 다른 소속이 없어요" : "소속 폴더가 없어요. 만들기 → 소속 폴더로 만드세요")
      )
    );
  }
  // ---------- Dusk 폴더 (이름·색·소속) ----------
  function folderForm(l) {
    l.extentions = { ...(l.extentions ?? {}) };
    const df = l.extentions.da_folder = { ...l.extentions.da_folder };
    const fmap = folderMap(draft.lorebook);
    const id = df.id;
    const aff = !!df.aff;
    const redraw = () => render();
    const inside = (x) => ancestorsOf(x, fmap).some((f) => folderIdOf(f) === id);
    const leaves = draft.lorebook.filter((x) => !isFolder(x) && inside(x));
    const members = leaves.filter((x) => !isPlace(x));
    const places = [...leaves.filter(isPlace), ...draft.lorebook.filter((x) => isPlace(x) && !inside(x) && placeLinks(x).includes(id))];
    const sw = (c) => h("button", { type: "button", title: c || "자동", "aria-label": c ? `색 ${c}` : "자동 색", style: `width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid ${(df.color || "") === c ? "var(--rb-text)" : "transparent"};background:${c || "linear-gradient(135deg,#8ea2ff,#f2b8d6)"}`, onClick: () => {
      if (c) df.color = c;
      else delete df.color;
      changed();
      redraw();
    } });
    const setAff = (v) => {
      if (v) {
        df.aff = { ...defaultAff(), ...(df.aff ?? {}) };
        if (!l.comment?.startsWith(AFF_PREFIX)) l.comment = AFF_PREFIX + affName(l);
        enableRule(l, draft.lorebook);
      } else {
        delete df.aff;
        disableRule(l);
        l.comment = affName(l);
        l.key = "";
        l.content = "";
        l.alwaysActive = false;
      }
      syncRuleContent(draft.lorebook);
      changed();
      redraw();
    };
    const head = [
      field(aff ? "소속 이름" : "폴더 이름", prefixedName(l, aff ? AFF_PREFIX : "")),
      field("폴더 색", h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" }, sw(""), ...FOLDER_SWATCHES.map(sw))),
      h("p", { class: "rb-muted wide", style: "margin:0" }, `안에 든 항목 ${leaves.length}개 (하위 폴더 포함)`),
      h("div", { class: ["wide", "rb-da", aff && "on"] }, h(
        "div",
        { class: "rb-da-head" },
        h("span", { class: "rb-da-ico" }, icon("link", 18)),
        h("div", { class: "rb-da-ttl" }, h("b", null, "소속으로 쓰기"), h("small", null, aff ? `구성원 ${members.length}명 · 장소 ${places.length}곳` : "켜면 이 폴더 안 항목(하위 폴더 포함)이 모두 구성원이 돼요")),
        switchEl(aff, { label: "소속으로 쓰기", onChange: setAff })
      ))
    ];
    if (!aff) return h("div", { class: "rb-form" }, ...head);
    const a = df.aff = { ...defaultAff(), ...df.aff };
    a.prob = { ...(a.prob ?? {}) };
    const numBox = (obj, key, { min = 0, max, w = "72px", ph = "" } = {}) => {
      const el = h("input", { class: "rb-input rb-da-num", type: "number", min, max, placeholder: ph, value: obj[key] ?? "", style: `width:${w}` });
      el.addEventListener("input", () => {
        if (el.value === "") delete obj[key];
        else obj[key] = Number(el.value);
        changed();
      });
      return el;
    };
    // 지워진 구성원의 확률 칸 정리
    const ids = new Set(members.map(ridOf));
    for (const k of Object.keys(a.prob)) if (!ids.has(k)) delete a.prob[k];
    const rows = members.map((x) => {
      const rel = ancestorsOf(x, fmap);
      const sub = rel.slice(0, rel.findIndex((f) => folderIdOf(f) === id)).reverse().map((f) => affName(f));
      return h(
        "div",
        { class: "rb-da-cond" },
        h("button", { type: "button", class: "rb-da-lab", style: "cursor:pointer;background:none;border:0;color:var(--rb-acc-text);text-align:left;flex:1;min-width:0", onClick: () => goEntry(x) }, (sub.length ? sub.join(" › ") + " › " : "") + (x.comment || "(이름 없음)")),
        x.enabled === false ? badge("꺼짐", "warn") : null,
        numBox(a.prob, ridOf(x), { min: 0, max: 100, w: "70px", ph: String(a.def ?? 100) }),
        h("span", { class: "rb-da-note" }, "%")
      );
    });
    const card = (ic, title, sub, ...kids) => h("section", { class: "rb-da-card" }, h("header", null, icon(ic, 16), h("b", null, title), sub ? h("small", null, sub) : null), ...kids);
    const line = (...kids) => h("div", { class: "rb-da-line" }, ...kids);
    const lab = (t) => h("span", { class: "rb-da-lab" }, t);
    return h(
      "div",
      { class: "rb-form" },
      ...head,
      field("소속 키 (쉼표로 구분)", text(l, "key", { placeholder: "예) 선도부, 풍기위원회" }), true),
      field("소속 설명 (비워도 돼요)", area(l, "content", { tall: true, mono: false, tokens: true }), true),
      h(
        "div",
        { class: "wide rb-da on" },
        h("div", { class: "rb-da-grid" }, card(
          "link",
          `구성원 ${members.length}명`,
          "폴더 안 항목이 구성원이에요. 소속이 켜지면 구성원마다 확률을 굴려 켜요. 자기 키로 등장한 구성원은 항상 켜져요",
          rows.length ? h("div", { class: "rb-da-conds" }, ...rows) : h("p", { class: "rb-da-empty" }, "구성원이 없어요. 목록에서 항목을 이 폴더로 끌어다 놓으세요"),
          h(
            "div",
            { class: "rb-da-sub" },
            line(lab("기본 확률"), numBox(a, "def", { min: 0, max: 100, w: "70px", ph: "100" }), h("span", { class: "rb-da-note" }, "% (구성원 칸이 비어 있으면 이 값)")),
            line(lab("최대 인원"), numBox(a, "max", { min: 0, w: "70px", ph: "제한 없음" }), h("span", { class: "rb-da-note" }, "명 — 확률을 통과한 사람 중 무작위로 (비우면 제한 없음)"))
          )
        ), card(
          "search",
          `장소 ${places.length}곳`,
          "장소 키가 나오면 장소와 이 소속이 같이 켜져요",
          places.length ? h("div", { class: "rb-da-conds" }, ...places.map((x) => h("div", { class: "rb-da-cond" }, h("button", { type: "button", class: "rb-da-lab", style: "cursor:pointer;background:none;border:0;color:var(--rb-acc-text);text-align:left;flex:1", onClick: () => goEntry(x) }, affName(x) || "(이름 없음)"), badge(inside(x) ? "안에 있음" : "연결", "mute"), h("span", { class: "rb-da-note" }, String(x.key ?? "").trim() || "키 없음")))) : h("p", { class: "rb-da-empty" }, "장소가 없어요"),
          line(btn("이 소속 안에 장소 만들기", { size: "sm", icon: "plus", onClick: () => {
            const p = newPlaceEntry();
            p.extentions.da_parent = id;
            draft.lorebook.splice(draft.lorebook.indexOf(l) + 1, 0, p);
            syncRuleContent(draft.lorebook);
            es.sel.lorebook = draft.lorebook.indexOf(p);
            changed();
            render();
          } }))
        ))
      ),
      ruleSection(l)
    );
  }
  // ---------- Dusk 규칙 (조건부 발동·중복 금지·연쇄 확률·배치) ----------
  function ruleSection(l) {
    const rule = ruleOf(l);
    const on = !!rule && rule.on !== false;
    const redraw = () => render();
    const wrap = h("div", { class: ["wide", "rb-da", on && "on"] });
    const setOn = (v) => {
      l.extentions = { ...(l.extentions ?? {}) };
      if (v) {
        l.extentions.da_rid ||= newId();
        if (draft.lorebook.some((x) => x !== l && ridOf(x) === l.extentions.da_rid)) l.extentions.da_rid = newId();
        const nr = { ...(ruleOf(l) ?? defaultRule()), on: true };
        // 원래 항상 켜짐이던 항목은 키 조건 없이 시작
        if ((l.alwaysActive && !l.extentions?.da_aa) || l.mode === "constant") nr.cond = [];
        l.extentions.da_rule = nr;
        l.content = nativeContent(l.content, nr, l.extentions.da_rid);
      } else {
        delete l.extentions.da_rule;
        if (l.extentions.da_aa) {
          l.alwaysActive = false;
          delete l.extentions.da_aa;
        }
        l.content = plainContent(l.content);
      }
      changed();
      redraw();
    };
    const head = h(
      "div",
      { class: "rb-da-head" },
      h("span", { class: "rb-da-ico" }, icon("zap", 18)),
      h("div", { class: "rb-da-ttl" }, h("b", null, "Dusk 규칙"), h("small", null, on ? summary(rule) : "조건·확률·연쇄로 이 항목을 켜고 꺼요")),
      switchEl(on, { label: "Dusk 규칙 사용", onChange: (v) => setOn(v) })
    );
    wrap.appendChild(head);
    if (!on) {
      wrap.appendChild(h("p", { class: "rb-da-hint" }, "켜면 리스 활성화 키 대신 Dusk 규칙이 이 항목을 켜요. CBS·변수·#if는 리스가 그대로 처리하고, Dusk가 없는 사용자에게는 꺼진 항목으로 보여요."));
      return wrap;
    }
    const r = l.extentions.da_rule = rule;
    const others = draft.lorebook.filter((x) => x !== l && x.mode !== "folder" && !isLoreDivider(x));
    const otherSet = new Set(others);
    const pickEntry = (obj, key, empty = "항목 고르기") => entryPicker({
      win: ctx.win,
      list: draft.lorebook,
      pickable: (x) => otherSet.has(x),
      isDivider: isLoreDivider,
      value: (obj[key] && others.find((x) => ridOf(x) === obj[key])) || null,
      empty,
      noteOf: (x) => (isManaged(x) ? "" : "규칙 꺼짐"),
      labelOf: (x) => (isFolder(x) ? affName(x) : x.comment) || "(이름 없음)",
      title: "항목 고르기",
      onPick: (t) => {
        if (t) {
          t.extentions = { ...(t.extentions ?? {}) };
          t.extentions.da_rid ||= newId();
        }
        obj[key] = t ? t.extentions.da_rid : "";
        changed();
        redraw();
      }
    });
    const set = (key, v, re = true) => {
      r[key] = v;
      changed();
      if (re) redraw();
    };
    const numIn = (obj, key, { min = 0, max, w = "72px", onSet } = {}) => {
      const el = h("input", { class: "rb-input rb-da-num", type: "number", min, max, value: obj[key] ?? "", style: `width:${w}` });
      el.addEventListener("input", () => {
        obj[key] = el.value === "" ? void 0 : Number(el.value);
        onSet?.();
        changed();
      });
      return el;
    };
    const card = (ic, title, sub, ...kids) => h("section", { class: "rb-da-card" }, h("header", null, icon(ic, 16), h("b", null, title), sub ? h("small", null, sub) : null), ...kids);
    const line = (...kids) => h("div", { class: "rb-da-line" }, ...kids);
    const lab = (t) => h("span", { class: "rb-da-lab" }, t);
    const trash = (fn, label) => iconBtn("trash", label, { onClick: fn });

    // 1) 언제 켜질까
    const condRows = (r.cond ?? []).map((c, ci) => {
      const typeSel = select2(c, "t", COND_TYPES, () => {
        for (const k of Object.keys(c)) if (k !== "t") delete c[k];
        redraw();
      });
      typeSel.classList.add("rb-da-type");
      let params = [];
      if (c.t === "keys") params = [h("span", { class: "rb-da-note" }, String(l.key ?? "").trim() ? `키: ${l.key}` : "활성화 키 칸이 비어 있어요")];
      else if (c.t === "text" || c.t === "notext") params = [text(c, "keys", { placeholder: "단어1, 단어2" }), select2(c, "in", [["any", "누구 말이든"], ["user", "사용자 말"], ["char", "봇 말"]]), h("span", { class: "rb-da-opts" }, check(c, "all", "모두 있어야"), check(c, "regex", "정규식"))];
      else if (c.t === "var") params = [text(c, "name", { placeholder: "변수 이름" }), select2(c, "op", VAR_OPS.map((o) => [o, o]), redraw), c.op === "있음" || c.op === "없음" ? null : text(c, "val", { placeholder: "값" })];
      else if (c.t === "turn") params = [numIn(c, "min", { w: "70px" }), h("span", { class: "rb-da-note" }, "턴부터"), numIn(c, "max", { w: "70px" }), h("span", { class: "rb-da-note" }, "턴까지")];
      else if (c.t === "count") params = [text(c, "keys", { placeholder: "단어1, 단어2" }), select2(c, "in", [["any", "누구 말이든"], ["user", "사용자 말"], ["char", "봇 말"]]), numIn(c, "min", { min: 0, w: "64px" }), h("span", { class: "rb-da-note" }, "번 이상 (메시지 수)"), h("span", { class: "rb-da-opts" }, check(c, "regex", "정규식"))];
      else if (c.t === "times") params = [pickEntry(c, "rid", "이 항목 자신"), numIn(c, "min", { min: 0, w: "64px" }), h("span", { class: "rb-da-note" }, "번 이상 켜짐 (켜진 턴 수, 최근 50개까지)")];
      else if (c.t === "with" || c.t === "without") params = [pickEntry(c, "rid")];
      return h("div", { class: "rb-da-cond" }, h("span", { class: "rb-da-idx" }, String(ci + 1)), typeSel, h("div", { class: "rb-da-params" }, ...params.filter(Boolean)), trash(() => {
        r.cond.splice(ci, 1);
        changed();
        redraw();
      }, "조건 지우기"));
    });
    const addCondBtn = btn("조건 추가", { size: "sm", icon: "plus", onClick: (ev) => openMenu(ctx.win, ev.currentTarget, COND_TYPES.map(([t, label]) => ({ label, onClick: () => {
      r.cond.push({ t });
      changed();
      redraw();
    } }))) });
    const whenCard = card(
      "search",
      "언제 켜질까",
      "조건이 없으면 매 턴 켜질 후보가 돼요",
      (r.cond ?? []).length > 1 ? line(lab("조건을"), segmented([["all", "모두 만족"], ["any", "하나라도 만족"]], r.mode === "any" ? "any" : "all", (v) => set("mode", v, false), "조건 묶음")) : null,
      condRows.length ? h("div", { class: "rb-da-conds" }, ...condRows) : h("p", { class: "rb-da-empty" }, "조건 없음 — 확률과 반복 설정만 적용돼요"),
      line(addCondBtn),
      h(
        "div",
        { class: "rb-da-sub" },
        line(lab("찾는 범위"), h("span", { class: "rb-da-note" }, "최근"), numIn(r, "scan", { min: 1, w: "64px" }), h("span", { class: "rb-da-note" }, "개 메시지")),
        line(switchEl(!!r.whole, { label: "이름 경계", onChange: (v) => set("whole", v) }), h("span", null, "이름 경계"), h("span", { class: "rb-da-note" }, "'김민'이 '김민수'엔 안 걸리고 '김민이·김민에게'엔 걸려요. 한글 1~2글자 키는 설정 → 로어북 → 이름 경계에 따라 자동 적용돼요")),
        line(switchEl(!!r.common, { label: "흔한 낱말 이름", onChange: (v) => set("common", v) }), h("span", null, "흔한 낱말 이름"), h("span", { class: "rb-da-note" }, "'하늘·유리·보라'처럼 일반 낱말과 같은 이름이면 켜요. '하늘이 맑다'에는 안 켜지고, 부를 때(하늘아·하늘 씨), 확인 단어가 같이 나올 때, 최근 3턴 안에 켜졌을 때만 켜져요")),
        r.common ? h("div", { class: "rb-da-sub", style: "display:flex;flex-direction:column;gap:6px" },
          line(lab("흔한 낱말인 키"), h("div", { style: "flex:1;min-width:180px" }, text(r, "commonKeys", { placeholder: `비우면 첫 키 '${String(l.key ?? "").split(",")[0].trim() || "?"}'` }))),
          line(lab("확인 단어"), h("div", { style: "flex:1;min-width:180px" }, text(r, "commonWords", { placeholder: "예) 강하늘, 하늘 선배, 검도부, 은발 — 쉼표로 구분" }))),
          h("span", { class: "rb-da-note" }, "다른 키(예: 강하늘)는 평소처럼 걸려요. 확인 단어는 성·별명·직업·외모처럼 이 인물을 말할 때 같이 나오는 말을 적어요.")) : null
      )
    );

    // 2) 얼마나 자주
    const probNum = numIn(r, "prob", { min: 0, max: 100, w: "64px", onSet: () => {
      range.value = String(r.prob ?? 100);
    } });
    const range = h("input", { type: "range", min: 0, max: 100, step: 1, value: String(r.prob ?? 100), class: "rb-da-range", "aria-label": "켜질 확률" });
    range.addEventListener("input", () => {
      r.prob = Number(range.value);
      probNum.value = range.value;
      changed();
    });
    const oftenCard = card(
      "refresh",
      "얼마나 자주",
      null,
      line(lab("켜질 확률"), range, probNum, h("span", { class: "rb-da-note" }, "%")),
      line(lab("반복"), segmented([["none", "제한 없음"], ["chat", "채팅에서 한 번"], ["cooldown", "쉬었다가"]], r.once || "none", (v) => set("once", v), "반복")),
      r.once === "cooldown" ? line(lab(""), h("span", { class: "rb-da-note" }, "켜진 뒤"), numIn(r, "cool", { min: 1, w: "64px" }), h("span", { class: "rb-da-note" }, "턴 쉬기")) : null,
      h("div", { class: "rb-da-pair" }, line(lab("유지"), numIn(r, "hold", { min: 0, w: "64px" }), h("span", { class: "rb-da-note" }, "턴 동안 계속 켜 둬요 (0·1이면 그 턴만)")), h("span", { class: "rb-da-note", style: "color:var(--rb-mute)" }, "켜진 턴부터 세고, 유지 중에는 조건·확률을 다시 보지 않아요")),
      line(lab("중복 금지 그룹"), text(r, "group", { placeholder: "예) 날씨 — 같은 그룹은 한 턴에 하나만" }))
    );

    // 3) 같이 켜기
    const chainRows = (r.chain ?? []).map((c, ci) => h("div", { class: "rb-da-cond" }, h("span", { class: "rb-da-arrow" }, "→"), pickEntry(c, "rid"), numIn(c, "prob", { min: 0, max: 100, w: "64px" }), h("span", { class: "rb-da-note" }, "% 확률"), trash(() => {
      r.chain.splice(ci, 1);
      changed();
      redraw();
    }, "연쇄 지우기")));
    const chainCard = card(
      "link",
      "같이 켜기",
      "이 항목이 켜지면 다른 항목도 확률로 켜요 (대상도 규칙이 켜져 있어야 해요)",
      chainRows.length ? h("div", { class: "rb-da-conds" }, ...chainRows) : null,
      line(btn("연쇄 추가", { size: "sm", icon: "plus", onClick: () => {
        r.chain.push({ rid: "", prob: 100 });
        changed();
        redraw();
      } }))
    );

    // 3-2) 켜질 때 변수
    const setRows = (r.set ?? []).map((x, xi) => {
      const isExpr = x.op === "expr";
      const err = isExpr ? checkExpr(x.val) : null;
      return h(
        "div",
        { class: "rb-da-cond" },
        h("span", { class: "rb-da-idx" }, String(xi + 1)),
        h(
          "div",
          { class: "rb-da-params" },
          text(x, "name", { placeholder: "변수 이름" }),
          select2(x, "op", SET_OPS.map(([o, t]) => [o, t]), redraw),
          text(x, "val", { placeholder: isExpr ? "예) love*2 + hp/10" : x.op === "=" ? "값" : "숫자" }),
          isExpr ? h("button", { type: "button", class: "rb-badge", style: "cursor:pointer;border:1px solid var(--rb-line3);background:transparent;color:var(--rb-acc-text);height:26px;padding:0 10px;font-size:13px", title: "수식 쓰는 법", "aria-label": "수식 쓰는 법", onClick: () => exprHelp() }, "? 쓰는 법") : null
        ),
        trash(() => {
          r.set.splice(xi, 1);
          changed();
          redraw();
        }, "변수 지우기"),
        err ? h("div", { class: "rb-da-err" }, `수식 오류 — ${err}`) : null
      );
    });
    const setCard = card(
      "edit",
      "켜질 때 변수",
      "새로 켜질 때 채팅 변수를 바꿔요 (유지로 이어진 턴은 빼요). 더하기·빼기·곱하기·나누기, 또는 수식으로 계산해요. 다른 규칙의 '변수 비교' 조건이나 본문의 {{getvar::이름}}과 이어져요",
      setRows.length ? h("div", { class: "rb-da-conds" }, ...setRows) : null,
      line(btn("변수 추가", { size: "sm", icon: "plus", onClick: () => {
        r.set ??= [];
        r.set.push({ name: "", op: "=", val: "" });
        changed();
        redraw();
      } }))
    );

    // 4) 어디에 넣을까
    const placeCard = card(
      "split",
      "어디에 넣을까",
      null,
      line(lab("위치"), segmented([["top", "로어북 자리"], ["depth", "대화 사이"], ["bottom", "대화 맨 끝"]], r.at || "top", (v) => set("at", v), "위치")),
      r.at === "depth" ? line(lab(""), h("span", { class: "rb-da-note" }, "끝에서"), numIn(r, "depth", { min: 0, w: "64px" }), h("span", { class: "rb-da-note" }, "개 메시지 위")) : null,
      line(lab("역할"), segmented([["system", "system"], ["user", "user"], ["assistant", "assistant"]], r.role || "system", (v) => set("role", v, false), "역할"))
    );

    wrap.append(
      h("div", { class: "rb-da-grid" }, whenCard, oftenCard, chainCard, setCard, placeCard),
      h("p", { class: "rb-da-foot" }, `변수 ${gateVar(ridOf(l))} · 내용의 @@activate·{{#if}} 줄은 저장할 때 자동으로 맞춰져요. 본문은 {{#if}}와 {{/if}} 사이만 고치세요.`)
    );
    return wrap;
  }
  // 규칙 한 줄 요약 (머리에 표시)
  function summary(r) {
    const parts = [];
    const cn = (r.cond ?? []).length;
    parts.push(cn ? (cn === 1 ? COND_TYPES.find((x) => x[0] === r.cond[0].t)?.[1].replace(/이 항목의 |최근 대화에 /g, "") ?? "조건 1개" : `조건 ${cn}개 ${r.mode === "any" ? "중 하나" : "모두"}`) : "매 턴");
    if (Number(r.prob ?? 100) < 100) parts.push(`${r.prob}%`);
    if (r.once === "chat") parts.push("한 번만");
    if (r.once === "cooldown") parts.push(`${r.cool ?? 1}턴 쉼`);
    if (Number(r.hold) > 1) parts.push(`${r.hold}턴 유지`);
    if ((r.set ?? []).length) parts.push(`변수 ${r.set.length}`);
    if (String(r.group ?? "").trim()) parts.push(`그룹 ${r.group}`);
    if ((r.chain ?? []).length) parts.push(`연쇄 ${r.chain.length}`);
    if (r.whole) parts.push("이름 경계");
    if (r.common) parts.push("흔한 낱말 이름");
    return parts.join(" · ");
  }
  // 수식 쓰는 법 (켜질 때 변수 → 수식 옆 ? 버튼)
  function exprHelp() {
    const row = (a, b) => h("div", { style: "display:flex;gap:10px;padding:5px 0;border-top:1px solid var(--rb-line3)" }, h("code", { style: "flex:none;min-width:150px;color:var(--rb-acc-text)" }, a), h("span", { style: "flex:1;word-break:keep-all;font-size:13.5px" }, b));
    const back = h("div", { class: "rb-modal", onMousedown: (ev) => {
      if (ev.target === back) back.remove();
    } });
    back.appendChild(h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "수식 쓰는 법", style: "max-width:560px;max-height:calc(100% - 40px);overflow:auto" },
      h("h3", { class: "rb-h3" }, "수식 쓰는 법"),
      h("p", { class: "rb-muted", style: "margin:0" }, "계산한 결과가 이 변수의 새 값이 돼요. 변수 이름을 그대로 쓰면 지금 값으로 계산해요 (숫자가 아니거나 없으면 0)."),
      h("b", null, "부호"),
      row("+  -  *  /", "더하기 · 빼기 · 곱하기 · 나누기"),
      row("%", "나머지 (10 % 3 = 1)"),
      row("^", "거듭제곱 (2 ^ 3 = 8)"),
      row("( )", "먼저 계산할 부분 묶기"),
      h("b", { style: "margin-top:6px" }, "함수"),
      row("min(a, b, …)  max(a, b, …)", "가장 작은 값 · 가장 큰 값"),
      row("abs(x)", "절댓값"),
      row("floor(x)  ceil(x)  round(x)", "내림 · 올림 · 반올림"),
      row("clamp(x, 최소, 최대)", "범위 안으로 맞추기"),
      row("rand(a, b)", "a~b 사이 정수 난수 (rand()는 0~1 사이 소수)"),
      h("b", { style: "margin-top:6px" }, "예약 이름"),
      row("turn  또는  턴", "지금 턴 (사용자 메시지 수)"),
      h("b", { style: "margin-top:6px" }, "예시"),
      row("love + 5", "love를 5 올리기"),
      row("clamp(love*1.5, 0, 100)", "1.5배로 하되 0~100 안에서"),
      row("max(hp - 10, 0)", "10 깎되 0 아래로는 안 내려가게"),
      row("floor(hp / 2)", "절반(소수점 버림)"),
      row("rand(1, 6)", "주사위 한 번 굴려 저장"),
      h("p", { class: "rb-muted", style: "margin:6px 0 0;font-size:12.5px;line-height:1.7" }, "· 0으로 나누거나 수식이 틀리면 그 항목은 건너뛰고 값을 그대로 둬요. 틀린 부분은 입력칸 아래에 빨갛게 알려 줘요.", h("br"), "· 결과가 소수면 소수 여섯째 자리까지만 남겨요.", h("br"), "· 위쪽 항목부터 차례로 계산해서, 앞에서 바꾼 값을 뒤 수식이 바로 써요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => back.remove() }))
    ));
    ctx.win.appendChild(back);
  }
  // 규칙 시험: 가상 대화를 한 턴씩 보내 보며 어떤 규칙이 왜 켜지고 안 켜지는지, 변수가 어떻게 바뀌는지 본다
  // (저장하지 않은 편집 중인 로어북 그대로 계산. 실제 채팅·변수는 건드리지 않는다)
  function ruleTester(opts = {}) {
    // 우측 하단 버튼에서 펼쳐지는 창 (뒤쪽 편집 화면은 그대로 쓸 수 있어서, 고치고 바로 다시 시험할 수 있다)
    const old = panel.querySelector("#rb-rule-test");
    if (old && opts.lorebook) old.remove();
    else if (old) return old.closeTester?.();
    const back = h("div", { id: "rb-rule-test", style: "position:absolute;right:16px;bottom:16px;z-index:40;width:min(760px,calc(100% - 32px));max-height:calc(100% - 32px);display:flex;transform-origin:100% 100%" });
    const still = !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let closing = false;
    const closeTester = () => {
      if (closing) return;
      closing = true;
      const done = () => {
        back.remove();
        testFab.style.visibility = "";
        testFab.focus?.();
      };
      if (still || !back.animate) return done();
      const a = back.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.1)", opacity: 0 }], { duration: 200, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
      a.onfinish = done;
    };
    back.closeTester = closeTester;
    back.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        closeTester();
      }
    });
    const input = h("textarea", { class: "rb-textarea", spellcheck: "false", style: "min-height:58px", placeholder: "사용자 입력 (예: 사과 먹을래?) — Enter로 보내기, Shift+Enter 줄바꿈" });
    const botIn = h("input", { class: "rb-input", placeholder: "봇 답변 (선택) — '봇 말'을 보는 조건을 시험할 때", style: "flex:1;min-width:200px;height:38px" });
    const priorIn = h("textarea", { class: "rb-textarea", spellcheck: "false", style: "min-height:76px", placeholder: "이미 오간 대화 (선택). 한 줄에 하나, '나:'로 시작하면 사용자, 아니면 봇.\n누적 횟수·최근 대화 조건을 시험할 때 써요" });
    const startVars = h("input", { class: "rb-input", placeholder: "시작 변수 (예: hp=5, mood=angry)", style: "flex:1;min-width:180px" });
    const curVars = h("input", { class: "rb-input", placeholder: "현재 변수 — 직접 고쳐도 돼요 (예: love=3, hp=10)", style: "flex:1;min-width:180px" });
    const turnIn = h("input", { class: "rb-input", type: "number", min: 0, style: "width:84px" });
    const probSel = h("select", { class: "rb-input", style: "width:auto", "aria-label": "확률" }, h("option", { value: "real" }, "확률 그대로"), h("option", { value: "on" }, "확률 항목 모두 켜짐"), h("option", { value: "off" }, "확률 항목 모두 안 켜짐"));
    const logEl = h("div", { class: "rb-scroll", style: "max-height:36vh;display:flex;flex-direction:column;gap:8px" });
    const turnBadge = h("span", { class: "rb-badge", style: "font-size:13px;padding:3px 11px;background:var(--rb-acc-soft);color:var(--rb-acc-text)" });
    const recEl = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
    let hist = [], sim = {}, vars = {}, turns = [], base = 0;
    const userCount = (m) => m.filter((x) => x.role === "user").length;
    const curTurn = () => base + userCount(hist);
    const parseVars = (txt) => Object.fromEntries(String(txt).split(",").map((x) => x.split("=").map((y) => y.trim())).filter((x) => x[0]).map(([k, ...v]) => ["$" + k, v.join("=")]));
    const items = () => collectManaged(opts.lorebook ?? draft.lorebook);
    const parseMsgs = (txt) => String(txt).split("\n").map((x) => x.trim()).filter(Boolean).map((x) => /^(나|user|유저)\s*[:：]/i.test(x) ? { role: "user", data: x.replace(/^[^:：]*[:：]\s*/, "") } : { role: "char", data: x.replace(/^(봇|char|bot)\s*[:：]\s*/i, "") });
    const rngOpts = () => ({ ignoreProb: probSel.value === "on", rng: probSel.value === "off" ? () => 0.99999 : Math.random });
    const turnCard = (t) => {
      const chip = (a) => h("div", { class: "rb-issue" }, icon("check", 14), h("span", null, `${a.entry.comment || a.rid} — ${a.why}`));
      const off = t.trace.filter((x) => !x.on);
      const diff = Object.entries(t.sets).map(([n, v]) => `${n}: ${t.prevVars["$" + n] ?? "없음"} → ${v}`);
      return h(
        "div",
        { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:6px;flex:none" },
        h("div", { style: "display:flex;gap:8px;align-items:baseline" }, h("span", { class: "rb-badge", style: "background:var(--rb-acc-soft);color:var(--rb-acc-text)" }, `${t.turn}턴`), h("b", { style: "word-break:break-all" }, t.input)),
        t.bot ? h("div", { class: "rb-muted", style: "font-size:12.5px" }, `봇: ${t.bot}`) : null,
        t.fired.length ? h("div", { class: "rb-issues" }, t.fired.map(chip)) : h("p", { class: "rb-muted", style: "margin:0" }, "켜진 항목이 없어요."),
        diff.length ? h("div", { style: "font-size:12.5px;color:var(--rb-acc-text)" }, "변수 바뀜 · " + diff.join(", ")) : null,
        off.length ? h("details", null, h("summary", { class: "rb-muted" }, `안 켜진 항목 ${off.length}개 — 왜?`), h("div", { style: "display:flex;flex-direction:column;gap:3px;font-size:12.5px;padding-top:4px" }, off.map((x) => h("div", null, h("b", null, x.name), h("span", { class: "rb-muted" }, ` — ${x.why}`))))) : null,
        t.fired.length ? h("details", null, h("summary", { class: "rb-muted" }, "켜진 항목 내용 (CBS는 리스가 처리)"), h("pre", { style: "white-space:pre-wrap;font-size:12px" }, t.fired.map((a) => `[${a.entry.comment || a.rid}]\n${bodyOf(a.entry.content)}`).join("\n\n"))) : null
      );
    };
    // 켜진 기록(한 번만·쿨다운·유지·'N번 이상 켜짐' 시험용): 항목마다 켜진 턴을 직접 고칠 수 있다
    const paintRec = () => {
      const list = items();
      replace(recEl, list.length ? list.map((it) => {
        const turnsOf = sim.f?.[it.rid] ?? [];
        const el = h("input", { class: "rb-input", value: turnsOf.join(", "), placeholder: "켜진 턴 (예: 2, 5)", style: "flex:1;min-width:120px" });
        el.addEventListener("change", () => {
          const nums = el.value.split(/[ ,]+/).map(Number).filter((x) => x > 0 && isFinite(x));
          sim = { f: { ...(sim.f ?? {}), [it.rid]: nums }, t: { ...(sim.t ?? {}), [it.rid]: nums } };
          if (!nums.length) {
            delete sim.f[it.rid];
            delete sim.t[it.rid];
          }
        });
        return h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, h("span", { style: "flex:none;min-width:120px;font-size:13px;word-break:keep-all" }, it.entry.comment || it.rid), el);
      }) : h("p", { class: "rb-muted", style: "margin:0" }, "규칙이 켜진 항목이 없어요."));
    };
    const paint = () => {
      replace(logEl, turns.length ? turns.map(turnCard) : h("p", { class: "rb-muted", style: "margin:0" }, "아직 보낸 입력이 없어요. 아래에 입력하고 [보내기]를 누르세요. 한 번만·쿨다운·유지·누적 횟수는 보낸 순서대로 이어서 계산돼요."));
      const c = curTurn();
      turnBadge.textContent = `지금 ${c}턴 · 다음 입력은 ${c + 1}턴`;
      turnIn.value = String(c);
      curVars.value = Object.entries(vars).map(([k, v]) => `${k.slice(1)}=${v}`).join(", ");
      paintRec();
      logEl.scrollTop = logEl.scrollHeight;
    };
    // 환경(시작 턴·이전 대화·시작 변수)을 바꾸면 처음부터 다시
    const reset = () => {
      hist = parseMsgs(priorIn.value);
      sim = {};
      turns = [];
      base = 0;
      vars = parseVars(startVars.value);
      paint();
    };
    turnIn.addEventListener("change", () => {
      base = Math.max(0, Number(turnIn.value) || 0) - userCount(hist);
      if (base < -userCount(hist)) base = -userCount(hist);
      paint();
    });
    curVars.addEventListener("change", () => {
      vars = parseVars(curVars.value);
      paint();
    });
    const send = () => {
      const text = input.value.trim();
      if (!text) return input.focus();
      const list = items();
      if (!list.length) return ctx.toast("규칙이 켜진 로어북 항목이 없어요", { error: true });
      const msgs = [...hist, { role: "user", data: text }];
      const turn = base + userCount(msgs);
      const opts = rngOpts();
      const res = evaluate({ items: list, messages: msgs, turn, state: sim, vars, ...opts });
      const sets = applySets(res.fired, vars, { turn, rng: opts.rng });
      const prevVars = vars;
      const prevBase = base;
      vars = { ...vars };
      for (const [n, v] of Object.entries(sets)) vars["$" + n] = v;
      const bot = botIn.value.trim();
      turns.push({ turn, input: text, bot, fired: res.fired, trace: res.trace, sets, prevVars, undo: { hist, sim, vars: prevVars, base: prevBase } });
      hist = bot ? [...msgs, { role: "char", data: bot }] : msgs;
      sim = res.state;
      input.value = "";
      botIn.value = "";
      paint();
      input.focus();
    };
    const undo = () => {
      const t = turns.pop();
      if (!t) return;
      ({ hist, sim, vars, base } = t.undo);
      paint();
    };
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        send();
      }
    });
    const lab = (t) => h("span", { class: "rb-muted", style: "flex:none;min-width:84px;font-size:12.5px" }, t);
    const env = h(
      "details",
      { style: "border:1px solid var(--rb-line3);border-radius:12px;padding:8px 12px" },
      h("summary", { style: "cursor:pointer;font-weight:600" }, "시험 환경 — 턴·이전 대화·변수·기록·확률"),
      h(
        "div",
        { style: "display:flex;flex-direction:column;gap:10px;padding-top:10px" },
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, lab("지금 턴"), turnIn, h("span", { class: "rb-muted", style: "font-size:12.5px" }, "고치면 그 턴까지 진행된 채팅처럼 계산해요 (턴 범위 조건)")),
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, lab("현재 변수"), curVars, h("span", { class: "rb-muted", style: "font-size:12.5px" }, "고치고 Enter (변수 비교 조건)")),
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, lab("확률"), probSel, h("span", { class: "rb-muted", style: "font-size:12.5px" }, "100% 미만 항목과 연쇄를 켜지게·안 켜지게 고정")),
        h("div", { style: "display:flex;flex-direction:column;gap:4px" }, lab("켜진 기록"), recEl, h("span", { class: "rb-muted", style: "font-size:12.5px" }, "한 번만·쿨다운·유지·'N번 이상 켜짐'을 시험할 때 항목이 켜졌던 턴을 직접 넣어요")),
        h("div", { style: "display:flex;flex-direction:column;gap:4px" }, lab("이전 대화"), priorIn),
        h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, lab("시작 변수"), startVars, btn("이 환경으로 처음부터", { size: "sm", onClick: reset }))
      )
    );
    reset();
    back.appendChild(h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "규칙 시험", style: "max-width:none;width:100%;max-height:100%;overflow:auto;animation:none" },
      h("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, h("h3", { class: "rb-h3", style: "margin:0" }, "규칙 시험 — 가상 대화"), turnBadge),
      opts.lorebook ? h("div", { class: "rb-note warn", role: "status", style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, h("span", { style: "flex:1;min-width:180px" }, "AI 수정안을 적용한 상태로 시험 중이에요. 아직 편집기에는 반영되지 않았어요."), opts.onBack ? btn("수정안으로 돌아가기", { size: "sm", onClick: () => { closeTester(); opts.onBack(); } }) : null) : null,
      h("p", { class: "rb-muted", style: "margin:0" }, opts.lorebook ? "수정안이 적용된 로어북으로 입력을 한 턴씩 보내 봐요. 실제 채팅과 변수는 건드리지 않아요." : "지금 편집 중인 로어북(저장 전 변경 포함)으로 입력을 한 턴씩 보내 봐요. 실제 채팅과 변수는 건드리지 않아요."),
      logEl,
      input,
      botIn,
      env,
      h("div", { class: "btns" }, btn("처음부터", { onClick: reset, title: "대화·기록·변수를 처음 상태로" }), btn("마지막 턴 취소", { onClick: undo }), btn("보내기", { kind: "primary", onClick: send }), btn("닫기", { onClick: closeTester }))
    ));
    // 안쪽이 넘치면 줄어들어 잘리지 않고 스크롤되게
    for (const c of back.firstChild.children) c.style.flexShrink = "0";
    panel.appendChild(back);
    testFab.style.visibility = "hidden";
    if (!still && back.animate) back.animate([{ transform: "scale(.1)", opacity: 0 }, { opacity: 1, offset: .35 }, { transform: "scale(1)", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.2,.9,.25,1.04)" });
    input.focus();
  }
  function regexForm(r) {
    const flagInput = text(r, "flag", { placeholder: "g, i, m, s…" });
    const flags = h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap;align-items:center" }, check(r, "ableFlag", "플래그 직접 지정"), h("div", { style: "width:180px" }, flagInput));
    // 바로 시험 (RE2JS 한 엔진): 입력 글에서 일치한 곳을 강조하고, 위치·캡처 그룹·바뀐 결과를 보여 준다. CBS·@@ 같은 특수 문법은 기존 근사 시험으로.
    const testIn = h("textarea", { class: "rb-textarea", rows: 3, spellcheck: "false", placeholder: "여기에 시험할 글을 붙여넣으면 바로 결과가 나와요", "aria-label": "정규식 시험 입력" });
    const testOut = h("div", { style: "display:flex;flex-direction:column;gap:8px;margin-top:8px", "aria-live": "polite" });
    let seq = 0;
    const msg = (t, danger) => replace(testOut, h("div", { class: "rb-muted", style: `white-space:pre-wrap;word-break:break-word;font-size:13px;${danger ? "color:var(--rb-danger)" : ""}` }, t));
    const runTest = async () => {
      const my = ++seq;
      if (!testIn.value) return replace(testOut);
      const res = regexRun([{ ...r }], testIn.value, r.type), st = res.steps[0];
      if (!st) return msg("패턴이 비었거나 '비활성' 상태예요");
      if (st.skipped) return msg(st.skipped);
      let rich = null;
      try {
        rich = await (await import('../../dev/aibuild/regextest.js')).regexTest({ in: String(r.in ?? ""), out: String(r.out ?? ""), flag: r.flag, ableFlag: !!r.ableFlag }, testIn.value);
      } catch (e) {
        // RE2JS가 못 다루는 문법(CBS·@@ 액션 등)은 기존 시험 결과로 보여 준다
        if (my !== seq) return;
        return msg(st.error ? `패턴 오류: ${st.error}` : st.matched ? `일치 ${st.matched}곳 (간이 시험: ${e.message})\n${res.out}` : `일치하는 곳이 없어요 (간이 시험: ${e.message})`, !!st.error);
      }
      if (my !== seq) return;
      if (!rich.matches.length) return msg("일치하는 곳이 없어요");
      const sum = summarize(rich.matches);
      replace(testOut,
        h("div", { style: "font-size:13px;font-weight:600" }, `일치 ${rich.matches.length.toLocaleString()}곳`),
        h("div", { class: "rb-rx-in", "aria-label": "일치한 곳 표시" }, ...segments(testIn.value, rich.matches).map((g) => g.hit === null ? g.text : h("mark", { title: `위치 ${rich.matches[g.hit].start}–${rich.matches[g.hit].end}` }, g.text))),
        h("div", { class: "rb-rx-lines" }, sum.lines.join("\n") + (sum.more ? `\n… 외 ${sum.more}곳` : "")),
        h("div", { style: "font-size:12px;font-weight:600;color:var(--rb-sub)" }, "바뀐 결과"),
        h("div", { class: "rb-rx-out" }, rich.output),
        rich.note ? h("div", { class: "rb-muted", style: "font-size:12px" }, rich.note) : null);
    };
    testIn.addEventListener("input", runTest);
    const form = h(
      "div",
      { class: "rb-form" },
      field("이름", text(r, "comment")),
      field("적용 시점", select2(r, "type", REGEX_TYPES)),
      field("찾을 패턴 (IN)", codeArea(r, "in", { lang: "regex" }), true),
      field("바꿀 내용 (OUT)", codeArea(r, "out", { lang: "replace", tall: true }), true),
      field("바로 시험", h("div", null, testIn, testOut), true),
      advFold("regex", "고급 설정", "플래그 직접 지정", flags)
    );
    form.addEventListener("input", runTest);
    form.addEventListener("change", runTest);
    return form;
  }
  function triggerForm(t) {
    const lua = Array.isArray(t.effect) && t.effect.length === 1 && ["triggerlua", "triggercode"].includes(t.effect[0]?.type) ? t.effect[0] : null;
    const kindBadge = h("span", { class: "rb-kind wide", style: "align-self:flex-start" }, icon(lua ? "code" : "zap", 14), lua ? (lua.type === "triggerlua" ? "Lua 트리거" : "코드 트리거") : "일반 트리거 (조건 · 효과)");
    return h(
      "div",
      { class: "rb-form" },
      kindBadge,
      field("이름", text(t, "comment")),
      field("실행 시점", select2(t, "type", TRIGGER_TYPES)),
      lua ? field(lua.type === "triggerlua" ? "Lua 코드" : "트리거 코드", lua.type === "triggerlua" ? codeArea(lua, "code", { lang: "lua", tall: true }) : area(lua, "code", { tall: true }), true) : null,
      lua ? null : field("조건 (conditions, JSON)", jsonArea(t, "conditions"), true),
      lua ? null : field("효과 (effect, JSON)", jsonArea(t, "effect", { tall: true }), true),
      advFold("trigger", "고급 설정", lua ? "저수준 접근 · 조건(JSON)" : "저수준 접근",
        h("div", { class: "wide", style: "display:flex;gap:16px" }, check(t, "lowLevelAccess", "저수준 접근")),
        lua ? field("조건 (conditions, JSON)", jsonArea(t, "conditions"), true) : null)
    );
  }
  // 초기 변수(defaultVariables): Lua가 읽고 쓰는 변수의 시작값. 봇에만 있다 (모듈엔 없음)
  function varsPane() {
    const rows = parseVars(draft.defaultVariables);
    const wrap = h("div", { class: "rb-vars" });
    const commit = () => { draft.defaultVariables = serializeVars(rows); if (!draft.defaultVariables && original.defaultVariables === void 0) delete draft.defaultVariables; changed(); };
    const paint = () => {
      const dup = duplicateKeys(rows);
      replace(wrap,
        rows.length ? rows.map((row, i) => {
          const k = h("input", { class: "rb-input k", value: row.k, placeholder: "변수 이름", "aria-label": `변수 ${i + 1} 이름`, autocapitalize: "off", autocomplete: "off", spellcheck: "false" });
          const v = row.v === null ? h("span", { class: "rb-muted v", style: "font-size:12px" }, "(= 없는 줄 — 그대로 보존)") : h("input", { class: "rb-input v", value: row.v, placeholder: "시작값", "aria-label": `변수 ${i + 1} 값`, autocapitalize: "off", autocomplete: "off", spellcheck: "false" });
          k.addEventListener("input", () => { row.k = k.value; commit(); });
          v.addEventListener?.("input", () => { row.v = v.value; commit(); });
          return h("div", { class: "rb-var" }, k, v, h("span", { class: "x" }, iconBtn("trash", `변수 ${i + 1} 지우기`, { onClick: () => { rows.splice(i, 1); commit(); paint(); } })));
        }) : h("div", { class: "rb-emptycard" }, icon("sliders", 26), h("b", null, "초기 변수가 없어요"), h("span", null, "Lua가 쓸 변수의 시작값을 정해 둘 수 있어요. 예: hp = 100")),
        dup.size ? note("warn", `같은 이름이 두 번 있어요: ${[...dup].join(", ")} — 아래쪽 값이 나중에 적용돼요.`) : null,
        h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("변수 추가", { size: "sm", icon: "plus", onClick: () => { rows.push({ k: "", v: "" }); paint(); wrap.querySelectorAll(".k").forEach((x, n, a) => n === a.length - 1 && x.focus()); } })));
    };
    paint();
    return h("div", { class: "pane" }, h("p", { class: "rb-muted", style: "margin:0;font-size:13px" }, "한 줄에 변수 하나(key=value)로 저장돼요. 채팅이 시작될 때 이 값으로 채워지고, Lua·트리거가 읽고 바꿔요."), wrap);
  }
  function renderJson() {
    const view = structuredClone(draft);
    delete view[cfg.idKey];
    const el = h("textarea", { class: "rb-textarea", style: "flex:1;min-height:60vh", spellcheck: "false", "aria-label": "전체 JSON" });
    el.value = JSON.stringify(view, null, 2);
    attachUndo(el);
    const msg = h("span", { class: "rb-muted", "aria-live": "polite" }, "전체를 JSON으로 고쳐요. 식별자(id)는 바꿀 수 없어요.");
    const stat = h("small", { class: "rb-muted", style: "white-space:nowrap" });
    // 칠 때마다 문법을 확인해 오류가 있는 줄을 알려 준다
    const lineOf = (e) => { const m = /position (\d+)/.exec(e.message) ?? /line (\d+)/.exec(e.message); if (!m) return ""; return /line/.test(m[0]) ? ` (${m[1]}번째 줄)` : ` (${el.value.slice(0, Number(m[1])).split("\n").length}번째 줄)`; };
    const check2 = () => {
      try { JSON.parse(el.value); stat.textContent = `올바른 JSON · ${el.value.length.toLocaleString()}자`; stat.style.color = "var(--rb-teal)"; el.style.borderColor = ""; return true; }
      catch (e) { stat.textContent = `문법 오류${lineOf(e)}`; stat.style.color = "var(--rb-danger)"; el.style.borderColor = "var(--rb-danger)"; return false; }
    };
    let jt = 0;
    el.addEventListener("input", () => { clearTimeout(jt); jt = setTimeout(check2, 200); });
    const fmtB = btn("서식 정리", { size: "sm", onClick: () => {
      try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); check2(); msg.textContent = "들여쓰기를 정리했어요."; msg.style.color = ""; }
      catch (e) { msg.textContent = `정리하지 못했어요: ${e.message}`; msg.style.color = "var(--rb-danger)"; }
    } });
    const copyB = btn("복사", { size: "sm", onClick: async () => { try { await copyText(el.value); ctx.toast("JSON을 복사했어요"); } catch { ctx.toast("복사하지 못했어요", { error: true }); } } });
    const applyJson = btn("JSON 반영", { size: "sm", kind: "primary", onClick: () => {
      try {
        const j = JSON.parse(el.value);
        if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("최상위는 객체({…})여야 해요");
        for (const k of ["lorebook", "regex", "trigger"]) if (j[k] !== void 0 && !Array.isArray(j[k])) throw new Error(`${k}는 배열이어야 해요`);
        draft = { ...j, [cfg.idKey]: original[cfg.idKey] };
        for (const k of ["lorebook", "regex", "trigger"]) if (!Array.isArray(draft[k])) draft[k] = [];
        msg.textContent = '반영했어요. "적용"을 눌러야 저장돼요.';
        msg.style.color = "var(--rb-teal)";
        changed();
      } catch (e) {
        msg.textContent = `JSON 오류: ${e.message}`;
        msg.style.color = "var(--rb-danger)";
      }
    } });
    check2();
    replace(body, h("div", { class: "pane" }, h("div", { class: "rb-side-tools rb-bar", style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, msg, h("div", { class: "rb-spacer", style: "flex:1" }), stat, copyB, fmtB, applyJson), el));
  }
  // 항목을 바꾸거나 다시 그려도 목록 스크롤·항목별 스크롤·마지막 커서 위치를 지킨다
  function saveView() {
    const v = es.shown;
    es.shown = null;
    if (!v || !v.items.isConnected) return;
    es.listScroll[v.kind] = v.items.scrollTop;
    if (!v.item) return;
    const all = [...v.pane.querySelectorAll("*")];
    const scrolls = [];
    all.forEach((el, n) => {
      if (el.scrollTop || el.scrollLeft) scrolls.push([n, el.scrollTop, el.scrollLeft]);
    });
    const f = es.lastField && v.pane.contains(es.lastField) ? es.lastField : null;
    es.itemView.set(v.item, { top: v.pane.scrollTop, scrolls, field: f ? all.indexOf(f) : -1, ss: f?.selectionStart ?? 0, se: f?.selectionEnd ?? 0, focused: !!f && f === f.ownerDocument.activeElement });
  }
  function restoreView(kind, items, pane, item) {
    items.scrollTop = es.listScroll[kind] ?? 0;
    const sv = item && es.itemView.get(item);
    const apply2 = () => {
      if (!pane.isConnected) return;
      items.scrollTop = es.listScroll[kind] ?? 0;
      // 고른 항목(새로 추가·이동한 것 포함)이 목록 밖이면 그만큼만 스크롤
      const row = items.querySelector('[aria-selected="true"]');
      if (row) {
        const r = row.getBoundingClientRect(), b = items.getBoundingClientRect();
        if (r.top < b.top) items.scrollTop -= b.top - r.top + 4;
        else if (r.bottom > b.bottom) items.scrollTop += r.bottom - b.bottom + 4;
      }
      if (!sv) return;
      const all = [...pane.querySelectorAll("*")];
      for (const [n, t, l] of sv.scrolls) {
        if (all[n]) {
          all[n].scrollTop = t;
          all[n].scrollLeft = l;
        }
      }
      const f = all[sv.field];
      if (f && "selectionStart" in f && typeof f.setSelectionRange === "function") {
        try {
          f.setSelectionRange(sv.ss, sv.se);
        } catch {
        }
        es.lastField = f;
        // 모바일에서 키보드가 튀어나오지 않게, 데스크톱에서 그 칸을 보고 있었을 때만 포커스
        if (sv.focused && f.ownerDocument.defaultView?.matchMedia?.("(pointer:fine)").matches) f.focus({ preventScroll: true });
      }
      pane.scrollTop = sv.top;
    };
    apply2();
    // 코드 편집기는 다음 프레임에 높이가 잡히므로 한 번 더
    requestAnimationFrame(apply2);
  }
  // 트리거 탭 위쪽 전환: 트리거 목록 ↔ 초기 변수 (봇만)
  const trigSeg = () => {
    const sg = segmented([["list", "트리거"], ["vars", "초기 변수"]], es.trigView ?? "list", (v) => { es.trigView = v; render(); }, "트리거 보기");
    return sg;
  };
  function renderVars() {
    es.shown = null;
    replace(body, h("div", { class: "side" }, h("div", { style: "padding:8px" }, trigSeg())), varsPane());
  }
  function render() {
    saveView();
    paintTabs();
    paintHead();
    if (es.tab === "info" || es.tab === "json" || es.tab === "ai") body.classList.remove("m-item", "m-list");
    if (es.tab === "trigger" && hasAi && es.trigView === "vars") {
      body.classList.remove("m-item", "m-list");
      return renderVars();
    }
    if (es.tab === "info") renderInfo();
    else if (es.tab === "ai") renderAi();
    else if (es.tab === "json") renderJson();
    else renderList(es.tab);
  }
  function showIssues() {
    const iss = cfg.validate(draft);
    const back = h(
      "div",
      { class: "rb-modal", onMousedown: (ev) => {
        if (ev.target === back) back.remove();
      } },
      h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-label": "검증 결과" },
        h("h3", { class: "rb-h3" }, iss.length ? `검증 결과 (${iss.length})` : "문제 없어요"),
        h("div", { class: "rb-issues rb-scroll", style: "max-height:50vh" }, iss.map((x) => h("button", { type: "button", class: ["rb-issue", x.level], onClick: () => {
          back.remove();
          es.tab = x.tab;
          if (x.index !== void 0) {
            es.sel[x.tab] = x.index;
            es.q[x.tab] = "";
          }
          render();
        } }, icon("alert", 14), h("span", null, x.msg)))),
        h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
      )
    );
    ctx.win.appendChild(back);
  }
  function cbsPanel() {
    const target = es.lastField;
    const back = h("div", { class: "rb-modal", onMousedown: (ev) => {
      if (ev.target === back) back.remove();
    } });
    const box = h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "CBS 사전", style: "max-width:560px" },
      h("h3", { class: "rb-h3" }, "CBS 사전"),
      h("p", { class: "rb-muted" }, target ? "누르면 마지막으로 고치던 칸의 커서 자리에 넣어요." : "누르면 복사해요."),
      h("div", { class: "rb-cbs" }, CBS.map(([group, items]) => [h("span", { class: "rb-label", style: "margin-top:8px" }, group), items.map(([code, desc]) => h("button", { type: "button", onClick: () => {
        if (target && target.isConnected) {
          target.focus();
          target.setRangeText(code, target.selectionStart ?? target.value.length, target.selectionEnd ?? target.value.length, "end");
          target.dispatchEvent(new Event("input"));
        } else navigator.clipboard?.writeText(code).catch(() => {
        });
        back.remove();
      } }, h("code", null, code), h("span", null, desc)))])),
      h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }))
    );
    back.appendChild(box);
    ctx.win.appendChild(back);
  }
  const FR_FIELDS = { lorebook: ["comment", "key", "secondkey", "content"], regex: ["comment", "in", "out"], trigger: ["comment"] };
  function openSmall(title, nodes, label) {
    const back = h("div", { class: "rb-modal", onMousedown: (ev) => {
      if (ev.target === back) back.remove();
    } });
    back.appendChild(h("div", { class: "rb-dialog", role: "dialog", "aria-label": label ?? title, style: "max-width:520px" }, h("h3", { class: "rb-h3" }, title), ...nodes));
    back.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        back.remove();
      }
    });
    ctx.win.appendChild(back);
    return back;
  }
  // Ctrl+P: 이름·키로 항목 빠르게 찾아가기
  function quickJump() {
    const kind = es.tab, list = draft[kind];
    const inp = h("input", { class: "rb-input", placeholder: "항목 이름·키 (↑↓ 이동, Enter 열기)", "aria-label": "항목 빠른 이동", style: "width:100%" });
    const box = h("div", { class: "rb-scroll", style: "max-height:46vh;display:flex;flex-direction:column;gap:2px;margin-top:8px" });
    let hits = [], cur = 0;
    const go = (x) => {
      es.sel[kind] = list.indexOf(x);
      es.q[kind] = "";
      es.mItem = true;
      for (const f of ancestorsOf(x, folderMap(list))) es.loreCollapsed?.delete(folderIdOf(f));
      back.remove();
      render();
    };
    const paint = () => {
      const q = inp.value.trim().toLowerCase();
      hits = list.filter((x) => !q || [x.comment, x.key, x.in].some((v) => String(v ?? "").toLowerCase().includes(q))).slice(0, 40);
      cur = Math.min(cur, Math.max(0, hits.length - 1));
      replace(box, hits.length ? hits.map((x, i) => h("button", { type: "button", class: "rb-item", "aria-selected": i === cur ? "true" : "false", style: i === cur ? "outline:1px solid var(--rb-acc-text)" : "", onClick: () => go(x) }, h("span", { class: "t" }, x.comment || x.key || x.in || "(이름 없음)"))) : h("div", { class: "rb-empty" }, "찾는 항목이 없어요"));
    };
    inp.addEventListener("input", () => {
      cur = 0;
      paint();
    });
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        cur = Math.max(0, Math.min(hits.length - 1, cur + (ev.key === "ArrowDown" ? 1 : -1)));
        paint();
      } else if (ev.key === "Enter" && hits[cur]) {
        ev.preventDefault();
        go(hits[cur]);
      }
    });
    const back = openSmall("항목 빠른 이동", [inp, box]);
    paint();
    inp.focus();
  }
  // Ctrl+H: 지금 탭 전체에서 찾아 바꾸기
  function findReplace() {
    const kind = es.tab, list = draft[kind], fields = FR_FIELDS[kind];
    const fIn = h("input", { class: "rb-input", placeholder: "찾을 글", "aria-label": "찾을 글", style: "width:100%" });
    const rIn = h("input", { class: "rb-input", placeholder: "바꿀 글", "aria-label": "바꿀 글", style: "width:100%;margin-top:6px" });
    const rx = h("input", { type: "checkbox" }), cs = h("input", { type: "checkbox" });
    const info = h("div", { class: "rb-muted", style: "margin-top:8px;min-height:20px" });
    const build = () => {
      if (!fIn.value) return null;
      try {
        return new RegExp(rx.checked ? fIn.value : fIn.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), cs.checked ? "g" : "gi");
      } catch (e) {
        info.textContent = `패턴 오류: ${e.message}`;
        return null;
      }
    };
    const count = () => {
      const re = build();
      if (!re) return void (fIn.value || (info.textContent = ""));
      let n = 0, it = 0;
      for (const x of list) {
        let hit = 0;
        for (const f of fields) if (typeof x[f] === "string") hit += (x[f].match(re) ?? []).length;
        if (hit) it++;
        n += hit;
      }
      info.textContent = n ? `${it}개 항목에서 ${n}곳` : "일치하는 곳이 없어요";
    };
    for (const e of [fIn, rx, cs]) e.addEventListener(e === fIn ? "input" : "change", count);
    const back = openSmall("찾아 바꾸기 (지금 탭 전체)", [
      fIn,
      rIn,
      h("div", { style: "display:flex;gap:14px;margin-top:8px;font-size:13px" }, h("label", null, rx, " 정규식"), h("label", null, cs, " 대소문자 구분")),
      info,
      h("div", { class: "btns" }, btn("닫기", { onClick: () => back.remove() }), btn("모두 바꾸기", { kind: "primary", onClick: () => {
        const re = build();
        if (!re) return;
        let n = 0;
        for (const x of list) for (const f of fields) {
          if (typeof x[f] !== "string") continue;
          const c = (x[f].match(re) ?? []).length;
          if (!c) continue;
          n += c;
          x[f] = rx.checked ? x[f].replace(re, rIn.value) : x[f].replace(re, () => rIn.value);
        }
        back.remove();
        if (n) {
          syncRuleContent(draft.lorebook);
          changed();
          render();
        }
        ctx.toast(n ? `${n}곳을 바꿨어요 (저장 전이라 되돌릴 수 있어요)` : "바꿀 곳이 없어요");
      } }))
    ]);
    fIn.focus();
  }
  async function commit() {
    await cfg.save(draft, original);
    Object.assign(original, structuredClone(draft));
    for (const k of Object.keys(original)) if (!(k in draft)) delete original[k];
    es.savedAt = Date.now();
    paintHead();
    paintSaveState();
  }
  async function apply() {
    syncRuleContent(draft.lorebook);
    if (!dirty()) return;
    const iss = cfg.validate(draft);
    const errs = iss.filter((x) => x.level === "err");
    const lines = diffSummary(original, draft, { infoLabels: cfg.infoLabels, infoTitle: cfg.infoTitle });
    const ok = await confirmDialog(ctx.win, { title: "바뀐 내용을 저장할까요?", body: [...lines, "", errs.length ? `⚠ 오류 ${errs.length}개가 있어요. 그대로 저장할 수도 있어요.` : "", '저장하기 전 상태는 백업해서 도구 → 기록에서 되돌릴 수 있어요.'].filter((x, i, a) => x || i && a[i - 1]).join("\n"), ok: "저장" });
    if (!ok) return;
    applyBtn.disabled = true;
    try {
      await commit();
      ctx.toast("저장했어요");
    } catch (err) {
      ctx.toast(`저장하지 못했어요: ${err?.message ?? err}`, { error: true });
      applyBtn.disabled = false;
    }
  }
  // 자동 저장: 2분마다, 바뀐 게 있을 때만. 입력 중이면 잠깐 미룬다. 확인 창 없이 저장하고 백업은 cfg.save가 남긴다.
  // AI 수정안 적용(v1.6.7 2단계): 작업본을 통째로 바꾸고 모든 탭을 다시 그린다. 적용 1회 = 되돌리기 1단계.
  const aiHist = [];
  const afterReplace = () => {
    for (const k of ["lorebook", "regex", "trigger"]) {
      if (!Array.isArray(draft[k])) draft[k] = [];
      es.sel[k] = Math.min(es.sel[k] ?? 0, Math.max(draft[k].length - 1, 0));
    }
    es.dirtyAt ??= Date.now();
    es.mItem = false;
    render();
  };
  function replaceDraft(next, label) {
    aiHist.push({ draft: structuredClone(draft), label });
    if (aiHist.length > 30) aiHist.shift();
    draft = structuredClone(next);
    afterReplace();
  }
  function undoAi() {
    const last = aiHist.pop();
    if (!last) return false;
    draft = last.draft;
    afterReplace();
    ctx.toast(`되돌렸어요 · ${last.label ?? "AI 수정안"}`);
    return true;
  }
  // AI 엔진(요청 조립·프리셋·암호/압축 라이브러리)은 AI를 처음 쓸 때만 불러온다 → 편집기를 여는 속도는 그대로
  let build = null, buildInit = null, buildP = null, bbPresent = false;
  function ensureBuild() {
    buildP ??= Promise.all([import('../../dev/aibuild/controller.js'), import('../../dev/aibuild/bridge.js')]).then(([c, br]) => {
      build = c.createAiBuild({ api: ctx.api, host: br.hostFromEditor(handle, { targetId: () => draft[cfg.idKey] }) });
      buildInit = build.init().catch((err) => ctx.toast(`AI 설정을 불러오지 못했어요: ${err?.message ?? err}`, { error: true }));
      let lastPending = 0;
      build.subscribe(() => {
        if (!panel.isConnected) return;
        paintTabs();
        paintFab();
        const n = build.pendingCount();
        if (n > lastPending && !panel.querySelector("#rb-ai-popup")) ctx.toast("AI 수정안이 도착했어요 — 우측 하단 버튼에서 확인하세요");
        lastPending = n;
      });
      return build;
    }, (err) => { buildP = null; throw err; });
    return buildP;
  }
  async function aiWindow() {
    let b;
    try { b = await ensureBuild(); } catch (e) { return ctx.toast(`AI 도구를 불러오지 못했어요: ${e?.message ?? e}`, { error: true }); }
    try { bbPresent = bbInstalled((await ctx.api.getDatabase(["plugins"]))?.plugins); } catch { /* 감지 실패는 무시 */ }
    await loadPopupGeom(ctx);
    testFab.style.visibility = "hidden";
    openAiPopup(ctx, { panel, build: b, selection: () => es.sel, bbPresent, tab: es.tab, onClose: () => { testFab.style.visibility = ""; paintFab(); },
      // 수정안을 적용하기 전에 그 상태 그대로 규칙 시험 (시험 창에서 [수정안으로 돌아가기]로 AI 창에 되돌아와요)
      onRuleTest: (lorebook) => { panel.querySelector("#rb-ai-popup")?.closePopup?.(); ruleTester({ lorebook, onBack: () => aiWindow() }); } });
  }
  async function renderAi() {
    es.aiRoot?.__dispose?.();
    const mine = es.aiRoot = h("div", { class: "pane" }, loading("AI 도구를 불러오는 중"));
    replace(body, mine);
    let b, tabMod;
    try { [b, tabMod] = await Promise.all([ensureBuild(), import("./aitab.js")]); await buildInit; } catch (e) {
      if (es.aiRoot === mine) replace(mine, note("err", `AI 도구를 불러오지 못했어요: ${e?.message ?? e}`));
      return;
    }
    if (es.tab !== "ai" || es.aiRoot !== mine || !panel.isConnected) return;
    const root = tabMod.renderAiTab(ctx, { build: b, openPopup: () => aiWindow(), state: es.ai ??= {} });
    es.aiRoot = root;
    replace(body, root);
  }
  const AUTO_MS = 12e4;
  let autoBusy = false, lastInput = 0;
  panel.addEventListener("input", () => {
    lastInput = Date.now();
    es.dirtyAt ??= Date.now();
  });
  function paintSaveState() {
    if (!panel.isConnected) return;
    const d = dirty();
    const ago = es.savedAt ? Math.max(0, Math.round((Date.now() - es.savedAt) / 1e3)) : null;
    saveState.textContent = d ? es.autoFail ? "자동 저장 실패 · 다시 시도해요" : "저장 안 된 변경" : ago === null ? "" : ago < 60 ? `저장됨 · ${ago}초 전` : `저장됨 · ${Math.round(ago / 60)}분 전`;
    saveState.style.color = d ? "var(--rb-warn)" : "";
  }
  async function autoSave() {
    if (autoBusy || !panel.isConnected || !dirty()) return;
    if (Date.now() - lastInput < 4e3) return;
    autoBusy = true;
    try {
      syncRuleContent(draft.lorebook);
      await commit();
      es.autoFail = false;
    } catch (err) {
      if (!es.autoFail) ctx.toast(`자동 저장하지 못했어요: ${err?.message ?? err}`, { error: true });
      es.autoFail = true;
    } finally {
      autoBusy = false;
      paintSaveState();
    }
  }
  const autoTimer = setInterval(() => {
    if (!panel.isConnected) return clearInterval(autoTimer);
    autoSave();
  }, AUTO_MS);
  const stateTimer = setInterval(() => {
    if (!panel.isConnected) return clearInterval(stateTimer);
    paintSaveState();
  }, 1e4);
  async function close() {
    if (dirty() && !await confirmDialog(ctx.win, { title: "저장하지 않은 변경이 있어요", body: "닫으면 바뀐 내용이 사라져요.", ok: "버리고 닫기", danger: true })) return;
    clearInterval(autoTimer);
    clearInterval(stateTimer);
    build?.destroy();
    panel.remove();
  }
  render();
  panel.querySelector(".rb-tabs button[aria-selected=true]")?.focus();
  const handle = { panel, close, get draft() {
    return draft;
  }, apply, replaceDraft, undoAi, canUndoAi: () => aiHist.length > 0 };
  return handle;
}
