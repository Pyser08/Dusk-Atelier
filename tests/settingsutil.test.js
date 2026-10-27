import test from "node:test";
import assert from "node:assert/strict";
import { applyBefore, changedKeys, pushHist, takeHist, shareableSettings, encodeShare, decodeShare, matchQuery, scopeChipLabel, HIST_MAX } from "../src/engine/settingsutil.js";

test("changedKeys: 한 단계 아래까지 바뀐 이름만", () => {
  assert.deepEqual(changedKeys({ a: 1, b: { c: 1, d: 2 }, e: [1] }, { a: 1, b: { c: 1, d: 3 }, e: [1, 2] }), ["b.d", "e"]);
  assert.deepEqual(changedKeys({ a: 1 }, { a: 1 }), []);
  assert.deepEqual(changedKeys({}, { x: 1 }), ["x"]);
});

test("pushHist: 최신이 앞, 10개 상한, 변화 없으면 그대로", () => {
  let list = [];
  for (let i = 0; i < 13; i++) list = pushHist(list, "flow", { n: i }, { n: i + 1 }, i);
  assert.equal(list.length, HIST_MAX);
  assert.equal(list[0].at, 12);
  assert.deepEqual(list[0].before, { n: 12 });
  assert.deepEqual(list[0].top, ["n"]);
  assert.equal(pushHist(list, "flow", { n: 1 }, { n: 1 }), list);
});

test("pushHist: 바뀐 항목이 많으면 6개만 적고 나머지 수를 센다", () => {
  const a = {}, b = {}; for (let i = 0; i < 9; i++) { a["k" + i] = 0; b["k" + i] = 1; }
  const [e] = pushHist([], "dusk", a, b, 1);
  assert.equal(e.keys.length, 6); assert.equal(e.more, 3);
});

test("takeHist: 고른 항목과 그보다 최근 것을 같이 버린다", () => {
  const list = [{ at: 3 }, { at: 2 }, { at: 1 }];
  assert.deepEqual(takeHist(list, 1), { entry: { at: 2 }, rest: [{ at: 1 }] });
  assert.equal(takeHist(list, 5), null);
});

test("shareableSettings: 모델·키·채팅별 값 제외, 추가 프롬프트는 모든 곳만", () => {
  const s = shareableSettings({ enabled: true, models: { x: 1 }, personaNamesByScope: { a: 1 }, commonByBot: { b: 1 }, apiKeyHint: "x", level: 2,
    customPrompts: [{ id: "1", scope: { kind: "all" } }, { id: "2", scope: { kind: "chat" } }] });
  assert.deepEqual(Object.keys(s).sort(), ["customPrompts", "enabled", "level"]);
  assert.equal(s.customPrompts.length, 1);
});

test("공유 코드: 왕복·한글·오타 검출", () => {
  const code = encodeShare({ enabled: true, label: "한글 설정 ✓", models: { secret: 1 } }, "내 프리셋");
  assert.match(code, /^DAMEM1:/);
  const d = decodeShare(" " + code.slice(0, 20) + "\n" + code.slice(20) + " ");
  assert.equal(d.note, "내 프리셋");
  assert.deepEqual(d.settings, { enabled: true, label: "한글 설정 ✓" });
  const bad = code.slice(0, 12) + (code[12] === "A" ? "B" : "A") + code.slice(13);
  assert.throws(() => decodeShare(bad), /글자가 바뀐|읽을 수 없어요/);
  assert.throws(() => decodeShare("hello"), /DAMEM1/);
  assert.throws(() => decodeShare(code.slice(0, -3)), /다시 복사/);
});

test("matchQuery: 모든 낱말, 대소문자·빈 검색", () => {
  assert.ok(matchQuery("추가 프롬프트 · 이 채팅", "프롬프트 채팅"));
  assert.ok(!matchQuery("추가 프롬프트", "프롬프트 관찰자"));
  assert.ok(matchQuery("Hypa 참고", "hypa"));
  assert.ok(matchQuery("아무거나", "  "));
});

test("범위 칩 이름", () => {
  assert.equal(scopeChipLabel("all"), "모든 봇"); assert.equal(scopeChipLabel("bot"), "이 봇"); assert.equal(scopeChipLabel("chat"), "이 채팅"); assert.equal(scopeChipLabel("?"), "");
});

test("pushHist는 models를 담지 않고, applyBefore가 이전 값으로 돌린다", () => {
  const before = { a: 1, models: { k: "비밀" } }, after = { a: 2, models: { k: "다른" }, added: true };
  const [e] = pushHist([], "flow", before, after, 1);
  assert.ok(!("models" in e.before)); assert.ok(!e.top.includes("models"));
  assert.deepEqual(applyBefore({ ...after }, e), { a: 1, models: { k: "다른" } });
  assert.equal(pushHist([], "flow", { models: 1 }, { models: 2 }).length, 0);
});
