import test from "node:test";
import assert from "node:assert/strict";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { validate } from "../src/engine/memoryprompt.js";
import { hashText } from "../src/engine/chattext.js";
import { locate, editTarget, setAct } from "../src/engine/memoryedit.js";

// v1.7.0에서 쌓인 모양(새 필드 없음) 그대로
const old = () => ({
  people: { 미나: { name: "미나", aliases: [], pinned: false, records: [
    { id: "r1", at: 0, mid: "m0", h: hashText("첫 응답"), act: "하루를 도와줌", g: "B", m: 3, lm: 8, orphan: false, pin: true, user: false, at_ms: 1 },
    { id: "r2", at: 1, mid: "m1", h: hashText("둘째 응답"), act: "비밀을 털어놓음", g: "S", orphan: false, know: ["하루"], user: true, at_ms: 2 }] } },
  scenes: [{ id: "s1", at: 0, mid: "m0", h: hashText("첫 응답"), sum: "카페에서 만남", place: "카페", facts: [], who: ["미나"], orphan: false }],
  rels: { "미나>하루": { from: "미나", to: "하루", items: [{ d: "가까워짐", dir: "+", at: 0, at_ms: 1 }] } }, open: [{ id: "o1", text: "약속", kind: "promise", who: [], closed: false, at: 0, at_ms: 1 }], runs: 4, done: []
});
const msgs = [{ role: "char", data: "첫 응답", chatId: "m0" }, { role: "char", data: "둘째 응답", chatId: "m1" }];

test("구버전 기억: 정합성 정리·주입이 새 필드 없이도 그대로 동작한다", () => {
  const f = old(); assert.equal(reconcile(f, msgs), 0);
  const b = buildBlock(f, { messageCount: 60, recentText: "카페", settings: { recentSkip: 0 }, messages: msgs });
  assert.ok(b.text.includes("하루를 도와줌") && b.text.includes("비밀을 털어놓음") && !/\[(inferred|uncertain|disputed)/.test(b.text));
  assert.ok(b.manifest.tokens > 0);
});
test("구버전 기록은 다시 나올 때만 새 필드를 채우고, 그 외는 건드리지 않는다", () => {
  const f = old(), before = JSON.stringify(f.people.미나.records[1]);
  const r = applyAnalysis(f, validate({ people: [{ name: "미나", act: "하루를 도와줌", p: 3, s: 3, r: 2, kd: "f", fc: "H" }], emo: [{ from: "미나", to: "하루", t: { trust: 2 }, why: "도움" }] }), { at: 5, mid: "m5", h: "h5" });
  const r1 = locate(f, { kind: "rec", pk: "미나", id: "r1" });
  assert.equal(r.records, 0); assert.equal(r1.fc, "H"); assert.equal(r1.kd, "f");
  assert.equal(r1.m, 4, "이전 횟수 3에 새 출처 1이 더해진다(m0로 보존)"); assert.equal(r1.pin, true);
  assert.equal(JSON.stringify(f.people.미나.records[1]), before, "다시 나오지 않은 기록은 그대로");
  assert.deepEqual(f.rels, old().rels); assert.deepEqual(f.open, old().open);
});
test("구버전 기록을 편집해도 새 필드만 잠기고 기존 값은 보존된다", () => {
  const f = old();
  assert.ok(editTarget(f, { kind: "rec", pk: "미나", id: "r1" }, (r) => setAct(r, "고친 본문")).ok);
  const r1 = locate(f, { kind: "rec", pk: "미나", id: "r1" });
  assert.equal(r1.act, "고친 본문"); assert.equal(r1.g, "B"); assert.equal(r1.m, 3); assert.deepEqual(r1.lock, { act: true });
});
test("재분석(같은 응답)은 구버전 기록의 횟수를 늘리지 않는다", () => {
  const f = old();
  applyAnalysis(f, validate({ people: [{ name: "미나", act: "하루를 도와줌", p: 3, s: 3, r: 2 }] }), { at: 0, mid: "m0", h: hashText("첫 응답") });
  assert.equal(locate(f, { kind: "rec", pk: "미나", id: "r1" }).m, 3);
});
