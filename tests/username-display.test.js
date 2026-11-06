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

import { loadUserName } from "../src/ui/screens/memory/username.js";
test("loadUserName: 채팅에 묶인 페르소나가 기본 페르소나보다 먼저, 매번 새로 읽는다", async () => {
  let sel = 0;
  const db = () => ({ username: "", personas: [{ id: "a", name: "기본A" }, { id: "b", name: "묶인B" }], selectedPersona: sel });
  const api = { getDatabase: async () => db(), getChatFromIndex: async () => ({ bindedPersona: "b" }) };
  const ctx = { api, memory: { switches: { currentChat: async () => ({ ci: 1, ti: 0 }) } } };
  assert.equal(await loadUserName(ctx), "묶인B", "기본이 A여도 묶인 B");
  api.getChatFromIndex = async () => ({});
  assert.equal(await loadUserName(ctx), "기본A", "묶인 게 없으면 기본");
  sel = 1;
  assert.equal(await loadUserName(ctx), "묶인B", "기본을 바꾸면 바로 따라간다");
});
