import test from "node:test";
import assert from "node:assert/strict";
import { PRESET_IDS, buildStealth, cssText, htmlText, normalizeStealthState, defaultStealthState, mergeLabels } from "../src/data/stealth.js";
import { loadStealth, saveStealth, enableStealth, disableStealth } from "../src/data/stealth-apply.js";
import { loadThemes } from "../src/data/themes.js";

const balanced = (css) => { let d = 0; for (const c of css) { if (c === "{") d++; if (c === "}") d--; if (d < 0) return false; } return d === 0; };

test("6종 모두 CSS 괄호가 맞고 필수 자리가 있다", () => {
  assert.deepEqual(PRESET_IDS, ["claude", "claudecode", "gpt", "codex", "gemini", "deepseek"]);
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
  assert.ok(!css.includes("default-chat-screen::after"), "스크롤을 막던 고정 제목 ::after는 없다");
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

import { parseToggles, collectToggles, toggleValue, chatRows, shellHtml, topHtml, SHELL_KINDS } from "../src/data/stealth-shell.js";
test("리스의 스크롤 컨테이너·전체 요소를 건드리지 않는다(스크롤·성능)", () => {
  for (const id of PRESET_IDS) {
    const { css } = buildStealth(id);
    assert.ok(!css.includes("position: sticky"), id);
    assert.ok(!/\.default-chat-screen\s*\{[^}]*(overflow|padding-top|[^-]height)/.test(css), `${id}: 대화 화면의 스크롤 속성을 바꾸지 않는다`);
    assert.ok(!/\.risu-chat > div/.test(css), `${id}: 리스 메시지 컨테이너 대신 우리 래퍼를 쓴다`);
    assert.ok(!/body \*/.test(css), `${id}: 모든 요소에 거는 규칙 없음`);
    assert.ok(!css.includes("-webkit-scrollbar"), `${id}: 스크롤바 크기를 바꾸지 않는다`);
    assert.ok((css.replace(/[^{}]*\.(st-body|chattext):has\(img, video\)[^{]*\{[^}]*\}/g, "").match(/:has\(/g) ?? []).length <= 2, `${id}: :has는 최대 두 번(대화 배경·입력창)`);
  }
  const c = buildStealth("claudecode").css;
  assert.ok(c.includes("body[x-dusk-st] {") && !/(^|[\s,}])body:has\(/.test(c));
  assert.ok(c.includes("min-width: 761px"), "모바일에선 원래 사이드바를 숨기지 않는다");
  assert.ok(!buildStealth("gpt").css.includes("x-dusk-st"));
  assert.ok(c.includes(".st-msg { width: 100%; max-width: var(--st-w); margin: 0 auto;"));
});
test("토글 정의 해석: 켜기·고르기·글, 구분선·그룹은 건너뜀, 같은 key는 한 번", () => {
  const t = parseToggles("a=켜기\nb=고르기=select=가,나,다\nc=글=text\nx=그룹=group\n===\n\nd");
  assert.deepEqual(t.map((x) => [x.key, x.type]), [["a", "toggle"], ["b", "select"], ["c", "text"]]);
  assert.deepEqual(t[1].options, ["가", "나", "다"]);
  assert.equal(collectToggles(["a=하나", "a=중복\nb=둘"]).length, 2);
  assert.equal(toggleValue(t[0], { toggle_a: "1" }), true); assert.equal(toggleValue(t[0], {}), false); assert.equal(toggleValue(t[1], { toggle_b: "2" }), "2");
});
test("채팅 목록: 최근 순, 현재 표시, 이름 없으면 번호, 최대 개수", () => {
  const char = { chats: [{ name: "옛", lastDate: 1 }, { name: "", lastDate: 3 }, { name: "새", lastDate: 2 }] };
  const r = chatRows(char, 2);
  assert.deepEqual(r.map((x) => x.name), ["채팅 2", "새", "옛"]);
  assert.equal(r.find((x) => x.index === 2).current, true);
  assert.equal(chatRows(char, 0, 2).length, 2); assert.deepEqual(chatRows(null, 0), []);
});
test("사이드바 HTML: 이스케이프·현재 채팅 표시·코드 탭은 빈 목록 안내", () => {
  const h1 = shellHtml({ kind: "claude", user: "<b>나</b>", rows: [{ index: 0, name: "<script>", current: true }] });
  assert.ok(!h1.includes("<script>") && !h1.includes("<b>나</b>")); assert.ok(h1.includes("st-sb-item on") && h1.includes("최근 항목") && h1.includes("data-st-gear"));
  const h2 = shellHtml({ kind: "code", user: "p", rows: [] });
  assert.ok(h2.includes("시작한 세션이 여기에 표시됩니다") && !h2.includes("최근 항목"));
  assert.equal(topHtml({ title: "" }), ""); assert.ok(topHtml({ title: "A", sub: "B" }).includes("B"));
  assert.ok(SHELL_KINDS.claude && SHELL_KINDS.code);
});

import { createShell, syncShell, shellState } from "../src/data/stealth-shell.js";
function fakeDoc() {
  const tree = [], nodes = new Map();
  const mk = (tag) => { const n = { tag, attrs: {}, html: "", handlers: {}, removed: false, children: [] };
    return { _n: n, setAttribute: async (k, v) => { if (!String(k).startsWith("x-")) throw new Error("Can only set attributes starting with 'x-'"); n.attrs[k] = v; }, setInnerHTML: async (h) => void (n.html = h), setInnerText: async (t) => void (n.html = t), appendChild: async (c) => void tree.push(c._n),
      remove: async () => { const i = tree.indexOf(n); if (i >= 0) tree.splice(i, 1); }, addEventListener: async (ev, fn) => void (n.handlers[ev] = fn) }; };
  const find = (sel) => {
    const m = sel.match(/^\[x-dusk="([^"]+)"\](?: \[([\w-]+)(?:="([^"]*)")?\])?$/);
    if (!m) return null;
    const host = tree.find((n) => n.attrs["x-dusk"] === m[1]);
    if (!host) return null;
    if (!m[2]) return wrap(host);
    // 안쪽 요소: html 안에서 속성을 찾아 가짜 노드로(클릭·변경 핸들러는 host.inner에 보관)
    const key = `${m[2]}=${m[3] ?? ""}`;
    if (!new RegExp(`${m[2]}="${(m[3] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"|${m[2]}(?=[ >=])`).test(host.html)) return null;
    host.inner ??= {}; host.inner[key] ??= { handlers: {}, checked: false, value: "" };
    const inn = host.inner[key];
    return { addEventListener: async (ev, fn) => void (inn.handlers[ev] = fn), getChecked: async () => inn.checked, getValue: async () => inn.value, remove: async () => {} };
  };
  const wrap = (n) => ({ _n: n, setAttribute: async (k, v) => { if (!String(k).startsWith("x-")) throw new Error("Can only set attributes starting with 'x-'"); n.attrs[k] = v; }, setInnerHTML: async (h) => void (n.html = h), remove: async () => { const i = tree.indexOf(n); if (i >= 0) tree.splice(i, 1); }, addEventListener: async () => {} });
  return { tree, createElement: async (t) => mk(t), querySelector: async (sel) => (sel === "head" || sel === "body" ? { appendChild: async (c) => void tree.push(c._n) } : find(sel)) };
}
function shellApi(over = {}) {
  const db = { username: "미유", personas: [{ id: "p", name: "선생님" }], selectedPersona: 0, modules: [{ id: "m1", customModuleToggle: "mt=모듈토글" }], enabledModules: ["m1"], globalChatVariables: {} };
  const char = { name: "봇A", chats: [{ name: "첫 채팅", lastDate: 1 }, { name: "둘째", lastDate: 2 }], chatPage: 0, customModuleToggle: "ct=봇토글", modules: [] };
  const doc = fakeDoc(), written = [];
  return { doc, db, char, written, getRootDocument: async () => doc, getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => char.chatPage,
    getCharacterFromIndex: async () => structuredClone(char), setCharacterToIndex: async (i, c) => void Object.assign(char, structuredClone(c)),
    getDatabase: async (keys) => Object.fromEntries((keys ?? []).map((k) => [k, structuredClone(db[k])])), setDatabaseLite: async (p) => { Object.assign(db, p); written.push(p); }, ...over };
}
test("사이드바를 그리고, 채팅을 누르면 그 채팅으로 바뀌고, 끄면 지운다", async () => {
  const api = shellApi();
  const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 60));
  const sb = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb");
  assert.ok(sb, "사이드바가 붙었다"); assert.ok(sb.html.includes("둘째") && sb.html.includes("선생님".slice(0, 1)) || sb.html.includes("미유".slice(0, 1)));
  assert.ok(api.doc.tree.some((n) => n.attrs["x-dusk"] === "stealth-top"));
  const row = sb.inner?.['data-st-chat=1'];
  assert.ok(row?.handlers.click, "채팅 줄에 클릭이 달렸다");
  await row.handlers.click();
  assert.equal(api.char.chatPage, 1);
  await sh.destroy();
  assert.equal(api.doc.tree.filter((n) => String(n.attrs["x-dusk"]).startsWith("stealth")).length, 0);
});
test("설정(톱니)을 누르면 봇·모듈 토글이 뜨고, 바꾸면 리스 변수에 저장된다", async () => {
  const api = shellApi();
  const sh = createShell(api, { kind: "code", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 60));
  const sb = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb");
  await sb.inner["data-st-gear="].handlers.click();
  const pop = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-pop");
  assert.ok(pop && pop.html.includes("봇토글") && pop.html.includes("모듈토글"));
  const sw = pop.inner["data-st-t=0"]; sw.checked = true;
  await sw.handlers.change({});
  assert.equal(api.db.globalChatVariables.toggle_ct, "1");
  await sb.inner["data-st-gear="].handlers.click();   // 다시 누르면 닫힘
  assert.ok(!api.doc.tree.some((n) => n.attrs["x-dusk"] === "stealth-pop"));
  await sh.destroy();
});
test("syncShell: 껍데기가 있는 모양이면 켜고, 없는 모양·끔이면 지운다", async () => {
  const api = shellApi();
  await syncShell(api, { active: "claudecode", labels: {} }, () => {});
  assert.equal(shellState(), "claudecode");
  await syncShell(api, { active: "gpt", labels: {} }, () => {});
  assert.equal(shellState(), null);
  await syncShell(api, { active: "claude", labels: {} }, () => {});
  await syncShell(api, null);
  assert.equal(shellState(), null);
  assert.equal(api.doc.tree.filter((n) => String(n.attrs["x-dusk"]).startsWith("stealth")).length, 0);
});

