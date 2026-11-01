import test from "node:test";
import assert from "node:assert/strict";
import { makeHandoff, handoffAlive, newBotsSince, draftFields, draftHasContent, planReturn, HANDOFF_TTL } from "../src/engine/workshop.js";
import { patchWorkshop, MARK } from "../tools/compat/workshop-interop.mjs";

const chars = (...ids) => ids.map((id) => ({ chaId: id, name: id, type: "character" }));

test("인계: 그때의 봇 목록을 적고 24시간 안에만 유효", () => {
  const h = makeHandoff(chars("a", "b", "a"), 1000);
  assert.deepEqual(h, { v: 1, at: 1000, ids: ["a", "b"] });
  assert.ok(handoffAlive(h, 1000 + HANDOFF_TTL)); assert.ok(!handoffAlive(h, 1001 + HANDOFF_TTL)); assert.ok(!handoffAlive(null));
});
test("새로 생긴 봇만 (휴지통·그룹 제외)", () => {
  const h = makeHandoff(chars("a"));
  const now = [...chars("a", "n1"), { chaId: "g", type: "group" }, { chaId: "t", trashTime: 1 }];
  assert.deepEqual(newBotsSince(h, now).map((c) => c.chaId), ["n1"]);
});
test("원고 필드: 형식이 맞는 것만, 위험한 키·잘못된 항목은 버림", () => {
  const f = draftFields({ name: "봇", desc: "설명", chaId: "x", chats: [1], globalLore: [{ key: "k", content: "c" }, { key: 1 }], customscript: [{ in: "a", out: "b" }, null], tags: "아님", __proto__: { evil: 1 } });
  assert.deepEqual(Object.keys(f).sort(), ["customscript", "desc", "globalLore", "name"]);
  assert.equal(f.globalLore.length, 1); assert.equal(f.customscript.length, 1);
  assert.ok(!draftHasContent({ name: "이름 없는 이야기" })); assert.ok(draftHasContent({ draft: { firstMessage: "안녕" } }));
});
test("돌아왔을 때: 새 봇 → 넣기 / 기존 봇 편집 → 그 봇 넣기 / 저장 안 한 원고 → 물어보기", () => {
  const h = makeHandoff(chars("a", "b"));
  assert.deepEqual(planReturn(h, chars("a", "b", "n1"), null), { add: ["n1"], draft: null });
  assert.deepEqual(planReturn(h, chars("a", "b"), { targetId: "b", started: true, draft: { desc: "x" } }), { add: ["b"], draft: null });
  const d = { targetId: null, started: true, name: "새 봇", draft: { name: "새 봇", desc: "설명" } };
  assert.deepEqual(planReturn(h, chars("a", "b"), d), { add: [], draft: d });
  assert.deepEqual(planReturn(h, chars("a", "b"), { ...d, started: false }), { add: [], draft: null });
  assert.deepEqual(planReturn(h, chars("a", "b", "n1"), d).draft, null);
  assert.deepEqual(planReturn({ ...h, at: 0 }, chars("a", "b", "n1")), { add: [], draft: null });
});

// 봇빌더 구조를 흉내 낸 작은 파일로 연동판 패치를 확인한다
const FAKE = [
  "//@name risu_story_workshop", "//@display-name 봇빌더", "//@api 3.0", "//@version 1.0.1", "", "/*", "notes", "*/", "(() => {",
  "  function editable(raw) {", "    return { ...raw };", "  }",
  "  class Workshop {", "    constructor(api) { this.api = api; this.s = { targetId: null, draft: { name: \"봇\", desc: \"d\", chats: [] } }; this.started = true; }",
  "    dirty() { return true; }",
  "    async init() {",
  "      const open = async () => { await this.api.showContainer(\"fullscreen\"); };",
  "      await this.api.registerButton({ name: \"\\uBD07\\uBE4C\\uB354\", icon: \"BB\", iconType: \"html\", location: \"hamburger\" }, open);",
  "    }", "  }",
  "  globalThis.__ws = new Workshop(globalThis.Risuai);", "  globalThis.__wsInit = globalThis.__ws.init();", "})();", ""
].join("\n");

test("연동판 패치: 스니펫·등록 코드를 넣고, 열기·원고 동작이 실제로 돈다", async () => {
  const out = patchWorkshop(FAKE);
  assert.ok(out.startsWith("//@name risu_story_workshop\n")); assert.equal((out.match(/^\/\/@/gm) ?? []).length, 4);
  assert.ok(out.includes(MARK) && out.includes('id: "risu-story-workshop"') && out.includes('version: "1.0.1"'));
  assert.throws(() => patchWorkshop(out), /이미 연동판/);
  assert.throws(() => patchWorkshop(FAKE.replace("risu_story_workshop", "other")), /봇빌더/);
  assert.throws(() => patchWorkshop(FAKE.replace("location: \"hamburger\"", "location: \"x\"")), /등록 줄/);
  // 실행: 가짜 리스 API로 돌려서 open·draft 동작 확인
  const m = new Map(); let shown = 0; const timers = [];
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, showContainer: async () => { shown++; }, registerButton: async () => {} };
  const g = { Risuai: api, setInterval: (fn, ms) => timers.push({ fn, ms }) };
  new Function("globalThis", "setInterval", "document", out)(g, g.setInterval, undefined);
  await g.__wsInit; await new Promise((r) => setTimeout(r, 20));
  const { runAction, readInterop } = await import("../src/data/plugins.js");
  assert.deepEqual((await readInterop(api, "risu-story-workshop")).actions.map((a) => a.key), ["open", "draft"]);
  const tickAll = async () => { for (const t of timers) if (t.ms === 1000) await t.fn(); };
  let p = runAction(api, "risu-story-workshop", "open", null, 2000); await new Promise((r) => setTimeout(r, 30)); await tickAll();
  assert.equal((await p).ok, true); assert.equal(shown, 1);
  p = runAction(api, "risu-story-workshop", "draft", null, 2000); await new Promise((r) => setTimeout(r, 30)); await tickAll();
  const r = await p;
  assert.equal(r.ok, true); assert.equal(r.result.name, "봇"); assert.equal(r.result.draft.desc, "d"); assert.equal(r.result.started, true);
});
