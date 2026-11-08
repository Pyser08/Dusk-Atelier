// v1.8.3 꾸미기 확장: 테마 묶음·강조 색·그라데이션·모양·글꼴, 예전 저장값 호환, 대비 보장
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCENTS, GRADIENTS, THEME_SETS, FONTS, DEFAULT_THEME, PRESETS, normalizeTheme, themeVars, resolveMode, applySet, randomSet, contrastOf } from '../src/ui/theme.js';
import { mixHex } from '../src/ui/color.js';

test('카탈로그 개수: 테마 묶음 12 · 강조 색 18 · 그라데이션 8 · 글꼴 5', () => {
  assert.equal(THEME_SETS.length, 12);
  assert.equal(ACCENTS.length, 18);
  assert.equal(GRADIENTS.length, 8);
  assert.equal(FONTS.length, 5);
  assert.equal(new Set(ACCENTS.map((a) => a.id)).size, 18);
  assert.equal(PRESETS.length, 18, 'PRESETS는 예전 이름 그대로 강조 색 목록');
  for (const id of ['coral', 'teal', 'sage', 'lilac', 'mono', 'dusk']) assert.ok(ACCENTS.some((a) => a.id === id), id);
});

test('예전 저장 테마(v2)는 그대로 열리고 새 값은 기본으로 채워진다', () => {
  const old = { v: 2, preset: "teal", a: "#0f766e", b: "#0b5f59", mode: "dark", contrast: "normal", layout: "top", density: "compact", size: "l", zoom: 110 };
  const t = normalizeTheme(old);
  assert.equal(t.a, "#0f766e");
  assert.equal(t.layout, "top");
  assert.equal(t.zoom, 110);
  assert.equal(t.set, "");
  assert.equal(t.grad, "");
  assert.equal(t.round, "normal");
  assert.equal(t.font, "base");
  assert.equal(t.motion, "normal");
  assert.equal(t.pattern, "none");
  assert.deepEqual(t.mine, []);
  const same = themeVars(old, "dark").vars;
  assert.equal(same["--rb-acc-a"], "#0f766e");
  assert.equal(same["--rb-win"], "#171615");
});

test('알 수 없는 값은 기본값으로, 잘못된 직접 색은 버린다', () => {
  const t = normalizeTheme({ set: "없음", grad: "zzz", dir: "x", round: "q", font: "q", pattern: "q", motion: "x", cBg: "red", cText: "#12" });
  assert.equal(t.set, "");
  assert.equal(t.grad, "");
  assert.equal(t.dir, "d");
  assert.equal(t.round, "normal");
  assert.equal(t.font, "base");
  assert.equal(t.pattern, "none");
  assert.equal(t.motion, "normal");
  assert.equal(t.cBg, "");
  assert.equal(t.cText, "");
});

test('mode: 시간 따라 — 낮(7~18시)엔 밝게, 밤엔 어둡게', () => {
  const th = { mode: "time" };
  assert.equal(resolveMode(th, "dark", new Date(2026, 0, 1, 12)), "light");
  assert.equal(resolveMode(th, "light", new Date(2026, 0, 1, 23)), "dark");
  assert.equal(resolveMode(th, "light", new Date(2026, 0, 1, 6)), "dark");
  assert.equal(normalizeTheme({ mode: "time" }).mode, "time");
});

test('테마 묶음 적용: 바탕+강조를 함께 바꾸고, 밝기를 묶음에 맞춘다', () => {
  for (const s of THEME_SETS) {
    const t = applySet(DEFAULT_THEME, s.id);
    assert.equal(t.set, s.id);
    const v = themeVars(t, s.mode).vars;
    assert.equal(v["--rb-win"], s.base.win, s.id);
    // 글자와 바탕, 보조 글자와 카드: 읽을 수 있는 대비
    assert.ok(contrastOf(v["--rb-text"], v["--rb-win"]) >= 4.5, `${s.id} 본문 대비`);
    assert.ok(contrastOf(v["--rb-sub"], v["--rb-surf"]) >= 4.5, `${s.id} 보조 글자 대비`);
    assert.ok(contrastOf(v["--rb-mute"], v["--rb-surf"]) >= 3.5, `${s.id} 흐린 글자 대비`);
    assert.ok(contrastOf(v["--rb-acc-text"], v["--rb-surf"]) >= 4.5, `${s.id} 강조 글자 대비`);
  }
  const night = THEME_SETS.find((s) => s.mode === "dark");
  assert.equal(applySet(DEFAULT_THEME, night.id).mode, "dark");
  assert.equal(applySet(DEFAULT_THEME, "").set, "");
});

test('묶음을 쓰면 다른 밝기에서도 깨지지 않는다(밝은 묶음을 어둡게 강제)', () => {
  const light = THEME_SETS.find((s) => s.mode === "light");
  const v = themeVars({ ...applySet(DEFAULT_THEME, light.id), mode: "dark" }, "dark").vars;
  assert.ok(contrastOf(v["--rb-text"], v["--rb-win"]) >= 4.5);
});

test('직접 색(바탕·카드·글자): 글자 대비가 모자라면 자동으로 맞춘다', () => {
  const v = themeVars({ cBg: "#ffffff", cText: "#f0f0f0" }, "light").vars;
  assert.equal(v["--rb-win"], "#ffffff");
  assert.ok(contrastOf(v["--rb-text"], v["--rb-win"]) >= 4.5);
  const ok = themeVars({ cBg: "#101820", cCard: "#1a2530", cText: "#eef2f6" }, "dark").vars;
  assert.equal(ok["--rb-win"], "#101820");
  assert.equal(ok["--rb-surf"], "#1a2530");
  assert.equal(ok["--rb-text"], "#eef2f6");
});

