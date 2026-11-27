// 사냥꾼 인형(6.5등신): 뼈별 복셀 → 면 합치기 → 스킨 메시 하나. 관절 근처는 두 뼈를 섞어 따라가서 살이 휘어진다
// 단위: 머리 하나 = 7칸, 키 = 45.5칸. 이목구비 없음. 오른쪽 = x 음수, 앞 = +z
import * as THREE from "three"; import { mesh, mat, ink } from "./voxkit.js";
export const HU = .055; // 한 칸 길이(키 ≈ 2.5)
const RS = 2; // 칸당 복셀 수
// [이름, 부모, 관절 x, y, z]
const BONES = [["hips", null, 0, 23.5, 0], ["spine", "hips", 0, 27, 0], ["chest", "spine", 0, 31, 0], ["neck", "chest", 0, 36.5, 0], ["head", "neck", 0, 38.8, 0],
  ["clR", "chest", -1.2, 35.8, .6], ["uaR", "clR", -5.4, 35.4, 0], ["laR", "uaR", -6.5, 27.6, 0], ["hR", "laR", -7, 21.4, .2], ["fgR", "hR", -7.15, 18.7, .55], ["tbR", "hR", -6.75, 20.5, 1.05],
  ["clL", "chest", 1.2, 35.8, .6], ["uaL", "clL", 5.4, 35.4, 0], ["laL", "uaL", 6.5, 27.6, 0], ["hL", "laL", 7, 21.4, .2], ["fgL", "hL", 7.15, 18.7, .55], ["tbL", "hL", 6.75, 20.5, 1.05],
  ["ulR", "hips", -2.5, 23, 0], ["llR", "ulR", -2.6, 12.8, .15], ["ftR", "llR", -2.6, 2.4, -.2], ["ulL", "hips", 2.5, 23, 0], ["llL", "ulL", 2.6, 12.8, .15], ["ftL", "llL", 2.6, 2.4, -.2]];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i])), PARENT = Object.fromEntries(BONES.map((b) => [b[0], b[1]]));
// 관절마다 살이 섞이는 반경(칸): 자식 뼈 이름 → 반경
const BLEND = { spine: 2.6, chest: 2.4, neck: 1.4, head: 1.2, clR: 1.6, clL: 1.6, uaR: 2.1, uaL: 2.1, laR: 1.7, laL: 1.7, hR: 1.1, hL: 1.1, fgR: .7, fgL: .7, tbR: .6, tbL: .6, ulR: 2.6, ulL: 2.6, llR: 2.1, llL: 2.1, ftR: 1.3, ftL: 1.3 };
const dk = (c, k = .8) => new THREE.Color(c).multiplyScalar(k).getHex();
// 몸통 단면(y → 좌우 반폭, 앞뒤 반폭, 앞뒤 중심)
const TORSO = { m: [[22, 3.9, 2.6, 0], [24, 4.4, 2.8, 0], [26, 4, 2.55, .1], [27.5, 3.75, 2.45, .15], [30, 4.2, 2.7, .2], [33, 4.95, 3, .2], [35, 5.3, 2.8, 0], [36.2, 4.6, 2.4, -.2], [37, 2.8, 1.9, -.2]],
  f: [[22, 4.1, 2.7, 0], [24, 4.7, 2.9, -.1], [26, 4.1, 2.5, 0], [28, 3.25, 2.25, .1], [30.5, 3.6, 2.4, .1], [33, 4.2, 2.6, .1], [35, 4.55, 2.5, 0], [36.2, 4, 2.2, -.2], [37, 2.5, 1.7, -.2]] };
