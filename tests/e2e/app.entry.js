// 1.7.0 메뉴 구조 시험용: 가짜 리스 api로 실제 createApp을 띄운다. node tests/e2e/run-app.mjs 로 실행.
import { createApp } from "../../src/ui/app.js";
import { createMemory } from "../../src/data/memory.js";
import POT_PROMPTS from "../../src/data/pot/prompts.json";

export function fakeApi(seed = {}) {
  const store = { ...seed };
  const chars = [
    { chaId: "c1", name: "시로코", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" },
    { chaId: "c2", name: "호시노", creator: "me", globalLore: [], chats: [{ message: [] }], image: "", type: "character" }
  ];
  const db = { characters: chars, characterOrder: [], modules: [], plugins: [], personas: [] };
  return {
    store,
    pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; }, removeItem: async (k) => { delete store[k]; }, keys: async () => Object.keys(store) },
    getColorScheme: async () => ({ scheme: { type: "light" } }),
    showContainer: async () => {}, hideContainer: async () => {},
    getDatabase: async () => structuredClone(db), setDatabaseLite: async () => {}, setDatabase: async () => {},
    getCharacterFromIndex: async (i) => structuredClone(chars[i]), setCharacterToIndex: async () => {},
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async () => ({ message: [] }),
    getRootDocument: async () => null, nativeFetch: async () => ({ status: 404 }), registerButton: async () => {}, registerSetting: async () => {}
  };
}
window.bootApp = async (seed, opts = {}) => {
  const api = fakeApi(seed);
  const errors = (window.__errors = []);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason?.message ?? e.reason)));
  const app = createApp(api, { legacy: { open() {}, busy: false, startWithFiles() {} }, version: "1.7.0-dev", onPersonaChanged() {} });
  if (opts.memory) {  // 기억 탭까지 실제 저장소·흐름으로 띄운다(훅 등록은 가짜 api라 건너뜀)
    const memory = createMemory(api, { potLibrary: POT_PROMPTS });
    await memory.store.getIndex();
    app.ctx.memory = memory;
  }
  window.__app = app;
  window.__api = api;
  // 첫 둘러보기·새로 바뀐 점 창이 화면을 가리지 않게 미리 본 것으로 처리
  await app.open();
  document.querySelectorAll(".rb-modal, .rb-full").forEach((m) => m.remove());
  return true;
};
