// 장기기억 애드온(0.3.22): 장면 상태창(순수) — 응답 아래(로어북 버튼 위)에 날짜·시간·장소·날씨·등장인물.
// 날씨마다 움직이는 배경(비 줄기·눈송이·햇살·구름·안개·번개·바람·실내 등불). 움직임은 한 번 넣는 <style>의 키프레임을 쓰고,
// 호스트가 <style>을 지우면 그라데이션 바탕만 남는다(그래도 읽기엔 문제없음). 스크립트는 쓰지 않는다.
import { parseStatus } from "./storytime.js";
import { weatherOf, nk } from "./memextra.js";
import { linkHtml, TAB_CSS } from "./namecard.js";
import { forecast, climateOf, anchorOf, weekday, parseIso, ZONES, STATES } from "./weather.js";
import { extraOf } from "./memextra.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// 응답 하나의 장면 정보: 상태 줄(날짜·시간·장소) → 없으면 저장된 마지막 장면, 날씨는 응답 글 → 저장된 날씨
export function sceneOf(text, folder, { seed = "", hint = "" } = {}) {
  const s = parseStatus(text);
  const last = [...(folder?.scenes ?? [])].filter((x) => !x.orphan).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
  const fromWhen = (w) => { const p = parseIso(w); return p ? { date: `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`, time: String(w).match(/\d{1,2}:\d{2}/)?.[0] ?? "" } : { date: "", time: "" }; };
  const fw = fromWhen(last?.when);
  const body = String(text ?? "").replace(/^[^\n]*\n/, "");
  const date = s.date || fw.date, time = s.time || fw.time, place = s.place || last?.place || "";
  // 기후·예보(엔진): AI가 정한 기후 → 장소·봇 글 추정. 응답 글에 날씨가 보이면 그게 지금 날씨
  const e = extraOf(folder), cl = climateOf(e, [place, hint].join(" "));
  const told = weatherOf(body);
  let fc = null; try { fc = date ? forecast(cl, date, time || "12:00", seed || "dusk", { anchor: STATES.includes(told) && parseIso(date) ? null : anchorOf(e, cl) }) : null; } catch { fc = null; }
  if (fc && STATES.includes(told) && fc.days[0]) { const h = fc.days[0].half.find((x) => x?.now); if (h) { h.w = told; h.rain = /비|눈|천둥/.test(told) ? 100 : 0; } fc.now = { ...fc.now, w: told }; }
  return { date, time, place, weather: told || fc?.now?.w || e.weather?.w || "", fromLine: !!(s.date || s.time), forecast: fc, climate: cl };
}
// 이 응답에 나온 인물(위키 문서가 있는 인물 + 봇 캐릭터). [{name, doc}]
export function peopleIn(text, folder, botName = "") {
  const low = nk(text), out = [];
  for (const d of Object.values(folder?.wiki?.documents ?? {})) {
    if (d?.type !== "Character" || /\{\{user\}\}/i.test(d.title ?? "")) continue;
    if ([d.title, ...(d.aliases ?? [])].some((n) => String(n ?? "").length >= 2 && low.includes(nk(n)))) out.push({ name: d.title, doc: d });
  }
  if (botName && !out.some((p) => nk(p.name) === nk(botName)) && low.includes(nk(botName))) out.push({ name: botName, doc: null });
  return out.slice(0, 10);
}
export function dateLabel(date, cal = null) {
  const p = parseIso(date); if (!p) return String(date ?? "");
  const wd = weekday(p, cal);
  return `${p.y}년 ${p.m}월 ${p.d}일${wd ? ` (${wd})` : ""}`;
}
// 날씨 → [바탕 그라데이션, (옛) 무늬, 움직임 이름, 아이콘, 글자색]. 무늬·움직임은 fxLayers가 겹겹이 그린다
export const WX = Object.freeze({
  맑음: ["linear-gradient(165deg,#4f8fe8 0%,#7fb4f2 45%,#ffd59a 100%)", "", "dkSun", "☀️", "#fff"],
  구름: ["linear-gradient(165deg,#5f8fd0 0%,#93b7e4 55%,#dbe6f4 100%)", "", "dkDrift", "⛅", "#fff"],
  흐림: ["linear-gradient(165deg,#56627a 0%,#7d899c 55%,#a9b2bf 100%)", "", "dkDrift", "☁️", "#fff"],
  비: ["linear-gradient(170deg,#24324a 0%,#3c4f6c 55%,#5d708c 100%)", "", "dkRain", "🌧️", "#eef3ff"],
  폭우: ["linear-gradient(170deg,#131b2a 0%,#25324a 55%,#3b4a64 100%)", "", "dkRain", "⛈️", "#eef3ff"],
  눈: ["linear-gradient(170deg,#6f86a8 0%,#a3b6d0 55%,#e3ebf5 100%)", "", "dkSnow", "❄️", "#fff"],
  안개: ["linear-gradient(170deg,#7d8794 0%,#a3abb5 55%,#cdd2d8 100%)", "", "dkFog", "🌫️", "#fff"],
  천둥: ["linear-gradient(170deg,#0f1220 0%,#232843 55%,#383f5e 100%)", "", "dkRain", "🌩️", "#eef0ff"],
  바람: ["linear-gradient(160deg,#3f8fa8 0%,#7cc0cf 55%,#d3ecef 100%)", "", "dkWind", "🍃", "#fff"],
  실내: ["linear-gradient(160deg,#2e1f1a 0%,#5a3a2a 55%,#8a5e40 100%)", "", "dkLamp", "🕯️", "#fff3e6"],
  "": ["linear-gradient(160deg,#3b2f6e 0%,#6b54c4 55%,#c58bd4 100%)", "", "dkDrift", "✦", "#fff"],
});
const NIGHT_SKY = "linear-gradient(170deg,#0b1030 0%,#1b2356 55%,#3a3570 100%)";
const DUSK_SKY = "linear-gradient(170deg,#3b3a7a 0%,#c0628a 55%,#ffb37a 100%)";
const DAWN_SKY = "linear-gradient(170deg,#4a5a9a 0%,#c98bb0 55%,#ffd3a8 100%)";
// 움직임: 모두 transform·opacity·background-position만 써서 부드럽게. 한 번만 넣는다
export const SCENE_CSS = "<style>"
  + "@keyframes dkRain{to{background-position:0 110px,0 70px}}"
  + "@keyframes dkFall{to{background-position:0 120px,0 70px,0 40px}}"
  + "@keyframes dkSway{0%,100%{transform:translateX(-6px)}50%{transform:translateX(6px)}}"
  + "@keyframes dkTwinkle{0%,100%{opacity:.25}50%{opacity:1}}"
  + "@keyframes dkSpin{to{transform:rotate(360deg)}}"
  + "@keyframes dkGlow{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}"
  + "@keyframes dkRise{to{background-position:0 -120px,0 -80px}}"
  + "@keyframes dkCloud{from{transform:translateX(-70%)}to{transform:translateX(190%)}}"
  + "@keyframes dkFog{0%,100%{transform:translateX(-12%)}50%{transform:translateX(12%)}}"
  + "@keyframes dkFlash{0%,86%,90%,100%{opacity:0}87%{opacity:.85}88%{opacity:.15}89%{opacity:.6}}"
  + "@keyframes dkBolt{0%,86%,91%,100%{opacity:0}87%,89%{opacity:1}}"
  + "@keyframes dkGust{to{background-position:260px 0,180px 0}}"
  + "@keyframes dkLeaf{0%{transform:translate(-30px,10px) rotate(0)}25%{transform:translate(25vw,-8px) rotate(140deg)}50%{transform:translate(50vw,14px) rotate(260deg)}75%{transform:translate(75vw,-4px) rotate(400deg)}100%{transform:translate(105vw,8px) rotate(540deg)}}"
  + "@keyframes dkFlicker{0%,100%{opacity:.9;transform:scale(1)}20%{opacity:1;transform:scale(1.04)}40%{opacity:.82;transform:scale(.98)}60%{opacity:.97;transform:scale(1.02)}80%{opacity:.86}}"
  + "@keyframes dkSheen{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}"
  + "@keyframes dkPop{0%{transform:translateY(10px) scale(.97);opacity:0;filter:blur(4px)}60%{transform:translateY(-2px) scale(1.005);opacity:1;filter:blur(0)}100%{transform:none}}"
  + "@keyframes dkUp{from{transform:translateY(6px);opacity:0}to{transform:none;opacity:1}}"
  + "@keyframes dkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}"
  + "[x-dusk=scene] summary::-webkit-details-marker{display:none}details[x-dusk=wx][open]>summary{background:rgba(255,255,255,.3)!important;transform:translateY(1px)}details[x-dusk=wx]>summary{transition:background .2s,transform .2s}" + TAB_CSS
  + "@keyframes dkPcIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}"
  + "@media (prefers-reduced-motion:reduce){[x-dusk=scene],[x-dusk=scene] *{animation:none!important}}</style>";

