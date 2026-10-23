// 플러그인 탭 데이터 계층 — DA Interop v1 호스트 + 플러그인 관리
// 규격: https://github.com/Pyser08/dusk-atelier-interop
// 공식 API(getDatabase / setDatabaseLite / pluginStorage / nativeFetch)만 쓴다.
// plugins 필드 쓰기는 detectEnv()로 되는 환경인지 확인한 뒤에만 한다 (RisuAI PR #1572 이후 막힌 곳이 많음).

export var SELF_NAME = "dusk_atelier";
var REG = "da_interop:reg:";
var PATCH = "da_interop:patch:";
var KEYS = { cats: "rbm:pluginCats:v1", backups: "rbm:pluginBackups:v1" };
var MAX_BACKUPS = 5;
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var clone = (v) => JSON.parse(JSON.stringify(v ?? null));

async function readJson(api, key, fallback) {
  try {
    const raw = await api.pluginStorage.getItem(key);
    if (raw === null || raw === void 0 || raw === "") return fallback;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
}
var writeJson = (api, key, v) => api.pluginStorage.setItem(key, JSON.stringify(v));

async function readPlugins(api) {
  const db = await api.getDatabase(["plugins"]);
  return Array.isArray(db?.plugins) ? db.plugins : null;
}
// 연동 데이터는 pluginStorage(모든 플러그인 공용)에 플러그인마다 키 하나씩 둔다.
// (getDatabase는 허용된 필드만 주므로 etcData는 못 씀)
async function storageKeys(api) {
  const ps = api.pluginStorage;
  if (typeof ps.keys === "function") return await ps.keys() ?? [];
  if (typeof ps.key === "function") {
    const n = typeof ps.length === "function" ? await ps.length() : ps.length ?? 0;
    const out = [];
    for (let i = 0; i < n; i++) out.push(await ps.key(i));
    return out;
  }
  return [];
}

// ── 환경 감지 ──
// 자기 자신의 versionOfPlugin을 잠깐 바꿔 쓰고 다시 읽어 본다. 바뀌었으면 원래대로 돌려놓는다
export async function detectEnv(api) {
  const env = { pluginsReadable: false, pluginsWritable: false, reason: "" };
  let list;
  try {
    list = await readPlugins(api);
  } catch {
    list = null;
  }
  if (!list) return { ...env, reason: "plugins-hidden" };
  env.pluginsReadable = true;
  const me = list.find((p) => p?.name === SELF_NAME);
  if (!me) return { ...env, reason: "self-not-found" };
  const orig = me.versionOfPlugin;
  const probe = `${orig ?? ""}+probe${Date.now().toString(36)}`;
  const withVer = (arr, v) => arr.map((p) => {
    if (p?.name !== SELF_NAME) return p;
    const q = { ...p };
    if (v === void 0) delete q.versionOfPlugin;
    else q.versionOfPlugin = v;
    return q;
  });
  try {
    await api.setDatabaseLite({ plugins: withVer(list, probe) });
    const after = await readPlugins(api);
    const ok = after?.find((p) => p?.name === SELF_NAME)?.versionOfPlugin === probe;
    if (ok) await api.setDatabaseLite({ plugins: withVer(after, orig) });
    return { ...env, pluginsWritable: ok, reason: ok ? "ok" : "blocked" };
  } catch (e) {
    return { ...env, reason: "blocked" };
  }
}

// ── 인터롭 레지스트리 ──
export async function listInterop(api, installedNames) {
  const keys = (await storageKeys(api)).filter((k) => typeof k === "string" && k.startsWith(REG));
  const out = [];
  for (const k of keys) {
    const e = await readJson(api, k, null);
    if (!e || e.spec !== 1 || !e.id) continue;
    const p = await readJson(api, PATCH + e.id, null);
    out.push({
      ...e,
      fields: Array.isArray(e.fields) ? e.fields : [],
      presets: Array.isArray(e.presets) ? e.presets : [],
      pendingRev: p && p.rev > (e.appliedRev ?? 0) ? p.rev : 0,
      installed: installedNames && e.pluginName ? installedNames.has(e.pluginName) : null
    });
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
export async function sendPatch(api, id, values, preset = null) {
  const prev = await readJson(api, PATCH + id, null);
  const reg = await readJson(api, REG + id, null);
  const rev = Math.max(prev?.rev ?? 0, reg?.appliedRev ?? 0) + 1;
  await writeJson(api, PATCH + id, { rev, values: clone(values), preset, updatedAt: Date.now() });
  return rev;
}
export function presetValues(entry, name) {
  const p = entry.presets.find((x) => x.name === name);
  if (!p) throw new Error(`프리셋이 없어요: ${name}`);
  return { ...entry.values, ...p.values };
}
// 상대 플러그인이 적용했는지 기다린다 (그쪽은 3초마다 확인함)
export async function waitAck(api, id, rev, timeoutMs = 1e4) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const e = await readJson(api, REG + id, null);
    if ((e?.appliedRev ?? 0) >= rev) return { ok: !e.lastError, error: e.lastError ?? null };
    await sleep(700);
  }
  return { ok: false, error: "timeout" };
}
export async function pruneInterop(api, id) {
  await api.pluginStorage.removeItem(REG + id);
  await api.pluginStorage.removeItem(PATCH + id);
}

// ── 플러그인 목록 (읽기) ──
export async function loadCategories(api) {
  const v = await readJson(api, KEYS.cats, {});
  return v && typeof v === "object" ? v : {};
}
export async function setCategory(api, name, cat) {
  const cats = await loadCategories(api);
  if (cat) cats[name] = cat;
  else delete cats[name];
  await writeJson(api, KEYS.cats, cats);
}
export async function listPlugins(api) {
  const list = await readPlugins(api) ?? [];
  const cats = await loadCategories(api);
  const count = new Map();
  for (const p of list) count.set(p?.name, (count.get(p?.name) ?? 0) + 1);
  return list.map((p, i) => ({
    name: p?.name ?? "",
    displayName: p?.displayName || p?.name || "(이름 없음)",
    version: p?.versionOfPlugin ?? "",
    apiVersion: p?.version,
    updateURL: p?.updateURL ?? "",
    enabled: p?.enabled !== false,
    size: String(p?.script ?? "").length,
    order: i,
    dup: (count.get(p?.name) ?? 0) > 1,
    category: cats[p?.name] ?? "",
    self: p?.name === SELF_NAME
  }));
}

// ── 플러그인 바꾸기 (plugins 쓰기 되는 환경에서만) ──
async function writePlugins(api, next, label) {
  const cur = await readPlugins(api);
  if (!cur) throw new Error("플러그인 목록을 읽을 수 없어요");
  const list = await readJson(api, KEYS.backups, []);
  const backups = Array.isArray(list) ? list : [];
  backups.unshift({ id: Date.now().toString(36), label, at: Date.now(), plugins: cur });
  await writeJson(api, KEYS.backups, backups.slice(0, MAX_BACKUPS));
  await api.setDatabaseLite({ plugins: next });
  const after = await readPlugins(api);
  if (JSON.stringify(after?.map((p) => [p.name, p.enabled, p.versionOfPlugin])) !== JSON.stringify(next.map((p) => [p.name, p.enabled, p.versionOfPlugin]))) {
    throw new Error("이 환경에서는 플러그인 목록이 바뀌지 않았어요");
  }
}
export async function setEnabled(api, name, on) {
  if (name === SELF_NAME && !on) throw new Error("Dusk Atelier 자신은 끌 수 없어요");
  const cur = await readPlugins(api);
  await writePlugins(api, cur.map((p) => p.name === name ? { ...p, enabled: on } : p), `${on ? "켜기" : "끄기"}: ${name}`);
}
export async function move(api, name, where) {
  const cur = [...await readPlugins(api)];
  const i = cur.findIndex((p) => p.name === name);
  if (i < 0) return;
  const [p] = cur.splice(i, 1);
  const to = where === "top" ? 0 : where === "bottom" ? cur.length : where === "up" ? Math.max(0, i - 1) : Math.min(cur.length, i + 1);
  cur.splice(to, 0, p);
  await writePlugins(api, cur, `순서: ${name}`);
}
export function parseHeader(script) {
  const head = String(script).slice(0, 4096);
  const get = (k) => new RegExp(`^//@${k}\\s+(.+)$`, "m").exec(head)?.[1]?.trim();
  return { name: get("name"), displayName: get("display-name"), version: get("version"), api: get("api"), updateURL: get("update-url") };
}
export async function replaceCode(api, name, script) {
  const hd = parseHeader(script);
  if (hd.name && hd.name !== name) throw new Error(`파일의 이름(${hd.name})이 '${name}'과 달라요`);
  const cur = await readPlugins(api);
  if (!cur.some((p) => p.name === name)) throw new Error(`플러그인이 없어요: ${name}`);
  await writePlugins(api, cur.map((p) => p.name !== name ? p : {
    ...p,
    script,
    ...hd.version ? { versionOfPlugin: hd.version } : {},
    ...hd.displayName ? { displayName: hd.displayName } : {},
    ...hd.updateURL ? { updateURL: hd.updateURL } : {}
  }), `코드 교체: ${name}`);
}
export async function dedupe(api) {
  const cur = await readPlugins(api);
  const last = new Map(cur.map((p, i) => [p.name, i]));
  const next = cur.filter((p, i) => last.get(p.name) === i);
  if (next.length !== cur.length) await writePlugins(api, next, "중복 정리");
  return cur.length - next.length;
}
export async function listBackups(api) {
  const list = await readJson(api, KEYS.backups, []);
  return (Array.isArray(list) ? list : []).map(({ plugins, ...b }) => ({ ...b, count: plugins?.length ?? 0 }));
}
export async function restoreBackup(api, id) {
  const b = (await readJson(api, KEYS.backups, [])).find((x) => x.id === id);
  if (!b) throw new Error("백업이 없어요");
  await writePlugins(api, b.plugins, "복원 직전 상태");
}

// ── 업데이트 확인 (각 플러그인의 update-url 머리말에서 //@version 읽기) ──
async function headText(res) {
  const rd = res.body?.getReader?.();
  if (!rd) return (await res.text()).slice(0, 4096);
  let out = "";
  const dec = new TextDecoder();
  try {
    while (out.length < 1024) {
      const { done, value } = await rd.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
    }
  } finally {
    rd.cancel().catch(() => {
    });
  }
  return out;
}
export function newer(a, b) {
  const x = String(a).split(".").map((n) => parseInt(n, 10) || 0), y = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}
export async function checkUpdates(api, plugins) {
  const out = {};
  await Promise.all(plugins.filter((p) => /^https:\/\//.test(p.updateURL)).map(async (p) => {
    const url = `${p.updateURL}${p.updateURL.includes("?") ? "&" : "?"}t=${Math.floor(Date.now() / 6e4)}`;
    const headers = { Range: "bytes=0-1024" };
    let res = null;
    if (typeof api.nativeFetch === "function") res = await Promise.resolve().then(() => api.nativeFetch(url, { method: "GET", headers })).catch(() => null);
    if (!res || !(res.status >= 200 && res.status < 300)) res = await fetch(url, { headers, cache: "no-store" }).catch(() => null);
    if (!res || !(res.status >= 200 && res.status < 300)) {
      out[p.name] = { error: true };
      return;
    }
    const v = /\/\/@version\s+(\S+)/.exec(await headText(res))?.[1];
    out[p.name] = { latest: v ?? null, hasUpdate: !!v && !!p.version && newer(v, p.version) };
  }));
  return out;
}

// ── pluginStorage 보기 ──
export async function storageDump(api) {
  const out = [];
  for (const k of await storageKeys(api)) {
    const v = await api.pluginStorage.getItem(k);
    out.push({ key: k, value: v, size: typeof v === "string" ? v.length : JSON.stringify(v ?? null).length });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
export var storageAvailable = (api) => typeof api.pluginStorage?.keys === "function" || typeof api.pluginStorage?.key === "function";

// ── 백업 내보내기 ──
export async function exportAll(api) {
  const plugins = await readPlugins(api).catch(() => null);
  const interop = {};
  for (const k of await storageKeys(api).catch(() => [])) if (k.startsWith("da_interop:")) interop[k] = await readJson(api, k, null);
  return JSON.stringify({
    format: "dusk-atelier-plugins",
    v: 1,
    at: (/* @__PURE__ */ new Date()).toISOString(),
    plugins,
    categories: await loadCategories(api),
    interop
  }, null, 2);
}
