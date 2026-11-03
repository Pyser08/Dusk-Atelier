// 인물 위키의 '정리된 정보'를 봇 로어북(globalLore) 항목으로 바꾸는 순수 함수 (v1.8.3).
// 기억 기록(사건 목록)은 넣지 않는다 — 위키 문서의 개요·관계·말투 같은 정리된 글과 기본 성격만.
// 로어북 항목에는 표식(extentions.da_wiki = 인물 이름)을 달아, 다시 내보내면 새로 쌓지 않고 그 항목만 갱신한다.
import { groupInfo, recordGroupOf } from "./personrecords.js";

export const WIKI_LORE_MARK = "da_wiki";
// 기본으로 빼는 묶음: 비밀·성적 태도·불륜 의심은 로어북에 박제하지 않는다(필요하면 직접 쓴다)
const SKIP_GROUPS = new Set(["secret", "openness", "suspicion"]);
const norm = (s) => String(s ?? "").replace(/\r/g, "").trim();
const list = (a) => (Array.isArray(a) ? a.map(norm).filter(Boolean) : []);
export const nameKeyOf = (doc) => norm(doc?.title);

// 글 만들기. 반환 "" 이면 내보낼 정리 정보가 없는 것.
export function wikiLoreText(doc, profile, { maxChars = 2000 } = {}) {
  const name = nameKeyOf(doc);
  if (!name) return "";
  const lines = [];
  const p = profile ?? {};
  if (norm(p.summary)) lines.push(`요약: ${norm(p.summary)}`);
  if (list(p.coreTraits).length) lines.push(`기질: ${list(p.coreTraits).join(", ")}`);
  if (list(p.values).length) lines.push(`중요 가치: ${list(p.values).join(", ")}`);
  if (norm(p.emotionExpression)) lines.push(`감정 표현 방식: ${norm(p.emotionExpression)}`);
  if (norm(p.defenseResponse)) lines.push(`방어 반응: ${norm(p.defenseResponse)}`);
  const blocks = [];
  const seen = new Map();
  for (const s of doc?.sections ?? []) {
    const body = norm(s?.body);
    if (!body) continue;
    const g = recordGroupOf(s) ?? "etc";
    if (SKIP_GROUPS.has(g)) continue;
    const label = groupInfo(g)?.label ?? (norm(s.heading) || "기타");
    if (!seen.has(label)) { seen.set(label, []); blocks.push(label); }
    seen.get(label).push(body);
  }
  const head = `[인물 정보: ${name}]`;
  const parts = [head, ...lines];
  for (const label of blocks) parts.push(`■ ${label}\n${seen.get(label).join("\n")}`);
  if (parts.length === 1) return "";
  // 길이 제한: 구획 단위로 자르고 잘렸음을 표시한다
  let out = "";
  for (const part of parts) {
    const next = out ? `${out}\n${part}` : part;
    if (next.length > maxChars) { out = out ? `${out}\n…(길어서 일부만 넣었어요)` : part.slice(0, maxChars) + "…"; break; }
    out = next;
  }
  return out;
}

// 로어북 항목 하나. 키는 이름·별칭(그 인물이 언급될 때 켜짐).
export function wikiLoreEntry(doc, profile, opts = {}) {
  const content = wikiLoreText(doc, profile, opts);
  if (!content) return null;
  const keys = [...new Set([nameKeyOf(doc), ...list(doc.aliases)].filter(Boolean))];
  return { key: keys.join(", "), secondkey: "", insertorder: 100, comment: `[Dusk 위키] ${nameKeyOf(doc)}`, content, mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { [WIKI_LORE_MARK]: nameKeyOf(doc) } };
}

// 위키에서 내보낼 수 있는 인물 목록(정리된 정보가 있는 것만)
export function wikiLoreCandidates(wiki, opts = {}) {
  const out = [];
  for (const doc of Object.values(wiki?.documents ?? {})) {
    if (doc?.type !== "Character") continue;
    const entry = wikiLoreEntry(doc, wiki?.people?.profiles?.[doc.id], opts);
    if (entry) out.push({ id: doc.id, name: nameKeyOf(doc), entry, chars: entry.content.length });
  }
  return out;
}

// 봇 로어북에 넣기(멱등): 같은 표식의 항목은 글만 갱신(내가 고친 키는 그대로), 없으면 끝에 더한다. 다른 항목은 건드리지 않는다.
export function upsertWikiLore(globalLore, entries) {
  const lore = Array.isArray(globalLore) ? [...globalLore] : [];
  let added = 0, updated = 0, unchanged = 0;
  for (const e of entries) {
    const mark = e?.extentions?.[WIKI_LORE_MARK];
    if (!mark) continue;
    const i = lore.findIndex((x) => x?.extentions?.[WIKI_LORE_MARK] === mark);
    if (i < 0) { lore.push(structuredClone(e)); added++; continue; }
    if (lore[i].content === e.content) { unchanged++; continue; }
    lore[i] = { ...lore[i], content: e.content, comment: lore[i].comment || e.comment, key: String(lore[i].key ?? "").trim() ? lore[i].key : e.key };
    updated++;
  }
  return { list: lore, added, updated, unchanged };
}
// 이미 들어 있는 인물 표식 집합(화면에서 '이미 있음' 표시용)
export const existingWikiMarks = (globalLore) => new Set((Array.isArray(globalLore) ? globalLore : []).map((x) => x?.extentions?.[WIKI_LORE_MARK]).filter(Boolean));
