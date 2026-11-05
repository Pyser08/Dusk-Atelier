// 시험용 애드온: 로더가 제대로 불러오는지 확인한다. 켜지면 알림 한 번, 채팅 메뉴(햄버거)에 'Dusk 애드온 시험' 버튼을 단다.
// 알림은 Dusk 창 안에 뜨므로, 버튼을 누르면 Dusk 설정 탭을 연 뒤 알림을 띄운다.
export const meta = { id: "hello", name: "애드온 시험", version: "0.1.2" };
export async function activate(api, ctx) {
  ctx.toast?.(`애드온 시험 v${ctx.version} 켜졌어요`);
  let id = null;
  try {
    id = await api.registerButton?.({ name: "Dusk 애드온 시험", icon: "🧵", iconType: "html", location: "hamburger" }, async () => { await ctx.openDusk?.("settings"); ctx.toast?.("애드온에서 눌렀어요 — 같은 창·같은 api로 돌고 있어요"); });   // 콜백은 아무것도 돌려주지 않는다(호스트로 복제 안 되는 값이면 오류)
  } catch (e) { console.log("[Dusk Atelier] 애드온 시험: 버튼 등록 실패", e?.message ?? e); }
  return { deactivate() { try { if (id != null) api.unregisterUIPart?.(id); } catch { /* 이미 없음 */ } } };
}
