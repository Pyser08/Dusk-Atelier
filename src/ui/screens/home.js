// 홈: "무엇을 하고 싶으세요?" 큰 카드 그리드. 처음 쓰는 사람이 첫 행동을 바로 고르게.
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { TABS } from '../tabs.js';
import { CHANGELOG, openChangelog } from '../whatsnew.js';
import { openTour } from '../tour.js';

export function renderHome(ctx) {
  const card = (cls, ic, title, text, onClick, id) => h(
    "button",
    { type: "button", class: ["rb-hcard", cls], onClick, id },
    h("span", { class: "ico" }, icon(ic, cls === "mini" ? 20 : 24)),
    h("span", { class: "t" }, h("b", null, title), h("small", null, text))
  );
  const tab = (t, cls = "") => card(cls, t.icon, t.label, t.card, () => ctx.go(t.id), `rb-home-${t.id}`);
  const by = (id) => TABS.find((t) => t.id === id);
  const dev = !!ctx.prefs.ui?.devMode;
  const more = TABS.filter((t) => t.group === "more" && (!t.dev || dev));
  replace(
    ctx.main,
    h(
      "div",
      { class: "rb-home rb-scroll" },
      h("div", { class: "rb-home-hero" }, h("h1", null, "무엇을 하고 싶으세요?"), h("p", null, "하고 싶은 일을 골라 눌러 보세요. 파일을 창 아무 곳에나 끌어다 놓아도 바로 가져와요.")),
      h(
        "section",
        { class: "rb-home-sec", "aria-label": "시작하기" },
        h(
          "div",
          { class: "rb-home-grid" },
          card("main", "upload", "가져오기", "봇·모듈 파일을 골라 가져오고, 같은 봇이면 알아서 합쳐요.", () => ctx.legacy.open(), "rb-home-import"),
          tab(by("memory")),
          tab(by("pot")),
          tab(by("people"))
        )
      ),
      h(
        "section",
        { class: "rb-home-sec", "aria-label": "더 많은 기능" },
        h("h2", null, "더 많은 기능"),
        h(
          "div",
          { class: "rb-home-grid sm" },
          ...more.map((t) => tab(t, "mini"))
        )
      ),
      h(
        "div",
        { class: "rb-home-foot" },
        h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => openChangelog(ctx, CHANGELOG.slice(0, 4), "변경 기록") }, icon("history", 14), `v${ctx.version} · 새로 바뀐 점`),
        h("button", { type: "button", class: "rb-btn ghost sm", onClick: () => openTour(ctx) }, icon("help", 14), "처음 둘러보기"), h("span", null, "단축키: / 로 검색, Esc 로 닫기")
      )
    )
  );
}
