// 퍼스트 메시지(첫 메시지 + 추가 인사말 + 그룹 전용 인사말)를 한 목록으로 다루는 순수 로직 (v1.6.7 6단계).
// 항목은 {id, kind: 'main'|'alt'|'group', text}. 목록 순서는 main → alt들 → group들. 화면은 이 목록만 고치고 fromItems로 봇에 되돌린다.

export const KIND_LABEL = { main: '대표', alt: '추가', group: '그룹 전용' };

export function toItems(draft, uid) {
  const items = [{ id: uid(), kind: 'main', text: String(draft.firstMessage ?? '') }];
  for (const t of Array.isArray(draft.alternateGreetings) ? draft.alternateGreetings : []) items.push({ id: uid(), kind: 'alt', text: String(t ?? '') });
  for (const t of Array.isArray(draft.groupOnlyGreetings) ? draft.groupOnlyGreetings : []) items.push({ id: uid(), kind: 'group', text: String(t ?? '') });
  return items;
}

export function fromItems(items) {
  const main = items.find((x) => x.kind === 'main');
  return {
    firstMessage: main ? main.text : '',
    alternateGreetings: items.filter((x) => x.kind === 'alt').map((x) => x.text),
    groupOnlyGreetings: items.filter((x) => x.kind === 'group').map((x) => x.text)
  };
}

// 봇에 쓰기: 그룹 전용은 원래 없던 필드면 비었을 때 만들지 않는다 (불필요한 변경 방지)
export function applyToDraft(draft, items, hadGroupField) {
  const o = fromItems(items);
  draft.firstMessage = o.firstMessage;
  draft.alternateGreetings = o.alternateGreetings;
  if (o.groupOnlyGreetings.length || hadGroupField) draft.groupOnlyGreetings = o.groupOnlyGreetings;
  else delete draft.groupOnlyGreetings;
}

const order = (items) => {
  const rank = { main: 0, alt: 1, group: 2 };
  return items.map((x, i) => [x, i]).sort((a, b) => rank[a[0].kind] - rank[b[0].kind] || a[1] - b[1]).map((p) => p[0]);
};

export function addItem(items, uid, kind = 'alt', text = '') {
  const it = { id: uid(), kind, text };
  return { items: order([...items, it]), added: it };
}

export function duplicateItem(items, id, uid) {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return { items, added: null };
  const src = items[i];
  // 대표를 복제하면 추가 인사말로 만든다 (대표는 하나뿐)
  const it = { id: uid(), kind: src.kind === 'main' ? 'alt' : src.kind, text: src.text };
  const out = items.slice();
  out.splice(src.kind === 'main' ? 1 : i + 1, 0, it);
  return { items: order(out), added: it };
}

// 대표는 지울 수 없다. 지운 항목과 원래 자리를 돌려줘 되돌릴 수 있게 한다.
export function removeItem(items, id) {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0 || items[i].kind === 'main') return { items, removed: null, at: -1 };
  return { items: items.filter((x) => x.id !== id), removed: items[i], at: i };
}

export function restoreItem(items, removed, at) {
  const out = items.slice();
  out.splice(Math.min(Math.max(0, at), out.length), 0, removed);
  return order(out);
}

// 같은 종류 안에서 순서 옮기기 (beforeId 앞/뒤). 다른 종류 줄 위에 놓으면 무시
export function moveItem(items, id, beforeId, after) {
  const it = items.find((x) => x.id === id), tg = items.find((x) => x.id === beforeId);
  if (!it || !tg || it.id === tg.id || it.kind !== tg.kind || it.kind === 'main') return items;
  const rest = items.filter((x) => x.id !== id);
  const at = rest.findIndex((x) => x.id === beforeId);
  rest.splice(at + (after ? 1 : 0), 0, it);
  return order(rest);
}

// 선택한 인사말을 대표로: 지금 대표는 그 자리로 내려가 추가 인사말이 된다 (그룹 전용은 대표가 될 수 없음)
export function makeMain(items, id) {
  const it = items.find((x) => x.id === id), cur = items.find((x) => x.kind === 'main');
  if (!it || it.kind === 'main' || it.kind === 'group' || !cur) return items;
  return order(items.map((x) => x.id === it.id ? { ...x, kind: 'main' } : x.id === cur.id ? { ...x, kind: 'alt' } : x));
}

export function setKind(items, id, kind) {
  const it = items.find((x) => x.id === id);
  if (!it || it.kind === 'main' || it.kind === kind || !['alt', 'group'].includes(kind)) return items;
  return order(items.map((x) => x.id === id ? { ...x, kind } : x));
}

export function summary(text, max = 44) {
  const line = String(text ?? '').split('\n').map((s) => s.trim()).find(Boolean) ?? '';
  const flat = line.replace(/\s+/g, ' ');
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat || '(비어 있음)';
}

export function filterItems(items, q) {
  const s = String(q ?? '').trim().toLowerCase();
  return s ? items.filter((x) => x.text.toLowerCase().includes(s)) : items;
}

// 이전/다음 (끝에서 멈춤)
export function neighbor(items, id, dir) {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return null;
  return items[Math.min(items.length - 1, Math.max(0, i + dir))]?.id ?? null;
}
