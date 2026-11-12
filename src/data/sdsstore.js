// 에셋 제작 작업 저장 — 빠르고 잃지 않게 세 곳에.
// ① 이 기기 IndexedDB: 캐릭터 단위로 바뀐 것만, 한 거래(다 되거나 다 안 되거나)로 바로. 화면은 이것만 기다린다.
// ② 리스 플러그인 저장소: 통째 보관본을 1분에 한 번(그리고 닫을 때). 브라우저 데이터를 지워도 여기서 되살린다.
// ③ (선택, 지금은 안 씀) cellar 어댑터를 넘기면 바뀐 캐릭터만 3초 모아 올림. 키 dusk.mem.sds.<작업키>.<조각>.
// 열 때: 세 곳에서 저장 시각(t)이 가장 늦은 것. 고른 것이 ①이 아니면 ①을 그걸로 채운다.
import { splitProject, joinProject, diffRecords, HEAD } from "../engine/sdstudio/projsplit.js";
import { normalizeProject } from "../engine/sdstudio/project.js";

export var CELLAR_PREFIX = "dusk.mem.sds.";
var safe = (s) => String(s).replace(/[^A-Za-z0-9._:@-]/g, (ch) => `_${ch.charCodeAt(0).toString(16)}_`);

// ── IndexedDB 백엔드(브라우저) ──
export function createIdbBackend({ name = "dusk-sds-proj", idb = globalThis.indexedDB } = {}) {
  let dbp = null;
  const open = () => (dbp ??= new Promise((res, rej) => {
    if (!idb) return rej(new Error("IndexedDB를 쓸 수 없어요"));
    const r = idb.open(name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("r");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error("IndexedDB를 열지 못했어요"));
  }));
  const range = (pk) => IDBKeyRange.bound(`${pk}\u0001`, `${pk}\u0001￿`);
  return {
    async load(pk) {
      const db = await open();
      return new Promise((res, rej) => {
        const out = new Map(), t = db.transaction("r", "readonly"), cur = t.objectStore("r").openCursor(range(pk));
        cur.onsuccess = () => { const c = cur.result; if (c) { out.set(String(c.key).slice(pk.length + 1), c.value); c.continue(); } };
        t.oncomplete = () => res(out.size ? out : null);
        t.onerror = () => rej(t.error);
      });
    },
    async write(pk, puts, dels) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction("r", "readwrite"), s = t.objectStore("r");
        for (const [k, v] of puts) s.put(v, `${pk}\u0001${k}`);
        for (const k of dels) s.delete(`${pk}\u0001${k}`);
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error ?? new Error("IndexedDB에 쓰지 못했어요"));
        t.onabort = () => rej(t.error ?? new Error("IndexedDB 쓰기가 취소됐어요"));
      });
    }
  };
}