import { diagnose, runDiagnosis } from "../src/data/stealth-apply.js";
test("진단: 흔한 원인을 짚는다", () => {
  const base = { "채팅 래퍼(.st-msg)": 3, "본문 자리(.st-body)": 3, "리스 본문(.chattext)": 3, "채팅 목록(.risu-chat)": 1, "채팅 화면(.default-chat-screen)": 1, "입력칸(.text-input-area)": 1, "스텔스 사이드바": 1, "스텔스 표식": 1 };
  const ok = { theme: "customHTML", hasWrapper: true, hasStealthCss: true };
  assert.match(diagnose(base, ok)[0], /문제를 찾지 못했어요/);
  assert.ok(diagnose({ ...base, "채팅 래퍼(.st-msg)": 0 }, ok).some((l) => /새로고침/.test(l)));
  assert.ok(diagnose({ ...base, "리스 본문(.chattext)": 0 }, ok).some((l) => /\.chattext/.test(l)));
  assert.ok(diagnose(base, { ...ok, theme: "classic" }).some((l) => /customHTML/.test(l)));
  assert.ok(diagnose(base, { ...ok, hasStealthCss: false }).some((l) => /켜기/.test(l)));
  assert.ok(diagnose({ ...base, "스텔스 사이드바": 0 }, ok).some((l) => /사이드바가 화면에 없어요/.test(l)));
});
test("진단 실행: 문서가 없으면 알려 준다, 있으면 자리 수를 센다", async () => {
  assert.match((await runDiagnosis({ getRootDocument: async () => null })).lines[0], /접근하지 못했어요/);
  const doc = { querySelectorAll: async (sel) => ({ length: sel.includes("st-msg") ? 2 : 0 }) };
  const r = await runDiagnosis({ getRootDocument: async () => doc, getDatabase: async () => ({ theme: "customHTML", guiHTML: "<div class=st-msg>", customCSS: "/* Dusk Stealth */" }) });
  assert.equal(r.counts["채팅 래퍼(.st-msg)"], 2); assert.equal(r.db.hasStealthCss, true);
});
test("사이드바 감시는 가볍다: 봇 전체 읽기는 번호가 바뀔 때만, 사용자 이름은 캐시", async () => {
  const api = shellApi(); let heavy = 0, dbReads = 0;
  const gc = api.getCharacterFromIndex, gd = api.getDatabase;
  api.getCharacterFromIndex = async (i) => { heavy++; return gc(i); };
  api.getDatabase = async (k) => { if (k.includes("personas") && k.includes("username")) dbReads++; return gd(k); };
  const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 40));
  for (let i = 0; i < 6; i++) await sh._render(false);
  assert.equal(heavy, 1, "같은 채팅이면 봇 전체를 다시 읽지 않는다"); assert.equal(dbReads, 1);
  api.char.chatPage = 1;   // 채팅이 바뀌면 다시 읽는다
  await sh._render(false);
  assert.equal(heavy, 2);
  assert.ok(api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb").html.includes("st-sb-item on"));
  await sh.destroy();
});

test("이미지는 '명령어 N개 실행함' 한 줄로 접힌다(N은 1~9)", () => {
  const css = buildStealth("claude", { hideImages: true }).css;
  for (let n = 1; n <= 9; n++) assert.ok(css.includes(`명령어 ${n}개 실행함`), `N=${n}`);
  assert.match(css, /\.st-body img[^{]*\{ display: none !important/);
  assert.match(css, /:hover img/);
  assert.ok(!buildStealth("claude", { hideImages: false }).css.includes("실행함  ▸"));
});
