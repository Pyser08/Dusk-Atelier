// Gemini 캐시 (v1.9.3 → 캐시 개편): 자동 · 수동(마커 앞부분).
// 자동: 모델 이름으로 방식을 고른다(engine/provider/gemplan.js).
//  - 명시적(2.5·3.x): 고정된 앞부분을 서버 캐시로 만들어 재사용 · 캐시 밖이 늘면 경계를 옮겨 새로 만들고 옛 캐시는 지움 · 곧 끝나면 연장
//    · 짧은 간격·리롤엔 새로 만들지 않고 자동 캐시에 맡김 · 앱을 다시 켜면 서버 목록에서 이름(Dusk|범위|앞부분)으로 되찾음
//  - 자동 캐시만 되는 모델(Gemini 4 등): 마지막 사용자 말 앞에 붙은 바뀌는 블록을 뒤로 옮겨 앞부분을 지킨다.
// 실패해도 원래 요청을 그대로 보낸다.
import { hashText, splitAtMarker, anatomy } from "../../engine/provider/transforms.js";
import { estimateTokens, normalize, splitSystem, mergeSame } from "../../engine/provider/messages.js";
import { geminiCacheKind, cacheBoundary, planGemini, prefixKey, moveVolatileAfterUser, GEMINI_DEFAULTS } from "../../engine/provider/gemplan.js";
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : String(c ?? "");
const TAG = "Dusk|";
export function createGeminiCache({ now = () => Date.now() } = {}) {
  const scopes = new Map(), stats = { created: 0, reused: 0, implicit: 0, bypass: 0, failed: 0, deleted: 0, extended: 0, restored: 0 };
  const restoredConn = new Set();
  const base = (conn) => String(conn.baseUrl).replace(/\/+$/, "");
  const hdr = (cred) => ({ "content-type": "application/json", "x-goog-api-key": cred });
  const ttlOf = (profile) => Math.max(60, Math.min(86400, Number(profile.cache?.geminiTtl) || GEMINI_DEFAULTS.ttl));
  async function call(transport, conn, cred, signal, req) { return transport.send({ headers: hdr(cred), ...req }, { signal, proxyUrl: conn.proxyUrl, secrets: [cred] }); }
  async function createCache({ conn, profile, prefix, cred, transport, signal, name }) {
    const { system, rest } = splitSystem(mergeSame(normalize(prefix)));
    const body = { model: `models/${profile.model}`, ttl: `${ttlOf(profile)}s`, displayName: name, contents: rest.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })), ...(system.length ? { systemInstruction: { parts: [{ text: system.join("\n\n") }] } } : {}) };
    if (!body.contents.length) body.contents = [{ role: "user", parts: [{ text: "(맥락)" }] }];
    const res = await call(transport, conn, cred, signal, { url: `${base(conn)}/cachedContents`, body });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json(); if (!j?.name) throw new Error("이름 없음");
    return j;
  }
  const drop = (transport, conn, cred, name) => call(transport, conn, cred, undefined, { url: `${base(conn)}/${name}`, method: "DELETE" }).then((r) => { if (r.ok) stats.deleted++; }).catch(() => {});
  const extend = (transport, conn, cred, ent, profile) => call(transport, conn, cred, undefined, { url: `${base(conn)}/${ent.name}?updateMask=ttl`, method: "POST", headers: { ...hdr(cred), "X-HTTP-Method-Override": "PATCH" }, body: { ttl: `${ttlOf(profile)}s` } })
    .then((r) => { if (r.ok) { ent.expires = now() + ttlOf(profile) * 1000; stats.extended++; } }).catch(() => {});
  // 앱을 다시 켠 뒤 처음: 서버에 남은 Dusk 캐시를 범위별로 되찾는다(연결마다 한 번)
  async function restore({ conn, cred, transport, signal }) {
    if (restoredConn.has(conn.id)) return; restoredConn.add(conn.id);
    try {
      const res = await call(transport, conn, cred, signal, { url: `${base(conn)}/cachedContents?pageSize=100`, method: "GET" }); if (!res.ok) return;
      for (const c of (await res.json())?.cachedContents ?? []) {
        const [tag, key, ph, n, tok] = String(c.displayName ?? "").split("|"); if (`${tag}|` !== TAG || !key || scopes.get(key)?.cache) continue;
        const exp = Date.parse(c.expireTime ?? ""); if (!(exp > now())) continue;
        scopes.set(key, { ...(scopes.get(key) ?? {}), cache: { name: c.name, n: Number(n) || 0, ph, tokens: Number(tok) || 0, expires: exp } }); stats.restored++;
      }
    } catch { /* 되찾기 실패는 무시 */ }
  }
  async function prepare({ conn, profile, messages, cred, transport, signal, scope = "", tools = false }) {
    const mode = profile.cache?.gemini ?? "off";
    if (mode === "off" || conn.kind !== "google" || !Array.isArray(messages)) return { messages };
    if (mode === "manual") {
      const s = splitAtMarker(messages, profile.cache.geminiMarker); if (!s) return { messages };
      const key = hashText(`${conn.id}|${profile.model}|${JSON.stringify(s.prefix)}`), st = scopes.get(key) ?? {};
      if (st.cache && st.cache.expires > now() + 15000) { stats.reused++; return { messages: s.tail, cachedContent: st.cache.name }; }
      if (s.prefix.reduce((a, m) => a + estimateTokens(textOf(m.content)), 0) < 1024) return { messages };
      try { const j = await createCache({ conn, profile, prefix: s.prefix, cred, transport, signal, name: `Dusk manual ${key}` }); scopes.set(key, { cache: { name: j.name, expires: now() + ttlOf(profile) * 1000 } }); stats.created++; return { messages: s.tail, cachedContent: j.name }; }
      catch { stats.failed++; return { messages }; }
    }
    // 자동
    if (geminiCacheKind(profile.model) !== "explicit") { stats.implicit++; return { messages: moveVolatileAfterUser(messages), implicit: true }; }
    const key = hashText(`${conn.id}|${profile.model}|${scope}`), st = scopes.get(key) ?? {};
    await restore({ conn, cred, transport, signal });
    const st2 = scopes.get(key) ?? st;
    const hashes = messages.map((m) => hashText(`${m?.role}\n${textOf(m?.content)}`)), tokens = messages.map((m) => estimateTokens(textOf(m?.content)));
    const all = prefixKey(hashes, hashes.length), reroll = st2.last === all, t = now();
    const have = st2.cache ? { ...st2.cache, prefix: st2.cache.prefix ?? (st2.cache.ph != null ? (hashText(prefixKey(hashes, st2.cache.n)) === st2.cache.ph ? prefixKey(hashes, st2.cache.n) : "~") : "~") } : null;
    const boundary = cacheBoundary(messages), userTurns = messages.filter((m) => m?.role === "user").length;
    const plan = planGemini({ model: profile.model, hashes, tokens, boundary, userTurns, have, now: t, lastAt: st2.lastAt ?? 0, reroll, tools, cfg: { ttl: ttlOf(profile), grow: Number(profile.cache?.geminiGrow) || GEMINI_DEFAULTS.grow } });
    scopes.set(key, { ...st2, last: all, lastAt: t });
    if (plan.action === "use") {
      stats.reused++; const ent = scopes.get(key).cache;
      if (plan.extend) extend(transport, conn, cred, ent, profile);
      return { messages: messages.slice(plan.n), cachedContent: ent.name };
    }
    if (plan.action !== "create") { if (plan.reason === "bypass") stats.bypass++; return { messages }; }
    try {
      const prefix = messages.slice(0, plan.n), pk = prefixKey(hashes, plan.n), tok = tokens.slice(0, plan.n).reduce((a, b) => a + b, 0);
      const j = await createCache({ conn, profile, prefix, cred, transport, signal, name: `${TAG}${key}|${hashText(pk)}|${plan.n}|${tok}` });
      const old = st2.cache?.name;
      scopes.set(key, { ...scopes.get(key), cache: { name: j.name, n: plan.n, prefix: pk, tokens: tok, expires: Date.parse(j.expireTime ?? "") || t + ttlOf(profile) * 1000 } }); stats.created++;
      if (old && old !== j.name) drop(transport, conn, cred, old);
      return { messages: messages.slice(plan.n), cachedContent: j.name };
    } catch { stats.failed++; return { messages }; }
  }
  return { prepare, stats: () => ({ ...stats, active: [...scopes.values()].filter((s) => s.cache && s.cache.expires > now()).length }), clear: () => { scopes.clear(); restoredConn.clear(); } };
}
export { anatomy };
