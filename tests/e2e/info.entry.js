// v1.6.7 6단계: 정보 탭(요약 카드·접는 카드) + 퍼스트 메시지 관리자
import { openCharEditor } from "../../src/ui/screens/chareditor.js";
import { CSS2 } from "../../src/ui/styles.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function setup(n = 12) {
  const st = document.createElement("style"); st.textContent = CSS2 + ":root{--rb-surf:#fff;--rb-surf2:#f2f2f2;--rb-line2:#ddd;--rb-line3:#ccc;--rb-text:#111;--rb-sub:#666;--rb-win:#fff;--rb-r1:8px;--rb-r2:10px;--rb-r3:12px;--rb-ctl:40px;--rb-ctl-sm:32px}body{position:relative;height:100vh;margin:0}"; document.head.appendChild(st);
  const ch = { chaId: "c1", name: "히나", desc: "풍기위원장", firstMessage: "안녕, 나는 히나야.\n두번째 줄", alternateGreetings: Array.from({ length: n }, (_, i) => `대안 인사 ${i + 1}\n본문`), personality: "냉정", scenario: "게헨나", tags: ["블루아카", "선도부"],
    globalLore: [{ key: "a", content: "b", comment: "c" }], customscript: [], triggerscript: [] };
  const saved = [];
  const ctx = { win: document.body, toast: (m) => (window.__toasts ??= []).push(m), prefs: { ui: {}, meta: {} }, api: {
    pluginStorage: { getItem: async () => null, setItem: async () => {} }, getDatabase: async () => ({ plugins: [] }),
    getCharacterFromIndex: async () => structuredClone(ch), setCharacterToIndex: async (i, c) => { saved.push(c); }, runLLMModel: async () => ({ type: "success", result: "" }) },
    svc: { meta: async () => {} } };
  const ed = await openCharEditor(ctx, 0, "c1");
  
  window.__ed = ed; window.__saved = saved;
  await sleep(80);
}
