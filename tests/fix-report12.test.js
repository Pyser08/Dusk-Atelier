// 신고 #12: 영문 페르소나 이름과 한글 표기가 따로 놂
import test from "node:test";
import assert from "node:assert/strict";
import { hangulReadings, foldUserNames, sameUserName, setUserAliases } from "../src/engine/useralias.js";
import { notePersona } from "../src/engine/personas.js";
import { recordTurn } from "../src/engine/recorder.js";
test("흔한 영문 이름·로마자 한국 이름의 한글 읽기", () => {
  for (const [a, b] of [["Ryan", "라이언"], ["James", "제임스"], ["Michael", "마이클"], ["Kim Minjun", "김민준"], ["Seojun", "서준"], ["Ryan Carter", "라이언"], ["Yuki", "유키"]]) assert.ok(hangulReadings(a).includes(b), `${a}: ${hangulReadings(a)}`);
  for (const n of ["Zxqwrt", "Bartholomew", "aeiouaeiouaeiouaeiou"]) assert.ok(hangulReadings(n).length <= 6);
});
test("이름 칸만 바꾸고 호칭·글·다른 인물은 그대로", () => {
  const f = (x, o) => foldUserNames(x, ["Ryan", "라이언"], o);
  assert.equal(f("act|하나|라이언|sex|정상위"), "act|하나|{{user}}|sex|정상위");
  assert.equal(f("women|하나, Ryan"), "women|하나, {{user}}");
  assert.match(f("call|하나|Ryan|라이언"), /\|라이언$/);
  assert.equal(f("bond|하나|라이언|라이언과 본 바다"), "bond|하나|{{user}}|라이언과 본 바다");
  assert.equal(f("act|하나|라이언|sex", { taken: ["라이언"] }), "act|하나|라이언|sex", "같은 이름의 다른 인물");
  assert.equal(f("act|하나|라이언|sex", { taken: ["라이언"], explicit: ["라이언"] }), "act|하나|{{user}}|sex", "직접 적은 이름 우선");
});
test("기록기: 영문·한글·JSON 답 모두 나로 모인다", async () => {
  for (const nm of ["Ryan", "라이언"]) for (const json of [false, true]) {
    const L = ["scene|방|밤|둘이 함께|3", "who|하나|안음|3", `act|하나|${nm}|sex|정상위|1`, `tie|하나|${nm}|연인|1`];
    const r = await recordTurn(async () => (json ? JSON.stringify({ lines: L }) : L.join("\n")), { rp: "하나와 라이언은 섹스를 했다.", recent: "", user: "", userNames: ["Ryan", "라이언"], docs: [], slots: new Map(), policies: {}, allowCreate: false }, { nsfw: true, light: true });
    assert.equal(r.stage1.nsfw[0].partner, "{{user}}"); assert.equal(r.stage1.extra.find((x) => x.kind === "tie").b, "{{user}}");
  }
});
test("페르소나 이름 표기만 바뀌면 옛 페르소나로 떼지 않는다 · 직접 적은 이름", () => {
  const f = { persona: { name: "Ryan" }, people: {} }; assert.equal(notePersona(f, "라이언").changed, false); assert.equal(f.persona.name, "라이언"); assert.ok(!f.personas?.length);
  assert.equal(notePersona(f, "세라").changed, true); assert.equal(sameUserName("Ryan", "세라"), false);
  assert.deepEqual(setUserAliases({}, "라이언, {{user}}, 라이언,레이"), ["라이언", "레이"]);
});
