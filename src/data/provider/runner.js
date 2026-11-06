// 프로바이더 실행기 (v1.9.3): 요청 받기 → 프로필 고르기 → 키 고르기 → 보내기 → 해독 → 대체·재시도 → 사용량 기록.
import { purposeOfMode, kindOf } from "../../engine/provider/catalog.js";
import { resolve, chainOrder } from "../../engine/provider/profile.js";
import { buildRequest, turnHashesOf } from "../../engine/provider/build.js";
import { createStreamDecoder, parseResponse } from "../../engine/provider/sse.js";
import { detectRepetition, trimRepetition } from "../../engine/provider/repeat.js";
import { createKeyPool } from "../../engine/provider/keypool.js";
import { classifyFailure, planAfterFailure, backoffMs } from "../../engine/provider/chain.js";
import { costOf, savedByCache, summarize, budgetState } from "../../engine/provider/cost.js";
import { applyRules, anatomy, orderForCache } from "../../engine/provider/transforms.js";
import { enabledTools, parseArgs } from "../../engine/provider/tools.js";
import { protect, restore, guideBlock, glossaryBlock } from "../../engine/provider/translate.js";
import { HttpError, errorFromResponse, redact } from "./transport.js";
import { PURPOSE_LABEL } from "../../engine/provider/catalog.js";
import { estimateTokens } from "../../engine/provider/tokens.js";

const nz = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
const TOOL_RE = /<tool_call\s+name="([^"]+)">([\s\S]*?)<\/tool_call>/g;
export const toolPrompt = (defs) => `[도구 사용]\n필요할 때만 아래 도구를 쓸 수 있어요. 쓰려면 답에 정확히 이 형식으로 적고 멈추세요: <tool_call name="도구이름">{"인자":"값"}</tool_call>\n결과가 오면 이어서 답하세요. 도구가 필요 없으면 평소처럼 답하세요.\n${defs.map((d) => `- ${d.name}: ${d.description} 인자 ${JSON.stringify(d.parameters.properties)}`).join("\n")}`;
export const parseToolCalls = (text) => [...String(text).matchAll(TOOL_RE)].map((m) => ({ name: m[1], args: parseArgs(m[2]) }));
export const stripToolCalls = (text) => String(text).replace(TOOL_RE, "").trim();

