// 애드온 로더(2.0.0 시험): 우리 저장소 목록(addons.json)의 애드온 ESM을 nativeFetch로 받아 저장해 두고,
// 시작할 때 같은 iframe 안에서 import(blob:)로 불러 activate(api, ctx)를 부른다. 리스 플러그인 목록에는 안 뜬다.
// - 받은 코드는 sha256을 맞춰 본 뒤에만 저장·실행한다(목록에 적힌 값과 다르면 버림).
// - 업데이트: 켜진 뒤 뒤에서 목록을 확인 → 바뀐 애드온만 받기. 훅이 없는 애드온은 바로 껐다 켜고, 훅이 있으면 다음 시작부터.
// - 새 버전이 켜지다 실패하면 바로 전 버전으로 되돌린다. 확인 실패는 조용히 넘어간다(지금 버전 그대로).
// - 저장: getLocalPluginStorage(RisuAI=콜드스토리지·동기화, Bard/Pocket=서버 KV) → 없으면 pluginStorage.
import { sha256 } from "../engine/hash.js";
import { parseManifest, pickUpdates, fitsCore, installOrder } from "../engine/addons.js";
import { scopeApi, createProviderRelay } from "./addonscope.js";

// 애드온 목록은 배포 전용 브랜치 addons에서 읽는다(작업 브랜치에 푸시해도 사용자에게 바로 퍼지지 않게). 올리기: node tools/publish-addons.mjs
export const ADDON_MANIFEST_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/addons/addons/addons.json";
export const ADDON_URL_KEY = "dusk.addon.manifestUrl";
export const ADOPT_KEY = "dusk.addon.adopted.v2";
export const SEEN_KEY = "dusk.addon.seen.v1";   // 목록에서 본 적 있는 애드온 id(새로 생긴 애드온 알림용)
const INDEX_KEY = "dusk.addon.index", CODE = (id) => `dusk.addon.code.${id}`, PREV = (id) => `dusk.addon.prev.${id}`;
// 업데이트 확인: 켜질 때 한 번 + 실행 중 1시간마다 + Dusk 창을 열 때(마지막 확인이 10분 넘었으면).
// 예전엔 켜질 때 한 번뿐이라 리스를 켜 둔 채로는 새 애드온을 못 받았다.
const CHECK_EVERY = 3600e3, SOON_EVERY = 60e3;   // 창을 열 때는 1분만 지나도 다시 본다(애드온을 올리고 바로 확인할 수 있게)
// GitHub raw는 몇 분 동안 옛 파일을 돌려주므로 주소에 값을 붙여 캐시를 건너뛴다(파일은 sha256으로 따로 확인)
const bust = (u, v) => u + (u.includes("?") ? "&" : "?") + v;

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


