// v1.8.3 사람다운 기억: 분석 결과 반영 → 주입 블록까지 한 흐름으로.
import test from "node:test";
import assert from "node:assert/strict";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { validate } from "../src/engine/memoryprompt.js";

const blank = () => ({ people: {}, scenes: [], emo: {}, runs: 0 });
const anchor = (at) => ({ at, mid: "m" + at, h: "h" + at });

function seeded() {
  const f = blank();
  // 1) 처음 만남 + 말투 + 감정
  applyAnalysis(f, validate({
    people: [{ name: "Mina", act: "Yuna에게 처음 인사함", p: 2, s: 2, r: 1 }],
    scene: { sum: "도서관에서 처음 만남", who: ["Mina", "Yuna"], changed: true },
    emo: [{ from: "Mina", to: "Yuna", t: { hostility: 3, affection: 1 }, why: "자리 다툼" }],
    talk: [{ from: "Mina", to: "Yuna", call: "선배", tone: "formal" }],
    bond: [{ a: "Mina", b: "Yuna", moment: "책 한 권을 동시에 집음", hook: "같은 책" }],
  }), anchor(10));
  // 2) 성격 변화(attr) — 한참 뒤
  applyAnalysis(f, validate({
    people: [{ name: "Mina", act: "냉정해짐", p: 3, s: 3, r: 2, attr: { c: "trait", k: "성격", v: "냉정함" } }],
    scene: { sum: "시간이 흐름", who: ["Mina"], changed: true },
  }), anchor(30));
  return f;
}

test("analysis output for talk/bond/attr(trait) is validated and stored", () => {
  const f = seeded();
  assert.equal(f.talk["mina>yuna"].call, "선배");
  assert.equal(f.bonds.length, 1);
  assert.ok(f.people.mina.records.some((r) => r.attr?.c === "trait"));
});

test("injection shows relationship stage, address form, shared memory, cooled feeling and the return gap", () => {
  const f = seeded();
  f.scenes.push({ id: "s3", at: 200, sum: "다시 만남", who: ["Mina", "Yuna"], orphan: false });
  const { text } = buildBlock(f, { messageCount: 210, recentText: "Mina와 Yuna", settings: {} });
  assert.match(text, /Relationship stage/);
  assert.match(text, /Mina ↔ Yuna: (just met|acquaintances)/);
  assert.match(text, /Mina → Yuna: calls them "선배", formal speech/);
  assert.match(text, /책 한 권을 동시에 집음/);
  assert.match(text, /Mina → Yuna: .*hostility|Mina → Yuna: mild/);
  assert.doesNotMatch(text, /hostility 3/, "hostility cooled after ~200 messages");
});

test("turning the human features off restores the old block (no new sections)", () => {
  const f = seeded();
  const { text } = buildBlock(f, { messageCount: 210, recentText: "Mina와 Yuna", settings: { human: false, cool: false } });
  assert.doesNotMatch(text, /Relationship stage|How they address|Shared memories|back after/);
  assert.match(text, /hostility 3/);
});

test("beliefs are stored and injected only when the setting is on", () => {
  const f = blank();
  const raw = { people: [{ name: "Yuna", act: "Mina가 이사 간다고 믿음", p: 2, s: 2, r: 1 }], scene: { sum: "오해", who: ["Mina", "Yuna"], changed: true },
    belief: [{ who: "Yuna", thinks: "Mina가 이사 간다", truth: "Mina는 남는다", by: "Rei" }] };
  applyAnalysis(f, validate(raw), anchor(5));
  assert.equal((f.beliefs ?? []).length, 0, "off by default");
  applyAnalysis(f, validate(raw, { beliefs: true }), anchor(6));
  assert.equal(f.beliefs.length, 1);
  assert.doesNotMatch(buildBlock(f, { messageCount: 20, recentText: "Yuna", settings: {} }).text, /False beliefs/);
  assert.match(buildBlock(f, { messageCount: 20, recentText: "Yuna", settings: { beliefs: true } }).text, /Yuna believes: Mina가 이사 간다 \(truth: Mina는 남는다; misled by Rei\)/);
});
