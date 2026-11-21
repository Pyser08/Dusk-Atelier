import test from "node:test";
import assert from "node:assert/strict";
import { GUIDES } from "../src/data/guidelib.js";
import { selectGuides, guideSection, GUIDE_TITLE, guideSignals } from "../src/engine/guides.js";

test("지침 라이브러리: id 고유, 분야·근거·줄 길이", () => {
  const ids = new Set();
  for (const g of GUIDES) {
    assert.ok(g.id && !ids.has(g.id), `id 중복/없음 ${g.id}`); ids.add(g.id);
    assert.ok(["psych", "body"].includes(g.area), g.id);
    assert.ok(g.src, `근거 분야 없음 ${g.id}`);
    assert.ok(g.line.length >= 20 && g.line.length <= 240, `줄 길이 ${g.id} ${g.line.length}`);
    assert.ok(g.keys || g.when, `조건 없음 ${g.id}`);
  }
  assert.ok(GUIDES.length >= 60, `조각 수 ${GUIDES.length}`);
  assert.ok(GUIDES.filter((g) => g.area === "body").length >= 25);
  assert.ok(GUIDES.filter((g) => g.area === "psych").length >= 30);
});

test("고르기: 글에 맞는 조각만, 아무것도 없으면 빈 결과", () => {
  assert.deepEqual(selectGuides(GUIDES, { text: "오늘 날씨 좋네", people: [] }), []);
  const r = selectGuides(GUIDES, { text: "그는 소주를 세 병째 마시며 취해 비틀거렸다", people: [] });
  assert.ok(r.length >= 1 && r.some((x) => x.g.id.startsWith("alcohol")), r.map((x) => x.g.id).join());
});

test("고르기: 상태(피로)로 고르고 인물 이름을 붙임", () => {
  const r = selectGuides(GUIDES, { text: "", people: [{ name: "유나", v: { fat: 80, mood: [], lust: 10 } }] });
  assert.ok(r.some((x) => x.g.id === "fatigue" && x.names.includes("유나")));
});

test("고르기: 최대 개수, 쉬는 턴, 끈 조각, 사용자 조각", () => {
  const text = "칼에 베여 피가 났고 술에 취했고 울음을 터뜨렸고 무서워서 떨었다";
  const r = selectGuides(GUIDES, { text, people: [] }, { max: 2 });
  assert.equal(r.length, 2);
  const used = new Map(r.map((x) => [x.g.id, 10]));
  const r2 = selectGuides(GUIDES, { text, people: [] }, { max: 2, used, turn: 11, rest: 3 });
  assert.ok(r2.every((x) => !used.has(x.g.id)), "쉬는 중인 조각은 안 나옴");
  const r3 = selectGuides(GUIDES, { text: "술에 취했다", people: [] }, { off: GUIDES.filter((g) => g.id.startsWith("alcohol")).map((g) => g.id) });
  assert.ok(r3.every((x) => !x.g.id.startsWith("alcohol")));
  const custom = [{ id: "u1", area: "psych", src: "사용자", keys: "고양이", line: "고양이를 보면 목소리가 한 톤 높아짐." }];
  const r4 = selectGuides(GUIDES, { text: "고양이가 왔다", people: [] }, { custom });
  assert.ok(r4.some((x) => x.g.id === "u1"));
});

test("주입 블록: 제목 + 줄, 길이 한도", () => {
  const s = guideSection(selectGuides(GUIDES, { text: "피가 나는 상처, 술에 취함", people: [] }, { max: 2 }));
  assert.ok(s.startsWith(GUIDE_TITLE));
  assert.ok(s.length <= GUIDE_TITLE.length + 2 * 260);
  assert.equal(guideSection([]), "");
});

test("신호: lifeView 결과를 인물별로 모음", () => {
  const s = guideSignals("본문", [{ name: "유나", v: { fat: 50, mood: [{ key: "sadness", v: 40 }], lust: 20, phase: "period" } }, { name: "x", v: null }]);
  assert.equal(s.people.length, 1);
  assert.equal(s.text, "본문");
});

import { guideInject } from "../src/engine/guides.js";
test("주입: 끄면 빈 값, 리롤(같은 턴)은 같은 결과, 다음 턴엔 쉬게", () => {
  const folder = "c|1";
  assert.equal(guideInject(GUIDES, { key: folder, text: "술에 취했다", turn: 1, cfg: { on: false } }), "");
  const a = guideInject(GUIDES, { key: folder, text: "술에 취했다", turn: 1 });
  assert.ok(a.includes("취"));
  assert.equal(guideInject(GUIDES, { key: folder, text: "술에 취했다", turn: 1 }), a, "같은 턴");
  assert.notEqual(guideInject(GUIDES, { key: folder, text: "술에 취했다", turn: 2 }), a, "다음 턴엔 쉼");
});

test("조각 정규식: 모두 컴파일되고 빈 글에 안 걸림", () => {
  for (const g of GUIDES) if (g.keys) { const r = new RegExp(g.keys, "i"); assert.ok(!r.test(""), g.id); assert.ok(!r.test("그리고 그는 문을 열고 들어왔다."), g.id); }
});

test("오탐 없음: 평범한 문장엔 아무것도 안 고름", () => {
  for (const t of ["바람이 시원하게 분다", "화가 가라앉았다고 했지만", "그녀는 책을 펼쳤다", "길을 따라 걸었다", "밥을 먹고 창밖을 봤다"]) {
    const r = selectGuides(GUIDES, { text: t, people: [] });
    assert.ok(r.every((x) => !["cheating", "drown"].includes(x.g.id)), `${t} → ${r.map((x) => x.g.id)}`);
  }
  assert.deepEqual(selectGuides(GUIDES, { text: "그녀는 책을 펼쳤다", people: [] }), []);
});

test("대표 문장 → 기대 조각", () => {
  const want = { "총에 맞아 쓰러졌다": "shock-stab", "임테기를 사 왔다": "preg-test", "콘돔이 찢어졌다": "contraception", "그는 바람피운 걸 들켰다": "cheating", "요즘 우울해서 아무것도 하기 싫어": "depression", "말 놓으셔도 돼요, 반말 해요": "honorific", "결박당한 채": "bdsm", "목을 졸랐다": "choke" };
  for (const [t, id] of Object.entries(want)) assert.ok(selectGuides(GUIDES, { text: t, people: [] }, { max: 3 }).some((x) => x.g.id === id), `${t} → ${id}`);
});

test("우선순위 0 조각도 글이 맞으면 고름", () => {
  const zero = GUIDES.filter((g) => (g.pri ?? 1) === 0 && g.keys);
  assert.ok(zero.length > 0);
  assert.ok(selectGuides(GUIDES, { text: "커피를 한 모금 마셨다", people: [] }).some((x) => x.g.id === "caffeine"));
});
