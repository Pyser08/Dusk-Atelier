// v1.7.1 주입 로어 편집(순수): 대화에 들어가는 [Dusk Memory] 블록을 줄 단위로 고치거나 숨기고, 내가 쓴 로어 줄을 더한다.
// 블록은 요청마다 저장된 기억에서 새로 만들어지므로, 수정은 '원래 줄'의 지문(key)에 붙는다.
// 원래 줄이 바뀌면(새 응답 분석 등) 그 수정은 더는 맞지 않아 '적용 안 됨'으로 따로 보이고, 내가 쓴 줄은 항상 남는다.
import { hashText } from "./chattext.js";
import { estimateTokens, HEADER } from "./memoryinject.js";

export const NOTES_TITLE = "Notes written by the user (treat as established story facts):";
export const NOTE_MAX = 200, EDIT_MAX = 300;
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export const lineKey = (text) => hashText(norm(text));
const isTitle = (l) => !l.startsWith("- ") && /:\s*$/.test(l) && !l.startsWith("Current scene") && !l.startsWith("Story time");
export const emptyLore = () => ({ v: 1, edit: {}, hide: {}, add: [] });

// 블록 글 → 구획 목록 [{title, lines:[{key, text}]}]. 제목 없는 줄(현재 상황 등)은 title ""에 모은다.
export function splitBlock(text) {
  const out = [], rows = String(text ?? "").split("\n").filter((l) => l.trim());
  let cur = { title: "", lines: [] };
  const push = () => { if (cur.lines.length || cur.title) out.push(cur); };
  for (const raw of rows) {
    if (raw.startsWith("[Dusk Memory")) continue;  // 머리말 줄은 고치지 않는다
    if (isTitle(raw)) { push(); cur = { title: raw, lines: [] }; continue; }
    cur.lines.push({ key: lineKey(raw), text: raw });
  }
  push();
  return out;
}
const activeNotes = (lore) => (lore?.add ?? []).filter((n) => n.on !== false && norm(n.text));

// 수정을 적용한 최종 글. 숨긴 줄은 빼고, 고친 줄은 바꾸고(원래 '- ' 머리 유지), 내 로어는 맨 아래 구획에 넣는다. 줄이 없어진 구획 제목은 뺀다.
export function applyLore(text, lore) {
  const notes = activeNotes(lore), has = (lore?.edit && Object.keys(lore.edit).length) || (lore?.hide && Object.keys(lore.hide).length);
  if (!notes.length && !has) return String(text ?? "");
  const out = [];
  const secs = splitBlock(text);
  for (const s of secs) {
    const keep = [];
    for (const l of s.lines) {
      if (lore?.hide?.[l.key]) continue;
      const e = lore?.edit?.[l.key];
      if (e && norm(e.text)) keep.push(l.text.startsWith("- ") && !e.text.startsWith("- ") ? "- " + norm(e.text) : norm(e.text)); else keep.push(l.text);
    }
    if (!keep.length) continue;
    if (s.title) out.push(s.title);
    out.push(...keep);
  }
  if (notes.length) out.push(NOTES_TITLE, ...notes.map((n) => "- " + norm(n.text)));
  if (!out.length) return "";
  return [HEADER, ...out].join("\n");
}
export const loreTokens = (text) => estimateTokens(text);

// 화면용: 원래 블록의 구획에 수정·숨김 상태를 붙이고, 더는 맞지 않는 수정(stale)을 모은다.
export function loreView(rawText, lore) {
  const secs = splitBlock(rawText), alive = new Set();
  const sections = secs.map((s) => ({ title: s.title, lines: s.lines.map((l) => {
    alive.add(l.key);
    const e = lore?.edit?.[l.key];
    return { key: l.key, orig: l.text, text: e && norm(e.text) ? e.text : l.text, edited: !!(e && norm(e.text)), hidden: !!lore?.hide?.[l.key] };
  }) }));
  const stale = [
    ...Object.entries(lore?.edit ?? {}).filter(([k]) => !alive.has(k)).map(([k, e]) => ({ key: k, kind: "edit", from: e.from ?? "", text: e.text })),
    ...Object.entries(lore?.hide ?? {}).filter(([k]) => !alive.has(k)).map(([k, from]) => ({ key: k, kind: "hide", from: typeof from === "string" ? from : "", text: "" }))
  ];
  return { sections, stale, notes: lore?.add ?? [] };
}

// ── 편집 동작(폴더의 lore를 직접 바꾼다) ──
const L = (f) => (f.lore ??= emptyLore());
export function editLine(f, key, orig, text) {
  const t = norm(text).slice(0, EDIT_MAX), lore = L(f);
  if (!t || t === norm(orig)) { delete lore.edit[key]; return; }
  lore.edit[key] = { from: norm(orig).slice(0, 80), text: t }; delete lore.hide[key];
}
export function hideLine(f, key, orig, hidden = true) {
  const lore = L(f);
  if (hidden) { lore.hide[key] = norm(orig).slice(0, 80); delete lore.edit[key]; } else delete lore.hide[key];
}
export function resetLine(f, key) { const lore = L(f); delete lore.edit[key]; delete lore.hide[key]; }
export function dropStale(f, key) { const lore = L(f); delete lore.edit[key]; delete lore.hide[key]; }
export function addNote(f, text) {
  const t = norm(text).slice(0, NOTE_MAX); if (!t) return null;
  const n = { id: "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t, on: true };
  L(f).add.push(n); return n.id;
}
export function editNote(f, id, patch) {
  const n = L(f).add.find((x) => x.id === id); if (!n) return false;
  if (patch.text != null) { const t = norm(patch.text).slice(0, NOTE_MAX); if (!t) return false; n.text = t; }
  if (patch.on != null) n.on = !!patch.on;
  return true;
}
export function deleteNote(f, id) { const lore = L(f), n = lore.add.length; lore.add = lore.add.filter((x) => x.id !== id); return lore.add.length < n; }
export function resetLore(f) { f.lore = emptyLore(); }
export const hasLoreEdits = (f) => !!f?.lore && (Object.keys(f.lore.edit ?? {}).length + Object.keys(f.lore.hide ?? {}).length + (f.lore.add ?? []).length > 0);
