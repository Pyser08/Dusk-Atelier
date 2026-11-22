// 장기기억 주입 훅: 요청 사본에만 [Dusk Memory] 블록을 넣는다(저장 데이터 불변).
import { cleanForMemory } from "../engine/cleantext.js";
import { logFailure, logEvent } from "./memlog.js";
import { extractMessageText, isUserMessage } from "../engine/chattext.js";
import { buildBlock, insertBlock, injectVerdict, upsertLoreEntry } from "../engine/memoryinject.js";
import { scaleBlock, wikiAware } from "../engine/memoryscale.js";
import { nsfwSection } from "../engine/nsfwprofile.js";
import { driveSection, seeded } from "../engine/scenedrive.js";
import { nsfwByName } from "./nsfwturn.js";
import { lifeSection, humanSection, lustOfName, hotActors, lifeView, docByName } from "../engine/nsfwlife.js";
import { guideInject } from "../engine/guides.js";   // 묘사 정확도 지침(심리학·해부학) — 필요할 때만
import { GUIDES } from "./guidelib.js";   // addon-rebuild: 척도 표기·기록 시점·정리 노트 기준(애드온 전용)
import { stateText } from "../engine/storytime.js";
import { extraSection, mentionsOf } from "../engine/memextra.js";
import { fertilitySection } from "../engine/fertility.js";
import { sceneOf, inputWeather } from "../engine/scenepanel.js";
import { weatherLine } from "../engine/weather.js";
import { calSection } from "../engine/storycal.js";
import { raceSection } from "../engine/races.js";   // 0.3.22 기후·예보(장면 상태창 켜졌을 때)   // 0.3.22 소문·목표·세계·흔적·근황·@인물
import { applyLore, loreTokens } from "../engine/memorylore.js";
import { loadReconciled } from "./memoryload.js";
import { folderIdOf } from "./memorystore.js";
import { chatKeyOf } from "../engine/chatkey.js";
import { trimCovered, trimUntil, gateProcess, trimSaved } from "../engine/historytrim.js";
import { buildChunks, lexScores, rrf, assemble, RAW_TITLE } from "../engine/rawrecall.js";

