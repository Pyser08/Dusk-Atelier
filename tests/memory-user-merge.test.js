import test from "node:test";
import assert from "node:assert/strict";
import { userMergePlan, mergeIntoUser, USER } from "../src/engine/memoryuser.js";

const mk = () => ({
  people: {
    sensei: { name: "Sensei", aliases: ["선생"], pinned: true, records: [{ id: "r1", act: "인사", at: 1 }, { id: "r3", act: "출발", at: 3 }] },
    "{{user}}": { name: "{{user}}", aliases: [], pinned: false, records: [{ id: "r2", act: "웃음", at: 2 }] },
    호시노: { name: "호시노", aliases: [], records: [{ id: "h1", act: "잠", at: 1 }] }
  },
  emo: { "호시노>sensei": { from: "호시노", to: "Sensei", tags: { trust: 3 }, log: [{ d: 1 }] }, "호시노>{{user}}": { from: "호시노", to: "{{user}}", tags: { affection: 2 }, log: [{ d: 2 }] } },
  talk: { "호시노>sensei": { from: "호시노", to: "Sensei", call: "선생님", at_ms: 5 } },
  rels: { "sensei>호시노": { from: "Sensei", to: "호시노", items: [{ d: "친해짐" }] } },
  faces: { "호시노>sensei": { who: "호시노", to: "Sensei", alone: "다정", public: "놀림" } },
  exp: { "sensei|호시노": { a: "Sensei", b: "호시노", gap: "x" } },
  bonds: [{ id: "b1", a: "Sensei", b: "호시노", moment: "함께 웃음" }],
  rifts: [{ id: "f1", a: "호시노", b: "sensei", about: "약속" }],
  beliefs: [{ id: "x1", who: "호시노", by: "Sensei", thinks: "..." }],
  scenes: [{ id: "s1", who: ["Sensei", "호시노", "{{user}}"] }]
});
test("미리 보기: 페르소나 이름으로 쌓인 인물·기록 수, {{user}} 자신·다른 인물은 제외", () => {
  const p = userMergePlan(mk(), ["Sensei"]);
  assert.deepEqual(p.people.map((x) => [x.name, x.records]), [["Sensei", 2]]); assert.ok(p.links > 0);
  assert.equal(userMergePlan(mk(), []).people.length, 0);
});
test("합치기: 기록 시간순 합침·별칭 보존, 감정·호칭·관계·태도·기대·추억·갈등·오해·장면을 {{user}}로", () => {
  const f = mk(); const r = mergeIntoUser(f, ["Sensei"]);
  assert.equal(r.people, 1);
  assert.deepEqual(Object.keys(f.people).sort(), ["{{user}}", "호시노"].sort());
  const u = f.people[USER]; assert.deepEqual(u.records.map((x) => x.id), ["r1", "r2", "r3"]); assert.ok(u.aliases.includes("Sensei") && u.aliases.includes("선생")); assert.equal(u.pinned, true);
  assert.deepEqual(Object.keys(f.emo), ["호시노>{{user}}"]); assert.deepEqual(f.emo["호시노>{{user}}"].tags, { affection: 2, trust: 3 }); assert.equal(f.emo["호시노>{{user}}"].log.length, 2);
  assert.equal(f.talk["호시노>{{user}}"].to, USER); assert.equal(f.rels["{{user}}>호시노"].from, USER);
  assert.equal(f.faces["호시노>{{user}}"].to, USER); assert.ok(f.exp["{{user}}|호시노"] || f.exp["호시노|{{user}}"]);
  assert.equal(f.bonds[0].a, USER); assert.equal(f.rifts[0].b, USER); assert.equal(f.beliefs[0].by, USER);
  assert.deepEqual(f.scenes[0].who, [USER, "호시노"]);
  assert.equal(mergeIntoUser(f, ["Sensei"]).people, 0, "두 번 해도 그대로");
});
import { meView } from "../src/engine/memoryuser.js";
test("'나' 보기: 나를 아는 인물별 진도·감정(상대→나)·호칭·태도, 내 기록 수", () => {
  const f = mk(); mergeIntoUser(f, ["Sensei"]);
  const v = meView(f);
  assert.equal(v.records, 3); assert.equal(v.others.length, 1);
  const o = v.others[0]; assert.equal(o.name, "호시노"); assert.equal(o.callsMe, "선생님"); assert.equal(o.feel.trust, 3); assert.equal(o.face.alone, "다정"); assert.ok(o.stageLabel);
  assert.equal(meView({ people: {} }).others.length, 0);
});
