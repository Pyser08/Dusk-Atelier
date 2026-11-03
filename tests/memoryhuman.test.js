import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveTags, coolEmo, returnGap, earlierIds, fading, stageOf, stageLines,
  validateHuman, applyHuman, revertHuman, talkForPrompt, beliefsForPrompt, talkLines, bondLines, beliefLines, humanRules,
} from "../src/engine/memoryhuman.js";

const pair = (tags, log) => ({ from: "A", to: "B", tags, log });

// ④ 감정 식기
test("hot feelings cool with distance from the last real change; trust and respect do not", () => {
  const p = pair({ hostility: 8, trust: 2, respect: 6 }, [{ t: { hostility: 8, trust: 2, respect: 6 }, from: {}, why: "fight", at: 10 }]);
  assert.deepEqual(effectiveTags(p, 10), { hostility: 8, trust: 2, respect: 6 });
  const later = effectiveTags(p, 10 + 80);   // 적대감 반감기 80
  assert.ok(later.hostility < 8 && later.hostility >= 3, `hostility ${later.hostility}`);
  assert.equal(later.trust, 2); assert.equal(later.respect, 6);
  assert.ok(effectiveTags(p, 10 + 2000).hostility >= 2, "a grudge never fully disappears (floor)");
});
test("locked tags and pairs without a dated change never cool; materializing logs 'cooled' once per drop", () => {
  const locked = pair({ hostility: 8 }, [{ t: { hostility: 8 }, at: 0 }]); locked.lock = { hostility: true };
  assert.equal(effectiveTags(locked, 500).hostility, 8);
  assert.equal(effectiveTags(pair({ fear: 7 }, [{ t: { fear: 7 }, at: null }]), 500).fear, 7);
  const folder = { emo: { "a>b": pair({ hostility: 8 }, [{ t: { hostility: 8 }, from: {}, why: "x", at: 0 }]) } };
  assert.equal(coolEmo(folder, 160), 1);
  const v = folder.emo["a>b"].tags.hostility;
  assert.ok(v < 8);
  assert.equal(folder.emo["a>b"].log.at(-1).why, "cooled");
  assert.equal(coolEmo(folder, 160), 0);   // 같은 시점에 다시 해도 변화 없음(기준은 실제 변화)
  assert.ok(effectiveTags(folder.emo["a>b"], 160).hostility === v);
});

// ② 재등장 공백 · ③ 이전 기록 · ⑪ 흐려짐
const person = (records) => ({ name: "Mina", records });
test("return gap uses the last record or scene the person appeared in", () => {
  const p = person([{ id: "r1", at: 20, act: "x" }]);
  assert.equal(returnGap(p, [], 50), 0);
  assert.equal(returnGap(p, [], 200), 180);
  assert.equal(returnGap(p, [{ at: 150, who: ["Mina"] }], 200), 0);   // 장면에 있었으면 공백 아님(60 미만)
});
test("records before the latest change are 'earlier'", () => {
  const p = person([{ id: "a", at: 5 }, { id: "b", at: 9 }, { id: "c", at: 30, prev: { act: "old" }, valid: true }, { id: "d", at: 40 }]);
  assert.deepEqual([...earlierIds(p)], ["a", "b"]);
  assert.equal(earlierIds(person([{ id: "a", at: 1 }])).size, 0);
});
test("minor records fade before they are forgotten; important ones never fade", () => {
  assert.equal(fading({ g: "D", at: 0 }, 50, 150), false);
  assert.equal(fading({ g: "D", at: 0 }, 100, 150), true);
  assert.equal(fading({ g: "C", at: 0 }, 100, 150), false);   // C는 두 배 오래
  assert.equal(fading({ g: "A", at: 0 }, 1000, 150), false);
  assert.equal(fading({ g: "D", at: 0, pin: true }, 100, 150), false);
});

// ⑨ 관계 진도
test("relationship stage grows with shared scenes and warmth", () => {
  const f = (scenes, emo = {}) => ({ scenes, emo });
  const sc = (n) => Array.from({ length: n }, (_, i) => ({ at: i, who: ["Mina", "Yuna"] }));
  assert.equal(stageOf(f(sc(1)), "Mina", "Yuna", 10).stage, "just met");
  assert.equal(stageOf(f(sc(3)), "Mina", "Yuna", 10).stage, "acquaintances");
  const warm = { "mina>yuna": { from: "Mina", to: "Yuna", tags: { affection: 5 }, log: [] } };
  assert.equal(stageOf(f(sc(6), warm), "Mina", "Yuna", 10).stage, "close");
  warm["mina>yuna"].tags.affection = 8;
  assert.equal(stageOf(f(sc(9), warm), "Mina", "Yuna", 10).stage, "very close");
  const lines = stageLines(f(sc(2)), ["Mina", "Yuna"], 10);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Mina ↔ Yuna: acquaintances \(2 scenes together\) — let closeness grow gradually/);
});

