// 위젯 애드온: 위젯 홈(음악·사진·시계·최근 대화·메모·D-day·타이머…) 화면과 그 입구(도구 탭 줄, 설정 탭 카드, 리스 메뉴 버튼).
// 켜기 설정(dusk.widgethome.on)은 코어 저장소에 그대로 남아서, 애드온을 다시 받으면 이어서 써요.
import { createWidgetHome } from "../../src/data/widgethome.js";
import { widgetHomeCard } from "./card.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const pl = ctx.app?.protlink;
  // 이미 만들어 둔 컨트롤러가 있으면 그것을 쓴다(시험에서 가짜 화면을 끼울 때). 실제 코어의 ctx.widgetHome은 이 애드온이 등록하기 전엔 null.
  const wh = ctx.app?.widgetHome ?? createWidgetHome(api, {
    log: (m) => console.log(`[Dusk Atelier] ${m}`),
    openDusk: (tab) => ctx.openDusk?.(tab && tab !== "home" ? tab : undefined),
    protLink: pl ? { links: () => pl.list(), open: () => Promise.resolve(ctx.openDusk?.("protlink")).then(() => true, () => false), on: () => pl.on(), error: () => pl.lastError() } : undefined
  });
  const card = (c) => { const el = widgetHomeCard(c, () => el.replaceWith(card(c)), wh); return el; };   // 켜고 끄면 이 카드만 다시 그림
  const off = [
    ext.add("svc", "widgethome", wh),
    ext.add("row", "tools.frequent", { id: "rb-tool-widgethome", icon: "grid", title: "위젯 홈", desc: "음악·사진·시계·메모를 한 화면에 모은 홈 열기", order: -1, when: () => wh.on(),
      onClick: (c) => c.openWidgetHome().then((ok) => { if (!ok) c.toast(wh.lastError() || "위젯 홈을 열지 못했어요", { error: true }); }) }),
    ext.add("slot", "settings.cards", card)
  ];
  wh.boot().catch((e) => console.log(`[Dusk Atelier] 위젯 홈 시작 실패 ${e?.message ?? e}`));
  return { async deactivate() { off.forEach((f) => f()); await wh.shutdown().catch(() => {}); } };
}
