import test from "node:test";
import assert from "node:assert/strict";
import { quickSetup, risuSampling, risuModels } from "../src/engine/provider/quickstart.js";
import { normalizeConfig } from "../src/engine/provider/profile.js";

test("리스 샘플링·모델 이름 가져오기", () => {
  assert.deepEqual(risuSampling({ temperature: 80, maxResponse: 1200, frequencyPenalty: 10, PresensePenalty: 0 }), { temperature: 0.8, maxTokens: 1200, frequencyPenalty: 0.1, presencePenalty: 0 });
  assert.deepEqual(risuSampling({}), { temperature: null, maxTokens: null, frequencyPenalty: null, presencePenalty: null });
  assert.deepEqual(risuModels({ aiModel: "gemini-2.5-flash", subModel: "custom:abc 별명" }), { main: "gemini-2.5-flash", sub: "" });
});
test("빠른 시작: 연결·메인/보조 프로필·용도를 만들고 캐시는 자동", () => {
  const cfg = normalizeConfig({});
  const out = quickSetup(cfg, { keyId: "k1", mainModel: "gemini-4-carbon", subModel: "gemini-2.5-flash", sampling: { temperature: 0.8 } });
  assert.equal(out.enabled, true); assert.equal(out.connections.length, 1); assert.deepEqual(out.connections[0].keyIds, ["k1"]);
  const main = out.profiles.find((p) => p.id === out.purposes.main.profileId), sub = out.profiles.find((p) => p.id === out.subProfileId);
  assert.equal(main.model, "gemini-4-carbon"); assert.equal(sub.model, "gemini-2.5-flash"); assert.equal(main.cache.gemini, "auto"); assert.equal(main.sampling.temperature, 0.8);
  assert.equal(cfg.profiles.length, 0, "원래 설정은 그대로");
  const again = quickSetup(out, { keyId: "k2", mainModel: "gemini-2.5-pro" }); assert.equal(again.connections.length, 1, "같은 종류 연결 재사용"); assert.deepEqual(again.connections[0].keyIds, ["k1", "k2"]); assert.equal(again.subProfileId, "");
  assert.throws(() => quickSetup(cfg, {}), /메인 모델/);
});
