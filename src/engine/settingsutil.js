// 기억 설정 도우미(순수): 변경 이력 10개 · 프리셋 공유 코드 · 설정 검색 · 범위 칩 이름. 화면 코드 없이 시험할 수 있다.
export const HIST_MAX = 10;
export const SHARE_PREFIX = "DAMEM1:";

export const SCOPE_CHIPS = { all: "모든 봇", bot: "이 봇", chat: "이 채팅" };
export const scopeChipLabel = (kind) => SCOPE_CHIPS[kind] ?? "";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 바뀐 항목 이름 목록. 한 단계 아래 객체까지 'a.b'로 본다. 배열·값은 통째로 비교.
export function changedKeys(before, after) {
  const out = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    const a = before?.[k], b = after?.[k];
    if (same(a, b)) continue;
    const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
    if (plain(a) && plain(b)) { for (const s of new Set([...Object.keys(a), ...Object.keys(b)])) if (!same(a[s], b[s])) out.push(`${k}.${s}`); }
    else out.push(k);
  }
  return out;
}

// 이력 목록 앞에 하나 더한다(최신이 맨 앞, 최대 HIST_MAX). 바뀐 게 없으면 그대로. area: "flow"(기억 흐름) | "dusk"(Dusk 기록·주입)
// 되돌리기용으로는 바뀐 큰 항목의 ‘이전 값’만 담는다(모델·API 키 묶음은 절대 담지 않는다).
export function pushHist(list, area, before, after, now = Date.now(), max = HIST_MAX) {
  const keys = changedKeys(before, after);
  const top = [...new Set(keys.map((k) => k.split(".")[0]))].filter((k) => k !== "models");
  if (!top.length) return list ?? [];
  const prev = {}; for (const k of top) if (before && k in before) prev[k] = structuredClone(before[k]);
  const shown = keys.filter((k) => k.split(".")[0] !== "models");
  const entry = { at: now, area, keys: shown.slice(0, 6), more: Math.max(0, shown.length - 6), top, before: prev };
  return [entry, ...(list ?? [])].slice(0, max);
}

// 이력 항목의 이전 값을 설정 객체에 되돌려 쓴다(이전에 없던 항목은 지운다).
export function applyBefore(settings, entry) {
  for (const k of entry.top ?? []) { if (k in (entry.before ?? {})) settings[k] = structuredClone(entry.before[k]); else delete settings[k]; }
  return settings;
}

// 이력에서 i번째로 되돌릴 때 쓸 값과, 그 항목 및 더 최근 항목을 뺀 새 목록
export function takeHist(list, i) {
  const e = list?.[i]; if (!e) return null;
  return { entry: e, rest: list.slice(i + 1) };
}

const SECRET = /(api.?key|secret|password|credential|oauth|auth.?token|access.?token|refresh.?token)/i;
// 공유해도 되는 설정만: 모델·키·채팅/봇별 값은 빼고, 추가 프롬프트는 ‘모든 곳’ 범위만 남긴다.
export function shareableSettings(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k === "models" || /ByScope$/.test(k) || /ByBot$/.test(k) || SECRET.test(k)) continue;
    out[k] = structuredClone(v);
  }
  if (Array.isArray(out.customPrompts)) out.customPrompts = out.customPrompts.filter((p) => p?.scope?.kind === "all");
  return out;
}

const sum = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0").slice(0, 6); };
const toB64 = (text) => { const bytes = new TextEncoder().encode(text); let bin = ""; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromB64 = (b64) => { const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/")); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };

export function encodeShare(raw, note = "") {
  const body = toB64(JSON.stringify({ v: 1, note: String(note).slice(0, 60), settings: shareableSettings(raw) }));
  return `${SHARE_PREFIX}${body}.${sum(body)}`;
}

// 코드 → { note, settings }. 틀리면 한글 오류.
export function decodeShare(code) {
  const t = String(code ?? "").trim().replace(/\s+/g, "");
  if (!t.startsWith(SHARE_PREFIX)) throw new Error("Dusk 기억 프리셋 코드가 아니에요. ‘DAMEM1:’로 시작해야 해요.");
  const [body, check] = t.slice(SHARE_PREFIX.length).split(".");
  if (!body || check !== sum(body)) throw new Error("코드가 잘렸거나 글자가 바뀐 것 같아요. 다시 복사해 주세요.");
  let d; try { d = JSON.parse(fromB64(body)); } catch { throw new Error("코드를 읽을 수 없어요. 다시 복사해 주세요."); }
  if (d?.v !== 1 || !d.settings || typeof d.settings !== "object" || Array.isArray(d.settings)) throw new Error("지원하지 않는 프리셋 코드예요.");
  return { note: String(d.note ?? ""), settings: shareableSettings(d.settings) };
}

// 설정 검색: 모든 낱말이 글 안에 있으면 일치(대소문자·공백 무시). 빈 검색은 항상 일치.
export function matchQuery(text, query) {
  const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const t = String(text ?? "").toLowerCase();
  return words.every((w) => t.includes(w));
}
