// 처음 둘러보기: 다시 설치한 사람에게만 자동으로 뜬다. 탭을 하나씩 설명하며 해당 버튼을 강조하고,
// 설명 창은 그 버튼 반대쪽으로 비켜 있다. 건너뛰기 가능, 설정·홈에서 다시 볼 수 있다.
import { h, replace } from './dom.js';
import { icon } from './icons.js';
import { btn } from './kit.js';

export var TOUR = [
  { icon: "home", title: "환영해요!", text: "Dusk Atelier는 봇과 모듈을 가져오고, 정리하고, 이어 쓰게 도와줘요. 버튼을 하나씩 짚어 드릴게요." },
  { icon: "upload", title: "가져오기는 끌어 놓기로", text: "봇·모듈 파일을 창 아무 곳에나 끌어 놓으면 바로 가져와요. 같은 봇이면 알아서 합쳐 줘요.", target: ["#rb-home-import", ".rb-home-import"] },
  { icon: "brain", title: "기억", text: "스위치만 켜면 AI 응답마다 인물의 상태와 있었던 일이 기록돼요. 지난 대화도 한 번에 분석할 수 있어요.", tab: "memory" },
  { icon: "book", title: "리수폿", text: "인물 위키를 자동으로 정리해요. 기억과 따로 켜고 꺼요.", tab: "pot" },
  { icon: "users", title: "인물", text: "정리된 인물을 보고 다듬어요. 직접 고친 내용은 AI가 함부로 바꾸지 않아요.", tab: "people" },
  { icon: "character", title: "캐릭터 (더보기)", text: "캐릭터를 폴더로 정리하고, 에셋과 로어북을 다듬어요. ‘AI로 만들기’로 말만 해도 봇을 만들어요.", tab: "characters" },
  { icon: "module", title: "모듈 (더보기)", text: "모듈을 켜고 끄고 순서를 바꿔요. 줄의 ‘연결’ 버튼으로 페르소나·캐릭터·지금 채팅에 이어요.", tab: "modules" },
  { icon: "sparkle", title: "기억 카드 (더보기)", text: "마음에 드는 인물은 카드로 만들어 새 봇으로 이어 갈 수 있어요.", tab: "cards" },
  { icon: "tools", title: "도구 · 플러그인 (더보기)", text: "프리셋·페르소나 빌더·로어북 로그·백업은 도구에, 설치된 플러그인의 새 버전 확인은 플러그인에 있어요.", tab: "tools" },
  { icon: "palette", title: "꾸미기 (더보기)", text: "강조 색·밝기·글자 크기를 누르면 바로 바뀌어요. 내 채팅 테마도 여기서 만들어요.", tab: "look" },
  { icon: "sliders", title: "설정 (더보기)", text: "화면 모드를 ‘간단’과 ‘고급’ 중에서 골라요. 세부 설정과 개발자 모드는 고급에서 볼 수 있어요. 이 둘러보기도 여기서 다시 봐요.", tab: "settings" },
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
  ctx.prefs.saveUi({ tourDone: true, tourVer: TOUR_VER }).catch(() => {});
}

// 둘러보기를 새로 짠 버전(1.7.0)이면 TOUR_VER를 올려 두었다: 이전 버전에서 업데이트한 사람도 한 번은 자동으로 본다.
export var TOUR_VER = 2;
export async function maybeShowTour(ctx) {
  if (ctx.prefs.ui?.tourDone && (ctx.prefs.ui?.tourVer ?? 0) >= TOUR_VER) return;
  await openTour(ctx);
}
