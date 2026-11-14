// 2.2.0 프로바이더 ‘한눈에’(3번 목업 B+D): 사용·예산 줄 → 용도 표(칸에서 프로필 바로 바꾸기) → 프로필 카드(생각·캐시) + 사용량 14일·연결.
// 자세한 편집은 기존 ‘연결’·‘프로필’·‘용도’ 탭 그대로. 여기서는 자주 바꾸는 값만.
import { h } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, segmented, emptyState } from "../../kit.js";
import { PURPOSES, PURPOSE_LABEL, kindOf } from "../../../engine/provider/catalog.js";
import { summarize } from "../../../engine/provider/cost.js";
import { usd } from "./ui.js";

var EFFORT = [["", "기본"], ["none", "끔"], ["medium", "중간"], ["high", "강하게"]];
var EFFORT_KO = { "": "기본", none: "끔", low: "약하게", medium: "중간", high: "강하게", xhigh: "최고" };
var CLAUDE = (k) => k === "anthropic" || k === "vertex" || k === "openrouter";
// 용도가 실제로 쓰는 프로필: 지정 → (메인이 아니면) 보조 → 메인
export function effectiveProfile(cfg, purpose) {
  const own = cfg.purposes?.[purpose]?.profileId;
  if (own) return own;
  if (purpose !== "main" && cfg.subProfileId) return cfg.subProfileId;
  return cfg.purposes?.main?.profileId || "";
}
// 최근 n일 날짜별 비용(빈 날은 0)
export function dailyCosts(log, days = 14, now = Date.now()) {
  const g = summarize(log ?? [], { by: "d", days, now }).groups;
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(now - i * 864e5).toISOString().slice(0, 10); out.push({ d, cost: g[d]?.cost ?? 0 }); }
  return out;
}

