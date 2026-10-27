// 첫 실행 둘러보기: 다섯 장짜리 짧은 안내. 건너뛰기 가능, 설정·홈에서 다시 볼 수 있다.
import { h, replace } from './dom.js';
import { icon } from './icons.js';
import { btn, modal } from './kit.js';

export var TOUR = [
  { icon: "home", title: "환영해요!", text: "Dusk Atelier는 봇과 모듈을 가져오고, 정리하고, 이어 쓰게 도와줘요. 어렵지 않아요. 30초만 둘러봐요." },
  { icon: "upload", title: "가져오기는 끌어 놓기로", text: "봇·모듈 파일을 창 아무 곳에나 끌어 놓으면 바로 가져와요. 같은 봇이면 알아서 합쳐 줘요." },
  { icon: "module", title: "켜고 끄고 순서 바꾸기", text: "모듈·캐릭터는 줄 어디를 잡아도 끌어서 옮길 수 있고, 오른쪽 스위치로 켜고 꺼요." },
  { icon: "brain", title: "대화가 기억이 돼요", text: "장기 기억이 AI 응답마다 인물의 행동을 자동으로 기록해요. 마음에 드는 인물은 카드로 만들어 새 봇으로 이어 갈 수 있어요." },
  { icon: "help", title: "막히면 ? 버튼", text: "화면 위쪽의 ? 버튼에 그 화면 사용법이 있어요. 이 둘러보기는 설정 → 처음 둘러보기에서 다시 볼 수 있어요." }
];

export async function openTour(ctx) {
  let i = 0;
  await modal(ctx.win, (done) => {
    const box = h("div", { class: "rb-dialog rb-tour", role: "dialog", "aria-label": "처음 둘러보기" });
    const paint = () => {
      const s = TOUR[i], last = i === TOUR.length - 1;
      replace(
        box,
        h("span", { class: "ico", "aria-hidden": "true" }, icon(s.icon, 32)),
        h("h2", null, s.title),
        h("p", null, s.text),
        h("div", { class: "dots", "aria-label": `${i + 1} / ${TOUR.length}` }, ...TOUR.map((_, k) => h("i", { class: k === i ? "on" : "" }))),
        h(
          "div",
          { class: "acts" },
          last ? h("span") : btn("건너뛰기", { kind: "ghost", onClick: () => done(true) }),
          h("div", { class: "r" }, i > 0 ? btn("이전", { onClick: () => { i--; paint(); } }) : null, btn(last ? "시작하기" : "다음", { kind: "primary", onClick: () => (last ? done(true) : (i++, paint())) }))
        )
      );
      box.querySelector("button.primary")?.focus();
    };
    paint();
    return box;
  });
  // 끝까지 봤든 건너뛰었든 한 번 보여 줬으면 다시 자동으로 띄우지 않는다.
  ctx.prefs.saveUi({ tourDone: true }).catch(() => {});
}

export async function maybeShowTour(ctx) {
  if (ctx.prefs.ui?.tourDone) return;
  await openTour(ctx);
}
