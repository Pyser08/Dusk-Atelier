export var FOLDER_COLORS = ["default", "red", "yellow", "green", "blue", "indigo", "purple", "pink"];
export var FOLDER_COLOR_CSS = { default: null, red: "#f87171", yellow: "#facc15", green: "#4ade80", blue: "#60a5fa", indigo: "#818cf8", purple: "#c084fc", pink: "#f472b6" };
export var FOLDER_COLOR_KO = { default: "기본", red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", indigo: "남색", purple: "보라", pink: "분홍" };
var isFolder = (x) => x && typeof x === "object" && Array.isArray(x.data);
var clone = (o) => o.map((x) => isFolder(x) ? { ...x, data: [...x.data] } : x);
export function layout(order, chars) {
  const live = new Set(chars.filter((c) => c && !c.trashTime).map((c) => c.chaId));
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const x of order ?? []) {
    if (typeof x === "string") {
      if (live.has(x) && !seen.has(x)) {
        seen.add(x);
        out.push({ type: "char", id: x });
      }
    } else if (isFolder(x)) {
      const ids = x.data.filter((id) => live.has(id) && !seen.has(id));
      ids.forEach((id) => seen.add(id));
      out.push({ type: "folder", folder: x, ids });
    }
  }
  for (const c of chars) if (c && !c.trashTime && !seen.has(c.chaId)) {
    seen.add(c.chaId);
    out.push({ type: "char", id: c.chaId });
  }
  return out;
}
function take(order, id) {
  const o = [];
  for (const x of order) {
    if (x === id) continue;
    if (isFolder(x)) o.push({ ...x, data: x.data.filter((d) => d !== id) });
    else o.push(x);
  }
  return o;
}
export function moveChar(order, id, { beforeId, after, folderId }) {
  const ids = [].concat(id);
  if (beforeId && ids.includes(beforeId)) return clone(order ?? []);
  let o = clone(order ?? []);
  for (const c of ids) o = take(o, c);
  if (beforeId) {
    const top = o.indexOf(beforeId);
    if (top >= 0) {
      o.splice(top + (after ? 1 : 0), 0, ...ids);
      return o;
    }
    for (const x of o) if (isFolder(x)) {
      const i = x.data.indexOf(beforeId);
      if (i >= 0) {
        x.data.splice(i + (after ? 1 : 0), 0, ...ids);
        return o;
      }
    }
    o.push(...ids);
    return o;
  }
  if (folderId) {
    const f = o.find((x) => isFolder(x) && x.id === folderId);
    if (f) {
      f.data.push(...ids);
      return o;
    }
  }
  o.push(...ids);
  return o;
}
export function createFolder2(order, { id, name, color = "default", ids = [] }) {
  let o = clone(order ?? []);
  let at = o.length;
  if (ids.length) {
    const first = o.findIndex((x) => x === ids[0] || isFolder(x) && x.data.includes(ids[0]));
    if (first >= 0) at = first;
  }
  for (const c of ids) o = take(o, c);
  at = Math.min(at, o.length);
  o.splice(at, 0, { id, name, color, data: [...ids] });
  return o;
}
export function setMembers(order, folderId, ids) {
  let o = clone(order ?? []);
  const f = o.find((x) => isFolder(x) && x.id === folderId);
  if (!f) return o;
  const out = f.data.filter((d) => !ids.includes(d));
  for (const c of ids) o = take(o, c);
  const g = o.find((x) => isFolder(x) && x.id === folderId);
  g.data = [...ids];
  const at = o.indexOf(g) + 1;
  o.splice(at, 0, ...out);
  return o;
}
export function renameFolder2(order, folderId, name) {
  return clone(order ?? []).map((x) => isFolder(x) && x.id === folderId ? { ...x, name } : x);
}
export function colorFolder(order, folderId, color) {
  return clone(order ?? []).map((x) => isFolder(x) && x.id === folderId ? { ...x, color } : x);
}
export function deleteFolder2(order, folderId) {
  const o = [];
  for (const x of clone(order ?? [])) {
    if (isFolder(x) && x.id === folderId) o.push(...x.data);
    else o.push(x);
  }
  return o;
}
export function moveFolder(order, folderId, dir) {
  const o = clone(order ?? []);
  const i = o.findIndex((x) => isFolder(x) && x.id === folderId), j = i + dir;
  if (i < 0 || j < 0 || j >= o.length) return o;
  [o[i], o[j]] = [o[j], o[i]];
  return o;
}
export var folderOf = (order, id) => (order ?? []).find((x) => isFolder(x) && x.data.includes(id)) ?? null;
