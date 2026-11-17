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
  assert.equal(normalizeTurnSettings(undefined).on, true);   // 2.2.0부터 기본 켜짐
  await t.save({ on: false });
  assert.equal(await t.onTurn(info), null); assert.equal(calls.length, 0);
  await t.save({ on: true, groups: ["axes"] });
  assert.deepEqual(JSON.parse(m.get(TURN_KEY)), { on: true, groups: ["axes"], autoStart: true });
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
  assert.deepEqual(normalizeTurnSettings({ on: "yes", groups: ["axes", "x", "axes"] }), { on: false, groups: ["axes"], autoStart: true });
  assert.deepEqual(normalizeTurnSettings(null), { on: true, groups: ["axes", "sexual"], autoStart: true });
});

test("연결: 기록기 알림·엔진 연결부·애드온 붙이기", () => {
  const turn = fs.readFileSync(new URL("../src/data/memoryturn.js", import.meta.url), "utf8");
  assert.ok(turn.includes("tellTurn({ rp: run.rp") && turn.includes("onTurn: (fn) =>"));
  assert.ok(turn.includes('source: Date.now() < backfillUntil ? "backfill" : "live"') && turn.includes("backfillUntil = Date.now() + BACKFILL_HOLD_MS;") && turn.includes("backfillUntil = 0;"), "지난 대화 분석 기록엔 출처 표시(취소돼도 시간이 지나면 풀림)");
  assert.ok(!/backfilling/.test(turn), "끝 알림에만 기대는 옛 표시는 없음");
  assert.ok(!fs.readFileSync(new URL("../src/data/erosyncturn.js", import.meta.url), "utf8").includes('profile("start"'), "턴 갱신기는 전체 분석을 부르지 않는다");
  const eng = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(eng.includes("async function duskTurnUpdate") && eng.includes("turn: duskTurnUpdate"));
  assert.ok(eng.includes("buildTurnSystem({ keys, axisDefs: AXIS_DEFINITIONS, sexDefs: SEX_AXIS_DEFINITIONS"), "원본 축 정의를 그대로 쓴다");
  // 2.2.9: Erosync 애드온은 사용 중단 — 매 턴 계산을 붙이지 않는다
  const addon = fs.readFileSync(new URL("../addons/erosync/index.js", import.meta.url), "utf8");
  assert.ok(!addon.includes("turn.attach("));
});

test("실제 엔진: 채팅이 없으면 매 턴 계산은 이유를 알리고 던지지 않는다(연결부 경로)", async () => {
  const { bootErosync } = await import("../src/erosync/erosync.js");
  const store = new Map(), noop = async () => {};
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } },
    addRisuReplacer: noop, removeRisuReplacer: noop, addRisuChatListener: noop, removeRisuChatListener: noop, registerSetting: noop, unregisterUIPart: noop, requestPluginPermission: async () => true, onUnload: noop };
  const e = await bootErosync(api);
  assert.equal(typeof e.profiles.turn, "function");
  await assert.rejects(() => e.profiles.turn({ people: [{ name: "a" }], rp: "턴" }), /채팅/);
  assert.equal(typeof e.profiles.seed, "function"); assert.equal(typeof e.profiles.estimate, "function");
  await assert.rejects(() => e.profiles.seed({ name: "a" }), /채팅/);
  assert.deepEqual(await e.profiles.seed({ name: " " }), { ok: false, reason: "이름이 없어요" });
  await assert.rejects(() => e.profiles.estimate(), /채팅/);
  await e.dispose();
});

