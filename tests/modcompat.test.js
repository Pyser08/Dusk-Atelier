import test from "node:test";
import assert from "node:assert/strict";
import { buildContext, protectOutput, prepareDisplay, unwrap, runChain, groupSubjects, resolveName, keyOf, nameTemplate, planRender, collectScripts, WJ } from "../src/engine/modcompat.js";
import { buildBlock, exampleTemplate, synthTemplate, injectBlock, promptSubjects, MARK } from "../src/engine/modcompatprompt.js";
import { createModCompat } from "../src/data/modcompat.js";
import { managedNames, inferFoundValue, varUpdates, setvarText, getvarNames } from "../src/engine/modcompatvars.js";
import { hunterBot, univBot, plainBot, hunterExtra, selfModule, univExtra } from "./fixtures/modcompat.js";

const ctxOf = (bot, modules) => buildContext({ botAssets: bot.additionalAssets, modules, botScripts: bot.customscript });
// 리스 저장 흐름 흉내: 플러그인 output 훅 → 봇 응답 수정 정규식
const save = (text, ctx) => runChain(protectOutput(text, ctx).text, ctx.scripts, "editoutput");

test("화이트리스트 봇: 모듈 이미지 태그가 응답 저장 뒤에도 남는다(훅 없으면 지워진다)", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  const reply = `류해연이 웃었다.\n<img="Ryu Hae-yeon smile">\n끝.`;
  assert.ok(!runChain(reply, ctx.scripts, "editoutput").includes("Ryu Hae-yeon"), "봇 정규식만이면 지워짐");
  const stored = save(reply, ctx);
  assert.ok(stored.includes("Ryu Hae-yeon smile"));
  assert.ok(unwrap(stored).includes(`<img="Ryu Hae-yeon smile">`));
});

test("봇 자신의 이미지 태그는 건드리지 않는다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  const reply = `<img="Min Chae-rin smile">`;
  assert.equal(protectOutput(reply, ctx).text, reply);
});

test("봇에 같은 이름이 있으면 봇 이미지를 쓴다(모듈 쪽은 등록부에서 빠짐)", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  assert.ok(!ctx.reg.mod.has(keyOf("Kang Min-hyuk angry")));
  assert.ok(ctx.reg.bot.has(keyOf("Kang Min-hyuk angry")));
});

test("지우는 정규식이 없으면 감싸지 않는다", () => {
  const ctx = ctxOf(plainBot, [hunterExtra]);
  const reply = `<img="Park In-joon angry">`;
  assert.equal(protectOutput(reply, ctx).text, reply);
});

test("표시: 봇 그리기 정규식이 그 이름을 찾을 수 있으면 태그를 그대로 두어 봇이 그린다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  const stored = save(`<img="Ryu Hae-yeon angry">`, ctx);
  const shown = prepareDisplay(stored, ctx);
  assert.ok(shown.includes(`<img="Ryu Hae-yeon angry">`));
  assert.ok(!shown.includes(WJ));
});

test("표시: {{assetlist}}로 확인하는 봇은 같은 정규식을 모듈 이름으로 대신 적용하고, 다시 걸리지 않는다", () => {
  const ctx = ctxOf(univBot, [univBot.module, univExtra]);
  const shown = prepareDisplay(`민지가 화냈다.\n<img src=minji_angry>`, ctx);
  assert.ok(!shown.includes("<img src=minji_angry>"));
  assert.ok(shown.includes(`{{raw::minji_angry.png}}`), shown);
  assert.ok(shown.includes(`"minji_angry.png"`), "assetlist 자리에 모듈 이름 목록");
  assert.ok(!/\{\{\s*assetlist\s*\}\}/.test(shown));
  assert.ok(shown.includes("{{#if {{greater_equal::{{chat_index}}"), "봇의 최근 5개 조건 같은 CBS는 그대로");
  const disp = ctx.scripts.filter((s) => s.type === "editdisplay" && s.comment === "👰ASSET");
  assert.ok(disp.every((s) => { s.re.lastIndex = 0; return !s.re.test(shown); }));
});

