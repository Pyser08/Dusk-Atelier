import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/engine/gauge.js";

const mk = (o = {}) => G.normalizeDef({ name: "신뢰", min: 0, max: 10, init: 3, step: 3, on: true, ...o });
const known = ["아리", "벨"];

test("정의: 이름 필수, 범위 검사, 초기값 보정", () => {
  assert.throws(() => G.normalizeDef({ name: "" }));
  assert.throws(() => G.normalizeDef({ name: "a", min: 5, max: 5 }));
  const d = G.normalizeDef({ name: "a", min: 0, max: 10, init: 99 });
  assert.equal(d.init, 10); assert.equal(d.on, false);
});

test("변화량은 step·범위 안으로, 모르는 인물/게이지/근거 없음은 버림", () => {
  const f = {}, d = mk();
  const r = G.applyGauge(f, [d], [
    { g: d.id, who: "아리", d: 9, why: "도와줌" }, { g: d.id, who: "없음", d: 1, why: "x" },
    { g: "zz", who: "벨", d: 1, why: "x" }, { g: d.id, who: "벨", d: 1, why: "" }], null, { known });
  assert.equal(r.changed, 1);
  assert.equal(G.valueOf(f, d, "아리"), 6);
  assert.equal(G.valueOf(f, d, "벨"), 3);
});

test("끄진 게이지는 갱신 안 됨, 중복 항목은 한 번만", () => {
  const f = {}, d = mk({ on: false });
  assert.equal(G.applyGauge(f, [d], [{ g: d.id, who: "아리", d: 1, why: "a" }], null, { known }).changed, 0);
  const e = mk();
  assert.equal(G.applyGauge(f, [e], [{ g: e.id, who: "아리", d: 1, why: "a" }, { g: e.id, who: "아리", d: 1, why: "b" }], null, { known }).changed, 1);
});

test("이력 100건 제한 + 마지막 묶음 되돌리기", () => {
  const f = {}, d = mk({ min: 0, max: 1000, step: 1, init: 500 });
  for (let i = 0; i < 130; i++) G.applyGauge(f, [d], [{ g: d.id, who: "아리", d: 1, why: "w" }], null, { known });
  assert.ok(f.gauge.log.length <= 100);
  const before = G.valueOf(f, d, "아리");
  const u = G.undoLast(f, [d]);
  assert.equal(u.restored, 1); assert.equal(G.valueOf(f, d, "아리"), before - 1);
});

test("되돌리기: 그 뒤 값이 바뀌었으면 건너뜀", () => {
  const f = {}, d = mk();
  G.applyGauge(f, [d], [{ g: d.id, who: "아리", d: 1, why: "a" }], null, { known });
  const b = f.gauge.log.pop(); f.gauge.log.push(b);
  f.gauge.vals[d.id][G.gkey("아리")].v = 9;
  const u = G.undoLast(f, [d]);
  assert.equal(u.skipped, 1); assert.equal(G.valueOf(f, d, "아리"), 9);
});

test("8턴 주기", () => {
  const f = {}, d = mk();
  assert.equal(G.isDue(f, [d], 7), false);
  assert.equal(G.isDue(f, [d], 8), true);
  G.applyGauge(f, [d], [], null, { known, ordinal: 8 });
  assert.equal(G.isDue(f, [d], 12), false);
  assert.equal(G.isDue(f, [d], 16), true);
  assert.equal(G.isDue(f, [mk({ on: false })], 99), false);
});

test("JSON 내보내기/가져오기: 가져온 건 꺼진 채, 중복 이름 제외", () => {
  const d = mk();
  const out = G.importDefs(G.exportDefs([d]), []);
  assert.equal(out.length, 1); assert.equal(out[0].on, false);
  assert.equal(G.importDefs(G.exportDefs([d]), out).length, 0);
  assert.throws(() => G.importDefs("{", []));
  assert.throws(() => G.importDefs('{"type":"x"}', []));
});

test("AI 설계 검증", () => {
  const d = G.validateDesign({ gauge: { name: "경계", min: 0, max: 5, rule: "r", measure: "m", update: "u" } });
  assert.equal(d.on, false); assert.equal(d.src, "ai");
  assert.throws(() => G.validateDesign(null));
});

test("제안 제한: 하루 2회·4시간 간격·미처리 1개·나중에 24시간", () => {
  const H = 3600e3, s = G.newSuggestState(); const t0 = 1e12;
  assert.equal(G.canSuggest(s, t0), false);          // 기본 꺼짐
  s.on = true;
  const a = G.addSuggestion(s, { name: "경계", desc: "" }, [], t0);
  assert.ok(a);
  assert.equal(G.addSuggestion(s, { name: "호감", desc: "" }, [], t0 + 5 * H), null);   // 미처리 있음
  G.resolveSuggestion(s, a.id, "dismiss", t0 + H);
  assert.equal(G.canSuggest(s, t0 + 2 * H), false);   // 4시간 간격
  const b = G.addSuggestion(s, { name: "호감", desc: "" }, [], t0 + 5 * H);
  assert.ok(b);
  G.resolveSuggestion(s, b.id, "later", t0 + 6 * H);
  assert.equal(G.shownSuggestion(s, t0 + 7 * H), null);
  assert.ok(G.shownSuggestion(s, t0 + 31 * H));
  assert.equal(G.addSuggestion(s, { name: "집착", desc: "" }, [], t0 + 10 * H), null); // 하루 2회 초과/연기 중
  assert.equal(G.addSuggestion(s, { name: "경계", desc: "" }, [], t0 + 40 * H), null);  // 거절한 이름 재제안 금지
});

test("삭제 시 값·이력 정리", () => {
  const f = {}, d = mk();
  G.applyGauge(f, [d], [{ g: d.id, who: "아리", d: 1, why: "a" }], null, { known });
  G.removeFromFolder(f, d.id);
  assert.deepEqual(f.gauge.vals, {}); assert.equal(f.gauge.log.length, 0);
});
