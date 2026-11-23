// 11-23 장기기억 연동 창구: 다른 애드온이 쓰는 이름·모양이 유지되는지
import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryApi, memoryViews } from "../src/data/memoryapi.js";

const folder = () => ({ cursor: { at: 3 }, persona: { name: "세라" }, personas: [{ name: "아린" }],
  wiki: { documents: { d1: { id: "d1", type: "Character", title: "하나", aliases: ["하나짱"], sections: [] } } },
  people: { 하나: { name: "하나", aliases: [], records: [{ act: "a", at: 1 }, { act: "b", at: 2 }] }, 두리: { name: "두리", aliases: [], records: [{ act: "c", at: 1 }] }, "{{user}}": { name: "{{user}}", records: [] } },
  life: { p: { d1: { sex: { n: 2 } } } }, nsfw: { d1: { sexual: {} } } });

test("views: 인물·페르소나·성인 기록", () => {
  const f = folder();
  assert.deepEqual(memoryViews.people(f).map((p) => [p.name, p.records]), [["하나", 2], ["두리", 1]]);
  assert.deepEqual(memoryViews.personas(f), { current: "세라", past: ["아린"] });
  assert.equal(memoryViews.adult(f, "하나짱").life.sex.n, 2);
  assert.equal(memoryViews.adult(f, "없음"), null);
  assert.ok(Array.isArray(memoryViews.relations(f).nodes));
});

test("createMemoryApi: 지금 채팅 폴더로 답하고 update로 고친다", async () => {
  let f = folder(); const store = { getFolder: async () => f, updateFolder: async (_a, _b, fn) => { fn(f); } };
  const api = createMemoryApi({ store, switches: { currentChat: async () => ({ chaId: "c", chatId: "t" }) }, flow: { onTurn: () => () => {} } });
  assert.equal(api.version, 1);
  assert.deepEqual(Object.keys(api).sort(), ["adult", "currentChat", "folder", "onTurn", "people", "personas", "relations", "update", "version", "views"]);
  assert.deepEqual((await api.personas()).past, ["아린"]);
  await api.update((x) => { x.persona.name = "루나"; });
  assert.equal((await api.personas()).current, "루나");
  assert.equal(typeof api.onTurn(() => {}), "function");
});
