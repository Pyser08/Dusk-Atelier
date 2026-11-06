import test from "node:test";
import assert from "node:assert/strict";
import { PL_KEY, PL_LINKS, createProtLink, loadProtLinkOn, normLink, summary } from "../src/data/protlink.js";

const F = (uid, name, size = 10, modifiedAt = 1, path = []) => ({ uid, name, size, modifiedAt, path });
function fakeEnv({ files = [F("a", "시로코.risum")], state = "ready", plugins = [], extraHooks = {} } = {}) {
  const mem = new Map(), env = { files, state, downloads: [], imported: [], saved: [], dropped: 0 };
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } },
    getDatabase: async () => ({ characters: [{ chaId: "c1", name: "시로코" }, { chaId: "c2", name: "휴지통", trashTime: 1 }, { chaId: "g", name: "그룹", type: "group" }], modules: [{ id: "m1", name: "시로코 모듈" }], plugins }) };
  const share = () => ({ root: { name: "시로코 모음" }, download: async (f, o) => { env.downloads.push(f.name); o?.onProgress?.(1, 1); return new Uint8Array([1, 2, 3]); } });
  const driver = { PZ: () => ({}), Ln: (e) => `오류:${e?.message ?? e}`, G3: () => ({ open: async () => (env.state === "ready" ? { kind: "ready", share: share() } : { kind: env.state }), drop: () => { env.dropped++; } }), Sp: async () => { if (env.fail) throw new Error("끊김"); return { files: env.files, folders: 0, partial: false }; } };
  const checked = [];
  const pl = createProtLink(api, { driver, originalProbe: async () => !!env.original, startDelay: 5, hooks: { importFiles: async (f, t) => { env.imported.push([f.map((x) => x.name), t]); }, saveFile: async (n) => { env.saved.push(n); }, onChecked: (r) => checked.push(r), ...extraHooks } });
  return { api, mem, env, pl, checked };
}

