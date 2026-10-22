export var DISABLED_KEY = "rbm:disabledModules:v1";
export var ORDER_KEY = "rbm:moduleOrder:v1";
var ModuleError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ModuleError";
  }
};
export var hasAssets = (m) => (m?.assets?.length ?? 0) > 0;
var valid = (m) => m && typeof m === "object" && m.id;
var strip = (m) => {
  const { enabled, ...rest } = m;
  return rest;
};
export async function loadCharacters(api, given) {
  if (Array.isArray(given)) return { list: given, unloaded: 0 };
  let order = [];
  try {
    order = (await api.getDatabase(["characterOrder"]))?.characterOrder ?? [];
  } catch {
  }
  const ids = /* @__PURE__ */ new Set();
  const walk = (o) => {
    for (const x of o ?? []) {
      if (typeof x === "string") ids.add(x);
      else if (x && Array.isArray(x.data)) walk(x.data);
    }
  };
  walk(order);
  const list = [];
  let miss = 0;
  for (let i = 0; i < ids.size + 200 && miss < 30; i++) {
    let c = null;
    try {
      c = await api.getCharacterFromIndex(i);
    } catch {
      c = null;
    }
    list.push(c);
    if (c) miss = 0;
    else if (i >= ids.size) miss++;
  }
  while (list.length && list[list.length - 1] == null) list.pop();
  return { list, unloaded: Math.max(0, ids.size - list.filter((c) => c && ids.has(c.chaId)).length) };
}
export var isHostBlocked = (e) => !!e?.hostBlocked || /still loading|not loaded|history is only partially/i.test(String(e?.message ?? e));
export var hostBlockedMessage = "이 앱(RisuVault 등)은 대화가 긴 봇을 플러그인이 통째로 저장하지 못하게 막아요(채팅 보호). 이 봇은 앱 기본 화면에서 고쳐 주세요.";
export async function readDb(api, keys = ["modules", "pluginCustomStorage", "enabledModules", "characters"]) {
  const wantPcs = keys.includes("pluginCustomStorage");
  const db = await api.getDatabase(keys.filter((k) => k !== "pluginCustomStorage"));
  if (!db) throw new ModuleError("데이터베이스를 읽을 권한이 없습니다. 플러그인 권한을 허용해 주세요.");
  if (wantPcs) {
    const read = async (k) => {
      let v = await api.pluginStorage.getItem(k);
      if (typeof v === "string") {
        try {
          v = JSON.parse(v);
        } catch {
          v = [];
        }
      }
      return Array.isArray(v) ? v : [];
    };
    const [off, order] = await Promise.all([read(DISABLED_KEY), read(ORDER_KEY)]);
    db.pluginCustomStorage = { [DISABLED_KEY]: off, [ORDER_KEY]: order };
  }
  if (keys.includes("characters") && !Array.isArray(db.characters)) {
    const r = await loadCharacters(api, db.characters);
    db.characters = r.list;
    db.charsUnloaded = r.unloaded;
  }
  return db;
}
export function entriesOf(db) {
  const on = (db.modules ?? []).filter(valid).map((m) => ({ module: m, enabled: true }));
  const offRaw = db.pluginCustomStorage?.[DISABLED_KEY];
  const off = (Array.isArray(offRaw) ? offRaw : []).filter(valid).map((m) => ({ module: m, enabled: false }));
  const all = [...on, ...off];
  const ord = db.pluginCustomStorage?.[ORDER_KEY];
  const at = new Map((Array.isArray(ord) ? ord : []).map((id, i) => [id, i]));
  all.forEach((e, i) => {
    e.order = at.has(e.module.id) ? at.get(e.module.id) : 1e9 + i;
    e.pos = i;
  });
  all.sort((a, b) => a.order - b.order || a.pos - b.pos);
  return all;
}
export async function loadModuleState(api, { chars = false } = {}) {
  const db = await readDb(api, chars ? void 0 : ["modules", "pluginCustomStorage", "enabledModules"]);
  const entries = entriesOf(db);
  const globalOn = new Set(db.enabledModules ?? []);
  const charUse = /* @__PURE__ */ new Map();
  for (const c of db.characters ?? []) {
    if (!c || c.trashTime) continue;
    for (const id of c.modules ?? []) charUse.set(id, (charUse.get(id) ?? 0) + 1);
  }
  return { entries, globalOn, charUse, characters: db.characters ?? [] };
}
export function moduleCounts(m) {
  return { lore: m.lorebook?.length ?? 0, regex: m.regex?.length ?? 0, trigger: m.trigger?.length ?? 0, assets: m.assets?.length ?? 0 };
}
export function moduleFlags(m, globalOn) {
  return { global: globalOn?.has(m.id) ?? false, lla: !!m.lowLevelAccess, mcp: !!m.mcp, cjs: !!m.cjs };
}
export function sortIds(ids, orderIds) {
  const pos = new Map(orderIds.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (pos.get(a) ?? Infinity) - (pos.get(b) ?? Infinity));
}
function insertOrdered(ids, id, orderIds) {
  if (ids.includes(id)) return ids;
  const pos = new Map(orderIds.map((x, i) => [x, i]));
  const p = pos.get(id) ?? Infinity;
  const out = [...ids];
  let at = out.findIndex((x) => (pos.get(x) ?? Infinity) > p);
  if (at < 0) at = out.length;
  out.splice(at, 0, id);
  return out;
}
export async function commit(api, mutate, { chars = false } = {}) {
  const db = await readDb(api, chars ? ["modules", "pluginCustomStorage", "enabledModules", "characters"] : ["modules", "pluginCustomStorage", "enabledModules"]);
  const draft = {
    entries: entriesOf(db).map((e) => ({ module: { ...e.module }, enabled: e.enabled })),
    enabledModules: [...db.enabledModules ?? []],
    characters: db.characters ?? [],
    changedChars: /* @__PURE__ */ new Set(),
    removedIds: /* @__PURE__ */ new Set()
  };
  const result = await mutate(draft);
  const orderIds = draft.entries.map((e) => e.module.id);
  const offIds = new Set(draft.entries.filter((e) => !e.enabled).map((e) => e.module.id));
  const gone = /* @__PURE__ */ new Set([...draft.removedIds, ...offIds]);
  const enabledModules = sortIds(draft.enabledModules.filter((id) => !gone.has(id) && orderIds.includes(id)), orderIds);
  draft.characters.forEach((c, i) => {
    if (!c) return;
    const before = JSON.stringify([c.modules ?? [], (c.chats ?? []).map((x) => x?.modules ?? [])]);
    if (Array.isArray(c.modules)) c.modules = sortIds(c.modules.filter((id) => !gone.has(id)), orderIds);
    for (const ch of c.chats ?? []) if (ch && Array.isArray(ch.modules)) ch.modules = sortIds(ch.modules.filter((id) => !gone.has(id)), orderIds);
    if (JSON.stringify([c.modules ?? [], (c.chats ?? []).map((x) => x?.modules ?? [])]) !== before) draft.changedChars.add(i);
  });
  const modules = draft.entries.filter((e) => e.enabled).map((e) => strip(e.module));
  const disabled = draft.entries.filter((e) => !e.enabled).map((e) => strip(e.module));
  await api.setDatabaseLite({ modules, enabledModules, [DISABLED_KEY]: disabled, [ORDER_KEY]: orderIds });
  let skipped = 0;
  for (const i of draft.changedChars) {
    const want = draft.characters[i];
    const fresh = await api.getCharacterFromIndex(i);
    if (!fresh || fresh.chaId !== want.chaId) continue;
    fresh.modules = want.modules ?? [];
    (fresh.chats ?? []).forEach((ch, j) => {
      const w = want.chats?.[j];
      if (ch && w && (w.id === void 0 || w.id === ch.id) && Array.isArray(w.modules)) ch.modules = w.modules;
    });
    try {
      await api.setCharacterToIndex(i, fresh);
    } catch (e) {
      if (!isHostBlocked(e)) throw e;
      skipped++;
    }
  }
  if (skipped) for (const fn of noticeHooks) fn(`모듈은 저장했어요. 대화가 긴 봇 ${skipped}개는 앱이 보호하고 있어서 그 봇의 모듈 목록은 그대로 뒀어요.`);
  const state = { entries: draft.entries.map((e) => ({ module: strip(e.module), enabled: e.enabled })), enabledModules };
  for (const fn of commitHooks) {
    try {
      await fn(state);
    } catch (e) {
      console.warn("[Dusk Atelier] 저장 후 처리 실패", e);
    }
  }
  return result;
}
var commitHooks = /* @__PURE__ */ new Set();
var noticeHooks = /* @__PURE__ */ new Set();
export var onNotice = (fn) => {
  noticeHooks.add(fn);
  return () => noticeHooks.delete(fn);
};
export var onCommitted = (fn) => {
  commitHooks.add(fn);
  return () => commitHooks.delete(fn);
};
var find = (d, id) => {
  const e = d.entries.find((x) => x.module.id === id);
  if (!e) throw new ModuleError("모듈을 찾지 못했어요. 목록을 새로 고쳐 주세요.");
  return e;
};
export var ops = {
  setEnabled: (api, id, on) => commit(api, (d) => {
    const e = find(d, id);
    if (!on && hasAssets(e.module)) throw new ModuleError("에셋이 있는 모듈은 끌 수 없어요. (끄면 RisuAI가 에셋을 정리할 수 있어요)");
    e.enabled = !!on;
  }, { chars: !on }),
  setGlobal: (api, id, on) => commit(api, (d) => {
    const e = find(d, id);
    if (on && !e.enabled) throw new ModuleError("꺼진 모듈은 글로벌로 켤 수 없어요. 먼저 켜 주세요.");
    const order = d.entries.map((x) => x.module.id);
    d.enabledModules = on ? insertOrdered(d.enabledModules, id, order) : d.enabledModules.filter((x) => x !== id);
  }),
  reorder: (api, orderedIds) => commit(api, (d) => {
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    d.entries.sort((a, b) => (pos.get(a.module.id) ?? Infinity) - (pos.get(b.module.id) ?? Infinity));
  }),
  remove: (api, id) => commit(api, (d) => {
    const e = find(d, id);
    d.entries = d.entries.filter((x) => x !== e);
    d.removedIds.add(id);
    return e.module;
  }, { chars: true }),
  create: (api, mod) => commit(api, (d) => {
    d.entries.push({ module: mod, enabled: true });
    return mod;
  }),
  update: (api, id, patch) => commit(api, (d) => {
    const e = find(d, id);
    Object.assign(e.module, patch);
    return e.module;
  }),
  // 캐릭터 연결: 캐릭터의 모든 채팅에서 켜진다
  setCharacterLink: (api, charIndex, id, on) => commit(api, (d) => {
    const c = d.characters[charIndex];
    if (!c) throw new ModuleError("캐릭터를 찾지 못했어요.");
    const order = d.entries.map((x) => x.module.id);
    const cur = Array.isArray(c.modules) ? c.modules : [];
    c.modules = on ? insertOrdered(cur, id, order) : cur.filter((x) => x !== id);
    d.changedChars.add(charIndex);
  }, { chars: true }),
  // 채팅 연결 해제 (채팅 연결 추가는 RisuAI 채팅 화면에서 한다)
  unlinkChat: (api, charIndex, chatIndex, id) => commit(api, (d) => {
    const ch = d.characters[charIndex]?.chats?.[chatIndex];
    if (!ch) throw new ModuleError("채팅을 찾지 못했어요.");
    ch.modules = (ch.modules ?? []).filter((x) => x !== id);
    d.changedChars.add(charIndex);
  }, { chars: true })
};
