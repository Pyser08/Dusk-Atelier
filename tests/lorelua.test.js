// Lua 로어북 엔진이 플러그인(JS) 규칙 런타임과 똑같이 계산하는지 비교한다.
// 리스가 쓰는 Lua 엔진(wasmoon)과 json.lua가 필요하다: node_modules의 wasmoon 또는 ../RisuBard에서 찾고, 없으면 건너뛴다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createLoreRuntime } from "../src/data/lorerules.js";
import { setBoundaryMode } from "../src/engine/lorerules.js";
import { buildLoreLua, syncLoreTrigger, findLoreTrigger, hashOfCode, unsupportedRules, loreTriggerStale, LUA_MARK } from "../src/engine/lorelua.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function findLua() {
  const cands = [() => require("wasmoon"), () => require(path.resolve(here, "../../RisuBard/node_modules/wasmoon"))];
  let mod = null;
  for (const c of cands) { try { mod = c(); break; } catch { /* 다음 */ } }
  const jsonPaths = [path.resolve(here, "fixtures/json.lua"), path.resolve(here, "../../RisuBard/public/lua/json.lua")];
  const jp = jsonPaths.find((p) => fs.existsSync(p));
  return mod && jp ? { LuaFactory: mod.LuaFactory, json: fs.readFileSync(jp, "utf8") } : null;
}
const LUA = findLua();
const skip = LUA ? false : "wasmoon·json.lua 없음";

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRELUDE = `
json = require 'json'
function getFullChat(id) return json.decode(getFullChatMain(id)) end
local editInputFuncs = {}
function listenEdit(t, f) if t == 'editInput' then editInputFuncs[#editInputFuncs + 1] = f end end
function __runInput(id, v) for _, f in ipairs(editInputFuncs) do v = f(id, v, '{}') end return v end
`;

async function luaHost(code) {
  const factory = new LUA.LuaFactory();
  await factory.mountFile("json.lua", LUA.json);
  const lua = await factory.createEngine();
  const host = { chat: null, rng: Math.random };
  lua.global.set("getFullChatMain", () => JSON.stringify(host.chat.message.map((m) => ({ role: m.role, data: m.data, time: m.time ?? 0 }))));
  lua.global.set("getChatVar", (_id, k) => { const v = host.chat.scriptstate?.["$" + k]; return v === undefined ? "null" : String(v); });
  lua.global.set("setChatVar", (_id, k, v) => { host.chat.scriptstate["$" + k] = String(v); });
  lua.global.set("DUSK_RNG", () => host.rng());
  await lua.doString(PRELUDE);
  await lua.doString(code);
  return {
    host,
    async input(chat, text, rng) { host.chat = chat; host.rng = rng; lua.global.set("__in", text); await lua.doString(`__runInput("k", __in)`); },
    async output(chat, rng) { host.chat = chat; host.rng = rng; await lua.doString(`onOutput("k")`); },
    close() { lua.global.close(); }
  };
}

const api = { pluginStorage: { getItem: async () => null, setItem: async () => {} } };
function withRandom(rng, fn) {
  const orig = Math.random;
  Math.random = rng;
  try { return fn(); } finally { Math.random = orig; }
}
const normState = (ss) => {
  const o = {};
  for (const [k, v] of Object.entries(ss)) {
    if (k === "$da_state") {
      const s = JSON.parse(v || "{}");
      const fix = (x) => (Array.isArray(x) && !x.length ? {} : x);
      const n = { f: fix(s.f ?? {}), t: fix(s.t ?? {}) };
      if (s.p) n.p = { ...s.p, vars: s.p.vars ? fix(s.p.vars) : undefined };
      if (s.b) n.b = { turn: s.b.turn, base: fix(s.b.base ?? {}), out: fix(s.b.out ?? {}) };
      for (const m of [n.f, n.t]) for (const r of Object.keys(m)) if (!m[r].length) delete m[r];
      if (n.b) for (const [bk, bv] of Object.entries(n.b.base)) if (bv === null) delete n.b.base[bk];
      if (n.p && n.p.vars === undefined) delete n.p.vars;
      o[k] = n;
    } else o[k] = String(v);
  }
  return o;
};

// ---------- 규칙 묶음 ----------
let rc = 0;
const E = (name, rule, extra = {}) => ({ mode: "normal", key: extra.key ?? name, secondkey: extra.sk ?? "", selective: !!extra.sk, comment: name, content: extra.content ?? `${name} 설명`, insertorder: extra.ord ?? 100, folder: extra.folder, extentions: { da_rid: extra.rid ?? `r${++rc}`, da_rule: { on: true, mode: "all", cond: [{ t: "keys" }], prob: 100, ...rule }, ...(extra.ext ?? {}) } });
const folder = (id, parent, aff, rule = {}) => ({ mode: "normal", key: id, comment: `[소속] ${id}`, content: "", folder: parent, extentions: { da_folder: { id, aff }, da_rid: `f_${id}`, da_rule: { on: true, cond: [{ t: "text", keys: id }], mode: "all", prob: 100, ...rule } } });

