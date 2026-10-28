// 로어북 선택·부분 수정 (v1.6.8, 순수). 요청에 실을 로어북을 항목별로 고르고,
// AI 수정안은 바뀐 항목·필드만 남겨 나머지를 보존한다.
import { equal, stable } from './util.js';

const refIndex = (ref) => Number(String(ref).slice(1));

// 항목마다 이번 요청에 포함할지 (기본 포함)
export const loreSelection = (session) => (session.draft?.globalLore ?? []).map((_, i) => session.loreIncluded?.[i] !== false);

// 저장본·가져온 값 검사: 불리언 배열이 아니거나 길이가 다르면 전부 포함으로 되돌린다
export function validLoreIncluded(value, count) {
  return Array.isArray(value) && value.length === count && value.every((x) => typeof x === 'boolean') ? value : Array(count).fill(true);
}

// 편집기에서 항목을 더하거나 지우거나 순서를 바꿔도 선택이 따라가게 맞춘다
export function reconcileLoreSelection(oldLore, oldIncluded, newLore) {
  const o = oldLore ?? [], n = newLore ?? [];
  const was = (i) => oldIncluded?.[i] !== false;
  const keyOf = (e) => (e && e.id ? 'id:' + e.id : 'j:' + stable(e));
  const pool = new Map();
  o.forEach((e, i) => { const k = keyOf(e); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(i); });
  const used = new Set(), out = Array(n.length).fill(null);
  n.forEach((e, i) => { const q = pool.get(keyOf(e)); const j = q?.shift(); if (j !== undefined) { used.add(j); out[i] = was(j); } });
  // 같은 자리에서 내용만 고친 항목은 선택을 이어받는다 (길이가 같을 때만)
  if (o.length === n.length) n.forEach((_, i) => { if (out[i] === null && !used.has(i)) { used.add(i); out[i] = was(i); } });
  return out.map((x) => x !== false);
}

// 요청에 실을 로어북 [{ref, entry}] (ref는 현재 원고 기준 l번호 그대로)
export const requestLorebook = (lore, included) => (lore ?? []).flatMap((entry, i) => (included[i] !== false ? [{ ref: 'l' + i, entry }] : []));

// 수정안이 요청에서 뺀 항목을 건드리면 오류
export function assertLoreRefsIncluded(packet, included) {
  const bad = new Set();
  const scan = (data) => {
    for (const x of data?.upsert ?? []) if (x.ref !== null && included[refIndex(x.ref)] === false) bad.add(x.ref);
    for (const r of data?.remove ?? []) if (included[refIndex(r)] === false) bad.add(r);
  };
  if (packet.task === 'lorebook') scan(packet.data);
  else if (packet.task === 'workshop') for (const c of packet.data.changes ?? []) if (c.task === 'lorebook') scan(c.data);
  if (bad.size) throw new Error('이번 요청에 포함하지 않은 로어북 항목을 AI가 바꾸려 해서 결과를 버렸습니다: ' + [...bad].join(', '));
}

// 기존 항목은 실제로 달라진 필드만 남긴다. 바뀐 게 없으면 그 항목은 뺀다.
export function compactLoreData(data, lore) {
  const upsert = (data.upsert ?? []).flatMap((item) => {
    if (item.ref === null) return [item];
    const base = lore?.[refIndex(item.ref)] ?? {};
    const entry = Object.fromEntries(Object.entries(item.entry ?? {}).filter(([k, v]) => !equal(v, base[k])));
    return Object.keys(entry).length ? [{ ref: item.ref, entry }] : [];
  });
  return { ...data, upsert };
}
export function compactLorePacket(packet, lore) {
  if (packet.task === 'lorebook') return { ...packet, data: compactLoreData(packet.data, lore) };
  if (packet.task === 'workshop') return { ...packet, data: { ...packet.data, changes: packet.data.changes.map((c) => (c.task === 'lorebook' ? { ...c, data: compactLoreData(c.data, lore) } : c)) } };
  return packet;
}

const nameOf = (e) => e?.comment || e?.key || '(이름 없음)';
// 수정안 카드용: 항목별로 무엇이 바뀌는지 (새 항목 / 수정 + 바뀌는 필드 / 삭제)
export function loreChanges(packet, lore) {
  const datas = packet.task === 'lorebook' ? [packet.data] : packet.task === 'workshop' ? packet.data.changes.filter((c) => c.task === 'lorebook').map((c) => c.data) : [];
  const out = [];
  for (const d of datas) {
    for (const x of d.upsert ?? []) {
      if (x.ref === null) { out.push({ ref: null, kind: 'new', name: nameOf(x.entry), fields: Object.keys(x.entry ?? {}) }); continue; }
      const base = lore?.[refIndex(x.ref)] ?? {};
      const fields = Object.keys(x.entry ?? {}).filter((k) => !equal(x.entry[k], base[k]));
      if (fields.length) out.push({ ref: x.ref, kind: 'edit', name: nameOf(base), fields });
    }
    for (const r of d.remove ?? []) out.push({ ref: r, kind: 'remove', name: nameOf(lore?.[refIndex(r)]), fields: [] });
  }
  return out;
}
