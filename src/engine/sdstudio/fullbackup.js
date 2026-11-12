// 에셋 제작 — 프로젝트 전체 백업(zip). 순수 함수만: 그림 경로 수집·치환·검증.
// zip = dusk-sdstudio-backup.json(프로젝트 설정, 그림 경로를 zip 안 이름으로 바꾼 것) + img/00001.png …
export var BACKUP_NAME = "dusk-sdstudio-backup.json";
export var BACKUP_FORMAT = "dusk-sdstudio-backup";

// 프로젝트 안의 모든 그림 경로(그림·바이브·레퍼런스의 path)
export function assetPaths(p) {
  const out = new Set();
  (function walk(v) {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") { if (typeof v.path === "string" && v.path) out.add(v.path); Object.values(v).forEach(walk); }
  })(p);
  return out;
}

// 문자열 값이 map에 있으면 바꾼다(path·cover처럼 그림을 가리키는 값 모두)
export function remap(v, map) {
  if (typeof v === "string") return map.has(v) ? map.get(v) : v;
  if (Array.isArray(v)) return v.map((x) => remap(x, map));
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = remap(v[k], map); return o; }
  return v;
}

export function makeBackup(proj, names, meta = {}) {
  return { format: BACKUP_FORMAT, v: 1, at: Date.now(), title: String(meta.title ?? ""), project: remap(proj, names) };
}

// 읽은 JSON이 이 백업이면 { project, entries(zip 안 그림 이름들) }, 아니면 null
export function readBackup(j) {
  if (!j || j.format !== BACKUP_FORMAT || !j.project || typeof j.project !== "object") return null;
  return { project: j.project, title: String(j.title ?? ""), at: Number(j.at) || 0, entries: [...assetPaths(j.project)] };
}

// zip 안 이름 → 새로 저장한 경로 로 되돌린다. 그림이 없는 항목(저장 실패)은 지운다
export function restore(project, map) {
  const gone = new Set([...assetPaths(project)].filter((n) => !map.has(n)));
  const fix = (v) => {
    if (Array.isArray(v)) return v.filter((x) => !(x && typeof x === "object" && typeof x.path === "string" && gone.has(x.path))).map(fix);
    if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = fix(v[k]); return o; }
    return v;
  };
  return remap(fix(project), map);
}
