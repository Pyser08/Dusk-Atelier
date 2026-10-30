// 홈: 지금 열린 채팅 → 기억 상태 → 바로 하기 9칸. PC는 오른쪽에 최근 기록 3개.
import { maybePromptIntro } from './promptstab.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, statusCard, switchEl } from '../kit.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { openTour } from '../tour.js';
import { injectLine } from '../../engine/memoryusage.js';
import { injectReasonText } from '../../engine/memoryinject.js';
import { mem } from './memory/common.js';
import { createBotAndEdit } from './newbot.js';
import { loadFairOn, loadDiceOn, DICE_KEY } from '../../data/fairplay.js';
import { loadStoryTimeOn } from '../../data/storytime.js';

var hhmm = (ms) => ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
var recentOf = (folder, n = 3) => {
  const rows = [];
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan) rows.push({ who: p.name, ms: r.at_ms ?? 0, act: r.act, g: r.g });
  return rows.sort((a, b) => b.ms - a.ms).slice(0, n);
};

// 열린 채팅의 상태를 한 번에 읽는다. 기억 기능이 없거나 채팅이 없으면 null 칸.
async function readState(ctx) {
  const M = ctx.memory;
  if (!M?.switches) return { M: null };
  const cur = await M.switches.currentChat();
  if (!cur) return { M, cur: null };
  const [sw, idx, folder, chat] = await Promise.all([
    M.switches.state(cur.chaId),
    M.store.getIndex(),
    M.store.getFolder(cur.chaId, cur.chatId).catch(() => null),
    ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null)
  ]);
  const caps = M.capabilities(M.backend(idx.settings).id), msgs = chat?.message ?? [];
  let todo = 0;
  try {
    const plan = caps.analyze && M.runner ? M.runner.planBackfill(msgs, { from: 0, to: Math.max(0, msgs.length - 1) }, folder) : null;
    todo = plan?.todo ?? 0;
  } catch {
  }
  let trackOn = true;
  try {
    trackOn = (await M.flow?.settings?.())?.rawSnapshot?.().autoWriterEnabled !== false;
  } catch {
  }
  return { M, cur, sw, idx, folder, todo, trackOn, last: M.injector?.lastRequest?.() ?? null };
}

export async function renderHome(ctx) {
  const dev = !!ctx.prefs.ui?.devMode;
  const host = h("div", { class: "rb-home rb-home2 rb-scroll" });
  replace(ctx.main, host);
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

  // ── 머리: 지금 열린 채팅 ──
  const head = h(
    "div",
    { class: "rb-hhead" },
    h("div", { class: "t" }, h("small", null, "지금 열린 채팅"), h("h1", null, s.cur ? [s.cur.botName || "이름 없는 봇", s.cur.chatName ? ` · ${s.cur.chatName}` : ""].join("") : "열린 채팅이 없어요")),
    null
  );

  // ── 상태 3줄 ──
  const line = (status) => h("div", { class: "rb-hstat rb-hstat-memory", role: "button", tabindex: "0", onClick: (e) => { if (e.target.closest("button")) return; ctx.go("memory"); }, onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ctx.go("memory"); } } }, h("span", { class: "lab" }, h("b", null, "장기 기억"), icon("chevron", 14)), status);
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
      redraw();
    };
    memoryStatus = !memOn ? statusCard("off", "이 채팅에서는 꺼져 있어요.")
      : idx.bots?.[s.cur.chaId]?.paused ? statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.")
      : statusCard(last?.injected ? "on" : "prep", injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason)));
  }
  const status = h("section", { class: "rb-hstats", "aria-label": "장기 기억 상태" }, line(memoryStatus));

  // 홈 바로가기: 가져오기 → 기억 → 관리 → 작업실.
  const tile = (ic, name, line2, onClick, id) => h(
    "button",
    { type: "button", class: "rb-htile", onClick, id },
    h("span", { class: "ico" }, icon(ic, 22)),
    h("span", { class: "t" }, h("b", null, name), line2 ? h("small", null, line2) : null)
  );
  const grid = h(
    "section",
    { class: "rb-hdo", "aria-label": "바로가기" },
    h("h2", null, "바로가기"),
    h("div", { class: "rb-hgrid" },
      tile("upload", "가져오기", "봇·모듈·파일 가져오기", () => ctx.legacy.open(), "rb-home-import"),
      tile("brain", "기억", "장기 기억·기억 카드", () => ctx.go("memory-home"), "rb-home-memory"),
      tile("module", "관리", "캐릭터·모듈·플러그인", () => ctx.go("manage-home"), "rb-home-manage"),
      tile("tools", "작업실", "꾸미기·AI 봇 제작·도구", () => ctx.go("work-home"), "rb-home-work")
    )
  );

  // ── 최근 기록 (PC 오른쪽) ──
  const rec = s.cur ? recentOf(s.folder) : [];
  const [fairOn, diceOn, stOn] = await storyStatePromise;
  const failStory = (e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
  const setFair = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.set(v);
      else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", v ? "on" : "off");
      ctx.toast(v ? "공정한 전개를 켰어요. 다음 요청부터 적용돼요." : "공정한 전개를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setDice = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.setDice(v);
      else await ctx.api.pluginStorage.setItem(DICE_KEY, v ? "on" : "off");
      ctx.toast(v ? "유저 편향 없애기를 켰어요. 공정한 전개가 켜져 있을 때 다음 요청부터 적용돼요." : "유저 편향 없애기를 껐어요.");
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
    h("span", { class: "h" }, "이야기 도우미"),
    storyRow("공정한 전개", "내 뜻대로만 흐르지 않게 해요.", fairOn, setFair),
    storyRow("유저 편향 없애기", "캐릭터가 나만 편들지 않게 해요.", diceOn, setDice),
    storyRow("이야기 시간 자동 삽입", "이야기 속 시각을 AI에게 알려줘요.", stOn, setStory)
  );
  const recent = h(
    "aside",
    { class: "rb-hrecent", "aria-label": "최근 기록" },
    h("h2", null, "최근 기록"),
    rec.length ? h("div", { class: "rb-card" }, ...rec.map((r) => h("div", { class: "rb-kv rb-hrec" }, h("span", null, h("b", null, r.who ?? ""), h("br"), h("small", { class: "rb-muted" }, r.act ?? "")), h("small", { class: "rb-muted" }, hhmm(r.ms))))) : h("div", { class: "rb-muted rb-hrec-empty" }, "아직 쌓인 기록이 없어요."),
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
  replace(host, head, h("div", { class: "rb-hbody" }, h("div", { class: "rb-hmain" }, status, grid), recent));
}
