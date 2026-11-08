// 기억카드 애드온(2.0.0): 장기 기억으로 카드를 만들고(카드 꾸미기 이미지 포함) 그 카드로 새 봇을 이어 가요. 장기기억 애드온이 필요해요.
// 카드 저장소(dusk.card.*)는 그대로라 애드온을 다시 받으면 이어서 써요.
import { renderCardsTab } from "../../src/ui/screens/cards/index.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [ext.add("svc", "cards", { open: () => ctx.openDusk?.("cards") }), ext.add("tab", "cards", renderCardsTab), ext.add("needsMemory", "cards", true)];
  return { async deactivate() { off.forEach((f) => f()); } };
}
