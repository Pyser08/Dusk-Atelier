// 에셋 제작 — 씬 템플릿. 순수. 캐릭터의 씬 구성(이름·슬롯 조합·크기)을 묶어 저장·적용한다(그림·예약은 안 담음).
// 가져오기: 우리 파일(format "dusk-sdstudio-template") · SDStudio 씬 템플릿 파일(type "sdstudio-scene-template", session.scenes·library) · SDStudio 프로젝트(세션) JSON 그대로.
// 적용: 여러 캐릭터에 한 번에. 처음 상태(씬이 빈 default 하나뿐) 캐릭터는 그냥 바꾸고, 씬이 있으면 합치기(없는 씬만 더함) 또는 바꾸기(템플릿 씬 목록으로 — 같은 이름 씬은 그림을 지킴).
import { RESOLUTIONS, clampSize } from "./nai.js";
import * as P from "./project.js";

var str = (v, n = 8000) => String(v ?? "").slice(0, n);
var newId = () => Math.random().toString(36).slice(2, 10);
var normSlots = (slots) => (Array.isArray(slots) ? slots : []).filter(Array.isArray).map((s) => s.filter((x) => x && typeof x === "object").map((x) => ({ prompt: str(x.prompt), on: x.on !== false && x.enabled !== false })));
var normPieces = (libs) => (Array.isArray(libs) ? libs : []).filter((l) => l && typeof l.name === "string" && l.name).map((l) => ({ name: str(l.name, 40).replace(/[.<>,]/g, ""), pieces: (Array.isArray(l.pieces) ? l.pieces : []).filter((p) => p && typeof p.name === "string" && p.name).map((p) => ({ name: str(p.name, 40).replace(/[.<>,]/g, ""), prompt: str(p.prompt), multi: !!p.multi })) }));

export function templateFromChar(c, name, pieces = []) {
  return { v: 1, name: str(name, 80).trim() || `${c.name} 씬`, scenes: c.scenes.map((s) => ({ name: s.name, slots: normSlots(s.slots), size: s.size || "" })), pieces: normPieces(pieces) };
}
export var templateFile = (t) => JSON.stringify({ format: "dusk-sdstudio-template", v: 1, name: t.name, scenes: t.scenes, pieces: t.pieces ?? [] }, null, 1);

function sdSize(s) {
  if (s?.resolution && s.resolution !== "custom" && RESOLUTIONS[s.resolution]) return s.resolution;
  if (s?.resolutionWidth && s?.resolutionHeight) { const z = clampSize(s.resolutionWidth, s.resolutionHeight); return `${z.width}x${z.height}`; }
  return "";
}
export function parseTemplateFile(j) {
  if (j?.format === "dusk-sdstudio-template") {
    return { v: 1, name: str(j.name, 80) || "가져온 템플릿", scenes: (Array.isArray(j.scenes) ? j.scenes : []).filter((s) => s && s.name).map((s) => ({ name: str(s.name, 80), slots: normSlots(s.slots), size: typeof s.size === "string" ? s.size : "" })), pieces: normPieces(j.pieces) };
  }
  const session = j?.type === "sdstudio-scene-template" ? j.session : j?.scenes && typeof j.scenes === "object" ? j : null;
  if (!session || typeof session.scenes !== "object") throw new Error("SDStudio 씬 템플릿이나 Dusk 템플릿 파일이 아니에요");
  const scenes = Object.entries(session.scenes).filter(([, s]) => s && typeof s === "object").map(([k, s]) => ({ name: str(s.name || k, 80), slots: normSlots(s.slots), size: sdSize(s) }));
  const pieces = normPieces(Object.values(session.library ?? {}));
  return { v: 1, name: str(j.name ?? session.name, 80) || "가져온 템플릿", scenes, pieces };
}

export var isPristine = (c) => !c.scenes.length || (c.scenes.length === 1 && !c.scenes[0].images.length && !c.scenes[0].slots.some((s) => s.some((p) => p.prompt.trim())));
export var needsChoice = (p, cids) => cids.filter((id) => { const c = P.charOf(p, id); return c && !isPristine(c); });

export function mergePieces(have, add) {
  const out = (have ?? []).map((l) => ({ ...l, pieces: [...l.pieces] }));
  for (const l of normPieces(add)) {
    const mine = out.find((x) => x.name === l.name);
    if (!mine) { out.push(l); continue; }
    for (const pc of l.pieces) if (!mine.pieces.some((x) => x.name === pc.name)) mine.pieces.push(pc);
  }
  return out;
}

// mode: "merge" | "replace". 처음 상태 캐릭터는 늘 replace. → { project, stats }
export function applyTemplate(p, cids, tpl, mode = "merge", mkId = newId) {
  const stats = { chars: 0, added: 0, kept: 0, removed: 0, updated: 0 };
  const fresh = (s) => ({ id: mkId(), name: s.name, slots: normSlots(s.slots), size: s.size || "", reserve: 0, cover: "", memo: "", images: [] });
  let next = { ...p, pieces: mergePieces(p.pieces, tpl.pieces) };
  for (const cid of cids) {
    const c = P.charOf(next, cid);
    if (!c) continue;
    stats.chars++;
    const m = isPristine(c) ? "replace" : mode;
    const byName = new Map(c.scenes.map((s) => [s.name.toLowerCase(), s]));
    let scenes;
    if (m === "merge") {
      scenes = [...c.scenes];
      for (const s of tpl.scenes) { if (byName.has(s.name.toLowerCase())) stats.kept++; else { scenes.push(fresh(s)); stats.added++; } }
    } else {
      const want = new Set(tpl.scenes.map((s) => s.name.toLowerCase()));
      stats.removed += c.scenes.filter((s) => !want.has(s.name.toLowerCase())).length;
      scenes = tpl.scenes.map((s) => {
        const old = byName.get(s.name.toLowerCase());
        if (old) { stats.updated++; return { ...old, slots: normSlots(s.slots), size: s.size || "" }; }
        stats.added++; return fresh(s);
      });
    }
    next = P.updateChar(next, cid, { scenes });
  }
  return { project: next, stats };
}
