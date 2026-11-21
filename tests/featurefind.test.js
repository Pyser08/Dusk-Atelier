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
  assert.ok(findFeatures("장기 기억 옮기기").some((f) => /장기 기억 옮기기/.test(f.t)), "11-19 제보: 기억 이사 메뉴 찾기");
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
  // 2.2.9: Erosync 항목이 빠져서 장기기억 애드온을 끈 경우로 같은 규칙을 본다
  const r = findFeatures("관계도", FEATURES, { has: (id) => id !== "memory" });
  assert.ok(r.some((f) => f.addon === "memory" && f.off === true), "꺼진 애드온 기능은 off");
  const firstOff = r.findIndex((f) => f.off);
  assert.ok(firstOff >= 0 && r.slice(firstOff).every((f) => f.off), "꺼진 것은 맨 뒤");
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

test("2.2.6 게이지 배수·관계도 이전 턴을 찾는다", () => {
  assert.equal(findFeatures("게이지 배수")[0].t, "게이지 배수 (오를 때 · 내릴 때)");
  assert.ok(findFeatures("이전 턴").some((f) => f.t === "인물 관계도"));
  assert.equal(findFeatures("성인 항목 무작위")[0].t, "처음 등장 때 성인 항목 무작위로");
  assert.equal(findFeatures("버셀")[0].t, "Jev 재정렬 (선택)");
});
test("‘동시 처리’로 찾으면 지난 대화 분석 속도 설정이 나온다 (2.2.11)", () => {
  const r = findFeatures("동시 처리");
  assert.equal(r[0].t, "지난 대화 분석 속도 (묶음 크기·동시 처리)");
});

test("‘플러그인 허용’으로 찾으면 Dusk 기능 허용(플러그인 › 연동 설정)이 나온다", () => {
  const r = findFeatures("플러그인 허용");
  const f = r.find((x) => x.t === "다른 플러그인의 Dusk 기능 허용");
  assert.ok(f, "결과에 있어야 함");
  assert.equal(f.tab, "plugins"); assert.equal(f.sub, "interop");
});

test("장기기억 0.3.20 갈래 보기를 찾는다", () => {
  const f = findFeatures("분기").find((x) => x.t === "갈래 보기");
  assert.ok(f && f.tab === "branches" && f.addon === "memory");
});

test("인간다움: ‘묘사 지침’·‘캘린더’로 찾는다", () => {
  assert.ok(findFeatures("묘사 지침").some((f) => /묘사 지침/.test(f.t)));
  assert.ok(findFeatures("생일 약속").some((f) => /캘린더/.test(f.t)));
});
