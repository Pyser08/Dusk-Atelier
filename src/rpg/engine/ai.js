// Dusk Saga 엔진 — 적 AI (순수 함수, DOM·api 없음)
import { canUse } from "./classes.js";
import { alive, ammo, canShoot, canWatch, coverAt, gun, pathTo, reach, stops, uterr, wr } from "./board.js";
import { DIRS, K, arm, dist, foe, log, unK } from "./rules.js";
import { actReload, forecast, moveUnit, resolve, went } from "./combat.js";

export function aiAct(S, u, ev) {
  const B = S.battle, d = S.defs[u.ref], foes = alive(B).filter(z => foe(z, u)), mates = alive(B).filter(z => !foe(z, u) && z.id !== u.id);
  u.done = true; if (!foes.length) return;
  const R = reach(S, u), ox = u.x, oy = u.y, owi = u.wi, ai = u.ai || 'charge';
  const cand = ai === 'guard' ? [K(ox, oy)] : stops(S, u, R);
  const staff = d.weapons.findIndex(w => w.type === 'staff');
  if (staff >= 0) {
    let bh = null; u.wi = staff; const w = d.weapons[staff];
    for (const k of cand) { const [x, y] = unK(k); for (const z of mates) { const miss = S.defs[z.ref].stats.hp - z.hp, ds = Math.abs(z.x - x) + Math.abs(z.y - y); if (miss >= 5 && ds >= w.rmin && ds <= w.rmax && (!bh || miss > bh.miss)) bh = { miss, x, y, z }; } }
    if (bh && (bh.miss * 2 >= S.defs[bh.z.ref].stats.hp || !d.weapons.some(arm))) { if (moveUnit(S, u, bh.x, bh.y, R, ev)) heal(S, u, bh.z, ev); return; }
    u.wi = owi;
  }
  let best = null;
  for (const k of cand) {
    const [x, y] = unK(k); u.x = x; u.y = y; const cover = uterr(S, u).avo / 10 - R.get(k).c * 0.01 + (S.xcom ? coverAt(S, u, foes) / 10 : 0);
    d.weapons.forEach((w, i) => {
      if (!arm(w) || !canUse(d, w)) return; u.wi = i;
      for (const f of foes) {
        if (!canShoot(S, u, w, f, x !== ox || y !== oy)) continue;
        const fc = forecast(S, u, f, null);
        const sc = Math.min(f.hp, fc.a.total) * fc.a.hit / 100 * 2 + (fc.a.dual ? fc.a.dual.dmg * fc.a.dual.hit / 100 : 0) - (fc.d.dual ? fc.d.dual.dmg * fc.d.dual.hit / 100 : 0) + (fc.a.total >= f.hp ? 40 * fc.a.hit / 100 : 0) - (fc.d.can ? Math.min(u.hp, fc.d.total) * fc.d.hit / 100 : 0) + cover;
        if (!best || sc > best.sc) best = { sc, x, y, wi: i, f };
      }
    });
  }
  u.x = ox; u.y = oy; u.wi = owi;
  if (best) { u.wi = best.wi; if (moveUnit(S, u, best.x, best.y, R, ev)) resolve(S, u, best.f, null, ev); return; }
  if (S.xcom) { const gi = d.weapons.findIndex(w => gun(S, w) && ammo(S, u, w) <= 0); if (gi >= 0) { actReload(S, u, gi); return; } }
  if (ai === 'charge') march();
  if (u.hp <= 0 || B.status !== 'active') return;
  const mv = went(S, u), wi = d.weapons.findIndex(w => canWatch(S, u, w, !!mv));
  if (wi >= 0) { u.wi = wi; u.ow = true; log(S, d.name + ': ' + (mv ? mv + ', ' : '') + '경계', 'ow'); } else if (mv) log(S, d.name + ': ' + mv, 'mv');
  // march: follow the cheapest route to the nearest opponent as far as this turn allows; under cover rules end the step behind cover if some is right there
  function march() {
    const lo = Math.min(...d.weapons.filter(arm).map(w => wr(S, w)[0]));
    if (S.xcom && lo >= 2 && lo < 9 && foes.some(f => dist(u, f) < lo)) {
      let bk = null; for (const k of stops(S, u, R)) { const [x, y] = unK(k), near = Math.min(lo + 1, ...foes.map(f => Math.abs(f.x - x) + Math.abs(f.y - y))), sc = near * 10 - R.get(k).c; if (!bk || sc > bk.sc) bk = { sc, x, y }; }
      if (bk) moveUnit(S, u, bk.x, bk.y, R, ev); return;
    }
    const full = reach(S, u, { unlimited: true, ignoreUnits: true }); let tk = null;
    const goals = (staff >= 0 && !d.weapons.some(arm) ? mates : foes);
    const hi = goals === foes ? Math.max(1, ...d.weapons.filter(arm).map(w => wr(S, w)[1])) : 1;
    for (const f of goals) {
      if (full.has(K(f.x, f.y))) { const k = K(f.x, f.y); if (tk == null || full.get(k).c < full.get(tk).c) tk = k; continue; }
      for (let dy = -hi; dy <= hi; dy++) for (let dx = -hi; dx <= hi; dx++) { const x = f.x + dx, y = f.y + dy, k = K(x, y); if (Math.abs(dx) + Math.abs(dy) <= hi && x >= 0 && y >= 0 && x < B.w && y < B.h && full.has(k) && (tk == null || full.get(k).c < full.get(tk).c)) tk = k; }
    }
    if (tk == null) return;
    const ok = new Set(stops(S, u, R)); let dest = null;
    for (const p of pathTo(full, tk)) { const k = K(p.x, p.y); if (ok.has(k)) dest = p; else if (!R.has(k)) break; }
    if (dest && S.xcom) {
      const cov = (x, y) => { u.x = x; u.y = y; const v = coverAt(S, u, foes); u.x = ox; u.y = oy; return v; }; let bv = cov(dest.x, dest.y);
      for (const [dx, dy] of DIRS) { const x = dest.x + dx, y = dest.y + dy; if (ok.has(K(x, y)) && (x !== ox || y !== oy)) { const v = cov(x, y); if (v > bv) { bv = v; dest = { x, y }; } } }
    }
    if (dest) moveUnit(S, u, dest.x, dest.y, R, ev);
  }
}
export function runTeam(S, team, ev) { for (const u of alive(S.battle).filter(u => u.team === team).sort((a, b) => a.id < b.id ? -1 : 1)) { if (S.battle.status !== 'active') break; if (u.hp > 0 && !u.done) { aiAct(S, u, ev); delete u.mv; } } }