test('그라데이션·방향: --rb-acc-grad에 반영, 고대비에선 단색', () => {
  const g = GRADIENTS[0];
  const t = normalizeTheme({ grad: g.id, dir: "h" });
  const v = themeVars(t, "light").vars;
  assert.match(v["--rb-acc-grad"], /linear-gradient\(90deg/);
  assert.ok(v["--rb-acc-grad"].includes(g.a));
  assert.match(themeVars({ ...t, dir: "v" }, "light").vars["--rb-acc-grad"], /180deg/);
  assert.match(themeVars({ ...t, dir: "d" }, "light").vars["--rb-acc-grad"], /135deg/);
  assert.doesNotMatch(themeVars({ ...t, contrast: "high" }, "light").vars["--rb-acc-grad"], /gradient/);
  assert.ok(themeVars({ ...t, grad: "" }, "light").vars["--rb-acc-grad"].includes(DEFAULT_THEME.a));
});

test('모양: 모서리·그림자·글꼴·아이콘 굵기·줄 높이·움직임·무늬', () => {
  const base = themeVars({}, "light").vars;
  assert.equal(base["--rb-r2"], "14px");   // 2.0.0 다듬기: 기본을 더 둥글게
  assert.equal(base["--rb-pill"], "999px"); assert.notEqual(themeVars({ round: "sharp" }, "light").vars["--rb-pill"], "999px");
  const sharp = themeVars({ round: "sharp" }, "light").vars;
  assert.ok(parseInt(sharp["--rb-r2"]) < 12);
  const round = themeVars({ round: "round" }, "light").vars;
  assert.ok(parseInt(round["--rb-r2"]) > 12);
  assert.equal(themeVars({ shadowLv: "none" }, "light").vars["--rb-shadow-card"], "none");
  assert.match(themeVars({ font: "serif" }, "light").vars["--rb-font"], /serif/);
  assert.match(themeVars({ font: "mono" }, "light").vars["--rb-font"], /monospace/);
  assert.equal(base["--rb-font"], "inherit");
  assert.equal(themeVars({ iconW: "bold" }, "light").vars["--rb-icon-w"], "2.4");
  assert.equal(base["--rb-icon-w"], "2");
  assert.equal(themeVars({ lineH: "loose" }, "light").vars["--rb-lh"], "1.75");
  assert.equal(themeVars({ weight: "bold" }, "light").vars["--rb-fw"], "600");
  assert.equal(themeVars({ motion: "reduce" }, "light").vars["--rb-motion"], "0.001ms");
  assert.equal(base["--rb-motion"], "1");
  assert.match(themeVars({ pattern: "dots" }, "light").vars["--rb-pattern"], /radial-gradient/);
  assert.equal(base["--rb-pattern"], "none");
});

test('카드 유리 효과 · 사이드바 색 · 강조 색 쓰는 곳', () => {
  const v = themeVars({ glass: true }, "dark").vars;
  assert.match(v["--rb-glass"], /blur/);
  assert.equal(themeVars({}, "dark").vars["--rb-glass"], "none");
  const side = themeVars({ cSide: "#223344" }, "dark").vars;
  assert.equal(side["--rb-side"], "#223344");
  assert.equal(themeVars({}, "dark").vars["--rb-side"], "transparent");
});

test('내 테마: 여러 개 저장, 최대 12개, 이름·내용 정리', () => {
  const mine = Array.from({ length: 15 }, (_, i) => ({ id: "m" + i, name: "내 테마 " + i, theme: { preset: "teal", a: "#0f766e", b: "#0b5f59", mode: "dark", mine: [{ x: 1 }] } }));
  const t = normalizeTheme({ mine });
  assert.equal(t.mine.length, 12);
  assert.deepEqual(t.mine[0].theme.mine, undefined, '내 테마 안에 내 테마가 또 들어가지 않는다');
  assert.equal(normalizeTheme({ mine: [{ name: "a", theme: {} }, { name: "", theme: {} }, null, 7] }).mine.length, 1);
});

test('아무거나 🎲: 늘 올바른 묶음+강조+그라데이션 조합', () => {
  for (let i = 0; i < 20; i++) {
    const t = randomSet(DEFAULT_THEME, () => (i % 10) / 10);
    assert.ok(THEME_SETS.some((s) => s.id === t.set));
    assert.equal(normalizeTheme(t).set, t.set);
  }
});

test('mixHex', () => {
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixHex("#ff0000", "#0000ff", 0), "#ff0000");
});

test('테마 코드 주고받기 · 밝을 때/어두울 때 따로 쓰는 내 테마', async () => {
  const { themeCode, parseThemeCode } = await import('../src/ui/theme.js');
  const t = normalizeTheme({ grad: "neon", dir: "h", round: "round", font: "serif", cBg: "#101820", mine: [{ x: 1 }] });
  const code = themeCode(t);
  assert.match(code, /^DA1:/);
  const back = parseThemeCode(code);
  assert.equal(back.grad, "neon");
  assert.equal(back.cBg, "#101820");
  assert.equal(back.mine, undefined);
  assert.equal(parseThemeCode("엉뚱한 글"), null);
  assert.equal(parseThemeCode("DA1:%%%"), null);
  const pair = normalizeTheme({ mine: [{ id: "n", name: "밤", theme: { round: "sharp" } }], useDark: "n" });
  assert.equal(pair.useDark, "n");
  assert.equal(themeVars(pair, "dark").vars["--rb-r2"], "6px");
  assert.equal(themeVars(pair, "light").vars["--rb-r2"], "14px");
  assert.equal(normalizeTheme({ useDark: "없는것" }).useDark, "");
});
