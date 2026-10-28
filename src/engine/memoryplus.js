// v1.6.2 장기기억 확장(순수): 지식 경계·열린 항목·관계 변화·세계 시간선·기억 강화/망각·원문 발췌 복원.
import { similarity } from "./memorygrade.js";
import { extractMessageText, hashText } from "./chattext.js";
import { srcOf } from "./memoryreconcile.js";

const cut = (v, n) => String(v ?? "").trim().slice(0, n);
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const rid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const names = (v, n = 6) => [...new Set((Array.isArray(v) ? v : []).map((x) => cut(x, 60)).filter(Boolean))].slice(0, n);

export const OPEN_KINDS = Object.freeze({ promise: "약속", foreshadow: "복선", question: "의문" });
export const OPEN_CAP = 60, REL_CAP = 20;

// ── 분석 응답 검증: validate()가 부른다. people[].know 와 최상위 rel/open ──
export const validateKnow = (v) => names(v);
export function validatePlus(obj) {
  const rel = (Array.isArray(obj?.rel) ? obj.rel : []).map((x) => ({ from: cut(x?.from, 60), to: cut(x?.to, 60), d: cut(x?.d, 40), dir: x?.dir === "+" || x?.dir === "-" ? x.dir : "0" })).filter((x) => x.from && x.to && x.d && key(x.from) !== key(x.to)).slice(0, 4);
  const o = obj?.open ?? {};
  const add = (Array.isArray(o.add) ? o.add : []).map((x) => ({ text: cut(x?.text, 80), kind: OPEN_KINDS[x?.kind] ? x.kind : "question", who: names(x?.who, 4) })).filter((x) => x.text).slice(0, 3);
  const close = names(o.close, 3);
  return { rel, open: { add, close } };
}

// ── 반영 ──
// 관계 변화량: 같은 쌍(A→B)별로 최근 REL_CAP개만 유지.
export function applyRel(folder, rels, anchor, now = Date.now()) {
  folder.rels ??= {};
  let n = 0;
  const src = srcOf(anchor);
  for (const r of rels ?? []) {
    const k = key(r.from) + ">" + key(r.to), pair = folder.rels[k] ??= { from: r.from, to: r.to, items: [] };
    const last = pair.items.filter((i) => !i.orphan).at(-1);
    if (last && similarity(last.d, r.d) >= 0.8) continue;
    pair.items.push({ d: r.d, dir: r.dir, at: anchor?.at ?? null, at_ms: now, ...(src ? { src } : {}) }); n++;
    if (pair.items.length > REL_CAP) pair.items = pair.items.slice(-REL_CAP);
  }
  return n;
}
// 열린 항목: 추가(중복 제외)와 해결 닫기. 닫을 대상은 id만 인정한다.
export function applyOpen(folder, open, anchor, now = Date.now()) {
  folder.open ??= [];
  let added = 0, closed = 0;
  const src = srcOf(anchor);
  for (const a of open?.add ?? []) {
    if (folder.open.some((x) => !x.orphan && !isClosed(x) && similarity(x.text, a.text) >= 0.8)) continue;
    folder.open.push({ id: rid("o"), text: a.text, kind: a.kind, who: a.who ?? [], at: anchor?.at ?? null, at_ms: now, closed: false, ...(src ? { src } : {}) }); added++;
  }
  for (const id of open?.close ?? []) {
    const x = folder.open.find((o) => o.id === id && !o.orphan && !isClosed(o));
    if (x) {
      x.closed = true; x.closedAt = anchor?.at ?? null; x.closed_ms = now; closed++;
      delete x.closedOrphan; if (src) x.closedBy = src; else delete x.closedBy;
    }
  }
  if (folder.open.length > OPEN_CAP) {  // 해결된 것부터 오래된 순으로 정리
    const drop = new Set(folder.open.filter((x) => x.orphan || isClosed(x)).slice(0, folder.open.length - OPEN_CAP));
    folder.open = folder.open.filter((x) => !drop.has(x));
    if (folder.open.length > OPEN_CAP) folder.open = folder.open.slice(-OPEN_CAP);
  }
  return { added, closed };
}
// 닫힘 판정: 버린 분석이 닫은 항목(closedOrphan)은 열린 것으로 본다. 고아 항목(orphan)은 어느 쪽에도 들지 않는다.
export const isClosed = (x) => !!x.closed && !x.closedOrphan;
export const openItems = (folder, { closed = false } = {}) => (folder.open ?? []).filter((x) => !x.orphan && isClosed(x) === closed);
// 분석 입력에 넣을 열린 항목(모델이 id로 닫는다)
export const openForPrompt = (folder, n = 12) => openItems(folder).slice(-n).map((x) => ({ id: x.id, kind: x.kind, text: x.text }));

