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
import { shellInfo, shellState, shellFlags } from "./stealth-shell.js";
export var DIAG_SELECTORS = {
  "채팅 래퍼(.st-msg)": ".st-msg", "본문 자리(.st-body)": ".st-body", "리스 본문(.chattext)": ".chattext",
  "채팅 목록(.risu-chat)": ".risu-chat", "채팅 화면(.default-chat-screen)": ".default-chat-screen", "입력칸(.text-input-area)": ".text-input-area",
  "순정 사이드바": ".rs-sidebar, .risu-sidebar", "스텔스 사이드바": '[x-dusk="stealth-sb"]', "스텔스 표식": "body[x-dusk-st]",
  "이미지 접힘 상자([x-st-fw])": "[x-st-fw]", "접힘 줄([x-st-fl])": "[x-st-fw] > [x-st-fl]", "펼친 상자": '[x-st-fw][x-open="1"]', "아직 안 감싼 이미지": '.st-msg .st-body :is(img, video, [style*="url("]):not([x-st-m]):not([x-st-fw] *)', "작아서 그대로 둔 그림(다시 재는 중)": '[x-st-m="s"]', "작아서 그대로 둔 그림(굳힘)": '[x-st-m="S"]', "감싸기 실패한 이미지": '[x-st-m="e"]', "래퍼 안 이미지(.st-msg img)": ".st-msg img", "래퍼 안 배경 그림": '.st-msg [style*="url("]',
  "본문 이미지(.chattext img)": ".chattext img", "본문 배경 그림": '.chattext [style*="url("]', "래퍼 안 본문(.st-msg .chattext)": ".st-msg .chattext"
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

  if (n("아직 안 감싼 이미지") > 0) out.push("아직 접힘 줄이 안 붙은 이미지가 있어요 → 1~2초 뒤 다시 진단해 보세요(스텔스 애드온이 켜져 있어야 해요).");
  if (n("이미지 접힘 상자([x-st-fw])") > 0 && n("접힘 줄([x-st-fl])") < n("이미지 접힘 상자([x-st-fw])")) out.push("접힘 상자에 ‘명령어 N개 실행함’ 줄이 빠진 것이 있어요 → 이 진단 결과를 알려 주세요.");
  if (n("감싸기 실패한 이미지") > 0) out.push("접힘 줄을 붙이지 못한 이미지가 있어요(숨기고 ‘명령어 N개 실패함’으로 보여요) → 이 진단 결과를 알려 주세요.");
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
  if (shellState()) info.shell += ` · ${shellFlags()}`;
  const target = await detectTarget(doc, api).catch(() => null);
  info.layout = await layoutTrace(doc).catch((e) => [`배치 추적 실패: ${e?.message ?? e}`]);
  info.fold = await foldTrace(doc).catch((e) => [`접힘 추적 실패: ${e?.message ?? e}`]);
  info.fold.push(...await inputTrace(doc).catch((e) => [`입력창 추적 실패: ${e?.message ?? e}`]));
  return { counts, db: info, target: target ? (TARGETS[target]?.label ?? target) : null, lines: diagnose(counts, info) };
}

// 배치 추적: 채팅 글에서 body까지 거슬러 올라가며 각 상자의 왼쪽 위치·폭을 적는다(채팅이 한쪽으로 쏠릴 때 어느 상자가 좁은지 찾기)
export async function layoutTrace(doc, max = 16) {
  let el = await doc.querySelector(".st-msg") ?? await doc.querySelector(".chattext") ?? await doc.querySelector(".default-chat-screen");
  if (!el) return ["배치 추적: 채팅 글을 못 찾았어요(채팅 화면에서 ‘5초 뒤 진단’)."];
  const out = [];
  for (let i = 0; el && i < max; i++) {
    const tag = String(await el.nodeName?.().catch(() => "") ?? "").toLowerCase();
    const cls = String(await el.getClassName?.().catch(() => "") ?? "").trim().replace(/\s+/g, ".").slice(0, 70);
    const r = await el.getBoundingClientRect?.().catch(() => null);
    out.push(`${tag}${cls ? "." + cls : ""} — 왼쪽 ${Math.round(r?.left ?? NaN)} · 폭 ${Math.round(r?.width ?? NaN)}`);
    if (tag === "body" || tag === "html") break;
    el = await el.getParent?.().catch(() => null);
  }
  return ["배치 추적(글 → body):", ...out];
}

