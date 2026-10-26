// 카드 만들기 흐름(AI 호출 3회: 카드·연결·첫 메시지)과 에셋 고르기. 화면 코드 없이 api만 쓴다.
import { runAI } from "../engine/runai.js";
import { cardPrompt, normalizeCardResponse, parseLoose, gradePrompt, parseGrade, tagPrompt, parseTagPick, linkPrompt, normalizeLinkResponse, shortlistAssets, pickAssetPrompt, parsePicks } from "../engine/card/prompt.js";
import { newCard } from "../engine/card/card.js";
import { sourceMemories } from "../engine/card/memories.js";
import { parseTags, calcStats } from "../engine/card/tags.js";
import { isImageExt } from "../ui/assets.js";

// 사용자(페르소나) 이름들: {{user}}로 통일할 대상. 못 읽으면 빈 배열.
export async function roleNamesOf(api) {
  try {
    const db = await api.getDatabase(["username", "personas"]);
    return [...new Set([db?.username, ...(db?.personas ?? []).map((p) => p?.name)].filter((n) => typeof n === "string" && n.trim()))];
  } catch { return []; }
}

// 카드 1장 만들기(AI 1회). 응답이 모자라면 한 번 다시 시도한다.
export async function generateCard(api, { folder, records, messages, name, grade, others = [], cfg, model, source, roleNames = [], signal, lang }) {
  const parsed = parseTags(cfg.tagText);
  const memories = sourceMemories(folder, records, messages);
  const msgs = cardPrompt({ name, grade, memories, others, parsed, lang: lang ?? cfg.lang, extra: cfg.extra });
  let body = null, last = null;
  for (let i = 0; i < 2 && !body; i++) {
    try { body = normalizeCardResponse(parseLoose(await runAI(api, msgs, model, signal)), { name, grade, parsed, roleNames }); }
    catch (e) { if (signal?.aborted) throw e; last = e; }
  }
  if (!body) throw last ?? new Error("카드를 만들지 못했어요.");
  return { card: await newCard({ body, grade, source }), body };
}

// 연결 문서(설명·관계 기록·기억 항목) 만들기(AI 1회).
export async function generateLink(api, { card, mode, originalDesc, entryLevels, lang, extra, model, signal }) {
  const { messages, picks } = linkPrompt({ card, mode, originalDesc, entryLevels, lang, extra });
  let last = null;
  for (let i = 0; i < 2; i++) {
    try { return normalizeLinkResponse(parseLoose(await runAI(api, messages, model, signal)), { card, picks, mode }); }
    catch (e) { if (signal?.aborted) throw e; last = e; }
  }
  throw last ?? new Error("연결 문서를 만들지 못했어요.");
}

// 봇(과 연결된 모듈)의 이미지 에셋 목록: [{name, path, ext, from}]
export async function listBotImages(api, character) {
  const out = [], seen = new Set();
  const add = (name, path, ext, from) => { if (!path || seen.has(path) || !isImageExt(ext || String(path).split(".").pop())) return; seen.add(path); out.push({ name: String(name || "이름 없음"), path: String(path), ext: String(ext ?? ""), from }); };
  if (character?.image) add("대표 이미지", character.image, "", "봇");
  for (const e of character?.emotionImages ?? []) add(e?.[0], e?.[1], "", "봇 감정");
  for (const a of character?.additionalAssets ?? []) add(a?.[0], a?.[1], a?.[2], "봇");
  const ids = new Set((character?.modules ?? []).map(String));
  if (ids.size) {
    try {
      const db = await api.getDatabase(["modules"]);
      for (const m of db?.modules ?? []) if (ids.has(String(m?.id))) for (const a of m.assets ?? []) add(a?.[0], a?.[1], a?.[2], `모듈 · ${m.name ?? ""}`);
    } catch { /* 모듈을 못 읽어도 봇 에셋만으로 진행 */ }
  }
  return out;
}

// 이름만 보고 AI가 어울리는 에셋을 최대 3개 고른다(AI 1회). 후보가 없으면 빈 배열.
export async function pickIllustrations(api, { card, assets, model, signal }) {
  if (!assets.length) return [];
  const list = shortlistAssets(assets, card);
  const picks = parsePicks(await runAI(api, pickAssetPrompt({ card, assets: list }), model, signal), list.length);
  return picks.map((i) => list[i]);
}

// AI가 기록을 보고 카드 등급을 정한다(AI 1회). 구간 기록 전체를 근거로 준다.
export async function aiGrade(api, { name, folder, records, messages, model, lang, signal }) {
  const mem = sourceMemories(folder, records, messages, { limit: 40 }).map(({ excerpt, ...rest }) => rest);
  return parseGrade(await runAI(api, gradePrompt({ name, memories: mem, lang }), model, signal));
}
// AI가 태그를 고른다(AI 1회). 반환: {names, definitions} — 등급이 정한 개수만큼.
export async function aiTags(api, { card, cfg, model, lang, signal }) {
  const parsed = parseTags(cfg.tagText);
  const r = parseTagPick(await runAI(api, tagPrompt({ card, parsed, grade: card.grade, lang }), model, signal), parsed, card.grade);
  return { tags: r.names, tagDefinitions: r.definitions, stats: calcStats(r.names, r.definitions) };
}
