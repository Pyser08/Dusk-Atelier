// ProtLink+(Proton Drive 링크로 봇·모듈·프리셋·플러그인 받기) 켜기/끄기와 수명 관리. 기본 켜짐, 키 dusk.protlink.on.
// 본체는 src/protlink/(원작자에게 제공받은 v1.0.0 격리 이식, 자체 화면 포함). 여기서는 시작·정리·원본 플러그인 감지·링크 목록 읽기만 한다.
import { listPlugins } from "./plugins.js";
export const PL_KEY = "dusk.protlink.on";
export const PL_ORIGINAL = "protlink_plus";           // 원본 플러그인 이름(//@name protlink_plus)
export const PL_STORE_KEY = "protlink-plus:v1";       // 본체가 링크 목록을 저장하는 키(그대로 써서 원본과 같은 모양)
export const PL_SEED_KEY = "protlink-plus:selfSeeded:v1";
export async function loadProtLinkOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(PL_KEY);
    return !(raw === "off" || raw === false || raw === "false");
  } catch {
    return true;
  }
}
// 저장된 목록 → 위젯·화면에 보여 줄 요약(주소·비밀번호는 넣지 않는다)
export function summarizeLinks(raw) {
  let s = raw;
  try { if (typeof s === "string") s = JSON.parse(s); } catch { s = null; }
  const links = Array.isArray(s?.links) ? s.links : [];
  const items = links.filter((l) => l && typeof l.id === "string" && !l.deleted && typeof l.url === "string" && l.url)
    .map((l) => ({ id: l.id, name: String(l.name || "").trim() || "이름 없는 링크", kind: typeof l.kind === "string" ? l.kind : "", count: Array.isArray(l.snapshot) ? l.snapshot.length : 0, at: Number(l.lastCheckedAt || l.updatedAt || l.addedAt) || 0, error: !!l.lastError }));
  items.sort((a, b) => b.at - a.at);
  const folders = Array.isArray(s?.folders) ? s.folders.filter((f) => f && !f.deleted).length : 0;
  return { items, folders };
}
// 본체에 넘기는 api: 자체 설정 항목·햄버거 버튼은 만들지 않고(Dusk 화면이 대신함), 화면을 닫을 때 알려 준다.
export function wrapApi(api, { onClosed = () => {}, onUnload = () => {} } = {}) {
  let shownAt = 0;
  const over = {
    registerSetting: async () => {},
    registerButton: async () => {},
    showContainer: async (...a) => { shownAt = Date.now(); return api.showContainer(...a); },
    hideContainer: async (...a) => {
      const t = Date.now();
      try { return await api.hideContainer(...a); }
      finally { setTimeout(() => { if (shownAt < t) onClosed(); }, 350); }   // 곧바로 다시 보이면(권한 확인용 잠깐 숨김) 닫힌 게 아니다
    },
    onUnload: async (fn) => { onUnload(fn); try { await api.onUnload?.(fn); } catch { /* 무시 */ } }
  };
  return new Proxy(api, {
    get(t, p) { if (Object.hasOwn(over, p)) return over[p]; const v = t[p]; return typeof v === "function" ? v.bind(t) : v; }
  });
}
const loadBoot = async () => (await import("../protlink/protlink.js")).bootProtLink;
export function createProtLink(api, { log = () => {}, boot = null, load = loadProtLinkOn, hooks = {}, originalProbe = null } = {}) {
  let inst = null, starting = null, error = "", onNow = true, unloadFn = null;
  async function originalOn() {
    try { return originalProbe ? !!(await originalProbe()) : (await listPlugins(api)).some((p) => p.name === PL_ORIGINAL && p.enabled); } catch { return false; }
  }
  async function startNow() {
    if (inst) return true;
    try {
      if (typeof api.showContainer !== "function") throw new Error("이 환경에서는 ProtLink+를 쓸 수 없어요.");
      // 원본 ProtLink+ 플러그인이 같이 켜져 있으면 같은 링크를 두 곳이 확인하고 알림도 두 번 떠서, 이쪽을 시작하지 않는다.
      if (await originalOn()) throw new Error("원래 ‘ProtLink+’ 플러그인이 켜져 있어요. 둘이 같이 돌면 업데이트 알림이 두 번 떠요. 원래 플러그인을 끄면 Dusk 안의 ProtLink+를 쓸 수 있어요.");
      // 원본의 ‘ProtLink+ 자체 업데이트 링크’는 Dusk 안에서는 필요 없으니, 처음 한 번 심는 것을 건너뛴다.
      try { if (!(await api.pluginStorage.getItem(PL_SEED_KEY))) await api.pluginStorage.setItem(PL_SEED_KEY, "1"); } catch { /* 무시 */ }
      const run = boot ?? (await loadBoot());
      const next = await run(wrapApi(api, { onClosed: () => { try { hooks.onClosed?.(); } catch { /* 무시 */ } }, onUnload: (fn) => { unloadFn = fn; } }));
      if (!next || typeof next.open !== "function") throw new Error("ProtLink+ 초기화가 끝까지 가지 못했어요.");
      inst = next; error = "";
      return true;
    } catch (e) {
      inst = null; error = String(e?.message ?? e);
      log(`ProtLink+ 시작 실패 ${error}`);
      return false;
    }
  }
  const start = () => (starting ??= startNow().finally(() => { starting = null; }));
  async function stop() {
    if (starting) await starting.catch(() => {});
    const cur = inst, fn = unloadFn;
    inst = null; unloadFn = null;
    if (!cur) return true;
    try { await cur.close?.(); } catch { /* 무시 */ }
    try { await fn?.(); } catch (e) { log(`ProtLink+ 정리 실패 ${e?.message ?? e}`); }
    return true;
  }
  async function links() {
    try { return { ok: true, ...summarizeLinks(await api.pluginStorage.getItem(PL_STORE_KEY)) }; } catch { return { ok: false, items: [], folders: 0 }; }
  }
  return {
    isRunning: () => !!inst,
    lastError: () => error,
    on: () => onNow,
    originalInstalled: originalOn,
    // 실행 시: 저장된 값이 켜짐(기본)이면 시작
    async boot() { onNow = await load(api); if (!onNow) return false; return start(); },
    async set(next) {
      onNow = !!next;
      try { await api.pluginStorage.setItem(PL_KEY, next ? "on" : "off"); } catch { /* 저장 못 해도 이번 실행에는 반영 */ }
      return next ? start() : stop();
    },
    // linkId를 주면 그 링크의 미리보기·받기 화면을 바로 연다
    async open(linkId) {
      if (!onNow) { error = "ProtLink+가 꺼져 있어요."; return false; }
      if (!inst && !(await start())) return false;
      try { await hooks.beforeOpen?.(); } catch { /* 무시 */ }
      try { await inst.open(linkId || undefined); return true; } catch (e) { error = String(e?.message ?? e); log(`ProtLink+ 열기 실패 ${error}`); return false; }
    },
    async close() { try { await inst?.close?.(); } catch { /* 무시 */ } },
    links,
    stop
  };
}
