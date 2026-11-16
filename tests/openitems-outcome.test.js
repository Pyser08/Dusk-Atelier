// 2.2.4 열린 항목: 종류 짐작 · 약속 결과(지킴·어김…) · 최근 끝난 약속 줄 · 닫은 응답 리롤 · 오래전에 지킨 약속을 또 하면 새 항목
import test from "node:test";
import assert from "node:assert/strict";
import { parseLines, fromStage1, closeHow } from "../src/engine/memorylines.js";
import { validatePlus, applyOpen, openItems, openLines, openForPrompt, settledLines } from "../src/engine/memoryplus.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { messageIdentity } from "../src/engine/chattext.js";

const msg = (d, id) => ({ role: "char", data: d, chatId: id });
const step = (f, lines, m, at, openIds) => applyOpen(f, validatePlus(fromStage1(parseLines(lines), { known: [], source: "x", openIds })).open, { at, h: messageIdentity(m), mid: m.chatId });

test("종류: 적어 주면 그대로, 없으면 글로 짐작", () => {
  const f = { open: [] }, m = msg("a", "m0");
  step(f, "scene|s|p|t|yes\nopen|민지가 내일 도시락을 싸 오기로 함\nopen|범인은 아직 모른다\nopen|창고 열쇠에 얽힌 사연|foreshadow", m, 0, new Set());
  assert.deepEqual(f.open.map((x) => x.kind), ["promise", "question", "foreshadow"]);
});
test("닫기: 어떻게 끝났는지·이유를 남기고, 최근 끝난 약속 줄에 어긴 것이 먼저", () => {
  const f = { open: [] }, m0 = msg("a", "m0"), m1 = msg("b", "m1");
  step(f, "scene|s|p|t|yes\nopen|민지가 도시락을 싸 오기로 함\nopen|하루가 숙제를 도와주기로 함", m0, 0, new Set());
  const [a, b] = openForPrompt(f).map((x) => x.id);
  assert.deepEqual(step(f, `scene|s|p|t|yes\nclose|${a}|kept|도시락을 건넸다\nclose|${b}|어겼다|약속을 잊었다`, m1, 5, new Set([a, b])), { added: 0, closed: 2 });
  assert.equal(openItems(f).length, 0);
  assert.deepEqual(settledLines(f, { now: 6 }), ["- [broken] 하루가 숙제를 도와주기로 함 — 약속을 잊었다", "- [kept] 민지가 도시락을 싸 오기로 함 — 도시락을 건넸다"]);
  assert.deepEqual(settledLines(f, { now: 200 }), [], "오래전 일은 넣지 않는다");
  // 닫은 응답을 리롤하면 다시 열리고 끝난 약속 줄에서 빠진다
  reconcile(f, [m0, msg("다른 응답", "m9")]);
  assert.equal(openItems(f).length, 2); assert.deepEqual(settledLines(f, { now: 6 }), []);
  assert.equal(openLines(f).length, 2);
});
test("예전 형식(id만)도 닫힌다 · JSON 닫기는 3개까지", () => {
  const f = { open: [{ id: "o1", text: "x", kind: "promise", closed: false, at: 0 }] };
  applyOpen(f, validatePlus({ open: { close: ["o1"] } }).open, { at: 1 });
  assert.equal(f.open[0].closed, true); assert.equal(f.open[0].how, undefined);
  assert.equal(validatePlus({ open: { close: ["a", "b", "c", "d"] } }).open.close.length, 3);
});
test("같은 약속: 금방(20메시지 안)은 중복으로 막고, 오래전에 끝난 것과는 새 항목", () => {
  const f = { open: [] };
  step(f, "scene|s|p|t|yes\nopen|민지가 도시락을 싸 오기로 함", msg("a", "m0"), 0, new Set());
  const id = openForPrompt(f)[0].id;
  step(f, `scene|s|p|t|yes\nclose|${id}|kept`, msg("b", "m1"), 2, new Set([id]));
  assert.equal(step(f, "scene|s|p|t|yes\nopen|민지가 도시락을 싸 오기로 했다", msg("c", "m2"), 10, new Set()).added, 0);
  assert.equal(step(f, "scene|s|p|t|yes\nopen|민지가 도시락을 싸 오기로 했다", msg("d", "m3"), 40, new Set()).added, 1);
  assert.equal(closeHow("지켰다"), "kept"); assert.equal(closeHow("무산"), "cancelled"); assert.equal(closeHow("??"), "");
});
