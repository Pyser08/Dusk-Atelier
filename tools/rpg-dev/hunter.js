// 사냥꾼 인형(6.5등신): Dusk Saga 복셀 인형과 같은 방식(뼈별 복셀 → 면 합치기 → 스킨 메시 하나)
// 단위: 머리 하나 = 7칸, 키 = 45.5칸. 이목구비 없음
import * as THREE from "three"; import { mesh, mat, ink } from "./voxkit.js";
export const HU = .055; // 한 칸 길이(키 ≈ 2.5, 기존 인형과 같은 키)
const RS = 2; // 칸당 복셀 수
// [이름, 부모, 관절 x, y, z]  오른쪽 = x 음수
const BONES = [["hips", null, 0, 23.5, 0], ["spine", "hips", 0, 27, 0], ["chest", "spine", 0, 31, 0], ["neck", "chest", 0, 36.5, 0], ["head", "neck", 0, 38.8, 0],
  ["uaR", "chest", -5.4, 35.4, 0], ["laR", "uaR", -6.5, 27.6, 0], ["hR", "laR", -7, 21.4, .2], ["uaL", "chest", 5.4, 35.4, 0], ["laL", "uaL", 6.5, 27.6, 0], ["hL", "laL", 7, 21.4, .2],
  ["ulR", "hips", -2.5, 23, 0], ["llR", "ulR", -2.6, 12.8, 0], ["ftR", "llR", -2.6, 2.4, 0], ["ulL", "hips", 2.5, 23, 0], ["llL", "ulL", 2.6, 12.8, 0], ["ftL", "llL", 2.6, 2.4, 0]];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
const dk = (c, k = .8) => new THREE.Color(c).multiplyScalar(k).getHex();
// 몸통 단면(y → 좌우 반폭, 앞뒤 반폭, 앞뒤 중심)
const TORSO = { m: [[22, 3.9, 2.6, 0], [24, 4.4, 2.8, 0], [26, 4, 2.55, .1], [27.5, 3.75, 2.45, .15], [30, 4.2, 2.7, .2], [33, 4.95, 3, .2], [35, 5.5, 2.8, 0], [36.2, 5, 2.4, -.2], [37, 3, 1.9, -.2]],
  f: [[22, 4.1, 2.7, 0], [24, 4.7, 2.9, -.1], [26, 4.1, 2.5, 0], [28, 3.25, 2.25, .1], [30.5, 3.6, 2.4, .1], [33, 4.2, 2.6, .1], [35, 4.75, 2.5, 0], [36.2, 4.3, 2.2, -.2], [37, 2.6, 1.7, -.2]] };
