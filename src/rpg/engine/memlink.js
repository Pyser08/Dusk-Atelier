// Dusk Saga ↔ 장기기억: 폴더에 남길 전투 기록(folder.rpg)의 순수 로직. 장기기억 원본 칸(위키·인물 기록)은 고치지 않는다
// folder.rpg = { v:1, units:{ key:{ name, docId, log:[{at,job,level,exp,mtype,move,stats,gear,skills,why}] } }, battles:[{id,at,name,result,turn,ids}] }
import { SIDE, SL, STATS, MTL, WT } from "./rules.js";
import { ELEMENTS } from "./elements.js";
import { KINDS, fitBudget, gearInProse, gradeName, kindFromText, makeSpell, makeWeapon, parseGear } from "./gear.js";
import { normSkill, normWeapon, tameSkill } from "./normalize.js";
import { raceById, raceFromText } from "./races.js";
import { hairFromText } from "./armor.js";

const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const clean = (v, n) => String(v ?? "").replace(/[\r\n<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const docs = (f) => Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
const names = (d) => [d.title, ...(d.aliases ?? [])];
const atOf = (f) => (Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0);
export const docFor = (f, name) => docs(f).find((d) => names(d).some((n) => nk(n) === nk(name))) ?? null;
const box = (f) => { const b = f.rpg && typeof f.rpg === "object" && !Array.isArray(f.rpg) ? f.rpg : (f.rpg = {}); b.v = 1; b.units ||= {}; b.battles ||= []; return b; };
// 이름이 바뀌거나 합쳐져도 같은 인물로: 위키 문서 → 이름·별칭 순으로 찾는다
export function unitFor(f, name) {
  const d = docFor(f, name), all = Object.values(f?.rpg?.units ?? {});
  return (d && all.find((u) => u.docId === d.id)) ?? all.find((u) => nk(u.name) === nk(name) || (d && names(d).some((n) => nk(n) === nk(u.name)))) ?? null;
}
/** 되감기·삭제로 이야기가 앞으로 돌아가면 그 뒤의 기록을 걷어 낸다 */
export function prune(f, at = atOf(f)) {
  if (!f?.rpg) return 0; const b = box(f), n0 = b.battles.length; let cut = 0;
  b.battles = b.battles.filter((x) => x.at <= at);
  for (const [k, u] of Object.entries(b.units)) { const n = u.log.length; u.log = u.log.filter((x) => x.at <= at); cut += n - u.log.length; if (!u.log.length) delete b.units[k]; }
  return cut + n0 - b.battles.length;
}
const statsOf = (f, u) => f.rpg.battles.reduce((s, x) => { const m = x.who?.[u.key]; if (m) { s.battles++; if (x.result === "victory") s.wins++; s.kills += m.kills; s.downs += m.down ? 1 : 0; } return s; }, { battles: 0, wins: 0, kills: 0, downs: 0 });
/** 지금 시트를 기록한다(직업·레벨·스탯·장비·기술이 바뀌었을 때만 한 줄). 종족은 장기기억이 이미 갖고 있어 적지 않는다. 바뀐 인물 수 */
export function recordSheets(f, S, why = "") {
  prune(f); const b = box(f), at = atOf(f); let n = 0;
  for (const d of Object.values(S.defs)) {
    if (!d.ally || !d.name) continue; let u = unitFor(f, d.name); const doc = docFor(f, d.name);
    if (!u) { const key = doc ? "doc:" + doc.id : "name:" + nk(d.name); u = b.units[key] = { key, name: d.name, docId: doc?.id ?? null, log: [] }; }
    if (doc) { u.docId = doc.id; u.name = doc.title; }
    const row = { at, job: clean(d.job || d.cls, 20), level: d.level, exp: d.exp || 0, mtype: d.mtype, move: d.move, stats: Object.fromEntries(STATS.map((k) => [k, d.stats[k]])), gear: d.weapons.slice(0, 5).map((w) => ({ name: clean(w.name, 30), type: w.type, mt: w.mt, hit: w.hit, crit: w.crit, rmin: w.rmin, rmax: w.rmax, ...(w.kind ? { kind: w.kind } : {}), ...(w.grade != null ? { grade: w.grade } : {}), ...(w.elem ? { elem: w.elem } : {}), ...(w.max ? { uses: w.uses, max: w.max } : {}) })), skills: d.skills.map((k) => S.skills[k]).filter(Boolean).map((x) => ({ name: clean(x.name, 30), desc: clean(x.desc, 100), ...(x.grade != null ? { grade: x.grade } : {}), ...(x.elem ? { elem: x.elem } : {}) })), why: clean(why, 60) }, last = u.log.at(-1);
    const same = (o) => JSON.stringify([o.job, o.level, o.exp, o.mtype, o.move, o.stats, o.gear, o.skills]); if (last && same(last) === same(row)) continue;
    if (last && last.at === at) u.log[u.log.length - 1] = row; else u.log.push(row);
    if (u.log.length > 30) u.log.splice(1, u.log.length - 30); n++;
  }
  return n;
}
/** 끝난 전투를 한 번만 남긴다. ev = 전투 전체 이벤트(격파 세기용) */
export function recordBattle(f, S, id, ev = []) {
  const B = S.battle; if (!B || !["victory", "defeat"].includes(B.status) || !id) return false;
  recordSheets(f, S, B.name); const b = box(f); if (b.battles.some((x) => x.id === id)) return false;
  const kills = {}, dead = new Set(); for (const e of ev) if (e.t === "strike" && e.hp === 0 && !dead.has(e.to)) { dead.add(e.to); const u = B.units[e.from]; if (u) kills[u.ref] = (kills[u.ref] ?? 0) + 1; }
  const who = {}; for (const u of Object.values(B.units)) if (u.team === "ally" && S.defs[u.ref]) { const m = unitFor(f, S.defs[u.ref].name); if (m) who[m.key] = { kills: kills[u.ref] ?? 0, down: u.hp <= 0 }; }
  b.battles.push({ id: String(id), at: atOf(f), name: clean(B.name, 60), result: B.status, turn: B.turn, who, foes: [...new Set(Object.values(B.units).filter((u) => SIDE[u.team] !== 0).map((u) => clean(S.defs[u.ref]?.name, 30)).filter(Boolean))].slice(0, 6) });
  if (b.battles.length > 60) b.battles.splice(0, b.battles.length - 60); return true;
}
export function unitView(f, name) {
  if (!f?.rpg) return null; const c = { ...f, rpg: JSON.parse(JSON.stringify(f.rpg)) }; prune(c);   // 보기만: 원본은 그대로
  const u = unitFor(c, name); if (!u) return null; const now = u.log.at(-1); return { name: u.name, ...now, ...statsOf(c, u), log: u.log };
}
/** 요청에 넣을 짧은 글: 지금 장면 인물만. 없으면 "" */
export function rpgSection(f, present = [], max = 6) {
  const seen = new Set(), lines = []; for (const n of present) { const v = unitView(f, n); if (!v || seen.has(v.name) || lines.length >= max) continue; seen.add(v.name); lines.push(`- ${v.name}: ${[v.job, v.level ? "Lv " + v.level : "", (v.gear ?? []).map((w) => w.name).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}${v.battles ? ` (전투 ${v.battles}회, 격파 ${v.kills}${v.downs ? `, 쓰러짐 ${v.downs}` : ""})` : ""}`); }
  if (!lines.length) return ""; const at = atOf(f), last = (f.rpg.battles ?? []).filter((x) => x.at <= at).at(-1);
  return ["[전투 직업·기록 — 게임이 확정한 값. 수치는 본문에 쓰지 말고 솜씨와 장비로만 드러낸다]", ...lines, ...(last ? [`- 최근 전투: ${last.name} ${last.result === "victory" ? "승리" : "패배"}`] : [])].join("\n");
}
export { raceFromText };
/** 장기기억이 아는 것으로 새 시트의 빈칸을 채울 제안. 정해 둔 값은 덮지 않는다 */
export function seedFromMemory(f, name) {
  const out = {}, d = docFor(f, name), all = d ? names(d) : [name], hit = (o) => Object.entries(o ?? {}).find(([k, v]) => all.some((n) => nk(n) === nk(v?.name ?? k)))?.[1];
  const r = hit(f?.extra?.race); const race = (r?.label && raceFromText(r.label)) || raceById(r?.id); if (race) out.race = race;
  const g = hit(f?.orient)?.g; if (g === "f" || g === "m") out.sex = g;
  const v = unitView(f, name); if (v) { if (v.job) out.job = v.job; if (v.level) out.level = v.level; }
  return out;
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
/** 캐릭터 상태창 ‘스탯’ 탭 안쪽 HTML(인라인 스타일만 — 호스트가 class를 지운다). 기록이 없으면 "" */
export function statTabHtml(f, names = []) {
  const v = names.map((n) => unitView(f, n)).find(Boolean); if (!v?.stats) return "";
  const prev = v.log.length > 1 ? v.log.at(-2) : null, n = (x) => Number(x) || 0;
  const head = `<span style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px"><b style="font-size:15px">${esc(v.job)}</b><span style="font-size:12px;opacity:.75">Lv ${n(v.level)} · 경험치 ${n(v.exp)} · ${esc(MTL[v.mtype] ?? "")} 이동 ${n(v.move)}</span></span>`;
  const bar = (k) => { const x = n(v.stats[k]), top = k === "hp" ? 120 : 60, d = prev?.stats ? x - n(prev.stats[k]) : 0; return `<span style="display:grid;grid-template-columns:3em 1fr 4.6em;gap:8px;align-items:center;font-size:12.5px;margin:3px 0"><span style="opacity:.75">${SL[k]}</span><span style="display:block;height:6px;background:rgba(255,255,255,.12)"><span style="display:block;height:6px;width:${Math.min(100, Math.round(x * 100 / top))}%;background:#e9a95f"></span></span><b style="text-align:right;font-variant-numeric:tabular-nums">${x}${d ? `<small style="color:${d > 0 ? "#8ce29b" : "#ff9a90"}"> ${d > 0 ? "+" : ""}${d}</small>` : ""}</b></span>`; };
  const title = (t) => `<b style="display:block;margin:12px 0 4px;font-size:11px;opacity:.6">${t}</b>`;
  const gear = (v.gear ?? []).map((w, i) => `<span style="display:block;padding:6px 10px;margin:3px 0;background:rgba(255,255,255,.07);font-size:12.5px">${i === 0 ? "● " : ""}<b>${esc(w.name)}</b> <span style="opacity:.7">${esc([w.grade != null ? gradeName(n(w.grade)) : "", ELEMENTS[w.elem]?.n, KINDS[w.kind]?.n ?? WT[w.type]?.n].filter(Boolean).join(" "))} · ${w.type === "item" || w.type === "staff" ? `회복 ${n(w.mt) >= 99 ? "전부" : n(w.mt)}` : `위력 ${n(w.mt)} 명중 ${n(w.hit)}${n(w.crit) ? ` 필살 ${n(w.crit)}` : ""}`}${w.max ? ` · ${n(w.uses)}/${n(w.max)}` : ""}</span></span>`).join("");
  const skills = (v.skills ?? []).map((x) => `<span style="display:block;font-size:12.5px;margin:3px 0"><b>${esc(x.name)}</b> <span style="opacity:.7">${esc([x.grade != null ? gradeName(n(x.grade)) : "", ELEMENTS[x.elem]?.n].filter(Boolean).join(" "))} ${esc(x.desc)}</span></span>`).join("");
  return head + STATS.map(bar).join("") + (gear ? title("장비") + gear : "") + (skills ? title("기술") + skills : "") + (v.battles ? title("전적") + `<span style="font-size:12.5px">전투 ${v.battles} · 승리 ${v.wins} · 격파 ${v.kills} · 쓰러짐 ${v.downs}</span>` : "");
}

/** 장기기억(위키·아이템)과 로어북·본문에서 이 인물의 무기·기술을 모은다. entries = 로어북, text = 최근 본문 */
export function storyKit(f, name, { entries = [], text = "", level = 1 } = {}) {
  const d = docFor(f, name), all = [...new Set([name, ...(d ? names(d) : [])])], src = [];
  for (const s of d?.sections ?? []) src.push(/무기|장비|weapon|equip/i.test(s.heading ?? "") ? "무기:\n" + s.body : /기술|스킬|마법|주문|능력|skill|spell|abilit/i.test(s.heading ?? "") ? "기술:\n" + s.body : s.body);
  for (const e of entries) if ([e?.comment, e?.key].some((k) => String(k ?? "").split(",").some((x) => all.some((n) => nk(n) === nk(x))))) src.push(e.content);
  const found = src.flatMap((t) => parseGear(t)); for (const it of Object.values(f?.extra?.world?.item ?? {})) if (it?.name && all.some((n) => nk(n) === nk(it.owner)) && kindFromText(it.name)) found.push({ type: "weapon", name: it.name, desc: it.desc ?? "" });
  found.push(...gearInProse(text, all));
  const pick = (t, n) => { const seen = new Set(); return found.filter((x) => x.type === t && !seen.has(nk(x.name)) && seen.add(nk(x.name))).slice(0, n); };
  return { weapons: pick("weapon", 4).map((w) => makeWeapon(w, level)), skills: pick("spell", 4).map((x) => makeSpell(x, level)).filter(Boolean) };
}
/** 시트에 입힌다: 같은 이름은 새 값으로, 도구는 남긴다. 바뀐 이름 목록 */
export function applyKit(S, id, kit) {
  const d = S.defs[id]; if (!d || !kit) return []; const out = [];
  if (kit.weapons?.length) { const items = d.weapons.filter((w) => w.type === "item"), ws = kit.weapons.map(normWeapon).slice(0, 5 - Math.min(1, items.length)); d.weapons = [...ws, ...items].slice(0, 5); out.push(...ws.map((w) => w.name)); if (S.battle) for (const u of Object.values(S.battle.units)) if (u.ref === id) u.wi = 0; }
  for (const s of kit.skills ?? []) { const k = tameSkill(normSkill(s, 0)); if (k.grade != null) fitBudget(k, k.grade); if (!S.skills[k.id]) S.skills[k.id] = k; if (!d.skills.includes(k.id) && d.skills.length < 6) { d.skills.push(k.id); out.push(k.name); } }
  return out;
}

/** 장부(가방·최근 기록)를 폴더에 남긴다. 장기기억 원본 칸은 건드리지 않는다 */
export function recordLedger(f, L) {
  const b = box(f); b.bag = (L.bag || []).slice(0, 60).map((x) => ({ name: clean(x.name, 40), kind: x.kind, n: x.n, grade: x.grade || "", elem: x.elem || "" })); b.log = (L.log || []).slice(-20).map((x) => ({ at: x.at, text: clean(x.text, 160) })); return true;
}
/** 프롬프트용: 가방에 든 것(짧게) */
export function bagSection(f, max = 8) { const bag = f?.rpg?.bag ?? []; if (!bag.length) return ""; return "[파티 소지품 — 게임이 확정한 값]\n" + bag.slice(0, max).map((x) => `- ${x.name}${x.n > 1 ? " ×" + x.n : ""}`).join("\n"); }

// ── 전투에 실을 몸 상태·관계(장기기억이 있을 때만 더 풍부해짐) ──
const dayNo = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); if (!m) return NaN; const t = new Date(Date.UTC(2000, +m[2] - 1, +m[3])); t.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); return t.getTime() / 86400000; };
const isCycle = (s) => s?.provenance?.slotId === "cycle.state" || s?.heading === "월경·임신";
const isNow = (s) => s?.provenance?.slotId === "core.current_state" || /현재 ?상태|current state/i.test(s?.heading ?? "");
/** 월경·임신 칸 → 상태 키(약하게만) */
export function cycleCond(body) {
  const t = String(body || ""), len = +(/주기:\s*(\d{2})일/.exec(t)?.[1] || 0), start = /기준일:\s*(\d{4}-\d{2}-\d{2})/.exec(t)?.[1], date = /날짜:\s*(\d{4}-\d{2}-\d{2})/.exec(t)?.[1], conc = /임신:\s*(\d{4}-\d{2}-\d{2}) 수정/.exec(t)?.[1];
  if (!date) return null;
  if (conc) { const w = (dayNo(date) - dayNo(conc)) / 7; return !(w >= 0) ? null : w < 13 ? (w >= 5 ? "preg1" : null) : w < 27 ? "preg2" : "preg3"; }
  if (!(len >= 21 && len <= 45) || !start) return null; const diff = dayNo(date) - dayNo(start); if (!(diff >= 0)) return null; const day = (diff % len) + 1;
  return day <= 2 ? "period2" : day <= 5 ? "period" : day > len - 3 ? "pms" : null;
}
const NOW_RE = [[/중상|큰 ?부상|골절|뼈가 부러|피투성이|빈사/, "wound"], [/부상|다친|다쳐|상처|베였|찔렸|삐었/, "injury"], [/피로|지쳐|녹초|기진맥진|밤샘|탈진/, "tired"], [/몸살|감기|열이|고열|앓/, "sick"], [/술에|취한|취해|취기|숙취|만취/, "drunk"], [/중독|독에/, "poison"], [/출혈|피를 흘/, "bleed"]];
/** names: 판에 선 인물 이름들. { conds: {이름:[키]}, bonds: [{a,b,kind}] } — 원본은 읽기만 */
export function memState(f, names = []) {
  const conds = {}, bonds = [], hair = {}, want = new Set(names.map(nk));
  for (const n of names) {
    const d = docFor(f, n); if (!d) continue; const ks = [];
    const cy = (d.sections ?? []).find(isCycle); const c = cy && cycleCond(cy.body); if (c) ks.push(c);
    const now = (d.sections ?? []).filter(isNow).map((s) => s.body).join(" "); for (const [re, k] of NOW_RE) if (re.test(now) && !ks.includes(k)) ks.push(k);
    if (ks.includes("wound")) ks.splice(ks.indexOf("injury") >>> 0, ks.includes("injury") ? 1 : 0);
    if (ks.length) conds[n] = ks; const hc = hairFromText((d.sections ?? []).filter((s) => /외모|머리|appearance|hair/i.test(s.heading ?? "") || /머리/.test(s.body ?? "")).map((s) => s.body).join(" ").slice(0, 2000)); if (hc) hair[n] = hc;
  }
  const alias = (x) => { const d = docFor(f, x); return d ? names.find((n) => docFor(f, n)?.id === d.id) : names.find((n) => nk(n) === nk(x)); };
  const seen = new Set(), add = (a, b, kind) => { const A = alias(a), B = alias(b); if (!A || !B || A === B) return; const k = [A, B].sort().join("|"); if (seen.has(k)) return; seen.add(k); bonds.push({ a: A, b: B, kind }); };
  for (const [, v] of Object.entries(f?.lovers ?? {})) if (v && typeof v === "object" && v.on) add(v.a, v.b, "dating");
  for (const t of Object.values(f?.ties ?? {})) { const x = !t?.orphan ? t : t.prev && !t.prevOrphan ? { a: t.a, b: t.b, ...t.prev } : null; if (x?.a && x?.b && x.kind) add(x.a, x.b, x.kind); }
  void want; return { conds, bonds, hair };
}
