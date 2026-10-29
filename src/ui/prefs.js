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
// 1.7.0 화면 모드: 간단(기본) | 고급. 개발자 모드를 이미 켠 사람은 고급으로 시작한다.
export var UI_MODES = ["simple", "advanced"];
export var normalizeUiMode = (ui) => UI_MODES.includes(ui?.uiMode) ? ui.uiMode : ui?.devMode ? "advanced" : "simple";
export function createPrefs(api) {
  let ui = null, meta = null;
  const save = async () => writeJson(api, KEYS.ui, ui);
  return {
    async load() {
      ui = await readJson(api, KEYS.ui, {});
      ui.theme = normalizeTheme(ui.theme);
      ui.uiMode = normalizeUiMode(ui);
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
    // 지금 화면 모드와 '고급 영역을 보일지'
    get uiMode() {
      return normalizeUiMode(ui);
    },
    get advanced() {
      return normalizeUiMode(ui) === "advanced";
    },
    async saveUi(patch) {
      ui = { ...ui, ...patch };
      await save();
      return ui;
    },
    // 간단으로 돌아가면 개발자 모드도 함께 끈다(개발자 모드는 고급 모드에서만 쓸 수 있다)
    async setUiMode(mode) {
      const m = mode === "advanced" ? "advanced" : "simple";
      return this.saveUi(m === "simple" ? { uiMode: m, devMode: false } : { uiMode: m });
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
