// 프로바이더 카탈로그 (v1.9.3): 공급자별 기본 주소·요청 형식. 순수 데이터.
// format: openai(chat/completions) · responses(OpenAI Responses) · anthropic(messages) · gemini(generateContent) · vertex(Vertex Gemini/Claude)
export const FORMATS = Object.freeze(["openai", "responses", "anthropic", "gemini", "vertex"]);
export const KINDS = Object.freeze({
  openai: { label: "OpenAI", format: "openai", baseUrl: "https://api.openai.com/v1", models: "/models", auth: "bearer", reasoning: true },
  anthropic: { label: "Anthropic", format: "anthropic", baseUrl: "https://api.anthropic.com/v1", models: "/models", auth: "x-api-key" },
  google: { label: "Gemini Studio", format: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: "/models", auth: "goog" },
  vertex: { label: "Vertex AI", format: "vertex", baseUrl: "", auth: "vertex" },
  deepseek: { label: "DeepSeek", format: "openai", baseUrl: "https://api.deepseek.com/v1", models: "/models", auth: "bearer" },
  openrouter: { label: "OpenRouter", format: "openai", baseUrl: "https://openrouter.ai/api/v1", models: "/models", auth: "bearer" },
  nanogpt: { label: "NanoGPT", format: "openai", baseUrl: "https://nano-gpt.com/api/v1", models: "/models", auth: "bearer" },
  vercel: { label: "Vercel AI Gateway", format: "openai", baseUrl: "https://ai-gateway.vercel.sh/v1", models: "/models", auth: "bearer" },
  llmgateway: { label: "LLM Gateway", format: "openai", baseUrl: "https://api.llmgateway.io/v1", models: "/models", auth: "bearer" },
  ollama: { label: "Ollama", format: "openai", baseUrl: "https://ollama.com/v1", models: "/models", auth: "bearer", keyOptional: true },
  neuralwatt: { label: "Neuralwatt", format: "openai", baseUrl: "https://api.neuralwatt.com/v1", models: "/models", auth: "bearer" },
  wellspring: { label: "Wellspring", format: "openai", baseUrl: "", models: "/models", auth: "bearer" },
  copilot: { label: "GitHub Copilot", format: "openai", baseUrl: "https://api.githubcopilot.com", auth: "copilot" },
  custom: { label: "직접 입력(OpenAI 호환)", format: "openai", baseUrl: "", models: "/models", auth: "bearer", keyOptional: true }
});
export const kindOf = (k) => KINDS[k] ?? KINDS.custom;
// 리스 요청 mode → 용도
export const PURPOSES = Object.freeze(["main", "translate", "emotion", "memory", "other", "analysis"]);
export const PURPOSE_LABEL = Object.freeze({ main: "메인 대화", translate: "번역", emotion: "감정", memory: "메모리(요약)", other: "보조·기타", analysis: "Dusk 자체 AI(기억 분석 등)" });
export const purposeOfMode = (mode) => ({ model: "main", translate: "translate", emotion: "emotion", memory: "memory", submodel: "other", otherAx: "other", other: "other", polish: "other", checklist: "other" }[mode] ?? "main");
const REASONING_MODEL = /^(?:.*\/)?(?:o\d|gpt-5)/i;
export const isReasoningModel = (m) => REASONING_MODEL.test(String(m || ""));
