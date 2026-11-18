// 장기기억 애드온: 인물 위키 카드 — 성욕 게이지·몸 상태(NSFW), 마음 흐름(관계), 성감대 인체 모형(NSFW), 사람다운 항목(상세·NSFW).
// 수치는 엔진 계산(engine/nsfwlife.js), 글은 기록기·성인 프로필이 채우고 여기서 고칠 수 있다.
import { memStore } from "./memstore.js";
import { h, replace } from "../../dom.js";
import { btn, modal, promptDialog, confirmDialog } from "../../kit.js";
import { mem } from "./common.js";
import { lifeView, LUST_STEPS, DEV_LEVELS, MOOD_KEYS, MOOD_LABEL, emptyLife } from "../../../engine/nsfwlife.js";
import { nowOf } from "../../../engine/memoryhuman.js";
import { HUMAN_FIELDS, EXT_FIELDS, BODY_PARTS, normHuman, normExt, partOf } from "../../../engine/humanitems.js";

const note = (t) => h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, t);
// 버튼을 눌러 값만 바뀔 땐 화면 전체를 다시 불러오지 않고 이 인물의 카드만 다시 그린다(스크롤·펼침 유지)
const hosts = new Set();
function live(docId, render) { const host = h("div", { class: "rb-live" }); host.__doc = docId; host.__paint = () => replace(host, render()); host.__paint(); hosts.add(host); return host; }
async function repaint(env, doc) {
  try { const f = await memStore(env.ctx).getFolder(env.bot.id, env.chatItem.id); if (f && env.folder) { env.folder.nsfw = f.nsfw; env.folder.life = f.life; } } catch { /* 아래에서 전체 다시 그림 */ }
  let n = 0; for (const x of [...hosts]) { if (!x.isConnected) { hosts.delete(x); continue; } if (x.__doc === doc.id) { x.__paint(); n++; } }
  if (!n) env.redraw?.();
}
const saveN = (env, doc, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, (f) => { f.nsfw ??= {}; f.nsfw[doc.id] = fn(f.nsfw[doc.id] ?? { sexual: {}, axes: {}, pref: null, positions: [], seduction: null, humor: null, by: "ai", at: new Date().toISOString(), log: [] }); })).then(() => repaint(env, doc)).catch((e) => env.ctx.toast?.(e?.message ?? String(e), { error: true }));
// 몸·마음 값 직접 고치기(엔진 값 덮어쓰기). 다음 턴부터 엔진이 이어서 계산해요
const saveLife = (env, doc, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, (f) => { f.life ??= { turn: null, p: {} }; f.life.p ??= {}; f.life.p[doc.id] = fn({ ...emptyLife(), ...(f.life.p[doc.id] ?? {}) }); })).then(() => repaint(env, doc)).catch((e) => env.ctx.toast?.(e?.message ?? String(e), { error: true }));
export function openLifeEditor(env, doc) {
  const L = env.folder?.life?.p?.[doc.id] ?? emptyLife();
  const num = (k, label, v) => h("label", { class: "rb-mem-edrow", style: "justify-content:space-between;gap:10px" }, h("span", null, label), h("input", { class: "rb-input", type: "number", min: 0, max: 100, "data-k": k, value: String(Math.round(v ?? 0)), style: "width:90px" }));
  const partners = Object.entries(L.sex?.by ?? {}), habits = Object.entries(L.habits ?? {});
  return modal(env.ctx.win, (done) => {
    const box = h("div", { class: "rb-mem-ed", style: "display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow:auto" },
      h("b", null, "몸"), num("lust", "성욕(달아오름)", L.lust), num("fat", "피로", L.fat),
      h("b", null, "기분"), ...MOOD_KEYS.map((k) => num(`mood.${k}`, MOOD_LABEL[k], L.mood?.[k])),
      partners.length ? h("b", null, "상대별 경험(이야기 속 · 이야기 전)") : null,
      ...partners.map(([k, b]) => h("div", { class: "rb-mem-edrow", style: "gap:8px;align-items:center" }, h("span", { style: "flex:1" }, b.name === "{{user}}" ? "나" : b.name),
        h("input", { class: "rb-input", type: "number", min: 0, "data-k": `n.${k}`, value: String(b.n ?? 0), style: "width:70px", title: "이야기 속" }),
        h("input", { class: "rb-input", type: "number", min: 0, "data-k": `prior.${k}`, value: b.prior == null ? "" : String(b.prior), style: "width:70px", placeholder: "이전", title: "이야기 전(비우면 없음)" }))),
      habits.length ? h("b", null, "둘만의 버릇(쉼표로, 비우면 지움)") : null,
      ...habits.map(([k, x]) => h("label", { class: "rb-mem-edrow", style: "flex-direction:column;align-items:stretch;gap:4px" }, h("span", null, x.name === "{{user}}" ? "나" : x.name), h("textarea", { class: "rb-input", rows: 1, "data-k": `hab.${k}` }, x.list.join(", ")))));
    const val = (k) => box.querySelector(`[data-k="${k}"]`)?.value ?? "";
    const n100 = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "몸·마음 고치기" }, h("h3", null, `${doc.title} · 몸·마음 고치기`), box,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(false) }), btn("저장", { kind: "primary", onClick: async () => {
        await saveLife(env, doc, (cur) => {
          const next = { ...cur, lust: n100(val("lust")), fat: n100(val("fat")), mood: Object.fromEntries(MOOD_KEYS.map((k) => [k, n100(val(`mood.${k}`))]).filter(([, v]) => v > 0)), sex: { ...cur.sex, by: { ...(cur.sex?.by ?? {}) } }, habits: { ...(cur.habits ?? {}) } };
          for (const [k] of partners) { const b = { ...next.sex.by[k] }; b.n = Math.max(0, Math.round(Number(val(`n.${k}`)) || 0)); const pv = val(`prior.${k}`).trim(); if (pv === "") { delete b.prior; delete b.est; } else { b.prior = Math.max(0, Math.round(Number(pv) || 0)); b.est = false; } next.sex.by[k] = b; }
          next.sex.n = Object.values(next.sex.by).reduce((a, b) => a + (b.n ?? 0), 0);
          for (const [k] of habits) { const list = val(`hab.${k}`).split(/[,，\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 4); if (list.length) next.habits[k] = { ...next.habits[k], list }; else delete next.habits[k]; }
          next.trace = [...(cur.trace ?? []), { turn: env.folder?.cursor?.at ?? 0, text: "직접 고침" }].slice(-14);
          return next;
        });
        done(true);
      } })));
  });
}
const viewOf = (env, doc) => lifeView(env.folder, doc, nowOf(env.folder));

