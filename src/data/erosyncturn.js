// Dusk 2.2.0: Erosync 매 턴 계산(HandOff/EROSYNC-TURN.md). 장기기억 기록기가 턴을 기록하면(flow.onTurn) 그 턴의 인물만
// Erosync 엔진(profile "turn")에 넘겨 변화분 1번 호출로 분석값을 갱신한다. 설정·기록은 pluginStorage에.
import { readGauge } from "./gaugemult.js";
import { logEvent, logFailure } from "./memlog.js";
import { seedErosyncNow } from "./adultseed.js";
export const TURN_KEY = "dusk.erosync.turn", TURN_LOG_KEY = "dusk.erosync.turnlog", TURN_LOG_MAX = 30;
export const AUTO_KEY = "dusk.erosync.auto", AUTO_LOG_KEY = "dusk.erosync.autolog";
export const TURN_DEFAULT = Object.freeze({ on: true, groups: ["axes", "sexual"], autoStart: true });   // 2.2.6 autoStart: 출발값 자동 만들기(기본 켜짐)

export function normalizeTurnSettings(v) {
  const s = v && typeof v === "object" ? v : {};
  const groups = (Array.isArray(s.groups) ? s.groups : TURN_DEFAULT.groups).filter((g) => g === "axes" || g === "sexual");
  return { on: s.on === undefined ? TURN_DEFAULT.on : s.on === true, groups: [...new Set(groups)], autoStart: s.autoStart === undefined ? TURN_DEFAULT.autoStart : s.autoStart === true };
}

// addon-rebuild: 여러 명을 엔진 한 번(seedMany, 호출 묶음)으로. 엔진에 없거나 못 쓰면 한 명씩(seed).
export async function seedBatch(erosync, list) {
  try {
    const r = await erosync.profile("seedMany", list);
    if (r?.ok && Array.isArray(r.results)) return list.map((p) => { const x = r.results.find((y) => String(y?.name ?? "").trim().toLowerCase() === p.name.trim().toLowerCase()); return { name: p.name, ok: !!x?.ok, analyzed: !!x?.analyzed, positions: x?.positions, note: x?.note || "", reason: x?.reason || (x ? "" : "결과 없음") }; });
  } catch { /* 한 명씩으로 */ }
  const out = [];
  for (const p of list) {
    try { const r = await erosync.profile("seed", p); out.push({ name: p.name, ok: !!r?.ok, analyzed: !!r?.analyzed, reason: r?.reason || "" }); }
    catch (e) { out.push({ name: p.name, ok: false, reason: String(e?.message ?? e) }); }
  }
  return out;
}

