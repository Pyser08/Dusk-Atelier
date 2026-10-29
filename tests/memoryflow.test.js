// 1.7.1 전체 흐름 점검: 응답 → 분석(1.7.1 새 필드 포함) → 저장 → 요청 주입(임베딩 켠/끈 경우)
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { createMemoryInjector } from "../src/data/memoryinject.js";
import { createEmbedder } from "../src/data/embed.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setup() {
  const m = new Map(), ls = new Map();
  const chat = { id: "t1", name: "채팅1", message: [{ role: "user", data: "안녕" }, { role: "char", data: LONG, chatId: "m1" }], localLore: [] };
  const character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getLocalPluginStorage: async () => ({ getItem: async (k) => ls.get(k) ?? null, setItem: async (k, v) => { ls.set(k, v); } }),
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async (n, f) => { api.hooks[n] = f; }, hooks: {}
  };
  return { api, chat, store: createMemoryStoreV3(api) };
}
const rich = JSON.stringify({
  people: [{ name: "미나", act: "하루에게 오래 숨긴 비밀을 털어놓음", p: 3, s: 3, r: 2, kd: "f", fc: "H", keys: ["비밀", "옥상"], attr: { c: "rel", k: "trust→하루", v: "신뢰함" }, self: { feel: "불안", cause: "거절당할까 봐", ic: "M" } }],
  scene: { sum: "비 오는 옥상에서 비밀을 털어놓음", facts: ["비밀 공개"], place: "옥상", who: ["미나", "하루"], changed: true },
  rel: [{ from: "미나", to: "하루", d: "마음을 엶", dir: "+" }],
  open: { add: [{ text: "하루가 아직 대답하지 않음", kind: "question", who: ["하루"] }] },
  emo: [{ from: "미나", to: "하루", t: { trust: 2, fear: 1 }, why: "비밀을 털어놓음" }],
  pov: [{ who: ["미나", "하루"], view: "미나는 용기를 냈고 하루는 충격받음", why: "정보 차이" }]
});

test("전체 흐름: 새 필드 포함 분석 → 저장 → 주입(임베딩 꺼짐)", async () => {
  const { api, chat, store } = setup(); let calls = 0;
  const runner = createMemoryRunner(api, { store, call: async () => { calls++; return rich; }, notify: () => {} });
  await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.02; });
  assert.equal(await runner.start(), true);
  api.hooks.output("본문"); await wait(200);
  assert.equal(calls, 1);
  const f = await store.getFolder("c1", "t1");
  const rec = f.people["미나"].records[0];
  assert.ok(rec && rec.kd === "f" && rec.fc === "H" && rec.keys?.length, "새 필드 저장");
  assert.ok(f.emo && Object.keys(f.emo).length, "감정 게이지 저장");
  const inj = createMemoryInjector(api, { store });
  const out = await inj.beforeRequest([{ role: "system", content: "S" }, { role: "user", content: "그래서?" }], "model");
  const block = out.find((m) => String(m.content).startsWith("[Dusk Memory"));
  assert.ok(block, "요청에 [Dusk Memory] 블록이 들어가야 한다");
  assert.match(block.content, /비밀/);
  assert.equal(out.at(-1).role, "user", "마지막은 user");
  const pv = await inj.preview(); assert.ok(pv.injected && pv.raw);
});
test("전체 흐름: 임베딩 켬(가짜 서버)·끔·실패 모두 주입이 막히지 않는다", async () => {
  for (const mode of ["on", "fail", "off"]) {
    const { api, chat, store } = setup();
    const runner = createMemoryRunner(api, { store, call: async () => rich, notify: () => {} });
    await store.updateIndex((i) => { i.settings.confirm = "now"; i.settings.debounceSec = 0.02; });
    await runner.start(); api.hooks.output("본문"); await wait(200);
    api.nativeFetch = async (u, o) => { if (mode === "fail") throw new Error("net"); const b = JSON.parse(o.body); const inp = b.input ?? b.inputs.flat(); return { ok: true, json: async () => ({ data: inp.map((t, i) => ({ index: i, embedding: [1, 0, 0, 0] })) }) }; };
    const embedder = createEmbedder(api, { log() {} });
    if (mode !== "off") await embedder.save({ on: true, key: "pa-test" });
    const inj = createMemoryInjector(api, { store, embedder });
    const out = await inj.beforeRequest([{ role: "system", content: "S" }, { role: "user", content: "비밀 얘기 계속" }], "model");
    assert.ok(out.some((m) => String(m.content).startsWith("[Dusk Memory")), mode + ": 주입돼야 한다");
  }
});
