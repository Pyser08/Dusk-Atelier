// 자동 기록 진단 문구(순수 함수). 기억 탭 상태 카드에서 쓴다.
const TICK = { ok: "분석했어요", off: "이 봇의 자동 기록이 꺼져 있어요", short: "응답이 짧아서 건너뛰었어요", skip: "'N턴마다' 설정 때문에 건너뛰었어요", done: "이미 기록한 응답이에요", generating: "응답 생성이 끝나길 기다리는 중이에요", "generating-timeout": "생성이 3분 넘게 끝나지 않아 멈췄어요", noai: "분석할 AI 응답이 없어요", nochat: "열린 채팅이 없어요", error: "분석 중 오류가 났어요" };
const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}초 전` : s < 3600 ? `${Math.round(s / 60)}분 전` : `${Math.round(s / 3600)}시간 전`; };
export function diagText(s) {
  const hook = s.hooks ? `출력 훅 ${s.hooks}회(${ago(s.hookAt)})` : "출력 훅 아직 안 불림";
  const tick = s.tick ? `마지막 점검 ${ago(s.tick.at)}: ${TICK[s.tick.result] ?? s.tick.result}${s.tick.error ? " — " + s.tick.error : ""}` : "아직 점검한 적 없음";
  return `${hook} · 화면 갱신 ${s.displays ?? 0}회 · ${tick}`;
}
