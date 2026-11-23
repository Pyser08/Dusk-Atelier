// 채팅 메뉴(입력 옆)의 떠 있는 버튼(v1.9.3부터 인물 관계도로 연결)을 설정에서 켜고 끄기 (v1.6.5). 기본 켜짐.
// 11-23 코어 설정 화면은 이 설정 읽기만 쓰고, 버튼 만들기(memorybutton.js)는 장기기억 애드온에만 들어간다.
export const MEMORY_BUTTON_KEY = "dusk.ui.memoryButton";
export async function loadMemoryButtonOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(MEMORY_BUTTON_KEY);
    return !(raw === "off" || raw === false || raw === "false");
  } catch {
    return true;
  }
}
