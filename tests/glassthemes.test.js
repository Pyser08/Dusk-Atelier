// 2.2.0 글래스 테마 6종 × 밝은·어두운 판: 카드 위 본문 글자 대비 4.5:1 이상(UI-GLASS §6), 설정값 정리
import test from "node:test";
import assert from "node:assert/strict";
import { GLASS_THEMES, glassThemeInput, glassExtraVars } from "../src/ui/glassthemes.js";
import { normalizeTheme } from "../src/ui/theme.js";

const rgba = (c) => {
  if (c.startsWith("#")) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1];
};
const over = (top, under) => { const [r, g, b, a] = rgba(top); return [0, 1, 2].map((i) => [r, g, b][i] * a + under[i] * (1 - a)); };
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// glasscss.js 값과 같게
const mixWhite = (rgb, w) => rgb.map((v) => v * (1 - w) + 255 * w);
const cardOf = (mode, bg, under) => mode === "dark"
  ? over(`rgba(${mixWhite(bg, 0.12).join(",")},.5)`, under)   // color-mix(바탕 88% + 흰색) 50%
  : over("rgba(255,255,255,.58)", under);
const INNER = { dark: "rgba(255,255,255,.08)", light: "rgba(40,28,70,.055)" };
const TEXT = { dark: "#f2f0fa", light: "#1f1a33" };
const SUB = { dark: "rgba(255,255,255,.84)", light: "rgba(31,26,51,.74)" };

for (const g of GLASS_THEMES) for (const mode of ["dark", "light"]) {
  test(`${g.name}(${mode}): 가장 진한 빛 번짐 위 카드에서도 본문·보조 글자 4.5:1 이상`, () => {
    const p = g[mode], bg = rgba(p.bg).slice(0, 3);
    for (const blob of [null, ...p.blobs]) {
      const under = blob ? over(blob, bg) : bg;
      for (const [where, card] of [["카드", cardOf(mode, bg, under)], ["안쪽 칸", over(INNER[mode], cardOf(mode, bg, under))]]) {
        const t = ratio(rgba(TEXT[mode]).slice(0, 3), card);
        const s = ratio(over(SUB[mode], card), card);
        assert.ok(t >= 4.5, `${where} 본문 ${t.toFixed(2)} (${blob ?? "바탕"})`);
        assert.ok(s >= 4.5, `${where} 보조 ${s.toFixed(2)} (${blob ?? "바탕"})`);
      }
    }
  });
}

test("테마 값 정리: 모르는 값은 dusk, mine 허용", () => {
  assert.equal(normalizeTheme({}).gtheme, "dusk");
  assert.equal(normalizeTheme({ gtheme: "zzz" }).gtheme, "dusk");
  assert.equal(normalizeTheme({ gtheme: "mine" }).gtheme, "mine");
  assert.equal(normalizeTheme({}).skin, "glass");
});

test("글래스 테마는 바탕·강조를 그 테마 값으로, 'mine'은 그대로", () => {
  const t = normalizeTheme({ gtheme: "aurora", a: "#111111", b: "#222222" });
  const d = glassThemeInput(t, "dark"), l = glassThemeInput(t, "light");
  assert.equal(d.a, "#4fe3b5"); assert.equal(d.cBg, "#071a1f"); assert.equal(l.cBg, "#effbf7");
  const m = normalizeTheme({ gtheme: "mine", a: "#111111" });
  assert.equal(glassThemeInput(m, "dark").a, "#111111");
  assert.equal(glassExtraVars(m, "dark")["--rb-gb1"], "");
  assert.equal(glassExtraVars(t, "light")["--rb-gb1"], GLASS_THEMES.find((x) => x.id === "aurora").light.blobs[0]);
});
