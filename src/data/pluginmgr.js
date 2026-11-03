// 플러그인 매니저 기능 (1.8.3): 켜기/끄기·순서·별칭·삭제·등록·중복 정리·백업/복원·글로벌 프리셋.
// 리스가 플러그인의 plugins 쓰기를 막아서, 목록을 바꾸는 일은 전부 Cellar(mutate)가 대신 한다. 이 파일은 계산(순수 함수)과 저장만 한다.
import { cellarRequest } from "./cellar.js";
import { gunzipB64, gzipB64 } from "./cellarplugins.js";

// ── Cellar 호출 ──
export function createPluginMgr(api, conn) {
  const post = async (body, timeout = 60000) => {
    let res;
    try { res = await cellarRequest(api, conn, "/cellar/plugins", { method: "POST", body, timeout }); } catch (e) { if (e?.json) e.info = e.json; throw e; }
    if (res.status === 200 && res.json.ok) return res.json;
    throw Object.assign(new Error(res.json.error ?? `응답 ${res.status}`), { status: res.status, info: res.json });
  };
  return {
    list: () => post({ action: "list" }),
    // 일부 작업(순서·통째 바꾸기)은 listSha(목록 해시)가 필요하다 — 그새 바뀌었으면 서버가 거절한다
    mutate: (ops, expectListSha) => post({ action: "mutate", ops, ...(expectListSha ? { expectListSha } : {}) }, 180000),
    async exportAll() {
      const r = await post({ action: "export", gzip: typeof DecompressionStream === "function" }, 120000);
      return r.pluginsZ ? { ...r, pluginsZ: undefined, plugins: JSON.parse(await gunzipB64(r.pluginsZ)) } : r;
    },
    // 큰 코드는 압축해서 보낸다
    async packPlugin(pl) {
      if (typeof CompressionStream !== "function" || (pl.script?.length ?? 0) <= 5e4) return pl;
      const { script, ...rest } = pl;
      return { ...rest, scriptZ: await gzipB64(script) };
    },
  };
}

// ── 등록할 코드 읽기 ──
// //@name · //@display-name · //@api · //@version · //@update-url · //@arg 이름 타입 {{...}} · //@link 주소 설명
export function parseRegister(script) {
  const src = String(script ?? "");
  const head = src.split(/\r?\n/).slice(0, 400);
  const out = { name: "", displayName: "", api: "", version: "", updateURL: "", arguments: {}, argMeta: {}, customLink: [] };
  for (const line of head) {
    const m = /^\s*\/\/@([\w-]+)[ \t]+(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "name") out.name = v;
    else if (k === "display-name") out.displayName = v;
    else if (k === "api") out.api = v;
    else if (k === "version") out.version = v;
    else if (k === "update-url") out.updateURL = v;
    else if (k === "arg" || k === "risu-arg") {
      const a = /^(\S+)\s+(\S+)\s*(.*)$/.exec(v);
      if (a) { out.arguments[a[1]] = a[2]; if (a[3]) out.argMeta[a[1]] = a[3]; }
    } else if (k === "link") {
      const a = /^(\S+)\s*(.*)$/.exec(v);
      if (a) out.customLink.push({ link: a[1], hoverText: a[2] });
    }
  }
  return out;
}
const looksTs = (s) => /^\s*(?:export\s+)?(?:interface|type)\s+\w+|:\s*(?:string|number|boolean|any|void|unknown)\b\s*[,)=;{]|\bas\s+(?:string|number|any|unknown)\b/m.test(String(s));
// 등록 검사 → { ok, problems[], warnings[], plugin }. plugin은 Cellar mutate add에 넘길 모양.
export function buildRegister(script, { existing = [] } = {}) {
  const meta = parseRegister(script);
  const problems = [], warnings = [];
  if (!String(script).trim()) problems.push("코드가 비어 있어요.");
  if (!meta.name) problems.push("맨 위에 //@name 줄이 필요해요.");
  if (!meta.api) warnings.push("//@api 줄이 없어요. 없으면 옛 방식(API 2.0)으로 읽힐 수 있어요.");
  else if (/^2\.0$/.test(meta.api)) warnings.push("API 2.0 플러그인이에요. 리스 최신판에서는 동작하지 않을 수 있어요. 2.1로 바꾸고 설치하는 것을 권장해요.");
  if (looksTs(script)) warnings.push("TypeScript로 보여요. 이 화면은 변환하지 못하니 JavaScript로 바꿔서 넣어 주세요.");
  const dup = existing.find((p) => p.name === meta.name);
  const plugin = {
    name: meta.name, displayName: meta.displayName || meta.name, script: String(script),
    version: /^\d/.test(meta.api) ? meta.api : "3.0", versionOfPlugin: meta.version, updateURL: meta.updateURL,
    arguments: meta.arguments, argMeta: meta.argMeta, customLink: meta.customLink, enabled: true,
    realArg: Object.fromEntries(Object.entries(meta.arguments).map(([k, t]) => [k, /int|number|float/.test(t) ? 0 : ""])),
  };
  return { ok: !problems.length, problems, warnings, plugin, exists: Boolean(dup), existsIndex: dup ? existing.indexOf(dup) : -1 };
}
// API 2.0 → 2.1: //@api 줄만 바꾼다(코드는 그대로)
export const convertApi21 = (script) => String(script).replace(/^([ \t]*\/\/@api[ \t]+)2(?:\.0)?[ \t]*$/m, "$12.1");

