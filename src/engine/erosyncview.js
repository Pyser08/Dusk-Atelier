// Erosync 값(읽기 전용 JSON, data/erosync.js의 read())을 인물 위키·관계도가 쓰는 모양으로 바꾸는 순수 함수.
// 저장은 Erosync 자신의 키(erosync_*)에 있고, 여기서는 읽기만 한다(1단계). 이름으로 위키 인물과 맞춘다.
export const AXIS_LABEL = Object.freeze({ initiative: "주도성", spontaneity: "즉흥성", directness: "직접성", goalPersistence: "지속성", obsessiveness: "집착성", publicOpenness: "개방성", retaliation: "보복성", extremity: "극단성" });
export const AXIS_HINT = Object.freeze({
  initiative: "먼저 말 걸고 판을 벌이는 정도", spontaneity: "그 자리의 기분으로 움직이는 정도", directness: "속마음을 돌리지 않고 말하는 정도", goalPersistence: "한번 노린 걸 끈질기게 이어 가는 정도",
  obsessiveness: "한 사람·한 가지에 매달리는 정도", publicOpenness: "남들 앞에서 드러내는 정도", retaliation: "당한 만큼 되갚으려는 정도", extremity: "수단의 수위가 올라가는 정도"
});
const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const arr = (v) => (Array.isArray(v) ? v : []);

export const eroReady = (snap) => !!snap && snap.ok === true && arr(snap.people).length > 0;

// 위키 인물(이름·별칭들) → Erosync 인물. 이름이나 별칭이 하나라도 정확히 같을 때만 맞춘다(다르게 짐작하지 않는다).
export function eroPerson(snap, selfNames) {
  if (!eroReady(snap)) return null;
  const want = new Set(arr(selfNames).map(nk).filter(Boolean));
  if (!want.size) return null;
  const hit = arr(snap.people).filter((p) => [p.name, ...arr(p.aliases)].some((n) => want.has(nk(n))));
  return hit.length === 1 ? hit[0] : null;   // 둘 이상이면 어느 쪽인지 알 수 없으니 맞추지 않는다
}

// 8축 게이지: AI가 읽은 값(base)과 지금 값(value). 값이 없는 축은 뺀다.
export function eroAxes(person) {
  return arr(person?.axes).filter((a) => Number.isFinite(a?.value)).map((a) => ({ axis: a.axis, label: AXIS_LABEL[a.axis] ?? a.axis, hint: AXIS_HINT[a.axis] ?? "", base: Number.isFinite(a.base) ? a.base : null, value: a.value, changed: Number.isFinite(a.base) && a.base !== a.value }));
}

// 성인 항목(접힌 곳): 성적 관심·자발성·개방성·추진력, 선호 성별 비율. 비인물·SFW면 null.
export const SEX_LABEL = Object.freeze({ eroticInterest: "성적 관심", sexualSpontaneity: "성적 즉흥성", sexualOpenness: "성적 개방성", sexualMomentum: "성적 추진력" });
export function eroAdult(person) {
  if (!person || person.nonPerson || person.sfw || !person.sexual) return null;
  const rows = Object.keys(SEX_LABEL).filter((k) => Number.isFinite(person.sexual[k])).map((k) => ({ key: k, label: SEX_LABEL[k], value: person.sexual[k] }));
  const pref = person.pref && person.pref.total > 0 ? { f: person.pref.f, m: person.pref.m, x: person.pref.x } : null;
  return rows.length || pref ? { rows, pref } : null;
}

// 이 인물이 지금 노리는 것(목표) / 이 인물을 노리는 쪽 / 경쟁
export function eroGoalsOf(snap, id) {
  const goals = arr(snap?.goals), rivals = arr(snap?.rivalries);
  return {
    aiming: goals.filter((g) => g.actor === id),
    aimedAt: goals.filter((g) => g.target === id),
    rivals: rivals.filter((r) => r.actor === id || r.rival === id)
  };
}

// 두 인물 사이: 한쪽이 다른 쪽을 노리는 목표·경쟁·Erosync 관계 수치(양방향)
export function eroPair(snap, aId, bId) {
  if (!aId || !bId || aId === bId) return { goals: [], rivals: [], relations: [] };
  const is = (x, y, p, q) => p === x && q === y || p === y && q === x;
  return {
    goals: arr(snap?.goals).filter((g) => is(aId, bId, g.actor, g.target)),
    rivals: arr(snap?.rivalries).filter((r) => is(aId, bId, r.actor, r.rival)),
    relations: arr(snap?.relations).filter((r) => is(aId, bId, r.from, r.to))
  };
}

// 이름(위키 상대)으로 Erosync 인물 찾기
export const eroPersonByName = (snap, name) => eroPerson(snap, [name]);

