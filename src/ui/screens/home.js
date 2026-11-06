// 홈 (1.8.3 목업 1): 지금 열린 채팅 → 상태 카드(스위치·숫자) → 바로가기 작은 4칸 → 이어서 하기 → 처음 둘러보기.
// 오른쪽(PC)·아래(모바일): 최근 기록 → 빠른 설정(토글 5개).
import { maybePromptIntro } from './promptstab.js';
import { readState } from "./homestate.js";
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, statusCard, switchEl, setSwitch, loading } from '../kit.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { openTour } from '../tour.js';
import { injectLine, usageOf } from '../../engine/memoryusage.js';
import { openItems } from '../../engine/memoryplus.js';
import { memoryGlobalOn } from '../../engine/memoryswitch.js';
import { injectReasonText } from '../../engine/memoryinject.js';
import { mem } from './memory/common.js';
import { createBotAndEdit } from './newbot.js';
import { quickSettingsCard } from '../quickset.js';
import { loadStoryTimeOn } from '../../data/storytime.js';

var hhmm = (ms) => ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
var recentOf = (folder, n = 3) => {
  const rows = [];
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan) rows.push({ who: p.name, ms: r.at_ms ?? 0, act: r.act, g: r.g });
  return rows.sort((a, b) => b.ms - a.ms).slice(0, n);
};