// ── 작은 i 버튼: 누르면 그 수치 설명이 말풍선으로 ──
export function infoBtn(text) {
  if (!text) return null;
  const tipEl = h("span", { class: "rb-ibub", role: "tooltip" }, text);
  // 열면 다른 열린 말풍선은 닫고, 화면 다른 곳을 누르거나 Esc면 닫는다
  const close = () => { b.classList.remove("open"); doc?.removeEventListener("pointerdown", outside, true); doc?.removeEventListener("keydown", esc, true); };
  const outside = (e) => { if (!wrapEl.contains(e.target)) close(); };
  const esc = (e) => { if (e.key === "Escape") close(); };
  let doc = null, wrapEl = null;
  const b = h("button", { type: "button", class: "rb-ibtn", "aria-label": "설명 보기", "aria-expanded": "false", onClick: (e) => { e.stopPropagation();
    doc = b.ownerDocument; if (b.classList.contains("open")) return close();
    doc.querySelectorAll(".rb-ibtn.open").forEach((x) => x.dispatchEvent(new (doc.defaultView.CustomEvent)("rb-iclose")));
    b.classList.add("open"); b.setAttribute("aria-expanded", "true"); doc.addEventListener("pointerdown", outside, true); doc.addEventListener("keydown", esc, true); } }, "i");
  b.addEventListener("rb-iclose", close);
  wrapEl = h("span", { class: "rb-iwrap" }, b, tipEl);
  return wrapEl;
}
export const LIFE_INFO = Object.freeze({
  lust: "성욕 게이지(0~100). 매 턴 성적 관심 × 달아오르는 속도 × 주기·끌림·애인 여부로 오르고, 관계·절정 뒤 크게 내려가요. 대화에서 자극·진정이 드러나면 기록기가 더 올리거나 내려요. 90 이상이면 장면 계획이 반드시 잡혀요.",
  mult: "달아오르는 속도(0.5~2배). 성인 프로필을 만들 때 AI가 적극성·즉흥성·성격을 보고 정해요. 전체 속도는 장기 기억 → 설정 → 게이지 배수의 ‘달아오르는 속도’로 조절해요.",
  fat: "피로(0~100). 관계 뒤 오르고 시간이 지나면 천천히, 잠을 자면 바로 풀려요. 70 이상이면 성욕이 덜 올라요.",
  since: "마지막으로 관계한 뒤 지난 응답 수예요. 40턴이 넘으면 성욕이 더 빨리 올라요.",
  cnt: "이야기 속 관계 횟수 + 이야기 전 경험(입력·로어북에서 드러난 것)을 합친 수예요.",
  fam: "상대와의 익숙함. 처음 → 한 번 → 몇 번 → 익숙해지는 중 → 익숙함. 이야기 전 경험도 합쳐요. ‘밝혀지지 않음’은 횟수가 안 나와서 AI가 짐작한 값이에요.",
  boost: "기본으로 켜져 있어요. 켜 두면 응답에 이 인물의 성적 욕망·이상성향과 관련된 상황이 나올 때 성욕이 더 빨리 차요(글을 맞대어 엔진이 판단, 호출 없음).",
  temp: "관계 온도 = 끌림 + 호감 − 적대감. 최근 10번의 흐름이에요. 3 넘게 오르면 가까워지는 중, 내리면 식는 중.",
  miss: "보고 싶음. 이 인물이 안 나온 지 30턴이 넘으면, 지난 턴 수와 호감으로 계산해요.",
  jeal: "질투. 소유욕·독점욕(또는 끌림)이 있는 상대가 다른 사람에게 끌리거나 애인이면 생겨요.",
  mood: "기분(기쁨·짜증·불안·슬픔·설렘). 대화에서 기분이 크게 바뀌면 기록기가 올리고, 턴마다 5씩 원래대로 돌아가요.",
  preg: "임신 가능성. 월경 주기 단계로만 보여 줘요(피임 여부는 따지지 않아요).",
  trace: "성욕·피로가 왜 바뀌었는지 최근 기록이에요(자연 변화의 이유, 대화·행위로 바뀐 것).",
  sat: "관계 뒤 만족도. 아쉬움이 쌓이면 다음엔 성욕이 더 빨리 차고, 만족하면 더 오래 잠잠해요.",
  trust: "신뢰. 감정 기록의 신뢰 값 흐름이에요.",
  dev: "개발도(0~100). 그 부위가 자극받을 때마다 올라가고, 30·60·85에서 성감대 단계가 1·2·3으로 올라요.",
  zone: "성감대 단계. 1 약간 · 2 민감 · 3 약점. 대화에서 드러나면 기록기가 올리고, 점을 눌러 직접 바꿀 수 있어요.",
});
const hd = (t, key) => h("small", { class: "rb-lh" }, t, infoBtn(LIFE_INFO[key]));

