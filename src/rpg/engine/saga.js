// Dusk Saga 이야기 규칙: 관계(붙어 서면 보너스·합체기), 날씨·시간, 몸 상태(부상 이월·이야기/장기기억의 상태), 새 목표(호위·탈출·탈취·부위 파괴).
// 순수 함수. 장기기억이 없어도 모두 돌아가고(모델이 줄 형식으로 관계·상태를 줄 수 있다), 장기기억이 있으면 applyMemState로 더 채운다.
import { alive } from "./board.js";
import { armorMods } from "./armor.js";
import { FX, addFx } from "./status.js";
import { DIRS, K, SIDE, clamp, dist, foe, log, roll, utags } from "./rules.js";

// ── 관계 ──
export const BOND = {
  love: { n: "연인", m: { hit: 10, avo: 10, crit: 5 } }, fam: { n: "가족", m: { def: 2, res: 2, avo: 5 } }, friend: { n: "벗", m: { hit: 10, avo: 5 } },
  team: { n: "전우", m: { atk: 1, hit: 5, avo: 5 } }, rank: { n: "사제·주종", m: { hit: 15 } }, rival: { n: "라이벌", m: { atk: 2, crit: 10 } },
};
const TIE_G = { dating: "love", fiance: "love", spouse: "love", arranged: "love", fwb: "love", parent: "fam", sibling: "fam", twin: "fam", inlaw: "fam", relative: "fam", family: "fam", adopted: "fam", sworn: "fam", childhood: "friend", bestfriend: "friend", friend: "friend", party: "team", guild: "team", squad: "team", comrade: "team", coworker: "team", classmate: "team", club: "team", band: "team", senior: "rank", boss: "rank", master: "rank", lord: "rank", guard: "rank", mentor: "rank", guardian: "rank", familiar: "rank", rival: "rival", nemesis: "rival", ex: "rival" };
const BOND_RE = [[/연인|애인|부부|약혼|아내|남편|lover|dating|spouse/i, "love"], [/가족|형제|자매|남매|부모|자식|쌍둥이|의형제|family|sibling/i, "fam"], [/친구|소꿉|단짝|절친|friend/i, "friend"], [/전우|동료|파티|길드|부대|comrade|party/i, "team"], [/사제|스승|제자|주종|호위|주군|기사|상관|부하|mentor|master/i, "rank"], [/라이벌|숙적|경쟁|rival/i, "rival"]];
export const bondKind = (s) => { const t = String(s ?? "").trim().toLowerCase(); if (TIE_G[t]) return TIE_G[t]; if (BOND[t]) return t; for (const [re, g] of BOND_RE) if (re.test(t)) return g; return ""; };
const pk = (a, b) => [a, b].sort().join("|");
/** 관계 하나 더하기(같은 둘이면 바꾸지 않고 합체기 이름만 채움) */
export function addBond(S, a, b, g, duo) {
  if (!a || !b || a === b || !BOND[g]) return false; S.bonds ||= []; const o = S.bonds.find((x) => pk(x.a, x.b) === pk(a, b));
  if (o) { if (duo && !o.duo) o.duo = String(duo).slice(0, 20); return false; } S.bonds.push({ a, b, g, ...(duo ? { duo: String(duo).slice(0, 20) } : {}) }); return true;
}
export const bondsOf = (S, ref) => (S.bonds || []).filter((x) => x.a === ref || x.b === ref).map((x) => ({ ...x, other: x.a === ref ? x.b : x.a }));
// 붙어 선(라이벌은 2칸 안) 관계인 동료가 있으면 보너스. 같은 종류는 한 번만
function bondMods(S, u, m, fl) {
  if (u.duo) { m.atk += 3; m.hit += 20; m.crit += 10; fl.noCounter = true; }
  const B = S.battle; if (!S.bonds || !S.bonds.length) return; const seen = new Set();
  for (const bd of bondsOf(S, u.ref)) { if (seen.has(bd.g)) continue; const p = alive(B).find((z) => z.ref === bd.other && !foe(z, u)); if (!p || dist(p, u) > (bd.g === "rival" ? 2 : 1)) continue; seen.add(bd.g); for (const [k, v] of Object.entries(BOND[bd.g].m)) m[k] += v; }
}
/** 합체기를 쓸 수 있는 짝: 붙어 있고 둘 다 아직 행동 전, 이 판에서 아직 안 씀 */
export function duoPartners(S, u) {
  const B = S.battle; return bondsOf(S, u.ref).map((bd) => ({ bd, p: alive(B).find((z) => z.ref === bd.other && z.team === u.team && !z.done && !z.rearOf) })).filter(({ bd, p }) => p && dist(p, u) === 1 && !(B.duoUsed || []).includes(pk(bd.a, bd.b)));
}
export const duoName = (S, bd) => bd.duo || S.defs[bd.a].name + "·" + S.defs[bd.b].name + " 합격";
export const markDuo = (S, bd) => { (S.battle.duoUsed ||= []).push(pk(bd.a, bd.b)); };

