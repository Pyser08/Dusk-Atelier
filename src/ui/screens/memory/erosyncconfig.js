// Erosync 화면의 '동작·분석' 카드: 장면 빈도·자율성·끈기, 읽는 범위, 분석·성격 변화 반영 방식. 값은 이 기기의 Erosync 설정(erosync_local_config_v3)에 저장된다.
import { h, replace } from "../../dom.js";
import { switchEl, setSwitch } from "../../kit.js";

export const NUMS = [
  ["frequency", "장면 빈도", 0, 100, "높을수록 장면이 자주 움직여요"],
  ["autonomy", "인물 자율성", 0, 100, "높을수록 인물이 스스로 먼저 움직여요"],
  ["goalPersistence", "목표 끈기", 0, 100, "높을수록 목표를 오래 이어 가요"],
  ["cooldownTurns", "쉬는 턴", 0, 20, "같은 인물이 움직인 뒤 쉬는 턴 수"],
  ["maxActorsPerTurn", "한 턴에 움직이는 인물", 1, 10, "한 번의 장면 판단에 넣는 인물 수 상한"],
  ["recentMessages", "읽는 최근 메시지", 4, 40, "장면 판단이 읽는 최근 메시지 수"]
];
export const TOGGLES = [
  ["progressiveFollowUp", "점진 분석", "응답이 끝날 때마다 장면 인물을 한 명씩 이어서 분석해요"],
  ["autoVerifyCharacters", "인물 자동 검증", "분석한 인물이 맞는지 자동으로 확인해요"],
  ["autoRefreshProfiles", "프로필 자동 갱신", "기본은 꺼짐. 켜면 AI 호출이 더 늘어요"]
];
export const DEV_MODES = [["candidates", "후보만 쌓기"], ["review", "검토 후 반영"], ["cautious_auto", "신중하게 자동 반영"], ["standard_auto", "표준 자동 반영"], ["loose_auto", "넉넉하게 자동 반영"]];
export const MODES = [["normal", "보통"], ["proof", "검증"], ["off", "쉬기"]];

export function erosyncConfigCard(ctx) {
  const er = ctx.erosync;
  const body = h("div", { class: "rb-mem-fields" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-config" }, h("h3", null, "동작 · 분석"), body);
  const save = async (patch) => { const r = typeof er.config === "function" ? await er.config(patch) : { ok: false, reason: "off" }; if (!r.ok) ctx.toast(r.reason || "설정을 바꾸지 못했어요", { error: true }); return paint(r); };
  function paint(c) {
    if (!c?.ok) { replace(body, h("p", { class: "rb-muted", style: "white-space:normal" }, "Erosync를 켜면 여기서 동작과 분석 방식을 정할 수 있어요.")); return; }
    const v = c.values, max = c.maxActors || 10;
    const sel = (id, label, opts, key) => h("div", { class: "rb-mem-field" }, h("span", null, label),
      h("select", { id, onChange: (e) => save({ [key]: e.target.value }) }, ...opts.map(([val, text]) => h("option", { value: val, selected: v[key] === val }, text))));
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal" }, "이 기기에만 저장돼요. 값을 바꾸면 다음 응답부터 반영돼요."),
      sel("rb-erosync-mode", "동작 방식", MODES, "mode"),
      ...NUMS.map(([key, label, lo, hi, hint]) => { const top = key === "maxActorsPerTurn" ? Math.min(hi, max) : hi;
        return h("div", { class: "rb-mem-field" }, h("span", null, label, h("small", { class: "rb-muted" }, ` ${hint} (${lo}~${top})`)),
          h("input", { type: "number", id: `rb-erosync-c-${key}`, min: lo, max: top, value: v[key], onChange: (e) => { const n = Math.min(top, Math.max(lo, Math.round(Number(e.target.value) || lo))); e.target.value = n; save({ [key]: n }); } })); }),
      ...TOGGLES.map(([key, label, hint]) => h("div", { class: "rb-mem-field row" }, h("span", null, label, h("small", { class: "rb-muted" }, ` ${hint}`)),
        switchEl(v[key] === true, { label, onChange: (on, el) => { setSwitch(el, on); save({ [key]: on }); } }))),
      sel("rb-erosync-dev", "성격 변화 반영", DEV_MODES, "developmentMode"));
  }
  paint({ ok: false });
  if (er.on() && er.isRunning() && typeof er.config === "function") er.config().then(paint);
  return card;
}
