// 사용량·비용·예산 (v1.9.3, 순수). 가격 단위: 100만 토큰당 달러.
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export function costOf(usage, pricing) {
  if (!usage || !pricing) return 0;
  const inp = n(usage.input), cached = Math.min(inp, n(usage.cached)), write = n(usage.cacheWrite), out = n(usage.output);
  const plain = Math.max(0, inp - cached - write);
  return (plain * n(pricing.input) + cached * n(pricing.cached ?? pricing.input) + write * n(pricing.cwrite ?? pricing.input) + out * n(pricing.output)) / 1e6;
}
export function savedByCache(usage, pricing) {
  if (!usage || !pricing) return 0;
  const cached = Math.min(n(usage.input), n(usage.cached));
  return (cached * (n(pricing.input) - n(pricing.cached ?? pricing.input))) / 1e6;
}
const day = (t) => new Date(t).toISOString().slice(0, 10);
export function addRecord(log, rec, { keepDays = 90, now = Date.now() } = {}) {
  const cut = day(now - keepDays * 864e5);
  const rows = [...(log ?? []), { at: rec.at ?? now, d: day(rec.at ?? now), purpose: rec.purpose ?? "main", profile: rec.profile ?? "", model: rec.model ?? "", cha: rec.cha ?? "", input: n(rec.usage?.input), output: n(rec.usage?.output), cached: n(rec.usage?.cached), cwrite: n(rec.usage?.cacheWrite), cost: n(rec.cost), saved: n(rec.saved), ms: n(rec.ms), ok: rec.ok !== false, via: rec.via ?? "" }];
  return rows.filter((r) => r.d >= cut).slice(-5000);
}
export function summarize(log, { now = Date.now(), by = "purpose", days = 0 } = {}) {
  const today = day(now), month = today.slice(0, 7), from = days > 0 ? day(now - (days - 1) * 864e5) : "", t = { today: 0, month: 0, all: 0, calls: 0, input: 0, output: 0, cached: 0, cwrite: 0, saved: 0 }, groups = {};
  for (const r of log ?? []) {
    if (from && r.d < from) continue;
    t.all += r.cost; t.calls++; t.input += r.input; t.output += r.output; t.cached += r.cached; t.cwrite += n(r.cwrite); t.saved += r.saved;
    if (r.d === today) t.today += r.cost; if (r.d.startsWith(month)) t.month += r.cost;
    const k = r[by] || "-"; const g = groups[k] ?? (groups[k] = { calls: 0, cost: 0, input: 0, output: 0, cached: 0, cwrite: 0, saved: 0 }); g.calls++; g.cost += r.cost; g.input += r.input; g.output += r.output; g.cached += r.cached; g.cwrite += n(r.cwrite); g.saved += r.saved;
  }
  return { total: t, groups };
}
// 예산 상태: ok | warn(80%) | over
export function budgetState(sum, budget) {
  const lim = [["일", sum.total.today, budget?.dailyUsd], ["월", sum.total.month, budget?.monthlyUsd]].filter(([, , l]) => n(l) > 0);
  let state = "ok", why = "";
  for (const [name, used, l] of lim) { const r = used / l; if (r >= 1) return { state: "over", why: `${name} 예산 $${l} 초과`, used, limit: l }; if (r >= 0.8 && state === "ok") { state = "warn"; why = `${name} 예산의 ${Math.round(r * 100)}% 사용`; } }
  return { state, why };
}
