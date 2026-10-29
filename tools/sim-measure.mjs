// v1.7.1 대략 측정(모델 없이 가상 시나리오): 60턴 분석을 1.7.0 방식/1.7.1 방식으로 각각 쌓아 주입 블록을 비교한다.
// 실제 모델 응답이 아니라 '같은 사건을 두 방식으로 기록했다고 가정'한 추정치다. 실측 방법은 docs/MEASURE-v1.7.1.md.
import { applyAnalysis } from "../src/engine/memoryapply.js";
import { validate, SYSTEM_PROMPT } from "../src/engine/memoryprompt.js";
import { buildBlock, estimateTokens } from "../src/engine/memoryinject.js";
import { hashText } from "../src/engine/chattext.js";

const N = 60, names = ["미나", "하루", "소라", "도윤"];
// 의미 있는 사건 [턴, 사람, 기록, 1.7.1에서 추가로 붙는 필드]
const key = [
  [5, "미나", "커피를 즐겨 마신다고 말함", { attr: { c: "pref", k: "drink", v: "커피" }, keys: ["커피"] }, { p: 2, s: 1, r: 0 }],
  [8, "하루", "낡은 열쇠를 서랍에서 발견함", { keys: ["열쇠", "서랍"] }, { p: 1, s: 1, r: 1 }],
  [12, "하루", "미나 몰래 편지를 태움", { keys: ["편지"] }, { p: 2, s: 2, r: 1, know: ["하루"] }],
  [20, "하루", "미나가 자신을 의심하는 듯함", { kd: "i", fc: "L", ic: "L" }, { p: 1, s: 1, r: 1 }],
  [30, "소라", "금요일에 하루를 도와주기로 약속함", { keys: ["약속", "금요일"] }, { p: 2, s: 2, r: 1 }],
  [40, "미나", "이제는 차를 좋아한다고 말함", { attr: { c: "pref", k: "drink", v: "차" }, keys: ["차"] }, { p: 2, s: 2, r: 0 }],
  [45, "도윤", "하루의 비밀을 알게 됨", { kd: "f", fc: "H" }, { p: 3, s: 3, r: 2, know: ["도윤"] }]
];
const build = (v171) => {
  const f = { people: {}, scenes: [], rels: {}, open: [], runs: 0, done: [] };
  for (let t = 0; t < N; t++) {
    const k = key.find((x) => x[0] === t), nm = names[t % 4];
    const people = k ? [{ name: k[1], act: k[2], ...k[4], ...(v171 ? k[3] : {}) }] : [{ name: nm, act: `일상 행동 ${t}번`, p: t % 7 === 0 ? 2 : 0, s: 0, r: 0 }];
    const raw = { people, scene: { sum: k ? k[2] : `평범한 장면 ${t}`, place: t < 30 ? "카페" : "학교", who: [people[0].name], changed: !!k || t % 15 === 0 } };
    if (t === 30) raw.open = { add: [{ text: "소라가 금요일에 하루를 돕기로 함", kind: "promise", who: ["소라", "하루"] }] };
    if (t === 25) raw.rel = [{ from: "미나", to: "하루", d: "서먹해짐", dir: "-" }];
    if (v171 && t === 25) raw.emo = [{ from: "미나", to: "하루", t: { trust: -2 }, why: "편지 일을 눈치챔" }];
    if (v171 && t === 45) raw.pov = [{ who: ["하루", "도윤"], view: "하루는 숨겼다고 믿고 도윤은 이미 안다", why: "정보 차이" }];
    applyAnalysis(f, validate(raw), { at: t, mid: "m" + t, h: hashText("msg" + t) });
  }
  return f;
};
const old = build(false), neu = build(true);
const blk = (f, recent, s = {}) => buildBlock(f, { messageCount: N, recentText: recent, settings: { recentSkip: 0, ...s } });
const probes = [
  ["열쇠 장면", "하루가 서랍에서 낡은 열쇠를 꺼냈다", ["열쇠를 서랍에서 발견"], []],
  ["취향 최신값", "하루가 미나에게 마실 것을 물었다", ["차를 좋아한다"], ["커피를 즐겨 마신다고"]],
  ["비밀/편지", "미나가 편지에 대해 물었다", ["편지를 태움"], []],
  ["열린 약속", "금요일이 되었다", ["금요일에 하루를 돕"], []],
  ["추정의 표시", "미나는 하루를 가만히 바라봤다", ["의심하는 듯"], []]
];
console.log("── ① 분석 호출 프롬프트 ──\n1.7.0 632 → 1.7.1", estimateTokens(SYSTEM_PROMPT), "(+" + (estimateTokens(SYSTEM_PROMPT) - 632) + "/호출)");
console.log("\n── ② 주입 블록 토큰 (60턴, 기록", Object.values(neu.people).flatMap((p) => p.records).length + "건) ──");
const gen = "하루가 미나에게 말했다";
for (const [n, f, s] of [["1.7.0 방식", old, {}], ["1.7.1 · 3단계 끔", neu, { stage3: false }], ["1.7.1 · 전체", neu, {}]]) console.log(n.padEnd(14), String(blk(f, gen, s).manifest.tokens).padStart(5), "토큰");
console.log("\n── ③ 검색 정확도·④ 이어쓰기 대용(프로브 5개) ──");
let sc = { old: [0, 0, 0], neu: [0, 0, 0] };
for (const [name, recent, need, avoid] of probes) {
  const row = [name.padEnd(10)];
  for (const [tag, f] of [["old", old], ["neu", neu]]) {
    const t = blk(f, recent).text, hit = need.every((x) => t.includes(x)), leak = avoid.some((x) => t.includes(x)), mark = /\[(inferred|uncertain|disputed)|추정|inferred/i.test(t);
    sc[tag][0] += hit; sc[tag][1] += !leak; sc[tag][2] += tag === "neu" ? (name === "추정의 표시" ? mark : 1) : (name === "추정의 표시" ? 0 : 1);
    row.push(`${tag === "old" ? "1.7.0" : "1.7.1"}: ${hit ? "포착" : "놓침"}${avoid.length ? (leak ? "·옛값섞임" : "·옛값배제") : ""}${name === "추정의 표시" ? (mark ? "·추정표시" : "·사실처럼") : ""}`);
  }
  console.log(row.join("  "));
}
console.log(`포착 ${sc.old[0]}/5 → ${sc.neu[0]}/5 · 옛값 배제 ${sc.old[1]}/5 → ${sc.neu[1]}/5`);
console.log("\n── 1.7.1 전체 블록 예시 ──\n" + blk(neu, "미나는 하루를 가만히 바라봤다").text);
