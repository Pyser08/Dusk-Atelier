// v1.8.2 이미지 태그 알림 (순수 로직, 추가 AI 호출 없음).
// 긴 태그 지침은 프롬프트 앞쪽에 묻혀 모델이 잊기 쉽다 → 요청 사본 끝(마지막 사용자 메시지 바로 앞)에 짧은 알림을 붙인다.
// 알림에는 지금 장면 캐릭터의 직전 옷·태그(요청 기록에서 읽음)와 그 옷에서 쓸 수 있는 실제 키워드만 넣는다.
import { readTags, sceneState } from "./imgtagfix.js";

export const HINT_MARK = "[Dusk · image tag check]";
const MAX = 2800, MAX_CHARS = 6, RECENT = 3, SCAN = 20;
const DEFAULTISH = new Set(["default", "neutral", "idle", "normal"]);

export const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("\n") : String(c?.text ?? ""));
const wordsOf = (name) => String(name).toLowerCase().split(/[\s_\-.]+/).filter((w) => w.length >= 3);
function mentions(text, char) {
  const low = String(text).toLowerCase();
  return wordsOf(char.name).some((w) => new RegExp(`(^|[^a-z])${w.replace(/[^a-z0-9]/g, "\\$&")}([^a-z]|$)`).test(low));
}

// 지금 장면 캐릭터: 최근 응답의 태그(최근 것 먼저) → 마지막 두 글에 이름이 나온 캐릭터. 최대 6명.
export function presentChars(texts, idx, state) {
  const list = texts ?? [], out = [];
  const add = (c) => { if (c && !out.includes(c) && out.length < MAX_CHARS) out.push(c); };
  const from = Math.max(0, list.length - RECENT);
  const byTurn = Object.entries(state ?? {}).filter(([, s]) => s.turn >= from).sort((a, b) => b[1].turn - a[1].turn);
  for (const [name] of byTurn) add(idx.chars.get(name));
  for (const t of list.slice(-2).reverse()) for (const c of idx.chars.values()) if (mentions(t, c)) add(c);
  return out;
}

const isDefaultOnly = (c) => c.entries.every((e) => DEFAULTISH.has(e.nk));

export function buildHint({ idx, state, present }) {
  if (!idx?.size || !present?.length) return "";
  const head = [
    HINT_MARK,
    "Image tags must use the exact asset names below — never invent, translate, abbreviate or merge them. One keyword per tag.",
    "Never add a file extension (.png, .webp, .jpg) unless the asset name itself has one.",
    "Choose by what the character is doing right now: NSFW action > interaction > emotion > default.",
    "The state below only shows what your last tags were. If the action or its stage changed, switch to the matching tag; if it ended, go back to an emotion tag.",
    "Keep each character's current outfit unless the story clearly changes their clothes. If the action keyword you need exists only in another outfit, use that outfit.",
  ];
  const lastRaw = Object.values(state ?? {}).sort((a, b) => b.turn - a.turn)[0]?.raw;
  if (lastRaw) head.push(`Use the same tag format as before, e.g. ${lastRaw}`);
  const stateLines = [], kwLines = [], seen = new Map();
  for (const c of present) {
    const s = state?.[c.name];
    if (c.entries.every((e) => e.nk === "")) { stateLines.push(`- ${c.name} — name only`); continue; }
    if (isDefaultOnly(c)) { stateLines.push(`- ${c.name} — default only`); continue; }
    const outfits = [...c.outfits.values()];
    const outfit = s ? c.outfits.get(s.outfit ?? "") : outfits.length === 1 ? outfits[0] : null;
    const fresh = s && !(s.age > 1);   // 마지막 두 응답보다 오래된 태그는 '마지막 태그'로 알리지 않는다(고정 방지). 옷은 계속 알린다.
    if (s && fresh) stateLines.push(`- ${c.name} — ${s.outfit != null ? `outfit: ${s.outfit} · ` : ""}last tag: ${s.raw}${s.streak >= 3 ? ` (used in ${s.streak} replies in a row — change it if the scene moved on)` : ""}`);
    else if (s && s.outfit != null) stateLines.push(`- ${c.name} — outfit: ${s.outfit}`);
    else if (s) stateLines.push(`- ${c.name}`);
    else if (outfits.length > 1) { stateLines.push(`- ${c.name} — outfits: ${outfits.map((o) => o.name).join(", ")}`); continue; }
    else stateLines.push(`- ${c.name}`);
    if (!outfit) continue;
    const kws = outfit.entries.map((e) => e.kw), sig = kws.join("\u0001");
    const label = outfit.name != null ? `${c.name} (${outfit.name})` : c.name;
    kwLines.push(seen.has(sig) ? `- ${label}: same as ${seen.get(sig)}` : `- ${label}: ${kws.join(", ")}`);
    if (!seen.has(sig)) seen.set(sig, c.name);
  }
  const body = [...head, "Characters in the scene now:", ...stateLines];
  const withKw = [...body, "Keywords for each current outfit:", ...kwLines].join("\n");
  return kwLines.length && withKw.length <= MAX ? withKw : body.join("\n");
}

// 마지막 사용자 메시지 바로 앞에 system 메시지로 넣는다(이전 알림은 지움). 원본 배열은 바꾸지 않는다.
export function insertHint(messages, hint) {
  const list = (Array.isArray(messages) ? messages : []).filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(HINT_MARK)));
  if (!hint) return list;
  let at = list.length;
  for (let i = list.length - 1; i >= 0; i--) if (list[i]?.role === "user") { at = i; break; }
  return [...list.slice(0, at), { role: "system", content: hint }, ...list.slice(at)];
}

// 요청 메시지 → { hint, state } | null (이미지 태그를 쓰지 않는 봇이면 null)
export function hintForMessages(messages, idx) {
  if (!idx?.size || !Array.isArray(messages)) return null;
  const all = messages.filter((m) => !(m?.role === "system" && textOf(m.content).startsWith(HINT_MARK)));
  if (!all.some((m) => /<img\b/i.test(textOf(m?.content)))) return null;
  const texts = all.filter((m) => m?.role !== "system").map((m) => textOf(m.content));
  const replies = all.filter((m) => m?.role === "assistant" || m?.role === "char" || m?.role === "model").map((m) => textOf(m.content)).slice(-SCAN);   // 최근 응답만(긴 채팅에서도 가볍게)
  const state = sceneState(replies.length ? replies : texts, idx);
  // 차례 번호를 전체 글 기준으로 맞춘다(presentChars가 '최근 몇 개'를 셀 때 사용)
  const count = replies.length ? replies.length : texts.length, off = texts.length - count;
  for (const s of Object.values(state)) { s.age = count - 1 - s.turn; s.turn += off; }
  const hint = buildHint({ idx, state, present: presentChars(texts, idx, state) });
  return { hint, state };
}

export { readTags };
