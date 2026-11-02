// 채팅 입력창 옆 메뉴(≡)의 빠른 설정 (1.8.3): 공정한 전개 · 유저 편향 없애기 · 주사위 결과 표시.
// 누르면 켜고/끄고, 같은 id로 다시 등록해 그 자리에서 이름(켜짐/꺼짐)을 바꾼다(registerButton id 교체).
// 버튼 API가 없는 호스트에선 조용히 넘어간다. 설정에서 숨길 수 있다(기본 보임).
export const CHAT_MENU_KEY = "dusk.ui.chatQuick";
const ICON = { fair: "⚖️", dice: "🎲", show: "📊" };
export function createChatMenu(api, { fairPlay, turnInfo, onChange = () => {}, log = (...a) => console.log("[Dusk 채팅 메뉴]", ...a) } = {}) {
  let shown = false;
  const items = [
    { id: "dusk-qt-fair", key: "fair", title: "공정한 전개", get: () => !!fairPlay?.isOn?.(), set: (v) => fairPlay.set(v) },
    { id: "dusk-qt-dice", key: "dice", title: "유저 편향 없애기", get: () => !!(fairPlay?.isOn?.() && fairPlay?.isDiceOn?.()), set: async (v) => { await fairPlay.setDice(v); if (v && !fairPlay.isOn()) await fairPlay.set(true); } },
    { id: "dusk-qt-show", key: "show", title: "주사위 결과 표시", get: () => !!turnInfo?.isDiceShow?.(), set: (v) => turnInfo.setDiceShow(v) }
  ].filter((x) => (x.key === "show" ? turnInfo : fairPlay));
  const nameOf = (x) => `${x.title} · ${x.get() ? "켜짐" : "꺼짐"}`;
  async function put(x, location = "chat") {
    await api.registerButton({ name: nameOf(x), icon: ICON[x.key], iconType: "html", location, id: x.id }, () => toggle(x));
  }
  async function toggle(x) {
    try { await x.set(!x.get()); await refresh(); onChange(x.key, x.get()); } catch (e) { log("바꾸지 못함", e?.message ?? e); }
  }
  async function refresh() { if (!shown) return; for (const x of items) { try { await put(x); } catch (e) { log("이름 갱신 실패", e?.message ?? e); } } }
  async function show() {
    if (shown) return true;
    if (typeof api.registerButton !== "function") return false;
    try { shown = true; for (const x of items) await put(x); return true; } catch (e) { shown = false; log("버튼 등록 실패", e?.message ?? e); return false; }
  }
  async function hide() {
    if (!shown) return true;
    shown = false;
    for (const x of items) { try { await api.unregisterUIPart?.(x.id); } catch { /* 이미 없음 */ } }
    return true;
  }
  async function isOnSaved() { try { const v = await api.pluginStorage.getItem(CHAT_MENU_KEY); return !(v === "off" || v === false || v === "false"); } catch { return true; } }
  return {
    async start() { return (await isOnSaved()) ? show() : false; },
    async setOn(v) { await api.pluginStorage.setItem(CHAT_MENU_KEY, v ? "on" : "off"); return v ? show() : hide(); },
    isOn: isOnSaved,
    refresh,
    toggle: (key) => { const x = items.find((i) => i.key === key); return x ? toggle(x) : null; }
  };
}
