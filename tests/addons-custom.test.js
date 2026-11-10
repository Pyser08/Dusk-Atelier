// 커스텀 애드온(2.1.0): 파일 하나를 불러와 켜고, 끄고, 내보내고, 지운다. 카테고리 묶기·meta 검사·AI 답에서 코드 꺼내기.
import test from "node:test";
import assert from "node:assert/strict";
import { parseManifest, parseCustomMeta, extractAddonCode, groupByCategory, categoryOf, customFileName } from "../src/engine/addons.js";
import { createAddons, CUSTOM_INDEX_KEY } from "../src/data/addons.js";
import { ADDON_TEMPLATE, ADDON_GUIDE, addonRequestPrompt } from "../src/engine/addonguide.js";

const importer = (code) => import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
function setup() {
  const kv = new Map();
  const store = { getItem: async (k) => kv.get(k) ?? null, setItem: async (k, v) => { kv.set(k, v); }, removeItem: async (k) => { kv.delete(k); } };
  const reg = [];
  const ext = { add: (kind, key, val) => { const e = { kind, key, val }; reg.push(e); return () => reg.splice(reg.indexOf(e), 1); }, get: (kind, key) => reg.filter((e) => e.kind === kind && e.key === key).at(-1)?.val };
  globalThis.__hits = [];
  const api = { getLocalPluginStorage: () => store, pluginStorage: store };
  const A = createAddons(api, { core: "2.1.0", importer, fetcher: async () => null, ctx: { ext, app: { toast: () => {} } }, log: () => {} });
  return { A, kv, reg };
}
const addon = (id, v, extra = "") => `export const meta = { id: "${id}", name: "시험 ${id}", version: "${v}", desc: "설명", author: "나" };
export async function activate(api, ctx) {
  globalThis.__hits.push(["on", "${id}", ctx.version, !!ctx.dusk, ctx.custom]);
  ctx.dusk.addPage({ title: "시험 화면", render(el) {} });
  await ctx.dusk.storage.set("n", 3);
  ${extra}
  return { deactivate() { globalThis.__hits.push(["off", "${id}"]); } };
}`;

test("meta 검사: id·버전 꼴이 아니면 이유를 알려 준다", () => {
  assert.match(parseCustomMeta(null).error, /meta가 없어요/);
  assert.match(parseCustomMeta({ id: "My Addon", version: "1.0.0" }).error, /id/);
  assert.match(parseCustomMeta({ id: "a", version: "1" }).error, /version/);
  assert.equal(parseCustomMeta({ id: "a", version: "1.0.0" }).meta.name, "a");
});

test("AI 답에서 activate가 든 js 블록만 꺼낸다(블록 없으면 글 전체)", () => {
  const ans = "설명이에요\n```js\nconsole.log(1)\n```\n그리고\n```javascript\nexport const meta={};\nexport async function activate(){}\n```";
  assert.match(extractAddonCode(ans), /^export const meta/);
  assert.equal(extractAddonCode("export function activate(){}"), "export function activate(){}\n");
});

test("카테고리: 목록에 없으면 id로, 커스텀은 커스텀 묶음, 빈 묶음은 뺀다(커스텀은 남길 수 있음)", () => {
  assert.equal(categoryOf({ id: "memory" }), "memory");
  assert.equal(categoryOf({ id: "zzz" }), "etc");
  assert.equal(categoryOf({ id: "memory", custom: true }), "custom");
  assert.equal(parseManifest({ format: 1, addons: [{ id: "x", version: "1.0.0", sha256: "a".repeat(64), url: "https://x", category: "look" }] }).addons[0].category, "look");
  assert.equal(parseManifest({ format: 1, addons: [{ id: "x", version: "1.0.0", sha256: "a".repeat(64), url: "https://x", category: "custom" }] }).addons[0].category, "", "공식 목록은 커스텀 묶음에 못 들어감");
  const g = groupByCategory([{ id: "stealth" }, { id: "memory" }, { id: "cards" }], { keepCustom: true });
  assert.deepEqual(g.map((x) => [x.cat.id, x.items.length]), [["memory", 2], ["look", 1], ["custom", 0]]);
});

