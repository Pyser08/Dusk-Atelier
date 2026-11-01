import test from "node:test";
import assert from "node:assert/strict";
import { applyUserPrompts, USER_PROMPT_MARK } from "../src/engine/customprompt.js";
import { runAI, setUserPromptProvider } from "../src/engine/runai.js";

const C = { front: "F", middle: "M", back: "B" };
test("앞·중간·뒤 위치: 시스템 글의 맨 앞 / 첫 문단 뒤 / 맨 끝", () => {
  const msgs = [{ role: "system", content: "역할 설명\n\n규칙1\n규칙2" }, { role: "user", content: "질문" }];
  const out = applyUserPrompts(msgs, C);
  assert.equal(out[0].content, "F\n\n역할 설명\n\nM\n\n규칙1\n규칙2\n\nB");
  assert.equal(out[1].content, "질문"); assert.equal(msgs[0].content, "역할 설명\n\n규칙1\n규칙2", "원본은 안 바뀐다");
});
test("빈 줄이 없으면 첫 줄 뒤, 시스템 글이 없으면 새로 만든다, 이미 끼운 호출은 건너뜀", () => {
  assert.equal(applyUserPrompts([{ role: "system", content: "A\nB" }], { middle: "M" })[0].content, "A\n\nM\n\nB");
  const o = applyUserPrompts([{ role: "user", content: "q" }], { front: "F" }); assert.equal(o[0].role, "system"); assert.equal(o[0].content, "F");
  const done = [{ role: "system", content: `x ${USER_PROMPT_MARK} · MEMORY]` }]; assert.equal(applyUserPrompts(done, C), done);
  assert.equal(applyUserPrompts([{ role: "system", content: "s" }], null)[0].content, "s");
});
test("runAI가 공급자의 글을 모델 호출 앞에서 끼운다", async () => {
  let sent = null;
  setUserPromptProvider(async () => ({ front: "F" }));
  const api = { runLLMModel: async (o) => { sent = o.messages; return { type: "success", result: "ok" }; } };
  assert.equal(await runAI(api, [{ role: "system", content: "S" }, { role: "user", content: "u" }], { mode: "submodel" }), "ok");
  assert.equal(sent[0].content, "F\n\nS");
  setUserPromptProvider(null);
});
