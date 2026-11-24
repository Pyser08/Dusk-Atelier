import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { createAffHud } from "../src/data/affhud.js";
import { createFloatButton } from "../src/data/floatbtn.js";
import { notePersona, personaNeedsNote } from "../src/engine/personas.js";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [mode, reads] of [["next", 0], ["now", 1]]) test(`러너 보조 점검: ${mode}이면 채팅 읽기 ${reads}번`, async () => {
  let n = 0; const hooks = {};
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getChatFromIndex: async () => { n++; return { message: [] }; }, addRisuScriptHandler: async (t, f) => { hooks[t] = f; } };
  const store = { migrate: async () => 0, getIndex: async () => ({ settings: { confirm: mode }, bots: {} }), updateIndex: async () => {} };
  const r = createMemoryRunner(api, { store, call: async () => "" }); await r.start();
  assert.equal(hooks.display("글"), "글"); await wait(20); assert.equal(n, reads);
});

test("기억 저장소: 5초 넘게 걸리는 읽기도 같이 기다리고, 다 읽은 때부터 5초를 센다", async () => {
  const real = Date.now; let now = 1e6, n = 0, go; Date.now = () => now;
  try {
    const st = createMemoryStoreV3({ pluginStorage: { getItem: () => { n++; return new Promise((r) => { go = () => r(JSON.stringify({ v: 3 })); }); }, setItem: async () => {} } });
    const a = st.peekFolder("c", "t"); now += 8000; const b = st.peekFolder("c", "t"); assert.equal(n, 1);
    go(); await Promise.all([a, b]); now += 4000; await st.peekFolder("c", "t"); assert.equal(n, 1);
    now += 1500; const c = st.peekFolder("c", "t"); assert.equal(n, 2); go(); await c;
    st.dropCache(); st.peekFolder("c", "t"); now += 61000; st.peekFolder("c", "t"); assert.equal(n, 4);   // 응답 없는 읽기는 포기
  } finally { Date.now = real; }
});

for (const on of [false, true]) test(`호감도 HUD ${on ? "켬" : "끔"}: settle은 부르고 통째 읽기는 켰을 때만`, async () => {
  let reads = 0, settled = 0;
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => { reads++; return { chaId: "c", chats: [] }; }, getChatFromIndex: async () => { reads++; return { message: [] }; }, getDatabase: async () => ({ modules: [] }) };
  const hud = createAffHud(api, { store: { getIndex: async () => ({ settings: {}, affhud: { "mod:x": { on } } }) }, link: { settle: async () => { settled++; } } });
  await hud.tick(); assert.equal(settled, 1); assert.equal(reads > 0, on);
});

test("페르소나 사전 확인은 notePersona가 고치는 때와 같다", () => {
  for (const [p, n] of [[null, "하루"], ["하루", "하루"], ["하루", "하 루"], ["하루", "미나"], ["하루", ""], ["하루", "{{user}}"]]) {
    const f = { people: {}, ...(p ? { persona: { name: p } } : {}) }, before = JSON.stringify(f), need = personaNeedsNote(f, n);
    assert.equal(JSON.stringify(f), before); notePersona(f, n); assert.equal(JSON.stringify(f) !== before, need, `${p}→${n}`);
  }
});

function fakeDoc({ removable = true } = {}) {
  const live = new Map(); let id = 0, els = [];
  const mk = () => { const e = { L: {}, attrs: {}, setAttribute: async (k, v) => { e.attrs[k] = v; }, setStyleAttribute: async () => {}, setInnerHTML: async () => {}, addEventListener: async (t, f) => { e.L[t] = f; }, appendChild: async (c) => { els.push(c); }, remove: async () => { els = els.filter((x) => x !== e); }, getBoundingClientRect: async () => ({ width: 400, height: 800 }) }; return e; };
  const body = mk();
  const d = { querySelector: async (q) => (q === "body" ? body : null), createElement: async () => mk(), addEventListener: async (t, f) => { live.set(String(++id), [t, f]); return String(id); }, el: () => els[0],
    count: (re) => [...live.values()].filter(([t]) => re.test(t)).length, fire: (t, ev) => { for (const [x, f] of [...live.values()]) if (x === t) f(ev); } };
  d.removeEventListener = async (t, i) => { if (!removable) throw new Error("no"); live.delete(i); };
  return d;
}
const mkFab = (d, open = () => {}) => createFloatButton({ pluginStorage: { getItem: async () => null, setItem: async () => {} } }, { ensureDoc: async () => d, icon: "", title: "x", open });
test("떠 있는 버튼: 누를 때만 이동을 받고, 껐다 켜도 리스너가 쌓이지 않는다", async () => {
  const d = fakeDoc(); let opened = 0; const fab = mkFab(d, () => { opened++; });
  for (let i = 0; i < 3; i++) {
    await fab.show(); assert.equal(d.count(/move/), 0); assert.equal(d.count(/./), 5);
    d.el().L.pointerdown({ clientX: 1, clientY: 1 }); await wait(5); assert.equal(d.count(/move/), 3);
    d.fire("pointerup", {}); await wait(5); assert.equal(d.count(/move/), 0); assert.equal(opened, i + 1);
    await fab.hide(); assert.equal(d.count(/./), 0);
  }
  await fab.show(); d.el().L.pointerdown({ clientX: 1, clientY: 1 }); await fab.hide(); await wait(5); assert.equal(d.count(/./), 0);   // 누른 채 숨김
});
test("떠 있는 버튼: 떼지 못하는 판에서는 이동 리스너를 한 벌만 쓴다", async () => {
  const d = fakeDoc({ removable: false }), fab = mkFab(d); await fab.show();
  for (let i = 0; i < 3; i++) { d.el().L.pointerdown({ clientX: 1, clientY: 1 }); await wait(5); d.fire("pointerup", {}); await wait(360); }
  assert.equal(d.count(/move/), 3);
});
