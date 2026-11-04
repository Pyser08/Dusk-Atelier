// 기억 설정의 'Erosync(NSFW 장면 강화)' 카드: 켜기/끄기, 비용 안내, 상태. 본체는 src/erosync/, 컨트롤러는 data/erosync.js.
import { h } from "../../dom.js";
import { btn, switchEl, setSwitch } from "../../kit.js";

export const EROSYNC_COST_NOTE = "켜면 AI 호출이 늘어요. 인물 프로필을 만들 때 호출이 여러 번 들어가고, 응답이 끝날 때마다 장면을 읽는 호출이 한 번 더 들어가요. 모델은 Erosync 설정에서 따로 고를 수 있고, 쓰는 만큼 토큰·요금이 더 들어요.";

export function erosyncSection(ctx) {
  const er = ctx.erosync;
  if (!er) return null;
  const note = h("p", { class: "rb-muted", id: "rb-erosync-note", style: "white-space:normal" });
  // 월경 주기는 Dusk(성인 항목 ‘월경·임신 기록’)에도 있다. 둘이 같이 켜져 있으면 몸 상태가 두 번 들어가니 알려 준다.
  const overlap = h("p", { class: "rb-muted", id: "rb-erosync-overlap", style: "white-space:normal", hidden: true });
  const checkOverlap = async () => {
    try {
      const r = (await ctx.memory?.flow?.settings?.())?.rawSnapshot?.();
      const both = er.on() && r?.features?.openness?.cycle === true && r?.sexualDesireEnabled === true;
      overlap.hidden = !both;
      overlap.textContent = both ? "월경 주기는 Dusk의 ‘월경·임신 기록’(성인 항목)에도 있어요. 둘을 같이 켜 두면 몸 상태가 두 번 들어가니, Dusk의 ‘월경·임신 기록’이나 Erosync 설정의 ‘생리 주기 사용’ 중 한쪽만 켜 주세요." : "";
    } catch { overlap.hidden = true; }
  };
  // Erosync 자체 설정 화면(프로필·장면·프롬프트·AI 모델·설정)을 여는 버튼: 켜져 있을 때만
  const openBtn = btn("Erosync 설정 열기", { id: "rb-erosync-open", onClick: async () => {
    const ok = typeof ctx.openErosync === "function" ? await ctx.openErosync().catch(() => false) : false;
    if (!ok) ctx.toast("Erosync 화면을 열지 못했어요. 채팅 메뉴의 ‘에로싱크’ 버튼을 써 보세요.", { error: true });
  } });
  openBtn.hidden = true;
  const paint = async () => {
    void checkOverlap();
    openBtn.hidden = !(er.on() && er.isRunning());
    if (!er.on()) { note.textContent = ""; return; }
    if (er.isRunning()) { note.textContent = "켜져 있어요. 채팅 메뉴의 ‘에로싱크’ 버튼이나 리스 설정의 ‘Erosync’에서 설정을 열 수 있어요."; return; }
    note.textContent = er.lastError() || "시작하는 중이에요…";
  };
  const sw = switchEl(er.on(), { label: "Erosync", onChange: async (v, el) => {
    setSwitch(el, v);
    const ok = await er.set(v);
    if (v && !ok) { await er.set(false); setSwitch(el, false); ctx.toast(er.lastError() || "Erosync를 켜지 못했어요", { error: true }); note.textContent = er.lastError(); return; }
    ctx.toast(v ? "Erosync를 켰어요" : "Erosync를 껐어요. 메뉴 버튼은 리스를 새로 열면 사라질 수 있어요");
    await paint();
  } });
  void paint();
  return h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync" },
    h("h3", null, "Erosync (NSFW 장면 강화)"),
    h("div", { class: "rb-mem-field row" }, h("span", null, "Erosync 켜기"), sw),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "인물마다 성향·관계를 따로 읽어 두고, 다음 응답에서 누가 무엇을 향해 움직일지 계획해 요청에 넣어요. 기본 꺼짐이에요."),
    h("p", { class: "rb-muted", style: "white-space:normal" }, EROSYNC_COST_NOTE),
    h("p", { class: "rb-muted", style: "white-space:normal" }, "인물 성향·목표는 인물 위키(요약·관계·상세 정보)에서, 관계망은 인물 관계도의 ‘Erosync 목표·경쟁만 보기’에서 봐요. 읽기만 하고, 고치기는 Erosync 화면에서 해요."),
    overlap,
    h("p", { class: "rb-muted", style: "white-space:normal" }, "원래 ‘Erosync’ 플러그인과 같이 켜 둘 수 없어요. 저장된 프로필·기록은 같은 키를 써서 이어서 읽어요."),
    h("div", { class: "rb-mem-sact" }, openBtn),
    note);
}
