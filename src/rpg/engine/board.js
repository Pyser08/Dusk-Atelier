// Dusk Saga 엔진 — 지형·이동·위협 범위·사격 시야 (순수 함수, DOM·api 없음)
import { COVER, DIRS, GUNS, INF, K, MT, SIDE, STATS, T0, TERRAIN, arm, dist, foe, gunOf, unK } from "./rules.js";

// ── board helpers ──
export const living = B => Object.values(B.units).filter(u => u.hp > 0);
// units standing on the board; a rear partner (guard stance) shares its lead's tile and is not targetable
export const alive = B => living(B).filter(u => !u.rearOf);
export function syncRears(B) { for (const u of living(B)) if (u.rear && B.units[u.rear]) { B.units[u.rear].x = u.x; B.units[u.rear].y = u.y; } }
// guard stance: the lead borrows a share of the rear partner's stats
export function pairBonus(S, u) {
  const o = {}; if (!u.rear || !S.battle.units[u.rear]) return o; const r = S.defs[S.battle.units[u.rear].ref].stats;
  for (const k of STATS.slice(1).sort((a, b) => r[b] - r[a]).slice(0, 3)) { const v = Math.min(4, Math.floor(r[k] / 5)); if (v) o[k] = v; }
  return o;
}
export function est(S, u) { const d = S.defs[u.ref].stats; if (!u.rear) return d; const b = pairBonus(S, u), o = { hp: d.hp }; for (const k of STATS.slice(1)) o[k] = d[k] + (b[k] || 0); return o; }
export const terr = (B, x, y) => TERRAIN[(B.map[y] || '')[x]] || T0;
export const uterr = (S, u) => (S.defs[u.ref].mtype === 'fly' ? T0 : terr(S.battle, u.x, u.y));
export function occMap(B) { const m = new Map(); for (const u of alive(B)) m.set(K(u.x, u.y), u); return m; }
export const unitAt = (B, x, y) => alive(B).find(u => u.x === x && u.y === y) || null;
// binary heap ordered by [cost, insertion]; ties pop first-in first-out so paths never depend on heap shape
export function heap() {
  const a = []; let seq = 0; const lt = (p, q) => p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]);
  return {
    push(c, x, y) { let i = a.push([c, seq++, x, y]) - 1; while (i) { const p = (i - 1) >> 1; if (!lt(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } },
    pop() {
      if (!a.length) return null; const top = a[0], last = a.pop();
      if (a.length) { a[0] = last; for (let i = 0;;) { let m = i; const l = 2 * i + 1; if (l < a.length && lt(a[l], a[m])) m = l; if (l + 1 < a.length && lt(a[l + 1], a[m])) m = l + 1; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
      return top;
    },
  };
}
export function reach(S, u, o) {
  o = o || {}; const B = S.battle, d = S.defs[u.ref], mt = MT[d.mtype] || 0, max = o.unlimited ? 999 : d.move, occ = occMap(B);
  const R = new Map([[K(u.x, u.y), { c: 0, p: null }]]), q = heap(); q.push(0, u.x, u.y);
  for (let n = q.pop(); n; n = q.pop()) {
    const [c, , x, y] = n; if (c > R.get(K(x, y)).c) continue;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) continue;
      const tc = terr(B, nx, ny).c[mt], nc = c + tc; if (tc >= INF || nc > max) continue;
      const z = occ.get(K(nx, ny)); if (z && foe(z, u) && !o.ignoreUnits) continue;
      const cur = R.get(K(nx, ny)); if (!cur || nc < cur.c) { R.set(K(nx, ny), { c: nc, p: K(x, y) }); q.push(nc, nx, ny); }
    }
  }
  return R;
}
export function pathTo(R, key) { const p = []; while (key != null && R.has(key)) { const [x, y] = unK(key); p.unshift({ x, y }); key = R.get(key).p; } return p; }
export function stops(S, u, R) { const occ = occMap(S.battle); return [...R.keys()].filter(k => { const z = occ.get(k); return !z || z.id === u.id; }); }
export function ranges(S, d) { let lo = 9, hi = 0; for (const w of d.weapons) if (arm(w)) { const r = wr(S, w); lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]); } return hi ? [lo, hi] : null; }
// every tile a unit could hit after moving (the red zone)
export function threat(S, u, R) {
  const B = S.battle, ws = S.defs[u.ref].weapons.filter(arm), out = new Set(); if (!ws.length) return out;
  for (const k of stops(S, u, R || reach(S, u))) {
    const [x, y] = unK(k), here = { x, y }, moved = x !== u.x || y !== u.y;
    for (const w of ws) {
      if (S.xcom && gunOf(w) === 'sniper' && moved) continue; const r = wr(S, w);
      for (let dy = -r[1]; dy <= r[1]; dy++) for (let dx = -r[1]; dx <= r[1]; dx++) {
        const m = Math.abs(dx) + Math.abs(dy), nx = x + dx, ny = y + dy; if (m < r[0] || m > r[1] || nx < 0 || ny < 0 || nx >= B.w || ny >= B.h || B.map[ny][nx] === '#' || out.has(K(nx, ny))) continue;
        if (!S.xcom || m < 2 || sees(B, here, { x: nx, y: ny })) out.add(K(nx, ny));
      }
    }
  }
  return out;
}
export function danger(S, team) { const out = new Set(); for (const u of alive(S.battle)) if (team === 'enemy' ? SIDE[u.team] !== 0 : u.team === team) { const d = S.defs[u.ref]; const R = u.ai === 'guard' ? new Map([[K(u.x, u.y), { c: 0, p: null }]]) : reach(S, u); for (const k of threat(S, u, R)) out.add(k); } return out; }
export const gun = (S, w) => (S.xcom ? gunOf(w) : null);
export const wr = (S, w) => { const g = gun(S, w); return g ? GUNS[g].r : [w.rmin, w.rmax]; };
export const ammo = (S, u, w) => { const g = gun(S, w), n = g && u && u.am ? u.am[w.name] : null; return g ? (n == null ? GUNS[g].mag : n) : INF; };
export function line(B, a, b) {
  let x = a.x, y = a.y; const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1; let err = dx - dy;
  while (x !== b.x || y !== b.y) { const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } if ((x !== b.x || y !== b.y) && (B.map[y] || '')[x] === '#') return false; }
  return true;
}
export const sees = (B, a, b) => line(B, a, b) || line(B, b, a);
// may this weapon be used on that target from where the unit stands
export function canShoot(S, u, w, z, moved) {
  const ds = dist(u, z), r = wr(S, w); return ds >= r[0] && ds <= r[1] && fireOk(S, u, w, z, moved);
}
// everything but range: rounds in the magazine, a sniper rifle that has not moved, no wall in the way
export function fireOk(S, u, w, z, moved) {
  if (!S.xcom) return true; const g = gunOf(w); if (g && (ammo(S, u, w) <= 0 || (g === 'sniper' && moved))) return false;
  return dist(u, z) < 2 || sees(S.battle, u, z);
}
// cover is whatever stands on the tile next to the target on the shooter's side
export function coverFrom(S, D, A) {
  const B = S.battle, at = (x, y) => (x < 0 || y < 0 || x >= B.w || y >= B.h ? 0 : COVER[B.map[y][x]] || 0); if (S.defs[D.ref].mtype === 'fly') return { v: 0 };
  const sx = Math.sign(A.x - D.x), sy = Math.sign(A.y - D.y), v = Math.max(sx ? at(D.x + sx, D.y) : 0, sy ? at(D.x, D.y + sy) : 0);
  return { v, flank: !v && DIRS.some(([dx, dy]) => at(D.x + dx, D.y + dy)) };
}
export const coverAt = (S, u, foes) => (foes.length ? foes.reduce((n, f) => n + coverFrom(S, u, f).v, 0) / foes.length : 0);
export const canWatch = (S, u, w, moved) => !!S.xcom && arm(w) && wr(S, w)[1] >= 2 && ammo(S, u, w) > 0 && !(gunOf(w) === 'sniper' && moved);
export const standable = (S, u, x, y) => terr(S.battle, x, y).c[MT[S.defs[u.ref].mtype] || 0] < INF;
// ── encounters ──
export function nearestFree(S, def, x, y, taken) {
  const B = S.battle, mt = MT[def.mtype] || 0, seen = new Set([K(x, y)]), q = [[x, y]];
  while (q.length) { const [cx, cy] = q.shift(); if (terr(B, cx, cy).c[mt] < INF && !taken.has(K(cx, cy))) return [cx, cy]; for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, k = K(nx, ny); if (nx >= 0 && ny >= 0 && nx < B.w && ny < B.h && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } }
  return null;
}