// ── 중복 이름 정리 ──
// 같은 이름(ID)끼리 묶고, 켜진 사본 중 첫 번째(모두 꺼져 있으면 첫 번째)만 남기고 나머지를 지운다.
export function dupPlan(list) {
  const groups = new Map();
  list.forEach((p, i) => { if (!groups.has(p.name)) groups.set(p.name, []); groups.get(p.name).push({ ...p, index: i }); });
  const out = [];
  for (const [name, items] of groups) {
    if (items.length < 2) continue;
    const keep = items.find((x) => x.enabled) ?? items[0];
    const same = items.every((x) => x.sha256 === items[0].sha256);
    out.push({ name, keep: keep.index, remove: items.filter((x) => x !== keep).map((x) => x.index), same, count: items.length });
  }
  return out;
}
// 지울 번호들 → 뒤에서부터 지우는 remove 작업(번호가 밀리지 않게 index를 함께 보낸다)
export const dupOps = (plans, list) => plans.flatMap((g) => g.remove).sort((a, b) => b - a).map((i) => ({ op: "remove", index: i, name: list[i].name }));

// ── 백업 / 복원 ──
export const BACKUP_TYPE = "dusk-plugin-backup";
export function makeBackup({ plugins, categories = {}, presets = null, device = null }) {
  return { type: BACKUP_TYPE, version: 1, createdAt: new Date().toISOString(), plugins, categories, presets, device };
}
export function parseBackup(text) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("백업 파일을 읽지 못했어요 (JSON이 아니에요)"); }
  if (j?.type !== BACKUP_TYPE || !Array.isArray(j.plugins)) throw new Error("Dusk 플러그인 백업 파일이 아니에요");
  return j;
}
// scope: "all" | "plugins" | "meta"(프리셋·카테고리만) / mode: "replace" | "merge" → { plugins(새 전체 목록), categories, presets, summary }
export function planRestore(backup, current, { scope = "all", mode = "replace", curCategories = {}, curPresets = null } = {}) {
  let plugins = current, categories = curCategories, presets = curPresets;
  const sum = { added: 0, replaced: 0, removed: 0 };
  if (scope === "all" || scope === "plugins") {
    if (mode === "replace") {
      const names = new Set(backup.plugins.map((p) => p.name));
      sum.removed = current.filter((p) => !names.has(p.name)).length;
      sum.replaced = current.filter((p) => names.has(p.name)).length;
      sum.added = backup.plugins.length - sum.replaced;
      plugins = backup.plugins.map((p) => ({ ...p }));
    } else {
      plugins = current.map((p) => ({ ...p }));
      for (const b of backup.plugins) {
        const i = plugins.findIndex((p) => p.name === b.name);
        if (i >= 0) { plugins[i] = { ...b }; sum.replaced++; } else { plugins.push({ ...b }); sum.added++; }
      }
    }
  }
  if (scope === "all" || scope === "meta") {
    categories = mode === "replace" ? { ...(backup.categories ?? {}) } : { ...curCategories, ...(backup.categories ?? {}) };
    if (backup.presets) presets = mode === "replace" || !curPresets ? backup.presets : { ...curPresets, presets: { ...curPresets.presets, ...backup.presets.presets } };
  }
  return { plugins, categories, presets, summary: sum, pluginsChanged: scope !== "meta" };
}

