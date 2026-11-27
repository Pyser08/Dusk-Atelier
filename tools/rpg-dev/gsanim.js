// 대검 동작: 키프레임 클립 + 호 궤적 + 몸 스프링(반동·여운)
// 자세 값 S = { sword: {grip,dir,edge} | null(등에 멤), hands: "both"|"R"|"none", drop, lean, twist, feet:[[x,y,z]x2], shake }
// 좌표 = 사냥꾼 칸 단위(키 45.5, 앞 +z, 오른쪽 -x)
import * as THREE from "three"; import { HU } from "./hunter.js"; import { aim, ik2 } from "./wyvernrig.js";
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), { sin, cos, max, min, PI, abs } = Math;
const clamp = (v) => max(0, min(1, v));
export const EASE = { lin: (t) => t, io: (t) => t * t * (3 - 2 * t), out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, back: (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; }, snap: (t) => 1 - (1 - t) ** 5 };
// ── 자세 사전(칼 위치) ──
const FEET0 = [[-2.6, 2.4, 0], [2.6, 2.4, 0]], FEETW = [[-3.2, 2.4, 5.5], [3.8, 2.4, -4.2]]; // 넓게: 오른발 앞, 왼발 뒤
export const POSE = {
  back: { sword: null, hands: "none", drop: 0, lean: .04, twist: 0, feet: FEET0 },
  reach: { sword: null, hands: "R", drop: .8, lean: .12, twist: -.3, feet: [[-2.8, 2.4, .8], [2.8, 2.4, -.6]] },        // 오른손을 등 뒤 손잡이로
  pull: { sword: { grip: [-3, 42, -1], dir: [.2, .4, -1], edge: [0, 1, .4] }, hands: "R", drop: 1.4, lean: -.08, twist: .3, feet: [[-3, 2.4, 2.4], [3.4, 2.4, -2.4]] }, // 어깨 위로 뽑아 올림
  // 발도: 오른팔은 앞으로 쭉 뻗어 가드 밑을, 왼팔은 굽혀 손잡이 끝을 가슴 앞에서. 칼끝은 앞으로, 오른발 앞
  drawn: { sword: { grip: [-3, 26, 15.5], dir: [-.4, .12, .9], edge: [0, -1, .13] }, hands: "both", drop: 3, lean: .25, twist: .05, feet: FEETW },
  rest: { sword: { grip: [-3.2, 25.2, 15], dir: [-.42, .04, .9], edge: [0, -1, .05] }, hands: "both", drop: 2.7, lean: .22, twist: .04, feet: FEETW }, // 숨 고르기
  // 머리 위로 들기: 몸을 뒤로 젖혀 칼을 머리 너머로 넘긴다(칼끝이 등 뒤로 늘어짐). 앞발을 내딛을 준비
  wind: { sword: { grip: [-1.2, 44.5, 1.5], dir: [.05, -.3, -1], edge: [0, 1, -.3] }, hands: "both", drop: 1.6, lean: -.38, twist: .12, feet: [[-3.2, 2.4, 3], [3.8, 2.4, -4.8]] },
  charge: { sword: { grip: [-1.4, 43.5, .5], dir: [.06, -.15, -1], edge: [0, 1, -.15] }, hands: "both", drop: 3.2, lean: -.32, twist: .18, feet: [[-3.6, 2.4, 5], [4.2, 2.4, -5.6]] },
  // 내리치는 중간: 상체를 접으며 오른발을 크게 내딛는다
  strike: { sword: { grip: [-.8, 33, 12.5], dir: [-.02, .25, 1], edge: [0, -1, .25] }, hands: "both", drop: 4.5, lean: .45, twist: 0, feet: [[-3.2, 2.4, 8.5], [3.8, 2.4, -7]] },
  // 타격: 깊은 런지, 뒷다리는 뻗고, 상체는 칼을 따라 접힌다. 칼끝이 땅에 살짝 박힌다
  impact: { sword: { grip: [-0.83, 15.31, 6.58], dir: [-.02, -.5, .86], edge: [0, -1, -.58] }, hands: "both", drop: 7.5, lean: .82, twist: -.05, feet: [[-3.2, 2.4, 10], [3.8, 2.4, -8.5]] },
  // 가드: 칼을 몸 앞에 세워 칼면이 정면을 본다(칼끝 아래, 손잡이 위)
  guard: { sword: { grip: [-.8, 30, 7.5], dir: [.12, -.98, .08], edge: [1, .12, 0] }, hands: "both", drop: 3, lean: .18, twist: 0, feet: [[-3, 2.4, 3], [3.8, 2.4, -3.6]] },
};
// ── 클립: [시간, 자세, 들어오는 곡선, 덧붙일 값] ──
export const CLIPS = {
  draw: { keys: [[0, "back"], [.16, "reach", "io"], [.42, "pull", "out"], [.62, "drawn", "back"], [.95, "drawn"]], next: "drawnIdle", n: "발도" },
  sheathe: { keys: [[0, "drawn"], [.3, "pull", "io"], [.55, "reach", "io"], [.8, "back", "out"]], next: "idle", n: "납도" },
  slash: { keys: [[0, "drawn"], [.55, "wind", "out"], [.72, "wind", "lin", { shake: .35, drop: 2.9 }], [.84, "strike", "in"], [.9, "impact", "snap"], [1.35, "impact", "lin", { drop: 4.7 }], [2.1, "drawn", "io"]], next: "drawnIdle", n: "내려베기", hit: .88 },
  chargeIn: { keys: [[0, "drawn"], [.4, "wind", "out"], [.75, "charge", "io"]], next: "chargeHold", n: "모으기" },
  chargeHold: { keys: [[0, "charge"], [1, "charge"]], loop: true, n: "모으는 중", shake: true },
  release: { keys: [[0, "charge"], [.12, "strike", "in"], [.18, "impact", "snap"], [.75, "impact", "lin", { drop: 4.8 }], [1.55, "drawn", "io"]], next: "drawnIdle", n: "모아 베기", hit: .16 },
  guardIn: { keys: [[0, "drawn"], [.14, "guard", "back"]], next: "guardHold", n: "가드" },
  guardHold: { keys: [[0, "guard"], [1, "guard"]], loop: true, n: "가드 중" },
  guardOut: { keys: [[0, "guard"], [.25, "drawn", "io"]], next: "drawnIdle", n: "가드 풀기" },
  idle: { keys: [[0, "back"], [1, "back"]], loop: true, n: "납도 대기" },
  drawnIdle: { keys: [[0, "drawn"], [1.8, "rest", "io"], [3.6, "drawn", "io"]], loop: true, n: "발도 대기" },
};

