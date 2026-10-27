// 인물 위키 화면: 리수폿의 배치(왼쪽 인물 목록 + 오른쪽 인물 문서)에 Dusk의 이야기 기록을 한 페이지로 합친다.
// 생김새는 Dusk 토큰·카드 스타일을 쓰고, 배치·항목 순서·수정 규칙(고정·편집 중 변경 거절)은 리수폿을 따른다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, confirmDialog, promptDialog } from "../../kit.js";
import { mem, fail, avatar, visibleRecords } from "./common.js";
import { findDoc } from "../../../engine/personview.js";
import { RECORD_GROUPS, recordGroupOf } from "../../../engine/personrecords.js";
import { sectionPinKey, metricPinKey, scopeKeyOf, isPaused } from "../../../engine/personedit.js";
import { deletePersonItem } from "../../../engine/pot/people-records.js";
import { renderPeople, personDetail, wikiEditable, wikiEdit, editMetric, editWikiText, pinBtn, policyOf, editFolder, pausePerson } from "./people.js";
import { openRecords } from "./recordsui.js";
import { openAITools } from "./aitools.js";

const AXES = [["relationalInitiative", "관계 주도성"], ["expressionDirectness", "표현 직접성"], ["emotionalExpressiveness", "감정 표출성"], ["guardedness", "경계 성향"], ["impulsivity", "충동성"], ["relationshipPersistence", "관계 지속성"]];
const BANDS = {
  relationalInitiative: ["관계를 거의 먼저 시작하지 않음", "상대가 이끌 때 주로 반응함", "상황에 따라 주도와 반응을 오감", "필요하면 먼저 다가가 관계를 이끔", "지속적으로 관계의 방향을 주도함"],
  expressionDirectness: ["뜻을 거의 직접 말하지 않음", "돌려 말하거나 암시를 선호함", "상황에 따라 직접성과 완곡함을 조절함", "의도와 요구를 비교적 분명히 말함", "생각과 의도를 매우 직접적으로 표현함"],
  emotionalExpressiveness: ["감정을 거의 겉으로 드러내지 않음", "감정 단서가 작고 제한적임", "상황에 따라 감정을 보이거나 감춤", "감정이 말과 행동에 자주 드러남", "감정을 매우 선명하고 즉각적으로 표출함"],
  guardedness: ["타인을 쉽게 믿고 경계를 거의 세우지 않음", "초기 경계가 낮고 비교적 빨리 마음을 엶", "신뢰와 경계를 상황에 맞춰 조절함", "쉽게 속내를 보이지 않고 경계를 유지함", "강한 경계로 접근과 자기 공개를 엄격히 제한함"],
  impulsivity: ["충동을 강하게 억제하고 숙고함", "대체로 생각한 뒤 행동함", "상황에 따라 숙고와 즉흥 행동이 섞임", "감정과 욕구에 따라 빠르게 행동함", "결과를 따지기 전에 매우 충동적으로 행동함"],
  relationshipPersistence: ["관계를 쉽게 놓고 오래 유지하려 하지 않음", "갈등이나 거리가 생기면 물러나기 쉬움", "관계 가치에 따라 유지 여부를 판단함", "어려움이 있어도 관계를 오래 지키려 함", "관계를 매우 끈질기게 유지하고 회복하려 함"],
};
const band = (axis, v) => BANDS[axis][v <= 20 ? 0 : v <= 40 ? 1 : v <= 60 ? 2 : v <= 80 ? 3 : 4];
const METER_SLOTS = [["affinity.score", "호감도 상태"], ["suspicion.score", "의심도 상태"], ["openness.score", "음란도 상태"]];
const TEXT_FIELDS = [["emotionExpression", "감정 표현 방식"], ["defenseResponse", "방어 반응"], ["intimacyStyle", "친밀 표현 방식"]];
// 리수폿 화면 순서. emotion·npc는 ‘다른 NPC 간 감정·관계’ 한 칸으로 묶는다.
const ORDER = [["overview", ["overview"]], ["METRICS", []], ["userRelationship", ["userRelationship"]], ["appraisal", ["appraisal"]], ["PROFILE", []], ["speech", ["speech"]], ["npc", ["emotion", "npc"]], ["knowledge", ["knowledge"]], ["relationship", ["relationship"]], ["behavior", ["behavior"]], ["secret", ["secret"]], ["openness", ["openness"]], ["suspicion", ["suspicion"]], ["etc", ["etc"]]];
const LABEL = { npc: "다른 NPC 간 감정·관계", appraisal: "상대별 첫인상·평가", etc: "기타 항목" };
const groupLabel = (id) => LABEL[id] ?? RECORD_GROUPS.find((g) => g.id === id)?.label ?? id;
const when = (iso) => { const t = Date.parse(iso); return t ? new Date(t).toLocaleString() : ""; };

