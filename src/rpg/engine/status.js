// Dusk Saga 엔진 — 상태이상·강화(u.fx = {키: 남은 턴}), 무기 결·속성의 부가 효과, 지원 기술 (S.hunt에서만, 순수 함수)
import { clamp, log, roll } from "./rules.js";

export const FX = {
  poison: { n: "독", bad: 1, dot: 8 }, burn: { n: "화상", bad: 1, dot: 6, atk: -2 }, bleed: { n: "출혈", bad: 1, dot: 6, heal: .5 },
  freeze: { n: "빙결", bad: 1, skip: 1 }, sleep: { n: "수면", bad: 1, skip: 1, wake: 1 }, silence: { n: "침묵", bad: 1 },
  slow: { n: "둔화", bad: 1, move: -2, spd: -3 }, weaken: { n: "약화", bad: 1, atk: -3 }, shred: { n: "방어 저하", bad: 1, def: -3, res: -3 }, blind: { n: "실명", bad: 1, hit: -20 },
  might: { n: "강화", atk: 3 }, guard: { n: "수호", def: 3, res: 3 }, haste: { n: "신속", move: 1, spd: 3 }, focus: { n: "집중", hit: 15, crit: 10 }, regen: { n: "재생", hot: 10 },
};
export const FXN = Object.fromEntries(Object.entries(FX).map(([k, v]) => [v.n, k]));
const TURNS = { freeze: 1, sleep: 2, silence: 2, slow: 2, weaken: 2, shred: 2, blind: 2, poison: 3, burn: 3, bleed: 3, might: 3, guard: 3, haste: 3, focus: 2, regen: 3 };

/** 전투 보정(side의 mods.m에 더한다): 공격 쪽이면 atk·hit·crit·spd, 막는 쪽이면 def·res·avo·spd */
export function fxMods(u, m) { if (!u.fx) return; for (const k of Object.keys(u.fx)) { const f = FX[k]; if (!f) continue; for (const s of ["atk", "def", "res", "hit", "crit", "spd"]) if (f[s]) m[s] = (m[s] || 0) + f[s]; } }
export const fxMove = (u) => (u.fx ? Object.keys(u.fx).reduce((n, k) => n + (FX[k]?.move || 0), 0) : 0);
export const silenced = (u) => !!(u.fx && u.fx.silence);
export function addFx(S, u, k, t) { if (!FX[k] || u.hp <= 0) return false; (u.fx || (u.fx = {}))[k] = Math.max(u.fx[k] || 0, t || TURNS[k] || 2); return true; }
export function clearBad(u) { if (!u.fx) return 0; let n = 0; for (const k of Object.keys(u.fx)) if (FX[k].bad) { delete u.fx[k]; n++; } return n; }

// ── 무기의 부가 효과: 결(종류)과 속성, 그리고 이름으로 정해지는 작은 개성(같은 종류라도 다르다) ──
const KIND = {
  katana: { bleed: 15, crit: 8 }, saber: { bleed: 10 }, rapier: { hit: 8, crit: 5 }, greatsword: { shred: 12 }, twinsword: { bleed: 12 }, dagger: { bleed: 15, crit: 5 }, needle: { poison: 25 },
  hammer: { freeze: 0, shred: 20, stun: 8 }, club: { stun: 10 }, greataxe: { shred: 15, bleed: 10 }, axe: { bleed: 10 }, scythe: { bleed: 20 }, whip: { slow: 25 }, chain: { slow: 20 },
  halberd: { shred: 10 }, pike: { shred: 8 }, lance: { shred: 8 }, trident: { bleed: 10 }, javelin: { slow: 10 }, staffpole: { stun: 8 },
  bow: { slow: 8 }, longbow: { crit: 8 }, shortbow: { hit: 8 }, crossbow: { shred: 12 }, chakram: { bleed: 12 }, shuriken: { bleed: 10, poison: 10 }, fan: { weaken: 15 },
  wand: { amp: 1.3 }, orb: { amp: 1.3 }, talisman: { weaken: 10, amp: 1.2 }, instrument: { silence: 20 }, tome: { amp: 1.2 }, magestaff: { amp: 1.4 },
  fist: { stun: 8 }, claw: { bleed: 12 }, shield: { stun: 10 }, sniper: { crit: 10 }, shotgun: { slow: 15 }, smg: { bleed: 8 }, rifle: { shred: 8 }, pistol: { hit: 5 }, beam: { burn: 15 },
};
const ELEM = { fire: { burn: 20 }, ice: { slow: 25, freeze: 8 }, thunder: { stun: 10 }, poison: { poison: 30 }, blood: { bleed: 25 }, dark: { weaken: 15, blind: 8 }, sound: { silence: 15 }, gravity: { slow: 30 }, earth: { shred: 12 }, light: { blind: 12 }, water: { slow: 10 }, wind: { haste_self: 0 }, plant: { poison: 12 }, arcane: { silence: 10 }, steel: { shred: 10 } };
const AFFIX = [{ n: "날 선", crit: 5 }, { n: "가벼운", hit: 6 }, { n: "무거운", atk: 2, hit: -4 }, { n: "독 묻은", poison: 15 }, { n: "톱니", bleed: 15 }, { n: "흡혈", drain: 15 }, { n: "깨뜨리는", shred: 15 }, { n: "울리는", stun: 6 }, { n: "균형 잡힌", hit: 3, crit: 3 }, { n: "평범한" }];
const h = (s) => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
/** 무기 하나의 부가 효과 묶음(이름이 같으면 늘 같다). 희귀 이상은 개성(affix)이 붙는다 */
export function weaponFx(w) {
  if (!w) return {}; const o = {}, add = (src, mul = 1) => { for (const [k, v] of Object.entries(src || {})) if (typeof v === "number" && k !== "amp") o[k] = (o[k] || 0) + Math.round(v * mul); };
  const kd = KIND[w.kind] || KIND[w.type] || {}; add(kd); add(ELEM[w.elem], kd.amp || 1);
  if ((w.grade ?? 0) >= 13) { const a = AFFIX[h(w.name) % AFFIX.length]; add(a); o.affix = a.n; }
  return o;
}
export const STN = { stun: "기절" };
/** 맞힌 뒤 부가 효과를 굴린다. 마법 무기는 마력, 그 밖엔 기술이 확률을 조금 올린다 */
export function inflict(S, x, y, w, e) {
  const fx = weaponFx(w), dx = S.defs[x.ref].stats, got = [];
  for (const k of ["poison", "burn", "bleed", "freeze", "slow", "weaken", "shred", "blind", "silence", "stun"]) {
    const p = fx[k]; if (!p) continue; const resist = (S.defs[y.ref].stats.res || 0) * (k === "silence" || k === "blind" ? 1.5 : 1), ch = clamp(p + Math.floor(((w && (w.magic || w.type === "tome")) ? dx.mag : dx.skl) / 4) - Math.floor(resist / 4) - (y.boss ? 5 : 0), 0, 70);
    if (roll(S) >= ch) continue; if (k === "stun") { if (!y.stun) { y.stun = 1; got.push("기절"); } } else if (addFx(S, y, k)) got.push(FX[k].n);
  }
  if (y.fx && y.fx.sleep) { delete y.fx.sleep; got.push("깨어남"); }
  if (got.length) e.fx = got; return got;
}

