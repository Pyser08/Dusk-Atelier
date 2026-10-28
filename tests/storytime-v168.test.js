import test from "node:test";
import assert from "node:assert/strict";
import { latestStoryState, parseStatus, timeFromText, insertTime, stateText, TIME_MARK } from "../src/engine/storytime.js";
import { createStoryTime, STORY_TIME_KEY } from "../src/data/storytime.js";
import { buildBlock } from "../src/engine/memoryinject.js";

const bot = (t) => ({ role: "char", data: t }), user = (t) => ({ role: "user", data: t });
test("시각 읽기: 24시간·오전/오후", () => {
  assert.equal(timeFromText("[2026-10-28 15:30 | 교실]"), "15:30");
  assert.equal(timeFromText("오후 3시 5분"), "15:05");
  assert.equal(timeFromText("오전 12시"), "00:00");
  assert.equal(timeFromText("12345:99"), "");
});
test("상태 줄에서 날짜·시각·장소를 읽는다", () => {
  assert.deepEqual(parseStatus("[2026-10-28 15:30 | 교실]\n본문"), { date: "2026-10-28", time: "15:30", place: "교실" });
  assert.deepEqual(parseStatus("【2026-10-28 · 21:00 · 옥상】\n본문"), { date: "2026-10-28", time: "21:00", place: "옥상" });
  assert.deepEqual(parseStatus("그냥 본문만 있다\n끝"), { date: "", time: "", place: "" });
});
test("장소가 바뀌면 시각이, 자정을 넘기면 날짜가 따라 바뀐다. 줄이 없는 턴은 유지, 과거·1년 점프는 무시", () => {
  const msgs = [bot("[2026-10-28 15:30 | 교실]\na"), user("가자"), bot("[2026-10-28 16:10 | 옥상]\nb"), bot("본문만"), bot("[2026-10-29 00:20 | 집]\nc")];
  assert.equal(stateText(latestStoryState(msgs.slice(0, 1))), "2026-10-28 15:30 · 교실");
  assert.equal(stateText(latestStoryState(msgs.slice(0, 3))), "2026-10-28 16:10 · 옥상");
  assert.equal(stateText(latestStoryState(msgs.slice(0, 4))), "2026-10-28 16:10 · 옥상"); // 줄 없음 → 유지
  assert.equal(stateText(latestStoryState(msgs)), "2026-10-29 00:20 · 집");
  assert.equal(latestStoryState([bot("[2026-10-28 10:00 | a]"), bot("[2026-10-20 11:00 | b]")]).date, "2026-10-28"); // 과거 날짜 무시
  assert.equal(latestStoryState([bot("[2026-10-28 10:00 | a]"), user("[2030-01-01 11:00 | b]")]).date, "2026-10-28"); // 사용자 말 무시
});
test("요청 맨 위에 블록(현재 값 + 규칙)을 넣고 멱등이며 원본을 바꾸지 않는다", () => {
  const msgs = [{ role: "system", content: "S" }, { role: "user", content: "hi" }];
  const a = insertTime(msgs, { date: "2026-10-28", time: "15:30", place: "교실" });
  assert.ok(a[0].content.startsWith(TIME_MARK) && a[0].content.includes("2026-10-28 15:30 · 교실") && a[0].content.includes("Rule:") && a.length === 3 && msgs.length === 2);
  const b = insertTime(a, { date: "2026-10-29", time: "01:00", place: "" });
  assert.equal(b.length, 3); assert.ok(b[0].content.includes("2026-10-29 01:00"));
  assert.ok(insertTime(msgs, null)[0].content.includes("not set yet")); // 값이 없어도 규칙은 보낸다
});
test("훅: 꺼져 있으면 통과, 켜면 삽입·채팅별 저장, 장기기억용 current", async () => {
  const store = new Map(); let hooks = 0;
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    addRisuReplacer: async () => { hooks++; }, getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
    getCharacterFromIndex: async () => ({ chaId: "c1" }), getChatFromIndex: async () => ({ id: "t1", message: [bot("[2026-10-28 15:30 | 교실]\nhi")] }) };
  const st = createStoryTime(api);
  assert.equal(await st.start(), false); assert.equal(hooks, 0);
  const m = [{ role: "user", content: "x" }];
  assert.equal(await st.beforeRequest(m, "model"), m);
  assert.equal(await st.current("c1", "t1"), null);
  await st.set(true); await st.set(false); await st.set(true);
  assert.equal(hooks, 1); assert.equal(store.get(STORY_TIME_KEY), "on");
  const out = await st.beforeRequest(m, "model");
  assert.ok(out[0].content.includes("2026-10-28 15:30 · 교실"));
  assert.deepEqual(await st.current("c1", "t1"), { date: "2026-10-28", time: "15:30", place: "교실" });
  assert.equal(await st.beforeRequest(m, "memory"), m);
});
test("장기기억 주입은 이야기 시간 값을 기준으로 쓴다", () => {
  const folder = { scenes: [{ sum: "교실에서 대화", iso: "2026-10-01", at: 1 }], people: {} };
  const r = buildBlock(folder, { messageCount: 4, settings: { plus: true }, storyNow: "2026-10-28 15:30 · 교실" });
  assert.ok(r.text.includes("Story time (now): 2026-10-28 15:30 · 교실"));
});
