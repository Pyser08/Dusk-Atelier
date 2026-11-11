// '생성 중지' 버튼 (2.1.0): AI 호출(engine/aistop.js)이 하나라도 돌면 화면 오른쪽 아래에 뜬다.
// Dusk 창이 열려 있으면 창 안에, 닫혀 있으면(기억 자동 기록처럼 뒤에서 돌 때) 리스 화면에 띄운다.
// 리스 화면 쪽은 retrytoast.js와 같은 방식(mainDom 권한, 없으면 띄우지 않음).
import { onAiChange, activeCount, activeTasks, stopAll } from "../engine/aistop.js";

var ATTR = "x-dusk-ai-stop";
var STYLE = "position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,calc(env(safe-area-inset-bottom) + 16px));z-index:2147483000;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px 0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(28,28,34,.94);color:#fff;font:700 13px/1 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer;";
var SQ = "display:inline-block;width:10px;height:10px;border-radius:2px;background:#ff6b6b;";
var TXT = "max-width:min(56vw,280px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
var SUB = "font-weight:500;opacity:.75;";
// 버튼 글자: '생성 중지 · 장기기억 기록 외 1' — 무슨 작업이 도는지 보여 준다(전체 목록은 title)
export function stopText(list = activeTasks()) {
  if (!list.length) return { main: "생성 중지", sub: "", all: "" };
  return { main: "생성 중지", sub: list[0] + (list.length > 1 ? ` 외 ${list.length - 1}` : ""), all: list.join(", ") };
}

export function createAiStopButton(api, { getCtx = () => null, delayMs = 400, doc = globalThis.document, scheduler = globalThis } = {}) {
  let inWin = null, host = null, hostBusy = false, denied = false, timer = null, poll = null;
  const windowOpen = () => { const r = getCtx()?.root; return !!r && !r.hidden; };
  const onStop = () => {
    const n = stopAll();
    try { getCtx()?.toast?.(n ? "생성을 중지했어요" : "멈출 AI 작업이 없어요"); } catch { /* 알림 없이 */ }
    sync();
  };
  const showWin = () => {
    if (!doc?.body) return;
    if (!inWin) {
      inWin = doc.createElement("button");
      inWin.type = "button";
      inWin.className = "rb-ai-stop";
      inWin.setAttribute("aria-label", "AI 생성 중지");
      inWin.style.cssText = STYLE;
      inWin.addEventListener("click", onStop);
    }
    const t = stopText();
    const sq = doc.createElement("span"); sq.style.cssText = SQ;
    const tx = doc.createElement("span"); tx.className = "rb-ai-stop-text"; tx.style.cssText = TXT;
    tx.append(t.main);
    if (t.sub) { const sub = doc.createElement("span"); sub.className = "rb-ai-stop-task"; sub.style.cssText = SUB; sub.textContent = ` · ${t.sub}`; tx.append(sub); }
    inWin.replaceChildren(sq, tx);
    inWin.title = t.all ? `지금 하는 작업: ${t.all}\n누르면 이 작업과 뒤에 대기 중인 AI 호출을 모두 멈춰요` : "";
    if (!inWin.isConnected) doc.body.appendChild(inWin);
  };
  const hideWin = () => { inWin?.remove(); };
  const showHost = async () => {
    if (hostBusy || denied || typeof api?.getRootDocument !== "function") return;
    hostBusy = true;
    try {
      if (!host) {
        if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { denied = true; return; }
        const root = await api.getRootDocument();
        if (!root) return;
        for (let i = 0; i < 4; i++) { const old = await root.querySelector(`[${ATTR}="1"]`); if (!old) break; try { await old.remove(); } catch { break; } }
        const body = await root.querySelector("body") || root;
        const b = await root.createElement("button");
        await b.setAttribute(ATTR, "1");
        await b.setAttribute("aria-label", "Dusk AI 생성 중지");
        await b.setStyleAttribute(STYLE);
        await b.addEventListener("click", onStop);
        await body.appendChild(b);
        host = b;
      }
      const t = stopText();
      await host.setTextContent(`■ ${t.main}${t.sub ? ` · ${t.sub}` : ""}`);
      try { await host.setAttribute("title", t.all ? `지금 하는 작업: ${t.all}` : ""); } catch { /* title 없이 */ }
    } catch { host = null; } finally { hostBusy = false; }
  };
  const hideHost = async () => { const b = host; host = null; if (b) { try { await b.remove(); } catch { /* 이미 사라짐 */ } } };
  function sync() {
    const n = activeCount();
    if (!n) {
      if (timer !== null) { scheduler.clearTimeout(timer); timer = null; }
      if (poll !== null) { scheduler.clearInterval(poll); poll = null; }
      hideWin();
      hideHost();
      return;
    }
    if (windowOpen()) { showWin(); hideHost(); }
    else { hideWin(); showHost(); }
  }
  const off = onAiChange(() => {
    const n = activeCount();
    if (!n) return sync();
    if (inWin?.isConnected || host) return sync();   // 이미 떠 있으면 숫자만 바꾼다
    if (timer === null) timer = scheduler.setTimeout(() => { timer = null; sync(); }, delayMs);   // 아주 짧은 호출은 깜빡이지 않게
    if (poll === null) poll = scheduler.setInterval(sync, 1500);   // 창을 열고 닫으면 자리를 옮긴다
  });
  return { sync, stop: onStop, dispose: () => { off(); hideWin(); hideHost(); if (poll !== null) scheduler.clearInterval(poll); } };
}
