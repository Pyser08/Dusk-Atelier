import test from "node:test";
import assert from "node:assert/strict";
import { dynamicHypa, splitHypa, appendLayout, HYPA_MARK, REF_MARK } from "../src/engine/cachelayout.js";

const hypa = { summaries: [{ text: "요약0 왕국이 세워졌다" }, { text: "요약1 용과 싸웠다" }, { text: "요약2 시장에 갔다" }, { text: "요약3 비가 왔다" }],
  metrics: { lastImportantSummaries: [0], lastRecentSummaries: [3], lastSimilarSummaries: [1, 3], lastRandomSummaries: [2] } };
const msgs = () => [{ role: "system", content: "설정" }, { role: "system", content: "<Past Events Summary>\n요약0 왕국이 세워졌다\n\n요약1 용과 싸웠다\n\n요약2 시장에 갔다\n\n요약3 비가 왔다\n</Past Events Summary>" },
  { role: "system", content: "용의 둥지는 북쪽 산맥 깊은 곳에 있다." }, { role: "user", content: "1" }, { role: "assistant", content: "2" }, { role: "system", content: "[Dusk Memory] x" }, { role: "user", content: "3" }];

test("하이파 V3: 연관·랜덤에만 든 요약만 동적", () => {
  assert.deepEqual(dynamicHypa(hypa), ["요약1 용과 싸웠다", "요약2 시장에 갔다"]);
  assert.deepEqual(dynamicHypa({ summaries: [] }), []); assert.deepEqual(dynamicHypa(null), []);
});
test("하이파 분리: 중요·최근은 제자리, 연관·랜덤은 마지막 사용자 말 바로 앞, 멱등", () => {
  const r = splitHypa(msgs(), hypa); assert.equal(r.moved, 2);
  assert.ok(!r.messages[1].content.includes("용과 싸웠다") && r.messages[1].content.includes("왕국이 세워졌다") && r.messages[1].content.includes("비가 왔다"));
  const u = r.messages.length - 1; assert.equal(r.messages[u].content, "3"); assert.ok(r.messages[u - 1].content.startsWith(HYPA_MARK));
  assert.equal(splitHypa(r.messages, hypa).messages.filter((m) => String(m.content).startsWith(HYPA_MARK)).length, 1);
  assert.equal(splitHypa(msgs(), null).moved, 0);
});
test("이어붙이기: 키워드 로어북·하이파 동적은 마지막 사용자 말 뒤 참고 블록, 바뀌는 블록도 뒤로", () => {
  const r = appendLayout(msgs(), { keywordLore: ["용의 둥지는 북쪽 산맥 깊은 곳에 있다."], hypaData: hypa });
  assert.equal(r.lore, 1); assert.equal(r.moved, 2);
  const c = r.messages.map((m) => String(m.content));
  assert.ok(!c.slice(0, 3).some((t) => t.includes("용의 둥지")), "앞쪽에서 빠짐");
  const u = c.indexOf("3"); assert.ok(c[u + 1].startsWith("[Dusk Memory]") || c[u + 1].startsWith(REF_MARK));
  const ref = c.find((t) => t.startsWith(REF_MARK)); assert.ok(ref.includes("용의 둥지") && ref.includes("용과 싸웠다"));
  assert.ok(c.indexOf(ref) > u, "참고 블록은 마지막 사용자 말 뒤");
});
import { createCacheLayout, LAYOUT_KEY } from "../src/data/cachelayout.js";
test("런타임: 지금 채팅의 하이파·키워드 로어북으로 배치, 설정 저장", async () => {
  const store = new Map(); const ch = { globalLore: [{ content: "용의 둥지는 북쪽 산맥 깊은 곳에 있다.", key: "용" }, { content: "늘 켜진 설정 글입니다 아주 긴 글", alwaysActive: true }], chats: [{ hypaV3Data: hypa, message: [] }] };
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => ch, getDatabase: async () => ({ modules: [], enabledModules: [] }) };
  const L = createCacheLayout(api);
  const a = await L.apply(msgs()); assert.ok(a.messages.some((m) => String(m.content).startsWith(HYPA_MARK)), "기본: 하이파 분리");
  await L.set({ append: true }); assert.equal(JSON.parse(store.get(LAYOUT_KEY)).append, true);
  const b = await L.apply(msgs()); assert.equal(b.info.lore, 1); assert.equal(b.info.moved, 2);
  await L.set({ hypaSplit: false, append: false }); assert.equal((await L.apply(msgs())).info, null);
});
