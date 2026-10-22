import { newId } from '../engine/util.js';

export function foldersOf(f) {
  return { _folders: Array.isArray(f?._folders) ? f._folders.filter((x) => x && x.id && x.name).map((x) => ({ ...x })) : [], _mapping: f?._mapping && typeof f._mapping === "object" ? { ...f._mapping } : {} };
}
var parentOf = (name) => name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
export var leaf = (name) => name.split("/").pop();
export function childFolders(fd, parentId) {
  const parent = parentId ? fd._folders.find((f) => f.id === parentId) : null;
  const pname = parent?.name ?? "";
  return fd._folders.filter((f) => parentOf(f.name) === pname).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}
export function folderPath(fd, id) {
  const f = fd._folders.find((x) => x.id === id);
  if (!f) return [];
  const parts = f.name.split("/");
  return parts.map((_, i) => fd._folders.find((x) => x.name === parts.slice(0, i + 1).join("/"))).filter(Boolean);
}
export function createFolder(fd, name, parentId) {
  const clean = String(name).replace(/\//g, "／").trim();
  if (!clean) throw new Error("폴더 이름을 입력해 주세요");
  const parent = parentId ? fd._folders.find((f2) => f2.id === parentId) : null;
  const full = parent ? `${parent.name}/${clean}` : clean;
  if (fd._folders.some((f2) => f2.name.toLowerCase() === full.toLowerCase())) throw new Error("같은 이름의 폴더가 있어요");
  const siblings = childFolders(fd, parentId);
  const f = { id: "af_" + newId().slice(0, 8), name: full, order: siblings.reduce((m, x) => Math.max(m, x.order ?? 0), -1) + 1 };
  fd._folders.push(f);
  return f;
}
export function renameFolder(fd, id, name) {
  const f = fd._folders.find((x) => x.id === id);
  if (!f) return;
  const clean = String(name).replace(/\//g, "／").trim();
  if (!clean) return;
  const old = f.name, next = (parentOf(old) ? parentOf(old) + "/" : "") + clean;
  if (fd._folders.some((x) => x !== f && x.name.toLowerCase() === next.toLowerCase())) throw new Error("같은 이름의 폴더가 있어요");
  for (const x of fd._folders) if (x === f) x.name = next;
  else if (x.name.startsWith(old + "/")) x.name = next + x.name.slice(old.length);
}
export function deleteFolder(fd, id) {
  const f = fd._folders.find((x) => x.id === id);
  if (!f) return;
  const gone = new Set(fd._folders.filter((x) => x === f || x.name.startsWith(f.name + "/")).map((x) => x.id));
  fd._folders = fd._folders.filter((x) => !gone.has(x.id));
  for (const [k, v] of Object.entries(fd._mapping)) if (gone.has(v)) delete fd._mapping[k];
}
export function inFolder(fd, assetName, folderId) {
  const v = fd._mapping[assetName] ?? null;
  if (folderId === null) return true;
  if (folderId === "uncategorized") return !v || !fd._folders.some((f) => f.id === v);
  return v === folderId;
}
export function setAssetFolder(fd, names, folderId) {
  for (const n of [].concat(names)) {
    if (folderId) fd._mapping[n] = folderId;
    else delete fd._mapping[n];
  }
}
export function renameMapping(fd, oldName, newName) {
  if (oldName === newName || !(oldName in fd._mapping)) return;
  fd._mapping[newName] = fd._mapping[oldName];
  delete fd._mapping[oldName];
}
export var isEmpty = (fd) => !fd._folders.length && !Object.keys(fd._mapping).length;
