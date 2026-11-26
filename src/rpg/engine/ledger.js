// Dusk Saga 엔진 — 채팅별 기록(장부): 동료·가방·이야기로 넘길 메모. 정비·제작도 여기서 (순수 함수)
// L = { v:1, party:{defs,skills}, bag:[{id,name,kind,n,src,part,size,elem,grade,w?}], notes:[], log:[{at,text}], seen:[battle ids] }
import { copy } from "./rules.js";
import { makeWeapon, makeSpell, gradeName } from "./gear.js";
import { elemOfUnit, modelKey } from "./elements.js";
import { partName } from "./hunt.js";
import { BY_ID, STARTER, gatherDrops, partMaterial, ELEM_NAME } from "./materials.js";
import { dropsFor } from "./monmats.js";
import { questsFromBattle } from "./world.js";
import { SLOTS, armorLine, armorScore, groupOf, starterArmor, wearable } from "./armor.js";

export const freshLedger = () => ({ v: 1, party: { defs: {}, skills: {} }, bag: [], notes: [], log: [], seen: [] });
export const ledgerOf = (raw) => { try { const L = typeof raw === "string" ? JSON.parse(raw) : raw; return L && L.v === 1 ? L : freshLedger(); } catch { return freshLedger(); } };
const note = (L, t) => { L.notes.push(t); L.log.push({ at: Date.now(), text: t }); if (L.log.length > 80) L.log.splice(0, L.log.length - 80); if (L.notes.length > 12) L.notes.splice(0, L.notes.length - 12); };
let seq = 0; const nid = () => "i" + Date.now().toString(36) + (seq++).toString(36);
// 소재 등급: 몸이 클수록 좋은 소재(1칸 양질 · 2칸 희귀 · 3칸 영웅), 보스면 한 단계 위
const MAT = { 1: "양질", 2: "희귀", 3: "영웅" }, UP = { 양질: "정예", 희귀: "영웅", 영웅: "전설", 전설: "신화" };
export function addItem(L, it) { const same = L.bag.find((b) => b.kind === it.kind && b.name === it.name && !b.w); if (same && !it.w) same.n += it.n || 1; else L.bag.push({ id: nid(), n: 1, ...it }); }

