import test from "node:test";
import assert from "node:assert/strict";
import { driveFrom, applyDrive, emptyDrive, pickPlans, driveSection, stepWidth, seeded, emoTemp, driveOf, STREAK_MAX, DRIVE_STAGE1 } from "../src/engine/scenedrive.js";
import { applyDriveQueue, nsfwByName } from "../src/data/nsfwturn.js";
import { normalizeNsfw, nsfwInjectLine, normTags } from "../src/engine/nsfwprofile.js";

const RAW = "aim|민지|{{user}}|sex|같이 자고 싶어함|손을 잡고 방으로 이끈다|80\naim|{{user}}|민지|sex|x|y|50\nreply|민지|{{user}}|yes\ndone|수아|도윤|dropped\nwho|민지|웃음";

test("판단 줄 읽기: aim·reply·done, {{user}}는 행위자가 될 수 없다", () => {
  const o = driveFrom(RAW);
  assert.equal(o.aims.length, 1); assert.deepEqual([o.aims[0].actor, o.aims[0].target, o.aims[0].kind, o.aims[0].desire], ["민지", "{{user}}", "sex", 80]);
  assert.equal(o.replies[0].answer, "yes"); assert.equal(o.dones[0].how, "dropped");
  assert.match(DRIVE_STAGE1, /aim\|Actor/); assert.match(DRIVE_STAGE1, /never \{\{user\}\}/);
});

test("보폭: 성적 즉흥성 0-39 한 칸, 40-69 두 칸, 70+ 끝까지, 욕구 71+ 한 칸 더", () => {
  assert.equal(stepWidth(20, 50), 1); assert.equal(stepWidth(50, 50), 2); assert.equal(stepWidth(80, 50), 5); assert.equal(stepWidth(20, 80), 2); assert.equal(stepWidth(null, 10), 2);
});

test("턴 반영: 목표 생김 → 받아 주면 보폭만큼, 밀어내면 한 칸 내려감, 이룸이면 욕구 절반", () => {
  let d = applyDrive(emptyDrive(), driveFrom("aim|민지|{{user}}|sex|w|m|80")).drive;
  assert.equal(d.goals["민지>{{user}}"].rung, 0);
  d = applyDrive(d, driveFrom("reply|민지|{{user}}|yes"), { spont: () => 20 }).drive;
  assert.equal(d.goals["민지>{{user}}"].rung, 2, "즉흥성 20 + 욕구 80 → 두 칸");
  d = applyDrive(d, driveFrom("reply|민지|{{user}}|no")).drive;
  assert.equal(d.goals["민지>{{user}}"].rung, 1);
  d = applyDrive(d, driveFrom("done|민지|{{user}}|reached")).drive;
  assert.equal(d.goals["민지>{{user}}"].rung, 5); assert.equal(d.goals["민지>{{user}}"].desire, 40); assert.equal(d.goals["민지>{{user}}"].fulfilled, 1);
});

test("집착 방지: 같은 상대에 연속으로 움직이면 쉬게 하고, 쉬는 동안엔 계획에서 뺀다", () => {
  let d = emptyDrive();
  for (let i = 0; i < STREAK_MAX; i++) d = applyDrive(d, driveFrom("aim|민지|{{user}}|romance|w|m|100")).drive;
  assert.ok(d.rest["민지"] >= d.turn);
  assert.equal(pickPlans(d, "민지가 웃었다", { random: () => 0 }).length, 0);
  assert.ok(driveOf(d, "민지").restLeft > 0);
});

test("계획 고르기: 행위자·대상이 장면에 있고 욕구 확률을 넘은 것만, 한 행위자 한 줄, 금기 붙임", () => {
  let d = applyDrive(emptyDrive(), driveFrom("aim|민지|{{user}}|sex|w|손을 잡는다|60\naim|수아|도윤|romance|w|말을 건다|90")).drive;
  assert.deepEqual(pickPlans(d, "민지가 웃었다", { random: () => 0.1 }).map((p) => p.goal.actor), ["민지"], "도윤이 없으면 수아 계획은 빠짐");
  assert.equal(pickPlans(d, "민지가 웃었다", { random: () => 0.7 }).length, 0, "욕구 60인데 0.7이면 이번 턴엔 안 움직임");
  const t = driveSection(d, "민지가 웃었다", { random: () => 0, spont: () => 80, limitsOf: (n) => n === "민지" ? ["공공장소"] : [] });
  assert.match(t, /Scene plan/); assert.match(t, /민지 → \{\{user\}\}/); assert.match(t, /마지막 단계/); assert.match(t, /never go into: 공공장소/);
  const r1 = seeded("3|10"), r2 = seeded("3|10"); assert.equal(r1(), r2(), "같은 턴이면 같은 난수(리롤해도 같은 계획)");
});

test("폴더 반영: 성인 프로필의 성적 즉흥성으로 보폭을 정한다", () => {
  const f = { wiki: { documents: { d: { id: "d", type: "Character", title: "민지" } } }, nsfw: { d: normalizeNsfw({ sexual: { sexualSpontaneity: 90 } }) } };
  assert.equal(nsfwByName(f, "민지").sexual.sexualSpontaneity, 90);
  applyDriveQueue(f, [driveFrom("aim|민지|{{user}}|sex|w|m|50"), driveFrom("reply|민지|{{user}}|yes")]);
  assert.equal(f.drive.goals["민지>{{user}}"].rung, 5);
});

test("관계 온도: 감정 기록을 되짚어 0~100 선으로", () => {
  const f = { emo: { "민지>u": { from: "민지", to: "{{user}}", tags: {}, log: [{ t: { affection: 3 }, from: { affection: null }, at: 1 }, { t: { attraction: 5 }, from: { attraction: null }, at: 2 }, { t: { affection: 6 }, from: { affection: 3 }, at: 3 }] } } };
  const t = emoTemp(f, "민지");
  assert.equal(t[0].toName, "나"); assert.deepEqual(t[0].points.map((p) => [p.a, p.e]), [[30, 0], [30, 50], [60, 50]]);
});

test("태그: 중복 빼고, 금기는 RP 줄에 절대 넘지 않음으로", () => {
  assert.deepEqual(normTags({ likes: "목덜미, 느린 전개, 목덜미", limits: ["공개된 장소"] }), { likes: ["목덜미", "느린 전개"], limits: ["공개된 장소"] });
  const n = normalizeNsfw({ sexual: { eroticInterest: 40 }, tags: { limits: ["공개된 장소"] } });
  assert.match(nsfwInjectLine("민지", n), /금기\(절대 넘지 않음\): 공개된 장소/);
});

test("계획 고르기: 이름이 글에 안 나와도 장면 인물(present)이면 계획에 넣는다", () => {
  const d = applyDrive(emptyDrive(), driveFrom("aim|민지|{{user}}|sex|w|손을 잡는다|90")).drive;
  assert.equal(pickPlans(d, "그녀가 웃었다", { random: () => 0 }).length, 0);
  assert.equal(pickPlans(d, "그녀가 웃었다", { random: () => 0, present: ["민지"] }).length, 1);
  assert.match(driveSection(d, "그녀가 웃었다", { random: () => 0, present: ["민지"] }), /민지 → \{\{user\}\}/);
});
