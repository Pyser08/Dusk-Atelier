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

function moduleApi({ botAssets = [], botModules = [], modules, enabled, chats, cur = { chat: 0 } }) {
  const store = new Map([["dusk.ui.imgFix", "on"]]);
  return {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    getCurrentCharacterIndex: async () => 0,
    getCurrentChatIndex: async () => cur.chat,
    getCharacterFromIndex: async () => ({ additionalAssets: botAssets.map((n) => [n, "x", "png"]), modules: botModules, chatPage: cur.chat, chats: chats ?? [{ modules: [] }] }),
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

test("global, bot-pinned and chat modules all count, and switching chats re-reads", async () => {
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

test("modules pinned to the bot (the usual way) supply the assets", async () => {
  const api = moduleApi({ botModules: ["m1"], modules: [mod("m1", ["A_Kim.default", "A_Kim.smiling"]), mod("m9", ["Z_Other.smiling"])], enabled: [] });
  const fx = createImgTagFix(api, { log: () => {} });
  await fx.start();
  assert.equal(await fx.onOutput('<img="a_kim.Smiling">'), '<img="A_Kim.smiling">');
  assert.equal(await fx.onOutput('<img="Z_Other.smiling">'), "");   // 고정하지 않은 모듈의 에셋은 쓰지 않는다
});

// ── 2차: 알림·직전 상황·스트리밍 중 읽기 ──
function hookApi(state, store = new Map([["dusk.ui.imgFix", "on"], ["dusk.ui.imgFixHint", "on"]])) {
  const calls = { char: 0, replacer: 0 };
  const assets = ["Kaguya.school_uniform.default", "Kaguya.school_uniform.hug", "Kaguya.nude.default", "Kaguya.nude.smiling"];
  return {
    calls,
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } },
    getCurrentCharacterIndex: async () => state.cur,
    getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => { calls.char++; return { additionalAssets: assets.map((n) => [n, "x", "png"]), chats: [{}] }; },
    getDatabase: async () => ({ modules: [], enabledModules: [] }),
    addRisuScriptHandler: async () => {},
    addRisuReplacer: async () => { calls.replacer++; },
  };
}
const req = [
  { role: "system", content: 'Use <img="[Character].[Outfit].[Keyword]">' },
  { role: "assistant", content: '<img="Kaguya.nude.smiling"> 대사' },
  { role: "user", content: "안아 줘" },
];

test("hint is inserted only for the main model request and the reply's missing outfit follows the last one", async () => {
  const api = hookApi({ cur: 0 });
  const fx = createImgTagFix(api, { log: () => {}, streaming: () => false });
  await fx.start();
  assert.equal(api.calls.replacer, 1);
  assert.equal(await fx.beforeRequest(req, "submodel"), req);
  const out = await fx.beforeRequest(req, "model");
  assert.equal(out.length, 4);
  assert.match(out[2].content, /Kaguya — outfit: nude/);
  assert.equal(await fx.onOutput('<img="Kaguya.hug">'), '<img="Kaguya.nude.default">');   // 옷을 지킨다(나)
});

test("hint off: request untouched, but the last outfit is still remembered for fixing", async () => {
  const api = hookApi({ cur: 0 }, new Map([["dusk.ui.imgFix", "on"]]));
  const fx = createImgTagFix(api, { log: () => {}, streaming: () => false });
  await fx.start();
  assert.equal(await fx.beforeRequest(req, "model"), req);
  assert.equal(await fx.onOutput('<img="Kaguya.smiling">'), '<img="Kaguya.nude.smiling">');
});

test("while streaming the bot is not re-read once a list exists", async () => {
  const api = hookApi({ cur: 0 });
  let streamingNow = false, t = 0;
  const fx = createImgTagFix(api, { log: () => {}, streaming: () => streamingNow, now: () => t });
  await fx.start();
  await fx.onOutput('<img="kaguya.nude.Smiling">');
  assert.equal(api.calls.char, 1);
  t += 10 * 60 * 1000; streamingNow = true;   // 캐시가 오래됐어도 스트리밍 중에는 그대로 쓴다
  assert.equal(await fx.onOutput('<img="kaguya.nude.Smiling">'), '<img="Kaguya.nude.smiling">');
  assert.equal(api.calls.char, 1);
});

test("three modules pinned to one bot, each with its own naming rule, all work", async () => {
  const store = new Map([["dusk.ui.imgFix", "on"]]);
  const mod = (id, names) => ({ id, assets: names.map((n) => [n, "x", "png"]) });
  const api = {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async () => {} },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => ({ additionalAssets: [], modules: ["sfw", "nsfw", "extra"], chats: [{}] }),
    getDatabase: async () => ({ enabledModules: [], modules: [
      mod("sfw", ["Amiya_smile", "Amiya_sad", "Amiya_angry"]),
      mod("nsfw", ["Amiya_missionary_sex", "Amiya_missionary_fingering", "Amiya_doggystyle_sex"]),
      mod("extra", ["Kaguya.school_uniform.default", "Kaguya.school_uniform.smiling", "Kaguya.nude.default"]),
      mod("off", ["Ghost_smile"]),
    ] }),
    addRisuScriptHandler: async () => {},
  };
  const fx = createImgTagFix(api, { log: () => {}, streaming: () => false });
  await fx.start();
  assert.equal(await fx.onOutput('<img="amiya_smiling">'), '<img="Amiya_smile">');
  assert.equal(await fx.onOutput('<img="Amiya_missionary">'), '<img="Amiya_missionary_sex">');
  assert.equal(await fx.onOutput('<img="kaguya.school_uniform.Smiling">'), '<img="Kaguya.school_uniform.smiling">');
  assert.equal(await fx.onOutput('<img="Ghost_smile">'), "");   // 연결 안 된 모듈의 캐릭터
});

// ── 릴리스 전 점검 ──
function botApi(ch) {
  const store = new Map([["dusk.ui.imgFix", "on"]]);
  return {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async () => {} },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => ch,
    getDatabase: async () => ({ enabledModules: ["m"], modules: [{ id: "m", assets: [["Other_smile"], ["Other_default"]] }] }),
    addRisuScriptHandler: async () => {},
  };
}
test("emotion images count as assets (tags using them are kept and fixed)", async () => {
  const fx = createImgTagFix(botApi({ additionalAssets: [], emotionImages: [["Yui_smile", "a"], ["Yui_sad", "b"], ["Yui_default", "c"]], chats: [{}] }), { log: () => {}, streaming: () => false });
  await fx.start();
  assert.equal(await fx.onOutput('<img="Yui_smile">'), '<img="Yui_smile">');
  assert.equal(await fx.onOutput('<img="yui_Smiling">'), '<img="Yui_smile">');
});
test("group chats are left alone (member bots' assets are not read)", async () => {
  const fx = createImgTagFix(botApi({ type: "group", additionalAssets: [], chats: [{}] }), { log: () => {}, streaming: () => false });
  await fx.start();
  assert.equal(await fx.onOutput('<img="Member_smile">'), '<img="Member_smile">');
});
