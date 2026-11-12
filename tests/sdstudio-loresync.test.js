import test from "node:test";
import assert from "node:assert/strict";
import { syncLore } from "../src/engine/sdstudio/loresync.js";
import * as P from "../src/engine/sdstudio/project.js";

let n = 0; const mk = () => `f${++n}`;
test("폴더 → 로어북 폴더: 만들기·이름·위치 따라감, 지운 건 안 지우고 다시 안 만듦", () => {
  let p = P.normalizeProject(null);
  p = P.addFolder(p, { name: "gehenna", kind: "group" }, mk);
  const g = p.folders[0].id;
  p = P.addFolder(p, { name: "ako", parent: g }, mk);
  const lore0 = [{ comment: "기존 항목", content: "x" }];
  let r = syncLore(lore0, p);
  assert.equal(r.lorebook.length, 3);
  assert.equal(r.lorebook[0].comment, "기존 항목", "사용자 항목 그대로");
  const [ge, ak] = r.lorebook.slice(1);
  assert.equal(ge.comment, "[소속] gehenna");
  assert.equal(ak.extentions.da_parent, ge.extentions.da_folder.id);
  p = P.setLoreIds(p, r.ids);
  assert.equal(syncLore(r.lorebook, p).changed, false, "바뀐 게 없으면 그대로");
  p = P.updateFolder ? P.updateFolder(p, p.folders[1].id, { name: "아코" }) : p;
  p = P.moveFolder(p, p.folders[1].id, null);
  r = syncLore(r.lorebook, p);
  assert.equal(r.lorebook[2].comment, P.updateFolder ? "아코" : "ako");
  assert.equal(r.lorebook[2].extentions.da_parent, undefined, "맨 위로 옮김");
  const kept = syncLore(r.lorebook, P.removeFolder(p, p.folders[0].id));
  assert.equal(kept.lorebook.length, 3, "에셋 제작에서 지워도 로어북은 남음");
  const gone = syncLore(r.lorebook.filter((e) => e.comment !== "아코" && e.comment !== "ako"), p);
  assert.equal(gone.lorebook.length, 2, "로어북에서 지운 폴더는 다시 안 만듦");
});
test("캐릭터 영어 이름은 보존되고 내보내기 이름에 쓰임", () => {
  let p = P.addChar(P.normalizeProject(null), { name: "아코", en: "ako" });
  p = P.normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.equal(P.fileName(p.chars[0]), "ako");
  assert.equal(P.fileName({ name: "히나" }), "히나");
});
