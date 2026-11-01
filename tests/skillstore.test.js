import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "../src/vendor/fflate.js";
import { createSkillStore, SKILL_LIB_KEY, COCOA_LIB_KEY } from "../src/data/skillstore.js";
import { normalizeSkillCfg, stageInjection, injectionBlock, appendToPrompt, appendToMessages, defaultSkillCfg } from "../src/engine/skillcfg.js";
import { normalizeSkillLibrary } from "../src/engine/skills.js";
import { setSkillBlockProvider, skillBlock } from "../src/engine/skillhook.js";

const fakeApi = (init = {}) => { const m = new Map(Object.entries(init)); return { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, _m: m }; };
const SK = "---\nname: T\nskill_format: 2\nsystem_prompt: 존댓말\nmemory_format: JSON\n---\n본문";
const lib = () => normalizeSkillLibrary({ sets: [{ id: "s1", name: "tone", files: [{ path: "tone/SKILL.md", content: SK }] }] });

test("cfg: default off, unknown stages dropped, refs normalized", () => {
  assert.equal(defaultSkillCfg().on, false);
  const c = normalizeSkillCfg({ on: true, stages: { writer: ["tone", { name: "tone" }, { id: "x" }], bogus: ["a"] } });
  assert.equal(c.on, true);
  assert.equal(c.stages.bogus, undefined);
  assert.equal(c.stages.writer.length, 2);   // 문자열·{name} 중복 제거 후 name과 id 항목
  assert.equal(normalizeSkillCfg("x").on, false);
});

test("off or unassigned stage injects nothing; prompts stay byte-identical", () => {
  const l = lib();
  assert.equal(stageInjection({ on: false, stages: { writer: ["tone"] } }, l, "writer"), null);
  assert.equal(stageInjection({ on: true, stages: { writer: [] } }, l, "writer"), null);
  assert.equal(appendToPrompt("P", ""), "P");
  const msgs = [{ role: "system", content: "S" }];
  assert.equal(appendToMessages(msgs, ""), msgs);
});

test("block appended after prompt / last system message, original untouched", () => {
  const block = injectionBlock(stageInjection({ on: true, stages: { analysis: ["tone"] } }, lib(), "analysis"));
  assert.match(block, /\[Skill Injection: tone\/tone · system_prompt\]\n존댓말/);
  assert.match(block, /memory_format\]\nJSON/);
  assert.ok(appendToPrompt("P", block).startsWith("P\n\n[Skill Injection"));
  const msgs = [{ role: "system", content: "S" }, { role: "user", content: "U" }];
  const out = appendToMessages(msgs, block);
  assert.equal(msgs[0].content, "S");
  assert.ok(out[0].content.startsWith("S\n\n[Skill Injection"));
  assert.equal(appendToMessages([{ role: "user", content: "U" }], block)[0].role, "system");
});

test("store: save/load, blockFor honors toggle and invalidates cache on change", async () => {
  const api = fakeApi(); const st = createSkillStore(api, { log() {} });
  assert.equal((await st.getLibrary()).sets.length, 0);
  await st.saveLibrary(lib());
  assert.equal(await st.blockFor("writer"), "");   // 꺼짐
  await st.saveCfg({ on: true, stages: { writer: ["tone"] } });
  assert.match(await st.blockFor("writer"), /Skill Injection/);
  assert.equal(await st.blockFor("router"), "");
  await st.saveCfg({ on: false, stages: { writer: ["tone"] } });
  assert.equal(await st.blockFor("writer"), "");
  assert.ok(api._m.get(SKILL_LIB_KEY));
  // 새 인스턴스가 저장값을 읽는다
  assert.equal((await createSkillStore(api).getLibrary()).sets[0].name, "tone");
});

test("store: zip and json import, overwrite, cocoa key detection", async () => {
  const api = fakeApi(); const st = createSkillStore(api, { log() {} });
  const zip = zipSync({ "pack/tone/SKILL.md": strToU8(SK), "pack/tone/x.md": strToU8("x") });
  const file = new File([zip], "pack-v1.2.zip");
  const r = await st.readFile(file);
  assert.equal(r.set.name, "pack");
  assert.equal(r.set.files.length, 2);
  assert.equal((await st.importSet(r.set, "new")).changed, true);
  assert.equal((await st.importSet(r.set, "overwrite")).library.sets.length, 1);
  const json = new File([st.exportSet((await st.getLibrary()).sets[0])], "a.json");
  assert.equal((await st.readFile(json)).kind, "set");
  await assert.rejects(() => st.readFile(new File(["nope"], "a.json")));
  // zip 왕복
  const back = await st.readFile(new File([st.zipOfSet((await st.getLibrary()).sets[0])], "pack.zip"));
  assert.equal(back.set.files.length, 2);
  // 코코아전트 저장소 키
  const api2 = fakeApi({ [COCOA_LIB_KEY]: JSON.stringify({ version: 1, sets: [{ name: "c", files: [{ path: "a/SKILL.md", content: "x" }] }] }) });
  const found = await createSkillStore(api2).detectCocoa();
  assert.equal(found.sets[0].name, "c");
  assert.equal(await createSkillStore(fakeApi()).detectCocoa(), null);
});

test("hook: no provider or throwing provider returns empty string", async () => {
  setSkillBlockProvider(null); assert.equal(await skillBlock("writer"), "");
  setSkillBlockProvider(() => { throw new Error("x"); }); assert.equal(await skillBlock("writer"), "");
  setSkillBlockProvider(async (s) => `B:${s}`); assert.equal(await skillBlock("writer"), "B:writer");
  setSkillBlockProvider(null);
});
