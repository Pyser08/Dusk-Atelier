// 에셋 제작: 캐릭터 폴더 영어 이름 · 씬 세트(SFW/NSFW) · 로어북 → 폴더 가져오기
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";
import { syncLore, pullLore } from "../src/engine/sdstudio/loresync.js";

const seq = () => { let n = 0; return () => `id${++n}`; };

test("캐릭터 폴더 영어 이름: 에셋·zip 이름엔 영어, 없으면 표기", () => {
  const id = seq();
  let p = P.addChar(P.emptyProject(), { name: "시로코", en: "shiroko" }, id);
  p = P.addFolder(p, { name: "수영복", en: "swimsuit", kind: "outfit" }, id);
  const f = p.folders[0];
  p = P.setMember(p, f.id, p.chars[0].id, true);
  assert.equal(P.folderFileName(P.charFolderOf(p, p.chars[0].id)), "swimsuit");
  assert.equal(P.zipDir(p, p.chars[0]), "swimsuit/shiroko");
  p = P.updateFolder(p, f.id, { en: "" });
  assert.equal(P.zipDir(p, p.chars[0]), "수영복/shiroko");
  p = P.updateFolder(p, f.id, { en: "sw" });
  assert.equal(P.normalizeProject(JSON.parse(JSON.stringify(p))).folders[0].en, "sw");
  // 로어북 연동은 표기 이름
  const r = syncLore([], p);
  assert.equal(r.lorebook[0].comment, "수영복");
});

test("씬 세트: 폴더는 공유, 캐릭터 카드·소속은 세트마다, 저장 뒤에도 유지", () => {
  const id = seq();
  let p = P.addChar(P.emptyProject(), { name: "A" }, id);
  p = P.addFolder(p, { name: "F" }, id);
  p = P.setMember(p, p.folders[0].id, p.chars[0].id, true);
  assert.equal(P.activeSet(p).id, "sfw");
  let q = P.switchSet(p, "nsfw", { mkId: id });
  assert.equal(q.chars.length, 0);
  assert.equal(q.folders.length, 1);
  assert.deepEqual(q.folders[0].members, []);
  q = P.addChar(q, { name: "B" }, id);
  q = P.normalizeProject(JSON.parse(JSON.stringify(q)));
  const back = P.switchSet(q, "sfw");
  assert.deepEqual(back.chars.map((c) => c.name), ["A"]);
  assert.deepEqual(back.folders[0].members, [p.chars[0].id]);
  assert.equal(P.setCharCount(back, "nsfw"), 1);
  assert.deepEqual(P.switchSet(back, "nsfw").chars.map((c) => c.name), ["B"]);
});

test("씬 세트: 빈 세트로 갈 때 캐릭터만 새 id로 가져오기(그림·씬 없이), 세트 추가·지우기", () => {
  const id = seq();
  let p = P.addChar(P.emptyProject(), { name: "A", en: "a", prompt: "red hair" }, id);
  p = P.addImage(p, p.chars[0].id, p.chars[0].scenes[0].id, { path: "x.png" });
  p = P.addFolder(p, { name: "F" }, id);
  p = P.setMember(p, p.folders[0].id, p.chars[0].id, true);
  const q = P.switchSet(p, "nsfw", { copy: true, mkId: id });
  assert.equal(q.chars[0].prompt, "red hair");
  assert.notEqual(q.chars[0].id, p.chars[0].id);
  assert.equal(P.imageCount(q.chars[0]), 0);
  assert.deepEqual(q.folders[0].members, [q.chars[0].id]);
  let r = P.addSet(q, { name: "수영복", tpl: "T" }, id);
  const nid = P.setsOf(r).list.at(-1).id;
  assert.equal(P.setsOf(r).list.at(-1).tpl, "T");
  assert.equal(P.removeSet(r, "nsfw"), r);   // 지금 세트는 못 지움
  r = P.removeSet(r, nid);
  assert.equal(P.setsOf(r).list.length, 2);
});

test("로어북 → 폴더: Dusk 폴더·[소속] 가져오기, 하위 구조 유지, 연결된 것·지운 것은 다시 안 가져옴", () => {
  const id = seq();
  const lore = [
    { comment: "가브리엘", extentions: { da_folder: { id: "L2" }, da_parent: "L1" } },
    { comment: "[소속] 아비도스", extentions: { da_folder: { id: "L1", aff: {} } } },
    { comment: "일반 항목", content: "x" },
    { comment: "고리", extentions: { da_folder: { id: "L3" }, da_parent: "L4" } },
    { comment: "고리2", extentions: { da_folder: { id: "L4" }, da_parent: "L3" } }
  ];
  let { project: p, added } = pullLore(lore, P.emptyProject(), id);
  assert.equal(added, 4);
  const g = p.folders.find((f) => f.lore === "L1"), c = p.folders.find((f) => f.lore === "L2");
  assert.equal(g.name, "아비도스"); assert.equal(g.kind, "group"); assert.equal(g.parent, null);
  assert.equal(c.parent, g.id); assert.equal(c.kind, "");
  assert.equal(pullLore(lore, p, id).added, 0);
  // 지금 결과를 다시 로어북에 맞춰도 바뀌는 것 없음(이름·위치 같음)
  assert.equal(syncLore(lore.slice(0, 2), { ...p, folders: p.folders.filter((f) => f.lore === "L1" || f.lore === "L2") }).changed, false);
  p = P.removeFolder(p, g.id);   // 하위(L2)까지 지움 → 다시 안 가져옴
  assert.ok(p.loreSkip.includes("L1") && p.loreSkip.includes("L2"));
  assert.equal(pullLore(lore, P.normalizeProject(JSON.parse(JSON.stringify(p))), id).added, 0);
});
