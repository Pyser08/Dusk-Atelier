// 애드온 로더(2.0.0 시험): 우리 저장소 목록(addons.json)의 애드온 ESM을 nativeFetch로 받아 저장해 두고,
// 시작할 때 같은 iframe 안에서 import(blob:)로 불러 activate(api, ctx)를 부른다. 리스 플러그인 목록에는 안 뜬다.
// - 받은 코드는 sha256을 맞춰 본 뒤에만 저장·실행한다(목록에 적힌 값과 다르면 버림).
// - 업데이트: 켜진 뒤 뒤에서 목록을 확인 → 바뀐 애드온만 받기. 훅이 없는 애드온은 바로 껐다 켜고, 훅이 있으면 다음 시작부터.
// - 새 버전이 켜지다 실패하면 바로 전 버전으로 되돌린다. 확인 실패는 조용히 넘어간다(지금 버전 그대로).
// - 저장: getLocalPluginStorage(RisuAI=콜드스토리지·동기화, Bard/Pocket=서버 KV) → 없으면 pluginStorage.
import { sha256 } from "../engine/hash.js";
import { parseManifest, pickUpdates, fitsCore } from "../engine/addons.js";

export const ADDON_MANIFEST_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/feat/2.0.0/addons/addons.json";
export const ADDON_URL_KEY = "dusk.addon.manifestUrl";
const INDEX_KEY = "dusk.addon.index", CODE = (id) => `dusk.addon.code.${id}`, PREV = (id) => `dusk.addon.prev.${id}`;
const CHECK_EVERY = 6 * 3600e3;

const storeOf = (api) => { try { return api.getLocalPluginStorage?.() ?? api.pluginStorage; } catch { return api.pluginStorage; } };

async function readText(res) {
  if (res == null) return null;
  if (typeof res === "string") return res;
  if (res.ok === false || (res.status && res.status >= 400)) return null;
  try { if (typeof res.text === "function") return await res.text(); } catch { /* 아래로 */ }
  const b = res.body ?? res.data;
  if (typeof b === "string") return b;
  if (b instanceof Uint8Array || b instanceof ArrayBuffer) return new TextDecoder().decode(b);
  return null;
}
export async function fetchText(api, url) {
  if (typeof api.nativeFetch === "function") {
    const t = await readText(await Promise.resolve().then(() => api.nativeFetch(url, { method: "GET" })).catch(() => null));   // method 없으면 POST
    if (t != null) return t;
  }
  if (typeof fetch === "function") return readText(await fetch(url, { cache: "no-store" }).catch(() => null));
  return null;
}

