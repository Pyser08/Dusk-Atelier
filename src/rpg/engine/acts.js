// Dusk Saga 이야기 행동: 합체기, 포획·설득, 훔치기·줍기·탈출. options()에 덧붙는 항목(sagaOptions)과 실행 함수.
import { alive, canShoot } from "./board.js";
import { outcome, resolve, went } from "./combat.js";
import { clamp, dist, foe, log, roll, utags, arm } from "./rules.js";
import { atLoot, duoName, duoPartners, markDuo, onExit } from "./saga.js";

const BEASTLY = ["beast", "insect", "dragon", "reptile", "aqua", "slime", "plant"], MINDLESS = ["undead", "golem", "machine", "spirit"];
const ratio = (S, z) => z.hp / S.defs[z.ref].stats.hp;
const kindOf = (S, z) => { const t = utags(S.defs[z.ref]); return t.some((x) => MINDLESS.includes(x)) ? "none" : t.some((x) => BEASTLY.includes(x)) ? "beast" : "person"; };
/** 포획(짐승: 길들여 동료로 / 사람: 포로로) — 붙어 있고 HP 40% 이하, 보스는 25% 이하 */
export const catchRate = (S, u, z) => { const a = S.defs[u.ref].stats, b = S.defs[z.ref].stats; return clamp(Math.round(25 + (1 - ratio(S, z)) * 55 + (a.skl + a.lck - b.spd) * 2 - (z.boss ? 20 : 0)), 5, 90); };
/** 설득(사람만, 2칸 안, 한 명에게 한 번) — HP가 낮을수록, 행운이 높을수록, 판이 길어질수록 */
export const talkRate = (S, u, z) => { const a = S.defs[u.ref].stats; return clamp(Math.round(15 + (1 - ratio(S, z)) * 45 + a.lck * 2 + S.battle.turn * 2 - (z.boss ? 25 : 0) - (z.team === "third" ? 10 : 0)), 3, 85); };
export const stealRate = (S, u, z) => { const a = S.defs[u.ref].stats, b = S.defs[z.ref].stats; return clamp(Math.round(35 + (a.skl + a.spd - b.skl - b.spd) * 3 + (1 - ratio(S, z)) * 30), 10, 90); };

export function sagaOptions(S, u, from) {
  const B = S.battle, out = [], foes = alive(B).filter((z) => foe(z, u) && !z.rear && !z.rearOf), d = S.defs[u.ref], moved = !!from && (from.x !== u.x || from.y !== u.y), w = d.weapons[u.wi];
  if (u.team !== "ally") return out;
  for (const { bd, p } of duoPartners(S, u)) { const pw = S.defs[p.ref].weapons[p.wi]; const t = foes.filter((z) => arm(w) && arm(pw) && canShoot(S, u, w, z, moved) && canShoot(S, p, pw, z, false)); out.push({ kind: "duo", label: duoName(S, bd), small: S.defs[p.ref].name, with: p.id, targets: t.map((z) => z.id) }); }
  const low = foes.filter((z) => dist(z, u) === 1 && ratio(S, z) <= (z.boss ? 0.25 : 0.4) && kindOf(S, z) !== "none");
  if (low.length) out.push({ kind: "capture", label: "포획", targets: low.map((z) => z.id), rate: Object.fromEntries(low.map((z) => [z.id, catchRate(S, u, z)])) });
  const talk = foes.filter((z) => dist(z, u) <= 2 && kindOf(S, z) === "person" && !z.talked);
  if (talk.length) out.push({ kind: "persuade", label: "설득", targets: talk.map((z) => z.id), rate: Object.fromEntries(talk.map((z) => [z.id, talkRate(S, u, z)])) });
  const car = foes.filter((z) => z.carry && dist(z, u) === 1); if (car.length && !u.carry) out.push({ kind: "steal", label: "훔치기", targets: car.map((z) => z.id), rate: Object.fromEntries(car.map((z) => [z.id, stealRate(S, u, z)])) });
  if (atLoot(S, u) && !u.carry) out.push({ kind: "pick", label: "줍기", small: B.obj.item || "보물", targets: [u.id] });
  if (onExit(S, u) && (B.obj.type === "escape" || u.carry)) out.push({ kind: "escape", label: "탈출", targets: [u.id] });
  return out;
}

