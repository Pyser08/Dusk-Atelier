// 장기기억 애드온(0.3.22): 기후·날씨 엔진(순수). 계산은 엔진이, 기후대·달력(판타지)은 기록기 AI가 한 줄로 정한다.
// - 기후대(zone)×계절(달력의 한 해 중 위치, 남반구는 반 바퀴) → 날씨 확률·낮/밤 기온
// - 마르코프 연쇄: 반나절(낮·밤)마다 앞 날씨를 이어받아 흐름이 자연스럽고, 응답에 날씨가 나오면 그게 기준점(anchor)이 된다
// - 같은 채팅·같은 날이면 늘 같은 날씨(씨앗 난수). 날짜를 건너뛰면 기준점부터 그날까지 이어서 굴린다
// - 예보: 오늘부터 4일 뒤까지 낮·밤 확률 분포를 앞으로 퍼뜨려 가장 그럴듯한 날씨·강수 확률·기온
import { seededRand } from "./zonegen.js";

export const STATES = Object.freeze(["맑음", "구름", "흐림", "비", "폭우", "눈", "안개", "천둥", "바람"]);
const WET = new Set(["비", "폭우", "눈", "천둥"]);
// 계절 기준점(한 해 중 위치): 겨울 0.04 · 봄 0.29 · 여름 0.54 · 가을 0.79. 값: [확률 9칸(STATES 순), 낮 최고, 밤 최저]
const Z = (w, sp, su, au) => ({ w, sp, su, au });
export const ZONES = Object.freeze({
  temperate: { label: "온대", ...Z([[30, 30, 20, 5, 0, 10, 3, 0, 2], 6, -1], [[35, 30, 15, 12, 1, 0, 4, 1, 2], 18, 8], [[20, 25, 20, 20, 6, 0, 2, 7, 0], 29, 21], [[40, 30, 13, 10, 1, 0, 5, 1, 0], 19, 9]) },
  continental: { label: "냉대 계절풍", ...Z([[45, 25, 12, 2, 0, 12, 2, 0, 2], 3, -7], [[40, 27, 13, 10, 1, 1, 3, 1, 4], 18, 6], [[18, 22, 18, 22, 10, 0, 2, 8, 0], 30, 22], [[48, 26, 12, 9, 1, 0, 4, 0, 0], 19, 7]) },
  oceanic: { label: "서안 해양성", ...Z([[12, 25, 35, 22, 2, 2, 2, 0, 0], 8, 3], [[22, 30, 25, 18, 1, 0, 3, 1, 0], 14, 6], [[28, 32, 20, 15, 1, 0, 1, 3, 0], 22, 13], [[15, 25, 30, 24, 3, 0, 3, 0, 0], 15, 8]) },
  mediterranean: { label: "지중해성", ...Z([[30, 25, 18, 20, 3, 1, 1, 1, 1], 14, 6], [[45, 28, 10, 12, 1, 0, 1, 2, 1], 21, 11], [[80, 14, 2, 1, 0, 0, 0, 2, 1], 31, 20], [[50, 25, 10, 12, 2, 0, 0, 1, 0], 24, 14]) },
  tropical: { label: "열대", ...Z([[30, 32, 10, 14, 5, 0, 1, 8, 0], 31, 23], [[30, 30, 10, 15, 6, 0, 1, 8, 0], 32, 24], [[22, 28, 12, 18, 9, 0, 0, 11, 0], 31, 24], [[28, 30, 10, 16, 7, 0, 1, 8, 0], 31, 24]) },
  monsoon: { label: "열대 계절풍", ...Z([[55, 25, 10, 6, 0, 0, 3, 1, 0], 27, 16], [[40, 30, 12, 10, 2, 0, 1, 5, 0], 33, 23], [[10, 20, 25, 25, 12, 0, 0, 8, 0], 32, 26], [[35, 30, 15, 12, 3, 0, 1, 4, 0], 30, 22]) },
  arid: { label: "건조", ...Z([[72, 18, 4, 2, 0, 0, 1, 0, 3], 20, 6], [[75, 15, 3, 1, 0, 0, 0, 1, 5], 30, 15], [[82, 10, 2, 1, 0, 0, 0, 1, 4], 40, 26], [[78, 14, 3, 1, 0, 0, 0, 1, 3], 31, 16]) },
  subarctic: { label: "아한대", ...Z([[25, 20, 25, 0, 0, 28, 2, 0, 0], -12, -22], [[30, 28, 20, 6, 0, 12, 2, 0, 2], 4, -6], [[35, 30, 15, 15, 1, 0, 2, 2, 0], 20, 8], [[22, 25, 25, 15, 1, 8, 4, 0, 0], 4, -4]) },
  polar: { label: "한대", ...Z([[25, 20, 25, 0, 0, 25, 0, 0, 5], -25, -33], [[25, 25, 25, 0, 0, 20, 0, 0, 5], -12, -20], [[25, 30, 30, 5, 0, 8, 2, 0, 0], 5, 0], [[20, 25, 30, 2, 0, 18, 0, 0, 5], -8, -15]) },
  highland: { label: "고산", ...Z([[38, 25, 15, 3, 0, 12, 4, 0, 3], 4, -6], [[32, 28, 14, 12, 1, 3, 6, 1, 3], 14, 3], [[22, 25, 18, 20, 4, 0, 5, 6, 0], 22, 11], [[38, 27, 14, 10, 1, 2, 7, 1, 0], 14, 3]) },
});
// 현실 지명 → 기후대(반구). AI가 정하기 전·AI 줄이 없을 때의 추정
const PLACES = [
  [/서울|부산|인천|대구|광주|대전|한국|korea|평양|북한|베이징|북경|하얼빈|선양|몽골|울란바토르/i, "continental"],
  [/도쿄|오사카|교토|일본|japan|tokyo|osaka|상하이|타이베이|대만|taiwan|홍콩|뉴욕|new york|워싱턴|보스턴|시카고/i, "temperate"],
  [/런던|영국|london|britain|england|파리|paris|프랑스|베를린|독일|암스테르담|네덜란드|더블린|아일랜드|시애틀|밴쿠버|브뤼셀/i, "oceanic"],
  [/로마|이탈리아|italy|아테네|그리스|바르셀로나|마드리드|스페인|리스본|포르투갈|로스앤젤레스|\bla\b|샌프란시스코|캘리포니아|이스탄불/i, "mediterranean"],
  [/싱가포르|말레이시아|쿠알라|자카르타|인도네시아|발리|하와이|브라질|아마존|카리브|열대/i, "tropical"],
  [/방콕|태국|베트남|하노이|호치민|인도|뭄바이|델리|필리핀|마닐라|미얀마/i, "monsoon"],
  [/사막|두바이|카이로|이집트|사우디|리야드|라스베이거스|피닉스|사하라|desert/i, "arid"],
  [/모스크바|러시아|시베리아|핀란드|헬싱키|노르웨이|스웨덴|캐나다|알래스카|퀘벡/i, "subarctic"],
  [/남극|북극|그린란드|빙하|툰드라|arctic|antarctic/i, "polar"],
  [/티베트|안데스|알프스|히말라야|고원|산정|highland/i, "highland"],
];
const SOUTH = /시드니|멜버른|호주|australia|뉴질랜드|오클랜드|부에노스|아르헨티나|칠레|산티아고|남아공|케이프타운|상파울루|리우/i;
const SOUTH_ZONE = [[/시드니|오클랜드|뉴질랜드|멜버른/i, "oceanic"], [/부에노스|아르헨티나|상파울루|리우|칠레|산티아고|케이프타운|남아공|호주|australia/i, "mediterranean"]];
// 글 → {zone, hemi, region, src:"guess"} 또는 null
export function guessClimate(text) {
  const t = String(text ?? "");
  if (SOUTH.test(t)) { const z = SOUTH_ZONE.find(([re]) => re.test(t))?.[1] ?? "temperate"; return { zone: z, hemi: "S", region: t.match(SOUTH)?.[0] ?? "", months: 12, mdays: 0, src: "guess" }; }
  for (const [re, zone] of PLACES) { const m = t.match(re); if (m) return { zone, hemi: "N", region: m[0], months: 12, mdays: 0, src: "guess" }; }
  return null;
}
// 기록기 줄: 기후대·반구·지역·달력. 판타지는 봇 설정의 달력(한 해 달 수·한 달 날 수)을 따른다
export const CLIMATE_STAGE1 = "\nclimate|temperate, continental, oceanic, mediterranean, tropical, monsoon, arid, subarctic, polar or highland|N or S|region (Korean)|months per year|days per month (0 = real calendar)      the climate of where the story is set — judge from the setting's real country/city or the fantasy world's lore; give it when first clear or when the story moves to a different climate";
export function climateFrom(f) {
  const zone = String(f?.[1] ?? "").trim().toLowerCase();
  if (!ZONES[zone]) return null;
  const months = Math.round(Number(String(f[4] ?? "").replace(/[^\d]/g, ""))), mdays = Math.round(Number(String(f[5] ?? "").replace(/[^\d]/g, "")));
  return { zone, hemi: /^s/i.test(String(f[2] ?? "").trim()) ? "S" : "N", region: String(f[3] ?? "").trim().slice(0, 30),
    months: months >= 1 && months <= 30 ? months : 12, mdays: mdays >= 5 && mdays <= 60 ? mdays : 0, src: "ai" };
}

