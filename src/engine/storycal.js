// 장기기억 애드온: 이야기 달력(순수) — 생일 · 연인 기념일 · 공휴일 · 특별한 날 · 약속. (이머헬퍼 모듈의 달력 기능을 우리 방식으로)
// 기록기 AI가 한 줄로 알려 주면(bday·couple·plan·day·country·hol) folder.extra.cal에 쌓고, 엔진이 이야기 날짜로 D-day를 센다.
// 상태창에 '다가오는 날'로 보여 주고, 7일 안의 날은 요청에 짧게 넣어 이야기에 자연스럽게 묻어나게 한다.
import { parseIso, dayIndex, isoOf, isReal } from "./weather.js";

const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const isUser = (s) => /^\{\{user\}\}$|^user$|^유저$/i.test(String(s ?? "").trim());
const md = (s) => { const m = String(s ?? "").match(/(\d{1,2})\s*[/.월-]\s*(\d{1,2})/); return m && +m[1] >= 1 && +m[2] >= 1 && +m[2] <= 60 ? `${+m[1]}/${+m[2]}` : ""; };

export const CAL_STAGE1 = [
  "",
  "bday|Name|M/D or ?|who they are to {{user}} in a few Korean words      a named recurring character's birthday when first shown or stated (Name may be {{user}}); resend only if the story corrects it",
  "couple|Name|today, YYYY-MM-DD, ? or off      Name and {{user}} become an explicit romantic couple on screen (today), were already lovers (date or ?), or break up (off); crushes, flirting or sex alone do not count",
  "plan|M/D|what (Korean)|off      a dated plan that matters is made (date, exam, trip) or cancelled (off)",
  "day|M/D|name (Korean)|short note      a dated one-time special day in this story (festival, election)",
  "country|KR, JP, US… or custom|country name (Korean)      the country of the scene, in the first response and when it changes",
  "hol|M/D or M/D~M/D|name (Korean)|short note      only for a custom (fictional/historical) country: its holidays (about 20 days off a year), sent once when the country first appears",
].join("\n");

// 기록기 줄 → 보고
export function calFrom(raw, canon = (n) => n) {
  const out = [], who = (s) => (isUser(s) ? "{{user}}" : canon(String(s ?? "").trim()) || "");
  for (const line0 of String(raw ?? "").split(/\r?\n/)) {
    const f = line0.trim().replace(/^(?:[-*•>]+|\d+[.)])\s*/, "").split(/[|｜¦]/).map((x) => x.trim()), tag = (f[0] ?? "").toLowerCase();
    if (tag === "bday") { const name = who(f[1]); if (name && f[2]) out.push({ kind: "bday", name, md: md(f[2]), rel: text(f[3], 30) }); }
    else if (tag === "couple") { const name = who(f[1]); if (name && name !== "{{user}}" && f[2]) out.push({ kind: "couple", name, since: /^off$/i.test(f[2]) ? "off" : /today|오늘/i.test(f[2]) ? "today" : parseIso(f[2]) ? isoOf(parseIso(f[2])) : "?" }); }
    else if (tag === "plan") { const d = md(f[1]); if (d && f[2]) out.push({ kind: "plan", md: d, what: text(f[2], 40), off: /^off$/i.test(f[3] ?? "") }); }
    else if (tag === "day") { const d = md(f[1]); if (d && f[2]) out.push({ kind: "day", md: d, name: text(f[2], 24), note: text(f[3], 40) }); }
    else if (tag === "country" && f[1]) { const custom = /custom|가상|fiction/i.test(f[1]); out.push({ kind: "country", code: custom ? "custom" : text(f[1], 3).toUpperCase(), name: text(f[2], 24) }); }
    else if (tag === "hol" && f[1] && f[2]) { const [a, b] = String(f[1]).split(/[~～-]{1}(?=\s*\d)/); const from = md(a), to = md(b ?? "") || from; if (from) out.push({ kind: "hol", from, to, name: text(f[2], 24), note: text(f[3], 40) }); }
    if (out.length >= 12) break;
  }
  return out;
}
export const CAL_KINDS = new Set(["bday", "couple", "plan", "day", "country", "hol"]);
export const emptyCal = () => ({ bday: {}, couple: {}, plans: [], days: [], hols: [], country: null });
export function calOf(e) { const c = e?.cal && typeof e.cal === "object" ? e.cal : {}; return { ...emptyCal(), ...c, bday: c.bday ?? {}, couple: c.couple ?? {}, plans: c.plans ?? [], days: c.days ?? [], hols: c.hols ?? [] }; }

