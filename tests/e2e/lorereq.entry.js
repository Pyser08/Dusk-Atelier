// v1.6.8: AI 창 '이번 요청에 포함할 로어북' — 75개 항목 모바일 겹침·스크롤 시험용 진입점
import { openEditorCore } from "../../src/ui/screens/editor.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const store = new Map();
export async function setup() {
  const ctx = { win: document.body, toast: () => {}, prefs: {}, api: {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    getDatabase: async () => ({ plugins: [] }),
    runLLMModel: async () => ({ type: "success", result: "{}" }) } };
  const names = ["짧음", "아주 긴 이름의 로어북 항목입니다 ".repeat(4), "VeryLongUnbrokenEnglishNameWithoutAnySpacesThatCouldOverflowTheRowOnSmallPhones".repeat(2)];
  const lorebook = Array.from({ length: 75 }, (_, i) => ({ key: "k" + i, content: "c" + i, comment: (i % 3 === 0 ? names[i % 9 % 3] : names[i % 3]) + " " + i, mode: i % 10 === 9 ? "folder" : "normal" }));
  const view = { chaId: "c1", name: "히나", desc: "d", firstMessage: "안녕", lorebook, regex: [], trigger: [] };
  const ed = await openEditorCore(ctx, { view, kindLabel: "봇 편집", idKey: "chaId", infoLabels: {}, infoTitle: "봇 정보", validate: () => [], renderInfo: () => [], save: async () => {} });
  ed.panel.style.cssText = "position:fixed;inset:0;background:#fff";
  window.__ed = ed;
  await sleep(50);
}
