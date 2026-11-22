// 11-22 제보: 페르소나 이름이 ‘Jade’면 인물 위키에 jade(나)와 ‘제이드’가 따로 생기고 이야기는 ‘제이드’ 쪽에 쌓였다(합쳐도 다시 갈라짐)
import test from "node:test";
import assert from "node:assert/strict";
import { hangulReadings, userAliasesFor } from "../src/engine/useralias.js";
import { normalizeUserActor } from "../src/engine/pot/user-identity.js";
import { normalizeUserNames } from "../src/engine/memoryuser.js";

test("영문 이름의 한글 읽기 후보", () => {
  for (const [en, ko] of [["Jade", "제이드"], ["Emma", "엠마"], ["Mike", "마이크"], ["Leo", "레오"], ["Rose", "로즈"], ["Alice", "앨리스"], ["Kate", "케이트"], ["Luna", "루나"], ["Ethan", "에단"]])
    assert.ok(hangulReadings(en).includes(ko), `${en} → ${hangulReadings(en).join(",")}`);
  assert.deepEqual(hangulReadings("제이드"), []); assert.ok(hangulReadings("Jade").length <= 6);
});

test("유저 별칭: 한글 읽기 + 합칠 때 배운 이름", () => {
  const a = userAliasesFor(["Jade"], { userAliases: ["제이"] });
  assert.ok(a.includes("제이드") && a.includes("제이") && a.includes("Jade"));
});

test("리수폿 유저 정체(actor:user)에 한글 읽기가 별칭으로 붙음 → 기록기가 ‘제이드’를 유저로 봄", () => {
  const u = normalizeUserActor({ name: "Jade" });
  assert.ok(u.aliases.includes("제이드"), u.aliases.join(","));
});

test("분석 결과의 ‘제이드’가 {{user}}로 모임", () => {
  const r = normalizeUserNames({ people: [{ name: "제이드" }], emo: [{ from: "세라", to: "제이드" }] }, userAliasesFor(["Jade"]));
  assert.equal(r.people[0].name, "{{user}}"); assert.equal(r.emo[0].to, "{{user}}");
});

test("합치기: 유저를 남기고 합친 이름을 유저 별칭으로(어느 쪽을 남기든)", async () => {
  const { duskMerge } = await import("../src/engine/peoplemerge.js");
  const f = { people: { "{{user}}": { name: "{{user}}", records: [{ act: "a", at: 1 }] }, 제이드: { name: "제이드", records: [{ act: "b", at: 2 }] } }, emo: {} };
  duskMerge(f, "제이드", "{{user}}");
  assert.ok(f.people["{{user}}"] && !f.people["제이드"]); assert.ok(f.userAliases.includes("제이드"));
});