const L = (s) => `<div aria-hidden="true" style="position:absolute;pointer-events:none;${s}"></div>`;
const A = (name, dur, rest = "linear infinite", delay = 0) => `animation:${name} ${dur} ${rest}${delay ? ` ${delay}s` : ""};`;
const dots = (list, color) => list.map(([w, h, x, y, a = 1]) => `radial-gradient(${w}px ${h}px at ${x}% ${y}%,${color.replace("A", a)} 0,transparent 100%)`).join(",");
// 비: 기울인 큰 판에 가까운 빗줄기(굵고 빠름)·먼 빗줄기(가늘고 흐림) 두 겹 + 아래 물안개
function rain(hard) {
  const near = dots([[1.1, 15, 20, 30], [1.1, 13, 70, 70], [1, 16, 45, 10], [0.9, 12, 90, 50]], "rgba(215,230,255,A)");
  const far = dots([[0.7, 9, 15, 20, 0.7], [0.7, 8, 55, 60, 0.7], [0.6, 10, 85, 35, 0.7]], "rgba(200,215,245,A)");
  const sz = hard ? "46px 110px,28px 70px" : "70px 110px,40px 70px";
  return L(`inset:-40% -25%;transform:rotate(12deg);background-image:${near},${far};background-size:${sz};opacity:${hard ? .95 : .75};${A("dkRain", hard ? ".38s" : ".55s")}`)
    + L(`left:0;right:0;bottom:0;height:45%;background:linear-gradient(to top,rgba(220,230,255,.18),transparent)`);
}
function snow() {
  const flakes = (r, a) => dots([[r, r, 20, 25, a], [r * .8, r * .8, 65, 60, a], [r * .9, r * .9, 85, 15, a * .8], [r * .7, r * .7, 40, 85, a]], "rgba(255,255,255,A)");
  return `<div aria-hidden="true" style="position:absolute;inset:-20% -10%;pointer-events:none;${A("dkSway", "5s", "ease-in-out infinite")}">` + L(`inset:0;background-image:${flakes(3, 1)},${flakes(2, .85)},${flakes(1.3, .6)};background-size:90px 120px,60px 70px,34px 40px;${A("dkFall", "7s")}`) + `</div>`
    + L(`left:0;right:0;bottom:0;height:30%;background:linear-gradient(to top,rgba(255,255,255,.35),transparent)`);
}
function stars() {
  const s = (a) => dots([[1.2, 1.2, 12, 20, a], [0.9, 0.9, 48, 65, a], [1.4, 1.4, 80, 30, a], [0.8, 0.8, 30, 85, a], [1, 1, 68, 8, a]], "rgba(255,255,255,A)");
  return L(`inset:0;background-image:${s(1)};background-size:110px 80px;${A("dkTwinkle", "3.2s", "ease-in-out infinite")}`)
    + L(`inset:0;background-image:${s(.8)};background-size:70px 60px;background-position:30px 20px;${A("dkTwinkle", "4.6s", "ease-in-out infinite", -2)}`);
}
const moon = () => L(`right:78px;top:12px;width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 38% 38%,#fffbea,#f2e7c4 60%,#d9caa0);box-shadow:0 0 18px 6px rgba(255,246,210,.35),0 0 60px 20px rgba(200,200,255,.15);${A("dkGlow", "6s", "ease-in-out infinite")}`);
function sun() {
  return L(`right:-36px;top:-120px;width:280px;height:280px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,250,220,.28) 0 6deg,transparent 6deg 18deg);${A("dkSpin", "50s")}`)
    + L(`right:66px;top:-24px;width:76px;height:76px;border-radius:50%;background:radial-gradient(circle,#fffbe6 0 30%,rgba(255,230,150,.75) 45%,rgba(255,210,120,0) 70%);${A("dkGlow", "4.5s", "cubic-bezier(.45,0,.55,1) infinite")}`)
    + L(`right:150px;top:44px;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:-46px 26px 0 -3px rgba(255,240,200,.22),-90px 46px 0 2px rgba(255,255,255,.12)`)
    + motes("rgba(255,250,230,A)");
}
const motes = (c) => L(`inset:0;background-image:${dots([[1.6, 1.6, 20, 40, .9], [1.2, 1.2, 70, 80, .7], [2, 2, 50, 15, .5]], c)},${dots([[1, 1, 35, 60, .8], [1.4, 1.4, 85, 25, .6]], c)};background-size:120px 120px,80px 80px;${A("dkRise", "16s")}`);
function clouds(n, a, dark) {
  const c = dark ? `rgba(225,230,240,${a})` : `rgba(255,255,255,${a})`;
  return Array.from({ length: n }, (_, i) => L(`left:0;top:${[8, 38, 18, 55][i % 4]}%;width:${[46, 60, 38, 52][i % 4]}%;height:${[48, 60, 40, 52][i % 4]}%;border-radius:50%;background:radial-gradient(ellipse at 35% 60%,${c},transparent 62%),radial-gradient(ellipse at 65% 45%,${c},transparent 58%);filter:blur(5px);${A("dkCloud", `${[38, 52, 30, 46][i % 4]}s`, "linear infinite", -[6, 30, 18, 40][i % 4])}`)).join("");
}
function fog() {
  return [[20, 26, 16], [52, 30, 22], [74, 26, 19]].map(([top, h, d], i) => L(`left:-25%;right:-25%;top:${top}%;height:${h}%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55) 30%,rgba(255,255,255,.4) 70%,transparent);filter:blur(8px);${A("dkFog", `${d}s`, "ease-in-out infinite", -i * 5)}`)).join("");
}
function wind() {
  const g = dots([[34, 0.7, 20, 30, .7], [22, 0.6, 60, 70, .55], [28, 0.7, 80, 45, .6]], "rgba(255,255,255,A)");
  return L(`inset:0;background-image:${g},${g};background-size:260px 70px,180px 50px;background-position:0 0,40px 20px;${A("dkGust", "1.6s")}`)
    + ["🍃", "🍂", "🍃"].map((e, i) => `<span aria-hidden="true" style="position:absolute;left:0;top:${[30, 58, 18][i]}%;font-size:${[14, 12, 11][i]}px;pointer-events:none;opacity:.9;${A("dkLeaf", `${[6, 8, 7][i]}s`, "cubic-bezier(.4,.1,.6,.9) infinite", -[0, 3, 5.5][i])}">${e}</span>`).join("");
}
function lamp() {
  return L(`right:-30px;top:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,120,.55),rgba(255,170,90,.18) 45%,transparent 70%);${A("dkFlicker", "3.2s", "ease-in-out infinite")}`)
    + motes("rgba(255,220,170,A)");
}
const thunder = () => L(`inset:0;background:rgba(220,225,255,.9);mix-blend-mode:screen;${A("dkFlash", "7s")}`)
  + `<svg aria-hidden="true" viewBox="0 0 40 90" style="position:absolute;right:28%;top:-4px;width:26px;height:64px;pointer-events:none;opacity:0;filter:drop-shadow(0 0 6px #cfd6ff);${A("dkBolt", "7s")}"><path d="M24 0 L8 44 H20 L12 90 L34 36 H22 L30 0Z" fill="#f2f4ff"/></svg>`;

