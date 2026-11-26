// Dusk Saga 세계: 시대·배경에 맞는 길드(랭크·평판), 의뢰, 화폐(세계관마다 이름·단위가 다르지만 안에서는 '기준 단위' 하나), 상점.
// L.world = { era, guild:{name,ranks,rank,rep}, money:{name, units:[{n,v}]}, price, shops:[] }, L.wallet(기준 단위), L.quests[]
import { BY_ID, BASE, GRADE_ORDER } from "./materials.js";
import { MONSTERS } from "./monmats.js";
import { makeWeapon, gradeName } from "./gear.js";

// 시대별 기본값(AI가 정해 주지 않으면 이것)
export const ERAS = {
  fantasy: { n: "판타지", guild: { name: "모험가 길드", ranks: ["F", "E", "D", "C", "B", "A", "S"] }, money: { name: "금화", units: [{ n: "동화", v: 1 }, { n: "은화", v: 100 }, { n: "금화", v: 10000 }] }, price: 1, shops: ["대장간", "잡화점", "약방"] },
  eastern: { n: "동양 무협", guild: { name: "무림맹 표국", ranks: ["삼류", "이류", "일류", "절정", "초절정", "화경", "현경"] }, money: { name: "냥", units: [{ n: "문", v: 1 }, { n: "냥", v: 100 }, { n: "금자", v: 10000 }] }, price: 1, shops: ["대장간", "포목점", "약방"] },
  modern: { n: "현대", guild: { name: "해결사 협회", ranks: ["견습", "D급", "C급", "B급", "A급", "S급", "SS급"] }, money: { name: "원", units: [{ n: "원", v: 1 }] }, price: 1000, shops: ["장비점", "편의점", "약국", "암시장"] },
  scifi: { n: "SF", guild: { name: "용병 조합", ranks: ["루키", "브론즈", "실버", "골드", "플래티넘", "에이스", "레전드"] }, money: { name: "크레딧", units: [{ n: "크레딧", v: 1 }] }, price: 10, shops: ["장비 상점", "보급소", "의무실"] },
  village: { n: "마을", guild: { name: "마을 자경단", ranks: ["견습", "단원", "조장", "부단장", "단장", "영웅", "전설"] }, money: { name: "은화", units: [{ n: "동전", v: 1 }, { n: "은화", v: 100 }] }, price: 0.8, shops: ["대장간", "잡화점"] },
  academy: { n: "학원", guild: { name: "학생회 의뢰부", ranks: ["1학년", "2학년", "3학년", "우등생", "수석", "전설의 선배", "교수급"] }, money: { name: "포인트", units: [{ n: "포인트", v: 1 }] }, price: 1, shops: ["매점", "공방", "보건실"] },
};
export function freshWorld(era = "fantasy") { const e = ERAS[era] || ERAS.fantasy; return { era: ERAS[era] ? era : "fantasy", guild: { name: e.guild.name, ranks: e.guild.ranks.slice(), rank: 0, rep: 0 }, money: JSON.parse(JSON.stringify(e.money)), price: e.price, shops: e.shops.slice(), quest: "story" }; }
export const worldOf = (L) => (L.world ||= freshWorld(L.party && Object.values(L.party.defs).some((d) => (d.weapons || []).some((w) => w.gun)) ? "modern" : "fantasy"));

