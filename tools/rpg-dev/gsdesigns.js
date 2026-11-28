// 몬스터 파생 대검 견본(유리날개룡). 대검 공용 뼈대(GS_FRAME) 치수 안에서 칼날 자체를 몬스터 부위로 빚는다
// 대검 좌표: 원점 = 주 손잡이, +y 칼끝, +x 날 쪽, -x 칼등, ±z 칼면. 복셀 한 칸 = VS
import * as THREE from "three";
export const VS = .015; const { abs, max, min, floor, sin, cos, hypot, atan2, PI } = Math;
const hash = (x, y, z) => { const n = sin(x * 12.99 + y * 78.23 + z * 37.72) * 43758.55; return n - floor(n); };
const C = { HIDE: 0x34324a, HIDE2: 0x48455f, BELLY: 0x6a6480, SEAM: 0x1e2236, EYE: 0xbff4ff, BONE: 0x5a5672, XT: [0xa8e4fa, 0xc8dcff, 0xdcd0ff, 0xeef9ff, 0x9ad6f0] };
function kit() {
  const V = new Map(), put = (X, Y, Z, c) => { if (X < -127 || X > 126 || Y < -127 || Y > 126 || Z < -127 || Z > 126) return; V.set((X + 128) + (Y + 128) * 256 + (Z + 128) * 65536, c); };
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
// ════ 2차: 장르 문법(두껍고 묵직하게 · 몬스터 소재를 단조 금속 틀·띠·리벳·가죽끈으로 묶어 만든 무기) ════
const M = { DARK: 0x4a4858, STEEL: 0x7a7a8c, HI: 0xa8a8b8, BRASS: 0xa8875a, LEATH: 0x5e4232, LEATH2: 0x7a5a42, STITCH: 0xc8b48a };
function smith(K) {
  // 금속 띠: y 구간에서 칼날 단면을 감싼다(테두리는 밝게, 리벳 둘)
  const band = (y0, h, x0, x1, t) => { const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + .02, cy = y0 + h / 2; K.scan([x0 - .03, y0 - .01, -t - .03], [x1 + .03, y0 + h + .01, t + .03], (x, y, z) => { const v = abs(y - cy) / (h / 2 + .01); if (v > 1) return null; const sw = .022 * (1 - v * v), e = ((x - cx) / (rx + sw)) ** 2 + (z / (t + sw)) ** 2, inner = ((x - cx) / rx) ** 2 + (z / t) ** 2; if (e > 1 || inner < .82) return null; const rv = v < .35 && abs(z) > t * .8 && (abs(x - (x0 + .045)) < .016 || abs(x - (x1 - .045)) < .016); return rv ? M.BRASS : v > .6 ? M.HI : M.STEEL; }); };
  // 가죽끈: 비스듬히 칼날을 감는 띠(바늘땀)
  const strap = (ya, xa, slope, w, x0, x1, t) => K.scan([x0 - .01, ya - .3, -t - .016], [x1 + .01, ya + .3, t + .016], (x, y, z) => { if (x < x0 || x > x1) return null; const d = (y - ya) - (x - xa) * slope; if (abs(d) > w) return null; if (abs(z) < t - .003) return null; return abs(d) < .006 && floor((x - x0) / .02) % 2 ? M.STITCH : abs(d) > w - .008 ? M.LEATH : M.LEATH2; });
  const rivet = (x, y, z) => K.ell([x, y, z], [.017, .017, .012], M.BRASS);
  return { band, strap, rivet };
}
/** A2. 익완대검(2차): 날개팔 뼈를 단조 틀에 물려 칼등으로, 결정 날개판을 겹비늘처럼 두껍게 쌓아 칼날로. 금속 띠로 마디를 묶고 가죽끈으로 밑동을 감았다 */
function wingArm2() {
  const K = kit(), S = smith(K), sp0 = -.2, top = 1.6, T = .045, bend = (y) => sp0 + sin(y / top * PI) * .035; let sp = sp0;
  const ribs = [[.3, .62], [.7, 1.02], [1.08, 1.4]], ends = [.1, .62, 1.02, 1.4, top + .02];
  const edgeAt = (y) => { let sc = 0; for (let i = 1; i < ends.length; i++) if (y >= ends[i - 1] && y <= ends[i]) sc = sin((y - ends[i - 1]) / (ends[i] - ends[i - 1]) * PI) * .06; const k = max(0, (y - top + .3) / .32); return bend(y) + .38 + (y - .1) * .03 - sc - .4 * (1 - Math.sqrt(max(0, 1 - k * k))); }; // 칼끝: 둥글게 깎인 곡선 // 날 끝: 손가락 사이 막처럼 오목, 끝은 비스듬히 잘림
  // 칼날: 겹비늘 결정판(위에서 아래로 겹친 판 줄). 날 쪽 4cm는 맑고 얇은 벼림
  K.scan([sp, .1, -T], [.3, top + .02, T], (x, y, z) => { const e = edgeAt(y); if (x < bend(y) + .04 || x > e) return null; const de = e - x, u = (x - bend(y)) / (e - bend(y)), th = T * (.42 + .58 * Math.sin(Math.min(1, u * 1.15) * PI) ** .6) * (de < .07 ? .3 + de / .07 * .7 : 1); if (abs(z) > th) return null;
    if (de < .045) return de < .012 ? 0xeef9ff : 0xc8ecff; const row = floor((y - .1) / .11), xo = (row % 2) * .05, cxf = (x - sp + xo) / .1, col = floor(cxf), cl = cxf - col, v = (y - .1) % .11, scal = .01 + .045 * ((cl - .5) * 2) ** 2; if (v < scal) return v < scal - .012 ? 0x6fa8cc : 0x3a5a78; // 비늘 아래 가장자리는 U자 곡선(겹친 비늘)
    const sh = v / .11; return abs(z) > th - .012 ? (sh > .75 ? 0x6fa8cc : C.XT[(row * 2 + col) % 5]) : 0x6fa8cc; }); // 판 아래쪽은 그늘(겹친 느낌)
  // 손가락 뼈: 칼등에서 날 끝 돌기로 비스듬히 가로지르는 굵은 뼈, 금속을 덧대 리벳
  for (const [ya, yb] of ribs) { K.cap([bend(ya) + .03, ya, 0], [edgeAt(yb) + .015, yb, 0], .038, .02, C.SEAM); K.cap([sp + .03, ya, 0], [sp + .16, ya + (yb - ya) * .36, 0], .044, .04, M.DARK); S.rivet(sp + .1, ya + (yb - ya) * .2, T + .03); S.rivet(sp + .1, ya + (yb - ya) * .2, -T - .03); K.spike([edgeAt(yb) + .01, yb, 0], [edgeAt(yb) + .1, yb + .06, 0], .03, 2); }
  // 칼등: 굵은 날개팔 뼈를 단조 금속 홈에 물렸다
  K.scan([sp - .07, .06, -.075], [sp + .1, top + .04, .075], (x, y, z) => { const r = (.07 - (y / top) * .015) * (y > top - .1 ? Math.sqrt(max(0, 1 - ((y - top + .1) / .14) ** 2)) : 1), cx = bend(y); if (hypot((x - cx) / 1.1, z) > r) return null; return x < cx - .03 ? (hash(floor(y * 40), 0, floor(z * 40)) > .7 ? C.HIDE2 : C.HIDE) : M.DARK; });
  K.cap([sp - .02, .82, 0], [sp - .02, .9, 0], .09, .09, C.BONE); // 관절 마디
  // 금속 띠 셋 + 칼등 리벳 줄
  for (const y of [.18]) S.band(y, .07, sp - .09, edgeAt(y) - .1, T + .02); for (let y = .32; y < top - .1; y += .12) for (const s of [-1, 1]) S.rivet(sp + .05, y, s * (T + .006));
  // 앞날 가시: 칼등 바깥에 굵게
  for (let i = 0; i < 6; i++) { const y = .3 + i * .22; K.spike([sp - .07, y, 0], [sp - .2, y + .12, 0], .04, i); }
  // 손목 갈고리: 칼끝을 크게 넘어 휘는 결정 갈고리, 뿌리는 금속 고리
  S.band(top - .06, .07, sp - .08, sp + .08, .06); K.spike([sp, top, 0], [sp + .12, top + .2, 0], .07, 2); K.spike([sp + .11, top + .19, 0], [sp + .26, top + .12, 0], .045, 3);
  // 밑동 가죽끈 + 가드: 두꺼운 단조 깃(날개 관절을 감싼 판금), 양옆 뼈돌기
  S.strap(.24, sp, .55, .035, sp - .06, .16, T + .015); S.strap(.4, sp, .55, .035, sp - .06, .16, T + .015);
  K.scan([-.32, -.06, -.1], [.32, .16, .1], (x, y, z) => { const u = abs(x) / .3; if (u > 1) return null; const top = .12 - u * u * .1 + (1 - u) * .01, bot = -.035 + u * u * .09; if (y > top || y < bot) return null; const tk = .085 * (1 - u * .7) * (1 - abs(y - (top + bot) / 2) / ((top - bot) / 2 + .001) * .35); if (abs(z) > tk) return null; return y > top - .022 ? M.HI : hypot(x / .065, (y - .04) / .05) < 1 ? M.BRASS : M.STEEL; });
  K.ell([sp + .02, .02, 0], [.11, .09, .11], C.BONE); for (const k of [-1, 1]) K.spike([k * .24, .04, 0], [k * .34, .14, 0], .035, k > 0 ? 1 : 4);
  // 손잡이: 가죽을 촘촘히 감고 금속 고리 둘, 끝은 발톱 셋을 금속 캡에 박음
  K.scan([-.05, -.44, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .048 ? (floor((y + 2) / .035 + x * 20) % 2 ? M.LEATH : M.LEATH2) : null)); for (const y of [-.06, -.42]) K.cap([0, y, 0], [0, y - .025, 0], .056, .056, M.STEEL);
  K.ell([0, -.48, 0], [.06, .045, .06], M.DARK); for (const [dx, dz] of [[0, 1], [.87, -.5], [-.87, -.5]]) K.spike([dx * .03, -.5, dz * .03], [dx * .07, -.6, dz * .07], .028, 1);
  return K.V;
}
/** C2. 꼬리마디대검(2차): 꼬리뼈 마디를 두꺼운 단조 척추 틀에 꿰고, 등 결정 가시를 날로 이어 붙였다. 마디마다 금속 고리, 끝은 금속 관에 박은 프리즘 덩어리 */
function tailSeg2() {
  const K = kit(), S = smith(K), seg = 6, y0 = .12, y1 = 1.44, sl = (y1 - y0) / seg, T = .05, cxA = (y) => -sin((y - y0) / (y1 - y0) * PI * .9) * .05, tpA = (y) => 1 - (y - y0) / (y1 - y0) * .38;
  // 칼 몸: 마디 판(두껍고 각진 가죽 판) — 칼등 쪽은 둥글게 부푼 꼬리뼈
  for (let i = 0; i < seg; i++) { const a = y0 + i * sl, w = .17 - i * .012; K.scan([-.2, a, -T - .03], [w + .02, a + sl, T + .03], (x0, y, z) => { const x = (x0 - cxA(y)) / tpA(y), t = (y - a) / sl, bulge = 1 - abs(t - .5) * .3; if (x < -.12 * bulge) return null; if (x < -.02) { if (hypot((x + .05) / 1.4, z) > .07 * bulge) return null; return t < .08 ? C.SEAM : C.HIDE; } const sw = sin(t * PI) ** .5, ww = w * (.86 + .14 * sw); if (x > ww || abs(z) > T * (.7 + .3 * sw) * (1 - (x / ww) ** 2 * .55)) return null; return t < .06 ? C.SEAM : x > w * bulge - .03 ? C.BONE : hash(floor(x * 40), floor(y * 40), 1) > .75 ? C.HIDE2 : C.HIDE; }); if (i % 2 === 0) { const sc = tpA(a), ox = cxA(a); S.band(a + sl * .02, .05, ox - .13 * sc, ox + w * .7 * sc, (T + .02) * sc); } }
  // 날: 마디마다 굵은 결정 가시가 앞으로 누워 이어진 톱날
  for (let i = 0; i < seg; i++) { const a = y0 + i * sl, w = .17 - i * .012; for (const [f, L, r] of [[.3, .3, .085], [.78, .17, .055]]) { const y = a + sl * f; const ox = cxA(y), sc = tpA(y); K.spike([ox + (w - .02) * sc, y - .04, 0], [ox + (w - .02) * sc + L, y + L * .7, 0], r, i * 2 + (f > .5 ? 1 : 0)); } }
  // 끝: 금속 관 + 프리즘 덩어리
  const tp = [.02, y1 + .03, 0]; S.band(y1 - .04, .07, -.08, .1, .06); for (const [dx, dy, dz, L] of [[0, 1, 0, .38], [.5, .8, .15, .27], [-.5, .8, -.15, .25], [.8, .35, -.1, .2], [-.75, .4, .12, .2], [.2, .9, -.4, .24]]) K.spike(tp, [tp[0] + dx * L, tp[1] + dy * L, tp[2] + dz * L], .065, floor((dx + 1) * 3));
  // 가드: 단조 깃 + 뒷날개 결정판 한 쌍을 금속 틀에 끼움
  K.scan([-.32, -.06, -.1], [.32, .16, .1], (x, y, z) => { const u = abs(x) / .3; if (u > 1) return null; const top = .12 - u * u * .1 + (1 - u) * .01, bot = -.035 + u * u * .09; if (y > top || y < bot) return null; const tk = .085 * (1 - u * .7) * (1 - abs(y - (top + bot) / 2) / ((top - bot) / 2 + .001) * .35); if (abs(z) > tk) return null; return y > top - .022 ? M.HI : hypot(x / .065, (y - .04) / .05) < 1 ? M.BRASS : M.STEEL; });
  for (const k of [-1, 1]) { const pts = [[k * .2, .12], [k * .28, .17], [k * .33, .1]], cell = K.cells(pts); K.scan([min(0, k * .42), -.04, -.02], [max(0, k * .42), .28, .02], (x, y) => { const u = (k * x - .16) / .24; if (u < 0 || u > 1) return null; const mid = .07 + u * .12, half = .07 * Math.sin(u * PI) ** .7 + .004; if (abs(y - mid) > half) return null; return abs(y - mid) > half - .018 || u > .95 ? M.DARK : cell(x, y); }); }
  // 손잡이
  K.scan([-.05, -.44, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .048 ? (floor((y + 2) / .035 + x * 20) % 2 ? M.LEATH : M.LEATH2) : null)); for (const y of [-.06, -.42]) K.cap([0, y, 0], [0, y - .025, 0], .056, .056, M.STEEL); K.ell([0, -.49, 0], [.065, .05, .065], M.BRASS);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_wing2: { n: "익완대검 (2차)", f: wingArm2 }, cw_tail2: { n: "꼬리마디대검 (2차)", f: tailSeg2 } });
