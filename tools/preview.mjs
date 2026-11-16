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
    { id: "c", name: "서진", aliases: [], axes: [{ axis: "initiative", base: 75, value: 80 }], sexual: { eroticInterest: 70, sexualOpenness: 75 }, pref: { f: 30, m: 70, x: 0, total: 100 } }],
    goals: [{ id: "g1", actor: "c", actorName: "서진", target: "b", targetName: "미오", typeLabel: "유혹 목표", priority: 60, objective: "단둘이 되기" }],
    rivalries: [{ actor: "c", actorName: "서진", rival: "a", rivalName: "수아", intensity: 55, reason: "미오을 두고" }],
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