const lerpRow = (T, y) => { if (y <= T[0][0]) return T[0]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const a = T[i - 1], b = T[i], t = (y - a[0]) / (b[0] - a[0]); return a.map((v, k) => v + (b[k] - v) * t); } return null; };
function build(o) {
  const f = o.sex === "f", SK = o.skin ?? 0xe3bd9c, SKD = dk(SK, .9), HA = o.hair ?? 0x4a4350, UW = o.under ?? 0xd8d0bc, V = new Map();
  const set = (b, X, Y, Z, c) => { let m = V.get(b); if (!m) V.set(b, (m = new Map())); m.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c); };
  const has = (X, Y, Z) => { const k = (X + 128) + (Y + 128) * 256 + (Z + 128) * 65536; for (const m of V.values()) if (m.has(k)) return true; return false; };
  const fill = (b, x0, x1, y0, y1, z0, z1, inside, over = true) => { for (let X = Math.floor(x0 * RS); X <= x1 * RS; X++) for (let Y = Math.floor(y0 * RS); Y <= y1 * RS; Y++) for (let Z = Math.floor(z0 * RS); Z <= z1 * RS; Z++) { const c = inside((X + .5) / RS, (Y + .5) / RS, (Z + .5) / RS); if (c != null && (over || !has(X, Y, Z))) set(b, X, Y, Z, c); } };
  const blob = (b, cx, cy, cz, rx, ry, rz, col, p = 2, over) => fill(b, cx - rx, cx + rx, cy - ry, cy + ry, cz - rz, cz + rz, (x, y, z) => (Math.abs((x - cx) / rx) ** p + Math.abs((y - cy) / ry) ** p + Math.abs((z - cz) / rz) ** p <= 1 ? (typeof col === "function" ? col(x, y, z) : col) : null), over);
  const cap = (b, a, e, r0, r1, col, over = true) => { const R = Math.max(r0, r1); fill(b, Math.min(a[0], e[0]) - R, Math.max(a[0], e[0]) + R, Math.min(a[1], e[1]) - R, Math.max(a[1], e[1]) + R, Math.min(a[2], e[2]) - R, Math.max(a[2], e[2]) + R, (x, y, z) => { const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L)), q = [x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t], r = r0 + (r1 - r0) * t; return q[0] ** 2 + q[1] ** 2 + q[2] ** 2 <= r * r ? (typeof col === "function" ? col(x, y, z, t) : col) : null; }, over); };
  // ── 몸통: 단면을 쌓고 높이로 골반·허리·가슴을 나눈다 ──
  const T = TORSO[f ? "f" : "m"], briefTop = f ? 24.6 : 25;
  fill("hips", -6, 6, 21.5, 37.2, -4, 4, (x, y, z) => { const r = lerpRow(T, y); if (!r) return null; const [, rx, rz, cz] = r; if (Math.abs(x / rx) ** 2.3 + Math.abs((z - cz) / rz) ** 2.3 > 1) return null; if (y < 22.8 && Math.abs(x) > 1.6 && y < 22 + Math.abs(x) * .35) return null; return y < briefTop ? UW : SK; });
  { const m = V.get("hips"), sp = new Map(), ch = new Map(); for (const [k, c] of m) { const y = ((((k >> 8) & 255) - 128) + .5) / RS; if (y >= 31) { ch.set(k, c); m.delete(k); } else if (y >= 26.5) { sp.set(k, c); m.delete(k); } } V.set("spine", sp); V.set("chest", ch); }
  if (f) { for (const k of [-1, 1]) blob("chest", k * 1.85, 32.6, 2.1, 1.9, 1.75, 1.6, (x, y) => (y < 33.8 ? UW : SK)); fill("chest", -4.5, 4.5, 31.4, 33.9, -3, 3.6, (x, y, z) => { const r = lerpRow(T, y); return Math.abs(x / (r[1] + .15)) ** 2.3 + Math.abs((z - r[3]) / (r[2] + .15)) ** 2.3 <= 1 ? UW : null; }); }
  else { for (const k of [-1, 1]) blob("chest", k * 2.3, 32.8, 1.3, 2.4, 1.7, 1.75, SK, 2.2); for (const [y, k] of [[29.4, -1], [29.4, 1], [27.6, -1], [27.6, 1]]) blob("spine", k * .95, y, 1.95, .9, .75, .7, k < 0 ? SK : SKD, 2.4); } // 가슴·복근
  blob("spine", 0, 28.6, -1.6, 2.6, 2.4, 1.4, SK, 2.4); for (const k of [-1, 1]) blob("chest", k * 2.6, 33.4, -1.7, 2.2, 2.4, 1.3, SK, 2.4); // 등·날개뼈
  blob("hips", 0, 24.3, -1.4, f ? 3.6 : 3.2, 2, 1.8, UW); // 엉덩이
  // 승모근·쇄골 능선: 목에서 어깨로 비스듬히
  for (const k of [-1, 1]) { cap("chest", [k * .9, 37, -.6], [k * 4.3, 35.6, -.3], f ? .9 : 1.15, f ? .7 : .9, SK); cap("cl" + (k < 0 ? "R" : "L"), [k * 1.3, 36, 1.2], [k * 4.4, 35.9, .5], .45, .4, SKD); }
  // ── 목·머리(턱 38.5 ~ 정수리 45.5) ──
  cap("neck", [0, 36.2, -.3], [0, 39.4, -.1], f ? 1.15 : 1.4, f ? 1.05 : 1.3, SK); if (!f) for (const k of [-1, 1]) cap("neck", [k * .5, 39, .5], [k * .9, 36.4, .9], .35, .35, SKD); // 목빗근
  blob("head", 0, 42.1, .25, f ? 2.85 : 3, 3.5, f ? 3.1 : 3.25, SK, 2.2); blob("head", 0, 39.7, 1.4, f ? 1.5 : 1.8, 1.4, 1.5, SK, 2.2);
  blob("head", 0, 42.9, -.15, f ? 3.15 : 3.25, 3.05, f ? 3.45 : 3.5, HA, 2.4);
  const hm = V.get("head"); for (const [k, c] of hm) if (c === HA) { const X = (k & 255) - 128, Y = ((k >> 8) & 255) - 128, Z = (k >> 16) - 128, x = (X + .5) / RS, y = (Y + .5) / RS, z = (Z + .5) / RS; if (z > .6 && y < 43.4 - Math.abs(x) * .25 && Math.abs(x) < 2.3) hm.set(k, SK); else if (z > 1.6 && y < 41.5) hm.delete(k); }
  if (f) { for (const k of [-1, 1]) cap("head", [k * 2.6, 42.5, -1.2], [k * 2.4, 36.4, -1.6], 1, .8, HA); blob("head", 0, 39, -2.4, 2.7, 4, 1.2, HA); }
  // ── 팔: 어깨(세모근) → 위팔(이두·삼두) → 팔꿈치 → 아래팔 → 손목 → 손바닥·손가락·엄지 ──
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    const sh = [k * 5.4, 35.4, 0], el = [k * 6.5, 27.6, 0], wr = [k * 7, 21.4, .2], g = f ? .85 : 1;
    blob("ua" + s, k * 5.2, 35, 0, 1.95 * g, 1.9, 1.85 * g, SK, 2.2); // 세모근(어깨 공)
    cap("ua" + s, sh, el, 1.55 * g, 1.15 * g, SK); blob("ua" + s, k * 5.95, 31.3, .55, 1.25 * g, 2.6, 1.15 * g, SK); blob("ua" + s, k * 5.85, 31.6, -.55, 1.2 * g, 2.9, 1.1 * g, SKD); // 이두·삼두
    blob("la" + s, k * 6.5, 27.6, -.25, 1.2 * g, 1.2, 1.2 * g, SK); // 팔꿈치 덩어리(굽혀도 부피 유지)
    cap("la" + s, el, wr, 1.2 * g, .78 * g, SK); blob("la" + s, k * 6.7, 25.9, .25, 1.35 * g, 2.3, 1.25 * g, SK);
    // 손: 손바닥은 몸 쪽을 본다. 손가락은 한 덩어리로 굽고, 엄지는 따로
    blob("h" + s, k * 7.05, 20.05, .4, .55 * g, 1.45, 1.05 * g, SK, 2.6); blob("h" + s, k * 7.1, 18.9, .45, .6 * g, .45, 1.0 * g, SKD, 2.4); // 손바닥·손등 마디
    cap("fg" + s, [k * 7.15, 18.6, .45], [k * 7.15, 16.9, .45], .5 * g, .42 * g, (x, y, z) => (Math.abs(Math.round((z - .45) * RS)) % 2 ? SK : SKD)); // 손가락 묶음(줄무늬로 손가락 구분)
    cap("tb" + s, [k * 6.75, 20.5, 1.05], [k * 6.55, 18.9, 1.55], .38, .3, SK);
  }
  // ── 다리: 엉덩이 → 허벅지 → 무릎 → 정강이·종아리 → 발목 → 발(뒤꿈치·발등·발가락) ──
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    const hp = [k * 2.5, 23, 0], kn = [k * 2.6, 12.8, .15], an = [k * 2.6, 2.4, -.2], g = f ? .95 : 1;
    cap("ul" + s, hp, kn, 2.35 * g, 1.5 * g, (x, y) => (y > (f ? 21.6 : 21.2) - Math.abs(x - k * 2.5) * (k * x > 2.5 ? .7 : .1) ? UW : SK)); blob("ul" + s, k * 2.75, 18.5, .55, 2.1 * g, 4, 2 * g, SK, 2, false); blob("ul" + s, k * 2.95, 18, -.6, 1.8 * g, 3.6, 1.7 * g, SKD, 2, false); // 앞·뒤 허벅지
    blob("ll" + s, k * 2.6, 12.8, .1, 1.55 * g, 1.6, 1.55 * g, SK); blob("ll" + s, k * 2.6, 12.9, 1.15, 1, .95, .6, SKD); // 무릎·무릎뼈
    cap("ll" + s, kn, an, 1.4 * g, .78 * g, SK); blob("ll" + s, k * 2.65, 9.4, -.6, 1.5 * g, 2.9, 1.5 * g, SK); // 정강이·종아리
    blob("ft" + s, k * 2.6, 2.3, -.2, .95, .9, .95, SK); // 발목 덩어리
    fill("ft" + s, k * 2.6 - 1.2, k * 2.6 + 1.2, 0, 2.2, -1.5, 4.2, (x, y, z) => { const u = (x - k * 2.6) / (z > 2.6 ? 1 : 1.1), top = z < .5 ? 2.2 : 2.2 - (z - .5) * .42; return Math.abs(u) <= 1 && y <= top && !(z > 3.4 && (z - 3.4) ** 2 + u * u * .3 > .8) && !(z < -1 && (z + 1) ** 2 + (y - .9) ** 2 > .45) ? (y < .55 ? dk(SK, .78) : z > 3 ? SKD : SK) : null; });
  }
  return V;
}
// 관절 섞기: 정점이 관절에서 가까우면 이웃 뼈를 일부 따른다(슬롯 x·z 사용: y는 외곽선 표시용이라 비워 둔다)
function skinBlend(out, from, bone, J) { const kids = BONES.filter((b) => b[1] === bone).map((b) => b[0]), cand = [...(PARENT[bone] ? [[bone, PARENT[bone]]] : []), ...kids.map((c) => [c, c])];
  for (let i = from; i < out.p.length / 3; i++) { const p = [out.p[i * 3], out.p[i * 3 + 1], out.p[i * 3 + 2]]; let best = 0, ob = 0; for (const [jn, other] of cand) { const j = J[jn], R = BLEND[jn] * HU, d = Math.hypot(p[0] - j.x, p[1] - j.y, p[2] - j.z); if (d < R) { const t = 1 - d / R, s = .5 * t * t * (3 - 2 * t); if (s > best) { best = s; ob = BI[other]; } } }
    if (best > 0) { out.b[i * 4 + 2] = ob; out.w[i * 4] = 1 - best; out.w[i * 4 + 2] = best; } } }