// ── 성욕 게이지 + 몸 상태 ──
const ring = (v, cool) => {
  const R = 42, C = 2 * Math.PI * R, off = C * (1 - v / 100), id = `rbLg${Math.random().toString(36).slice(2, 7)}`;
  return h("svg", { class: ["rb-lring", cool && "cool"], viewBox: "0 0 100 100", "aria-hidden": "true" },
    h("defs", { svg: true }, h("linearGradient", { svg: true, id, x1: "0", y1: "0", x2: "1", y2: "1" },
      h("stop", { svg: true, offset: "0", "stop-color": "#ffb3c7" }), h("stop", { svg: true, offset: ".55", "stop-color": "#ec4f86" }), h("stop", { svg: true, offset: "1", "stop-color": "#a3195b" }))),
    h("circle", { svg: true, class: "bg", cx: 50, cy: 50, r: R }),
    h("circle", { svg: true, class: "fg", cx: 50, cy: 50, r: R, stroke: `url(#${id})`, "stroke-dasharray": C.toFixed(1), "stroke-dashoffset": off.toFixed(1) }));
};
const dots = (n, max = 5) => h("span", { class: "rb-fam", "aria-hidden": "true" }, Array.from({ length: max }, (_, i) => h("i", { class: i < n ? "on" : "" })));
function lustCard0(env, card, doc, { cycle = null } = {}) {
  const v = viewOf(env, doc), n = env.folder?.nsfw?.[doc.id] ?? null, pr = env.folder?.wiki?.people?.profiles?.[doc.id];
  const cyc = cycle ? h("div", { class: "rb-lcyc" }, h("small", { class: "rb-lh" }, "월경·임신"), cycle) : null;
  // 달아오르는 속도(배수) · 욕망·이상성향 스위치
  const mult = n?.lustMult ?? 1;
  const sw = (k, label, has) => h("button", { type: "button", class: ["rb-lsw", n?.boost?.[k] !== false && "on"], "aria-pressed": n?.boost?.[k] !== false ? "true" : "false", disabled: !has, title: has ? null : "위키에 이 글이 아직 없어요",
    onClick: () => saveN(env, doc, (cur) => ({ ...cur, boost: { ...(cur.boost ?? {}), [k]: cur.boost?.[k] === false } })) }, h("i", { class: "knob" }), label);
  const ctl = h("div", { class: "rb-lctl" },
    h("div", { class: "rb-lmult" }, h("small", null, "달아오르는 속도", infoBtn(LIFE_INFO.mult)), h("div", { class: "row" }, h("b", null, `×${mult.toFixed(1)}`))),
    h("div", { class: "rb-lsws" }, h("small", null, "관련 상황에 더 빨리", infoBtn(LIFE_INFO.boost)), h("div", { class: "row" }, sw("desire", "성적 욕망", !!pr?.sexualDesire?.text), sw("para", "이상성향", !!pr?.paraphilia?.text), h("span", { style: "flex:1" }), btn("직접 고치기", { size: "sm", onClick: () => openLifeEditor(env, doc) }))));
  if (!v) return card("🌡️ 몸 상태", [note("성욕 게이지는 아직 계산 전이에요. 이 인물이 나오는 응답이 기록되면 매 턴 자동으로 계산돼요(모델 호출 없음)."), ctl, cyc], null, "rb-life");
  const stepIdx = LUST_STEPS.reduce((k, [at], i) => (v.lust >= at ? i : k), 0);
  const tile = (cls, big, small, key, bar) => h("div", { class: ["rb-ltile", cls] }, h("small", null, small, infoBtn(LIFE_INFO[key])), h("b", null, big), bar != null ? h("i", { class: "mini" }, h("i", { style: { width: `${bar}%` } })) : null);
  return card("🌡️ 몸 상태", [
    h("div", { class: ["rb-lhero", v.refractory && "cool", stepIdx >= 4 && "hot"], role: "img", "aria-label": `성욕 ${v.lust}/100 · ${v.lustStep}` },
      h("div", { class: "rb-lring-wrap" }, ring(v.lust, v.refractory), h("div", { class: "mid" }, h("b", null, String(v.lust)), h("small", null, v.lustStep))),
      h("ol", { class: "rb-lsteps" }, [...LUST_STEPS].reverse().map(([at, l], ri) => { const i = LUST_STEPS.length - 1 - ri;
        return h("li", { class: [i === stepIdx && "now", i < stepIdx && "past"] }, h("i", null), h("span", null, l), h("small", null, String(at))); })),
      h("span", { class: "rb-lhi" }, infoBtn(LIFE_INFO.lust)),
      v.refractory ? h("span", { class: "rb-lbadge" }, "막 끝나서 잠잠") : v.lust >= 90 ? h("span", { class: "rb-lbadge hot" }, "한계 · 장면 계획 확정") : null),
    h("div", { class: "rb-ltoday" }, h("small", null, "오늘"), h("b", null, v.today)),
    v.mood.length ? h("div", { class: "rb-lmood" }, hd("기분", "mood"), h("div", { class: "bars" }, v.mood.map((m) => h("div", { class: ["mb", m.key] }, h("span", null, m.label), h("i", null, h("i", { style: { width: `${m.v}%` } })), h("small", null, String(m.v)))))) : null,
    ctl,
    h("div", { class: "rb-ltiles" },
      tile("fat", v.fatStep, "피로", "fat", v.fat),
      tile("since", v.sinceSex == null ? "—" : `${v.sinceSex}턴`, "마지막 관계 뒤", "since"),
      tile("cnt", `${v.sexN}번`, "경험", "cnt"),
      v.preg ? tile(`preg ${v.preg[1]}`, v.preg[0], "임신 가능성", "preg") : null),
    cyc,
    v.partners.length ? h("div", { class: "rb-lpart" }, hd("상대별 익숙함", "fam"),
      ...v.partners.slice(0, 6).map((p) => h("div", { class: "rb-lprow" }, h("b", null, p.name === "{{user}}" ? "나" : p.name), dots(p.total >= 15 ? 5 : p.total >= 5 ? 4 : p.total >= 2 ? 3 : p.total), h("span", { class: "fam" }, p.fam), h("span", { style: "flex:1" }),
        p.prior ? h("small", { class: ["prior", p.est && "est"] }, p.est ? `이야기 전 약 ${p.prior}번 · 밝혀지지 않음` : `이야기 전 ${p.prior}번`) : null,
        p.sat != null ? h("small", { class: ["sat", p.sat > 0.3 ? "good" : p.sat < -0.2 ? "bad" : ""], title: "만족도" }, p.sat > 0.3 ? "만족" : p.sat < -0.2 ? "아쉬움" : "보통") : null,
        h("small", null, `이야기 속 ${p.n}번`)))) : null,
    v.trace.length ? h("details", { class: "rb-ltrace" }, h("summary", null, "왜 이렇게 됐나요?", infoBtn(LIFE_INFO.trace), h("small", null, ` 최근 ${v.trace.length}개`)),
      h("ol", null, v.trace.map((t) => h("li", null, h("small", null, `${t.turn}턴`), h("span", null, t.text))))) : null,
    v.uses.length ? h("div", { class: "rb-luse" }, h("small", { class: "rb-lh" }, "자주 한 것"), h("div", { class: "rb-ltags" }, v.uses.map(([l, c]) => h("span", { class: "rb-ltag" }, l, h("b", null, String(c)))))) : null,
  ], null, "rb-life");
}
// 인물 비교: 이 채팅 인물들의 성욕·피로·기분 한눈에(지금 인물 강조)
export function compareCard(env, card, doc) {
  const docs = Object.values(env.folder?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && env.folder?.life?.p?.[d.id]);
  if (docs.length < 2) return null;
  const rows = docs.map((d) => ({ d, v: viewOf(env, d), adult: Object.keys(env.folder?.nsfw?.[d.id]?.sexual ?? {}).length > 0 })).filter((x) => x.v).sort((a, b) => b.v.lust - a.v.lust).slice(0, 8);
  const bar = (v, cls) => h("i", { class: ["cb", cls] }, h("i", { style: { width: `${v}%` } }));
  return card("👥 인물 비교", [h("div", { class: "rb-cmp" },
    h("div", { class: "hd" }, h("span", null, "인물"), h("span", null, "성욕"), h("span", null, "피로"), h("span", null, "기분")),
    ...rows.map(({ d, v, adult }) => h("div", { class: ["row", d.id === doc?.id && "me"] }, h("b", null, d.title), adult ? bar(v.lust, "lust") : h("small", { class: "rb-muted" }, "—"), bar(v.fat, "fat"), h("small", null, v.moodTop ? `${v.moodTop.label} ${v.moodTop.v}` : "평온"))))], null, "rb-life");
}
// NSFW 탭 배경 효과: 달아오름에 따라(0~1)
export function heatOf(env, doc) { const v = doc ? viewOf(env, doc) : null; return v && Object.keys(env.folder?.nsfw?.[doc.id]?.sexual ?? {}).length ? v.lust / 100 : 0; }
export function heatFx() { return h("div", { class: "rb-heatfx", "aria-hidden": "true" }, Array.from({ length: 10 }, (_, i) => h("i", { style: { "--x": `${(i * 37) % 100}%`, "--d": `${6 + (i % 4) * 1.7}s`, "--w": `${-(i * 0.9)}s`, "--z": String(0.6 + (i % 3) * 0.25) } }, "♥"))); }

