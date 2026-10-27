import test from "node:test";
import assert from "node:assert/strict";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { emptyFolder } from "../src/data/memorystore.js";
import { validate } from "../src/engine/memoryprompt.js";
import { recallFor, mergeMemory, pickPeople, unknownFor, keywordBoost } from "../src/engine/recall.js";
import { appendDuskSection, splitDusk, checkDusk, SECTION_MARK } from "../src/engine/duskwriter.js";
import { buildBlock } from "../src/engine/memoryinject.js";

// 블루 아카이브 예제: 샬레 사무실에서 유우카가 선생님의 예산 문제를 알게 되고, 호시노는 그 사실을 모른다.
function folder() {
  const f = emptyFolder("ba", "chat1", { botName: "샬레", chatName: "예산 회의" });
  const turn = (at, obj) => applyAnalysis(f, validate(obj), { at, mid: "m" + at, h: "h" + at }, {});
  turn(1, { people: [
    { name: "유우카", act: "선생님의 예산 장부 누락을 발견하고 조용히 덮어 줌", p: 3, s: 3, r: 2, know: ["유우카", "선생님"] },
    { name: "호시노", act: "옥상에서 낮잠을 자며 선생님을 기다림", p: 1, s: 1, r: 1 }
  ], scene: { sum: "샬레 사무실, 예산 회의", facts: ["장부 누락"], place: "샬레", who: ["유우카", "선생님", "호시노"], changed: true },
    rel: [{ from: "유우카", to: "선생님", d: "신뢰가 깊어짐", dir: "+" }], open: { add: [{ text: "유우카가 덮은 장부 누락의 진짜 원인", kind: "question", who: ["유우카"] }], close: [] } });
  turn(3, { people: [{ name: "유우카", act: "호시노에게는 장부 이야기를 하지 않기로 함", p: 2, s: 1, r: 1 }], scene: null });
  return f;
}

test("pickPeople: 이름·별칭으로만 고르고 이름이 없으면 비어 있음", () => {
  const f = folder();
  assert.deepEqual(pickPeople(f, ["유우카"]).map((p) => p.name), ["유우카"]);
  assert.deepEqual(pickPeople(f, ["  유 우카 "]).map((p) => p.name), ["유우카"]);
  assert.deepEqual(pickPeople(f, []), []);
  assert.deepEqual(pickPeople(f, ["아로나"]), []);
});

test("recallFor: 고른 인물만 회상하고 등급·열린 항목·관계를 담음", () => {
  const f = folder();
  const r = recallFor(f, { names: ["유우카"], query: "예산 장부", messageCount: 6 });
  assert.equal(r.people.join(), "유우카");
  assert.ok(r.items.every((i) => i.source === "dusk"));
  const text = r.items.map((i) => i.text).join("\n");
  assert.match(text, /유우카: .*Key moments: .*장부/);
  assert.match(text, /Open: \[의문\]|Open: \[question\]|Open:/);
  assert.match(text, /Relationship shifts: 유우카 → 선생님/);
  assert.doesNotMatch(text, /낮잠/, "고르지 않은 인물의 기록은 들어가지 않는다");
  assert.ok(r.tokens > 0 && r.recordIds.length > 0);
});

test("지식 경계: 호시노는 유우카의 비밀(know에 없는 사람)을 모른다고 적힘", () => {
  const f = folder();
  const hoshino = pickPeople(f, ["호시노"])[0];
  assert.match(unknownFor(f, hoshino).join("|"), /장부 누락/);
  const r = recallFor(f, { names: ["호시노"], messageCount: 6 });
  assert.match(r.items[0].text, /Does NOT know: .*장부 누락/);
  // 아는 사람(선생님은 know에 있지만 기록된 인물이 아니라 영향 없음), 유우카 본인은 모른다고 적히지 않는다
  const yuuka = recallFor(f, { names: ["유우카"], messageCount: 6 });
  assert.doesNotMatch(yuuka.items[0].text, /Does NOT know/);
});

test("키워드 일치가 점수를 올려 비슷한 등급 기록 중 질의에 맞는 것이 앞섬", () => {
  assert.equal(keywordBoost("예산 장부 누락", []), 1);
  assert.ok(keywordBoost("예산 장부 누락", ["예산", "장부"]) > keywordBoost("낮잠", ["예산", "장부"]));
  const f = folder();
  const a = recallFor(f, { names: ["유우카"], query: "호시노 장부 이야기", messageCount: 6, settings: { perPerson: 1 } });
  assert.match(a.items[0].text, /Key moments: \(\w\) 호시노에게는 장부 이야기를 하지 않기로 함|Key moments: \(\w\) 선생님의 예산 장부/);
});

