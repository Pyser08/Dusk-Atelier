import test from "node:test";
import assert from "node:assert/strict";
import { PL_KEY, PL_SEED_KEY, PL_STORE_KEY, createProtLink, loadProtLinkOn, summarizeLinks, wrapApi } from "../src/data/protlink.js";

const fakeApi = (init = {}) => {
  const mem = new Map(Object.entries(init)), calls = [];
  return { mem, calls,
    pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } },
    showContainer: async () => { calls.push("show"); }, hideContainer: async () => { calls.push("hide"); },
    registerSetting: async () => { calls.push("setting"); }, registerButton: async () => { calls.push("button"); },
    onUnload: async () => { calls.push("unload"); }, tag: "ok", who() { return this.tag; } };
};
const store = { version: 1, folders: [{ id: "f1" }, { id: "f2", deleted: true }], links: [
  { id: "a", url: "https://x#pw", name: "내 봇 모음", kind: "bot", snapshot: [1, 2, 3], updatedAt: 50 },
  { id: "b", url: "", name: "지워짐", deleted: true, updatedAt: 90 },
  { id: "c", url: "https://y", name: "", kind: "plugin", snapshot: [], lastError: "x", updatedAt: 70 }] };

test("링크 요약: 지운 것·빈 주소 제외, 주소는 넣지 않고 최근 순", () => {
  const r = summarizeLinks(JSON.stringify(store));
  assert.deepEqual(r.items.map((x) => x.id), ["c", "a"]);
  assert.equal(r.items[0].name, "이름 없는 링크"); assert.equal(r.items[0].error, true); assert.equal(r.items[1].count, 3);
  assert.equal(r.folders, 1);
  assert.ok(!JSON.stringify(r).includes("https://"));
  assert.deepEqual(summarizeLinks("깨진 글"), { items: [], folders: 0 });
});
test("기본은 켜짐, off일 때만 꺼짐", async () => {
  assert.equal(await loadProtLinkOn(fakeApi()), true);
  assert.equal(await loadProtLinkOn(fakeApi({ [PL_KEY]: "off" })), false);
  assert.equal(await loadProtLinkOn(fakeApi({ [PL_KEY]: "on" })), true);
});
test("본체에 넘기는 api: 자체 설정·버튼은 막고 나머지는 그대로(this 유지)", async () => {
  const api = fakeApi(); let closed = 0, unload = null;
  const w = wrapApi(api, { onClosed: () => closed++, onUnload: (f) => { unload = f; } });
  await w.registerSetting(); await w.registerButton();
  assert.deepEqual(api.calls, []);
  assert.equal(w.who(), "ok");
  await w.hideContainer(); await new Promise((r) => setTimeout(r, 420));
  assert.equal(closed, 1);
  await w.hideContainer(); await w.showContainer(); await new Promise((r) => setTimeout(r, 420));
  assert.equal(closed, 1, "곧바로 다시 보이면 닫힌 게 아니다");
  const f = () => {}; await w.onUnload(f); assert.equal(unload, f); assert.ok(api.calls.includes("unload"));
});
test("시작: 자체 업데이트 링크 심기 건너뜀 표시, 열 때 beforeOpen 호출·링크 id 전달", async () => {
  const api = fakeApi({ [PL_STORE_KEY]: JSON.stringify(store) }); const seen = []; let before = 0;
  const pl = createProtLink(api, { boot: async () => ({ open: async (id) => { seen.push(id); }, close: async () => {} }), originalProbe: async () => false, hooks: { beforeOpen: async () => { before++; } } });
  assert.equal(await pl.boot(), true);
  assert.equal(api.mem.get(PL_SEED_KEY), "1");
  assert.equal(await pl.open("a"), true); assert.equal(await pl.open(), true);
  assert.deepEqual(seen, ["a", undefined]); assert.equal(before, 2);
  assert.equal((await pl.links()).items.length, 2);
});
test("원본 ProtLink+가 켜져 있으면 시작하지 않고 이유를 알려 줌", async () => {
  let booted = 0;
  const pl = createProtLink(fakeApi(), { boot: async () => { booted++; return { open() {} }; }, originalProbe: async () => true });
  assert.equal(await pl.boot(), false); assert.equal(booted, 0); assert.match(pl.lastError(), /원래 ‘ProtLink\+’/);
  assert.equal(await pl.open(), false);
});
test("끄면 정리하고 열기를 거절, 켜면 다시 시작", async () => {
  const api = fakeApi(); let closed = 0, cleaned = 0;
  const pl = createProtLink(api, { boot: async (a) => { await a.onUnload(async () => { cleaned++; }); return { open: async () => {}, close: async () => { closed++; } }; }, originalProbe: async () => false });
  await pl.boot(); assert.equal(pl.isRunning(), true);
  await pl.set(false); assert.equal(pl.isRunning(), false); assert.equal(closed, 1); assert.equal(cleaned, 1); assert.equal(api.mem.get(PL_KEY), "off");
  assert.equal(await pl.open(), false);
  await pl.set(true); assert.equal(pl.isRunning(), true);
});
test("꺼짐 저장값이면 boot가 시작하지 않음", async () => {
  let booted = 0; const pl = createProtLink(fakeApi({ [PL_KEY]: "off" }), { boot: async () => { booted++; return { open() {} }; } });
  assert.equal(await pl.boot(), false); assert.equal(booted, 0);
});
test("가져온 본체 모듈이 불러와지고 bootProtLink 함수를 내보냄", async () => {
  const m = await import("../src/protlink/protlink.js"); assert.equal(typeof m.bootProtLink, "function");
});
test("본체 파일에 //@ 머리말이 없음(플러그인 머리말과 섞이지 않게)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../src/protlink/protlink.js", import.meta.url), "utf8");
  assert.ok(!/^\/\/@/m.test(src));
});
