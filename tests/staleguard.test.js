import test from "node:test";
import assert from "node:assert/strict";
import { scopeCtx } from "../src/ui/staleguard.js";

test("낡은 화면은 main을 못 바꾸고, 현재 화면은 바꾼다 (읽기는 둘 다 가능)", () => {
  const log = [];
  const main = { replaceChildren: (...a) => log.push(a.join()), querySelector: () => "q", set innerHTML(v) { log.push("html" + v); } };
  const ctx = { main, x: 1 };
  let token = 1;
  const mine = (t) => scopeCtx(ctx, main, () => t !== token);
  const a = mine(1);                   // 탭 A 화면
  a.main.replaceChildren("A1"); assert.deepEqual(log, ["A1"]);
  token = 2;                           // 탭 B로 이동
  a.main.replaceChildren("A-late"); a.main.innerHTML = "late";
  assert.deepEqual(log, ["A1"], "늦게 끝난 A의 그리기는 무시");
  assert.equal(a.main.querySelector(), "q");
  const b = mine(2); b.main.replaceChildren("B"); assert.deepEqual(log, ["A1", "B"]);
  b.y = 5; assert.equal(ctx.y, 5, "ctx 쓰기는 원본에 반영"); assert.equal(a.x, 1);
});
