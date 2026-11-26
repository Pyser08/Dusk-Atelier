// Dusk Saga 엔진 — 사냥 규칙(S.hunt): 큰 몬스터의 부위·바라보는 방향·부위 파괴 (순수 함수, DOM·api 없음)
import { clamp, foe, log } from "./rules.js";
import { modelKey } from "./elements.js";

// 부위: 머리·몸통은 다 있고, 꼬리·날개는 몸에 따라. 기계는 이름만 다르다
const TAIL = new Set(["dragon", "wyvern", "drake", "chimera", "tiger", "hydra", "worm", "kraken", "lizard", "scorpion", "turtle"]);
const WING = new Set(["dragon", "wyvern", "chimera", "gargoyle", "eagle", "bat"]);
const NAME = { head: "머리", body: "몸통", legs: "다리", tail: "꼬리", wings: "날개" };
const RENAME = { tank: { head: "포탑", legs: "궤도" }, mech: { head: "조종석" }, robot: { head: "센서" }, spiderbot: { head: "센서" }, kraken: { tail: "촉수", legs: "다리" }, worm: { legs: "몸마디" }, treant: { head: "수관", legs: "뿌리" }, hydra: { head: "머리들" } };
const SHARE = { head: .3, legs: .35, tail: .3, wings: .3 };
// 노리기: 명중이 떨어지고 부위 피해가 두 배
export const AIM_HIT = { head: -15 }, AIM_HIT0 = -10, AIM_PART = 2;
// 무기 결: 둔기는 머리, 베기는 꼬리·날개, 찌르기는 다리(와 날개)에 부위 피해가 더 들어간다
const BLUNT = /망치|해머|메이스|철퇴|곤봉|몽둥이|모닝스타|도리깨|지팡이|hammer|mace|club|flail|maul/i;
export function cutOf(w) { if (!w) return ""; if (w.type === "tome" || w.magic) return "magic"; if (w.type === "claw" || BLUNT.test(w.name || "")) return "blunt"; if (w.type === "lance" || w.type === "bow" || /총|소총|권총|저격|산탄|gun|rifle|pistol|bow|활|석궁|창/i.test(w.name || "")) return "pierce"; return "cut"; }
export const CUT = { blunt: { head: 1.5 }, cut: { tail: 1.5, wings: 1.5 }, pierce: { legs: 1.5, wings: 1.25 }, magic: {} };
export const CUTN = { blunt: "타격", cut: "베기", pierce: "찌르기", magic: "마법" };
export const partName = (u, k, d) => (RENAME[modelKey(d)] || {})[k] || NAME[k] || k;
/** 큰 몬스터가 판에 오를 때 부위 내구를 붙인다 */
export function giveParts(u, d) {
  const m = modelKey(d); if (!m || (u.sz || 1) < 2) return;
  const ks = ["head", "legs"].concat(TAIL.has(m) ? ["tail"] : [], WING.has(m) || d.mtype === "fly" ? ["wings"] : []);
  u.parts = {}; for (const k of ks) { const n = Math.max(4, Math.round(d.stats.hp * SHARE[k])); u.parts[k] = { hp: n, max: n }; }
}
const mid = (u) => ({ x: u.x + ((u.sz || 1) - 1) / 2, y: u.y + ((u.sz || 1) - 1) / 2 });
/** 바라보는 방향(단위 벡터). 정해진 게 없으면 가장 가까운 상대 쪽 */
export function faceOf(S, u) {
  if (u.face) return u.face; const c = mid(u); let best = null;
  for (const z of Object.values(S.battle.units)) if (z.hp > 0 && foe(z, u)) { const p = mid(z), d = Math.abs(p.x - c.x) + Math.abs(p.y - c.y); if (!best || d < best.d) best = { d, p }; }
  if (!best) return [-1, 0]; const dx = best.p.x - c.x, dy = best.p.y - c.y; return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || -1, 0] : [0, Math.sign(dy)];
}
export function turnTo(u, to) { const c = mid(u), p = mid(to), dx = p.x - c.x, dy = p.y - c.y; if (dx || dy) u.face = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; }
/** 몸 칸(x,y)이 무슨 부위인가. 바라보는 쪽이 앞줄 */
export function partAt(S, d, x, y) {
  if (!d.parts) return "body"; const s = d.sz || 1, f = faceOf(S, d), c = mid(d), rx = x - c.x, ry = y - c.y, fw = rx * f[0] + ry * f[1], sd = Math.abs(rx * f[1] - ry * f[0]), P = d.parts, or = (...ks) => ks.find((k) => k === "body" || P[k]);
  if (s === 2) return fw > 0 ? or("head") : or("tail", "wings", "legs");
  if (fw > .5) return sd < .5 ? or("head") : or("legs");
  if (fw < -.5) return sd < .5 ? or("tail", "body") : or("legs");
  return sd < .5 ? "body" : or("wings", "legs");
}
const inR = (r, n) => n >= r[0] && n <= r[1];
/** a가 지금 자리·무기 사거리로 칠 수 있는 d의 몸 칸들 [{x,y,part,d}] */
export function aimCells(S, a, d, r) { if (!S.hunt || !d.parts) return []; const o = []; for (let j = 0; j < d.sz; j++) for (let i = 0; i < d.sz; i++) { const x = d.x + i, y = d.y + j, n = Math.abs(a.x - x) + Math.abs(a.y - y); if (inR(r, n)) o.push({ x, y, part: partAt(S, d, x, y), d: n }); } return o; }
const PREF = { head: 0, tail: 1, wings: 2, legs: 3, body: 4 };
/** 이번 공격이 맞는 칸: 노린 칸이 유효하면 그 칸, 아니면 가장 가까운 칸 */
export function hitCell(S, a, d, r) {
  const l = aimCells(S, a, d, r); if (!l.length) return null;
  if (a.aim) { const q = l.find((c) => c.x === a.aim[0] && c.y === a.aim[1]); if (q) return { ...q, aimed: true }; }
  l.sort((p, q) => p.d - q.d || PREF[p.part] - PREF[q.part] || p.y - q.y || p.x - q.x); return { ...l[0], aimed: false };
}
/** 부위 피해. 0이 되면 부서지고 효과가 붙는다 */
export function hurtPart(S, y, k, dmg, e, d) {
  const p = y.parts && y.parts[k]; if (!p || p.broken || dmg <= 0) return;
  p.hp = Math.max(0, p.hp - dmg); e.pdmg = dmg; e.part = k; if (p.hp > 0) return;
  p.broken = true; e.pbreak = k;
  if (k === "head") { y.stun = 1; delete y.tele; } else if (k === "legs") y.slow = 2; else if (k === "wings") y.grounded = true; else if (k === "tail") y.tailcut = true;
  const B = S.battle; (B.loot || (B.loot = [])).push(d.name + "의 " + partName(y, k, d));
}
export const BREAK_NOTE = { head: "기절", legs: "이동 −2", wings: "추락", tail: "공격 −3" };
/** 적 턴 시작 전: 기절한 몬스터는 이번 턴을 쉰다 */
export function stunned(S, u, d) { if (!u.stun) return false; u.stun = 0; u.done = true; log(S, d.name + ': 기절해서 움직이지 못함'); return true; }
export { clamp };