/** D. 날개깃대검(스케치안): 곧은 칼등 + 밑동에서 넓게 뻗어 칼끝으로 날카롭게 좁아지는 날. 밑동 아래 날 쪽엔 뒤로 꺾인 갈고리.
 *  장식은 줄이고 실루엣을 크게: 큰 결정판 몇 장(깃 방향 납선), 굵은 뼈 칼등, 둥근 금속 깃 둘 */
function finBlade() {
  const K = kit(), S = smith(K), sp = -.13, b0 = .1, tip = 1.84, T = .05;
  const spineX = (y) => sp + Math.sin((y - b0) / (tip - b0) * PI * .5) * .05; // 끝으로 갈수록 날 쪽으로 살짝 휨
  // 날 끝선: 밑동(y .18 근처)에서 가장 넓고, 칼끝까지 살짝 오목하게 좁아진다. 맨 아래는 안으로 말려 들어감
  const edgeX = (y) => { if (y < b0) return null; const t = (y - b0) / (tip - b0), w = .5 * (1 - t) ** 1.12 + .004, under = y < .2 ? Math.sqrt(max(0, (y - b0) / .1)) : 1; return spineX(y) + .07 + w * under; };
  // 칼날: 깃 방향(날 끝선과 나란히 비스듬히) 납선으로 나뉜 큰 판 다섯 장. 가운데 볼록, 날 쪽은 맑게 벼림
  K.scan([sp, b0, -T], [.5, tip, T], (x, y, z) => { const e = edgeX(y), s0 = spineX(y) + .05; if (e == null || x < s0 || x > e) return null; const u = (x - s0) / max(.001, e - s0), de = e - x, th = T * (.35 + .65 * Math.sin(Math.min(1, u * 1.1 + .05) * PI) ** .55) * (de < .05 ? .25 + de / .05 * .75 : 1); if (abs(z) > th) return null;
    if (de < .035) return de < .01 ? 0xf2fbff : 0xcdeeff; // 벼린 날
    const vane = (y - b0) + (x - s0) * 2.2, k = floor(vane / .34), f = vane / .34 - k; if (f < .05) return 0x2e4560; // 깃 방향 납선
    return abs(z) > th - .01 ? [0x9ad6f0, 0xb8dcff, 0xa8e4fa, 0xd0d4ff, 0x8ccbe8][k % 5] : 0x6fa8cc; });
  // 칼등: 굵은 뼈(가죽 감김), 칼끝으로 가늘어져 칼날과 한 점에서 만난다
  K.scan([sp - .08, b0 - .06, -.08], [.12, tip, .08], (x, y, z) => { const t = (y - b0) / (tip - b0), r = .068 * (1 - t * .75) + .008; if (hypot((x - spineX(y)) / 1.1, z) > r) return null; return x < spineX(y) - r * .45 ? C.BONE : hash(floor(y * 50), 1, floor(z * 50)) > .75 ? C.HIDE2 : C.HIDE; });
  // 둥근 금속 깃 둘(칼등과 날 뿌리를 묶음) — 장식은 이것뿐
  for (const y of [.26, .9]) S.band(y, .06, spineX(y) - .08, spineX(y) + .16, T + .02);
  // 밑동 아래 갈고리: 날 쪽 뿌리에서 아래 바깥으로 뒤로 꺾인 굵은 결정 돌기
  K.spike([spineX(.12) + .1, .12, 0], [.36, -.08, 0], .07, 2); K.spike([.34, -.06, 0], [.42, -.17, 0], .04, 3);
  K.cap([spineX(.12) + .02, .1, 0], [.3, -.03, 0], .05, .03, C.HIDE); // 갈고리를 받치는 뼈
  // 가드: 작은 초승달 단조 깃 + 둥근 놋쇠
  K.scan([-.24, -.06, -.09], [.24, .13, .09], (x, y, z) => { const u = abs(x) / .22; if (u > 1) return null; const top = .1 - u * u * .08, bot = -.03 + u * u * .07; if (y > top || y < bot) return null; if (abs(z) > .075 * (1 - u * .6)) return null; return y > top - .02 ? M.HI : hypot(x / .055, (y - .035) / .045) < 1 ? M.BRASS : M.STEEL; });
  // 손잡이: 가죽 감기, 끝은 둥근 금속 + 작은 발톱
  K.scan([-.05, -.44, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .047 ? (floor((y + 2) / .03 + x * 25) % 2 ? M.LEATH : M.LEATH2) : null)); K.ell([0, -.47, 0], [.06, .045, .06], M.DARK); K.spike([0, -.5, 0], [0, -.6, 0], .03, 1);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_fin: { n: "날개깃대검", f: finBlade } });
/** E. 3겹 날개대검(사용자 스케치): 손잡이가 곧은 칼등 기둥으로 칼끝까지 이어지고, 칼날은 칼등에서 바깥 위로 비스듬히 뻗은 판 세 장이 겹친다.
 *  밑동은 V자 지지대(검날 연결)로 칼날을 칼등에 잇고 그 사이는 삼각 틈 */
