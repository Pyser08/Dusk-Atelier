// 채팅 화면 오른쪽 아래에 뜨는 작은 알림. 자동 위키 기록이 막혔을 때 플러그인을 열지 않고 바로 다시 시도·열기를 누를 수 있다.
// 리스 본문 DOM에 붙이므로 mainDom 권한이 필요하다(진행 패널이 이미 받는 권한). 권한이 없거나 DOM을 못 만들면 아무것도 하지 않는다.
const ATTR = "x-dusk-retry-toast";
const CARD = "pointer-events:auto;box-sizing:border-box;width:min(340px,calc(100vw - 24px));padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(24,26,34,.97);color:#eef0f6;box-shadow:0 12px 32px rgba(0,0,0,.45);font-family:Inter,system-ui,sans-serif;";
const BTN = (primary) => `cursor:pointer;min-height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:700;border:1px solid ${primary ? "transparent" : "rgba(255,255,255,.2)"};background:${primary ? "linear-gradient(135deg,#8a7bff,#c07bff)" : "transparent"};color:${primary ? "#fff" : "#dfe3ee"};`;

export function createRetryToast(api, { onRetry, onOpen, scheduler = globalThis, seconds = 25 } = {}) {
  let ui = null, timer = null, busy = false, denied = false;
  const clear = () => { if (timer !== null) scheduler.clearTimeout(timer); timer = null; };
  const hide = async () => { clear(); const old = ui; ui = null; if (old) try { await old.wrap.remove(); } catch { /* 이미 사라짐 */ } };
  const build = async () => {
    if (typeof api.getRootDocument !== "function" || denied) return null;
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { denied = true; return null; }
      const root = await api.getRootDocument(); if (!root) return null;
      for (let n = 0; n < 4; n++) { const stale = await root.querySelector(`[${ATTR}="1"]`); if (!stale) break; try { await stale.remove(); } catch { break; } }
      const host = await root.querySelector("body") || root;
      const wrap = await root.createElement("div"); await wrap.setAttribute(ATTR, "1");
      await wrap.setStyleAttribute("position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 76px));z-index:999;pointer-events:none;");
      const card = await root.createElement("div"); await card.setStyleAttribute(CARD);
      const title = await root.createElement("div"); await title.setTextContent("Dusk Atelier · 장기기억"); await title.setStyleAttribute("font-size:11px;font-weight:800;letter-spacing:.08em;color:#a99bff;margin-bottom:6px;");
      const text = await root.createElement("div"); await text.setStyleAttribute("font-size:13px;line-height:1.5;word-break:keep-all;margin-bottom:10px;");
      const row = await root.createElement("div"); await row.setStyleAttribute("display:flex;gap:8px;flex-wrap:wrap;");
      const mk = async (label, primary, fn) => { const b = await root.createElement("button"); await b.setTextContent(label); await b.setStyleAttribute(BTN(primary)); await b.addEventListener("click", fn); await row.appendChild(b); return b; };
      const retryBtn = await mk("다시 시도", true, async () => { if (busy) return; busy = true; try { await hide(); await onRetry?.(); } finally { busy = false; } });
      await mk("장기기억 열기", false, async () => { await hide(); await onOpen?.(); });
      await mk("닫기", false, () => hide());
      await card.appendChild(title); await card.appendChild(text); await card.appendChild(row); await wrap.appendChild(card); await host.appendChild(wrap);
      return { wrap, text, retryBtn };
    } catch { return null; }
  };
  const show = async (message, { retry = true } = {}) => {
    clear(); if (!ui) ui = await build(); if (!ui) return false;
    try { await ui.text.setTextContent(String(message).slice(0, 220)); await ui.retryBtn.setStyleAttribute(retry ? BTN(true) : "display:none;"); } catch { return false; }
    timer = scheduler.setTimeout(() => { hide(); }, seconds * 1000);
    return true;
  };
  return { show, hide };
}

// 자동 기록이 끝났을 때 토스트를 띄울지 가른다. 위키 문서가 하나도 없거나, 수치가 비어 있는 인물이 둘 이상이면 알린다.
export function judgeAutoResult({ phase, message = "", scope = null }) {
  if (phase === "failed" || phase === "manual") {
    if (/자동 재시도 \d\/2/.test(message)) return null;  // 곧 스스로 다시 시도한다
    if (/리롤|삭제되어|RP 본문이 바뀌어/.test(message)) return null;
    return { text: "인물 위키 자동 기록이 실패했어요. 다시 시도할까요?" };
  }
  if (phase !== "completed" || !scope) return null;
  const chars = Object.values(scope.documents ?? {}).filter((d) => d?.type === "Character");
  if (!chars.length) return { text: "인물 위키 문서가 아직 만들어지지 않았어요. 다시 시도할까요?" };
  const noMetric = chars.filter((d) => !(d.metrics ?? []).length);
  if (noMetric.length >= 2) return { text: `수치 상태가 비어 있는 인물이 ${noMetric.length}명이에요(${noMetric.slice(0, 3).map((d) => d.title).join(", ")}). 다시 시도할까요?` };
  return null;
}