export function createAddons(api, { core, ctx = {}, onPendingRestart = null, onNewAddons = null, timers = globalThis, fetcher = fetchText, importer = importCode, hasher = sha256, now = () => Date.now(), log = (m) => console.log(`[Dusk Atelier] 애드온: ${m}`) } = {}) {
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
  // 목록 저장은 줄을 세워 하나씩, 그리고 바꾼 애드온 줄만 최신 목록에 합친다 —
  // 여러 개를 동시에 받을 때 서로의 기록을 덮어써 '받는 중'에서 멈추던 문제(2.0.0)
  let saving = Promise.resolve();
  const setIndex = (v, ids = null) => {
    const run = saving.then(async () => {
      if (!ids) return store.setItem(INDEX_KEY, v);
      const fresh = await getIndex();
      for (const id of ids) { if (v[id] === undefined) delete fresh[id]; else fresh[id] = v[id]; }
      return store.setItem(INDEX_KEY, fresh);
    });
    saving = run.catch(() => {});
    return run;
  };
  const manifestUrl = async () => { try { const v = await api.pluginStorage?.getItem(ADDON_URL_KEY); return typeof v === "string" && /^https:\/\//.test(v) ? v : ADDON_MANIFEST_URL; } catch { return ADDON_MANIFEST_URL; } };

  // 애드온마다 따로 쓰는 api(addonscope.js): 끌 때 그 애드온이 단 훅을 모두 떼서, 훅 애드온도 새로고침 없이 갈아 끼운다
  const relay = createProviderRelay(api);
  async function start(id, code, version) {
    const mod = await importer(code, id);
    if (typeof mod?.activate !== "function") throw new Error("activate 함수가 없어요");
    const scope = scopeApi(api, relay);
    let handle;
    try { handle = (await mod.activate(scope.api, { ...ctx, addonId: id, version })) ?? {}; }
    catch (e) { await scope.cleanup(); throw e; }
    running.set(id, { mod, handle, version, scope });
  }
  async function stop(id) {
    const r = running.get(id);
    if (!r) return;
    running.delete(id);
    try { await (r.handle.deactivate ?? r.mod.deactivate)?.(); } catch (e) { log(`${id} 끄기 실패 ${e?.message ?? e}`); }
    await r.scope?.cleanup();
  }
  // 이 애드온을 필요로 하며 켜져 있는 애드온들(다시 켤 때 새 버전을 보게 함께 다시 켠다)
  const dependents = (idx, id) => Object.entries(idx).filter(([o, v]) => o !== id && running.has(o) && (v.requires ?? []).includes(id)).map(([o]) => o);

  // 시작: 저장해 둔 코드로 바로 켠다(네트워크 기다리지 않음). 실패하면 전 버전으로.
  async function boot() {
    const idx = await getIndex();
    // 다시 시작했으니 저장된(새) 버전으로 켜진다 → '새로고침하면 적용' 표시를 지운다
    if (Object.values(idx).some((v) => v?.pendingRestart)) { for (const v of Object.values(idx)) if (v) delete v.pendingRestart; await setIndex(idx); }
    // 동시에 켠다: 저장된 코드는 한꺼번에 읽고, 각 애드온은 자기 필요 애드온(requires)이 켜지기만 기다린다.
    // (예전: 전부 차례로 → 애드온이 늘수록 늦게 켜져서 장기기억 훅이 첫 요청을 놓칠 수 있었다)
    const ids = Object.entries(idx).filter(([, v]) => v.on !== false).map(([id]) => id);
    const codes = new Map(await Promise.all(ids.map(async (id) => [id, await store.getItem(CODE(id)).catch(() => null)])));
    const started = new Map();
    const launch = (id, stack = new Set()) => {
      if (started.has(id)) return started.get(id);
      const v = idx[id];
      const p = (async () => {
        const req = (v.requires ?? []).filter((r) => r !== id && !stack.has(r));
        const ok = await Promise.all(req.map((r) => (idx[r] && idx[r].on !== false && ids.includes(r) ? launch(r, new Set([...stack, id])) : Promise.resolve(false))));
        if (ok.some((x) => !x) || req.some((r) => !running.has(r))) { log(`${id}: 필요한 애드온(${v.requires.join(", ")})이 켜져 있지 않아 시작하지 않았어요`); return false; }
        try { await start(id, codes.get(id), v.version); return true; }
        catch (e) {
          log(`${id} v${v.version} 시작 실패 ${e?.message ?? e}`);
          if (v.prev && await rollback(id, idx)) return running.has(id);
          idx[id] = { ...v, on: false, error: String(e?.message ?? e) }; await setIndex(idx, [id]);
          return false;
        }
      })();
      started.set(id, p);
      return p;
    };
    await Promise.all(ids.map((id) => launch(id)));
    emit();
    timers.setTimeout(() => { check().catch(() => {}); }, 3000);
    if (!autoTimer) { autoTimer = timers.setInterval(() => check().catch(() => {}), CHECK_EVERY); autoTimer?.unref?.(); }
  }
  let autoTimer = null;
  // Dusk 창을 열 때 부른다: 마지막 확인이 10분 넘었으면 확인
  const checkSoon = () => (now() - lastCheck >= SOON_EVERY ? check({ force: true }) : Promise.resolve({ updates: [], held: [] }));

  async function rollback(id, idx) {
    const v = idx[id], code = await store.getItem(PREV(id)).catch(() => null);
    if (!v?.prev || typeof code !== "string") return false;
    try { await start(id, code, v.prev.version); } catch { return false; }
    await store.setItem(CODE(id), code);
    idx[id] = { version: v.prev.version, sha256: v.prev.sha256, on: true, at: now(), rolledBack: v.version };
    await setIndex(idx, [id]);
    log(`${id} v${v.version} 대신 v${v.prev.version}로 되돌렸어요`);
    return true;
  }

  // raw.githubusercontent는 ?t= 값을 붙여도 최대 5분 예전 사본을 줄 때가 있다 → '업데이트 확인' 버튼(fresh)일 때만
  // GitHub API로 브랜치 최신 커밋을 받아 그 커밋으로 고정한 주소를 쓴다(고정 주소는 내용이 바뀌지 않으니 캐시돼도 최신). 실패하면 예전 길.
  let pin = null;   // { from: ".../<브랜치>/", to: ".../<커밋>/" } — 받은 목록 안 애드온 주소도 같이 바꾼다
  const RAW = /^https:\/\/raw\.githubusercontent\.com\/([\w.-]+)\/([\w.-]+)\/([\w.-]+)\//;
  async function pinFresh(url) {
    const m = url.match(RAW); if (!m) return null;
    try {
      const t = await fetcher(api, `https://api.github.com/repos/${m[1]}/${m[2]}/git/ref/heads/${m[3]}`);
      const sha = JSON.parse(t ?? "null")?.object?.sha;
      return /^[0-9a-f]{40}$/.test(sha ?? "") ? { from: m[0], to: `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${sha}/` } : null;
    } catch { return null; }
  }
  const pinned = (u) => (pin && u.startsWith(pin.from) ? pin.to + u.slice(pin.from.length) : u);
  async function loadManifest(fresh = false) {
    const url0 = await manifestUrl();
    pin = fresh ? await pinFresh(url0) : null;
    const text = await fetcher(api, pin ? pinned(url0) : bust(url0, `t=${now()}`));
    if (text == null) throw new Error("목록을 받지 못했어요");
    const m = parseManifest(text);
    if (m.errors.length) log(`목록 오류 ${m.errors.join(", ")}`);
    manifest = m.addons;
    return manifest;
  }

  async function download(a) {
    const code = await fetcher(api, pin && a.url.startsWith(pin.from) ? pinned(a.url) : bust(a.url, `v=${a.sha256.slice(0, 12)}`));
    if (typeof code !== "string") throw new Error("파일을 받지 못했어요");
    const got = await hasher(new TextEncoder().encode(code));
    if (got !== a.sha256) throw new Error(`파일 확인값이 목록과 달라요 (받은 ${code.length}자 ${got.slice(0, 8)} / 목록 ${a.sha256.slice(0, 8)})`);
    return code;
  }

  // 받기·업데이트 한 개. 훅이 있는 애드온 업데이트는 다음 시작부터(applyNow:false).
  async function install(id, { applyNow, withRequires = true } = {}) {
    const list = manifest ?? await loadManifest();
    let a = list.find((x) => x.id === id);
    if (!a) throw new Error("목록에 없는 애드온이에요");
    // 필요 애드온을 먼저 받는다(이미 있으면 켜기만)
    if (withRequires && a.requires?.length) {
      const { order, missing } = installOrder(id, list);
      if (missing.length) throw new Error(`필요한 애드온(${missing.join(", ")})이 목록에 없어요`);
      const have = await getIndex();
      for (const r of order.filter((x) => x !== id)) {
        if (!have[r]) await installOne(r, { withRequires: false });
        else if (have[r].on === false) await setOn(r, true);
      }
    }
    if (!fitsCore(a, core)) throw new Error(`Dusk v${a.minCore} 이상이 필요해요`);
    let code;
    try { code = await download(a); }
    catch (e) {
      // 목록과 파일이 서로 다른 때의 사본을 받으면 확인값이 어긋난다(raw 캐시가 목록만/파일만 옛것을 줄 때) → 커밋 고정 주소로 목록을 다시 받아 한 번 더
      if (!/확인값/.test(String(e?.message))) throw e;
      const again = (await loadManifest(true)).find((x) => x.id === id);
      if (!again) throw e;
      a = again; code = await download(a);
    }
    const idx = await getIndex(), cur = idx[id];
    if (cur) { const old = await store.getItem(CODE(id)).catch(() => null); if (typeof old === "string") { await store.setItem(PREV(id), old); } }
    await store.setItem(CODE(id), code);
    idx[id] = { version: a.version, sha256: a.sha256, on: cur?.on ?? true, at: now(), prev: cur ? { version: cur.version, sha256: cur.sha256 } : undefined, requires: a.requires?.length ? a.requires : undefined };
    await setIndex(idx, [id]);
    const now_ = applyNow ?? true;   // 훅 애드온도 바로(addonscope가 예전 훅을 떼 준다)
    if (idx[id].on && now_) {
      const deps = dependents(idx, id);
      for (const d of deps) await stop(d);
      await stop(id);
      try { await start(id, code, a.version); }
      catch (e) { if (!(await rollback(id, idx))) { idx[id].on = false; idx[id].error = String(e?.message ?? e); await setIndex(idx, [id]); } throw e; }
      finally { for (const d of deps) { try { await start(d, await store.getItem(CODE(d)), idx[d]?.version); } catch (e) { log(`${d} 다시 켜기 실패 ${e?.message ?? e}`); } } }
    } else if (idx[id].on) {
      idx[id].pendingRestart = true; await setIndex(idx, [id]);
      // 훅이 있는 애드온은 다음 시작부터 새 버전 → 새로고침을 부탁하는 안내(main.js)
      try { onPendingRestart?.({ id, name: a.name, version: a.version }); } catch { /* 안내 실패는 무시 */ }
    }
    emit();
    return idx[id];
  }

  // 여러 개 한꺼번에(동시에 받되 같은 애드온은 한 번만). 결과: [{ id, ok, error }]
  const inflight = new Map();
  function installOne(id, opts) {
    if (!inflight.has(id)) inflight.set(id, install(id, opts).finally(() => inflight.delete(id)));
    return inflight.get(id);
  }
  async function installMany(ids) {
    return Promise.all([...new Set(ids)].map((id) => installOne(id).then(() => ({ id, ok: true }), (e) => ({ id, ok: false, error: String(e?.message ?? e) }))));
  }

  async function setOn(id, on) {
    const idx = await getIndex();
    if (!idx[id]) return;
    // 켜기: 필요 애드온도 켠다 / 끄기: 이 애드온이 필요한 애드온도 끈다
    if (on) for (const r of idx[id].requires ?? []) if (idx[r] && idx[r].on === false) await setOn(r, true);
    if (!on) for (const [other, v] of Object.entries(idx)) if (other !== id && v.on !== false && (v.requires ?? []).includes(id)) await setOn(other, false);
    idx[id] = { ...idx[id], on, error: undefined };
    await setIndex(idx, [id]);
    if (on) await start(id, await store.getItem(CODE(id)), idx[id].version); else await stop(id);
    emit();
  }

  async function remove(id) {
    for (const [other, v] of Object.entries(await getIndex())) if (other !== id && (v.requires ?? []).includes(id)) await remove(other);   // 이 애드온이 필요한 것도 함께
    await stop(id);
    const idx = await getIndex(); delete idx[id]; await setIndex(idx, [id]);
    await store.removeItem(CODE(id)); await store.removeItem(PREV(id));
    emit();
  }

  // 업데이트 확인(뒤에서). force가 아니면 1시간에 한 번.
  // 받지 않은 새 애드온이 목록에 생기면 알린다. 처음엔 기준만 잡고(지금 목록 전부를 본 것으로), 버전만 오른 것은 알리지 않는다.
  async function noticeNew(list) {
    const raw = await store.getItem(SEEN_KEY).catch(() => null);
    let seen = null; try { seen = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { seen = null; }
    const ids = list.map((a) => a.id);
    if (!Array.isArray(seen)) { await store.setItem(SEEN_KEY, ids); return []; }
    const idx = await getIndex();
    const fresh = list.filter((a) => !seen.includes(a.id) && !idx[a.id] && fitsCore(a, core));
    if (fresh.length) { await store.setItem(SEEN_KEY, [...new Set([...seen, ...ids])]); try { onNewAddons?.(fresh.map((a) => ({ id: a.id, name: a.name, desc: a.desc }))); } catch { /* 알림 실패는 무시 */ } }
    return fresh;
  }
  async function check({ force = false, fresh = false } = {}) {
    if (!force && now() - lastCheck < CHECK_EVERY - 60e3) return { updates: [], held: [] };
    lastCheck = now();
    try {
      const list = await loadManifest(fresh);
      const res = pickUpdates(await getIndex(), list, core);
      await noticeNew(list).catch(() => {});
      for (const r of await installMany(res.updates.map((a) => a.id))) log(r.ok ? `${r.id} 업데이트했어요` : `${r.id} 업데이트 실패 ${r.error}`);   // 동시에 받는다
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
    boot, check, checkSoon, install: installOne, installMany, installing: (id) => inflight.has(id), remove, setOn, getIndex, loadManifest, adopt,
    core: () => core,
    manifest: () => manifest,
    running: (id) => running.has(id),
    lastError: () => lastError,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async dispose() { for (const id of [...running.keys()]) await stop(id); }
  };
}
