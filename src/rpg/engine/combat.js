// Dusk Saga 엔진 — 전투 예측·해결·유닛 명령 (순수 함수, DOM·api 없음)
import { elemMod } from "./elements.js";
import { canUse } from "./classes.js";
import { DIRS, GUNS, INF, K, MT, SIDE, T0, WT, arm, clamp, dist, foe, gunOf, log, roll, utags } from "./rules.js";
import { grantExp, xp } from "./growth.js";
import { alive, ammo, canShoot, canWatch, coverFrom, est, fireOk, gun, line, living, occMap, pathTo, syncRears, terr, unitAt, uterr, wr } from "./board.js";

export function actWatch(S, u) { const mv = went(S, u); u.ow = true; u.done = true; log(S, S.defs[u.ref].name + ': ' + (mv ? mv + ', ' : '') + '경계', 'ow'); }
export function actReload(S, u, i) { const d = S.defs[u.ref], w = d.weapons[i], mv = went(S, u); if (u.am) delete u.am[w.name]; u.done = true; log(S, d.name + ': ' + (mv ? mv + ', ' : '') + w.name + ' 재장전'); }
// reaction fire: one shot at −15, no critical, nothing comes back
export function snap(S, z, u, ev) {
  const f = side(S, z, u, true, null, 'ow'), dz = S.defs[z.ref], du = S.defs[u.ref], h0 = u.hp; f.hit = Math.max(0, f.hit - 15); f.crit = 0; f.hits = 1;
  ev.push({ t: 'combat', a: z.id, d: u.id, art: '경계 사격' }); const n = ev.length; strike(S, z, u, f, ev); const s = ev[n];
  log(S, dz.name + ' (' + f.w.name + ') 경계 사격 → ' + du.name + ': ' + (s.guard ? '막힘' : s.miss ? '빗나감' : (h0 - u.hp) + ' 피해' + hpOf(S, u)) + (f.cover ? ' (' + f.cover + ')' : '') + (u.hp <= 0 ? ' — ' + du.name + ' 격파' : ''));
  if (u.hp <= 0) fall(S, u, ev);
  if (z.team === 'ally') grantExp(S, dz, expFor(S, z, u, u.hp <= 0, h0 - u.hp), ev, z.id); else if (z.team === 'friend') S.battle.pool = (S.battle.pool || 0) + expFor(S, z, u, u.hp <= 0, h0 - u.hp);
  outcome(S, ev);
}
// walk a path; enemies on overwatch fire as the unit comes into their sights. false when it fell on the way
export function travel(S, u, path, ev) {
  const B = S.battle, occ = occMap(B); let from = 0;
  if (S.xcom) for (let i = 1; i < path.length && u.hp > 0; i++) {
    const o = occ.get(K(path[i].x, path[i].y)); if (o && o.id !== u.id) continue; u.x = path[i].x; u.y = path[i].y;
    for (const z of alive(B)) {
      if (!z.ow || !foe(z, u) || z.hp <= 0) continue; const w = S.defs[z.ref].weapons[z.wi]; if (!arm(w) || dist(z, u) < 2 || !canShoot(S, z, w, u, false)) continue;
      if (i > from) { ev.push({ t: 'move', id: u.id, path: path.slice(from, i + 1) }); from = i; }
      z.ow = false; syncRears(B); snap(S, z, u, ev); if (u.hp <= 0 || B.status !== 'active') break;
    }
  }
  if (u.hp <= 0) return false;
  const last = path[path.length - 1]; u.x = last.x; u.y = last.y; syncRears(B); if (path.length - 1 > from) ev.push({ t: 'move', id: u.id, path: path.slice(from) });
  return true;
}
// ── combat ──
export function cond(S, u, c, ctx) {
  const B = S.battle, d = S.defs[u.ref];
  const mates = () => alive(B).filter(z => !foe(z, u) && z.id !== u.id);
  switch (c) {
    case 'initiating': return ctx.init === true; case 'defending': return ctx.init === false;
    case 'hp_below_half': return u.hp * 2 <= d.stats.hp; case 'hp_full': return u.hp >= d.stats.hp;
    case 'adjacent_ally': return mates().some(z => dist(z, u) === 1); case 'alone': return !mates().some(z => dist(z, u) <= 2);
    case 'on_cover': return uterr(S, u).avo > 0; default: return true;
  }
}
export function mods(S, u, ctx) {
  const m = { atk: 0, hit: 0, avo: 0, crit: 0, def: 0, res: 0, spd: 0 }, fl = {}, d = S.defs[u.ref];
  for (const id of d.skills) {
    const sk = S.skills[id]; if (!sk) continue;
    if ((sk.type === 'passive' && cond(S, u, sk.cond, ctx)) || (sk.type === 'art' && ctx.art === id)) { for (const k in sk.mods) m[k] += sk.mods[k]; Object.assign(fl, sk.flags); }
  }
  return { m, fl };
}
// attack stance: an adjacent, unpaired ally joins each opening attack for half damage (no crit, no skills)
export function partnerOf(S, x, y, dart) {
  if (x.rear) return null; let best = null;
  for (const p of alive(S.battle)) {
    if (p.team !== x.team || p.id === x.id || p.rear || dist(p, x) !== 1) continue;
    const d = S.defs[p.ref], w = d.weapons[p.wi]; if (!arm(w) || !fireOk(S, p, w, y, false)) continue;
    const s = side(S, p, y, true, null, true, dart), dmg = Math.floor(s.dmg / 2), v = dmg * s.hit;
    if (!best || v > best.v) best = { v, id: p.id, wi: p.wi, dmg, hit: s.hit, name: d.name, n: w.brave ? 2 : 1 };
  }
  return best;
}
export function side(S, A, D, init, art, free, dart) {
  const da = S.defs[A.ref], dd = S.defs[D.ref], sa = est(S, A), sd = est(S, D), w = da.weapons[A.wi] || da.weapons[0], ds = dist(A, D);
  const am = mods(S, A, { init, art: init ? art : null }), dm = mods(S, D, { init: !init, art: dart || null });
  const ask = init && art ? S.skills[art] : null;
  let [rmin, rmax] = w ? wr(S, w) : [0, 0]; if (ask && ask.range) { rmin = ask.range[0]; rmax = ask.range[1]; }
  const out = { can: arm(w) && (free || (ds >= rmin && ds <= rmax)), w, dmg: 0, hit: 0, crit: 0, hits: 0, fl: am.fl, as: sa.spd + am.m.spd };
  if (!out.can) return out;
  const wd = dd.weapons[D.wi] || dd.weapons[0]; let tri = 0;
  if (arm(wd) && (WT[w.type].beats || []).includes(wd.type)) tri = 1; else if (arm(wd) && (WT[wd.type].beats || []).includes(w.type)) tri = -1;
  const magic = w.type === 'tome' || !!w.magic || !!am.fl.magic, tags = utags(dd), tt = uterr(S, D);
  const eff = (w.eff || []).some(t => tags.includes(t)) || (w.type === 'bow' && tags.includes('fly'));
  const gk = gun(S, w), gm = { h: 0, d: 0, c: 0 };
  if (gk === 'shotgun') { gm.h = ds <= 1 ? 20 : ds === 2 ? 0 : -20; gm.d = ds <= 1 ? 3 : ds === 2 ? 0 : -3; } else if (gk === 'rifle' && ds <= 1) gm.h = -10; else if (gk === 'sniper') gm.c = 10; else if (gk === 'auto') gm.h = -10;
  const cv = S.xcom && free !== true && ds >= 2 ? coverFrom(S, D, A) : { v: 0 }, open = !!S.xcom && free !== true && ds >= 2 && !cv.v;
  out.cover = cv.v >= 40 ? '완전엄폐' : cv.v ? '반엄폐' : cv.flank ? '측면' : '';
  const atk = (magic ? sa.mag : sa.str) + w.mt * (eff ? 3 : 1) + tri + am.m.atk + gm.d;
  let df = (magic ? sd.res + dm.m.res : sd.def + dm.m.def) + tt.def; out.df0 = df;
  if (am.fl.pierce) df = Math.floor(df * (100 - am.fl.pierce) / 100);
  out.elem = (ask && ask.elem) || w.elem || ''; out.em = out.elem ? elemMod(out.elem, dd, (S.battle.map[D.y] || '')[D.x]) : 1; out.mul = (am.fl.mult || 1) * out.em; out.blk = dm.fl.block || 0; out.dmg = Math.floor(Math.floor(Math.max(0, atk - df) * out.mul) * (100 - out.blk) / 100); out.atk = atk; out.eff = eff; out.tri = tri; out.magic = magic;
  const pt = free ? null : partnerOf(S, A, D, dart); out.partner = pt;
  out.hit = am.fl.sure ? 100 : clamp(gm.h - cv.v + w.hit + sa.skl * 2 + Math.floor(sa.lck / 2) + tri * 15 + am.m.hit + (pt ? 10 : 0) - ((sd.spd + dm.m.spd) * 2 + sd.lck + tt.avo + dm.m.avo + (wd && wd.type === 'claw' && w.type !== 'claw' ? 15 : 0)), 0, 100);
  out.crit = clamp(gm.c + (open ? 10 : 0) + w.crit + Math.floor(sa.skl / 2) + am.m.crit - sd.lck - (D.rear ? 5 : 0), 0, 100);
  out.init = init; out.hits = gk === 'auto' ? (init ? clamp(ammo(S, A, w), 1, 2) : 1) : am.fl.brave || (init && w.brave) ? 2 : 1; if (gk) out.hits = clamp(ammo(S, A, w), 1, out.hits);
  return out;
}
export function forecast(S, a, d, art) {
  const A = side(S, a, d, true, art), D = side(S, d, a, false, null, false, art);
  if (A.fl.noCounter || (S.xcom && (dist(a, d) >= 2 || gunOf(D.w)))) D.can = false;
  A.x2 = A.can && A.as - D.as >= 4; D.x2 = D.can && D.as - A.as >= 4; if (S.xcom && gunOf(A.w)) A.x2 = false;
  A.total = A.can ? A.dmg * A.hits * (A.x2 ? 2 : 1) : 0; D.total = D.can ? D.dmg * D.hits * (D.x2 ? 2 : 1) : 0;
  // a guard-stance pair (lead + rear) blocks every dual strike aimed at it
  A.dual = A.can && A.partner && !d.rear ? A.partner : null; D.dual = D.can && D.partner && !a.rear ? D.partner : null;
  A.gauge = a.rear ? (a.gauge || 0) : null; D.gauge = d.rear ? (d.gauge || 0) : null;
  return { a: A, d: D };
}
export function spend(S, u, w) { if (u.team !== 'ally' || !w || !w.max || arm(w)) return false; w.uses = Math.max(0, (w.uses == null ? w.max : w.uses) - 1); return w.uses === 0; }
export function unslot(S, d, i) { const w = d.weapons.splice(i, 1)[0]; if (S.battle) for (const z of Object.values(S.battle.units)) if (z.ref === d.id) { if (z.wi === i) z.wi = Math.max(0, d.weapons.findIndex(arm)); else if (z.wi > i) z.wi--; } return w; }
export function discard(S, u, w) { const d = S.defs[u.ref], i = d.weapons.indexOf(w); if (i >= 0) unslot(S, d, i); }
export function strike(S, x, y, f, ev) {
  x.fought = y.fought = true; if (gun(S, f.w)) (x.am || (x.am = {}))[f.w.name] = Math.max(0, ammo(S, x, f.w) - 1);
  const dx = S.defs[x.ref], dy = S.defs[y.ref], e = { t: 'strike', from: x.id, to: y.id, dmg: 0, hp: y.hp };
  // guard stance: a full shield gauge cancels the next attack outright
  if (y.rear && (y.gauge || 0) >= 10) { y.gauge = 0; e.guard = true; ev.push(e); if (x.rear) x.gauge = Math.min(10, (x.gauge || 0) + 2); return 0; }
  if (x.rear) x.gauge = Math.min(10, (x.gauge || 0) + 2);
  if (y.rear) y.gauge = Math.min(10, (y.gauge || 0) + 2);
  if (!(f.fl.sure || (roll(S) + roll(S)) / 2 < f.hit)) { e.miss = true; ev.push(e); return 0; }
  if (spend(S, x, f.w)) e.brk = f.w.name;
  let dmg = f.dmg, drain = Math.max(f.fl.drain || 0, f.w.drain || 0); const names = [], stx = est(S, x), sty = est(S, y);
  for (const id of dx.skills) {
    const sk = S.skills[id]; if (!sk || sk.type !== 'proc' || sk.flags.block || !cond(S, x, sk.cond, { init: f.init })) continue;
    if (roll(S) >= (typeof sk.rate === 'string' ? stx[sk.rate] : sk.rate)) continue;
    names.push(sk.name); dmg += sk.mods.atk || 0;
    if (sk.flags.pierce) dmg = Math.max(dmg, Math.floor(Math.floor(Math.max(0, f.atk + (sk.mods.atk || 0) - Math.floor(f.df0 * (100 - sk.flags.pierce) / 100)) * (f.mul || 1)) * (100 - (f.blk || 0)) / 100));
    if (sk.flags.mult) dmg = Math.floor(dmg * sk.flags.mult);
    drain = Math.max(drain, sk.flags.drain || 0); break;
  }
  if (roll(S) < f.crit) { dmg *= 3; e.crit = true; }
  for (const id of dy.skills) { const sk = S.skills[id]; if (sk && sk.type === 'proc' && sk.flags.block && cond(S, y, sk.cond, { init: !f.init }) && roll(S) < (typeof sk.rate === 'string' ? sty[sk.rate] : sk.rate)) { dmg = Math.floor(dmg * (100 - sk.flags.block) / 100); e.block = sk.name; break; } }
  dmg = clamp(dmg, 0, y.hp); y.hp -= dmg; e.dmg = dmg; e.hp = y.hp; if (names.length) e.proc = names.join(', ');
  if (drain && dmg > 0) { const h = Math.min(dx.stats.hp - x.hp, Math.ceil(dmg * drain / 100)); if (h > 0) { x.hp += h; e.heal = h; e.hpFrom = x.hp; } }
  ev.push(e); return dmg;
}
export function dualStrike(S, pt, y, ev, yInit) {
  const e = { t: 'strike', from: pt.id, to: y.id, dmg: 0, hp: y.hp, dual: true };
  const p = S.battle.units[pt.id], pw = p && S.defs[p.ref].weapons[pt.wi];
  if (pw && gun(S, pw)) { if (ammo(S, p, pw) <= 0) { e.miss = true; ev.push(e); return e; } (p.am || (p.am = {}))[pw.name] = ammo(S, p, pw) - 1; }
  if (y.rear) e.guard = true;
  else if ((roll(S) + roll(S)) / 2 < pt.hit) {
    let dmg = pt.dmg; const dy = S.defs[y.ref], sty = est(S, y);
    for (const id of dy.skills) { const sk = S.skills[id]; if (sk && sk.type === 'proc' && sk.flags.block && cond(S, y, sk.cond, { init: !!yInit }) && roll(S) < (typeof sk.rate === 'string' ? sty[sk.rate] : sk.rate)) { dmg = Math.floor(dmg * (100 - sk.flags.block) / 100); e.block = sk.name; break; } }
    e.dmg = Math.min(dmg, y.hp); y.hp -= e.dmg; e.hp = y.hp;
  }
  else e.miss = true;
  ev.push(e); return e;
}
export function expFor(S, a, d, kill, dealt) {
  const diff = S.defs[d.ref].level - S.defs[a.ref].level;
  if (kill) return xp(S, clamp(12 + diff * 3, 3, 40) + (d.boss ? 10 : 0));
  return xp(S, dealt > 0 ? clamp(4 + diff, 1, 10) : 1);
}
export function went(S, u) {
  const m = u.mv; delete u.mv; if (!m) return '';
  const n = Math.abs(u.x - m.x) + Math.abs(u.y - m.y); if (!n) return '';
  const t = uterr(S, u); return n + '칸 이동' + (t.n && t.n !== T0.n ? ', ' + t.n : '');
}
export const hpOf = (S, u) => ' (' + u.hp + '/' + S.defs[u.ref].stats.hp + ')';
export function fall(S, u, ev) {
  const B = S.battle; ev.push({ t: 'die', id: u.id });
  if (u.rear && B.units[u.rear]) { const r = B.units[u.rear]; r.rearOf = null; r.x = u.x; r.y = u.y; r.done = true; u.rear = null; ev.push({ t: 'front', id: r.id }); log(S, S.defs[r.ref].name + ': 후위에서 전위로 나섬'); }
}
export function resolve(S, a, d, art, ev) {
  syncRears(S.battle);
  const fc = forecast(S, a, d, art), na = S.defs[a.ref].name, nd = S.defs[d.ref].name, hp0 = { a: a.hp, d: d.hp };
  const order = [[a, d, fc.a, true]]; if (fc.d.can) order.push([d, a, fc.d, true]); if (fc.a.x2) order.push([a, d, fc.a, false]); else if (fc.d.x2) order.push([d, a, fc.d, false]);
  ev.push({ t: 'combat', a: a.id, d: d.id, art: art ? S.skills[art].name : null });
  let crit = false; const notes = [], broke = new Map(), cnt = { [a.id]: [0, 0], [d.id]: [0, 0] };
  for (const [x, y, f, first] of order) {
    for (let i = 0; i < f.hits; i++) { if (x.hp <= 0 || y.hp <= 0 || broke.has(x.id) || (gun(S, f.w) && ammo(S, x, f.w) <= 0)) break; const n = ev.length; strike(S, x, y, f, ev); const e = ev[n]; cnt[x.id][0]++; if (!e.miss && !e.guard) cnt[x.id][1]++; if (e.guard) cnt[x.id][2] = 1; if (e.brk) broke.set(x.id, f.w); if (e.crit) crit = true; if (e.proc) notes.push(e.proc); if (e.guard) notes.push('호위진 방어'); }
    if (first && f.partner && x.hp > 0) for (let k = 0; k < (f.partner.n || 1) && y.hp > 0; k++) { const e = dualStrike(S, f.partner, y, ev, y.id === a.id); notes.push(e.guard ? '협동 공격 차단' : f.partner.name + ' 협동 공격' + (e.miss ? ' 빗나감' : ' ' + e.dmg)); }
  }
  if (fc.a.cover) notes.push(fc.a.cover);
  const mv = went(S, a), tally = c => (c[0] > 1 && c[1] > 0 && c[1] < c[0] ? ' (' + c[0] + '회 중 ' + c[1] + '회 명중)' : ''), ca = cnt[a.id], cd = cnt[d.id];
  let line = na + ' (' + [fc.a.w && fc.a.w.name, mv].filter(Boolean).join(', ') + ')' + (art ? ' [' + S.skills[art].name + ']' : '') + ' → ' + nd + ': ' + (ca[0] && !ca[1] && hp0.d === d.hp ? (ca[2] ? '막힘' : '빗나감') : (hp0.d - d.hp) + ' 피해' + hpOf(S, d) + tally(ca));
  if (fc.d.can && cd[0]) line += !cd[1] ? (cd[2] ? ', 반격 막힘' : ', 반격 빗나감') : ', 반격으로 ' + Math.max(0, hp0.a - a.hp) + ' 피해' + hpOf(S, a) + tally(cd); if (crit) line += ' (필살)'; if (notes.length) line += ' (' + [...new Set(notes)].join(', ') + ')';
  for (const u of [d, a]) if (u.hp <= 0) line += ' — ' + S.defs[u.ref].name + ' 격파';
  for (const [id, w] of broke) line += ' — ' + S.defs[S.battle.units[id].ref].name + '의 ' + w.name + ' 부서짐';
  log(S, line);
  for (const [id, w] of broke) { discard(S, S.battle.units[id], w); ev.push({ t: 'break', id, name: w.name }); }
  for (const u of [d, a]) if (u.hp <= 0) fall(S, u, ev);
  if (art) { a.cd[art] = (S.skills[art].cd || 0) + 1; }
  for (const [u, z, h0] of [[a, d, hp0.d], [d, a, hp0.a]]) if (u.team === 'friend' && u.hp > 0) S.battle.pool = (S.battle.pool || 0) + expFor(S, u, z, z.hp <= 0, h0 - z.hp);
  for (const [u, z, h0] of [[a, d, hp0.d], [d, a, hp0.a]]) if (u.team === 'ally' && u.hp > 0) {
    const amount = expFor(S, u, z, z.hp <= 0, h0 - z.hp); grantExp(S, S.defs[u.ref], amount, ev, u.id);
    if (u.rear && S.battle.units[u.rear]) grantExp(S, S.defs[S.battle.units[u.rear].ref], Math.floor(amount / 2), ev, null);
  }
  outcome(S, ev);
}
export function healAmount(S, u) { const d = S.defs[u.ref], w = d.weapons[u.wi]; return w && w.type === 'staff' ? d.stats.mag + w.mt : 0; }
export function heal(S, u, z, ev) {
  const d = S.defs[u.ref], w = d.weapons[u.wi], amt = Math.min(S.defs[z.ref].stats.hp - z.hp, healAmount(S, u)); z.hp += amt;
  ev.push({ t: 'heal', from: u.id, id: z.id, amt, hp: z.hp }); log(S, d.name + ' (' + [w.name, went(S, u)].filter(Boolean).join(', ') + ') → ' + S.defs[z.ref].name + ': ' + amt + ' 회복' + hpOf(S, z));
  if (spend(S, u, w)) { log(S, d.name + '의 ' + w.name + ' 소진'); discard(S, u, w); ev.push({ t: 'break', id: u.id, name: w.name }); }
  if (u.team === 'ally') grantExp(S, d, xp(S, 6), ev, u.id);
}
// 도구: a consumable from the inventory, used on oneself
export function actItem(S, u, i, ev) {
  const d = S.defs[u.ref], w = d.weapons[i]; if (!w || w.type !== 'item') return;
  const amt = Math.min(d.stats.hp - u.hp, w.mt); u.hp += amt; ev.push({ t: 'heal', from: u.id, id: u.id, amt, hp: u.hp });
  const mv = went(S, u), out = spend(S, u, w);
  log(S, d.name + (mv ? ' (' + mv + ')' : '') + ': ' + w.name + ' 사용, ' + amt + ' 회복' + hpOf(S, u) + (out ? ' — ' + w.name + ' 다 씀' : w.max && u.team === 'ally' ? ' (남은 ' + w.uses + '회)' : '')); if (out) discard(S, u, w); u.done = true;
}
// 교환: hand one inventory entry to an adjacent ally
export function actGive(S, a, b, i) { const da = S.defs[a.ref], db = S.defs[b.ref]; if (da === db || !da.weapons[i] || db.weapons.length >= 5) return false; const w = unslot(S, da, i); db.weapons.push(w); const n = a.am ? a.am[w.name] : null; if (a.am && !da.weapons.some(x => x.name === w.name)) delete a.am[w.name]; if (n != null) (b.am || (b.am = {}))[w.name] = n; else if (b.am) delete b.am[w.name]; log(S, da.name + ' → ' + db.name + ': ' + w.name + ' 건넴'); return true; }
export function outcome(S, ev) {
  const B = S.battle; if (!B || B.status !== 'active') return;
  const us = alive(B), allies = us.filter(u => u.team === 'ally'), foes = us.filter(u => SIDE[u.team] !== 0);
  let st = null;
  if (!allies.length) st = 'defeat';
  else if (!foes.length) st = 'victory';
  else if (B.obj.type === 'boss' && B.hadBoss && !foes.some(u => u.boss)) st = 'victory';
  else if (B.obj.type === 'survive' && B.turn > B.obj.turns) st = 'victory';
  if (st) finish(S, st, ev);
}
export function finish(S, st, ev) {
  const B = S.battle; B.status = st; log(S, st === 'victory' ? '전투 승리' : '전투 패배'); ev.push({ t: 'end', status: st });
  if (st !== 'victory') return;
  const party = living(B).filter(u => u.team === 'ally'), share = party.length ? Math.floor((B.pool || 0) / party.length) : 0;
  if (share > 0) log(S, '우군이 얻은 경험치 ' + B.pool + ' → 아군 ' + party.length + '명에게 ' + share + '씩');
  for (const u of party) grantExp(S, S.defs[u.ref], xp(S, 8) + share, ev, u.id);
  B.pool = 0;
}
export function moveUnit(S, u, x, y, R, ev) { if (u.x === x && u.y === y) return true; const path = pathTo(R, K(x, y)); u.mv = { x: u.x, y: u.y }; return travel(S, u, path, ev); }
// player commands; each returns nothing and pushes events
export function actAttack(S, u, z, art, ev) { resolve(S, u, z, art, ev); u.done = true; }
export function actHeal(S, u, z, ev) { heal(S, u, z, ev); u.done = true; }
export function actWait(S, u) { const mv = went(S, u); u.done = true; log(S, S.defs[u.ref].name + ': ' + (mv || '제자리 대기'), mv ? 'mv' : 'wait'); }
// guard stance commands: the acting unit steps into an adjacent ally's tile as the rear partner
export function actPair(S, u, z) { u.rearOf = z.id; z.rear = u.id; z.gauge = 0; u.ow = false; u.x = z.x; u.y = z.y; u.done = true; delete u.mv; log(S, '호위진 편성: 전위 ' + S.defs[z.ref].name + ' / 후위 ' + S.defs[u.ref].name); }
export function actSwitch(S, u) { const r = S.battle.units[u.rear]; r.rear = u.id; r.rearOf = null; r.gauge = u.gauge || 0; r.x = u.x; r.y = u.y; r.done = u.done; u.rear = null; u.rearOf = r.id; u.gauge = 0; return r; }
export function actDrop(S, u, x, y) { const r = S.battle.units[u.rear]; r.rearOf = null; r.x = x; r.y = y; r.done = false; u.rear = null; u.gauge = 0; u.done = true; log(S, '호위진 해제: ' + S.defs[u.ref].name + ' / ' + S.defs[r.ref].name); }
export function canSeize(S, u) { const B = S.battle; return B.obj.type === 'seize' && u.team === 'ally' && (B.map[u.y] || '')[u.x] === 'T'; }
export function actSeize(S, u, ev) { u.done = true; log(S, S.defs[u.ref].name + ' 옥좌 제압'); finish(S, 'victory', ev); }
export function options(S, u, from) {
  const moved = !!from && (from.x !== u.x || from.y !== u.y);
  const d = S.defs[u.ref], foes = alive(S.battle).filter(z => foe(z, u)), mates = alive(S.battle).filter(z => !foe(z, u) && z.id !== u.id), out = [];
  d.weapons.forEach((w, i) => {
    if (w.type === 'staff') { const t = mates.filter(z => { const ds = dist(u, z); return ds >= w.rmin && ds <= w.rmax && z.hp < S.defs[z.ref].stats.hp; }); out.push({ kind: 'heal', wi: i, label: w.name, targets: t.map(z => z.id) }); return; }
    if (!canUse(d, w)) return;
    if (w.type === 'item') { out.push({ kind: 'item', wi: i, label: w.name, targets: u.hp < d.stats.hp ? [u.id] : [] }); return; }
    out.push({ kind: 'attack', wi: i, label: w.name, targets: foes.filter(z => canShoot(S, u, w, z, moved)).map(z => z.id) });
  });
  const ew = arm(d.weapons[u.wi]) && canUse(d, d.weapons[u.wi]) ? u.wi : d.weapons.findIndex((w) => arm(w) && canUse(d, w));
  if (ew >= 0) for (const id of d.skills) {
    const sk = S.skills[id]; if (!sk || sk.type !== 'art') continue; const w = d.weapons[ew], r = sk.range || wr(S, w);
    out.push({ kind: 'attack', wi: ew, art: id, label: sk.name, cd: u.cd[id] || 0, targets: (u.cd[id] || 0) > 0 ? [] : foes.filter(z => { const ds = dist(u, z); return ds >= r[0] && ds <= r[1] && fireOk(S, u, w, z, moved); }).map(z => z.id) });
  }
  const B = S.battle;
  if (u.rear && B.units[u.rear]) {
    const rm = MT[S.defs[B.units[u.rear].ref].mtype] || 0;
    out.push({ kind: 'switch', label: S.defs[B.units[u.rear].ref].name, targets: terr(B, u.x, u.y).c[rm] < INF ? [u.rear] : [] });
    out.push({ kind: 'drop', label: '호위진 해제', targets: DIRS.map(([dx, dy]) => [u.x + dx, u.y + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < B.w && y < B.h && !unitAt(B, x, y) && terr(B, x, y).c[rm] < INF).map(([x, y]) => K(x, y)) });
  } else out.push({ kind: 'pair', label: '호위진 편성', targets: mates.filter(z => z.team === u.team && dist(z, u) === 1 && !z.rear).map(z => z.id) });
  if (S.xcom) {
    d.weapons.forEach((w, i) => { const g = gun(S, w); if (g && ammo(S, u, w) < GUNS[g].mag) out.push({ kind: 'reload', wi: i, label: w.name + ' 재장전', small: ammo(S, u, w) + '/' + GUNS[g].mag, targets: [u.id] }); });
    if (canWatch(S, u, d.weapons[u.wi], moved)) out.push({ kind: 'watch', label: '경계', small: d.weapons[u.wi].name, targets: [u.id] });
  }
  out.push({ kind: 'trade', label: '교환', targets: mates.filter(z => z.team === u.team && dist(z, u) === 1 && z.ref !== u.ref).map(z => z.id) });
  return out;
}
