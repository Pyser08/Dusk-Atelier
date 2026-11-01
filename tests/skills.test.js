import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSkillFrontmatter, normalizeSkillLibrary, normalizeSkillSet, buildSkillIndex, resolveSkillInjections, composeSlot,
  skillInjectionSignature, unwrapSkillZipRoot, skillSetNameFromFileName, skillSetFromEntries, applySkillSetImport,
  parseSkillExport, exportSkillSet, exportSkillLibrary, diagnoseSkillSet, renameSkillFolder, skillReadBody, SKILL_LIMITS,
} from "../src/engine/skills.js";

const md = (lines) => lines.join("\n");
const skillMd = md(["---", "name: Tone", "description: 말투 규칙", "skill_format: 2", "inject_order: 10", "system_prompt: |", "  항상 존댓말.", "  이모지 금지.", "checklist: |", "  1. 존댓말인가", "output_format_file: fmt.md", "---", "# 본문", "자세한 설명"]);
const lib = () => normalizeSkillLibrary({ sets: [{ id: "s1", name: "tone", files: [{ path: "tone/SKILL.md", content: skillMd }, { path: "tone/fmt.md", content: "JSON만 출력" }] }] });

test("frontmatter: block scalars, quotes, no-frontmatter body kept", () => {
  const p = parseSkillFrontmatter(skillMd);
  assert.equal(p.meta.system_prompt, "항상 존댓말.\n이모지 금지.");
  assert.equal(p.meta.name, "Tone");
  assert.equal(p.body, "# 본문\n자세한 설명");
  assert.equal(parseSkillFrontmatter('---\nname: "A b"\n---\nx').meta.name, "A b");
  const raw = "그냥 글\n---\n";
  assert.deepEqual(parseSkillFrontmatter(raw), { meta: {}, body: raw, hasFrontmatter: false });
  assert.equal(parseSkillFrontmatter("---\nd: >\n  a\n  b\n\n  c\n---\n").meta.d, "a b\nc");
});

test("index only counts folders with SKILL.md; root files excluded", () => {
  const l = normalizeSkillLibrary({ sets: [{ name: "x", files: [{ path: "a/SKILL.md", content: "# 제목\n내용" }, { path: "b/other.md", content: "x" }, { path: "loose.md", content: "x" }] }] });
  const idx = buildSkillIndex(l.sets);
  assert.equal(idx.length, 1);
  assert.equal(idx[0].ref, "x/a");
  assert.equal(idx[0].description, "제목");
});

test("injections: inline + _file, order, signature changes with content", () => {
  const l = lib();
  const inj = resolveSkillInjections([{ name: "TONE" }], l);
  assert.equal(inj.systemPrompt[0].text, "항상 존댓말.\n이모지 금지.");
  assert.equal(inj.outputFormat[0].text, "JSON만 출력");
  assert.equal(inj.skills[0].ref, "tone/tone");
  const sig = skillInjectionSignature(inj);
  l.sets[0].files[1].content = "다른 형식";
  assert.notEqual(sig, skillInjectionSignature(resolveSkillInjections([{ id: "s1" }], l)));
  assert.equal(skillInjectionSignature(null), "");
});

test("compose: no skills = byte-identical base; append-only; checklist renumbered", () => {
  assert.equal(composeSlot("systemPrompt", "BASE", resolveSkillInjections([], lib())), "BASE");
  const inj = resolveSkillInjections([{ id: "s1" }], lib());
  const out = composeSlot("systemPrompt", "BASE", inj);
  assert.ok(out.startsWith("BASE\n\n[Skill Injection: tone/tone · system_prompt]\n"));
  assert.ok(out.endsWith("[/Skill Injection]"));
  assert.match(composeSlot("checklist", "1. a\n2. b", inj), /\n3\. 존댓말인가/);
});

