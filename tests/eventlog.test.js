import test from "node:test";
import assert from "node:assert/strict";
import { createMemLog, createEventLog, logEvent } from "../src/data/memlog.js";

const mem = () => { const m = new Map(); return { safeLocalStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } } }; };

test("전체 기록: 성공과 실패를 함께 최근 순으로 남기고 키는 가린다", async () => {
  globalThis.__duskMemLog = undefined; globalThis.__duskMemLogAll = undefined;
  const api = mem(), all = createEventLog(api), fails = createMemLog(api);
  await logEvent({ area: "장기 기억 기록", title: "ok", detail: { key: "sk-abcdef1234567890" } });
  await fails.add({ area: "원문 회상", title: "실패", error: new Error("429") });
  await new Promise((r) => setTimeout(r, 10));
  const l = await all.list();
  assert.equal(l.length, 2);
  assert.equal(l[0].kind, "fail"); assert.equal(l[1].kind, "ok");
  assert.ok(!/1234567890/.test(l[1].detail));
  await all.clear(); assert.equal((await all.list()).length, 0);
});