// host: { save(target, p, t) → Promise, load(target) → { project, t } | null }
// cellar: { ready() → bool(Promise), batch(ops) → results, list(prefix) → [{key}], get(key) → value|null }
export function createProjectStore({ local, host, cellar = null, now = () => Date.now(), hostEvery = 60000, cellarEvery = 3000, log = () => {}, timers = globalThis } = {}) {
  const S = new Map();   // pk → { target, prev: Map, hostDirty, hostT, cellarKeys:Set, latest }
  const st = (pk, target) => { let x = S.get(pk); if (!x) S.set(pk, (x = { target, prev: null, hostDirty: false, hostTimer: null, cellarKeys: new Set(), cellarTimer: null, latest: null, lastT: 0, err: null })); return x; };
  const stamp = (recs, t) => { const h = JSON.parse(recs.get(HEAD)); h.t = t; recs.set(HEAD, JSON.stringify(h)); return recs; };
  const headT = (recs) => { try { return Number(JSON.parse(recs.get(HEAD)).t) || 0; } catch { return 0; } };

  async function fromCellar(pk) {
    if (!cellar || !(await cellar.ready())) return null;
    const pre = `${CELLAR_PREFIX}${safe(pk)}.`;
    const items = await cellar.list(pre);
    if (!items?.length) return null;
    const out = new Map();
    for (const it of items) { const v = await cellar.get(it.key); if (v != null) out.set(it.key.slice(pre.length), v); }
    return out.has(HEAD) ? out : null;
  }

  async function pushHost(pk) {
    const x = S.get(pk); if (!x?.hostDirty || !x.latest) return;
    x.hostDirty = false;
    try { await host.save(x.target, x.latest, x.lastT); }
    catch (e) { x.hostDirty = true; x.err = e; log("플러그인 저장소 보관본 실패", e?.message ?? e); throw e; }
  }
  async function pushCellar(pk) {
    const x = S.get(pk); if (!x?.cellarKeys.size || !x.prev) return;
    if (!cellar || !(await cellar.ready().catch(() => false))) return;
    const keys = [...x.cellarKeys]; x.cellarKeys.clear();
    const pre = `${CELLAR_PREFIX}${safe(pk)}.`;
    // 캐릭터를 먼저, head를 마지막에(head가 가리키는 캐릭터가 서버에 먼저 있게)
    keys.sort((a, b) => (a === HEAD) - (b === HEAD));
    const ops = keys.map((k) => (x.prev.has(k) ? { op: "put", key: pre + k, value: x.prev.get(k) } : { op: "del", key: pre + k }));
    try {
      // 한 번에 50개·약 4MB까지(리스 프록시를 지나는 요청이 너무 커지지 않게)
      for (let i = 0; i < ops.length;) {
        let j = i, size = 0;
        while (j < ops.length && j - i < 50 && (j === i || size + (ops[j].value?.length ?? 0) < 4e6)) { size += ops[j].value?.length ?? 0; j++; }
        const res = await cellar.batch(ops.slice(i, j));
        const bad = keys.slice(i, j).filter((_, n) => !res?.[n]?.ok);
        if (bad.length) throw new Error(`Cellar가 ${bad.length}개를 받지 않았어요`);
        i = j;
      }
    } catch (e) { for (const k of keys) x.cellarKeys.add(k); log("Cellar 올리기 실패 — 다음에 다시", e?.message ?? e); }
  }
  const later = (x, key, fn, ms) => { if (x[key]) return; x[key] = timers.setTimeout(() => { x[key] = null; fn().catch(() => {}); }, ms); };

  return {
    // → { project, source: "local"|"host"|"cellar"|"none", missing: [] }
    async open(target, pk) {
      const x = st(pk, target);
      const cands = [];
      try { const m = await local.load(pk); if (m) cands.push({ src: "local", recs: m, t: headT(m) }); } catch (e) { log("기기 저장소 읽기 실패", e?.message ?? e); }
      try { const h = await host.load(target); if (h?.project) cands.push({ src: "host", project: h.project, t: h.t || 0 }); } catch (e) { log("플러그인 저장소 읽기 실패", e?.message ?? e); }
      try { const c = await fromCellar(pk); if (c) cands.push({ src: "cellar", recs: c, t: headT(c) }); } catch (e) { log("Cellar 읽기 실패", e?.message ?? e); }
      const order = { local: 0, cellar: 1, host: 2 };   // 시각이 같으면 기기 것 우선
      cands.sort((a, b) => b.t - a.t || order[a.src] - order[b.src]);
      for (const c of cands) {
        let project = c.project, missing = [];
        if (c.recs) { const j = joinProject((k) => c.recs.get(k) ?? null); if (!j) continue; project = j.project; missing = j.missing; }
        if (missing.length && cands.indexOf(c) < cands.length - 1) { log(`${c.src}에 캐릭터 기록 ${missing.length}개가 빠져 있어 다음 저장본으로`); continue; }
        project = normalizeProject(project);
        const recs = stamp(splitProject(project), c.t || now());
        if (c.src !== "local") { try { const d = diffRecords(cands.find((z) => z.src === "local")?.recs ?? null, recs); await local.write(pk, d.puts, d.dels); } catch (e) { log("기기 저장소 채우기 실패", e?.message ?? e); } }
        x.prev = recs; x.latest = project; x.lastT = c.t;
        if (c.src !== "cellar" && cellar) { const cc = cands.find((z) => z.src === "cellar"); if (!cc || cc.t < c.t) { for (const k of recs.keys()) x.cellarKeys.add(k); later(x, "cellarTimer", () => pushCellar(pk), cellarEvery); } }
        return { project, source: c.src, missing, t: c.t };
      }
      return { project: normalizeProject(null), source: "none", missing: [], t: 0 };
    },
    // 바로 저장(기기). 보관본·Cellar는 뒤에서 모아서.
    save(target, pk, project) {
      const x = st(pk, target);
      const run = () => this._save(x, pk, project);
      x.chain = (x.chain ?? Promise.resolve()).then(run, run);   // 한 줄로(앞 저장이 끝난 뒤 그 결과를 기준으로 차이 계산)
      return x.chain;
    },
    async _save(x, pk, project) {
      const t = Math.max(now(), x.lastT + 1);
      const recs = stamp(splitProject(project), t);
      const d = diffRecords(x.prev, recs);
      await local.write(pk, d.puts, d.dels);   // 실패하면 던짐 — 호출 쪽이 알림, prev는 그대로라 다음에 다시 씀
      x.prev = recs; x.latest = project; x.lastT = t;
      for (const [k] of d.puts) x.cellarKeys.add(k);
      for (const k of d.dels) x.cellarKeys.add(k);
      x.hostDirty = true;
      later(x, "hostTimer", () => pushHost(pk), hostEvery);
      if (cellar) later(x, "cellarTimer", () => pushCellar(pk), cellarEvery);
      return { written: d.puts.length, deleted: d.dels.length, t };
    },
    // 닫을 때·다른 곳으로 갈 때: 보관본과 Cellar를 지금
    async flush(pk) {
      const x = S.get(pk); if (!x) return;
      if (x.hostTimer) { timers.clearTimeout(x.hostTimer); x.hostTimer = null; }
      if (x.cellarTimer) { timers.clearTimeout(x.cellarTimer); x.cellarTimer = null; }
      await Promise.allSettled([pushHost(pk), pushCellar(pk)]);
    },
    pending(pk) { const x = S.get(pk); return { host: !!x?.hostDirty, cellar: x?.cellarKeys.size ?? 0 }; }
  };
}

