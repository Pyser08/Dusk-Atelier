// 오토 스크롤 — 커스텀 애드온 한 파일판(홈 → 애드온 → 불러오기). 빌드: node tools/build-autoscroll-custom.mjs
// 공식 애드온(index.js)과 같은 런타임(runner.js)·설정 조각(settingsui.js)을 쓰고, 화면은 ctx.dusk.ui만 쓴다(코어 모듈 import 없음).
// 홈 '빠른 설정' 맨 아래 줄: SDK 2(코어가 자리를 알아서 넣어 줌)면 dusk.addQuickSetting, 예전 코어면 카드가 그려질 때 직접 붙인다.
import { clampSpeed, SPEED_DEF } from "../../src/engine/autoscroll.js";
import { createAutoScroll } from "./runner.js";
import { settingsBody, QS_TITLE, QS_DESC, summary } from "./settingsui.js";

export const meta = {
  id: "auto-scroll",
  name: "오토 스크롤",
  version: "0.2.0",
  desc: "홈 빠른 설정에서 켜면 채팅의 마지막 AI 응답 맨 위에 ‘오토 스크롤’ 버튼이 생겨요. 누르면 정한 속도로 부드럽게 내려가요. 속도·좌우 스크롤 막기는 빠른 설정의 ‘설정’에서 바꿔요.",
  author: "Dusk Atelier",
  minCore: "2.1.0"
};

export async function activate(api, ctx) {
  const dusk = ctx.dusk;
  const { ui, storage } = dusk;
  const { h } = ui;
  const ext = dusk.ext ?? ctx.ext;
  const toast = (t, o) => { try { dusk.toast(t, o); } catch { /* 알림 없이 */ } };
  const kit = { h, switchEl: ui.switchEl, chip: ui.chip };

  const st = {
    on: (await storage.get("on", false)) === true,
    speed: clampSpeed(await storage.get("speed", SPEED_DEF)),
    noX: (await storage.get("noX", false)) === true
  };
  const R = createAutoScroll(api, {
    getSpeed: () => st.speed, noX: st.noX,
    setSpeed: async (v) => { st.speed = clampSpeed(v); await storage.set("speed", st.speed); },
    onDenied: () => toast("리스 화면 접근을 허락해야 오토 스크롤 버튼을 달 수 있어요. 다시 켜면 다시 물어봐요.", { error: true }),
    log: (m) => console.log(`[Dusk Atelier] 오토 스크롤: ${m}`)
  });
  const save = async (k, v) => { try { await storage.set(k, v); } catch (e) { toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); } };
  const act = {
    async setOn(v) {
      st.on = !!v;
      await save("on", st.on);
      if (st.on && R.isDenied()) R.retry();
      await R.setEnabled(st.on);
      toast(st.on ? "오토 스크롤을 켰어요. 채팅의 마지막 AI 응답 맨 위에 버튼이 생겨요." : "오토 스크롤을 껐어요.");
    },
    async setSpeed(v) { st.speed = clampSpeed(v); await save("speed", st.speed); await R.respeed(); },
    async setNoX(v) {
      st.noX = !!v;
      await save("noX", st.noX);
      await R.setNoX(st.noX);
      toast(st.noX ? (st.on ? "채팅 좌우 스크롤을 막았어요." : "좌우 스크롤 막기는 오토 스크롤을 켜면 적용돼요.") : "좌우 스크롤 막기를 껐어요.");
    }
  };
  const body = (withOn) => settingsBody(kit, st, act, { withOn });
  const offs = [];

  // 1) 홈 빠른 설정 맨 아래 줄 + ‘설정’ 창
  if (typeof dusk.addQuickSetting === "function") {
    dusk.addQuickSetting({ id: "rb-qs-autoscroll", title: QS_TITLE, desc: QS_DESC, value: () => summary(st), settings: (el) => el.append(body(true)) });
  } else offs.push(legacyQuickRow());

  // 2) 설정 탭 카드
  const card = () => h("section", { class: "rb-card bordered rb-scard", id: "rb-autoscroll" }, h("span", { class: "h" }, "오토 스크롤"), body(true));
  if (typeof dusk.addSettingsCard === "function") dusk.addSettingsCard({ title: "오토 스크롤", render: (el) => el.append(body(true)) });
  else if (ext) offs.push(ext.add("slot", "settings.cards", card));

  // 3) 홈 애드온 상자의 ‘열기’
  dusk.addPage({ title: "오토 스크롤", render(el) { ui.replace(el, ui.card("오토 스크롤", body(true))); } });

  if (st.on) R.setEnabled(true).catch(() => {});
  return {
    async deactivate() {
      offs.forEach((f) => { try { f(); } catch { /* 이미 없음 */ } });
      await R.dispose().catch(() => {});
    }
  };

  // 예전 코어(SDK 1): 빠른 설정 카드가 그려지면 맨 아래에 줄을 붙이고, ‘설정’은 직접 만든 창으로 연다
  function legacyQuickRow() {
    const doc = globalThis.document;
    const chevron = () => { const t = doc.createElement("template"); t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'; return t.content.firstChild; };
    const win = () => ctx.app?.win ?? doc?.querySelector(".rb-win") ?? doc?.body;
    const openSettings = () => {
      const host = win();
      if (!host) return;
      const back = h("div", { class: "rb-modal" });
      const close = () => { back.remove(); doc.removeEventListener("keydown", onKey, true); doc.querySelectorAll("#rb-qs-autoscroll .val").forEach((v) => { v.textContent = summary(st); }); };
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
      back.append(h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": QS_TITLE },
        h("div", { class: "hd" }, h("b", null, QS_TITLE)), body(true),
        h("div", { style: "display:flex;justify-content:flex-end;margin-top:12px" }, ui.btn("닫기", { kind: "primary", onClick: close }))));
      back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
      doc.addEventListener("keydown", onKey, true);
      host.append(back);
    };
    // 유저 편향 없애기 줄과 같은 모양: 줄 전체가 버튼, 오른쪽에 상태 글자 + ›
    const row = () => h("button", { type: "button", class: "rb-srow dicebox", id: "rb-qs-autoscroll", "aria-haspopup": "dialog", onClick: openSettings },
      h("span", { class: "t" }, QS_TITLE, h("small", null, QS_DESC)),
      h("span", { class: "end" }, h("span", { class: "val" }, summary(st)), h("span", { class: "go", style: "display:inline-flex" }, chevron())));
    const attach = () => { for (const c of doc?.querySelectorAll?.(".rb-hqs .rb-story-helper") ?? []) if (!c.querySelector("#rb-qs-autoscroll")) c.appendChild(row()); };
    let mo = null;
    if (doc?.body && typeof MutationObserver === "function") {
      let queued = false;
      mo = new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; attach(); }); });
      mo.observe(doc.body, { childList: true, subtree: true });
      attach();
    }
    return () => { mo?.disconnect(); doc?.querySelectorAll?.("#rb-qs-autoscroll").forEach((el) => el.remove()); };
  }
}
