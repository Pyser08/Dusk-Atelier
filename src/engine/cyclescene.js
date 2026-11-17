// addon-rebuild: 월경·임신 보고 안전장치 — 이번 턴 장면에 기록되지 않은 여성의 성관계(sex) 보고는 버린다(가만히 있는 사람이 임신하던 문제).
// 장면 인물: 1단계 who·scene.who, 이번 턴에 기록한 인물. 이름은 정확히 같거나 한국 이름 성 한 글자 차이(하연=지하연)까지 같은 사람으로 본다.
// 성관계가 아닌 보고(여성 표시·임신 알게 됨·출산)는 그대로 둔다(장면 밖에서 소식을 들을 수도 있어서).
import { sameKoreanPerson } from "./namekr.js";
const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const nameOf = (x) => (typeof x === "string" ? x : x?.name ?? "");
export function scenePeople(stage1, people = []) {
  return [...(stage1?.people ?? []).map(nameOf), ...(stage1?.scene?.who ?? []).map(nameOf), ...(people ?? []).map(nameOf)].filter(Boolean);
}
export function cycleOnlyInScene(reports, stage1, people = []) {
  const here = scenePeople(stage1, people);
  const inScene = (n) => here.some((h) => nk(h) === nk(n) || sameKoreanPerson(h, n));
  const dropped = [];
  const out = (Array.isArray(reports) ? reports : []).map((r) => {
    if (!r?.sex?.length || inScene(r.name)) return r;
    dropped.push(r.name);
    return { ...r, sex: [] };
  });
  return { reports: out, dropped };
}
