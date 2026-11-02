// v1.8.1 HypaPlus 가져오기(데이터): 같은 저장소(pluginStorage)에 남은 HypaPlus 기록을 읽어 Dusk 폴더로 옮긴다.
// 원본(hypaplus_* 키)은 지우거나 바꾸지 않는다. 같은 노드는 두 번 넣지 않아서 여러 번 눌러도 안전하다.
import { dbRead } from './dbcache.js';
import { HYPA_STATE_PREFIX, parseHypaKey, readHypaNodes, mergeHypaNodes } from "../engine/hypaimport.js";

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("저장소 목록을 읽는 데 너무 오래 걸려요")), ms))]);

export function createHypaImporter(api, { store, log = (...a) => console.log("[Dusk HypaPlus]", ...a) } = {}) {
  async function storageKeys() {
    const ps = api.pluginStorage;
    if (typeof ps?.keys === "function") return (await ps.keys()) ?? [];
    if (typeof ps?.key === "function") { const n = typeof ps.length === "function" ? await ps.length() : ps.length ?? 0; const out = []; for (let i = 0; i < n; i++) out.push(await ps.key(i)); return out; }
    return [];
  }
  // 감지: 저장된 기록 키 · 설정 키 · 설치된 플러그인 이름 중 하나라도 있으면 found. 읽기만 하며 실패해도 조용히 넘어간다.
  async function detect() {
    let keys = []; try { keys = await withTimeout(storageKeys(), 6000); } catch (e) { log("키 목록 못 읽음", e?.message ?? e); }
    const states = keys.filter((k) => typeof k === "string" && k.startsWith(HYPA_STATE_PREFIX));
    const chats = states.map((key) => ({ key, ...parseHypaKey(key) })).filter((x) => x.chaId);
    let installed = false; try { const db = await dbRead(api, ["plugins"]); installed = (Array.isArray(db?.plugins) ? db.plugins : []).some((p) => /hypaplus/i.test(String(p?.name ?? p?.displayName ?? ""))); } catch { /* 플러그인 목록을 못 읽으면 기록 키로만 판단 */ }
    let hasSettings = false; try { hasSettings = !!(await api.pluginStorage.getItem("HypaPlus_settings")); } catch { /* 없음 */ }
    return { found: chats.length > 0 || installed || hasSettings, installed, hasSettings, chats, unparsed: states.length - chats.length };
  }
  const read = async (key) => { try { const raw = await api.pluginStorage.getItem(key); return readHypaNodes(typeof raw === "string" ? raw : raw ?? null); } catch { return null; } };
  const sum = (a, b) => { for (const k of Object.keys(b)) a[k] = (a[k] ?? 0) + b[k]; return a; };
  const intoFolder = (chaId, chatId, nodes, messages = null) => store.updateFolder(String(chaId), String(chatId), (f) => mergeHypaNodes(f, nodes, { messages }));
  const markDone = (total) => store.updateIndex((idx) => { idx.hypa = { state: "done", at: Date.now(), ...total }; });

  // 감지된 모든 채팅을 가져온다. onProgress(i, n)로 진행을 알린다.
  // messagesFor(chaId, chatId)가 메시지 배열을 주면(지금 열린 채팅) 앵커를 채운다. 그 밖의 채팅은 앵커 없이 넣는다.
  async function importAll(chats, { onProgress = () => {}, messagesFor = null } = {}) {
    const total = { chats: 0, scenes: 0, records: 0, people: 0, already: 0, skipped: 0, upgraded: 0, unreadable: 0 };
    for (let i = 0; i < chats.length; i++) {
      onProgress(i, chats.length);
      const nodes = await read(chats[i].key);
      if (!nodes) { total.unreadable++; continue; }
      if (!nodes.length) continue;
      try { sum(total, await intoFolder(chats[i].chaId, chats[i].chatId, nodes, (await messagesFor?.(chats[i].chaId, chats[i].chatId).catch(() => null)) ?? null)); total.chats++; } catch (e) { total.unreadable++; log("가져오기 실패", chats[i].key, e?.message ?? e); }
      await new Promise((r) => setTimeout(r, 0));
    }
    onProgress(chats.length, chats.length);
    await markDone(total);
    return total;
  }
  // 백업 파일(JSON 글) 하나를 지정한 채팅에 가져온다.
  async function importFile(text, chaId, chatId, messages = null) {
    const nodes = readHypaNodes(text);
    if (!nodes) throw new Error("HypaPlus 백업 파일이 아니에요.");
    if (!nodes.length) throw new Error("가져올 노드가 없어요.");
    const r = await intoFolder(chaId, chatId, nodes, messages);
    await markDone({ chats: 1, ...r });
    return r;
  }
  const dismiss = () => store.updateIndex((idx) => { idx.hypa = { state: "dismissed", at: Date.now() }; });
  return { detect, importAll, importFile, dismiss };
}