test("처음 보는 인물: 전체 분석 대신 그 인물만 seed, 두 턴 나온 이름만, 카운터는 저장돼 다시 켜도 이어진다", async () => {
  const { api } = fakeApi(), calls = [];
  let un = ["점원"];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [{ id: "a", name: "앨리스", detail: { likes: ["x"] } }] }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "turn") return { ok: true, changed: [], unmatched: un }; if (op === "status") return { running: false }; return { ok: true, analyzed: true }; } };
  let t = createErosyncTurn(api, { erosync: er });
  const turn = async (k, source) => { await t.onTurn({ key: k, rp: "턴", source, people: [{ name: "앨리스" }, { name: "세라", memory: "세라 기억" }] }); await new Promise((r) => setTimeout(r, 0)); };
  const ops = (o) => calls.filter(([op]) => op === o);
  await turn("k1");
  assert.equal(ops("seed").length, 0, "한 번 스친 점원은 안 함");
  un = ["세라"]; await turn("k2");
  t = createErosyncTurn(api, { erosync: er });   // 새로고침·애드온 다시 켜기
  await turn("k3");
  assert.deepEqual(ops("seed").map(([, a]) => a.name), ["세라"], "저장된 카운터로 두 턴째 세라만 seed");
  assert.equal(ops("seed")[0][1].memory, "세라 기억", "장기기억 요약을 같이 넘김");
  assert.equal(ops("start").length, 0, "전체 분석은 자동으로 부르지 않음");
  await turn("k4"); await turn("k5");
  assert.equal(ops("seed").length, 1, "한 번 만든 이름은 다시 안 함");
  const log = await t.autoHistory();
  assert.equal(log[0].why, "new"); assert.deepEqual(log[0].names, ["세라"]);
});

test("지난 대화 분석(backfill)에서 온 턴은 자동 출발값 집계에서 뺀다", async () => {
  const { api } = fakeApi(), calls = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "turn") return { ok: true, changed: [], unmatched: ["세라"] }; return { ok: true }; } };
  const t = createErosyncTurn(api, { erosync: er });
  for (const k of ["b1", "b2", "b3"]) { await t.onTurn({ key: k, rp: "턴", source: "backfill", people: [{ name: "세라" }] }); await new Promise((r) => setTimeout(r, 0)); }
  assert.equal(calls.filter(([op]) => op === "seed" || op === "start").length, 0);
});

test("출발값이 하나도 없으면 전체 분석 대신 이번 턴에 기록된 인물만 seed(최대 8명)", async () => {
  const { api } = fakeApi(), calls = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, arg) => { calls.push([op, arg]); return { ok: true, changed: [], unmatched: [] }; } };
  const t = createErosyncTurn(api, { erosync: er });
  await t.onTurn({ key: "e1", rp: "턴", people: ["가", "나", "다", "라", "마", "바", "사", "아", "자"].map((name) => ({ name })) });
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(calls.filter(([op]) => op === "seed").map(([, a]) => a.name), ["가", "나", "다", "라", "마", "바", "사", "아"]);
  assert.equal(calls.filter(([op]) => op === "start").length, 0);
});

test("출발값 만들기가 실패한 이름은 완료로 남기지 않아 다음에 다시 시도, {{user}}는 빈 채팅에서도 뺀다", async () => {
  const { api } = fakeApi(), calls = [];
  let fail = true;
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "seed") { if (fail) throw new Error("채팅 상태를 읽지 못했어요"); return { ok: true }; } return { ok: true, changed: [], unmatched: [] }; } };
  const t = createErosyncTurn(api, { erosync: er });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  await t.onTurn({ key: "f1", rp: "턴", people: [{ name: "{{user}}" }, { name: "세라" }] }); await tick(); await tick();
  assert.deepEqual(calls.filter(([op]) => op === "seed").map(([, a]) => a.name), ["세라"]);
  fail = false;
  await t.onTurn({ key: "f2", rp: "턴", people: [{ name: "세라" }] }); await tick(); await tick();
  assert.equal(calls.filter(([op]) => op === "seed").length, 2, "실패했던 세라를 다시 시도");
  assert.equal((await t.autoHistory())[1].results[0].ok, false);
});

test("출발값 만들기는 같은 이름이 3번 실패하면 더 시도하지 않는다", async () => {
  const { api } = fakeApi(), calls = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "seed") return { ok: false, reason: "error" }; return { ok: true, changed: [], unmatched: [] }; } };
  const t = createErosyncTurn(api, { erosync: er });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  for (const k of ["a", "b", "c", "d", "e"]) { await t.onTurn({ key: k, rp: "턴", people: [{ name: "세라", memory: "기록" }] }); await tick(); await tick(); }
  assert.equal(calls.filter(([op]) => op === "seed").length, 3);
});

