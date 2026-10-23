import { recordActive } from './presets.js';
import { loadPersonaMap, savePersonaMap } from './persona.js';
import { newId } from '../engine/util.js';
import { loadModuleState, onCommitted, ops } from './modules.js';

export function createService(api, prefs) {
  let queue = Promise.resolve();
  const serial2 = (fn) => {
    const p = queue.then(fn, fn);
    queue = p.catch(() => {
    });
    return p;
  };
  let loadSeq = 0, cache = null, presetQ = Promise.resolve(), pendingOrder = null, orderQueued = null;
  onCommitted((st) => {
    loadSeq++;
    cache = { t: Date.now(), state: { entries: st.entries.map((e) => ({ module: e.module, enabled: e.enabled })), globalOn: new Set(st.enabledModules), charUse: cache?.state.charUse ?? /* @__PURE__ */ new Map(), characters: [] } };
    presetQ = presetQ.then(() => recordActive(api, st.entries, st.enabledModules)).catch(() => {
    });
  });
  const svc = {
    serial: serial2,
    async load(opts) {
      if (!opts?.fresh && cache && Date.now() - cache.t < 15e3) return cache.state;
      const seq = ++loadSeq;
      const state = await loadModuleState(api, opts);
      // 읽는 사이 다른 쓰기가 있었으면 캐시에 넣지 않는다
      if (seq === loadSeq) cache = { t: Date.now(), state };
      return state;
    },
    invalidate() {
      cache = null;
      loadSeq++;
    },
    flush: () => presetQ,
    run(name, ...args) {
      return serial2(async () => {
        const r = await ops[name](api, ...args);
        if (name === "remove") await svc.forgetModule(args[0]);
        return r;
      });
    },
    async forgetModule(id) {
      const m = structuredClone(prefs.meta);
      delete m.mapping[id];
      delete m.nameColors[id];
      if (m.moduleAssetFolders) delete m.moduleAssetFolders[id];
      for (const [k, v] of Object.entries(m.links ?? {})) if (v === id) delete m.links[k];
      await prefs.saveMeta(m);
      const per = await loadPersonaMap(api);
      for (const k of Object.keys(per.map)) {
        per.map[k] = per.map[k].filter((x) => x !== id);
        if (!per.map[k].length) delete per.map[k];
      }
      await savePersonaMap(api, per);
    },
    newModule(name) {
      return { id: newId(), name, description: "", lorebook: [], regex: [], trigger: [], assets: [] };
    },
    // ---- 폴더·이름 색 (모듈 데이터는 건드리지 않음) ----
    // fn이 동기면 prefs.meta가 바로 바뀐다(화면을 먼저 그리고 저장은 뒤에서 끝남)
    meta(fn) {
      const m = structuredClone(prefs.meta);
      const r = fn(m);
      if (r && typeof r.then === "function") return r.then(async (v) => {
        await prefs.saveMeta(m);
        return v;
      });
      return prefs.saveMeta(m).then(() => r);
    },
    // 순서만 바꿀 때: 연달아 끌어도 저장은 한 줄로 모아서(마지막 순서만) 한 번씩
    queueOrder(getIds) {
      pendingOrder = getIds;
      if (orderQueued) return orderQueued;
      orderQueued = serial2(async () => {
        const ids = pendingOrder();
        orderQueued = null;
        await ops.reorder(api, ids);
      });
      return orderQueued;
    },
    createFolder: (name, color) => svc.meta((m) => {
      const f = { id: "f_" + newId().slice(0, 8), name, color: color || "", collapsed: false };
      m.folders.push(f);
      return f;
    }),
    renameFolder: (id, name) => svc.meta((m) => {
      const f = m.folders.find((x) => x.id === id);
      if (f) f.name = name;
    }),
    colorFolder: (id, color) => svc.meta((m) => {
      const f = m.folders.find((x) => x.id === id);
      if (f) f.color = color;
    }),
    toggleFolder: (id) => svc.meta((m) => {
      const f = m.folders.find((x) => x.id === id);
      if (f) f.collapsed = !f.collapsed;
    }),
    moveFolder: (id, dir) => svc.meta((m) => {
      const i = m.folders.findIndex((x) => x.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= m.folders.length) return;
      [m.folders[i], m.folders[j]] = [m.folders[j], m.folders[i]];
    }),
    deleteFolder: (id) => svc.meta((m) => {
      m.folders = m.folders.filter((x) => x.id !== id);
      for (const [k, v] of Object.entries(m.mapping)) if (v === id) delete m.mapping[k];
    }),
    setFolder: (moduleIds, folderId) => svc.meta((m) => {
      for (const id of [].concat(moduleIds)) {
        if (folderId) m.mapping[id] = folderId;
        else delete m.mapping[id];
      }
    }),
    setNameColor: (id, color) => svc.meta((m) => {
      if (color) m.nameColors[id] = color;
      else delete m.nameColors[id];
    })
  };
  return svc;
}
export function groupByFolder(entries, meta) {
  const folders = (meta?.folders ?? []).map((f) => ({ folder: f, items: [] }));
  const byId = new Map(folders.map((g) => [g.folder.id, g]));
  const loose = [];
  for (const e of entries) {
    const g = byId.get(meta?.mapping?.[e.module.id]);
    (g ? g.items : loose).push(e);
  }
  return { folders, loose };
}
