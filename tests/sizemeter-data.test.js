import { test } from "node:test";
import assert from "node:assert/strict";
import { scanSizes } from "../src/data/sizemeter.js";
import { DISABLED_KEY, ORDER_KEY } from "../src/data/modules.js";

function fakeApi({ chars = [], storage = {}, db = {}, failStorage = false } = {}) {
  const log = { reads: [], live: 0, maxLive: 0, writes: 0 };
  const api = {
    async getDatabase(keys) {
      log.reads.push(keys.join(","));
      assert.ok(!keys.includes("characters"), "characters를 한꺼번에 읽지 않는다");
      return { modules: [], plugins: [], enabledModules: [], moduleIntergration: "", characterOrder: chars.map((c) => c.chaId), ...db };
    },
    async getCharacterFromIndex(i) {
      log.live++; log.maxLive = Math.max(log.maxLive, log.live);
      await new Promise((r) => setTimeout(r, 1));
      log.live--;
      return chars[i] ?? null;
    },
    pluginStorage: {
      async getItem(k) { return storage[k] ?? null; },
      async setItem() { log.writes++; },
      async keys() { if (failStorage) throw new Error("x"); return Object.keys(storage); }
    }
  };
  return { api, log };
}

test("봇을 하나씩 읽어 크기만 남기고, 아무것도 쓰지 않는다", async () => {
  const chars = Array.from({ length: 10 }, (_, i) => ({ chaId: `c${i}`, name: `봇${i}`, desc: "가".repeat(100), modules: i === 0 ? ["m1"] : [], chats: [{ message: [{ data: "x" }] }] }));
  const { api, log } = fakeApi({ chars, db: { modules: [{ id: "m1", name: "M1", lorebook: [] }, { id: "m2", name: "M2" }] } });
  const seen = [];
  const r = await scanSizes(api, { onProgress: (p) => seen.push(p) });
  assert.equal(r.report.counts.characters, 10);
  assert.ok(log.maxLive <= 4, `동시에 읽는 봇은 4개 이하 (${log.maxLive})`);
  assert.equal(log.writes, 0);
  assert.equal(r.report.items.modules.find((m) => m.id === "m1").active, true);
  assert.equal(r.report.items.modules.find((m) => m.id === "m2").active, false);
  assert.ok(seen.some((p) => p.phase === "chars" && p.done === 10 && p.total === 10));
  assert.ok(r.report.items.characters.every((c) => !("chats" in c) && !("desc" in c)), "원본 데이터를 들고 있지 않다");
});

test("Dusk가 꺼 둔 모듈도 재고, 그 보관 키는 저장소에서 중복으로 세지 않는다", async () => {
  const parked = [{ id: "pk", name: "보관", lorebook: [{ content: "z".repeat(500) }] }];
  const { api } = fakeApi({ storage: { [DISABLED_KEY]: parked, [ORDER_KEY]: ["pk"], "dusk.x": "abc" } });
  const r = await scanSizes(api);
  const m = r.report.items.modules.find((x) => x.id === "pk");
  assert.ok(m && m.parked && m.active === false && m.bytes > 500);
  assert.deepEqual(r.report.items.storage.map((s) => s.name), ["dusk.x"]);
  assert.equal(r.report.items.storage[0].bytes, 3);
  assert.equal(r.report.waste.modules, 1);
});

test("저장소 목록을 못 읽어도 나머지는 잰다", async () => {
  const { api } = fakeApi({ chars: [{ chaId: "a", name: "A" }], failStorage: true, storage: { k: "v" } });
  const r = await scanSizes(api);
  assert.equal(r.storageOk, false);
  assert.equal(r.report.counts.characters, 1);
});

test("순서 목록에 없는 늦게 추가된 봇도 잰다", async () => {
  const chars = [{ chaId: "a", name: "A" }, { chaId: "b", name: "B" }, { chaId: "late", name: "L" }];
  const { api } = fakeApi({ chars, db: { characterOrder: ["a", "b"] } });
  const r = await scanSizes(api);
  assert.equal(r.report.counts.characters, 3);
});

test("DB 권한이 없으면 안내와 함께 실패", async () => {
  await assert.rejects(() => scanSizes({ getDatabase: async () => null }), /권한/);
});

test("중간에 취소하면 읽은 만큼만 돌려준다", async () => {
  const chars = Array.from({ length: 20 }, (_, i) => ({ chaId: `c${i}`, name: `b${i}` }));
  const { api } = fakeApi({ chars });
  let n = 0;
  const r = await scanSizes(api, { cancelled: () => ++n > 3 });
  assert.equal(r.cancelled, true);
  assert.ok(r.report.counts.characters < 20);
});
import { measurePlugin } from "../src/engine/sizemeter.js";
test("플러그인 용량: 코드의 줄바꿈·따옴표 이스케이프를 더해 세지 않음", () => {
  const script = 'a\n"b"\n'.repeat(1000); // 6000바이트
  const m = measurePlugin({ name: "x", script, enabled: true });
  assert.equal(m.parts.find((p) => p.label === "스크립트 코드").bytes, 6000);
  assert.ok(m.bytes < 6100, `총 ${m.bytes}`);
});
