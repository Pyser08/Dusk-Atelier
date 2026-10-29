// v1.7.1 임베딩 호출·저장. 설정과 키는 이 기기의 로컬 저장소에만 둔다(백업·공유 내보내기에 안 들어감).
// 실패·지연은 조용히 건너뛰고 기존 검색키 방식으로 이어 간다(채팅을 막지 않는다).
import { hashText } from "../engine/chattext.js";
import { normCfg, buildRequest, parseResponse, pack, unpack, cosine, isReady, recordText } from "../engine/embed.js";

const CFG_KEY = "dusk.embed.cfg.v1", VEC_PREFIX = "dusk.embed.vec.v1.", BATCH = 32, MAX_NEW = 96;

export function createEmbedder(api, { log = (...a) => console.log("[Dusk 임베딩]", ...a) } = {}) {
  let cfg = normCfg(null), key = "", loaded = null, lastError = "", lastMs = 0;
  const vecs = new Map(), qcache = new Map(), pending = new Map();  // vecs: 폴더키 → {model, v:{해시:int8}}
  let local = null;
  const store = async () => local ??= (typeof api.getLocalPluginStorage === "function" ? await api.getLocalPluginStorage() : api.safeLocalStorage);
  const rd = async (k) => { try { const v = await (await store()).getItem(k); return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
  const wr = async (k, v) => { try { await (await store()).setItem(k, JSON.stringify(v)); return true; } catch (e) { log("저장 실패", e?.message ?? e); return false; } };

  const load = () => loaded ??= (async () => { const r = await rd(CFG_KEY); cfg = normCfg(r?.cfg); key = typeof r?.key === "string" ? r.key : ""; return status(); })();
  const status = () => ({ ...cfg, hasKey: !!key, ready: isReady(cfg, !!key), lastError, lastMs });
  async function save(patch) {
    await load(); const next = { ...cfg, ...patch }; delete next.key;
    const modelChanged = next.model !== cfg.model || next.url !== cfg.url;
    cfg = normCfg(next); if (typeof patch?.key === "string") key = patch.key.trim();
    if (modelChanged) { vecs.clear(); qcache.clear(); }
    await wr(CFG_KEY, { cfg, key }); return status();
  }
  async function embed(texts, { timeoutMs } = {}) {
    await load(); if (!isReady(cfg, !!key)) throw new Error("임베딩 설정이 비어 있어요.");
    const out = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const part = texts.slice(i, i + BATCH), req = buildRequest(cfg, key, part), ac = new AbortController(), t0 = Date.now();
      const timer = setTimeout(() => ac.abort(), timeoutMs ?? cfg.timeoutMs);
      try {
        const res = await api.nativeFetch(req.url, { method: "POST", headers: req.headers, body: req.body, signal: ac.signal });
        if (!res?.ok) throw new Error(`HTTP ${res?.status ?? "?"}`);
        const rows = parseResponse(await res.json(), part.length); if (!rows) throw new Error("응답 모양이 달라요");
        out.push(...rows); lastMs = Date.now() - t0; lastError = "";
      } catch (e) { lastError = ac.signal.aborted ? "시간 초과" : String(e?.message ?? e).slice(0, 120); throw new Error(lastError); } finally { clearTimeout(timer); }
    }
    return out;
  }
  async function test() {
    const t0 = Date.now(); const [v] = await embed(["연결 테스트"], { timeoutMs: 10000 });
    return { dim: v.length, ms: Date.now() - t0 };
  }
  async function bucket(fid) {
    let b = vecs.get(fid); if (b && b.model === cfg.model) return b;
    const r = await rd(VEC_PREFIX + fid); b = r && r.model === cfg.model && r.v ? r : { model: cfg.model, v: {} }; vecs.set(fid, b); return b;
  }
  // 현재 장면 글과 기록들의 유사도: Map(기록 id → 0~1). 설정이 꺼져 있거나 실패하면 null.
  // 새로 필요한 벡터는 한 번에 모아 요청하고, 시간이 모자라면 뒤에서 계속해 저장한다(다음 요청부터 반영).
  async function scores(fid, folder, queryText, { budgetMs = null } = {}) {
    await load(); if (!isReady(cfg, !!key) || !String(queryText ?? "").trim()) return null;
    const q = String(queryText).slice(-1200), qh = hashText(q), b = await bucket(fid);
    const items = []; for (const p of Object.values(folder?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan && r.valid !== false) { const t = recordText(p, r); items.push({ id: r.id, h: hashText(t), t }); }
    const need = [...new Map(items.filter((x) => !b.v[x.h]).map((x) => [x.h, x])).values()].slice(0, MAX_NEW);
    const qv = qcache.get(qh);
    const jobKey = fid + ":" + qh + ":" + need.length;
    let work = pending.get(jobKey);
    if (!work && (need.length || !qv)) {
      work = (async () => {
        const texts = [...(qv ? [] : [q]), ...need.map((x) => x.t)], vs = await embed(texts);
        let i = 0; if (!qv) { qcache.set(qh, unpack(pack(vs[i++]))); if (qcache.size > 20) qcache.delete(qcache.keys().next().value); }
        for (const x of need) b.v[x.h] = pack(vs[i++]);
        if (need.length) await wr(VEC_PREFIX + fid, b);
      })().catch((e) => log("임베딩 건너뜀:", e?.message ?? e)).finally(() => pending.delete(jobKey));
      pending.set(jobKey, work);
    }
    if (work) { const ms = budgetMs ?? cfg.timeoutMs; await Promise.race([work, new Promise((r) => setTimeout(r, ms))]); }
    const qvec = qcache.get(qh); if (!qvec) return null;
    const m = new Map(); for (const x of items) { const v = b.v[x.h] && unpack(b.v[x.h]); if (v) m.set(x.id, cosine(qvec, v)); }
    return m.size ? m : null;
  }
  async function clear() { vecs.clear(); qcache.clear(); const s = await store(); try { for (const k of await (s.keys?.() ?? [])) if (String(k).startsWith(VEC_PREFIX)) await s.removeItem(k); } catch { /* 일부만 지워져도 모델이 바뀌면 자동 무시 */ } }
  return { load, status, save, test, embed, scores, clear, cfg: () => cfg };
}
