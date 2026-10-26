// 카드 태그·스탯 정의 파서와 계산. 순수 함수.
// 형식: `이름:설명(ST)` = 스탯 정의, `이름:설명(스탯:수치,스탯:수치)` = 태그 정의, `#` 시작은 주석.
import { DEFAULT_TAG_TEXT } from "./defaulttags.js";
import { tagCountOf } from "./grade.js";

export { DEFAULT_TAG_TEXT };
const SPLIT = /[:：]/;

export function parseTags(text) {
  const stats = {}, tags = {}, errors = [], warnings = [];
  const rows = String(text ?? "").split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
  for (const row of rows) {
    const m = row.match(/^([^:：]+)[:：](.+)\(ST\)$/i);
    if (!m) continue;
    const n = m[1].trim();
    if (stats[n]) errors.push("중복 스탯: " + n);
    stats[n] = m[2].trim();
  }
  for (const row of rows) {
    if (/\(ST\)$/i.test(row)) continue;
    const m = row.match(/^([^:：]+)[:：](.*?)\(([^()]*)\)$/);
    if (!m) {
      const simple = row.match(/^([^:：]+)[:：](.+)$/);
      if (simple) {
        const name = simple[1].trim();
        if (tags[name]) errors.push("중복 태그: " + name);
        tags[name] = { description: simple[2].trim(), stats: {} };
      } else errors.push("태그 문법: " + row);
      continue;
    }
    const name = m[1].trim(), mods = {};
    if (tags[name]) errors.push("중복 태그: " + name);
    for (const part of m[3].split(/[,，]/)) {
      const v = part.trim().match(/^([^:：]+)[:：](-?\d+(?:\.\d+)?)$/);
      if (!v) { errors.push("스탯 수치: " + part); continue; }
      const k = v[1].trim();
      if (k in mods) errors.push("중복 보정: " + name + "/" + k);
      mods[k] = Number(v[2]);
      if (!stats[k]) errors.push("미정의 스탯: " + k);
    }
    if (!m[2].trim()) errors.push(name + ": 설명이 없습니다.");
    tags[name] = { description: m[2].trim(), stats: mods };
  }
  return { stats, tags, errors, warnings: [...new Set(warnings)] };
}

export const calcStats = (names, defs) => {
  const out = {};
  for (const t of names ?? []) for (const [k, v] of Object.entries(defs?.[t]?.stats ?? {})) out[k] = (out[k] ?? 0) + v;
  return out;
};
// 표시용 스탯: 50 기준 + 보정, 0~300.
export function displayStats(names, defs, statNames = []) {
  const mod = calcStats(names, defs), all = [...new Set([...statNames, ...Object.keys(mod)])];
  return Object.fromEntries(all.map((k) => [k, Math.min(300, Math.max(0, 50 + (Number(mod[k]) || 0)))]));
}

// 모델이 추천한 태그를 등급 수에 맞게 정리. 정의에 없는 태그는 모델이 준 설명·스탯으로 추가 정의(스탯 이름은 정의된 것만).
export function normalizeTags(value, parsed, grade) {
  const rows = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，|]/) : [];
  const picked = new Map(), warnings = [];
  for (const row of rows) {
    const obj = row && typeof row === "object" && !Array.isArray(row) ? row : null;
    const name = String(obj ? obj.name ?? obj.keyword ?? "" : row ?? "").trim();
    if (!name || picked.has(name)) continue;
    const stats = {};
    for (const [k, raw] of Object.entries(obj?.stats ?? {})) {
      if (!Object.hasOwn(parsed.stats ?? {}, k)) { warnings.push(`미정의 스탯 무시: ${name}/${k}`); continue; }
      const n = Number(raw); stats[k] = Number.isFinite(n) ? n : 0;
    }
    picked.set(name, { description: String(obj?.description ?? "").trim() || name, stats });
  }
  const names = [...picked.keys()].slice(0, tagCountOf(grade)), definitions = {}, additions = {};
  for (const n of names) {
    const known = parsed.tags?.[n];
    definitions[n] = structuredClone(known ?? picked.get(n));
    if (!known) additions[n] = structuredClone(definitions[n]);
  }
  return { names, definitions, additions, warnings };
}
export const tagCatalog = (parsed, { withStats = false } = {}) =>
  Object.entries(parsed?.tags ?? {}).map(([n, d]) => `${n}:${d.description}${withStats ? "(" + Object.entries(d.stats).map(([k, v]) => `${k}:${v}`).join(",") + ")" : ""}`).join("\n");
