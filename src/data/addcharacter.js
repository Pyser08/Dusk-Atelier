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

// 'AI로 제작'처럼 봇을 먼저 만들지 않고 편집기에서 초안으로 시작하는 흐름.
// 만들기만 해서는 DB에 아무것도 쓰지 않고, 사용자가 [저장]할 때(첫 저장) 한 번만 봇을 추가한다. 그 뒤 저장은 update(index)로 넘긴다.
// merge(base, draft, original) → 저장할 봇 객체, uniqueName(이름, 전체 목록) → 겹치지 않는 이름
export function createBotDraft(api, { base, getCharacters, merge, uniqueName, hooks, ensureInOrder, isGenerating, Busy, onCreated }) {
  let index = -1, creating = null;
  return {
    get index() { return index; },
    get saved() { return index >= 0; },
    async save(draft, original, update) {
      if (index >= 0) return update(index);
      creating ??= (async () => {
        const characters = await getCharacters();
        const r = await insertCharacter(api, { characters, hooks, ensureInOrder, isGenerating, Busy, build: (all) => {
          const c = merge(structuredClone(base), draft, original);
          c.name = uniqueName(String(c.name || "새 봇").trim(), all);
          return c;
        } });
        index = r.idx;
        await onCreated?.(r.created, r.idx);
        return r;
      })().finally(() => { creating = null; });
      return creating;
    }
  };
}
