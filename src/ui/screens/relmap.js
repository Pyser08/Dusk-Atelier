// 인물 관계도 탭 (v1.9.3): {{user}}를 가운데 두고 인물을 거리(호감도)·높이(중요도)·방향(소속)으로 보여 주는 탐색 화면.
// 관계도에서 직접 고치지 않는다. 인물·선을 누르면 오른쪽에 위키 요약, 두 번 누르면 인물 위키로 이동.
// 빨리 뜨게: 같은 채팅이면 만든 화면을 그대로 다시 붙이고(ctx.state.relmap), 뒤에서 데이터만 새로 읽어 바뀐 때만 다시 그린다.
// 탭이 안 보이면 그리기 루프는 알아서 멈춘다(canvas.js).
import { loadUserName, watchUserName, userLabel } from "./memory/username.js";
import { loadUserNames } from "../../data/usernames.js";
import { autoMergeUser } from "../../data/usermerge.js";
import { h, replace } from "../dom.js";
import { chip, emptyState, loading, pageHead } from "../kit.js";
import { buildRelMap, STATUS_LABEL } from "../../engine/relmap.js";
import { mem } from "./memory/common.js";
import { createRelMapCanvas } from "./relmap/canvas.js";
import { eroLoad } from "./memory/erosyncwiki.js";
import { eroRelmapData } from "../../engine/erosyncview.js";

const sigOf = (m) => `${m.nowAt}|${m.nodes.map((n) => `${n.id}:${n.aff}:${n.imp}:${n.records}`).join(",")}|${m.edges.map((e) => `${e.id}:${e.w}:${e.items.length}`).join(",")}`;
const HELP = [["가운데", "{{user}}"], ["거리", "호감도가 높을수록 가까이"], ["높이", "지금 대화에서 중요할수록 위로"], ["방향", "같은 소속끼리 한쪽으로 (소속이 없으면 고르게)"], ["선 색", "따뜻한 관계는 붉게, 차가운 관계는 파랗게"], ["굵기", "관계의 강도"], ["점선", "풀리지 않은 갈등·오해가 있는 관계"], ["빛남", "최근에 바뀐 관계"], ["모양", "점선 빈 원은 실종, ?는 정체 불명"], ["조작", "누르면 확대, 두 번 누르면 위키로, 끌면 회전, 휠·두 손가락으로 확대·축소"]];

