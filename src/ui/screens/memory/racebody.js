// 장기기억 애드온(0.3.22): 종족별 인체 모형 특징(순수 모양 데이터 + SVG 노드). 좌표는 성감대 모형(viewBox -44 -14 188 216) 기준.
// behind = 몸 뒤(날개·꼬리·하반신), over = 머리 위(귀·뿔). 하반신이 바뀌는 종족은 다리를 가린다(clip).
import { h } from "../../dom.js";

const mir = (d) => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(100 - +x).toFixed(2)} ${y}`);
const both = (d) => [d, mir(d)];
// 귀 모양(사람 귀 자리 대신). y가 작을수록 머리 위
export const EARS = {
  elf: both("M41.6 15.2L31.4 9.8L41.6 21.6Z"),
  halfelf: both("M41.6 15.6L36.4 12.6L41.4 21Z"),
  fin: both("M41.6 14.4L33 10L35 14L32.6 16.6L35.6 18L33.6 21.6L41.6 21.4Z"),
  cat: both("M43.2 8.6L41.2 -1.4L48 6.2Z"),
  wolf: both("M43 8.8L40.2 -3.4L47.8 6Z"),
  fox: both("M43 9L39.6 -4.6L48 5.8Z"),
  dog: both("M42.4 8.2C39 6 36.4 9 37.2 15.2C38.2 13 40 11.6 42.8 11.4Z"),
  rabbit: both("M45 6.6C42.2 -2 41.6 -10.6 43.6 -12.6C45.6 -11 47.6 -2 47.6 6.2Z"),
  round: both("M44.6 8.4C44.8 5.2 42 3.4 40 4.8C38.2 6.2 38.8 9.6 41.6 10.4Z"),
  side: both("M41.6 11.6C37.6 9.6 34 10.2 32.2 12.4C35 13.6 38.4 13.8 41.8 13.4Z"),
  horse: both("M43.8 7.2L42.6 -1L47 5.6Z"),
  bat: both("M43.4 9L37.6 -3L48.6 5.4Z"),
  feather: both("M42 12C37 8 33.6 3.4 33.2 0.6C36.4 3.4 39.6 5.6 43.4 8.4Z"),
};
// 뿔·더듬이
export const HORNS = {
  oni: both("M45.2 7.6L44.4 0.4L47.8 6.6Z"),
  small: both("M44.6 7.4L42.6 2.6L46.6 6.2Z"),
  demon: both("M44.6 8.2C41 3.8 37.2 4.2 35.8 7.8C38.6 5.8 41.2 7 43 10Z"),
  goat: both("M45 7.6C42 1.8 36.8 1.6 35.6 6.4C37.6 4.4 40.4 5 42.8 9.4Z"),
  curl: both("M43.6 9.6C38.6 9.4 36 5 38.6 2.6C41.2 0.6 44.4 3 42.6 5.4C41.6 6.8 40 6 40.4 4.8"),
  dragon: both("M44.4 8.6C40.2 4.8 34.6 2.4 30 2.8C34 4.2 38.4 7.4 42.2 11.6Z"),
  antler: both("M45.6 7.2L42.6 -0.6M43.8 2.6L39.6 1.2M43 0.4L41.6 -4M44.6 4.6L40.4 4.4"),
  unicorn: ["M49.2 6.4L50 -12L50.8 6.4Z"],
  antenna: both("M46.8 7C45.4 0.6 42.6 -4 39.4 -5.4"),
};
const STROKE = new Set(["antler", "antenna", "curl"]);
// 꼬리(몸 뒤). 끝이 오른쪽 위로 휘어 앞모습에서도 옆으로 살짝 보인다
export const TAILS = {
  cat: "M51 93C62 101 74 108 78 124C81 138 77 150 71 157C69 160 72 162 74.6 159",
  thin: "M51 93C58 102 66 104 72 98",
  lion: "M51 93C62 101 74 108 77 124C80 138 77 150 72 156",
  tiger: "M51 93C63 101 76 110 79 126C82 140 78 152 72 158C70 160 72 162 74.4 160",
  demon: "M51 93C62 101 73 110 76 126C78 138 76 148 72 154M72 154L67.6 155.4L71 151L72.6 146.6L74.4 151.6L77.6 155Z",
  dog: "M50 92C60 96 70 92 74 82C77 74 74 68 70 70C72 78 66 86 50 89Z",
  wolf: "M50 92C62 98 76 108 80 126C83 140 78 152 70 156C72 146 71 134 66 122C61 110 56 100 50 96Z",
  fluffy: "M50 92C62 98 76 106 80 120C83 132 79 142 71 146C73 136 70 124 65 114C60 104 56 98 50 95Z",
  fox: "M50 92C64 98 80 110 85 130C88 146 82 160 70 164C74 154 74 140 68 126C62 112 56 100 50 96Z",
  puff: "M55 94A4.4 4.4 0 1 1 46 94A4.4 4.4 0 1 1 55 94Z",
  cow: "M51 93C56 104 60 112 60 120",
  horse: "M48 92C46 104 47 116 50 124C52 116 54 104 52 92Z",
  bird: "M47 92L44 112L50 106L56 112L53 92Z",
  thick: "M47 92C49 112 58 130 74 140C63 126 56 110 54 92Z",
  dragon: "M46.6 92C48 114 58 136 80 148L76 142L84 140C64 128 56 110 54 92Z",
  ninetail: "M50 92C60 104 76 104 80 92C82 84 78 78 74 80C76 88 66 94 50 89ZM50 92C42 104 26 104 22 92C20 84 24 78 28 80C26 88 36 94 50 89ZM50 92C56 106 66 112 74 108C70 104 60 100 52 90Z",
  twin: "M51 93C58 98 64 96 66 88C67 82 65 78 63 76M51 93C60 101 70 101 74 92C76 86 75 82 73 80",
};
const TAIL_STROKE = new Set(["cat", "thin", "lion", "tiger", "cow", "twin"]);
const TAIL_MIXED = new Set(["demon"]);   // 선 + 끝 모양
// 날개(몸 뒤)
export const WINGS = {
  feather: both("M45 40C33 26 14 21 -2 28C8 30 13 34 16 39C10 40 6 43 4 47C12 46 18 47 22 50C18 52 16 56 15 60C25 55 35 50 45 50Z"),
  featherdark: both("M45 40C33 26 14 21 -2 28C8 30 13 34 16 39C10 40 6 43 4 47C12 46 18 47 22 50C18 52 16 56 15 60C25 55 35 50 45 50Z"),
  bat: both("M45 40C33 26 16 20 0 26L5 36L10 33L13 43L19 37L24 48L28 42C34 45 40 46 45 49Z"),
  batsmall: both("M45 42C38 34 30 32 22 34L25 40L28 38L30 45L34 41L37 47C40 46 43 46 45 48Z"),
  insect: both("M45 42C34 30 18 28 10 34C14 42 30 46 45 46ZM45 47C36 52 24 58 20 66C28 68 38 60 45 50Z"),
  butterfly: both("M45 42C34 22 12 18 6 28C4 38 22 46 45 47ZM45 48C34 52 20 62 22 72C30 76 40 64 45 51Z"),
  fairy: both("M45 42C36 28 22 24 16 30C14 38 30 44 45 46ZM45 48C38 52 28 58 28 64C34 66 42 58 45 51Z"),
};
// 하반신(다리를 가리고 그린다)
export const LOWER = {
  serpent: "M31.4 98C29 120 34 146 48 164C58 176 70 182 82 176C88 172 90 166 86 162C82 170 72 172 64 164C54 152 60 128 68.6 98Z",
  fish: "M31.4 98C30 122 36 146 46 162L34 184C42 186 48 180 50 172C52 180 58 186 66 184L54 162C64 146 70 122 68.6 98Z",
  tentacle: "M31.4 98C28 120 22 140 14 156C20 158 26 150 30 140C30 156 26 172 22 182C30 182 34 168 38 150C38 166 38 180 40 190C46 188 46 170 46 152C48 168 52 182 58 188C62 184 56 168 54 150C58 166 66 178 74 180C76 174 66 160 62 142C68 152 76 158 84 156C78 140 72 120 68.6 98Z",
  spiderBack: "M50 120C41 120 36 128 37 138C38 148 44 154 50 154C56 154 62 148 63 138C64 128 59 120 50 120Z",
  spider: "M32 100C30 106 31 112 35 116C33 120 34 125 38 128C42 131 58 131 62 128C66 125 67 120 65 116C69 112 70 106 68 100Z",
  horseHind: "M33.6 136C31.6 152 31.4 168 32 187C33 188.4 35.6 188.4 36.4 187C36 170 36 156 37 144ZM66.4 136C68.4 152 68.6 168 68 187C67 188.4 64.4 188.4 63.6 187C64 170 64 156 63 144Z",
  spiderLegs: "M36 116C26 104 16 102 10 110C6 118 5 132 4 146M36 122C26 116 16 120 13 130C11 140 12 156 14 170M40 127C34 132 30 142 30 156C30 168 32 180 34 190M64 127C70 132 74 142 74 156C74 168 72 180 70 190M64 122C74 116 84 120 87 130C89 140 88 156 86 170M64 116C74 104 84 102 90 110C94 118 95 132 96 146",
  horse: "M32 100C30 110 30 118 33 124C30 130 31 138 35 142C36 154 36 168 37 182C37 186 36 188 35.6 190C37 191 41 191 42.4 190C42 186 42 182 42 176C42 164 43 152 45 146C48 147 52 147 55 146C57 152 58 164 58 176C58 182 58 186 57.6 190C59 191 63 191 64.4 190C64 188 63 186 63 182C64 168 64 154 65 142C69 138 70 130 67 124C70 118 70 110 68 100Z",
  slime: "M31.4 98C30 116 24 140 16 160C12 172 20 182 34 184C44 186 56 186 66 184C80 182 88 172 84 160C76 140 70 116 68.6 98Z",
  ghost: "M31.4 98C30 120 26 146 22 168C28 162 32 166 34 174C38 166 42 164 46 172C50 164 54 164 56 172C60 164 64 164 68 172C70 164 74 162 78 168C74 146 70 120 68.6 98Z",
};
// 모형에 그릴 노드. cls는 lifecards CSS(.rf 채움 / .rfs 선)
export function raceShapes(body = {}) {
  const P = (d, cls) => h("path", { svg: true, class: cls, d });
  const behind = [], over = [];
  if (body.wings && WINGS[body.wings]) for (const d of WINGS[body.wings]) behind.push(P(d, ["rf", "wing", `w-${body.wings}`]));
  if (body.lower && LOWER[body.lower]) {
    if (body.lower === "spider") behind.push(P(LOWER.spiderBack, ["rf", "low", "back2"]), P(LOWER.spiderLegs, ["rfs", "low", "leg"]));
    if (body.lower === "horse") behind.push(P(LOWER.horseHind, ["rf", "low", "back2"]));
    behind.push(P(LOWER[body.lower], ["rf", "low", `lw-${body.lower}`]));
  }
  if (body.tail && TAILS[body.tail]) {
    if (TAIL_MIXED.has(body.tail)) { const [line, tip] = TAILS[body.tail].split(/(?=M72 154L)/); behind.push(P(line, ["rfs", "tail"]), P(tip, ["rf", "tail", "tip"])); }
    else behind.push(P(TAILS[body.tail], TAIL_STROKE.has(body.tail) ? ["rfs", "tail"] : ["rf", "tail"]));
  }
  if (body.ears && EARS[body.ears]) for (const d of EARS[body.ears]) over.push(P(d, ["rf", "ear"]));
  if (body.horns && HORNS[body.horns]) for (const d of HORNS[body.horns]) over.push(P(d, STROKE.has(body.horns) ? ["rfs", "horn"] : ["rf", "horn"]));
  // 사람 귀를 지울지(동물 귀가 머리 위로 올라가면 옆 귀는 숨김), 귀 성감대 점을 어디로 옮길지
  const top = ["cat", "wolf", "fox", "rabbit", "round", "horse", "bat", "dog"].includes(body.ears);
  const earAt = body.ears === "rabbit" ? { x: 44.6, y: -4 } : top ? { x: 44, y: 4.6 } : ["elf", "halfelf", "fin"].includes(body.ears) ? { x: 36.6, y: 14.6 } : body.ears === "side" ? { x: 36.6, y: 11.8 } : null;
  return { behind, over, hideEars: top || ["elf", "halfelf", "fin", "side", "feather", "none"].includes(body.ears), earAt, clipLegs: !!(body.lower && LOWER[body.lower]), has: { tail: !!(body.tail && body.tail !== "none") || ["serpent", "fish"].includes(body.lower), wings: !!body.wings, horns: !!body.horns } };
}
export const RACE_BODY_CSS = `.rb-bodymap{--rf:color-mix(in srgb,#2c2838 62%,var(--rb-surf2));--rf2:color-mix(in srgb,#2c2838 40%,var(--rb-surf2))}
.rb-bodymap .rf{fill:var(--rf);stroke:none;opacity:.78}
.rb-bodymap .rfs{fill:none;stroke:var(--rf);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;opacity:.78}
.rb-bodymap .rfs.horn{stroke-width:1.2}.rb-bodymap .rfs.low{stroke-width:1.1;opacity:.5}.rb-bodymap .rf.back2{opacity:.32}
.rb-bodymap .rf.ear,.rb-bodymap .rf.horn{opacity:.85}
.rb-bodymap .rf.wing{fill:var(--rf2);opacity:.55}.rb-bodymap .w-insect,.rb-bodymap .w-fairy,.rb-bodymap .w-butterfly{opacity:.32}
.rb-bodymap .rf.tail{opacity:.6}
.rb-bodymap .rf.low{fill:url(#rbLowG)}.rb-bodymap .l0{stop-color:var(--rf2);stop-opacity:0}.rb-bodymap .l1{stop-color:var(--rf2);stop-opacity:.62}.rb-bodymap .rf.low.back2{fill:var(--rf2)}.rb-bodymap .lw-ghost{opacity:.35}.rb-bodymap .lw-slime{opacity:.45}`;
