// Dusk Saga 방어구: 직업군 5개 × 부위 5개. 같은 소재라도 직업군마다 이름·모양·능력치가 다르다. 아무것도 안 입으면 속옷 차림.
// d.armor = { head?, body?, hands?, legs?, feet? } 각 칸 = 방어구(아래 piece). 같은 세트(같은 몬스터·같은 금속) 2부위·4부위면 세트 효과.
import { GRADE_ORDER, PAL, BY_ID, ELEM_NAME } from "./materials.js";
import { familyOf } from "./famrules.js";

export const GROUPS = {
  heavy: { n: "중갑", about: "기사·창병·도끼전사·기병 — 판금, 단단하고 무겁다", outfit: "knight" },
  light: { n: "경갑", about: "검사·도적·궁수 — 가죽·비늘, 가볍고 잘 피한다", outfit: "ranger" },
  robe: { n: "로브", about: "마도사·사제 — 천·깃털, 마법에 강하다", outfit: "mage" },
  brawler: { n: "무투", about: "격투가 — 붕대·뼈·가죽, 손발이 무기", outfit: "fighter" },
  tactical: { n: "전술", about: "총사·현대 요원 — 방탄천·판, 명중과 안정", outfit: "hunter" },
};
export const SLOTS = { head: "머리", body: "몸", hands: "손", legs: "다리", feet: "발" };
const JOBG = { 중기사: "heavy", 창병: "heavy", 도끼전사: "heavy", 기병: "heavy", 검사: "light", 도적: "light", 궁수: "light", 비행병: "light", 마도사: "robe", 사제: "robe", 격투가: "brawler", 총사: "tactical" };
const OUTG = { knight: "heavy", heavy: "heavy", soldier: "heavy", samurai: "heavy", rogue: "light", ranger: "light", ninja: "light", pirate: "light", traveler: "light", bard: "light", dancer: "light", mage: "robe", priest: "robe", druid: "robe", alchemist: "robe", royal: "robe", noble: "robe", maid: "robe", fighter: "brawler", monk: "brawler", barbarian: "brawler", suit: "tactical", uniform: "tactical", hunter: "tactical" };
const WG = { tome: "robe", staff: "robe", claw: "brawler", bow: "light", dagger: "light", axe: "heavy", lance: "heavy", sword: "light" };
/** 동료의 직업군 */
export function groupOf(d) {
  if (!d) return "light"; if (d.agroup && GROUPS[d.agroup]) return d.agroup; if (JOBG[d.job]) return JOBG[d.job];
  if (OUTG[d.outfit]) return OUTG[d.outfit]; if (d.mtype === "armor") return "heavy"; const w = (d.weapons || []).find((x) => x.type !== "item" && x.type !== "staff") || d.weapons?.[0];
  if (w?.gun || /pistol|rifle|gun/.test(w?.kind || "")) return "tactical"; return WG[w?.type] || "light";
}
// 직업군 × 부위: 이름 꼬리와 능력치(보통 등급 기준)
const PRO = {
  heavy: { head: ["투구", { def: 2 }], body: ["판금 흉갑", { def: 5, res: 1, spd: -2 }], hands: ["건틀릿", { def: 2, atk: 1 }], legs: ["다리 갑옷", { def: 3, spd: -1 }], feet: ["철 장화", { def: 2, spd: -1 }] },
  light: { head: ["두건", { def: 1, avo: 3 }], body: ["경갑", { def: 3, avo: 5 }], hands: ["가죽 장갑", { def: 1, hit: 5 }], legs: ["각반", { def: 2, avo: 3 }], feet: ["가죽 장화", { avo: 4, spd: 1 }] },
  robe: { head: ["후드", { res: 2, hit: 3 }], body: ["로브", { res: 5, def: 1 }], hands: ["비단 장갑", { res: 1, hit: 5 }], legs: ["치맛자락", { res: 2, def: 1 }], feet: ["샌들", { res: 1, avo: 2 }] },
  brawler: { head: ["머리띠", { def: 1, crit: 3 }], body: ["무도복", { def: 3, atk: 1 }], hands: ["권투 붕대", { atk: 2, crit: 5 }], legs: ["무릎 보호대", { def: 2, avo: 3 }], feet: ["발싸개", { spd: 1, avo: 3 }] },
  tactical: { head: ["헬멧", { def: 1, hit: 5 }], body: ["방탄조끼", { def: 3, res: 2 }], hands: ["전술 장갑", { hit: 5, def: 1 }], legs: ["전술 바지", { def: 2, avo: 3 }], feet: ["전투화", { spd: 1, avo: 2 }] },
};
const gi = (g) => Math.max(0, GRADE_ORDER.indexOf(String(g || "보통").replace(/[+-]$/, "")));
/** 방어구 한 벌 만들기. mat = 주재료(가방 항목·도감 항목) */
export function makeArmor(group, slot, mat, grade) {
  const [tail, base] = PRO[group][slot], g = grade || mat?.grade || "보통", k = (0.3 + gi(g) * 0.12) * (mat?.starter ? 0.5 : 1), st = {};
  for (const [s, v] of Object.entries(base)) { const x = v < 0 ? (mat?.starter ? 0 : v) : Math.round(v * k); if (x) st[s] = x; } if (!Object.keys(st).length && !mat?.starter) st[Object.keys(base)[0]] = 1;
  const src = mat?.src || "", mid = mat?.mid || "", setKey = src ? "mon:" + src.replace(/^우두머리 /, "") : mid ? "mat:" + mid.replace(/^(ingot|ore|log|cloth|hide)_/, "") : "";
  const baseName = src ? src.replace(/^우두머리 /, "") + " " + String(mat.name || "").replace(/^.+의 /, "") : String(mat?.name || "").replace(/ 주괴$| 원목$/, "");
  return { slot, group, name: (baseName ? baseName + " " : "") + tail, grade: g, st, elem: mat?.elem || "", set: setKey, setName: src ? src.replace(/^우두머리 /, "") : String(mat?.name || "").replace(/ 주괴$/, ""), pal: mat?.pal || "iron" };
}
// 세트 효과: 무리(몬스터)·금속마다 2부위·4부위
const SETFX = {
  dragon: [{ n: "용린", m: { def: 2 }, resist: "own" }, { n: "용의 분노", m: { atk: 3 }, resist: "own", boost: "own" }],
  chimera: [{ n: "합성 가죽", m: { def: 1, avo: 5 } }, { n: "세 머리", m: { atk: 2, crit: 10 } }],
  beast: [{ n: "야성", m: { spd: 2 } }, { n: "사냥 본능", m: { spd: 2, crit: 15 } }], bird: [{ n: "깃털처럼", m: { avo: 8 } }, { n: "질풍", m: { avo: 8, spd: 3 } }],
  insect: [{ n: "갑각", m: { def: 2 } }, { n: "맹독", m: { def: 2, atk: 2 } }], spider: [{ n: "거미줄", m: { hit: 8 } }, { n: "포식자", m: { hit: 8, crit: 8 } }],
  aqua: [{ n: "조수", m: { res: 2 }, resist: "water" }, { n: "심해", m: { res: 3 }, resist: "water", regen: 3 }], jelly: [{ n: "말랑함", m: { avo: 6 } }, { n: "독촉수", m: { avo: 6, res: 2 } }],
  reptile: [{ n: "냉혈", m: { def: 1, res: 1 } }, { n: "탈피", m: { def: 2, res: 2 }, regen: 3 }], turtle: [{ n: "등딱지", m: { def: 3 } }, { n: "철벽", m: { def: 5, spd: -1 } }], toad: [{ n: "점액", m: { avo: 5 }, resist: "poison" }, { n: "독 면역", m: { avo: 5 }, resist: "poison", immune: "poison" }],
  slime: [{ n: "탄성", m: { def: 1 }, regen: 2 }, { n: "재생 점액", m: { def: 1 }, regen: 5 }], plant: [{ n: "광합성", regen: 2 }, { n: "뿌리 내림", m: { def: 2 }, regen: 4 }], treant: [{ n: "나무껍질", m: { def: 2 } }, { n: "고목", m: { def: 3, res: 2 }, regen: 3 }], spore: [{ n: "포자", m: { avo: 4 } }, { n: "환각 포자", m: { avo: 8 } }],
  golem: [{ n: "돌 피부", m: { def: 3, spd: -1 } }, { n: "부동", m: { def: 5, res: 2, spd: -1 } }], armor: [{ n: "녹슨 판금", m: { def: 2 } }, { n: "깃든 혼", m: { def: 2, res: 3 } }], mimic: [{ n: "속임수", m: { avo: 5 } }, { n: "탐욕", m: { crit: 10, avo: 5 } }], doll: [{ n: "저주", m: { res: 3 } }, { n: "대신 받기", m: { res: 3, def: 2 } }],
  undead: [{ n: "죽음의 기운", m: { res: 2 }, resist: "dark" }, { n: "불사", m: { res: 3 }, resist: "dark", regen: 3 }], ghost: [{ n: "영체", m: { avo: 8 } }, { n: "유령 걸음", m: { avo: 12, spd: 1 } }],
  spirit: [{ n: "정령 가호", m: { res: 2 }, resist: "own" }, { n: "원소 일체", m: { res: 3 }, resist: "own", boost: "own" }], demon: [{ n: "마기", m: { atk: 2 } }, { n: "악마의 계약", m: { atk: 4, crit: 5 } }],
  giant: [{ n: "거인의 힘", m: { atk: 2 } }, { n: "거구", m: { atk: 3, def: 2 } }], eye: [{ n: "마안", m: { hit: 10 } }, { n: "꿰뚫는 시선", m: { hit: 15, crit: 10 } }], shadow: [{ n: "그림자", m: { avo: 6 } }, { n: "그림자 숨기", m: { avo: 10, crit: 5 } }],
  machine: [{ n: "장갑", m: { def: 2, res: 1 }, resist: "thunder" }, { n: "과부하", m: { def: 2, hit: 10 }, resist: "thunder" }],
  iron: [{ n: "철갑", m: { def: 2 } }, { n: "철벽 진형", m: { def: 4 } }], steel: [{ n: "강철", m: { def: 3 } }, { n: "강철 의지", m: { def: 4, res: 2 } }], copper: [{ n: "구리", m: { res: 2 } }, { n: "번개막이", m: { res: 2 }, resist: "thunder" }],
  silver: [{ n: "은빛", m: { res: 3 }, resist: "dark" }, { n: "퇴마", m: { res: 3, atk: 2 }, resist: "dark" }], gold: [{ n: "황금", m: { res: 2, crit: 5 } }, { n: "왕의 위엄", m: { res: 3, crit: 10, hit: 5 } }],
  mithril: [{ n: "미스릴", m: { def: 2, avo: 5 } }, { n: "바람 갑주", m: { def: 3, avo: 8, spd: 1 } }], adamant: [{ n: "아다만", m: { def: 4 } }, { n: "불괴", m: { def: 6, res: 3 } }], dark: [{ n: "흑철", m: { atk: 2 }, resist: "dark" }, { n: "어둠의 갑주", m: { atk: 3, crit: 8 }, resist: "dark" }],
  holy: [{ n: "성은", m: { res: 3 }, resist: "dark" }, { n: "성역", m: { res: 4 }, resist: "dark", regen: 4 }], meteor: [{ n: "운철", m: { def: 3, atk: 1 } }, { n: "천공의 무게", m: { def: 4, atk: 3 } }],
  leather: [{ n: "가죽옷", m: { avo: 4 } }, { n: "숙련된 손질", m: { avo: 6, spd: 1 } }], silk: [{ n: "비단결", m: { res: 2, avo: 3 } }, { n: "천의무봉", m: { res: 4, avo: 6 } }], linen: [{ n: "평상복", m: { avo: 2 } }, { n: "익숙한 옷", m: { avo: 4, hit: 3 } }],
};
const setFam = (key) => { if (!key) return ""; const [kind, v] = key.split(":"); if (kind === "mon") return familyOf(v)?.fam || ""; return { iron: "iron", steel: "steel", copper: "copper", silver: "silver", gold: "gold", mithril: "mithril", adamant: "adamant", dark: "dark", holy: "holy", meteor: "meteor", leather: "leather", raw: "leather", white: "leather", black: "leather", silk: "silk", linen: "linen", red: "linen" }[v] || ""; };
/** 입은 방어구의 세트: [{ key, name, n, fam, fx:[2부위 효과, 4부위 효과?] }] */
export function setsOf(d) {
  const c = new Map(); for (const a of Object.values(d?.armor || {})) if (a?.set) { const o = c.get(a.set) || { key: a.set, name: a.setName, n: 0, elem: a.elem }; o.n++; c.set(a.set, o); }
  return [...c.values()].map((o) => { const f = SETFX[setFam(o.key)]; return { ...o, fam: setFam(o.key), fx: f ? (o.n >= 4 ? [f[0], f[1]] : o.n >= 2 ? [f[0]] : []) : [], all: f || [] }; });
}
/** combat.mods가 부른다(사냥 규칙): 방어구 능력치 + 세트 효과 */
export function armorMods(S, u, m, fl) {
  const d = S.defs[u.ref]; if (!d?.armor) return;
  for (const a of Object.values(d.armor)) if (a?.st) for (const [k, v] of Object.entries(a.st)) m[k] = (m[k] || 0) + v;
  for (const s of setsOf(d)) for (const fx of s.fx) { if (fx.m) for (const [k, v] of Object.entries(fx.m)) m[k] = (m[k] || 0) + v; }
}
/** 받는 속성 피해 배율: 그 속성 방어구 한 부위마다 −6%, 세트 저항 −25% */
export function armorResist(S, d, elem) {
  if (!S.hunt || !elem || !d?.armor) return 1; let k = 1;
  for (const a of Object.values(d.armor)) if (a?.elem === elem) k *= 0.94;
  for (const s of setsOf(d)) for (const fx of s.fx) { const r = fx.resist === "own" ? s.elem : fx.resist; if (r && r === elem) k *= fx.immune ? 0.5 : 0.75; }
  return k;
}
/** 같은 속성 공격 강화(용·정령 4세트) */
export function armorBoost(S, d, elem) { if (!S.hunt || !elem || !d?.armor) return 1; for (const s of setsOf(d)) for (const fx of s.fx) if (fx.boost === "own" && s.elem === elem) return 1.2; return 1; }
/** 턴 시작 회복(세트) */
export const armorRegen = (d) => setsOf(d).reduce((n, s) => n + s.fx.reduce((x, f) => x + (f.regen || 0), 0), 0);

