import { test } from "node:test";
import assert from "node:assert/strict";
import { createCellarUpdate } from "../src/data/cellarupdate.js";

const res = (status, body) => ({ status, json: async () => body });
test("확인·적용: POST JSON, 적용하면 재시작된 Cellar가 돌아올 때까지 기다린다", async () => {
  const calls = []; let down = 0;
  const api = { nativeFetch: async (u, o) => {
    if (u.endsWith("/cellar/health")) return down-- > 0 ? res(502, {}) : res(200, { name: "dusk-cellar", version: "0.1.1" });
    const b = JSON.parse(o.body); calls.push(b.action);
    return res(200, b.action === "check" ? { ok: true, behind: 2, canApply: true } : { ok: true, updated: true, restarting: true, fullRestart: false });
  } };
  const up = createCellarUpdate(api, { url: "http://c", via: "native" }, { sleep: async () => {} });
  assert.equal((await up.check()).behind, 2);
  down = 2; const waits = [];
  const r = await up.apply({ onWait: (i) => waits.push(i) });
  assert.equal(r.back.version, "0.1.1"); assert.deepEqual(waits, [0, 1, 2]); assert.deepEqual(calls, ["check", "apply"]);
});

test("이미 최신이면 재시작을 기다리지 않는다", async () => {
  const api = { nativeFetch: async () => res(200, { ok: true, updated: false, restarting: false }) };
  const up = createCellarUpdate(api, { url: "http://c" }, { sleep: async () => { throw new Error("기다리면 안 돼요"); } });
  assert.equal((await up.apply()).back, null);
});

test("서버가 거절하면 그 이유로 실패", async () => {
  const api = { nativeFetch: async () => res(409, { ok: false, error: "고친 파일이 있어서 업데이트하지 않았어요" }) };
  await assert.rejects(createCellarUpdate(api, { url: "http://c" }).apply(), /고친 파일/);
});

test("적용 응답이 끝내 안 오거나 연결이 끊겨도, 다시 연결된 뒤 check로 끝난 걸 확인한다", async () => {
  for (const hang of [true, false]) {
    let down = 2;
    const api = { nativeFetch: async (u, o) => {
      if (u.endsWith("/cellar/health")) return down-- > 0 ? res(502, {}) : res(200, { name: "dusk-cellar", version: "0.1.1" });
      const b = JSON.parse(o.body);
      if (b.action === "apply") { if (hang) return new Promise(() => {}); throw new Error("connection reset"); }
      return res(200, { ok: true, behind: 0, canApply: false });
    } };
    const up = createCellarUpdate(api, { url: "http://c", via: "native" }, { sleep: async () => {} });
    const r = await up.apply({ firstWait: 1 });
    assert.equal(r.back.version, "0.1.1"); assert.equal(r.recovered, true);
  }
});

test("연결이 끊겼는데 아직 새 변경이 남아 있으면 실패로 알린다", async () => {
  const api = { nativeFetch: async (u, o) => {
    if (u.endsWith("/cellar/health")) return res(200, { name: "dusk-cellar", version: "0.1.0" });
    if (JSON.parse(o.body).action === "apply") throw new Error("connection reset");
    return res(200, { ok: true, behind: 2 });
  } };
  await assert.rejects(createCellarUpdate(api, { url: "http://c" }, { sleep: async () => {} }).apply({ firstWait: 1 }), /업데이트하지 못한/);
});

test("서버가 5xx로 이유를 보내면(되돌렸어요 등) 재시작을 기다리지 않고 그 이유로 실패", async () => {
  const api = { nativeFetch: async () => res(500, { ok: false, error: "새 버전을 불러오지 못해서 이전 버전으로 되돌렸어요" }) };
  await assert.rejects(createCellarUpdate(api, { url: "http://c" }, { sleep: async () => { throw new Error("기다리면 안 돼요"); } }).apply({ firstWait: 1 }), /되돌렸어요/);
});
