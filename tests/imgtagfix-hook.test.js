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

function moduleApi({ botAssets = [], modules, enabled, chats, cur = { chat: 0 } }) {
  const store = new Map([["dusk.ui.imgFix", "on"]]);
  return {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    getCurrentCharacterIndex: async () => 0,
    getCurrentChatIndex: async () => cur.chat,
    getCharacterFromIndex: async () => ({ additionalAssets: botAssets.map((n) => [n, "x", "png"]), chatPage: cur.chat, chats: chats ?? [{ modules: [] }] }),
    getDatabase: async () => ({ modules, enabledModules: enabled }),
    addRisuScriptHandler: async () => {},
  };
}
const mod = (id, names) => ({ id, assets: names.map((n) => [n, "x", "png"]) });

test("bot without assets but with a globally enabled module", async () => {
  const api = moduleApi({ modules: [mod("m1", ["A_Kim.default", "A_Kim.smiling"])], enabled: ["m1"] });
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="a_kim.Smiling">'), '<img="A_Kim.smiling">');
});

test("a module that is not enabled contributes nothing", async () => {
  const api = moduleApi({ modules: [mod("m1", ["A_Kim.smiling"])], enabled: [] });
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="a_kim.Smiling">'), '<img="a_kim.Smiling">');
});

test("modules enabled for this chat win over the global list, and switching chats re-reads", async () => {
  const cur = { chat: 0 };
  const api = moduleApi({
    modules: [mod("m1", ["A_Kim.smiling"]), mod("m2", ["B_Lee.angry"])], enabled: ["m1"], cur,
    chats: [{ modules: ["m2"] }, { modules: [] }],
  });
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="b_lee.Angry">'), '<img="B_Lee.angry">');
  cur.chat = 1;   // 두 번째 채팅은 모듈 지정이 없어 전역(m1)을 쓴다
  assert.equal(await fx.onOutput('<img="a_kim.Smiling">'), '<img="A_Kim.smiling">');
});
