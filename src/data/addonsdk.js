// 애드온 SDK(2.1.0): 모든 애드온의 activate(api, ctx)에 ctx.dusk로 넘겨 주는 쉬운 도구 모음.
// 커스텀 애드온(사용자·AI가 만든 것)이 코어를 고치지 않고 화면·저장·AI 호출을 쓰게 하는 약속된 입구다.
// 여기서 단 것(페이지 등)은 애드온을 끌 때 cleanup()이 모두 뗀다. 이름을 바꾸거나 빼면 남이 만든 애드온이 깨지므로
// 더하기만 한다(바꾸면 docs/addons/SKILL.md·engine/addonguide.js의 설명도 함께).
import { h, replace, download, copyText, pickFiles } from "../ui/dom.js";
import { btn, switchEl, toggleRow, note, emptyState, pageHead, confirmDialog, promptDialog, openMenu, chip, badge } from "../ui/kit.js";
import { runAI } from "../engine/runai.js";

export const SDK_VERSION = 1;

export function createAddonSdk(api, base = {}, { id, name, version, custom = false } = {}) {
  const app = base.app ?? {}, ext = base.ext;
  const offs = [];
  const own = (off) => { if (typeof off === "function") offs.push(off); return off; };
  const win = () => app.win ?? globalThis.document?.body;
  const pageKey = custom ? `addon-c-${id}` : `addon-${id}`;   // 커스텀은 공식 애드온과 id가 같아도 안 겹치게
  const svcKey = `addonpage:${custom ? "c:" : ""}${id}`;
  const dataKey = (k) => `dusk.addon.data.${id}.${k}`;
  const store = () => api.pluginStorage;

  const storage = {
    async get(k, fallback = null) {
      try { const v = await store()?.getItem(dataKey(k)); if (v == null || v === "") return fallback; return typeof v === "string" ? JSON.parse(v) : v; } catch { return fallback; }
    },
    async set(k, v) { await store()?.setItem(dataKey(k), JSON.stringify(v ?? null)); },
    async remove(k) { const s = store(); if (typeof s?.removeItem === "function") await s.removeItem(dataKey(k)); else await s?.setItem(dataKey(k), ""); }
  };

  const ai = {
    // 리스 보조 모델로 한 번 묻는다. 문자열이면 user 메시지 하나, 배열이면 [{ role, content }].
    // '생성 중지' 버튼에 자동으로 잡힌다. 돌려주는 값: 답 글(string)
    async run(input, { system, signal } = {}) {
      const msgs = Array.isArray(input) ? input : [{ role: "user", content: String(input ?? "") }];
      return runAI(api, system ? [{ role: "system", content: String(system) }, ...msgs] : msgs, { mode: "submodel", stage: `애드온 ${name ?? id}` }, signal);
    }
  };

  const ui = {
    h, replace, btn, switchEl, toggleRow, note, emptyState, pageHead, chip, badge, download, copyText, pickFiles,
    card: (title, ...kids) => h("section", { class: "rb-card bordered rb-addon-card" }, title ? h("h3", { class: "rb-h3" }, title) : null, ...kids),
    confirm: (o) => confirmDialog(win(), o),
    prompt: (o) => promptDialog(win(), o),
    menu: (anchor, items) => openMenu(win(), anchor, items)
  };

  let page = null;
  // Dusk 창 안에 이 애드온 화면 하나. 홈 애드온 상자의 이 애드온 줄에 ‘열기’가 생긴다.
  // render(el, dusk) — el에 그린다. 돌려준 함수가 있으면 화면을 떠날 때 부르지 않으니, 정리는 deactivate에서.
  function addPage({ title, render } = {}) {
    if (!ext) throw new Error("Dusk가 너무 오래됐어요 — 업데이트해 주세요");
    if (typeof render !== "function") throw new Error("addPage: render 함수가 필요해요");
    page = { title: String(title || name || id) };
    const draw = async (c) => {
      const body = h("div", { class: "rb-addon-page" });
      replace(c.main, h("div", { class: "rb-section rb-scroll" }, pageHead(page.title, { sub: custom ? "커스텀 애드온" : name, back: { label: "홈으로", onClick: () => app.go?.("home") } }), body));
      try { await render(body, sdk); } catch (e) { replace(body, note("err", `애드온 화면 오류: ${e?.message ?? e}`)); }
    };
    own(ext.add("tab", pageKey, draw));
    own(ext.add("svc", svcKey, { title: page.title, open: () => sdk.open() }));
    return () => {};
  }

  const sdk = {
    sdkVersion: SDK_VERSION, coreVersion: base.coreVersion ?? globalThis.__duskVersion ?? "", id, name, version, custom,
    ui, storage, ai,
    toast: (t, o) => app.toast?.(t, o),
    addPage,
    open: () => (page ? Promise.resolve(base.openDusk?.(pageKey)) : Promise.resolve(base.openDusk?.())),
    // 직접 쓰는 길(고급): 코어 모듈 전부(globalThis.__duskLib, 경로가 이름) · 화면 자리(ext)
    lib: globalThis.__duskLib ?? {},
    ext,
    onCleanup: (fn) => own(fn)
  };
  return { sdk, cleanup() { for (const f of offs.splice(0).reverse()) { try { f(); } catch { /* 이미 없음 */ } } } };
}
