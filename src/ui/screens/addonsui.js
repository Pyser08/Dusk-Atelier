// 설정 탭 '애드온 (시험)' 카드(2.0.0): 목록 받기 · 애드온 받기/업데이트/켜고 끄기/지우기. 데이터는 data/addons.js.
import { h, replace } from "../dom.js";
import { btn, switchEl } from "../kit.js";
import { rowState } from "../../engine/addons.js";

const STATE = { available: "받을 수 있어요", update: "새 버전이 있어요", installed: "켜져 있어요", off: "꺼져 있어요", "needs-core": "Dusk를 먼저 업데이트해야 해요" };

export function addonCard(ctx, card) {
  const A = ctx.addons;
  if (!A) return null;
  const body = h("div", { class: "rb-addons", id: "rb-addons" });
  const fail = (e) => ctx.toast(`애드온: ${e?.message ?? e}`, { error: true });
  const busy = async (fn) => { try { await fn(); } catch (e) { fail(e); } await paint(); };
  // 받기·업데이트: 그 줄에 '받는 중…'을 띄우고 버튼을 잠근다(다른 줄·화면은 그대로)
  const getting = (id, label) => async (ev) => {
    const row = ev?.currentTarget?.closest?.("[data-addon]");
    if (row) { row.querySelectorAll("button,[role=switch]").forEach((b) => { b.disabled = true; }); const sm = row.querySelector(".t small"); if (sm) sm.textContent = `${label} 중…`; }
    await busy(() => A.install(id));
  };
  async function paint() {
    const idx = await A.getIndex();
    let list = A.manifest();
    if (!list) { replace(body, h("p", { class: "rb-muted" }, "목록 불러오는 중…")); list = await A.loadManifest().catch((e) => { replace(body, h("p", { class: "rb-muted" }, `목록을 받지 못했어요: ${e?.message ?? e}`)); return null; }); if (!list) return; }
    const core = A.core?.() ?? ctx.version;
    const rows = list.map((a) => {
      const cur = idx[a.id], st = rowState(a, cur, core), on = !!cur && cur.on !== false;
      const info = [cur ? `v${cur.version}` : `v${a.version}`, STATE[st], cur?.pendingRestart ? "새로고침하면 새 버전이 적용돼요" : "", cur?.rolledBack ? `v${cur.rolledBack}에서 오류가 나 되돌렸어요` : "", cur?.error ? `오류: ${cur.error}` : "", cur && on ? (A.running(a.id) ? "작동 중" : "멈춤") : ""].filter(Boolean).join(" · ");
      return h("div", { class: "rb-srow", dataset: { addon: a.id } },
        h("span", { class: "t" }, a.name, h("small", null, `${a.desc ? a.desc + " " : ""}${info}`)),
        h("span", { style: "display:flex;gap:6px;align-items:center" },
          !cur && st === "available" ? btn("받기", { size: "sm", kind: "primary", onClick: getting(a.id, "받는") }) : null,
          st === "update" ? btn("업데이트", { size: "sm", kind: "primary", onClick: getting(a.id, "업데이트하는") }) : null,
          cur ? switchEl(on, { label: `${a.name} 켜기`, onChange: (v) => busy(() => A.setOn(a.id, v)) }) : null,
          cur ? btn("지우기", { size: "sm", onClick: () => busy(() => A.remove(a.id)) }) : null));
    });
    const err = A.lastError();
    replace(body, ...rows, err ? h("p", { class: "rb-muted" }, `업데이트 확인 실패: ${err}`) : null,
      h("div", { style: "display:flex;justify-content:flex-end;padding:6px 0" }, btn("업데이트 확인", { size: "sm", id: "rb-addon-check", onClick: () => busy(async () => { const r = await A.check({ force: true }); ctx.toast(r.error ? `확인 실패: ${r.error}` : r.updates.length ? `${r.updates.length}개 업데이트했어요` : "모두 최신이에요"); }) })));
  }
  paint();
  return card("애드온 (시험)", h("p", { class: "rb-muted", style: "margin:0 0 6px" }, "필요한 기능만 받아서 써요. 리스 플러그인 목록에는 안 뜨고, 자동으로 업데이트돼요."), body);
}
