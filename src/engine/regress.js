// 회귀 (v1.9.2, 순수): 고른 인물 한 명의 기억만 들고 새 채팅을 시작한다.
// 그 인물의 기록·요약·위키 문서·그 인물이 낀 관계/감정/호칭/얼굴/기대/유대/균열/믿음/게이지를 새 폴더로 옮긴다.
// 장면·떡밥 같은 '이야기 진행'은 옮기지 않는다(새 타임라인). 다른 인물은 아무것도 기억하지 못한다.
const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

// 새 채팅에는 출처 응답이 없다. 출처(src·hs)를 남기면 대조에서 '사라진 응답'으로 보고 감정·관계를 되돌리므로 떼어 낸다.
export function detach(v) {
  if (Array.isArray(v)) return v.map(detach);
  if (!v || typeof v !== "object") return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (k === "src") continue;
    if (k === "hs") { out.hs = []; continue; }
    out[k] = detach(x);
  }
  if (Array.isArray(v.hs) && v.hs.length) out.m0 = Math.max(1, v.m ?? v.hs.length + (v.m0 ?? 0)) ;
  return out;
}
// 기록 하나: 위치(at·mid)를 지우고 carried로 표시 → 대조에서 고아가 되지 않고, 주입에서 '최근 메시지라 뺌'에 걸리지 않는다
const carry = (r) => ({ ...detach(r), at: null, mid: null, carried: true, orphan: false });

/** 인물을 찾는다(키·이름·별칭) */
export function findPerson(folder, who) {
  const want = norm(who);
  for (const [k, p] of Object.entries(folder?.people ?? {})) {
    if (k === who || norm(k) === want || norm(p?.name) === want || (p?.aliases ?? []).some((a) => norm(a) === want)) return [k, p];
  }
  return null;
}

// 그 인물을 가리키는 이름들
const namesOf = (k, p) => new Set([k, p?.name, ...(p?.aliases ?? [])].map(norm).filter(Boolean));

const isUser = (k, p, user = "{{user}}") => norm(p?.name || k) === norm(user) || norm(k) === norm(user);

/** 위키에서 고른 인물들의 Character 문서와 프로필만 남긴 새 범위. 문서가 하나도 없으면 null */
export function regressWiki(wiki, nameSets, scope, now = new Date().toISOString()) {
  const docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const picked = [];
  for (const names of nameSets) {
    const doc = docs.find((d) => names.has(norm(d.title))) ?? docs.find((d) => (d.aliases ?? []).some((a) => names.has(norm(a))));
    if (doc && !picked.includes(doc)) picked.push(doc);
  }
  if (!picked.length) return null;
  const ids = picked.map((d) => d.id);
  const out = {
    schemaVersion: wiki.schemaVersion, revision: 1,
    scope: { characterId: String(scope.characterId), chatKey: String(scope.chatKey), characterName: String(scope.characterName ?? "").slice(0, 200), chatName: String(scope.chatName ?? "").slice(0, 200), createdAt: now, updatedAt: now },
    documents: Object.fromEntries(picked.map((d) => [d.id, clone(d)])), history: []
  };
  const pick = (m) => Object.fromEntries(ids.filter((id) => m?.[id]).map((id) => [id, clone(m[id])]));
  if (wiki?.people?.profiles && ids.some((id) => wiki.people.profiles[id])) out.people = { ...clone(wiki.people), profiles: pick(wiki.people.profiles), candidates: {}, pins: pick(wiki.people.pins) };
  if (wiki.relationshipHistoryLimit !== undefined) out.relationshipHistoryLimit = wiki.relationshipHistoryLimit;
  return { wiki: out, docIds: ids };
}

/**
 * 새 폴더 내용. folder = 원래 채팅 기억, who = 인물 키·이름 하나 또는 여러 개({{user}}는 뺀다).
 * 반환 { slice, persons, keys, person(이름들 ·로), counts } · 고른 인물이 하나도 없으면 null
 */
