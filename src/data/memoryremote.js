// 장기기억을 Dusk Cellar에 저장 (1.8.3)
//
// · Cellar(기억 저장 지원, features에 "mem")가 감지되면 채팅 기억 폴더(dusk.mem.v3.f.*)를 서버로 한 번 올리고,
//   그다음부터는 서버에만 읽고 쓴다. 인덱스·설정 등 나머지 키는 지금처럼 플러그인 저장소에 둔다.
// · 서버로 바뀐 리스는 FLAG_KEY에 표시한다(플러그인 저장소는 같은 리스의 기기끼리 공유되므로 기기마다 따로 올리지 않는다).
// · 연결이 끊기면 바뀐 폴더만 QUEUE_KEY에 임시로 쌓고(폴더마다 마지막 값 하나), 다시 연결되면 순서대로 올린 뒤 지운다.
//   끊긴 동안 읽기 = 대기열 → 이번 세션에 받은 값 → 서버로 옮기기 전 플러그인에 남아 있던 옛 사본 순.
// · 다른 기기가 먼저 바꿨으면(rev 충돌) 서버 값과 합친다: 기록·장면은 id로 합치고, 위키는 revision이 큰 쪽.
// · Cellar가 없으면 아무것도 하지 않는다(플러그인 저장소 그대로).
// · 서버로 옮긴 뒤에도 플러그인에 있던 예전 폴더 키는 지우지 않는다(옛 사본 — 끊겼을 때 읽기·되돌리기에 씀).
import { cellarRequest } from "./cellar.js";

export const FLAG_KEY = "dusk.cellar.mem";
export const QUEUE_KEY = "dusk.cellar.queue";
export const REMOTE_PREFIX = "dusk.mem.v3.f.";
const READ_TIMEOUT = 4000, WRITE_TIMEOUT = 15000;
const OFFLINE_AFTER = 2, RETRY_MS = 30e3;
const QUEUE_WARN = 8 * 1024 * 1024;
const BATCH_BYTES = 2 * 1024 * 1024;

const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw ?? null; } catch { return null; } };
const opId = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
const enc = (k) => encodeURIComponent(k);

// id로 합치기: a 순서 유지, b에만 있는 것은 뒤에. 같은 id면 b(이 기기에서 바꾼 것)를 쓴다.
function unionById(a = [], b = []) {
  const out = [], pos = new Map(), seen = new Set();
  for (const x of a) { const id = x?.id; if (id != null) { pos.set(id, out.length); out.push(x); } else { const s = JSON.stringify(x); if (!seen.has(s)) { seen.add(s); out.push(x); } } }
  for (const x of b) { const id = x?.id; if (id != null) { if (pos.has(id)) out[pos.get(id)] = x; else { pos.set(id, out.length); out.push(x); } } else { const s = JSON.stringify(x); if (!seen.has(s)) { seen.add(s); out.push(x); } } }
  return out;
}
// 채팅 기억 폴더 합치기. server·local은 객체 또는 null(삭제). 이 기기에서 지웠으면 지운 쪽을 따른다.
export function mergeFolder(server, local) {
  if (local === null) return null;
  if (!server || typeof server !== "object") return local;
  if (!local || typeof local !== "object") return server;
  const out = { ...server, ...local };
  const people = { ...(server.people ?? {}) };
  for (const [name, lp] of Object.entries(local.people ?? {})) {
    const sp = people[name];
    people[name] = sp ? { ...sp, ...lp, records: unionById(sp.records, lp.records) } : lp;
  }
  out.people = people;
  out.scenes = unionById(server.scenes, local.scenes);
  const sw = server.wiki, lw = local.wiki;
  out.wiki = sw && lw ? ((Number(sw.revision) || 0) > (Number(lw.revision) || 0) ? sw : lw) : (lw ?? sw ?? null);
  return out;
}

