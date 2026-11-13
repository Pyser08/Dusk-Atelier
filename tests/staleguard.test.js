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

// 2.2.0 제보: 탭 A(캐릭터)를 불러오는 중에 B(기억)로 가면 창이 얼어붙음.
// 늦게 끝난 A가 replace(ctx.main)를 부르면 clear()의 'while (firstChild) removeChild' 가 무시된 removeChild 때문에 끝나지 않았다.
test("낡은 화면의 replace()는 얼지 않고 아무것도 바꾸지 않는다", async () => {
  globalThis.document ??= { createElement: () => ({}), createTextNode: (t) => t };
  globalThis.Node ??= class {};
  const { replace } = await import("../src/ui/dom.js");
  const kids = ["B 화면"];
  const main = {
    get firstChild() { return kids[0] ?? null; },
    get firstElementChild() { return null; },
    removeChild(n) { kids.splice(kids.indexOf(n), 1); },
    hasAttribute: () => false, append: (...a) => kids.push(...a), appendChild: (n) => kids.push(n),
    querySelectorAll: () => []
  };
  const stale = scopeCtx({ main }, main, () => true).main;
  const t0 = Date.now();
  replace(stale, "A-late");
  assert.ok(Date.now() - t0 < 500, "끝나야 함");
  assert.deepEqual(kids, ["B 화면"], "B 화면 그대로");
});
