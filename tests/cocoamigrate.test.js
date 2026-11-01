import test from "node:test";
import assert from "node:assert/strict";
import { readCocoa, suggestStageRefs, agentToSkillSet } from "../src/engine/cocoamigrate.js";
import { parseSkillFrontmatter } from "../src/engine/skills.js";

const presets = { activePresetId: "p1", presets: [
  { id: "p1", name: "기본", pipeline: { rows: [
    { agents: [] }, { agents: [{ id: "d", name: "Director", enabled: true, mode: "pre", systemPrompt: "규칙: 존댓말\n\n둘째 문단", outputFormat: "JSON", skillSets: [{ id: "s1", name: "tone" }] }] },
    { agents: [] }, { agents: [] }, { agents: [] },
    { agents: [{ id: "m", name: "Memory", mode: "post", postMode: "record", memoryInstruction: "기억해", skillSets: ["mem"] }] },
    { agents: [{ id: "f", name: "Finisher", mode: "post", postMode: "edit", skillSets: ["fin"] }] },
  ] } },
  { id: "p2", name: "보조", pipeline: { rows: [{ agents: [{ id: "x", name: "X", mode: "pre", skillSets: ["other"] }] }] } },
] };

test("readCocoa: agents, stages mapping, library normalized, malformed ignored", () => {
  const r = readCocoa({ library: JSON.stringify({ sets: [{ name: "tone", files: [{ path: "a/SKILL.md", content: "x" }] }] }), presets: JSON.stringify(presets) });
  assert.equal(r.library.sets.length, 1);
  const by = Object.fromEntries(r.agents.map((a) => [a.id, a]));
  assert.deepEqual(by.d.stages, ["director"]);
  assert.deepEqual(by.m.stages, ["writer", "analysis"]);
  assert.deepEqual(by.f.stages, []);
  assert.equal(by.d.active, true);
  assert.equal(by.x.active, false);
  assert.equal(readCocoa({ library: "{", presets: null }).agents.length, 0);
});

test("suggestStageRefs: only active+enabled agents, deduped, by stage", () => {
  const { agents } = readCocoa({ presets });
  const st = suggestStageRefs(agents);
  assert.deepEqual(st.director.map((r) => r.name), ["tone"]);
  assert.deepEqual(st.writer.map((r) => r.name), ["mem"]);
  assert.deepEqual(st.analysis.map((r) => r.name), ["mem"]);
  assert.deepEqual(st.router, []);
  const off = readCocoa({ presets: { ...presets, presets: [{ ...presets.presets[0], pipeline: { rows: [{ agents: [{ id: "d", name: "D", enabled: false, mode: "pre", skillSets: ["tone"] }] }] } }] } });
  assert.deepEqual(suggestStageRefs(off.agents).director, []);
});

test("agentToSkillSet: slots roundtrip through frontmatter; no text -> null", () => {
  const { agents } = readCocoa({ presets });
  const set = agentToSkillSet(agents.find((a) => a.id === "d"));
  const f = set.files[0];
  assert.equal(f.path, "Director/SKILL.md");
  const p = parseSkillFrontmatter(f.content);
  assert.equal(p.meta.system_prompt, "규칙: 존댓말\n\n둘째 문단");
  assert.equal(p.meta.output_format, "JSON");
  assert.equal(p.meta.skill_format, "2");
  assert.equal(agentToSkillSet(agents.find((a) => a.id === "f")), null);
});
