// Erosync '인물 골라서 분석': 이 봇의 로어북 항목 중 분석할 인물만 골라 돌린다(전체 분석보다 호출이 적다).
// 목록·시작은 본체의 '인물 로어북 분석' 흐름(ctx.erosync.profile("lore") / ("start","lore",ids))을 쓴다.
import { h, replace } from "../../dom.js";
import { btn, modal, badge } from "../../kit.js";

// 모양은 여기 인라인으로 둔다(애드온만 먼저 배포돼도 코어 CSS 없이 같은 모양).
const LIST = "display:flex;flex-direction:column;gap:6px;overflow:auto;min-height:120px;max-height:46vh;padding:2px";
const ROW = "display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--rb-line2);border-radius:var(--rb-r2);cursor:pointer;min-height:var(--rb-ctl)";
const norm = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
// 검색어에 맞는 항목만(순수). 빈 검색어면 전부.
export const filterEntries = (entries, q) => { const k = norm(q); return k ? entries.filter((e) => norm(e.title).includes(k)) : entries; };

// 고르기 창을 열고, 고른 항목 id 배열(취소면 null)을 돌려준다.
export async function pickLoreEntries(ctx) {
  const got = await ctx.erosync.profile("lore");
  if (!got?.ok) { ctx.toast(got?.reason || "인물 목록을 읽지 못했어요", { error: true }); return null; }
  const entries = got.entries ?? [];
  if (!entries.length) { ctx.toast("이 봇의 로어북에서 고를 항목을 찾지 못했어요. ‘전체 인물로 만들기’을 써 주세요."); return null; }
  const max = got.max ?? 2000, picked = new Set(entries.filter((e) => e.picked).map((e) => e.id));
  let q = "";
  return modal(ctx.win, (done) => {
    const list = h("div", { class: "rb-ero-picklist", style: LIST, role: "group", "aria-label": "분석할 인물" });
    const count = h("span", { class: "rb-muted", role: "status" });
    const go = btn("분석", { kind: "primary", id: "rb-ero-pick-go", onClick: () => done([...picked]) });
    const sync = () => { count.textContent = `${picked.size}명 고름 · 전체 ${entries.length}개`; go.disabled = !picked.size || picked.size > max; go.textContent = picked.size ? `고른 ${picked.size}명 분석` : "분석"; };
    const paint = () => {
      const rows = filterEntries(entries, q);
      replace(list, rows.length ? rows.map((e) => h("label", { class: "rb-check rb-ero-pickrow", style: ROW },
        h("input", { class: "rb-input rb-ero-pickcb", type: "checkbox", style: "flex:none;width:18px;height:18px;min-height:0;padding:0", checked: picked.has(e.id), "data-id": e.id, onChange: (ev) => { if (ev.target.checked) picked.add(e.id); else picked.delete(e.id); sync(); } }),
        h("span", { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere" }, h("b", null, e.title), h("small", { class: "rb-muted" }, `${Number(e.chars ?? 0).toLocaleString()}자`)),
        e.analysed ? badge("분석됨") : null)) : h("p", { class: "rb-muted" }, "맞는 항목이 없어요."));
    };
    const search = h("input", { class: "rb-input", type: "search", placeholder: "이름으로 찾기", "aria-label": "인물 찾기", onInput: (ev) => { q = ev.target.value; paint(); } });
    const all = btn("보이는 것 모두", { size: "sm", onClick: () => { for (const e of filterEntries(entries, q)) picked.add(e.id); paint(); sync(); } });
    const none = btn("모두 해제", { size: "sm", onClick: () => { picked.clear(); paint(); sync(); } });
    paint(); sync();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", id: "rb-ero-pick", style: "width:min(560px,96vw);max-height:88vh;display:flex;flex-direction:column;gap:10px" },
      h("h3", null, "분석할 인물 고르기"),
      h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "이 봇의 로어북 항목이에요. 인물 설명이 담긴 것만 골라 주세요. 고른 인물만 분석해서 전체 분석보다 AI 호출이 적어요."),
      search, h("div", { class: "rb-mem-sact" }, all, none, h("span", { style: "flex:1" }), count),
      list,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), go));
  });
}
