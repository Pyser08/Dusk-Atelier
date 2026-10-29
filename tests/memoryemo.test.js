import test from "node:test";
import assert from "node:assert/strict";
import { validate, buildMessages, SYSTEM_PROMPT } from "../src/engine/memoryprompt.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { reconcile } from "../src/engine/memoryreconcile.js";
import { buildBlock } from "../src/engine/memoryinject.js";
import { hashText } from "../src/engine/chattext.js";
import { validateEmo, applyEmo, setTag, summaryOf, tensionOf, emoLines, emoForPrompt, convertAffinity, undoConversion } from "../src/engine/memoryemo.js";
import { validateKeys, keysOf, keyHits, evalRetrieval } from "../src/engine/memorykeys.js";

const E = (t, why = "배신을 목격") => ({ from: "미나", to: "하루", t, why });
const A = (at) => ({ at, mid: "m" + at, h: "h" + at });

test("검증: 변화량 범위·근거·태그 이름을 걸러낸다", () => {
  const v = validateEmo({ emo: [E({ trust: -9, fear: 1, bogus: 2, love: 1 }), E({ trust: 1 }, ""), E({ trust: 0 }), { from: "a", to: "a", t: { trust: 1 }, why: "x" }, E({ respect: 2 }), E({ respect: 1 }), E({ respect: 1 })] });
  assert.equal(v.length, 3);
  assert.deepEqual(v[0].t, { trust: -3, fear: 1 });
  assert.deepEqual(validateEmo({}), []);
  assert.deepEqual(validate({ people: [] }).emo, []);
});
test("프롬프트: emo 규칙·keys 안내가 들어 있고 기준표는 그대로 1회", () => {
  assert.ok(SYSTEM_PROMPT.includes('"emo"')); assert.ok(SYSTEM_PROMPT.includes("`keys`"));
  assert.equal((SYSTEM_PROMPT.match(/H = directly stated/g) ?? []).length, 1);
  const a = JSON.parse(buildMessages({ bot: "b", newest: { index: 1, text: "t" } })[1].content);
  const b = JSON.parse(buildMessages({ bot: "b", emoState: [{ from: "a", to: "b", tags: { trust: 3 } }], newest: { index: 1, text: "t" } })[1].content);
  assert.equal(a.emoState, undefined); assert.equal(b.emoState.length, 1);
});
test("게이지: 미설정≠0, 올라갈 때 0에서 시작, 0~10으로 제한, 변화 없는 태그는 기록 안 함", () => {
  const f = {};
  assert.equal(applyEmo(f, [E({ trust: 2, fear: -1 })], A(1), 100), 2);
  const t = f.emo["미나>하루"].tags;
  assert.deepEqual(t, { trust: 2, fear: 0 }, "내려가는 변화만 있으면 '없음 0'으로 시작");
  assert.equal(t.affection, undefined, "나머지는 미설정");
  applyEmo(f, [E({ trust: 3 })], A(2), 200); applyEmo(f, [E({ trust: 3 })], A(3), 300); applyEmo(f, [E({ trust: 3 })], A(4), 400);
  assert.equal(t.trust, 10);
  assert.equal(applyEmo(f, [E({ trust: 2 })], A(5), 500), 0, "이미 최대면 변화 없음");
  assert.equal(f.emo["미나>하루"].log.length, 4);
});
test("잠금: 사용자가 정한 태그는 자동 갱신하지 않고, null이면 미설정으로 되돌린다", () => {
  const f = {};
  setTag(f, "미나", "하루", "trust", 7);
  applyEmo(f, [E({ trust: -3, respect: 2 })], A(2));
  assert.equal(f.emo["미나>하루"].tags.trust, 7); assert.equal(f.emo["미나>하루"].tags.respect, 2);
  setTag(f, "미나", "하루", "trust", null);
  assert.equal(f.emo["미나>하루"].tags.trust, undefined); assert.equal(f.emo["미나>하루"].lock, undefined);
  assert.equal(setTag(f, "a", "b", "bogus", 1), null);
});
test("종합 태그: 게이지에서 코드가 만들고 어긋남을 표시한다", () => {
  assert.equal(summaryOf({}), ""); assert.equal(summaryOf({ trust: 2 }), "mild (trust 2)");
  assert.equal(summaryOf({ affection: 8, trust: 5, fear: 1 }), "affection 8, trust 5");
  assert.equal(summaryOf({ affection: 8, trust: 1 }), "affection 8 [conflicted]");
  assert.deepEqual(tensionOf({ affection: 7, hostility: 6 }), [["affection", "hostility"]]);
  assert.deepEqual(tensionOf({ affection: 7, trust: undefined }), [], "미설정은 어긋남이 아니다");
});
test("분석 반영: 응답마다 emo가 병합되고 known 입력용 게이지가 나온다", () => {
  const f = { people: {}, scenes: [], runs: 0 };
  const r = applyAnalysis(f, { people: [], scene: null, emo: [E({ affection: 3 })] }, A(4), { now: 50 });
  assert.equal(r.emo, 1);
  assert.deepEqual(emoForPrompt(f), [{ from: "미나", to: "하루", tags: { affection: 3 } }]);
  assert.deepEqual(emoLines(f), ["- 미나 → 하루: mild (affection 3)"]);
});
test("정합성: 사라진 응답의 감정 변화는 되돌린다(최근 것부터)", () => {
  const msg = (t, id) => ({ role: "char", data: t, chatId: id });
  const msgs = [msg("첫", "m1"), msg("둘", "m2")];
  const f = { people: {}, scenes: [] };
  applyEmo(f, [E({ trust: 2 })], { at: 0, mid: "m1", h: hashText("첫") }, 1);
  applyEmo(f, [E({ trust: 3, fear: 1 })], { at: 1, mid: "gone", h: "gone" }, 2);
  reconcile(f, msgs);
  assert.deepEqual(f.emo["미나>하루"].tags, { trust: 2 });
  reconcile(f, msgs);
  assert.deepEqual(f.emo["미나>하루"].tags, { trust: 2 }, "두 번 돌려도 같다");
});
test("호감도 변환: 애정만 옮기고 나머지는 미설정, 원본 보존, 중복 변환 없음, 되돌리기", () => {
  const docs = [{ title: "미나", metrics: [{ slotId: "affinity.score", value: 30, minimum: -100, maximum: 100 }] }, { title: "하루", metrics: [] }];
  const f = {}; const before = JSON.stringify(docs);
  assert.equal(convertAffinity(f, docs, "유저", 9), 1);
  assert.deepEqual(f.emo["미나>유저"].tags, { affection: 7 });
  assert.equal(JSON.stringify(docs), before);
  assert.equal(convertAffinity(f, docs, "유저"), 0);
  assert.equal(f.emoConv.length, 1);
  assert.equal(undoConversion(f), 1); assert.equal(f.emo["미나>유저"].tags.affection, undefined);
});
test("검색 키: 정리하고, 장면 장소를 자동으로 붙여 현재 글과 맞춘다", () => {
  assert.deepEqual(validateKeys(["은방울꽃", "은방울꽃", "a", " 비밀 편지 ", "x".repeat(50), "넷", "다섯"]), ["은방울꽃", "비밀 편지", "x".repeat(20), "다섯"]);
  const f = { scenes: [{ id: "s1", place: "옥상 정원" }] };
  const r = { id: "r", sit: "s1", keys: ["은방울꽃"] };
  assert.deepEqual(keysOf(r, f), ["은방울꽃", "옥상정원"]);
  assert.equal(keyHits(r, f, "그녀는옥상정원에서은방울꽃을꺾었다"), 2);
  assert.equal(keyHits(r, f, "전혀다른이야기"), 0);
});
test("주입: 검색 키가 맞으면 장면에 없는 인물의 기억도 올라온다 + 감정 게이지 줄", () => {
  const mk = (id, act, keys) => ({ id, at: 1, act, g: "B", orphan: false, ...(keys ? { keys } : {}) });
  const f = { scenes: [{ id: "s1", sum: "카페", who: ["미나"], orphan: false }], emo: {}, people: {
    미나: { name: "미나", aliases: [], records: [mk("a", "하루에게 약속함")] },
    하루: { name: "하루", aliases: [], records: [mk("b", "비밀 상자를 숨김", ["은방울꽃"]), mk("c", "무관한 일")] } } };
  applyEmo(f, [E({ trust: 4 })], A(2), 5);
  const none = buildBlock(f, { messageCount: 60, recentText: "카페에서 커피를 마셨다", settings: { recentSkip: 0 } });
  assert.ok(!none.text.includes("비밀 상자"));
  const hit = buildBlock(f, { messageCount: 60, recentText: "문득 은방울꽃 향기가 났다", settings: { recentSkip: 0 } });
  assert.ok(hit.text.includes("비밀 상자")); assert.ok(hit.manifest.recordIds.includes("b"));
  assert.ok(hit.text.includes("Feelings") && hit.text.includes("미나 → 하루: trust 4"));
});
test("측정: 포착률·배제율을 계산한다", () => {
  const ev = evalRetrieval([{ name: "c1", need: ["a", "b"], avoid: ["x"] }, { name: "c2", need: ["c"], avoid: ["y", "z"] }], (c) => c.name === "c1" ? ["a", "x"] : ["c"]);
  assert.equal(ev.capture, 2 / 3); assert.equal(ev.exclusion, 1 - 1 / 3); assert.deepEqual(ev.rows[0].missed, ["b"]);
  assert.deepEqual(evalRetrieval([], () => []), { rows: [], capture: 1, exclusion: 1 });
});
test("호환: emo·keys가 없는 구버전 폴더와 분석 결과도 그대로 동작한다", () => {
  const f = { people: {}, scenes: [], runs: 0 };
  const r = applyAnalysis(f, { people: [{ name: "미나", act: "행동", p: 3, s: 3, r: 2, know: [] }], scene: null }, A(1));
  assert.equal(r.emo, 0); assert.equal(f.emo?.length, undefined);
  assert.equal(buildBlock({ scenes: [], people: {}, emo: undefined }, {}).text, "");
});
