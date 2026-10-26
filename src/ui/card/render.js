// 카드 캔버스 렌더러: 일러스트 → 밤 베일 → 등급색 프레임 → 이름·키워드·태그·대사·등급 문양.
// 레이아웃은 engine/card/layout.js(순수)가 계산하고, 여기서는 그리기만 한다.
import { CARD_FRAME_DATA, CARD_FONT_DATA } from "../../data/cardassets.js";
import { cardLayout, CARD_W, CARD_H, fitSize } from "../../engine/card/layout.js";
import { deriveTheme, hexToRgb, rgbToHex, normGrade, colorOf } from "../../engine/card/grade.js";
import { displayRole } from "../../engine/card/memories.js";
import { embedCard } from "../../engine/card/png.js";
import { portable } from "../../engine/card/card.js";

const GIANTS = "DuskGiants";
const BODY = `"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo","Malgun Gothic",serif`;
const NAME = `"${GIANTS}","Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo","Malgun Gothic",serif`;

let fontReady = null, frameReady = null;
export function loadCardFont() {
  fontReady ??= (async () => {
    try {
      if (typeof FontFace === "undefined" || !document?.fonts) return false;
      const f = new FontFace(GIANTS, `url(${CARD_FONT_DATA})`);
      await f.load(); document.fonts.add(f); return true;
    } catch { return false; }
  })();
  return fontReady;
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("이미지를 열 수 없어요.")); i.src = src; });
const loadFrame = () => (frameReady ??= loadImg(CARD_FRAME_DATA));

const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// 기본 프레임(은색)을 등급색으로 물들인다: 밝기를 어두운 톤 → 등급색 → 밝은 톤으로 매핑하고 투명도는 그대로 둔다.
const tinted = new Map();
export async function tintedFrame(color) {
  if (tinted.has(color)) return tinted.get(color);
  const img = await loadFrame(), c = canvasOf(img.naturalWidth, img.naturalHeight), x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, base = hexToRgb(color);
  const dark = mix(base, [0, 0, 0], 0.62), light = mix(base, [255, 255, 255], 0.82);
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    const o = l < 0.5 ? mix(dark, base, l * 2) : mix(base, light, (l - 0.5) * 2);
    p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2];
  }
  x.putImageData(d, 0, 0);
  if (tinted.size > 6) tinted.clear();
  tinted.set(color, c);
  return c;
}

// 이미지 바이트 → 그릴 수 있는 비트맵. 실패하면 null.
export async function decodeImage(bytes) {
  if (!bytes?.length) return null;
  try {
    const sig = bytes[0] === 137 ? "image/png" : bytes[0] === 255 ? "image/jpeg" : bytes[0] === 71 ? "image/gif" : bytes[8] === 87 ? "image/webp" : "image/png";
    const blob = new Blob([bytes], { type: sig });
    if (typeof createImageBitmap === "function") return await createImageBitmap(blob);
    const url = URL.createObjectURL(blob); try { return await loadImg(url); } finally { URL.revokeObjectURL(url); }
  } catch { return null; }
}

function drawIllustration(x, W, H, img, crop = {}) {
  const iw = img.width ?? img.naturalWidth, ih = img.height ?? img.naturalHeight;
  if (!iw || !ih) return;
  const zoom = Math.max(0.3, Math.min(4, Number(crop.zoom) || 1)), s = Math.max(W / iw, H / ih) * zoom;
  x.save();
  x.translate(W / 2 + (Number(crop.x) || 0) * W, H / 2 + (Number(crop.y) || 0) * H);
  x.rotate(((Number(crop.rotation) || 0) * Math.PI) / 180);
  x.imageSmoothingQuality = "high";
  x.drawImage(img, -iw * s / 2, -ih * s / 2, iw * s, ih * s);
  x.restore();
}

function roundRect(x, l, t, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}

