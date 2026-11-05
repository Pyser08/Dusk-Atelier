// 리스 화면(플러그인 밖) 오른쪽 아래에 뜨는 업데이트 알림. retrytoast.js와 같은 방식: 리스 본문 DOM에 붙이므로 mainDom 권한이 필요하고,
// 권한이 없거나 만들지 못하면 false를 돌려줘 호출한 쪽이 플러그인 안 알림으로 대신한다.
const ATTR = "x-dusk-update-toast";
const CARD = "pointer-events:auto;box-sizing:border-box;width:min(340px,calc(100vw - 24px));padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(24,26,34,.97);color:#f2f0ea;box-shadow:0 10px 30px rgba(0,0,0,.4);font-family:system-ui,sans-serif;";
const BTN = (primary) => `cursor:pointer;min-height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:700;border:1px solid ${primary ? "transparent" : "rgba(255,255,255,.2)"};background:${primary ? "#d9a45b" : "transparent"};color:${primary ? "#1c1710" : "#f2f0ea"};`;
export function createUpdateToast(api, { onOpen, scheduler = globalThis, seconds = 30 } = {}) {
  let ui = null, timer = null, denied = false;
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
      const title = await root.createElement("div"); await title.setTextContent("Dusk Atelier · ProtLink+"); await title.setStyleAttribute("font-size:11px;font-weight:800;letter-spacing:.08em;color:#a99f8c;margin-bottom:4px;");
      const text = await root.createElement("div"); await text.setStyleAttribute("font-size:13px;line-height:1.5;word-break:keep-all;margin-bottom:10px;");
      const row = await root.createElement("div"); await row.setStyleAttribute("display:flex;gap:8px;flex-wrap:wrap;");
      const mk = async (label, primary, fn) => { const b = await root.createElement("button"); await b.setTextContent(label); await b.setStyleAttribute(BTN(primary)); await b.addEventListener("click", fn); await row.appendChild(b); return b; };
      await mk("확인하러 가기", true, async () => { await hide(); await onOpen?.(); });
      await mk("닫기", false, () => hide());
      await card.appendChild(title); await card.appendChild(text); await card.appendChild(row); await wrap.appendChild(card); await host.appendChild(wrap);
      return { wrap, text };
    } catch { return null; }
  };
  const show = async (message) => {
    clear(); if (!ui) ui = await build(); if (!ui) return false;
    try { await ui.text.setTextContent(String(message).slice(0, 220)); } catch { return false; }
    timer = scheduler.setTimeout(() => { hide(); }, seconds * 1000);
    return true;
  };
  return { show, hide };
}
