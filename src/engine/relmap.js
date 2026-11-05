// 인물 관계도(반3D) 데이터 계산 (v1.9.3, 순수 함수). 화면 코드 없음.
// 장기기억 폴더(folder.people · emo · rels · scenes · rifts · beliefs)에서 노드와 선을 만든다.
// 새 필드가 없어도 그려지게 기본 모양을 쓰고, 나중에 person.faction · person.status가 생기면 그대로 반영한다.
import { pairView, nowOf } from "./memoryhuman.js";
import { STAGE_LABEL, USER } from "./memoryuser.js";

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

export function buildRelMap(folder, { max = RM.MAX_NODES } = {}) {
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
    const aff = affinityOf(pv.feel.ba?.tags, !!pv.feel.ba);
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
  return { nodes, edges, nowAt, empty: !nodes.length };
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