export function createErosyncTurn(api, { erosync, log = () => {}, now = () => Date.now() }) {
  const read = async (k) => { try { const v = await api.pluginStorage.getItem(k); return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };
  const write = (k, v) => api.pluginStorage.setItem(k, JSON.stringify(v));
  let last = null, running = null, off = null;
  const seen = [];   // 같은 응답 기록(key)은 한 번만
  // addon-rebuild 출발값 자동 만들기: 전체 인물 찾기(카드·로어·모듈 전체)는 자동으로 부르지 않는다. 장기기억이 알려 준 인물만 1명씩 seed.
  // - 처음 보는 이름은 NEW_MIN_TURNS턴 나와야 seed(한 번 스친 엑스트라 제외). 한 번 seed한 이름은 다시 안 함.
  // - 출발값이 하나도 없는 채팅은 이번 턴에 기록된 인물을 모두(최대 EMPTY_MAX명). 예전 3명 제한은 나머지가 두 턴 더 나와야 만들어지는 문제가 있었다.
  // - 앞 묶음이 분석 중이어도 새로 준비된 이름은 버리지 않고 줄을 세워 이어서 만든다.
  // - 지난 대화 분석(source "backfill")에서 온 턴은 세지 않는다.
  // - 카운터·완료 표시는 pluginStorage(AUTO_KEY)에 저장해 새로고침해도 이어진다. 자동 실행 기록은 AUTO_LOG_KEY.
  const NEW_MIN_TURNS = 2, EMPTY_MAX = 8, SEED_PER_TURN = 4, SEED_RETRY = 3, FILL_PER_TURN = 4, FILL_RETRY = 2;   // 4명 = 출발값 묶음 한 번
  const keyOf = (nm) => String(nm || "").trim().toLowerCase();
  let seedQueue = Promise.resolve();
  const filling = new Set();   // 체위·장소 채우기 대기·진행 중인 이름(다음 턴이 같은 묶음을 또 부르지 않게)   // 출발값 만들기는 한 번에 한 묶음씩(차례로)

  // 사람마다 결과 한 줄: 분석(체위 n) / 임시값 / 못 함(이유)
  const why1 = (r) => r.analyzed ? `분석${Number.isFinite(r.positions) ? `(체위·장소 ${r.positions})` : ""}${r.note ? ` — ${r.note}` : ""}` : `못 함(${r.reason === "busy" ? "다른 분석 중" : r.reason === "no_sources" ? "근거 자료 없음" : r.reason || (r.ok ? "분석 없이 임시값" : "?")})`;
  // 실패한 사람은 실패 기록에도(검열이면 검열로). 같은 이유가 되풀이되면 실패 기록이 한 줄로 묶어 횟수만 센다
  function failNote(kind, results) {
    for (const r of results) {
      const msg = !r.analyzed ? (r.reason === "busy" ? "" : r.reason === "no_sources" ? "문제: 이 인물의 근거 자료(카드·로어북·장기기억 기록)가 없어요" : r.reason || (r.ok ? "문제: 분석 없이 임시값만 남았어요" : "문제: 이유를 받지 못했어요")) : r.note || "";
      if (!msg) continue;
      const censored = /^\s*검열[:：]/.test(msg);
      logFailure({ area: "Erosync 출발값", title: `‘${r.name}’ ${kind} ${censored ? "— 검열" : "— 문제"}`, error: msg, fallback: r.analyzed ? "다른 항목은 저장했어요" : "다음 턴에 다시 시도해요(최대 몇 번)" });
    }
  }
  async function autoState() { const v = await read(AUTO_KEY); return v && typeof v === "object" ? v : {}; }
  async function autoHistory() { const v = await read(AUTO_LOG_KEY); return Array.isArray(v) ? v : []; }
  async function seedPeople(why, scope, people) {
    const st = await autoState(), sc = st[scope] ?? { counts: {}, done: {} };
    const todo = people.filter((p, i, a) => !sc.done[keyOf(p.name)] && a.findIndex((x) => keyOf(x.name) === keyOf(p.name)) === i).slice(0, why === "empty" ? EMPTY_MAX : SEED_PER_TURN);
    if (!todo.length) return false;
    for (const p of todo) sc.done[keyOf(p.name)] = now();
    st[scope] = sc; await write(AUTO_KEY, st);
    seedQueue = seedQueue.then(async () => {
      const results = await seedBatch(erosync, todo.map((p) => ({ name: p.name, aliases: p.aliases ?? [], memory: p.memory ?? "" })));
      // 실패한 이름은 완료 표시를 풀어 다음에 다시 시도한다(채팅 상태가 아직 없을 때 등). 성공(임시값 포함)만 완료로 남는다.
      // addon-rebuild: 분석 없이 임시값만 남은 인물도 다음에 다시 시도(SEED_RETRY번까지) — 체위·장소 같은 출발값이 비지 않게
      const failed = results.filter((r) => !r.ok || !r.analyzed).map((r) => keyOf(r.name));
      // 같은 이름이 SEED_RETRY번 실패하면 더 시도하지 않는다(계속 실패하는 호출이 쌓이지 않게). busy(다른 분석 중)는 시도로 안 셈
      if (failed.length) { const st2 = await autoState(), sc2 = st2[scope] ?? { counts: {}, done: {} }; sc2.fails ??= {}; const busy = new Set(results.filter((r) => r.reason === "busy").map((r) => keyOf(r.name))); for (const k of failed) { if (!busy.has(k)) sc2.fails[k] = (sc2.fails[k] ?? 0) + 1; if ((sc2.fails[k] ?? 0) < SEED_RETRY) delete sc2.done[k]; } st2[scope] = sc2; await write(AUTO_KEY, st2); }
      log(`Erosync 출발값 만들기(${why === "empty" ? "출발값 없음" : "새 인물"}): ${results.map((r) => `${r.name}${r.analyzed ? " 분석" : r.ok ? " 임시값" : " 실패"}`).join(", ")}`);
      logEvent({ kind: results.some((r) => !r.analyzed || r.note) ? "fail" : "ok", area: "Erosync 출발값", title: `${why === "empty" ? "출발값 없음" : "새 인물"} · ${results.map((r) => `${r.name} ${why1(r)}`).join(" · ")}`, detail: results });
      failNote("출발값", results);
      await write(AUTO_LOG_KEY, [{ at: now(), why, scope, names: todo.map((p) => p.name), results }, ...(await autoHistory())].slice(0, TURN_LOG_MAX));
      return results;
    }).catch((e) => { log(`Erosync 출발값 만들기 실패 ${e?.message ?? e}`); logEvent({ kind: "fail", area: "Erosync 출발값", title: "출발값 만들기 실패", detail: String(e?.message ?? e) }); return null; });
    return true;
  }
  // addon-rebuild: 이미 Erosync에 있지만 체위·장소가 비어 있는 인물(예전에 임시값으로만 만들어진 인물 등)을 한 턴에 한 묶음(4명)씩 채운다.
  // 이번 턴에 나온 인물부터. 사용자가 고친 인물·비인물·SFW는 건드리지 않고, 같은 인물은 FILL_RETRY번까지만.
  async function fillMissing(scope, snap, turnPeople = []) {
    const st = await autoState(), sc = st[scope] ?? { counts: {}, done: {} }; sc.fill ??= {};
    const here = new Set(turnPeople.map((p) => keyOf(p?.name)));
    const empty = (snap?.people ?? []).filter((p) => p?.name && !p.nonPerson && !p.sfw && !p.overridden && !/\{\{user\}\}/i.test(p.name)
      && !(p.detail?.likes?.length || p.detail?.dislikes?.length) && (sc.fill[keyOf(p.name)] ?? 0) < FILL_RETRY && !filling.has(keyOf(p.name)));
    const todo = [...empty.filter((p) => here.has(keyOf(p.name))), ...empty.filter((p) => !here.has(keyOf(p.name)))].slice(0, FILL_PER_TURN);
    if (!todo.length) return false;
    for (const p of todo) { sc.fill[keyOf(p.name)] = (sc.fill[keyOf(p.name)] ?? 0) + 1; filling.add(keyOf(p.name)); }
    st[scope] = sc; await write(AUTO_KEY, st);
    const mem = new Map(turnPeople.map((p) => [keyOf(p?.name), p?.memory ?? ""]));
    seedQueue = seedQueue.then(async () => {
      const results = await seedBatch(erosync, todo.map((p) => ({ name: p.name, aliases: p.aliases ?? [], memory: mem.get(keyOf(p.name)) ?? "" })));
      // 다른 분석 중(busy)이라 손도 못 댄 인물은 시도 횟수에서 뺀다
      const busy = results.filter((r) => r.reason === "busy").map((r) => keyOf(r.name));
      if (busy.length) { const st2 = await autoState(), sc2 = st2[scope] ?? { counts: {}, done: {} }; sc2.fill ??= {}; for (const k of busy) sc2.fill[k] = Math.max(0, (sc2.fill[k] ?? 1) - 1); st2[scope] = sc2; await write(AUTO_KEY, st2); }
      log(`Erosync 체위·장소 채우기: ${results.map((r) => `${r.name}${r.analyzed ? " 분석" : ` 못 함(${r.reason || "?"})`}`).join(", ")}`);
      logEvent({ kind: results.some((r) => !r.analyzed || r.note) ? "fail" : "ok", area: "Erosync 출발값", title: `체위·장소 채우기 · ${results.map((r) => `${r.name} ${why1(r)}`).join(" · ")}`, detail: results });
      failNote("체위·장소", results);
      return results;
    }).catch((e) => { log(`Erosync 체위·장소 채우기 실패 ${e?.message ?? e}`); return null; }).finally(() => { for (const p of todo) filling.delete(keyOf(p.name)); });
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
      if (info.source !== "backfill" && snap?.ok && !(snap.people ?? []).length) { await seedPeople("empty", snap.scope?.scopeKey || "?", info.people.filter((p) => p?.name && !/\{\{user\}\}/i.test(p.name)).slice(0, EMPTY_MAX)); return null; }   // 출발값이 없으면 이번 턴 인물만
    }
    const ctrl = new AbortController();
    const job = (async () => {
      last = { at: now(), phase: "running", names: info.people.map((p) => p.name) };
      const r = await erosync.profile("turn", { people: info.people, rp: info.rp, groups: s.groups, signal: ctrl.signal, gauge: await readGauge(api) });
      if (!r?.ok) { last = { at: now(), phase: "error", message: r?.reason || "계산하지 못했어요" }; return r; }
      last = { at: now(), phase: "done", changed: r.changed ?? [], unmatched: r.unmatched ?? [] };
      let seeded = false;
      if (s.autoStart && snap?.ok && info.source !== "backfill" && r.unmatched?.length) seeded = await countNew(snap.scope?.scopeKey || "?", r.unmatched, info.people);
      // 새 인물 출발값을 만들지 않은 턴에만 빈 체위·장소 채우기(한 턴에 출발값 묶음은 한 번)
      if (s.autoStart && snap?.ok && info.source !== "backfill" && !seeded) await fillMissing(snap.scope?.scopeKey || "?", snap, info.people).catch(() => false);
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
