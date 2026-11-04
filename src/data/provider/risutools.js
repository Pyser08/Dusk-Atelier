// 리스 데이터 도구 실행 (v1.9.3). 읽기는 자유, 쓰기는 안전장치 3단: ① 설정에서 따로 켬 ② 매번 확인 ③ 바꾸기 전 백업(실패하면 중단).
import { isWriteTool, describeWrite } from "../../engine/provider/tools.js";
const cap = (s, n = 4000) => { const t = String(s ?? ""); return t.length > n ? `${t.slice(0, n)}…(잘림)` : t; };
const FIELDS = { name: "name", desc: "desc", personality: "personality", scenario: "scenario", firstMessage: "firstMessage", systemPrompt: "systemPrompt", creatorNotes: "creatorNotes" };
export const MAX_WRITES_PER_REQUEST = 3;
// store(되돌리기 기록)와 backupSnapshot은 호출하는 쪽(main.js)에서 넣는다 — 테스트에서 바꿔 끼우기 쉽게
export function createRisuTools(api, { confirm, memory = null, log = () => {}, store, backupSnapshot = (k, c) => c, currentIdx } = {}) {
  if (!store) throw new Error("되돌리기 기록 저장소(store)가 필요해요");
  const st = store;
  async function cur() {
    const ci = currentIdx ? await currentIdx() : await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
    if (!(ci >= 0)) throw new Error("열린 캐릭터가 없어요");
    return { ci, ti, ch: await api.getCharacterFromIndex(ci) };
  }
  const read = {
    async risu_get_character_info() { const { ch } = await cur(); return JSON.stringify({ name: ch.name, desc: cap(ch.desc), personality: cap(ch.personality), scenario: cap(ch.scenario), firstMessage: cap(ch.firstMessage), systemPrompt: cap(ch.systemPrompt), creatorNotes: cap(ch.creatorNotes ?? ch.additionalText) }); },
    async risu_get_chat_history({ limit } = {}) { const { ch, ti } = await cur(); const n = Math.max(1, Math.min(30, Number(limit) || 10)); return JSON.stringify((ch.chats?.[ti]?.message ?? []).slice(-n).map((m) => ({ role: m.role, text: cap(m.data, 1500) }))); },
    async risu_list_lorebooks() { const { ch } = await cur(); return JSON.stringify((ch.globalLore ?? []).map((e, i) => ({ index: i, name: e.comment || e.key || "", key: cap(e.key, 80) }))); },
    async risu_get_lorebook({ index } = {}) { const { ch } = await cur(); const e = (ch.globalLore ?? [])[Number(index)]; if (!e) throw new Error("그 번호의 로어북 항목이 없어요"); return JSON.stringify({ name: e.comment, key: e.key, content: cap(e.content) }); },
    async risu_list_personas() { const db = await api.getDatabase(["personas"]); return JSON.stringify((db?.personas ?? []).map((p, i) => ({ index: i, name: p.name, note: cap(p.personaPrompt ?? p.note, 300) }))); },
    async risu_get_chat_note() { const { ch, ti } = await cur(); return cap(ch.chats?.[ti]?.note ?? ""); },
    async memory_search({ query } = {}) { if (!memory?.search) throw new Error("기억 검색을 쓸 수 없어요"); return cap(JSON.stringify(await memory.search(String(query ?? "")))); }
  };
  // 쓰기: 확인 → 백업 → 반영
  async function write(name, args, counter) {
    if (counter.n >= MAX_WRITES_PER_REQUEST) throw new Error(`한 번의 요청에서 고칠 수 있는 횟수(${MAX_WRITES_PER_REQUEST}회)를 넘었어요`);
    const { ci, ti, ch } = await cur();
    let apply;
    if (name === "risu_set_character_info") { const f = FIELDS[args.field]; if (!f) throw new Error("바꿀 수 없는 칸이에요"); apply = (c) => ({ ...c, [f]: String(args.value ?? "") }); }
    else if (name === "risu_set_lorebook_entry") { const i = Number(args.index); if (!(ch.globalLore ?? [])[i]) throw new Error("그 번호의 로어북 항목이 없어요"); apply = (c) => ({ ...c, globalLore: c.globalLore.map((e, k) => (k === i ? { ...e, content: String(args.content ?? "") } : e)) }); }
    else if (name === "risu_set_chat_note") { if (!ch.chats?.[ti]) throw new Error("열린 채팅이 없어요"); apply = (c) => ({ ...c, chats: c.chats.map((x, k) => (k === ti ? { ...x, note: String(args.value ?? "") } : x)) }); }
    else throw new Error("모르는 쓰기 도구예요");
    const ok = typeof confirm === "function" ? await confirm(`AI가 이렇게 고치려고 해요`, describeWrite(name, args)) : false;
    if (!ok) { log("쓰기 거절", name); return "사용자가 거절했어요. 고치지 않았어요."; }
    try { await st.addBackup({ kind: "character", target: ch.chaId, name: ch.name, snapshot: backupSnapshot("character", ch), note: "AI 쓰기 도구 실행 전", summary: describeWrite(name, args).slice(0, 120) }); }
    catch { throw new Error("바꾸기 전 백업을 만들지 못해서 고치지 않았어요"); }
    const fresh = await api.getCharacterFromIndex(ci);
    await api.setCharacterToIndex(ci, apply(fresh)); counter.n++; log("쓰기 완료", name);
    return "고쳤어요. 이전 상태는 '기록 · 되돌리기'에 남아 있어요.";
  }
  return {
    async run(name, args, counter = { n: 0 }) {
      try {
        if (isWriteTool(name)) return await write(name, args ?? {}, counter);
        const f = read[name]; if (!f) return `알 수 없는 도구예요: ${name}`;
        return await f(args ?? {});
      } catch (e) { return `실패: ${String(e?.message ?? e).slice(0, 200)}`; }
    }
  };
}
