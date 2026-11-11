// 2.1.4 보조 토큰 줄이기: 보조 호출 장부·인물 묶어 묻기·캐시용 지침·한도 올리기 조건
import test from "node:test";
import assert from "node:assert/strict";
import { onAux, usageTokens, mergeSide, auxTok } from "../src/engine/auxlog.js";
import { trackedRunLLM, aiTask, __resetAiStop } from "../src/engine/aistop.js";
import { runAI, setCustomRunner } from "../src/engine/runai.js";
import { linesStage2, linesStage2Group, splitGroupReply } from "../src/engine/memorylines.js";
import { recordTurn } from "../src/engine/recorder.js";
import { cutByLimit } from "../src/data/memoryturn.js";
import { callHtml } from "../src/engine/turninfo.js";
import { createTurnInfo } from "../src/data/turninfo.js";

const grab = () => { const got = []; const off = onAux((e) => got.push(e)); return { got, off }; };

test("공급자 사용량 읽기: 리수폿 꼴·Gemini 생각 토큰·OpenAI", () => {
  assert.deepEqual(usageTokens({ inputTokens: 100, outputTokens: 50, reasoningTokens: 30, reasoningIncluded: true }), { inTok: 100, outTok: 50 });
  assert.deepEqual(usageTokens({ inputTokens: 100, outputTokens: 50, reasoningTokens: 30, reasoningIncluded: false }), { inTok: 100, outTok: 80 });
  assert.deepEqual(usageTokens({ promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 7 }), { inTok: 10, outTok: 12 });
  assert.equal(usageTokens(null), null);
});
test("응답별 보조 호출 요약: 작업 이름별로 횟수·토큰을 더하고 큰 것부터, 어림 여부 표시", () => {
  let side = mergeSide(null, { label: "장기기억 · 기억 기록", inTok: 1000, outTok: 300, real: true });
  side = mergeSide(side, { label: "Erosync·애드온", inTok: 5000, outTok: 100 });
  side = mergeSide(side, { label: "장기기억 · 기억 기록", inTok: 1000, outTok: 300, real: true });
  assert.deepEqual(side.map((x) => [x.label, x.n]), [["Erosync·애드온", 1], ["장기기억 · 기억 기록", 2]]);
  assert.equal(side[1].inTok, 2000); assert.equal(side[1].est, false); assert.equal(side[0].est, true);
});
test("리스 보조 모델 호출(api.runLLMModel)은 열린 작업 이름으로, otherAx는 Erosync·애드온으로 장부에 적힌다", async () => {
  __resetAiStop(); const { got, off } = grab();
  const run = trackedRunLLM(async (o) => ({ type: "success", result: "응답 글".repeat(10) }));
  await aiTask("장기기억 · 기억 기록", () => run({ mode: "submodel", messages: [{ role: "user", content: "x".repeat(400) }] }));
  await run({ mode: "otherAx", messages: [{ role: "user", content: "y" }] });
  off();
  assert.equal(got.length, 2);
  assert.equal(got[0].label, "장기기억 · 기억 기록"); assert.ok(got[0].inTok >= 100 && got[0].outTok > 0);
  assert.equal(got[1].label, "Erosync·애드온");
});
test("내 API 모델(runAI custom)도 한 번만 장부에 적힌다", async () => {
  __resetAiStop(); const { got, off } = grab();
  setCustomRunner(async () => "결과");
  await runAI({}, [{ role: "user", content: "안녕" }], { mode: "custom", label: "인물 게이지", noUserPrompts: true });
  off(); setCustomRunner(null);
  assert.equal(got.length, 1); assert.equal(got[0].label, "인물 게이지"); assert.equal(got[0].outTok, auxTok("결과"));
});
test("호출 블록에 보조 호출 줄: 합계와 작업별", () => {
  const c = callHtml({ aux: false, model: "m", startAt: 0, lastAt: 1000, inTok: 9000, outTok: 10, side: [{ label: "장기기억 · 기억 기록", n: 4, inTok: 21000, outTok: 8000, est: false }, { label: "<E>", n: 1, inTok: 5000, outTok: 900, est: true }] });
  assert.ok(c.includes("보조 5회") && c.includes("보조 호출") && c.includes("장기기억 · 기억 기록 4회 · 입력 21k · 출력 8k") && c.includes("어림") && c.includes("&lt;E&gt;"));
});
const mem = () => { const store = new Map(); return { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, getDatabase: async () => ({ aiModel: "main", subModel: "sub" }) }; };
test("메인 요청 뒤에 나간 보조 호출이 그 응답 아래 블록에 묶여 보인다(첫 요청 전 호출은 다음 요청에)", async () => {
  const api = mem(); let now = 1000;
  const t = createTurnInfo(api, { chip: false, now: () => now }); await t.start(); await t.setCallShow(true);
  globalThis.__duskAux.note({ label: "정리 노트", inTok: 500, outTok: 50 });   // 첫 메인 요청 전
  await t.beforeRequest([{ role: "user", content: "안녕하세요 반갑습니다" }], "model");
  const resp = "그는 고개를 끄덕였다. 오늘은 여기까지 하자고 말했다."; now = 2000; await t.onOutput(resp); await t.settle();
  globalThis.__duskAux.note({ label: "장기기억 · 기억 기록", inTok: 3000, outTok: 700, real: true });
  globalThis.__duskAux.note({ label: "장기기억 · 기억 기록", inTok: 3000, outTok: 700, real: true });
  const shown = await t.onDisplay(resp);
  assert.ok(shown.includes("보조 3회") && shown.includes("장기기억 · 기억 기록 2회 · 입력 6k") && shown.includes("정리 노트 1회"));
});