export async function renderHome(ctx) {
  const dev = !!ctx.prefs.ui?.devMode;
  const host = h("div", { class: "rb-home rb-home2 rb-home3 rb-scroll" });
  replace(ctx.main, host);
  // 1.8.3: 모양(머리·상태 칸·바로가기·이어서·최근·빠른 설정)을 먼저 그리고, 읽은 정보만 칸 안에 나중에 채운다.
  // 바로가기·처음 둘러보기는 읽기와 무관해서 처음부터 눌러 쓸 수 있다.
  const bar = (w, hgt = 14) => h("i", { class: "rb-skel", style: `display:block;height:${hgt}px;width:${w}`, "aria-hidden": "true" });
  // 홈 바로가기: 가져오기 → 기억 → 관리 → 작업실.
  const tile = (ic, name, line2, onClick, id) => h(
    "button",
    { type: "button", class: "rb-htile", onClick, id },
    h("span", { class: "ico" }, icon(ic, 22)),
    h("span", { class: "t" }, h("b", null, name), line2 ? h("small", null, line2) : null)
  );
  const grid = h(
    "section",
    { class: "rb-hdo rb-hdo-sm", "aria-label": "바로가기" },
    h("h2", null, "바로가기"),
    h("div", { class: "rb-hgrid" },
      tile("upload", "가져오기", "봇·모듈·파일 가져오기", () => ctx.legacy.open(), "rb-home-import"),
      tile("brain", "기억", "장기 기억·기억 카드·코코아", () => ctx.go("memory-home"), "rb-home-memory"),
      tile("module", "관리", "캐릭터·모듈·플러그인", () => ctx.go("manage-home"), "rb-home-manage"),
      tile("tools", "작업실", "프로바이더·AI 봇 제작·도구", () => ctx.go("work-home"), "rb-home-work")
    )
  );

  const tourLink = h("div", { class: "rb-home-tourrow" }, h("button", { type: "button", class: "rb-btn ghost sm", id: "rb-home-tour", onClick: () => openTour(ctx) }, icon("help", 14), "처음 둘러보기"));
  const headEl = h("div", { class: "rb-hhead", "aria-busy": "true" }, h("div", { class: "t" }, h("small", null, "지금 열린 채팅"), h("h1", null, bar("min(240px,60%)", 22))));
  const statusEl = h("section", { class: "rb-hstats rb-card bordered", "aria-label": "장기 기억 상태", "aria-busy": "true" }, h("div", { style: "display:flex;flex-direction:column;gap:10px;padding:4px 2px" }, bar("70%"), bar("45%", 12)));
  const contEl = h("section", { class: "rb-hcont", "aria-label": "이어서 하기" }, h("h2", null, "이어서 하기"), h("div", { class: "rb-chips" }, h("button", { type: "button", class: "rb-chip rb-hcont-chip", onClick: () => ctx.legacy.open() }, "봇·모듈 가져오기")));
  const qsHold = h("div", { class: "rb-card bordered", style: "width:100%;padding:12px 14px", "aria-busy": "true" }, bar("80%"));
  const recentEl = h("aside", { class: "rb-hrecent", "aria-label": "최근 기록" }, h("div", { class: "rb-hrec-head" }, h("h2", null, "최근 기록")), h("div", { class: "rb-card bordered", style: "width:100%;padding:12px 14px", "aria-busy": "true" }, bar("85%"), h("div", { style: "height:8px" }), bar("55%", 12)), h("h2", null, "빠른 설정"), qsHold);
  replace(host, headEl, h("div", { class: "rb-hbody" }, h("div", { class: "rb-hmain" }, statusEl, grid, contEl, tourLink), recentEl));
  // 읽은 뒤: 새로 만든 칸의 내용물만 옮겨 담는다(바로가기 등은 그대로 두어 깜빡이지 않는다)
  const adopt = (box, el) => { for (const a of [...el.attributes]) box.setAttribute(a.name, a.value); box.removeAttribute("aria-busy"); replace(box, ...Array.from(el.childNodes)); };
  let s = { M: null };
  const qsP = quickSettingsCard(ctx);   // 빠른 설정 읽기도 열린 채팅 읽기와 동시에 시작한다(v1.8.3, 홈 속도)
  qsP.catch(() => {});
  try {
    s = await readState(ctx);
  } catch {
  }
  const redraw = () => renderHome(ctx);
  const refreshStatus = async () => {
    try { s = await readState(ctx); } catch { /* keep last state */ }
    // '모든 채팅' 스위치는 다시 그릴 때 새로 만들므로 저장된 최신 값으로 다시 읽는다(예전 값으로 그리면 눌러도 되돌아감)
    if (globalOn !== null) { try { globalOn = memoryGlobalOn(s.idx ?? await s.M.store.getIndex()); } catch { /* keep last value */ } }
    if (!s.cur) memoryStatus = statusCard("off", "채팅을 열면 여기에 기억 상태가 보여요.");
    else {
      const { sw, idx, last } = s;
      memoryStatus = !sw?.memory?.on ? statusCard("off", sw?.memory?.reason === "global-off" ? "모든 채팅에서 꺼져 있어요." : "이 채팅에서는 꺼져 있어요.")
        : idx?.bots?.[s.cur.chaId]?.paused ? statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.")
        : statusCard(last?.injected ? "on" : "prep", injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason)));
    }
    replace(statusEl, line(memoryStatus));
  };

  // ── 머리: 지금 열린 채팅 ──
  const head = h(
    "div",
    { class: "rb-hhead" },
    h("div", { class: "t" }, h("small", null, "지금 열린 채팅"), h("h1", null, s.cur ? [s.cur.botName || "이름 없는 봇", s.cur.chatName ? ` · ${s.cur.chatName}` : ""].join("") : "열린 채팅이 없어요")),
    null
  );

  // ── 상태 3줄 ──
  // 장기 기억 전체 스위치: 모든 채팅에서 기록·불러오기를 한 번에 켜고 끈다(쌓인 기억·봇별 설정은 그대로)
  let globalOn = null;
  if (s.M?.switches) { try { globalOn = memoryGlobalOn(s.idx ?? await s.M.store.getIndex()); } catch { globalOn = null; } }
  const setMemAll = async (v, el) => {
    el?.setAttribute("aria-checked", v ? "true" : "false");
    try {
      await s.M.switches.setMemoryEverywhere(v);
      ctx.toast(v ? "모든 채팅에서 장기 기억을 켰어요. 다음 응답부터 기록돼요." : "모든 채팅에서 장기 기억을 껐어요. 쌓인 기억은 그대로예요.");
    } catch (e) { ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
    refreshStatus();
  };
  // 상태 줄 오른쪽 끝에 붙이는 스위치(줄을 다시 그릴 때마다 새로 만든다)
  const withAll = (card) => { if (globalOn !== null) card.append(h("span", { class: "rb-hall", title: "모든 채팅에서 사용" }, switchEl(globalOn, { label: "장기 기억 (모든 채팅)", onChange: (v, el) => setMemAll(v, el) }))); return card; };
  const line = (status) => h("div", { class: "rb-hstat rb-hstat-memory", role: "button", tabindex: "0", onClick: (e) => { if (e.target.closest("button")) return; ctx.go("memory"); }, onKeydown: (e) => { if (e.target.closest("button,[role=switch]")) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ctx.go("memory"); } } }, h("span", { class: "lab" }, h("b", null, "장기 기억"), icon("chevron", 14)), withAll(status));
  let memoryStatus;
  if (!s.cur) memoryStatus = statusCard("off", "채팅을 열면 여기에 기억 상태가 보여요.");
  else {
    const { sw, idx, last } = s;
    const memOn = sw.memory.on;
    const turnOn = async () => {
      try {
        await s.M.switches.setMemory(s.cur.chaId, true);
        maybePromptIntro(ctx);
        ctx.toast("이 채팅에서 기억을 켰어요.");
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
      refreshStatus();
    };
    memoryStatus = !memOn ? statusCard("off", sw.memory.reason === "global-off" ? "모든 채팅에서 꺼져 있어요." : "이 채팅에서는 꺼져 있어요.")
      : idx.bots?.[s.cur.chaId]?.paused ? statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.")
      : statusCard(last?.injected ? "on" : "prep", injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason)));
  }
  const people = Object.entries(s.folder?.people ?? {}).filter(([, p]) => !p.orphan);
  const nums = s.cur ? [
    ["저장된 기억", usageOf(s.folder).total, ""],
    ["이번에 넣음", s.last?.injected ? s.last.manifest?.recordIds?.length ?? 0 : 0, ""],
    ["인물", people.length, ""],
    ["확인할 것", (() => { try { return openItems(s.folder ?? {}).length; } catch { return 0; } })(), "pc"]
  ] : [];
  const numRow = nums.length ? h("div", { class: "rb-hnums", "aria-label": "기억 숫자" }, nums.map(([lab, n, only]) => h("div", { class: ["rb-hnum", only && `only-${only}`] }, h("b", null, String(n)), h("small", null, lab)))) : null;
  const status = h("section", { class: "rb-hstats rb-card bordered", "aria-label": "장기 기억 상태" }, line(memoryStatus), numRow);

  // ── 최근 기록 (PC 오른쪽) ──
  const rec = s.cur ? recentOf(s.folder) : [];
  // 기억 '기록 보기'(인물 위키)로 바로 가기. 사람 이름을 주면 그 사람 문서를 연다.
  const openWiki = (name) => {
    const m = mem(ctx);
    m.botId = s.cur?.chaId ?? m.botId; m.chatIndex = s.cur?.ti ?? m.chatIndex; m.tab = "people";
    m.personKey = name ? (people.find(([, p]) => p.name === name)?.[0] ?? "") : ""; m.page = "detail";
    ctx.go("memory");
  };
  const openMemHome = () => { mem(ctx).page = "home"; ctx.go("memory"); };
  const whoRecent = [...new Set(recentOf(s.folder, 12).map((r) => r.who).filter(Boolean))].slice(0, 2);
  const chip = (label, onClick, id) => h("button", { type: "button", class: "rb-chip rb-hcont-chip", onClick, id }, label);
  const cont = h("section", { class: "rb-hcont", "aria-label": "이어서 하기" }, h("h2", null, "이어서 하기"), h("div", { class: "rb-chips" },
    ...whoRecent.map((n) => chip(`${n} 인물 위키`, () => openWiki(n))),
    s.cur && s.M ? chip("지난 대화 분석", openMemHome, "rb-home-analyze") : null,
    chip("봇·모듈 가져오기", () => ctx.legacy.open(), "rb-home-import2")));
  const recent = h(
    "aside",
    { class: "rb-hrecent", "aria-label": "최근 기록" },
    h("div", { class: "rb-hrec-head" }, h("h2", null, "최근 기록"), rec.length ? h("button", { type: "button", class: "rb-textlink", id: "rb-home-recall", onClick: () => openWiki("") }, "전체 보기") : null),
    rec.length ? h("div", { class: "rb-card bordered" }, ...rec.map((r) => h("div", { class: "rb-kv rb-hrec" }, h("span", null, h("b", null, r.who ?? ""), " ", h("span", { class: "rb-muted" }, r.act ?? "")), h("small", { class: "rb-muted" }, hhmm(r.ms))))) : h("div", { class: "rb-muted rb-hrec-empty" }, "아직 쌓인 기록이 없어요."),
    h("h2", null, "빠른 설정"),
    qsHold
  );

  const foot = h(
    "div",
    { class: "rb-home-foot" },
    h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => ctx.go("settings") }, icon("sliders", 14), "설정"),
    h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => openTour(ctx) }, icon("help", 14), "처음 둘러보기"),
    h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록") }, icon("history", 14), `v${ctx.version} · 새로 바뀐 점`)
  );
  void dev;
  // 처음 한 번: 화면이 간단해졌다는 안내(숨은 세부 설정이 어디 있는지). 간단 모드이고, 둘러보기를 마친 사람에게만.
  const noteDone = async () => {
    try {
      await ctx.prefs.saveUi({ simpleNoticeDone: true });
    } catch {
    }
  };
  const notice = !ctx.prefs.advanced && ctx.prefs.ui?.tourDone && !ctx.prefs.ui?.simpleNoticeDone ? h(
    "div",
    { class: "rb-simple-note", id: "rb-simple-note", role: "note" },
    icon("info", 20),
    h(
      "div",
      { class: "t" },
      h("b", null, "필요한 것만 먼저 보여 드려요"),
      h("span", null, "예전 세부 설정은 그대로 있어요. 설정 → 화면 모드 → 고급에서 볼 수 있어요."),
      h(
        "div",
        { class: "acts" },
        btn("고급 모드로 보기", { size: "sm", onClick: async () => { await noteDone(); ctx.setUiMode("advanced"); } }),
        btn("알겠어요", { size: "sm", kind: "ghost", onClick: async () => { await noteDone(); redraw(); } })
      )
    )
  ) : null;
  adopt(headEl, head); adopt(statusEl, status); adopt(contEl, cont); adopt(recentEl, recent);
  // 빠른 설정은 읽기가 끝나는 대로 자리에 채운다(실패하면 빈 칸 대신 안내)
  qsP.then((card) => { qsHold.replaceWith(card); }, () => { qsHold.replaceChildren(h("span", { class: "rb-muted" }, "빠른 설정을 읽지 못했어요.")); qsHold.removeAttribute("aria-busy"); });
}
