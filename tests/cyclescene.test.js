// addon-rebuild: 장면에 없는 여성의 성관계 보고는 버린다(시험판 피드백 — 가만히 있는 사람이 임신)
import test from "node:test";
import assert from "node:assert/strict";
import { cycleOnlyInScene } from "../src/engine/cyclescene.js";

test("장면에 기록된 여성만 성관계 보고가 남고, 다른 보고는 그대로", () => {
  const reports = [
    { name: "미오", adult: true, sex: [{ partner: "{{user}}", contraception: "none" }], known: false, birth: false },
    { name: "박미나", adult: true, sex: [{ partner: "{{user}}", contraception: "none" }], known: true, birth: false },
    { name: "지하연", adult: true, sex: [{ partner: "철수", contraception: "none" }], known: false, birth: false }];
  const stage1 = { people: [{ name: "미오" }], scene: { who: ["하연"] } };
  const r = cycleOnlyInScene(reports, stage1, [{ name: "미오" }]);
  assert.deepEqual(r.reports.map((x) => [x.name, x.sex.length]), [["미오", 1], ["박미나", 0], ["지하연", 1]], "하연=지하연은 장면에 있음");
  assert.equal(r.reports[1].known, true, "임신 알게 됨 같은 다른 보고는 그대로");
  assert.deepEqual(r.dropped, ["박미나"]);
});
