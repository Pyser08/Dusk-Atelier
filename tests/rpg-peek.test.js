// 이동 미리보기: 그 칸에 서면 다음 적 차례에 이 유닛을 칠 적(적 AI와 같은 계산)
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";

const mk = (seed) => { const S = E.fresh(); S.seed = seed; S.hunt = true; S.noBalance = true; E.ensureBase(S); E.loadEncounter(S, E.demo()); return S; };

test("상태를 바꾸지 않고, 예측한 적은 실제로 그 유닛을 친다", () => {
  let checked = 0;
  for (let s = 1; s < 25; s++) {
    const S = mk(s), B = S.battle, a = Object.values(B.units).find((u) => u.team === "ally" && u.hp > 0);
    const snap = JSON.stringify(B.units);
    const k = E.stops(S, a, E.reach(S, a)).map((q) => [q % 64, Math.floor(q / 64)]).sort((p, q) => (Math.abs(p[0] - B.w) - Math.abs(q[0] - B.w)))[0] ?? [a.x, a.y];
    const pred = E.attackersAt(S, a, k[0], k[1]);
    assert.equal(JSON.stringify(B.units), snap, "미리보기가 상태를 바꿈");
    if (!pred.length) continue;
    // 그 칸으로 옮기고 다른 아군은 모두 대기시킨 뒤 적 차례: 처음 움직이는 예측 적은 반드시 a를 노린다
    a.x = k[0]; a.y = k[1]; const ev = []; for (const u of Object.values(B.units)) if (u.team === "ally") u.done = true; E.endTurn(S, ev);
    const first = ev.find((e) => e.t === "strike" && pred.some((p) => p.id === e.from));
    if (first) { assert.equal(first.to, a.id); checked++; }
  }
  assert.ok(checked >= 1, "확인한 판 " + checked);
});
