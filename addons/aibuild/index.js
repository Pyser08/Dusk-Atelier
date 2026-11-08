// AI로 봇·페르소나 만들기 애드온: 편집기의 AI 창·룰렛·'AI로 제작' 탭, 'AI로 봇 만들기'·'AI로 페르소나 만들기' 탭.
// 코어는 ctx.ext의 svc "aibuild"가 있을 때만 이 입구들을 보여 준다(editor.js hasAi, tabs.js addon 탭, characters.js 버튼).
// 페르소나 빌더 저장값(data/personabuilder.js loadPB)은 코어가 계속 읽어서, 애드온을 꺼도 만든 페르소나 설정은 그대로예요.
import * as controller from "../../src/dev/aibuild/controller.js";
import * as bridge from "../../src/dev/aibuild/bridge.js";
import * as aitab from "../../src/ui/screens/aitab.js";
import { openAiPopup, loadPopupGeom } from "../../src/ui/screens/aibuild.js";
import { renderPersonaBuilder } from "../../src/ui/screens/personabuilder.js";

export async function activate(_api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const svc = { load: async () => [controller, bridge], aitab: async () => aitab, openAiPopup, loadPopupGeom };
  const off = [ext.add("svc", "aibuild", svc), ext.add("tab", "personabuilder", renderPersonaBuilder)];
  return { deactivate() { off.forEach((f) => f()); } };
}
