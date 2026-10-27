// 로어북 목록 구조 계산(순수): 폴더 트리 만들기, 이름순 정렬.
// 폴더 구조는 항목의 부모 표시(da_parent / 리스 순정 folder)가 정하므로, 배열 순서만 바꿔서 구조가 무너지지 않는다.
import { affName, folderIdOf, folderMap, isFolder, parentOf } from "./lorerules.js";

const collator = typeof Intl !== "undefined" ? new Intl.Collator(["ko", "en"], { numeric: true, sensitivity: "base" }) : null;
export const nameOf = (x) => (isFolder(x) ? affName(x) : String(x?.comment ?? "")).trim() || String(x?.key ?? "").trim() || "";
export const byName = (a, b) => (collator ? collator.compare(nameOf(a), nameOf(b)) : nameOf(a).localeCompare(nameOf(b)));

// 부모 id -> 자식들(목록 순서 그대로). 부모를 못 찾는 항목은 맨 위(null)로 본다.
export function childrenMap(list) {
  const fmap = folderMap(list), kids = new Map();
  for (const x of list) {
    const p = parentOf(x);
    const key = p && fmap.has(p) && fmap.get(p) !== x ? p : null;
    if (!kids.has(key)) kids.set(key, []);
    kids.get(key).push(x);
  }
  return kids;
}

// 구분선(-- 이름 --)은 제자리에 두고, 구분선 사이 구간 안에서만 정렬한다. 폴더가 먼저, 그다음 항목.
function sortSiblings(arr, isDivider) {
  const out = [];
  let seg = [];
  const flush = () => {
    out.push(...seg.filter(isFolder).sort(byName), ...seg.filter((x) => !isFolder(x)).sort(byName));
    seg = [];
  };
  for (const x of arr) {
    if (!isFolder(x) && isDivider(x)) { flush(); out.push(x); } else seg.push(x);
  }
  flush();
  return out;
}

// 이름순으로 다시 늘어놓은 새 배열. scope(폴더 id)를 주면 그 폴더 안만 정렬하고 나머지는 원래 순서를 지킨다.
// 항목은 하나도 빠지거나 늘지 않는다(순환 등으로 못 닿는 항목은 끝에 붙인다).
export function sortLoreByName(list, { isDivider = () => false, scope = null } = {}) {
  const kids = childrenMap(list), seen = new Set(), out = [];
  const walk = (parent, sorting) => {
    const raw = kids.get(parent) ?? [];
    for (const x of sorting ? sortSiblings(raw, isDivider) : raw) {
      if (seen.has(x)) continue;
      seen.add(x);
      out.push(x);
      if (isFolder(x)) walk(folderIdOf(x), sorting || (scope !== null && folderIdOf(x) === scope));
    }
  };
  walk(null, scope === null);
  for (const x of list) if (!seen.has(x)) out.push(x);
  return out;
}

// 선택기용 트리: [{ entry, folder: bool, children: [...] }]. pickable(entry)가 아닌 항목은 숨기되, 고를 수 있는 항목이 안에 있는 폴더는 남긴다.
export function pickTree(list, { pickable = () => true, isDivider = () => false } = {}) {
  const kids = childrenMap(list), seen = new Set();
  const build = (parent) => {
    const res = [];
    for (const x of sortSiblings(kids.get(parent) ?? [], isDivider)) {
      if (seen.has(x) || (!isFolder(x) && isDivider(x))) continue;
      seen.add(x);
      if (isFolder(x)) {
        const children = build(folderIdOf(x));
        const self = pickable(x);
        if (children.length || self) res.push({ entry: x, folder: true, self, children });
      } else if (pickable(x)) res.push({ entry: x, folder: false, self: true, children: [] });
    }
    return res;
  };
  return build(null);
}
