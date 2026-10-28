import test from "node:test";
import assert from "node:assert/strict";
import { latestStoryDate, insertTime, TIME_MARK } from "../src/engine/storytime.js";
import { createStoryTime, STORY_TIME_KEY } from "../src/data/storytime.js";

const bot = (t) => ({ role: "char", data: t }), user = (t) => ({ role: "user", data: t });
test("봇 응답에서 가장 최근 이야기 날짜를 뽑고, 사용자 말·과거·1년 초과 점프는 무시", () => {
  assert.equal(latestStoryDate([bot("[2026-10-28 오후]\n안녕"), user("2030-01-01"), bot("본문만 있다")]), "2026-10-28");
  assert.equal(latestStoryDate([bot("[2026-10-28]\na"), bot("[2026-10-20]\nb")]), "2026-10-28"); // 과거는 무시
  assert.equal(latestStoryDate([bot("[2026-10-28]\na"), bot("[2029-01-01]\nb")]), "2026-10-28"); // 1년 넘는 점프 무시
  assert.equal(latestStoryDate([bot("날짜 없음"), user("hi")]), "");
});
test("요청 맨 위에 한 줄을 넣고 멱등이며 원본을 바꾸지 않는다", () => {
  const msgs = [{ role: "system", content: "S" }, { role: "user", content: "hi" }];
  const a = insertTime(msgs, "2026-10-28");
  assert.equal(a[0].role, "system"); assert.ok(a[0].content.startsWith(TIME_MARK)); assert.equal(a.length, 3); assert.equal(msgs.length, 2);
  assert.equal(insertTime(a, "2026-10-29").length, 3); assert.ok(insertTime(a, "2026-10-29")[0].content.includes("2026-10-29"));
  assert.deepEqual(insertTime(msgs, ""), msgs);
});
test("훅: 꺼져 있으면 통과, 켜면 날짜가 있을 때만 삽입. 장기기억과 무관", async () => {
  const store = new Map(); let hooks = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    addRisuReplacer: async () => { hooks++; }, getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getChatFromIndex: async () => ({ message: [bot("[2026-10-28]\nhi")] }) };
  const st = createStoryTime(api);
  assert.equal(await st.start(), false); assert.equal(hooks, 0);
  const m = [{ role: "user", content: "x" }];
  assert.equal(await st.beforeRequest(m, "model"), m);
  await st.set(true); await st.set(false); await st.set(true);
  assert.equal(hooks, 1); assert.equal(store.get(STORY_TIME_KEY), "on");
  const out = await st.beforeRequest(m, "model");
  assert.ok(out[0].content.includes("2026-10-28"));
  assert.equal(await st.beforeRequest(m, "memory"), m); // 모델 요청이 아니면 통과
});
