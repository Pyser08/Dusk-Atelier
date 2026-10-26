// 카드 레이아웃 계산(순수). 글자 폭은 measure(text, size, family)로 받아서 브라우저 없이 테스트한다.
import { tagCountOf } from "./grade.js";
import { displayRole } from "./memories.js";

export const CARD_W = 1024, CARD_H = 1536;
const seg = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ko", { granularity: "grapheme" }) : null;
export const graphemes = (t) => seg ? Array.from(seg.segment(String(t)), (e) => e.segment) : Array.from(String(t));

// 단어 단위로 줄바꿈하되 한 단어가 너무 길면 글자 단위로 자른다.
export function wrap(measure, text, width) {
  const lines = [];
  for (const para of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    if (!para) { lines.push(""); continue; }
    let line = "";
    for (const word of para.match(/\S+[ \t]*|[ \t]+/g) ?? []) {
      if (line && measure(line + word) > width) { lines.push(line.trimEnd()); line = ""; }
      if (measure(word.trimEnd()) > width) {
        for (const ch of graphemes(word)) { if (line && measure(line + ch) > width) { lines.push(line.trimEnd()); line = ""; } line += ch; }
      } else line += word;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

// 이름: 첫 글자만 1.15배, 글자 사이 -0.04em. 폭이 넘으면 크기를 줄인다.
export function nameMetrics(measure, letters, size) {
  let width = 0; const parts = [];
  letters.forEach((letter, i) => { const font = size * (i ? 1 : 1.15); parts.push({ letter, font, x: width }); width += measure(letter, font, "name") + (i < letters.length - 1 ? -0.04 * font : 0); });
  return { width: Math.max(0, width), parts };
}

// measure(text, size, family) → px. family: "body" | "name"
export function cardLayout(card, measure, W = CARD_W, H = CARD_H) {
  const scale = W / 430, M = (family, size) => (t) => measure(t, size, family);
  const name = graphemes(displayRole(card.name));
  const nameX = W * 0.05, nameBoxH = H * 0.138, nameAvail = W * 0.88;
  let nameSize = W * 0.123, nm = nameMetrics(measure, name, nameSize);
  while (nm.width > nameAvail && nameSize > W * 0.02) { nameSize *= 0.97; nm = nameMetrics(measure, name, nameSize); }

  const subSize = W * 0.0405, subLeft = W * 0.05, subRight = W * 0.915, subText = displayRole(card.keyword);
  const nameCenter = nameX + nm.width / 2, sm = M("body", subSize);
  const subFull = Math.max(0, ...subText.split(/\r?\n/).map(sm));
  const subAlign = nameCenter - subFull / 2 < subLeft || nameCenter + subFull / 2 > subRight ? "left" : "center";
  const subWidth = subAlign === "left" ? subRight - subLeft : 2 * Math.min(nameCenter - subLeft, subRight - nameCenter);
  const subtitle = subText ? wrap(sm, subText, Math.max(1, subWidth)) : [], subHeight = subtitle.length * subSize * 1.26;

  const tagFont = Math.max(10.5 * scale, W * 0.03075), padX = W * 0.01725, padY = W * 0.0075, gap = W * 0.0105;
  const tagMax = (W * 0.83 - W * 0.0315) / 4, tm = M("body", tagFont);
  const chips = (card.tags ?? []).slice(0, tagCountOf(card.grade)).map((t) => {
    const text = displayRole(t), w = Math.min(tagMax, Math.max(padX * 2 + 1, tm(text) + padX * 2)), lines = wrap(tm, text, Math.max(1, w - padX * 2));
    return { text, w, lines, h: Math.max(W * 0.0585, lines.length * tagFont * 1.25 + padY * 2) };
  });
  // 칩은 가운데 정렬로 줄바꿈한다(EX 5개 등). 각 칩에 x(왼쪽)와 row를 준다.
  const rowMax = W * 0.83, rows = [];
  for (const c of chips) {
    let r = rows.at(-1);
    if (!r || r.w + (r.chips.length ? gap : 0) + c.w > rowMax) rows.push(r = { chips: [], w: 0, h: 0 });
    r.w += (r.chips.length ? gap : 0) + c.w; r.h = Math.max(r.h, c.h); r.chips.push(c);
  }
  for (const r of rows) { let x = (W - r.w) / 2; for (const c of r.chips) { c.x = x; x += c.w + gap; } r.chips.forEach((c) => { c.h = r.h; }); }
  const tagHeight = rows.reduce((s, r) => s + r.h, 0) + Math.max(0, rows.length - 1) * gap;

  let nameTop = H * 0.608, tagTop = H * 0.786, panelTop = H * 0.755, shadeTop = H * 0.435;
  let quoteTop = Math.max(H * 0.838, tagTop + tagHeight + W * 0.012), quoteSize = W * 0.044;
  const quoteBottom = H * 0.968, quoteWidth = W * 0.83 - W * 0.022, quoteText = displayRole(card.quote), minQ = Math.max(11 * scale, W * 0.031);
  let quoteAvail = quoteBottom - quoteTop - W * 0.016, quoteLines = [];
  for (let i = 0; i < 18; i++) {
    quoteLines = quoteText ? wrap(M("body", quoteSize), quoteText, quoteWidth) : [];
    if ((quoteLines.length * quoteSize * 1.46 <= quoteAvail && quoteLines.length <= 3) || quoteSize <= minQ) break;
    quoteSize = Math.max(minQ, quoteSize * 0.96);
  }
  const quoteHeight = quoteLines.length * quoteSize * 1.46;
  if (quoteHeight > quoteAvail) { quoteTop = quoteBottom - quoteHeight - W * 0.024; tagTop = quoteTop - tagHeight - W * 0.016; nameTop = tagTop - H * 0.138 - W * 0.044; shadeTop = Math.max(0, tagTop - H * 0.34); panelTop = Math.max(0, tagTop - W * 0.022); }

  const groupH = nameSize * 1.15 * 1.05 + W * 0.0075 + subHeight, nameLineTop = nameTop + (nameBoxH - groupH) / 2;
  const subTop = nameLineTop + nameSize * 1.15 * 1.05 + W * 0.0075, subX = subAlign === "left" ? subLeft : nameCenter;
  let quoteY = quoteTop + (quoteBottom - quoteTop - quoteHeight) / 2;
  const free = chips.length ? quoteY - tagTop - tagHeight : Infinity;
  quoteY -= Math.min(W * 0.028, Math.max(0, free - W * 0.007));
  return {
    W, H, scale, grade: card.grade,
    name: { x: nameX, lineTop: nameLineTop, size: nameSize, lineH: nameSize * 1.15 * 1.05, parts: nm.parts, width: nm.width },
    subtitle: { lines: subtitle, size: subSize, top: subTop, x: subX, align: subAlign, lineH: subSize * 1.26 },
    chips, rows: rows.map((r) => ({ h: r.h, w: r.w, chips: r.chips })), tag: { font: tagFont, padX, padY, gap, top: tagTop, height: tagHeight, center: W / 2 },
    quote: { lines: quoteLines, size: quoteSize, y: quoteY, x: W / 2, lineH: quoteSize * 1.46 },
    panelTop, shadeTop,
    // 프레임 오른쪽 위 원형 문양(등급 글자)과 왼쪽 위 글자 자리
    emblem: { cx: W * 0.8955, cy: H * 0.0632, maxW: W * 0.135, size: W * 0.105 },
    mark: { cx: W * 0.137, cy: H * 0.0378, maxW: W * 0.16, size: W * 0.026 }
  };
}
// 글자 하나가 주어진 폭 안에 들어가는 크기(문양·워드마크용)
export const fitSize = (measure, text, family, size, maxW) => { const w = measure(text, size, family); return w > maxW && w > 0 ? size * maxW / w : size; };
