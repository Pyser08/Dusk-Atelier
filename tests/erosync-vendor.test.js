// Erosync 격리 이식 본체(src/erosync/): 실제 본체를 가짜 api로 올려 훅 등록·정리, 배경음 자료 지문, //@ 머리말 없음
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootErosync } from "../src/erosync/erosync.js";

function fakeApi() {
  const store = new Map(), calls = [];
  const api = {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } },
    addRisuReplacer: async (n) => calls.push(["add", n]), removeRisuReplacer: async (n) => calls.push(["rm", n]),
    addRisuChatListener: async (n) => calls.push(["addLis", n]), removeRisuChatListener: async (n) => calls.push(["rmLis", n]),
    registerSetting: async (n) => calls.push(["setting", n]), unregisterUIPart: async (n) => calls.push(["unreg", n]),
    requestPluginPermission: async () => true,
    onUnload: async () => calls.push(["HOST-onUnload"])
  };
  return { api, calls };
}

test("본체를 올리면 요청·응답 훅과 설정 항목을 등록하고, 끄면 모두 뗀다", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(e.loaded(), true);
  const names = calls.map((c) => c.join(":"));
  for (const n of ["add:beforeRequest", "add:afterRequest", "addLis:output"]) assert.ok(names.includes(n), n);
  assert.ok(!names.includes("setting:Erosync"), "원래 설정 항목은 등록하지 않는다(Dusk 화면만 사용)");
  await e.dispose();
  const after = calls.map((c) => c.join(":"));
  for (const n of ["rm:beforeRequest", "rm:afterRequest", "rmLis:output"]) assert.ok(after.includes(n), n);
  assert.equal(e.loaded(), false);
});

test("호스트의 onUnload에는 직접 맡기지 않는다(끄기 전에 호스트가 부르지 못하게)", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.ok(!calls.some((c) => c[0] === "HOST-onUnload"));
  await e.dispose();
});

test("api가 없으면 던진다", async () => {
  await assert.rejects(() => bootErosync(null), /unavailable/);
});

test("원래 화면(설정 창·배경음·관계망 안내)은 걷어냈다", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  for (const w of ["UI_AMBIENT_TAPE", "duskRenderRelationLauncher", "openSettingsPanel", "function esSound", "host.openRelmap"]) assert.ok(!src.includes(w), w);
});

test("소스에 줄 맨 앞 //@ 머리말이 없다(빌드가 막는 것)", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.equal(src.split("\n").filter((l) => /^\s*\/\/@/.test(l)).length, 0);
});

test("읽기 연결부: 채팅을 못 읽는 환경에서도 던지지 않고 빈 모양을 돌려준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(typeof e.read, "function");
  const r = await e.read();
  assert.equal(r.ok, false);
  for (const k of ["people", "goals", "rivalries", "relations"]) assert.ok(Array.isArray(r[k]), k);
  await e.dispose();
});
test("Dusk 연결: 기본 제공자가 host.runAI(Dusk AI 호출)로 간다", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.match(src, /providerId === 'risu' && typeof host\.runAI === 'function'/);
  const main = fs.readFileSync(new URL("../addons/erosync/index.js", import.meta.url), "utf8");   // 2.0.0: Erosync는 애드온에서 만든다
  assert.match(main, /host: \{ runAI:/);
});
test("Dusk 연결부(실제 엔진): 동작 설정·지시문·집착 방지·주기 플래그", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const c = await e.config.get();
  assert.equal(c.values.frequency, 55);
  const c2 = await e.config.set({ frequency: 999, mode: "bogus", notAllowed: 1 });
  assert.equal(c2.values.frequency, 100);          // 범위 밖은 맞춘다
  assert.equal(c2.values.mode, "normal");           // 잘못된 값은 기본으로
  assert.equal("notAllowed" in c2.values, false);   // 허용 목록 밖은 무시
  const p = await e.prompts.get();
  assert.ok(p.ok && p.pages.length > 0 && p.pages[0].sections.length > 0);
  const sec = p.pages[0].sections[0], b = sec.branches[0];
  assert.equal(sec.texts[b].changed, false);
  const p2 = await e.prompts.set(sec.id, b, sec.texts[b].text + "\n(시험)");
  assert.equal(p2.pages[0].sections[0].texts[b].changed, true);
  const p3 = await e.prompts.set(sec.id, b, "");
  assert.equal(p3.pages[0].sections[0].texts[b].changed, false);
  await assert.rejects(() => e.prompts.set("nope", "common", "x"), /알 수 없는/);
  assert.equal(e.guard.set({ on: true, obsessionCap: 500 }).obsessionCap, 100);
  assert.deepEqual(e.flags.set({ duskCycle: true }), { duskCycle: true, tempTrend: true, userTrack: false });
  assert.deepEqual(e.flags.set({ tempTrend: false }), { duskCycle: true, tempTrend: false, userTrack: false });   // 한쪽만 바꿔도 다른 쪽은 그대로
  await e.dispose();
});
test("Dusk 프로필 연결부(실제 엔진): 채팅이 없으면 이유를 알리고, 분석 상태 모양을 돌려준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const st = e.profiles.status();
  assert.equal(st.running, false);
  for (const k of ["phase", "detail", "completed", "total", "failed", "message", "tone"]) assert.ok(k in st, k);
  await assert.rejects(() => e.profiles.get("x"), /채팅|인물/);
  await assert.rejects(() => e.profiles.start("bogus", ""), /채팅|종류/);
  assert.equal(e.profiles.cancel().running, false);
  await e.dispose();
});
test("Dusk 비하인드 연결부(실제 엔진): 채팅이 없으면 빈 목록", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const r = await e.behind.list();
  assert.equal(r.ok, false); assert.deepEqual(r.entries, []);
  await assert.rejects(() => e.behind.remove("x"), /채팅/);
  await e.dispose();
});

