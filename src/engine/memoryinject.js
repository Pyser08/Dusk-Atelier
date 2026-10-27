// 장기기억 주입: 고정 예산으로 [Dusk Memory] 블록을 조립한다. 순수 함수.
import { GRADE_WEIGHT } from "./memorygrade.js";
import { lastTouch, strength, forgotten, knowLines, openLines, relLines, sourceLines, currentStoryTime } from "./memoryplus.js";

export const MARKER = "[Dusk Memory";
export const HEADER = "[Dusk Memory — story so far. Use for continuity only; the recent messages take priority.]";
export const estimateTokens = (t) => { const s = String(t ?? ""); const ko = (s.match(/[\u3131-\u318e\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length; return Math.ceil(ko / 1.5 + (s.length - ko) / 4); };
const norm = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

export const shouldInject = (folder, settings, userTurns) => !!(settings?.on !== false && folder?.cursor && userTurns >= (settings?.fromTurn ?? 1));

function sceneLine(s, cap) {
  const place = s.place ? ` (${s.place})` : "", when = s.when ? ` [${oneLine(s.when)}]` : "";
  for (let n = (s.facts ?? []).length; n >= 0; n--) {
    const t = `Current scene${when}: ${oneLine(s.sum)}${place}${n ? " — " + s.facts.slice(0, n).map(oneLine).join("; ") : ""}`;
    if (estimateTokens(t) <= cap) return t;
  }
  return `Current scene${when}: ${oneLine(s.sum)}`.slice(0, Math.max(40, Math.floor(cap * 1.5)));
}

// ctx: {messageCount, recentText, settings:{targetTokens,capTokens,sceneTokens,recentSkip}}
export function buildBlock(folder, { messageCount = 0, recentText = "", settings = {}, messages = null, focus = null } = {}) {
  const target = settings.targetTokens ?? 1200, cap = settings.capTokens ?? 2500, sceneCap = settings.sceneTokens ?? 300, skip = settings.recentSkip ?? 8;
  const manifest = { included: [], excluded: [], tokens: 0, recordIds: [] }, plus = settings.plus !== false;
  const scenes = (folder.scenes ?? []).filter((s) => !s.orphan);
  const cur = scenes.at(-1);
  const lines = [HEADER];
  if (cur) lines.push(sceneLine(cur, sceneCap));
  if (plus && cur && !cur.when && currentStoryTime(folder)) lines.push(`Story time (last known): ${oneLine(currentStoryTime(folder))}`);
  // Story so far: 이전 장면을 최신부터 이벤트 예산 안에서 채우고 시간순으로 출력(통째로만 포함)
  const evCap = settings.eventTokens ?? 600, evLines = []; let evUsed = 0;
  for (const s of scenes.slice(0, -1).reverse()) {
    const t = "- " + oneLine(s.sum) + (s.place ? ` (${s.place})` : ""), n = estimateTokens(t);
    if (evUsed + n > evCap) { manifest.excluded.push({ kind: "event", name: oneLine(s.sum).slice(0, 20), tokens: n, reason: "budget" }); break; }
    evLines.unshift(t); evUsed += n;
  }
  if (evLines.length) { lines.push("Story so far:", ...evLines); manifest.included.push({ kind: "events", tokens: evUsed, count: evLines.length }); }
  let used = estimateTokens(lines.join("\n")); manifest.included.push(...(cur ? [{ kind: "scene", id: cur.id, tokens: used }] : []));

  const recent = norm(recentText), inScene = new Set((cur?.who ?? []).map(norm));
  const focused = new Set((focus ?? []).map(norm));  // v1.6.4: 리수폿이 이번 턴에 고른 인물은 장면에 있는 것처럼 다룬다
  const cands = [];
  for (const p of Object.values(folder.people ?? {})) {
    const names = [p.name, ...(p.aliases ?? [])].map(norm).filter(Boolean);
    // 컨텍스트 모드(BardWiki 방식): never=제외, always=항상(고정 포함), auto=장면/최근 언급 등 관련 있을 때만
    const mode = p.ctx ?? (p.pinned ? "always" : "auto");
    if (mode === "never") { manifest.excluded.push({ kind: "person", name: p.name, tokens: 0, reason: "never" }); continue; }
    const rel = names.some((n) => inScene.has(n) || focused.has(n)) ? 1 : names.some((n) => recent.includes(n)) ? 2 : 0;
    if (mode === "auto" && !rel) { manifest.excluded.push({ kind: "person", name: p.name, tokens: 0, reason: "not-relevant" }); continue; }
    const group = mode === "always" ? 0 : rel;
    const age = (r) => r.at == null ? 50 : Math.max(0, messageCount - (plus ? lastTouch(r) : r.at));
    const recs = (p.records ?? []).filter((r) => !r.orphan && (r.at == null || r.at < messageCount - skip) && !(p.digest && r.digested && (r.g === "D" || r.g === "C")) && !(plus && forgotten(r, messageCount, settings.forgetAfter ?? 150)));
    const scored = recs.map((r) => ({ r, s: (GRADE_WEIGHT[r.g] ?? 1) * Math.pow(0.97, age(r)) * (plus ? strength(r) : 1) + (r.pin ? 50 : 0) })).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 5);
    if (!top.length && !p.digest) continue;
    const moments = top.sort((a, b) => (a.r.at ?? -1) - (b.r.at ?? -1)).map((x) => `(${x.r.g}) ${oneLine(x.r.act)}`);
    const text = `- ${p.name}: ${[p.digest ? oneLine(p.digest) : "", moments.length ? "Key moments: " + moments.join(", ") : ""].filter(Boolean).join(" / ")}`;
    cands.push({ name: p.name, ids: top.map((x) => x.r.id), group, best: (top[0]?.s ?? 0) + (p.pinned ? 50 : 0), text, tokens: estimateTokens(text) });
  }
  cands.sort((a, b) => a.group - b.group || b.best - a.best);
  const chars = [], included = new Set();
  for (const c of cands) {
    const limit = c.group === 0 ? cap : target;
    if (used + c.tokens + 4 > limit) { manifest.excluded.push({ kind: "person", name: c.name, tokens: c.tokens, reason: "budget" }); continue; }  // 잘라 넣지 않고 통째로 제외
    chars.push(c.text); used += c.tokens; manifest.included.push({ kind: "person", name: c.name, tokens: c.tokens, group: c.group }); manifest.recordIds.push(...c.ids); included.add(norm(c.name));
  }
  if (chars.length) lines.push("Characters (current state):", ...chars);
  if (plus) {  // v1.6.2: 열린 항목 · 관계 변화량 · 지식 경계 · 원문 발췌. 각각 자기 예산 안에서 줄 단위로, 전체 상한을 넘으면 통째로 뺀다.
    const rel = new Set([...included, ...inScene]);
    const add = (kind, title, rows, capTokens) => {
      const keep = []; let n = estimateTokens(title);
      for (const r of rows) { const t = estimateTokens(r); if (n + t > capTokens || used + n + t + 4 > cap) break; keep.push(r); n += t; }
      if (keep.length) { lines.push(title, ...keep); used += n; manifest.included.push({ kind, tokens: n, count: keep.length }); }
    };
    add("open", "Open threads (unresolved; do not resolve them early):", openLines(folder), settings.openTokens ?? 160);
    add("rel", "Relationship shifts (recent):", relLines(folder, { relevant: rel.size ? rel : null }), settings.relTokens ?? 140);
    add("know", "Knowledge limits (who knows what):", knowLines(Object.values(folder.people ?? {}).filter((p) => (p.ctx ?? "auto") !== "never")), settings.knowTokens ?? 160);
    if (messages) { const src = sourceLines(folder, messages, { limit: settings.srcCount ?? 2 }); add("src", "Source lines (verbatim from the story):", src.map((x) => x.line), settings.srcTokens ?? 300); manifest.recordIds.push(...src.map((x) => x.id)); }
  }
  if (!cur && !chars.length) return { text: "", manifest };
  const text = lines.join("\n"); manifest.tokens = estimateTokens(text);
  return { text, manifest };
}

const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("\n") : String(c ?? "");
// messages 사본에 블록을 삽입(이미 있으면 교체). position: "beforeLastUser" | "afterSystem"
export function insertBlock(messages, text, position = "beforeLastUser") {
  const list = (Array.isArray(messages) ? messages : []).filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(MARKER)));
  const block = { role: "system", content: text };
  let at;
  if (position === "afterSystem") { at = 0; while (at < list.length && list[at]?.role === "system") at++; }
  else { at = -1; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.role === "user") { at = i; break; } if (at < 0) at = list.length; }
  return [...list.slice(0, at), block, ...list.slice(at)];
}

// 훅이 없는 환경: 채팅 localLore의 관리 항목. 있으면 갱신, 없으면 추가(멱등). 반환: 새 localLore 배열
export const LORE_MARK = "da_mem";
export function upsertLoreEntry(localLore, text) {
  const list = Array.isArray(localLore) ? [...localLore] : [];
  const i = list.findIndex((e) => e?.extentions?.[LORE_MARK]);
  const entry = { key: "", secondkey: "", insertorder: 100, comment: "[Dusk 기억]", content: text, mode: "normal", alwaysActive: true, selective: false, useRegex: false, extentions: { [LORE_MARK]: true } };
  if (!text) return i < 0 ? list : list.filter((_, k) => k !== i);
  if (i >= 0) list[i] = { ...list[i], content: text, alwaysActive: true }; else list.push(entry);
  return list;
}
