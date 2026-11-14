// Erosync 애드온(2.0.0): NSFW 장면 디렉터(인물 성향·목표·장면 계획을 요청에 넣음). 장기기억 애드온이 필요해요(화면이 그쪽에 있음).
// 켜기 설정(dusk.erosync.on)과 저장 값(erosync_*)은 그대로라 애드온을 다시 받으면 이어서 써요. 요청 훅이 있어 업데이트는 다음 시작부터.
import { createErosync } from "../../src/data/erosync.js";
import { runAI } from "../../src/engine/runai.js";
import { parseStatus as parseStoryStatus } from "../../src/engine/storytime.js";
import { createErosyncTurn } from "../../src/data/erosyncturn.js";

export async function activate(api, ctx) {
  const ext = ctx.ext, app = ctx.app;
  if (!ext || !app) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const log = (m) => console.log(`[Dusk Atelier] ${m}`);
  const erosync = app.erosyncForTest ?? createErosync(api, { log,
    // Dusk ‘월경·임신 기록’(성인 항목)이 켜져 있으면 Erosync의 주기는 쉰다
    cycleProbe: async () => { const r = (await app.memory?.flow?.settings?.())?.rawSnapshot?.(); return r?.features?.openness?.cycle === true && r?.sexualDesireEnabled === true; },
    // AI 호출은 Dusk 모델 설정(‘자체 AI 작업’ → 없으면 리스 보조 모델)으로. Dusk 사용자 프롬프트는 끼우지 않는다.
    host: { runAI: (messages, role, signal) => runAI(api, messages, { stage: `erosync-${role}`, noUserPrompts: true }, signal),
      storyStatus: (text, prevDate) => (app.storyTime?.isOn?.() ? parseStoryStatus(text, { date: prevDate || "", time: "", place: "" }) : null) } });
  // 매 턴 계산: 장기기억 기록기가 턴을 기록하면 그 인물만 갱신(장기기억 애드온이 먼저 켜져 있어야 함 — requires memory)
  const turn = createErosyncTurn(api, { erosync, log });
  const tryAttach = () => turn.attach(app.memory?.flow);
  tryAttach();
  const off = [ext.add("svc", "erosync", erosync), ext.add("svc", "erosyncTurn", Object.assign(turn, { tryAttach })), () => turn.detach()];
  erosync.boot().catch((e) => log(`Erosync 시작 실패 ${e?.message ?? e}`));
  return { async deactivate() { off.forEach((f) => f()); await erosync.stop?.().catch?.(() => {}); } };
}