export async function renderRelMap(ctx) {
  const M = ctx.memory, st = (ctx.state.relmap ??= {});
  if (!M) return replace(ctx.main, h("div", { class: "rb-empty" }, "기억 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const win = ctx.win?.ownerDocument?.defaultView ?? window;
  const redraw = () => renderRelMap(ctx).catch((e) => ctx.toast?.(String(e?.message ?? e), { error: true }));

  const cur = await (M.switches.peekCurrent ? M.switches.peekCurrent({ onChange: () => { if (ctx.state.tab === "relmap") { st.view = null; redraw(); } } }) : M.switches.currentChat());
  if (!cur) return replace(ctx.main, h("div", { class: "rb-rm" }, pageHead("인물 관계도"), emptyState({ icon: "users", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 인물 관계를 보여 줘요." })));
  const key = `${cur.chaId}:${cur.chatId}:${ctx.prefs.advanced ? 1 : 0}`;

  // 같은 채팅이면 만든 화면을 그대로 붙이고, 뒤에서 새 데이터만 확인
  if (st.view?.key === key) {
    replace(ctx.main, st.view.root); st.view.ctrl.start(); st.view.ctrl.resize();
    if (st.eroOnOpen) { st.eroOnOpen = false; st.view.ero?.(); }
    M.store.getFolder(cur.chaId, cur.chatId).catch(() => null).then((f) => { const v = st.view; if (v?.key === key && ctx.state.tab === "relmap") v.update(buildRelMap(f)); });
    return;
  }
  replace(ctx.main, h("div", { class: "rb-rm" }, loading("관계도를 불러오는 중")));
  let folder = await M.store.getFolder(cur.chaId, cur.chatId).catch(() => null);
  // 페르소나 이름으로 따로 쌓인 옛 기록은 {{user}}로 자동으로 합친다. 가운데에는 그 채팅의 페르소나 이름을 보여 준다.
  const [uname, unames] = await Promise.all([loadUserName(ctx), loadUserNames(ctx.api)]);
  try {
    const merged = await autoMergeUser(M.store, cur.chaId, cur.chatId, folder, unames);
    if (merged) { folder = await M.store.getFolder(cur.chaId, cur.chatId).catch(() => folder); ctx.toast?.(`'${merged.names.join("', '") || "다른 이름"}' 기록을 {{user}}(${uname})로 합쳤어요.`); }
  } catch { /* 합치기에 실패해도 관계도는 그대로 보여 준다 */ }
  const data = buildRelMap(folder);
  if (ctx.state.tab !== "relmap") return;
  if (data.empty) {
    return replace(ctx.main, h("div", { class: "rb-rm" }, pageHead("인물 관계도"), emptyState({ icon: "users", title: "아직 그릴 인물이 없어요", text: "대화가 쌓이고 장기 기억이 인물을 기록하면 여기에 관계도가 그려져요.", actions: [{ label: "장기 기억 열기", icon: "brain", onClick: () => ctx.go("memory") }] })));
  }
  st.view?.dispose();
  st.view = buildView(ctx, win, cur, key, data, uname);
  replace(ctx.main, st.view.root);
  st.view.ctrl.start();
  if (st.eroOnOpen) { st.eroOnOpen = false; st.view.ero?.(); }
}

function buildView(ctx, win, cur, key, data, uname) {
  const adv = !!ctx.prefs.advanced;
  const canvas = h("canvas", { "aria-label": "인물 관계도" });
  const ctrlsEl = h("div", { class: "rb-rm-ctrls" });
  const legendEl = h("div", { class: "rb-rm-legend" },
    h("span", null, h("i", { style: "border-color:var(--rb-rose)" }), "따뜻한 관계"), h("span", null, h("i", { style: "border-color:var(--rb-blue)" }), "차가운 관계"),
    h("span", null, h("i", { style: "border-color:var(--rb-acc);border-top-style:dashed" }), "풀리지 않은 갈등"), h("span", null, "굵기 = 강도"));
  const tipEl = h("div", { class: "rb-rm-tip", hidden: true }), toastEl = h("div", { class: "rb-rm-toast", hidden: true });
  const helpPop = h("div", { class: "rb-rm-pop", role: "dialog", "aria-label": "관계도 읽는 법", hidden: true }, h("h3", null, "관계도 읽는 법"), h("ul", null, ...HELP.map(([a, b]) => h("li", null, h("b", null, a), b))));
  const helpBtn = h("button", { type: "button", class: "rb-rm-help", "aria-label": "관계도 읽는 법", "aria-expanded": "false", onClick: (e) => { e.stopPropagation(); setHelp(helpPop.hidden); } }, "?");
  const stage = h("div", { class: "rb-rm-stage" }, canvas, ctrlsEl, legendEl, helpBtn, helpPop, tipEl, toastEl);
  const panelBody = h("div", { "aria-live": "polite" }), qEl = h("input", { type: "search", placeholder: "인물 이름 검색", autocomplete: "off", "aria-label": "인물 이름 검색" }), qres = h("div", { class: "rb-rm-qres", hidden: true });
  const filters = h("div", { class: "rb-rm-filters" }, qEl, qres);
  const panel = h("aside", { class: "rb-rm-panel" }, filters, panelBody);
  const root = h("div", { class: "rb-rm rb-scroll", "data-page": "relmap" }, pageHead("인물 관계도", { sub: `${cur.botName ?? ""}${cur.chatName ? " · " + cur.chatName : ""}` }), h("div", { class: "rb-rm-app" }, stage, panel));

  let toastT = 0, pathFrom = "", data0 = data, pathNote = null;
  const toast = (m) => { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 1800); };
  const ctrl = createRelMapCanvas({ stage, canvas, ctrlsEl, legendEl, tipEl, win, onSelect: (sel) => choose(sel, true), onOpenWiki: (id) => openWiki(id), onToast: toast, userName: userLabel() });
  ctrl.setData(data);
  const nameWatch = watchUserName(root);   // 안내 글의 {{user}}도 페르소나 이름으로

  function setHelp(open) { helpPop.hidden = !open; helpBtn.setAttribute("aria-expanded", open ? "true" : "false"); }
  const onDoc = (ev) => { if (!helpPop.hidden && ev.target !== helpBtn && !helpPop.contains(ev.target)) setHelp(false); };
  const onKey = (ev) => { if (ev.key === "Escape" && !helpPop.hidden) { ev.stopPropagation(); setHelp(false); helpBtn.focus(); } };   // Esc는 도움말만 닫고 창은 닫지 않는다
  win.document.addEventListener("pointerdown", onDoc); win.document.addEventListener("keydown", onKey, true);
  helpPop.addEventListener("pointerdown", (e) => e.stopPropagation());

  // 인물 위키로 (두 번 누르거나 버튼)
  function openWiki(id) {
    const n = ctrl.nodeById(id); if (!n) return;
    const m = mem(ctx); m.botId = cur.chaId; m.chatIndex = cur.ti; m.tab = "people"; m.personKey = id; m.page = "detail";
    ctx.go("memory");
  }

  // ── 위쪽 버튼 ──
  const flatBtn = chip("정면으로 보기", { onClick: () => { ctrl.setFlat(!ctrl.flat); syncBtns(); } });
  const spinBtn = adv ? chip("자동 회전", { pressed: true, onClick: () => { spin = !spin; ctrl.setSpin(spin); syncBtns(); } }) : null;
  const clearBtn = chip("선택 해제", { onClick: () => choose(null) }); clearBtn.hidden = true;
  const turnBtn = chip("이번 턴 등장 강조", { pressed: true, onClick: () => { hl = !hl; ctrl.setHighlight(hl); syncBtns(); } });
  let spin = true, hl = true;
  // Erosync 목표·경쟁만 보기(Erosync가 켜져 있을 때만 버튼이 보인다). 같은 화면에서 Erosync 층만 남긴다.
  let eroOn = false, eroSnap = null;
  const legendDefault = [...legendEl.childNodes];
  const eroLegend = [h("span", null, h("i", { style: "border-color:var(--rb-rose)" }), "목표 (노리는 쪽 → 대상)"), h("span", null, h("i", { style: "border-color:var(--rb-blue);border-top-style:dashed" }), "경쟁"), h("span", null, "굵기 = 우선도·세기")];
  const applyEro = () => {
    const mapped = eroOn ? eroRelmapData(data0, eroSnap) : data0;
    ctrl.setData(mapped); buildFilters(); curSel = null; ctrl.select(null);
    legendEl.replaceChildren(...(eroOn ? eroLegend : legendDefault));
    syncBtns(); paint();
  };
  const eroBtn = ctx.erosync?.isRunning?.() ? chip("Erosync 목표·경쟁만 보기", { onClick: async () => {
    if (eroOn) { eroOn = false; applyEro(); return; }
    eroSnap = await eroLoad(ctx);
    const probe = eroSnap ? eroRelmapData(data0, eroSnap) : null;
    if (!probe || probe.empty) { toast(eroSnap ? `Erosync 목표·경쟁이 없거나, 위키에 없는 인물이에요${probe?.missing ? ` (${probe.missing}명)` : ""}.` : "Erosync 값을 읽지 못했어요. 이 채팅에서 한 턴 이상 진행했는지 확인해 주세요."); return; }
    eroOn = true; applyEro();
    if (probe.missing) toast(`위키에 없는 인물 ${probe.missing}명은 빠졌어요.`);
  } }) : null;
  ctrlsEl.append(flatBtn, ...(spinBtn ? [spinBtn] : []), clearBtn, turnBtn, ...(eroBtn ? [eroBtn] : []));
  function syncBtns() {
    flatBtn.firstChild.textContent = ctrl.flat ? "입체로 보기" : "정면으로 보기";
    flatBtn.setAttribute("aria-pressed", "false");
    turnBtn.setAttribute("aria-pressed", hl ? "true" : "false");
    if (typeof eroBtn !== "undefined" && eroBtn) eroBtn.setAttribute("aria-pressed", eroOn ? "true" : "false");
    if (spinBtn) { spinBtn.setAttribute("aria-pressed", spin ? "true" : "false"); spinBtn.disabled = ctrl.flat; spinBtn.style.opacity = ctrl.flat ? 0.45 : 1; }
  }
  syncBtns();

  // ── 패널 ──
  const dot = (c) => h("i", { class: "rb-rm-dot", style: { background: c } });
  const li = (btn) => h("li", null, btn);
  const rowBtn = (left, right, onClick, extra = {}) => h("button", { type: "button", onClick, ...extra }, h("span", null, left), right ? h("span", null, right) : null);
  const meter = (label, v) => h("div", { class: "rb-rm-meter" }, h("span", null, label), h("b", null, h("em", { style: `width:${v}%` })), h("span", null, String(v)));
  const recs = (arr) => arr.map(([a, b]) => h("div", { class: "rb-rm-rec" }, a ? h("small", null, a) : null, b));
  const dn = (n) => (n.status === "unknown" ? "???" : n.status === "missing" ? `${n.name} (실종)` : n.name);
  const goNode = (id) => choose({ type: "node", id });
  const goEdge = (id) => choose({ type: "edge", id });

  function overview() {
    const ns = ctrl.nodes().filter((n) => !ctrl.factions.length || true);
    const turn = ns.filter((n) => n.thisTurn);
    const byAff = ns.slice().sort((a, b) => b.aff - a.aff);
    return [
      turn.length ? h("div", null, h("h3", { style: "margin-top:0" }, `이번 턴 등장 · ${turn.length}명`), h("ul", { class: "rb-rm-list row" }, ...turn.map((n) => li(rowBtn(h("span", null, dot(ctrl.nodeColor(n)), n.name), null, () => goNode(n.id), { style: `border-color:${ctrl.nodeColor(n)}` }))))) : null,
      h("p", { style: "color:var(--rb-muted);margin-top:14px" }, "인물이나 선을 누르면 위키 내용이 여기에 나와요. 읽는 법은 관계도 오른쪽 위 ? 버튼에 있어요."),
      h("h3", null, "호감도 순"),
      h("ul", { class: "rb-rm-list" }, ...byAff.map((n) => li(rowBtn(h("span", null, dot(ctrl.nodeColor(n)), dn(n)), `호감 ${n.aff}`, () => goNode(n.id)))))
    ];
  }
  function nodeView(n) {
    const ue = ctrl.edgeById("u~" + n.id);
    const rel = ctrl.edges().filter((e) => !e.user && (e.a.id === n.id || e.b.id === n.id));
    return [
      h("h2", null, dn(n)),
      h("p", null, n.faction ? h("span", { class: "rb-rm-badge" }, n.faction) : null, n.thisTurn ? h("span", { class: "rb-rm-badge new" }, "이번 턴 등장") : null, n.status ? h("span", { class: "rb-rm-badge" }, STATUS_LABEL[n.status]) : null),
      n.sum ? h("p", null, n.sum) : null,
      meter("호감도", n.aff), meter("중요도", n.imp),
      ...(ue ? [h("h3", null, "{{user}}와의 관계"),
      h("ul", { class: "rb-rm-list" }, li(rowBtn(h("span", null, dot(ctrl.warmth(ue.w)), `${ue.label}${ue.sp ? " · 갈등 중" : ""}`), `${ue.rc ? "최근 변화 · " : ""}자세히`, () => goEdge(ue.id))))] : []),
      h("h3", null, "NPC 간 관계"),
      h("ul", { class: "rb-rm-list" }, ...(rel.length ? rel.map((e) => { const o = e.a.id === n.id ? e.b : e.a; return li(rowBtn(h("span", null, dot(ctrl.warmth(e.w)), dn(o)), `${e.label}${e.rc ? " · 최근" : ""}`, () => goEdge(e.id))); }) : [h("li", { style: "color:var(--rb-muted)" }, "기록된 관계가 없어요.")])),
      n.rec.length ? h("h3", null, "최근 기록") : null, ...recs(n.rec),
      h("div", { class: "rb-rm-act" },
        adv ? h("button", { type: "button", class: "rb-btn", onClick: () => { pathFrom = n.id; if (pathNote) pathNote.textContent = "경로를 볼 다른 인물을 관계도나 검색에서 눌러 주세요."; } }, h("span", null, "이 인물에서 경로 찾기")) : null,
        h("button", { type: "button", class: "rb-btn primary", onClick: () => openWiki(n.id) }, h("span", null, `${n.name} 위키 문서 열기`)),
        adv ? (pathNote = h("div", { class: "rb-rm-note" })) : null)
    ];
  }
  function edgeView(e) {
    if (e.user) {
      const n = e.b;
      return [h("h2", null, `{{user}} · ${n.name}`), h("p", null, h("span", { class: "rb-rm-badge" }, e.label), e.rc ? h("span", { class: "rb-rm-badge new" }, "최근 변화") : null, e.sp ? h("span", { class: "rb-rm-badge new" }, "풀리지 않은 갈등") : null),
        h("p", null, `${n.name}이(가) {{user}}에게 느끼는 호감도예요. 거리와 선 색에 그대로 반영돼요.`), meter("호감도", n.aff),
        n.rec.length ? h("h3", null, "최근 기록") : null, ...recs(n.rec),
        h("div", { class: "rb-rm-act" }, h("button", { type: "button", class: "rb-btn primary", onClick: () => goNode(n.id) }, h("span", null, `${n.name} 보기`)))];
    }
    return [h("h2", null, `${e.a.name} · ${e.b.name}`), h("p", null, h("span", { class: "rb-rm-badge" }, e.label), e.rc ? h("span", { class: "rb-rm-badge new" }, "최근 변화") : null),
      meter("강도", Math.round(e.s * 100)), e.items.length ? h("h3", null, "최근 변화") : null, ...recs(e.items),
      h("h3", null, "인물 보기"), h("ul", { class: "rb-rm-list" }, ...[e.a, e.b].map((n) => li(rowBtn(h("span", null, dot(ctrl.nodeColor(n)), n.name), "→", () => goNode(n.id)))))];
  }
  function pathView(res) {
    const A = ctrl.nodeById(res.ids[0]), B = ctrl.nodeById(res.ids.at(-1));
    const head = h("h2", null, `${dn(A)} → ${dn(B)}`);
    if (!res.ok) return [head, h("p", null, "두 사람을 잇는 관계 경로가 없어요. {{user}}와의 관계와 숨긴 약한 관계는 경로에 넣지 않아요.")];
    const steps = [];
    res.ids.forEach((id, k) => {
      const n = ctrl.nodeById(id);
      steps.push(li(rowBtn(h("span", null, dot(ctrl.nodeColor(n)), dn(n)), n.faction || "", () => goNode(id))));
      if (k + 1 < res.ids.length) { const e = res.edges[k]; steps.push(h("li", { class: "rb-rm-hop", style: `color:${ctrl.warmth(e.w)}` }, `↓ ${e.label}`)); }
    });
    return [head, h("p", null, `${res.ids.length - 1}단계로 이어져요.`), h("ul", { class: "rb-rm-list" }, ...steps)];
  }
  let curSel = null;
  function paint() {
    const s = curSel;
    let kids;
    if (!s) kids = overview();
    else if (s.type === "node" && ctrl.nodeById(s.id)) kids = nodeView(ctrl.nodeById(s.id));
    else if (s.type === "edge" && ctrl.edgeById(s.id)) kids = edgeView(ctrl.edgeById(s.id));
    else if (s.type === "path" && s.res) kids = pathView(s.res);
    else kids = overview();
    replace(panelBody, ...kids);
    clearBtn.hidden = !s;
    panel.scrollTop = 0;
  }
  // fromCanvas: 캔버스에서 이미 선택이 바뀐 경우(다시 알릴 필요 없음)
  function choose(sel, fromCanvas = false) {
    if (pathFrom && sel && sel.type === "node" && sel.id !== pathFrom) {
      const from = pathFrom; pathFrom = "";
      const res = ctrl.showPath(from, sel.id);
      curSel = { type: "path", res }; paint(); return;
    }
    pathFrom = "";
    curSel = sel;
    if (!fromCanvas) ctrl.select(sel);
    paint();
  }

  // ── 검색·고급 필터 ──
  qEl.addEventListener("input", () => {
    const v = qEl.value.trim().toLowerCase();
    if (!v) { qres.hidden = true; replace(qres); return; }
    const m = ctrl.nodes().filter((n) => n.status !== "unknown" && n.name.toLowerCase().includes(v));
    replace(qres, ...(m.length ? m.map((n) => h("button", { type: "button", class: "rb-chip", onClick: () => { if (ctrl.factions.length) { ctrl.setFaction(""); syncFac(); } qEl.value = ""; qres.hidden = true; choose({ type: "node", id: n.id }); } }, dot(ctrl.nodeColor(n)), n.name)) : [h("span", null, "찾는 인물이 없어요.")]));
    qres.hidden = false;
  });
  let facWrap = null, facBtns = [];
  function syncFac() { facBtns.forEach(([f, b]) => b.setAttribute("aria-pressed", f === ctrlFaction ? "true" : "false")); }
  let ctrlFaction = "";
  function buildFilters() {
    if (!adv) return;
    facWrap?.remove();
    facBtns = [];
    if (ctrl.factions.length) {
      facWrap = h("div", { class: "rb-rm-fchips" });
      for (const f of ["", ...ctrl.factions]) { const b = chip(f || "전체", { pressed: f === ctrlFaction, onClick: () => { ctrlFaction = f; ctrl.setFaction(f); syncFac(); curSel = ctrl.nodeById(curSel?.id) || curSel?.type !== "node" ? curSel : null; paint(); } }); facBtns.push([f, b]); facWrap.append(b); }
      filters.append(facWrap);
    }
  }
  if (adv) {
    const lbl = h("b", null, "전체");
    const range = h("input", { type: "range", min: "0", max: "80", step: "10", value: "0", "aria-label": "약한 관계 숨기기", onInput: () => { const v = +range.value; ctrl.setMinStrength(v); lbl.textContent = v ? `${v} 미만 숨김` : "전체"; } });
    filters.append(h("label", { class: "rb-rm-range" }, "약한 관계 숨기기", range, lbl));
  }
  buildFilters();
  paint();

  // 새 데이터가 있을 때만 다시 그림 (화면 유지 중 백그라운드 갱신)
  let sig = sigOf(data);
  function update(next) {
    if (next.empty || sigOf(next) === sig) return;
    sig = sigOf(next); data0 = next;
    if (eroOn) { applyEro(); return; }
    const keep = curSel?.type === "node" ? curSel.id : "";
    ctrl.setData(next); buildFilters();
    curSel = keep && ctrl.nodeById(keep) ? { type: "node", id: keep } : null;
    ctrl.select(curSel); paint();
  }
  void data0;
  const dispose = () => { nameWatch?.disconnect?.(); ctrl.destroy(); clearTimeout(toastT); win.document.removeEventListener("pointerdown", onDoc); win.document.removeEventListener("keydown", onKey, true); };
  // Erosync 화면의 ‘관계망’ 탭에서 넘어왔을 때: 자동으로 Erosync 층 켜기
  const ero = () => { if (!eroOn && eroBtn) eroBtn.click(); };
  return { key, root, ctrl, update, dispose, ero };
}
