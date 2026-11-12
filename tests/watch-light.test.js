// perf/startup: 새 봇 감시가 캐릭터·모듈 전체를 자주 읽지 않는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// src/tide/*.ts는 확장자 없이 서로 불러서, 시험에서만 .ts/.js를 붙여 찾는다
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, next) {
  try { return await next(s, c); } catch (e) {
    if (!/^\\.\\.?\\//.test(s) || /\\.[cm]?[jt]s$/.test(s)) throw e;
    for (const x of ['.ts', '.js']) { try { return await next(s + x, c); } catch {} }
    throw e;
  }
}`));
const { createWatcher } = await import('../src/ui/watch.js');

function mockApi(nChars = 5) {
  const chars = Array.from({ length: nChars }, (_, i) => ({ chaId: "c" + i, name: "봇" + i, chats: [] }));
  const store = new Map();
  const reads = { characters: 0, modules: 0, byIndex: 0 };
  const api = {
    chars,
    reads,
    async getDatabase(keys) {
      const o = {};
      for (const k of keys) {
        if (k === "characters") { reads.characters++; o.characters = chars.map((c) => ({ ...c })); }
        if (k === "modules") { reads.modules++; o.modules = [{ id: "m1", name: "모듈" }]; }
        if (k === "characterOrder") o.characterOrder = chars.filter((c) => !c.trashTime).map((c) => c.chaId);
      }
      return o;
    },
    async getCharacterFromIndex(i) { reads.byIndex++; return chars[i] ? { ...chars[i] } : null; },
    pluginStorage: {
      async getItem(k) { return store.get(k) ?? null; },
      async setItem(k, v) { store.set(k, v); },
    },
  };
  return { api, store };
}

test("이미 본 봇 목록이 있으면 시작·강제 확인에 캐릭터 전체를 읽지 않는다", async () => {
  const { api } = mockApi();
  const w1 = createWatcher(api, { onDetected() {} });
  await w1.check(true); // 처음 설치: 기준 잡기(전체 1번은 허용)
  const base = api.reads.characters;
  const w2 = createWatcher(api, { onDetected() {} }); // 다시 켬
  await w2.check(true);
  await w2.check(true);
  await w2.check();
  assert.equal(api.reads.characters, base);
});

test("끝에 새 봇이 생기면 전체를 읽지 않고도 찾는다", async () => {
  const { api } = mockApi();
  const seen = [];
  const w = createWatcher(api, { onDetected() {}, onNew: (x) => seen.push(...x) });
  await w.check(true);
  const base = api.reads.characters;
  // 리스가 순서 목록에 늦게 넣는 경우: 순서엔 없고 배열 끝에만 생김
  api.chars.push({ chaId: "new1", name: "새 봇", chats: [], trashTime: 0 });
  const getDb = api.getDatabase;
  api.getDatabase = async (keys) => {
    const o = await getDb(keys);
    if (o.characterOrder) o.characterOrder = o.characterOrder.filter((x) => x !== "new1");
    return o;
  };
  await w.check();
  assert.deepEqual(seen.map((x) => x.copyId), ["new1"]);
  assert.equal(api.reads.characters, base + 1); // 새 봇 살펴보기(inspect)만
  await w.check();
  assert.equal(api.reads.characters, base + 1);
});

test("순서만 바뀌면 전체를 읽지 않는다", async () => {
  const { api } = mockApi();
  const w = createWatcher(api, { onDetected() {} });
  await w.check(true);
  const base = api.reads.characters;
  api.chars.reverse();
  await w.check();
  assert.equal(api.reads.characters, base);
});

test("모듈 전체 읽기는 강제 확인에서도 자주 하지 않는다", async () => {
  const { api } = mockApi();
  const w = createWatcher(api, { onDetected() {} });
  await w.check(true);
  const base = api.reads.modules;
  for (let i = 0; i < 5; i++) await w.check(true);
  w.burst();
  for (let i = 0; i < 5; i++) await w.check();
  assert.ok(api.reads.modules - base <= 0, `모듈 읽기 ${api.reads.modules - base}번`);
});
