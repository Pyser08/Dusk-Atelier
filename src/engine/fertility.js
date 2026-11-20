// 장기기억 애드온(0.3.22): 체내 정액량·포화도·피임·강제 피임·출산/유산 이력 → 임신 가능성(순수, 호출 없음).
// 임신 여부는 코어 월경 추적(리수폿 cycle-tracking)이 '보호 안 된 관계'마다 배란일 기준 확률로 굴린다.
// 여기서는 관계마다 보호됐는지(contraception used/none)를 정해 그 확률을 실제로 깎는다:
//   최종 확률 = 배란일 기준 확률 × (양·이력 배수 ≤ 1) × (1 − 피임 효과). 양이 많을수록 배수가 1(원래 확률)에 가까워진다.
// 저장: folder.life.p[문서 id].cum = { ml, sperm, at, when, by:{이름:ml} }, .hist = [{kind:"birth"|"loss", at, when}]
//       folder.nsfw[문서 id].fert = { body:"small"|"normal"|"large", contra:"none"|"pill"|"iud"|"implant", forced:bool }
const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
export const TURNS_PER_DAY = 6;
// 관계 한 번에 임신을 막는 정도(대략, 일반 사용 기준)
export const CONTRA = Object.freeze({ none: 0, condom: 0.98, pill: 0.993, iud: 0.998, implant: 0.999, afterpill: 0.85, pullout: 0.8, broke: 0 });
export const CONTRA_LABEL = Object.freeze({ none: "피임 안 함", condom: "콘돔", pill: "피임약", iud: "자궁 내 장치(IUD)", implant: "피하 이식", afterpill: "사후 피임약", pullout: "질외 사정", broke: "콘돔 찢어짐" });
export const STANDING = Object.freeze(["none", "pill", "iud", "implant"]);   // 늘 쓰는 피임(인물 설정)
export const BODY = Object.freeze({ small: ["작은 체형", 110], normal: ["보통 체형", 150], large: ["큰 체형", 190] });
export const CUM_HALF_DAYS = 0.5, SPERM_HALF_DAYS = 1.5;   // 흘러나옴(양) · 정자 생존(가능성)

export function contraOf(s) {
  const t = nk(s);
  if (!t || /^(none|no|없|안함|피임안)/.test(t)) return "none";
  if (/broke|찢|파손|빠짐|slip/.test(t)) return "broke";
  if (/after|사후|morning/.test(t)) return "afterpill";
  if (/condom|콘돔/.test(t)) return "condom";
  if (/iud|루프|자궁내/.test(t)) return "iud";
  if (/implant|임플란|이식/.test(t)) return "implant";
  if (/pill|피임약|경구/.test(t)) return "pill";
  if (/pull|질외|밖에/.test(t)) return "pullout";
  if (/used|yes|피임/.test(t)) return "condom";   // 종류를 모르면 콘돔으로 본다
  return "none";
}
export function bodyOf(nsfw, profileText = "") {
  const b = nsfw?.fert?.body; if (BODY[b]) return b;
  const t = String(profileText ?? "");
  if (/왜소|작은 ?체구|체구가 작|키가 작|아담|가녀|small|petite/i.test(t)) return "small";
  if (/글래머|풍만|장신|키가 크|건장|육감|large|tall|curvy/i.test(t)) return "large";
  return "normal";
}
export const capacityOf = (body) => (BODY[body] ?? BODY.normal)[1];

