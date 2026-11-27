// 유리날개룡(오리지널 몬스터): 어두운 몸 + 결정판 날개·볏·가시. 결정은 따로 그려서 빛 게이지(0~1)에 따라 투명해진다
// 좌표는 월드 단위(사냥꾼 키 2.5 기준). 앞 = +z
import * as THREE from "three"; import { mesh, mat, ink } from "./voxkit.js";
const VS = .08; // 복셀 한 칸
const { abs, max, min, floor, sin, cos, hypot } = Math;
const hash = (x, y, z) => { const n = sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55; return n - floor(n); };
const dk = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
// [이름, 부모, x, y, z]
const BONES = [["body", null, 0, 3.2, 0], ["chest", "body", 0, 3.5, 1.4], ["neck", "chest", 0, 3.8, 2.4], ["neck2", "neck", 0, 4.6, 3.4], ["head", "neck2", 0, 5.1, 4.3], ["jaw", "head", 0, 4.95, 4.6],
  ["tail", "body", 0, 3.1, -2.2], ["tail2", "tail", 0, 2.7, -4.2], ["tail3", "tail2", 0, 2.3, -6], ["tail4", "tail3", 0, 2, -7.4],
  ["thR", "body", -1.05, 3, -.4], ["shR", "thR", -1.3, 1.75, .45], ["ftR", "shR", -1.2, .55, -.35], ["thL", "body", 1.05, 3, -.4], ["shL", "thL", 1.3, 1.75, .45], ["ftL", "shL", 1.2, .55, -.35],
  ["waR", "chest", -.9, 4.1, 1.3], ["wfR", "waR", -3.4, 5.3, .5], ["waL", "chest", .9, 4.1, 1.3], ["wfL", "waL", 3.4, 5.3, .5], ["hwR", "body", -.7, 3.8, -1.3], ["hwL", "body", .7, 3.8, -1.3]];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
