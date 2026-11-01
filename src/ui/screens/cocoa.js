// 사이드바 '기억' 섹션의 코코아 탭(v1.8.1): 장기 기억·기억 카드와 같은 단계. 화면 본체는 memory/skills.js.
import { h, replace } from "../dom.js";
import { renderMemorySkills } from "./memory/skills.js";
import { mountSkillChat } from "./memory/skillchat.js";

export async function renderCocoaTab(ctx) {
  const host = h("div", { class: "rb-mem2 rb-scroll rb-skills", "data-page": "skills" });
  replace(ctx.main, host);
  const redraw = () => renderCocoaTab(ctx).catch((e) => ctx.toast?.(String(e?.message ?? e)));
  await renderMemorySkills(ctx, host, { redraw, standalone: true });
  mountSkillChat(ctx, { onSaved: redraw });
}
