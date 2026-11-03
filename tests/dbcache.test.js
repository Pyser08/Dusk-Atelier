import test from "node:test";
import assert from "node:assert/strict";
import { createDbCache, WRITE_RE } from "../src/data/dbcache.js";

const setup = () => { let n = 0, t = 0; const db = { characters: [{ id: 1 }], modules: [] };
  const raw = { getDatabase: async (k) => { n++; return structuredClone(Object.fromEntries((k ?? Object.keys(db)).map((x) => [x, db[x]]))); } };
  return { raw, db, calls: () => n, tick: (ms) => { t += ms; }, cache: null, mk(ttl = 1000) { this.cache = createDbCache(raw, { ttl, now: () => t }); return this.cache; } };
};
test("같은 키 묶음은 TTL 동안 한 번만 읽고 동시에 부른 것도 합친다", async () => {
  const s = setup(), c = s.mk();
  await Promise.all([c.get(["characters", "modules"]), c.get(["modules", "characters"])]);
  assert.equal(s.calls(), 1);
  await c.get(["characters", "modules"]); assert.equal(s.calls(), 1);
  s.tick(1500); await c.get(["characters", "modules"]); assert.equal(s.calls(), 2, "TTL이 지나면 다시 읽는다");
});
test("돌려준 값을 고쳐도 캐시는 그대로다", async () => {
  const s = setup(), c = s.mk();
  const a = await c.get(["characters"]); a.characters.push({ id: 2 }); a.characters[0].id = 9;
  const b = await c.get(["characters"]);
  assert.deepEqual(b.characters, [{ id: 1 }]);
});
test("invalidate·fresh: 비우면 다시 읽고, fresh는 캐시를 쓰지 않는다. 비우기 전에 시작한 읽기는 캐시에 남지 않는다", async () => {
  const s = setup(), c = s.mk();
  await c.get(["modules"]); c.invalidate(); await c.get(["modules"]); assert.equal(s.calls(), 2);
  await c.fresh(["modules"]); assert.equal(s.calls(), 3);
  const slow = c.get(["characters"]); c.invalidate(); await slow;
  assert.equal(c.size(), 0, "낡은 읽기는 저장하지 않는다");
});
test("오류는 캐시하지 않고, 쓰기 이름 패턴", async () => {
  let fail = true; const raw = { getDatabase: async () => { if (fail) throw new Error("denied"); return { a: 1 }; } };
  const c = createDbCache(raw);
  await assert.rejects(c.get(["a"]), /denied/); fail = false;
  assert.deepEqual(await c.get(["a"]), { a: 1 });
  for (const n of ["setDatabase", "setCharacterToIndex", "addCharacter", "removeCharacter", "importModule"]) assert.ok(WRITE_RE.test(n), n);
  for (const n of ["getDatabase", "getCharacterFromIndex", "registerButton", "showContainer"]) assert.ok(!WRITE_RE.test(n), n);
});

test("키마다 따로 담는다: 이미 읽은 키는 다른 묶음에서 다시 읽지 않고, 모자란 키만 읽는다 (1.8.3)", async () => {
  const s = setup(), c = s.mk();
  await c.get(["characters"]); assert.equal(s.calls(), 1);
  const r = await c.get(["characters", "modules"]); assert.equal(s.calls(), 2, "modules만 더 읽음");
  assert.deepEqual(Object.keys(r).sort(), ["characters", "modules"]);
  await c.get(["modules"]); await c.get(["characters", "modules"]); assert.equal(s.calls(), 2);
});
test("shared 읽기는 복사하지 않지만 최상위 객체는 새로 준다. 감시가 warm으로 읽은 것도 재사용한다 (1.8.3)", async () => {
  const s = setup(), c = s.mk();
  const a = await c.get(["characters"], { shared: true }), b = await c.get(["characters"], { shared: true });
  assert.equal(a.characters, b.characters, "배열을 복사하지 않음"); assert.notEqual(a, b);
  a.characters = []; assert.equal((await c.get(["characters"], { shared: true })).characters.length, 1, "최상위 교체는 캐시에 안 샌다");
  const s2 = setup(), c2 = s2.mk(); await c2.warm(["modules"]); await c2.get(["modules"]); assert.equal(s2.calls(), 1);
});
test("soften: 최근에 읽은 것은 남기고 오래된 것만 버린다 (1.8.3)", async () => {
  const s = setup(), c = s.mk(5000);
  await c.get(["modules"]); s.tick(20000); await c.get(["characters"]);
  c.soften(15000);
  assert.equal(c.size(), 1);
});