export const CW = { HIDE: 0x34324a, HIDE2: 0x48455f, BELLY: 0x6a6480, SEAM: 0x1e2236, CLAW: 0xd8d0e8, EYE: 0xbff4ff };
const XT = [0xa8e4fa, 0xc8dcff, 0xdcd0ff, 0xeef9ff, 0x9ad6f0]; // 결정 면 색
function build() {
  const core = new Map(), cry = new Map(); // 뼈 → (키 → 색)
  const put = (M, b, X, Y, Z, c) => { if (max(abs(X), abs(Y), abs(Z)) > 126) return; let m = M.get(b); if (!m) M.set(b, (m = new Map())); m.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c); };
  const scan = (M, b, lo, hi, f) => { for (let X = floor(lo[0] / VS); X <= hi[0] / VS; X++) for (let Y = floor(lo[1] / VS); Y <= hi[1] / VS; Y++) for (let Z = floor(lo[2] / VS); Z <= hi[2] / VS; Z++) { const c = f((X + .5) * VS, (Y + .5) * VS, (Z + .5) * VS); if (c != null) put(M, b, X, Y, Z, c); } };
  const ell = (M, b, c, r, col, p = 2) => scan(M, b, [c[0] - r[0], c[1] - r[1], c[2] - r[2]], [c[0] + r[0], c[1] + r[1], c[2] + r[2]], (x, y, z) => (abs((x - c[0]) / r[0]) ** p + abs((y - c[1]) / r[1]) ** p + abs((z - c[2]) / r[2]) ** p <= 1 ? (typeof col === "function" ? col(x, y, z) : col) : null));
  const cap = (M, b, a, e, r0, r1, col) => { const R = max(r0, r1), d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2; scan(M, b, [min(a[0], e[0]) - R, min(a[1], e[1]) - R, min(a[2], e[2]) - R], [max(a[0], e[0]) + R, max(a[1], e[1]) + R, max(a[2], e[2]) + R], (x, y, z) => { const t = max(0, min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L)), r = r0 + (r1 - r0) * t; return hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t) <= r ? (typeof col === "function" ? col(x, y, z, t) : col) : null; }); };
  // 결정 가시: 밑동 a에서 끝 e로 가늘어지는 각진 기둥(단면 마름모)
  const spike = (b, a, e, r, seam = true) => { const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, ci = floor(hash(a[0], a[1], a[2]) * XT.length); scan(cry, b, [min(a[0], e[0]) - r, min(a[1], e[1]) - r, min(a[2], e[2]) - r], [max(a[0], e[0]) + r, max(a[1], e[1]) + r, max(a[2], e[2]) + r], (x, y, z) => { const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L; if (t < 0 || t > 1) return null; const q = [x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t], rr = r * (1 - t * .92); return abs(q[0]) + abs(q[1]) + abs(q[2]) <= rr * 1.3 ? XT[(ci + (q[0] > 0 ? 1 : 0)) % XT.length] : null; }); if (seam) cap(core, b, a, [a[0] + d[0] * .12, a[1] + d[1] * .12, a[2] + d[2] * .12], r * .9, r * .8, CW.SEAM); };
  // 결정판: 삼각형 여러 장을 이어 붙이고, 칸(셀) 경계는 납선처럼 어둡고 불투명
  const pane = (b, A, B, C, th, cells) => { const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], nl = hypot(...n), uu = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2, uv = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], den = uu * vv - uv * uv;
    scan(cry, b, [min(A[0], B[0], C[0]) - th, min(A[1], B[1], C[1]) - th, min(A[2], B[2], C[2]) - th], [max(A[0], B[0], C[0]) + th, max(A[1], B[1], C[1]) + th, max(A[2], B[2], C[2]) + th], (x, y, z) => { const w = [x - A[0], y - A[1], z - A[2]]; if (abs((w[0] * n[0] + w[1] * n[1] + w[2] * n[2]) / nl) > th) return null; const wu = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], wv = w[0] * v[0] + w[1] * v[1] + w[2] * v[2], s = (vv * wu - uv * wv) / den, t = (uu * wv - uv * wu) / den; if (s < 0 || t < 0 || s + t > 1) return null;
      // 가장 가까운 셀 두 개의 거리 차가 작으면 납선
      let d1 = 9, d2 = 9, id = 0; for (let i = 0; i < cells.length; i++) { const [cs, ct] = cells[i], d = hypot((s - cs) * 1.4, t - ct); if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d; }
      if (d2 - d1 < .035 || s < .025 || t < .025 || s + t > .965) { put(core, b, floor(x / VS), floor(y / VS), floor(z / VS), CW.SEAM); return null; }
      return XT[(id * 3 + floor(hash(id, b.length, 1) * 5)) % XT.length]; }); };
  const cellsOf = (k, seed) => Array.from({ length: k }, (_, i) => { const a = hash(i, seed, 2), c = hash(seed, i, 7); return [a * (1 - c * .9), c * (1 - a) * .95]; });
  // ── 몸 ──
  const hideC = (x, y, z) => (y < 2.85 ? CW.BELLY : (floor(x / VS * .5) + floor(z / VS * .5)) & 1 && hash(floor(x * 4), floor(y * 4), floor(z * 4)) > .6 ? CW.HIDE2 : CW.HIDE);
  ell(core, "body", [0, 3.2, -.2], [1.25, 1.05, 2.3], hideC, 2.2); ell(core, "chest", [0, 3.55, 1.5], [1.1, 1.05, 1.25], hideC, 2.2);
  cap(core, "neck", [0, 3.8, 2.2], [0, 4.6, 3.4], .72, .52, hideC); cap(core, "neck2", [0, 4.6, 3.4], [0, 5.1, 4.25], .52, .44, hideC);
  // 머리: 길고 납작한 주둥이, 눈은 빛나는 가는 틈
  ell(core, "head", [0, 5.2, 4.55], [.48, .42, .7], CW.HIDE, 2.3); cap(core, "head", [0, 5.18, 4.8], [0, 5.08, 5.75], .34, .16, CW.HIDE2); cap(core, "jaw", [0, 4.92, 4.6], [0, 4.92, 5.55], .26, .12, CW.BELLY);
  for (const k of [-1, 1]) { ell(core, "head", [k * .4, 5.3, 4.95], [.07, .05, .16], CW.EYE); for (let i = 0; i < 4; i++) spike("jaw", [k * .14, 4.86, 4.85 + i * .18], [k * .16, 4.74, 4.9 + i * .18], .04, false); }
  // 볏: 정수리에서 뒤로 펼친 부채꼴 결정
  for (let i = 0; i < 7; i++) { const a = (i - 3) * .3, L = 2.1 - abs(i - 3) * .28; spike("head", [sin(a) * .22, 5.45, 4.4], [sin(a) * L * .85, 5.5 + cos(a) * L * .6, 4.4 - L * .85], .24); }
  // 등 가시: 목부터 꼬리까지 크기가 물결친다
  for (let i = 0; i < 13; i++) { const t = i / 12, z = 3.4 - t * 7.6, y = i < 3 ? 4.7 - i * .35 : 4.1 - (t - .25) * 2.2, h = .6 + sin(t * 3.14) * 1.15, b = z > 2.3 ? "neck" : z > .4 ? "chest" : z > -2.2 ? "body" : z > -4.2 ? "tail" : z > -6 ? "tail2" : "tail3"; spike(b, [0, y - .1, z], [0, y + h, z - h * .5], .26 + h * .1); if (i % 2 === 1 && i < 11) for (const k of [-1, 1]) spike(b, [k * .5, y - .3, z], [k * (1 + h * .45), y + h * .55, z - .35], .2); }
  // 결정 갑각 군집: 어깨·허벅지·날개 앞날·뺨
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    for (const [dx, dy, dz, L] of [[1, .6, .2, 1.1], [.8, 1, -.3, .9], [1, .1, .6, .8]]) spike("chest", [k * .85, 3.9, 1.4], [k * (.85 + dx * L), 3.9 + dy * L, 1.4 + dz * L], .28);
    for (const [dx, dy, dz, L] of [[1, .5, -.4, .9], [.7, .9, -.8, .8]]) spike("th" + s, [k * 1.5, 2.9, -.1], [k * (1.5 + dx * L), 2.9 + dy * L, -.1 + dz * L], .25);
    for (let i = 1; i < 6; i++) { const t = i / 6, a = [k * (.9 + 2.5 * t), 4.1 + 1.2 * t, 1.3 - .8 * t]; spike("wa" + s, a, [a[0] + k * .15, a[1] + .55 - t * .2, a[2] + .35], .14); }
    for (let i = 1; i < 5; i++) { const t = i / 5, a = [k * (3.4 + 2.8 * t), 5.3 - .5 * t, .5 - .8 * t]; spike("wf" + s, a, [a[0] + k * .1, a[1] + .5, a[2] + .3], .12); }
    spike("head", [k * .42, 5.1, 4.5], [k * .95, 5.25, 3.9], .14);
  }
  // 꼬리 → 끝의 프리즘 덩어리
  cap(core, "tail", [0, 3.1, -2.2], [0, 2.7, -4.2], .72, .5, hideC); cap(core, "tail2", [0, 2.7, -4.2], [0, 2.3, -6], .5, .32, hideC); cap(core, "tail3", [0, 2.3, -6], [0, 2, -7.4], .32, .2, hideC);
  for (const [dx, dy, dz, L] of [[0, .1, -1, 1.7], [.6, .4, -.7, 1.2], [-.6, .4, -.7, 1.2], [.4, -.45, -.8, 1.1], [-.4, -.45, -.8, 1.1], [0, .75, -.5, 1], [.8, -.1, -.4, .8], [-.8, -.1, -.4, .8]]) spike("tail4", [0, 2, -7.3], [dx * L, 2 + dy * L, -7.3 + dz * L * 1.2], .36);
  // 뒷다리: 굵은 허벅지 → 역관절 → 발가락 셋
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    ell(core, "th" + s, [k * 1.15, 2.6, 0], [.6, .95, .75], hideC); cap(core, "th" + s, [k * 1.05, 3, -.4], [k * 1.3, 1.75, .45], .55, .38, hideC);
    cap(core, "sh" + s, [k * 1.3, 1.75, .45], [k * 1.2, .55, -.35], .34, .22, CW.HIDE2);
    for (const a of [-.45, 0, .45]) { cap(core, "ft" + s, [k * 1.2, .5, -.35], [k * 1.2 + sin(a) * .55, .18, .2 + cos(a) * .35], .17, .12, CW.HIDE2); spike("ft" + s, [k * 1.2 + sin(a) * .55, .18, .2 + cos(a) * .35], [k * 1.2 + sin(a) * .7, .05, .32 + cos(a) * .5], .1, false); }
    cap(core, "ft" + s, [k * 1.2, .5, -.35], [k * 1.2, .15, -.75], .14, .1, CW.HIDE2);
  }
  // 앞날개(큰 날개): 팔뼈 두 마디 + 손가락 뼈 셋, 사이를 결정판으로
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    const sh = [k * .9, 4.1, 1.3], el = [k * 3.4, 5.3, .5], wr = [k * 6.2, 4.8, -.3];
    cap(core, "wa" + s, sh, el, .38, .26, hideC); cap(core, "wf" + s, el, wr, .26, .17, hideC); ell(core, "wf" + s, wr, [.22, .22, .22], CW.HIDE2);
    spike("wf" + s, wr, [k * 6.5, 5.6, .1], .14); // 손목 갈고리
    const tips = [[k * 7.8, 3.6, -1.6], [k * 6.4, 2.5, -2.4], [k * 4.4, 2.3, -2.6]], root = [k * 1.3, 3.6, -1.4];
    for (const t of tips) cap(core, "wf" + s, wr, t, .12, .05, CW.SEAM);
    pane("wf" + s, wr, [k * 7.8, 3.6, -1.6], el, .07, cellsOf(5, 1 + k)); pane("wf" + s, wr, tips[0], tips[1], .07, cellsOf(4, 3 + k)); pane("wf" + s, wr, tips[1], tips[2], .07, cellsOf(4, 5 + k));
    pane("wa" + s, el, wr, tips[2], .07, cellsOf(5, 7 + k)); pane("wa" + s, el, tips[2], root, .07, cellsOf(5, 9 + k)); pane("wa" + s, el, root, sh, .07, cellsOf(3, 11 + k));
    // 뒷날개(작은 날개): 등에서 비스듬히
    const hb = [k * .7, 3.8, -1.3], ht = [k * 2.6, 4.6, -2.6]; cap(core, "hw" + s, hb, ht, .16, .07, CW.SEAM); pane("hw" + s, hb, ht, [k * 1.9, 3.3, -3.1], .06, cellsOf(4, 13 + k)); pane("hw" + s, hb, [k * 1.9, 3.3, -3.1], [k * .8, 3.4, -2.4], .06, cellsOf(3, 15 + k));
  }
  return { core, cry };
}
const cryMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, emissive: 0x9fe8ff, emissiveIntensity: 0 });
const geoOf = (V) => { const out = { p: [], n: [], c: [], b: [], w: [], i: [], fx: [], pv: [], ax: [] }; for (const [bone, m] of V) mesh(m, 256, VS, (x, y, z) => [x, y, z], BI[bone], out); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out.b, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(out.w, 4)); g.setAttribute("aFx", new THREE.Float32BufferAttribute(out.fx, 2)); g.setAttribute("aPv", new THREE.Float32BufferAttribute(out.pv, 3)); g.setAttribute("aAx", new THREE.Float32BufferAttribute(out.ax, 3)); g.setIndex(out.i); return [g, out.i.length / 3]; };
let GEO = null;
/** 유리날개룡 하나 → { root, B, setLight(0~1), tris } */
export function makeCrystalWing() {
  if (!GEO) { const { core, cry } = build(); GEO = [geoOf(core), geoOf(cry)]; }
  const bones = BONES.map(([n]) => Object.assign(new THREE.Bone(), { name: n })); BONES.forEach(([, p, x, y, z], i) => { const q = p ? BONES[BI[p]] : [0, 0, 0, 0, 0]; bones[i].position.set(x - q[2], y - q[3], z - q[4]); if (p) bones[BI[p]].add(bones[i]); });
  const root = new THREE.Group(), sk = new THREE.Skeleton(bones), m = new THREE.SkinnedMesh(GEO[0][0], mat), k = new THREE.SkinnedMesh(GEO[0][0], ink), cm = cryMat.clone(), c = new THREE.SkinnedMesh(GEO[1][0], cm);
  root.add(bones[0], m, k, c); root.updateMatrixWorld(true); for (const s of [m, k, c]) { s.bind(sk); s.frustumCulled = false; } m.castShadow = true; c.castShadow = true; c.renderOrder = 2;
  // 빛 게이지: 흐림(0~.3) 뿌옇고 단단하지 않음 · 맑음(.3~.8) 반투명 · 투명(.8~) 거의 안 보이고 빛남
  const setLight = (v) => { const t = max(0, min(1, v)); cm.opacity = 1 - .88 * t ** 1.4; cm.emissiveIntensity = .05 + t * t * .9; cm.color.setScalar(1 - (1 - t) * .25); cm.depthWrite = t < .3; c.castShadow = t < .6; };
  setLight(0);
  return { root, B: Object.fromEntries(bones.map((b) => [b.name, b])), setLight, tris: GEO[0][1] + GEO[1][1], len: 13.5 };
}
// 확인용 대기 동작: 숨쉬기 · 목 흔들기 · 날개 살짝 접었다 펴기
export function poseCrystalWing(w, t) {
  const B = w.B; B.body.position.y = 3.2 + sin(t * 1.6) * .04; B.chest.rotation.x = sin(t * 1.6) * .02;
  B.neck.rotation.x = sin(t * .9) * .05; B.neck2.rotation.y = sin(t * .6) * .15; B.head.rotation.x = -.05 + sin(t * 1.1) * .04; B.jaw.rotation.x = max(0, sin(t * .7)) * .12;
  for (const [n, k] of [["tail", 1], ["tail2", 1.3], ["tail3", 1.6], ["tail4", 1.8]]) B[n].rotation.y = sin(t * 1.2 - k) * .08 * k;
  for (const [s, k] of [["R", -1], ["L", 1]]) { B["wa" + s].rotation.z = k * (sin(t * 1.3) * .06 - .05); B["wf" + s].rotation.z = k * sin(t * 1.3 - .5) * .05; B["hw" + s].rotation.z = k * sin(t * 2.6) * .12; }
}