test("missing _file warns and skips; over-limit skill skipped whole", () => {
  const l = normalizeSkillLibrary({ sets: [{ name: "x", files: [{ path: "a/SKILL.md", content: "---\nsystem_prompt_file: none.md\n---\n" }] }] });
  const inj = resolveSkillInjections([{ name: "x" }], l);
  assert.equal(inj.systemPrompt.length, 0);
  assert.match(inj.warnings[0], /none\.md/);
  const big = "x".repeat(SKILL_LIMITS.field + 1);
  const l2 = normalizeSkillLibrary({ sets: [{ name: "y", files: [{ path: "a/SKILL.md", content: `---\nsystem_prompt: ${big}\n---\n` }] }] });
  assert.match(resolveSkillInjections([{ name: "y" }], l2).warnings[0], /상한/);
  assert.match(resolveSkillInjections([{ name: "nope" }], l2).warnings[0], /찾지 못/);
});

test("zip helpers: wrapper unwrapped unless it is the skill; version stripped from name", () => {
  const f = [{ path: "pack/a/SKILL.md" }, { path: "pack/a/x.md" }];
  assert.deepEqual(unwrapSkillZipRoot(f).map((x) => x.path), ["a/SKILL.md", "a/x.md"]);
  const g = [{ path: "a/SKILL.md" }, { path: "a/x.md" }];
  assert.equal(unwrapSkillZipRoot(g), g);
  assert.equal(skillSetNameFromFileName("nsfw_guide-v1.4.zip"), "nsfw_guide");
  assert.equal(skillSetNameFromFileName("nsfw_guide(v1.4).zip"), "nsfw_guide");
  assert.equal(skillSetNameFromFileName("skills2.zip"), "skills2");
  const enc = (s) => new TextEncoder().encode(s);
  const r = skillSetFromEntries("p-v2.zip", [{ path: "p/a/SKILL.md", bytes: enc("hi") }, { path: "p/bin", bytes: new Uint8Array([1, 0, 2]) }]);
  assert.equal(r.set.name, "p");
  assert.equal(r.set.files[0].path, "a/SKILL.md");
  assert.equal(r.warnings.length, 1);
});

test("import/export: kind aliases accepted, overwrite keeps id, new dedups name", () => {
  const l = lib();
  const ex = exportSkillSet(l.sets[0]);
  assert.equal(parseSkillExport({ ...ex, kind: "risu-agents.skill-set" }).set.name, "tone");
  assert.equal(parseSkillExport(JSON.stringify(exportSkillLibrary(l))).library.sets.length, 1);
  assert.ok(parseSkillExport("{").error);
  assert.ok(parseSkillExport({ kind: "x" }).error);
  const ow = applySkillSetImport(l, { name: "Tone", files: [{ path: "a/SKILL.md", content: "x" }] }, "overwrite");
  assert.equal(ow.library.sets.length, 1);
  assert.equal(ow.setId, "s1");
  const nw = applySkillSetImport(l, { name: "tone", files: [] }, "new");
  assert.equal(nw.library.sets[1].name, "tone (2)");
  assert.equal(applySkillSetImport(l, { name: "t" }, "cancel").changed, false);
});

test("diagnose + rename folder + readBody strip", () => {
  const set = normalizeSkillSet({ name: "d", files: [{ path: "a/SKILL.md", content: "---\nsystem_prompt: x\n---\n본문" }, { path: "b/n.md", content: "x" }, { path: "r.md", content: "x" }] });
  const texts = diagnoseSkillSet(set).map((i) => i.text).join("|");
  assert.match(texts, /skill_format: 2/);
  assert.match(texts, /b\/에 SKILL\.md가 없어/);
  assert.match(texts, /r\.md/);
  const ren = renameSkillFolder(set, "a", "z");
  assert.deepEqual(ren.files.map((f) => f.path).sort(), ["b/n.md", "r.md", "z/SKILL.md"]);
  assert.equal(renameSkillFolder(set, "a", "b"), set.files.some((f) => f.path.startsWith("b/")) ? null : null);
  const rb = skillReadBody("---\nsystem_prompt: x\n---\n본문");
  assert.equal(rb.text, "본문");
  assert.equal(rb.stripped, true);
});
