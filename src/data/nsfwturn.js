// addon-rebuild: 매 턴 기록기가 보고한 성인 프로필 변화(taste·sexval)를 이 채팅 폴더(folder.nsfw)에 반영한다.
import { applyNsfwReports } from "../engine/nsfwprofile.js";
import { applyDrive, emptyDrive } from "../engine/scenedrive.js";
import { sameKoreanPerson } from "../engine/namekr.js";
import { logEvent } from "./memlog.js";

const key = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const empty = () => ({ sexual: {}, axes: {}, pref: null, positions: [], seduction: null, humor: null, by: "ai", at: new Date().toISOString(), log: [] });

// 순수: 폴더(f) 안에서 반영. 반환 [{name, changed:[…]}]
export function applyNsfwQueue(f, reports) {
  const docs = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const byDoc = new Map();
  for (const r of reports ?? []) {
    const doc = docs.find((d) => [d.title, ...(d.aliases ?? [])].some((n) => key(n) === key(r.name))) ?? docs.find((d) => sameKoreanPerson(d.title, r.name));
    if (!doc) continue;
    if (!byDoc.has(doc.id)) byDoc.set(doc.id, { doc, list: [] });
    byDoc.get(doc.id).list.push(r);
  }
  const out = [];
  for (const { doc, list } of byDoc.values()) {
    f.nsfw ??= {};
    const { nsfw, changed } = applyNsfwReports(f.nsfw[doc.id] ?? empty(), list);
    if (changed.length) { f.nsfw[doc.id] = nsfw; out.push({ name: doc.title, changed }); }
  }
  return out;
}

// 이름 → 이 채팅 성인 프로필(없으면 null)
export function nsfwByName(f, name) {
  const docs = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const d = docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => key(n) === key(name))) ?? docs.find((x) => sameKoreanPerson(x.title, name));
  return d ? f?.nsfw?.[d.id] ?? null : null;
}
// 장면 판단: 이번 턴 관찰 묶음들을 차례로 반영
export function applyDriveQueue(f, list) {
  const changed = [];
  for (const obs of list ?? []) { const r = applyDrive(f.drive ?? emptyDrive(), obs, { spont: (n) => nsfwByName(f, n)?.sexual?.sexualSpontaneity ?? null }); f.drive = r.drive; changed.push(...r.changed); }
  return changed;
}

export async function applyNsfwTurn(memory, log = () => {}) {
  const q = memory?.flow?.takeNsfw?.() ?? [], dq = memory?.flow?.takeDrive?.() ?? [];
  if (!q.length && !dq.length) return 0;
  const cur = await memory.switches?.currentChat?.().catch?.(() => null);
  if (!cur) return 0;
  let out = [], drive = [];
  await memory.store.updateFolder(cur.chaId, cur.chatId, (f) => { if (q.length) out = applyNsfwQueue(f, q); if (dq.length) drive = applyDriveQueue(f, dq); });
  for (const o of out) logEvent({ area: "성인 프로필", title: `${o.name} · ${o.changed.join(" · ")}` });
  if (drive.length) logEvent({ area: "장면 판단", title: drive.join(" · ").slice(0, 160), detail: drive });
  else if (dq.length) logEvent({ kind: "skip", area: "장면 판단", title: "이번 응답엔 새 계획·반응이 없었어요" });
  if (out.length) log(`성인 프로필 변화 반영: ${out.map((o) => o.name).join(", ")}`);
  return out.length + drive.length;
}
