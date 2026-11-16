// Dusk 2.2.0: Erosync 매 턴 계산(HandOff/EROSYNC-TURN.md). 장기기억 기록기가 턴을 기록하면(flow.onTurn) 그 턴의 인물만
// Erosync 엔진(profile "turn")에 넘겨 변화분 1번 호출로 분석값을 갱신한다. 설정·기록은 pluginStorage에.
import { readGauge } from "./gaugemult.js";
export const TURN_KEY = "dusk.erosync.turn", TURN_LOG_KEY = "dusk.erosync.turnlog", TURN_LOG_MAX = 30;
export const TURN_DEFAULT = Object.freeze({ on: true, groups: ["axes", "sexual"], autoStart: true });   // 2.2.6 autoStart: 출발값 자동 만들기(기본 켜짐)

export function normalizeTurnSettings(v) {
  const s = v && typeof v === "object" ? v : {};
  const groups = (Array.isArray(s.groups) ? s.groups : TURN_DEFAULT.groups).filter((g) => g === "axes" || g === "sexual");
  return { on: s.on === undefined ? TURN_DEFAULT.on : s.on === true, groups: [...new Set(groups)], autoStart: s.autoStart === undefined ? TURN_DEFAULT.autoStart : s.autoStart === true };
}

export function createErosyncTurn(api, { erosync, log = () => {}, now = () => Date.now() }) {
  const read = async (k) => { try { const v = await api.pluginStorage.getItem(k); return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };
  const write = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  let last = null, running = null, off = null;
  const seen = [];   // 같은 응답 기록(key)은 한 번만
  const autoDone = new Set();   // 출발값 자동 만들기를 이미 시작한 채팅(+처음 본 인물) — 한 세션에 한 번씩만

  // 2.2.6 출발값 자동 만들기: 이 채팅에 Erosync 인물 값이 하나도 없거나(why "empty") 처음 보는 인물이 나왔을 때(why "new") 전체 분석을 한 번 시작한다.
  async function autoStart(why, scope, names = []) {
    const k = `${scope || "?"}|${why}|${why === "new" ? names.slice().sort().join(",") : ""}`;
    if (autoDone.has(k)) return false;
    autoDone.add(k);
    try {
      const st = await erosync.profile("status"); if (st?.running) return false;
      const r = await erosync.profile("start", "full");
      log(`Erosync 출발값 자동 만들기 시작(${why === "empty" ? "출발값 없음" : `새 인물 ${names.join(", ")}`})`);
      return !!r;
    } catch (e) { log(`Erosync 출발값 자동 만들기 실패 ${e?.message ?? e}`); return false; }
  }

  async function settings() { return normalizeTurnSettings(await read(TURN_KEY)); }
  async function save(patch) { const next = normalizeTurnSettings({ ...(await settings()), ...patch }); await write(TURN_KEY, next); return next; }
  async function history() { const v = await read(TURN_LOG_KEY); return Array.isArray(v) ? v : []; }

  async function onTurn(info) {
    const s = await settings();
    if (!s.on || !s.groups.length || !erosync?.on?.() || !erosync?.isRunning?.()) return null;
    if (!info?.people?.length || !String(info.rp ?? "").trim()) return null;
    if (info.key) { if (seen.includes(info.key)) return null; seen.push(info.key); if (seen.length > 20) seen.shift(); }
    let snap = null;
    if (s.autoStart) {
      try { snap = await erosync.read?.(); } catch { snap = null; }
      if (snap?.ok && !(snap.people ?? []).length) { await autoStart("empty", snap.scope?.scopeKey); return null; }   // 출발값이 없으면 변화분 계산 대신 처음 분석부터
    }
    const ctrl = new AbortController();
    const job = (async () => {
      last = { at: now(), phase: "running", names: info.people.map((p) => p.name) };
      const r = await erosync.profile("turn", { people: info.people, rp: info.rp, groups: s.groups, signal: ctrl.signal, gauge: await readGauge(api) });
      if (!r?.ok) { last = { at: now(), phase: "error", message: r?.reason || "계산하지 못했어요" }; return r; }
      last = { at: now(), phase: "done", changed: r.changed ?? [], unmatched: r.unmatched ?? [] };
      { const fresh = (r.unmatched ?? []).filter((n) => n && !/\{\{user\}\}/i.test(n)); if (s.autoStart && fresh.length && snap?.ok) void autoStart("new", snap.scope?.scopeKey, fresh); }
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
