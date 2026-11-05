import { test } from "node:test";
import assert from "node:assert/strict";
import { blankComments, buildReport, inspectModuleRender, inspectPluginRender, jsonBytes, measureCharacter, measureModule, measurePlugin, pct, storageItems, utf8Len } from "../src/engine/sizemeter.js";

test("utf8Len은 TextEncoder와 같은 값(한글·이모지·짝 없는 서로게이트)", () => {
  for (const s of ["", "abc", "한글 테스트", "😀 emoji", "a\uD800b", "\uDC00"]) {
    assert.equal(utf8Len(s), new TextEncoder().encode(s).length, JSON.stringify(s));
  }
});

test("jsonBytes: undefined·순환 참조는 0", () => {
  const a = {}; a.self = a;
  assert.equal(jsonBytes(undefined), 0);
  assert.equal(jsonBytes(a), 0);
  assert.equal(jsonBytes({ a: "가" }), new TextEncoder().encode('{"a":"가"}').length);
});

test("pct: 0과 작은 값 표기", () => {
  assert.equal(pct(0, 100), "0.0%");
  assert.equal(pct(1, 10000), "<0.1%");
  assert.equal(pct(50, 200), "25.0%");
});

test("캐릭터: 채팅을 따로 재고 전체와 거의 같다", () => {
  const c = {
    chaId: "c1", name: "하윤", desc: "설명".repeat(50), firstMessage: "안녕",
    globalLore: [{ key: "a", content: "x".repeat(300) }], customscript: [{ in: "a", out: "b" }], triggerscript: [],
    alternateGreetings: ["하이", "헬로"], additionalAssets: [["a", "p", "png"]],
    chats: [{ id: "1", message: [{ data: "y".repeat(2000) }] }, { id: "2", message: [] }],
    modules: ["m1"]
  };
  const r = measureCharacter(c, 0);
  assert.equal(r.kind, "characters");
  assert.ok(Math.abs(r.bytes - jsonBytes(c)) <= 16);
  const chats = r.parts.find((p) => p.label.startsWith("채팅"));
  assert.ok(chats && chats.bytes > 2000 && chats.label.includes("2개"));
  assert.ok(r.parts.every((p) => p.bytes > 0));
  assert.ok(r.parts.reduce((a, p) => a + p.bytes, 0) <= r.bytes + 1);
  assert.deepEqual(r.links.modIds, ["m1"]);
});

test("캐릭터: 연결된 채팅 모듈을 센다", () => {
  const c = { chaId: "c", name: "x", modules: ["a"], chats: [{ modules: ["a", "b"] }, { modules: ["b"] }, {}] };
  const r = measureCharacter(c, 3);
  assert.deepEqual(r.links.modIds, ["a"]);
  assert.deepEqual(r.links.chatMods, { a: 1, b: 2 });
  assert.equal(r.idx, 3);
});

test("플러그인 렌더 진단: display 핸들러 안의 getDatabase만 고부하", () => {
  const heavy = `risuai.addRisuScriptHandler('display', async (t) => { const d = await risuai.getDatabase(['characters']); return t; });`;
  const light = `const d = await risuai.getDatabase(['x']); risuai.addRisuScriptHandler('display', async (t) => t);`;
  assert.equal(inspectPluginRender(heavy).score, 3);
  assert.equal(inspectPluginRender(heavy).tone, "danger");
  const r = inspectPluginRender(light);
  assert.equal(r.score, 2);
  assert.notEqual(r.tone, "danger");
});

test("플러그인 렌더 진단: 주석은 무시, 문자열 안의 // 는 주석이 아님", () => {
  const commented = `// risuai.addRisuScriptHandler('display', () => getDatabase())\n/* addRisuScriptHandler('display', x) */`;
  assert.equal(inspectPluginRender(commented).score, 0);
  const url = `const u = "https://example.com/a"; risuai.addRisuScriptHandler('editdisplay', (t) => t);`;
  assert.equal(inspectPluginRender(url).score, 2);
});

test("플러그인 렌더 진단: 함수 이름만 넘기면 고부하로 단정하지 않음 / DOM 감시 / 없음", () => {
  assert.equal(inspectPluginRender(`risuai.addRisuScriptHandler('display', onDisplay); function onDisplay(){ getDatabase(); }`).score, 2);
  assert.equal(inspectPluginRender(`const d = await risuai.getRootDocument(); new MutationObserver(()=>{}).observe(d,{});`).score, 1);
  assert.equal(inspectPluginRender(`risuai.registerButton({name:'x'}, ()=>{})`).score, 0);
  assert.equal(inspectPluginRender("").score, 0);
  assert.equal(inspectPluginRender(undefined).hasHook, false);
});

test("플러그인 렌더 진단: 다른 이벤트 이름은 무시", () => {
  assert.equal(inspectPluginRender(`risuai.addRisuScriptHandler('output', async (t) => { await getDatabase(); return t; })`).score, 0);
});

test("blankComments: 줄 주석·블록 주석 제거, 문자열 유지", () => {
  const out = blankComments(`a(); // x\n/* y */ b("//k");`);
  assert.ok(!out.includes("x") && !out.includes("y"));
  assert.ok(out.includes('"//k"') && out.includes("a()") && out.includes("b("));
});

