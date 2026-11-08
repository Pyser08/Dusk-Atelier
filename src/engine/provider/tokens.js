// 토큰 수 어림 (2.0.0, 순수). 실제 값이 아니라 진행 창에서 '대략 얼마나 받았나'를 보여 주는 용도.
// 영문·숫자·기호는 4글자≈1토큰, 한글·한자·일본어는 글자당 약 1.3토큰으로 셈한다. (Yumi Provider Manager의 글자 수 표시를 참고)
export function estimateTokens(text) {
  const s = String(text ?? ""); if (!s) return 0;
  let wide = 0, other = 0;
  for (const ch of s) { const c = ch.codePointAt(0); if ((c >= 0x1100 && c <= 0x11ff) || (c >= 0x3040 && c <= 0x30ff) || (c >= 0x3400 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af)) wide++; else other++; }
  return Math.ceil(wide * 1.3 + other / 4);
}