/** 턴 시작: 지속 피해·재생, 남은 턴 줄이기. 빙결·수면이면 이번 턴을 쉰다(true) */
export function tickFx(S, u, ev) {
  if (!u.fx) return false; const d = S.defs[u.ref], max = d.stats.hp; let skip = false;
  for (const k of Object.keys(u.fx)) {
    const f = FX[k]; if (!f) { delete u.fx[k]; continue; }
    if (f.dot && u.hp > 1) { const n = Math.min(u.hp - 1, Math.max(1, Math.ceil(max * f.dot / 100))); u.hp -= n; ev.push({ t: "burn", id: u.id, amt: n, hp: u.hp }); log(S, d.name + ": " + f.n + " " + n + " 피해 (" + u.hp + "/" + max + ")"); }
    if (f.hot && u.hp < max) { const n = Math.min(max - u.hp, Math.ceil(max * f.hot / 100)); u.hp += n; ev.push({ t: "heal", id: u.id, amt: n, hp: u.hp }); }
    if (f.skip) { skip = true; log(S, d.name + ": " + f.n + " — 움직이지 못함"); }
    if (--u.fx[k] <= 0) delete u.fx[k];
  }
  if (!Object.keys(u.fx).length) delete u.fx; return skip;
}

// ── 지원 기술: type "support", eff = 상태 키 | "heal" | "cleanse", on = "ally" | "foe", range ──
const WORD = [[/회복|치유|치료|heal|cure/i, "heal"], [/정화|해제|해독|cleanse|purify/i, "cleanse"], [/독(?!수리)|poison/i, "poison"], [/화상|불태|burn/i, "burn"], [/출혈|bleed/i, "bleed"], [/빙결|얼려|얼린|freeze/i, "freeze"], [/잠|수면|sleep/i, "sleep"], [/침묵|봉인|silence/i, "silence"], [/둔화|느리|slow/i, "slow"], [/약화|힘을 빼|weaken/i, "weaken"], [/방어 ?저하|갑옷을 깨|부식|shred/i, "shred"], [/실명|눈을 멀|blind/i, "blind"], [/강화|북돋|격려|might/i, "might"], [/수호|방벽|보호|guard|protect/i, "guard"], [/신속|가속|haste/i, "haste"], [/집중|조준|focus/i, "focus"], [/재생|regen/i, "regen"]];
export function supportFrom(text) { for (const [re, k] of WORD) if (re.test(text)) return k; return null; }
export const onFoe = (eff) => !!(FX[eff] && FX[eff].bad);
/** 지원 기술 쓰기. 성공 여부와 문구를 돌려준다 */
export function useSupport(S, u, z, sk, ev) {
  const d = S.defs[u.ref], zd = S.defs[z.ref], st = d.stats, eff = sk.eff, e = { t: "support", a: u.id, d: z.id, name: sk.name, eff }; let line = d.name + " [" + sk.name + "] → " + zd.name + ": ";
  if (eff === "heal") { const n = Math.min(zd.stats.hp - z.hp, 6 + Math.floor(st.mag * 1.2) + (sk.grade || 0) / 2 | 0); z.hp += n; e.amt = n; e.hp = z.hp; line += n + " 회복 (" + z.hp + "/" + zd.stats.hp + ")"; ev.push({ t: "heal", id: z.id, amt: n, hp: z.hp }); }
  else if (eff === "cleanse") { const n = clearBad(z); if (z.stun) { z.stun = 0; } line += n ? "상태이상 " + n + "개 해제" : "해제할 것이 없음"; }
  else if (onFoe(eff)) { const ch = clamp(65 + (st.mag - zd.stats.res) * 3 + (st.skl >> 1) - (z.boss ? 15 : 0), 20, 95); if (roll(S) < ch) { addFx(S, z, eff); e.ok = true; line += FX[eff].n + " (" + ch + "%)"; } else line += FX[eff].n + " 실패 (" + ch + "%)"; }
  else { addFx(S, z, eff); e.ok = true; line += FX[eff].n + " " + (TURNS[eff] || 2) + "턴"; }
  ev.push(e); log(S, line); u.cd[sk.id] = (sk.cd || 2) + 1; return line;
}
