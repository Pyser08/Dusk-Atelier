// 봇빌더 연동 화면 (v1.8.1)
//   · startWorkshop: 'AI로 봇 만들기'를 눌렀을 때 봇빌더가 있으면 그 화면으로 보낸다(연동판은 바로 열고, 원본은 안내).
//   · checkWorkshopReturn: Dusk를 다시 열었을 때 봇빌더에서 만든·고친 봇을 개발 목록에 넣고 이어서 작업하게 연다.
import { h, download } from '../dom.js';
import { btn, modal, note, confirmDialog } from '../kit.js';
import { createWorkshopLink } from '../../data/workshop.js';
import { insertCharacter } from '../../data/addcharacter.js';
import { draftFields, handoffAlive, planReturn, newBotsSince } from '../../engine/workshop.js';
import { ensureCharacterInOrder, newCharacterBase, uniqueDisplayName } from '../../engine/character.js';
import { Busy, isGenerating } from '../../engine/safety.js';
import { openCharEditor } from './chareditor.js';
import { addProjects } from './dev.js';

const linkOf = (ctx) => (ctx.workshop ??= createWorkshopLink(ctx.api));
const charsOf = async (ctx) => { const db = await ctx.api.getDatabase(["characters"]); return Array.isArray(db?.characters) ? db.characters : null; };

// 봇빌더로 보냈으면 true, Dusk 안에서 만들어야 하면 false
export async function startWorkshop(ctx) {
  const L = linkOf(ctx);
  const st = await L.status().catch(() => null);
  if (!st?.installed || !st.enabled) return false;
  const chars = await charsOf(ctx).catch(() => null);
  if (!chars) return false;
  if (st.linked) {
    await L.saveHandoff(chars, "linked");
    // 봇빌더 화면이 Dusk 밑에 깔리지 않도록 Dusk를 먼저 닫고 연다. 실패하면 Dusk를 다시 연다.
    await ctx.close?.();
    const r = await L.open().catch((e) => ({ ok: false, error: e?.message ?? String(e) }));
    if (r.ok) return true;
    await ctx.reopen?.();
  }
  return askManual(ctx, L, st, chars);
}

function askManual(ctx, L, st, chars) {
  return modal(ctx.win, (done) => {
    const goManual = async () => { await L.saveHandoff(chars, "manual"); done(true); await ctx.close?.(); };
    const getPatched = async () => {
      try {
        download("risu_story_workshop.js", await L.patchedScript(), "text/javascript");
        ctx.toast("연동판을 받았어요. 리스 설정 → 플러그인에서 기존 봇빌더를 지우고 이 파일을 넣어 주세요.");
      } catch (e) { ctx.toast(`연동판을 만들지 못했어요: ${e?.message ?? e}`, { error: true }); }
    };
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "봇빌더로 만들기", style: "width:min(520px,94vw)" },
      h("h3", { class: "rb-h3" }, "봇빌더로 만들기"),
      st.patched
        ? note("warn", "봇빌더(연동판)가 응답하지 않아요. 봇빌더를 켜 둔 채 리스를 새로 고친 뒤 다시 눌러 주세요.")
        : note("info", "설치된 봇빌더는 Dusk 연동판이 아니라서 Dusk에서 바로 열 수 없어요."),
      h("p", { class: "rb-p" }, "리스 메뉴(≡) → ‘봇빌더’에서 작업한 뒤 Dusk를 다시 열면, 봇빌더에서 만든 봇을 개발 목록으로 가져와 이어서 작업할 수 있어요."),
      st.patched ? null : h("p", { class: "rb-muted", style: "font-size:12px" }, "‘연동판 받기’로 받은 파일을 봇빌더 대신 설치하면 다음부터는 이 버튼 하나로 바로 열려요. 봇빌더가 자동 업데이트되면 원본으로 돌아가니 그때 다시 받아 주세요."),
      h("div", { class: "btns", style: "flex-wrap:wrap" },
        btn("Dusk에서 만들기", { onClick: () => done("dusk") }),
        st.patched ? null : btn("연동판 받기", { icon: "download", onClick: getPatched }),
        btn("봇빌더 열러 가기", { kind: "primary", onClick: goManual })));
  }).then((v) => v !== "dusk");   // 닫기(Esc)는 아무것도 안 함
}

