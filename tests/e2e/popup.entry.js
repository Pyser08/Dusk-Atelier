// v1.6.7 5단계: AI 팝업 — 끌기·크기·기억·모바일 시트·탭 연동·버튼 표시
import { openEditorCore } from "../../src/ui/screens/editor.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const store = new Map();
let reply = { schemaVersion: 1, task: "description", data: { text: "새 설명" } }, hold = null;
export async function setup() {
  const ctx = { win: document.body, toast: (m) => (window.__toasts ??= []).push(m), prefs: {}, api: {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    getDatabase: async () => ({ plugins: [] }),
    runLLMModel: async () => { if (hold) await hold; return { type: "success", result: JSON.stringify(reply) }; } } };
  const view = { chaId: "c1", name: "히나", desc: "풍기위원장", firstMessage: "안녕", lorebook: [], regex: [], trigger: [] };
  const ed = await openEditorCore(ctx, { view, kindLabel: "봇 편집", idKey: "chaId", infoLabels: {}, infoTitle: "봇 정보", validate: () => [], renderInfo: () => [], save: async () => {} });
  ed.panel.style.cssText = "position:fixed;inset:0;background:#fff";
  window.__ed = ed; window.__hold = (on) => { hold = on ? new Promise((r) => (window.__release = r)) : null; };
  await sleep(50);
}
