// 기억 화면 (1.7.0 3단계, 계획 §3.2): 머리(스위치 1) → 상태 카드 → 기록 막대 → 주요 동작 3 → 최근 기록 → 고급.
import { maybePromptIntro } from '../promptstab.js';
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { actionRow, advFold, btn, confirmDialog, emptyState, note, pageHead, progressBar, statusCard } from "../../kit.js";
import { injectReasonText } from "../../../engine/memoryinject.js";
import { USAGE_KINDS, injectLine, usageOf } from "../../../engine/memoryusage.js";
import { mem, fail, gradeBadge, at } from "./common.js";
import { renderModeBar } from "./modebar.js";
import { advancedBlocks } from "./madv.js";
import { openEmbedModal } from "./embedmodal.js";
import { maybeAskBardWiki } from "./modebar.js";

const hhmm = (ms) => new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

function recentOf(folder, n = 3) {
  const rows = [];
  for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan) rows.push({ who: p.name, ms: r.at_ms ?? 0, at: r.at, act: r.act, g: r.g });
  return rows.sort((a, b) => b.ms - a.ms).slice(0, n);
}

export function usageCard(u) {
  if (!u.total) return h("section", { class: "rb-card rb-mem-usage" }, h("b", null, "저장된 기록"), h("p", { class: "rb-muted" }, "아직 쌓인 기록이 없어요."));
  const bar = h("div", { class: "rb-mbar", role: "img", "aria-label": USAGE_KINDS.map(([k, l]) => `${l} ${u[k]}건`).join(", ") },
    USAGE_KINDS.filter(([k]) => u[k]).map(([k]) => h("i", { class: `u-${k}`, style: `flex:${u[k]}` })));
  const legend = h("ul", { class: "rb-mbar-legend" }, USAGE_KINDS.map(([k, l]) => h("li", null, h("i", { class: `u-${k}` }), `${l} ${u[k]}`)));
  return h("section", { class: "rb-card rb-mem-usage" }, h("b", null, `저장된 기록 ${u.total}건`), bar, legend);
}