// ── 그래프: 부드러운 곡선(카디널 → 베지어) ──
export function smoothPath(xy) {
  if (xy.length < 2) return xy.length ? `M${xy[0][0]},${xy[0][1]}` : "";
  let d = `M${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2, t = 0.18;
    d += ` C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
const spark = (hs, cls) => {
  if (!hs?.length) return null;
  const lo = Math.min(...hs, 0), hi = Math.max(...hs, 1), w = 160, ht = 44, n = hs.length, pad = 5, id = `rbSp${Math.random().toString(36).slice(2, 7)}`;
  const xy = hs.map((y, i) => [pad + (n === 1 ? w - 2 * pad : (i / (n - 1)) * (w - 2 * pad)), pad + (ht - 2 * pad) - ((y - lo) / Math.max(1, hi - lo)) * (ht - 2 * pad)]);
  const d = smoothPath(xy), end = xy.at(-1);
  return h("svg", { class: ["rb-spark", cls], viewBox: `0 0 ${w} ${ht}`, preserveAspectRatio: "none", "aria-hidden": "true" },
    h("defs", { svg: true }, h("linearGradient", { svg: true, id, x1: "0", y1: "0", x2: "0", y2: "1" }, h("stop", { svg: true, class: "a0", offset: "0" }), h("stop", { svg: true, class: "a1", offset: "1" }))),
    ...[0.25, 0.5, 0.75].map((r) => h("line", { svg: true, class: "grid", x1: 0, x2: w, y1: ht * r, y2: ht * r })),
    h("path", { svg: true, class: "area", d: `${d} L${end[0].toFixed(1)},${ht} L${xy[0][0].toFixed(1)},${ht} Z`, fill: `url(#${id})` }),
    h("path", { svg: true, class: "ln", d }),
    ...xy.slice(0, -1).map(([x, y]) => h("circle", { svg: true, class: "pt", cx: x, cy: y, r: 1.6 })),
    h("circle", { svg: true, class: "halo", cx: end[0], cy: end[1], r: 5 }), h("circle", { svg: true, class: "end", cx: end[0], cy: end[1], r: 2.8 }));
};

// ── 마음 흐름 ──
function moodCard0(env, card, doc) {
  const v = viewOf(env, doc);
  if (!v) return card("🌊 마음 흐름", [note("아직 계산 전이에요. 응답이 쌓이면 관계 온도·보고 싶음·질투·기념일이 자동으로 나와요.")], null, "rb-life");
  const dir = (t) => (t.d >= 3 ? "up" : t.d <= -3 ? "down" : "flat");
  const arrow = { up: "↗", down: "↘", flat: "→" };
  const best = [...v.temp].sort((a, b) => b.d - a.d)[0], worst = [...v.temp].sort((a, b) => a.d - b.d)[0];
  const sum = v.temp.length ? h("div", { class: "rb-msum" },
    best && best.d >= 3 ? h("div", { class: "it up" }, h("small", null, "가장 가까워짐"), h("b", null, best.name), h("span", null, `+${best.d}`)) : null,
    worst && worst.d <= -3 ? h("div", { class: "it down" }, h("small", null, "가장 식음"), h("b", null, worst.name), h("span", null, String(worst.d))) : null,
    h("div", { class: "it" }, h("small", null, "기념일"), h("b", null, `${v.ann.length}개`), h("span", null, v.ann.at(-1)?.label ?? "—"))) : null;
  return card("🌊 마음 흐름", [
    sum,
    v.temp.length ? h("div", null, hd("관계 온도", "temp"), h("div", { class: "rb-mtemp" }, v.temp.map((t) => h("div", { class: ["rb-mt", dir(t)] },
      h("div", { class: "who" }, h("b", null, t.name), h("span", { class: "now" }, String(t.h.at(-1))), h("span", { class: "badge" }, `${arrow[dir(t)]} ${t.label}`)), spark(t.h, dir(t)),
      h("div", { class: "foot" }, h("small", null, `${t.h.length}번 기록`), h("small", null, t.d > 0 ? `+${t.d}` : String(t.d))),
      t.trust.length > 1 ? h("div", { class: "trust" }, h("small", null, "신뢰", infoBtn(LIFE_INFO.trust)), spark(t.trust, "trust"), h("small", null, String(t.trust.at(-1)))) : null)))) : null,
    v.alerts.length ? h("div", { class: "rb-malert" }, v.alerts.map((a) => h("div", null, h("b", null, "🎉 "), `${a.label} · ${a.why}`))) : null,
    v.habits.length ? h("div", { class: "rb-mhab" }, h("small", { class: "rb-lh" }, "둘만의 버릇"), ...v.habits.map((x) => h("div", { class: "it" }, h("b", null, x.name === "{{user}}" ? "나" : x.name), h("div", { class: "tags" }, x.list.map((t) => h("span", null, t)))))) : null,
    v.miss || v.jealous.length ? h("div", { class: "rb-msig" },
      v.miss ? h("div", { class: "sig miss" }, h("small", null, "💭 보고 싶음", infoBtn(LIFE_INFO.miss)), h("b", null, v.miss.label), h("span", null, `${v.miss.gap}턴째 못 봄`), h("i", { class: "meter" }, h("i", { style: { width: `${v.miss.v}%` } }))) : null,
      ...v.jealous.map((j) => h("div", { class: "sig jeal" }, h("small", null, "🔥 질투", infoBtn(LIFE_INFO.jeal)), h("b", null, `${j.of} → ${j.rival}`), h("span", null, `세기 ${j.v}`), h("i", { class: "meter" }, h("i", { style: { width: `${j.v}%` } }))))) : null,
    v.ann.length ? h("div", { class: "rb-mann" }, h("small", { class: "rb-lh" }, "기념일"), h("ol", null, v.ann.map((a) => h("li", null, h("i", { class: "dot" }), h("div", { class: "tx" }, h("b", null, a.label), h("small", null, a.date || `${a.turn}턴째`)), h("span", { class: "ago" }, a.ago ? `${a.ago}턴 전` : "오늘"))))) : null,
    !v.temp.length && !v.miss && !v.jealous.length && !v.ann.length ? note("아직 보여 줄 변화가 없어요.") : null,
  ], null, "rb-life");
}

// ── 성감대 인체 모형 ──
const HEAD = { cx: 50, cy: 17, rx: 9.5, ry: 11.5 };
const SIL = "M45 28C45 32 44 34 41 35C33 37 27 40 25 47L20 77C19 83 19 89 21 95C22 98 25 98 26 95L29 79L32 60C33 70 34 78 32 88C30 96 31 104 33 112L36 150C36 165 37 178 38 189C38 193 44 193 45 189L48 140C49 128 49.5 118 50 112C50.5 118 51 128 52 140L55 189C56 193 62 193 62 189C63 178 64 165 64 150L67 112C69 104 70 96 68 88C66 78 67 70 68 60L71 79L74 95C75 98 78 98 79 95C81 89 81 83 80 77L75 47C73 40 67 37 59 35C56 34 55 32 55 28Z";
function bodyCard0(env, card, doc, { side: side0 = null } = {}) {
  const n = env.folder?.nsfw?.[doc.id] ?? null, zones = n?.zones ?? [], m = mem(env.ctx), sides = (m.bodySide ??= {});
  const side = side0 ?? sides[doc.id] ?? "f";
  const lv = (id) => zones.find((z) => z.part === id)?.level ?? 0;
  const cycle = (id) => saveN(env, doc, (cur) => {
    const zs = [...(cur.zones ?? [])], i = zs.findIndex((z) => z.part === id), next = ((zs[i]?.level ?? 0) + 1) % 4;
    if (i >= 0) { if (next) zs[i] = { ...zs[i], level: next }; else zs.splice(i, 1); } else zs.push({ part: id, level: 1, note: "" });
    return { ...cur, zones: zs, log: [...(cur.log ?? []), { at: new Date().toISOString(), text: `성감대 ${partOf(id)?.label} ${next ? "♥".repeat(next) : "지움"}` }].slice(-20) };
  });
  const parts = BODY_PARTS.filter((p) => p.side === side);
  const svg = h("svg", { class: ["rb-bodymap", side === "b" && "back"], viewBox: "-14 0 128 200", role: "group", "aria-label": `${side === "f" ? "앞" : "뒤"}모습 성감대` },
    h("defs", { svg: true }, h("linearGradient", { svg: true, id: "rbSilG", x1: "0", y1: "0", x2: "1", y2: "1" }, h("stop", { svg: true, class: "s0", offset: "0" }), h("stop", { svg: true, class: "s1", offset: "1" })),
      h("radialGradient", { svg: true, id: "rbZoneG" }, h("stop", { svg: true, class: "z0", offset: "0" }), h("stop", { svg: true, class: "z1", offset: "1" }))),
    h("ellipse", { svg: true, class: "sil", ...HEAD }), h("path", { svg: true, class: "sil", d: SIL }),
    side === "b" ? h("path", { svg: true, class: "spine", d: "M50 32 C49 50 51 70 50 92" }) : h("path", { svg: true, class: "spine", d: "M42 46 Q50 50 58 46" }),
    ...parts.map((p) => { const l = lv(p.id), right = p.x >= 50;
      return h("g", { svg: true, class: ["pt", `l${l}`], tabindex: "0", role: "button", "aria-label": `${p.label} ${l ? `${l}단계` : "없음"} — 눌러서 바꾸기`,
        onClick: () => cycle(p.id), onKeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cycle(p.id); } } },
        h("circle", { svg: true, class: "hit", cx: p.x, cy: p.y, r: 7 }),
        l ? h("circle", { svg: true, class: "aura", cx: p.x, cy: p.y, r: 4 + l * 3 }) : null,
        l >= 3 ? h("circle", { svg: true, class: "pulse", cx: p.x, cy: p.y, r: 6 }) : null,
        h("circle", { svg: true, class: "dot", cx: p.x, cy: p.y, r: l ? 1.8 + l * 0.9 : 1.5 }),
        l ? h("line", { svg: true, class: "lead", x1: p.x + (right ? 3 : -3), y1: p.y, x2: right ? 94 : 6, y2: p.y }) : null,
        l ? h("text", { svg: true, class: "lbl", x: right ? 96 : 4, y: p.y + 2, "text-anchor": right ? "start" : "end" }, p.label) : null,
        h("title", { svg: true }, p.label)); }));
  const list = [...zones].sort((a, b) => b.level - a.level || (b.dev ?? 0) - (a.dev ?? 0));
  const segBtn = (s, l) => h("button", { type: "button", class: s === side ? "on" : "", "aria-pressed": s === side ? "true" : "false", onClick: () => { sides[doc.id] = s; repaint(env, doc); } }, l);
  return card("💋 성감대", [
    h("div", { class: "rb-body-wrap" },
      h("div", { class: "rb-body-fig" },
        h("div", { class: ["rb-bseg", side === "b" && "b"], role: "group", "aria-label": "앞뒤" }, h("i", { class: "pill" }), segBtn("f", "앞"), segBtn("b", "뒤")),
        svg),
      h("div", { class: "rb-body-list" },
        h("div", { class: "rb-blegend" }, h("span", { class: "l1" }, "약간"), h("span", { class: "l2" }, "민감"), h("span", { class: "l3" }, "약점"), infoBtn(LIFE_INFO.zone), h("span", { class: "dv" }, "개발도"), infoBtn(LIFE_INFO.dev)),
        list.length ? list.map((z) => h("div", { class: ["rb-bz", `l${z.level}`] }, h("div", { class: "hd" }, h("span", { class: "acts" },
            h("button", { type: "button", class: "rb-bzb", title: "메모 고치기", "aria-label": "메모 고치기", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: `${partOf(z.part)?.label} 메모`, label: "메모", value: z.note ?? "", ok: "저장" }); if (v == null) return; saveN(env, doc, (cur) => ({ ...cur, zones: (cur.zones ?? []).map((x) => x.part === z.part ? { ...x, note: String(v).trim().slice(0, 80) } : x) })); } }, "✎"),
            h("button", { type: "button", class: "rb-bzb", title: "지우기", "aria-label": "지우기", onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 성감대를 지울까요?", body: partOf(z.part)?.label ?? "", ok: "지우기", danger: true }))) return; saveN(env, doc, (cur) => ({ ...cur, zones: (cur.zones ?? []).filter((x) => x.part !== z.part) })); } }, "✕")), h("b", null, partOf(z.part)?.label ?? z.part), z.level >= 3 ? h("span", { class: "weak" }, "약점") : z.level === 0 ? h("span", { class: "devn" }, "개발 중") : null, h("span", { style: "flex:1" }), h("span", { class: "meter", "aria-label": `${z.level}단계` }, ...[1, 2, 3].map((i) => h("i", { class: i <= z.level ? "on" : "" })))),
          z.dev != null ? h("div", { class: "dev" }, h("small", null, "개발도"), h("i", { class: "db" }, h("i", { style: { width: `${z.dev}%` } }), ...DEV_LEVELS.map((at) => h("i", { class: "mk", style: { left: `${at}%` } }))), h("small", null, String(z.dev))) : null,
          z.note ? h("small", null, z.note) : null))
          : note("아직 없어요. 모형의 점을 누르면 1→2→3(약점)→없음으로 바뀌어요. 대화에서 드러나면 기록기가 채워요."))),
  ], null, "rb-life");
}

