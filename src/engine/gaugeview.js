// 게이지 박스 모양(HTML 문자열). 리스 채팅 안에 들어가므로 인라인 style만 쓴다. 순수 함수 — 테스트 가능.
//  이름: "오로라 유리 카드" — 어두운 유리판 위에서 게이지마다 고유 색(hue)이 빛나고, 모양(orb/ring/bar/ticks)이 다르다.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (v, d) => Math.round(100 * (v - d.min) / Math.max(1, d.max - d.min));
const hsl = (h, s, l, a = 1) => `hsla(${(h % 360 + 360) % 360},${s}%,${l}%,${a})`;
const grad = (h, l) => `linear-gradient(90deg,${l?.c1 || hsl(h, 85, 52)},${l?.c2 || hsl(h + 38, 95, 68)})`;
const ex = (l, k) => l?.[k] ? ";" + l[k] : "";

export const shapeHtml = (d, v, big = false) => {
  const h = d.look?.hue ?? 265, p = pct(v, d), shape = d.look?.shape ?? "orb";
  if (shape === "bar") {
    return `<div style="position:relative;height:10px;border-radius:99px;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 3px rgba(0,0,0,.5);overflow:hidden${ex(d.look, "track")}"><div style="width:${p}%;height:100%;border-radius:99px;background:${grad(h, d.look)};box-shadow:0 0 12px ${hsl(h, 95, 62, .85)}${ex(d.look, "fill")}"></div><div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(0,0,0,.22) 9px 10px)"></div></div>`;
  }
  if (shape === "ticks") {
    const n = Math.min(12, Math.max(3, d.max - d.min)), on = Math.round(n * p / 100);
    let cells = ""; for (let i = 0; i < n; i++) cells += `<span style="flex:1;height:14px;border-radius:3px;transform:skewX(-14deg);${i < on ? `background:${grad(h + i * 3, d.look)};box-shadow:0 0 8px ${hsl(h, 95, 62, .7)}${ex(d.look, "fill")}` : `background:rgba(255,255,255,.08)${ex(d.look, "track")}`}"></span>`;
    return `<div style="display:flex;gap:3px">${cells}</div>`;
  }
  const size = big ? 54 : 46, inner = size - 12, glow = shape === "orb";
  return `<div style="position:relative;flex:none;width:${size}px;height:${size}px;border-radius:50%;background:conic-gradient(from -90deg,${d.look?.c1 || hsl(h, 90, 60)} 0,${d.look?.c2 || hsl(h + 50, 95, 72)} ${p}%,rgba(255,255,255,.09) 0);${ex(d.look, "fill").slice(1) ? ex(d.look, "fill").replace(/background[^;]*;?/g, "") + ";" : ""}${glow ? `box-shadow:0 0 14px ${hsl(h, 95, 60, .75)},0 0 3px ${hsl(h, 95, 75, .9)}` : ""}"><div style="position:absolute;left:6px;top:6px;width:${inner}px;height:${inner}px;border-radius:50%;background:${glow ? `radial-gradient(circle at 35% 28%,${hsl(h, 60, 30)},#12101f 75%)` : "#12101f"};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${big ? 15 : 14}px;color:${hsl(h, 100, 86)}">${esc(v)}</div></div>`;
};

const chip = (it) => {
  if (!it) return "";
  const up = it.to > it.from, c = up ? "#7dffb0" : "#ff8aa0";
  return `<span title="${esc(it.why)}" style="flex:none;font-size:11px;font-weight:800;padding:1px 7px;border-radius:99px;color:${c};background:${up ? "rgba(60,220,140,.14)" : "rgba(255,90,120,.14)"};border:1px solid ${up ? "rgba(60,220,140,.4)" : "rgba(255,90,120,.4)"}">${up ? "▲" : "▼"} ${up ? "+" : ""}${it.to - it.from}</span>`;
};

// entry: {snap:[{g,who,v}], items:[{g,who,from,to,why}]}, defs: 정의 배열
export function gaugeBoxHtml(entry, defs) {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const groups = new Map();
  for (const s of entry?.snap ?? []) { const d = byId.get(s.g); if (!d) continue; (groups.get(d.id) ?? groups.set(d.id, { d, rows: [] }).get(d.id)).rows.push(s); }
  if (!groups.size) return "";
  const delta = (g, who) => (entry.items ?? []).find((i) => i.g === g && i.who === who);
  const sections = [...groups.values()].map(({ d, rows }) => {
    const h = d.look?.hue ?? 265;
    const body = rows.slice(0, 8).map((r) => {
      const it = delta(d.id, r.who), shape = d.look?.shape ?? "orb";
      const vis = shapeHtml(d, r.v);
      const info = `<div style="flex:1;min-width:0"><div style="display:flex;gap:6px;align-items:center;margin-bottom:${shape === "orb" || shape === "ring" ? 0 : 5}px"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f1edff;font-size:13px">${esc(r.who)}</b>${shape === "orb" || shape === "ring" ? "" : `<span style="font-size:12px;font-weight:800;color:${hsl(h, 100, 82)}">${esc(r.v)}<span style="opacity:.5;font-weight:500">/${esc(d.max)}</span></span>`}${chip(it)}</div>${shape === "orb" || shape === "ring" ? `<div style="font-size:11px;opacity:.6;color:#d9d3f5">${esc(r.v)} / ${esc(d.max)}${it ? " · " + esc(it.why) : ""}</div>` : vis}</div>`;
      return `<div style="display:flex;gap:10px;align-items:center;padding:6px 0">${shape === "orb" || shape === "ring" ? vis : ""}${info}</div>`;
    }).join("");
    return `<div style="position:relative;margin-top:8px;padding:6px 12px 6px 14px;border-radius:12px;background:linear-gradient(135deg,${hsl(h, 60, 22, .55)},rgba(18,16,31,.55));border:1px solid ${hsl(h, 80, 62, .35)}${ex(d.look, "card")}"><span style="position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:3px;background:${grad(h, d.look)};box-shadow:0 0 10px ${hsl(h, 95, 62, .9)}"></span><div style="display:flex;gap:6px;align-items:center;padding-top:2px"><span style="font-size:14px">${esc(d.look?.icon || "✦")}</span><b style="font-size:12px;letter-spacing:.04em;color:${d.look?.text || hsl(h, 100, 82)}">${esc(d.name)}</b></div>${body}</div>`;
  }).join("");
  const chips = [...groups.values()].map(({ d }) => `<span style="display:inline-block;margin-left:6px;width:8px;height:8px;border-radius:50%;background:${hsl(d.look?.hue ?? 265, 95, 62)};box-shadow:0 0 8px ${hsl(d.look?.hue ?? 265, 95, 62, .9)}"></span>`).join("");
  return `\n\n<details x-dusk="gauge" open style="margin-top:8px;font-size:13px;line-height:1.5;border:1px solid rgba(180,160,255,.35);border-radius:14px;padding:2px 10px 8px;background:linear-gradient(160deg,rgba(40,30,80,.55),rgba(14,12,26,.7));box-shadow:0 4px 18px rgba(80,50,200,.25),inset 0 1px 0 rgba(255,255,255,.08)"><summary style="cursor:pointer;padding:6px 0;font-weight:800;color:#d9ccff;list-style:none">✦ 게이지${chips}</summary>${sections}</details>`;
}
