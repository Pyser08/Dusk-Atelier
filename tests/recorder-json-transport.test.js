// 3.0.8 회귀: 기록기는 '줄'을 요구하지만 모델 호출층(llm-client)은 모든 호출에 "Return one JSON object only" 시스템 지시를 붙이고,
// 빈 응답은 반환이 아니라 예외로 던진다. 그래서 JSON으로 답하는 모델의 '변화 없음'이 실패로 잡혀 재시도를 반복했고,
// 빈 응답(추론만 하고 끝남) 한 번에 기록 전체가 실패했다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWriterRun, recordTurn, recorderText, attemptDuskRecord } from "../src/engine/recorder.js";
import { isNoneReply } from "../src/engine/memorylines.js";
import { assembleWriterPrompt } from "../src/engine/pot/writer-prompt.js";
import { SettingsStore } from "../src/engine/pot/settings.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
const RP = "민지는 {{user}}의 손을 잡았다. \"오늘 와 줘서 정말 고마워.\" 민지가 웃었다. 옆에 있던 민준은 \"나는 먼저 간다\"며 자리를 떴다.";
async function runOf() {
  const m = new Map(), st = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); return true; }, removeItem: async (k) => { m.delete(k); } };
  const s = new SettingsStore(st, {}); await s.load(); s.forceRelationshipOnlyMode();
  const p = assembleWriterPrompt({ sourceLibrary: LIB, settings: s.snapshot(), wikiScope: createEmptyWikiScope({ characterId: "c", chatKey: "k" }), rpText: RP, requestRef: "r" });
  return parseWriterRun(p.prompt);
}
const emptyErr = () => Object.assign(new Error("Writer Dusk 모델이 빈 응답을 반환했습니다."), { code: "empty-model-response" });
const STAGE1 = JSON.stringify({ lines: ["scene|민지가 {{user}}에게 고마워했다|카페|오후|yes", "who|민지|{{user}}의 손을 잡았다|2", "who|민준|먼저 자리를 떴다|1", "new|민준|민지의 오빠", "new|민지|대학 후배"] });

test("JSON 빈 목록·none 목록은 '변화 없음' 정상 답", () => {
  for (const r of ['{"lines":[]}', '{"lines":["none"]}', '```json\n{"lines": []}\n```', "[]", '{"lines":["없음"]}']) assert.ok(isNoneReply(r), r);
  assert.ok(!isNoneReply('{"lines":["like|+1|고마워"]}'));
});

test("JSON으로만 답하는 모델: 변화 없는 인물은 다시 묻지 않고 실패로 남기지 않는다", async () => {
  const run = await runOf(); let calls = 0;
  const model = async (msgs) => { calls++; const u = JSON.parse(msgs[1].content); return u.focus ? '{"lines":[]}' : STAGE1; };
  const rec = await recordTurn(model, run, {});
  assert.ok(rec.people.length >= 1);
  assert.ok(rec.people.every((p) => !p.failed), "실패 아님");
  assert.equal(calls, 1 + rec.people.length, "인물마다 한 번만");
});

test("빈 응답 예외(추론만 하고 끝남)는 1단계를 실패시키지 않고 다시 묻는다", async () => {
  const run = await runOf(); let first = true;
  const model = async (msgs) => { const u = JSON.parse(msgs[1].content); if (!u.focus && first) { first = false; throw emptyErr(); } return u.focus ? "none" : STAGE1; };
  const rec = await recordTurn(model, run, {});
  assert.ok(rec.stage1.scene, "다시 물어 장면을 받음");
});

test("빈 응답 외의 오류(연결 실패 등)는 그대로 던진다", async () => {
  const run = await runOf();
  await assert.rejects(recordTurn(async () => { throw new Error("연결 실패"); }, run, {}), /연결 실패/);
});

test("인물 단계는 형식 오류가 계속돼도 최대 3번(전체 2 + 가벼운 지침 1)까지만 묻는다(추론 토큰 낭비 방지)", async () => {
  const run = await runOf(); const per = new Map();
  const model = async (msgs) => { const u = JSON.parse(msgs[1].content); if (!u.focus) return STAGE1; per.set(u.focus, (per.get(u.focus) ?? 0) + 1); return "잘 모르겠습니다."; };
  const rec = await recordTurn(model, run, {});
  assert.ok(rec.people.length && rec.people.every((p) => p.failed));
  for (const n of per.values()) assert.ok(n <= 3, `인물 호출 ${n}번`);
});