// 기억 강화: 같은 행동이 다시 기록되면 언급 횟수(m)와 마지막 언급 위치(lm)를 올린다.
export function reinforce(record, anchor) { record.m = (record.m ?? 1) + 1; if (anchor?.at != null) record.lm = anchor.at; return record; }

// ── 세계 시간선: 이야기 속 시각이 적힌 상황만, 메시지 순서대로 ──
export function timelineOf(folder) {
  return (folder.scenes ?? []).filter((s) => !s.orphan && s.when).map((s) => ({ id: s.id, at: s.at, when: s.when, place: s.place ?? "", sum: s.sum }))
    .sort((a, b) => (a.at ?? -1) - (b.at ?? -1));
}
export const currentStoryTime = (folder) => timelineOf(folder).at(-1)?.when ?? "";

// ── 주입용 점수: 언급 횟수·최근 사용으로 강화, 오래 안 쓰인 D·C는 망각 ──
// age 기준 위치: 마지막 언급(lm)·마지막 주입(lu) 중 가장 최근.
export const lastTouch = (r) => Math.max(r.at ?? -1, r.lm ?? -1, r.lu ?? -1);
export const strength = (r) => 1 + 0.3 * Math.min(4, (r.m ?? 1) - 1) + 0.1 * Math.min(5, r.u ?? 0);
export function forgotten(r, messageCount, forgetAfter = 150) {
  if (!forgetAfter || r.pin || r.user || (r.g !== "D" && r.g !== "C")) return false;
  if ((r.m ?? 1) > 1 && r.g === "C") return false;  // 여러 번 언급된 C는 잊지 않는다
  if (r.at == null) return false;
  return messageCount - lastTouch(r) > forgetAfter * (r.g === "C" ? 2 : 1);
}

// ── 주입 문장 ──
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
// 지식 경계: know가 있는 기록 = 비밀·제한적으로 목격된 일. 누가 아는지 명시한다.
export function knowLines(people, { limit = 4 } = {}) {
  const rows = [];
  for (const p of people) for (const r of p.records ?? []) if (!r.orphan && r.know?.length) rows.push({ r, who: p.name });
  rows.sort((a, b) => (lastTouch(b.r)) - (lastTouch(a.r)));
  return rows.slice(0, limit).map(({ r, who }) => `- ${oneLine(r.act)} (${who}) — only ${r.know.join(", ")} know this; others do not.`);
}
export function openLines(folder, { limit = 6 } = {}) {
  return openItems(folder).slice(-limit).map((x) => `- [${x.kind}] ${oneLine(x.text)}${x.who?.length ? ` (${x.who.join(", ")})` : ""}`);
}
// 관계 변화량: 쌍별 최근 3개 변화를 한 줄로. 최근에 움직인 쌍 우선.
export function relLines(folder, { limit = 5, relevant = null } = {}) {
  const pairs = Object.values(folder.rels ?? {}).map((p) => ({ ...p, items: (p.items ?? []).filter((i) => !i.orphan) })).filter((p) => p.items.length && (!relevant || relevant.has(key(p.from)) || relevant.has(key(p.to))));
  pairs.sort((a, b) => (b.items.at(-1).at_ms ?? 0) - (a.items.at(-1).at_ms ?? 0));
  return pairs.slice(0, limit).map((p) => `- ${p.from} → ${p.to}: ${p.items.slice(-3).map((i) => `${oneLine(i.d)}${i.dir === "+" ? " ↑" : i.dir === "-" ? " ↓" : ""}`).join("; ")}`);
}
// 핵심 순간 원문 복원: EX·S 기록의 앵커로 원문을 찾아 발췌. 해시가 다르면(수정·재생성) 건너뛴다.
export function sourceLines(folder, messages, { limit = 2, max = 260 } = {}) {
  const out = [];
  const rows = Object.values(folder.people ?? {}).flatMap((p) => (p.records ?? []).filter((r) => !r.orphan && (r.g === "EX" || r.g === "S") && r.at != null && r.h).map((r) => ({ r, who: p.name })));
  rows.sort((a, b) => (a.r.g === b.r.g ? lastTouch(b.r) - lastTouch(a.r) : a.r.g === "EX" ? -1 : 1));
  for (const { r, who } of rows) {
    const m = messages?.[r.at]; if (!m) continue;
    const text = extractMessageText(m);
    if (hashText(text) !== r.h) continue;
    const t = oneLine(text), i = Math.max(0, t.indexOf(oneLine(r.act).slice(0, 12)));
    out.push({ id: r.id, line: `- #${r.at + 1} ${who}: "${(t.length > max ? t.slice(Math.max(0, Math.min(i, t.length - max)), Math.max(0, Math.min(i, t.length - max)) + max) : t)}"` });
    if (out.length >= limit) break;
  }
  return out;
}
