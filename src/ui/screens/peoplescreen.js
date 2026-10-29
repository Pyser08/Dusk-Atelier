// 인물 화면 + 인물 상세 (1.7.0 4단계, 계획 §3.4): 위키의 인물 문서를 보고 다듬는다. 스위치 = 이 채팅의 인물 추적(새 인물도 자동 기록).
import { h, replace } from "../dom.js";
import { icon } from "../icons.js";
import { actionRow, advFold, badge, btn, emptyState, pageHead, promptDialog } from "../kit.js";
import { fail, avatar, mem } from "./memory/common.js";
import { memoryEnv } from "./memory/menv.js";
import { gapPlanOf, askFillGaps } from "./memory/fillgaps.js";
import { conflictBox } from "./memory/conflictui.js";
import { tracked } from "./memory/settingstools.js";
import { openTracking } from "./memory/trackui.js";
import { renderPeopleTab } from "./memory/wikiview.js";
import { wikiEditable, wikiEdit, pausePerson } from "./memory/people.js";
import { stateOf, findDoc, timelineOf } from "../../engine/personview.js";
import { gapsOf } from "../../engine/peoplegaps.js";
import { createBlankPerson } from "../../engine/wikiedit.js";
import { setPin, isPinned, isPaused, sectionPinKey, metricPinKey } from "../../engine/personedit.js";

export async function renderPeople(ctx) {
  const host = h("div", { class: "rb-mem2 rb-scroll", "data-page": "people" });
  replace(ctx.main, host);
  const redraw = () => renderPeople(ctx).catch(fail(ctx));
  try { await draw(ctx, host, redraw); } catch (e) { fail(ctx)(e); }
}

const gauge = (x) => h("span", { class: "bar", role: "progressbar", "aria-valuemin": x.min, "aria-valuemax": x.max, "aria-valuenow": x.value }, h("i", { style: { width: `${Math.round(((x.value - x.min) / Math.max(1, x.max - x.min)) * 100)}%` } }));
const summaryOf = (wiki, doc) => wiki?.people?.profiles?.[doc.id]?.summary?.trim() || (doc.sections ?? []).map((s) => (s.body ?? "").trim()).find(Boolean) || "";

