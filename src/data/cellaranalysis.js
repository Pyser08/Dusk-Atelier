// Dusk Cellar 서버 분석 (1.9.3, Cellar 0.1.1~): '지난 대화 분석'을 서버에서 돌린다. 쓸 수 없으면 prepare가 null을 줘서 기기에서 그대로 돌린다.
// 서버에 보내는 것: 채팅 메시지(분석에 필요한 필드만)·분석 설정·모델 주소와 키. 키는 서버가 작업 동안 메모리에만 둔다.
// 기억은 이미 Cellar에 저장돼 있어야 하고(memoryremote 서버 모드), 결과도 거기에 쓰인다.
import { cellarRequest } from "./cellar.js";
import { serverModelOf } from "./modelhub.js";

const POLL_MS = 1500, POLL_FAILS = 6;
const KEEP = ["role", "data", "content", "text", "mes", "message", "chatId", "isUser", "is_user", "type", "isStreaming", "streaming", "time"];
export const slimMessages = (msgs) => (msgs ?? []).map((m) => { const o = {}; for (const k of KEEP) if (m && m[k] !== undefined) o[k] = m[k]; return o; });

// 2.2.11 서버 분석 엔진 버전 확인: 엔진은 Atelier 소스로 만든 묶음이라 플러그인과 버전이 어긋나면 고친 버그(예: 사고 출력 <Thoughts> 처리)가 서버에선 그대로다.
//   status.engine: Cellar health가 알려 주는 엔진 버전(옛 Cellar는 없음). 맞거나 알 수 없으면 null, 아니면 사용자에게 보일 문구.
const PLUGIN_VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "";
// 사용자가 멈춘 서버 작업(다음에 화면을 열어도 저절로 이어받지 않음). 저장소가 없으면 이 실행 동안만 기억.
const STOPPED_KEY = "dusk.cellar.stoppedJobs", stoppedMem = new Set();
const jobKey = (j) => String(j?.id ?? j?.jobId ?? (j?.chaId != null ? `${j.chaId}|${j.chatId}|${j.startedAt ?? j.started ?? j.total ?? ""}` : ""));
const chatPrefix = (chaId, chatId) => `${chaId}|${chatId}|`;
// 같은 채팅을 사용자가 새로 분석하면 그 채팅의 '멈춘 작업' 표시를 지운다
export function clearStoppedChat(chaId, chatId) { const pre = chatPrefix(chaId, chatId);
  for (const k of [...stoppedMem]) if (k.startsWith(pre)) stoppedMem.delete(k);
  try { globalThis.localStorage?.setItem(STOPPED_KEY, JSON.stringify(readStopped().filter((k) => !k.startsWith(pre)))); } catch { /* 없음 */ } }
function readStopped() { try { return JSON.parse(globalThis.localStorage?.getItem(STOPPED_KEY) ?? "[]"); } catch { return []; } }
export function isStoppedJob(j) { const k = jobKey(j); return !!k && (stoppedMem.has(k) || readStopped().includes(k)); }
export function markStoppedJob(j) { const k = jobKey(j); if (!k) return; stoppedMem.add(k);
  try { globalThis.localStorage?.setItem(STOPPED_KEY, JSON.stringify([...readStopped().filter((x) => x !== k), k].slice(-20))); } catch { /* 이 실행 동안만 */ } }
// 지금 나와 있는 최신 Cellar(v0.1.0)에 든 분석 엔진 버전. Cellar를 새로 내면 올린다
export const ENGINE_MIN = "2.2.41";
const verCmp = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
export function engineNotice(pluginVer, status) {
  if (!pluginVer || !status?.ok || !status.features?.includes("analysis")) return null;
  const eng = String(status.engine ?? "");
  // 신고 #25: Cellar는 플러그인만큼 자주 나오지 않는다. 최신 Cellar에 든 엔진(ENGINE_MIN) 이상이면 알리지 않는다(업데이트할 게 없는데 매번 뜨던 문제)
  if (eng === pluginVer || (eng && verCmp(eng, ENGINE_MIN) >= 0)) return null;
  return eng ? `Dusk Cellar의 분석 엔진(v${eng})이 오래됐어요(최신 Cellar는 v${ENGINE_MIN} 이상). 서버 분석 결과가 기기 분석과 다를 수 있으니 Cellar를 업데이트해 주세요.`
    : `Dusk Cellar의 분석 엔진이 오래된 버전이에요(플러그인 v${pluginVer}). 서버 분석에서 실패가 잦을 수 있으니 Cellar를 업데이트해 주세요.`;
}

