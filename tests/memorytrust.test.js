import test from "node:test";
import assert from "node:assert/strict";
import { validate, SYSTEM_PROMPT } from "../src/engine/memoryprompt.js";
import { applyAnalysis, knownPeople } from "../src/engine/memoryapply.js";
import { reinforce } from "../src/engine/memoryplus.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { hashText } from "../src/engine/chattext.js";
import { validateTrust, effRank, setValid, setLock, resolveConflicts, classify, addSource } from "../src/engine/memorytrust.js";

const base = () => ({ people: {}, scenes: [], runs: 0 });
const ent = (act, extra = {}) => ({ name: "미나", act, p: 3, s: 3, r: 2, ...extra });
const run = (f, people, at, extra = {}) => applyAnalysis(f, { people: validate({ people }).people, scene: null }, { at, mid: "m" + at, h: "h" + at + (extra.hs ?? "") }, { now: 1000 + at });
const A = (c, k, v, o = {}) => ({ attr: { c, k, v, ...o } });
const recs = (f) => f.people["미나"].records;

test("검증: 구분·확신도·속성을 정리하고 잘못된 값은 조용히 버린다", () => {
  const v = validateTrust({ kd: "fact", fc: "높음", ic: "H", attr: { c: "pref", k: "매운 음식", v: "싫어함", tm: "past" }, pat: "p".repeat(80), mean: "의미" });
  assert.equal(v.kd, "f"); assert.equal(v.fc, "H");
  assert.equal(v.ic, undefined, "해석확실성은 추론일 때만");
  assert.equal(v.mean, undefined, "의미는 추론+해석확실성이 있을 때만");
  assert.equal(v.attr.tm, "past"); assert.equal(v.pat.length, 40);
  const w = validateTrust({ kd: "i", fc: "M", ic: "low", mean: "불안해 보임", attr: { c: "x", k: "k", v: "v" } });
  assert.deepEqual([w.kd, w.fc, w.ic, w.mean, w.attr], ["i", "M", "L", "불안해 보임", undefined]);
  assert.deepEqual(validateTrust({}), {});
  assert.equal(validate({ people: [ent("행동", { kd: "i", fc: "M", ic: "M" })] }).people[0].ic, "M");
});
test("프롬프트: 기준표는 한 번만 들어 있다", () => {
  assert.equal((SYSTEM_PROMPT.match(/H = directly stated/g) ?? []).length, 1);
});
test("충돌: 시간이 지난 새 발언은 변화 — 옛 기록은 보존하고 현재 적용만 끝낸다", () => {
  const f = base();
  run(f, [ent("매운 음식을 싫어한다고 말함", { fc: "H", ...A("pref", "매운 음식", "싫어함") })], 3);
  const r = run(f, [ent("매운 음식을 즐겨 먹기 시작함", { fc: "H", ...A("pref", "매운 음식", "좋아함") })], 9);
  const [o, n] = recs(f);
  assert.equal(r.conflicts[0].kind, "change");
  assert.equal(o.valid, false); assert.equal(o.inv.why, "newer"); assert.equal(o.inv.by, n.id);
  assert.equal(n.valid, undefined); assert.equal(n.prev.act, o.act); assert.equal(n.hist.length, 1);
  assert.ok(recs(f).includes(o), "옛 기록은 지워지지 않는다");
});
test("충돌: 조건이 다르면 둘 다 유지(조건부)", () => {
  const f = base();
  run(f, [ent("집에서는 조용함", { fc: "H", ...A("pref", "말수", "적음", { cond: "집" }) })], 2);
  const r = run(f, [ent("친구들 앞에서는 수다스러움", { fc: "H", ...A("pref", "말수", "많음", { cond: "친구와 있을 때" }) })], 8);
  assert.equal(r.conflicts[0].kind, "conditional");
  assert.ok(recs(f).every((x) => x.valid !== false));
});
test("충돌: 과거였다는 말은 현재 기록을 끝내지 않고 과거 사실로만 저장", () => {
  const f = base();
  run(f, [ent("지금은 도시에 산다", { fc: "H", ...A("home", "거주지", "도시") })], 2);
  const r = run(f, [ent("예전엔 시골에 살았다고 회상함", { fc: "H", ...A("home", "거주지", "시골", { tm: "past" }) })], 6);
  const [a, b] = recs(f);
  assert.equal(r.conflicts[0].kind, "history");
  assert.equal(a.valid, undefined); assert.equal(b.valid, false); assert.equal(b.inv.why, "past");
});
test("충돌: 같은 시점의 모순 후보는 확신도로, 같거나 모르면 보류", () => {
  const f = base();
  run(f, [ent("직업이 의사라고 추정됨", { kd: "i", fc: "M", ic: "L", ...A("job", "직업", "의사") })], 4);
  const r = run(f, [ent("스스로 교사라고 밝힘", { kd: "f", fc: "H", ...A("job", "직업", "교사") })], 4, { hs: "b" });
  assert.equal(r.conflicts[0].kind, "contradiction-adopt");
  assert.equal(recs(f)[0].valid, false); assert.equal(recs(f)[0].inv.why, "contradiction");
  const g = base();
  run(g, [ent("무직이라 함", { fc: "M", ...A("job", "직업", "무직") })], 4);
  const r2 = run(g, [ent("회사원이라 함", { fc: "M", ...A("job", "직업", "회사원") })], 4, { hs: "b" });
  assert.equal(r2.conflicts[0].kind, "hold");
  assert.ok(recs(g).every((x) => x.valid !== false && x.hold));
  const h = base();
  run(h, [ent("신앙이 깊다고 밝힘", { fc: "H", ...A("belief", "종교", "믿음") })], 4);
  run(h, [ent("무신론자로 보임", { kd: "i", fc: "L", ic: "L", ...A("belief", "종교", "무신론") })], 4, { hs: "b" });
  assert.equal(recs(h)[1].valid, false, "낮은 쪽은 현재 적용에서 제외");
  assert.equal(recs(h)[0].valid, undefined);
});
test("충돌: 약한 추론이 확실한 기록을 시간 경과만으로 끝내지 못한다", () => {
  const f = base();
  run(f, [ent("애인과 사귄다고 밝힘", { fc: "H", ...A("rel", "연애→하루", "연인") })], 2);
  const r = run(f, [ent("헤어진 듯 보임", { kd: "i", fc: "L", ic: "L", ...A("rel", "연애→하루", "남남") })], 9);
  assert.equal(r.conflicts[0].kind, "hold");
  assert.equal(recs(f)[0].valid, undefined);
});
test("잠금: 사용자가 잠근 기록은 덮어쓰지 않고 알림만 남긴다. 사용자 확신도는 객관 근거로 치지 않는다", () => {
  const f = base();
  run(f, [ent("매운 음식을 싫어함", { fc: "L", ...A("pref", "매운 음식", "싫어함") })], 2);
  setValid(recs(f)[0], true);
  const r = run(f, [ent("매운 음식을 좋아하게 됨", { fc: "H", ...A("pref", "매운 음식", "좋아함") })], 9);
  assert.equal(recs(f)[0].valid, undefined); assert.equal(r.alerts.length, 1); assert.equal(f.alerts.length, 1);
  assert.equal(recs(f)[0].hold, recs(f)[1].id);
  const x = { fc: "H", lock: { fc: true } }; assert.equal(effRank(x), undefined);
  assert.equal(effRank({ fc: "H", kd: "i", ic: "M" }), 2);
});
test("사용자 종료/복구: 이유 'user' 기록, 복구하면 종료 정보를 지운다", () => {
  const r = { id: "r1", act: "x" };
  setValid(r, false, 5); assert.equal(r.valid, false); assert.equal(r.inv.why, "user"); assert.ok(r.lock.valid);
  setValid(r, true); assert.equal(r.valid, undefined); assert.equal(r.inv, undefined);
  setLock(r, "fc"); assert.ok(r.lock.fc); setLock(r, "fc", false); setLock(r, "valid", false); assert.equal(r.lock, undefined);
});
test("병합: 같은 기록이 다시 나오면 불변 필드는 비었을 때만 채우고 잠금은 지킨다", () => {
  const f = base();
  run(f, [ent("미나가 하루를 도와줌")], 2);
  const r0 = recs(f)[0]; assert.equal(r0.fc, undefined);
  run(f, [ent("미나가 하루를 도와줌", { kd: "f", fc: "H", pat: "도움을 자주 줌" })], 5);
  assert.equal(recs(f).length, 1); assert.equal(r0.fc, "H"); assert.equal(r0.pat, "도움을 자주 줌");
  run(f, [ent("미나가 하루를 도와줌", { kd: "f", fc: "L" })], 7);
  assert.equal(r0.fc, "H", "불변 필드는 처음 값 유지");
  setLock(r0, "pat"); run(f, [ent("미나가 하루를 도와줌", { pat: "다른 패턴" })], 9);
  assert.equal(r0.pat, "도움을 자주 줌");
});
test("횟수: 같은 응답을 다시 분석하거나 같은 자리를 고쳐 쓰면 늘지 않는다", () => {
  const r = { id: "r1", at: 3, mid: "m3", h: "h3", act: "x", m: 1 };
  assert.equal(addSource(r, { at: 3, mid: "m3", h: "h3" }), false); assert.equal(r.m, 1);
  reinforce(r, { at: 3, mid: "m3", h: "h3-reroll" }); assert.equal(r.m, 1, "같은 메시지 id의 재생성");
  reinforce(r, { at: 8, mid: "m8", h: "h8" }); assert.equal(r.m, 2);
  reinforce(r, { at: 8, mid: "m8", h: "h8" }); assert.equal(r.m, 2);
  const legacy = { id: "r2", at: 1, mid: "a", h: "ha", act: "y", m: 3 };  // 구버전: 이전 횟수 보존
  reinforce(legacy, { at: 6, mid: "b", h: "hb" }); assert.equal(legacy.m, 4);
});
test("정합성: 사라진 응답의 출처는 횟수에서 빠진다", () => {
  const msg = (t, id) => ({ role: "char", data: t, chatId: id });
  const msgs = [msg("첫 응답", "m0"), msg("두 번째 응답", "m1")];
  const rec = { id: "r1", at: 0, mid: "m0", h: hashText("첫 응답"), act: "x", m: 2, hs: [{ chatId: "m0", hash: hashText("첫 응답"), at: 0 }, { chatId: "m9", hash: "gone", at: 5 }] };
  const f = { people: { a: { name: "a", records: [rec] } }, scenes: [] };
  reconcile(f, msgs);
  assert.equal(rec.hs.length, 1); assert.equal(rec.m, 1);
});
test("주입: 종료된 기록은 빼고, 추론·불확실·보류·이전 값을 짧게 표시한다", () => {
  const f = { scenes: [{ id: "s1", sum: "장면", facts: [], who: ["미나"], orphan: false }], people: { 미나: { name: "미나", aliases: [], records: [
    { id: "a", at: 1, act: "옛 취향", g: "B", valid: false },
    { id: "b", at: 2, act: "새 취향", g: "B", kd: "i", fc: "L", prev: { act: "옛 취향", v: "x" } },
    { id: "c", at: 3, act: "평범한 일", g: "B", fc: "H" }
  ] } } };
  const t = buildBlock(f, { messageCount: 60, settings: { recentSkip: 0 } }).text;
  assert.ok(!/\(B\) 옛 취향(?! \])/.test(t.replace("(was: 옛 취향)", "")), "종료 기록은 따로 나오지 않는다");
  assert.ok(t.includes("새 취향 [inferred, uncertain] (was: 옛 취향)"));
  assert.ok(t.includes("평범한 일") && !t.includes("평범한 일 ["));
});
test("known: 현재 적용되는 속성 키를 모델에 넘긴다(없으면 생략)", () => {
  const f = base();
  run(f, [ent("매운 음식을 싫어함", { fc: "H", ...A("pref", "매운 음식", "싫어함") })], 2);
  run(f, [{ name: "하루", act: "인사함", p: 3, s: 3, r: 2 }], 3);
  const k = knownPeople(f);
  assert.deepEqual(k.find((x) => x.name === "미나").attrs, [{ c: "pref", k: "매운 음식", v: "싫어함" }]);
  assert.equal(k.find((x) => x.name === "하루").attrs, undefined);
});
test("호환: 신뢰 필드가 없는 구버전 기록·분석 결과는 그대로 동작한다", () => {
  const f = base();
  const r = applyAnalysis(f, { people: [{ name: "미나", act: "구버전 행동", p: 3, s: 3, r: 2, know: [] }], scene: null }, { at: 1, h: "x" });
  assert.equal(r.records, 1); assert.deepEqual(r.conflicts, []);
  const rec = recs(f)[0]; assert.equal(rec.kd, undefined); assert.equal(rec.valid, undefined);
  assert.equal(classify({ attr: { c: "pref", k: "k", v: "a" }, at: 1 }, { attr: { c: "pref", k: "k", v: "b" }, at: 2 }), "change");
  assert.deepEqual(resolveConflicts([], { id: "n", act: "a" }), { verdicts: [], alerts: [] });
});
