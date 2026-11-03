import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLines, fromStage1, fromStage2, canonName, coerceInt, quoteOk, focusText, knownInText, isLightModel, importanceToAxes, normalizeJsonKeys } from "../src/engine/memorylines.js";
import { analyze } from "../src/engine/memoryprompt.js";

test("줄 해석: 코드펜스·번호·글머리표·한글 태그·콜론 꼴을 받고 모르는 줄은 버린다", () => {
  const r = parseLines("```\n1. scene|요약|방|저녁|yes\n- 인물|민지|웃었다|2\n관계변화: A|B|가까워짐|+\n잡담입니다\n```");
  assert.deepEqual(r.map((x) => x.tag), ["scene", "who", "rel"]);
  assert.deepEqual(r[2].f, ["A", "B", "가까워짐", "+"]);
});
test("1단계: 이름 정리, 본문에 없는 인물 제거, 중요도→점수, 장면 참석자", () => {
  const src = "민지가 방에 들어왔다. 철수는 웃었다.";
  const raw = fromStage1(parseLines("scene|둘이 만났다|방|저녁|yes\nwho|민지씨|문을 열었다|3\nwho|철수|웃었다|높음\nwho|유령|없는 사람|2\nwho|user|말했다|1"), { known: [{ name: "민지", aliases: [] }], source: src });
  assert.deepEqual(raw.people.map((p) => p.name), ["민지", "철수", "{{user}}"]);
  assert.equal(raw.people[0].p, 3); assert.equal(raw.people[1].p, 3);
  assert.deepEqual(raw.scene.who, ["민지", "철수", "{{user}}"]);
  assert.equal(raw.scene.changed, true);
});
test("이름 보정: 호칭 꼬리·한 글자 차이는 기존 이름으로, 괄호는 제거", () => {
  const known = [{ name: "하루", aliases: ["Haru"] }, { name: "카이로스", aliases: [] }];
  assert.equal(canonName("하루님", known), "하루");
  assert.equal(canonName("haru", known), "하루");
  assert.equal(canonName("카이로수", known), "카이로스");
  assert.equal(canonName("서연 (주인공)", known), "서연");
  assert.equal(canonName("유저", known), "{{user}}");
});
test("값 보정", () => {
  assert.equal(coerceInt("높음", 0, 3, 1), 3); assert.equal(coerceInt("2점", 0, 3, 1), 2); assert.equal(coerceInt("99", 0, 3, 1), 3); assert.equal(coerceInt("???", 0, 3, 1), 1);
  assert.deepEqual(importanceToAxes(3), [3, 2, 2]);
  const j = normalizeJsonKeys({ characters: [{ 이름: "A", action: "함", p: "높음", s: "x", r: 9 }] });
  assert.deepEqual(j.people[0], { 이름: "A", action: "함", name: "A", act: "함", p: 3, s: 0, r: 3 });
});
test("2단계: 고르기형 관찰이 감정 변화량이 되고, 본문에 없는 근거는 버린다", () => {
  const src = "그는 함께 가자고 손을 잡았다. 그녀는 고개를 끄덕였다.";
  const ok = fromStage2(parseLines("to|{{user}}|warm|help|함께 가자고 손을 잡았다"), "민지", { source: src });
  assert.deepEqual(ok.emo, [{ from: "민지", to: "{{user}}", t: { affection: 2, trust: 1 }, why: "함께 가자고 손을 잡았다" }]);
  assert.equal(fromStage2(parseLines("to|{{user}}|cold|attack|존재하지 않는 문장이다"), "민지", { source: src }).emo.length, 0);
  const weak = fromStage2(parseLines("to|{{user}}|warm|attack|"), "민지", { source: src });   // 근거 없음 → 약한 신호(±1)
  assert.ok(Object.values(weak.emo[0].t).every((v) => Math.abs(v) <= 1));
  assert.ok(quoteOk("손을  잡았다", src));
});
test("2단계: 호칭·속성·확신·키워드·속마음, 가벼운 모드는 속마음·갈등을 받지 않는다", () => {
  const txt = "trust|f|H\nattr|job|직업|형사|\nkeys|열쇠,옥상,비밀,초과\ncall|{{user}}|선배|존대\nfeel|불안|들킬까 봐|M\nrift|철수|돈 문제|open|some";
  const full = fromStage2(parseLines(txt), "민지", {});
  assert.equal(full.entry.kd, "f"); assert.equal(full.entry.fc, "H"); assert.deepEqual(full.entry.keys, ["열쇠", "옥상", "비밀"]);
  assert.deepEqual(full.talk, [{ from: "민지", to: "{{user}}", call: "선배", tone: "formal" }]);
  assert.equal(full.entry.self.feel, "불안"); assert.equal(full.rift.length, 1); assert.equal(full.entry.attr[0].k, "직업");
  const light = fromStage2(parseLines(txt), "민지", { light: true });
  assert.equal(light.entry.self, undefined); assert.equal(light.rift.length, 0);
});
test("입력 줄이기: 인물이 나오는 문단만 / 이번에 나온 known만", () => {
  const long = Array.from({ length: 40 }, (_, i) => (i === 20 ? "민지가 문을 열었다." : "배경 설명 문단 " + "가".repeat(100))).join("\n");
  const f = focusText(long, "민지");
  assert.ok(f.includes("민지가 문을 열었다") && f.length <= 2400 && f.length < long.length);
  assert.deepEqual(knownInText([{ name: "하루", aliases: [] }, { name: "철수", aliases: ["Chul"] }], "하루가 웃었다").map((p) => p.name), ["하루"]);
});
test("가벼운 모델 감지", () => {
  assert.equal(isLightModel({ model: { mode: "custom", model: "deepseek-v4-flash" } }), false);  // 자동 판별 없음
  assert.equal(isLightModel({ light: true, model: { model: "x" } }), true);
  assert.equal(isLightModel({ light: false, model: { model: "gemini-flash" } }), false);
});

