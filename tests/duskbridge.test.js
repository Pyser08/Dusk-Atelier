// DA Interop 역방향 브리지: 스니펫의 createDuskClient(B 플러그인)와 Dusk의 createDuskBridge를 같은 가짜 저장소로 묶어 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { INTEROP_SNIPPET } from "../src/data/interopSnippet.js";
import { createDuskBridge, setPath, PERMS_KEY } from "../src/data/duskbridge.js";

function fakeApi() {
  const m = new Map();
  return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] } };
}
function client(api, id) {
  const g = { Risuai: api };
  const make = new Function("globalThis", "setInterval", "document", INTEROP_SNIPPET + "\nreturn createDuskClient;")(g, () => 0, undefined);
  return make(id, { stepMs: 5 });
}
function fakeMemory() {
  const folders = new Map([["c1|t1", { chaId: "c1", chatId: "t1", wiki: { revision: 1, people: [{ name: "A" }] } }]]);
  return {
    folders,
    switches: { currentChat: () => ({ chaId: "c1", chatId: "t1" }) },
    store: {
      getIndex: async () => ({ folders: [...folders.keys()] }),
      getFolder: async (a, b) => folders.get(`${a}|${b}`) ?? null,
      updateFolder: async (a, b, fn) => { const f = folders.get(`${a}|${b}`) ?? { chaId: a, chatId: b }; await fn(f); folders.set(`${a}|${b}`, f); }
    }
  };
}
async function setup({ ask = async () => true } = {}) {
  const api = fakeApi(), mem = fakeMemory(), asked = [];
  const bridge = createDuskBridge(api, { version: "9.9", memory: () => mem, runAI: async (_a, msgs, pick) => `${pick.mode}:${msgs.at(-1).content}`, ask: async (o) => { asked.push(o.title); return ask(o); } });
  const t = setInterval(() => { bridge.tick().catch(() => {}); }, 5);
  await bridge.publish();
  return { api, mem, bridge, asked, stop: () => clearInterval(t) };
}

test("setPath는 중첩 값을 넣고 지우며 위험한 키는 막는다", () => {
  const o = { a: [1, 2] };
  setPath(o, ["b", "c"], 3); setPath(o, ["a", 0], undefined);
  assert.deepEqual(o, { a: [2], b: { c: 3 } });
  assert.throws(() => setPath(o, ["__proto__", "x"], 1));
});

test("메서드 목록을 읽고, 처음 한 번 허용을 묻는다", async () => {
  const s = await setup();
  try {
    const d = client(s.api, "risu64");
    assert.ok((await d.methods()).some((m) => m.name === "memory.folder"));
    assert.deepEqual(await d.call("memory.current"), { chaId: "c1", chatId: "t1" });
    assert.equal((await d.call("memory.folder", { chaId: "c1", chatId: "t1" })).wiki.people[0].name, "A");
    assert.deepEqual(s.asked, ["플러그인 연동 허용"]);
    assert.ok(JSON.parse(s.api.m.get(PERMS_KEY)).risu64.allow);
  } finally { s.stop(); }
});

test("쓰기는 매번 묻고, 위키를 바꾸면 revision이 오른다", async () => {
  const s = await setup();
  try {
    const d = client(s.api, "risu64");
    await d.call("memory.patch", { chaId: "c1", chatId: "t1", path: ["wiki", "people", 0, "name"], value: "B" });
    await d.call("memory.patch", { chaId: "c1", chatId: "t1", path: ["wiki", "note"], value: "x" });
    const f = s.mem.folders.get("c1|t1");
    assert.equal(f.wiki.people[0].name, "B");
    assert.equal(f.wiki.revision, 3);
    assert.equal(s.asked.filter((t) => t === "플러그인이 바꾸려고 해요").length, 2);
  } finally { s.stop(); }
});

test("거절하면 denied, 모르는 메서드·Dusk 아닌 키는 오류", async () => {
  const s = await setup({ ask: async () => false });
  try {
    await assert.rejects(() => client(s.api, "evil").call("memory.index"), /denied/);
  } finally { s.stop(); }
  const s2 = await setup();
  try {
    const d = client(s2.api, "p2");
    await assert.rejects(() => d.call("nope"), /unknown method/);
    await assert.rejects(() => d.call("storage.get", { key: "da_interop:reg:x" }), /Dusk 키만/);
    await d.call("storage.set", { key: "dusk.test", value: { a: 1 } });
    assert.deepEqual(await d.call("storage.get", { key: "dusk.test" }), { a: 1 });
  } finally { s2.stop(); }
});

test("AI 요청과 같은 플러그인의 연속 호출은 순서대로 처리된다", async () => {
  const s = await setup();
  try {
    const d = client(s.api, "p3");
    const outs = await Promise.all(["a", "b", "c"].map((c) => d.call("ai.run", { prompt: c })));
    assert.deepEqual(outs, ["submodel:a", "submodel:b", "submodel:c"]);
    assert.equal(await d.call("ai.run", { messages: [{ role: "user", content: "z" }], mode: "model" }), "model:z");
  } finally { s.stop(); }
});

test("Dusk가 없으면 methods는 빈 목록, call은 시간 초과", async () => {
  const d = client(fakeApi(), "lonely");
  assert.deepEqual(await d.methods(), []);
  await assert.rejects(() => d.call("dusk.info", null, { timeoutMs: 50 }), /timeout/);
});
