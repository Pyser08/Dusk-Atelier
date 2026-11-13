// 홈 (2.2.0 F안): 포커스 머리(지금 열린 채팅·장기 기억 줄·찾기 칸·홈 꾸미기) → 위젯 격자 → 처음 둘러보기.
// 위젯 = 바로가기 4 · 숫자 4 · 최근 기록 · 빠른 설정 · 이어서 하기 · 추천 · 애드온. 배치는 prefs.ui.homeGrid[칸 수].
// 위젯 안 요소의 클래스·id(rb-htile·rb-hnum·rb-hrecent·rb-hcont·rb-home-*)는 예전 그대로(둘러보기·e2e가 씀).
import { renderFeatureFind } from "./featurefind.js";
import { readState } from "./homestate.js";
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, statusCard, switchEl } from '../kit.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { openTour } from '../tour.js';
import { injectLine, usageOf } from '../../engine/memoryusage.js';
import { openItems } from '../../engine/memoryplus.js';
import { memoryGlobalOn } from '../../engine/memoryswitch.js';
import { injectReasonText } from '../../engine/memoryinject.js';
import { mem } from './memory/common.js';
import { discoverCard } from '../discovercard.js';
import { TABS, tabHidden } from '../tabs.js';
import { quickSettingsCard } from '../quickset.js';
import { addonBox } from './addonsui.js';
import { homeGrid } from './homegridui.js';
const sectionLive = (ctx, section) => TABS.some((t) => t.section === section && !t.mobileOnly && !tabHidden(t, ctx.prefs.ui));

var hhmm = (ms) => ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
var recentOf = (folder, n = 3) => {
  const rows = [];
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan) rows.push({ who: p.name, ms: r.at_ms ?? 0, act: r.act, g: r.g });
  return rows.sort((a, b) => b.ms - a.ms).slice(0, n);
};
const bar = (w, hgt = 14) => h("i", { class: "rb-skel", style: `display:block;height:${hgt}px;width:${w}`, "aria-hidden": "true" });

