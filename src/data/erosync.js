// Erosync(NSFW 장면 디렉터) 켜기/끄기와 수명 관리. 기본 꺼짐, 키 dusk.erosync.on.
// 본체는 src/erosync/(원작자에게 제공받은 V0.9.1 격리 이식). 여기서는 시작·정리·원본 플러그인 감지만 한다.
import { listPlugins } from "./plugins.js";
export const ERO_KEY = "dusk.erosync.on";
export const ERO_ORIGINAL = "erosync";   // 원본 플러그인 이름(//@name erosync)
export async function loadErosyncOn(api) {
  try {
    const raw = await api.pluginStorage.getItem(ERO_KEY);
    return raw === "on" || raw === true || raw === "true";
  } catch {
    return false;
  }
}
// 본체는 켤 때만 불러온다(번들 안에서도 처음 부를 때까지 실행되지 않는다).
const loadBoot = async () => (await import("../erosync/erosync.js")).bootErosync;
export function createErosync(api, { log = () => {}, boot = null, load = loadErosyncOn, host = {} } = {}) {
  let inst = null, starting = null, error = "", onNow = false;
  async function originalOn() {
    try { return (await listPlugins(api)).some((p) => p.name === ERO_ORIGINAL && p.enabled); } catch { return false; }
  }
  async function startNow() {
    if (inst) return true;
    try {
      if (typeof api.addRisuReplacer !== "function") throw new Error("이 환경에서는 Erosync를 쓸 수 없어요(요청 훅 없음).");
      // 원본 Erosync 플러그인이 같이 켜져 있으면 같은 요청에 두 번 들어가고 같은 저장 키를 같이 써서 꼬인다 → 이쪽을 시작하지 않는다.
      if (await originalOn()) throw new Error("원래 ‘Erosync’ 플러그인이 켜져 있어요. 둘이 같이 돌면 같은 요청에 두 번 들어가니, 원래 플러그인을 끄고 다시 켜 주세요.");
      const run = boot ?? (await loadBoot());
      const next = await run(api, host);
      if (next?.loaded && !next.loaded()) {
        await next.dispose?.().catch(() => {});
        throw new Error("Erosync 초기화가 끝까지 가지 못했어요. 리스 개발자 콘솔의 [Erosync] 로그를 확인해 주세요.");
      }
      inst = next;
      error = "";
      return true;
    } catch (e) {
      inst = null;
      error = String(e?.message ?? e);
      log(`Erosync 시작 실패 ${error}`);
      return false;
    }
  }
  const start = () => (starting ??= startNow().finally(() => { starting = null; }));
  async function stop() {
    if (starting) await starting.catch(() => {});
    const cur = inst;
    inst = null;
    if (!cur) return true;
    try { await cur.dispose(); } catch (e) { log(`Erosync 정리 실패 ${e?.message ?? e}`); }
    return true;
  }
  return {
    isRunning: () => !!inst,
    lastError: () => error,
    on: () => onNow,
    originalInstalled: originalOn,
    // 실행 시: 저장된 값이 켜짐이면 시작
    async boot() {
      onNow = await load(api);
      if (!onNow) return false;
      return start();
    },
    // 설정에서 바꿀 때: 저장하고 바로 반영
    async set(next) {
      onNow = !!next;
      try { await api.pluginStorage.setItem(ERO_KEY, next ? "on" : "off"); } catch { /* 저장 못 해도 이번 실행에는 반영 */ }
      return next ? start() : stop();
    },
    // 현재 봇·채팅의 Erosync 값(읽기 전용 JSON). 꺼져 있거나 못 읽으면 { ok:false, reason }
    async read() {
      if (!inst || typeof inst.read !== "function") return { ok: false, reason: "off", people: [], goals: [], rivalries: [], relations: [] };
      try { return await inst.read(); } catch (e) { return { ok: false, reason: String(e?.message ?? e), people: [], goals: [], rivalries: [], relations: [] }; }
    },
    // 지금 열린 봇의 수위 설정(읽기·쓰기). 꺼져 있으면 { ok:false, reason:"off" }
    async content(patch = null) {
      if (!inst?.content) return { ok: false, reason: "off", limits: [] };
      try { return patch ? await inst.content.set(patch) : await inst.content.get(); } catch (e) { return { ok: false, reason: String(e?.message ?? e), limits: [] }; }
    },
    // Erosync 자체 화면(프로필 고치기·장면 등)을 연다. 꺼져 있으면 false
    async open() {
      if (!inst || typeof inst.open !== "function") return false;
      try { await inst.open(); return true; } catch (e) { log(`Erosync 화면 열기 실패 ${e?.message ?? e}`); return false; }
    },
    stop
  };
}
