// Erosync(NSFW 장면 디렉터) 켜기/끄기와 수명 관리. 기본 꺼짐, 키 dusk.erosync.on.
// 본체는 src/erosync/(원작자에게 제공받은 V0.9.1 격리 이식). 여기서는 시작·정리·원본 플러그인 감지만 한다.
import { listPlugins } from "./plugins.js";
import { loadPresets, savePresets, upsertPreset } from "./erosyncpreset.js";
import { loadTags, saveTags, withProfileTags } from "./erosynctags.js";
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
export const GUARD_KEY = "dusk.erosync.guard";
export const TEMP_KEY = "dusk.erosync.tempTrend";   // 관계 온도 변화를 장면 판단 입력에 넣을지(기본 켜짐)
export const GUARD_DEFAULT = Object.freeze({ on: false, obsessionCap: 20, sameTargetTurns: 3, restTurns: 4 });
export function normGuard(v) {
  const n = (x, d, lo, hi) => { const k = Number(x); return Number.isFinite(k) ? Math.min(hi, Math.max(lo, Math.round(k))) : d; };
  return { on: v?.on === true, obsessionCap: n(v?.obsessionCap, 20, 0, 100), sameTargetTurns: n(v?.sameTargetTurns, 3, 1, 20), restTurns: n(v?.restTurns, 4, 1, 50) };
}
// 본체는 켤 때만 불러온다(번들 안에서도 처음 부를 때까지 실행되지 않는다).
const loadBoot = async () => (await import("../erosync/erosync.js")).bootErosync;
export function createErosync(api, { log = () => {}, boot = null, load = loadErosyncOn, host = {}, cycleProbe = null } = {}) {
  let timer = null, duskCycle = false, tempTrend = true;
  let inst = null, starting = null, error = "", onNow = false, guardNow = { ...GUARD_DEFAULT }, tagsNow = {};
  async function loadGuard() {
    try { const raw = await api.pluginStorage.getItem(GUARD_KEY); guardNow = normGuard(typeof raw === "string" ? JSON.parse(raw) : raw); } catch { guardNow = { ...GUARD_DEFAULT }; }
    try { inst?.guard?.set?.(guardNow); } catch { /* 무시 */ }
    return { ...guardNow };
  }
  // Dusk ‘월경·임신 기록’이 켜져 있으면 주기는 Dusk가 맡는다(엔진의 주기는 쉼). 시작할 때와 가끔 다시 확인한다.
  async function refreshFlags() {
    try { duskCycle = cycleProbe ? !!(await cycleProbe()) : false; } catch { duskCycle = false; }
    try { const raw = await api.pluginStorage.getItem(TEMP_KEY); tempTrend = !(raw === "off" || raw === false || raw === "false"); } catch { tempTrend = true; }
    try { inst?.flags?.set?.({ duskCycle, tempTrend }); } catch { /* 무시 */ }
    return duskCycle;
  }
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
      try { next.guard?.set?.(guardNow); } catch { /* 집착 방지는 실패해도 본체는 계속 */ }
      try { tagsNow = await loadTags(api); next.tags?.set?.(tagsNow); } catch { /* 태그는 실패해도 본체는 계속 */ }
      await refreshFlags();
      if (!timer && cycleProbe) timer = setInterval(() => { void refreshFlags(); }, 30000);
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
    if (timer) { clearInterval(timer); timer = null; }
    const cur = inst;
    inst = null;
    if (!cur) return true;
    try { await cur.dispose(); } catch (e) { log(`Erosync 정리 실패 ${e?.message ?? e}`); }
    return true;
  }
  return {
    isRunning: () => !!inst,
    refreshFlags,
    cycleByDusk: () => duskCycle,
    // 관계 온도 변화를 장면 판단에 넣을지(저장 + 바로 반영). 인자 없으면 현재 값
    async tempTrend(v) {
      if (typeof v === "boolean") { tempTrend = v; try { await api.pluginStorage.setItem(TEMP_KEY, v ? "on" : "off"); } catch { /* 이번 실행에는 반영 */ } try { inst?.flags?.set?.({ tempTrend }); } catch { /* 무시 */ } }
      return tempTrend;
    },
    lastError: () => error,
    on: () => onNow,
    originalInstalled: originalOn,
    // 실행 시: 저장된 값이 켜짐이면 시작
    async boot() {
      onNow = await load(api);
      await loadGuard();
      if (!onNow) return false;
      return start();
    },
    // 집착 방지 설정(Dusk 쪽에 저장, 켜져 있으면 엔진에도 바로 반영)
    guard: () => ({ ...guardNow }),
    loadGuard,
    async setGuard(v) {
      guardNow = normGuard({ ...guardNow, ...v });
      try { await api.pluginStorage.setItem(GUARD_KEY, JSON.stringify(guardNow)); } catch { /* 저장 못 해도 이번 실행에는 반영 */ }
      try { inst?.guard?.set?.(guardNow); } catch { /* 무시 */ }
      return { ...guardNow };
    },
    // 직전 장면 판단 되돌리기(지금 열린 채팅). 꺼져 있으면 { ok:false, reason:"off" }
    async undoScene() {
      const U = inst?.undo;
      if (!U) return { ok: false, reason: "off" };
      try { return await U.lastScene(); } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
    },
    // 인물별 선호·금기 태그(직접 적은 글). id를 주면 그 인물, 없으면 전체. 저장하면 바로 엔진에 반영한다.
    async tags(id) { if (!Object.keys(tagsNow).length) tagsNow = await loadTags(api); return id ? (tagsNow[id] ?? { likes: [], limits: [] }) : { ...tagsNow }; },
    async setTags(id, v) {
      if (!id) return { ok: false, reason: "인물을 찾지 못했어요" };
      try {
        tagsNow = await saveTags(api, withProfileTags(await loadTags(api), id, v));
        try { inst?.tags?.set?.(tagsNow); } catch { /* 이번 실행에는 저장만 */ }
        return { ok: true, value: tagsNow[id] ?? { likes: [], limits: [] } };
      } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
    },
    // 수위 프리셋: 목록 / 지금 설정을 묶어 저장(같은 이름은 덮어씀) / 지금 열린 봇에 적용 / 지우기. 적용은 Erosync가 켜져 있고 채팅이 열려 있어야 한다.
    async presets() { return loadPresets(api); },
    async savePreset(name) {
      if (!inst?.content) return { ok: false, reason: "off" };
      try {
        const [c, cfg] = [await inst.content.get(), await inst.config.get()];
        if (!c?.ok) return { ok: false, reason: c?.reason || "열린 채팅이 없어요" };
        const r = upsertPreset(await loadPresets(api), { name, level: { contentMode: c.contentMode, extremityLimit: c.extremityLimit, nsfwPlus: c.nsfwPlus }, config: cfg?.values || {}, guard: { ...guardNow } });
        if (!r.ok) return r;
        return { ok: true, replaced: r.replaced, list: await savePresets(api, r.list) };
      } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
    },
    async applyPreset(id) {
      if (!inst?.content) return { ok: false, reason: "off" };
      const p = (await loadPresets(api)).find((x) => x.id === id);
      if (!p) return { ok: false, reason: "프리셋을 찾지 못했어요" };
      try {
        const c = await inst.content.get();
        if (!c?.ok) return { ok: false, reason: c?.reason || "열린 채팅이 없어요" };
        if (Object.keys(p.level).length) await inst.content.set(p.level);
        if (Object.keys(p.config).length) await inst.config.set(p.config);
        if (p.guard) { guardNow = normGuard(p.guard); try { await api.pluginStorage.setItem(GUARD_KEY, JSON.stringify(guardNow)); } catch { /* 이번 실행에는 반영 */ } try { inst.guard?.set?.(guardNow); } catch { /* 무시 */ } }
        return { ok: true, name: p.name };
      } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
    },
    async deletePreset(id) { return savePresets(api, (await loadPresets(api)).filter((x) => x.id !== id)); },
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
    // 동작·분석 설정(읽기·쓰기, 허용된 키만). 꺼져 있으면 { ok:false, reason:"off" }
    async config(patch = null) {
      if (!inst?.config) return { ok: false, reason: "off", values: {} };
      try { return patch ? await inst.config.set(patch) : await inst.config.get(); } catch (e) { return { ok: false, reason: String(e?.message ?? e), values: {} }; }
    },
    // 지시문(프롬프트) 칸 읽기·고치기. patch = { id, branch, text } (text 비우면 기본으로)
    async prompts(patch = null) {
      if (!inst?.prompts) return { ok: false, reason: "off", pages: [] };
      try { return patch ? await inst.prompts.set(patch.id, patch.branch, patch.text) : await inst.prompts.get(); } catch (e) { return { ok: false, reason: String(e?.message ?? e), pages: [] }; }
    },
    // NSFW 탭용: 인물 값 읽기·고치기·되돌리기, 분석 시작·취소·상태. 꺼져 있으면 { ok:false, reason:"off" }
    async profile(op, ...args) {
      const P = inst?.profiles;
      if (!P) return { ok: false, reason: "off" };
      try {
        if (op === "get") return await P.get(args[0]);
        if (op === "edit") return await P.edit(args[0], args[1]);
        if (op === "reset") return await P.reset(args[0]);
        if (op === "status") return { ok: true, ...P.status() };
        if (op === "start") return { ok: true, ...(await P.start(args[0], args[1])) };
        if (op === "cancel") return { ok: true, ...P.cancel() };
        return { ok: false, reason: "알 수 없는 동작이에요" };
      } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
    },
    // 비하인드: op "list" | "remove"(id 비우면 현재 채팅 전부)
    async behind(op, id = "") {
      const B = inst?.behind;
      if (!B) return { ok: false, reason: "off", entries: [] };
      try { return op === "remove" ? await B.remove(id) : await B.list(); } catch (e) { return { ok: false, reason: String(e?.message ?? e), entries: [] }; }
    },
    stop
  };
}
