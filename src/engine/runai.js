import { extractRunAIText } from './airesponse.js';

const isStream = (v) => v && typeof v === "object" && typeof v.getReader === "function";
// 보조 모델이 {type:"streaming", result: ReadableStream}로 답하면 끝까지 읽어 한 문자열로 만든다.
// 청크가 객체({키: 지금까지의 전체 글})면 마지막 값이 전체이고, 문자열이면 조각이므로 이어 붙인다.
export async function drainStream(stream, signal) {
  const reader = stream.getReader();
  let text = "", whole = "";
  try {
    for (;;) {
      if (signal?.aborted) { try { await reader.cancel(); } catch {} throw new Error("AI 작업을 취소했어요."); }
      const { done, value } = await reader.read();
      if (value != null) {
        if (typeof value === "string") text += value;
        else if (typeof value === "object") { const k = Object.keys(value)[0]; if (k != null && typeof value[k] === "string") whole = value[k]; }
      }
      if (done) break;
    }
  } finally { try { reader.releaseLock(); } catch {} }
  return (whole || text).trim();
}
export async function settleResponse(res, signal) {
  if (isStream(res)) return drainStream(res, signal);
  if (res && typeof res === "object" && isStream(res.result) && (res.type === "streaming" || res.type === "success")) return drainStream(res.result, signal);
  return res;
}

// 내 API 모델(pick.mode === "custom")은 data/modelhub.js가 등록한 실행기로 보낸다. 리스 보조 모델 경로는 그대로.
let customRunner = null;
export function setCustomRunner(fn) { customRunner = fn; }

export async function runAI(api, messages, pick, signal) {
  if (pick?.mode === "custom") {
    if (!customRunner) throw new Error("내 API 모델을 쓸 수 없어요 (모델 설정이 아직 준비되지 않았어요).");
    return customRunner(api, messages, pick, signal);
  }
  const opts = { messages, mode: pick?.mode && pick.mode !== "static" ? pick.mode : "submodel", allowPlugins: true };
  if (pick?.mode === "static" && pick.staticModel) opts.staticModel = pick.staticModel;

  let last = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (signal?.aborted) throw new Error("AI 작업을 취소했어요.");
    try {
      const res = await settleResponse(await api.runLLMModel(opts), signal);
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
