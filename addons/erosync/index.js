// Erosync 애드온 — 2.2.9부터 사용 중단. 인물 성향·성적 항목·장면 연출은 장기기억 애드온(성인 프로필·장면 연출)이 맡는다.
// 이 판은 엔진을 켜지 않는다(요청에 장면 계획을 넣지 않음 → 장기기억 쪽과 겹쳐 두 번 들어가던 문제를 막는다). 저장 값(erosync_*)은 지우지 않는다.
// 한 번만 안내하고, 애드온 화면에서 꺼도 된다고 알린다.
const NOTICE_KEY = "dusk.erosync.retiredNotice";

export async function activate(api, ctx) {
  const log = (m) => console.log(`[Dusk Atelier] ${m}`);
  log("Erosync는 사용 중단됐어요 — 장기기억 애드온의 성인 프로필·장면 연출을 써요(이 애드온은 아무것도 하지 않아요).");
  try {
    if (!(await api.pluginStorage.getItem(NOTICE_KEY))) {
      await api.pluginStorage.setItem(NOTICE_KEY, "1");
      ctx?.toast?.("Erosync는 장기기억 애드온으로 옮겨졌어요. 이제 이 애드온은 꺼도 돼요.", { kind: "info" });
    }
  } catch { /* 안내는 못 해도 괜찮다 */ }
  return { async deactivate() {} };
}
