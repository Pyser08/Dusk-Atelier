import test from "node:test";
import assert from "node:assert/strict";
import { characterDocs, USER_NSFW_ID, setUserNsfwNames } from "../src/engine/usernsfw.js";
import { applyNsfwQueue, seedZones } from "../src/data/nsfwturn.js";
import { tickLife, hotActors, lifeSection } from "../src/engine/nsfwlife.js";
import { userNsfwNeed } from "../src/data/profileseed.js";

const folder = () => ({ wiki: { documents: { a: { id: "a", type: "Character", title: "하나" } } }, nsfw: {} });

test("위키에 유저 문서가 없으면 유저 칸(actor:user)이 더해진다", () => {
  setUserNsfwNames(["민준"]);
  const ids = characterDocs(folder()).map((d) => d.id);
  assert.deepEqual(ids, ["a", USER_NSFW_ID]);
  const f = folder(); f.wiki.documents.u = { id: "u", type: "Character", title: "민준" };
  // 11-22: 위키에 나의 문서가 있어도(설정 ‘나 위키 문서’) 성인·몸 칸은 유저 칸 하나 — 그 문서는 NPC 목록에서 빠진다
  assert.deepEqual(characterDocs(f).map((d) => d.id), ["a", USER_NSFW_ID]);
});

test("기록기가 보고한 유저 취향이 유저 칸에 저장된다", () => {
  setUserNsfwNames(["민준"]);
  const f = folder();
  const out = applyNsfwQueue(f, [{ kind: "sexval", name: "{{user}}", key: "eroticInterest", delta: 10 }, { kind: "taste", name: "민준", preference: "preferred", label: "샤워실" }]);
  assert.ok(f.nsfw[USER_NSFW_ID], "유저 칸이 생김");
  assert.equal(out.length, 1);
});

test("유저 칸도 성감대·몸 상태가 쌓이지만, 장면 계획·주입에는 들어가지 않는다", () => {
  setUserNsfwNames(["민준"]);
  const f = folder(); f.cursor = { at: 5 };
  f.nsfw[USER_NSFW_ID] = { sexual: { eroticInterest: 90 } };
  assert.ok(seedZones(f, ["{{user}}"]).length >= 1);
  assert.ok(f.nsfw[USER_NSFW_ID].zones.length > 0);
  tickLife(f, { turn: 5, present: ["{{user}}"] });
  assert.ok(f.life.p[USER_NSFW_ID], "몸 상태 기록");
  f.life.p[USER_NSFW_ID].lust = 99; f.life.p[USER_NSFW_ID].refr = -1;
  assert.ok(!hotActors(f).some((x) => x.actor === "민준"));
  assert.ok(!lifeSection(f, ["{{user}}"], 5).includes("민준"));
});

test("유저 성인 프로필은 페르소나 설명으로 만든다", async () => {
  const api = { getDatabase: async () => ({ username: "U", personas: [{ name: "민준", personaPrompt: "대학생, 수줍음" }], selectedPersona: 0 }) };
  const me = await userNsfwNeed(api, {});
  assert.equal(me.id, USER_NSFW_ID);
  assert.equal(me.name, "민준");
  assert.match(me.profile, /수줍음/);
  assert.equal(await userNsfwNeed(api, { [USER_NSFW_ID]: {} }), null, "이미 있으면 안 만든다");
});

import { genderOf, setGender, guessGender } from "../src/engine/gender.js";
import { nsfwFrom } from "../src/engine/recorder.js";

test("성별: 저장값 → Erosync → 모름, 직접 고친 값은 잠김, 자동은 지움", () => {
  const f = { orient: { 하나: { g: "f" } } }, d = { id: "a", title: "하나" };
  assert.equal(genderOf(f, d), "f");
  assert.ok(setGender(f, "a", "m")); assert.equal(genderOf(f, d), "m");
  assert.ok(setGender(f, "a", "f", { by: "user" }));
  assert.equal(setGender(f, "a", "m"), false, "잠김");
  assert.ok(setGender(f, "a", null)); assert.equal(genderOf(f, d), "f");
  assert.equal(genderOf({}, d), null);
  assert.ok(setGender(f, "u", "m", { by: "persona" })); assert.equal(setGender(f, "u", "f", { by: "persona" }), false, "페르소나 값은 처음만");
  assert.equal(guessGender("20살 남자 대학생. 그는 조용하다"), "m");
  assert.equal(guessGender("평범한 사람"), null);
});

test("이야기에서 성별이 바뀌면 그 턴에 바로 바뀌고 새 성별 성감대가 채워진다", () => {
  const r = nsfwFrom("sex|하나|m|\"몸이 남자가 됐어\"", [{ name: "하나" }]);
  assert.deepEqual(r.map((x) => [x.kind, x.g]), [["sex", "m"]]);
  const f = folder(); f.orient = { 하나: { g: "f" } };
  f.nsfw.a = { sexual: { eroticInterest: 60 }, zones: [{ part: "clit", level: 3 }] };
  const out = applyNsfwQueue(f, r);
  assert.equal(genderOf(f, f.wiki.documents.a), "m");
  assert.ok(f.nsfw.a.zones.some((z) => ["penis", "glans", "testicles", "prostate"].includes(z.part)), "남성 부위 채움");
  assert.ok(f.nsfw.a.zones.some((z) => z.part === "clit"), "예전 부위는 남김");
  assert.ok(out[0].changed[0].includes("남성"));
});
