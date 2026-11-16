// 오토 스크롤 — 커스텀 애드온 한 파일판(홈 → 애드온 → 불러오기). 빌드: node tools/build-autoscroll-custom.mjs
// 공식 애드온(index.js)과 같은 런타임(runner.js)을 쓰고, 화면은 ctx.dusk.ui만 쓴다(코어 모듈 import 없음).
// 홈 '빠른 설정' 맨 아래 줄: 코어에 자리(slot "home.quickset")가 있으면 거기에, 없는 예전 코어(2.2.4까지)면 카드가 그려질 때 맨 아래에 붙인다.
import { clampSpeed, SPEED_MIN, SPEED_MAX, SPEED_DEF, SPEED_PRESETS } from "../../src/engine/autoscroll.js";
import { createAutoScroll } from "./runner.js";

export const meta = {
  id: "auto-scroll",
  name: "오토 스크롤",
  version: "0.1.0",
  desc: "홈 빠른 설정에서 켜면 채팅의 마지막 AI 응답 맨 위에 ‘오토 스크롤’ 버튼이 생겨요. 누르면 정한 속도로 천천히 내려가요. 속도는 설정 탭이나 이 애드온의 ‘열기’에서 바꿔요.",
  author: "Dusk Atelier",
  minCore: "2.1.0"
};

export async function activate(api, ctx) {
  const dusk = ctx.dusk;
  const { ui, storage } = dusk;
  const { h } = ui;
  const ext = dusk.ext ?? ctx.ext;
  const toast = (t, o) => { try { dusk.toast(t, o); } catch { /* 알림 없이 */ } };
  const setSw = (el, v) => el?.setAttribute("aria-checked", v ? "true" : "false");

  const st = { on: (await storage.get("on", false)) === true, speed: clampSpeed(await storage.get("speed", SPEED_DEF)) };
  const R = createAutoScroll(api, {
    getSpeed: () => st.speed,
    setSpeed: async (v) => { st.speed = clampSpeed(v); await storage.set("speed", st.speed); },
    onDenied: () => toast("리스 화면 접근을 허락해야 오토 스크롤 버튼을 달 수 있어요. 다시 켜면 다시 물어봐요.", { error: true }),
    log: (m) => console.log(`[Dusk Atelier] 오토 스크롤: ${m}`)
  });
  const switches = new Set();   // 화면 곳곳의 스위치를 같이 맞춘다
  const setOn = async (v) => {
    st.on = !!v;
    for (const el of switches) { if (el.isConnected) setSw(el, st.on); else switches.delete(el); }
    try { await storage.set("on", st.on); } catch (e) { toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
    if (st.on && R.isDenied()) R.retry();
    await R.setEnabled(st.on);
    toast(st.on ? "오토 스크롤을 켰어요. 채팅의 마지막 AI 응답 맨 위에 버튼이 생겨요." : "오토 스크롤을 껐어요.");
  };
  const setSpeed = async (v) => {
    st.speed = clampSpeed(v);
    try { await storage.set("speed", st.speed); } catch (e) { toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
  };
  const sw = (label) => { const el = ui.switchEl(st.on, { label, onChange: (v) => { setOn(v); } }); switches.add(el); return el; };

  // 빠른 설정 한 줄
  const quickRow = () => h("div", { class: "rb-srow", id: "rb-qs-autoscroll" },
    h("span", { class: "t" }, "오토 스크롤", h("small", null, "응답 위 버튼을 누르면 천천히 내려가요.")),
    sw("오토 스크롤"));

  // 속도 고르기(빠른 고르기 + 슬라이더)
  const speedBox = () => {
    const num = h("b", { style: "min-width:3em;text-align:right;font-variant-numeric:tabular-nums" });
    const range = h("input", { type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: "5", value: String(st.speed), "aria-label": "오토 스크롤 속도 (초당 픽셀)", style: "flex:1;min-width:140px;accent-color:var(--rb-acc)" });
    const chips = SPEED_PRESETS.map(([label, v]) => ui.chip(label, { onClick: () => { show(v); setSpeed(v); } }));
    const show = (v) => {
      v = clampSpeed(v);
      range.value = String(v); num.textContent = String(v);
      SPEED_PRESETS.forEach(([, n], i) => chips[i].setAttribute("aria-pressed", n === v ? "true" : "false"));
    };
    range.addEventListener("input", () => show(range.value));
    range.addEventListener("change", () => { show(range.value); setSpeed(range.value); });
    show(st.speed);
    return h("div", { style: "display:flex;flex-direction:column;gap:10px;padding:12px 0 4px" },
      h("span", { style: "display:flex;flex-direction:column;gap:2px" }, h("b", { style: "font-size:14.5px;font-weight:500" }, "내려가는 속도"),
        h("small", { class: "rb-muted", style: "white-space:normal" }, "초당 몇 픽셀 내려갈지 정해요. 내려가는 동안 화면 위에 뜨는 −/+ 로도 바꿀 수 있어요.")),
      h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...chips),
      h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, range, h("span", { style: "display:inline-flex;align-items:baseline;gap:4px" }, num, h("small", { class: "rb-muted" }, "px/초"))));
  };
  const onRow = () => h("div", { class: "rb-srow" },
    h("span", { class: "t" }, "오토 스크롤 버튼", h("small", null, "켜면 리스 채팅의 마지막 AI 응답 맨 위에 ‘▼ 오토 스크롤’ 버튼이 생겨요. 누르면 내려가고, 다시 누르거나 채팅을 터치·클릭하면 멈춰요.")),
    sw("오토 스크롤 버튼"));
  const settingsCard = () => h("section", { class: "rb-card bordered rb-scard", id: "rb-autoscroll" }, h("span", { class: "h" }, "오토 스크롤"), onRow(), speedBox());

  const offs = [];
  if (ext) {
    offs.push(ext.add("slot", "home.quickset", quickRow));   // 자리가 있는 코어
    offs.push(ext.add("slot", "settings.cards", settingsCard));
  }
  dusk.addPage({ title: "오토 스크롤", render(el) { ui.replace(el, ui.card("오토 스크롤", onRow(), speedBox())); } });

  // 예전 코어: 홈 빠른 설정 카드가 그려지면 맨 아래에 줄을 붙인다(자리가 있는 코어면 이미 있어서 건너뜀)
  const doc = globalThis.document;
  const attach = () => {
    for (const card of doc?.querySelectorAll?.(".rb-hqs .rb-story-helper") ?? []) {
      if (!card.querySelector("#rb-qs-autoscroll")) card.appendChild(quickRow());
    }
  };
  let mo = null;
  if (doc?.body && typeof MutationObserver === "function") {
    let queued = false;
    mo = new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; attach(); }); });
    mo.observe(doc.body, { childList: true, subtree: true });
    attach();
  }

  if (st.on) R.setEnabled(true).catch(() => {});
  return {
    async deactivate() {
      mo?.disconnect();
      doc?.querySelectorAll?.("#rb-qs-autoscroll").forEach((el) => el.remove());
      offs.forEach((f) => { try { f(); } catch { /* 이미 없음 */ } });
      await R.dispose().catch(() => {});
    }
  };
}