// ── AI가 정하는 세계(짧은 줄 형식) ──
export const WORLD_PROMPT = `Read the roleplay and describe its setting for a game layer. Reply ONLY with these lines (Korean):
시대 <판타지|동양 무협|현대|SF|마을|학원>
길드 <이 세계에서 의뢰를 주고받는 곳의 이름> | 랭크 <낮은→높은 7단계, 쉼표>
화폐 <대표 이름> | 단위 <작은 단위>=1, <다음 단위>=<값> ...   (예: 동화=1, 은화=100, 금화=10000 / 원=1 / 크레딧=1)
물가 <빵 한 덩이가 가장 작은 단위로 얼마인지 숫자>
상점 <이 세계에 있을 법한 가게 2~4개, 쉼표>`;
const ERA_K = { 판타지: "fantasy", "동양 무협": "eastern", 무협: "eastern", 현대: "modern", SF: "scifi", 마을: "village", 학원: "academy" };
/** WORLD_PROMPT 답 → world(못 읽은 칸은 시대 기본값) */
export function parseWorld(text, prev) {
  const t = String(text || ""), line = (k) => (new RegExp("^\\s*" + k + "\\s*[:：]?\\s*(.+)$", "m").exec(t) || [])[1]?.trim() || "";
  const era = ERA_K[line("시대").replace(/\s+/g, " ")] || ERA_K[Object.keys(ERA_K).find((k) => line("시대").includes(k))] || prev?.era || "fantasy", w = freshWorld(era);
  const g = line("길드"); if (g) { const [nm, rk] = g.split("|"); if (nm?.trim()) w.guild.name = nm.trim().slice(0, 24); const r = /랭크\s*(.+)/.exec(rk || "")?.[1]?.split(/\s*[,，]\s*/).filter(Boolean); if (r && r.length >= 3) w.guild.ranks = r.slice(0, 7); }
  const m = line("화폐"); if (m) { const [nm, us] = m.split("|"); if (nm?.trim()) w.money.name = nm.trim().slice(0, 12); const u = [...String(us || "").matchAll(/([^\s=,，]+)\s*=\s*([\d,]+)/g)].map((x) => ({ n: x[1], v: +x[2].replace(/,/g, "") })).filter((x) => x.v > 0).sort((a, b) => a.v - b.v); if (u.length) { if (u[0].v !== 1) u[0].v = 1; w.money.units = u.slice(0, 4); } }
  const p = +line("물가").replace(/[^\d.]/g, ""); if (p > 0) w.price = Math.max(0.05, Math.min(100000, p / 5));   // 빵 한 덩이 = 기준 5
  const s = line("상점"); if (s) w.shops = s.split(/\s*[,，]\s*/).filter(Boolean).slice(0, 4);
  if (prev) { w.guild.rank = prev.guild?.rank || 0; w.guild.rep = prev.guild?.rep || 0; w.quest = prev.quest || "story"; }
  return w;
}

// ── 돈 ──
/** 기준 단위 → "3금화 25은화" */
export function fmtMoney(L, v) {
  const u = worldOf(L).money.units, n = Math.max(0, Math.round(v)); if (u.length === 1) return n.toLocaleString("ko-KR") + u[0].n;
  let r = n, out = []; for (let i = u.length - 1; i >= 0; i--) { const q = Math.floor(r / u[i].v); if (q) { out.push(q.toLocaleString("ko-KR") + u[i].n); r -= q * u[i].v; } } return out.join(" ") || "0" + u[0].n;
}
/** "3은화 5동화" · "1,200원" → 기준 단위 */
export function parseMoney(L, text) { const u = worldOf(L).money.units; let v = 0, hit = false; for (const x of u) for (const m of String(text).matchAll(new RegExp("([\\d,]+)\\s*" + x.n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))) { v += +m[1].replace(/,/g, "") * x.v; hit = true; } return hit ? v : null; }
export const wallet = (L) => (L.wallet ||= 0);
export function pay(L, v, why) { if (wallet(L) < v) return false; L.wallet -= v; if (why) note(L, `${why} — ${fmtMoney(L, v)} 지불`); return true; }
export function earn(L, v, why) { L.wallet = wallet(L) + Math.max(0, Math.round(v)); if (why) note(L, `${why} — ${fmtMoney(L, v)} 받음`); }
const note = (L, t) => { L.notes ||= []; L.notes.push(t); L.log ||= []; L.log.push({ at: Date.now(), text: t }); };

// ── 값 매기기: 등급·분류 → 기준값 × 세계 물가 ──
const GV = { 조악: 4, 보통: 10, 양질: 25, 정예: 60, 희귀: 150, 영웅: 400, 전설: 1000, 신화: 3000 }, CM = { ore: 0.6, metal: 1.2, gem: 2, wood: 0.4, plant: 0.6, hide: 0.8, part: 1.3, essence: 2.2, misc: 0.5 };
const gName = (g) => (typeof g === "number" ? gradeName(g) : String(g || "보통")).replace(/[+-]$/, "");
export function valueOf(L, it) {
  const p = worldOf(L).price, g = GV[gName(it.grade ?? it.w?.grade ?? it.a?.grade)] || 10;
  const k = it.w ? (it.w.type === "item" ? 0.8 : 3) : it.a ? 2.5 : it.charm ? 2 : CM[(it.mid && BY_ID[it.mid]?.cat) || (it.part ? "part" : "misc")] || 1;
  return Math.max(1, Math.round(g * k * p));
}
export const sellPrice = (L, it) => Math.max(1, Math.floor(valueOf(L, it) * 0.45));