function tripleWing() {
  const K = kit(), S = smith(K), T = .05;
  const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  // 칼날 외곽: 칼끝(칼등 위) → 가장 넓은 곳(중간) → 아래 바깥 모서리 → 칼등 밑동. 바깥 날은 살짝 볼록
  const OUT = [[.03, 1.84], [.2, 1.5], [.38, 1.16], [.47, .98], [.45, .7], [.41, .42], [.34, .22], [.03, .02]];
  const HOLE = [[.05, .1], [.16, .3], [.05, .5]]; // 검날 연결: V자 지지대 사이 삼각 틈
  // 판 경계: 칼등에서 바깥 위로 비스듬한 선 둘 → 판 세 장(아래·가운데·위)
  const seamY = (x, k) => [.42, .9][k] + x * [.72, .68][k]; // 칼등 높이 + 기울기
  const plateOf = (x, y) => (y > seamY(x, 1) ? 2 : y > seamY(x, 0) ? 1 : 0);
  const near = (x, y) => min(...[0, 1].map((k) => abs(y - seamY(x, k)) / Math.hypot(1, [.72, .68][k])));
  K.scan([0, 0, -T - .03], [.5, 1.86, T + .03], (x, y, z) => { if (!inPoly(OUT, x, y) || inPoly(HOLE, x, y)) return null; const p = plateOf(x, y);
    // 겹: 위 판일수록 앞(+z)으로 조금 나와 아래 판 위에 얹힌다. 날 쪽으로 얇아지는 볼록 단면
    let de = 9; for (let i = 0; i < OUT.length - 1; i++) { const [ax, ay] = OUT[i], [bx, by] = OUT[i + 1], L = (bx - ax) ** 2 + (by - ay) ** 2, t = max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L)); de = min(de, hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t)); }
    const off = (p - 1) * .012, th = T * (.45 + .55 * min(1, x / .2)) * (de < .05 ? .25 + de / .05 * .75 : 1); if (z < off - th || z > off + th) return null;
    const sd = near(x, y); if (sd < .014) return 0x2a3e58; // 판 경계 납선
    if (sd < .03 && y > seamY(x, 0) - .03) return 0x5d8fb5; // 위 판이 아래 판에 드리운 그늘
    if (de < .032) return de < .01 ? 0xf2fbff : 0xcdeeff; // 벼린 날
    if (abs(z - off) > th - .01) { const vane = floor((y - x * .7) / .085); return [[0x9ad6f0, 0xa8e4fa], [0xb8dcff, 0xc8dcff], [0xd0d4ff, 0xdcd0ff]][p][vane & 1]; } // 판마다 색 결, 깃 방향 줄
    return 0x6fa8cc; });
  // V자 지지대 테두리(검날 연결): 뼈대가 칼날을 받친다
  K.cap([.04, .08, 0], [.17, .31, 0], .035, .03, C.BONE); K.cap([.17, .31, 0], [.04, .52, 0], .03, .035, C.BONE); K.ell([.17, .31, 0], [.045, .045, .045], C.HIDE2);
  // 칼등 기둥 = 손잡이의 연장: 굵게 시작해 칼끝으로 가늘어지고, 끝은 뾰족
  K.scan([-.08, -.02, -.08], [.08, 1.9, .08], (x, y, z) => { const t = y / 1.86, r = .062 * (1 - t * .7) * (y > 1.72 ? max(0, 1 - (y - 1.72) / .16) : 1) + .006; if (hypot(x / 1.05, z) > r) return null; return x < -r * .4 ? C.BONE : hash(floor(y * 50), 2, floor(z * 50)) > .78 ? C.HIDE2 : C.HIDE; });
  // 둥근 금속 깃: 칼날이 칼등에 붙는 밑동에 하나
  S.band(.02, .07, -.07, .1, .065);
  // 손잡이: 칼등과 같은 축으로 곧게(가죽 감기), 끝은 둥근 금속
  K.scan([-.05, -.46, -.05], [.05, -.02, .05], (x, y, z) => (hypot(x, z) <= .048 ? (floor((y + 2) / .03 + x * 25) % 2 ? M.LEATH : M.LEATH2) : null)); K.ell([0, -.49, 0], [.06, .045, .06], M.DARK);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_triple: { n: "3겹 날개대검", f: tripleWing } });
/** F. 결정깃대검: 가는 칼등 막대에서 깃 모양 결정판 여러 장이 비늘처럼 겹쳐 한쪽으로 뻗는다. 판 끝은 칼끝 쪽으로 누워 톱니 날을 이루고,
 *  뿌리는 어두운 가죽색 → 끝은 맑은 결정으로 밝아진다(유리날개룡 날개 결) */
function plume() {
  const K = kit(), S = smith(K);
  // 칼등: 가늘고 긴 막대(손잡이와 같은 축), 칼끝까지
  K.scan([-.05, -.02, -.05], [.05, 1.88, .05], (x, y, z) => { const r = .036 * (1 - y / 1.88 * .55) * (y > 1.76 ? max(0, 1 - (y - 1.76) / .12) : 1) + .006; return hypot(x, z) <= r ? (hash(floor(y * 60), 3, 0) > .8 ? C.HIDE2 : C.HIDE) : null; });
  // 깃 판: 뿌리(칼등) → 끝(바깥 위). 아래에서 위로 갈수록 판이 길어졌다가 칼끝 근처에서 짧아짐. 위 판이 아래 판 위에 겹친다
  const N = 9; for (let i = 0; i < N; i++) {
    const t = i / (N - 1), by = .1 + t * 1.5, L = .5 + Math.sin(t * PI * .85 + .25) * .42 - t * t * .25, ang = .5 - t * .22, w = .085 + (1 - t) * .03; // 뿌리 높이, 길이, 기울기(세로 기준), 폭
    const dx = Math.sin(ang), dy = Math.cos(ang), zo = (i % 2 ? .012 : -.004) + i * .002; // 겹: 번갈아 앞뒤, 위로 갈수록 앞
    K.scan([0, by - .1, -.05], [.62, by + L + .05, .05], (x, y, z) => { const px = x - .02, py = y - by, s = px * dx + py * dy, n = px * dy - py * dx; if (s < 0 || s > L) return null; const k = s / L, half = w * Math.sin(min(1, k * 1.25 + .08) * PI) ** .6 * (1 - k * .35); if (n < -half * .55 || n > half) return null; // 칼등 쪽은 좁게, 바깥 쪽은 넓게(비대칭 깃)
      const th = .028 * (1 - k * .6), zc = zo + n * .08; if (abs(z - zc) > th) return null;
      if (n > half - .016 || s > L - .02) return k > .7 ? 0xf2fbff : 0xcdeeff; // 판 가장자리 벼림
      if (abs(n) < .009 && k < .85) return C.SEAM; // 깃대(가운데 선)
      return k < .22 ? C.HIDE : k < .4 ? 0x3e5878 : k < .62 ? 0x6fa8cc : k < .82 ? C.XT[i % 5] : 0xe6f6ff; }); // 뿌리 어둡게 → 끝 밝게
  }
  // 밑동: 깃 뿌리를 묶은 둥근 금속 깃, 손잡이
  S.band(.02, .08, -.06, .12, .06); S.band(.95, .05, -.05, .05, .045);
  K.scan([-.05, -.46, -.05], [.05, -.02, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .03 + x * 25) % 2 ? M.LEATH : M.LEATH2) : null)); K.ell([0, -.49, 0], [.055, .04, .055], M.DARK);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_plume: { n: "결정깃대검", f: plume } });
/** G. 익완대검 상위형(design-bible · crystalwing-spec C 기준)
 *  칼등 = 익완골(관절 마디 둘), 칼날 = 익막결정판 6장이 지붕처럼 겹쳐 날 쪽으로 계단, 판마다 금속 소켓이 뼈에 물림,
 *  칼끝 = 손목갈고리, 밑동 = 프리즘추 코어(모으기 발광 자리), 가드 = 어깨 관절 + 금속 깃, 손잡이 = 청회가죽 + 뼈 폼멜 */
function wingBible() {
  const K = kit(), S = smith(K), BONE = 0x8a8496, BONE2 = 0x6e6a7c, BONE3 = 0xa8a2b4;
  const spine = (y) => -.17 + Math.sin(min(1, y / 1.7) * PI * .5) * .03; // 뼈대가 칼끝 쪽으로 살짝 휨
  const W = (y) => .43 * (1 - max(0, (y - .1) / 1.62) ** 1.7) + .03;     // 칼날 폭 외곽
  // 익막결정판: 밑동 판일수록 위(앞)에 얹혀 지붕처럼 겹친다. 판 끝은 칼끝 쪽으로 뾰족, 날 쪽이 계단
  const N = 6, y0s = Array.from({ length: N }, (_, k) => .1 + k * .245), H = .44;
  for (let k = 0; k < N; k++) { const y0 = y0s[k], y1 = min(1.66, y0 + H), zo = (N - k) * .007, tint = [[0x8ccbe8, 0x9ad6f0], [0x9ad6f0, 0xa8e4fa], [0xa8e4fa, 0xb8dcff], [0xb8dcff, 0xc8dcff], [0xc8dcff, 0xd0d4ff], [0xd0d4ff, 0xdcd0ff]][k];
    const xe = (y) => { const t = (y - y0) / (y1 - y0), w = W(y) * (.72 + .28 * min(1, t / .8)); return t > .82 ? spine(y) + .05 + w * (1 - (t - .82) / .18 * .55) : spine(y) + .05 + w; };
    K.scan([-.2, y0, -.06], [.5, y1, .06], (x, y, z) => { const s0 = spine(y) + .03, e = xe(y); if (x < s0 || x > e) return null; const t = (y - y0) / (y1 - y0), u = (x - s0) / max(.001, e - s0), de = e - x;
      const th = .03 * (.5 + .5 * Math.sin(min(1, u * 1.1 + .1) * PI) ** .6) * (de < .045 ? .3 + de / .045 * .7 : 1) * (t < .06 ? .6 + t / .06 * .4 : 1); if (abs(z - zo) > th) return null;
      if (t < .035 || de < .007) return 0x24364e; // 판 테두리 납선
      if (de < .035) return de < .014 ? 0xf2fbff : 0xd6f0ff; // 연마한 날
      return abs(z - zo) > th - .009 ? tint[(t > .5) | 0] : 0x6fa8cc; }); // 판 안: 아래→위로 밝아짐
    // 금속 소켓: 뼈 뒤에서 감아 판 뿌리를 집는 휜 집게 + 리벳
    const ys = y0 + .07, sx = spine(ys); for (let i = 0; i <= 6; i++) { const a = -PI * .55 + i / 6 * PI * 1.05, r = .085; K.ell([sx + Math.cos(a) * r * .8, ys + Math.sin(a) * .025, Math.sin(a) * r * .6], [.022, .02, .022], i === 6 ? M.HI : M.STEEL); } S.rivet(sx + .07, ys, zo + .028);
  }
  // 익완골 칼등: 치밀한 긴 뼈, 관절 마디 둘은 깎지 않고 남김. 뒤쪽 면은 결(홈)
  K.scan([-.3, .02, -.09], [0, 1.7, .09], (x, y, z) => { const c = spine(y), r = .066 * (1 - y / 1.7 * .4) * (y > 1.58 ? max(0, 1 - (y - 1.58) / .14) : 1); if (hypot((x - c) / 1.15, z) > r) return null; return x < c - r * .55 ? (floor(y * 70) % 5 === 0 ? BONE2 : BONE3) : BONE; });
  for (const y of [.62, 1.16]) { K.ell([spine(y) - .01, y, 0], [.088, .07, .08], BONE); K.ell([spine(y) - .05, y + .01, 0], [.05, .03, .06], BONE2); }
  // 손목갈고리: 칼끝에서 날 쪽 앞으로 휘어 걸리는 결정 발톱
  { let p = [spine(1.6), 1.6, 0], a = .15; for (let i = 0; i < 7; i++) { const n = [p[0] + Math.sin(a) * .055, p[1] + Math.cos(a) * .055, 0]; K.cap(p, n, .05 - i * .006, .046 - i * .006, i < 2 ? BONE : 0xc8ecff); p = n; a += .32; } }
  // 프리즘추 코어: 밑동, 금속 고리 틀에 박힌 렌즈 덩어리(모으기 단계마다 밝아질 자리)
  const cx = spine(.2) + .14, cy = .2; for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; K.ell([cx + Math.cos(a) * .07, cy + Math.sin(a) * .07, .05], [.018, .018, .02], M.STEEL); }
  K.ell([cx, cy, .05], [.055, .055, .035], 0xe6f6ff); for (const [dx, dy] of [[.03, .03], [-.03, .02], [0, -.035]]) K.spike([cx, cy, .05], [cx + dx, cy + dy, .1], .025, 0);
  // 가드: 날개 어깨 관절 뼈 + 초승달 금속 깃
  K.ell([spine(.04) + .02, .04, 0], [.12, .085, .1], BONE); K.ell([spine(.04) - .04, .02, 0], [.06, .05, .07], BONE2);
  K.scan([-.3, -.06, -.09], [.26, .12, .09], (x, y, z) => { const u = abs(x + .02) / .24; if (u > 1) return null; const top = .085 - u * u * .08, bot = -.04 + u * u * .06; if (y > top || y < bot || abs(z) > .07 * (1 - u * .6)) return null; return y > top - .018 ? M.HI : M.STEEL; });
  // 손잡이: 청회가죽 감개, 뼈 폼멜
  K.scan([-.05, -.46, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .028 + x * 22) % 2 ? C.HIDE : C.HIDE2) : null));
  K.ell([0, -.49, 0], [.06, .05, .06], BONE); K.ell([0, -.53, 0], [.035, .025, .035], BONE2);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_bible: { n: "익완대검 · 상위형", f: wingBible } });
