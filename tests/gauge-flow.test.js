import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { createGaugeService } from "../src/data/gauge.js";

const LONG = "비가 내리는 옥상에서 미나가 하루의 손을 잡고 오래 숨겨 둔 비밀을 처음으로 털어놓았다. 하루는 아무 대답도 하지 못했다. ".repeat(2);
function setup(n) {
  const m = new Map(), message = [];
  for (let i = 0; i < n; i++) { message.push({ role: "user", data: "안녕" + i }); message.push({ role: "char", data: LONG + i, chatId: "m" + i }); }
  const chat = { id: "t1", name: "채팅1", message }, character = { chaId: "c1", name: "봇", chats: [chat] };
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    addRisuScriptHandler: async () => {}, hooks: {} };
  return { api, store: createMemoryStoreV3(api) };
}

test("8번째 AI 응답에서 게이지가 갱신되고 표시용 박스가 생긴다 (한 번 호출에 얹힘)", async () => {
  const { api, store } = setup(8);
  const gauge = createGaugeService(api, { store });
  const seen = [];
  const call = async (msgs) => {
    const payload = JSON.parse(msgs[1].content); seen.push(payload);
    const gs = payload.gauges ?? [];
    return JSON.stringify({ people: [{ name: "미나", act: "비밀을 털어놓음", p: 2, s: 2, r: 2 }, { name: "하루", act: "침묵", p: 1, s: 1, r: 1 }], scene: { sum: "옥상", facts: [], place: "옥상", when: "", who: ["미나", "하루"], changed: true },
      ...(gs.length ? { gauge: [{ g: gs[0].id, who: gs[0].who[0].name, d: 2, why: "비밀을 털어놓음" }] } : {}) });
  };
  const runner = createMemoryRunner(api, { store, call, gauge, notify: () => {} });
  const d = await gauge.addDef("c1", { name: "신뢰", min: 0, max: 10, init: 3, step: 3, measure: "m", rule: "r", update: "u", on: true });
  assert.equal(d.length, 1);
  for (let k = 0; k < 8; k++) await runner.analyzeAt(0, 0, [k * 2 + 1], { manual: false });
  assert.equal(seen.filter((p) => p.gauges).length, 1, "8번째에만 게이지가 얹힌다");
  const f = await store.getFolder("c1", "t1");
  assert.equal(f.gauge.log.length, 1);
  assert.equal(f.gauge.log[0].items[0].to, 5);
  assert.ok(f.gauge.log[0].snap.length >= 1);
  const out = await gauge.onDisplay(LONG + "7");
  assert.ok(out.includes('x-dusk="gauge"'));
  const u = await gauge.undo("c1", "t1");
  assert.equal(u.restored, 1);
});

test("제안은 기본 꺼짐이라 요청에 안 얹히고, 켜면 suggestGauge가 얹혀 제안이 쌓인다", async () => {
  const { api, store } = setup(8);
  const gauge = createGaugeService(api, { store });
  let sawSuggest = false;
  const call = async (msgs) => { const p = JSON.parse(msgs[1].content); if (p.suggestGauge) sawSuggest = true;
    return JSON.stringify({ people: [{ name: "미나", act: "x", p: 1, s: 1, r: 1 }], scene: null, ...(p.suggestGauge ? { gaugeIdea: { name: "경계심", desc: "낯선 이에 대한 경계" } } : {}) }); };
  const runner = createMemoryRunner(api, { store, call, gauge, notify: () => {} });
  for (let k = 0; k < 8; k++) await runner.analyzeAt(0, 0, [k * 2 + 1], {});
  assert.equal(sawSuggest, false);
  const { api: a2, store: s2 } = setup(8); const g2 = createGaugeService(a2, { store: s2 });
  await g2.setSuggestOn("c1", true);
  const r2 = createMemoryRunner(a2, { store: s2, call, gauge: g2, notify: () => {} });
  for (let k = 0; k < 8; k++) await r2.analyzeAt(0, 0, [k * 2 + 1], {});
  assert.equal(sawSuggest, true);
  const sug = await g2.getSuggest("c1");
  assert.equal(sug.list.length, 1); assert.equal(sug.list[0].status, "pending");
});

test("AI 설계: 이름·설명 유지, 검증 실패는 저장 안 함", async () => {
  const { api, store } = setup(1);
  const gauge = createGaugeService(api, { store, call: async () => JSON.stringify({ name: "x", min: 0, max: 10, init: 2, step: 2, measure: "m", rule: "r", update: "u", look: { hue: 200, shape: "ring", icon: "💧" } }) });
  const d = await gauge.design({ name: "경계", desc: "낯선 이 경계" });
  assert.equal(d.look.shape, "ring"); assert.equal(d.on, false);
  assert.equal((await gauge.getDefs("c1")).length, 0, "설계만으로는 저장되지 않음");
  const bad = createGaugeService(api, { store, call: async () => "nope" });
  await assert.rejects(() => bad.design({ name: "a" }));
});

test("표시 훅은 메시지마다 저장소를 다시 읽지 않는다 (모바일 렌더 지연 방지)", async () => {
  const { api, store } = setup(2);
  let reads = 0; const get = api.pluginStorage.getItem; api.pluginStorage.getItem = async (k) => { reads++; return get(k); };
  const gauge = createGaugeService(api, { store });
  for (let i = 0; i < 40; i++) assert.equal(await gauge.onDisplay("메시지 " + i + LONG), "메시지 " + i + LONG);
  assert.ok(reads <= 2, `게이지가 없어도 매번 읽던 문제: ${reads}번 읽음`);
  await gauge.addDef("c1", { name: "신뢰", min: 0, max: 10, init: 3, step: 3, measure: "m", rule: "r", update: "u", on: true });
  const before = reads;
  for (let i = 0; i < 40; i++) await gauge.onDisplay("메시지 " + i + LONG);
  assert.ok(reads - before <= 4, `게이지를 만든 뒤에도 매번 읽음: ${reads - before}`);
});