test("표시: 대학 봇 자기 이미지는 그대로 둔다", () => {
  const ctx = ctxOf(univBot, [univBot.module, univExtra]);
  assert.equal(prepareDisplay(`<img src=hayeon_angry>`, ctx), `<img src=hayeon_angry>`);
});

test("표시: 그리기 정규식이 없는 봇은 리스 기본 {{img::이름}}으로 그린다", () => {
  const ctx = ctxOf(plainBot, [hunterExtra]);
  assert.equal(prepareDisplay(`<img="Park In-joon smile">`, ctx), `{{img::Park In-joon smile}}`);
  assert.equal(prepareDisplay(`<img src="Park In-joon smile">`, ctx), `{{img::Park In-joon smile}}`);
});

test("요청: 감싼 표식은 원래 태그로 돌아가 봇 요청 정규식이 자기 태그처럼 다룬다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  const stored = save(`<img="Ryu Hae-yeon smile">`, ctx);
  assert.equal(unwrap(stored).trim(), `<img="Ryu Hae-yeon smile">`);
});

test("단단히 감싸기: 모든 <…> 태그를 지우는 봇에서도 남는다", () => {
  const bot = { ...hunterBot, customscript: [...hunterBot.customscript, { in: "<[^>]+>", out: "", type: "editoutput" }, { in: "⁠", out: "", type: "editoutput" }] };
  const ctx = ctxOf(bot, [hunterExtra]);
  const stored = save(`a <img="Park In-joon smile"> b`, ctx);
  assert.ok(unwrap(stored).includes(`<img="Park In-joon smile">`));
});

test("이름이 조금 틀리면 같은 인물의 가장 가까운 표정으로 고친다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  assert.equal(resolveName("Ryu Hae-yeon angy", ctx.reg)?.name, "Ryu Hae-yeon angry");
  assert.equal(resolveName("Ryu Hae-yeon", ctx.reg)?.name, "Ryu Hae-yeon default");
  assert.equal(resolveName("Ryu Hae-yeon furious screaming", ctx.reg)?.name, "Ryu Hae-yeon default");
  assert.equal(resolveName("Nobody angry", ctx.reg), null);
  const stored = save(`<img="Ryu Hae-yeon angy">`, ctx);
  assert.ok(unwrap(stored).includes(`<img="Ryu Hae-yeon angry">`));
});

test("스스로 그리는 모듈은 자기 정규식이 그리고, 모델 안내에서 빠진다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra, selfModule]);
  const tag = `<img="Ernest Melville">`;
  const plan = planRender(tag, ctx, resolveName("Ernest Melville", ctx.reg));
  assert.equal(plan.how, "keep");
  assert.equal(plan.renderer.comment, "카드");
  const ps = promptSubjects(ctx);
  assert.ok(ps.selfRender.includes("obang"));
  assert.ok(!ps.chars.some((c) => c.name === "Ernest Melville") && !ps.singles.includes("Ernest Melville"));
});

test("그리기 정규식이 '.png'를 붙여 찾으면(이름이 안 맞으면) 대신 적용한다", () => {
  const bot = { ...plainBot, customscript: [{ in: `<img="(.*?)">`, out: `<img src="{{raw::$1.png}}">`, type: "editdisplay" }] };
  const ctx = ctxOf(bot, [hunterExtra]);
  const hit = resolveName("Park In-joon angry", ctx.reg);
  assert.equal(planRender(`<img="Park In-joon angry">`, ctx, hit).how, "inline");
  const shown = prepareDisplay(`<img="Park In-joon angry">`, ctx);
  assert.ok(shown.includes("{{raw::Park In-joon angry}}"), shown);
  assert.ok(shown.includes("<img x-dusk-mc"), "다시 걸리지 않게 표식");
});

test("인물·표정 묶기: 공백·밑줄 구분 모두", () => {
  const g = groupSubjects(["Ryu Hae-yeon angry", "Ryu Hae-yeon blushing shyly", "Park In-joon angry", "Park In-joon blushing shyly", "minji_angry.png", "sora_angry.png", "cover"]);
  const by = Object.fromEntries(g.map((x) => [x.name, x]));
  assert.deepEqual(by["Ryu Hae-yeon"].variants.map((v) => v.variant).sort(), ["angry", "blushing shyly"]);
  assert.equal(by["minji"].sep, "_");
  assert.equal(by["cover"].variants.length, 0);
});

