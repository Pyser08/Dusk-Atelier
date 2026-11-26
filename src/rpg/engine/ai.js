// Dusk Saga 엔진 — 적 AI (순수 함수, DOM·api 없음)
import { elemOfUnit } from "./elements.js";
import { canUse } from "./classes.js";
import { alive, ammo, canShoot, canWatch, coverAt, gun, pathTo, reach, stops, uterr, wr, terr } from "./board.js";
import { DIRS, K, arm, clamp, dist, foe, log, unK } from "./rules.js";
import { PAT, diffOf, downed, ringFoes, stunned, teleCells, zoneOf } from "./hunt.js";
import { modelKey } from "./elements.js";
import { FX, onFoe, silenced, useSupport } from "./status.js";
import { actReload, explode, fall, forecast, knock, moveUnit, outcome, resolve, went } from "./combat.js";

export function aiAct(S, u, ev) {
  const B = S.battle, d = S.defs[u.ref], foes = alive(B).filter(z => foe(z, u)), mates = alive(B).filter(z => !foe(z, u) && z.id !== u.id);
  u.done = true; if (!foes.length) return;
  const R = reach(S, u), ox = u.x, oy = u.y, owi = u.wi, ai = u.ai || 'charge';
  const cand = ai === 'guard' ? [K(ox, oy)] : stops(S, u, R);
  if (S.hunt && trySupport(S, u, R, cand, mates, foes, ev)) return;
  const staff = d.weapons.findIndex(w => w.type === 'staff');
  if (staff >= 0) {
    let bh = null; u.wi = staff; const w = d.weapons[staff];
    for (const k of cand) { const [x, y] = unK(k); for (const z of mates) { const miss = S.defs[z.ref].stats.hp - z.hp, ds = Math.abs(z.x - x) + Math.abs(z.y - y); if (miss >= 5 && ds >= w.rmin && ds <= w.rmax && (!bh || miss > bh.miss)) bh = { miss, x, y, z }; } }
    if (bh && (bh.miss * 2 >= S.defs[bh.z.ref].stats.hp || !d.weapons.some(arm))) { if (moveUnit(S, u, bh.x, bh.y, R, ev)) heal(S, u, bh.z, ev); return; }
    u.wi = owi;
  }
  let best = null; const hunt0 = S.hunt; if (hunt0 && diffOf(S) === 0) S.hunt = false; // 쉬움: 방향·부위를 모르는 채로 고른다
  try { for (const k of cand) {
    const [x, y] = unK(k); u.x = x; u.y = y; const cover = uterr(S, u).avo / 10 - R.get(k).c * 0.01 - (uterr(S, u).burn && elemOfUnit(d) !== 'fire' ? 12 : 0) + (S.xcom ? coverAt(S, u, foes) / 10 : 0);
    d.weapons.forEach((w, i) => {
      if (!arm(w) || !canUse(d, w)) return; u.wi = i;
      for (const f of foes) {
        if (!canShoot(S, u, w, f, x !== ox || y !== oy)) continue;
        const fc = forecast(S, u, f, null);
        const sc = Math.min(f.hp, fc.a.total) * fc.a.hit / 100 * 2 + (fc.a.dual ? fc.a.dual.dmg * fc.a.dual.hit / 100 : 0) - (fc.d.dual ? fc.d.dual.dmg * fc.d.dual.hit / 100 : 0) + (fc.a.total >= f.hp ? 40 * fc.a.hit / 100 : 0) + (S.hunt && diffOf(S) === 2 ? (fc.a.flank === 'back' ? 6 : fc.a.flank === 'side' ? 3 : 0) + (f.hp <= fc.a.total * 2 ? 4 : 0) : 0) - (fc.d.can ? Math.min(u.hp, fc.d.total) * fc.d.hit / 100 : 0) + cover;
        if (!best || sc > best.sc) best = { sc, x, y, wi: i, f };
      }
    });
  }
  } finally { S.hunt = hunt0; }
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
      if ((u.sz || 1) === 1 && (f.sz || 1) === 1 && full.has(K(f.x, f.y))) { const k = K(f.x, f.y); if (tk == null || full.get(k).c < full.get(tk).c) tk = k; continue; }
      const s = u.sz || 1; for (let dy = -hi - s + 1; dy <= hi + (f.sz || 1) - 1; dy++) for (let dx = -hi - s + 1; dx <= hi + (f.sz || 1) - 1; dx++) { const x = f.x + dx, y = f.y + dy, k = K(x, y); if (dist({ x, y, sz: s }, f) <= hi && dist({ x, y, sz: s }, f) >= 1 && x >= 0 && y >= 0 && x < B.w && y < B.h && full.has(k) && (tk == null || full.get(k).c < full.get(tk).c)) tk = k; }
    }
    if (tk == null) return;
    const ok = new Set(stops(S, u, R)); let dest = null;
    for (const p of pathTo(full, tk)) { const k = K(p.x, p.y); if (ok.has(k) && (!dest || !(terr(B, p.x, p.y).burn && d.mtype !== 'fly'))) dest = p; else if (!R.has(k)) break; }
    if (dest && S.xcom) {
      const cov = (x, y) => { u.x = x; u.y = y; const v = coverAt(S, u, foes); u.x = ox; u.y = oy; return v; }; let bv = cov(dest.x, dest.y);
      for (const [dx, dy] of DIRS) { const x = dest.x + dx, y = dest.y + dy; if (ok.has(K(x, y)) && (x !== ox || y !== oy)) { const v = cov(x, y); if (v > bv) { bv = v; dest = { x, y }; } } }
    }
    if (dest) moveUnit(S, u, dest.x, dest.y, R, ev);
  }
}
export function runTeam(S, team, ev) { for (const u of alive(S.battle).filter(u => u.team === team).sort((a, b) => a.id < b.id ? -1 : 1)) { if (S.battle.status !== 'active') break; if (u.hp > 0 && !u.done) { const d = S.defs[u.ref]; if (u.down && downed(S, u, d)) continue; if (u.stun && stunned(S, u, d)) continue; if (u.tcd) u.tcd--; if (u.tele) { blast(S, u, ev); continue; } if (S.hunt && pattern(S, u, ev)) { delete u.mv; continue; } aiAct(S, u, ev); delete u.mv; if (S.hunt && (u.sz || 1) > 1 && u.hp > 0 && !u.tcd && !(u.parts && u.parts.head && u.parts.head.broken) && S.battle.status === 'active') { const c = aimTele(S, u); if (c.length) { u.tele = { cells: c, n: teleName(d) }; log(S, d.name + ': ' + u.tele.n + ' 준비 — 다음 턴에 앞쪽 ' + c.length + '칸을 덮친다', 'tele'); ev.push({ t: 'tele', id: u.id, cells: c }); } } } } }

