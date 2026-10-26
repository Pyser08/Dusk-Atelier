// 리스바드 BardWiki 읽기 어댑터 + 스냅샷 캐시(dusk.mem.v2.ext.<folderId>) + 등급 온디맨드.
import { adaptDocuments, gradeMessages, parseGrades, eventBullets } from "../engine/bardwikiadapt.js";
import { hashText } from "../engine/chattext.js";
import { EXT_PREFIX, folderIdOf } from "./memorystore.js";
import { runAI } from "../engine/runai.js";

export function createBardWikiBackend(api, { store, log = (...a) => console.log("[Dusk 기억]", ...a) } = {}) {
  const parse = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw ?? null; } catch { return null; } };
  const key = (chaId, chatId) => EXT_PREFIX + folderIdOf(chaId, chatId);
  const load = async (chaId, chatId) => parse(await api.pluginStorage.getItem(key(chaId, chatId)));

  // 현재 열린 채팅이면 실시간 조회, 아니면 스냅샷. contentHash 합이 같으면 재사용.
  async function loadFolder(chaId, chatId, { live = false, messages = [], showHidden = false } = {}) {
    const snap = await load(chaId, chatId);
    if (!live) return snap ? { ...snap, snapshot: true } : null;
    const docs = await api.bardWiki.getDocuments({});
    if (!Array.isArray(docs)) throw new Error("BardWiki가 문서를 돌려주지 않았어요.");
    const hash = hashText(docs.map((d) => d.contentHash ?? d.id + d.updated).join("|"), 100000);
    if (snap && snap.hash === hash && snap.showHidden === showHidden) return { ...snap, snapshot: false, reused: true };
    const folder = { ...adaptDocuments(docs, messages, { showHidden }), v: 2, chaId: String(chaId), chatId: String(chatId), source: "bardwiki", hash, showHidden, at_ms: Date.now(), grades: {}, docs: docs.filter((d) => d.type === "event").map((d) => ({ id: d.id, bullets: eventBullets(d) })) };
    await api.pluginStorage.setItem(key(chaId, chatId), JSON.stringify(folder));
    return { ...folder, snapshot: false };
  }
  // 등급 매기기(AI). 결과는 ext 캐시에만 저장하고 문서가 바뀌어 hash가 달라지면 무효화된다.
  async function gradeOnDemand(chaId, chatId, model, signal) {
    const snap = await load(chaId, chatId); if (!snap) throw new Error("먼저 이 채팅을 열고 새로고침해 주세요.");
    const items = Object.values(snap.people).flatMap((p) => p.records).filter((r) => !r.g && !snap.grades?.[r.id]);
    if (!items.length) return snap;
    const grades = { ...(snap.grades ?? {}) };
    for (let i = 0; i < items.length; i += 30) Object.assign(grades, parseGrades(await runAI(api, gradeMessages(items.slice(i, i + 30)), model, signal)));
    const next = { ...snap, grades }; await api.pluginStorage.setItem(key(chaId, chatId), JSON.stringify(next)); return next;
  }
  const withGrades = (folder) => { for (const p of Object.values(folder?.people ?? {})) for (const r of p.records) if (!r.g && folder.grades?.[r.id]) r.g = folder.grades[r.id].g; return folder; };
  return { id: "bardwiki", loadFolder, gradeOnDemand, withGrades, isLive: (cur, target) => String(cur?.chaId) === String(target.chaId) && String(cur?.chatId) === String(target.chatId), available: async () => typeof api?.bardWiki?.getDocuments === "function" };
}