async function draw(ctx, host, redraw) {
  const M = ctx.memory, m = mem(ctx);
  if (!M) return replace(host, pageHead("인물"), h("div", { class: "rb-empty" }, "기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  const cur = await M.switches.currentChat();
  if (!cur) return replace(host, pageHead("인물", { sub: "위키의 인물 문서를 보고 다듬어요" }), emptyState({ icon: "users", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 인물을 보여 줘요." }));
  const { env, err } = await memoryEnv(ctx, { botId: cur.chaId, chatIndex: cur.ti, redraw });
  if (!env) return replace(host, pageHead("인물"), h("div", { class: "rb-empty" }, err === "chat" ? "이 봇에는 채팅이 아직 없어요." : "봇을 찾지 못했어요."));
  const wiki = env.folder.wiki, docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const wide = ctx.main.clientWidth >= 900;
  if (m.pid && !docs.some((d) => d.id === m.pid)) m.pid = "";
  if (wide && !m.pid && docs.length) m.pid = docs[0].id;

  // 스위치: 이 채팅의 인물 추적(자동 기록이 새 인물까지 따라감). 꺼지면 고른 인물만 기록해요.
  const st = M.flow?.settings ? tracked(ctx, await M.flow.settings().catch(() => null)) : null, blocked = !st || st.status().blocked;
  const trackOn = !blocked && st.rawSnapshot().autoWriterEnabled !== false;
  const setTrack = (v) => { try { st.update((x) => { x.autoWriterEnabled = v; }); ctx.toast(v ? "새 인물도 자동으로 추적해요." : "고른 인물만 추적해요."); } catch (e) { fail(ctx)(e); } redraw(); };
  const head = pageHead("인물", { sub: "위키의 인물 문서를 보고 다듬어요", sw: blocked ? null : { on: trackOn, label: "인물 추적", text: "인물 추적", onChange: setTrack } });

  const plan = gapPlanOf(env);
  const addBlank = async () => {
    if (!wikiEditable(env)) return ctx.toast("위키가 만들어진 뒤에 쓸 수 있어요. 응답이 한 번 더 오면 생겨요.", { error: true });
    const v = await promptDialog(ctx.win, { title: "인물 추가", label: "인물 이름", ok: "추가" });
    if (v?.trim()) await wikiEdit(env, (w) => createBlankPerson(w, v), "인물을 추가했어요.").then(redraw).catch(fail(ctx));
  };
  const actions = actionRow([{ label: `AI로 빈칸 채우기 · ${plan.total}명`, icon: "sparkle", onClick: () => askFillGaps(env, plan).catch(fail(ctx)) }, { label: "인물 추가", icon: "plus", kind: "", onClick: addBlank }]);

  // 인물 카드 목록
  const q = (m.personSearch ?? "").trim().toLowerCase();
  const shown = docs.filter((d) => !q || [d.title, ...(d.aliases ?? [])].some((n) => String(n).toLowerCase().includes(q)));
  const open = (id) => { m.pid = id; redraw(); };
  const card = (d) => {
    const s = stateOf(d), aff = s.meters.find((x) => x.slotId === "affinity.score"), gap = gapsOf(wiki, d).metrics.length > 0;
    return h("button", { type: "button", class: ["rb-pcard", d.id === m.pid && "is-active"], "aria-pressed": d.id === m.pid ? "true" : "false", onClick: () => open(d.id) },
      avatar(d.title), h("span", { class: "txt" }, h("span", { class: "name" }, d.title, gap ? badge("수치 비어 있음", "warn") : null), h("span", { class: "meta" }, summaryOf(wiki, d) || "아직 요약이 없어요"), aff ? h("span", { class: "rb-mem-meter" }, h("span", { class: "l" }, "호감도"), gauge(aff), h("span", { class: "v" }, String(aff.value))) : null));
  };
  const list = h("section", { class: "rb-ppl-list" },
    h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "이름·별칭", value: m.personSearch ?? "", "aria-label": "인물 검색", onChange: (e) => { m.personSearch = e.target.value; redraw(); } })),
    shown.length ? shown.map(card) : emptyState({ icon: "users", title: docs.length ? "검색 결과가 없어요" : "아직 위키 인물이 없어요", text: docs.length ? "" : "응답이 쌓이면 생기거나, 직접 추가할 수 있어요.", actions: docs.length ? [] : [{ label: "인물 추가", onClick: addBlank }] }));

  const detail = m.pid ? personDetail(env, docs.find((d) => d.id === m.pid), { back: wide ? null : () => { m.pid = ""; redraw(); }, redraw }) : null;
  const more = (() => { const box = h("div"); let loaded = false; return h("details", { class: "rb-mem-man", onToggle: (e) => { if (e.target.open && !loaded) { loaded = true; renderPeopleTab(env, box).catch(fail(ctx)); } } }, h("summary", null, "위키 전체 편집 (모든 항목·AI 도구·합치기)"), box); })();
  const adv = advFold(ctx, "people", ...(ctx.prefs.advanced ? [h("div", { class: "rb-mem-sact" }, btn("추적 인물 고르기", { onClick: () => openTracking(env).catch(fail(ctx)) })), more] : [true]));

  if (!wide && detail) return replace(host, detail);   // 모바일: 상세는 한 화면으로
  replace(host, h("div", { class: ["rb-ppl", wide && "wide"] },
    h("div", { class: "rb-ppl-left" }, head, conflictBox(env), actions, list, adv),
    wide ? h("div", { class: "rb-ppl-right" }, detail ?? h("div", { class: "rb-empty" }, "왼쪽에서 인물을 골라 주세요.")) : null));
}

function personDetail(env, doc, { back, redraw }) {
  if (!doc) return h("div", { class: "rb-empty" }, "인물을 찾지 못했어요.");
  const { ctx } = env, wiki = env.folder.wiki, s = stateOf(doc), prof = wiki?.people?.profiles?.[doc.id];
  const person = Object.values(env.folder.people ?? {}).find((p) => findDoc(wiki, p)?.id === doc.id) ?? { name: doc.title, aliases: doc.aliases ?? [] };
  const keys = [...(doc.sections ?? []).map((x) => sectionPinKey(x.id)), ...(doc.metrics ?? []).map((x) => metricPinKey(x.id))];
  const pinned = keys.length > 0 && keys.every((k) => isPinned(wiki, doc.id, k)), paused = isPaused(env.idx.bots?.[env.bot.id]?.ignore, person);
  const togglePin = () => wikiEdit(env, (w) => keys.reduce((cur, k) => setPin(cur, doc.id, k, !pinned), w), pinned ? "고정을 풀었어요." : "고정했어요. AI가 이 인물을 바꾸지 않아요.").then(redraw).catch(fail(ctx));
  const meters = s.meters.length ? h("div", { class: "rb-mem-meters" }, s.meters.map((x) => h("div", { class: "rb-mem-meter" }, h("span", { class: "l" }, x.label), gauge(x), h("span", { class: "v" }, String(x.value), x.stage ? h("small", null, ` ${x.stage}`) : null)))) : h("p", { class: "rb-muted" }, "수치가 아직 비어 있어요.");
  const traits = (prof?.coreTraits ?? []).filter(Boolean);
  const rel = s.texts.find((t) => t.id === "core.relationship");
  const recent = timelineOf(env.folder, env.folder.people ? Object.values(env.folder.people).find((p) => findDoc(wiki, p)?.id === doc.id) : null, doc).slice(0, 3);
  return h("div", { class: "rb-pdetail" },
    h("div", { class: "rb-mem2-head" }, back ? btn("← 인물", { size: "sm", onClick: back }) : null, avatar(doc.title), h("h2", { class: "rb-h2" }, doc.title)),
    h("section", { class: "rb-card rb-psec" }, h("h4", null, "지금 상태"), meters),
    h("section", { class: "rb-card rb-psec" }, h("h4", null, "요약"), h("p", null, summaryOf(wiki, doc) || "아직 요약이 없어요.")),
    traits.length ? h("section", { class: "rb-card rb-psec" }, h("h4", null, "성격"), h("div", { class: "rb-mem-chats" }, traits.map((t) => h("span", { class: "rb-chip" }, t)))) : null,
    rel ? h("section", { class: "rb-card rb-psec" }, h("h4", null, "관계"), h("p", null, rel.body)) : null,
    h("section", { class: "rb-card rb-psec" }, h("h4", null, "최근 기록"), recent.length ? h("ul", { class: "rb-mem-reclist" }, recent.map((r) => h("li", { class: "rb-mem-rec" }, h("div", { class: "txt" }, h("div", null, r.text))))) : h("p", { class: "rb-muted" }, "아직 기록이 없어요.")),
    h("div", { class: "rb-actions" }, btn(pinned ? "고정 풀기" : "고정하기", { icon: "shield", onClick: togglePin }), btn(paused ? "기록 다시 시작" : "기록 쉬기", { onClick: () => pausePerson(env, person) })));
}
