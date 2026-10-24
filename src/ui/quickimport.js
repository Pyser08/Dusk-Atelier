// PC 리스 메인 화면 오른쪽 아래 '빠른 가져오기' 상자 (메인 화면 접근 권한이 있을 때만)
// 상자를 누르면 Dusk 가져오기 화면이 열리고, 거기에 끌어 놓으면 에셋을 여러 개씩 동시에 올린다.
// ×를 누르면 동그란 아이콘으로 작아지고, 아이콘을 누르면 다시 상자로 펼쳐진다. 접힌 상태는 기억한다.
// 리스는 플러그인에 drop 이벤트를 주지 않아서 상자 위에 놓은 파일은 받을 수 없다
// → 상자에는 '눌러서 열기'로만 안내한다. 모바일은 + 메뉴에 이미 버튼이 있으니 띄우지 않는다.
import { isMobileDevice } from '../data/presets.js';
import { readUi, watchDefaults } from './watch.js';

var MARK = "quickimport";
var STATE_KEY = "rbm:quickimport:v1";
// z-index는 Dusk 창(플러그인 화면, 1000)보다 낮게: Dusk를 열면 상자가 창 뒤로 숨는다.
// 아래쪽은 채팅 입력칸·보내기 버튼을 가리지 않게 띄운다.
var BASE = "position:fixed;right:16px;bottom:96px;z-index:999;display:flex;align-items:stretch;background:linear-gradient(135deg,#1b1930,#221f3a);border:1px solid #4b4580;box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 1px rgba(124,92,240,.2);color:#ecebf6;font:13px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;user-select:none;transition:opacity .2s";
var BOX = {
  wide: `${BASE};width:292px;max-width:calc(100vw - 32px);border-radius:16px`,
  mini: `${BASE};width:52px;height:52px;border-radius:26px`
};
var MAIN = {
  wide: "flex:1;min-width:0;display:flex;gap:12px;align-items:center;padding:14px 4px 14px 14px;cursor:pointer",
  mini: "flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer"
};
var X = {
  wide: "flex:none;width:34px;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;cursor:pointer;color:#9d99c1;font-size:18px",
  mini: "display:none"
};
var ICON = (size) => `<span style="flex:none;display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;text-align:center;border-radius:${Math.round(size * 0.3)}px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:${Math.round(size * 0.48)}px">⚡</span>`;
var INNER = {
  wide: `${ICON(42)}<span style="display:block;flex:1;min-width:0"><b style="display:block;font-size:15px;color:#ffffff">빠른 가져오기</b><span style="display:block;font-size:12.5px;color:#b1aecb;word-break:keep-all">에셋을 여러 개씩 동시에 올려서 리스 기본 가져오기보다 빨라요</span><span style="display:block;margin-top:5px;font-size:12px;font-weight:700;color:#c4b1ff;word-break:keep-all">눌러서 연 뒤 파일을 끌어 놓으세요 →</span></span>`,
  mini: ICON(40)
};

export function createQuickImport(api, { getDoc, onOpen } = {}) {
  let box = null, main = null, x = null, enabled = false, mini = false, mounting = null;

  async function loadMini() {
    try {
      const raw = await api.pluginStorage.getItem(STATE_KEY);
      const v = typeof raw === "string" ? JSON.parse(raw) : raw;
      return v?.mini === true;
    } catch {
      return false;
    }
  }
  const saveMini = () => api.pluginStorage.setItem(STATE_KEY, JSON.stringify({ mini })).catch(() => {
  });

  // 자동 감지가 켜져 있으면 감지기가 먼저 메인 화면을 얻는다. 허락 창이 두 번 뜨지 않게 잠시 기다린다.
  async function rootDoc(waitForWatcher) {
    for (let i = 0; waitForWatcher && i < 20 && !getDoc?.(); i++) await new Promise((r) => setTimeout(r, 500));
    const d = getDoc?.();
    if (d) return d;
    try {
      return await api.getRootDocument();
    } catch {
      return null;
    }
  }

  // 지금 상태(상자/아이콘)에 맞게 모양을 바꾼다
  async function paint(visible = true) {
    if (!box) return;
    const k = mini ? "mini" : "wide";
    await Promise.all([
      main.setStyleAttribute(MAIN[k]),
      main.setInnerHTML(INNER[k]),
      x.setStyleAttribute(X[k]),
      box.setAttribute("title", mini ? "빠른 가져오기 펼치기" : ""),
      box.setStyleAttribute(BOX[k] + (visible ? ";opacity:1" : ";opacity:0"))
    ]);
  }

  async function setMini(on) {
    if (mini === on) return;
    mini = on;
    saveMini();
    await paint().catch(() => {
    });
  }

  async function mount(waitForWatcher = false) {
    if (box || !enabled || isMobileDevice()) return;
    if (mounting) return mounting;
    mounting = (async () => {
      try {
        const doc = await rootDoc(waitForWatcher);
        if (!doc || box || !enabled) return;
        const body = await doc.querySelector("body");
        if (!body) return;
        // 플러그인을 다시 불러온 경우 남아 있는 상자를 치운다
        const old = await doc.querySelector(`[x-dusk="${MARK}"]`).catch(() => null);
        if (old) await old.remove().catch(() => {
        });
        // 메인 화면 호출은 하나하나가 왕복이라, 서로 상관없는 것은 한꺼번에 보낸다
        const [b, m, xx] = await Promise.all([doc.createElement("div"), doc.createElement("div"), doc.createElement("div")]);
        box = b;
        main = m;
        x = xx;
        await Promise.all([
          b.setAttribute("x-dusk", MARK),
          xx.setInnerText("×"),
          xx.setAttribute("title", "아이콘으로 접기"),
          // 상자를 누르면 가져오기 화면, 아이콘을 누르면 다시 상자로
          m.addEventListener("click", () => {
            if (mini) setMini(false);
            else onOpen?.();
          }),
          xx.addEventListener("click", () => setMini(true))
        ]);
        await paint(false);
        await Promise.all([b.appendChild(m), b.appendChild(xx)]);
        await body.appendChild(b);
        setTimeout(() => paint(true).catch(() => {
        }), 30);
      } catch {
        box = main = x = null;
      } finally {
        mounting = null;
      }
    })();
    return mounting;
  }

  async function unmount() {
    const b = box;
    box = main = x = null;
    if (b) await b.remove().catch(() => {
    });
  }

  return {
    async start() {
      const ui = watchDefaults(await readUi(api));
      enabled = ui.quickImport;
      mini = await loadMini();
      await mount(ui.autoDetect);
    },
    async setEnabled(on) {
      enabled = on;
      if (on) await mount();
      else await unmount();
    },
    get shown() {
      return !!box;
    },
    get mini() {
      return mini;
    }
  };
}
