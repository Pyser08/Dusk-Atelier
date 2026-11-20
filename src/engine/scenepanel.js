// 장기기억 애드온(0.3.22): 장면 상태창(순수) — 응답 아래(로어북 버튼 위)에 날짜·시간·장소·날씨·등장인물.
// 날씨마다 움직이는 배경(비 줄기·눈송이·햇살·구름·안개·번개·바람·실내 등불). 움직임은 한 번 넣는 <style>의 키프레임을 쓰고,
// 호스트가 <style>을 지우면 그라데이션 바탕만 남는다(그래도 읽기엔 문제없음). 스크립트는 쓰지 않는다.
import { parseStatus } from "./storytime.js";
import { weatherOf, nk } from "./memextra.js";
import { linkHtml } from "./namecard.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// 날씨 → [바탕 그라데이션, 무늬 레이어, 움직임 이름, 아이콘, 글자색]
export const WX = Object.freeze({
  맑음: ["linear-gradient(160deg,#ffcf7a,#ff9a6b 45%,#7aa7ff)", "radial-gradient(circle at 82% 22%,rgba(255,255,255,.85) 0 7%,rgba(255,236,170,.45) 8% 18%,transparent 34%)", "dkSun", "☀️", "#2a1a10"],
  구름: ["linear-gradient(160deg,#8fb6e8,#c7d6ee 60%,#e9eef7)", "radial-gradient(ellipse 30% 18% at 20% 35%,rgba(255,255,255,.9),transparent 70%),radial-gradient(ellipse 36% 20% at 70% 55%,rgba(255,255,255,.75),transparent 70%)", "dkDrift", "⛅", "#1c2a3e"],
  흐림: ["linear-gradient(160deg,#6f7c8f,#9aa5b5 60%,#c3c9d2)", "radial-gradient(ellipse 45% 25% at 25% 30%,rgba(255,255,255,.35),transparent 70%),radial-gradient(ellipse 50% 28% at 75% 60%,rgba(255,255,255,.28),transparent 70%)", "dkDrift", "☁️", "#141a22"],
  비: ["linear-gradient(170deg,#3d4f68,#5d6f88 60%,#7e8ea4)", "repeating-linear-gradient(105deg,transparent 0 9px,rgba(200,220,255,.38) 9px 10px,transparent 10px 22px)", "dkRain", "🌧️", "#eef3ff"],
  폭우: ["linear-gradient(170deg,#1f2a3a,#34445b 60%,#4a5a72)", "repeating-linear-gradient(100deg,transparent 0 5px,rgba(200,220,255,.5) 5px 6.5px,transparent 6.5px 13px)", "dkRainHard", "⛈️", "#eef3ff"],
  눈: ["linear-gradient(170deg,#a9bdd6,#d3deec 60%,#f2f6fb)", "radial-gradient(circle,rgba(255,255,255,.95) 0 1.6px,transparent 2.4px),radial-gradient(circle,rgba(255,255,255,.8) 0 1.1px,transparent 1.8px)", "dkSnow", "❄️", "#1c2a3e"],
  안개: ["linear-gradient(170deg,#9aa3ad,#b9c0c7 60%,#d6dadf)", "linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent),linear-gradient(90deg,transparent 20%,rgba(255,255,255,.3),transparent 80%)", "dkFog", "🌫️", "#1d2228"],
  천둥: ["linear-gradient(170deg,#191d2b,#2d3348 60%,#3e4560)", "repeating-linear-gradient(100deg,transparent 0 6px,rgba(200,210,255,.35) 6px 7px,transparent 7px 15px)", "dkThunder", "🌩️", "#eef0ff"],
  바람: ["linear-gradient(160deg,#9ec9d9,#c5e1e8 60%,#e7f2f4)", "repeating-linear-gradient(0deg,transparent 0 14px,rgba(255,255,255,.55) 14px 15px,transparent 15px 30px)", "dkWind", "🍃", "#12303a"],
  실내: ["linear-gradient(160deg,#4a3428,#6b4a36 55%,#8a6448)", "radial-gradient(circle at 78% 25%,rgba(255,206,140,.55) 0 6%,rgba(255,180,100,.18) 14%,transparent 34%)", "dkLamp", "🕯️", "#fff3e6"],
  "": ["linear-gradient(160deg,#5b4c8a,#8b6fe0 55%,#c58bd4)", "radial-gradient(circle at 80% 20%,rgba(255,255,255,.35),transparent 40%)", "dkDrift", "✦", "#fff"],
});
// 움직임: 끝에서 살짝 넘쳤다 돌아오는(쫀득한) 곡선. 한 번만 넣는다
export const SCENE_CSS = "<style>"
  + "@keyframes dkRain{to{background-position:0 0,-60px 120px}}@keyframes dkRainHard{to{background-position:0 0,-80px 160px}}"
  + "@keyframes dkSnow{to{background-position:0 0,40px 140px,-30px 100px}}@keyframes dkDrift{0%,100%{background-position:0 0,0 0,0 0}50%{background-position:0 0,40px 0,-30px 0}}"
  + "@keyframes dkSun{0%,100%{background-size:100% 100%,100% 100%}50%{background-size:100% 100%,112% 112%}}@keyframes dkFog{0%,100%{background-position:0 0,-200px 0,200px 0}50%{background-position:0 0,200px 0,-120px 0}}"
  + "@keyframes dkThunder{0%,88%,100%{background-position:0 0,0 0;filter:none}90%{filter:brightness(2.2)}92%{filter:none}94%{filter:brightness(1.7)}to{background-position:0 0,-70px 140px}}"
  + "@keyframes dkWind{to{background-position:0 0,240px 0}}@keyframes dkLamp{0%,100%{filter:none}45%{filter:brightness(1.08)}55%{filter:brightness(.96)}}"
  + "@keyframes dkPop{0%{transform:translateY(6px) scale(.98);opacity:0}70%{transform:translateY(-1px) scale(1.005);opacity:1}100%{transform:none}}"
  + "@media (prefers-reduced-motion:reduce){[x-dusk=scene],[x-dusk=scene] *{animation:none!important}}</style>";

