// 더스크 스텔스 적용: 만든 테마를 기존 테마 목록(themes.js)에 넣고, 리스 설정(커스텀 CSS·채팅 HTML)에 저장한다.
// 켜기 전 리스 설정 값은 dbBackup에 남겨 끌 때 그대로 되돌린다(이미 스텔스가 켜져 있으면 처음 백업을 지키고 덮어쓰지 않는다).
import { loadThemes, saveThemes, applyToDocument, writeToDatabase, restoreDatabase, newTheme } from "./themes.js";
import { STEALTH_KEY, STEALTH_PREFIX, PRESETS, stealthTheme, normalizeStealthState, optsOf } from "./stealth.js";

export async function loadStealth(api) {
  try { const raw = await api.pluginStorage.getItem(STEALTH_KEY); return normalizeStealthState(raw ? JSON.parse(raw) : null); } catch { return normalizeStealthState(null); }
}
export const saveStealth = (api, s) => api.pluginStorage.setItem(STEALTH_KEY, JSON.stringify(s));

// 스텔스가 목록에 넣은 테마는 이름 앞머리로 알아본다(테마 파일 형식에 표지 칸이 없어서)
const isStealthName = (n) => String(n ?? "").startsWith(STEALTH_PREFIX);

/** 켜기·갱신: id 프리셋을 현재 설정(state)으로 만들어 적용한다. 돌려주는 값: 바뀐 state. */
export async function enableStealth(api, id, state, { target = "risu" } = {}) {
  if (!PRESETS[id]) throw new Error(`모르는 스텔스 테마예요: ${id}`);
  const data = await loadThemes(api);
  const t = stealthTheme(id, optsOf(state, id), target);
  // 목록: 스텔스 테마는 계열마다 하나만 두고 갈아 끼운다
  const list = (data.themes[target] ??= []).filter((x) => !isStealthName(x.name));
  const made = { ...newTheme(target, t.name), css: t.css, html: t.html, useTokens: false };
  list.push(made);
  data.themes[target] = list;
  data.active[target] = made.id;
  data.target = target;
  // 리스 설정 백업은 스텔스를 처음 켤 때만 받는다
  const wasOn = !!state.active;
  const before = await writeToDatabase(api, made);
  if (!wasOn || !data.dbBackup?.[target]) data.dbBackup = { ...data.dbBackup, [target]: before };
  await saveThemes(api, data);
  const doc = await api.getRootDocument?.().catch(() => null);
  if (doc) await applyToDocument(doc, made).catch(() => false);
  return { ...state, active: id };
}

/** 끄기: 리스 설정을 켜기 전 값으로 되돌리고 화면의 스타일도 뺀다. */
export async function disableStealth(api, state, { target = "risu" } = {}) {
  const data = await loadThemes(api);
  const before = data.dbBackup?.[target];
  if (before) {
    await restoreDatabase(api, target, before);
    const { [target]: _gone, ...rest } = data.dbBackup;
    data.dbBackup = rest;
  }
  data.themes[target] = (data.themes[target] ?? []).filter((x) => !isStealthName(x.name));
  data.active[target] = null;
  data.forceApply = false;
  await saveThemes(api, data);
  const doc = await api.getRootDocument?.().catch(() => null);
  if (doc) await applyToDocument(doc, null).catch(() => {});
  return { ...state, active: null };
}
