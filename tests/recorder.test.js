// 2.0.0 Dusk 기록기: 줄 형식 → 리수폿 응답(JSON envelope) 변환이 실제 리수폿 검증·저장을 통과하는지, 상태(사망)가 우선하는지.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWriterRun, recordTurn, buildEnvelope, buildDusk, exactQuote, gaugeMessages, parseGaugeLines } from "../src/engine/recorder.js";
import { parseLines, fromStage1, LINES_STAGE1, linesStage2 } from "../src/engine/memorylines.js";
import { buildBlock, stateLines } from "../src/engine/memoryinject.js";
import { assembleWriterPrompt } from "../src/engine/pot/writer-prompt.js";
import { executeWriterBatches } from "../src/data/pot/writer-batch.js";
import { SettingsStore } from "../src/engine/pot/settings.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
async function potSettings() {
  const m = new Map(), st = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); return true; }, removeItem: async (k) => { m.delete(k); } };
  const s = new SettingsStore(st, {}); await s.load(); s.forceRelationshipOnlyMode(); return s.snapshot();
}
const RP1 = "민지는 {{user}}의 손을 잡았다. \"오늘 와 줘서 정말 고마워.\" 민지가 웃었다. 옆에 있던 민준은 \"나는 먼저 간다\"며 자리를 떴다. 민지는 {{user}}를 선배라고 부르며 존댓말을 썼다.";
const RP2 = "그날 밤 민준은 골목에서 칼에 찔려 죽었다. 민지는 오열했다. \"오빠가... 오빠가 죽었어.\" {{user}}는 민지를 꼭 안아 주었다.";
const fake = async (msgs) => {
  const sys = msgs[0].content, u = JSON.parse(msgs[1].content);
  if (sys.startsWith("You are the memory recorder")) return u.newest.includes("죽었다")
    ? "scene|민준이 골목에서 칼에 찔려 죽었다|골목|밤|yes\nstate|민준|사망|민준은 골목에서 칼에 찔려 죽었다\nwho|민지|오빠의 죽음에 오열했다|3"
    : "scene|민지가 {{user}}에게 고마워했다|카페|오후|yes\nwho|민지|{{user}}의 손을 잡고 고마워했다|2\nwho|민준|먼저 자리를 떴다|1\nnew|민준|민지의 오빠";
  if (u.focus === "민지") return "like|+2|오늘 와 줘서  정말 고마워\nnow|{{user}}를 고마운 선배로 여긴다\ncall|{{user}}|선배|formal\nid|민준의 여동생\nprofile|다정함|다정함,조심성|가족\nto|{{user}}|warm|touch|손을 잡았다";
  return "none";
};

test("리수폿 Writer 지침 크기: 빈 위키에서도 수만 자(그래서 기록기로 대신한다)", async () => {
  const p = assembleWriterPrompt({ sourceLibrary: LIB, settings: await potSettings(), wikiScope: createEmptyWikiScope({ characterId: "c", chatKey: "k" }), rpText: RP1, requestRef: "r" });
  assert.ok(p.prompt.length > 50000);
  const run = parseWriterRun(p.prompt);
  assert.equal(run.requestRef, "r"); assert.ok(run.rp.includes("민지")); assert.ok(run.slots.has("core.relationship"));
  assert.ok(LINES_STAGE1.length < 4000 && linesStage2("민지", { wiki: true, isNew: true }).length < 4000, "기록기 지침은 짧다");
});

test("두 턴: 실제 리수폿 검증을 통과해 카드·호감도·프로필이 저장되고, 사망은 기본정보의 '현재 상태'로 남는다", async () => {
  const settings = await potSettings(); let scope = createEmptyWikiScope({ characterId: "c1", chatKey: "k1" }); const cache = new Map(); let dusk = null;
  const turn = async (rp, ref) => {
    const llmCall = async (_a, _k, _p, prompt) => { const run = parseWriterRun(prompt); const rec = await recordTurn(fake, run, { cache }); dusk = buildDusk(rec); return JSON.stringify(buildEnvelope(run, rec)); };
    const input = { settings, sourceLibrary: LIB, wikiScope: scope, rpText: rp, userText: "", recentContext: "", userIdentity: { title: "현우", aliases: [], known: true }, requestRef: ref, seedSources: {}, candidateDocumentIds: [], newCharacterCandidates: [], allowCreate: true };
    const out = await executeWriterBatches({ input, preset: {}, api: {}, keyStore: {}, llmCall, batchRef: "b" + ref, contributionRef: "c" + ref });
    assert.equal(out.validationSummary.rejected, 0, JSON.stringify(out.validationSummary.details));
    scope = out.scope;
  };
  await turn(RP1, "r1");
  const minji = Object.values(scope.documents).find((d) => d.title === "민지");
  assert.ok(minji.sections.some((s) => s.heading === "인간관계" && /고마운 선배/.test(s.body)));
  assert.ok(minji.sections.some((s) => /선배/.test(s.body) && /존댓말/.test(s.body)), "말투");
  assert.equal(minji.metrics.find((m) => m.slotId === "affinity.score").value, 3, "init 0 + delta 3 (띄어쓰기 다른 인용도 원문 구간으로 고쳐 씀)");
  assert.ok(scope.people.profiles[minji.id], "새 인물 성격 프로필");
  assert.ok(Object.values(scope.documents).some((d) => d.title === "민준"));
  assert.ok(dusk.scene.sum && dusk.people.some((p) => p.name === "민지"));
  await turn(RP2, "r2");
  const minjun = Object.values(scope.documents).find((d) => d.title === "민준");
  assert.match(minjun.sections.find((s) => s.heading === "기본정보").body, /현재 상태: 사망/);
  assert.ok(dusk.people.some((p) => p.name === "민준" && p.attr?.v === "사망"));
});

