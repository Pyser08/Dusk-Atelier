import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";
import { mergeEntries, planEntryMerge, applyEntryMerge } from "../src/engine/peoplemerge.js";

const doc = (s, title, aliases = []) => createWikiDocument(s, { type: "Character", title, aliases, sections: [] });
const person = (name, aliases = [], n = 1) => ({ name, aliases, pinned: false, records: Array.from({ length: n }, (_, i) => ({ id: name + i, act: name + " 행동" + i, at: i, g: "B" })) });
const scopeOf = (...titles) => titles.reduce((s, t) => doc(s, ...(Array.isArray(t) ? t : [t])), createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" }));
const titles = (f) => Object.values(f.wiki.documents).map((d) => d.title);

test("이전 합치기로 Dusk 인물만 합쳐져 남은 위키 문서도 합치기 대상에 나온다", () => {
  // 시로코 인물(별칭에 스나시로코) → findDoc은 '시로코' 문서만 잡고, '스나시로코' 문서는 짝 없는 중복으로 남는다
  const folder = { people: { 시로코: person("시로코", ["스나시로코"]) }, wiki: scopeOf("시로코", "스나시로코") };
  const entries = mergeEntries(folder);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((e) => e.name).sort(), ["스나시로코", "시로코"]);
  assert.ok(entries.every((e) => e.docId));
});
test("위키 문서끼리만 합쳐도 Dusk 인물은 남는 쪽 별칭으로 흡수된다", () => {
  const folder = { people: { 시로코: person("시로코", ["스나시로코"]) }, wiki: scopeOf("시로코", "스나시로코") };
  const es = mergeEntries(folder), keep = es.find((e) => e.name === "시로코"), src = es.find((e) => e.name === "스나시로코");
  const plan = planEntryMerge(folder, keep, src);
  applyEntryMerge(folder, keep, src, plan, {});
  assert.deepEqual(titles(folder), ["시로코"]);
  assert.ok(Object.values(folder.wiki.documents)[0].aliases.includes("스나시로코"));
  assert.equal(mergeEntries(folder).length, 1);
});
test("두 Dusk 인물이 같은 위키 문서를 가리켜도 합칠 수 있다 (같은 문서 오류 없음)", () => {
  const folder = { people: { 시로코: person("시로코", [], 2), 스나: person("스나", ["시로코"], 1) }, wiki: scopeOf("시로코") };
  const es = mergeEntries(folder), a = es.find((e) => e.pk === "시로코"), b = es.find((e) => e.pk === "스나");
  const plan = planEntryMerge(folder, a, b);
  assert.equal(plan, null);
  applyEntryMerge(folder, a, b, plan, {});
  assert.deepEqual(Object.keys(folder.people), ["시로코"]);
  assert.equal(folder.people.시로코.records.length, 3);
  assert.deepEqual(titles(folder), ["시로코"]);
});
test("문서 없는 인물을 문서에 합치면 인물이 문서와 이어진다", () => {
  const folder = { people: { 호시노: person("호시노"), 오지상: person("오지상", [], 2) }, wiki: scopeOf("호시노") };
  const es = mergeEntries(folder), keep = es.find((e) => e.pk === "호시노"), src = es.find((e) => e.pk === "오지상");
  applyEntryMerge(folder, keep, src, planEntryMerge(folder, keep, src), {});
  assert.deepEqual(Object.keys(folder.people), ["호시노"]);
  assert.equal(folder.people.호시노.records.length, 3);
  assert.ok(folder.people.호시노.aliases.includes("오지상"));
});
test("남길 쪽이 위키 문서뿐이면 합칠 인물이 문서로 이어진다", () => {
  const folder = { people: { 오지상: person("오지상", [], 2) }, wiki: scopeOf("호시노", "오지상") };
  const es = mergeEntries(folder);
  const keep = es.find((e) => e.name === "호시노"), src = es.find((e) => e.pk === "오지상");
  applyEntryMerge(folder, keep, src, planEntryMerge(folder, keep, src), {});
  assert.deepEqual(titles(folder), ["호시노"]);
  assert.ok(folder.people.오지상.aliases.includes("호시노"));  // 인물이 남은 문서와 이어짐
  assert.equal(mergeEntries(folder).length, 1);
});
test("같은 항목끼리는 합칠 수 없다", () => {
  const folder = { people: { a: person("a") }, wiki: scopeOf("a") };
  const [e] = mergeEntries(folder);
  assert.throws(() => planEntryMerge(folder, e, e), /서로 다른/);
});

import { createBlankPerson } from "../src/engine/wikiedit.js";
test("빈 인물 추가: 다른 문서의 별칭과 같은 이름도 중복으로 막는다", () => {
  const s = scopeOf(["시로코", ["스나시로코"]]);
  assert.throws(() => createBlankPerson(s, "스나시로코"), /이미 있어요/);
  assert.doesNotThrow(() => createBlankPerson(s, "호시노"));
});
