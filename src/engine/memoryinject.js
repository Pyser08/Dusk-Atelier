// 장기기억 주입: 고정 예산으로 [Dusk Memory] 블록을 조립한다. 순수 함수.
import { GRADE_WEIGHT } from "./memorygrade.js";

export const MARKER = "[Dusk Memory";
export const HEADER = "[Dusk Memory — story so far. Use for continuity only; the recent messages take priority.]";
export const estimateTokens = (t) => { const s = String(t ?? ""); const ko = (s.match(/[\u3131-\u318e\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length; return Math.ceil(ko / 1.5 + (s.length - ko) / 4); };
const norm = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

export const shouldInject = (folder, settings, userTurns) => !!(settings?.on !== false && folder?.cursor && userTurns >= (settings?.fromTurn ?? 2));

function sceneLine(s, cap) {
  const place = s.place ? ` (${s.place})` : "";
  for (let n = (s.facts ?? []).length; n >= 0; n--) {
    const t = `Current scene: ${oneLine(s.sum)}${place}${n ? " — " + s.facts.slice(0, n).map(oneLine).join("; ") : ""}`;
    if (estimateTokens(t) <= cap) return t;
  }
  return `Current scene: ${oneLine(s.sum)}`.slice(0, Math.max(40, Math.floor(cap * 1.5)));
}

// ctx: {messageCount, recentText, settings:{targetTokens,capTokens,sceneTokens,recentSkip}}
export function buildBlock(folder, { messageCount = 0, recentText = "", settings = {} } = {}) {
  const target = settings.targetTokens ?? 1200, cap = settings.capTokens ?? 2500, sceneCap = settings.sceneTokens ?? 300, skip = settings.recentSkip ?? 8;
  const manifest = { included: [], excluded: [], tokens: 0 };
  const scenes = (folder.scenes ?? []).filter((s) => !s.orphan);
  const cur = scenes.at(-1);
  const lines = [HEADER];
  if (cur) lines.push(sceneLine(cur, sceneCap));
  const earlier = scenes.slice(-4, -1);
  if (earlier.length) { lines.push("Earlier scenes:"); for (const s of earlier) lines.push("- " + oneLine(s.sum).slice(0, 140)); }
  let used = estimateTokens(lines.join("\n")); manifest.included.push(...(cur ? [{ kind: "scene", id: cur.id, tokens: used }] : []));

  const recent = norm(recentText), inScene = new Set((cur?.who ?? []).map(norm));
  const cands = [];
  for (const p of Object.values(folder.people ?? {})) {
    const names = [p.name, ...(p.aliases ?? [])].map(norm).filter(Boolean);
    const group = names.some((n) => inScene.has(n)) ? 1 : names.some((n) => recent.includes(n)) ? 2 : p.pinned ? 3 : 4;
    const age = (r) => r.at == null ? 50 : Math.max(0, messageCount - r.at);
    const recs = (p.records ?? []).filter((r) => !r.orphan && (r.at == null || r.at < messageCount - skip) && !(p.digest && r.digested && (r.g === "D" || r.g === "C")));
    const scored = recs.map((r) => ({ r, s: (GRADE_WEIGHT[r.g] ?? 1) * Math.pow(0.97, age(r)) + (r.pin ? 50 : 0) })).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 5);
    if (!top.length && !p.digest) continue;
    const moments = top.sort((a, b) => (a.r.at ?? -1) - (b.r.at ?? -1)).map((x) => `(${x.r.g}) ${oneLine(x.r.act)}`);
    const text = `- ${p.name}: ${[p.digest ? oneLine(p.digest) : "", moments.length ? "Key moments: " + moments.join(", ") : ""].filter(Boolean).join(" / ")}`;
    cands.push({ name: p.name, group, best: (top[0]?.s ?? 0) + (p.pinned ? 50 : 0), text, tokens: estimateTokens(text) });
  }
  cands.sort((a, b) => a.group - b.group || b.best - a.best);
  const chars = [];
  for (const c of cands) {
    const limit = c.group <= 3 ? cap : target;
    if (used + c.tokens + 4 > limit) { manifest.excluded.push({ kind: "person", name: c.name, tokens: c.tokens, reason: "budget" }); continue; }  // 잘라 넣지 않고 통째로 제외
    chars.push(c.text); used += c.tokens; manifest.included.push({ kind: "person", name: c.name, tokens: c.tokens, group: c.group });
  }
  if (chars.length) lines.push("Characters:", ...chars);
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
