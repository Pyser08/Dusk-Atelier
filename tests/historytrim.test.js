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
test("묶음 빼기(step): 빼는 경계가 step턴마다만 움직여 요청 앞부분이 그대로 유지된다(캐시)", () => {
  const mk = (n) => { const c = []; for (let i = 0; i < n * 2; i++) c.push({ role: i % 2 ? "char" : "user", data: `${i % 2 ? "봇" : "나"} 메시지 번호 ${i} 입니다. 충분히 긴 본문이 여기에 이어져요.` }); return c; };
  const rq = (c) => c.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.data }));
  const first = (n) => { const c = mk(n); return trimCovered(rq(c), c, { keepTurns: 5, step: 5, coveredAt: c.length - 1 }); };
  assert.equal(first(9).dropped, 0, "keep+step 미만이면 안 뺌");
  assert.equal(first(10).dropped, 10, "10턴이 되면 5턴을 한 번에 뺌");
  const a = first(11), b = first(14);
  assert.equal(a.dropped, 10); assert.equal(b.dropped, 10, "다음 묶음까지 경계 고정");
  assert.equal(a.messages[0].content, b.messages[0].content);
  assert.equal(first(15).dropped, 20);
});
test("묶음 빼기: 분석이 덜 된 경계는 이전 묶음으로 물러난다", () => {
  const c = []; for (let i = 0; i < 30; i++) c.push({ role: i % 2 ? "char" : "user", data: `${i % 2 ? "봇" : "나"} 메시지 번호 ${i} 입니다. 충분히 긴 본문이 여기에 이어져요.` });
  const rq = c.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.data }));
  assert.equal(trimCovered(rq, c, { keepTurns: 5, step: 5, coveredAt: 15 }).dropped, 10, "경계 20 대신 10");
  assert.equal(trimCovered(rq, c, { keepTurns: 5, step: 5, coveredAt: 8 }).dropped, 0);
});

// 2.2.11: 요청 글 맞추기 대신 리스 처리 단계(process)에서 메시지 번호로 뺀다(HypaPlus 방식) — 글 모양이 바뀌어도 빠진다
import { trimUntil, gateProcess } from "../src/engine/historytrim.js";
test("trimUntil: 빼는 마지막 메시지 번호를 trimCovered와 같은 규칙으로 구한다", () => {
  assert.equal(trimUntil(chat, { keepTurns: 5, coveredAt: 29 }), 19);
  assert.equal(trimUntil(chat, { keepTurns: 5, coveredAt: 9 }), 9);
  assert.equal(trimUntil(chat, { keepTurns: 5, coveredAt: -1 }), -1);
  assert.equal(trimUntil(chat, { keepTurns: 50, coveredAt: 29 }), -1);
});
test("요청 글이 정규식·이름표로 바뀌어 trimCovered가 못 맞춰도, 번호 기준은 그대로 뺀다", () => {
  const q = req().map((m) => (m.role === "user" ? { ...m, content: `[유저] ${m.content.replace("나 ", "")}` } : m));
  assert.equal(trimCovered(q, chat, { keepTurns: 5, coveredAt: 29 }).dropped < 20, true, "글 맞추기는 유저 글을 놓침");
  assert.equal(trimUntil(chat, { keepTurns: 5, coveredAt: 29 }), 19);
});
test("gateProcess: 번호 조건으로 감싸고, 첫 메시지(-1)는 남긴다", () => {
  assert.equal(gateProcess("본문", 0), "본문");
  const g = gateProcess("본문", 20);
  assert.match(g, /\{\{#if \{\{greater_equal::\{\{chat_index\}\}::20\}\}\}\}\n본문\n\{\{\/if\}\}/);
  assert.match(g, /less::\{\{chat_index\}\}::0/);
});
