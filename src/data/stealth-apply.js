// 더스크 스텔스 적용: 만든 테마를 기존 테마 목록(themes.js)에 넣고, 리스 설정(커스텀 CSS·채팅 HTML)에 저장한다.
// 켜기 전 리스 설정 값은 dbBackup에 남겨 끌 때 그대로 되돌린다(이미 스텔스가 켜져 있으면 처음 백업을 지키고 덮어쓰지 않는다).
import { loadThemes, saveThemes, applyToDocument, writeToDatabase, restoreDatabase, newTheme } from "./themes.js";
import { STEALTH_KEY, STEALTH_PREFIX, PRESETS, stealthTheme, normalizeStealthState, optsOf } from "./stealth.js";

export async function loadStealth(api) {
  try { const raw = await api.pluginStorage.getItem(STEALTH_KEY); return normalizeStealthState(raw ? JSON.parse(raw) : null); } catch { return normalizeStealthState(null); }
}
// 애드온이 새 버전이면 켜 둔 모양을 리스 설정(커스텀 CSS·채팅 HTML)에 다시 써 넣는다 — 안 하면 업데이트해도 예전 모양이 남는다
export async function reapplyIfUpdated(api, version) {
  const st = await loadStealth(api);
  if (!st.active || !version || st.appliedVer === version) return { st, reapplied: false };
  const next = await enableStealth(api, st.active, st);
  const saved = { ...next, appliedVer: version };
  await saveStealth(api, saved);
  return { st: saved, reapplied: true };
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

// ── 화면 진단: 어디서 안 보이는지 찾는다(리스 화면 문서에서 자리 수를 센다) ──
import { probeSelectors, detectTarget, TARGETS } from "./themes.js";
import { shellInfo, shellState } from "./stealth-shell.js";
export var DIAG_SELECTORS = {
  "채팅 래퍼(.st-msg)": ".st-msg", "본문 자리(.st-body)": ".st-body", "리스 본문(.chattext)": ".chattext",
  "채팅 목록(.risu-chat)": ".risu-chat", "채팅 화면(.default-chat-screen)": ".default-chat-screen", "입력칸(.text-input-area)": ".text-input-area",
  "순정 사이드바": ".rs-sidebar, .risu-sidebar", "스텔스 사이드바": '[x-dusk="stealth-sb"]', "스텔스 표식": "body[x-dusk-st]",
  "이미지 접힘 줄(details.st-ftool)": "details.st-ftool", "래퍼 안 이미지(.st-msg img)": ".st-msg img", "래퍼 안 배경 그림": '.st-msg [style*="background-image"]',
  "본문 이미지(.chattext img)": ".chattext img", "본문 배경 그림": '.chattext [style*="background-image"]', "래퍼 안 본문(.st-msg .chattext)": ".st-msg .chattext"
};
/** counts: {라벨: 개수}, db: {theme, htmlLen, cssLen, hasWrapper, hasStealthCss}. 돌려주는 값: 한 줄씩 읽는 안내 목록. */
export function diagnose(counts, db) {
  const n = (k) => counts[k] ?? 0, out = [];
  if (!db.hasStealthCss) out.push("리스 설정의 커스텀 CSS에 스텔스가 없어요 → 위에서 ‘켜기’를 눌러 주세요.");
  if (db.hasStealthCss && db.theme !== "customHTML") out.push(`채팅 테마가 ‘${db.theme}’예요(스텔스는 customHTML이 필요) → 켜기를 다시 눌러 주세요.`);
  if (db.hasWrapper && n("채팅 래퍼(.st-msg)") === 0 && n("채팅 목록(.risu-chat)") + n("채팅 화면(.default-chat-screen)") > 0)
    out.push("채팅 HTML이 아직 화면에 적용되지 않았어요 → 리스를 새로고침해 보세요. 그래도 같으면 이 리스 판이 채팅 HTML(customHTML)을 쓰지 않는 것일 수 있어요.");
  if (n("채팅 래퍼(.st-msg)") > 0 && n("리스 본문(.chattext)") === 0) out.push("채팅 래퍼는 있는데 본문(.chattext)이 하나도 없어요 → 이 리스 판의 본문 클래스가 달라 글이 안 보일 수 있어요. 이 줄과 ‘화면 진단 결과’를 알려 주세요.");
  if (n("채팅 래퍼(.st-msg)") > 0 && n("본문 자리(.st-body)") === 0) out.push("채팅 래퍼 안에 본문 자리가 없어요 → <risutextbox>가 지원되지 않는 판일 수 있어요.");
  if (n("채팅 화면(.default-chat-screen)") === 0) out.push("대화 화면(.default-chat-screen)을 못 찾았어요 → 이 리스 판은 클래스 이름이 달라 일부 꾸밈이 안 먹어요.");
  if (n("입력칸(.text-input-area)") === 0) out.push("입력칸(.text-input-area)을 못 찾았어요 → 입력창 모양이 적용되지 않아요.");
  if (db.shell) out.push(`사이드바 상태: ${db.shell}`);
  if (db.hasStealthCss && !db.hasFold) out.push("리스 설정의 채팅 HTML에 이미지 접힘이 없어요 → 위에서 ‘문구·옵션 다시 적용’을 눌러 주세요(‘이미지 접기’가 켜져 있어야 해요).");
  if (db.hasFold && n("채팅 래퍼(.st-msg)") > 0 && n("이미지 접힘 줄(details.st-ftool)") === 0) out.push("채팅 HTML에는 접힘이 있는데 화면에는 없어요 → 이 리스 판이 접힘(details) 태그를 지우는 것 같아요.");
  if (n("본문 이미지(.chattext img)") + n("본문 배경 그림") > n("래퍼 안 이미지(.st-msg img)") + n("래퍼 안 배경 그림")) out.push("이미지 일부가 채팅 래퍼 밖에 있어요 → 그 이미지는 접힘으로 숨길 수 없어요.");
  if (n("채팅 목록(.risu-chat)") + n("채팅 화면(.default-chat-screen)") + n("입력칸(.text-input-area)") === 0) out.push("채팅 화면 요소가 하나도 안 잡혀요 → Dusk 창이 채팅 위를 덮고 있으면 이렇게 나와요. 채팅 화면에서 다시 확인해 주세요(‘5초 뒤 진단’).");
  if (n("스텔스 사이드바") === 0) out.push("스텔스 사이드바가 화면에 없어요 → 클로드·클로드 코드 모양을 켠 뒤 몇 초 기다리거나 새로고침해 보세요.");
  else if (n("스텔스 표식") === 0) out.push("사이드바는 있는데 표식이 없어 자리 비움이 적용되지 않아요.");
  return out.length ? out : ["문제를 찾지 못했어요. 화면이 그래도 이상하면 어느 부분인지 알려 주세요."];
}
export async function runDiagnosis(api) {
  const doc = await api.getRootDocument?.().catch(() => null);
  if (!doc) return { counts: {}, lines: ["리스 화면 문서에 접근하지 못했어요."], target: null };
  const counts = await probeSelectors(doc, DIAG_SELECTORS);
  const db = await api.getDatabase(["customCSS", "guiHTML", "theme"]).catch(() => ({}));
  const info = { theme: db?.theme ?? "", htmlLen: String(db?.guiHTML ?? "").length, cssLen: String(db?.customCSS ?? "").length, hasWrapper: /st-msg/.test(db?.guiHTML ?? ""), hasFold: /st-ftool/.test(db?.guiHTML ?? ""), hasStealthCss: /Dusk Stealth/.test(db?.customCSS ?? "") };
  info.shell = shellState() ? `켜짐(${shellState()}) · 그린 횟수 ${shellInfo.draws}${shellInfo.error ? " · 오류: " + shellInfo.error : ""}${shellInfo.warn ? " · 주의: " + shellInfo.warn : ""}` : "꺼짐(켜진 클로드 계열 모양이 없거나 시작 전)";
  const target = await detectTarget(doc, api).catch(() => null);
  return { counts, db: info, target: target ? (TARGETS[target]?.label ?? target) : null, lines: diagnose(counts, info) };
}
