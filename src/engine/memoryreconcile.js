// 앵커 정합성. 기록/상황은 {at, mid?, h}를 가진다. 순수 함수 — 폴더를 직접 수정한다.
// v1.6.5: 관계 변화(rels)·열린 항목(open)도 출처(src, closedBy)로 대조한다.
import { messageIdentity, messageIdOf, legacyMessageHash } from "./chattext.js";
import { revertExp } from "./memoryinner.js";

export function indexMessages(messages) {
  const byMid = new Map(), byHash = new Map(), byLegacyHash = new Map(), dupMid = new Set();
  const list = (messages ?? []).map((m, i) => {
    const mid = messageIdOf(m), h = messageIdentity(m), legacyH = legacyMessageHash(m);
    if (mid) { if (byMid.has(mid)) dupMid.add(mid); else byMid.set(mid, i); }
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(i);
    if (!byLegacyHash.has(legacyH)) byLegacyHash.set(legacyH, []);
    byLegacyHash.get(legacyH).push(i);
    return { mid, h, legacyH };
  });
  for (const d of dupMid) byMid.delete(d);
  return { list, byMid, byHash, byLegacyHash };
}

// 예전 저장 데이터는 200자 해시를 갖고 있을 수 있다. 일치하는 경우에만 새 식별자로 바꾼다.
function fix(item, idx) {
  const migrateTo = (i) => {
    item.at = i;
    item.h = idx.list[i].h;
    if (!item.mid && idx.list[i].mid) item.mid = idx.list[i].mid;
    item.orphan = false;
  };
  if (item.mid && idx.byMid.has(item.mid)) {
    const i = idx.byMid.get(item.mid), current = idx.list[i];
    if (current.h === item.h || current.legacyH === item.h) { migrateTo(i); return; }
    // 같은 ID라도 본문 전체가 달라졌다면 새 메시지로 취급한다(리롤 안전성).
  }
  const at = idx.list[item.at];
  if (at && (at.h === item.h || at.legacyH === item.h) && (!item.mid || !at.mid || item.mid === at.mid)) {
    migrateTo(item.at); return;
  }
  const exact = idx.byHash.get(item.h) ?? [];
  if (exact.length) {
    const i = exact.reduce((best, c) => Math.abs(c - (item.at ?? -1)) < Math.abs(best - (item.at ?? -1)) ? c : best, exact[0]);
    migrateTo(i); return;
  }
  // 예전 200자 해시가 여러 메시지와 일치하면 어느 메시지인지 알 수 없다.
  // 잘못 연결하지 않고 미처리로 두어, 필요한 경우 다시 분석하게 한다.
  const legacy = idx.byLegacyHash.get(item.h) ?? [];
  if (legacy.length === 1) { migrateTo(legacy[0]); return; }
  item.orphan = true;
}

// 출처 {chatId(메시지 id), hash, at}. 앵커 {at, mid, h}에서 만든다. 해시가 없으면 출처 없음(undefined).
export const srcOf = (anchor) => anchor?.h ? { chatId: anchor.mid ?? null, hash: anchor.h, at: anchor.at ?? null } : undefined;
const hasSrc = (s) => !!s?.hash;
// 출처 응답이 지금 채팅에 살아 있는가. 위치가 바뀌었으면 src.at도 고친다.
function srcAlive(src, idx) {
  const t = { mid: src.chatId ?? null, h: src.hash, at: src.at ?? -1 };
  fix(t, idx);
  if (!t.orphan) { src.at = t.at; src.hash = t.h; if (t.mid) src.chatId = t.mid; }
  return !t.orphan;
}

// 고아 정리(v1.6.5): 먼저 최신 대조를 돌려 판정(레거시 at_ms 단서 포함)을 끝낸 뒤,
// 관계 변화·떡밥을 지우고 마지막에 기록·장면을 지운다. 순서가 바뀌면 같은 at_ms로 묶인 옛 항목을 판정할 수 없다.
// 반환: 지운 개수 {records, scenes, rels, open, reopened}
export function cleanOrphans(folder, messages) {
  if (messages?.length) reconcile(folder, messages);
  const out = { records: 0, scenes: 0, rels: 0, open: 0, reopened: 0 };
  for (const [k, p] of Object.entries(folder.rels ?? {})) {
    const keep = (p.items ?? []).filter((x) => !x.orphan);
    out.rels += (p.items ?? []).length - keep.length;
    if (keep.length) p.items = keep; else delete folder.rels[k];
  }
  const live = (folder.open ?? []).filter((x) => !x.orphan);
  out.open = (folder.open ?? []).length - live.length;
  folder.open = live;
  for (const x of folder.open) if (x.closedOrphan) { x.closed = false; delete x.closedOrphan; delete x.closedBy; delete x.closedAt; delete x.closed_ms; out.reopened++; }
  for (const p of Object.values(folder.people ?? {})) { const keep = (p.records ?? []).filter((r) => !r.orphan); out.records += (p.records ?? []).length - keep.length; p.records = keep; }
  const scenes = (folder.scenes ?? []).filter((s) => !s.orphan);
  out.scenes = (folder.scenes ?? []).length - scenes.length; folder.scenes = scenes;
  return out;
}

