// 홈 (v1.7.0 6단계): 지금 열린 채팅 → 상태 3줄(기억·리수폿·인물) → 바로 하기 9칸. PC는 오른쪽에 최근 기록 3개.
import { maybePromptIntro } from './promptstab.js';
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, statusCard } from '../kit.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { openTour } from '../tour.js';
import { injectLine } from '../../engine/memoryusage.js';
import { injectReasonText } from '../../engine/memoryinject.js';
import { mem } from './memory/common.js';
import { createBotAndEdit } from './newbot.js';

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
    s.M ? btn("바꾸기", { size: "sm", icon: "list", onClick: () => { mem(ctx).page = "bots"; ctx.go("memory"); } }) : null
  );

  // ── 상태 3줄 ──
  const line = (tab, label, status) => h("div", { class: "rb-hstat" }, h("button", { type: "button", class: "lab", onClick: () => ctx.go(tab) }, h("b", null, label), icon("chevron", 14)), status);
  let rows;
  if (!s.cur) {
    const none = statusCard("off", "채팅을 열면 여기에 보여요.");
    rows = [line("memory", "기억", none), line("pot", "리수폿", statusCard("off", "채팅을 열면 여기에 보여요.")), line("people", "인물", statusCard("off", "채팅을 열면 여기에 보여요."))];
  } else {
    const { sw, idx, folder, last, trackOn } = s;
    const docs = Object.values(folder?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
    const memOn = sw.memory.on, potOn = sw.pot.on;
    const turnOn = async (kind) => {
      try {
        await (kind === "memory" ? s.M.switches.setMemory(s.cur.chaId, true) : s.M.switches.setPot(s.cur.chaId, true));
        maybePromptIntro(ctx);
        ctx.toast(kind === "memory" ? "이 채팅에서 기억을 켰어요." : "이 채팅에서 리수폿을 켰어요.");
      } catch (e) {
        ctx.toast(e?.message ?? String(e), { error: true });
      }
      redraw();
    };
    const memStatus = !memOn ? statusCard("off", "이 채팅에서는 꺼져 있어요.", { label: "켜기", kind: "primary", onClick: () => turnOn("memory") })
      : idx.bots?.[s.cur.chaId]?.paused ? statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.")
      : statusCard(last?.injected ? "on" : "prep", injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason)));
    const wikiAt = folder?.wiki?.automation?.lastStatus?.at;
    const potStatus = !potOn ? statusCard("off", "이 채팅에서는 꺼져 있어요.", { label: "켜기", kind: "primary", onClick: () => turnOn("pot") })
      : statusCard(docs.length ? "on" : "prep", `위키 문서 ${docs.length}개 · 자동 기록 ${trackOn ? "켬" : "끔"}${wikiAt ? "" : ""}`);
    const pplStatus = !potOn ? statusCard("off", "리수폿을 켜면 인물이 쌓여요.")
      : !trackOn ? statusCard("off", "자동 추적이 꺼져 있어요.", { label: "켜기", kind: "primary", onClick: async () => { try { await s.M.flow.settings().then((st) => st.update((x) => { x.autoWriterEnabled = true; })); } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); } redraw(); } })
      : statusCard(docs.length ? "on" : "prep", docs.length ? `인물 ${docs.length}명을 추적해요.` : "아직 인물이 없어요.");
    rows = [line("memory", "기억", memStatus), line("pot", "리수폿", potStatus), line("people", "인물", pplStatus)];
  }
  const status = h("section", { class: "rb-hstats", "aria-label": "지금 상태" }, ...rows);

  // ── 바로 하기 9칸 ──
  const tile = (ic, name, line2, onClick, id, cnt) => h(
    "button",
    { type: "button", class: "rb-htile", onClick, id },
    h("span", { class: "ico" }, icon(ic, 22)),
    h("span", { class: "t" }, h("b", null, name), line2 ? h("small", null, line2) : null),
    cnt ? h("span", { class: "cnt" }, String(cnt)) : null
  );
  const grid = h(
    "section",
    { class: "rb-hdo", "aria-label": "바로 하기" },
    h("h2", null, "바로 하기"),
    h(
      "div",
      { class: "rb-hgrid" },
      tile("character", "캐릭터", "정리·편집", () => ctx.go("characters"), "rb-home-characters"),
      tile("module", "모듈", "켜기·연결", () => ctx.go("modules"), "rb-home-modules"),
      tile("sparkle", "기억 카드", "카드로 이어가기", () => ctx.go("cards"), "rb-home-cards"),
      tile("sparkle", "AI로 봇 만들기", "말로 만들기", () => createBotAndEdit(ctx, { tab: "ai" }), "rb-home-aibot"),
      tile("upload", "가져오기", "파일 가져오기", () => ctx.legacy.open(), "rb-home-import"),
      tile("brain", "지난 대화 분석", s.cur ? (s.todo ? `미처리 ${s.todo}개` : "다 분석했어요") : "채팅을 열어 주세요", () => ctx.go("memory"), "rb-home-analyze", s.todo || 0),
      tile("palette", "꾸미기", "색·글자·테마", () => ctx.go("look"), "rb-home-look"),
      tile("tools", "도구", "프리셋·백업", () => ctx.go("tools"), "rb-home-tools"),
      tile("plugin", "플러그인", "목록·업데이트", () => ctx.go("plugins"), "rb-home-plugins")
    )
  );

  // ── 최근 기록 (PC 오른쪽) ──
  const rec = s.cur ? recentOf(s.folder) : [];
  const recent = h(
    "aside",
    { class: "rb-hrecent", "aria-label": "최근 기록" },
    h("h2", null, "최근 기록"),
    rec.length ? h("div", { class: "rb-card" }, ...rec.map((r) => h("div", { class: "rb-kv rb-hrec" }, h("span", null, h("b", null, r.who ?? ""), h("br"), h("small", { class: "rb-muted" }, r.act ?? "")), h("small", { class: "rb-muted" }, hhmm(r.ms))))) : h("div", { class: "rb-muted rb-hrec-empty" }, "아직 쌓인 기록이 없어요."),
    rec.length ? btn("전체 보기", { size: "sm", onClick: () => { mem(ctx).page = "detail"; ctx.go("memory"); } }) : null
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
  replace(host, head, notice, h("div", { class: "rb-hbody" }, h("div", { class: "rb-hmain" }, status, grid), recent), foot);
}
