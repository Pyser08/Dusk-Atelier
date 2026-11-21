// 인간다움 2단계: 공통 편집 — 목록 고치기·추가·지우기·되돌리기와 무시 목록(지운 항목을 기록기가 바로 다시 만들지 않게)
import test from "node:test";
import assert from "node:assert/strict";
import { ignoreKeyOf, addIgnore, dropIgnore, isIgnored, filterIgnored, editAt, addTo, removeAt, findSame } from "../src/engine/memedit.js";
import { applyExtra, extraOf } from "../src/engine/memextra.js";

test("무시 키: 종류별로 같은 항목이면 같은 키(공백·대소문자 무시)", () => {
  assert.equal(ignoreKeyOf({ kind: "told", from: "카엘", to: "미나", info: "왕녀 비밀" }), ignoreKeyOf({ kind: "told", from: " 카엘", to: "미나", info: "왕녀  비밀" }));
  assert.notEqual(ignoreKeyOf({ kind: "mark", name: "미나", part: "목", desc: "키스마크" }), ignoreKeyOf({ kind: "mark", name: "미나", part: "손목", desc: "키스마크" }));
  assert.equal(ignoreKeyOf({ kind: "status", name: "미나", effect: "감기" }), "status|미나|감기");
  assert.equal(ignoreKeyOf({ kind: "goal", name: "카엘", goal: "기사단장 되기" }), "goal|카엘|기사단장되기");
  assert.equal(ignoreKeyOf({ kind: "weather", w: "비" }), null);   // 무시 대상이 아닌 종류
});

test("무시 목록: 넣고·확인·빼기, 정한 턴이 지나면 풀림", () => {
  const f = {};
  addIgnore(f, "status|미나|감기", { turn: 5, ttl: 10 });
  addIgnore(f, "told|카엘|미나|왕녀비밀", { turn: 5 });
  assert.ok(isIgnored(f, "status|미나|감기", 14));
  assert.ok(!isIgnored(f, "status|미나|감기", 15));
  assert.ok(isIgnored(f, "told|카엘|미나|왕녀비밀", 999));   // ttl 없으면 계속
  dropIgnore(f, "told|카엘|미나|왕녀비밀");
  assert.ok(!isIgnored(f, "told|카엘|미나|왕녀비밀", 6));
  for (let i = 0; i < 400; i++) addIgnore(f, `told|a|b|${i}`, { turn: 1 });
  assert.ok(f.ignore.length <= 300);   // 한도
});

test("filterIgnored: 무시 목록에 있는 보고만 빠짐", () => {
  const f = {}; addIgnore(f, "mark|미나|목|키스마크", { turn: 0, ttl: 5 });
  const out = filterIgnored(f, [{ kind: "mark", name: "미나", part: "목", desc: "키스마크", days: 3 }, { kind: "mark", name: "미나", part: "어깨", desc: "멍", days: 3 }, { kind: "weather", w: "비" }], 2);
  assert.deepEqual(out.map((r) => r.part ?? r.w), ["어깨", "비"]);
});

test("applyExtra가 지운 소문·흔적을 다시 만들지 않음", () => {
  const f = {}; addIgnore(f, "told|카엘|미나|왕녀비밀", { turn: 0 });
  applyExtra(f, [{ kind: "told", from: "카엘", to: "미나", info: "왕녀 비밀" }, { kind: "told", from: "카엘", to: "시로코", info: "왕녀 비밀" }], { turn: 3 });
  assert.deepEqual(extraOf(f).rumors.map((r) => r.to), ["시로코"]);
});

test("목록 편집: 고치기는 user 표시, 추가·지우기, 원래 항목 찾기", () => {
  const a = [{ part: "목", desc: "키스마크" }, { part: "손목", desc: "멍" }];
  const b = editAt(a, 1, { desc: "긁힌 자국" });
  assert.deepEqual(b[1], { part: "손목", desc: "긁힌 자국", user: true });
  assert.equal(a[1].desc, "멍");   // 원본은 그대로(되돌리기용)
  assert.equal(addTo(a, { part: "등", desc: "멍" }).at(-1).user, true);
  assert.deepEqual(removeAt(a, 0), [{ part: "손목", desc: "멍" }]);
  assert.equal(findSame([{ x: 0 }, ...a], a[1], 1), 2);   // 앞에 항목이 끼어도 같은 걸 찾음
  assert.equal(findSame(a, { part: "없음" }, 0), -1);
});

test("무시 키 확장: 추억·갈등·오해(쌍 순서 무관)·달력", async () => {
  const { filterHuman } = await import("../src/engine/memedit.js");
  assert.equal(ignoreKeyOf({ kind: "bond", a: "미나", b: "카엘", moment: "비 오는 날 우산" }), ignoreKeyOf({ kind: "bond", a: "카엘", b: "미나", moment: "비 오는 날  우산" }));
  assert.equal(ignoreKeyOf({ kind: "rift", a: "카엘", b: "미나", about: "약속 어김" }), "rift|미나+카엘|약속어김");
  assert.equal(ignoreKeyOf({ kind: "belief", who: "미나", thinks: "카엘이 배신함" }), "belief|미나|카엘이배신함");
  assert.equal(ignoreKeyOf({ kind: "plan", md: "3/2", what: "영화" }), "plan|3/2|영화");
  assert.equal(ignoreKeyOf({ kind: "bday", name: "미나" }), "bday|미나");
  const f = {}; addIgnore(f, ignoreKeyOf({ kind: "bond", a: "미나", b: "카엘", moment: "우산" }), { turn: 0 }); addIgnore(f, "belief|미나|카엘이배신함", { turn: 0 });
  const h0 = { talk: [{ from: "a", to: "b", call: "x" }], bond: [{ a: "카엘", b: "미나", moment: "우산" }, { a: "카엘", b: "미나", moment: "별" }], belief: [{ who: "미나", thinks: "카엘이 배신함", truth: "아님" }], rift: [] };
  const out = filterHuman(f, h0, 1);
  assert.deepEqual(out.bond.map((b) => b.moment), ["별"]); assert.equal(out.belief.length, 0); assert.equal(out.talk.length, 1);
  assert.equal(filterHuman({}, h0, 1), h0);   // 무시 목록이 없으면 그대로
});

test("applyExtra가 지운 약속·생일을 다시 만들지 않음", () => {
  const f = {}; addIgnore(f, "plan|3/2|영화", { turn: 0 }); addIgnore(f, "bday|미나", { turn: 0 });
  applyExtra(f, [{ kind: "plan", md: "3/2", what: "영화" }, { kind: "plan", md: "3/5", what: "소풍" }, { kind: "bday", name: "미나", md: "5/1" }], { turn: 2 });
  const c = extraOf(f).cal;
  assert.deepEqual(c.plans.map((p) => p.what), ["소풍"]); assert.equal(Object.keys(c.bday).length, 0);
});