// ════ 대검 전 기술(조작표 기준). 자세 이름은 동작의 한 순간 ════
Object.assign(POSE, {
  // 베어넘기기: 오른쪽 뒤에서 왼쪽으로 몸통 전체를 돌려 쓸어 벤다
  sweepR: { sword: { grip: [-7.5, 24, 1], dir: [-.85, -.15, -.5], edge: [.5, 0, -.85] }, hands: "both", drop: 3.4, lean: .2, twist: .75, feet: [[-3.4, 2.4, 3.5], [3.8, 2.4, -4.6]] },
  sweepM: { sword: { grip: [-1, 25.5, 12], dir: [-.15, -.12, 1], edge: [1, 0, .15] }, hands: "both", drop: 4.2, lean: .35, twist: 0, feet: [[-3.2, 2.4, 6.5], [3.8, 2.4, -5.5]] },
  sweepL: { sword: { grip: [5.5, 27, 6], dir: [.92, -.05, .3], edge: [.3, 0, -.95] }, hands: "both", drop: 3.8, lean: .25, twist: -.8, feet: [[-3.2, 2.4, 7], [3.6, 2.4, -5]] },
  // 강 베어넘기기: 더 낮고 크게
  sweepR2: { sword: { grip: [-8, 22, -1], dir: [-.75, -.25, -.6], edge: [.6, 0, -.8] }, hands: "both", drop: 4.4, lean: .25, twist: .95, feet: [[-3.6, 2.4, 4], [4, 2.4, -5.5]] },
  sweepL2: { sword: { grip: [6.5, 25, 4], dir: [.95, -.1, .15], edge: [.15, 0, -1] }, hands: "both", drop: 4.8, lean: .3, twist: -1.05, feet: [[-3.4, 2.4, 8.5], [3.6, 2.4, -6]] },
  // 베어올리기: 땅을 스치며 앞에서 머리 위로 퍼 올린다(몸을 펴며 일어선다)
  upLow: { sword: { grip: [-0.83, 15.34, 2.69], dir: [-0.02, -0.423, 0.906], edge: [0, .9, .42] }, hands: "both", drop: 6.5, lean: .7, twist: 0, feet: [[-3.2, 2.4, 8], [3.8, 2.4, -6.5]] },
  upMid: { sword: { grip: [-1, 31, 13], dir: [-.02, .35, .94], edge: [0, .94, -.35] }, hands: "both", drop: 3, lean: .25, twist: 0, feet: [[-3.2, 2.4, 7], [3.8, 2.4, -5.5]] },
  upHigh: { sword: { grip: [-1, 44, 5], dir: [0, .95, .3], edge: [0, .3, -.95] }, hands: "both", drop: .6, lean: -.28, twist: .05, feet: [[-3.2, 2.4, 6], [3.8, 2.4, -4.5]] },
  // 상쇄 베어올리기 모으기: 칼을 낮게 끌어 버틴다
  offsetLow: { sword: { grip: [-3.5, 17, 4], dir: [-.3, -.55, .78], edge: [0, .8, .55] }, hands: "both", drop: 6, lean: .55, twist: .35, feet: [[-3.4, 2.4, 6], [4, 2.4, -6]] },
  // 태클: 칼면을 방패처럼 앞에 세우고 어깨로 들이받는다
  tackle: { sword: { grip: [-.8, 32, 10], dir: [.12, -.95, .2], edge: [1, .12, 0] }, hands: "both", drop: 4, lean: .45, twist: .25, feet: [[-3.2, 2.4, 8.5], [3.8, 2.4, -7]] },
  // 강모아베기: 오른 어깨에 칼을 메고 크게 비틀어 모은다 → 왼쪽 앞 땅으로 비스듬히
  charge2: { sword: { grip: [-3.2, 39, 2], dir: [-.3, .2, -1], edge: [0, 1, .2] }, hands: "both", drop: 3.8, lean: -.2, twist: .7, feet: [[-3.6, 2.4, 5], [4.2, 2.4, -5.6]] },
  strike2: { sword: { grip: [-1.5, 33, 12], dir: [.15, .25, 1], edge: [.25, -1, .1] }, hands: "both", drop: 4.8, lean: .45, twist: .1, feet: [[-3, 2.4, 8.5], [3.8, 2.4, -7]] },
  impact2: { sword: { grip: [-1.64, 15.42, 3.4], dir: [0.348, -0.497, 0.795], edge: [.4, -.85, -.35] }, hands: "both", drop: 7.5, lean: .8, twist: -.45, feet: [[-3, 2.4, 10], [3.8, 2.4, -8.5]] },
  // 참모아베기: 등 뒤까지 넘겨 몸을 활처럼 젖힌다 → 더 깊게 박힘
  charge3: { sword: { grip: [-1.4, 43, -1.5], dir: [.06, -.55, -.83], edge: [0, .83, -.55] }, hands: "both", drop: 4.6, lean: -.45, twist: .2, feet: [[-3.8, 2.4, 5.5], [4.4, 2.4, -6.5]] },
  impact3: { sword: { grip: [-0.33, 14.11, 8.38], dir: [-0.02, -0.517, 0.856], edge: [0, -1, -.6] }, hands: "both", drop: 9, lean: .95, twist: -.05, feet: [[-3.2, 2.4, 11.5], [3.8, 2.4, -9.5]] },
  // 추격 십자베기: 위 오른쪽 → 아래 왼쪽, 위 왼쪽 → 아래 오른쪽
  crossA0: { sword: { grip: [-5, 41, 7], dir: [-.45, .6, .65], edge: [.6, -.3, .7] }, hands: "both", drop: 2, lean: -.05, twist: .5, feet: [[-3.2, 2.4, 6], [3.8, 2.4, -5]] },
  crossA1: { sword: { grip: [3, 21, 11], dir: [.45, -.5, .75], edge: [-.5, -.6, .3] }, hands: "both", drop: 5.5, lean: .6, twist: -.45, feet: [[-3.2, 2.4, 8], [3.8, 2.4, -6]] },
  crossB0: { sword: { grip: [4, 41, 7], dir: [.45, .6, .65], edge: [-.6, -.3, .7] }, hands: "both", drop: 2.4, lean: -.05, twist: -.45, feet: [[-3.2, 2.4, 7], [3.8, 2.4, -5.5]] },
  crossB1: { sword: { grip: [-4, 20, 11], dir: [-.45, -.5, .75], edge: [.5, -.6, .3] }, hands: "both", drop: 6, lean: .65, twist: .5, feet: [[-3.2, 2.4, 9], [3.8, 2.4, -6.5]] },
  // 가드 킥: 가드한 채 오른발로 앞을 찬다
  kick: { sword: { grip: [-.8, 31, 6.5], dir: [.12, -.98, .08], edge: [1, .12, 0] }, hands: "both", drop: 1.5, lean: -.15, twist: 0, feet: [[-2.8, 13, 13], [3.6, 2.4, -2.5]] },
});
// 클립: [시간, 자세, 곡선, {move: 누적 전진(칸), drop 등 덧붙임}] · hits: [[시간, 세기, 땅]]
Object.assign(CLIPS, {
  vslash: { ...CLIPS.slash, n: "세로베기" },
  drawSlash: { keys: [[0, "back"], [.14, "reach", "io"], [.34, "wind", "out"], [.44, "wind", "lin"], [.54, "strike", "in", { move: 4 }], [.6, "impact", "snap", { move: 6 }], [1.05, "impact", "lin", { drop: 7.8 }], [1.8, "drawn", "io"]], next: "drawnIdle", n: "발도베기", hits: [[.58, 2, true]] },
  // 모으기 세 단계(같은 버튼을 이어서 길게): 1 모아베기 → 2 강모아베기 → 3 참모아베기
  chargeIn: { keys: [[0, "drawn"], [.4, "wind", "out"], [.7, "charge", "io"]], next: "chargeHold", n: "모으기" },
  release: { keys: [[0, "charge"], [.1, "strike", "in", { move: 4 }], [.16, "impact", "snap", { move: 7 }], [.75, "impact", "lin", { drop: 7.9 }], [1.55, "drawn", "io"]], next: "drawnIdle", n: "모아베기", hits: [[.15, 3, true]] },
  charge2In: { keys: [[0, "drawn"], [.35, "charge2", "out"]], next: "charge2Hold", n: "강모아베기 모으기" },
  charge2Hold: { keys: [[0, "charge2"], [1, "charge2"]], loop: true, n: "강모아 모으는 중", shake: true },
  release2: { keys: [[0, "charge2"], [.12, "strike2", "in", { move: 4 }], [.19, "impact2", "snap", { move: 8 }], [.85, "impact2", "lin", { drop: 7.9 }], [1.65, "drawn", "io"]], next: "drawnIdle", n: "강모아베기", hits: [[.18, 3, true]] },
  charge3In: { keys: [[0, "drawn"], [.4, "charge3", "out"]], next: "charge3Hold", n: "참모아베기 모으기" },
  charge3Hold: { keys: [[0, "charge3"], [1, "charge3"]], loop: true, n: "참모아 모으는 중", shake: true },
  // 참모아베기: 첫 타(비스듬히) → 다시 등 뒤로 넘겨 → 깊게 내리꽂는 막타
  release3: { keys: [[0, "charge3"], [.12, "strike2", "in", { move: 3 }], [.18, "impact2", "snap", { move: 6 }], [.42, "impact2", "lin"], [.78, "charge3", "io", { move: 6 }], [.9, "charge3", "lin", { shake: .5 }], [1.02, "strike", "in", { move: 10 }], [1.09, "impact3", "snap", { move: 13 }], [1.85, "impact3", "lin", { drop: 9.4 }], [2.7, "drawn", "io"]], next: "drawnIdle", n: "참모아베기", hits: [[.17, 2, true], [1.08, 4, true]] },
  release3s: { keys: [[0, "charge3"], [.12, "strike2", "in", { move: 3 }], [.18, "impact2", "snap", { move: 6 }], [.36, "impact2", "lin"], [.62, "charge3", "io", { move: 6 }], [.72, "charge3", "lin", { shake: .7 }], [.82, "strike", "in", { move: 10 }], [.88, "impact3", "snap", { move: 13 }], [1.75, "impact3", "lin", { drop: 9.6 }], [2.6, "drawn", "io"]], next: "drawnIdle", n: "참모아베기(강격)", hits: [[.17, 2, true], [.87, 4, true]] },
  // 태클: 모으는 중 → 어깨로 들이받고 다시 모으기로 돌아간다(단계 유지)
  tackleC: { keys: [[0, "charge"], [.12, "tackle", "out", { move: 10 }], [.42, "tackle", "lin", { move: 16 }], [.62, "charge2", "io", { move: 16 }]], next: "charge2Hold", n: "태클", hits: [[.16, 1, false]] },
  // 베어넘기기 계열
  wide: { keys: [[0, "drawn"], [.3, "sweepR", "out"], [.38, "sweepR", "lin"], [.5, "sweepM", "in", { move: 4 }], [.6, "sweepL", "out", { move: 6 }], [1.25, "drawn", "io", { move: 6 }]], next: "drawnIdle", n: "베어넘기기", hits: [[.5, 2, false]] },
  leapWide: { keys: [[0, "tackle"], [.2, "sweepR", "out", { move: 10 }], [.36, "sweepM", "in", { move: 22 }], [.46, "sweepL", "out", { move: 26 }], [1.15, "drawn", "io", { move: 26 }]], next: "drawnIdle", n: "뛰어들어 베어넘기기", hits: [[.37, 2, false]] },
  strongWide: { keys: [[0, "impact2"], [.38, "sweepR2", "out"], [.48, "sweepR2", "lin", { shake: .4 }], [.6, "sweepM", "in", { move: 5 }], [.72, "sweepL2", "snap", { move: 8 }], [1.5, "drawn", "io", { move: 8 }]], next: "drawnIdle", n: "강 베어넘기기", hits: [[.61, 3, false]] },
  // 베어올리기
  upswing: { keys: [[0, "drawn"], [.28, "upLow", "out"], [.36, "upMid", "in", { move: 2 }], [.46, "upHigh", "out", { move: 3 }], [1.1, "drawn", "io", { move: 3 }]], next: "drawnIdle", n: "베어올리기", hits: [[.38, 2, false]] },
  offsetIn: { keys: [[0, "drawn"], [.3, "offsetLow", "out"]], next: "offsetHold", n: "상쇄 모으기" },
  offsetHold: { keys: [[0, "offsetLow"], [1, "offsetLow"]], loop: true, n: "상쇄 모으는 중", shake: true },
  offsetUp: { keys: [[0, "offsetLow"], [.1, "upMid", "in", { move: 3 }], [.2, "upHigh", "snap", { move: 5 }], [.85, "drawn", "io", { move: 5 }]], next: "drawnIdle", n: "상쇄 베어올리기", hits: [[.13, 3, false]] },
  crossSlash: { keys: [[0, "upHigh"], [.18, "crossA0", "out"], [.3, "crossA1", "in", { move: 4 }], [.48, "crossB0", "out", { move: 4 }], [.6, "crossB1", "in", { move: 8 }], [1.3, "drawn", "io", { move: 8 }]], next: "drawnIdle", n: "추격 십자베기", hits: [[.27, 2, false], [.57, 3, false]] },
  // 가드 킥
  guardKick: { keys: [[0, "guard"], [.12, "kick", "out", { move: 2 }], [.32, "kick", "lin", { move: 3 }], [.55, "guard", "io", { move: 3 }]], next: "guardHold", n: "가드 킥", hits: [[.14, 1, false]] },
  // 집중 관통 베기: 상처를 따라 천천히 베어 넘기며 여러 번 들어간다. finish = 끝내기
  pierce: { keys: [[0, "drawn"], [.3, "sweepR", "out"], [.42, "sweepR", "lin", { shake: .5 }], [.7, "sweepM", "io", { move: 4 }], [1.15, "sweepL", "io", { move: 7 }], [1.85, "drawn", "io", { move: 7 }]], next: "drawnIdle", n: "집중 관통 베기", hits: [[.5, 1, false], [.66, 1, false], [.82, 1, false], [.98, 2, false]], finish: "pierceEnd" },
  pierceEnd: { keys: [[0, "sweepM"], [.12, "sweepL", "snap", { move: 3 }], [.8, "drawn", "io", { move: 3 }]], next: "drawnIdle", n: "관통 베기 피니시", hits: [[.1, 3, false]] },
  pierceDraw: { keys: [[0, "back"], [.14, "reach", "io"], [.32, "sweepR", "out"], [.42, "sweepR", "lin", { shake: .5 }], [.7, "sweepM", "io", { move: 4 }], [1.15, "sweepL", "io", { move: 7 }], [1.85, "drawn", "io", { move: 7 }]], next: "drawnIdle", n: "납도 중 집중 관통 베기", hits: [[.5, 1, false], [.66, 1, false], [.82, 1, false], [.98, 2, false]], finish: "pierceEnd" },
});
CLIPS.tackle0 = { keys: [[0, "drawn"], [.14, "tackle", "out", { move: 10 }], [.42, "tackle", "lin", { move: 16 }], [.75, "drawn", "io", { move: 16 }]], next: "drawnIdle", n: "태클", hits: [[.18, 1, false]] };
CLIPS.slash.hits = [[.88, 2, true]]; CLIPS.vslash.hits = CLIPS.slash.hits;
// ── 섞기 ──
const PIV = V(-5.4, 35.4, 0); // 칼은 오른 어깨를 축으로 호를 그린다
const basis = (dir, edge) => { const y = V(...dir).normalize(), x = V(...edge), z = V(); x.addScaledVector(y, -x.dot(y)).normalize(); z.crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
function mixSword(a, b, k) { if (!a || !b) return (k < .5 ? a : b) ?? a ?? b; const va = V(...a.grip).sub(PIV), vb = V(...b.grip).sub(PIV), la = va.length(), lb = vb.length(), qa = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), va.clone().normalize()), qb = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), vb.clone().normalize()), g = V(0, 0, 1).applyQuaternion(qa.slerp(qb, k)).multiplyScalar(la + (lb - la) * k).add(PIV), q = basis(a.dir, a.edge).slerp(basis(b.dir, b.edge), k), dir = V(0, 1, 0).applyQuaternion(q), edge = V(1, 0, 0).applyQuaternion(q); return { grip: g.toArray(), dir: dir.toArray(), edge: edge.toArray() }; }
const L = (a, b, k) => a + (b - a) * k;
function mix(A, Bp, k) { return { sword: mixSword(A.sword, Bp.sword, k), hands: k < .5 ? A.hands : Bp.hands, drop: L(A.drop, Bp.drop, k), lean: L(A.lean, Bp.lean, k), twist: L(A.twist, Bp.twist, k), shake: L(A.shake ?? 0, Bp.shake ?? 0, k), feet: A.feet.map((f, i) => f.map((v, j) => L(v, Bp.feet[i][j], k) + (j === 1 ? sin(k * PI) * (abs(Bp.feet[i][2] - f[2]) + abs(Bp.feet[i][0] - f[0]) > .8 ? 1.6 : 0) : 0))) }; } // 발을 옮길 땐 들어 올린다
/** 클립의 t초 자세 */
export function sampleClip(name, t, back) { const C = CLIPS[name], K = C.keys, end = K[K.length - 1][0], tt = C.loop ? t % end : min(t, end); let i = 1; while (i < K.length - 1 && K[i][0] < tt) i++; const [t0, p0, , o0] = K[i - 1], [t1, p1, e, o1] = K[i], k = (EASE[e] ?? EASE.io)(clamp((tt - t0) / max(1e-4, t1 - t0)));
  const P = (p, o) => { const s = { ...POSE[p], ...(o ?? {}) }; if (!s.sword && s.hands !== "none" && back) s.swordFrom = back; return s; }; let A = P(p0, o0), B = P(p1, o1);
  if (!A.sword && B.sword && back) A = { ...A, sword: back }; // 등에서 손으로: 등 위치에서 출발
  if (A.sword && !B.sword && back) B = { ...B, sword: k > .98 ? null : back };
  const S = mix(A, B, k); if (C.shake) S.shake = .35 + min(1, t / 2) * .9; const mv = moveAt(C, i, k); return { S, done: !C.loop && t >= end, C, mv }; }