export async function glancePanel({ P, cfg, mutate, draw, st }) {
  if (!cfg.connections.length) return [emptyState({ icon: "network", title: "연결이 없어요", text: "‘연결’에서 키를 넣으면 여기서 용도·프로필·사용량을 한눈에 봐요." }), h("div", { class: "rb-actions" }, btn("연결 추가하러 가기", { kind: "primary", icon: "plus", onClick: () => { st.tab = "conn"; draw(); } }))];
  const log = await P.store.usage();
  const all = summarize(log), byPurpose = summarize((log ?? []).filter((r) => String(r.d ?? "").startsWith(new Date().toISOString().slice(0, 7))), { by: "purpose" }).groups, monthOf = (k) => byPurpose[k]?.cost ?? 0;
  const pById = Object.fromEntries(cfg.profiles.map((p) => [p.id, p])), cById = Object.fromEntries(cfg.connections.map((c) => [c.id, c]));
  const lim = cfg.budget.monthlyUsd || 0, month = all.total.month;
  const goTab = (t, extra) => { st.tab = t; Object.assign(st, extra ?? {}); draw(); };

  // 예산 줄
  const bar = h("section", { class: "rb-pvx-bar" },
    h("span", { class: "rb-label" }, "이번 달"),
    lim > 0 ? h("span", { class: "rb-pvx-meter", role: "meter", "aria-valuenow": String(Math.round(month / lim * 100)), "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "월 예산 사용" }, h("i", { style: `width:${Math.min(100, month / lim * 100)}%` })) : null,
    h("b", null, usd(month)), h("span", { class: "rb-muted" }, lim > 0 ? `/ $${lim}` : "· 월 예산 없음"),
    h("span", { style: "flex:1" }),
    lim > 0 ? h("span", { class: "rb-muted", style: "font-size:12.5px" }, "넘으면") : null,
    lim > 0 ? segmented([["warn", "알림"], ["block", "멈춤"]], cfg.budget.action === "block" ? "block" : "warn", async (v) => { await mutate((x) => { x.budget.action = v; }); }, "예산을 넘으면") : btn("예산 정하기", { size: "sm", onClick: () => goTab("use") }));

  // 용도 표
  const opt = (p) => [["", p === "main" ? "(지정 안 함)" : "(보조·메인 따라감)"], ...cfg.profiles.map((q) => [q.id, q.name])];
  const table = h("table", { class: "rb-pvx-table" },
    h("thead", null, h("tr", null, h("th", null, "용도"), h("th", null, "프로필"), h("th", { class: "hm" }, "모델"), h("th", { class: "hm" }, "생각"), h("th", { class: "hm" }, "캐시"), h("th", { class: "hm num" }, "이번 달"))),
    h("tbody", null, PURPOSES.map((p) => {
      const eff = pById[effectiveProfile(cfg, p)], k = cById[eff?.connectionId]?.kind;
      const sel = h("select", { class: "rb-input", "aria-label": `${PURPOSE_LABEL[p]} 프로필`, onChange: async (e) => { const v = e.target.value; await mutate((x) => { x.purposes[p].profileId = v; }); draw(); } },
        opt(p).map(([v, t]) => h("option", { value: v, selected: v === (cfg.purposes[p]?.profileId ?? "") }, t)));
      return h("tr", { dataset: { purpose: p } },
        h("td", null, h("b", null, PURPOSE_LABEL[p])),
        h("td", null, sel),
        h("td", { class: "hm" }, eff?.model || "—"),
        h("td", { class: "hm" }, eff ? EFFORT_KO[eff.thinking.effort ?? ""] ?? "기본" : "—"),
        h("td", { class: "hm" }, eff && CLAUDE(k) ? (eff.cache.claude === "off" ? "끔" : eff.cache.claude) : "—"),
        h("td", { class: "hm num" }, usd(monthOf(p))));
    })));
  const useCard = h("section", { class: "rb-pvx-card k-use" },
    h("div", { class: "hd" }, h("span", { class: "ico" }, icon("sliders", 18)), h("span", { class: "t" }, h("b", null, "용도별 설정"), h("small", null, "칸에서 바로 바꿔요")), btn("자세히", { size: "sm", onClick: () => goTab("use") })),
    h("div", { class: "rb-pvx-scroll" }, table));

  // 프로필 카드
  const usedBy = (id) => PURPOSES.filter((p) => effectiveProfile(cfg, p) === id).map((p) => PURPOSE_LABEL[p]);
  const profCard = (p) => {
    const k = cById[p.connectionId]?.kind, set = (fn) => mutate((x) => { const q = x.profiles.find((r) => r.id === p.id); if (q) fn(q); });
    const isMain = cfg.purposes.main.profileId === p.id, use = usedBy(p.id);
    return h("section", { class: "rb-pvx-card k-prof", dataset: { prof: p.id } },
      h("div", { class: "hd" }, h("span", { class: "t" }, h("b", null, p.name, isMain ? h("span", { class: "rb-pvx-tag" }, "메인") : null), h("small", null, `${cById[p.connectionId]?.name ?? kindOf(k).label} · ${p.model || "모델 미정"}`))),
      h("div", { class: "rb-pvx-row" }, h("span", null, "생각"), segmented(EFFORT, EFFORT.some(([v]) => v === (p.thinking.effort ?? "")) ? p.thinking.effort ?? "" : "", (v) => set((q) => { q.thinking.effort = v; }), `${p.name} 생각 강도`)),
      CLAUDE(k) ? h("div", { class: "rb-pvx-row" }, h("span", null, "캐시"), segmented([["off", "끔"], ["5m", "5분"], ["1h", "1시간"]], p.cache.claude, (v) => set((q) => { q.cache.claude = v; }), `${p.name} 캐시`)) : null,
      h("div", { class: "ft" }, h("small", null, use.length ? `쓰는 곳: ${use.join(" · ")}` : "쓰는 곳 없음"), btn("자세히", { size: "sm", onClick: () => goTab("prof", { openProf: p.id }) })));
  };
  const profs = h("div", { class: "rb-pvx-profs" }, ...cfg.profiles.map(profCard),
    h("button", { type: "button", class: "rb-pvx-add", onClick: () => goTab("conn") }, icon("plus", 18), cfg.profiles.length ? "프로필 추가" : "연결에서 모델을 골라 프로필 만들기"));

  // 사용량 14일 · 연결
  const days = dailyCosts(log), max = Math.max(...days.map((d) => d.cost), 0);
  const graph = h("section", { class: "rb-pvx-card k-usage" },
    h("div", { class: "hd" }, h("span", { class: "ico" }, icon("size", 18)), h("span", { class: "t" }, h("b", null, "사용량"), h("small", null, `최근 14일 · 오늘 ${usd(all.total.today)}`)), btn("자세히", { size: "sm", onClick: () => goTab("usage") })),
    h("div", { class: "rb-pvx-graph", role: "img", "aria-label": `최근 14일 비용, 가장 많은 날 ${usd(max)}` }, days.map((d) => h("i", { title: `${d.d} · ${usd(d.cost)}`, style: `height:${max ? Math.max(4, Math.round(d.cost / max * 100)) : 4}%` }))),
    h("div", { class: "rb-pvx-row" }, h("span", null, "실패하면 다음 프로필로"), h("span", { class: "rb-muted", style: "font-size:12.5px" }, cfg.chainOn ? `사슬 ${cfg.chain.length}개` : "끔")));
  const vaultList = await P.vault.list().catch(() => []);
  const conns = h("section", { class: "rb-pvx-card k-conn" },
    h("div", { class: "hd" }, h("span", { class: "ico" }, icon("network", 18)), h("span", { class: "t" }, h("b", null, "연결(키)"), h("small", null, "키는 이 기기에만 저장돼요")), btn("", { icon: "plus", size: "sm", title: "연결 추가", onClick: () => goTab("conn") })),
    ...cfg.connections.map((c) => {
      const keys = vaultList.filter((x) => c.keyIds.includes(x.id)), need = !kindOf(c.kind).keyOptional && !keys.length;
      return h("button", { type: "button", class: "rb-pvx-conn", dataset: { conn: c.id }, onClick: () => goTab("conn", { open: c.id }) },
        h("span", { class: ["dot", need && "warn"], "aria-hidden": "true" }),
        h("span", { class: "t" }, h("b", null, c.name), h("small", null, need ? "키가 없어요" : keys.length ? `키 ${keys.length}개 · ${keys[0].tail}` : kindOf(c.kind).label)));
    }));

  return [bar, useCard, h("div", { class: "rb-pvx-split" }, h("div", { class: "main" }, profs), h("div", { class: "side" }, graph, conns))];
}

export var GLANCE_CSS = `
.rb-pvx-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 20px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent)}
.rb-pvx-bar .rb-seg,.rb-pvx-row .rb-seg,.rb-pvx-bar [role=radiogroup],.rb-pvx-row [role=radiogroup]{width:auto;flex:none}
.rb-pvx-meter{width:140px;height:7px;border-radius:9px;background:var(--rb-hover);overflow:hidden}.rb-pvx-meter i{display:block;height:100%;background:linear-gradient(90deg,#7fd4ff,#5b8cff)}
.rb-pvx-card{position:relative;padding:18px 20px 14px 24px;border:1px solid var(--rb-line2);border-radius:16px;background:var(--rb-card,transparent);min-width:0;display:flex;flex-direction:column;gap:6px}
.rb-pvx-card::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--kg);box-shadow:0 0 10px var(--k)}
.rb-pvx-card.k-use{--k:#3fcfa6;--kg:linear-gradient(180deg,#6ff0c4,#38b6a0)}.rb-pvx-card.k-prof{--k:#6f9dff;--kg:linear-gradient(180deg,#7fd4ff,#5b8cff)}
.rb-pvx-card.k-usage{--k:#f5c451;--kg:linear-gradient(180deg,#ffe08a,#f5b43c)}.rb-pvx-card.k-conn{--k:#ff8a5c;--kg:linear-gradient(180deg,#ffb36b,#ff7a59)}
.rb-pvx-card .hd{display:flex;align-items:center;gap:12px}.rb-pvx-card .hd .t{flex:1;min-width:0;display:flex;flex-direction:column}.rb-pvx-card .hd b{font-size:15px}.rb-pvx-card .hd small{color:var(--rb-sub);font-size:12.5px;overflow:hidden;text-overflow:ellipsis}
.rb-pvx-card .hd .ico{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;color:var(--k);background:color-mix(in srgb,var(--k) 12%,transparent);border:1px solid color-mix(in srgb,var(--k) 50%,transparent);box-shadow:0 0 8px color-mix(in srgb,var(--k) 30%,transparent)}
.rb-pvx-tag{font-size:11px;font-weight:600;margin-left:6px;padding:1px 8px;border-radius:999px;color:var(--k);border:1px solid color-mix(in srgb,var(--k) 50%,transparent);vertical-align:2px}
.rb-prov > .rb-seg button{white-space:nowrap;flex:1 0 auto}
.rb-pvx-scroll{overflow-x:auto;margin:0 -4px}
.rb-pvx-table{width:100%;border-collapse:collapse;font-size:13px}.rb-pvx-table th{text-align:left;font-weight:600;color:var(--rb-sub);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--rb-line)}
.rb-pvx-table td{padding:8px;border-bottom:1px solid var(--rb-line);vertical-align:middle}.rb-pvx-table tr:last-child td{border-bottom:0}.rb-pvx-table .num{text-align:right;white-space:nowrap}
.rb-pvx-table select{min-width:140px;max-width:220px}
.rb-pvx-split{display:flex;gap:16px;align-items:flex-start}.rb-pvx-split .main{flex:1;min-width:0}.rb-pvx-split .side{width:320px;flex:none;display:flex;flex-direction:column;gap:16px}
.rb-pvx-profs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.rb-pvx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--rb-line);font-size:13px;flex-wrap:wrap}
.rb-pvx-card .ft{display:flex;align-items:center;gap:8px;justify-content:space-between;border-top:1px solid var(--rb-line);padding-top:8px}.rb-pvx-card .ft small{color:var(--rb-sub);font-size:12px}
.rb-pvx-add{min-height:140px;border:1px dashed var(--rb-line2);border-radius:16px;background:none;color:var(--rb-sub);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font:inherit;cursor:pointer;padding:16px;text-align:center}
.rb-pvx-graph{display:flex;align-items:flex-end;gap:4px;height:84px;margin:6px 0 2px}.rb-pvx-graph i{flex:1;border-radius:4px 4px 0 0;background:var(--kg);opacity:.85;min-height:3px}
.rb-pvx-conn{display:flex;align-items:center;gap:10px;padding:9px 0;border:0;border-top:1px solid var(--rb-line);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;width:100%}
.rb-pvx-conn .t{display:flex;flex-direction:column;min-width:0}.rb-pvx-conn b{font-size:13.5px}.rb-pvx-conn small{color:var(--rb-sub);font-size:12px}
.rb-pvx-conn .dot{width:9px;height:9px;border-radius:50%;background:#5fe0a8;box-shadow:0 0 8px #5fe0a8;flex:none}.rb-pvx-conn .dot.warn{background:#f5c451;box-shadow:0 0 8px #f5c451}
.rb-skin-glass :is(.rb-pvx-bar,.rb-pvx-card){background:var(--rb-glass-bg);border-color:var(--rb-glass-line,rgba(255,255,255,.2))}
.rb-lite .rb-pvx-card::before,.rb-lite .rb-pvx-card .hd .ico,.rb-lite .rb-pvx-conn .dot{box-shadow:none}
@media (max-width:760px){.rb-pvx-split{flex-direction:column}.rb-pvx-split .side{width:100%}.rb-pvx-table .hm{display:none}.rb-pvx-card{padding:16px 14px 12px 18px}.rb-pvx-bar{padding:12px 16px}.rb-pvx-profs{grid-template-columns:1fr}}
`;
