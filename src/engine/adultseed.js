// 2.2.6 처음 등장한 인물의 성인 항목 무작위 기록(순수, 기억 옵션 ‘처음 등장 때 성인 항목 무작위로’ — 기본 꺼짐).
// · 성적 욕망 · 이상성향 후보: 인물 위키 후보(검토 대기)로 넣는다. 사용자가 반영·거부할 수 있다.
// · Erosync 성적 수치(성적 관심·즉흥성·개방성·추진력): Erosync 프로필의 직접 고친 값(출발점)으로 넣는다.
// · 월경 주기는 원래부터 처음 등장때 26~32일 주기·무작위 날짜로 정해진다(cycle-tracking.js).
// 같은 인물에서 늘 같은 결과가 나오도록 이름으로 시드를 만든다(다시 계산해도 맛이 바뀌지 않게). 모두 합의된 취향만 담는다.

export const SEED_KEY = "dusk.adultSeed";

// 성향 분류별 항목. id는 글 그대로(사용자가 끈 항목·직접 넣은 항목을 같은 방식으로 다루려고).
export const DESIRE_CATS = Object.freeze([
  ["lead", "주도 · 지배", ["주도권을 쥐고 상대를 이끌고 싶어 한다", "상대를 애태우며 밀고 당기는 걸 즐긴다", "상대가 흐트러지는 모습을 보고 싶어 한다"]],
  ["follow", "순응 · 헌신", ["은근히 이끌려 가는 쪽을 원한다", "상대를 만족시키는 데서 기쁨을 느낀다"]],
  ["romance", "감성 · 로맨스", ["분위기와 로맨틱한 연출을 무엇보다 중시한다", "느리고 다정한 관계를 좋아한다", "눈을 맞추는 것만으로 설렌다", "말로 하는 유혹·속삭임에 약하다"]],
  ["sense", "감각", ["스킨십에 약하고 칭찬을 들으면 쉽게 달아오른다", "목소리·향기 같은 감각에 민감하다"]],
  ["thrill", "스릴 · 강도", ["들킬 듯한 긴장감에 흥분한다", "격렬하고 거친 쪽을 좋아한다"]],
  ["bond", "관계 방식", ["질투를 느끼면 욕망이 커진다", "한번 불붙으면 오래 집착하듯 원한다", "감정 없는 가벼운 관계도 괜찮아한다", "처음엔 수줍지만 익숙해지면 대담해진다", "욕구가 낮은 편이라 마음이 먼저 열려야 한다"]],
  ["age", "끌리는 상대", ["연상에게 끌린다", "연하를 챙기며 끌린다"]]
]);
export const KINK_CATS = Object.freeze([
  ["ds", "지배 · 복종", ["지배하는 쪽이 되고 싶어 한다", "복종하는 쪽이 되고 싶어 한다", "칭찬·말로 하는 지배에 반응한다"]],
  ["fetish", "페티시", ["발·다리에 끌린다", "목덜미·손 같은 특정 부위에 집착한다", "제복·스타킹 같은 옷차림에 끌린다", "향기에 강하게 끌린다"]],
  ["expo", "노출 · 관음", ["들킬 듯한 장소에서의 노출 환상이 있다", "몰래 지켜보는 환상이 있다"]],
  ["play", "놀이", ["가벼운 구속 놀이에 호기심이 있다", "역할극을 좋아한다", "자국(키스 마크)을 남기거나 받는 걸 좋아한다"]]
]);
export const DESIRES = Object.freeze(DESIRE_CATS.flatMap(([, , xs]) => xs));
export const KINKS = Object.freeze(KINK_CATS.flatMap(([, , xs]) => xs));
export const CUSTOM_CAT = "custom";

