// PC 리스 메인 화면 오른쪽 아래 '빠른 가져오기' 상자 (메인 화면 접근 권한이 있을 때만)
// 누르면 Dusk 가져오기 화면이 열리고, 거기에 끌어 놓으면 에셋을 여러 개씩 동시에 올린다.
// 리스는 플러그인에 drop 이벤트를 주지 않아서 상자 위에 놓은 파일은 받을 수 없다
// → 상자에는 '눌러서 열기'로만 안내한다. 모바일은 + 메뉴에 이미 버튼이 있으니 띄우지 않는다.
import { isMobileDevice } from '../data/presets.js';
import { readUi, watchDefaults } from './watch.js';

// z-index는 Dusk 창(플러그인 화면, 1000)보다 낮게: Dusk를 열면 상자가 창 뒤로 숨는다.
// 아래쪽은 채팅 입력칸·보내기 버튼을 가리지 않게 띄운다.
var BOX = "position:fixed;right:16px;bottom:96px;z-index:999;display:flex;align-items:stretch;max-width:calc(100vw - 32px);border-radius:14px;background:linear-gradient(135deg,#1b1930,#221f3a);border:1px solid #4b4580;box-shadow:0 8px 24px rgba(0,0,0,.45),0 0 0 1px rgba(124,92,240,.2);color:#ecebf6;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;user-select:none;transition:opacity .2s;opacity:0";
var MAIN = "display:flex;gap:10px;align-items:center;padding:10px 4px 10px 12px;cursor:pointer";
var X = "flex:none;width:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9d99c1;font-size:16px";
var INNER = `<span style="flex:none;display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:9px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:15px">⚡</span><span style="display:block;min-width:0"><b style="display:block;font-size:13px;color:#ffffff">빠른 가져오기</b><span style="display:block;font-size:12px;color:#b1aecb;white-space:nowrap">눌러서 연 뒤 파일을 끌어 놓으세요</span></span>`;
var MARK = "quickimport";

export function createQuickImport(api, { getDoc, onOpen } = {}) {
  let box = null, enabled = false, dismissed = false, mounting = null;

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

  async function mount(waitForWatcher = false) {
    if (box || !enabled || dismissed || isMobileDevice()) return;
    if (mounting) return mounting;
    mounting = (async () => {
      try {
        const doc = await rootDoc(waitForWatcher);
        if (!doc || box || !enabled || dismissed) return;
        const body = await doc.querySelector("body");
        if (!body) return;
        // 플러그인을 다시 불러온 경우 남아 있는 상자를 치운다
        const old = await doc.querySelector(`[x-dusk="${MARK}"]`).catch(() => null);
        if (old) await old.remove().catch(() => {
        });
        // 메인 화면 호출은 하나하나가 왕복이라, 서로 상관없는 것은 한꺼번에 보낸다
        const [b, main, x] = await Promise.all([doc.createElement("div"), doc.createElement("div"), doc.createElement("div")]);
        await Promise.all([
          b.setAttribute("x-dusk", MARK),
          b.setStyleAttribute(BOX),
          main.setStyleAttribute(MAIN),
          main.setInnerHTML(INNER),
          x.setStyleAttribute(X),
          x.setInnerText("×"),
          main.addEventListener("click", () => onOpen?.()),
          // 닫으면 이번 실행 동안만 숨긴다. 아예 끄려면 설정에서
          x.addEventListener("click", () => {
            dismissed = true;
            unmount();
          })
        ]);
        await Promise.all([b.appendChild(main), b.appendChild(x)]);
        await body.appendChild(b);
        box = b;
        setTimeout(() => b.setStyleAttribute(BOX.replace("opacity:0", "opacity:1")).catch(() => {
        }), 30);
      } catch {
        box = null;
      } finally {
        mounting = null;
      }
    })();
    return mounting;
  }

  async function unmount() {
    const b = box;
    box = null;
    if (b) await b.remove().catch(() => {
    });
  }

  return {
    async start() {
      const ui = watchDefaults(await readUi(api));
      enabled = ui.quickImport;
      await mount(ui.autoDetect);
    },
    async setEnabled(on) {
      enabled = on;
      dismissed = false;
      if (on) await mount();
      else await unmount();
    },
    get shown() {
      return !!box;
    }
  };
}
