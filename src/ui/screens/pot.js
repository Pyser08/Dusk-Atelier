// 리수폿 화면 (1.7.0 4단계, 계획 §3.3). 기억과 완전히 따로: 자기 스위치·자기 설정. 머리 → 상태 → 주요 동작 3 → 캐릭터별 사용 → 고급.
import { maybePromptIntro } from './promptstab.js';
import { h, replace } from "../dom.js";
import { actionRow, advFold, btn, emptyState, note, pageHead, statusCard, switchEl, setSwitch } from "../kit.js";
import { icon } from "../icons.js";
import { fail, avatar } from "./memory/common.js";
import { memoryEnv } from "./memory/menv.js";
import { gapPlanOf, askFillGaps } from "./memory/fillgaps.js";
import { conflictBox } from "./memory/conflictui.js";
import { openWriter } from "./memory/writerui.js";
import { openWikiLog } from "./memory/wikilog.js";
import { openTracking } from "./memory/trackui.js";
import { flowSections } from "./memory/flowsettings.js";
import { potConfirm } from "../../engine/memoryswitch.js";

const hhmm = (iso) => { const t = Date.parse(iso); return t ? new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : ""; };
const REASON = { "pot-mode-off": "리수폿 기능이 꺼져 있어요.", "flow-off": "리수폿이 꺼져 있어요.", "bot-off": "이 채팅에서는 꺼 두었어요." };

export async function renderPot(ctx) {
  const host = h("div", { class: "rb-mem2 rb-scroll", "data-page": "pot" });
  replace(ctx.main, host);
  const redraw = () => renderPot(ctx).catch(fail(ctx));
  try { await draw(ctx, host, redraw); } catch (e) { fail(ctx)(e); }
}

