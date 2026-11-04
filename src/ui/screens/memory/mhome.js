// 기억 화면 (1.8.3 목업 3): 상태 카드 하나(스위치·숫자 3·막대·범례) → 지난 대화 분석(큰 버튼) → 바로가기 4칸 → 기억 옵션 → 최근 기록.
// 오른쪽(PC)·아래(모바일): (PC 고급) 기억 방식 바로 보임 → 설정 한 줄 목록 → 고급 묶음(한 줄씩 접음).
import { maybePromptIntro } from '../promptstab.js';
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { advFold, btn, confirmDialog, emptyState, note, pageHead, progressBar, statusCard, switchEl, setSwitch } from "../../kit.js";
import { injectReasonText } from "../../../engine/memoryinject.js";
import { USAGE_KINDS, injectLine, usageOf } from "../../../engine/memoryusage.js";
import { mem, fail, gradeBadge, at } from "./common.js";
import { renderModeBar } from "./modebar.js";
import { advancedGroups } from "./madv.js";
import { builders, renderGlobalSettings } from "./settings.js";
import { openEmbedModal } from "./embedmodal.js";
import { erosyncSection } from "./erosyncui.js";
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

// 설정 카드(한 줄 요약 목록 + 기억 옵션 3개). 열린 채팅이 없어도 쓸 수 있게 따로 뺐다(전체 설정이라 채팅과 무관).
async function settingsCards(ctx, M, idx, redraw, cur = null, sw = null) {
  let embedLine = "뜻이 비슷한 기억 찾기";
  try { if (M.embedder) { await M.embedder.load(); embedLine += M.embedder.status().on ? " · 켜짐" : " · 꺼짐"; } } catch { /* 요약 없이 */ }
  const srow = (title, sub, onClick, extra = {}) => h("button", { type: "button", class: "rb-srow", onClick, ...extra }, h("span", { class: "t" }, title, h("small", null, sub)), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
  const memorySettings = h("section", { class: "rb-card bordered rb-scard rb-mem-integrated-settings" },
    h("span", { class: "h" }, "설정"),
    srow("기억·리수폿 프롬프트", "앞·중간·뒤에 덧붙일 프롬프트", () => ctx.go("settings", "prompts")),
    srow("임베딩 (의미 검색)", embedLine, () => { if (M.embedder) openEmbedModal(ctx); else ctx.toast("기억 기능을 쓸 수 없는 상태예요.", { error: true }); }, { "data-tour": "mem-embed" }));

  // 기억 옵션 3개(고급 모드 '대화에 넣기'와 같은 설정)
  const { S, save } = builders(ctx, idx, redraw, "");
  const inj = S.inject ?? {};
  const orow = (title, text, v0, set) => h("div", { class: "rb-srow" }, h("span", { class: "t" }, title, h("small", null, text)),
    switchEl(v0, { label: title, onChange: (v, el) => { setSwitch(el, v); save((st) => { st.inject ??= {}; set(st.inject, v); }); } }));
  const memOptions = h("section", { class: "rb-card bordered rb-scard rb-mem-options" }, h("span", { class: "h" }, "기억 옵션"),
    orow("사람다운 기억", "관계 진도·호칭·말투·둘만의 추억 등을 기억해요.", inj.human !== false, (o, v) => { o.human = v; }),
    orow("감정이 시간이 지나면 식어요", "적대·두려움은 빨리, 애정은 천천히 누그러져요.", inj.cool !== false, (o, v) => { o.cool = v; }),
    orow("거짓말·오해 추적", "누가 무엇을 잘못 믿는지 기억해요. 분석 모델이 약하면 틀릴 수 있어요.", inj.beliefs === true, (o, v) => { o.beliefs = v; }));
  // 리수폿 사용(이 채팅 단위라 열린 채팅이 있을 때만). 예전 '자동 기록 · 인물 추적'에 있던 스위치를 옮겼다.
  if (cur) {
    memOptions.append(h("div", { class: "rb-srow" }, h("span", { class: "t" }, "리수폿 사용", h("small", null, "이 채팅에서 리수폿(위키 기록)을 써요.")),
      switchEl(sw?.pot?.on !== false, { label: "이 채팅에서 리수폿 사용", onChange: async (v, el) => {
        setSwitch(el, v);
        try { await M.switches.setPot(cur.chaId, v); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 리수폿을 켰어요." : "이 채팅에서 리수폿을 껐어요."); }
        catch (e) { fail(ctx)(e); }
        redraw();
      } })));
  }

  // Erosync 카드는 접힌 설정 안이 아니라 기억 옵션 바로 아래에 보이게 둔다(간단·고급 모드 모두)
  return { memorySettings, memOptions, erosync: erosyncSection(ctx) };
}

export async function renderMemoryHome(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  // 열린 채팅 확인(호스트 왕복)을 안내·모드 막대 읽기와 동시에 시작한다(1.8.3 속도). 위치가 같으면 직전 값을 바로 쓴다.
  const curP = Promise.resolve().then(() => (M.switches.peekCurrent ? M.switches.peekCurrent({ onChange: () => { if (ctx.state.tab === "memory" && mem(ctx) === m) redraw(); } }) : M.switches.currentChat()));
  curP.catch(() => {});
  await maybeAskBardWiki(ctx).catch(() => {});
  const modeHost = h("div");
  await renderModeBar(ctx, modeHost, { redraw });  // 간단 모드에서는 저장소를 자동으로 맞추기만 한다
  const cur = await curP;
  if (!cur) {
    // 열린 채팅이 없어도 전체 설정(기억 옵션·임베딩·프롬프트·고급)은 바꿀 수 있다
    const idx0 = await M.store.getIndex();
    const { memorySettings, memOptions, erosync } = await settingsCards(ctx, M, idx0, redraw);
    const gHost = h("div");
    if (ctx.prefs.advanced) await renderGlobalSettings(ctx, gHost, { redraw, panel: true }).catch(() => {});
    return replace(host, h("div", { class: "rb-mem2-grid has-adv rb-mem3" },
      h("div", { class: "rb-mem2-main" }, pageHead("장기 기억"),
        emptyState({ icon: "brain", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 기억을 보여 줘요. 아래 설정은 채팅 없이도 바꿀 수 있어요.",
          actions: [{ label: "다른 채팅 보기", icon: "list", onClick: () => { m.page = "bots"; redraw(); } }] }),
        memOptions, erosync),
      h("div", { class: "rb-mem2-side" }, memorySettings, ctx.prefs.advanced ? gHost : advFold(ctx, "memory", true))));
  }
  // 채팅 본문은 느릴 수 있으므로 화면을 먼저 그리고, 백필 분석용 데이터는 백그라운드에서 읽는다.
  const cacheKey = `${cur.chaId}:${cur.chatId}:${cur.ci}:${cur.ti}`;
  const hasCachedPlan = m.homeChatPlan?.key === cacheKey && Date.now() - m.homeChatPlan.t < 20000;
  const cachedPlan = hasCachedPlan ? m.homeChatPlan.plan : null;
  let chatPromise = Promise.resolve(null);
  if (!hasCachedPlan) {
    if (m.homeChatPromise?.key === cacheKey) chatPromise = m.homeChatPromise.promise;
    else {
      chatPromise = ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      m.homeChatPromise = { key: cacheKey, promise: chatPromise };
    }
  }
  const [sw, idx, folder] = await Promise.all([M.switches.state(cur.chaId), M.store.getIndex(), M.store.getFolder(cur.chaId, cur.chatId).catch(() => null)]);
  const caps = M.capabilities(M.backend(idx.settings).id), msgs = [];
  if (!hasCachedPlan) chatPromise.then((loaded) => {
    if (!loaded) return;
    const loadedMsgs = loaded.message ?? [];
    const nextPlan = caps.analyze && M.runner ? M.runner.planBackfill(loadedMsgs, { from: 0, to: Math.max(0, loadedMsgs.length - 1) }, folder) : null;
    m.homeChatPlan = { key: cacheKey, plan: nextPlan, t: Date.now() };
    if (m.homeChatPromise?.key === cacheKey) m.homeChatPromise = null;
    if (ctx.state.tab === "memory" && mem(ctx) === m) redraw();
  }).catch(() => {});
  const botCfg = idx.bots[cur.chaId] ?? {}, last = M.injector?.lastRequest?.() ?? null;
  const on = sw.memory.on;

  const setOn = async (v) => {
    try { await M.switches.setMemory(cur.chaId, v); if (v) await M.store.updateIndex((i) => { const b = i.bots[cur.chaId]; if (b) { b.paused = false; b.fails = 0; } }); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 기억을 켰어요. 다음 응답부터 기록돼요." : "이 채팅에서 기억을 껐어요."); } catch (e) { fail(ctx)(e); }
    redraw();
  };
  // 상태 카드: 꺼짐 / 문제(연속 실패로 멈춤) / 준비 중(아직 요청 없음·안 넣음) / 사용 중
  let status;
  const chatLabel = `${cur.botName || "이름 없는 캐릭터"} · ${cur.chatName || "이 채팅"}`;
  if (!on) status = statusCard("off", `${chatLabel} · ${sw.memory.reason === "bot-off" ? "이 채팅에서는 꺼 두었어요." : "기억이 꺼져 있어요."}`);
  else if (botCfg.paused) status = statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.", { label: "다시 켜기", kind: "primary", onClick: () => setOn(true) });
  else {
    const line = injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason));
    status = statusCard(last?.injected ? "on" : "prep", `${chatLabel} · ${line}`);
  }

  // 지난 대화 분석 (미처리만)
  const plan = caps.analyze && M.runner ? cachedPlan : null;
  const prog = h("div");
  const analyze = async () => {
    let activeChat = null, activeMsgs = [], activePlan = plan;
    if (!activePlan || !activePlan.todo) {
      activeChat = await chatPromise;
      if (!activeChat) activeChat = await ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      activeMsgs = activeChat?.message ?? [];
      activePlan = activeChat && M.runner ? M.runner.planBackfill(activeMsgs, { from: 0, to: Math.max(0, activeMsgs.length - 1) }, folder) : activePlan;
    } else {
      activeChat = await ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      activeMsgs = activeChat?.message ?? [];
    }
    let redo = false;
    if (!activePlan?.todo) {
      // 새로 분석할 응답이 없어도, 눌렀다면 처음부터 다시 분석할지 묻는다
      const all = activeMsgs.length && M.runner ? M.runner.planBackfill(activeMsgs, { from: 0, to: Math.max(0, activeMsgs.length - 1), all: true }, folder) : null;
      if (!all?.total) return ctx.toast("분석할 AI 응답이 없어요.");
      const again = await confirmDialog(ctx.win, { title: "이미 모두 분석했어요", body: `AI 응답 ${all.total}개가 모두 분석돼 있어요. 처음부터 다시 분석할까요? 호출 ${all.calls}회 · 대략 ${all.tokens.toLocaleString()} 토큰이 들어요. 기존 기록은 지워지지 않고, 새로 확인된 내용이 더해지거나 바뀔 수 있어요.`, ok: "다시 분석" });
      if (!again) return;
      redo = true;
    } else {
      const ok = await confirmDialog(ctx.win, { title: "지난 대화 분석", body: `AI 응답 ${activePlan.todo}개를 분석해요. 호출 ${activePlan.calls}회 · 대략 ${activePlan.tokens.toLocaleString()} 토큰이 들어요.`, ok: "분석하기" });
      if (!ok) return;
    }
    const ctrl = new AbortController(), cancel = btn("취소", { size: "sm", onClick: () => ctrl.abort() });
    replace(prog, progressBar(0), cancel);
    try {
      const r = await M.runner.backfill(cur.ci, cur.ti, { from: 0, to: Math.max(0, activeMsgs.length - 1) }, { signal: ctrl.signal, redo, onProgress: (n, t, f) => replace(prog, progressBar(Math.round(n / t * 100)), h("span", { class: "rb-muted" }, `${n}/${t} · 실패 ${f}`), cancel) });
      ctx.toast(`지난 대화 분석이 끝났어요${r.server ? " (서버)" : ""} (${r.total - r.failed.length}/${r.total}).${r.reasons?.length ? ` 실패 이유: ${r.reasons[0]}` : ""}`, r.failed.length ? { error: true } : undefined);
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const openDetail = (tab = "people") => { m.botId = cur.chaId; m.chatIndex = cur.ti; m.tab = tab; m.personKey = ""; m.page = "detail"; redraw(); };
  const u = usageOf(folder, last?.manifest);

  // ── 상태 카드: 상태·스위치·숫자 3·막대·범례 (머리 스위치와 합침) ──
  const onSw = switchEl(on, { label: "이 채팅에서 사용", onChange: (v, el) => { setSwitch(el, v); setOn(v); } });
  const num = (n, lab) => h("div", { class: "rb-hnum" }, h("b", null, String(n)), h("small", null, lab));
  const bar = u.total ? h("div", { class: "rb-mbar", role: "img", "aria-label": USAGE_KINDS.map(([k, l]) => `${l} ${u[k]}건`).join(", ") }, USAGE_KINDS.filter(([k]) => u[k]).map(([k]) => h("i", { class: `u-${k}`, style: `flex:${u[k]}` }))) : null;
  const legend = u.total ? h("ul", { class: "rb-mbar-legend" }, USAGE_KINDS.map(([k, l]) => h("li", null, h("i", { class: `u-${k}` }), `${l} ${u[k]}`))) : null;
  const statusBox = h("section", { class: "rb-card bordered rb-mem-statuscard" },
    h("div", { class: "rb-mem-statushead" }, status, onSw),
    h("div", { class: "rb-hnums rb-mem-nums" }, num(u.total, "저장된 기록"), num(last?.injected ? u.used : 0, "이번에 넣음"), num(plan ? plan.todo : "–", "미처리")),
    bar, legend);

  // ── 큰 버튼 하나 + 바로가기 4칸 ──
  const bigAct = caps.analyze && M.runner
    ? btn(plan ? `지난 대화 분석 · 미처리 ${plan.todo}개` : "지난 대화 분석", { kind: "primary", icon: "sparkle", onClick: analyze, id: "rb-mem-analyze" })
    : btn("기록 보기", { kind: "primary", icon: "brain", onClick: () => openDetail(), id: "rb-mem-analyze" });
  bigAct.classList.add("rb-bigbtn");
  const tile = (ic, name, onClick, id) => h("button", { type: "button", class: "rb-htile", onClick, id }, h("span", { class: "ico" }, icon(ic, 20)), h("span", { class: "t" }, h("b", null, name)));
  const shortcuts = h("section", { class: "rb-hdo rb-hdo-sm rb-mem-short", "aria-label": "바로가기" }, h("h2", null, "바로가기"), h("div", { class: "rb-hgrid" },
    tile("character", "인물 위키", () => openDetail("people"), "rb-mem-go-wiki"),
    tile("list", "기록 보기", () => openDetail("scenes"), "rb-mem-go-detail"),
    tile("image", "카드로 만들기", () => ctx.go("cards"), "rb-mem-go-cards"),
    tile("message", "다른 채팅", () => { m.page = "bots"; redraw(); }, "rb-mem-go-bots")));

  // '나' 한 줄 카드 (1.8.3): 다른 인물들이 나를 어떻게 기억하는지
  const meRow = h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-me", onClick: () => { m.page = "me"; redraw(); } },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, "나"),
    h("span", { class: "t" }, "나에 대한 기억", h("small", null, "다른 인물들이 나를 어떻게 보고 부르는지 모아 봐요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));

  // 인물 관계도 한 줄 카드 (1.9.3): '나에 대한 기억' 바로 아래. 누르면 관계도 탭으로 바로
  const npcN = Object.values(folder?.people ?? {}).filter((p) => p && String(p.name).toLowerCase().replace(/\s+/g, "") !== "{{user}}" && (p.records ?? []).some((r) => !r.orphan)).length;
  const mapRow = h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-relmap", onClick: () => ctx.go("relmap") },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("network", 18)),
    h("span", { class: "t" }, "인물 관계도", h("small", null, npcN ? `인물 ${npcN}명의 거리와 관계를 한눈에 봐요.` : "인물이 쌓이면 거리와 관계를 한눈에 볼 수 있어요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));

  const recent = recentOf(folder);
  const recBox = h("section", { class: "rb-card bordered rb-mem-recentbox" }, h("div", { class: "rb-mem-rechead" }, h("b", null, "최근 기록"), recent.length ? h("button", { type: "button", class: "rb-textlink", onClick: () => openDetail() }, "전체 보기") : null),
    h("ul", { class: "rb-mem-reclist rb-mem-recent" }, recent.length
      ? recent.map((r) => h("li", { class: "rb-mem-rec" }, h("div", { class: "txt" }, h("div", null, h("b", null, r.who), " ", r.act), h("div", { class: "rb-muted" }, at(r.at))), gradeBadge(r.g)))
      : h("li", { class: "rb-muted" }, "아직 쌓인 기록이 없어요.")));

  const { memorySettings, memOptions, erosync } = await settingsCards(ctx, M, idx, redraw, cur, sw);

  // ── 고급: 한 줄씩 접은 묶음. PC에서는 기억 방식을 접지 않고 오른쪽 맨 위에 둔다 ──
  const wide = (ctx.win?.ownerDocument?.defaultView?.innerWidth ?? 1280) >= 1000;
  const fold = (g) => h("details", { class: ["rb-card", "bordered", "rb-mem-grp", g.danger && "is-danger"], dataset: { g: g.id }, onToggle: (e) => { if (e.target.open) g.onOpen?.(); } },
    h("summary", null, h("span", { class: "t" }, h("b", null, g.title), h("small", null, g.sub)), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))), h("div", { class: "rb-mem-foldbody" }, ...g.kids));
  let side = [memorySettings];
  if (ctx.prefs.advanced) {
    const groups = advancedGroups(ctx, { cur, idx, redraw });
    const modeLabel = modeHost.querySelector(".rb-mem-mbrow small")?.textContent?.replace(/^지금:\s*/, "") ?? "";
    side = [
      wide ? modeHost : null,
      memorySettings,
      h("section", { class: "rb-mem-folds", "aria-label": "고급" }, h("h3", { class: "rb-h3" }, "고급"),
        !wide ? fold({ id: "mode", title: "기억 방식", sub: modeLabel, kids: [modeHost] }) : null,
        ...groups.map(fold))
    ];
  } else side.push(advFold(ctx, "memory", true));

  const main = h("div", { class: "rb-mem2-main" },
    pageHead("장기 기억"),
    statusBox, bigAct, prog, shortcuts, meRow, mapRow, memOptions, erosync, recBox,
    !caps.analyze ? note("warn", "이 저장소에서는 분석을 BardWiki가 해요. 기록 보기만 쓸 수 있어요.") : null);
  replace(host, h("div", { class: "rb-mem2-grid has-adv rb-mem3" }, main, h("div", { class: "rb-mem2-side" }, ...side)));
  // 1.8.3: 임베딩 안내 창은 자동으로 띄우지 않는다(시작 안내 3단계에서 설정, 필요하면 설정 줄의 '임베딩'에서)
}
