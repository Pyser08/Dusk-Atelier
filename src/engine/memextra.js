// 장기기억 애드온(0.3.22): 새 기록 줄과 그 저장·주입(순수, 모델 호출 없음).
//   소문(told) · 인물 목표(goal) · 세계 문서(place·item·faction) · 몸 흔적(mark) · 화면 밖 근황 · @인물 고정 회상 · 궁합
// 저장: folder.extra = { rumors:[{from,to,info,at,when}], goals:{key:{name,list:[{goal,prog,status,at,first}]}},
//                       world:{place:{key:{name,desc,at,first,n}}, item:{…,owner}, faction:{…,members:[]}}, marks:[{name,part,desc,days,at,when}], diary:[…] }
const text = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const isUser = (s) => /\{\{user\}\}|^user$|^유저$/i.test(String(s ?? "").trim());

export const EXTRA_STAGE1 = [
  "",
  "Also only when newest clearly shows it (usually none):",
  "told|Speaker|Listener|info passed on (short Korean)",
  "goal|Name|own ongoing aim (short Korean)|progress 0-100|active, done or dropped",
  "place|name|one Korean line      recurring location",
  "item|name|one Korean line|owner or none      notable object or gift",
  "faction|name|one Korean line|members      group or family",
].join("\n");
export const MARK_STAGE1 = "\nmark|Name|body part|trace (hickey, bite, bruise…) in Korean|days 1-14      a visible trace newly left on a body";

export const EXTRA_KINDS = new Set(["told", "goal", "place", "item", "faction", "mark"]);
// 기록기 답 → 보고 목록. canon(name) → 알려진 이름(없으면 "")
export function extraFrom(raw, canon = (n) => n, { marks = false } = {}) {
  const out = [];
  const who = (s) => (isUser(s) ? "{{user}}" : canon(String(s ?? "").trim()) || "");
  for (const line0 of String(raw ?? "").split(/\r?\n/)) {
    const f = line0.trim().replace(/^(?:[-*•>]+|\d+[.)])\s*/, "").split(/[|｜¦]/).map((x) => x.trim()), tag = (f[0] ?? "").toLowerCase();
    if (!EXTRA_KINDS.has(tag) || !f[1] || !f[2]) continue;
    if (tag === "told") { const from = who(f[1]), to = who(f[2]); if (from && to && from !== to && f[3]) out.push({ kind: "told", from, to, info: text(f[3], 100) }); }
    else if (tag === "goal") { const name = who(f[1]); if (name && name !== "{{user}}") out.push({ kind: "goal", name, goal: text(f[2], 60), prog: clamp(f[3], 0, 100), status: statusOf(f[4]) }); }
    else if (tag === "mark") { if (!marks) continue; const name = who(f[1]); if (name && f[3]) out.push({ kind: "mark", name, part: text(f[2], 20), desc: text(f[3], 60), days: clamp(f[4], 1, 14) ?? 3 }); }
    else { const name = text(f[1], 30); if (name.length < 2) continue;
      const r = { kind: tag, name, desc: text(f[2], 100) };
      if (tag === "item" && f[3] && !/^(none|없음|-)$/i.test(f[3])) r.owner = isUser(f[3]) ? "{{user}}" : text(f[3], 30);
      if (tag === "faction" && f[3]) r.members = f[3].split(/[,，]/).map((x) => text(x, 30)).filter(Boolean).slice(0, 12);
      out.push(r); }
    if (out.length >= 12) break;
  }
  return out;
}
function clamp(v, lo, hi) { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.max(lo, Math.min(hi, Math.round(n))) : null; }
function statusOf(v) { const t = String(v ?? "").toLowerCase(); return /done|완료|이룸|성공/.test(t) ? "done" : /drop|포기|실패|abandon/.test(t) ? "dropped" : "active"; }

export const emptyExtra = () => ({ rumors: [], goals: {}, world: { place: {}, item: {}, faction: {} }, marks: [], diary: [] });
export function extraOf(f) {
  const e = f?.extra && typeof f.extra === "object" ? f.extra : {};
  return { rumors: Array.isArray(e.rumors) ? e.rumors : [], goals: e.goals && typeof e.goals === "object" ? e.goals : {},
    world: { place: e.world?.place ?? {}, item: e.world?.item ?? {}, faction: e.world?.faction ?? {} }, marks: Array.isArray(e.marks) ? e.marks : [], diary: Array.isArray(e.diary) ? e.diary : [] };
}
export const RUMOR_MAX = 60, MARK_MAX = 30, GOAL_MAX = 4;

