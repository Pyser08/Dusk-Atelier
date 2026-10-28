// v1.6.7 2단계 연기 시험: 편집기 우측 하단 버튼 → AI 창 → 요청 → 수정안 적용 → 탭에 바로 반영 → 되돌리기
import { openEditorCore } from "../../src/ui/screens/editor.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clickText = (txt, root = document) => { const b = $("button", root).find((x) => x.textContent.trim().startsWith(txt)); if (!b) throw new Error("버튼 없음: " + txt); b.click(); return b; };

export async function runSmoke() {
  const out = [], ok = (name, cond, extra = "") => out.push({ name, ok: !!cond, extra });
  const store = new Map();
  let reply = { schemaVersion: 1, task: "lorebook", data: { upsert: [{ ref: null, entry: { key: "아코", content: "행정위원" } }, { ref: "l0", entry: { content: "선도부장 겸 풍기위원장" } }], remove: [] } };
  const ctx = {
    win: document.body, toast: () => {}, prefs: {},
    api: {
      pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
      getDatabase: async () => ({ plugins: [{ name: "봇빌더", enabled: true }] }),
      runLLMModel: async () => ({ type: "success", result: JSON.stringify(reply) })
    }
  };
  const saved = [];
  const view = { chaId: "c1", name: "히나", desc: "풍기위원장", firstMessage: "안녕", lorebook: [{ key: "히나", content: "선도부장", comment: "히나", mode: "normal", extentions: { da_rid: "r1" } }], regex: [], trigger: [] };
  const ed = await openEditorCore(ctx, { view, kindLabel: "봇 편집", idKey: "chaId", infoLabels: {}, infoTitle: "봇 정보", validate: () => [], renderInfo: () => [], save: async (d) => { saved.push(d); } });
  const tabsNow = () => $(".rb-tabs button").map((b) => b.textContent.replace(/\d+$/, "").trim());
  ok("탭 순서: 정보·로어북·정규식·트리거·AI로 제작·JSON", tabsNow().join("|") === "정보|로어북|정규식|트리거|AI로 제작|JSON", tabsNow().join("|"));
  ok("처음 열면 정보 탭이 선택됨", $(".rb-tabs button[aria-selected=true]")[0]?.textContent.startsWith("정보"));
  const fab = document.querySelector("#rb-rule-test-fab");
  ok("우측 하단 버튼 하나", !!fab && fab.querySelectorAll(":scope > button").length === 1);
  const main = fab.querySelector(":scope > button");
  main.click(); await sleep(50);
  ok("펼치면 AI 창·규칙 시험 두 개", $("button", fab).filter((b) => b.textContent.includes("AI 창") || b.textContent.includes("규칙 시험")).length === 2);
  clickText("AI 창", fab); await sleep(150);
  const pop = document.querySelector("#rb-ai-popup");
  ok("AI 창 열림", !!pop);
  ok("봇빌더 동시 설치 안내", pop && pop.textContent.includes("봇빌더 플러그인이 같이 켜져"));
  const sel = pop.querySelector("select[aria-label='작업 종류']"); sel.value = "lorebook"; sel.dispatchEvent(new Event("change"));
  const ta = pop.querySelector("textarea"); ta.value = "아코 추가"; ta.dispatchEvent(new Event("input"));
  clickText("보내기", pop); await sleep(300);
  ok("수정안 카드 표시", pop.textContent.includes("적용할 수 있어요"));
  const countTab = () => $(".rb-tabs button").find((b) => b.textContent.startsWith("로어북"))?.textContent;
  ok("적용 전 로어북 1개", countTab()?.endsWith("1"));
  clickText("적용", pop); await sleep(300);
  ok("적용하면 탭 개수가 바로 바뀜", countTab()?.endsWith("2"));
  ok("작업본에 반영(기존 Dusk 확장 필드 유지)", ed.draft.lorebook.length === 2 && ed.draft.lorebook[0].content === "선도부장 겸 풍기위원장" && ed.draft.lorebook[0].extentions.da_rid === "r1");
  ok("저장 안 된 변경 표시", document.querySelector(".rb-full-head b")?.textContent.includes("•"));
  clickText("되돌리기", pop); await sleep(200);
  ok("되돌리기 1단계", ed.draft.lorebook.length === 1 && countTab()?.endsWith("1"));
  ok("저장 키는 da_aibuild:*만", [...store.keys()].every((k) => k.startsWith("da_aibuild:")));
  pop.querySelector("[aria-label='닫기']").click(); await sleep(50);
  ok("AI 창 닫힘", !document.querySelector("#rb-ai-popup"));
  // ---- 3단계: AI로 제작 탭 ----
  clickText("AI로 제작", document.querySelector(".rb-tabs")); await sleep(300);
  const pane = document.querySelector(".rb-split");
  ok("AI 탭 하위 화면 5개", ["시작하기", "프롬프트 프리셋", "작업 프롬프트", "설정", "저장본"].every((t) => pane.textContent.includes(t)));
  ok("시작하기: 로어북 방식 선택", pane.textContent.includes("Dusk 방식") && pane.textContent.includes("일반 방식"));
  const sub = (t) => { const b = $(".rb-seg button", pane).find((x) => x.textContent.trim() === t); b.click(); return sleep(150); };
  await sub("프롬프트 프리셋"); ok("프리셋 화면: 파일 열기·전송 내용", pane.textContent.includes("프리셋 파일 열기") && pane.textContent.includes("전송 내용"));
  clickText("전송 내용 보기", pane); await sleep(150);
  ok("전송 내용 미리보기에 메시지가 보임", pane.textContent.includes("system ·") && pane.textContent.includes("user ·"));
  await sub("작업 프롬프트"); ok("작업 프롬프트 화면", pane.querySelectorAll("textarea").length >= 2 && pane.textContent.includes("기본값"));
  await sub("설정"); ok("설정 화면", pane.textContent.includes("보조 모델") && pane.textContent.includes("다시 요청"));
  await sub("저장본"); ok("저장본 화면", pane.textContent.includes("임시 저장") && pane.textContent.includes("봇빌더에서 가져오기"));
  await sub("시작하기");
  // ---- 4단계: Dusk 방식 ----
  clickText("Dusk 방식", $(".rb-seg", pane).find((sg) => sg.textContent.includes("Dusk 방식"))); await sleep(150);
  reply = { schemaVersion: 1, task: "lorebook", data: { design: {
    folders: [{ name: "게헨나", keys: "게헨나", affiliation: { chance: 100, members: { 이오리: 60 } } }],
    entries: [{ ref: null, kind: "person", name: "이오리", keys: "이오리", content: "선도부 부부장", folder: "게헨나" }], remove: [] } } };
  clickText("AI 창 열기", pane); await sleep(200);
  const pop2 = document.querySelector("#rb-ai-popup");
  const sel2 = pop2.querySelector("select[aria-label='작업 종류']"); sel2.value = "lorebook"; sel2.dispatchEvent(new Event("change")); await sleep(50);
  ok("팝업에 로어북 방식 토글(Dusk 선택됨)", $(".rb-seg button[aria-checked=true]", pop2).some((b) => b.textContent.includes("Dusk 방식")));
  const ta2 = pop2.querySelector("textarea"); ta2.value = "게헨나 소속 만들어"; ta2.dispatchEvent(new Event("input"));
  clickText("보내기", pop2); await sleep(400);
  ok("Dusk 구조 미리보기 카드", pop2.textContent.includes("Dusk 구조 미리보기") && pop2.textContent.includes("소속") && pop2.textContent.includes("이오리"));
  ok("적용 전 규칙 시험 버튼", $("button", pop2).some((b) => b.textContent.includes("적용 전 규칙 시험")));
  clickText("적용 전 규칙 시험", pop2); await sleep(300);
  const tester = document.querySelector("#rb-rule-test");
  ok("수정안 상태로 규칙 시험 창이 열림", !!tester && tester.textContent.includes("AI 수정안을 적용한 상태"));
  ok("이때는 아직 편집기에 반영되지 않음", ed.draft.lorebook.length === 1);
  clickText("수정안으로 돌아가기", tester); await sleep(300);
  const pop3 = document.querySelector("#rb-ai-popup");
  ok("수정안으로 돌아가기 → AI 창 다시 열림", !!pop3 && pop3.textContent.includes("Dusk 구조 미리보기"));
  clickText("적용", pop3); await sleep(300);
  ok("적용하면 소속 폴더·구성원이 탭에 반영", ed.draft.lorebook.length === 3 && ed.draft.lorebook.some((e) => e.comment === "[소속] 게헨나") && ed.draft.lorebook.some((e) => e.comment === "이오리"));
  ok("저장 키는 여전히 da_aibuild:*만", [...store.keys()].every((k) => k.startsWith("da_aibuild:")));
  pop3.querySelector("[aria-label='닫기']").click(); await sleep(50);
  main.click(); await sleep(50);
  clickText("규칙 시험", fab); await sleep(200);
  ok("규칙 시험 창 열림", !!document.querySelector("#rb-rule-test"));
  return out;
}
window.runSmoke = runSmoke;
