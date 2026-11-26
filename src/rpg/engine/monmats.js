// Dusk Saga 몬스터 소재 도감: 프리셋 몬스터마다 부위별 소재(이름·모양·색·꼬리표·등급). BY_ID에 'mm:<몬스터>:<부위명>'으로 더한다.
// 부순 부위(head·body·legs·tail·wings)에서 첫 소재(반은 둘째도), 쓰러뜨리면 몸 소재와 드물게 'kill' 소재(핵·피·독샘…).
import { BY_ID, PAL, SHAPES } from "./materials.js";
import { PRE } from "./normalize.js";
import "./bestiary.js";
import { familyOf } from "./famrules.js";
export { familyOf };

// [이름, 모양, 꼬리표들, 등급 보정]
const P = (n, shape, tags, up = 0) => ({ n, shape, tags: ["part", ...tags], up });
const FAM = {
  dragon: { head: [P("뿔", "horn", ["horn"]), P("송곳니", "fang", ["fang"])], body: [P("비늘", "scale", ["scale"]), P("뼈", "bone", ["bone"])], legs: [P("발톱", "claw", ["claw"]), P("힘줄", "rope", ["tendon"])], tail: [P("꼬리 가시", "horn", ["horn"])], wings: [P("날개막", "wing", ["wing", "membrane"])], kill: [P("용심", "core", ["core"], 1), P("피", "vial", ["liquid", "blood"])] },
  beast: { head: [P("송곳니", "fang", ["fang"])], body: [P("털가죽", "hide", ["hide"]), P("뼈", "bone", ["bone"])], legs: [P("발톱", "claw", ["claw"]), P("힘줄", "rope", ["tendon"])], tail: [P("꼬리털", "tail", ["fiber"])], wings: [P("날개막", "wing", ["wing", "membrane"])], kill: [P("피", "vial", ["liquid", "blood"])] },
  bird: { head: [P("부리", "fang", ["fang"])], body: [P("깃털", "feather", ["feather"])], legs: [P("발톱", "claw", ["claw"])], tail: [P("꽁지깃", "feather", ["feather"])], wings: [P("칼깃", "feather", ["feather"])], kill: [P("알", "egg", ["egg"], 1)] },
  insect: { head: [P("겹눈", "eye", ["eye"]), P("큰턱", "fang", ["fang"])], body: [P("갑각", "shell", ["shell"])], legs: [P("가시다리", "claw", ["claw"])], tail: [P("독침", "fang", ["fang"])], wings: [P("날개", "wing", ["wing", "membrane"])], kill: [P("독샘", "vial", ["liquid", "venom"])] },
  spider: { head: [P("독니", "fang", ["fang"]), P("겹눈", "eye", ["eye"])], body: [P("갑각", "shell", ["shell"])], legs: [P("마디다리", "claw", ["claw"])], tail: [P("실샘", "thread", ["string"])], kill: [P("독샘", "vial", ["liquid", "venom"]), P("거미줄 뭉치", "thread", ["string"])] },
  aqua: { head: [P("눈알", "eye", ["eye"])], body: [P("껍데기", "shell", ["shell"])], legs: [P("집게발", "claw", ["claw"])], tail: [P("촉수", "tentacle", ["tentacle"])], wings: [P("지느러미", "wing", ["wing", "membrane"])], kill: [P("먹물", "vial", ["liquid"]), P("진주", "egg", ["gem"], 1)] },
  jelly: { head: [P("갓", "goo", ["glue"])], body: [P("젤리", "goo", ["glue"])], tail: [P("독촉수", "tentacle", ["tentacle", "venom"])], kill: [P("발광체", "core", ["core"])] },
  reptile: { head: [P("독니", "fang", ["fang"])], body: [P("비늘", "scale", ["scale"]), P("가죽", "hide", ["hide"])], legs: [P("발톱", "claw", ["claw"])], tail: [P("꼬리", "tail", ["tail"])], kill: [P("독샘", "vial", ["liquid", "venom"])] },
  turtle: { head: [P("부리", "fang", ["fang"])], body: [P("등딱지", "shell", ["shell"])], legs: [P("발톱", "claw", ["claw"])], kill: [P("이끼 바위", "ore", ["stone"])] },
  toad: { head: [P("혀", "tentacle", ["tentacle"])], body: [P("두꺼비 가죽", "hide", ["hide"])], legs: [P("물갈퀴", "wing", ["membrane"])], kill: [P("독샘", "vial", ["liquid", "venom"])] },
  slime: { head: [P("핵", "core", ["core"])], body: [P("점액", "goo", ["glue"])], legs: [P("점액", "goo", ["glue"])], tail: [P("점액", "goo", ["glue"])], kill: [P("핵", "core", ["core"])] },
  plant: { head: [P("꽃봉오리", "flower", ["herb"])], body: [P("줄기", "log", ["log"]), P("수액", "goo", ["glue"])], legs: [P("뿌리", "stick", ["stick"])], tail: [P("덩굴", "rope", ["string"])], kill: [P("씨앗", "seed", ["seed"])] },
  treant: { head: [P("고목 가지", "log", ["log"])], body: [P("나무껍질", "log", ["log"]), P("수액", "goo", ["glue"])], legs: [P("뿌리", "stick", ["stick"])], tail: [P("덩굴", "rope", ["string"])], kill: [P("심재", "log", ["log"], 1), P("씨앗", "seed", ["seed"])] },
  spore: { head: [P("갓", "mushroom", ["shroom"])], body: [P("균사", "thread", ["fiber"])], kill: [P("포자 가루", "powder", ["powder"])] },
  golem: { head: [P("핵", "core", ["core"])], body: [P("돌조각", "ore", ["stone"]), P("마석", "crystal", ["gem"])], legs: [P("관절석", "ore", ["stone"])], wings: [P("돌날개", "wing", ["stone"])], kill: [P("핵", "core", ["core"], 1)] },
  armor: { head: [P("투구 조각", "plate", ["plate"])], body: [P("녹슨 판금", "plate", ["plate"])], legs: [P("쇠사슬", "rope", ["string"])], kill: [P("깃든 혼", "core", ["core"])] },
  mimic: { head: [P("이빨", "fang", ["fang"])], body: [P("상자 판자", "plank", ["plank"])], kill: [P("삼킨 금화", "powder", ["gold"], 1)] },
  doll: { head: [P("유리 눈", "eye", ["eye"])], body: [P("헝겊", "cloth", ["cloth"])], kill: [P("저주의 실", "thread", ["string"])] },
  undead: { head: [P("두개골", "skull", ["bone"])], body: [P("뼈", "bone", ["bone"])], legs: [P("대퇴골", "bone", ["bone"])], tail: [P("척추", "bone", ["bone"])], kill: [P("영혼석", "core", ["core"]), P("수의", "cloth", ["cloth"])] },
  ghost: { head: [P("영체 조각", "crystal", ["essence"])], body: [P("영체 조각", "crystal", ["essence"])], kill: [P("영혼석", "core", ["core"])] },
  spirit: { head: [P("결정", "crystal", ["essence"])], body: [P("정수", "crystal", ["essence"])], legs: [P("결정", "crystal", ["essence"])], tail: [P("잔불", "core", ["core"])], kill: [P("정령석", "core", ["core"], 1)] },
  demon: { head: [P("뿔", "horn", ["horn"])], body: [P("가죽", "hide", ["hide"])], tail: [P("꼬리", "tail", ["tail"])], wings: [P("날개막", "wing", ["wing", "membrane"])], legs: [P("발톱", "claw", ["claw"])], kill: [P("마핵", "core", ["core"])] },
  giant: { head: [P("외눈", "eye", ["eye"])], body: [P("두꺼운 가죽", "hide", ["hide"]), P("뼈", "bone", ["bone"])], legs: [P("힘줄", "rope", ["tendon"])], kill: [P("피", "vial", ["liquid", "blood"])] },
  eye: { head: [P("마안", "eye", ["eye"], 1)], body: [P("살점", "goo", ["glue"])], kill: [P("마력 결정", "crystal", ["essence"])] },
  shadow: { head: [P("그림자 송곳니", "fang", ["fang"])], body: [P("그림자 가죽", "hide", ["hide"])], kill: [P("어둠 결정", "crystal", ["essence"])] },
  machine: { head: [P("센서", "eye", ["eye", "mech"])], body: [P("장갑판", "plate", ["plate"])], legs: [P("구동부", "gearp", ["mech"])], tail: [P("배선", "chip", ["mech"])], wings: [P("로터", "gearp", ["mech"])], kill: [P("동력핵", "core", ["core"], 1), P("회로", "chip", ["mech"])] },
  chimera: { head: [P("갈기", "hide", ["hide"]), P("송곳니", "fang", ["fang"])], body: [P("가죽", "hide", ["hide"])], tail: [P("뱀꼬리", "tail", ["tail"])], wings: [P("날개", "wing", ["wing", "membrane"])], legs: [P("발톱", "claw", ["claw"])], kill: [P("세 겹 심장", "core", ["core"], 1)] },
};
const SIZE = { dragon: 3, hydra: 3 }, BIG = /화룡|지룡|히드라|전차/, MID = /와이번|키메라|곰|멧돼지|거북|트렌트|골렘|거인|기갑병|다족|모래 벌레|집게/;
const G = ["보통", "양질", "정예", "희귀", "영웅", "전설", "신화"];
const sizeOfName = (n) => (BIG.test(n) ? 3 : MID.test(n) ? 2 : 1);
const idOf = (mon, pn) => "mm:" + mon + ":" + pn;
/** 한 몬스터의 소재 목록(도감) */
export function monsterMats(mon) {
  const f = familyOf(mon); if (!f) return []; const fam = FAM[f.fam], sz = sizeOfName(mon), base = 1 + sz, out = [], seen = new Set();
  for (const [slot, list] of Object.entries(fam)) for (const p of list) { const id = idOf(mon, p.n); if (seen.has(id)) continue; seen.add(id); out.push({ id, name: mon + "의 " + p.n, cat: "part", shape: SHAPES[p.shape] ? p.shape : "ore", pal: PAL[f.pal] ? f.pal : "beast", grade: G[Math.min(G.length - 1, base + p.up)], elem: "", tags: p.tags, src: mon, slot }); }
  return out;
}
// 도감에 등록(프리셋 몬스터 전부)
export const MONSTERS = Object.keys(PRE).filter((n) => familyOf(n));
for (const mon of MONSTERS) for (const m of monsterMats(mon)) { m.elem = PRE[mon]?.elem || ""; BY_ID[m.id] = m; }
/** 전투에서: 부순 부위 → 소재 id들. 이름이 프리셋이 아니면 비슷한 무리로(이름은 그 몬스터 이름) */
export function dropsFor(name, slot, { boss = false, rnd = Math.random, kill = false } = {}) {
  const base = String(name || "").replace(/\s*\d+$/, "").replace(/ 대장$/, ""), f = familyOf(base); if (!f) return [];
  const fam = FAM[f.fam], list = (kill ? fam.kill : fam[slot] || fam.body) || [], out = [];
  list.forEach((p, i) => { if (kill ? rnd() < (p.up ? 0.25 : 0.5) : i === 0 || rnd() < 0.5) out.push(ensure(base, p, f, boss)); });
  return out;
}
// 프리셋이 아닌 이름(이야기 속 몬스터)도 도감에 즉석으로 넣는다
function ensure(mon, p, f, boss) {
  const id = idOf(mon, p.n) + (boss ? ":boss" : ""); if (BY_ID[id]) return id; const sz = sizeOfName(mon), g = G[Math.min(G.length - 1, 1 + sz + p.up + (boss ? 1 : 0))];
  BY_ID[id] = { id, name: (boss ? "우두머리 " : "") + mon + "의 " + p.n, cat: "part", shape: p.shape, pal: f.pal, grade: g, elem: PRE[mon]?.elem || "", tags: p.tags, src: mon }; return id;
}
