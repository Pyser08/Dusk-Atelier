import test from "node:test";
import assert from "node:assert/strict";
import { recordTurn } from "../src/engine/recorder.js";

const run = { user: "안녕", rp: "민지가 웃었다.", recent: "", docs: [], userNames: [], slots: new Set() };

test("신고 #23: 기록기 답이 거절 문장이면 형식 오류가 아니라 검열로, 다시 묻지 않는다", async () => {
  let n = 0;
  const call = async () => { n++; return "이 요청을 수행할 수 없습니다. 미성년자가 관련된 성적으로 노골적인 콘텐츠는 처리하거나 생성할 수 없습니다."; };
  await assert.rejects(recordTurn(call, run, {}), (e) => /^검열: 모델이 기록을 거절했어요/.test(e.message) && e.code === "recorder-refused");
  assert.equal(n, 1);
});

test("신고 #23: 제공사 안전 필터 오류도 검열로 알린다", async () => {
  const call = async () => { throw new Error("Gemini blocked the request: PROHIBITED_CONTENT"); };
  await assert.rejects(recordTurn(call, run, {}), (e) => /^검열: 모델 제공사가 요청을 막았어요/.test(e.message));
});
