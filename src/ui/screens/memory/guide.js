// 작은 ? 가이드 버튼: 누르면 그 자리를 하이라이트하며 첫 켜기 안내를 하나씩 보여 줘요(처음 둘러보기와 같은 방식). 홈 안내에서는 처음 설정을 다시 볼 수 있어요.
import { h } from "../../dom.js";
import { GUIDE } from "../../../engine/memoryguide.js";
import { runTour } from "../../tour.js";
import { openSetup } from "./setup.js";

// anchor: 눌린 ? 버튼. 그 버튼이 든 카드(없으면 버튼 자신)를 강조한다. 버튼이 사라졌으면 가운데에 뜬다.
export async function showGuide(ctx, key, { redraw, anchor } = {}) {
  const g = GUIDE[key] ?? GUIDE.home, el = anchor?.closest?.("section, .rb-card") ?? anchor ?? null;
  const steps = g.steps.map((text, i) => ({ icon: "help", title: i === 0 ? g.title : `${g.title} · ${i + 1}`, text, el }));
  let again = false;
  if (g.again && ctx.memory?.flow) steps[steps.length - 1].action = { label: "처음 설정 다시 보기", onClick: () => { again = true; } };
  await runTour(ctx, steps, { label: g.title, doneLabel: "알겠어요" });
  if (again && (await openSetup(ctx))) redraw?.();
}

export const guideBtn = (ctx, key, opts) => h("button", { type: "button", class: "rb-guideq", "aria-label": `${GUIDE[key]?.title ?? "가이드"} 보기`, title: "가이드", onClick: (e) => { e.preventDefault(); e.stopPropagation(); showGuide(ctx, key, { ...opts, anchor: e.currentTarget }); } }, "?");