export function regressSlice(folder, who, { scope = null, fromChat = "", now = Date.now() } = {}) {
  const hits = [];
  for (const w of Array.isArray(who) ? who : [who]) { const hit = findPerson(folder, w); if (hit && !isUser(...hit) && !hits.some(([k]) => k === hit[0])) hits.push(hit); }
  if (!hits.length) return null;
  const sets = hits.map(([k, p]) => namesOf(k, p)), names = new Set(sets.flatMap((x) => [...x])), keys = hits.map(([k]) => k);
  const has = (n) => names.has(norm(n));
  const pairMap = (map, a, b) => {
    const out = {};
    for (const [k, v] of Object.entries(map ?? {})) if (v && (has(v[a]) || has(v[b]))) out[k] = detach(v);
    return out;
  };
  // 새 채팅엔 장면이 없어 '관련 있을 때만'이면 기억이 안 들어간다 → 회귀자는 항상 포함(직접 '제외'로 둔 경우는 존중)
  const people = Object.fromEntries(hits.map(([k, p]) => [k, { ...detach(p), ctx: p.ctx === "never" ? "never" : "always", records: (p.records ?? []).filter((r) => !r.orphan).map(carry) }]));
  const rels = {};
  for (const [k, v] of Object.entries(folder.rels ?? {})) {
    if (!v || !(has(v.from) || has(v.to))) continue;
    const items = (v.items ?? []).filter((x) => !x.orphan).map((x) => ({ ...detach(x), at: null, carried: true }));
    if (items.length) rels[k] = { ...detach(v), items };
  }
  const emo = {};
  for (const [k, v] of Object.entries(folder.emo ?? {})) if (v && (has(v.from) || has(v.to))) emo[k] = { ...detach(v), log: (v.log ?? []).filter((e) => !e.orphan).map(detach) };
  const list = (arr, ...f) => (arr ?? []).filter((x) => x && f.some((k) => has(x[k]))).map(detach);
  const gauge = folder.gauge?.vals ? { vals: Object.fromEntries(Object.entries(folder.gauge.vals).map(([def, m]) => [def, Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => names.has(norm(k)) || keys.includes(k)))]).filter(([, m]) => Object.keys(m).length)), log: [], run: 0 } : undefined;
  const persons = hits.map(([k, p]) => p.name || k);
  const slice = {
    people, rels, emo,
    talk: pairMap(folder.talk, "from", "to"), faces: pairMap(folder.faces, "who", "to"),
    exp: pairMap(folder.exp, "a", "b"), start: pairMap(folder.start, "a", "b"),
    bonds: list(folder.bonds, "a", "b"), rifts: list(folder.rifts, "a", "b"), beliefs: list(folder.beliefs, "who", "by"),
    scenes: [], open: [], hints: [],
    regress: { person: persons.join(", "), persons, keys, fromChat: String(fromChat ?? ""), at_ms: now }
  };
  if (gauge && Object.keys(gauge.vals).length) slice.gauge = gauge;
  let wikiDocs = 0;
  if (folder.wiki && scope) { const w = regressWiki(folder.wiki, sets, scope); if (w) { slice.wiki = w.wiki; wikiDocs = w.docIds.length; } }
  const counts = { people: hits.length, records: Object.values(people).reduce((n, p) => n + p.records.length, 0), links: Object.keys(rels).length + Object.keys(emo).length + slice.bonds.length + slice.rifts.length + slice.beliefs.length, wiki: wikiDocs > 0, wikiDocs };
  return { slice, persons, keys, person: persons.join(" · "), key: keys[0], counts };
}

/** 회귀 고를 인물 목록({{user}} 제외): 고정·기록 많은 순. {key,name,records,digest} */
export function regressCandidates(folder, { user = "{{user}}" } = {}) {
  return Object.entries(folder?.people ?? {})
    .filter(([k, p]) => p && !isUser(k, p, user))
    .map(([k, p]) => ({ key: k, name: p.name || k, records: (p.records ?? []).filter((r) => !r.orphan).length, digest: !!p.digest, pinned: !!p.pinned }))
    .filter((x) => x.records || x.digest)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.records - a.records);
}

/** 프롬프트 한 줄 */
export function regressLine(folder) {
  const r = folder?.regress;
  if (!r?.person) return "";
  const list = Array.isArray(r.persons) && r.persons.length ? r.persons : [r.person];
  return list.length > 1
    ? `Regression: ${list.join(", ")} have returned from a previous timeline and still remember everything from it (the memories below). No one else remembers that timeline.`
    : `Regression: ${list[0]} has returned from a previous timeline and still remembers everything from it (the memories below). No one else remembers that timeline.`;
}

// 이어서 하기: 인물을 전부 고르면 회귀가 아니라 지금까지의 기억 전체(장면·열린 항목·관계·위키·게이지·나에 대한 기억까지)를
// 새 채팅으로 옮긴다. 긴 채팅을 새 채팅에서 기억만 들고 이어 가 토큰을 아끼려는 용도.
const DROP = new Set(["cursor", "runs", "failedBackfill", "undo", "tomb", "imports", "alerts", "hints", "regress", "chaId", "chatId", "botName", "chatName", "chatIndex", "v", "wiki"]);
export function continueSlice(folder, { scope = null, now = Date.now() } = {}) {
  if (!folder) return null;
  const out = {};
  for (const [k, v] of Object.entries(folder)) if (!DROP.has(k)) out[k] = detach(v);
  out.people = Object.fromEntries(Object.entries(folder.people ?? {}).map(([k, p]) => [k, { ...detach(p), records: (p.records ?? []).filter((r) => !r.orphan).map(carry) }]));
  out.scenes = (folder.scenes ?? []).filter((s) => !s.orphan).map(carry);
  for (const key of ["rels"]) for (const v of Object.values(out[key] ?? {})) v.items = (v.items ?? []).filter((x) => !x.orphan).map((x) => ({ ...x, at: null, carried: true }));
  out.open = (folder.open ?? []).filter((x) => !x.orphan).map((x) => ({ ...detach(x), at: null, carried: true }));
  out.hints = [];
  out.continued = { at_ms: now };
  let wikiDocs = 0;
  if (folder.wiki && scope) {
    const w = clone(folder.wiki);
    delete w.automation; delete w.writerReceipts;
    w.scope = { ...w.scope, characterId: String(scope.characterId), chatKey: String(scope.chatKey), characterName: String(scope.characterName ?? "").slice(0, 200), chatName: String(scope.chatName ?? "").slice(0, 200) };
    delete w.scope.forkedFrom;
    out.wiki = w; wikiDocs = Object.keys(w.documents ?? {}).length;
  }
  const people = Object.values(out.people);
  return { slice: out, counts: { people: people.length, records: people.reduce((n, p) => n + p.records.length, 0), scenes: out.scenes.length, wiki: wikiDocs > 0, wikiDocs } };
}
