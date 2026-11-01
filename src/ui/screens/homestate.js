// 홈 화면이 읽는 열린 채팅 상태(화면 코드와 분리: 무거운 import 없이 테스트하려고).
// 열린 채팅의 상태를 한 번에 읽는다. 기억 기능이 없거나 채팅이 없으면 null 칸.
export async function readState(ctx) {
  const M = ctx.memory;
  if (!M?.switches) return { M: null };
  const cur = await M.switches.currentChat();
  if (!cur) return { M, cur: null };
  // 홈은 메시지 본문이 필요 없다: 채팅 통째 읽기·백필 계획(전 메시지 해시)은 하지 않는다(v1.8.1 속도 수정).
  const [sw, idx, folder] = await Promise.all([
    M.switches.state(cur.chaId),
    M.store.getIndex(),
    M.store.getFolder(cur.chaId, cur.chatId).catch(() => null)
  ]);
  let trackOn = true;
  try {
    trackOn = (await M.flow?.settings?.())?.rawSnapshot?.().autoWriterEnabled !== false;
  } catch {
  }
  return { M, cur, sw, idx, folder, trackOn, last: M.injector?.lastRequest?.() ?? null };
}
