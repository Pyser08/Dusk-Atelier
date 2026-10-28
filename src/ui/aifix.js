// 로어북 '고칠 부분' 공유 상태 (v1.6.8): 편집기 글칸에서 고른 부분 ↔ AI 창 '고칠 부분' 상자를 양방향으로 맞춘다.
// 글칸에서 고르면 상자가 바뀌고, 상자를 고치면 글칸의 그 부분이 바로 바뀐다. 화면 코드 없음(DOM은 글칸 값만 읽고 쓴다).
let target = null; // { ta, label, s, e, text }
const subs = new Set();
const emit = () => { for (const fn of subs) { try { fn(target); } catch { /* 화면 오류는 무시 */ } } };
export const getFix = () => target;
export function onFix(fn) { subs.add(fn); return () => subs.delete(fn); }
export function setFix(next) { target = next; emit(); }
export function clearFix() { if (target) setFix(null); }

// 글칸에서 선택이 바뀌었을 때(같은 선택이면 아무 일도 없다). 선택이 비는 것은 무시해서, AI 창을 눌러도 대상이 남는다.
export function pickFix({ ta, label, s, e }) {
  const text = ta.value.slice(s, e);
  if (!text.trim()) return;
  const t = target;
  if (t && t.ta === ta && t.s === s && t.e === e && t.text === text && t.label === label) return;
  setFix({ ta, label, s, e, text });
}
// 기록해 둔 범위가 지금 글칸에서 어디인지: 그대로면 그 자리, 아니면 글 전체에서 한 번만 나올 때의 자리. 못 찾으면 null.
export function locate(r) {
  if (!r?.ta?.isConnected) return null;
  const v = String(r.ta.value ?? "");
  if (v.slice(r.s, r.e) === r.text) return { s: r.s, e: r.e };
  if (!r.text) return null;
  const i = v.indexOf(r.text);
  return i >= 0 && v.indexOf(r.text, i + 1) < 0 ? { s: i, e: i + r.text.length } : null;
}
// 기록(r)의 범위를 새 글로 바꾼다. 글칸 입력 이벤트를 보내 편집기 값·확률 상자 표시가 따라오게 한다.
export function replaceIn(r, text) {
  const at = locate(r);
  if (!at) return false;
  r.ta.setRangeText(text, at.s, at.e, "select");
  r.s = at.s; r.e = at.s + text.length; r.text = text;
  if (target && target.ta === r.ta && target !== r) setFix({ ...target, s: r.s, e: r.e, text });
  r.ta.dispatchEvent(new Event("input"));
  return true;
}
// AI 창 상자에서 고친 글을 현재 대상에 반영
export function setFixText(text) {
  if (!target) return false;
  const t = { ...target };
  if (!replaceIn(t, text)) return false;
  target = t; // 글칸의 입력 이벤트가 같은 선택으로 보고 넘어가도록 먼저 맞춰 둔다
  emit();
  return true;
}

// 부분 다시 쓰기 결과 (AI 창을 닫았다 열어도 남는다. 최대 10개)
export const rewrites = [];
export function addRewrite(rec) { rewrites.push(rec); while (rewrites.length > 10) rewrites.shift(); return rec; }
export function clearRewrites() { rewrites.length = 0; }
