import test from "node:test";
import assert from "node:assert/strict";
import { setTag } from "../src/engine/memoryemo.js";
import { pairView } from "../src/engine/memoryhuman.js";
const doc = { id: "a", type: "Character", title: "텐도 아리스", aliases: ["아리스"], sections: [], metrics: [] };
const mk = () => ({ people: {}, wiki: { documents: { a: doc } }, scenes: [], cursor: { at: 10 }, emo: { "아리스>{{user}}": { from: "아리스", to: "{{user}}", tags: { hostility: 8 }, log: [{ t: { hostility: 8 }, at: 10, why: "x" }], pend: { hostility: 1 } } } });
test("신고 #4: 별칭으로 저장된 감정을 고치면 화면에 보이는 칸이 바뀐다", () => {
  const f = mk(), fv = pairView(f, ["텐도 아리스", "아리스"], "{{user}}").feel.ab;
  setTag(f, "텐도 아리스", "{{user}}", "hostility", 2, 1, fv.keys);
  assert.equal(pairView(f, ["텐도 아리스", "아리스"], "{{user}}").feel.ab.tags.hostility, 2);
  assert.deepEqual(Object.keys(f.emo), ["아리스>{{user}}"]);
  assert.equal(f.emo["아리스>{{user}}"].pend.hostility, undefined);
});
test("신고 #4: 이미 두 칸으로 갈라졌으면 둘 다 고치고, 비우기도 된다", () => {
  const f = mk(); setTag(f, "텐도 아리스", "{{user}}", "hostility", 1);
  const keys = pairView(f, ["텐도 아리스"], "{{user}}").feel.ab.keys; assert.equal(keys.length, 2);
  setTag(f, "텐도 아리스", "{{user}}", "hostility", 5, 2, keys);
  assert.deepEqual(Object.values(f.emo).map((p) => p.tags.hostility), [5, 5]);
  setTag(f, "텐도 아리스", "{{user}}", "hostility", null, 3, keys);
  assert.equal(pairView(f, ["텐도 아리스"], "{{user}}").feel.ab.tags.hostility, undefined);
});
test("신고 #4: 식은 적대감을 원래 값으로 다시 정하면 그 값으로 보인다", () => {
  const f = mk(); f.cursor.at = 200;
  const fv = pairView(f, ["텐도 아리스"], "{{user}}").feel.ab; assert.ok(fv.tags.hostility < 8);
  setTag(f, "텐도 아리스", "{{user}}", "hostility", 8, 2, fv.keys);
  assert.equal(pairView(f, ["텐도 아리스"], "{{user}}").feel.ab.tags.hostility, 8);
});