// 보고 반영. ctx: {turn, when}. 반환: 바뀐 글 목록
export function applyExtra(f, reports, { turn = 0, when = "" } = {}) {
  const e = extraOf(f), changed = [];
  for (const r of reports ?? []) {
    if (r.kind === "told") {
      if (e.rumors.some((x) => nk(x.from) === nk(r.from) && nk(x.to) === nk(r.to) && nk(x.info) === nk(r.info))) continue;
      e.rumors.push({ from: r.from, to: r.to, info: r.info, at: turn, when: text(when, 40) }); changed.push(`소문 ${r.from}→${r.to}`);
    } else if (r.kind === "goal") {
      const k = nk(r.name), g = e.goals[k] ??= { name: r.name, list: [] };
      const i = g.list.findIndex((x) => nk(x.goal) === nk(r.goal) || nk(x.goal).includes(nk(r.goal)) || nk(r.goal).includes(nk(x.goal)));
      if (i >= 0) { const o = g.list[i]; g.list[i] = { ...o, prog: r.prog ?? o.prog, status: r.status, at: turn }; }
      else { g.list.push({ goal: r.goal, prog: r.prog ?? 0, status: r.status, at: turn, first: turn }); while (g.list.length > GOAL_MAX) { const j = g.list.findIndex((x) => x.status !== "active"); g.list.splice(j >= 0 ? j : 0, 1); } }
      changed.push(`목표 ${r.name}: ${r.goal}`);
    } else if (r.kind === "mark") {
      e.marks.push({ name: r.name, part: r.part, desc: r.desc, days: r.days, at: turn, when: text(when, 40) }); changed.push(`흔적 ${r.name} ${r.part}`);
    } else if (r.kind === "place" || r.kind === "item" || r.kind === "faction") {
      const box = e.world[r.kind], k = nk(r.name), o = box[k];
      box[k] = { ...(o ?? { first: turn, n: 0 }), name: o?.name ?? r.name, desc: r.desc || o?.desc || "", at: turn, n: (o?.n ?? 0) + 1,
        ...(r.owner ? { owner: r.owner } : {}), ...(r.members?.length ? { members: [...new Set([...(o?.members ?? []), ...r.members])].slice(0, 16) } : {}) };
      if (!o) changed.push(`${WORLD_LABEL[r.kind]} ${r.name}`);
    }
  }
  if (e.rumors.length > RUMOR_MAX) e.rumors = e.rumors.slice(-RUMOR_MAX);
  e.marks = activeMarks(e.marks, turn, when).slice(-MARK_MAX);
  f.extra = e;
  return changed;
}
export const WORLD_LABEL = Object.freeze({ place: "장소", item: "물건", faction: "세력" });

