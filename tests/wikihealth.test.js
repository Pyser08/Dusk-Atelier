import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseWiki, linkDocs } from "../src/engine/wikihealth.js";
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

test("신고 #3: 목록에 안 보이는 인물·나의 문서는 이어지지 않은 문서로 세지 않는다", () => {
  const x = f([d("a", "하루"), d("m", "제이드")], { 하루: { name: "하루", aliases: [], records: [] } });
  x.meDoc = { name: "제이드" };
  assert.deepEqual(diagnoseWiki(x, { visible: () => false }).unlinked, []);
});
test("신고 #3: 이어 주기 — 새 인물·기호만 다른 이름은 잇고, 이미 문서가 있는 인물의 것은 건너뛴다", () => {
  const x = f([d("a", "하루"), d("b", "메이(점원)"), d("c", "유즈"), d("e", "꼬마 유즈")], { "메이점원": { name: "메이·점원", aliases: [], records: [{ id: "r" }] }, 유즈: { name: "유즈", aliases: ["꼬마 유즈"], records: [] } });
  assert.deepEqual(diagnoseWiki(x).unlinked, ["하루", "메이(점원)", "꼬마 유즈"]);
  assert.deepEqual(linkDocs(x), { linked: ["하루", "메이(점원)"], skipped: ["꼬마 유즈"] });
  assert.deepEqual(diagnoseWiki(x).unlinked, ["꼬마 유즈"]);
  assert.equal(x.people["메이점원"].records.length, 1);
  assert.deepEqual(linkDocs(x).linked, []);
});
