// Erosync 매 턴 계산: 채점 기준 글·응답 정리·이름 연결(src/erosync/turnupdate.js), 턴 갱신기(src/data/erosyncturn.js), 기록기 알림
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { turnKeys, buildTurnSystem, buildTurnUser, parseTurnReply, matchProfile, TURN_STEP_MAX } from "../src/erosync/turnupdate.js";
import { createErosyncTurn, normalizeTurnSettings, TURN_KEY, TURN_LOG_KEY } from "../src/data/erosyncturn.js";

test("켠 항목의 키만 계산한다", () => {
  assert.deepEqual(turnKeys(["sexual"]), ["eroticInterest", "sexualSpontaneity", "sexualOpenness", "sexualMomentum"]);
  assert.ok(turnKeys(["axes"]).includes("initiative") && !turnKeys(["axes"]).includes("eroticInterest"));
  assert.equal(turnKeys([]).length, turnKeys(["axes", "sexual"]).length, "비면 전부");
});

test("채점 기준은 원본 축 정의(라벨·구간)로 만든다", () => {
  const sys = buildTurnSystem({ keys: ["initiative", "eroticInterest"], axisDefs: { initiative: { label: "주도성", definition: "D1", bands: [["0-20", "waits"]] } },
    sexDefs: { eroticInterest: { label: "성적 관심도", definition: "D2", bands: [] } }, sexRules: ["R1"] });
  for (const w of ["initiative (주도성)", "D1", "0-20: waits", "eroticInterest (성적 관심도)", "D2", "- R1", `at most ${TURN_STEP_MAX}`]) assert.ok(sys.includes(w), w);
  assert.ok(!buildTurnSystem({ keys: ["initiative"], axisDefs: {}, sexDefs: {}, sexRules: ["R1"] }).includes("R1"), "성적 항목이 없으면 성적 규칙도 없다");
  const user = buildTurnUser({ targets: [{ id: "p1", name: "앨리스", values: { initiative: 40 } }], rp: "턴 글", keys: ["initiative"] });
  assert.ok(user.includes("\"initiative\": 40") && user.includes("턴 글"));
});

test("응답 정리: 모르는 인물·키 버림, 범위·한 턴 폭 제한, 같은 값은 뺌", () => {
  const targets = [{ id: "p1", values: { initiative: 40, eroticInterest: 50 } }];
  const out = parseTurnReply({ characters: [{ id: "p1", changes: { initiative: 90, eroticInterest: 50, hacked: 1 }, reason: "이유" }, { id: "zz", changes: { initiative: 1 } }] }, targets, ["initiative", "eroticInterest"]);
  assert.deepEqual(out, { p1: { changes: { initiative: 40 + TURN_STEP_MAX }, reason: "이유" } });
  assert.deepEqual(parseTurnReply({ characters: "x" }, targets, ["initiative"]), {});
  assert.deepEqual(parseTurnReply({ characters: [{ id: "p1", changes: { initiative: -50 } }] }, targets, ["initiative"]).p1.changes, { initiative: 25 });
});

test("이름·별칭으로 프로필을 잇고, 둘 이상이면 잇지 않는다", () => {
  const ps = [{ id: "a", name: "Alice Kim", aliases: ["앨리스"] }, { id: "b", name: "Bob" }];
  assert.equal(matchProfile({ name: "앨리스" }, ps)?.id, "a");
  assert.equal(matchProfile({ name: "alicekim" }, ps)?.id, "a");
  assert.equal(matchProfile({ name: "Carol" }, ps), null);
  assert.equal(matchProfile({ name: "Bob" }, [...ps, { id: "c", name: "bob" }]), null);
});

function fakeApi() { const m = new Map(); return { m, api: { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } } } }; }
const erosyncWith = (reply, calls = []) => ({ on: () => true, isRunning: () => true, profile: async (op, arg) => { calls.push([op, arg]); return reply; } });

