// Dusk Saga 애드온(id rpg). 아직 장기기억 연계만 — 게임 화면은 tools/rpg-dev 미리보기에서 만드는 중이라 배포 목록(addons.src.json)에는 넣지 않았다
import { statTabHtml } from "../../src/rpg/engine/memlink.js";
import { createMemoryLink } from "../../src/rpg/data/memorylink.js";

export const meta = { id: "rpg", name: "Dusk Saga", version: "0.0.1" };
export async function activate(api, ctx) {
  const dusk = ctx.dusk, ext = dusk?.ext ?? ctx.ext ?? ctx.app?.ext;
  // 장기기억 캐릭터 상태창의 ‘스탯’ 탭: 애드온이 켜져 있을 때만 보인다(기록은 채팅 폴더에 남는다)
  const off = ext?.add?.("svc", "rpgStats", { tabFor: (folder, names) => statTabHtml(folder, names) });
  const memory = createMemoryLink(ext, { log: (...a) => console.log("[Dusk Saga]", ...a) });
  return { memory, deactivate() { try { off?.(); } catch { /* 이미 떨어짐 */ } } };
}