// ── 날씨·시간 ──
export const WX = { clear: "맑음", rain: "비", snow: "눈", fog: "안개", storm: "폭풍", sand: "모래바람" }, TIME = { day: "낮", dusk: "황혼", night: "밤" };
const WXK = { 맑음: "clear", 비: "rain", 눈: "snow", 안개: "fog", 폭풍: "storm", 폭풍우: "storm", 모래바람: "sand" }, TIMEK = { 낮: "day", 아침: "day", 황혼: "dusk", 저녁: "dusk", 새벽: "dusk", 밤: "night" };
export const wxOf = (s) => WX[s] ? s : WXK[s] || ""; export const timeOf = (s) => TIME[s] ? s : TIMEK[s] || "";
export const WX_NOTE = { rain: "불 속성 약함·번개 물 강함, 활 명중 −10", snow: "얼음 강함·불 약함, 걷는 이 이동 −1", fog: "2칸 넘어 명중 −15", storm: "번개 강함, 활 명중 −20, 나는 이 이동 −2", sand: "모두 명중 −10", night: "2칸 넘어 명중 −10, 언데드·마물 공격 +2", dusk: "필살 +5" };
/** 판을 만들 때: 정해진 게 없으면 테마로 굴림 */
export function pickWeather(S, j) {
  const B = S.battle, th = B.theme || "";
  let w = wxOf(j && j.weather), t = timeOf(j && j.time);
  if (!w) { const r = roll(S); w = th === "snow" ? (r < 60 ? "snow" : "clear") : th === "desert" ? (r < 35 ? "sand" : "clear") : th === "cave" || th === "hall" ? "clear" : ["sea", "swamp"].includes(th) ? (r < 30 ? "rain" : r < 40 ? "fog" : "clear") : r < 10 ? "rain" : r < 16 ? "fog" : r < 19 ? "storm" : "clear"; }
  if (!t) { const r = roll(S); t = th === "night" ? "night" : th === "cave" || th === "hall" ? "day" : r < 75 ? "day" : r < 90 ? "dusk" : "night"; }
  if (B.indoor && w !== "clear") w = "clear"; B.wx = w; B.time = t;
  B.wxMove = w === "snow" ? { foot: -1, armor: -1, horse: -1 } : w === "storm" ? { fly: -2 } : null; if (!B.wxMove) delete B.wxMove;
}
export const wxText = (B) => [B.wx && B.wx !== "clear" ? WX[B.wx] : "", B.time && B.time !== "day" ? TIME[B.time] : ""].filter(Boolean).join(" · ");
export function wxElem(S, elem) { const w = S.battle && S.battle.wx; if (!elem || !w) return 1; if (w === "rain") return elem === "fire" ? 0.75 : elem === "thunder" || elem === "water" ? 1.2 : 1; if (w === "snow") return elem === "ice" ? 1.25 : elem === "fire" ? 0.85 : 1; if (w === "storm") return elem === "thunder" ? 1.3 : elem === "wind" ? 1.15 : 1; return 1; }
const BOWS = ["bow", "longbow", "crossbow"];
export function wxHit(S, w, ds) {
  const B = S.battle; let h = 0; if (!B) return 0; const bow = w && (BOWS.includes(w.type) || BOWS.includes(w.kind));
  if (B.wx === "rain" && bow) h -= 10; if (B.wx === "storm" && bow) h -= 20; if (B.wx === "fog" && ds >= 2) h -= 15; if (B.wx === "sand") h -= 10; if (B.time === "night" && ds >= 2) h -= 10; return h;
}
function envMods(S, u, m) { const B = S.battle, d = S.defs[u.ref]; if (B.time === "night" && utags(d).some((t) => t === "undead" || t === "demon")) m.atk += 2; if (B.time === "dusk") m.crit += 5; }