// 보고 반영(e = folder.extra). when = 지금 이야기 날짜(ISO). 반환: 바뀐 글
export function applyCal(e, reports, { when = "" } = {}) {
  const c = calOf(e), changed = [], today = parseIso(when) ? isoOf(parseIso(when)) : "";
  for (const r of reports ?? []) {
    if (r.kind === "bday") { const k = nk(r.name), old = c.bday[k]; if (old?.manual) continue; if (r.md && old?.md === r.md && (!r.rel || old.rel === r.rel)) continue; if (!r.md && old) continue;
      c.bday[k] = { name: r.name, md: r.md || old?.md || "", rel: r.rel || old?.rel || "" }; changed.push(`생일 ${r.name}${r.md ? ` ${r.md}` : " (모름)"}`); }
    else if (r.kind === "couple") { const k = nk(r.name);
      if (r.since === "off") { if (c.couple[k]) { delete c.couple[k]; changed.push(`연인 끝 ${r.name}`); } continue; }
      const since = r.since === "today" ? today : r.since === "?" ? "" : r.since; if (c.couple[k] && (c.couple[k].since || !since)) continue;
      c.couple[k] = { name: r.name, since }; changed.push(`연인 ${r.name}${since ? ` ${since}부터` : ""}`); }
    else if (r.kind === "plan") { const i = c.plans.findIndex((p) => p.md === r.md && nk(p.what) === nk(r.what));
      if (r.off) { if (i >= 0) { c.plans.splice(i, 1); changed.push(`약속 취소 ${r.md} ${r.what}`); } continue; }
      if (i < 0) { c.plans = [...c.plans, { md: r.md, what: r.what, y: parseIso(today)?.y ?? null }].slice(-20); changed.push(`약속 ${r.md} ${r.what}`); } }
    else if (r.kind === "day") { if (!c.days.some((d) => d.md === r.md && nk(d.name) === nk(r.name))) { c.days = [...c.days, { md: r.md, name: r.name, note: r.note, y: parseIso(today)?.y ?? null }].slice(-20); changed.push(`특별한 날 ${r.md} ${r.name}`); } }
    else if (r.kind === "country") { if (c.country?.code !== r.code || (r.name && c.country?.name !== r.name)) { c.country = { code: r.code, name: r.name || c.country?.name || "" }; if (r.code !== "custom") c.hols = []; changed.push(`나라 ${r.name || r.code}`); } }
    else if (r.kind === "hol") { if (!c.hols.some((h) => h.from === r.from && nk(h.name) === nk(r.name))) { c.hols = [...c.hols, { from: r.from, to: r.to, name: r.name, note: r.note }].slice(-30); changed.push(`휴일 ${r.from} ${r.name}`); } }
  }
  e.cal = c;
  return changed;
}

// 한국 공휴일(현실 달력·나라 KR이거나 정하지 않았을 때). 음력 명절은 표로(양력 날짜)
const KR_FIXED = [["1/1", "신정"], ["3/1", "삼일절"], ["5/5", "어린이날"], ["6/6", "현충일"], ["8/15", "광복절"], ["10/3", "개천절"], ["10/9", "한글날"], ["12/25", "성탄절"]];
const KR_EVENTS = [["2/14", "밸런타인데이"], ["3/14", "화이트데이"], ["10/31", "핼러윈"], ["11/11", "빼빼로데이"], ["12/24", "크리스마스이브"]];
const KR_LUNAR = { 2024: [["2/9~2/11", "설날"], ["5/15", "부처님오신날"], ["9/16~9/18", "추석"]], 2025: [["1/28~1/30", "설날"], ["5/5", "부처님오신날"], ["10/5~10/7", "추석"]],
  2026: [["2/16~2/18", "설날"], ["5/24", "부처님오신날"], ["9/24~9/26", "추석"]], 2027: [["2/6~2/8", "설날"], ["5/13", "부처님오신날"], ["9/14~9/16", "추석"]] };
