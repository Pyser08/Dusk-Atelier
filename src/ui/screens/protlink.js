// 관리 → ProtLink+ (v1.9.2): Proton Drive 링크로 봇·모듈·프리셋·플러그인 받기. 링크 추가·미리보기·받기 화면은 ProtLink+ 본체가 그리고,
// 이 화면은 켜기/끄기와 링크 목록, 열기 입구만 맡는다.
import { h, replace } from "../dom.js";
import { btn, emptyState, pageHead, statusCard } from "../kit.js";
import { icon } from "../icons.js";
import { plKind } from "../../widgethome/extras.js";

const ago = (t) => {
  const d = Date.now() - t;
  if (!t || d < 0) return "";
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}분 전`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}시간 전`;
  return `${Math.round(d / 86400e3)}일 전`;
};
export async function renderProtLink(ctx) {
  const pl = ctx.protlink;
  const body = h("div", { class: "rb-flds", id: "rb-protlink-body", style: "display:grid;gap:12px" });
  const head = h("div", { id: "rb-protlink-head" });
  replace(ctx.main, h("div", { class: "rb-section" }, head, body));
  if (!pl) { replace(body, emptyState({ title: "ProtLink+를 쓸 수 없어요", text: "이 환경에서는 ProtLink+가 준비되지 않았어요." })); return; }
  async function open(id) {
    const ok = await pl.open(id);
    if (!ok) ctx.toast(pl.lastError() || "ProtLink+를 열지 못했어요", { error: true });
  }
  async function paint() {
    const on = pl.on(), running = pl.isRunning();
    const original = await pl.originalInstalled().catch(() => false);
    replace(head, pageHead("ProtLink+", { sub: "Proton Drive 링크로 받기", sw: { on, label: "ProtLink+", text: "사용", onChange: async (v) => { await pl.set(v); await paint(); } } }));
    const kids = [];
    if (original && on) kids.push(statusCard("err", "원래 ‘ProtLink+’ 플러그인이 같이 켜져 있어요. 업데이트 알림이 두 번 떠서, 원래 플러그인을 끄면 여기서 쓸 수 있어요."));
    else if (!on) kids.push(statusCard("off", "꺼져 있어요. 위 스위치를 켜면 링크를 추가하고 받을 수 있어요."));
    else if (running) kids.push(statusCard("on", "링크를 추가하거나 목록에서 눌러 받을 수 있어요.", { label: "ProtLink+ 열기", kind: "primary", onClick: () => open() }));
    else kids.push(statusCard(pl.lastError() ? "err" : "prep", pl.lastError() || "시작하는 중이에요.", pl.lastError() ? { label: "다시 시도", onClick: async () => { await pl.boot(); await paint(); } } : undefined));
    if (on && running) {
      const r = await pl.links();
      const rows = r.items.map((x) => h("button", { type: "button", class: "rb-srow rb-toolrow", "data-id": x.id, onClick: () => open(x.id) },
        h("span", { class: "ico", "aria-hidden": "true" }, icon("link", 18)),
        h("span", { class: "t" }, x.name, h("small", null, [plKind(x.kind), x.count ? `${x.count}개 파일` : "아직 확인 전", x.error ? "확인 실패" : "", ago(x.at)].filter(Boolean).join(" · "))),
        h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))));
      kids.push(h("section", { class: "rb-card bordered rb-scard", id: "rb-protlink-list" }, h("span", { class: "h" }, `내 링크${r.items.length ? ` · ${r.items.length}개` : ""}`),
        ...(rows.length ? rows : [h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "아직 링크가 없어요. ‘ProtLink+ 열기’에서 Proton Drive 링크를 추가해 보세요.")])));
    }
    kids.push(h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "링크의 파일은 눌러서 고른 것만 받아요. 시작할 때 새 파일이 있는지 확인하는 기능은 ProtLink+ 안의 설정에서 끌 수 있어요. 위젯 홈에서도 같은 링크를 바로 열 수 있어요."));
    replace(body, ...kids);
  }
  await paint();
}