/** 끝난 전투를 장부에 올린다: 부순 부위 → 소재, 동료 상태 저장, 결과 메모. 같은 전투는 한 번만 */
export function settle(L, S) {
  const B = S.battle; if (!B || B.status === "active") return false; const key = B.name + "#" + (S.start ? S.start.length : 0) + "#" + B.turn; if (L.seen.includes(key)) return false; L.seen.push(key); if (L.seen.length > 50) L.seen.shift();
  const got = []; let sd = (S.seed | 0) || 7; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x80000000; };
  for (const u of Object.values(B.units)) if (u.parts) for (const [k, p] of Object.entries(u.parts)) if (p.broken) {
    const d = S.defs[u.ref] || {}, size = u.sz || 1, grade = u.boss && UP[MAT[size]] ? UP[MAT[size]] : MAT[size], pm = partMaterial(d.name, k, modelKey(d), elemOfUnit(d) || ""); void partName; void grade;
    const ids = dropsFor(d.name, k, { boss: !!u.boss, rnd }); if (ids.length) for (const id of ids) { addMat(L, id, 1, elemOfUnit(d) || "", { part: k }); got.push(BY_ID[id].name); }
    else { addItem(L, { kind: "소재", name: pm.name, src: d.name, part: k, size, elem: elemOfUnit(d) || "", grade, model: modelKey(d), shape: pm.shape, pal: pm.pal, tags: pm.tags }); got.push(pm.name); }
  }
  // 부위가 없는 몬스터도 쓰러뜨리면 작은 소재 하나
  for (const u of Object.values(B.units)) if (u.hp <= 0 && !u.parts && u.brkMax && u.team !== "ally") { const d = S.defs[u.ref] || {}, ids = [...dropsFor(d.name, "body", { rnd }).slice(0, 1), ...dropsFor(d.name, "", { kill: true, boss: !!u.boss, rnd })]; if (ids.length) { ids.forEach((id, i) => { addMat(L, id, 1, elemOfUnit(d) || "", i === 0 ? { part: "body" } : {}); got.push(BY_ID[id].name); }); continue; } const pm = partMaterial(d.name, "body", modelKey(d), elemOfUnit(d) || ""); addItem(L, { kind: "소재", name: pm.name, src: d.name, part: "body", size: 1, elem: elemOfUnit(d) || "", grade: "보통", model: modelKey(d), shape: pm.shape, pal: pm.pal, tags: pm.tags }); got.push(pm.name); }
  // 채집: 이긴 전투면 지형·적에 따라 기본 소재 몇 개
  for (const id of gatherDrops(B.theme || "", Object.values(B.units).filter((u) => u.team !== "ally" && u.team !== "friend" && u.hp <= 0).map((u) => ({ human: !(S.defs[u.ref]?.tags || []).some((t) => /beast|insect|dragon|undead|golem|machine|slime|plant|aqua|reptile|spirit|demon/.test(t)) })), rnd, B.status === "victory")) { addMat(L, id); got.push(BY_ID[id].name); }
  keepParty(L, S); const qd = questsFromBattle(L, S); B.got = got.slice(0, 30); B.questDone = qd.map((q) => q.title + " 완료");
  const res = { victory: "승리", defeat: "패배", retreat: "후퇴" }[B.status] || B.status;
  note(L, `전투 「${B.name}」 ${res}` + (got.length ? ` — 얻은 소재: ${summarize(got)}` : ""));
  return true;
}
const summarize = (l) => { const m = new Map(); for (const x of l) m.set(x, (m.get(x) || 0) + 1); return [...m].map(([k, n]) => k + (n > 1 ? " ×" + n : "")).join(", "); };
/** 도감 소재 하나 넣기 */
export function addMat(L, id, n = 1, elem, extra = {}) { const b = BY_ID[id]; if (!b) return false; addItem(L, { kind: "소재", name: b.name, mid: id, n, grade: b.grade, elem: elem || b.elem, shape: b.shape, pal: b.pal, tags: b.tags, ...(b.src ? { src: b.src } : {}), ...extra }); return true; }
/** 처음 가방을 열 때 한 번: 기본 소재 조금 */
export function ensureStarter(L) { if (L.starter) return false; L.starter = true; for (const [id, n] of STARTER) addMat(L, id, n); return true; }
/** 기술: 직접 만들기(등급 예산 안에서 효과가 정해짐) · 익히기 · 잊기 · 기술 세트 저장·불러오기 */
export function createSkill(L, o, level = 10) { const s = makeSpell({ name: o.name, desc: o.desc, grade: o.grade, type: o.type === "passive" ? "passive" : o.type === "support" ? undefined : "art" }, level); if (!s) return null; s.tier = "own"; s.made = true; L.party.skills[s.id] = s; L.skillLib ||= []; if (!L.skillLib.includes(s.id)) L.skillLib.push(s.id); note(L, `새 기술: 「${s.name}」`); return s; }
export function learnSkill(L, id, sk) { const d = D(L, id); if (!d || !L.party.skills[sk] || d.skills.includes(sk) || d.skills.length >= 6) return false; d.skills.push(sk); note(L, `${d.name}: 「${L.party.skills[sk].name}」 익힘`); return true; }
export function forgetSkill(L, id, sk) { const d = D(L, id); if (!d || !d.skills.includes(sk)) return false; d.skills = d.skills.filter((k) => k !== sk); return true; }
export function saveSkillSet(L, id, name) { const d = D(L, id); if (!d) return false; d.skillSets ||= []; const nm = String(name || "세트 " + (d.skillSets.length + 1)).slice(0, 16), i = d.skillSets.findIndex((x) => x.name === nm), v = { name: nm, skills: d.skills.slice(), charm: d.charm?.name || "" }; if (i >= 0) d.skillSets[i] = v; else d.skillSets.push(v); if (d.skillSets.length > 8) d.skillSets.shift(); return true; }
export function loadSkillSet(L, id, i) { const d = D(L, id), v = d?.skillSets?.[i]; if (!v) return false; const keepCharm = d.charm?.added ? d.charm.skill : null; d.skills = v.skills.filter((k) => L.party.skills[k] || /^[a-z0-9]+$/.test(k)); if (keepCharm && !d.skills.includes(keepCharm)) d.skills.push(keepCharm); note(L, `${d.name}: 기술 세트 「${v.name}」`); return true; }
/** 방어구 입기·벗기·추천 장비 */
export function equipArmor(L, itemId, to) { const it = L.bag.find((b) => b.id === itemId && b.a), d = D(L, to); if (!it || !d) return false; if (!wearable(d, it.a)) return false; starterArmor(d); d.armor ||= {}; const old = d.armor[it.a.slot]; if (old) addItem(L, { kind: "방어구", name: old.name, a: old, n: 1, grade: old.grade, elem: old.elem, pal: old.pal }); d.armor[it.a.slot] = it.a; it.n--; if (it.n <= 0) L.bag.splice(L.bag.indexOf(it), 1); note(L, `${d.name}: ${it.a.name} 착용`); return true; }
export function unequipArmor(L, id, slot) { const d = D(L, id), a = d?.armor?.[slot]; if (!a) return false; addItem(L, { kind: "방어구", name: a.name, a, n: 1, grade: a.grade, elem: a.elem, pal: a.pal }); d.armor[slot] = null; note(L, `${d.name}: ${a.name} 벗음${Object.values(d.armor).some(Boolean) ? "" : " — 속옷 차림"}`); return true; }
/** 추천 장비: 가방에서 이 동료가 입을 수 있는 가장 좋은 방어구, 가장 센 무기를 주무기로 */
export function autoEquip(L, id) {
  const d = D(L, id); if (!d) return 0; starterArmor(d); d.armor ||= {}; let n = 0;
  for (const slot of Object.keys(SLOTS)) { const best = L.bag.filter((b) => b.a && b.a.slot === slot && wearable(d, b.a)).sort((a, b) => armorScore(b.a) - armorScore(a.a))[0]; if (best && armorScore(best.a) > armorScore(d.armor[slot])) { equipArmor(L, best.id, id); n++; } }
  const arms = d.weapons.map((w, i) => [w, i]).filter(([w]) => w.type !== "item" && w.type !== "staff"); const top = arms.sort((a, b) => (b[0].mt + (b[0].grade ?? 0) / 3) - (a[0].mt + (a[0].grade ?? 0) / 3))[0]; if (top && top[1] !== 0) { setMain(L, id, top[1]); n++; }
  return n;
}
export { groupOf };
/** 장신구(부적) 끼우기·빼기: 지속 효과 기술 하나 */
export function equipCharm(L, itemId, to) {
  const it = L.bag.find((b) => b.id === itemId && b.charm), d = D(L, to); if (!it || !d) return false; if (d.charm) unequipCharm(L, to);
  d.charm = { ...it.charm, grade: it.grade, elem: it.elem, pal: it.pal }; if (!d.skills.includes(it.charm.skill)) { d.skills.push(it.charm.skill); d.charm.added = true; }
  it.n--; if (it.n <= 0) L.bag.splice(L.bag.indexOf(it), 1); note(L, `${d.name}: ${it.name} 착용`); return true;
}
export function unequipCharm(L, id) { const d = D(L, id); if (!d?.charm) return false; const c = d.charm; if (c.added) d.skills = d.skills.filter((k) => k !== c.skill); delete d.charm; addItem(L, { kind: "장신구", name: c.name, charm: { skill: c.skill, name: c.name }, n: 1, shape: "charm", pal: c.pal, grade: c.grade, elem: c.elem }); note(L, `${d.name}: ${c.name} 뺌`); return true; }
/** 매 요청에 싣는 짧은 일행 장비(게임이 확정한 지금 상태). 정비하면 바로 다음 답부터 반영된다 */
export function partyLine(L, max = 6) {
  const ds = Object.values(L.party.defs || {}).filter((d) => d.name && !d.away).slice(0, max); if (!ds.length) return "";
  const w = (x) => x.name + (x.type === "item" ? (x.max ? ` ${x.uses}/${x.max}` : "") : `(${gradeName(x.grade ?? 6)}${x.elem ? "·" + (ELEM_NAME[x.elem] || x.elem) : ""})`);
  return "[Dusk Saga 일행 장비 — 게임이 확정한 지금 상태. 본문에서 무기·장신구를 말할 때 이것을 따른다. 수치는 쓰지 않는다]\n" + ds.map((d) => `- ${d.name}: ${d.weapons[0] ? "주무기 " + w(d.weapons[0]) : "맨손"}${d.weapons.length > 1 ? " / 예비 " + d.weapons.slice(1, 4).map(w).join(", ") : ""}${d.sub ? " / 보조 " + d.sub : ""}${d.charm ? " / 장신구 " + d.charm.name : ""}${d.armor ? " / 방어구 " + armorLine(d) : ""}${d.injury ? " / " + (d.injury.k === "wound" ? "중상" : "부상") : ""}`).join("\n");
}
/** 동료(레벨·장비·기술)를 장부에 저장 */
export function keepParty(L, S) { for (const d of Object.values(S.defs)) if (d.ally) { L.party.defs[d.id] = copy(d); for (const k of d.skills.concat(d.later || [])) if (S.skills[k]) L.party.skills[k] = copy(S.skills[k]); } }

