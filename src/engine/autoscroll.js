// 오토 스크롤 (애드온 전용, 순수): 속도 단계·한 번에 내려갈 거리·마지막 AI 응답 찾기.
// 리스 화면 DOM을 움직이는 쪽은 addons/autoscroll/runner.js.

export const SPEED_MIN = 10, SPEED_MAX = 400, SPEED_DEF = 60;   // 초당 픽셀
// 떠 있는 조절 막대의 −/+ 가 오가는 단계
export const SPEED_STEPS = [10, 15, 20, 30, 40, 50, 60, 80, 100, 130, 160, 200, 260, 330, 400];
// 설정 화면의 빠른 고르기
export const SPEED_PRESETS = [["느리게", 30], ["보통", 60], ["빠르게", 120], ["아주 빠르게", 220]];

export function clampSpeed(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, n)) : SPEED_DEF;
}

// −(dir<0) / +(dir>0): 지금 값의 바로 아래·위 단계로. 단계 사이 값이면 가까운 쪽 단계로 간다.
export function nudgeSpeed(cur, dir) {
  const v = clampSpeed(cur);
  if (dir > 0) return SPEED_STEPS.find((s) => s > v) ?? SPEED_MAX;
  return [...SPEED_STEPS].reverse().find((s) => s < v) ?? SPEED_MIN;
}

// dt(ms) 동안 내려갈 위치. 탭이 잠깐 멈췄다 돌아와도 한 번에 크게 뛰지 않게 dt를 자른다.
export function stepY(y, speed, dtMs, maxDt = 100) {
  const dt = Math.min(maxDt, Math.max(0, Number(dtMs) || 0));
  return y + clampSpeed(speed) * dt / 1000;
}

// 채팅 메시지 배열에서 마지막 AI(char) 응답의 번호. 없으면 -1.
export function lastCharIndex(messages) {
  if (!Array.isArray(messages)) return -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "char") return i;
  return -1;
}

export const speedLabel = (v) => {
  const s = clampSpeed(v), p = SPEED_PRESETS.find(([, n]) => n === s);
  return p ? `${p[0]} (${s})` : String(s);
};
