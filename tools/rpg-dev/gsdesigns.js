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
  K.scan([sp, .1, -T], [.3, top + .02, T], (x, y, z) => { const e = edgeAt(y); if (x < bend(y) + .04 || x > e) return null; const de = e - x, th = de < .07 ? T * (.25 + de / .07 * .75) : T; if (abs(z) > th) return null;
    if (de < .045) return de < .012 ? 0xeef9ff : 0xc8ecff; const row = floor((y - .1) / .11), xo = (row % 2) * .05, col = floor((x - sp + xo) / .1), v = (y - .1) % .11; if (v < .014) return C.SEAM; // 판 줄 경계
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
  K.scan([-.32, -.06, -.1], [.32, .16, .1], (x, y, z) => { const u = abs(x) / .3; if (u > 1) return null; const top = .12 - u * u * .1 + (1 - u) * .01, bot = -.035 + u * u * .09; if (y > top || y < bot) return null; const tk = .085 * (1 - u * .7) * (1 - abs(y - (top + bot) / 2) / ((top - bot) / 2 + .001) * .35); if (abs(z) > tk) return null; return y > top - .022 ? M.HI : u < .2 ? M.BRASS : M.STEEL; });
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
  K.scan([-.32, -.06, -.1], [.32, .16, .1], (x, y, z) => { const u = abs(x) / .3; if (u > 1) return null; const top = .12 - u * u * .1 + (1 - u) * .01, bot = -.035 + u * u * .09; if (y > top || y < bot) return null; const tk = .085 * (1 - u * .7) * (1 - abs(y - (top + bot) / 2) / ((top - bot) / 2 + .001) * .35); if (abs(z) > tk) return null; return y > top - .022 ? M.HI : u < .2 ? M.BRASS : M.STEEL; });
  for (const k of [-1, 1]) { const pts = [[k * .2, .12], [k * .28, .17], [k * .33, .1]], cell = K.cells(pts); K.scan([min(0, k * .42), -.04, -.02], [max(0, k * .42), .28, .02], (x, y) => { const u = (k * x - .16) / .24; if (u < 0 || u > 1) return null; const mid = .07 + u * .12, half = .07 * Math.sin(u * PI) ** .7 + .004; if (abs(y - mid) > half) return null; return abs(y - mid) > half - .018 || u > .95 ? M.DARK : cell(x, y); }); }
  // 손잡이
  K.scan([-.05, -.44, -.05], [.05, -.04, .05], (x, y, z) => (hypot(x, z) <= .048 ? (floor((y + 2) / .035 + x * 20) % 2 ? M.LEATH : M.LEATH2) : null)); for (const y of [-.06, -.42]) K.cap([0, y, 0], [0, y - .025, 0], .056, .056, M.STEEL); K.ell([0, -.49, 0], [.065, .05, .065], M.BRASS);
  return K.V;
}
Object.assign(GS_CUSTOM, { cw_wing2: { n: "익완대검 (2차)", f: wingArm2 }, cw_tail2: { n: "꼬리마디대검 (2차)", f: tailSeg2 } });
