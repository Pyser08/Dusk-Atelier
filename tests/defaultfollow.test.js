// 직접 바꾸지 않은 설정은 기본값을 따라간다 (기억 넣기 토큰·기존 인물 로어북 검색).
import test from "node:test";
import assert from "node:assert/strict";
import { followDefaults, noteEdits, DUSK_FOLLOW, POT_FOLLOW, POT_DEFAULTS } from "../src/engine/defaultfollow.js";
import { DEFAULT_SETTINGS } from "../src/data/memorystore.js";
import { createPotStorage } from "../src/data/potstorage.js";
import { SettingsStore } from "../src/engine/pot/settings.js";

test("새 기본값: 기억 넣기 목표 2000 · 상한 8000 · 요약 2000", () => {
  assert.equal(DEFAULT_SETTINGS.inject.targetTokens, 2000);
  assert.equal(DEFAULT_SETTINGS.inject.capTokens, 8000);
  assert.equal(DEFAULT_SETTINGS.inject.eventTokens, 2000);
});

test("기록이 없는 예전 사용자: 예전 기본값이면 새 기본값으로, 직접 바꾼 값은 그대로", () => {
  const s = { inject: { targetTokens: 1200, capTokens: 3000, eventTokens: 600 } };
  const edited = followDefaults(s, DEFAULT_SETTINGS, undefined, DUSK_FOLLOW);
  assert.equal(s.inject.targetTokens, 2000);
  assert.equal(s.inject.eventTokens, 2000);
  assert.equal(s.inject.capTokens, 3000, "예전 기본값(2500)이 아니면 직접 바꾼 것으로 본다");
  assert.deepEqual(edited, ["inject.capTokens"]);
});

test("새로 설치: 새 기본값은 직접 바꾼 것으로 보지 않는다", () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  assert.deepEqual(followDefaults(s, DEFAULT_SETTINGS, undefined, DUSK_FOLLOW), []);
  assert.equal(s.inject.capTokens, 8000);
});

test("직접 바꾼 기록이 있으면 예전 기본값과 같아도 지킨다", () => {
  const s = { inject: { targetTokens: 1200, capTokens: 2500, eventTokens: 600 } };
  const edited = followDefaults(s, DEFAULT_SETTINGS, ["inject.targetTokens"], DUSK_FOLLOW);
  assert.equal(s.inject.targetTokens, 1200);
  assert.equal(s.inject.capTokens, 8000);
  assert.equal(s.inject.eventTokens, 2000);
  assert.deepEqual(edited, ["inject.targetTokens"]);
});

test("기록이 생긴 뒤에는 기록에 없는 값이 모두 기본값을 따라간다", () => {
  const s = { inject: { targetTokens: 1500, capTokens: 2500, eventTokens: 600 } };
  followDefaults(s, DEFAULT_SETTINGS, [], DUSK_FOLLOW);
  assert.equal(s.inject.targetTokens, 2000);
});

test("noteEdits: 바뀐 값만 직접 수정 기록에 추가한다", () => {
  const before = { inject: { targetTokens: 2000, capTokens: 8000, eventTokens: 2000 } };
  const after = { inject: { targetTokens: 2500, capTokens: 8000, eventTokens: 2000 } };
  assert.deepEqual(noteEdits(before, after, [], DUSK_FOLLOW), ["inject.targetTokens"]);
  assert.deepEqual(noteEdits(before, structuredClone(before), ["inject.capTokens"], DUSK_FOLLOW), ["inject.capTokens"]);
});

test("리수폿 기본값: 기존 인물 로어북 검색 켜짐", async () => {
  assert.equal(POT_DEFAULTS.writerSearchExistingLore, true);
  const mem = {};
  const st = new SettingsStore({ getItem: async (k) => mem[k] ?? null, setItem: async (k, v) => { mem[k] = v; }, removeItem: async (k) => { delete mem[k]; } });
  await st.load();
  assert.equal(st.rawSnapshot().writerSearchExistingLore, true);
});

function fakeStore(pot) {
  const idx = { pot };
  return { idx, getIndex: async () => structuredClone(idx), updateIndex: async (fn) => { fn(idx); return idx; } };
}

test("리수폿 저장소: 손대지 않은 '끔'은 켜짐으로 읽고, 직접 끄면 그 뒤로는 끔을 지킨다", async () => {
  const store = fakeStore({ settings: { schemaVersion: 4, settings: { writerSearchExistingLore: false, enabled: true } } });
  const ps = createPotStorage({ pluginStorage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }, store);
  const first = await ps.getItem("risupot.settings");
  assert.equal(first.settings.writerSearchExistingLore, true);
  // 다른 값만 바꿔 저장 → 직접 수정 기록 없음
  await ps.setItem("risupot.settings", { ...first, settings: { ...first.settings, enabled: false } });
  assert.deepEqual(store.idx.pot.edited ?? [], []);
  // 사용자가 직접 끔
  const cur = await ps.getItem("risupot.settings");
  await ps.setItem("risupot.settings", { ...cur, settings: { ...cur.settings, writerSearchExistingLore: false } });
  assert.deepEqual(store.idx.pot.edited, ["writerSearchExistingLore"]);
  assert.equal((await ps.getItem("risupot.settings")).settings.writerSearchExistingLore, false);
  assert.ok(POT_FOLLOW.writerSearchExistingLore);
});
