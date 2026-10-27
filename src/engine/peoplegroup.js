// 인물 목록 폴더(리수폿 people-folders-ui 대응, 순수 함수). 폴더 배치는 위키 범위의 peopleLayout에 저장되고,
// 검증·이동 규칙은 리수폿 엔진(engine/pot/people-folders.js)이 그대로 한다. 여기서는 Dusk 인물 목록을 폴더별로 묶는다.
import { applyPeopleLayout, normalizePeopleLayout } from "./pot/people-folders.js";
import { findDoc } from "./personview.js";

export const UNASSIGNED = "미분류";
export const layoutOf = (wiki) => normalizePeopleLayout(wiki?.peopleLayout, wiki?.documents ?? {});
export const hasFolders = (wiki) => layoutOf(wiki).folders.length > 0;
export const newFolderId = () => `pf${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// rows: [[key, person]] → [{id, name, rows}]  폴더는 만든 순서, 미분류는 맨 뒤(문서가 없는 인물도 미분류). 비어 있는 폴더도 보여 준다.
export function groupPeople(rows, wiki) {
  const layout = layoutOf(wiki), pos = new Map(layout.order.map((id, i) => [id, i]));
  const groups = new Map(layout.folders.map((f) => [f.id, { id: f.id, name: f.name, rows: [] }])); groups.set("", { id: "", name: UNASSIGNED, rows: [] });
  for (const row of rows) {
    const doc = findDoc(wiki, row[1]), fid = doc ? layout.members[doc.id] ?? "" : "";
    (groups.get(fid) ?? groups.get("")).rows.push({ row, docId: doc?.id ?? null });
  }
  for (const g of groups.values()) g.rows.sort((a, b) => (pos.get(a.docId) ?? 1e9) - (pos.get(b.docId) ?? 1e9));
  return [...groups.values()].map((g) => ({ ...g, rows: g.rows.map((x) => x.row), docIds: g.rows.map((x) => x.docId).filter(Boolean) }));
}
export const folderCommand = (wiki, cmd) => applyPeopleLayout(wiki, cmd);
export const createFolder = (wiki, name) => applyPeopleLayout(wiki, { type: "create", id: newFolderId(), name });
export const renameFolder = (wiki, id, name) => applyPeopleLayout(wiki, { type: "rename", id, name });
export const deleteFolder = (wiki, id) => applyPeopleLayout(wiki, { type: "delete", id });
export const moveToFolder = (wiki, docIds, folderId) => applyPeopleLayout(wiki, { type: "move", ids: docIds, folderId });
