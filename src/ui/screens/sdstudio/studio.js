// 에셋 제작 화면(애드온 sdstudio 전용): 봇·모듈 편집의 '적용' 아래 '에셋 제작' → 플러그인 창을 화면 가득 채우고 SDStudio 씬 갤러리 모양으로 연다.
// 단계: 캐릭터 갤러리(폴더 줄 + 캐릭터 카드) → 캐릭터를 열면 씬 갤러리(사진의 카드 = 씬) → 씬을 열면 씬 조합 편집 + 그림.
// 모드: 씬 모드 · 갤러리 모드 · 검색 모드 · 비교 모드 · 동시편집. 예약 → '생성'으로 차례로 그리고, 그림은 바로 saveAsset(경로만 기록).
// 화면 상태 ctx.state.sdstudio["kind:id"], 작업 묶음 pluginStorage(data/sdstudio.js projectKey).
import { h, replace, download, pickFiles } from "../../dom.js";
import { btn, openMenu, promptDialog, confirmDialog } from "../../kit.js";
import { zipSync, strToU8, strFromU8, gzipSync } from "../../../vendor/fflate.js";
import * as BD from "../../../engine/sdstudio/botdata.js";
import { syncLore, pullLore } from "../../../engine/sdstudio/loresync.js";
import { newFolderEntry } from "../editor.js";
import * as FB from "../../../engine/sdstudio/fullbackup.js";
import { isStopError } from "../../../engine/aistop.js";
import { isGenerating } from "../../../engine/safety.js";
import { buildGenerateBody, buildAugmentBody, buildUpscaleBody, buildEncodeVibeBody, modelOf, pngSize, withAsset, uniqueAssetName, RESOLUTIONS } from "../../../engine/sdstudio/nai.js";
import { buildPrompt, buildNegative, combinationCount, toPARR } from "../../../engine/sdstudio/prompt.js";
import * as P from "../../../engine/sdstudio/project.js";
import { toB64, fromB64, convertImage } from "../../../data/sdstudio.js";
import * as T from "../../../engine/sdstudio/template.js";
import { createHistory } from "../../../engine/sdstudio/history.js";
import { normalizeKeys, comboOf, actionOf, typingSafe, keyLabel } from "../../../engine/sdstudio/keys.js";
import { ensureStyle, ico } from "./look.js";
import { renderLeft, leftHead, promptArea, ib, setTagSource } from "./left.js";
import { createDialogs } from "./dialogs.js";
import { openLightbox, openCup } from "./viewer.js";
import { openChooser } from "./chooser.js";
import * as BK from "../../../engine/sdstudio/backup.js";
import { unzipSync } from "../../../vendor/fflate-full.js";
import { gunzipSync } from "../../../vendor/fflate.js";

var MODES = [["scene", "씬 모드"], ["gallery", "갤러리 모드"], ["search", "검색 모드"], ["compare", "비교 모드"], ["bulk", "동시편집"]];
var KIND_KO = { outfit: "캐릭터", group: "소속" };
// '감정 세트' — 봇 감정 이미지로 자주 쓰는 씬(이름 = 감정 이미지 이름)
var EMOTION_SET = [["default", ""], ["smile", "smile"], ["happy", "happy, smile, open mouth"], ["laughing", "laughing, closed eyes"], ["angry", "angry, v-shaped eyebrows"], ["sad", "sad, frown"], ["crying", "crying, tears"], ["surprised", "surprised, open mouth, wide-eyed"], ["shy", "shy, blush, looking away"], ["embarrassed", "embarrassed, blush, sweat"], ["confused", "confused, head tilt"], ["thinking", "thinking, hand on own chin"], ["sleepy", "sleepy, half-closed eyes"], ["smug", "smug, smirk"], ["scared", "scared, trembling"], ["disgusted", "disgusted"], ["determined", "determined, clenched hand"], ["bored", "bored, half-closed eyes"], ["excited", "excited, sparkle"], ["love", "heart-shaped pupils, blush"]];

