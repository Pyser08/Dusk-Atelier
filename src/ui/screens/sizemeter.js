// 도구 → 용량 측정 (v1.9.2): 봇·모듈·플러그인·플러그인 저장소가 얼마나 차지하는지, 꺼진 것의 낭비 용량, 화면 렌더에 끼어드는 것 찾기. 읽기 전용.
// 바탕이 된 아이디어: RisuMeter (스페셜 땡스)
import { pct } from "../../engine/sizemeter.js";
import { scanSizes } from "../../data/sizemeter.js";
import { fmtBytes, h, replace } from "../dom.js";
import { btn, emptyState, note, progressBar, segmented } from "../kit.js";

const TABS = [["all", "전체"], ["characters", "캐릭터"], ["modules", "모듈"], ["plugins", "플러그인"], ["storage", "저장소"]];
const CATS = [["characters", "캐릭터", "var(--rb-acc)"], ["modules", "모듈", "var(--rb-ok)"], ["plugins", "플러그인", "var(--rb-warn)"], ["storage", "저장소", "var(--rb-mute)"]];
const COLOR = Object.fromEntries(CATS.map(([k, , c]) => [k, c]));
const PAGE = 60;
const hhmm = (t) => `${String(new Date(t).getHours()).padStart(2, "0")}:${String(new Date(t).getMinutes()).padStart(2, "0")}`;
const tag = (text, tone = "") => h("span", { class: ["rb-sz-tag", tone] }, text);

