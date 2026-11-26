// 떠 있는 막대(fabhub): 장기기억·Saga 칸이 한 막대에, 순서대로, 떼면 사라지고 비면 숨는다
import test from "node:test";
import assert from "node:assert/strict";
import { createFabHub } from "../src/data/fabhub.js";
import { createMemoryButton } from "../src/data/memorybutton.js";

function fakeDoc() {
  const mk = (tag) => { const n = { tag, attrs: {}, kids: [], html: "", removed: false, setAttribute: async (k, v) => { n.attrs[k] = v; }, setStyleAttribute: async (v) => { n.attrs.style = v; }, setInnerHTML: async (h) => { n.html = h; }, addEventListener: async () => 1, removeEventListener: async () => {}, querySelector: async (q) => { const m = /x-dusk-i="(\d+)"/.exec(q); return m && n.html.includes(q.slice(1, -1)) ? mk("div") : null; }, appendChild: async (c) => { n.kids.push(c); }, remove: async () => { n.removed = true; }, getBoundingClientRect: async () => ({ width: 390, height: 800 }) }; return n; };
  const body = mk("body");
  return { body, createElement: async (t) => mk(t), defaultView: { innerHeight: 800 }, addEventListener: async () => 1, removeEventListener: async () => {}, querySelector: async (q) => (q === "body" ? body : null) };
}
const api0 = (doc) => ({ getRootDocument: async () => doc, requestPluginPermission: async () => true, pluginStorage: { getItem: async (k) => (k === "dusk.memory.button" ? "on" : null), setItem: async () => {} } });
const shown = (doc) => doc.body.kids.filter((k) => !k.removed);

test("칸 순서·떼기·비면 숨김", async () => {
  const doc = fakeDoc(), hub = createFabHub(api0(doc));
  const g = await hub.add({ key: "gen", title: "전투", order: 30, open: () => {} }); assert.ok(g);
  const r = await hub.add({ key: "relmap", title: "관계도", order: 10, open: () => {} });
  const el = shown(doc).at(-1); assert.ok(el.html.indexOf("관계도") < el.html.indexOf("전투"));
  await r(); await g(); assert.equal(shown(doc).length, 0);
});
test("권한이 없으면 add는 null(부른 쪽이 리스 버튼으로)", async () => {
  const hub = createFabHub({ getRootDocument: async () => null, requestPluginPermission: async () => false, pluginStorage: { getItem: async () => null } });
  assert.equal(await hub.add({ key: "gen", title: "전투", open: () => {} }), null);
});
test("장기기억 버튼은 막대가 있으면 관계도·채팅 옮기기 칸으로", async () => {
  const doc = fakeDoc(), hub = createFabHub(api0(doc)); globalThis.__duskFab = hub;
  try {
    const b = createMemoryButton(api0(doc), { name: "인물 관계도", icon: "", open: () => {}, ensureDoc: async () => doc });
    await b.set(true); assert.ok(hub.has("relmap") && hub.has("regress")); await hub.add({ key: "gen", title: "전투", order: 30, open: () => {} });
    const el = shown(doc).at(-1); assert.ok(el.html.indexOf("회귀") < el.html.indexOf("전투"));
    await b.hide(); assert.ok(!hub.has("relmap") && hub.has("gen"));
  } finally { delete globalThis.__duskFab; }
});
