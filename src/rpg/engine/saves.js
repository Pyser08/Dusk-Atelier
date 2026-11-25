// Dusk Saga 엔진 — 저장 전장·되감기·재시작 (순수 함수, DOM·api 없음)
import { arm, copy, log, objText } from "./rules.js";
import { waiting } from "./phase.js";
import { ensureBase } from "./normalize.js";

// a battle kept for later: its opening position with every sheet and skill it needs
export function mapOf(S) {
  const o = S.start ? JSON.parse(S.start) : S.battle ? copy({ defs: S.defs, skills: S.skills, battle: S.battle }) : null; if (!o || !o.battle) return null;
  const used = new Set(Object.values(o.battle.units).map(u => u.ref).concat(waiting(o.battle).map(w => w.ref))), defs = {}, skills = {};
  for (const id of used) { const d = o.defs[id]; if (!d) continue; defs[id] = d; for (const k of d.skills.concat(d.later || [])) if (o.skills[k]) skills[k] = o.skills[k]; }
  const B = o.battle; delete B.later; delete B.premise;
  return { name: B.name, defs, skills, battle: B };
}
// a replay borrows the saved sheets; when it is over the chat gets its own sheets and skills back, untouched
export function endReplay(S) { if (!S.back) return false; const o = JSON.parse(S.back); S.defs = o.defs; S.skills = o.skills; delete S.back; S.battle = null; S.start = null; return true; }
// play a kept battle here. Plain replay: everyone exactly as saved, and nothing earned carries over.
// grow: an ally this chat already has fights with the sheet it has now, and keeps what it earns.
export function loadMap(S, m, grow) {
  if (!m || !m.battle || !m.defs) throw new Error('전장 데이터가 아닙니다.');
  endReplay(S); ensureBase(S); m = copy(m);
  if (!grow) { S.back = JSON.stringify({ defs: S.defs, skills: S.skills }); for (const id in m.defs) delete S.defs[id]; }
  for (const k in m.skills || {}) if (!grow || !S.skills[k]) S.skills[k] = m.skills[k];
  for (const id in m.defs) { if (!(S.defs[id] && S.defs[id].ally)) S.defs[id] = m.defs[id]; const d = S.defs[id]; d.skills = d.skills.filter(k => S.skills[k]); if (d.later) d.later = d.later.filter(k => S.skills[k]); }
  const B = m.battle; B.turn = 1; B.phase = 'ally'; B.status = 'active';
  for (const u of Object.values(B.units)) {
    const d = S.defs[u.ref]; if (!d) { delete B.units[u.id]; continue; }
    u.hp = d.stats.hp; u.wi = Math.max(0, d.weapons.findIndex(arm)); u.done = false; u.cd = {}; u.rear = null; u.rearOf = null; u.gauge = 0; u.ow = false; delete u.am; delete u.mv; delete u.fought;
    if (u.team === 'ally') { d.ally = true; delete d.away; }
  }
  B.wait = waiting(B).filter(w => S.defs[w.ref]); for (const w of B.wait) if (w.team === 'ally') { S.defs[w.ref].ally = true; delete S.defs[w.ref].away; }
  S.battle = B;
  const used = new Set(Object.values(B.units).map(u => u.ref).concat(B.wait.map(w => w.ref))); for (const id of Object.keys(S.defs)) if (!S.defs[id].ally && !used.has(id)) delete S.defs[id];
  const held = new Set(); for (const d of Object.values(S.defs)) for (const k of d.skills.concat(d.later || [])) held.add(k);
  for (const k of Object.keys(S.skills)) if ((S.skills[k].tier || 'own') === 'own' && !held.has(k)) delete S.skills[k];
  S.log = []; S.sent = S.seq; log(S, '전투 시작: ' + B.name + ' (목표: ' + objText(B) + ')'); pulseReset(S);
  return S;
}
// keep the opening position so a lost battle can be retried
export function snapshot(S) { for (const d of Object.values(S.defs)) for (const w of d.weapons) delete w.am; S.start = JSON.stringify({ defs: S.defs, skills: S.skills, battle: S.battle, log: S.log }); }
export function restart(S) { if (!S.start) return false; const o = JSON.parse(S.start); S.defs = o.defs; S.skills = o.skills; S.battle = o.battle; S.log = o.log; S.sent = S.seq; pulseReset(S); return true; }
// ── 시간 되감기: rewind points. Each holds the board, the dice seed and everyone's level/exp/stats at that moment. ──
export const pulseMax = S => (S.pulseMax == null ? 3 : S.pulseMax);
export const progOf = d => [d.level, d.exp, Object.assign({}, d.stats), copy(d.weapons), d.skills.slice(), (d.later || []).slice()].concat(d.job ? [[d.job, d.cls, d.mtype, d.move]] : []);
export function mark(S, label) {
  const B = S.battle; if (!B) return; if (!S.hist) S.hist = [];
  const battle = JSON.stringify(B), last = S.hist[S.hist.length - 1];
  if (last && last.battle === battle && last.seed === S.seed) return;
  const prog = {}; for (const d of Object.values(S.defs)) if (d.ally) prog[d.id] = progOf(d);
  S.hist.push({ turn: B.turn, label, seq: S.seq, seed: S.seed, battle, prog });
  if (S.hist.length > 40) S.hist.shift();
}
export function pulseReset(S) { S.hist = []; S.pulse = pulseMax(S); if (S.battle) mark(S, '전투 시작'); }
export function pulse(S, i) {
  const h = S.hist && S.hist[i]; if (!h || !(S.pulse > 0)) return false;
  S.battle = JSON.parse(h.battle); S.seed = h.seed;
  for (const z of Object.values(S.battle.units)) if (!S.defs[z.ref]) { for (const o of Object.values(S.battle.units)) { if (o.rear === z.id) { o.rear = null; o.gauge = 0; } if (o.rearOf === z.id) o.rearOf = null; } delete S.battle.units[z.id]; }
  for (const id in h.prog) { const d = S.defs[id]; if (d) { d.level = h.prog[id][0]; d.exp = h.prog[id][1]; d.stats = Object.assign({}, h.prog[id][2]); if (h.prog[id][6]) [d.job, d.cls, d.mtype, d.move] = h.prog[id][6]; if (h.prog[id][3]) d.weapons = copy(h.prog[id][3]); if (h.prog[id][4]) { d.skills = h.prog[id][4].filter(k => S.skills[k]); if (d.later || h.prog[id][5].length) d.later = h.prog[id][5].slice(); } } }
  S.log = S.log.filter(x => x.n <= h.seq); S.hist.length = i + 1; S.pulse--;
  return true;
}
// a hand edit of level/exp/stats holds across rewinds
export function retro(S, id) { const d = S.defs[id]; if (d && d.ally) for (const h of S.hist || []) h.prog[id] = progOf(d); }
// a renamed unit or skill is renamed in what was already written to the log
export function rename(S, kind, id, from, to) {
  if (!from || !to || from === to) return;
  const keep = ['적군', '아군', '전투'].concat(Object.values(S.defs).filter(d => !(kind === 'unit' && d.id === id)).map(d => d.name), Object.values(S.skills).filter(s => !(kind === 'skill' && s.id === id)).map(s => s.name)).filter(n => n !== from && n.includes(from));
  const tok = i => String.fromCharCode(1) + i + String.fromCharCode(2);
  const fix = t => { keep.forEach((n, i) => { t = t.split(n).join(tok(i)); }); t = t.split(from).join(to); keep.forEach((n, i) => { t = t.split(tok(i)).join(n); }); return t; };
  for (const x of S.log) x.text = fix(x.text);
  if (S.start) try { const o = JSON.parse(S.start), pool = kind === 'unit' ? o.defs : o.skills; for (const x of o.log || []) x.text = fix(x.text); if (pool && pool[id]) pool[id].name = to; S.start = JSON.stringify(o); } catch (err) {}
}
