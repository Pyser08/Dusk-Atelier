// 게이지 배수(순수): 전체 채팅에서 계산되는 게이지(장기 기억 감정·위키 호감도·기본 성격·Erosync 매 턴 계산)가
// 오르고 내리는 폭에 곱하는 값. 오를 때(up)·내릴 때(down) 따로. 1이 원래대로, 0이면 그 방향으로 움직이지 않는다.
export const GAUGE_KEY = "dusk.gauge.mult";
export const GAUGE_MULT_MIN = 0, GAUGE_MULT_MAX = 3;
export const GAUGE_DEFAULT = Object.freeze({ up: 1, down: 1 });

const one = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.max(GAUGE_MULT_MIN, Math.min(GAUGE_MULT_MAX, n)) * 10) / 10 : 1; };
export function normalizeGauge(v) {
  const s = v && typeof v === "object" ? v : {};
  return { up: s.up == null ? 1 : one(s.up), down: s.down == null ? 1 : one(s.down) };
}
export const isDefaultGauge = (g) => { const n = normalizeGauge(g); return n.up === 1 && n.down === 1; };

// 정수 변화량 d에 배수를 곱한다. 0.5배여도 1칸 변화는 사라지지 않게(0이 아닌 배수면 최소 1칸), 0배면 0.
// max: 한 번에 움직일 수 있는 최대 폭(있으면 그 안으로).
export function scaleDelta(d, g, { max = Infinity } = {}) {
  const n = Number(d);
  if (!Number.isFinite(n) || n === 0) return 0;
  const m = normalizeGauge(g)[n > 0 ? "up" : "down"];
  if (m === 1) return n;
  if (m === 0) return 0;
  const v = Math.max(1, Math.round(Math.abs(n) * m));
  return Math.sign(n) * Math.min(max, v);
}

// 지금 값 cur에서 next로 가는 변화에 배수를 적용한 새 값(0~100 같은 절대값을 받는 곳용).
export function scaleTarget(cur, next, g, { min = 0, max = 100 } = {}) {
  const d = scaleDelta(Math.round(next - cur), g);
  return Math.max(min, Math.min(max, cur + d));
}
