import test from "node:test";
import assert from "node:assert/strict";
import * as BK from "../src/engine/sdstudio/backup.js";
import * as P from "../src/engine/sdstudio/project.js";

import { tar } from "./tar-helper.mjs";
const session = (name) => ({ version: 1, name, selectedWorkflow: { workflowType: "SDImageGen", presetName: "default" },
  presets: { SDImageGen: [{ name: "default", frontPrompt: "1girl, white hair", backPrompt: "best quality", uc: "lowres" }] },
  scenes: { 웃음: { type: "scene", name: "웃음", resolution: "portrait", slots: [[{ prompt: "smile", id: "a" }]], imageMap: ["2.png", "1.png"], mains: ["1.png"] },
    화남: { type: "scene", name: "화남", resolution: "landscape", slots: [[{ prompt: "angry", id: "b" }]], imageMap: [], mains: [] },
    변형: { type: "inpaint", name: "변형", imageMap: [], mains: [] } },
  library: {}, presetShareds: {}, inpaints: {} });

test("SDStudio 폴더 백업 tar: 한글 이름(pax)·즐겨찾기(mains)·순서(imageMap)·폴더", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const bytes = tar([["_folder.json", JSON.stringify({ type: "sdstudio-folder-backup", version: 1, folder: "아비도스", projects: ["시로코"] })],
    ["시로코/project.json", JSON.stringify(session("시로코"))], ["시로코/outs/웃음/1.png", png], ["시로코/outs/웃음/2.png", png], ["시로코/outs/화남/3.png", png], ["시로코/vibes/v.png", png]]);
  assert.ok(BK.isTar(bytes.subarray(0, 512)));
  const files = await BK.listTar(async (o, n) => bytes.subarray(o, o + n), bytes.length);
  assert.ok(files.some((f) => f.name === "시로코/outs/웃음/1.png"));
  const get = (n) => { const f = files.find((x) => x.name === n); return bytes.subarray(f.off, f.off + f.size); };
  assert.deepEqual([...get("시로코/outs/웃음/2.png")], [...png]);
  const projs = await BK.findProjects(files, async (n) => JSON.parse(new TextDecoder().decode(get(n))));
  assert.equal(projs.length, 1);
  const pj = projs[0];
  assert.equal(pj.name, "시로코"); assert.equal(pj.folder, "아비도스"); assert.equal(pj.prompt, "1girl, white hair");
  assert.deepEqual(pj.tpl.scenes.map((s) => s.name), ["웃음", "화남"]);   // 인페인트 씬은 빼고
  assert.deepEqual(pj.images["웃음"].map((x) => [x.file, x.fav]), [["2.png", false], ["1.png", true]]);
  assert.equal(pj.count, 3); assert.equal(pj.favCount, 1);

  let p = P.addChar(P.emptyProject(), { name: "시로코" });
  const fav = BK.importProjects(p, projs, { mode: "fav" });
  const c = fav.project.chars[1];
  assert.equal(c.name, "시로코 2"); assert.equal(c.prompt, "1girl, white hair");
  assert.deepEqual(c.scenes.map((s) => [s.name, s.slots[0][0].prompt]), [["웃음", "smile"], ["화남", "angry"]]);
  assert.equal(fav.project.folders[0].name, "아비도스"); assert.ok(fav.project.folders[0].members.includes(c.id));
  assert.deepEqual(fav.jobs.map((j) => [j.entry, j.fav]), [["시로코/outs/웃음/1.png", true]]);
  assert.equal(fav.project.settings.back, "best quality"); assert.equal(fav.project.settings.neg, "lowres");
  assert.equal(BK.importProjects(p, projs, { mode: "all" }).jobs.length, 3);
  assert.equal(BK.importProjects(p, projs, { mode: "none" }).jobs.length, 0);
});

test("프로젝트 백업(맨 위 project.json)·JSON만", async () => {
  const bytes = tar([["project.json", JSON.stringify(session("호시노"))], ["outs/웃음/1.png", new Uint8Array([1])]]);
  const files = await BK.listTar(async (o, n) => bytes.subarray(o, o + n), bytes.length);
  const projs = await BK.findProjects(files, async (n) => { const f = files.find((x) => x.name === n); return JSON.parse(new TextDecoder().decode(bytes.subarray(f.off, f.off + f.size))); });
  assert.equal(projs[0].name, "호시노"); assert.equal(projs[0].folder, ""); assert.equal(projs[0].count, 1);
  const only = BK.projectFromSession(session("노노미"));
  assert.equal(only.count, 0); assert.equal(only.tpl.scenes.length, 2);
});