// 키마다 누적 전진량(칸): 덧붙일 값의 move, 없으면 앞 키 값을 잇는다
function moveAt(C, i, k) { if (!C._mv) { let m = 0; C._mv = C.keys.map((q) => (m = q[3]?.move ?? m)); } return L(C._mv[i - 1], C._mv[i], k); }
// 타격 목록: [[시간, 세기(1~4), 땅에 닿음]] (예전 hit 숫자도 받는다)
export const hitsOf = (C) => C.hits ?? (C.hit != null ? [[C.hit, 2, true]] : []);
// ── 몸 스프링: 숙임·비틀기·낮춤이 목표를 살짝 넘었다 돌아온다 ──
export class BodySpring { constructor() { this.v = {}; this.x = null; } step(S, dt, f = 9, z = .5) { if (!this.x) { this.x = { drop: S.drop, lean: S.lean, twist: S.twist }; for (const k in this.x) this.v[k] = 0; } const w = 2 * PI * f; const n = Math.ceil(dt * w / .25), h2 = dt / n; for (let i = 0; i < n; i++) for (const k in this.x) { const a = w * w * (S[k] - this.x[k]) - 2 * z * w * this.v[k]; this.v[k] += a * h2; this.x[k] += this.v[k] * h2; } return { ...S, ...this.x, raw: S }; } kick(k, v) { if (this.v[k] != null) this.v[k] += v; } }
// ── 등에 멘 칼 자리(가슴 기준) ──
const BACK = { grip: [-4.2, 7.8, -4.6], dir: [.42, -1, -.05], edge: [-1, -.42, 0] };
function backPose(h) { const B = h.B; B.chest.updateMatrixWorld(true); const cq = B.chest.getWorldQuaternion(new THREE.Quaternion()), rq = h.root.getWorldQuaternion(new THREE.Quaternion()).invert(), g = h.root.worldToLocal(B.chest.localToWorld(V(...BACK.grip).multiplyScalar(HU))).divideScalar(HU), q = rq.multiply(cq).multiply(basis(BACK.dir, BACK.edge)); return { grip: g.toArray(), dir: V(0, 1, 0).applyQuaternion(q).toArray(), edge: V(1, 0, 0).applyQuaternion(q).toArray() }; }
/** 몸 세우기 → 칼 놓기 → 손 IK. o = { t, gait:{phase,amt}, roll } */
export function applyPose(h, gs, S, o = {}) {
  const B = h.B, r = { B, def: h.def }, M = (x, y, z) => h.root.localToWorld(V(x, y, z).multiplyScalar(HU)), t = o.t ?? 0, gt = o.gait ?? { phase: 0, amt: 0 };
  for (const b of h.bones) b.quaternion.identity(); B.hips.position.copy(h.rest);
  const bob = gt.amt ? abs(sin(gt.phase)) * .9 * gt.amt : 0, breath = sin(t * 2.1) * .2;
  B.hips.position.y -= (S.drop + breath * .4 - bob + gt.amt * .6) * HU; const sh = S.shake ? sin(t * 37) * .01 * S.shake + sin(t * 23) * .006 * S.shake : 0;
  // 골반은 두 발을 잇는 선에 맞춰 돌고(절반만), 무게는 앞발 쪽으로 60%
  const [fR, fL] = S.feet, still = 1 - gt.amt, hy = Math.atan2(-(fL[2] - fR[2]), fL[0] - fR[0]) * .5 * still, front = fR[2] >= fL[2] ? fR : fL, rear = front === fR ? fL : fR;
  B.hips.position.x += (rear[0] + (front[0] - rear[0]) * .6) * .35 * HU * still; B.hips.position.z += (rear[2] + (front[2] - rear[2]) * .6) * .45 * HU * still;
  const tw = S.twist + sh; // 상체 전체가 향할 각도 → 골반이 돈 만큼 등·가슴이 되돌린다
  B.hips.rotation.set(gt.amt * .08 + S.lean * .1, hy + sin(gt.phase) * .12 * gt.amt, 0); B.spine.rotation.set(S.lean * .45 + gt.amt * .12, (tw - hy) * .4 - sin(gt.phase) * .1 * gt.amt, 0);
  B.chest.rotation.set(S.lean * .45 - breath * .03, (tw - hy) * .6, sh * .5 - S.lean * .05); B.neck.rotation.set(-S.lean * .45, -tw * .5, 0); B.head.rotation.set(-S.lean * .5 + breath * .01, -tw * .5, 0); h.root.updateMatrixWorld(true);
  if (o.roll != null) { // 구르기: 몸을 웅크려 한 바퀴
    const k = o.roll; B.hips.position.y = h.rest.y - (10 + sin(k * PI) * 6) * HU; B.hips.rotation.x = k * 2 * PI; B.spine.rotation.x = .5; B.chest.rotation.x = .4; B.head.rotation.x = .5; for (const s of ["R", "L"]) { B["ul" + s].rotation.x = -1.6; B["ll" + s].rotation.x = 2.2; B["ua" + s].rotation.x = -.9; B["la" + s].rotation.x = -1.4; }
    h.root.updateMatrixWorld(true); if (gs) { const bp = backPose(h); place(h, gs, bp); } return; }
  // 다리: 걸을 땐 발이 앞뒤로 오가고, 서 있으면 정한 자리에
  for (const [s, i, k] of [["R", 0, -1], ["L", 1, 1]]) { const f = S.feet[i], ph = gt.phase + (i ? PI : 0), st = gt.amt ? [sin(ph) * 7 * gt.amt, max(0, cos(ph)) * 3.2 * gt.amt] : [0, 0], fx = gt.amt ? L(f[0], k * 2.6, gt.amt) : f[0], fz = gt.amt ? L(f[2], 0, gt.amt) + st[0] : f[2], tg = M(fx, f[1] + st[1], fz); const yaw = (f === rear ? .65 : .12) * still * k, kd = [Math.sin(yaw), Math.cos(yaw)]; ik2(r, "ul" + s, "ll" + s, tg, M(fx + kd[0] * 12, 14, fz + kd[1] * 12)); aim(r, "ft" + s, M(kd[0], -.4 - (gt.amt ? max(0, -cos(ph)) * .6 : 0), kd[1]).sub(M(0, 0, 0))); } // 뒷발은 바깥으로 벌린다
  const back = backPose(h), sw = S.sword ?? back; if (gs) place(h, gs, sw, sh);
  // 손
  if (S.hands === "none" || !gs) { for (const [s, k] of [["R", -1], ["L", 1]]) { B["ua" + s].rotation.set(sin(t * 2 + k) * .03 - sin(gt.phase + (k < 0 ? PI : 0)) * .5 * gt.amt, 0, k * .1); B["la" + s].rotation.x = -.15 - gt.amt * .35; B["fg" + s].rotation.z = -k * .4; } h.root.updateMatrixWorld(true); return; }
  const ax = V(0, 1, 0).applyQuaternion(gs.obj.getWorldQuaternion(new THREE.Quaternion())); // 손잡이 축(월드)
  const handTo = (s, k, p) => { const gp = gs.obj.localToWorld(p.clone()), cj = B["cl" + s].getWorldPosition(V()), cr = _r.copy(h.def.T["cl" + s]).sub(h.def.J["cl" + s]).normalize().applyQuaternion(B["cl" + s].parent.getWorldQuaternion(new THREE.Quaternion()));
    aim(r, "cl" + s, cr.clone().lerp(gp.clone().sub(cj).normalize(), .22)); // 팔을 뻗으면 어깨가 따라 나간다
    const so = B["ua" + s].getWorldPosition(V()), wr = gp.clone().addScaledVector(so.clone().sub(gp).normalize(), 1.9 * HU); const hi = gs.obj.position.y / HU > 36; ik2(r, "ua" + s, "la" + s, wr, hi ? M(k * 13, 44, 9) : M(k * (s === "R" ? 16 : 8), 14, s === "R" ? -2 : -6)); aim(r, "h" + s, gp.clone().sub(B["h" + s].getWorldPosition(V())));
    roll(B["h" + s], h.def, "h" + s, ax); B["fg" + s].rotation.z = -k * 1.55; B["tb" + s].rotation.set(.6, 0, k * .5); };
  handTo("R", -1, gs.pt("main")); if (S.hands === "both") handTo("L", 1, gs.pt("off")); else { B.uaL.rotation.set(-.2 + sin(t * 2) * .03, 0, .25); B.laL.rotation.x = -.5; B.fgL.rotation.z = -.4; h.root.updateMatrixWorld(true); }
  h.root.updateMatrixWorld(true);
}
const _r = V();
// 손을 긴 축으로 돌려 손바닥 폭(z축)이 손잡이 축과 나란하게
function roll(b, def, n, axis) { const q = b.getWorldQuaternion(new THREE.Quaternion()), long = V().copy(def.T[n]).sub(def.J[n]).normalize().applyQuaternion(q), cz = V(0, 0, 1).applyQuaternion(q), want = axis.clone().addScaledVector(long, -axis.dot(long)).normalize(); if (want.lengthSq() < 1e-6) return; const ang = Math.atan2(cz.clone().cross(want).dot(long), cz.dot(want)), wq = new THREE.Quaternion().setFromAxisAngle(long, ang).multiply(q), pq = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); b.quaternion.copy(pq.multiply(wq)); b.updateMatrixWorld(true); }
function place(h, gs, sw, sh = 0) { gs.obj.position.set(...sw.grip).multiplyScalar(HU); gs.obj.position.x += sh; gs.obj.quaternion.copy(basis(sw.dir, sw.edge)); h.root.updateMatrixWorld(true); }
/** 동작 재생기: play(이름) → update(dt) 가 자세를 돌려준다 */
export class GSPlayer {
  constructor(h, gs) { this.h = h; this.gs = gs; this.cur = "idle"; this.t = 0; this.spring = new BodySpring(); this.onHit = null; this.hitDone = false; this.stop = 0; this.sg = null; this.sv = V(); this.sq = new THREE.Quaternion(); this.prev = null; }
  play(n) { if (!CLIPS[n]) return; this.cur = n; this.t = 0; this.hitIx = 0; this.mvLast = 0; this.moveDelta = 0; }
  get drawn() { return !/^(idle|sheathe)$/.test(this.cur) || (this.cur === "sheathe" && this.t < .55); }
  get clipLen() { const K = CLIPS[this.cur].keys; return K[K.length - 1][0]; }
  get busy() { const C = CLIPS[this.cur]; return !C.loop && this.t < C.keys[C.keys.length - 1][0] * .8; }
  update(dt, o = {}) {
    const cdt = this.stop > 0 ? dt * .06 : dt; this.stop -= dt; this.t += cdt; // 히트스톱: 맞는 순간 시간이 거의 멈춘다
    let { S, done, C, mv } = sampleClip(this.cur, this.t, this.back); const H = hitsOf(C);
    while (this.hitIx < H.length && this.t >= H[this.hitIx][0]) { const [, pw, gr] = H[this.hitIx++]; this.stop = .05 + pw * .03; this.spring.kick("drop", -8 - pw * 6); this.spring.kick("lean", 1 + pw); this.lastHit = { clip: this.cur, pw, ground: gr }; this.onHit?.(this.lastHit); }
    this.moveDelta = mv - (this.mvLast ?? 0); this.mvLast = mv;
    if (done && C.next) { this.play(C.next); ({ S } = sampleClip(this.cur, 0, this.back)); this.mvLast = 0; }
    // 칼 관성: 칼은 무거워서 목표를 늦게 따라가고 살짝 넘친다. 빠르게 휘두르는 구간만 단단히 붙는다
    if (S.sword) { const tg = V(...S.sword.grip), tq = basis(S.sword.dir, S.sword.edge); if (!this.sg) { this.sg = tg.clone(); this.sv.set(0, 0, 0); this.sq.copy(tq); this.prev = tg.clone(); }
      const sp = this.prev.distanceTo(tg) / Math.max(1e-4, dt); this.prev.copy(tg); const stiff = sp > 30 || H.some(([ht]) => this.t > ht - .08 && this.t < ht + .55), f = stiff ? 16 : 4.2, z = stiff ? .9 : .62, w = 2 * PI * f, n = Math.ceil(dt * w / .25), h2 = dt / n; for (let i = 0; i < n; i++) { const a = tg.clone().sub(this.sg).multiplyScalar(w * w).addScaledVector(this.sv, -2 * z * w); this.sv.addScaledVector(a, h2); this.sg.addScaledVector(this.sv, h2); } /* 잘게 나눠 계산(발산 방지) */ this.sq.slerp(tq, 1 - Math.exp(-dt * f * 1.4));
      S = { ...S, sword: { grip: this.sg.toArray(), dir: V(0, 1, 0).applyQuaternion(this.sq).toArray(), edge: V(1, 0, 0).applyQuaternion(this.sq).toArray() } }; } else this.sg = null;
    const Bd = this.spring.step(S, dt); applyPose(this.h, this.gs, Bd, o); this.back = backPose(this.h); return Bd; }
}
