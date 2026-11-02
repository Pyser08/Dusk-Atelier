import test from "node:test";
import assert from "node:assert/strict";
import { counterparts, pairView, changesOf, currentAttrs, momentsOf, nowOf, setTalk, toggleTalkLock, deleteTalk, editBond, deleteBond, resolveBelief, deleteBelief, applyHuman, revertHuman } from "../src/engine/memoryhuman.js";

const folder = () => ({
  cursor: { at: 300 },
  scenes: [{ at: 10, who: ["Mina", "Yuna"] }, { at: 20, who: ["Mina", "Yuna", "Rei"] }, { at: 30, who: ["Mina", "Yuna"] }],
  emo: {
    "mina>yuna": { from: "Mina", to: "Yuna", tags: { affection: 5, hostility: 6 }, log: [{ t: { affection: 5, hostility: 6 }, from: {}, why: "x", at: 30 }] },
    "yuna>mina": { from: "Yuna", to: "Mina", tags: { trust: 3 }, log: [{ t: { trust: 3 }, at: 30 }] },
    "mina>{{user}}": { from: "Mina", to: "{{user}}", tags: { trust: 7 }, log: [] },
  },
  talk: { "mina>yuna": { from: "Mina", to: "Yuna", call: "유나", tone: "casual", prev: { call: "선배", tone: "formal" } } },
  bonds: [{ id: "b1", a: "Mina", b: "Yuna", moment: "우산을 같이 씀", hook: "우산" }],
  exp: { "mina|yuna": { a: "Mina", b: "Yuna", ae: "사과", be: "모른 척", as: true, bs: false, gap: true } },
  beliefs: [{ id: "f1", who: "Yuna", thinks: "이사 간다", truth: "남는다", by: "Rei", open: true }],
});

test("counterparts come from scenes, feelings, address forms, memories and beliefs", () => {
  const list = counterparts(folder(), ["Mina"]);
  assert.deepEqual(list.map((x) => x.name), ["Yuna", "Rei", "{{user}}"]);
  assert.equal(list[0].stage, "acquaintances");
});

test("pair view gathers everything between two people, with cooled feelings explained", () => {
  const v = pairView(folder(), ["Mina"], "Yuna");
  assert.equal(v.stage.stage, "acquaintances");
  assert.equal(v.feel.ab.tags.affection, 4);   // 애정은 천천히(270개 응답 뒤 5 → 4)
  assert.ok(v.feel.ab.tags.hostility <= 2);     // 적대감은 빨리
  assert.deepEqual(v.feel.ab.cooled.map((c) => [c.tag, c.from]).sort(), [["affection", 5], ["hostility", 6]]);
  assert.equal(v.feel.ba.tags.trust, 3);
  assert.equal(v.talk.ab.call, "유나"); assert.equal(v.talk.ba, null);
  assert.equal(v.bonds.length, 1);
  assert.equal(v.exp.ae, "사과");
  assert.equal(v.beliefs.length, 1);
  assert.equal(nowOf(folder()), 300);
});

test("changes, current traits and moments for the summary tab", () => {
  const p = { name: "Mina", records: [
    { id: "r1", at: 5, act: "처음 인사", g: "B" },
    { id: "r2", at: 40, act: "냉정해짐", g: "A", attr: { c: "trait", k: "성격", v: "냉정함" }, prev: { act: "다정", v: "다정함" }, valid: true },
    { id: "r3", at: 50, act: "학생회장", g: "B", attr: { c: "status", k: "직책", v: "학생회장" } },
    { id: "r4", at: 0, act: "빵을 삼", g: "D" },
    { id: "r5", at: 45, act: "옛 성격", g: "C", attr: { c: "trait", k: "성격", v: "다정함" }, valid: false },
  ] };
  assert.deepEqual(changesOf(p).map((c) => [c.label, c.from, c.to]), [["성격", "다정함", "냉정함"]]);
  assert.deepEqual(currentAttrs(p).map((a) => [a.label, a.v]), [["성격", "냉정함"], ["처지", "학생회장"]]);
  const ms = momentsOf(p, 300);
  assert.equal(ms[0].r.id, "r2");
  assert.ok(ms.find((m) => m.r.id === "r1").earlier);
  assert.ok(ms.find((m) => m.r.id === "r4").vague);
});

test("editing address forms locks them against the AI; delete removes", () => {
  const f = folder();
  setTalk(f, "Mina", "Yuna", { call: "유나야", tone: "casual" });
  assert.equal(f.talk["mina>yuna"].call, "유나야");
  assert.equal(f.talk["mina>yuna"].lock, true);
  assert.equal(f.talk["mina>yuna"].prev.call, "유나");
  applyHuman(f, { talk: [{ from: "Mina", to: "Yuna", call: "너", tone: "casual" }], bond: [], belief: [], cleared: [] }, { at: 400 }, {});
  assert.equal(f.talk["mina>yuna"].call, "유나야", "locked: AI does not change it");
  assert.equal(revertHuman(f, () => false), 0, "user edits are never reverted as rerolls");
  toggleTalkLock(f, "mina>yuna"); assert.equal(f.talk["mina>yuna"].lock, false);
  deleteTalk(f, "mina>yuna"); assert.equal(f.talk["mina>yuna"], undefined);
});

test("memories can be edited or deleted; beliefs resolved or deleted", () => {
  const f = folder();
  editBond(f, "b1", { moment: "비 오는 날 우산을 같이 씀", hook: "비" });
  assert.equal(f.bonds[0].moment, "비 오는 날 우산을 같이 씀"); assert.equal(f.bonds[0].user, true);
  deleteBond(f, "b1"); assert.equal(f.bonds.length, 0);
  resolveBelief(f, "f1"); assert.equal(f.beliefs[0].open, false); assert.equal(f.beliefs[0].closedBy, "user");
  deleteBelief(f, "f1"); assert.equal(f.beliefs.length, 0);
});
