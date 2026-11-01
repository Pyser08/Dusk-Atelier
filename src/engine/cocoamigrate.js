// 코코아전트에서 옮겨오기 (v1.8.1, 순수). 코코아전트가 pluginStorage에 남긴 스킬 라이브러리·파이프라인 프리셋을 읽어
// ① 스킬 세트 ② 에이전트별 스킬 할당 → Dusk 단계 추천 ③ (선택) 에이전트의 프롬프트 글 → 스킬 세트 로 바꿀 계획을 만든다.
// 코코아전트 데이터는 읽기만 한다(수정·삭제 없음).
import { normalizeSkillLibrary, normalizeSkillRefs, normalizeSkillSet, SKILL_SLOTS } from "./skills.js";

const parseMaybe = (raw) => { try { return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; } catch { return null; } };
// 코코아 에이전트 필드 → 스킬 슬롯 키
const FIELD = { systemPrompt: "system_prompt", outputInstruction: "output_instruction", outputFormat: "output_format", checklist: "checklist", selfReviewInstruction: "self_check", memoryInstruction: "memory_instruction", memoryFormat: "memory_format" };

// 에이전트가 Dusk의 어느 호출에 해당하는가: 전처리(Director) → director, 기억을 쓰는(record) 후처리 → writer+analysis, 그 밖은 대응 없음.
export function dusStagesOf(agent) {
  if (agent.mode === "pre") return ["director"];
  if (String(agent.postMode || "") === "record" || agent.memoryEnabled === true) return ["writer", "analysis"];
  return [];
}

export function readCocoa({ library, presets }) {
  const lib = normalizeSkillLibrary(parseMaybe(library));
  const store = parseMaybe(presets), out = [];
  for (const p of Array.isArray(store?.presets) ? store.presets : []) {
    for (const [row, r] of (Array.isArray(p?.pipeline?.rows) ? p.pipeline.rows : []).entries()) {
      for (const a of Array.isArray(r?.agents) ? r.agents : []) {
        if (!a || typeof a !== "object") continue;
        const texts = {};
        for (const [f, k] of Object.entries(FIELD)) { const t = String(a[f] ?? "").trim(); if (t) texts[k] = t; }
        const agent = { presetId: String(p.id || ""), presetName: String(p.name || ""), active: p.id === store.activePresetId, row, id: String(a.id || ""), name: String(a.name || a.id || `에이전트 ${row}`), enabled: a.enabled !== false, mode: a.mode === "pre" || row < 4 ? "pre" : "post", postMode: a.postMode, memoryEnabled: a.memoryEnabled === true, skillSets: normalizeSkillRefs(a.skillSets), texts };
        agent.stages = dusStagesOf(agent);
        out.push(agent);
      }
    }
  }
  return { library: lib, agents: out };
}

// 사용 중인 프리셋의 켜진 에이전트가 가리키는 스킬 세트를 Dusk 단계별로 모은다(세트 이름 기준, 중복 제거).
export function suggestStageRefs(agents) {
  const st = { router: [], director: [], writer: [], analysis: [] };
  for (const a of agents) {
    if (!a.active || !a.enabled) continue;
    for (const stage of a.stages) for (const r of a.skillSets) if (!st[stage].some((x) => (x.name || x.id) === (r.name || r.id))) st[stage].push(r);
  }
  return st;
}

const slug = (s) => String(s || "agent").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "agent";
// 블록 스칼라(| )로 쓴다. 빈 줄은 빈 줄로 둔다. 줄 앞 들여쓰기는 2칸 + 원래 들여쓰기.
const block = (k, t) => `${k}: |\n${String(t).split(/\r?\n/).map((l) => (l ? `  ${l}` : "")).join("\n")}`;

// 에이전트의 프롬프트 글 → 스킬 세트. 글이 없으면 null. 기본값이 섞여 있을 수 있어 호출하는 쪽에서 선택하게 한다.
export function agentToSkillSet(agent, now) {
  const keys = SKILL_SLOTS.map((s) => s.key).filter((k) => agent.texts?.[k]);
  if (!keys.length) return null;
  const name = `코코아_${slug(agent.name)}`, folder = slug(agent.name);
  const fm = ["---", `name: ${agent.name}`, `description: 코코아전트 에이전트 '${agent.name}'의 프롬프트를 옮긴 스킬`, "skill_format: 2", "inject_order: 100", ...keys.map((k) => block(k, agent.texts[k])), "---", "코코아전트에서 옮겨온 스킬이에요. 기본값이 섞여 있을 수 있으니 필요한 슬롯만 남겨 주세요.", ""].join("\n");
  return normalizeSkillSet({ name, description: "코코아전트 에이전트 프롬프트", files: [{ path: `${folder}/SKILL.md`, content: fm }] }, 0, now);
}
