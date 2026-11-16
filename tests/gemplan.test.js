import test from "node:test";
import assert from "node:assert/strict";
import { geminiCacheKind, minCacheTokens, cacheBoundary, planGemini, prefixKey, moveVolatileAfterUser } from "../src/engine/provider/gemplan.js";

test("모델 이름으로 방식 판정", () => {
  for (const m of ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-3.5-flash-lite", "models/gemini-3.8-flash"]) assert.equal(geminiCacheKind(m), "explicit", m);
  for (const m of ["gemini-4-carbon", "gemini-4-hydrogen", "gemini-4-argon", "gemini-3-pro-image", "gemini-2.0-flash", ""]) assert.equal(geminiCacheKind(m), "implicit", m);
  assert.equal(minCacheTokens("gemini-2.5-flash"), 2048); assert.equal(minCacheTokens("gemini-3-flash"), 4096);
});
test("경계: cachePoint 우선, 없으면 마지막 사용자 말과 바로 앞 시스템 블록 제외", () => {
  const S = (c, cp) => ({ role: "system", content: c, ...(cp ? { cachePoint: true } : {}) }), U = { role: "user", content: "u" }, A = { role: "assistant", content: "a" };
  assert.equal(cacheBoundary([S("s"), U, A, S("기억"), S("시간"), U]), 3);
  assert.equal(cacheBoundary([S("s", true), U, A, U]), 1);
  assert.equal(cacheBoundary([U]), 0);
});
const base = (o = {}) => { const hashes = ["a", "b", "c", "d", "e", "f"], tokens = [3000, 1000, 1000, 1000, 1000, 50]; return { model: "gemini-2.5-flash", hashes, tokens, boundary: 5, userTurns: 3, now: 1e6, cfg: { grow: 4500 }, ...o }; };
test("처음: 충분히 크면 경계까지 새로 만든다 · 이르거나 작으면 안 만든다", () => {
  assert.deepEqual(planGemini(base()).action, "create"); assert.equal(planGemini(base()).n, 5);
  assert.equal(planGemini(base({ userTurns: 1 })).reason, "early");
  assert.equal(planGemini(base({ boundary: 1, tokens: [1000] })).reason, "small");
  assert.equal(planGemini(base({ model: "gemini-4-carbon" })).reason, "implicit-model");
  assert.equal(planGemini(base({ tools: true })).reason, "tools");
});
test("재사용: 앞부분이 같으면 use, 캐시 밖이 grow 넘게 늘면 경계를 옮겨 새로", () => {
  const have = { name: "cachedContents/x", n: 3, prefix: prefixKey(["a", "b", "c"], 3), tokens: 5000, expires: 1e6 + 600e3 };
  const p = planGemini(base({ have })); assert.equal(p.action, "use"); assert.equal(p.n, 3); assert.equal(p.extend, false);
  const big = planGemini(base({ have, tokens: [3000, 1000, 1000, 5000, 1000, 0] })); assert.equal(big.action, "create"); assert.equal(big.replace, true);
  assert.equal(planGemini(base({ have, tokens: [3000, 1000, 1000, 5000, 1000, 0], lastAt: 1e6 - 5000 })).action, "use", "짧은 간격엔 새로 만들지 않음");
  assert.equal(planGemini(base({ have: { ...have, expires: 1e6 + 60e3 } })).extend, true, "곧 끝나면 연장");
});
test("앞부분이 달라졌는데 짧은 간격·리롤이면 자동 캐시에 맡긴다", () => {
  const have = { name: "x", n: 3, prefix: "zzz", tokens: 5000, expires: 1e6 + 600e3 };
  assert.equal(planGemini(base({ have, reroll: true })).reason, "bypass");
  assert.equal(planGemini(base({ have, lastAt: 1e6 - 1000 })).reason, "bypass");
  const p = planGemini(base({ have })); assert.equal(p.action, "create"); assert.equal(p.replace, true);
});
test("자동 캐시 앞부분 지키기: 사용자 말 앞 시스템 블록을 뒤로", () => {
  const m = [{ role: "system", content: "s" }, { role: "user", content: "1" }, { role: "assistant", content: "2" }, { role: "system", content: "기억" }, { role: "user", content: "3" }];
  assert.deepEqual(moveVolatileAfterUser(m).map((x) => x.content), ["s", "1", "2", "3", "기억"]);
  const same = [{ role: "system", content: "s" }, { role: "user", content: "1" }]; assert.equal(moveVolatileAfterUser(same), same);
});
import { storagePrice, storageCost, addRecord, summarize } from "../src/engine/provider/cost.js";
import { createGeminiCache } from "../src/data/provider/gemcache.js";
test("캐시 보관 비용: 단가 어림·계산·합계(호출 수엔 안 셈)", async () => {
  assert.equal(storagePrice({}, "gemini-2.5-pro"), 4.5); assert.equal(storagePrice({ cstore: 2 }, "gemini-2.5-pro"), 2); assert.equal(storagePrice({ cstore: null }, "gemini-2.5-flash"), 1);
  assert.equal(storageCost(1e6, 3600, 1), 1);
  let log = addRecord([], { usage: { input: 10 }, cost: 0.5, saved: 0.3 }); log = addRecord(log, { usage: null, cost: 0.1, storeCost: 0.1, via: "cache-store" });
  const t = summarize(log).total; assert.equal(t.calls, 1); assert.ok(Math.abs(t.store - 0.1) < 1e-9); assert.ok(Math.abs(t.all - 0.6) < 1e-9);
  let now = 1e6; const gc = createGeminiCache({ now: () => now }); let k = 0;
  const transport = { send: async (r) => (r.method === "GET" ? { ok: true, json: async () => ({ cachedContents: [] }) } : { ok: true, json: async () => ({ name: `cachedContents/${++k}` }) }) };
  const conn = { id: "c", kind: "google", baseUrl: "https://g" }, profile = { model: "gemini-2.5-flash", cache: { gemini: "auto", geminiTtl: 600 } };
  const big = "설정 ".repeat(3000), m = [{ role: "system", content: big }, { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }];
  await gc.prepare({ conn, profile, messages: m, cred: "K", transport }); const st = gc.takeStorage(); assert.equal(st.length, 1); assert.equal(st[0].seconds, 600); assert.ok(st[0].tokens > 2000);
  assert.equal(gc.takeStorage().length, 0, "꺼내면 비움");
});
