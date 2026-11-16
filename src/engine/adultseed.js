// 2.2.6 처음 등장한 인물의 성인 항목 무작위 기록(순수, 기억 옵션 ‘처음 등장 때 성인 항목 무작위로’ — 기본 꺼짐).
// · 성적 욕망 · 이상성향 후보: 인물 위키 후보(검토 대기)로 넣는다. 사용자가 반영·거부할 수 있다.
// · Erosync 성적 수치(성적 관심·즉흥성·개방성·추진력): Erosync 프로필의 직접 고친 값(출발점)으로 넣는다.
// · 월경 주기는 원래부터 처음 등장때 26~32일 주기·무작위 날짜로 정해진다(cycle-tracking.js).
// 같은 인물에서 늘 같은 결과가 나오도록 이름으로 시드를 만든다(다시 계산해도 맛이 바뀌지 않게). 모두 합의된 취향만 담는다.

export const SEED_KEY = "dusk.adultSeed";
export const normalizeSeedOpt = (v) => { const s = v && typeof v === "object" ? v : {}; return { on: s.on === true, since: Number.isFinite(s.since) ? s.since : 0 }; };

export const DESIRES = Object.freeze([
  "스킨십에 약하고 칭찬을 들으면 쉽게 달아오른다", "주도권을 쥐고 상대를 이끌고 싶어 한다", "상대를 애태우며 밀고 당기는 걸 즐긴다", "분위기와 로맨틱한 연출을 무엇보다 중시한다",
  "말로 하는 유혹·속삭임에 약하다", "은근히 이끌려 가는 쪽을 원한다", "질투를 느끼면 욕망이 커진다", "느리고 다정한 관계를 좋아한다", "격렬하고 거친 쪽을 좋아한다",
  "들킬 듯한 긴장감에 흥분한다", "목소리·향기 같은 감각에 민감하다", "연상에게 끌린다", "연하를 챙기며 끌린다", "상대를 만족시키는 데서 기쁨을 느낀다",
  "욕구가 낮은 편이라 마음이 먼저 열려야 한다", "한번 불붙으면 오래 집착하듯 원한다", "처음엔 수줍지만 익숙해지면 대담해진다", "감정 없는 가벼운 관계도 괜찮아한다",
  "눈을 맞추는 것만으로 설렌다", "상대가 흐트러지는 모습을 보고 싶어 한다"
]);
export const KINKS = Object.freeze([
  "가벼운 구속 놀이에 호기심이 있다", "발·다리에 끌린다", "들킬 듯한 장소에서의 노출 환상이 있다", "역할극을 좋아한다", "지배하는 쪽이 되고 싶어 한다", "복종하는 쪽이 되고 싶어 한다",
  "목덜미·손 같은 특정 부위에 집착한다", "제복·스타킹 같은 옷차림에 끌린다", "몰래 지켜보는 환상이 있다", "칭찬·말로 하는 지배에 반응한다", "향기에 강하게 끌린다", "자국(키스 마크)을 남기거나 받는 걸 좋아한다"
]);
export const SEX_KEYS = Object.freeze(["eroticInterest", "sexualSpontaneity", "sexualOpenness", "sexualMomentum"]);

// 이름 → 0~1 난수열(같은 이름이면 같은 결과)
export function seededRandom(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (arr, r, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
// 성향 한 명: 욕망 1~2개, 이상성향 0~1개(약 45%는 없음), 성적 수치 4개(가운데가 두껍고 양 끝도 가끔 나오는 분포)
export function rollAdult(name, random = null) {
  const r = random ?? seededRandom(`dusk-adult:${name}`);
  const bell = () => Math.round(Math.max(3, Math.min(97, ((r() + r() + r()) / 3) * 100 + (r() - 0.5) * 30)));
  const desires = pick(DESIRES, r, r() < 0.5 ? 1 : 2);
  const kinks = r() < 0.45 ? [] : pick(KINKS, r, 1);
  const sexual = Object.fromEntries(SEX_KEYS.map((k) => [k, bell()]));
  return { desires, kinks, sexual };
}

// 위키 범위(f.wiki)에 후보로 넣기. 이미 넣은 인물(seeded)·옵션을 켜기 전부터 있던 인물(since 이전 프로필)은 건너뛴다. 반환: 넣은 문서 id들
export function seedWikiCandidates(wiki, seeded, { since = 0, now = new Date().toISOString(), random = null } = {}) {
  const out = [];
  const people = wiki?.people;
  if (!people?.profiles || !wiki?.documents) return out;
  people.candidates ??= {};
  for (const [docId, prof] of Object.entries(people.profiles)) {
    const doc = wiki.documents[docId];
    if (!doc || doc.type !== "Character" || seeded.includes(docId)) continue;
    const born = Date.parse(prof?.createdAt ?? "");
    if (since && !(born >= since)) { seeded.push(docId); continue; }   // 옵션을 켜기 전에 나온 인물은 건드리지 않는다
    const roll = rollAdult(doc.title || prof.name || docId, random);
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
