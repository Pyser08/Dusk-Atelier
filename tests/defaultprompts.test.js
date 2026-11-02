// 기억/리수폿 기본 프롬프트(앞=1, 뒤=2)가 모든 Dusk AI 지침에 위치를 지켜 한 번씩만 들어가는지.
import test from "node:test";
import assert from "node:assert/strict";
import { MEMORY_DEFAULT_PROMPT_1 as P1, MEMORY_DEFAULT_PROMPT_2 as P2, DEFAULT_PROMPT_BLOCKS } from "../src/data/memory-default-prompts.js";
import { setUserPromptProvider, withUserPrompts } from "../src/engine/runai.js";
import { createGaugeService } from "../src/data/gauge.js";
import { aiMessages } from "../src/engine/assetfix.js";
import { USER_PROMPT_MARK } from "../src/engine/customprompt.js";

const count = (s, sub) => s.split(sub).length - 1;
const sysOf = (msgs) => msgs.find((m) => m.role === "system").content;
function placed(sys) {
  assert.equal(count(sys, P1), 1, "앞 프롬프트는 한 번");
  assert.equal(count(sys, P2), 1, "뒤 프롬프트는 한 번");
  assert.ok(sys.indexOf(P1) < 5, "앞 프롬프트는 맨 앞");
  assert.ok(sys.trimEnd().endsWith(P2.trimEnd()) || sys.trimEnd().endsWith(USER_PROMPT_MARK), "뒤 프롬프트는 맨 끝");
}

test("defaults exist as front/back blocks", () => {
  assert.deepEqual(DEFAULT_PROMPT_BLOCKS, { front: P1, back: P2 });
});

test("asset-fix instruction gets the default prompts at their positions", async () => {
  setUserPromptProvider(() => DEFAULT_PROMPT_BLOCKS);
  const msgs = await withUserPrompts(aiMessages({ items: [], sets: {} }));
  placed(sysOf(msgs));
  setUserPromptProvider(null);
});

test("gauge design no longer hardcodes both prompts at the front (no duplicates after runAI adds them)", async () => {
  let sent = null;
  const svc = createGaugeService({}, { store: { getIndex: async () => ({}), updateIndex: async () => {} }, call: async (msgs) => { sent = await (async () => { setUserPromptProvider(() => DEFAULT_PROMPT_BLOCKS); const r = await withUserPrompts(msgs); setUserPromptProvider(null); return r; })(); throw new Error("stop"); } });
  await svc.design({ name: "호감도", desc: "x" }, {}).catch(() => {});
  assert.ok(sent, "design called the model");
  placed(sysOf(sent));
});
