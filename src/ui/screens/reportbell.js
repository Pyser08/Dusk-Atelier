// 내 신고 알림 종(2.2.53): 보낸 신고가 있을 때만 위쪽에 보인다. 상태나 답장이 바뀌면 점이 붙고, 누르면 내 신고 목록을 보여 준다.
// 서버에는 하루 한 번(시작 30초 뒤)과 종을 누를 때만 묻는다. 키로 상태만 보고 신고 내용은 받지 않는다.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { btn, modal, note } from '../kit.js';
import { REPORT_STATUS } from '../../data/hub.js';

const TONE = { new: "", seen: "", doing: "warn", done: "ok", dup: "" };
const when = (t) => { try { return new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }); } catch { return ""; } };

export function reportBell(ctx) {
  const dot = h("span", { class: "rb-bell-dot", hidden: true });
  const b = h("button", { type: "button", class: "rb-icon-btn rb-bell", id: "rb-bell", "aria-label": "내 신고 알림", title: "내 신고 알림", hidden: true, onClick: () => openReports(ctx) }, icon("bell", 18), dot);
  const hub = ctx.hub;
  if (!hub?.myReports) return b;
  const paint = async () => {
    try {
      const { list, unseen } = await hub.myReports();
      b.hidden = !list.length; dot.hidden = !unseen;
      { const t = unseen ? "내 신고 알림 · 새 소식 있음" : "내 신고 알림"; b.title = t; b.setAttribute("aria-label", t); }
    } catch { /* 저장소를 못 읽으면 숨긴 채로 */ }
  };
  hub.onReports?.(paint);
  paint();
  setTimeout(() => { hub.checkReports?.().then(paint, () => {}); }, 30e3);
  return b;
}

export async function openReports(ctx) {
  const hub = ctx.hub;
  return modal(ctx.win, (done) => {
    const box = h("div", { class: "rb-bell-list" }, note("info", "상태를 확인하는 중이에요…"));
    const draw = ({ list }) => box.replaceChildren(...(list.length ? list.map((r) => h("div", { class: ["rb-bell-item", r.unseen && "new"] },
      h("div", { class: "rb-bell-row" },
        h("b", null, `#${r.no}`),
        h("span", { class: ["rb-chip", TONE[r.status] && `tone-${TONE[r.status]}`] }, REPORT_STATUS[r.status] ?? "확인 못 함"),
        r.unseen ? h("span", { class: "rb-bell-new" }, "새 소식") : null,
        h("span", { class: "rb-muted", style: "margin-left:auto;font-size:12px" }, when(r.at))),
      r.title ? h("div", { class: "rb-muted rb-bell-title" }, r.title) : null,
      r.reply ? h("div", { class: "rb-bell-reply" }, "개발자 답장: ", r.reply) : null))
      : [note("info", "보낸 신고가 없어요.")]));
    hub.checkReports({ force: true }).then(async (res) => { draw(res); await hub.markSeen(); }, async () => draw(await hub.myReports()));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-label": "내 신고", style: "max-width:520px;display:flex;flex-direction:column;gap:10px" },
      h("h3", { class: "rb-h3" }, "내 신고"),
      h("p", { class: "rb-muted", style: "margin:0" }, "이 기기에서 보낸 신고의 처리 상태와 개발자 답장이에요."),
      box,
      h("div", { class: "btns" }, btn("닫기", { onClick: () => done(null) })));
  });
}
