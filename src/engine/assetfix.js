// v1.8.2 에셋 태그 고치기(도구 탭, 수동). 순수 로직.
// 흐름: 고른 범위의 응답을 엔진으로 검사(scanReplies) → (선택) 엔진이 못 고친 것 또는 전부를 보조모델에 물음(aiItems·aiMessages)
// → 답을 실제 키워드 목록으로 검증(parseAiReply) → 바뀔 줄 목록(changeRows) → 고른 줄만 글에 반영(applyRows).
// 동작 우선(사용자 결정): 고른 동작이 다른 옷에만 있으면 그 옷으로 바뀐다. 보조모델은 그 캐릭터의 실제 키워드 중에서만 고를 수 있다.
import { tagSpans, renderTag, resolveTag, sceneState, norm } from "./imgtagfix.js";

export const MAX_ITEMS = 80;
const CTX_BEFORE = 360, CTX_AFTER = 220;

// msgs: [{ key, text }] 오래된 것 → 최신. before: 범위 앞 응답 글(직전 옷 기억용)
export function scanReplies(msgs, idx, { before = [] } = {}) {
  const state = sceneState(before, idx), streak = {};
  return (msgs ?? []).map((m, mi) => {
    const text = String(m.text ?? "");
    const tags = tagSpans(text).map((sp, si) => {
      if (sp.template) return { si, sp, decision: { remove: "template" }, engine: "template" };
      const r = resolveTag(idx, sp.payload, state);
      if (r.remove) return { si, sp, decision: { remove: r.remove }, engine: r.remove };
      if (r.keep) return { si, sp, decision: { keep: true }, engine: "keep", unresolved: "keep", charName: r.char };
      const t = { si, sp, decision: { name: r.name }, engine: r.kind, entry: r.entry };
      if (r.kind === "default") t.unresolved = "default";
      return t;
    });
    const lastHere = new Map();
    for (const t of tags) if (t.entry) lastHere.set(t.entry.char, t);
    for (const [char, t] of lastHere) {
      const p = streak[char];
      const n = p && p.name === t.decision.name && p.mi === mi - 1 ? p.n + 1 : 1;
      streak[char] = { name: t.decision.name, n, mi };
      if (n >= 3 && !t.unresolved) t.unresolved = "repeat";
    }
    Object.assign(state, sceneState([rebuild(text, tags)], idx));
    return { key: m.key, text, tags };
  });
}

// 결정대로 글을 다시 만든다. pickName(t) → 넣을 이름 | null(지움) | undefined(그대로)
function rebuild(text, tags, pickName = (t) => (t.decision.name ? t.decision.name : t.decision.remove ? null : undefined)) {
  let out = "", last = 0;
  for (const t of tags) {
    const v = pickName(t);
    if (v === undefined) continue;
    const { start, end } = t.sp;
    if (v !== null) { out += text.slice(last, start) + renderTag(t.sp, v); last = end; continue; }
    const before = text.slice(0, start), after = text.slice(end);
    const alone = /(^|\n)[ \t]*$/.test(before) && /^[ \t]*(\n|$)/.test(after);
    let head = text.slice(last, start), next = end;
    if (alone) {
      head = head.replace(/[ \t]*$/, "");
      next += /^[ \t]*/.exec(after)[0].length;
      if (text[next] === "\n") next++;
      while ((out + head).endsWith("\n\n") && text[next] === "\n") next++;
    }
    out += head; last = next;
  }
  return out + text.slice(last);
}

const engineChanged = (t) => (t.decision.remove ? true : t.decision.name ? renderTag(t.sp, t.decision.name) !== t.sp.raw : false);
const contextOf = (text, sp) => {
  const a = Math.max(0, sp.start - CTX_BEFORE), b = Math.min(text.length, sp.end + CTX_AFTER);
  const strip = (s) => s.replace(/<img\b[^<>]*>/gi, "[img]").replace(/\s+/g, " ").trim();
  return `${strip(text.slice(a, sp.start))} ⟦THIS TAG⟧ ${strip(text.slice(sp.end, b))}`;
};

// 보조모델에 보낼 항목. mode: "unresolved"(엔진이 못 고친 것만) | "all"(태그 전부). 최신 응답의 태그부터 MAX_ITEMS개.
export function aiItems(scan, idx, { mode = "unresolved" } = {}) {
  const items = [], sets = {}, sig = new Map();
  const setOf = (pool) => {
    const kwsList = [...new Set(pool.map((e) => e.kw))], key = kwsList.join("\u0001");
    if (!sig.has(key)) { const id = `S${sig.size + 1}`; sig.set(key, id); sets[id] = kwsList; }
    return sig.get(key);
  };
  const cand = [];
  scan.forEach((r, mi) => r.tags.forEach((t) => {
    if (t.decision.remove) return;
    if (mode !== "all" && !t.unresolved) return;
    const char = t.entry ? idx.chars.get(t.entry.char) : t.charName ? idx.chars.get(t.charName) : null;
    if (!char) return;
    const outfit = t.entry ? char.outfits.get(t.entry.outfit ?? "") : null;
    const pool = char.entries;   // 동작 우선: 그 캐릭터의 모든 옷 키워드에서 고를 수 있다(같은 옷에 있으면 그 옷으로)
    if (new Set(pool.map((e) => e.nk)).size < 2) return;   // 고를 것이 없음(스탠딩·예외 캐릭터)
    cand.push({ mi, si: t.si, t, char, outfit, pool, text: r.text });
  }));
  for (const c of cand.slice(-MAX_ITEMS)) {
    const it = {
      id: items.length + 1, mi: c.mi, si: c.si, char: c.char.name, outfit: c.outfit?.name ?? null,
      kw: c.t.entry?.kw ?? null, wrote: c.t.engine === "exact" ? null : c.t.sp.payload,
      why: c.t.unresolved ?? null, set: setOf(c.pool), text: contextOf(c.text, c.t.sp), pool: c.pool, outfitObj: c.outfit,
    };
    items.push(it);
  }
  return { items, sets, skipped: Math.max(0, cand.length - MAX_ITEMS) };
}

