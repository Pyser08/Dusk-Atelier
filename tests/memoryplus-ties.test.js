import test from "node:test";
import assert from "node:assert/strict";
import { applyTies, tieLines, validatePlus } from "../src/engine/memoryplus.js";
import { parseLines, fromStage1 } from "../src/engine/memorylines.js";
import { buildRelMap } from "../src/engine/relmap.js";

test("2.2.4 tie 줄: 오래가는 관계를 기록하고 블록·관계도에 보인다", () => {
  const src = "미나와 하루는 남매다. 미나: 오빠!";
  const raw = fromStage1(parseLines("scene|미나가 하루를 불렀다|집|저녁|yes\ntie|미나|하루|오빠"), { known: [{ name: "미나" }, { name: "하루" }], source: src, openIds: new Set() });
  const v = validatePlus(raw);
  assert.deepEqual(v.ties, [{ a: "미나", b: "하루", kind: "오빠" }]);
  const f = { people: { "미나": { name: "미나", records: [{ id: "r", act: "x", at: 1 }] }, "하루": { name: "하루", records: [{ id: "s", act: "y", at: 1 }] } }, emo: {}, scenes: [] };
  assert.equal(applyTies(f, v.ties, { at: 1 }), 1);
  assert.equal(applyTies(f, v.ties, { at: 2 }), 0, "같은 관계는 다시 세지 않는다");
  assert.deepEqual(tieLines(f, ["미나"]), ["- 하루 is 미나's 오빠"]);
  const m = buildRelMap(f);
  assert.ok(m.edges.some((e) => e.label === "오빠"));
});

test("2.2.4 tie: 리롤·삭제로 출처 응답이 사라지면 그 전 관계로 돌아간다", async () => {
  const { reconcile } = await import("../src/engine/memoryreconcile.js");
  const { messageIdentity } = await import("../src/engine/chattext.js");
  const msg = (data, chatId) => ({ role: "char", data, chatId });
  const f = { people: {}, emo: {}, scenes: [] };
  applyTies(f, [{ a: "미나", b: "하루", kind: "친구" }], { at: 0, h: messageIdentity(msg("첫 응답", "m1")), mid: "m1" });
  applyTies(f, [{ a: "미나", b: "하루", kind: "연인" }], { at: 1, h: messageIdentity(msg("둘째 응답", "m2")), mid: "m2" });
  assert.deepEqual(tieLines(f, ["미나"]), ["- 하루 is 미나's 연인"]);
  reconcile(f, [msg("첫 응답", "m1"), msg("둘째 응답", "m2")]);
  assert.deepEqual(tieLines(f, ["미나"]), ["- 하루 is 미나's 연인"], "살아 있으면 그대로");
  // 둘째 응답이 리롤로 바뀜 → 친구로
  reconcile(f, [msg("첫 응답", "m1"), msg("다른 응답", "m3")]);
  assert.deepEqual(tieLines(f, ["미나"]), ["- 하루 is 미나's 친구"]);
});

test("2.2.4 tie: 인물을 합치면 관계도 새 이름으로 옮긴다", async () => {
  const { relinkNames } = await import("../src/engine/memoryuser.js");
  const f = { people: {}, emo: {}, scenes: [] };
  applyTies(f, [{ a: "레이", b: "하루", kind: "여동생" }], { at: 1 });
  relinkNames(f, ["레이"], "레이첼");
  assert.deepEqual(tieLines(f, ["레이첼"]), ["- 하루 is 레이첼's 여동생"]);
});
