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