function bigBook() {
  rc = 0;
  return [
    E("마리", {}),                                   // 짧은 이름: 이름 경계 자동
    E("히마리", {}),
    E("하늘", { common: true, commonWords: "선배" }), // 흔한 낱말 이름
    E("Alice", { whole: true }, { key: "alice" }),
    E("카페", { cond: [{ t: "text", keys: "카페,커피" }, { t: "notext", keys: "집" }], mode: "all" }),
    E("밤", { cond: [{ t: "var", name: "time", op: "=", val: "밤" }] }),
    E("호감 높음", { cond: [{ t: "var", name: "aff", op: ">=", val: "10" }] }),
    E("초반", { cond: [{ t: "turn", min: 1, max: 2 }] }),
    E("세 번째 사과", { cond: [{ t: "count", keys: "사과", min: 3 }] }),
    E("한 번만", { once: "chat", cond: [{ t: "text", keys: "비밀" }] }),
    E("쿨다운", { once: "cooldown", cool: 2, cond: [{ t: "text", keys: "종" }] }),
    E("지속", { hold: 3, cond: [{ t: "text", keys: "비" }] }),
    E("그룹A", { group: "g", cond: [{ t: "text", keys: "날씨" }] }, { ord: 50 }),
    E("그룹B", { group: "g", cond: [{ t: "text", keys: "날씨" }] }, { ord: 90 }),
    E("변수", { cond: [{ t: "text", keys: "사과" }], set: [{ name: "aff", op: "+", val: "4" }, { name: "time", op: "=", val: "밤" }, { name: "score", op: "expr", val: "aff*2 + rand(1,6) + turn" }] }),
    E("확률", { prob: 50, cond: [{ t: "text", keys: "주사위" }], chain: [{ rid: "rCH", prob: 50 }] }),
    E("연쇄 대상", { cond: [] , mode: "all", prob: 100 }, { rid: "rCH", key: "zzzz-none" }),
    E("함께", { cond: [{ t: "with", rid: "r1" }] }),
    E("없을 때", { cond: [{ t: "text", keys: "안녕" }, { t: "without", rid: "r2" }] }),
    E("횟수", { cond: [{ t: "times", rid: "r1", min: 2 }] }),
    E("보조키", {}, { key: "검", sk: "칼집" }),
    folder("학원", null, { def: 60, max: 2, prob: {} }),
    E("유키", {}, { folder: "학원" }), E("소라", {}, { folder: "학원" }), E("나기", {}, { folder: "학원" }),
    E("교실", {}, { folder: "학원", ext: { da_place: { links: [] } } }),
    E("복제", { cond: [{ t: "text", keys: "복제" }] }, { content: "같은 본문" }),
    E("복제", { cond: [{ t: "text", keys: "복제" }] }, { content: "같은 본문" })
  ].map((e) => {
    // 연쇄 대상: 조건 없음이면 항상 켜지므로 절대 안 맞는 조건을 준다
    if (e.comment === "연쇄 대상") e.extentions.da_rule.cond = [{ t: "text", keys: "절대안나오는말" }];
    return e;
  });
}

const SCRIPT = ["마리야 안녕", "히마리랑 카페 가서 커피", "하늘이 맑네", "하늘 선배 사과 줘", "사과 주사위 비 종", "날씨 좋다 사과 alice", "비밀 종 주사위 학원", "유키한테 칼집 속 검", "교실에서 복제 주사위", "안녕 하늘아", "비밀 종 사과 주사위", "Alice와 학원 주사위"];

