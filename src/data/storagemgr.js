// 플러그인 스토리지(pluginStorage) 편집 (1.8.3): 값 수정·새 키·내보내기/가져오기. 모든 플러그인이 함께 쓰는 저장소라 저장 직전에 값이 바뀌었는지 다시 확인한다.
import { storageGet } from "./plugins.js";

export const STORAGE_FILE = "dusk-plugin-storage";
export const valueKind = (v) => (typeof v === "string" ? "string" : "json");
export const toEditText = (v) => (typeof v === "string" ? v : v === undefined ? "" : JSON.stringify(v, null, 2));
export function parseEdit(text, kind) {
  if (kind === "string") return String(text);
  try { return JSON.parse(text); } catch (e) { throw new Error(`JSON이 올바르지 않아요 · ${e.message}`); }
}
// 형식을 바꾸면 이 키를 읽는 플러그인이 깨질 수 있다 — 안내 문구(없으면 "")
export const kindChangeWarning = (from, to) => (from === to ? "" : `값 형식이 ${from === "string" ? "문자열" : "JSON"}에서 ${to === "string" ? "문자열" : "JSON"}(으)로 바뀝니다. 이 키를 읽는 플러그인이 기존 형식을 기대하면 동작이 깨질 수 있습니다.`);
export const keyProblem = (key) => (!String(key).trim() ? "키를 입력하세요." : /[\u0000-\u001f]/.test(key) ? "키에 제어 문자를 쓸 수 없어요." : "");

const fp = (v) => JSON.stringify(v ?? null);
// 저장: origin = 편집을 시작할 때 읽은 값(없던 키면 undefined). 그새 바뀌었으면 conflict로 거절(force면 덮어씀).
export async function saveStorageItem(api, key, value, { origin, isNew = false, force = false } = {}) {
  const cur = (await storageGet(api, key)).value;
  const exists = cur !== null && cur !== undefined;
  if (!force) {
    if (isNew && exists) throw Object.assign(new Error("같은 이름의 키가 이미 있어요."), { conflict: "exists" });
    if (!isNew && !exists) throw Object.assign(new Error("편집하는 사이 키가 삭제됐어요."), { conflict: "gone" });
    if (!isNew && fp(cur) !== fp(origin)) throw Object.assign(new Error("편집을 시작한 뒤 다른 곳에서 값이 바뀌었어요."), { conflict: "changed" });
  }
  const ok = await api.pluginStorage.setItem(key, value);
  if (ok === false) throw new Error("저장하지 못했어요 (호스트가 거절했어요).");
}
export async function exportStorage(api, keys) {
  const items = {};
  for (const k of keys) { const v = (await storageGet(api, k)).value; if (v !== null && v !== undefined) items[k] = v; }
  return JSON.stringify({ type: STORAGE_FILE, version: 1, items }, null, 2);
}
export function parseStorageImport(text, existingKeys = []) {
  let j; try { j = JSON.parse(text); } catch { throw new Error("JSON 파싱 실패"); }
  if (j?.type !== STORAGE_FILE || !j.items || typeof j.items !== "object" || Array.isArray(j.items)) throw new Error("Dusk 스토리지 파일이 아니에요");
  const have = new Set(existingKeys);
  return Object.entries(j.items).map(([key, value]) => ({ key, value, exists: have.has(key) }));
}
// 선택한 키만 쓴다. 이미 있는 키는 overwrite가 true일 때만 덮어쓴다. → { written, skipped }
export async function applyStorageImport(api, items, selected, { overwrite = false } = {}) {
  let written = 0, skipped = 0;
  for (const it of items) {
    if (!selected.includes(it.key)) continue;
    if (it.exists && !overwrite) { skipped++; continue; }
    await api.pluginStorage.setItem(it.key, it.value); written++;
  }
  return { written, skipped };
}
