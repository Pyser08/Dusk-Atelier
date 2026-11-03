// 홈 화면이 읽는 열린 채팅 상태(화면 코드와 분리: 무거운 import 없이 테스트하려고).
// 열린 채팅의 상태를 한 번에 읽는다. 기억 기능이 없거나 채팅이 없으면 null 칸.
export async function readState(ctx) {
  const M = ctx.memory;
  if (!M?.switches) return { M: null };
  // 열린 채팅 확인(호스트 왕복)을 기다리는 동안 채팅과 무관한 읽기(인덱스·기록 자동 설정)를 같이 시작한다(v1.8.3, 홈 속도).
  const idxP = Promise.resolve().then(() => M.store.getIndex());
  const trackP = Promise.resolve().then(() => M.flow?.settings?.()).then((st) => st?.rawSnapshot?.().autoWriterEnabled !== false, () => true);
  idxP.catch(() => {}); 
  // 위치가 같으면 직전 값을 바로 쓰고 뒤에서 확인(달라졌으면 홈을 다시 그림, v1.8.3 홈 속도)
  const cur = await (M.switches.peekCurrent ? M.switches.peekCurrent({ onChange: () => { if (ctx.state?.tab === "home") ctx.refresh?.(); } }) : M.switches.currentChat());
  if (!cur) return { M, cur: null };
  // 홈은 메시지 본문이 필요 없다: 채팅 통째 읽기·백필 계획(전 메시지 해시)은 하지 않는다(v1.8.1 속도 수정).
  const [sw, idx, folder, trackOn] = await Promise.all([
    M.switches.state(cur.chaId),
    idxP,
    M.store.getFolder(cur.chaId, cur.chatId).catch(() => null),
    trackP
  ]);
  return { M, cur, sw, idx, folder, trackOn, last: M.injector?.lastRequest?.() ?? null };
}
