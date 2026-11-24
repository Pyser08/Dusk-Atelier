// 11-24: TS 인물 월경 · 성별 변화 줄 · 나의 성적 욕망/이상성향 · 궁합 null
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cycleFrom, nsfwFrom } from "../src/engine/recorder.js";
import { cycleByGender, cyclePaused } from "../src/engine/cyclegender.js";
import { addUserAdult, delUserAdult, lockUserAdult, rerollUserAdult, userAdultList, userAdultProfile } from "../src/engine/useradult.js";
import { applyLifeTurn } from "../src/data/nsfwturn.js";
const known = [{ name: "하루" }];
const doc = { id: "a", type: "Character", title: "하루", aliases: [], sections: [] };
const F = (g, by = "story") => ({ wiki: { documents: { a: doc } }, gender: g ? { a: { g, by } } : {} });

test("성별 변화 줄을 관계로 읽지 않고, 관계 줄을 성별 변화로 읽지 않는다", () => {
  assert.deepEqual(cycleFrom('sex|하루|f|"몸이 여자가 되었다"', known), []);
  assert.equal(nsfwFrom('sex|하루|f|"몸이 여자가 되었다"', known)[0].g, "f");
  assert.equal(nsfwFrom("sex|하루|남자|none", known).length, 0);
  assert.equal(cycleFrom("sex|하루|남자|none", known)[0].sex.length, 1);
});
test("남자로 시작해 여자가 된 인물은 여성 줄에 없어도 주기를 시작하고, 남자로 돌아가면 빠진다", () => {
  const s = { scene: ["하루", "{{user}}"] };
  assert.equal(cycleByGender([], { folder: F("m"), ...s, changes: [{ kind: "sex", name: "하루", g: "f" }] }).reports[0].name, "하루", "바뀐 그 응답부터");
  assert.equal(cycleByGender([], { folder: F("f"), ...s }).reports.length, 1);
  assert.equal(cycleByGender([], { folder: F(null), ...s }).reports.length, 0, "모르면 그대로");
  assert.equal(cycleByGender([{ name: "하루", sex: [] }], { folder: F("f"), ...s }).reports.length, 1, "겹치지 않음");
  assert.equal(cycleByGender([{ name: "하루", sex: [] }], { folder: F("m"), ...s }).reports.length, 0);
  assert.equal(cycleByGender([{ name: "하루", sex: [], known: true }], { folder: F("m"), ...s }).reports.length, 1, "임신 소식은 남긴다");
  assert.equal(cycleByGender([], { folder: F("m", "user"), ...s, changes: [{ kind: "sex", name: "하루", g: "f" }] }).reports.length, 0, "직접 잠근 성별 우선");
  assert.equal(cyclePaused(F("m"), doc), true); assert.equal(cyclePaused(F("m"), doc, { conception: "2026-01-01" }), false); assert.equal(cyclePaused(F("f"), doc), false);
});
test("나의 성적 욕망·이상성향: 추가·잠금·지우기·무작위", () => {
  const f = {}; assert.ok(addUserAdult(f, "paraphilia", "향기에 끌린다")); assert.equal(addUserAdult(f, "paraphilia", "향기에 끌린다"), false);
  const id = userAdultList(f)[0].id; lockUserAdult(f, id); delUserAdult(f, id); assert.equal(userAdultList(f).length, 1);
  rerollUserAdult(f, "나", { on: true }); const a = userAdultList(f).length; rerollUserAdult(f, "나", { on: true });
  assert.ok(a >= 3 && userAdultList(f).some((x) => x.id === id)); assert.equal(new Set(userAdultList(f).map((x) => x.id)).size, userAdultList(f).length);
  assert.match(userAdultProfile(f), /이상성향: 향기에/);
  applyLifeTurn({ ...f, wiki: { documents: {} } }, { present: ["{{user}}"], events: [{ kind: "gauge", name: "{{user}}", key: "lust", delta: 5 }], evKey: "x", text: "향기" });
});
test("궁합 카드는 null을 DOM에 넘기지 않는다", () => {
  const s = fs.readFileSync(new URL("../src/ui/screens/memory/extracards.js", import.meta.url), "utf8");
  assert.match(s.slice(s.indexOf("export function compatCard")), /box\.append\(\.\.\.\[[\s\S]*?\]\.filter\(Boolean\)\)/);
});
