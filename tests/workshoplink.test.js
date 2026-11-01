import test from "node:test";
import assert from "node:assert/strict";
import { createWorkshopLink, HANDOFF_KEY, WS_PREFIX } from "../src/data/workshop.js";
import { MARK } from "../src/data/workshoppatch.js";

function fakeApi(plugins) {
  const m = new Map();
  return { m, getDatabase: async () => ({ plugins }), pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } };
}
const ws = (script = "//@name risu_story_workshop\n", extra = {}) => ({ name: "risu_story_workshop", displayName: "봇빌더", script, versionOfPlugin: "1.0.1", ...extra });

test("감지: 없음 / 원본 / 꺼짐 / 연동판(등록 전·후)", async () => {
  assert.equal((await createWorkshopLink(fakeApi([{ name: "other" }])).status()).installed, false);
  assert.deepEqual(await createWorkshopLink(fakeApi([ws()])).status(), { installed: true, enabled: true, patched: false, linked: false, version: "1.0.1" });
  assert.equal((await createWorkshopLink(fakeApi([ws(undefined, { enabled: false })])).status()).enabled, false);
  const api = fakeApi([ws("x" + MARK)]);
  assert.equal((await createWorkshopLink(api).status()).linked, false);
  api.m.set("da_interop:reg:risu-story-workshop", JSON.stringify({ spec: 1, id: "risu-story-workshop", actions: [{ key: "open" }, { key: "draft" }] }));
  assert.deepEqual(await createWorkshopLink(api).status(), { installed: true, enabled: true, patched: true, linked: true, version: "1.0.1" });
});
test("인계 저장·읽기·지우기", async () => {
  const api = fakeApi([ws()]), L = createWorkshopLink(api);
  const h = await L.saveHandoff([{ chaId: "a" }, { chaId: "b" }], "manual");
  assert.deepEqual((await L.readHandoff()).ids, ["a", "b"]); assert.equal(h.mode, "manual"); assert.ok(L.alive(h));
  await L.clearHandoff(); assert.equal(api.m.has(HANDOFF_KEY), false);
});
test("원본 봇빌더: 인계 뒤 저장된 가장 최근 저장본을 원고로 (예전 저장본은 무시)", async () => {
  const api = fakeApi([ws()]), L = createWorkshopLink(api), at = Date.parse("2026-11-01T10:00:00Z");
  const slot = (iso, name, targetId = null) => JSON.stringify({ schemaVersion: 1, savedAt: iso, name, session: { targetId, draft: { name, desc: "d" } } });
  api.m.set(WS_PREFIX + "autosave", slot("2026-11-01T10:05:00Z", "새 봇"));
  api.m.set(WS_PREFIX + "manual", slot("2026-11-01T10:07:00Z", "수동 저장", "x1"));
  api.m.set(WS_PREFIX + "autosave-1", slot("2026-11-01T09:00:00Z", "예전"));
  const d = await L.readDraft({ at });
  assert.equal(d.name, "수동 저장"); assert.equal(d.targetId, "x1"); assert.ok(d.started && d.fromSave);
  assert.equal(await L.readDraft({ at: Date.parse("2026-11-01T11:00:00Z") }), null);
});
