// 장기기억·관계도 애드온(2.0.0): 장기 기억(기록·주입·턴 흐름·리수폿 위키), 인물 관계도, 회귀, 호감도 HUD.
// 저장 데이터·설정 키(dusk.mem.v3.*, risupot.*, dusk.ui.memoryButton 등)는 그대로라 애드온을 다시 받으면 이어서 써요.
// 요청 훅(beforeRequest 주입)이 있어요(hooks:true). 코어 2.0.0 로더가 끌 때 훅을 떼 주므로 업데이트도 바로 적용돼요.
import { seedWikiNow, syncOrientNow } from "../../src/data/adultseed.js";
import { ensureProfiles } from "../../src/data/profileseed.js";
import { applyNsfwTurn } from "../../src/data/nsfwturn.js";
import { createMemory } from "../../src/data/memory.js";
import { createAffHud } from "../../src/data/affhud.js";
import { createMemoryButton } from "../../src/data/memorybutton.js";
import POT_PROMPTS from "../../src/data/pot/prompts.json";
import { setUserPromptProvider } from "../../src/engine/runai.js";
import { iconMarkup } from "../../src/ui/icons.js";
import { renderMemory } from "../../src/ui/screens/memory/index.js";
import { renderRelMap } from "../../src/ui/screens/relmap.js";
import { renderBranches } from "../../src/ui/screens/branches.js";
import { tracked } from "../../src/ui/screens/memory/settingstools.js";
import { STAGE_NAMES } from "../../src/ui/screens/memory/advanced.js";
import { cardSettings } from "../../src/ui/screens/memory/settings.js";

const log = (m) => console.log(`[Dusk Atelier] ${m}`);

export async function activate(api, ctx) {
  const ext = ctx.ext, app = ctx.app;
  if (!ext || !app) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const toast = (t) => { try { app.toast?.(t, { seconds: 8 }); } catch { /* 창이 닫혀 있음 */ } };
  const openTab = (tab) => Promise.resolve(ctx.openDusk?.(tab)).catch((e) => log(`열기 실패: ${e?.message ?? e}`));
  const memory = app.memoryForTest ?? createMemory(api, {
    storyNow: (c, t) => app.storyTime?.current?.(c, t), notify: toast, potLibrary: POT_PROMPTS, onOpen: () => openTab("memory")
  });
  // 2.2.6 기억 옵션 ‘처음 등장 때 성인 항목 무작위로’: 턴 기록 뒤 위키가 저장될 틈을 두고 새 인물에게 후보를 넣는다
  const seedOff = memory.flow?.onTurn?.((info) => { setTimeout(async () => { await applyNsfwTurn(memory, log, info, api).catch((e) => log(`성인 프로필 반영 실패 ${e?.message ?? e}`)); await ensureProfiles(memory, { log, api }).catch(() => 0); seedWikiNow(api, memory, log).catch((e) => log(`성인 항목 무작위 기록 실패 ${e?.message ?? e}`)); syncOrientNow(memory, app.erosync).catch(() => {}); }, 6000); });
  // 2.2.6 지난 대화 분석에서도: 시작 전 성적 지향을 옮기고, 끝나면 새 인물에게 기본 성격·성인 프로필·무작위 성인 항목을 넣는다
  memory.link.beforeBackfill = () => syncOrientNow(memory, app.erosync).catch(() => 0);
  // 이미 3턴 넘게 진행한 채팅이면 글(성적 욕망·이상성향 후보)은 새로 넣지 않고, 비어 있는 수치만 채운다
  memory.link.afterBackfill = async ({ turns = 0 } = {}) => {
    const progressed = turns >= 3;
    await new Promise((r) => setTimeout(r, 3000));   // 함께 기록(인물 위키)이 저장될 틈
    await ensureProfiles(memory, { max: 8, log, api }).catch(() => 0);   // addon-rebuild: 기본 성격 없는 인물부터 만들고
    if (!progressed) await seedWikiNow(api, memory, log).catch(() => 0);
    // addon-rebuild: 성인 프로필은 장기기억(folder.nsfw)으로 — Erosync 출발값은 더 만들지 않는다
    const er = app.erosync;
    await syncOrientNow(memory, er).catch(() => 0);
  };
  const affhud = createAffHud(api, { store: memory.store, link: memory.link });
  setUserPromptProvider(() => memory.userPrompts());
  // Erosync가 있으면 지난 대화 분석 끝에 성향 분석을 한 번(이미 있으면 그대로)
  memory.link.backfillErosync = async () => false;   // addon-rebuild: Erosync 전체 분석은 Dusk에서 부르지 않는다(성인 프로필은 장기기억)
  const regress = async () => {
    try { await openTab("memory"); const { openRegressHere } = await import("../../src/ui/screens/regress.js"); await openRegressHere(app); }
    catch (e) { log(`회귀 창 열기 실패: ${e?.message ?? e}`); }
  };
  const memBtn = createMemoryButton(api, { name: "인물 관계도", icon: iconMarkup("network", 20), open: () => openTab("relmap"), log });
  const off = [
    () => { try { seedOff?.(); } catch { /* 이미 떨어짐 */ } },
    ext.add("svc", "memory", memory),
    ext.add("svc", "affhud", affhud),
    ext.add("svc", "memoryButton", memBtn),
    ext.add("svc", "memoryui", { tracked, STAGE_NAMES, cardSettings }),
    ext.add("tab", "memory", renderMemory),
    ext.add("tab", "relmap", renderRelMap),
    ext.add("tab", "branches", renderBranches),
    ext.add("needsMemory", "memory", true),
    ext.add("needsMemory", "relmap", true),
    ext.add("needsMemory", "branches", true)
  ];
  // 채팅 메뉴 바로가기는 리스와 여러 번 오가서 느리다 → 기다리지 않는다(켜기를 막지 않게, 뒤따르는 애드온도 안 늦게)
  const menuOff = [];
  if (app.chatMenu?.addLink) (async () => {
    menuOff.push(await app.chatMenu.addLink({ id: "dusk-qt-memory", key: "memory", title: "장기 기억", open: () => openTab("memory") }));
    menuOff.push(await app.chatMenu.addLink({ id: "dusk-qt-regress", key: "regress", title: "회귀", open: regress }));
  })().catch((e) => log(`채팅 메뉴 바로가기 실패 ${e?.message ?? e}`));
  affhud.start().catch((e) => log(`호감도 HUD 시작 실패: ${e?.message ?? e}`));
  if (!app.memoryForTest) memory.start().catch((e) => log(`장기기억 시작 실패: ${e?.message ?? e}`));   // 시험에서 끼운 기억은 이미 준비된 것으로 본다
  memBtn.start().catch((e) => log(`관계도 버튼 시작 실패: ${e?.message ?? e}`));
  return {
    async deactivate() {
      off.forEach((f) => f());
      for (const f of menuOff) await f?.().catch?.(() => {});
      setUserPromptProvider(() => null);
      await memBtn.hide?.().catch?.(() => {});
      await affhud.stop?.().catch(() => {});
      await memory.stop?.().catch(() => {});
    }
  };
}
