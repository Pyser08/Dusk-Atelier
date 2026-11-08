import test from "node:test";
import assert from "node:assert/strict";
import { trimCovered } from "../src/engine/historytrim.js";

const chat = [];
for (let i = 0; i < 30; i++) chat.push({ role: i % 2 ? "char" : "user", data: `${i % 2 ? "봇" : "나"} 메시지 번호 ${i} 입니다. 충분히 긴 본문이 여기에 이어져요.` });
const req = () => [{ role: "system", content: "시스템 프롬프트" }, ...chat.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.data })), { role: "assistant", content: "프리필" }];

test("분석된 옛 대화만 빼고, 최근 N턴·시스템·처음 보는 글은 남긴다", () => {
  const r = trimCovered(req(), chat, { keepTurns: 5, coveredAt: 29 });
  assert.equal(r.dropped, 20, "15턴 중 최근 5턴(10개) 남김");
  assert.equal(r.messages[0].content, "시스템 프롬프트");
  assert.equal(r.messages.at(-1).content, "프리필");
  assert.match(r.messages[1].content, /번호 20 /);
});
test("분석이 안 된 부분은 빼지 않는다", () => {
  const r = trimCovered(req(), chat, { keepTurns: 5, coveredAt: 9 });
  assert.equal(r.dropped, 10);
  assert.match(r.messages[1].content, /번호 10 /);
});
test("분석 기록이 없거나 턴이 적으면 그대로", () => {
  assert.equal(trimCovered(req(), chat, { keepTurns: 5, coveredAt: -1 }).dropped, 0);
  assert.equal(trimCovered(req(), chat, { keepTurns: 50, coveredAt: 29 }).dropped, 0);
});
test("요청 글이 조금 바뀌어도(앞뒤 공백·이름 치환 뒤 글) 앞부분이 같으면 찾는다", () => {
  const q = req(); q[3].content = "  " + q[3].content + "\n";
  assert.equal(trimCovered(q, chat, { keepTurns: 5, coveredAt: 29 }).dropped, 20);
});
