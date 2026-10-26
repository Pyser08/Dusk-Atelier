import test from "node:test";
import assert from "node:assert/strict";
import { parseJson, validate, buildMessages, analyze } from "../src/engine/memoryprompt.js";

test("parseJson strips fences and surrounding text", () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Sure! {"a":{"b":2}} done'), { a: { b: 2 } });
});
test("parseJson throws on broken JSON", () => {
  assert.throws(() => parseJson("no json"));
  assert.throws(() => parseJson('{"a":'));
});
test("validate truncates, clamps, filters ignore", () => {
  const v = validate({ people: [{ name: "미나", act: "가".repeat(200), p: 9, s: -1, r: "2", extra: 1 }, { name: "Skip Me", act: "x", p: 3 }], scene: { sum: "요약", facts: ["a","b","c","d"], changed: true } }, { ignore: ["skipme"] });
  assert.equal(v.people.length, 1);
  assert.equal(v.people[0].act.length, 80);
  assert.deepEqual([v.people[0].p, v.people[0].s, v.people[0].r], [3, 0, 2]);
  assert.equal(v.people[0].extra, undefined);
  assert.equal(v.scene.facts.length, 3);
  assert.equal(validate({ people: "x", scene: 3 }).people.length, 0);
});
test("buildMessages limits recent to 4000 chars from the end and newest to 6000", () => {
  const recent = ["a".repeat(3000), "b".repeat(3000), "c".repeat(500)];
  const m = buildMessages({ bot: "B", recent, newest: { index: 3, text: "z".repeat(9000) } });
  const p = JSON.parse(m[1].content);
  assert.equal(p.recent.at(-1).startsWith("c"), true);
  assert.ok(!p.recent.some((r) => r.startsWith("a")));
  assert.equal(p.newest.text.length, 6000);
});
test("analyze retries once on bad JSON", async () => {
  let n = 0;
  const call = async () => (++n === 1 ? "oops" : '{"people":[{"name":"A","act":"x","p":2,"s":1,"r":1}],"scene":null}');
  const r = await analyze(call, { bot: "b", newest: { index: 1, text: "t" } });
  assert.equal(n, 2); assert.equal(r.people.length, 1);
  await assert.rejects(analyze(async () => "bad", { bot: "b", newest: { index: 1, text: "t" } }));
});