// onRequest: 메인 모델 요청 직전에 부른다(기다리지 않음). 러너가 '다음 입력 때 직전 응답 확정'을 시작하는 데 쓴다.
// 2.2.2 의미 검색 질의: 사용자의 마지막 말이 중심이다(직전 응답까지 섞으면 질문의 뜻이 흐려진다). 말이 아주 짧으면 직전 응답 끝부분을 조금 붙인다.
function semQuery(msgs, minLen = 40) {
  const txt = (m) => cleanForMemory(extractMessageText(m));   // 2.2.4 태그·생각 글 빼고 찾기
  let u = -1; for (let i = msgs.length - 1; i >= 0; i--) if (isUserMessage(msgs[i])) { u = i; break; }
  const last = u >= 0 ? txt(msgs[u]).trim() : "";
  if (last.length >= minLen || u < 1) return last || msgs.slice(-2).map(txt).join("\n");
  return txt(msgs[u - 1]).slice(-400) + "\n" + last;
}
// 2.2.4 기억 토큰 절약: LoCoMo 233문항에서 기억 블록 약 4,100 → 2,900토큰(-29%), 정답률 약 1~2점 손해로 잰 예산
export const SAVER_INJECT = Object.freeze({ eventTokens: 900, recentEventTokens: 500, recallTokens: 350, rawTokens: 700, rawPicks: 6 });
// 기억 토큰 절약·옛 대화 빼고 보내기는 기본 켜짐(끈 사람만 false)
export const effectiveInject = (s) => (s?.saver !== false ? { ...(s ?? {}), ...SAVER_INJECT } : (s ?? {}));
export var TRIM_KEEP = 10;   // 최근 남길 턴(2.2.11: 20 → 10). 경계는 이만큼씩 묶어 옮겨 10~19턴이 남는다
export function createMemoryInjector(api, { store, prep = null, storyNow = null, onRequest = null, embedder = null, rerank = null, log = (...a) => console.log("[Dusk 기억]", ...a) } = {}) {
  let last = null, mode = "none";

  async function current() {
    const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
    if (!(ci >= 0) || !(ti >= 0)) return null;
    const character = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti);
    return character && chat ? { ci, ti, character, chat } : null;
  }
  // 기억 강화: 이번 요청에 실제로 들어간 기록의 사용 횟수(u)와 마지막 사용 위치(lu)를 올린다. 요청을 막지 않게 기다리지 않는다.
  function markUsed(character, chat, ids, count) {
    const set = new Set(ids);
    store.updateFolder(String(character.chaId), chatKeyOf(chat), (f) => {
      for (const p of Object.values(f.people ?? {})) for (const r of p.records ?? []) if (set.has(r.id) && (r.lu ?? -99) < count - 2) { r.u = (r.u ?? 0) + 1; r.lu = count; }
    }).catch((e) => log("사용 기록 실패", e?.message ?? e));
  }
  // 블록을 만든다. 주입하지 않으면 text가 빈 글이고 reason에 이유 코드가 들어간다(화면에서 "왜 빠졌는지" 보여 주는 용도).
  async function compose({ character, chat }, { focus = null, mark = true } = {}) {
    const none = (reason) => ({ text: "", manifest: null, position: null, reason });
    const idx = await store.getIndex();
    if (idx.settings.backend === "off") return none("backend-off");
    if (idx.settings.inject.on === false) return none("inject-off");
    if (idx.bots[String(character.chaId)]?.on === false) return none("bot-off");
    const msgs = chat.message ?? [];
    const folder = await loadReconciled(store, character.chaId, chatKeyOf(chat), msgs);  // 읽기 시점 대조(저장 안 함)
    const userTurns = msgs.filter(isUserMessage).length;
    const verdict = injectVerdict(folder, idx.settings.inject, userTurns);
    const notesOnly = !verdict.ok && verdict.reason === "no-memory" && (folder?.lore?.add ?? []).some((n) => n.on !== false);  // 내가 쓴 로어만 있어도 넣는다
    if (!verdict.ok && !notesOnly) return none(verdict.reason);
    let now = ""; try { const s = await storyNow?.(character.chaId, chatKeyOf(chat)); now = s ? stateText(s) : ""; } catch { now = ""; }
    const rx = prep ? await prep.entriesFor(character, chat) : [];  // v1.8.1 정규식 전처리: 임베딩·키워드 질의 글에서 군더더기 제거
    const tail = msgs.slice(-2).map((m) => rx.length ? prep.apply(extractMessageText(m), rx) : extractMessageText(m)).join("\n");
    let sem = null;  // 임베딩이 켜져 있으면 의미 유사도로 기억 고르기를 돕는다(실패하면 기존 방식 그대로)
    try { if (embedder && idx.settings.inject.plus !== false) sem = await embedder.scores(folderIdOf(character.chaId, chatKeyOf(chat)), folder, semQuery(msgs, idx.settings.inject.semQueryMin ?? 40)); } catch { sem = null; }
    const inj = effectiveInject(idx.settings.inject);   // 2.2.4 토큰 절약이 켜져 있으면 칸별 예산을 줄인 값
    // 0.3.22 @인물 고정 회상: 내 마지막 말의 @이름은 장면에 있는 인물처럼 기억을 넣는다
    const chars = Object.values(folder?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
    const pinned = (() => { for (let i = msgs.length - 1; i >= 0; i--) if (isUserMessage(msgs[i])) return mentionsOf(extractMessageText(msgs[i]), chars); return []; })();
    const focus2 = pinned.length ? [...(focus ?? []), ...pinned] : focus;
    const built = buildBlock(folder, { messageCount: msgs.length, recentText: tail, settings: inj, messages: msgs, focus: focus2, storyNow: now, sem, semMin: embedder?.cfg().minSim });
    if (built.text) built.text = scaleBlock(built.text, { coveredAt: Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : -1, messageCount: msgs.length });
    if (built.manifest && sem) built.manifest.sem = sem.size;
    // 2.2.2 원문 회상: 임베딩이 켜져 있으면 지난 대화 원문에서 지금 글과 관련 있는 조각을 날짜와 함께 덧붙인다(요약 기억이 놓친 사실을 받친다).
    if (built.text && embedder && idx.settings.inject.raw !== false && idx.settings.inject.plus !== false) {
      try { const r = await rawRecall(folder, msgs, character, chat, semQuery(msgs, idx.settings.inject.rawQueryMin ?? 0), inj); if (r) { built.text += "\n" + r.text; if (built.manifest) { built.manifest.included.push({ kind: "raw", tokens: r.tokens, count: r.count }); built.manifest.tokens = (built.manifest.tokens ?? 0) + r.tokens; } } } catch (e) { log("원문 회상 건너뜀", e?.message ?? e); logFailure({ area: "원문 회상", title: "지난 대화 원문 조각을 넣지 못했어요", error: e, fallback: "원문 조각 없이 기억만 넣었어요", ctx: { 메시지: msgs.length } }); }
    }
    // addon-rebuild: 이 채팅 성인 프로필(folder.nsfw) — 최근 글에 나온 인물만 짧게(Erosync 대신)
    // 기억 블록이 비어 있어도(새 채팅·기록 전) 성인 프로필·사람다움·몸 상태·장면 계획은 넣는다(예전엔 블록이 비면 다 빠졌다)
    if (folder) { try {
      const add = (x) => { if (x) built.text = built.text ? `${built.text}\n${x}` : x; };
      const recent = msgs.slice(-4).map((m) => extractMessageText(m)).join("\n");
      // 1:1 봇은 자기 이름을 잘 안 써서 이름 찾기만으론 빠졌다 → 기억 블록에 든 인물·봇 캐릭터도 장면 인물로
      const present = [...(built.manifest?.included ?? []).filter((x) => x.kind === "person").map((x) => x.name), character?.name].filter(Boolean);
      add(nsfwSection(folder, recent, 4, { present }));
      // 사람다운 항목·몸과 마음 상태(엔진 계산) — 최근 글에 이름이 나온 인물 + 장면 인물
      { const low = recent.normalize("NFKC").toLowerCase();
        const here = [...present, ...Object.values(folder?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && [d.title, ...(d.aliases ?? [])].some((n) => String(n ?? "").length >= 2 && low.includes(String(n).normalize("NFKC").toLowerCase()))).map((d) => d.title)];
        add(humanSection(folder, here));
        if (Number.isInteger(folder?.cursor?.at)) add(lifeSection(folder, here, folder.cursor.at));
        { const t = Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : msgs.length, g = idx.settings.guides ?? {};
          const people = [...new Set(here)].map((n) => { const d = docByName(folder, n); return d ? { name: d.title, v: lifeView(folder, d, t) } : null; }).filter(Boolean);
          add(guideInject(GUIDES, { key: `${character?.chaId ?? ""}|${chatKeyOf(chat)}`, people, text: recent, turn: t, cfg: { on: idx.settings.inject?.guides !== false, off: g.off ?? [], custom: g.custom ?? [] } })); }
        const when = [...(folder?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
        add(fertilitySection(folder, here, Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : msgs.length, when));
        add(extraSection(folder, { present: here, recent, turn: Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : msgs.length, when, pinned, docs: chars, world: idx.settings.inject?.world === true, status: idx.settings.inject?.status !== false, outfit: idx.settings.inject?.outfit !== false }));
        // 11-21: 엔진 예보가 먼저, 유저가 입력으로 날씨를 바꾸면 그날은 그걸 따른다(저장해서 상태창·다음 요청도 같은 값)
        { const lastUser = [...msgs].reverse().find((m) => isUserMessage(m));
          const iw = lastUser ? inputWeather(extractMessageText(lastUser), when) : null;
          if (iw && (folder.extra?.weather?.w !== iw.w || !folder.extra?.weather?.user)) { folder.extra = { ...(folder.extra ?? {}), weather: iw };
            store.updateFolder(String(character.chaId), chatKeyOf(chat), (f) => { f.extra = { ...(f.extra ?? {}), weather: iw }; }).catch(() => {}); } }
        { let sc = null; try { sc = sceneOf("", folder, { seed: `${character.chaId}|${chatKeyOf(chat)}`, hint: [character.name, String(character.desc ?? "").slice(0, 1500)].join(" ") }); } catch { sc = null; }
          if (sc?.forecast && idx.settings.inject?.scenePanel !== false) add(weatherLine(sc.forecast, sc.climate));
          if (sc?.date && idx.settings.inject?.scenePanel !== false) add(calSection(folder?.extra, sc.date, sc.climate));   // 이야기 달력: 7일 안의 생일·기념일·약속·공휴일
          // 0.3.22 종족 체질(몸·생물학만) + 지금 발정·날씨 반응
          if (idx.settings.inject?.race !== false) { try { const h0 = sc?.forecast?.days?.[0]?.half?.find((x) => x?.now); add(raceSection(folder, here, { adult: true, iso: sc?.date ?? "", cal: sc?.climate?.mdays ? sc.climate : null, hemi: sc?.climate?.hemi ?? "N", weather: sc?.weather ?? "", temp: h0?.t ?? null, night: /밤/.test(String(sc?.time ?? "")) || (Number(String(sc?.time ?? "").split(":")[0]) >= 18) })); } catch {} } } }
      // 장면 판단 계획(Erosync 대신). 같은 턴을 다시 보내도 같은 계획이 나오게 턴 번호로 정한 난수
      const dv = driveSection(folder?.drive, recent, { spont: (n) => nsfwByName(folder, n)?.sexual?.sexualSpontaneity ?? null, limitsOf: (n) => nsfwByName(folder, n)?.tags?.limits ?? [], random: seeded(`${folder?.drive?.turn ?? 0}|${msgs.length}`), present, lustOf: (n) => lustOfName(folder, n), hot: hotActors(folder) });
      add(dv);
    } catch { /* 빼고 진행 */ } }
    const raw = built.text, manifest = built.manifest;
    const text = applyLore(raw, folder?.lore);  // 주입 로어 편집(줄 수정·숨김·내 로어)
    if (manifest && text !== raw) manifest.tokens = loreTokens(text);
    if (mark && text && idx.settings.inject.plus !== false && manifest?.recordIds?.length) markUsed(character, chat, manifest.recordIds, msgs.length);
    return { text, raw, manifest, position: idx.settings.inject.position, reason: text ? "" : "empty", coveredAt: Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : -1, trim: idx.settings.inject.trimOld !== false ? Math.max(4, Number(idx.settings.inject.trimKeep) || TRIM_KEEP) : 0 };
  }
  async function rawRecall(folder, msgs, character, chat, query, s) {
    if (!String(query ?? "").trim()) return null;
    const skip = Math.max(0, Number(s.rawSkip ?? 20)), lastUser = (() => { for (let i = msgs.length - 1; i >= 0; i--) if (isUserMessage(msgs[i])) return i; return -1; })();
    const upto = Math.max(0, Math.min(lastUser >= 0 ? lastUser : msgs.length, msgs.length - skip));   // 요청에 그대로 실리는 최근 대화·지금 말은 뺀다
    if (upto < 4) return null;
    const scenes = (folder?.scenes ?? []).filter((x) => !x.orphan && Number.isInteger(x.at)).sort((a, b) => a.at - b.at);
    const dateOf = (mi) => { const sc = scenes.find((x) => x.at >= mi) ?? scenes.at(-1); return sc?.when ? String(sc.when).replace(/\s+/g, " ").slice(0, 40) : ""; };
    const from = Math.max(0, upto - Math.max(200, Number(s.rawMaxMessages ?? 3000)));   // 아주 긴 채팅은 최근 3000개 메시지까지만 조각낸다(모바일 계산량)
    const list = []; for (let i = from; i < upto; i++) { const t = cleanForMemory(extractMessageText(msgs[i]));   // 2.2.4 태그·생각 글을 빼고 조각낸다(넣는 토큰도 줄어듦)
      if (t.trim()) list.push({ text: t, who: isUserMessage(msgs[i]) ? "{{user}}" : String(character?.name ?? "{{char}}"), mi: i }); }
    const chunks = buildChunks(list, dateOf);
    const fid = folderIdOf(character.chaId, chatKeyOf(chat));
    // 응답을 오래 붙잡지 않는다: 원문 벡터가 아직 없으면 1.5초만 기다리고(그 사이 만든 만큼만 쓴다) 나머지는 뒤에서 계속 만든다
    const sem = await embedder.rawScores(fid, chunks, query, { budgetMs: Number(s.rawBudgetMs ?? 1500) }).catch(() => null);
    const fused = rrf([sem, lexScores(chunks, query)]);
    let ranked = [...fused].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    // 2.2.4 재정렬(선택): 상위 후보를 고르기 모델(Jev 등)이 0~3점으로 매기고, 기준 넘는 것만 점수 순으로 넣는다 — 같은 정확도를 더 적은 토큰으로
    if (rerank && s.rawRerank !== false && ranked.length) {
      const byId = new Map(chunks.map((c) => [c.id, c])), pool = ranked.slice(0, Math.max(4, Number(s.rawRerankPool ?? 40))).map((id) => byId.get(id)).filter(Boolean);
      const recent = msgs.slice(Math.max(0, msgs.length - 3)).map((m) => `${isUserMessage(m) ? "{{user}}" : String(character?.name ?? "{{char}}")}: ${cleanForMemory(extractMessageText(m))}`).join("\n").slice(-1500);
      try {
        const sc = await rerank({ query, recent, items: pool.map((c) => ({ id: c.id, text: `${c.date ? `[${c.date}] ` : ""}${c.t}` })) });
        if (sc?.size) { const min = Number(s.rawRerankMin ?? 1.5), order = new Map(ranked.map((id, i) => [id, i])); ranked = [...sc].filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1] || order.get(a[0]) - order.get(b[0])).map(([id]) => id); }
      } catch (e) { log("원문 재정렬 건너뜀", e?.message ?? e); logFailure({ area: "Jev 재정렬", title: "원문 회상 후보를 Jev로 고르지 못했어요", error: e, fallback: "원래 순서로 넣었어요", ctx: { 후보: pool.length } }); }
    }
    const out = assemble(chunks, ranked, { tokens: Number(s.rawTokens ?? 1500), neighbor: Number(s.rawNeighbor ?? 1), maxPicks: Number(s.rawPicks ?? 12), perDate: Number(s.rawPerDate ?? 0) });
    return out.lines.length ? { text: [RAW_TITLE, ...out.lines].join("\n"), tokens: out.tokens, count: out.lines.length } : null;
  }
  async function beforeRequest(messages, type, { focus = null } = {}) {
    try {
      if (type && type !== "model") return messages;
      const cur = await current(); if (!cur) return messages;
      // 2.2.29: 기억 블록 만들기가 오래 걸리면(저장소가 바쁨 등) 기다리지 않고 원래 요청을 보낸다 — 메인 요청이 안 나가 멈춘 듯 보이던 문제
      const c = await Promise.race([compose(cur, { focus }), new Promise((r) => setTimeout(() => r({ reason: "timeout" }), 12000))]);
      if (c?.reason === "timeout") log("기억 블록 만들기가 늦어 이번 요청은 기억 없이 보냈어요");
      try { Promise.resolve(onRequest?.()).catch(() => {}); } catch { /* 요청을 막지 않는다 */ }
      if (!c?.text) { last = { at: Date.now(), injected: false, manifest: c?.manifest ?? null, reason: c?.reason ?? "" }; return messages; }
      // 요약된 옛 대화 빼고 보내기(설정, 기본 꺼짐): 기억이 실제로 들어갈 때만, 분석이 끝난 옛 대화만 뺀다
      let send = messages, dropped = 0;
      // 2.2.11: process 훅이 달려 있으면 리스가 이미 번호로 뺐다(아래는 훅이 없는 환경의 예비 — 요청 글 앞부분 맞추기)
      if (c.trim && procOn) dropped = Math.max(0, trimState.from);
      else if (c.trim) { const r = trimCovered(messages, cur.chat.message ?? [], { keepTurns: c.trim, step: c.trim, coveredAt: c.coveredAt }); send = r.messages; dropped = r.dropped;
        // 11-22: 뺄 옛 대화가 있는데 하나도 못 뺐으면(요청 글 모양이 달라 못 찾음) 기록에 알린다
        if (!dropped && trimUntil(cur.chat.message ?? [], { keepTurns: c.trim, step: c.trim, coveredAt: c.coveredAt }) >= 0) logEvent({ area: "기억 넣기", title: "이 프리셋에서는 옛 대화를 찾지 못해 빼지 못했어요(‘남길 최근 턴’이 동작하지 않음)" }); }
      // 11-22: 빼기는 리스가 토큰을 센 뒤(요청 직전)라 리스 정보창 '입력 토큰'은 빼기 전 숫자 → 기록에 줄인 양을 알린다
      const saved = send !== messages && dropped ? trimSaved(messages, send) : 0;
      if (saved) logEvent({ area: "기억 넣기", title: `이번 요청에서 옛 대화 ${dropped}개를 빼서 약 ${saved.toLocaleString()}토큰을 줄였어요`, detail: { 안내: "리스 정보창의 '입력 토큰'은 빼기 전 숫자예요. 실제로 보낸 양은 이만큼 적어요." } });
      last = { at: Date.now(), injected: true, manifest: c.manifest, text: c.text, dropped, saved };
      logEvent({ area: "기억 넣기", title: "요청에 기억 블록을 넣었어요", detail: { 글자: c.text?.length ?? 0, 위치: c.position } });
      return insertBlock(send, wikiAware(c.text, send), c.position);
    } catch (e) { log("주입 실패", e?.message ?? e); return messages; }
  }
  // 지금 열린 채팅에 다음 요청 때 들어갈 블록을 미리 만들어 본다. 저장 데이터·사용 횟수는 건드리지 않는다.
  async function preview() {
    const cur = await current(); if (!cur) return { ok: false, why: "리스에서 채팅을 연 상태에서 볼 수 있어요." };
    const c = await compose(cur, { mark: false });
    if (!c?.text) return { ok: true, injected: false, raw: c?.raw ?? "", manifest: c?.manifest ?? null, reason: c?.reason ?? "" };
    return { ok: true, injected: true, text: c.text, raw: c.raw, manifest: c.manifest, position: c.position, botId: String(cur.character.chaId), chatId: chatKeyOf(cur.chat, cur.ti ?? 0) };
  }
  // 훅이 없는 환경: 분석 뒤 채팅 localLore의 [Dusk 기억] 항목을 갱신.
  async function syncLore(ci, ti) {
    const cur = { character: await api.getCharacterFromIndex(ci), chat: await api.getChatFromIndex(ci, ti) };
    if (!cur.chat) return false;
    const c = await compose(cur);
    const next = upsertLoreEntry(cur.chat.localLore, c?.text ?? "");
    if (JSON.stringify(next) === JSON.stringify(cur.chat.localLore ?? [])) return false;
    await api.setChatToIndex(ci, ti, { ...cur.chat, localLore: next });
    return true;
  }
  // 요약된 옛 대화 빼고 보내기(2.2.11, HypaPlus 방식): 리스 처리 단계(process)에서 분석이 끝난 옛 메시지를 번호(chat_index)로 뺀다.
  // 요청 글 모양과 상관없이 빠진다. 메시지마다 불리므로 경계는 한 번 구해 2초 동안 같이 쓴다.
  let procOn = false, trimState = { at: 0, from: -1, p: null };
  async function computeTrimFrom() {
    const cur = await current(); if (!cur) return -1;
    const idx = await store.getIndex(), inj = idx.settings.inject ?? {};
    if (idx.settings.backend === "off" || inj.on === false || inj.trimOld === false || idx.bots[String(cur.character.chaId)]?.on === false) return -1;
    const msgs = cur.chat.message ?? [];
    const folder = await loadReconciled(store, cur.character.chaId, chatKeyOf(cur.chat), msgs);
    if (!injectVerdict(folder, inj, msgs.filter(isUserMessage).length).ok) return -1;   // 기억이 들어가지 않을 채팅이면 빼지 않는다
    const keep = Math.max(4, Number(inj.trimKeep) || TRIM_KEEP);
    const until = trimUntil(msgs, { keepTurns: keep, step: keep, coveredAt: Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : -1 });
    return until >= 0 ? until + 1 : -1;
  }
  function trimFrom() {
    if (trimState.p) return trimState.p;
    if (Date.now() - trimState.at < 2000) return Promise.resolve(trimState.from);
    trimState.p = computeTrimFrom().catch((e) => { log("옛 대화 빼기 계산 실패", e?.message ?? e); return -1; })
      .then((from) => { trimState = { at: Date.now(), from, p: null }; return from; });
    return trimState.p;
  }
  const onProcess = async (text) => { try { const f = await trimFrom(); return f > 0 && typeof text === "string" ? gateProcess(text, f) : text; } catch { return text; } };
  // 2.2.29: process 단계 번호 빼기는 쓰지 않는다 — 응답 글 속 중괄호(}})로 조건문 짝이 어긋나거나, 리스가 긴 채팅을 자를 때 번호가 달라지면
  // 최근 메시지까지 빠져 모델이 새 입력을 무시하고 예전 대답을 되풀이할 수 있었다(약 30턴 뒤 ‘A3 → B1’ 제보). 요청 직전 맞추기(trimCovered)만 쓴다.
  async function startTrim() {
    return false;
    // eslint-disable-next-line no-unreachable
    if (procOn || typeof api.addRisuScriptHandler !== "function") return procOn;
    try { await api.addRisuScriptHandler("process", onProcess); procOn = true; } catch (e) { log("process 훅 등록 실패(요청 글 맞추기로 대신)", e?.message ?? e); }
    return procOn;
  }
  async function stopTrim() {
    if (!procOn) return;
    try { await api.removeRisuScriptHandler?.("process", onProcess); } catch { /* 이미 없음 */ }
    procOn = false;
  }
  async function start() {
    if (typeof api.addRisuReplacer === "function") {
      try { await api.addRisuReplacer("beforeRequest", beforeRequest); mode = "hook"; return "hook"; } catch (e) { log("beforeRequest 훅 등록 실패", e?.message ?? e); }
    }
    mode = "lore"; return "lore";
  }
  // v1.6.4: 턴 흐름이 요청 직전 훅 하나로 위키·Dusk 블록을 같이 넣을 때는 이 훅을 내려 이중 주입을 막는다.
  async function stop() {
    if (mode !== "hook") return false;
    try { await api.removeRisuReplacer?.("beforeRequest", beforeRequest); mode = "none"; return true; } catch (e) { log("beforeRequest 훅 해제 실패", e?.message ?? e); return false; }
  }
  return { start, stop, startTrim, stopTrim, trimFrom, onProcess, beforeRequest, compose, preview, syncLore, current, lastRequest: () => last, mode: () => mode };
}
