// 다른 플러그인 창구 감시기(2.0.0): pluginStorage 우편함을 살펴 요청을 프로바이더 runner로 보내고 결과 키에 쓴다.
// 규칙은 engine/provider/mailbox.js. 동시 처리 수·허용 목록만 여기서 맡고, 재시도·키 순환·대체 사슬은 runner가 그대로 적용한다.
import { reqKey, resKey, pluginOfReqKey, parseRequests, isStale, pruneResults, safeName, redactError } from "../../engine/provider/mailbox.js";

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("시간 초과")), ms))]);
const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v ?? null; } catch { return null; } };

export async function collectText(content) {
  if (typeof content === "string") return content;
  if (content && typeof content.getReader === "function") {
    const rd = content.getReader(); let out = "";
    for (;;) { const { done, value } = await rd.read(); if (done) break; out += typeof value === "string" ? value : value?.text ?? ""; }
    return out;
  }
  return "";
}

export function createMailbox(api, { store, runner, confirm = null, allowed = () => true, notify = () => {}, log = () => {}, now = () => Date.now(), timers = { set: (f, ms) => setInterval(f, ms), clear: (id) => clearInterval(id) } } = {}) {
  const seen = new Map(), asking = new Map(), locks = new Map(), resCache = new Map(), active = new Set(), aborts = new Set();
  const queue = []; let inflight = 0, conc = 2, stopped = false, scanning = false, timer = null, unsub = null, lastAt = 0;
  const st = () => api.pluginStorage;

  async function names(cfg) {
    const set = new Set(Object.keys(cfg.ipc.plugins));
    if (typeof st().keys === "function") { try { for (const k of (await withTimeout(Promise.resolve(st().keys()), 4000)) ?? []) { const n = pluginOfReqKey(k); if (n) set.add(n); } } catch (e) { log(`키 목록을 못 읽었어요: ${e?.message ?? e}`); } }
    return [...set];
  }
  // 결과 키 쓰기: 플러그인마다 한 줄로 줄 세워 읽고-쓰기가 겹치지 않게
  function writeResult(name, row) {
    const run = async () => {
      let cur = resCache.get(name); if (!cur) { cur = parse(await st().getItem(resKey(name)))?.results ?? []; }
      const next = pruneResults([...cur.filter((x) => x.id !== row.id), row], now()); resCache.set(name, next);
      try { await st().setItem(resKey(name), JSON.stringify({ v: 1, results: next })); } catch (e) { log(`결과를 못 썼어요(${name}): ${e?.message ?? e}`); }
    };
    const p = (locks.get(name) ?? Promise.resolve()).then(run, run); locks.set(name, p.catch(() => {})); return p;
  }
  // 허용 여부: 설정에 있으면 그대로, 처음 보는 플러그인은 한 번만 묻고 대답을 저장(확인창이 없으면 이번만 거절)
  async function decide(name) {
    const cfg = await store.get(), known = cfg.ipc.plugins[name]?.allow; if (typeof known === "boolean") return known;
    if (!confirm) return false;
    if (asking.has(name)) return asking.get(name);
    const p = (async () => {
      let yes = false; try { yes = !!(await confirm({ title: `‘${name}’ 플러그인이 Dusk 모델을 쓰려고 해요`, text: "허용하면 이 플러그인이 보낸 글이 내 프로바이더(키·비용)로 처리돼요. 언제든 작업실 → 프로바이더 → 확장에서 바꿀 수 있어요." })); } catch { yes = false; }
      await store.update((x) => { x.ipc.plugins[name] = { allow: yes }; });
      return yes;
    })().finally(() => asking.delete(name));
    asking.set(name, p); return p;
  }
  async function execute(name, req) {
    const cfg = await store.get(), t0 = now(), ac = new AbortController(); aborts.add(ac);
    try {
      const want = req.profile || cfg.ipc.profileId || "", list = cfg.profiles ?? [];
      const hit = want && (list.find((p) => p.id === want) ?? list.find((p) => String(p.name).toLowerCase() === want.toLowerCase()));
      const body = { mode: "other", __purpose: "other", prompt_chat: req.messages, ...(want ? { __profile: hit ? hit.id : want } : {}), ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}), ...(req.temperature !== undefined ? { temperature: req.temperature } : {}) };
      const r = await runner.handle(body, ac.signal);
      if (!r?.success) return { id: req.id, ok: false, error: redactError(r?.content || "처리하지 못했어요"), at: now(), ms: now() - t0 };
      return { id: req.id, ok: true, text: await collectText(r.content), at: now(), ms: now() - t0 };
    } catch (e) { return { id: req.id, ok: false, error: redactError(e?.message ?? e), at: now(), ms: now() - t0 }; }
    finally { aborts.delete(ac); }
  }
  function pump() {
    while (!stopped && inflight < conc && queue.length) {
      const job = queue.shift(); inflight++;
      execute(job.name, job.req).then((row) => writeResult(job.name, row)).catch((e) => log(`처리 오류: ${e?.message ?? e}`)).finally(() => { inflight--; lastAt = now(); job.done(); pump(); });
    }
  }
  const enqueue = (name, req) => new Promise((done) => { queue.push({ name, req, done }); pump(); });
  async function submit(name, req) {
    const ok = await decide(name); if (stopped) return;
    if (!ok) return writeResult(name, { id: req.id, ok: false, error: "이 플러그인은 Dusk 프로바이더 사용이 허용되지 않았어요", at: now(), ms: 0 });
    await enqueue(name, req);
  }
  const track = (p) => { active.add(p); p.finally(() => active.delete(p)); return p; };
  // 한 번 살펴서 새 요청마다 처리 약속을 돌려준다(타이머는 기다리지 않고, tick은 다 끝날 때까지 기다린다)
  async function scan() {
    if (stopped || scanning || !allowed()) return [];
    scanning = true;
    try {
      const cfg = await store.get(); if (!cfg.ipc.enabled) return [];
      conc = cfg.ipc.concurrency; const jobs = [];
      for (const name of await names(cfg)) {
        let ids = seen.get(name);
        if (!ids) { ids = new Set((parse(await st().getItem(resKey(name)))?.results ?? []).map((r) => r.id)); seen.set(name, ids); }   // 다시 시작해도 처리한 것은 건너뜀
        const { ok, bad } = parseRequests(await st().getItem(reqKey(name)));
        for (const b of bad) if (b.id && !ids.has(b.id)) { ids.add(b.id); jobs.push(track(writeResult(name, { id: b.id, ok: false, error: b.error, at: now(), ms: 0 }))); }
        for (const req of ok) {
          if (ids.has(req.id)) continue; ids.add(req.id);
          if (isStale(req, now())) continue;
          jobs.push(track(submit(name, req)));
        }
      }
      return jobs;
    } catch (e) { log(`창구 확인 실패: ${e?.message ?? e}`); return []; }
    finally { scanning = false; }
  }
  const idle = async () => { while (active.size) await Promise.allSettled([...active]); };
  async function tick() { await Promise.all(await scan()); await idle(); }
  async function refresh() {
    const cfg = await store.get(); conc = cfg.ipc.concurrency;
    if (timer) { timers.clear(timer); timer = null; }
    if (stopped) return;
    if (cfg.ipc.enabled) { timer = timers.set(() => { scan().catch(() => {}); }, cfg.ipc.pollSec * 1000); scan().catch(() => {}); }
    else { queue.length = 0; }   // 끄면 아직 시작 안 한 대기열은 비운다
  }
  return {
    tick, idle, refresh,
    async start() { stopped = false; unsub ??= store.subscribe(() => { refresh().catch(() => {}); }); await refresh(); },
    stop() { stopped = true; if (timer) { timers.clear(timer); timer = null; } try { unsub?.(); } catch { /* 이미 해제 */ } unsub = null; queue.length = 0; for (const ac of aborts) { try { ac.abort(); } catch { /* 이미 끝남 */ } } },
    forget(name) { const n = safeName(name); seen.delete(n); resCache.delete(n); },
    status: () => ({ running: !!timer, inflight, queued: queue.length, plugins: [...seen.keys()], lastAt })
  };
}
