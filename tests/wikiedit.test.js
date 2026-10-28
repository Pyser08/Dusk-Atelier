import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { createBlankPerson, editDocMeta, removePerson, ensureProfile, editProfile, addMetric, listOf } from "../src/engine/wikiedit.js";
import { setPin } from "../src/engine/personedit.js";

const base = () => createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" });
const one = (s) => Object.values(s.documents)[0];

test("빈 인물: 만들어지고 같은 이름은 거절한다", () => {
  const s = createBlankPerson(base(), "한연희");
  assert.equal(one(s).title, "한연희"); assert.equal(one(s).type, "Character");
  assert.throws(() => createBlankPerson(s, " 한연희 "), /이미/);
  assert.throws(() => createBlankPerson(s, "  "), /이름/);
});
test("문서 관리: 이름·별칭·태그·연결 문서가 바뀌고 절·수치는 남는다", () => {
  let s = createBlankPerson(base(), "A"); const id = one(s).id;
  s = editDocMeta(s, id, { title: "A2", aliases: listOf("에이, 에이쨩"), tags: listOf("#회사, 선배"), links: [] });
  const d = s.documents[id]; assert.equal(d.title, "A2"); assert.deepEqual(d.aliases, ["에이", "에이쨩"]); assert.deepEqual(d.tags, ["회사", "선배"]);
  assert.throws(() => editDocMeta(s, id, { title: "" }), /이름/);
});
test("기본 성격: 빈 프로필을 만들고 글·축을 고친다", () => {
  let s = createBlankPerson(base(), "A"); const id = one(s).id;
  s = ensureProfile(s, id); assert.ok(s.people.profiles[id]);
  s = editProfile(s, id, { summary: "단정함", coreTraits: ["현실적"], axes: { guardedness: 70 } });
  const p = s.people.profiles[id]; assert.equal(p.summary, "단정함"); assert.deepEqual(p.coreTraits, ["현실적"]); assert.equal(p.axes.guardedness, 70); assert.equal(p.axes.impulsivity, 50);
  assert.strictEqual(ensureProfile(s, id), s);
});
test("기본 성격: 고정한 칸은 직접 고쳐도 지켜진다", () => {
  let s = createBlankPerson(base(), "A"); const id = one(s).id; s = ensureProfile(s, id);
  s = editProfile(s, id, { summary: "처음" }); s = setPin(s, id, "summary", true);
  s = editProfile(s, id, { summary: "바꿈", values: ["성실"] });
  assert.equal(s.people.profiles[id].summary, "처음"); assert.deepEqual(s.people.profiles[id].values, ["성실"]);
});
test("인물 삭제: 프로필과 문서가 함께 사라진다", () => {
  let s = createBlankPerson(base(), "A"); const id = one(s).id; s = ensureProfile(s, id);
  s = removePerson(s, id); assert.equal(Object.keys(s.documents).length, 0); assert.ok(!s.people?.profiles?.[id]);
});
test("수치 새로 지정: 음란도·호감도·첫인상이 들어가고, 중복은 거절한다", async () => {
  const { readFileSync } = await import("node:fs");
  const pol = JSON.parse(JSON.parse(readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8")).base.policies).policies;
  let s = createBlankPerson(base(), "A"); const id = one(s).id;
  s = addMetric(s, id, { slotId: "openness.score", targetRefs: [], value: 0, reason: "" }, pol["openness.score"]);
  s = addMetric(s, id, { slotId: "affinity.score", targetRefs: ["actor:user"], value: 0, reason: "" }, pol["affinity.score"]);
  assert.equal(one(s).metrics.length, 2);
  assert.throws(() => addMetric(s, id, { slotId: "openness.score", targetRefs: [], value: 0, reason: "" }, pol["openness.score"]));
});
