// 인물 위키 화면: 리수폿의 배치(왼쪽 인물 목록 + 오른쪽 인물 문서)와 기능에 Dusk의 이야기 기록을 한 페이지로 합친다.
// 생김새는 Dusk 토큰·카드 스타일, 배치·항목 순서·수정 규칙(고정·편집 중 변경 거절)은 리수폿을 따른다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, modal, promptDialog, confirmDialog, openMenu, note } from "../../kit.js";
import { mem, fail, avatar, visibleRecords, potOn } from "./common.js";
import { findDoc } from "../../../engine/personview.js";
import { fillPlan, planLine } from "../../../engine/peoplegaps.js";
import { RECORD_GROUPS, groupInfo, recordGroupOf, targetCandidates } from "../../../engine/personrecords.js";
import { sectionPinKey, metricPinKey, scopeKeyOf, isPaused, isPinned } from "../../../engine/personedit.js";
import { deletePersonItem } from "../../../engine/pot/people-records.js";
import { createEmptyWikiScope } from "../../../engine/pot/wiki-schema.js";
import { createBlankPerson, editDocMeta, removePerson, ensureProfile, editProfile, addMetric, listOf, PROFILE_AXES } from "../../../engine/wikiedit.js";
import { renderPeople, personDetail, wikiEditable, editMetric, editWikiText, pinBtn, policyOf, editFolder, pausePerson, peopleMenuItems } from "./people.js";
import { openRecords } from "./recordsui.js";
import { openAITools, openFieldAI, openImport, fillEmptyPeople } from "./aitools.js";
import { liveScope } from "./advanced.js";
import { wikiPanel } from "./wikipanel.js";
import { openWikiLog } from "./wikilog.js";

const USER = "{{user}}";
const AXIS_LABEL = { relationalInitiative: "관계 주도성", expressionDirectness: "표현 직접성", emotionalExpressiveness: "감정 표출성", guardedness: "경계 성향", impulsivity: "충동성", relationshipPersistence: "관계 지속성" };
const BANDS = {
  relationalInitiative: ["관계를 거의 먼저 시작하지 않음", "상대가 이끌 때 주로 반응함", "상황에 따라 주도와 반응을 오감", "필요하면 먼저 다가가 관계를 이끔", "지속적으로 관계의 방향을 주도함"],
  expressionDirectness: ["뜻을 거의 직접 말하지 않음", "돌려 말하거나 암시를 선호함", "상황에 따라 직접성과 완곡함을 조절함", "의도와 요구를 비교적 분명히 말함", "생각과 의도를 매우 직접적으로 표현함"],
  emotionalExpressiveness: ["감정을 거의 겉으로 드러내지 않음", "감정 단서가 작고 제한적임", "상황에 따라 감정을 보이거나 감춤", "감정이 말과 행동에 자주 드러남", "감정을 매우 선명하고 즉각적으로 표출함"],
  guardedness: ["타인을 쉽게 믿고 경계를 거의 세우지 않음", "초기 경계가 낮고 비교적 빨리 마음을 엶", "신뢰와 경계를 상황에 맞춰 조절함", "쉽게 속내를 보이지 않고 경계를 유지함", "강한 경계로 접근과 자기 공개를 엄격히 제한함"],
  impulsivity: ["충동을 강하게 억제하고 숙고함", "대체로 생각한 뒤 행동함", "상황에 따라 숙고와 즉흥 행동이 섞임", "감정과 욕구에 따라 빠르게 행동함", "결과를 따지기 전에 매우 충동적으로 행동함"],
  relationshipPersistence: ["관계를 쉽게 놓고 오래 유지하려 하지 않음", "갈등이나 거리가 생기면 물러나기 쉬움", "관계 가치에 따라 유지 여부를 판단함", "어려움이 있어도 관계를 오래 지키려 함", "관계를 매우 끈질기게 유지하고 회복하려 함"],
};
const band = (axis, v) => BANDS[axis][v <= 20 ? 0 : v <= 40 ? 1 : v <= 60 ? 2 : v <= 80 ? 3 : 4];
// [슬롯, 카드 제목, 설명으로 보여 줄 글의 슬롯]
const METER_SLOTS = [["affinity.score", "호감도 상태", "affinity.current_appraisal"], ["affinity.taste_band", `상대별 첫인상 · ${USER}에 대해`, "affinity.appraisal"], ["openness.score", "음란도 상태", null], ["suspicion.score", "의심도 상태", null]];
const TEXT_FIELDS = [["emotionExpression", "감정 표현 방식"], ["defenseResponse", "방어 반응"], ["intimacyStyle", "친밀 표현 방식"]];
// 리수폿 화면 순서. emotion·npc는 ‘다른 NPC 간 감정·관계’ 한 칸으로 묶는다.
const ORDER = ["overview", "METRICS", "userRelationship", "appraisal", "PROFILE", "speech", "npc", "knowledge", "relationship", "behavior", "secret", "openness", "suspicion", "etc"];
const MEMBERS = { npc: ["emotion", "npc"] };
const ALWAYS = new Set(["overview", "userRelationship", "appraisal", "speech", "npc", "knowledge", "relationship", "behavior"]);
const LABEL = { overview: "인물 개요", userRelationship: `${USER}와의 관계`, appraisal: "상대별 첫인상 설명", speech: "대상별 말투", npc: "다른 NPC 간 감정·관계", knowledge: "알고 있는 정보", relationship: "관계 태도·인지 차이(심리의 실마리)", behavior: "행동 경향", secret: "비밀", openness: "음란도 태도·행동", suspicion: "불륜 의심", etc: "기타 항목" };
const SUB = { npc: "NPC가 다른 NPC에게 느끼는 감정·관계" };
const EMPTY = "아직 등록된 내용이 없습니다.";
// 자동 생성이 지금 어떤 상태인지 한 줄로: 안 만들어질 때 이유가 바로 보이게 한다.
export function autoStatusOf(M, wikiDocs = 0) {
  const rt = M.flow?.runtime?.();
  if (!rt?.auto) return { kind: "warn", text: "리수폿이 꺼져 있거나 아직 준비 중이라 위키가 자동으로 만들어지지 않아요. 리수폿 탭의 스위치를 확인해 주세요." };
  const st = rt.auto.status();
  if (!st.globalEnabled) return { kind: "warn", text: "기억이 꺼져 있어요. 켜면 다음 응답부터 위키가 만들어져요." };
  if (st.hook !== "ready") return { kind: "warn", text: `리스 연결이 아직 준비되지 않았어요(${st.hook || "대기"}). 이 채팅을 열고 새 응답을 한 번 받으면 연결돼요.` };
  if (!st.autoEnabled && !st.trackedCount) return { kind: "warn", text: "자동 기록이 꺼져 있고 추적할 인물도 없어서 위키가 자동으로 쌓이지 않아요. ‘더보기 → 추적 인물 고르기’에서 켜 주세요." };
  const base = st.autoEnabled ? "자동 생성 켜짐 · 새 응답마다 인물 문서를 갱신해요(관계 중심)" : `선택한 ${st.trackedCount}명만 자동 갱신`;
  const doing = st.phase && st.phase !== "idle" && st.phase !== "completed" ? ` · ${st.message || st.phase}` : st.message ? ` · ${st.message}` : "";
  return { kind: st.phase === "failed" ? "err" : wikiDocs ? "ok" : "info", text: base + doing + (wikiDocs ? "" : " · 아직 만들어진 인물이 없어요. 응답이 한 번 더 오면 생겨요.") };
}
const when = (iso) => { const t = Date.parse(iso); return t ? new Date(t).toLocaleString() : ""; };

