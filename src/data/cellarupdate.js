// Dusk Cellar 자체 업데이트(1.8.3). 실제 일은 서버가 한다(git으로 받기 → 불러오기 검사 → Cellar만 재시작, Dusk-Cellar update.cjs).
// 플러그인은 확인·적용·되돌리기 요청과 재연결 확인만 한다.
import { cellarRequest, probeCellar } from "./cellar.js";

export function createCellarUpdate(api, conn, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const post = async (action, timeout) => {
    let r;
    try { r = await cellarRequest(api, conn, "/cellar/update", { method: "POST", body: { action }, timeout }); }
    catch (e) { if (e.json?.error && e.status) throw Object.assign(new Error(e.json.error), { server: true }); throw e; }   // 5xx여도 서버가 이유를 보냈으면 거절로 본다
    const { status, json } = r;
    if (status !== 200 || !json.ok) throw Object.assign(new Error(json.error ?? `응답 ${status}`), { server: true });
    return json;
  };
  // 재시작된 Cellar가 다시 응답할 때까지 기다린다. 반환: 새 상태(ok) 또는 null
  async function reconnect({ onWait = () => {}, tries = 30, wait = 1500 } = {}) {
    await sleep(wait);
    for (let i = 0; i < tries; i++) {
      onWait(i);
      const st = await probeCellar(api, conn.url).catch(() => null);
      if (st?.ok) return st;
      await sleep(wait);
    }
    return null;
  }
  async function restarting(action, timeout, opts) {
    const { firstWait = 12000 } = opts;
    const sent = post(action, timeout).then((r) => ({ r }), (e) => ({ e }));
    const first = await Promise.race([sent, new Promise((r) => { const t = setTimeout(() => r(null), firstWait); t?.unref?.(); })]);
    if (first?.e?.server) throw first.e;                                   // 서버가 거절함(고친 파일 있음 등)
    if (first?.r) return { ...first.r, back: first.r.restarting ? await reconnect(opts) : null };
    // 응답이 없거나 연결이 끊김 → 재시작 중일 수 있다
    const back = await reconnect(opts);
    if (!back) return { ok: true, updated: true, restarting: true, back: null, unsure: true };
    let c = null; try { c = await post("check", 120000); } catch { /* 아래에서 unsure */ }
    if (action === "apply" && c && c.behind > 0) throw new Error("업데이트하지 못한 것 같아요. 다시 시도해 주세요");
    return { ok: true, updated: action === "apply" ? true : undefined, restarting: true, back, recovered: true, fullRestart: false };
  }
  return {
    check: () => post("check", 120000),
    // 적용 요청 직후 Cellar가 다시 켜져서 응답이 끝까지 안 돌아올 수 있다(리스 프록시가 조각을 기다리다 멈춤).
    // 그래서 응답을 기다리다 일정 시간이 지나거나 연결이 끊기면 '재시작 중'으로 보고, 다시 연결된 뒤 확인(check)으로 끝났는지 판단한다.
    async apply(opts = {}) { return restarting("apply", 180000, opts); },
    async rollback(opts = {}) { return restarting("rollback", 60000, opts); },
  };
}
