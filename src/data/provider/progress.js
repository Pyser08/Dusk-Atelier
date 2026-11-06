// 프로바이더 진행 창(리스 화면, 2.0.0). 상태는 engine/provider/board.js가 갖고, 여기는 그리기만 한다.
// Provider Manager에서 제보된 두 문제를 구조로 막는다:
//  1) 동시 요청 덮어쓰기·조기 숨김 → 요청별 카드(board), 창은 남은 카드가 없을 때만 숨김
//  2) 창 생성 경쟁(두 개 생김) → 만드는 중인 Promise를 저장해 동시 호출이 같이 기다림, 실패하면 비워서 다음에 다시
// 꺼 두면(enabled=false) 창만 치우고 상태·타이머는 그대로 → 다시 켜면 진행 중인 요청이 그대로 보인다.
import { boardHtml } from "../../engine/provider/board.js";

const BOX = "position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(320px,calc(100vw - 32px));max-height:50vh;overflow:auto;display:grid;gap:6px;padding:10px;border-radius:14px;background:rgba(24,22,40,.94);color:#ece9ff;font:12px/1.45 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35)";

export function createProgressWindow({ getDoc, board, enabled = () => true, timers = globalThis, now = () => Date.now(), log = () => {} }) {
  let box = null, list = null, creating = null, sweepTimer = null, tickTimer = null, drawing = Promise.resolve();
  async function ensure() {
    if (box) return box;
    if (creating) return creating;   // 동시에 불려도 창은 하나
    creating = (async () => {
      const doc = await getDoc(); if (!doc) throw new Error("리스 화면에 닿지 못했어요");
      const body = await doc.querySelector("body"); if (!body) throw new Error("body가 없어요");
      const [b, head, l] = await Promise.all([doc.createElement("div"), doc.createElement("div"), doc.createElement("div")]);
      await Promise.all([b.setAttribute("x-dusk", "provider-progress"), b.setStyleAttribute(BOX), head.setStyleAttribute("font-weight:700;font-size:12px;opacity:.8"), head.setInnerText("Dusk 프로바이더"), l.setStyleAttribute("display:grid;gap:6px")]);
      await b.appendChild(head); await b.appendChild(l); await body.appendChild(b);
      box = b; list = l; return b;
    })();
    try { return await creating; } catch (e) { box = null; list = null; throw e; } finally { creating = null; }
  }
  async function removeBox() {
    const b = box; box = null; list = null;
    if (b) { try { await b.remove(); } catch { /* 이미 없음 */ } }
  }
  // 그리기는 차례로(겹치면 늦은 것이 이김)
  function draw() {
    drawing = drawing.then(async () => {
      try {
        if (!enabled() || !board.visible()) { await removeBox(); return; }
        await ensure();
        await list?.setInnerHTML(boardHtml(board.list(), now()));
      } catch (e) { log(`진행 창 그리기 실패 ${e?.message ?? e}`); }
    });
    return drawing;
  }
  function schedule() {
    // 끝난 카드 정리: 화면과 상관없이 다음 만료 시각에 한 번
    if (sweepTimer) { timers.clearTimeout(sweepTimer); sweepTimer = null; }
    const ms = board.nextSweepIn();
    if (ms != null) sweepTimer = timers.setTimeout(() => { sweepTimer = null; board.sweep(); }, ms + 20);
    // 진행 중 요청이 있으면 1초마다 경과 시간 갱신
    if (board.active() && !tickTimer) tickTimer = timers.setInterval(() => { if (!board.active()) { timers.clearInterval(tickTimer); tickTimer = null; } draw(); }, 1000);
  }
  const unsub = board.subscribe(() => { schedule(); draw(); });
  return {
    refresh: draw,   // 설정을 바꾼 뒤(켜기·끄기) 부른다
    async stop() { unsub(); if (sweepTimer) timers.clearTimeout(sweepTimer); if (tickTimer) timers.clearInterval(tickTimer); sweepTimer = tickTimer = null; await drawing; await removeBox(); },
    _state: () => ({ box, creating })
  };
}