// 닫아도 그리는 중이면 살려 둔 화면(대상별). 다시 열면 그대로 붙인다.
var LIVE = new Map();
export async function openAssetStudio(ctx, target, sd) {
  if (!target?.id || (target.kind !== "module" && target.kind !== "character")) return;
  ensureStyle();
  const liveKey = `${target.kind}:${target.id}`;
  if (LIVE.has(liveKey)) { const L = LIVE.get(liveKey); L.reopen(); return L; }
  let title = "";
  if (target.kind === "module") title = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === target.id)?.module?.name ?? "";
  else { const c = await ctx.api.getCharacterFromIndex(target.index); if (!c || c.chaId !== target.id) throw new Error("봇을 찾지 못했어요. 목록을 새로 고친 뒤 다시 해 주세요"); title = c.name; }
  let proj = await sd.loadProject(target);
  // 봇(모듈) 안 사본이 더 최근이면 그걸로(다른 기기에서 고쳤거나 플러그인 저장소가 비었을 때)
  const botKey = `dusk.sdstudio.nobot.${target.kind}:${target.id}`;
  let botOn = !(await sd.getLocal(botKey, false)), botT = 0, botDirty = false;
  const u8b64 = (u) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  const readBot = async () => (target.kind === "module" ? (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === target.id)?.module : await ctx.api.getCharacterFromIndex(target.index).then((c) => (c?.chaId === target.id ? c : null)));
  try {
    const snap = BD.readSnap(await readBot(), target.kind);
    if (snap) { botT = snap.t; if (snap.t > await sd.savedAt(target)) { proj = P.normalizeProject(JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(snap.z), (c) => c.charCodeAt(0)))))); ctx.toast("봇에 저장된 더 최근 설정으로 열었어요", { seconds: 5 }); } }
  } catch { /* 봇 사본이 없거나 깨짐 — 플러그인 저장소 것 사용 */ }
  const st = ((ctx.state.sdstudio ??= {})[`${target.kind}:${target.id}`] ??= { folder: null, charId: null, sceneId: null, mode: "scene", zoom: 41, names: true, left: (ctx.win.clientWidth || innerWidth) > 760, q: "", compare: [], slotsOpen: true });   // 좁은 화면은 프롬프트 에디터를 접고 시작
  if (st.folder && !proj.folders.some((f) => f.id === st.folder)) st.folder = null;
  if (st.charId && !P.charOf(proj, st.charId)) { st.charId = null; st.sceneId = null; }
  if (st.sceneId && !P.sceneOf(proj, st.charId, st.sceneId)) st.sceneId = null;
  const sel = new Set();
  const bytesCache = new Map(), thumbUrls = new Map();
  let saveT = null, lazy = null, loreT = null;
  const q = { running: false, done: 0, total: 0, ctl: null, workers: 1 };
  const hist = createHistory();
  const prefs = await sd.getPrefs();
  let tagOffered = false;
  setTagSource({ get: () => sd.tags(), enabled: () => prefs.tags !== false, offered: () => tagOffered,
    load: async () => { tagOffered = true; const t = ctx.toast("태그 사전 받는 중…", { seconds: 120 }); try { const db = await sd.loadTags(); ctx.toast(`태그 ${db.size.toLocaleString()}개를 받았어요`); return db; } finally { t?.close?.(); } } });
  sd.loadTags({ download: false }).catch(() => {});   // 이 기기에 받아 둔 사전이 있으면 조용히 불러옴

  // ── 플러그인 창을 화면 가득(닫으면 되돌림) ──
  const prev = { root: ctx.root?.getAttribute("style") ?? null, win: ctx.win.getAttribute("style") ?? null };
  if (ctx.root) ctx.root.style.padding = "0";
  Object.assign(ctx.win.style, { maxWidth: "none", maxHeight: "none", width: "100%", height: "100%", borderRadius: "0", border: "0" });
  ctx.api.showContainer?.("fullscreen")?.catch?.(() => {});

  const S = {
    ctx, target, sd, st, sel, title,
    P, prefs, keys: prefs.keys2 ? normalizeKeys(prefs.keys2) : normalizeKeys(prefs.keys, { v: 1 }),
    keyLabel: (a) => keyLabel(S.keys[a]) || "단축키 없음",
    get proj() { return proj; },
    // undo: false = 되돌리기 기록에 안 남김(그리기 결과·예약 줄이기·바이브 캐시)
    // 글자 입력(input 이벤트) 중에 잇단 바꿈만 하나로 묶고, 버튼 동작은 하나씩
    set(next, { undo = true } = {}) { if (next?.folders !== proj?.folders && S.prefs?.loreSync) { clearTimeout(loreT); loreT = setTimeout(() => syncLoreNow(), 1200); } if (undo && next !== proj) { hist.push(proj, { typing: globalThis.event?.type === "input" }); } proj = next; clearTimeout(saveT); saveT = setTimeout(() => S.persist(), 500); },
    undo() { const prev = hist.undo(proj); if (!prev) { S.toast("되돌릴 것이 없어요"); return; } proj = prev; afterJump(); },
    redo() { const nx = hist.redo(proj); if (!nx) { S.toast("다시 할 것이 없어요"); return; } proj = nx; afterJump(); },
    persist() { clearTimeout(saveT); botDirty = true; return sd.saveProject(target, proj).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true })); },
    toast: (t, o) => ctx.toast(t, o),
    curChar: () => (st.charId ? P.charOf(proj, st.charId) : null),
    curScene: () => (st.charId && st.sceneId ? P.sceneOf(proj, st.charId, st.sceneId) : null),
    remember(path, data) { bytesCache.set(path, data); if (!thumbUrls.has(path)) thumbUrls.set(path, URL.createObjectURL(new Blob([data], { type: "image/png" }))); },
    async bytes(path) {
      if (bytesCache.has(path)) return bytesCache.get(path);
      const d = await ctx.assets.read(path, { prio: 100 });
      if (!d) throw new Error("그림을 읽지 못했어요");
      if (bytesCache.size > 24) bytesCache.delete(bytesCache.keys().next().value);
      bytesCache.set(path, d);
      return d;
    },
    async url(path) { return URL.createObjectURL(new Blob([await S.bytes(path)], { type: "image/png" })); },
    thumb(path, { now = false } = {}) {
      const img = h("img", { alt: "", loading: "lazy", dataset: { path, ext: "png" } });
      if (thumbUrls.has(path)) img.src = thumbUrls.get(path);
      else if (now) ctx.assets.thumb?.(path, "png").then((u) => { if (u) img.src = u; }).catch(() => {});
      else lazy?.observe(img);
      return img;
    },
    addCompare(it) { st.compare = [...st.compare.filter((x) => x.path !== it.path), it].slice(-4); },
    toggleLeft(on = !st.left) { st.left = on; leftEl.hidden = !on; railTab.setAttribute("aria-pressed", String(on)); },
    paint() { S.paintLeft(); S.paintTop(); S.paintTools(); S.paintBody(); },
    paintLeft() { renderLeft(S, leftBody); },
    paintTop, paintTools, paintBody, putPaths, derive, quickPut
  };
  function afterJump() {
    if (st.charId && !P.charOf(proj, st.charId)) { st.charId = null; st.sceneId = null; }
    if (st.sceneId && !P.sceneOf(proj, st.charId, st.sceneId)) st.sceneId = null;
    if (st.folder && !proj.folders.some((f) => f.id === st.folder)) st.folder = null;
    sel.clear(); clearTimeout(saveT); saveT = setTimeout(() => S.persist(), 300); S.paint();
  }
  S.dlg = createDialogs(S);

  // ── 틀 ──
  const el = h("div", { class: "rb-full sds", role: "dialog", "aria-label": "에셋 제작", id: "rb-sd-studio", tabIndex: -1 });
  S.el = el;
  el.__sds = S;   // 시험·디버그용(화면 노드에만)
  const railTab = h("button", { type: "button", class: "tab", "aria-pressed": String(st.left), title: "프롬프트 에디터 열고 닫기 (F1)", onClick: () => S.toggleLeft() }, "프롬프트");
  const rail = h("nav", { class: "sds-rail", "aria-label": "옆 칸" }, h("span", { class: "key" }, "F1"), railTab);
  const leftBody = h("div", { class: "sds-left-body rb-scroll", id: "sds-left" });
  const leftEl = h("aside", { class: "sds-left", hidden: !st.left, "aria-label": "프롬프트 에디터" }, ...leftHead(S), leftBody);
  const topEl = h("div", { class: "sds-top", id: "sds-topbar" });
  const toolsEl = h("div", { class: "sds-tools", id: "sds-tools", role: "toolbar", "aria-label": "도구" });
  const bodyEl = h("div", { class: "sds-body rb-scroll", id: "sds-body" });
  bodyEl.addEventListener("contextmenu", (e) => { if (e.target.closest(".sds-card,.sds-frow,input,textarea,select,button")) return; e.preventDefault(); bodyMenu(e.target.closest("div") ?? bodyEl); });
  bodyEl.addEventListener("click", (e) => { if (st.focus && !e.target.closest(".sds-card,.sds-frow,.rb-chip,button,input,select,textarea,label")) setFocus(null); });
  const setsEl = h("div", { class: "sds-setbar" });
  const mainEl = h("div", { class: "sds-main" }, topEl, toolsEl, setsEl, bodyEl);
  el.append(rail, leftEl, mainEl);
  ctx.win.appendChild(el);

  // ── 위 줄: 제목·알약·모드·생성·도움말 ──
  function paintTop() {
    const c = S.curChar();
    const sum = P.reserveSummary(proj, c?.id ?? null);
    const runBtn = q.running
      ? h("button", { type: "button", class: "sds-queue stop", id: "sds-run", onClick: () => stopQueue() }, ico("stop", 14), `멈추기 ${q.done}/${q.total}`)
      : h("button", { type: "button", class: "sds-queue", id: "sds-run", disabled: !P.planJobs(proj).length, title: S.prefs.boost ? "부스트 모드: 토큰 여러 개로 동시에 그려요" : "예약된 씬을 차례로 그려요", onClick: () => runQueue() }, ico(S.prefs.boost ? "bolt" : "play", 14), `${S.prefs.boost ? "부스트 " : ""}생성${P.planJobs(proj).length ? ` ${P.planJobs(proj).length}장` : ""}`);
    replace(topEl,
      h("button", { type: "button", class: "sds-ib", style: "border:0;background:none", "aria-label": st.sceneId || st.charId || st.folder || st.mode !== "scene" ? "위로" : "에셋 제작 닫기", title: st.sceneId || st.charId || st.folder ? "한 단계 위로" : "닫기", id: "sds-close", onClick: () => goUp() }, ico("back", 20)),
      h("div", { class: "ttl" }, h("b", null, c ? "씬 갤러리" : "캐릭터 갤러리"),
        c ? h("span", { class: "sds-pill", id: "sds-combos" }, `조합 ${sum.combos}개`) : h("span", { class: "sds-pill" }, `캐릭터 ${proj.chars.length}명`),
        h("span", { class: "sds-pill", id: "sds-reserved" }, `예약된 씬 ${sum.reserved}/${sum.scenes}`)),
      h("div", { class: "sds-modes", role: "tablist", "aria-label": "모드" }, ...MODES.map(([k, t]) => h("button", { type: "button", role: "tab", "aria-selected": String(st.mode === k), disabled: k === "bulk" && !c, dataset: { mode: k }, onClick: () => setMode(k) }, k === "scene" && !c ? "캐릭터 모드" : t))),
      q.running ? progressEl() : null,
      h("div", { class: "sds-run" }, runBtn, btn("도움말", { size: "sm", icon: "help", onClick: () => S.dlg.help() })));
  }
  // 생성 진행: %·남은 장수·예상 시간(최근 평균)
  const fmtDur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60; return hh ? `${hh}시간 ${mm}분` : mm ? `${mm}분 ${ss}초` : `${ss}초`; };
  function progressText() {
    const pct = q.total ? Math.floor((q.done / q.total) * 100) : 0, left = q.total - q.done;
    const el2 = Date.now() - q.t0, eta = q.done ? (el2 / q.done) * left : null;
    return `${pct}% · ${q.done}/${q.total}장 · 남은 ${left}장 · ${eta == null ? "예상 시간 재는 중" : `약 ${fmtDur(eta)} 남음`}${q.retry ? ` · 다시 시도 ${q.retry}번째${q.lastErr ? ` (${q.lastErr})` : ""}` : ""}`;
  }
  function progressEl() {
    const pct = q.total ? (q.done / q.total) * 100 : 0;
    return h("div", { class: "sds-prog", id: "sds-prog", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.floor(pct)) },
      h("div", { class: "bar" }, h("i", { style: `width:${pct.toFixed(1)}%` })), h("span", { class: "t" }, progressText()));
  }
  function goUp() {
    if (st.mode !== "scene" && st.mode !== "bulk") return setMode("scene");
    if (st.sceneId) return openScene(null);
    if (st.charId) return openChar(null);
    if (st.folder) { st.folder = proj.folders.find((f) => f.id === st.folder)?.parent ?? null; st.focus = null; sel.clear(); paintTop(); paintTools(); paintBody(); return; }
    close();
  }
  function setMode(k) {
    st.mode = k; sel.clear();
    if (st.sceneId && k !== "scene") st.sceneId = null;
    paintTop(); paintTools(); paintBody();
  }

  // ── 도구 줄(무리 이름은 작게 위에) ──
  const group = (cap, ...btns) => h("div", { class: "sds-group" }, h("small", null, cap), h("div", null, ...btns.filter(Boolean)));
  function paintTools() {
    const c = S.curChar(), sc = S.curScene(), n = proj.settings.reserveDefault;
    const selN = sel.size;
    const allPicked = pickedInScope(), favN = favsInScope().length;
    const noFavN = scopeChars().reduce((n, x) => n + P.scenesNoFav(x).length, 0);
    const chooseG = group("대표", ib("star", `대표 고르기 — 씬마다 후보를 넘기며 ★ (←/→ · F · Enter)`, () => chooser(), { id: "sds-choose" }),
      ib("bolt", `즐겨찾기 없는 씬만 ${n}장씩 예약 (${noFavN}개)`, () => reserveNoFav(), { id: "sds-rsv-nofav", disabled: !noFavN }));
    const view = [group("검색", ib("search", "검색 모드", () => { setMode("search"); bodyEl.querySelector("#sds-q")?.focus(); }, { on: st.mode === "search" }),
        btn(`봇으로 넣기${allPicked.length ? ` ${allPicked.length}장` : ""}`, { kind: "primary", icon: "upload", id: "sds-put-all", title: `고른 그림 ${allPicked.length}장을 봇에 넣어요 (${S.curChar() ? "이 캐릭터" : st.folder ? "이 폴더" : "전체"}) · ${S.keyLabel("put")}`, disabled: !allPicked.length, onClick: () => quickPut(allPicked) }),
        btn(`즐겨찾기 넣기${favN ? ` ${favN}장` : ""}`, { icon: "sparkle", id: "sds-put-fav", title: "즐겨찾기한 그림을 확인하고 봇에 넣어요(이름·같은 이름·이미 넣은 것 미리 보기)", disabled: !favN, onClick: () => exportFav() })),
      group("보기", ib("eye", st.names ? "이름 숨기기" : "이름 보이기", () => { st.names = !st.names; el.classList.toggle("nonames", !st.names); paintTools(); }, { on: st.names, id: "sds-names" }),
        h("div", { class: "sds-zoom" }, h("input", { type: "range", min: 10, max: 100, value: st.zoom, "aria-label": "카드 크기", id: "sds-zoom", onInput: (e) => { st.zoom = Number(e.target.value); applyZoom(); e.target.nextSibling.textContent = `${st.zoom}%`; } }), h("span", null, `${st.zoom}%`)))];
    // 씬 세트(프리셋) 줄: 즐겨찾기 넣기·보기 아래
    const SS = P.setsOf(proj);
    const setRow = h("div", { class: "sds-sets", id: "sds-sets", role: "group", "aria-label": "씬 세트" },
      ...SS.list.map((t) => { const b = btn(t.name, { size: "sm", kind: t.id === SS.active ? "primary" : "ghost", id: `sds-set-${t.id}`, title: `${t.name} 세트${t.tpl ? ` · 씬 프리셋 ‘${t.tpl}’` : ""} — 우클릭: 이름·프리셋·지우기`, onClick: () => changeSet(t.id) }); b.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); setMenu(b, t.id); }); return b; }),
      btn("", { size: "sm", kind: "ghost", icon: "plus", id: "sds-set-add", title: "새 씬 세트", onClick: () => addSetFlow() }));
    replace(setsEl, setRow);
    const undoG = group("되돌리기", ib("undo", "되돌리기", () => S.undo(), { disabled: !hist.canUndo(), id: "sds-undo" }), ib("redo", "다시하기", () => S.redo(), { disabled: !hist.canRedo(), id: "sds-redo" }));
    const tplG = group("템플릿", ib("template", c ? "템플릿 적용·관리(이 캐릭터)" : st.folder ? "템플릿 적용·관리(이 폴더의 캐릭터 모두)" : "템플릿 적용·관리(모든 캐릭터)", (e) => templateMenu(e.currentTarget), { id: "sds-tpl" }),
      ib("importIn", c ? "SDStudio·Dusk 씬 템플릿 가져와 이 캐릭터에 적용" : st.folder ? "씬 템플릿 가져와 이 폴더의 캐릭터 모두에 적용" : "씬 템플릿 가져와 모든 캐릭터에 적용", () => importTemplate(), { id: "sds-tpl-import" }),
      c ? ib("save", "이 캐릭터의 씬을 템플릿으로 저장", () => saveTemplate(c), { id: "sds-tpl-save" }) : null);
    let groups;
    if (!c) {
      groups = [
        undoG,
        group("예약", ib("calPlus", `모든 캐릭터의 모든 씬 ${n}장씩 예약`, () => { let nx = proj; for (const x of proj.chars) nx = P.reserveAll(nx, x.id, n); S.set(nx); paintTop(); paintBody(); }, { id: "sds-rsv-all" }),
          ib("calX", "예약 모두 비우기", () => { S.set(P.clearReserve(proj, null)); paintTop(); paintBody(); }, { id: "sds-rsv-clear" })),
        group("캐릭터 도구", ib("file", "새 캐릭터", () => addChar(), { id: "sds-addchar" }), ib("copy", "고른 캐릭터 복제", () => { for (const id of sel) S.set(P.duplicateChar(proj, id)); sel.clear(); paintBody(); }, { disabled: !selN }),
          ib("folderPlus", "폴더 만들기", () => addFolder(), { id: "sds-addfolder" }), ib("importIn", "SDStudio 백업 가져오기(.tar·프로젝트 .json)", () => importBackup(), { id: "sds-import-backup" }), ib("swap", "고른 캐릭터를 폴더에 넣기·빼기", (e) => folderPick(e.currentTarget, [...sel]), { disabled: !selN || !proj.folders.length }),
          ib("trash", "고른 캐릭터 지우기", () => removeChars([...sel]), { danger: true, disabled: !selN })),
        tplG, chooseG,
        group("이미지·관리", ib("zip", "이미지만 zip으로 내보내기", (e) => zipMenu(e.currentTarget), { id: "sds-zip" }), ib("download", "프로젝트 전체 백업(zip) — 설정과 그림을 모두 담아요", () => fullBackup(), { id: "sds-fullbackup" }), ib("shield", botOn ? "봇에도 설정 저장 중 — 누르면 끄고 봇에서 지움(카드 배포용)" : "봇에 설정 저장 꺼짐 — 누르면 켬", () => toggleBotSave(), { id: "sds-botsave", on: botOn })),
        group("도움말", ib("help", "도움말", () => S.dlg.help())), group("설정", ib("gear", "설정(넣기 형식·부스트·단축키·토큰)", () => S.dlg.settings(), { id: "sds-settings" })),
        h("span", { class: "sp" }), ...view];
    } else if (!sc) {
      const ids = selN ? [...sel] : null, picked = P.pickedImages(c).map((x) => ({ ...x, cid: c.id }));
      groups = [
        undoG,
        group("예약", ib("calPlus", ids ? `고른 씬 ${n}장씩 예약` : `모든 씬 ${n}장씩 예약`, () => { S.set(P.reserveAll(proj, c.id, n, ids)); paintTop(); paintBody(); }, { id: "sds-rsv-all" }),
          ib("calX", "이 캐릭터 예약 비우기", () => { S.set(P.clearReserve(proj, c.id)); paintTop(); paintBody(); }, { id: "sds-rsv-clear" })),
        group("씬 도구", ib("file", "새 씬", () => addScene(), { id: "sds-addscene" }), ib("copy", "고른 씬 복제", () => { for (const id of sel) S.set(P.duplicateScene(proj, c.id, id)); sel.clear(); paintBody(); }, { disabled: !selN }),
          ib("layers", "감정 세트 더하기(없는 것만)", () => addEmotionSet(), { id: "sds-emoset" }),
          ib("sortAsc", "이름순 ↑", () => { S.set(P.sortScenes(proj, c.id, "asc")); paintBody(); }), ib("sortDesc", "이름순 ↓", () => { S.set(P.sortScenes(proj, c.id, "desc")); paintBody(); }),
          ib("trash", "고른 씬 지우기", () => removeScenes([...sel]), { danger: true, disabled: !selN })),
        tplG, chooseG,
        group("이미지·관리", ib("exportBot", `고른 그림 ${picked.length}장 봇에 바로 넣기(이름 = 씬 이름) (${S.keyLabel("put")})`, () => quickPut(picked), { disabled: !picked.length, id: "sds-put-picked" }),
          ib("sliders", "고른 그림 넣는 방법 고르고 넣기…", () => putPaths(picked), { disabled: !picked.length, id: "sds-put-picked-opt" }),
          ib("x", "이 캐릭터의 그림 고르기 모두 풀기", () => { S.set(P.clearPicks(proj, c.id), { undo: false }); paintTools(); paintBody(); }, { disabled: !picked.length, id: "sds-unpick-all" }),
          ib("trophy", "고른 씬 이미지 월드컵", () => { const id = [...sel][0]; if (id) openCup(S, c.id, id); }, { disabled: selN !== 1 }),
          ib("zip", "이미지만 zip으로 내보내기", (e) => zipMenu(e.currentTarget), { id: "sds-zip" }), ib("clip", "고른 씬 프롬프트 복사", () => copyPrompts(c, ids), { disabled: !selN })),
        group("도움말", ib("help", "도움말", () => S.dlg.help())), group("설정", ib("gear", "설정(넣기 형식·부스트·단축키·토큰)", () => S.dlg.settings(), { id: "sds-settings" })),
        h("span", { class: "sp" }), ...view];
    } else {
      const picked = P.pickedImages(c, sc.id).map((x) => ({ ...x, cid: c.id })), paths = picked.map((x) => x.path);
      groups = [
        undoG,
        group("예약", ib("calPlus", "이 씬 1장 예약", () => { S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); paintTop(); paintBody(); }, { id: "sds-rsv-one" }), ib("calX", "이 씬 예약 비우기", () => { S.set(P.setReserve(proj, c.id, sc.id, 0)); paintTop(); paintBody(); })),
        chooseG,
        group("씬 도구", ib("copy", "씬 복제", () => { S.set(P.duplicateScene(proj, c.id, sc.id)); S.toast("씬을 복제했어요"); }), ib("trash", "이 씬 지우기", () => removeScenes([sc.id]), { danger: true })),
        group("이미지·관리", ib("exportBot", `고른 그림 ${paths.length}장 봇에 바로 넣기 (${S.keyLabel("put")})`, () => quickPut(picked), { disabled: !paths.length, id: "sds-put-sel" }),
          ib("sliders", "넣는 방법 고르고 넣기…", () => putPaths(picked), { disabled: !paths.length, id: "sds-put-sel-opt" }),
          ib("star", "고른 그림 즐겨찾기 켜기·풀기", () => { const on = !paths.every((p) => sc.images.find((i) => i.path === p)?.fav); let nx = proj; for (const p of paths) nx = P.setImage(nx, c.id, sc.id, p, { fav: on }); S.set(nx); paintTools(); paintBody(); }, { disabled: !paths.length, id: "sds-fav" }),
          ib("compare", "고른 그림 비교", () => { for (const p of paths) S.addCompare({ cid: c.id, sid: sc.id, path: p }); setMode("compare"); }, { disabled: paths.length < 2 }),
          ib("trophy", "이미지 월드컵", () => openCup(S, c.id, sc.id), { disabled: sc.images.length < 2, id: "sds-cup-btn" }),
          ib("check", "모두 고르기", () => { S.set(P.setPicks(proj, c.id, sc.id, sc.images.map((i) => i.path), true), { undo: false }); paintTools(); paintBody(); }),
          ib("x", "고르기 풀기", () => { S.set(P.clearPicks(proj, c.id, sc.id), { undo: false }); paintTools(); paintBody(); }, { disabled: !paths.length, id: "sds-unpick" }),
          ib("zip", "이미지만 zip으로 내보내기", (e) => zipMenu(e.currentTarget), { id: "sds-zip" }),
          ib("trash", "고른 그림 목록에서 빼기", () => removePaths(c.id, sc.id, paths), { danger: true, disabled: !paths.length })),
        group("도움말", ib("help", "도움말", () => S.dlg.help())), group("설정", ib("gear", "설정(넣기 형식·부스트·단축키·토큰)", () => S.dlg.settings(), { id: "sds-settings" })),
        h("span", { class: "sp" }), ...view];
    }
    replace(toolsEl, ...groups);
  }
  const applyZoom = () => { el.style.setProperty("--sds-card", `${Math.round(90 + st.zoom * 2.6)}px`); el.style.setProperty("--sds-row", `${Math.round(80 + st.zoom * 1.6)}px`); };

  // ── 카드 ──
  const capOf = (name, count, picks = 0) => h("span", { class: "cap" }, h("span", { class: "n" }, name), picks ? h("span", { class: "pk", title: `봇에 보낼 그림 ${picks}장 고름` }, `✓${picks}`) : null, h("span", { class: "c" }, String(count)));
  const chk = () => h("span", { class: "chk", "aria-hidden": "true" }, ico("check", 14));
  // 한 번 누르면 테두리가 켜지고(고른 상태), 더블클릭하면 열려요. 폴더를 고른 채 '새 캐릭터'를 누르면 그 폴더 안에 만들어져요.
  const isCur = (kind, id) => st.focus?.kind === kind && st.focus.id === id;
  function setFocus(kind, id) {
    st.focus = id ? { kind, id } : null;
    el.querySelectorAll(".sds-card.cur,.sds-frow.cur").forEach((n) => n.classList.remove("cur"));
    if (!id) return;
    const q = kind === "folder" ? ".sds-frow.sds-folder" : `.sds-${kind}`;
    for (const n of bodyEl.querySelectorAll(q)) if (n.dataset.id === id) n.classList.add("cur");
  }
  function selectable(card, key, onOpen, kind) {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".quick")) return;
      if (e.target.closest(".chk") || e.ctrlKey || e.metaKey || e.shiftKey || (sel.size && st.mode !== "scene")) { sel.has(key) ? sel.delete(key) : sel.add(key); card.setAttribute("aria-selected", String(sel.has(key))); paintTools(); return; }
      if (kind === "scene") { sel.has(key) && sel.size === 1 ? sel.clear() : (sel.clear(), sel.add(key)); for (const n of bodyEl.querySelectorAll(".sds-scene")) n.setAttribute("aria-selected", String(sel.has(n.dataset.id))); paintTools(); return; }
      if (kind) { if (!isCur(kind, key)) setFocus(kind, key); return; }   // 카드·폴더는 한 번 누르면 테두리만, 여는 건 더블클릭
      onOpen();
    });
    if (kind) card.addEventListener("dblclick", (e) => { if (!e.target.closest(".quick")) { sel.clear(); onOpen(); } });
    card.setAttribute("aria-selected", String(sel.has(key)));
    if (kind) card.classList.toggle("cur", isCur(kind, key));
    return card;
  }

  // ── 끌어 옮기기(드래그) ──
  // 캐릭터 카드 → 폴더 줄·빵부스러기(경로)·다른 카드 앞뒤 / 폴더 → 다른 폴더 안·앞뒤·경로 / 씬 카드 → 같은 캐릭터 안 순서·아래 줄의 다른 캐릭터.
  // Alt/⌥를 누르고 놓으면 복사(캐릭터는 여러 폴더에 걸칠 수 있고, 씬은 구성만 복사돼요).
  const dnd = { cur: null };
  const MARKS = ["drop-before", "drop-after", "drop-into"];
  const endDrag = () => { dnd.cur = null; for (const n of el.querySelectorAll(".dragging,.drop-before,.drop-after,.drop-into")) { n.classList.remove("dragging", ...MARKS); delete n.dataset.dropHint; } el.classList.remove("sds-dragging", "sds-drag-scene"); };
  function dragSource(node, payload) {
    node.draggable = true;
    node.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      dnd.cur = payload();
      e.dataTransfer.effectAllowed = "copyMove";
      try { e.dataTransfer.setData("text/plain", "sds"); } catch { /* 일부 환경 */ }
      node.classList.add("dragging"); el.classList.add("sds-dragging");
      if (dnd.cur.kind === "scene") el.classList.add("sds-drag-scene");
    });
    node.addEventListener("dragend", endDrag);
  }
  // mode(p): "into"(통째로 안에) | "x"(왼쪽/오른쪽 절반 = 앞/뒤) | "y3"(위 1/4 앞 · 아래 1/4 뒤 · 가운데 안)
  function dropTarget(node, { mode, ok, run, hint }) {
    const zoneOf = (e, p) => {
      const m = mode(p); if (m === "into") return "into";
      const r = node.getBoundingClientRect(), t = m === "x" ? (e.clientX - r.left) / (r.width || 1) : (e.clientY - r.top) / (r.height || 1);
      return m === "y3" ? (t < 0.25 ? "before" : t > 0.75 ? "after" : "into") : (t < 0.5 ? "before" : "after");
    };
    node.addEventListener("dragover", (e) => {
      const p = dnd.cur; if (!p || !ok(p)) return;
      e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
      const z = zoneOf(e, p);
      node.classList.remove(...MARKS); node.classList.add("drop-" + z);
      if (hint) node.dataset.dropHint = hint(p, z, e.altKey); else delete node.dataset.dropHint;
    });
    node.addEventListener("dragleave", (e) => { if (!node.contains(e.relatedTarget)) { node.classList.remove(...MARKS); delete node.dataset.dropHint; } });
    node.addEventListener("drop", (e) => {
      const p = dnd.cur; if (!p || !ok(p)) return;
      e.preventDefault(); e.stopPropagation();
      const z = zoneOf(e, p), copy = e.altKey;
      endDrag(); run(p, z, copy);
    });
  }
  const selIds = (key) => (sel.has(key) && sel.size > 1 ? [...sel] : [key]);
  const nextAfter = (arr, id) => { const i = arr.findIndex((x) => x.id === id); return i < 0 ? null : arr[i + 1]?.id ?? null; };
  // 그 캐릭터가 (container 폴더 아래에서) 실제로 속한 폴더
  const holderOf = (cid, container) => {
    if (!container) return null;
    const q = [container], seen = new Set();
    while (q.length) { const id = q.shift(); if (seen.has(id)) continue; seen.add(id); if (proj.folders.find((x) => x.id === id)?.members.includes(cid)) return id; for (const g of proj.folders) if (g.parent === id) q.push(g.id); }
    return container;
  };
  const afterMove = () => { paintTop(); paintTools(); paintBody(); };
  function dropChars(p, to, before, copy) {
    S.set(P.moveChars(proj, p.ids, { from: p.from, to, before, copy: !!to && copy }));
    sel.clear(); afterMove();
  }
  function dropFolder(id, parent, before) {
    try { S.set(P.placeFolder(proj, id, parent, before)); afterMove(); } catch (e) { S.toast(e?.message ?? String(e), { error: true }); }
  }
  // 경로 칩(전체 › 폴더…)에 놓기: 캐릭터는 그 폴더로(전체면 폴더에서 빼기), 폴더는 그 밑으로
  function crumbDrop(chip, folderId) {
    dropTarget(chip, {
      mode: () => "into",
      ok: (p) => p.kind === "char" || (p.kind === "folder" && p.id !== folderId),
      hint: (p) => folderId ? `‘${proj.folders.find((x) => x.id === folderId)?.name}’(으)로` : p.kind === "char" ? "폴더에서 빼기" : "맨 위로",
      run: (p, _z, copy) => (p.kind === "char" ? dropChars(p, folderId, null, copy) : dropFolder(p.id, folderId, null))
    });
    return chip;
  }
  const charCard = (c, container, list) => {
    const cover = P.charCover(c), rsv = c.scenes.reduce((n, s) => n + s.reserve, 0);
    const card = h("button", { type: "button", class: "sds-card sds-char", dataset: { id: c.id }, title: c.name },
      cover ? S.thumb(cover) : h("span", { class: "ph" }, ico("person", 34)), chk(),
      rsv ? h("span", { class: "rsv" }, `예약 ${rsv}`) : null, capOf(c.name, P.imageCount(c), P.pickedImages(c).length));
    card.addEventListener("contextmenu", (e) => { e.preventDefault(); charMenu(card, c); });
    if (container !== undefined) {
      dragSource(card, () => ({ kind: "char", ids: selIds(c.id), from: holderOf(c.id, container) }));
      dropTarget(card, {
        mode: () => "x",
        ok: (p) => p.kind === "char" && !(p.ids.length === 1 && p.ids[0] === c.id),
        run: (p, z, copy) => dropChars(p, container, z === "before" ? c.id : nextAfter(list, c.id), copy)
      });
    }
    return selectable(card, c.id, () => openChar(c.id, container), "char");
  };
  const sceneCard = (c, sc, list) => {
    const cover = P.coverOf(sc);
    const card = h("button", { type: "button", class: "sds-card sds-scene", dataset: { id: sc.id }, title: sc.name },
      cover ? S.thumb(cover) : h("span", { class: "ph" }, ico("image", 30)), chk(),
      h("span", { class: "rsvbtn" + (sc.reserve ? " on" : ""), role: "button", tabindex: "0", id: `sds-rsv-${sc.id}`, title: sc.reserve ? `예약 ${sc.reserve}장 — 누르면 1장 더` : "1장 예약", onClick: (e) => { e.stopPropagation(); S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); paintTop(); paintBody(); } }, ico("calPlus", 14), sc.reserve ? `+${sc.reserve}` : "예약"),
      sc.images.length && !P.hasFav(sc) ? h("span", { class: "nofav", title: "아직 즐겨찾기가 없어요" }, "★ 없음") : null,
      h("span", { class: "quick" },
        sc.reserve ? h("button", { type: "button", title: "예약 하나 빼기", onClick: (e) => { e.stopPropagation(); S.set(P.setReserve(proj, c.id, sc.id, sc.reserve - 1)); paintTop(); paintBody(); } }, "−1") : null),
      capOf(sc.name, sc.images.length, P.pickCount(sc)));
    card.addEventListener("contextmenu", (e) => { e.preventDefault(); sceneMenu(card, c, sc); });
    if (list) {
      dragSource(card, () => ({ kind: "scene", cid: c.id, ids: selIds(sc.id) }));
      dropTarget(card, {
        mode: () => "x",
        ok: (p) => p.kind === "scene" && p.cid === c.id && !(p.ids.length === 1 && p.ids[0] === sc.id),
        run: (p, z) => { S.set(P.reorderScenes(proj, c.id, p.ids, z === "before" ? sc.id : nextAfter(list, sc.id))); sel.clear(); afterMove(); }
      });
    }
    return selectable(card, sc.id, () => openScene(sc.id), "scene");
  };
  const imageCard = (it, im, list, idx) => {
    const card = h("button", { type: "button", class: "sds-card sds-img", dataset: { path: im.path }, title: im.seed ? `시드 ${im.seed}` : "" },
      S.thumb(im.path), chk(),
      h("span", { class: "badges" }, im.rank ? h("span", { class: "badge" }, `${im.rank}위`) : null, im.fav ? h("span", { class: "badge" }, "★") : null),
      h("span", { class: "quick", style: "bottom:10px" }, h("button", { type: "button", title: "이 그림을 봇에 바로 넣기", class: "sds-qput", onClick: (e) => { e.stopPropagation(); quickPut([{ path: im.path, name: P.sceneOf(proj, it.cid, it.sid)?.name ?? "image", cid: it.cid, sid: it.sid }]); } }, "넣기")));
    card.setAttribute("aria-selected", String(!!im.pick));
    card.addEventListener("click", (e) => {
      if (e.target.closest(".quick")) return;
      togglePick(it);   // 한 번 = 보낼 그림으로 고르기/풀기
    });
    card.addEventListener("dblclick", (e) => { if (!e.target.closest(".quick")) openLightbox(S, list, idx); });
    card.addEventListener("contextmenu", (e) => { e.preventDefault(); imageMenu(card, it, list, idx); });   // 더블클릭 = 크게 보기(두 번의 클릭으로 고르기는 제자리)
    return card;
  };
  function togglePick(it, on) {
    const im = P.sceneOf(proj, it.cid, it.sid)?.images.find((x) => x.path === it.path);
    if (!im) return;
    S.set(P.setPicks(proj, it.cid, it.sid, [it.path], on ?? !im.pick), { undo: false });
    paintTools(); paintBody();
  }
  S.togglePick = togglePick;
  const grid = (...cards) => h("div", { class: "sds-grid" }, ...cards);
  const sec = (title, count, ...right) => h("div", { class: "sds-sec" }, h("b", null, title), count != null ? h("span", { class: "rb-muted" }, String(count)) : null, h("span", { class: "sp" }), ...right);
  const empty = (t, d, ...acts) => h("div", { class: "sds-empty" }, h("b", null, t), h("span", { style: "white-space:normal" }, d), ...acts);

  function crumbs() {
    const c = S.curChar(), sc = S.curScene();
    const chip = (text, on, fn) => h("button", { type: "button", class: "rb-chip", "aria-pressed": String(on), onClick: fn }, text);
    const items = [crumbDrop(chip("전체", !st.folder && !c, () => { st.folder = null; openChar(null); }), null)];
    for (const f of P.pathOf(proj, st.folder)) items.push(h("span", { class: "rb-muted" }, "›"), crumbDrop(chip(f.name, f.id === st.folder && !c, () => { st.folder = f.id; openChar(null); }), f.id));
    if (c) items.push(h("span", { class: "rb-muted" }, "›"), chip(c.name, !sc, () => openScene(null)));
    if (sc) items.push(h("span", { class: "rb-muted" }, "›"), chip(sc.name, true, () => {}));
    if (st.folder && !c) items.push(h("button", { type: "button", class: "rb-icon-btn", "aria-label": "폴더 메뉴", onClick: (e) => folderMenu(e.currentTarget, st.folder) }, ico("more", 18)));
    return h("nav", { class: "sds-crumbs", id: "sds-crumbs", "aria-label": "위치" }, ...items);
  }

  // ── 본문 ──
  function paintBody() {
    const keep = bodyEl.scrollTop;
    lazy?.disconnect(); lazy = ctx.assets.lazy(bodyEl);
    applyZoom(); el.classList.toggle("nonames", !st.names);
    const c = S.curChar(), sc = S.curScene();
    const out = [crumbs()];
    if (st.mode === "compare") out.push(...compareView());
    else if (st.mode === "search") out.push(...searchView(c));
    else if (st.mode === "gallery") out.push(...galleryView(c));
    else if (st.mode === "bulk" && c) out.push(...bulkView(c));
    else if (sc) out.push(...sceneView(c, sc));
    else if (c) out.push(...scenesView(c));
    else out.push(...charsView());
    replace(bodyEl, ...out);
    bodyEl.scrollTop = keep;
    if (ctx.win.scrollLeft || ctx.win.scrollTop) { ctx.win.scrollLeft = 0; ctx.win.scrollTop = 0; }   // 포커스 이동으로 창이 밀리지 않게
  }
  // 폴더 줄 안의 하위 폴더 타일(비어 있어도 보이게). 누르면 테두리, 더블클릭하면 열림, 끌어 옮기기·놓기 가능.
  function subTile(g) {
    const n = P.rowChars(proj, g.id).length, k = proj.folders.filter((x) => x.parent === g.id).length;
    const t = h("button", { type: "button", class: "sds-card sds-subf", dataset: { id: g.id }, title: g.name },
      h("span", { class: "ph", style: "flex-direction:column;gap:6px;color:var(--rb-acc)" }, ico("folder", 34), h("span", { class: "rb-muted", style: "font-size:12px" }, `${n}명${k ? ` · 폴더 ${k}` : ""}`)),
      h("span", { class: "cap" }, h("span", { class: "n" }, g.name)));
    t.classList.toggle("cur", isCur("folder", g.id));
    t.addEventListener("click", () => { if (!isCur("folder", g.id)) { setFocus("folder", g.id); t.classList.add("cur"); } });
    t.addEventListener("dblclick", () => { st.focus = null; st.folder = g.id; sel.clear(); paintTools(); paintBody(); });
    t.addEventListener("contextmenu", (e) => { e.preventDefault(); folderMenu(t, g.id); });
    dragSource(t, () => ({ kind: "folder", id: g.id }));
    dropTarget(t, { mode: () => "into", ok: (p) => p.kind === "char" || (p.kind === "folder" && p.id !== g.id),
      hint: (p, _z, alt) => p.kind === "char" ? `‘${g.name}’ 안에 ${alt ? "복사" : "넣기"}` : `‘${g.name}’ 안으로`,
      run: (p, _z, copy) => (p.kind === "char" ? dropChars(p, g.id, null, copy) : dropFolder(p.id, g.id, null)) });
    return t;
  }
  function charsView() {
    if (!proj.chars.length && !proj.folders.length) return [empty("이 " + (target.kind === "module" ? "모듈" : "봇") + "에 들어갈 캐릭터를 만들어요", "캐릭터를 열어 씬(표정·포즈)을 만들고 예약하면 SDStudio처럼 차례로 그려요. 캐릭터·소속은 폴더로 묶어요.", btn("새 캐릭터", { kind: "primary", icon: "plus", onClick: () => addChar() }))];
    const v = P.view(proj, st.folder);
    const folderRow = (f, depth = 0) => {
      const all = P.rowChars(proj, f.id), list = (f.members ?? []).map((id) => P.charOf(proj, id)).filter(Boolean), subF = depth < 8 ? proj.folders.filter((x) => x.parent === f.id) : [], subs = subF.length;
      const folded = (st.folded ??= []).includes(f.id);
      const foldBtn = h("button", { type: "button", class: "rb-icon-btn sds-fold", "aria-label": folded ? "펼치기" : "접기", "aria-expanded": String(!folded), title: folded ? "펼치기" : "접기",
        onClick: (e) => { e.stopPropagation(); st.folded = folded ? st.folded.filter((x) => x !== f.id) : [...st.folded, f.id]; paintBody(); } }, h("span", { style: `display:flex;transition:transform .15s;transform:rotate(${folded ? -90 : 0}deg)` }, ico("chevD", 16)));
      const row = h("div", { class: ["sds-frow sds-folder", folded && "folded"], dataset: { id: f.id } },
        h("div", { class: "hd" }, foldBtn, h("button", { type: "button", class: "open sds-fopen", onClick: () => { if (!isCur("folder", f.id)) setFocus("folder", f.id); }, onDblclick: () => { st.focus = null; st.folder = f.id; sel.clear(); paintTools(); paintBody(); } },
          h("span", { style: "color:var(--rb-acc);display:flex" }, ico("folder", 18)), h("b", { style: "font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, f.name),
          f.kind ? h("span", { class: "rb-badge" }, KIND_KO[f.kind]) : null, f.tpl ? h("span", { class: "rb-badge", title: "새 캐릭터에 적용할 기본 템플릿" }, `템플릿 ${f.tpl}`) : null, h("span", { class: "rb-muted" }, `${all.length}명${subs ? ` · 폴더 ${subs}` : ""}`), h("span", { style: "color:var(--rb-mute);display:flex" }, ico("chevR", 16))),
          h("button", { type: "button", class: "rb-icon-btn", "aria-label": "폴더 메뉴", onClick: (e) => folderMenu(e.currentTarget, f.id) }, ico("more", 18))),
        folded ? null : list.length ? h("div", { class: "strip" }, ...list.map((c) => charCard(c, f.id, list))) : subF.length ? null : h("span", { class: "rb-muted", style: "white-space:normal" }, "비어 있어요. 캐릭터 카드나 폴더를 여기로 끌어다 놓아요."),
        !folded && subF.length ? h("div", { class: "sds-subrows" }, ...subF.map((g) => folderRow(g, depth + 1))) : null);
      row.classList.toggle("cur", isCur("folder", f.id));
      row.querySelector(".hd").addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); folderMenu(e.currentTarget, f.id); });
      dragSource(row.querySelector(".hd"), () => ({ kind: "folder", id: f.id }));
      dropTarget(row, {
        mode: (p) => (p.kind === "folder" ? "y3" : "into"),
        ok: (p) => p.kind === "char" || (p.kind === "folder" && p.id !== f.id),
        hint: (p, z, alt) => p.kind === "char" ? `‘${f.name}’ 안에 ${alt ? "복사" : "넣기"}${p.ids.length > 1 ? ` (${p.ids.length}명)` : ""}` : z === "into" ? `‘${f.name}’ 안으로` : `‘${f.name}’ ${z === "before" ? "위" : "아래"}에 놓기`,
        run: (p, z, copy) => {
          if (p.kind === "char") return dropChars(p, f.id, null, copy);
          if (z === "into") return dropFolder(p.id, f.id, null);
          const sibs = proj.folders.filter((x) => (x.parent ?? null) === (f.parent ?? null) && x.id !== p.id);
          dropFolder(p.id, f.parent ?? null, z === "before" ? f.id : nextAfter(sibs, f.id));
        }
      });
      return row;
    };
    const rows = v.folders.map((f) => folderRow(f));
    const out = rows.length ? [h("div", { class: "sds-subrows sds-toprows" }, ...rows)] : [];
    if (v.chars.length) {
      const g = grid(...v.chars.map((c) => charCard(c, st.folder, v.chars)));
      dropTarget(g, { mode: () => "into", ok: (p) => p.kind === "char", run: (p, _z, copy) => dropChars(p, st.folder, null, copy) });
      out.push(sec(st.folder ? "캐릭터" : rows.length ? "폴더 없는 캐릭터" : "캐릭터", v.chars.length), g);
    } else if (st.folder && !rows.length) out.push(h("span", { class: "rb-muted" }, "이 폴더에 바로 든 캐릭터가 없어요. 캐릭터 카드를 끌어다 놓을 수 있어요."));
    else if (rows.length) {
      const z = h("div", { class: "sds-rootdrop" }, st.folder ? "여기에 놓으면 이 폴더 바로 아래로 와요" : "여기에 놓으면 폴더에서 빠져요");
      dropTarget(z, { mode: () => "into", ok: (p) => p.kind === "char", run: (p) => dropChars(p, st.folder, null, false) });
      out.push(z);
    }
    if (proj.chars.length) out.push(h("span", { class: "rb-muted", style: "font-size:12px;white-space:normal" }, "카드·폴더를 끌어서 옮겨요 · 폴더에 놓으면 들어가고, 위 경로(전체 › …)에 놓으면 그 위치로 가요 · Alt/⌥를 누르고 놓으면 복사(여러 폴더에 걸치기)"));
    return out;
  }
  function scenesView(c) {
    if (!c.scenes.length) return [empty("씬이 없어요", "씬은 표정·포즈 하나예요. 이름이 그대로 감정 이미지 이름이 돼요.", btn("새 씬", { kind: "primary", icon: "plus", onClick: () => addScene() }), btn("감정 세트 더하기", { icon: "sparkle", onClick: () => addEmotionSet() }))];
    const others = proj.chars.filter((x) => x.id !== c.id);
    const tray = others.length ? h("div", { class: "sds-tray" }, h("span", { class: "rb-muted", style: "font-size:12px" }, "다른 캐릭터로(Alt/⌥ 복사)"), ...others.map((o) => {
      const chip = h("span", { class: "rb-chip", role: "button" }, o.name);
      dropTarget(chip, { mode: () => "into", ok: (p) => p.kind === "scene" && p.cid === c.id, run: (p, _z, copy) => { S.set(P.moveScenesToChar(proj, c.id, p.ids, o.id, { copy })); sel.clear(); afterMove(); } });
      return chip;
    })) : null;
    const nf = c.scenes.filter((x) => x.images.length && !P.hasFav(x)).length;
    return [sec("씬", c.scenes.length, nf ? h("button", { type: "button", class: "sds-pill", id: "sds-nofav-pill", title: "즐겨찾기 없는 씬부터 대표 고르기", style: "cursor:pointer;border:0", onClick: () => chooser({ onlyNoFav: true }) }, `★ 없는 씬 ${nf}`) : null, h("span", { class: "rb-muted", style: "font-size:12px" }, "눌러서 고르고, 더블클릭하면 열려요 · 끌어서 순서 바꾸기 · Ctrl/⌘·체크로 여러 개 고르기")), grid(...c.scenes.map((sc) => sceneCard(c, sc, c.scenes))), tray];
  }
  function sceneView(c, sc) {
    const n = combinationCount(sc.slots);
    const nameIn = h("input", { class: "sds-in", value: sc.name, id: "sds-sname", "aria-label": "씬 이름", style: "font-weight:800;min-width:160px;flex:1", onChange: (e) => { const nm = e.target.value.trim(); if (nm && nm !== sc.name) { S.set(P.updateScene(proj, c.id, sc.id, { name: P.uniqueSceneName({ scenes: c.scenes.filter((x) => x.id !== sc.id) }, nm) })); paintBody(); } } });
    const sizeSel = h("select", { class: "sds-sel", "aria-label": "씬 크기", id: "sds-ssize", onChange: (e) => { S.set(P.updateScene(proj, c.id, sc.id, { size: e.target.value })); paintLeft(); } },
      h("option", { value: "", selected: !sc.size }, "크기: 세로(기본)"), ...Object.entries(RESOLUTIONS).map(([k, r]) => h("option", { value: k, selected: sc.size === k }, `${r.label} ${r.width}×${r.height}`)));
    const stepper = h("div", { class: "sds-row", style: "gap:4px" }, ib("minus", "예약 하나 빼기", () => { S.set(P.setReserve(proj, c.id, sc.id, sc.reserve - 1)); paintTop(); paintBody(); }, { disabled: !sc.reserve }),
      h("span", { class: "sds-pill", id: "sds-srsv" }, `예약 ${sc.reserve}`), ib("plus", "1장 예약", () => { S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); paintTop(); paintBody(); }, { id: "sds-srsv-plus" }));
    const setSlots = (slots) => { S.set(P.setSlots(proj, c.id, sc.id, slots)); };
    const slotsEl = h("div", { class: "sds-slots", id: "sds-slots" });
    const preview = h("pre", { class: "rb-muted", id: "sds-preview", style: "margin:0;white-space:pre-wrap;word-break:break-word;font:inherit;font-size:12.5px;background:var(--rb-win);border-radius:var(--rb-r1);padding:8px 10px" });
    const paintPreview = () => { const s = proj.settings, cc = P.charOf(proj, c.id), ss = P.sceneOf(proj, c.id, sc.id); try { preview.textContent = combinationCount(ss.slots) ? buildPrompt({ top: s.top, own: P.ownPrompt(proj, cc), middle: P.middleFor(ss, 0), back: s.back }, proj.pieces, () => 0) : "켜진 조각이 없는 슬롯이 있어 그릴 수 없어요."; preview.style.color = ""; } catch (e) { preview.textContent = e.message; preview.style.color = "var(--rb-danger)"; } };
    const paintSlots = () => {
      const cur = P.sceneOf(proj, c.id, sc.id).slots;
      replace(slotsEl, ...cur.map((slot, si) => h("div", { class: "sds-slot" },
        h("div", { class: "hd" }, h("span", { style: "flex:1" }, `슬롯 ${si + 1}`), h("button", { type: "button", class: "rb-icon-btn", "aria-label": "슬롯 지우기", onClick: () => { setSlots(cur.filter((_, k) => k !== si)); paintSlots(); paintPreview(); refreshCount(); } }, ico("x", 14))),
        ...slot.map((pc, pi) => h("div", { class: ["sds-piece", pc.on === false && "off"] },
          h("input", { type: "checkbox", checked: pc.on !== false, title: "켜기", "aria-label": "조각 켜기", style: "margin-top:12px", onChange: (e) => { setSlots(P.sceneOf(proj, c.id, sc.id).slots.map((s2, a) => a !== si ? s2 : s2.map((x, b) => b !== pi ? x : { ...x, on: e.target.checked }))); paintSlots(); paintPreview(); refreshCount(); } }),
          promptArea({ value: pc.prompt, rows: 2, label: `슬롯 ${si + 1} 조각 ${pi + 1}`, onInput: (v) => { setSlots(P.sceneOf(proj, c.id, sc.id).slots.map((s2, a) => a !== si ? s2 : s2.map((x, b) => b !== pi ? x : { ...x, prompt: v }))); paintPreview(); } }),
          h("button", { type: "button", class: "rb-icon-btn", "aria-label": "조각 지우기", onClick: () => { setSlots(P.sceneOf(proj, c.id, sc.id).slots.map((s2, a) => a !== si ? s2 : s2.filter((_, b) => b !== pi))); paintSlots(); paintPreview(); refreshCount(); } }, ico("trash", 14)))),
        btn("조각 더하기", { size: "sm", icon: "plus", onClick: () => { setSlots(P.sceneOf(proj, c.id, sc.id).slots.map((s2, a) => a !== si ? s2 : [...s2, { prompt: "", on: true }])); paintSlots(); refreshCount(); } }))),
        h("button", { type: "button", class: "sds-slot", id: "sds-addslot", style: "align-items:center;justify-content:center;min-height:120px;cursor:pointer;color:var(--rb-sub);font:inherit;font-weight:700", onClick: () => { setSlots([...P.sceneOf(proj, c.id, sc.id).slots, [{ prompt: "", on: true }]]); paintSlots(); paintPreview(); refreshCount(); } }, ico("plus", 22), "슬롯 더하기"));
    };
    const countPill = h("span", { class: "sds-pill" });
    const refreshCount = () => { countPill.textContent = `조합 ${combinationCount(P.sceneOf(proj, c.id, sc.id).slots)}개`; paintTop(); };
    paintSlots(); paintPreview(); refreshCount();
    const imgs = P.sortedImages(sc), list = imgs.map((im) => ({ cid: c.id, sid: sc.id, path: im.path }));
    const editor = h("section", { class: "sds-frow", id: "sds-scene-edit" },
      h("div", { class: "sds-row", style: "flex-wrap:wrap" }, nameIn, sizeSel, stepper, countPill,
        btn("지금 1장", { size: "sm", kind: "primary", icon: "sparkle", id: "sds-gen-one", disabled: q.running || !n, onClick: () => { S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); runQueue(); } })),
      h("details", { open: st.slotsOpen, onToggle: (e) => { st.slotsOpen = e.target.open; } }, h("summary", { style: "cursor:pointer;font-weight:800;font-size:13px;margin-bottom:8px" }, "씬 프롬프트 조합"),
        h("div", { style: "display:flex;flex-direction:column;gap:8px" }, h("span", { class: "rb-muted", style: "white-space:normal;font-size:12px" }, "슬롯마다 켜진 조각 하나씩 골라 조합해요. 예약 1장 = 조합 전부. 최종 = 상위 + 외형 + 이 조합 + 하위."), slotsEl, h("span", { class: "rb-label" }, "미리보기(첫 조합)"), preview)));
    return [editor, sec("이미지", imgs.length, imgs.length ? h("span", { class: "rb-muted", style: "font-size:12px" }, "누르면 크게 · 체크로 고르기") : null),
      imgs.length ? grid(...imgs.map((im, i) => imageCard(list[i], im, list, i))) : empty("아직 그림이 없어요", "예약하고 위의 ‘생성’을 누르거나 ‘지금 1장’을 눌러요.")];
  }
  function galleryView(c) {
    const chars = c ? [c] : st.folder ? P.rowChars(proj, st.folder) : proj.chars;
    const all = chars.flatMap((cc) => cc.scenes.flatMap((sc) => P.sortedImages(sc).map((im) => ({ it: { cid: cc.id, sid: sc.id, path: im.path }, im, sc, cc }))));
    if (!all.length) return [empty("그림이 없어요", "씬을 예약하고 ‘생성’을 누르면 여기에 모여요.")];
    const list = all.map((x) => x.it), picked = all.filter((x) => x.im.pick);
    const setAll = (on) => { let nx = proj; for (const x of all) if (!!x.im.pick !== on) nx = P.setPicks(nx, x.it.cid, x.it.sid, [x.it.path], on); S.set(nx, { undo: false }); paintTools(); paintBody(); };
    const out = [h("div", { class: "sds-row sds-bulkbar", id: "sds-gbulk", style: "flex-wrap:wrap;gap:8px;position:sticky;top:0;z-index:4;background:var(--rb-win);padding:6px 0" },
      h("span", { class: "sds-pill" }, `그림 ${all.length}장 · 고름 ${picked.length}`),
      btn("모두 고르기", { size: "sm", id: "sds-g-all", onClick: () => setAll(true) }),
      btn("고르기 풀기", { size: "sm", id: "sds-g-none", disabled: !picked.length, onClick: () => setAll(false) }),
      btn(`고른 ${picked.length}장 봇에 넣기`, { size: "sm", kind: "primary", id: "sds-g-put", disabled: !picked.length, onClick: () => quickPut(picked.map((x) => ({ cid: x.it.cid, sid: x.it.sid, path: x.it.path, name: x.sc.name }))) }),
      btn(`고른 ${picked.length}장 목록에서 빼기`, { size: "sm", kind: "danger", id: "sds-g-del", disabled: !picked.length, onClick: () => removePicked(picked.map((x) => x.it)) }),
      h("span", { class: "rb-muted", style: "font-size:12px" }, "한 번 누르면 고르기 · 두 번 누르면 크게 보기"))];
    let i = 0;
    for (const cc of chars) for (const sc of cc.scenes) {
      const part = all.filter((x) => x.sc === sc);
      if (!part.length) continue;
      out.push(sec(c ? sc.name : `${cc.name} › ${sc.name}`, part.length), grid(...part.map((x) => imageCard(x.it, x.im, list, i++))));
    }
    return out;
  }
  function searchView(c) {
    const input = h("input", { class: "sds-in", id: "sds-q", type: "search", placeholder: c ? "씬 이름·프롬프트 찾기" : "캐릭터 이름·외형 프롬프트 찾기", value: st.q, style: "width:100%", onInput: (e) => { st.q = e.target.value; const r = results(); replace(resEl, ...r); } });
    const resEl = h("div", { style: "display:flex;flex-direction:column;gap:12px" });
    const results = () => {
      const qq = st.q.trim().toLowerCase();
      if (!qq) return [h("span", { class: "rb-muted" }, "찾을 말을 적어요.")];
      if (c) { const hits = c.scenes.filter((sc) => sc.name.toLowerCase().includes(qq) || sc.slots.some((s) => s.some((p) => p.prompt.toLowerCase().includes(qq)))); return hits.length ? [sec("찾은 씬", hits.length), grid(...hits.map((sc) => sceneCard(c, sc)))] : [h("span", { class: "rb-muted" }, "없어요.")]; }
      const hits = proj.chars.filter((x) => x.name.toLowerCase().includes(qq) || x.prompt.toLowerCase().includes(qq) || x.scenes.some((sc) => sc.name.toLowerCase().includes(qq)));
      return hits.length ? [sec("찾은 캐릭터", hits.length), grid(...hits.map(charCard))] : [h("span", { class: "rb-muted" }, "없어요.")];
    };
    replace(resEl, ...results());
    setTimeout(() => input.focus(), 0);
    return [input, resEl];
  }
  function compareView() {
    const items = st.compare.filter((it) => P.sceneOf(proj, it.cid, it.sid)?.images.some((i) => i.path === it.path));
    st.compare = items;
    const out = [sec("비교", items.length, items.length ? btn("비우기", { size: "sm", kind: "ghost", onClick: () => { st.compare = []; paintBody(); } }) : null)];
    if (items.length < 2) out.push(h("span", { class: "rb-muted", style: "white-space:normal" }, "그림을 2~4장 넣으면 나란히 보여요. 아래 그림을 누르거나, 크게 보기에서 ‘비교에 넣기’를 눌러요."));
    if (items.length) out.push(h("div", { class: "sds-cmp", id: "sds-cmp" }, ...items.map((it) => {
      const img = h("img", { alt: "" }); S.url(it.path).then((u) => { img.src = u; }).catch(() => {});
      const sc = P.sceneOf(proj, it.cid, it.sid), im = sc.images.find((x) => x.path === it.path);
      return h("figure", null, img, h("figcaption", null, h("span", { style: "flex:1" }, `${P.charOf(proj, it.cid).name} › ${sc.name}${im?.seed ? ` · ${im.seed}` : ""}`), h("button", { type: "button", class: "rb-icon-btn", "aria-label": "비교에서 빼기", onClick: () => { st.compare = st.compare.filter((x) => x.path !== it.path); paintBody(); } }, ico("x", 14))));
    })));
    const c = S.curChar();
    const pool = (c ? [c] : proj.chars).flatMap((cc) => cc.scenes.flatMap((sc) => sc.images.map((im) => ({ cid: cc.id, sid: sc.id, path: im.path })))).slice(0, 120);
    if (pool.length) out.push(sec("고르기", pool.length), grid(...pool.map((it) => { const on = st.compare.some((x) => x.path === it.path); const b = h("button", { type: "button", class: "sds-card", "aria-selected": String(on), onClick: () => { on ? (st.compare = st.compare.filter((x) => x.path !== it.path)) : S.addCompare(it); paintBody(); } }, S.thumb(it.path), chk()); return b; })));
    return out;
  }
  function bulkView(c) {
    const ids = c.scenes.map((s) => s.id);
    const all = h("input", { type: "checkbox", "aria-label": "모두 고르기", checked: ids.length && ids.every((i) => sel.has(i)), onChange: (e) => { if (e.target.checked) ids.forEach((i) => sel.add(i)); else sel.clear(); paintBody(); paintTools(); } });
    const pick = () => c.scenes.filter((s) => sel.has(s.id));
    const textIn = h("input", { class: "sds-in", placeholder: "넣을 태그 / 찾을 말", id: "sds-bulk-text", style: "flex:1;min-width:160px" });
    const repIn = h("input", { class: "sds-in", placeholder: "바꿀 말", id: "sds-bulk-rep", style: "flex:1;min-width:120px" });
    const each = (fn) => { const ps = pick(); if (!ps.length) { S.toast("씬을 먼저 골라요"); return; } let next = proj; for (const sc of ps) next = P.setSlots(next, c.id, sc.id, fn(P.sceneOf(next, c.id, sc.id).slots)); S.set(next); paintBody(); S.toast(`씬 ${ps.length}개를 바꿨어요`); };
    const join = (a, b) => [a, b].filter((x) => x && x.trim()).join(", ");
    const bar = h("div", { class: "sds-frow" }, h("b", null, `고른 씬 ${pick().length}개에 한꺼번에`),
      h("div", { class: "sds-row", style: "flex-wrap:wrap" }, textIn, repIn),
      h("div", { class: "sds-acts" },
        btn("앞에 넣기", { size: "sm", id: "sds-bulk-front", onClick: () => { const t = textIn.value.trim(); if (t) each((ss) => (ss.length ? ss.map((s, i) => (i ? s : s.map((p) => ({ ...p, prompt: join(t, p.prompt) })))) : [[{ prompt: t, on: true }]])); } }),
        btn("뒤에 넣기", { size: "sm", onClick: () => { const t = textIn.value.trim(); if (t) each((ss) => (ss.length ? ss.map((s, i) => (i !== ss.length - 1 ? s : s.map((p) => ({ ...p, prompt: join(p.prompt, t) })))) : [[{ prompt: t, on: true }]])); } }),
        btn("찾아 바꾸기", { size: "sm", onClick: () => { const f = textIn.value; if (f) each((ss) => ss.map((s) => s.map((p) => ({ ...p, prompt: p.prompt.split(f).join(repIn.value) })))); } }),
        btn("예약 +1", { size: "sm", onClick: () => { S.set(P.reserveAll(proj, c.id, 1, pick().map((s) => s.id))); paintTop(); paintBody(); } }),
        h("select", { class: "sds-sel", "aria-label": "크기 한꺼번에", onChange: (e) => { if (!e.target.value) return; let next = proj; for (const sc of pick()) next = P.updateScene(next, c.id, sc.id, { size: e.target.value === "base" ? "" : e.target.value }); S.set(next); paintBody(); } },
          h("option", { value: "" }, "크기 한꺼번에…"), h("option", { value: "base" }, "세로(기본)"), ...Object.entries(RESOLUTIONS).map(([k, r]) => h("option", { value: k }, r.label)))));
    const rows = c.scenes.map((sc) => h("tr", null,
      h("td", null, h("input", { type: "checkbox", checked: sel.has(sc.id), "aria-label": `${sc.name} 고르기`, onChange: (e) => { e.target.checked ? sel.add(sc.id) : sel.delete(sc.id); paintTools(); } })),
      h("td", null, h("input", { class: "sds-in", value: sc.name, style: "width:140px;height:34px", onChange: (e) => { const nm = e.target.value.trim(); if (nm) S.set(P.updateScene(proj, c.id, sc.id, { name: P.uniqueSceneName({ scenes: P.charOf(proj, c.id).scenes.filter((x) => x.id !== sc.id) }, nm) })); } })),
      h("td", { style: "min-width:260px" }, sc.slots.length === 1 && sc.slots[0].length === 1
        ? promptArea({ value: sc.slots[0][0].prompt, rows: 1, label: `${sc.name} 프롬프트`, onInput: (v) => S.set(P.setSlots(proj, c.id, sc.id, [[{ ...sc.slots[0][0], prompt: v }]])) })
        : h("span", { class: "rb-muted", style: "white-space:normal" }, sc.slots.length ? `슬롯 ${sc.slots.length}개 · 조합 ${combinationCount(sc.slots)}개` : "(조합 없음)")),
      h("td", null, sc.size ? RESOLUTIONS[sc.size]?.label ?? sc.size : "기본"),
      h("td", null, String(sc.reserve)), h("td", null, String(sc.images.length))));
    return [bar, h("div", { style: "overflow:auto" }, h("table", { class: "sds-table", id: "sds-bulk" }, h("thead", null, h("tr", null, h("th", null, all), h("th", null, "씬"), h("th", null, "프롬프트"), h("th", null, "크기"), h("th", null, "예약"), h("th", null, "그림"))), h("tbody", null, ...rows)))];
  }

  // ── 동작 ──
  function openChar(id, from) { st.focus = null; if (id && from !== undefined && (from === null || proj.folders.some((f) => f.id === from))) st.folder = from; st.charId = id; st.sceneId = null; sel.clear(); if (st.mode === "bulk" && !id) st.mode = "scene"; S.paint(); bodyEl.scrollTop = 0; }
  function openScene(id) { st.focus = null; st.sceneId = id; sel.clear(); if (id) st.mode = "scene"; paintTop(); paintTools(); paintBody(); paintLeft(); bodyEl.scrollTop = 0; }
  const paintLeft = () => S.paintLeft();
  async function addChar() {
    const r = await S.dlg.charNames({ title: "새 캐릭터", name: proj.chars.length ? "" : title });
    if (!r) return;
    let next = P.addChar(proj, r);
    const id = next.chars.at(-1).id;
    const into = st.focus?.kind === "folder" && proj.folders.some((f) => f.id === st.focus.id) ? st.focus.id : st.folder;   // 폴더를 골라 둔 채면 그 폴더 안에
    if (into) next = P.setMember(next, into, id, true);
    const fTpl = into ? P.folderTemplateFor(next, into) : "", tplName = fTpl || P.activeSet(next)?.tpl || "";
    if (tplName) {
      const tpl = (await sd.loadTemplates()).find((t) => t.name === tplName);
      if (tpl) { next = T.applyTemplate(next, [id], tpl, "replace").project; S.toast(`${fTpl ? "폴더 기본 템플릿" : "씬 프리셋"} ‘${tplName}’을 적용했어요`); }
    }
    S.set(next);
    st.focus = { kind: "char", id };   // 만든 캐릭터는 열지 않고 테두리만 켜 둔다
    afterMove();
    for (const n of bodyEl.querySelectorAll(".sds-char")) if (n.dataset.id === id) { n.scrollIntoView({ block: "nearest", inline: "nearest" }); break; }
  }
  // ── 씬 세트(SFW·NSFW·+): 폴더는 공유, 캐릭터 카드는 세트마다. 세트의 씬 프리셋 = 저장된 씬 템플릿(리스 전체) 이름 ──
  async function changeSet(id) {
    const SS = P.setsOf(proj), t = SS.list.find((x) => x.id === id);
    if (!t || id === SS.active) return;
    let copy = false;
    if (!P.setCharCount(proj, id) && proj.chars.length) copy = await confirmDialog(ctx.win, { title: `‘${t.name}’ 세트가 비어 있어요`, body: `지금 캐릭터 ${proj.chars.length}명(이름·외형·폴더 소속)을 가져와 ${t.tpl ? `씬 프리셋 ‘${t.tpl}’으로` : "빈 씬으로"} 시작할까요? 그림·씬은 따라가지 않아요.`, ok: "가져오기", cancel: "빈 세트로" });
    let next = P.switchSet(proj, id, { copy });
    if (copy && t.tpl) { const tpl = (await sd.loadTemplates()).find((x) => x.name === t.tpl); if (tpl) next = T.applyTemplate(next, next.chars.map((c) => c.id), tpl, "replace").project; }
    S.set(next); st.charId = null; st.sceneId = null; st.focus = null; sel.clear();
    S.paint(); S.toast(`‘${t.name}’ 세트로 바꿨어요`);
  }
  async function addSetFlow() {
    const name = await promptDialog(ctx.win, { title: "새 씬 세트", label: "이름", placeholder: "예: 수영복", ok: "만들기" });
    if (!name?.trim()) return;
    S.set(P.addSet(proj, { name: name.trim() })); paintTools();
    const t = P.setsOf(proj).list.at(-1);
    if ((await sd.loadTemplates()).length) await pickSetTpl(ctx.win.querySelector(`#sds-set-${t.id}`), t.id);
  }
  async function pickSetTpl(anchor, id) {
    const list = await sd.loadTemplates(), t = P.setsOf(proj).list.find((x) => x.id === id);
    if (!t) return;
    if (!list.length) return S.toast("저장된 씬 템플릿이 없어요. 템플릿 → 가져오기나 ‘템플릿으로 저장’을 먼저 해요");
    openMenu(ctx.win, anchor ?? bodyEl, [
      ...list.map((x) => ({ label: `${x.name === t.tpl ? "✓ " : ""}${x.name}`, icon: "list", onClick: () => { S.set(P.updateSet(proj, id, { tpl: x.name })); paintTools(); S.toast(`‘${t.name}’ 세트의 새 캐릭터는 ‘${x.name}’ 씬으로 시작해요`); } })),
      ...(t.tpl ? ["sep", { label: "씬 프리셋 없애기", icon: "x", onClick: () => { S.set(P.updateSet(proj, id, { tpl: "" })); paintTools(); } }] : [])
    ]);
  }
  function setMenu(anchor, id) {
    const SS = P.setsOf(proj), t = SS.list.find((x) => x.id === id);
    if (!t) return;
    openMenu(ctx.win, anchor, [
      { label: "이름 바꾸기", icon: "edit", onClick: async () => { const n = await promptDialog(ctx.win, { title: "세트 이름", label: "이름", value: t.name }); if (n?.trim()) { S.set(P.updateSet(proj, id, { name: n })); paintTools(); } } },
      { label: t.tpl ? `씬 프리셋: ${t.tpl}` : "씬 프리셋 고르기…", icon: "list", onClick: () => pickSetTpl(anchor, id) },
      ...(t.tpl && id === SS.active ? [{ label: "씬 프리셋을 이 세트 캐릭터 모두에 적용", icon: "sparkle", onClick: () => applySetTpl(t) }] : []),
      "sep",
      { label: "세트 지우기", icon: "trash", danger: true, onClick: async () => {
        if (SS.list.length <= 1) return;
        if (id === SS.active) return S.toast("지금 쓰는 세트는 지울 수 없어요. 다른 세트로 바꾼 뒤 지워요");
        if (!await confirmDialog(ctx.win, { title: `‘${t.name}’ 세트를 지울까요?`, body: `이 세트의 캐릭터 ${P.setCharCount(proj, id)}명과 그림 목록이 빠져요. 리스 에셋 저장소 파일은 남아요.`, ok: "지우기", danger: true })) return;
        S.set(P.removeSet(proj, id)); paintTools();
      } }
    ]);
  }
  async function applySetTpl(t) {
    const tpl = (await sd.loadTemplates()).find((x) => x.name === t.tpl);
    if (!tpl) return S.toast("그 템플릿이 없어요", { error: true });
    const ids = proj.chars.map((c) => c.id);
    if (!ids.length) return;
    const need = T.needsChoice(proj, ids); let mode = "merge";
    if (need.length) { mode = await S.dlg.templateChoice(need.length, tpl.name); if (!mode) return; }
    S.set(T.applyTemplate(proj, ids, tpl, mode).project); paintTop(); paintBody(); S.toast(`‘${tpl.name}’을 ${ids.length}명에 적용했어요`);
  }
  async function removeChars(ids) {
    if (!ids.length || !await confirmDialog(ctx.win, { title: `캐릭터 ${ids.length}명을 지울까요?`, body: "씬·프롬프트·그림 목록이 지워져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.", ok: "지우기", danger: true })) return;
    let next = proj; for (const id of ids) next = P.removeChar(next, id);
    S.set(next); sel.clear(); paintTop(); paintTools(); paintBody();
  }
  async function addScene() {
    const c = S.curChar();
    const name = await promptDialog(ctx.win, { title: "새 씬", label: "이름(감정 이미지 이름이 돼요)", ok: "만들기", placeholder: "예: angry" });
    if (!name?.trim()) return;
    S.set(P.addScene(proj, c.id, { name: P.uniqueSceneName(c, name), prompt: name.trim() }));
    paintTop(); paintBody();
  }
  function addEmotionSet() {
    const c = S.curChar();
    const have = new Set(c.scenes.map((s) => s.name.toLowerCase()));
    let next = proj, n = 0;
    for (const [nm, pr] of EMOTION_SET) if (!have.has(nm)) { next = P.addScene(next, c.id, { name: nm, prompt: pr }); n++; }
    S.set(next); paintTop(); paintBody();
    S.toast(n ? `감정 씬 ${n}개를 더했어요` : "이미 다 있어요");
  }
  async function removeScenes(ids) {
    const c = S.curChar();
    if (!ids.length || !await confirmDialog(ctx.win, { title: `씬 ${ids.length}개를 지울까요?`, body: "조합·그림 목록이 지워져요. 리스 에셋 저장소 파일은 그대로예요.", ok: "지우기", danger: true })) return;
    S.set(P.removeScenes(proj, c.id, ids)); sel.clear();
    if (ids.includes(st.sceneId)) st.sceneId = null;
    paintTop(); paintTools(); paintBody();
  }
  async function removePicked(items) {
    if (!items.length || !await confirmDialog(ctx.win, { title: `${items.length}장을 목록에서 뺄까요?`, body: "이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.", ok: "빼기", danger: true })) return;
    let nx = proj; for (const it of items) nx = P.removeImages(nx, it.cid, it.sid, [it.path]);
    S.set(nx); sel.clear(); paintTools(); paintBody();
  }
  async function removePaths(cid, sid, paths) {
    if (!paths.length || !await confirmDialog(ctx.win, { title: `${paths.length}장을 목록에서 뺄까요?`, body: "이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 넣은 에셋은 그대로예요.", ok: "빼기", danger: true })) return;
    S.set(P.removeImages(proj, cid, sid, paths)); sel.clear(); paintTools(); paintBody();
  }
  async function addFolder(parent = st.folder) {
    const r = await S.dlg.folderDialog({ title: parent ? "안에 폴더 만들기" : "폴더 만들기" });
    if (!r) return;
    S.set(P.addFolder(proj, { ...r, parent })); paintTools(); paintBody();
  }
  async function pickFolderTpl(anchor, f) {
    const list = await sd.loadTemplates();
    if (!list.length) return S.toast("저장된 템플릿이 없어요. 캐릭터 안에서 ‘템플릿으로 저장’하거나 가져오기를 먼저 해요");
    openMenu(ctx.win, anchor, [
      ...list.map((t) => ({ label: `${t.name === f.tpl ? "✓ " : ""}${t.name}`, icon: "folder", onClick: () => { S.set(P.updateFolder(proj, f.id, { tpl: t.name })); paintBody(); S.toast(`이제 ‘${f.name}’(안의 폴더 포함)에 만드는 캐릭터는 ‘${t.name}’으로 시작해요`); } })),
      ...(f.tpl ? ["sep", { label: "기본 템플릿 없애기", icon: "x", onClick: () => { S.set(P.updateFolder(proj, f.id, { tpl: "" })); paintBody(); } }] : [])
    ]);
  }
  function folderMenu(anchor, id) {
    const f = proj.folders.find((x) => x.id === id);
    if (!f) return;
    openMenu(ctx.win, anchor, [
      { label: "이름·종류·프롬프트 바꾸기", icon: "edit", onClick: async () => { const r = await S.dlg.folderDialog({ title: "폴더 바꾸기", name: f.name, en: f.en ?? "", kind: f.kind, prompt: f.prompt ?? "", ok: "저장" }); if (r) { S.set(P.updateFolder(proj, id, r)); paintBody(); } } },
      { label: "안에 폴더 만들기", icon: "folderPlus", onClick: () => addFolder(id) },
      { label: f.tpl ? `기본 템플릿: ${f.tpl}` : "기본 템플릿 정하기…", icon: "folder", onClick: () => pickFolderTpl(anchor, f) },
      ...(P.folderTemplateFor(proj, id) ? [{ label: "기본 템플릿을 안의 캐릭터 모두에 적용", icon: "folder", onClick: async () => { const tpl = (await sd.loadTemplates()).find((t) => t.name === P.folderTemplateFor(proj, id)); if (!tpl) return S.toast("그 템플릿이 없어요", { error: true }); const ids = P.rowChars(proj, id).map((c) => c.id); if (!ids.length) return; const need = T.needsChoice(proj, ids); let mode = "merge"; if (need.length) { mode = await S.dlg.templateChoice(need.length, tpl.name); if (!mode) return; } S.set(T.applyTemplate(proj, ids, tpl, mode).project); paintTop(); paintBody(); S.toast(`‘${tpl.name}’을 ${ids.length}명에 적용했어요`); } }] : []),
      ...(f.parent ? [{ label: "맨 위로 꺼내기", icon: "up", onClick: () => { S.set(P.moveFolder(proj, id, null)); paintBody(); } }] : []),
      "sep",
      { label: "폴더 지우기", icon: "trash", danger: true, onClick: async () => {
        if (!await confirmDialog(ctx.win, { title: `‘${f.name}’ 폴더를 지울까요?`, body: "안의 폴더도 함께 지워져요. 캐릭터와 그림은 남아요.", ok: "지우기", danger: true })) return;
        S.set(P.removeFolder(proj, id));
        if (st.folder && !proj.folders.some((x) => x.id === st.folder)) st.folder = null;
        paintTools(); paintBody();
      } }
    ]);
  }
  function folderPick(anchor, ids) {
    openMenu(ctx.win, anchor, proj.folders.map((f) => {
      const inAll = ids.every((id) => f.members.includes(id));
      return { label: `${inAll ? "✓ " : ""}${P.pathOf(proj, f.id).map((x) => x.name).join(" › ")}`, icon: "folder", onClick: () => { let next = proj; for (const id of ids) next = P.setMember(next, f.id, id, !inAll); S.set(next); paintBody(); S.toast(inAll ? "폴더에서 뺐어요" : "폴더에 넣었어요"); } };
    }));
  }
  function charMenu(anchor, c) {
    openMenu(ctx.win, anchor, [
      { label: "열기", icon: "chevron", onClick: () => openChar(c.id) },
      { label: "이름 바꾸기", icon: "edit", onClick: async () => { const r = await S.dlg.charNames({ title: "이름 바꾸기", name: c.name, en: c.en ?? "", ok: "바꾸기" }); if (r?.name) { S.set(P.updateChar(proj, c.id, r)); paintBody(); paintTop(); } } },
      { label: "복제", icon: "split", onClick: () => { S.set(P.duplicateChar(proj, c.id)); paintBody(); } },
      ...(proj.folders.length ? [{ label: "폴더에 넣기·빼기", icon: "folder", onClick: () => folderPick(anchor, [c.id]) }] : []),
      "sep", { label: "지우기", icon: "trash", danger: true, onClick: () => removeChars([c.id]) }
    ]);
  }
  function imageMenu(anchor, it, list, idx) {
    const sc = P.sceneOf(proj, it.cid, it.sid), im = sc?.images.find((x) => x.path === it.path);
    if (!im) return;
    openMenu(ctx.win, anchor, [
      { label: "크게 보기", icon: "eye", onClick: () => openLightbox(S, list, idx) },
      { label: im.pick ? "보낼 그림에서 빼기" : "보낼 그림으로 고르기", icon: "check", onClick: () => togglePick(it) },
      { label: im.fav ? "즐겨찾기 풀기" : "즐겨찾기", icon: "sparkle", onClick: () => { S.set(P.setImage(proj, it.cid, it.sid, it.path, { fav: !im.fav })); paintBody(); } },
      { label: "씬 대표로", icon: "image", onClick: () => { S.set(P.updateScene(proj, it.cid, it.sid, { cover: it.path })); paintBody(); } },
      { label: "캐릭터 대표로", icon: "image", onClick: () => { S.set(P.updateChar(proj, it.cid, { cover: it.path })); S.toast("캐릭터 카드 대표로 했어요"); } },
      { label: "이 그림만 봇에 넣기", icon: "exportBot", onClick: () => quickPut([{ ...it, name: sc.name }]) },
      { label: "넣는 방법 고르고 넣기…", icon: "sliders", onClick: () => putPaths([{ ...it, name: sc.name }]) },
      "sep", { label: "목록에서 빼기", icon: "trash", danger: true, onClick: () => removePicked([it]) }
    ]);
  }
  // 빈 곳 우클릭: 지금 위치에서 만들 수 있는 것
  function bodyMenu(anchor) {
    const c = S.curChar();
    openMenu(ctx.win, anchor, c ? [
      { label: "새 씬", icon: "plus", onClick: () => addScene() },
      { label: "모든 씬 1장씩 예약", icon: "calPlus", onClick: () => { S.set(P.reserveAll(proj, c.id, 1)); paintTop(); paintBody(); } },
      { label: "위로", icon: "back", onClick: () => goUp() }
    ] : [
      { label: "새 캐릭터", icon: "plus", onClick: () => addChar() },
      { label: st.folder ? "안에 폴더 만들기" : "폴더 만들기", icon: "folderPlus", onClick: () => addFolder() },
      { label: "SDStudio 백업 가져오기…", icon: "upload", onClick: () => importBackup() },
      ...(st.folder ? [{ label: "위로", icon: "back", onClick: () => goUp() }] : [])
    ]);
  }
  function sceneMenu(anchor, c, sc) {
    openMenu(ctx.win, anchor, [
      { label: "열기", icon: "chevron", onClick: () => openScene(sc.id) },
      { label: "1장 예약", icon: "plus", onClick: () => { S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); paintTop(); paintBody(); } },
      { label: "예약 비우기", icon: "x", onClick: () => { S.set(P.setReserve(proj, c.id, sc.id, 0)); paintTop(); paintBody(); } },
      { label: "이미지 월드컵", icon: "zap", onClick: () => openCup(S, c.id, sc.id) },
      ...(sc.images.length ? [{ label: "여기서 대표 고르기", icon: "sparkle", onClick: () => { const all = c.scenes.filter((x) => x.images.length).map((x) => ({ cid: c.id, sid: x.id })); openChooser(S, all, { start: Math.max(0, all.findIndex((x) => x.sid === sc.id)) }); } }] : []),
      { label: "복제", icon: "split", onClick: () => { S.set(P.duplicateScene(proj, c.id, sc.id)); paintBody(); } },
      "sep", { label: "지우기", icon: "trash", danger: true, onClick: () => removeScenes([sc.id]) }
    ]);
  }
  async function copyPrompts(c, ids) {
    const s = proj.settings;
    const lines = c.scenes.filter((sc) => !ids || ids.includes(sc.id)).map((sc) => { try { return `${sc.name}: ${buildPrompt({ top: s.top, own: P.ownPrompt(proj, c), middle: P.middleFor(sc, 0), back: s.back }, proj.pieces, () => 0)}`; } catch (e) { return `${sc.name}: (${e.message})`; } });
    try { await navigator.clipboard.writeText(lines.join("\n")); S.toast("프롬프트를 복사했어요"); } catch { S.toast("복사하지 못했어요", { error: true }); }
  }
  function zipMenu(anchor) {
    const c = S.curChar(), sc = S.curScene();
    openMenu(ctx.win, anchor, [
      ...(sc ? [{ label: P.pickCount(sc) ? `고른 그림 ${P.pickCount(sc)}장` : `이 씬 그림 ${sc.images.length}장`, icon: "download", onClick: () => zipOut((P.pickCount(sc) ? P.pickedImages(c, sc.id).map((x) => x.path) : sc.images.map((i) => i.path)).map((p, i) => [`${P.zipDir(proj, c)}/${sc.name}_${i + 1}.png`, p])) }] : []),
      { label: "씬 대표 그림만", icon: "download", onClick: () => zipOut((c ? [c] : proj.chars).flatMap((cc) => cc.scenes.filter((s2) => P.coverOf(s2)).map((s2) => [`${P.zipDir(proj, cc)}/${s2.name}.png`, P.coverOf(s2)]))) },
      { label: "모든 그림", icon: "download", onClick: () => zipOut((c ? [c] : proj.chars).flatMap((cc) => cc.scenes.flatMap((s2) => P.sortedImages(s2).map((im, i) => [`${P.zipDir(proj, cc)}/${s2.name}_${i + 1}.png`, im.path])))) }
    ]);
  }
  async function zipOut(entries) {
    if (!entries.length) { S.toast("내려받을 그림이 없어요"); return; }
    const t = ctx.toast(`zip 만드는 중 0/${entries.length}`, { seconds: 600 });
    try {
      const files = {}, used = new Set();
      let n = 0;
      for (const [name0, path] of entries) {
        let name = name0.replace(/[\\:*?"<>|]/g, "_"); for (let k = 2; used.has(name); k++) name = name0.replace(/\.png$/, `_${k}.png`);
        used.add(name); files[name] = [await S.bytes(path), { level: 0 }];
        const span = ctx.win.querySelector(".rb-toasts .rb-toast:last-child span"); if (span) span.textContent = `zip 만드는 중 ${++n}/${entries.length}`;
      }
      download(`${title || "에셋"}-에셋제작.zip`, new Blob([zipSync(files)], { type: "application/zip" }));
    } catch (e) { ctx.toast(`zip을 만들지 못했어요: ${e?.message ?? e}`, { error: true }); }
    finally { t?.close?.(); }
  }

  // ── 봇에 바로 넣기(대화상자 없이): 설정의 자리·형식·같은 이름 규칙대로, 한 번에 저장, 알림에서 되돌리기 ──
  const SLOT_KO = { emotionImages: "감정 이미지", additionalAssets: "추가 에셋", assets: "모듈 에셋" };
  const fmtKB = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
  function putOne(x, slot, name, path, ext, dup, used, names) {
    const list = x[slot] ?? [], key = String(name).toLowerCase(), at = list.findIndex((a) => String(a?.[0]).toLowerCase() === key);
    if (dup === "replace" && at >= 0 && !used.has(key)) { used.add(key); names?.push(list[at][0]); return { ...x, [slot]: list.map((a, k) => (k === at ? (slot === "emotionImages" ? [a[0], path] : [a[0], path, ext]) : a)) }; }
    const nm = uniqueAssetName(x, slot, name); used.add(nm.toLowerCase()); names?.push(nm);
    return withAsset(x, slot, nm, path, ext);
  }
  // 에셋 이름: 설정(넣을 때 에셋 이름) — scene = 씬 이름, us = 폴더_캐릭터_씬.확장자, dot = 폴더.캐릭터.씬.확장자
  var charFolderName = (cid) => P.folderFileName(P.charFolderOf(proj, cid));
  function assetName(it, ext) {
    const style = S.prefs.nameStyle ?? "scene";
    if (style === "scene" || !it.cid) return it.name;
    const c = P.charOf(proj, it.cid), sep = style === "dot" ? "." : "_";
    return [charFolderName(it.cid), c && P.fileName(c), it.name].filter(Boolean).join(sep) + (ext ? `.${ext}` : "");
  }
  // 지금 보는 범위(맨 위 = 전체, 폴더 = 그 폴더, 캐릭터·씬 = 그 캐릭터)의 고른 그림 모두
  function pickedInScope() {
    const c = S.curChar();
    const chars = c ? [c] : st.folder ? P.rowChars(proj, st.folder) : proj.chars;
    return chars.flatMap((x) => P.pickedImages(x).map((y) => ({ ...y, cid: x.id })));
  }
  const okSlot = (v) => (target.kind === "module" ? v === "assets" : v === "emotionImages" || v === "additionalAssets");
  const slotOf = (v) => (okSlot(v) ? v : okSlot(S.prefs.putSlot) ? S.prefs.putSlot : target.kind === "module" ? "assets" : "additionalAssets");
  const scopeChars = () => { const c = S.curChar(); return c ? [c] : st.folder ? P.rowChars(proj, st.folder) : proj.chars; };
  // 지금 보는 범위의 즐겨찾기 모두(씬이면 그 씬만)
  function favsInScope() {
    const c = S.curChar(), sc = S.curScene();
    return (c ? [c] : scopeChars()).flatMap((x) => P.favImages(x, sc && x === c ? sc.id : null).map((y) => ({ ...y, cid: x.id })));
  }
  // 봇·모듈의 자리별 에셋 이름(소문자)
  async function targetNames() {
    let src;
    if (target.kind === "module") src = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === target.id)?.module;
    else src = await ctx.api.getCharacterFromIndex(target.index);
    const out = {};
    for (const k of ["assets", "additionalAssets", "emotionImages"]) out[k] = new Set((src?.[k] ?? []).map((a) => String(a?.[0] ?? "").toLowerCase()));
    return out;
  }
  // 내보내기 전에 확인하고 넣기(즐겨찾기 기본)
  async function exportFav(items = favsInScope()) {
    items = items.filter((x) => x?.path);
    if (!items.length) { S.toast("즐겨찾기한 그림이 없어요. 그림에서 ★(F)를 눌러요"); return; }
    let names;
    try { names = await targetNames(); } catch (e) { ctx.toast(`봇을 읽지 못했어요: ${e?.message ?? e}`, { error: true }); return; }
    const ext = (S.prefs.putFormat ?? "webp") === "png" ? "png" : S.prefs.putFormat ?? "webp";
    const rows = items.map((it) => ({ it, label: `${P.charOf(proj, it.cid)?.name ?? ""} › ${it.name}`, nameFor: () => assetName(it, ext) }));
    const r = await S.dlg.exportPreview({ rows, names });
    if (!r) return;
    await quickPut(r.idx.map((i) => items[i]), { slot: r.slot, dup: r.dup });
  }
  S.exportFav = exportFav;
  // 대표 고르기: 지금 범위의 씬들(씬 안이면 그 씬부터)
  function chooser({ onlyNoFav = false } = {}) {
    const c = S.curChar(), sc = S.curScene();
    const scenes = scopeChars().flatMap((x) => x.scenes.map((s) => ({ cid: x.id, sid: s.id })));
    const withImg = scenes.filter((x) => P.sceneOf(proj, x.cid, x.sid)?.images.length);
    if (!withImg.length) { S.toast("그림이 있는 씬이 없어요. 먼저 예약하고 생성해요"); return; }
    const start = sc ? Math.max(0, withImg.findIndex((x) => x.cid === c.id && x.sid === sc.id)) : 0;
    openChooser(S, withImg, { start, onlyNoFav });
  }
  function reserveNoFav() {
    const n = proj.settings.reserveDefault; let nx = proj, k = 0;
    for (const x of scopeChars()) { k += P.scenesNoFav(x).length; nx = P.reserveNoFav(nx, x.id, n); }
    if (!k) { S.toast("즐겨찾기 없는 씬이 없어요"); return; }
    S.set(nx); paintTop(); paintBody(); S.toast(`즐겨찾기 없는 씬 ${k}개에 ${n}장씩 예약했어요`);
  }
  async function quickPut(items, opt = {}) {
    items = items.filter((x) => x?.path);
    if (!items.length) { S.toast("보낼 그림을 먼저 골라요(그림 왼쪽 위 체크)"); return; }
    const slot = slotOf(opt.slot);
    const dup = opt.dup ?? S.prefs.dup;
    const fmt = S.prefs.putFormat ?? "webp", quality = S.prefs.putQuality ?? 0.85;
    const t = ctx.toast(`넣는 중 0/${items.length}`, { seconds: 600 });
    const span = () => ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
    try {
      const out = new Array(items.length);
      let next = 0, done = 0, fell = false, before = 0, after = 0;
      const work = async () => {
        while (next < items.length) {
          const i = next++, it = items[i];
          if (fmt === "png") out[i] = { path: it.path, ext: "png" };
          else {
            const src = await S.bytes(it.path), conv = await convertImage(src, fmt, quality);
            fell ||= conv.fellBack; before += src.length; after += conv.data.length;
            out[i] = conv.ext === "png" ? { path: it.path, ext: "png" } : { path: await sd.saveAsset(conv.data), ext: conv.ext };
          }
          const sp = span(); if (sp) sp.textContent = `넣는 중 ${++done}/${items.length}`;
        }
      };
      await Promise.all([work(), work(), work()]);
      let prevSlot = null; const names = [];
      await withTarget((tg) => { prevSlot = structuredClone(tg[slot] ?? []); names.length = 0; const used = new Set(); let x = tg; items.forEach((it, i) => { x = putOne(x, slot, opt.name || assetName(it, out[i].ext), out[i].path, out[i].ext, dup, used, names); }); return x; });
      let unpick = proj;   // 보낸 그림은 고르기를 풀어 다시 보내지 않게 · 넣은 이름은 기록(다음에 '이미 넣음')
      items.forEach((it, i) => { if (it.cid && it.sid) { unpick = P.setPicks(unpick, it.cid, it.sid, [it.path], false); if (names[i]) unpick = P.markSent(unpick, it.cid, it.sid, it.path, names[i]); } });
      if (unpick !== proj) S.set(unpick, { undo: false });
      t?.close?.();
      const size = fmt !== "png" && before ? ` · ${fmtKB(before)} → ${fmtKB(after)}` : "";
      ctx.toast(`${SLOT_KO[slot]}에 ${items.length}장 넣었어요${size}`, { seconds: 8, action: { label: "되돌리기", run: async () => { try { await withTarget((tg) => ({ ...tg, [slot]: prevSlot })); ctx.toast("넣기를 되돌렸어요"); } catch (e) { ctx.toast(`되돌리지 못했어요: ${e?.message ?? e}`, { error: true }); } } } });
      if (fell) ctx.toast("이 브라우저는 AVIF를 만들 수 없어 WebP(또는 원본)로 넣었어요");
      sel.clear(); paintTools(); paintBody();
    } catch (e) { t?.close?.(); ctx.toast(`넣지 못했어요: ${e?.message ?? e}`, { error: true }); }
  }
  // ── 씬 템플릿: 맨 위 = 모든 캐릭터, 폴더 안 = 그 폴더(안의 폴더 포함)의 캐릭터, 캐릭터 안 = 그 캐릭터 ──
  function scope() {
    const c = S.curChar();
    if (c) return { ids: [c.id], label: `‘${c.name}’` };
    if (st.folder) { const ids = P.rowChars(proj, st.folder).map((x) => x.id); return { ids, label: `‘${proj.folders.find((f) => f.id === st.folder)?.name}’ 폴더의 캐릭터 ${ids.length}명` }; }
    return { ids: proj.chars.map((x) => x.id), label: `모든 캐릭터 ${proj.chars.length}명` };
  }
  async function applyTpl(tpl) {
    const sc = scope();
    if (!sc.ids.length) { S.toast("적용할 캐릭터가 없어요. 먼저 캐릭터를 만들어요"); return; }
    const need = T.needsChoice(proj, sc.ids);
    let mode = "merge";
    if (need.length) { mode = await S.dlg.templateChoice(need.length, tpl.name); if (!mode) return; }
    const r = T.applyTemplate(proj, sc.ids, tpl, mode);
    S.set(r.project);
    paintTop(); paintTools(); paintBody(); S.paintLeft();
    ctx.toast(`‘${tpl.name}’을 ${sc.label}에 적용했어요 · 더함 ${r.stats.added} · 바뀜 ${r.stats.updated}${r.stats.removed ? ` · 빠짐 ${r.stats.removed}` : ""}`, { seconds: 8, action: { label: "되돌리기", run: () => S.undo() } });
  }
  async function storeTemplate(t) {
    const list = await sd.loadTemplates();
    const i = list.findIndex((x) => x.name === t.name);
    if (i >= 0) list[i] = t; else list.push(t);
    await sd.saveTemplates(list);
  }
  // ── 프로젝트 전체 백업(zip): 설정(JSON)과 모든 그림. 가져오기는 'SDStudio 백업 가져오기'로 같은 zip을 고르면 돼요 ──
  async function fullBackup() {
    S.persist(); saveToBot({ force: true });
    const paths = [...FB.assetPaths(proj)];
    const t = ctx.toast(`백업 만드는 중 0/${paths.length}`, { seconds: 3600 });
    try {
      const files = {}, names = new Map();
      let n = 0, miss = 0;
      for (const p of paths) {
        try {
          const data = await S.bytes(p), ext = (/\.(png|webp|jpe?g|avif)$/i.exec(p)?.[1] ?? "png").toLowerCase();
          const name = `img/${String(names.size + 1).padStart(5, "0")}.${ext}`;
          names.set(p, name); files[name] = [data, { level: 0 }];
        } catch { miss++; }
        if (++n % 10 === 0) { const span = ctx.win.querySelector(".rb-toasts .rb-toast:last-child span"); if (span) span.textContent = `백업 만드는 중 ${n}/${paths.length}`; await new Promise((r) => setTimeout(r)); }
      }
      files[FB.BACKUP_NAME] = [strToU8(JSON.stringify(FB.makeBackup(proj, names, { title }))), { level: 6 }];
      download(`${title || "에셋"}-프로젝트백업.zip`, new Blob([zipSync(files)], { type: "application/zip" }));
      ctx.toast(`백업을 내려받았어요(그림 ${names.size}장${miss ? `, 못 읽은 ${miss}장 빠짐` : ""})`, { seconds: 8, error: !!miss });
    } catch (e) { ctx.toast(`백업을 만들지 못했어요: ${e?.message ?? e}`, { error: true }); }
    finally { t?.close?.(); }
  }
  async function restoreFull(arc, data) {
    const b = FB.readBackup(data);
    if (!b) throw new Error("백업 파일이 올바르지 않아요");
    if (!await confirmDialog(ctx.win, { title: "이 백업으로 지금 프로젝트를 바꿀까요?", body: `캐릭터 ${b.project.chars?.length ?? 0}명, 그림 ${b.entries.length}장. 지금 내용은 되돌리기로 돌아올 수 있어요.`, ok: "바꾸기" })) return;
    const t = ctx.toast(`그림 가져오는 중 0/${b.entries.length}`, { seconds: 3600 });
    const map = new Map();
    let next = 0, done = 0;
    const work = async () => {
      while (next < b.entries.length) {
        const name = b.entries[next++];
        try { map.set(name, await sd.saveAsset(await arc.get(name))); } catch { /* 이 그림은 건너뜀 */ }
        const sp = ctx.win.querySelector(".rb-toasts .rb-toast:last-child span"); if (sp) sp.textContent = `그림 가져오는 중 ${++done}/${b.entries.length}`;
      }
    };
    try { await Promise.all([work(), work(), work()]); } finally { t?.close?.(); }
    const lost = b.entries.length - map.size;
    S.set(P.normalizeProject(FB.restore(b.project, map)));
    st.folder = null; openChar(null);
    ctx.toast(`백업을 불러왔어요(그림 ${map.size}장${lost ? `, 못 가져온 ${lost}장 빠짐` : ""})`, { seconds: 8, action: { label: "되돌리기", run: () => S.undo() }, error: !!lost });
  }
  // ── SDStudio 백업(.tar·.zip·프로젝트 .json) 가져오기 ──
  async function openArchive(f) {
    const head = new Uint8Array(await f.slice(0, 512).arrayBuffer());
    if (head[0] === 0x7b || /\.json$/i.test(f.name)) { const j = JSON.parse(await f.text()); return { files: [], projs: [BK.projectFromSession(j, { name: j.name || f.name.replace(/\.json$/i, "") })], read: null }; }
    if (BK.isTar(head)) {
      const read = async (o, n) => new Uint8Array(await f.slice(o, o + n).arrayBuffer());
      const files = await BK.listTar(read, f.size), at = new Map(files.map((x) => [x.name, x]));
      const get = async (name) => { const x = at.get(name); if (!x) throw new Error(`${name}이 없어요`); return read(x.off, x.size); };
      return { files, get };
    }
    let bytes = new Uint8Array(await f.arrayBuffer());
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
    if (BK.isTar(bytes.subarray(0, 512))) {
      const read = async (o, n) => bytes.subarray(o, o + n);
      const files = await BK.listTar(read, bytes.length), at = new Map(files.map((x) => [x.name, x]));
      return { files, get: async (name) => { const x = at.get(name); if (!x) throw new Error(`${name}이 없어요`); return bytes.subarray(x.off, x.off + x.size); } };
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const m = unzipSync(bytes), files = Object.keys(m).filter((k) => !k.endsWith("/")).map((name) => ({ name }));
      return { files, get: async (name) => { if (!m[name]) throw new Error(`${name}이 없어요`); return m[name]; } };
    }
    throw new Error("SDStudio 백업(.tar)이나 프로젝트 파일(.json)이 아니에요");
  }
  async function importBackup(file) {
    const f = file ?? (await pickFiles({ accept: ".tar,.zip,.json,.gz,application/x-tar,application/json,application/zip" }))[0];
    if (!f) return;
    let arc, projs;
    const t0 = ctx.toast("백업을 읽는 중…", { seconds: 600 });
    try {
      arc = await openArchive(f);
      if (arc.get && arc.files.some((x) => x.name === FB.BACKUP_NAME)) { t0?.close?.(); await restoreFull(arc, JSON.parse(strFromU8(await arc.get(FB.BACKUP_NAME)))); return; }
      projs = arc.projs ?? await BK.findProjects(arc.files, async (n) => JSON.parse(new TextDecoder().decode(await arc.get(n))));
    } catch (e) { t0?.close?.(); ctx.toast(`읽지 못했어요: ${e?.message ?? e}`, { error: true }); return; }
    t0?.close?.();
    if (!projs.length) { ctx.toast("백업 안에서 SDStudio 프로젝트를 찾지 못했어요", { error: true }); return; }
    const r = await S.dlg.backupImport({ projs, hasImages: !!arc.get && projs.some((x) => x.count) });
    if (!r) return;
    const chosen = r.idx.map((i) => projs[i]);
    const { project, jobs } = BK.importProjects(proj, chosen, { mode: arc.get ? r.mode : "none" });
    S.set(project);
    st.folder = null; openChar(null);
    if (!jobs.length) { ctx.toast(`캐릭터 ${chosen.length}명을 가져왔어요`, { seconds: 8, action: { label: "되돌리기", run: () => S.undo() } }); return; }
    const t = ctx.toast(`그림 가져오는 중 0/${jobs.length}`, { seconds: 3600 });
    const span = () => ctx.win.querySelector(".rb-toasts .rb-toast:last-child span");
    let next = 0, done = 0, fail = 0, pend = [];
    const base = Date.now();
    const flush = () => { if (!pend.length) return; let nx = proj; for (const x of pend) nx = P.addImage(nx, x.cid, x.sid, { path: x.path, fav: x.fav }, () => x.at); pend = []; S.set(nx, { undo: false }); };
    const work = async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        try { const data = await arc.get(j.entry); const path = await sd.saveAsset(data); pend.push({ ...j, path, at: base - j.order }); }
        catch { fail++; }
        done++;
        if (pend.length >= 20) { flush(); paintBody(); }
        const sp = span(); if (sp) sp.textContent = `그림 가져오는 중 ${done}/${jobs.length}`;
      }
    };
    await Promise.all([work(), work(), work()]);
    flush(); S.persist(); t?.close?.(); S.paint();
    ctx.toast(`캐릭터 ${chosen.length}명 · 그림 ${jobs.length - fail}장을 가져왔어요${fail ? ` (못 읽은 그림 ${fail}장)` : ""}`, { seconds: 10 });
  }
  S.importBackup = importBackup;
  async function importTemplate() {
    const [f] = await pickFiles({ accept: "application/json,.json" });
    if (!f) return;
    let t;
    try { t = T.parseTemplateFile(JSON.parse(await f.text())); } catch (e) { ctx.toast(`읽지 못했어요: ${e?.message ?? e}`, { error: true }); return; }
    if (!t.scenes.length) { ctx.toast("씬이 없는 템플릿이에요", { error: true }); return; }
    await storeTemplate(t);
    await applyTpl(t);
  }
  async function saveTemplate(c) {
    const name = await promptDialog(ctx.win, { title: "씬을 템플릿으로 저장", label: "템플릿 이름(같은 이름은 바뀌어요)", value: `${c.name} 씬`, ok: "저장" });
    if (!name?.trim()) return;
    await storeTemplate(T.templateFromChar(c, name.trim(), proj.pieces));
    ctx.toast(`템플릿 ‘${name.trim()}’을 저장했어요(씬 ${c.scenes.length}개)`);
  }
  async function templateMenu(anchor) {
    const list = await sd.loadTemplates(), c = S.curChar();
    openMenu(ctx.win, anchor, [
      ...list.map((t) => ({ label: `${t.name} 적용 (씬 ${t.scenes.length})`, icon: "preset", onClick: () => applyTpl(t) })),
      ...(list.length ? ["sep"] : []),
      { label: "파일에서 가져와 적용(SDStudio·Dusk)…", icon: "upload", onClick: () => importTemplate() },
      ...(c ? [{ label: "이 캐릭터 씬을 템플릿으로 저장", icon: "plus", onClick: () => saveTemplate(c) }] : []),
      { label: "템플릿 관리…", icon: "list", onClick: () => S.dlg.templateManager({ apply: applyTpl }) }
    ]);
  }

  // ── 봇·모듈에 넣기 ──
  async function withTarget(fn) {
    if (target.kind === "module") {
      const m = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === target.id)?.module;
      if (!m) throw new Error("모듈을 찾지 못했어요");
      const next = fn(structuredClone(m));
      await ctx.svc.run("update", target.id, { assets: next.assets });
      ctx.state.modDirty = true;
      return;
    }
    const b = await ctx.api.getCharacterFromIndex(target.index);
    if (!b || b.chaId !== target.id) throw new Error("봇을 찾지 못했어요");
    if (isGenerating(b)) throw new Error("봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요");
    await ctx.api.setCharacterToIndex(target.index, fn(b));
    ctx.state.charsDirty = true;
  }
  // 넣는 방법 고르고 넣기: 자리·이름(비우면 씬 이름)·같은 이름 규칙을 이번만 바꿔 바로 넣기와 같은 길로
  async function putPaths(items) {
    if (!items.length) return;
    const r = await S.dlg.put({ count: items.length });
    if (r) await quickPut(items, r);
  }

  // ── 그리기(예약 큐) ──
  async function vibesFor(model) {
    const m = modelOf(model), out = [];
    if (!m.vibe) return out;
    for (const v of proj.settings.vibes.filter((x) => x.on)) {
      let enc = v.enc && v.enc.model === model && v.enc.info === v.info ? v.enc.data : null;
      if (!enc) {
        enc = await sd.encodeVibe(buildEncodeVibeBody(toB64(await S.bytes(v.path)), v.info, model), { signal: q.ctl?.signal, label: "sdstudio:vibe" });
        S.set(P.setSettings(proj, { vibes: proj.settings.vibes.map((x) => (x.id === v.id ? { ...x, enc: { model, info: v.info, data: enc } } : x)) }), { undo: false });
      }
      out.push({ image: enc, strength: v.strength });
    }
    return out;
  }
  async function refsFor(model) {
    if (!modelOf(model).reference) return [];
    const out = [];
    for (const r of proj.settings.refs.filter((x) => x.on)) out.push({ image: await letterbox(await S.bytes(r.path)), strength: r.strength, fidelity: r.fidelity, type: r.type, info: 1 });
    return out;
  }
  async function generateJob(job, k, token) {
    const c = P.charOf(proj, job.cid), sc = P.sceneOf(proj, job.cid, job.sid), s = proj.settings;
    if (!c || !sc) return;
    const prompt = buildPrompt({ top: s.top, own: P.ownPrompt(proj, c), middle: P.middleFor(sc, job.combo), back: s.back }, proj.pieces);
    const { width, height } = P.sizeFor(s.size, sc);
    const body = buildGenerateBody({ prompt, uc: buildNegative(s.neg, proj.pieces), width, height, seed: P.seedFor(s.seed, k), settings: s.sampling,
      chars: s.chars.filter((x) => x.on), vibes: await vibesFor(s.sampling.model), refs: await refsFor(s.sampling.model) });
    const data = await sd.image(body, { signal: q.ctl?.signal, token });
    const path = await sd.saveAsset(data);
    S.remember(path, data);
    S.set(P.addImage(proj, c.id, sc.id, { path, seed: body.parameters.seed, prompt, w: width, h: height }), { undo: false });
  }
  async function runQueue() {
    if (q.running) return;
    const jobs = P.planJobs(proj);
    if (!jobs.length) { S.toast("예약된 씬이 없어요. 씬 카드의 +1이나 위 예약 버튼을 눌러요."); return; }
    if (!await S.dlg.token()) return;
    const tokens = S.prefs.boost ? (await sd.getTokens()).slice(0, 4) : [];
    const lanes = tokens.length >= 2 ? tokens.map((t) => t.token) : [undefined];   // 부스트: 토큰마다 한 줄씩 동시에
    Object.assign(q, { running: true, done: 0, total: jobs.length, ctl: new AbortController(), workers: lanes.length, t0: Date.now(), retry: 0 });
    sd.setPrefs({ resume: true }).catch(() => {});   // 도중에 창·앱이 꺼지면 다음에 열 때 이어 그리기를 물어봄
    let wake = null; try { wake = await navigator.wakeLock?.request("screen"); } catch { /* 지원 안 함 */ }
    const tick = setInterval(() => { const t = el.querySelector("#sds-prog .t"); if (t) t.textContent = progressText(); }, 1000);
    paintTop(); paintBody();
    const per = new Map();
    let err = null, next = 0;
    const lane = async (token) => {
      while (q.running && !err && next < jobs.length) {
        const k = next++, job = jobs[k];
        let ok = false;
        for (let tries = 0; q.running && !err; tries++) {
          try { await generateJob(job, k, token); ok = true; q.retry = 0; q.lastErr = ""; break; }
          catch (e) {
            if (isStopError(e) || !q.running) { err ??= e; break; }
            if (/토큰|401|402|403|Unauthorized|Anlas|구독/i.test(e?.message ?? "")) { err ??= e; q.running = false; q.ctl?.abort(); break; }
            // 요청 자체가 틀린 오류(400·404·413 등, 429 빼고)는 다시 해도 같으니 멈추고 알림
            if (/NovelAI 오류 4(?!29)\d\d/.test(e?.message ?? "")) { err ??= e; q.running = false; q.ctl?.abort(); break; }
            q.lastErr = String(e?.message ?? e).slice(0, 80);
            q.retry = tries + 1; paintTop();
            const wait = Math.min(60000, [3000, 6000, 15000, 30000][tries] ?? 60000);   // 네트워크·서버 오류는 끝없이 다시(최대 1분 간격)
            await new Promise((r) => setTimeout(r, wait));
          }
        }
        if (!ok) break;
        q.done++;
        const sc = P.sceneOf(proj, job.cid, job.sid);
        const n = (per.get(job.sid) ?? 0) + 1; per.set(job.sid, n);
        if (sc && n % Math.max(1, combinationCount(sc.slots)) === 0) S.set(P.setReserve(proj, job.cid, job.sid, sc.reserve - 1), { undo: false });
        if (Date.now() - (q.savedAt ?? 0) > 3000) { q.savedAt = Date.now(); S.persist(); }   // 자동 저장(그림·남은 예약)
        if (!el.hidden) { paintTop(); paintBody(); }
      }
    };
    await Promise.all(lanes.map(lane));
    clearInterval(tick); try { await wake?.release(); } catch { /* 이미 풀림 */ }
    sd.setPrefs({ resume: false }).catch(() => {});
    const done = q.done;
    Object.assign(q, { running: false, ctl: null, workers: 1 });
    await S.persist();
    paintTop(); paintTools(); paintBody();
    if (err && !isStopError(err)) { ctx.toast(`그리다 멈췄어요(${done}장 완료): ${err?.message ?? err}`, { error: true }); if (/토큰/.test(err?.message ?? "")) S.dlg.token({ force: true }); }
    else ctx.toast(err ? `멈췄어요. ${done}장 만들었어요` : `${done}장 다 그렸어요${lanes.length > 1 ? ` (부스트 ${lanes.length}줄)` : ""}`);
    if (el.hidden) finish();   // 닫아 둔 채 다 그렸으면 이제 정리
  }
  function stopQueue() { q.running = false; q.ctl?.abort(); }
  // 변형·인페인트·업스케일·디렉터 도구 → 같은 씬에 더함. 만든 경로를 돌려준다
  async function derive(it, kind, opts) {
    const sc = P.sceneOf(proj, it.cid, it.sid), im = sc?.images.find((x) => x.path === it.path), c = P.charOf(proj, it.cid);
    if (!im) return null;
    if (!await S.dlg.token()) return null;
    const label = { img2img: "변형", infill: "인페인트", upscale: "업스케일" }[kind] ?? "디렉터 도구";
    const t = ctx.toast(`${label} 하는 중…`, { seconds: 600 });
    try {
      const src = await S.bytes(im.path), b64 = toB64(src), sz = pngSize(src) ?? { width: im.w, height: im.h };
      const s = proj.settings;
      let data, prompt = im.prompt;
      if (kind === "img2img" || kind === "infill") {
        prompt = opts.prompt?.trim() || im.prompt || buildPrompt({ top: s.top, own: P.ownPrompt(proj, c), middle: P.middleFor(sc, 0), back: s.back }, proj.pieces);
        const body = buildGenerateBody({ prompt, uc: buildNegative(s.neg, proj.pieces), width: sz.width, height: sz.height, settings: s.sampling, action: kind, image: b64,
          mask: kind === "infill" ? toB64(opts.mask) : undefined, strength: opts.strength, noise: opts.noise ?? 0, addOriginal: opts.keep ?? true, chars: s.chars.filter((x) => x.on), vibes: await vibesFor(s.sampling.model), refs: kind === "img2img" ? await refsFor(s.sampling.model) : [] });
        data = await sd.image(body, { label: `sdstudio:${kind}` });
      } else if (kind === "upscale") data = await sd.upscale(buildUpscaleBody(b64), { label: "sdstudio:upscale" });
      else data = await sd.augment(buildAugmentBody({ method: kind, image: b64, width: sz.width, height: sz.height, prompt: opts.prompt ?? "", emotion: opts.emotion, defry: opts.defry ?? 0 }), { label: `sdstudio:${kind}` });
      const path = await sd.saveAsset(data);
      S.remember(path, data);
      const nsz = pngSize(data) ?? sz;
      S.set(P.addImage(proj, it.cid, it.sid, { path, seed: null, prompt, w: nsz.width, h: nsz.height, from: kind }), { undo: false });
      ctx.toast(`${label}한 그림을 더했어요`);
      return path;
    } catch (e) {
      if (!isStopError(e)) ctx.toast(`${label}하지 못했어요: ${e?.message ?? e}`, { error: true });
      return null;
    } finally { t?.close?.(); }
  }

  // 폴더 → 봇·모듈 로어북 폴더(설정에서 켰을 때만). 이름·위치만 맞추고, 지워도 로어북 쪽은 남긴다
  async function syncLoreNow() {
    try {
      const field = target.kind === "module" ? "lorebook" : "globalLore";
      const cur = await readBot();
      if (!cur) return;
      const lore = cur[field] ?? [];
      // 1) 로어북에서 새로 만든 Dusk 폴더·[소속] 폴더 → 에셋 제작 폴더로
      const pulled = pullLore(lore, proj);
      if (pulled.added) { proj = pulled.project; S.persist(); paintTools(); paintBody(); ctx.toast(`로어북 폴더 ${pulled.added}개를 가져왔어요`); }
      // 2) 에셋 제작 폴더 → 로어북(같은 목록에서 한 번만 계산해 id가 어긋나지 않게)
      const r = syncLore(lore, proj, { newFolder: (name, list, o) => newFolderEntry(name, list, o) });
      if (r.changed) {
        if (target.kind === "module") await ctx.svc.run("update", target.id, { lorebook: r.lorebook });
        else {
          if (isGenerating(cur)) return;
          await ctx.api.setCharacterToIndex(target.index, { ...cur, globalLore: r.lorebook });
        }
        if (target.kind === "module") ctx.state.modDirty = true; else ctx.state.charsDirty = true;
      }
      if (Object.keys(r.ids).length) { proj = P.setLoreIds(proj, r.ids); S.persist(); }
    } catch (e) { ctx.toast(`로어북 폴더를 맞추지 못했어요: ${e?.message ?? e}`, { error: true }); }
  }
  S.syncLore = syncLoreNow;
  // 봇(모듈) 안에도 저장 — 무겁지 않게 닫을 때·3분마다·백업할 때만
  async function saveToBot({ force = false, remove = false } = {}) {
    if (!remove && (!botOn || (!botDirty && !force))) return;
    try {
      const snap = remove ? null : { t: Date.now(), z: u8b64(gzipSync(strToU8(JSON.stringify(proj)))) };
      if (target.kind === "module") await ctx.svc.run("update", target.id, { [BD.BOT_KEY]: snap ?? undefined });
      else {
        const b = await ctx.api.getCharacterFromIndex(target.index);
        if (!b || b.chaId !== target.id || isGenerating(b)) return;
        if (!remove && BD.readSnap(b, "character")?.t > Math.max(botT, await sd.savedAt(target))) { ctx.toast("봇 안 설정이 더 최근이라 덮어쓰지 않았어요(다른 기기에서 고친 듯해요)", { error: true }); return; }
        await ctx.api.setCharacterToIndex(target.index, BD.writeSnap(b, "character", snap));
      }
      botDirty = false; if (snap) botT = snap.t;
    } catch (e) { if (force || remove) ctx.toast(`봇에 저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
  }
  const botTimer = setInterval(() => { if (!el.hidden) saveToBot(); }, 180000);
  async function toggleBotSave() {
    if (botOn) {
      if (!await confirmDialog(ctx.win, { title: "봇에 저장을 끌까요?", body: "봇 안에 넣어 둔 에셋 제작 설정을 지워요. 리스에서 카드를 그대로 내보내 배포할 때 쓰세요. 설정은 플러그인 저장소·이 기기 복사본에 그대로 남아요.", ok: "끄고 지우기" })) return;
      botOn = false; await sd.setLocal(botKey, true); await saveToBot({ remove: true }); S.toast("봇에서 지웠어요. 배포가 끝나면 다시 켜 주세요");
    } else { botOn = true; await sd.setLocal(botKey, false); await saveToBot({ force: true }); S.toast("봇에도 저장해요"); }
    paintTools();
  }
  function close() {
    S.persist(); saveToBot();
    restoreWin();
    if (q.running) { el.hidden = true; ctx.toast(`창을 닫아도 계속 그려요(${q.done}/${q.total}). 다시 ‘에셋 제작’을 누르면 이어서 보여요`, { seconds: 8 }); return; }
    finish();
  }
  function restoreWin() {
    if (ctx.root) { if (prev.root == null) ctx.root.removeAttribute("style"); else ctx.root.setAttribute("style", prev.root); }
    if (prev.win == null) ctx.win.removeAttribute("style"); else ctx.win.setAttribute("style", prev.win);
  }
  function reopen() {
    prev.root = ctx.root?.getAttribute("style") ?? null; prev.win = ctx.win.getAttribute("style") ?? null;
    if (ctx.root) ctx.root.style.padding = "0";
    Object.assign(ctx.win.style, { maxWidth: "none", maxHeight: "none", width: "100%", height: "100%", borderRadius: "0", border: "0" });
    ctx.api.showContainer?.("fullscreen")?.catch?.(() => {});
    if (!el.isConnected) ctx.win.appendChild(el);
    el.hidden = false; S.paint(); el.focus();
  }
  function finish() {
    clearInterval(botTimer); clearTimeout(loreT);
    LIVE.delete(liveKey);
    removeEventListener?.("focus", refull); document.removeEventListener?.("visibilitychange", refull);
    lazy?.disconnect();
    for (const u of thumbUrls.values()) URL.revokeObjectURL(u);
    el.remove();
  }
  async function runAction(act) {
    const c = S.curChar(), sc = S.curScene();
    if (act === "run") return q.running ? stopQueue() : runQueue();
    if (act === "toggleLeft") return S.toggleLeft();
    if (act === "undo") return S.undo();
    if (act === "redo") return S.redo();
    if (act === "help") return S.dlg.help();
    if (act === "search") return setMode("search");
    if (/^mode[1-5]$/.test(act)) { const m = MODES[Number(act[4]) - 1][0]; if (m !== "bulk" || c) setMode(m); return; }
    if (act === "choose") return chooser();
    if (act === "putFav") return exportFav();
    if (act === "put") return quickPut(sc ? P.pickedImages(c, sc.id).map((x) => ({ ...x, cid: c.id })) : pickedInScope());
    if (act === "unpick") { const items = pickedInScope(); let nx = proj; for (const x of items) nx = P.setPicks(nx, x.cid, x.sid, [x.path], false); sel.clear(); st.focus = null; S.set(nx, { undo: false }); paintTools(); paintBody(); return; }
    if (act === "remove") {
      if (st.mode === "gallery" || sc) { const items = sc ? P.pickedImages(c, sc.id).map((x) => ({ ...x, cid: c.id })) : pickedInScope(); if (items.length) return removePicked(items); }
      if (sel.size) return c ? removeScenes([...sel]) : removeChars([...sel]);
      if (st.focus?.kind === "char") return removeChars([st.focus.id]);
      if (st.focus?.kind === "folder") { const f = proj.folders.find((x) => x.id === st.focus.id); if (f && await confirmDialog(ctx.win, { title: `‘${f.name}’ 폴더를 지울까요?`, body: "안의 폴더도 함께 지워져요. 캐릭터와 그림은 남아요.", ok: "지우기", danger: true })) { S.set(P.removeFolder(proj, f.id)); st.focus = null; paintTools(); paintBody(); } }
      return;
    }
    if (act === "selectAll" && st.mode === "gallery") { return el.querySelector("#sds-g-all")?.click(); }
    if (act === "selectAll") { if (sc) { S.set(P.setPicks(proj, c.id, sc.id, sc.images.map((i) => i.path), true), { undo: false }); paintTools(); paintBody(); return; } (c ? c.scenes.map((x) => x.id) : P.view(proj, st.folder).chars.map((x) => x.id)).forEach((k) => sel.add(k)); paintTools(); paintBody(); return; }
    if (act === "newItem") return c ? addScene() : addChar();
    if (act === "cup") { if (sc) return openCup(S, c.id, sc.id); if (c && sel.size === 1) return openCup(S, c.id, [...sel][0]); return; }
    if (act === "reserve") { if (sc) S.set(P.setReserve(proj, c.id, sc.id, sc.reserve + 1)); else if (c && sel.size) S.set(P.reserveAll(proj, c.id, 1, [...sel])); else return; paintTop(); paintBody(); }
  }
  el.addEventListener("keydown", (e) => {
    if (ctx.win.querySelector(".rb-modal, .rb-menu") || el.querySelector(".sds-over")) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? "");
    if (e.key === "Escape") {
      if (typing && e.target.value) { e.target.blur(); return; }
      e.stopPropagation();
      if (sel.size) { sel.clear(); paintTools(); paintBody(); }
      else if (st.mode !== "scene") setMode("scene");
      else if (st.sceneId) openScene(null);
      else if (st.charId) openChar(null);
      else close();
      return;
    }
    const combo = comboOf(e), act = actionOf(S.keys, combo);
    if (!act) return;
    if (typing && (!typingSafe(combo) || act === "undo" || act === "redo" || act === "selectAll")) return;   // 글 쓰는 칸은 제 되돌리기·전체 선택
    e.preventDefault(); e.stopPropagation();
    runAction(act);
  });
  S.paint();
  el.focus();
  if (prefs.loreSync) setTimeout(() => syncLoreNow(), 300);
  S.tut = { importBackup: () => importBackup(), importTemplate: () => importTemplate(), pickSetTpl: (a, id) => pickSetTpl(a, id) };
  if (!prefs.tutorialDone) setTimeout(() => S.dlg.tutorial?.(), 400);   // 처음 한 번
   // 열 때 로어북에서 새로 만든 폴더 가져오기
  const live = { el, close, S, reopen };
  LIVE.set(liveKey, live);
  addEventListener?.("pagehide", () => S.persist());
  document.addEventListener?.("visibilitychange", () => { if (document.visibilityState === "hidden") S.persist(); });
  // 창 포커스를 잃었다 돌아오면 호스트가 사이드바를 다시 꺼내므로, 열려 있는 동안 전체 화면을 다시 요청한다
  const refull = () => { if (!el.hidden && el.isConnected && document.visibilityState !== "hidden") ctx.api.showContainer?.("fullscreen")?.catch?.(() => {}); };
  addEventListener?.("focus", refull); document.addEventListener?.("visibilitychange", refull);
  // 지난번에 그리다 끊겼으면 이어 그리기
  if (prefs.resume && P.planJobs(proj).length) ctx.toast(`지난번에 그리다 멈췄어요. 남은 ${P.planJobs(proj).length}장을 이어 그릴까요?`, { seconds: 30, action: { label: "이어 그리기", run: () => runQueue() } });
  return live;
}

// 캐릭터 레퍼런스 그림: NAI가 받는 크기(1024×1536·1536×1024·1472×1472) 중 비율이 가까운 칸에 가운데 맞춤
async function letterbox(bytes) {
  const u = URL.createObjectURL(new Blob([bytes]));
  try {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = u; });
    const r = img.width / img.height;
    const [W, H] = r < 0.83 ? [1024, 1536] : r > 1.2 ? [1536, 1024] : [1472, 1472];
    const cv = Object.assign(document.createElement("canvas"), { width: W, height: H }), g = cv.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const k = Math.min(W / img.width, H / img.height), w = img.width * k, hh = img.height * k;
    g.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
    return toB64(new Uint8Array(await blob.arrayBuffer()));
  } finally { URL.revokeObjectURL(u); }
}
void fromB64; void toPARR;