test("이름 틀: 에셋 CBS 안의 캡처를 쓴다", () => {
  assert.equal(nameTemplate("<div>{{raw::$1 $2}}</div>"), "$1 $2");
  assert.equal(nameTemplate(`{{settempvar::x::{{trim::$1}}}}{{raw::{{gettempvar::x}}}}`), "$1");
  assert.equal(nameTemplate(`<img src="{{raw::$1.png}}">`), "$1");
});

test("모델 안내: 봇 글의 실제 예시 모양을 쓰고, 공통 표정·인물 목록을 넣는다", () => {
  const ctx = ctxOf(hunterBot, [hunterExtra]);
  const tpl = exampleTemplate([hunterBot.globalNote], ctx);
  assert.equal(tpl, `<img="{name}">`);
  const block = buildBlock(ctx, { template: tpl, recent: "박인준이 들어왔다 Park In-joon" });
  assert.ok(block.startsWith(MARK));
  assert.ok(block.includes(`<img="{name}">`));
  assert.ok(/Variants for every character: .*angry/.test(block));
  assert.ok(block.includes("Ryu Hae-yeon") && block.includes("Park In-joon"));
  assert.ok(/e\.g\. <img="Park In-joon /.test(block), "최근에 나온 인물을 먼저");
  assert.ok(!block.includes("Kang Min-hyuk"), "봇 인물은 넣지 않는다");
});

test("모델 안내: 대학 봇은 <img src={name}> 꼴, 밑줄 구분", () => {
  const ctx = ctxOf(univBot, [univBot.module, univExtra]);
  const tpl = exampleTemplate([univBot.globalNote], ctx);
  assert.equal(tpl, "<img src={name}>");
  const block = buildBlock(ctx, { template: tpl });
  assert.ok(block.includes(`"<character>_<variant>"`));
  assert.ok(block.includes("minji") && block.includes("sora"));
});

test("예시가 없으면 그리기 정규식에서 모양을 만든다", () => {
  assert.equal(synthTemplate(ctxOf(hunterBot, [])), `<img="{name}">`);
  assert.equal(synthTemplate(ctxOf(univBot, [univBot.module])), "<img src={name}>");
  assert.equal(synthTemplate(ctxOf(plainBot, [])), `<img src="{name}">`);
  const ob = buildContext({ botAssets: [], modules: [selfModule], botScripts: [] });
  assert.equal(synthTemplate(ob), `<img="{name}">`);
});

test("안내 블록은 요청 사본에 하나만 들어간다", () => {
  const msgs = [{ role: "system", content: "sys" }, { role: "user", content: "hi", memo: "m1" }];
  const once = injectBlock(msgs, `${MARK}\nA`);
  const twice = injectBlock(once, `${MARK}\nB`);
  assert.equal(twice.filter((m) => String(m.content).startsWith(MARK)).length, 1);
  assert.equal(twice[1].content, `${MARK}\nB`);
  assert.equal(msgs.length, 2, "원본 배열은 그대로");
  assert.equal(injectBlock(twice, "").length, 2);
});

test("리스와 같은 순서: <order N>이 있으면 큰 것부터", () => {
  const list = collectScripts({ bot: [{ in: "a", out: "", type: "editoutput" }], modules: [{ id: "m", regex: [{ in: "b", out: "", type: "editoutput", ableFlag: true, flag: "g<order 10>" }] }] });
  assert.deepEqual(list.map((s) => s.src), ["b", "a"]);
  assert.equal(collectScripts({ bot: [{ in: "x", out: "", type: "disabled" }] }).length, 0);
});

// ---- 데이터 층(가짜 리스 api) ----
function fakeApi({ bot, modules, chat = { message: [] }, chars = null, cur = 0 }) {
  const calls = { char: 0 };
  const list = chars ?? [bot];
  const api = {
    getCurrentCharacterIndex: async () => cur, getCurrentChatIndex: async () => (cur >= 0 ? 0 : -1),
    getCharacterFromIndex: async (i) => { calls.char++; return list[i] ? structuredClone(list[i]) : null; },
    getChatFromIndex: async () => structuredClone(chat),
    setChatToIndex: async (ci, ti, c) => { chat.message = c.message; },
    getDatabase: async (keys) => keys.includes("modules") ? { modules, enabledModules: modules.map((m) => m.id) } : keys.includes("characterOrder") ? { characterOrder: list.map((c) => c.chaId) } : {}
  };
  return { api, calls, chat };
}
const mem = () => { const m = new Map(); return { get: async (k, f) => (m.has(k) ? m.get(k) : f), set: async (k, v) => { m.set(k, v); } }; };

test("훅: 응답 저장·표시·요청이 한 흐름으로 동작한다", async () => {
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra] });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  const out = await mc.onOutput(`<img="Ryu Hae-yeon smile">`);
  assert.notEqual(out, `<img="Ryu Hae-yeon smile">`);
  assert.ok((await mc.onDisplay(out)).includes(`<img="Ryu Hae-yeon smile">`));
  assert.equal(mc.onProcess(out), `<img="Ryu Hae-yeon smile">`);
  const msgs = await mc.beforeRequest([{ role: "system", content: hunterBot.globalNote }, { role: "user", content: "hi", memo: "x" }], "model");
  assert.ok(msgs.some((m) => String(m.content).startsWith(MARK)));
  assert.equal((await mc.beforeRequest([{ role: "user", content: "q" }], "submodel")).length, 1, "본 응답 요청에만");
});

