// Dusk Saga 엔진 — 종족 프리셋 (능력 보정·성장·꼬리표·종족 특성)
import { STATS, clamp } from "./rules.js";
import { RACES as MEM, RACE_BY_ID, raceIdOf } from "../../engine/races.js";

// 스탯 순서: hp str mag skl spd lck def res. 합이 비슷하도록(강점만큼 약점) 짠다
const R = (look, about, st, gr, tags, trait, x) => Object.assign({ look, about, stats: Object.fromEntries(STATS.map((k, i) => [k, st[i]])), growth: Object.fromEntries(STATS.map((k, i) => [k, gr[i]])), tags, trait }, x);
// 능력 유형(원형). 종족 이름은 장기기억 표를 그대로 쓰고 유형만 잇는다
const KIND = {
  "인간": R("human", "두루 무난하고 빨리 배운다", [0, 0, 0, 1, 0, 1, 0, 0], [5, 5, 5, 5, 5, 5, 5, 5], [], "race_resolve"),
  "엘프": R("elf", "마력과 속도가 높고 몸이 약하다", [-3, -1, 2, 2, 2, 0, -2, 1], [-10, -5, 15, 10, 10, 0, -10, 10], ["elf"], "race_woodstep"),
  "다크엘프": R("darkelf", "급소를 노리는 그늘의 사냥꾼", [-2, 1, 1, 2, 2, -2, -1, 0], [-5, 5, 5, 15, 10, -10, -5, 0], ["elf"], "race_shadow"),
  "드워프": R("dwarf", "느리지만 단단하다", [3, 2, -1, 0, -3, 0, 3, 0], [10, 10, -5, 0, -15, 0, 15, 5], ["dwarf"], "race_stone", { move: -1 }),
  "늑대 수인": R("wolf", "빠르고 사납지만 마법에 약하다", [1, 2, -2, 0, 3, 0, 0, -2], [5, 10, -10, 0, 15, 0, 0, -10], ["beast"], "race_pack", { move: 1 }),
  "고양이 수인": R("cat", "날래고 운이 좋다", [-2, 0, 0, 2, 3, 2, -2, -1], [-5, 0, 0, 10, 15, 10, -10, -5], ["beast"], "race_agile"),
  "토끼 수인": R("rabbit", "발이 빠르고 겁이 많다", [-2, -1, 0, 1, 4, 2, -2, 0], [-5, -5, 0, 5, 20, 10, -10, 0], ["beast"], "race_flee", { move: 1 }),
  "오크": R("orc", "힘과 체력이 넘친다", [4, 3, -2, -1, -1, -1, 1, -2], [15, 15, -10, -5, -5, -5, 5, -10], ["orc"], "race_rage"),
  "고블린": R("goblin", "작고 재빠르며 무리로 싸운다", [-3, 0, 0, 1, 3, 1, -1, -1], [-5, 0, 0, 5, 15, 5, -5, -5], ["goblin"], "race_pack"),
  "용인": R("dragon", "튼튼한 비늘. 용 사냥 무기에 약하다", [3, 2, 0, 0, -2, -1, 2, 0], [10, 10, 0, 0, -10, -5, 10, 0], ["dragon"], "race_scale"),
  "언데드": R("undead", "쓰러져도 다시 일어나는 몸. 신성한 무기에 약하다", [3, 1, 0, 0, -2, -3, 1, 0], [15, 5, 0, 0, -10, -15, 5, 0], ["undead"], "race_rot"),
  "흡혈귀": R("vampire", "마력이 높고 피로 회복한다. 신성한 무기에 약하다", [0, 1, 3, 0, 1, -3, -2, 0], [0, 5, 15, 0, 5, -15, -5, 0], ["undead"], "race_blood"),
  "악마": R("demon", "공격에 치우친 이계의 존재", [0, 2, 3, 0, 0, -3, 0, -2], [0, 10, 15, 0, 0, -15, 0, -5], ["demon"], "race_rage"),
  "천족": R("angel", "마방과 행운이 높은 빛의 종족", [-2, -1, 2, 0, 0, 2, -2, 3], [-5, -5, 10, 0, 0, 10, -5, 15], ["holy"], "race_grace"),
  "정령": R("spirit", "마법에 강하고 물리에 약하다", [-3, -2, 4, 0, 1, 0, -3, 4], [-10, -10, 20, 0, 5, 0, -10, 15], ["spirit"], "race_veil"),
  "용": R("ryu", "물과 구름의 용. 마력과 마방이 높다", [1, -1, 3, 1, -1, 1, -2, 2], [5, -5, 15, 5, -5, 5, -10, 10], ["dragon"], "race_veil"),
  "거인": R("giant", "크고 세지만 굼뜨다", [6, 4, -2, -2, -3, -1, 1, -1], [20, 15, -10, -10, -15, 0, 5, -5], ["giant"], "race_rage", { move: -1 }),
  "작은 이": R("small", "작고 운이 좋다", [-3, -2, 1, 2, 2, 3, -1, 0], [-10, -10, 5, 10, 10, 15, -5, 0], [], "race_agile"),
  "큰 짐승": R("bigbeast", "힘센 짐승의 피", [3, 3, -2, 0, 0, 0, 1, -2], [10, 10, -10, 0, 0, 0, 5, -5], ["beast"], "race_rage"),
  "물의 일족": R("aqua", "마력과 속도, 매끄러운 몸", [0, -1, 2, 1, 1, 0, -2, 1], [0, -5, 10, 5, 5, 0, -10, 5], ["aqua"], "race_veil"),
  "비늘 일족": R("scale", "질긴 비늘", [2, 2, -1, 0, 0, -1, 2, -1], [5, 10, -5, 0, 0, -5, 10, -5], ["reptile"], "race_scale"),
  "벌레 일족": R("insect", "정교하고 재빠르다", [-1, 1, -1, 3, 2, -1, 0, -1], [0, 5, -5, 15, 10, -5, 0, -5], ["insect"], "race_pack"),
  "풀의 일족": R("plant", "뿌리에서 기운을 얻는다", [2, -1, 2, 0, -2, 1, 0, 1], [10, -5, 10, 0, -10, 5, 0, 5], ["plant"], "race_rot"),
  "점액": R("slime", "물컹해서 잘 안 다친다", [4, -1, 0, -1, -1, 0, -1, 3], [15, -5, 0, -5, -5, 0, -5, 15], ["slime"], "race_rot"),
  "요괴": R("yokai", "홀리는 재주와 요력", [-1, -1, 2, 1, 1, 1, -2, 1], [-5, -5, 10, 5, 5, 5, -10, 5], ["yokai"], "race_shadow"),
  "기계인": R("machine", "수비가 높고 운이 없다", [2, 1, -2, 2, -1, -3, 3, -1], [5, 5, -10, 10, -5, -15, 15, -5], ["machine"], "race_plating"),
};
const IDS = { "인간": "human", "엘프": "highelf woodelf elf halfelf", "다크엘프": "darkelf", "드워프": "dwarf", "작은 이": "halfling gnome mouse squirrel hamster pixie", "거인": "giant halfgiant ogre troll", "고양이 수인": "cat leopard fox raccoon ferret otter", "늑대 수인": "dog wolf hyena werewolf horse centaur", "토끼 수인": "rabbit sheep goat deer", "큰 짐승": "bear lion tiger cow panda", "천족": "bird harpy phoenix unicorn angel valkyrie god demigod xian", "비늘 일족": "lizard lamia naga", "물의 일족": "mermaid siren shark scylla penguin kappa", "벌레 일족": "bee butterfly arachne ant mantis", "용인": "dragon", "용": "ryu imugi", "악마": "fallen succubus incubus demon oni", "흡혈귀": "bat vampire dhampir", "언데드": "undead ghost", "오크": "orc", "고블린": "goblin hobgoblin", "정령": "spirit_fire spirit_water spirit_wind spirit_earth nymph", "풀의 일족": "dryad alraune", "요괴": "gumiho yukionna tengu nekomata", "기계인": "android cyborg golem homunculus", "점액": "slime" };
const KIND_OF = Object.fromEntries(Object.entries(IDS).flatMap(([k, v]) => v.split(" ").filter(Boolean).map((id) => [id, k])));
export const kindOf = (id) => (Object.prototype.hasOwnProperty.call(KIND_OF, id) ? KIND_OF[id] : "인간");
// 이름 → { mem: 장기기억 id, body: 장기기억 몸 모형, frame, …능력 유형 }
export const RACES = Object.fromEntries(MEM.map((m) => [m.label, { ...KIND[kindOf(m.id)], mem: m.id, kind: kindOf(m.id), body: m.body ?? {}, frame: m.frame }]));
// 처음 프리셋에 쓰던 이름
const ALIAS = { "용인": "드래곤", "용족": "드래곤", "천족": "천사", "정령": "바람의 정령", "기계인": "안드로이드" };
/** 장기기억 종족 id → 이름 */
export const raceById = (id) => (Object.prototype.hasOwnProperty.call(RACE_BY_ID, id ?? "") ? RACE_BY_ID[id].label : "");
const P = (id, name, desc, o) => Object.assign({ id, name, desc, type: "passive", cond: "always", mods: {}, flags: {}, tier: "common" }, o);
export const RACE_SKILLS = Object.fromEntries([
  P("race_resolve", "불굴", "HP 절반 이하에서 수비·마방 +2", { cond: "hp_below_half", mods: { def: 2, res: 2 } }),
  P("race_woodstep", "숲의 걸음", "엄폐 지형 위에서 회피 +15", { cond: "on_cover", mods: { avo: 15 } }),
  P("race_shadow", "그늘", "주변 2칸에 아군이 없으면 필살 +10", { cond: "alone", mods: { crit: 10 } }),
  P("race_stone", "바위 심지", "공격받을 때 수비 +2", { cond: "defending", mods: { def: 2 } }),
  P("race_pack", "무리 사냥", "아군과 인접하면 공격 +2", { cond: "adjacent_ally", mods: { atk: 2 } }),
  P("race_agile", "유연함", "회피 +10", { mods: { avo: 10 } }),
  P("race_flee", "줄행랑", "HP 절반 이하에서 회피 +20", { cond: "hp_below_half", mods: { avo: 20 } }),
  P("race_rage", "격앙", "먼저 공격할 때 공격 +2", { cond: "initiating", mods: { atk: 2 } }),
  P("race_scale", "비늘", "받는 물리·마법 방어 +1", { mods: { def: 1, res: 1 } }),
  P("race_rot", "되살아나는 몸", "턴 시작 시 HP 3 회복", { flags: { regen: 3 } }),
  P("race_blood", "피의 갈증", "준 피해의 20%를 흡수", { flags: { drain: 20 } }),
  P("race_grace", "가호", "HP가 가득일 때 명중·회피 +10", { cond: "hp_full", mods: { hit: 10, avo: 10 } }),
  P("race_veil", "마나의 장막", "공격받을 때 마방 +3", { cond: "defending", mods: { res: 3 } }),
  P("race_plating", "장갑판", "수비% 확률로 받는 피해 30% 감소", { type: "proc", rate: "def", flags: { block: 30 } }),
].map((s) => [s.id, s]));

