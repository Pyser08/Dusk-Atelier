// 1.7.0 1단계 임시 화면: 리수폿·인물 탭 자리. 새 화면은 3~4단계에서 채운다.
// 그때까지 같은 기능은 기억 화면(인물 위키·고급)에서 그대로 쓸 수 있다.
import { h, replace } from '../dom.js';
import { actionRow, advFold, pageHead, statusCard } from '../kit.js';

function interim(ctx, { title, sub, line }) {
  replace(
    ctx.main,
    h(
      "div",
      { class: "rb-interim rb-scroll" },
      pageHead(title, { sub }),
      statusCard("prep", line),
      actionRow([{ label: "기억 화면 열기", icon: "brain", onClick: () => ctx.go("memory") }]),
      advFold(ctx, ctx.state.tab)
    )
  );
}
export var renderPot = (ctx) => interim(ctx, { title: "리수폿", sub: "기억과 별도로 켜고 꺼요", line: "이 화면은 곧 새로 바뀌어요. 지금은 기억 화면에서 같은 기능을 써요." });
export var renderPeople = (ctx) => interim(ctx, { title: "인물", sub: "위키의 인물 문서를 보고 다듬어요", line: "이 화면은 곧 새로 바뀌어요. 지금은 기억 화면에서 인물을 봐요." });