test("상태 줄은 본문 인용이 있어야 받는다 · close는 열린 항목 id만", () => {
  const lines = parseLines("scene|x|y|z|yes\nstate|민준|사망|지어낸 인용\nstate|민지|부상|팔을 다쳤다\nclose|o1\nclose|o9");
  const r = fromStage1(lines, { known: [{ name: "민준" }, { name: "민지" }], source: "민지는 팔을 다쳤다.", openIds: new Set(["o1"]) });
  assert.deepEqual(r.states.map((s) => s.name), ["민지"]);
  assert.deepEqual(r.open.close, ["o1"]);
  assert.ok(r.people.some((p) => p.attr?.c === "status" && p.attr.v === "부상"));
});

test("JSON만 내는 모델도 받는다 · 인용은 원문 구간으로", () => {
  assert.equal(parseLines('{"lines":["scene|a|b|c|yes","who|민지|웃음|1"]}').length, 2);
  assert.equal(exactQuote("정말  고마워", "오늘 와 줘서 정말 고마워."), "정말 고마워");
  assert.equal(exactQuote("없는 말", "오늘 와 줘서"), "");
});

test("주입: 사망한 인물은 'Current facts' 맨 앞에, 이름 옆에 상태 표시", () => {
  const rec = (i, act, extra = {}) => ({ id: "r" + i, at: i, h: "h" + i, act, g: "A", orphan: false, ...extra });
  const folder = { cursor: { at: 50 }, scenes: [{ id: "s", at: 50, sum: "장례식", who: ["민지"] }], people: {
    민준: { name: "민준", records: [rec(1, "민지와 웃었다"), rec(10, "상태: 사망", { attr: { c: "status", k: "상태", v: "사망" } })] },
    민지: { name: "민지", records: [rec(2, "오열했다")] } } };
  assert.match(stateLines(folder)[0], /민준: 사망 — cannot appear/);
  const { text } = buildBlock(folder, { messageCount: 60, recentText: "민준 민지" });
  assert.ok(text.indexOf("Current facts") < text.indexOf("Characters"));
  assert.match(text, /- 민준 \[사망\]/);
});

test("게이지: 따로 작은 호출, 줄로 받는다", () => {
  const m = gaugeMessages([{ id: "g1", name: "신뢰", who: [{ name: "민지", v: 3 }] }], { newest: "민지가 웃었다", suggest: true });
  assert.match(m[0].content, /^You update character gauges/);
  assert.deepEqual(parseGaugeLines("g|g1|민지|+2|웃었다\nidea|경계심|낯선 이 경계"), { gauge: [{ g: "g1", who: "민지", d: 2, why: "웃었다" }], gaugeIdea: { name: "경계심", desc: "낯선 이 경계" } });
  assert.deepEqual(parseGaugeLines("none"), { gauge: [] });
});

test("리수폿 인물 도구용 JSON 다듬기: 생각 글·설명·코드 펜스·끝 쉼표", async () => {
  const { cleanJsonReply } = await import("../src/engine/jsonreply.js");
  assert.equal(cleanJsonReply('<think>음...</think>\n결과입니다:\n```json\n{"a":[1,2,],}\n```'), '{"a":[1,2]}');
  assert.equal(cleanJsonReply('설명 {"x":{"y":"}"}} 끝'), '{"x":{"y":"}"}}');
  assert.equal(cleanJsonReply('{"a":1}'), '{"a":1}');
  assert.equal(cleanJsonReply('{"a":1, "b":'), '{"a":1, "b":', "잘린 건 고칠 수 없으면 원문 그대로");
});
