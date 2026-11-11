// Dusk 2.1.4: Erosync '다음 턴 계획 미리 짜기'를 잠깐 미뤄, 잘린 응답을 다시 생성하면 그 몫은 짜지 않는다
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createLookaheadDelay, LOOKAHEAD_CANCELLED } from "../src/erosync/lookaheaddelay.js";

const fakeTimers = () => { const t = new Map(); let id = 0; return { setTimer: (f) => { t.set(++id, f); return id; }, clearTimer: (i) => t.delete(i), fire: () => { for (const [i, f] of [...t]) { t.delete(i); f(); } }, size: () => t.size }; };

test("기다린 뒤에 시작한다(그 전엔 부르지 않음)", async () => {
  const ft = fakeTimers(), d = createLookaheadDelay(ft); let n = 0;
  const p = d.delay("s1", () => { n++; return "plan"; });
  await new Promise((r) => setTimeout(r, 5)); assert.equal(n, 0);
  ft.fire(); assert.equal(await p, "plan"); assert.equal(n, 1);
});
test("다시 생성(취소)하면 잘린 응답 몫은 부르지 않고, 새 응답 것은 다시 기다렸다 부른다", async () => {
  const ft = fakeTimers(), d = createLookaheadDelay(ft); const calls = [];
  const cut = d.delay("s1", () => calls.push("cut"));
  assert.equal(d.cancel("s1"), true); assert.equal(await cut, LOOKAHEAD_CANCELLED);
  const fresh = d.delay("s1", () => { calls.push("fresh"); return 1; });
  ft.fire(); await fresh; assert.deepEqual(calls, ["fresh"]);
});
test("같은 채팅에 새 응답이 확정되면 앞 것은 취소, 다음 말을 보내면 바로 시작", async () => {
  const ft = fakeTimers(), d = createLookaheadDelay(ft); const calls = [];
  const a = d.delay("s1", () => calls.push("a")), b = d.delay("s1", () => { calls.push("b"); return "B"; });
  assert.equal(await a, LOOKAHEAD_CANCELLED);
  assert.equal(await d.flush("s1"), "B"); assert.deepEqual(calls, ["b"]); assert.equal(ft.size(), 0, "타이머 정리");
  assert.equal(d.flush("s1"), null); assert.equal(d.cancel("s1"), false);
});
test("다른 채팅은 서로 건드리지 않는다, 오류는 null", async () => {
  const ft = fakeTimers(), d = createLookaheadDelay(ft);
  const x = d.delay("s1", () => { throw new Error("x"); }), y = d.delay("s2", () => "Y");
  ft.fire(); assert.equal(await x, null); assert.equal(await y, "Y");
});
test("Erosync 본체 연결: 확정 뒤 계획·재분석·비하인드를 미루고, 다시 생성(되돌림)이면 취소·새 입력이면 바로 시작", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(/const lookaheadJob = lookaheadDelay\.delay\(/.test(src), "확정 뒤 미루기");
  assert.ok(/LOOKAHEAD_CANCELLED/.test(src.slice(src.indexOf("const lookaheadJob = lookaheadDelay.delay("), src.indexOf("function behindStorageKey"))), "취소되면 재분석·비하인드도 건너뜀");
  assert.ok(/lookaheadDelay\.cancel\(scope\.scopeKey\)/.test(src), "되돌림(다시 생성)이면 취소");
  assert.ok(/lookaheadDelay\.flush\(scope\.scopeKey\)/.test(src), "새 입력이면 바로 시작");
});
