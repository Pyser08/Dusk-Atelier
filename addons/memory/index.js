// 장기기억·관계도 애드온(2.0.0): 장기 기억(기록·주입·턴 흐름·리수폿 위키), 인물 관계도, 회귀, 호감도 HUD.
// 저장 데이터·설정 키(dusk.mem.v3.*, risupot.*, dusk.ui.memoryButton 등)는 그대로라 애드온을 다시 받으면 이어서 써요.
// 요청 훅(beforeRequest 주입)이 있어요(hooks:true). 코어 2.0.0 로더가 끌 때 훅을 떼 주므로 업데이트도 바로 적용돼요.
import { createMemory } from "../../src/data/memory.js";
import { createAffHud } from "../../src/data/affhud.js";
import { createMemoryButton } from "../../src/data/memorybutton.js";
import POT_PROMPTS from "../../src/data/pot/prompts.json";
import { setUserPromptProvider } from "../../src/engine/runai.js";
import { iconMarkup } from "../../src/ui/icons.js";
import { createStopButton } from "../../src/ui/stopbutton.js";
import { renderMemory } from "../../src/ui/screens/memory/index.js";
import { renderRelMap } from "../../src/ui/screens/relmap.js";
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
  const affhud = createAffHud(api, { store: memory.store, link: memory.link });
  // 보조 모델로 기억을 쓰는 동안 오른쪽 아래에 작은 '중지' 버튼
  const stopBtn = createStopButton(() => app.watcher?.doc ?? null, () => { const n = memory.runner?.activity?.stop?.() ?? 0; if (n) toast("기억 작성을 중지했어요. 다음 응답부터 다시 기록돼요."); });
  const offActivity = memory.runner?.activity?.onChange?.((n) => { stopBtn.set(n > 0).catch(() => {}); });
  setUserPromptProvider(() => memory.userPrompts());
  // Erosync가 있으면 지난 대화 분석 끝에 성향 분석을 한 번(이미 있으면 그대로)
  memory.link.backfillErosync = async () => {
    const er = app.erosync; if (!er?.isRunning?.()) return false;
    const r = await er.read(); if (r?.ok && (r.people ?? []).length) return false;
    const st = await er.profile("status"); if (st?.running) return false;
    return !!(await er.profile("start", "full"))?.ok;
  };
  const regress = async () => {
    try { await openTab("memory"); const { openRegressHere } = await import("../../src/ui/screens/regress.js"); await openRegressHere(app); }
    catch (e) { log(`회귀 창 열기 실패: ${e?.message ?? e}`); }
  };
  const memBtn = createMemoryButton(api, { name: "인물 관계도", icon: iconMarkup("network", 20), open: () => openTab("relmap"), log });
  const off = [
    ext.add("svc", "memory", memory),
    ext.add("svc", "affhud", affhud),
    ext.add("svc", "memoryButton", memBtn),
    ext.add("svc", "memoryui", { tracked, STAGE_NAMES, cardSettings }),
    ext.add("tab", "memory", renderMemory),
    ext.add("tab", "relmap", renderRelMap),
    ext.add("needsMemory", "memory", true),
    ext.add("needsMemory", "relmap", true)
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
      try { offActivity?.(); await stopBtn.set(false); } catch { /* 없음 */ }
      for (const f of menuOff) await f?.().catch?.(() => {});
      setUserPromptProvider(() => null);
      await memBtn.hide?.().catch?.(() => {});
      await affhud.stop?.().catch(() => {});
      await memory.stop?.().catch(() => {});
    }
  };
}
