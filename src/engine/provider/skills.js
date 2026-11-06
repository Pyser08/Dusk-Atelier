// 스킬 (2.0.0, 순수): 요청에 끼워 넣는 짧은 지침 묶음. 전체 모델 또는 모델 이름 조건(정규식)에만, 스킬마다 토큰 상한.
import { estimateTokens } from "./tokens.js";
export function normalizeSkill(s) {
  return { id: String(s?.id || Math.random().toString(36).slice(2, 10)), name: String(s?.name ?? "스킬").slice(0, 40) || "스킬", enabled: s?.enabled !== false, text: String(s?.text ?? "").slice(0, 20000), models: String(s?.models ?? "").slice(0, 200), maxTokens: Math.max(50, Math.min(8000, Math.floor(Number(s?.maxTokens)) || 1000)) };
}
const matches = (re, model) => { if (!re) return true; try { return new RegExp(re, "i").test(model); } catch { return false; } };
export function clipTokens(text, max) { if (estimateTokens(text) <= max) return text; let lo = 0, hi = text.length; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (estimateTokens(text.slice(0, mid)) <= max) lo = mid; else hi = mid - 1; } return `${text.slice(0, lo)}…`; }
export function skillBlock(skills, { model = "" } = {}) {
  const on = (skills ?? []).filter((s) => s.enabled && s.text.trim() && matches(s.models, model));
  return on.map((s) => `[스킬: ${s.name}]\n${clipTokens(s.text.trim(), s.maxTokens)}`).join("\n\n");
}