export async function renderPeopleTab(env, host) {
  const m = mem(env.ctx), wiki = env.folder.wiki;
  // 위키를 직접 다루는 건 플러그인 저장소 모드뿐이다. BardWiki 모드는 기존 인물 화면을 그대로 쓴다.
  if (!(env.backend.id === "local" && env.caps.analyze)) return renderPeople(env, host);
  const people = env.folder.people ?? {}, docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const keyOfDoc = new Map();
  for (const [k, p] of Object.entries(people)) { const d = findDoc(wiki, p); if (d) keyOfDoc.set(d.id, k); }
  const rows = docs.map((d) => ({ id: d.id, name: d.title, doc: d, pk: keyOfDoc.get(d.id) ?? null }));
  for (const [k, p] of Object.entries(people)) if (!findDoc(wiki, p) && (visibleRecords(p).length || p.digest)) rows.push({ id: `p:${k}`, name: p.name, doc: null, pk: k });
  if (!rows.length) return renderPeople(env, host);   // 아직 아무도 없으면 기존 안내(분석 버튼)를 보여 준다

  const q = (m.personSearch ?? "").trim().toLowerCase();
  const shown = rows.filter((r) => !q || [r.name, ...(r.doc?.aliases ?? []), ...(r.doc?.tags ?? [])].some((n) => String(n).toLowerCase().includes(q)) || (r.doc?.sections ?? []).some((s) => String(s.body ?? "").toLowerCase().includes(q)));
  const sel = rows.find((r) => r.id === m.wkSel) ?? shown[0] ?? rows[0];
  m.wkSel = sel.id;
  const again = () => renderPeopleTab(env, host);

  const side = h("aside", { class: "rb-wk-side" },
    h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "이름·별칭·태그·본문", value: m.personSearch ?? "", "aria-label": "인물 검색", onChange: (e) => { m.personSearch = e.target.value; again(); } })),
    h("div", { class: "rb-wk-count" }, "등록 인물 ", h("b", null, String(rows.length))),
    h("div", { class: "rb-wk-list" }, shown.map((r) => h("button", { type: "button", class: "rb-wk-row", "aria-pressed": r.id === sel.id ? "true" : "false", onClick: () => { m.wkSel = r.id; again(); } },
      avatar(r.name, ""), h("span", { class: "txt" }, h("span", { class: "name" }, r.name), h("small", { class: "rb-muted" }, r.doc ? "인물정보 등록됨" : "이야기 기록만"))))));
  const main = h("div", { class: "rb-wk-main" }, personPage(env, sel, docs, again));
  replace(host, h("div", { class: "rb-wk" }, side, main));
}

