import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseWiki } from "../src/engine/wikihealth.js";
const d = (id, title, extra = {}) => ({ id, type: "Character", title, aliases: [], sections: [{}], metrics: [], links: [], ...extra });
const f = (docs, people = {}) => ({ people, wiki: { documents: Object.fromEntries(docs.map((x) => [x.id, x])) } });
test("위키 점검: 중복·빈 문서·끊어진 연결·이어지지 않은 문서를 센다", () => {
  const r = diagnoseWiki(f([d("a", "미도리"), d("b", "미도리"), d("c", "하루", { sections: [] }), d("e", "유즈", { links: ["a", "없는문서"] })], { 유즈: { name: "유즈", aliases: [], records: [] } }));
  assert.deepEqual(r.duplicates, [{ name: "미도리", count: 2 }]);
  assert.deepEqual(r.empty, ["하루"]);
  assert.deepEqual(r.broken, ["유즈 → 없는문서"]);
  assert.ok(r.unlinked.includes("미도리") && !r.unlinked.includes("유즈"));
  assert.equal(r.ok, false);
});
test("위키 점검: 문제가 없으면 ok", () => {
  assert.equal(diagnoseWiki(f([d("a", "미도리"), d("b", "하루")])).ok, true);
});
