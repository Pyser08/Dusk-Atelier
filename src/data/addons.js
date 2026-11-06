// 애드온 로더(2.0.0 시험): 우리 저장소 목록(addons.json)의 애드온 ESM을 nativeFetch로 받아 저장해 두고,
// 시작할 때 같은 iframe 안에서 import(blob:)로 불러 activate(api, ctx)를 부른다. 리스 플러그인 목록에는 안 뜬다.
// - 받은 코드는 sha256을 맞춰 본 뒤에만 저장·실행한다(목록에 적힌 값과 다르면 버림).
// - 업데이트: 켜진 뒤 뒤에서 목록을 확인 → 바뀐 애드온만 받기. 훅이 없는 애드온은 바로 껐다 켜고, 훅이 있으면 다음 시작부터.
// - 새 버전이 켜지다 실패하면 바로 전 버전으로 되돌린다. 확인 실패는 조용히 넘어간다(지금 버전 그대로).
// - 저장: getLocalPluginStorage(RisuAI=콜드스토리지·동기화, Bard/Pocket=서버 KV) → 없으면 pluginStorage.
import { sha256 } from "../engine/hash.js";
import { parseManifest, pickUpdates, fitsCore, installOrder, bootOrder } from "../engine/addons.js";

// 애드온 목록은 배포 전용 브랜치 addons에서 읽는다(작업 브랜치에 푸시해도 사용자에게 바로 퍼지지 않게). 올리기: node tools/publish-addons.mjs
export const ADDON_MANIFEST_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/addons/addons/addons.json";
export const ADDON_URL_KEY = "dusk.addon.manifestUrl";
export const ADOPT_KEY = "dusk.addon.adopted.v2";
const INDEX_KEY = "dusk.addon.index", CODE = (id) => `dusk.addon.code.${id}`, PREV = (id) => `dusk.addon.prev.${id}`;
const CHECK_EVERY = 6 * 3600e3;

// v3 api는 다리(postMessage)를 건너 오므로 getLocalPluginStorage()가 Promise로 온다 → await 후 메서드가 있는지 확인, 없으면 pluginStorage.
const usable = (s) => s && typeof s.getItem === "function" && typeof s.setItem === "function";
async function storeOf(api) {
  try { const s = await api.getLocalPluginStorage?.(); if (usable(s)) return s; } catch { /* 아래로 */ }
  return api.pluginStorage;
}

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
  let storeP = null;
  const S = () => (storeP ??= storeOf(api));
  // 값은 문자열로만 저장한다(호스트마다 객체 저장 방식이 달라서)
  const store = {
    getItem: async (k) => (await S()).getItem(k),
    setItem: async (k, v) => (await S()).setItem(k, typeof v === "string" ? v : JSON.stringify(v)),
    removeItem: async (k) => { const s = await S(); return typeof s.removeItem === "function" ? s.removeItem(k) : s.setItem(k, ""); }
  };
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
    // 필요 애드온(requires, 설치 기록에 저장)이 먼저 켜지게 순서대로. 서로 상관없는 것끼리는 기다리지 않아도 되지만 단순하게 차례로.
    const ids = bootOrder(Object.entries(idx).filter(([, v]) => v.on !== false).map(([id]) => id), (id) => idx[id]?.requires);
    for (const id of ids) {
      const v = idx[id];
      if ((v.requires ?? []).some((r) => !running.has(r))) { log(`${id}: 필요한 애드온(${v.requires.join(", ")})이 켜져 있지 않아 시작하지 않았어요`); continue; }
      try { await start(id, await store.getItem(CODE(id)), v.version); }
      catch (e) {
        log(`${id} v${v.version} 시작 실패 ${e?.message ?? e}`);
        if (v.prev && await rollback(id, idx)) continue;
        idx[id] = { ...v, on: false, error: String(e?.message ?? e) }; await setIndex(idx);
      }
    }
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
  async function install(id, { applyNow, withRequires = true } = {}) {
    const list = manifest ?? await loadManifest();
    const a = list.find((x) => x.id === id);
    if (!a) throw new Error("목록에 없는 애드온이에요");
    // 필요 애드온을 먼저 받는다(이미 있으면 켜기만)
    if (withRequires && a.requires?.length) {
      const { order, missing } = installOrder(id, list);
      if (missing.length) throw new Error(`필요한 애드온(${missing.join(", ")})이 목록에 없어요`);
      const have = await getIndex();
      for (const r of order.filter((x) => x !== id)) {
        if (!have[r]) await install(r, { withRequires: false });
        else if (have[r].on === false) await setOn(r, true);
      }
    }
    if (!fitsCore(a, core)) throw new Error(`Dusk v${a.minCore} 이상이 필요해요`);
    const code = await download(a);
    const idx = await getIndex(), cur = idx[id];
    if (cur) { const old = await store.getItem(CODE(id)).catch(() => null); if (typeof old === "string") { await store.setItem(PREV(id), old); } }
    await store.setItem(CODE(id), code);
    idx[id] = { version: a.version, sha256: a.sha256, on: cur?.on ?? true, at: now(), prev: cur ? { version: cur.version, sha256: cur.sha256 } : undefined, requires: a.requires?.length ? a.requires : undefined };
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
    // 켜기: 필요 애드온도 켠다 / 끄기: 이 애드온이 필요한 애드온도 끈다
    if (on) for (const r of idx[id].requires ?? []) if (idx[r] && idx[r].on === false) await setOn(r, true);
    if (!on) for (const [other, v] of Object.entries(idx)) if (other !== id && v.on !== false && (v.requires ?? []).includes(id)) await setOn(other, false);
    idx[id] = { ...idx[id], on, error: undefined };
    await setIndex(idx);
    if (on) await start(id, await store.getItem(CODE(id)), idx[id].version); else await stop(id);
    emit();
  }

  async function remove(id) {
    for (const [other, v] of Object.entries(await getIndex())) if (other !== id && (v.requires ?? []).includes(id)) await remove(other);   // 이 애드온이 필요한 것도 함께
    await stop(id);
    const idx = await getIndex(); delete idx[id]; await setIndex(idx);
    await store.removeItem(CODE(id)); await store.removeItem(PREV(id));
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

  // 2.0.0 첫 실행: 코어에서 빠진 기능 중 쓰던 것(켜 두었거나 데이터가 있는 것)의 애드온을 자동으로 받는다.
  // probes: [[id, async () => bool], …]. 다 받으면 표시를 남겨 다시 하지 않고, 하나라도 실패하면 다음 시작에 다시 시도한다.
  async function adopt(probes) {
    try { if (await store.getItem(ADOPT_KEY)) return { done: true, got: [] }; } catch { /* 처음 */ }
    const idx = await getIndex(), got = [], failed = [];
    for (const [id, probe] of probes) {
      if (idx[id]) continue;
      let used = false; try { used = !!(await probe()); } catch { used = false; }
      if (!used) continue;
      try { await install(id); got.push(id); } catch (e) { failed.push(id); log(`${id} 자동 받기 실패 ${e?.message ?? e}`); }
    }
    if (!failed.length) await store.setItem(ADOPT_KEY, "1");
    return { done: !failed.length, got, failed };
  }

  return {
    boot, check, install, remove, setOn, getIndex, loadManifest, adopt,
    core: () => core,
    manifest: () => manifest,
    running: (id) => running.has(id),
    lastError: () => lastError,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async dispose() { for (const id of [...running.keys()]) await stop(id); }
  };
}
