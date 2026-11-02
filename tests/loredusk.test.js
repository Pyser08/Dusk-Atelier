import test from "node:test";
import assert from "node:assert/strict";
import { applyPlan, batchMessages, batches, dividerName, mergeAnalysis, parseAnalysis, rulePlan, sigOf, summaryText } from "../src/engine/loredusk.js";
import { affOf, folderIdOf, isAff, isPlace, parentOf, ruleOf } from "../src/engine/lorerules.js";

const E = (comment, key = "", content = "내용") => ({ key, secondkey: "", insertorder: 100, comment, content, mode: "normal", alwaysActive: false, selective: false, useRegex: false });
const D = (name) => E(`-- ${name} --`, "", "");
const book = () => [D("게헨나"), E("히나", "히나"), E("이오리", "이오리"), D("트리니티"), E("하나코", "하나코"), E("교실", "교실")];

test("구분선 이름 인식", () => {
  assert.equal(dividerName(D("게헨나")), "게헨나");
  assert.equal(dividerName(E("== 트리니티 ==", "", "")), "트리니티");
  assert.equal(dividerName(E("-- 게헨나 --", "", "내용 있음")), null);
  assert.equal(dividerName(E("히나", "히나", "")), null);
});

test("규칙 기반: 구분선 → 소속, 구성원 묶기", () => {
  const p = rulePlan(book());
  assert.equal(p.affs.length, 2);
  assert.deepEqual(p.affs[0].members, [1, 2]);
  assert.deepEqual(p.affs[1].members, [4, 5]);
});

test("구성원 없는 구분선은 건너뛴다", () => {
  const p = rulePlan([D("빈것"), D("있는것"), E("a", "a")]);
  assert.equal(p.affs.length, 1);
  assert.equal(p.notes.length, 1);
});

test("적용: 소속 폴더 생성·구분선 제거·구성원 연결", () => {
  const src = book();
  const { entries, summary } = applyPlan(src, rulePlan(src));
  assert.equal(entries.length, 6);
  assert.equal(src.length, 6);
  assert.ok(src[0].comment.startsWith("--"), "원본은 그대로");
  const folders = entries.filter(isAff);
  assert.deepEqual(folders.map((f) => f.comment), ["[소속] 게헨나", "[소속] 트리니티"]);
  const hina = entries.find((e) => e.comment === "히나");
  assert.equal(parentOf(hina), folderIdOf(folders[0]));
  assert.equal(summary.affs, 2);
  assert.equal(summary.dividers, 2);
  assert.match(summaryText(summary), /소속 2개/);
});

test("체크 해제한 소속은 적용하지 않는다", () => {
  const src = book();
  const plan = rulePlan(src);
  plan.affs[1].checked = false;
  const { entries } = applyPlan(src, plan);
  assert.equal(entries.filter(isAff).length, 1);
  assert.ok(entries.some((e) => e.comment === "-- 트리니티 --"));
});

test("로어북이 바뀌면 적용을 막는다", () => {
  const src = book();
  const plan = rulePlan(src);
  src.push(E("새로"));
  assert.throws(() => applyPlan(src, plan), /다시 분석/);
  assert.notEqual(sigOf(src), plan.sig);
});

const ai = { affs: [{ name: "게헨나", parent: null, members: [1, 2, 9], def: 60, max: 2, prob: { 1: 100 } }, { name: "선도부", parent: "게헨나", members: [2, 3] }], places: [{ i: 4, links: ["게헨나"] }], newPlaces: [{ name: "정문", keys: "정문, 교문", links: ["게헨나"], content: "학교 정문" }, { name: "교실", keys: "교실", links: [] }], whole: [1, 99], common: [{ i: 3, keys: "하늘", words: "강하늘" }] };

test("AI 답 검증: 범위 밖 번호 제거, 값 보정", () => {
  const src = [E("a"), E("히나", "히나"), E("이오리", "이오리"), E("유우카", "유우카"), E("교실", "교실")];
  const p = parseAnalysis("```json\n" + JSON.stringify(ai) + "\n```", src, [1, 2, 3, 4]);
  assert.deepEqual(p.affs[0].members, [1, 2]);
  assert.equal(p.affs[0].max, 2);
  assert.equal(p.affs[0].prob[1], 100);
  assert.deepEqual(p.whole, [1]);
});

