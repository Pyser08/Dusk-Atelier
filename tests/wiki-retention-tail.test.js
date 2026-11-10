// 3.0.8: 리수폿 자동 기록 '정리된 범위' 잠김 — 채팅이 짧아진 뒤(메시지 삭제·되감기·정리) 새 턴의 번호가 예전 정리 번호(prunedThrough) 아래로
// 내려가면 모든 새 턴이 '이전 자동 기록이 정리된 범위'로 막혀 자동 갱신이 영영 안 됐다(사용자가 저장 데이터의 번호를 손으로 고쳐야 했음).
// 고침: 지금 채팅의 마지막 AI 응답(꼬리)은 예전 글의 재반영이 아니라 새 턴이므로 막지 않는다. 꼬리보다 앞선 옛 메시지는 예전처럼 막는다.
import test from "node:test";
import assert from "node:assert/strict";
import { automaticRecordExpired, latestAssistantIndex } from "../src/engine/pot/wiki-retention.js";

const scope = (prunedThrough, extra = {}) => ({ automation: { records: {}, activeByMessage: {}, lastStatus: null, prunedThrough, ...extra } });
const chat = (roles) => ({ message: roles.map((role) => ({ role, data: "x" })) });

test("정리 번호 아래의 옛 메시지는 예전처럼 막는다", () => {
  assert.equal(automaticRecordExpired(scope(50), { messageIndex: 10, messageKey: "m", identity: "s", latestAssistantIndex: 61 }), true);
  assert.equal(automaticRecordExpired(scope(50), { messageIndex: 10, messageKey: "m", identity: "s" }), true);   // 꼬리 정보가 없으면 원래 규칙
});

test("채팅이 짧아져 새 턴 번호가 정리 번호 아래라도, 마지막 AI 응답(꼬리)이면 막지 않는다", () => {
  assert.equal(automaticRecordExpired(scope(50), { messageIndex: 10, messageKey: "m", identity: "s", latestAssistantIndex: 10 }), false);
  assert.equal(automaticRecordExpired(scope(50, { unindexedPruned: true }), { messageIndex: 10, messageKey: "m", identity: "s", latestAssistantIndex: 10 }), false);
});

test("latestAssistantIndex: 마지막 AI 응답 번호(뒤에 사용자 말이 있어도)", () => {
  assert.equal(latestAssistantIndex(chat(["user", "char", "user", "char", "user"])), 3);
  assert.equal(latestAssistantIndex(chat(["user", "assistant"])), 1);
  assert.equal(latestAssistantIndex(chat(["user"])), -1);
  assert.equal(latestAssistantIndex(null), -1);
});
