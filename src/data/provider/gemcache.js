// Gemini 명시적 캐시 (v1.9.3): 관찰(통계만) · 자동(같은 앞부분이 반복되면 생성) · 수동(마커 앞부분 생성).
import { hashText, splitAtMarker, anatomy } from "../../engine/provider/transforms.js";
import { estimateTokens } from "../../engine/provider/messages.js";
import { normalize, splitSystem, mergeSame } from "../../engine/provider/messages.js";
const MIN_TOKENS = 1024;
export function createGeminiCache({ now = () => Date.now() } = {}) {
  const caches = new Map(), seen = new Map(), stats = { created: 0, reused: 0, observed: 0, failed: 0 };
  const alive = (c) => c && c.expires > now() + 30000;
  function gc() { for (const [k, c] of caches) if (!alive(c)) caches.delete(k); }
  // 반환 {messages, cachedContent?}. 실패해도 원래 요청을 그대로 보낸다.
  async function prepare({ conn, profile, messages, cred, transport, signal }) {
    const mode = profile.cache?.gemini ?? "off";
    if (mode === "off" || conn.kind !== "google") return { messages };
    gc();
    let prefix = null, tail = messages;
    if (mode === "manual") { const s = splitAtMarker(messages, profile.cache.geminiMarker); if (!s) return { messages }; prefix = s.prefix; tail = s.tail; }
    else { // 관찰·자동: 마지막 사용자 메시지 앞까지를 후보 앞부분으로
      let last = -1; messages.forEach((m, i) => { if (m.role === "user") last = i; }); if (last <= 0) return { messages };
      prefix = messages.slice(0, last); tail = messages.slice(last);
    }
    const key = `${conn.id}|${profile.model}|${hashText(JSON.stringify(prefix))}`;
    const have = caches.get(key); if (alive(have)) { stats.reused++; return { messages: tail, cachedContent: have.name }; }
    const tokens = prefix.reduce((a, m) => a + estimateTokens(typeof m.content === "string" ? m.content : ""), 0);
    if (mode !== "manual") { const n = (seen.get(key) ?? 0) + 1; seen.set(key, n); if (seen.size > 200) seen.delete(seen.keys().next().value); stats.observed++; if (mode === "observe" || n < (profile.cache.geminiMinRepeats ?? 3)) return { messages }; }
    if (tokens < MIN_TOKENS) return { messages };
    try {
      const norm = mergeSame(normalize(prefix)), { system, rest } = splitSystem(norm);
      const body = { model: `models/${profile.model}`, ttl: `${profile.cache.geminiTtl ?? 1800}s`, contents: rest.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })), ...(system.length ? { systemInstruction: { parts: [{ text: system.join("\n\n") }] } } : {}) };
      if (!body.contents.length) body.contents = [{ role: "user", parts: [{ text: "(맥락)" }] }];
      const res = await transport.send({ url: `${String(conn.baseUrl).replace(/\/+$/, "")}/cachedContents`, headers: { "content-type": "application/json", "x-goog-api-key": cred }, body }, { signal, proxyUrl: conn.proxyUrl, secrets: [cred] });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json(); if (!j?.name) throw new Error("이름 없음");
      caches.set(key, { name: j.name, expires: now() + (profile.cache.geminiTtl ?? 1800) * 1000 }); stats.created++;
      return { messages: tail, cachedContent: j.name };
    } catch { stats.failed++; return { messages }; }
  }
  return { prepare, stats: () => ({ ...stats, active: [...caches.values()].filter(alive).length }), clear: () => { caches.clear(); seen.clear(); } };
}
export { anatomy };
