import test from "node:test";
import assert from "node:assert/strict";
import { scanOriginalErosync } from "../src/data/erosyncmigrate.js";
const mk = (data, keys = true) => ({ pluginStorage: { getItem: async (k) => data[k] ?? null, ...(keys ? { keys: async () => Object.keys(data) } : {}) } });
test("원본 기록이 없으면 found=false", async () => {
  const r = await scanOriginalErosync(mk({}));
  assert.equal(r.found, false);
});
test("프로필·캐릭터·세션 개수를 센다", async () => {
  const r = await scanOriginalErosync(mk({
    erosync_profiles_v3: JSON.stringify({ profiles: { a: {}, b: {} } }),
    erosync_character_registry_v3: { entities: { x: {} } },
    "erosync_session_v3:1": "{}", "erosync_session_v3:2": "{}", "erosync_behind_v1:1": "{}"
  }));
  assert.deepEqual([r.found, r.profiles, r.characters, r.sessions, r.behind], [true, 2, 1, 2, 1]);
});
test("keys()가 없어도 깨지지 않는다", async () => {
  const r = await scanOriginalErosync(mk({ erosync_profiles_v3: { profiles: { a: {} } } }, false));
  assert.equal(r.canListSessions, false);
  assert.equal(r.profiles, 1);
});
test("저장소가 없거나 깨진 값이어도 안전", async () => {
  assert.equal((await scanOriginalErosync(null)).found, false);
  assert.equal((await scanOriginalErosync(mk({ erosync_profiles_v3: "{깨짐" }))).profiles, 0);
});