// Dusk를 열 때 한 번: 인계가 살아 있으면 봇빌더 결과를 가져온다. 아무것도 없으면 인계를 지운다(작업 중이면 남겨 둠).
export async function checkWorkshopReturn(ctx) {
  const L = linkOf(ctx);
  const hand = await L.readHandoff().catch(() => null);
  if (!hand) return;
  if (!handoffAlive(hand)) { await L.clearHandoff(); return; }
  const chars = await charsOf(ctx).catch(() => null);
  if (!chars) return;
  const st = await L.status().catch(() => null);
  const draft = newBotsSince(hand, chars).length ? null : await L.readDraft(hand, { linked: !!st?.linked }).catch(() => null);
  const plan = planReturn(hand, chars, draft);
  if (plan.add.length) {
    await L.clearHandoff();
    await addProjects(ctx, plan.add.map((id) => ({ kind: "character", id })));
    return focusBot(ctx, plan.add[0], `봇빌더에서 만든 봇${plan.add.length > 1 ? ` ${plan.add.length}개` : ""}를 개발 목록에 넣었어요`);
  }
  if (plan.draft) {
    const name = String(plan.draft.name || plan.draft.draft?.name || "새 봇").trim();
    const yes = await confirmDialog(ctx.win, { title: "봇빌더 원고를 가져올까요?", body: `봇빌더에서 만들던 ‘${name}’ 원고가 아직 봇으로 등록되지 않았어요. 새 봇으로 만들어 개발 목록에 넣고 이어서 작업할까요?${plan.draft.fromSave ? "\n(봇빌더의 마지막 저장본 기준이에요)" : ""}`, ok: "새 봇으로 가져오기", cancel: "나중에" });
    if (!yes) return;   // 인계는 남겨 둔다: 봇빌더에서 등록하고 다시 오면 그때 가져온다
    await L.clearHandoff();
    try {
      const { created } = await insertCharacter(ctx.api, {
        characters: chars, isGenerating, Busy, ensureInOrder: (id) => ensureCharacterInOrder(ctx.api, id),
        hooks: { created: (id) => ctx.watcher?.markKnown?.(id) },
        build: (all) => { const c = newCharacterBase({ fields: {}, risuFields: {}, refs: {} }); Object.assign(c, draftFields(plan.draft.draft ?? plan.draft)); c.name = uniqueDisplayName(name, all); return c; }
      });
      await addProjects(ctx, [{ kind: "character", id: created.chaId }]);
      return focusBot(ctx, created.chaId, `‘${created.name}’ 봇을 만들고 개발 목록에 넣었어요`);
    } catch (e) { ctx.toast(e instanceof Busy ? "다른 봇이 응답을 생성하는 중이에요. 끝난 뒤 Dusk를 다시 열어 주세요." : `봇을 만들지 못했어요: ${e?.message ?? e}`, { error: true }); }
    return;
  }
  if (!draft?.started) await L.clearHandoff();
}

// 개발 모드면 개발 탭에서 고른 상태로, 아니면 그 봇 편집기를 바로 연다
async function focusBot(ctx, chaId, msg) {
  ctx.state.charsDirty = true;
  ctx.state.charSel = chaId;
  if (ctx.prefs.ui?.devMode) {
    ctx.state.devSel = `c:${chaId}`;
    ctx.go("dev");
    ctx.toast(msg);
    return;
  }
  const chars = await charsOf(ctx).catch(() => null);
  const idx = chars ? chars.findIndex((c) => c?.chaId === chaId) : -1;
  ctx.toast(`${msg} · 이어서 편집해요`);
  if (idx >= 0) await openCharEditor(ctx, idx, chaId, {});
}
