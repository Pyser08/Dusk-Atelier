import { normalizeTheme } from './theme.js';

var KEYS = { ui: "rbm:ui:v1", meta: "rbm:moduleMeta:v1" };
async function readJson(api, key, fallback) {
  try {
    const raw = await api.pluginStorage.getItem(key);
    if (raw === null || raw === void 0 || raw === "") return fallback;
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}
async function writeJson(api, key, value) {
  await api.pluginStorage.setItem(key, JSON.stringify(value));
}
export var defaultsMeta = () => ({ v: 1, folders: [], mapping: {}, nameColors: {}, links: {}, charAssetFolders: {}, charFoldersCollapsed: {}, moduleAssetFolders: {}, folderPickOthers: "hide" });
export function createPrefs(api) {
  let ui = null, meta = null;
  return {
    async load() {
      ui = await readJson(api, KEYS.ui, {});
      ui.theme = normalizeTheme(ui.theme);
      meta = await readJson(api, KEYS.meta, defaultsMeta());
      for (const [k, d] of Object.entries(defaultsMeta())) if (!(k in meta) || typeof meta[k] !== typeof d || Array.isArray(meta[k]) !== Array.isArray(d)) meta[k] = d;
      return { ui, meta };
    },
    get ui() {
      return ui;
    },
    get meta() {
      return meta;
    },
    async saveUi(patch) {
      ui = { ...ui, ...patch };
      await writeJson(api, KEYS.ui, ui);
      return ui;
    },
    async saveMeta(next) {
      meta = next;
      await writeJson(api, KEYS.meta, meta);
      return meta;
    },
    async reloadMeta() {
      meta = await readJson(api, KEYS.meta, defaultsMeta());
      for (const [k, d] of Object.entries(defaultsMeta())) if (!(k in meta)) meta[k] = d;
      return meta;
    }
  };
}
