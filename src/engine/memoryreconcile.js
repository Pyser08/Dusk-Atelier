// 앵커 정합성. 기록/상황은 {at, mid?, h}를 가진다. 순수 함수 — 폴더를 직접 수정한다.
import { extractMessageText, hashText } from "./chattext.js";

export function indexMessages(messages) {
  const byMid = new Map(), byHash = new Map(), dupMid = new Set();
  const list = (messages ?? []).map((m, i) => {
    const mid = typeof m?.chatId === "string" && m.chatId && !m.chatId.startsWith("inherited:") ? m.chatId : null;
    const h = hashText(extractMessageText(m));
    if (mid) { if (byMid.has(mid)) dupMid.add(mid); else byMid.set(mid, i); }
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(i);
    return { mid, h };
  });
  for (const d of dupMid) byMid.delete(d);
  return { list, byMid, byHash };
}

function fix(item, idx) {
  if (item.mid && idx.byMid.has(item.mid)) { item.at = idx.byMid.get(item.mid); item.orphan = false; return; }
  if (idx.list[item.at]?.h === item.h && (!item.mid || !idx.list[item.at].mid)) { item.orphan = false; return; }
  const cand = idx.byHash.get(item.h) ?? [];
  if (cand.length) {
    item.at = cand.reduce((best, c) => Math.abs(c - item.at) < Math.abs(best - item.at) ? c : best, cand[0]);
    item.orphan = false; return;
  }
  item.orphan = true;
}

// legacy(앵커 없는) 항목은 건드리지 않는다. 반환: 고아로 바뀐 수.
export function reconcile(folder, messages) {
  const idx = indexMessages(messages);
  let orphans = 0;
  const items = [...Object.values(folder.people ?? {}).flatMap((p) => p.records ?? []), ...(folder.scenes ?? [])];
  for (const it of items) {
    if (it.legacy || it.carried || !it.h) continue;
    fix(it, idx);
    if (it.orphan) orphans++;
  }
  if (folder.cursor?.h) {
    const c = { ...folder.cursor }; fix(c, idx);
    folder.cursor = c.orphan ? null : { ...folder.cursor, at: c.at };
  }
  return orphans;
}
