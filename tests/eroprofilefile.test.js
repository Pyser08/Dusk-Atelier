import test from "node:test";
import assert from "node:assert/strict";
import { buildProfileFile, readProfileFile, profilePatch, PROFILE_KIND } from "../src/data/eroprofilefile.js";

const got = { name: "리아", scalars: [{ key: "initiative", base: 40, override: 70 }, { key: "directness", base: 55, override: null }],
  eroticInterest: { base: 50, override: 80 }, gender: { analysed: "여성", override: "female" }, cycle: { override: "off" }, pref: { base: {}, override: { female: 10, male: null, genderless: null } } };
test("내보내기에는 직접 고친 값·태그·참고용 분석값이 담긴다", () => {
  const f = buildProfileFile(got, { likes: ["a"], limits: ["b"] });
  assert.equal(f.kind, PROFILE_KIND);
  assert.deepEqual(f.overrides.scalars, { initiative: 70 });
  assert.equal(f.overrides.eroticInterest, 80); assert.equal(f.overrides.gender, "female"); assert.equal(f.overrides.cycle, "off");
  assert.deepEqual(f.tags, { likes: ["a"], limits: ["b"] });
  assert.deepEqual(f.analysed.scalars, { initiative: 40, directness: 55 });
});
test("불러오기: 왕복하면 같은 값, 분석값은 쓰지 않는다", () => {
  const f = readProfileFile(JSON.stringify(buildProfileFile(got, { likes: ["a"], limits: [] })));
  assert.deepEqual(f.scalars, { initiative: 70 }); assert.equal(f.eroticInterest, 80); assert.equal(f.name, "리아");
  assert.deepEqual(f.pref, { female: 10, male: null, genderless: null });
});
test("잘못된 파일은 이유를 던진다", () => {
  assert.throws(() => readProfileFile("{"), /JSON/);
  assert.throws(() => readProfileFile("{}"), /프로필 파일이 아니에요/);
  assert.throws(() => readProfileFile(JSON.stringify({ kind: PROFILE_KIND, v: 9 })), /새로운 버전/);
});
test("값은 0~100으로 정리되고 이상한 값은 버린다", () => {
  const f = readProfileFile(JSON.stringify({ kind: PROFILE_KIND, v: 1, overrides: { scalars: { a: 150, b: "x", c: -5 }, gender: "zzz", cycle: "on", pref: { female: 5 } } }));
  assert.deepEqual(f.scalars, { a: 100, c: 0 }); assert.equal(f.gender, ""); assert.equal(f.cycle, "on");
});
test("patch: 파일에 없는 칸은 분석값(null)으로 돌린다", () => {
  const f = readProfileFile(JSON.stringify(buildProfileFile(got, null)));
  const p = profilePatch({ scalars: [{ key: "initiative" }, { key: "directness" }], eroticInterest: {} }, f);
  assert.deepEqual([p.initiative, p.directness, p.eroticInterest, p.gender, p.cycle], [70, null, 80, "female", "off"]);
  assert.deepEqual(p.pref, { female: 10, male: null, genderless: null });
  const empty = profilePatch({ scalars: [{ key: "x" }] }, readProfileFile(JSON.stringify({ kind: PROFILE_KIND, v: 1 })));
  assert.deepEqual(empty, { x: null, gender: "", cycle: "", pref: null });
});
