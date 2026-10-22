function parseHex(hex) {
  let s = String(hex ?? "").trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  const n = parseInt(s, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
export var isHex = (v) => parseHex(v) !== null;
function toHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h2 = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h2 = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h2 = (b - r) / d + 2;
    else h2 = (r - g) / d + 4;
    h2 /= 6;
  }
  return [h2, s, l];
}
function hslToRgb([h2, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h2 + 1 / 3) * 255, f(h2) * 255, f(h2 - 1 / 3) * 255];
}
export function withLightness(hex, l) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [h2, s] = rgbToHsl(rgb);
  return toHex(hslToRgb([h2, s, Math.max(0, Math.min(1, l))]));
}
export function lightnessOf(hex) {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsl(rgb)[2] : 0;
}
export function ensureContrast(hex, bg, ratio = 4.5) {
  if (!isHex(hex)) return hex;
  if (contrast(hex, bg) >= ratio) return toHex(parseHex(hex));
  const up = luminance(bg) < 0.25;
  let l = lightnessOf(hex);
  for (let i = 0; i < 100; i++) {
    l += up ? 0.01 : -0.01;
    if (l <= 0 || l >= 1) break;
    const c = withLightness(hex, l);
    if (contrast(c, bg) >= ratio) return c;
  }
  return up ? "#ffffff" : "#000000";
}
export function onAccent(a, b, dark = "#14152a") {
  const w = Math.min(contrast("#ffffff", a), contrast("#ffffff", b));
  const d = Math.min(contrast(dark, a), contrast(dark, b));
  return { fg: w >= d ? "#ffffff" : dark, ratio: Math.max(w, d) };
}
export function alpha(hex, a) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}
