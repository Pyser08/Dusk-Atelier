// 오토 스크롤 애드온: 홈 '빠른 설정' 맨 아래에 켜고 끄는 줄, 설정 탭에 속도 카드를 단다.
// 켜면 리스 채팅의 마지막 AI 응답 맨 위에 '오토 스크롤' 버튼이 생기고, 누르면 정한 속도로 천천히 내려간다(runner.js).
// 설정(켜짐·속도)은 이 애드온 전용 저장소(ctx.dusk.storage)에 남아서, 애드온을 다시 받으면 이어서 써요.
import { h } from "../../src/ui/dom.js";
import { switchEl, setSwitch } from "../../src/ui/kit.js";
import { clampSpeed, SPEED_MIN, SPEED_MAX, SPEED_DEF, SPEED_PRESETS } from "../../src/engine/autoscroll.js";
import { createAutoScroll } from "./runner.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const store = ctx.dusk?.storage;
  const get = async (k, d) => { try { return store ? await store.get(k, d) : d; } catch { return d; } };
  const put = async (k, v) => { if (store) await store.set(k, v); };
  const toast = (t, o) => { try { ctx.toast?.(t, o); } catch { /* 알림 없이 */ } };

  const st = { on: (await get("on", false)) === true, speed: clampSpeed(await get("speed", SPEED_DEF)) };
  const R = createAutoScroll(api, {
    getSpeed: () => st.speed,
    setSpeed: async (v) => { st.speed = clampSpeed(v); await put("speed", st.speed); },
    onDenied: () => toast("리스 화면 접근을 허락해야 오토 스크롤 버튼을 달 수 있어요. 다시 켜면 다시 물어봐요.", { error: true }),
    log: (m) => console.log(`[Dusk Atelier] 오토 스크롤: ${m}`)
  });
  const setOn = async (v) => {
    st.on = !!v;
    try { await put("on", st.on); } catch (e) { toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
    if (st.on && R.isDenied()) R.retry();
    await R.setEnabled(st.on);
    toast(st.on ? "오토 스크롤을 켰어요. 채팅의 마지막 AI 응답 맨 위에 버튼이 생겨요." : "오토 스크롤을 껐어요.");
  };
  const setSpeed = async (v) => {
    st.speed = clampSpeed(v);
    try { await put("speed", st.speed); } catch (e) { toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }); }
  };

  // 홈 빠른 설정 맨 아래 줄(코어 quickset.js의 slot "home.quickset")
  const quickRow = () => h("div", { class: "rb-srow", id: "rb-qs-autoscroll" },
    h("span", { class: "t" }, "오토 스크롤", h("small", null, "응답 위 버튼을 누르면 천천히 내려가요.")),
    switchEl(st.on, { label: "오토 스크롤", onChange: (v, el) => { setSwitch(el, v); setOn(v); } }));

  // 설정 탭 카드: 켜기 + 속도(빠른 고르기 + 슬라이더)
  const settingsCard = () => {
    const num = h("b", { style: "min-width:3.5em;text-align:right;font-variant-numeric:tabular-nums" });
    const range = h("input", { type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: "5", value: String(st.speed), "aria-label": "오토 스크롤 속도 (초당 픽셀)", id: "rb-as-speed", style: "flex:1;min-width:140px;accent-color:var(--rb-acc)" });
    const chips = SPEED_PRESETS.map(([label, v]) => h("button", { type: "button", class: "rb-chip", dataset: { v: String(v) }, onClick: () => { show(v); setSpeed(v); } }, label));
    const show = (v) => {
      v = clampSpeed(v);
      range.value = String(v); num.textContent = String(v);
      for (const c of chips) c.setAttribute("aria-pressed", Number(c.dataset.v) === v ? "true" : "false");
    };
    range.addEventListener("input", () => show(range.value));
    range.addEventListener("change", () => { show(range.value); setSpeed(range.value); });
    show(st.speed);
    return h("section", { class: "rb-card bordered rb-scard", id: "rb-autoscroll" },
      h("span", { class: "h" }, "오토 스크롤"),
      h("div", { class: "rb-srow" },
        h("span", { class: "t" }, "오토 스크롤 버튼", h("small", null, "켜면 리스 채팅의 마지막 AI 응답 맨 위에 ‘▼ 오토 스크롤’ 버튼이 생겨요. 누르면 내려가고, 다시 누르거나 채팅을 터치·클릭하면 멈춰요.")),
        switchEl(st.on, { label: "오토 스크롤 버튼", onChange: (v, el) => { setSwitch(el, v); setOn(v); } })),
      h("div", { style: "display:flex;flex-direction:column;gap:10px;padding:12px 0 4px" },
        h("span", { class: "t", style: "display:flex;flex-direction:column;gap:2px" }, h("b", { style: "font-size:14.5px;font-weight:500" }, "내려가는 속도"),
          h("small", { class: "rb-muted", style: "white-space:normal" }, "초당 몇 픽셀 내려갈지 정해요. 내려가는 동안 화면 위에 뜨는 −/+ 로도 바꿀 수 있어요.")),
        h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...chips),
        h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, range, h("span", { style: "display:inline-flex;align-items:baseline;gap:4px" }, num, h("small", { class: "rb-muted" }, "px/초")))));
  };

  const off = [
    ext.add("slot", "home.quickset", quickRow),
    ext.add("slot", "settings.cards", settingsCard)
  ];
  if (st.on) R.setEnabled(true).catch(() => {});
  return { async deactivate() { off.forEach((f) => f()); await R.dispose().catch(() => {}); } };
}
