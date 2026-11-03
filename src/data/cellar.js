// Dusk Cellar 연결 (1.8.3): 리스 서버 옆에서 도는 선택 서버(Pyser08/Dusk-Cellar)를 찾는다.
// 플러그인은 api.nativeFetch로 부른다 — 리스를 직접 돌리는 서버(RisuBard 등)에서는 이 요청을 리스 서버가 대신 보내므로
// '127.0.0.1:6011'이 곧 그 서버 자신이고(리스 암호로 막힌 프록시라 토큰이 필요 없다), PC 앱이면 그 PC 자신이다.
// 못 찾으면 그냥 '없음' — 다른 기능은 지금처럼 동작한다(Cellar는 선택 기능).
export const CELLAR_URL_KEY = "dusk.cellar.url";
export const CELLAR_DEFAULT_URL = "http://127.0.0.1:6011";
const TIMEOUT = 4000, TTL = 60e3, FAIL_TTL = 3e3;   // 못 찾은 결과는 3초만 기억한다(켜자마자 못 찾았다가 계속 '없음'으로 남지 않게)

export async function loadCellarUrl(api) {
  try { const v = await api.pluginStorage.getItem(CELLAR_URL_KEY); return typeof v === "string" && /^https?:\/\//.test(v.trim()) ? v.trim().replace(/\/+$/, "") : CELLAR_DEFAULT_URL; } catch { return CELLAR_DEFAULT_URL; }
}
export async function saveCellarUrl(api, url) {
  const v = String(url ?? "").trim().replace(/\/+$/, "");
  if (!v || v === CELLAR_DEFAULT_URL) return api.pluginStorage.removeItem?.(CELLAR_URL_KEY) ?? api.pluginStorage.setItem(CELLAR_URL_KEY, "");
  if (!/^https?:\/\//.test(v)) throw new Error("주소는 http:// 또는 https://로 시작해야 해요.");
  return api.pluginStorage.setItem(CELLAR_URL_KEY, v);
}

// 응답이 오면 타이머를 지운다(긴 제한 시간이 남아 시험·프로세스를 붙잡지 않게)
const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("응답이 없어요")), ms); t?.unref?.(); })]).finally(() => clearTimeout(t)); };
async function readJson(res) {
  if (!res) return null;
  try { if (typeof res.json === "function") return await res.json(); } catch { /* 아래에서 글자로 */ }
  try { const t = typeof res.text === "function" ? await res.text() : res.body ?? res.data; return typeof t === "string" ? JSON.parse(t) : t; } catch { return null; }
}

// { ok, version, url, via, error }
export async function probeCellar(api, url) {
  const target = `${url}/cellar/health`;
  const tries = [];
  if (typeof api.nativeFetch === "function") tries.push(["native", () => api.nativeFetch(target, { method: "GET" })]);   // method 없으면 POST로 감
  if (typeof fetch === "function") tries.push(["fetch", () => fetch(target, { cache: "no-store" })]);
  let error = "연결할 방법이 없어요";
  for (const [via, go] of tries) {
    try {
      const res = await withTimeout(Promise.resolve().then(go), TIMEOUT);
      if (!res || !(res.status >= 200 && res.status < 300)) { error = res ? `응답 ${res.status}` : "응답이 없어요"; continue; }
      const j = await readJson(res);
      if (j?.name !== "dusk-cellar") { error = "Dusk Cellar가 아닌 곳이 응답했어요"; continue; }
      return { ok: true, version: String(j.version ?? ""), url, via, auth: j.auth !== false, features: Array.isArray(j.features) ? j.features.map(String) : [] };
    } catch (e) { error = String(e?.message ?? e); }
  }
  return { ok: false, url, error };
}

// 기억 저장 등 데이터 요청. health를 통과한 같은 길(via)로만 보낸다 — nativeFetch가 되는 곳에서 일반 fetch로 바꾸면
// 다른 기기(이 PC)의 Cellar로 갈 수 있다. 리스 프록시(/proxy2)는 GET·POST만 확실히 넘기므로 쓰기는 POST만 쓴다.
// 연결 문제(응답 없음·5xx·401·JSON 아님)는 err.network = true. 반환: { status, json }
export async function cellarRequest(api, { url, via = "native" }, path, { method = "GET", body, timeout = TIMEOUT } = {}) {
  const target = url + path;
  const init = method === "GET" ? { method: "GET" } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) };
  const go = via === "fetch" ? (typeof fetch === "function" ? () => fetch(target, { ...init, cache: "no-store" }) : null) : (typeof api.nativeFetch === "function" ? () => api.nativeFetch(target, init) : null);
  // json: 서버가 보낸 본문(있으면). 플러그인 수정처럼 5xx에도 '쓰였는지' 같은 상세를 담아 보내는 요청이 쓴다
  const net = (msg, status = 0, json = null) => Object.assign(new Error(msg), { network: true, status, json });
  if (!go) throw net("연결할 방법이 없어요");
  let res;
  try { res = await withTimeout(Promise.resolve().then(go), timeout); } catch (e) { throw net(String(e?.message ?? e)); }
  const status = Number(res?.status) || 0;
  const json = await readJson(res);
  if (!status || status >= 500 || status === 401 || !json || typeof json !== "object") throw net(json?.error ?? `응답 ${status || "없음"}`, status, json && typeof json === "object" ? json : null);
  return { status, json };
}

// 화면이 여러 번 물어도 1분에 한 번만 실제로 확인한다. 동시에 물으면 한 번만 보낸다.
export function createCellar(api, { now = () => Date.now() } = {}) {
  let last = null, at = 0, pending = null;
  return {
    peek: () => last,
    async status({ fresh = false } = {}) {
      if (!fresh && last && now() - at < (last.ok ? TTL : FAIL_TTL)) return last;
      if (pending) return pending;
      pending = (async () => { try { const url = await loadCellarUrl(api); last = await probeCellar(api, url); at = now(); return last; } finally { pending = null; } })();
      return pending;
    },
    forget() { last = null; at = 0; },
  };
}
