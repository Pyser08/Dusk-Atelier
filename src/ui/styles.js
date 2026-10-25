export var FONT_LINK = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap";
export var CSS2 = "*{box-sizing:border-box}[hidden]{display:none!important}html,body{margin:0;height:100%;background:transparent}\n.rb-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,.45);font:14px/1.5 system-ui,sans-serif;color:var(--rb-text,#222);z-index:9999}\n.rb-win{width:100%;height:100%;max-width:1560px;max-height:1040px;display:flex;flex-direction:column;overflow:hidden;border-radius:14px;background:var(--rb-win,#fff);border:1px solid var(--rb-line,#ddd)}\n.rb-head{display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--rb-line,#ddd);flex-shrink:0}\n.rb-body{display:flex;flex:1;min-height:0;overflow:hidden}.rb-nav{flex-shrink:0}.rb-main,.rb-section{min-width:0;min-height:0;flex:1}\n.rb-section{padding:16px;overflow:auto}.rb-scroll{overflow:auto}.rb-card{padding:12px;border:1px solid var(--rb-line,#ddd);border-radius:10px;margin-bottom:12px}\n.rb-btn,button{cursor:pointer}.rb-btn{min-height:34px;padding:6px 12px;border:1px solid var(--rb-line,#ccc);border-radius:8px;background:var(--rb-surf,#f7f7f7);color:inherit}\n.rb-input,input,textarea,select{max-width:100%;color:inherit;background:var(--rb-surf,#fff);border:1px solid var(--rb-line,#ccc);border-radius:6px;padding:6px}\n.rb-note{padding:10px;border-radius:8px;background:var(--rb-surf,#f7f7f7)}.rb-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.rb-prob{display:flex;flex-direction:column;gap:8px}.rb-modal,.rb-sheet{max-width:100%;overflow:auto}";

var UI_CSS_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/data/dusk-atelier-ui.v1.css";
var UI_CSS_CACHE_KEY = "dusk_atelier:ui:css:v1";
var uiCssLoadPromise = null;
function validUiCss(value) {
  return typeof value === "string" && value.length > 20000 && value.includes(".rb-root") && value.includes(".rb-da");
}
export function loadUiCss(api) {
  if (uiCssLoadPromise) return uiCssLoadPromise;
  uiCssLoadPromise = (async () => {
    const el = document.getElementById("rb-style");
    if (!el) return false;
    try {
      const cached = await api?.pluginStorage?.getItem(UI_CSS_CACHE_KEY);
      if (validUiCss(cached)) el.textContent = cached;
    } catch {}
    try {
      if (typeof api?.nativeFetch === "function") {
        const response = await api.nativeFetch(UI_CSS_URL, { method: "GET", headers: { Accept: "text/css" } });
        if (response && response.status >= 200 && response.status < 300) {
          const css = await response.text();
          if (validUiCss(css)) {
            el.textContent = css;
            try { await api.pluginStorage?.setItem(UI_CSS_CACHE_KEY, css); } catch {}
          }
        }
      }
    } catch {}
    return true;
  })().catch(() => false).finally(() => { uiCssLoadPromise = null; });
  return uiCssLoadPromise;
}
