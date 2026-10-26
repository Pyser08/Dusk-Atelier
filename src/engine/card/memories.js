// 기록 → 카드 기억(M0~M3) 변환, 상대 표식 처리, 원문 발췌. 순수 함수.
import { atLeast } from "../memorygrade.js";
import { extractMessageText } from "../chattext.js";
import { MEMORY_LABEL, MEMORY_LEVEL, MEMORY_LIMIT } from "./grade.js";

export const ROLE = "{{user}}";
const ROLE_RE = /\{\{\s*user\s*\}\}/gi;
export const prose = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(prose).filter(Boolean).join("\n");
  return Object.entries(v).map(([k, x]) => `${k}: ${prose(x)}`).join("\n");
};

// 사용자(페르소나) 이름을 {{user}}로 통일. 긴 이름부터 바꾼다.
export function replaceRole(value, names = []) {
  const list = [...new Set(names.filter((n) => typeof n === "string" && n.trim() && n.trim() !== ROLE))].sort((a, b) => b.length - a.length);
  if (typeof value === "string") { let s = value.replace(ROLE_RE, ROLE); for (const n of list) s = s.split(n).join(ROLE); return s; }
  if (Array.isArray(value)) return value.map((v) => replaceRole(v, names));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceRole(v, names)]));
  return value;
}
const PARTICLE = { 를: "을", 가: "이", 는: "은", 와: "과", 랑: "이랑", 로: "으로" };
// 카드 화면용: {{user}} → "당신" (받침 있는 조사로 보정)
export const displayRole = (value) => prose(value).replace(ROLE_RE, "당신")
  .replace(/당신(를|가|는|와|랑|로)(?=(?:도|만|까지|부터|조차|마저)?(?:$|[\s.,!?;:'"“”‘’()[\]{}<>…·]))/g, (_, p) => "당신" + PARTICLE[p]);

// ── 원문 발췌 ──
const clip = (s, n) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
export function excerptAt(messages, at, { max = 420, prevMax = 160 } = {}) {
  const m = messages?.[at];
  if (at == null || !m) return "";
  const cur = clip(extractMessageText(m), max), prev = at > 0 ? clip(extractMessageText(messages[at - 1]), prevMax) : "";
  return [prev && `(앞) ${prev}`, cur].filter(Boolean).join(" ⏎ ");
}
// B 이상이고 앵커가 살아 있는 기록만 발췌 대상.
export const needsExcerpt = (r) => !r.orphan && r.at != null && atLeast(r.g, "B");
export const excerptCount = (records) => (records ?? []).filter(needsExcerpt).length;

// AI에 줄 기록 목록(시간순). 너무 많으면 높은 등급을 우선해 limit개로 줄인다.
export function sourceMemories(folder, records, messages, { limit = 70 } = {}) {
  const scenes = new Map((folder?.scenes ?? []).map((s) => [s.id, s]));
  let rows = records.map((r) => ({ r, w: ["D", "C", "B", "A", "S", "EX"].indexOf(r.g) }));
  if (rows.length > limit) { const keep = new Set([...rows].sort((a, b) => b.w - a.w || (b.r.at ?? 0) - (a.r.at ?? 0)).slice(0, limit)); rows = rows.filter((x) => keep.has(x)); }
  return rows.map(({ r }) => {
    const s = scenes.get(r.sit);
    const item = { at: r.at != null ? r.at + 1 : null, who: r.person, level: MEMORY_LEVEL[r.g] ?? "M0", g: r.g, act: r.act };
    if (s?.place) item.place = s.place;
    if (s?.when) item.when = s.when;
    if (needsExcerpt(r)) { const ex = excerptAt(messages, r.at); if (ex) item.excerpt = ex; }
    return item;
  });
}

// ── 기억 정규화 ──
export function normalizeMemories(rows) {
  const counts = { M1: 0, M2: 0, M3: 0 }, warnings = [];
  const memories = (Array.isArray(rows) ? rows : []).map((row, index) => {
    if (typeof row === "string") row = { event: row };
    const m = Array.isArray(row) ? { importance: row[0], time: row[1], place: row[2], event: row[3], change: row[4], quotes: row.slice(5).flat() } : row || {};
    let importance = /^M[0-3]$/.test(m.importance) ? m.importance : Object.keys(MEMORY_LABEL).find((k) => MEMORY_LABEL[k] === m.importance) || "M0";
    const quotes = (Array.isArray(m.quotes) ? m.quotes : [m.quotes]).filter((x) => typeof x === "string" && x.trim()).flatMap((q) => q.split(/,\s*(?=[CU]:)/));
    if (importance === "M0" && quotes.length) importance = "M1";
    if (importance === "M1" && !quotes.length) importance = "M0";
    const requested = importance;
    while (importance !== "M0" && counts[importance] >= MEMORY_LIMIT[importance]) importance = "M" + (Number(importance[1]) - 1);
    if (importance !== "M0") counts[importance]++;
    const keep = importance === "M0" ? [] : importance === "M1" ? quotes.slice(0, 1) : importance === "M2" ? quotes.slice(0, 2) : quotes;
    if (importance !== requested) warnings.push(`기억 중요도 상한에 따라 ${index + 1}번째를 ${importance}로 낮췄어요`);
    return { id: "E" + String(index + 1).padStart(4, "0"), importance, time: prose(m.time), place: prose(m.place), event: prose(m.event ?? m.description), change: prose(m.change ?? m.effect), quotes: keep };
  }).filter((m) => m.event.trim());
  return { memories, warnings };
}

// 카드 기억 한 줄. C:/U: 표기는 이름·{{user}}로 바꾼다.
export function memoryText(m, name) {
  const body = [MEMORY_LABEL[m.importance] ?? "경험", [m.time, m.place].filter(Boolean).join(" / "), m.event, m.change, ...(m.quotes ?? [])].filter(Boolean).join(" · ");
  return body.replace(/\bC:/g, `${name}:`).replace(/\bU:/g, `${ROLE}:`);
}
