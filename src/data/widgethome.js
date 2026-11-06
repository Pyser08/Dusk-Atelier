// 위젯 홈(PocketRisu 위젯 홈 이식) 켜기/끄기와 수명 관리. 기본 꺼짐, 키 dusk.widgethome.on.
// 화면은 src/widgethome/ 안에서만 그리고(Shadow DOM), 여기서는 시작·정리·원본 플러그인 감지만 한다.
import { bootWidgetHome } from "../widgethome/home.js";
import { listPlugins } from "./plugins.js";
export const WH_KEY = "dusk.widgethome.on";
export const WH_ONLOAD_KEY = "dusk.widgethome.onload";   // 리스를 켜면 바로 열기 (기본 켜짐)
export const WH_ORIGINAL = "pocketrisu_basic_home";
export async function loadWidgetHomeOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(WH_KEY);
    return raw === "on" || raw === true || raw === "true";
  } catch {
    return false;
  }
}
export async function loadOpenOnLoad(api) {
  try {
    const raw = await api.pluginStorage.getItem(WH_ONLOAD_KEY);
    return !(raw === "off" || raw === false || raw === "false");
  } catch {
    return true;
  }
}
export function createWidgetHome(api, { log = () => {}, boot = bootWidgetHome, load = loadWidgetHomeOn, loadOnLoad = loadOpenOnLoad, openDusk = null, protLink = null } = {}) {
  let resumeAfterDusk = false, inst = null, starting = null, error = "", onNow = false, onLoadNow = true;
  async function startNow() {
    if (inst) return true;
    try {
      if (typeof api.showContainer !== "function" || typeof api.registerButton !== "function") throw new Error("이 환경에서는 위젯 홈을 쓸 수 없어요.");
      inst = await boot(api, { log, openDusk: openDusk ? (tab) => openDusk(tab) : undefined, protLink: protLink ?? undefined });
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
    shutdown: () => stop(),   // 애드온을 끌 때: 켜기 설정은 그대로 두고 화면만 정리
    isVisible: () => !!inst?.isVisible?.(),
    lastError: () => error,
    autoStatus: () => inst?.autoStatus?.() ?? "",
    // 원본 위젯 홈 플러그인이 같이 켜져 있는지 (켜져 있어도 Dusk 쪽이 그대로 동작해요)
    async originalInstalled() {
      try { return (await listPlugins(api)).some((p) => p.name === WH_ORIGINAL && p.enabled); } catch { return false; }
    },
    // 실행 시: 저장된 값이 켜짐이면 시작
    // 실행 시: 저장된 값이 켜짐이면 시작하고, '바로 열기'가 켜져 있으면 곧장 연다(플러그인이 로드되자마자)
    async boot() {
      onNow = await load(api); onLoadNow = await loadOnLoad(api);
      if (!onNow) return;
      const ok = await start();
      if (ok && onLoadNow) {
        // 홈 자동 감지가 연결되면 사이드바 옆(홈 자리)에 열리도록 잠깐 기다린다. 이미 자동으로 열렸으면 그대로.
        const cur = inst;
        Promise.race([cur?.ready?.(), new Promise((r) => setTimeout(r, 2500))])
          .then(async () => {
            if (cur !== inst || cur.isVisible?.() || cur.isOpening?.()) return;
            // 홈 자리를 찾을 수 있으면 사이드바 옆에만 연다(전체 화면으로 덮지 않음). 화면 접근이 안 되면 전체 화면.
            if (cur.autoConnected?.()) { for (let i = 0; i < 6 && cur === inst && !cur.isVisible?.(); i++) { if (!cur.isOpening?.() && await cur.open(false, { automatic: true, quiet: true })) return; await new Promise((r) => setTimeout(r, 700)); } return; }
            return cur.open();
          })
          .catch((e) => log(`위젯 홈 바로 열기 실패 ${e?.message ?? e}`));
      }
    },
    openOnLoad: () => onLoadNow,
    async setOpenOnLoad(next) { onLoadNow = !!next; try { await api.pluginStorage.setItem(WH_ONLOAD_KEY, next ? "on" : "off"); } catch { /* 이번 실행에는 반영 */ } },
    on: () => onNow,
    // 설정에서 바꿀 때: 저장하고 바로 반영
    async set(next) {
      onNow = !!next;
      try { await api.pluginStorage.setItem(WH_KEY, next ? "on" : "off"); } catch { /* 저장 못 해도 이번 실행에는 반영 */ }
      return next ? start() : stop();
    },
    async open() { if (!inst && !(await start())) return false; return inst.open(); },
    async close() { return inst?.close?.(); },
    // Dusk 설정 카드에서: 디자인·홈 자동 열기 읽고 바꾸기, 위젯 홈 꾸미기 열기
    prefs: () => inst?.getPrefs?.() ?? null,
    async setPrefs(patch) { if (!inst) throw new Error("위젯 홈이 켜져 있지 않아요."); return inst.setPrefs(patch); },
    async openSettings() { if (!inst && !(await start())) return false; return inst.openSettings(); },
    // Dusk 창을 열기 전에: 떠 있는 위젯 홈은 먼저 닫는다(같은 플러그인 화면을 번갈아 써요)
    async yieldToDusk() { if (inst?.isVisible?.()) { resumeAfterDusk = true; await inst.close(); } },
    // Dusk 창을 닫은 뒤: 위젯 홈이 떠 있었다면 다시 띄운다(홈 자리에만. 홈이 아니면 뜨지 않음)
    async resume() {
      if (!resumeAfterDusk) return false;
      resumeAfterDusk = false;
      const cur = inst; if (!cur || cur.isVisible?.() || cur.isOpening?.()) return false;
      try { return cur.autoConnected?.() ? await cur.open(false, { automatic: true, quiet: true }) : await cur.open(); }
      catch (e) { log(`위젯 홈 다시 열기 실패 ${e?.message ?? e}`); return false; }
    },
    stop
  };
}
