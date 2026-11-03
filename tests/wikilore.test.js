import test from "node:test";
import assert from "node:assert/strict";
import { wikiLoreText, wikiLoreEntry, wikiLoreCandidates, upsertWikiLore, existingWikiMarks, WIKI_LORE_MARK } from "../src/engine/wikilore.js";

const sec = (heading, body, slotId) => ({ id: "s" + Math.random(), heading, body, provenance: slotId ? { slotId } : undefined });
const doc = (title, sections = [], extra = {}) => ({ id: "d_" + title, type: "Character", title, aliases: [], sections, ...extra });

test("위키 정리 글: 기본 성격과 문서 구획만 넣고, 기록·수치는 넣지 않는다", () => {
  const d = doc("시로코", [sec("기본정보", "아비도스 학생. 말수가 적다.", "core.identity"), sec("대상별 말투", "선생님께는 존댓말.", "core.speech")]);
  const t = wikiLoreText(d, { summary: "차분한 학생", coreTraits: ["성실함", "조심스러움"] });
  assert.match(t, /^\[인물 정보: 시로코\]/); assert.match(t, /요약: 차분한 학생/); assert.match(t, /기질: 성실함, 조심스러움/);
  assert.match(t, /■ 인물 개요\n아비도스 학생/); assert.match(t, /■ 대상별 말투\n선생님께는 존댓말/);
});
test("비밀·성적 태도·불륜 의심 구획은 기본으로 뺀다. 내용이 없으면 항목을 만들지 않는다", () => {
  const d = doc("호시노", [sec("비밀", "숨기는 것", "perception.secret"), sec("성적 태도", "x", "openness.attitude.qualitative")]);
  assert.equal(wikiLoreText(d, null), ""); assert.equal(wikiLoreEntry(d, null), null);
  assert.doesNotMatch(wikiLoreText(doc("A", [sec("기본정보", "ok", "core.identity"), sec("비밀", "숨김", "perception.secret")]), null), /숨김/);
});
test("길이 제한: 구획 단위로 자르고 표시한다", () => {
  const d = doc("긴이", [sec("기본정보", "가".repeat(300), "core.identity"), sec("대상별 말투", "나".repeat(300), "core.speech")]);
  const t = wikiLoreText(d, null, { maxChars: 400 });
  assert.ok(t.length <= 460); assert.match(t, /일부만/); assert.doesNotMatch(t, /나{50}/);
});
test("로어북 항목: 키는 이름·별칭, 항상 켜짐 아님, 표식 포함", () => {
  const e = wikiLoreEntry(doc("시로코", [sec("기본정보", "x", "core.identity")], { aliases: ["시로", "시로코"] }), null);
  assert.equal(e.key, "시로코, 시로"); assert.equal(e.alwaysActive, false); assert.equal(e.mode, "normal"); assert.equal(e.extentions[WIKI_LORE_MARK], "시로코");
});
test("내보낼 후보: 정리 정보가 있는 인물 문서만", () => {
  const wiki = { documents: { a: { ...doc("A", [sec("기본정보", "ok", "core.identity")]), id: "a" }, b: { ...doc("B", []), id: "b" }, c: { id: "c", type: "Place", title: "C", sections: [sec("x", "y")] } }, people: { profiles: { b: { summary: "요약만 있음" } } } };
  assert.deepEqual(wikiLoreCandidates(wiki).map((x) => x.name).sort(), ["A", "B"]);
});
test("봇 로어북에 넣기는 멱등이고 다른 항목·내가 고친 키는 건드리지 않는다", () => {
  const mine = { key: "내항목", content: "x", comment: "내 것" };
  const e1 = wikiLoreEntry(doc("시로코", [sec("기본정보", "첫 글", "core.identity")]), null);
  let r = upsertWikiLore([mine], [e1]);
  assert.equal(r.added, 1); assert.equal(r.list.length, 2); assert.equal(r.list[0], mine);
  const again = upsertWikiLore(r.list, [e1]); assert.deepEqual([again.added, again.updated, again.unchanged], [0, 0, 1]);
  const edited = r.list.map((x) => (x.extentions?.[WIKI_LORE_MARK] ? { ...x, key: "내가 고친 키" } : x));
  const e2 = wikiLoreEntry(doc("시로코", [sec("기본정보", "바뀐 글", "core.identity")]), null);
  const up = upsertWikiLore(edited, [e2]); assert.equal(up.updated, 1); assert.equal(up.list.length, 2);
  assert.equal(up.list[1].key, "내가 고친 키"); assert.match(up.list[1].content, /바뀐 글/);
  assert.deepEqual([...existingWikiMarks(up.list)], ["시로코"]);
  assert.equal(r.list.length, 2, "원본 배열은 바뀌지 않는다");
});