const textModal = (ctx, title, value, hint) => modal(ctx.win, (done) => {
  const ta = h("textarea", { class: "rb-input", style: "min-height:160px;height:auto;padding:10px", "aria-label": title, "data-autofocus": "1" }); ta.value = value ?? "";
  return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,94vw)" }, h("h3", null, title), hint ? h("p", { class: "rb-muted" }, hint) : null, ta,
    h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done(ta.value) })));
});

export async function renderPeopleTab(env, host) {
  const m = mem(env.ctx), wiki = env.folder.wiki, ctx = env.ctx, M = ctx.memory;
  // 위키를 직접 다루는 건 플러그인 저장소 모드뿐이다. BardWiki 모드는 기존 인물 화면을 그대로 쓴다.
  if (!(env.backend.id === "local" && env.caps.analyze) || !potOn(env.idx?.settings)) return renderPeople(env, host);
  const people = env.folder.people ?? {}, docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const again = () => renderPeopleTab(env, host);
  // 위키를 고친다(저장 → 이 화면만 다시 그림). 위키가 아직 없으면 지금 열린 채팅의 범위로 새로 만든다.
  const commit = async (fn, ok) => { if (!env.folder.wiki?.documents && !liveScope(M, env.bot.id)) { try { await M.flow?.runtime?.()?.wiki?.refresh?.(); } catch { /* 아래에서 안내 */ } } return commit0(fn, ok); };
  const commit0 = (fn, ok) => M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => {
    let w = f.wiki;
    if (!w?.documents) { const sc = liveScope(M, env.bot.id); if (!sc) throw new Error("리스에서 이 봇의 이 채팅을 연 상태에서 쓸 수 있어요."); w = createEmptyWikiScope({ characterId: sc.characterId, chatKey: sc.chatKey }); }
    f.wiki = fn(w);
  }).then(() => { if (ok) ctx.toast(ok); (env.redrawView ?? env.redraw)(); }).catch(fail(ctx));

  const addBlank = async () => {
    const v = await promptDialog(ctx.win, { title: "빈 인물 직접 추가", label: "인물 이름", ok: "추가" });
    if (v?.trim()) commit((w) => createBlankPerson(w, v), "인물을 추가했어요.");
  };
  // 장기기억이 알아본 인물 중 위키 문서가 없는 사람을 한꺼번에 빈 문서로 만든다(자동 Writer는 한 응답에서 두드러진 인물만 만들기 때문).
  // {{user}}(플레이어)는 따로 문서를 만들지 않는다.
  const ui = M.flow?.runtime?.()?.wiki?.userIdentity, userSet = new Set([ui?.title, ...(ui?.aliases ?? []), "{{user}}", "user", "유저"].filter(Boolean).map((x) => String(x).trim().toLowerCase()));
  const isUser = (name) => userSet.has(String(name ?? "").trim().toLowerCase());
  const missing = Object.entries(people).filter(([, p]) => p?.name && !isUser(p.name) && !findDoc(wiki, p) && (visibleRecords(p).length || p.digest));
  const plan = fillPlan(wiki, docs.filter((d) => !isUser(d.title)));  // 실제로 비어 있는 칸 기준(수치만 빈 인물은 수치만, 본문·성격까지 빈 인물은 전체)
  const askFill = async () => {
    const lines = [...plan.full, ...plan.metricOnly].slice(0, 12).map(planLine), more = plan.total > 12 ? `\n…외 ${plan.total - 12}명` : "";
    const ok = await confirmDialog(ctx.win, { title: `AI로 빈칸 채우기 · ${plan.total}명`, body: `${lines.join("\n")}${more}\n\n이미 있는 본문·성격은 고치지 않아요. 인물마다 AI 호출이 일어나요.`, ok: "채우기 시작" });
    if (ok) await fillEmptyPeople(env, plan);
  };
  const makeMissing = () => commit((w) => { let cur = w; for (const [, p] of missing) { try { cur = createBlankPerson(cur, p.name); } catch { /* 이미 있으면 건너뜀 */ } } return cur; }, `${missing.length}명의 위키 문서를 만들었어요. 수치·성격은 각 인물에서 ‘AI 작성’으로 채워요.`);
  const autoSt = autoStatusOf(M, docs.length);
  const strip = () => h("div", { class: "rb-wk-auto" }, note(autoSt.kind, autoSt.text), h("span", { class: "rb-mem-rowact" }, plan.total && wikiEditable(env) ? btn(`AI로 빈칸 채우기 (${plan.total}명)`, { size: "sm", kind: "primary", title: "비어 있는 수치(와 본문·성격까지 빈 인물)만 채워요. 실행 전에 대상을 보여 드려요.", onClick: () => askFill().catch(fail(ctx)) }) : null, missing.length && wikiEditable(env) ? btn(`위키 없는 인물 ${missing.length}명 만들기`, { size: "sm", kind: "primary", onClick: () => makeMissing() }) : null, btn("위키 기록·다시 시도", { size: "sm", onClick: () => openWikiLog(env).catch(fail(ctx)) })));
  const top = (n) => h("div", { class: "rb-wk-headwrap" }, h("div", { class: "rb-wk-head" }, h("div", null, h("div", { class: "rb-wk-eyebrow rb-muted" }, "지금 채팅"), h("h2", null, "인물 문서")),
    h("span", { class: "rb-mem-rowact" }, h("span", { class: "rb-wk-n" }, `${n}명`), btn("인물 추가·가져오기", { size: "sm", onClick: () => openImport(env).catch(fail(ctx)) }), btn("빈 인물 직접 추가", { size: "sm", onClick: addBlank }),
      btn("더보기", { size: "sm", icon: "more", onClick: (e) => openMenu(ctx.win, e.currentTarget, peopleMenuItems(env, Object.entries(people).filter(([, p]) => visibleRecords(p).length || p.digest))) }))), strip());

  const keyOfDoc = new Map();
  for (const [k, p] of Object.entries(people)) { const d = findDoc(wiki, p); if (d) keyOfDoc.set(d.id, k); }
  const rows = docs.map((d) => ({ id: d.id, name: d.title, doc: d, pk: keyOfDoc.get(d.id) ?? null }));
  for (const [k, p] of Object.entries(people)) if (!findDoc(wiki, p) && (visibleRecords(p).length || p.digest)) rows.push({ id: `p:${k}`, name: p.name, doc: null, pk: k });

  if (!rows.length) {
    return replace(host, h("div", { class: "rb-wk" }, h("aside", { class: "rb-wk-side" }, h("div", { class: "rb-wk-count" }, "등록 인물 ", h("b", null, "0"))),
      h("div", { class: "rb-wk-main" }, top(0), h("div", { class: "rb-empty" }, icon("character", 24), h("div", null, "아직 기록된 인물이 없어요."), h("div", { class: "rb-muted" }, "인물을 추가하거나, 지난 대화를 분석해 인물을 쌓아 보세요."),
        h("div", { class: "rb-mem-sact" }, btn("인물 추가·가져오기", { kind: "primary", onClick: () => openImport(env).catch(fail(ctx)) }), btn("빈 인물 직접 추가", { onClick: addBlank }),
          btn("마지막 응답만 분석", { onClick: () => ctx.memory.runner.analyzeLatest(env.bot.index, env.chatItem.index).then(() => { ctx.toast("분석이 끝났어요."); env.redraw(); }).catch(fail(ctx)) }),
          btn("지난 대화 전체 분석", { onClick: () => { m.settingsOpen = true; env.redraw(); } }))))));
  }

  const q = (m.personSearch ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => !q || [r.name, ...(r.doc?.aliases ?? []), ...(r.doc?.tags ?? [])].some((n) => String(n).toLowerCase().includes(q)) || (r.doc?.sections ?? []).some((s) => String(s.body ?? "").toLowerCase().includes(q)));
  const sel = rows.find((r) => r.id === m.wkSel) ?? shown[0] ?? rows[0];
  m.wkSel = sel.id;
  const side = h("aside", { class: "rb-wk-side" },
    h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "이름·별칭·태그·본문", value: m.personSearch ?? "", "aria-label": "인물 검색", onChange: (e) => { m.personSearch = e.target.value; again(); } })),
    h("div", { class: "rb-wk-count" }, "등록 인물 ", h("b", null, String(rows.length))),
    h("div", { class: "rb-wk-list" }, shown.map((r) => h("button", { type: "button", class: "rb-wk-row", "aria-pressed": r.id === sel.id ? "true" : "false", onClick: () => { m.wkSel = r.id; again(); } },
      avatar(r.name, ""), h("span", { class: "txt" }, h("span", { class: "name" }, r.name), h("small", { class: "rb-muted" }, r.doc ? "인물정보 등록됨" : "이야기 기록만"))))));
  replace(host, h("div", { class: "rb-wk" }, side, h("div", { class: "rb-wk-main" }, top(rows.length), personPage(env, sel, docs, commit))));
}

