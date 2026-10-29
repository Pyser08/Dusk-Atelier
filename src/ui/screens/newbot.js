// 새 봇 만들기 (v1.7.0 5단계): 빈 봇을 하나 추가하고 편집기를 연다. AI로 만들기는 편집기의 'AI로 제작' 탭으로 바로 간다.
import { insertCharacter } from '../../data/addcharacter.js';
import { ensureCharacterInOrder, newCharacterBase, uniqueDisplayName } from '../../engine/character.js';
import { Busy, isGenerating } from '../../engine/safety.js';
import { openCharEditor } from './chareditor.js';

/** 빈 봇을 DB에 추가한다. 반환: {created, idx} */
export async function addBlankBot(ctx, name = "새 봇") {
  const db = await ctx.api.getDatabase(["characters"]);
  const characters = Array.isArray(db?.characters) ? db.characters : [];
  return insertCharacter(ctx.api, {
    characters,
    hooks: { created: (id) => ctx.watcher?.markKnown?.(id) },
    ensureInOrder: (id) => ensureCharacterInOrder(ctx.api, id),
    isGenerating,
    Busy,
    build: (all) => {
      const c = newCharacterBase({ fields: {}, risuFields: {}, refs: {} });
      c.name = uniqueDisplayName(String(name || "새 봇").trim(), all);
      return c;
    }
  });
}

/** 새 봇을 만들고 편집기를 연다. tab: "ai"면 AI로 제작 탭에서 시작 */
export async function createBotAndEdit(ctx, { name, tab } = {}) {
  try {
    const { created, idx } = await addBlankBot(ctx, name);
    ctx.state.charsDirty = true;
    ctx.state.charSel = created.chaId;
    ctx.refresh();
    await openCharEditor(ctx, idx, created.chaId, { startTab: tab });
  } catch (e) {
    ctx.toast(e?.message ?? String(e), { error: true });
  }
}