function personPage(env, r, docs, again) {
  const { ctx } = env, m = mem(ctx), wiki = env.folder.wiki, doc = r.doc, p = r.pk ? env.folder.people[r.pk] : null;
  const ed = !!doc && wikiEditable(env), st = { docId: doc?.id };
  const closed = (m.wkClosed ??= {});
  const nameOf = (ref) => ref === "actor:user" ? "나" : (docs.find((d) => d.id === ref || d.id === String(ref).replace(/^[a-z]+:/, ""))?.title ?? "");
  const badge = (n) => h("span", { class: "rb-wk-n" }, String(n));

  const secCard = (s) => {
    const slot = s.provenance?.slotId, g = recordGroupOf(s), info = RECORD_GROUPS.find((x) => x.id === g)?.slots.find(([id]) => id === slot);
    const targets = (s.provenance?.targetRefs ?? []).map(nameOf).filter(Boolean).join(", ");
    const meta = [targets && `대상 · ${targets}`, info?.[1]].filter(Boolean).join(" · ");
    return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, s.heading || s.title || "항목"),
      ed ? h("span", { class: "rb-mem-rowact" }, pinBtn(env, st, sectionPinKey(s.id)),
        btn("편집", { size: "sm", onClick: () => editWikiText(env, st, { label: s.heading || "항목", body: s.body, sectionId: s.id }).catch(fail(ctx)) }),
        btn("삭제", { size: "sm", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: s.heading || "", ok: "삭제", danger: true }))) return; wikiEdit(env, (w) => deletePersonItem(w, doc.id, { id: s.id, kind: "section", expected: JSON.stringify(doc.sections.find((x) => x.id === s.id)), scopeKey: scopeKeyOf(w) }), "지웠어요.").catch(fail(ctx)); } })) : null),
      meta ? h("div", { class: "rb-wk-meta rb-muted" }, meta) : null, h("p", { class: "rb-wk-body" }, s.body));
  };
  const section = (id, title, kids, count, extra) => h("section", { class: "rb-wk-sec" },
    h("div", { class: "rb-wk-sh" }, h("h3", null, h("span", { class: "rb-muted" }, "# "), title), count != null ? badge(count) : null, h("span", { style: "flex:1" }), extra ?? null,
      btn(closed[id] ? "펼치기" : "접기", { size: "sm", onClick: () => { closed[id] = !closed[id]; again(); } })),
    closed[id] ? null : kids);

  const addBtns = (g) => !ed ? null : h("span", { class: "rb-mem-rowact" }, btn("직접 추가", { size: "sm", onClick: () => openRecords(env, doc).catch(fail(ctx)) }),
    env.advanced ? btn("AI 작성", { size: "sm", onClick: () => openAITools(env, doc, p ?? { name: doc.title }).catch(fail(ctx)) }) : null);

  const metricCard = (x, slot) => {
    const label = (slot && METER_SLOTS.find(([s]) => s === slot)?.[1]) ?? x?.label ?? x?.title ?? x?.slotId ?? "수치";
    if (!x) return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, label)), h("p", { class: "rb-wk-unset" }, "미지정"));
    const min = x.minimum ?? 0, max = x.maximum ?? 100, pct = Math.round(((x.value - min) / Math.max(1, max - min)) * 100);
    const item = { label, value: x.value, min, max, metricId: x.id, slotId: x.slotId };
    return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, label), h("span", { style: "flex:1" }), ed ? h("span", { class: "rb-mem-rowact" }, pinBtn(env, st, metricPinKey(x.id)),
      policyOf(env, x.slotId) ? btn("편집", { size: "sm", onClick: () => editMetric(env, st, item).catch(fail(ctx)) }) : null) : null, h("b", { class: "rb-wk-val" }, `${x.value}/${max}`)),
      x.lastDelta ? h("span", { class: "rb-wk-delta" }, `이번 턴 ${x.lastDelta > 0 ? "+" : ""}${x.lastDelta}`) : null,
      h("div", { class: "rb-wk-bar", role: "progressbar", "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": x.value }, h("i", { style: { width: `${Math.max(0, Math.min(100, pct))}%` } })),
      h("div", { class: "rb-wk-range rb-muted" }, h("span", null, `전체 ${min}~${max}`), h("span", null, x.stageLabel ?? "")));
  };

  const bySlot = new Map((doc?.metrics ?? []).map((x) => [x.slotId, x]));
  const std = new Set(METER_SLOTS.map(([s]) => s));
  const metrics = doc ? [...METER_SLOTS.map(([s]) => metricCard(bySlot.get(s), s)), ...(doc.metrics ?? []).filter((x) => !std.has(x.slotId)).map((x) => metricCard(x))] : [];

  const groups = {};
  for (const s of doc?.sections ?? []) { if (!s?.body?.trim()) continue; (groups[recordGroupOf(s) ?? "etc"] ??= []).push(s); }

  const profile = wiki?.people?.profiles?.[doc?.id];
  const profileBlock = () => {
    if (!profile) return null;
    const list = (a) => (a ?? []).length ? h("div", { class: "rb-mem-chats" }, a.map((t) => h("span", { class: "rb-chip" }, `#${t}`))) : null;
    return section("PROFILE", "기본 성격", h("div", { class: "rb-wk-grid" },
      profile.summary ? h("article", { class: "rb-wk-card wide" }, h("div", { class: "rb-wk-ch" }, h("b", null, "성격 요약")), h("p", { class: "rb-wk-body" }, profile.summary)) : null,
      (profile.coreTraits ?? []).length ? h("article", { class: "rb-wk-card wide" }, h("div", { class: "rb-wk-ch" }, h("b", null, "핵심 기질")), list(profile.coreTraits)) : null,
      AXES.map(([k, l]) => { const v = profile.axes?.[k] ?? 50; return h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, l), h("span", { style: "flex:1" }), h("b", { class: "rb-wk-val" }, `${v}/100`)), h("div", { class: "rb-wk-bar" }, h("i", { style: { width: `${v}%` } })), h("div", { class: "rb-wk-range rb-muted" }, band(k, v))); }),
      (profile.values ?? []).length ? h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, "중요 가치")), h("p", { class: "rb-wk-body" }, profile.values.join(" · "))) : null,
      TEXT_FIELDS.filter(([k]) => profile[k]).map(([k, l]) => h("article", { class: "rb-wk-card" }, h("div", { class: "rb-wk-ch" }, h("b", null, l)), h("p", { class: "rb-wk-body" }, profile[k]))),
      profile.updatedAt ? h("div", { class: "rb-wk-meta rb-muted wide" }, `마지막 갱신 ${when(profile.updatedAt)}`) : null), null,
      env.advanced && ed ? h("span", { class: "rb-mem-rowact" }, btn("AI 작성", { size: "sm", onClick: () => openAITools(env, doc, p ?? { name: doc.title }).catch(fail(ctx)) })) : null);
  };

  const manage = h("details", { class: "rb-wk-manage" }, h("summary", null, h("b", null, "문서 관리"), h("span", { class: "rb-muted" }, " 이름 · 별칭 · 태그 · 포함 방식")),
    h("div", { class: "rb-wk-mbody" },
      h("div", null, h("b", null, "이름 "), r.name, (doc?.aliases ?? p?.aliases ?? []).length ? h("span", { class: "rb-muted" }, `  별칭: ${(doc?.aliases?.length ? doc.aliases : p.aliases).join(", ")}`) : null),
      (doc?.tags ?? []).length ? h("div", { class: "rb-mem-chats" }, doc.tags.map((t) => h("span", { class: "rb-chip" }, `#${t}`))) : null,
      p ? h("div", { class: "rb-mem-sact" },
        btn("별칭 편집", { size: "sm", onClick: async () => { const v = await promptDialog(ctx.win, { title: "별칭 편집", label: "쉼표로 구분", value: (p.aliases ?? []).join(", "), ok: "저장" }); if (v != null) editFolder(env, (f) => { f.people[r.pk].aliases = v.split(",").map((s) => s.trim()).filter(Boolean); }); } }),
        btn(p.pinned ? "고정됨" : "고정", { size: "sm", onClick: () => editFolder(env, (f) => { f.people[r.pk].pinned = !f.people[r.pk].pinned; }) }),
        btn({ always: "항상 포함", never: "제외", auto: "자동(관련 시)" }[p.ctx ?? (p.pinned ? "always" : "auto")], { size: "sm", title: "프롬프트 포함 방식: 자동 → 항상 → 제외", onClick: () => editFolder(env, (f) => { const q = f.people[r.pk], c = q.ctx ?? (q.pinned ? "always" : "auto"); q.ctx = { auto: "always", always: "never", never: "auto" }[c]; }) }),
        btn(isPaused(env.idx.bots?.[env.bot.id]?.ignore, p) ? "⏸ 기록 쉬는 중" : "⏸ 기록 쉬기", { size: "sm", onClick: () => pausePerson(env, p) }),
        btn("이 인물로 새 봇 만들기", { size: "sm", kind: "primary", onClick: () => { m.compose = { keys: [r.pk] }; m.ctab = "compose"; ctx.go("cards"); } })) : null));

  const blocks = ORDER.map(([id, gs]) => {
    if (id === "METRICS") return doc ? section("metrics", "수치 상태", h("div", { class: "rb-wk-grid" }, metrics), metrics.length) : null;
    if (id === "PROFILE") return profileBlock();
    const secs = gs.flatMap((g) => groups[g] ?? []);
    if (!secs.length) return null;
    return section(id, groupLabel(id), h("div", { class: "rb-wk-stack" }, secs.map(secCard)), secs.length, addBtns(id));
  });

  const story = p ? h("div", { class: "rb-wk-story" }) : null;
  if (p) personDetail(env, story, r.pk, true);

  return h("div", { class: "rb-wk-page" },
    h("div", { class: "rb-wk-head" }, h("div", null, h("div", { class: "rb-wk-eyebrow rb-muted" }, "CURRENT CHAT / PEOPLE"), h("h2", null, "인물 위키")), badge(`${rows_count(docs, env)}명`)),
    h("div", { class: "rb-wk-title" }, h("h3", null, r.name), h("span", { style: "flex:1" }),
      ed && env.advanced ? btn("요약 정리·직접 지시", { size: "sm", onClick: () => openAITools(env, doc, p ?? { name: doc.title }).catch(fail(ctx)) }) : null,
      ed ? btn("항목 관리", { size: "sm", onClick: () => openRecords(env, doc).catch(fail(ctx)) }) : null),
    manage,
    ...blocks,
    story ? section("story", "이야기 기록", story, null) : null);
}
const rows_count = (docs, env) => Math.max(docs.length, Object.keys(env.folder.people ?? {}).length);
