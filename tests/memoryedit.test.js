import test from "node:test";
import assert from "node:assert/strict";
import { locate, editTarget, undoLast, setAct, setKind, setConf, setRecValid, setRecKeys, setText, setSelf, addRecord, setPov, setExp, addExp, deleteExp, trustBadges, setTag } from "../src/engine/memoryedit.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { validate } from "../src/engine/memoryprompt.js";

const mk = () => ({ people: { 미나: { name: "미나", aliases: [], records: [{ id: "r1", at: 1, h: "h1", act: "원래 행동", g: "B", orphan: false }] } }, scenes: [{ id: "s1", sum: "장면", place: "카페", orphan: false }], emo: {}, exp: {} });
const L = { kind: "rec", pk: "미나", id: "r1" };

test("편집: 고친 필드만 잠기고 직전 1건을 되돌릴 수 있다", () => {
  const f = mk();
  assert.equal(editTarget(f, L, (r) => setAct(r, "고친 행동"), "본문").ok, true);
  const r = locate(f, L); assert.equal(r.act, "고친 행동"); assert.ok(r.lock.act && r.user);
  assert.deepEqual(Object.keys(r.lock), ["act"]);
  assert.equal(undoLast(f).ok, true); assert.equal(locate(f, L).act, "원래 행동"); assert.equal(locate(f, L).lock, undefined);
  assert.equal(undoLast(f).ok, false);
  editTarget(f, L, (x) => setConf(x, "fc", "H")); editTarget(f, L, (x) => setConf(x, "fc", "L"));
  undoLast(f); assert.equal(locate(f, L).fc, "H", "직전 1건만");
});
test("편집: 대상이 그 사이 사라졌으면 조용히 덮지 않고 실패를 알린다", () => {
  const f = mk(); f.people.미나.records = [];
  const r = editTarget(f, L, (x) => setAct(x, "x")); assert.equal(r.ok, false); assert.ok(r.why); assert.equal(f.undo, undefined);
});
test("확신도·구분·유효: 사용자지정은 잠기고 표시되며, 추론이 아니면 해석확실성을 못 정한다", () => {
  const f = mk(), r = locate(f, L);
  setConf(r, "ic", "H"); assert.equal(r.ic, undefined);
  setKind(r, "i"); setConf(r, "fc", "H"); setConf(r, "ic", "L");
  assert.deepEqual(trustBadges(r).map((b) => b.text), ["추론", "사실 높음·사용자지정", "해석 낮음·사용자지정"]);
  setKind(r, "f"); assert.equal(r.ic, undefined); assert.ok(!r.lock.ic);
  setConf(r, "fc", null); assert.equal(r.fc, undefined); assert.ok(!r.lock.fc);
  setRecValid(r, false); assert.equal(r.valid, false); assert.ok(trustBadges(r)[0].text.includes("사용자 수정"));
  setRecValid(r, true); assert.equal(r.valid, undefined);
});
test("자동 갱신은 사용자가 잠근 필드를 덮지 않는다(편집기→분석 순서)", () => {
  const f = { ...mk(), runs: 0 };
  const r = locate(f, L); r.act = "같은 행동을 다시 기록함"; setConf(r, "fc", "L"); setText(r, "pat", "내가 정한 패턴");
  applyAnalysis(f, { people: validate({ people: [{ name: "미나", act: "같은 행동을 다시 기록함", p: 3, s: 3, r: 2, fc: "H", pat: "새 패턴" }] }).people, scene: null }, { at: 9, mid: "m9", h: "h9" });
  assert.equal(r.fc, "L"); assert.equal(r.pat, "내가 정한 패턴");
});
test("키·패턴·의미·자기 해석: 비우면 지우고 잠금도 푼다", () => {
  const r = locate(mk(), L);
  setRecKeys(r, ["은방울꽃", "a", "은방울꽃", "편지"]); assert.deepEqual(r.keys, ["은방울꽃", "편지"]); assert.ok(r.lock.keys);
  setRecKeys(r, []); assert.equal(r.keys, undefined); assert.ok(!r.lock?.keys);
  setText(r, "mean", "불안해서일 듯"); assert.ok(r.est); setText(r, "mean", ""); assert.equal(r.est, undefined);
  setSelf(r, { feel: "화남", cause: "두려움", ic: "높음" }); assert.equal(r.self.ic, "H"); setSelf(r, { feel: "", cause: "" }); assert.equal(r.self, undefined);
});
test("기록 추가: 사용자 기록으로 만들어지고 잠긴다", () => {
  const f = mk(); const a = addRecord(f, "하루", "직접 적은 일", "A"); assert.equal(f.people[a.pk].records[0].user, true);
  assert.equal(addRecord(f, "미나", "또 다른 일").pk, "미나"); assert.equal(f.people.미나.records.length, 2);
  assert.equal(addRecord(f, "", "x"), null);
});
test("장면 관점·기대 불일치·감정: 직접 고친 값은 잠긴다", () => {
  const f = mk(), sc = f.scenes[0];
  setPov(sc, [{ who: "미나", view: "배신감" }, { who: "하루", view: "당연함", why: "정보 차이" }]); assert.equal(sc.pov.length, 2); assert.ok(sc.pov.every((x) => x.lock));
  setPov(sc, []); assert.equal(sc.pov, undefined);
  const k = addExp(f, "미나", "하루"); assert.equal(addExp(f, "하루", "미나"), k);
  setExp(f.exp[k], { ae: "도움", be: "거리", gap: true, viol: "거절" }); assert.equal(f.exp[k].viol, "거절"); assert.ok(f.exp[k].lock);
  setExp(f.exp[k], { gap: false }); assert.equal(f.exp[k].viol, undefined);
  assert.equal(deleteExp(f, k), true);
  setTag(f, "미나", "하루", "trust", 7); assert.ok(editTarget(f, { kind: "emo", k: "미나>하루" }, (p) => { p.tags.fear = 2; }).ok);
  assert.equal(undoLast(f).ok, true); assert.equal(f.emo["미나>하루"].tags.fear, undefined);
});
