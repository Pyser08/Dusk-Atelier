// 더스크 스텔스 애드온: 리스 채팅을 다른 AI 채팅 앱처럼 보이게 하는 테마(클로드·GPT·코덱스·제미나이·딥시크)를 고르고 켠다.
// 켜 둔 모양은 리스 설정(커스텀 CSS·채팅 HTML)에 저장돼 애드온을 꺼도 그대로 보인다. 끄기는 화면에서 한다.
import { renderStealth } from "../../src/ui/screens/stealth.js";

export async function activate(_api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [
    ext.add("screen", "tools/stealth", renderStealth),
    ext.add("row", "tools.frequent", { id: "rb-tool-stealth", icon: "palette", title: "더스크 스텔스", desc: "리스를 다른 AI 앱처럼 꾸미기", onClick: (c) => c.go("tools", "stealth") })
  ];
  return { deactivate() { off.forEach((f) => f()); } };
}
