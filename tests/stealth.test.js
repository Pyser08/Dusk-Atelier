import test from "node:test";
import assert from "node:assert/strict";
import { PRESET_IDS, buildStealth, cssText, htmlText, normalizeStealthState, defaultStealthState, mergeLabels } from "../src/data/stealth.js";
import { loadStealth, saveStealth, enableStealth, disableStealth } from "../src/data/stealth-apply.js";
import { loadThemes } from "../src/data/themes.js";

const balanced = (css) => { let d = 0; for (const c of css) { if (c === "{") d++; if (c === "}") d--; if (d < 0) return false; } return d === 0; };

test("5종 모두 CSS 괄호가 맞고 필수 자리가 있다", () => {
  assert.deepEqual(PRESET_IDS, ["claude", "gpt", "codex", "gemini", "deepseek"]);
  for (const id of PRESET_IDS) {
    const { css, html, name } = buildStealth(id);
    assert.ok(balanced(css), id);
    assert.match(name, /^스텔스 · /);
    assert.ok(css.includes(".text-input-area") && css.includes(".st-msg"));
    assert.ok(html.includes("<risutextbox></risutextbox>") && html.includes("{{role}}"));
  }
});
test("모르는 id는 오류", () => assert.throws(() => buildStealth("nope")));
test("문구는 CSS·HTML에 안전하게 들어간다(따옴표·괄호·태그 제거)", () => {
  assert.equal(cssText('a"}b{<x>\\'), "a  b  x");
  assert.equal(htmlText(`<b>"&'`), "&lt;b&gt;&quot;&amp;&#39;");
  const { css, html } = buildStealth("claude", { labels: { title: 'x"; } body{display:none} /*', tool: "<script>alert(1)</script>" } });
  assert.ok(balanced(css));
  assert.ok(!css.includes('body{display:none}'));
  assert.ok(!html.includes("<script>"));
});
test("문구를 비우면 그 장식이 빠진다", () => {
  const { css, html } = buildStealth("claude", { labels: { title: "", model: "", tool: "", think: "" } });
  assert.ok(!css.includes("::after { content") || !css.includes("default-chat-screen::after"));
  assert.ok(!html.includes("st-tool"));
  assert.ok(!css.includes("@keyframes st-pulse"));
});
test("라이트·다크 강제와 자동", () => {
  assert.ok(buildStealth("gpt", { scheme: "auto" }).css.includes("prefers-color-scheme: dark"));
  assert.ok(!buildStealth("gpt", { scheme: "dark" }).css.includes("prefers-color-scheme"));
  assert.ok(buildStealth("gpt", { scheme: "dark" }).css.includes("--st-bg: #212121"));
  assert.ok(buildStealth("gpt", { scheme: "light" }).css.includes("--st-bg: #ffffff"));
});
test("옵션: 사이드바 숨기기·이미지 숨기기·아바타 흐림", () => {
  assert.ok(buildStealth("gemini", { hideSidebar: true }).css.includes("display: none !important"));
  assert.ok(!buildStealth("gemini", { hideImages: false }).css.includes(".st-body img"));
  assert.ok(!buildStealth("gemini", { blurAvatars: false }).css.includes("blur(4px)"));
});
test("상태 정리: 이상한 값은 기본으로", () => {
  assert.deepEqual(normalizeStealthState(null), defaultStealthState());
  const s = normalizeStealthState({ v: 1, active: "x", scheme: "?", labels: { claude: { title: 3, model: "m" }, nope: { title: "z" } } });
  assert.equal(s.active, null); assert.equal(s.scheme, "auto");
  assert.deepEqual(s.labels, { claude: { model: "m" } });
  assert.equal(mergeLabels("claude", { model: "내 문구" }).model, "내 문구");
});

function fakeApi() {
  const store = new Map(), db = { customCSS: "원래CSS", guiHTML: "원래HTML", theme: "classic" };
  const style = []; 
  const doc = { querySelector: async () => null, createElement: async () => ({ setAttribute: async () => {}, setInnerText: async (t) => style.push(t), appendChild: async () => {}, remove: async () => {} }) };
  return { style, db, pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    getDatabase: async () => ({ ...db }), setDatabaseLite: async (p) => void Object.assign(db, p), getRootDocument: async () => doc };
}
test("켜면 리스 설정이 바뀌고, 끄면 처음 값으로 돌아온다(재적용해도 처음 백업 유지)", async () => {
  const api = fakeApi();
  let st = await loadStealth(api);
  st = await enableStealth(api, "claude", st); await saveStealth(api, st);
  assert.match(api.db.customCSS, /Dusk Stealth · 클로드/); assert.match(api.db.guiHTML, /st-msg/); assert.equal(api.db.theme, "customHTML");
  st = await enableStealth(api, "gpt", st);   // 갈아 끼움
  assert.match(api.db.customCSS, /Dusk Stealth · GPT/);
  const th = await loadThemes(api);
  assert.equal(th.themes.risu.filter((x) => x.name.startsWith("스텔스 · ")).length, 1);
  st = await disableStealth(api, st);
  assert.equal(api.db.customCSS, "원래CSS"); assert.equal(api.db.guiHTML, "원래HTML"); assert.equal(api.db.theme, "classic");
  assert.equal(st.active, null);
  assert.equal((await loadThemes(api)).themes.risu.length, 0);
});
