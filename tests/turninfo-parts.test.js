// 2.1.4: 모델 호출 정보에 '입력 내역' — 메인 프롬프트를 출처별로 나눠 어림하고, Dusk 요청 훅이 나중에 붙어도 마지막에 본다.
import test from "node:test";
import assert from "node:assert/strict";
import { promptParts, estimateTokens, callHtml } from "../src/engine/turninfo.js";
import { createTurnInfo } from "../src/data/turninfo.js";
import { createReplacerWatch } from "../src/data/replacerorder.js";

const W1 = "<!-- RISUPOT_WIKI_REFERENCE_START -->", W2 = "<!-- RISUPOT_WIKI_REFERENCE_END -->";
const D1 = "<!-- RISUPOT_DIRECTOR_NOTE_START -->", D2 = "<!-- RISUPOT_DIRECTOR_NOTE_END -->";
const msgs = [
  { role: "system", content: "봇 설정 ".repeat(200) },
  { role: "system", content: `${W1}\n${"위키 ".repeat(50)}\n${W2}\n\n${D1}\n[Dusk 정리 노트 — 저장된 인물 기록]\n${"노트 ".repeat(300)}\n${D2}` },
  { role: "user", content: "안녕 ".repeat(40) },
  { role: "assistant", content: "응답 ".repeat(100) },
  { role: "system", content: "[Dusk Memory — story so far.]\n" + "기억 ".repeat(80) },
  { role: "system", content: "[Dusk · module images]\n" + "img ".repeat(30) },
  { role: "user", content: [{ type: "text", text: "이번 입력" }] },
];

test("입력 내역: 시스템·채팅 기록·장기 기억·인물 위키·정리 노트·모듈 호환을 나눠 세고, 큰 것부터", () => {
  const parts = promptParts(msgs);
  const by = Object.fromEntries(parts.map((p) => [p.label, p.tok]));
  for (const k of ["시스템·봇 설정·로어북", "채팅 기록", "장기 기억", "인물 위키", "정리 노트", "모듈 호환 안내"]) assert.ok(by[k] > 0, k);
  assert.ok(by["정리 노트"] > by["인물 위키"], "위키와 정리 노트를 표식으로 가른다");
  for (let i = 1; i < parts.length; i++) assert.ok(parts[i - 1].tok >= parts[i].tok, "큰 것부터");
  const sum = parts.reduce((a, p) => a + p.tok, 0), all = estimateTokens(msgs.map((m) => typeof m.content === "string" ? m.content : m.content.map((x) => x.text).join("")).join("\n"));
  assert.ok(Math.abs(sum - all) <= all * 0.05 + parts.length * 2, `합이 전체와 거의 같다 (${sum} vs ${all})`);
});
test("입력 내역: 빈 요청·이상한 메시지도 깨지지 않는다", () => {
  assert.deepEqual(promptParts([]), []); assert.deepEqual(promptParts(null), []);
  assert.ok(promptParts([null, { role: "system" }, { role: "user", content: 3 }]).length <= 1);
});
test("호출 블록에 입력 내역 줄이 나오고 이름은 이스케이프", () => {
  const c = callHtml({ aux: false, model: "m", startAt: 0, lastAt: 1000, inTok: 9000, outTok: 10, parts: [{ label: "채팅 기록", tok: 6000 }, { label: "<x>", tok: 3000 }] });
  assert.ok(c.includes("입력 내역") && c.includes("채팅 기록 6k") && c.includes("&lt;x&gt;") && !c.includes("<x>"));
  assert.ok(!callHtml({ aux: false, model: "m", startAt: 0, lastAt: 1, inTok: 1 }).includes("입력 내역"), "내역이 없으면 줄도 없음");
});

const mem = (extra = {}) => { const store = new Map(); return { api: { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) }, getDatabase: async () => ({ aiModel: "test-main", subModel: "test-sub" }), ...extra } }; };
test("메인 요청 기록에 입력 내역이 남아 화면 블록에 보인다", async () => {
  const { api } = mem(); let now = 1000;
  const t = createTurnInfo(api, { chip: false, now: () => now }); await t.start(); await t.setCallShow(true);
  await t.beforeRequest(msgs, "model");
  const resp = "그는 고개를 끄덕였다. 오늘은 여기까지 하자고 말했다."; now = 3000; await t.onOutput(resp); await t.settle();
  const shown = await t.onDisplay(resp);
  assert.ok(shown.includes("입력 내역") && shown.includes("정리 노트") && shown.includes("장기 기억"));
});

test("요청 훅 순서: 다른 beforeRequest가 나중에 붙으면 호출 표시가 맨 뒤로 다시 붙는다", async () => {
  const order = [];
  const raw = { addRisuReplacer: async (type, fn) => { if (type === "beforeRequest") order.push(fn); }, removeRisuReplacer: async (type, fn) => { const i = order.indexOf(fn); if (i >= 0) order.splice(i, 1); } };
  const watch = createReplacerWatch(raw);
  const api = { ...mem().api, addRisuReplacer: watch.add, removeRisuReplacer: (...a) => raw.removeRisuReplacer(...a), addRisuScriptHandler: async () => {} };
  const t = createTurnInfo(api, { chip: false, watchReplacers: watch.onAdded, relastMs: 0 });
  await t.start(); await t.setCallShow(true);
  const memory = async (m) => m;
  await api.addRisuReplacer("beforeRequest", memory);   // 장기 기억 애드온이 늦게 붙음
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(order.at(-1), t.beforeRequest, "호출 표시가 마지막");
  assert.ok(order.includes(memory));
  assert.equal(order.filter((f) => f === t.beforeRequest).length, 1, "두 번 붙지 않는다");
});
