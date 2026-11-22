// 장기기억 애드온(인간다움 2단계): 묘사 지침(심리학·해부학 조각) 설정 — 켜기/끄기 스위치 + 조각 보기·끄기·직접 추가.
// 저장은 idx.settings.inject.guides(켜기)와 idx.settings.guides.{off:[id], custom:[{id, area, topic, keys, line}]}. 조각 목록은 누를 때만 읽는다.
import { h, replace } from "../../dom.js";
import { btn, modal, note, switchEl, setSwitch } from "../../kit.js";
import { editForm } from "./editrows.js";

const AREA = { psych: "심리", body: "몸" };
const CF = [{ k: "area", label: "분야", type: "select", def: "psych", opts: Object.entries(AREA) }, { k: "topic", label: "주제(같은 주제는 한 번에 하나만)", len: 20 },
  { k: "keys", label: "글에 이 말이 나오면(| 로 나눔, 예: 울|눈물)", len: 120 }, { k: "line", label: "지침(행동으로, 2~3줄)", type: "area", len: 300 }];
const okKeys = (s) => { try { new RegExp(s); return !!s.trim(); } catch { return false; } };

export function guidesRow(ctx, idx, save) {
  const on = idx.settings?.inject?.guides !== false, g = idx.settings?.guides ?? {};
  const n = (g.off ?? []).length, c = (g.custom ?? []).length;
  return h("div", { class: "rb-srow" }, h("span", { class: "t" }, h("span", null, "묘사 지침 (심리학·해부학)"),
    h("small", null, `지금 장면·인물 상태에 맞는 지침만 한 번에 2개까지 넣어 감정·몸 묘사를 현실적으로 해요. AI 호출은 늘지 않아요.${n ? ` 끈 조각 ${n}개.` : ""}${c ? ` 직접 쓴 조각 ${c}개.` : ""}`),
    h("span", null, btn("조각 보기·고치기", { size: "sm", id: "rb-guides-open", onClick: () => openGuides(ctx, idx, save).catch((e) => ctx.toast?.(e?.message ?? String(e), { error: true })) }))),
  switchEl(on, { label: "묘사 지침", onChange: (v, el) => { setSwitch(el, v); save((st) => { st.inject ??= {}; st.inject.guides = v; }); } }));
}

async function openGuides(ctx, idx, save) {
  const { GUIDES } = await import("../../../data/guidelib.js");
  const g = idx.settings?.guides ?? {}, off = new Set(g.off ?? []);
  let custom = (g.custom ?? []).map((x) => ({ ...x })), q = "";
  const list = h("div", { class: "rb-gd-list" });
  const paint = () => {
    const hit = (x) => !q || [x.line, x.topic, x.src].some((s) => String(s ?? "").includes(q));
    const row = (x, mine) => h("label", { class: ["rb-gd-row", off.has(x.id) && "off"] },
      h("input", { type: "checkbox", checked: !off.has(x.id) || null, "aria-label": `${x.topic} 켜기`, onChange: (e) => { e.target.checked ? off.delete(x.id) : off.add(x.id); paint(); } }),
      h("span", null, h("small", { class: "rb-muted" }, `${AREA[x.area] ?? x.area} · ${x.topic}${x.src ? ` · ${x.src}` : ""}`), h("span", null, x.line)),
      mine ? h("span", { class: "rb-er-acts" },
        h("button", { type: "button", class: "rb-bzb", title: "고치기", "aria-label": "조각 고치기", onClick: (e) => { e.preventDefault(); edit(x); } }, "✎"),
        h("button", { type: "button", class: "rb-bzb", title: "지우기", "aria-label": "조각 지우기", onClick: (e) => { e.preventDefault(); custom = custom.filter((y) => y.id !== x.id); off.delete(x.id); paint(); } }, "✕")) : null);
    const mine = custom.filter(hit), lib = GUIDES.filter(hit);
    replace(list, h("b", null, `직접 쓴 조각 ${custom.length}`), ...(mine.length ? mine.map((x) => row(x, true)) : [h("p", { class: "rb-muted" }, "아직 없어요.")]),
      h("b", null, `기본 조각 ${GUIDES.length - [...off].filter((id) => GUIDES.some((x) => x.id === id)).length}/${GUIDES.length} 켜짐`), ...lib.slice(0, 200).map((x) => row(x, false)));
  };
  const edit = async (x) => {
    const v = await editForm(ctx.win, x ? "조각 고치기" : "조각 추가", CF, x ?? {}); if (!v) return;
    if (!okKeys(v.keys)) { ctx.toast?.("‘글에 이 말이 나오면’ 칸을 다시 확인해 주세요(괄호 짝 등).", { error: true }); return; }
    if (x) Object.assign(x, v); else custom.push({ id: `u-${Date.now().toString(36)}`, ...v });
    paint();
  };
  paint();
  const ok = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", id: "rb-guides", role: "dialog", "aria-modal": "true", "aria-label": "묘사 지침", style: "width:min(640px,96vw);max-height:88vh;display:flex;flex-direction:column;gap:8px" },
    h("h3", null, "묘사 지침 조각"), note("info", "체크를 끄면 그 조각은 넣지 않아요. 직접 쓴 조각은 기본 조각보다 먼저 골라요."),
    h("div", { class: "rb-mem-edrow", style: "gap:6px" }, h("input", { class: "rb-input", placeholder: "찾기(예: 술, 애도)", "aria-label": "조각 찾기", style: "flex:1", onInput: (e) => { q = e.target.value.trim(); paint(); } }), btn("+ 조각", { size: "sm", onClick: () => edit(null) })),
    h("div", { style: "overflow:auto;flex:1" }, list),
    h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(false) }), btn("저장", { kind: "primary", id: "rb-guides-save", onClick: () => done(true) }))));
  if (ok) await save((st) => { st.guides = { ...(st.guides ?? {}), off: [...off], custom }; });
}

export const GUIDES_CSS = `.rb-gd-list{display:flex;flex-direction:column;gap:6px}.rb-gd-list>b{margin-top:6px;font-size:12.5px}
.rb-gd-row{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:var(--rb-surf2);font-size:12.5px;cursor:pointer}.rb-gd-row>span:nth-child(2){display:flex;flex-direction:column;gap:2px;flex:1}
.rb-gd-row.off{opacity:.55}`;
