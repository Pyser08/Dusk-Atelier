// Dusk Cellar 서버 분석 (1.9.3, Cellar 0.1.1~): '지난 대화 분석'을 서버에서 돌린다. 쓸 수 없으면 prepare가 null을 줘서 기기에서 그대로 돌린다.
// 서버에 보내는 것: 채팅 메시지(분석에 필요한 필드만)·분석 설정·모델 주소와 키. 키는 서버가 작업 동안 메모리에만 둔다.
// 기억은 이미 Cellar에 저장돼 있어야 하고(memoryremote 서버 모드), 결과도 거기에 쓰인다.
import { cellarRequest } from "./cellar.js";
import { serverModelOf } from "./modelhub.js";

const POLL_MS = 1500, POLL_FAILS = 6;
const KEEP = ["role", "data", "content", "text", "mes", "message", "chatId", "isUser", "is_user", "type", "isStreaming", "streaming", "time"];
export const slimMessages = (msgs) => (msgs ?? []).map((m) => { const o = {}; for (const k of KEEP) if (m && m[k] !== undefined) o[k] = m[k]; return o; });

export function createServerAnalysis(api, { cellar, remote, pollMs = POLL_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  // 서버로 보낼 수 있으면 { conn, model, why:null }, 아니면 null (기기에서 분석)
  async function prepare(pick) {
    try {
      const st = remote?.state?.();
      if (st?.mode !== "remote" || !st.online) return null;
      const c = await cellar.status();
      if (!c?.ok || !c.features?.includes("analysis")) return null;
      const m = await serverModelOf(api, pick);
      if (!m.ok) return null;
      return { conn: { url: c.url, via: c.via }, model: m.model };
    } catch { return null; }
  }
  // payload: Cellar start 입력(model 제외). 시작 전 실패(연결·미지원)는 null → 기기 방식. 시작한 뒤의 문제는 오류로 알린다.
  async function run(prep, payload, { signal, onProgress } = {}) {
    const req = (body, timeout) => cellarRequest(api, prep.conn, "/cellar/analysis", { method: "POST", body, timeout });
    let started;
    try { started = await req({ action: "start", ...payload, model: prep.model }, 120e3); }
    catch (e) { if (e.network || e.status === 501) return null; throw e; }
    if (started.status !== 200 || !started.json?.job) {
      if (started.status === 501) return null;
      throw new Error(started.json?.error ?? `서버 분석을 시작하지 못했어요 (응답 ${started.status})`);
    }
    let cancelled = false, bad = 0, j = started.json.job;
    for (;;) {
      if (signal?.aborted && !cancelled) { cancelled = true; try { await req({ action: "cancel" }, 8000); } catch { /* 아래 상태 확인에서 */ } }
      if (j.state !== "running") break;
      await sleep(pollMs);
      try {
        const r = await req({ action: "status" }, 15000);
        if (r.json?.job) { j = r.json.job; bad = 0; if (j.total) onProgress?.(j.done, j.total, j.failed); }
      } catch (e) {
        if (++bad >= POLL_FAILS) throw new Error("서버와 연결이 끊겼어요. 서버에서는 분석이 계속될 수 있으니 잠시 뒤 기억 탭에서 확인해 주세요.");
      }
    }
    if (j.state === "error") throw new Error(j.error || "서버 분석에 실패했어요");
    return { total: j.total ?? 0, failed: Array.from({ length: j.failed ?? 0 }, () => []), reasons: j.reasons ?? [], server: true };
  }
  return { prepare, run, slim: slimMessages };
}