// 이야기 날짜(YYYY-MM-DD) 차이(일). 둘 다 없으면 null
export function dayGap(a, b) {
  const d = (s) => { const m = String(s ?? "").match(/(\d{3,4})-(\d{1,2})-(\d{1,2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  const x = d(a), y = d(b); return x == null || y == null ? null : Math.round((y - x) / 86400000);
}
export const TURNS_PER_DAY = 6;
// 아직 남은 흔적(날짜를 알면 날짜로, 모르면 턴으로)
export function activeMarks(marks, turn, when = "") {
  return (marks ?? []).filter((m) => markAge(m, turn, when) <= (m.days ?? 3)).map((m) => ({ ...m }));
}
export function markAge(m, turn, when = "") { const g = dayGap(m.when, when); return g != null ? g : Math.floor((turn - (m.at ?? 0)) / TURNS_PER_DAY); }

// 입력의 @이름 → 위키 인물 이름(대표 이름)
export function mentionsOf(userText, docs = []) {
  const out = [];
  for (const m of String(userText ?? "").matchAll(/@([^\s@,.!?·…"'“”‘’()]{1,20})/g)) {
    const t = nk(m[1]);
    const d = docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => nk(n) === t)) ?? docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => nk(n).startsWith(t) && t.length >= 2));
    if (d && !out.includes(d.title)) out.push(d.title);
  }
  return out;
}

export const AWAY_AT = 20;
export const EXTRA_TITLE = "[Story threads — tracked by Dusk; use naturally, never list them]";
// 주입 글. present: 장면 인물 이름, recent: 최근 글, turn: 기록된 마지막 메시지 번호, when: 지금 이야기 날짜, pinned: @인물
export function extraSection(f, { present = [], recent = "", turn = 0, when = "", pinned = [], docs = null, lifeOf = null } = {}) {
  const e = extraOf(f), lines = [], P = new Set([...present, ...pinned].map(nk)), low = nk(recent);
  const here = (n) => P.has(nk(n)) || (String(n).length >= 2 && low.includes(nk(n)));
  for (const n of pinned) lines.push(`- {{user}} pointed at ${n}: bring up what ${n} and the others remember about them.`);
  // 화면 밖 근황: 오래 안 나오다 다시 나온 인물
  const D = docs ?? Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const pin = new Set(pinned.map(nk)), inRecent = (d) => [d.title, ...(d.aliases ?? [])].some((n) => pin.has(nk(n)) || (String(n ?? "").length >= 2 && low.includes(nk(n))));
  for (const d of D) {
    if (!inRecent(d)) continue;   // 기억 블록에만 든 인물은 '돌아온' 게 아니다 — 최근 글에 이름이 나온 인물만
    const L = lifeOf ? lifeOf(d) : f?.life?.p?.[d.id]; const seen = L?.seen;
    if (!Number.isInteger(seen) || turn - seen < AWAY_AT) continue;
    const g = (e.goals[nk(d.title)]?.list ?? []).filter((x) => x.status === "active").map((x) => x.goal).join(", ");
    lines.push(`- ${d.title} is back after ${turn - seen} messages away. Let them carry a brief, consistent sense of what they were doing meanwhile${g ? ` (their aims: ${g})` : ""}; don't contradict memory.`);
    if (lines.length > 3) break;
  }
  // 목표
  for (const g of Object.values(e.goals)) {
    if (!here(g.name)) continue;
    const act = g.list.filter((x) => x.status === "active").slice(-2);
    if (act.length) lines.push(`- ${g.name}'s aims: ${act.map((x) => `${x.goal} (${x.prog ?? 0}%)`).join("; ")}`);
  }
  // 소문: 장면 인물이 들은 것(다른 이는 모를 수 있음)
  const heard = e.rumors.filter((r) => here(r.to) || here(r.from)).slice(-4);
  if (heard.length) lines.push(`- Who heard what (others may not know): ${heard.map((r) => `${r.to} heard from ${r.from} that ${r.info}`).join("; ")}`);
  // 몸 흔적
  const mk = activeMarks(e.marks, turn, when).filter((m) => here(m.name)).slice(-4);
  if (mk.length) lines.push(`- Visible traces: ${mk.map((m) => `${m.name} — ${m.part} ${m.desc} (day ${markAge(m, turn, when) + 1})`).join("; ")}`);
  // 세계 문서: 최근 글에 이름이 나온 것만
  const ws = [];
  for (const kind of ["place", "item", "faction"]) for (const w of Object.values(e.world[kind])) if (w.desc && String(w.name).length >= 2 && low.includes(nk(w.name))) ws.push(`${w.name}(${WORLD_LABEL[kind]}): ${w.desc}${w.owner ? ` · owner ${w.owner}` : ""}${w.members?.length ? ` · members ${w.members.slice(0, 5).join(", ")}` : ""}`);
  if (ws.length) lines.push(`- World: ${ws.slice(0, 4).join("; ")}`);
  if (!lines.length) return "";
  const out = [EXTRA_TITLE, ...lines].join("\n");
  return out.length > 900 ? out.slice(0, 897) + "…" : out;
}

// 다른 봇으로 인물 옮기기: 원래 폴더에서 한 인물의 몫을 떼어 낸다(복사본)
export function personPack(f, docId) {
  const doc = f?.wiki?.documents?.[docId]; if (!doc) return null;
  const names = new Set([doc.title, ...(doc.aliases ?? [])].map(nk)), mine = (n) => names.has(nk(n));
  const person = Object.entries(f.people ?? {}).find(([k, p]) => mine(k) || mine(p?.name));
  const e = extraOf(f);
  return JSON.parse(JSON.stringify({
    name: doc.title, doc, profile: f?.wiki?.people?.profiles?.[docId] ?? null, nsfw: f?.nsfw?.[docId] ?? null, life: f?.life?.p?.[docId] ?? null,
    person: person ? { key: person[0], ...person[1] } : null,
    goals: e.goals[nk(doc.title)] ?? null,
  }));
}
// 옮겨 넣기(대상 폴더, 원본 관계는 대상 봇에 없으니 가져가지 않는다). 같은 이름 인물이 있으면 덮지 않고 이름에 (옮김)
export function insertPack(f, pack, { newId = `moved_${Date.now().toString(36)}` } = {}) {
  if (!pack?.doc) return null;
  f.wiki ??= {}; f.wiki.documents ??= {};
  const clash = Object.values(f.wiki.documents).some((d) => nk(d?.title) === nk(pack.name));
  const title = clash ? `${pack.name}(옮김)` : pack.name;
  f.wiki.documents[newId] = { ...pack.doc, id: newId, title, relations: [], links: [] };
  if (pack.profile) { f.wiki.people ??= {}; f.wiki.people.profiles ??= {}; f.wiki.people.profiles[newId] = pack.profile; }
  if (pack.nsfw) { f.nsfw ??= {}; f.nsfw[newId] = pack.nsfw; }
  if (pack.life) { f.life ??= {}; f.life.p ??= {}; f.life.p[newId] = { ...pack.life, seen: null, seenPrev: null, temp: {}, lover: {}, met: {} }; }
  if (pack.person) { f.people ??= {}; const { key, ...p } = pack.person; f.people[title] = { ...p, name: title, rels: undefined }; }
  if (pack.goals) { const e = extraOf(f); e.goals[nk(title)] = { ...pack.goals, name: title }; f.extra = e; }
  return { id: newId, title };
}

// ── 궁합(호출 없음) ──
const likesOf = (n) => [...(n?.positions ?? []).filter((p) => p.preference === "preferred").map((p) => p.label), ...(n?.tags?.likes ?? []), ...(n?.ext?.fantasy ?? [])];
const dislikesOf = (n) => [...(n?.positions ?? []).filter((p) => p.preference === "disliked").map((p) => p.label), ...(n?.tags?.limits ?? [])];
const near = (a, b) => { const x = nk(a), y = nk(b); return x && y && (x === y || (x.length >= 2 && y.includes(x)) || (y.length >= 2 && x.includes(y))); };
export function compatOf(a, b, { usesA = {}, usesB = {} } = {}) {
  if (!a || !b) return null;
  const la = likesOf(a), lb = likesOf(b), da = dislikesOf(a), db = dislikesOf(b);
  const shared = la.filter((x) => lb.some((y) => near(x, y)));
  const clash = [...la.filter((x) => db.some((y) => near(x, y))).map((x) => ({ who: "a", item: x })), ...lb.filter((x) => da.some((y) => near(x, y))).map((x) => ({ who: "b", item: x }))];
  const tried = new Set([...Object.keys(usesA), ...Object.keys(usesB)].map(nk));
  const untried = [...new Set(shared)].filter((x) => ![...tried].some((t) => near(t, x)));
  const ia = a.sexual?.eroticInterest ?? 50, ib = b.sexual?.eroticInterest ?? 50;
  const ina = a.axes?.initiative ?? null, inb = b.axes?.initiative ?? null;
  const lead = ina != null && inb != null ? Math.abs(ina - inb) : null;   // 주도성 차이가 클수록 맞물림
  let score = 50 + Math.min(30, shared.length * 8) - Math.min(36, clash.length * 12) - Math.round(Math.abs(ia - ib) / 5);
  if (lead != null) score += lead >= 30 ? 10 : lead <= 10 && (ina + inb) / 2 >= 60 ? -6 : 0;
  const za = (a.zones ?? []).filter((z) => z.level >= 2).length, zb = (b.zones ?? []).filter((z) => z.level >= 2).length;
  score += Math.min(6, za + zb);
  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? "아주 잘 맞음" : score >= 62 ? "잘 맞음" : score >= 45 ? "무난함" : score >= 30 ? "엇갈림" : "많이 엇갈림";
  return { score, label, shared: [...new Set(shared)].slice(0, 8), clash: clash.slice(0, 6), untried: untried.slice(0, 6), lead: lead == null ? null : lead >= 30 ? "주도·수용이 맞물려요" : lead <= 10 ? "둘 다 비슷하게 이끌어요" : "주도성이 조금 달라요" };
}