export async function renderHome(ctx) {
  const host = h("div", { class: "rb-home rb-home4 rb-scroll" });
  replace(ctx.main, host);
  // 기능 찾기: 위 검색창에 낱말을 적으면 홈 대신 찾은 기능 목록을 보여 준다(지우면 홈으로).
  if (String(ctx.state.search ?? "").trim()) return renderFeatureFind(ctx, host, ctx.state.search);
  const redraw = () => renderHome(ctx);

  // ── 위젯: 모양을 먼저 만들고 읽은 정보는 나중에 채운다(바로가기는 처음부터 누를 수 있음) ──
  const tile = (ic, name, line2, onClick, id, tone) => h("button", { type: "button", class: `rb-htile tone-${tone}`, onClick, id },
    h("span", { class: "ico" }, icon(ic, 22)), h("span", { class: "t" }, h("b", null, name), h("small", null, line2)));
  const numEl = (lab) => { const b = h("b", null, "–"); return { el: h("div", { class: "rb-hnum" }, b, h("small", null, lab)), set: (n) => { b.textContent = String(n); } }; };
  const nums = { n1: numEl("저장된 기억"), n2: numEl("이번에 넣음"), n3: numEl("인물"), n4: numEl("확인할 것") };
  const recentEl = h("aside", { class: "rb-hrecent", "aria-label": "최근 기록", "aria-busy": "true" }, h("div", { class: "rb-hw-head" }, h("h2", null, "최근 기록")), bar("85%"), h("div", { style: "height:8px" }), bar("55%", 12));
  const qsEl = h("div", { class: "rb-hqs", "aria-busy": "true" }, h("div", { class: "rb-hw-head" }, h("h2", null, "빠른 설정")), bar("80%"));
  const contEl = h("section", { class: "rb-hcont", "aria-label": "이어서 하기" }, h("div", { class: "rb-hw-head" }, h("h2", null, "이어서 하기")), h("div", { class: "rb-chips" }, h("button", { type: "button", class: "rb-chip rb-hcont-chip", onClick: () => ctx.legacy.open() }, "봇·모듈 가져오기")));
  const discEl = h("div", { class: "rb-discover-slot" });
  const addEl = addonBox(ctx);
  const widgets = {
    imp: { name: "가져오기", el: tile("upload", "가져오기", "봇·모듈·파일 가져오기", () => ctx.legacy.open(), "rb-home-import", 1) },
    mem: { name: "기억", el: tile("brain", "기억", "장기 기억·기억 카드·코코아", () => ctx.go("memory-home"), "rb-home-memory", 2) },
    man: { name: "관리", el: tile("module", "관리", "캐릭터·모듈·플러그인", () => ctx.go("manage-home"), "rb-home-manage", 3) },
    wrk: { name: "작업실", el: tile("tools", "작업실", "프로바이더·AI 봇 제작·도구", () => ctx.go("work-home"), "rb-home-work", 4) },
    n1: { name: "저장된 기억", el: nums.n1.el }, n2: { name: "이번에 넣음", el: nums.n2.el }, n3: { name: "인물", el: nums.n3.el }, n4: { name: "확인할 것", el: nums.n4.el },
    rec: { name: "최근 기록", el: recentEl },
    qs: { name: "빠른 설정", el: qsEl },
    cont: { name: "이어서 하기", el: contEl },
    disc: { name: "추천", el: discEl },
    add: addEl ? { name: "애드온", autoH: true, el: h("div", { class: "rb-hadd" }, addEl) } : null   // 애드온 상자는 자기 제목·여백이 있고, 높이는 내용에 맞춘다
  };
  for (const k of Object.keys(widgets)) if (!widgets[k]) delete widgets[k];
  // 보일 수 있는 위젯: 관리 섹션이 다 숨겨지면 관리 없음, 열린 채팅이 없으면 숫자 없음, 추천이 없으면 추천 없음
  const avail = { man: sectionLive(ctx, "manage"), nums: false, disc: false };
  const availIds = () => Object.keys(widgets).filter((id) => id === "man" ? avail.man : /^n\d$/.test(id) ? avail.nums : id === "disc" ? avail.disc : true);

  const trayList = h("span", { class: "rb-htray-list" });
  const tray = h("div", { class: "rb-htray", hidden: true }, h("span", { class: "rb-htray-tip" }, "끌어서 옮기고, 오른쪽 아래 모서리로 크기를 바꿔요(키보드: 화살표 · Shift+화살표)."), h("b", null, "숨긴 위젯"), trayList, h("button", { type: "button", class: "rb-chip", id: "rb-home-gridreset", onClick: () => G.reset() }, "기본 배치로"));
  let saveT = null;
  const G = homeGrid({
    widgets,
    saved: ctx.prefs.ui?.homeGrid ?? {},
    onSave: (cols, list) => {
      const next = { ...(ctx.prefs.ui?.homeGrid ?? {}), [cols]: list };
      if (ctx.prefs.ui) ctx.prefs.ui.homeGrid = next;
      clearTimeout(saveT);
      saveT = setTimeout(() => ctx.prefs.saveUi({ homeGrid: next }).catch((e) => ctx.toast(`배치를 저장하지 못했어요: ${e?.message ?? e}`, { error: true })), 300);
    },
    onTray: (ids) => replace(trayList, ...(ids.length ? ids.map((id) => h("button", { type: "button", class: "rb-chip", dataset: { add: id }, onClick: () => G.add(id) }, `+ ${widgets[id].name}`)) : [h("span", { class: "rb-muted" }, "없음")]))
  });
  G.setAvail(availIds());
  const editBtn = h("button", { type: "button", class: "rb-hedit", id: "rb-home-edit", "aria-pressed": "false", onClick: () => {
    const on = !G.editing;
    G.setEditing(on);
    editBtn.setAttribute("aria-pressed", on ? "true" : "false");
    editBtn.textContent = on ? "다 했어요" : "홈 꾸미기";
    tray.hidden = !on;
  } }, "홈 꾸미기");

  // ── 포커스 머리 ──
  const titleEl = h("h1", null, bar("min(240px,60%)", 22));
  const headEl = h("div", { class: "rb-hhead", "aria-busy": "true" }, h("div", { class: "t" }, h("small", null, "지금 열린 채팅"), titleEl));
  const statusEl = h("section", { class: "rb-hstats", "aria-label": "장기 기억 상태", "aria-busy": "true" }, bar("min(320px,70%)"));
  const focusSearch = () => { const i = ctx.main.closest(".rb-win")?.querySelector(".rb-search input"); if (i) i.focus(); };
  const cmd = h("button", { type: "button", class: "rb-hcmd", id: "rb-home-find", onClick: focusSearch }, icon("search", 18), h("span", null, "무엇을 할까요? 기능 찾기…"), h("span", { class: "rb-kbd", "aria-hidden": "true" }, "/"));
  const notice = !ctx.prefs.advanced && ctx.prefs.ui?.tourDone && !ctx.prefs.ui?.simpleNoticeDone ? simpleNotice(ctx, redraw) : null;
  const foot = h("div", { class: "rb-home-foot" },
    h("button", { type: "button", class: "rb-btn ghost sm", id: "rb-home-tour", onClick: () => openTour(ctx) }, icon("help", 14), "처음 둘러보기"),
    h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록") }, icon("history", 14), `v${ctx.version} · 새로 바뀐 점`));
  replace(host, h("div", { class: "rb-hfocus" }, editBtn, headEl, statusEl, cmd), notice, tray, G.el, foot);
  G.draw();

  // 추천(기능 맛보기): 있으면 위젯을 보인다
  const fillDisc = () => discoverCard(ctx, { onChange: fillDisc }).then((c) => { replace(discEl, ...(c ? [c] : [])); if (avail.disc !== !!c) { avail.disc = !!c; G.setAvail(availIds()); } }).catch(() => {});
  fillDisc();
  const qsP = quickSettingsCard(ctx);   // 빠른 설정 읽기도 열린 채팅 읽기와 동시에 시작한다(v1.8.3, 홈 속도)
  qsP.then((card) => { qsEl.removeAttribute("aria-busy"); replace(qsEl, h("div", { class: "rb-hw-head" }, h("h2", null, "빠른 설정")), card); },
    () => { qsEl.removeAttribute("aria-busy"); replace(qsEl, h("div", { class: "rb-hw-head" }, h("h2", null, "빠른 설정")), h("span", { class: "rb-muted" }, "빠른 설정을 읽지 못했어요.")); });

  let s = { M: null };
  try { s = await readState(ctx); } catch { /* 열린 채팅 없음으로 그린다 */ }

  // ── 장기 기억 줄(전체 스위치 포함) ──
  let globalOn = null;
  if (s.M?.switches) { try { globalOn = memoryGlobalOn(s.idx ?? await s.M.store.getIndex()); } catch { globalOn = null; } }
  const statusOf = () => {
    if (!s.cur) return statusCard("off", "채팅을 열면 여기에 기억 상태가 보여요.");
    const { sw, idx, last } = s;
    return !sw?.memory?.on ? statusCard("off", sw?.memory?.reason === "global-off" ? "모든 채팅에서 꺼져 있어요." : "이 채팅에서는 꺼져 있어요.")
      : idx?.bots?.[s.cur.chaId]?.paused ? statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.")
      : statusCard(last?.injected ? "on" : "prep", injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason)));
  };
  const setMemAll = async (v, el) => {
    el?.setAttribute("aria-checked", v ? "true" : "false");
    try {
      await s.M.switches.setMemoryEverywhere(v);
      ctx.toast(v ? "모든 채팅에서 장기 기억을 켰어요. 다음 응답부터 기록돼요." : "모든 채팅에서 장기 기억을 껐어요. 쌓인 기억은 그대로예요.");
    } catch (e) { ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
    refreshStatus();
  };
  const withAll = (card) => { if (globalOn !== null) card.append(h("span", { class: "rb-hall", title: "모든 채팅에서 사용" }, switchEl(globalOn, { label: "장기 기억 (모든 채팅)", onChange: (v, el) => setMemAll(v, el) }))); return card; };
  const line = (status) => h("div", { class: "rb-hstat rb-hstat-memory", role: "button", tabindex: "0", onClick: (e) => { if (e.target.closest("button")) return; ctx.go("memory"); }, onKeydown: (e) => { if (e.target.closest("button,[role=switch]")) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ctx.go("memory"); } } }, h("span", { class: "lab" }, h("b", null, "장기 기억"), icon("chevron", 14)), withAll(status));
  const refreshStatus = async () => {
    try { s = await readState(ctx); } catch { /* keep last state */ }
    // '모든 채팅' 스위치는 다시 그릴 때 새로 만들므로 저장된 최신 값으로 다시 읽는다(예전 값으로 그리면 눌러도 되돌아감)
    if (globalOn !== null) { try { globalOn = memoryGlobalOn(s.idx ?? await s.M.store.getIndex()); } catch { /* keep last value */ } }
    replace(statusEl, line(statusOf()));
  };
  statusEl.removeAttribute("aria-busy");
  replace(statusEl, line(statusOf()));
  headEl.removeAttribute("aria-busy");
  replace(titleEl, s.cur ? [s.cur.botName || "이름 없는 봇", s.cur.chatName ? ` · ${s.cur.chatName}` : ""].join("") : "열린 채팅이 없어요");

  // ── 숫자 ──
  const people = Object.entries(s.folder?.people ?? {}).filter(([, p]) => !p.orphan);
  if (s.cur) {
    nums.n1.set(usageOf(s.folder).total);
    nums.n2.set(s.last?.injected ? s.last.manifest?.recordIds?.length ?? 0 : 0);
    nums.n3.set(people.length);
    nums.n4.set((() => { try { return openItems(s.folder ?? {}).length; } catch { return 0; } })());
    avail.nums = true;
  }

  // ── 최근 기록 · 이어서 하기 ──
  const openWiki = (name) => {
    const m = mem(ctx);
    m.botId = s.cur?.chaId ?? m.botId; m.chatIndex = s.cur?.ti ?? m.chatIndex; m.tab = "people";
    m.personKey = name ? (people.find(([, p]) => p.name === name)?.[0] ?? "") : ""; m.page = "detail";
    ctx.go("memory");
  };
  const openMemHome = () => { mem(ctx).page = "home"; ctx.go("memory"); };
  const rec = s.cur ? recentOf(s.folder, 8) : [];
  recentEl.removeAttribute("aria-busy");
  replace(recentEl,
    h("div", { class: "rb-hw-head" }, h("h2", null, "최근 기록"), rec.length ? h("button", { type: "button", class: "rb-textlink", id: "rb-home-recall", onClick: () => openWiki("") }, "전체 보기") : null),
    rec.length ? h("div", { class: "rb-hrec-list" }, ...rec.map((r) => h("div", { class: "rb-kv rb-hrec" }, h("i", { class: "rb-hdot", "aria-hidden": "true" }), h("span", null, h("b", null, r.who ?? ""), " ", h("span", { class: "rb-muted" }, r.act ?? "")), h("small", { class: "rb-muted" }, hhmm(r.ms))))) : h("div", { class: "rb-muted rb-hrec-empty" }, "아직 쌓인 기록이 없어요."));
  const whoRecent = [...new Set(recentOf(s.folder, 12).map((r) => r.who).filter(Boolean))].slice(0, 2);
  const chip = (label, onClick, id) => h("button", { type: "button", class: "rb-chip rb-hcont-chip", onClick, id }, label);
  replace(contEl, h("div", { class: "rb-hw-head" }, h("h2", null, "이어서 하기")), h("div", { class: "rb-chips" },
    ...whoRecent.map((n) => chip(`${n} 인물 위키`, () => openWiki(n))),
    s.cur && s.M ? chip("지난 대화 분석", openMemHome, "rb-home-analyze") : null,
    chip("봇·모듈 가져오기", () => ctx.legacy.open(), "rb-home-import2")));
  G.setAvail(availIds());
}

// 처음 한 번: 화면이 간단해졌다는 안내(숨은 세부 설정이 어디 있는지). 간단 모드이고, 둘러보기를 마친 사람에게만.
function simpleNotice(ctx, redraw) {
  const done = async () => { try { await ctx.prefs.saveUi({ simpleNoticeDone: true }); } catch { /* 다음에 다시 보임 */ } };
  return h("div", { class: "rb-simple-note", id: "rb-simple-note", role: "note" }, icon("info", 20), h("div", { class: "t" },
    h("b", null, "필요한 것만 먼저 보여 드려요"),
    h("span", null, "예전 세부 설정은 그대로 있어요. 설정 → 화면 모드 → 고급에서 볼 수 있어요."),
    h("div", { class: "acts" },
      btn("고급 모드로 보기", { size: "sm", onClick: async () => { await done(); ctx.setUiMode("advanced"); } }),
      btn("알겠어요", { size: "sm", kind: "ghost", onClick: async () => { await done(); redraw(); } }))));
}
