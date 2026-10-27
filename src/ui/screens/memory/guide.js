// 작은 ? 가이드 버튼: 누르면 그 자리에 맞는 첫 켜기 안내가 떠요. 홈 안내에서는 처음 설정을 다시 볼 수 있어요.
import { h } from "../../dom.js";
import { btn, modal } from "../../kit.js";
import { GUIDE, GUIDE_ORDER } from "../../../engine/memoryguide.js";
import { openSetup } from "./setup.js";

export async function showGuide(ctx, key, { redraw } = {}) {
  const g = GUIDE[key] ?? GUIDE.home;
  const r = await modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-gd", role: "dialog", "aria-modal": "true", "aria-label": g.title },
    h("h3", { class: "rb-h3" }, g.title),
    h("ol", { class: "rb-gd-list" }, g.steps.map((t, i) => h("li", null, h("i", { "aria-hidden": "true" }, String(i + 1)), h("span", null, t)))),
    h("div", { class: "rb-gd-more" }, GUIDE_ORDER.filter((k) => k !== key).map((k) => btn(GUIDE[k].title.replace(/,.*| 보는 법/, ""), { size: "sm", onClick: () => done({ next: k }) }))),
    h("div", { class: "btns" }, g.again && ctx.memory?.flow ? btn("처음 설정 다시 보기", { icon: "sliders", onClick: () => done({ setup: true }) }) : null, btn("알겠어요", { kind: "primary", onClick: () => done(null) }))));
  if (r?.next) return showGuide(ctx, r.next, { redraw });
  if (r?.setup && (await openSetup(ctx))) redraw?.();
}

export const guideBtn = (ctx, key, opts) => h("button", { type: "button", class: "rb-guideq", "aria-label": `${GUIDE[key]?.title ?? "가이드"} 보기`, title: "가이드", onClick: (e) => { e.preventDefault(); e.stopPropagation(); showGuide(ctx, key, opts); } }, "?");
