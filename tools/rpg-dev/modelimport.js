// 직접 만든 모델 불러오기(범용): .vox + 표시점 .json → 대검 공용 뼈대에 자동 장착
// 표시점: grip(오른손, 필수 권장) · tip(칼끝) · off(왼손) · back(등). 없으면 모양에서 추정한다
import * as THREE from "three"; import { greedy } from "../voxtools/mesh.mjs"; import { GS_FRAME } from "./greatsword.js";
/** .vox(ArrayBuffer) → 복셀 목록 {x,y,z,c}. 축: y 위, z 앞 (voxtools와 같은 규칙) */
export function parseVox(ab) {
  const dv = new DataView(ab), s = (p) => String.fromCharCode(...new Uint8Array(ab, p, 4)); if (s(0) !== "VOX ") throw new Error(".vox 파일이 아니에요");
  let p = 20, size, xyzi, pal; while (p < ab.byteLength) { const id = s(p), n = dv.getUint32(p + 4, true), m = dv.getUint32(p + 8, true), d = p + 12;
    if (id === "SIZE" && !size) size = [dv.getUint32(d, true), dv.getUint32(d + 4, true), dv.getUint32(d + 8, true)]; else if (id === "XYZI" && !xyzi) { const k = dv.getUint32(d, true); xyzi = []; for (let i = 0; i < k; i++) xyzi.push([0, 1, 2, 3].map((j) => dv.getUint8(d + 4 + i * 4 + j))); } else if (id === "RGBA") { pal = []; for (let i = 0; i < 256; i++) pal.push([0, 1, 2].map((j) => dv.getUint8(d + i * 4 + j))); }
    p = id === "MAIN" ? d + n : d + n + m; }
  if (!xyzi) throw new Error("모델이 없어요"); return xyzi.map(([x, y, z, i]) => ({ x, y: z, z: size[1] - 1 - y, c: pal ? pal[(i - 1) & 255] : [200, 200, 200] }));
}
/** 규격 검사: 크기·복셀 수·면 수·표시점 */
export function checkModel(vox, pts = {}, kind = "greatsword") {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const v of vox) for (const [i, k] of ["x", "y", "z"].entries()) { lo[i] = Math.min(lo[i], v[k]); hi[i] = Math.max(hi[i], v[k]); }
  const size = hi.map((h, i) => h - lo[i] + 1), tris = greedy(vox).tris, W = [], BUD = { greatsword: { tris: 20000 } }[kind] ?? { tris: 20000 };
  if (!pts.grip) W.push("오른손 표시점(grip, 빨강)이 없어서 아래쪽 끝으로 추정해요"); if (!pts.tip) W.push("칼끝 표시점(tip, 노랑)이 없어서 손잡이에서 가장 먼 칸으로 추정해요"); if (!pts.off) W.push("왼손 표시점(off, 초록)이 없어서 손잡이 축으로 추정해요");
  if (tris > BUD.tris) W.push(`면 수 ${tris}가 예산 ${BUD.tris}를 넘어요(복셀을 줄이거나 색 경계를 단순하게)`);
  return { size, count: vox.length, tris, warn: W };
}
const avg = (a) => a.reduce((s, p) => s.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / a.length);
/** 불러온 복셀 → 대검 객체(makeGreatSword와 같은 모양: { obj, pt(이름), n, tris }) */
export function makeImportedSword(vox, pts = {}, name = "불러온 대검") {
  const P = (k) => (pts[k]?.length ? avg(pts[k]).addScalar(.5) : null); // 칸 가운데
  let grip = P("grip"), tip = P("tip");
  if (!grip) { let m = vox[0]; for (const v of vox) if (v.y < m.y) m = v; grip = new THREE.Vector3(m.x + .5, m.y + 4, m.z + .5); }
  if (!tip) { let best = 0; for (const v of vox) { const d = new THREE.Vector3(v.x + .5, v.y + .5, v.z + .5).distanceTo(grip); if (d > best) { best = d; tip = new THREE.Vector3(v.x + .5, v.y + .5, v.z + .5); } } }
  // 크기: 손잡이→칼끝 길이를 공용 뼈대 값에 맞춘다(동작의 땅 박힘·손 위치가 그대로 맞도록)
  const L = GS_FRAME.pts.tip[1] - GS_FRAME.pts.main[1], scale = L / grip.distanceTo(tip);
  // 방향: 손잡이→칼끝 = +y, 모델의 가장 얇은 축(보통 앞뒤 z) = 칼면 ±z
  const yA = tip.clone().sub(grip).normalize(), zA = new THREE.Vector3(0, 0, 1).addScaledVector(yA, -yA.z).normalize(), xA = new THREE.Vector3().crossVectors(yA, zA);
  const rot = new THREE.Matrix4().makeBasis(xA, yA, zA).invert(), m = greedy(vox, 1), pos = m.position;
  for (let i = 0; i < pos.length; i += 3) { const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]).sub(grip).applyMatrix4(rot).multiplyScalar(scale); pos[i] = v.x; pos[i + 1] = v.y + GS_FRAME.pts.main[1]; pos[i + 2] = v.z; }
  const nr = new THREE.Matrix3().setFromMatrix4(rot); for (let i = 0; i < m.normal.length; i += 3) { const v = new THREE.Vector3(m.normal[i], m.normal[i + 1], m.normal[i + 2]).applyMatrix3(nr); m.normal[i] = v.x; m.normal[i + 1] = v.y; m.normal[i + 2] = v.z; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(m.normal, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(m.color, 3)); g.setIndex(m.index);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); mesh.castShadow = true; const obj = new THREE.Group(); obj.add(mesh);
  // 표시점을 대검 좌표로: 왼손·등이 없으면 공용 뼈대 기본값
  const toLocal = (v) => v.clone().sub(grip).applyMatrix4(rot).multiplyScalar(scale).add(new THREE.Vector3(0, GS_FRAME.pts.main[1], 0)), local = { main: new THREE.Vector3(...GS_FRAME.pts.main), tip: toLocal(tip), off: P("off") ? toLocal(P("off")) : new THREE.Vector3(...GS_FRAME.pts.off), back: P("back") ? toLocal(P("back")) : new THREE.Vector3(...GS_FRAME.pts.back) };
  return { obj, n: name, tris: m.tris, pt: (k) => local[k].clone(), scale };
}
// 사냥 시험장으로 넘기기: 브라우저 저장소에 담아 둔다
export const stash = { save: (ab, json, name) => { const b = btoa(String.fromCharCode(...new Uint8Array(ab))); localStorage.setItem("mh_import", JSON.stringify({ b, json, name })); }, load: () => { const s = JSON.parse(localStorage.getItem("mh_import") || "null"); if (!s) return null; const u = Uint8Array.from(atob(s.b), (c) => c.charCodeAt(0)); return { vox: parseVox(u.buffer), json: s.json, name: s.name }; } };
