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
  assert.ok(!characterDocs(f).some((d) => d.id === USER_NSFW_ID), "유저 문서가 있으면 그 문서를 쓴다");
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