// ── 상점: 가게 종류 → 진열(그날 바뀜) ──
const SHOPK = [[/대장간|장비|무기|공방/, "smith"], [/잡화|편의|매점|보급|포목/, "general"], [/약|의무|보건/, "apothecary"], [/암시장/, "black"]];
export const shopKind = (name) => (SHOPK.find(([re]) => re.test(name)) || [null, "general"])[1];
export function stock(L, name, day = 0) {
  const k = shopKind(name), era = worldOf(L).era, seed = [...name].reduce((n, c) => n * 31 + c.charCodeAt(0), day * 7919) >>> 0; let s = seed || 1; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
  const pick = (pool, n) => { const out = []; for (let i = 0; i < n && pool.length; i++) out.push(pool[Math.floor(rnd() * pool.length)]); return [...new Set(out)]; };
  const mats = (cats) => BASE.filter((b) => cats.includes(b.cat) && ["조악", "보통", "양질", "정예"].includes(b.grade)).map((b) => b.id);
  const out = [];
  if (k === "smith") { for (const id of pick(mats(["metal", "ore"]), 5)) out.push({ mid: id }); const kinds = era === "modern" || era === "scifi" ? ["pistol", "rifle", "dagger", "fist"] : era === "eastern" ? ["katana", "lance", "dagger", "fan"] : ["sword", "lance", "axe", "bow", "dagger", "magestaff"]; for (const kd of pick(kinds, 3)) out.push({ w: makeWeapon({ name: "", kind: kd, grade: ["보통", "양질", "정예"][Math.floor(rnd() * 3)] }) }); }
  if (k === "general") for (const id of pick(mats(["wood", "hide", "misc"]), 7)) out.push({ mid: id });
  if (k === "apothecary") { for (const id of pick(mats(["plant"]), 5)) out.push({ mid: id }); out.push({ potion: "상처약" }, { potion: "해독제" }); }
  if (k === "black") { for (const id of pick(BASE.filter((b) => ["gem", "essence"].includes(b.cat)).map((b) => b.id), 4)) out.push({ mid: id }); const mon = MONSTERS[Math.floor(rnd() * MONSTERS.length)]; out.push({ mid: Object.keys(BY_ID).find((x) => x.startsWith("mm:" + mon + ":")) }); }
  return out.filter((x) => !x.mid || BY_ID[x.mid]).map((x) => ({ ...x, price: valueOf(L, x.mid ? { mid: x.mid, grade: BY_ID[x.mid].grade } : x.w ? { w: x.w, grade: x.w.grade } : { w: { type: "item" }, grade: "양질" }) }));
}

