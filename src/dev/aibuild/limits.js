// 요청 용량 한도 (v1.6.8). 토큰이 아니라 글자 수·바이트 수로만 잰다(정확한 토큰 계산 없음).
// 기본 300만 자, 최대 1,000만 자, 전체 전송 32MiB. 한도를 넘으면 자르지 않고 막는다.
export const DEFAULT_INPUT_CHARS = 3e6;
export const MAX_INPUT_CHARS = 1e7;
export const MIN_INPUT_CHARS = 1e3;
export const INPUT_LIMIT_VERSION = 2;
export const PROMPT_BYTES_LIMIT = 32 * 1024 * 1024;

// 저장된 설정에서 한도를 읽는다. 옛 버전(10만 자 시절) 값은 새 기본값 이상으로 올린다.
export function migrateInputSettings(saved = {}) {
  const r = saved && typeof saved === 'object' ? saved : {};
  const legacy = r.inputLimitVersion !== INPUT_LIMIT_VERSION;
  let limit = r.maxInputChars;
  if (!Number.isInteger(limit) || limit < MIN_INPUT_CHARS || limit > MAX_INPUT_CHARS) limit = DEFAULT_INPUT_CHARS;
  if (legacy) limit = Math.max(DEFAULT_INPUT_CHARS, limit);
  return { maxInputChars: limit, inputLimitVersion: INPUT_LIMIT_VERSION };
}

const enc = typeof TextEncoder === 'function' ? new TextEncoder() : null;
const byteLen = (s) => (enc ? enc.encode(s).length : unescape(encodeURIComponent(s)).length);

export function inputSize(messages) {
  let chars = 0, bytes = 0;
  for (const m of messages) { const c = String(m?.content ?? ''); chars += c.length; bytes += byteLen(c); }
  return { chars, bytes };
}

// 한도를 넘으면 Error. 통과하면 { chars, bytes }.
export function checkInputSize(messages, maxChars = DEFAULT_INPUT_CHARS) {
  const size = inputSize(messages);
  if (size.chars > maxChars) throw new Error(`전송 내용이 설정한 ${maxChars.toLocaleString()}자 한도를 초과했습니다. (현재 ${size.chars.toLocaleString()}자) 설정에서 한도를 늘리거나 로어북을 일부 제외해 주세요.`);
  if (size.bytes > PROMPT_BYTES_LIMIT) throw new Error(`전송 내용이 32MiB 상한을 초과했습니다. (현재 ${(size.bytes / 1048576).toFixed(1)}MiB) 로어북을 일부 제외하거나 요청을 줄여 주세요.`);
  return size;
}
