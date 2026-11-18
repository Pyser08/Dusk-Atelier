// Risu64 연동: Risu64가 DA Interop 'obfuscate' 동작을 등록해 두면 Dusk의 모든 모델 요청 메시지를 먼저 거기로 보내 난독화한다.
import test from "node:test";
import assert from "node:assert/strict";
import { INTEROP_SNIPPET } from "../src/data/interopSnippet.js";
import { r64Messages, r64Opts, _resetR64 } from "../src/data/risu64link.js";

function fakeApi() {
  const m = new Map();
  return { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] } };
}
// Risu64처럼 스니펫을 실행하고, 동작 확인 주기를 짧게 자동으로 돌린다
async function fakeRisu64(api, run) {
  const timers = [];
  const g = { Risuai: api, setInterval: (fn, ms) => { const t = setInterval(fn, 5); timers.push(t); return t; } };
  const reg = new Function("globalThis", "setInterval", "document", INTEROP_SNIPPET + "\nreturn registerInterop;")(g, g.setInterval, undefined);
  await reg({ id: "risu64", actions: [{ key: "obfuscate", run }] });
  return () => timers.forEach(clearInterval);
}
const MSGS = [{ role: "system", content: "sys" }, { role: "user", content: "hello" }];

test("Risu64가 없으면 메시지를 그대로 돌려준다", async () => {
  _resetR64();
  assert.deepEqual(await r64Messages(fakeApi(), MSGS), MSGS);
});

test("Risu64 obfuscate 동작이 있으면 난독화된 메시지로 바꾼다", async () => {
  _resetR64();
  const api = fakeApi();
  const stop = await fakeRisu64(api, ({ messages, source }) => ({ messages: messages.map((x) => ({ ...x, content: `${source}:${x.content.toUpperCase()}` })) }));
  try {
    const out = await r64Messages(api, MSGS);
    assert.deepEqual(out.map((x) => x.content), ["dusk:SYS", "dusk:HELLO"]);
    const opts = await r64Opts(api, { messages: MSGS, mode: "submodel" });
    assert.equal(opts.mode, "submodel");
    assert.equal(opts.messages[1].content, "dusk:HELLO");
  } finally { stop(); }
});

test("동시에 여러 요청이 와도 하나씩 처리해 서로 덮지 않는다", async () => {
  _resetR64();
  const api = fakeApi();
  const stop = await fakeRisu64(api, ({ messages }) => ({ messages: messages.map((x) => ({ ...x, content: "#" + x.content })) }));
  try {
    const outs = await Promise.all(["a", "b", "c"].map((c) => r64Messages(api, [{ role: "user", content: c }])));
    assert.deepEqual(outs.map((o) => o[0].content), ["#a", "#b", "#c"]);
  } finally { stop(); }
});

test("Risu64가 이상한 결과나 오류를 주면 원래 메시지로 보낸다", async () => {
  _resetR64();
  const api = fakeApi();
  const stop = await fakeRisu64(api, () => ({ messages: "bad" }));
  try { assert.deepEqual(await r64Messages(api, MSGS), MSGS); } finally { stop(); }
  _resetR64();
  const api2 = fakeApi();
  const stop2 = await fakeRisu64(api2, () => { throw new Error("boom"); });
  try { assert.deepEqual(await r64Messages(api2, MSGS), MSGS); } finally { stop2(); }
});

test("메시지가 없는 호출은 건드리지 않는다", async () => {
  _resetR64();
  const o = { prompt: "x" };
  assert.equal(await r64Opts(fakeApi(), o), o);
});
