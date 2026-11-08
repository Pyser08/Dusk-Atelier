// docs/PROMISES.md 공정한 전개 약속(F-5): 보조 모델 요청에는 공정 지침·주사위를 넣지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { createFairPlay } from "../src/data/fairplay.js";

test("F-5 공정한 전개가 켜져 있어도 보조 모델 요청(type≠model)에는 지침·주사위를 넣지 않는다", async () => {
  const m = new Map([["dusk.ui.fairPlay", "on"], ["dusk.ui.fairDice", "on"]]);
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, addRisuReplacer: async () => {} };
  const fp = createFairPlay(api, { log() {}, saveMs: 1 }); await fp.start();
  const msgs = [{ role: "system", content: "s" }, { role: "user", content: "문을 연다" }];
  const text = (a) => a.map((x) => x.content).join("\n");
  assert.match(text(await fp.beforeRequest(msgs, "model")), /\[Dusk Fairness\][\s\S]*\[Dusk Dice\]/, "메인 요청엔 들어감(이 시험이 실제 삽입을 보는지 확인)");
  for (const t of ["submodel", "memory", "translate"]) assert.equal(text(await fp.beforeRequest(msgs, t)), text(msgs), t);
  await fp.flushLog();
});
