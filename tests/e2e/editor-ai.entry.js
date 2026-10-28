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
  main.click(); await sleep(50);
  clickText("규칙 시험", fab); await sleep(200);
  ok("규칙 시험 창 열림", !!document.querySelector("#rb-rule-test"));
  return out;
}
window.runSmoke = runSmoke;