// ── 정비: 수리 · 맨 앞으로(주무기) · 넘기기 · 버리기 · 꺼내 쓰기(가방 → 동료) · 넣기(동료 → 가방) ──
const D = (L, id) => L.party.defs[id];
export function repair(L, id, i) { const w = D(L, id)?.weapons[i]; if (!w || !w.max || w.uses === w.max) return false; w.uses = w.max; note(L, `${D(L, id).name}: ${w.name} 손질`); return true; }
export function setSub(L, id, i) { const d = D(L, id), w = d?.weapons[i]; if (!w || i === 0) return false; if (d.sub === w.name) { delete d.sub; note(L, `${d.name}: 보조무기 해제`); return true; } d.sub = w.name; note(L, `${d.name}: ${w.name}을(를) 보조무기로`); return true; }
export function setMain(L, id, i) { const d = D(L, id); if (!d || !d.weapons[i] || i === 0) return false; const [w] = d.weapons.splice(i, 1); d.weapons.unshift(w); note(L, `${d.name}: ${w.name}을(를) 주무기로`); return true; }
export function giveTo(L, id, i, to) { const a = D(L, id), b = D(L, to); if (!a || !b || a === b || !a.weapons[i] || b.weapons.length >= 5) return false; const [w] = a.weapons.splice(i, 1); b.weapons.push(w); note(L, `${a.name} → ${b.name}: ${w.name}`); return true; }
export function stash(L, id, i) { const d = D(L, id); if (!d || !d.weapons[i] || d.weapons.length <= 1) return false; const [w] = d.weapons.splice(i, 1); addItem(L, { kind: "장비", name: w.name, w, n: 1 }); note(L, `${d.name}: ${w.name}을(를) 가방에`); return true; }
export function equip(L, itemId, to) { const it = L.bag.find((b) => b.id === itemId), d = D(L, to); if (!it || !it.w || !d || d.weapons.length >= 5) return false; d.weapons.push(it.w); L.bag.splice(L.bag.indexOf(it), 1); note(L, `${d.name}: ${it.w.name} 장비`); return true; }
export function discard(L, itemId, n = 1) { const it = L.bag.find((b) => b.id === itemId); if (!it) return false; it.n -= n; if (it.n <= 0 || it.w) L.bag.splice(L.bag.indexOf(it), 1); note(L, `${it.name} 버림`); return true; }