export function createServerAnalysis(api, { cellar, remote, pollMs = POLL_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), version = PLUGIN_VERSION }) {
  let noticed = false;   // 버전 알림은 한 세션에 한 번
  const noticeOf = (c) => { if (noticed) return null; const t = engineNotice(version, c); if (t) noticed = true; return t; };
  // 서버로 보낼 수 있으면 { conn, model, why:null }, 아니면 null (기기에서 분석)
  async function prepare(pick) {
    try {
      const st = remote?.state?.();
      if (st?.mode !== "remote" || !st.online) return null;
      const c = await cellar.status();
      if (!c?.ok || !c.features?.includes("analysis")) return null;
      const conn = { url: c.url, via: c.via };
      // 서버가 직접 부를 수 있는 모델이면 서버가 호출한다(플러그인 창이 꺼져도 계속 돎). 아니면 모델 호출만 플러그인이 대신 한다(중계).
      const m = await serverModelOf(api, pick);
      const notice = noticeOf(c);
      if (m.ok) return { conn, model: m.model, ...(notice ? { notice } : {}) };
      if (c.features.includes("analysis-relay")) return { conn, model: { kind: "relay" }, relay: true, ...(notice ? { notice } : {}) };
      return null;
    } catch { return null; }
  }
  let active = 0;   // 이 기기에서 서버 작업을 따라가는 중인 수(이어받기와 겹치지 않게)
  const reqOf = (conn) => (body, timeout) => cellarRequest(api, conn, "/cellar/analysis", { method: "POST", body, timeout });
  // 작업을 따라간다: 진행 폴링 + (중계면) 서버가 요청한 모델 호출을 이 기기가 하고 결과를 돌려준다
  async function follow(conn, j, { signal, onProgress, relay = null, isRelay = false }) {
    const req = reqOf(conn);
    let cancelled = false, bad = 0;
    active++;
    try {
      for (;;) {
        // 중지: Cellar에 cancel을 보내고 더 따라가지 않는다(중계 모델 호출을 더 하지 않게)
        if (signal?.aborted && !cancelled) { cancelled = true; try { await req({ action: "cancel" }, 8000); } catch { /* 서버가 못 받아도 이 기기는 멈춘다 */ }
          if (j.state === "running") j = { ...j, state: "cancelled" }; }
        if (j.state !== "running") break;
        let handled = 0;
        try {
          const r = await req({ action: "status", ...(isRelay ? { claim: true } : {}) }, 15000);
          if (r.json?.job) { j = r.json.job; bad = 0; if (j.total) onProgress?.(j.done, j.total, j.failed); }
          for (const c of isRelay && relay ? (r.json?.calls ?? []) : []) {
            let body;
            try { body = { action: "result", callId: c.id, text: await relay(c.messages, c.pick) }; }
            catch (e) { body = { action: "result", callId: c.id, error: String(e?.message ?? e).slice(0, 300) }; }
            try { await req(body, 30000); } catch { /* 서버가 같은 요청을 다시 내준다 */ }
            handled++;
          }
        } catch (e) {
          if (++bad >= POLL_FAILS) throw new Error("서버와 연결이 끊겼어요. 서버에서는 분석이 계속될 수 있으니 잠시 뒤 기억 탭에서 확인해 주세요.");
        }
        if (!handled) await sleep(pollMs);
      }
    } finally { active--; }
    if (j.state === "error") throw new Error(j.error || "서버 분석에 실패했어요");
    return { total: j.total ?? 0, failed: Array.from({ length: j.failed ?? 0 }, () => []), reasons: j.reasons ?? [], server: true, job: j };
  }
  // payload: Cellar start 입력(model 제외). 시작 전 실패(연결·미지원)는 null → 기기 방식. 시작한 뒤의 문제는 오류로 알린다.
  async function run(prep, payload, { signal, onProgress, relay = null } = {}) {
    if (prep.relay && !relay) return null;
    if (payload?.chaId != null) clearStoppedChat(payload.chaId, payload.chatId);
    let started;
    try { started = await reqOf(prep.conn)({ action: "start", ...payload, model: prep.model }, 120e3); }
    catch (e) { if (e.network || e.status === 501) return null; throw e; }
    if (started.status !== 200 || !started.json?.job) {
      if (started.status === 501) return null;
      throw new Error(started.json?.error ?? `서버 분석을 시작하지 못했어요 (응답 ${started.status})`);
    }
    try { return await follow(prep.conn, started.json.job, { signal, onProgress, relay, isRelay: Boolean(prep.relay) }); }
    finally { if (signal?.aborted) markStoppedJob(started.json.job); }
  }
  // 리스 화면을 다시 열었을 때: 서버가 중계 모델 호출을 기다리는 작업이 있는지만 본다. 없으면 null.
  //   사용자가 '생성 중지'로 멈춘 적 있는 작업은 저절로 이어받지 않는다.
  async function pendingResume() {
    try {
      if (active) return null;
      const st = remote?.state?.();
      if (st?.mode !== "remote" || !st.online) return null;
      const c = await cellar.status();
      if (!c?.ok || !c.features?.includes("analysis-relay")) return null;
      const conn = { url: c.url, via: c.via };
      const r = await reqOf(conn)({ action: "status" }, 15000);
      const j = r.json?.job;
      if (!j || j.state !== "running" || !j.relay || isStoppedJob(j)) return null;
      return { conn, job: j };
    } catch { return null; }
  }
  // 이어받기. pending(pendingResume 결과)이 없으면 직접 찾는다. 중지되면 Cellar에 cancel을 보내고 그 작업을 '멈춘 작업'으로 기억한다.
  async function resume({ relay, onProgress, signal, pending = null } = {}) {
    if (!relay) return null;
    const p = pending ?? await pendingResume();
    if (!p || active) return null;
    try { return await follow(p.conn, p.job, { signal, onProgress, relay, isRelay: true }); }
    catch { return null; }
    finally { if (signal?.aborted) markStoppedJob(p.job); }
  }
  return { prepare, run, resume, pendingResume, slim: slimMessages };
}
