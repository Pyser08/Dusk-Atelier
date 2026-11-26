// 2.2.30 호감도 = 감정(인간적·이성적 호감·신뢰, 적대·두려움) + 친밀도 + 첫인상
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { firstTone, deriveAffinity, syncAffinity } from "../src/engine/affinityderive.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { createBlankPerson, addMetric } from "../src/engine/wikiedit.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
const POLICY = JSON.parse(LIB.base.policies).policies["affinity.score"];

test("첫인상 결: 좋음·보통·나쁨", () => {
  assert.equal(firstTone("믿을 만한 다정한 선생님"), 1);
  assert.equal(firstTone("수상하고 경계해야 할 사람"), -1);
  assert.equal(firstTone("처음 보는 사람"), 0);
});

test("호감도 계산: 감정이 클수록 오르고, 적대는 깎고, 첫인상은 친해질수록 작아짐", () => {
  const z = deriveAffinity({});
  assert.equal(z, 0);
  const warm = deriveAffinity({ affection: 8, attraction: 6, trust: 7, intim: 6 });
  assert.ok(warm > 150 && warm <= 300, String(warm));
  assert.ok(deriveAffinity({ affection: 8, attraction: 6, trust: 7, intim: 6, hostility: 6 }) < warm - 40, "적대는 깎는다(호감이 크면 덜, 신고 #26)");
  assert.equal(deriveAffinity({ hostility: 10, fear: 10 }), -100, "바닥");
  assert.ok(deriveAffinity({ affection: 10, attraction: 10, trust: 10, intim: 10 }) <= 300, "천장");
  const early = deriveAffinity({ first: 1 }) - deriveAffinity({}), late = deriveAffinity({ first: 1, intim: 8 }) - deriveAffinity({ intim: 8 });
  assert.ok(early === 30 && late < early, `${early} ${late}`);
});

test("위키 호감도 맞추기: 감정 있는 인물만, 값이 같으면 그대로", () => {
  let w = createBlankPerson(createEmptyWikiScope({ characterId: "c", chatKey: "k" }), "세라");
  w = createBlankPerson(w, "유나");
  const id = (t) => Object.values(w.documents).find((d) => d.title === t).id;
  w = addMetric(w, id("세라"), { slotId: "affinity.score", targetRefs: ["actor:user"], value: 0, reason: "시작" }, POLICY);
  w = addMetric(w, id("유나"), { slotId: "affinity.score", targetRefs: ["actor:user"], value: 40, reason: "시작" }, POLICY);
  const feelOf = (names) => (names.includes("세라") ? { has: true, tags: { affection: 6, attraction: 3, trust: 5 } } : { has: false });
  const r = syncAffinity(w, { feelOf, intimOf: () => 4, policy: POLICY });
  const aff = (s, t) => Object.values(s.documents).find((d) => d.title === t).metrics.find((m) => m.slotId === "affinity.score").value;
  assert.equal(aff(r.scope, "세라"), deriveAffinity({ affection: 6, attraction: 3, trust: 5, intim: 4 }));
  assert.equal(aff(r.scope, "유나"), 40, "감정 기록이 없으면 그대로");
  assert.equal(r.changed.length, 1);
  assert.equal(syncAffinity(r.scope, { feelOf, intimOf: () => 4, policy: POLICY }).changed.length, 0, "같으면 안 바꿈");
});

test("신고 #26: 적대감이 남아도 호감이 다시 쌓이면 플러스로 돌아온다", () => {
  assert.ok(deriveAffinity({ hostility: 8 }) < 0, "호감 없으면 마이너스");
  assert.ok(deriveAffinity({ affection: 5, attraction: 2, trust: 3, intim: 3, hostility: 8 }) > 0);
  assert.ok(deriveAffinity({ affection: 6, trust: 5, intim: 4, hostility: 3 }) > deriveAffinity({ affection: 6, trust: 5, intim: 4, hostility: 6 }), "적대가 클수록 낮다");
});
