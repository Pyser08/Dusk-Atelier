// Dusk Saga 엔진 — Risu Tactics 저장(v2) 가져오기
import { OLD_NAMES, OLD_SKILL_IDS } from "./names.js";
import { copy } from "./rules.js";
import { ensureBase } from "./normalize.js";

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const nm = (t) => (typeof t === "string" && own(OLD_NAMES, t) ? OLD_NAMES[t] : t);
const sid = (k) => (own(OLD_SKILL_IDS, k) ? OLD_SKILL_IDS[k] : k);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const list = (v) => (Array.isArray(v) ? v : []);
// 총 이름처럼 이름을 열쇠로 쓰는 표도 같이 옮긴다
const keys = (o, f) => Object.fromEntries(Object.entries(obj(o)).map(([k, v]) => [f(k), v]));

function weapons(ws) { for (const w of list(ws)) if (w) w.name = nm(w.name); }
function defs(o) {
  for (const d of Object.values(obj(o))) {
    weapons(d.weapons); d.skills = list(d.skills).map(sid);
    if (d.later) d.later = list(d.later).map(sid);
  }
}
// 이름은 기본 목록에 있던 기술만 바꾼다(사용자가 만든 동명 기술은 그대로)
function skills(o) {
  const out = {};
  for (const [k, s] of Object.entries(obj(o))) { const id = sid(k); if (s.tier === "common") s.name = nm(s.name); s.id = id; out[id] = s; }
  return out;
}
function battle(B) {
  if (!B) return B;
  for (const u of Object.values(obj(B.units))) { if (u.cd) u.cd = keys(u.cd, sid); if (u.am) u.am = keys(u.am, nm); }
  return B;
}
function pack(o) { defs(o.defs); o.skills = skills(o.skills); battle(o.battle); return o; }
const packText = (t) => (typeof t === "string" && t ? JSON.stringify(pack(JSON.parse(t))) : t);

/** v2 저장을 v3으로. 원본은 건드리지 않는다. 이미 v3이면 복사본을 준다. */
export function migrateSave(raw) {
  const j = raw && typeof raw === "object" ? copy(raw) : null;
  if (!j || (j.v !== 2 && j.v !== 3) || !j.defs || !j.skills) throw new Error("Risu Tactics 또는 Dusk Saga 저장 형식이 아닙니다.");
  if (j.v === 3) return j;
  pack(j);
  j.start = packText(j.start); j.back = packText(j.back);
  for (const h of list(j.hist)) {
    if (typeof h.battle === "string") h.battle = JSON.stringify(battle(JSON.parse(h.battle)));
    for (const p of Object.values(obj(h.prog))) { weapons(p[3]); if (p[4]) p[4] = list(p[4]).map(sid); if (p[5]) p[5] = list(p[5]).map(sid); }
  }
  for (const k of ["start", "back"]) if (j[k] === undefined) delete j[k];
  j.v = 3; ensureBase(j);
  return j;
}
