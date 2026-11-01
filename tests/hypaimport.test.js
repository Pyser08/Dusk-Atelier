import test from "node:test";
import assert from "node:assert/strict";
import { parseHypaKey, readHypaNodes, mergeHypaNodes, cut } from "../src/engine/hypaimport.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { emptyFolder } from "../src/data/memorystore.js";

const ev = (id, time, chars, content, extra = {}) => ({ id, type: "event", time, location: "교실", characters: chars, content, dialogues: [{ speaker: "A", text: "사랑해" }], createdAt: 1000 + Number(id), ...extra });
const fa = (id, chars, content, extra = {}) => ({ id, type: "facts", time: "2025-03-02 22:00", characters: chars, content, createdAt: 2000 + Number(id), ...extra });
const state = { chunks: [{ id: "1", nodes: [ev("2", "2025-03-02 21:30 → 22:10", ["민지", "서준"], "민지가 서준에게 비밀을 털어놓았다."), ev("1", "2025-03-01 10:00", ["민지"], "둘은 처음 만났다.", { favorite: true }), fa("3", ["서준"], "서준은 열쇠를 얻었다."), fa("4", [], "인물 없는 사실")] }] };

test("parseHypaKey splits ids and rejects ambiguous keys", () => {
  assert.deepEqual(parseHypaKey("hypaplus_state_abc-1_def-2"), { chaId: "abc-1", chatId: "def-2" });
  assert.equal(parseHypaKey("hypaplus_state_a_b_c"), null);
  assert.equal(parseHypaKey("HypaPlus_settings"), null);
});
test("readHypaNodes accepts state or backup, rejects other shapes", () => {
  assert.equal(readHypaNodes(state).length, 4);
  assert.equal(readHypaNodes(JSON.stringify(state)).length, 4);
  assert.equal(readHypaNodes({ nope: 1 }), null);
  assert.equal(readHypaNodes("{"), null);
});
test("merge: events become scenes + records, facts become records, no-person facts skipped", () => {
  const f = emptyFolder("c", "t"); const r = mergeHypaNodes(f, readHypaNodes(state), { now: 5 });
  assert.deepEqual([r.scenes, r.records, r.people, r.skipped, r.already], [2, 4, 2, 1, 0]);
  assert.deepEqual(f.scenes.map((s) => s.when.slice(0, 10)), ["2025-03-01", "2025-03-02"], "시간순");
  assert.equal(f.scenes[1].iso, "2025-03-02"); assert.ok(f.scenes[1].facts[0].includes("사랑해"));
  const minji = f.people["민지"].records; assert.equal(minji.length, 2);
  const fav = minji.find((x) => x.act.includes("처음")); assert.equal(fav.pin, true); assert.equal(fav.g, "A");
  assert.ok(f.scenes.every((s) => s.legacy && s.at === null && s.h === null));
});
test("merge is idempotent and keeps existing scenes after imported ones", () => {
  const f = emptyFolder("c", "t"); f.scenes.push({ id: "own", sum: "내 장면", at: 3, h: "x", orphan: false });
  mergeHypaNodes(f, readHypaNodes(state)); const again = mergeHypaNodes(f, readHypaNodes(state));
  assert.deepEqual([again.scenes, again.records, again.already], [0, 0, 3]);
  assert.equal(f.scenes.at(-1).id, "own"); assert.equal(f.scenes.length, 3);
  assert.equal(f.people["서준"].records.length, 2);
});
test("imported legacy items survive reconcile untouched", () => {
  const f = emptyFolder("c", "t"); mergeHypaNodes(f, readHypaNodes(state));
  reconcile(f, [{ role: "char", data: "새 응답", chatId: "m1" }]);
  assert.ok(f.scenes.every((s) => !s.orphan)); assert.ok(Object.values(f.people).every((p) => p.records.every((r) => !r.orphan)));
});
test("cut shortens at sentence end when possible", () => {
  const long = "첫 문장이다. ".repeat(60); assert.ok(cut(long, 100).length <= 101);
  assert.equal(cut("짧다", 100), "짧다");
});

import { messageIdentity } from "../src/engine/chattext.js";
const withIds = (ids) => ({ chunks: [{ id: "1", chatIds: ids, nodes: [ev("1", "2025-03-01 10:00", ["민지"], "둘은 처음 만났다."), fa("2", ["민지"], "민지는 열쇠를 얻었다.")] }] });
const msgs = [{ role: "char", data: "첫 응답", chatId: "m0" }, { role: "user", data: "입력", chatId: "m1" }, { role: "char", data: "둘째 응답", chatId: "m2" }];
test("anchors imported items to the chunk's last message found in the open chat", () => {
  const f = emptyFolder("c", "t"); mergeHypaNodes(f, readHypaNodes(withIds(["m0", "m1", "m2"])), { messages: msgs });
  const s = f.scenes[0], r = f.people["민지"].records[0];
  assert.deepEqual([s.at, s.mid, s.h, s.legacy], [2, "m2", messageIdentity(msgs[2]), undefined]);
  assert.deepEqual([r.at, r.mid, r.h], [2, "m2", messageIdentity(msgs[2])]);
});
test("anchored items follow a reroll (become orphan) but legacy ones do not", () => {
  const f = emptyFolder("c", "t"); mergeHypaNodes(f, readHypaNodes(withIds(["m2"])), { messages: msgs });
  reconcile(f, [msgs[0], msgs[1], { role: "char", data: "다시 쓴 응답", chatId: "m2" }]);
  assert.equal(f.scenes[0].orphan, true);
});
test("chunk ids missing from the chat (or the first-message marker) stay legacy", () => {
  const f = emptyFolder("c", "t"); mergeHypaNodes(f, readHypaNodes(withIds(["__hypaplus_first_message__", "gone"])), { messages: msgs });
  assert.equal(f.scenes[0].legacy, true); assert.equal(f.scenes[0].h, null);
  const g = emptyFolder("c", "t"); mergeHypaNodes(g, readHypaNodes(withIds([])), { messages: msgs }); assert.equal(g.scenes[0].legacy, true);
});
test("re-import upgrades earlier legacy items once an anchor is available", () => {
  const f = emptyFolder("c", "t"); const nodes = readHypaNodes(withIds(["m2"]));
  mergeHypaNodes(f, nodes); assert.equal(f.scenes[0].legacy, true);
  const r = mergeHypaNodes(f, nodes, { messages: msgs });
  assert.equal(r.upgraded, 3); assert.equal(r.already, 0, "업그레이드한 것은 '이미 있음'에 세지 않음");
  assert.equal(f.scenes[0].legacy, undefined); assert.equal(f.scenes[0].at, 2); assert.equal(f.people["민지"].records.length, 2);
  assert.equal(mergeHypaNodes(f, nodes, { messages: msgs }).already, 2);
});