test("AI 병합·적용: 중첩, 장소, 새 장소, 이름 설정", () => {
  const src = [E("a"), E("히나", "히나"), E("이오리", "이오리"), E("유우카", "유우카"), E("교실", "교실")];
  const idx = [1, 2, 3, 4];
  const plan = mergeAnalysis(rulePlan(src), parseAnalysis(JSON.stringify(ai), src, idx), src);
  assert.equal(plan.affs.length, 2);
  assert.equal(plan.affs[1].parent, plan.affs[0].id);
  // 이오리는 게헨나가 먼저 가져갔으므로 선도부엔 유우카만
  assert.deepEqual(plan.affs[1].members, [3]);
  assert.equal(plan.places.length, 2, "기존 '교실'과 이름이 같은 새 장소는 제외");
  const { entries, summary } = applyPlan(src, plan);
  const gh = entries.find((e) => e.comment === "[소속] 게헨나");
  const sd = entries.find((e) => e.comment === "[소속] 선도부");
  assert.equal(affOf(gh).def, 60);
  assert.equal(affOf(gh).max, 2);
  assert.equal(parentOf(sd), folderIdOf(gh));
  const room = entries.find((e) => e.comment.includes("교실"));
  assert.ok(isPlace(room));
  assert.deepEqual(room.extentions.da_place.links, [folderIdOf(gh)]);
  const gate = entries.find((e) => e.comment === "[장소] 정문");
  assert.equal(parentOf(gate), folderIdOf(gh));
  assert.equal(ruleOf(entries.find((e) => e.comment === "히나")).whole, true);
  const yuuka = entries.find((e) => e.comment === "유우카");
  assert.equal(ruleOf(yuuka).common, true);
  assert.equal(ruleOf(yuuka).commonKeys, "하늘");
  const prob = affOf(gh).prob;
  assert.deepEqual(Object.values(prob), [100]);
  assert.equal(summary.newPlaces, 1);
});

test("구분선 소속의 구성원이 AI 소속과 겹치면 구분선 쪽 유지", () => {
  const src = book();
  const plan = rulePlan(src);
  mergeAnalysis(plan, parseAnalysis(JSON.stringify({ affs: [{ name: "트리니티", members: [1, 4] }] }), src, [1, 2, 4, 5]), src);
  assert.deepEqual(plan.affs[1].members, [4, 5]);
  assert.ok(plan.notes.some((n) => n.includes("히나")));
});

test("묶음 나누기·프롬프트", () => {
  const src = Array.from({ length: 250 }, (_, i) => E("c" + i, "k" + i));
  const bs = batches(src, 120);
  assert.equal(bs.length, 3);
  const m = batchMessages(src, { affs: [] }, bs[0], { instruction: "학원물" });
  assert.match(m[1].content, /학원물/);
  assert.match(m[1].content, /^|0 \| c0/m);
});

test("순환 부모는 막는다", () => {
  const src = [E("a"), E("b")];
  const plan = mergeAnalysis({ sig: sigOf(src), affs: [], places: [], flags: [], notes: [] }, { affs: [{ name: "X", parent: "Y", members: [0], def: 100, max: "", prob: {} }, { name: "Y", parent: "X", members: [1], def: 100, max: "", prob: {} }], places: [], newPlaces: [], whole: [], common: [] }, src);
  const x = plan.affs[0], y = plan.affs[1];
  assert.ok(!(x.parent === y.id && y.parent === x.id));
});

import { referenceText, batchMessages as _bm, rulePlan as _rp } from "../src/engine/loredusk.js";
test("참고 글: 정규식·트리거·배경을 줄여 담고, 프롬프트에 참고로 얹힌다", () => {
  const ref = referenceText({ regex: [{ comment: "말줄임", type: "editdisplay", in: "\\.\\.\\.", out: "…" }, { comment: "끔", type: "disabled", in: "x", out: "y" }], trigger: [{ comment: "턴", type: "start", effect: [{ type: "setvar" }] }], background: "<style>.a{}</style>" });
  assert.match(ref, /말줄임/); assert.doesNotMatch(ref, /끔/); assert.match(ref, /setvar/); assert.match(ref, /style/);
  assert.equal(referenceText({}), "");
  const entries = [{ comment: "a", key: "k", content: "c" }];
  const m = _bm(entries, _rp(entries), [0], { reference: ref });
  assert.match(m[1].content, /Reference \(read only\)/);
  assert.doesNotMatch(_bm(entries, _rp(entries), [0])[1].content, /Reference/);
});

test("참고 글: 설명·성격·변수 등 기본 설정도 담고, 전체 길이를 제한한다", () => {
  const ref = referenceText({ fields: { desc: "다정한 선생님", personality: "차분함", defaultVariables: "affinity=0" }, regex: [{ comment: "이름만", type: "editdisplay" }] });
  assert.match(ref, /다정한 선생님/); assert.match(ref, /affinity=0/); assert.match(ref, /이름만/);
  assert.ok(referenceText({ fields: { desc: "가".repeat(5000) }, background: "x".repeat(9000), max: 500 }).length <= 500);
});