// ── 몸 상태 ──
// 이야기(줄 형식 `상태 피로`)·장기기억(현재 상태 글, 월경·임신 칸)·부상 이월에서 온다. 월경·임신은 약하게만 친다
export const COND = {
  injury: { n: "부상", hp: 0.8 }, wound: { n: "중상", hp: 0.6, fx: "weaken", t: 3 }, tired: { n: "피로", fx: "slow", t: 2 }, sick: { n: "몸살", fx: "weaken", t: 3, m: { hit: -5 } },
  drunk: { n: "취기", m: { hit: -10, avo: -5 } }, poison: { n: "중독", fx: "poison", t: 3 }, bleed: { n: "출혈", fx: "bleed", t: 2 }, fear: { n: "겁먹음", m: { hit: -5, avo: -5 } }, rage: { n: "격앙", m: { atk: 2, avo: -5 } },
  period: { n: "생리 중", m: { spd: -1, avo: -3 } }, period2: { n: "생리 첫날", m: { spd: -1, avo: -5, atk: -1 } }, pms: { n: "생리 전", m: { avo: -2 } },
  preg1: { n: "임신 초기", m: { hit: -3 } }, preg2: { n: "임신 중기", m: { def: -1, spd: -1 }, move: -1 }, preg3: { n: "임신 후기", m: { def: -2, spd: -2 }, move: -2 },
};
const COND_RE = [[/중상|큰 ?부상|골절|뼈가 부러|피투성이|빈사/, "wound"], [/부상|다친|다쳐|상처|베였|찔렸|멍|삐었/, "injury"], [/피로|지쳐|녹초|기진맥진|밤샘|잠을 ?못|탈진/, "tired"], [/몸살|감기|열이|고열|아프|병에|앓/, "sick"], [/술에|취한|취해|취기|숙취|만취/, "drunk"], [/중독|독에/, "poison"], [/출혈|피를 흘|피가 ?나/, "bleed"], [/겁에|공포|떨고|겁먹/, "fear"], [/격노|분노에|이성을 잃|광분/, "rage"]];
export function condsFromText(t) { const s = String(t ?? ""), out = []; for (const [re, k] of COND_RE) if (re.test(s) && !out.includes(k)) out.push(k); if (out.includes("wound")) return out.filter((k) => k !== "injury"); return out; }
export const condKey = (s) => (COND[s] ? s : Object.keys(COND).find((k) => COND[k].n === s) || condsFromText(s)[0] || "");
export function addCond(d, k) { if (!COND[k]) return false; d.cond ||= []; if (d.cond.includes(k)) return false; d.cond.push(k); return true; }
function condMods(S, u, m) { const d = S.defs[u.ref]; for (const k of d.cond || []) { const c = COND[k]; if (c && c.m) for (const [s, v] of Object.entries(c.m)) m[s] += v; } }
/** 판에 선 유닛에게 상태를 실제로 건다(HP·이동·턴 상태). 판을 불러온 뒤, 또는 장기기억 상태를 받은 뒤 부른다. 두 번 불러도 한 번만 */
export function applyConds(S) {
  const B = S.battle; if (!B) return;
  for (const u of Object.values(B.units)) {
    const d = S.defs[u.ref]; if (!d) continue; if (d.injury && d.ally && S.injury !== 0) addCond(d, d.injury.k);
    const list = (d.cond || []).filter((k) => COND[k]); if (!list.length) continue; u.condOn ||= [];
    for (const k of list) { if (u.condOn.includes(k)) continue; u.condOn.push(k); const c = COND[k]; if (c.hp) u.hp = Math.max(1, Math.min(u.hp, Math.ceil(d.stats.hp * c.hp))); if (c.fx && FX[c.fx]) addFx(S, u, c.fx, c.t); if (c.move) u.mvAdj = (u.mvAdj || 0) + c.move; }
    log(S, d.name + ': ' + list.map((k) => COND[k].n).join(', '));
  }
}
/** 전투가 끝나면 부상 이월(설정 S.injury, 기본 켬): 쓰러짐=중상 2판, HP 1/4 이하=부상 1판. 지난 부상은 한 판 줄인다 */
export function settleInjury(S) {
  const B = S.battle; if (!B || B.injured) return []; B.injured = true; const out = [];
  for (const u of Object.values(B.units)) { if (u.team !== "ally") continue; const d = S.defs[u.ref]; if (!d) continue;
    delete d.cond; if (S.injury === 0) { delete d.injury; continue; }
    if (d.injury) { d.injury.left--; if (d.injury.left <= 0) delete d.injury; }
    const nw = u.hp <= 0 ? { k: "wound", left: 2 } : u.hp <= d.stats.hp / 4 ? { k: "injury", left: 1 } : null;
    if (nw && (!d.injury || nw.left >= d.injury.left)) { d.injury = nw; out.push(d.name + ' ' + COND[nw.k].n); } }
  return out;
}

