// 용량 측정 수집 (v1.9.2): 읽기 전용. 봇은 하나씩 읽어 크기만 남기고 바로 버려서(큰 채팅이 한꺼번에 메모리에 쌓이지 않게) 아이폰에서도 버티게 한다.
import { buildReport, measureCharacter, measureModule, measurePlugin, storageItems, jsonBytes, utf8Len } from "../engine/sizemeter.js";
import { DISABLED_KEY, ORDER_KEY } from "./modules.js";
import { storageGet, storageKeyList } from "./plugins.js";

const arr = (v) => (Array.isArray(v) ? v : []);
const tick = () => new Promise((r) => setTimeout(r, 0));
const CH = 4; // 한 번에 읽는 봇 수(작을수록 메모리 정점이 낮다)

function orderIds(order) {
  const ids = new Set();
  const walk = (o) => {
    for (const x of arr(o)) {
      if (typeof x === "string") ids.add(x);
      else if (x && Array.isArray(x.data)) walk(x.data);
    }
  };
  walk(order);
  return ids;
}

/** 봇을 읽는 즉시 재서 목록으로 만든다. onProgress({done,total}) · cancelled()로 중단 */
export async function measureAllCharacters(api, ids, { onProgress, cancelled } = {}) {
  const N = ids.size, out = [];
  const get = (i) => api.getCharacterFromIndex(i).catch(() => null);
  let loaded = 0;
  const take = (c, i) => {
    if (!c) return false;
    out.push(measureCharacter(c, i)); // c는 여기서 버려진다
    loaded++;
    return true;
  };
  for (let i = 0; i < N && !cancelled?.(); i += CH) {
    const batch = await Promise.all(Array.from({ length: Math.min(CH, N - i) }, (_, k) => get(i + k)));
    batch.forEach((c, k) => take(c, i + k));
    try { onProgress?.({ done: Math.min(N, i + CH), total: N }); } catch { /* 진행 표시 실패는 재기에 영향 없음 */ }
    await tick();
  }
  // 순서 목록에 늦게 들어간 봇: 끝에서 30개 연속 빌 때까지 (최대 200개)
  let miss = 0;
  for (let i = N; i < N + 200 && miss < 30 && !cancelled?.(); i += CH) {
    const batch = await Promise.all(Array.from({ length: CH }, (_, k) => get(i + k)));
    batch.forEach((c, k) => { miss = take(c, i + k) ? 0 : miss + 1; });
  }
  return { list: out, missing: Math.max(0, N - out.filter((c) => ids.has(c.id)).length) };
}

async function measureStorage(api, { cancelled, onProgress } = {}) {
  let keys;
  try { keys = (await storageKeyList(api)).filter((k) => k !== DISABLED_KEY && k !== ORDER_KEY); } catch { return null; }
  const out = [];
  for (let i = 0; i < keys.length && !cancelled?.(); i += 6) {
    const rows = await Promise.all(keys.slice(i, i + 6).map(async (key) => {
      try {
        // storageGet은 크기를 한 번 더 JSON.stringify 해서 큰 값에서 오래 걸리므로 값만 읽는다(키당 최대 10초)
        const v = await Promise.race([api.pluginStorage.getItem(key), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1e4))]);
        return { key, bytes: v == null ? 0 : typeof v === "string" ? utf8Len(v) : jsonBytes(v) };
      } catch { return { key, bytes: 0, failed: true }; }
    }));
    out.push(...rows);
    try { onProgress?.({ done: Math.min(keys.length, i + 6), total: keys.length }); } catch { /* 표시 실패는 재기에 영향 없음 */ }
    await tick();
  }
  return out;
}

/** 모듈 에셋은 목록에 경로만 있고 실제 파일은 따로 저장돼서, 파일을 읽어 크기를 더한다(읽자마자 버림). 같은 경로는 한 번만 */
export async function addModuleAssetBytes(api, mods, raw, { onProgress, cancelled } = {}) {
  if (typeof api.readImage !== "function") return false;
  const paths = [...new Set(raw.flatMap((m) => arr(m?.assets).map((a) => (Array.isArray(a) ? a[1] : a?.path ?? a?.data)).filter((p) => typeof p === "string" && p && !p.startsWith("data:"))))];
  const size = new Map();
  let done = 0;
  for (let i = 0; i < paths.length && !cancelled?.(); i += 4) {
    await Promise.all(paths.slice(i, i + 4).map(async (p) => {
      try {
        const d = await Promise.race([api.readImage(p), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1e4))]);
        size.set(p, d == null ? 0 : typeof d === "string" ? utf8Len(d) : d.byteLength ?? d.length ?? 0);
      } catch { size.set(p, 0); }
    }));
    done = Math.min(paths.length, i + 4);
    try { onProgress?.({ done, total: paths.length }); } catch { /* 표시 실패 무시 */ }
    await tick();
  }
  mods.forEach((m, i) => {
    const seen = new Set(); let b = 0, n = 0;
    for (const a of arr(raw[i]?.assets)) { const p = Array.isArray(a) ? a[1] : a?.path ?? a?.data; if (typeof p === "string" && size.has(p) && !seen.has(p)) { seen.add(p); b += size.get(p); n++; } }
    if (!b) return;
    m.bytes += b;
    m.parts = [...(m.parts ?? []), { label: `에셋 파일 · ${n}개`, bytes: b }].sort((x, y) => y.bytes - x.bytes);
  });
  return true;
}

/** 전체를 재서 리포트를 만든다. 쓰기는 하지 않는다 */
export async function scanSizes(api, opts = {}) {
  const db = await api.getDatabase(["modules", "plugins", "enabledModules", "moduleIntergration", "characterOrder"]);
  if (!db) throw new Error("데이터베이스를 읽을 권한이 없어요. 플러그인 권한을 허용해 주세요.");
  opts.onProgress?.({ phase: "base" });
  const modules = arr(db.modules).filter((m) => m && typeof m === "object").map((m, i) => measureModule(m, i));
  // Dusk가 모듈 목록에서 빼 저장소에 보관한 모듈도 용량을 차지한다
  let parked = [];
  try {
    const raw = await api.pluginStorage?.getItem?.(DISABLED_KEY);
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    parked = arr(v).filter((m) => m && typeof m === "object" && m.id);
  } catch { /* 없으면 없는 대로 */ }
  const known = new Set(modules.map((m) => m.id));
  const rawMods = arr(db.modules).filter((m) => m && typeof m === "object");
  parked.forEach((m, i) => { if (!known.has(m.id)) { modules.push({ ...measureModule(m, modules.length + i), parked: true }); rawMods.push(m); } });
  opts.onProgress?.({ phase: "assets" });
  await addModuleAssetBytes(api, modules, rawMods, { cancelled: opts.cancelled, onProgress: (p) => opts.onProgress?.({ phase: "assets", ...p }) });
  const plugins = arr(db.plugins).filter((p) => p && typeof p === "object").map((p, i) => measurePlugin(p, i));
  const ids = orderIds(db.characterOrder);
  const chars = await measureAllCharacters(api, ids, { onProgress: (p) => opts.onProgress?.({ phase: "chars", ...p }), cancelled: opts.cancelled });
  opts.onProgress?.({ phase: "storage" });
  const stor = await measureStorage(api, { cancelled: opts.cancelled, onProgress: (p) => opts.onProgress?.({ phase: "storage", ...p }) });
  const report = buildReport({ characters: chars.list, modules, plugins, storage: stor ? storageItems(stor) : [], db });
  return { report, at: Date.now(), charsMissing: chars.missing, storageOk: !!stor, cancelled: !!opts.cancelled?.() };
}
