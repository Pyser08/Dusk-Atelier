import test from "node:test";
import assert from "node:assert/strict";
import { selectRecords, sceneBlocks, pickLore, relationLore, copyLore } from "../src/engine/memorycompose.js";
import { sliceFolder, sceneAt, createRewindChat, draftFirstMessage } from "../src/data/memoryrewind.js";
import { createMemoryStore } from "../src/data/memorystore.js";

const rec = (id, at, g, act, sit, extra = {}) => ({ id, at, g, act, sit, orphan: false, ...extra });
const folder = () => ({ botName: "봇", scenes: [{ id: "s1", at: 3, sum: "옥상", place: "옥상", facts: ["a"], at_ms: 10 }, { id: "s2", at: 9, sum: "교실", place: "교실", facts: [], at_ms: 20 }],
  people: { 미나: { name: "미나", records: [rec("a", 3, "B", "비밀", "s1"), rec("b", 5, "D", "웃음", "s1"), rec("c", 9, "A", "고백", "s2"), rec("o", 4, "A", "고아", "s1", { orphan: true })] }, 하루: { name: "하루", records: [rec("d", 3, "C", "침묵", "s1")] } } });

test("grade floor, range filter and orphan exclusion", () => {
  const f = folder();
  assert.deepEqual(selectRecords(f, ["미나", "하루"], { minGrade: "C" }).map((r) => r.id), ["a", "d", "c"]);
  assert.deepEqual(selectRecords(f, ["미나"], { minGrade: "D", from: 4, to: 8 }).map((r) => r.id), ["b"]);
  assert.deepEqual(selectRecords(f, ["미나"], { minGrade: "A" }).map((r) => r.id), ["c"]);
});
test("scene blocks are chronological and grouped by situation", () => {
  const blocks = sceneBlocks(folder(), selectRecords(folder(), ["미나", "하루"], { minGrade: "C" }));
  assert.equal(blocks.length, 2); assert.match(blocks[0], /^\[#3 옥상\] 옥상 \/ 미나: 비밀\(B\) \/ 하루: 침묵\(C\)$/); assert.match(blocks[1], /\[#9 교실\]/);
});
test("pickLore classifies self / related / common", () => {
  const lore = [{ key: "folder:1", mode: "folder", comment: "미나" }, { key: "미나짱", comment: "외모", content: "x", folder: "folder:1" }, { key: "옥상", comment: "장소", content: "미나가 자주 감", alwaysActive: false },
    { key: "", comment: "세계관", content: "w", alwaysActive: true }, { key: "무관", comment: "다른", content: "z" }];
  const r = pickLore(lore, { names: ["미나", "미나짱"] });
  assert.deepEqual(r.map((x) => [x.entry.comment, x.reason, x.checked]), [["외모", "본인", true], ["장소", "관련", true], ["세계관", "공통", false]]);
  assert.equal(copyLore(lore, r).filter((e) => e.mode === "folder").length, 1);
});
test("relation lore: always entry + B-and-above keyword entries", () => {
  const recs = selectRecords(folder(), ["미나"], { minGrade: "D" }).map((r) => ({ ...r, place: "옥상" }));
  const l = relationLore({ relationship: "관계", name: "미나", records: recs });
  assert.equal(l[0].alwaysActive, true); assert.equal(l.length, 3); assert.match(l[1].key, /미나,옥상/);
  assert.equal(relationLore({ relationship: "", name: "미나", records: [], perRecord: false }).length, 0);
});
test("sliceFolder keeps only at <= point and marks carried; sceneAt", () => {
  const s = sliceFolder(folder(), 4);
  assert.deepEqual(s.people["미나"].records.map((r) => r.id), ["a"]); assert.ok(s.people["미나"].records.every((r) => r.carried));
  assert.equal(s.scenes.length, 1); assert.equal(sceneAt(folder(), 5).id, "s1");
  assert.equal(sliceFolder(folder(), 4, { carried: false }).scenes[0].carried, undefined);
});
function mkApi() {
  const m = new Map(); const orig = { id: "t0", name: "원본", message: [{ role: "user", data: "u" }, { role: "char", data: "c", chatId: "x" }], localLore: [] };
  const ch = { chaId: "c1", name: "봇", chats: [orig] };
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => m.delete(k) },
    getCharacterFromIndex: async () => ch, getChatFromIndex: async () => ch.chats[0], setCharacterToIndex: async (_i, v) => { Object.assign(ch, v); },
    runLLMModel: async () => ({ type: "success", result: "새 도입문" }) };
  return { api, ch, orig, snap: JSON.stringify(orig) };
}
class Busy extends Error {}
test("rewind: new chat only, original untouched, memory sliced and copied", async () => {
  const { api, ch, orig, snap } = mkApi(); const store = createMemoryStore(api);
  const first = await draftFirstMessage(api, { name: "봇", scene: folder().scenes[0], model: { mode: "submodel" } }); assert.equal(first, "새 도입문");
  const r = await createRewindChat(api, 0, 0, { at: 4, folder: folder(), store, isGenerating: () => false, Busy, firstMessage: first });
  assert.equal(ch.chats.length, 2); assert.equal(JSON.stringify(ch.chats[0]), snap); assert.strictEqual(ch.chats[0], orig);
  assert.equal(r.chat.message.length, 1); assert.equal(r.chat.message[0].data, "새 도입문");
  const f = await store.getFolder("c1", String(r.chat.id));
  assert.deepEqual(f.people["미나"].records.map((x) => x.id), ["a"]); assert.ok(f.cursor);
  assert.equal(r.chat.name, "회귀 · 옥상 #5");
});
test("rewind: optional message copy, and blocked while generating", async () => {
  const { api, ch } = mkApi(); const store = createMemoryStore(api);
  const r = await createRewindChat(api, 0, 0, { at: 1, folder: folder(), store, isGenerating: () => false, Busy, copyMessages: true });
  assert.equal(r.chat.message.length, 2); assert.notStrictEqual(r.chat.message[0], ch.chats[0].message[0]);
  await assert.rejects(createRewindChat(api, 0, 0, { at: 1, folder: folder(), store, isGenerating: () => true, Busy }), Busy);
  assert.equal(ch.chats.length, 2);
});
test("draftFirstMessage falls back to the scene summary on AI failure", async () => {
  const { api } = mkApi(); api.runLLMModel = async () => { throw new Error("x"); };
  assert.equal(await draftFirstMessage(api, { name: "봇", scene: { sum: "요약", facts: ["사실"] } }), "요약\n사실");
});
