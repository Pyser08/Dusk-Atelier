// 인물 페이지 ‘위키 항목 전체’(고급 모드): 위키 문서의 모든 항목(감정·관계·행동 경향·비밀 …)을 보고 ✎ 수정 · 📌 고정 · 삭제하고,
// 장기 성격 변화 후보를 반영/거부/되돌린다. 모두 리수폿 규칙(고정 항목은 거절 · 편집 중 바뀌면 거절)을 그대로 따른다.
import { h } from "../../dom.js";
import { btn, modal, promptDialog, confirmDialog, note } from "../../kit.js";
import { fail } from "./common.js";
import { editSectionText, setPin, isPinned, sectionPinKey, scopeKeyOf } from "../../../engine/personedit.js";
import { deletePersonItem } from "../../../engine/pot/people-records.js";
import { reviewPersonCandidate } from "../../../engine/pot/people-profile.js";
import { updatePersonCandidateText, deletePersonCandidate } from "../../../engine/pot/people-candidate-edit.js";

const AXIS = { sexual_desire: "성적 욕망", paraphilia: "이상성향", qualitative: "성격 변화" };
const STATUS = { collecting: "근거 모으는 중", review: "검토 필요", approved: "반영됨", rejected: "거부됨", reverted: "되돌림" };

export function wikiPanel(env, doc) {
  const { ctx } = env, M = ctx.memory;
  const edit = (fn, ok) => M.store.updateFolder(env.bot.id, env.chatItem.id, (f) => { f.wiki = fn(f.wiki); }).then(() => { if (ok) ctx.toast(ok); env.redraw(); }).catch(fail(ctx));
  const wiki = env.folder.wiki, sk = scopeKeyOf(wiki);
  const sections = (doc.sections ?? []).filter((s) => s?.body?.trim());
  const cands = Object.values(wiki?.people?.candidates ?? {}).filter((c) => c.documentId === doc.id);
  const pinB = (key) => { const on = isPinned(wiki, doc.id, key); return btn(on ? "📌" : "📍", { size: "sm", title: on ? "고정됨 — 눌러서 해제" : "고정하면 AI가 고치지 않아요", "aria-pressed": on ? "true" : "false", onClick: () => edit((w) => setPin(w, doc.id, key, !on)) }); };

  const secRow = (s) => h("li", { class: "rb-mem-rec" }, h("div", { class: "txt" }, h("b", null, s.heading || s.title || "항목"), h("div", { style: "white-space:pre-wrap" }, s.body.length > 400 ? s.body.slice(0, 400) + "…" : s.body)),
    h("span", { class: "rb-mem-rowact" },
      btn("✎", { size: "sm", "aria-label": "고치기", onClick: async () => { const v = await promptDialog(ctx.win, { title: `${s.heading || "항목"} 고치기`, label: "내용", value: s.body, ok: "저장" }); if (v != null && v.trim() !== s.body) edit((w) => editSectionText(w, doc.id, s.id, v), "고쳤어요."); } }),
      pinB(sectionPinKey(s.id)),
      btn("삭제", { size: "sm", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: s.heading || "", ok: "삭제", danger: true }))) return; edit((w) => deletePersonItem(w, doc.id, { id: s.id, kind: "section", expected: JSON.stringify(doc.sections.find((x) => x.id === s.id)), scopeKey: sk }), "지웠어요."); } })));

  const candRow = (c) => {
    const live = ["collecting", "review"].includes(c.status), ev = c.evidence?.length ?? 0;
    const act = (action, label, ok) => btn(label, { size: "sm", kind: action === "approve" ? "primary" : "", onClick: () => edit((w) => reviewPersonCandidate(w, c.id, action), ok) });
    return h("li", { class: "rb-mem-rec" }, h("div", { class: "txt" }, h("b", null, `${AXIS[c.axis] ?? "변화"} · ${STATUS[c.status] ?? c.status}`), h("div", null, c.pattern || c.summary || ""), ev ? h("div", { class: "rb-muted" }, `근거 ${ev}개`) : null),
      h("span", { class: "rb-mem-rowact" }, c.status === "review" ? act("approve", "반영", "반영했어요.") : null, live ? act("reject", "거부", "거부했어요.") : null, c.status === "approved" ? act("revert", "되돌리기", "되돌렸어요.") : null,
        live ? btn("삭제", { size: "sm", onClick: () => edit((w) => deletePersonCandidate(w, doc.id, { id: c.id, expected: JSON.stringify(wiki.people.candidates[c.id]), scopeKey: sk }), "지웠어요.") }) : null));
  };
  const addCand = btn("변화 후보 직접 추가", { size: "sm", onClick: async () => { const v = await promptDialog(ctx.win, { title: "장기 변화 후보", label: "이 인물의 달라진 점 (400자까지)", ok: "추가" }); if (v?.trim()) edit((w) => updatePersonCandidateText(w, doc.id, { text: v, scopeKey: sk }), "후보로 넣었어요. 검토 후 반영하세요."); } });

  return h("details", { class: "rb-card rb-mem-man rb-mem-wikipanel" }, h("summary", null, "위키 항목 전체 · 성격 변화 (고급)"),
    h("p", { class: "rb-muted" }, "AI가 쌓은 인물 문서의 모든 항목이에요. 고치면 다음 응답부터 반영되고, 📌으로 고정하면 AI가 덮어쓰지 않아요."),
    h("h4", null, `성격 변화 후보 (${cands.length})`), cands.length ? h("ul", { class: "rb-mem-reclist" }, cands.map(candRow)) : h("p", { class: "rb-muted" }, "후보가 없어요."), addCand,
    h("h4", null, `문서 항목 (${sections.length})`), sections.length ? h("ul", { class: "rb-mem-reclist" }, sections.map(secRow)) : note("info", "아직 항목이 없어요."));
}
