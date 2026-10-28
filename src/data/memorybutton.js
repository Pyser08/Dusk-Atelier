// 채팅 메뉴(입력 옆)의 '장기기억' 버튼을 설정에서 켜고 끄기 (v1.6.5). 기본 켜짐.
export const MEMORY_BUTTON_KEY = "dusk.ui.memoryButton";
export async function loadMemoryButtonOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(MEMORY_BUTTON_KEY);
    return !(raw === "off" || raw === false || raw === "false");
  } catch {
    return true;
  }
}
export function createMemoryButton(api, { name, icon, open, log }) {
  let part = null, on = false;
  async function show() {
    if (on) return true;
    try {
      part = await api.registerButton({ name, icon, iconType: "html", location: "action" }, open);
      on = true;
      return true;
    } catch (e) {
      log?.(`채팅 메뉴 버튼 등록 실패 ${e?.message ?? e}`);
      return false;
    }
  }
  async function hide() {
    if (!on) return true;
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
    }
  };
}
