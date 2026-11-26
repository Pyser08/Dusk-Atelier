// Dusk Saga 엔진 — 턴·증원·전장 불러오기 (순수 함수, DOM·api 없음)
import { elemOfUnit } from "./elements.js";
import { canUse, setJob } from "./classes.js";
import { applyRace } from "./races.js";
import { alive, cells, living, nearestFree, syncRears, uterr } from "./board.js";
import { sizeOf } from "./elements.js";
import { giveBreak, giveParts } from "./hunt.js";
import { tickFx } from "./status.js";
import { K, OBJ, SIDE, TN, arm, clamp, foe, idOf, int, log, objText, roll, txt } from "./rules.js";
import { cond, hpOf, outcome } from "./combat.js";
import { runTeam } from "./ai.js";
import { endReplay, mark, pulseReset } from "./saves.js";
import { PRE, ensureBase, fitLevel, llmSkill, normUnit, presetUnit } from "./normalize.js";
import { MAPS } from "./maps.js";
import { maybeRaid } from "./raid.js";
import { armorRegen, starterArmor } from "./armor.js";
import { addBond, applyConds, bondKind, condKey, addCond, pickWeather, setupObjective } from "./saga.js";

// ── phases ──
export function beginPhase(S, team, ev) {
  const B = S.battle; B.phase = team; ev.push({ t: 'phase', team, turn: B.turn }); syncRears(B);
  if (waiting(B, team).some(w => w.turn <= B.turn)) {
    const taken = new Set(alive(B).map(u => K(u.x, u.y))), rest = [];
    for (const w of B.wait) {
      if (w.team !== team || w.turn > B.turn) { rest.push(w); continue; }
      if (team === 'ally' && Object.values(B.units).some(u => u.ref === w.ref)) continue;
      const u = enter(S, w, taken); if (!u && S.defs[w.ref]) rest.push(w); if (u) { ev.push({ t: 'spawn', id: u.id }); log(S, '증원: ' + TN[team] + ' ' + S.defs[u.ref].name + ' 도착'); }
    }
    B.wait = rest;
  }
  for (const u of living(B)) if (u.team === team) {
    u.done = false; u.ow = false; for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--;
    if (u.rear && !u.fought) u.gauge = Math.max(0, (u.gauge || 0) - 2); u.fought = false;
    if (u.rearOf) continue;
    if (u.stun && team === 'ally') { u.stun = 0; u.done = true; log(S, S.defs[u.ref].name + ': 겁에 질려 이번 턴을 쉼'); continue; }
    const d = S.defs[u.ref], t = uterr(S, u); let h = t.heal ? Math.ceil(d.stats.hp * t.heal / 100) : 0;
    for (const id of d.skills) { const sk = S.skills[id]; if (sk && sk.type === 'passive' && sk.flags.regen && cond(S, u, sk.cond, {})) h += sk.flags.regen; } if (S.hunt) h += armorRegen(d);
    h = Math.min(h, d.stats.hp - u.hp); if (h > 0) { u.hp += h; ev.push({ t: 'heal', id: u.id, amt: h, hp: u.hp }); log(S, d.name + ': 턴 시작 ' + h + ' 회복' + hpOf(S, u) + (t.heal ? ' (' + t.n + ')' : ''), 'regen'); }
    if (S.hunt && u.fx && tickFx(S, u, ev)) u.done = true;
    if (t.burn && elemOfUnit(d) !== 'fire') { const dmg = Math.min(u.hp - 1, Math.ceil(d.stats.hp * t.burn / 100)); if (dmg > 0) { u.hp -= dmg; ev.push({ t: 'burn', id: u.id, amt: dmg, hp: u.hp }); log(S, d.name + ': ' + t.n + '에서 ' + dmg + ' 피해' + hpOf(S, u)); } }
  }
}
export function endTurn(S, ev) {
  const B = S.battle; if (!B || B.status !== 'active') return;
  for (const [team, head] of [['enemy', '적군 턴'], ['third', '제3세력 턴'], ['friend', '우군 턴']]) {
    if (team !== 'enemy' && !alive(B).some(u => u.team === team) && !waiting(B, team).some(w => w.turn <= B.turn)) continue;
    log(S, head, 'ph'); beginPhase(S, team, ev); runTeam(S, team, ev); outcome(S, ev);
    if (B.status !== 'active') return;
  }
  B.phase = 'ally';
  B.turn++; outcome(S, ev); if (B.status !== 'active') return;
  log(S, '아군 ' + B.turn + '턴', 'ph'); maybeRaid(S, ev); beginPhase(S, 'ally', ev); mark(S, '턴 시작');
}
export const allDone = S => !alive(S.battle).some(u => u.team === 'ally' && !u.done);
// put a unit on the board at (or next to) the asked tile
export function enter(S, p, taken) {
  const B = S.battle, def = S.defs[p.ref]; if (!def) return null; let sz = S.hunt && p.team !== 'ally' ? sizeOf(def) : 1; let at = nearestFree(S, def, p.x, p.y, taken, sz); if (!at && sz > 1) { sz = 1; at = nearestFree(S, def, p.x, p.y, taken); } if (!at) return null;
  let id = idOf(p.id, def.id), n = 2; while (B.units[id]) id = def.id + '_' + n++;
  if (p.team === 'ally') def.ally = true;
  const u = { id, ref: def.id, team: p.team, x: at[0], y: at[1], hp: def.stats.hp, wi: Math.max(0, def.weapons.findIndex(arm)), done: false, cd: {} };
  if (p.team !== 'ally') { const boss = !!p.boss && SIDE[p.team] !== 0; u.ai = ['charge', 'hold', 'guard'].includes(p.ai) ? p.ai : (boss ? 'guard' : 'charge'); if (boss) { u.boss = true; B.hadBoss = true; } }
  if (p.vip) u.vip = true; if (p.carry) u.carry = true; if (sz > 1) { u.sz = sz; giveParts(u, def); } if (S.hunt && p.team !== 'ally') giveBreak(u, def); B.units[id] = u; for (const [x, y] of cells(u)) taken.add(K(x, y)); return u;
}
export const waiting = (B, team) => (B.wait || []).filter(w => !team || w.team === team);
export function loadEncounter(S, j) {
  if (!j || typeof j !== 'object') throw new Error('전투 데이터가 객체가 아닙니다.');
  endReplay(S); ensureBase(S);
  (Array.isArray(j.skills) ? j.skills : []).slice(0, 10).forEach((o, i) => { const s = llmSkill(o, i); if (!S.skills[s.id]) S.skills[s.id] = s; });
  (Array.isArray(j.units) ? j.units : []).slice(0, 40).forEach((o, i) => { const u = o && PRE[o.preset] ? presetUnit(o.preset, o.level, Object.assign({}, o, { id: idOf(o.id, 'unit_' + i) })) : fitLevel(normUnit(o, i)); if (o) { applyRace(S, u, o.race, !!PRE[o.preset]); setJob(S, u, o.job); if (o.storyW && Array.isArray(o.weapons)) { const mine = (w) => o.weapons.some(x => x && x.name === w.name); u.wok = [...new Set(u.weapons.filter(mine).map(w => w.type))]; u.weapons = u.weapons.filter(mine).concat(u.weapons.filter(w => !mine(w))); } if (o.clsName) u.cls = String(o.clsName).slice(0, 12); if (o.fitJob && u.job) { const keep = u.weapons.filter(w => !arm(w) || canUse(u, w)); if (keep.length) u.weapons = keep; } if (o.boost || o.plus) empower(u, o); if (o.hair) u.hair = o.hair; if (o.size === 2 || o.size === 3) u.size = o.size; } if (!(S.defs[u.id] && S.defs[u.id].ally)) S.defs[u.id] = u; });
  for (const d of Object.values(S.defs)) d.skills = d.skills.filter(id => S.skills[id]);
  const mp = MAPS[String(j.mapPreset || '').trim()];
  if (mp && !(Array.isArray(j.map) && j.map.length >= 4)) {
    const all = [mp.rows].concat(mp.alts || []), fh = roll(S) < 50, fv = roll(S) < 50; let rows = all[roll(S) % all.length];
    if (fh) rows = rows.map(r => r.split('').reverse().join('')); if (fv) rows = rows.slice().reverse();
    const W = rows[0].length, H = rows.length;
    j = Object.assign({}, j, { map: rows, indoor: mp.indoor, theme: mp.theme || j.theme, place: (Array.isArray(j.place) ? j.place : []).map(p => (p && typeof p === 'object' ? Object.assign({}, p, { x: fh ? W + 1 - int(p.x, 1, W, 1) : p.x, y: fv ? H + 1 - int(p.y, 1, H, 1) : p.y }) : p)) });
  }
  let rows = (Array.isArray(j.map) ? j.map : []).filter(r => typeof r === 'string').slice(0, 16);
  if (rows.length < 4) rows = Array.from({ length: 8 }, () => '..........');
  const w = clamp(Math.max(...rows.map(r => r.length)), 5, 20);
  rows = rows.map(r => r.padEnd(w, '.').slice(0, w).replace(/[^.bfpmFTw#lsihHvdnorkuqcx]/g, '.'));
  if (j.indoor === true) rows = rows.map(r => r.replace(/[fm]/g, 'p')); // an interior has no woods or mountains, whatever the model drew
  const obj = j.objective && typeof j.objective === 'object' ? j.objective : {};
  const B = { name: txt(j.name, 60, '이름 없는 전장'), map: rows, w, h: rows.length, turn: 1, phase: 'ally', status: 'active', units: {}, obj: { type: OBJ[obj.type] ? obj.type : 'rout' } };
  if (THEMES.includes(j.theme)) B.theme = j.theme;
  if (B.obj.type === 'survive' || B.obj.type === 'escort' || B.obj.type === 'hunt') B.obj.turns = int(obj.turns, 1, 30, B.obj.type === 'hunt' ? 8 : 6);
  if (B.obj.type === 'hunt') B.obj.need = int(obj.need, 1, 6, 2); if (obj.item) B.obj.item = txt(obj.item, 20, '보물');
  if (S.hunt && j.indoor === true) B.indoor = true;
  if (B.obj.type === 'seize' && !rows.some(r => r.includes('T'))) B.obj.type = 'rout';
  const prev = S.battle; S.battle = B; const taken = new Set();
  B.wait = []; const cand = [];
  for (const p of (Array.isArray(j.place) ? j.place : []).slice(0, 40)) {
    const def = p && S.defs[idOf(p.ref, '')]; if (!def) continue;
    const o = { ref: def.id, id: p.id, team: SIDE[p.team] != null ? p.team : 'enemy', x: int(p.x, 1, B.w, 1) - 1, y: int(p.y, 1, B.h, 1) - 1, ai: p.ai, boss: !!p.boss, ...(p.vip ? { vip: true } : {}), ...(p.carry ? { carry: true } : {}) }, late = int(p.turn, 2, 30, 0);
    if (p.pool && o.team !== 'ally' && o.team !== 'enemy') { delete o.id; cand.push(o); continue; }
    if (late) { if (o.team === 'ally') def.ally = true; o.turn = late; delete o.id; B.wait.push(o); } else enter(S, o, taken);
  }
  if (cand.length) B.cand = cand;
  const us = Object.values(B.units);
  const here = new Set(us.filter(u => u.team === 'ally').map(u => u.ref).concat(waiting(B, 'ally').map(w => w.ref))); for (const id of here) delete S.defs[id].away;
  for (const v of (Array.isArray(j.away) ? j.away : []).slice(0, 40)) { const d = S.defs[idOf(v, '')]; if (d && d.ally && !here.has(d.id)) d.away = true; }
  if (!us.some(u => u.team === 'ally') || !us.some(u => SIDE[u.team] !== 0)) { S.battle = prev; throw new Error('아군과 적이 각각 한 명 이상 배치되어야 합니다.'); }
  if (B.obj.type === 'boss' && !B.hadBoss && !waiting(B).some(w => w.boss && SIDE[w.team] !== 0)) B.obj.type = 'rout';
  // drop enemy templates no longer used
  const used = new Set(us.map(u => u.ref).concat(waiting(B).map(w => w.ref), cand.map(w => w.ref))); for (const id of Object.keys(S.defs)) if (!S.defs[id].ally && !used.has(id)) delete S.defs[id];
  const held = new Set(); for (const d of Object.values(S.defs)) for (const k of d.skills.concat(d.later || [])) held.add(k);
  for (const k of Object.keys(S.skills)) if ((S.skills[k].tier || 'own') === 'own' && !held.has(k)) delete S.skills[k];
  if (S.hunt) {
    for (const b of (Array.isArray(j.bonds) ? j.bonds : []).slice(0, 20)) { const a = S.defs[idOf(b && b.a, '')], c = S.defs[idOf(b && b.b, '')], g = bondKind(b && b.kind); if (a && c && g) addBond(S, a.id, c.id, g, b.duo); }
    for (const o of Array.isArray(j.units) ? j.units : []) { const d = o && S.defs[idOf(o.id, '')]; if (d && Array.isArray(o.cond)) for (const c of o.cond) { const k = condKey(c); if (k) addCond(d, k); } }
    pickWeather(S, j); setupObjective(S, j); for (const u of Object.values(B.units)) if (u.team === 'ally') starterArmor(S.defs[u.ref]);
  }
  if (j.later) { B.later = true; B.premise = txt(j.premise, 500, ''); }
  S.log = []; S.sent = S.seq; log(S, '전투 시작: ' + B.name + ' (목표: ' + objText(B) + ')'); if (S.hunt) applyConds(S); pulseReset(S);
  return S;
}
export function spawn(S, id, team) {
  const B = S.battle, d = S.defs[id]; if (!B || !d) return null;
  if (team === 'ally' && Object.values(B.units).some(u => u.ref === id)) return null;
  const on = alive(B), mates = on.filter(u => u.team === team), a = mates[mates.length - 1] || on[0]; if (!a) return null;
  const sz = S.hunt && team !== 'ally' ? sizeOf(d) : 1, at = nearestFree(S, d, a.x, a.y, new Set(on.flatMap(u => cells(u).map(([x, y]) => K(x, y)))), sz); if (!at) return null;
  let uid = d.id, n = 2; while (B.units[uid]) uid = d.id + '_' + n++;
  const u = { id: uid, ref: d.id, team, x: at[0], y: at[1], hp: d.stats.hp, wi: Math.max(0, d.weapons.findIndex(arm)), done: false, cd: {} };
  if (team === 'ally') d.ally = true; else u.ai = 'charge'; if (sz > 1) { u.sz = sz; giveParts(u, d); } if (S.hunt && team !== 'ally') giveBreak(u, d);
  B.units[uid] = u; log(S, d.name + ' 등장'); return u;
}
// take a unit off the board by hand (editor); never the last one standing on its side
export function unspawn(S, uid) {
  const B = S.battle, u = B && B.units[uid]; if (!u) return false;
  if (u.hp > 0 && !u.rearOf && alive(B).filter(z => !foe(z, u)).length <= 1) return false;
  if (u.rear && B.units[u.rear]) { const r = B.units[u.rear]; r.rearOf = null; r.x = u.x; r.y = u.y; }
  if (u.rearOf && B.units[u.rearOf]) { const l = B.units[u.rearOf]; l.rear = null; l.gauge = 0; }
  delete B.units[uid];
  if (u.boss && !Object.values(B.units).some(z => z.boss && z.hp > 0)) { B.hadBoss = false; if (B.obj.type === 'boss') B.obj.type = 'rout'; }
  return true; // a correction, not an event: nothing goes into the battle record
}
export const THEMES = ["snow", "desert", "lava", "swamp", "night", "cave", "sea", "city", "sky", "autumn", "hall"];

// 특출난 인물: ★ 단계마다 능력치를 키우고(레벨 상한을 넘을 수 있다), 힘+4 같은 손질을 더한다
const BOOST = { 1: 1.2, 2: 1.45, 3: 1.75 };
export function empower(u, o) {
  const f = BOOST[int(o.boost, 0, 3, 0)] || 1, p = o.plus && typeof o.plus === 'object' ? o.plus : {};
  for (const k of Object.keys(u.stats)) u.stats[k] = clamp(Math.round(u.stats[k] * f) + int(p[k], -20, 30, 0), k === 'hp' ? 1 : 0, k === 'hp' ? 150 : 80);
}