const lerpRow = (T, y) => { if (y <= T[0][0]) return T[0]; for (let i = 1; i < T.length; i++) if (y <= T[i][0]) { const a = T[i - 1], b = T[i], t = (y - a[0]) / (b[0] - a[0]); return a.map((v, k) => v + (b[k] - v) * t); } return null; };
function build(o) {
  const f = o.sex === "f", SK = o.skin ?? 0xe3bd9c, HA = o.hair ?? 0x4a4350, UW = o.under ?? 0xd8d0bc, V = new Map();
  const set = (b, X, Y, Z, c) => { let m = V.get(b); if (!m) V.set(b, (m = new Map())); m.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c); };
  const has = (X, Y, Z) => { const k = (X + 128) + (Y + 128) * 256 + (Z + 128) * 65536; for (const m of V.values()) if (m.has(k)) return true; return false; };
  // 덩어리 하나를 칸 범위 안에서 훑는다. inside(x,y,z) → 색 또는 null
  const fill = (b, x0, x1, y0, y1, z0, z1, inside, over = true) => { for (let X = Math.floor(x0 * RS); X <= x1 * RS; X++) for (let Y = Math.floor(y0 * RS); Y <= y1 * RS; Y++) for (let Z = Math.floor(z0 * RS); Z <= z1 * RS; Z++) { const c = inside((X + .5) / RS, (Y + .5) / RS, (Z + .5) / RS); if (c != null && (over || !has(X, Y, Z))) set(b, X, Y, Z, c); } };
  const blob = (b, cx, cy, cz, rx, ry, rz, col, p = 2, over) => fill(b, cx - rx, cx + rx, cy - ry, cy + ry, cz - rz, cz + rz, (x, y, z) => (Math.abs((x - cx) / rx) ** p + Math.abs((y - cy) / ry) ** p + Math.abs((z - cz) / rz) ** p <= 1 ? (typeof col === "function" ? col(x, y, z) : col) : null), over);
  // 굵기가 변하는 캡슐(팔다리)
  const cap = (b, a, e, r0, r1, col, zs = 1) => { const R = Math.max(r0, r1); fill(b, Math.min(a[0], e[0]) - R, Math.max(a[0], e[0]) + R, Math.min(a[1], e[1]) - R, Math.max(a[1], e[1]) + R, Math.min(a[2], e[2]) - R, Math.max(a[2], e[2]) + R, (x, y, z) => { const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L)), q = [x - a[0] - d[0] * t, y - a[1] - d[1] * t, (z - a[2] - d[2] * t) / zs], r = r0 + (r1 - r0) * t; return q[0] ** 2 + q[1] ** 2 + q[2] ** 2 <= r * r ? (typeof col === "function" ? col(x, y, z, t) : col) : null; }); };
  // 몸통: 단면을 쌓는다. 높이로 뼈를 나눈다
  const T = TORSO[f ? "f" : "m"], briefTop = f ? 24.6 : 25;
  fill("hips", -6, 6, 21.5, 37.2, -4, 4, (x, y, z) => { const r = lerpRow(T, y); if (!r) return null; const [, rx, rz, cz] = r; const n = Math.abs(x / rx) ** 2.3 + Math.abs((z - cz) / rz) ** 2.3; if (n > 1) return null; if (y < 22.8 && Math.abs(x) > 1.6 && y < 22 + Math.abs(x) * .35) return null; return y < briefTop ? UW : SK; });
  for (const [n, m] of [...V]) if (n === "hips") { const sp = new Map(), ch = new Map(); for (const [k, c] of m) { const Y = ((k >> 8) & 255) - 128, y = (Y + .5) / RS; if (y >= 31) { ch.set(k, c); m.delete(k); } else if (y >= 26.5) { sp.set(k, c); m.delete(k); } } V.set("spine", sp); V.set("chest", ch); }
  if (f) { for (const k of [-1, 1]) blob("chest", k * 1.85, 32.6, 2.1, 1.9, 1.75, 1.6, (x, y) => (y < 33.8 ? UW : SK)); fill("chest", -4.5, 4.5, 31.4, 33.9, -3, 3.6, (x, y, z) => { const r = lerpRow(T, y); return Math.abs(x / (r[1] + .15)) ** 2.3 + Math.abs((z - r[3]) / (r[2] + .15)) ** 2.3 <= 1 ? UW : null; }); }
  else { for (const k of [-1, 1]) blob("chest", k * 2.3, 32.8, 1.3, 2.4, 1.7, 1.75, SK, 2.2); blob("spine", 0, 28.2, .9, 2.4, 2.6, 1.8, SK, 2.4); }
  blob("hips", 0, 24.3, -1.4, f ? 3.6 : 3.2, 2, 1.8, UW); // 엉덩이
  // 목·머리(머리 7칸: 턱 38.5 ~ 정수리 45.5)
  cap("neck", [0, 36.2, -.3], [0, 39.4, -.1], f ? 1.15 : 1.4, f ? 1.05 : 1.3, SK);
  blob("head", 0, 42.1, .25, f ? 2.85 : 3, 3.5, f ? 3.1 : 3.25, SK, 2.2); blob("head", 0, 39.7, 1.4, f ? 1.5 : 1.8, 1.4, 1.5, SK, 2.2); // 두개·턱
  blob("head", 0, 42.9, -.15, f ? 3.15 : 3.25, 3.05, f ? 3.45 : 3.5, HA, 2.4); // 머리카락 껍데기 → 얼굴 쪽은 깎는다
  const hm = V.get("head"); for (const [k, c] of hm) if (c === HA) { const X = (k & 255) - 128, Y = ((k >> 8) & 255) - 128, Z = (k >> 16) - 128, x = (X + .5) / RS, y = (Y + .5) / RS, z = (Z + .5) / RS; if (z > .6 && y < 43.4 - Math.abs(x) * .25 && Math.abs(x) < 2.3) hm.set(k, SK); else if (z > 1.6 && y < 41.5) hm.delete(k); }
  if (f) for (const k of [-1, 1]) cap("head", [k * 2.6, 42.5, -1.2], [k * 2.4, 36.4, -1.6], 1, .8, HA); if (f) blob("head", 0, 39, -2.4, 2.7, 4, 1.2, HA);
  // 팔: 어깨 → 팔꿈치 → 손목 → 손
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    const sh = [k * 5.4, 35.4, 0], el = [k * 6.5, 27.6, 0], wr = [k * 7, 21.4, .2], g = f ? .85 : 1;
    blob("ua" + s, k * 5.15, 35.2, 0, 1.9 * g, 1.7, 1.75 * g, SK); // 어깨 세모근
    cap("ua" + s, sh, el, 1.6 * g, 1.2 * g, SK); blob("ua" + s, k * 5.9, 31.5, .35, 1.35 * g, 2.6, 1.3 * g, SK); // 위팔 근육
    cap("la" + s, el, wr, 1.25 * g, .85 * g, SK); blob("la" + s, k * 6.65, 26.2, .2, 1.4 * g, 2.3, 1.3 * g, SK);
    blob("h" + s, k * 7.15, 19.6, .45, .62 * g, 1.65, 1.05 * g, SK); blob("h" + s, k * 6.85, 20.2, 1.25, .5, .9, .45, SK); // 손바닥·엄지
  }
  // 다리: 골반 → 무릎 → 발목 → 발
  for (const [s, k] of [["R", -1], ["L", 1]]) {
    const hp = [k * 2.5, 23, 0], kn = [k * 2.6, 12.8, .15], an = [k * 2.6, 2.4, -.2], g = f ? .95 : 1;
    cap("ul" + s, hp, kn, 2.35 * g, 1.5 * g, (x, y) => (y > (f ? 21.6 : 21.2) - Math.abs(x - k * 2.5) * (k * x > 2.5 ? .7 : .1) ? UW : SK)); blob("ul" + s, k * 2.75, 18.5, .5, 2.1 * g, 4, 2 * g, SK, 2, false);
    cap("ll" + s, kn, an, 1.45 * g, .8 * g, SK); blob("ll" + s, k * 2.65, 9.6, -.55, 1.55 * g, 2.8, 1.55 * g, SK); blob("ll" + s, k * 2.6, 12.8, .7, 1.05, 1.05, .8, SK); // 종아리·무릎
    fill("ft" + s, k * 2.6 - 1.2, k * 2.6 + 1.2, 0, 2.2, -1.4, 4.2, (x, y, z) => { const u = (x - k * 2.6) / (z > 2.6 ? 1 : 1.1), top = z < .5 ? 2.2 : 2.2 - (z - .5) * .42; return Math.abs(u) <= 1 && y <= top && !(z > 3.4 && (z - 3.4) ** 2 + u * u * .3 > .8) ? (y < .55 ? dk(SK, .8) : SK) : null; });
  }
  return V;
}
/** 인형 하나: opt = { sex: "m"|"f", skin, hair, under } → { root, B(뼈), mesh, h } */
export function makeHunter(opt = {}) {
  const V = build(opt), out = { p: [], n: [], c: [], b: [], w: [], i: [], fx: [], pv: [], ax: [] };
  for (const [bone, m] of V) mesh(m, 256, HU / RS, (x, y, z) => [x, y, z], BI[bone], out);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(out.c, 3)); g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(out.b, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(out.w, 4)); g.setAttribute("aFx", new THREE.Float32BufferAttribute(out.fx, 2)); g.setAttribute("aPv", new THREE.Float32BufferAttribute(out.pv, 3)); g.setAttribute("aAx", new THREE.Float32BufferAttribute(out.ax, 3)); g.setIndex(out.i);
  const bones = BONES.map(([n]) => Object.assign(new THREE.Bone(), { name: n })); BONES.forEach(([, p, x, y, z], i) => { const q = p ? BONES[BI[p]] : [0, 0, 0, 0, 0]; bones[i].position.set((x - q[2]) * HU, (y - q[3]) * HU, (z - q[4]) * HU); if (p) bones[BI[p]].add(bones[i]); });
  const root = new THREE.Group(), m = new THREE.SkinnedMesh(g, mat), k = new THREE.SkinnedMesh(g, ink); root.add(bones[0], m, k); root.updateMatrixWorld(true); const sk = new THREE.Skeleton(bones); m.bind(sk); k.bind(sk); m.frustumCulled = k.frustumCulled = false; m.castShadow = true;
  return { root, mesh: m, B: Object.fromEntries(bones.map((b) => [b.name, b])), rest: bones[0].position.clone(), h: 45.5 * HU, tris: out.i.length / 3 };
}
// 간단한 동작(확인용): 서 있기 · 걷기
export function poseHunter(h, act, t) {
  const B = h.B; for (const b of Object.values(B)) b.rotation.set(0, 0, 0); B.hips.position.copy(h.rest);
  const br = Math.sin(t * 2) * .02; B.chest.rotation.x = -br; B.uaR.rotation.z = -.08; B.uaL.rotation.z = .08; B.laR.rotation.x = B.laL.rotation.x = -.12;
  if (act === "walk") { const s = Math.sin(t * 6), c = Math.cos(t * 6); B.ulR.rotation.x = s * .55; B.ulL.rotation.x = -s * .55; B.llR.rotation.x = Math.max(0, -c) * .9 + .05; B.llL.rotation.x = Math.max(0, c) * .9 + .05; B.uaR.rotation.x = -s * .45; B.uaL.rotation.x = s * .45; B.laR.rotation.x = B.laL.rotation.x = -.35; B.hips.position.y += Math.abs(c) * .03 - .02; B.hips.rotation.y = s * .1; B.chest.rotation.y = -s * .16; }
}
