// 기억 탭 맨 위의 작은 탭 줄: 기억 | 스킬 (v1.8.1). 스킬은 기억 탭 안의 별도 탭이다.
import { h } from "../../dom.js";
import { chip } from "../../kit.js";
import { mem } from "./common.js";

export const MEM_TABS = [["home", "기억"], ["skills", "스킬"]];
// 기억 홈·스킬·채팅 목록 화면에서만 보인다(인물 위키 같은 깊은 화면에서는 숨김).
export const showsMemTabs = (page) => page === "home" || page === "skills" || page === "bots";
export function memoryTabs(ctx, page, redraw) {
  const m = mem(ctx), cur = page === "skills" ? "skills" : "home";
  return h("nav", { class: "rb-chips rb-mem-tabsrow", "aria-label": "기억 탭", "data-tour": "mem-tabs", style: "padding:0 0 10px" },
    MEM_TABS.map(([id, label]) => chip(label, { pressed: id === cur, onClick: () => { if (id === cur) return; m.page = id; redraw(); } })));
}
