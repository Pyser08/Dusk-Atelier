// 11-23 장기기억: 채팅 도중 페르소나가 바뀌면(순수) 그때까지 {{user}} 앞으로 쌓인 기록을 옛 페르소나 이름의 인물로 떼어 낸다.
// 사건 기록·감정·관계 종류·흔적·옷차림·성인 칸(actor:user)·나 위키 문서가 옛 페르소나로 가고, 새 페르소나는 {{user}}로 새로 시작한다.
// 옛 페르소나는 folder.personas에 남아 관계도 가운데서 나와 함께 돌고, 다른 인물·지금의 나와의 관계도 이어서 보인다.
import { USER, relinkNames } from "./memoryuser.js";
import { sameUserName } from "./useralias.js";
import { USER_NSFW_ID } from "./usernsfw.js";
import { createWikiDocument, normalizeWikiScope } from "./pot/wiki-schema.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const isUserName = (n) => /^\{\{user\}\}$/i.test(String(n ?? "").trim());

export const personaNames = (folder) => (folder?.personas ?? []).map((p) => p.name).filter(Boolean);
export const isPastPersona = (folder, name) => personaNames(folder).some((n) => key(n) === key(name));

// notePersona가 폴더를 고칠지(읽기만)
export function personaNeedsNote(folder, name) {
  const n = String(name ?? "").trim().slice(0, 80);
  return !!folder && !!n && !isUserName(n) && key(folder.persona?.name) !== key(n);
}
// 지금 페르소나 이름(name)을 본다. 처음이면 기억만 하고, 바뀌었으면 옛 페르소나로 떼어 낸다.
// 반환: { changed, from, to } — changed면 from(옛 이름)으로 기록을 옮겼다
export function notePersona(folder, name, { turn = null, now = new Date().toISOString() } = {}) {
  const n = String(name ?? "").trim().slice(0, 80);
  if (!folder || !n || isUserName(n)) return { changed: false };
  const prev = String(folder.persona?.name ?? "").trim();
  if (!prev) { folder.persona = { name: n, since: turn }; return { changed: false }; }
  if (key(prev) === key(n)) return { changed: false };
  if (sameUserName(prev, n)) { folder.persona = { ...folder.persona, name: n }; return { changed: false }; }   // 신고 #12: Jade ↔ 제이드는 같은 페르소나
  detachPersona(folder, prev, { turn, now });
  // 예전에 떼어 둔 페르소나로 돌아왔으면 목록에서 빼고 그 인물의 기록을 다시 나로 합친다
  if (isPastPersona(folder, n)) {
    relinkNames(folder, [n], USER);
    const pk = Object.keys(folder.people ?? {}).find((k) => key(folder.people[k]?.name) === key(n));
    if (pk) { const p = folder.people[pk], u = folder.people[USER] ??= { name: USER, aliases: [], pinned: false, records: [] }; u.records = [...(u.records ?? []), ...(p.records ?? [])].sort((a, b) => (a.at ?? -1) - (b.at ?? -1)); delete folder.people[pk]; }
    folder.personas = (folder.personas ?? []).filter((p) => key(p.name) !== key(n));
  }
  folder.persona = { name: n, since: turn };
  return { changed: true, from: prev, to: n };
}

export function detachPersona(folder, oldName, { turn = null, now = new Date().toISOString() } = {}) {
  const name = String(oldName ?? "").trim(); if (!folder || !name || isUserName(name)) return false;
  const nk = key(name);
  // 1) 사건 기록: {{user}} 인물 → 옛 페르소나 인물(같은 이름이 있으면 합침)
  folder.people ??= {};
  const u = folder.people[USER];
  if (u) {
    const pk = Object.keys(folder.people).find((k) => k !== USER && key(folder.people[k]?.name) === nk) ?? name;
    const o = folder.people[pk];
    folder.people[pk] = { ...(o ?? {}), ...u, name, persona: true, aliases: [...new Set([...(o?.aliases ?? []), ...(u.aliases ?? [])])].filter((a) => !isUserName(a) && key(a) !== nk),
      records: [...(o?.records ?? []), ...(u.records ?? [])].sort((a, b) => (a.at ?? -1) - (b.at ?? -1)) };
    folder.people[USER] = { name: USER, aliases: [], pinned: false, records: [] };
  }
  // 2) 감정·관계·관계 종류·흔적·옷차림 등 이름으로 이어진 기록
  relinkNames(folder, [USER], name);
  // 3) 나 위키 문서 → 옛 페르소나의 보통 인물 문서({{user}} 별칭을 떼어 다음 기록이 옛 문서로 가지 않게). 없으면 만든다(성인 칸을 옮길 자리)
  let doc = null;
  if (folder.wiki?.documents) {
    const docs = Object.values(folder.wiki.documents).filter((d) => d?.type === "Character");
    doc = docs.find((d) => (d.aliases ?? []).some(isUserName) || isUserName(d.title)) ?? docs.find((d) => key(d.title) === nk) ?? null;
    if (doc) { if (isUserName(doc.title)) doc.title = name; doc.aliases = (doc.aliases ?? []).filter((a) => !isUserName(a)); }
    else if (folder.nsfw?.[USER_NSFW_ID] || folder.life?.p?.[USER_NSFW_ID]) {
      try { folder.wiki = createWikiDocument(normalizeWikiScope(folder.wiki), { type: "Character", title: name, aliases: [], tags: [], links: [], sections: [], metrics: [] }, { now }); doc = Object.values(folder.wiki.documents).find((d) => d?.type === "Character" && d.title === name) ?? null; } catch { doc = null; }
    }
  }
  // 4) 성인 칸(actor:user)·몸 계산 → 옛 페르소나 문서 id
  if (doc) {
    if (folder.nsfw?.[USER_NSFW_ID]) { folder.nsfw[doc.id] ??= folder.nsfw[USER_NSFW_ID]; delete folder.nsfw[USER_NSFW_ID]; }
    if (folder.life?.p?.[USER_NSFW_ID]) { folder.life.p[doc.id] ??= folder.life.p[USER_NSFW_ID]; delete folder.life.p[USER_NSFW_ID]; }
    if (folder.gender?.[USER_NSFW_ID]) { folder.gender[doc.id] ??= folder.gender[USER_NSFW_ID]; delete folder.gender[USER_NSFW_ID]; }
  }
  // 5) 옛 이름을 유저 별칭에서 빼고(다시 나로 모이지 않게) 옛 페르소나 목록에 남긴다
  folder.userAliases = (folder.userAliases ?? []).filter((a) => key(a) !== nk);
  folder.personas = [...(folder.personas ?? []).filter((p) => key(p.name) !== nk), { name, until: turn, at: now, ...(doc ? { docId: doc.id } : {}) }].slice(-8);
  return true;
}
