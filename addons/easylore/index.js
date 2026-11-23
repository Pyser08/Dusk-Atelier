// 폴더 관리/쉬운 로어북 애드온 (id easylore)
//   책장 화면(shelf.js): 폴더 = 책장, 봇 = 책. 끌어서 꽂기, 책을 펼치면 쉬운 로어북(이름 겹침 막기).
//   데이터(store.js): 봇 요약 캐시로 바로 열고, 바뀐 봇만 다시 훑는다.
// 로어북: 겹치는 항목에만 Dusk 규칙(이름 경계·흔한 이름 확인 단어)을 붙이고 판정은 코어 로어북 규칙 엔진이 한다.
//   원본은 항목 안(extentions.da_easy.orig)에 남아 '되돌리기'로 그대로 돌아간다.
// 폴더: DB characterOrder(리스·리스바드 모두 플러그인에 열림). 리스바드 '고정한 캐릭터'(characterVault)는 플러그인 허용 키가 아니라 아직 못 다룬다.
import { createShelfStore } from "./store.js";
import { renderShelf } from "./shelf.js";
import { TABS } from "../../src/ui/tabs.js";

export async function activate(api, ctx) {
  const dusk = ctx.dusk;
  const log = (...a) => console.log("[Dusk 폴더 관리/쉬운 로어북]", ...a);
  const store = createShelfStore(api, dusk, { log, ext: ctx.ext ?? ctx.app?.ext });
  let stop = null;
  const page = (el) => { stop?.(); stop = renderShelf(el, { dusk, store, assets: ctx.app?.assets, app: ctx.app, log }); };
  // 관리 탭(플러그인과 ProtLink+ 사이)에 자리가 있는 코어(2.2.43+)면 그 탭으로, 아니면 애드온 화면으로
  const coreHasTab = TABS.some((t) => t.id === "easylore");   // tabs.js는 코어가 넘겨 주는 모듈 → 옛 코어면 자리가 없다
  const ext = ctx.ext ?? ctx.app?.ext;
  let offTab = null;
  if (coreHasTab && ext?.add) {
    const offSvc = ext.add("svc", "easylore", store);   // 관리 탭 목록은 이 서비스가 있을 때만 이 탭을 보인다
    const offT = ext.add("tab", "easylore", (c) => {
      if (!c?.main) return;
      const host = dusk.ui.h("div", { class: "rb-section rb-scroll rb-addon-page", style: "flex:1;min-height:0" });
      dusk.ui.replace(c.main, host);
      page(host);
    });
    offTab = () => { offT?.(); offSvc?.(); };
  } else dusk.addPage({ title: "폴더 관리/쉬운 로어북", render: page });
  return { deactivate() { stop?.(); try { offTab?.(); } catch { /* 이미 떼어짐 */ } } };
}
