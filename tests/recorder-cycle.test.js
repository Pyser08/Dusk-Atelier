// 2.1.4 월경·임신 기록도 Dusk 기록기로: 리수폿 Writer 지침 없이 1단계 줄로 받아 cycle_report → 리수폿 표식(CYCLE:/SEX:)으로 저장
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseWriterRun, recordTurn, buildEnvelope, cycleFrom, CYCLE_STAGE1 } from "../src/engine/recorder.js";
import { CYCLE_BLOCK_MARK, applyCycleReportObject } from "../src/engine/cyclereport.js";
import { assembleWriterPrompt } from "../src/engine/pot/writer-prompt.js";
import { executeWriterBatches } from "../src/data/pot/writer-batch.js";
import { SettingsStore } from "../src/engine/pot/settings.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
async function cycleSettings() {
  const m = new Map(), st = { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); return true; }, removeItem: async (k) => { m.delete(k); } };
  const s = new SettingsStore(st, {}); await s.load(); s.forceRelationshipOnlyMode();
  s.update((v) => { v.sexualDesireEnabled = true; v.relationshipPerceptionMode = "on"; v.features.openness = { ...(v.features.openness ?? {}), enabled: true, cycle: true }; });
  return s.snapshot();
}
const RP = "2026년 3월 2일 밤. 성인인 민지는 {{user}}와 밤을 함께 보냈다. 둘은 피임 없이 관계를 가졌다. \"오늘은 같이 있고 싶어.\" 민지가 속삭였다.";

test("줄 읽기: woman·sex·pregnant·birth → cycle_report, {{user}}와 이상한 줄은 무시", () => {
  const r = cycleFrom("scene|x|y|z|yes\nwoman|민지\nsex|민지|{{user}}|none\nsex|민지|도윤|used\npregnant|민지\nwoman|{{user}}\nbirth|수아\nwho|민지|웃음|1", [{ name: "민지" }]);
  assert.deepEqual(r, [
    { name: "민지", adult: true, sex: [{ partner: "{{user}}", contraception: "none" }, { partner: "도윤", contraception: "used" }], known: true, birth: false },
    { name: "수아", adult: true, sex: [], known: false, birth: true },
  ]);
});

test("월경 추적이 켜진 채팅: 1단계에 월경 줄 지침이 붙고, 리수폿 Writer 없이 검증을 통과해 CYCLE·SEX 표식이 저장된다", async () => {
  const settings = await cycleSettings();
  const scope0 = createEmptyWikiScope({ characterId: "c1", chatKey: "k1" });
  const probe = assembleWriterPrompt({ sourceLibrary: LIB, settings, wikiScope: scope0, rpText: RP, requestRef: "r0" });
  assert.ok(probe.prompt.includes(CYCLE_BLOCK_MARK), "리수폿 Writer 프롬프트에 월경 블록이 있다(=예전엔 늘 리수폿 기록)");
  assert.ok(parseWriterRun(probe.prompt), "그래도 기록기가 읽을 수 있다");
  const sys = [];
  const fake = async (msgs) => {
    sys.push(msgs[0].content);
    if (/memory recorder/.test(msgs[0].content)) return "scene|민지와 {{user}}가 밤을 보냈다|민지의 방|밤|yes\nwho|민지|{{user}}와 밤을 보냈다|2\nnew|민지|대학원생\nwoman|민지\nsex|민지|{{user}}|none";
    return "id|대학원생, 20대 후반";
  };
  const llmCall = async (_a, _k, _p, prompt) => {
    const run = parseWriterRun(prompt); const rec = await recordTurn(fake, run, { cycle: prompt.includes(CYCLE_BLOCK_MARK) });
    return JSON.stringify(applyCycleReportObject({ ...buildEnvelope(run, rec), cycle_report: rec.stage1.cycle ?? [] }, scope0).obj);
  };
  const input = { settings, sourceLibrary: LIB, wikiScope: scope0, rpText: RP, userText: "", recentContext: "", userIdentity: { title: "현우", aliases: [], known: true }, requestRef: "r1", seedSources: {}, candidateDocumentIds: [], newCharacterCandidates: [] };
  const out = await executeWriterBatches({ input, preset: {}, api: {}, keyStore: {}, llmCall, batchRef: "b1", contributionRef: "c1" });
  assert.equal(out.validationSummary.rejected, 0, JSON.stringify(out.validationSummary.details));
  assert.ok(sys[0].includes(CYCLE_STAGE1.trim().split("\n")[0]), "1단계 지침에 월경 줄 안내");
  assert.ok(sys.every((t) => t.length < 6000), "모든 호출이 짧다(리수폿 Writer 지침 없음)");
  const minji = Object.values(out.scope.documents).find((d) => d.title === "민지");
  assert.ok(minji, "인물 문서");
  const dump = JSON.stringify(minji);
  assert.ok(/생리|월경|주기|cycle|임신/i.test(dump), "월경 추적 칸이 생김: " + dump.slice(0, 400));
});