// ── 길드·의뢰 ──
// 의뢰 = { id, title, giver, kind: hunt|gather|deliver|escort, target, n, got, reward, rep, rank, about, status: open|taken|done|failed, at }
export const QUEST_PROMPT = (L, n = 3) => { const w = worldOf(L); return `You write job postings for "${w.guild.name}" in this roleplay's world (era: ${ERAS[w.era]?.n}). Party rank: ${w.guild.ranks[w.guild.rank]}. Write ${n} jobs that fit the current story place and situation. Reply ONLY with lines (Korean):
의뢰 "<제목>" | 의뢰인 <누구> | 종류 <토벌|채집|납품|호위> | 대상 <몬스터 이름 또는 소재 이름> x<수> | 보상 <금액과 단위, 예: 3은화 / 50000원> | 랭크 <${w.guild.ranks.join("|")}> | <한 줄 사정>
Monsters may be: ${MONSTERS.slice(0, 40).join(", ")}, or a creature of the story.`; };
const KIND = { 토벌: "hunt", 채집: "gather", 납품: "deliver", 호위: "escort" };
export function parseQuests(L, text) {
  const w = worldOf(L), out = [];
  for (const l of String(text || "").split("\n")) {
    const m = /^\s*의뢰\s*["“]([^"”]+)["”]\s*\|(.+)$/.exec(l.replace(/\*\*/g, "")); if (!m) continue; const KEYS0 = ["의뢰인", "종류", "대상", "보상", "랭크"], f = Object.fromEntries(m[2].split("|").map((x) => x.trim()).filter(Boolean).map((x) => { const k = KEYS0.find((q) => x.startsWith(q)); return k ? [k, x.slice(k.length).trim()] : ["사정", x]; }));
    const tg = /^(.+?)\s*[x×]\s*(\d+)$/.exec(f.대상 || "") || [null, f.대상 || "", "1"], rk = Math.max(0, w.guild.ranks.indexOf(f.랭크)), money = parseMoney(L, f.보상 || "") ?? Math.round((20 + rk * 40) * w.price);
    out.push({ id: "q" + Date.now().toString(36) + out.length, title: m[1].slice(0, 30), giver: (f.의뢰인 || "").slice(0, 20), kind: KIND[f.종류] || "hunt", target: tg[1].trim().slice(0, 24), n: Math.max(1, Math.min(20, +tg[2] || 1)), got: 0, reward: money, rep: 10 + rk * 10, rank: rk, about: (f.사정 || Object.values(f).at(-1) || "").slice(0, 80), status: "open", at: Date.now() });
  }
  return out;
}
export function addQuests(L, qs) { L.quests ||= []; const open = L.quests.filter((q) => q.status === "open"); L.quests = L.quests.filter((q) => q.status !== "open" || open.indexOf(q) >= open.length - 3).concat(qs).slice(-30); return qs.length; }
export function takeQuest(L, id) { const q = (L.quests || []).find((x) => x.id === id && x.status === "open"); if (!q) return false; if ((L.quests || []).filter((x) => x.status === "taken").length >= 3) return false; q.status = "taken"; note(L, `의뢰 수락: 「${q.title}」 (${q.giver})`); return true; }
export function dropQuest(L, id) { const q = (L.quests || []).find((x) => x.id === id && x.status === "taken"); if (!q) return false; q.status = "failed"; worldOf(L).guild.rep = Math.max(0, worldOf(L).guild.rep - 5); note(L, `의뢰 포기: 「${q.title}」`); return true; }
const sameName = (a, b) => { const x = String(a || "").replace(/\s+/g, ""), y = String(b || "").replace(/\s+/g, ""); return !!x && !!y && (x.includes(y) || y.includes(x)); };
/** 전투가 끝나면: 토벌·호위 의뢰 진행 */
export function questsFromBattle(L, S) {
  const B = S.battle; if (!B || B.status !== "victory") return []; const done = [];
  for (const q of (L.quests || []).filter((x) => x.status === "taken")) {
    if (q.kind === "hunt") { const n = Object.values(B.units).filter((u) => u.hp <= 0 && u.team !== "ally" && u.team !== "friend" && sameName(S.defs[u.ref]?.name?.replace(/\s*\d+$/, ""), q.target)).length; if (n) { q.got = Math.min(q.n, q.got + n); if (q.got >= q.n) done.push(finishQuest(L, q)); } }
    if (q.kind === "escort" && B.obj.type === "escort") done.push(finishQuest(L, q));
  }
  return done.filter(Boolean);
}
/** 채집·납품: 가방에 대상 소재가 n개 있으면 건넨다 */
export function deliver(L, id) {
  const q = (L.quests || []).find((x) => x.id === id && x.status === "taken" && (x.kind === "gather" || x.kind === "deliver")); if (!q) return false;
  const have = L.bag.filter((b) => b.kind === "소재" && sameName(b.name, q.target)), n = have.reduce((s, b) => s + b.n, 0); if (n < q.n) return false;
  let left = q.n; for (const b of have) { const k = Math.min(b.n, left); b.n -= k; left -= k; if (!left) break; } L.bag = L.bag.filter((b) => b.n > 0); q.got = q.n; return !!finishQuest(L, q);
}
function finishQuest(L, q) {
  const w = worldOf(L); q.status = "done"; earn(L, q.reward); w.guild.rep += q.rep; let up = ""; while (w.guild.rank < w.guild.ranks.length - 1 && w.guild.rep >= (w.guild.rank + 1) * 60) { w.guild.rank++; up = w.guild.ranks[w.guild.rank]; }
  note(L, `의뢰 완료: 「${q.title}」 — 보상 ${fmtMoney(L, q.reward)}, 평판 +${q.rep}${up ? ` · ${w.guild.name} 랭크가 ${up}(으)로 올랐다` : ""}`); return q;
}
/** 전투 만들 때 실을 줄: 수락한 의뢰 */
export function questLine(L) { const t = (L.quests || []).filter((q) => q.status === "taken"); return t.length ? "수락한 의뢰(이야기가 그쪽으로 가면 이 상대·목표로): " + t.map((q) => `「${q.title}」 ${({ hunt: "토벌", gather: "채집", deliver: "납품", escort: "호위" })[q.kind]} ${q.target} ${q.got}/${q.n}`).join("; ") : ""; }
/** 매 요청에 싣는 짧은 줄: 길드 랭크·지갑 */
export function worldLine(L) { if (!L.world && !L.wallet) return ""; const w = worldOf(L); return `[Dusk Saga 세계 — ${w.guild.name} 랭크 ${w.guild.ranks[w.guild.rank]}, 지갑 ${fmtMoney(L, wallet(L))}${(L.quests || []).some((q) => q.status === "taken") ? ", " + questLine(L) : ""}]`; }
/** 이야기에서 돈이 오가면(설정을 켰을 때만): [[돈: +3은화 여관비]] 같은 표시 → 지갑 */
export const MONEY_RE = /\[\[\s*돈\s*[:：]\s*([+-])\s*([^\]\s][^\]]*?)\s*\]\]/g;
export function applyMoneyMarks(L, text) { let n = 0; for (const m of String(text).matchAll(MONEY_RE)) { const v = parseMoney(L, m[2]); if (v == null) continue; if (m[1] === "+") L.wallet = wallet(L) + v; else L.wallet = Math.max(0, wallet(L) - v); n++; } return n; }
export { GRADE_ORDER };
