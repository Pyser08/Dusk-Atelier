// 인물 AI 도구 창(고급 모드): 전체 다시 정리 · 직접 지시 · 항목 AI 작성 · 수치 제안.
// 리수폿 컨트롤러(`M.flow.tools()`)를 그대로 쓰며, 모든 결과는 ‘변경안 → 확인 → 반영’ 순서로만 저장한다.
// 지금 열려 있는 채팅의 인물에만 쓸 수 있다(위키 범위가 그 채팅에 묶여 있어서).
import { h, replace } from "../../dom.js";
import { btn, modal, note, segmented, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { liveScope } from "./advanced.js";
import { PERSON_REFRESH_GROUPS } from "../../../data/pot/person-refresh.js";
import { PEOPLE_AI_METRIC_NAMES } from "../../../data/pot/people-metric-ai.js";

const LABELS = { summary: "성격 요약", coreTraits: "핵심 기질", values: "중요 가치", emotionExpression: "감정 표현", defenseResponse: "방어 반응", intimacyStyle: "친밀 표현" };
const show = (v) => v == null || v === "" ? "없음" : Array.isArray(v) ? v.map(show).join("\n") : typeof v === "object" ? Object.entries(v).map(([k, x]) => `${LABELS[k] ?? k} · ${show(x)}`).join("\n") : String(v);
const busy = (s) => s?.running || ["running", "applying"].includes(s?.phase);

// 이 인물에 AI 도구를 쓸 수 있는지. 반환: {tools, scope} 또는 {why}
export async function toolsFor(env) {
  const { ctx, bot, chatItem } = env, M = ctx.memory, tools = M.flow?.tools?.();
  if (!tools) return { why: "기억 흐름이 켜져 있어야 해요. 설정에서 ‘장기기억 켜기’를 확인해 주세요." };
  const scope = liveScope(M, bot.id);
  const [ci, ti] = await Promise.all([ctx.api.getCurrentCharacterIndex().catch(() => -1), ctx.api.getCurrentChatIndex().catch(() => -1)]);
  if (!scope || ci !== bot.index || ti !== chatItem.index) return { why: "리스에서 이 봇의 이 채팅을 연 상태에서 쓸 수 있어요." };
  return { tools, scope };
}

const changeRow = (ch) => h("article", { class: "rb-card rb-mem-chg" }, h("b", null, ch.label ?? ch.heading ?? ch.key ?? "변경"),
  h("div", { class: "rb-mem-diff" }, h("div", null, h("small", { class: "rb-muted" }, "변경 전"), h("pre", { class: "rb-mem-pre" }, show(ch.before))), h("div", null, h("small", { class: "rb-muted" }, "변경 후"), h("pre", { class: "rb-mem-pre" }, show(ch.after ?? ch.value ?? ch.text)))));

// 컨트롤러 상태(진행·오류·변경안)를 한 덩어리로 그린다. getChanges(status) → 변경 목록
function review(ctrl, getChanges, { apply, cancel, what }) {
  const s = ctrl.status(), ch = getChanges(s) ?? [], prop = s.proposal;
  return h("div", null,
    busy(s) ? h("p", { class: "rb-muted", role: "status" }, s.phase === "applying" ? "저장하는 중이에요…" : "AI가 변경안을 만드는 중이에요…") : null,
    s.error ? note("err", s.error) : null,
    prop?.issues?.length ? h("ul", { class: "rb-muted" }, prop.issues.map((t) => h("li", null, t))) : null,
    prop && !ch.length && !busy(s) ? h("p", { class: "rb-muted" }, prop.applied ? "반영했어요." : "바꿀 내용이 없대요. (변경 없음)") : null,
    ch.map(changeRow),
    prop && ch.length && !prop.applied ? h("div", { class: "rb-mem-sact" }, btn(`이 ${what} 반영`, { kind: "primary", disabled: busy(s), onClick: apply }), btn("버리기", { onClick: cancel })) : null,
    prop?.applied ? note("ok", "반영했어요. 인물 페이지에서 확인해 보세요.") : null);
}

export async function openAITools(env, doc, person, startTab = "refresh") {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const { tools } = chk, docId = doc.id, M = ctx.memory;
  const policies = M.lib ? (() => { try { return JSON.parse(M.lib.base.policies).policies; } catch { return {}; } })() : {};
  await modal(ctx.win, (done) => {
    let tab = startTab, groups = new Set(), mode = "standard", instruction = "", fieldKey = "profile:personality", metricSlot = Object.keys(PEOPLE_AI_METRIC_NAMES)[0];
    const subs = [];
    const body = h("div");
    const close = () => { for (const u of subs) u(); try { for (const c of [tools.refresh, tools.command, tools.field, tools.metric]) c.cancel(); } catch {} done(null); env.redraw(); };
    const run = (p) => p.catch((e) => fail(ctx)(e));
    const sections = (doc.sections ?? []).map((s) => [`section:${s.id}`, s.heading || s.title || "항목"]);
    const fieldOptions = [["profile:personality", "기본 성격 전체"], ...sections, ["new:pattern", "새 장기 변화 한 줄"], ["new:overview", "인물 개요 새로 쓰기"]];
    const paint = () => {
      const panes = {
        refresh: () => h("div", null, h("p", { class: "rb-muted" }, "고른 구역을 최근 대화를 보고 AI가 다시 써요. 변경안을 보고 반영할지 정해요. 고정(📌)한 항목은 건드리지 않아요."),
          h("div", { class: "rb-mem-chats" }, PERSON_REFRESH_GROUPS.map((g) => h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: groups.has(g.id), onChange: (e) => { e.target.checked ? groups.add(g.id) : groups.delete(g.id); tools.refresh.cancel(); } }), g.id === "userRelationship" ? "나와의 관계" : g.label))),
          h("div", { class: "rb-mem-field" }, h("span", null, "작성 방식"), segmented([["standard", "표준"], ["thorough", "꼼꼼하게(호출 많음)"]], mode, (v) => { mode = v; paint(); }, "작성 방식")),
          h("div", { class: "rb-mem-sact" }, btn("변경안 만들기", { kind: "primary", disabled: busy(tools.refresh.status()), onClick: () => { if (!groups.size) return ctx.toast("구역을 하나 이상 골라 주세요.", { error: true }); run(tools.refresh.generate(docId, { groups: [...groups], mode })); } })),
          review(tools.refresh, (s) => s.proposal?.changes, { apply: () => run(tools.refresh.apply()), cancel: () => tools.refresh.cancel(), what: "변경안" })),
        command: () => h("div", null, h("p", { class: "rb-muted" }, "하고 싶은 수정을 말로 적으면 AI가 변경안을 만들어요. 예: “말투를 좀 더 차갑게 바꿔 줘”"),
          h("textarea", { class: "rb-input", rows: 4, "aria-label": "직접 지시", value: instruction, onInput: (e) => { instruction = e.target.value; } }),
          h("div", { class: "rb-mem-sact" }, btn("변경안 만들기", { kind: "primary", disabled: busy(tools.command.status()), onClick: () => { if (!instruction.trim()) return ctx.toast("지시를 적어 주세요.", { error: true }); run(tools.command.generate(docId, instruction.trim())); } })),
          review(tools.command, (s) => s.proposal?.changes, { apply: () => run(tools.command.apply()), cancel: () => tools.command.cancel(), what: "변경안" })),
        field: () => h("div", null, h("p", { class: "rb-muted" }, "항목 하나만 AI로 새로 써요."),
          h("label", { class: "rb-mem-field" }, h("span", null, "항목"), h("select", { class: "rb-input", onChange: (e) => { fieldKey = e.target.value; tools.field.cancel(); } }, fieldOptions.map(([v, l]) => h("option", { value: v, selected: v === fieldKey }, l)))),
          h("div", { class: "rb-mem-sact" }, btn("작성하기", { kind: "primary", disabled: busy(tools.field.status()), onClick: () => run(tools.field.generate(docId, fieldKey)) })),
          review(tools.field, (s) => s.proposal && s.proposal.changed !== false ? [{ label: s.label || "항목", before: s.proposal.before, after: s.proposal.after }] : [], { apply: () => run(tools.field.apply()), cancel: () => tools.field.cancel(), what: "내용" })),
        metric: () => h("div", null, h("p", { class: "rb-muted" }, "대화 근거를 보고 AI가 수치(호감·음란·의심 등)를 제안해요. 직접 숫자를 고치려면 인물 페이지의 수치 옆 ✎를 쓰세요."),
          h("label", { class: "rb-mem-field" }, h("span", null, "수치"), h("select", { class: "rb-input", onChange: (e) => { metricSlot = e.target.value; tools.metric.cancel(); } }, Object.entries(PEOPLE_AI_METRIC_NAMES).map(([v, l]) => h("option", { value: v, selected: v === metricSlot }, l)))),
          h("div", { class: "rb-mem-sact" }, btn("제안 받기", { kind: "primary", disabled: busy(tools.metric.status()), onClick: () => run(tools.metric.generate(docId, metricSlot, {})) })),
          review(tools.metric, (s) => s.proposal ? [{ label: s.label || "수치", before: s.proposal.before ?? s.proposal.current, after: s.proposal.after ?? s.proposal.proposed ?? s.proposal }] : [], { apply: () => run(tools.metric.apply()), cancel: () => tools.metric.cancel(), what: "수치" }))
      };
      replace(body, segmented([["refresh", "전체 다시 정리"], ["command", "직접 지시"], ["field", "항목 AI 작성"], ["metric", "수치 제안"]], tab, (v) => { tab = v; paint(); }, "AI 도구"), panes[tab]());
    };
    for (const c of [tools.refresh, tools.command, tools.field, tools.metric]) subs.push(c.subscribe(() => paint()));
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(720px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, `${person?.name ?? doc.title} · AI 도구`), h("span", { style: "flex:1" }), btn("닫기", { onClick: close })), body);
  });
}