// 응답 하나의 장면 정보: 상태 줄(날짜·시간·장소) → 없으면 저장된 마지막 장면, 날씨는 응답 글 → 저장된 날씨
export function sceneOf(text, folder) {
  const s = parseStatus(text);
  const last = [...(folder?.scenes ?? [])].filter((x) => !x.orphan).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
  const fromWhen = (w) => { const m = String(w ?? "").match(/(\d{3,4}-\d{1,2}-\d{1,2})(?:\D+(\d{1,2}:\d{2}))?/); return m ? { date: m[1], time: m[2] ?? "" } : { date: "", time: "" }; };
  const fw = fromWhen(last?.when);
  const body = String(text ?? "").replace(/^[^\n]*\n/, "");
  return { date: s.date || fw.date, time: s.time || fw.time, place: s.place || last?.place || "", weather: weatherOf(body) || folder?.extra?.weather?.w || "", fromLine: !!(s.date || s.time) };
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
const KDAY = ["일", "월", "화", "수", "목", "금", "토"];
export function dateLabel(date) {
  const m = String(date ?? "").match(/(\d{3,4})-(\d{1,2})-(\d{1,2})/); if (!m) return String(date ?? "");
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${+m[1]}년 ${+m[2]}월 ${+m[3]}일 ${Number.isNaN(d.getTime()) ? "" : `(${KDAY[d.getUTCDay()]})`}`.trim();
}
// 패널 HTML. people = [{name, card?: 상태창 안쪽 HTML}]
export function scenePanelHtml({ date = "", time = "", place = "", weather = "", people = [] } = {}) {
  if (!date && !time && !place && !people.length) return "";
  const [bg, layer, anim, icon, fg] = WX[weather] ?? WX[""];
  const dur = { dkRain: ".7s linear infinite", dkRainHard: ".45s linear infinite", dkSnow: "6s linear infinite", dkDrift: "14s cubic-bezier(.45,.05,.35,1.25) infinite", dkSun: "5s cubic-bezier(.34,1.56,.64,1) infinite", dkFog: "18s ease-in-out infinite", dkThunder: "5s linear infinite", dkWind: "2.2s linear infinite", dkLamp: "3.4s ease-in-out infinite" }[anim];
  const size = anim === "dkSnow" ? "100% 100%,46px 46px,30px 30px" : "100% 100%";
  const chips = people.map((p) => p.card
    ? `<span style="display:inline-block;margin:0 4px 0 0;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.28);color:${fg}">${linkHtml(p.name, p.card)}</span>`
    : `<span style="display:inline-block;margin:0 4px 0 0;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.12);color:${fg};opacity:.85">${esc(p.name)}</span>`).join("");
  return `\n\n${SCENE_CSS}<div x-dusk="scene" style="position:relative;margin:12px 0 6px;border-radius:18px;overflow:hidden;color:${fg};background:${layer},${bg};background-size:${size};animation:${anim} ${dur},dkPop .5s cubic-bezier(.34,1.56,.64,1) both;box-shadow:0 8px 24px rgba(0,0,0,.18);font-style:normal;line-height:1.35;text-shadow:0 1px 2px rgba(0,0,0,${fg === "#fff" || fg.startsWith("#e") || fg.startsWith("#f") ? ".35" : "0"})">`
    + `<div style="display:flex;align-items:flex-start;gap:10px;padding:13px 15px 10px">`
    + `<div style="flex:1;min-width:0"><div style="font-size:11.5px;letter-spacing:.06em;opacity:.85">${esc(dateLabel(date) || "날짜 미정")}</div>`
    + `<div style="font-size:28px;font-weight:800;letter-spacing:.02em;line-height:1.15;margin-top:2px;font-variant-numeric:tabular-nums">${esc(time || "--:--")}</div>`
    + `${place ? `<div style="font-size:13px;margin-top:3px;opacity:.95">📍 ${esc(place)}</div>` : ""}</div>`
    + `<div style="flex:none;text-align:center"><div style="font-size:26px;line-height:1">${icon}</div><div style="font-size:11px;margin-top:3px;opacity:.9">${esc(weather || "")}</div></div></div>`
    + (chips ? `<div style="margin:0 10px 10px;padding:6px 8px;border-radius:12px;background:rgba(0,0,0,.14);backdrop-filter:blur(4px);font-size:12px;white-space:nowrap;overflow-x:auto"><span style="font-size:10.5px;opacity:.75;margin-right:6px">등장</span>${chips}</div>` : "")
    + `</div>`;
}
