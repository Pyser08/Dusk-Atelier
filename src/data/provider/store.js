// 프로바이더 설정·사용량 저장 (v1.9.3). 설정은 pluginStorage(기기 간 동기화 대상, 키 값은 없음).
import { normalizeConfig, defaultConfig } from "../../engine/provider/profile.js";
import { addRecord } from "../../engine/provider/cost.js";
export const CFG_KEY = "dusk.prov.v1", USAGE_KEY = "dusk.prov.usage.v1", LOG_KEY = "dusk.prov.log.v1", BATCH_KEY = "dusk.prov.batch.v1";
export function createProviderStore(api) {
  let cfg = null, usage = null; const subs = new Set();
  const read = async (k) => { try { const r = await api.pluginStorage.getItem(k); return typeof r === "string" ? JSON.parse(r) : r ?? null; } catch { return null; } };
  const write = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  return {
    async get() { return (cfg ??= normalizeConfig(await read(CFG_KEY))); },
    async save(next) { cfg = normalizeConfig(next); await write(CFG_KEY, cfg); for (const f of subs) { try { f(cfg); } catch { /* 구독자 오류 무시 */ } } return cfg; },
    async update(fn) { const cur = await this.get(); const draft = JSON.parse(JSON.stringify(cur)); return this.save(fn(draft) ?? draft); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    async usage() { return (usage ??= (await read(USAGE_KEY)) ?? []); },
    async addUsage(rec, now = Date.now()) { usage = addRecord(await this.usage(), rec, { now }); try { await write(USAGE_KEY, usage); } catch { /* 저장 실패는 호출을 막지 않는다 */ } return usage; },
    async clearUsage() { usage = []; await write(USAGE_KEY, usage); },
    async loadLog() { const r = await read(LOG_KEY); return Array.isArray(r) ? r : []; },
    async saveLog(rows) { try { await write(LOG_KEY, rows); } catch { /* 기록 저장 실패는 무시 */ } },
    async loadBatches() { const r = await read(BATCH_KEY); return r && typeof r === "object" && !Array.isArray(r) ? r : {}; },
    async saveBatches(m) { try { await write(BATCH_KEY, m); } catch { /* 저장 실패는 무시 */ } },
    defaults: defaultConfig
  };
}