// 시간대: 새벽(4~6) 아침(6~11) 낮(11~17) 저녁(17~20) 밤(20~4)
export function dayPart(time) {
  const h = Number(String(time ?? "").match(/^(\d{1,2}):/)?.[1]); if (!Number.isFinite(h)) return "";
  return h < 4 ? "밤" : h < 6 ? "새벽" : h < 11 ? "아침" : h < 17 ? "낮" : h < 20 ? "저녁" : "밤";
}
// 날씨·시간대 → [바탕, 움직이는 겹들]
export function fxLayers(weather, part = "") {
  const night = part === "밤", eve = part === "저녁", dawn = part === "새벽";
  const clear = weather === "맑음" || weather === "" || weather === "구름";
  let bg = (WX[weather] ?? WX[""])[0];
  if (clear && night) bg = NIGHT_SKY; else if (clear && eve) bg = DUSK_SKY; else if (clear && dawn) bg = DAWN_SKY;
  else if (night && weather !== "실내") bg = `linear-gradient(rgba(8,10,30,.42),rgba(8,10,30,.42)),${bg}`;
  const fx = {
    맑음: night ? stars() + moon() : eve || dawn ? sun() + clouds(1, .35) : sun(),
    구름: (night ? stars() + moon() : sun()) + clouds(3, night ? .25 : .7),
    흐림: clouds(4, .45, true),
    비: clouds(2, .22, true) + rain(false),
    폭우: clouds(2, .2, true) + rain(true),
    눈: snow(),
    안개: fog(),
    천둥: clouds(2, .18, true) + rain(true) + thunder(),
    바람: clouds(2, .5) + wind(),
    실내: lamp(),
    "": night ? stars() + moon() : stars() + motes("rgba(255,255,255,A)"),
  }[weather] ?? "";
  return [bg, fx];
}

