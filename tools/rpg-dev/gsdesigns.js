// 몬스터 파생 대검 견본(유리날개룡). 대검 공용 뼈대(GS_FRAME) 치수 안에서 칼날 자체를 몬스터 부위로 빚는다
// 대검 좌표: 원점 = 주 손잡이, +y 칼끝, +x 날 쪽, -x 칼등, ±z 칼면. 복셀 한 칸 = VS
import * as THREE from "three";
export const VS = .022; const { abs, max, min, floor, sin, cos, hypot, atan2, PI } = Math;
const hash = (x, y, z) => { const n = sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55; return n - floor(n); };
const C = { HIDE: 0x34324a, HIDE2: 0x48455f, BELLY: 0x6a6480, SEAM: 0x1e2236, EYE: 0xbff4ff, BONE: 0x5a5672, XT: [0xa8e4fa, 0xc8dcff, 0xdcd0ff, 0xeef9ff, 0x9ad6f0] };
function kit() {
  const V = new Map(), put = (X, Y, Z, c) => V.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c);
  const scan = (lo, hi, f) => { for (let X = floor(lo[0] / VS); X <= hi[0] / VS; X++) for (let Y = floor(lo[1] / VS); Y <= hi[1] / VS; Y++) for (let Z = floor(lo[2] / VS); Z <= hi[2] / VS; Z++) { const c = f((X + .5) * VS, (Y + .5) * VS, (Z + .5) * VS, X, Y, Z); if (c != null) put(X, Y, Z, c); } };
  const ell = (c, r, col) => scan([c[0] - r[0], c[1] - r[1], c[2] - r[2]], [c[0] + r[0], c[1] + r[1], c[2] + r[2]], (x, y, z) => (((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2 <= 1 ? (typeof col === "function" ? col(x, y, z) : col) : null));
  const cap = (a, e, r0, r1, col) => { const R = max(r0, r1), d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2; scan([min(a[0], e[0]) - R, min(a[1], e[1]) - R, min(a[2], e[2]) - R], [max(a[0], e[0]) + R, max(a[1], e[1]) + R, max(a[2], e[2]) + R], (x, y, z) => { const t = max(0, min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L)); return hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t) <= r0 + (r1 - r0) * t ? (typeof col === "function" ? col(x, y, z, t) : col) : null; }); };
  // 결정 가시: 단면 마름모, 끝으로 가늘어짐
  const spike = (a, e, r, ci = 0) => { const d = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], L = d[0] ** 2 + d[1] ** 2 + d[2] ** 2; scan([min(a[0], e[0]) - r, min(a[1], e[1]) - r, min(a[2], e[2]) - r], [max(a[0], e[0]) + r, max(a[1], e[1]) + r, max(a[2], e[2]) + r], (x, y, z) => { const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L; if (t < 0 || t > 1) return null; const q = [x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t]; return abs(q[0]) + abs(q[1]) + abs(q[2]) <= r * (1 - t * .9) * 1.3 ? C.XT[(ci + (q[2] > 0 ? 1 : 0)) % 5] : null; }); };
  // 결정판 칸 색: 가장 가까운 두 점의 거리 차가 작으면 납선
  const cells = (pts) => (x, y) => { let d1 = 9, d2 = 9, id = 0; for (let i = 0; i < pts.length; i++) { const d = hypot(x - pts[i][0], y - pts[i][1]); if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d; } return d2 - d1 < .02 ? C.SEAM : C.XT[(id * 3) % 5]; };
  const hideC = (x, y, z) => (hash(floor(x * 30), floor(y * 30), floor(z * 30)) > .78 ? C.HIDE2 : C.HIDE);
  // 손잡이: 가죽 띠 + 힘줄 매듭
  const grip = (pommel) => { scan([-.045, -.44, -.045], [.045, -.02, .045], (x, y, z) => (hypot(x, z) <= .045 ? (floor((y + .44) / .04) % 3 === 0 ? C.BELLY : C.HIDE2) : null)); pommel(); };
  return { V, scan, ell, cap, spike, cells, hideC, grip };
}
/** A. 익완대검: 날개팔 뼈 = 칼등, 결정판 막 = 칼날, 손가락 뼈 셋이 칸을 나눔. 날 쪽은 막 끝처럼 물결. 끝은 손목 갈고리 */
function wingArm() {
  const K = kit(), sp = -.2, top = 1.62;
  // 막(칼날): 칼등 뼈에서 날 쪽으로. 날 끝은 손가락 끝 사이마다 오목하게 파인 물결
  const ribs = [[.42, .62], [.86, 1.08], [1.28, 1.5]]; // 손가락 뼈: [칼등에서 시작 y, 날 끝 y]
  const edgeAt = (y) => { const w = .27 + (y - .1) * .07; let sc = 0; const ends = [.1, ...ribs.map((r) => r[1]), top + .14]; for (let i = 1; i < ends.length; i++) if (y >= ends[i - 1] && y <= ends[i]) { const t = (y - ends[i - 1]) / (ends[i] - ends[i - 1]); sc = sin(t * PI) * .085; } return sp + .02 + w - sc; };
  const pts = []; for (let i = 0; i < 34; i++) pts.push([sp + .03 + hash(i, 1, 2) * .32, .14 + hash(i, 3, 4) * 1.5]);
  const cell = K.cells(pts);
  K.scan([sp, .1, -.03], [.4, top + .16, .03], (x, y, z) => { if (x < sp || x > edgeAt(y) || y > top + .12 - max(0, x - sp - .02) * 1.1) return null; const de = edgeAt(y) - x; if (abs(z) > (de < .025 ? .012 : .018)) return null; if (de < .014) return C.SEAM; return cell(x, y); });
  // 손가락 뼈: 칼등에서 날 끝으로 비스듬히(칸을 나누는 어두운 뼈)
  for (const [y0, y1] of ribs) { K.cap([sp + .02, y0, 0], [edgeAt(y1) + .01, y1, 0], .032, .016, C.BONE); K.spike([edgeAt(y1), y1, 0], [edgeAt(y1) + .06, y1 + .05, 0], .022, 1); }
  // 칼등 = 날개팔 뼈: 굵은 가죽 뼈대에 관절 마디 둘
  K.cap([sp, .06, 0], [sp + .01, .86, 0], .062, .05, K.hideC); K.cap([sp + .01, .86, 0], [sp + .02, top, 0], .05, .036, K.hideC);
  for (const y of [.86]) K.ell([sp + .005, y, 0], [.075, .075, .07], C.HIDE2);
  // 앞날 가시: 칼등 바깥으로 줄지어
  for (let i = 0; i < 7; i++) { const y = .2 + i * .2; K.spike([sp - .03, y, 0], [sp - .1 + i * .004, y + .1, 0], .026, i); }
  // 손목 갈고리: 칼끝에서 날 쪽으로 휘어 넘어간다
  K.ell([sp + .02, top, 0], [.05, .05, .05], C.HIDE2); K.spike([sp + .02, top, 0], [sp + .1, top + .2, 0], .045, 2); K.spike([sp + .1, top + .19, 0], [sp + .2, top + .16, 0], .03, 3);
  // 가드 = 어깨 관절: 둥근 덩어리 + 막이 붙는 뿌리
  K.ell([sp + .06, .04, 0], [.13, .08, .075], K.hideC); K.ell([sp + .12, .07, 0], [.06, .05, .04], C.BELLY);
  K.grip(() => { for (const [dx, dy, dz] of [[0, -1, 0], [.6, -.7, .2], [-.6, -.7, -.2]]) K.spike([0, -.45, 0], [dx * .07, -.45 + dy * .1, dz * .05], .03, 1); });
  return K.V;
}
/** B. 부채볏대검: 가드(머리 밑동)에서 부채꼴로 퍼지는 결정 볏 마디들이 합쳐져 넓은 칼날이 된다. 끝은 볏 톱니 */
function crestFan() {
  const K = kit(), N = 7, o = [0, .08];
  // 볏 마디: 가드에서 위로 부채꼴. 마디 사이는 얇은 결정, 마디 자체는 두꺼운 마름모
  const angOf = (i) => (i - (N - 1) / 2) * .085, lenOf = (i) => 1.62 - abs(i - (N - 1) / 2) * .08;
  K.scan([-.32, .08, -.05], [.32, 1.8, .05], (x, y, z) => { const a = atan2(x - o[0], y - o[1]), r = hypot(x - o[0], y - o[1]), span = angOf(N - 1) + .05; if (abs(a) > span || r < .05) return null;
    let best = 9, bi = 0; for (let i = 0; i < N; i++) { const d = abs(a - angOf(i)); if (d < best) { best = d; bi = i; } } const L = lenOf(bi) + .1 * (1 - best / .043); if (r > L) return null; // 마디 끝마다 톱니
    const ridge = best * r, th = .045 * (1 - ridge / .05) * (1 - r / 2.2); if (abs(z) > max(.016, th)) return null; if (best > .038 && best < .046 && r > .2) return C.SEAM; return C.XT[(bi * 2 + (r > L - .12 ? 3 : 0)) % 5]; });
  // 볏 마디 뿌리: 어두운 테
  for (let i = 0; i < N; i++) { const a = angOf(i); K.cap([o[0] + sin(a) * .06, o[1] + cos(a) * .06, 0], [o[0] + sin(a) * .2, o[1] + cos(a) * .2, 0], .028, .018, C.SEAM); }
  // 가드 = 머리 밑동: 납작한 가죽 머리, 양옆 빛나는 눈 틈, 뺨 가시
  K.ell([0, .03, 0], [.16, .09, .085], K.hideC); for (const k of [-1, 1]) { K.ell([k * .09, .05, .07], [.04, .012, .02], C.EYE); K.spike([k * .12, .03, 0], [k * .26, .0, -.02], .03, k > 0 ? 1 : 3); }
  K.ell([0, -.03, .02], [.08, .04, .06], C.BELLY);
  K.grip(() => K.ell([0, -.48, 0], [.05, .05, .05], C.XT[0]));
  return K.V;
}
/** C. 꼬리마디대검: 꼬리뼈 마디가 칼 심, 등 결정 가시가 이어져 톱날 같은 날을 이룬다. 끝은 꼬리 끝 프리즘 덩어리, 가드는 뒷날개 한 쌍 */
function tailSeg() {
  const K = kit(), seg = 6, y0 = .12, y1 = 1.42, sl = (y1 - y0) / seg;
  // 꼬리뼈 마디: 끝으로 갈수록 가늘어지는 가죽 마디, 사이는 어두운 이음새
  for (let i = 0; i < seg; i++) { const a = y0 + i * sl, r = .085 - i * .007; K.scan([-r, a, -r * .8], [r, a + sl, r * .8], (x, y, z) => { const t = (y - a) / sl, rr = r * (1 - abs(t - .5) * .25); if (abs(x) > rr || abs(z) > rr * .75) return null; if (t < .07 || t > .95) return C.SEAM; return y < a + sl * .5 && x < 0 ? C.BELLY : K.hideC(x, y, z); }); }
  // 등 결정 가시 = 날: 마디마다 큰 가시 하나, 사이에 작은 가시. 크기가 물결친다
  for (let i = 0; i < seg * 2; i++) { const y = y0 + (i + .5) * sl / 2, big = i % 2 === 0, h = (big ? .2 : .11) * (1 - i / (seg * 2) * .35) * (1 + sin(i * .9) * .15), x0 = .07 - i * .003; K.spike([x0, y - .03, 0], [x0 + h, y + h * .55, 0], big ? .05 : .032, i); }
  // 가시 사이를 잇는 결정막: 마디마다 볼록하게 → 톱날 칼날
  { const pts = []; for (let i = 0; i < 30; i++) pts.push([.08 + hash(i, 5, 1) * .16, y0 + hash(i, 6, 2) * (y1 - y0)]); const cell = K.cells(pts); K.scan([.06, y0, -.02], [.3, y1, .02], (x, y, z) => { const u = ((y - y0) / (sl / 2)) % 1, env = .07 + (.06 + .1 * sin(u * PI)) * (1 - (y - y0) / (y1 - y0) * .35); if (x > env + .07 || abs(z) > .014) return null; return x > env + .055 ? C.SEAM : cell(x, y); }); }
  // 칼등 쪽 작은 가시
  for (let i = 0; i < seg; i++) { const y = y0 + (i + .4) * sl; K.spike([-.07, y, 0], [-.13, y + .05, 0], .022, i + 2); }
  // 꼬리 끝 프리즘 덩어리
  const tp = [0, y1 + .02, 0]; K.ell(tp, [.05, .04, .04], C.SEAM); for (const [dx, dy, dz, L] of [[0, 1, 0, .34], [.45, .8, .15, .24], [-.45, .8, -.15, .24], [.75, .4, -.1, .2], [-.7, .45, .12, .2], [.2, .9, -.35, .22]]) K.spike(tp, [tp[0] + dx * L, tp[1] + dy * L, tp[2] + dz * L], .05, floor((dx + 1) * 3));
  // 가드 = 뒷날개 한 쌍: 작은 결정판(납선 테)
  for (const k of [-1, 1]) { const pts = [[k * .1, .06], [k * .18, .1], [k * .24, .05]], cell = K.cells(pts); K.scan([min(0, k * .3), -.02, -.012], [max(0, k * .3), .16, .012], (x, y) => { const u = k * x; if (u < .03 || u > .28) return null; const top = .03 + u * .45, bot = .02 - u * .12; if (y > top || y < bot) return null; if (y > top - .015 || y < bot + .015 || u > .265) return C.SEAM; return cell(x, y); }); K.cap([k * .03, .02, 0], [k * .28, .15, 0], .018, .01, C.SEAM); }
  K.ell([0, .03, 0], [.09, .06, .07], K.hideC);
  K.grip(() => K.ell([0, -.48, 0], [.05, .04, .05], C.HIDE2));
  return K.V;
}
export const GS_CUSTOM = { cw_wing: { n: "익완대검", f: wingArm }, cw_crest: { n: "부채볏대검", f: crestFan }, cw_tail: { n: "꼬리마디대검", f: tailSeg } };
