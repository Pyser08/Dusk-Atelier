// DA Interop 동작(actions) 확장: 스니펫(B 플러그인 쪽)과 Dusk 쪽 sendAction/waitAction을 같은 가짜 저장소로 묶어 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { INTEROP_SNIPPET } from "../src/data/interopSnippet.js";
import { readInterop, hasAction, sendAction, waitAction, runAction, pruneInterop, listInterop } from "../src/data/plugins.js";

function fakeApi() {
  const m = new Map();
  return { m, pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] } };
}
// 스니펫을 B 플러그인처럼 실행한다. setInterval은 잡아 두었다가 테스트가 직접 돌린다.
function loadSnippet(api) {
  const timers = [];
  const g = { Risuai: api, setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; } };
  const reg = new Function("globalThis", "setInterval", "document", INTEROP_SNIPPET + "\nreturn registerInterop;")(g, g.setInterval, undefined);
  return { reg, tick: async (ms) => { for (const t of timers) if (t.ms === ms) await t.fn(); await new Promise((r) => setTimeout(r, 5)); } };
}

test("동작을 등록하면 Dusk가 목록·등록 정보에서 볼 수 있다", async () => {
  const api = fakeApi(); const { reg } = loadSnippet(api);
  await reg({ id: "workshop", name: "봇빌더", pluginName: "risu_story_workshop", actions: [{ key: "open", label: "열기", run: () => ({ opened: true }) }, { key: "BAD KEY", run: () => 1 }] });
  const e = await readInterop(api, "workshop");
  assert.deepEqual(e.actions, [{ key: "open", label: "열기", description: "" }]);
  assert.ok(hasAction(e, "open") && !hasAction(e, "draft"));
  const list = await listInterop(api, new Set(["risu_story_workshop"]));
  assert.equal(list[0].actions.length, 1);
});

test("apply 없이 actions만 있어도 등록되고, 둘 다 없으면 오류", async () => {
  const api = fakeApi(); const { reg } = loadSnippet(api);
  await assert.rejects(() => reg({ id: "x1" }), /apply/);
  assert.ok(await reg({ id: "x2", actions: [{ key: "ping", run: () => "pong" }] }));
});

test("요청한 동작을 한 번만 실행하고 결과를 돌려준다", async () => {
  const api = fakeApi(); const { reg, tick } = loadSnippet(api);
  let n = 0;
  await reg({ id: "ws", actions: [{ key: "draft", run: (args) => { n++; return { name: "봇", args }; } }] });
  const rev = await sendAction(api, "ws", "draft", { a: 1 });
  const wait = waitAction(api, "ws", rev, 2000, 10);
  await tick(1000);
  const r = await wait;
  assert.deepEqual(r, { ok: true, result: { name: "봇", args: { a: 1 } }, error: null });
  await tick(1000); await tick(1000);
  assert.equal(n, 1);
});

test("실패·없는 동작은 오류로 돌려주고, 응답이 없으면 timeout", async () => {
  const api = fakeApi(); const { reg, tick } = loadSnippet(api);
  await reg({ id: "ws", actions: [{ key: "boom", run: () => { throw new Error("깨짐"); } }] });
  let rev = await sendAction(api, "ws", "boom"); let w = waitAction(api, "ws", rev, 2000, 10); await tick(1000);
  assert.deepEqual(await w, { ok: false, result: null, error: "깨짐" });
  rev = await sendAction(api, "ws", "nope"); w = waitAction(api, "ws", rev, 2000, 10); await tick(1000);
  assert.match((await w).error, /unknown action/);
  assert.equal((await runAction(fakeApi(), "none", "open", null, 60)).error, "timeout");
});

test("오래된 요청은 플러그인이 나중에 켜져도 실행하지 않는다", async () => {
  const api = fakeApi();
  api.m.set("da_interop:action:ws", JSON.stringify({ rev: 3, key: "open", updatedAt: Date.now() - 60000 }));
  const { reg, tick } = loadSnippet(api); let opened = 0;
  await reg({ id: "ws", actions: [{ key: "open", run: () => { opened++; } }] });
  await tick(1000);
  const e = await readInterop(api, "ws");
  assert.equal(opened, 0); assert.equal(e.actionRev, 3); assert.equal(e.actionError, "expired");
  const rev = await sendAction(api, "ws", "open");
  assert.equal(rev, 4);
  const w = waitAction(api, "ws", rev, 2000, 10); await tick(1000);
  assert.equal((await w).ok, true); assert.equal(opened, 1);
});

test("값 패치(apply)와 동작 결과가 서로 지우지 않는다", async () => {
  const api = fakeApi(); const { reg, tick } = loadSnippet(api); let applied = null;
  await reg({ id: "ws", fields: [{ key: "a", type: "number", default: 1 }], apply: (v) => { applied = v; }, actions: [{ key: "ping", run: () => "pong" }] });
  const rev = await sendAction(api, "ws", "ping"); const w = waitAction(api, "ws", rev, 2000, 10); await tick(1000); await w;
  api.m.set("da_interop:patch:ws", JSON.stringify({ rev: 1, values: { a: 5 } }));
  await tick(3000);
  const e = await readInterop(api, "ws");
  assert.deepEqual(applied, { a: 5 }); assert.equal(e.appliedRev, 1); assert.equal(e.actionResult, "pong"); assert.equal(e.actionRev, rev);
  await pruneInterop(api, "ws");
  assert.equal([...api.m.keys()].filter((k) => k.endsWith(":ws")).length, 0);
});
