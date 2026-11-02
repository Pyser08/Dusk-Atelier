// v1.8.3 ⑦ 갈등·사과·앙금 · ⑧ 누구 앞에서 달라지는 태도
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateHuman, applyHuman, revertHuman, humanRules, riftsForPrompt, riftLines, faceLines, pairView,
  resolveRift, deleteRift, setFace, deleteFace,
} from "../src/engine/memoryhuman.js";
import { buildMessages } from "../src/engine/memoryprompt.js";

const anchor = (at, id = "m" + at) => ({ at, mid: id, h: "h" + id });

test("rift and face are validated: bad entries dropped, max 1 each", () => {
  const h = validateHuman({
    rift: [{ a: "A", b: "B", about: "약속을 어김", state: "open", grudge: "some", who: "B" }, { a: "A", b: "C", about: "x", state: "open" }],
    face: [{ who: "A", to: "B", alone: "다정하게 웃는다", public: "모른 척 차갑게 군다" }],
  });
  assert.equal(h.rift.length, 1);
  assert.deepEqual(h.rift[0], { a: "A", b: "B", about: "약속을 어김", state: "open", grudge: "some", who: "B" });
  assert.equal(h.face.length, 1);
  assert.equal(validateHuman({ rift: [{ a: "A", b: "A", about: "x", state: "open" }] }).rift.length, 0);
  assert.equal(validateHuman({ rift: [{ a: "A", b: "B", about: "x", state: "angry" }] }).rift.length, 0);
  assert.equal(validateHuman({ rift: [{ a: "A", b: "B", about: "x", state: "open", who: "Z" }] }).rift[0].who, undefined);
  assert.equal(validateHuman({ face: [{ who: "A", to: "B", alone: "같음", public: "같음" }] }).face.length, 0);
});

test("a rift opens, gets an apology, then is made up with lingering resentment; injection follows", () => {
  const f = {};
  applyHuman(f, validateHuman({ rift: [{ a: "시로코", b: "호시노", about: "순찰을 빼먹음", state: "open", grudge: "some", who: "시로코" }] }), anchor(10));
  assert.equal(f.rifts.length, 1);
  const id = f.rifts[0].id;
  assert.deepEqual(riftsForPrompt(f), [{ id, a: "시로코", b: "호시노", about: "순찰을 빼먹음", state: "open", grudge: "some" }]);
  let lines = riftLines(f, new Set(["시로코", "호시노"]), 12);
  assert.match(lines[0], /unresolved/);
  assert.match(lines[0], /시로코 still resents/);
  applyHuman(f, validateHuman({ rift: [{ id, a: "시로코", b: "호시노", about: "순찰을 빼먹음", state: "apologized", grudge: "some", who: "시로코" }] }), anchor(14));
  assert.equal(f.rifts.length, 1);
  assert.equal(f.rifts[0].state, "apologized");
  applyHuman(f, validateHuman({ rift: [{ id, a: "시로코", b: "호시노", about: "순찰을 빼먹음", state: "resolved", grudge: "some", who: "시로코" }] }), anchor(20));
  lines = riftLines(f, new Set(["시로코", "호시노"]), 25);
  assert.match(lines[0], /made up/);
  assert.match(lines[0], /lingers/);
  // 사소한 앙금은 시간이 지나면 사라진다
  assert.deepEqual(riftLines(f, new Set(["시로코", "호시노"]), 20 + 400), []);
  // 다른 장면(관련 없는 인물)에는 넣지 않는다
  assert.deepEqual(riftLines(f, new Set(["노노미"]), 25), []);
});

