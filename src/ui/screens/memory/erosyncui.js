// Erosync 화면 맨 위 카드: 상태(꺼짐/준비 중/사용 중/문제 있음) + 켜기 스위치 + 비용 안내 + 월경 주기 안내.
// 본체는 src/erosync/, 컨트롤러는 data/erosync.js.
import { h } from "../../dom.js";
import { switchEl, setSwitch, statusCard } from "../../kit.js";

export const EROSYNC_COST_NOTE = "켜면 AI 호출이 늘어요. 인물 프로필을 만들 때 호출이 여러 번 들어가고, 응답이 끝날 때마다 장면을 읽는 호출이 한 번 더 들어가요. 기본으로 Dusk의 모델 설정(‘자체 AI 작업’ 모델, 없으면 리스 보조 모델)을 따르고, 쓰는 만큼 토큰·요금이 더 들어요.";

export function erosyncSection(ctx, onChange = () => {}) {
  const er = ctx.erosync;
  if (!er) return null;
  const stateBox = h("div", { id: "rb-erosync-state" });
  const note = h("p", { class: "rb-muted", id: "rb-erosync-note", style: "white-space:normal;margin:0" });
  const overlap = h("p", { class: "rb-muted", id: "rb-erosync-overlap", style: "white-space:normal", hidden: true });
  const checkOverlap = async () => {
    try {
      const r = (await ctx.memory?.flow?.settings?.())?.rawSnapshot?.();
      const both = er.on() && r?.features?.openness?.cycle === true && r?.sexualDesireEnabled === true;
      overlap.hidden = !both;
      overlap.textContent = both ? "월경 주기는 Dusk의 ‘월경·임신 기록’(성인 항목)이 이야기 속 날짜로 계산해요. 켜져 있는 동안 Erosync의 자체 주기는 쉬어서 몸 상태가 두 번 들어가지 않아요. Dusk 쪽을 끄면 Erosync의 주기가 다시 일해요." : "";
    } catch { overlap.hidden = true; }
  };
  const paint = async () => {
    void checkOverlap();
    const on = er.on(), running = er.isRunning();
    const kind = !on ? "off" : running ? "on" : er.lastError() ? "err" : "prep";
    const line = !on ? "꺼져 있어요. 켜면 인물 성향과 장면을 읽어 응답에 반영해요." : running ? "켜져 있어요. 인물 위키의 NSFW 탭과 인물 관계도에서 값을 볼 수 있어요." : er.lastError() || "시작하는 중이에요…";
    stateBox.replaceChildren(statusCard(kind, line));
    note.textContent = "";
    onChange();
  };
  const sw = switchEl(er.on(), { label: "Erosync", onChange: async (v, el) => {
    setSwitch(el, v);
    const ok = await er.set(v);
    if (v && !ok) { await er.set(false); setSwitch(el, false); ctx.toast(er.lastError() || "Erosync를 켜지 못했어요", { error: true }); await paint(); note.textContent = er.lastError(); return; }
    ctx.toast(v ? "Erosync를 켰어요" : "Erosync를 껐어요. 메뉴 버튼은 리스를 새로 열면 사라질 수 있어요");
    await paint();
  } });
  void paint();
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync", style: "display:grid;gap:10px" },
    h("h3", null, "Erosync (NSFW 장면 강화)"),
    stateBox,
    h("div", { class: "rb-mem-field row" }, h("span", null, "Erosync 켜기"), sw),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "인물마다 성향·관계를 따로 읽어 두고, 다음 응답에서 누가 무엇을 향해 움직일지 계획해 요청에 넣어요. 성적인 내용을 다루는 기능이라 기본은 꺼짐이에요."),
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, EROSYNC_COST_NOTE),
    overlap,
    h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "원래 ‘Erosync’ 플러그인과 같이 켜 둘 수 없어요. 저장된 프로필·기록은 같은 키를 써서 이어서 읽어요. 원래 플러그인은 끄고 쓰세요."),
    note);
}
