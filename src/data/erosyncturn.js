// Dusk 2.2.0: Erosync 매 턴 계산(HandOff/EROSYNC-TURN.md). 장기기억 기록기가 턴을 기록하면(flow.onTurn) 그 턴의 인물만
// Erosync 엔진(profile "turn")에 넘겨 변화분 1번 호출로 분석값을 갱신한다. 설정·기록은 pluginStorage에.
import { readGauge } from "./gaugemult.js";
import { seedErosyncNow } from "./adultseed.js";
export const TURN_KEY = "dusk.erosync.turn", TURN_LOG_KEY = "dusk.erosync.turnlog", TURN_LOG_MAX = 30;
export const AUTO_KEY = "dusk.erosync.auto", AUTO_LOG_KEY = "dusk.erosync.autolog";
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
  // addon-rebuild 출발값 자동 만들기: 전체 인물 찾기(카드·로어·모듈 전체)는 자동으로 부르지 않는다. 장기기억이 알려 준 인물만 1명씩 seed.
  // - 처음 보는 이름은 NEW_MIN_TURNS턴 나와야 seed(한 번 스친 엑스트라 제외). 한 번 seed한 이름은 다시 안 함.
  // - 출발값이 하나도 없는 채팅은 이번 턴 인물만(최대 EMPTY_MAX명).
  // - 지난 대화 분석(source "backfill")에서 온 턴은 세지 않는다.
  // - 카운터·완료 표시는 pluginStorage(AUTO_KEY)에 저장해 새로고침해도 이어진다. 자동 실행 기록은 AUTO_LOG_KEY.
  const NEW_MIN_TURNS = 2, EMPTY_MAX = 3, SEED_PER_TURN = 3;
  const keyOf = (nm) => String(nm || "").trim().toLowerCase();
  let seeding = null;

  async function autoState() { const v = await read(AUTO_KEY); return v && typeof v === "object" ? v : {}; }
  async function autoHistory() { const v = await read(AUTO_LOG_KEY); return Array.isArray(v) ? v : []; }
  async function seedPeople(why, scope, people) {
    if (seeding) return false;
    const st = await autoState(), sc = st[scope] ?? { counts: {}, done: {} };
    const todo = people.filter((p) => !sc.done[keyOf(p.name)]).slice(0, SEED_PER_TURN);
    if (!todo.length) return false;
    for (const p of todo) sc.done[keyOf(p.name)] = now();
    st[scope] = sc; await write(AUTO_KEY, st);
    seeding = (async () => {
      const results = [];
      for (const p of todo) {
        try { const r = await erosync.profile("seed", { name: p.name, aliases: p.aliases ?? [], memory: p.memory ?? "" }); results.push({ name: p.name, ok: !!r?.ok, analyzed: !!r?.analyzed, reason: r?.reason || "" }); }
        catch (e) { results.push({ name: p.name, ok: false, reason: String(e?.message ?? e) }); }
      }
      log(`Erosync 출발값 만들기(${why === "empty" ? "출발값 없음" : "새 인물"}): ${results.map((r) => `${r.name}${r.analyzed ? " 분석" : r.ok ? " 임시값" : " 실패"}`).join(", ")}`);
      await write(AUTO_LOG_KEY, [{ at: now(), why, scope, names: todo.map((p) => p.name), results }, ...(await autoHistory())].slice(0, TURN_LOG_MAX));
      return results;
    })().catch((e) => { log(`Erosync 출발값 만들기 실패 ${e?.message ?? e}`); return null; }).finally(() => { seeding = null; });
    return true;
  }
  async function countNew(scope, names, people) {
    const st = await autoState(), sc = st[scope] ?? { counts: {}, done: {} };
    for (const nm of new Set(names.filter((x) => x && !/\{\{user\}\}/i.test(x)))) { const k = keyOf(nm); if (!sc.done[k]) sc.counts[k] = (sc.counts[k] ?? 0) + 1; }
    st[scope] = sc; await write(AUTO_KEY, st);
    const ready = names.filter((nm) => !sc.done[keyOf(nm)] && (sc.counts[keyOf(nm)] ?? 0) >= NEW_MIN_TURNS);
    if (!ready.length) return false;
    const byName = new Map(people.map((p) => [keyOf(p.name), p]));
    return seedPeople("new", scope, ready.map((nm) => byName.get(keyOf(nm)) ?? { name: nm }));
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
    try { snap = await erosync.read?.(); } catch { snap = null; }
    try { await seedErosyncNow(api, erosync, snap, log); } catch { /* 무작위 출발값은 실패해도 계산은 이어서 */ }
    if (s.autoStart) {
      if (info.source !== "backfill" && snap?.ok && !(snap.people ?? []).length) { await seedPeople("empty", snap.scope?.scopeKey || "?", info.people.filter((p) => p?.name).slice(0, EMPTY_MAX)); return null; }   // 출발값이 없으면 이번 턴 인물만
    }
    const ctrl = new AbortController();
    const job = (async () => {
      last = { at: now(), phase: "running", names: info.people.map((p) => p.name) };
      const r = await erosync.profile("turn", { people: info.people, rp: info.rp, groups: s.groups, signal: ctrl.signal, gauge: await readGauge(api) });
      if (!r?.ok) { last = { at: now(), phase: "error", message: r?.reason || "계산하지 못했어요" }; return r; }
      last = { at: now(), phase: "done", changed: r.changed ?? [], unmatched: r.unmatched ?? [] };
      if (s.autoStart && snap?.ok && info.source !== "backfill" && r.unmatched?.length) await countNew(snap.scope?.scopeKey || "?", r.unmatched, info.people);
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
  return { settings, save, history, autoHistory, clearHistory: () => write(TURN_LOG_KEY, []), onTurn, attach, detach, attached: () => !!off, status: () => last, cancel: () => running?.ctrl.abort() };
}
