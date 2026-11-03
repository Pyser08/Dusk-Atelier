// 같은 이름 인물을 새 문서로 또 만들지 않게 하는 보정(Dusk 쪽 코드). 리스바드 BardWiki와 같은 원칙:
//  · 모델이 '새로 만들기'라고 해도 프로그램이 이름으로 먼저 확인한다 — 같은 종류 문서의 제목·별칭과 같으면 그 문서의 '갱신'으로 바꾼다.
//  · 별칭끼리 겹치는 건 합치지 않는다(별명이 같은 다른 사람이 있을 수 있음). 후보의 별칭이 기존 문서의 '제목'과 같을 때만 같은 사람으로 본다.
//  · 한 응답 안에서 같은 이름이 두 번 나오면 첫 번째 새 문서에 합친다.
// 인물(character)만 다룬다. 사건·장면은 제목이 비슷해도 다른 것일 수 있다.
const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

export function redirectDuplicateCreates(scope, proposal, typeName = { character: "Character" }) {
  const docs = Object.values(scope?.documents ?? {}).filter((d) => d && d.type === typeName.character);
  let ambiguous = 0;   // 별칭만 겹치는 후보가 여럿이라 합치지 못한 수
  const redirects = [];   // {ref, id}  새 문서 ref → 이미 있는 문서
  const merges = [];      // {ref, firstRef} 같은 응답 안의 중복
  const firstByKey = new Map();
  const documents = (proposal?.documents ?? []).map((change) => {
    if (change?.operation !== "create" || change.type !== "character" || !String(change.title ?? "").trim()) return change;
    const tk = key(change.title), ak = new Set((change.aliases_add ?? []).map(key));
    // 같은 제목이 여럿이면 내용이 가장 많은 문서로
    const byTitle = docs.filter((d) => key(d.title) === tk).sort((a, b) => (b.sections?.length ?? 0) - (a.sections?.length ?? 0))   // 같은 제목이 여럿이면 내용이 가장 많은 문서로, byAlias = docs.filter((d) => (d.aliases ?? []).some((a) => key(a) === tk));
    const byAlias = docs.filter((d) => (d.aliases ?? []).some((a) => key(a) === tk));
    const byNick = docs.filter((d) => ak.has(key(d.title)));
    if (!byTitle.length && (byAlias.length > 1 || byNick.length > 1)) ambiguous++;
    const hit = byTitle[0] ?? (byAlias.length === 1 ? byAlias[0] : null) ?? (byNick.length === 1 ? byNick[0] : null);
    if (hit) { redirects.push({ ref: change.document_ref, id: hit.id }); return { ...change, operation: "update", title: null }; }
    const first = firstByKey.get(tk);
    if (first) { merges.push({ ref: change.document_ref, firstRef: first }); return { ...change, operation: "update", title: null }; }
    firstByKey.set(tk, change.document_ref);
    return change;
  });
  return {
    proposal: redirects.length || merges.length ? { ...proposal, documents } : proposal,
    count: redirects.length + merges.length, ambiguous,
    // 새 문서 id를 정한 뒤 부른다: refToId에 연결을 채운다.
    link(refToId) { for (const r of redirects) refToId[r.ref] = r.id; for (const m of merges) refToId[m.ref] = refToId[m.firstRef]; }
  };
}