// 경과 일수(날짜를 알면 날짜, 모르면 턴)
export function daysSince(at, when, turn, now = "") {
  const d = (s) => { const m = String(s ?? "").match(/(\d{3,4})-(\d{1,2})-(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0)) : null; };
  const x = d(when), y = d(now);
  if (x != null && y != null) return Math.max(0, (y - x) / 86400000);
  return Math.max(0, (turn - (at ?? turn)) / TURNS_PER_DAY);
}
// 지금 남은 양
export function cumNow(L, turn, now = "") {
  const c = L?.cum; if (!c || !(c.ml > 0)) return { ml: 0, sperm: 0, days: null };
  const days = daysSince(c.at, c.when, turn, now);
  return { ml: c.ml * 0.5 ** (days / CUM_HALF_DAYS), sperm: (c.sperm ?? c.ml) * 0.5 ** (days / SPERM_HALF_DAYS), days };
}
// 질 안에 사정 한 번(입·뒤·바깥은 양만 기록하지 않음)
export function addCum(L, { ml = 4, partner = "", where = "inside" }, turn, now = "") {
  if (where !== "inside") return L;
  const cur = cumNow(L, turn, now), add = Math.max(0.5, Math.min(300, Number(ml) || 4));
  const by = { ...(L.cum?.by ?? {}) }; if (partner) by[partner] = Math.round(((by[partner] ?? 0) + add) * 10) / 10;
  L.cum = { ml: Math.round((cur.ml + add) * 10) / 10, sperm: Math.round((cur.sperm + add) * 10) / 10, at: turn, when: now, by };
  return L;
}
export function saturation(ml, body) { return Math.max(0, Math.min(100, Math.round((ml / capacityOf(body)) * 100))); }

// 양·이력 배수(0~1)와 이유
export function fertilityFactor(L, nsfw, turn, now = "", { extraMl = 0 } = {}) {
  const why = [];
  const c = cumNow(L, turn, now), sperm = c.sperm + extraMl;
  let f = 0.5 + 0.5 * Math.min(1, sperm / 4);   // 보통 한 번(3~5ml)이면 원래 확률
  if (sperm < 1) why.push("정액이 아주 적음");
  else if (sperm >= 20) why.push("정액이 많음");
  const hist = Array.isArray(L?.hist) ? L.hist : [];
  const last = (k) => hist.filter((h) => h.kind === k).map((h) => daysSince(h.at, h.when, turn, now)).sort((a, b) => a - b)[0];
  const lb = last("birth"), ll = last("loss"), losses = hist.filter((h) => h.kind === "loss").length, births = hist.filter((h) => h.kind === "birth").length;
  if (lb != null && lb < 180) { f *= lb < 42 ? 0.05 : 0.2; why.push(lb < 42 ? "출산 직후(산후 회복)" : "출산 6개월 안(수유기)"); }
  if (ll != null && ll < 90) { f *= 0.5; why.push("유산 3개월 안(몸이 회복 중)"); }
  if (losses >= 2) { f *= 0.8; why.push(`유산 ${losses}번`); }
  if (births && !why.some((w) => w.startsWith("출산"))) why.push(`출산 ${births}번(임신 경험 있음)`);
  return { factor: Math.max(0, Math.min(1, f)), why, ml: c.ml, sperm };
}
// 이번 관계를 막을 확률(0~1). forced면 1
export function preventOf(nsfw, eventContra = "none") {
  if (nsfw?.fert?.forced) return { p: 1, label: "강제 피임" };
  const ev = CONTRA[eventContra] ?? 0, st = CONTRA[nsfw?.fert?.contra] ?? 0;
  const p = 1 - (1 - ev) * (1 - st);
  const labels = [eventContra !== "none" && CONTRA_LABEL[eventContra], st && CONTRA_LABEL[nsfw.fert.contra]].filter(Boolean);
  return { p, label: labels.join(" + ") || "피임 안 함" };
}
// 배란일 기준 확률(대략, 코어 월경 추적과 같은 자료) — 화면 표시용
export const PHASE_BASE = Object.freeze({ fertile: 0.25, after: 0.02, luteal: 0.03, pre: 0.01, period: 0.01, preg: 0 });
export function chanceNow({ phase = null, factor = 1, prevent = 0, rate = 1 }) {
  const base = phase == null ? 0.05 : PHASE_BASE[phase] ?? 0.03;
  return Math.max(0, Math.min(0.95, base * rate * factor * (1 - prevent)));
}

