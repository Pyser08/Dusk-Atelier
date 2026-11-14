// 2.2.0 고급 세부 설정 보기 정리(모양만): 긴 칸 목록을 주제 3묶음으로 나누고, 칸마다 접힌 한 줄(제목 + 무엇을 바꾸는지)로 보인다.
// 칸 내용·설정 코드는 그대로 옮겨 담기만 한다. 칸이 늦게 붙어도(세부 설정 지연 읽기) 다시 정리한다.
import { h } from "../../dom.js";
import { icon } from "../../icons.js";

const CATS = [
  ["rec", "기록 · 분석", "sparkle", ["분석", "정규식 전처리"]],
  ["inj", "대화에 넣기", "message", ["대화에 넣기", "기억 넣기", "주입 로어 편집", "임베딩(의미 검색)"]],
  ["store", "저장소 · 가져오기", "folder", ["기억 저장소", "HypaPlus에서 가져오기"]],
];
const HINT = {
  "저장·기록": "언제 기록할지 · 분석 모델 · 기다리는 시간", "분석": "분석 모델 · 자동 기록 시점 · 기록 방식 · 단계별 설정", "정규식 전처리": "분석 전에 글을 다듬는 규칙",
  "대화에 넣기": "기억·장부·인물 관점을 넣을지", "기억 넣기": "넣는 양과 방식", "주입 로어 편집": "대화에 들어가는 기억을 줄 단위로 고치기",
  "임베딩(의미 검색)": "뜻이 비슷한 기억 찾기", "기억 저장소": "플러그인 · BardWiki · 끔", "HypaPlus에서 가져오기": "HypaPlus 기억 옮겨 오기",
};
const titleOf = (el) => {
  const h3 = el.querySelector(":scope > h3, :scope > summary");
  const t = h3?.childNodes?.[0]?.textContent ?? h3?.textContent ?? "";
  return t.trim();
};

export function organizeAdv(body) {
  let busy = false;
  const run = () => {
    if (busy) return; busy = true;
    try {
      const items = [...body.querySelectorAll(".rb-mem-sec, .rb-mem-lore")].filter((s) => !s.closest(".rb-mem-sub") && !s.parentElement?.closest(".rb-mem-sec"));
      if (!items.length) return;
      let cats = body.querySelector(":scope > .rb-mem-cats");
      if (!cats) {
        cats = h("div", { class: "rb-mem-cats" }, ...CATS.map(([id, name, ic]) => h("section", { class: `rb-mem-cat c-${id}`, dataset: { cat: id } },
          h("h4", null, h("span", { class: "ci", "aria-hidden": "true" }, icon(ic, 14)), name), h("div", { class: "rb-mem-catlist" }))),
          h("section", { class: "rb-mem-cat c-etc", dataset: { cat: "etc" }, hidden: true }, h("h4", null, "기타"), h("div", { class: "rb-mem-catlist" })));
        body.prepend(cats);
      }
      for (const s of items) {
        const t = titleOf(s), cat = CATS.find((c) => c[3].includes(t))?.[0] ?? "etc";
        const list = cats.querySelector(`[data-cat=${cat}] .rb-mem-catlist`);
        cats.querySelector(`[data-cat=${cat}]`).hidden = false;
        if (s.classList.contains("rb-mem-lore")) { s.classList.add("rb-mem-sub", "is-lore"); list.append(s); continue; }   // 로어 편집은 원래 접는 칸
        const chip = s.querySelector(":scope > h3 .rb-chip, :scope > h3 span:not(:first-child)");
        const d = h("details", { class: "rb-mem-sub" },
          h("summary", null, h("span", { class: "t" }, h("b", null, t || "설정"), h("small", null, HINT[t] ?? "")), chip ? chip.cloneNode(true) : null, h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 14))),
          s);
        list.append(d);
      }
      // 순서를 표에 맞춘다
      for (const [id, , , order] of CATS) {
        const list = cats.querySelector(`[data-cat=${id}] .rb-mem-catlist`);
        [...list.children].sort((a, b) => order.indexOf(titleOf(a.querySelector(".rb-mem-sec") ?? a) || titleOf(a)) - order.indexOf(titleOf(b.querySelector(".rb-mem-sec") ?? b) || titleOf(b))).forEach((e) => list.append(e));
      }
      for (const w of [...body.querySelectorAll(".rb-mem-advbody")]) if (!w.children.length) w.remove();
    } finally { busy = false; }
  };
  run();
  new MutationObserver(() => queueMicrotask(run)).observe(body, { childList: true, subtree: true });
}
