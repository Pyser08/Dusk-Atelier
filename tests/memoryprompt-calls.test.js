// 2.2.4 보조 모델 요청 줄이기: ① 사고 블록(<Thoughts>) 뒤 none을 형식 오류로 보고 다시 묻던 것 ② 미처리 항목 일괄 처리는 인물 묶어 묻기
import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/engine/memoryprompt.js";

const names = ["민지", "철수", "영희", "하루", "유나"];
const text = names.map((n) => `${n}가 방에 들어와 {{user}}에게 말을 걸었다. `).join("").repeat(3);
const input = { bot: "봇", known: [], ignore: [], recent: [], newest: { index: 3, text } };
const overview = "scene|모두 모였다|방|저녁|yes\n" + names.map((n) => `who|${n}|말을 걸었다|2`).join("\n");
const THINK = "<Thoughts>사람들의 변화를 살펴보면… 새로 확인된 건 없는 것 같다.</Thoughts>\n";

test("사고 블록 뒤 none: 인물마다 한 번만 묻는다(예전엔 형식 오류로 두 번 더)", async () => {
  let n = 0;
  const call = async (m) => { n++; return /ONE character/.test(m[0].content) ? THINK + "none" : THINK + overview; };
  const r = await analyze(call, input, { staged: true });
  assert.equal(r.people.length, 5);
  assert.equal(n, 1 + 5, `요청 ${n}건`);
});
test("일괄 처리(group): 인물 3명씩 묶어 묻고, 블록별로 나눠 반영한다", async () => {
  const seen = [];
  const call = async (m) => {
    const sys = m[0].content;
    if (/SEVERAL characters/.test(sys)) { const people = JSON.parse(m[1].content).people.map((p) => p.name); seen.push(people); return THINK + people.map((p) => p === "민지" ? "@|민지\ncall|{{user}}|선배|casual\nkeys|비밀" : `@|${p}\nnone`).join("\n"); }
    if (/ONE character/.test(sys)) { seen.push("one"); return "none"; }
    return overview;
  };
  const r = await analyze(call, input, { staged: true, group: true });
  assert.deepEqual(seen, [["민지", "철수", "영희"], ["하루", "유나"]], "개요 1 + 묶음 2 = 요청 3건(예전 6건)");
  assert.equal(r.people.find((p) => p.name === "민지").keys?.[0], "비밀");
});
test("일괄 처리: 묶음 요청이 끝내 실패하면 그 묶음만 한 명씩 묻는다", async () => {
  const seen = [];
  const call = async (m) => {
    const sys = m[0].content;
    if (/SEVERAL characters/.test(sys)) { seen.push("group"); return "알 수 없는 답"; }
    if (/ONE character/.test(sys)) { seen.push(JSON.parse(m[1].content).focus); return "none"; }
    return "scene|둘|방|저녁|yes\nwho|민지|말을 걸었다|2\nwho|철수|웃었다|2";
  };
  await analyze(call, input, { staged: true, group: true });
  assert.deepEqual(seen, ["group", "group", "group", "민지", "철수"]);
});