export function createMemoryRemote(api, { cellar, log = (...a) => console.log("[Dusk Atelier] 기억 서버", ...a), notify = () => {}, now = () => Date.now(), retryMs = RETRY_MS } = {}) {
  const ps = api.pluginStorage;
  let mode = "local";        // local | remote
  let conn = null;           // { url, via } — health를 통과한 길
  let fails = 0, offlineUntil = 0, lastError = "";
  let queue = null;          // [{ key, value(null=삭제), baseRev(null=모름), opId, at }]
  let warned = false, flushing = null, timer = null;
  let attach = { serial: (fn) => fn(), folderKeys: async () => [], dropCache: () => {} };
  const cache = new Map();   // key → { rev, value } (이번 세션에 서버에서 받은 것. value null = 서버에 없음)

  const isRemoteKey = (k) => typeof k === "string" && k.startsWith(REMOTE_PREFIX);
  const offline = () => !conn || now() < offlineUntil;
  const ok = () => { fails = 0; offlineUntil = 0; lastError = ""; };
  const failed = (e) => { lastError = String(e?.message ?? e); if (++fails >= OFFLINE_AFTER) offlineUntil = now() + retryMs; };
  const req = (path, opts) => cellarRequest(api, conn, path, opts);

  async function loadQueue() {
    if (queue) return queue;
    const q = parse(await ps.getItem(QUEUE_KEY));
    queue = Array.isArray(q) ? q.filter((e) => isRemoteKey(e?.key)) : [];
    return queue;
  }
  const saveQueue = () => (queue.length ? ps.setItem(QUEUE_KEY, JSON.stringify(queue)) : ps.removeItem(QUEUE_KEY));
  async function enqueue(key, value, baseRev) {
    await loadQueue();
    const e = queue.find((x) => x.key === key);
    if (e) { e.value = value; e.opId = opId(); e.at = now(); }
    else queue.push({ key, value, baseRev, opId: opId(), at: now() });
    await saveQueue();
    const size = queue.reduce((n, x) => n + (x.value?.length ?? 0), 0);
    if (size > QUEUE_WARN && !warned) { warned = true; notify("Dusk Cellar 연결이 끊긴 동안 쌓인 기억이 많아요. 서버를 확인해 주세요."); }
    schedule();
  }
  function schedule() {
    if (timer || mode !== "remote") return;
    timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, Math.max(1000, offlineUntil - now()));
    timer?.unref?.();
  }

  async function fetchKey(key) {
    const c = cache.get(key);
    const q = c && c.value !== null ? `?ifRev=${c.rev}` : "";
    const { status, json } = await req(`/cellar/mem/${enc(key)}${q}`, { timeout: READ_TIMEOUT });
    if (status === 404) { cache.set(key, { rev: 0, value: null }); return null; }
    if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`);
    if (json.same && c) return c.value;
    cache.set(key, { rev: json.rev, value: json.value });
    return json.value;
  }

  // 한 키 쓰기(value null = 삭제). 충돌이면 서버 값과 합쳐 다시 쓴다. 반환: true(반영) / 연결 문제는 throw(network)
  // baseRev null = 서버 값을 모름(이번 세션에 못 읽음) → 덮어쓰지 않고 먼저 받아 합친다.
  async function pushKey(key, value, baseRev, id, timeout = WRITE_TIMEOUT) {
    let base = baseRev, val = value, op = id;
    if (base === null || base === undefined) {
      cache.delete(key);
      const cur = await fetchKey(key);
      if (cur !== null) { const merged = mergeFolder(parse(cur), val === null ? null : parse(val)); val = merged === null ? null : JSON.stringify(merged); }
      base = cache.get(key)?.rev ?? 0;
    }
    for (let i = 0; i < 4; i++) {
      const o = val === null ? { op: "del", key, baseRev: base } : { op: "put", key, value: val, opId: op, baseRev: base };
      const { status, json } = await req("/cellar/mem/batch", { method: "POST", body: { ops: [o] }, timeout });
      const r = json.results?.[0];
      if (status !== 200 || !r) throw new Error(json.error ?? `응답 ${status}`);
      if (r.ok) { cache.set(key, { rev: val === null ? 0 : r.rev, value: val }); return true; }
      if (!r.conflict) throw new Error(r.error ?? "저장하지 못했어요");
      // 다른 곳에서 먼저 바뀜 → 서버 값을 받아 합친다
      cache.delete(key);
      const cur = await fetchKey(key);
      const merged = mergeFolder(parse(cur), val === null ? null : parse(val));
      val = merged === null ? null : JSON.stringify(merged);
      base = cache.get(key)?.rev ?? 0; op = opId();
    }
    throw new Error("다른 기기와 계속 부딪혀요");
  }

  async function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      await loadQueue();
      if (!queue.length || mode !== "remote" || !conn) return 0;
      let n = 0;
      while (queue.length) {
        const e = queue[0];
        try { await pushKey(e.key, e.value, e.baseRev, e.opId); ok(); }
        catch (err) {
          if (err?.network) { failed(err); schedule(); return n; }
          // 서버가 받지 않는 항목(너무 큼 등)은 대기열을 막지 않도록 빼되, 잃지 않게 플러그인 사본으로 남긴다
          log("대기열 항목을 올리지 못해 플러그인에 남겨요", e.key, err?.message ?? err); lastError = String(err?.message ?? err);
          try { if (e.value === null) await ps.removeItem(e.key); else await ps.setItem(e.key, e.value); } catch { /* 남기기 실패는 로그만 */ }
        }
        queue.shift(); await saveQueue(); n++;
      }
      if (n) { attach.dropCache(); notify(`연결이 끊긴 동안의 기억 ${n}건을 Dusk Cellar에 올렸어요.`); }
      warned = false;
      return n;
    })();
    try { return await flushing; } finally { flushing = null; }
  }

  const storage = {
    async getItem(k) {
      if (mode !== "remote" || !isRemoteKey(k)) return ps.getItem(k);
      const q = (await loadQueue()).find((x) => x.key === k);
      if (q) return q.value;
      if (!offline()) {
        try { const v = await fetchKey(k); ok(); if (queue.length) schedule(); return v; }
        catch (e) { if (!e?.network) throw e; failed(e); }
      }
      const c = cache.get(k);
      if (c) return c.value;
      return ps.getItem(k);   // 서버로 옮기기 전의 옛 사본(없으면 null)
    },
    async setItem(k, v) {
      if (mode !== "remote" || !isRemoteKey(k)) return ps.setItem(k, v);
      return write(k, typeof v === "string" ? v : JSON.stringify(v));
    },
    async removeItem(k) {
      if (mode !== "remote" || !isRemoteKey(k)) return ps.removeItem(k);
      return write(k, null);
    },
  };
  async function write(k, v) {
    await loadQueue();
    const base = cache.has(k) ? cache.get(k).rev : null;
    if (offline() || queue.some((x) => x.key === k)) return enqueue(k, v, base);
    try { await pushKey(k, v, base, opId()); ok(); }
    catch (e) { if (!e?.network) throw e; failed(e); await enqueue(k, v, base); }
  }

  // 처음 감지: 플러그인에 있는 폴더를 서버로 올리고 확인한 뒤 서버 모드로. 실패하면 그대로 플러그인 저장.
  async function migrate() {
    return attach.serial(async () => {
      if (mode === "remote") return 0;
      const keys = await attach.folderKeys();
      const items = [];
      for (const key of keys) { const raw = await ps.getItem(key); if (raw != null) items.push({ key, value: typeof raw === "string" ? raw : JSON.stringify(raw) }); }
      let batch = [], bytes = 0;
      const send = async () => {
        if (!batch.length) return;
        const { status, json } = await req("/cellar/mem/batch", { method: "POST", body: { ops: batch.map((x) => ({ op: "put", key: x.key, value: x.value, baseRev: 0, opId: "mig-" + x.key })) }, timeout: 60e3 });
        if (status !== 200 || !Array.isArray(json.results)) throw new Error(json.error ?? `응답 ${status}`);
        for (const [i, r] of json.results.entries()) {
          const x = batch[i];
          if (r.ok) cache.set(x.key, { rev: r.rev, value: x.value });
          else if (r.conflict) await pushKey(x.key, x.value, 0, "mig-" + x.key, 60e3);   // 이미 서버에 있음 → 합치기
          else throw new Error(r.error ?? "올리지 못했어요");
        }
        batch = []; bytes = 0;
      };
      for (const x of items) {
        if (bytes && bytes + x.value.length > BATCH_BYTES) await send();
        batch.push(x); bytes += x.value.length;
      }
      await send();
      // 확인: 서버에서 다시 읽어 같은지 본다
      for (const x of items) {
        const c = cache.get(x.key); cache.delete(x.key);
        const back = await fetchKey(x.key);
        if (back === null || (c && back !== c.value)) throw new Error(`서버에서 다시 읽은 값이 달라요(${x.key})`);
      }
      await ps.setItem(FLAG_KEY, JSON.stringify({ on: true, at: now(), url: conn.url, via: conn.via, folders: items.length }));
      mode = "remote"; attach.dropCache();
      return items.length;
    });
  }

  return {
    storage,
    attach(a) { attach = { ...attach, ...a }; },
    // 시작: 표시만 읽어 바로 모드를 정한다(빠름). Cellar 찾기·처음 올리기는 detect()가 뒤에서 한다.
    async init() {
      let flag = null;
      try { flag = parse(await ps.getItem(FLAG_KEY)); } catch { flag = null; }
      if (flag?.on) { mode = "remote"; conn = flag.url ? { url: flag.url, via: flag.via ?? "native" } : null; }
      return mode;
    },
    // Cellar를 찾는다. 서버 모드면 연결 상태·대기열 올리기, 아니면 기억 저장을 지원하는 Cellar가 있을 때 처음 올리기.
    async detect() {
      let st = null;
      try { st = await cellar.status({ fresh: true }); } catch (e) { st = { ok: false, error: String(e?.message ?? e) }; }
      if (st?.ok && st.features?.includes("mem")) {
        conn = { url: st.url, via: st.via };
        if (mode === "remote") { ok(); if ((await loadQueue()).length) await flush().catch(() => {}); return mode; }
        try {
          const n = await migrate();
          log(`기억 폴더 ${n}개를 서버로 옮겼어요`);
          if (n) notify(`장기기억 ${n}개 채팅을 Dusk Cellar로 옮겼어요. 이제 기억은 서버에 저장돼요.`);
        } catch (e) { log("서버로 옮기지 못했어요 — 플러그인에 그대로 저장해요", e?.message ?? e); lastError = String(e?.message ?? e); }
      } else if (mode === "remote") { lastError = st?.error ?? "Dusk Cellar 연결 안 됨"; fails = OFFLINE_AFTER; offlineUntil = now() + retryMs; schedule(); }
      return mode;
    },
    flush,
    // 서버 기억을 플러그인으로 되돌리고 서버 모드를 끈다. 연결돼 있으면 서버 값 전부, 아니면 옛 사본 + 대기열(최신 일부가 빠질 수 있음).
    async disable({ force = false } = {}) {
      return attach.serial(async () => {
        if (mode !== "remote") return { pulled: 0 };
        await loadQueue();
        let pulled = 0;
        if (conn && !force) {
          if (queue.length) { await flush(); if (queue.length) throw new Error("대기열을 먼저 올리지 못했어요. 연결을 확인하거나 '연결 없이 되돌리기'를 쓰세요."); }
          const { status, json } = await req("/cellar/mem?prefix=" + enc(REMOTE_PREFIX), { timeout: 30e3 });
          if (status !== 200 || !Array.isArray(json.items)) throw new Error(json.error ?? `응답 ${status}`);
          for (const it of json.items) { const v = await fetchKey(it.key); if (v !== null) { await ps.setItem(it.key, v); pulled++; } }
        } else {
          for (const e of queue) { if (e.value === null) await ps.removeItem(e.key); else await ps.setItem(e.key, e.value); pulled++; }
        }
        queue = []; await saveQueue();
        await ps.removeItem(FLAG_KEY);
        mode = "local"; cache.clear(); attach.dropCache();
        return { pulled };
      });
    },
    state: () => ({ mode, online: mode === "remote" && !offline(), queued: queue?.length ?? 0, error: lastError }),
  };
}