async function runParity(entries, { seed = 1, boundary = "short", reroll = "new", script = SCRIPT, rerollAt = [] } = {}) {
  setBoundaryMode(boundary);
  const code = buildLoreLua(entries, { boundary, reroll });
  const L = await luaHost(code);
  const rt = createLoreRuntime(api, { log: () => {} });
  await new Promise((r) => setTimeout(r, 0)); // 설정 읽기(이름 경계 기본값) 끝나기 기다림
  setBoundaryMode(boundary);
  const jsChat = { message: [], scriptstate: {} }, luaChat = { message: [], scriptstate: {} };
  const jr = mulberry(seed), lr = mulberry(seed);
  let time = 1000;
  try {
    for (let i = 0; i < script.length; i++) {
      const text = script[i];
      const d = withRandom(jr, () => rt.decide(entries, jsChat, text));
      if (d) Object.assign(jsChat.scriptstate, d.patch);
      await L.input(luaChat, text, lr);
      assert.deepEqual(normState(luaChat.scriptstate), normState(jsChat.scriptstate), `입력 ${i + 1} '${text}' 뒤 상태가 달라요`);
      for (const c of [jsChat, luaChat]) c.message.push({ role: "user", data: text, time: time }, { role: "char", data: `답 ${i}`, time: time + 10 });
      time += 100;
      const pj = reroll === "keep" ? null : withRandom(jr, () => rt.prepare(entries, jsChat, jsChat.message.at(-1).time));
      if (pj) {
        const ss = jsChat.scriptstate;
        const same = Object.entries(pj.patch).every(([k, v]) => k === "$da_state" || String(ss[k] ?? "") === v);
        if (pj.random || !same) Object.assign(ss, pj.patch);
      }
      await L.output(luaChat, lr);
      assert.deepEqual(normState(luaChat.scriptstate), normState(jsChat.scriptstate), `응답 ${i + 1} 뒤(다시 생성 대비) 상태가 달라요`);
      if (rerollAt.includes(i)) {
        // 다시 생성: 마지막 응답을 새 시각으로 바꾼다 (프롬프트는 미리 써 둔 변수로)
        for (const c of [jsChat, luaChat]) c.message[c.message.length - 1] = { role: "char", data: `다시 ${i}`, time: time + 50 };
        time += 100;
      }
    }
  } finally {
    L.close();
    setBoundaryMode("short");
  }
  return { jsChat, luaChat };
}

test("Lua 엔진 = JS 런타임: 여러 턴·확률·변수·소속·그룹·지속·쿨다운", { skip }, async () => {
  const fired = new Set();
  for (const seed of [1, 2, 3, 7, 42]) {
    const book = bigBook();
    const names = Object.fromEntries(book.map((e) => [e.extentions.da_rid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12), e.comment]));
    const { luaChat } = await runParity(book, { seed });
    const st = JSON.parse(luaChat.scriptstate.$da_state);
    for (const rid of Object.keys(st.f ?? {})) fired.add(book.find((e) => e.extentions.da_rid === rid)?.comment);
    assert.ok(Number(luaChat.scriptstate.$aff) > 0 && luaChat.scriptstate.$score, "변수 바꾸기가 돌아야 해요");
    void names;
  }
  // 시험이 실제로 여러 규칙을 켜 봤는지 (빈 비교가 아닌지)
  for (const n of ["마리", "히마리", "하늘", "Alice", "카페", "밤", "호감 높음", "초반", "세 번째 사과", "한 번만", "쿨다운", "지속", "그룹B", "변수", "확률", "함께", "없을 때", "횟수", "보조키", "[소속] 학원", "교실", "복제"]) assert.ok(fired.has(n), `'${n}'이 한 번도 안 켜졌어요`);
});
test("Lua 엔진 = JS 런타임: 다시 생성이 끼어도 기록이 같다", { skip }, async () => {
  for (const seed of [5, 9]) await runParity(bigBook(), { seed, rerollAt: [1, 4, 6] });
});
test("Lua 엔진 = JS 런타임: 이름 경계 모두·끄기, 리롤 유지 설정", { skip }, async () => {
  await runParity(bigBook(), { seed: 11, boundary: "all" });
  await runParity(bigBook(), { seed: 12, boundary: "off" });
  await runParity(bigBook(), { seed: 13, reroll: "keep" });
});
test("이름 경계: '마리'는 '히마리'에 안 걸리고 조사·호칭에는 걸린다 (Lua)", { skip }, async () => {
  rc = 0;
  const es = [E("마리", {})];
  const { luaChat } = await runParity(es, { script: ["히마리 안녕", "마리가 왔다", "마리였는데", "히마리", "마리 씨"] });
  assert.ok(luaChat.scriptstate.$da_state);
});

