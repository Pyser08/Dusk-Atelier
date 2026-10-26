import { extractRunAIText } from './airesponse.js';

export async function runAI(api, messages, pick, signal) {
  const opts = { messages, mode: pick?.mode && pick.mode !== "static" ? pick.mode : "submodel", allowPlugins: true };
  if (pick?.mode === "static" && pick.staticModel) opts.staticModel = pick.staticModel;

  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (signal?.aborted) throw new Error("AI 작업을 취소했어요.");
    try {
      const res = await api.runLLMModel(opts);
      if (signal?.aborted) throw new Error("AI 작업을 취소했어요.");
      const text = extractRunAIText(res) ?? "";
      if (text) return text;
      const detail = res && typeof res === "object"
        ? [(res.type && res.type !== "success" ? res.type : ""), res.error, res.message, res.result].filter((v) => typeof v === "string" && v.trim()).join(": ").slice(0, 500)
        : "";
      last = new Error(detail || (res == null ? "RisuAI가 빈 응답을 반환했어요." : `응답 본문을 읽을 수 없어요 (형식: ${typeof res}, 상태: ${res?.type ?? "없음"}).`));
    } catch (e) {
      if (signal?.aborted) throw e;
      last = e;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1200));
  }
  throw last ?? new Error("AI 응답을 받지 못했어요.");
}