// ── 사람다운 항목(일반 human / 성인 ext) ──
function humanCard0(env, card, doc, grp = "human") {
  const n = env.folder?.nsfw?.[doc.id] ?? null, box = n?.[grp] ?? {}, FIELDS = grp === "ext" ? EXT_FIELDS : HUMAN_FIELDS;
  const title = grp === "ext" ? "🫦 잠자리에서" : "🧩 사람다움";
  const filled = FIELDS.filter(([k]) => box[k] && (!Array.isArray(box[k]) || box[k].length));
  const empty = FIELDS.filter(([k]) => !filled.some(([f]) => f === k));
  const edit = () => modal(env.ctx.win, (done) => {
    const form = h("div", { class: "rb-mem-ed" }, FIELDS.map(([k, l, many]) => h("label", { class: "rb-mem-edrow", style: "flex-direction:column;align-items:stretch;gap:4px" },
      h("b", null, l + (many ? " (쉼표로)" : "")), h("textarea", { class: "rb-input", rows: many ? 2 : 1, "data-k": k }, Array.isArray(box[k]) ? box[k].join(", ") : box[k] ?? ""))));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": `${title} 고치기` }, h("h3", null, title.replace(/^\S+\s/, "")), form,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(false) }), btn("저장", { kind: "primary", onClick: async () => {
        const raw = Object.fromEntries(FIELDS.map(([k]) => [k, form.querySelector(`[data-k="${k}"]`)?.value ?? ""]));
        const norm = grp === "ext" ? normExt(raw) : normHuman(raw);
        await saveN(env, doc, (cur) => ({ ...cur, [grp]: norm ?? undefined, log: [...(cur.log ?? []), { at: new Date().toISOString(), text: `${title.replace(/^\S+\s/, "")} 직접 고침` }].slice(-20) }));
        done(true);
      } })));
  });
  return card(title, [
    filled.length ? h("div", { class: ["rb-human", grp] }, filled.map(([k, l], i) => h("div", { class: "rb-hf", style: { "--h": String((i * 47) % 360) } }, h("small", { class: "lb" }, l),
      Array.isArray(box[k]) ? h("div", { class: "tags" }, box[k].map((t) => h("span", null, t))) : h("p", null, box[k])))) : note(grp === "ext" ? "아직 없어요. 성인 프로필을 만들 때 함께 채워지고, 대화에서 드러나면 기록기가 더해요." : "아직 없어요. 대화에서 말버릇·습관·꿈·비밀 같은 게 드러나면 기록기가 채워요."),
    empty.length ? h("div", { class: "rb-hempty" }, empty.map(([, l]) => h("button", { type: "button", class: "rb-hadd", onClick: () => edit() }, `+ ${l}`))) : null,
    h("div", { class: "rb-mem-sact" }, btn("직접 고치기", { size: "sm", onClick: () => edit() })),
  ], null, "rb-life");
}

