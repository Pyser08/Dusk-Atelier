// 페르소나 빌더 SOP 흐름: 초안 → 검토 보고서 → 최종 다듬기 (data/personasop.js, aibuild 애드온 전용)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseTemplate, compose, fieldKey } from "../src/data/personabuilder.js";
import { SOP_TEMPLATE, SOP_DRAFT, SOP_REVIEW, SOP_FINAL, ensureSop, readSheet, writableKeys, buildStepPrompt, buildReviewPrompt, buildFinalPrompt, parseReport, stepPrompt, estimateTokens, lineDiff, cleanTags, aiCode2, readAiCode2 } from "../src/data/personasop.js";

const secs = parseTemplate(SOP_TEMPLATE);

test("SOP 양식은 사용자 시트의 섹션·항목을 모두 칸으로 갖는다", () => {
  const titles = secs.map((s) => s.title);
  for (const t of ["Basic Information", "Appearance", "Core Identity", "Emotional / Stress Pattern", "Decision / Failure Pattern", "Interpersonal Style", "Key Relationship", "Sexuality", "Speech / Voice / Language", "Physical Mannerisms / Nonverbal Expression", "Skills / Limits", "Background Seed", "Preferences / Secrets"]) assert.ok(titles.includes(t), t);
  assert.ok(secs.every((s) => s.kind === "fields"));
  const n = secs.reduce((a, s) => a + s.fields.length, 0);
  assert.equal(n, 75);
  const core = secs.find((s) => s.title === "Core Identity");
  assert.equal(core.fields[0].label, "Core Premise");
  assert.equal(core.fields[0].ko, "핵심 전제");
  assert.match(core.fields[0].hint, /above all else/);
});

test("첨부 SOP 시트의 항목 이름이 양식에 빠짐없이 있다", () => {
  const src = fs.readFileSync(new URL("./fixtures/sop-sheet.txt", import.meta.url), "utf8");
  const labels = [...src.matchAll(/^- ([^:]+):/gm)].map((m) => m[1].trim());
  const have = new Set(secs.flatMap((s) => s.fields.map((f) => f.label)));
  assert.equal(labels.length, 75);
  for (const l of labels) assert.ok(have.has(l), l);
});

test("단계 지침 기본값은 사용자 제공 문구 그대로이고, 프리셋에 적으면 그것을 쓴다", () => {
  assert.match(SOP_DRAFT, /^Instruction: Generate a broad first-draft SOP sheet/);
  assert.match(SOP_REVIEW, /^OOC: Review the completed SOP sheet above\. Do not rewrite it yet\./);
  assert.match(SOP_FINAL, /Output revised SOP sheet only\.$/);
  assert.equal(stepPrompt({}, "review"), SOP_REVIEW);
  assert.equal(stepPrompt({ sopReview: "  my audit  " }, "review"), "my audit");
});

test("처음 열면 SOP 양식이 생기고, 쓰던 내용이 없을 때만 SOP 양식을 고른다", () => {
  const a = { templates: [{ id: "default", text: "### A\n* X:" }], template: "default", draft: null };
  assert.equal(ensureSop(a), true);
  assert.equal(a.template, "sop");
  assert.equal(a.templates[1].id, "sop");
  assert.equal(ensureSop(a), false);
  const b = { templates: [{ id: "default", text: "" }], template: "default", draft: { values: { "A::X": "hi" } } };
  ensureSop(b);
  assert.equal(b.template, "default");
  // 사용자가 기본 양식으로 되돌린 뒤에는 다시 바꾸지 않는다
  a.template = "default";
  ensureSop(a);
  assert.equal(a.template, "default");
});

test("들여 쓴 하위 목록도 그 항목 값으로 읽는다", () => {
  const out = `### Core Identity
- Core Premise: Mina is, above all else, a keeper of debts.
- Mask / Leak System:
  - Fear → mask: jokes / leak: counts exits
  - Anger → mask: politeness / leak: clipped vowels
- Untouchable: her brother's watch`;
  const v = readSheet(secs, out);
  assert.equal(v[fieldKey("Core Identity", "Core Premise")], "Mina is, above all else, a keeper of debts.");
  assert.equal(v[fieldKey("Core Identity", "Mask / Leak System")], "Fear → mask: jokes / leak: counts exits | Anger → mask: politeness / leak: clipped vowels");
  assert.equal(v[fieldKey("Core Identity", "Untouchable")], "her brother's watch");
});

test("초안 프롬프트: 1단계 지침·콘셉트·양식 구조가 들어가고 모든 칸을 쓰게 한다", () => {
  const { messages, target } = buildStepPrompt({ sections: secs, values: {}, task: "draft", concept: "night clerk", preset: {} });
  assert.equal(target, null);
  const u = messages[1].content;
  assert.ok(u.startsWith(SOP_DRAFT));
  assert.match(u, /night clerk/);
  assert.equal((u.split("Structure:")[1].match(/<<WRITE/g) ?? []).length, 75);
  assert.match(messages[0].content, /ENGLISH only/);
});