test("예산이 모자라면 잘라 넣지 않고 통째로 뺌", () => {
  const f = folder();
  const none = recallFor(f, { names: ["유우카", "호시노"], messageCount: 6, settings: { tokens: 5 } });
  assert.deepEqual(none.items, []);
  const some = recallFor(f, { names: ["유우카", "호시노"], messageCount: 6, settings: { tokens: 2000 } });
  assert.ok(some.items.length >= 2);
});

test("폴더가 없거나 고른 인물이 없으면 아무것도 합치지 않음", () => {
  assert.deepEqual(recallFor(null, { names: ["유우카"] }).items, []);
  const base = { items: [{ source: "hypa", text: "a" }], counts: { hypa: 1, hypaplus: 0 }, characters: 1 };
  assert.equal(mergeMemory(base, recallFor(folder(), { names: ["아로나"] })), base);
});

test("mergeMemory: 기존 참고는 그대로 두고 dusk 항목과 개수만 더함", () => {
  const base = { items: [{ source: "hypa", text: "요약" }], counts: { hypa: 1, hypaplus: 0 }, characters: 2 };
  const r = recallFor(folder(), { names: ["유우카"], messageCount: 6 });
  const m = mergeMemory(base, r);
  assert.equal(m.items[0].source, "hypa");
  assert.equal(m.items.length, 1 + r.items.length);
  assert.deepEqual(m.counts, { hypa: 1, hypaplus: 0, dusk: r.items.length });
  assert.equal(base.items.length, 1, "원본은 바뀌지 않음");
  assert.deepEqual(mergeMemory(undefined, { items: [] }), { items: [], counts: { hypa: 0, hypaplus: 0 }, characters: 0 });
});

test("buildBlock focus: 장면에 없어도 고른 인물이 [Dusk Memory]에 들어감", () => {
  const f = folder();
  f.scenes.at(-1).who = ["선생님"];
  const without = buildBlock(f, { messageCount: 20, recentText: "", settings: {} });
  const withFocus = buildBlock(f, { messageCount: 20, recentText: "", settings: {}, focus: ["유우카"] });
  assert.doesNotMatch(without.text, /- 유우카:/);
  assert.match(withFocus.text, /- 유우카:/);
});

test("duskwriter: 구획을 붙이고 응답에서 떼어 내며, 리수폿 쪽 JSON엔 dusk 키가 없음", () => {
  const input = { bot: "샬레", known: [], ignore: [], previousScene: null, openItems: [], recent: [], newest: { index: 3, text: "..." } };
  const sent = appendDuskSection("# Writer prompt", input);
  assert.ok(sent.startsWith("# Writer prompt") && sent.includes(SECTION_MARK) && sent.includes('"newest"'));
  const raw = '```json\n' + JSON.stringify({ schema_version: 1, request_ref: "req:1", documents: [], dusk: { people: [{ name: "유우카", act: "장부를 덮음", p: 2, s: 2, r: 1 }] } }) + '\n```';
  const { raw: rest, dusk } = splitDusk(raw);
  assert.equal(JSON.parse(rest).dusk, undefined);
  assert.equal(JSON.parse(rest).request_ref, "req:1");
  const ok = checkDusk(dusk, { ignore: [] });
  assert.equal(ok.people[0].name, "유우카");
  assert.equal(ok.people[0].p, 2);
});

test("duskwriter: dusk가 없거나 해석 불가·잘못된 모양이면 원문 그대로, 검증은 null", () => {
  assert.deepEqual(splitDusk('{"a":1}'), { raw: '{"a":1}', dusk: null });
  assert.deepEqual(splitDusk("not json"), { raw: "not json", dusk: null });
  assert.equal(checkDusk(null), null);
  assert.equal(checkDusk([1]), null);
  assert.deepEqual(checkDusk({}, {}).people, [], "빈 구획 {}은 '기록할 것 없음'으로 유효");
  assert.equal(checkDusk({ people: [{ name: "유우카", act: "x", p: 9, s: -3, r: 1 }] }).people[0].p, 3, "축 값은 서버에서 자름");
  assert.equal(checkDusk({ people: [{ name: "무시", act: "x" }] }, { ignore: ["무시"] }).people.length, 0);
});