const SYSTEM = [
  "You review character image tags in a roleplay log. Each item gives the text around one tag (marked ⟦THIS TAG⟧), the character, its outfit, the current keyword, and the id of the allowed keyword set for that character and outfit.",
  "Change an item only when its keyword clearly does not fit what that character is doing or feeling at that point — e.g. an emotion keyword during an ongoing sexual act or skinship when a matching action keyword exists, the wrong action, or the wrong stage of an action (start / ongoing / climax / after).",
  "Prefer action and interaction keywords over emotions when the text shows that action. If the current keyword is reasonable, leave the item out.",
  "\"why\" on an item explains what the checker noticed: default = the original keyword did not exist and was replaced with default; keep = the tag could not be matched; repeat = the same tag was used in 3+ replies in a row.",
  "Never change the character. Keep the outfit unless the action you choose exists only in another outfit (the outfit then follows the action). Use only keywords from that item's allowed set, spelled exactly as listed.",
  'Reply with JSON only: {"changes":[{"id":1,"kw":"keyword","why":"짧은 한국어 이유"}]}. Use an empty list if nothing needs to change.',
].join("\n");

export function aiMessages(req, { instruction = "" } = {}) {
  const payload = {
    ...(instruction.trim() ? { botRules: instruction.trim() } : {}),
    sets: req.sets,
    items: req.items.map(({ id, char, outfit, kw, wrote, why, set, text }) => ({ id, char, ...(outfit != null ? { outfit } : {}), kw, ...(wrote ? { wrote } : {}), ...(why ? { why } : {}), set, text })),
  };
  return [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(payload) }];
}

function parseJsonLoose(raw) {
  const s = String(raw ?? ""), a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { try { return JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1")); } catch { return null; } }
}

// 보조모델 답 → [{ id, mi, si, name, why }] (+ notes: 버린 이유). 실제 키워드 목록에 있는 것만, 지금과 같으면 버린다.
export function parseAiReply(raw, req) {
  const out = []; out.notes = [];
  const obj = parseJsonLoose(raw);
  const list = Array.isArray(obj?.changes) ? obj.changes : Array.isArray(obj) ? obj : [];
  const seen = new Set();
  for (const c of list) {
    const it = req.items.find((x) => x.id === Number(c?.id));
    if (!it || seen.has(it.id)) continue;
    const want = norm(c?.kw);
    const e = it.outfitObj?.entries.find((x) => x.nk === want) ?? it.pool.find((x) => x.nk === want);   // 같은 옷에 있으면 그 옷, 없으면 그 동작이 있는 옷
    if (!e) { out.notes.push(`${it.char}: 목록에 없는 키워드 '${String(c?.kw ?? "")}'는 버렸어요.`); continue; }
    if (e.kw === it.kw && (e.outfit ?? null) === (it.outfit ?? null)) continue;
    seen.add(it.id);
    out.push({ id: it.id, mi: it.mi, si: it.si, name: e.name, why: String(c?.why ?? "").slice(0, 120) });
  }
  return out;
}

// 미리보기 줄: [{ id:"mi:si", mi, si, key, from, to(null=지움), by:"engine"|"ai", why }]
export function changeRows(scan, aiChanges = []) {
  const ai = new Map(aiChanges.map((c) => [`${c.mi}:${c.si}`, c]));
  const rows = [];
  scan.forEach((r, mi) => r.tags.forEach((t) => {
    const id = `${mi}:${t.si}`, a = ai.get(id);
    if (a) rows.push({ id, mi, si: t.si, key: r.key, from: t.sp.raw, to: renderTag(t.sp, a.name), name: a.name, by: "ai", why: a.why });
    else if (engineChanged(t)) rows.push({ id, mi, si: t.si, key: r.key, from: t.sp.raw, to: t.decision.name ? renderTag(t.sp, t.decision.name) : null, name: t.decision.name ?? null, by: "engine", why: t.engine });
  }));
  return rows;
}

// 고른 줄만 반영한 새 글. → [{ key, before, after }] (바뀐 응답만)
export function applyRows(scan, rows, pickedIds) {
  const picked = new Set(pickedIds ?? []), byId = new Map(rows.map((r) => [r.id, r]));
  const out = [];
  scan.forEach((r, mi) => {
    const after = rebuild(r.text, r.tags, (t) => {
      const id = `${mi}:${t.si}`;
      if (!picked.has(id) || !byId.has(id)) return undefined;
      return byId.get(id).name ?? null;
    });
    if (after !== r.text) out.push({ key: r.key, before: r.text, after });
  });
  return out;
}

// 장기기억 폴더 안의 메시지 식별자 문자열을 바꾼다(정확히 같은 문자열만). 바꾼 개수.
export function renameIds(obj, map) {
  let n = 0;
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === "string") { if (map.has(v)) { o[k] = map.get(v); n++; } }
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(obj);
  return n;
}