export const confirmManual = (env, title, body) => confirmDialog(env.ctx.win, { title, body, ok: "바꾸기", danger: true });

// 항목 하나를 AI로 쓴다(리수폿 ‘AI 작성’ 버튼). key: section:<id> · profile:personality · new:overview · new:pattern · new:record:<json>
export async function openFieldAI(env, doc, key, title = "AI 작성") {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const { tools } = chk, run = (p) => p.catch((e) => fail(ctx)(e));
  await modal(ctx.win, (done) => {
    const body = h("div"); let unsub = null;
    const close = () => { try { unsub?.(); tools.field.cancel(); } catch {} done(null); env.redraw(); };
    const paint = () => replace(body, h("div", null,
      review(tools.field, (s) => s.proposal && s.proposal.changed !== false ? [{ label: s.label || title, before: s.proposal.before, after: s.proposal.after }] : [], { apply: () => run(tools.field.apply()), cancel: () => tools.field.cancel(), what: "내용" }),
      !busy(tools.field.status()) && !tools.field.status().proposal ? h("div", { class: "rb-mem-sact" }, btn("다시 작성", { kind: "primary", onClick: () => run(tools.field.generate(doc.id, key)) })) : null));
    unsub = tools.field.subscribe(() => paint());
    run(tools.field.generate(doc.id, key));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(680px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, `${doc.title} · ${title}`), h("span", { style: "flex:1" }), btn("닫기", { onClick: close })),
      h("p", { class: "rb-muted" }, "AI가 쓴 변경안을 보고 반영할지 정해요. 📌 고정한 항목은 건드리지 않아요."), body);
  });
}

