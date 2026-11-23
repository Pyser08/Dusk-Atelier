// 11-23 버그: 성적인 장면에서 성인 줄이 12개를 넘으면 뒤쪽 act(관계 횟수) 줄이 버려졌다
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nsfwFrom } from "../src/engine/recorder.js";

test("성인 줄이 많아도 act 줄을 버리지 않는다", () => {
  const known = [{ name: "하나" }, { name: "두리" }];
  const lines = [];
  for (let i = 0; i < 14; i++) lines.push(`gauge|${i % 2 ? "하나" : "두리"}|lust|+3|"아"`);
  lines.push("act|하나|{{user}}|sex|정상위");
  const out = nsfwFrom(lines.join("\n"), known);
  assert.ok(out.some((r) => r.kind === "act" && r.act === "sex"), "act 줄이 남아야 함");
});

test("기록 큐가 성인 줄을 넣을 때 앞서 넣은 정액·흔적 줄을 잘라내지 않는다", () => {
  const src = fs.readFileSync(new URL("../src/data/memoryturn.js", import.meta.url), "utf8");
  assert.ok(!/nsfwQueue\.length > 40/.test(src), "합계 40개 자르기가 남아 있음");
});

test("hotQuote: 성적인 첫 문장을 그대로 인용", async () => {
  const { hotQuote } = await import("../src/engine/recorder.js");
  assert.equal(hotQuote("날이 맑았다. 둘은 밤새 섹스를 했다. 아침이 왔다."), "둘은 밤새 섹스를 했다.");
  assert.equal(hotQuote("평범한 하루."), "");
});