export function createProviderRunner({ api, store, vault, transport, gemcache = null, risuTools = null, toolExec = null, vertex = null, copilot = null, currentChar = async () => null, notify = () => {}, board = null, errlog = null, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} }) {
  const pools = new Map(); const prevAnatomy = new Map(); const prevTurns = new Map();   // 캐시 학습: 채팅·용도·프로필마다 직전 요청의 턴 해시
  const reasoningMemo = new Map(); let warnedDay = "";
  const poolFor = async (conn, cfg) => {
    const vals = await vault.values(conn.keyIds), sig = `${conn.id}|${conn.keyMode}|${vals.join("\n")}`;
    let p = pools.get(conn.id); if (!p || p.sig !== sig) { p = { sig, pool: createKeyPool(vals, { mode: conn.keyMode, now }) }; pools.set(conn.id, p); }
    return p.pool;
  };
  const fail = (msg) => ({ success: false, content: String(msg) });
  // Risu 요청의 샘플링을 바탕으로 프로필 값이 있으면 덮어쓴다
  function effectiveProfile(base, req) {
    const fromReq = nz({ temperature: req.temperature, topP: req.top_p, topK: req.top_k, frequencyPenalty: req.frequency_penalty, presencePenalty: req.presence_penalty, maxTokens: req.max_tokens, seed: req.seed, stop: req.stop_sequences });
    const own = nz({ ...base.sampling }); return { ...base, sampling: { ...fromReq, ...own } };
  }
  async function credential(conn, pool, signal, aff) {
    const k = kindOf(conn.kind);
    if (conn.kind === "vertex") { const keys = await vault.values(conn.keyIds); if (!keys.length) throw new HttpError("Vertex 서비스 계정 키를 추가해 주세요", 401, { setup: true }); if (!vertex) throw new HttpError("Vertex 인증을 쓸 수 없어요", 401, { setup: true }); return { cred: await vertex(keys[0], signal), key: keys[0] }; }
    if (conn.kind === "copilot") { const key = pool.pick(aff); if (!key) throw new HttpError("Copilot 토큰을 추가해 주세요", 401, { setup: true }); if (!copilot) throw new HttpError("Copilot 인증을 쓸 수 없어요", 401, { setup: true }); return { cred: key, key, copilot: await copilot(key, conn, signal) }; }
    const key = pool.pick(aff);
    if (!key) { if (k.keyOptional && !conn.keyIds.length) return { cred: "", key: "" }; throw new HttpError(pool.size() ? "모든 키가 잠시 쉬는 중이에요" : "API 키를 추가해 주세요", pool.size() ? 429 : 401, { setup: !pool.size() }); }
    return { cred: key, key };
  }
  // 한 번 시도. 스트림이면 첫 이벤트까지 읽고(여기서 실패하면 대체 가능) 나머지는 넘겨 준다.
  async function once({ conn, profile, messages, signal, cfg, purpose, cha, aff, pool, wantStream, extra = {} }) {
    const c = await credential(conn, pool, signal, aff);
    let gc = { messages }; if (gemcache && conn.kind === "google") gc = await gemcache.prepare({ conn, profile, messages, cred: c.cred, transport, signal });
    const upstreamStream = wantStream !== "off";
    const learnKey = `${cha?.chaId ?? ""}|${purpose}|${profile.id}`, learnOn = !!profile.cache?.learn; const prevTurnHashes = learnOn ? prevTurns.get(learnKey) ?? null : null; if (learnOn) { try { prevTurns.set(learnKey, turnHashesOf(gc.messages)); } catch { /* 학습만 건너뜀 */ } }
    let reqObj = buildRequest({ conn, profile, messages: gc.messages, prevTurnHashes, stream: upstreamStream, cred: c.copilot ? "" : c.cred, cachedContent: gc.cachedContent, reasoningState: extra.reasoningState });
    if (c.copilot) { reqObj = { ...reqObj, url: c.copilot.origin + new URL(reqObj.url).pathname, headers: { ...reqObj.headers, ...c.copilot.headers } }; }
    if (cfg.debug?.preview) notify(`요청 미리보기: ${profile.model} · ${gc.messages.length}개 메시지`);
    const t0 = now(), secrets = [c.cred];
    const ctl = new AbortController(); const onAbort = () => ctl.abort(signal.reason); if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener("abort", onAbort, { once: true }); }
    const to = setTimeout(() => ctl.abort(new Error("timeout")), (cfg.defaults.timeoutSec || 300) * 1000);
    const done = () => { clearTimeout(to); signal?.removeEventListener?.("abort", onAbort); };
    let res;
    try { res = await transport.send(reqObj, { signal: ctl.signal, proxyUrl: conn.proxyUrl, secrets }); }
    catch (e) { done(); if (signal?.aborted) throw Object.assign(new Error("aborted"), { aborted: true }); throw e instanceof HttpError ? e : new HttpError(redact(e?.message, secrets), 0, { network: true, timeout: /timeout/i.test(String(e?.message)) }); }
    if (!res.ok) { done(); const err = await errorFromResponse(res, secrets); err.key = c.key; if (res.status === 401 && c.copilot) c.copilot.invalidate?.(); throw err; }
    const format = reqObj.format, rep = { ...cfg.defaults.repetition, on: profile.repetitionOn };
    const finish = (acc) => { const u = acc.usage; const cost = costOf(u, profile.pricing), saved = savedByCache(u, profile.pricing); errlog?.add({ model: profile.model, purpose, kind: "ok", status: 200, attempt: 0, ms: now() - t0, action: "done", message: `입력 ${u?.input ?? 0} · 출력 ${u?.output ?? 0}` }); store.addUsage({ at: now(), purpose, profile: profile.id, model: profile.model, cha: cha?.chaId ?? "", usage: u, cost, saved, ms: now() - t0, via: "device" }).catch(() => {}); };
    // 스트림 아님(응답이 JSON 통째)
    if (!upstreamStream || !res.body?.getReader) {
      done(); let j; try { j = await res.json(); } catch { throw new HttpError("응답을 읽지 못했어요", res.status); }
      const r = parseResponse(format, j); if (r.error) throw Object.assign(new HttpError(redact(r.error, secrets), 0), { key: c.key, blocked: /차단|safety|blocked/i.test(r.error) });
      if (r.blocked && !r.text) throw Object.assign(new HttpError(`차단됨(${r.blocked})`, 0), { blocked: true, key: c.key });
      if (!r.text.trim()) throw Object.assign(new HttpError("빈 응답이에요", 0), { empty: true, key: c.key });
      finish({ usage: r.usage }); return { text: r.text, thinking: r.thinking, key: c.key, reasoningState: r.reasoningState };
    }
    // 스트림: 이벤트 모으기
    const reader = res.body.getReader(), dec = new TextDecoder(), decoder = createStreamDecoder(format);
    const acc = { text: "", thinking: "", usage: null, finish: "", err: null, state: [] };
    const pump = async () => { const { done: d, value } = await reader.read(); const evs = d ? decoder.flush() : decoder.push(typeof value === "string" ? value : dec.decode(value, { stream: true })); for (const e of evs) { if (e.type === "text") acc.text += e.text; else if (e.type === "thinking") acc.thinking += e.text; else if (e.type === "usage" && e.usage) acc.usage = { ...(acc.usage ?? {}), ...Object.fromEntries(Object.entries(e.usage).filter(([, v]) => v)) }; else if (e.type === "finish") acc.finish = e.reason; else if (e.type === "error") acc.err = e; else if (e.type === "reasoning-state") acc.state.push(e.item); } return { d, evs }; };
    // 첫 의미 있는 이벤트까지(여기서 실패하면 아직 아무것도 안 보냈으니 대체 가능)
    let started = false, ended = false;
    try { while (!started && !ended) { const { d, evs } = await pump(); if (acc.err) break; if (evs.some((e) => e.type === "text" || e.type === "thinking")) started = true; if (d) ended = true; } }
    catch (e) { done(); if (signal?.aborted) throw Object.assign(new Error("aborted"), { aborted: true }); throw new HttpError(redact(e?.message, secrets), 0, { network: true, key: c.key }); }
    if (acc.err) { done(); ctl.abort(); throw Object.assign(new HttpError(redact(acc.err.message, secrets), 0), { key: c.key, blocked: acc.err.code === "blocked" || /차단|safety|blocked/i.test(acc.err.message) }); }
    if (!acc.text.trim() && ended) { done(); if (acc.finish && /SAFETY|PROHIBITED|content_filter/i.test(acc.finish)) throw Object.assign(new HttpError(`차단됨(${acc.finish})`, 0), { blocked: true, key: c.key }); throw Object.assign(new HttpError("빈 응답이에요", 0), { empty: true, key: c.key }); }
    const mode = wantStream, showTh = !!profile.thinking?.showThinking;
    const wrapTh = (th, tx) => (showTh && th.trim() ? `<Thoughts>\n${th.trim()}\n</Thoughts>\n\n${tx}` : tx);
    if (mode !== "stream") { // 한번에 받기: 끝까지 모아서 문자열
      try { while (!ended) { const { d } = await pump(); if (d) ended = true; const hit = rep.on ? detectRepetition(acc.text, rep) : null; if (hit) { ctl.abort(); acc.text = trimRepetition(acc.text, hit); break; } } }
      catch (e) { if (!acc.text.trim() || !cfg.defaults.keepPartial) { done(); if (signal?.aborted) throw Object.assign(new Error("aborted"), { aborted: true }); throw new HttpError(redact(e?.message, secrets), 0, { network: true, key: c.key }); } }
      done(); finish(acc); return { text: wrapTh(acc.thinking, acc.text), key: c.key, reasoningState: acc.state };
    }
    // 진짜 스트림: ReadableStream으로 넘겨 준다
    let sentText = 0, sentTh = 0, thOpen = false, lastCheck = 0;
    const stream = new ReadableStream({
      async start(controller) {
        const emit = () => {
          if (showTh && acc.thinking.length > sentTh) { if (!thOpen) { controller.enqueue("<Thoughts>\n"); thOpen = true; } controller.enqueue(acc.thinking.slice(sentTh)); sentTh = acc.thinking.length; }
          if (acc.text.length > sentText) { if (thOpen) { controller.enqueue("\n</Thoughts>\n\n"); thOpen = false; } controller.enqueue(acc.text.slice(sentText)); sentText = acc.text.length; }
        };
        try {
          emit();
          while (!ended) {
            const { d } = await pump(); if (d) ended = true; emit();
            if (rep.on && acc.text.length - lastCheck >= 120) { lastCheck = acc.text.length; if (detectRepetition(acc.text, rep)) { ctl.abort(); notify("반복이 감지돼서 응답을 멈췄어요"); break; } }
          }
          if (thOpen) controller.enqueue("\n</Thoughts>\n\n");
          finish(acc); controller.close();
        } catch (e) {
          if (thOpen) { try { controller.enqueue("\n</Thoughts>\n\n"); } catch { /* 닫힘 */ } }
          if (signal?.aborted) { finish(acc); try { controller.close(); } catch { /* 닫힘 */ } }
          else if (cfg.defaults.keepPartial && acc.text.trim()) { notify("응답이 중간에 끊겨서 받은 만큼만 남겼어요"); finish(acc); controller.close(); }
          else controller.error(new Error(redact(e?.message, secrets)));
        } finally { done(); }
      },
      cancel() { try { ctl.abort(); } catch { /* 이미 끝남 */ } done(); }
    });
    return { stream, key: c.key, reasoningState: acc.state };
  }
  async function attemptTarget(res, ctx, cfg) {
    const { conn, profile } = res, pool = await poolFor(conn, cfg); let retries = Math.max(0, profile.retry ?? 2), last = null;
    for (let n = 0; n < 24; n++) {
      let key = ""; // 이 시도에서 쓴 키
      try {
        board?.update(ctx.reqId, { phase: "send", model: profile.model, label: `${PURPOSE_LABEL[res.purpose] ?? res.purpose} · ${profile.name || profile.model}`, waitUntil: 0 });
        const out = await once({ ...ctx, conn, profile: effectiveProfile(profile, ctx.req), pool, cfg, purpose: res.purpose });
        if (out.key) pool.ok(out.key); return { ok: true, out };
      } catch (e) {
        last = e; key = e.key ?? "";
        const kind = classifyFailure({ status: e.status, message: e.message, aborted: e.aborted, empty: e.empty, blocked: e.blocked });
        if (kind === "abort") return { ok: false, kind, error: e };
        const keysLeft = Math.max(0, pool.ready() - (key ? 1 : 0));
        if (key && (kind === "rate" || kind === "auth")) pool.fail(key, { ms: (cfg.defaults.keyCooldownSec || 60) * 1000 });
        const plan = planAfterFailure(kind, { retriesLeft: retries, keysLeft, chainLeft: 0, retryOn: cfg.defaults.retryOn });
        errlog?.add({ model: profile.model, purpose: res.purpose, kind, status: e.status, attempt: n + 1, action: plan, message: e.message });
        if (e.setup) return { ok: false, kind, error: e };
        if (plan === "switch-key") { board?.update(ctx.reqId, { phase: "retry", attempt: (n + 2), note: "다른 키로 다시" }); continue; }
        if (plan === "retry") { retries--; if (key && kind === "rate") pool.ok(key);   // 429 재시도: 잠깐 기다린 뒤 같은 키를 다시 쓴다
          const ms = backoffMs(Math.max(0, (profile.retry ?? 2) - retries - 1)); board?.update(ctx.reqId, { phase: "retry", attempt: (n + 2), waitUntil: now() + ms, note: e.status ? `HTTP ${e.status}` : "" }); await sleep(ms); continue; }
        return { ok: false, kind, error: e };
      }
    }
    return { ok: false, kind: "client", error: last };
  }
  // 진행 창(board): 요청마다 카드 하나. 끝나는 길(성공·실패·취소·스트림 끝)마다 end를 부른다.
  let reqSeq = 0;
  async function handle(req, signal) {
    const reqId = `r${now().toString(36)}-${++reqSeq}`, purpose0 = req.__purpose || purposeOfMode(req.mode);
    board?.start(reqId, { label: PURPOSE_LABEL[purpose0] ?? purpose0 });
    let out;
    try { out = await handleInner(req, signal, reqId); }
    catch (e) { board?.end(reqId, "error", String(e?.message ?? e).slice(0, 120)); throw e; }
    if (!out?.success) { board?.end(reqId, "error", String(out?.content ?? "").slice(0, 120)); return out; }
    const c = out.content;
    if (c && typeof c.getReader === "function" && typeof ReadableStream === "function") {
      // 스트림: 다 받으면 완료, 오류면 실패, 리스가 끊으면 취소로 카드를 닫는다(어느 길로 끝나도 카드가 남지 않게). 받은 글자 수도 보여 준다.
      board?.update(reqId, { phase: "recv" }); let chars = 0, toks = 0, last = 0; const rd = c.getReader();
      const piped = new ReadableStream({
        async pull(ctl) {
          try {
            const { done, value } = await rd.read();
            if (done) { board?.update(reqId, { chars, tokens: toks }); board?.end(reqId, "ok"); ctl.close(); return; }
            const piece = String(typeof value === "string" ? value : value?.text ?? ""); chars += piece.length; toks += estimateTokens(piece);
            if (now() - last > 500) { last = now(); board?.update(reqId, { chars, tokens: toks }); }
            ctl.enqueue(value);
          } catch (e) { board?.end(reqId, signal?.aborted ? "abort" : "error", String(e?.message ?? e).slice(0, 120)); ctl.error(e); }
        },
        cancel(reason) { board?.end(reqId, "abort"); try { rd.cancel(reason); } catch { /* 이미 끝남 */ } }
      });
      return { ...out, content: piped };
    }
    board?.end(reqId, signal?.aborted || c === "" ? "abort" : "ok");
    return out;
  }
  async function handleInner(req, signal, reqId) {
    const cfg = await store.get(), purpose = req.__purpose || purposeOfMode(req.mode);
    const cha = await currentChar().catch(() => null);
    const sum = summarize(await store.usage(), { now: now() }), bs = budgetState(sum, cfg.budget); let forced = "";
    if (bs.state === "over") { if (cfg.budget.action === "block") return fail(`예산을 넘었어요: ${bs.why}`); if (cfg.budget.action === "switch" && cfg.budget.switchProfileId) forced = cfg.budget.switchProfileId; else if (warnedDay !== String(new Date(now()).toDateString())) { notify(`예산을 넘었어요: ${bs.why}`); warnedDay = String(new Date(now()).toDateString()); } }
    else if (bs.state === "warn" && warnedDay !== String(new Date(now()).toDateString())) { notify(bs.why); warnedDay = String(new Date(now()).toDateString()); }
    const first = resolve(cfg, purpose, { chaId: cha?.chaId, profileId: forced || req.__profile || "" }); if (!first) return fail("Dusk 프로바이더에 프로필이 없어요. 작업실 → 프로바이더에서 만들어 주세요.");
    let messages = applyRules(req.prompt_chat ?? [], cfg.transforms.rules, { purpose, model: first.profile.model, charName: cha?.botName ?? "" });
    // 번역기 다듬기: 서식 보호 토큰 · 용어집 · 안내문(켜 두었을 때만)
    let tmap = null;
    if (purpose === "translate" && cfg.translator?.enabled) {
      const tr = cfg.translator, li = messages.map((m) => m.role).lastIndexOf("user"), extra = [];
      const gl = tr.glossary ? glossaryBlock(String(tr.glossaryText ?? "").split("\n").map((l) => { const i = l.indexOf("="); return i > 0 ? { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : null; }).filter(Boolean), tr.maxBytes) : "", gd = guideBlock(tr.guide, tr.maxBytes);
      if (tr.protect && li >= 0 && typeof messages[li].content === "string") { const p = protect(messages[li].content); tmap = p.map; messages = messages.map((m, i) => (i === li ? { ...m, content: p.text } : m)); extra.push("Keep every ⟦n⟧ token exactly as it is, in the same place."); }
      const add = [...extra, gl, gd].filter(Boolean).join("\n\n"); if (add) messages = [{ role: "system", content: add }, ...messages];
    }
    const fixT = (c) => { if (!(tmap && tmap.length && typeof c === "string")) return c; const r = restore(c, tmap); if (r.missing.length) notify(`번역에서 서식 ${r.missing.length}곳이 빠졌어요`); return r.text; };
    const akey = `${cha?.chaId ?? ""}|${purpose}`;
    if (cfg.transforms.cacheOrder) messages = orderForCache(messages, prevAnatomy.get(akey));
    prevAnatomy.set(akey, anatomy(messages, prevAnatomy.get(akey)));
    const defs = purpose === "main" ? enabledTools(cfg.tools) : []; const useTools = defs.length > 0;
    if (useTools) messages = [...messages, { role: "system", content: toolPrompt(defs) }];
    const order = chainOrder(cfg, first.profileId), aff = cha?.chaId ?? "";
    const wantMain = purpose === "main";
    let lastFail = null;
    for (let i = 0; i < order.length; i++) {
      const res = i === 0 ? first : resolve(cfg, purpose, { profileId: order[i] }); if (!res) continue;
      const stream = !wantMain || useTools ? (res.profile.stream === "off" ? "off" : "buffered") : res.profile.stream;
      if (!useTools) {
        const r = await attemptTarget(res, { req, reqId, messages, signal, cha, aff, wantStream: stream, extra: { reasoningState: res.profile.thinking?.continuation ? reasoningMemo.get(akey) : undefined } }, cfg);
        if (r.ok) { if (r.out.reasoningState?.length) reasoningMemo.set(akey, r.out.reasoningState); return { success: true, content: r.out.stream ?? fixT(r.out.text) }; }
        lastFail = r; if (r.kind === "abort") return { success: true, content: "" };
        if (planAfterFailure(r.kind, { chainLeft: order.length - i - 1, chainOn: cfg.chainOn }) !== "next-target") break;
        notify(`'${res.profile.name}' 실패 → 다음 프로필로 넘겨요`); continue;
      }
      // 도구 루프(글 프로토콜, 한번에 받기)
      let msgs = messages; const counter = { n: 0 }; let result = null;
      for (let depth = 0; depth <= (cfg.tools.maxDepth ?? 4); depth++) {
        const r = await attemptTarget(res, { req, reqId, messages: msgs, signal, cha, aff, wantStream: "buffered" }, cfg);
        if (!r.ok) { result = r; break; }
        const calls = depth < (cfg.tools.maxDepth ?? 4) ? parseToolCalls(r.out.text) : [];
        if (!calls.length) { return { success: true, content: stripToolCalls(r.out.text) || r.out.text }; }
        const outs = []; for (const c of calls) outs.push(`<tool_result name="${c.name}">${await runTool(c, cfg, counter)}</tool_result>`);
        msgs = [...msgs, { role: "assistant", content: r.out.text }, { role: "user", content: outs.join("\n") }];
      }
      lastFail = result; if (!result || result.kind === "abort") return { success: true, content: "" };
      if (planAfterFailure(result.kind, { chainLeft: order.length - i - 1, chainOn: cfg.chainOn }) !== "next-target") break;
    }
    const e = lastFail?.error; return fail(e?.setup ? e.message : `요청에 실패했어요${e?.status ? ` (HTTP ${e.status})` : ""}: ${e?.message ?? "원인을 알 수 없어요"}`);
  }
  async function runTool(c, cfg, counter) {
    const t0 = enabledTools(cfg.tools).find((d) => d.name === c.name); if (!t0) return "이 도구는 꺼져 있어요";
    try { if (toolExec) { const r = await toolExec(c.name, c.args, cfg, counter); if (r !== undefined) return String(r).slice(0, 6000); } if (risuTools) return String(await risuTools.run(c.name, c.args, counter)).slice(0, 6000); } catch (e) { return `실패: ${String(e?.message ?? e).slice(0, 200)}`; }
    return "도구를 실행할 수 없어요";
  }
  return { handle };
}
