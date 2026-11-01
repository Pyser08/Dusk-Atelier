import test from "node:test";
import assert from "node:assert/strict";
import { refineTargets, refineMessages, readRefine, refineStep, refineChanges, pickRefine } from "../src/dev/aibuild/lorerefine.js";
import { ruleOf, affOf, bodyOf } from "../src/engine/lorerules.js";

const base = () => {
  const fid = "F1";
  return [
    { key: "선도부", comment: "[소속] 선도부", content: "", mode: "normal", extentions: { da_rid: "R0", da_rule: { on: true, cond: [{ t: "keys" }] }, da_folder: { id: fid, aff: { def: 100, max: "", prob: {} } } } },
    { key: "히나,Hina", comment: "히나", content: "소라사키 히나. 선도부 부장.", mode: "normal", extentions: { da_parent: fid } },
    { key: "이오리", comment: "이오리", content: "시모에 이오리.", mode: "normal", extentions: { da_parent: fid } },
    { key: "야근,서류", comment: "히나의 피로", content: "히나는 서류 때문에 지쳐 있다.", mode: "normal" },
    { key: "", comment: "문체", content: "짧은 문장으로 쓴다.", mode: "normal" }
  ];
};

test("묶음: 폴더·빈 항목은 빼고 나눈다", () => {
  assert.deepEqual(refineTargets(base(), 2), [[1, 2], [3, 4]]);
});
test("메시지: Dusk 안내·이번 일·전체 목록·묶음 항목이 들어간다", () => {
  const [sys, user] = refineMessages(base(), [1, 3], { instruction: "학원물" });
  assert.ok(sys.content.includes("[로어북 방식: Dusk]") && sys.content.includes("이미 있는 로어북에 Dusk 규칙 입히기"));
  assert.ok(user.content.includes("l0 | affiliation | 선도부") && user.content.includes("학원물") && user.content.includes('"ref":"l3"') && !user.content.includes('"ref":"l2"'));
});
test("AI 답 읽기: 묶음 밖 ref·내용·키·새 항목·없는 폴더는 버린다", () => {
  const raw = JSON.stringify({ design: { folders: [{ name: "선도부", parent: "x", affiliation: { chance: 60, max: 1 } }, { name: "없는 소속", affiliation: { chance: 1 } }], entries: [{ ref: "l1", rule: { hold: 3 }, content: "바꿈", keys: "x" }, { ref: "l2", rule: { hold: 2 } }, { ref: null, name: "새", rule: {} }] }, why: { l1: "주인공이라 유지" } });
  const r = readRefine(raw, base(), [1, 3]);
  assert.deepEqual(r.design, { folders: [{ name: "선도부", affiliation: { chance: 60, max: 1 } }], entries: [{ ref: "l1", rule: { hold: 3 } }] });
  assert.equal(r.why.l1, "주인공이라 유지");
});
test("적용: 규칙·소속 확률이 들어가고 내용 본문은 그대로, 잘못된 것만 빠진다", () => {
  const list = base();
  const design = { folders: [{ name: "선도부", affiliation: { chance: 60, max: 1, members: { 이오리: 40 } } }], entries: [
    { ref: "l1", rule: { hold: 3, wholeWord: true } },
    { ref: "l3", rule: { conditions: [{ type: "count", words: "야근,서류", min: 3 }], repeat: "once", chain: [{ target: "히나", chance: 100 }] } },
    { ref: "l4", rule: { conditions: [], position: "depth", depth: 2 } },
    { ref: "l2", rule: { chain: [{ target: "없는 사람", chance: 50 }] } }
  ] };
  const r = refineStep(list, design);
  assert.ok(r.errors.some((m) => m.includes("없는 사람")));
  const w = r.work;
  assert.equal(ruleOf(w[1]).hold, 3); assert.equal(ruleOf(w[1]).whole, true);
  assert.equal(ruleOf(w[3]).once, "chat"); assert.equal(ruleOf(w[3]).chain[0].rid, w[1].extentions.da_rid);
  assert.equal(ruleOf(w[4]).at, "depth");
  assert.equal(bodyOf(w[1].content).trim(), "소라사키 히나. 선도부 부장.");
  assert.equal(affOf(w[0]).def, 60); assert.equal(affOf(w[0]).max, 1); assert.equal(affOf(w[0]).prob[w[2].extentions.da_rid], 40);
  assert.equal(list[1].extentions.da_rule, undefined, "원본은 그대로");
  const ch = refineChanges(list, w, { l1: "유지" });
  assert.deepEqual(ch.map((c) => c.i).sort(), [0, 1, 2, 3, 4]);
  assert.equal(ch.find((c) => c.i === 1).why, "유지"); assert.match(ch.find((c) => c.i === 1).after, /3턴 유지/);
  ch.find((c) => c.i === 4).checked = false;
  const out = pickRefine(list, w, ch);
  assert.equal(out[4], list[4]); assert.equal(out[1], w[1]);
});
