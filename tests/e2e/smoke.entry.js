// 7-B 새 화면 연기 시험(브라우저에서 실제로 그려 보기): node tests/e2e/run-smoke.mjs 로 실행한다. 가짜 ctx만 쓴다.
import { createEmptyWikiScope, createWikiDocument } from "../../src/engine/pot/wiki-schema.js";
import { openFolders } from "../../src/ui/screens/memory/folderui.js";
import { openRecords } from "../../src/ui/screens/memory/recordsui.js";
import { openWriter, previewView } from "../../src/ui/screens/memory/writerui.js";
import { openTracking } from "../../src/ui/screens/memory/trackui.js";
import { restoreLastMerge } from "../../src/ui/screens/memory/mergeui.js";
import { layoutOf } from "../../src/engine/peoplegroup.js";
import { renderPeopleTab } from "../../src/ui/screens/memory/wikiview.js";

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
    const row = (n) => [...host.querySelectorAll(".rb-wk-emorow")].find((r) => r.textContent.startsWith(n));
    check("감정 게이지 카드(간단 모드)", !!host.querySelector(".rb-wk-emo") && /시로코 → \{\{user\}\}/.test(host.textContent), host.textContent.slice(0, 200));
    check("감정 게이지 값·미설정 표시", row("신뢰")?.textContent.endsWith("7") && row("애정")?.textContent.endsWith("—") && row("두려움")?.textContent.endsWith("2"), [...host.querySelectorAll(".rb-wk-emorow")].map((r) => r.textContent).join("|"));
  } catch (e) { check("감정 게이지 렌더", false, e?.stack ?? e); }
  check("전역 오류 없음", errors.length === 0, errors.join(" | "));
  return out;
};
