// 더스크 스텔스 애드온: 리스 채팅을 다른 AI 채팅 앱처럼 보이게 하는 테마(클로드·GPT·코덱스·제미나이·딥시크)를 고르고 켠다.
// 켜 둔 모양은 리스 설정(커스텀 CSS·채팅 HTML)에 저장돼 애드온을 꺼도 그대로 보인다. 끄기는 화면에서 한다.
import { renderStealth } from "../../src/ui/screens/stealth.js";
import { reapplyIfUpdated } from "../../src/data/stealth-apply.js";
import { syncShell, setDuskOpen, refreshDuskOpen } from "../../src/data/stealth-shell.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [
    ext.add("screen", "tools/stealth", renderStealth),
    ext.add("tab", "stealth", renderStealth),
    ext.add("row", "tools.frequent", { id: "rb-tool-stealth", icon: "palette", title: "더스크 스텔스", desc: "리스를 다른 AI 앱처럼 꾸미기", onClick: (c) => c.go("tools", "stealth") })
  ];
  // Dusk 창이 열리고 닫히는 걸 알아채 스텔스 상단 줄·사이드바를 감춘다(같은 api 객체를 코어와 함께 쓴다)
  const orig = { show: api.showContainer, hide: api.hideContainer };
  let wrapped = false;
  try {
    if (typeof orig.show === "function" && typeof orig.hide === "function") {
      api.showContainer = async (...a) => { setDuskOpen(true); return orig.show.apply(api, a); };
      api.hideContainer = async (...a) => { try { return await orig.hide.apply(api, a); } finally { setDuskOpen(false); } };
      wrapped = api.showContainer !== orig.show;
    }
  } catch { /* 바꿀 수 없는 객체면 그대로 */ }
  // 크기로도 확인(코어가 다른 api 사본을 쓰면 위 감싸기가 안 잡힌다): 크기 바뀔 때 + 1초마다(로컬 값만 봐서 가볍다)
  const sizeCheck = () => refreshDuskOpen();
  try { globalThis.addEventListener?.("resize", sizeCheck); } catch { /* 없음 */ }
  const sizeTimer = setInterval(sizeCheck, 1000);
  sizeCheck();
  // 이미지 접기는 채팅 HTML·CSS만으로 한다(0.3.6부터 display 훅 없음 → 채팅 열기가 느려지지 않음)
  // 켜 둔 클로드 계열 모양이면 사이드바를 다시 그린다(화면은 새로고침마다 비어 있으므로)
  reapplyIfUpdated(api, ctx.version).then(({ st }) => syncShell(api, st)).catch((e) => console.log("[Dusk Atelier] 스텔스 사이드바 시작 실패", e?.message ?? e));
  return { async deactivate() { off.forEach((f) => f()); clearInterval(sizeTimer); try { globalThis.removeEventListener?.("resize", sizeCheck); } catch { /* 없음 */ } if (wrapped) { try { api.showContainer = orig.show; api.hideContainer = orig.hide; } catch { /* 그대로 */ } } setDuskOpen(false); await syncShell(api, null).catch(() => {}); } };
}