// 월경 보고(cycle_report)의 관계를 보호/비보호로 정한다. lookup(name) → {nsfw, L}. 반환 { reports, log:[문장] }
// 비보호로 남길 확률 = 배수 × (1 − 피임). 남기면 코어가 배란일 확률로 다시 굴린다.
export function gateReports(reports, lookup, { turn = 0, now = "", rng = Math.random, cumOf = () => null } = {}) {
  const log = [];
  const out = (reports ?? []).map((r) => {
    if (!r?.sex?.length) return r;
    const { nsfw = null, L = null } = lookup(r.name) ?? {};
    const sex = r.sex.map((s) => {
      const ev = cumOf(r.name, s.partner);   // 이번 턴 cum 줄 {ml, contra}
      const eventContra = ev?.contra && ev.contra !== "none" ? ev.contra : String(s.contraception).toLowerCase() === "used" ? "condom" : "none";
      const pv = preventOf(nsfw, eventContra), ff = fertilityFactor(L ?? {}, nsfw, turn, now, { extraMl: ev?.ml ?? 4 });
      const keep = pv.p >= 1 ? 0 : ff.factor * (1 - pv.p);
      const open = rng() < keep;
      log.push(`${r.name}↔${s.partner}: ${pv.label}${ff.why.length ? ` · ${ff.why.join(", ")}` : ""} → ${open ? "보호 안 됨(배란일 확률로 굴림)" : "막힘"} (남길 확률 ${Math.round(keep * 100)}%)`);
      return { ...s, contraception: open ? "none" : "used" };
    });
    return { ...r, sex };
  });
  return { reports: out, log };
}

// 메인 모델에 넣을 줄(성인 프로필이 있는 장면 인물만)
export const FERT_TITLE = "[Body — fertility & contraception (computed; show naturally, never state numbers)]";
export function fertilitySection(f, present = [], turn = 0, now = "") {
  const docs = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && present.some((n) => [d.title, ...(d.aliases ?? [])].some((x) => nk(x) === nk(n))));
  const lines = [];
  for (const d of docs) {
    const n = f?.nsfw?.[d.id]; if (!n || !Object.keys(n.sexual ?? {}).length) continue;
    const L = f?.life?.p?.[d.id] ?? {}, c = cumNow(L, turn, now), body = bodyOf(n, f?.wiki?.people?.profiles?.[d.id]?.summary);
    const parts = [];
    if (n.fert?.forced) parts.push("always protected — she will not get pregnant (contraception is certain)");
    else if (n.fert?.contra && n.fert.contra !== "none") parts.push(`uses ${n.fert.contra === "pill" ? "the pill" : n.fert.contra === "iud" ? "an IUD" : "an implant"}`);
    if (c.ml >= 1) { const sat = saturation(c.ml, body); parts.push(`semen still inside (${sat >= 80 ? "overflowing" : sat >= 40 ? "a lot" : sat >= 10 ? "some" : "a little"}${c.days != null && c.days < 0.2 ? ", fresh" : ""})`); }
    const ff = fertilityFactor(L, n, turn, now);
    const hist = ff.why.filter((w) => /출산|유산/.test(w));
    if (hist.length) parts.push(hist.map((w) => w.replace("출산 직후(산후 회복)", "just gave birth (recovering)").replace("출산 6개월 안(수유기)", "breastfeeding after a recent birth").replace("유산 3개월 안(몸이 회복 중)", "recovering from a recent miscarriage").replace(/유산 (\d+)번/, "$1 past miscarriages").replace(/출산 (\d+)번\(임신 경험 있음\)/, "has given birth $1 time(s)")).join(", "));
    if (parts.length) lines.push(`- ${d.title}: ${parts.join("; ")}`);
  }
  return lines.length ? [FERT_TITLE, ...lines].join("\n").slice(0, 700) : "";
}