test("모듈 렌더 진단", () => {
  const lua = { trigger: [{ effect: [{ type: "triggerlua", code: "listenEdit('editDisplay', f)" }] }] };
  assert.equal(inspectModuleRender(lua).score, 2);
  assert.equal(inspectModuleRender({ trigger: [{ type: "display", effect: [] }] }).score, 2);
  const few = { regex: Array.from({ length: 3 }, () => ({ type: "editdisplay" })) };
  assert.equal(inspectModuleRender(few).score, 1);
  const many = { regex: Array.from({ length: 8 }, () => ({ type: "editdisplay" })) };
  assert.equal(inspectModuleRender(many).score, 2);
  assert.equal(inspectModuleRender({ regex: [{ type: "editinput" }] }).hasHook, false);
});

test("플러그인: 스크립트와 설정 분리", () => {
  const p = measurePlugin({ name: "p", displayName: "P", script: "가".repeat(100), enabled: false, versionOfPlugin: "1.2" }, 0);
  assert.equal(p.name, "P");
  assert.equal(p.active, false);
  assert.equal(p.parts.find((x) => x.label.includes("스크립트")).bytes, 300);
  assert.equal(p.badge, "v1.2");
});

const mod = (id, extra = {}) => ({ id, name: id, lorebook: [{ content: "z".repeat(100) }], ...extra });

test("리포트: 모듈 활성 판정(글로벌·캐릭터·채팅·네임스페이스·고아)", () => {
  const chars = [
    measureCharacter({ chaId: "c1", name: "A", modules: ["mChar"], chats: [{ modules: ["mChat", "ghost"] }] }, 0),
    measureCharacter({ chaId: "c2", name: "B", modules: [], chats: [] }, 1)
  ];
  const modules = [mod("mGlobal"), mod("mChar"), mod("mChat"), mod("mNs", { namespace: " Shared " }), mod("mOff")].map(measureModule);
  const rep = buildReport({ characters: chars, modules, plugins: [], db: { enabledModules: ["mGlobal"], moduleIntergration: "shared, other" } });
  const by = Object.fromEntries(rep.items.modules.map((m) => [m.id, m]));
  assert.equal(by.mGlobal.active, true);
  assert.equal(by.mChar.active, true);
  assert.equal(by.mChat.active, true);
  assert.equal(by.mNs.active, true);
  assert.equal(by.mOff.active, false);
  assert.deepEqual(by.mChar.linkedChars.map((c) => c.name), ["A"]);
  assert.equal(by.mChat.linkedChars[0].chatCount, 1);
  assert.equal(rep.waste.modules, 1);
  assert.equal(rep.waste.bytes, by.mOff.bytes);
  // 캐릭터 항목의 연결 모듈에는 존재하는 모듈만 나온다(고아 id 제외)
  assert.deepEqual(rep.items.characters[0].linkedModules.map((m) => m.id).sort(), ["mChar", "mChat"]);
});

test("리포트: Dusk에서 꺼 둔(parked) 모듈은 연결돼 있어도 비활성", () => {
  const c = measureCharacter({ chaId: "c", name: "A", modules: ["p"] }, 0);
  const p = { ...measureModule(mod("p")), parked: true };
  const rep = buildReport({ characters: [c], modules: [p], db: { enabledModules: ["p"] } });
  assert.equal(rep.items.modules[0].active, false);
  assert.equal(rep.items.modules[0].statusLabel, "Dusk에서 꺼둠");
  assert.equal(rep.waste.modules, 1);
});

test("리포트: 낭비 합계·분류별 합계·렌더 개입 개수", () => {
  const plugins = [
    measurePlugin({ name: "a", script: "x".repeat(1000), enabled: true }, 0),
    measurePlugin({ name: "b", script: "y".repeat(2000), enabled: false }, 1),
    measurePlugin({ name: "c", script: "risuai.addRisuScriptHandler('display', async (t) => t);", enabled: true }, 2),
    measurePlugin({ name: "d", script: "risuai.addRisuScriptHandler('display', async (t) => t);", enabled: false }, 3)
  ];
  const storage = storageItems([{ key: "dusk.mem.v3.x", bytes: 500 }, { key: "rbm:order", bytes: 20 }]);
  const rep = buildReport({ characters: [], modules: [], plugins, storage, db: {} });
  assert.equal(rep.waste.plugins, 2);
  assert.equal(rep.waste.bytes, rep.items.plugins[1].bytes + rep.items.plugins[3].bytes);
  assert.equal(rep.render.plugins, 1, "꺼진 플러그인은 세지 않음");
  assert.equal(rep.totals.storage, 520);
  assert.equal(rep.totals.all, rep.totals.plugins + rep.totals.storage);
  assert.equal(rep.counts.all, 6);
});

test("저장소 항목: 용량순 정렬·접두사 묶음", () => {
  const it = storageItems([{ key: "a", bytes: 1 }, { key: "dusk.x", bytes: 9 }, { key: "da_interop:p", bytes: 5 }, { key: "empty", bytes: 0 }]);
  assert.deepEqual(it.map((x) => x.name), ["dusk.x", "da_interop:p", "a", "empty"]);
  assert.equal(it[0].group, "dusk");
  assert.equal(it[1].group, "da_interop");
});

test("큰 채팅도 빠르게 잰다(2만 메시지)", () => {
  const msgs = Array.from({ length: 20000 }, (_, i) => ({ role: "char", data: "문장 ".repeat(40) + i }));
  const t = Date.now();
  const r = measureCharacter({ chaId: "big", name: "big", chats: [{ id: "x", message: msgs }] }, 0);
  assert.ok(r.bytes > 1e6);
  assert.ok(Date.now() - t < 3000);
});
