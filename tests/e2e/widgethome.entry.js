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
// 가짜 SafeDocument: 같은 페이지의 진짜 DOM을 비동기 메서드로 감싼다(리스의 getRootDocument 흉내)
const wrap = (n) => n && {
  _n: n,
  querySelector: async (s) => wrap(n.querySelector(s)), querySelectorAll: async (s) => [...n.querySelectorAll(s)].map(wrap),
  getBoundingClientRect: async () => { const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; },
  textContent: async () => n.textContent, matches: async (s) => n.matches(s), getParent: async () => wrap(n.parentElement),
  setAttribute: async (k, v) => n.setAttribute(k, v), getAttribute: async (k) => n.getAttribute(k), appendChild: async (c) => n.appendChild(c._n),
  createElement: async (t) => wrap(document.createElement(t)), setTextContent: async (t) => { n.textContent = t; }, remove: async () => n.remove(),
  setStyleAttribute: async (s) => n.setAttribute("style", s), getStyleAttribute: async () => n.getAttribute("style") || "",
  addEventListener: async () => 1, removeEventListener: async () => {}
};
window.fakeRoot = () => wrap(document);
