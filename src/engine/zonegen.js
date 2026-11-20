// 장기기억 애드온(0.3.22): 성감대 무작위 만들기(순수, 호출 없음). 대화에서 아직 드러나지 않은 인물도 성감대가 비지 않게.
// 부위마다 '한 줄 특징'과, 약점이면 '정확한 자리'(모형 위 점 위치 dx·dy)를 고른다. 같은 인물은 늘 같은 결과(문서 id로 정한 난수).
import { BODY_PARTS } from "./humanitems.js";

// part id → { f: 특징 후보, s: [정확한 자리, dx, dy] 후보 }
export const ZONE_BANK = Object.freeze({
  lips: { f: ["살짝 깨물리면 숨이 먼저 무너진다", "입맞춤이 길어지면 힘이 풀린다", "아랫입술을 핥으면 눈을 감아 버린다"], s: [["아랫입술 가운데", 0, 1.6], ["입꼬리", 2.6, 0.4]] },
  ears: { f: ["숨결만 닿아도 어깨가 움찔한다", "귓속말에 얼굴부터 붉어진다", "깨물리면 목소리가 새어 나온다"], s: [["왼쪽 귓불", -1.2, 2.6], ["귓바퀴 위쪽", -0.8, -2.4], ["귀 뒤 오목한 곳", 1.6, 0.6]] },
  neck: { f: ["입술이 닿으면 고개가 저절로 젖혀진다", "손가락으로 쓸어내리면 소름이 돋는다", "가볍게 물면 다리에 힘이 빠진다"], s: [["목 옆 맥이 뛰는 곳", 3, -0.6], ["턱선 바로 아래", 2.2, -2.8]] },
  collar: { f: ["쇄골을 따라 입맞추면 숨이 가빠진다", "손끝으로 훑으면 몸을 비튼다"], s: [["쇄골 안쪽 오목한 곳", -3, -0.6], ["왼쪽 쇄골 끝", 4, -0.8]] },
  chest: { f: ["감싸 쥐면 등이 휘어진다", "아래쪽을 쓸어 올리면 숨을 참는다"], s: [["가슴 아래 곡선", 0, 4], ["가슴 옆쪽", -5, 0]] },
  nipples: { f: ["스치기만 해도 금세 단단해진다", "혀로 굴리면 소리를 못 참는다", "살짝 비틀면 몸을 떤다"], s: [["왼쪽 유두 끝", 0, 0], ["유륜 가장자리", 1.6, 1.2]] },
  armpit: { f: ["간지러움과 쾌감이 섞여 몸부림친다", "입김이 닿으면 팔을 오므린다"], s: [["겨드랑이 안쪽 오목한 곳", 0, 0.8]] },
  belly: { f: ["배꼽 주변을 맴돌면 배가 떨린다", "아랫배를 누르면 숨이 새어 나온다"], s: [["배꼽 바로 아래", 0, 4], ["아랫배 오른쪽", 3.4, 7]] },
  waist: { f: ["옆구리를 쥐면 허리가 들썩인다", "손바닥으로 감싸면 몸을 기댄다"], s: [["옆구리 갈비뼈 아래", 0, -4], ["골반뼈 위", 2, 6]] },
  groin: { f: ["조금만 닿아도 허리가 떠오른다", "천천히 문지르면 금방 젖어 든다", "직접 닿기 전부터 몸이 먼저 반응한다"], s: [["안쪽 가장 예민한 곳", 0, 2], ["사타구니 접힌 곳", -4, -1.6]] },
  thighs: { f: ["안쪽을 쓸어 올리면 다리를 오므린다", "입맞춤이 올라갈수록 떨림이 커진다"], s: [["허벅지 안쪽 위", 1.6, -6], ["무릎 위 안쪽", 1.2, 8]] },
  hands: { f: ["손가락을 머금으면 시선이 흐려진다", "손바닥을 느리게 쓸면 숨을 고른다"], s: [["손목 안쪽", 1, -6], ["손가락 사이", 0, 4]] },
  feet: { f: ["발등에 입맞추면 부끄러워 몸을 웅크린다", "발바닥을 누르면 힘이 풀린다"], s: [["발목 안쪽", 2, -5], ["발바닥 가운데", 0, 2]] },
  nape: { f: ["뒷목에 입김이 닿으면 몸이 굳는다", "머리칼을 쓸어 올리면 소름이 돋는다"], s: [["머리카락 끝나는 곳", 0, -1.6], ["뒷목 가운데 뼈 위", 0, 1.4]] },
  back: { f: ["등줄기를 손끝으로 내리면 몸이 활처럼 휜다", "날개뼈 사이를 핥으면 소리를 낸다"], s: [["날개뼈 사이", 0, -6], ["등줄기 한가운데", 0, 2]] },
  lowback: { f: ["허리 오목한 곳을 누르면 무릎이 꺾인다", "꼬리뼈 위를 쓸면 엉덩이를 든다"], s: [["허리 뒤 오목한 곳", 0, -2], ["꼬리뼈 바로 위", 0, 6]] },
  butt: { f: ["쥐면 몸을 앞으로 밀착한다", "가볍게 때리면 숨이 걸린다"], s: [["엉덩이 아래 곡선", -4, 5]] },
  anus: { f: ["닿기만 해도 몸이 굳었다가 풀린다", "천천히 다루면 예상보다 크게 반응한다"], s: [["입구 둘레", 0, 0]] },
  knees: { f: ["오금을 쓸면 다리가 휘청인다", "입맞춤에 간지러워 몸을 웃으며 비튼다"], s: [["왼쪽 오금 한가운데", 0, 0]] },
});

// 문자열 → 0~1 난수 생성기(같은 seed면 같은 값)
export function seededRand(seed) {
  let h = 2166136261; for (const ch of String(seed ?? "")) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

// 성감대 3~5곳(약점 정확히 1곳). keep: 이미 있는 zones(그대로 두고 빈 자리만)
export function randomZones(seed, { keep = [], female = null } = {}) {
  const r = seededRand(seed), have = new Set(keep.map((z) => z.part));
  const pool = BODY_PARTS.filter((p) => !have.has(p.id) && ZONE_BANK[p.id] && !(female === false && p.id === "nipples" && r() < 0.5));
  const n = Math.max(0, Math.min(pool.length, 3 + Math.floor(r() * 3) - keep.length));
  const out = [];
  const bag = [...pool]; for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const weakDone = keep.some((z) => z.level >= 3);
  for (const p of bag.slice(0, n)) {
    const B = ZONE_BANK[p.id], weak = !weakDone && !out.some((z) => z.level >= 3) && (out.length === n - 1 || r() < 0.35);
    const z = { part: p.id, level: weak ? 3 : r() < 0.45 ? 2 : 1, note: pick(B.f, r), src: "random" };
    if (weak) { const s = pick(B.s, r); z.spot = s[0]; }
    out.push(z);
  }
  return [...keep, ...out];
}
// 정확한 자리 → 모형 좌표(부위 점 + 오프셋). 모르는 자리면 부위 점 그대로
export function spotXY(part, spot) {
  const p = BODY_PARTS.find((x) => x.id === part); if (!p) return null;
  const s = (ZONE_BANK[part]?.s ?? []).find((x) => x[0] === spot);
  return { x: p.x + (s?.[1] ?? 0), y: p.y + (s?.[2] ?? 0) };
}
