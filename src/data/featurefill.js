// 2.2.25 장기기억: 새 기능 빈칸 채우기. 기능이 생기기 전에 기록한 채팅은 종족·기후·옷차림 같은 새 칸이 비어 있다.
// 빈칸을 찾아(엔진, 호출 없음) 기억 홈의 ‘지난 대화 분석’ 버튼을 노랗게 띄우고, 누르면 AI 한 번으로 지금까지의 이야기에서 채운다.
// 기존 기록을 다시 분석하지 않는다(비용). 채운 기능은 folder.extra.filled에 표시해 다시 묻지 않는다(찾을 게 없어도).
import { runAITask } from "../engine/runai.js";
import { pickForStage } from "./modelhub.js";
import { extraOf, extraFrom, applyExtra, nk, OUTFIT_STAGE1 } from "../engine/memextra.js";
import { RACE_STAGE1 } from "../engine/races.js";
import { CLIMATE_STAGE1 } from "../engine/weather.js";
import { extractMessageText, isUserMessage } from "../engine/chattext.js";
import { cleanForMemory } from "../engine/cleantext.js";

// 기능 목록: 새 기능이 생기면 여기에 한 줄 더한다(key·이름·켜짐 조건·비었는지·기록기 줄)
export const FILL_FEATURES = Object.freeze([
  { key: "race", label: "종족", on: (inj) => inj.race !== false, empty: (f, chars) => chars.some((d) => !Object.values(extraOf(f).race).some((r) => nk(r.name) === nk(d.title))), line: RACE_STAGE1 },
  { key: "climate", label: "기후·달력", on: (inj) => inj.scenePanel !== false, empty: (f) => !extraOf(f).climate, line: CLIMATE_STAGE1 },
  { key: "outfit", label: "옷차림", on: (inj) => inj.outfit !== false, empty: (f, chars) => chars.length > 0 && Object.keys(extraOf(f).outfit).length === 0, line: OUTFIT_STAGE1 },
]);
const charsOf = (f) => Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !/\{\{user\}\}/i.test(d.title ?? ""));
// 순수: 채울 만한 빈칸(기록이 있는 채팅만). [{key,label}]
export function featureGaps(f, inj = {}) {
  const chars = charsOf(f), filled = extraOf(f).filled ?? {};
  if (!chars.length) return [];
  return FILL_FEATURES.filter((x) => x.on(inj) && !filled[x.key] && x.empty(f, chars)).map(({ key, label }) => ({ key, label }));
}
// 순수: 지시문
export function fillPrompt(f, gaps, { recent = "", bot = "" } = {}) {
  const chars = charsOf(f).slice(0, 24), prof = f?.wiki?.people?.profiles ?? {};
  const want = FILL_FEATURES.filter((x) => gaps.some((g) => g.key === x.key));
  const sys = ["You fill in missing story facts for a memory system. Read the character list and the story so far, then write ONLY these lines (one fact per line, no other text):",
    ...want.map((x) => x.line.trim()),
    "Use only what the setting and story show or clearly imply. Skip a line when it is truly unknown. Names must be exactly as listed."].join("\n");
  const user = [bot && `[봇 설정]\n${bot.slice(0, 1500)}`, `[인물]\n${chars.map((d) => `- ${d.title}${prof[d.id]?.summary ? `: ${String(prof[d.id].summary).slice(0, 160)}` : ""}`).join("\n")}`, `[지금까지의 이야기(최근)]\n${recent}`].filter(Boolean).join("\n\n");
  return [{ role: "system", content: sys }, { role: "user", content: user }];
}
// AI 한 번으로 채우고 저장. 반환: 바뀐 글 목록
export async function fillFeatures(api, store, { chaId, chatId, chat, folder, gaps, bot = "", signal = null }) {
  if (!gaps?.length) return [];
  const msgs = chat?.message ?? [];
  const recent = msgs.slice(-40).map((m) => `${isUserMessage(m) ? "{{user}}" : "AI"}: ${cleanForMemory(extractMessageText(m)).slice(0, 600)}`).join("\n").slice(-9000);
  const raw = await runAITask(`새 기능 채우기 · ${gaps.map((g) => g.label).join("·")}`, api, fillPrompt(folder, gaps, { recent, bot }), await pickForStage(api, "writer"), signal);
  const known = charsOf(folder), canon = (n) => known.find((d) => [d.title, ...(d.aliases ?? [])].some((x) => nk(x) === nk(n)))?.title ?? "";
  const keys = new Set(gaps.map((g) => g.key));
  const reports = extraFrom(String(raw ?? "").replace(/<think>[\s\S]*?<\/think>/gi, ""), canon, { race: keys.has("race"), weather: keys.has("climate"), outfit: keys.has("outfit"), world: false, status: false })
    .filter((r) => (r.kind === "race" && keys.has("race")) || (r.kind === "climate" && keys.has("climate")) || ((r.kind === "wear" || r.kind === "strip") && keys.has("outfit")));
  let changed = [];
  await store.updateFolder(chaId, chatId, (f) => {
    changed = applyExtra(f, reports, { turn: Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0 });
    const e = extraOf(f); e.filled = { ...(e.filled ?? {}), ...Object.fromEntries([...keys].map((k) => [k, Date.now()])) }; f.extra = e;
  });
  return changed;
}
