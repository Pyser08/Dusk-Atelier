// 새 봇 만들기 (v1.7.0 5단계): 빈 봇을 하나 추가하고 편집기를 연다. AI로 만들기는 편집기의 'AI로 제작' 탭으로 바로 간다.
import { insertCharacter } from '../../data/addcharacter.js';
import { ensureCharacterInOrder, newCharacterBase, uniqueDisplayName } from '../../engine/character.js';
import { Busy, isGenerating } from '../../engine/safety.js';
import { openCharEditor } from './chareditor.js';
import { addProjects } from './dev.js';
import { startWorkshop } from './workshoplink.js';

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

/** 새 봇 편집기를 연다. tab: "ai"면 AI로 제작 탭에서 시작.
 *  · tab이 "ai"이면 봇을 먼저 만들지 않는다: 초안으로 열고, 사용자가 직접 [저장]할 때 처음 봇을 추가한다(자동 저장 없음).
 *  · 이름을 직접 정해 만드는 경우(name)는 예전처럼 빈 봇을 바로 추가한다. */
export async function createBotAndEdit(ctx, { name, tab } = {}) {
  try {
    if (tab === "ai") {
      // 봇빌더가 설치돼 있으면 그 화면으로 보낸다(돌아오면 만든 봇을 개발 목록으로 가져온다). 이름을 정해 만드는 경우는 제외.
      if (!name && await startWorkshop(ctx).catch(() => false)) return;
      const base = newCharacterBase({ fields: {}, risuFields: {}, refs: {} });
      base.name = String(name || "새 봇").trim();
      await openCharEditor(ctx, -1, base.chaId, {
        startTab: tab, draftChar: base,
        // 첫 저장으로 봇이 생긴 뒤: 목록 갱신 + 개발 목록에도 넣는다(개발자 모드가 꺼져 있어도 목록에는 쌓아 둔다)
        onCreated: async (created) => {
          ctx.state.charsDirty = true;
          ctx.state.charSel = created.chaId;
          await addProjects(ctx, [{ kind: "character", id: created.chaId }]).catch(() => {});
          ctx.refresh();
        }
      });
      return;
    }
    const { created, idx } = await addBlankBot(ctx, name);
    ctx.state.charsDirty = true;
    ctx.state.charSel = created.chaId;
    ctx.refresh();
    await openCharEditor(ctx, idx, created.chaId, { startTab: tab });
  } catch (e) {
    ctx.toast(e?.message ?? String(e), { error: true });
  }
}