function personPage(env, r, docs, commit) {
  const { ctx } = env, m = mem(ctx), wiki = env.folder.wiki, doc = r.doc, p = r.pk ? env.folder.people[r.pk] : null;
  const ed = !!doc && wikiEditable(env), st = { docId: doc?.id }, sk = scopeKeyOf(wiki);
  const closed = (m.wkClosed ??= {}), again = () => (env.redrawView ?? env.redraw)();
  const others = (docs ?? []).filter((d) => d.id !== doc?.id);
  const nameOf = (ref) => ref === "actor:user" ? USER : (docs.find((d) => d.id === ref)?.title ?? "");
  const badge = (n) => h("span", { class: "rb-wk-n" }, String(n));
  const run = (pr) => Promise.resolve(pr).catch(fail(ctx));
  const aiOpen = (tab) => run(openAITools(env, doc, p ?? { name: doc.title }, tab));

  // ---- 새 항목을 AI로: 종류·대상을 고르고 AI 작성 창을 연다
  const aiNew = async (g) => {
    if (g === "overview") { const ov = groups.overview?.[0]; return openFieldAI(env, doc, ov ? `section:${ov.id}` : "new:overview", "인물 개요 AI 작성"); }
    const info = groupInfo(g === "npc" ? "npc" : g); if (!info) return;
    const pick = await modal(ctx.win, (done) => {
      const slotSel = h("select", { class: "rb-input", "aria-label": "항목 종류" }, info.slots.map(([id, label]) => h("option", { value: id }, label)));
      const tgtSel = h("select", { class: "rb-input", "aria-label": "대상" });
      const fill = () => { const mode = info.slots.find(([id]) => id === slotSel.value)?.[2]; tgtSel.disabled = mode === "none" || mode === "user"; tgtSel.hidden = tgtSel.disabled; replace(tgtSel, ...(mode === "optional" ? [h("option", { value: "" }, "대상 없음")] : []), ...(mode === "npc" ? [] : [h("option", { value: "actor:user" }, USER)]), ...(mode === "user" ? [] : others.map((d) => h("option", { value: d.id }, d.title)))); };
      slotSel.addEventListener("change", fill); fill();
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(460px,94vw)" }, h("h3", null, `${LABEL[g] ?? g} · AI 작성`), h("p", { class: "rb-muted" }, "어떤 항목을 쓸지 골라 주세요."), slotSel, tgtSel,
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("작성", { kind: "primary", onClick: () => { const mode = info.slots.find(([id]) => id === slotSel.value)?.[2]; done({ slotId: slotSel.value, targetRef: mode === "user" ? "actor:user" : tgtSel.disabled ? "" : tgtSel.value }); } })));
    });
    if (pick) openFieldAI(env, doc, "new:record:" + encodeURIComponent(JSON.stringify({ group: info.id, slotId: pick.slotId, targetRef: pick.targetRef })), `${LABEL[g] ?? g} AI 작성`).catch(fail(ctx));
  };

  // ---- 항목 카드(리수폿: 📌 편집 삭제 AI 작성)
  const secCard = (s) => {
    const slot = s.provenance?.slotId, g = recordGroupOf(s), info = RECORD_GROUPS.find((x) => x.id === g)?.slots.find(([id]) => id === slot);
    const targets = (s.provenance?.targetRefs ?? []).map(nameOf).filter(Boolean).join(", ");
    const meta = [targets && `대상 · ${targets}`, info?.[1]].filter(Boolean).join(" · ");
    return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, s.heading || s.title || "항목"), h("span", { style: "flex:1" }),
      ed ? h("span", { class: "rb-mem-rowact" }, pinBtn(env, st, sectionPinKey(s.id)),
        btn("편집", { size: "sm", onClick: () => run(editWikiText(env, st, { label: s.heading || "항목", body: s.body, sectionId: s.id })) }),
        btn("삭제", { size: "sm", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: s.heading || "", ok: "삭제", danger: true }))) return; commit((w) => deletePersonItem(w, doc.id, { id: s.id, kind: "section", expected: JSON.stringify(doc.sections.find((x) => x.id === s.id)), scopeKey: scopeKeyOf(w) }), "지웠어요."); } }),
        btn("AI 작성", { size: "sm", onClick: () => run(openFieldAI(env, doc, `section:${s.id}`, `${s.heading || "항목"} AI 작성`)) })) : null),
      meta ? h("div", { class: "rb-wk-meta rb-muted" }, meta) : null, h("p", { class: "rb-wk-body" }, s.body));
  };

  const section = (id, title, kids, count, extra, sub) => h("section", { class: "rb-wk-sec" },
    h("div", { class: "rb-wk-sh" }, h("div", null, h("h3", null, h("span", { class: "rb-muted" }, "# "), title), sub ? h("div", { class: "rb-wk-meta rb-muted" }, sub) : null), count != null ? badge(`${count}개`) : null, h("span", { style: "flex:1" }), extra ?? null,
      btn(closed[id] ? "펼치기" : "접기", { size: "sm", onClick: () => { closed[id] = !closed[id]; again(); } })),
    closed[id] ? null : kids);
  const groupBtns = (g) => !ed ? null : h("span", { class: "rb-mem-rowact" }, btn("직접 추가", { size: "sm", onClick: () => run(openRecords(env, doc, { group: g === "npc" ? "npc" : g })) }), btn("AI 작성", { size: "sm", onClick: () => run(aiNew(g)) }));

  // ---- 수치 상태
  const addMetricFlow = async (slotId, label) => {
    const policy = policyOf(env, slotId); if (!policy) return ctx.toast("이 수치는 직접 지정할 수 없어요.", { error: true });
    const res = await modal(ctx.win, (done) => {
      const val = h("input", { class: "rb-input", type: "number", min: policy.minimum, max: policy.maximum, value: "0", "aria-label": "값" }), why = h("input", { class: "rb-input", placeholder: "이유 (비우면 ‘사용자 직접 지정’)", "aria-label": "이유" });
      const sus = slotId === "suspicion.score", sel = (a) => h("select", { class: "rb-input", "aria-label": a }, others.map((d) => h("option", { value: d.id }, d.title)));
      const a = sus ? sel("관계 상대") : null, b = sus ? sel("의심 상대") : null;
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(460px,94vw)" }, h("h3", null, `${label} 직접 지정`),
        h("p", { class: "rb-muted" }, `값 ${policy.minimum}~${policy.maximum}${slotId.startsWith("affinity.") ? ` · 대상은 ${USER}예요.` : ""}${sus ? " · 관계 상대와 의심 상대를 골라 주세요." : ""}`), val, why, a, b,
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("지정", { kind: "primary", onClick: () => done({ value: Number(val.value), reason: why.value, targetRefs: sus ? [a.value, b.value] : slotId.startsWith("affinity.") ? ["actor:user"] : [] }) })));
    });
    if (res) commit((w) => addMetric(w, doc.id, { slotId, ...res }, policy), "수치를 지정했어요.");
  };
  const metricCard = (x, slotId, label, descSlot) => {
    if (!x) return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, label), h("span", { style: "flex:1" }), ed && policyOf(env, slotId) ? btn("편집", { size: "sm", onClick: () => run(addMetricFlow(slotId, label)) }) : null), h("p", { class: "rb-wk-unset" }, "미지정"));
    const min = x.minimum ?? 0, max = x.maximum ?? 100, pct = Math.round(((x.value - min) / Math.max(1, max - min)) * 100), item = { label, value: x.value, min, max, metricId: x.id, slotId: x.slotId };
    const tg = (x.targetRefs ?? []).map(nameOf).filter(Boolean).join(" → "), desc = descSlot ? doc.sections.find((s) => s.provenance?.slotId === descSlot && JSON.stringify(s.provenance?.targetRefs ?? []) === JSON.stringify(x.targetRefs ?? []))?.body : "";
    return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, label), h("span", { style: "flex:1" }),
      ed ? h("span", { class: "rb-mem-rowact" }, pinBtn(env, st, metricPinKey(x.id)), policyOf(env, x.slotId) ? btn("편집", { size: "sm", onClick: () => run(editMetric(env, st, item)) }) : null,
        btn("삭제", { size: "sm", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 수치를 지울까요?", body: label, ok: "삭제", danger: true }))) return; commit((w) => deletePersonItem(w, doc.id, { id: x.id, kind: "metric", expected: JSON.stringify(doc.metrics.find((y) => y.id === x.id)), scopeKey: scopeKeyOf(w) }), "지웠어요."); } })) : null,
      h("b", { class: "rb-wk-val" }, `${x.value}/${max}`)),
      tg ? h("div", { class: "rb-wk-meta rb-muted" }, `대상 · ${tg}`) : null, x.lastDelta ? h("span", { class: "rb-wk-delta" }, `이번 턴 ${x.lastDelta > 0 ? "+" : ""}${x.lastDelta}`) : null,
      h("div", { class: "rb-wk-bar", role: "progressbar", "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": x.value }, h("i", { style: { width: `${Math.max(0, Math.min(100, pct))}%` } })),
      h("div", { class: "rb-wk-range rb-muted" }, h("span", null, `전체 ${min}~${max}`), h("span", null, x.stageLabel ?? ""), h("span", null, x.lastDelta ? `최근 ${x.lastDelta > 0 ? "+" : ""}${x.lastDelta}` : "")),
      desc ? h("p", { class: "rb-wk-body" }, desc.length > 200 ? desc.slice(0, 200) + "…" : desc) : null);
  };
  const metricCards = () => {
    if (!doc) return [];
    const known = new Set(METER_SLOTS.map(([s]) => s)), out = [];
    for (const [slot, label, desc] of METER_SLOTS) { const list = doc.metrics.filter((x) => x.slotId === slot); if (!list.length) out.push(metricCard(null, slot, label)); else for (const x of list) out.push(metricCard(x, slot, label, desc)); }
    for (const x of doc.metrics.filter((y) => !known.has(y.slotId))) out.push(metricCard(x, x.slotId, x.slotId));
    return out;
  };

  const groups = {};
  for (const s of doc?.sections ?? []) { if (!s?.body?.trim()) continue; (groups[recordGroupOf(s) ?? "etc"] ??= []).push(s); }

  // ---- 기본 성격(프로필)
  const profile = wiki?.people?.profiles?.[doc?.id];
  const editProfileAll = async () => {
    const res = await modal(ctx.win, (done) => {
      const ta = (v, rows) => { const t = h("textarea", { class: "rb-input", rows, style: "height:auto;padding:10px" }); t.value = v ?? ""; return t; };
      const f = { summary: ta(profile.summary, 4), coreTraits: ta((profile.coreTraits ?? []).join(", "), 2), values: ta((profile.values ?? []).join(", "), 2), emotionExpression: ta(profile.emotionExpression, 3), defenseResponse: ta(profile.defenseResponse, 3), intimacyStyle: ta(profile.intimacyStyle, 3) };
      const ax = Object.fromEntries(PROFILE_AXES.map((a) => [a, h("input", { type: "number", min: 0, max: 100, class: "rb-input", value: String(profile.axes?.[a] ?? 50), "aria-label": AXIS_LABEL[a] })]));
      const fld = (label, el) => h("label", { class: "rb-mem-field" }, h("span", null, label), el);
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(640px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, "기본 성격 직접 수정"), h("p", { class: "rb-muted" }, "📌 고정한 칸은 고쳐도 그대로 남아요. 기질·가치는 쉼표로 나눠 적어요."),
        fld("성격 요약", f.summary), fld("핵심 기질", f.coreTraits), fld("중요 가치", f.values), fld("감정 표현 방식", f.emotionExpression), fld("방어 반응", f.defenseResponse), fld("친밀 표현 방식", f.intimacyStyle),
        h("div", { class: "rb-wk-grid" }, PROFILE_AXES.map((a) => fld(`${AXIS_LABEL[a]} (0~100)`, ax[a]))),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ summary: f.summary.value, coreTraits: listOf(f.coreTraits.value), values: listOf(f.values.value), emotionExpression: f.emotionExpression.value, defenseResponse: f.defenseResponse.value, intimacyStyle: f.intimacyStyle.value, axes: Object.fromEntries(PROFILE_AXES.map((a) => [a, Math.max(0, Math.min(100, Math.round(Number(ax[a].value) || 0)))])) }) })));
    });
    if (res) commit((w) => editProfile(w, doc.id, res), "고쳤어요.");
  };
  const pin = (key) => ed ? pinBtn(env, st, key) : null;
  const profileBlock = () => {
    if (!doc) return null;
    if (!profile) return section("PROFILE", "기본 성격", h("p", { class: "rb-wk-empty rb-muted" }, "아직 기본 성격이 없습니다. 만든 뒤 직접 쓰거나 AI로 채워요."), null, ed ? btn("기본 성격 만들기", { size: "sm", onClick: () => commit((w) => ensureProfile(w, doc.id), "만들었어요. 이제 직접 수정이나 AI 작성을 쓸 수 있어요.") }) : null);
    const chips = (a) => h("div", { class: "rb-mem-chats" }, a.map((t) => h("span", { class: "rb-chip" }, `#${t}`)));
    const card = (title, key, body, wide) => h("article", { class: ["rb-wk-card", wide && "wide"] }, h("div", { class: "rb-wk-ch" }, h("b", null, title), h("span", { style: "flex:1" }), pin(key)), body);
    return section("PROFILE", "기본 성격", h("div", { class: "rb-wk-grid" },
      card("성격 요약", "summary", h("p", { class: "rb-wk-body" }, profile.summary || "미작성"), true),
      (profile.coreTraits ?? []).length ? card("핵심 기질", "coreTraits", chips(profile.coreTraits), true) : null,
      PROFILE_AXES.map((a) => { const v = profile.axes?.[a] ?? 50; return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, AXIS_LABEL[a]), pin(`axis:${a}`), h("span", { style: "flex:1" }), h("b", { class: "rb-wk-val" }, `${v}/100`)), h("div", { class: "rb-wk-bar" }, h("i", { style: { width: `${v}%` } })), h("div", { class: "rb-wk-meta rb-muted" }, band(a, v))); }),
      (profile.values ?? []).length ? card("중요 가치", "values", h("p", { class: "rb-wk-body" }, profile.values.join(" · "))) : null,
      TEXT_FIELDS.filter(([k]) => profile[k]).map(([k, l]) => card(l, k, h("p", { class: "rb-wk-body" }, profile[k]))),
      profile.updatedAt ? h("div", { class: "rb-wk-meta rb-muted wide" }, `마지막 갱신 ${when(profile.updatedAt)}`) : null), null,
      ed ? h("span", { class: "rb-mem-rowact" }, btn("직접 수정", { size: "sm", onClick: () => run(editProfileAll()) }), btn("AI 작성", { size: "sm", onClick: () => run(openFieldAI(env, doc, "profile:personality", "기본 성격 AI 작성")) })) : null);
  };

  // ---- 문서 관리: 이름 · 별칭 · 태그 · 연결 문서 (+ Dusk 포함 방식·기록 쉬기)
  const manage = () => {
    const nm = h("input", { class: "rb-input", value: doc?.title ?? r.name, "aria-label": "이름" }), al = h("input", { class: "rb-input", value: (doc?.aliases ?? p?.aliases ?? []).join(", "), "aria-label": "별칭" }), tg = h("input", { class: "rb-input", value: (doc?.tags ?? []).join(", "), "aria-label": "태그" });
    const linked = new Set(doc?.links ?? []), checks = others.map((d) => ({ d, el: h("input", { type: "checkbox", checked: linked.has(d.id) }) }));
    const extra = (doc?.links ?? []).filter((l) => !others.some((d) => d.id === l));
    const fld = (label, el) => h("label", { class: "rb-mem-field" }, h("span", null, label), el);
    return h("details", { class: "rb-wk-manage", open: !!m.wkManage, onToggle: (e) => { m.wkManage = e.target.open; } }, h("summary", null, h("b", null, "문서 관리"), h("span", { class: "rb-muted" }, " 이름 · 별칭 · 태그 · 연결 문서")),
      h("div", { class: "rb-wk-mbody" },
        doc ? h("div", { class: "rb-wk-form" }, fld("이름", nm), fld("별칭 (쉼표로 구분)", al), fld("태그 (쉼표로 구분)", tg),
          others.length ? h("div", { class: "rb-mem-field" }, h("span", null, "연결 문서"), h("div", { class: "rb-mem-chats" }, checks.map(({ d, el }) => h("label", { class: "rb-mem-check" }, el, d.title)))) : null,
          h("div", { class: "rb-mem-sact" }, btn("문서 정보 저장", { kind: "primary", disabled: !ed, onClick: () => commit((w) => editDocMeta(w, doc.id, { title: nm.value, aliases: listOf(al.value), tags: listOf(tg.value), links: [...checks.filter((c) => c.el.checked).map((c) => c.d.id), ...extra] }), "저장했어요.") })))
          : h("div", null, h("p", { class: "rb-muted" }, "이 인물은 아직 위키 문서가 없어요."), btn("위키 문서 만들기", { kind: "primary", onClick: () => commit((w) => createBlankPerson(w, r.name), "위키 문서를 만들었어요.") })),
        p ? h("div", { class: "rb-mem-sact" },
          btn(p.pinned ? "고정됨" : "고정", { size: "sm", onClick: () => editFolder(env, (f) => { f.people[r.pk].pinned = !f.people[r.pk].pinned; }) }),
          btn({ always: "항상 포함", never: "제외", auto: "자동(관련 시)" }[p.ctx ?? (p.pinned ? "always" : "auto")], { size: "sm", title: "프롬프트 포함 방식: 자동 → 항상 → 제외", onClick: () => editFolder(env, (f) => { const q = f.people[r.pk], c = q.ctx ?? (q.pinned ? "always" : "auto"); q.ctx = { auto: "always", always: "never", never: "auto" }[c]; }) }),
          btn(isPaused(env.idx.bots?.[env.bot.id]?.ignore, p) ? "⏸ 기록 쉬는 중" : "⏸ 기록 쉬기", { size: "sm", onClick: () => pausePerson(env, p) }),
          btn("이 인물로 새 봇 만들기", { size: "sm", onClick: () => { m.compose = { keys: [r.pk] }; m.ctab = "compose"; ctx.go("cards"); } })) : null));
  };

  // ---- 항목 묶음 블록
  const blocks = ORDER.map((id) => {
    if (id === "PROFILE") return profileBlock();
    if (id === "METRICS") return doc ? section("metrics", "수치 상태", h("div", { class: "rb-wk-grid" }, metricCards()), doc.metrics.length) : null;
    if (!doc) return null;
    const secs = (MEMBERS[id] ?? [id]).flatMap((g) => groups[g] ?? []);
    if (!secs.length && !ALWAYS.has(id)) return null;
    let list = secs, foot = null;
    if (id === "speech" && secs.length) {   // 리수폿처럼 ‘나’ 대상 말투를 먼저, 다른 NPC 대상은 펼쳐서 본다
      const mine = secs.filter((s) => (s.provenance?.targetRefs ?? []).includes("actor:user")), rest = secs.filter((s) => !mine.includes(s)), open = !!(m.wkSpeech ??= {})[doc.id];
      list = open ? [...mine, ...rest] : mine;
      if (rest.length) foot = h("div", { class: "rb-wk-foot" }, btn(open ? "접기" : "펼치기", { size: "sm", onClick: () => { m.wkSpeech[doc.id] = !open; again(); } }), h("span", { class: "rb-muted" }, `다른 NPC 대상 말투 ${rest.length}개`));
    }
    return section(id, LABEL[id], secs.length ? h("div", { class: "rb-wk-stack" }, list.map(secCard), foot) : h("p", { class: "rb-wk-empty rb-muted" }, EMPTY), secs.length, groupBtns(id), SUB[id]);
  });

  const story = p ? h("div", { class: "rb-wk-story" }) : null;
  if (p) personDetail(env, story, r.pk, true);

  return h("div", { class: "rb-wk-page" },
    h("div", { class: "rb-wk-title" }, h("h3", null, r.name), h("span", { style: "flex:1" }),
      ed ? h("span", { class: "rb-mem-rowact" }, btn("요약 정리", { size: "sm", onClick: () => aiOpen("refresh") }), btn("직접 지시하기", { size: "sm", onClick: () => aiOpen("command") }),
        btn("인물 삭제", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: `${r.name} 인물을 지울까요?`, body: "인물 문서와 기본 성격이 함께 지워져요. 📌 고정한 항목이 남아 있으면 먼저 풀어야 해요.", ok: "삭제", danger: true })) { m.wkSel = ""; commit((w) => removePerson(w, doc.id), "지웠어요."); } } })) : null),
    manage(), ...blocks,
    ed && env.advanced ? wikiPanel(env, doc) : null,
    story ? section("story", "이야기 기록", story, null, null, "사건 · 관계 · 상태 · 약속을 한 목록으로 봐요. 항목 오른쪽 ‘수정’으로 고치거나 지워요.") : null);
}