// ── 방향: 옆·뒤에서 치면 유리하다(모든 유닛) ──
/** a가 d의 앞·옆·뒤 어디에 있나 */
export function zoneOf(S, a, d) {
  const f = faceOf(S, d), c = mid(d), p = mid(a), vx = p.x - c.x, vy = p.y - c.y, l = Math.hypot(vx, vy) || 1, k = (vx * f[0] + vy * f[1]) / l;
  return k > .5 ? "front" : k < -.5 ? "back" : "side";
}
export const FLANK = { front: { hit: 0, crit: 0 }, side: { hit: 10, crit: 0 }, back: { hit: 20, crit: 10 } };
export const ZONEN = { front: "정면", side: "측면", back: "배후" };

// ── 브레이크: 몬스터의 버팀 게이지. 약점·머리·배후로 깎이고 0이면 쓰러져 한 턴 쉬며 받는 피해 ×1.5 ──
export const BRK = { 1: 3, 2: 5, 3: 7 };
export function giveBreak(u, d) { if (!modelKey(d)) return; u.brkMax = BRK[u.sz || 1] || 3; u.brk = u.brkMax; }
export function wearBreak(S, y, f, e) {
  if (!y.brkMax || y.down || y.hp <= 0) return; const n = (f.type > 1 ? 1 : 0) + (f.part === "head" ? 1 : 0) + (f.flank === "back" ? 1 : 0); if (!n) return;
  y.brk = Math.max(0, y.brk - n); e.stag = y.brk; if (y.brk > 0) return; y.down = 1; e.down = true; delete y.tele;
}
/** 적 턴: 쓰러졌던 몬스터는 이번 턴을 쉬고 게이지가 다시 찬다 */
export function downed(S, u, d) { if (!u.down) return false; u.down = 0; u.brk = u.brkMax; u.done = true; log(S, d.name + ': 쓰러져 있다가 일어남'); return true; }

