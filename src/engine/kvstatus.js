// 장기기억 애드온: 카드가 직접 쓰는 key=value 상태 줄 읽기(순수). 예: [Status:date=1214년 11월 29일|time=20:15|location=…|npc=…]
// 버그리포트 11-22 — 이런 줄은 120자를 넘어 코어 storytime.parseStatus(짧은 줄만 봄)가 버려 장면 상태창 시간이 --:--였다.
// 코어 모듈은 고치지 않고(애드온만 배포) 장면 상태창에서 먼저 이걸 읽는다.
import { storyDateFromText } from "./pot/cycle-tracking.js";
import { timeFromText } from "./storytime.js";

const KEY = { date: /^(date|day|날짜|일자)$/i, time: /^(time|시간|시각)$/i, place: /^(location|place|loc|where|장소|위치)$/i };
// 시간을 낱말로 적은 경우의 대략 시각(장면 상태창·예보용)
const WORDS = [[/한밤중|자정/, "00:00"], [/새벽/, "04:00"], [/아침/, "08:00"], [/정오|한낮|점심/, "12:00"], [/오전/, "10:00"], [/오후/, "15:00"], [/저녁|해질녘|노을/, "19:00"], [/낮/, "13:00"], [/밤/, "22:00"]];
export function wordTime(s) { const t = String(s ?? ""); const w = WORDS.find(([re]) => re.test(t)); return w ? w[1] : ""; }

// 11-22 버그리포트: 이머헬퍼 상태 태그 <imh-now cal="2025년" date="6월 29일" time="17:43" place="…" att="…" /> — att가 붙으면 100자를 넘어 못 읽었다
export function imhStatus(text) {
  const all = [...String(text ?? "").matchAll(/<imh-now\b([^>]*)\/?>/gi)]; if (!all.length) return null;
  const a = {}; for (const m of all.at(-1)[1].matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) a[m[1].toLowerCase()] = m[2].trim();
  const dv = [a.cal, a.date].filter(Boolean).join(" "), tv = a.time ?? "";
  const date = dv ? storyDateFromText(dv, "") : "", time = tv ? timeFromText(tv) || wordTime(tv) : "";
  if (!date && !time) return null;
  return { date, time, place: (a.place ?? "").slice(0, 40) };
}
export function kvStatus(text) {
  const imh = imhStatus(text); if (imh) return imh;
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[\[【].*[\]】]$/.test(l) && /[=＝]/.test(l));
  for (const line of lines.reverse()) {   // 응답 끝에 쓰는 카드가 많아 뒤에서부터
    const body = line.replace(/^[\[【]\s*|\s*[\]】]$/g, "").replace(/^[^|=]*?[:：]\s*(?=[^|]*=)/, "");
    const kv = {};
    for (const part of body.split(/\s*[|｜]\s*/)) { const m = /^([^=＝]+)[=＝](.*)$/.exec(part); if (m) kv[m[1].trim()] = m[2].trim(); }
    const get = (k) => Object.entries(kv).find(([key]) => KEY[k].test(key))?.[1] ?? "";
    const dv = get("date"), tv = get("time");
    const date = dv ? storyDateFromText(dv, "") : "", time = tv ? timeFromText(tv) || wordTime(tv) : "";
    if (!date && !time) continue;
    return { date, time, place: get("place").slice(0, 40) };
  }
  return null;
}
