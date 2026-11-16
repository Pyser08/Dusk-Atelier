// 2.2.6: 게이지 배수(gaugemult)·애인 판정(lover)·호감 분리·관계도 이전 턴(folderAt)·Erosync 선호 글자 풀기·출발값 자동 만들기
import test from "node:test";
import assert from "node:assert/strict";
import { scaleDelta, scaleTarget, normalizeGauge, isDefaultGauge } from "../src/engine/gaugemult.js";
import { isLoverKind, loverPairs, isLover, setLover } from "../src/engine/lover.js";
import { applyEmo, EMO_LABEL, tagsFor } from "../src/engine/memoryemo.js";
import { parseTurnReply } from "../src/erosync/turnupdate.js";
import { buildRelMap, folderAt, relmapTurns } from "../src/engine/relmap.js";
import { fromStage2 } from "../src/engine/memorylines.js";
import { prefItem } from "../src/ui/screens/memory/erosyncwiki.js";
import { createErosyncTurn, normalizeTurnSettings } from "../src/data/erosyncturn.js";

test("게이지 배수: 기본은 그대로, 0배는 멈춤, 작은 배수에도 1칸은 남는다", () => {
  assert.deepEqual(normalizeGauge(null), { up: 1, down: 1 });
  assert.equal(isDefaultGauge({}), true);
  assert.equal(scaleDelta(2, null), 2);
  assert.equal(scaleDelta(2, { up: 2 }), 4);
  assert.equal(scaleDelta(-2, { up: 2, down: 0.5 }), -1);
  assert.equal(scaleDelta(1, { up: 0.3 }), 1);
  assert.equal(scaleDelta(3, { up: 0 }), 0);
  assert.equal(scaleDelta(3, { up: 3 }, { max: 3 }), 3);
  assert.deepEqual(normalizeGauge({ up: 9, down: -1 }), { up: 3, down: 0 });
  assert.equal(scaleTarget(50, 60, { up: 0.5 }), 55);
  assert.equal(scaleTarget(50, 40, { down: 2 }), 30);
});

test("애인 판정: 연인·배우자처럼 명확한 말만, 짝사랑·전 애인은 아니다", () => {
  for (const k of ["girlfriend", "여자친구", "연인", "아내", "약혼자", "남친"]) assert.equal(isLoverKind(k), true, k);
  for (const k of ["ex-girlfriend", "전 여자친구", "전남친", "짝사랑 상대", "썸", "친구", "가짜 연인", "wants to be girlfriend", "boss"]) assert.equal(isLoverKind(k), false, k);
  const f = { ties: { "a>b": { a: "민지", b: "{{user}}", kind: "girlfriend", at: 3 }, "c>d": { a: "유나", b: "민지", kind: "rival", at: 2 } } };
  assert.equal(isLover(f, "{{user}}", "민지"), true);
  assert.equal(isLover(f, "유나", "민지"), false);
  setLover(f, "민지", "{{user}}", false);
  assert.equal(isLover(f, "민지", "{{user}}"), false);
  setLover(f, "민지", "{{user}}", null);
  setLover(f, "유나", "민지", true);
  assert.equal(loverPairs(f).length, 2);
});

test("호감 분리 + 소유욕·독점욕은 애인일 때만 움직인다, 배수도 적용", () => {
  assert.equal(EMO_LABEL.affection, "인간적 호감");
  assert.equal(EMO_LABEL.attraction, "이성적 호감");
  assert.equal(tagsFor(false).includes("possess"), false);
  assert.equal(tagsFor(true).includes("exclusive"), true);
  const f = { ties: { x: { a: "민지", b: "{{user}}", kind: "연인", at: 1 } } };
  const lover = (a, b) => isLover(f, a, b);
  applyEmo(f, [{ from: "민지", to: "{{user}}", t: { possess: 2, attraction: 2 }, why: "질투" }, { from: "유나", to: "{{user}}", t: { possess: 2, affection: 1 }, why: "x" }], { at: 1 }, 1, { isLover: lover, gauge: { up: 0.5 } });
  assert.deepEqual(f.emo["민지>{{user}}"].tags, { possess: 1, attraction: 1 });
  assert.deepEqual(f.emo["유나>{{user}}"].tags, { affection: 1 });
});

