// Erosync 인물 위키 칸 + 관계도 Erosync 층 (가짜 ctx.erosync로 실제 화면 클릭)
import { createRequire } from "node:module";
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
const { chromium } = createRequire("/opt/npm-tools/node_modules/")("playwright");
const r = await build({ entryPoints: ["tests/e2e/app.entry.js"], bundle: true, write: false, format: "iife", platform: "browser", logLevel: "error", define: { __VERSION__: '"test"', __CHANGELOG__: '""' }, alias: { fflate: process.cwd() + "/src/vendor/fflate.js" }, loader: { ".json": "json" } });
const out = [], ok = (n, c, x = "") => { out.push(c); console.log((c ? "✔ " : "✘ ") + n + (c ? "" : "  → " + x)); };
const browser = await chromium.launch();
const NAMES = ["리안", "카엘", "미라", "브람", "세라핀", "하윤"];
for (const [tag, vp] of [["PC", { width: 1280, height: 900 }], ["모바일", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage(); page.setDefaultTimeout(5000);
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.setContent("<!doctype html><body style='margin:0'></body>"); await page.addScriptTag({ content: r.outputFiles[0].text });
  await page.evaluate(() => window.bootApp({ "rbm:seenVersion:v1": "9.9.9", "rbm:ui:v1": JSON.stringify({ promptIntroDone: true, tourDone: true, tourVer: 99, uiMode: "advanced" }) }, { memory: true, story: true }));
  await page.waitForTimeout(500);
  await page.evaluate(async (names) => {
    await __app.ctx.memory.store.updateFolder("c1", "t1", (f) => {
      f.people = f.people ?? {};
      names.forEach((n, i) => { f.people[n] = { name: n, aliases: [], records: Array.from({ length: (i % 4) + 1 }, (_, k) => ({ id: `${n}${k}`, act: `${n}의 일 ${k}`, g: "B", at: k + 3 + i, orphan: false })) }; });
      f.emo = Object.fromEntries(names.map((n, i) => [`${n}>u`, { from: n, to: "{{user}}", tags: i % 2 ? { hostility: 5 } : { affection: 3 + i, trust: 4 }, log: [] }]));
      f.rels = { a: { from: "리안", to: "카엘", items: [{ d: "정적", dir: "-", at: 8 }] }, b: { from: "미라", to: "리안", items: [{ d: "호감", dir: "+", at: 7 }] }, c: { from: "브람", to: "하윤", items: [{ d: "거래", dir: "0", at: 6 }] } };
      f.scenes = [{ id: "s1", who: ["리안", "{{user}}"], orphan: false, at: 8 }];
    });
  }, NAMES);
  // 가짜 Erosync: 켜져 있고, 리안·카엘 사이 목표/경쟁이 있다
  await page.evaluate(() => {
    const snap = { ok: true, scope: {}, turnIndex: 5, contentMode: "nsfw", people: [
      { id: "p1", name: "리안", aliases: [], role: "메인", axes: [{ axis: "initiative", base: 60, value: 80 }, { axis: "extremity", base: 30, value: 30 }], interest: 70, sexual: { eroticInterest: 70, sexualOpenness: 55 }, pref: { f: 40, m: 60, x: 0, total: 100 }, nonPerson: false, sfw: false },
      { id: "p2", name: "카엘", aliases: [], role: "주요", axes: [{ axis: "initiative", base: 40, value: 40 }], sexual: null, nonPerson: false, sfw: false },
      { id: "p3", name: "시로코", aliases: [], role: "메인", axes: [{ axis: "initiative", base: 60, value: 80 }, { axis: "extremity", base: 30, value: 30 }], sexual: { eroticInterest: 70, sexualOpenness: 55 }, pref: { f: 40, m: 60, x: 0, total: 100 }, nonPerson: false, sfw: false },
      { id: "p4", name: "호시노", aliases: [], role: "주요", axes: [{ axis: "initiative", base: 40, value: 40 }], sexual: null, nonPerson: false, sfw: false },
      { id: "p5", name: "엑스트라", aliases: [], axes: [], sexual: null }
    ], goals: [{ id: "g2", actor: "p3", actorName: "시로코", target: "p4", targetName: "호시노", type: "flirt", typeLabel: "플러팅", status: "active", priority: 55, objective: "순찰 끝나고 둘이 남기", nextMove: "" },{ id: "g1", actor: "p1", actorName: "리안", target: "p2", targetName: "카엘", type: "sexual_intercourse", typeLabel: "성관계 목표", status: "active", priority: 70, objective: "단둘이 되기", nextMove: "자리를 옮기자고 한다" }],
    rivalries: [{ actor: "p2", actorName: "카엘", rival: "p1", rivalName: "리안", intensity: 40, reason: "" }],
    relations: [{ from: "p3", fromName: "시로코", to: "p4", toName: "호시노", affection: 70, eroticAttraction: 60, hatred: 0 }],
    rests: [{ actor: "p3", actorName: "시로코", target: "p4", targetName: "호시노", until: 8, left: 3 }],
    temp: [{ from: "p3", fromName: "시로코", to: "p4", toName: "호시노", points: [{ turn: 1, a: 50, e: 40, h: 0 }, { turn: 3, a: 60, e: 50, h: 5 }, { turn: 5, a: 70, e: 60, h: 0 }] }] };
    window.__opened = 0;
    __app.ctx.erosync = { isRunning: () => true, on: () => true, read: async () => snap, open: async () => true,
      config: async (patch) => { const st = (window.__cf ??= { mode: "normal", frequency: 55, autonomy: 70, goalPersistence: 70, cooldownTurns: 2, maxActorsPerTurn: 2, recentMessages: 14, progressiveFollowUp: true, autoVerifyCharacters: true, autoRefreshProfiles: false, developmentMode: "review" }); if (patch) Object.assign(st, patch); return { ok: true, maxActors: 10, values: { ...st } }; },
      prompts: async (patch) => { const st = (window.__pr ??= { changed: false, text: "기본 글" }); if (patch) { st.changed = !!patch.text; st.text = patch.text || "기본 글"; window.__prLast = patch; } return { ok: true, pages: [{ id: "director", name: "장면 판단", use: "", branchy: true, sections: [{ id: "director.role", title: "역할", desc: "", kind: "common", branches: ["common"], texts: { common: { text: st.text, base: "기본 글", changed: st.changed, missing: [] } } }] }] }; },
      profile: async (op, ...a) => { const w = window; w.__pf ??= { ov: {}, calls: [] }; w.__pf.calls.push([op, ...a]);
        if (op === "get") return { ok: true, id: a[0], name: "시로코", sfw: false, scalars: [{ key: "initiative", label: "주도성", base: 40, override: w.__pf.ov.initiative ?? null, sexual: false }, { key: "sexualOpenness", label: "성적 개방성", base: 55, override: null, sexual: true }],
          eroticInterest: { base: 50, override: null }, gender: { analysed: "여자", override: "" }, cycle: { override: "" }, pref: { base: { female: 10, male: 80, genderless: 10 }, override: null }, changed: false };
        if (op === "edit") { Object.assign(w.__pf.ov, a[1]); return { ok: true }; }
        if (op === "reset") { w.__pf.ov = {}; return { ok: true }; }
        if (op === "status") return { ok: true, running: false, message: "" };
        if (op === "start") return { ok: true, running: true };
        return { ok: true }; },
      guard: () => window.__gd ?? { on: false, obsessionCap: 20, sameTargetTurns: 3, restTurns: 4 }, loadGuard: async () => {}, setGuard: async (v) => { window.__gd = { ...(window.__gd ?? { on: false, obsessionCap: 20, sameTargetTurns: 3, restTurns: 4 }), ...v }; },
      presets: async () => (window.__ps ??= []).slice(),
      savePreset: async (name) => { if (!name.trim()) return { ok: false, reason: "이름을 적어 주세요" }; (window.__ps ??= []).push({ id: "x" + window.__ps.length, name, level: { contentMode: "nsfw" }, config: {}, guard: null }); return { ok: true, replaced: false, list: window.__ps.slice() }; },
      applyPreset: async (id) => { window.__psApplied = id; return { ok: true, name: id }; },
      deletePreset: async (id) => { window.__ps = (window.__ps ?? []).filter((p) => p.id !== id); return window.__ps.slice(); },
      tags: async (id) => (window.__tg ??= {})[id] ?? { likes: [], limits: [] },
      setTags: async (id, v) => { (window.__tg ??= {})[id] = v; window.__tgCalls = (window.__tgCalls ?? 0) + 1; return { ok: true, value: v }; },
      tempTrend: async (v) => { if (typeof v === "boolean") window.__tt = v; return window.__tt ?? true; },
      userTrack: async (v) => { if (typeof v === "boolean") window.__ut = v; return window.__ut ?? false; },
      review: async (op, id) => { const w = window; w.__rv ??= [{ id: "c1", actor: "p3", actorName: "시로코", target: "", targetName: "", scope: "global", trait: "initiative", label: "주도성", direction: "increase", pattern: "", motive: "", stage: "", confidence: 82, evidenceCount: 4, scenes: 3, step: 5, reasons: ["먼저 말을 걸었다"], status: "pending_review" }, { id: "c2", actor: "p3", actorName: "시로코", target: "p4", targetName: "호시노", scope: "relation", trait: "qualitative", label: "행동 경향", direction: "increase", pattern: "둘만 있을 때 말수가 늘어난다", motive: "", stage: "", confidence: 70, evidenceCount: 4, scenes: 3, step: 0, reasons: [], status: "pending_review" }];
        if (op === "list") return { ok: true, items: w.__rv.slice(), mode: "standard_auto" };
        w.__rvCalls = [...(w.__rvCalls ?? []), [op, id]]; w.__rv = w.__rv.filter((x) => x.id !== id); return { ok: true }; },
      undoScene: async () => { window.__undo = (window.__undo ?? 0) + 1; return { ok: true, left: 2, turnIndex: 4 }; },
      content: async (patch) => { const st = (window.__lv ??= { ok: true, contentMode: "nsfw", extremityLimit: "unlimited", nsfwPlus: false, recheck: false, limits: [{ key: "moderate", cap: 20, label: "대화 안에서만" }, { key: "unlimited", cap: 100, label: "제한 없음" }] }); if (patch) Object.assign(st, patch); return { ...st }; } };
    __app.ctx.openErosync = async () => { window.__opened++; return true; };
  });
  // ── 인물 위키: 리안
  await page.evaluate(() => { const m = __app.ctx.state.memory ?? null; });
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(900);
  // 2.2.9: Erosync 사용 중단 — 관계도의 Erosync 목표·경쟁 층은 뺐다(버튼이 없어야 함)
  ok(`[${tag}] 관계도에 Erosync 층 버튼이 없다(사용 중단)`, (await page.locator(".rb-rm-ctrls button", { hasText: "Erosync" }).count()) === 0);
  // 위키로(기억 > 인물 상세, 시험 데이터의 시로코)
  await page.locator(".rb-rm-panel .rb-rm-list").last().locator("button", { hasText: "시로코" }).first().click(); await page.waitForTimeout(200);
  await page.locator(".rb-rm-panel .rb-btn.primary").click(); await page.waitForTimeout(1500);
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "sirokko", tab: "people", page: "detail" }); __app.ctx.go("relmap"); }); await page.waitForTimeout(300); await page.evaluate(() => __app.ctx.go("memory")); await page.waitForTimeout(1500);   // 시험 데이터의 폴더 키
  const body = async () => (await page.locator(".rb-wk2").first().textContent().catch(() => "")) ?? "";
  // addon-rebuild: NSFW 탭 성인 프로필은 이 채팅 장기기억(folder.nsfw) 값 — Erosync 카드(지금 상태·온도·태그·내보내기)는 없다
  const docId = await page.evaluate(async () => {
    const cur = await __app.ctx.memory.switches?.currentChat?.().catch?.(() => null);
    const keys = cur ? [[cur.chaId, cur.chatId]] : [["c1", "t1"]];
    for (const [a, b] of keys) {
      const f = await __app.ctx.memory.store.getFolder(a, b); const d = Object.values(f?.wiki?.documents ?? {}).find((x) => x.title === "시로코");
      if (d) { await __app.ctx.memory.store.updateFolder(a, b, (g) => { g.nsfw = { [d.id]: { sexual: { eroticInterest: 70, sexualSpontaneity: 40, sexualOpenness: 60, sexualMomentum: 55 }, axes: { initiative: 30, publicOpenness: 20, spontaneity: 15 }, pref: { f: 10, m: 90, x: 0 },
        positions: [{ label: "기승위", preference: "preferred", reason: "" }, { label: "샤워실", preference: "preferred", reason: "" }, { label: "공공장소", preference: "disliked", reason: "" }], seduction: { frequency: 60, directness: 80, styles: ["노골적으로 만진다"], situations: [] }, humor: null, by: "ai", at: "", log: [{ at: "", text: "샤워실 좋아함" }] } };
        g.wiki.people ??= {}; g.wiki.people.profiles ??= {}; g.wiki.people.profiles[d.id] ??= { createdAt: "2026-11-16T00:00:00Z", summary: "차분함", sexualDesire: { text: "" }, paraphilia: { text: "" } };
        g.wiki.people.candidates = { ...(g.wiki.people.candidates ?? {}),
          ["candidate_seed_" + d.id + "_sexual_desire_0"]: { id: "candidate_seed_" + d.id + "_sexual_desire_0", documentId: d.id, axis: "sexual_desire", pattern: "위에서 주도하는 걸 좋아한다", status: "approved", origin: "manual", evidence: [], appliedChange: { type: "sexual", field: "sexualDesire", before: null, pattern: "위에서 주도하는 걸 좋아한다" } },
          ["candidate_seed_" + d.id + "_paraphilia_0"]: { id: "candidate_seed_" + d.id + "_paraphilia_0", documentId: d.id, axis: "paraphilia", pattern: "눈을 가리면 더 흥분한다", status: "approved", origin: "manual", evidence: [], appliedChange: { type: "sexual", field: "paraphilia", before: null, pattern: "눈을 가리면 더 흥분한다" } },
          ["c_ai_" + d.id]: { id: "c_ai_" + d.id, documentId: d.id, axis: "sexual_desire", pattern: "목덜미에 약하다", status: "review", origin: "writer", evidence: [{}] } };
        g.drive = { turn: 5, goals: { "시로코>{{user}}": { actor: "시로코", target: "{{user}}", kind: "sex", want: "같이 자고 싶다", move: "손을 잡고 방으로 이끈다", desire: 70, rung: 2, streak: 1, at: 5, last: "yes" } }, rest: {}, log: [{ at: 0, turn: 5, text: "시로코→{{user}} 눈길·신호 → 몸 붙이기" }] };
        g.emo = { ...(g.emo ?? {}), "시로코>호시노": { from: "시로코", to: "호시노", tags: { affection: 6, attraction: 5 }, log: [{ t: { affection: 3 }, from: { affection: null }, at: 1 }, { t: { attraction: 5 }, from: { attraction: null }, at: 2 }, { t: { affection: 6 }, from: { affection: 3 }, at: 3 }] } }; }); return d.id; }
    }
    return null;
  });
  ok(`[${tag}] 시험 인물에 이 채팅 성인 프로필을 넣음`, !!docId);
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "sirokko", tab: "people", page: "detail" }); __app.ctx.go("memory"); }); await page.waitForTimeout(800);
  await page.locator(".rb-wk2-tab", { hasText: "기본" }).click(); await page.waitForTimeout(400);
  ok(`[${tag}] 기본 탭에는 성적 항목이 없다`, !/성적 관심/.test(await body()));
  await page.locator(".rb-wk2-tab", { hasText: "성인" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] 성인 탭이 따로 맨 끝에 있다`, (await page.locator(".rb-wk2-tab").allTextContents()).join("|").replace(/\s+/g, "").endsWith("기억|성인"));
  const gtxt = (await page.locator("#rb-nsfw-gauges").textContent().catch(() => "")) ?? "";
  ok(`[${tag}] 성인 프로필 게이지(성적 관심·주도성), 겹친 이름은 긴 쪽만`, /성적 관심/.test(gtxt) && /주도성/.test(gtxt) && /성적 개방성/.test(gtxt) && !/(^|[^적 ])개방성/.test(gtxt.replace(/성적 개방성/g, "")) && !/즉흥성/.test(gtxt.replace(/성적 즉흥성/g, "")), gtxt);
  ok(`[${tag}] 좋아하는·싫어하는 체위·장소 칩`, /기승위/.test(await body()) && /샤워실/.test(await body()) && /공공장소/.test(await body()));
  ok(`[${tag}] ‘이 채팅’ 표시와 최근 변화`, /이 채팅/.test(await body()) && (await page.locator("#rb-nsfw-log").count()) === 1);
  ok(`[${tag}] 다시 만들기·직접 고치기·내보내기·가져오기 버튼`, (await page.locator("#rb-nsfw-regen").count()) === 1 && (await page.locator("#rb-nsfw-edit").count()) === 1 && (await page.locator("#rb-nsfw-export").count()) === 1 && (await page.locator("#rb-nsfw-import").count()) === 1);
  ok(`[${tag}] 지금 상태: 노리는 목표·단계·다음 수`, (await page.locator("#rb-nsfw-status li[data-k=goal]").count()) === 1 && /몸 붙이기|가까이/.test(await page.locator("#rb-nsfw-status").textContent()) && /방으로 이끈다/.test(await page.locator("#rb-nsfw-status").textContent()));
  ok(`[${tag}] 관계 온도 그래프(선 3개)`, (await page.locator(".rb-nsfw-temp svg polyline").count()) === 3);
  await page.locator("#rb-nsfw-edit").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 고치기 창에 성적 수치·8축·체위 칸`, (await page.locator("#rb-nsfw-editor input[data-k=sexualOpenness]").count()) === 1 && (await page.locator("#rb-nsfw-editor input[data-k=initiative]").count()) === 1 && /기승위/.test(await page.locator("#rb-nsfw-editor textarea[data-k=like-act]").inputValue()) && /샤워실/.test(await page.locator("#rb-nsfw-editor textarea[data-k=like-place]").inputValue()));
  await page.locator("#rb-nsfw-editor input[data-k=initiative]").fill("90"); await page.locator("#rb-nsfw-editor textarea[data-k=like-act]").fill("기승위, 후배위, 눈 가리기"); await page.locator("#rb-nsfw-editor-save").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 좋아하는 것이 체위/플레이·장소 두 묶음`, (await page.locator('[data-group="like-act"]').count()) === 1 && (await page.locator('[data-group="like-place"]').count()) === 1 && (await page.locator('[data-group="like-position"], [data-group="like-play"]').count()) === 0 && /기승위/.test(await page.locator('[data-group="like-act"]').textContent()) && /눈 가리기/.test(await page.locator('[data-group="like-act"]').textContent()) && /체위\/플레이/.test(await page.locator('[data-group="like-act"]').textContent()));
  ok(`[${tag}] 성적 욕망·이상성향 카드: 두 묶음·항목·우상단 다시 뽑기·직접 추가`, (await page.locator('#rb-nsfw-cands [data-axis="sexual_desire"] .rb-ac-item').count()) === 2 && (await page.locator('#rb-nsfw-cands [data-axis="paraphilia"] .rb-ac-item').count()) === 1 && (await page.locator(".rb-ac-card .rb-wk2-ch #rb-adult-reroll").count()) === 1 && (await page.locator(".rb-ac-card .rb-wk2-ch #rb-ac-add-btn").count()) === 1);
  ok(`[${tag}] 거부 단추 없음, 검토 대기 항목엔 반영 단추`, (await page.locator("#rb-nsfw-cands button", { hasText: "거부" }).count()) === 0 && (await page.locator('#rb-nsfw-cands [data-status="review"] button', { hasText: "반영" }).count()) === 1);
  ok(`[${tag}] 성인 프로필 게이지가 ‘성적 수치’·‘성향’ 두 묶음`, (await page.locator("#rb-nsfw-gauges .rb-ng.sex").count()) === 4 && (await page.locator("#rb-nsfw-gauges .rb-ng.ax").count()) >= 1);
  ok(`[${tag}] 유혹 방식 상자(빈도·직설·칩)`, (await page.locator('[data-box="seduction"]').count()) === 1 && /자주|가끔|드물게/.test(await page.locator('[data-box="seduction"]').textContent()));
  await page.screenshot({ path: `/tmp/ero-nsfw2-${tag}.png`, fullPage: true });
  await page.locator('#rb-nsfw-cands [data-axis="paraphilia"] [data-act="lock"]').click(); await page.waitForTimeout(400);
  ok(`[${tag}] 잠그면 잠김 표시·지우기 막힘`, (await page.locator('#rb-nsfw-cands [data-axis="paraphilia"] .rb-ac-item.locked').count()) === 1 && await page.locator('#rb-nsfw-cands [data-axis="paraphilia"] [data-act="del"]').isDisabled());
  await page.locator("#rb-ac-add-btn").click(); await page.waitForTimeout(300);
  await page.locator('#rb-ac-add .rb-ac-segb[data-k="paraphilia"]').click(); await page.locator("#rb-ac-add-text").fill("거울 앞에서 보는 걸 좋아한다"); await page.locator("#rb-ac-add-save").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 직접 추가하면 성인 프로필도 새로 만들지 묻는다`, /성인 프로필도 새로 만들까요/.test(await page.locator("body").textContent()));
  await page.locator(".rb-dialog button", { hasText: "취소" }).last().click().catch(() => {}); await page.waitForTimeout(400);
  ok(`[${tag}] 추가한 항목이 이상성향 묶음에`, /거울 앞에서 보는 걸 좋아한다/.test(await page.locator('#rb-nsfw-cands [data-axis="paraphilia"]').textContent()));
  ok(`[${tag}] 저장하면 이 채팅 값이 바뀌고 ‘직접 고친 값’ 표시`, /후배위/.test(await body()) && /직접 고친 값/.test(await body()) && (await page.locator("#rb-nsfw-gauges .rb-ng", { hasText: "주도성" }).textContent()).includes("90"));
  await page.locator("#rb-nsfw-tags-likes").fill("목덜미, 느린 전개, 목덜미"); await page.locator("#rb-nsfw-tags-limits").fill("공개된 장소"); await page.locator("#rb-nsfw-tags-save").click(); await page.waitForTimeout(500);
  ok(`[${tag}] 태그 저장: 중복 빼고 선호 2·금기 1 칩`, (await page.locator("#rb-nsfw-tags-chips [data-kind=like]").count()) === 2 && (await page.locator("#rb-nsfw-tags-chips [data-kind=limit]").count()) === 1);
  const [pdl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(() => null), page.locator("#rb-nsfw-export").click()]);
  ok(`[${tag}] 내보내기가 파일을 내려줌`, !!pdl);
  ok(`[${tag}] Erosync 카드(지금 상태·태그·내보내기)는 NSFW 탭에 없다`, (await page.locator("#rb-ero-summary, #rb-ero-tags-save, #rb-ero-export, #rb-ero-axes").count()) === 0);
  await page.screenshot({ path: `/tmp/ero-nsfw-${tag}.png`, fullPage: true });
  await page.locator(".rb-wk2-tab", { hasText: "기본" }).click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/ero-wiki-info-${tag}.png` });
  ok(`[${tag}] 원본 창을 여는 링크는 없다(NSFW 탭에서 바로 고친다)`, (await page.locator(".rb-wk2-ero .rb-wk2-link", { hasText: "Erosync에서 고치기" }).count()) === 0);
  await page.locator(".rb-wk2-tab", { hasText: "관계" }).click(); await page.waitForTimeout(300);
  await page.locator(".rb-wk2-who", { hasText: "호시노" }).first().click().catch(() => {}); await page.waitForTimeout(300);
  ok(`[${tag}] 관계 탭(호시노)에 'Erosync 목표·경쟁'`, /Erosync 목표·경쟁/.test(await body()), (await body()).slice(0, 200));
  // 기억 화면에서 Erosync 카드가 접힌 곳 없이 바로 보인다(고급 모드 기본)
  await page.evaluate(() => { const m = (__app.ctx.state.mem ??= {}); m.page = "home"; __app.ctx.go("memory"); }); await page.waitForTimeout(1200);
  await page.locator("#rb-mem-tab-opt").click(); await page.waitForTimeout(200);   // 2.2.0: 리수폿·Erosync는 '옵션' 칸
  ok(`[${tag}] 기억 화면 ‘옵션’ 칸에 Erosync 줄이 바로 보임`, await page.locator("#rb-mem-go-erosync").isVisible(), String(await page.locator("#rb-mem-go-erosync").count()));
  await page.locator("#rb-mem-go-erosync").click(); await page.waitForTimeout(600);
  ok(`[${tag}] 줄을 누르면 Erosync 설정 화면(켜기 스위치)이 열림`, await page.locator("#rb-erosync").isVisible());
  ok(`[${tag}] 켜기 아래 ‘user에게도 적용’ 스위치(기본 꺼짐)`, (await page.locator("#rb-ero-user [role=switch]").count()) === 1 && (await page.locator("#rb-ero-user [role=switch]").getAttribute("aria-checked")) === "false"); await page.locator("#rb-ero-user [role=switch]").click(); await page.waitForTimeout(200); ok(`[${tag}] 누르면 userTrack(true)`, await page.evaluate(() => window.__ut === true));
  const tabTo = async (t) => { await page.locator("#rb-erosync-tabs button", { hasText: t }).click(); await page.waitForTimeout(350); };
  ok(`[${tag}] 탭 줄이 보임(2.2.0: 개요·장면·수위·분석·관리)`, (await page.locator("#rb-erosync-tabs button").count()) === 3);
  await tabTo("장면·수위");
  ok(`[${tag}] 수위 카드가 보임`, await page.locator("#rb-erosync-level").isVisible());
  await page.locator("#rb-erosync-mode-level .rb-opt[data-v=sfw]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] SFW에서는 극단 행동 수위 칸이 없다`, (await page.locator("#rb-erosync-limit").count()) === 0);
  ok(`[${tag}] SFW를 고르면 저장됨`, (await page.evaluate(() => window.__lv.contentMode)) === "sfw");
  await page.locator("#rb-erosync-mode-level .rb-opt[data-v=nsfw]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] NSFW에서도 극단 행동 수위 칸이 없다`, (await page.locator("#rb-erosync-limit").count()) === 0);
  await page.locator("#rb-erosync-mode-level .rb-opt[data-v=plus]").click(); await page.waitForTimeout(300);
  await tabTo("장면·수위");
  ok(`[${tag}] 동작 카드가 보임`, await page.locator("#rb-erosync-config-act").isVisible());
  await page.locator("#rb-erosync-config-act").screenshot({ path: `/tmp/ero-act-${tag}.png` });
  await page.locator("#rb-erosync-c-frequency").fill("80"); await page.locator("#rb-erosync-c-frequency").blur(); await page.waitForTimeout(200);
  await page.locator("#rb-erosync-mode .rb-opt[data-v=off]").click(); await page.waitForTimeout(200);
  ok(`[${tag}] 장면 빈도 80·동작 방식 쉬기가 저장됨`, await page.evaluate(() => window.__cf.frequency === 80 && window.__cf.mode === "off"), JSON.stringify(await page.evaluate(() => window.__cf)));
  await tabTo("분석·관리");
  ok(`[${tag}] 프롬프트 카드가 보임`, await page.locator("#rb-erosync-prompts").isVisible());
  await page.locator("#rb-erosync-prompts summary", { hasText: "역할" }).click(); await page.locator("#rb-erosync-prompts textarea").fill("고친 글"); await page.locator("#rb-erosync-prompts .rb-btn", { hasText: "저장" }).first().click(); await page.waitForTimeout(300);
  ok(`[${tag}] 지시문 저장이 엔진 쪽으로 전달됨`, await page.evaluate(() => window.__prLast?.id === "director.role" && window.__prLast.text === "고친 글"), JSON.stringify(await page.evaluate(() => window.__prLast)));
  await tabTo("장면·수위");
  ok(`[${tag}] 집착 방지 카드가 보임`, await page.locator("#rb-erosync-guard").isVisible());
  await page.locator("#rb-erosync-level").screenshot({ path: `/tmp/ero-level-${tag}.png` }); await page.locator("#rb-erosync-guard").screenshot({ path: `/tmp/ero-guard-${tag}.png` });
  await page.locator("#rb-erosync-guard [role=switch]").first().click(); await page.locator("#rb-erosync-g-cap").fill("40"); await page.locator("#rb-erosync-g-cap").blur(); await page.waitForTimeout(200);
  ok(`[${tag}] 집착 방지 켜기·상한 40이 저장됨`, await page.evaluate(() => window.__gd?.on === true && window.__gd.obsessionCap === 40), JSON.stringify(await page.evaluate(() => window.__gd)));
  ok(`[${tag}] 프리셋 카드가 수위 탭에 있음`, await page.locator("#rb-erosync-presets").isVisible());
  await page.locator("#rb-erosync-preset-name").fill("순한맛"); await page.locator("#rb-erosync-preset-save").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 프리셋 저장하면 목록에 보임`, (await page.locator("#rb-erosync-preset-list [data-preset]").count()) === 1 && /순한맛/.test(await page.locator("#rb-erosync-preset-list").textContent()));
  await page.locator("#rb-erosync-preset-list [data-act=apply]").click(); await page.waitForTimeout(400);
  ok(`[${tag}] 적용을 누르면 applyPreset이 불림`, await page.evaluate(() => window.__psApplied === "x0"));
  await tabTo("장면·수위");
  await page.locator("#rb-erosync-preset-list [data-act=del]").click(); await page.waitForTimeout(300);
  ok(`[${tag}] 삭제하면 목록이 비어 안내 문구가 보임`, (await page.locator("#rb-erosync-preset-empty").count()) === 1);
  await tabTo("장면·수위");
  ok(`[${tag}] 동작 탭에 장면 되돌리기 카드`, await page.locator("#rb-erosync-undo-card").isVisible());
  await page.locator("#rb-erosync-undo").click(); await page.waitForTimeout(300);
  await page.locator(".rb-dialog button", { hasText: "되돌리기" }).last().click(); await page.waitForTimeout(400);
  ok(`[${tag}] 확인하면 undoScene이 불리고 결과가 보임`, (await page.evaluate(() => window.__undo)) === 1 && /되돌렸어요/.test(await page.locator("#rb-erosync-undo-note").textContent()));
  await tabTo("장면·수위");
  ok(`[${tag}] NSFW+를 고르면 nsfwPlus가 켜짐`, await page.evaluate(() => window.__lv.nsfwPlus === true));
  await tabTo("분석·관리");
  ok(`[${tag}] 검토 탭에 후보 2개`, (await page.locator("#rb-erosync-review [data-cand]").count()) >= 2, await page.locator("#rb-erosync-review").textContent().catch(() => "없음"));
  await page.locator("#rb-erosync-review button", { hasText: "반영" }).first().click(); await page.waitForTimeout(500);
  await page.locator("#rb-erosync-review button", { hasText: "무시" }).first().click(); await page.waitForTimeout(500);
  ok(`[${tag}] 반영·거절이 review로 전달됨`, (await page.evaluate(() => (window.__rvCalls ?? []).map((x) => x[0]).join(","))).includes("apply") && (await page.evaluate(() => (window.__rvCalls ?? []).map((x) => x[0]).join(","))).includes("reject"), await page.evaluate(() => JSON.stringify(window.__rvCalls)));
  await page.screenshot({ path: `/tmp/ero-review-${tag}.png` });
  await page.screenshot({ path: `/tmp/ero-memhome-${tag}.png` });
  await tabTo("개요"); await page.locator("#rb-erosync").scrollIntoViewIfNeeded(); await page.screenshot({ path: `/tmp/ero-home-${tag}.png` });
  await tabTo("분석·관리"); await page.screenshot({ path: `/tmp/ero-data-${tag}.png` });
  // 장기 기억 더보기: 파일 내보내기·불러오기
  await page.evaluate(() => { __app.ctx.state.mem.page = "home"; __app.ctx.go("memory"); }); await page.waitForTimeout(1000);
  await page.evaluate(() => { const c = (sel, re) => [...document.querySelectorAll(sel)].find((e) => new RegExp(re).test(e.textContent.trim()))?.click(); c(".rb-mem2 button", "^기록 보기$"); }); await page.waitForTimeout(600);
  await page.evaluate(() => { const c = (sel, re) => [...document.querySelectorAll(sel)].find((e) => new RegExp(re).test(e.textContent.trim()))?.click(); c(".rb-main button", "^인물 위키"); }); await page.waitForTimeout(600);
  ok(`[${tag}] 장기 기억 홈엔 더보기가 없음`, true);
  await page.evaluate(() => { [...document.querySelectorAll(".rb-main button")].find((e) => /더보기/.test(e.textContent))?.click(); }); await page.waitForTimeout(300);
  const menuText = await page.locator("[role=menu]").first().textContent().catch(() => "");
  ok(`[${tag}] 더보기 메뉴에 파일 내보내기·불러오기`, /내보내기/.test(menuText) && /불러오기/.test(menuText), menuText);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(() => null), page.locator("[role=menuitem]", { hasText: "내보내기" }).first().click()]);
  ok(`[${tag}] 내보내기가 dusk-memory 파일을 내려줌`, !!dl && /^dusk-memory-.*\.json$/.test(dl.suggestedFilename()), dl?.suggestedFilename());
  // Erosync 꺼짐/매칭 안 됨이면 칸이 없다
  await page.evaluate(() => { __app.ctx.erosync = { isRunning: () => false, read: async () => ({ ok: false }) }; });
  await page.evaluate(() => { Object.assign(__app.ctx.state.mem, { personKey: "sirokko", tab: "people", page: "detail" }); __app.ctx.go("memory"); }); await page.waitForTimeout(1200);
  await page.locator(".rb-wk2-tab", { hasText: "성인" }).click(); await page.waitForTimeout(300);
  ok(`[${tag}] Erosync 꺼져도 NSFW 탭에 기본 칸이 있다`, (await page.locator("#rb-wk2-nsfw").count()) === 1 && (await page.locator("#rb-wk2-nsfw .rb-nsfw-base").count()) > 0, `${await page.locator("#rb-wk2-nsfw").count()} ${await page.locator("#rb-wk2-nsfw").textContent().catch(() => "?")}`);
  await page.evaluate(() => __app.ctx.go("relmap")); await page.waitForTimeout(300);
  ok(`[${tag}] 페이지 오류 없음`, errs.length === 0, errs.join(" | "));
  await page.context().close();
}
await browser.close();
const bad = out.filter((x) => !x).length; console.log(bad ? `\n✘ 실패 ${bad}개` : `\n모두 통과 (${out.length})`); process.exit(bad ? 1 : 0);