test("훅: 이 봇에서 끄면 아무것도 바꾸지 않는다", async () => {
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra] });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  await mc.setBotCfg("hunter", { on: false });
  await mc.current({ force: true });
  assert.equal(await mc.onOutput(`<img="Ryu Hae-yeon smile">`), `<img="Ryu Hae-yeon smile">`);
  const msgs = await mc.beforeRequest([{ role: "user", content: "q", memo: "x" }], "model");
  assert.ok(!msgs.some((m) => String(m.content).startsWith(MARK)));
});

test("훅: 표시 훅이 연달아 불려도 봇 카드를 다시 읽지 않는다", async () => {
  let t = 1000;
  const { api, calls } = fakeApi({ bot: hunterBot, modules: [hunterExtra] });
  const mc = createModCompat(api, { storage: mem(), log: () => {}, now: () => t });
  await mc.loadSettings();
  for (let i = 0; i < 20; i++) { await mc.onDisplay(`<img="Ryu Hae-yeon smile"> ${i}`); t += 100; }
  assert.equal(calls.char, 1);
});

test("훅: 모듈 이미지가 없으면 글을 그대로 둔다", async () => {
  const { api } = fakeApi({ bot: hunterBot, modules: [] });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  assert.equal(await mc.onOutput(`<img="Ryu Hae-yeon smile">`), `<img="Ryu Hae-yeon smile">`);
});

test("이 채팅의 지킴 표식 풀기", async () => {
  const chat = { message: [{ role: "char", data: "" }, { role: "user", data: "x" }] };
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra], chat });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  chat.message[0].data = await mc.onOutput(`<img="Ryu Hae-yeon smile">`);
  assert.equal(await mc.unwrapChat(), 1);
  assert.equal(chat.message[0].data, `<img="Ryu Hae-yeon smile">`);
});

test("진단: 모듈별 처리 방식과 겹침을 알려 준다", async () => {
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra, selfModule] });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  const d = await mc.diagnose();
  assert.ok(d.ok);
  const a = d.modules.find((m) => m.id === "mha");
  assert.equal(a.render, "keep");
  assert.equal(a.guard, "soft");
  assert.equal(a.shadowed, 1);
  assert.ok(d.modules.find((m) => m.id === "obang").selfRender);
  assert.deepEqual(d.overlaps.lua.modules, ["오방융합"]);
});