// card: 카드 객체, img: decodeImage 결과(없으면 밤하늘 그라데이션), 반환: 캔버스(1024×1536)
export async function drawCard(card, img = null, { canvas = null } = {}) {
  await loadCardFont();
  const W = CARD_W, H = CARD_H, c = canvas ?? canvasOf(W, H);
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const grade = normGrade(card.grade), theme = deriveTheme(card.color || colorOf(grade));
  const measure = (t, size, family) => { x.font = `${family === "name" ? "700 " : ""}${size}px ${family === "name" ? NAME : BODY}`; return x.measureText(t).width; };
  const L = cardLayout({ ...card, grade }, measure, W, H);
  const [nr, ng, nb] = theme.nightRgb, night = (a) => `rgba(${nr},${ng},${nb},${a})`;

  // 1) 바탕 + 일러스트
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rgbToHex(theme.nightRgb.map((v) => v * 2.2))); bg.addColorStop(1, night(1));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  if (img) drawIllustration(x, W, H, img, card.image?.crop);

  // 2) 밤 베일: 아래쪽 글자 영역이 읽히도록 서서히 어둡게
  const veil = Math.max(0, Math.min(1, card.image?.veil ?? 1));
  const g = x.createLinearGradient(0, L.shadeTop, 0, H);
  const pt = Math.max(0.05, Math.min(0.95, (L.panelTop - L.shadeTop) / (H - L.shadeTop)));
  g.addColorStop(0, night(0)); g.addColorStop(pt * 0.55, night(0.5 * veil)); g.addColorStop(pt, night(0.82 * veil + 0.1)); g.addColorStop(1, night(0.94 * veil + 0.06));
  x.fillStyle = g; x.fillRect(0, L.shadeTop, W, H - L.shadeTop);
  const top = x.createLinearGradient(0, 0, 0, H * 0.16); top.addColorStop(0, night(0.5 * veil)); top.addColorStop(1, night(0));
  x.fillStyle = top; x.fillRect(0, 0, W, H * 0.16);

  // 3) 프레임
  x.drawImage(await tintedFrame(theme.color), 0, 0, W, H);

  // 4) 이름
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  const n = L.name, grad = x.createLinearGradient(n.x, 0, n.x + Math.max(1, n.width), 0);
  theme.nameGradient.forEach((col, i, a) => grad.addColorStop(i / (a.length - 1), col));
  const baseline = n.lineTop + n.size * 1.15 * 0.9;
  x.save(); x.shadowColor = theme.nameGlow; x.shadowBlur = W * 0.02; x.lineJoin = "round";
  for (const p of n.parts) {
    x.font = `700 ${p.font}px ${NAME}`; x.lineWidth = Math.max(1, W * 0.003); x.strokeStyle = theme.nameStroke; x.fillStyle = grad;
    x.strokeText(p.letter, n.x + p.x, baseline); x.fillText(p.letter, n.x + p.x, baseline);
  }
  x.restore();

  // 5) 키워드(부제)
  const st = L.subtitle;
  if (st.lines.length) {
    x.font = `${st.size}px ${BODY}`; x.fillStyle = theme.body; x.textAlign = st.align === "left" ? "left" : "center";
    x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = W * 0.008;
    st.lines.forEach((t, i) => x.fillText(t, st.x, st.top + st.size + i * st.lineH));
    x.shadowBlur = 0;
  }

  // 6) 태그 칩(줄바꿈 가운데 정렬)
  let rowTop = L.tag.top;
  for (const row of L.rows) {
    for (const ch of row.chips) {
      roundRect(x, ch.x, rowTop, ch.w, row.h, row.h / 2);
      x.fillStyle = night(0.55); x.fill();
      x.fillStyle = theme.tagShine; x.fill();
      x.shadowColor = theme.tagGlow; x.shadowBlur = W * 0.012; x.lineWidth = Math.max(1.5, W * 0.0021); x.strokeStyle = theme.tagBorder; x.stroke(); x.shadowBlur = 0;
      x.font = `${L.tag.font}px ${BODY}`; x.fillStyle = theme.tagText; x.textAlign = "center";
      const lh = L.tag.font * 1.25, y0 = rowTop + (row.h - ch.lines.length * lh) / 2 + L.tag.font * 0.98;
      ch.lines.forEach((t, i) => x.fillText(t, ch.x + ch.w / 2, y0 + i * lh));
    }
    rowTop += row.h + L.tag.gap;
  }

  // 7) 대사
  const q = L.quote;
  if (q.lines.length) {
    x.font = `${q.size}px ${BODY}`; x.fillStyle = theme.quote; x.textAlign = "center";
    x.shadowColor = "rgba(0,0,0,.65)"; x.shadowBlur = W * 0.01;
    q.lines.forEach((t, i) => x.fillText(t, q.x, q.y + q.size + i * q.lineH));
    x.shadowBlur = 0;
  }

  // 8) 오른쪽 위 등급 문양(Giants) + 왼쪽 위 워드마크
  const e = L.emblem, es = fitSize(measure, grade, "name", e.size, e.maxW);
  x.font = `700 ${es}px ${NAME}`; x.textAlign = "center";
  const eg = x.createLinearGradient(0, e.cy - es / 2, 0, e.cy + es / 2); theme.letter.forEach((col, i, a) => eg.addColorStop(i / (a.length - 1), col));
  x.save(); x.shadowColor = theme.nameGlow; x.shadowBlur = W * 0.016; x.fillStyle = eg; x.fillText(grade, e.cx, e.cy + es * 0.34); x.restore();
  const mk = L.mark, ms = fitSize(measure, "DUSK", "name", mk.size, mk.maxW);
  x.font = `${ms}px ${NAME}`; x.fillStyle = theme.tagText; x.globalAlpha = 0.85; x.textAlign = "center"; x.fillText("DUSK", mk.cx, mk.cy + ms * 0.34); x.globalAlpha = 1;
  return c;
}

// 카드 → PNG 바이트(카드 JSON이 tEXt에 들어감). withData=false면 그림만.
export async function cardPng(card, img, { withData = true } = {}) {
  const c = await drawCard(card, img);
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG를 만들지 못했어요."))), "image/png"));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return withData ? embedCard(bytes, portable(card)) : bytes;
}
