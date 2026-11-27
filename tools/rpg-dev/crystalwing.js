// 유리날개룡(오리지널 몬스터): 비룡형 공용 뼈대 위에 빚는다. 어두운 몸 + 결정판 날개·볏·가시
// 결정은 따로 그려서 빛 게이지(0~1)에 따라 투명해진다. 앞 = +z
import * as THREE from "three"; import { mesh, mat, ink } from "./voxkit.js"; import { wyvernDef, wyvernBones, wyvernAct, addBone } from "./wyvernrig.js";
const VS = .08; // 복셀 한 칸
const { abs, max, min, floor, sin, cos, hypot } = Math;
const hash = (x, y, z) => { const n = sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55; return n - floor(n); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), A = (v) => [v.x, v.y, v.z];
export const CW = { HIDE: 0x34324a, HIDE2: 0x48455f, BELLY: 0x6a6480, SEAM: 0x1e2236, EYE: 0xbff4ff };
const XT = [0xa8e4fa, 0xc8dcff, 0xdcd0ff, 0xeef9ff, 0x9ad6f0]; // 결정 면 색
function makeDef() {
  const d = wyvernDef({});
  for (const [s, k] of [["R", -1], ["L", 1]]) addBone(d, "hwing" + s, "spine", V3(k * .7, d.p.h + .55, -.6), V3(k * 2.6, d.p.h + 1.4, -2)); // 뒷날개
  return d;
}
const PANES = []; // 늘어나는 막: { P,Q,R(꼭짓점), bones:[P뼈,Q뼈,R뼈] }
function build(D) {
  const { J, T, p } = D, h = p.h, core = new Map(), cry = new Map();
  const put = (M, b, X, Y, Z, c) => { if (max(abs(X), abs(Y), abs(Z)) > 126) return; let m = M.get(b); if (!m) M.set(b, (m = new Map())); m.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c); };
  const scan = (M, b, lo, hi, f) => { for (let X = floor(lo[0] / VS); X <= hi[0] / VS; X++) for (let Y = floor(lo[1] / VS); Y <= hi[1] / VS; Y++) for (let Z = floor(lo[2] / VS); Z <= hi[2] / VS; Z++) { const c = f((X + .5) * VS, (Y + .5) * VS, (Z + .5) * VS); if (c != null) put(M, b, X, Y, Z, c); } };
  const ell = (M, b, c, r, col, p2 = 2) => scan(M, b, [c[0] - r[0], c[1] - r[1], c[2] - r[2]], [c[0] + r[0], c[1] + r[1], c[2] + r[2]], (x, y, z) => (abs((x - c[0]) / r[0]) ** p2 + abs((y - c[1]) / r[1]) ** p2 + abs((z - c[2]) / r[2]) ** p2 <= 1 ? (typeof col === "function" ? col(x, y, z) : col) : null));
  const cap = (M, b, a, e, r0, r1, col) => { const R = max(r0, r1), d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2; scan(M, b, [min(a[0], e[0]) - R, min(a[1], e[1]) - R, min(a[2], e[2]) - R], [max(a[0], e[0]) + R, max(a[1], e[1]) + R, max(a[2], e[2]) + R], (x, y, z) => { const t = max(0, min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L)), r = r0 + (r1 - r0) * t; return hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t) <= r ? (typeof col === "function" ? col(x, y, z, t) : col) : null; }); };
  const bone = (n, r0, r1, col) => cap(core, n, A(J[n]), A(T[n]), r0, r1, col); // 뼈 하나를 따라 살 붙이기
  // 결정 가시: 단면 마름모로 가늘어지는 기둥. 밑동은 어두운 테
  const spike = (b, a, e, r, seam = true) => { const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, ci = floor(hash(a[0], a[1], a[2]) * XT.length); scan(cry, b, [min(a[0], e[0]) - r, min(a[1], e[1]) - r, min(a[2], e[2]) - r], [max(a[0], e[0]) + r, max(a[1], e[1]) + r, max(a[2], e[2]) + r], (x, y, z) => { const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L; if (t < 0 || t > 1) return null; const q = [x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t], rr = r * (1 - t * .92); return abs(q[0]) + abs(q[1]) + abs(q[2]) <= rr * 1.3 ? XT[(ci + (q[0] > 0 ? 1 : 0)) % XT.length] : null; }); if (seam) cap(core, b, a, [a[0] + d[0] * .12, a[1] + d[1] * .12, a[2] + d[2] * .12], r * .9, r * .8, CW.SEAM); };
  // 결정판: 삼각형, 칸 경계와 테두리는 납선(불투명)
  const pane = (b0, P, Q, R, th, cells) => { let b = b0; if (Array.isArray(b0)) { b = "P#" + PANES.length; PANES.push({ P, Q, R, bones: b0 }); } const u = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]], v = [R[0] - P[0], R[1] - P[1], R[2] - P[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], nl = hypot(...n), uu = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2, uv = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], den = uu * vv - uv * uv;
    scan(cry, b, [min(P[0], Q[0], R[0]) - th, min(P[1], Q[1], R[1]) - th, min(P[2], Q[2], R[2]) - th], [max(P[0], Q[0], R[0]) + th, max(P[1], Q[1], R[1]) + th, max(P[2], Q[2], R[2]) + th], (x, y, z) => { const w = [x - P[0], y - P[1], z - P[2]]; if (abs((w[0] * n[0] + w[1] * n[1] + w[2] * n[2]) / nl) > th) return null; const wu = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], wv = w[0] * v[0] + w[1] * v[1] + w[2] * v[2], s = (vv * wu - uv * wv) / den, t = (uu * wv - uv * wu) / den; if (s < 0 || t < 0 || s + t > 1) return null;
      let d1 = 9, d2 = 9, id = 0; for (let i = 0; i < cells.length; i++) { const d = hypot((s - cells[i][0]) * 1.4, t - cells[i][1]); if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d; }
      if (d2 - d1 < .035 || s < .025 || t < .025 || s + t > .965) { put(core, b, floor(x / VS), floor(y / VS), floor(z / VS), CW.SEAM); return null; }
      return XT[(id * 3 + floor(hash(id, b.length, 1) * 5)) % XT.length]; }); };
  const cellsOf = (k, seed) => Array.from({ length: k }, (_, i) => { const a = hash(i, seed, 2), c = hash(seed, i, 7); return [a * (1 - c * .9), c * (1 - a) * .95]; });
  const hideC = (x, y, z) => (y < h - .3 ? CW.BELLY : (floor(x / VS * .5) + floor(z / VS * .5)) & 1 && hash(floor(x * 4), floor(y * 4), floor(z * 4)) > .6 ? CW.HIDE2 : CW.HIDE);
  // ── 몸통: 골반·등·가슴 세 덩어리 ──
  ell(core, "pelvis", [0, h, -.4], [1.2, 1.0, 1.5], hideC, 2.2); ell(core, "spine", A(J.spine).map((v, i) => v + [0, -.05, 0][i]), [1.2, 1.02, 1.1], hideC, 2.2); ell(core, "chest", [0, J.chest.y, J.chest.z - .05], [1.1, 1.05, 1.15], hideC, 2.2);
  // 목·머리·턱
  bone("neck1", .72, .6, hideC); bone("neck2", .6, .5, hideC); bone("neck3", .5, .44, hideC);
  const H0 = A(J.head), Ht = A(T.head); ell(core, "head", [H0[0], H0[1] + .05, H0[2] + .2], [.48, .42, .62], CW.HIDE, 2.3); cap(core, "head", [H0[0], H0[1] + .02, H0[2] + .4], Ht, .34, .16, CW.HIDE2); bone("jaw", .26, .12, CW.BELLY);
  for (const k of [-1, 1]) { ell(core, "head", [k * .4, H0[1] + .12, H0[2] + .4], [.07, .05, .16], CW.EYE); for (let i = 0; i < 4; i++) { const t = .3 + i * .17, q = A(J.jaw.clone().lerp(T.jaw, t)); spike("jaw", [k * .14, q[1] + .05, q[2]], [k * .16, q[1] + .17, q[2] + .03], .04, false); } spike("head", [k * .42, H0[1], H0[2] - .05], [k * .95, H0[1] + .15, H0[2] - .65], .14); }
  for (let i = 0; i < 7; i++) { const a = (i - 3) * .3, L = 2.1 - abs(i - 3) * .28; spike("head", [sin(a) * .22, H0[1] + .35, H0[2] - .15], [sin(a) * L * .85, H0[1] + .4 + cos(a) * L * .6, H0[2] - .15 - L * .85], .24); } // 부채꼴 볏
  // 꼬리 → 프리즘 덩어리
  [.72, .55, .42, .32, .24].forEach((r, i) => bone("tail" + (i + 1), r, r * .78, hideC));
  const tt = A(T.tail5); for (const [dx, dy, dz, L] of [[0, .1, -1, 1.7], [.6, .4, -.7, 1.2], [-.6, .4, -.7, 1.2], [.4, -.45, -.8, 1.1], [-.4, -.45, -.8, 1.1], [0, .75, -.5, 1], [.8, -.1, -.4, .8], [-.8, -.1, -.4, .8]]) spike("tail5", tt, [tt[0] + dx * L, tt[1] + dy * L, tt[2] + dz * L * 1.2], .36);
  // 등 가시: 목 → 꼬리 끝까지 크기가 물결친다. 각 가시는 가장 가까운 등뼈에 붙는다
  const spineLine = [["neck2", J.neck2], ["neck1", J.neck1], ["chest", J.chest], ["spine", J.spine], ["pelvis", J.pelvis], ["tail1", J.tail1], ["tail2", J.tail2], ["tail3", J.tail3], ["tail4", J.tail4]];
  for (let i = 0; i < spineLine.length; i++) { const [b, P] = spineLine[i], t = i / (spineLine.length - 1), hh = .6 + sin(t * 3.14) * 1.15, top = [0, P.y + (b.startsWith("tail") ? .3 : b.startsWith("neck") ? .45 : .9), P.z]; spike(b, [0, top[1] - .2, top[2]], [0, top[1] + hh, top[2] - hh * .5], .26 + hh * .1); if (i % 2 === 0 && i > 1 && i < 8) for (const k of [-1, 1]) spike(b, [k * .5, top[1] - .4, top[2]], [k * (1 + hh * .45), top[1] + hh * .45, top[2] - .35], .2); }
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    // 뒷다리
    ell(core, "thigh" + s, [k * 1.15, h - .5, -.1], [.62, .9, .78], hideC); bone("thigh" + s, .55, .38, hideC); bone("shin" + s, .36, .24, CW.HIDE2); bone("met" + s, .24, .18, CW.HIDE2);
    const tj = A(J["toe" + s]); for (const a of [-.45, 0, .45]) { const e = [tj[0] + sin(a) * .45, .14, tj[2] + cos(a) * .5]; cap(core, "toe" + s, tj, e, .17, .12, CW.HIDE2); spike("toe" + s, e, [e[0] + sin(a) * .15, .04, e[2] + cos(a) * .22], .1, false); }
    for (const [dx, dy, dz, L] of [[1, .5, -.4, .9], [.7, .9, -.8, .8]]) spike("thigh" + s, [k * 1.5, h - .3, -.1], [k * (1.5 + dx * L), h - .3 + dy * L, -.1 + dz * L], .25);
    for (const [dx, dy, dz, L] of [[1, .6, .2, 1.1], [.8, 1, -.3, .9], [1, .1, .6, .8]]) spike("chest", [k * .85, J.chest.y + .4, J.chest.z], [k * (.85 + dx * L), J.chest.y + .4 + dy * L, J.chest.z + dz * L], .28);
    // 날개팔: 뼈 위 살 + 앞날 가시 + 손목 갈고리 + 손가락(납선) + 결정판
    bone("uarm" + s, .4, .27, hideC); bone("farm" + s, .27, .18, hideC); ell(core, "hand" + s, A(J["hand" + s]), [.24, .24, .24], CW.HIDE2);
    const sh = A(J["uarm" + s]), el = A(J["farm" + s]), wr = A(J["hand" + s]), f = [1, 2, 3].map((i) => A(T["fing" + i + s])), mb = A(T["memb" + s]);
    spike("hand" + s, wr, [wr[0] + k * .3, wr[1] + .75, wr[2] + .45], .15);
    for (let i = 1; i < 6; i++) { const t = i / 6, a = sh.map((v, j) => v + (el[j] - v) * t); spike("uarm" + s, a, [a[0] + k * .1, a[1] + .55, a[2] + .3], .14); }
    for (let i = 1; i < 5; i++) { const t = i / 5, a = el.map((v, j) => v + (wr[j] - v) * t); spike("farm" + s, a, [a[0], a[1] + .5, a[2] + .3], .12); }
    for (let i = 1; i <= 3; i++) bone("fing" + i + s, .12, .05, CW.SEAM);
    pane(["hand" + s, "fing1" + s, "farm" + s], wr, f[0], el, .07, cellsOf(5, 1 + k)); pane(["hand" + s, "fing1" + s, "fing2" + s], wr, f[0], f[1], .07, cellsOf(4, 3 + k)); pane(["hand" + s, "fing2" + s, "fing3" + s], wr, f[1], f[2], .07, cellsOf(4, 5 + k));
    pane(["hand" + s, "fing3" + s, "pelvis"], wr, f[2], mb, .07, cellsOf(5, 7 + k)); pane(["farm" + s, "hand" + s, "pelvis"], el, wr, mb, .07, cellsOf(5, 9 + k)); pane(["uarm" + s, "farm" + s, "pelvis"], sh, el, mb, .07, cellsOf(4, 11 + k));
    // 뒷날개
    const hb = A(J["hwing" + s]), ht = A(T["hwing" + s]), h3 = [ht[0] * .72, hb[1] - .5, ht[2] - .6]; bone("hwing" + s, .16, .07, CW.SEAM); pane("hwing" + s, hb, ht, h3, .06, cellsOf(4, 13 + k)); pane("hwing" + s, hb, h3, [hb[0] * 1.2, hb[1] - .4, hb[2] - 1], .06, cellsOf(3, 15 + k));
  }
  return { core, cry };
}
const cryMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, emissive: 0x9fe8ff, emissiveIntensity: 0 });
// 막 정점: 삼각형 안의 위치(무게중심 좌표)만큼 세 뼈를 섞는다 → 손가락을 접으면 막이 접히고 펴면 늘어난다
function blend(out, from, pn, BI) { const { P, Q, R, bones } = pn, u = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]], v = [R[0] - P[0], R[1] - P[1], R[2] - P[2]], uu = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2, uv = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], den = uu * vv - uv * uv;
  for (let i = from; i < out.p.length / 3; i++) { const w = [out.p[i * 3] - P[0], out.p[i * 3 + 1] - P[1], out.p[i * 3 + 2] - P[2]], wu = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], wv = w[0] * v[0] + w[1] * v[1] + w[2] * v[2]; let s = max(0, (vv * wu - uv * wv) / den), t = max(0, (uu * wv - uv * wu) / den); const k = s + t; if (k > 1) { s /= k; t /= k; }
    out.b.splice(i * 4, 4, BI[bones[0]], BI[bones[1]], BI[bones[2]], 0); out.w.splice(i * 4, 4, 1 - s - t, s, t, 0); } }
