import { sha256 } from './hash.js';
import { newId } from './util.js';

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
  const getJson = async (path) => {
    const bytes = await api.readImage(path);
    if (!bytes) throw new Error("저장된 기록 파일을 찾지 못했습니다(에셋 정리로 지워졌을 수 있습니다)");
    let u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8[0] === 31 && u8[1] === 139) u8 = await gunzip(u8);
    const j = JSON.parse(new TextDecoder().decode(u8));
    if (j?.rbu !== 1) throw new Error("기록 파일 형식이 올바르지 않습니다");
    return j.data;
  };
  return {
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
      const { raw, hash } = await encode(snapshot);
      const last2 = (await readIndex()).backups.find((b) => b.target === target);
      const file = last2?.hash === hash ? { path: last2.path, size: last2.size } : await upload(raw);
      return serial(api, async () => {
        const idx = await readIndex();
        const rec = { id: newId(), kind, target, name, t: Date.now(), path: file.path, size: file.size, hash, note: note2 ?? "", summary: summary ?? "", basePath: idx.baselines[`${kind === "character" ? "c" : "m"}:${target}`]?.path ?? null };
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
    async listBackups() {
      return (await readIndex()).backups;
    },
    async listHistory() {
      return (await readIndex()).history ?? [];
    },
    async loadBackup(rec) {
      return getJson(rec.path);
    },
    async removeBackup(id) {
      return serial(api, async () => {
        const idx = await readIndex();
        idx.backups = idx.backups.filter((b) => b.id !== id);
        await writeIndex(idx);
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
}
