// 더스크 스텔스 애드온: 리스 채팅을 다른 AI 채팅 앱처럼 보이게 하는 테마(클로드·GPT·코덱스·제미나이·딥시크)를 고르고 켠다.
// 켜 둔 모양은 리스 설정(커스텀 CSS·채팅 HTML)에 저장돼 애드온을 꺼도 그대로 보인다. 끄기는 화면에서 한다.
import { renderStealth } from "../../src/ui/screens/stealth.js";
import { loadStealth } from "../../src/data/stealth-apply.js";
import { syncShell } from "../../src/data/stealth-shell.js";
import { foldDisplay } from "../../src/data/stealth-fold.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [
    ext.add("screen", "tools/stealth", renderStealth),
    ext.add("row", "tools.frequent", { id: "rb-tool-stealth", icon: "palette", title: "더스크 스텔스", desc: "리스를 다른 AI 앱처럼 꾸미기", onClick: (c) => c.go("tools", "stealth") })
  ];
  // 답변 속 이미지를 '명령어 N개 실행함' 접힘으로(화면에만, 저장된 채팅은 그대로)
  let hooked = false;
  try { if (typeof api.addRisuScriptHandler === "function") { await api.addRisuScriptHandler("display", foldDisplay); hooked = true; } } catch (e) { console.log("[Dusk Atelier] 스텔스 이미지 접기 훅 실패", e?.message ?? e); }
  // 켜 둔 클로드 계열 모양이면 사이드바를 다시 그린다(화면은 새로고침마다 비어 있으므로)
  loadStealth(api).then((st) => syncShell(api, st)).catch((e) => console.log("[Dusk Atelier] 스텔스 사이드바 시작 실패", e?.message ?? e));
  return { async deactivate() { off.forEach((f) => f()); await syncShell(api, null).catch(() => {}); if (hooked) { try { await api.removeRisuScriptHandler?.("display", foldDisplay); } catch { /* 이미 없음 */ } } } };
}