test("줄 기록: 고백은 이성적 호감, 질투 행동은 소유욕·독점욕", () => {
  const src = "널 좋아해 진짜로 말이야";
  const r = fromStage2([{ tag: "to", f: ["{{user}}", "warm", "confess", "널 좋아해"] }], "민지", { known: [{ name: "{{user}}" }], source: src });
  assert.ok(r.emo[0].t.attraction >= 2);
  const j = fromStage2([{ tag: "to", f: ["{{user}}", "same", "jealous", "널 좋아해"] }], "민지", { known: [{ name: "{{user}}" }], source: src });
  assert.deepEqual(j.emo[0].t, { possess: 1, exclusive: 1 });
});

test("Erosync 매 턴 계산도 배수를 따른다", () => {
  const t = [{ id: "p1", values: { initiative: 50 } }];
  assert.deepEqual(parseTurnReply({ characters: [{ id: "p1", changes: { initiative: 60 } }] }, t, ["initiative"], { up: 0.5 }).p1.changes, { initiative: 55 });
  assert.equal(parseTurnReply({ characters: [{ id: "p1", changes: { initiative: 60 } }] }, t, ["initiative"], { up: 0 }).p1, undefined);
});

test("관계도 이전 턴: 그 시점 뒤의 기록·관계·감정은 빠진다", () => {
  const f = {
    people: { a: { name: "민지", records: [{ act: "만남", at: 0 }, { act: "고백", at: 4 }] }, b: { name: "유나", records: [{ act: "등장", at: 5 }] } },
    rels: { "민지>유나": { from: "민지", to: "유나", items: [{ d: "싸움", dir: "-", at: 5 }] } },
    emo: { "민지>{{user}}": { from: "민지", to: "{{user}}", tags: { affection: 7 }, log: [{ t: { affection: 3 }, at: 0 }, { t: { affection: 7 }, at: 4 }] } },
    scenes: [{ at: 0, who: ["민지"] }, { at: 4, who: ["민지"] }, { at: 5, who: ["유나"] }]
  };
  assert.deepEqual(relmapTurns(f), [0, 4, 5]);
  const past = folderAt(f, 0);
  assert.equal(past.people.a.records.length, 1);
  assert.equal(past.emo["민지>{{user}}"].tags.affection, 3);
  assert.equal(f.emo["민지>{{user}}"].tags.affection, 7);   // 원본 그대로
  const m = buildRelMap(past);
  assert.deepEqual(m.nodes.map((n) => n.name), ["민지"]);
  assert.equal(buildRelMap(f).nodes.length, 2);
});

test("Erosync 선호: 글자로 저장된 JSON도 이름·좋고 싫음·확신도로 푼다", () => {
  const raw = '{"id":"casual","label":"Casual uncommitted encounters","preference":"preferred","basis":"explicit","confidence":90,"evidence":["x"],"reason":"...[truncated]';
  assert.deepEqual(prefItem(raw), { label: "Casual uncommitted encounters", preference: "preferred", confidence: 90, reason: "" });
  assert.equal(prefItem({ label: "Deep bond", preference: "disliked", confidence: 80 }).preference, "disliked");
  assert.equal(prefItem("간단한 글").label, "간단한 글");
});

test("출발값 자동 만들기: 기본 켜짐, 출발값이 없으면 전체 분석을 한 번만 시작", async () => {
  assert.equal(normalizeTurnSettings({}).autoStart, true);
  const calls = [];
  const store = new Map();
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } };
  const erosync = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, ...a) => { calls.push([op, ...a]); return op === "status" ? { running: false } : { ok: true }; } };
  const T = createErosyncTurn(api, { erosync });
  await T.onTurn({ key: "k1", people: [{ name: "민지" }], rp: "본문" });
  await T.onTurn({ key: "k2", people: [{ name: "민지" }], rp: "본문" });
  assert.deepEqual(calls.filter((c) => c[0] === "start"), [["start", "full"]]);
  assert.equal(calls.some((c) => c[0] === "turn"), false);
});