// ── 글로벌 프리셋 ──
// 프리셋 = 어떤 플러그인이 켜져 있는지 + 순서 + 카테고리. (설정값·플러그인 스토리지는 넣지 않는다)
export const PRESET_KEY = "rbm:pluginPresets:v1";
export const emptyPresets = () => ({ presets: {}, active: null, pair: { mobile: null, desktop: null } });
export async function loadPresets(api) {
  try {
    const raw = await api.pluginStorage.getItem(PRESET_KEY);
    const v = typeof raw === "string" && raw ? JSON.parse(raw) : raw;
    return v && typeof v === "object" && v.presets ? { ...emptyPresets(), ...v, pair: { ...emptyPresets().pair, ...(v.pair ?? {}) } } : emptyPresets();
  } catch { return emptyPresets(); }
}
export const savePresets = (api, v) => api.pluginStorage.setItem(PRESET_KEY, JSON.stringify(v));
export function snapshotPreset(list, categories = {}) {
  return { order: list.map((p) => p.name), enabled: Object.fromEntries(list.map((p) => [p.name, p.enabled])), categories: Object.fromEntries(list.filter((p) => categories[p.name]).map((p) => [p.name, categories[p.name]])), savedAt: Date.now() };
}
// 프리셋을 지금 목록에 적용할 작업 → { ops, expectList, categories, missing[] }. 목록에 없는 플러그인은 건너뛴다(missing).
export function presetOps(preset, list) {
  const ops = [], missing = [];
  const idx = new Map();
  list.forEach((p, i) => { if (!idx.has(p.name)) idx.set(p.name, i); });
  for (const [name, on] of Object.entries(preset.enabled ?? {})) {
    if (!idx.has(name)) { missing.push(name); continue; }
    const cur = list[idx.get(name)];
    if (cur.enabled !== !!on) ops.push({ op: "set", name, index: idx.get(name), fields: { enabled: !!on } });
  }
  // 순서: 프리셋에 있는 것은 프리셋 순서대로 앞에, 나머지는 원래 순서로 뒤에
  const inPreset = (preset.order ?? []).filter((n) => idx.has(n));
  const rest = list.map((p, i) => [p, i]).filter(([p]) => !inPreset.includes(p.name)).map(([, i]) => i);
  const order = [...inPreset.map((n) => idx.get(n)), ...rest];
  const same = order.every((v, i) => v === i);
  return { ops, order: same ? null : order, categories: preset.categories ?? {}, missing };
}
// 프리셋 내보내기/가져오기 (설정값·스토리지는 넣지 않는다)
export const PRESET_FILE = "dusk-plugin-presets";
export const exportPresets = (state, names) => ({ type: PRESET_FILE, version: 1, presets: Object.fromEntries(names.filter((n) => state.presets[n]).map((n) => [n, state.presets[n]])) });
export function importPresets(state, text, { onDup = "number", select = null } = {}) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("프리셋 파일을 읽지 못했어요 (JSON이 아니에요)"); }
  if (j?.type !== PRESET_FILE || !j.presets || typeof j.presets !== "object") throw new Error("Dusk 플러그인 프리셋 파일이 아니에요");
  const next = { ...state, presets: { ...state.presets } };
  const added = [];
  for (const [name, p] of Object.entries(j.presets)) {
    if (select && !select.includes(name)) continue;
    if (!p || typeof p !== "object") continue;
    let to = name;
    if (next.presets[to] && onDup === "number") { let n = 2; while (next.presets[`${name} (${n})`]) n++; to = `${name} (${n})`; }
    next.presets[to] = p; added.push(to);
  }
  return { state: next, added };
}
// 카테고리 JSON (플러그인 이름 → 카테고리)
export const categoriesJson = (cats) => JSON.stringify(cats, null, 2);
export function parseCategories(text) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("JSON 파싱 실패"); }
  if (!j || typeof j !== "object" || Array.isArray(j) || Object.values(j).some((v) => typeof v !== "string")) throw new Error("카테고리는 {\"플러그인 이름\": \"카테고리\"} 모양이어야 해요");
  return j;
}
// 디바이스 페어: 화면이 좁으면 mobile, 아니면 desktop
export const deviceKind = (w = 0) => (w && w < 768 ? "mobile" : "desktop");
export const pairTarget = (state, kind) => (state.pair?.[kind] && state.presets[state.pair[kind]] && state.active && [state.pair.mobile, state.pair.desktop].includes(state.active) ? state.pair[kind] : null);

// ── 메타데이터 정리 ── 설치되지 않은 플러그인의 카테고리·연동 기록 등
export function orphanMeta(list, { categories = {}, presets = emptyPresets() } = {}) {
  const names = new Set(list.map((p) => p.name));
  const cats = Object.keys(categories).filter((n) => !names.has(n));
  const presetMissing = {};
  for (const [pn, p] of Object.entries(presets.presets)) { const m = Object.keys(p.enabled ?? {}).filter((n) => !names.has(n)); if (m.length) presetMissing[pn] = m; }
  return { categories: cats, presets: presetMissing };
}