// Dusk 관계도에 얹을 Erosync 층: 목표 화살표(노리는 쪽→대상)와 경쟁선.
export function eroRelmapLayer(snap) {
  if (!eroReady(snap)) return { edges: [], names: [] };
  const edges = [];
  for (const g of arr(snap.goals)) edges.push({ kind: "goal", fromId: g.actor, toId: g.target, from: g.actorName, to: g.targetName, label: g.typeLabel || "목표", strength: g.priority ?? 50, detail: g.objective || g.nextMove || "" });
  for (const r of arr(snap.rivalries)) edges.push({ kind: "rival", fromId: r.actor, toId: r.rival, from: r.actorName, to: r.rivalName, label: "경쟁", strength: r.intensity ?? 50, detail: r.reason || "" });
  const names = [...new Set(edges.flatMap((e) => [e.from, e.to]).filter(Boolean))];
  return { edges, names };
}

const keyOf = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const cutTo = (s, n) => { const t = String(s ?? "").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const clampTo = (v, a, b) => Math.max(a, Math.min(b, v));

// Dusk 관계도 데이터(buildRelMap 결과)에서 Erosync 목표·경쟁에 걸린 인물만 남기고, 선을 Erosync 것으로 바꾼다.
// 위키 인물과는 이름·별칭으로 맞추고, 못 맞춘 Erosync 인물 수는 missing으로 알려 준다. {{user}} 선은 그리지 않는다(noUser).
export function eroRelmapData(data, snap) {
  const out = { ...(data ?? {}), nodes: [], edges: [], noUser: true, ero: true, missing: 0, empty: true };
  if (!eroReady(snap) || !arr(data?.nodes).length) return out;
  const byKey = new Map(data.nodes.map((n) => [n.id, n]));
  const nodeOf = (id) => {
    const p = arr(snap.people).find((x) => x.id === id);
    if (!p) return null;
    for (const nm of [p.name, ...arr(p.aliases)]) { const n = byKey.get(keyOf(nm)); if (n) return n; }
    return null;
  };
  const seen = new Set(), missing = new Set();
  for (const e of eroRelmapLayer(snap).edges) {
    const A = nodeOf(e.fromId), B = nodeOf(e.toId);
    if (!A || !B || A.id === B.id) { for (const [n, id] of [[A, e.fromId], [B, e.toId]]) if (!n && id && id !== "user") missing.add(id); continue; }
    const id = `ero:${e.kind}:${A.id}~${B.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.edges.push({ id, k: id, a: A.id, b: B.id, w: e.kind === "rival" ? -0.8 : 0.7, s: clampTo(0.25 + (e.strength ?? 50) / 100 * 0.75, 0.25, 1), sp: e.kind === "rival" ? 1 : 0, rc: 0, label: cutTo(e.label, 14) || "목표", items: e.detail ? [["", cutTo(e.detail, 80)]] : [] });
  }
  const ids = new Set(out.edges.flatMap((e) => [e.a, e.b]));
  out.nodes = data.nodes.filter((n) => ids.has(n.id));
  out.missing = missing.size;
  out.empty = !out.edges.length;
  return out;
}

// NSFW 탭 위쪽 한 줄 요약: 지금 노리는 목표 · 가장 높은 관계 수치 · 집착 방지로 쉬는 턴. 읽어 온 값만 모은다(AI 호출 없음).
export function eroSummary(snap, id) {
  const g = eroGoalsOf(snap, id), lines = [];
  const top = [...g.aiming].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (top) lines.push({ k: "goal", text: `${top.targetName}에게 ${top.typeLabel}${top.objective ? ` — ${top.objective}` : ""}` });
  if (g.aimedAt.length) lines.push({ k: "aimed", text: `${g.aimedAt.map((x) => x.actorName).join(", ")}이(가) 이 인물을 노려요` });
  if (g.rivals.length) lines.push({ k: "rival", text: `경쟁 ${g.rivals.length}건` });
  const rel = arr(snap?.relations).filter((r) => r.from === id).sort((a, b) => (b.eroticAttraction + b.affection) - (a.eroticAttraction + a.affection))[0];
  if (rel) lines.push({ k: "rel", text: `${rel.toName}에게 호감 ${rel.affection} · 끌림 ${rel.eroticAttraction}${rel.hatred > 0 ? ` · 증오 ${rel.hatred}` : ""}` });
  for (const r of arr(snap?.rests).filter((x) => x.actor === id)) lines.push({ k: "rest", text: `${r.targetName} 쪽 목표는 ${r.left}턴 쉬는 중이에요(집착 방지)` });
  return lines;
}

// 관계 온도 그래프: 이 인물이 상대별로 어떻게 느껴 왔는지(턴별 호감·끌림·반감). 점이 2개 이상인 상대만.
export function eroTemp(snap, id) {
  return arr(snap?.temp).filter((t) => t.from === id && arr(t.points).length >= 2).map((t) => ({ to: t.to, toName: t.toName, points: t.points }));
}
// 점들을 SVG polyline 좌표로(0~100 → 위가 큼). w×h 안, 턴 간격 그대로 가로에 펼친다.
export function tempPath(points, key, w = 240, h = 70) {
  const pts = arr(points);
  if (!pts.length) return "";
  const t0 = pts[0].turn, span = Math.max(1, pts[pts.length - 1].turn - t0);
  return pts.map((p) => `${(((p.turn - t0) / span) * w).toFixed(1)},${(h - (Math.max(0, Math.min(100, Number(p[key]) || 0)) / 100) * h).toFixed(1)}`).join(" ");
}