async function draw(ctx, host, redraw) {
  const M = ctx.memory;
  if (!M) return replace(host, pageHead("리수폿"), h("div", { class: "rb-empty" }, "리수폿 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const cur = await M.switches.currentChat();
  if (!cur) return replace(host, pageHead("리수폿", { sub: "기억과 별도로 켜고 꺼요" }), emptyState({ icon: "book", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 위키를 보여 줘요." }));
  const { env, err } = await memoryEnv(ctx, { botId: cur.chaId, chatIndex: cur.ti, redraw });
  if (!env) return replace(host, pageHead("리수폿"), h("div", { class: "rb-empty" }, err === "chat" ? "이 봇에는 채팅이 아직 없어요." : "봇을 찾지 못했어요."));
  const { idx, folder } = env, st = await M.switches.state(cur.chaId), pot = st.pot;
  const wiki = folder.wiki, docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const rt = M.flow?.runtime?.(), ast = (() => { try { return rt?.auto?.status?.() ?? null; } catch { return null; } })();
  const lastAt = wiki?.automation?.lastStatus?.at;

  const setOn = async (v) => { try { await M.switches.setPot(cur.chaId, v); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 리수폿을 켰어요. 다음 응답부터 위키가 쌓여요." : "이 채팅에서 리수폿을 껐어요."); } catch (e) { fail(ctx)(e); } redraw(); };
  let status;
  if (!pot.on) status = statusCard("off", REASON[pot.reason] ?? "꺼져 있어요.", { label: "켜기", kind: "primary", onClick: () => setOn(true) });
  else if (ast?.phase === "failed") status = statusCard("err", "마지막 자동 기록이 실패했어요. 다음 응답에서 다시 해요.");
  else status = statusCard(docs.length ? "on" : "prep", `위키 문서 ${docs.length}개 · ${lastAt ? `마지막 자동 기록 ${hhmm(lastAt)}` : "아직 자동 기록 없음"} · 자동 기록 ${ast ? (ast.autoEnabled ? "켬" : "끔") : "켬"}`);

  const plan = gapPlanOf(env);
  const actions = actionRow([
    { label: "위키 보기", icon: "book", onClick: () => ctx.go("people") },
    { label: "지금 기록", icon: "edit", onClick: () => openWriter(env).catch(fail(ctx)) },
    { label: `AI로 빈칸 채우기 · ${plan.total}명`, icon: "sparkle", onClick: () => askFillGaps(env, plan).catch(fail(ctx)) }
  ]);

  // 캐릭터별 사용: 위키 인물마다 켜기/끄기(이 채팅 범위)
  const rows = await Promise.all(docs.map(async (d) => ({ d, on: await M.switches.charOn(cur.chaId, cur.chatId, d.id) })));
  const perChar = h("section", { class: "rb-card rb-pot-chars" }, h("b", null, "캐릭터별 사용"), h("p", { class: "rb-muted" }, "끄면 그 인물은 위키에서 더 이상 자동으로 바뀌지 않아요."),
    rows.length ? h("ul", { class: "rb-pot-charlist" }, rows.map(({ d, on }) => h("li", { class: "rb-pot-charrow" }, avatar(d.title), h("span", { class: "n" }, d.title),
      switchEl(on, { label: `${d.title} 위키 사용`, onChange: async (v, el) => { setSwitch(el, v); try { await M.switches.setChar(cur.chaId, cur.chatId, d.id, v); } catch (e) { fail(ctx)(e); } } }))))
      : h("p", { class: "rb-muted" }, "아직 위키 인물이 없어요. 응답이 쌓이면 생겨요."));

  const main = h("div", { class: "rb-mem2-main" },
    pageHead("리수폿", { sub: `${cur.botName || "이름 없는 캐릭터"} · ${cur.chatName || "이 채팅"} · 기억과 별도로 켜고 꺼요`, sw: { on: pot.on, label: "이 채팅에서 사용", onChange: (v) => setOn(v) } }),
    status, actions, perChar);
  const adv = advFold(ctx, "pot", ...(ctx.prefs.advanced ? advancedPot(ctx, env, cur, idx, redraw) : [true]));
  replace(host, h("div", { class: ["rb-mem2-grid", ctx.prefs.advanced && "has-adv"] }, main, adv ? h("div", { class: "rb-mem2-side" }, adv) : null));
}

// 고급: 리수폿 전용 설정(기억 설정과 따로 저장) · 롤백 충돌 · 되돌리기 기록 · 세부
export function advancedPot(ctx, env, cur, idx, redraw) {
  const M = ctx.memory, S = idx.settings, ps = S.potStore ?? {};
  const savePs = (patch) => M.store.updateIndex((i) => { i.settings.potStore = { ...(i.settings.potStore ?? {}), ...patch }; }).then(() => redraw()).catch(fail(ctx));
  const sel = (label, value, opts, onPick) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("select", { class: "rb-input", "aria-label": label, onChange: (e) => onPick(e.target.value) }, opts.map(([v, l]) => h("option", { value: v, selected: value === v }, l))));
  const sec = (title, ...kids) => h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, title), ...kids);
  const detail = h("div"); let loaded = false;
  const more = h("details", { class: "rb-mem-man", onToggle: (e) => { if (e.target.open && !loaded) { loaded = true; replace(detail, h("div", { class: "rb-mem-sact" }, btn("추적 인물 고르기", { onClick: () => openTracking(env).catch(fail(ctx)) })), (() => { const f = h("div"); flowSections(ctx, f, { redraw }).catch(fail(ctx)); return f; })()); } } },
    h("summary", null, "세부 설정 (추적 수준·기능 카드·AI 모델)"), detail);
  return [
    sec("저장·기록", sel("저장 위치", ps.backend ?? "auto", [["auto", "자동"], ["local", "플러그인"], ["bardwiki", "BardWiki"]], (v) => savePs({ backend: v })),
      sel("자동 기록 시점", potConfirm(S), [["next", "다음 입력을 보낼 때 (권장)"], ["now", "응답을 받은 직후"]], (v) => savePs({ confirm: v }))),
    sec("롤백 충돌 안내", conflictBox(env) ?? h("p", { class: "rb-muted" }, "겹친 기록이 없어요.")),
    sec("자동 기록 되돌리기", h("p", { class: "rb-muted" }, "위키가 바뀐 기록을 보고 되돌려요."), h("div", { class: "rb-mem-sact" }, btn("되돌리기 기록 열기", { icon: "history", onClick: () => openWikiLog(env).catch(fail(ctx)) }))),
    more
  ];
}
