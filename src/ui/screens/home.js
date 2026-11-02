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
import { loadFairOn, loadDiceOn, DICE_KEY } from '../../data/fairplay.js';
import { diceRow } from '../dicedetail.js';
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
  replace(host, loading("불러오는 중", { rows: 3 }));   // 읽는 동안 빈 화면 대신 바로 보이게
  const storyStatePromise = Promise.all([
    loadFairOn(ctx.api).catch(() => false),
    loadDiceOn(ctx.api).catch(() => false),
    loadStoryTimeOn(ctx.api).catch(() => false)
  ]);
  let s = { M: null };
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
    replace(status, line(memoryStatus));
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
      tile("tools", "작업실", "플러그인 꾸미기·AI 봇 제작·도구", () => ctx.go("work-home"), "rb-home-work")
    )
  );

  // ── 최근 기록 (PC 오른쪽) ──
  const rec = s.cur ? recentOf(s.folder) : [];
  const [fairOn, diceOn, stOn] = await storyStatePromise;
  const failStory = (e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
  // 유저 편향 없애기는 공정한 전개 위에서만 작동 → 공정한 전개가 꺼져 있으면 함께 켜고 이유를 알린다
  let fairCur = !!fairOn, fairSw = null;
  const setFair = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.set(v);
      else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", v ? "on" : "off");
      fairCur = !!v;
      ctx.toast(v ? "공정한 전개를 켰어요. 다음 요청부터 적용돼요." : "공정한 전개를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setDice = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.setDice(v);
      else await ctx.api.pluginStorage.setItem(DICE_KEY, v ? "on" : "off");
      if (v && !fairCur) {
        if (ctx.fairPlay) await ctx.fairPlay.set(true);
        else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", "on");
        fairCur = true; if (fairSw) setSwitch(fairSw, true);
        ctx.toast("유저 편향 없애기를 켰어요. 공정한 전개 위에서 작동해서 공정한 전개도 함께 켰어요.");
      } else ctx.toast(v ? "유저 편향 없애기를 켰어요. 다음 요청부터 적용돼요." : "유저 편향 없애기를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setImgFix = async (v) => {
    try {
      if (!ctx.imgFix) throw new Error("이 환경에서는 쓸 수 없어요.");
      await ctx.imgFix.set(v);
      ctx.toast(v ? "이미지 태그 교정을 켰어요. 다음 응답부터 적용돼요." : "이미지 태그 교정을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setImgHint = async (v) => {
    try {
      if (!ctx.imgFix) throw new Error("이 환경에서는 쓸 수 없어요.");
      await ctx.imgFix.setHint(v);
      ctx.toast(v ? "이미지 태그 알림을 켰어요. 다음 요청부터 적용돼요." : "이미지 태그 알림을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setStory = async (v) => {
    try {
      if (ctx.storyTime) await ctx.storyTime.set(v);
      else await ctx.api.pluginStorage.setItem("dusk.ui.storyTime", v ? "on" : "off");
      ctx.toast(v ? "이야기 시간 삽입을 켰어요. 다음 요청부터 적용돼요." : "이야기 시간 삽입을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const storyRow = (title, text, on, onChange) => h("div", { class: "rb-srow" },
    h("span", { class: "t" }, title, h("small", null, text)),
    switchEl(on, { label: title, onChange: (v, el) => {
      el.setAttribute("aria-checked", v ? "true" : "false");
      onChange(v);
    } })
  );
  const storyHelper = h("section", { class: "rb-card bordered rb-story-helper" },
    (() => { const row = storyRow("공정한 전개", "내 뜻대로만 흐르지 않게 해요.", fairOn, setFair); fairSw = row.querySelector("[role=switch]"); return row; })(),
    diceRow(ctx, { on: diceOn, setOn: setDice, fail: failStory }),
    storyRow("이야기 시간 자동 삽입", "이야기 속 시각을 AI에게 알려줘요.", stOn, setStory),
    ctx.imgFix ? storyRow("이미지 태그 자동 교정", "AI가 틀리게 쓴 에셋 이미지 태그를 이 봇의 실제 에셋 이름으로 고쳐요.", ctx.imgFix.isOn(), setImgFix) : null,
    ctx.imgFix ? storyRow("이미지 태그 상황 알림", "직전 옷·동작과 쓸 수 있는 태그를 AI에게 다시 알려줘요.", ctx.imgFix.isHintOn(), setImgHint) : null
  );
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
    storyHelper
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
  const tourLink = h("div", { class: "rb-home-tourrow" }, h("button", { type: "button", class: "rb-btn ghost sm", id: "rb-home-tour", onClick: () => openTour(ctx) }, icon("help", 14), "처음 둘러보기"));
  replace(host, head, h("div", { class: "rb-hbody" }, h("div", { class: "rb-hmain" }, status, grid, cont, tourLink), recent));
}
