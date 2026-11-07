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
    assert.ok((css.replace(/[^{}]*st-f(?:old|tool)[^{]*\{[^}]*\}/g, "").replace(/@media \(max-width: 760px\) \{[\s\S]*?\n\}/g, "").replace(/\.risu-chat \.grow > div:has\(> \.st-msg\)/g, "").match(/:has\(/g) ?? []).length <= 2, `${id}: :has는 최대 두 번(대화 배경·입력창) — 채팅 메시지 상자로 범위를 좁힌 :has(> .st-msg)만 뺀다(맨 :has는 화면 전체를 다시 따져 느려짐)`);
  }
  const c = buildStealth("claudecode").css;
  assert.ok(c.includes('body[x-dusk-st][x-dusk-fold="0"] {') && !/(^|[\s,}])body:has\(/.test(c));
  assert.ok(!/\.rs-sidebar[^{]*\{[^}]*display:\s*none/.test(c), "클로드 계열은 순정 사이드바를 CSS로 숨기지 않는다(열면 스텔스 쪽이 숨는다)");
  assert.ok(!buildStealth("gemini").css.includes("x-dusk-st"));
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
  // 날짜가 없으면(포켓리스 등) 리스처럼 앞(0번)이 최신 → 앞에서부터. 30개로 자를 때도 최신이 남아야 한다
  const many = { chats: Array.from({ length: 40 }, (_, i) => ({ name: `New Chat ${45 - i}` })) };
  const m = chatRows(many, 0, 30);
  assert.equal(m[0].name, "New Chat 45"); assert.equal(m[0].current, true); assert.equal(m.at(-1).name, "New Chat 16");
});
test("사이드바 HTML: 이스케이프·현재 채팅 표시·코드 탭은 빈 목록 안내", () => {
  const h1 = shellHtml({ kind: "claude", user: "<b>나</b>", rows: [{ index: 0, name: "<script>", current: true }] });
  assert.ok(!h1.includes("<script>") && !h1.includes("<b>나</b>")); assert.ok(h1.includes("st-sb-item st-on") && h1.includes("최근 항목") && h1.includes("data-st-gear"));
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
  return { tree, createElement: async (t) => mk(t), querySelector: async (sel) => (sel.includes(".default-chat-screen") ? { _chat: true } : sel === "head" || sel === "body" ? { appendChild: async (c) => void tree.push(c._n) } : find(sel)) };
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
  const row = sb.inner?.['x-st-chat=1'];
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
  await sb.inner["x-st-gear="].handlers.click();
  const pop = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-pop");
  assert.ok(pop && pop.html.includes("봇토글") && pop.html.includes("모듈토글"));
  const sw = pop.inner["data-st-t=0"]; sw.checked = true;
  await sw.handlers.change({});
  assert.equal(api.db.globalChatVariables.toggle_ct, "1");
  await sb.inner["x-st-gear="].handlers.click();   // 다시 누르면 닫힘
  assert.ok(!api.doc.tree.some((n) => n.attrs["x-dusk"] === "stealth-pop"));
  await sh.destroy();
});
test("syncShell: 껍데기가 있는 모양이면 켜고, 없는 모양·끔이면 지운다", async () => {
  const api = shellApi();
  await syncShell(api, { active: "claudecode", labels: {} }, () => {});
  assert.equal(shellState(), "claudecode");
  await syncShell(api, { active: "gemini", labels: {} }, () => {});
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
  assert.ok(api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb").html.includes("st-sb-item st-on"));
  await sh.destroy();
});

test("이미지는 '명령어 N개 실행함' 접힘 안으로 들어간다(N은 1~9, 같은 글이면 같은 수)", async () => {
  const { foldImages, foldCount } = await import("../src/data/stealth-fold.js");
  const t = '첫 줄\n<img src="a.png">\n<br>{{inlay::b}}\n\n둘째 줄 ![x](c.png) 끝';
  const out = foldImages(t);
  assert.equal((out.match(/<details class="st-fold">/g) ?? []).length, 2, "붙은 이미지는 한 묶음");
  assert.match(out, /<summary>명령어 [1-9]개 실행함<\/summary>\n\n<img src="a.png">\n<br>\{\{inlay::b\}\}\n\n<\/details>/);
  assert.equal(foldImages(out), out, "두 번 감싸지 않는다");
  assert.equal(foldImages("글만 있음"), "글만 있음");
  assert.equal(foldImages(t), out, "다시 그려도 같은 결과");
  const ns = new Set(); for (let i = 0; i < 200; i++) ns.add(foldCount("x" + i));
  assert.ok([...ns].every((n) => n >= 1 && n <= 9) && ns.size === 9);

});

test("모바일(좁은 화면)에서도 클로드 모양: 좌우 꽉 찬 본문, 둥근 입력창, 상단 ≡ 줄", async () => {
  const css = buildStealth("claude").css;
  assert.match(css, /@media \(max-width: 760px\) \{\n  \.st-msg \{ max-width: 100%/);
  const { SHELL_CSS, topHtml } = await import("../src/data/stealth-shell.js");
  assert.ok(!/@media \(max-width:760px\)\{\[x-dusk="stealth-sb"\],\[x-dusk="stealth-top"\]/.test(SHELL_CSS), "모바일에서 상단 줄을 통째로 숨기지 않는다");
  const top = topHtml({ mobile: true, title: "봇", sub: "채팅" });
  assert.ok(top.includes("data-st-menu") && top.includes("data-st-more") && top.includes("채팅"));
});


test("호스트가 채팅 정보를 읽다 오류를 내도 사이드바는 그려진다", async () => {
  const boom = async () => { throw new Error("Cannot read properties of undefined (reading 'chatPage')"); };
  const api = shellApi({ getCurrentChatIndex: boom, getCharacterFromIndex: boom });
  const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 60));
  assert.ok(api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb"));
  await sh.destroy();
});

test("최소 모드는 화면 전체 규칙을 뺀다", () => {
  for (const id of ["claude", "claudecode", "gpt"]) {
    const full = buildStealth(id, {}).css, min = buildStealth(id, { minimal: true }).css;
    assert.match(full, /^body \{/m); assert.match(full, /text-input-area/);
    assert.ok(!/^body \{|^html|\.text-input-area|--risu-theme|default-chat-screen/m.test(min), id);
    assert.ok(min.includes(".st-body"), id);
  }
});

test("접기 버튼은 없다: 넓은 화면은 늘 펼침, 좁은 화면(휴대폰)은 접힘", async () => {
  for (const [w, fold] of [[1800, "0"], [390, "1"]]) {
    const api = shellApi({ pluginStorage: { getItem: async () => "1", setItem: async () => {} } });   // 예전에 접어 둔 값이 있어도 무시
    const q = api.doc.querySelector;
    api.doc.querySelector = async (s) => { const r = await q(s); if (s === "body" && r) r.getBoundingClientRect = async () => ({ width: w, height: 900 }); return r; };
    const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
    await new Promise((r) => setTimeout(r, 80));
    const sb = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb");
    assert.equal(sb.attrs["x-fold"], fold, String(w)); assert.ok(!sb.html.includes("fold"), "접기 버튼 없음");
    await sh.destroy();
  }
});

import { readFileSync } from "node:fs";
test("애드온 화면은 스크롤 상자(rb-scroll) 안에 그린다", () => {
  for (const f of ["src/ui/screens/stealth.js", "src/ui/screens/protlink.js"]) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.match(src, /rb-section rb-scroll/, f);
  }
});

test("순정 사이드바는 언제나 열 수 있고(숨기지 않음), 스텔스 사이드바를 접으면 상단 줄도 왼쪽 버튼을 가리지 않는다", async () => {
  const c = buildStealth("claude").css;
  assert.ok(!/\.rs-sidebar[^{]*\{[^}]*display:\s*none/.test(c));
  const { SHELL_CSS } = await import("../src/data/stealth-shell.js");
  assert.match(SHELL_CSS, /body\[x-dusk-fold="1"\] \[x-dusk="stealth-top"\]\{display:none/);
});

test("Dusk 창이 열려 있으면 스텔스 껍데기를 감추고, 닫히면 다시 보인다", async () => {
  const { setDuskOpen } = await import("../src/data/stealth-shell.js");
  const api = shellApi({ pluginStorage: { getItem: async () => null, setItem: async () => {} } });
  const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 80));
  const vis = () => api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-sb").attrs["x-vis"];
  assert.equal(vis(), "1");
  const W = { innerWidth: 400, innerHeight: 800 };
  setDuskOpen(true, W); await new Promise((r) => setTimeout(r, 30));
  assert.equal(vis(), "0");
  setDuskOpen(false, W); await new Promise((r) => setTimeout(r, 30));
  assert.equal(vis(), "1");
  await sh.destroy();
});

test("작업실에 더스크 스텔스 탭이 있다", async () => {
  const { TABS } = await import("../src/ui/tabs.js");
  const t = TABS.find((x) => x.id === "stealth");
  assert.ok(t && t.addon === "stealth" && t.section === "work");
});

test("느려짐 방지: body 전체에 거는 :has 규칙이 없고, 이미지 없는 글은 접기 정규식을 건너뛴다", async () => {
  const { SHELL_CSS } = await import("../src/data/stealth-shell.js");
  assert.ok(!/body:not\(:has/.test(SHELL_CSS));
  const { foldDisplay, setFoldOn } = await import("../src/data/stealth-fold.js");
  setFoldOn(true);
  assert.equal(foldDisplay("그냥 글"), "그냥 글");
  assert.match(foldDisplay('<img src="a">'), /st-fold/);
  setFoldOn(false);
  assert.equal(foldDisplay('<img src="a">'), '<img src="a">');
});

test("모바일 상단 줄은 손가락을 통과시켜 리스 사이드바 버튼이 눌리고, ⋮만 받는다", async () => {
  const { SHELL_CSS } = await import("../src/data/stealth-shell.js");
  assert.match(SHELL_CSS, /body\[x-dusk-st\] \[x-dusk="stealth-top"\]\{[^}]*pointer-events:none/);
  assert.match(SHELL_CSS, /\[x-c~="st-top-more"\]\{pointer-events:auto\}/);
});


test("채팅 번호를 못 읽어도 봇의 chatPage로 지금 채팅 이름을 상단 줄에 쓴다", async () => {
  const api = shellApi({ getCurrentChatIndex: async () => { throw new Error("chatPage"); }, pluginStorage: { getItem: async () => null, setItem: async () => {} } });
  api.char.chatPage = 1;
  const sh = createShell(api, { kind: "claude", poll: 60000, log: () => {} });
  await new Promise((r) => setTimeout(r, 80));
  const top = api.doc.tree.find((n) => n.attrs["x-dusk"] === "stealth-top");
  assert.ok(top.html.includes("봇A") && top.html.includes("둘째"));
  await sh.destroy();
});


test("Dusk 창 열림 판단: 플러그인 화면 크기가 0이면 닫힘, 크기가 있으면 hideContainer가 불린 경우만 닫힘", async () => {
  const { duskIsOpen, frameVisible } = await import("../src/data/stealth-shell.js");
  assert.equal(frameVisible({ innerWidth: 0, innerHeight: 0 }), false);
  assert.equal(frameVisible({ innerWidth: 390, innerHeight: 800 }), true);
  assert.equal(duskIsOpen(false, true), false);
  assert.equal(duskIsOpen(true, undefined), true, "showContainer를 못 잡아도 화면이 보이면 열림");
  assert.equal(duskIsOpen(true, false), false);
});


test("애드온이 새 버전이면 켜 둔 모양을 리스 설정에 다시 써 넣는다(한 번만)", async () => {
  const { reapplyIfUpdated } = await import("../src/data/stealth-apply.js");
  const api = fakeApi();
  let st = await loadStealth(api);
  st = await enableStealth(api, "claude", st); await saveStealth(api, st);
  api.db.guiHTML = "예전 채팅 HTML";
  const r1 = await reapplyIfUpdated(api, "0.3.8");
  assert.equal(r1.reapplied, true); assert.match(api.db.guiHTML, /st-msg/);
  const r2 = await reapplyIfUpdated(api, "0.3.8");
  assert.equal(r2.reapplied, false);
  const off = fakeApi();
  assert.equal((await reapplyIfUpdated(off, "0.3.8")).reapplied, false, "꺼 둔 사람은 건드리지 않음");
});



test("이미지·배경 그림마다 위에 '명령어 N개 실행함' 줄을 붙이고, 누르면 그 이미지만 펴고 접는다", async () => {
  const { wrapMedia, MEDIA_SEL } = await import("../src/data/stealth-shell.js");
  const mk = (rect) => { const n = { attrs: {}, kids: [], text: "", h: null, replacedBy: null }; return { n, setAttribute: async (k, v) => { if (!k.startsWith("x-")) throw new Error("x-"); n.attrs[k] = v; }, setInnerText: async (t) => { n.text = t; }, appendChild: async (c) => { n.kids.push(c.n); }, replaceWith: async (b) => { n.replacedBy = b.n; }, addEventListener: async (_e, fn) => { n.h = fn; }, getBoundingClientRect: async () => rect }; };
  const imgs = [mk({ width: 300, height: 400 }), mk({ width: 0, height: 0 }), mk({ width: 20, height: 20 }), mk({ width: 190, height: 190 })];
  const d = { createElement: async () => mk(null), querySelectorAll: async (sel) => { assert.equal(sel, MEDIA_SEL); const l = imgs.filter((e) => !e.n.attrs["x-st-m"]); return { length: async () => l.length, at: async (i) => l[i] }; } };
  assert.equal(await wrapMedia(d, { rand: () => 7 }), 1, "큰 그림만 접는다");
  assert.equal(imgs[2].n.attrs["x-st-m"], "s", "아이콘은 그대로");
  assert.equal(imgs[3].n.attrs["x-st-m"], "s", "봇 위젯의 캐릭터 칸(190px)도 그대로");
  assert.equal(imgs[1].n.attrs["x-st-m"], undefined, "아직 안 받은(크기 0) 그림은 다음 차례에 다시 잰다");
  const box = imgs[0].n.replacedBy;
  assert.equal(box.attrs["x-st-fw"], "1"); assert.equal(box.attrs["x-open"], "0");
  assert.equal(box.kids[0].text, "파일 7개 읽음, 명령어 7개 실행함"); assert.equal(box.kids[1], imgs[0].n);
  await box.kids[0].h(); assert.equal(box.attrs["x-open"], "1");
  await box.kids[0].h(); assert.equal(box.attrs["x-open"], "0");
  assert.equal(await wrapMedia(d), 0, "한 번 감싼 건 다시 안 함");
  const css = buildStealth("claude", { hideImages: true }).css;
  assert.match(css, /\[x-st-fw\]\[x-open="0"\] > :not\(\[x-st-fl\]\) \{ position: absolute !important[^}]*height: 1px/, "접힌 이미지는 1px로(미리 받아 둠)");
  assert.ok(!/\[x-open="0"\] > :not\(\[x-st-fl\]\) \{ display: none/.test(css));
  assert.match(css, /touch-action: manipulation/, "휴대폰 누르기 지연 없앰");
  assert.match(css, /\[x-st-fw\] > \[x-st-fl\]::before \{ content: "›_"/);
  assert.ok(!buildStealth("claude", { hideImages: true }).html.includes("st-tool"), "메시지 단위 줄은 없음");
});

test("감싸기에 실패한 이미지는 숨기고 '명령어 N개 실패함'으로 보인다", async () => {
  const { wrapMedia } = await import("../src/data/stealth-shell.js");
  const parent = { attrs: {}, h: null, setAttribute: async (k, v) => { parent.attrs[k] = v; }, addEventListener: async (_e, fn) => { parent.h = fn; } };
  const mk = (tag) => { const n = { attrs: {} }; return { n, nodeName: async () => tag, getParent: async () => parent, setAttribute: async (k, v) => { n.attrs[k] = v; }, getBoundingClientRect: async () => ({ width: 300, height: 300 }), replaceWith: async () => { throw new Error("막힘"); } }; };
  const els = [mk("DIV"), mk("IMG")];
  const d = { createElement: async () => ({ setAttribute: async () => {}, setInnerText: async () => {}, appendChild: async () => {}, addEventListener: async () => {} }), querySelectorAll: async () => { const l = els.filter((e) => !e.n.attrs["x-st-m"]); return { length: async () => l.length, at: async (i) => l[i] }; } };
  assert.equal(await wrapMedia(d, { rand: () => 4 }), 0);
  assert.equal(els[0].n.attrs["x-st-m"], "e"); assert.equal(els[0].n.attrs["x-st-n"], "4");
  assert.equal(parent.attrs["x-st-pe"], "4", "<img>는 부모에 글자를 단다");
  await parent.h(); assert.equal(parent.attrs["x-st-po"], "1", "실패한 것도 누르면 펼친다");
  const css = buildStealth("claude", { hideImages: true }).css;
  assert.match(css, /:is\(img, video\)\[x-st-m="e"\]:not\(\[x-st-o="1"\]\) \{ display: none !important/);
  assert.match(css, /명령어 " attr\(x-st-n\) "개 실패함/);
});

test("화면 진단 배치 추적: 채팅 글에서 body까지 상자마다 왼쪽·폭을 적는다", async () => {
  const { layoutTrace } = await import("../src/data/stealth-apply.js");
  const mk = (tag, cls, left, width, parent) => ({ nodeName: async () => tag.toUpperCase(), getClassName: async () => cls, getBoundingClientRect: async () => ({ left, width }), getParent: async () => parent });
  const body = mk("body", "", 0, 1288, null), main = mk("div", "grow h-full", 0, 640, body), msg = mk("div", "st-msg st-ai", 60, 560, main);
  const lines = await layoutTrace({ querySelector: async (s) => (s === ".st-msg" ? msg : null) });
  assert.deepEqual(lines, ["배치 추적(글 → body):", "div.st-msg.st-ai — 왼쪽 60 · 폭 560", "div.grow.h-full — 왼쪽 0 · 폭 640", "body — 왼쪽 0 · 폭 1288"]);
  assert.match((await layoutTrace({ querySelector: async () => null }))[0], /못 찾았어요/);
});

test("포켓리스: 창을 닫아도 iframe 크기가 남고 닫기 호출이 안 잡혀도, Dusk 창(.rb-root)이 숨겨져 있으면 닫힘으로 본다", async () => {
  const { duskIsOpen, refreshDuskOpen, setDuskOpen, duskOpen } = await import("../src/data/stealth-shell.js");
  assert.equal(duskIsOpen(true, true, false), false, "창이 숨겨졌으면 닫힘");
  assert.equal(duskIsOpen(true, undefined, true), true);
  assert.equal(duskIsOpen(false, true, true), false, "크기 0이면 무조건 닫힘");
  const root = { hidden: false }, w = { innerWidth: 400, innerHeight: 800, document: { querySelector: (s) => (s === ".rb-root" ? root : null) } };
  setDuskOpen(true, w); assert.equal(duskOpen.v, true);
  root.hidden = true; assert.equal(refreshDuskOpen(w), false, "닫기 호출 없이도 1초 확인에서 닫힘으로 바뀜");
});

test("채팅 래퍼의 바로 위 상자가 글 폭만큼 줄어도(포켓리스) 래퍼가 가운데 오도록 부모를 넓힌다", () => {
  const { css } = buildStealth("claude");
  assert.match(css, /:has\(> \.st-msg\)\s*\{[^}]*width:\s*100%/);
});

test("포켓리스: 바깥을 눌러 Dusk 창을 닫으면(닫기 호출·크기 변화 없음) 리스 화면 클릭으로 닫힘을 알고 사이드바를 다시 보인다", async () => {
  const { setDuskOpen, duskOpen, noteHostClick } = await import("../src/data/stealth-shell.js");
  const root = { hidden: false }, w = { innerWidth: 400, innerHeight: 800, document: { querySelector: () => root } };
  setDuskOpen(true, w); assert.equal(duskOpen.v, true);
  noteHostClick(w); assert.equal(duskOpen.v, false, "리스 화면을 눌렀다 = Dusk 창이 덮고 있지 않다");
  setDuskOpen(true, w); assert.equal(duskOpen.v, true, "다시 열면(showContainer) 다시 숨김");
});

test("순정 사이드바를 열면 스텔스 사이드바가 숨고, 닫으면 다시 보인다", async () => {
  const { nativeSidebarOpen } = await import("../src/data/stealth-shell.js");
  const el = (w) => ({ getBoundingClientRect: async () => ({ width: w, height: w ? 900 : 0, right: w }) });
  const doc = (...ws) => ({ querySelectorAll: async () => ws.map(el) });
  assert.equal(await nativeSidebarOpen(doc(0, 0)), false, "닫힘(hidden) = 크기 0");
  assert.equal(await nativeSidebarOpen(doc(0, 80)), true, "둘 중 하나라도 보이면 열림");
  assert.equal(await nativeSidebarOpen({ querySelectorAll: async () => { throw new Error("x"); } }), false);
});

test("화면 진단 접힘 추적: 크기가 있는 접힘 줄·접혔는데 보이는 이미지를 센다", async () => {
  const { foldTrace } = await import("../src/data/stealth-apply.js");
  const el = (w, h, parent = null, cls = "") => ({ getBoundingClientRect: async () => ({ width: w, height: h, left: 0, top: 0 }), getParent: async () => parent, getClassName: async () => cls });
  const par = el(300, 40, null, "card"), box = el(300, 20, par), lab0 = el(0, 0, box), lab1 = el(120, 21, box);
  const doc = { querySelectorAll: async (s) => (s.includes("> [x-st-fl]") ? [lab0, lab1] : [el(200, 100), el(1, 1)]) };
  const out = await foldTrace(doc);
  assert.equal(out[1], "크기가 있는 접힘 줄 1/2");
  assert.equal(out[2], "접혔는데도 보이는 이미지 1/2");
  assert.match(out[3], /줄 0×0 .* 상자 300×20 · 부모\.card 300×40/);
});

test("클로드 계열은 사이드바 CSS를 리스 커스텀 CSS에도 넣는다(<style>을 못 넣는 판에서도 사이드바 모양이 산다)", async () => {
  const { SHELL_CSS } = await import("../src/data/stealth-shell.js");
  for (const id of ["claude", "claudecode"]) assert.ok(buildStealth(id).css.includes(SHELL_CSS), id);
  assert.ok(!buildStealth("gemini").css.includes('[x-dusk="stealth-sb"]'), "사이드바 없는 모양엔 안 넣음");
});

test("사이드바 CSS는 x-c로 찾고(요소를 하나씩 만들어 붙이므로), 설정 팝업만 class도 둔다", async () => {
  const { SHELL_CSS } = await import("../src/data/stealth-shell.js");
  assert.match(SHELL_CSS, /\[x-c~="st-sb-row"\]/);
  assert.match(SHELL_CSS, /^\.st-pop-row\{/m);
});

test("\"…\"·'…'(리스가 mark risu-mark=quote1·quote2로 감쌈)는 접힘 줄처럼 회색", () => {
  for (const id of PRESET_IDS) {
    const css = buildStealth(id).css;
    assert.match(css, /\.chattext mark\[risu-mark\^="quote"\] \{ color: var\(--st-dim\) !important; \}/, id);
    assert.ok(css.indexOf('mark[risu-mark^="quote"]') > css.indexOf("mark[risu-mark] {"), id + ": 일반 mark 규칙보다 뒤(덮어씀)");
  }
});

test("GPT 모양(docs/STEALTH.md 7-1): 사이드바·발 두 줄 Plus·위 줄 폴더/공유·처리 시간 줄·따옴표 ・ 줄", async () => {
  const { shellHtml, topHtml, markThinking, syncShell, shellState } = await import("../src/data/stealth-shell.js");
  const h = shellHtml({ kind: "gpt", user: "키츠", rows: [{ index: 0, name: "브랜치 생성 완료", current: true }] });
  for (const t of ["ChatGPT", "새 채팅", "이미지", "예약", "라이브러리", "플러그인", "탐색", "최근", "st-two", "<small>Plus</small>"]) assert.ok(h.includes(t), t);
  assert.ok(!h.includes("st-sb-seg") && !/st-sb-row st-on/.test(h), "클로드식 묶음·첫 줄 강조 없음");
  const t = topHtml({ kind: "gpt", sub: "브랜치 생성 완료", mobile: true });
  assert.ok(t.includes("st-top-fold") && t.includes("브랜치 생성 완료") && t.includes("공유"));
  const css = buildStealth("gpt").css;
  assert.match(css, /\.st-msg\.st-char\[x-st-th\]::before \{ content: attr\(x-st-th\) " 동안 처리함  ›"/);
  assert.match(css, /mark\[risu-mark\^="quote"\]::before \{ content: "・"/);
  assert.ok(!buildStealth("claude").css.includes("동안 처리함"), "처리 시간 줄은 GPT 모양에서만");
  for (const id of ["claude", "gpt"]) assert.match(buildStealth(id).css, /mark\[risu-mark\^="quote"\]::before \{ content: "・"/, id + ": 따옴표 ・ 줄");
  assert.ok(!buildStealth("codex").css.includes('content: "・"'), "나머지 모양은 아직");
  const els = [{ a: {} }, { a: {} }].map((n) => ({ n, setAttribute: async (k, v) => { n.a[k] = v; } }));
  assert.equal(await markThinking({ querySelectorAll: async () => els }, () => 0.5), 2);
  assert.equal(els[0].n.a["x-st-th"], "1m 3s");
  const api = shellApi(); await syncShell(api, { active: "gpt", labels: {} }, () => {}); assert.equal(shellState(), "gpt"); await syncShell(api, null);
});

test("코덱스 모양(docs/STEALTH.md 7-2): 일반 채팅 앱(고정폭 아님)·왼쪽 아이콘 줄·Codex ⌄·종/검색·새 채팅·최근·시작하기 상자", async () => {
  const { shellHtml } = await import("../src/data/stealth-shell.js");
  const h = shellHtml({ kind: "codex", user: "TE", rows: [{ index: 0, name: "Clarify request", current: true }] });
  for (const t of ["st-sb-rail", "st-sb-rbtn st-on", "st-sb-rsep", "Codex", "st-sb-wchev", "새 채팅", "최근", "시작하기", "3개 중 0개", "data-st-gear"]) assert.ok(h.includes(t), t);
  const css = buildStealth("codex").css;
  assert.match(css, /html, body \{ font-family: var\(--st-font\) !important; \}/, "본문은 고정폭이 아님");
  assert.ok(css.includes("6 Luna Medium") && css.includes("clamp(290px"), "모델 글·넓은 사이드바");
});