test("Dusk 이야기 시간: 켜져 있으면 주기 시계가 응답 상태 줄 날짜를 우선 쓴다(host.storyStatus)", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(src.includes("function duskStoryAbsolute(state)") && src.includes("host.storyStatus(") && src.includes("fromDusk: true"));
  assert.ok(src.includes("(time.fromDusk === true || supported(time.evidence))"));
  const main = fs.readFileSync(new URL("../addons/erosync/index.js", import.meta.url), "utf8");
  assert.ok(/storyStatus: \(text, prevDate\) => \(app\.storyTime\?\.isOn\?\.\(\)/.test(main));
});

test("집착 방지 상태(state.duskGuard)가 저장 때 정리 과정에서 떨어지지 않는다(턴을 넘어 연속 횟수·쉬는 턴이 이어져야 함)", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  const i = src.indexOf("function normalizeSessionState(");
  const body = src.slice(i, src.indexOf("\n  }\n", i));
  assert.ok(/next\.duskGuard\s*=/.test(body), "normalizeSessionState가 duskGuard를 옮겨 담아야 한다");
});

test("Dusk 태그 연결부(실제 엔진): 맵을 받아 비지 않은 인물 수를 돌려주고, 장면 요약에는 선호(NSFW↑)·금기(전체)로 들어간다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(e.tags.set({ a: { likes: ["x"], limits: [] }, b: { likes: [], limits: [] }, c: "bad" }), 1);
  assert.equal(e.tags.set({}), 0);
  await e.dispose();
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(src.includes("...duskTagsLines(profile?.id || actorId, sfw)"));
  assert.ok(/!sfw && t\.likes\.length \? `user-set likes/.test(src) && src.includes("user-set limits (never include"));
});

test("관계 온도 연결부(실제 엔진): 읽기 값에 temp가 있고, 저장 정리·기록·반영 코드가 있다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const r = await e.read();
  assert.ok(Array.isArray(r.temp) && Array.isArray(r.rests));
  await e.dispose();
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(src.includes("next.duskTemp = source.duskTemp"), "저장 정리에서 duskTemp가 떨어지면 안 된다");
  assert.ok(src.includes("          duskTempRecord(state);"), "확정 때 기록해야 한다");
  assert.ok(src.includes("      duskTempLine(state, actorId, targetId),"), "장면 요약에 넣어야 한다");
});

test("관계 온도 기록·변화 문구(엔진 함수를 꺼내 실행): 같은 턴 이상은 덮어쓰고, 5 미만 변화는 steady, 되돌린 뒤 앞선 기록은 무시", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  const a = src.indexOf("  function duskTempRecord(state)"), b = src.indexOf("  function selectedProfileSummary(");
  const body = src.slice(a, b);
  const clampInt = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const clampNumber = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const make = new Function("clampInt", "clampNumber", "isPlainObject", "duskTempTrend", `${body}\nreturn { duskTempRecord, duskTempLine, duskTempSeries };`);
  const { duskTempRecord, duskTempLine, duskTempSeries } = make(clampInt, clampNumber, isPlainObject, true);
  const st = { turnIndex: 1, relations: { k: { from: "a", to: "b", affection: 50, eroticAttraction: 50, hatred: 0 } } };
  assert.equal(duskTempLine(st, "a", "b"), "");
  duskTempRecord(st);
  st.turnIndex = 2; st.relations.k.affection = 70; st.relations.k.hatred = 3; duskTempRecord(st);
  st.turnIndex = 3; st.relations.k.affection = 80; duskTempRecord(st);
  assert.deepEqual(duskTempSeries(st, "a", "b").map((p) => p.a), [50, 70, 80]);
  assert.equal(duskTempLine(st, "a", "b"), "relationship trend toward the target over the last 2 turns: affection +30; attraction steady; hostility steady");
  st.turnIndex = 2; duskTempRecord(st);   // 되돌린 뒤 같은 턴을 다시 쓰면 앞선 기록(3턴)은 버려진다
  assert.deepEqual(st.duskTemp.map((e) => e.turn), [1, 2]);
  st.turnIndex = 1; assert.deepEqual(duskTempSeries(st, "a", "b").map((p) => p.turn), [1]);
  assert.equal(make(clampInt, clampNumber, isPlainObject, false).duskTempLine(st, "a", "b"), "");
});

test("장면 되돌리기 연결부(실제 엔진): 채팅이 없으면 이유를 던지고, 컨트롤러는 off/이유를 { ok:false }로 돌려준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  await assert.rejects(() => e.undo.lastScene(), /열린 채팅이 없어요/);
  await e.dispose();
  const { createErosync } = await import("../src/data/erosync.js");
  const mk = (inst) => createErosync({ pluginStorage: { getItem: async () => null, setItem: async () => {} }, addRisuReplacer: async () => {} }, { boot: async () => inst, load: async () => true });
  const off = mk(null); assert.deepEqual(await off.undoScene(), { ok: false, reason: "off" });
  const on = mk({ loaded: () => true, dispose: async () => {}, undo: { lastScene: async () => { throw new Error("열린 채팅이 없어요"); } } });
  await on.boot(); assert.deepEqual(await on.undoScene(), { ok: false, reason: "열린 채팅이 없어요" });
  await on.stop();
});

test("기본 성격 변화 반영은 표준 자동", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.match(src, /developmentMode:\s*'standard_auto'/);
});

test("Dusk 인물 골라서 분석 연결부(실제 엔진): 채팅이 없으면 목록·시작 모두 이유를 알려 준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(typeof e.profiles.lore, "function");
  await assert.rejects(() => e.profiles.lore(), /채팅/);
  await assert.rejects(() => e.profiles.start("lore", ["a"]), /채팅/);
  assert.equal(e.profiles.status().running, false);
  await e.dispose();
});

test("user 관찰(2.1.5): 켜면 플래그·저장 정리·장면 판단 입력·확정 기록이 이어지고, user 행동을 계획하라는 길은 없다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(e.flags.set({ userTrack: true }).userTrack, true);
  assert.equal(e.flags.set({ tempTrend: false }).userTrack, true, "다른 플래그를 바꿔도 그대로");
  await e.dispose();
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  const i = src.indexOf("function normalizeSessionState(");
  assert.ok(/next\.duskUser\s*=/.test(src.slice(i, src.indexOf("\n  }\n", i))), "저장 정리에서 duskUser가 떨어지면 안 된다");
  assert.ok(src.includes("...(duskUserTrack ? { userTracking: duskUserDirectorInput(state, sfw) } : {}),"));
  assert.ok(src.includes("if (duskUserTrack && !externalEvent) duskUserRecord(update, state, registry);"));
  const a = src.indexOf("  const DUSK_USER_MAX"), b = src.indexOf("  async function duskReadSnapshot()");
  const clampInt = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  const truncate = (v, n) => String(v ?? "").slice(0, n);
  const resolveEntity = (_r, ref) => (String(ref).toLowerCase() === "user" ? "user" : ref);
  const f = new Function("clampInt", "isPlainObject", "truncate", "resolveEntity", `${src.slice(a, b)}\nreturn { duskUserRecord, duskUserView, duskUserDirectorInput };`)(clampInt, isPlainObject, truncate, resolveEntity);
  const st = { turnIndex: 1, scopeKey: "s" };
  f.duskUserRecord({ observedActions: [{ actor: "user", target: "a", summary: "손을 잡았다" }], userObservation: { state: "긴장함", signals: [{ trait: "initiative", direction: "increase", summary: "먼저 다가감" }], openness: { delta: 2, quote: "괜찮아" } } }, st, {});
  st.turnIndex = 2; f.duskUserRecord({ userObservation: { openness: { delta: 1, quote: "응" } } }, st, {});
  let v = f.duskUserView(st);
  assert.equal(v.openness, 65); assert.equal(v.state, "긴장함"); assert.equal(v.lastAction, "손을 잡았다"); assert.equal(v.tendencies.length, 1);
  st.turnIndex = 1; assert.equal(f.duskUserView(st).openness, 60, "되돌리면 뒤 턴 기록은 안 셈");
  f.duskUserRecord({ userObservation: { state: "편안함" } }, st, {});   // 같은 턴 다시 굴림 → 바꿈
  assert.deepEqual(st.duskUser.log.map((x) => x.turn), [1]); assert.equal(f.duskUserView(st).state, "편안함");
  const inp = f.duskUserDirectorInput(st, true);
  assert.match(inp.note, /Never plan/); assert.ok(!("sexualOpenness" in inp.known) && !/openness/.test(inp.reply) && !/sexual/.test(inp.reply), "SFW에서는 성적 항목 없음");
});
