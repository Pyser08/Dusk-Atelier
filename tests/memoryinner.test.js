import test from "node:test";
import assert from "node:assert/strict";
import { validate, SYSTEM_PROMPT, buildMessages } from "../src/engine/memoryprompt.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { applyEmo, undoConversion } from "../src/engine/memoryemo.js";
import { hashText } from "../src/engine/chattext.js";
import { validateSelf, validateInner, applyPov, applyExp, hintsForPrompt, expKey, takeSelf } from "../src/engine/memoryinner.js";

const A = (at) => ({ at, mid: "m" + at, h: "h" + at });
const P = (act, extra = {}, s = 3) => ({ name: "미나", act, p: 3, s, r: 2, ...extra });
const SELF = { feel: "화가 났다", cause: "사실은 버려질까 두려워서", ic: "M" };
const base = () => ({ people: {}, scenes: [], runs: 0 });

test("검증 7-2: 두 칸이 달라야 하고 해석확실성이 필수다", () => {
  assert.deepEqual(validateSelf(SELF), { feel: "화가 났다", cause: "사실은 버려질까 두려워서", ic: "M" });
  assert.equal(validateSelf({ ...SELF, ic: "" }), undefined);
  assert.equal(validateSelf({ feel: "같음", cause: "같음", ic: "H" }), undefined);
  assert.equal(validateSelf({ feel: "", cause: "x", ic: "H" }), undefined);
  assert.equal(validate({ people: [P("행동", { self: SELF })] }).people[0].self.ic, "M");
  assert.equal(validate({ people: [P("행동", { self: { ...SELF, ic: "" } })] }).people[0].self, undefined);
});
test("검증 7-1: 서로 다른 두 인물이 서로 다르게 볼 때만", () => {
  const ok = validateInner({ pov: [{ who: "미나", view: "배신감", why: "정보 차이" }, { who: "하루", view: "당연한 선택" }, { who: "셋째", view: "x" }] });
  assert.equal(ok.pov.length, 2); assert.equal(ok.pov[0].why, "정보 차이");
  assert.deepEqual(validateInner({ pov: [{ who: "미나", view: "같다" }, { who: "하루", view: "같다" }] }).pov, []);
  assert.deepEqual(validateInner({ pov: [{ who: "미나", view: "혼자" }] }).pov, []);
  assert.deepEqual(validateInner({ pov: [{ who: "미나", view: "a1" }, { who: "미나", view: "b2" }] }).pov, []);
});
test("검증 7-3: 어긋남은 기대가 실제로 다를 때만, 위반 인식은 어긋남일 때만", () => {
  const e = (o) => validateInner({ exp: [{ a: "미나", b: "하루", ae: "도와줄 것", be: "혼자 두기", as: false, bs: true, gap: true, viol: "도움 거절", ...o }] }).exp[0];
  assert.deepEqual([e().gap, e().viol, e().as, e().bs], [true, "도움 거절", false, true]);
  assert.equal(e({ gap: false }).viol, undefined);
  assert.equal(e({ be: "도와줄 것" }).gap, false);
  assert.equal(e({ ae: "" }), undefined);
  assert.deepEqual(validateInner({}), { pov: [], exp: [] });
});
test("프롬프트: 3단계 규칙은 '중요한 상황에만' 지침과 함께 들어 있고 기준표는 1회", () => {
  assert.ok(SYSTEM_PROMPT.includes("Important moments only")); assert.ok(SYSTEM_PROMPT.includes('"pov"')); assert.ok(SYSTEM_PROMPT.includes('"exp"'));
  assert.equal((SYSTEM_PROMPT.match(/H = directly stated/g) ?? []).length, 1);
  assert.equal(JSON.parse(buildMessages({ bot: "b", newest: { index: 1, text: "t" } })[1].content).selfHint, undefined);
});
test("반영: 중요한 응답(새 장면 또는 B 이상)에서만 3단계 필드를 받는다", () => {
  const f = base();
  const pov = [{ who: "미나", view: "배신감" }, { who: "하루", view: "당연한 선택" }], exp = [{ a: "미나", b: "하루", ae: "도움", be: "거리", as: false, bs: true, gap: true, viol: "도움 거절" }];
  const r1 = applyAnalysis(f, { people: [P("작은 일", { self: SELF, p: 0, r: 0 }, 1)], scene: { sum: "카페", changed: true, facts: [], who: [] }, pov, exp }, A(1), { now: 1 });
  assert.equal(r1.pov, 2, "새 장면이면 중요"); assert.equal(f.scenes[0].pov.length, 2);
  assert.equal(r1.records, 0, "점수가 낮은 행동은 기록되지 않음");
  const f2 = base();
  applyAnalysis(f2, { people: [], scene: { sum: "카페", changed: true, facts: [], who: [] } }, A(1), { now: 1 });
  const r2 = applyAnalysis(f2, { people: [P("사소", { self: SELF }, 0)], scene: { sum: "카페", changed: false, facts: [], who: [] }, pov, exp }, A(2), { now: 2 });
  assert.equal(r2.pov, 0); assert.equal(r2.exp, 0); assert.equal(Object.keys(f2.exp ?? {}).length, 0);
  const r3 = applyAnalysis(f2, { people: [P("큰 사건이 벌어짐", { self: SELF }, 3)], scene: { sum: "카페", changed: false, facts: [], who: [] }, pov, exp }, A(3), { now: 3 });
  assert.equal(r3.self, 1); assert.equal(r3.pov, 2); assert.equal(r3.exp, 1);
  assert.equal(f2.people["미나"].records.at(-1).self.ic, "M");
});
test("7-1 병합: 같은 인물은 달라졌을 때만 갱신, 잠금은 유지", () => {
  const sc = {};
  assert.equal(applyPov(sc, [{ who: "미나", view: "a1" }, { who: "하루", view: "b1" }], 1), 2);
  assert.equal(applyPov(sc, [{ who: "미나", view: "a1" }], 2), 0);
  assert.equal(applyPov(sc, [{ who: "미나", view: "a2", why: "새 사실" }], 3), 1); assert.equal(sc.pov[0].view, "a2");
  sc.pov[1].lock = true; assert.equal(applyPov(sc, [{ who: "하루", view: "b2" }], 4), 0); assert.equal(sc.pov[1].view, "b1");
});
test("7-2: 중요하지 않은 기록·잠긴 기록·같은 값은 받지 않는다", () => {
  assert.equal(takeSelf({ g: "C" }, SELF), false);
  const r = { g: "A" }; assert.equal(takeSelf(r, SELF), true); assert.equal(takeSelf(r, SELF), false);
  assert.equal(takeSelf(r, { ...SELF, ic: "L" }), true);
  r.lock = { self: true }; assert.equal(takeSelf(r, { ...SELF, feel: "다름" }), false);
});
test("7-3 병합: 같은 값은 건드리지 않고, 바뀌면 이전 값 1개를 보존하며 출처가 사라지면 되돌린다", () => {
  const f = base(), e = (ae, gap = true) => ({ a: "미나", b: "하루", ae, be: "거리", as: false, bs: true, gap, viol: gap ? "거절" : undefined });
  assert.equal(applyExp(f, [e("도움")], A(1), 1), 1);
  assert.equal(applyExp(f, [e("도움")], A(2), 2), 0);
  const k = expKey("하루", "미나"); assert.equal(Object.keys(f.exp)[0], k, "순서 없는 쌍");
  assert.equal(applyExp(f, [e("위로")], { at: 5, mid: "gone", h: "gone" }, 3), 1);
  assert.equal(f.exp[k].prev.ae, "도움"); assert.equal(f.exp[k].log.length, 2);
  const msgs = [{ role: "char", data: "첫", chatId: "m1" }];
  f.exp[k].prev.src = { chatId: "m1", hash: hashText("첫"), at: 0 };
  reconcile(f, msgs);
  assert.equal(f.exp[k].ae, "도움"); assert.equal(f.exp[k].log.length, 1);
  f.exp[k].src = { chatId: "gone", hash: "gone", at: 3 }; delete f.exp[k].prev;
  reconcile(f, msgs); assert.equal(f.exp[k], undefined);
});
test("7-4: 감정이 새로 어긋나면 쪽지를 남기고, 자기 해석이 기록되거나 3번 지나면 지운다", () => {
  const f = base();
  applyAnalysis(f, { people: [], scene: null, emo: [{ from: "미나", to: "하루", t: { affection: 3, hostility: 3 }, why: "x" }] }, A(1), { now: 1 });
  assert.equal(hintsForPrompt(f).length, 0, "아직 어긋나지 않음");
  applyAnalysis(f, { people: [], scene: null, emo: [{ from: "미나", to: "하루", t: { affection: 3, hostility: 2 }, why: "x" }] }, A(2), { now: 2 });
  applyAnalysis(f, { people: [], scene: null, emo: [{ from: "미나", to: "하루", t: { affection: 3 }, why: "x" }] }, A(3), { now: 3 });
  assert.equal(f.hints.length, 1); assert.equal(hintsForPrompt(f)[0].person, "미나");
  applyAnalysis(f, { people: [P("큰 사건이 벌어짐", { self: SELF }, 3)], scene: null }, A(4), { now: 4 });
  assert.equal(f.hints.length, 0, "자기 해석이 기록되면 쪽지 삭제");
  const g = base();
  applyAnalysis(g, { people: [], scene: null, emo: [{ from: "미나", to: "하루", t: { affection: 3, hostility: 3 }, why: "x" }] }, A(1));
  applyAnalysis(g, { people: [], scene: null, emo: [{ from: "미나", to: "하루", t: { affection: 3, hostility: 2 }, why: "x" }] }, A(2));
  assert.equal(g.hints.length, 1);
  for (let i = 3; i < 8; i++) applyAnalysis(g, { people: [], scene: null }, A(i));
  assert.equal(g.hints.length, 0, "3번 분석이 지나면 만료");
});
test("호감도 변환 자동 연결: 위키가 있으면 처음 한 번 변환하고, 되돌린 뒤엔 다시 하지 않는다", () => {
  const f = { ...base(), wiki: { documents: { d1: { type: "Character", title: "미나", metrics: [{ slotId: "affinity.score", value: 50, minimum: 0, maximum: 100 }] } } } };
  applyAnalysis(f, { people: [], scene: null }, A(1), { now: 1 });
  assert.equal(f.emo["미나>{{user}}"].tags.affection, 5);
  undoConversion(f);
  applyAnalysis(f, { people: [], scene: null }, A(2), { now: 2 });
  assert.equal(f.emo["미나>{{user}}"].tags.affection, undefined);
  assert.equal(f.emoConvOff, true);
});
test("주입: 관점·자기 해석·기대 불일치는 줄로 들어가고 stage3 꺼짐이면 빠진다", () => {
  const f = { scenes: [{ id: "s1", sum: "다툼", who: ["미나", "하루"], orphan: false, pov: [{ who: "미나", view: "배신감" }, { who: "하루", view: "당연한 선택", why: "정보 차이" }] }],
    exp: { [expKey("미나", "하루")]: { a: "미나", b: "하루", ae: "도움", be: "거리", as: false, bs: true, gap: true, viol: "도움 거절", at_ms: 1 } },
    people: { 미나: { name: "미나", aliases: [], records: [{ id: "a", at: 1, act: "소리침", g: "A", orphan: false, self: SELF }] } } };
  const t = buildBlock(f, { messageCount: 60, settings: { recentSkip: 0 } }).text;
  assert.ok(t.includes("미나: 배신감 / 하루: 당연한 선택 (why they differ: 정보 차이)"));
  assert.ok(t.includes('미나 feels "화가 났다"; likely real reason (inferred, M): 사실은 버려질까 두려워서'));
  assert.ok(t.includes("미나 expects 도움 (unsaid); 하루 expects 거리 (said) — 도움 거절"));
  const off = buildBlock(f, { messageCount: 60, settings: { recentSkip: 0, stage3: false } }).text;
  assert.ok(!off.includes("Perspectives") && !off.includes("Inner states") && !off.includes("Expectation gaps"));
});
test("호환: 3단계 필드가 없는 구버전 폴더·결과도 그대로 동작한다", () => {
  const f = base();
  const r = applyAnalysis(f, { people: [{ name: "미나", act: "행동", p: 3, s: 3, r: 2, know: [] }], scene: null }, A(1));
  assert.deepEqual([r.pov, r.exp, r.self], [0, 0, 0]);
  assert.equal(f.hints.length, 0); assert.doesNotThrow(() => reconcile(f, []));
});
