// 오토 스크롤 설정 화면 조각: 빠른 설정 창·설정 탭 카드·애드온 화면이 같이 쓴다. h·switchEl·chip은 부르는 쪽이 넘긴다(공식·커스텀 둘 다 씀).
import { clampSpeed, SPEED_MIN, SPEED_MAX, SPEED_PRESETS, speedLabel } from "../../src/engine/autoscroll.js";

export const QS_TITLE = "오토 스크롤";
export const QS_DESC = "응답 위 버튼을 누르면 천천히 내려가요.";
export const summary = (st) => (st.on ? `켜짐 · ${speedLabel(st.speed)}` : "꺼짐");

// st = { on, speed, noX }, act = { setOn, setSpeed, setNoX }
export function settingsBody({ h, switchEl, chip }, st, act, { withOn = true } = {}) {
  const sync = (el, v) => el.setAttribute("aria-checked", v ? "true" : "false");
  const row = (title, desc, on, onChange, id) => h("div", { class: "rb-srow", id },
    h("span", { class: "t" }, title, h("small", null, desc)),
    switchEl(on, { label: title, onChange: (v, el) => { sync(el, v); onChange(v); } }));

  const num = h("b", { style: "min-width:3em;text-align:right;font-variant-numeric:tabular-nums" });
  const range = h("input", { type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: "5", value: String(st.speed), "aria-label": "오토 스크롤 속도 (초당 픽셀)", class: "rb-as-range", style: "flex:1;min-width:140px;accent-color:var(--rb-acc)" });
  const chips = SPEED_PRESETS.map(([label, v]) => { const c = chip(label, { onClick: () => { show(v); act.setSpeed(v); } }); c.dataset.v = String(v); return c; });
  const show = (v) => {
    v = clampSpeed(v);
    range.value = String(v); num.textContent = String(v);
    for (const c of chips) c.setAttribute("aria-pressed", Number(c.dataset.v) === v ? "true" : "false");
  };
  range.addEventListener("input", () => show(range.value));
  range.addEventListener("change", () => { show(range.value); act.setSpeed(range.value); });
  show(st.speed);

  return h("div", { class: "rb-as-set", style: "display:flex;flex-direction:column" },
    withOn ? row("사용하기", "켜면 리스 채팅의 마지막 AI 응답 맨 위에 ‘▼ 오토 스크롤’ 버튼이 생겨요. 누르면 내려가고, 다시 누르거나 채팅을 터치·클릭하면 멈춰요.", st.on, act.setOn, "rb-as-on") : null,
    h("div", { style: "display:flex;flex-direction:column;gap:10px;padding:12px 0", class: "rb-as-speed" },
      h("span", { style: "display:flex;flex-direction:column;gap:2px" }, h("b", { style: "font-size:14.5px;font-weight:500" }, "내려가는 속도"),
        h("small", { class: "rb-muted", style: "white-space:normal" }, "초당 몇 픽셀 내려갈지 정해요. 내려가는 동안 화면 위에 뜨는 −/+ 로도 바꿀 수 있어요.")),
      h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...chips),
      h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, range, h("span", { style: "display:inline-flex;align-items:baseline;gap:4px" }, num, h("small", { class: "rb-muted" }, "px/초")))),
    row("좌우 스크롤 막기", "채팅이 옆으로 밀리거나 흔들리지 않게 해요. 넓은 표·코드도 옆으로 밀리지 않아요.", st.noX, act.setNoX, "rb-as-nox"));
}