test("표시: 봇과 다른 모양으로 쓴 모듈 태그도 봇 모양으로 바꿔 봇 방식대로 그린다", () => {
  const ctx = ctxOf(univBot, [univBot.module, univExtra]);
  const shown = prepareDisplay(`<img="minji_angry">`, ctx);
  assert.ok(shown.includes("{{raw::minji_angry.png}}"), shown);
  const h = ctxOf(hunterBot, [hunterExtra]);
  assert.equal(prepareDisplay(`<img src="Park In-joon smile">`, h), `<img="Park In-joon smile">`);
});

// ---- 인물 감지 변수 ----
const npcModule = { id: "mha", name: "더 많은 헌터들", assets: [], regex: [], trigger: [], lorebook: [
  { key: "", comment: "NPC List", alwaysActive: true, content: "{{#if {{equal::{{getvar::Ryu Hae-yeon}}::1}}}}- Ryu Hae-yeon (20/F){{/if}}\n{{#if {{equal::{{getvar::Park In-joon}}::1}}}}- Park In-joon{{/if}}\n{{getvar::lang}}" },
  { key: "류해연, Ryu Hae-yeon", comment: "류해연", content: "..." },
  { key: "박인준, Park In-joon", comment: "박인준", content: "..." }
] };
const luaBot = { ...hunterBot, triggerscript: [{ effect: [{ type: "triggerlua", code: `local characterMap = { { id = "Kang Min-hyuk", keywords = {"Kang Min-hyuk", "강민혁"} } }` }] }], defaultVariables: "lang=1", globalLore: [{ key: "강민혁, Kang Min-hyuk", content: "" }, { key: "민채린, Min Chae-rin", content: "" }] };

test("감지 변수: 모듈 인물만 고르고 설정 변수·봇이 다루는 인물은 뺀다", () => {
  assert.deepEqual(getvarNames("{{getvar::A}} {{getvar:: B }}"), ["A", "B"]);
  const mod2 = { ...npcModule, id: "x", lorebook: [...npcModule.lorebook, { key: "강민혁, Kang Min-hyuk", content: "{{getvar::Kang Min-hyuk}}" }] };
  const names = managedNames({ modules: [mod2], bot: luaBot }).map((m) => m.name);
  assert.deepEqual(names.sort(), ["Park In-joon", "Ryu Hae-yeon"]);
  const ryu = managedNames({ modules: [npcModule], bot: luaBot }).find((m) => m.name === "Ryu Hae-yeon");
  assert.ok(ryu.keywords.includes("류해연"));
});

test("감지 변수: 봇이 채운 변수와 최근 대화를 맞춰 '나오면 몇'을 읽는다", () => {
  const recent = "강민혁이 웃었다. 민채린도.";
  assert.equal(inferFoundValue({ scriptstate: { "$Kang Min-hyuk": "0", "$Min Chae-rin": "0", "$Kim Min-soo": "1", "$Lee Ha-eun": "1" }, botEntries: luaBot.globalLore, recentText: recent }), "0");
  assert.equal(inferFoundValue({ scriptstate: { "$Kang Min-hyuk": "1", "$Min Chae-rin": "1", "$Kim Min-soo": "0", "$Lee Ha-eun": "0" }, botEntries: luaBot.globalLore, recentText: recent }), "1");
  assert.equal(inferFoundValue({ scriptstate: { "$lang": "1" }, recentText: recent }), null, "자료가 모자라면 모름");
});

test("감지 변수: 바뀐 것만 {{setvar}}로", () => {
  const managed = managedNames({ modules: [npcModule], bot: luaBot });
  const up = varUpdates({ managed, text: "류해연이 왔다", found: "0", scriptstate: { "$Park In-joon": "1" } });
  assert.deepEqual(up, { "Ryu Hae-yeon": "0" });
  assert.equal(setvarText(up), "{{setvar::Ryu Hae-yeon::0}}");
  assert.equal(setvarText({ "a::b": "1" }), "", "이상한 이름은 쓰지 않는다");
});

