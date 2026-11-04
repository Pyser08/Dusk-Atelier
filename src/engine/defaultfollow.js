// 직접 바꾸지 않은 설정은 기본값을 따라간다(순수 함수).
// 표: 키(점 경로) → { old: 예전 기본값들 }. 직접 수정 기록(edited)이 아직 없는 예전 사용자는
// 값이 예전 기본값이나 지금 기본값이면 손대지 않은 것으로 보고, 다른 값이면 직접 바꾼 것으로 기록해 지킨다.
export const DUSK_FOLLOW = Object.freeze({
  "inject.targetTokens": { old: [1200] },
  "inject.capTokens": { old: [2500] },
  "inject.eventTokens": { old: [600] }
});
export const POT_FOLLOW = Object.freeze({ writerSearchExistingLore: { old: [false] } });
export const POT_DEFAULTS = Object.freeze({ writerSearchExistingLore: true });

const getPath = (o, key) => key.split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);
function setPath(o, key, val) {
  const ks = key.split("."), last = ks.pop();
  let cur = o;
  for (const k of ks) { if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {}; cur = cur[k]; }
  cur[last] = val;
}

// obj를 고쳐서 손대지 않은 값을 기본값으로 맞추고, 새 직접 수정 기록(배열)을 돌려준다.
export function followDefaults(obj, defaults, edited, follow) {
  const tracked = Array.isArray(edited);
  const out = tracked ? [...edited] : [];
  for (const [key, rule] of Object.entries(follow)) {
    if (out.includes(key)) continue;
    const def = getPath(defaults, key), cur = getPath(obj, key);
    if (!tracked && cur !== undefined && cur !== def && !rule.old.includes(cur)) { out.push(key); continue; }
    setPath(obj, key, def);
  }
  return out;
}

// 저장 직전/직후 값을 비교해 바뀐 키를 직접 수정 기록에 더한다.
export function noteEdits(before, after, edited, follow) {
  const out = Array.isArray(edited) ? [...edited] : [];
  for (const key of Object.keys(follow)) if (!out.includes(key) && getPath(before, key) !== getPath(after, key)) out.push(key);
  return out;
}