/** combat.mods가 부른다: 관계·날씨·몸 상태 */
export function sagaMods(S, u, m, fl) { if (!S.battle) return; armorMods(S, u, m, fl); bondMods(S, u, m, fl); envMods(S, u, m); condMods(S, u, m); }

// ── 장기기억 ──
/** st = memState(folder, names) 결과. 이름으로 판의 인물을 찾아 관계·상태를 더한다. 장기기억이 없으면 st가 비어 아무것도 안 함 */
export function applyMemState(S, st) {
  if (!st || !S.battle) return 0; let n = 0; const byName = (nm) => Object.values(S.defs).find((d) => d.name === nm || (d.name && nm && d.name.replace(/\s\d+$/, "") === nm));
  for (const [nm, c] of Object.entries(st.hair || {})) { const d = byName(nm); if (d && !d.hairSet) { d.hair = c; n++; } }
  for (const [nm, ks] of Object.entries(st.conds || {})) { const d = byName(nm); if (d) for (const k of ks) if (addCond(d, k)) n++; }
  for (const b of st.bonds || []) { const a = byName(b.a), c = byName(b.b), g = bondKind(b.kind); if (a && c && g && addBond(S, a.id, c.id, g)) n++; }
  applyConds(S); return n;
}

// ── 목표 ──
export const OBJ2 = { escort: "호위", escape: "탈출", steal: "탈취", hunt: "부위 파괴" };
const edgeOf = (B, side) => { const l = []; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if ((side === "L" && x === 0) || (side === "R" && x === B.w - 1) || (side === "T" && y === 0) || (side === "B" && y === B.h - 1)) l.push(K(x, y)); return l; };
/** 판을 세운 뒤: 탈출구(아군에게서 가장 먼 가장자리), 호위 대상, 보물 든 적 */
export function setupObjective(S, j) {
  const B = S.battle, t = B.obj.type; if (!OBJ2[t]) return;
  const us = Object.values(B.units), al = us.filter((u) => u.team === "ally");
  if (t === "escape" || t === "steal") { const cx = al.reduce((n, u) => n + u.x, 0) / al.length, cy = al.reduce((n, u) => n + u.y, 0) / al.length, c = [["L", cx], ["R", B.w - 1 - cx], ["T", cy], ["B", B.h - 1 - cy]].sort((a, b) => b[1] - a[1])[0][0]; B.exit = c; B.exits = edgeOf(B, c); B.out = []; }
  if (t === "steal") { const fs = us.filter((u) => SIDE[u.team] === 1), c = fs.find((u) => u.carry) || fs.find((u) => u.boss) || fs.sort((a, b) => S.defs[b.ref].level - S.defs[a.ref].level)[0]; if (c) { c.carry = true; B.obj.item = String((j && j.objective && j.objective.item) || "보물").slice(0, 20); } else B.obj.type = "rout"; }
  if (t === "escort") { const v = us.find((u) => u.vip) || us.find((u) => u.team === "friend"); if (v) { v.vip = true; v.ai = "hold"; } else B.obj.type = "survive"; B.obj.turns ||= 6; }
  if (t === "hunt") { if (!us.some((u) => SIDE[u.team] !== 0 && u.parts)) B.obj.type = "boss"; B.obj.need ||= 2; B.obj.turns ||= 8; if (B.obj.type === "boss" && !B.hadBoss) B.obj.type = "rout"; }
}
export const objText2 = (B) => { const o = B.obj; return OBJ2[o.type] + (o.type === "escort" ? " " + o.turns + "턴" : o.type === "hunt" ? " " + o.need + "곳 · " + o.turns + "턴" : o.type === "steal" ? " · " + (o.item || "보물") : ""); };
const brokenParts = (B) => Object.values(B.units).filter((u) => SIDE[u.team] !== 0 && u.parts).reduce((n, u) => n + Object.values(u.parts).filter((p) => p.broken).length, 0);
/** combat.outcome이 먼저 부른다. 'victory' | 'defeat' | null */
export function objOutcome(S) {
  const B = S.battle, t = B.obj.type; if (!OBJ2[t]) return null; const us = alive(B), allies = us.filter((u) => u.team === "ally");
  if (t === "escape") { if (!allies.length && (B.out || []).length) return "victory"; }
  if (t === "steal") { if ((B.out || []).some((o) => o.carry)) return "victory"; if (!allies.length) return "defeat"; }
  if (t === "escort") { const v = Object.values(B.units).find((u) => u.vip); if (v && v.hp <= 0) return "defeat"; if (allies.length && B.turn > B.obj.turns) return "victory"; }
  if (t === "hunt") { if (brokenParts(B) >= B.obj.need) return "victory"; if (B.turn > B.obj.turns) return "defeat"; }
  return null;
}
export const onExit = (S, u) => !!S.battle.exits && S.battle.exits.includes(K(u.x, u.y));
/** 보물을 든 이가 쓰러지면 그 칸에 떨어진다 */
export function dropLoot(S, u) { if (!u.carry) return; u.carry = false; S.battle.loot = [u.x, u.y]; log(S, (S.battle.obj.item || '보물') + '이(가) 떨어졌다'); }
export const atLoot = (S, u) => !!S.battle.loot && S.battle.loot[0] === u.x && S.battle.loot[1] === u.y;
export { DIRS, clamp };