const input = (text) => ({ bot: "봇", known: [], ignore: [], recent: [], newest: { index: 3, text } });
const longText = "민지가 방에 들어와 {{user}}에게 비밀을 털어놓았다. ".repeat(12) + "함께 가자고 손을 잡았다";
test("한 줄 형식 전체 흐름: 개요 1번 + 인물 1번, 감정·호칭·키워드가 합쳐진다", async () => {
  const calls = [];
  const call = async (m) => {
    const sys = m[0].content; calls.push(/ONE character: "([^"]+)"/.exec(sys)?.[1] ?? "overview");
    if (/ONE character/.test(sys)) return "to|{{user}}|warm|help|함께 가자고 손을 잡았다\ncall|{{user}}|선배|casual\nkeys|비밀";
    return "scene|민지가 비밀을 털어놓았다|방|저녁|yes\nwho|민지|비밀을 털어놓았다|3\nwho|{{user}}|들어 주었다|1";
  };
  const r = await analyze(call, input(longText), { staged: true });
  assert.deepEqual(calls, ["overview", "민지", "{{user}}"]);
  assert.equal(r.people.length, 2);
  assert.ok(r.scene.sum.includes("비밀"));
  assert.equal(r.emo[0].t.affection, 2);
  assert.equal(r.people.find((p) => p.name === "민지").keys[0], "비밀");
});
test("한 줄 형식: 형식이 깨지면 다시 묻고, 끝내 안 되면 응답 앞부분이 담긴 오류", async () => {
  let n = 0;
  const r = await analyze(async () => (++n < 3 ? "죄송하지만 못 합니다" : "scene|요약|방|밤|yes\nwho|민지|웃었다|2"), input("짧은 글 민지"), { staged: true });
  assert.equal(n, 3); assert.equal(r.people[0].name, "민지");
  await assert.rejects(analyze(async () => "도저히 모르겠어요 이건 형식이 아닙니다", input("짧"), { staged: true }), (e) => /응답 앞부분: 도저히/.test(e.message));
});
test("한 줄 형식: 강한 모델이 JSON으로 답해도 받는다 / 짧은 응답은 세부 호출을 건너뛴다", async () => {
  let n = 0;
  const r = await analyze(async () => { n++; return JSON.stringify({ people: [{ name: "민지", act: "웃었다", p: 2, s: 1, r: 1 }], scene: { sum: "장면", facts: [], place: "", when: "", who: [], changed: true } }); }, input("짧은 응답"), { staged: true });
  assert.equal(n, 1); assert.equal(r.people[0].name, "민지");
});

import { applyEmo } from "../src/engine/memoryemo.js";
test("신호 쌓기: 약한 신호는 같은 방향 두 번이어야 움직이고, 반대 신호는 지우며, 큰 사건은 바로 반영", () => {
  const f = {}; const e = (d) => [{ from: "A", to: "B", t: { trust: d }, why: "x" }];
  applyEmo(f, e(1), null, 1, { smooth: true });
  assert.equal(f.emo["a>b"].tags.trust, undefined, "첫 약한 신호는 보류");
  applyEmo(f, e(1), null, 2, { smooth: true });
  assert.equal(f.emo["a>b"].tags.trust, 1, "같은 방향 두 번째에 한 칸");
  applyEmo(f, e(-1), null, 3, { smooth: true }); applyEmo(f, e(1), null, 4, { smooth: true });
  assert.equal(f.emo["a>b"].tags.trust, 1, "반대 신호가 쌓인 것을 지우면 움직이지 않음");
  applyEmo(f, e(-3), null, 5, { smooth: true });
  assert.equal(f.emo["a>b"].tags.trust, 0, "큰 사건은 한 번에");
  const g = {}; applyEmo(g, e(1), null, 1); assert.equal(g.emo["a>b"].tags.trust, 1, "smooth 꺼짐 = 예전 동작");
});
