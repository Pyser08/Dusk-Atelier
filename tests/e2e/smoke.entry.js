// 7-B 새 화면 연기 시험(브라우저에서 실제로 그려 보기): node tests/e2e/run-smoke.mjs 로 실행한다. 가짜 ctx만 쓴다.
import { mountSkillChat } from "../../src/ui/screens/memory/skillchat.js";
import { startWorkshop, checkWorkshopReturn } from "../../src/ui/screens/workshoplink.js";
import { openLoreDusk } from "../../src/ui/screens/loredusk.js";
import { TABS } from "../../src/ui/tabs.js";
import { createEmptyWikiScope, createWikiDocument } from "../../src/engine/pot/wiki-schema.js";
import { openFolders } from "../../src/ui/screens/memory/folderui.js";
import { openRecords } from "../../src/ui/screens/memory/recordsui.js";
import { openWriter, previewView } from "../../src/ui/screens/memory/writerui.js";
import { openTracking } from "../../src/ui/screens/memory/trackui.js";
import { restoreLastMerge } from "../../src/ui/screens/memory/mergeui.js";
import { layoutOf } from "../../src/engine/peoplegroup.js";
import { renderPeopleTab } from "../../src/ui/screens/memory/wikiview.js";
import { renderMemorySkills } from "../../src/ui/screens/memory/skills.js";
import { runTour } from "../../src/ui/tour.js";
import { SCREEN_TOURS, screenTourSteps, screenTourKey } from "../../src/ui/screentours.js";
import { showGuide } from "../../src/ui/screens/memory/guide.js";
import { icon } from "../../src/ui/icons.js";
import { createWebTools } from "../../src/data/webtools.js";
import { createSkillStore, COCOA_LIB_KEY, COCOA_PRESETS_KEY } from "../../src/data/skillstore.js";
import { openEmbedModal } from "../../src/ui/screens/memory/embedmodal.js";
import { openAssetFix } from "../../src/ui/screens/assetfix.js";
import { buildAssetIndex } from "../../src/engine/imgtagfix.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clickText = (txt, root = document) => { const b = $("button", root).find((x) => x.textContent.trim().startsWith(txt)); if (!b) throw new Error("버튼 없음: " + txt); b.click(); };
const dlg = () => $(".rb-modal").at(-1);
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

function makeEnv(log) {
  let wiki = createEmptyWikiScope({ characterId: "c1", chatKey: "chat1" });
  wiki = createWikiDocument(wiki, { type: "Character", title: "시로코", sections: [] });
  wiki = createWikiDocument(wiki, { type: "Character", title: "호시노", sections: [] });
  const folder = { wiki, people: { k1: { name: "시로코", aliases: [], records: [] }, k2: { name: "호시노", aliases: [], records: [] } }, scenes: [] };
  const flowSettings = { autoWriterEnabled: true, trackedCharactersByScope: {}, sexualDesireEnabled: false };
  const st = { status: () => ({ blocked: false }), rawSnapshot: () => JSON.parse(JSON.stringify(flowSettings)), update: (fn) => { fn(flowSettings); log.push(["settings", JSON.stringify(flowSettings)]); } };
  const writerListeners = new Set(); let wst = { phase: "idle", error: "", hasSource: false, rpText: "", userText: "", targetKeywords: "", proposal: null };
  const writer = { status: () => wst, subscribe: (l) => { writerListeners.add(l); l(wst); return () => writerListeners.delete(l); }, editSource(rp, us) { wst = { ...wst, rpText: rp, userText: us, hasSource: !!rp.trim() }; writerListeners.forEach((l) => l(wst)); }, async pullRecent() {}, async generate() { wst = { ...wst, phase: "proposal", proposal: { preview: { people: [{ name: "시로코", created: false, texts: [{ label: "관계", target: "나(user)", before: null, after: "친해짐", operation: "추가" }], metrics: [{ label: "호감도", target: "나", before: "3", after: "5", beforeStage: "관심", afterStage: "호감", delta: 2, reason: "도와줌" }], personality: [], candidates: [] }] }, targetNames: ["시로코"], validationWarning: "" } }; writerListeners.forEach((l) => l(wst)); return wst; }, async apply() { log.push(["writer-apply"]); wst = { ...wst, phase: "applied", proposal: null }; writerListeners.forEach((l) => l(wst)); return wst; }, invalidate() { wst = { ...wst, phase: "idle", proposal: null }; writerListeners.forEach((l) => l(wst)); }, targetKeywords: "" };
  const index = { mergeBackups: [] };
  const ctx = { win: document.body, toast: (t, o) => log.push(["toast", t, o?.error ? "err" : ""]),
    api: { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0 },
    memory: { store: { getIndex: async () => index, updateIndex: async (fn) => fn(index), updateFolder: async (b, c, fn) => { fn(folder); } },
      flow: { settings: async () => st, runtime: () => ({ wiki: { scope: { ...folder.wiki.scope, characterId: "c1", chatKey: "chat1", documents: folder.wiki.documents, characterName: "봇", chatName: "채팅" } } }), tools: () => ({ writer }) } } };
  return { env: { ctx, bot: { id: "c1", index: 0 }, chatItem: { id: "chat1", index: 0 }, folder, redraw: () => log.push(["redraw"]), backend: { id: "local" }, caps: { analyze: true }, advanced: true, view: { live: true } }, folder, flowSettings };
}