// ⑥ 호칭·말투 · ⑩ 둘만의 추억 · ⑤ 잘못된 믿음
test("validation keeps only well-formed talk/bond/belief and skips beliefs when off", () => {
  const raw = {
    talk: [{ from: "Mina", to: "Yuna", call: "선배", tone: "formal" }, { from: "Mina", to: "Mina", call: "x", tone: "casual" }, { from: "A", to: "B", call: "", tone: "weird" }],
    bond: [{ a: "Mina", b: "Yuna", moment: "비 오는 날 우산 하나를 같이 씀", hook: "우산" }, { a: "x", b: "y", moment: "" }],
    belief: [{ who: "Yuna", thinks: "Mina가 이사 간다", truth: "Mina는 남는다", by: "Rei" }], cleared: ["b1"],
  };
  const on = validateHuman(raw, { beliefs: true });
  assert.deepEqual(on.talk, [{ from: "Mina", to: "Yuna", call: "선배", tone: "formal" }]);
  assert.equal(on.bond.length, 1);
  assert.equal(on.belief.length, 1);
  assert.deepEqual(on.cleared, ["b1"]);
  const off = validateHuman(raw, { beliefs: false });
  assert.deepEqual(off.belief, []); assert.deepEqual(off.cleared, []);
});
test("apply keeps the previous address form, bonds once, beliefs open/close; reroll reverts", () => {
  const folder = {};
  const a1 = { at: 10, mid: "m1", h: "h1" }, a2 = { at: 20, mid: "m2", h: "h2" };
  applyHuman(folder, { talk: [{ from: "Mina", to: "Yuna", call: "선배", tone: "formal" }], bond: [], belief: [], cleared: [] }, a1, { important: true });
  applyHuman(folder, { talk: [{ from: "Mina", to: "Yuna", call: "유나", tone: "casual" }], bond: [{ a: "Mina", b: "Yuna", moment: "우산을 같이 씀", hook: "우산" }], belief: [{ who: "Yuna", thinks: "이사 간다", truth: "남는다", by: "Rei" }], cleared: [] }, a2, { important: true });
  const t = folder.talk["mina>yuna"];
  assert.equal(t.call, "유나"); assert.equal(t.prev.call, "선배");
  assert.equal(folder.bonds.length, 1);
  applyHuman(folder, { talk: [], bond: [{ a: "Yuna", b: "Mina", moment: "우산을 같이 씀", hook: "우산" }], belief: [], cleared: [] }, a2, { important: true });
  assert.equal(folder.bonds.length, 1, "same moment is not duplicated");
  const id = folder.beliefs[0].id;
  assert.deepEqual(beliefsForPrompt(folder), [{ id, who: "Yuna", thinks: "이사 간다" }]);
  // 두 번째 응답이 리롤로 사라지면 되돌린다
  const n = revertHuman(folder, (src) => src.chatId === "m1");
  assert.ok(n >= 3);
  assert.equal(folder.talk["mina>yuna"].call, "선배");
  assert.equal(folder.bonds.length, 0); assert.equal(folder.beliefs.length, 0);
  // 진실을 알게 되면 닫힘
  applyHuman(folder, { talk: [], bond: [], belief: [{ who: "Yuna", thinks: "이사 간다", truth: "남는다", by: "" }], cleared: [] }, a2, { important: true });
  const bid = folder.beliefs[0].id;
  applyHuman(folder, { talk: [], bond: [], belief: [], cleared: [bid] }, { at: 30, mid: "m3", h: "h3" }, { important: true });
  assert.equal(folder.beliefs[0].open, false);
  assert.deepEqual(beliefsForPrompt(folder), []);
});
test("bond needs an important response; talk does not", () => {
  const folder = {};
  applyHuman(folder, { talk: [{ from: "A", to: "B", call: "너", tone: "casual" }], bond: [{ a: "A", b: "B", moment: "m", hook: "h" }], belief: [], cleared: [] }, { at: 1 }, { important: false });
  assert.ok(folder.talk["a>b"]); assert.equal((folder.bonds ?? []).length, 0);
});

test("prompt state and injection lines only cover the relevant people", () => {
  const folder = {
    talk: { "mina>yuna": { from: "Mina", to: "Yuna", call: "유나", tone: "casual", prev: { call: "선배", tone: "formal" } }, "rei>yuna": { from: "Rei", to: "Yuna", call: "너", tone: "casual" } },
    bonds: [{ id: "b1", a: "Mina", b: "Yuna", moment: "우산을 같이 씀", hook: "우산", at: 3 }],
    beliefs: [{ id: "x1", who: "Yuna", thinks: "이사 간다", truth: "남는다", by: "Rei", open: true }],
  };
  const rel = new Set(["mina", "yuna"]);
  assert.deepEqual(talkForPrompt(folder, rel), [{ from: "Mina", to: "Yuna", call: "유나", tone: "casual" }]);
  assert.deepEqual(talkLines(folder, rel), ["- Mina → Yuna: calls them \"유나\", casual speech (was \"선배\", formal)"]);
  assert.deepEqual(bondLines(folder, rel, 50), ["- Mina & Yuna: 우산을 같이 씀 (cue: 우산)"]);
  assert.deepEqual(bondLines(folder, new Set(["mina"]), 50), []);
  assert.deepEqual(beliefLines(folder, rel), ["- Yuna believes: 이사 간다 (truth: 남는다; misled by Rei) — Yuna acts on this until learning otherwise"]);
});

test("analysis rules are short and include belief rules only when on", () => {
  const off = humanRules({ beliefs: false }), on = humanRules({ beliefs: true });
  assert.ok(off.length < 700, `rules ${off.length} chars`);
  assert.doesNotMatch(off, /belief/);
  assert.match(on, /`belief`/);
  assert.ok(on.length - off.length < 450);
});
