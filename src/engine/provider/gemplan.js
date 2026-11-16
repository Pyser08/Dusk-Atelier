// Gemini 캐시 계획 (순수): 모델별 방식 판정 · 캐시 경계 · 재사용/새로 만들기/자동 캐시 맡기기 결정.
// 명시적(2.5·3.x): 고정된 앞부분을 서버 캐시로 만들고, 다음 요청이 그 앞부분으로 시작하는 동안 재사용한다.
//   캐시 밖 토큰이 grow만큼 늘면 경계를 뒤로 옮겨 새로 만든다. 짧은 간격(bypassSec)·리롤엔 새로 만들지 않고 자동 캐시에 맡긴다.
// 자동(Gemini 4·이미지 모델 등): 서버 캐시를 만들 수 없다 → 앞부분 유지(바뀌는 블록 뒤로)만 한다.
export function geminiCacheKind(model) {
  const m = String(model ?? "").toLowerCase();
  if (/gemini-4|hydrogen|carbon|argon|image|banana|robotics/.test(m)) return /robotics/.test(m) ? "explicit" : "implicit";
  if (/gemini-(2\.5|3)/.test(m)) return "explicit";
  return "implicit";
}
export const minCacheTokens = (model) => (/gemini-2(\.|-)/i.test(String(model ?? "")) ? 2048 : 4096);
export const GEMINI_DEFAULTS = Object.freeze({ ttl: 600, extend: 180, grow: 4500, bypassSec: 30, minTurns: 2 });

// 캐시 경계(앞부분 길이, 메시지 개수): 리스 프롬프트의 cachePoint가 있으면 마지막 사용자 말 앞의 마지막 cachePoint까지,
// 없으면 마지막 사용자 말과 그 바로 앞에 붙은 시스템 블록(장기 기억·시간 등 매 턴 바뀌는 글)을 뺀 앞부분.
export function cacheBoundary(messages) {
  const list = Array.isArray(messages) ? messages : [];
  let u = -1; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.role === "user") { u = i; break; }
  if (u <= 0) return 0;
  for (let i = u - 1; i >= 0; i--) if (list[i]?.cachePoint) return i + 1;
  let b = u; while (b > 0 && list[b - 1]?.role === "system") b--;
  return b;
}
const sum = (a, n) => { let t = 0; for (let i = 0; i < n && i < a.length; i++) t += a[i] || 0; return t; };
export const prefixKey = (hashes, n) => hashes.slice(0, n).join(".");

// have: {name, n, prefix, tokens, expires} | null · lastAt: 같은 범위 직전 요청 시각(ms)
// 반환 {action: "use"|"create"|"none", n, reason, extend}
export function planGemini({ model, hashes, tokens, boundary, userTurns = 0, have = null, now = 0, lastAt = 0, reroll = false, tools = false, cfg = {} }) {
  const c = { ...GEMINI_DEFAULTS, ...cfg };
  if (geminiCacheKind(model) !== "explicit") return { action: "none", reason: "implicit-model" };
  if (tools) return { action: "none", reason: "tools" };
  const alive = have && have.expires > now + 15000;
  const match = alive && have.n <= boundary && have.prefix === prefixKey(hashes, have.n);
  const prefTok = sum(tokens, boundary), min = minCacheTokens(model), quick = lastAt > 0 && now - lastAt < c.bypassSec * 1000;
  const extend = (h) => h.expires - now < c.extend * 1000;
  if (match) {
    if (!reroll && !quick && prefTok - have.tokens > c.grow && prefTok >= min && boundary > have.n) return { action: "create", n: boundary, reason: "grow", replace: true };
    return { action: "use", n: have.n, reason: "match", extend: extend(have) };
  }
  if (userTurns < c.minTurns) return { action: "none", reason: "early" };
  if (prefTok < min) return { action: "none", reason: "small" };
  if (reroll || quick) return { action: "none", reason: "bypass" };
  return { action: "create", n: boundary, reason: have ? "changed" : "new", replace: !!have };
}

// 자동 캐시(Gemini 4 등)용 앞부분 지키기: 마지막 사용자 말 바로 앞에 붙은 시스템 블록을 그 말 뒤로 옮긴다.
// 다음 턴엔 이 블록이 빠지고 대화가 이어지므로 지난 요청 전체가 이번 요청의 앞부분과 같아진다.
export function moveVolatileAfterUser(messages) {
  const list = Array.isArray(messages) ? messages : [];
  let u = -1; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.role === "user") { u = i; break; }
  if (u <= 0) return list;
  let b = u; while (b > 0 && list[b - 1]?.role === "system") b--;
  if (b === u || b === 0) return list;
  return [...list.slice(0, b), list[u], ...list.slice(b, u), ...list.slice(u + 1)];
}
