// 11-23 장기기억 연동 창구(장기기억 애드온이 ext svc "memoryApi"로 내놓음). 다른 애드온은 장기기억 내부 파일을 import하지 말고 이것만 쓴다.
//   const M = ctx.ext.get("svc", "memoryApi"); if (!M || M.version < 1) → 장기기억이 없거나 오래됨
// 안쪽(기록기·저장 구조)을 고쳐도 여기 이름·모양은 유지한다. 바꿀 땐 version을 올리고 옛 이름도 한동안 남긴다.
import { characterDocs, npcDocs } from "../engine/usernsfw.js";
import { personaNames } from "../engine/personas.js";
import { buildRelMap } from "../engine/relmap.js";

const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const docOf = (f, name) => characterDocs(f).find((d) => [d.title, ...(d.aliases ?? [])].some((n) => key(n) === key(name))) ?? null;

// 폴더(f)만 보고 답하는 순수 도우미 — 테스트·다른 애드온이 같이 쓴다
export const memoryViews = {
  // 인물 목록: [{ name, aliases, docId, records }]
  people: (f) => {
    const out = npcDocs(f).map((d) => ({ name: d.title, aliases: [...(d.aliases ?? [])], docId: d.id, records: 0 }));
    for (const p of Object.values(f?.people ?? {})) {
      if (!p?.name || /^\{\{user\}\}$/i.test(p.name)) continue;
      const o = out.find((x) => [x.name, ...x.aliases].some((n) => key(n) === key(p.name)));
      if (o) o.records = (p.records ?? []).length; else out.push({ name: p.name, aliases: [...(p.aliases ?? [])], docId: null, records: (p.records ?? []).length });
    }
    return out;
  },
  // 페르소나: 지금 이름과 채팅 도중 바꿔서 떼어 둔 옛 페르소나
  personas: (f) => ({ current: f?.persona?.name ?? "", past: personaNames(f) }),
  // 관계도 데이터(노드·선) — 관계도 화면과 같은 계산
  relations: (f, opt) => buildRelMap(f, opt),
  // 성인 기록(관계 횟수·체내 정액·성욕 등)과 성인 프로필. 없으면 null
  adult: (f, name) => { const d = docOf(f, name); return d ? { life: f?.life?.p?.[d.id] ?? null, profile: f?.nsfw?.[d.id] ?? null } : null; },
};

export function createMemoryApi(memory) {
  const cur = () => memory.switches?.currentChat?.().catch?.(() => null) ?? Promise.resolve(null);
  const folder = async () => { const c = await cur(); return c ? memory.store.getFolder(c.chaId, c.chatId).catch(() => null) : null; };
  const withFolder = (fn) => async (...a) => { const f = await folder(); return f ? fn(f, ...a) : null; };
  return Object.freeze({
    version: 1,
    currentChat: cur,                       // { chaId, chatId } 또는 null
    folder,                                 // 지금 채팅 장기기억 폴더(읽기용 — 고치려면 update)
    update: async (fn) => { const c = await cur(); if (!c) return false; await memory.store.updateFolder(c.chaId, c.chatId, fn); return true; },
    onTurn: (fn) => memory.flow?.onTurn?.(fn) ?? (() => {}),   // 응답 기록이 끝날 때마다 fn({ rp, people, key, source }) · 반환: 떼기
    people: withFolder(memoryViews.people),
    personas: withFolder(memoryViews.personas),
    relations: withFolder(memoryViews.relations),
    adult: withFolder(memoryViews.adult),
    views: memoryViews,
  });
}
