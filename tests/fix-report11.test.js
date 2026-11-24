// 신고 #11(성능 제안 2차)
import test from "node:test";
import assert from "node:assert/strict";
import { readChar, dropReads } from "../src/data/apiread.js";
import { scopeApi, baseApi, BASE } from "../src/data/addonscope.js";
import { createPrefs } from "../src/ui/prefs.js";
import { createGaugeService } from "../src/data/gauge.js";
import { createRelMapCanvas } from "../src/ui/screens/relmap/canvas.js";

test("SDK Proxy가 Symbol마다 새 함수를 줘도 읽기를 공유한다", async () => {
  let calls = 0; const target = { getCharacterFromIndex: async () => { calls++; return {}; } };
  const sdk = new Proxy(target, { get: (t, k) => k in t ? t[k] : (...a) => Promise.resolve(a) });
  const scoped = scopeApi(sdk).api, twice = scopeApi(scoped).api;
  for (const api of [sdk, scoped, twice, target]) { dropReads(); calls = 0; await readChar(api, 0); await readChar(api, 0); assert.equal(calls, 1); }
  assert.equal(baseApi(twice), sdk); assert.equal(scoped[BASE], sdk);
  dropReads(); calls = 0; await readChar(sdk, 0); await readChar(scoped, 0); assert.equal(calls, 1, "원본과 사본이 같은 칸");
  const old = new Proxy(target, { get: (t, k) => (k === BASE ? target : t[k]) }); assert.equal(baseApi(old), target, "예전 코어의 사본");
});

test("통계는 저장하지 않고 모았다가 flushUi 때 한 번만 쓴다", async () => {
  let n = 0; const st = {}; const p = createPrefs({ pluginStorage: { getItem: async (k) => st[k] ?? null, setItem: async (k, v) => { n++; st[k] = v; } } });
  await p.load(); p.noteUi({ opens: 1 }); p.noteUi({ visited: ["a"] }); assert.equal(n, 0);
  await p.flushUi(); await p.flushUi(); assert.equal(n, 1); assert.equal(JSON.parse(st["rbm:ui:v1"]).opens, 1);
  p.noteUi({ opens: 2 }); await p.saveUi({ x: 1 }); await p.flushUi(); assert.equal(n, 2);
});

const gaugeStore = (read, hold) => ({ getIndex: async () => ({ gauges: { A: { defs: [{ id: "g", name: "기" }], chats: { a1: 1 } }, B: { defs: [], chats: { b1: 1 } }, C: { defs: [{ id: "c", name: "다" }], chats: { c1: 1 } } } }), peekFolder: async (a) => { read.push(a); if (a === "C") await hold; return { gauge: { log: [] } }; } });
test("게이지: 정의 없는 봇은 안 읽고, 지금 채팅이면 다른 봇 폴더를 기다리지 않는다", async () => {
  const read = []; let go; const hold = new Promise((r) => { go = r; });
  const g = createGaugeService({}, { store: gaugeStore(read, hold), current: async () => ({ chaId: "A", chatId: "a1" }) });
  assert.equal(await Promise.race([g.onDisplay("안녕하세요 반갑습니다"), new Promise((r) => setTimeout(() => r("느림"), 200))]), "안녕하세요 반갑습니다");
  assert.ok(!read.includes("B")); go();
  const g2 = createGaugeService({}, { store: gaugeStore([], Promise.resolve()), current: async () => null });
  assert.equal(await g2.onDisplay("글"), "글");
});

test("관계도: 가만히 있으면 프레임을 멈추고, 조작하면 다시 그린다", async () => {
  const raf = [], timers = []; let measures = 0, now = 0; const real = performance.now; performance.now = () => now;
  try {
    const grad = { addColorStop() {} };
    const g2d = new Proxy({ measureText: () => { measures++; return { width: 10 }; }, createRadialGradient: () => grad, createLinearGradient: () => grad, getImageData: () => ({ data: [0, 0, 0] }) }, { get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
    const L = {}, el = () => ({ getContext: () => g2d, classList: { toggle() {} }, addEventListener: (k, f) => { L[k] = f; }, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400, bottom: 0 }), isConnected: true, style: {} });
    const win = { matchMedia: () => ({ matches: false }), document: { hidden: false, createElement: el }, getComputedStyle: () => ({ getPropertyValue: () => "" }), requestAnimationFrame: (f) => raf.push(f), setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1][0] = null; }, devicePixelRatio: 1 };
    let err = 0; const c = createRelMapCanvas({ stage: el(), canvas: el(), tipEl: el(), win, onToast: () => err++ });
    c.setData({ nodes: [{ id: "a", name: "하나", aff: 50, imp: 60, faction: "", status: "", records: 1 }], edges: [] });
    c.setSpin(false); c.setHighlight(false); c.start();
    let k = 0; const run = (max) => { let n = 0; while (raf.length && n < max) { now += 16; raf.shift()(now); n++; } return n; };
    k = run(600); assert.equal(err, 0); assert.ok(k < 600, "멈춰야 함"); assert.equal(timers.at(-1)[1], 1000);
    measures = 0; c.setFlat(true); assert.equal(raf.length, 1, "바로 다시 그린다"); run(600); assert.ok(measures <= 1, "글자 폭은 기억한다: " + measures);
    L.wheel({ preventDefault() {}, deltaY: -10 }); assert.equal(raf.length, 1);
    c.destroy(); assert.equal(run(5), 1); assert.equal(raf.length, 0);
  } finally { performance.now = real; }
});
