// 실시간 미리보기: 소스를 고치면 다시 묶어서 브라우저가 새로고침한다(e2e와 같은 가짜 호스트).
// node tools/preview.mjs [포트=5178] → http://localhost:5178/?chat=0&adv=1&light=1&tab=memory
import { context } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import { writeFileSync, mkdirSync } from "node:fs";
const port = Number(process.argv[2] ?? 5178);
mkdirSync(".preview", { recursive: true });
import("node:fs").then((fs) => fs.copyFileSync("tests/e2e/fixtures-recorder-wiki.json", ".preview/wikifix.json"));
writeFileSync(".preview/index.html", `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Dusk 미리보기</title><body style="margin:0;background:#111">
<script src="app.js"></script><script>
new EventSource("/esbuild").addEventListener("change", () => location.reload());
const q = new URLSearchParams(location.search), adv = q.get("adv") === "1";
const ui = { promptIntroDone: true, tourDone: true, tourVer: 99, onboardDone: true, uiMode: adv ? "advanced" : "simple", theme: { mode: q.get("light") === "1" ? "light" : "dark" } };
window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify(ui) }, { memory: true, story: true, mods: true, cards: true, noChat: q.get("chat") === "0", host: true, erosync: q.get("ero") !== "0", erosyncOn: q.get("eroon") === "1" })
  .then(async () => { if (q.get("wiki") === "1") return seedWiki(); const t = q.get("tab"); if (t) setTimeout(() => __app.ctx.go(t), 500); });
// ?wiki=1 인물 위키 목업: 애인·짝사랑·연표·감정·호칭·추억·갈등·오해를 채운 채 인물 상세를 연다(?who=세라 로 다른 인물)
async function seedWiki() {
  await new Promise((r) => setTimeout(r, 400));
  // 목업 유저(페르소나) 이름 = 미오
  { const api = __app.ctx.api, g = api.getDatabase?.bind(api); if (g) api.getDatabase = async (k) => ({ ...((await g(k)) ?? {}), username: "미오", personas: [{ id: "p1", name: "미오" }], selectedPersona: 0 }); }
  const wiki = JSON.parse((await (await fetch("wikifix.json")).text()).replaceAll("선생님", "미오"));   // 목업 유저(주인공) 이름은 미오   // tests/e2e/fixtures-recorder-wiki.json(수아·도윤·서진, 성향·NSFW 후보 포함)
  const L = window.__testLib, rec = (id, act, g, at) => ({ id, act, g, at, at_ms: 1700000000000 + at * 6e4, orphan: false, user: false, pin: false });
  let w = wiki;
  // 수아: 월경·임신 칸 + 성적 욕망·이상성향 후보(NSFW 탭이 꽉 차게)
  const sua = Object.values(w.documents).find((d) => d.title === "수아");
  if (sua) {
    sua.sections.push({ id: "section-cycle-mock", heading: "월경·임신", body: "주기: 28일\\n기준일: 2026-03-02\\n날짜: 2026-03-16 (배란기)", provenance: { kind: "program", slotId: "cycle.state", targetRefs: [] } });
    w.people.candidates = { ...(w.people.candidates ?? {}),
      "cand-m1": { id: "cand-m1", documentId: sua.id, axis: "sexual_desire", status: "review", pattern: "불안할 때 스킨십으로 안정을 찾으려 한다", evidence: [{}, {}, {}] },
      "cand-m2": { id: "cand-m2", documentId: sua.id, axis: "paraphilia", status: "collecting", pattern: "소유당하는 느낌에 끌린다", evidence: [{}] } };
  }
  try { w = L.createBlankPerson(w, "미오"); } catch {}
  if (q.get("many") === "1") for (const n of ["하루", "나기", "카즈사", "요시미", "아이리", "레이사", "치세", "히나", "아코", "이로하", "츠루기", "하스미", "마시로", "코하루", "하나코", "아즈사"]) { try { w = L.createBlankPerson(w, n); } catch {} }
  await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
    f.wiki = w;
    // 사람다움·잠자리·성감대·몸과 마음 계산 목업(수아)
    if (sua) {
      f.cursor = { ...(f.cursor ?? {}), at: 40 };
      f.nsfw = { ...(f.nsfw ?? {}), [sua.id]: { sexual: { eroticInterest: 72, sexualSpontaneity: 40, sexualOpenness: 55, sexualMomentum: 50 }, axes: { initiative: 35, directness: 30 }, pref: { f: 10, m: 90, x: 0 },
        positions: [{ label: "정상위", preference: "preferred", kind: "position", reason: "얼굴 보는 게 좋아서" }, { label: "침대", preference: "preferred", kind: "place", reason: "" }, { label: "야외", preference: "disliked", kind: "place", reason: "들킬까 봐" }],
        seduction: null, humor: null, by: "ai", at: new Date().toISOString(), log: [],
        human: { speech: ["~잖아요", "말끝을 흐림"], habit: ["불안하면 손톱 깨물기"], trigger: ["남편의 외도"], dream: ["작은 꽃집 열기"], secret: ["이혼 서류를 숨겨 둠"], love: "말없이 챙겨 주기", anger: "말수가 줄고 혼자 있으려 함", sad: "밤에 몰래 욺" },
        ext: { first: "스무 살, 첫 연애", fantasy: ["누가 강하게 이끌어 주기"], voice: "참다가 새는 숨소리", after: "꼭 안겨 있으려 함", yes: ["숨이 가빠짐", "이름을 부름"], no: ["몸이 굳음"], contra: "꼭 챙김" },
        lustMult: 1.3, boost: { desire: true }, past: [{ name: "도윤", count: 40, est: true }],
        zones: [{ part: "neck", level: 3, note: "숨만 닿아도 움츠림", dev: 88 }, { part: "ears", level: 2, note: "", dev: 64 }, { part: "back", level: 2, note: "등줄기" }, { part: "thighs", level: 1, note: "", dev: 34 }, { part: "nipples", level: 0, note: "", dev: 18 }] } };
      f.life = { turn: 40, p: { [sua.id]: { lust: +(q.get("lust") ?? 84), refr: -1, fat: 45, seen: 40, seenPrev: 31, sex: { n: 3, last: 22, first: { turn: 12, date: "2026-03-05" }, by: { "미오": { name: "미오", n: 3, first: { turn: 12, date: "2026-03-05" } } } },
        uses: { "정상위": 3, "키스하며": 2 }, lover: {}, met: { "미오": { name: "미오", turn: 1, date: "2026-03-01" }, "도윤": { name: "도윤", turn: 3, date: "2026-03-02" } },
        temp: { "미오": { name: "미오", h: [8, 10, 12, 15, 18], trust: [3, 4, 4, 6, 7] }, "도윤": { name: "도윤", h: [9, 7, 4, 2], trust: [6, 5, 3, 2] } },
        mood: { anxiety: 45, excitement: 30 }, habits: { "미오": { name: "미오", list: ["밤마다 '잘 자' 문자", "손가락 걸고 약속"] } }, sat: [1, 0],
        trace: [{ turn: 36, text: "자연 +3.1 (가임기·끌림·밤)" }, { turn: 37, text: "키스 +6" }, { turn: 38, text: "대화 +12 “목덜미에 숨이 닿자”" }, { turn: 40, text: "자연 +2.4 (가임기·끌림)" }] } } };
      const dy = Object.values(w.documents).find((d) => d.title === "도윤"), sj = Object.values(w.documents).find((d) => d.title === "서진");
      if (dy) { f.nsfw[dy.id] = { sexual: { eroticInterest: 60 }, axes: {}, positions: [], by: "ai", log: [] }; f.life.p[dy.id] = { lust: 41, refr: -1, fat: 20, mood: { irritation: 55 }, sex: { n: 0, by: {} }, uses: {}, met: {}, lover: {}, temp: {} }; }
      if (sj) f.life.p[sj.id] = { lust: 10, refr: -1, fat: 70, mood: {}, sex: { n: 0, by: {} }, uses: {}, met: {}, lover: {}, temp: {} };
    }
    f.people["수아"] = { name: "수아", records: [rec("s1", "외도 의심을 미오에게 털어놓았다", "A", 3), rec("s2", "장례식장에서 오열했다", "A", 5), rec("s3", "미오에게 고백했다", "A", 9), rec("s4", "서진과 말다툼을 했다", "B", 12), rec("s5", "미오과 우산을 같이 썼다", "B", 14), rec("s6", "도윤의 휴대폰을 몰래 봤다", "C", 2)] };
    f.people["도윤"] = { name: "도윤", records: [rec("d1", "셔츠에 향수 냄새를 남겼다", "C", 3)] };
    f.people["서진"] = { name: "서진", records: [rec("j1", "도윤과 몰래 만났다", "B", 2), rec("j2", "수아를 몰래 지켜봤다", "B", 6)] };
    f.people["미오"] = { name: "미오", records: [rec("u1", "수아를 위로했다", "B", 4)] };
    f.orient = { "수아": { g: "f" }, "서진": { g: "f" }, "미오": { g: "m" }, "도윤": { g: "m" } };
    f.lovers = { "미오~수아": { on: true, a: "수아", b: "미오", kind: "애인" } };
    f.romance = { firsts: { met: { "미오~수아": { at: 1, a: "수아", b: "미오" } }, fight: { "서진~수아": { at: 12, a: "수아", b: "서진" } } }, events: [
      { kind: "confess", a: "수아", b: "미오", by: "수아", at: 8 }, { kind: "accept", a: "수아", b: "미오", at: 9 }, { kind: "jealous", a: "수아", b: "미오", c: "서진", at: 15 }, { kind: "reunion", a: "수아", b: "미오", gap: 16, at: 31 }, { kind: "rivalry", a: "수아", b: "서진", over: "미오", at: 16 }] };
    f.emo = {
      "수아>미오": { from: "수아", to: "미오", tags: { affection: 8, attraction: 9, trust: 7, possess: 6, exclusive: 5, dependence: 6, respect: 5, fear: 2 }, log: [] },
      "미오>수아": { from: "미오", to: "수아", tags: { affection: 7, attraction: 6, trust: 6 }, log: [] },
      "수아>도윤": { from: "수아", to: "도윤", tags: { affection: 3, hostility: 5, trust: 1 }, log: [] },
      "서진>수아": { from: "서진", to: "수아", tags: { attraction: 6, hostility: 3 }, log: [] },
      "수아>서진": { from: "수아", to: "서진", tags: { hostility: 7, fear: 3, affection: 2, attraction: 1 }, log: [] },
    };
    f.talk = { t1: { from: "수아", to: "미오", call: "미오", tone: "formal" }, t2: { from: "미오", to: "수아", call: "수아 씨", tone: "mixed", prev: { call: "수아 님", tone: "formal" } } };
    f.faces = { fc1: { who: "수아", to: "미오", alone: "기대고 솔직하게 운다", public: "아무 일 없는 척 웃는다" } };
    f.bonds = [{ id: "bd1", a: "수아", b: "미오", moment: "장례식 뒤 편의점 앞에서 캔커피를 나눠 마셨다", hook: "캔커피, 편의점" }, { id: "bd2", a: "수아", b: "미오", moment: "비 오는 날 우산을 같이 썼다", hook: "비" }];
    f.rifts = [{ id: "rf1", a: "수아", b: "미오", about: "서진과 단둘이 만난 일", state: "apologized", grudge: "some", who: "수아" }];
    f.exp = { e1: { a: "수아", b: "미오", ae: "매일 연락해 주길 바란다", as: false, be: "혼자 있는 시간도 필요하다", bs: true } };
    // ── 관계도 풍부하게: 인물 9명, 턴 1~32에 걸친 감정 기록(시점 막대), 장면, 관계 변화, 오래가는 관계, 인물끼리 끌림 ──
    const cast = ["수아", "서진", "도윤", "시로코", "호시노", "유나", "하루", "나기"];
    const lines = { 수아: [[1, "미오와 처음 만났다"], [5, "장례식장에서 오열했다"], [9, "미오에게 고백했다"], [14, "미오와 우산을 같이 썼다"], [22, "서진과 크게 다퉜다"], [31, "미오와 다시 만났다"]],
      서진: [[2, "도윤과 몰래 만났다"], [6, "수아를 몰래 지켜봤다"], [16, "미오에게 다가갔다"], [24, "도윤과 헤어졌다"]],
      도윤: [[3, "셔츠에 향수 냄새를 남겼다"], [12, "수아에게 사과했다"], [24, "서진과 헤어졌다"]],
      시로코: [[4, "미오와 순찰을 돌았다"], [11, "호시노를 걱정했다"], [20, "미오에게 도시락을 줬다"], [28, "호시노와 화해했다"]],
      호시노: [[7, "낮잠을 자다 미오에게 들켰다"], [11, "시로코와 말다툼을 했다"], [28, "시로코와 화해했다"]],
      유나: [[8, "미오에게 길을 물었다"], [18, "하루와 다퉜다"], [26, "미오를 몰래 좋아하게 됐다"]],
      하루: [[10, "유나의 언니라고 밝혔다"], [18, "유나와 다퉜다"], [30, "미오에게 고민을 털어놓았다"]],
      나기: [[13, "미오를 경계했다"], [21, "미오에게 도움을 받았다"], [29, "미오를 믿기 시작했다"]] };
    for (const n of cast) f.people[n] = { name: n, records: [...(f.people[n]?.records ?? []), ...lines[n].map(([at, act], i) => rec("r-" + n + "-" + i, act, i === 0 ? "B" : at % 3 ? "C" : "A", at))] };
    f.scenes = Array.from({ length: 32 }, (_, i) => ({ id: "sc" + i, at: i + 1, sum: (i + 1) + "번째 장면", place: ["교실", "옥상", "복도", "카페", "장례식장"][i % 5], who: ["미오", cast[i % cast.length], cast[(i + 3) % cast.length]], orphan: false }));
    // 미오(유저) 쪽 감정: 턴마다 조금씩 쌓인 기록(log) — 시점 막대를 움직이면 바뀐다
    const arc = { 수아: [[1, { affection: 3, attraction: 2, trust: 2 }], [9, { affection: 6, attraction: 7, trust: 5 }], [14, { affection: 8, attraction: 9, trust: 7, possess: 6, exclusive: 5, dependence: 6, respect: 5, fear: 2 }]],
      서진: [[2, { affection: 2, hostility: 1 }], [16, { affection: 3, attraction: 6, hostility: 3 }]],
      도윤: [[3, { trust: 3, affection: 3 }], [12, { trust: 1, affection: 2, hostility: 5 }]],
      시로코: [[4, { trust: 4, affection: 4, respect: 3 }], [20, { trust: 8, affection: 7, attraction: 4, respect: 6 }]],
      호시노: [[7, { affection: 3, trust: 3 }], [28, { affection: 6, trust: 6, attraction: 2 }]],
      유나: [[8, { affection: 2 }], [26, { affection: 5, attraction: 6, dependence: 3 }]],
      하루: [[10, { trust: 2, respect: 3 }], [30, { trust: 6, affection: 5, respect: 5 }]],
      나기: [[13, { fear: 3, hostility: 4 }], [21, { fear: 2, hostility: 2, trust: 3 }], [29, { trust: 6, affection: 4, hostility: 1 }]] };
    const mkPair = (from, to, steps) => ({ from, to, tags: { ...steps.at(-1)[1] }, log: steps.map(([at, t]) => ({ at, t })) });
    for (const [n, st] of Object.entries(arc)) f.emo[n + ">미오"] = mkPair(n, "미오", st);
    Object.assign(f.emo, {
      "미오>수아": mkPair("미오", "수아", [[1, { affection: 3 }], [10, { affection: 7, attraction: 6, trust: 6 }]]),
      "서진>도윤": mkPair("서진", "도윤", [[2, { attraction: 7, affection: 5 }], [24, { attraction: 2, affection: 2, hostility: 6 }]]),
      "도윤>서진": mkPair("도윤", "서진", [[2, { attraction: 6 }], [24, { attraction: 3, hostility: 4 }]]),
      "서진>수아": mkPair("서진", "수아", [[6, { hostility: 3 }], [22, { hostility: 7, fear: 3, affection: 2, attraction: 1 }]]),
      "수아>서진": mkPair("수아", "서진", [[22, { hostility: 7, fear: 3, affection: 2, attraction: 1 }]]),
      "시로코>호시노": mkPair("시로코", "호시노", [[4, { affection: 6, respect: 7 }], [11, { affection: 5, hostility: 3 }], [28, { affection: 8, trust: 8 }]]),
      "호시노>시로코": mkPair("호시노", "시로코", [[11, { affection: 6, hostility: 2 }], [28, { affection: 8, trust: 7, attraction: 3 }]]),
      "유나>하루": mkPair("유나", "하루", [[10, { affection: 7, trust: 6 }], [18, { affection: 5, hostility: 4 }]]),
      "하루>유나": mkPair("하루", "유나", [[10, { affection: 8, trust: 7 }], [18, { affection: 7, hostility: 2 }]]),
      "유나>시로코": mkPair("유나", "시로코", [[20, { attraction: 4 }]]),
    });
    // 관계 변화 기록(선 이름)과 오래가는 관계(tie)
    const it = (at, d, dir) => ({ at, d, dir });
    f.rels = { "서진>도윤": { from: "서진", to: "도윤", items: [it(2, "몰래 만나는 사이", "+"), it(24, "헤어졌다", "-")] },
      "시로코>호시노": { from: "시로코", to: "호시노", items: [it(4, "같은 위원회 선후배", "+"), it(11, "말다툼", "-"), it(28, "화해했다", "+")] },
      "유나>하루": { from: "유나", to: "하루", items: [it(10, "자매", "+"), it(18, "다퉜다", "-")] },
      "수아>서진": { from: "수아", to: "서진", items: [it(22, "크게 다퉜다", "-")] },
      "나기>시로코": { from: "나기", to: "시로코", items: [it(13, "소꿉친구", "+")] } };
    f.ties = { t1: { a: "유나", b: "하루", kind: "자매", at: 10 }, t2: { a: "시로코", b: "호시노", kind: "선후배", at: 4 }, t3: { a: "도윤", b: "서진", kind: "전 애인", at: 24, prev: { kind: "연인", at: 2 } }, t4: { a: "나기", b: "시로코", kind: "소꿉친구", at: 13 } };
    // ── 같은 8명을 서로 복잡하게: 삼각관계·비밀 연애·짝사랑·이별·연적·질투·오래된 앙금 ──
    Object.assign(f.emo, {
      "시로코>나기": mkPair("시로코", "나기", [[13, { affection: 6, trust: 7 }], [21, { affection: 6, trust: 7, attraction: 5 }]]),
      "나기>시로코": mkPair("나기", "시로코", [[13, { affection: 7, trust: 8, attraction: 6 }], [29, { affection: 8, trust: 8, attraction: 7, possess: 3 }]]),
      "나기>호시노": mkPair("나기", "호시노", [[11, { hostility: 4 }], [28, { hostility: 5, fear: 1 }]]),
      "호시노>나기": mkPair("호시노", "나기", [[28, { hostility: 3, affection: 2 }]]),
      "유나>도윤": mkPair("유나", "도윤", [[12, { attraction: 5, affection: 4 }], [25, { attraction: 6, affection: 5 }]]),
      "도윤>유나": mkPair("도윤", "유나", [[25, { affection: 4, attraction: 3 }]]),
      "하루>도윤": mkPair("하루", "도윤", [[18, { hostility: 6, trust: 1 }]]),
      "하루>서진": mkPair("하루", "서진", [[20, { affection: 5, trust: 6 }], [27, { affection: 6, trust: 7, attraction: 6 }]]),
      "서진>하루": mkPair("서진", "하루", [[27, { affection: 5, trust: 5, attraction: 4 }]]),
      "수아>시로코": mkPair("수아", "시로코", [[15, { trust: 6, affection: 6, respect: 5 }]]),
      "시로코>수아": mkPair("시로코", "수아", [[15, { trust: 5, affection: 5 }]]),
      "수아>도윤": mkPair("수아", "도윤", [[3, { affection: 6, trust: 4 }], [12, { affection: 3, trust: 1, hostility: 5 }]]),
      "도윤>수아": mkPair("도윤", "수아", [[12, { affection: 4, dependence: 3, fear: 2 }]]),
      "호시노>유나": mkPair("호시노", "유나", [[19, { affection: 5, trust: 4 }]]),
      "유나>호시노": mkPair("유나", "호시노", [[19, { affection: 6, trust: 5, dependence: 4 }]]),
      "서진>시로코": mkPair("서진", "시로코", [[23, { hostility: 3 }]]),
      "시로코>서진": mkPair("시로코", "서진", [[23, { hostility: 4, trust: 1 }]]),
      "하루>나기": mkPair("하루", "나기", [[21, { attraction: 6, affection: 5 }]]),
    });
    f.rels = { ...f.rels,
      "시로코>나기": { from: "시로코", to: "나기", items: [it(13, "소꿉친구", "+"), it(21, "다시 가까워짐", "+")] },
      "나기>호시노": { from: "나기", to: "호시노", items: [it(11, "시로코 일로 대립", "-"), it(28, "여전히 불편", "-")] },
      "유나>도윤": { from: "유나", to: "도윤", items: [it(12, "몰래 연락", "+"), it(25, "자주 만남", "+")] },
      "하루>도윤": { from: "하루", to: "도윤", items: [it(18, "동생 일로 경고", "-")] },
      "하루>서진": { from: "하루", to: "서진", items: [it(20, "위로해 줌", "+"), it(27, "비밀을 나눔", "+")] },
      "수아>도윤": { from: "수아", to: "도윤", items: [it(3, "부부", "+"), it(12, "외도를 알게 됨", "-")] },
      "호시노>유나": { from: "호시노", to: "유나", items: [it(19, "상담해 줌", "+")] },
      "서진>시로코": { from: "서진", to: "시로코", items: [it(23, "말다툼", "-")] },
      "수아>시로코": { from: "수아", to: "시로코", items: [it(15, "의지하는 후배", "+")] } };
    f.ties = { ...f.ties, t5: { a: "수아", b: "도윤", kind: "배우자", at: 3 }, t6: { a: "하루", b: "서진", kind: "연인", at: 27 } };
    f.romance.secret = { ...(f.romance.secret ?? {}), "서진~하루": true };
    f.romance.events.push(
      { kind: "confess", a: "나기", b: "시로코", by: "나기", at: 20 }, { kind: "reject", a: "나기", b: "시로코", by: "시로코", at: 21 },
      { kind: "accept", a: "하루", b: "서진", at: 27 }, { kind: "breakup", a: "도윤", b: "서진", at: 24 },
      { kind: "rivalry", a: "수아", b: "서진", over: "미오", at: 16 }, { kind: "rivalry", a: "나기", b: "호시노", over: "시로코", at: 28 },
      { kind: "jealous", a: "하루", b: "서진", c: "도윤", at: 29 }, { kind: "jealous", a: "수아", b: "미오", c: "유나", at: 26 });
    f.romance.awkward = { ...(f.romance.awkward ?? {}), "나기~시로코": 29 };
    f.orient = { ...(f.orient ?? {}), 시로코: { g: "f" }, 호시노: { g: "f" }, 유나: { g: "f" }, 하루: { g: "f" }, 나기: { g: "m" } };
    if (q.get("many") === "1") for (const n of ["하루", "나기", "카즈사", "요시미", "아이리", "레이사", "치세", "히나", "아코", "이로하", "츠루기", "하스미", "마시로", "코하루", "하나코", "아즈사"]) { f.people[n] = { name: n, records: [rec("m-" + n, n + "와 복도에서 마주쳤다", "C", 20)] }; f.emo["수아>" + n] = { from: "수아", to: n, tags: { affection: 3, trust: 2 }, log: [] }; }
    f.beliefs = [{ id: "bl1", who: "수아", by: "서진", thinks: "미오이 서진을 좋아한다", truth: "업무 때문에 만났을 뿐이다", open: true }];
    // 장기기억 데이터에서 유저는 {{user}}로 저장된다(화면에는 페르소나 이름 미오로 보임)
    for (const k of ["emo", "lovers", "romance", "talk", "faces", "bonds", "rifts", "exp", "beliefs", "rels", "ties"]) if (f[k]) f[k] = JSON.parse(JSON.stringify(f[k]).replaceAll("미오", "{{user}}"));
    f.scenes = f.scenes.map((sc) => ({ ...sc, who: (sc.who ?? []).map((w) => (w === "미오" ? "{{user}}" : w)) }));
  }, { chaId: "c1", chatId: "t1" });
  // Erosync 가짜 스냅샷(성인 항목 카드가 채워지게)
  const snap = { ok: true, people: [
    { id: "a", name: "수아", aliases: [], axes: [{ axis: "initiative", base: 40, value: 55 }, { axis: "extremity", base: 30, value: 35 }, { axis: "obsessiveness", base: 60, value: 72 }, { axis: "submissiveness", base: 55, value: 60 }], sexual: { eroticInterest: 62, sexualOpenness: 48 }, pref: { f: 10, m: 90, x: 0, total: 100 },
      detail: { likes: [{ label: "다정한 스킨십", preference: 80, confidence: 70, reason: "미오에게 기댈 때" }], dislikes: [{ label: "거친 말", preference: -70, confidence: 60 }] } },
    { id: "b", name: "미오", aliases: [], axes: [{ axis: "initiative", base: 50, value: 50 }], sexual: { eroticInterest: 40, sexualOpenness: 40 }, pref: { f: 80, m: 20, x: 0, total: 100 } },
    { id: "c", name: "서진", aliases: [], axes: [{ axis: "initiative", base: 75, value: 80 }], sexual: { eroticInterest: 70, sexualOpenness: 75 }, pref: { f: 30, m: 70, x: 0, total: 100 } },
    { id: "d", name: "유나", aliases: [], axes: [{ axis: "initiative", base: 80, value: 85 }], sexual: { eroticInterest: 85, sexualOpenness: 80 }, pref: { f: 40, m: 60, x: 0, total: 100 } },
    { id: "e", name: "도윤", aliases: [], axes: [{ axis: "initiative", base: 60, value: 65 }], sexual: { eroticInterest: 50, sexualOpenness: 45 }, pref: { f: 70, m: 30, x: 0, total: 100 } },
    { id: "f", name: "나기", aliases: [], axes: [{ axis: "initiative", base: 30, value: 30 }], sexual: { eroticInterest: 20, sexualOpenness: 25 }, pref: { f: 50, m: 50, x: 0, total: 100 } },
    { id: "h", name: "호시노", aliases: [], axes: [{ axis: "initiative", base: 20, value: 25 }], sexual: { eroticInterest: 30, sexualOpenness: 30 }, pref: { f: 60, m: 40, x: 0, total: 100 } },
    { id: "g", name: "시로코", aliases: [], axes: [{ axis: "initiative", base: 25, value: 30 }], sexual: { eroticInterest: 35, sexualOpenness: 20 }, pref: { f: 80, m: 20, x: 0, total: 100 } }],
    goals: [{ id: "g1", actor: "c", actorName: "서진", target: "b", targetName: "미오", typeLabel: "유혹 목표", priority: 60, objective: "단둘이 되기" },
      { id: "g2", actor: "d", actorName: "유나", target: "e", targetName: "도윤", typeLabel: "유혹 목표", priority: 55, objective: "언니 몰래 만나기" },
      { id: "g3", actor: "f", actorName: "나기", target: "g", targetName: "시로코", typeLabel: "다시 고백", priority: 45, objective: "분위기 좋을 때" }],
    rivalries: [{ actor: "c", actorName: "서진", rival: "a", rivalName: "수아", intensity: 55, reason: "미오를 두고" }, { actor: "f", actorName: "나기", rival: "h", rivalName: "호시노", intensity: 40, reason: "시로코를 두고" }],
    relations: [{ from: "a", fromName: "수아", to: "b", toName: "미오", affection: 80, eroticAttraction: 70, hatred: 0 }, { from: "c", fromName: "서진", to: "a", toName: "수아", affection: 10, eroticAttraction: 20, hatred: 40 }] };
  const fake = { on: () => true, isRunning: () => true, read: async () => snap };
  try { Object.defineProperty(__app.ctx, "erosync", { configurable: true, get: () => fake }); } catch {}
  // 목업 전용: 장기 기억 고급 모드·월경 기록·성적 욕망을 켠 것처럼(실제 설정은 건드리지 않음)
  const M = __app.ctx.memory;
  if (M.flow?.settings) { const o = M.flow.settings.bind(M.flow); M.flow.settings = async () => { const st = await o(); const raw = st.rawSnapshot(); const x = Object.create(st); x.rawSnapshot = () => ({ ...raw, sexualDesireEnabled: true, features: { ...(raw.features ?? {}), openness: { ...(raw.features?.openness ?? {}), cycle: true } } }); return x; }; }
  await M.store.updateIndex((i) => { i.settings ??= {}; i.settings.flow = { ...(i.settings.flow ?? {}), on: true, advanced: true }; }).catch(() => {});
  Object.assign(__app.ctx.state.mem ??= {}, { botId: "c1", chatIndex: 0, personKey: q.get("who") || "수아", tab: "people", page: "detail" });
  __app.ctx.state.mem.wkLayout = q.get("lay") ?? "B4";
  __app.ctx.go(q.get("tab") === "relmap" ? "relmap" : "memory");
}
// 미리보기 전용: 오른쪽 위 ‘채팅 켬/끔’ 단추(지금 탭을 유지한 채 다시 불러온다)
const chatOn = q.get("chat") !== "0", tg = document.createElement("button");
tg.textContent = chatOn ? "채팅 켬" : "채팅 끔";
tg.style.cssText = "position:fixed;top:8px;right:8px;z-index:2147483647;padding:6px 12px;border-radius:999px;font:600 12px system-ui;cursor:pointer;border:1px solid " + (chatOn ? "#5fe0a8" : "#888") + ";background:" + (chatOn ? "rgba(95,224,168,.2)" : "rgba(0,0,0,.6)") + ";color:" + (chatOn ? "#c9ffe6" : "#ddd");
tg.onclick = () => { const n = new URLSearchParams(location.search); n.set("chat", chatOn ? "0" : "1"); const t = window.__app?.ctx?.state?.tab; if (t) n.set("tab", t); location.search = n; };
if (q.get("wiki") !== "1") document.body.append(tg);   // 위키 목업은 사진 찍기 편하게 단추 없이
</script>`);
const ctx = await context({ entryPoints: { app: "tests/e2e/app.entry.js" }, bundle: true, outdir: ".preview", format: "iife", platform: "browser", logLevel: "info",
  define: { __VERSION__: '"preview"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
await ctx.watch();
await ctx.serve({ servedir: ".preview", port });
console.log(`미리보기: http://localhost:${port}/  (옵션: ?chat=0 채팅 없음 · ?adv=1 고급 모드 · ?light=1 밝게 · ?tab=memory · ?ero=0 Erosync 빼기 · ?eroon=1 Erosync 켠 채로 · ?wiki=1 인물 위키 목업)`);
