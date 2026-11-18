// 장기기억 애드온: 인물 위키의 쌓이기만 하는 칸(알고 있는 정보·비밀)이 너무 많아지면 중요도 낮은 것부터 지운다(순수, AI 호출 없음).
// 지우지 않는 것: 고정한 항목, 사용자가 직접 쓴 항목. 중요도: 중요한 말(이름·가족·약속·비밀·사건·몸…) · 대상 있음 · 길이 · 최근일수록 높게,
// 거의 같은 글이 이미 있으면 낮게. 지우기는 리수폿 삭제 규칙(deletePersonItem)을 그대로 거친다.
import { deletePersonItem } from "./pot/people-records.js";
import { isPinned, sectionPinKey, scopeKeyOf } from "./personedit.js";
import { normalizeWikiScope } from "./pot/wiki-schema.js";

export const PRUNE_LIMITS = Object.freeze({ "core.knowledge": 30, "perception.secret": 15 });
const KEY_RE = /이름|가족|부모|엄마|아빠|형제|자매|동생|언니|오빠|누나|약속|비밀|사건|과거|죽|사망|임신|결혼|이혼|애인|연인|고백|생일|직업|주소|집|학교|회사|돈|빚|병|상처|트라우마|알레르기|능력|정체|목표|계획|좋아|싫어|두려|무서/;
const nk = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/[\s.,!?·~"'()[\]-]+/g, "");
// 두 글이 거의 같은지(2글자 조각 겹침 비율)
export function similar(a, b) {
  const g = (s) => { const t = nk(s), out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out; };
  const A = g(a), B = g(b); if (!A.size || !B.size) return 0;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size);
}
const userMade = (s) => { const p = s?.provenance ?? {}; return p.manualEdited === true || /manual/i.test(String(p.entryRef ?? "")) || (p.evidenceRefs ?? []).includes("source:manual_input"); };
// 항목 점수(높을수록 남김). i: 오래된 순 위치, n: 전체 수
export function importance(sec, i, n, earlier = []) {
  const t = String(sec?.body ?? sec?.text ?? "");
  let s = (i / Math.max(1, n - 1)) * 4;                       // 최근 0~4
  if (KEY_RE.test(t)) s += 3;
  if ((sec?.provenance?.targetRefs ?? []).length) s += 2;
  if (t.length >= 40) s += 1; if (t.length < 10) s -= 1;
  if (earlier.some((e) => similar(e, t) >= 0.8)) s -= 5;      // 이미 비슷한 글이 있음
  return s;
}
// wiki → { wiki, removed:[{doc, slot, text}] }
export function pruneWiki(wiki, limits = PRUNE_LIMITS) {
  let w = wiki; const removed = [];
  if (!w?.documents) return { wiki: w, removed };
  for (const doc of Object.values(w.documents)) {
    if (doc?.type !== "Character") continue;
    for (const [slot, max] of Object.entries(limits)) {
      const list = (w.documents[doc.id]?.sections ?? []).filter((s) => s?.provenance?.slotId === slot);
      if (list.length <= max) continue;
      const scored = list.map((s, i) => ({ s, keep: isPinned(w, doc.id, sectionPinKey(s.id)) || userMade(s), score: importance(s, i, list.length, list.slice(0, i).map((x) => x.body)) }));
      const drop = scored.filter((x) => !x.keep).sort((a, b) => a.score - b.score).slice(0, list.length - max);
      for (const { s } of drop) {
        try { const cur = normalizeWikiScope(w).documents[doc.id]?.sections?.find((x) => x.id === s.id); if (!cur) continue;
          w = deletePersonItem(w, doc.id, { id: s.id, kind: "section", expected: JSON.stringify(cur), scopeKey: scopeKeyOf(w) }); removed.push({ doc: doc.title, slot, text: String(s.body ?? "").slice(0, 60) }); }
        catch { /* 고정·갱신 중이면 둔다 */ }
      }
    }
  }
  return { wiki: w, removed };
}