test("출발값이 없는 채팅: 그 턴에 기록된 인물을 다 만든다(6명), 앞 묶음이 도는 중에 준비된 이름은 버리지 않고 이어서", async () => {
  const { api } = fakeApi(), calls = [];
  let release; const gate = new Promise((r) => { release = r; });
  let people = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "seed") { await gate; return { ok: true }; } if (op === "turn") return { ok: true, changed: [], unmatched: ["카즈"] }; return { ok: true }; } };
  const t = createErosyncTurn(api, { erosync: er });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  await t.onTurn({ key: "e1", rp: "턴", people: ["가", "나", "다", "라", "마", "바"].map((name) => ({ name })) }); await tick();
  people = [{ id: "a", name: "가", detail: { likes: ["x"] } }];
  await t.onTurn({ key: "e2", rp: "턴", people: [{ name: "카즈" }] }); await tick();
  await t.onTurn({ key: "e3", rp: "턴", people: [{ name: "카즈" }] }); await tick();   // 카즈 준비됨 — 앞 묶음은 아직 도는 중
  release(); for (let i = 0; i < 20; i++) await tick();
  assert.deepEqual(calls.filter(([op]) => op === "seed").map(([, a]) => a.name), ["가", "나", "다", "라", "마", "바", "카즈"]);
});

test("대화 속 인물로 만들기: 기억에 있고 Erosync 프로필이 없는 인물만, 기억 요약을 같이 넘김", async () => {
  const { chatPeopleToSeed, seedAllChatPeople } = await import("../src/data/erosyncseedall.js");
  const folder = { people: {
    a: { name: "주설지", digest: "게임 좋아함", records: [{ act: "밤새 게임", orphan: false }] },
    b: { name: "미오", aliases: ["Mio"], records: [] },
    c: { name: "{{user}}" }, d: { name: "숨김", ctx: "never" }, e: { name: "지하연", records: [{ act: "인사", orphan: true }, { act: "웃음" }] } } };
  const snap = { ok: true, people: [{ id: "x", name: "mio" }] };
  const list = chatPeopleToSeed(folder, snap);
  assert.deepEqual(list.map((p) => p.name), ["주설지", "지하연"]);
  assert.equal(list[0].memory, "게임 좋아함\n밤새 게임"); assert.equal(list[1].memory, "웃음");
  const calls = [];
  const res = await seedAllChatPeople({ erosync: { profile: async (op, p) => { if (op === "seedMany") return { ok: false }; calls.push([op, p.name]); return { ok: true, analyzed: p.name === "주설지" }; } } }, { list });
  assert.deepEqual(calls, [["seed", "주설지"], ["seed", "지하연"]]); assert.equal(res[0].analyzed, true);
});

test("출발값 만들기는 여러 명을 한 번에(seedMany) 부른다 — 엔진에 없으면 한 명씩", async () => {
  const { api } = fakeApi(), calls = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, arg) => { calls.push([op, arg]); if (op === "seedMany") return { ok: true, results: arg.map((p) => ({ name: p.name, ok: true, analyzed: true })) }; return { ok: true, changed: [], unmatched: [] }; } };
  const t = createErosyncTurn(api, { erosync: er });
  await t.onTurn({ key: "m1", rp: "턴", people: ["가", "나", "다"].map((name) => ({ name, memory: name + " 기록" })) });
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(calls.filter(([op]) => op === "seedMany").map(([, a]) => a.map((p) => p.name)), [["가", "나", "다"]]);
  assert.equal(calls.filter(([op]) => op === "seed").length, 0);
  assert.equal((await t.autoHistory())[0].results.every((r) => r.analyzed), true);
  const { seedAllChatPeople } = await import("../src/data/erosyncseedall.js");
  const c2 = [];
  await seedAllChatPeople({ erosync: { profile: async (op, a) => { c2.push(op); if (op === "seedMany") return { ok: false, reason: "이 버전에서는" }; return { ok: true }; } } }, { list: [{ name: "가" }, { name: "나" }] });
  assert.deepEqual(c2, ["seedMany", "seed", "seed"], "seedMany를 못 쓰면 한 명씩");
});

