// Dusk 2.2.0: Erosync 매 턴 계산(HandOff/EROSYNC-TURN.md). 장기기억 기록기가 턴을 기록하면(flow.onTurn) 그 턴의 인물만
// Erosync 엔진(profile "turn")에 넘겨 변화분 1번 호출로 분석값을 갱신한다. 설정·기록은 pluginStorage에.
export const TURN_KEY = "dusk.erosync.turn", TURN_LOG_KEY = "dusk.erosync.turnlog", TURN_LOG_MAX = 30;
export const TURN_DEFAULT = Object.freeze({ on: false, groups: ["axes", "sexual"] });

export function normalizeTurnSettings(v) {
  const s = v && typeof v === "object" ? v : {};
  const groups = (Array.isArray(s.groups) ? s.groups : TURN_DEFAULT.groups).filter((g) => g === "axes" || g === "sexual");
  return { on: s.on === true, groups: [...new Set(groups)] };
}

export function createErosyncTurn(api, { erosync, log = () => {}, now = () => Date.now() }) {
  const read = async (k) => { try { const v = await api.pluginStorage.getItem(k); return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };
  const write = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  let last = null, running = null, off = null;
  const seen = [];   // 같은 응답 기록(key)은 한 번만

  async function settings() { return normalizeTurnSettings(await read(TURN_KEY)); }
  async function save(patch) { const next = normalizeTurnSettings({ ...(await settings()), ...patch }); await write(TURN_KEY, next); return next; }
  async function history() { const v = await read(TURN_LOG_KEY); return Array.isArray(v) ? v : []; }

  async function onTurn(info) {
    const s = await settings();
    if (!s.on || !s.groups.length || !erosync?.on?.() || !erosync?.isRunning?.()) return null;
    if (!info?.people?.length || !String(info.rp ?? "").trim()) return null;
    if (info.key) { if (seen.includes(info.key)) return null; seen.push(info.key); if (seen.length > 20) seen.shift(); }
    const ctrl = new AbortController();
    const job = (async () => {
      last = { at: now(), phase: "running", names: info.people.map((p) => p.name) };
      const r = await erosync.profile("turn", { people: info.people, rp: info.rp, groups: s.groups, signal: ctrl.signal });
      if (!r?.ok) { last = { at: now(), phase: "error", message: r?.reason || "계산하지 못했어요" }; return r; }
      last = { at: now(), phase: "done", changed: r.changed ?? [], unmatched: r.unmatched ?? [] };
      if (r.changed?.length) {
        const log0 = await history();
        await write(TURN_LOG_KEY, [...r.changed.map((c) => ({ at: now(), id: c.id, name: c.name, before: c.before, after: c.after, reason: c.reason || "" })), ...log0].slice(0, TURN_LOG_MAX));
      }
      return r;
    })().catch((e) => { last = { at: now(), phase: "error", message: String(e?.message ?? e) }; log(`Erosync 턴 계산 실패 ${e?.message ?? e}`); return null; });
    running = { ctrl, job };
    try { return await job; } finally { if (running?.job === job) running = null; }
  }

  // 장기기억 턴 흐름에 붙기(없으면 false — 나중에 다시 부르면 됨)
  function attach(flow) {
    if (off || typeof flow?.onTurn !== "function") return !!off;
    off = flow.onTurn(onTurn);
    return true;
  }
  function detach() { try { off?.(); } catch {} off = null; running?.ctrl.abort(); }
  return { settings, save, history, clearHistory: () => write(TURN_LOG_KEY, []), onTurn, attach, detach, attached: () => !!off, status: () => last, cancel: () => running?.ctrl.abort() };
}
