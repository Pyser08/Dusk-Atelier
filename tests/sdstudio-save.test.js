import { test } from "node:test";
import assert from "node:assert/strict";
import { createSdStudio } from "../src/data/sdstudio.js";
test("겹친 저장은 한 줄로 — 뒤 저장 때문에 '달라요'가 나지 않고 마지막 것이 남음", async () => {
  const mem = {};
  const api = { pluginStorage: { setItem: async (k, v) => { await new Promise((r) => setTimeout(r, 5)); mem[k] = v; }, getItem: async (k) => { await new Promise((r) => setTimeout(r, 5)); return mem[k] ?? null; } } };
  const sd = createSdStudio(api);
  const t = { kind: "character", id: "c1" };
  await Promise.all([1, 2, 3, 4, 5].map((n) => sd.saveProject(t, { n })));
  const k = Object.keys(mem).find((x) => !x.endsWith(".t"));
  assert.equal(JSON.parse(mem[k]).n, 5);
});
