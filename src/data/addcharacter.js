// 새 봇을 DB에 추가하는 공용 흐름 (legacy.js의 '캐릭터 추가'에서 추출, 동작 동일).
// 생성 중 차단 → hooks.created → push → setDatabaseLite → 순서 보정 → 확인 → 첫 채팅 저장.
// isGenerating / Busy / ensureInOrder는 호출하는 쪽이 넘긴다(테스트에서 TS 모듈 체인을 피하려고).
export async function insertCharacter(api, { characters, build, hooks, ensureInOrder, isGenerating, Busy }) {
  if (characters.some(isGenerating)) throw new Busy();
  const created = build(characters);
  await hooks?.created?.(created.chaId);
  characters.push(created);
  await api.setDatabaseLite({ characters });
  await ensureInOrder(created.chaId);
  const idx = characters.length - 1;
  const check = await api.getCharacterFromIndex(idx);
  if (check?.chaId !== created.chaId) throw new Error("추가 후 확인에서 캐릭터를 찾지 못했습니다. 캐릭터 목록을 확인해 주세요.");
  try {
    await api.setChatToIndex(idx, 0, created.chats[0]);
  } catch {
  }
  return { created, idx };
}