test("빈 칸 채우기는 빈 칸만, 꺼진 섹션은 빼고 표시한다", () => {
  const values = { [fieldKey("Basic Information", "Name")]: "Mina" };
  const off = { Sexuality: true };
  const { target, messages } = buildStepPrompt({ sections: secs, values, off, task: "fill", preset: {} });
  assert.ok(!target.has(fieldKey("Basic Information", "Name")));
  assert.ok(!target.has(fieldKey("Sexuality", "Limits")));
  assert.equal(target.size, 75 - 1 - 12);
  assert.doesNotMatch(messages[1].content, /### Sexuality/);
});

test("검토 프롬프트는 사용자 OOC 흐름 그대로: 요청 → 시트 → 검토 OOC", () => {
  const values = { [fieldKey("Basic Information", "Name")]: "Mina" };
  const m = buildReviewPrompt({ sections: secs, values, preset: {} });
  assert.deepEqual(m.map((x) => x.role), ["system", "user", "assistant", "user"]);
  assert.match(m[2].content, /- Name: Mina|\* Name: Mina/);
  assert.equal(m[3].content, SOP_REVIEW);
});

test("최종 프롬프트는 고른 항목만 적용 결정으로 보내고 메모를 덧붙인다", () => {
  const values = { [fieldKey("Basic Information", "Name")]: "Mina" };
  const picked = [{ cat: "CUT", text: "Appearance > Scent: decorative" }];
  const m = buildFinalPrompt({ sections: secs, values, preset: {}, report: "## CUT\n- a\n- b", picked, notes: "keep speech" });
  assert.deepEqual(m.map((x) => x.role), ["system", "user", "assistant", "user", "assistant", "user"]);
  const last = m[5].content;
  assert.ok(last.startsWith(SOP_FINAL));
  assert.match(last, /\[CUT\] Appearance > Scent: decorative/);
  assert.match(last, /keep speech/);
  assert.equal(m[4].content, "## CUT\n- a\n- b");
});

test("검토 보고서를 분류별 항목으로 나눈다 (머리글·굵은 글씨·줄 안 분류·하위 목록)", () => {
  const r = parseReport(`Here is the audit.

## KEEP
- Core Identity > Core Premise: drives everything — keep.

**CUT:**
1. Appearance > Scent: decorative — no output value
2. Basic Information > Residence: unused
   - suggestion: drop entirely

### MACRO RISK
- Physical Mannerisms > Tells: jaw clench carries every emotion — add 2 alternatives
- **TOKEN WASTE**: repeated name "Mina" in Core Identity

MERGE: Root Mechanism and Decision Route overlap — combine.`);
  assert.deepEqual(r.map((x) => x.cat), ["KEEP", "CUT", "CUT", "MACRO RISK", "TOKEN WASTE", "MERGE"]);
  assert.match(r[2].text, /unused · suggestion: drop entirely/);
  assert.ok(r.every((x) => x.on));
  assert.equal(parseReport("no structure at all").length, 0);
});

test("최종본 적용 대상 칸 = 켜진 섹션의 칸 전체", () => {
  const keys = writableKeys(secs, { Sexuality: true });
  assert.equal(keys.length, 75 - 12);
});

test("토큰 추정·줄 비교·태그 정리·DPA2 공유 코드", () => {
  assert.equal(estimateTokens("abcd".repeat(10)), 10);
  assert.equal(estimateTokens("가나다"), 3);
  const d = lineDiff("a\nb\nc", "a\nx\nc");
  assert.deepEqual(d.map((x) => x.t), ["same", "del", "add", "same"]);
  assert.equal(cleanTags("```\n1girl, black hair,\n- red eyes.\n1girl"), "1girl, black hair, red eyes");
  let n = 0;
  const code = aiCode2({ name: "P", mode: "submodel", sopReview: "R" });
  const r = readAiCode2(`share: ${code}`, { mode: "submodel", extra: "" }, () => "id" + ++n);
  assert.equal(r.value.sopReview, "R");
  assert.equal(r.value.id, "id1");
  assert.equal(readAiCode2("DPA1:xx", {}, () => ""), null);
});

test("코어는 personasop.js를 가져오지 않는다 (애드온 전용 — 코어 2.0.7에서도 애드온이 켜짐)", () => {
  const lib = fs.readFileSync(new URL("../src/addonlib.gen.js", import.meta.url), "utf8");
  assert.doesNotMatch(lib, /personasop/);
});

test("compose 결과를 다시 읽으면 같은 값 (SOP 양식)", () => {
  const values = { [fieldKey("Speech / Voice / Language", "Voice")]: "Low | slow", [fieldKey("Preferences / Secrets", "Hidden Truth")]: "x" };
  assert.deepEqual(readSheet(secs, compose(secs, values)), values);
});
