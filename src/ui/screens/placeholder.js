import { h, replace } from '../dom.js';
import { icon } from '../icons.js';

var PLAN = {
  characters: ["캐릭터", "캐릭터 업데이트·새로 넣기 화면이 들어올 자리예요. (5단계)", '지금은 도구 탭의 "업데이트 가져오기"에서 캐릭터 파일을 넣을 수 있어요.'],
  presets: ["프리셋", "모듈 켜기/끄기 묶음과 디바이스 페어가 들어올 자리예요. (1단계)", ""],
  history: ["기록", "버전 타임라인이 들어올 자리예요. (5단계)", '지금은 도구 탭의 "백업·되돌리기"에서 업데이트 전 상태로 되돌릴 수 있어요.']
};
export function renderPlaceholder(ctx) {
  const [title, what, now] = PLAN[ctx.state.tab] ?? ["준비 중", "", ""];
  const t = ctx.tabs.find((x) => x.id === ctx.state.tab);
  replace(ctx.main, h(
    "div",
    { class: "rb-empty", style: "margin:auto;max-width:420px" },
    h("div", { style: "color:var(--rb-acc-text);display:flex;justify-content:center;margin-bottom:12px" }, icon(t?.icon ?? "info", 32)),
    h("h2", { class: "rb-h2", style: "color:var(--rb-text);margin-bottom:6px" }, title),
    h("p", { class: "rb-p" }, what),
    now ? h("p", { class: "rb-muted", style: "margin-top:8px" }, now) : null
  ));
}
