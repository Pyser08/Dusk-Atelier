// 2.2.4 실패 기록 창: 실패한 것만 최근 순으로. 항목마다 사용자용(무엇·이유·해 볼 일)과 제보용(접어 둠, 오류 원문·버전·환경)으로 나누고 각각 복사.
import { h, copyText } from "../../dom.js";
import { btn, modal, note } from "../../kit.js";
import { userText, reportText, eventText } from "../../../data/memlog.js";

// 스타일은 애드온 안에 둔다(코어를 다시 받지 않아도 되게)
const CSS = `.rb-mem-failbtn{display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;text-align:left;cursor:pointer;font:inherit;color:inherit;min-height:52px}
.rb-mem-failbtn .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rb-mem-failbtn .t small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-mem-failn{flex:none;min-width:24px;height:24px;padding:0 8px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:var(--rb-warn-soft);color:var(--rb-warn)}
.rb-mem-failbtn .go{flex:none;color:var(--rb-mute)}
.rb-flog-list{display:flex;flex-direction:column;gap:10px}
.rb-flog-item{border:1px solid var(--rb-line);border-radius:14px;padding:12px 14px;background:var(--rb-surf2);display:flex;flex-direction:column;gap:6px}
.rb-flog-item.is-focus{border-color:var(--rb-warn);box-shadow:0 0 0 2px var(--rb-warn-soft)}
.rb-flog-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rb-flog-head b{font-size:14px}
.rb-flog-head small{margin-left:auto}
.rb-flog-area{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--rb-line2);color:var(--rb-sub)}
.rb-flog-count{font-size:11.5px;font-weight:700;color:var(--rb-warn)}
.rb-flog-why,.rb-flog-fb,.rb-flog-todo{margin:0;font-size:13px;line-height:1.55;word-break:keep-all}
.rb-flog-fb,.rb-flog-todo{color:var(--rb-sub)}
.rb-flog-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.rb-flog-rep summary{cursor:pointer;font-size:12.5px;color:var(--rb-mute)}
.rb-flog-pre{margin:6px 0;padding:10px;border-radius:10px;background:var(--rb-surf);border:1px solid var(--rb-line);font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:240px;overflow:auto;user-select:text}`;
export function ensureFailLogStyle() { try { if (!document.getElementById("rb-flog-style")) document.head.appendChild(h("style", { id: "rb-flog-style" }, CSS)); } catch { /* 문서 없음 */ } }
const when = (t) => { try { const d = new Date(t), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
export const envInfo = (ctx) => ({ version: ctx.version ?? globalThis.__duskVersion ?? "", 기기: (() => { try { return String(navigator.userAgent).slice(0, 160); } catch { return ""; } })(), 화면: (() => { try { return `${innerWidth}×${innerHeight}`; } catch { return ""; } })() });

export async function openFailLog(ctx, { focus = null } = {}) {
  ensureFailLogStyle();
  const L = ctx.memory?.failLog; if (!L) return ctx.toast("장기 기억 애드온이 켜져 있어야 볼 수 있어요.", { error: true });
  let items = await L.list();
  const body = h("div", { class: "rb-flog-list", role: "list" });
  const copy = async (text, label) => { const ok = await copyText(text).then(() => true, () => false); ctx.toast(ok ? `${label}을(를) 복사했어요` : "복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요.", ok ? undefined : { error: true }); };
  const card = (e) => {
    const rep = reportText(e, envInfo(ctx));
    const open = e.id === focus;
    return h("article", { class: ["rb-flog-item", open && "is-focus"], role: "listitem", dataset: { id: e.id } },
      h("div", { class: "rb-flog-head" }, h("span", { class: "rb-flog-area" }, e.area), h("b", null, e.title), e.count > 1 ? h("span", { class: "rb-flog-count" }, `${e.count}번`) : null, h("small", { class: "rb-muted" }, when(e.at))),
      h("p", { class: "rb-flog-why" }, e.why),
      e.fallback ? h("p", { class: "rb-flog-fb" }, `대신: ${e.fallback}`) : null,
      h("p", { class: "rb-flog-todo" }, `해 볼 일: ${e.todo}`),
      h("div", { class: "rb-flog-acts" }, btn("내용 복사", { size: "sm", onClick: () => copy(userText(e), "내용") })),
      h("details", { class: "rb-flog-rep", ...(open ? { open: true } : {}) }, h("summary", null, "제보용 자세히"),
        h("pre", { class: "rb-flog-pre" }, rep),
        h("div", { class: "rb-flog-acts" }, btn("제보용 복사", { size: "sm", kind: "primary", onClick: () => copy(rep, "제보용 내용") }))));
  };
  const paint = () => body.replaceChildren(...(items.length ? items.map(card) : [h("p", { class: "rb-muted", style: "padding:14px 4px" }, "실패한 기록이 없어요.")]));
  paint();
  const result = modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-flog", role: "dialog", "aria-modal": "true", "aria-label": "실패 기록", style: "width:min(640px,94vw);max-height:86vh;display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, "실패 기록"),
    note("info", "장기 기억·인물 위키·원문 회상·Jev·분기 이어받기에서 실패한 것만 최근 200개까지 모았어요. 이 기기에만 저장되고, 키 같은 값은 가려요. 제보할 땐 ‘제보용 자세히’를 열어 복사해 주세요(대화 이름이 들어갈 수 있어요)."),
    h("div", { style: "overflow:auto;min-height:0;flex:1" }, body),
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      items.length ? btn("전체 제보용 복사", { size: "sm", onClick: () => copy(items.slice(0, 30).map((e) => reportText(e, envInfo(ctx))).join("\n\n----\n\n"), "전체 제보용 내용") }) : null,
      items.length ? btn("모두 지우기", { size: "sm", onClick: async () => { await L.clear(); items = []; paint(); } }) : null,
      btn("닫기", { kind: "primary", onClick: () => done(true) }))));
  if (focus) setTimeout(() => { try { body.querySelector(`[data-id="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: "start" }); } catch { /* 옛 브라우저 */ } }, 60);
  return result;
}

// addon-rebuild 전체 기록 창(디버깅용): 성공·실패·건너뜀 모두 최근 순으로, 종류로 거르기·전체 복사
export async function openEventLog(ctx) {
  ensureFailLogStyle();
  const L = ctx.memory?.eventLog; if (!L) return ctx.toast("장기 기억 애드온이 켜져 있어야 볼 수 있어요.", { error: true });
  let items = await L.list(), only = "";
  const KIND = { ok: "성공", fail: "실패", skip: "건너뜀", info: "정보" };
  const body = h("div", { class: "rb-flog-list", role: "list" });
  const shown = () => only ? items.filter((e) => e.kind === only) : items;
  const card = (e) => h("article", { class: "rb-flog-item", role: "listitem" },
    h("div", { class: "rb-flog-head" }, h("span", { class: "rb-flog-area" }, e.area), h("b", null, e.title), h("span", { class: e.kind === "fail" ? "rb-flog-count" : "rb-muted" }, KIND[e.kind] ?? e.kind), h("small", { class: "rb-muted" }, when(e.at))),
    e.detail ? h("pre", { class: "rb-flog-pre" }, e.detail) : null);
  const paint = () => { const l = shown(); body.replaceChildren(...(l.length ? l.map(card) : [h("p", { class: "rb-muted", style: "padding:14px 4px" }, "기록이 없어요.")])); };
  paint();
  const filt = h("div", { class: "rb-mem-edrow", style: "flex-wrap:wrap;gap:6px" }, ...[["", "전체"], ["ok", "성공"], ["fail", "실패"], ["skip", "건너뜀"]].map(([k, t]) => btn(t, { size: "sm", onClick: () => { only = k; paint(); } })));
  const copy = async () => { const ok = await copyText(shown().map(eventText).join("\n\n")).then(() => true, () => false); ctx.toast(ok ? "전체 기록을 복사했어요" : "복사하지 못했어요.", ok ? undefined : { error: true }); };
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-flog", id: "rb-elog", role: "dialog", "aria-modal": "true", "aria-label": "전체 기록", style: "width:min(640px,94vw);max-height:86vh;display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, "전체 기록"),
    note("info", "장기 기억 기록·인물 위키·기억 넣기·Erosync 출발값의 성공과 실패를 최근 300개까지 모았어요(디버깅용). 이 기기에만 저장되고 키 같은 값은 가려요."),
    filt, h("div", { style: "overflow:auto;min-height:0;flex:1" }, body),
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      items.length ? btn("복사", { size: "sm", onClick: copy }) : null,
      items.length ? btn("모두 지우기", { size: "sm", onClick: async () => { await L.clear(); items = []; paint(); } }) : null,
      btn("닫기", { kind: "primary", onClick: () => done(true) }))));
}
