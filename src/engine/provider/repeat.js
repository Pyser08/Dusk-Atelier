// 반복 감지 (v1.9.3, 순수): 같은 글자 연속 · 같은 덩어리 반복을 스트림 끝에서 찾는다.
export const REPEAT_DEFAULT = Object.freeze({ charRun: 240, minRepeats: 6, minChars: 400, maxPeriod: 500 });
export function detectRepetition(text, opt = {}) {
  const o = { ...REPEAT_DEFAULT, ...opt }, s = String(text ?? ""), n = s.length;
  if (n < Math.min(o.charRun, o.minChars)) return null;
  let run = 1;
  for (let i = n - 1; i > 0 && s[i] === s[i - 1]; i--) run++;
  if (run >= o.charRun) return { kind: "char", run };
  const tail = s.slice(-Math.min(n, o.maxPeriod * o.minRepeats * 2));
  const L = tail.length;
  for (let p = 2; p <= o.maxPeriod && p * o.minRepeats <= L; p++) {
    let k = 1;
    while ((k + 1) * p <= L && tail.slice(L - (k + 1) * p, L - k * p) === tail.slice(L - p, L)) k++;
    if (k >= o.minRepeats && k * p >= o.minChars) { if (/^\s+$/.test(tail.slice(L - p))) continue; return { kind: "pattern", period: p, repeats: k }; }
  }
  return null;
}
// 반복 구간을 잘라 낸다(끊긴 응답 정리용): 반복 덩어리 1번만 남김
export function trimRepetition(text, hit) {
  if (!hit) return text;
  if (hit.kind === "char") return text.slice(0, text.length - hit.run + 1);
  return text.slice(0, text.length - hit.period * (hit.repeats - 1));
}
