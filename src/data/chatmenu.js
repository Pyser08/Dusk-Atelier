// 채팅 입력창 옆 메뉴(≡)의 빠른 설정 (1.8.3): [장기 기억 바로가기] · 공정한 전개 · 유저 편향 없애기 · 주사위 결과 표시.
// 누르면 켜고/끄고, 같은 id로 다시 등록해 그 자리에서 이름(켜짐/꺼짐)을 바꾼다(registerButton id 교체).
// 버튼 API가 없는 호스트에선 조용히 넘어간다. 설정에서 숨길 수 있다(기본 보임).
export const CHAT_MENU_KEY = "dusk.ui.chatQuick";
const ICON = { memory: "🧠", regress: "⏳", fair: "⚖️", dice: "🎲", show: "📊" };
export function createChatMenu(api, { fairPlay, turnInfo, openMemory, openRegress, onChange = () => {}, log = (...a) => console.log("[Dusk 채팅 메뉴]", ...a) } = {}) {
  let shown = false;
  const items = [
    // 맨 위(등록 순서 = 메뉴 순서). 켜고 끄는 게 아니라 장기 기억 화면을 여는 바로가기라 이름에 켜짐/꺼짐이 없다.
    ...(typeof openMemory === "function" ? [{ id: "dusk-qt-memory", key: "memory", title: "장기 기억", link: true, open: openMemory }] : []),
    ...(typeof openRegress === "function" ? [{ id: "dusk-qt-regress", key: "regress", title: "회귀", link: true, open: openRegress }] : []),
    { id: "dusk-qt-fair", key: "fair", title: "공정한 전개", get: () => !!fairPlay?.isOn?.(), set: (v) => fairPlay.set(v) },
    { id: "dusk-qt-dice", key: "dice", title: "유저 편향 없애기", get: () => !!(fairPlay?.isOn?.() && fairPlay?.isDiceOn?.()), set: async (v) => { await fairPlay.setDice(v); if (v && !fairPlay.isOn()) await fairPlay.set(true); } },
    { id: "dusk-qt-show", key: "show", title: "주사위 결과 표시", get: () => !!turnInfo?.isDiceShow?.(), set: (v) => turnInfo.setDiceShow(v) }
  ].filter((x) => (x.link ? true : x.key === "show" ? turnInfo && turnInfo.supported?.() !== false : fairPlay));   // 응답 아래 표시를 못 쓰는 호스트(RisuBard)는 '주사위 결과 표시'를 뺀다
  const nameOf = (x) => (x.link ? x.title : `${x.title} · ${x.get() ? "켜짐" : "꺼짐"}`);
  async function put(x, location = "chat") {
    await api.registerButton({ name: nameOf(x), icon: ICON[x.key], iconType: "html", location, id: x.id }, () => (x.link ? openLink(x) : toggle(x)));
  }
  async function openLink(x) { try { await x.open(); } catch (e) { log("열지 못함", e?.message ?? e); } }
  async function toggle(x) {
    try { await x.set(!x.get()); await refresh(); onChange(x.key, x.get()); } catch (e) { log("바꾸지 못함", e?.message ?? e); }
  }
  async function refresh() { if (!shown) return; for (const x of items) { if (x.link) continue; try { await put(x); } catch (e) { log("이름 갱신 실패", e?.message ?? e); } } }
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
    // 애드온이 바로가기(링크)를 맨 위에 붙인다(장기 기억·회귀 → 장기기억 애드온). 반환: 떼기. 메뉴 순서를 지키려고 다시 등록한다.
    async addLink(item) {
      const x = { link: true, ...item };
      const at = items.filter((i) => i.link).length;
      items.splice(at, 0, x);
      if (shown) { await hide(); await show(); }
      return async () => { const i = items.indexOf(x); if (i < 0) return; items.splice(i, 1); try { await api.unregisterUIPart?.(x.id); } catch { /* 이미 없음 */ } };
    },
    refresh,
    toggle: (key) => { const x = items.find((i) => i.key === key); return x ? (x.link ? openLink(x) : toggle(x)) : null; }
  };
}
