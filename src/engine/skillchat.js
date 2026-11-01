// AI와 대화하며 스킬 만들기(순수, v1.8.1): 시스템 글 만들기, 답에서 파일 뽑기, 초안 합치기·점검.
// 별도 AI 호출은 만들지 않는다 — 사용자가 보내는 메시지마다 한 번 부른다.
import { normalizeSkillSet, diagnoseSkillSet, SKILL_MD, SKILL_LIMITS } from "./skills.js";

const OPEN = /<skill-file\s+path="([^"\n]{1,160})"\s*>\r?\n?/g;
// 답에서 <skill-file path="폴더/SKILL.md">…</skill-file> 블록을 모두 뽑는다. 닫히지 않은 블록은 버린다.
export function extractSkillFiles(text) {
  const out = [], s = String(text ?? "");
  OPEN.lastIndex = 0;
  for (let m; (m = OPEN.exec(s));) {
    const start = OPEN.lastIndex, end = s.indexOf("</skill-file>", start);
    if (end < 0) break;
    const path = m[1].trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (path && !path.split("/").includes("..")) out.push({ path, content: s.slice(start, end).replace(/\s+$/, "") + "\n" });
    OPEN.lastIndex = end + "</skill-file>".length;
  }
  return out;
}
// 블록을 뺀 설명 글(말풍선에 보여 줄 것).
export function stripSkillFiles(text) {
  return String(text ?? "").replace(/<skill-file\s+path="[^"\n]*"\s*>[\s\S]*?(<\/skill-file>|$)/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
// 초안(파일 목록)에 새 파일을 합친다: 같은 경로는 바꾸고, 새 경로는 더한다. 쓸 만한 변화가 없으면 같은 배열.
export function mergeDraft(draft, incoming) {
  if (!incoming?.length) return draft;
  const map = new Map(draft.map((f) => [f.path, f]));
  for (const f of incoming) map.set(f.path, { path: f.path, content: f.content });
  return [...map.values()];
}
// 초안의 세트 이름: 첫 SKILL.md의 폴더 이름. 없으면 첫 파일의 폴더.
export function draftName(draft) {
  const f = draft.find((x) => x.path.endsWith(`/${SKILL_MD}`)) ?? draft[0];
  return f ? (f.path.includes("/") ? f.path.split("/")[0] : "new-skill") : "";
}
// 초안 → 세트. 라이브러리에 넣을 모양과 점검 결과를 돌려준다.
export function draftToSet(draft, name = draftName(draft)) {
  const set = normalizeSkillSet({ name: name || "new-skill", files: draft.map((f) => ({ path: f.path, content: f.content })) }, 0);
  return { set, diag: diagnoseSkillSet(set) };
}

const FORMAT = [
  "## 출력 규칙 (이 앱 전용 — 가이드보다 우선)",
  "- 대화는 자연스러운 한국어로 한다. 처음에는 만들 스킬의 용도·언제 쓰는지·넣을 규칙을 한두 가지만 짧게 물어보고, 충분히 알면 바로 만든다. 질문을 길게 늘어놓지 않는다.",
  "- 스킬 파일을 쓸 때는 반드시 아래 형식의 블록으로 쓴다. 코드 펜스(```)로 감싸지 말고, 파일 전체 내용을 넣는다. 고칠 때도 바뀐 파일의 **전체 내용**을 다시 쓴다.",
  '<skill-file path="폴더이름/SKILL.md">',
  "---",
  "name: …",
  "description: …",
  "skill_format: 2",
  "system_prompt: |",
  "  …",
  "---",
  "본문…",
  "</skill-file>",
  "- 경로는 항상 `폴더이름/SKILL.md` 또는 `폴더이름/references/….md` 형식이다. SKILL.md가 없으면 스킬로 인식되지 않는다. 폴더 이름은 영문 소문자·숫자·하이픈으로 짓는다.",
  "- 가이드 §4~§5를 지킨다: 덧붙이기 전용, 계약은 슬롯에·긴 설명은 references에, 언어 통일, `[Skill Injection` 마커 흉내 금지, 슬롯 하나는 12,000자 이하.",
  "- 블록 앞뒤에는 무엇을 만들었는지·어디를 고쳤는지 두세 문장만 쓴다. 파일 내용을 설명 글에 다시 풀어 쓰지 않는다.",
  "- 사용자가 만들기를 바라지 않으면 블록을 쓰지 않는다."
].join("\n");

// 시스템 글: 가이드 원문 + 출력 규칙 + 지금까지의 초안.
export function skillChatSystem(guide, draft = [], { existing = [] } = {}) {
  const parts = ["You help the user write a cocoA(gent!)-compatible skill set for a roleplay plugin. Follow the guide below exactly; never invent slot names or limits.", "# SKILL GUIDE\n" + guide, FORMAT];
  if (existing.length) parts.push("## 이미 있는 스킬 세트 이름\n" + existing.slice(0, 40).map((n) => `- ${n}`).join("\n") + "\n(겹치지 않는 폴더 이름을 쓴다.)");
  if (draft.length) parts.push("## 지금까지 만든 초안 (사용자가 이어서 고쳐 달라고 할 수 있다)\n" + draft.map((f) => `<skill-file path="${f.path}">\n${f.content.replace(/\s+$/, "")}\n</skill-file>`).join("\n"));
  return parts.join("\n\n");
}
export const SKILL_CHAT_LIMITS = Object.freeze({ turns: 24, fileChars: SKILL_LIMITS.fileChars });
// 대화가 너무 길어지면 오래된 쪽부터 자른다(첫 사용자 메시지는 남겨 목적을 잃지 않게 한다).
export function trimChat(messages, max = SKILL_CHAT_LIMITS.turns) {
  if (messages.length <= max) return messages;
  return [messages[0], ...messages.slice(messages.length - (max - 1))];
}
