// v1.6.4 회상(Recall, 순수): 리수폿이 고른 인물의 Dusk 기록을 골라 Director에 줄 참고 항목으로 만든다.
// 점수 = 등급 가중치 × 최근성 × 강화(언급·사용) × 키워드 일치 + 열린 항목·고정 보너스.
// 지식 경계: 고른 인물이 "모르는" 일은 따로 적어 정리 노트가 그 인물 입으로 말하지 않게 한다.
import { GRADE_WEIGHT } from "./memorygrade.js";
import { estimateTokens } from "./memoryinject.js";
import { lastTouch, strength, forgotten, openItems, relLines, sourceLines } from "./memoryplus.js";

const norm = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const words = (t) => [...new Set(String(t ?? "").toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}_]+/u).filter((w) => w.length >= 2))];

export const RECALL_DEFAULTS = Object.freeze({ tokens: 700, perPerson: 4, sourceCount: 1, forgetAfter: 150 });

// 키워드 보너스: 질의 낱말이 기록 문장에 들어 있을수록 가산(최대 +1.5배)
export function keywordBoost(act, qWords) {
  if (!qWords.length) return 1;
  const a = String(act ?? "").toLowerCase();
  let hit = 0; for (const w of qWords) if (a.includes(w)) hit++;
  return 1 + Math.min(1.5, hit * 0.5);
}

export function scoreRecord(r, { messageCount = 0, qWords = [], plus = true, openBonus = 0 } = {}) {
  const age = r.at == null ? 50 : Math.max(0, messageCount - (plus ? lastTouch(r) : r.at));
  return (GRADE_WEIGHT[r.g] ?? 1) * Math.pow(0.97, age) * (plus ? strength(r) : 1) * keywordBoost(r.act, qWords) + (r.pin ? 50 : 0) + openBonus;
}

// 이름(별칭 포함)이 names 중 하나와 맞는 인물만. names가 비면 빈 배열.
export function pickPeople(folder, names) {
  const want = new Set((names ?? []).map(norm).filter(Boolean));
  if (!want.size) return [];
  return Object.values(folder?.people ?? {}).filter((p) => [p.name, ...(p.aliases ?? [])].map(norm).some((n) => want.has(n)));
}

// 다른 사람의 비밀 기록 중 person이 알지 못하는 것(know 목록이 있고 person이 빠진 것)
export function unknownFor(folder, person, { limit = 3 } = {}) {
  const me = new Set([person.name, ...(person.aliases ?? [])].map(norm));
  const rows = [];
  for (const q of Object.values(folder?.people ?? {})) {
    if (q === person) continue;
    for (const r of q.records ?? []) {
      if (r.orphan || r.valid === false || !r.know?.length) continue;
      if (r.know.map(norm).some((k) => me.has(k))) continue;
      rows.push({ r, who: q.name });
    }
  }
  rows.sort((a, b) => lastTouch(b.r) - lastTouch(a.r));
  return rows.slice(0, limit).map(({ r, who }) => `${oneLine(r.act)} (${who})`);
}

// 반환: { items:[{source:"dusk", text}], recordIds, tokens, people:[이름] }
export function recallFor(folder, { names = [], query = "", messageCount = 0, messages = null, settings = {} } = {}) {
  const cfg = { ...RECALL_DEFAULTS, ...settings }, plus = settings.plus !== false;
  const out = { items: [], recordIds: [], tokens: 0, people: [] };
  if (!folder) return out;
  const people = pickPeople(folder, names);
  if (!people.length) return out;
  const qWords = words(query);
  const opens = openItems(folder);
  let used = 0;
  const push = (text, ids = []) => {
    const t = estimateTokens(text);
    if (used + t > cfg.tokens) return false;  // 잘라 넣지 않고 통째로 뺀다
    out.items.push({ source: "dusk", text }); out.recordIds.push(...ids); used += t; return true;
  };
  // 인물별 점수 상위 → 가장 좋은 기록이 높은 인물부터 넣는다
  const cands = people.map((p) => {
    const mine = opens.filter((o) => (o.who ?? []).map(norm).some((w) => [p.name, ...(p.aliases ?? [])].map(norm).includes(w)));
    const recs = (p.records ?? []).filter((r) => !r.orphan && r.valid !== false && !(plus && forgotten(r, messageCount, cfg.forgetAfter)));
    const scored = recs.map((r) => ({ r, s: scoreRecord(r, { messageCount, qWords, plus, openBonus: mine.length ? 0.5 : 0 }) })).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, cfg.perPerson);
    return { p, top, mine, best: (top[0]?.s ?? 0) + (p.pinned ? 50 : 0) };
  }).sort((a, b) => b.best - a.best);

  for (const c of cands) {
    const { p, top, mine } = c;
    if (!top.length && !p.digest && !mine.length) continue;
    const moments = [...top].sort((a, b) => (a.r.at ?? -1) - (b.r.at ?? -1)).map((x) => `(${x.r.g}) ${oneLine(x.r.act)}`);
    const parts = [p.digest ? oneLine(p.digest) : "", moments.length ? "Key moments: " + moments.join(", ") : "",
      mine.length ? "Open: " + mine.slice(-2).map((o) => `[${o.kind}] ${oneLine(o.text)}`).join("; ") : ""].filter(Boolean);
    const unknown = unknownFor(folder, p);
    if (unknown.length) parts.push("Does NOT know: " + unknown.join("; "));
    if (push(`- ${p.name}: ${parts.join(" / ")}`, top.map((x) => x.r.id))) out.people.push(p.name);
  }
  // 고른 인물들 사이의 관계 변화와 핵심 순간 원문 발췌(EX·S)
  const rel = relLines(folder, { relevant: new Set(people.map((p) => norm(p.name))) });
  if (rel.length) push("Relationship shifts: " + rel.map((l) => l.replace(/^- /, "")).join(" | "));
  if (messages && cfg.sourceCount > 0) {
    const src = sourceLines({ ...folder, people: Object.fromEntries(people.map((p) => [p.name, p])) }, messages, { limit: cfg.sourceCount });
    for (const s of src) if (push("Source line: " + s.line.replace(/^- /, ""), [s.id])) break;
  }
  out.tokens = used;
  return out;
}

// 리수폿 장기기억 참고({items, counts, characters})에 Dusk 회상을 합친다. 합치기 전 값은 바꾸지 않는다.
export function mergeMemory(memory, recall) {
  const base = memory ?? { items: [], counts: { hypa: 0, hypaplus: 0 }, characters: 0 };
  if (!recall?.items?.length) return base;
  return {
    items: [...(base.items ?? []), ...recall.items],
    counts: { ...(base.counts ?? {}), dusk: recall.items.length },
    characters: (base.characters ?? 0) + recall.items.reduce((n, i) => n + i.text.length, 0)
  };
}