// ---------- 트리거 넣기·빼기 ----------
test("syncLoreTrigger: 넣기 → 같음 → 규칙 바뀌면 다시 만들기 → 관리 항목 없으면 빼기", () => {
  rc = 0;
  const es = [E("마리", {})];
  const user = { comment: "작성자 트리거", type: "start", conditions: [], effect: [{ type: "triggerlua", code: "-- 내 코드" }] };
  let r = syncLoreTrigger([user], es);
  assert.equal(r.state, "added");
  assert.equal(r.triggers.length, 2);
  assert.equal(r.triggers[0], user);
  const code = findLoreTrigger(r.triggers).effect[0].code;
  assert.ok(code.startsWith(LUA_MARK));
  assert.ok(hashOfCode(code));
  assert.equal(syncLoreTrigger(r.triggers, es).state, "same");
  es[0].extentions.da_rule.prob = 50;
  assert.equal(loreTriggerStale(r.triggers, es), true);
  r = syncLoreTrigger(r.triggers, es);
  assert.equal(r.state, "updated");
  assert.equal(r.triggers.filter((t) => t.effect[0].code.startsWith(LUA_MARK)).length, 1);
  es[0].extentions.da_rule.on = false;
  r = syncLoreTrigger(r.triggers, es);
  assert.equal(r.state, "removed");
  assert.deepEqual(r.triggers, [user]);
});
test("unsupportedRules: 정규식 키·정규식 조건을 알려 준다", () => {
  rc = 0;
  const es = [E("정규", {}, { key: "/마.리/" }), E("조건", { cond: [{ t: "text", keys: "/a+/", regex: true }] })];
  es[0].useRegex = true;
  assert.deepEqual(unsupportedRules(es).map((x) => x.why), ["정규식 키", "정규식 조건"]);
});

test("봇 Lua + Dusk가 함께 돌 때: 서로 맡은 항목 기록을 지우지 않는다", { skip }, async () => {
  rc = 0;
  const bot = [E("마리", { once: "chat" })];       // 봇에 Lua로 들어간 항목
  const mod = [E("카페", { once: "chat", cond: [{ t: "text", keys: "카페" }] })]; // Dusk가 계산하는 항목(모듈)
  const L = await luaHost(buildLoreLua(bot));
  const rt = createLoreRuntime(api, { log: () => {} });
  const chat = { message: [], scriptstate: {} };
  try {
    for (const order of ["lua-first", "js-first"]) {
      chat.message = []; chat.scriptstate = {};
      const runJs = () => { const d = rt.decide(mod, chat, "마리랑 카페"); if (d) Object.assign(chat.scriptstate, d.patch); };
      if (order === "lua-first") { await L.input(chat, "마리랑 카페", Math.random); runJs(); }
      else { runJs(); await L.input(chat, "마리랑 카페", Math.random); }
      const st = JSON.parse(chat.scriptstate.$da_state);
      assert.deepEqual(Object.keys(st.f).sort(), ["r1", "r2"], `${order}: 두 쪽 기록이 다 남아야 해요`);
      assert.equal(chat.scriptstate.$da_r1, "1");
      assert.equal(chat.scriptstate.$da_r2, "1");
    }
  } finally { L.close(); }
});
test("luaCoveredRids: 트리거 안의 항목 rid를 읽는다", async () => {
  const { luaCoveredRids } = await import("../src/engine/lorelua.js");
  rc = 0;
  const es = [E("마리", {}), E("유키", {})];
  const t = syncLoreTrigger([], es).triggers;
  assert.deepEqual([...luaCoveredRids(t)].sort(), ["r1", "r2"]);
  assert.equal(luaCoveredRids([{ effect: [{ type: "triggerlua", code: "-- 남의 코드" }] }]).size, 0);
});

test("fixRegexKeys: 규칙이 켜진 항목의 정규식 키만 이름 키로 바꾼다", async () => {
  const { fixRegexKeys } = await import("../src/engine/lorelua.js");
  rc = 0;
  const a = E("마리", {}, { key: "/마리|마리쨩/" });
  a.useRegex = true;
  const b = { key: "/유키|유키쨩/", useRegex: true, comment: "규칙 없음", content: "x", mode: "normal" };
  const r = fixRegexKeys([a, b]);
  assert.equal(r.fixed, 1);
  assert.equal(r.entries[0].useRegex, false);
  assert.match(r.entries[0].key, /마리/);
  assert.equal(r.entries[1].useRegex, true, "규칙 없는 항목은 그대로");
  assert.equal(fixRegexKeys([b]).fixed, 0);
});

test("withFreshLoreLua: 내보낼 때 Lua를 넣고, 끈 봇은 그대로 둔다", async () => {
  const { withFreshLoreLua, LUA_OFF_KEY } = await import("../src/data/lorerules.js");
  rc = 0;
  const store = {};
  const api2 = { pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } } };
  const ch = { chaId: "c1", globalLore: [E("마리", {})], triggerscript: [] };
  const out = await withFreshLoreLua(api2, ch, "character");
  assert.equal(findLoreTrigger(out.triggerscript) !== null, true);
  assert.equal(ch.triggerscript.length, 0, "원본은 그대로");
  store[LUA_OFF_KEY] = JSON.stringify(["chaId:c1"]);
  assert.equal(await withFreshLoreLua(api2, ch, "character"), ch);
  const mod = { id: "m1", lorebook: [E("유키", {})], trigger: [] };
  assert.ok(findLoreTrigger((await withFreshLoreLua(api2, mod, "module")).trigger));
});
