// v1.6.7 7단계: 로어북·정규식·트리거·JSON 탭 (상단 바·빈 화면·고급 접기·정규식 바로 시험·초기 변수)
import { openCharEditor } from "../../src/ui/screens/chareditor.js";
import { CSS2 } from "../../src/ui/styles.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function setup(kind = "full") {
  const st = document.createElement("style"); st.textContent = CSS2 + ":root{--rb-surf:#fff;--rb-surf2:#f2f2f2;--rb-line2:#ddd;--rb-line3:#ccc;--rb-text:#111;--rb-sub:#666;--rb-win:#fff;--rb-r1:8px;--rb-r2:10px;--rb-r3:12px;--rb-ctl:40px;--rb-ctl-sm:32px}body{position:relative;height:100vh;margin:0}"; document.head.appendChild(st);
  const full = kind === "full";
  const ch = { chaId: "c1", name: "히나", desc: "d", firstMessage: "hi", alternateGreetings: [], defaultVariables: full ? "hp=10\nname=히나\nhp=20" : undefined,
    globalLore: full ? [{ key: "a", content: "b", comment: "첫 항목", mode: "normal", insertorder: 100 }, { key: "c", content: "d", comment: "둘째", mode: "normal", insertorder: 100 }] : [],
    customscript: full ? [{ comment: "정규1", in: "x", out: "y", type: "editdisplay", ableFlag: false, flag: "" }] : [],
    triggerscript: full ? [{ comment: "루아", type: "start", conditions: [], effect: [{ type: "triggerlua", code: "print(1)" }] }, { comment: "일반", type: "manual", conditions: [], effect: [{ type: "setvar", var: "a", operator: "=", value: "1" }] }] : [] };
  const ctx = { win: document.body, toast: (m) => (window.__toasts ??= []).push(m), prefs: { ui: {}, meta: {} }, api: {
    pluginStorage: { getItem: async () => null, setItem: async () => {} }, getDatabase: async () => ({ plugins: [] }),
    getCharacterFromIndex: async () => structuredClone(ch), setCharacterToIndex: async () => {}, runLLMModel: async () => ({ type: "success", result: "" }) }, svc: { meta: async () => {} } };
  const ed = await openCharEditor(ctx, 0, "c1");
  window.__ed = ed;
  await sleep(80);
}
