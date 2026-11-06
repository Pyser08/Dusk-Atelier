// 인물 합치기 순수 로직. 합치기 대상은 'Dusk 인물'이 아니라 '목록에 보이는 항목'이다:
//  · Dusk 인물 한 명(문서가 있으면 같이 묶임)   · 어떤 Dusk 인물과도 이어지지 않은 위키 문서(예전에 Dusk 쪽만 합쳐서 남은 중복 등)
// 위키 문서 합치기는 리수폿 엔진(pot/person-merge.js)이 맡고, 여기서는 Dusk 인물·별칭 정리를 이어 붙인다.
import { findDoc } from "./personview.js";
import { planPersonMerge, applyPersonMerge } from "./pot/person-merge.js";
import { relinkNames } from "./memoryuser.js";

const keyOf = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");

// 항목: {id, name, pk, docId}. pk = folder.people 키(없으면 null), docId = 위키 Character 문서(없으면 null)
export function mergeEntries(folder, { visible = () => true } = {}) {
  const out = [], claimed = new Set();
  for (const [pk, p] of Object.entries(folder?.people ?? {})) {
    if (!p || !visible(p)) continue;
    const d = findDoc(folder.wiki, p);
    if (d) claimed.add(d.id);
    out.push({ id: "p:" + pk, name: p.name, pk, docId: d?.id ?? null });
  }
  for (const d of Object.values(folder?.wiki?.documents ?? {})) if (d?.type === "Character" && !claimed.has(d.id)) out.push({ id: "d:" + d.id, name: d.title, pk: null, docId: d.id });
  return out;
}

// 사건 기록·별칭 합치기(Dusk 쪽). 합칠 인물은 지워진다.
export function duskMerge(f, ka, kb) {
  const pa = f.people[ka], pb = f.people[kb];
  if (!pa || !pb || ka === kb) throw new Error("두 이름이 서로 다른 기존 인물이어야 해요.");
  pa.aliases = [...new Set([...(pa.aliases ?? []), pb.name, ...(pb.aliases ?? [])])];
  const seen = new Set(pa.records.map((r) => r.act));
  for (const r of pb.records) if (!seen.has(r.act)) pa.records.push(r);
  pa.records.sort((x, y) => (x.at ?? -1) - (y.at ?? -1)); delete f.people[kb];
  relinkNames(f, [pb.name, ...(pb.aliases ?? [])], pa.name);  // 버그 2: 관계·감정 기록이 합친 이름으로 남아 관계도에 둘 다 보이던 문제
}

const sameEntry = (a, b) => a.id === b.id || (a.pk && a.pk === b.pk);
const twoDocs = (a, b) => a.docId && b.docId && a.docId !== b.docId;

// 위키 문서가 서로 다른 두 개일 때만 계획이 나온다(아니면 null → Dusk 쪽만 합침). 같은 항목이면 던진다.
export function planEntryMerge(folder, keep, src, { slotDefinitions = [] } = {}) {
  if (!keep || !src || sameEntry(keep, src)) throw new Error("서로 다른 인물을 골라 주세요.");
  return twoDocs(keep, src) ? planPersonMerge(folder.wiki, keep.docId, src.docId, { slotDefinitions }) : null;
}

// folder를 직접 고친다(updateFolder 안에서 부른다). plan이 있으면 위키 문서를 합치고, Dusk 인물·별칭을 이어 맞춘다.
export function applyEntryMerge(folder, keep, src, plan, choices = {}) {
  if (!keep || !src || sameEntry(keep, src)) throw new Error("서로 다른 인물을 골라 주세요.");
  const kd = keep.docId ? folder.wiki?.documents?.[keep.docId] : null, sd = src.docId ? folder.wiki?.documents?.[src.docId] : null;
  const names = (d) => d ? [d.title, ...(d.aliases ?? [])] : [];
  if (plan) folder.wiki = applyPersonMerge(folder.wiki, plan, choices).scope;  // 반환값은 {scope, report}
  const addAliases = (pk, list) => {
    const p = folder.people[pk]; if (!p) return;
    const have = new Set([p.name, ...(p.aliases ?? [])].map(keyOf));
    p.aliases = [...(p.aliases ?? []), ...list.filter((n) => n && !have.has(keyOf(n)) && have.add(keyOf(n)))];
  };
  const kp = folder.people?.[keep.pk], sp = folder.people?.[src.pk];
  if (kp && sp) duskMerge(folder, keep.pk, src.pk);
  else if (kp) addAliases(keep.pk, [src.name, ...names(sd)]);          // 합칠 쪽이 문서뿐: 이름을 별칭으로 남겨 이후 분석이 같은 인물로 이어지게
  else if (sp) addAliases(src.pk, [keep.name, ...names(kd)]);          // 남길 쪽이 문서뿐: 남은 문서와 인물을 별칭으로 잇는다
  if (kp) addAliases(keep.pk, names(kd).concat(names(sd)));
  const keepName = folder.people?.[keep.pk]?.name ?? kd?.title ?? keep.name;
  if (keepName) relinkNames(folder, [src.name, ...names(sd)], keepName);
}
