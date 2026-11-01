// v1.8.1 정규식 전처리(순수): 기억 분석 입력과 임베딩 질의에서 상태창·HTML 같은 군더더기를 걷어 낸다.
// 리수 '요청 데이터 수정(editprocess)' 정규식만 쓴다. 원본 채팅·저장 데이터는 바꾸지 않고 읽는 글 사본에만 적용한다.
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const MAX_PATTERN = 600, MAX_ENTRIES = 200, MAX_TEXT = 60000;
export const DEFAULT_REGEX = Object.freeze({ on: false, useChar: true, useModules: true, files: [] });

// 리수 정규식 항목 하나 → {comment, in, out, flag}. editprocess가 아니거나 패턴이 없으면 null.
// ableFlag가 꺼져 있으면 리수는 사용자 플래그를 쓰지 않고 기본 "g"만 쓴다.
export function normEntry(e) {
  if (!isObj(e) || e.type !== "editprocess" || typeof e.in !== "string" || !e.in || e.in.length > MAX_PATTERN) return null;
  const flag = e.ableFlag === false ? "g" : typeof e.flag === "string" && /^[dgimsuvy]*$/.test(e.flag) && e.flag ? e.flag : "g";
  return { comment: String(e.comment ?? "").slice(0, 80), in: e.in, out: typeof e.out === "string" ? e.out : "", flag };
}
export const normEntries = (list) => (Array.isArray(list) ? list : []).map(normEntry).filter(Boolean).slice(0, MAX_ENTRIES);

// 리수 정규식 내보내기 파일({type:"regex", data:[…]}) → {entries, error}
export function parseRegexFile(raw) {
  let v = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return { entries: [], error: "JSON을 읽지 못했어요" }; } }
  if (!isObj(v) || v.type !== "regex" || !Array.isArray(v.data)) return { entries: [], error: "리수 정규식 파일이 아니에요" };
  const entries = normEntries(v.data);
  return { entries, error: entries.length ? "" : "‘요청 데이터 수정’ 정규식이 없어요" };
}

// 사용할 정규식을 순서대로 모은다: 올려 둔 파일 → 이 봇의 정규식 → 켜진 모듈의 정규식.
// modules: 데이터베이스 모듈 배열, enabledIds: 지금 채팅에서 켜진 모듈 id 목록
export function collectEntries({ cfg, character = null, modules = [], enabledIds = [] } = {}) {
  if (!cfg?.on) return [];
  const out = [];
  for (const f of cfg.files ?? []) out.push(...normEntries(f?.entries?.map((e) => ({ ...e, type: "editprocess" }))));
  if (cfg.useChar !== false) out.push(...normEntries(character?.customscript));
  if (cfg.useModules !== false) { const on = new Set(enabledIds); for (const m of modules ?? []) if (on.has(m?.id)) out.push(...normEntries(m.regex)); }
  return out.slice(0, MAX_ENTRIES);
}

const cache = new Map();
const compile = (e) => { const k = e.flag + "/" + e.in; if (cache.has(k)) return cache.get(k); let r = null; try { r = new RegExp(e.in, e.flag); } catch { r = null; } if (cache.size > 400) cache.clear(); cache.set(k, r); return r; };
// 정규식을 차례로 적용. 잘못된 정규식은 건너뛰고, 결과가 비면 원문을 그대로 돌려준다(기록할 글이 사라지는 사고 방지).
export function applyRegex(text, entries) {
  const src = String(text ?? "");
  if (!entries?.length || !src || src.length > MAX_TEXT) return src;
  let s = src;
  for (const e of entries) { const r = compile(e); if (!r) continue; r.lastIndex = 0; try { s = s.replace(r, e.out); } catch { /* 건너뜀 */ } }
  return s.trim() ? s : src;
}