// ── 처음 입은 옷 → 방어구(외관 그대로) ──
const OUTN = { traveler: "여행자", soldier: "병사", knight: "기사", heavy: "중장", rogue: "도적", ranger: "사냥꾼", mage: "마법사", priest: "사제", noble: "귀족", dancer: "평복", fighter: "무도가", ninja: "암살자", suit: "정장", uniform: "교복", hunter: "요원", royal: "왕족", samurai: "무사", pirate: "해적", bard: "음유시인", monk: "수도승", barbarian: "야만전사", maid: "메이드", alchemist: "연금술사", druid: "드루이드" };
/** 이야기 속 옷차림을 방어구 다섯 벌로(한 번만). outfit = 3D 복장 키(없으면 직업군 기본) */
export function starterArmor(d, outfit) {
  if (!d || d.armor) return false; const g = groupOf(d), o = outfit || d.outfit || GROUPS[g].outfit, nm = OUTN[o] || "여행자", grade = d.level >= 20 ? "정예" : d.level >= 10 ? "양질" : "보통";
  d.armor = {}; for (const s of Object.keys(SLOTS)) { const a = makeArmor(g, s, { name: nm + "의", grade, starter: true }, grade); a.name = nm + " " + PRO[g][s][0]; a.outfit = o; a.set = ""; d.armor[s] = a; }
  if (!d.outfit) d.outfit = o; return true;
}
// ── 3D 외관: 입은 방어구 → 복장 키 + 덧칠(직업군·소재 무리·등급·속성·세트가 모두 모양에 드러난다) ──
const hex = (c) => (typeof c === "string" ? parseInt(c.replace("#", ""), 16) : c);
const colOf = (a, i = 1) => hex((PAL[a?.pal] || PAL.iron)[i]);
const ECOL = { fire: 0xff6a3a, water: 0x3f9fe0, ice: 0x9fe0f2, thunder: 0xf2d23a, wind: 0x8fe0b0, earth: 0xb08a5a, plant: 0x6fbf4a, poison: 0x9a5fc0, light: 0xfff0a0, dark: 0x6a4ac0, steel: 0xb9c2d0, blood: 0xc02040, arcane: 0xc07aff, sound: 0xe08ad0, gravity: 0x5a5ae0 };
const famOfA = (a) => (a?.set?.startsWith("mon:") ? familyOf(a.set.slice(4))?.fam || "" : "");
const metalOf = (a) => /^mat:(iron|steel|silver|gold|mithril|adamant|dark|holy|meteor|copper)$/.test(a?.set || "");
function bodyOutfit(b) {
  const g = b.group, f = famOfA(b), gr = gi(b.grade);
  if (g === "heavy") return f === "golem" || f === "turtle" || gr >= 5 ? "heavy" : /samurai|무사/.test(b.name) ? "samurai" : "knight";
  if (g === "light") return f === "shadow" || f === "demon" || f === "undead" || b.elem === "dark" ? "ninja" : metalOf(b) || ["dragon", "reptile", "insect", "spider", "aqua", "machine"].includes(f) ? "soldier" : f === "bird" ? "bard" : "ranger";
  if (g === "robe") return b.elem === "light" || /holy|silver/.test(b.set) ? "priest" : ["plant", "treant", "spore"].includes(f) || b.elem === "plant" ? "druid" : gr >= 6 ? "royal" : "mage";
  if (g === "brawler") return ["beast", "chimera", "giant", "bear"].includes(f) ? "barbarian" : /cloth|silk|linen/.test(b.set) ? "monk" : "fighter";
  return f === "machine" ? "alchemist" : "hunter";
}
const HEADK = (a) => { const g = a.group, f = famOfA(a), gr = gi(a.grade); return g === "heavy" ? (gr >= 4 || f === "dragon" ? "great" : "helm") : g === "light" ? (f === "shadow" || a.elem === "dark" ? "mask" : "hood") : g === "robe" ? (a.elem === "light" ? "veil" : gr >= 6 ? "crown" : "hat") : g === "brawler" ? "band" : f === "machine" ? "goggle" : "cap2"; };
const MOTIF = { dragon: "horn", demon: "horn", chimera: "fur", beast: "fur", giant: "fur", shadow: "fur", insect: "spike", spider: "spike", reptile: "spike", mimic: "spike", bird: "feather", aqua: "shell", turtle: "shell", jelly: "shell", toad: "leaf", plant: "leaf", treant: "leaf", spore: "leaf", slime: "crystal", golem: "crystal", spirit: "crystal", eye: "crystal", undead: "bone", ghost: "bone", armor: "bone", doll: "bone", machine: "mech" };
const BOOTS = { heavy: 6, light: 5, robe: 3, brawler: 3, tactical: 5 }, PADS = { heavy: 3, light: 1, robe: 0, brawler: 0, tactical: 2 };
/** { outfit, dye } — 아무것도 없으면 속옷, 다섯 벌이 모두 같은 처음 옷이면 그 옷 그대로 */
export function armorLook(d) {
  const A = d?.armor; if (!A) return null; const l = Object.values(A).filter(Boolean); if (!l.length) return { outfit: "under", dye: {} };
  if (l.length === 5 && l.every((a) => a.outfit && a.outfit === l[0].outfit)) return { outfit: l[0].outfit, dye: {} };
  const b = A.body, sets = setsOf(d), full = sets.find((s) => s.n >= 4), dye = {};
  const outfit = b ? (b.outfit || bodyOutfit(b)) : "under";
  if (b && !b.outfit) { dye.cloth = colOf(b, 0); dye.metal = colOf(b, 1); if (b.group === "light" || b.group === "brawler") dye.lth = colOf(b, 0); if (["beast", "chimera", "bear"].includes(famOfA(b))) dye.fur = 1; if (gi(b.grade) >= 5) dye.big = b.group === "heavy" ? 1 : 0; }
  if (A.legs && !A.legs.outfit) dye.base = colOf(A.legs); else if (!A.legs) dye.base = 0xd8d0bc;
  if (A.hands && !A.hands.outfit) { dye.lth = colOf(A.hands, 0); dye.pads = PADS[A.hands.group]; if (A.hands.group === "brawler") dye.wraps = 1; } else if (!A.hands) dye.pads = 0;
  if (A.head) { if (!A.head.outfit) dye.head = HEADK(A.head); } else dye.head = "";
  dye.boots = A.feet ? BOOTS[A.feet.group] : 1;
  // 장식: 속성 색 테두리, 전설 이상은 금빛, 4세트는 세트 색 망토
  const el = b?.elem || l.find((a) => a.elem)?.elem; if (el && ECOL[el]) dye.trim = ECOL[el]; if (l.some((a) => gi(a.grade) >= 6)) dye.trim = 0xffd35a;
  if (full) { dye.cape = 1; dye.capeC = colOf(l.find((a) => a.set === full.key), 0); }
  // 몬스터 장식: 가장 많이 입은 몬스터 무리(몸통이면 한 부위도)
  const cnt = new Map(); for (const a of l) { const f = famOfA(a); if (f) cnt.set(f, (cnt.get(f) || 0) + (a.slot === "body" ? 2 : 1)); }
  const top = [...cnt].sort((x, y) => y[1] - x[1])[0]; if (top && top[1] >= 2 && MOTIF[top[0]]) { const src = l.filter((a) => famOfA(a) === top[0]).sort((x, y) => gi(y.grade) - gi(x.grade))[0]; dye.motif = MOTIF[top[0]]; dye.mc = colOf(src, 1); dye.ma = colOf(src, 3) || colOf(src, 2); if (gi(src.grade) >= 4) dye.mot2 = 1; if (top[0] === "dragon" && full) dye.fin = 1; }
  return { outfit, dye };
}
// ── 머리색: 외관 글에서 ──
const HAIR = [[/은발|백발|흰 ?머리|white hair|silver hair/i, 0xd8d8e0], [/금발|노란 ?머리|blonde?/i, 0xe0c060], [/적발|빨간 ?머리|붉은 ?머리|red hair/i, 0xa83a2a], [/주황|오렌지|ginger/i, 0xd07030], [/갈색|밤색|brown hair/i, 0x6a4630], [/분홍|핑크|pink hair/i, 0xe08aa8], [/파란 ?머리|청발|푸른 ?머리|blue hair/i, 0x3a6ac8], [/초록|녹발|green hair/i, 0x3a8a4a], [/보라|자주|purple hair/i, 0x7a4aa8], [/흑발|검은 ?머리|까만 ?머리|black hair/i, 0x24222a], [/회색 ?머리|잿빛|gray hair|grey hair/i, 0x8a8a90]];
export function hairFromText(t) { const s = String(t || ""); for (const [re, c] of HAIR) if (re.test(s)) return c; return 0; }

// ── 가방 ↔ 동료 ──
export function wearable(d, a) { return !!a && groupOf(d) === a.group; }
export function armorScore(a) { return a ? Object.values(a.st || {}).reduce((n, v) => n + v, 0) + gi(a.grade) : -1; }
export const armorLine = (d) => { const l = Object.entries(d?.armor || {}).filter(([, a]) => a).map(([, a]) => a.name); if (!l.length) return "속옷 차림"; const s = setsOf(d).filter((x) => x.fx.length).map((x) => `${x.name} ${x.n}세트(${x.fx.map((f) => f.n).join("·")})`); return l.join(", ") + (s.length ? " · 세트 " + s.join(", ") : ""); };
export { ELEM_NAME, BY_ID };
