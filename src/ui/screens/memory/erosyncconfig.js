// Erosync 화면의 '동작·분석' 카드: 장면 빈도·자율성·끈기, 읽는 범위, 분석·성격 변화 반영 방식. 값은 이 기기의 Erosync 설정(erosync_local_config_v3)에 저장된다.
import { h, replace } from "../../dom.js";
import { switchEl, setSwitch, segmented } from "../../kit.js";
import { sliderField, choiceField, toggleField } from "../../fields.js";

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
export const DEV_MODES = [["candidates", "후보만 쌓기", "변화 후보만 모으고, ‘검토’ 탭에서 직접 반영해요"], ["review", "검토 후 반영", "후보를 모아 두고 ‘검토’ 탭에서 직접 반영해요"], ["cautious_auto", "신중하게 자동", "근거 5번·장면 4개·확신 90% 이상일 때 바꾸고, 못 미친 건 ‘검토’ 탭에 쌓여요"], ["standard_auto", "표준 자동", "근거 4번·장면 3개·확신 80% 이상일 때 바꾸고, 못 미친 건 ‘검토’ 탭에 쌓여요"], ["loose_auto", "넉넉하게 자동", "근거 3번·장면 2개·확신 70% 이상일 때 바꾸고, 못 미친 건 ‘검토’ 탭에 쌓여요"]];
export const MODES = [["normal", "보통", "확률에 따라 장면을 움직여요"], ["proof", "검증", "확률 굴림 없이 매번 움직여요(시험용)"], ["off", "쉬기", "장면 판단을 하지 않아요"]];

// group: "act"(동작: 방식·빈도 등) | "ana"(분석: 점진 분석·성격 변화 반영) | 없으면 전부
export function erosyncConfigCard(ctx, group = "") {
  const er = ctx.erosync;
  const body = h("div", { class: "rb-flds" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: group ? `rb-erosync-config-${group}` : "rb-erosync-config" }, h("h3", null, group === "act" ? "동작" : group === "ana" ? "분석" : "동작 · 분석"), body);
  const save = async (patch) => { const r = typeof er.config === "function" ? await er.config(patch) : { ok: false, reason: "off" }; if (!r.ok) ctx.toast(r.reason || "설정을 바꾸지 못했어요", { error: true }); return paint(r); };
  function paint(c) {
    if (!c?.ok) { replace(body, h("p", { class: "rb-muted", style: "white-space:normal" }, "Erosync를 켜면 여기서 동작과 분석 방식을 정할 수 있어요.")); return; }
    const v = c.values, max = c.maxActors || 10;
    replace(body,
      h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "이 기기에만 저장돼요. 값을 바꾸면 다음 응답부터 반영돼요."),
      ...(group === "ana" ? [] : [choiceField({ id: "rb-erosync-mode", label: "동작 방식", hint: "평소엔 ‘보통’. ‘검증’은 장면이 잘 움직이는지 볼 때만 써요.", options: MODES, value: v.mode, onChange: (val) => save({ mode: val }) })]),
      ...(group === "ana" ? [] : NUMS).map(([key, label, lo, hi, hint]) => { const top = key === "maxActorsPerTurn" ? Math.min(hi, max) : hi;
        return sliderField({ id: `rb-erosync-c-${key}`, label, hint, value: v[key], min: lo, max: top, onCommit: (n) => save({ [key]: n }) }); }),
      ...(group === "act" ? [] : TOGGLES).map(([key, label, hint]) => toggleField({ id: `rb-erosync-t-${key}`, label, hint, on: v[key] === true, onChange: (on) => save({ [key]: on }) })),
      ...(group === "act" ? [] : [choiceField({ id: "rb-erosync-dev", label: "성격 변화 반영", hint: "대화가 쌓이며 인물의 성향 값이 바뀌는 걸 얼마나 쉽게 반영할지예요. 직접 고친 값은 바뀌지 않아요.", options: DEV_MODES, value: v.developmentMode, onChange: (val) => save({ developmentMode: val }) })]));
  }
  paint({ ok: false });
  if (er.on() && er.isRunning() && typeof er.config === "function") er.config().then(paint);
  return card;
}
