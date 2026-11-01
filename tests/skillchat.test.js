import test from "node:test";
import assert from "node:assert/strict";
import { extractSkillFiles, stripSkillFiles, mergeDraft, draftName, draftToSet, skillChatSystem, trimChat } from "../src/engine/skillchat.js";
import { SKILL_GUIDE } from "../src/data/skillguide.js";

const reply = `만들었어요.
<skill-file path="combat-referee/SKILL.md">
---
name: combat-referee
description: Combat rules. Use when a fight starts.
skill_format: 2
system_prompt: |
  === GATE ===
  Apply when force is exchanged.
---
# Combat
\`\`\`
본문 안의 코드 펜스도 그대로
\`\`\`
</skill-file>
<skill-file path="combat-referee/references/weapons.md">
무기표
</skill-file>
다듬고 싶은 곳을 말해 주세요.`;

test("답에서 파일 블록을 뽑고 본문 속 코드 펜스를 보존한다", () => {
  const f = extractSkillFiles(reply);
  assert.deepEqual(f.map((x) => x.path), ["combat-referee/SKILL.md", "combat-referee/references/weapons.md"]);
  assert.ok(f[0].content.includes("```\n본문 안의 코드 펜스도 그대로\n```"));
  assert.ok(f[0].content.startsWith("---\nname: combat-referee"));
});
test("닫히지 않은 블록·위험한 경로는 버린다", () => {
  assert.equal(extractSkillFiles('<skill-file path="a/SKILL.md">\n내용만').length, 0);
  assert.equal(extractSkillFiles('<skill-file path="../x/SKILL.md">\nz\n</skill-file>').length, 0);
  assert.equal(extractSkillFiles('<skill-file path="/a/SKILL.md">\nz\n</skill-file>')[0].path, "a/SKILL.md");
});
test("설명 글에서는 파일 블록을 뺀다(닫히지 않은 것 포함)", () => {
  assert.equal(stripSkillFiles(reply), "만들었어요.\n\n다듬고 싶은 곳을 말해 주세요.");
  assert.equal(stripSkillFiles("앞\n<skill-file path=\"a/SKILL.md\">\n쓰는 중"), "앞");
});
test("초안 합치기: 같은 경로는 교체, 새 경로는 추가, 빈 입력은 그대로", () => {
  const d = mergeDraft([], extractSkillFiles(reply));
  assert.equal(d.length, 2);
  const d2 = mergeDraft(d, [{ path: "combat-referee/references/weapons.md", content: "새 무기표\n" }, { path: "combat-referee/references/recovery.md", content: "회복\n" }]);
  assert.equal(d2.length, 3); assert.equal(d2.find((f) => f.path.endsWith("weapons.md")).content, "새 무기표\n");
  assert.equal(mergeDraft(d2, []), d2);
});
test("초안 → 세트: 이름은 SKILL.md 폴더, 인덱스에 잡히고 점검이 통과한다", () => {
  const d = mergeDraft([], extractSkillFiles(reply));
  assert.equal(draftName(d), "combat-referee");
  const { set, diag } = draftToSet(d);
  assert.equal(set.name, "combat-referee"); assert.equal(set.files.length, 2);
  assert.equal(diag.filter((x) => x.level === "warn").length, 0);
});
test("시스템 글에 가이드 원문·출력 규칙·초안·기존 세트 이름이 들어간다", () => {
  assert.ok(SKILL_GUIDE.includes("주입 슬롯 7개") && SKILL_GUIDE.includes("system_prompt"));
  const d = mergeDraft([], extractSkillFiles(reply));
  const s = skillChatSystem(SKILL_GUIDE, d, { existing: ["new_guide"] });
  assert.ok(s.includes("# SKILL GUIDE") && s.includes("<skill-file path=") && s.includes("- new_guide") && s.includes('path="combat-referee/SKILL.md"'));
  assert.ok(!skillChatSystem(SKILL_GUIDE, []).includes("지금까지 만든 초안"));
});
test("대화가 길면 첫 메시지를 남기고 오래된 쪽을 자른다", () => {
  const m = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: String(i) }));
  const t = trimChat(m, 10);
  assert.equal(t.length, 10); assert.equal(t[0].content, "0"); assert.equal(t.at(-1).content, "29");
  assert.equal(trimChat(m.slice(0, 4), 10).length, 4);
});
