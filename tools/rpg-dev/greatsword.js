// 대검: 공용 뼈대(치수 + 장착점) → 디자인별 복셀 → 메시 하나
// 대검 자체 좌표: 원점 = 주 손잡이(가드 바로 아래), +y = 칼끝 방향, +x = 날 쪽, -x = 칼등, ±z = 칼면
import * as THREE from "three"; import { mesh, mat } from "./voxkit.js"; import { GS_CUSTOM, VS as VSC } from "./gsdesigns.js";
const VS = .022; const { abs, max, min, floor, sin, hypot } = Math;
const hash = (x, y, z) => { const n = sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55; return n - floor(n); };
const dk = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
/** 대검 기초 뼈대: 모든 대검이 같은 치수 체계와 장착점을 쓴다(디자인은 이 틀 안에서 모양만 바꾼다) */
export const GS_FRAME = {
  grip: [-.44, -.02],   // 손잡이 구간(y)
  guard: [-.02, .1],    // 가드 구간
  blade: [.1, 1.78],    // 칼날 구간
  width: [.4, .34],     // 칼날 폭(밑동 → 끝)
  thick: .05,           // 칼날 두께(반)
  pts: { main: [0, -.06, 0], off: [0, -.4, 0], back: [0, .55, 0], tip: [0, 1.78, 0] }, // 오른손 · 왼손 · 등에 거는 점 · 칼끝
};
// ── 디자인 ── 각 디자인은 칼날 단면(edge·spine 위치), 색, 장식만 정한다
const IRON = { n: "철 대검", metal: 0x9aa0ac, edge: 0xd6dbe4, dark: 0x5a5f6a, grip: 0x5a3e2c, wrap: 0x8a6448, trim: 0x8f7448 };
const CRYSTAL = { n: "유리날개 대검", metal: 0x3d3a52, edge: 0xbfe8ff, dark: 0x1e2236, grip: 0x2c2a3c, wrap: 0x6a6480, trim: 0x9ad6f0, xt: [0xa8e4fa, 0xc8dcff, 0xdcd0ff, 0xeef9ff, 0x9ad6f0] };
export const GS_DESIGNS = { iron: IRON, crystal: CRYSTAL };
function build(d, F = GS_FRAME) {
  const V = new Map(), put = (X, Y, Z, c) => V.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c);
  const scan = (lo, hi, f) => { for (let X = floor(lo[0] / VS); X <= hi[0] / VS; X++) for (let Y = floor(lo[1] / VS); Y <= hi[1] / VS; Y++) for (let Z = floor(lo[2] / VS); Z <= hi[2] / VS; Z++) { const c = f((X + .5) * VS, (Y + .5) * VS, (Z + .5) * VS, X, Y, Z); if (c != null) put(X, Y, Z, c); } };
  const [b0, b1] = F.blade, L = b1 - b0, T = F.thick, cr = d === CRYSTAL;
  // 칼날: 외날. 칼등은 곧고, 날은 살짝 볼록, 끝은 칼등 쪽에서 날 쪽으로 비스듬히 잘린 모양
  scan([-.3, b0, -T], [.3, b1, T], (x, y, z, X, Y, Z) => {
    const t = (y - b0) / L, w = F.width[0] + (F.width[1] - F.width[0]) * t, sp = -w * .42, ed = sp + w + sin(t * 3.14) * .025, clip = b1 - .34; // 끝 잘림 시작
    let e = ed; if (y > clip) { const k = (y - clip) / (b1 - clip); e = ed - (ed - sp) * k; if (x < sp) return null; }
    if (x < sp || x > e) return null; const dEdge = e - x, th = T * min(1, dEdge / .1 + .25); if (abs(z) > th) return null; // 날 쪽으로 얇아진다
    if (cr) { // 유리날개: 어두운 칼등 + 날을 따라 결정판 마디(납선으로 나눔)
      if (dEdge < .13) { const seg = floor((y - b0) / .2), gap = ((y - b0) % .2) < .018 || dEdge > .115; return gap ? d.dark : d.xt[(seg * 3 + (abs(z) > th * .6 ? 1 : 0)) % 5]; }
      if (abs(x - sp - .07) < .025 && y < clip - .05) return d.trim; // 칼등을 따라 흐르는 빛줄
      return (X + Y * 2) % 7 === 0 && hash(X, Y, 0) > .5 ? dk(d.metal, 1.2) : d.metal; }
    if (dEdge < .045) return d.edge; // 날 벼림
    if (abs(x - sp - .085) < .03 && y > b0 + .2 && y < clip - .06) return abs(z) > th - VS * 1.1 ? d.dark : null; // 칼등 홈(양면)
    if (y < b0 + .26 && x < sp + .2) { const rv = (abs(x - sp - .06) < .022 || abs(x - sp - .15) < .022) && abs(((y - b0) % .1) - .05) < .022; return rv ? d.trim : dk(d.metal, .82); } // 밑동 보강판 + 리벳
    return d.metal; });
  // 가드: 넓고 각진 막대 + 가운데 덩어리
  const [g0, g1] = F.guard; scan([-.27, g0, -.075], [.27, g1, .075], (x, y, z) => { const r = .27 - (y - g0) * .4; if (abs(x) > r || abs(z) > .06 + (abs(x) < .07 ? .02 : 0)) return null; return abs(x) < .07 ? (cr ? d.trim : d.trim) : abs(x) > r - .03 ? dk(d.metal, .7) : d.metal; });
  if (cr) for (let i = 0; i < 5; i++) { const a = (i - 2) * .32; scan([-.4, g1, -.03], [.4, g1 + .3, .03], (x, y) => { const tx = sin(a) * .3, ty = g1 + .05 + Math.cos(a) * .2, t = ((x - 0) * tx + (y - g1) * (ty - g1)) / (tx * tx + (ty - g1) ** 2); if (t < .2 || t > 1) return null; return hypot(x - tx * t, y - g1 - (ty - g1) * t) < .03 * (1.2 - t) ? d.xt[i % 5] : null; }); } // 가드 위 결정 부채
  // 손잡이: 감은 띠 + 끝 덩어리
  const [p0, p1] = F.grip; scan([-.045, p0, -.045], [.045, p1, .045], (x, y) => (hypot(x, (0)) <= .045 ? (floor((y - p0) / .045) % 2 ? d.wrap : d.grip) : null));
  scan([-.075, p0 - .1, -.075], [.075, p0, .075], (x, y, z) => (abs(x) + abs(z) + abs(y - p0 + .05) * 1.2 < .1 ? (cr ? d.xt[0] : d.trim) : null));
  return V;
}
/** 대검 하나 → { obj(Group), pt(이름) → 대검 좌표 Vector3, n } */
export function makeGreatSword(kind = "iron") {
  const cu = GS_CUSTOM[kind], d = cu ? { n: cu.n } : GS_DESIGNS[kind] ?? IRON, out = { p: [], n: [], c: [], b: [], w: [], i: [], fx: [], pv: [], ax: [] }; mesh(cu ? cu.f() : build(d), 256, cu ? VSC : VS, (x, y, z) => [x, y, z], 0, out); // 몬스터 파생 디자인은 gsdesigns.js
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("aFx", new THREE.Float32BufferAttribute(out.fx, 2)); g.setAttribute("aPv", new THREE.Float32BufferAttribute(out.pv, 3)); g.setAttribute("aAx", new THREE.Float32BufferAttribute(out.ax, 3)); g.setIndex(out.i);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; const obj = new THREE.Group(); obj.add(m);
  return { obj, n: d.n, tris: out.i.length / 3, pt: (k) => new THREE.Vector3(...GS_FRAME.pts[k]) };
}
