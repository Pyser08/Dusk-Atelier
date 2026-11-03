// Dusk Cellar 자체 업데이트(1.8.3). 실제 일은 서버가 한다(git으로 받기 → 불러오기 검사 → Cellar만 재시작, Dusk-Cellar update.cjs).
// 플러그인은 확인·적용·되돌리기 요청과 재연결 확인만 한다.
import { cellarRequest, probeCellar } from "./cellar.js";

export function createCellarUpdate(api, conn, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const post = async (action, timeout) => {
    const { status, json } = await cellarRequest(api, conn, "/cellar/update", { method: "POST", body: { action }, timeout });
    if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`);
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
  return {
    check: () => post("check", 120000),
    async apply(opts) { const r = await post("apply", 180000); return { ...r, back: r.restarting ? await reconnect(opts) : null }; },
    async rollback(opts) { const r = await post("rollback", 60000); return { ...r, back: r.restarting ? await reconnect(opts) : null }; },
  };
}
