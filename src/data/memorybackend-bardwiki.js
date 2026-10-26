// 리스바드 BardWiki 읽기 어댑터 + 스냅샷 캐시(dusk.mem.v2.ext.<folderId>) + 등급 온디맨드.
import { adaptDocuments, gradeMessages, parseGrades, eventBullets, wikiScore } from "../engine/bardwikiadapt.js";
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
    const folder = { ...adaptDocuments(docs, messages, { showHidden }), v: 2, chaId: String(chaId), chatId: String(chatId), source: "bardwiki", hash, showHidden, at_ms: Date.now(), grades: {}, docs: docs.filter((d) => d.type === "event" && !["superseded", "retracted"].includes(d.status)).map((d) => ({ id: d.id, bullets: eventBullets(d), hash: d.contentHash ?? "", grade: wikiScore(d), gradeBy: d.gradeBy ?? null })) };
    await api.pluginStorage.setItem(key(chaId, chatId), JSON.stringify(folder));
    return { ...folder, snapshot: false };
  }
  // 지금 열린 채팅의 사건 문서를 새로 읽어 {id: {hash, grade, gradeBy}}로 돌려준다(스냅샷의 해시는 저장 직후 낡을 수 있음). 실패하면 null.
  async function freshEvents() {
    try { const d = await api.bardWiki.getDocuments({ types: ["event"] }); return Array.isArray(d) ? new Map(d.map((x) => [x.id, { hash: x.contentHash ?? "", grade: wikiScore(x), gradeBy: x.gradeBy ?? null }])) : null; } catch { return null; }
  }
  // 등급 매기기(AI): 위키에 등급이 없는 사건 문서만 문서 단위로 채점한다.
  // risuai.bardWiki.setGrade가 있으면 위키에 저장(gradeBy:"ai"), 없거나 거부/실패하면 ext 캐시에만 저장한다.
  // 사용자가 지정한 위키 등급은 읽기만 하고 덮어쓰지 않는다.
  async function gradeOnDemand(chaId, chatId, model, signal, { regrade = false } = {}) {
    const snap = await load(chaId, chatId); if (!snap) throw new Error("먼저 이 채팅을 열고 새로고침해 주세요.");
    const fresh = await freshEvents();  // 있으면 최신 등급/해시를 기준으로 삼음
    const docsNow = (snap.docs ?? []).map((d) => fresh?.has(d.id) ? { ...d, ...fresh.get(d.id) } : d);
    const grades = { ...(snap.grades ?? {}) };
    if (regrade) for (const d of docsNow) if (d.gradeBy !== "user") delete grades[d.id];  // 다시 매기기: 사용자 지정 등급만 보존
    const items = docsNow.filter((d) => (regrade ? d.gradeBy !== "user" : d.grade == null && !grades[d.id]) && d.bullets?.length).map((d) => ({ id: d.id, act: d.bullets.join(" / ").slice(0, 600), hash: d.hash }));
    if (!items.length) return { ...snap, lastGrade: { total: 0, wrote: 0, cacheOnly: 0, reason: "" } };
    const canWrite = typeof api?.bardWiki?.setGrade === "function" && !!fresh; let writable = canWrite, wrote = 0, denied = false, failed = "";  // fresh가 있어야(=지금 열린 채팅 문서) 위키에 씀
    for (let i = 0; i < items.length; i += 30) {
      const part = items.slice(i, i + 30), got = parseGrades(await runAI(api, gradeMessages(part), model, signal));
      for (const it of part) {
        const r = got[it.id]; if (!r) continue;
        grades[it.id] = r;
        if (writable && fresh?.has(it.id) && it.hash) {
          try { const res = await api.bardWiki.setGrade({ documentId: it.id, grade: r.score, gradeBy: "ai", expectedContentHash: it.hash }); if (res == null) { writable = false; denied = true; } else wrote++; }  // null = 권한 거부 → 더 묻지 않음
          catch (e) { failed = String(e?.message ?? e); log("위키 등급 저장 실패", it.id, failed); }  // 문서가 바뀌었거나 사용자 등급이면 캐시만 사용
        }
      }
    }
    const next = { ...snap, grades, hash: wrote ? "" : snap.hash }; await api.pluginStorage.setItem(key(chaId, chatId), JSON.stringify(next));
    return { ...next, lastGrade: { total: items.length, wrote, cacheOnly: items.length - wrote, reason: !canWrite ? "no-api" : denied ? "denied" : failed ? "failed" : "", error: failed } };  // hash 비움 → 다음 조회에서 위키 등급을 다시 읽음
  }
  // 사용자가 위키 문서에 직접 등급을 지정(gradeBy:"user"). score: 0~9 또는 null(해제). 지원 안 하면 throw, 권한 거부면 false.
  async function setGradeByUser(chaId, chatId, docId, score) {
    if (typeof api?.bardWiki?.setGrade !== "function") throw new Error("이 리스바드 버전은 위키 등급 저장을 지원하지 않아요.");
    if (!(score === null || (Number.isInteger(score) && score >= 0 && score <= 9))) throw new Error("등급 점수는 0~9예요.");
    const snap = await load(chaId, chatId), fresh = await freshEvents(), hash = fresh?.get(docId)?.hash ?? snap?.docs?.find((x) => x.id === docId)?.hash;
    if (!snap || !hash) throw new Error("먼저 이 채팅을 열고 새로고침해 주세요.");
    const res = await api.bardWiki.setGrade({ documentId: docId, grade: score, gradeBy: "user", expectedContentHash: hash });
    if (res == null) return false;
    const grades = { ...(snap.grades ?? {}) }; delete grades[docId];
    await api.pluginStorage.setItem(key(chaId, chatId), JSON.stringify({ ...snap, grades, hash: "" }));  // 다음 조회에서 위키 값을 다시 읽음
    return true;
  }
  const withGrades = (folder) => { for (const p of Object.values(folder?.people ?? {})) for (const r of p.records) { const c = !r.g && !r.wikiGrade && r.docId ? folder.grades?.[r.docId] : null; if (c) { r.g = c.g; r.gs = c.score; } } for (const sc of folder?.scenes ?? []) { const c = sc.docId && sc.gs == null ? folder.grades?.[sc.docId] : null; if (c) { sc.gs = c.score; sc.gby = "ai"; } } return folder; };
  return { id: "bardwiki", loadFolder, gradeOnDemand, setGradeByUser, canSetGrade: () => typeof api?.bardWiki?.setGrade === "function", withGrades, isLive: (cur, target) => String(cur?.chaId) === String(target.chaId) && String(cur?.chatId) === String(target.chatId), available: async () => typeof api?.bardWiki?.getDocuments === "function" };
}
