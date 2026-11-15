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
