// Dusk Saga 엔진 — 직업 프리셋: 기본직 12, 상급직 24(Lv 21 전직, 두 갈래)
import { STATS, SIDE, MTL, MOVE, arm, clamp, log } from "./rules.js";
import { normSkill, normWeapon } from "./normalize.js";
import { retro } from "./saves.js";

export const PROMOTE_LEVEL = 21;
const st = (a) => Object.fromEntries(STATS.map((k, i) => [k, a[i] ?? 0]));
// 성장 보정 순서: hp str mag skl spd lck def res
const B = (weapons, mtype, growth, adv, about, start) => ({ tier: 1, weapons, mtype, growth: st(growth), adv, about, start });
// 상급: 전직 보너스와 직업 기술
const A = (base, weapons, bonus, skill, about, mtype) => ({ tier: 2, base, weapons, bonus: st(bonus), skill, about, ...(mtype ? { mtype } : {}) });
const s = (id, name, desc, o) => ({ id: "job_" + id, name, desc, type: "passive", ...o });

export const CLASSES = {
  "검사": B(["sword"], "foot", [0, 5, 0, 10, 15, 0, -5, 0], ["검성", "마검사"], "빠른 연속 공격", "철의 검"),
  "창병": B(["lance"], "foot", [5, 5, 0, 5, 0, 0, 10, 0], ["창술 대가", "근위병"], "균형 잡힌 전열", "철의 창"),
  "도끼전사": B(["axe"], "foot", [15, 15, 0, 0, 0, 0, 0, -5], ["광전사", "투사장"], "높은 체력과 힘", "철의 도끼"),
  "궁수": B(["bow"], "foot", [0, 5, 0, 15, 5, 0, 0, 0], ["명궁", "레인저"], "거리 두고 쏘기", "철의 활"),
  "도적": B(["dagger", "sword"], "foot", [-5, 0, 0, 10, 15, 10, -5, 0], ["암살자", "괴도"], "속도와 행운", "철의 수리검"),
  "중기사": B(["lance", "axe"], "armor", [10, 5, 0, 0, -15, 0, 20, 0], ["장군", "성벽 수호자"], "느리고 단단한 방패", "철의 창"),
  "기병": B(["lance", "sword"], "horse", [5, 5, 0, 0, 5, 0, 5, 0], ["성기사", "돌격기사"], "넓은 이동", "철의 창"),
  "비행병": B(["lance"], "fly", [0, 0, 0, 5, 10, 5, -5, 10], ["천공기사", "폭풍기수"], "지형을 넘는 비행", "철의 창"),
  "마도사": B(["tome"], "foot", [-5, -5, 15, 5, 5, 0, -5, 10], ["현자", "암흑술사"], "공격 마법", "불씨의 서"),
  "사제": B(["staff", "tome"], "foot", [-5, -5, 10, 0, 0, 10, -5, 15], ["주교", "전투사제"], "회복과 빛 마법", "치유의 지팡이"),
  "격투가": B(["claw"], "foot", [10, 10, 0, 5, 10, 0, 0, -5], ["권성", "기공사"], "맨손 연타", "철의 건틀릿"),
  "총사": B(["claw"], "foot", [0, 5, 0, 15, 0, 5, 0, 0], ["저격 총사", "속사 총사"], "총기 전문", "권총"),

  "검성": A("검사", ["sword"], [2, 2, 0, 3, 3, 0, 1, 1], s("blademaster", "검의 극의", "먼저 공격할 때 필살 +15", { cond: "initiating", mods: { crit: 15 } }), "필살을 노리는 검"),
  "마검사": A("검사", ["sword", "tome"], [2, 1, 4, 1, 2, 0, 0, 2], s("magicblade", "마력 부여", "검에 마력을 실어 마방으로 친다", { type: "art", cd: 2, mods: { atk: 2 }, flags: { magic: true } }), "검과 마법"),
  "창술 대가": A("창병", ["lance"], [3, 3, 0, 3, 2, 0, 1, 0], s("spearmaster", "꿰뚫기", "방어 40%를 무시하고 찌른다", { type: "art", cd: 3, flags: { pierce: 40 } }), "방어를 꿰는 창"),
  "근위병": A("창병", ["lance", "sword"], [4, 1, 0, 1, 0, 0, 4, 2], s("royalguard", "호위 본능", "아군과 인접하면 수비·마방 +3", { cond: "adjacent_ally", mods: { def: 3, res: 3 } }), "아군을 지키는 벽"),
  "광전사": A("도끼전사", ["axe"], [5, 4, 0, 1, 2, 0, 0, 0], s("berserk", "광분", "HP 절반 이하에서 공격 +5", { cond: "hp_below_half", mods: { atk: 5 } }), "다칠수록 강해짐"),
  "투사장": A("도끼전사", ["axe", "bow"], [4, 2, 0, 3, 1, 0, 2, 0], s("warchief", "전투 함성", "아군과 인접하면 공격 +3", { cond: "adjacent_ally", mods: { atk: 3 } }), "앞장서는 우두머리"),
  "명궁": A("궁수", ["bow"], [2, 2, 0, 5, 2, 1, 0, 0], s("marksman", "급소 겨냥", "반드시 맞는 사격", { type: "art", cd: 3, flags: { sure: true } }), "빗나가지 않는 활"),
  "레인저": A("궁수", ["bow", "sword"], [3, 1, 0, 2, 4, 1, 1, 0], s("ranger", "숲지기", "엄폐 지형 위에서 회피 +20", { cond: "on_cover", mods: { avo: 20 } }), "숲을 누비는 사수"),
  "암살자": A("도적", ["dagger", "sword"], [1, 2, 0, 4, 4, 0, 0, 1], s("assassin", "암습", "반격받지 않는 일격", { type: "art", cd: 3, flags: { noCounter: true } }), "반격 없는 일격"),
  "괴도": A("도적", ["dagger", "bow"], [2, 0, 0, 2, 4, 4, 0, 1], s("phantom", "잔상", "회피 +15", { mods: { avo: 15 } }), "잡히지 않는 발"),
  "장군": A("중기사", ["lance", "axe", "sword"], [5, 3, 0, 1, 0, 0, 4, 1], s("general", "강철 방벽", "수비% 확률로 받는 피해 반감", { type: "proc", rate: "def", flags: { block: 50 } }), "무너지지 않는 전열"),
  "성벽 수호자": A("중기사", ["lance"], [4, 0, 0, 1, 0, 1, 3, 5], s("bulwark", "마법 방벽", "공격받을 때 마방 +5", { cond: "defending", mods: { res: 5 } }), "마법에도 단단함"),
  "성기사": A("기병", ["lance", "sword"], [3, 2, 0, 1, 1, 1, 3, 3], s("paladin", "성스러운 맹세", "HP가 가득일 때 수비·마방 +3", { cond: "hp_full", mods: { def: 3, res: 3 } }), "고루 강한 기마"),
  "돌격기사": A("기병", ["lance", "axe"], [3, 4, 0, 1, 3, 0, 1, 0], s("charger", "돌격", "먼저 공격할 때 공격 +4", { cond: "initiating", mods: { atk: 4 } }), "먼저 들이받기"),
  "천공기사": A("비행병", ["lance", "sword"], [2, 2, 0, 2, 4, 1, 0, 3], s("skyknight", "바람의 가호", "먼저 공격할 때 속도 +4", { cond: "initiating", mods: { spd: 4 } }), "빠른 하늘의 창"),
  "폭풍기수": A("비행병", ["lance", "axe"], [5, 4, 0, 1, 1, 0, 3, 0], s("stormrider", "폭풍 강하", "공격 +3으로 내리꽂는다", { type: "art", cd: 2, mods: { atk: 3 } }), "묵직한 강하"),
  "현자": A("마도사", ["tome", "staff"], [1, 0, 4, 2, 2, 1, 0, 4], s("sage", "마력 집중", "HP가 가득일 때 공격 +3", { cond: "hp_full", mods: { atk: 3 } }), "마법과 회복"),
  "암흑술사": A("마도사", ["tome"], [3, 0, 5, 2, 0, 0, 1, 2], s("darkmage", "생명 흡수", "기술% 확률로 피해의 절반 흡수", { type: "proc", rate: "skl", flags: { drain: 50 } }), "생명을 빼앗음"),
  "주교": A("사제", ["staff", "tome"], [2, 0, 4, 1, 1, 2, 0, 4], s("bishop", "축복", "턴 시작 시 HP 5 회복", { flags: { regen: 5 } }), "높은 회복력"),
  "전투사제": A("사제", ["staff", "axe"], [4, 4, 1, 1, 1, 1, 2, 1], s("warpriest", "신앙의 힘", "공격받을 때 공격 +3", { cond: "defending", mods: { atk: 3 } }), "싸우는 성직자"),
  "권성": A("격투가", ["claw"], [3, 4, 0, 2, 3, 0, 1, 0], s("fistmaster", "난타", "위력을 낮춰 두 번 친다", { type: "art", cd: 3, mods: { atk: -2 }, flags: { brave: true } }), "두 번 때림"),
  "기공사": A("격투가", ["claw", "staff"], [3, 2, 3, 2, 1, 0, 1, 2], s("chimaster", "기의 순환", "턴 시작 시 HP 4 회복", { flags: { regen: 4 } }), "기로 버팀"),
  "저격 총사": A("총사", ["claw"], [2, 2, 0, 5, 1, 2, 0, 0], s("sharpshooter", "조준 사격", "명중 +25, 필살 +10", { type: "art", cd: 2, mods: { hit: 25, crit: 10 } }), "한 발의 정확도"),
  "속사 총사": A("총사", ["claw", "dagger"], [2, 2, 0, 2, 4, 2, 0, 0], s("quickdraw", "선제 사격", "먼저 공격할 때 명중·필살 +10", { cond: "initiating", mods: { hit: 10, crit: 10 } }), "먼저 쏘기"),
};
export const jobOf = (v) => (typeof v === "string" && Object.prototype.hasOwnProperty.call(CLASSES, v.trim()) ? v.trim() : "");
export const canUse = (d, w) => !d.job || !arm(w) || CLASSES[d.job].weapons.includes(w.type) || (Array.isArray(d.wok) && d.wok.includes(w.type)); // wok: 이야기가 준 무기 종류(직업 밖이라도 쓴다)
const learn = (S, d, sk) => { if (!S.skills[sk.id]) S.skills[sk.id] = normSkill({ ...sk, tier: "common" }, 0); if (!d.skills.includes(sk.id)) { if (d.skills.length < 6) d.skills.push(sk.id); else (d.later ||= []).push(sk.id); } };
function mount(d, mtype) { if (!mtype || d.mtype === mtype) return; d.mtype = mtype; d.move = MOVE[mtype]; }
// 쓸 수 있는 무기가 하나도 없으면 기본 무기를 쥐여 준다
function equip(S, d, c) {
  if (d.weapons.some((w) => c.weapons.includes(w.type))) { const i = d.weapons.findIndex((w) => c.weapons.includes(w.type)); if (i > 0) d.weapons.unshift(...d.weapons.splice(i, 1)); }
  else { const base = c.tier === 1 ? c.start : CLASSES[c.base].start; if (d.weapons.length >= 5) d.weapons.pop(); d.weapons.unshift(normWeapon({ name: base })); }
  if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === d.id) u.wi = 0;
}
/** 직업을 정한다(성장률·무기·이동). 이미 직업이 있으면 그대로. 상급직으로 바로 시작하면 기술까지 준다 */
export function setJob(S, d, name) {
  const id = jobOf(name); if (!id || d.job) return false; const c = CLASSES[id], b = c.tier === 2 ? CLASSES[c.base] : c;
  d.job = id; d.cls = id; for (const k of STATS) d.growth[k] = clamp(d.growth[k] + b.growth[k], 0, 150);
  mount(d, c.mtype || b.mtype); equip(S, d, c); if (c.tier === 2) learn(S, d, c.skill); return true;
}
export const promotions = (d) => (d.job && CLASSES[d.job].tier === 1 && d.level >= PROMOTE_LEVEL ? CLASSES[d.job].adv : []);
export function promote(S, id, to) {
  const d = S.defs[id]; if (!d || !promotions(d).includes(to)) return null; const c = CLASSES[to], from = d.job, gain = {};
  for (const k of STATS) { const v = Math.min(k === "hp" ? 120 : 60, d.stats[k] + c.bonus[k]) - d.stats[k]; if (v) { d.stats[k] += v; gain[k] = v; } }
  if (S.battle && gain.hp) for (const u of Object.values(S.battle.units)) if (u.ref === id && u.hp > 0) u.hp += gain.hp;
  d.job = to; d.cls = to; mount(d, c.mtype); equip(S, d, c); learn(S, d, c.skill); d.history = (d.history || []).concat(`${from}에서 ${to}(으)로 전직`).slice(-8);
  log(S, d.name + ": " + from + " → " + to + " 전직"); retro(S, id); return { from, to, gain, skill: c.skill.name };
}
export const CLASS_LINES = Object.keys(CLASSES).filter((k) => CLASSES[k].tier === 1).map((k) => `- ${k} (${CLASSES[k].weapons.join("/")}, ${CLASSES[k].mtype}) → ${CLASSES[k].adv.join(" | ")}`).join("\n");