export function actDuo(S, u, z, pid, ev) {
  const B = S.battle, p = B.units[pid], hit = duoPartners(S, u).find((x) => x.p.id === pid); if (!p || !hit) return false;
  const n = duoName(S, hit.bd); markDuo(S, hit.bd); ev.push({ t: "duo", ids: [u.id, p.id], n, to: z.id }); log(S, "합체기 「" + n + "」!", "ph");
  u.duo = p.duo = true; try { resolve(S, u, z, null, ev); if (z.hp > 0 && u.hp > 0 && p.hp > 0) resolve(S, p, z, null, ev); } finally { delete u.duo; delete p.duo; }
  u.done = p.done = true; return true;
}
function leave(S, z) { const B = S.battle; delete B.units[z.id]; }
export function actCapture(S, u, z, ev) {
  const B = S.battle, d = S.defs[z.ref], r = catchRate(S, u, z), ok = roll(S) < r, mv = went(S, u); void mv; u.done = true;
  ev.push({ t: "catch", id: u.id, to: z.id, ok, rate: r });
  if (!ok) { log(S, S.defs[u.ref].name + ': ' + d.name + ' 포획 실패 (' + r + '%)'); return false; }
  const beast = kindOf(S, z) === "beast"; (B.caught ||= []).push({ ref: z.ref, name: d.name, tame: beast }); if (beast) { d.ally = true; d.tamed = true; d.cond = []; } else d.captive = true;
  log(S, S.defs[u.ref].name + ': ' + d.name + (beast ? ' 길들임 — 동료가 된다' : ' 포로로 붙잡음'), "ph"); leave(S, z); outcome(S, ev); return true;
}
export function actPersuade(S, u, z, ev) {
  const d = S.defs[z.ref], r = talkRate(S, u, z), ok = roll(S) < r; z.talked = true; u.done = true;
  ev.push({ t: "talk", id: u.id, to: z.id, ok, rate: r });
  if (!ok) { log(S, S.defs[u.ref].name + ': ' + d.name + ' 설득 실패 (' + r + '%)'); return false; }
  z.team = "friend"; z.ai = "charge"; z.boss = false; d.recruit = true; (S.battle.turned ||= []).push(d.name);
  log(S, S.defs[u.ref].name + ': ' + d.name + '을(를) 설득했다 — 일행 편에 선다', "ph"); outcome(S, ev); return true;
}
export function actSteal(S, u, z, ev) {
  const r = stealRate(S, u, z), ok = roll(S) < r; u.done = true; ev.push({ t: "steal", id: u.id, to: z.id, ok, rate: r });
  if (ok) { z.carry = false; u.carry = true; log(S, S.defs[u.ref].name + ': ' + (S.battle.obj.item || '보물') + ' 훔침!', "ph"); } else log(S, S.defs[u.ref].name + ': 훔치기 실패 (' + r + '%)');
  return ok;
}
export function actPick(S, u) { const B = S.battle; B.loot = null; u.carry = true; u.done = true; log(S, S.defs[u.ref].name + ': ' + (B.obj.item || '보물') + ' 주움', "ph"); }
export function actEscape(S, u, ev) {
  const B = S.battle; (B.out ||= []).push({ ref: u.ref, id: u.id, hp: u.hp, carry: !!u.carry }); log(S, S.defs[u.ref].name + ' 탈출', "ph"); ev.push({ t: "escape", id: u.id });
  if (u.rear && B.units[u.rear]) { const r = B.units[u.rear]; B.out.push({ ref: r.ref, id: r.id, hp: r.hp }); delete B.units[r.id]; }
  delete B.units[u.id]; outcome(S, ev);
}
/** 남은 아군을 AI에게 맡긴다(이번 턴만). 원래 ai 값은 되돌린다 */
import { runTeam } from "./ai.js";
export function autoAllies(S, ev) {
  const B = S.battle, l = alive(B).filter((u) => u.team === "ally" && !u.done && !u.rearOf), keep = new Map(l.map((u) => [u.id, u.ai])); for (const u of l) u.ai = "charge";
  try { runTeam(S, "ally", ev); } finally { for (const [id, ai] of keep) { const u = B.units[id]; if (u) { if (ai == null) delete u.ai; else u.ai = ai; u.done = true; } } }
}