function holidaysOf(c, y, cal) {
  if (c.country?.code === "custom" || !isReal(cal)) return c.hols.map((h) => ({ ...h, off: true }));
  if (c.country?.code && c.country.code !== "KR") return [];
  const span = (s) => { const [a, b] = s.split("~"); return { from: a, to: b ?? a }; };
  return [...KR_FIXED.map(([d, name]) => ({ from: d, to: d, name, off: true })), ...KR_EVENTS.map(([d, name]) => ({ from: d, to: d, name, off: false })),
    ...(KR_LUNAR[y] ?? []).map(([d, name]) => ({ ...span(d), name, off: true }))];
}

// 지금(when)부터 within일 안에 오는 날: [{left, md, label, kind}] (left 0 = 오늘)
export function upcoming(e, when, cal = null, within = 14) {
  const p = parseIso(when); if (!p) return [];
  const c = calOf(e), now = dayIndex(p, cal), out = [];
  const nextOf = (mdStr, y0 = null) => { const [m, d] = String(mdStr).split("/").map(Number); if (!m || !d) return null;
    for (const y of y0 != null ? [y0] : [p.y, p.y + 1]) { const n = dayIndex({ y, m, d }, cal); if (Number.isFinite(n) && n >= now) return { n, y }; } return null; };
  const add = (mdStr, label, kind, y0 = null) => { const x = nextOf(mdStr, y0); if (x && x.n - now <= within) out.push({ left: x.n - now, md: mdStr, label, kind }); };
  for (const b of Object.values(c.bday)) if (b.md) add(b.md, `${b.name === "{{user}}" ? "{{user}}" : b.name} 생일`, "bday");
  for (const k of Object.values(c.couple)) {
    const s = parseIso(k.since); if (!s) continue; const start = dayIndex(s, cal);
    for (let h = 100; h <= 3000; h += 100) { const n = start + h - 1; if (n >= now && n - now <= within) out.push({ left: n - now, md: "", label: `${k.name}와 ${h}일`, kind: "couple" }); }
    if (isReal(cal)) for (const y of [p.y, p.y + 1]) { const yrs = y - s.y; if (yrs >= 1) { const n = dayIndex({ y, m: s.m, d: s.d }, cal); if (n >= now && n - now <= within) out.push({ left: n - now, md: `${s.m}/${s.d}`, label: `${k.name}와 ${yrs}주년`, kind: "couple" }); } }
  }
  for (const pl of c.plans) add(pl.md, pl.what, "plan", pl.y);
  for (const d of c.days) add(d.md, d.name, "day", d.y);
  for (const y of [p.y, p.y + 1]) for (const h of holidaysOf(c, y, cal)) {
    const [m, d] = h.from.split("/").map(Number), [m2, d2] = h.to.split("/").map(Number);
    const a = dayIndex({ y, m, d }, cal), b = dayIndex({ y: m2 < m ? y + 1 : y, m: m2, d: d2 }, cal);
    if (!Number.isFinite(a) || b < now || a - now > within) continue;
    if (!out.some((x) => x.kind === "hol" && x.label === h.name)) out.push({ left: Math.max(0, a - now), md: h.from, label: h.name, kind: h.off ? "hol" : "event", note: h.note, ongoing: a < now });
  }
  return out.sort((x, y) => x.left - y.left).slice(0, 8);
}
export const dLabel = (x) => (x.left === 0 || x.ongoing ? "오늘" : `D-${x.left}`);
// 요청에 넣는 짧은 줄(7일 안)
export const CAL_INJECT_TITLE = "[Story calendar]";
export function calSection(e, when, cal = null) {
  const list = upcoming(e, when, cal, 7);
  if (!list.length) return "";
  return `${CAL_INJECT_TITLE}\n- Near days (let them show naturally when they matter — presents, plans, closed shops; never contradict; never mention D-day counts): ${list.map((x) => `${x.label}${x.md ? ` (${x.md})` : ""} ${x.left === 0 || x.ongoing ? "today" : `in ${x.left} day${x.left > 1 ? "s" : ""}`}`).join("; ")}`.slice(0, 500);
}