test("커스텀 애드온 불러오기 → 바로 켜짐(ctx.dusk 있음, 화면 등록) → 끄면 화면도 떼짐", async () => {
  const { A, reg } = setup();
  const meta = await A.importCustom(addon("hi", "1.0.0"));
  assert.equal(meta.id, "hi");
  assert.deepEqual(globalThis.__hits.at(-1), ["on", "hi", "1.0.0", true, true]);
  assert.ok(A.runningCustom("hi"));
  assert.ok(A.page("hi", true), "열기 버튼용 화면이 생김");
  assert.ok(reg.some((e) => e.kind === "tab" && e.key === "addon-c-hi"));
  await A.setCustomOn("hi", false);
  assert.deepEqual(globalThis.__hits.at(-1), ["off", "hi"]);
  assert.equal(A.page("hi", true), null);
  assert.equal(reg.length, 0, "끄면 SDK로 단 것이 모두 떨어짐");
});

test("같은 id를 다시 불러오면 새 버전으로 바꿔 끼우고, inspect는 새/옛 버전을 알려 준다", async () => {
  const { A } = setup();
  await A.importCustom(addon("hi", "1.0.0"));
  assert.equal((await A.inspectCustom(addon("hi", "1.1.0"))).exists.newer, 1);
  assert.equal((await A.inspectCustom(addon("hi", "0.9.0"))).exists.newer, -1);
  await A.importCustom(addon("hi", "1.1.0"));
  assert.deepEqual(globalThis.__hits.slice(-2), [["off", "hi"], ["on", "hi", "1.1.0", true, true]]);
  assert.equal((await A.customs()).hi.version, "1.1.0");
});

test("내보내기는 넣은 코드 그대로·파일 이름은 id-버전, 지우면 코드도 사라진다", async () => {
  const { A, kv } = setup();
  const code = addon("hi", "1.2.0");
  await A.importCustom(code);
  const ex = await A.exportCustom("hi");
  assert.equal(ex.code, code); assert.equal(ex.name, "hi-1.2.0.dusk-addon.js");
  assert.equal(customFileName({ id: "a", version: "1.0.0" }), "a-1.0.0.dusk-addon.js");
  await A.removeCustom("hi");
  assert.deepEqual(await A.customs(), {});
  assert.ok(![...kv.keys()].some((k) => k.startsWith("dusk.addon.custom.code.")));
  assert.equal(kv.get("dusk.addon.data.hi.n"), "3", "애드온이 저장한 값은 남는다");
});

test("다시 시작하면 켜 둔 커스텀 애드온도 켜고, 켜지다 터지면 꺼 두고 오류를 남긴다", async () => {
  const { A, kv } = setup();
  await A.importCustom(addon("hi", "1.0.0"));
  await A.dispose(); globalThis.__hits.length = 0;
  await A.boot(); await A.dispose();
  assert.deepEqual(globalThis.__hits[0], ["on", "hi", "1.0.0", true, true]);
  // 저장된 코드를 망가뜨리면 다음 시작 때 꺼짐 + 오류
  kv.set("dusk.addon.custom.code.hi", "export const meta = {}; export async function activate(){ throw new Error('터짐') }");
  await A.boot(); await A.dispose();
  const idx = JSON.parse(kv.get(CUSTOM_INDEX_KEY));
  assert.equal(idx.hi.on, false); assert.match(idx.hi.error, /터짐/);
});

test("잘못된 파일은 넣지 않는다: activate 없음·meta 없음·코어가 낮음", async () => {
  const { A } = setup();
  await assert.rejects(A.importCustom("export const meta = { id: 'a', version: '1.0.0' };"), /activate/);
  await assert.rejects(A.importCustom("export async function activate(){}"), /meta/);
  await assert.rejects(A.importCustom("export const meta = { id: 'a', version: '1.0.0', minCore: '9.0.0' }; export async function activate(){}"), /9\.0\.0/);
  assert.deepEqual(await A.customs(), {});
});

test("빈 틀은 그대로 넣어 켤 수 있고, 안내서는 SDK의 주요 이름을 모두 설명한다", async () => {
  const { A } = setup();
  const m = await A.importCustom(ADDON_TEMPLATE);
  assert.equal(m.id, "my-addon"); assert.ok(A.runningCustom("my-addon"));
  for (const k of ["addPage", "storage.get", "ai.run", "toast", "deactivate", "addRisuScriptHandler", "registerButton", "meta"]) assert.ok(ADDON_GUIDE.includes(k), k);
  assert.match(addonRequestPrompt("글자 수 세기"), /글자 수 세기/);
  assert.match(addonRequestPrompt("고쳐", { existing: "CODE123" }), /CODE123/);
});
