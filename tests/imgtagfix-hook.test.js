import test from "node:test";
import assert from "node:assert/strict";
import { createImgTagFix } from "../src/data/imgtagfix.js";

function fakeApi(bots, state) {
  const store = new Map([["dusk.ui.imgFix", "on"]]);
  return {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    getCurrentCharacterIndex: async () => state.cur,
    getCharacterFromIndex: async (i) => ({ additionalAssets: bots[i].map((n) => [n, "x", "png"]) }),
    getDatabase: async () => ({ modules: [], enabledModules: [] }),
    addRisuScriptHandler: async () => {},
  };
}

test("switching bots uses that bot's own asset list immediately", async () => {
  const state = { cur: 0 };
  const api = fakeApi([["A_Kim.default", "A_Kim.smiling"], ["B_Lee.default", "B_Lee.angry"]], state);
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="a_kim.Smiling">'), '<img="A_Kim.smiling">');
  state.cur = 1;
  assert.equal(await fx.onOutput('<img="B_Lee.angry">'), '<img="B_Lee.angry">');   // 앞 봇 목록이면 지워졌을 태그
  assert.equal(await fx.onOutput('<img="b_lee.Angry">'), '<img="B_Lee.angry">');
});

test("a bot without assets is left alone", async () => {
  const api = fakeApi([[]], { cur: 0 });
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="Nobody.smiling">'), '<img="Nobody.smiling">');
});