/** H. 꼬리마디대검(바이블판): 꼬리뼈마디를 금속 축에 꿰어 칼 심으로, 마디마다 소켓에 등결정가시 밑동을 박아 톱날. 칼끝 = 프리즘추 */
function tailBible() {
  const K = kit(), S = smith(K), BONE = 0x8a8496, BONE2 = 0x6e6a7c, BONE3 = 0xa8a2b4, N = 7, y0 = .1, y1 = 1.5, sl = (y1 - y0) / N;
  const cx = (y) => -.04 - Math.sin((y - y0) / (y1 - y0) * PI) * .035, sc = (y) => 1 - (y - y0) / (y1 - y0) * .4;
  // 금속 축: 마디를 꿰는 심(마디 사이로 살짝 드러남)
  K.cap([cx(y0), y0 - .02, 0], [cx(y1), y1 + .04, 0], .022, .016, M.DARK);
  for (let i = 0; i < N; i++) { const a = y0 + i * sl, m = a + sl / 2, s = sc(m);
    // 꼬리뼈마디: 가운데가 둥글게 부푼 짧고 굵은 마디. 뒤쪽은 결
    K.scan([-.25, a, -.1], [.15, a + sl, .1], (x, y, z) => { const t = (y - a) / sl; if (t < .06 || t > .94) return null; const r = (.085 + Math.sin(t * PI) * .025) * s, d = hypot((x - cx(y)) / 1.25, z / .95); if (d > r) return null; return x < cx(y) - r * .7 ? (floor(y * 80) % 4 === 0 ? BONE2 : BONE3) : t < .18 || t > .82 ? BONE2 : BONE; });
    // 소켓: 마디 앞쪽(날 쪽)에 가시 밑동을 무는 금속 받침 + 리벳 둘
    const sx = cx(m) + .09 * s; K.ell([sx, m, 0], [.035 * s, .055, .045], M.STEEL); K.ell([sx + .01, m + .045, 0], [.03 * s, .012, .04], M.HI); S.rivet(sx, m - .03, .045); S.rivet(sx, m - .03, -.045);
    // 등결정가시: 밑동이 넓은 쐐기, 칼끝 쪽으로 누움. 크기가 물결친다. 사이에 작은 가시
    const big = (.2 + Math.sin(i * .9 + .5) * .05) * s; K.spike([sx + .02, m - .02, 0], [sx + .02 + big, m + big * .75, 0], .065 * s, i); K.spike([sx + .01, a + sl * .95, 0], [sx + .01 + big * .5, a + sl * .95 + big * .4, 0], .035 * s, i + 2); }
  // 칼끝: 금속 관에 박은 프리즘추
  const tp = [cx(y1), y1 + .06, 0]; S.band(y1 - .01, .07, cx(y1) - .05, cx(y1) + .05, .045); for (const [dx, dy, dz, L] of [[0, 1, 0, .3], [.5, .8, .2, .2], [-.4, .85, -.2, .2], [.7, .45, -.15, .16], [-.6, .5, .15, .15]]) K.spike(tp, [tp[0] + dx * L, tp[1] + dy * L, tp[2] + dz * L], .06, floor((dx + 1) * 3));
  // 가드: 꼬리 밑동 마디(큰 뼈) + 초승달 금속 깃 / 손잡이
  K.ell([cx(.06), .05, 0], [.13, .08, .1], BONE); K.scan([-.28, -.06, -.09], [.26, .12, .09], (x, y, z) => { const u = abs(x + .02) / .24; if (u > 1) return null; const top = .08 - u * u * .08, bot = -.045 + u * u * .06; if (y > top || y < bot || abs(z) > .07 * (1 - u * .6)) return null; return y > top - .018 ? M.HI : M.STEEL; });
  K.scan([-.05, -.46, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .028 + x * 22) % 2 ? C.HIDE : C.HIDE2) : null)); K.ell([0, -.49, 0], [.06, .05, .06], BONE);
  return K.V;
}
/** I. 부채볏대검(바이블판): 볏결정을 결 방향으로 쪼갠 쐐기 판을 익완골 칼등에 부채처럼 엇갈려 박고, 판 사이를 금속 꺾쇠로 잇는다. 판마다 방사형 결 */
function crestBible() {
  const K = kit(), S = smith(K), BONE = 0x8a8496, BONE2 = 0x6e6a7c, sp = -.16;
  // 익완골 칼등(곧게), 끝으로 가늘어짐
  K.scan([-.3, .02, -.08], [0, 1.72, .08], (x, y, z) => { const r = .06 * (1 - y / 1.72 * .5) * (y > 1.6 ? max(0, 1 - (y - 1.6) / .12) : 1); return hypot((x - sp) / 1.1, z) <= r ? (x < sp - r * .5 ? BONE2 : BONE) : null; });
  // 볏결정 쐐기 판 5장: 칼등에 뿌리를 박고 바깥 위로 부채처럼. 엇갈려 앞뒤로 겹침. 판 안쪽엔 뿌리에서 퍼지는 결
  const N = 5; for (let k = 0; k < N; k++) { const ry = .14 + k * .3, ang = .62 - k * .07, len = .5 - k * .045 + (k === N - 1 ? .12 : 0), wd = .2 - k * .014, zo = (k % 2 ? .012 : -.006);
    const dx = Math.sin(ang), dy = Math.cos(ang); K.scan([sp, ry - .05, -.06], [.5, ry + len + .2, .06], (x, y, z) => { const px = x - sp - .03, py = y - ry, s = px * dx + py * dy, n = px * dy - py * dx; if (s < 0 || s > len) return null; const k2 = s / len, half = wd * (1 - k2 * .55) * (k2 > .85 ? (1 - k2) / .15 : 1); if (n < -half * .25 || n > half) return null;
      const th = .034 * (1 - k2 * .5), de = half - n; if (abs(z - zo) > th) return null; if (de < .006 || s < .015) return 0x24364e; if (de < .03) return 0xe6f6ff; // 테두리 납선 · 연마 날
      const grain = floor(Math.atan2(n, s + .05) * 30); return abs(z - zo) > th - .009 ? (grain & 1 ? 0xb8dcff : 0xa8e4fa) : 0x6fa8cc; }); // 방사형 결
    // 금속 꺾쇠: 판 뿌리를 칼등에 물림
    const by = ry + .04; K.cap([sp - .05, by, 0], [sp + .07, by + .03, 0], .022, .02, M.STEEL); S.rivet(sp + .05, by + .02, zo + .035); }
  // 가드: 볏 밑동 뼈(넓은 판 뼈) + 금속 깃 / 손잡이
  K.ell([sp + .06, .05, 0], [.15, .07, .09], BONE); K.scan([-.28, -.06, -.09], [.26, .11, .09], (x, y, z) => { const u = abs(x + .02) / .24; if (u > 1) return null; const top = .075 - u * u * .07, bot = -.045 + u * u * .06; if (y > top || y < bot || abs(z) > .07 * (1 - u * .6)) return null; return y > top - .018 ? M.HI : M.STEEL; });
  K.scan([-.05, -.46, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .028 + x * 22) % 2 ? C.HIDE : C.HIDE2) : null)); K.ell([0, -.49, 0], [.06, .05, .06], BONE);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_tailb: { n: "꼬리마디대검 · 상위형", f: tailBible }, cw_crestb: { n: "부채볏대검 · 상위형", f: crestBible } });
