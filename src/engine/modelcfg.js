// 모델 설정 순수 로직 (v1.6.4 3단계) — 리수폿 모델 프리셋을 Dusk AI 선택(pick)으로 잇는다.
// 저장 모양: { v:1, easy:{kind:"risuai"|"api", presetId}, presets:[{id,name,preset}], stages:{router|director|writer:{mode:"shared"|"dedicated", presetId}} }
import { createModelPreset, validateModelPreset } from "./pot/model-options.js";

export const STAGES = ["router", "director", "writer"];
// 사용자에게 보이는 이름 (리수폿 고유 용어는 고급 설정에서만 괄호로 병기)
export const STAGE_LABEL = { router: "관련 인물 고르기", director: "정리 노트", writer: "기록하기" };

const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultCfg() {
  return { v: 1, easy: { kind: "risuai", presetId: "" }, presets: [], stages: Object.fromEntries(STAGES.map((s) => [s, { mode: "shared", presetId: "" }])) };
}

export function normalizeCfg(raw) {
  const d = defaultCfg();
  if (!raw || typeof raw !== "object") return d;
  const presets = [];
  for (const p of Array.isArray(raw.presets) ? raw.presets : []) {
    if (!p?.id || !p.preset) continue;
    try { presets.push({ id: String(p.id), name: String(p.name || p.preset.name || "모델").slice(0, 40), preset: validateModelPreset(p.preset) }); } catch { /* 깨진 프리셋은 버린다 */ }
  }
  const has = (id) => presets.some((p) => p.id === id);
  const easy = { kind: raw.easy?.kind === "api" && has(raw.easy?.presetId) ? "api" : "risuai", presetId: has(raw.easy?.presetId) ? raw.easy.presetId : "" };
  const stages = {};
  for (const s of STAGES) {
    const r = raw.stages?.[s];
    stages[s] = r?.mode === "dedicated" && has(r.presetId) ? { mode: "dedicated", presetId: r.presetId } : { mode: "shared", presetId: "" };
  }
  return { v: 1, easy, presets, stages };
}

export function addPreset(cfg, name, model = "", over = {}) {
  const id = uid();
  const preset = validateModelPreset({ ...createModelPreset(name, model), ...over, name });
  return { cfg: { ...cfg, presets: [...cfg.presets, { id, name: String(name || "모델").slice(0, 40), preset }] }, id };
}
export function removePreset(cfg, id) {
  return normalizeCfg({ ...cfg, presets: cfg.presets.filter((p) => p.id !== id) });
}
export function updatePreset(cfg, id, preset) {
  return { ...cfg, presets: cfg.presets.map((p) => (p.id === id ? { ...p, preset: validateModelPreset(preset), name: String(preset.name || p.name).slice(0, 40) } : p)) };
}
export const presetOf = (cfg, id) => cfg.presets.find((p) => p.id === id)?.preset ?? null;

// 단계(또는 일반 호출)가 쓸 모델 선택. null이면 리스 보조 모델(기존 방식).
export function pickFor(cfg, stage) {
  const st = stage && cfg.stages?.[stage];
  const id = st?.mode === "dedicated" ? st.presetId : cfg.easy.kind === "api" ? cfg.easy.presetId : "";
  return id && presetOf(cfg, id) ? { mode: "custom", presetId: id } : null;
}

// 메시지 배열 → 리수폿 클라이언트가 받는 한 덩어리 프롬프트. JSON을 요구하지 않는 작업(번역·첫 메시지 등)은
// 클라이언트가 항상 "JSON 하나만"을 요구하므로 {"text": …}로 감싸 달라고 하고 나중에 벗긴다.
const mentionsJson = (t) => /json/i.test(t);
export function toPrompt(messages) {
  const parts = (messages || []).map((m) => `[${String(m.role || "user").toUpperCase()}]\n${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`);
  const body = parts.join("\n\n");
  if (mentionsJson(body)) return { prompt: body, wrapped: false };
  return { prompt: `${body}\n\n[FORMAT]\nReturn one JSON object {"text": "<your full answer as a string>"} and nothing else.`, wrapped: true };
}
export function fromReply(text, wrapped) {
  if (!wrapped) return text;
  try {
    const t = String(text).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
    const o = JSON.parse(t);
    if (o && typeof o.text === "string") return o.text;
  } catch { /* 감싸지 않은 답은 그대로 */ }
  return text;
}

// 토큰 사용량 누적 (단계별 + 합계)
export function emptyUsage() { return { total: { calls: 0, input: 0, output: 0 }, by: {} }; }
export function addUsage(u, stage, usage) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const inp = n(usage?.inputTokens ?? usage?.input ?? usage?.promptTokens), out = n(usage?.outputTokens ?? usage?.output ?? usage?.completionTokens);
  const k = stage || "tools", cur = u.by[k] || { calls: 0, input: 0, output: 0 };
  return { total: { calls: u.total.calls + 1, input: u.total.input + inp, output: u.total.output + out }, by: { ...u.by, [k]: { calls: cur.calls + 1, input: cur.input + inp, output: cur.output + out } } };
}

// 리수폿 설정(models·useRisuSubmodel)에 넣을 값. 고른 모델이 하나도 없으면 리스 보조 모델만 쓴다(useRisuSubmodel).
export function potModels(cfg) {
  const picks = Object.fromEntries(STAGES.map((s) => [s, pickFor(cfg, s)]));
  if (STAGES.every((s) => !picks[s])) return { useRisuSubmodel: true };
  const risu = () => { const p = { ...createModelPreset("리스 보조 모델"), provider: "risuai", baseUrl: "", model: "RisuAI 보조모델", reasoningQuickSetting: "default", vertexPaygoTier: "default", extraBodyJson: "", receiveContextAsPdf: false }; delete p.pdfMode; return validateModelPreset(p); };
  const shared = cfg.easy.kind === "api" ? presetOf(cfg, cfg.easy.presetId) : risu();
  const stages = Object.fromEntries(STAGES.map((s) => [s, picks[s] && cfg.stages[s].mode === "dedicated" ? { mode: "dedicated", preset: presetOf(cfg, cfg.stages[s].presetId) } : { mode: "shared" }]));
  return { useRisuSubmodel: false, shared, stages };
}
