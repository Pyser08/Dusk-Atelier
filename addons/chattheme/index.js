// 채팅 테마 만들기 애드온: 채팅 테마 빌더(목록·코드 주고받기) · 테마 빌더 · 테마 스튜디오 화면과 그 입구(도구 탭 줄, 꾸미기 탭 버튼).
// 만든 테마를 시작할 때 적용하는 일은 코어(data/themes.js restoreActiveTheme)가 해서, 이 애드온이 없어도 테마는 그대로 보여요.
import { h } from "../../src/ui/dom.js";
import { btn } from "../../src/ui/kit.js";
import { renderChatTheme } from "../../src/ui/screens/chattheme.js";
import { renderThemeBuilder } from "../../src/ui/screens/themebuilder.js";
import { renderThemeStudio } from "../../src/ui/screens/themestudio.js";

export async function activate(_api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [
    ext.add("screen", "tools/chattheme", renderChatTheme),
    ext.add("screen", "tools/themebuilder", renderThemeBuilder),
    ext.add("screen", "tools/themestudio", renderThemeStudio),
    ext.add("row", "tools.frequent", { id: "rb-tool-chattheme", icon: "palette", title: "채팅 테마 빌더", desc: "테마 만들기·목록·코드 주고받기", onClick: (c) => c.go("tools", "chattheme") }),
    ext.add("slot", "look.mine", (c) => btn("내 채팅 테마 만들기", { kind: "primary", onClick: () => c.go("tools", "chattheme"), id: "rb-look-themebuilder" })),
    ext.add("slot", "look.adv", (c) => h("div", { class: "rb-lfield" }, h("b", null, "테마 스튜디오"), h("small", null, "말풍선·글꼴·CSS를 직접 고치고 공유 코드로 주고받아요."), btn("테마 스튜디오 열기", { onClick: () => c.go("tools", "themestudio"), id: "rb-look-themestudio" })))
  ];
  return { deactivate() { off.forEach((f) => f()); } };
}
