// 에셋 제작 폴더 → 봇·모듈 로어북 폴더(Dusk 폴더 형식: extentions.da_folder.id / da_parent). 순수 함수.
// 폴더만 만들고 이름·위치만 맞춘다. 항목 내용은 사용자가 채운다. 에셋 제작에서 지워도 로어북 쪽은 안 지운다.
// 연결 기록: 프로젝트 폴더의 lore = 로어북 폴더 id. 로어북에서 사용자가 지운 폴더는 다시 만들지 않는다.
var AFF = "[소속] ";
var SWATCH = ["#7c9cff", "#ff8fab", "#7fd1b9", "#ffc46b", "#c39bff", "#6fc3ff", "#ff9f6b", "#a7d16b"];
var rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
var fid = (e) => e?.extentions?.da_folder?.id || null;

// newFolder(name, lorebook, {aff}) — 코어의 폴더 항목 만들기(소속 규칙 포함)를 넘겨받아 쓴다. 없으면 기본 폴더
export function syncLore(lorebook, proj, { newFolder } = {}) {
  const list = (Array.isArray(lorebook) ? lorebook : []).map((e) => e);
  const at = new Map(list.map((e, i) => [fid(e), i]).filter(([k]) => k));
  const ids = {};
  let changed = false;
  const byId = new Map(proj.folders.map((f) => [f.id, f]));
  const order = [], seen = new Set();
  const visit = (f) => { if (!f || seen.has(f.id)) return; seen.add(f.id); if (f.parent) visit(byId.get(f.parent)); order.push(f); };
  proj.folders.forEach(visit);
  const loreOf = (f) => ids[f.id] ?? f.lore ?? null;
  for (const f of order) {
    const aff = f.kind === "group", parent = f.parent ? loreOf(byId.get(f.parent)) : null;
    const want = (aff ? AFF : "") + f.name;
    if (f.lore) {
      const i = at.get(f.lore);
      if (i == null) continue;   // 로어북에서 지움 — 그대로 둠
      const e = list[i], ex = { ...(e.extentions ?? {}) };
      const want_p = parent && at.has(parent) ? parent : null;   // 부모가 로어북에 없으면 맨 위
      if (e.comment !== want || (ex.da_parent || null) !== want_p) {
        if (want_p) ex.da_parent = want_p; else delete ex.da_parent;
        list[i] = { ...e, comment: want, extentions: ex }; changed = true;
      }
      continue;
    }
    const e = newFolder ? newFolder(f.name, list, { aff }) : { key: "", secondkey: "", insertorder: 100, comment: want, content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { da_folder: { id: rid(), color: SWATCH[list.length % SWATCH.length] } } };
    e.comment = want;
    if (parent && at.has(parent)) e.extentions = { ...e.extentions, da_parent: parent };
    list.push(e); const id = fid(e); at.set(id, list.length - 1); ids[f.id] = id; changed = true;
  }
  return { lorebook: list, ids, changed };
}

// 로어북 → 에셋 제작(양방향의 가져오는 쪽). 아직 연결 안 된 Dusk 폴더([소속] 포함)를 폴더로 만든다.
// [소속] → kind "group", 하위 구조(da_parent) 유지, lore = 로어북 폴더 id로 연결.
// 이미 연결된 폴더의 이름·위치는 에셋 제작 쪽이 기준(syncLore가 로어북에 맞춤). 에셋 제작에서 지운 폴더(loreSkip)는 다시 안 가져옴.
export function pullLore(lorebook, proj, mkId = rid) {
  const all = (Array.isArray(lorebook) ? lorebook : []).filter((e) => fid(e));
  const linked = new Map(proj.folders.filter((f) => f.lore).map((f) => [f.lore, f.id]));
  const skip = new Set(proj.loreSkip ?? []);
  const known = new Set(all.map(fid));
  let todo = all.filter((e) => !linked.has(fid(e)) && !skip.has(fid(e)));
  const folders = [...proj.folders];
  let added = 0;
  const make = (e, parent) => {
    const raw = String(e.comment ?? "").trim(), aff = raw.startsWith(AFF.trim()) || !!e.extentions?.da_folder?.aff;
    const name = raw.replace(/^\[소속\]\s*/, "").trim() || "새 폴더";
    const id = mkId();
    folders.push({ id, name, en: "", kind: aff ? "group" : "", prompt: "", tpl: "", lore: fid(e), parent, members: [] });
    linked.set(fid(e), id); added++;
  };
  while (todo.length) {
    const next = [];
    for (const e of todo) {
      const par = e.extentions?.da_parent || null;
      if (!par || !known.has(par) || skip.has(par)) make(e, null);
      else if (linked.has(par)) make(e, linked.get(par));
      else next.push(e);
    }
    if (next.length === todo.length) { next.forEach((e) => make(e, null)); break; }   // 고리 — 맨 위로
    todo = next;
  }
  return { project: added ? { ...proj, folders } : proj, added };
}
