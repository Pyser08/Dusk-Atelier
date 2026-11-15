import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";

test("저장 실패 오류에 키와 크기가 들어간다(false 반환·throw 둘 다)", async () => {
  for (const mode of ["false", "throw"]) {
    const m = new Map();
    const storage = { getItem: async (k) => m.get(k) ?? null, removeItem: async (k) => { m.delete(k); },
      setItem: async (k, v) => { if (k.includes(".f.")) { if (mode === "false") return false; throw new Error("QuotaExceededError"); } m.set(k, v); } };
    const store = createMemoryStoreV3({ pluginStorage: storage }, { storage });
    await assert.rejects(store.updateFolder("c", "t", (f) => { f.scenes.push({ id: "s", sum: "x" }); }), (e) => /MB/.test(e.message) && /\.f\./.test(e.message) && e.bytes > 0);
  }
});
