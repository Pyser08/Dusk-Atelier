import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyWikiScope, createWikiDocument } from "../src/engine/pot/wiki-schema.js";
import { groupPeople, createFolder, renameFolder, deleteFolder, moveToFolder, layoutOf, hasFolders } from "../src/engine/peoplegroup.js";

function setup() {
  let s = createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" });
  s = createWikiDocument(s, { type: "Character", title: "시로코", sections: [] });
  s = createWikiDocument(s, { type: "Character", title: "호시노", sections: [] });
  const ids = Object.values(s.documents).map((d) => d.id);
  const rows = [["k1", { name: "시로코", aliases: [] }], ["k2", { name: "호시노", aliases: [] }], ["k3", { name: "이름만있음", aliases: [] }]];
  return { s, ids, rows };
}
test("폴더 만들기·이동·묶기", () => {
  const { s, ids, rows } = setup();
  assert.equal(hasFolders(s), false);
  const s1 = createFolder(s, "아비도스");
  const fid = layoutOf(s1).folders[0].id;
  const s2 = moveToFolder(s1, [ids[0]], fid);
  const g = groupPeople(rows, s2);
  assert.deepEqual(g.map((x) => x.name), ["아비도스", "미분류"]);
  assert.equal(g[0].rows.length, 1); assert.equal(g[1].rows.length, 2);   // 문서 없는 인물은 미분류
});
test("이름 바꾸기·삭제하면 인물은 미분류로", () => {
  const { s, ids, rows } = setup();
  let w = createFolder(s, "A"); const fid = layoutOf(w).folders[0].id;
  w = moveToFolder(w, ids, fid); w = renameFolder(w, fid, "B");
  assert.equal(groupPeople(rows, w)[0].name, "B");
  w = deleteFolder(w, fid);
  assert.equal(groupPeople(rows, w).length, 1);
  assert.throws(() => createFolder(w, "미분류"), /같은 이름|폴더/);
});
