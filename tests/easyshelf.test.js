import test from "node:test";
import assert from "node:assert/strict";
import { summarize, sigOf, reconcile, absorb, drop, freshCache, orderIds } from "../src/engine/easyshelf.js";

const bot = (id, lore = []) => ({ chaId: id, name: "봇" + id, desc: "키보토스", globalLore: lore, chats: [{ message: [{ data: "긴 채팅".repeat(100) }] }] });
const mari = [{ key: "마리", comment: "마리", content: "16살. 성격: 상냥함" }, { key: "히마리", comment: "히마리", content: "b" }];

test("요약: 겹치는 이름·분류", () => {
  const s = summarize(bot("a", mari), 3, 1);
  assert.equal(s.ci, 3);
  assert.equal(s.genre, "블루 아카이브");
  assert.deepEqual(s.todo.map((t) => t.name), ["마리"]);
  assert.deepEqual(s.todo[0].keys[0].inside, ["히마리"]);
});

test("서명은 채팅 글에 안 흔들리고 로어북엔 흔들린다", () => {
  const a = bot("a", mari), b = structuredClone(a);
  b.chats[0].message.push({ data: "새 메시지" });
  assert.equal(sigOf(a), sigOf(b));
  b.globalLore[0].key = "마리, 이오치";
  assert.notEqual(sigOf(a), sigOf(b));
});

test("바뀐 봇만 다시 훑는다", () => {
  let { cache, changed } = absorb(freshCache(null), [{ c: bot("a", mari), ci: 0 }, { c: bot("b"), ci: 1 }]);
  assert.deepEqual(changed, ["a", "b"]);
  const b2 = bot("b", mari);
  ({ cache, changed } = absorb(cache, [{ c: bot("a", mari), ci: 0 }, { c: b2, ci: 2 }]));
  assert.deepEqual(changed, ["b"]);
  assert.equal(cache.bots.b.ci, 2);
});

test("순서 목록과 맞추기", () => {
  const { cache } = absorb(freshCache(null), [{ c: bot("a"), ci: 0 }, { c: bot("x"), ci: 1 }]);
  const order = [{ id: "f", name: "폴더", data: ["a", "n"] }, "m"];
  assert.deepEqual(orderIds(order), ["a", "n", "m"]);
  assert.deepEqual(reconcile(cache, order), { missing: ["n", "m"], gone: ["x"] });
  assert.deepEqual(Object.keys(drop(cache, ["x"]).bots), ["a"]);
});

test("옛 형식 캐시는 버린다", () => {
  assert.deepEqual(freshCache({ v: 1, bots: { a: 1 } }).bots, {});
});
