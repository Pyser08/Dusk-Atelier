// 2.2.4 실패 기록: 가리기 · 이유 풀이 · 같은 실패 묶기 · 사용자용/제보용 글
import test from "node:test";
import assert from "node:assert/strict";
import { createMemLog, redact, explain, userText, reportText, logFailure, setPendingReason, takePendingReason } from "../src/data/memlog.js";

const mkApi = () => { const m = new Map(); return { safeLocalStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } } }; };
test("키·토큰은 가린다", () => {
  const s = redact('Bearer abcdefghijklmnop sk-or-v1-1234567890abcdef "api_key": "AIzaSyABCDEFGHIJKLMNOP1234"');
  assert.ok(!/abcdefghijklmnop|1234567890abcdef|ABCDEFGHIJKLMNOP1234/.test(s), s);
});
test("오류 원문을 사용자용 이유로 푼다", () => {
  assert.match(explain("HTTP 401 Unauthorized").why, /키/);
  assert.match(explain("429 Too Many Requests").why, /한도/);
  assert.match(explain("Writer 입력 예산 48000 초과").todo, /자동 기록 입력 예산/);
  assert.match(explain("뭔지 모를 일").todo, /제보용/);
});
test("남기기 · 같은 실패는 횟수로 묶기 · 최근 순 목록 · 지우기 · 어디서나 남기기", async () => {
  let t = 1000; const L = createMemLog(mkApi(), { now: () => t });
  const a = await L.add({ area: "장기 기억 기록", title: "기록 실패", error: new Error("HTTP 500"), ctx: { 모델: "x" } });
  t += 1000; const b = await L.add({ area: "장기 기억 기록", title: "기록 실패", error: new Error("HTTP 500") });
  assert.equal(a.id, b.id); assert.equal(b.count, 2);
  t += 1000; await logFailure({ area: "Jev 재정렬", title: "고르지 못함", error: "시간 초과", fallback: "원래 순서로" });
  const list = await L.list();
  assert.deepEqual(list.map((x) => x.area), ["Jev 재정렬", "장기 기억 기록"]);
  assert.match(userText(list[0]), /대신: 원래 순서로/);
  assert.match(reportText(list[1], { version: "2.2.4", 기기: "test" }), /오류 원문:\nHTTP 500/);
  setPendingReason(list[0].id); assert.equal(takePendingReason(), list[0].id); assert.equal(takePendingReason(), null);
  await L.clear(); assert.equal((await L.list()).length, 0);
});