/** 인형 하나: opt = { sex: "m"|"f", skin, hair, under } → { root, B(뼈), bones, def{J,T}, mesh, h } */
export function makeHunter(opt = {}) {
  const V = build(opt), out = { p: [], n: [], c: [], b: [], w: [], i: [], fx: [], pv: [], ax: [] }, J = {};
  for (const [n, , x, y, z] of BONES) J[n] = new THREE.Vector3(x, y, z).multiplyScalar(HU);
  for (const [bone, m] of V) { const from = out.p.length / 3; mesh(m, 256, HU / RS, (x, y, z) => [x, y, z], BI[bone], out); for (let i = from; i < out.p.length / 3; i++) out.b[i * 4 + 1] = 0; skinBlend(out, from, bone, J); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out.b, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(out.w, 4)); g.setAttribute("aFx", new THREE.Float32BufferAttribute(out.fx, 2)); g.setAttribute("aPv", new THREE.Float32BufferAttribute(out.pv, 3)); g.setAttribute("aAx", new THREE.Float32BufferAttribute(out.ax, 3)); g.setIndex(out.i);
  const bones = BONES.map(([n]) => Object.assign(new THREE.Bone(), { name: n })); BONES.forEach(([, p, x, y, z], i) => { const q = p ? BONES[BI[p]] : [0, 0, 0, 0, 0]; bones[i].position.set((x - q[2]) * HU, (y - q[3]) * HU, (z - q[4]) * HU); if (p) bones[BI[p]].add(bones[i]); });
  const root = new THREE.Group(), m = new THREE.SkinnedMesh(g, mat), k = new THREE.SkinnedMesh(g, ink); root.add(bones[0], m, k); root.updateMatrixWorld(true); const sk = new THREE.Skeleton(bones); m.bind(sk); k.bind(sk); m.frustumCulled = k.frustumCulled = false; m.castShadow = true;
  // IK용 끝점(T): 자식 관절, 끝 뼈는 직접 정한 점
  const T = {}, TIP = { fgR: [-7.15, 16.8, .45], fgL: [7.15, 16.8, .45], tbR: [-6.55, 18.9, 1.55], tbL: [6.55, 18.9, 1.55], ftR: [-2.6, 0, 3.6], ftL: [2.6, 0, 3.6], head: [0, 45.5, 0] };
  for (const n in TIP) T[n] = new THREE.Vector3(...TIP[n]).multiplyScalar(HU);
  Object.assign(T, { hips: J.spine, spine: J.chest, chest: J.neck, neck: J.head, clR: J.uaR, clL: J.uaL, uaR: J.laR, uaL: J.laL, laR: J.hR, laL: J.hL, hR: J.fgR, hL: J.fgL, ulR: J.llR, ulL: J.llL, llR: J.ftR, llL: J.ftL });
  return { root, mesh: m, B: Object.fromEntries(bones.map((b) => [b.name, b])), bones, def: { J, T }, rest: bones[0].position.clone(), h: 45.5 * HU, tris: out.i.length / 3 };
}
// 간단한 동작(확인용): 서 있기 · 걷기
export function poseHunter(h, act, t) {
  const B = h.B; for (const b of Object.values(B)) b.rotation.set(0, 0, 0); B.hips.position.copy(h.rest);
  const br = Math.sin(t * 2) * .02; B.chest.rotation.x = -br; B.uaR.rotation.z = -.08; B.uaL.rotation.z = .08; B.laR.rotation.x = B.laL.rotation.x = -.12; B.fgR.rotation.z = .35; B.fgL.rotation.z = -.35;
  if (act === "walk") { const s = Math.sin(t * 6), c = Math.cos(t * 6); B.ulR.rotation.x = s * .55; B.ulL.rotation.x = -s * .55; B.llR.rotation.x = Math.max(0, -c) * .9 + .05; B.llL.rotation.x = Math.max(0, c) * .9 + .05; B.uaR.rotation.x = -s * .45; B.uaL.rotation.x = s * .45; B.laR.rotation.x = B.laL.rotation.x = -.35; B.hips.position.y += Math.abs(c) * .03 - .02; B.hips.rotation.y = s * .1; B.chest.rotation.y = -s * .16; }
}