// 설정: 켜기·켠 때, 무작위로 정할 것(월경·성적 수치·성적 욕망·이상성향), 끈 항목, 직접 넣은 항목 [{kind:"desire"|"kink", cat, text}]
export function normalizeSeedOpt(v) {
  const s = v && typeof v === "object" ? v : {};
  const bool = (x, d) => (x === undefined ? d : x === true);
  const custom = (Array.isArray(s.custom) ? s.custom : []).map((c) => ({ kind: c?.kind === "kink" ? "kink" : "desire", cat: String(c?.cat || CUSTOM_CAT).slice(0, 20), text: String(c?.text ?? "").trim().slice(0, 120) }))
    .filter((c, i, a) => c.text && a.findIndex((x) => x.kind === c.kind && x.text === c.text) === i).slice(0, 60);
  return { on: s.on === true, since: Number.isFinite(s.since) ? s.since : 0,
    cycle: bool(s.cycle, true), sexual: bool(s.sexual, true), desires: bool(s.desires, true), kinks: bool(s.kinks, true),
    off: [...new Set((Array.isArray(s.off) ? s.off : []).map(String))].slice(0, 200), custom };
}
// 고를 수 있는 항목(끈 것 빼고 + 직접 넣은 것). 분류별로 묶어 화면에도 쓴다.
export function poolOf(opt, kind) {
  const o = normalizeSeedOpt(opt), base = kind === "kink" ? KINK_CATS : DESIRE_CATS;
  const groups = base.map(([id, label, xs]) => ({ id, label, items: [...xs, ...o.custom.filter((c) => c.kind === kind && c.cat === id).map((c) => c.text)] }));
  const mine = o.custom.filter((c) => c.kind === kind && !base.some(([id]) => id === c.cat)).map((c) => c.text);
  if (mine.length) groups.push({ id: CUSTOM_CAT, label: "직접 넣은 항목", items: mine });
  return groups.map((g) => ({ ...g, on: g.items.filter((t) => !o.off.includes(t)) }));
}
export const pickable = (opt, kind) => poolOf(opt, kind).flatMap((g) => g.on);
export const SEX_KEYS = Object.freeze(["eroticInterest", "sexualSpontaneity", "sexualOpenness", "sexualMomentum"]);

// 이름 → 0~1 난수열(같은 이름이면 같은 결과)
export function seededRandom(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (arr, r, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
// 성향 한 명: 욕망 1~2개, 이상성향 0~1개(약 45%는 없음), 성적 수치 4개(가운데가 두껍고 양 끝도 가끔 나오는 분포)
export function rollAdult(name, random = null, opt = null) {
  const r = random ?? seededRandom(`dusk-adult:${name}`);
  const o = normalizeSeedOpt(opt ?? {}), D = pickable(o, "desire"), K = pickable(o, "kink");
  const bell = () => Math.round(Math.max(3, Math.min(97, ((r() + r() + r()) / 3) * 100 + (r() - 0.5) * 30)));
  const nD = r() < 0.5 ? 1 : 2, hasK = r() >= 0.45;   // 난수는 항목이 꺼져 있어도 같은 순서로 뽑아 다른 결과가 흔들리지 않게
  const d0 = pick(D, r, nD), k0 = hasK ? pick(K, r, 1) : [];
  const desires = o.desires ? d0 : [], kinks = o.kinks ? k0 : [];
  const sexual = Object.fromEntries(SEX_KEYS.map((k) => [k, bell()]));
  return { desires, kinks, sexual: o.sexual ? sexual : null };
}

// 위키 범위(f.wiki)에 후보로 넣기. 이미 넣은 인물(seeded)·옵션을 켜기 전부터 있던 인물(since 이전 프로필)은 건너뛴다. 반환: 넣은 문서 id들
export function seedWikiCandidates(wiki, seeded, { since = 0, now = new Date().toISOString(), random = null, opt = null } = {}) {
  const out = [];
  const people = wiki?.people;
  if (!people?.profiles || !wiki?.documents) return out;
  people.candidates ??= {};
  for (const [docId, prof] of Object.entries(people.profiles)) {
    const doc = wiki.documents[docId];
    if (!doc || doc.type !== "Character" || seeded.includes(docId)) continue;
    const born = Date.parse(prof?.createdAt ?? "");
    if (since && !(born >= since)) { seeded.push(docId); continue; }   // 옵션을 켜기 전에 나온 인물은 건드리지 않는다
    const roll = rollAdult(doc.title || prof.name || docId, random, opt);
    const add = (axis, pattern, i) => {
      const id = `candidate_seed_${docId}_${axis}_${i}`;
      people.candidates[id] = { id, documentId: docId, axis, direction: "replace", pattern, origin: "manual", status: "review",
        evidence: [{ id: `${id}:0`, ref: "source:manual_input", sceneKey: "", summary: "처음 등장할 때 무작위로 정한 취향(기억 옵션)", confidence: 0, strength: 0, at: now }],
        sceneKeys: [], confidence: 0, averageStrength: 0, proposedDelta: 0, createdAt: now, updatedAt: now, appliedChange: null };
    };
    roll.desires.forEach((p, i) => add("sexual_desire", p, i));
    roll.kinks.forEach((p, i) => add("paraphilia", p, i));
    seeded.push(docId);
    out.push(docId);
  }
  if (out.length) wiki.revision = (wiki.revision ?? 0) + 1;
  return out;
}
