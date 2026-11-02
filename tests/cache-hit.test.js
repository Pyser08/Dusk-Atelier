import test from "node:test";
import assert from "node:assert/strict";
import { prefixInfo } from "../src/engine/turninfo.js";
import { insertFairness } from "../src/engine/fairplay.js";

const dice = { rolls: [10, 20, 30], mode: "reinterpret", hint: false };
test("앞부분 같음: 완전히 같으면 100%, 마지막만 다르면 높은 비율, 깨진 자리·Dusk 원인 표시", () => {
  const a = [{ role: "system", content: "S".repeat(400) }, { role: "assistant", content: "A1" }, { role: "user", content: "U1" }];
  assert.equal(prefixInfo(null, a), null);
  assert.equal(prefixInfo(a, a).ratio, 1);
  const b = [...a.slice(0, 2), { role: "user", content: "완전히 다른 새 입력이에요" }];
  const p = prefixInfo(a, b); assert.ok(p.ratio > 0.9 && p.ratio < 1); assert.equal(p.breakAt, 2); assert.equal(p.dusk, null);
  const c = [a[0], { role: "system", content: "[Dusk Time] 3월 2일" }, ...a.slice(1)];
  const d = [a[0], { role: "system", content: "[Dusk Time] 3월 3일" }, ...a.slice(1)];
  const q = prefixInfo(c, d); assert.equal(q.breakAt, 1); assert.equal(q.dusk, "이야기 시간");
  assert.ok(prefixInfo([{ role: "user", content: "x".repeat(200) }], [{ role: "user", content: "y".repeat(200) }]).ratio < 0.1);
});
test("주사위: 주사위 앞 assistant에 캐시 지점을 하나 찍는다(4개 한도·원본 불변)", () => {
  const m = [{ role: "system", content: "S" }, { role: "user", content: "U1", cachePoint: true }, { role: "assistant", content: "A1" }, { role: "user", content: "U2", cachePoint: true }];
  const out = insertFairness(m, { dice });
  const di = out.findIndex((x) => String(x.content).startsWith("[Dusk Dice]"));
  assert.equal(out[di - 1].content, "A1"); assert.equal(out[di - 1].cachePoint, true); assert.equal(m[2].cachePoint, undefined);
  const noCache = insertFairness(m.map(({ cachePoint, ...x }) => x), { dice });
  assert.equal(noCache.filter((x) => x.cachePoint).length, 1, "리스가 캐시를 안 써도 주사위 앞에 지점을 찍는다");
  assert.equal(noCache[noCache.findIndex((x) => String(x.content).startsWith("[Dusk Dice]")) - 1].cachePoint, true);
  const full = [{ role: "system", content: "S", cachePoint: true }, { role: "assistant", content: "A0", cachePoint: true }, { role: "user", content: "U1", cachePoint: true }, { role: "assistant", content: "A1" }, { role: "user", content: "U2", cachePoint: true }];
  assert.equal(insertFairness(full, { dice }).filter((x) => x.cachePoint).length, 4, "4개면 더하지 않는다");
});
import { createTurnInfo } from "../src/data/turninfo.js";
test("모델 호출 표시: 두 번째 요청부터 응답 아래에 캐시(어림) 줄", async () => {
  const store = new Map(); let now = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, getDatabase: async () => ({ aiModel: "m" }), addRisuReplacer: async () => {}, addRisuScriptHandler: async () => {} };
  const t = createTurnInfo(api, { chip: false, now: () => now }); await t.start(); await t.setCallShow(true);
  const hist = [{ role: "system", content: "긴 시스템 ".repeat(50) }, { role: "user", content: "첫 입력" }];
  await t.beforeRequest(hist, "model"); now = 10; await t.onOutput("첫 번째 응답이에요 길게 길게"); await t.settle();
  assert.ok(!(await t.onDisplay("첫 번째 응답이에요 길게 길게")).includes("캐시(어림)"));
  now = 100; await t.beforeRequest([...hist, { role: "assistant", content: "첫 번째 응답이에요 길게 길게" }, { role: "user", content: "둘째" }], "model");
  now = 110; await t.onOutput("두 번째 응답은 이렇게 나와요"); await t.settle();
  assert.ok((await t.onDisplay("두 번째 응답은 이렇게 나와요")).includes("캐시(어림)"));
});
