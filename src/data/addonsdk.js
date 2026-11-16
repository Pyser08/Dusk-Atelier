// 애드온 SDK(2.1.0): 모든 애드온의 activate(api, ctx)에 ctx.dusk로 넘겨 주는 쉬운 도구 모음.
// 커스텀 애드온(사용자·AI가 만든 것)이 코어를 고치지 않고 화면·저장·AI 호출을 쓰게 하는 약속된 입구다.
// 여기서 단 것(페이지 등)은 애드온을 끌 때 cleanup()이 모두 뗀다. 이름을 바꾸거나 빼면 남이 만든 애드온이 깨지므로
// 더하기만 한다(바꾸면 docs/addons/SKILL.md·engine/addonguide.js의 설명도 함께).
import { h, replace, download, copyText, pickFiles } from "../ui/dom.js";
import { btn, switchEl, setSwitch, toggleRow, note, emptyState, pageHead, confirmDialog, promptDialog, openMenu, chip, badge, modal } from "../ui/kit.js";
import { icon } from "../ui/icons.js";
import { runAI } from "../engine/runai.js";
import { PLACES } from "../ui/placer.js";

export const SDK_VERSION = 2;   // 2: place·addQuickSetting·addSettingsCard·ui.modal

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
    menu: (anchor, items) => openMenu(win(), anchor, items),
    // 창 하나: build(done) → 창 안 Node. done(값)으로 닫으면 그 값으로 끝난다(바깥 누르기·Esc는 null).
    modal: (build) => modal(win(), build),
    // 제목 + 내용 + 닫기 버튼이 있는 기본 창
    dialog: ({ title, body = [], close = "닫기" } = {}) => modal(win(), (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title ?? "" },
      title ? h("h3", { class: "rb-h3" }, title) : null,
      ...[].concat(typeof body === "function" ? body(done) : body),
      h("div", { style: "display:flex;justify-content:flex-end;margin-top:12px" }, btn(close, { kind: "primary", onClick: () => done(null) }))))
  };

  // ── 자리 넣기(SDK 2): 코어를 고치지 않고 Dusk 화면에 부품을 넣는다. 끌 때 자동으로 뗀다. ──
  const placer = app.placer;
  function place(target, render, opts = {}) {
    if (!placer) throw new Error("Dusk가 너무 오래됐어요 — 업데이트해 주세요");
    return own(placer.place(target, (c, t) => render(t, sdk, c), { key: id, ...opts }));
  }
  // 홈 '빠른 설정' 맨 아래 한 줄. 두 모양:
  //   settings 없음 → 제목·설명 + 스위치(공정한 전개 줄처럼)            { title, desc, on, onChange }
  //   settings 있음 → 줄 전체가 버튼, 오른쪽에 상태 글자 + ›, 누르면 상세 창(유저 편향 없애기 줄처럼)
  //                   { title, desc, value?: () => "켜짐 · 보통", settings: (el, close) => void } — 켜고 끄기도 창 안에 둔다
  //   공통: id?(줄 id)
  function addQuickSetting({ title, desc = "", on, onChange, settings, value, id: rowId } = {}) {
    if (!title) throw new Error("addQuickSetting: title이 필요해요");
    const isOn = () => { try { return !!(typeof on === "function" ? on() : on); } catch { return false; } };
    const valText = () => { try { return String(typeof value === "function" ? value() : value ?? (isOn() ? "켜짐" : "꺼짐")); } catch { return ""; } };
    const vals = new Set();
    const paint = () => { for (const v of vals) { if (v.isConnected) v.textContent = valText(); else vals.delete(v); } };
    const openSettings = () => modal(win(), (done) => {
      const body = h("div", { class: "rb-addon-qs-body" });
      try { settings(body, () => done(null)); } catch (e) { replace(body, note("err", `애드온 화면 오류: ${e?.message ?? e}`)); }
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
        h("div", { class: "hd" }, h("b", null, title)), body,
        h("div", { style: "display:flex;justify-content:flex-end;margin-top:12px" }, btn("닫기", { kind: "primary", onClick: () => done(null) })));
    }).then(paint);
    return place("home.quickset", () => {
      if (settings) {
        const val = h("span", { class: "val" }, valText());
        vals.add(val);
        return h("button", { type: "button", class: "rb-srow dicebox rb-addon-qs", id: rowId, dataset: { addon: id }, "aria-haspopup": "dialog", onClick: openSettings },
          h("span", { class: "t" }, title, desc ? h("small", null, desc) : null),
          h("span", { class: "end" }, val, h("span", { class: "go" }, icon("chevron", 16))));
      }
      const sw = switchEl(isOn(), { label: title, onChange: async (v, el) => { setSwitch(el, v); try { await onChange?.(v); } catch (e) { setSwitch(el, !v); app.toast?.(`바꾸지 못했어요: ${e?.message ?? e}`, { error: true }); } } });
      return h("div", { class: "rb-srow rb-addon-qs", id: rowId, dataset: { addon: id } }, h("span", { class: "t" }, title, desc ? h("small", null, desc) : null), sw);
    });
  }
  // 설정 탭 카드 하나: render(el) 로 안을 그린다
  function addSettingsCard({ title, render } = {}) {
    if (typeof render !== "function") throw new Error("addSettingsCard: render 함수가 필요해요");
    const draw = () => {
      const body = h("div", { class: "rb-addon-card-body" });
      try { render(body, sdk); } catch (e) { replace(body, note("err", `애드온 화면 오류: ${e?.message ?? e}`)); }
      return h("section", { class: "rb-card bordered rb-scard", dataset: { addon: id } }, title ? h("span", { class: "h" }, title) : null, body);
    };
    if (ext) return own(ext.add("slot", "settings.cards", draw));
    return place("settings.end", draw);
  }

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
    addPage, place, addQuickSetting, addSettingsCard,
    places: Object.keys(PLACES),
    open: () => (page ? Promise.resolve(base.openDusk?.(pageKey)) : Promise.resolve(base.openDusk?.())),
    // 직접 쓰는 길(고급): 코어 모듈 전부(globalThis.__duskLib, 경로가 이름) · 화면 자리(ext)
    lib: globalThis.__duskLib ?? {},
    ext,
    onCleanup: (fn) => own(fn)
  };
  return { sdk, cleanup() { for (const f of offs.splice(0).reverse()) { try { f(); } catch { /* 이미 없음 */ } } } };
}