export async function renderMemoryHome(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  await maybeAskBardWiki(ctx).catch(() => {});
  const modeHost = h("div");
  await renderModeBar(ctx, modeHost, { redraw });  // 간단 모드에서는 저장소를 자동으로 맞추기만 한다
  const cur = await M.switches.currentChat();
  if (!cur) {
    return replace(host, pageHead("기억"), emptyState({ icon: "brain", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 기억을 보여 줘요.",
      actions: [{ label: "다른 채팅 보기", icon: "list", onClick: () => { m.page = "bots"; redraw(); } }] }));
  }
  const [sw, idx, folder, chat] = await Promise.all([M.switches.state(cur.chaId), M.store.getIndex(), M.store.getFolder(cur.chaId, cur.chatId).catch(() => null), ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null)]);
  const caps = M.capabilities(M.backend(idx.settings).id), msgs = chat?.message ?? [];
  const botCfg = idx.bots[cur.chaId] ?? {}, last = M.injector?.lastRequest?.() ?? null;
  const on = sw.memory.on;

  const setOn = async (v) => {
    try { await M.switches.setMemory(cur.chaId, v); if (v) await M.store.updateIndex((i) => { const b = i.bots[cur.chaId]; if (b) { b.paused = false; b.fails = 0; } }); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 기억을 켰어요. 다음 응답부터 기록돼요." : "이 채팅에서 기억을 껐어요."); } catch (e) { fail(ctx)(e); }
    redraw();
  };
  // 상태 카드: 꺼짐 / 문제(연속 실패로 멈춤) / 준비 중(아직 요청 없음·안 넣음) / 사용 중
  let status;
  if (!on) status = statusCard("off", sw.memory.reason === "bot-off" ? "이 채팅에서는 꺼 두었어요." : "기억이 꺼져 있어요.", { label: "켜기", kind: "primary", onClick: () => setOn(true) });
  else if (botCfg.paused) status = statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.", { label: "다시 켜기", kind: "primary", onClick: () => setOn(true) });
  else {
    const line = injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason));
    status = statusCard(last?.injected ? "on" : "prep", line);
  }

  // 지난 대화 분석 (미처리만)
  const plan = caps.analyze && M.runner ? M.runner.planBackfill(msgs, { from: 0, to: Math.max(0, msgs.length - 1) }, folder) : null;
  const prog = h("div");
  const analyze = async () => {
    if (!plan?.todo) return ctx.toast("분석할 새 응답이 없어요.");
    const ok = await confirmDialog(ctx.win, { title: "지난 대화 분석", body: `AI 응답 ${plan.todo}개를 분석해요. 호출 ${plan.calls}회 · 대략 ${plan.tokens.toLocaleString()} 토큰이 들어요.`, ok: "분석하기" });
    if (!ok) return;
    const ctrl = new AbortController(), cancel = btn("취소", { size: "sm", onClick: () => ctrl.abort() });
    replace(prog, progressBar(0), cancel);
    try {
      const r = await M.runner.backfill(cur.ci, cur.ti, { from: 0, to: Math.max(0, msgs.length - 1) }, { signal: ctrl.signal, onProgress: (n, t, f) => replace(prog, progressBar(Math.round(n / t * 100)), h("span", { class: "rb-muted" }, `${n}/${t} · 실패 ${f}`), cancel) });
      ctx.toast(`지난 대화 분석이 끝났어요 (${r.total - r.failed.length}/${r.total}).`);
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const openDetail = () => { m.botId = cur.chaId; m.chatIndex = cur.ti; m.tab = "people"; m.personKey = ""; m.page = "detail"; redraw(); };
  const actions = actionRow([
    plan ? { label: `지난 대화 분석 · 미처리 ${plan.todo}개`, icon: "sparkle", onClick: analyze } : { label: "기록 보기", icon: "brain", onClick: openDetail },
    { label: "카드로 만들기", icon: "image", onClick: () => ctx.go("cards") },
    { label: "다른 채팅 보기", icon: "list", onClick: () => { m.page = "bots"; redraw(); } }
  ]);

  const recent = recentOf(folder);
  const recBox = h("section", { class: "rb-card rb-mem-recentbox" }, h("div", { class: "rb-mem-rechead" }, h("b", null, "최근 기록"), recent.length ? btn("전체 보기", { size: "sm", onClick: openDetail }) : null),
    h("ul", { class: "rb-mem-reclist rb-mem-recent" }, recent.length
      ? recent.map((r) => h("li", { class: "rb-mem-rec" }, gradeBadge(r.g), h("div", { class: "txt" }, h("div", null, `${r.who}: ${r.act}`), h("div", { class: "rb-muted" }, at(r.at)))))
      : h("li", { class: "rb-muted" }, "아직 쌓인 기록이 없어요.")));

  // 설정 탭의 '기억 · 리수폿' 카드. 분석 동작과 최근 기록 사이에 둔다.
  const memorySettings = h("section", { class: "rb-card bordered rb-scard rb-mem-integrated-settings" },
    h("span", { class: "h" }, "기억 · 리수폿 설정"),
    h("button", { type: "button", class: "rb-srow", onClick: () => ctx.go("settings", "prompts") },
      h("span", { class: "t" }, "기억·리수폿 프롬프트", h("small", null, "쓸 때 덧붙일 프롬프트 · JSON/.risup 불러오기")), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))),
    h("button", { type: "button", class: "rb-srow", onClick: () => { if (ctx.memory?.embedder) openEmbedModal(ctx); else ctx.toast("기억 기능을 쓸 수 없는 상태예요.", { error: true }); } },
      h("span", { class: "t" }, "임베딩(의미 검색)", h("small", null, "뜻이 비슷한 기억 찾기 · API 주소·키·기본 사용·대기 시간")), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))));



  const main = h("div", { class: "rb-mem2-main" },
    pageHead("기억", { sub: `${cur.botName || "이름 없는 캐릭터"} · ${cur.chatName || "이 채팅"}`, sw: { on, label: "이 채팅에서 사용", onChange: (v) => setOn(v) } }),
    status, usageCard(usageOf(folder, last?.manifest)), actions, prog, memorySettings, recBox,
    !caps.analyze ? note("warn", "이 저장소에서는 분석을 BardWiki가 해요. 기록 보기만 쓸 수 있어요.") : null);
  const adv = advFold(ctx, "memory", ...(ctx.prefs.advanced ? advancedBlocks(ctx, { cur, idx, redraw, modeHost }) : [true]));
  replace(host, h("div", { class: ["rb-mem2-grid", ctx.prefs.advanced && "has-adv"] }, main, adv ? h("div", { class: "rb-mem2-side" }, adv) : null));
}