test("기본은 켜짐, off일 때만 꺼짐", async () => {
  assert.equal(await loadProtLinkOn(fakeEnv().api), true);
  const e = fakeEnv(); e.mem.set(PL_KEY, "off"); assert.equal(await loadProtLinkOn(e.api), false);
});
test("원본 ProtLink+가 켜져 있으면 시작하지 않고 이유를 알려 줌", async () => {
  const e = fakeEnv(); e.env.original = true;
  assert.equal(await e.pl.boot(), false); assert.match(e.pl.lastError(), /원래 ‘ProtLink\+’/); assert.equal(e.pl.isRunning(), false);
});
test("링크 열어 보기: 파일 목록·비밀번호 필요·주소 오류", async () => {
  const e = fakeEnv(); await e.pl.boot();
  const r = await e.pl.inspect("https://drive.proton.me/urls/X#y"); assert.equal(r.status, "ready"); assert.equal(r.rootName, "시로코 모음"); assert.equal(r.files.length, 1);
  e.env.state = "password"; assert.equal((await e.pl.inspect("https://x.y/z")).status, "password");
  e.env.state = "wrongPassword"; assert.equal((await e.pl.inspect("https://x.y/z", "pw")).status, "wrongPassword");
  await assert.rejects(() => e.pl.inspect("링크 아님"), /주소가 올바르지 않아요/);
});
test("연결 후보: 휴지통·그룹 캐릭터 제외, 모듈, 플러그인(자기 자신 제외)", async () => {
  const e = fakeEnv({ plugins: [{ name: "a_plug", displayName: "A", versionOfPlugin: "1.0" }, { name: "dusk_atelier", displayName: "Dusk" }] }); await e.pl.boot();
  assert.deepEqual((await e.pl.targets("character")).map((t) => t.id), ["c1"]);
  assert.deepEqual((await e.pl.targets("module")).map((t) => t.id), ["m1"]);
  assert.deepEqual((await e.pl.targets("plugin")).map((t) => t.id), ["a_plug"]);
});
test("연결 저장: 요약에 주소·비밀번호가 없고, 같은 링크 중복은 거절, 저장 값이 다시 읽힘", async () => {
  const e = fakeEnv(); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/y#k", password: "비번", name: "시로코", kind: "module", target: { id: "m1", name: "시로코 모듈" }, files: [F("a", "시로코.risum"), F("b", "readme.txt")] });
  assert.equal(s.fileCount, 1); assert.ok(!JSON.stringify(s).includes("비번") && !JSON.stringify(s).includes("https://"));
  await assert.rejects(() => e.pl.add({ url: "https://x/y#k", kind: "module", target: { id: "m1" }, files: [] }), /이미 연결/);
  const saved = JSON.parse(e.mem.get(PL_LINKS)); assert.equal(saved.length, 1); assert.equal(normLink(saved[0]).target.id, "m1");
  assert.equal(summary(normLink(saved[0])).update, false);
});
test("확인: 처음엔 새 파일 없음, 파일이 올라오면 알림, 실패하면 오류 문구만 남김", async () => {
  const e = fakeEnv(); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/1", name: "n", kind: "module", target: { id: "m1", name: "m" }, files: e.env.files });
  assert.equal((await e.pl.check(s.id)).update, false);
  e.env.files = [F("a", "시로코.risum", 12, 2), F("n", "new.risum", 5, 3)];
  const r = await e.pl.check(s.id); assert.equal(r.update, true); assert.deepEqual(r.pending.sort(), ["new.risum", "시로코.risum"]);
  e.env.fail = true; const f = await e.pl.check(s.id); assert.match(f.error, /^오류:끊김/); assert.equal(f.update, true, "실패해도 이전 알림은 유지");
});
test("받아서 업데이트(모듈): 가져오기 창으로 넘기며 연결 항목을 알려 주고, 받은 뒤엔 최신 상태", async () => {
  const e = fakeEnv(); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/1", name: "n", kind: "module", target: { id: "m1", name: "m" }, files: e.env.files });
  e.env.files = [F("a", "시로코.risum", 12, 2)]; await e.pl.check(s.id);
  const r = await e.pl.apply(s.id);
  assert.deepEqual(r.names, ["시로코.risum"]); assert.deepEqual(e.env.imported, [[["시로코.risum"], { kind: "module", id: "m1" }]]);
  assert.equal(r.summary.update, false); assert.equal((await e.pl.check(s.id)).update, false);
});
test("받아서 저장(플러그인): 가져오기 창이 아니라 파일로 저장", async () => {
  const e = fakeEnv({ files: [F("p", "plug.js")] }); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/p", name: "p", kind: "plugin", target: { id: "plug", name: "plug" }, files: [] });
  const r = await e.pl.apply(s.id); assert.deepEqual(e.env.saved, ["plug.js"]); assert.deepEqual(e.env.imported, []); assert.equal(r.kind, "plugin");
});
test("연결 없이 한 번만: .js는 저장, 나머지는 대상 없이 가져오기 창으로", async () => {
  const e = fakeEnv(); await e.pl.boot();
  await e.pl.once("https://x/o", "", [F("a", "a.risum"), F("p", "p.js")]);
  assert.deepEqual(e.env.saved, ["p.js"]); assert.deepEqual(e.env.imported, [[["a.risum"], undefined]]);
});
test("연결 바꾸기·이름 바꾸기·지우기", async () => {
  const e = fakeEnv(); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/1", name: "n", kind: "module", target: { id: "m1", name: "m" }, files: e.env.files });
  const r = await e.pl.relink(s.id, "character", { id: "c1", name: "시로코" }); assert.equal(r.kind, "character"); assert.equal(r.fileCount, 0);
  assert.equal((await e.pl.rename(s.id, "새 이름")).name, "새 이름");
  assert.equal(await e.pl.remove(s.id), true); assert.equal((await e.pl.list()).items.length, 0); assert.equal(await e.pl.remove("없음"), false);
});
test("시작 확인: 설정이 켜져 있으면 잠시 뒤 한 번 확인해 알려 주고, 끄면 확인하지 않음", async () => {
  const e = fakeEnv(); await e.pl.boot();
  await e.pl.add({ url: "https://x/1", name: "n", kind: "module", target: { id: "m1", name: "m" }, files: e.env.files });
  await e.pl.setSettings({ check: true }); await new Promise((r) => setTimeout(r, 60));
  assert.equal(e.checked.length, 1);
  await e.pl.setSettings({ check: false }); await new Promise((r) => setTimeout(r, 60)); assert.equal(e.checked.length, 1);
  await e.pl.stop();
});
test("끄면 정리하고 켜면 다시 시작", async () => {
  const e = fakeEnv(); await e.pl.boot(); assert.equal(e.pl.isRunning(), true);
  await e.pl.set(false); assert.equal(e.pl.isRunning(), false); assert.equal(e.mem.get(PL_KEY), "off");
  await e.pl.set(true); assert.equal(e.pl.isRunning(), true);
});
test("Proton 연결 부분이 단독으로 불러와지고 필요한 함수를 내보냄", async () => {
  const m = await import("../src/protlink/protlink.js");
  globalThis.document ??= { getElementById: () => null };
  const d = m.loadProtLinkDriver({ nativeFetch() {} });
  for (const k of ["G3", "Sp", "Ln", "Pa", "PZ"]) assert.equal(typeof d[k], "function", k);
  const fs = await import("node:fs");
  assert.ok(!/^\/\/@/m.test(fs.readFileSync(new URL("../src/protlink/protlink.js", import.meta.url), "utf8")), "//@ 머리말 없음");
});
test("Proton 연결부: 주소에서 링크 아이디를 읽고, 네트워크가 막히면 안내 문구, 폴더를 끝까지 훑음", async () => {
  const m = await import("../src/protlink/protlink.js");
  globalThis.document ??= { getElementById: () => null };
  const urls = [], warn = console.warn; console.warn = () => {};
  try {
    const d = m.loadProtLinkDriver({ nativeFetch: async (u) => { urls.push(String(u)); throw new Error("network down"); } });
    assert.equal(d.Pa("https://drive.proton.me/urls/ABC#x"), "ABC");
    const kv = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
    await assert.rejects(() => d.G3({ kv }).open("https://drive.proton.me/urls/ABCDEFGH#pass1234567", new AbortController().signal), (e) => /인터넷 연결/.test(d.Ln(e)));
    assert.ok(urls.some((u) => u.includes("drive-api.proton.me/drive/urls/ABCDEFGH")), "Proton API 주소로 요청");
    const share = { root: { type: "folder", uid: "r", name: "x" }, list: async (uid) => (uid === "r" ? [{ type: "file", uid: "f1", name: "a.risum", size: 3, modifiedAt: 1 }, { type: "folder", uid: "d", name: "sub" }] : [{ type: "file", uid: "f2", name: "b.js" }]), commitScan: async () => {} };
    const r = await d.Sp(share, { full: true });
    assert.deepEqual(r.files.map((f) => [f.name, f.path.join("/")]), [["a.risum", ""], ["b.js", "sub"]]); assert.equal(r.folders, 1); assert.equal(r.partial, false);
  } finally { console.warn = warn; }
});
test("받아서 바로 갱신(플러그인): 코드 바꿀 길(updatePlugin)이 있으면 파일 저장 없이 연결한 플러그인을 바꾼다", async () => {
  const calls = [];
  const e = fakeEnv({ files: [F("p", "plug.js")], extraHooks: { updatePlugin: async (n, code) => { calls.push([n, typeof code]); return true; } } }); await e.pl.boot();
  const s = await e.pl.add({ url: "https://x/p", name: "p", kind: "plugin", target: { id: "plug", name: "plug" }, files: [] });
  const r = await e.pl.apply(s.id);
  assert.deepEqual(calls, [["plug", "string"]]); assert.deepEqual(e.env.saved, []); assert.equal(r.pluginUpdated, true);
  const e2 = fakeEnv({ files: [F("p", "plug.js")], extraHooks: { updatePlugin: async () => { throw new Error("서버 없음"); } } }); await e2.pl.boot();
  const s2 = await e2.pl.add({ url: "https://x/p", name: "p", kind: "plugin", target: { id: "plug", name: "plug" }, files: [] });
  assert.equal((await e2.pl.apply(s2.id)).pluginUpdated, false); assert.deepEqual(e2.env.saved, ["plug.js"], "실패하면 파일로 저장");
});
