import { test } from "node:test";
import assert from "node:assert/strict";
import { userNameList, loadUserNames } from "../src/data/usernames.js";
import { normalizeUserNames } from "../src/engine/memoryuser.js";

test("username이 달라도 선택한 페르소나 이름을 {{user}}로 본다", () => {
  const db = { username: "User", personas: [{ name: "하윤" }, { name: "Ted Kim" }], selectedPersona: 1 };
  const names = userNameList(db);
  assert.ok(names.includes("Ted Kim") && names.includes("Ted") && names.includes("하윤"));
  const r = normalizeUserNames({ people: [{ name: "Ted", know: ["Ted Kim"] }], rel: [{ from: "하윤", to: "지하연" }] }, names);
  assert.equal(r.people[0].name, "{{user}}");
  assert.equal(r.rel[0].from, "{{user}}");
});
test("이름 읽기 실패해도 빈 목록", async () => {
  assert.deepEqual(await loadUserNames({ getDatabase: async () => { throw new Error("x"); } }), []);
});
