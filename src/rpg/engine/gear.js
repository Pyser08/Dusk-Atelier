// Dusk Saga 엔진 — 이야기 속 무기·기술에 종류·등급·속성을 매긴다. 정해 둔 무기 목록 대신 이 규칙이 성능과 겉모습을 정한다
import { clamp } from "./rules.js";
import { elemOf, elemFromText, ELEMENTS } from "./elements.js";

// 등급 8단계 × 세부(-, 보통, +) = 24칸
export const GRADES = ["조악", "보통", "양질", "정예", "희귀", "영웅", "전설", "신화"], SUB = ["-", "", "+"];
export const RANK_MAX = GRADES.length * 3 - 1;
export const gradeName = (r) => { const n = clamp(Math.round(r), 0, RANK_MAX); return GRADES[Math.floor(n / 3)] + SUB[n % 3]; };
/** "희귀+", "legendary", 7, {…} → 0..23, 모르면 null */
export function rankOf(v) {
  if (typeof v === "number" && Number.isFinite(v)) return clamp(Math.round(v), 0, RANK_MAX); const s = String(v ?? "").trim(); if (!s) return null;
  const i = GRADES.findIndex((g) => s.startsWith(g)); if (i >= 0) return i * 3 + (/\+$/.test(s) ? 2 : /-$/.test(s) ? 0 : 1);
  const en = /^(poor|crude|common|normal|fine|good|elite|superior|rare|epic|heroic|legendary|mythic|divine)([+-]?)$/i.exec(s); if (en) return { poor: 0, crude: 0, common: 1, normal: 1, fine: 2, good: 2, elite: 3, superior: 3, rare: 4, epic: 5, heroic: 5, legendary: 6, mythic: 7, divine: 7 }[en[1].toLowerCase()] * 3 + (en[2] === "+" ? 2 : en[2] === "-" ? 0 : 1);
  const l = /^(SSS|SS|S|A|B|C|D|E|F)([+-]?)(?:급|랭크|rank)?$/i.exec(s); if (l) return { F: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, SS: 7, SSS: 7 }[l[1].toUpperCase()] * 3 + (l[2] === "+" || /^SSS$/i.test(l[1]) ? 2 : l[2] === "-" ? 0 : 1);
  return null;
}
const G = [[22, /신화|신기(?!한|하)|창세|태초|신의\s?(?:검|창|무기|활)|mythic|divine artifact/i], [19, /전설|성검|마검|명왕|용왕|신검|신창|엑스칼리버|legendary|ancient relic/i], [16, /영웅|왕가|국보|가보|고대의|유물|대마법|heroic|epic|heirloom/i], [13, /희귀|명검|명창|명궁|명장|미스릴|오리하르콘|용(?:비늘|뼈|린)|아다만|마법\s?(?:검|창|활|무기)|rare|mithril|enchanted/i], [10, /정예|은(?:제|빛|의)|기사단|장인|맞춤|특제|silver|master/i], [7, /양질|강철|잘\s?(?:벼린|만든)|고급|steel|fine/i], [1, /낡은|녹슨|부러진|조악|싸구려|목(?:검|창|도)|나무(?:칼|몽둥이)|연습용|죽(?:창|검|도)|rusty|broken|wooden|crude|training/i], [4, /철(?:제|의|검|창)|평범|보통|군용|iron|common|standard/i]];
const hash = (t) => { let h = 2166136261; for (const c of String(t)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** 글에서 등급. 단서가 없으면 쓰는 사람 레벨에 맞춘다(같은 이름은 늘 같은 세부 등급) */
export function rankFromText(text, level = 1) { const t = String(text ?? ""), s = hash(t) % 3 - 1; for (const [r, re] of G) if (re.test(t)) return clamp(r + s, 0, RANK_MAX); return clamp(4 + Math.floor(level / 5) + s, 0, 13); }

// 종류: base(규칙상 무기 종류) · 글에서 찾는 낱말 · 위력/명중/필살 차이 · 사거리 · 특징 · 겉모습
const K = (base, n, re, mt, hit, crit, x) => ({ base, n, re, mt, hit, crit, r: [1, 1], ...x });
export const KINDS = {
  katana: K("sword", "도", /카타나|일본도|태도|왜도|katana/i, 0, 0, 12, { shape: "katana" }), rapier: K("sword", "세검", /레이피어|세검|에스터크|rapier/i, -1, 8, 6, { eff: ["armor"], shape: "thin" }), greatsword: K("sword", "대검", /대검|양손검|클레이모어|츠바이핸더|greatsword|claymore/i, 4, -12, 0, { shape: "great" }), saber: K("sword", "곡도", /곡도|세이버|시미터|커틀러스|sab(?:er|re)|scimitar|cutlass/i, 0, 4, 5, { shape: "curve" }), twinsword: K("sword", "쌍검", /쌍검|쌍도|이도류|dual (?:sword|blade)/i, -4, -4, 0, { brave: true, shape: "twin" }), whip: K("sword", "채찍", /채찍|사복검|연검|whip/i, -2, 2, 0, { r: [1, 2], shape: "whip" }),
  halberd: K("lance", "미늘창", /할버드|미늘창|월도|언월도|나기나타|글레이브|halberd|glaive|naginata/i, 2, -6, 0, { eff: ["horse"], shape: "halberd" }), trident: K("lance", "삼지창", /삼지창|트라이던트|trident/i, 0, 0, 8, { shape: "trident" }), javelin: K("lance", "투창", /투창|재블린|javelin/i, -3, -12, 0, { r: [1, 2], shape: "lance" }), pike: K("lance", "장창", /장창|파이크|기병창|랜스|pike/i, 3, -8, 0, { shape: "lance" }), staffpole: K("lance", "봉", /(?:철|쇠|나무)?봉(?=$|[\s,.]|을|이|으로)|육척봉|곤봉술|장봉|quarterstaff/i, -2, 8, 0, { shape: "pole" }),
  scythe: K("axe", "낫", /(?:대|사신의\s?)?낫(?=$|[\s,.]|을|이|으로|의)|사이드(?=$|\s)|scythe/i, 1, -4, 12, { shape: "scythe" }), hammer: K("axe", "망치", /망치|해머|철퇴|메이스|모닝스타|hammer|mace/i, 2, -8, 0, { eff: ["armor", "machine"], shape: "hammer" }), greataxe: K("axe", "대부", /대부|양손\s?도끼|거대한\s?도끼|greataxe/i, 4, -14, 4, { shape: "axe" }), club: K("axe", "곤봉", /곤봉|몽둥이|방망이|club|bat(?=$|\s)/i, 0, 4, 0, { shape: "club" }), throwaxe: K("axe", "손도끼", /손도끼|토마호크|tomahawk/i, -3, -10, 0, { r: [1, 2], shape: "axe" }),
  crossbow: K("bow", "석궁", /석궁|쇠뇌|크로스보우|crossbow/i, 2, 4, 0, { r: [2, 2], shape: "crossbow" }), longbow: K("bow", "장궁", /장궁|롱보우|longbow/i, 1, -10, 0, { r: [2, 3], shape: "bow" }), shortbow: K("bow", "단궁", /단궁|숏보우|shortbow/i, -2, 6, 0, { r: [1, 2], shape: "bow" }),
  fan: K("dagger", "부채", /부채|철선|fan(?=$|\s)/i, -1, 6, 4, { r: [1, 2], shape: "fan" }), chakram: K("dagger", "차크람", /차크람|고리검|원월|chakram/i, 0, 2, 5, { r: [1, 2], shape: "ring" }), shuriken: K("dagger", "수리검", /수리검|쿠나이|표창|암기|shuriken|kunai/i, -1, 4, 5, { r: [1, 2], shape: "star" }), needle: K("dagger", "침", /(?:독|은|장)침|바늘|needle/i, -3, 12, 8, { r: [1, 2], shape: "thin" }), dagger: K("dagger", "단검", /단검|단도|나이프|비수|대거|dagger|knife/i, -1, 6, 8, { shape: "dagger" }),
  wand: K("tome", "완드", /완드|마법봉|지휘봉|wand/i, -1, 8, 0, { r: [1, 2], magic: true, shape: "wand" }), orb: K("tome", "보주", /보주|수정구|오브|구슬|orb|crystal ball/i, 1, 0, 0, { r: [1, 2], magic: true, shape: "orb" }), talisman: K("tome", "부적", /부적|주부|카드|타로|talisman/i, -1, 4, 6, { r: [1, 2], magic: true, shape: "card" }), instrument: K("tome", "악기", /하프|류트|비파|피리|바이올린|기타(?=$|[\s를와])|악기|lute|harp|flute/i, -2, 10, 0, { r: [1, 2], magic: true, shape: "lute" }), tome: K("tome", "마도서", /마도서|마법서|주문서|그리모어|grimoire|tome|spellbook/i, 0, 0, 0, { r: [1, 2], magic: true, shape: "book" }),
  holystaff: K("staff", "성장", /치유의\s?지팡이|성장(?=$|\s)|홀(?=$|\s)|회복\s?지팡이|healing staff/i, 0, 0, 0, { shape: "staff" }), magestaff: K("tome", "지팡이", /지팡이|스태프|석장|staff/i, 0, 2, 0, { r: [1, 2], magic: true, shape: "staff" }),
  shield: K("claw", "방패", /방패|실드|shield/i, -2, 0, 0, { shape: "shield" }), claw: K("claw", "발톱", /발톱|클로|손톱|claw/i, 0, 4, 8, { shape: "claw" }), fist: K("claw", "권갑", /건틀릿|너클|권갑|주먹|맨손|글러브|gauntlet|knuckle|fist/i, 0, 2, 0, { shape: "fist" }), chain: K("claw", "사슬", /사슬|쇠사슬|플레일|쌍절곤|chain|flail|nunchaku/i, 0, -4, 4, { r: [1, 2], shape: "whip" }), sniper: K("claw", "저격총", /저격\s?총?|스나이퍼|sniper/i, 4, 2, 8, { r: [2, 4], gun: "sniper", shape: "rifle" }), shotgun: K("claw", "산탄총", /산탄\s?총?|샷건|shotgun/i, 4, -12, 0, { r: [1, 2], gun: "shotgun", shape: "rifle" }), smg: K("claw", "기관총", /기관\s?단?총?|머신건|개틀링|smg|machine ?gun/i, -2, -12, 0, { r: [1, 2], gun: "auto", brave: true, shape: "rifle" }), rifle: K("claw", "소총", /소총|라이플|머스킷|카빈|rifle|musket/i, 2, 0, 0, { r: [1, 3], gun: "rifle", shape: "rifle" }), pistol: K("claw", "권총", /권총|리볼버|피스톨|핸드건|마총|총(?=$|[\s,.]|을|이|으로)|pistol|revolver|handgun/i, 0, 0, 4, { r: [1, 2], gun: "pistol", shape: "pistol" }), beam: K("claw", "광선 무기", /광선|레이저|플라즈마|빔\s?(?:건|소드)|beam|laser|plasma/i, 1, 4, 0, { r: [1, 2], magic: true, shape: "beam" }),
  bow: K("bow", "활", /활(?!동|기|력|약|발|주|용)|보우(?=$|\s)|bow(?=$|\s)/i, 0, 0, 0, { r: [2, 2], shape: "bow" }), lance: K("lance", "창", /창(?!문|고|백|조|가|피|밖|업|설|립|틀|살)|스피어|spear|lance/i, 0, 0, 0, { shape: "lance" }), axe: K("axe", "도끼", /도끼|액스|axe/i, 1, -8, 0, { shape: "axe" }), sword: K("sword", "검", /검(?!은|정|사|증|색|열|문|진|찰|토|술|객)|칼|소드|장검|sword|blade/i, 0, 0, 0, { shape: "sword" }),
};
/** 글에서 무기 종류: 가장 뒤에 나온 낱말(‘용의 뼈로 만든 대검’), 같은 자리면 자세한 쪽 */
export function kindFromText(t) { const s = String(t ?? "").normalize("NFKC"); let best = "", end = 0; for (const [k, v] of Object.entries(KINDS)) { const m = v.re.exec(s); if (m && m.index + m[0].trimEnd().length > end) { best = k; end = m.index + m[0].trimEnd().length; } } return best; }
/** 이야기 속 무기 하나 → 규칙에서 쓰는 무기. o = { name, desc, kind, grade, elem } */
export function makeWeapon(o, level = 1) {
  const name = String(o?.name ?? "").trim().slice(0, 30), text = name + " " + String(o?.desc ?? ""), kind = (Object.prototype.hasOwnProperty.call(KINDS, o?.kind ?? "") && o.kind) || kindFromText(name) || kindFromText(text) || "sword", k = KINDS[kind];
  const rank = rankOf(o?.grade) ?? rankFromText(text, level), elem = elemOf(o?.elem) || elemFromText(text), heal = k.base === "staff";
  const mt = heal ? clamp(6 + Math.round(rank * 1.6), 4, 44) : clamp(Math.round(2 + rank * .62) + k.mt, 1, 20), hit = heal ? 100 : clamp(84 + Math.round(rank * .5) + k.hit, 50, 120), crit = clamp(k.crit + Math.max(0, Math.round((rank - 12) * 1.2)), 0, 50);
  const w = { name: name || k.n, type: k.base, kind, grade: rank, mt, hit: hit, crit: heal ? 0 : crit, rmin: k.r[0], rmax: heal && rank >= 15 ? 2 : k.r[1], max: heal ? 20 : 0, uses: heal ? 20 : 0 };
  if (elem) w.elem = elem; if (k.brave) w.brave = true; if (k.magic && k.base !== "tome") w.magic = true; if (k.gun) w.gun = k.gun; const eff = [...(k.eff ?? [])]; if (elem === "light" && rank >= 16) eff.push("undead", "demon"); if (/용\s?(?:사냥|살|퇴치)|드래곤\s?슬레이어|dragon ?slay/i.test(text)) eff.push("dragon"); if (/마물\s?사냥|짐승\s?사냥|beast/i.test(text)) eff.push("beast"); if (eff.length) w.eff = [...new Set(eff)].slice(0, 4); if (/흡혈|피를\s?(?:빠|마)|흡수|vampiric|lifesteal/i.test(text)) w.drain = clamp(20 + rank, 20, 45);
  return w;
}
// ── 기술: 봇마다 다른 고유 기술에 등급을 매기고, 등급이 정한 총합 상한 안에서 특성대로 점수를 나눈다 ──
/** 등급(0..23) → 쓸 수 있는 점수 총합 */
export const budgetOf = (rank) => Math.round((4 + clamp(rank, 0, RANK_MAX) * 1.35) * 10) / 10;
// 특성: 낱말 · 한 점의 값(cost) · 상한(max) · 넣는 법. flag는 켜고 끄는 특성(값 고정)
const T = (re, cost, max, put, get, flag) => ({ re, cost, max, put, get, flag });
const mod = (k) => [(s, v) => { s.mods[k] = (s.mods[k] || 0) + v; }, (s) => Math.max(0, s.mods[k] || 0)], flg = (k) => [(s, v) => { s.flags[k] = v; }, (s) => s.flags[k] || 0];
export const TRAITS = {
  power: T(/강력|파괴|폭발|일격|강타|작열|분쇄|섬멸|powerful|destroy|explos|smash/i, 2.1, 8, ...mod("atk")), accuracy: T(/정확|정밀|조준|명중|겨냥|precise|accura/i, .4, 40, ...mod("hit")), critical: T(/급소|치명|필살|심장|암살|critical|lethal|vital/i, .5, 40, ...mod("crit")), speed: T(/재빠|신속|가속|민첩|순간|질주|swift|haste|quick/i, 2.6, 6, ...mod("spd")), evade: T(/회피|잔상|환영|흘려|피하|안개|evade|dodge|illusion/i, .6, 40, ...mod("avo")), armor: T(/방어|단단|갑옷|철벽|막아|수호|방패|결계|장막|ward|shield|protect|barrier/i, 3, 8, ...mod("def")), ward: T(/항마|마법\s?(?:방어|저항)|마력\s?장막|결계|정화|magic resist|dispel/i, 3, 8, ...mod("res")),
  pierce: T(/관통|꿰뚫|무시|뚫|pierc|penetrat|ignore/i, .14, 75, ...flg("pierce")), drain: T(/흡수|흡혈|빨아|탈취|drain|absorb|steal life/i, .16, 75, ...flg("drain")), regen: T(/치유|회복|재생|되살|heal|regenerat|restore/i, 3, 10, ...flg("regen")), block: T(/경감|반감|튕겨|상쇄|deflect|reduce damage|parry/i, .22, 60, ...flg("block")),
  multi: T(/연격|연속|난무|난사|두\s?번|연타|무수|쌍|combo|flurry|barrage|twice/i, 9, 1, ...flg("brave"), true), sure: T(/필중|반드시|추적|유도|빗나가지|homing|unerring/i, 6, 1, ...flg("sure"), true), ambush: T(/기습|암습|배후|은신|그림자\s?이동|반격.{0,6}(?:못|없|불)|틈을|ambush|stealth|backstab|no counter/i, 7, 1, ...flg("noCounter"), true), reach: T(/원거리|멀리|사거리|광역|하늘에서|저격|멀리서|ranged|distant|from afar/i, 4, 1, (s) => { s.range = [1, 3]; }, (s) => (s.range?.[1] >= 3 ? 1 : 0), true), amplify: T(/궁극|비기|오의|최강|필살기|전력|모든\s?(?:힘|것)|각성|ultimate|all.{0,5}power/i, 22, 1.2, (s, v) => { s.flags.mult = Math.round((1 + v) * 10) / 10; }, (s) => (s.flags.mult ? s.flags.mult - 1 : 0)),
};
const CD = 1.5; // 기본 2턴보다 길어질 때마다 돌려받는 점수
/** 기술 하나가 쓴 점수. 깎인 능력(음수)과 긴 재사용은 그만큼 돌려준다 */
export function costOf(s) {
  let c = 0; for (const t of Object.values(TRAITS)) { const v = t.get(s); if (v > 0) c += t.flag ? t.cost : v * t.cost; }
  for (const [k, w] of [["atk", 1.2], ["def", .8], ["res", .8], ["spd", .8], ["hit", .15], ["avo", .15], ["crit", .2]]) if (s.mods?.[k] < 0) c += s.mods[k] * w;
  if (s.type === "art") c -= Math.max(0, (s.cd ?? 2) - 2) * CD; else if (s.type === "proc") c *= typeof s.rate === "number" ? Math.max(.25, s.rate / 100) : .4; else if (s.cond && s.cond !== "always") c *= .75;
  return Math.round(c * 100) / 100;
}
/** 상한을 넘으면 비율대로 줄인다(값이 큰 켜고 끄는 특성부터 뺀다). 모자란 것은 건드리지 않는다 */
export function fitBudget(s, rank) {
  const cap = budgetOf(rank); for (let guard = 0; guard < 60 && costOf(s) > cap; guard++) {
    const on = Object.entries(TRAITS).filter(([, t]) => t.get(s) > 0), soft = on.filter(([, t]) => !t.flag), k = cap / costOf(s);
    let cut = false; for (const [n, t] of soft) { const v = t.get(s), nv = n === "amplify" ? Math.floor(v * k * 10) / 10 : Math.floor(v * k); if (nv < v) { cut = true; if (n === "amplify") { if (nv > 0) s.flags.mult = Math.round((1 + nv) * 10) / 10; else delete s.flags.mult; } else if (["pierce", "drain", "regen", "block"].includes(n)) { if (nv > 0) s.flags[n] = nv; else delete s.flags[n]; } else { const m = { power: "atk", accuracy: "hit", critical: "crit", speed: "spd", evade: "avo", armor: "def", ward: "res" }[n]; if (nv > 0) s.mods[m] = nv; else delete s.mods[m]; } } }
    if (!cut || guard > 6) { const f = on.filter(([, t]) => t.flag).sort((a, b) => b[1].cost - a[1].cost)[0]; if (f) { if (f[0] === "reach") delete s.range; else delete s.flags[{ multi: "brave", sure: "sure", ambush: "noCounter" }[f[0]]]; } else if (!cut) break; }
  }
  return s;
}
/** 글에서 특성 비중. 많이 나올수록 무겁다 */
export function traitsFromText(text) { const out = {}; for (const [k, t] of Object.entries(TRAITS)) { const n = (String(text).match(new RegExp(t.re.source, "gi")) ?? []).length; if (n) out[k] = Math.min(4, 1 + n); } return out; }
/**
 * 이야기·장기기억의 기술 하나 → 게임 기술. 이름은 봇의 것 그대로.
 * o = { name, desc, grade, elem, traits:{power:3,…}(비중), type, cond }
 */
export function makeSpell(o, level = 1) {
  const name = String(o?.name ?? "").trim().slice(0, 30); if (!name) return null; const desc = String(o?.desc ?? "").trim().slice(0, 160), text = name + " " + desc, rank = rankOf(o?.grade) ?? rankFromText(text, level), elem = elemOf(o?.elem) || elemFromText(text), cap = budgetOf(rank);
  const given = Object.fromEntries(Object.entries(o?.traits && typeof o.traits === "object" ? o.traits : {}).filter(([k, v]) => Object.prototype.hasOwnProperty.call(TRAITS, k) && Number(v) > 0).map(([k, v]) => [k, clamp(Number(v), .5, 10)])), w = Object.keys(given).length ? given : traitsFromText(text);
  const bodily = /검|칼|창|도끼|활|주먹|권|발차기|베기|찌르기|사격|참격|일섬|slash|strike|kick|punch|shot/i.test(text) && !/마법|주문|마력|spell|magic/i.test(text), magic = !bodily && (!!elem || /마법|주문|마력|술식|spell|magic/i.test(text));
  const support = ["regen", "armor", "ward", "evade", "speed"], keys = Object.keys(w), passive = ["passive", "proc", "art"].includes(o?.type) ? o.type !== "art" : keys.length > 0 && keys.every((k) => support.includes(k) || k === "block"), proc = passive && (o?.type === "proc" || (w.block && !w.armor && !w.ward));
  const s = { id: "sp_" + hash(name + "|" + desc).toString(36), name, desc, type: proc ? "proc" : passive ? "passive" : "art", cond: ["always", "initiating", "defending", "hp_below_half", "hp_full", "adjacent_ally", "alone", "on_cover"].includes(o?.cond) ? o.cond : passive && (w.armor || w.ward) ? "defending" : "always", mods: {}, flags: {}, tier: "own", grade: rank };
  if (elem) s.elem = elem; if (s.type === "art") { s.cd = 2 + Math.floor(rank / 8); if (magic) { s.flags.magic = true; s.range = [1, 2]; } if (!keys.some((k) => !support.includes(k))) w.power = Math.max(w.power ?? 0, 3); } else { for (const k of ["multi", "sure", "ambush", "reach", "amplify"]) delete w[k]; if (!Object.keys(w).length) w[support.includes(keys[0]) ? keys[0] : "power"] = 2; }
  if (proc) { s.rate = 25 + rank; if (!w.block) delete w.regen; }
  // 같은 이름은 늘 같은 분배: 비중에 작은 흔들림을 이름으로 준다
  const L = Object.entries(w).map(([k, v]) => [k, v * (1 + ((hash(name + k) % 21) - 10) / 100)]).sort((a, b) => b[1] - a[1]), room = () => cap - costOf(s);
  for (const [k] of L.filter(([k]) => TRAITS[k].flag)) { const save = JSON.stringify(s); TRAITS[k].put(s, 1 === 1 && k !== "reach" ? true : 1); if (costOf(s) > cap * (L.length > 1 ? .75 : 1)) Object.assign(s, { mods: {}, flags: {}, range: undefined }, JSON.parse(save)), (JSON.parse(save).range ? 0 : delete s.range); }
  if (s.type === "art" && L.every(([k]) => TRAITS[k].flag)) L.push(["power", 2]);
  const soft = L.filter(([k]) => !TRAITS[k].flag), total = soft.reduce((n, [, v]) => n + v, 0) || 1, pool = room(), sc = s.type === "passive" && s.cond !== "always" ? .75 : s.type === "proc" ? Math.max(.25, s.rate / 100) : 1;
  for (const [k, v] of soft) { const t = TRAITS[k], raw = Math.min(t.max, pool * v / total / t.cost / sc), val = k === "amplify" ? Math.floor(raw * 10) / 10 : Math.floor(raw); if (val > 0) t.put(s, val); }
  // 남은 점수: 공격은 위력·명중, 지원은 첫 특성
  for (let i = 0; i < 40 && room() >= .2; i++) { const order = s.type === "art" ? ["power", "amplify", "accuracy", "critical"] : [...soft.map(([k]) => k), ...(s.type === "passive" ? w.armor || w.ward ? ["armor", "ward", "evade"] : w.regen ? ["ward", "armor"] : ["evade", "accuracy", "power"] : [])]; let put = false; for (const k of order) { const t = TRAITS[k]; if (!t) continue; const now = t.get(s); if (k === "amplify") { if (now + .1 > t.max || 2.2 > room()) continue; t.put(s, Math.round((now + .1) * 10) / 10); put = true; break; } if (now + 1 > t.max || t.cost * sc > room()) continue; if (["pierce", "drain", "regen", "block"].includes(k)) t.put(s, now + 1); else t.put(s, 1); put = true; break; } if (!put) break; }
  return fitBudget(s, rank);
}
// ── 장기기억·로어북 글에서 무기와 기술 뽑기 ──
const tidy = (s) => String(s ?? "").replace(/[*_`#"“”「」『』\[\]]/g, "").trim();
export function parseGear(text) {
  const out = [], seen = new Set(), add = (type, name, desc, grade) => { name = tidy(name).slice(0, 30); const k = type + name.replace(/\s/g, ""); if (name.length < 2 || /^(?:없음|없다|미상|불명|none|n\/a|-)$/i.test(name) || seen.has(k) || out.length >= 24) return; seen.add(k); out.push({ type, name, desc: tidy(desc).slice(0, 160), ...(grade ? { grade } : {}) }); };
  let mode = ""; for (const line0 of String(text ?? "").normalize("NFKC").split(/\r?\n/)) {
    const line = line0.trim(); if (!line) continue; const h = /^(?:[-•*#■◆●\d.)\s]*)\[?\s*(무기|주무장|부무장|장비|소지\s?무기|weapons?|equipment|기술|스킬|마법|주문|능력|필살기|고유\s?능력|skills?|spells?|magic|abilit(?:y|ies))\s*\]?\s*(?:[:：]\s*(.*))?$/i.exec(line);
    if (h) { mode = /무기|무장|장비|weapon|equip/i.test(h[1]) ? "weapon" : "spell"; if (!h[2]) continue; for (const part of h[2].split(/[,、;/]|\s그리고\s/)) item(part); if (h[2]) mode = /무기|무장|장비|weapon|equip/i.test(h[1]) ? "weapon" : "spell"; continue; }
    if (/^(?:#{1,6}|■|◆|\[)/.test(line) || /^[^\s:：]{1,12}[:：]/.test(line) && !/^[-•*]/.test(line)) { mode = ""; continue; } if (mode && /^[-•*\d]/.test(line)) item(line.replace(/^(?:[-•*]|\d+[.)])\s*/, "")); else if (mode) mode = "";
  }
  function item(p) { const s = p.trim(); if (!s) return; const g = /[(\[（]\s*(?:등급\s*[:：]?\s*)?((?:조악|보통|양질|정예|희귀|영웅|전설|신화)[+-]?|(?:SSS|SS|S|A|B|C|D|E|F)[+-]?\s?(?:급|랭크|rank)?)\s*[)\]）]/i.exec(s), t = (g ? s.replace(g[0], " ") : s).trim(), m = /^(.+?)(?:\s*[:：]\s*|\s+[-–—]\s+|\s*\()(.*?)\)?$/.exec(t); add(mode, m ? m[1] : t, m ? m[2] : "", g?.[1]?.replace(/\s/g, "")); }
  return out;
}
/** 본문에서 그 인물이 쥔 무기: ‘아린은 서리의 장검을 뽑았다’ */
export function gearInProse(text, names) {
  const out = []; for (const n of names) { if (String(n).length < 2) continue; const re = new RegExp(`${String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:은|는|이|가|의)\\s+(?:[^.!?\\n]{0,24}?\\s)?((?:[^\\s.,!?]{1,10}\\s){0,2}[^\\s.,!?]{1,12}?)(?:을|를)\\s+(?:뽑|휘두르|휘둘|쥐|쥔|들고|들었|겨누|겨눴|꺼내|꺼냈|내리|치켜|장전|당기)`, "g"); let m; while ((m = re.exec(String(text ?? "")))) { const name = tidy(m[1]); if (kindFromText(name) && !out.some((x) => x.name === name)) out.push({ type: "weapon", name, desc: "" }); } } return out.slice(-3);
}
/** 무기 겉모습(3D·아이콘용): 모양·등급 단계·속성 색 */
export const lookOf = (w) => ({ shape: KINDS[w?.kind]?.shape ?? { sword: "sword", lance: "lance", axe: "axe", bow: "bow", tome: "book", dagger: "dagger", staff: "staff", claw: "fist" }[w?.type] ?? "", tier: w?.grade == null ? 1 : Math.floor(w.grade / 3), glow: ELEMENTS[w?.elem]?.c ?? "", kind: w?.kind ?? "", name: w?.name ?? "", elem: ELEMENTS[w?.elem] ? w.elem : "" });
export const KIND_LINES = Object.entries(KINDS).map(([k, v]) => k + "(" + v.n + ")").join(" ");
