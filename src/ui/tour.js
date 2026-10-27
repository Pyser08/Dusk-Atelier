// 처음 둘러보기: 다시 설치한 사람에게만 자동으로 뜬다. 탭을 하나씩 설명하며 해당 버튼을 강조하고,
// 설명 창은 그 버튼 반대쪽으로 비켜 있다. 건너뛰기 가능, 설정·홈에서 다시 볼 수 있다.
import { h, replace } from './dom.js';
import { icon } from './icons.js';
import { btn } from './kit.js';

export var TOUR = [
  { icon: "home", title: "환영해요!", text: "Dusk Atelier는 봇과 모듈을 가져오고, 정리하고, 이어 쓰게 도와줘요. 버튼을 하나씩 짚어 드릴게요." },
  { icon: "upload", title: "가져오기는 끌어 놓기로", text: "봇·모듈 파일을 창 아무 곳에나 끌어 놓으면 바로 가져와요. 같은 봇이면 알아서 합쳐 줘요.", target: ["#rb-home-import", ".rb-home-import"] },
  { icon: "module", title: "모듈", text: "모듈을 켜고 끄고 순서를 바꿔요. 줄 어디를 잡아도 끌어서 옮길 수 있어요. 로어북·정규식 편집도 여기서 해요.", tab: "modules" },
  { icon: "character", title: "캐릭터", text: "캐릭터를 폴더로 정리하고, 에셋과 로어북을 다듬어요. 플러그인에서 만든 봇은 리스 메인 화면에도 자동으로 고정돼요.", tab: "characters" },
  { icon: "brain", title: "장기 기억", text: "스위치만 켜면 AI 응답마다 인물의 상태와 있었던 일이 기록돼요. 처음 설정하기를 누르면 3단계로 끝나요.", tab: "memory" },
  { icon: "sparkle", title: "기억 카드", text: "마음에 드는 인물은 카드로 만들어 새 봇으로 이어 갈 수 있어요.", tab: "cards" },
  { icon: "plugin", title: "플러그인", text: "설치된 플러그인을 모아 보고, 새 버전이 있는지 확인해요.", tab: "plugins" },
  { icon: "tools", title: "도구", text: "프리셋·페르소나 빌더·로어북 로그·백업 같은 도구 모음이에요.", tab: "tools" },
  { icon: "sliders", title: "설정", text: "색·글자 크기(막대)·메뉴 위치·고대비는 설정 → 화면 꾸미기에서 바꿔요. 이 둘러보기도 설정에서 다시 볼 수 있어요.", tab: "settings" },
  { icon: "help", title: "막히면 ? 버튼", text: "화면 위쪽의 ? 버튼에 그 화면 사용법이 있어요. 이제 시작해 볼까요?", target: ["#rb-help-btn"] }
];

var shown = (el) => !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;

// 이 단계에서 강조할 버튼 찾기: 지금 보이는 메뉴(왼쪽·위쪽·아래 탭) → 홈 카드 → 더보기 순
export function findTarget(win, s) {
  const cands = [];
  if (s.tab) cands.push(...win.querySelectorAll(`[data-tab="${s.tab}"]`), ...win.querySelectorAll(`#rb-home-${s.tab}`), ...(win.querySelector("#rb-more") ? [win.querySelector("#rb-more")] : []));
  for (const q of s.target ?? []) cands.push(...win.querySelectorAll(q));
  return cands.find(shown) ?? null;
}

export async function openTour(ctx) {
  const win = ctx.win, doc = win.ownerDocument;
  let i = 0, hl = null;
  await new Promise((resolve) => {
    const card = h("div", { class: "rb-tour-card", role: "dialog", "aria-label": "처음 둘러보기" });
    const clear = () => {
      hl?.classList.remove("rb-tour-hl");
      hl = null;
    };
    const finish = () => {
      clear();
      card.remove();
      doc.removeEventListener("keydown", onKey, true);
      win.removeEventListener("resize", place);
      resolve();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        finish();
      }
    };
    // 강조한 버튼과 겹치지 않게, 버튼이 있는 쪽의 반대편 아래(또는 위)로 비킨다
    const place = () => {
      const wr = win.getBoundingClientRect();
      card.style.left = card.style.right = card.style.top = card.style.bottom = "";
      card.classList.remove("center");
      if (!hl) return card.classList.add("center");
      const r = hl.getBoundingClientRect();
      const narrow = wr.width < 640;
      const cx = (r.left + r.right) / 2 - wr.left, cy = (r.top + r.bottom) / 2 - wr.top;
      if (narrow) {
        card.style.left = "12px";
        card.style.right = "12px";
        if (cy > wr.height / 2) card.style.top = "12px";
        else card.style.bottom = "12px";
        return;
      }
      if (cx > wr.width / 2) card.style.left = "24px";
      else card.style.right = "24px";
      if (cy > wr.height / 2) card.style.top = "24px";
      else card.style.bottom = "24px";
    };
    const paint = () => {
      const s = TOUR[i], last = i === TOUR.length - 1;
      clear();
      hl = findTarget(win, s);
      if (hl) {
        hl.classList.add("rb-tour-hl");
        hl.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      }
      replace(
        card,
        h("div", { class: "head" }, h("span", { class: "ico", "aria-hidden": "true" }, icon(s.icon, 22)), h("h2", null, s.title)),
        h("p", null, s.text),
        h("div", { class: "dots", "aria-label": `${i + 1} / ${TOUR.length}` }, ...TOUR.map((_, k) => h("i", { class: k === i ? "on" : "" }))),
        h(
          "div",
          { class: "acts" },
          last ? h("span") : btn("건너뛰기", { kind: "ghost", onClick: finish }),
          h("div", { class: "r" }, i > 0 ? btn("이전", { onClick: () => { i--; paint(); } }) : null, btn(last ? "시작하기" : "다음", { kind: "primary", onClick: () => (last ? finish() : (i++, paint())) }))
        )
      );
      place();
      card.querySelector("button.primary")?.focus();
    };
    doc.addEventListener("keydown", onKey, true);
    win.addEventListener("resize", place);
    win.appendChild(card);
    paint();
  });
  // 끝까지 봤든 건너뛰었든 한 번 보여 줬으면 다시 자동으로 띄우지 않는다.
  ctx.prefs.saveUi({ tourDone: true }).catch(() => {});
}

export async function maybeShowTour(ctx) {
  if (ctx.prefs.ui?.tourDone) return;
  await openTour(ctx);
}
