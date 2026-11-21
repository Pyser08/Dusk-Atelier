import test from "node:test";
import assert from "node:assert/strict";
import { trimWriterInput } from "../src/data/pot/writer-batch.js";
import { WRITER_INPUT_BUDGET_DEFAULT, writerInputBudgetTokens } from "../src/engine/pot/writer-input-budget.js";

test("2.2.28: 기본 입력 예산 48K, 직접 정한 값은 그대로", () => {
  assert.equal(WRITER_INPUT_BUDGET_DEFAULT, 48000);
  assert.equal(writerInputBudgetTokens({}), 48000);
  assert.equal(writerInputBudgetTokens({ writerInputBudgetTokens: 96000 }), 96000);
});

test("2.2.28: 예산을 넘으면 로어북·배경 → 최근 대화 → 현재 응답 앞부분 순서로 줄이고, 더 줄일 게 없으면 null", () => {
  const big = (n) => "가".repeat(n);
  const input = { rpText: big(3000), recentContext: big(8000), seedSources: { "source:seed_a": { kind: "lore", content: big(20000) }, "source:seed_b": { kind: "lore", content: big(4000) } } };
  const a = trimWriterInput(input, 2000);   // 약 9,800자 줄이기 → 로어북만으로 충분
  assert.ok(a.seedSources["source:seed_a"].content.length < 20000, "큰 로어북부터 줄임");
  assert.equal(a.recentContext, input.recentContext, "로어북으로 충분하면 최근 대화는 그대로");
  assert.equal(a.rpText, input.rpText, "현재 응답은 그대로");
  const b = trimWriterInput(input, 6000);   // 로어북을 최소까지 줄여도 모자라면 최근 대화도
  assert.ok(b.recentContext.length < input.recentContext.length && /예산에 맞춰/.test(b.recentContext));
  assert.ok(b.seedSources["source:seed_b"].content.length >= 900, "로어북은 최소한 남김");
  const tiny = { rpText: "짧음", recentContext: "", seedSources: {} };
  assert.equal(trimWriterInput(tiny, 500), null, "줄일 게 없으면 null(그때만 오류)");
  assert.equal(input.seedSources["source:seed_a"].content.length, 20000, "원본은 그대로");
});
test("2.2.28: 그래도 모자라면 마지막에 로어북 자료를 뺌", () => {
  const input = { rpText: "x", recentContext: "", seedSources: { "source:seed_a": { kind: "lore", content: "가".repeat(3000) } } };
  const c = trimWriterInput(input, 5000);
  assert.ok(!c.seedSources["source:seed_a"], "로어북 자료를 뺌");
});
