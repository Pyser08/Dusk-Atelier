// 2.2.6 관계(tie)로 처음 감정 채우기(순수). 기록기가 "B는 A의 여자친구/언니/라이벌…"처럼 관계를 밝혔는데
// 두 사람 사이 감정 게이지가 비어 있으면(대화에서 아직 감정 변화가 안 잡힘) 관계에 맞는 처음 값을 넣는다.
// 이미 있는 값은 건드리지 않고(빈 태그만), 같은 관계로는 한 번만 넣는다. 게이지 배수는 변화량에만 쓰므로 여기엔 쓰지 않는다.
import { liveTies } from "./memoryplus.js";
import { isLoverKind } from "./lover.js";
import { scaleDelta } from "./gaugemult.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
// [규칙, 방향, 처음 값]: both = 서로, a2b = A가 B에게(“B는 A의 짝사랑·상사”처럼 A 쪽 감정)
const RULES = [
  [/짝사랑|crush|첫사랑/i, "a2b", { attraction: 5, affection: 5 }],
  [/(^|\s)(전|옛)\s*(남친|여친|애인|연인|남편|아내)|\bex[-\s]/i, "both", { affection: 3, attraction: 3 }],
  [/원수|숙적|enemy|nemesis/i, "both", { hostility: 6 }],
  [/라이벌|경쟁자|rival/i, "both", { hostility: 3, respect: 3 }],
  [/언니|오빠|누나|형님|(^|\s)형($|\s)|동생|여동생|남동생|자매|남매|형제|엄마|아빠|어머니|아버지|부모|딸|아들|가족|사촌|할머니|할아버지|sister|brother|mother|father|parent|daughter|son|family|cousin/i, "both", { affection: 6, trust: 6 }],
  [/절친|단짝|소꿉|베프|best\s*friend|childhood\s*friend/i, "both", { affection: 6, trust: 5 }],
  [/친구|동료|동기|friend|colleague|classmate|roommate|룸메/i, "both", { affection: 4, trust: 4 }],
  [/상사|선배|스승|선생|주인|사장|보스|대장|master|boss|mentor|teacher|senior|captain/i, "a2b", { respect: 4, trust: 3 }],
];
const LOVER = { affection: 7, attraction: 7, trust: 6 };

export function tieSeedOf(kind) {
  if (isLoverKind(kind)) return ["both", LOVER];
  for (const [re, dir, tags] of RULES) if (re.test(String(kind ?? ""))) return [dir, tags];
  return null;
}

// 반환: 채운 태그 수
export function seedFromTies(folder, anchor = null, now = Date.now()) {
  let n = 0;
  folder.emo ??= {};
  for (const t of liveTies(folder)) {
    const rule = tieSeedOf(t.kind); if (!rule) continue;
    const [dir, tags] = rule, mark = `${key(t.kind)}`;
    for (const [from, to] of dir === "both" ? [[t.a, t.b], [t.b, t.a]] : [[t.a, t.b]]) {
      if (key(from) === "{{user}}") continue;   // {{user}}(플레이어)의 감정은 정하지 않는다
      const k = key(from) + ">" + key(to), pair = folder.emo[k] ??= { from, to, tags: {}, log: [] };
      if ((pair.tieSeed ?? []).includes(mark)) continue;
      const next = {}, prev = {};
      for (const [tag, v] of Object.entries(tags)) if (pair.tags[tag] == null) { pair.tags[tag] = v; next[tag] = v; prev[tag] = null; n++; }
      (pair.tieSeed ??= []).push(mark);
      if (Object.keys(next).length) pair.log.push({ t: next, from: prev, why: `관계: ${t.kind}`.slice(0, 40), at: anchor?.at ?? t.at ?? null, at_ms: now });
      if (!Object.keys(pair.tags).length && !pair.log.length) delete folder.emo[k];
    }
  }
  return n;
}

// 2.2.6 호감이 바닥이면 끌림이 천천히 식는다: 적대감이 인간적 호감보다 크면(3 이상) 이성적 호감이 3턴마다 1씩(게이지 배수 ‘내릴 때’ 적용).
// 이성적 호감은 0 밑으로 내려가지 않는다(‘식음’ 상태로 본다). 반환: 내린 쌍 수
export function sourAttraction(folder, anchor = null, now = Date.now(), { gauge = null, every = 3 } = {}) {
  let n = 0;
  for (const pr of Object.values(folder?.emo ?? {})) {
    const t = pr?.tags ?? {};
    if (!((t.attraction ?? 0) > 0 && (t.hostility ?? 0) >= 3 && (t.hostility ?? 0) > (t.affection ?? 0))) { if (pr?.sour) delete pr.sour; continue; }
    pr.sour = (pr.sour ?? 0) + 1;
    if (pr.sour < every) continue;
    pr.sour = 0;
    const d = scaleDelta(-1, gauge); if (!d) continue;
    const before = t.attraction, v = Math.max(0, before + d);
    if (v === before) continue;
    t.attraction = v; n++;
    (pr.log ??= []).push({ t: { attraction: v }, from: { attraction: before }, why: "호감이 바닥이라 끌림이 식음", at: anchor?.at ?? null, at_ms: now });
  }
  return n;
}

// addon-rebuild: ‘이미 아는 사이’(folder.start, 본문이나 유저 입력이 밝힘)면 그 쌍의 인간적 호감·신뢰를 바닥값까지 올린다.
// 처음 만남처럼 2에서 시작하던 문제(몇 년 함께 지낸 사이인데 ‘아는 사이’에 머묾). 낮추지는 않고, 같은 쌍·같은 수준은 한 번만. {{user}}의 감정은 정하지 않는다.
export const START_SEED = Object.freeze({ close: { affection: 6, trust: 6 }, friendly: { affection: 4, trust: 4 } });
export function seedFromStart(folder, anchor = null, now = Date.now()) {
  let n = 0;
  folder.emo ??= {};
  for (const x of Object.values(folder?.start ?? {})) {
    const tags = START_SEED[x?.level]; if (!tags || x.orphan) continue;
    for (const [from, to] of [[x.a, x.b], [x.b, x.a]]) {
      if (!from || !to || key(from) === "{{user}}") continue;
      const k = key(from) + ">" + key(to), pair = folder.emo[k] ??= { from, to, tags: {}, log: [] };
      const mark = `start:${x.level}`;
      if ((pair.startSeed ?? []).includes(mark)) continue;
      const next = {}, prev = {};
      for (const [tag, v] of Object.entries(tags)) if ((pair.tags[tag] ?? 0) < v) { prev[tag] = pair.tags[tag] ?? null; pair.tags[tag] = v; next[tag] = v; n++; }
      (pair.startSeed ??= []).push(mark);
      if (Object.keys(next).length) pair.log.push({ t: next, from: prev, why: `이미 아는 사이(${x.level === "close" ? "가까움" : "아는 사이"})`, at: anchor?.at ?? x.at ?? null, at_ms: now });
      if (!Object.keys(pair.tags).length && !pair.log.length) delete folder.emo[k];
    }
  }
  return n;
}
