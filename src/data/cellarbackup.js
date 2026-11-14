// Dusk Cellar 세이브 백업·복원 (1.8.3). 실제 일은 서버가 한다(바뀐 파일만 복사하는 증분 스냅샷, Dusk-Cellar backup.cjs).
// 플러그인은 목록·시작·복원 요청과 진행 확인만.
// 2.2.0(Cellar 0.2): Cellar가 리스와 따로 돌면서 복원은 리스가 꺼져 있을 때만 된다. 플러그인은 리스 안에서 돌기 때문에
// '예약 복원(wait)'을 보내고, Cellar가 리스가 꺼지는 순간 복원한다. 옛 Cellar(리스와 함께 실행)는 지금처럼 바로 복원하고 다시 켠다.
import { cellarRequest, probeCellar } from "./cellar.js";

export function createCellarBackups(api, conn, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const get = async () => {
    const { status, json } = await cellarRequest(api, conn, "/cellar/backup", { timeout: 15000 });
    if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`);
    return { items: Array.isArray(json.items) ? json.items : [], job: json.job ?? null, restore: json.restore ?? null };
  };
  const post = async (body) => {
    const { status, json } = await cellarRequest(api, conn, "/cellar/backup", { method: "POST", body, timeout: 15000 });
    if (status !== 200 || !json.ok) throw new Error(json.error ?? `응답 ${status}`);
    return json;
  };
  return {
    list: get,
    create: (label = "") => post({ action: "create", label }),
    remove: (id) => post({ action: "delete", id }),
    cancel: () => post({ action: "cancel" }),   // 예약 복원 취소
    // 복원 요청. 새 Cellar: 예약되면 바로 "waiting"을 돌려준다(리스를 끄면 복원됨).
    // 옛 Cellar: 리스가 꺼졌다 다시 켜질 때까지 기다린다. onWait(n): 기다리는 중 알림. 반환: true(다시 연결됨) / false(아직 응답 없음) / "waiting"
    async restore(id, { onWait = () => {}, tries = 90, wait = 2000 } = {}) {
      const r0 = await post({ action: "restore", id, wait: true });
      if (r0.waiting) return "waiting";
      await sleep(wait);
      for (let i = 0; i < tries; i++) {
        onWait(i);
        const st = await probeCellar(api, conn.url).catch(() => null);
        if (st?.ok) {
          // 서버가 복원 상태를 알려 주면 그걸 따른다(실패를 '복원했어요'로 착각하지 않게). 옛 서버는 상태가 없어 연결만 보고 끝낸다.
          const r = (await get().catch(() => null))?.restore;
          if (!r || r.id !== id) return true;
          if (r.phase === "done") return true;
          if (r.phase === "failed") throw new Error(r.error || "복원에 실패했어요");
        }
        await sleep(wait);
      }
      return false;
    },
  };
}
