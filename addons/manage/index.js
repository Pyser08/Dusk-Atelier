// 관리 애드온(2.0.0): 캐릭터(폴더·에셋·로어북)·모듈(켜기·순서·연결)·플러그인(목록·새 버전 확인·프리셋) 화면.
// 가져오기·편집기·백업은 코어에 남아 있어서 이 애드온이 없어도 봇·모듈 가져오기는 돼요. 저장 값(폴더·연결·프리셋)은 그대로예요.
import { renderCharacters } from "../../src/ui/screens/characters.js";
import { renderModules } from "../../src/ui/screens/modules.js";
import { renderPlugins } from "../../src/ui/screens/plugins.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [ext.add("svc", "manage", { open: (tab) => ctx.openDusk?.(tab ?? "characters") }), ext.add("tab", "characters", renderCharacters), ext.add("tab", "modules", renderModules), ext.add("tab", "plugins", renderPlugins)];
  return { async deactivate() { off.forEach((f) => f()); } };
}