// ── 전투 요약 ──
/** 재생하는 이벤트를 하나씩 넣는다(strike: 피해·격파 집계) */
export function tally(S, e) {
  const B = S.battle; if (!B || e.t !== "strike" || !e.dmg || e.from === e.to) return; const u = B.units[e.from]; if (!u || u.team !== "ally") return;
  const T = (B.tally ||= {}), r = (T[u.ref] ||= { dmg: 0, kills: 0 }); r.dmg += e.dmg; if (e.hp <= 0) r.kills++;
  if (!B.top || e.dmg > B.top.dmg) B.top = { dmg: e.dmg, name: S.defs[u.ref].name };
}
export function battleStats(S) {
  const B = S.battle; if (!B) return null; const T = Object.entries(B.tally || {}).sort((a, b) => b[1].kills * 30 + b[1].dmg - (a[1].kills * 30 + a[1].dmg));
  const parts = []; for (const u of Object.values(B.units)) if (u.parts) for (const [k, p] of Object.entries(u.parts)) if (p.broken) parts.push(k);
  return { mvp: T[0] && S.defs[T[0][0]] ? S.defs[T[0][0]].name + " · 격파 " + T[0][1].kills + " · 피해 " + T[0][1].dmg : "", top: B.top ? B.top.name + " " + B.top.dmg : "", parts: parts.length ? parts.length + "곳" : "",
    duo: (B.duoUsed || []).length ? B.duoUsed.length + "번" : "", got: [...(B.caught || []).map((c) => c.name + (c.tame ? "(길들임)" : "(포로)")), ...(B.turned || []).map((n) => n + "(합류)")].join(", ") };
}