// 공격 예고: 브레스(멀리 뿜는 몸) 아니면 내려찍기. 예고한 칸에 선 상대가 모두 맞는다
const BREATH = new Set(["dragon", "wyvern", "drake", "hydra", "chimera", "eye", "flame", "storm", "crystal", "drone", "robot", "turret", "tank", "mech", "spiderbot"]);
export const teleName = (d) => (BREATH.has(modelKey(d)) ? (/robot|turret|tank|mech|spiderbot|drone/.test(modelKey(d)) ? "일제 포격" : "브레스") : "대지 강타");
export function blast(S, u, ev) {
  const B = S.battle, d = S.defs[u.ref], st = d.stats, set = new Set(u.tele.cells.map(([x, y]) => K(x, y))), hit = [], dead = [], magic = d.weapons.some(w => w && (w.magic || w.type === 'tome'));
  const be = { t: 'blast', id: u.id, n: u.tele.n, cells: u.tele.cells, hits: [] }; ev.push(be); delete u.tele; u.tcd = 2; u.done = true;
  for (const z of alive(B)) { if (!foe(z, u) || !cellsOf(z).some(([x, y]) => set.has(K(x, y)))) continue; const zs = S.defs[z.ref].stats, n = clamp(Math.floor((Math.floor((magic ? st.mag : st.str) * 1.5) + 6 - (magic ? zs.res : zs.def)) * (diffOf(S) === 0 ? .7 : 1)), 1, z.hp); z.hp -= n; hit.push(S.defs[z.ref].name + ' ' + n + (z.hp <= 0 ? ' 격파' : '')); if (z.hp <= 0) dead.push(z); be.hits.push({ to: z.id, dmg: n, hp: z.hp }); }
  log(S, d.name + ': ' + teleName(d) + ' — ' + (hit.length ? hit.join(', ') : '아무도 맞지 않음'));
  for (const z of dead) fall(S, z, ev);
  for (const [x, y] of be.cells) if ((B.map[y] || '')[x] === 'x') log(S, '폭약통' + explode(S, x, y, ev).replace(/^, /, ' '));
  outcome(S, ev);
}
const cellsOf = (z) => { const s = z.sz || 1, o = []; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) o.push([z.x + i, z.y + j]); return o; };