test("훅: 입력 끝에 감지 변수를 붙이고(응답에는 안 붙임 — 스트리밍 중 글자로 보임), 끄면 붙이지 않는다", async () => {
  const chat = { message: [{ role: "char", data: "강민혁이 들어왔다." }], scriptstate: { "$Kang Min-hyuk": "0", "$Min Chae-rin": "1", "$Kim Min-soo": "1", "$Lee Ha-eun": "1" } };
  const { api } = fakeApi({ bot: luaBot, modules: [npcModule, hunterExtra], chat });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  assert.equal(await mc.onOutput("류해연이 손을 흔들었다."), "류해연이 손을 흔들었다.");
  const inp = await mc.onInput("류해연, 박인준은?");
  assert.ok(inp.endsWith("{{setvar::Ryu Hae-yeon::0}}{{setvar::Park In-joon::0}}"), inp);
  chat.scriptstate["$Ryu Hae-yeon"] = "0"; chat.scriptstate["$Park In-joon"] = "0";
  assert.equal(await mc.onInput("류해연, 박인준은?"), "류해연, 박인준은?", "값이 같으면 붙이지 않는다");
  assert.equal(await mc.onInput("  "), "  ", "빈 입력은 그대로");
  await mc.setBotCfg("hunter", { vars: "off" });
  assert.equal(await mc.onInput("그냥"), "그냥");
});

test("감지 변수: 다른 모듈 Lua가 직접 채우는 인물도 건드리지 않는다", () => {
  const luaMod = { id: "lm", lorebook: [], trigger: [{ effect: [{ type: "triggerlua", code: `setChatVar(id, "Ryu Hae-yeon", "0")` }] }] };
  const names = managedNames({ modules: [npcModule, luaMod], bot: luaBot }).map((m) => m.name);
  assert.deepEqual(names, ["Park In-joon"]);
});

test("모델 안내: 다른 모듈 글의 태그 예시보다 봇 모양을 먼저 쓴다", () => {
  const ctx = ctxOf(univBot, [univBot.module, univExtra, selfModule]);
  assert.equal(exampleTemplate([`모듈 안내: <img="Ernest Melville">`, univBot.globalNote], ctx), "<img src={name}>");
});

test("예시가 없을 때도 특정 이름만 받는 모듈 모양보다 열린 모양을 쓴다", () => {
  const ctx = ctxOf(univBot, [selfModule, univBot.module, univExtra]);
  assert.equal(synthTemplate(ctx), "<img src={name}>");
});

test("화면: 막 보낸 입력의 감지 변수 {{setvar}}는 보이지 않는다(다른 setvar는 그대로)", async () => {
  const chat = { message: [], scriptstate: {} };
  const { api } = fakeApi({ bot: luaBot, modules: [npcModule], chat });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  assert.equal(await mc.onDisplay("안녕{{setvar::Ryu Hae-yeon::1}}{{setvar::mood::1}}"), "안녕{{setvar::mood::1}}");
});

test("훅: 오래된 문맥이어도 같은 채팅이면 기다리지 않고 뒤에서 새로 읽는다", async () => {
  let t = 0, slow = null;
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra] });
  const getDb = api.getDatabase;
  const mc = createModCompat(api, { storage: mem(), log: () => {}, now: () => t });
  await mc.loadSettings();
  await mc.current();
  t = 60000;
  api.getDatabase = (k) => new Promise((r) => { slow = () => r(getDb(k)); });
  const res = await Promise.race([mc.onOutput(`<img="Ryu Hae-yeon smile">`), new Promise((r) => setTimeout(() => r("timeout"), 200))]);
  assert.notEqual(res, "timeout");
  assert.notEqual(res, `<img="Ryu Hae-yeon smile">`);
  slow?.();
});


// ---- 채팅 없이 고르기 · 그룹 채팅 ----
const groupCard = { type: "group", chaId: "g1", name: "헌터 모임", characters: ["hunter"], customscript: [], globalLore: [], chats: [] };

test("채팅을 열지 않아도 봇을 골라 진단·설정할 수 있다", async () => {
  const { api } = fakeApi({ bot: hunterBot, modules: [hunterExtra], cur: -1, chars: [hunterBot, univBot] });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  const bots = await mc.listBots();
  assert.deepEqual(bots.map((b) => b.name), ["Alternate Hunters", "Cheongwon Univ."]);
  const d = await mc.diagnose({ ci: 0 });
  assert.ok(d.ok && !d.live && d.botName === "Alternate Hunters");
  assert.equal(d.modules.find((m) => m.id === "mha").render, "keep");
  await mc.setBotCfg(d.chaId, { prompt: false });
  assert.equal(mc.botCfg("hunter").prompt, false);
});

