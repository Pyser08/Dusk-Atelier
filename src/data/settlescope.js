// 신고 #5(3차): settle 뒤 동기화(월경 주기·호감도)의 대상. 캐릭터·채팅을 통째로 다시 읽지 않고
// 지금 위키 런타임이 연 범위(봇·채팅 키)로 기억 폴더를 한 번만 읽는다 → 기억과 위키가 늘 같은 채팅 것이다.
// same(): 기다리는 사이 다른 채팅 위키로 바뀌지 않았는지. 쓰기 직전에 확인한다.
export async function settleTarget(wiki, store) {
  const ids = () => { const s = wiki.snapshot()?.scope; return s?.characterId && s?.chatKey ? [String(s.characterId), String(s.chatKey)] : null; };
  const at = ids(); if (!at) return null;
  const [chaId, ck] = at, same = () => { const n = ids(); return !!n && n[0] === chaId && n[1] === ck; };
  const folder = await store.getFolder(chaId, ck);
  return folder && same() ? { chaId, ck, folder, same } : null;
}
