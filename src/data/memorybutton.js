// 채팅 메뉴의 떠 있는 버튼 만들기(장기기억 애드온). 켜고 끄기 설정은 memorybuttonkey.js(코어).
import { MEMORY_BUTTON_KEY, loadMemoryButtonOn } from "./memorybuttonkey.js";
export { MEMORY_BUTTON_KEY, loadMemoryButtonOn };   // 재수출만 하면 이 파일 안에 이름이 없어 start()/set()이 ReferenceError(2.2.44 버그)
import { createFloatButton } from "./floatbtn.js";
// 2.2.25: ensureDoc(리스 화면 문서, 권한 있을 때)가 있으면 Dusk가 직접 그린 동그란 반투명 버튼(끌어서 옮김)을 쓰고, 없으면 리스 버튼
export function createMemoryButton(api, { name, icon, open, log, ensureDoc = null }) {
  let part = null, on = false;
  const fab = ensureDoc ? createFloatButton(api, { ensureDoc, icon, title: name, open, log }) : null;
  async function show() {
    if (on) return true;
    try { if (fab && await fab.show()) { on = true; return true; } } catch (e) { log?.(`떠 있는 버튼 그리기 실패 ${e?.message ?? e}`); }
    try {
      part = await api.registerButton({ name, icon, iconType: "html", location: "action", id: "dusk-memory-button" }, open);   // id가 있어야 포켓리스가 떠 있는 버튼 위치를 옮기고 기억해요
      on = true;
      return true;
    } catch (e) {
      log?.(`채팅 메뉴 버튼 등록 실패 ${e?.message ?? e}`);
      return false;
    }
  }
  async function hide() {
    if (!on) return true;
    if (fab?.isOn()) { await fab.hide(); on = false; return true; }
    const id = part?.id ?? part;
    try {
      await api.unregisterUIPart(id);
      on = false;
      part = null;
      return true;
    } catch (e) {
      log?.(`채팅 메뉴 버튼 제거 실패 ${e?.message ?? e}`);
      return false;
    }
  }
  return {
    isOn: () => on,
    // 저장하고 바로 반영. 반영하지 못하면 false(저장은 되어 있어 다음 실행부터 적용)
    async set(next) {
      try { await api.pluginStorage.setItem(MEMORY_BUTTON_KEY, next ? "on" : "off"); } catch {}
      return next ? show() : hide();
    },
    async start() {
      if (await loadMemoryButtonOn(api)) await show();
    },
    hide,   // 애드온을 끌 때 버튼만 내린다(설정값은 그대로)
    // 2.2.50: 크기·투명도 바로 반영(Dusk가 그린 동그란 버튼일 때만. 리스 버튼이면 false)
    setLook: async (look) => (fab?.isOn() ? fab.setLook(look) : false)
  };
}
