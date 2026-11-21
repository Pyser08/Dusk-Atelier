// 2.2.30 기본 성격 AI 작성: 설명 6개와 함께 성향 6축(0~100)도 받아 반영한다(예전엔 50 그대로).
import test from "node:test";
import assert from "node:assert/strict";
import { resolvePeopleField, preparePeopleField } from "../src/engine/pot/people-field.js";
import { createEmptyWikiScope } from "../src/engine/pot/wiki-schema.js";
import { updatePersonProfile, PERSONALITY_AXES } from "../src/engine/pot/people-profile.js";
import { createBlankPerson, ensureProfile } from "../src/engine/wikiedit.js";

test("기본 성격 AI 작성: 성향 6축도 반영, 축이 없는 답이면 그대로", () => {
  let w = createBlankPerson(createEmptyWikiScope({ characterId: "c", chatKey: "k" }), "세라");
  const id = Object.keys(w.documents)[0];
  w = ensureProfile(w, id);
  w = updatePersonProfile(w, id, { summary: "조용함", coreTraits: ["신중함"], values: ["가족"], emotionExpression: "절제", defenseResponse: "회피", intimacyStyle: "천천히", axes: Object.fromEntries(PERSONALITY_AXES.map((k) => [k, 50])) });
  const field = resolvePeopleField(w, id, "profile:personality");
  const value = { summary: "조용하지만 단단함", coreTraits: ["신중함", "고집"], values: ["가족"], emotionExpression: "절제", defenseResponse: "회피", intimacyStyle: "천천히", axes: { relationalInitiative: 20, expressionDirectness: 35, emotionalExpressiveness: 15, guardedness: 85, impulsivity: 10, relationshipPersistence: 90 } };
  const raw = JSON.stringify({ schema_version: 1, request_ref: "req:x", decision: "update", value, evidence_refs: ["source:a"], reason: "근거", issues: [] });
  const out = preparePeopleField(raw, { scope: w, documentId: id, field, requestRef: "req:x", references: { "source:a": {} } });
  assert.equal(out.scope.people.profiles[id].axes.guardedness, 85);
  assert.equal(out.scope.people.profiles[id].axes.relationalInitiative, 20);
  const { axes, ...noAxes } = value;
  const out2 = preparePeopleField(JSON.stringify({ schema_version: 1, request_ref: "req:y", decision: "update", value: { ...noAxes, summary: "조용하고 단단함" }, evidence_refs: ["source:a"], reason: "근거", issues: [] }), { scope: out.scope, documentId: id, field: resolvePeopleField(out.scope, id, "profile:personality"), requestRef: "req:y", references: { "source:a": {} } });
  assert.equal(out2.scope.people.profiles[id].axes.guardedness, 85, "축이 없으면 그대로");
});
