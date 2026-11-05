// Erosync 컨트롤러(src/data/erosync.js): 기본 꺼짐, 켜기/끄기 수명, 시작 실패 보고, 원본 플러그인 감지
import test from "node:test";
import assert from "node:assert/strict";
import { createErosync, ERO_KEY, ERO_ORIGINAL } from "../src/data/erosync.js";

function fakeApi(over = {}) {
  const mem = new Map();
  return {
    mem,
    pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } },
    addRisuReplacer: async () => {},
    ...over
  };
}
function fakeBoot({ loaded = true } = {}) {
  const log = { boots: 0, disposed: 0 };
  const boot = async () => { log.boots++; return { loaded: () => loaded, dispose: async () => { log.disposed++; } }; };
  return { log, boot };
}

test("기본은 꺼짐: boot()는 아무것도 시작하지 않는다", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const er = createErosync(api, { boot });
  assert.equal(await er.boot(), false);
  assert.equal(er.on(), false); assert.equal(er.isRunning(), false); assert.equal(log.boots, 0);
});

test("저장된 값이 켜짐이면 boot()가 시작하고, 끄면 정리한다", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  api.mem.set(ERO_KEY, "on");
  const er = createErosync(api, { boot });
  assert.equal(await er.boot(), true);
  assert.equal(er.isRunning(), true); assert.equal(log.boots, 1);
  assert.equal(await er.set(false), true);
  assert.equal(er.isRunning(), false); assert.equal(log.disposed, 1);
  assert.equal(api.mem.get(ERO_KEY), "off");
});

test("set(true)는 저장하고 한 번만 시작한다(동시 호출도)", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot();
  const er = createErosync(api, { boot });
  const [a, b] = await Promise.all([er.set(true), er.set(true)]);
  assert.equal(a, true); assert.equal(b, true); assert.equal(log.boots, 1);
  assert.equal(api.mem.get(ERO_KEY), "on");
});

test("요청 훅이 없는 환경에서는 시작하지 않고 이유를 알려 준다", async () => {
  const api = fakeApi({ addRisuReplacer: undefined }), { log, boot } = fakeBoot();
  const er = createErosync(api, { boot });
  assert.equal(await er.set(true), false);
  assert.equal(log.boots, 0); assert.match(er.lastError(), /요청 훅/);
});

test("원래 Erosync 플러그인이 켜져 있으면 시작하지 않는다", async () => {
  const api = fakeApi({ getDatabase: async () => ({ plugins: [{ name: ERO_ORIGINAL, enabled: true }] }) }), { log, boot } = fakeBoot();
  const er = createErosync(api, { boot });
  assert.equal(await er.set(true), false);
  assert.equal(log.boots, 0); assert.match(er.lastError(), /원래/);
});

test("본체가 끝까지 못 올라오면(loaded=false) 정리하고 실패로 알린다", async () => {
  const api = fakeApi(), { log, boot } = fakeBoot({ loaded: false });
  const er = createErosync(api, { boot });
  assert.equal(await er.set(true), false);
  assert.equal(er.isRunning(), false); assert.equal(log.disposed, 1); assert.match(er.lastError(), /초기화/);
});

test("시작 중 예외가 나도 던지지 않고 lastError에 남긴다", async () => {
  const api = fakeApi();
  const er = createErosync(api, { boot: async () => { throw new Error("boom"); } });
  assert.equal(await er.set(true), false);
  assert.equal(er.lastError(), "boom");
});

test("컨트롤러 read: 꺼져 있으면 off, 켜져 있으면 본체의 read 결과", async () => {
  const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} }, addRisuReplacer: async () => {}, getDatabase: async () => ({ plugins: [] }) };
  const er = createErosync(api, { boot: async () => ({ loaded: () => true, dispose: async () => {}, read: async () => ({ ok: true, people: [{ id: "a" }], goals: [], rivalries: [], relations: [] }) }) });
  assert.equal((await er.read()).reason, "off");
  assert.equal(await er.set(true), true);
  assert.equal((await er.read()).people[0].id, "a");
  await er.stop();
  assert.equal((await er.read()).ok, false);
});
import { normGuard, GUARD_KEY } from "../src/data/erosync.js";
test("집착 방지: 값 범위 정리와 저장·반영", async () => {
  assert.deepEqual(normGuard({ on: true, obsessionCap: 500, sameTargetTurns: 0, restTurns: "x" }), { on: true, obsessionCap: 100, sameTargetTurns: 1, restTurns: 4 });
  const store = {}, api = { addRisuReplacer() {}, pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } } };
  const sent = [];
  const boot = async () => ({ loaded: () => true, dispose: async () => {}, guard: { set: (v) => sent.push(v) } });
  const er = createErosync(api, { boot, load: async () => true });
  await er.boot();
  await er.setGuard({ on: true, obsessionCap: 40 });
  assert.equal(JSON.parse(store[GUARD_KEY]).obsessionCap, 40);
  assert.equal(sent.at(-1).on, true);
  assert.equal(er.guard().sameTargetTurns, 3);
});
