import { sha256 } from './hash.js';
import { newId } from './util.js';
import { charFields, fingerprintCard, isFingerprintV1, modFields, modFingerprint } from './tideplan.js';
import { listTideBackups, loadTideBackup, tideBase } from './tidestore.js';

async function gzip(bytes) {
  if (typeof CompressionStream !== "function") return bytes;
  try {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  } catch {
    return bytes;
  }
}
async function gunzip(bytes) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}
var locks = /* @__PURE__ */ new WeakMap();
function serial(api, fn) {
  const prev = locks.get(api) ?? Promise.resolve();
  const p = prev.then(fn, fn);
  locks.set(api, p.catch(() => {
  }));
  return p;
}
var STORE_KEY = "rbu:index:v1";
var MAX_BACKUPS_PER_TARGET = 5;
var MAX_BACKUPS = 80;
export function createStore(api) {
  const keepPerTarget = async () => {
    try {
      const raw = await api.pluginStorage.getItem("rbm:ui:v1");
      const n = raw ? JSON.parse(raw)?.keepBackups : null;
      return [3, 5, 10, 20].includes(n) ? n : MAX_BACKUPS_PER_TARGET;
    } catch {
      return MAX_BACKUPS_PER_TARGET;
    }
  };
  const readIndex = async () => {
    try {
      const raw = await api.pluginStorage.getItem(STORE_KEY);
      const j = raw ? JSON.parse(raw) : null;
      if (j && typeof j === "object") return { baselines: j.baselines ?? {}, backups: j.backups ?? [], history: j.history ?? [] };
    } catch {
    }
    return { baselines: {}, backups: [], history: [] };
  };
  const writeIndex = async (idx) => {
    await api.pluginStorage.setItem(STORE_KEY, JSON.stringify(idx));
  };
  const encode = async (obj) => {
    const raw = new TextEncoder().encode(JSON.stringify({ rbu: 1, data: obj }));
    const hash = await sha256(raw);
    return { raw, hash };
  };
  const upload = async (raw) => {
    const bytes = await gzip(raw);
    const size = bytes.length;
    const path = await api.saveAsset(bytes);
    if (typeof path !== "string" || !path) throw new Error("기록을 저장하지 못했습니다");
    return { path, size };
  };
  // ---- 조각 저장(RisuTide 방식): 백업을 필드마다 압축해 플러그인 저장소에 두고, 같은 내용은 한 번만 저장한다.
  // 에셋 저장소를 쓰지 않아 에셋 정리에 지워지지 않고, 읽을 때 해시로 손상 여부를 확인한다.
  const PART = "rbm:part:", MAN = "rbm:man:", FP = "rbm:fp:", FPBK = "rbm:fpbk:";
  const ps = api.pluginStorage;
  const hex = (u8) => [...u8].map((n) => n.toString(16).padStart(2, "0")).join("");
  const toB64 = (u8) => {
    let bin = "";
    for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode(...u8.subarray(i, i + 8192));
    return btoa(bin);
  };
  const fromB64 = (s2) => {
    const bin = atob(s2), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  };
  const putParts = async (obj) => {
    let have;
    try {
      have = new Set(await ps.keys());
    } catch {
      have = /* @__PURE__ */ new Set();
    }
    const fields = [];
    let size = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (v === void 0) continue;
      const raw = new TextEncoder().encode(JSON.stringify(v));
      const h = await sha256(raw);
      if (!have.has(PART + h)) {
        const gz = await gzip(raw);
        await ps.setItem(PART + h, JSON.stringify({ z: gz !== raw, d: toB64(gz) }));
        have.add(PART + h);
        size += gz.length;
      }
      fields.push([k, h]);
    }
    return { fields, size };
  };
  const readPart = async (h) => {
    const raw0 = await ps.getItem(PART + h);
    if (!raw0) throw new Error("백업 조각을 찾지 못했어요");
    const j = JSON.parse(raw0);
    let u8 = fromB64(j.d);
    if (j.z) u8 = await gunzip(u8);
    if (await sha256(u8) !== h) throw new Error("백업 조각이 손상됐어요");
    return JSON.parse(new TextDecoder().decode(u8));
  };
  const readManifest = async (id) => {
    const raw0 = await ps.getItem(MAN + id);
    const m = raw0 ? JSON.parse(raw0) : null;
    if (!m || !Array.isArray(m.fields)) throw new Error("백업 기록을 찾지 못했어요");
    return m;
  };
  // 남은 백업이 쓰지 않는 조각을 지운다 (백업이 지워졌을 때만)
  const sweep = async (idx) => {
    try {
      const keys = await ps.keys();
      const live = /* @__PURE__ */ new Set();
      const alive = new Set(idx.backups.filter((b) => b.cas).map((b) => b.id));
      for (const k of keys) {
        if (!k.startsWith(MAN)) continue;
        const id = k.slice(MAN.length);
        if (!alive.has(id)) {
          await ps.removeItem(k);
          await ps.removeItem(FPBK + id).catch(() => {
          });
          continue;
        }
        const m = await readManifest(id);
        for (const [, h] of m.fields) live.add(h);
        for (const c of m.chats ?? []) {
          live.add(c.h);
          for (const h of c.c) live.add(h);
        }
      }
      for (const k of keys) if (k.startsWith(PART) && !live.has(k.slice(PART.length))) await ps.removeItem(k);
    } catch {
    }
  };
  const getJson = async (path) => {
    const bytes = await api.readImage(path);
    if (!bytes) throw new Error("저장된 기록 파일을 찾지 못했습니다(에셋 정리로 지워졌을 수 있습니다)");
    let u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8[0] === 31 && u8[1] === 139) u8 = await gunzip(u8);
    const j = JSON.parse(new TextDecoder().decode(u8));
    if (j?.rbu !== 1) throw new Error("기록 파일 형식이 올바르지 않습니다");
    return j.data;
  };
  const self = {
    async getBaseline(key) {
      const idx = await readIndex();
      const b = idx.baselines[key];
      if (!b) return null;
      try {
        return await getJson(b.path);
      } catch {
        return null;
      }
    },
    async baselineInfo(key) {
      return (await readIndex()).baselines[key] ?? null;
    },
    async setBaseline(key, view) {
      const { raw, hash } = await encode(view);
      const cur = (await readIndex()).baselines[key];
      if (cur?.hash === hash) return;
      const { path } = await upload(raw);
      await serial(api, async () => {
        const idx = await readIndex();
        idx.baselines[key] = { path, hash, t: Date.now() };
        await writeIndex(idx);
      });
    },
    async addBackup({ kind, target, name, snapshot, note: note2, summary }) {
      const { hash } = await encode(snapshot);
      const id0 = newId();
      // 되돌릴 때 비교 기준도 그 시점으로 돌리려고, 지금 기준을 함께 남긴다
      const fpNow = await self.getFingerprint(kind === "character" ? "c" : "m", target).catch(() => null);
      return serial(api, async () => {
        // 조각 쓰기부터 목록 반영까지 한 줄로 (정리와 겹치지 않게)
        const { __chats, ...card } = snapshot;
        const { fields, size: s1 } = await putParts(card);
        // 채팅은 32개 메시지씩 나눠 저장해, 다음 백업에서 같은 부분을 다시 저장하지 않는다
        let size = s1, chats;
        if (Array.isArray(__chats) && __chats.length) {
          chats = [];
          for (const c of __chats) {
            const hp = await putParts({ h: c.header });
            const parts = [];
            for (const ch of c.chunks) {
              const r = await putParts({ c: ch });
              parts.push(r.fields[0][1]);
              size += r.size;
            }
            size += hp.size;
            chats.push({ h: hp.fields[0][1], c: parts });
          }
        }
        await ps.setItem(MAN + id0, JSON.stringify({ v: 2, fields, ...chats ? { chats } : {} }));
        if (fpNow) await ps.setItem(FPBK + id0, JSON.stringify(fpNow)).catch(() => {
        });
        const idx = await readIndex();
        const rec = { id: id0, kind, target, name, t: Date.now(), cas: true, size, hash, note: note2 ?? "", summary: summary ?? "", hasFp: !!fpNow, ...chats ? { chatCount: chats.length } : {} };
        idx.backups.unshift(rec);
        const keep = await keepPerTarget();
        const per = /* @__PURE__ */ new Map();
        const kept = idx.backups.filter((b) => {
          const n = (per.get(b.target) ?? 0) + 1;
          per.set(b.target, n);
          return n <= keep;
        }).slice(0, Math.max(MAX_BACKUPS, keep * 16));
        const dropped = idx.backups.filter((b) => !kept.includes(b));
        idx.history = [...dropped.map(({ id, kind: kind2, target: target2, name: name2, t, note: note3, summary: summary2 }) => ({ id, kind: kind2, target: target2, name: name2, t, note: note3, summary: summary2 })), ...idx.history ?? []].slice(0, 400);
        idx.backups = kept;
        await writeIndex(idx);
        if (dropped.some((b) => b.cas)) await sweep(idx);
        return rec;
      });
    },
    async annotate(id, patch) {
      return serial(api, async () => {
        const idx = await readIndex();
        const b = idx.backups.find((x) => x.id === id);
        if (b) {
          Object.assign(b, patch);
          await writeIndex(idx);
        }
      });
    },
    async listBackups({ tide = true } = {}) {
      const own = (await readIndex()).backups;
      if (!tide) return own;
      const t = await listTideBackups(api).catch(() => []);
      return [...own, ...t].sort((a, b) => b.t - a.t);
    },
    async listHistory() {
      return (await readIndex()).history ?? [];
    },
    async loadBackup(rec) {
      if (rec.src === "tide") {
        const t = await loadTideBackup(api, rec);
        return rec.kind === "module" ? t.module : { ...t.fields, __tide: t.keys, ...t.chats?.length ? { __chats: t.chats } : {} };
      }
      if (rec.cas) {
        const m = await readManifest(rec.id);
        const out = {};
        for (const [k, h] of m.fields) out[k] = await readPart(h);
        if (m.chats?.length) {
          out.__chats = [];
          for (const c of m.chats) out.__chats.push({ header: await readPart(c.h), chunks: await Promise.all(c.c.map(readPart)) });
        }
        return out;
      }
      return getJson(rec.path);
    },
    /** 백업 시점의 비교 기준 (없으면 null) */
    async backupFingerprint(rec) {
      if (rec.src === "tide") return (await loadTideBackup(api, rec)).base;
      if (rec.hasFp) {
        try {
          const j = JSON.parse(await ps.getItem(FPBK + rec.id));
          return isFingerprintV1(j) ? j : null;
        } catch {
          return null;
        }
      }
      if (rec.basePath) {
        try {
          const v = await getJson(rec.basePath);
          return rec.kind === "character" ? fingerprintCard(charFields(v)) : modFingerprint(modFields(v));
        } catch {
          return null;
        }
      }
      return null;
    },
    // ---- 비교 기준(지문). kind: "c" | "m" ----
    // 순서: Dusk 지문 → Dusk 예전 기준(전체 내용) → RisuTide 기준
    async getFingerprint(kind, id) {
      try {
        const raw0 = await ps.getItem(FP + kind + ":" + id);
        if (raw0) {
          const j = JSON.parse(raw0);
          if (j === null) return null;
          if (isFingerprintV1(j)) return j;
        }
      } catch {
      }
      const old = await self.getBaseline(`${kind}:${id}`);
      if (old) return kind === "c" ? fingerprintCard(charFields(old)) : modFingerprint(modFields(old));
      return tideBase(api, kind, id);
    },
    async setFingerprint(kind, id, fp) {
      await ps.setItem(FP + kind + ":" + id, JSON.stringify(fp ?? null));
    },
    async removeBackup(id) {
      return serial(api, async () => {
        const idx = await readIndex();
        const gone = idx.backups.find((b) => b.id === id);
        idx.backups = idx.backups.filter((b) => b.id !== id);
        await writeIndex(idx);
        if (gone?.cas) await sweep(idx);
      });
    },
    async restoreBaseline(key, path) {
      return serial(api, async () => {
        const idx = await readIndex();
        if (path) idx.baselines[key] = { path, t: Date.now() };
        else delete idx.baselines[key];
        await writeIndex(idx);
      });
    }
  };
  return self;
}