function pool(st) {
  const rep = st.scan.report;
  let list = st.tab === "all" ? rep.all : rep.items[st.tab];
  const canFilter = st.tab === "all" || st.tab === "modules" || st.tab === "plugins";
  if (canFilter && st.filter === "off") list = list.filter((x) => (x.kind === "modules" || x.kind === "plugins") && !x.active);
  else if (canFilter && st.filter === "render") list = list.filter((x) => x.render?.hasHook);
  const q = st.q.trim().toLowerCase();
  if (q) list = list.filter((x) => `${x.name} ${x.kindLabel} ${x.statusLabel ?? ""} ${x.group ?? ""}`.toLowerCase().includes(q));
  list = list.slice();
  if (st.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  else if (canFilter && st.filter === "render") list.sort((a, b) => Number(!!b.active) - Number(!!a.active) || (b.render.score - a.render.score) || b.bytes - a.bytes);
  else list.sort((a, b) => b.bytes - a.bytes);
  return { list, canFilter };
}

function detailOf(it) {
  const kids = [];
  if (it.render?.hasHook) {
    const state = it.kind === "characters" || it.kind === "storage" ? "" : it.active ? "지금 켜져 있어서 실행돼요. " : "지금 꺼져 있어서 실행되지는 않아요. ";
    kids.push(note(it.active && it.render.score >= 3 ? "warn" : "info", state + it.render.reasons.join(" · ")));
  }
  if (it.kind === "modules") {
    const chips = [];
    if (it.isGlobal) chips.push(tag("글로벌 활성 · 모든 캐릭터", "ok"));
    for (const c of it.linkedChars) chips.push(tag(`${c.name}${!c.charLinked && c.chatCount ? ` · 채팅 ${c.chatCount}개` : ""}`, "acc"));
    kids.push(h("div", null, h("div", { class: "rb-sz-lab" }, `연결된 캐릭터${it.linkedChars.length ? ` · ${it.linkedChars.length}명` : ""}`), chips.length ? h("div", { class: "rb-sz-chips" }, chips) : h("span", { class: "rb-muted", style: "font-size:12.5px" }, it.parked ? "Dusk에서 꺼 둔 모듈이라 어디에도 적용되지 않아요." : "연결된 캐릭터가 없어요.")));
  } else if (it.kind === "characters" && it.linkedModules?.length) {
    kids.push(h("div", null, h("div", { class: "rb-sz-lab" }, `개별 연결된 모듈 · ${it.linkedModules.length}개`), h("div", { class: "rb-sz-chips" }, it.linkedModules.map((m) => tag(`${m.name}${!m.charLinked && m.chatCount ? ` · 채팅 ${m.chatCount}개` : ""}`, "acc")))));
  } else if (it.kind === "storage") {
    kids.push(h("span", { class: "rb-muted", style: "font-size:12.5px" }, `묶음 ${it.group} · 모든 플러그인이 함께 쓰는 저장소의 키예요.`));
  }
  for (const p of it.parts) kids.push(h("div", { class: "rb-sz-part" }, h("span", null, p.label), h("b", null, `${fmtBytes(p.bytes)} · ${pct(p.bytes, it.bytes)}`)));
  return kids;
}

export function renderSizeMeter(ctx) {
  const st = (ctx.state.sizemeter ??= { tab: "all", filter: "all", sort: "size", q: "", open: new Set(), shown: PAGE, scan: null, run: null });
  const sumBox = h("div"), insightBox = h("div", { class: "rb-sz-insights" }), toolBox = h("div"), listBox = h("div"), runBox = h("div");
  const host = h("div", { class: "rb-sz-host" }, runBox, sumBox, insightBox, toolBox, listBox);
  let refreshBtn;

  const paintRun = () => {
    const r = st.run;
    if (!r) { replace(runBox); return; }
    const p = r.progress, bar = progressBar(p?.total ? (p.done / p.total) * 100 : 5);
    const label = p?.phase === "chars" ? `봇 ${p.done}/${p.total}개 재는 중` : p?.phase === "storage" ? (p.total ? `플러그인 저장소 ${p.done}/${p.total}개 재는 중` : "플러그인 저장소 재는 중") : "모듈·플러그인 재는 중";
    replace(runBox, h("section", { class: "rb-card bordered rb-sz-run", "aria-live": "polite" }, h("b", null, "용량을 재는 중이에요"), h("span", { class: "rb-muted" }, `${label} · 읽기만 하고 아무것도 바꾸지 않아요`), bar, btn("멈추기", { kind: "ghost", size: "sm", onClick: () => { r.cancel = true; } })));
  };

  const paintSummary = () => {
    if (!st.scan) { replace(sumBox); return; }
    const { totals, counts } = st.scan.report;
    const total = Math.max(1, totals.all);
    const legend = CATS.map(([k, label, color]) => h("button", { type: "button", class: "rb-sz-leg", "aria-pressed": String(st.tab === k), onClick: () => { st.tab = k; st.shown = PAGE; if (k === "characters" || k === "storage") st.filter = "all"; paintSummary(); paintTools(); paintList(); } },
      h("span", { class: "k" }, h("i", { style: `background:${color}` }), `${label} · ${pct(totals[k], totals.all)}`), h("b", null, fmtBytes(totals[k])), h("small", null, k === "storage" ? `키 ${counts.storage}개` : `${counts[k]}개`)));
    replace(sumBox, h("section", { class: "rb-card bordered rb-sz-sum" },
      h("div", { class: "rb-sz-total" }, h("b", null, fmtBytes(totals.all)), h("span", null, `JSON 크기 기준 · ${hhmm(st.scan.at)}에 쟀어요`)),
      h("div", { class: "rb-sz-bar", "aria-hidden": "true" }, CATS.map(([k, , color]) => h("i", { style: `width:${((totals[k] / total) * 100).toFixed(2)}%;background:${color}` }))),
      h("div", { class: "rb-sz-legend" }, legend)));
  };

  const goFilter = (f) => { st.tab = "all"; st.filter = f; st.shown = PAGE; paintSummary(); paintTools(); paintList(); };
  const paintInsights = () => {
    if (!st.scan) { replace(insightBox); return; }
    const { waste, render, counts } = st.scan.report;
    const out = [];
    if (waste.bytes >= 10 * 1024) out.push(h("div", { class: "rb-sz-insight" }, note("warn", `꺼져 있거나 어디에도 연결되지 않은 모듈 ${waste.modules}개·플러그인 ${waste.plugins}개가 ${fmtBytes(waste.bytes)}를 차지해요.`), btn("비활성만 보기", { kind: "ghost", size: "sm", onClick: () => goFilter("off") })));
    if (render.plugins || render.modules) out.push(h("div", { class: "rb-sz-insight" }, note(render.pluginsHeavy ? "warn" : "info", `켜져 있는 플러그인 ${render.plugins}개·모듈 ${render.modules}개가 메시지를 그릴 때마다 끼어들어요.${render.pluginsHeavy ? ` 그중 플러그인 ${render.pluginsHeavy}개는 그 안에서 큰 데이터를 읽어요. 버튼을 누를 때 느리다면 먼저 확인해 보세요.` : ""}`), btn("렌더 개입만 보기", { kind: "ghost", size: "sm", onClick: () => goFilter("render") })));
    if (st.scan.charsMissing) out.push(note("info", `봇 ${st.scan.charsMissing}개를 읽지 못해 빠졌어요.`));
    if (!st.scan.storageOk) out.push(note("info", "플러그인 저장소 목록을 읽지 못해 저장소는 빠졌어요."));
    if (st.scan.cancelled) out.push(note("info", "중간에 멈춰서 읽은 만큼만 보여요."));
    if (!counts.all) out.push(emptyState({ icon: "info", title: "잴 항목이 없어요" }));
    replace(insightBox, ...out);
  };

  const paintTools = () => {
    if (!st.scan) { replace(toolBox); return; }
    const { canFilter } = pool(st);
    const search = h("input", { class: "rb-input", type: "search", placeholder: "이름으로 찾기", value: st.q, "aria-label": "이름으로 찾기" });
    let t = null;
    search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { st.q = search.value; st.shown = PAGE; paintList(); }, 200); });
    replace(toolBox, h("div", { class: "rb-sz-tools" },
      h("div", { style: "width:100%;overflow-x:auto" }, segmented(TABS, st.tab, (v) => { st.tab = v; st.shown = PAGE; if (v === "characters" || v === "storage") st.filter = "all"; paintSummary(); paintTools(); paintList(); }, "분류")),
      search,
      canFilter ? segmented([["all", "모두"], ["off", "비활성"], ["render", "렌더 개입"]], st.filter, (v) => { st.filter = v; st.shown = PAGE; paintList(); }, "필터") : null,
      segmented([["size", "용량순"], ["name", "이름순"]], st.sort, (v) => { st.sort = v; paintList(); }, "정렬")));
  };

  const row = (it, i, denom) => {
    const open = st.open.has(it.key);
    const barW = Math.min(100, Math.max(0.5, (it.bytes / Math.max(1, denom)) * 100)).toFixed(2);
    const detail = h("div", { class: "rb-sz-detail", hidden: !open }, open ? detailOf(it) : null);
    const wrap = h("div", { class: ["rb-sz-item", open && "open"], dataset: { key: it.key } });
    const head = h("button", { type: "button", class: "rb-sz-head2", "aria-expanded": String(open), onClick: () => {
      const now = !st.open.has(it.key);
      if (now) { st.open.add(it.key); replace(detail, ...detailOf(it)); } else st.open.delete(it.key);
      detail.hidden = !now;
      wrap.classList.toggle("open", now);
      head.setAttribute("aria-expanded", String(now));
    } },
      h("span", { class: "rb-sz-rank" }, `#${i + 1}`),
      h("span", { class: "rb-sz-main" },
        h("span", { class: "rb-sz-titles" },
          st.tab === "all" ? tag(it.kindLabel, it.kind === "characters" ? "acc" : it.kind === "modules" ? "ok" : it.kind === "plugins" ? "warn" : "") : null,
          h("span", { class: "rb-sz-name" }, it.name),
          it.statusLabel ? tag(it.statusLabel, it.statusTone) : null,
          it.render?.hasHook && (it.kind === "modules" || it.kind === "plugins") ? tag(it.render.badge, it.active ? it.render.tone : "") : null,
          it.badge ? tag(it.badge) : null,
          it.kind === "storage" ? tag(it.group) : null),
        h("span", { class: "rb-sz-mini" }, h("i", { style: `width:${barW}%;background:${COLOR[it.kind]}` }))),
      h("span", { class: "rb-sz-size" }, h("b", null, fmtBytes(it.bytes)), h("small", null, pct(it.bytes, denom))),
      h("span", { class: "rb-sz-chev", "aria-hidden": "true" }, "›"));
    wrap.append(head, detail);
    return wrap;
  };

  const paintList = () => {
    if (!st.scan) { replace(listBox); return; }
    const { list } = pool(st);
    const t = st.scan.report.totals, denom = st.tab === "all" ? t.all : t[st.tab];
    if (!list.length) { replace(listBox, h("div", { class: "rb-card bordered pad rb-muted", style: "text-align:center" }, "조건에 맞는 항목이 없어요")); return; }
    const rows = list.slice(0, st.shown).map((it, i) => row(it, i, denom));
    const rest = list.length - rows.length;
    replace(listBox,
      h("div", { class: "rb-card bordered rb-sz-list" }, rows, rest > 0 ? h("div", { class: "rb-sz-more" }, btn(`나머지 ${rest}개 더 보기`, { kind: "ghost", onClick: () => { st.shown += PAGE; paintList(); } })) : null),
      h("p", { class: "rb-sz-foot" }, "JSON 크기로 잰 값이라 실제 저장 파일 크기와 조금 다를 수 있어요. 기타 설정(페르소나·CSS 등)과 프롬프트 프리셋은 빠져요."));
  };

  const paintAll = () => { paintRun(); paintSummary(); paintInsights(); paintTools(); paintList(); refreshBtn.disabled = !!st.run; };

  // 측정 중에 다른 화면에 갔다 돌아와도 이어서 보이도록, 지금 떠 있는 화면의 그리기 함수를 상태에 둔다
  const start = () => {
    if (st.run) return;
    const run = (st.run = { cancel: false, progress: null });
    paintAll();
    scanSizes(ctx.api, { cancelled: () => run.cancel, onProgress: (p) => { run.progress = p; if (st.host?.isConnected && st.run === run) st.paintRun(); } })
      .then((res) => { st.scan = res; st.open.clear(); st.shown = PAGE; })
      .catch((e) => { if (st.host?.isConnected) ctx.toast(e?.message ?? String(e), { error: true }); })
      .finally(() => { st.run = null; if (st.host?.isConnected) st.paintAll(); });
  };

  refreshBtn = btn("다시 측정", { kind: "ghost", icon: "refresh", onClick: start });
  const back = btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") });
  back.setAttribute("aria-label", "도구로 돌아가기");
  replace(ctx.main, h("div", { class: "rb-section rb-scroll rb-sz" },
    h("div", { class: "rb-sz-head" }, back, h("div", { style: "flex:1;min-width:0" }, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "용량 측정")), refreshBtn),
    h("p", { class: "rb-p" }, "봇·모듈·플러그인이 얼마나 차지하는지, 꺼 두고도 자리만 차지하는 것과 화면을 그릴 때 느려지게 만드는 것을 찾아요. 읽기만 하고 아무것도 바꾸지 않아요."),
    host));
  st.host = host;
  st.paintAll = paintAll;
  st.paintRun = paintRun;
  if (!st.scan && !st.run) start();
  else paintAll();
}