// 인물 추가·가져오기: 카드·로어북 전체 / 지금 대화 / 직접 자료에서 인물 후보를 찾아 고른 인물을 위키에 넣는다.
export async function openImport(env) {
  const { ctx } = env, chk = await toolsFor(env);
  if (!chk.tools) return ctx.toast(chk.why, { error: true });
  const imp = chk.tools.importer, run = (p) => Promise.resolve(p).catch((e) => fail(ctx)(e));
  await modal(ctx.win, (done) => {
    let mode = "all", unsub = null; const form = { name: "", aliases: "", material: "" };
    const body = h("div");
    const close = () => { try { unsub?.(); if (imp.status().phase === "running") imp.cancel(); } catch {} done(null); env.redraw(); };
    const paint = () => {
      const s = imp.status(), running = s.running, cands = s.candidates ?? [];
      const field = (label, key, ph, rows) => h("label", { class: "rb-mem-field" }, h("span", null, label), rows
        ? h("textarea", { class: "rb-input", rows, placeholder: ph, "aria-label": label, onInput: (e) => { form[key] = e.target.value; } }, form[key])
        : h("input", { class: "rb-input", placeholder: ph, "aria-label": label, value: form[key], onInput: (e) => { form[key] = e.target.value; } }));
      replace(body,
        segmented([["all", "카드·로어북 전체"], ["active", "지금 대화"], ["direct", "직접 입력"]], mode, (v) => { mode = v; paint(); }, "가져올 곳"),
        mode === "direct" ? h("div", null, field("이름", "name", "예: 한연희"), field("별칭 (쉼표로 구분)", "aliases", "선택"), field("자료", "material", "이 인물에 대해 알려 줄 글을 붙여 넣어요", 6)) : h("p", { class: "rb-muted" }, mode === "all" ? "캐릭터 카드와 로어북 전체에서 인물을 찾아요." : "지금 켜져 있는 로어북과 최근 대화에서 인물을 찾아요."),
        h("div", { class: "rb-mem-sact" }, btn("인물 찾기", { kind: "primary", disabled: running, onClick: () => run(mode === "direct" ? imp.runDirect({ ...form }) : imp.run(mode)) }), running ? btn("취소", { onClick: () => imp.cancel() }) : null),
        running ? h("p", { class: "rb-muted", role: "status" }, `${s.stage || "작업 중"}… ${s.total ? `${s.completed}/${s.total}` : ""}`) : null,
        s.error ? note("err", s.error) : null,
        cands.length ? h("div", null, h("h4", null, `인물 후보 ${cands.length}명`),
          h("ul", { class: "rb-mem-reclist" }, cands.map((c) => h("li", { class: "rb-mem-rec" }, h("label", { class: "rb-mem-check" },
            h("input", { type: "checkbox", checked: !!c.selected, disabled: !!c.ambiguous || running, onChange: (e) => imp.toggle(c.id, e.target.checked) }), h("b", null, c.name), (c.aliases ?? []).length ? h("small", { class: "rb-muted" }, ` · ${c.aliases.join(", ")}`) : null, c.ambiguous ? h("small", { class: "rb-muted" }, " · 이름이 겹쳐 고를 수 없어요") : null)))),
          h("div", { class: "rb-mem-sact" }, btn("고른 인물 반영", { kind: "primary", disabled: running || !cands.some((c) => c.selected), onClick: () => run(imp.applySelection()) }))) : null,
        s.applyReport ? note("ok", "반영했어요. 닫으면 인물 위키에서 볼 수 있어요.") : null);
    };
    unsub = imp.subscribe(() => paint());
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(680px,96vw);max-height:90vh;overflow:auto" },
      h("div", { class: "rb-mem-shead" }, h("h3", null, "인물 추가·가져오기"), h("span", { style: "flex:1" }), btn("닫기", { onClick: close })), body);
  });
}

