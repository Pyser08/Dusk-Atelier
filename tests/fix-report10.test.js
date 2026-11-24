// 신고 #10: 기록 모델이 지시대로 JSON {"lines":[…]}로 답하면 성인 기록이 하나도 안 됐다
import test from "node:test";
import assert from "node:assert/strict";
import { recordTurn } from "../src/engine/recorder.js";
import { applyLifeTurn } from "../src/data/nsfwturn.js";

const L = ["scene|방|밤|둘이 함께|3", "who|하나|사랑을 나눔|3", "women|none", "act|하나|{{user}}|sex|정상위|2", 'gauge|하나|lust|+10|"아"', "trait|하나|habit|손톱을 깨문다", "cum|{{user}}|하나|inside|1"];
const run = () => ({ rp: "하나는 {{user}}와 섹스를 했다. 두 번이었다.", recent: "", user: "", userNames: [], docs: [], slots: new Map(), policies: {}, allowCreate: false });
const rec = async (raw) => (await recordTurn(async () => raw, run(), { nsfw: true, cycle: true, light: true })).stage1;

test("JSON 답도 줄 답과 똑같이 성인·사람다움·세계·장면 판단·월경 선언을 읽는다", async () => {
  const want = await rec(L.join("\n"));
  assert.equal(want.nsfw.length, 2); assert.equal(want.cycleDeclared, true);
  for (const raw of [JSON.stringify({ lines: L }), JSON.stringify({ lines: L }, null, 2), "```json\n" + JSON.stringify(L) + "\n```"]) {
    const got = await rec(raw);
    for (const k of ["nsfw", "human", "extra", "drive", "cycleDeclared"]) assert.deepEqual(got[k], want[k], k);
  }
});

test("기억 분석 전이라 cursor가 없어도 관계 횟수를 버리지 않고, 같은 응답은 두 번 세지 않는다", () => {
  const f = { wiki: { documents: { a: { id: "a", type: "Character", title: "하나", aliases: [], sections: [] } } } };
  const o = { events: [{ kind: "act", name: "하나", partner: "{{user}}", act: "sex", labels: [], times: 2 }], present: ["하나"], evKey: "k1" };
  applyLifeTurn(f, o); assert.equal(f.life.p.a.sex.n, 2);
  applyLifeTurn(f, o); assert.equal(f.life.p.a.sex.n, 2);
});
