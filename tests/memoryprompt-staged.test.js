import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/engine/memoryprompt.js";

const input = { bot: "봇", known: [], ignore: [], recent: [], newest: { text: "본문" } };
const sysOf = (m) => m[0].content;
const stageOf = (m) => (/STAGE 1 of 2/.test(sysOf(m)) ? 1 : /STAGE 2 of 2/.test(sysOf(m)) ? 2 : 0);
const focusOf = (m) => /detail for one character only: "([^"]+)"/.exec(sysOf(m))?.[1];

test("단계별: 개요 1번 + 인물마다 1번, 결과는 하나로 합쳐진다", async () => {
  const seen = [];
  const call = async (m) => {
    seen.push(stageOf(m) + (focusOf(m) ? ":" + focusOf(m) : ""));
    if (stageOf(m) === 1) return JSON.stringify({ people: [{ name: "A", act: "문을 열었다", p: 2, s: 1, r: 1 }, { name: "B", act: "웃었다", p: 1, s: 0, r: 0 }], scene: { sum: "방에서 만났다", facts: [], place: "방", when: "", who: ["A", "B"], changed: true }, rel: [{ from: "A", to: "B", d: "가까워짐", dir: "+" }] });
    const n = focusOf(m);
    return JSON.stringify({ people: [{ name: n, act: "덮어쓰기", kd: "f", fc: "H", keys: [n + "열쇠"] }], emo: [{ from: n, to: "{{user}}", t: { trust: 1 }, why: "이유" }] });
  };
  const r = await analyze(call, input, { staged: true, format: "json" });
  assert.deepEqual(seen, ["1", "2:A", "2:B"]);
  assert.equal(r.people.length, 2);
  const a = r.people.find((p) => p.name === "A");
  assert.equal(a.act, "문을 열었다", "행동·점수는 개요 값을 유지");
  assert.equal(a.p, 2);
  assert.ok(r.scene.sum.includes("만났다"));
  assert.ok(r.emo.length >= 1);
});

test("단계별: 한 인물의 세부 호출이 실패해도 개요는 기록되고 나머지는 계속", async () => {
  const warns = [];
  const call = async (m) => {
    if (stageOf(m) === 1) return JSON.stringify({ people: [{ name: "A", act: "a", p: 2, s: 1, r: 1 }, { name: "B", act: "b", p: 2, s: 1, r: 1 }], scene: { sum: "장면", facts: [], place: "", when: "", who: [], changed: false } });
    if (focusOf(m) === "A") throw new Error("429 rate limit");
    return JSON.stringify({ people: [{ name: "B", keys: ["단서"] }] });
  };
  const r = await analyze(call, input, { staged: true, format: "json", onWarn: (n) => warns.push(n) });
  assert.deepEqual(warns, ["A"]);
  assert.deepEqual(r.people.map((p) => p.name).sort(), ["A", "B"]);
});

test("단계별: 개요 단계가 실패하면 그대로 실패(기존 재시도 규칙 포함)", async () => {
  let n = 0;
  await assert.rejects(analyze(async () => { n++; return "JSON 아님"; }, input, { staged: true, format: "json" }), /JSON/);
  assert.equal(n, 3);
});

test("단계별: 인물이 없으면 세부 호출을 하지 않는다 / 점수가 모두 0이면 건너뛴다 / 최대 6명", async () => {
  let calls = 0;
  const none = async () => { calls++; return JSON.stringify({ people: [], scene: null }); };
  await analyze(none, input, { staged: true, format: "json" }); assert.equal(calls, 1);
  calls = 0;
  const many = async (m) => { calls++; return stageOf(m) === 1 ? JSON.stringify({ people: Array.from({ length: 9 }, (_, i) => ({ name: "P" + i, act: "x", p: i === 0 ? 0 : 2, s: 0, r: 0 })), scene: null }) : JSON.stringify({ people: [{ name: focusOf(m) }] }); };
  await analyze(many, input, { staged: true, format: "json" });
  assert.equal(calls, 1 + 6);
});

test("기존 방식(staged 꺼짐)은 한 번만 호출", async () => {
  let calls = 0;
  await analyze(async () => { calls++; return JSON.stringify({ people: [{ name: "A", act: "a", p: 1, s: 1, r: 1 }], scene: null }); }, input);
  assert.equal(calls, 1);
});