// ── 달력: 현실(mdays 0, 12달)은 그레고리력, 아니면 한 해 = months × mdays일 ──
const isReal = (cal) => !cal || (!cal.mdays && (cal.months ?? 12) === 12);
export function parseIso(s) {
  const m = String(s ?? "").match(/(\d{1,5})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
const pad = (n, w = 2) => String(n).padStart(w, "0");
export const isoOf = ({ y, m, d }) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
export function dayIndex(date, cal) {
  const p = typeof date === "string" ? parseIso(date) : date; if (!p) return NaN;
  if (isReal(cal)) { const t = new Date(0); t.setUTCFullYear(p.y, p.m - 1, p.d); return Math.round(t.getTime() / 864e5); }
  const M = cal.months, D = cal.mdays; return (p.y * M + (Math.min(p.m, M) - 1)) * D + (Math.min(p.d, D) - 1);
}
export function dateOfIndex(n, cal) {
  if (isReal(cal)) { const t = new Date(n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  const M = cal.months, D = cal.mdays, ym = Math.floor(n / D); return { y: Math.floor(ym / M), m: (ym % M) + 1, d: (n % D) + 1 };
}
export const addDays = (iso, k, cal) => isoOf(dateOfIndex(dayIndex(iso, cal) + k, cal));
// 한 해 중 위치(0~1). 남반구는 반 바퀴
export function yearPos(date, cal, hemi = "N") {
  const p = typeof date === "string" ? parseIso(date) : date; if (!p) return 0.3;
  let f;
  if (isReal(cal)) { const n = dayIndex(p, cal), n0 = dayIndex({ y: p.y, m: 1, d: 1 }, cal); f = (n - n0) / 365.25; }
  else f = ((Math.min(p.m, cal.months) - 1) * cal.mdays + (p.d - 1)) / (cal.months * cal.mdays);
  return ((f + (hemi === "S" ? 0.5 : 0)) % 1 + 1) % 1;
}
const KDAY = ["일", "월", "화", "수", "목", "금", "토"];
export function weekday(date, cal) { if (!isReal(cal)) return ""; const n = dayIndex(date, cal); return Number.isFinite(n) ? KDAY[((n % 7) + 11) % 7] : ""; }

// ── 기후 평년값 ──
const ANCH = [["w", 0.04], ["sp", 0.29], ["su", 0.54], ["au", 0.79]];
const norm = (v) => { const s = v.reduce((a, b) => a + b, 0) || 1; return v.map((x) => x / s); };
export function climo(zone, pos) {
  const Zn = ZONES[zone] ?? ZONES.temperate;
  let i = ANCH.length - 1; for (let k = 0; k < ANCH.length; k++) if (pos >= ANCH[k][1]) i = k;
  const [ka, pa] = ANCH[i], [kb, pb0] = ANCH[(i + 1) % 4], pb = pb0 <= pa ? pb0 + 1 : pb0, pp = pos < pa ? pos + 1 : pos;
  const t = (1 - Math.cos(Math.PI * ((pp - pa) / (pb - pa)))) / 2, A = Zn[ka], B = Zn[kb];
  const lerp = (a, b) => a + (b - a) * t;
  const p = norm(A[0].map((x, j) => lerp(x, B[0][j])));
  return { p, hi: lerp(A[1], B[1]), lo: lerp(A[2], B[2]) };
}
// 반나절 분포: 낮엔 천둥·바람 조금 더, 밤엔 안개 조금 더·맑으면 별. 추우면 비→눈, 따뜻하면 눈→비
function halfDist(c, night) {
  const p = [...c.p], temp = night ? c.lo : c.hi;
  if (night) { p[6] *= 1.6; p[7] *= 0.7; p[8] *= 0.7; } else { p[6] *= 0.6; }
  if (temp <= 1) { p[5] += p[3] + p[4] * 0.5; p[3] = 0; p[4] *= 0.5; p[7] = 0; } else if (temp >= 4) { p[3] += p[5]; p[5] = 0; }
  return norm(p);
}
// 이어받기: 앞 상태를 55% 정도 유지(비슷한 날씨로 번짐)
const NEAR = { 맑음: { 맑음: 1, 구름: .5 }, 구름: { 구름: 1, 맑음: .5, 흐림: .5 }, 흐림: { 흐림: 1, 구름: .5, 비: .4, 안개: .2 }, 비: { 비: 1, 흐림: .6, 폭우: .3, 천둥: .2 }, 폭우: { 폭우: .8, 비: 1, 천둥: .4 }, 눈: { 눈: 1, 흐림: .6 }, 안개: { 안개: .8, 흐림: .6, 구름: .3 }, 천둥: { 천둥: .6, 비: 1, 폭우: .5 }, 바람: { 바람: .7, 구름: .6, 맑음: .4 } };
const KEEP = 0.5;
function stepDist(prev, base) {
  // prev: 확률 벡터(이전 반나절) → base(이번 평년)와 섞음
  const carry = STATES.map(() => 0);
  prev.forEach((q, i) => { if (!q) return; const nb = NEAR[STATES[i]], s = Object.values(nb).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(nb)) carry[STATES.indexOf(k)] += q * w / s; });
  // 이어받은 상태도 이번 반나절에 불가능한 것(예: 따뜻한데 눈)은 base 비율로 막는다
  const mixed = carry.map((x, i) => (base[i] > 0.001 ? x : 0));
  return norm(mixed.map((x, i) => KEEP * x + (1 - KEEP) * base[i]));
}
const onehot = (w) => STATES.map((s) => (s === w ? 1 : 0));
const sample = (p, r) => { let x = r(), i = 0; for (; i < p.length - 1; i++) { x -= p[i]; if (x < 0) break; } return STATES[i]; };
const halfOf = (time) => { const h = Number(String(time ?? "").match(/(\d{1,2}):/)?.[1]); return Number.isFinite(h) && (h < 6 || h >= 18) ? 1 : 0; };   // 0 낮, 1 밤
const slotOf = (date, time, cal) => dayIndex(date, cal) * 2 + halfOf(time);

// 반나절 칸 하나의 실제 날씨·기온(씨앗 난수, 앞 칸 이어받기)
function tempOf(c, night, w, r) { const base = night ? c.lo : c.hi; const adj = w === "맑음" ? (night ? -1.5 : 1.5) : WET.has(w) ? -2 : w === "흐림" ? -0.8 : 0; return Math.round(base + adj + (r() - 0.5) * 4); }
function climoAt(slot, cl) { const n = Math.floor(slot / 2), pos = yearPos(dateOfIndex(n, cl), cl, cl.hemi); return climo(cl.zone, pos); }
// 기준점부터 slot까지 굴린 실제 날씨. anchor: {slot, w} (없거나 30일보다 멀면 평년에서 새로 뽑음)
export function actualAt(slot, cl, seed, anchor = null) {
  const SPAN = 60;
  let from = anchor && Number.isFinite(anchor.slot) && anchor.slot <= slot && slot - anchor.slot <= SPAN && STATES.includes(anchor.w) ? anchor.slot : slot - (((slot % 12) + 12) % 12) - 12, w = from === anchor?.slot ? anchor.w : null;
  for (let s = from; s <= slot; s++) {
    if (s === anchor?.slot && w) continue;
    const c = climoAt(s, cl), base = halfDist(c, s % 2 === 1), r = seededRand(`${seed}|wx|${s}`);
    w = sample(w ? stepDist(onehot(w), base) : base, r);
  }
  const c = climoAt(slot, cl); return { w, t: tempOf(c, slot % 2 === 1, w, seededRand(`${seed}|t|${slot}`)) };
}
// 예보: 오늘(낮·밤)부터 days일 뒤까지. 실제로 굴린 앞날 날씨를 보여 주되, 멀수록 평년 쪽으로 불확실해진다
// (예보 확률 = q×(그 날씨) + (1-q)×평년 확률, q = 0.9^반나절 수). 이야기가 그날에 닿았을 때 새 보고가 없으면 예보 날씨 그대로 온다
export function forecast(cl, date, time, seed, { anchor = null, days = 4 } = {}) {
  if (!cl || !Number.isFinite(dayIndex(date, cl))) return null;
  const now = slotOf(date, time, cl), cur = actualAt(now, cl, seed, anchor);
  const d0 = Math.floor(now / 2), out = [];
  let w = cur.w;
  for (let k = 0; k <= days; k++) {
    const dd = dateOfIndex(d0 + k, cl), day = { date: isoOf(dd), wd: weekday(dd, cl), half: [] };
    for (let h = 0; h < 2; h++) {
      const s = (d0 + k) * 2 + h, c = climoAt(s, cl), base = halfDist(c, h === 1);
      if (s < now) { day.half.push(null); continue; }
      if (s > now) w = sample(stepDist(onehot(w), base), seededRand(`${seed}|wx|${s}`));
      const q = Math.pow(0.9, s - now), i = STATES.indexOf(w);
      const climoRain = STATES.reduce((a, st, j) => a + (WET.has(st) ? base[j] : 0), 0);
      const t = s === now ? cur.t : tempOf(c, h === 1, w, seededRand(`${seed}|t|${s}`));
      day.half.push({ w, conf: Math.round((q + (1 - q) * base[i]) * 100), rain: Math.round((q * (WET.has(w) ? 1 : 0) + (1 - q) * climoRain) * 100), t, now: s === now });
    }
    out.push(day);
  }
  return { now: cur, days: out };
}
// 채팅 하나의 기후: AI가 정한 것 → 장소·봇 글에서 추정 → 온대
export function climateOf(e, hint = "") { return e?.climate?.zone ? e.climate : (guessClimate(hint) ?? { zone: "temperate", hemi: "N", region: "", months: 12, mdays: 0, src: "default" }); }
// 저장된 날씨 보고(e.weather {w, when}) → 기준점
export function anchorOf(e, cl) {
  const w = e?.weather; if (!w?.w || !STATES.includes(w.w)) return null;
  const d = parseIso(w.when); if (!d) return null;
  return { slot: slotOf(d, String(w.when).match(/\d{1,2}:\d{2}/)?.[0] ?? "12:00", cl), w: w.w };
}
// 주입 한 줄(영문 지시 + 한국어 값). 장면이 날씨와 어긋나지 않게
export function weatherLine(fc, cl) {
  if (!fc) return "";
  const d = fc.days, nx = d[1]?.half?.[0], tw = [d[0]?.half?.[0], d[0]?.half?.[1]].filter(Boolean);
  const cur = fc.now;
  return `- Weather (${ZONES[cl.zone]?.label ?? cl.zone}${cl.region ? `, ${cl.region}` : ""}): now ${cur.w} ${cur.t}°C${tw.length > 1 ? `, tonight ${tw[1].w}` : ""}${nx ? `; tomorrow ${nx.w} (rain ${nx.rain}%)` : ""}. Keep scenes, clothing and plans consistent with it; the story may change it.`;
}