// ── 제작 ──
const take = (L, ids) => { const out = []; for (const id of ids) { const it = L.bag.find((b) => b.id === id && b.kind === "소재" && b.n > 0); if (!it) return null; out.push(it); } for (const it of out) { it.n--; if (it.n <= 0) L.bag.splice(L.bag.indexOf(it), 1); } return out; };
const best = (mats) => { const order = ["보통", "양질", "정예", "희귀", "영웅", "전설", "신화"]; let g = mats.reduce((a, m) => Math.max(a, order.indexOf(m.grade)), 0); if (mats.length >= 3) g = Math.min(order.length - 1, g + 1); return order[g]; };
/** 소재로 새 무기: 종류·이름은 고르고, 등급은 가장 좋은 소재(셋 이상이면 한 단계 위), 속성은 소재 몬스터의 속성 */
export function forge(L, matIds, o) {
  const mats = L.bag.filter((b) => matIds.includes(b.id)); if (!mats.length) return null; const grade = best(mats), elem = o.elem ?? mats.find((m) => m.elem)?.elem ?? "";
  if (!take(L, matIds)) return null; const name = (o.name || (mats[0].src || "괴물") + " " + (o.label || "무기")).slice(0, 30);
  const w = makeWeapon({ name, kind: o.kind || "sword", grade, elem, desc: mats.map((m) => m.name).join(", ") + "로 만듦" }, 10);
  if (o.to && D(L, o.to) && D(L, o.to).weapons.length < 5) D(L, o.to).weapons.push(w); else addItem(L, { kind: "장비", name: w.name, w, n: 1 });
  note(L, `제작: ${w.name} (${gradeName(w.grade)}${elem ? " · " + elem : ""}) — 재료 ${mats.map((m) => m.name).join(", ")}`); return w;
}
/** 강화: 소재 하나로 무기 등급 +2칸(소재 등급보다 높게는 못 올린다), 다 쓴 무기는 수리까지 */
export function temper(L, id, i, matId) {
  const d = D(L, id), w = d?.weapons[i], m = L.bag.find((b) => b.id === matId && b.kind === "소재"); if (!w || !m) return false;
  const cap = makeWeapon({ name: "x", grade: m.grade }).grade; if ((w.grade ?? 0) >= cap) return false; take(L, [matId]);
  const nw = makeWeapon({ name: w.name, kind: w.kind || w.type, grade: Math.min(cap, (w.grade ?? 0) + 2), elem: w.elem || "" }, d.level); Object.assign(w, { grade: nw.grade, mt: nw.mt, hit: nw.hit, crit: nw.crit }); if (w.max) w.uses = w.max;
  note(L, `강화: ${d.name}의 ${w.name} → ${gradeName(w.grade)} (재료 ${m.name})`); return true;
}
/** 속성 입히기: 속성 있는 소재 하나로 무기 속성을 바꾼다 */
export function imbue(L, id, i, matId) {
  const d = D(L, id), w = d?.weapons[i], m = L.bag.find((b) => b.id === matId && b.kind === "소재"); if (!w || !m || !m.elem || w.elem === m.elem) return false; take(L, [matId]); w.elem = m.elem;
  note(L, `속성 입히기: ${d.name}의 ${w.name}에 ${m.elem} (재료 ${m.name})`); return true;
}
/** 다음 입력에 붙일 기록(한 번 쓰면 비운다) */
export function ledgerNote(L, clear = true) { if (!L.notes.length) return ""; const t = "[Dusk Saga 기록 — 이야기에 자연스럽게 반영]\n" + L.notes.map((x) => "- " + x).join("\n"); if (clear) L.notes = []; return t; }
/** 제작 가능한 장소인가(최근 대화에 대장간·공방 같은 말) */
export const WORKSHOP = /대장간|대장장이|공방|아틀리에|작업장|제작소|단조|용광로|연금술|연금 공방|정비소|무기점|forge|smithy|workshop|atelier/i;
