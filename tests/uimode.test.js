// 1.7.0 1단계: 화면 모드(간단/고급)·개발자 모드 연동, 메뉴 위치 home 제거, 탭 구성
import test from "node:test";
import assert from "node:assert/strict";
import { createPrefs, normalizeUiMode } from "../src/ui/prefs.js";
import { LAYOUTS, normalizeTheme, DEFAULT_THEME } from "../src/ui/theme.js";
import { TABS, BASE_IDS, MORE_IDS } from "../src/ui/tabs.js";

const memApi = (init = {}) => {
  const store = { ...init };
  return { store, pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } } };
};

test("화면 모드: 기본은 간단, 개발자 모드를 켠 사람은 고급으로 시작", () => {
  assert.equal(normalizeUiMode({}), "simple");
  assert.equal(normalizeUiMode(null), "simple");
  assert.equal(normalizeUiMode({ devMode: true }), "advanced");
  assert.equal(normalizeUiMode({ uiMode: "simple", devMode: true }), "simple");
  assert.equal(normalizeUiMode({ uiMode: "advanced" }), "advanced");
  assert.equal(normalizeUiMode({ uiMode: "엉뚱한값" }), "simple");
});

test("prefs: load → advanced 판정, 간단으로 돌아가면 개발자 모드도 꺼짐", async () => {
  const api = memApi({ "rbm:ui:v1": JSON.stringify({ devMode: true }) });
  const p = createPrefs(api);
  await p.load();
  assert.equal(p.uiMode, "advanced");
  assert.equal(p.advanced, true);
  await p.setUiMode("simple");
  assert.equal(p.advanced, false);
  assert.equal(p.ui.devMode, false);
  assert.equal(JSON.parse(api.store["rbm:ui:v1"]).uiMode, "simple");
  await p.setUiMode("advanced");
  assert.equal(p.ui.devMode, false, "고급으로 올려도 개발자 모드는 저절로 켜지지 않는다");
  assert.equal(p.advanced, true);
});

test("메뉴 위치: home(홈 카드)은 없고 예전 저장값은 left로 옮긴다", () => {
  assert.deepEqual(LAYOUTS.map(([v]) => v), ["left", "top"]);
  assert.equal(DEFAULT_THEME.layout, "left");
  assert.equal(normalizeTheme({ layout: "home" }).layout, "left");
  assert.equal(normalizeTheme({ layout: "top" }).layout, "top");
  assert.equal(normalizeTheme({ layout: "???" }).layout, "left");
  assert.equal(normalizeTheme(undefined).layout, "left");
});

test("탭 구성: 기억·관리·작업실 3개 그룹과 홈", () => {
  assert.deepEqual(BASE_IDS, ["home", "memory"]);
  assert.equal(TABS.some((t) => t.id === "pot" || t.id === "people"), false);
  assert.deepEqual(MORE_IDS, ["cards", "characters", "modules", "plugins", "look", "tools", "settings", "dev"]);
  assert.deepEqual(TABS.filter((t) => t.section === "memory").map((t) => t.id), ["memory", "cards"]);
  assert.deepEqual(TABS.filter((t) => t.section === "manage").map((t) => t.id), ["characters", "modules", "plugins"]);
  assert.deepEqual(TABS.filter((t) => t.section === "work").map((t) => t.id), ["look", "tools", "settings", "dev"]);
  assert.equal(TABS.find((t) => t.id === "dev").dev, true);
  assert.equal(new Set(TABS.map((t) => t.id)).size, TABS.length);
});