test("그룹 채팅: 멤버 봇의 에셋·정규식을 봇 쪽으로 보고 똑같이 지키고 그린다", async () => {
  const { api } = fakeApi({ bot: groupCard, modules: [hunterExtra], chars: [groupCard, hunterBot], cur: 0 });
  const mc = createModCompat(api, { storage: mem(), log: () => {} });
  await mc.loadSettings();
  const d = await mc.diagnose({ ci: 0 });
  assert.ok(d.ok && d.group);
  assert.deepEqual(d.members, ["Alternate Hunters"]);
  assert.equal(d.modules.find((m) => m.id === "mha").render, "keep");
  assert.equal(d.modules.find((m) => m.id === "mha").guard, "soft");
  await mc.current({ force: true });
  const out = await mc.onOutput(`<img="Ryu Hae-yeon smile">`);
  assert.notEqual(out, `<img="Ryu Hae-yeon smile">`);
  assert.equal(await mc.onDisplay(out), `<img="Ryu Hae-yeon smile">`);
  assert.equal(await mc.onOutput(`<img="Min Chae-rin smile">`), `<img="Min Chae-rin smile">`, "멤버 자신의 이미지는 그대로");
});

test("그룹 채팅: 훅은 봇 목록을 기다리지 않는다(뒤에서 읽고 다시 만든다)", async () => {
  let t = 1000;
  const { api } = fakeApi({ bot: groupCard, modules: [hunterExtra], chars: [groupCard, hunterBot], cur: 0 });
  const mc = createModCompat(api, { storage: mem(), log: () => {}, now: () => t });
  await mc.loadSettings();
  const c0 = await mc.current();
  assert.ok(c0.group && c0.members.length === 0);
  await mc.listBots();
  t += 2000;
  await mc.current();               // 오래된 것으로 표시돼 뒤에서 다시 만듦
  await new Promise((r) => setTimeout(r, 20));
  t += 2000;
  const c1 = await mc.current();
  assert.deepEqual(c1.members, ["Alternate Hunters"]);
});

test("감지 변수: 같은 Lua 안에서 다시 정의돼 죽은 함수의 인물은 Dusk가 채우고, 그 함수의 규칙·키워드를 쓴다", async () => {
  const { luaSegments, foundHints } = await import("../src/engine/modcompatvars.js");
  const code = `function onOutput(triggerId)
  local characterMap = { { id = "Lina Orvette", keywords = {"Lina Orvette", "리나 오르베트"} } }
  local value = isFound and "0" or "1"
end
function onOutput(triggerId)
  local characterMap = { { id = "Nereida", keywords = {"Nereida"} } }
  local value = isFound and "1" or "0"
end`;
  assert.equal(luaSegments(code).dead.length, 1);
  assert.equal(foundHints([code]).get("Lina Orvette"), "0");
  const pack = { id: "pack", trigger: [{ effect: [{ type: "triggerlua", code }] }], assets: [], regex: [], lorebook: [
    { key: "", comment: "NPC List", content: "{{#if {{equal::{{getvar::Lina Orvette}}::1}}}}- Lina{{/if}}{{#if {{equal::{{getvar::Nereida}}::1}}}}- N{{/if}}" },
    { key: "리나, Lina", comment: "Lina Orvette", content: "" }, { key: "Nereida", comment: "Nereida", content: "" }] };
  const man = managedNames({ modules: [pack], bot: {} });
  assert.deepEqual(man.map((m) => m.name), ["Lina Orvette"], "살아 있는 정의가 다루는 Nereida는 뺀다");
  assert.ok(man[0].keywords.includes("리나 오르베트"));
  assert.deepEqual(varUpdates({ managed: man, text: "리나 오르베트가 왔다", found: "1" }), { "Lina Orvette": "0" }, "모듈 Lua 규칙(나오면 0)이 먼저");
});