test("캐시: 인물 지침에는 이름이 없어 인물이 달라도 글이 같다(이름은 데이터의 focus로)", () => {
  const a = linesStage2("민지", { wiki: true }), b = linesStage2("하야세 유우카", { wiki: true });
  assert.equal(a, b); assert.ok(!a.includes("민지"));
  assert.ok(linesStage2Group({ wiki: true }).includes("@|Name"));
});
test("묶음 답 나누기: @|이름 줄 기준, 띄어쓰기 달라도, JSON 꼴도, 표식 없으면 null", () => {
  const m = splitGroupReply("@|민지\nlike|+1|고마워\n- @| 하야세유우카\nnone\n@|모르는사람\nid|x", ["민지", "하야세 유우카"]);
  assert.deepEqual([...m], [["민지", "like|+1|고마워"], ["하야세 유우카", "none"]]);
  assert.equal(splitGroupReply('{"lines":["@|민지","id|학생"]}', ["민지"]).get("민지"), "id|학생");
  assert.equal(splitGroupReply("like|+1|고마워", ["민지"]), null);
});

const RP = "민지는 {{user}}의 손을 잡았다. \"오늘 와 줘서 정말 고마워.\" 민지가 웃었다. 옆에 있던 민준은 \"나는 먼저 간다\"며 자리를 떴다. 수아는 창가에서 둘을 지켜봤다. 하루는 문 앞에서 기다렸다.";
const run = () => ({ rp: RP, recent: "", docs: [], slots: new Map(), policies: {}, userNames: [], allowCreate: true, batch: { index: 1, total: 1 } });
const STAGE1 = "scene|카페에서 만남|카페|오후|yes\nwho|민지|손을 잡았다|2\nwho|민준|먼저 갔다|1\nwho|수아|지켜봤다|1\nwho|하루|기다렸다|1";
test("묶어 묻기: 인물 4명 = 개요 1번 + 묶음 2번(3명·1명), 답에 빠진 인물은 '새로 확인된 것 없음'", async () => {
  const sys = [];
  const call = async (msgs) => {
    sys.push(msgs[0].content.slice(0, 40)); const u = JSON.parse(msgs[1].content);
    if (/memory recorder/.test(msgs[0].content)) return STAGE1;
    if (/SEVERAL characters/.test(msgs[0].content)) { assert.equal(u.people.length, 3); assert.ok(u.people.every((p) => p.new === true)); return "@|민지\nid|대학생\nlike|+1|정말 고마워\n@|민준\nnone"; }
    return u.focus === "하루" ? "id|친구" : "none";
  };
  const rec = await recordTurn(call, run(), { group: true });
  assert.equal(sys.length, 3, "개요 + 3명 묶음 + 1명");
  const by = Object.fromEntries(rec.people.map((p) => [p.name, p]));
  assert.ok(by["민지"].lines.some((l) => l.tag === "id"));
  assert.deepEqual(by["수아"].lines, []); assert.ok(!by["수아"].failed, "빠진 인물은 실패가 아니다");
  assert.ok(by["하루"].lines.some((l) => l.tag === "id"));
});
test("묶어 묻기: 묶음 답을 못 읽으면 그 묶음만 한 명씩 다시(예전 방식), group 끄면 처음부터 한 명씩", async () => {
  let n = 0; const focus = [];
  const call = async (msgs) => { n++; const u = JSON.parse(msgs[1].content); if (/memory recorder/.test(msgs[0].content)) return STAGE1; if (/SEVERAL/.test(msgs[0].content)) return "모르겠어요"; focus.push(u.focus); return "id|사람"; };
  const rec = await recordTurn(call, run(), { group: true });
  assert.deepEqual(focus, ["민지", "민준", "수아", "하루"]); assert.equal(n, 1 + 2 + 4, "개요 + 묶음 2번 시도 + 한 명씩 4");
  assert.ok(rec.people.every((p) => p.lines.length));
  n = 0; await recordTurn(async (msgs) => { n++; return /memory recorder/.test(msgs[0].content) ? STAGE1 : "none"; }, run(), {});
  assert.equal(n, 5, "group 기본 꺼짐(직접 부를 때) = 예전처럼 한 명씩");
});
test("묶어 묻기: 생성 중지(취소)는 한 명씩으로 넘어가지 않고 그대로 던진다", async () => {
  const call = async (msgs) => { if (/memory recorder/.test(msgs[0].content)) return STAGE1; throw Object.assign(new Error("취소"), { code: "model-aborted" }); };
  await assert.rejects(recordTurn(call, run(), { group: true }), /취소/);
});
test("출력 한도는 '한도에 걸려 끊긴' 빈 응답일 때만 올린다", () => {
  assert.equal(cutByLimit(new Error("Writer Dusk 모델이 빈 응답을 반환했습니다. · finish_reason MAX_TOKENS · completion_tokens 0")), true);
  assert.equal(cutByLimit(new Error("… · finish_reason length · reasoning 있음")), true);
  assert.equal(cutByLimit(new Error("… · stop_reason max_tokens")), true);
  assert.equal(cutByLimit(new Error("… · finish_reason STOP")), false);
  assert.equal(cutByLimit(new Error("… 빈 응답을 반환했습니다. · RisuAI 보조모델")), false, "이유를 모르면 올리지 않는다");
});
