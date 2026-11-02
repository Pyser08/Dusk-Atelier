import test from "node:test";
import assert from "node:assert/strict";
import { userText, setUserName, userLabel } from "../src/ui/screens/memory/username.js";

test("{{user}}를 페르소나 이름으로(받침 따라 조사도 맞춤), 이름이 없으면 '나'", () => {
  setUserName("선생님");
  assert.equal(userText("{{user}}와의 관계"), "선생님과의 관계");
  assert.equal(userText("{{user}}가 웃었다, {{user}}를 봤다, {{user}}는"), "선생님이 웃었다, 선생님을 봤다, 선생님은");
  setUserName("Sensei"); assert.equal(userText("{{user}}와 {{user}}에게"), "Sensei와 Sensei에게");
  setUserName("미유"); assert.equal(userText("{{user}}이 왔다"), "미유가 왔다");
  setUserName(""); assert.equal(userLabel(), "나"); assert.equal(userText("{{user}}와의 관계"), "나와의 관계");
  assert.equal(userText("그대로"), "그대로");
});