// 수치·성격이 비어 있는 인물들을 차례로 AI가 채운다. 인물마다 변경안을 만들고 곧바로 반영한다(고정한 항목은 엔진이 건드리지 않는다).
export async function fillEmptyPeople(env, docs) {
  const { ctx } = env, chk = await toolsFor(env);
  if (chk.why) return ctx.toast(chk.why, { error: true });
  const { refresh } = chk.tools, groups = PERSON_REFRESH_GROUPS.map((g) => g.id);
  let ok = 0, same = 0, bad = 0;
  for (const [i, doc] of docs.entries()) {
    ctx.toast(`AI가 인물을 채우는 중이에요 (${i + 1}/${docs.length}) · ${doc.title}`, { seconds: 6 });
    try {
      refresh.cancel({ silent: true });
      await refresh.generate(doc.id, { groups, mode: "standard" });
      const s = refresh.status();
      if (s.error) { bad++; continue; }
      if (s.proposal?.changes?.length) { await refresh.apply(); (refresh.status().error ? bad++ : ok++); } else same++;
    } catch { bad++; }
  }
  refresh.cancel({ silent: true });
  ctx.toast(`인물 채우기를 마쳤어요 · 반영 ${ok}명${same ? ` · 변경 없음 ${same}명` : ""}${bad ? ` · 실패 ${bad}명(인물 페이지에서 다시 시도)` : ""}`, { seconds: 9, error: bad > 0 && !ok });
  (env.redrawView ?? env.redraw)();
}