const ICON = { 맑음: "☀️", 구름: "⛅", 흐림: "☁️", 비: "🌧️", 폭우: "⛈️", 눈: "❄️", 안개: "🌫️", 천둥: "🌩️", 바람: "🍃", 실내: "🕯️" };
export const iconOf = (w, night = false) => (night && w === "맑음" ? "🌙" : night && w === "구름" ? "☁️" : ICON[w] ?? "✦");
const DAYN = ["오늘", "내일", "모레"];
// 4일 예보 판: 날마다 낮·밤 아이콘·확률, 최고/최저, 강수 확률 막대
function forecastHtml(fc, cal, fg) {
  if (!fc?.days?.length) return "";
  const cell = (h, night) => h
    ? `<span style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 0 4px;border-radius:10px;${h.now ? "background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)" : ""}"><span style="font-size:9.5px;opacity:.7;letter-spacing:.06em">${night ? "밤" : "낮"}</span><span style="font-size:19px;line-height:1.15;filter:drop-shadow(0 2px 4px rgba(0,0,0,.2))">${iconOf(h.w, night)}</span><span style="font-size:10.5px;opacity:.92">${esc(h.w)}</span><span style="font-size:9.5px;opacity:.7;font-variant-numeric:tabular-nums">${h.now ? "지금" : `${h.conf}%`}</span></span>`
    : `<span style="display:flex;align-items:center;justify-content:center;padding:5px 0;font-size:10px;opacity:.35">지남</span>`;
  const cols = fc.days.map((d, k) => {
    const [dh, nh] = d.half, hi = Math.max(...d.half.filter(Boolean).map((x) => x.t)), lo = Math.min(...d.half.filter(Boolean).map((x) => x.t));
    const rain = Math.max(...d.half.filter(Boolean).map((x) => x.rain)), p = parseIso(d.date);
    return `<span style="display:flex;flex-direction:column;gap:3px;min-width:0;padding:7px 4px 8px;border-radius:14px;background:rgba(255,255,255,${k ? ".08" : ".14"});text-align:center">`
      + `<b style="font-size:11.5px">${DAYN[k] ?? `${p?.m ?? ""}/${p?.d ?? ""}`}</b><span style="font-size:9.5px;opacity:.7;margin-top:-2px">${p ? `${p.m}.${p.d}` : ""}${d.wd ? ` ${d.wd}` : ""}</span>`
      + cell(dh, false) + cell(nh, true)
      + `<span style="font-size:11px;font-variant-numeric:tabular-nums;margin-top:2px"><b>${hi}°</b><span style="opacity:.6"> / ${lo}°</span></span>`
      + `<span style="display:block;height:4px;margin:2px 6px 0;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden"><i style="display:block;height:100%;width:${rain}%;background:linear-gradient(90deg,#9fd0ff,#5aa9ff);border-radius:4px"></i></span>`
      + `<span style="font-size:9.5px;opacity:.85">💧${rain}%</span></span>`;
  }).join("");
  return `<span style="display:grid;grid-template-columns:repeat(${fc.days.length},minmax(0,1fr));gap:5px">${cols}</span>`;
}
// 패널 HTML. people = [{name, card?: 상태창 안쪽 HTML}], forecast = 엔진 예보, climate = 기후(달력·이름)
export function scenePanelHtml({ date = "", time = "", place = "", weather = "", people = [], forecast: fc = null, climate: cl = null } = {}) {
  if (!date && !time && !place && !people.length) return "";
  const w = WX[weather] ? weather : "";
  const part = dayPart(time), night = part === "밤";
  const fg = WX[w][4], icon = iconOf(w, night);
  const [bg, fx] = fxLayers(w, part);
  const glass = "background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)";
  const chips = people.map((p) => {
    const init = esc([...String(p.name ?? "?")][0] ?? "?");
    const dot = `<span style="display:inline-grid;place-items:center;width:18px;height:18px;margin-right:5px;border-radius:50%;background:rgba(255,255,255,.28);font-size:10px;font-weight:700;vertical-align:-4px">${init}</span>`;
    return p.card
      ? `<span style="display:inline-block;margin:0 5px 0 0;padding:3px 10px 3px 4px;border-radius:999px;${glass};color:${fg}">${dot}${linkHtml(p.name, p.card)}</span>`
      : `<span style="display:inline-block;margin:0 5px 0 0;padding:3px 10px 3px 4px;border-radius:999px;background:rgba(255,255,255,.1);color:${fg};opacity:.8">${dot}${esc(p.name)}</span>`;
  }).join("");
  const up = (d) => `animation:dkUp .55s cubic-bezier(.22,1,.36,1) both ${d}s`;
  const temp = fc?.now && Number.isFinite(fc.now.t) ? `${fc.now.t}°` : "";
  const fcBody = forecastHtml(fc, cl, fg);
  const zone = cl ? `${ZONES[cl.zone]?.label ?? ""}${cl.region ? ` · ${esc(cl.region)}` : ""}` : "";
  // 날씨 상자: 누르면 아래로 예보 판이 펼쳐진다(상자는 오른쪽 위에 떠 있고, 판은 카드 맨 아래 흐름에 들어감)
  const box = `<summary style="list-style:none;cursor:pointer;position:absolute;right:14px;top:14px;z-index:2;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:62px;padding:8px 10px 7px;border-radius:16px;${glass};box-shadow:0 6px 18px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.3);${up(.3)}">`
    + `<span style="font-size:28px;line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,.25));animation:dkBob 3.5s ease-in-out infinite">${icon}</span>`
    + `<span style="font-size:11px;font-weight:700;letter-spacing:.04em;margin-top:2px">${esc(weather || "날씨")}${temp ? ` <span style="font-weight:800">${temp}</span>` : ""}</span>`
    + (fcBody ? `<span style="font-size:9px;opacity:.75;letter-spacing:.08em">예보 ▾</span>` : "") + `</summary>`;
  const wxDetails = `<details x-dusk="wx" style="display:block;margin:0">${box}${fcBody ? `<span style="display:block;position:relative;z-index:1;margin:0 10px 10px;padding:9px 8px 8px;border-radius:16px;background:rgba(0,0,0,.2);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:dkUp .4s cubic-bezier(.22,1,.36,1)"><span style="display:flex;justify-content:space-between;align-items:baseline;margin:0 4px 7px"><b style="font-size:11px;letter-spacing:.12em">4일 예보</b><span style="font-size:10px;opacity:.7">${zone}</span></span>${fcBody}<span style="display:block;margin:7px 4px 0;font-size:9.5px;opacity:.6">%는 그 날씨일 확률 · 💧 강수 확률 · 이야기 속 날씨에 따라 바뀌어요</span></span>` : ""}</details>`;
  return `\n\n${SCENE_CSS}<div x-dusk="scene" style="position:relative;isolation:isolate;margin:14px 0 6px;border-radius:22px;overflow:hidden;color:${fg};background:${bg};animation:dkPop .7s cubic-bezier(.22,1,.36,1) both;box-shadow:0 12px 34px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.08);font-style:normal;line-height:1.35;text-shadow:0 1px 3px rgba(0,0,0,.28)">`
    + `<div aria-hidden="true" style="position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none">${fx}`
    + L(`top:0;bottom:0;left:0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:dkSheen 1.6s cubic-bezier(.4,0,.2,1) .35s both`)
    + L(`inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.22))`) + `</div>`
    + `<div style="position:relative;z-index:1;padding:16px 96px 12px 18px;min-height:74px">`
    + `<div style="font-size:11.5px;letter-spacing:.08em;opacity:.88;${up(.1)}">${esc(dateLabel(date, cl) || "날짜 미정")}${part ? ` · ${part}` : ""}</div>`
    + `<div style="font-size:36px;font-weight:800;letter-spacing:.01em;line-height:1.05;margin-top:3px;font-variant-numeric:tabular-nums;text-shadow:0 2px 14px rgba(0,0,0,.25);${up(.18)}">${esc(time || "--:--")}</div>`
    + `${place ? `<div style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:3px 10px 3px 8px;border-radius:999px;font-size:12.5px;max-width:100%;${glass};${up(.26)}"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="flex:none"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(place)}</span></div>` : ""}</div>`
    + (chips ? `<div style="position:relative;z-index:1;margin:0 10px 10px;padding:6px 8px;border-radius:14px;background:rgba(0,0,0,.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-size:12px;white-space:nowrap;overflow-x:auto;${up(.38)}"><span style="font-size:10px;letter-spacing:.12em;opacity:.7;margin:0 7px 0 3px">등장</span>${chips}</div>` : "")
    + wxDetails + `</div>`;
}
