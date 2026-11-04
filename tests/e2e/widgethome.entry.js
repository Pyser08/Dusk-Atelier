// 위젯 홈 e2e 하네스: 가짜 리스 api + 컨트롤러
import { createWidgetHome } from "../../src/data/widgethome.js";
window.makeApi = (opts = {}) => {
  const mem = new Map(), calls = [], parts = [];
  const store = { getItem: async (k) => (mem.has(k) ? mem.get(k) : null), setItem: async (k, v) => { mem.set(k, v); }, removeItem: async (k) => { mem.delete(k); } };
  const api = {
    pluginStorage: store, calls, parts, mem,
    showContainer: async (m) => { calls.push("show:" + m); }, hideContainer: async () => { calls.push("hide"); },
    registerButton: async (spec, fn) => { const id = spec.id || "b" + parts.length; parts.push({ id, spec, fn }); return { id }; },
    unregisterUIPart: async (id) => { const i = parts.findIndex((p) => p.id === id); if (i >= 0) parts.splice(i, 1); calls.push("unreg:" + id); },
    getColorScheme: async () => ({ scheme: { type: "dark" } }),
    getCurrentCharacterIndex: async () => 0, getDatabase: async () => ({ characters: [] }),
    getCharacterFromIndex: async () => null, getChatFromIndex: async () => null,
    readImage: async () => new Uint8Array(), alert: async (m) => { calls.push("alert:" + m); }
  };
  if (opts.localStorage) api.getLocalPluginStorage = async () => store;
  return api;
};
window.makeWH = (api, o = {}) => createWidgetHome(api, { log: (m) => (window.__logs ??= []).push(m), ...o });
import { bootWidgetHome } from "../../src/widgethome/home.js";
window.rawBoot = (api) => bootWidgetHome(api, {}).catch((e) => ({ err: e.stack }));