// 같은 iframe에서 ESM 코드 불러오기. 플러그인 iframe의 CSP는 eval을 막지만 nonce 붙은 스크립트의 동적 import는 허용한다(표준).
export async function importCode(code, id = "addon") {
  const src = `${code}\n//# sourceURL=dusk-addon-${id}.js`;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try { return await import(/* webpackIgnore: true */ url); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function createAddons(api, { core, ctx = {}, fetcher = fetchText, importer = importCode, hasher = sha256, now = () => Date.now(), log = (m) => console.log(`[Dusk Atelier] 애드온: ${m}`) } = {}) {
  const store = storeOf(api);
  const running = new Map();   // id → { mod, handle, version }
  const listeners = new Set();
  let manifest = null, lastCheck = 0, lastError = "";
  const emit = () => listeners.forEach((l) => { try { l(); } catch { /* 화면 오류는 무시 */ } });

  const getIndex = async () => { try { const v = await store.getItem(INDEX_KEY); return v && typeof v === "object" ? v : typeof v === "string" ? JSON.parse(v) : {}; } catch { return {}; } };
  const setIndex = (v) => store.setItem(INDEX_KEY, v);
  const manifestUrl = async () => { try { const v = await api.pluginStorage?.getItem(ADDON_URL_KEY); return typeof v === "string" && /^https:\/\//.test(v) ? v : ADDON_MANIFEST_URL; } catch { return ADDON_MANIFEST_URL; } };

  async function start(id, code, version) {
    const mod = await importer(code, id);
    if (typeof mod?.activate !== "function") throw new Error("activate 함수가 없어요");
    const handle = (await mod.activate(api, { ...ctx, addonId: id, version })) ?? {};
    running.set(id, { mod, handle, version });
  }
  async function stop(id) {
    const r = running.get(id);
    if (!r) return;
    running.delete(id);
    try { await (r.handle.deactivate ?? r.mod.deactivate)?.(); } catch (e) { log(`${id} 끄기 실패 ${e?.message ?? e}`); }
  }

  // 시작: 저장해 둔 코드로 바로 켠다(네트워크 기다리지 않음). 실패하면 전 버전으로.
  async function boot() {
    const idx = await getIndex();
    await Promise.all(Object.entries(idx).filter(([, v]) => v.on !== false).map(async ([id, v]) => {
      try { await start(id, await store.getItem(CODE(id)), v.version); }
      catch (e) {
        log(`${id} v${v.version} 시작 실패 ${e?.message ?? e}`);
        if (v.prev && await rollback(id, idx)) return;
        idx[id] = { ...v, on: false, error: String(e?.message ?? e) }; await setIndex(idx);
      }
    }));
    emit();
    setTimeout(() => { check().catch(() => {}); }, 3000);
  }

  async function rollback(id, idx) {
    const v = idx[id], code = await store.getItem(PREV(id)).catch(() => null);
    if (!v?.prev || typeof code !== "string") return false;
    try { await start(id, code, v.prev.version); } catch { return false; }
    await store.setItem(CODE(id), code);
    idx[id] = { version: v.prev.version, sha256: v.prev.sha256, on: true, at: now(), rolledBack: v.version };
    await setIndex(idx);
    log(`${id} v${v.version} 대신 v${v.prev.version}로 되돌렸어요`);
    return true;
  }

  async function loadManifest() {
    const text = await fetcher(api, await manifestUrl());
    if (text == null) throw new Error("목록을 받지 못했어요");
    const m = parseManifest(text);
    if (m.errors.length) log(`목록 오류 ${m.errors.join(", ")}`);
    manifest = m.addons;
    return manifest;
  }

  async function download(a) {
    const code = await fetcher(api, a.url);
    if (typeof code !== "string") throw new Error("파일을 받지 못했어요");
    const got = await hasher(new TextEncoder().encode(code));
    if (got !== a.sha256) throw new Error("파일 확인값이 목록과 달라요");
    return code;
  }

  // 받기·업데이트 한 개. 훅이 있는 애드온 업데이트는 다음 시작부터(applyNow:false).
  async function install(id, { applyNow } = {}) {
    const list = manifest ?? await loadManifest();
    const a = list.find((x) => x.id === id);
    if (!a) throw new Error("목록에 없는 애드온이에요");
    if (!fitsCore(a, core)) throw new Error(`Dusk v${a.minCore} 이상이 필요해요`);
    const code = await download(a);
    const idx = await getIndex(), cur = idx[id];
    if (cur) { const old = await store.getItem(CODE(id)).catch(() => null); if (typeof old === "string") { await store.setItem(PREV(id), old); } }
    await store.setItem(CODE(id), code);
    idx[id] = { version: a.version, sha256: a.sha256, on: cur?.on ?? true, at: now(), prev: cur ? { version: cur.version, sha256: cur.sha256 } : undefined };
    await setIndex(idx);
    const now_ = applyNow ?? (!a.hooks || !running.has(id));
    if (idx[id].on && now_) {
      await stop(id);
      try { await start(id, code, a.version); }
      catch (e) { if (!(await rollback(id, idx))) { idx[id].on = false; idx[id].error = String(e?.message ?? e); await setIndex(idx); } throw e; }
    } else if (idx[id].on) idx[id].pendingRestart = true, await setIndex(idx);
    emit();
    return idx[id];
  }

  async function setOn(id, on) {
    const idx = await getIndex();
    if (!idx[id]) return;
    idx[id] = { ...idx[id], on, error: undefined };
    await setIndex(idx);
    if (on) await start(id, await store.getItem(CODE(id)), idx[id].version); else await stop(id);
    emit();
  }

  async function remove(id) {
    await stop(id);
    const idx = await getIndex(); delete idx[id]; await setIndex(idx);
    await store.removeItem?.(CODE(id)); await store.removeItem?.(PREV(id));
    emit();
  }

  // 업데이트 확인(뒤에서). force가 아니면 6시간에 한 번.
  async function check({ force = false } = {}) {
    if (!force && now() - lastCheck < CHECK_EVERY) return { updates: [], held: [] };
    lastCheck = now();
    try {
      const list = await loadManifest();
      const res = pickUpdates(await getIndex(), list, core);
      for (const a of res.updates) { try { await install(a.id); log(`${a.id} v${a.version}로 업데이트했어요`); } catch (e) { log(`${a.id} 업데이트 실패 ${e?.message ?? e}`); } }
      lastError = ""; emit();
      return res;
    } catch (e) { lastError = String(e?.message ?? e); emit(); return { updates: [], held: [], error: lastError }; }
  }

  return {
    boot, check, install, remove, setOn, getIndex, loadManifest,
    core: () => core,
    manifest: () => manifest,
    running: (id) => running.has(id),
    lastError: () => lastError,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async dispose() { for (const id of [...running.keys()]) await stop(id); }
  };
}