test("출발값: 분석 없이 임시값만 남은 인물은 다음에 다시 시도한다(3번까지)", async () => {
  const { api } = fakeApi(), seeds = [];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s9" }, people: [{ id: "a", name: "앨리스", detail: { likes: ["x"] } }] }),
    profile: async (op, arg) => { if (op === "turn") return { ok: true, changed: [], unmatched: ["점원"] }; if (op === "status") return { running: false }; if (op === "seed") seeds.push(arg.name); return { ok: true, analyzed: false }; } };
  const t = createErosyncTurn(api, { erosync: er });
  for (let i = 0; i < 12; i++) { await t.onTurn({ key: `k${i}`, people: [{ name: "점원" }], rp: "x" }); await new Promise((r) => setTimeout(r, 5)); }
  assert.ok(seeds.length >= 2 && seeds.length <= 3, `다시 시도 ${seeds.length}번`);
});

test("체위·장소가 빈 기존 인물은 새 인물을 만들지 않는 턴에 4명씩 채운다(이번 턴 인물부터, 고친 인물·SFW 제외, 2번까지)", async () => {
  const { api } = fakeApi(), seeds = [];
  const people = [{ id: "1", name: "가" }, { id: "2", name: "나" }, { id: "3", name: "다" }, { id: "4", name: "라" }, { id: "5", name: "마" }, { id: "6", name: "바", overridden: true }, { id: "7", name: "사", sfw: true }, { id: "8", name: "아", detail: { likes: ["x"] } }];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "f1" }, people }),
    profile: async (op, arg) => { if (op === "turn") return { ok: true, changed: [], unmatched: [] }; if (op === "status") return { running: false }; if (op === "seedMany") { seeds.push(arg.map((p) => p.name)); return { ok: true, results: arg.map((p) => ({ name: p.name, ok: true, analyzed: false })) }; } return { ok: true }; } };
  const t = createErosyncTurn(api, { erosync: er });
  const tick = () => new Promise((r) => setTimeout(r, 5));
  await t.onTurn({ key: "f1", rp: "턴", people: [{ name: "마" }] }); await tick();
  assert.deepEqual(seeds[0], ["마", "가", "나", "다"]);
  for (let i = 2; i < 8; i++) { await t.onTurn({ key: `f${i}`, rp: "턴", people: [{ name: "마" }] }); await tick(); }
  const all = seeds.flat();
  assert.ok(!all.includes("바") && !all.includes("사") && !all.includes("아"));
  for (const n of ["가", "나", "다", "라", "마"]) assert.ok(all.filter((x) => x === n).length <= 2, `${n} 2번까지`);
});

test("체위·장소 채우기: 도는 중인 묶음은 다음 턴에 또 부르지 않고, busy는 시도로 안 센다", async () => {
  const { api } = fakeApi(), seeds = [];
  let release; const gate = new Promise((r) => { release = r; });
  let busy = true;
  const people = [{ id: "1", name: "가" }];
  const er = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "f2" }, people }),
    profile: async (op, arg) => { if (op === "turn") return { ok: true, changed: [], unmatched: [] }; if (op === "status") return { running: false };
      if (op === "seedMany") { seeds.push(arg.map((p) => p.name)); await gate; return { ok: true, results: arg.map((p) => ({ name: p.name, ok: !busy, analyzed: false, reason: busy ? "busy" : "" })) }; } return { ok: true }; } };
  const t = createErosyncTurn(api, { erosync: er });
  const tick = () => new Promise((r) => setTimeout(r, 5));
  await t.onTurn({ key: "g1", rp: "턴", people: [{ name: "가" }] }); await tick();
  await t.onTurn({ key: "g2", rp: "턴", people: [{ name: "가" }] }); await tick();
  assert.equal(seeds.length, 1, "도는 중엔 다시 안 부름");
  release(); await tick(); busy = false;
  for (let i = 3; i < 8; i++) { await t.onTurn({ key: `g${i}`, rp: "턴", people: [{ name: "가" }] }); await tick(); }
  assert.equal(seeds.length, 3, "busy 1번 + 실제 시도 2번");
});
