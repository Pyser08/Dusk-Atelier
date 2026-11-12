import test from "node:test";
import assert from "node:assert/strict";
import * as FB from "../src/engine/sdstudio/fullbackup.js";
import * as P from "../src/engine/sdstudio/project.js";
import { createSdStudio } from "../src/data/sdstudio.js";

const sample = () => ({ chars: [{ id: "c1", name: "A", cover: "a/1.png", scenes: [{ id: "s1", name: "웃음", cover: "a/1.png", images: [{ path: "a/1.png" }, { path: "a/2.png" }] }] }], settings: { vibes: [{ id: "v", path: "v/1.png" }] } });

test("전체 백업: 경로 수집·치환·복원, 못 가져온 그림은 빠짐", () => {
  const p = sample();
  assert.deepEqual([...FB.assetPaths(p)].sort(), ["a/1.png", "a/2.png", "v/1.png"]);
  const names = new Map([["a/1.png", "img/00001.png"], ["a/2.png", "img/00002.png"], ["v/1.png", "img/00003.png"]]);
  const b = FB.makeBackup(p, names, { title: "봇" });
  assert.equal(b.project.chars[0].cover, "img/00001.png");
  assert.equal(JSON.stringify(p).includes("img/"), false, "원본은 안 바뀜");
  const r = FB.readBackup(JSON.parse(JSON.stringify(b)));
  assert.deepEqual(r.entries.sort(), ["img/00001.png", "img/00002.png", "img/00003.png"]);
  const back = FB.restore(r.project, new Map([["img/00001.png", "n1"], ["img/00002.png", "n2"], ["img/00003.png", "n3"]]));
  assert.deepEqual(back, p.chars ? { chars: [{ ...p.chars[0], cover: "n1", scenes: [{ ...p.chars[0].scenes[0], cover: "n1", images: [{ path: "n1" }, { path: "n2" }] }] }], settings: { vibes: [{ id: "v", path: "n3" }] } } : null);
  const lost = FB.restore(r.project, new Map([["img/00001.png", "n1"], ["img/00003.png", "n3"]]));
  assert.deepEqual(lost.chars[0].scenes[0].images, [{ path: "n1" }]);
  assert.equal(FB.readBackup({ format: "x" }), null);
});

function fakeApi({ failPrimary = false } = {}) {
  const prim = new Map(), loc = new Map();
  return { prim, loc, pluginStorage: { getItem: async (k) => prim.get(k) ?? null, setItem: async (k, v) => { if (!failPrimary) prim.set(k, v); } }, getLocalPluginStorage: async () => ({ getItem: async (k) => loc.get(k) ?? null, setItem: async (k, v) => { loc.set(k, v); } }) };
}
const target = { kind: "character", id: "x", index: 0 };

test("이중 저장: 주 저장소가 비면 이 기기 복사본으로 복구", async () => {
  const api = fakeApi(), sd = createSdStudio(api);
  const p = P.normalizeProject(null); p.settings.top = "복원됨";
  await sd.saveProject(target, p);
  assert.equal((await sd.loadProject(target)).settings.top, "복원됨");
  api.prim.clear();
  assert.equal((await sd.loadProject(target)).settings.top, "복원됨", "주 저장소가 비어도 복사본에서");
});

test("이중 저장: 주 저장소 쓰기가 막히면 오류를 알리고 복사본이 더 새 것을 쓴다", async () => {
  const api = fakeApi(), sd = createSdStudio(api);
  const p1 = P.normalizeProject(null); p1.settings.top = "옛";
  await sd.saveProject(target, p1);
  api.prim.set("dusk.sdstudio.p.x.t", "1");
  const bad = fakeApi({ failPrimary: true }); bad.loc = api.loc;
  const sd2 = createSdStudio({ ...bad, getLocalPluginStorage: async () => ({ getItem: async (k) => api.loc.get(k) ?? null, setItem: async (k, v) => { api.loc.set(k, v); } }), pluginStorage: { getItem: async (k) => api.prim.get(k) ?? null, setItem: async () => {} } });
  const p2 = P.normalizeProject(null); p2.settings.top = "새";
  await assert.rejects(sd2.saveProject(target, p2), /저장한 내용이 달라요/);
  assert.equal((await sd2.loadProject(target)).settings.top, "새");
});

test("봇 안 설정 칸: 읽기·쓰기, 배포 파일(.json·.risum·.charx)에서는 빠짐", async () => {
  const BD = await import("../src/engine/sdstudio/botdata.js");
  const { moduleJson } = await import("../src/engine/export.js");
  const snap = { t: 5, z: "eA==" };
  const ch = BD.writeSnap({ name: "봇", extentions: { other: 1 } }, "character", snap);
  assert.deepEqual(BD.readSnap(ch, "character"), snap);
  assert.equal(BD.stripSnap(ch).extentions.dusk_sdstudio, undefined);
  assert.equal(BD.stripSnap(ch).extentions.other, 1);
  assert.ok(ch.extentions.dusk_sdstudio, "원본은 그대로");
  const m = BD.writeSnap({ name: "모듈", assets: [] }, "module", snap);
  assert.equal(moduleJson(m).includes("dusk_sdstudio"), false);
  assert.equal(BD.readSnap(BD.writeSnap(m, "module", null), "module"), null);
});
