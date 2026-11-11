// 에셋 제작 — SDStudio 백업 가져오기. 순수(파일 읽기는 넘겨받은 read 함수로).
// SDStudio 백업 = tar(프로젝트 백업: project.json + outs/<씬>/<그림>, 폴더 백업: _folder.json + <프로젝트>/..., 전체 백업: _backup.json + <프로젝트>/...)
// 또는 프로젝트 JSON(그림 없음). zip으로 묶은 것도 읽는다.
import { parseTemplateFile, applyTemplate } from "./template.js";
import * as P from "./project.js";

var dec = new TextDecoder();
var cstr = (b, o, n) => { let e = o; while (e < o + n && b[e]) e++; return dec.decode(b.subarray(o, e)); };
var oct = (b, o, n) => parseInt(cstr(b, o, n).trim() || "0", 8) || 0;
var IMG = /\.(png|webp|jpe?g|avif)$/i;

// tar 목록: read(off, len) → Promise<Uint8Array>. 그림 내용은 안 읽고 자리만 기억한다(큰 백업도 메모리에 안 올림).
export async function listTar(read, total) {
  const out = [];
  let off = 0, longName = null, pax = null;
  while (off + 512 <= total) {
    const hd = await read(off, 512);
    if (hd.every((x) => x === 0)) break;
    const size = oct(hd, 124, 12), type = String.fromCharCode(hd[156] || 48), data = off + 512;
    let name = cstr(hd, 0, 100);
    const magic = cstr(hd, 257, 6), prefix = magic.startsWith("ustar") ? cstr(hd, 345, 155) : "";
    if (prefix) name = `${prefix}/${name}`;
    if (type === "L") longName = cstr(await read(data, size), 0, size);
    else if (type === "x") {
      const txt = dec.decode(await read(data, size));
      pax = {};
      for (const line of txt.split("\n")) { const m = /^\d+ ([^=]+)=(.*)$/.exec(line); if (m) pax[m[1]] = m[2]; }
    } else if (type === "g") { /* 전역 pax — 무시 */ }
    else {
      if (pax?.path) name = pax.path; else if (longName) name = longName;
      if (type === "0" || type === "\0" || type === "7") out.push({ name: name.replace(/^\.\//, ""), off: data, size });
      longName = null; pax = null;
    }
    off = data + Math.ceil(size / 512) * 512;
  }
  return out;
}
export var isTar = (head) => head.length >= 262 && cstr(head, 257, 5) === "ustar";

// 목록(이름들) + JSON 읽기 → 프로젝트들
// files: [{ name }], readJson(name) → Promise<object>
export async function findProjects(files, readJson) {
  const names = new Set(files.map((f) => f.name));
  let manifest = null;
  if (names.has("_backup.json")) manifest = await readJson("_backup.json").catch(() => null);
  else if (names.has("_folder.json")) manifest = await readJson("_folder.json").catch(() => null);
  const roots = files.filter((f) => /(^|\/)project\.json$/.test(f.name)).map((f) => f.name.slice(0, -"project.json".length));
  const folderOf = (nm) => {
    if (manifest?.type === "sdstudio-folder-backup") return manifest.folder || "";
    const p = (manifest?.projects ?? []).find((x) => x && (x.name === nm || x === nm));
    return (p && typeof p === "object" ? p.folder : "") || "";
  };
  const out = [];
  for (const root of roots) {
    let session;
    try { session = await readJson(`${root}project.json`); } catch { continue; }
    if (!session || typeof session.scenes !== "object") continue;
    const name = String(session.name || root.replace(/\/$/, "").split("/").pop() || "SDStudio").slice(0, 80);
    out.push(projectFromSession(session, { name, folder: folderOf(root.replace(/\/$/, "")) || folderOf(name), root, files }));
  }
  return out;
}

// SDStudio 세션 → { name, folder, prompt, back, neg, tpl, images: { 씬이름: [{ file, fav }] }, count, favCount }
export function projectFromSession(session, { name = session?.name || "SDStudio", folder = "", root = "", files = [] } = {}) {
  const wf = session.selectedWorkflow?.workflowType || "SDImageGen", pn = session.selectedWorkflow?.presetName;
  const list = session.presets?.[wf] ?? session.presets?.SDImageGen ?? [];
  const pre = (Array.isArray(list) ? list.find((x) => x?.name === pn) ?? list[0] : null) ?? {};
  const tpl = parseTemplateFile(session);
  tpl.scenes = tpl.scenes.filter((s, i) => (Object.values(session.scenes)[i]?.type ?? "scene") === "scene");
  const images = {};
  let count = 0, favCount = 0;
  const byScene = new Map();
  for (const f of files) {
    if (!f.name.startsWith(`${root}outs/`) || !IMG.test(f.name)) continue;
    const rest = f.name.slice(`${root}outs/`.length), cut = rest.lastIndexOf("/");
    if (cut < 0) continue;
    const sn = rest.slice(0, cut), file = rest.slice(cut + 1);
    if (!byScene.has(sn)) byScene.set(sn, []);
    byScene.get(sn).push({ file, entry: f.name });
  }
  for (const [key, s] of Object.entries(session.scenes ?? {})) {
    if (!s || (s.type && s.type !== "scene")) continue;
    const sn = String(s.name || key), got = byScene.get(sn) ?? [];
    const mains = new Set((s.mains ?? []).map((x) => String(x).split("/").pop()));
    const order = (s.imageMap ?? []).map((x) => String(x).split("/").pop());
    const rank = (f) => { const i = order.indexOf(f); return i < 0 ? 1e9 : i; };
    got.sort((a, b) => rank(a.file) - rank(b.file) || a.file.localeCompare(b.file));
    images[sn] = got.map((g) => ({ ...g, fav: mains.has(g.file) }));
    count += got.length; favCount += images[sn].filter((x) => x.fav).length;
  }
  return { name, folder: String(folder || ""), prompt: String(pre.frontPrompt ?? ""), back: String(pre.backPrompt ?? ""), neg: String(pre.uc ?? ""), tpl, images, count, favCount };
}

// 프로젝트들을 우리 프로젝트에 캐릭터로 넣는다 → { project, jobs: [{ cid, sid, entry, fav, order }] }
// mode: "all" | "fav" | "none"
export function importProjects(p, projs, { mode = "fav" } = {}, mkId) {
  let next = p;
  const jobs = [];
  const taken = new Set(p.chars.map((c) => c.name));
  const uniq = (nm) => { if (!taken.has(nm)) { taken.add(nm); return nm; } let k = 2; while (taken.has(`${nm} ${k}`)) k++; taken.add(`${nm} ${k}`); return `${nm} ${k}`; };
  for (const pj of projs) {
    next = mkId ? P.addChar(next, { name: uniq(pj.name), prompt: pj.prompt }, mkId) : P.addChar(next, { name: uniq(pj.name), prompt: pj.prompt });
    const c = next.chars[next.chars.length - 1];
    if (pj.tpl.scenes.length) next = applyTemplate(next, [c.id], pj.tpl, "replace", mkId).project;
    if (pj.folder) {
      let f = next.folders.find((x) => x.name === pj.folder && !x.parent);
      if (!f) { next = mkId ? P.addFolder(next, { name: pj.folder }, mkId) : P.addFolder(next, { name: pj.folder }); f = next.folders[next.folders.length - 1]; }
      next = P.moveChars(next, [c.id], { to: f.id });
    }
    if (mode === "none") continue;
    const cc = P.charOf(next, c.id);
    for (const sc of cc.scenes) {
      const imgs = (pj.images[sc.name] ?? []).filter((x) => mode === "all" || x.fav);
      imgs.forEach((x, i) => jobs.push({ cid: c.id, sid: sc.id, entry: x.entry, fav: x.fav, order: i }));
    }
  }
  // 상위·하위·제외 프롬프트는 비어 있을 때만 첫 프로젝트 값으로
  const first = projs[0];
  if (first) {
    const s = next.settings, patch = {};
    if (!String(s.back ?? "").trim() && first.back.trim()) patch.back = first.back;
    if (!String(s.neg ?? "").trim() && first.neg.trim()) patch.neg = first.neg;
    if (Object.keys(patch).length) next = P.setSettings(next, patch);
  }
  return { project: next, jobs };
}