// 아무 직업 이름(탱커·성녀·검호…) → 규칙상 가장 비슷한 직업. 화면에는 원래 이름을 쓴다
const LIKE = [[/탱커|탱|방패|수호|가디언|팔라딘|성기사|중장|철벽|guard|tank|paladin|knight/i, "중기사"], [/힐러|치유|사제|성녀|신관|수녀|프리스트|클레릭|무녀|heal|priest|cleric/i, "사제"],
  [/마법|마도|위자드|위저드|소서|술사|흑마|백마|정령사|소환사|마녀|메이지|mage|wizard|sorcer|witch|summon/i, "마도사"], [/궁|사수|레인저|헌터|저격|archer|ranger|hunter|bow/i, "궁수"],
  [/총|건|사격|gun|pistol|rifle/i, "총사"], [/도적|암살|닌자|시프|어쌔신|로그|척후|도둑|thief|rogue|assassin|ninja/i, "도적"], [/창|랜서|스피어|lancer|spear/i, "창병"],
  [/도끼|버서커|광전|바바리안|axe|berserk|barbar/i, "도끼전사"], [/권|격투|몽크|무투|주먹|파이터|monk|brawl|fist/i, "격투가"], [/기병|기마|라이더|cavalry|rider/i, "기병"],
  [/비행|천마|용기사|하늘|wyvern|pegasus|flyer/i, "비행병"], [/바드|음유|가수|댄서|무희|bard|dancer|singer/i, "사제"], [/검|칼|사무라이|검호|소드|세이버|blade|sword|samurai|fencer/i, "검사"]];
export function jobLike(name) { const t = String(name || "").trim(); if (!t) return ""; if (Object.prototype.hasOwnProperty.call(CLASSES, t)) return t; for (const [re, id] of LIKE) if (re.test(t)) return id; return ""; }
