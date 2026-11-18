import test from "node:test";
import assert from "node:assert/strict";
import { counterparts, pairView, setUserNames } from "../src/engine/memoryhuman.js";

const folder = () => ({
  cursor: { at: 10 }, scenes: [],
  wiki: { documents: { a: { id: "a", type: "Character", title: "수아", aliases: [] }, b: { id: "b", type: "Character", title: "지하연", aliases: ["연이"] } } },
  emo: {
    x1: { from: "수아", to: "미오", tags: { affection: 6 }, log: [] },
    x2: { from: "수아", to: "하연", tags: { attraction: 4 }, log: [] },
  },
  talk: { t1: { from: "수아", to: "{{user}}", call: "오빠", tone: "casual" }, t2: { from: "수아", to: "연이", call: "연아" } },
});

test("관계 목록: 같은 사람의 여러 표기(페르소나 이름·{{user}}, 성 뺀 이름·별칭)는 한 번만", () => {
  const f = folder(); setUserNames(f, ["미오"]);
  const list = counterparts(f, ["수아"]).map((x) => x.name).sort();
  assert.deepEqual(list, ["{{user}}", "지하연"]);
});
test("관계 상세: 묶인 표기의 감정·호칭을 함께 찾는다", () => {
  const f = folder(); setUserNames(f, ["미오"]);
  const u = pairView(f, ["수아"], "{{user}}"); assert.equal(u.feel.ab.tags.affection, 6); assert.equal(u.talk.ab.call, "오빠");
  const h = pairView(f, ["수아"], "지하연"); assert.equal(h.feel.ab.tags.attraction, 4); assert.equal(h.talk.ab.call, "연아");
});

import { isUserNameLike } from "../src/engine/recorder.js";
test("유저 이름과 같은 사람은 새 인물로 만들지 않는다(성·괄호·호칭 변형)", () => {
  const u = ["미오"];
  for (const n of ["미오", "미오(나)", "미오 씨", "한미오", "{{user}}", "유저"]) assert.ok(isUserNameLike(n, u), n);
  for (const n of ["미나", "수아", "미오리"]) assert.ok(!isUserNameLike(n, u), n);
  assert.ok(!isUserNameLike("미오", []));
});