// 접힘 추적: 줄·이미지가 실제로 화면에 크기를 갖는지(있어도 0이면 안 보인다). 첫 상자 몇 개는 부모 상자 폭까지 적는다.
export async function foldTrace(doc, max = 4) {
  const items = async (sel) => { const l = await doc.querySelectorAll(sel); const n = typeof l?.length === "function" ? await l.length() : l?.length ?? 0; const out = []; for (let i = 0; i < n; i++) out.push(typeof l.at === "function" ? await l.at(i) : l[i]); return out; };
  const rect = async (el) => { const r = await el?.getBoundingClientRect?.().catch?.(() => null); return r ? { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top) } : null; };
  const labs = await items("[x-st-fw] > [x-st-fl]"), shown = [];
  for (const el of labs) { const r = await rect(el); if (r && r.w > 0 && r.h > 0) shown.push(r); }
  const media = await items('[x-st-fw][x-open="0"] > :not([x-st-fl])'); let leak = 0;
  for (const el of media) { const r = await rect(el); if (r && r.w > 2 && r.h > 2) leak++; }
  const out = ["접힘 추적:", `크기가 있는 접힘 줄 ${shown.length}/${labs.length}`, `접혔는데도 보이는 이미지 ${leak}/${media.length}`];
  for (const el of labs.slice(0, max)) {
    const r = await rect(el), box = await el.getParent?.().catch(() => null), b = await rect(box), pa = await rect(await box?.getParent?.().catch(() => null));
    const pcls = String(await (await box?.getParent?.().catch(() => null))?.getClassName?.().catch(() => "") ?? "").trim().replace(/\s+/g, ".").slice(0, 50);
    out.push(`줄 ${r ? `${r.w}×${r.h} (${r.l},${r.t})` : "?"} · 상자 ${b ? `${b.w}×${b.h}` : "?"} · 부모${pcls ? "." + pcls : ""} ${pa ? `${pa.w}×${pa.h}` : "?"}`);
  }
  const smalls = await items('[x-st-m="s"], [x-st-m="S"]');   // 작다고 본 그림의 잰 크기(앞 6개) — 맨 끝에
  if (smalls.length) out.push(`작게 본 크기: ${(await Promise.all(smalls.slice(0, 6).map(async (el) => (await el.getAttribute?.("x-st-sz")?.catch?.(() => null)) ?? "?"))).join(", ")}`);
  return out;
}

// 입력창·따옴표 추적(0.3.49): 리스 입력 줄의 칸 순서·크기, 사용자 말풍선 안 따옴표가 무슨 요소인지(봇 CSS가 따옴표를 바꾸는지)
export async function inputTrace(doc) {
  const name = async (el) => { const tag = String(await el?.nodeName?.().catch(() => "") ?? "").toLowerCase(); const cls = String(await el?.getClassName?.().catch(() => "") ?? "").trim().replace(/\s+/g, ".").slice(0, 60); return `${tag}${cls ? "." + cls : ""}`; };
  const kids = async (el) => { const l = await el?.getChildren?.().catch(() => null) ?? await el?.querySelectorAll?.(":scope > *").catch(() => null); const n = typeof l?.length === "function" ? await l.length() : l?.length ?? 0; const out = []; for (let i = 0; i < n; i++) out.push(typeof l.at === "function" ? await l.at(i) : l[i]); return out; };
  const out = ["입력창 추적:"];
  const ta = await doc.querySelector(".text-input-area");
  const row = ta ? await ta.getParent?.().catch(() => null) : null;
  if (!row) out.push("입력 줄을 못 찾았어요");
  else {
    out.push(`줄 ${await name(row)}`);
    for (const k of (await kids(row)).slice(0, 8)) { const r = await k.getBoundingClientRect?.().catch(() => null); out.push(`- ${await name(k)} ${r ? `${Math.round(r.width)}×${Math.round(r.height)}` : "?"}`); }
  }
  const q = await doc.querySelector(".st-user .chattext mark, .st-user .chattext blockquote, .st-user .chattext q");
  out.push(q ? `사용자 따옴표: ${await name(q)} · 부모 ${await name(await q.getParent?.().catch(() => null))}` : "사용자 말풍선에 mark·인용 요소 없음");
  const ub = await doc.querySelector(".st-user .chattext");   // 사용자 말풍선 속 요소들(따옴표가 무엇으로 바뀌는지)
  if (ub) { const all = await ub.querySelectorAll?.("*").catch(() => null); const n = typeof all?.length === "function" ? await all.length() : all?.length ?? 0; const list = []; for (let i = 0; i < Math.min(n, 8); i++) { const el = typeof all.at === "function" ? await all.at(i) : all[i]; const st = String(await el?.getAttribute?.("style")?.catch?.(() => "") ?? "").slice(0, 50); list.push(`${await name(el)}${st ? ` [${st}]` : ""}`); } out.push(`사용자 말풍선 요소: ${list.join(" · ") || "없음"}`); }
  return out;
}