// ── 밀치기: 둔기·창 근접 공격. 막히면 부딪힌 피해, 낮은 곳으로 떨어지면 낙하 피해 ──
export const pushes = (w, cut) => cut === "blunt" || (w && w.type === "lance");

// ── 공격 예고: 큰 몬스터가 앞쪽 범위를 노려 두고 다음 턴에 터뜨린다 ──
export function teleCells(S, u) {
  const B = S.battle, s = u.sz || 1, f = faceOf(S, u), out = [];
  for (let k = 1; k <= 3; k++) for (let j = 0; j < s; j++) {
    const x = f[0] > 0 ? u.x + s - 1 + k : f[0] < 0 ? u.x - k : u.x + j, y = f[1] > 0 ? u.y + s - 1 + k : f[1] < 0 ? u.y - k : u.y + j;
    if (x >= 0 && y >= 0 && x < B.w && y < B.h && B.map[y][x] !== "#") out.push([x, y]);
  }
  return out;
}

// ── 난이도(S.diff 0 쉬움 · 1 보통 · 2 어려움): 적이 사냥 규칙을 얼마나 아는가 ──
export const DIFFN = ["쉬움", "보통", "어려움"];
export const diffOf = (S) => (S.diff == null ? 1 : S.diff);

// ── 연계: 같은 턴에 같은 상대의 같은 부위를 이어 치면 명중·부위 피해가 오른다 ──
export function comboOf(S, d, part) { const c = S.battle.combo; return c && c.id === d.id && c.part === part && c.turn === S.battle.turn && c.phase === S.battle.phase ? c.n : 0; }
export function bumpCombo(S, d, part, hit) { const B = S.battle; if (!part || part === "body") return; const n = comboOf(S, d, part); B.combo = hit ? { id: d.id, part, n: Math.min(3, n + 1), turn: B.turn, phase: B.phase } : null; }

// ── 몬스터 행동 패턴: 꼬리 휩쓸기 · 포효 · 분노 ──
export const PAT = { sweep: "꼬리 휩쓸기", roar: "포효", rage: "분노" };
/** 몸 둘레 한 칸(맞닿은 칸)에 선 상대들 */
export function ringFoes(S, u) { const B = S.battle, s = u.sz || 1; return Object.values(B.units).filter((z) => z.hp > 0 && !z.rearOf && foe(z, u) && dist(z, u) === 1); }
function dist(a, b) { const p = a.sz || 1, q = b.sz || 1; return Math.max(0, a.x - (b.x + q - 1), b.x - (a.x + p - 1)) + Math.max(0, a.y - (b.y + q - 1), b.y - (a.y + p - 1)); }
