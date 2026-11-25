// Dusk Saga 엔진 — 인물 고치기: 사본에서 고치고(되돌릴 수 있게) 확정할 때만 전투에 옮긴다
import { MAXLV, MTL, MOVE, STATS, clamp, copy, int, txt } from "./rules.js";
import { RACES, applyRace, raceOf } from "./races.js";
import { CLASSES, jobOf, setJob } from "./classes.js";
import { makeWeapon } from "./gear.js";
import { rescale } from "./growth.js";
import { retro } from "./saves.js";
export const STAT_MAX = (k) => (k === "hp" ? 120 : 60);
/** 고칠 사본. 확정 전까지 원본은 그대로다 */
export function draftOf(S, id) { const d = S.defs[id]; return d ? { defs: { [id]: copy(d) }, skills: copy(S.skills), battle: null, log: [], seq: 0, hist: [] } : null; }
/** 종족 바꾸기: 앞 종족의 꼬리표·특성만 걷고 새로 입힌다(능력치는 따로 고치므로 그대로) */
export function editRace(W, d, label) {
  const old = RACES[d.race]; if (old) { d.tags = (d.tags || []).filter((t) => !old.tags.includes(t)); d.skills = d.skills.filter((k) => k !== old.trait); }
  d.race = ""; const id = raceOf(label); if (id) applyRace(W, d, id, false); return d;
}
/** 직업 바꾸기: 앞 직업의 성장률·직업 기술을 걷고 새 직업을 입힌다 */
export function editJob(W, d, name) {
  const c = CLASSES[d.job]; if (c) { const b = c.tier === 2 ? CLASSES[c.base] : c; for (const k of STATS) d.growth[k] = clamp(d.growth[k] - b.growth[k], 0, 150); if (c.tier === 2) d.skills = d.skills.filter((k) => k !== c.skill.id); }
  d.job = ""; if (jobOf(name)) setJob(W, d, name); return d;
}
export function editLevel(W, id, lv, scale) { const d = W.defs[id]; lv = int(lv, 1, MAXLV, d.level); if (scale) rescale(W, id, lv); else { d.level = lv; d.exp = 0; } return d; }
export const editStat = (d, k, v) => { if (STATS.includes(k)) d.stats[k] = int(v, k === "hp" ? 1 : 0, STAT_MAX(k), d.stats[k]); return d; };
export const editMtype = (d, m) => { if (Object.prototype.hasOwnProperty.call(MTL, m)) { d.mtype = m; d.move = MOVE[m]; } return d; };
export const editName = (d, v) => { d.name = txt(v, 30, d.name); return d; };
/** 무기 하나를 종류·등급·속성·이름으로 다시 벼린다. i가 끝이면 새로 넣는다(최대 5) */
export function editWeapon(d, i, o) { const w = makeWeapon(o, d.level); if (i >= d.weapons.length) { if (d.weapons.length >= 5) return d; d.weapons.push(w); } else d.weapons[i] = w; return d; }
export const dropWeapon = (d, i) => { if (d.weapons.length > 1) d.weapons.splice(i, 1); return d; };
export const firstWeapon = (d, i) => { if (i > 0 && i < d.weapons.length) d.weapons.unshift(...d.weapons.splice(i, 1)); return d; };
export const editSkill = (W, d, k) => { if (d.skills.includes(k)) d.skills = d.skills.filter((x) => x !== k); else if (W.skills[k] && d.skills.length < 6) d.skills.push(k); return d; };
/** 확정: 시트를 바꾸고, 전투 중이면 체력·무기 자리도 맞춘다 */
export function commitEdit(S, W, id) {
  const d = W.defs[id], old = S.defs[id]; if (!d || !old) return false; const was = old.stats.hp; S.defs[id] = d; for (const k of d.skills) if (!S.skills[k] && W.skills[k]) S.skills[k] = W.skills[k];
  if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === id) { if (u.hp > 0) u.hp = u.hp >= was ? d.stats.hp : clamp(u.hp, 1, d.stats.hp); if ((u.wi ?? 0) >= d.weapons.length) u.wi = 0; }
  retro(S, id); return true;
}
