// 인물 관계도(반3D) 데이터 계산 (v1.9.3, 순수 함수). 화면 코드 없음.
// 장기기억 폴더(folder.people · emo · rels · scenes · rifts · beliefs)에서 노드와 선을 만든다.
// 새 필드가 없어도 그려지게 기본 모양을 쓰고, 나중에 person.faction · person.status가 생기면 그대로 반영한다.
import { pairView, nowOf } from "./memoryhuman.js";
import { STAGE_LABEL, USER } from "./memoryuser.js";
import { liveTies } from "./memoryplus.js";
import { isLoverKind, strayRisk } from "./lover.js";
import { unrequited, triangles, exPairs, isSecret, timeline, eventText } from "./romance.js";

export const RM = Object.freeze({ RMIN: 70, RMAX: 300, HH: 120, MIN_GAP: 34, MAX_NODES: 40 });
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cut = (s, n) => { const t = String(s ?? "").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const live = (r) => r && !r.orphan && r.valid !== false;
export const STATUS_LABEL = Object.freeze({ missing: "실종", unknown: "정체 불명", dead: "사망" });

// 호감도(0~100): 그 인물이 {{user}}에게 느끼는 감정 게이지. 좋은 쪽(애정·신뢰·존경)에서 나쁜 쪽(적대·두려움)을 뺀다.
// 감정 기록이 없으면 50(중립).
export function affinityOf(feelTags, hasFeel) {
  if (!hasFeel) return 50;
  const t = feelTags ?? {};
  const pos = Math.max(t.affection ?? 0, t.trust ?? 0, t.respect ?? 0), neg = Math.max(t.hostility ?? 0, t.fear ?? 0);
  return clamp(Math.round(50 + (pos - neg) * 5), 0, 100);
}

// 중요도(0~100): 기록 수(많을수록) + 최근 기록(최근 20응답 안).
export function importanceOf(records, nowAt) {
  const rs = (records ?? []).filter(live);
  const recent = rs.filter((r) => r.at != null && nowAt - r.at <= 20).length;
  return clamp(Math.round(20 + Math.min(50, rs.length * 4) + Math.min(30, recent * 10)), 0, 100);
}

// mode: "affinity"(기본, 호감도) | "romance"(2.2.6 이성적 감정: 거리=그 인물이 {{user}}에게 느끼는 이성적 호감, 선=인물끼리의 끌림·애인)
export function buildRelMap(folder, { max = RM.MAX_NODES, mode = "affinity" } = {}) {
  const romance = mode === "romance";
  const nowAt = nowOf(folder);
  const uk = key(USER);
  // 1) 후보 이름: 기록 있는 인물 · 관계 선 양끝 · {{user}}와 감정이 오간 인물 (counterparts는 인물 수 × 장면 수만큼 돌아서 쓰지 않는다)
  const names = new Map();
  const add = (n) => { const k = key(n); if (k && k !== uk && !names.has(k)) names.set(k, String(n)); };
  const peopleByKey = {};
  for (const [pk, p] of Object.entries(folder?.people ?? {})) {
    if (!p) continue;
    peopleByKey[key(p.name ?? pk)] = p; peopleByKey[pk] = p;
    if (key(p.name) !== uk && (p.records ?? []).some(live)) add(p.name);
  }
  for (const x of Object.values(folder?.rels ?? {})) { add(x?.from); add(x?.to); }
  for (const x of Object.values(folder?.emo ?? {})) { if (key(x?.to) === uk) add(x?.from); else if (key(x?.from) === uk) add(x?.to); }
  // 2) 값싼 중요도로 먼저 상위 max명만 고른다. 비싼 계산(pairView)은 이 사람들에게만 한다.
  const cand = [...names].map(([k, name]) => {
    const recs = (peopleByKey[k]?.records ?? []).filter(live);
    return { k, name, recs, imp: importanceOf(recs, nowAt) };
  }).sort((a, b) => b.imp - a.imp || a.name.localeCompare(b.name, "ko")).slice(0, max);
  const sceneNow = new Set();
  if (nowAt > 0) for (const sc of folder?.scenes ?? []) if (!sc.orphan && sc.at === nowAt) for (const w of sc.who ?? []) sceneNow.add(key(w));
  const nodes = [];
  for (const { k, name, recs, imp } of cand) {
    const p = peopleByKey[k] ?? null;
    const pv = pairView(folder, [USER], name, nowAt);
    const aff = romance ? clamp(Math.round((pv.feel.ba?.tags?.attraction ?? 0) * 10), 0, 100) : affinityOf(pv.feel.ba?.tags, !!pv.feel.ba);
    const thisTurn = nowAt > 0 && (recs.some((r) => r.at === nowAt) || sceneNow.has(k));
    const sorted = recs.slice().sort((a, b) => (b.at ?? -1) - (a.at ?? -1));
    const lastAt = recs.reduce((m, r) => Math.max(m, r.at ?? -1), -1);
    nodes.push({
      id: k, name, faction: String(p?.faction ?? "").trim(), status: STATUS_LABEL[p?.status] ? p.status : "",
      aff, imp, thisTurn, records: recs.length,
      sum: cut(pv.bonds.at(-1)?.moment || sorted[0]?.act || "", 90),
      rec: sorted.slice(0, 3).map((r) => [r.at != null ? `#${r.at + 1}` : "", cut(r.act, 70)]),
      // {{user}}와의 선
      uLabel: pv.talk.ba?.call ? `${STAGE_LABEL[pv.stage.stage] ?? ""} · ${pv.talk.ba.call}라고 부름` : STAGE_LABEL[pv.stage.stage] ?? "관계",
      uStrength: clamp(0.25 + (pv.stage.shared ?? 0) * 0.12, 0.25, 1),
      uSpecial: pv.rifts.some((r) => r.state !== "resolved") || pv.beliefs.some((b) => b.open),
      uRecent: thisTurn || (lastAt >= 0 && nowAt - lastAt <= 3)
    });
  }
  nodes.sort((a, b) => b.imp - a.imp || b.aff - a.aff || a.name.localeCompare(b.name, "ko"));
  const keep = new Set(nodes.map((n) => n.id));

  const edges = [];
  for (const [rk, pair] of Object.entries(folder?.rels ?? {})) {
    const a = key(pair?.from), b = key(pair?.to);
    if (!keep.has(a) || !keep.has(b) || a === b) continue;
    const items = (pair.items ?? []).filter((i) => !i.orphan);
    if (!items.length) continue;
    const ups = items.filter((i) => i.dir === "+").length, downs = items.filter((i) => i.dir === "-").length;
    const last = items.at(-1);
    edges.push({
      id: `${a}~${b}`, k: rk, a, b, w: clamp((ups - downs) / items.length, -1, 1), s: clamp(0.25 + items.length * 0.15, 0.25, 1), sp: 0,
      rc: last?.at != null && nowAt - last.at <= 5 ? 1 : 0, label: cut(last?.d, 14) || "관계",
      items: items.slice(-3).reverse().map((i) => [i.at != null ? `#${i.at + 1}` : "", cut(i.d, 80)])
    });
  }
  // 2.2.4 오래가는 관계(남매·연인 등): 있는 선은 이름으로 쓰고, 변화 기록이 없는 두 사람도 선으로 잇는다
  const ties = liveTies(folder);   // 리롤·삭제로 출처가 사라진 관계는 빼고(그 전 관계로)
  const tieOf = (x, y) => ties.find((t) => key(t.a) === x && key(t.b) === y) ?? ties.find((t) => key(t.a) === y && key(t.b) === x);
  for (const e of edges) { const t = tieOf(e.a, e.b); if (t) { e.label = cut(t.kind, 14); if (isLoverKind(t.kind)) { e.lover = true; e.label = "💗 " + cut(t.kind, 12); } } }
  for (const t of ties) {
    const a = key(t.a), b = key(t.b); if (!keep.has(a) || !keep.has(b) || a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
    const lv = isLoverKind(t.kind);
    edges.push({ id: `${a}~${b}`, k: `tie:${a}>${b}`, a, b, w: lv ? 0.9 : 0.3, s: lv ? 0.7 : 0.35, sp: 0, rc: 0, ...(lv ? { lover: true } : {}), label: (lv ? "💗 " : "") + cut(t.kind, lv ? 12 : 14), items: [[t.at != null ? `#${t.at + 1}` : "", `${t.b}: ${t.a}의 ${t.kind}`]] });
  }
  // 나와의 관계: 'A에게 B는 kind'라서, 내가 A인 관계(그 인물이 나의 kind)를 먼저 쓰고, 반대 방향만 있으면 '나는 kind'로 보인다
  for (const n of nodes) { const t = tieOf(key(USER), n.id); if (t) n.uLabel = `${key(t.a) === key(USER) ? cut(t.kind, 10) : `나는 ${cut(t.kind, 8)}`} · ${n.uLabel}`; }
  if (romance) return romanceOf(folder, nodes, keep, tieOf, nowAt);
  return { nodes, edges, nowAt, empty: !nodes.length };
}

// 이성적 감정 관계도: 선은 인물끼리의 이성적 호감(양방향을 합쳐 하나)과 애인 관계만. {{user}} 선 이름은 끌림 수치·애인.
function romanceOf(folder, nodes, keep, tieOf, nowAt) {
  const lover = (x, y) => { const t = tieOf(x, y); return t && isLoverKind(t.kind) ? t : null; };
  const pairs = new Map();
  for (const pr of Object.values(folder?.emo ?? {})) {
    const a = key(pr?.from), b = key(pr?.to), v = pr?.tags?.attraction ?? 0;
    if (!keep.has(a) || !keep.has(b) || a === b || v <= 0) continue;
    const id = [a, b].sort().join("~"), cur = pairs.get(id) ?? { a, b, ab: 0, ba: 0, names: [pr.from, pr.to] };
    if (cur.a === a) cur.ab = Math.max(cur.ab, v); else cur.ba = Math.max(cur.ba, v);
    pairs.set(id, cur);
  }
  const edges = [];
  for (const [id, p] of pairs) {
    const t = lover(p.a, p.b), both = p.ab > 0 && p.ba > 0, top = Math.max(p.ab, p.ba);
    edges.push({ id, k: `ro:${id}`, a: p.a, b: p.b, w: 0.4 + top / 20, s: clamp(0.25 + top * 0.075, 0.25, 1), sp: both || t ? 0 : 1, rc: 0, ...(t ? { lover: true } : {}),
      label: t ? "💗 " + cut(t.kind, 12) : both ? "서로 끌림" : "끌림", items: [["", `${p.names[0]} → ${p.names[1]} 끌림 ${p.ab}`], ["", `${p.names[1]} → ${p.names[0]} 끌림 ${p.ba}`]] });
  }
  for (const n of nodes) for (const m of nodes) {
    if (n.id >= m.id || pairs.has([n.id, m.id].sort().join("~"))) continue;
    const t = lover(n.id, m.id); if (!t) continue;
    edges.push({ id: `${n.id}~${m.id}`, k: `ro:${n.id}~${m.id}`, a: n.id, b: m.id, w: 1, s: 0.8, sp: 0, rc: 0, lover: true, label: "💗 " + cut(t.kind, 12), items: [["", `${t.b}: ${t.a}의 ${t.kind}`]] });
  }
  // 2.2.6 연애 흐름: 짝사랑·연적·전 애인·비밀 연애·흔들림을 선 이름에, 연표를 선 설명에
  const eid = (a, b) => [a, b].sort().join("~"), byId = new Map(edges.map((e) => [eid(e.a, e.b), e]));
  const ensure = (a, b, base) => { const id = eid(a, b); let e = byId.get(id); if (!e) { e = { id, k: `ro:${id}`, a, b, w: 0.3, s: 0.4, sp: 0, rc: 0, label: "", items: [], ...base }; edges.push(e); byId.set(id, e); } return e; };
  for (const u of unrequited(folder)) { const a = key(u.from), b = key(u.to); if (keep.has(a) && keep.has(b)) { const e = ensure(a, b, {}); e.label = "짝사랑"; e.sp = 1; e.unrequited = true; } }
  for (const t of triangles(folder)) { const a = key(t.a), c = key(t.c); if (keep.has(a) && keep.has(c) && a !== c) { const e = ensure(a, c, { w: -0.8, s: 0.6, sp: 1 }); if (!e.label || e.label === "") e.label = `연적 · ${cut(t.over, 6)}`; e.rival = true; } }
  for (const x of exPairs(folder)) { const a = key(x.a), b = key(x.b); if (keep.has(a) && keep.has(b)) { const e = ensure(a, b, { w: -0.2, s: 0.5 }); e.label = "💔 전 애인"; e.ex = true; delete e.lover; } }
  for (const e of edges) {
    const A = nodes.find((n) => n.id === e.a)?.name, B = nodes.find((n) => n.id === e.b)?.name;
    if (!A || !B) continue;
    if (e.lover && isSecret(folder, A, B)) e.label = "🤫 비밀 연애";
    if (e.lover && (strayRisk(folder, A)?.partner && key(strayRisk(folder, A).partner) === key(B) || strayRisk(folder, B)?.partner && key(strayRisk(folder, B).partner) === key(A))) e.label = "💗 흔들리는 연인";
    const tl = timeline(folder, A, B);
    if (tl.length) e.items = [...(e.items ?? []), ...tl.slice(-4).map((x) => [x.when || (x.at != null ? `#${x.at + 1}` : ""), eventText(x)])];
  }
  const uk = key(USER);
  for (const n of nodes) {
    const t = lover(uk, n.id), v = Math.round(n.aff / 10);
    n.uLabel = t ? `${isSecret(folder, USER, n.name) ? "🤫 비밀 연애" : "💗 애인"} · 끌림 ${v}` : v ? `끌림 ${v}` : "끌림 없음";
    if (!t && exPairs(folder).some((x) => key(x.a) === n.id && key(x.b) === uk || key(x.b) === n.id && key(x.a) === uk)) n.uLabel = `💔 전 애인 · 끌림 ${v}`;
    n.uStrength = clamp(0.2 + v * 0.08, 0.2, 1);
    n.uSpecial = false;
    if (t) n.uLover = true;
  }
  return { nodes, edges, nowAt, romance: true, ringLabel: "끌림", empty: !nodes.length };
}

// 2.2.6 지난 턴 시점의 폴더(관계도 ‘이전 턴 보기’용, 원본은 건드리지 않음). at 이후에 생긴 기록·장면·관계·감정 변화를 뺀다.
// 감정 게이지는 변화 이력(log)에서 그 시점의 마지막 값으로 되돌린다(이력이 없는 태그는 그때 없던 것으로 본다).
export function relmapTurns(folder) {
  const s = new Set();
  for (const sc of folder?.scenes ?? []) if (!sc.orphan && sc.at != null) s.add(sc.at);
  for (const p of Object.values(folder?.people ?? {})) for (const r of p?.records ?? []) if (live(r) && r.at != null) s.add(r.at);
  return [...s].sort((a, b) => a - b);
}
export function folderAt(folder, at) {
  if (!folder || at == null) return folder;
  const ok = (x) => x?.at == null || x.at <= at;
  const people = {};
  for (const [k, p] of Object.entries(folder.people ?? {})) people[k] = { ...p, records: (p.records ?? []).filter((r) => r.at != null && r.at <= at) };
  const rels = {};
  for (const [k, r] of Object.entries(folder.rels ?? {})) { const items = (r.items ?? []).filter((i) => i.at != null && i.at <= at); if (items.length) rels[k] = { ...r, items }; }
  const ties = {};
  for (const [k, t] of Object.entries(folder.ties ?? {})) {
    if (t.at != null && t.at <= at) ties[k] = t;
    else if (t.prev && t.prev.at != null && t.prev.at <= at) ties[k] = { a: t.a, b: t.b, ...t.prev };
  }
  const emo = {};
  for (const [k, pr] of Object.entries(folder.emo ?? {})) {
    const tags = {};
    for (const e of pr.log ?? []) if (!e.orphan && e.at != null && e.at <= at) for (const [t, v] of Object.entries(e.t ?? {})) { if (v == null) delete tags[t]; else tags[t] = v; }
    if (Object.keys(tags).length) emo[k] = { ...pr, tags, log: (pr.log ?? []).filter((e) => e.at != null && e.at <= at) };
  }
  const list = (v) => (Array.isArray(v) ? v.filter(ok) : v);
  return { ...folder, people, rels, ties, emo, scenes: (folder.scenes ?? []).filter((x) => x.at != null && x.at <= at), rifts: list(folder.rifts), bonds: list(folder.bonds), beliefs: list(folder.beliefs), cursor: { ...(folder.cursor ?? {}), at } };
}

// 위치(순수): 소속(없으면 전체)별 부채꼴 + 호감도 거리. 겹치면 서로 밀어낸다. 노드에 tx·tz·ty를 넣는다.
export function layoutNodes(nodes, { rmin = RM.RMIN, rmax = RM.RMAX, hh = RM.HH, gap = RM.MIN_GAP } = {}) {
  const groups = new Map();
  for (const n of nodes) { const g = n.faction || ""; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(n); }
  const order = [...groups.keys()].sort((a, b) => (a === "") - (b === "") || a.localeCompare(b, "ko"));
  const gn = order.length, sector = 360 / gn;
  order.forEach((g, gi) => {
    const list = groups.get(g).slice().sort((a, b) => key(a.name).localeCompare(key(b.name)));
    const center = 90 + gi * sector, span = gn === 1 ? 360 : Math.min(sector * 0.88, 124);
    const step = gn === 1 ? 360 / Math.max(1, list.length) : Math.min(34, span / Math.max(1, list.length - 1));
    list.forEach((n, i) => {
      const ang = gn === 1 ? (center + i * step) : center + (i - (list.length - 1) / 2) * step;
      const a = ang * Math.PI / 180, r = rmin + (100 - n.aff) / 100 * (rmax - rmin) + (i % 2 ? 8 : -8);
      n.tx = r * Math.cos(a); n.tz = r * Math.sin(a); n.ty = (n.imp - 50) / 50 * hh; n.ang = ang;
    });
  });
  for (let it = 0; it < 90; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j], dx = B.tx - A.tx, dz = B.tz - A.tz, d = Math.hypot(dx, dz) || 0.01;
      if (d < gap) { const m = (gap - d) / 2, ux = dx / d, uz = dz / d; A.tx -= ux * m; A.tz -= uz * m; B.tx += ux * m; B.tz += uz * m; moved = true; }
    }
    if (!moved) break;
  }
  return { factions: order.filter(Boolean), sector };
}

// 두 인물을 잇는 가장 짧은 NPC 관계 경로(너비 우선). {{user}} 선은 넣지 않는다. 없으면 null.
export function findPath(edges, from, to, minStrength = 0) {
  const adj = new Map();
  for (const e of edges) { if (e.s * 100 < minStrength) continue; (adj.get(e.a) ?? adj.set(e.a, []).get(e.a)).push(e.b); (adj.get(e.b) ?? adj.set(e.b, []).get(e.b)).push(e.a); }
  const prev = new Map(), seen = new Set([from]), q = [from];
  while (q.length) { const c = q.shift(); if (c === to) break; for (const x of adj.get(c) ?? []) if (!seen.has(x)) { seen.add(x); prev.set(x, c); q.push(x); } }
  if (!seen.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]));
  return path;
}
