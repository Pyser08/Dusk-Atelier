import test from "node:test";
import assert from "node:assert/strict";
import { memoryAffinity, withMemoryAffinity, nameIndex } from "../src/engine/identity.js";
import { eroRelmapData } from "../src/engine/erosyncview.js";

const folder = () => ({
  people: { "린": { name: "린", aliases: ["시라유키 린"], records: [{ id: "r1", act: "웃었다", at: 3 }] } },
  emo: { "린>{{user}}": { from: "린", to: "{{user}}", tags: { affection: 9 }, log: [] } },
  scenes: [{ id: "s1", at: 3, sum: "x" }],
});

test("호감은 장기 기억 감정 수치를 기준으로(별칭으로도 찾는다)", () => {
  assert.equal(memoryAffinity(folder(), ["시라유키 린"]), memoryAffinity(folder(), ["린"]));
  assert.ok(memoryAffinity(folder(), ["린"]) > 90);
  assert.equal(memoryAffinity(folder(), ["없는 사람"]), null);
});

test("위키 '지금 상태'의 호감 칸을 장기 기억 값으로 바꾸고(문서 저울로 환산) 원래 값은 남긴다", () => {
  const st = { meters: [{ id: "affinity", slotId: "affinity.score", label: "호감", value: 20, min: 0, max: 200 }], texts: [] };
  const out = withMemoryAffinity(st, folder(), { title: "시라유키 린", aliases: [] });
  const m = out.meters[0];
  assert.equal(m.src, "memory"); assert.equal(m.wikiValue, 20); assert.ok(m.value > 180);
  // 장기 기억에 값이 없으면 위키 값을 그대로 쓴다
  assert.equal(withMemoryAffinity(st, { people: {}, emo: {} }, { title: "누구" }).meters[0].value, 20);
});

test("Erosync 인물을 장기 기억 별칭으로 관계도 노드에 짝짓는다", () => {
  const data = { nodes: [{ id: "린", name: "린" }, { id: "하루", name: "하루" }] };
  const snap = { ok: true, people: [{ id: "e1", name: "시라유키 린" }, { id: "e2", name: "하루" }], relations: [] };
  const idx = nameIndex(folder(), (n) => String(n).toLowerCase().replace(/\s+/g, ""));
  assert.equal(idx.get("시라유키린"), "린");
  assert.equal(typeof eroRelmapData(data, snap, idx), "object");
});
