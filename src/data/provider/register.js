// 리스에 프로바이더 등록 (v1.9.3). addProvider가 없는 호스트에서는 꺼 둔다(supported=false).
// 이름: "Dusk 자동"(용도별 규칙대로) + "Dusk · 프로필이름"(그 프로필 고정)
import { createProviderStore } from "./store.js";
const AUTO = "Dusk 자동";
export const providerName = (p) => `Dusk · ${p.name}`;
export function createRegistrar(api, { runner, store, log = () => {} }) {
  const registered = new Map(); // 이름 → 프로필 ID("" = 자동)
  const supported = () => typeof api.addProvider === "function";
  async function add(name, profileId) {
    if (registered.has(name)) { registered.set(name, profileId); return; }
    registered.set(name, profileId);
    await api.addProvider(name, async (req, signal) => runner.handle({ ...req, __profile: registered.get(name) || "" }, signal ?? req?.abortSignal), { tokenizer: "o200k_base" });
  }
  async function sync() {
    if (!supported()) return { supported: false, names: [] };
    const cfg = await store.get(); if (!cfg.enabled) return { supported: true, names: [...registered.keys()] };
    await add(AUTO, ""); for (const p of cfg.profiles) await add(providerName(p), p.id);
    return { supported: true, names: [...registered.keys()] };
  }
  return { sync, supported, names: () => [...registered.keys()], profileOfName: (n) => registered.get(n) };
}
export { AUTO as AUTO_NAME, createProviderStore };