test("made up with no resentment closes the rift; a brand-new resolved rift is ignored", () => {
  const f = {};
  applyHuman(f, validateHuman({ rift: [{ a: "A", b: "B", about: "말다툼", state: "resolved", grudge: "none" }] }), anchor(1));
  assert.equal((f.rifts ?? []).length, 0);
  applyHuman(f, validateHuman({ rift: [{ a: "A", b: "B", about: "말다툼", state: "open" }] }), anchor(2));
  const id = f.rifts[0].id;
  applyHuman(f, validateHuman({ rift: [{ id, a: "A", b: "B", about: "말다툼", state: "resolved", grudge: "none" }] }), anchor(3));
  assert.deepEqual(riftLines(f, new Set(["A", "B"]), 4), []);
  assert.deepEqual(riftsForPrompt(f), []);
});

test("rerolled responses revert rift updates and faces", () => {
  const f = {};
  applyHuman(f, validateHuman({ rift: [{ a: "A", b: "B", about: "거짓말", state: "open", who: "B", grudge: "deep" }] }), anchor(1, "x1"));
  const id = f.rifts[0].id;
  applyHuman(f, validateHuman({ rift: [{ id, a: "A", b: "B", about: "거짓말", state: "apologized", who: "B", grudge: "deep" }], face: [{ who: "A", to: "B", alone: "솔직하다", public: "딴청을 부린다" }] }), anchor(2, "x2"));
  assert.equal(f.rifts[0].state, "apologized");
  revertHuman(f, (src) => src.chatId !== "x2");
  assert.equal(f.rifts[0].state, "open");
  assert.equal(Object.keys(f.faces ?? {}).length, 0);
  revertHuman(f, () => false);
  assert.equal(f.rifts.length, 0);
});

test("faces: injected when both are present, noting whether others are around; locked faces stay", () => {
  const f = {};
  applyHuman(f, validateHuman({ face: [{ who: "세리카", to: "선생님", alone: "솔직하게 고마워한다", public: "괜히 퉁명스럽게 군다" }] }), anchor(1));
  assert.match(faceLines(f, new Set(["세리카", "선생님"]))[0], /alone with 선생님/);
  assert.match(faceLines(f, new Set(["세리카", "선생님", "노노미"]))[0], /others are present now/);
  assert.deepEqual(faceLines(f, new Set(["세리카"])), []);
  setFace(f, "세리카", "선생님", { alone: "솔직하다", public: "퉁명스럽다" });
  applyHuman(f, validateHuman({ face: [{ who: "세리카", to: "선생님", alone: "x", public: "y" }] }), anchor(2));
  const k = Object.keys(f.faces)[0];
  assert.equal(f.faces[k].alone, "솔직하다");
  deleteFace(f, k);
  assert.equal(Object.keys(f.faces).length, 0);
});

test("pairView includes rifts and both faces; user edits", () => {
  const f = { cursor: { at: 30 } };
  applyHuman(f, validateHuman({ rift: [{ a: "시로코", b: "호시노", about: "순찰", state: "open", who: "시로코" }], face: [{ who: "호시노", to: "시로코", alone: "다정하다", public: "놀린다" }] }), anchor(10));
  const v = pairView(f, ["시로코"], "호시노", 30);
  assert.equal(v.rifts.length, 1);
  assert.equal(v.face.ba.alone, "다정하다");
  assert.equal(v.face.ab, null);
  resolveRift(f, v.rifts[0].id);
  assert.equal(f.rifts[0].state, "resolved");
  assert.equal(f.rifts[0].lock, true);
  assert.deepEqual(riftLines(f, new Set(["시로코", "호시노"]), 31), []);
  deleteRift(f, v.rifts[0].id);
  assert.equal(f.rifts.length, 0);
});

test("analysis prompt carries the short rift/face rules and current rifts", () => {
  const r = humanRules();
  assert.match(r, /`rift`/);
  assert.match(r, /`face`/);
  const [sys, user] = buildMessages({ bot: "b", newest: { index: 1, text: "t" }, rifts: [{ id: "rf_1", a: "A", b: "B", about: "x", state: "open", grudge: "none" }] });
  assert.match(sys.content, /`rift`/);
  assert.deepEqual(JSON.parse(user.content).rifts, [{ id: "rf_1", a: "A", b: "B", about: "x", state: "open", grudge: "none" }]);
});