test("기록기 프롬프트는 호출층의 JSON 강제와 부딪히지 않게 출력 형식을 JSON {lines}로 못박는다", () => {
  const t = recorderText([{ role: "system", content: "Reply with LINES ONLY" }, { role: "user", content: "{}" }], { front: "F", back: "B" });
  assert.ok(t.startsWith("F")); assert.ok(t.includes("# DATA\n{}"));
  const tail = t.slice(t.lastIndexOf("B") - 400);
  assert.match(tail, /\{"lines"/); assert.match(tail, /\{"lines":\[\]\}/);
});

test("기록기가 끝내 실패하면 null(예전 리수폿 Writer로) — 취소는 그대로 던진다", async () => {
  let seen = null;
  assert.equal(await attemptDuskRecord(async () => { throw new Error("형식 오류"); }, (e) => { seen = e.message; }), null);
  assert.equal(seen, "형식 오류");
  await assert.rejects(attemptDuskRecord(async () => { throw Object.assign(new Error("취소"), { code: "model-aborted" }); }), /취소/);
  assert.equal(await attemptDuskRecord(async () => "ok"), "ok");
});

test("감정이 안 움직인 응답이어도 게이지 없는 인물은 0에서 시작한다(‘수치 비어 있음’ 알림 반복 방지)", async () => {
  const { buildEnvelope } = await import("../src/engine/recorder.js");
  const run = await runOf();
  const model = async (msgs) => { const u = JSON.parse(msgs[1].content); return u.focus ? '{"lines":["id|대학생"]}' : STAGE1; };
  const rec = await recordTurn(model, run, {});
  const env = buildEnvelope(run, rec);
  for (const p of rec.people) assert.ok(env.metric_ops.some((m) => m.document_ref === p.ref && m.slot_id === "affinity.score" && m.operation === "init"), p.name);
});

test("알림 판단: 이번에 기록한 인물만 본다 · 내 API 줄 프롬프트는 JSON {lines}로 못박는다", async () => {
  const { judgeAutoResult } = await import("../src/data/retrytoast.js");
  const { toPrompt } = await import("../src/engine/modelcfg.js");
  const scope = { documents: { a: { type: "Character", title: "A", metrics: [] }, b: { type: "Character", title: "B", metrics: [] }, c: { type: "Character", title: "C", metrics: [{}] } } };
  assert.equal(judgeAutoResult({ phase: "completed", scope })?.kind, "nometric");
  assert.equal(judgeAutoResult({ phase: "completed", scope, names: ["C"] }), null);
  const p = toPrompt([{ role: "system", content: "Reply with LINES ONLY" }, { role: "user", content: "{}" }]);
  assert.equal(p.wrapped, false); assert.match(p.prompt, /\{"lines":\[\]\}/);
});

const isLightPrompt = (sys) => !/feel\|/.test(sys);
test("가벼운 지침 자동 전환: 전체 지침에서 형식 오류면 가벼운 지침으로 다시 묻고 남은 인물도 가볍게", async () => {
  const run = await runOf(); const log = [];
  const model = async (msgs) => { const u = JSON.parse(msgs[1].content); if (!u.focus) return STAGE1; const lt = isLightPrompt(msgs[0].content); log.push([u.focus, lt]); return lt ? '{"lines":["id|대학생"]}' : "음, 잘 모르겠네요."; };
  const auto = { streak: 0, hold: 0 };
  const rec = await recordTurn(model, run, { auto });
  assert.equal(rec.lightAuto, true); assert.ok(rec.people.length >= 2 && rec.people.every((p) => !p.failed));
  const second = rec.people[1].name;
  assert.ok(log.filter(([n]) => n === second).every(([, lt]) => lt), "두 번째 인물은 처음부터 가볍게");
  assert.equal(auto.streak, 1);
  await recordTurn(model, run, { auto });
  assert.equal(auto.hold, 10, "두 응답 연속이면 10번 쉼");
  log.length = 0; await recordTurn(model, run, { auto });
  assert.ok(log.every(([, lt]) => lt), "쉬는 동안은 전체 지침을 보내지 않음"); assert.equal(auto.hold, 9);
});
test("가벼운 지침 자동 전환: 잘 되는 모델은 전환하지 않고, 연결 오류로는 전환하지 않는다", async () => {
  const run = await runOf(); const auto = { streak: 1, hold: 0 };
  const ok = await recordTurn(async (msgs) => JSON.parse(msgs[1].content).focus ? "none" : STAGE1, run, { auto });
  assert.equal(ok.lightAuto, false); assert.equal(auto.streak, 0);
  let lightSeen = false;
  const rec = await recordTurn(async (msgs) => { const u = JSON.parse(msgs[1].content); if (!u.focus) return STAGE1; if (isLightPrompt(msgs[0].content)) lightSeen = true; throw new Error("연결 실패"); }, run, { auto });
  assert.ok(rec.people.every((p) => p.failed)); assert.equal(lightSeen, false); assert.equal(rec.lightAuto, false);
});
test("가벼운 지침 자동 전환: Dusk 분석(analyzeStaged)도 같은 규칙", async () => {
  const { analyzeStaged } = await import("../src/engine/memoryprompt.js");
  const text = "민지는 {{user}}의 손을 잡았다. ".repeat(12); let light = 0, full = 0;
  const call = async (msgs) => { const sys = msgs[0].content; if (sys.startsWith("You are the memory recorder")) return "scene|민지가 손을 잡았다|방|밤|yes\nwho|민지|손을 잡았다|2";
    if (isLightPrompt(sys)) { light++; return "keys|손"; } full++; return "모르겠어요"; };
  const out = await analyzeStaged(call, { bot: "b", known: [], recent: [], newest: { index: 1, text } }, {});
  assert.ok(full >= 1 && light === 1); assert.ok(out.people.some((p) => p.name === "민지"));
});