export const LIFE_CSS = `
.rb-life .rb-lh{display:block;font-size:11.5px;font-weight:700;color:var(--rb-sub);letter-spacing:.04em;margin-bottom:6px}
/* 성욕 */
.rb-lhero{position:relative;display:grid;grid-template-columns:132px minmax(0,1fr);gap:16px;align-items:center;padding:14px;border-radius:18px;
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,#ec4f86 16%,var(--rb-surf2)),var(--rb-surf2) 60%);border:1px solid color-mix(in srgb,#ec4f86 18%,var(--rb-line2))}
.rb-lhero.hot{animation:rbHot 2.4s ease-in-out infinite}
@keyframes rbHot{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,#ec4f86 0%,transparent)}50%{box-shadow:0 0 22px 2px color-mix(in srgb,#ec4f86 30%,transparent)}}
.rb-lring-wrap{position:relative;width:132px;height:132px}
.rb-lring{width:100%;height:100%;transform:rotate(-90deg)}
.rb-lring .bg{fill:none;stroke:color-mix(in srgb,currentColor 9%,transparent);stroke-width:9}
.rb-lring .fg{fill:none;stroke-width:9;stroke-linecap:round;filter:drop-shadow(0 0 4px color-mix(in srgb,#ec4f86 55%,transparent));transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)}
.rb-lring.cool .fg{filter:saturate(.35)}
.rb-lring-wrap .mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rb-lring-wrap .mid b{font-size:32px;line-height:1;font-variant-numeric:tabular-nums;background:linear-gradient(135deg,#ec4f86,#a3195b);-webkit-background-clip:text;background-clip:text;color:transparent}
.rb-lring-wrap .mid small{margin-top:4px;font-size:12px;font-weight:700;color:var(--rb-text)}
.rb-lsteps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
.rb-lsteps li{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--rb-mute);padding:2px 8px;border-radius:999px;transition:background .3s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),color .3s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-lsteps li i{width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,currentColor 35%,transparent)}
.rb-lsteps li small{margin-left:auto;font-size:10px;opacity:.6;font-variant-numeric:tabular-nums}
.rb-lsteps li.past{color:var(--rb-sub)}.rb-lsteps li.past i{background:#f39ab8}
.rb-lsteps li.now{color:var(--rb-text);font-weight:700;background:color-mix(in srgb,#ec4f86 14%,transparent)}.rb-lsteps li.now i{background:#ec4f86;box-shadow:0 0 0 3px color-mix(in srgb,#ec4f86 25%,transparent)}
.rb-lbadge{position:absolute;top:10px;right:12px;font-size:11px;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,#5c8bd6 18%,var(--rb-surf));color:#4a76c0}
@media (max-width:520px){.rb-lhero{grid-template-columns:104px minmax(0,1fr);gap:10px;padding:12px}.rb-lring-wrap{width:104px;height:104px}.rb-lring-wrap .mid b{font-size:26px}.rb-lsteps li{padding:1px 6px;font-size:11px}.rb-lsteps li small{display:none}}
.rb-ltiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
.rb-ltile{position:relative;display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2);overflow:hidden}
.rb-ltile::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--c,var(--rb-acc))}
.rb-ltile small{font-size:11px;color:var(--rb-mute)}.rb-ltile b{font-size:16px}
.rb-ltile.fat{--c:#f0a35e}.rb-ltile.since{--c:#9b7fe0}.rb-ltile.cnt{--c:#ec4f86}.rb-ltile.ph{--c:#5cb6a8}.rb-ltile.ph-fertile{--c:#ec4f86}.rb-ltile.ph-period{--c:#d9534f}
.rb-ltile .mini{display:block;height:4px;border-radius:2px;margin-top:4px;background:color-mix(in srgb,currentColor 10%,transparent)}.rb-ltile .mini i{display:block;height:100%;border-radius:2px;background:var(--c)}
.rb-lpart{display:flex;flex-direction:column;gap:2px}
.rb-lprow{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:12px;background:var(--rb-surf2)}
.rb-lprow small{color:var(--rb-mute);font-size:11.5px}
.rb-fam{display:inline-flex;gap:3px}.rb-fam i{width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,currentColor 14%,transparent)}.rb-fam i.on{background:linear-gradient(135deg,#f39ab8,#ec4f86)}
.rb-ltags{display:flex;flex-wrap:wrap;gap:6px}
.rb-ltag{display:inline-flex;align-items:center;gap:6px;padding:4px 4px 4px 10px;border-radius:999px;font-size:12px;background:color-mix(in srgb,#ec4f86 10%,var(--rb-surf2));border:1px solid color-mix(in srgb,#ec4f86 18%,transparent)}
.rb-ltag b{font-size:10.5px;min-width:18px;height:18px;display:grid;place-items:center;border-radius:999px;background:#ec4f86;color:#fff}
.rb-lcyc{padding:12px;border-radius:16px;background:var(--rb-surf2)}.rb-lcyc .rb-cyc-stat{background:var(--rb-surf)}
.rb-lnote{margin:0;font-size:11.5px;color:var(--rb-mute);white-space:normal}
/* 마음 흐름 */
.rb-mtemp{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
.rb-mt{--c:var(--rb-mute);display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2);border:1px solid color-mix(in srgb,var(--c) 22%,transparent)}
.rb-mt.up{--c:#ec4f86}.rb-mt.down{--c:#5c8bd6}
.rb-mt .who{display:flex;align-items:center;gap:8px}.rb-mt .who b{flex:1;font-size:13.5px}
.rb-mt .badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.rb-spark{display:block;width:100%;height:30px;color:var(--c)}
.rb-spark .area{fill:color-mix(in srgb,currentColor 16%,transparent)}.rb-spark .ln{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.rb-spark .end{fill:currentColor}
.rb-msig{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}
.rb-msig .sig{--c:#9b7fe0;display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 14%,var(--rb-surf2)),var(--rb-surf2))}
.rb-msig .sig.jeal{--c:#e07a3f}
.rb-msig .sig small{font-size:11px;color:var(--c);font-weight:700}.rb-msig .sig b{font-size:14px}.rb-msig .sig span{font-size:11.5px;color:var(--rb-mute)}
.rb-msig .meter{display:block;height:4px;margin-top:6px;border-radius:2px;background:color-mix(in srgb,currentColor 10%,transparent)}.rb-msig .meter i{display:block;height:100%;border-radius:2px;background:var(--c)}
.rb-mann ol{list-style:none;margin:0;padding:0 0 0 6px;display:flex;flex-direction:column}
.rb-mann li{position:relative;display:flex;align-items:baseline;gap:8px;padding:6px 0 6px 18px;font-size:13px}
.rb-mann li::before{content:"";position:absolute;left:4px;top:0;bottom:0;width:2px;background:color-mix(in srgb,var(--rb-acc) 25%,var(--rb-line2))}
.rb-mann li:first-child::before{top:50%}.rb-mann li:last-child::before{bottom:50%}
.rb-mann li .dot{position:absolute;left:0;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:var(--rb-surf);border:2px solid var(--rb-acc)}
.rb-mann li small{margin-left:auto;color:var(--rb-mute);font-size:11.5px}
/* 성감대 */
.rb-body-wrap{display:grid;grid-template-columns:minmax(170px,240px) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:520px){.rb-body-wrap{grid-template-columns:1fr}.rb-body-fig{max-width:210px;margin:0 auto}}
.rb-body-fig{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;border-radius:18px;background:radial-gradient(80% 60% at 50% 40%,color-mix(in srgb,#ec4f86 10%,var(--rb-surf2)),var(--rb-surf2))}
.rb-bodymap{width:100%;height:auto;max-height:340px;overflow:visible}
.rb-bodymap .s0{stop-color:var(--rb-surf)}.rb-bodymap .s1{stop-color:var(--rb-surf2)}
.rb-bodymap .sil{fill:url(#rbSilG);stroke:color-mix(in srgb,#ec4f86 25%,var(--rb-line));stroke-width:.8}
.rb-bodymap .pt{cursor:pointer;outline:none}.rb-bodymap .hit{fill:transparent}
.rb-bodymap .dot{fill:var(--rb-mute);opacity:.35;transition:r .25s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),opacity .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-bodymap .l1 .dot{fill:#f7a8c0;opacity:.85}.rb-bodymap .l2 .dot{fill:#ec4f86;opacity:.95}.rb-bodymap .l3 .dot{fill:#c2185b;opacity:1}
.rb-bodymap .pulse{fill:none;stroke:#ec4f86;stroke-width:1.2;transform-box:fill-box;transform-origin:center;animation:rbPulse 1.8s ease-out infinite}
@keyframes rbPulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}
.rb-bodymap .pt:focus-visible .hit{stroke:var(--rb-acc);stroke-width:1}
@media (hover:hover){.rb-bodymap .pt:hover .dot{opacity:1}.rb-bodymap .pt:hover .hit{fill:color-mix(in srgb,#ec4f86 12%,transparent)}}
@media (prefers-reduced-motion:reduce){.rb-bodymap .pulse,.rb-lhero.hot{animation:none}}
.rb-body-list{display:flex;flex-direction:column;gap:6px;min-width:0}
.rb-blegend{display:flex;gap:10px;font-size:11px;color:var(--rb-mute)}.rb-blegend span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}
.rb-blegend .l1::before{background:#f7a8c0}.rb-blegend .l2::before{background:#ec4f86}.rb-blegend .l3::before{background:#c2185b;box-shadow:0 0 0 2px color-mix(in srgb,#ec4f86 30%,transparent)}
.rb-bz{display:flex;flex-direction:column;gap:2px;padding:9px 12px;border-radius:12px;background:var(--rb-surf2);border-left:3px solid #f7a8c0}
.rb-bz.l2{border-left-color:#ec4f86}.rb-bz.l3{border-left-color:#c2185b;background:linear-gradient(90deg,color-mix(in srgb,#ec4f86 12%,var(--rb-surf2)),var(--rb-surf2))}
.rb-bz .hd{display:flex;align-items:center;gap:8px}.rb-bz small{color:var(--rb-mute);font-size:11.5px}
.rb-bz .weak{font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:#c2185b;color:#fff}
.rb-bz .hearts{display:inline-flex;gap:1px;font-style:normal}.rb-bz .hearts i{font-style:normal;color:color-mix(in srgb,currentColor 20%,transparent)}.rb-bz .hearts i.on{color:#ec4f86}
/* 사람다움 · 잠자리 */
.rb-human{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.rb-hf{--c:hsl(var(--h) 55% 55%);display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 9%,var(--rb-surf2)),var(--rb-surf2) 70%);border:1px solid color-mix(in srgb,var(--c) 16%,transparent)}
.rb-human.ext .rb-hf{--c:hsl(calc(330 + var(--h) / 12) 65% 55%)}
.rb-hf .lb{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--c)}
.rb-hf p{margin:0;font-size:13px;white-space:normal;line-height:1.5}
.rb-hf .tags{display:flex;flex-wrap:wrap;gap:5px}.rb-hf .tags span{font-size:12px;padding:3px 9px;border-radius:999px;background:var(--rb-surf);border:1px solid color-mix(in srgb,var(--c) 22%,var(--rb-line2))}
.rb-hempty{display:flex;flex-wrap:wrap;gap:6px}
.rb-hadd{font:inherit;font-size:11.5px;padding:3px 10px;border-radius:999px;border:1px dashed var(--rb-line);background:transparent;color:var(--rb-mute);cursor:pointer}
@media (hover:hover){.rb-hadd:hover{border-color:var(--rb-acc);color:var(--rb-text)}}

/* i 버튼 */
.rb-iwrap{position:relative;display:inline-flex;vertical-align:middle;margin-left:4px}
.rb-ibtn{width:15px;height:15px;padding:0;border-radius:50%;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-mute);font:italic 700 9.5px/13px Georgia,serif;cursor:pointer;display:grid;place-items:center}
.rb-ibtn.open,.rb-ibtn:focus-visible{border-color:var(--rb-acc);color:var(--rb-acc)}
.rb-ibub{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%) translateY(4px);width:max-content;max-width:240px;padding:8px 10px;border-radius:10px;background:var(--rb-text);color:var(--rb-win);font-size:11.5px;font-weight:500;line-height:1.45;letter-spacing:0;white-space:normal;text-align:left;opacity:0;pointer-events:none;transition:opacity .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),transform .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1));z-index:20;box-shadow:0 6px 18px color-mix(in srgb,#000 22%,transparent)}
.rb-ibtn.open+.rb-ibub{opacity:1;transform:translateX(-50%)}
@media (hover:hover){.rb-ibtn:hover+.rb-ibub{opacity:1;transform:translateX(-50%)}}
.rb-lhi{position:absolute;top:10px;left:12px}
.rb-lbadge.hot{background:color-mix(in srgb,#ec4f86 22%,var(--rb-surf));color:#c2185b;font-weight:700}
/* 속도·스위치 */
.rb-lctl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:stretch}
@media (max-width:520px){.rb-lctl{grid-template-columns:1fr}}
.rb-lctl>div{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2)}
.rb-lctl small{font-size:11px;color:var(--rb-mute);display:flex;align-items:center}
.rb-lctl .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rb-lmult .row button{width:28px;height:28px;border-radius:50%;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-sub);font-size:16px;cursor:pointer}
.rb-lmult b{min-width:44px;text-align:center;font-size:16px;font-variant-numeric:tabular-nums;color:#c2185b}
.rb-lsw{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;border:1px solid var(--rb-line2);background:var(--rb-surf);color:var(--rb-sub);font:inherit;font-size:12.5px;cursor:pointer;transition:background .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1)),border-color .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-lsw .knob{width:28px;height:16px;border-radius:999px;background:var(--rb-line2);position:relative;transition:background .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-lsw .knob::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0003;transition:transform .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}
.rb-lsw.on{border-color:color-mix(in srgb,#ec4f86 40%,transparent);color:var(--rb-text);background:color-mix(in srgb,#ec4f86 8%,var(--rb-surf))}
.rb-lsw.on .knob{background:linear-gradient(90deg,#f39ab8,#ec4f86)}.rb-lsw.on .knob::after{transform:translateX(12px)}
.rb-lsw:disabled{opacity:.45;cursor:not-allowed}
.rb-lprow{flex-wrap:wrap}.rb-lprow .fam{font-size:11px;font-weight:700;color:#c2185b}
.rb-lprow .prior{padding:1px 8px;border-radius:999px;background:var(--rb-surf);border:1px solid var(--rb-line2)}.rb-lprow .prior.est{border-style:dashed;font-style:italic}
/* NSFW 배경 효과(달아오름) */
.rb-heat{position:relative;isolation:isolate}
.rb-heat::before{content:"";position:absolute;inset:-24px -12px;z-index:-1;pointer-events:none;border-radius:28px;opacity:calc(var(--heat,0) * 1.1);transition:opacity .8s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1));
  background:radial-gradient(60% 40% at 15% 10%,color-mix(in srgb,#ec4f86 28%,transparent),transparent 70%),radial-gradient(50% 35% at 90% 60%,color-mix(in srgb,#ff7aa8 22%,transparent),transparent 70%),radial-gradient(70% 40% at 50% 100%,color-mix(in srgb,#a3195b 20%,transparent),transparent 70%)}
.rb-heat.hot::before{animation:rbHeat 3.2s ease-in-out infinite}
@keyframes rbHeat{0%,100%{filter:saturate(1)}50%{filter:saturate(1.5) brightness(1.05)}}
.rb-heatfx{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;opacity:calc((var(--heat,0) - .55) * 2.2)}
.rb-heatfx i{position:absolute;bottom:-20px;left:var(--x);font-style:normal;font-size:calc(14px * var(--z));color:#ec4f86;opacity:.0;animation:rbRise var(--d) linear infinite;animation-delay:var(--w);filter:blur(.3px)}
@keyframes rbRise{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:.5}100%{transform:translateY(-110vh) translateX(24px) scale(1.1);opacity:0}}
@media (prefers-reduced-motion:reduce){.rb-heatfx{display:none}.rb-heat.hot::before{animation:none}}
/* 마음 흐름 요약·그래프 */
.rb-msum{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.rb-msum .it{--c:var(--rb-acc);display:flex;flex-direction:column;gap:1px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 12%,var(--rb-surf2)),var(--rb-surf2));min-width:0}
.rb-msum .it.up{--c:#ec4f86}.rb-msum .it.down{--c:#5c8bd6}
.rb-msum small{font-size:11px;color:var(--rb-mute)}.rb-msum b{font-size:15px}.rb-msum span{font-size:11.5px;color:var(--c);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-mt .now{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--c)}
.rb-mt .foot{display:flex;justify-content:space-between;font-size:10.5px;color:var(--rb-mute)}
.rb-spark{display:block;width:100%;height:46px;color:var(--c);overflow:visible}
.rb-spark .grid{stroke:currentColor;stroke-opacity:.08;stroke-dasharray:2 3}
.rb-spark .a0{stop-color:currentColor;stop-opacity:.32}.rb-spark .a1{stop-color:currentColor;stop-opacity:0}
.rb-spark .area{stroke:none}.rb-spark .ln{fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;vector-effect:non-scaling-stroke}
.rb-spark .pt{fill:var(--rb-surf);stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}.rb-spark .end{fill:currentColor}.rb-spark .halo{fill:currentColor;opacity:.18;animation:rbHalo 2s ease-in-out infinite}
@keyframes rbHalo{50%{opacity:.05}}
.rb-mann li .tx{display:flex;flex-direction:column}.rb-mann li .tx small{color:var(--rb-mute);font-size:11px}
.rb-mann li .ago{margin-left:auto;font-size:11px;padding:2px 8px;border-radius:999px;background:var(--rb-surf2);color:var(--rb-sub);white-space:nowrap}
/* 성감대 다시 */
.rb-bseg{position:relative;display:grid;grid-template-columns:1fr 1fr;width:120px;padding:3px;border-radius:999px;background:var(--rb-surf);border:1px solid var(--rb-line2)}
.rb-bseg .pill{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:999px;background:linear-gradient(135deg,#f39ab8,#ec4f86);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.rb-bseg.b .pill{transform:translateX(100%)}
.rb-bseg button{position:relative;z-index:1;border:0;background:transparent;font:inherit;font-size:12.5px;padding:4px 0;color:var(--rb-sub);cursor:pointer}.rb-bseg button.on{color:#fff;font-weight:700}
.rb-bodymap .spine{fill:none;stroke:color-mix(in srgb,#ec4f86 22%,var(--rb-line));stroke-width:.6;stroke-dasharray:1.5 1.5}
.rb-bodymap .z0{stop-color:#ec4f86;stop-opacity:.45}.rb-bodymap .z1{stop-color:#ec4f86;stop-opacity:0}
.rb-bodymap .aura{fill:url(#rbZoneG)}
.rb-bodymap .lead{stroke:color-mix(in srgb,#ec4f86 45%,transparent);stroke-width:.4;stroke-dasharray:1 1}
.rb-bodymap .lbl{font-size:6.5px;font-weight:700;fill:var(--rb-text)}
.rb-bodymap .l3 .lbl{fill:#c2185b}
.rb-bz .meter{display:inline-flex;gap:3px}.rb-bz .meter i{width:16px;height:5px;border-radius:3px;background:color-mix(in srgb,currentColor 14%,transparent)}.rb-bz .meter i.on{background:linear-gradient(90deg,#f7a8c0,#ec4f86)}.rb-bz.l3 .meter i.on{background:linear-gradient(90deg,#ec4f86,#a3195b)}
/* 관계 온도 그래프(장면) */
.rb-tglegend{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--rb-sub)}.rb-tglegend span::before{content:"";display:inline-block;width:14px;height:3px;border-radius:2px;background:var(--c);margin-right:5px;vertical-align:middle}
.rb-tgrow{display:flex;flex-direction:column;gap:4px;padding:10px 12px 6px;border-radius:14px;background:var(--rb-surf2)}
.rb-tgrow .hd{display:flex;align-items:baseline;gap:8px}.rb-tgrow .hd small{margin-left:auto;font-size:11px}
.rb-tg{overflow:visible;width:100%;height:auto;max-height:130px}.rb-tg .grid{stroke:currentColor;stroke-opacity:.07;stroke-dasharray:2 4;vector-effect:non-scaling-stroke}.rb-tg .mid{stroke:currentColor;stroke-opacity:.18;vector-effect:non-scaling-stroke}
.rb-tg .v{font-size:10px;font-weight:800}
/* 오늘·기분·변화 기록·비교·만족·개발도·신뢰·버릇 */
.rb-ltoday{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--rb-acc) 12%,var(--rb-surf2)),var(--rb-surf2))}
.rb-ltoday small{font-size:11px;font-weight:800;color:var(--rb-acc);letter-spacing:.06em}.rb-ltoday b{font-size:13.5px}
.rb-lmood .bars{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 12px}
.rb-lmood .mb{--c:#9b7fe0;display:grid;grid-template-columns:40px 1fr 24px;align-items:center;gap:6px;font-size:12px}
.rb-lmood .mb.joy{--c:#f0b429}.rb-lmood .mb.irritation{--c:#e07a3f}.rb-lmood .mb.anxiety{--c:#7a8bd6}.rb-lmood .mb.sadness{--c:#5c8bd6}.rb-lmood .mb.excitement{--c:#ec4f86}
.rb-lmood .mb>i{display:block;height:6px;border-radius:3px;background:color-mix(in srgb,currentColor 10%,transparent)}.rb-lmood .mb>i>i{display:block;height:100%;border-radius:3px;background:var(--c)}
.rb-lmood .mb small{text-align:right;color:var(--rb-mute);font-variant-numeric:tabular-nums}
.rb-ltile.preg{--c:#5cb6a8}.rb-ltile.preg.hi{--c:#ec4f86}.rb-ltile.preg.preg{--c:#9b7fe0}
.rb-lprow .sat{padding:1px 8px;border-radius:999px;background:var(--rb-surf)}.rb-lprow .sat.good{color:#2e9d6a}.rb-lprow .sat.bad{color:#d9534f}
.rb-ltrace{border-radius:14px;background:var(--rb-surf2);padding:8px 12px}
.rb-ltrace summary{cursor:pointer;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:4px;list-style:none}.rb-ltrace summary::-webkit-details-marker{display:none}
.rb-ltrace summary::before{content:"▸";color:var(--rb-mute);transition:transform .2s var(--rb-ease-out,cubic-bezier(.2,.8,.2,1))}.rb-ltrace[open] summary::before{transform:rotate(90deg)}
.rb-ltrace ol{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:3px;max-height:220px;overflow:auto}
.rb-ltrace li{display:flex;gap:8px;font-size:12px}.rb-ltrace li small{min-width:40px;color:var(--rb-mute);font-variant-numeric:tabular-nums}
.rb-cmp{display:flex;flex-direction:column;gap:2px;font-size:12.5px}
.rb-cmp .hd,.rb-cmp .row{display:grid;grid-template-columns:minmax(60px,1fr) 1.4fr 1fr minmax(70px,.9fr);gap:10px;align-items:center;padding:6px 10px;border-radius:10px}
.rb-cmp .hd{font-size:11px;color:var(--rb-mute);font-weight:700}
.rb-cmp .row:nth-child(even){background:var(--rb-surf2)}.rb-cmp .row.me{box-shadow:inset 3px 0 0 var(--rb-acc);background:color-mix(in srgb,var(--rb-acc) 8%,var(--rb-surf2))}
.rb-cmp .cb{display:block;height:7px;border-radius:4px;background:color-mix(in srgb,currentColor 10%,transparent)}.rb-cmp .cb>i{display:block;height:100%;border-radius:4px}
.rb-cmp .cb.lust>i{background:linear-gradient(90deg,#f39ab8,#ec4f86)}.rb-cmp .cb.fat>i{background:#f0a35e}
.rb-mt .trust{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;--c:#2e9d6a;color:#2e9d6a}.rb-mt .trust small{font-size:10.5px}.rb-mt .trust .rb-spark{height:22px}
.rb-malert{display:flex;flex-direction:column;gap:4px}.rb-malert>div{padding:8px 12px;border-radius:12px;font-size:12.5px;background:linear-gradient(90deg,color-mix(in srgb,#f0b429 18%,var(--rb-surf2)),var(--rb-surf2))}
.rb-mhab{display:flex;flex-direction:column;gap:6px}.rb-mhab .it{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;border-radius:12px;background:var(--rb-surf2)}
.rb-mhab .tags{display:flex;flex-wrap:wrap;gap:5px}.rb-mhab .tags span{font-size:12px;padding:2px 9px;border-radius:999px;background:var(--rb-surf);border:1px dashed color-mix(in srgb,var(--rb-acc) 35%,var(--rb-line2))}
.rb-bz .devn{font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--rb-surf);color:var(--rb-mute);border:1px dashed var(--rb-line)}
.rb-bz .dev{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:2px}.rb-bz .dev small{font-size:10.5px}
.rb-bz .db{position:relative;display:block;height:5px;border-radius:3px;background:color-mix(in srgb,currentColor 10%,transparent);overflow:hidden}.rb-bz .db>i:first-child{display:block;height:100%;background:linear-gradient(90deg,#cbb6f0,#9b7fe0);border-radius:3px}
.rb-bz .db .mk{position:absolute;top:0;bottom:0;width:1px;background:var(--rb-surf)}
.rb-blegend .dv{margin-left:6px}.rb-blegend .dv::before{background:#9b7fe0!important;border-radius:2px!important}
.rb-bz .hd{position:relative}.rb-bz .acts{order:9;display:inline-flex;gap:2px;margin-left:6px}.rb-bzb{width:22px;height:22px;border-radius:50%;border:0;background:transparent;color:var(--rb-mute);cursor:pointer;font-size:12px}@media (hover:hover){.rb-bzb:hover{background:var(--rb-surf);color:var(--rb-text)}}
.rb-live{display:contents}
.rb-ailegend .rb-ibub,.rb-aitag .rb-ibub{bottom:auto;top:calc(100% + 8px)}
.rb-aitag .rb-ibub{left:auto;right:-8px;transform:translateY(-4px)}.rb-aitag .rb-ibtn.open+.rb-ibub{transform:none}@media (hover:hover){.rb-aitag .rb-ibtn:hover+.rb-ibub{transform:none}}
`;

export const lustCard = (env, card, doc, o) => live(doc.id, () => lustCard0(env, card, doc, o));
export const moodCard = (env, card, doc) => live(doc.id, () => moodCard0(env, card, doc));
export const bodyCard = (env, card, doc, o) => live(doc.id, () => bodyCard0(env, card, doc, o));
export const humanCard = (env, card, doc, grp) => live(doc.id, () => humanCard0(env, card, doc, grp));
