import test from "node:test";
import assert from "node:assert/strict";
import { featureGaps, fillPrompt, FILL_FEATURES } from "../src/data/featurefill.js";

const doc = (id, title) => ({ id, type: "Character", title, aliases: [], sections: [] });
test("새 기능 빈칸: 인물이 있는데 종족·기후·옷차림이 비면 채울 거리, 채운 표시가 있으면 다시 안 물음", () => {
  const f = { wiki: { documents: { a: doc("a", "세라"), u: doc("u", "{{user}}") } } };
  assert.deepEqual(featureGaps(f).map((g) => g.key), ["race", "climate", "outfit"]);
  assert.deepEqual(featureGaps(f, { race: false, scenePanel: false }).map((g) => g.key), ["outfit"], "꺼진 기능은 안 물음");
  f.extra = { race: { 세라: { name: "세라", id: "elf" } }, climate: { zone: "oceanic" }, outfit: { 세라: { name: "세라", parts: {}, acc: [] } } };
  assert.deepEqual(featureGaps(f), [], "다 있으면 없음");
  const g = { wiki: { documents: { a: doc("a", "세라") } }, extra: { filled: { race: 1, climate: 1, outfit: 1 } } };
  assert.deepEqual(featureGaps(g), [], "채운 표시가 있으면 찾을 게 없었어도 다시 안 물음");
  assert.deepEqual(featureGaps({ wiki: { documents: {} } }), [], "인물이 없으면 없음");
  assert.ok(FILL_FEATURES.every((x) => x.line.includes("|")), "기능마다 기록기 줄");
});
test("채우기 지시문: 빈칸 기능 줄만, 인물 이름·최근 이야기", () => {
  const f = { wiki: { documents: { a: doc("a", "세라") }, people: { profiles: { a: { summary: "숲의 궁수" } } } } };
  const [sys, user] = fillPrompt(f, [{ key: "race" }], { recent: "AI: 세라가 귀를 쫑긋했다", bot: "엘프 왕국" });
  assert.match(sys.content, /race\|Name/); assert.doesNotMatch(sys.content, /climate\|/);
  assert.match(user.content, /세라: 숲의 궁수/); assert.match(user.content, /귀를 쫑긋/); assert.match(user.content, /엘프 왕국/);
});
