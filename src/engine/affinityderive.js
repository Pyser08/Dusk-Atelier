// 2.2.30 장기기억: 호감도(위키 affinity.score, -100~300)를 감정·첫인상·친밀도로 계산한다(호출 없음).
// 예전엔 기록기가 응답마다 "호감 +2" 같은 변화를 따로 판단해 쌓아, 감정의 인간적·이성적 호감과 따로 놀았다.
// 이제 인물 → {{user}} 감정(인간적 호감·이성적 호감·신뢰, 적대·두려움은 깎음) + 두 사람 친밀도 + 첫인상(처음엔 크게, 친해질수록 작게)으로 정하고,
// 응답이 기록될 때마다 위키 호감도를 그 값으로 맞춘다. 호감도 HUD($aff)·로어북 조건은 그대로 이 값을 읽는다.
// 감정 기록이 아직 없는 인물은 건드리지 않는다(기록기 값 유지). 고정핀을 건 호감도도 그대로.
import { manuallySetMetric } from "./pot/metric-engine.js";
import { updateWikiDocument, normalizeWikiScope } from "./pot/wiki-schema.js";
import { peopleItemPinned } from "./pot/people-pins.js";

const WARM = /호감|좋은|좋아|믿음|믿을|신뢰|든든|다정|친절|따뜻|귀엽|귀여|멋지|멋진|반했|설레|끌리|매력|고마|편안|편한|기대|존경|착한|괜찮은|friendly|kind|trust|like|warm|cute|charming|attractive/i;
const COLD = /경계|불쾌|수상|의심|싫|짜증|무섭|두려|위험|거슬|불편|못마땅|한심|건방|재수|역겨|냉담|차갑|적대|무례|낯설고 불|suspicious|annoying|creepy|dangerous|rude|cold|hostile|distrust/i;
// 첫인상 문장의 결: 1 좋음 · 0 보통 · -1 나쁨(둘 다 있으면 보통)
export function firstTone(text) {
  const t = String(text ?? ""); if (!t.trim()) return 0;
  const w = WARM.test(t), c = COLD.test(t);
  return w && !c ? 1 : c && !w ? -1 : 0;
}
export const AFF_MIN = -100, AFF_MAX = 300;
// 순수: 0~10 값들 → 호감도
export function deriveAffinity({ affection = 0, attraction = 0, trust = 0, hostility = 0, fear = 0, intim = 0, first = 0 } = {}) {
  const warm = 0.45 * affection + 0.2 * attraction + 0.15 * trust + 0.2 * intim;   // 0~10
  const firstBias = first * 30 * (1 - Math.min(10, intim) / 10);   // 첫인상은 처음엔 ±30, 가까워질수록 0에 가깝게
  const v = warm * 30 + firstBias - hostility * 15 - fear * 5;
  return Math.max(AFF_MIN, Math.min(AFF_MAX, Math.round(v)));
}
const sectionText = (doc, slot) => (doc?.sections ?? []).find((s) => s?.provenance?.slotId === slot && (s.provenance?.targetRefs ?? [])[0] === "actor:user")?.body ?? "";
// 위키 범위의 호감도를 맞춘다. feelOf(names) → {tags, has} (인물 → 유저, 식은 값 반영), intimOf(title) → 0~10, policy: affinity.score 정책.
// 반환 { scope, changed: [{title, from, to}] }
export function syncAffinity(scope, { feelOf, intimOf, policy, now = new Date().toISOString() }) {
  if (!policy) return { scope, changed: [] };
  let next = normalizeWikiScope(scope); const changed = [];
  for (const doc of Object.values(next.documents ?? {})) {
    if (doc?.type !== "Character") continue;
    const m = (doc.metrics ?? []).find((x) => x.slotId === "affinity.score" && (x.targetRefs ?? [])[0] === "actor:user");
    if (!m || peopleItemPinned(next, doc.id, "metric:" + m.id)) continue;
    const fe = feelOf([doc.title, ...(doc.aliases ?? [])]);
    if (!fe?.has) continue;
    const t = fe.tags ?? {};
    const to = deriveAffinity({ affection: t.affection ?? 0, attraction: t.attraction ?? 0, trust: t.trust ?? 0, hostility: t.hostility ?? 0, fear: t.fear ?? 0, intim: intimOf(doc.title) ?? 0, first: firstTone(sectionText(doc, "affinity.appraisal")) });
    if (to === m.value) continue;
    let nm; try { nm = manuallySetMetric(m, to, policy, { reason: "Dusk 계산: 인간적·이성적 호감·신뢰·친밀도·첫인상", now }); } catch { continue; }
    next = updateWikiDocument(next, doc.id, { type: doc.type, title: doc.title, aliases: doc.aliases, tags: doc.tags, links: doc.links, sections: doc.sections, metrics: doc.metrics.map((x) => (x.id === m.id ? nm : x)) }, { now });
    changed.push({ title: doc.title, from: m.value, to });
  }
  return { scope: next, changed };
}
