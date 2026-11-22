// 11-22 요청: 장기기억 설정에서 켜면 ‘나’(페르소나) 위키 문서를 모든 채팅에 자동으로 만든다(AI 호출 없음, 페르소나 설명으로)
import test from "node:test";
import assert from "node:assert/strict";
import { ensureMeDoc, meVisible } from "../src/engine/medoc.js";

test("나 문서: 없으면 만들고, 페르소나가 같으면 그대로, 바뀌면 갱신", () => {
  const f = { people: {} };
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "검은 머리의 용병", now: 1 }), true);
  assert.deepEqual([f.people["{{user}}"].name, f.meDoc.name, f.meDoc.desc], ["{{user}}", "Jade", "검은 머리의 용병"]);
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "검은 머리의 용병", now: 2 }), false);
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "은퇴한 용병", now: 3 }), true);
  assert.equal(f.meDoc.desc, "은퇴한 용병");
});

test("기존 나 기록은 건드리지 않음", () => {
  const f = { people: { "{{user}}": { name: "{{user}}", aliases: ["제이드"], pinned: false, records: [{ act: "a" }] } } };
  ensureMeDoc(f, { name: "Jade", desc: "" });
  assert.equal(f.people["{{user}}"].records.length, 1); assert.deepEqual(f.people["{{user}}"].aliases, ["제이드"]);
});

test("목록에 보이기: 기록이 없어도 나 문서가 있으면 보임", () => {
  const f = { people: {} }; ensureMeDoc(f, { name: "Jade", desc: "x" });
  assert.equal(meVisible(f, f.people["{{user}}"]), true);
  assert.equal(meVisible(f, { name: "세라", records: [] }), false);
  assert.equal(meVisible({}, { name: "{{user}}", records: [] }), false);
});
