// Dusk Saga 엔진 — 경험치·레벨·RP 성장 (순수 함수, DOM·api 없음)
import { MAXLV, SL, STATS, arm, clamp, idOf, int, log, roll, txt } from "./rules.js";
import { fitLevel, llmSkill, normUnit, normWeapon, tameWeapon } from "./normalize.js";
import { retro } from "./saves.js";

export const expRate = S => (S.expRate == null ? 1 : S.expRate);
export const xp = (S, n) => (expRate(S) > 0 ? Math.max(1, Math.round(n * expRate(S))) : 0);
// the level a skill belongs to, read off its numbers (the same tiers the generators are given); arts sit one tier lower
export function reqLevel(sk) {
  const t = (v, a, b, c) => (v <= a ? 1 : v <= b ? 11 : v <= c ? 21 : 40), m = sk.mods || {}, f = sk.flags || {}; let r = 1;
  for (const k of ['atk', 'def', 'res', 'spd']) if (m[k] > 0) r = Math.max(r, t(m[k], 2, 3, 5));
  for (const k of ['hit', 'avo', 'crit']) if (m[k] > 0) r = Math.max(r, t(m[k], 10, 15, 25));
  for (const k of ['pierce', 'drain', 'block']) if (f[k]) r = Math.max(r, t(f[k], 30, 40, 60));
  if (f.mult) r = Math.max(r, f.mult <= 1.3 ? 11 : f.mult <= 2 ? 21 : 40);
  if (f.regen) r = Math.max(r, t(f.regen, 3, 5, 7));
  if (f.brave || f.sure || f.noCounter) r = Math.max(r, 21);
  return sk.type === 'art' ? (r >= 40 ? 21 : r >= 21 ? 11 : 1) : r;
}
// skills set aside by an adjustment come back once the level allows
export function relearn(S, d, lines) {
  if (!d.later || !d.later.length) return; const rest = [];
  for (const k of d.later) {
    const sk = S.skills[k]; if (!sk || d.skills.includes(k)) continue;
    if (reqLevel(sk) <= d.level && d.skills.length < 6) { d.skills.push(k); if (lines) lines.push('다시 습득: ' + sk.name); else log(S, d.name + ': ' + sk.name + ' 다시 습득'); }
    else rest.push(k);
  }
  d.later = rest;
}
export function rescale(S, id, level) {
  const d = S.defs[id]; if (!d) return null; level = int(level, 1, MAXLV, d.level); const diff = level - d.level, lines = [];
  if (diff) { lines.push('Lv ' + d.level + ' → ' + level); const keepShare = diff < 0 && d.level > 1 ? 0.4 + 0.6 * (level - 1) / (d.level - 1) : 0; // going down never strips a stat below this share of what it was
    for (const k of STATS) d.stats[k] = clamp(Math.max(d.stats[k] + Math.round(d.growth[k] * diff / 100), Math.round(d.stats[k] * keepShare)), k === 'hp' ? 10 : 0, k === 'hp' ? 120 : 60); }
  d.level = level; d.exp = 0; fitLevel(d); d.later = d.later || [];
  const keep = []; for (const k of d.skills) { const sk = S.skills[k]; if (sk && reqLevel(sk) > level) { if (!d.later.includes(k)) d.later.push(k); lines.push('보류: ' + sk.name + ' (Lv ' + reqLevel(sk) + ')'); } else keep.push(k); }
  d.skills = keep; relearn(S, d, lines);
  if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === id && u.hp > 0) u.hp = clamp(u.hp, 1, d.stats.hp);
  retro(S, id); return lines;
}
export function grantExp(S, def, amount, ev, uid) {
  if (!def || amount <= 0 || def.level >= MAXLV) return;
  def.exp += amount; if (uid) ev.push({ t: 'exp', id: uid, gain: amount });
  while (def.exp >= 100 && def.level < MAXLV) {
    def.exp -= 100; def.level++; const gains = {};
    for (const k of STATS) { let g = def.growth[k], n = 0; while (g >= 100) { n++; g -= 100; } if (roll(S) < g) n++; if (n) gains[k] = n; }
    if (!Object.keys(gains).length) gains.hp = 1;
    for (const k in gains) def.stats[k] = Math.min(k === 'hp' ? 120 : 60, def.stats[k] + gains[k]);
    if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === def.id && u.hp > 0 && gains.hp) u.hp += gains.hp;
    log(S, def.name + ' 레벨 업! Lv ' + def.level + ' (' + Object.keys(gains).map(k => SL[k] + '+' + gains[k]).join(' ') + ')');
    ev.push({ t: 'level', id: uid, level: def.level, gains });
    relearn(S, def);
  }
  if (def.level >= MAXLV) def.exp = 0;
}
// ── RP growth: bounded changes proposed by the model, applied only after the user confirms ──
export function planGrowth(S, items) {
  const out = [];
  for (const it of (Array.isArray(items) ? items : []).slice(0, 12)) {
    const d = it && S.defs[idOf(it.id, '')]; if (!d || !d.ally) continue;
    const g = { id: d.id, reason: txt(it.reason, 120, 'RP 성장'), stats: {}, exp: int(it.exp, 0, 300, 0), learn: [], forget: [], lines: [] };
    let budget = 6;
    for (const k of STATS) { let v = int(it.stats && it.stats[k], k === 'hp' ? -8 : -3, k === 'hp' ? 8 : 3, 0); if (v > 0 && k !== 'hp') { v = Math.min(v, budget); budget -= v; } if (v) g.stats[k] = v; }
    for (const s of (Array.isArray(it.learn) ? it.learn : []).slice(0, 3)) { const id = idOf(s, ''); if (S.skills[id] && !d.skills.includes(id) && !g.learn.includes(id) && d.skills.length + g.learn.length < 6) g.learn.push(id); }
    for (const s of (Array.isArray(it.forget) ? it.forget : []).slice(0, 3)) { const id = idOf(s, ''); if (d.skills.includes(id)) g.forget.push(id); }
    if (it.weapon && typeof it.weapon === 'object') g.weapon = tameWeapon(normWeapon(it.weapon));
    const st = Object.keys(g.stats).map(k => SL[k] + (g.stats[k] > 0 ? '+' : '') + g.stats[k]);
    if (st.length) g.lines.push(st.join(' ')); if (g.exp) g.lines.push('경험치 +' + g.exp);
    if (g.learn.length) g.lines.push('습득: ' + g.learn.map(id => S.skills[id].name).join(', '));
    if (g.forget.length) g.lines.push('제거: ' + g.forget.map(id => S.skills[id].name).join(', '));
    if (g.weapon) g.lines.push('무기: ' + g.weapon.name);
    if (g.lines.length) out.push(g);
  }
  return out;
}
export function applyGrowth(S, plan) {
  const ev = [];
  for (const g of plan) {
    const d = S.defs[g.id]; if (!d) continue;
    for (const k in g.stats) d.stats[k] = clamp(d.stats[k] + g.stats[k], k === 'hp' ? 1 : 0, k === 'hp' ? 120 : 60);
    d.skills = [...new Set(d.skills.filter(id => !g.forget.includes(id)).concat(g.learn))].slice(0, 6);
    if (g.weapon) { const i = d.weapons.findIndex(w => w.name === g.weapon.name); if (i >= 0) d.weapons[i] = g.weapon; else if (d.weapons.length < 5) d.weapons.push(g.weapon); else d.weapons[d.weapons.length - 1] = g.weapon; }
    d.history = (d.history || []).concat(g.reason).slice(-8);
    log(S, d.name + ' 성장: ' + g.lines.join(' / ') + ' — ' + g.reason);
    grantExp(S, d, g.exp, ev, null);
    if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === d.id) { u.hp = clamp(u.hp, u.hp > 0 ? 1 : 0, d.stats.hp); if (!d.weapons[u.wi]) u.wi = 0; }
  }
}
export function regen(S, id, j) {
  const d = S.defs[id], o = j && typeof j.unit === 'object' && j.unit ? j.unit : null; if (!d || !o || !o.stats) throw new Error('응답에 유닛 정보가 없습니다.');
  (Array.isArray(j.skills) ? j.skills : []).slice(0, 8).forEach((x, i) => { const s = llmSkill(x, i); if (!S.skills[s.id]) S.skills[s.id] = s; });
  const u = fitLevel(normUnit(Object.assign({}, o, { id: d.id, name: d.name, level: d.level, exp: d.exp, history: d.history, img: d.img, ally: d.ally, away: d.away, asset: txt(o.asset, 80, '') || d.asset }), 0));
  u.id = d.id; u.skills = u.skills.filter(k => S.skills[k]); S.defs[id] = u;
  if (S.battle) for (const z of Object.values(S.battle.units)) if (z.ref === id) { if (z.hp > 0) z.hp = clamp(Math.round(z.hp * u.stats.hp / d.stats.hp), 1, u.stats.hp); z.wi = Math.max(0, u.weapons.findIndex(arm)); z.cd = {}; }
  retro(S, id); return u;
}
