// 스킬 주입 설정 (v1.8.1, 순수). 켜기/끄기는 장기기억·코코아와 독립. 기본 꺼짐 → 꺼져 있으면 프롬프트는 원문 그대로.
// stages: 호출 단계별로 어느 스킬 세트를 붙일지. router/director/writer = 리수폿 단계, analysis = Dusk 기억 분석.
import { SKILL_SLOTS, composeSlot, resolveSkillInjections, normalizeSkillRefs } from "./skills.js";

export const SKILL_STAGES = ["router", "director", "writer", "analysis"];
export const SKILL_STAGE_LABEL = { router: "관련 인물 고르기", director: "정리 노트", writer: "기록하기", analysis: "기억 분석" };

export function defaultSkillCfg() { return { v: 1, on: false, stages: Object.fromEntries(SKILL_STAGES.map((s) => [s, []])) }; }
export function normalizeSkillCfg(raw) {
  const d = defaultSkillCfg();
  if (!raw || typeof raw !== "object") return d;
  for (const s of SKILL_STAGES) d.stages[s] = normalizeSkillRefs(raw.stages?.[s]);
  d.on = raw.on === true;
  return d;
}

// 단계에 붙일 글 블록 하나로 합친다(슬롯 순서대로). 주입이 없으면 "".
export function injectionBlock(inj) {
  if (!inj || !inj.skills?.length) return "";
  return SKILL_SLOTS.map((s) => composeSlot(s.id, "", inj)).filter(Boolean).join("\n\n");
}
export function stageInjection(cfg, lib, stage) {
  if (!cfg?.on) return null;
  const refs = cfg.stages?.[stage];
  if (!refs?.length) return null;
  return resolveSkillInjections(refs, lib);
}

// 문자열 프롬프트(리수폿 단계)·메시지 배열(기억 분석) 뒤에 덧붙인다. 블록이 없으면 같은 값을 그대로 돌려준다.
export function appendToPrompt(prompt, block) { return block ? `${prompt}\n\n${block}` : prompt; }
export function appendToMessages(messages, block) {
  if (!block || !Array.isArray(messages)) return messages;
  const out = messages.map((m) => ({ ...m }));
  let i = -1;
  for (let k = out.length - 1; k >= 0; k--) if (out[k]?.role === "system" && typeof out[k].content === "string") { i = k; break; }
  if (i < 0) { out.unshift({ role: "system", content: block }); return out; }
  out[i].content = `${out[i].content}\n\n${block}`;
  return out;
}