// ════ 바이블판 새 견본 5종 ════
const BN = { A: 0x8a8496, B: 0x6e6a7c, C: 0xa8a2b4 };
function common(K) {
  const S = smith(K);
  // 칼날 채우기: lim(y) → [안쪽 x, 바깥 x] | null, col(x,y,u,de,t) → 색. 가운데 두껍고 날 쪽으로 얇아짐
  const blade = (y0, y1, lim, col, T = .045, zo = 0) => K.scan([-.4, y0, -T - .01], [.55, y1, T + .01], (x, y, z) => { const L = lim(y); if (!L || x < L[0] || x > L[1]) return null; const u = (x - L[0]) / max(.001, L[1] - L[0]), de = L[1] - x, th = T * (.45 + .55 * Math.sin(min(1, u * 1.1 + .08) * PI) ** .6) * (de < .05 ? .28 + de / .05 * .72 : 1); if (abs(z - zo) > th) return null; return col(x, y, u, de, abs(z - zo) > th - .009); });
  const guard = (w = .24) => K.scan([-.3, -.06, -.09], [.3, .12, .09], (x, y, z) => { const u = abs(x + .02) / w; if (u > 1) return null; const top = .08 - u * u * .075, bot = -.045 + u * u * .06; if (y > top || y < bot || abs(z) > .07 * (1 - u * .6)) return null; return y > top - .018 ? M.HI : M.STEEL; });
  const grip = (pom = BN.A) => { K.scan([-.05, -.46, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .028 + x * 22) % 2 ? C.HIDE : C.HIDE2) : null)); K.ell([0, -.49, 0], [.06, .05, .06], pom); };
  const bone = (xf, y0, y1, r0, r1) => K.scan([-.4, y0, -.1], [.3, y1, .1], (x, y, z) => { const t = (y - y0) / (y1 - y0), r = r0 + (r1 - r0) * t, c = xf(y); return hypot((x - c) / 1.12, z) <= r ? (x < c - r * .55 ? (floor(y * 70) % 5 === 0 ? BN.B : BN.C) : BN.A) : null; });
  return { S, blade, guard, grip, bone };
}
/** 1. 판창대검: 가장 큰 익막결정판 한 장을 익완골 테두리 틀에 끼웠다. 날 쪽만 틀이 열려 결정 날이 드러난다 */
function paneFrame() {
  const K = kit(), { S, blade, guard, grip } = common(K), lim = (y) => (y < .08 || y > 1.66 ? null : [-.18, -.18 + .5 * (1 - ((y - .08) / 1.58) ** 2.2) + .04 * Math.sin(y * 3)]);
  const pts = []; for (let i = 0; i < 9; i++) pts.push([-.1 + hash(i, 7, 1) * .4, .2 + hash(i, 8, 2) * 1.3]); const cell = K.cells(pts);
  blade(.08, 1.68, lim, (x, y, u, de, sf) => (de < .035 ? (de < .013 ? 0xf2fbff : 0xd6f0ff) : sf ? (cell(x, y) === C.SEAM ? 0x2a3e58 : C.XT[floor(hash(floor(x * 6), floor(y * 6), 0) * 5)]) : 0x6fa8cc), .04);
  // 뼈 틀: 칼등 · 밑동 · 칼끝을 감싸는 굵은 테(날 쪽은 열림)
  const frame = (y) => lim(y); K.scan([-.3, .02, -.075], [.5, 1.74, .075], (x, y, z) => { const L = frame(y); if (!L) return null; const inBack = abs(x - L[0]) < .055, inTop = y > 1.56 && x < L[1] + .02, inBase = y < .16 && x < L[1] - .06; if (!(inBack || inTop || inBase) || abs(z) > .062) return null; return x < L[0] - .02 ? BN.B : BN.A; });
  for (const y of [.5, 1.05]) S.band(y, .06, -.25, -.1, .07); guard(); grip(); return K.V;
}
/** 2. 익지대검: 날개 손가락 뼈 셋이 칼날을 세로로 지나고, 사이에 결정막. 날 끝은 손가락 끝마다 물결 */
function fingerRibs() {
  const K = kit(), { S, blade, guard, grip, bone } = common(K), sp = -.17, ribs = [.12, .25, .36];
  const edge = (y) => { const t = (y - .08) / 1.6, base = .52 * (1 - t ** 1.8); return sp + base - Math.abs(Math.sin(t * PI * 3)) * .05; };
  blade(.08, 1.68, (y) => (y < .08 || y > 1.68 ? null : [sp, edge(y)]), (x, y, u, de, sf) => { if (de < .032) return de < .012 ? 0xf2fbff : 0xd6f0ff; for (const r of ribs) if (abs(x - (sp + r * (1 - (y - .08) / 1.6 * .6))) < .022) return 0x2a3e58; return sf ? [0x9ad6f0, 0xb8dcff, 0xc8dcff, 0xa8e4fa][floor((x - sp) / .12) % 4] : 0x6fa8cc; }, .04);
  for (const r of ribs) bone((y) => sp + r * (1 - (y - .08) / 1.6 * .6), .1, 1.5 - r, .028, .014); // 손가락 뼈(칼날 위로 도드라짐)
  bone(() => sp, .02, 1.72, .065, .03); K.ell([sp, .9, 0], [.085, .07, .08], BN.A); // 칼등 = 손목뼈, 관절
  S.band(.18, .06, sp - .08, sp + .42, .06); guard(); grip(); return K.V;
}
/** 3. 볏쐐기대검: 볏결정 한 덩이를 결 방향으로 쪼갠 두꺼운 끌 모양. 방사형 결, 칼등은 금속 띠 셋으로 감음 */
function crestWedge() {
  const K = kit(), { S, blade, guard, grip } = common(K), lim = (y) => (y < .08 || y > 1.62 ? null : [-.16, -.16 + .42 + (y > 1.3 ? -(y - 1.3) * 1.25 : 0) + (y < .3 ? -(.3 - y) * .6 : 0)]);
  blade(.08, 1.64, lim, (x, y, u, de, sf) => { if (de < .04) return de < .014 ? 0xf2fbff : 0xd6f0ff; const g = floor(Math.atan2(y - .02, x + .3) * 40); return sf ? (g % 3 === 0 ? 0x8ccbe8 : g % 3 === 1 ? 0xb8dcff : 0xa8e4fa) : 0x6fa8cc; }, .06); // 두꺼운 쐐기
  K.scan([-.26, .06, -.08], [-.08, 1.62, .08], (x, y, z) => (x < -.13 && abs(z) < .07 - (x + .26) * .1 ? BN.B : null)); // 쪼갠 면(칼등 쪽 거친 단면)
  for (const y of [.35, .8, 1.25]) S.band(y, .07, -.24, .05, .075); guard(.26); grip(); return K.V;
}
/** 4. 광낭대검(최종형 콘셉트): 칼날 가운데 홈에 광낭막 띠가 빛을 머금고, 양옆을 결정판이 감싼다. 칼등 익완골 */
function lightSac() {
  const K = kit(), { S, blade, guard, grip, bone } = common(K), sp = -.17, lim = (y) => (y < .08 || y > 1.7 ? null : [sp + .02, sp + .48 * (1 - ((y - .08) / 1.62) ** 1.6) + .03]);
  blade(.08, 1.72, lim, (x, y, u, de, sf) => { if (de < .032) return de < .012 ? 0xf2fbff : 0xd6f0ff; if (abs(u - .42) < .07 && y < 1.45) return abs(u - .42) < .045 ? 0xfff6dc : 0x3a4a66; return sf ? (floor((y + u * .4) / .16) % 2 ? 0xb8dcff : 0xa8e4fa) : 0x6fa8cc; }, .045); // 가운데 광낭막 띠
  bone(() => sp, .02, 1.74, .064, .028); for (const y of [.3, .75, 1.2]) S.band(y, .045, sp - .07, sp + .3, .055);
  const cx = sp + .2; K.ell([cx, .18, 0], [.07, .07, .055], 0xfff6dc); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; K.ell([cx + Math.cos(a) * .085, .18 + Math.sin(a) * .085, 0], [.02, .02, .05], M.STEEL); } // 코어
  guard(); grip(); return K.V;
}
/** 5. 꼬리비늘대검: 꼬리 아래 비늘판이 겹겹이 쌓여 넓은 칼날, 칼등은 꼬리뼈 마디, 칼끝은 프리즘 */
function tailScales() {
  const K = kit(), { S, blade, guard, grip } = common(K), sp = -.15, N = 8;
  for (let k = 0; k < N; k++) { const y0 = .08 + k * .18, y1 = y0 + .3, w = .44 * (1 - (k / N) ** 1.6) + .05, zo = (N - k) * .006;
    blade(y0, y1, (y) => { const t = (y - y0) / (y1 - y0); return t < 0 || t > 1 ? null : [sp, sp + w * (t < .7 ? 1 : 1 - (t - .7) / .3 * .6) * (.85 + .15 * Math.sin(t * PI))]; }, (x, y, u, de, sf) => { const t = (y - y0) / (y1 - y0); if (t < .05) return 0x24364e; if (de < .03) return de < .012 ? 0xf2fbff : 0xd6f0ff; return sf ? (t > .6 ? 0xc8dcff : 0x9ad6f0) : 0x6fa8cc; }, .036, zo); }
  for (let i = 0; i < 9; i++) { const a = .04 + i * .17; K.scan([-.3, a, -.1], [0, a + .17, .1], (x, y, z) => { const t = (y - a) / .17; if (t < .07 || t > .93) return null; const r = (.075 + Math.sin(t * PI) * .02) * (1 - i * .05); return hypot((x - sp) / 1.2, z) <= r ? (t < .2 || t > .8 ? BN.B : BN.A) : null; }); } // 꼬리뼈 마디 칼등
  const tp = [sp + .03, 1.62, 0]; S.band(1.56, .06, sp - .05, sp + .08, .045); for (const [dx, dy, L] of [[.1, 1, .26], [.55, .8, .18], [-.4, .85, .16], [.75, .4, .14]]) K.spike(tp, [tp[0] + dx * L, tp[1] + dy * L, 0], .055, floor((dx + 1) * 3));
  guard(); grip(); return K.V;
}
Object.assign(GS_CUSTOM, { n_pane: { n: "판창대검", f: paneFrame }, n_finger: { n: "익지대검", f: fingerRibs }, n_wedge: { n: "볏쐐기대검", f: crestWedge }, n_sac: { n: "광낭대검", f: lightSac }, n_tails: { n: "꼬리비늘대검", f: tailScales } });
// ════ 투익룡 대검 견본 6종: 날 = 광린(맑게 반짝임), 그 외 = 묵은 검은 비늘·갑각(흑요석빛), 보옥 = 용속성 코어 ════
const OB = { D: 0x121018, A: 0x1f1c27, B: 0x2b2736, C: 0x3c374b, H: 0x5a5470 }, KR = { D: 0x6aa8d0, A: 0xa6daf4, B: 0xcbeeff, C: 0xf0fbff }, BO = { D: 0x5a1020, A: 0x9a2236, B: 0xd8404c, C: 0xff9a84 };
function tuik(K) {
  const S = smith(K);
  // 겹비늘: 칼끝 쪽으로 기와처럼 겹친 비늘. 비늘마다 자유단(칼끝 쪽)이 도드라지고 밝게 번들거림
  const sh = (x, y, s = .075) => { const row = floor(y / s), xo = x / (s * .85) + (row & 1) * .5, ci = floor(xo), u = xo - ci, v = y / s - row, top = .92 - .4 * (2 * u - 1) ** 2, h = hash(ci, row, 3);
    if (v > top) return { b: 0, c: OB.D }; return { b: v / top * .009, c: v / top > .78 ? (h > .5 ? OB.H : OB.C) : v / top > .35 ? OB.B : OB.A }; };
  // 칼날 판: lim(y) → [칼등 x, 날 x], 두께는 가운데 두껍고 날로 얇아짐 + 겹비늘 요철. kr: 날에서 광린 폭
  const slab = (y0, y1, lim, { T = .05, kr = .06, s = .075, surf } = {}) => K.scan([-.5, y0, -T - .03], [.6, y1, T + .03], (x, y, z) => { const L = lim(y); if (!L || x < L[0] || x > L[1]) return null; const u = (x - L[0]) / max(.001, L[1] - L[0]), de = L[1] - x;
    let th = T * (.5 + .5 * Math.sin(min(1, u * 1.05 + .1) * PI) ** .5) * (de < kr ? .3 + de / kr * .7 : 1); const sc = de >= kr ? (surf ? surf(x, y, u, de) : sh(x, y, s)) : null; if (sc) th += sc.b; if (abs(z) > th) return null;
    if (de < kr) { if (de < kr * .22) return KR.C; const r = floor(y / .055 + (de / kr) * 1.3); return abs(z) > th - .01 ? (r & 1 ? KR.B : KR.A) : KR.D; } // 광린 날: 작은 비늘이 날을 따라 줄지음
    if (de < kr + .012) return OB.D; // 광린과 검은 비늘 경계
    return abs(z) > th - .012 ? sc.c : OB.D; });
  // 둥근 끝 윤곽: 폭 w0에서 칼끝 y1까지 곡선으로 모임(직각 없음)
  const round = (sp, y0, y1, w0, w1, ys = y1 - .38) => (y) => { if (y < y0 || y > y1) return null; const t = (y - y0) / (ys - y0), w = y < ys ? w0 + (w1 - w0) * t : w1 * Math.sqrt(max(0, 1 - ((y - ys) / (y1 - ys)) ** 2)); return [sp(y), sp(y) + w]; };
  // 갑각 칼등: 굵은 검은 판, 마디마다 겹친 턱
  const back = (sp, y0, y1, r0, r1, seg = .2) => K.scan([-.5, y0, -.1], [.3, y1, .1], (x, y, z) => { const t = (y - y0) / (y1 - y0), v = ((y - y0) % seg) / seg, r = (r0 + (r1 - r0) * t) * (1 + v * .18) * (y > y1 - .1 ? max(.2, (y1 - y) / .1) : 1), c = sp(y); if (hypot((x - c) / 1.2, z) > r) return null; return v > .85 ? OB.D : x < c - r * .5 ? OB.C : v > .55 ? OB.B : OB.A; });
  // 보옥: 금속 소켓에 박힌 붉은 결정 덩어리
  const orb = (c, r = .06) => { for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; K.ell([c[0] + Math.cos(a) * r * 1.3, c[1] + Math.sin(a) * r * 1.3, c[2]], [.02, .02, .03], i % 3 ? M.STEEL : M.HI); } K.ell(c, [r, r, r * .7], (x, y, z) => (hypot(x - c[0] + r * .3, y - c[1] - r * .3) < r * .35 ? BO.C : z * Math.sign(c[2] || 1) > c[2] * 0 + r * .3 ? BO.B : BO.A)); K.ell([c[0], c[1], -c[2]], [r * .8, r * .8, r * .5], BO.A); };
  // 가드: 갑각 덩어리 두 겹(검은 판이 겹친 둥근 턱)
  const guard = (w = .26) => { K.ell([0, .05, 0], [w, .075, .085], (x, y, z) => (y > .09 ? OB.C : abs(x) > w * .75 ? OB.D : OB.B)); K.ell([-.04, .0, 0], [w * .7, .05, .07], OB.A); };
  // 손잡이: 검은 비늘 가죽 감개 + 금속 띠, 폼멜은 묵은 비늘 덩어리
  const grip = (pom = true) => { K.scan([-.05, -.46, -.05], [.05, -.02, .05], (x, y, z) => (hypot(x, z) <= .046 ? (floor((y + 2) / .03 + x * 20) % 2 ? OB.B : OB.A) : null)); S.band(-.08, .04, -.05, .05, .05); if (pom) { K.ell([0, -.5, 0], [.065, .055, .065], OB.B); K.ell([0, -.53, 0], [.04, .03, .04], OB.C); } };
  const claw = (p, a, n, r0, da = .3, len = .055, k = .006, z = 0) => { for (let i = 0; i < n; i++) { const q = [p[0] + Math.sin(a) * len, p[1] + Math.cos(a) * len, z]; K.cap(p, q, max(.006, r0 - i * k), max(.004, r0 - (i + 1) * k), i > n - 3 ? OB.H : i > n - 5 ? OB.C : OB.B); p = q; a += da; } return p; };
  return { S, sh, slab, round, back, orb, guard, grip, claw };
}
/** 1. 겹비늘대검(기본형): 갑각 판 위에 검은 비늘을 칼끝 쪽으로 기와처럼 겹치고, 날에만 광린을 한 줄로 */
function tkScale() {
  const K = kit(), { S, slab, round, back, guard, grip } = tuik(K), sp = (y) => -.2 + sin(y / 1.8 * PI) * .02;
  slab(.08, 1.76, round(sp, .08, 1.76, .5, .4), { T: .055, kr: .07 });
  back(sp, .04, 1.62, .06, .035); for (const y of [.18, .3]) S.band(y, .045, -.27, .3, .06); guard(); grip(); return K.V;
}
/** 2. 날개창대검: 돌진 때 모인 날개. 날개 뼈 셋이 칼끝 한 점으로 모이고 그 사이를 광린이 채운다. 밑동은 두꺼운 갑각 */
function tkSpear() {
  const K = kit(), { S, back, guard, grip, claw } = tuik(K), tip = [.06, 1.82], roots = [[-.2, .12], [.04, .1], [.28, .14]];
  const bx = (i, y) => { const [x0, y0] = roots[i], t = max(0, (y - y0) / (tip[1] - y0)); return x0 + (tip[0] - x0) * t ** .8 + sin(t * PI) * (i - 1) * .06; };
  // 뼈 사이 광린 막(두꺼운 비늘판, 뼈 쪽 검게 물듦)
  K.scan([-.3, .1, -.04], [.4, 1.82, .04], (x, y, z) => { const a = bx(0, y), b = bx(2, y); if (x < a || x > b) return null; const m = bx(1, y), d = min(abs(x - a), abs(x - b), abs(x - m)), th = .022 + d * .12; if (abs(z) > th) return null; if (d < .03) return OB.B; const r = floor(y / .07 + d * 8); return abs(z) > th - .008 ? (d > .08 ? KR.C : r & 1 ? KR.B : KR.A) : KR.D; });
  for (let i = 0; i < 3; i++) K.scan([-.4, .05, -.08], [.5, 1.84, .08], (x, y, z) => { const c = bx(i, y), t = (y - roots[i][1]) / (tip[1] - roots[i][1]); if (t < 0 || t > 1) return null; const r = .05 * (1 - t * .75); if (hypot((x - c) / 1.1, z) > r) return null; return floor(y / .2) !== floor((y - .015) / .2) ? OB.D : x < c - r * .4 ? OB.C : OB.A; });
  // 밑동 갑각: 날개 뿌리를 감싸는 두꺼운 검은 판 세 겹 → 대검의 무게
  for (let k = 0; k < 3; k++) K.ell([.04, .2 + k * .11, 0], [.36 - k * .07, .09, .085 - k * .012], (x, y, z) => (y > .24 + k * .11 ? OB.C : abs(z) > .05 ? OB.B : OB.A));
  claw([tip[0], tip[1] - .04, 0], .1, 4, .03, .05, .04, .006); S.band(.04, .04, -.25, .3, .07); guard(.3); grip(); return K.V;
}
/** 3. 응광대검(빔형): 칼날 가운데 렌즈 홈. 양쪽 날개판이 안쪽으로 오므라들고, 밑동 보옥에서 칼끝까지 빛이 흐른다 */
function tkLens() {
  const K = kit(), { S, slab, round, back, orb, guard, grip } = tuik(K), sp = (y) => -.22, L = round(sp, .08, 1.76, .52, .44), mid = (y) => { const l = L(y); return l ? l[0] + (l[1] - l[0]) * .42 : 0; };
  slab(.08, 1.76, L, { T: .058, kr: .07, surf: (x, y, u, de) => { const m = abs(x - mid(y)); if (y > .26 && y < 1.6 && m < .05) return { b: -.04 + m * .4, c: m < .022 ? (floor(y * 14 + el0) % 3 ? BO.B : BO.C) : KR.B }; return tuikSh(x, y); } });
  back(sp, .04, 1.62, .07, .04); // 갑각 칼등(홈이 갈라 놓은 판을 받침)
  for (const y of [.55, 1.0, 1.4]) K.scan([-.4, y - .025, -.07], [.4, y + .025, .07], (x, yy, z) => { const l = L(yy); if (!l || abs(x - mid(yy)) > .07 || abs(z) > .06) return null; return abs(z) > .045 ? OB.C : null; }); // 홈 가로대(판을 잇는 검은 비늘 턱)
  orb([mid(.18), .18, .055], .065); S.band(.06, .04, -.29, .32, .07); guard(.3); grip(); return K.V;
}
let el0 = 0, tuikSh = null;
/** 4. 꼬리추대검(둔기형): 칼끝 쪽이 꼬리 끝 비늘 덩어리처럼 두툼하게 뭉쳐 무게가 앞으로 쏠림. 날은 짧은 구간만 광린 */
function tkClub() {
  const K = kit(), { S, slab, back, guard, grip } = tuik(K), sp = (y) => -.18;
  const lim = (y) => { if (y < .08 || y > 1.78) return null; const t = (y - .08) / 1.7, w = .36 + .22 * Math.sin(min(1, t * 1.15) * PI * .5) ** 2 - (t > .86 ? .58 * (1 - Math.sqrt(max(0, 1 - ((t - .86) / .14) ** 2))) : 0); return [sp(y), sp(y) + w]; };
  slab(.08, 1.78, lim, { T: .05, kr: .065, s: .09, surf: (x, y, u, de) => { const r = tuikSh(x, y, .09); if (y > 1.05) r.b += (y - 1.05) * .05 * (1 - u * .4); if (y > .95 && de < .07) return { b: r.b + .01, c: OB.C }; return r; } }); // 칼끝 쪽 비늘이 굵게 부풀어 둔한 면
  for (let i = 0; i < 9; i++) { const y = 1.12 + i * .07, x = sp(y) + .08 + hash(i, 2, 1) * .3; K.ell([x, y, (i & 1 ? 1 : -1) * .05], [.08, .06, .045], (xx, yy) => (yy > y + .03 ? OB.H : OB.B)); } // 뭉친 비늘 덩어리
  back(sp, .04, 1.7, .065, .07, .16); S.band(.2, .05, -.25, .26, .065); guard(); grip(); return K.V;
}
/** 5. 발톱대검: 칼끝에 손목 발톱 갈고리, 칼등에 뒷발 발톱 셋이 뒤로 누움. 손잡이는 꼬리를 깎은 굵은 자루 */
function tkClaw() {
  const K = kit(), { S, slab, round, back, guard, claw } = tuik(K), sp = (y) => -.2 + sin(y / 1.7 * PI) * .03;
  slab(.08, 1.66, round(sp, .08, 1.66, .48, .38, 1.4), { T: .052, kr: .07 });
  back(sp, .04, 1.6, .06, .04);
  claw([sp(1.58), 1.58, 0], .15, 8, .055, .3, .055, .006); // 손목 발톱: 앞(날 쪽)으로 휘어 걸림
  for (const y of [.55, .9, 1.22]) claw([sp(y) - .04, y, 0], -2.3, 5, .04, -.22, .045, .007); // 뒷발 발톱: 칼등에서 손잡이 쪽으로 누움
  // 꼬리 자루: 마디진 굵은 검은 자루, 끝은 꼬리 끝 비늘 덩어리
  for (let i = 0; i < 6; i++) { const a = -.46 + i * .075; K.scan([-.07, a, -.07], [.07, a + .075, .07], (x, y, z) => { const t = (y - a) / .075, r = .05 + sin(t * PI) * .008; return hypot(x, z) <= r ? (t < .15 ? OB.D : floor((y + 2) / .025 + x * 20) % 2 ? OB.B : OB.A) : null; }); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; K.ell([Math.cos(a) * .035, -.53, Math.sin(a) * .035], [.045, .05, .045], i & 1 ? OB.C : OB.B); } K.ell([0, -.58, 0], [.04, .035, .04], OB.H);
  guard(); return K.V;
}
/** 6. 탈피대검: 맑은 광린 칼날 위를 검은 묵은 비늘 껍질이 덮고, 깨져 나간 틈으로 속비늘이 드러난다. 밑동에 보옥 */
function tkMolt() {
  const K = kit(), { S, slab, round, back, orb, guard, grip } = tuik(K), sp = (y) => -.2;
  const crack = (x, y) => { const n = sin(x * 9 + sin(y * 5) * 2) + sin(y * 6.5 + x * 3) * .9 + sin(y * 13 - x * 7) * .35; return n - (y - .9) * 1.1; }; // >0 껍질 남음, 칼끝 쪽일수록 많이 벗겨짐
  slab(.08, 1.76, round(sp, .08, 1.76, .5, .42), { T: .05, kr: .07, surf: (x, y, u, de) => { const c = crack(x, y); if (c > .18) { const r = tuikSh(x, y); r.b += .012; return r; } if (c > .0) return { b: .012 * c / .18, c: c > .12 ? OB.H : KR.C }; const r = floor(y / .06 + u * 2); return { b: -.004, c: r % 3 ? KR.B : KR.A }; } });
  back(sp, .04, 1.62, .06, .035); orb([sp(.2) + .16, .2, .055], .06); S.band(.08, .04, -.27, .3, .065); guard(); grip(); return K.V;
}
{ const K0 = kit(); tuikSh = tuik(K0).sh; }
Object.assign(GS_CUSTOM, { tk_scale: { n: "겹비늘대검", f: tkScale }, tk_spear: { n: "날개창대검", f: tkSpear }, tk_lens: { n: "응광대검", f: tkLens }, tk_club: { n: "꼬리추대검", f: tkClub }, tk_claw: { n: "발톱대검", f: tkClaw }, tk_molt: { n: "탈피대검", f: tkMolt } });
// ════ 투익룡 대검 2차: 틀에 박힌 판 칼날 대신 흑요석 파편(마름모 단면, 끝이 뾰족)을 쌓아 실루엣을 만든다 ════
function shards(K) {
  const T0 = tuik(K);
  // 파편: p 뿌리, a 방향(0=+y, +면 날 쪽으로 기움), L 길이, W 폭, T 두께, bend 휨, al/ar 좌우 폭 비율, kr 광린 날 폭, edge "l"|"r"|"b"|"n"
  const shard = ({ p, a = 0, L, W, T = .04, bend = 0, al = 1, ar = 1, z = 0, kr = .045, edge = "r", peak = .3, clear = false }) => { const R = L + W + .05, sa = sin(a), ca = cos(a);
    K.scan([p[0] - R, p[1] - R, z - T - .02], [p[0] + R, p[1] + R, z + T + .02], (x, y, zz) => { const dx = x - p[0], dy = y - p[1], s = dx * sa + dy * ca; let n = dx * ca - dy * sa; const t = s / L; if (t < 0 || t > 1) return null; n -= bend * L * t * t;
      const f = t < peak ? .55 + .45 * t / peak : ((1 - t) / (1 - peak)) ** .75, wl = W * al * f, wr = W * ar * f, ws = n < 0 ? wl : wr; if (ws <= .002 || abs(n) > ws) return null;
      const e = ws - abs(n), th = T * (.25 + .75 * (e / ws) ** .6) * (t > .85 ? .4 + (1 - t) / .15 * .6 : 1); if (abs(zz - z) > th) return null;
      const side = n < 0 ? "l" : "r", isKr = clear || edge === "b" || edge === side;
      if (isKr && (clear || e < kr)) { if (e < .012) return KR.C; return abs(zz - z) > th - .01 ? (floor(s / .05 + e * 20) & 1 ? KR.B : KR.A) : KR.D; }
      if (abs(zz - z) < th - .012) return OB.D; if (abs(n) < ws * .1) return OB.H; // 등줄(능선)이 번들거림
      const fc = floor(s * 9 + abs(n) * 14 + hash(floor(s * 9), 1, 2) * 2); return fc % 4 === 0 ? OB.C : fc % 4 === 1 ? OB.A : OB.B; }); };
  return { ...T0, shard };
}
/** 1'. 겹비늘대검: 큰 검은 비늘 파편 일곱 장이 칼끝 쪽으로 누워 겹친다. 파편 끝이 날 밖으로 튀어나와 톱날 실루엣, 끝마다 광린 */
function tk2Scale() {
  const K = kit(), { shard, guard, grip, S } = shards(K);
  shard({ p: [-.1, .05], a: .06, L: 1.85, W: .16, T: .06, edge: "n", bend: -.04 }); // 심(갑각 등줄)
  for (let k = 0; k < 7; k++) { const y = .1 + k * .22, w = .26 - k * .018; shard({ p: [-.14, y], a: .62 - k * .03, L: .5 - k * .02, W: w * .5, T: .045, z: (7 - k) * .006, ar: 1.2, al: .5, edge: "r", kr: .06, peak: .25 }); }
  shard({ p: [-.06, 1.5], a: .18, L: .45, W: .1, T: .05, edge: "b", kr: .05 }); // 칼끝 파편
  S.band(.1, .05, -.28, .2, .07); guard(.3); grip(); return K.V;
}
/** 2'. 날개창대검: 모은 날개 세 장이 엇갈려 길이가 다른 세 갈래 끝을 만든다. 뿌리에는 뒤로 꺾인 갑각 미늘 */
function tk2Spear() {
  const K = kit(), { shard, guard, grip, S } = shards(K);
  shard({ p: [-.24, .06], a: .16, L: 1.55, W: .17, T: .05, bend: -.06, edge: "r", kr: .08, al: .6 });
  shard({ p: [.24, .06], a: -.12, L: 1.45, W: .17, T: .05, bend: .07, edge: "l", kr: .08, ar: .6, z: .01 });
  shard({ p: [0, .02], a: 0, L: 1.9, W: .19, T: .065, edge: "b", kr: .07, z: -.008, peak: .2 });
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) shard({ p: [sx * (.16 + k * .07), .3 - k * .1], a: sx * (2.4 - k * .2), L: .32 - k * .06, W: .07, T: .045, edge: "n" }); // 뒤로 꺾인 미늘
  S.band(.06, .05, -.3, .3, .075); guard(.32); grip(); return K.V;
}
/** 3'. 응광대검: 날개판 두 장이 마주 보고 휘어 끝이 서로를 향해 오므라든다(빔을 모으는 자세). 사이 틈 아래 보옥 */
function tk2Lens() {
  const K = kit(), { shard, orb, guard, grip, S } = shards(K);
  shard({ p: [-.16, .06], a: -.05, L: 1.7, W: .2, T: .055, bend: .1, edge: "r", kr: .07, al: 1.2, ar: .7 }); // 왼판: 안쪽(오른) 날이 광린
  shard({ p: [.16, .06], a: .05, L: 1.6, W: .2, T: .055, bend: -.1, edge: "l", kr: .07, al: .7, ar: 1.2, z: .004 });
  for (const y of [.5, .95]) K.scan([-.25, y - .03, -.05], [.25, y + .03, .05], (x, yy, z) => (abs(x) < .2 && abs(z) < .04 ? (abs(x) < .03 ? BO.B : OB.B) : null)); // 판을 잇는 검은 비늘 가로대(가운데로 빛)
  K.scan([-.05, .25, -.02], [.05, 1.5, .02], (x, y, z) => (abs(x) < .012 * (1.4 - y / 1.5) ? (floor(y * 12) % 3 ? BO.B : BO.C) : null)); // 틈을 흐르는 빛
  orb([0, .16, .04], .07); S.band(.04, .05, -.3, .3, .075); guard(.32); grip(); return K.V;
}
/** 4'. 꼬리추대검: 가는 목에서 칼끝 쪽 비늘 덩어리가 방사형 파편으로 터져 나온 머리. 무게가 앞에 쏠림 */
function tk2Club() {
  const K = kit(), { shard, guard, grip, S } = shards(K);
  shard({ p: [-.04, .04], a: .03, L: 1.2, W: .14, T: .06, edge: "r", kr: .05, peak: .7 }); // 목: 날 쪽 광린 짧게
  K.ell([.02, 1.3, 0], [.2, .24, .1], (x, y, z) => (abs(z) > .07 ? OB.C : OB.B)); // 뭉친 비늘 덩어리 심
  for (let k = 0; k < 9; k++) { const a = -1.5 + k * .37, sh = .3 + hash(k, 4, 1) * .15; shard({ p: [.02 + sin(a) * .1, 1.3 + cos(a) * .12], a, L: sh, W: .08, T: .05, edge: k % 3 === 1 ? "b" : "n", kr: .03, z: (k & 1) * .03 - .015 }); }
  S.band(1.0, .06, -.15, .2, .07); S.band(.1, .05, -.25, .25, .07); guard(.28); grip(); return K.V;
}
/** 5'. 발톱대검: 칼날 전체가 하나의 거대한 손목 발톱처럼 앞으로 휜 낫 모양. 칼등엔 뒷발 발톱이 뒤로 누움, 자루는 꼬리 */
function tk2Claw() {
  const K = kit(), { shard, guard, S } = shards(K);
  shard({ p: [-.08, .04], a: -.05, L: 1.85, W: .26, T: .06, bend: .32, edge: "r", kr: .075, al: .55, peak: .25 }); // 휜 발톱 칼날
  for (const [y, x] of [[.45, -.2], [.85, -.12], [1.2, .02]]) shard({ p: [x, y], a: -2.5, L: .3, W: .06, T: .045, bend: -.15, edge: "n" });
  for (let i = 0; i < 6; i++) { const a = -.46 + i * .075; K.scan([-.07, a, -.07], [.07, a + .075, .07], (x, y, z) => { const t = (y - a) / .075, r = .05 + sin(t * PI) * .009; return hypot(x, z) <= r ? (t < .15 ? OB.D : OB.B) : null; }); }
  for (let k = 0; k < 4; k++) shard({ p: [0, -.48], a: PI + (k - 1.5) * .45, L: .16, W: .05, T: .04, edge: "n" }); // 꼬리 끝 폼멜(뒤로 뻗친 비늘)
  S.band(.04, .05, -.3, .3, .075); guard(.3); return K.V;
}
/** 6'. 탈피대검: 맑은 광린 칼날(통째로 반짝)을 검은 껍질 파편이 비스듬히 감싸다 깨져 들려 있다. 들린 파편 끝이 밖으로 뾰족 */
function tk2Molt() {
  const K = kit(), { shard, orb, guard, grip, S } = shards(K);
  shard({ p: [0, .04], a: .04, L: 1.85, W: .24, T: .05, clear: true, peak: .35, al: .8 }); // 속: 광린 칼날
  for (let k = 0; k < 6; k++) { const y = .12 + k * .23, side = k & 1 ? 1 : -1; shard({ p: [side * .14, y], a: side * (.5 + k * .04), L: .42 - k * .03, W: .09, T: .035, z: .05 * side * 0 + .045, edge: "n", peak: .2 }); shard({ p: [side * .12, y + .08], a: side * (.6 + k * .04), L: .3, W: .07, T: .035, z: -.045, edge: "n" }); } // 들린 껍질 파편(양면)
  orb([0, .2, .06], .06); S.band(.06, .05, -.28, .28, .07); guard(.3); grip(); return K.V;
}
Object.assign(GS_CUSTOM, { tk2_scale: { n: "겹비늘대검", f: tk2Scale }, tk2_spear: { n: "날개창대검", f: tk2Spear }, tk2_lens: { n: "응광대검", f: tk2Lens }, tk2_club: { n: "꼬리추대검", f: tk2Club }, tk2_claw: { n: "발톱대검", f: tk2Claw }, tk2_molt: { n: "탈피대검", f: tk2Molt } });
/** 1''. 겹비늘대검 다듬기: 날은 1'과 같게, 광린 날을 넓고 길게 이어 보이게(발톱대검처럼). 가드는 비늘 파편 초승달, 앞뒤 칼면 쪽에 비늘이 떠 있음 */
function tk3Scale() {
  const K = kit(), { shard, grip, S } = shards(K);
  shard({ p: [.02, .06], a: .1, L: 1.72, W: .13, T: .04, al: .25, clear: true, peak: .3, z: -.004 }); // 날을 따라 이어진 광린 띠(비늘 밑에서 드러남)
  shard({ p: [-.1, .05], a: .06, L: 1.85, W: .16, T: .06, edge: "n", bend: -.04 });
  for (let k = 0; k < 7; k++) { const y = .1 + k * .22, w = .26 - k * .018; shard({ p: [-.14, y], a: .62 - k * .03, L: .5 - k * .02, W: w * .5, T: .045, z: (7 - k) * .006, ar: 1.2, al: .5, edge: "r", kr: .1, peak: .25 }); }
  shard({ p: [-.06, 1.5], a: .18, L: .45, W: .1, T: .05, edge: "b", kr: .06 });
  // 가드: 칼 밑동에서 좌우 아래로 휘어 뻗은 비늘 파편 초승달(겹쳐 쌓임) + 가운데 갑각 덩어리
  K.ell([0, .03, 0], [.11, .08, .075], (x, y, z) => (y > .07 ? OB.C : OB.B));
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) shard({ p: [sx * (.05 + k * .05), .08 - k * .035], a: sx * (1.25 + k * .3), L: .4 - k * .07, W: .07, T: .055 - k * .008, z: (k & 1 ? .012 : -.012), edge: k === 0 ? "n" : sx > 0 ? "l" : "r", kr: .025, bend: -sx * .25 });
  // 떠 있는 비늘: 가드 앞뒤(칼면 쪽)에 닿지 않고 뜬 광린 테 비늘 두 장씩
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) shard({ p: [sx * .09, -.04], a: sx * .7, L: .3, W: .075, T: .02, z: sz * .17, edge: "b", kr: .022, peak: .3 });
  grip(); return K.V;
}
function tk3One() {
  const K = kit(), { shard, grip, S } = shards(K);
  shard({ p: [.02, .06], a: .03, L: 1.8, W: .13, T: .04, al: .3, clear: true, peak: .3, z: -.004, bend: -.025 }); // 날을 따라 이어진 광린 띠(비늘 밑에서 드러남)
  shard({ p: [-.1, .05], a: .06, L: 1.85, W: .16, T: .06, edge: "n", bend: -.04 });
  for (let k = 0; k < 7; k++) { const y = .1 + k * .22, w = .26 - k * .018; shard({ p: [-.14, y], a: .62 - k * .03, L: .5 - k * .02, W: w * .5, T: .045, z: (7 - k) * .006, ar: 1.2, al: .5, edge: "r", kr: .1, peak: .25 }); }
  shard({ p: [-.07, 1.38], a: .1, L: .68, W: .1, T: .05, edge: "b", kr: .075, peak: .15 });
  // 가드: 칼 밑동에서 좌우 아래로 휘어 뻗은 비늘 파편 초승달(겹쳐 쌓임) + 가운데 갑각 덩어리
  K.ell([0, .03, 0], [.11, .08, .075], (x, y, z) => (y > .07 ? OB.C : OB.B));
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) shard({ p: [sx * (.05 + k * .05), .08 - k * .035], a: sx * (1.25 + k * .3), L: .4 - k * .07, W: .07, T: .055 - k * .008, z: (k & 1 ? .012 : -.012), edge: k === 0 ? "n" : sx > 0 ? "l" : "r", kr: .025, bend: -sx * .25 });
  // 떠 있는 비늘: 가드 앞뒤(칼면 쪽)에 닿지 않고 뜬 광린 테 비늘 두 장씩
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) shard({ p: [sx * .09, -.04], a: sx * .7, L: .3, W: .075, T: .02, z: sz * .17, edge: "b", kr: .022, peak: .3 });
  grip(); return K.V;
}
function tk3Asym() {
  const K = kit(), { shard, grip, S } = shards(K);
  shard({ p: [.02, .06], a: .13, L: 1.95, W: .13, T: .04, al: .25, clear: true, peak: .3, z: -.004, bend: .03 }); // 날을 따라 이어진 광린 띠(비늘 밑에서 드러남)
  shard({ p: [-.1, .05], a: .06, L: 1.85, W: .16, T: .06, edge: "n", bend: -.04 });
  for (let k = 0; k < 7; k++) { const y = .1 + k * .22, w = .26 - k * .018; shard({ p: [-.14, y], a: .62 - k * .03, L: .5 - k * .02, W: w * .5, T: .045, z: (7 - k) * .006, ar: 1.2, al: .5, edge: "r", kr: .1, peak: .25 }); }
  shard({ p: [-.08, 1.42], a: -.05, L: .34, W: .09, T: .05, edge: "b", kr: .05 });
  // 가드: 칼 밑동에서 좌우 아래로 휘어 뻗은 비늘 파편 초승달(겹쳐 쌓임) + 가운데 갑각 덩어리
  K.ell([0, .03, 0], [.11, .08, .075], (x, y, z) => (y > .07 ? OB.C : OB.B));
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) shard({ p: [sx * (.05 + k * .05), .08 - k * .035], a: sx * (1.25 + k * .3), L: .4 - k * .07, W: .07, T: .055 - k * .008, z: (k & 1 ? .012 : -.012), edge: k === 0 ? "n" : sx > 0 ? "l" : "r", kr: .025, bend: -sx * .25 });
  // 떠 있는 비늘: 가드 앞뒤(칼면 쪽)에 닿지 않고 뜬 광린 테 비늘 두 장씩
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) shard({ p: [sx * .09, -.04], a: sx * .7, L: .3, W: .075, T: .02, z: sz * .17, edge: "b", kr: .022, peak: .3 });
  grip(); return K.V;
}
Object.assign(GS_CUSTOM, { tk3_one: { n: "겹비늘대검 · 외끝", f: tk3One }, tk3_asym: { n: "겹비늘대검 · 비대칭", f: tk3Asym } });
Object.assign(GS_CUSTOM, { tk3_scale: { n: "겹비늘대검", f: tk3Scale } });
