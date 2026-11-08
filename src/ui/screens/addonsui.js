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
  // 받기·업데이트: 여러 개를 동시에 받을 수 있다. 받는 중인 줄은 다시 그려도 '받는 중…'으로 남는다(A.installing)
  const getting = (id) => () => { const p = busy(() => A.install(id)); paint(); return p; };
  const getAll = (ids) => async () => {
    const p = A.installMany(ids); paint();
    const r = await p, bad = r.filter((x) => !x.ok);
    ctx.toast(bad.length ? `${r.length - bad.length}개 받았어요 · 실패 ${bad.map((x) => `${x.id}(${x.error})`).join(", ")}` : `${r.length}개 모두 받았어요`, bad.length ? { error: true } : undefined);
    await paint();
  };
  async function paint() {
    const idx = await A.getIndex();
    let list = A.manifest();
    if (!list) { replace(body, h("p", { class: "rb-muted" }, "목록 불러오는 중…")); list = await A.loadManifest().catch((e) => { replace(body, h("p", { class: "rb-muted" }, `목록을 받지 못했어요: ${e?.message ?? e}`)); return null; }); if (!list) return; }
    const core = A.core?.() ?? ctx.version;
    const rows = list.map((a) => {
      const cur = idx[a.id], st = rowState(a, cur, core), on = !!cur && cur.on !== false, going = !!A.installing?.(a.id);
      const info = [cur ? `v${cur.version}` : `v${a.version}`, STATE[st], cur?.pendingRestart ? "새로고침하면 새 버전이 적용돼요" : "", cur?.rolledBack ? `v${cur.rolledBack}에서 오류가 나 되돌렸어요` : "", cur?.error ? `오류: ${cur.error}` : "", cur && on ? (A.running(a.id) ? "작동 중" : "멈춤") : ""].filter(Boolean).join(" · ");
      return h("div", { class: "rb-srow", dataset: { addon: a.id } },
        h("span", { class: "t" }, a.name, h("small", null, `${a.desc ? a.desc + " " : ""}${info}`)),
        h("span", { style: "display:flex;gap:6px;align-items:center" },
          going ? h("small", { class: "rb-muted" }, cur ? "업데이트하는 중…" : "받는 중…") : null,
          !going && !cur && st === "available" ? btn("받기", { size: "sm", kind: "primary", onClick: getting(a.id) }) : null,
          !going && st === "update" ? btn("업데이트", { size: "sm", kind: "primary", onClick: getting(a.id) }) : null,
          cur ? switchEl(on, { label: `${a.name} 켜기`, onChange: (v) => busy(() => A.setOn(a.id, v)) }) : null,
          cur ? btn("지우기", { size: "sm", onClick: () => busy(() => A.remove(a.id)) }) : null));
    });
    const err = A.lastError();
    const todo = list.filter((a) => !A.installing?.(a.id) && ["available", "update"].includes(rowState(a, idx[a.id], core))).map((a) => a.id);
    const allBtn = todo.length > 1 ? btn(`모두 받기·업데이트 (${todo.length})`, { size: "sm", kind: "primary", id: "rb-addon-all", onClick: getAll(todo) }) : null;
    // 업데이트 확인 버튼은 fresh: 커밋 고정 주소로 받아 방금 올린 업데이트도 바로(addons.js pinFresh)
    replace(body, ...rows, err ? h("p", { class: "rb-muted" }, `업데이트 확인 실패: ${err}`) : null,
      h("div", { style: "display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:6px 0" }, allBtn, btn("업데이트 확인", { size: "sm", id: "rb-addon-check", onClick: () => busy(async () => { const r = await A.check({ force: true, fresh: true }); ctx.toast(r.error ? `확인 실패: ${r.error}` : r.updates.length ? `${r.updates.length}개 업데이트했어요` : "모두 최신이에요"); }) })));
  }
  paint();
  return card("애드온 (시험)", h("p", { class: "rb-muted", style: "margin:0 0 6px" }, "필요한 기능만 받아서 써요. 리스 플러그인 목록에는 안 뜨고, 자동으로 업데이트돼요."), body);
}
