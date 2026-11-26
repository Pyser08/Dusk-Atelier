import test from "node:test";
import assert from "node:assert/strict";
import { liveUserNames } from "../src/engine/pastpersona.js";

test("신고 #22: 고르지 않은 페르소나(NPC와 같은 이름)는 나로 묶지 않는다", () => {
  const db = { username: "User", selectedPersona: 0, personas: [{ name: "한도윤" }, { name: "누마타 켄지" }] };
  const names = liveUserNames(db);
  assert.ok(names.includes("한도윤"));
  assert.ok(!names.some((n) => /켄지|누마타/.test(n)));
});
