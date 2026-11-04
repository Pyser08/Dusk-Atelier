// 전송 (v1.9.3): nativeFetch 우선 → 안 되면 risuFetch(통째로 받기). 사용자 프록시 주소 지원. 재시도는 호출자가 한다.
export class HttpError extends Error { constructor(message, status = 0, extra = {}) { super(message); this.name = "HttpError"; this.status = status; Object.assign(this, extra); } }
export const redact = (text, secrets) => { let t = String(text ?? ""); for (const s of secrets ?? []) if (s && String(s).length > 6) t = t.split(String(s)).join("***"); return t; };
export function proxied(url, proxyUrl) { if (!proxyUrl) return url; return proxyUrl.includes("{url}") ? proxyUrl.replace("{url}", encodeURIComponent(url)) : `${proxyUrl}${proxyUrl.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`; }
export function createTransport(api, { compat = () => false } = {}) {
  async function send(req, { signal, proxyUrl = "", secrets = [] } = {}) {
    const url = proxied(req.url, proxyUrl);
    const init = { method: req.method ?? "POST", headers: req.headers, body: typeof req.body === "string" ? req.body : JSON.stringify(req.body), signal };
    let res;
    if (!compat() && typeof api.nativeFetch === "function") {
      try { res = await api.nativeFetch(url, init); }
      catch (e) { if (signal?.aborted) throw e; if (typeof api.risuFetch !== "function") throw new HttpError(`연결하지 못했어요: ${redact(e?.message, secrets)}`, 0, { network: true }); }
    }
    if (!res) {
      if (typeof api.risuFetch !== "function") throw new HttpError("이 호스트에서는 외부 요청을 보낼 수 없어요", 0, { network: true });
      const r = await api.risuFetch(url, { method: init.method, headers: init.headers, body: JSON.parse(init.body), rawResponse: false, abortSignal: signal });
      const text = typeof r?.data === "string" ? r.data : JSON.stringify(r?.data ?? "");
      res = { ok: !!r?.ok, status: Number(r?.status) || (r?.ok ? 200 : 0), body: null, text: async () => text, json: async () => JSON.parse(text), headers: new Map() };
    }
    return res;
  }
  return { send };
}
// 오류 응답에서 읽을 수 있는 메시지를 뽑는다(키 가림)
export async function errorFromResponse(res, secrets) {
  let msg = ""; try { const t = await res.text(); try { const j = JSON.parse(t); msg = j?.error?.message ?? j?.error?.type ?? j?.message ?? (typeof j?.error === "string" ? j.error : t); } catch { msg = t; } } catch { /* 본문 없음 */ }
  return new HttpError(redact(String(msg || `HTTP ${res.status}`).replace(/\s+/g, " ").slice(0, 300), secrets), res.status);
}
