import test from "node:test";
import assert from "node:assert/strict";
import { scan, applyAll, revertAll, confirmWords, personOf, entryKey } from "../src/engine/easylore.js";
import { collectManaged, evaluate, bodyOf } from "../src/engine/lorerules.js";

const lore = () => [
  { key: "마리", comment: "마리", content: "@@depth 3\n마리는 트리니티의 수녀. 이오치 마리. 16살. 성격: 상냥하다.", mode: "normal", extentions: {} },
  { key: "히마리", comment: "히마리", content: "히마리는 밀레니엄 특이현상수사부 부장. 휠체어.", mode: "normal", extentions: {} },
  { key: "유리", comment: "유리", content: "강유리. 17살 여성. 검도부 주장, 은발.", mode: "normal", extentions: {} },
  { key: "아로나", comment: "아로나", content: "시스템 AI", mode: "normal", extentions: {} },
  { key: "/re/", useRegex: true, comment: "정규식", content: "x", extentions: {} },
];
let n = 0;
const mkId = () => "e" + ++n;
const fired = (entries, text) => {
  const r = evaluate({ items: collectManaged(entries), messages: [{ role: "user", data: text }], turn: 1, ignoreProb: true });
  return r.fired.map((x) => { const rid = typeof x === "string" ? x : x.rid; return entries.find((e) => e.extentions?.da_rid === rid)?.comment; });
};

test("겹치는 이름·흔한 이름만 고른다", () => {
  const s = scan(lore());
  assert.deepEqual(s.map((x) => x.name), ["마리", "유리"]);
  assert.equal(s[0].risks[0].why, "inside");
  assert.deepEqual(s[1].common, ["유리"]);
});

test("버튼 한 번: '히마리'에 마리가 안 켜지고 '마리가'에는 켜진다", () => {
  const { entries } = applyAll(lore(), { mkId });
  assert.deepEqual(fired(entries, "히마리가 웃었다"), []);
  assert.deepEqual(fired(entries, "마리가 기도했다"), ["마리"]);
  assert.deepEqual(fired(entries, "마리야, 이리 와"), ["마리"]);
});

test("흔한 이름은 부르는 말·확인 단어가 있을 때만", () => {
  const { entries } = applyAll(lore(), { mkId });
  assert.deepEqual(fired(entries, "유리가 깨졌다"), []);
  assert.deepEqual(fired(entries, "유리야, 같이 가자"), ["유리"]);
  assert.deepEqual(fired(entries, "검도부 연습장에서 유리가 기다렸다"), ["유리"]);
});

test("배치(@@depth) 유지·본문 그대로", () => {
  const { entries } = applyAll(lore(), { mkId });
  const h = entries[0];
  assert.equal(h.extentions.da_rule.at, "depth");
  assert.equal(h.extentions.da_rule.depth, 3);
  assert.match(h.content, /@@depth 3/);
  assert.equal(bodyOf(h.content), "마리는 트리니티의 수녀. 이오치 마리. 16살. 성격: 상냥하다.");
});

test("되돌리기는 원래 그대로", () => {
  const orig = lore();
  const { entries } = applyAll(orig, { mkId });
  const back = revertAll(entries);
  assert.equal(back.count, 2);
  assert.deepEqual(back.entries, orig);
});

test("확인 단어는 그 항목에만 있는 낱말", () => {
  const l = lore();
  const w = confirmWords(l[2], l);
  assert.ok(w.includes("강유리") && w.includes("검도부"));
  assert.ok(!w.includes("유리"));
});

test("인물만: 장소·물건 항목은 겹쳐도 안 고친다", () => {
  const l = [
    { key: "마리", comment: "마리", content: "16살. 성격: 상냥함.", extentions: {} },
    { key: "히마리", comment: "히마리", content: "밀레니엄 부장. 성격: 냉정함. 그녀는 휠체어를 탄다.", extentions: {} },
    { key: "마리", comment: "마리 성당", content: "위치: 트리니티 구역의 건물. 장소 설명.", extentions: {} },
    { key: "유리", comment: "유리병", content: "아이템. 가격 3골드. 효과: 회복.", extentions: {} },
  ];
  const s = scan(l);
  assert.deepEqual(s.map((x) => [x.name, x.person]), [["마리", "p"], ["마리 성당", "n"], ["유리병", "n"]]);
  const { plans } = applyAll(l, { mkId: () => "r" + Math.random() });
  assert.deepEqual(plans.map((p) => p.name), ["마리"]);
});

test("칩으로 고친 값·장기기억 이름·AI 판별", () => {
  const e = { key: "아로나", comment: "아로나", content: "시스템 안내 AI", extentions: {} };
  assert.equal(personOf(e, [e]), "n");
  assert.equal(personOf(e, [e], { override: "p" }), "p");
  const f = { key: "시로코", comment: "시로코", content: "아비도스", extentions: {} };
  assert.equal(personOf(f, [f]), "?");
  assert.equal(personOf(f, [f], { memNames: ["시로코"] }), "p");
  assert.equal(personOf(f, [f], { ai: { [entryKey(f)]: "n" }[entryKey(f)] }), "n");
});

test("폴더 이름도 본다", () => {
  const l = [{ key: "인물", comment: "인물", mode: "folder", content: "" }, { key: "하나", comment: "하나", content: "아비도스", folder: "인물", extentions: {} }];
  assert.equal(scan(l)[0]?.person, "p");
});

import { busyEntries, calmEntry } from "../src/engine/easylore.js";
test("거의 매번 켜지는 항목 찾기 · 덜 켜지게", () => {
  const l = [{ key: "학교", comment: "학교 설정", content: "규칙", extentions: {} }, { key: "드래곤", comment: "드래곤", content: "x", extentions: {} }];
  const msgs = Array.from({ length: 10 }, (_, i) => ({ data: i < 8 ? "학교에 갔다" : "집에 왔다" }));
  msgs[3].data += " 드래곤";
  const b = busyEntries(l, msgs);
  assert.deepEqual(b.map((x) => [x.name, x.hits, x.of]), [["학교 설정", 8, 10]]);
  const c = calmEntry(l[0], "r1");
  assert.equal(c.extentions.da_rule.scan, 1);
  assert.equal(c.extentions.da_rule.whole, true);
  assert.equal(c.extentions.da_easy.calm, true);
  assert.deepEqual(revertAll([c]).entries[0], l[0]);
});
