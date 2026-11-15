// 코어 화면이 기억 엔진 전체를 끌어오지 않게 작은 도우미만 따로 둔다(2.2.4 — 기억 엔진은 애드온으로 업데이트).
export const estimateTokens = (t) => { const s = String(t ?? ""); const ko = (s.match(/[\u3131-\u318e\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length; return Math.ceil(ko / 1.5 + (s.length - ko) / 4); };
// 주입하지 않는 이유 코드 → 화면 문구
const REASON_TEXT = {
  "backend-off": "기억 저장소가 꺼져 있어요",
  "inject-off": "주입이 꺼져 있어요",
  "bot-off": "이 봇의 기억이 꺼져 있어요",
  "no-folder": "이 채팅에 저장된 기억이 아직 없어요",
  "before-start-turn": "시작 턴 전이에요",
  "no-memory": "남은 기억이 없어요(분석 기준 응답이 사라졌거나 아직 기록 전이에요)",
  "empty": "이번 요청에 맞게 고른 내용이 없어요(관련 없음 또는 예산 제한)"
};
export const injectReasonText = (reason) => REASON_TEXT[reason] ?? "";
// 임베딩 기본값(코어 첫 설정 화면도 쓴다)
export const DEFAULT_EMBED = Object.freeze({ on: false, url: "https://api.voyageai.com/v1/embeddings", model: "voyage-4-large", timeoutMs: 4000, minSim: 0.32 });
