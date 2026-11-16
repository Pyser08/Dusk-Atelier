// 2.2.4 기록·회상 전에 응답 글 정리(순수): 생각 글(<think> 등)은 통째로 빼고, HTML 태그는 벗기되 안의 글자는 남긴다.
//   카드·플러그인이 넣은 태그와 모델의 생각 글이 기록 모델 입력을 차지하던 것(Archive Center 2가 잰 값: 태그가 글의 약 17%).
//   상태창처럼 HTML 안에 든 정보(호감·소지품)는 글자로 남는다. '<마법의 검>', '<3', 'a < b'처럼 HTML이 아닌 꺾쇠는 건드리지 않는다.
const REASONING = /<(think|thinking|thoughts?|reasoning|reflection|scratchpad)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DROP = /<(style|script|svg|template|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const TAGS = "a|abbr|article|aside|audio|b|big|blockquote|body|br|button|caption|center|cite|code|col|colgroup|dd|del|details|dfn|div|dl|dt|em|figcaption|figure|font|footer|h[1-6]|header|hr|html|i|iframe|img|input|ins|kbd|label|li|main|mark|meter|nav|ol|option|p|picture|pre|progress|q|rp|rt|ruby|s|samp|section|select|small|source|span|strike|strong|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|tr|tt|u|ul|var|video|wbr";
const TAG = new RegExp(`<\\/?(?:${TAGS})\\b(?:\\s[^<>]*)?\\/?>`, "gi");
const BLOCK = /^<\/?(?:br|p|div|li|tr|h[1-6]|blockquote|section|article|header|footer|details|summary|table|ul|ol|dl|dt|dd|hr|pre|figure|figcaption|main|nav|aside)\b/i;
const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", "#39": "'" };
export function cleanForMemory(text) {
  let s = String(text ?? "");
  if (!/[<&]/.test(s)) return s;
  s = s.replace(REASONING, "").replace(DROP, "");
  s = s.replace(TAG, (m) => (BLOCK.test(m) ? "\n" : ""));
  s = s.replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (_, k) => ENT[k]).replace(/&#(\d{1,6});/g, (m, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : m; });
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
// 긴 응답 나누기: max자를 넘으면 문단(빈 줄) → 줄 → 문장 경계에서 나눈다. 반환: 조각 배열(짧으면 [text])
export function splitParts(text, max = 6000) {
  const s = String(text ?? "");
  if (s.length <= max) return [s];
  const out = []; let rest = s;
  while (rest.length > max) {
    const win = rest.slice(0, max);
    let cut = Math.max(win.lastIndexOf("\n\n"), -1);
    if (cut < max * 0.5) cut = win.lastIndexOf("\n");
    if (cut < max * 0.5) cut = Math.max(win.lastIndexOf(". "), win.lastIndexOf("다. "), win.lastIndexOf("? "), win.lastIndexOf("! "));
    if (cut < max * 0.5) cut = max; else cut += 1;
    out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut);
  }
  if (rest.trim()) out.push(rest.trim());
  return out.filter(Boolean);
}
// 나눠 읽은 조각별 분석 결과를 하나로: 배열은 이어 붙이고, 객체는 안쪽까지 합치고, 값은 앞 조각 것을 쓴다(비었으면 뒤 것).
// 장면은 요약을 이어 붙이고(400자), 바뀜 여부는 하나라도 바뀌면 바뀜.
export function mergeParts(results) {
  const list = (results ?? []).filter((r) => r && typeof r === "object");
  if (list.length <= 1) return list[0] ?? null;
  const merge = (a, b) => {
    if (Array.isArray(a) || Array.isArray(b)) return [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    if (a && typeof a === "object" && b && typeof b === "object") { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = k in o ? merge(o[k], v) : v; return o; }
    return a === undefined || a === null || a === "" ? b : a;
  };
  let out = list[0];
  for (const r of list.slice(1)) {
    const sa = out.scene, sb = r.scene;
    out = merge(out, r);
    if (sa && sb) out.scene = { ...sa, sum: [sa.sum, sb.sum].filter(Boolean).join(" ").slice(0, 400), facts: [...(sa.facts ?? []), ...(sb.facts ?? [])].slice(0, 6), who: [...new Set([...(sa.who ?? []), ...(sb.who ?? [])])], changed: !!(sa.changed || sb.changed), place: sa.place || sb.place, when: sa.when || sb.when };
  }
  return out;
}