const geoOf = (V, BI) => { const out = { p: [], n: [], c: [], b: [], w: [], i: [], fx: [], pv: [], ax: [] }; for (const [bn, m] of V) { const from = out.p.length / 3; mesh(m, 256, VS, (x, y, z) => [x, y, z], bn.startsWith("P#") ? 0 : BI[bn], out); if (bn.startsWith("P#")) blend(out, from, PANES[+bn.slice(2)], BI); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out.b, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(out.w, 4)); g.setAttribute("aFx", new THREE.Float32BufferAttribute(out.fx, 2)); g.setAttribute("aPv", new THREE.Float32BufferAttribute(out.pv, 3)); g.setAttribute("aAx", new THREE.Float32BufferAttribute(out.ax, 3)); g.setIndex(out.i); return [g, out.i.length / 3]; };
let GEO = null, DEF = null;
/** 유리날개룡 하나 → { root, B, act(이름, t), setLight(0~1), tris } */
export function makeCrystalWing() {
  if (!GEO) { DEF = makeDef(); const { core, cry } = build(DEF); GEO = [geoOf(core, DEF.BI), geoOf(cry, DEF.BI)]; }
  const { bones, B, root: rb } = wyvernBones(DEF), root = new THREE.Group(), sk = new THREE.Skeleton(bones), m = new THREE.SkinnedMesh(GEO[0][0], mat), k = new THREE.SkinnedMesh(GEO[0][0], ink), cm = cryMat.clone(), c = new THREE.SkinnedMesh(GEO[1][0], cm);
  root.add(rb, m, k, c); root.updateMatrixWorld(true); for (const s of [m, k, c]) { s.bind(sk); s.frustumCulled = false; } m.castShadow = true; c.castShadow = true; c.renderOrder = 2;
  const setLight = (v) => { const t = max(0, min(1, v)); cm.opacity = 1 - .88 * t ** 1.4; cm.emissiveIntensity = .05 + t * t * .9; cm.color.setScalar(1 - (1 - t) * .25); cm.depthWrite = t < .3; c.castShadow = t < .6; };
  setLight(0);
  const r = { def: DEF, bones, B, root: rb };
  return { root, B, rig: r, act: (name, t, o) => wyvernAct(r, name, t, o), setLight, tris: GEO[0][1] + GEO[1][1] };
}
