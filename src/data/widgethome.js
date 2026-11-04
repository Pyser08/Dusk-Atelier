// 위젯 홈(PocketRisu 위젯 홈 이식) 켜기/끄기와 수명 관리. 기본 꺼짐, 키 dusk.widgethome.on.
// 화면은 src/widgethome/ 안에서만 그리고(Shadow DOM), 여기서는 시작·정리·원본 플러그인 감지만 한다.
import { bootWidgetHome } from "../widgethome/home.js";
import { listPlugins } from "./plugins.js";
export const WH_KEY = "dusk.widgethome.on";
export const WH_ORIGINAL = "pocketrisu_basic_home";
export async function loadWidgetHomeOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(WH_KEY);
    return raw === "on" || raw === true || raw === "true";
  } catch {
    return false;
  }
}
export function createWidgetHome(api, { log = () => {}, boot = bootWidgetHome, load = loadWidgetHomeOn } = {}) {
  let inst = null, starting = null, error = "", onNow = false;
  async function startNow() {
    if (inst) return true;
    try {
      if (typeof api.showContainer !== "function" || typeof api.registerButton !== "function") throw new Error("이 환경에서는 위젯 홈을 쓸 수 없어요.");
      inst = await boot(api, { log });
      error = "";
      return true;
    } catch (e) {
      inst = null;
      error = String(e?.message ?? e);
      log(`위젯 홈 시작 실패 ${error}`);
      return false;
    }
  }
  const start = () => (starting ??= startNow().finally(() => { starting = null; }));
  async function stop() {
    if (starting) await starting.catch(() => {});
    const cur = inst;
    inst = null;
    if (!cur) return true;
    try { await cur.dispose(); } catch (e) { log(`위젯 홈 정리 실패 ${e?.message ?? e}`); }
    return true;
  }
  return {
    isRunning: () => !!inst,
    isVisible: () => !!inst?.isVisible?.(),
    lastError: () => error,
    autoStatus: () => inst?.autoStatus?.() ?? "",
    // 원본 위젯 홈 플러그인이 같이 켜져 있는지 (켜져 있어도 Dusk 쪽이 그대로 동작해요)
    async originalInstalled() {
      try { return (await listPlugins(api)).some((p) => p.name === WH_ORIGINAL && p.enabled); } catch { return false; }
    },
    // 실행 시: 저장된 값이 켜짐이면 시작
    async boot() { onNow = await load(api); if (onNow) await start(); },
    on: () => onNow,
    // 설정에서 바꿀 때: 저장하고 바로 반영
    async set(next) {
      onNow = !!next;
      try { await api.pluginStorage.setItem(WH_KEY, next ? "on" : "off"); } catch { /* 저장 못 해도 이번 실행에는 반영 */ }
      return next ? start() : stop();
    },
    async open() { if (!inst && !(await start())) return false; return inst.open(); },
    async close() { return inst?.close?.(); },
    // Dusk 창을 열기 전에: 떠 있는 위젯 홈은 먼저 닫는다(같은 플러그인 화면을 번갈아 써요)
    async yieldToDusk() { if (inst?.isVisible?.()) await inst.close(); },
    stop
  };
}
