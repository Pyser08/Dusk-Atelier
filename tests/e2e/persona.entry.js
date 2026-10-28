// v1.6.7: 페르소나 빌더 '전체 고치기' 입력칸 — 영문·지우기·한글·Enter가 정상 동작하는지
import { renderPersonaBuilder } from "../../src/ui/screens/personabuilder.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function setup() {
  const store = new Map();
  const main = document.createElement("div"); document.body.appendChild(main);
  const ctx = { win: document.body, main, toast: () => {}, prefs: {}, api: {
    pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
    getDatabase: async () => ({ personas: [] }), runLLMModel: async () => ({ type: "success", result: "" }) } };
  const r = await renderPersonaBuilder(ctx);
  if (r instanceof Node && !main.contains(r)) main.appendChild(r);
  await sleep(100);
  return !!document.querySelector("input[aria-label='AI 수정 요청']");
}
