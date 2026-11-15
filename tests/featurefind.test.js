import test from "node:test";
import assert from "node:assert/strict";
import { FEATURES, findFeatures } from "../src/engine/featurefind.js";
import { TABS, SUBNAMES } from "../src/ui/tabs.js";

test("‘생리’로 찾으면 월경·임신 기록과 그 위치가 나온다", () => {
  const r = findFeatures("생리");
  assert.equal(r[0].t, "월경·임신 기록");
  assert.match(r[0].path, /성인 항목/);
});

test("띄어쓰기·가운뎃점이 달라도 찾는다", () => {
  assert.equal(findFeatures("월경 임신")[0].t, "월경·임신 기록");
  assert.equal(findFeatures("서사 관계")[0].t, "서사관계 전용 모드 · 자동 기록 세부");
  assert.ok(findFeatures("api 키").some((f) => /AI 모델/.test(f.t)));
});

test("이름에 든 낱말이 다른 말에만 든 것보다 먼저 나온다", () => {
  const r = findFeatures("호감");
  assert.equal(r[0].t, "호감 점수");
});

test("모든 낱말이 맞아야 한다 · 빈 검색은 빈 결과", () => {
  assert.deepEqual(findFeatures("월경 테마"), []);
  assert.deepEqual(findFeatures("   "), []);
});

test("꺼진 애드온의 기능은 off로 표시하고 맨 뒤로 보낸다", () => {
  const r = findFeatures("수위", FEATURES, { has: (id) => id !== "erosync" });
  assert.ok(r.length >= 2);
  assert.equal(r.at(-1).off, true);
  assert.equal(r.find((f) => f.addon === "memory")?.off, false);
});

test("모든 항목은 실제 탭·하위 화면을 가리키고 이름·위치가 있다", () => {
  const tabs = new Set(TABS.map((t) => t.id));
  for (const f of FEATURES) {
    assert.ok(f.t && f.path, JSON.stringify(f));
    assert.ok(tabs.has(f.tab), `${f.t}: 없는 탭 ${f.tab}`);
    if (f.sub) assert.ok(SUBNAMES[f.tab]?.[f.sub], `${f.t}: 없는 하위 화면 ${f.sub}`);
  }
  assert.equal(new Set(FEATURES.map((f) => f.t)).size, FEATURES.length);
});
