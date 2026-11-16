// 2.2.4 Jev 재정렬(선택, 기본 꺼짐): 원문 회상 후보를 고르기 모델(typesafe/jev-1.14, 오픈라우터 /systemone)이 0~3점으로 매긴다.
// 비싼 메인 모델을 쓸 때 기억 토큰을 더 줄이려는 용도. 설정·키는 이 기기에만 둔다(백업·공유에 안 들어감). 실패·지연은 조용히 원래 순서로.
const CFG_KEY = "dusk.jev.cfg.v1";
export const DEFAULT_JEV = Object.freeze({ on: false, provider: "openrouter", url: "https://openrouter.ai/api/v1/systemone", model: "typesafe/jev-1.14", timeoutMs: 3000 });
// 2.2.6 공급자: 오픈라우터 또는 Vercel AI Gateway(같은 System One 형식, 주소·키·모델 이름만 다름). 키는 공급자마다 따로 둔다.
export const JEV_PROVIDERS = Object.freeze({
  openrouter: { label: "오픈라우터", url: "https://openrouter.ai/api/v1/systemone", model: "typesafe/jev-1.14", keyHint: "오픈라우터 API 키 (sk-or-v1-…)" },
  vercel: { label: "Vercel AI Gateway", url: "https://ai-gateway.vercel.sh/typesafe/v1/systemone", model: "typesafe-ai/jev", keyHint: "Vercel AI Gateway 키" }
});
const isDefaultFor = (field, v) => Object.values(JEV_PROVIDERS).some((p) => p[field] === v);
const RANK = ["unrelated", "background", "useful", "answers it"];
// 공급자를 바꾸면 주소·모델이 원래 기본값일 때만 새 공급자의 기본값으로 바꾼다(직접 적은 값은 그대로)
export const normCfg = (x = {}) => { const provider = JEV_PROVIDERS[x?.provider] ? x.provider : "openrouter", P = JEV_PROVIDERS[provider];
  const url0 = String(x?.url ?? "").trim().slice(0, 300), model0 = String(x?.model ?? "").trim().slice(0, 100);
  return { on: x?.on === true, provider, url: !url0 || isDefaultFor("url", url0) ? P.url : url0, model: !model0 || isDefaultFor("model", model0) ? P.model : model0, timeoutMs: Math.min(20000, Math.max(1000, Number(x?.timeoutMs) || DEFAULT_JEV.timeoutMs)) }; };
// 점수: 확률 분포가 있으면 기대값(0~3), 없으면 score
export function jevScore(r) {
  const p = r?.probabilities;
  if (p && Object.keys(p).length) { let s = 0, t = 0; for (const [k, v] of Object.entries(p)) { const lv = Number.isFinite(Number(k)) ? Number(k) : RANK.indexOf(k); if (lv >= 0) { s += lv * Number(v); t += Number(v); } } if (t) return s / t; }
  return Number(r?.score ?? 0);
}
export function jevBody(model, { query, recent, items }) {
  const questions = {};
  items.forEach((_, k) => { questions[`r${k}`] = { type: "score", instructions: `C${k}`, criteria: RANK }; });
  const state = `[RECENT STORY]\n${String(recent ?? "").slice(-1200)}\n\n[USER]\n${String(query ?? "").slice(-1500)}\n\n[EARLIER RECORDS] For each Cn question, score how useful that record is for writing the next reply to the latest message: 0 unrelated, 1 background only, 2 useful context, 3 answers or explains it.\n${items.map((x, k) => `C${k}: ${String(x.text).slice(0, 420)}`).join("\n")}`;
  return { model, state, questions };
}

export function createJev(api, { log = (...a) => console.log("[Dusk Jev]", ...a) } = {}) {
  let cfg = normCfg(), keys = {}, loaded = null, lastError = "", lastMs = 0, local = null;
  const store = async () => local ??= (typeof api.getLocalPluginStorage === "function" ? await api.getLocalPluginStorage() : api.safeLocalStorage);
  const rd = async () => { try { const v = await (await store()).getItem(CFG_KEY); return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
  const wr = async (v) => { try { await (await store()).setItem(CFG_KEY, JSON.stringify(v)); return true; } catch (e) { log("저장 실패", e?.message ?? e); return false; } };
    const load = () => loaded ??= (async () => { const r = await rd(); cfg = normCfg(r?.cfg); keys = { ...(r?.keys && typeof r.keys === "object" ? r.keys : {}) }; if (typeof r?.key === "string" && r.key && !keys.openrouter) keys.openrouter = r.key; return status(); })();   // 예전 키 하나 = 오픈라우터 키
  const keyOf = () => String(keys[cfg.provider] ?? "");
  const status = () => { const key = keyOf(); return { ...cfg, hasKey: !!key, keyTail: key.slice(-4), ready: cfg.on && !!key, lastError, lastMs }; };
  async function save(patch) {
    await load(); const next = { ...cfg, ...patch }; delete next.key;
    cfg = normCfg(next); if (typeof patch?.key === "string") keys[cfg.provider] = patch.key.trim();
    const ok = await wr({ cfg, keys, key: keys.openrouter ?? "" }), back = ok ? await rd() : null;
    return { ...status(), persisted: !!back && (back.keys?.[cfg.provider] ?? "") === keyOf() };
  }
  async function call(body, timeoutMs) {
    const ac = new AbortController(), t0 = Date.now(), timer = setTimeout(() => ac.abort(), timeoutMs ?? cfg.timeoutMs);
    try {
      const res = await api.nativeFetch(cfg.url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${keyOf()}` }, body: JSON.stringify(body), signal: ac.signal });
      if (!res?.ok) throw new Error(res?.status === 401 || res?.status === 403 ? `키가 거절됐어요 (HTTP ${res.status})` : `HTTP ${res?.status ?? "?"}`);
      const j = await res.json(), ans = j?.answers ?? j;
      if (!ans || typeof ans !== "object") throw new Error("응답 모양이 달라요");
      lastMs = Date.now() - t0; lastError = ""; return ans;
    } catch (e) { lastError = ac.signal.aborted ? "시간 초과" : (e?.message ?? String(e)); throw new Error(lastError); }
    finally { clearTimeout(timer); }
  }
  // items [{id, text}] → Map(id → 0~3). 꺼져 있으면 null(원래 순서 그대로). 20개씩 동시에 묻는다.
  async function rerank({ query, recent, items }) {
    await load(); if (!cfg.on || !keyOf() || !items?.length) return null;
    const parts = []; for (let i = 0; i < items.length; i += 20) parts.push(items.slice(i, i + 20));
    const answers = await Promise.all(parts.map((p) => call(jevBody(cfg.model, { query, recent, items: p }))));
    const out = new Map();
    parts.forEach((p, i) => p.forEach((x, k) => out.set(x.id, jevScore(answers[i]?.[`r${k}`]))));
    return out;
  }
  async function test() {
    await load(); if (!keyOf()) throw new Error("키를 넣어 주세요.");
    const t0 = Date.now();
    const sc = await call(jevBody(cfg.model, { query: "지난주에 뭐 했어?", recent: "", items: [{ id: 0, text: "[어제] 미나: 지난주에 바다에 다녀왔어" }, { id: 1, text: "[어제] 하루: 오늘 날씨 좋다" }] }), 10000);
    return { ms: Date.now() - t0, ok: jevScore(sc?.r0) > jevScore(sc?.r1) };
  }
  return { load, status, save, test, rerank, keyValue: (p) => String(keys[p ?? cfg.provider] ?? ""), cfg: () => cfg };
}