// legacy(앵커 없는) 기록·장면은 건드리지 않는다. 반환: 고아로 바뀐 기록·장면 수.
// rels/open 항목은 src가 있으면 그 응답으로, 없으면(옛 데이터) 같은 at_ms의 기록·장면이 전부 고아인지로 판정한다.
export function reconcile(folder, messages) {
  const idx = indexMessages(messages);
  let orphans = 0;
  const items = [...Object.values(folder.people ?? {}).flatMap((p) => p.records ?? []), ...(folder.scenes ?? [])];
  const byMs = new Map();
  for (const it of items) {
    if (it.legacy || it.carried || !it.h) continue;
    fix(it, idx);
    if (it.orphan) orphans++;
    if (it.at_ms != null) { const g = byMs.get(it.at_ms) ?? { n: 0, o: 0 }; g.n++; if (it.orphan) g.o++; byMs.set(it.at_ms, g); }
  }
  // v1.7.1: 반복 횟수(m)는 지금 채팅에 살아 있는 출처 응답 수로 다시 센다(리롤·삭제로 사라진 응답은 뺀다).
  for (const it of items) if (Array.isArray(it.hs) && it.hs.length) {
    it.hs = it.hs.filter((s) => srcAlive(s, idx));
    it.m = Math.max(1, (it.m0 ?? 0) + it.hs.length);
  }
  // v1.7.1: 사라진 응답에서 생긴 감정 변화는 되돌린다(최근 것부터, 지금 값이 그 변화의 결과일 때만).
  for (const pair of Object.values(folder.emo ?? {})) {
    for (let i = (pair.log ?? []).length - 1; i >= 0; i--) {
      const e = pair.log[i];
      if (e.orphan || !hasSrc(e.src) || srcAlive(e.src, idx)) continue;
      e.orphan = true;
      for (const [tag, v] of Object.entries(e.t ?? {})) if (pair.tags[tag] === v && !pair.lock?.[tag]) { if (e.from?.[tag] == null) delete pair.tags[tag]; else pair.tags[tag] = e.from[tag]; }
    }
  }
  revertExp(folder, (s) => srcAlive(s, idx));  // 사라진 응답에서 생긴 기대 불일치는 직전 값으로
  const dead = (src, ms) => {
    if (hasSrc(src)) return !srcAlive(src, idx);
    const g = ms != null ? byMs.get(ms) : null;
    return !!g && g.o === g.n;
  };
  for (const p of Object.values(folder.rels ?? {})) for (const x of p.items ?? []) x.orphan = dead(x.src, x.at_ms);
  for (const x of folder.open ?? []) {
    x.orphan = dead(x.src, x.at_ms);
    // 버린 분석이 닫은 떡밥은 다시 연다(되돌릴 수 있게 closed는 두고 표시만 한다).
    if (x.closed && dead(x.closedBy, x.closed_ms)) x.closedOrphan = true; else delete x.closedOrphan;
  }
  if (messages?.length) {  // 분석 완료·실패 목록도 새 식별자로 옮긴다. 모호한 옛 해시는 안전のため 버려 재분석한다.
    const present = new Set(idx.list.map((x) => x.h));
    const normalizeHashes = (values) => [...new Set((values ?? []).flatMap((h) => {
      if (present.has(h)) return [h];
      const legacy = idx.byLegacyHash.get(h) ?? [];
      return legacy.length === 1 ? [idx.list[legacy[0]].h] : [];
    }))];
    if (Array.isArray(folder.done)) folder.done = normalizeHashes(folder.done);
    if (Array.isArray(folder.failedBackfill)) folder.failedBackfill = normalizeHashes(folder.failedBackfill);
  }
  if (folder.cursor?.h) {
    const c = { ...folder.cursor }; fix(c, idx);
    if (!c.orphan) folder.cursor = { ...folder.cursor, at: c.at, mid: c.mid ?? folder.cursor.mid ?? null, h: c.h };
    else {  // 마지막 분석 응답이 사라졌으면(리롤 등) 아직 살아 있는 가장 뒤 기록·장면의 응답으로 옮긴다. 없으면 비운다.
      const best = items.filter((it) => !it.orphan && it.h && !it.legacy && !it.carried).reduce((b, it) => (!b || (it.at ?? -1) >= (b.at ?? -1) ? it : b), null);
      folder.cursor = best ? { at: best.at, mid: best.mid ?? null, h: best.h } : null;
    }
  }
  return orphans;
}