window.runSmoke = async () => {
  const out = [], log = [], check = (name, ok, extra = "") => out.push({ name, ok: !!ok, extra: String(extra) });
  const errors = []; window.addEventListener("error", (e) => errors.push(e.message)); window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason?.stack ?? e.reason)));
  const { env, folder, flowSettings } = makeEnv(log);
  try {
    // 1) 인물 폴더 정리
    let p = openFolders(env, Object.entries(folder.people)); await sleep(30);
    clickText("새 폴더"); await sleep(30);
    const inp = $("input", dlg()).at(-1); inp.value = "아비도스"; fire(inp, "input"); clickText("만들기"); await sleep(60);
    check("폴더 만들기", layoutOf(folder.wiki).folders.length === 1, JSON.stringify(layoutOf(folder.wiki).folders));
    const cbs = $("input[type=checkbox]", dlg()); cbs[0].checked = true; fire(cbs[0], "change");
    const sel = $("select", dlg()).at(-1); sel.value = layoutOf(folder.wiki).folders[0].id; fire(sel, "change");
    clickText("선택한 인물 옮기기"); await sleep(60);
    check("인물 옮기기", Object.keys(layoutOf(folder.wiki).members).length === 1);
    clickText("닫기"); await p;
    // 2) 인물 항목 관리
    const doc = Object.values(folder.wiki.documents)[0];
    p = openRecords(env, doc); await sleep(30);
    clickText("항목 추가"); await sleep(30);
    const ta = $("textarea", dlg())[0]; ta.value = "사실은 졸린 척이다."; fire(ta, "input"); clickText("저장"); await sleep(80);
    check("항목 추가", Object.values(folder.wiki.documents)[0].sections.length === 1, JSON.stringify(log.filter((l) => l[0] === "toast").at(-1)));
    clickText("고치기"); await sleep(30);
    const ta2 = $("textarea", dlg())[0]; ta2.value = "사실은 진짜 졸리다."; fire(ta2, "input"); clickText("저장"); await sleep(80);
    check("항목 고치기", Object.values(folder.wiki.documents)[0].sections[0].body.includes("진짜"));
    clickText("NPC 감정 추가"); await sleep(30);
    const sels = $("select", dlg()); const tg = sels.find((s) => s.getAttribute("aria-label") === "대상"); tg.value = Object.values(folder.wiki.documents)[1].id; fire(tg, "change");
    const ta3 = $("textarea", dlg())[0]; ta3.value = "[서운함] 못 놀아 줘서"; fire(ta3, "input"); clickText("저장"); await sleep(80);
    check("NPC 감정 추가", Object.values(folder.wiki.documents)[0].sections.length === 2, JSON.stringify(log.filter((l) => l[0] === "toast").at(-1)));
    clickText("닫기"); await p;
    // 3) 수동 Writer
    p = openWriter(env); await sleep(50);
    const wta = $("textarea", dlg())[0]; wta.value = "시로코가 선생에게 다가왔다."; fire(wta, "input"); await sleep(20);
    check("입력 중 입력칸 유지", $("textarea", dlg())[0] === wta);
    clickText("분석해서 변경안 만들기"); await sleep(60);
    check("변경안 표시", dlg().textContent.includes("친해짐") && dlg().textContent.includes("호감도"));
    clickText("이 변경안 반영"); await sleep(60);
    check("반영", log.some((l) => l[0] === "writer-apply"));
    clickText("닫기"); await p;
    // 4) 추적 인물
    p = openTracking(env); await sleep(60);
    const tcb = $("input[type=checkbox]", dlg()); check("추적 후보 목록", tcb.length === 2, tcb.length);
    tcb[0].checked = true; fire(tcb[0], "change"); clickText("저장"); await p;
    check("추적 저장", Object.values(flowSettings.trackedCharactersByScope)[0]?.length === 1, JSON.stringify(flowSettings));
    // 5) 합치기 되돌리기(기록 없음)
    await restoreLastMerge(env); check("되돌릴 기록 없음 안내", log.some((l) => l[0] === "toast" && String(l[1]).includes("되돌릴")));
    check("미리보기 렌더", previewView({ people: [] }).textContent.includes("없어요"));
  } catch (e) { check("예외", false, e?.stack ?? e); }
  // v1.7.1: 인물 위키 '수치 상태'에 감정 게이지 6가지(읽기 전용, 간단 모드에서도)
  try {
    folder.emo = { "시로코>{{user}}": { from: "시로코", to: "{{user}}", tags: { trust: 7, fear: 2 }, log: [] } };
    env.ctx.state ??= {}; env.advanced = false; env.idx = { settings: { potMode: true, backend: "auto" } };
    const host = document.createElement("div"); document.body.appendChild(host); await renderPeopleTab(env, host); await sleep(80);
    // v1.8.3: 탭 개편 — 감정은 '상세 정보' 탭의 상대별 한 줄(값 있는 감정만)
    host.querySelector('.rb-wk2-tab[data-t="info"]')?.click(); await sleep(60);
    const erow = [...host.querySelectorAll(".rb-wk3-emorow")].map((r) => r.textContent);
    check("감정 카드(간단 모드)", erow.some((t) => t.startsWith("→ 나")), host.textContent.slice(0, 200));
    check("감정 값·미설정 감정은 숨김", erow.some((t) => t.includes("신뢰 7") && t.includes("두려움 2") && !t.includes("애정")), erow.join("|"));
  } catch (e) { check("감정 게이지 렌더", false, e?.stack ?? e); }
  // v1.8.1: 인물 위키 '수치 상태' 아래 자동 게이지 블록(+ 추가 버튼, 만들어진 게이지 박스)
  try {
    const defs = [];
    env.ctx.memory = { ...(env.ctx.memory ?? {}), gauge: { getDefs: async () => defs, getSuggest: async () => ({ on: false, list: [], sent: [] }), invalidate() {} } };
    env.bot = { id: "c1", character: { name: "봇" } };
    const host = document.createElement("div"); document.body.appendChild(host); await renderPeopleTab(env, host); await sleep(120);
    host.querySelector('.rb-wk2-tab[data-t="info"]')?.click(); await sleep(120);
    check("게이지 + 버튼", [...host.querySelectorAll("button")].some((b) => b.textContent.includes("+ 게이지")));
    defs.push({ id: "g_abcdef12", name: "신뢰", desc: "", min: 0, max: 10, init: 4, step: 3, rule: "", measure: "", update: "", look: { hue: 200, shape: "orb", icon: "" }, targets: "all", on: true, src: "user", at: 1 });
    const host2 = document.createElement("div"); document.body.appendChild(host2); await renderPeopleTab(env, host2); await sleep(120);
    host2.querySelector('.rb-wk2-tab[data-t="info"]')?.click(); await sleep(150);
    check("게이지 줄 렌더", [...host2.querySelectorAll(".rb-wk3-num.g")].some((b) => b.textContent.includes("신뢰") && b.textContent.includes("4/10")), host2.textContent.slice(0, 160));
  } catch (e) { check("게이지 렌더", false, e?.stack ?? e); }
  try {   // 스킬 탭(v1.8.1)
    const store = new Map([[COCOA_LIB_KEY, JSON.stringify({ sets: [{ name: "코코", files: [{ path: "a/SKILL.md", content: "---\nname: A\nskill_format: 2\nsystem_prompt: 지침\n---\n본문" }] }] })], [COCOA_PRESETS_KEY, JSON.stringify({ activePresetId: "p", presets: [{ id: "p", name: "기본", pipeline: { rows: [{ agents: [{ id: "d", name: "Director", mode: "pre", systemPrompt: "규칙", skillSets: ["코코"] }] }] } }] })]]);
    const sk = createSkillStore({ pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } }, { log() {} });
    const sctx = { win: document.body, toast: (t) => log.push(["toast", t]), skills: sk, prefs: { advanced: true }, web: createWebTools({ pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } }, { log() {} }), state: {} }, shost = document.createElement("div"); document.body.appendChild(shost);
    await renderMemorySkills(sctx, shost, { redraw() {} }); await sleep(80);
    check("스킬 탭 렌더", shost.textContent.includes("코코아 기능 켜기") && shost.textContent.includes("스킬 세트 0개"), shost.textContent.slice(0, 120));
    clickText("찾아보기", shost); await sleep(120);
    check("코코아 데이터 찾기", shost.textContent.includes("스킬 세트 1개 가져오기") && shost.textContent.includes("'Director'의 프롬프트를 스킬로 변환"), shost.textContent.slice(-200));
    clickText("옮기기", shost); await sleep(200);
    const lib = await sk.getLibrary(), cfg = await sk.getCfg();
    check("코코아 옮기기", lib.sets.length === 1 && cfg.stages.director.length === 1 && cfg.on === false, JSON.stringify(cfg.stages));
    clickText("열기", shost); await sleep(80);
    check("웹 도구·호출 기록 카드", shost.textContent.includes("웹 도구 (검색·페이지 읽기)") && shost.textContent.includes("최근 호출 기록") && shost.textContent.includes("Wikipedia"), shost.textContent.slice(-300));
    check("세트 편집기", !!shost.querySelector("textarea") && shost.textContent.includes("진단"), shost.textContent.slice(0, 160));
  } catch (e) { check("스킬 탭", false, e?.stack ?? e); }
  try {   // AI로 스킬 만들기 대화(v1.8.1)
    const store2 = new Map(), main = document.createElement("div"); main.style.position = "relative"; document.body.appendChild(main);
    const reply = '만들었어요.\n<skill-file path="combat-referee/SKILL.md">\n---\nname: combat-referee\ndescription: Combat rules. Use when a fight starts.\nskill_format: 2\nsystem_prompt: |\n  gate\n---\n# Combat\n</skill-file>';
    const api2 = { pluginStorage: { getItem: async (k) => store2.get(k) ?? null, setItem: async (k, v) => { store2.set(k, v); } }, runLLMModel: async (o) => ({ type: "success", result: o.messages[0].content.includes("# SKILL GUIDE") ? reply : "가이드 없음" }) };
    const sk2 = createSkillStore(api2, { log() {} });
    const cctx = { win: document.body, main, api: api2, skills: sk2, state: {}, toast: () => {} };
    let saved = 0; mountSkillChat(cctx, { onSaved: () => { saved++; } });
    const fab = main.querySelector(".rb-sk-fab"), panel = main.querySelector(".rb-sk-chat");
    check("스킬 대화: 우하단 버튼·닫힌 패널", !!fab && panel.hidden === true && fab.textContent.includes("AI로 스킬 만들기"));
    fab.click(); await sleep(60);
    check("스킬 대화: 열림 + 안내 글", panel.hidden === false && panel.textContent.includes("어떤 스킬을 만들고 싶으신가요"));
    panel.querySelector("textarea").value = "전투 판정 스킬"; panel.querySelector(".rb-pb-chat-send").click(); await sleep(150);
    check("스킬 대화: 초안이 실시간으로 쌓임", panel.textContent.includes("combat-referee/SKILL.md") && panel.textContent.includes("초안 갱신") && !panel.textContent.includes("<skill-file"), panel.textContent.slice(0, 200));
    clickText("라이브러리에 추가", panel); await sleep(150);
    const l2 = await sk2.getLibrary();
    check("스킬 대화: 라이브러리에 추가", l2.sets.length === 1 && l2.sets[0].name === "combat-referee" && saved === 1, JSON.stringify(l2.sets.map((x) => x.name)));
    main.remove();
  } catch (e) { check("스킬 대화", false, e?.stack ?? e); }
  try {   // 봇빌더 연동(v1.8.1): 연동판 열기 → 돌아오면 개발 목록 / 원본 안내 / 원고 가져오기
    const store3 = new Map(), meta = { devProjects: [] };
    let chars = [{ chaId: "a", name: "A", type: "character", chats: [{}] }], order = ["a"], closed = 0, went = null, plugins = [{ name: "risu_story_workshop", displayName: "봇빌더", script: "//@name risu_story_workshop\n/*__DA_WORKSHOP_INTEROP__*/", enabled: true }];
    const api3 = {
      pluginStorage: { getItem: async (k) => store3.get(k) ?? null, setItem: async (k, v) => { store3.set(k, v); }, removeItem: async (k) => { store3.delete(k); } },
      getDatabase: async (keys) => ({ plugins, characters: chars, characterOrder: order }),
      setDatabaseLite: async (o) => { if (o.characters) chars = o.characters; if (o.characterOrder) order = o.characterOrder; },
      checkCharOrder: async () => { order = chars.map((c) => c.chaId); }, getCharacterFromIndex: async (i) => chars[i], setChatToIndex: async () => {}
    };
    store3.set("da_interop:reg:risu-story-workshop", JSON.stringify({ spec: 1, id: "risu-story-workshop", actions: [{ key: "open" }, { key: "draft" }], actionRev: 0 }));
    // 연동판 봇빌더 흉내: 동작 요청을 받으면 처리 결과를 등록 정보에 쓴다
    const fakeWs = setInterval(() => {
      const req = JSON.parse(store3.get("da_interop:action:risu-story-workshop") ?? "null"), reg = JSON.parse(store3.get("da_interop:reg:risu-story-workshop"));
      if (req && req.rev > (reg.actionRev ?? 0)) store3.set("da_interop:reg:risu-story-workshop", JSON.stringify({ ...reg, actionRev: req.rev, actionKey: req.key, actionResult: req.key === "open" ? { opened: true } : null, actionError: null }));
    }, 30);
    const wctx = { api: api3, win: document.body, state: {}, prefs: { ui: { devMode: true }, meta }, svc: { meta: async (fn) => fn(meta) }, toast: () => {}, close: async () => { closed++; }, go: (t) => { went = t; } };
    check("봇빌더: 연동판이면 바로 열고 Dusk 닫기", (await startWorkshop(wctx)) === true && closed === 1 && JSON.parse(store3.get("dusk.workshop.handoff.v1")).mode === "linked");
    chars = [...chars, { chaId: "n1", name: "새 봇", type: "character" }];
    await checkWorkshopReturn(wctx);
    check("봇빌더: 돌아오면 새 봇을 개발 목록·개발 탭으로", meta.devProjects.some((p) => p.id === "n1") && went === "dev" && wctx.state.devSel === "c:n1" && !store3.has("dusk.workshop.handoff.v1"));
    // 원본 봇빌더: 안내 창 → 열러 가기
    plugins = [{ ...plugins[0], script: "//@name risu_story_workshop\n" }];
    const p1 = startWorkshop(wctx); await sleep(80);
    check("봇빌더 원본: 안내 창(연동판 받기 포함)", document.body.textContent.includes("Dusk 연동판이 아니라서") && !!$("button").find((b) => b.textContent.includes("연동판 받기")));
    clickText("봇빌더 열러 가기"); check("봇빌더 원본: 열러 가기 → 인계 저장", (await p1) === true && closed === 2 && JSON.parse(store3.get("dusk.workshop.handoff.v1")).mode === "manual");
    // 등록 안 한 원고: 봇빌더 자동 저장에서 읽어 새 봇으로
    store3.set("risu-character-editor:v1:autosave", JSON.stringify({ schemaVersion: 1, savedAt: new Date(Date.now() + 1000).toISOString(), name: "원고 봇", session: { targetId: null, draft: { name: "원고 봇", desc: "봇빌더에서 쓴 설명", firstMessage: "안녕", chats: [9] } } }));
    went = null; const p2 = checkWorkshopReturn(wctx); await sleep(80);
    check("봇빌더 원고: 가져올지 물어봄", document.body.textContent.includes("원고 봇") && document.body.textContent.includes("아직 봇으로 등록되지 않았어요"));
    clickText("새 봇으로 가져오기"); await p2;
    const made = chars.find((c) => c.name === "원고 봇");
    check("봇빌더 원고: 새 봇 생성·개발 목록", !!made && made.desc === "봇빌더에서 쓴 설명" && made.firstMessage === "안녕" && !Array.isArray(made.chats?.[0]) && meta.devProjects.some((p) => p.id === made.chaId) && went === "dev", JSON.stringify(made ?? {}).slice(0, 200));
    clearInterval(fakeWs);
  } catch (e) { check("봇빌더 연동", false, e?.stack ?? e); }
  try {   // 로어북 더스크화 — 규칙 설계(v1.8.1)
    const lore = [
      { key: "히나,Hina", comment: "히나", content: "소라사키 히나.", mode: "normal" },
      { key: "야근,서류", comment: "히나의 피로", content: "히나는 지쳐 있다.", mode: "normal" }
    ];
    let sent = "";
    const reply = JSON.stringify({ design: { entries: [{ ref: "l0", rule: { hold: 3, wholeWord: true } }, { ref: "l1", rule: { conditions: [{ type: "count", words: "야근,서류", min: 3 }], repeat: "once", chain: [{ target: "히나", chance: 100 }] } }] }, why: { l0: "주인공" } });
    const lctx = { win: document.body, toast: () => {}, api: { pluginStorage: { getItem: async () => null, setItem: async () => {} }, runLLMModel: async (o) => { sent = o.messages.map((m) => m.content).join("\n"); return { type: "success", result: reply }; } } };
    const pr = openLoreDusk(lctx, { list: lore }); await sleep(80);
    check("더스크화: 규칙 설계 카드", document.body.textContent.includes("AI로 규칙 설계 (Dusk 기능 전부)"));
    clickText("규칙 설계 시작"); await sleep(250);
    check("더스크화: Dusk 안내와 함께 보냄 + 미리보기", sent.includes("[로어북 방식: Dusk]") && document.body.textContent.includes("3턴 유지") && document.body.textContent.includes("💡 주인공"), document.body.textContent.slice(-300));
    clickText("적용"); const res = await pr;
    check("더스크화: 규칙 적용 결과", res?.entries?.[0]?.extentions?.da_rule?.hold === 3 && res.entries[1].extentions.da_rule.once === "chat" && /규칙 2개/.test(res.text), JSON.stringify(res?.text));
  } catch (e) { check("더스크화 규칙 설계", false, e?.stack ?? e); }
  try {   // 하이라이트 둘러보기(v1.8.1)
    const w = document.createElement("div"); w.innerHTML = '<button id="t1">A</button><div class="rb-scard"><div class="has-seg">seg</div></div><b id="t2">B</b>'; document.body.appendChild(w);
    let acted = 0;
    const done = runTour({ win: document.body }, [{ icon: "home", title: "소개", text: "본문\n둘째 줄" }, { icon: "home", title: "첫째", text: "x", target: ["#t1"] }, { icon: "home", title: "없음", text: "y", target: ["#nope"] }, { icon: "home", title: "둘째", text: "z", target: ["#t2"], action: { label: "실행", onClick: () => { acted++; } } }], { skipMissing: true, doneLabel: "알겠어요" });
    await sleep(30);
    check("둘러보기 단계 수(없는 목표 건너뜀)", $(".rb-tour-card .dots i").length === 3 && $(".rb-tour-card.center").length === 1, String($(".rb-tour-card .dots i").length));
    clickText("다음", document.body); await sleep(20);
    check("둘러보기 하이라이트", document.getElementById("t1").classList.contains("rb-tour-hl") && !$(".rb-tour-card.center").length);
    clickText("다음", document.body); await sleep(20);
    check("둘러보기 이동·동작 버튼", document.getElementById("t2").classList.contains("rb-tour-hl") && !document.getElementById("t1").classList.contains("rb-tour-hl") && $(".rb-tour-card button").some((b) => b.textContent === "실행"));
    clickText("실행", document.body); await done; await sleep(10);
    check("둘러보기 끝(정리·동작 실행)", acted === 1 && !$(".rb-tour-card").length && !$(".rb-tour-hl").length);
    // 화면별 정의: 모든 아이콘이 실제로 있고 목표가 비어 있지 않다
    const bad = []; for (const [k, defs] of Object.entries(SCREEN_TOURS)) for (const d of defs) { if (!d.target?.length || !d.title || !d.text) bad.push(k + ":" + d.title); if (!icon(d.icon, 22)) bad.push(k + ":icon:" + d.icon); }
    check("화면별 둘러보기 정의", bad.length === 0, bad.join(","));
    const sctx0 = { state: { tab: "settings" } };
    check("화면 키", screenTourKey(sctx0) === "settings" && screenTourKey({ state: { tab: "cocoa" } }) === "cocoa" && screenTourKey({ state: { tab: "memory" } }) === "memory:home");
    check("화면별 둘러보기 단계", screenTourSteps(sctx0).length === 1 + SCREEN_TOURS.settings.length && screenTourSteps({ state: { tab: "plugins" } }).length === 1 && /·/.test(screenTourSteps({ state: { tab: "plugins" } })[0].text));
    // 설정 화면 모양의 DOM에서 실제로 건너뛰며 하이라이트되는지
    const w2 = document.createElement("div"); w2.innerHTML = '<div class="rb-set-look">꾸미기</div><div class="rb-set-tour">둘러보기</div>'; w2.prepend(w.querySelector(".rb-scard")); document.body.appendChild(w2);
    const { runScreenTour } = await import("../../src/ui/screentours.js");
    const p2 = runScreenTour({ win: document.body, state: { tab: "settings" } }); await sleep(30);
    check("화면별 둘러보기: 있는 것만(소개+3)", $(".rb-tour-card .dots i").length === 4, String($(".rb-tour-card .dots i").length));
    clickText("건너뛰기", document.body); await p2;
    // 메모리 ? 가이드: 버튼이 든 카드를 강조
    const sec = document.createElement("section"); sec.className = "rb-card"; const gb = document.createElement("button"); sec.appendChild(gb); document.body.appendChild(sec);
    const p3 = showGuide({ win: document.body, memory: {} }, "mode", { anchor: gb }); await sleep(30);
    check("가이드 하이라이트", sec.classList.contains("rb-tour-hl") && $(".rb-tour-card h2")[0].textContent.includes("기억 방식"));
    clickText("건너뛰기", document.body); await p3;
    [w, w2, sec].forEach((x) => x.remove());
  } catch (e) { check("둘러보기", false, e?.stack ?? e); }
  try {   // 코코아 탭(사이드바 기억 섹션)
    const ids = TABS.filter((x) => x.section === "memory").map((x) => x.id);
    check("사이드바 기억 섹션에 코코아 탭", ids.includes("memory") && ids.includes("cocoa") && ids.includes("cards"));
  } catch (e) { check("코코아 탭", false, e?.stack ?? e); }
  try {   // 임베딩 설정: '기본으로 사용' 스위치가 눌렀을 때 켜진 모양으로 바뀌고, 저장하면 켜짐으로 저장된다
    const saved = [];
    const E = { load: async () => {}, status: () => ({ on: false, url: "https://api.voyageai.com/v1/embeddings", model: "voyage-4-large", minSim: 0.32, timeoutMs: 4000, hasKey: true, keyTail: "abcd" }), keyValue: () => "",
      save: async (p) => { saved.push(p); return { persisted: true, ready: true, keyTail: "abcd" }; }, clear: async () => {}, test: async () => ({ dim: 1, ms: 1 }) };
    const host = document.createElement("div"); document.body.appendChild(host);
    const toasts = [];
    const pm = openEmbedModal({ win: host, memory: { embedder: E }, toast: (t) => toasts.push(t) });
    await sleep(30);
    const sw = $('[role="switch"][aria-label="임베딩 기본 사용"]', host)[0];
    sw.click(); await sleep(10);
    check("임베딩 스위치 켜짐 표시", sw.getAttribute("aria-checked") === "true", sw.getAttribute("aria-checked"));
    sw.click(); await sleep(10); sw.click(); await sleep(10);
    check("임베딩 스위치 다시 끄고 켜기", sw.getAttribute("aria-checked") === "true");
    clickText("저장", host); await sleep(30);
    check("임베딩 켜짐으로 저장", saved.at(-1)?.on === true, JSON.stringify(saved.at(-1)));
    await pm; host.remove();
  } catch (e) { check("임베딩 설정", false, e?.stack ?? e); }
  try {   // 도구 탭 '에셋 태그 고치기': 검사 → 미리보기 → 적용 → 되돌리기
    const st = new Map();
    const chat = { id: "chatA", message: [
      { role: "user", data: "안아 줘", chatId: "u1" },
      { role: "char", data: '안았다.\n\n<img="kaguya.nude.Smiling">\n\n끝', chatId: "c1" },
    ] };
    const api = {
      pluginStorage: { getItem: async (k) => st.get(k) ?? null, setItem: async (k, v) => { st.set(k, v); } },
      getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0,
      getCharacterFromIndex: async () => ({ chaId: "botA", chats: [chat] }),
      getChatFromIndex: async () => JSON.parse(JSON.stringify(chat)),
      setChatToIndex: async (ci, ti, c) => { chat.message = c.message; },
    };
    const idx = buildAssetIndex(["Kaguya.nude.default", "Kaguya.nude.smiling", "Kaguya.nude.hug"]);
    const host = document.createElement("div"); document.body.appendChild(host);
    const toasts = []; let aiCalls = 0;
    const ctx = { api, win: host, toast: (t) => toasts.push(t), imgFix: { assetIndex: async () => idx }, memory: { store: null } };
    // ① 엔진이 못 고친 것만: 이름만 틀렸으니 AI를 부르지 않는다
    const p1 = openAssetFix(ctx, { runAI: async () => { aiCalls++; return "{}"; } });
    await sleep(40);
    clickText("검사 시작", host); await sleep(60);
    check("에셋 고치기: AI 없이 엔진만", aiCalls === 0 && $("input[type=checkbox]", host).length === 1, host.textContent.slice(0, 200));
    clickText("적용", host); await sleep(60); await p1;
    check("에셋 고치기: 적용", chat.message[1].data.includes('<img="Kaguya.nude.smiling">'), chat.message[1].data);
    // ② 상황까지 전부: AI가 hug로 바꾸자고 함 → 미리보기 → 적용 → 되돌리기
    const p2 = openAssetFix(ctx, { runAI: async (a, msgs) => { aiCalls++; return '{"changes":[{"id":1,"kw":"hug","why":"안는 중"}]}'; } });
    await sleep(40);
    clickText("상황까지 전부", host); await sleep(10);
    clickText("검사 시작", host); await sleep(80);
    check("에셋 고치기: AI 제안 표시", aiCalls === 1 && host.textContent.includes("Kaguya.nude.hug") && host.textContent.includes("AI"), host.textContent.slice(0, 300));
    clickText("적용", host); await sleep(60); await p2;
    check("에셋 고치기: AI 제안 적용", chat.message[1].data.includes('<img="Kaguya.nude.hug">'), chat.message[1].data);
    const p3 = openAssetFix(ctx); await sleep(40);
    clickText("마지막 적용 되돌리기", host); await sleep(60);
    check("에셋 고치기: 되돌리기", chat.message[1].data.includes('<img="Kaguya.nude.smiling">'), chat.message[1].data);
    clickText("닫기", host); await p3; host.remove();
  } catch (e) { check("에셋 태그 고치기", false, e?.stack ?? e); }
  check("전역 오류 없음", errors.length === 0, errors.join(" | "));
  return out;
};
