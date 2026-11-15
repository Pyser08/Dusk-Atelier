// 2.2.2 인물 이름·수치 통일(장기 기억 기준). 장기 기억 인물의 이름과 감정 수치를 기준으로 삼고,
// 장기 기억에 없는 것만 각 기능(위키 문서·Erosync)의 값을 가져와 채운다.
//  · 이름: 위키 문서 제목은 장기 기억 인물 이름으로 맞춘다(peoplemerge.alignDocTitles). Erosync·관계도는 장기 기억 이름·별칭으로 짝을 찾는다.
//  · 호감: 위키 인물 화면·관계도·Erosync 화면이 모두 장기 기억 감정 수치(relmap.affinityOf)를 보여 준다. 장기 기억에 감정 기록이 없으면 위키 값을 쓴다.
import { pairView, nowOf } from "./memoryhuman.js";
import { affinityOf } from "./relmap.js";
import { USER } from "./memoryuser.js";

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");

// 장기 기억이 아는 이 인물의 호감(0~100). 감정 기록이 없으면 null(→ 위키 값을 쓴다)
export function memoryAffinity(folder, names) {
  if (!folder?.emo) return null;
  const now = nowOf(folder), given = [names].flat().filter(Boolean), gk = new Set(given.map(norm));
  // 받은 이름이 장기 기억 인물의 이름·별칭이면 그 인물의 이름·별칭도 함께 찾는다(위키 문서 제목이 별칭인 경우)
  const all = [...given]; for (const p of Object.values(folder.people ?? {})) { const ns = [p?.name, ...(p?.aliases ?? [])].filter(Boolean); if (ns.some((n) => gk.has(norm(n)))) all.push(...ns); }
  for (const n of [...new Set(all)]) {
    const pv = pairView(folder, [USER], n, now);
    if (pv?.feel?.ba) return affinityOf(pv.feel.ba.tags, true);
  }
  return null;
}

// 위키 '지금 상태' 카드(personview.stateOf 결과)의 호감 칸을 장기 기억 값으로 바꾼다(문서 저울 범위로 환산).
// 문서에 호감 칸이 없으면 장기 기억 값으로 하나 만든다. 장기 기억에 값이 없으면 문서 값을 그대로 둔다(부족한 값은 각 기능 것을 쓴다).
export function withMemoryAffinity(state, folder, doc, person = null) {
  const names = [person?.name, ...(person?.aliases ?? []), doc?.title, ...(doc?.aliases ?? [])].filter(Boolean);
  const v = memoryAffinity(folder, names);
  if (v == null) return state;
  const base = state ?? { meters: [], texts: [] };
  const meters = [...(base.meters ?? [])];
  const i = meters.findIndex((m) => m.slotId === "affinity.score");
  if (i >= 0) {
    const m = meters[i], lo = Number.isFinite(Number(m.min)) ? Number(m.min) : 0, hi = Number.isFinite(Number(m.max)) ? Number(m.max) : 100;
    meters[i] = { ...m, value: Math.round(lo + (v / 100) * (hi - lo)), src: "memory", wikiValue: m.value };
  } else meters.unshift({ id: "affinity", slotId: "affinity.score", label: "호감", value: v, min: 0, max: 100, delta: 0, stage: "", src: "memory" });
  return { ...base, meters };
}

// 이름 → 관계도 노드 id 지도(장기 기억 인물 이름·별칭과 위키 문서 별칭까지). Erosync 인물을 장기 기억 인물에 짝짓는 데 쓴다.
export function nameIndex(folder, nodeIdOf = norm) {
  const map = new Map();
  for (const p of Object.values(folder?.people ?? {})) {
    if (!p?.name) continue;
    const id = nodeIdOf(p.name);
    for (const n of [p.name, ...(p.aliases ?? [])]) { const k = norm(n); if (k && !map.has(k)) map.set(k, id); }
  }
  return map;
}