test("턴 갱신기: 꺼져 있으면 부르지 않고, 켜면 그 턴 인물을 넘기고 변화를 기록한다", async () => {
  const { api, m } = fakeApi(), calls = [];
  const t = createErosyncTurn(api, { erosync: erosyncWith({ ok: true, changed: [{ id: "p1", name: "앨리스", before: { initiative: 40 }, after: { initiative: 50 }, reason: "먼저 말을 걺" }], unmatched: ["밥"] }, calls), now: () => 7 });
  const info = { key: "k1", rp: "턴", people: [{ name: "앨리스", memory: "" }] };
  assert.equal(await t.onTurn(info), null); assert.equal(calls.length, 0);
  await t.save({ on: true, groups: ["axes"] });
  assert.deepEqual(JSON.parse(m.get(TURN_KEY)), { on: true, groups: ["axes"] });
  await t.onTurn(info);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0][1].groups, ["axes"]); assert.equal(calls[0][1].people[0].name, "앨리스");
  assert.equal(t.status().phase, "done"); assert.deepEqual(t.status().unmatched, ["밥"]);
  assert.equal(JSON.parse(m.get(TURN_LOG_KEY))[0].after.initiative, 50);
  await t.onTurn(info); assert.equal(calls.length, 1, "같은 응답(key)은 한 번만");
});

test("턴 갱신기: 엔진 실패는 상태로만 남고 던지지 않는다", async () => {
  const { api } = fakeApi();
  const t = createErosyncTurn(api, { erosync: { on: () => true, isRunning: () => true, profile: async () => { throw new Error("boom"); } } });
  await t.save({ on: true });
  await t.onTurn({ rp: "턴", people: [{ name: "a" }] });
  assert.equal(t.status().phase, "error");
});

test("턴 갱신기: 흐름에 붙고 떼기", () => {
  const { api } = fakeApi(); let fn = null, offed = false;
  const t = createErosyncTurn(api, { erosync: erosyncWith({ ok: true }) });
  assert.equal(t.attach(null), false);
  assert.equal(t.attach({ onTurn: (f) => { fn = f; return () => { offed = true; }; } }), true);
  assert.equal(typeof fn, "function"); t.detach(); assert.equal(offed, true);
});

test("설정 정리: 모르는 항목은 버린다", () => {
  assert.deepEqual(normalizeTurnSettings({ on: "yes", groups: ["axes", "x", "axes"] }), { on: false, groups: ["axes"] });
  assert.deepEqual(normalizeTurnSettings(null), { on: false, groups: ["axes", "sexual"] });
});

test("연결: 기록기 알림·엔진 연결부·애드온 붙이기", () => {
  const turn = fs.readFileSync(new URL("../src/data/memoryturn.js", import.meta.url), "utf8");
  assert.ok(turn.includes("tellTurn({ rp: run.rp") && turn.includes("onTurn: (fn) =>"));
  const eng = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(eng.includes("async function duskTurnUpdate") && eng.includes("turn: duskTurnUpdate"));
  assert.ok(eng.includes("buildTurnSystem({ keys, axisDefs: AXIS_DEFINITIONS, sexDefs: SEX_AXIS_DEFINITIONS"), "원본 축 정의를 그대로 쓴다");
  const addon = fs.readFileSync(new URL("../addons/erosync/index.js", import.meta.url), "utf8");
  assert.ok(addon.includes("turn.attach(app.memory?.flow)"));
});

test("실제 엔진: 채팅이 없으면 매 턴 계산은 이유를 알리고 던지지 않는다(연결부 경로)", async () => {
  const { bootErosync } = await import("../src/erosync/erosync.js");
  const store = new Map(), noop = async () => {};
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } },
    addRisuReplacer: noop, removeRisuReplacer: noop, addRisuChatListener: noop, removeRisuChatListener: noop, registerSetting: noop, unregisterUIPart: noop, requestPluginPermission: async () => true, onUnload: noop };
  const e = await bootErosync(api);
  assert.equal(typeof e.profiles.turn, "function");
  await assert.rejects(() => e.profiles.turn({ people: [{ name: "a" }], rp: "턴" }), /채팅/);
  await e.dispose();
});
