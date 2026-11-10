// 기능 찾기 화면(홈의 검색창): 낱말로 기능을 찾아 그 자리로 데려다준다. 목록은 engine/featurefind.js + 탭 목록.
import { h, replace } from "../dom.js";
import { icon } from "../icons.js";
import { FEATURES, findFeatures } from "../../engine/featurefind.js";
import { TABS, SECTION_NAMES, tabHidden } from "../tabs.js";

const ADDON_NAME = { memory: "장기 기억", erosync: "Erosync", cards: "기억 카드" };

// 탭 자체도 찾을 수 있게: 이름·설명을 항목으로 바꾼다(숨겨진 탭 제외).
export function tabFeatures(ui) {
  return TABS.filter((t) => t.id !== "home" && !t.mobileOnly && !tabHidden(t, ui))
    .map((t) => ({ t: t.label, k: `${t.desc ?? ""} ${t.card ?? ""}`, path: `${t.section ? `${SECTION_NAMES[t.section]} › ` : ""}${t.label}`, tab: t.id, isTab: true }));
}

const HEADS = "h2,h3,h4,summary,legend,b,.t";
function findByText(root, text) {
  const all = [...root.querySelectorAll(HEADS)];
  return all.find((el) => el.textContent.trim().startsWith(text)) ?? all.find((el) => el.textContent.includes(text)) ?? null;
}
function flash(el) {
  for (let d = el.closest("details"); d; d = d.parentElement?.closest("details")) d.open = true;
  const box = el.closest("article,section,.rb-srow,.rb-card") ?? el;
  try { box.scrollIntoView({ block: "center" }); } catch { /* 옛 브라우저 */ }
  box.classList.add("rb-found"); setTimeout(() => box.classList.remove("rb-found"), 1800);
}

// 그 기능이 있는 화면으로 가서, 제목을 찾아 스크롤하고 잠깐 강조한다. 못 찾으면 위치를 글로 알려 준다.
export function openFeature(ctx, f) {
  if (f.off) { ctx.toast(`‘${ADDON_NAME[f.addon] ?? f.addon}’ 애드온을 켜면 쓸 수 있어요. 홈 → 애드온에서 켤 수 있어요.`); return; }
  if (f.mem) Object.assign(ctx.state.mem ??= {}, f.mem);
  ctx.go(f.tab, f.sub ?? null);
  if (!f.find) return;
  let tries = 0;
  const timer = setInterval(() => {
    const el = findByText(ctx.main, f.find);
    if (el) { clearInterval(timer); flash(el); return; }
    if (++tries < 24) return;
    clearInterval(timer);
    const adv = f.adv ? findByText(ctx.main, "고급 모드") : null;
    if (adv) { flash(adv); ctx.toast(`‘고급 모드’를 켜면 바로 아래에 나와요 · ${f.t}`); }
    else ctx.toast(`여기에서 찾을 수 있어요 · ${f.path}`);
  }, 150);
}

export function renderFeatureFind(ctx, host, q) {
  const has = (id) => !!ctx.ext?.get?.("svc", id);
  const rows = findFeatures(q, [...FEATURES, ...tabFeatures(ctx.prefs.ui)], { has });
  const row = (f) => h("button", { type: "button", class: ["rb-card", "bordered", "rb-srow", "rb-me-entry", "rb-ff-row", f.off && "off"], onClick: () => openFeature(ctx, f) },
    h("span", { class: "t" }, h("b", null, f.t), h("small", null, f.path, f.adv ? " · 고급 모드" : "", f.off ? " · 애드온 꺼짐" : "")), icon("chevron", 16));
  replace(host, h("section", { class: "rb-ff", id: "rb-ff", "aria-label": "기능 찾기 결과" },
    h("h2", null, `‘${q.trim()}’ 찾기`),
    rows.length ? h("div", { class: "rb-ff-list" }, rows.map(row))
      : h("p", { class: "rb-muted", id: "rb-ff-empty" }, "맞는 기능을 찾지 못했어요. 다른 낱말로 찾아보세요. (예: 생리, 호감, 테마, 백업, API)")));
}
