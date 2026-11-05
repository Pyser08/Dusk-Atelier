// Erosync 격리 이식 본체(src/erosync/): 실제 본체를 가짜 api로 올려 훅 등록·정리, 배경음 자료 지문, //@ 머리말 없음
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootErosync } from "../src/erosync/erosync.js";
import { UI_AMBIENT_TAPE, UI_AMBIENT_TAPE_BYTES, UI_AMBIENT_TAPE_SHA256 } from "../src/erosync/tape.js";

function fakeApi() {
  const store = new Map(), calls = [];
  const api = {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); }, removeItem: async (k) => { store.delete(k); } },
    addRisuReplacer: async (n) => calls.push(["add", n]), removeRisuReplacer: async (n) => calls.push(["rm", n]),
    addRisuChatListener: async (n) => calls.push(["addLis", n]), removeRisuChatListener: async (n) => calls.push(["rmLis", n]),
    registerSetting: async (n) => calls.push(["setting", n]), unregisterUIPart: async (n) => calls.push(["unreg", n]),
    requestPluginPermission: async () => true,
    onUnload: async () => calls.push(["HOST-onUnload"])
  };
  return { api, calls };
}

test("본체를 올리면 요청·응답 훅과 설정 항목을 등록하고, 끄면 모두 뗀다", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(e.loaded(), true);
  const names = calls.map((c) => c.join(":"));
  for (const n of ["add:beforeRequest", "add:afterRequest", "addLis:output", "setting:Erosync"]) assert.ok(names.includes(n), n);
  await e.dispose();
  const after = calls.map((c) => c.join(":"));
  for (const n of ["rm:beforeRequest", "rm:afterRequest", "rmLis:output"]) assert.ok(after.includes(n), n);
  assert.equal(e.loaded(), false);
});

test("호스트의 onUnload에는 직접 맡기지 않는다(끄기 전에 호스트가 부르지 못하게)", async () => {
  const { api, calls } = fakeApi();
  const e = await bootErosync(api);
  assert.ok(!calls.some((c) => c[0] === "HOST-onUnload"));
  await e.dispose();
});

test("api가 없으면 던진다", async () => {
  await assert.rejects(() => bootErosync(null), /unavailable/);
});

test("배경음 자료는 비어 있고(은하 화면을 쓰지 않음) 본체는 문자열이 아니면 배경음을 건너뛴다", () => {
  assert.equal(UI_AMBIENT_TAPE, null);
  assert.equal(UI_AMBIENT_TAPE_BYTES, 0);
  assert.equal(UI_AMBIENT_TAPE_SHA256, "");
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(src.includes("typeof UI_AMBIENT_TAPE !== 'string'"), "문자열 검사가 있어야 null이어도 안전");
});

test("관계망 탭: host.openRelmap이 있으면 안내 화면, 없으면 원래 화면", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(/tab === 'records'\) return typeof host\.openRelmap === 'function' \? duskRenderRelationLauncher\(pane\) : renderRecordsPage\(pane, context\)/.test(src));
});

test("소스에 줄 맨 앞 //@ 머리말이 없다(빌드가 막는 것)", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.equal(src.split("\n").filter((l) => /^\s*\/\/@/.test(l)).length, 0);
});

test("읽기 연결부: 채팅을 못 읽는 환경에서도 던지지 않고 빈 모양을 돌려준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  assert.equal(typeof e.read, "function");
  const r = await e.read();
  assert.equal(r.ok, false);
  for (const k of ["people", "goals", "rivalries", "relations"]) assert.ok(Array.isArray(r[k]), k);
  await e.dispose();
});
test("Dusk 연결: 기본 제공자가 host.runAI(Dusk AI 호출)로 간다", () => {
  const src = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.match(src, /providerId === 'risu' && typeof host\.runAI === 'function'/);
  const main = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(main, /host: \{ runAI:/);
});
test("Dusk 연결부(실제 엔진): 동작 설정·지시문·집착 방지·주기 플래그", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const c = await e.config.get();
  assert.equal(c.values.frequency, 55);
  const c2 = await e.config.set({ frequency: 999, mode: "bogus", notAllowed: 1 });
  assert.equal(c2.values.frequency, 100);          // 범위 밖은 맞춘다
  assert.equal(c2.values.mode, "normal");           // 잘못된 값은 기본으로
  assert.equal("notAllowed" in c2.values, false);   // 허용 목록 밖은 무시
  const p = await e.prompts.get();
  assert.ok(p.ok && p.pages.length > 0 && p.pages[0].sections.length > 0);
  const sec = p.pages[0].sections[0], b = sec.branches[0];
  assert.equal(sec.texts[b].changed, false);
  const p2 = await e.prompts.set(sec.id, b, sec.texts[b].text + "\n(시험)");
  assert.equal(p2.pages[0].sections[0].texts[b].changed, true);
  const p3 = await e.prompts.set(sec.id, b, "");
  assert.equal(p3.pages[0].sections[0].texts[b].changed, false);
  await assert.rejects(() => e.prompts.set("nope", "common", "x"), /알 수 없는/);
  assert.equal(e.guard.set({ on: true, obsessionCap: 500 }).obsessionCap, 100);
  assert.deepEqual(e.flags.set({ duskCycle: true }), { duskCycle: true });
  await e.dispose();
});
test("Dusk 프로필 연결부(실제 엔진): 채팅이 없으면 이유를 알리고, 분석 상태 모양을 돌려준다", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const st = e.profiles.status();
  assert.equal(st.running, false);
  for (const k of ["phase", "detail", "completed", "total", "failed", "message", "tone"]) assert.ok(k in st, k);
  await assert.rejects(() => e.profiles.get("x"), /채팅|인물/);
  await assert.rejects(() => e.profiles.start("bogus", ""), /채팅|종류/);
  assert.equal(e.profiles.cancel().running, false);
  await e.dispose();
});
test("Dusk 비하인드 연결부(실제 엔진): 채팅이 없으면 빈 목록", async () => {
  const { api } = fakeApi();
  const e = await bootErosync(api);
  const r = await e.behind.list();
  assert.equal(r.ok, false); assert.deepEqual(r.entries, []);
  await assert.rejects(() => e.behind.remove("x"), /채팅/);
  await e.dispose();
});
