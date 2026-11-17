// addon-rebuild 4단계: Erosync 순수 조각 — 기본 도우미(값 다듬기·해시·복사). 원본 erosync.js 글 그대로, 엔진 상태는 쓰지 않음.

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function clampNumber(value, fallback = 0, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function clampInt(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toText(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function truncate(value, maxChars) {
  const text = toText(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 24))}\n...[truncated]`;
}

export function normalizeStringList(value, maxItems = 12, maxChars = 300) {
  const input = Array.isArray(value) ? value : (value ? [value] : []);
  const result = [];
  for (const item of input) {
    let source = item;
    if (typeof item !== 'string') {
      try { source = JSON.stringify(item); } catch (_) { source = ''; }
    }
    const text = truncate(source, maxChars).trim();
    if (!text || result.includes(text)) continue;
    result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

// ---------- 기록의 연속성(2026-10-29, Erosync.Pair-Contact.Work-Plan.md) ----------
// 관계 메모는 최신 것을 남긴다: normalizeStringList는 앞에서부터 maxItems까지만 남겨서 30개가 차면 새 메모가 버려지고 판단에는 가장 오래된 8개만 갔다.
export function latestStringList(value, maxItems = 12, maxChars = 300) {
  const list = normalizeStringList(value, Number.MAX_SAFE_INTEGER, maxChars);
  const limit = Math.max(0, Number.isFinite(Number(maxItems)) ? Math.floor(Number(maxItems)) : 12);
  return limit > 0 && list.length > limit ? list.slice(-limit) : list;
}

export function safeClone(value) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_) {}
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
}

export function fnv1a(text) {
  let hash = 2166136261;
  const input = String(text ?? '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function safeKeyPart(value, fallback = 'unknown') {
  const normalized = String(value ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return normalized || fallback;
}

export function parseJsonRecord(text, fallback = {}) {
  const value = String(text || '').trim();
  if (!value) return { ...fallback };
  const parsed = JSON.parse(value);
  if (!isPlainObject(parsed)) throw new Error('JSON value must be an object');
  return parsed;
}

export function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

export function extractJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) throw new Error('empty JSON response');
  const candidates = [source];
  for (const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) candidates.push(match[1].trim());
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(source.slice(start, index + 1));
          start = index;
          break;
        }
      }
    }
  }
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isPlainObject(parsed)) return parsed;
    } catch (error) { lastError = error; }
  }
  throw new Error(`invalid JSON response: ${lastError?.message || 'no object found'}`);
}

export function base64Url(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new TextEncoder().encode(String(input));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function pemToArrayBuffer(pem) {
  const base64 = String(pem || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function asObjectArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  if (!value || typeof value !== 'object') return [];
  if (typeof value.content === 'string' || typeof value.text === 'string' || typeof value.prompt === 'string') return [value];
  return Object.values(value).filter((item) => item && typeof item === 'object');
}

export function identityValues(value) {
  if (!value || typeof value !== 'object') return [];
  return [value.id, value._id, value.uid, value.uuid, value.namespace, value.name, value.displayName]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export const duskPlain = (value) => { try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return null; } };