export const raceOf = (v) => { const t = typeof v === "string" ? v.trim() : "", k = Object.prototype.hasOwnProperty.call(ALIAS, t) ? ALIAS[t] : t; return Object.prototype.hasOwnProperty.call(RACES, k) ? k : ""; };
/** 자유로운 글(‘숲의 다크 엘프’) → 이름. 장기기억과 같은 판정 */
export const raceFromText = (t) => raceOf(t) || raceById(raceIdOf(String(t ?? "").replace(/다크\s+엘프/, "다크엘프")));
/** 종족을 한 번만 입힌다. body=true면 능력치까지(프리셋 몸), 아니면 꼬리표·특성만(이미 완성된 시트) */
export function applyRace(S, u, race, body) {
  const id = raceOf(race); if (!id || u.race) return u; const r = RACES[id]; u.race = id;
  if (body) { for (const k of STATS) { u.stats[k] = clamp(u.stats[k] + r.stats[k], k === "hp" ? 1 : 0, k === "hp" ? 120 : 60); u.growth[k] = clamp(u.growth[k] + r.growth[k], 0, 150); } if (r.move) u.move = clamp(u.move + r.move, 1, 10); }
  u.tags = [...new Set([...(u.tags || []), ...r.tags])].slice(0, 4);
  if (!S.skills[r.trait]) S.skills[r.trait] = JSON.parse(JSON.stringify(RACE_SKILLS[r.trait]));
  if (!u.skills.includes(r.trait) && u.skills.length < 6) u.skills.push(r.trait);
  return u;
}
export const RACE_LINES = Object.keys(KIND).map((k) => { const l = Object.keys(RACES).filter((n) => RACES[n].kind === k); return l.length ? `- ${l.join(", ")}: ${KIND[k].about}${KIND[k].tags.length ? " [" + KIND[k].tags.join(",") + "]" : ""}` : ""; }).filter(Boolean).join("\n");
