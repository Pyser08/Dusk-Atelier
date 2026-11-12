// 2.1.5 버그 제보: 장면 밖 retrieval 후보·인원 상한으로 잘린 인물 때문에 기록 전체가 거절됨 / 사고 출력이 붙은 응답을 못 읽음
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWriterRun, recordTurn, buildEnvelope, stripThoughts, parseLinesLoose } from "../src/engine/recorder.js";
import { parseLines } from "../src/engine/memorylines.js";
import { executeWriterBatches } from "../src/data/pot/writer-batch.js";
import { SettingsStore } from "../src/engine/pot/settings.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
async function potSettings() {
  const m = new Map(), st = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); return true; }, removeItem: async (k) => { m.delete(k); } };
  const s = new SettingsStore(st, {}); await s.load(); s.forceRelationshipOnlyMode(); return s.snapshot();
}
const RP1 = "민지는 {{user}}의 손을 잡았다. \"오늘 와 줘서 정말 고마워.\" 민지가 웃었다. 옆에 있던 민준은 \"나는 먼저 간다\"며 자리를 떴다.";
const RP2 = "다음 날 민지는 {{user}}와 카페에 앉아 커피를 마셨다. \"어제는 정말 즐거웠어.\" 민지가 조용히 웃었다.";
const THINK = (body) => `<Thoughts>\n장면을 먼저 정리하자. 누가 나왔지?\n</Thoughts>\n\n${body}`;
const fake = (wrap = (x) => x) => async (msgs) => {
  const sys = msgs[0].content, u = JSON.parse(msgs[1].content);
  if (sys.startsWith("You are the memory recorder")) return wrap(JSON.stringify({ lines: u.newest.includes("카페")
    ? ["scene|민지와 {{user}}가 카페에서 이야기했다|카페|낮|yes", "who|민지|{{user}}와 커피를 마셨다|2"]
    : ["scene|민지가 {{user}}에게 고마워했다|거리|오후|yes", "who|민지|{{user}}의 손을 잡았다|2", "who|민준|먼저 자리를 떴다|1", "new|민준|민지의 오빠"] }));
  if (u.focus === "민지") return wrap(JSON.stringify({ lines: ["now|{{user}}를 고마운 사람으로 여긴다"] }));
  return wrap("none");
};
async function turn(settings, scope, rp, ref, extra = {}, call = fake()) {
  const llmCall = async (_a, _k, _p, prompt) => { const run = parseWriterRun(prompt); const rec = await recordTurn(call, run, {}); return JSON.stringify(buildEnvelope(run, rec)); };
  const input = { settings, sourceLibrary: LIB, wikiScope: scope, rpText: rp, userText: "", recentContext: "", userIdentity: { title: "현우", aliases: [], known: true }, requestRef: ref, seedSources: {}, candidateDocumentIds: [], newCharacterCandidates: [], allowCreate: true, ...extra };
  return executeWriterBatches({ input, preset: {}, api: {}, keyStore: {}, llmCall, batchRef: "b" + ref, contributionRef: "c" + ref });
}

test("장면에 안 나온 retrieval 후보가 있어도 기록이 거절되지 않는다(후보마다 '등장하지 않음')", async () => {
  const settings = await potSettings();
  const out1 = await turn(settings, createEmptyWikiScope({ characterId: "c", chatKey: "k" }), RP1, "r1");
  assert.equal(out1.validationSummary.rejected, 0, JSON.stringify(out1.validationSummary.details));
  const scope = out1.scope, minjun = Object.values(scope.documents).find((d) => d.title === "민준");
  assert.ok(minjun);
  const out2 = await turn(settings, scope, RP2, "r2", { candidateDocumentIds: [minjun.id] });
  assert.equal(out2.validationSummary.rejected, 0, JSON.stringify(out2.validationSummary.details));
});

test("parseWriterRun이 retrieval_candidate_review·tracking_review 대상을 읽는다", () => {
  const ref = { source_catalog: { "source:rp": { content: "x" } }, document_catalog: {} };
  const man = { request_ref: "r", document_catalog: { "doc:1": { type: "character", title: "가" }, "doc:2": { type: "character", title: "나" }, "doc:3": { type: "character", title: "다", read_only: true } },
    batch_contract: { writable_document_refs: ["doc:1", "doc:2"] }, retrieval_candidate_review: { refs: ["doc:1"] }, tracking_review: { refs: ["doc:2", "doc:3"] } };
  const run = parseWriterRun(`<<<RISUPOT_REFERENCE_DATA_START>>>${JSON.stringify(ref)}<<<RISUPOT_REFERENCE_DATA_END>>>\n# Text Control Manifest\n${JSON.stringify(man)}`);
  assert.deepEqual(run.reviewRefs, ["doc:1", "doc:2"]);
});

test("인원 상한으로 잘린 인물도 '변화 없음'(인원 상한)으로 채운다", async () => {
  const docs = ["민지", "수아", "하린", "도윤"].map((t, i) => ({ ref: `doc:${i}`, type: "character", title: t, aliases: [], writable: true, entries: [], metrics: [] }));
  const run = { requestRef: "r", rp: "민지, 수아, 하린, 도윤이 모두 함께 광장에서 이야기를 나누었다. 오래도록 이야기가 이어졌다.", recent: "", userNames: [], docs, slots: new Map(), policies: {}, allowCreate: false, batch: { index: 1, total: 1 }, peopleOn: false, npcOn: false, missingProfiles: new Set(), reviewRefs: [] };
  const call = async (msgs) => msgs[0].content.startsWith("You are the memory recorder") ? "scene|광장 대화|광장|낮|yes\nwho|민지|말함|3\nwho|수아|말함|3\nwho|하린|말함|2\nwho|도윤|말함|1" : "none";
  const rec = await recordTurn(call, run, { light: true });
  assert.equal(rec.people.length, 3);
  assert.deepEqual(rec.capped, ["도윤"]);
  const env = buildEnvelope(run, rec);
  const iss = env.issues.find((x) => x.document_ref === "doc:3");
  assert.ok(iss && iss.code === "no_canonical_change" && /인원 상한/.test(iss.detail));
});

test("사고 글(<Thoughts>·<think>)이 앞에 붙은 응답도 읽는다", async () => {
  const raw = THINK('{"lines":["scene|a|b|c|yes","who|민지|웃음|1"]}');
  assert.equal(parseLines(stripThoughts(raw)).length, 2);
  assert.equal(parseLines(stripThoughts('<think>음…</think>\n{"lines":["who|민지|웃음|1"]}')).length, 1);
  assert.equal(parseLines(stripThoughts('설명입니다.\n{"lines":["who|민지|웃음|1"]}')).length, 1, "첫 줄이 아니어도 {\"lines\": 객체를 찾는다");
  assert.ok(parseLinesLoose(raw).some((l) => l.startsWith("who|")));
  const settings = await potSettings();
  const out = await turn(settings, createEmptyWikiScope({ characterId: "c2", chatKey: "k2" }), RP1, "t1", {}, fake(THINK));
  assert.equal(out.validationSummary.rejected, 0, JSON.stringify(out.validationSummary.details));
  assert.ok(Object.values(out.scope.documents).some((d) => d.title === "민지"));
});