// 예고 범위: 어려움은 상대를 가장 많이 덮는 쪽으로 몸을 돌려 노린다
function aimTele(S, u) {
  if (diffOf(S) < 2) return teleCells(S, u); const f0 = u.face; let best = null;
  for (const f of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { u.face = f; const c = teleCells(S, u), set = new Set(c.map(([x, y]) => K(x, y))), n = alive(S.battle).filter((z) => foe(z, u) && cellsOf(z).some(([x, y]) => set.has(K(x, y)))).length; if (!best || n > best.n) best = { n, f, c }; }
  if (best.n) { u.face = best.f; return best.c; } u.face = f0; return teleCells(S, u);
}
// 몬스터 행동 패턴. 행동했으면 true(이번 턴 끝)
export function pattern(S, u, ev) {
  const d = S.defs[u.ref], big = (u.sz || 1) > 1, df = diffOf(S); if (!u.brkMax) return false; const max = d.stats.hp;
  if (big && !u.rage && u.hp <= max / 2) { u.rage = true; log(S, d.name + ': ' + PAT.rage + ' — 공격 +3', 'pat'); ev.push({ t: 'pattern', id: u.id, n: PAT.rage, hits: [] }); }
  const ring = ringFoes(S, u);
  if (big && df > 0 && !u.roared && u.hp <= max * .75) {
    const near = alive(S.battle).filter((z) => foe(z, u) && !z.rearOf && dist(z, u) <= 2); if (near.length >= (df === 2 ? 1 : 2)) {
      u.roared = true; u.done = true; for (const z of near) z.stun = 1; log(S, d.name + ': ' + PAT.roar + ' — ' + near.map((z) => S.defs[z.ref].name).join(', ') + ' 다음 턴 쉼', 'pat'); ev.push({ t: 'pattern', id: u.id, n: PAT.roar, hits: near.map((z) => ({ to: z.id, dmg: 0, hp: z.hp })) }); return true;
    }
  }
  const tail = u.parts && u.parts.tail && !u.parts.tail.broken;
  if (big && tail && ring.length && (ring.length >= (df === 0 ? 3 : 2) || (df > 0 && ring.some((z) => zoneOf(S, z, u) === 'back')))) {
    u.done = true; const e = { t: 'pattern', id: u.id, n: PAT.sweep, hits: [] }; ev.push(e); let line = d.name + ': ' + PAT.sweep + ' —';
    for (const z of ring) { const zs = S.defs[z.ref].stats, n = clamp(Math.floor(d.stats.str * 1.1) + 3 + (u.rage ? 3 : 0) - zs.def, 1, z.hp); z.hp -= n; e.hits.push({ to: z.id, dmg: n, hp: z.hp }); line += ' ' + S.defs[z.ref].name + ' ' + n; if (z.hp <= 0) { line += ' 격파'; fall(S, z, ev); } else if ((z.sz || 1) === 1) line += knock(S, u, z, ev); }
    log(S, line, 'pat'); outcome(S, ev); return true;
  }
  return false;
}

// 지원 기술: 다친 동료 치료 > 해로운 상태 풀기 > 강한 상대 약화 > 싸우러 가는 동료 강화. 쉬움은 반쯤만 쓴다
function trySupport(S, u, R, cand, mates, foes, ev) {
  const d = S.defs[u.ref]; if (silenced(u)) return false; const sks = d.skills.map((k) => S.skills[k]).filter((k) => k && k.type === "support" && !(u.cd[k.id] > 0)); if (!sks.length) return false;
  if (diffOf(S) === 0 && Math.random() < .5) return false; const us = mates.concat([u]), atk = (z) => { const st = S.defs[z.ref].stats; return Math.max(st.str, st.mag); };
  const pick = (sk) => {
    if (sk.eff === "heal") return us.filter((z) => z.hp < S.defs[z.ref].stats.hp * .6).sort((a, b) => a.hp / S.defs[a.ref].stats.hp - b.hp / S.defs[b.ref].stats.hp);
    if (sk.eff === "cleanse") return us.filter((z) => z.stun || (z.fx && Object.keys(z.fx).some((k) => FX[k]?.bad)));
    if (onFoe(sk.eff)) return foes.filter((z) => !(z.fx && z.fx[sk.eff])).sort((a, b) => atk(b) - atk(a));
    return us.filter((z) => !(z.fx && z.fx[sk.eff]) && foes.some((f) => dist(f, z) <= 3)).sort((a, b) => atk(b) - atk(a));
  };
  for (const sk of sks) for (const z of pick(sk)) {
    const k = cand.filter((c) => { const [x, y] = unK(c), n = dist({ x, y, sz: u.sz }, z); return n >= sk.range[0] && n <= sk.range[1]; }).sort((a, b) => R.get(a).c - R.get(b).c)[0];
    if (k == null) continue; const [x, y] = unK(k); if (!moveUnit(S, u, x, y, R, ev)) return true; useSupport(S, u, z, sk, ev); u.done = true; return true;
  }
  return false;
}
