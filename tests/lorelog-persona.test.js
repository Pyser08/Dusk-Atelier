// 2.1.9 제보: 로어북 로그가 {{user}}를 db.username(전역 이름)으로 바꿔 대조해서, 활성 페르소나와 이름이 다르면 항목이 빠진 것으로 나왔다.
import test from "node:test";
import assert from "node:assert/strict";
import { createLoreLog } from "../src/data/lorelog.js";

const body = "{{user}}는 이 학교의 전학생이고 매일 도서관에 간다\n{{user}}에게 친구가 한 명 있다 이름은 하루\n{{user}}는 점심마다 옥상에서 도시락을 먹는다";
function setup(db, chatOver = {}) {
  const store = {};
  const chat = { id: "c1", message: [{ role: "user", data: "안녕" }], localLore: [], ...chatOver };
  const character = { chaId: "x", name: "봇", chats: [chat], globalLore: [{ comment: "전학생", content: body, key: "", mode: "normal", alwaysActive: true }], loreSettings: {} };
  const api = {
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat,
    getDatabase: async () => ({ modules: [], enabledModules: [], ...db }),
    pluginStorage: { getItem: async (k) => store[k] ?? null, setItem: async (k, v) => { store[k] = v; } }
  };
  return createLoreLog(api, { quietMs: 5, log: () => {} });
}
const prompt = "유리는 이 학교의 전학생이고 매일 도서관에 간다\n유리에게 친구가 한 명 있다 이름은 하루\n유리는 점심마다 옥상에서 도시락을 먹는다";
const names = async (log) => { await log.beforeRequest([{ role: "system", content: prompt }], "model"); await log.onOutput("봇의 응답입니다 오늘도 평화로운 하루예요"); await new Promise((r) => setTimeout(r, 30)); return (log.last()?.entries ?? []).map((x) => x.n); };

test("활성 페르소나 이름으로 {{user}}를 바꿔 대조한다(전역 이름과 달라도)", async () => {
  const log = setup({ username: "마스터", personas: [{ id: "p1", name: "마스터" }, { id: "p2", name: "유리" }], selectedPersona: 1 });
  assert.deepEqual(await names(log), ["전학생"]);
});
test("채팅에 묶인 페르소나가 있으면 그 이름이 먼저", async () => {
  const log = setup({ username: "마스터", personas: [{ id: "p1", name: "마스터" }, { id: "p2", name: "유리" }], selectedPersona: 0 }, { bindedPersona: "p2" });
  assert.deepEqual(await names(log), ["전학생"]);
});
