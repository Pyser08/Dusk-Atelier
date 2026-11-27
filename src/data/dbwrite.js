// PocketRisu 1.18.0 dbWrite 권한 임시 대응(2.2.68). 포켓리스가 규칙을 고치면 없어도 되지만, 남겨 둬도 어느 호스트에서도 깨지지 않는다.
// - 1.18.0부터 setDatabase·setDatabaseLite·setChar/setCharacter·setCharacterToIndex·setChatToIndex가 dbWrite 권한을 요구한다.
//   권한 창을 띄운 그 쓰기(와 창이 열린 동안 쌓인 쓰기)는 사용자가 허락해도 오류로 거절된다.
// - 그래서 첫 쓰기 전에 requestPluginPermission("dbWrite")를 한 번 불러 미리 허락받는다(메뉴 등록 뒤에도 한 번 불러 둔다).
//   묻는 동안에는 읽기·쓰기를 기다리게 해, 창이 닫힌 뒤 최신 데이터를 읽고 쓰게 한다.
// - 반환값은 보지 않는다: 1.17.0 이하·구버전 RisuAI는 "dbWrite"를 몰라 false를 돌려준다. 사용자가 실제로 거절하면 호스트가 알아서 쓰기를 건너뛴다.
// - 그래도 오류 메시지에 "dbWrite"가 있으면 한 번만 다시 쓴다. 거절된 쓰기는 적용되지 않았으므로 같은 내용을 다시 보내면 된다.
//   단 채팅은 그 사이 메시지가 늘었으면(새 응답) 옛 내용으로 덮지 않게 다시 보내지 않는다.
//   다시 쓰기는 이 층에서만 하므로 백업·내부 설정 같은 호출한 쪽의 부수효과는 두 번 일어나지 않는다.
// - 같은 대상(같은 봇·같은 채팅·데이터베이스)에 대한 쓰기는 하나씩 차례대로 보낸다.
export const DBWRITE_FNS = ["setDatabase", "setDatabaseLite", "setChar", "setCharacter", "setCharacterToIndex", "setChatToIndex"];
export const DBREAD_FNS = ["getDatabase", "getCharacter", "getCharacterFromIndex", "getChatFromIndex"];
export const isDbWriteError = (e) => /dbWrite/.test(String(e?.message ?? e ?? "")) || /dbWrite/.test(String(e?.cause?.message ?? ""));
export const dbWriteMessage = "리스가 Dusk의 데이터 쓰기(dbWrite 권한)를 막았어요. 권한 창에서 허락한 뒤 다시 해 주세요.";

export function targetOf(name, a) {
  if (name === "setChatToIndex") return `chat:${a[0]}:${a[1]}`;
  if (name === "setCharacterToIndex") return `char:${a[0]}`;
  if (name === "setChar" || name === "setCharacter") return "char:current";
  return "db";
}

export function createDbWriteGuard(host, { log = (...a) => console.log("[Dusk Atelier] dbWrite", ...a) } = {}) {
  let asked = null, waiting = false;
  // 한 번만 묻는다. 오류·false는 무시(구버전 호스트).
  function ensure() {
    if (asked) return asked;
    if (typeof host?.requestPluginPermission !== "function") return (asked = Promise.resolve(null));
    waiting = true;
    asked = Promise.resolve()
      .then(() => host.requestPluginPermission("dbWrite"))
      .catch(() => null)
      .finally(() => { waiting = false; });
    return asked;
  }
  const chains = new Map();
  function serial(key, fn) {
    const prev = chains.get(key) ?? Promise.resolve();
    const p = prev.then(fn, fn);
    const tail = p.catch(() => {});
    chains.set(key, tail);
    tail.then(() => { if (chains.get(key) === tail) chains.delete(key); });
    return p;
  }
  const msgCount = (c) => (Array.isArray(c?.message) ? c.message.length : -1);
  function wrapWrite(name, fn) {
    return (...a) => { const ready = ensure(); return serial(targetOf(name, a), async () => {
      await ready;
      try {
        return await fn(...a);
      } catch (e) {
        if (!isDbWriteError(e)) throw e;
        log(`${name} 거절됨 → 한 번 다시 써요`, e?.message ?? e);
        if (name === "setChatToIndex" && typeof host.getChatFromIndex === "function") {
          const now = await Promise.resolve(host.getChatFromIndex(a[0], a[1])).catch(() => null);
          if (now && msgCount(now) > msgCount(a[2])) { log("그 사이 채팅에 메시지가 늘어 다시 쓰지 않아요"); throw e; }
        }
        return await fn(...a);
      }
    }); };
  }
  // 권한을 묻는 동안에는 읽기도 기다린다(창이 닫힌 뒤 최신 데이터로 계산하게)
  const wrapRead = (fn) => async (...a) => { if (waiting) await asked; return fn(...a); };
  return { ensure, wrapWrite, wrapRead, pending: () => waiting };
}
