// Dusk Saga 시험판 애드온: 게임을 섀도 DOM 전체 화면으로 띄운다(본체 화면과 스타일이 섞이지 않게). 게임 코드는 처음 열 때 돈다
import CSS from "./style.css";
import BAG_CSS from "./bag.css";
const GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>';
import { statTabHtml } from "../../src/rpg/engine/memlink.js";
import { createMemoryLink } from "../../src/rpg/data/memorylink.js";
import { compactPrompt, parseCompact } from "../../src/rpg/engine/compact.js";
import { storyNote, plainResults, RESULT_BLOCK_RE, cardFromPlain } from "../../src/rpg/engine/digest.js";
import { ledgerOf, ledgerNote, partyLine } from "../../src/rpg/engine/ledger.js";
import { QUEST_PROMPT, parseQuests, addQuests, questLine, worldLine, worldOf, applyMoneyMarks, MONEY_RE } from "../../src/rpg/engine/world.js";
const css = CSS.replace(/:root/g, ":host").replace(/(^|[\s,}>])body(?=[[{:.,\s])/g, "$1.sbody");
export async function activate(api, ctx) {
  const dusk = ctx.dusk, ext = dusk?.ext ?? ctx.ext ?? ctx.app?.ext; let host = null, H = null, timer = 0, dead = false;
  const offTab = ext?.add?.("svc", "rpgStats", { tabFor: (folder, names) => statTabHtml(folder, names) }); let memory = null; try { memory = createMemoryLink(ext, { log: (...a) => console.log("[Dusk Saga]", ...a) }); } catch (e) { console.log("[Dusk Saga] 장기기억 연계 건너뜀", e?.message ?? e); }
  // 저장: 이 애드온 전용 저장소에 한 덩어리로(묶어서 늦게 쓴다)
  const data = { ...((await dusk?.storage?.get?.("game", {})) ?? {}) }, flush = () => { clearTimeout(timer); timer = 0; return dusk?.storage?.set?.("game", data); }, later = () => { clearTimeout(timer); timer = setTimeout(flush, 700); };
  const store = { getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null), setItem: (k, v) => { data[k] = String(v); later(); }, removeItem: (k) => { delete data[k]; later(); } };
  // 채팅마다 따로 쓰는 값(장부·이번 싸움 요약·본문 카드 자리)은 한 덩어리가 아니라 키마다 따로 저장하고 자주 다시 읽는다:
  // 다른 기기에서 생긴 싸움 요약도 보이고, 오래된 덩어리가 다른 기기의 진행을 덮어쓰지 않게(예전 덩어리 값은 읽기만 하고 옮긴다)
  const CK = {}, cget = (k) => (Object.prototype.hasOwnProperty.call(CK, k) ? CK[k] : data[k] ?? null);
  const wroteAt = {}, cset = (k, v) => { CK[k] = v; wroteAt[k] = Date.now(); if (Object.prototype.hasOwnProperty.call(data, k)) { delete data[k]; later(); } Promise.resolve(v == null ? dusk?.storage?.remove?.("c:" + k) : dusk?.storage?.set?.("c:" + k, v)).catch(() => {}); };
  const cpull = async (k) => { if (Date.now() - (wroteAt[k] || 0) < 4000) return cget(k); try { const v = await dusk?.storage?.get?.("c:" + k, null); if (Date.now() - (wroteAt[k] || 0) < 4000) return cget(k); if (v != null) CK[k] = v; else if (data[k] != null) cset(k, data[k]); else CK[k] = null; } catch { /* 다음에 */ } return cget(k); };
  const pullChat = async (key) => { if (key) await Promise.all([cpull(key), cpull("brief:" + key), cpull("enc-idx:" + key)]); };
  // 채팅별 장부: 동료·가방·기록. 키는 봇+채팅. 장기기억이 켜져 있으면 폴더에도 남긴다
  let lastKey = ""; const chatKey = async () => { const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), c = await api.getCharacterFromIndex(ci), ch = await api.getChatFromIndex(ci, ti); return (lastKey = "ledger:" + (c?.chaId ?? ci) + ":" + (ch?.id ?? ti)); }; const keyTimer = setInterval(() => { if (document.hidden) return; chatKey().then(pullChat).catch(() => {}); }, 6000); chatKey().then(pullChat).catch(() => {});
  const ledger = { get: async () => { const k = await chatKey(); await cpull(k); return ledgerOf(cget(k)); }, put: async (L) => { cset(await chatKey(), JSON.stringify(L)); later(); try { await memory?.ledger?.(L); } catch { /* 장기기억 없음 */ } },
    recent: async () => { const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), ch = await api.getChatFromIndex(ci, ti); return (ch?.message ?? []).slice(-6).map((m) => textOf(m)).join("\n"); },
    battle: async (S) => { try { const id = S.battle.name + ":" + Date.now(); await memory?.battle?.(S, id, []); } catch { /* 장기기억 없음 */ } } };
  // 지금 채팅의 봇·유저 이름만 가져온다(바깥으로 보내지 않는다)
  const cast = async () => { const ci = await api.getCurrentCharacterIndex(), c = await api.getCharacterFromIndex(ci), out = []; const n = String(c?.name ?? "").trim().slice(0, 20); if (n) out.push(n); return out; };
  // 이야기로 전투 만들기: 최근 대화를 읽혀 JSON 한 덩어리를 받는다. 메인·보조 모델 모두 '생성 중지'에 잡힌다
  const textOf = (m) => String(m?.data ?? m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // 로어북의 인물 항목(이름·첫 줄) — 난입 후보로 쓸 수 있게
  const lore = (c) => { const l = (c?.globalLore ?? []).filter((e) => e && (e.content || "").length > 20 && !/^@@|{{/.test(e.content)).slice(0, 14).map((e) => `- ${String(e.comment || e.key || "").split(",")[0].slice(0, 30)}: ${String(e.content).replace(/\s+/g, " ").slice(0, 140)}`); return l.length ? `\n\n[로어북 인물]\n${l.join("\n").slice(0, 1800)}` : ""; };
  const gen = async ({ model, later, signal, roster }) => { const bk = "brief:" + (await chatKey()); await cpull(bk); const brief = cget(bk) || ""; if (brief) { cset(bk, null); } const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), c = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti), lines = (chat?.message ?? []).slice(-16).map((m) => `${m.role === "user" ? "유저" : c?.name ?? "봇"}: ${textOf(m).slice(0, 1400)}`), sys = compactPrompt(undefined, later, roster), msgs = [{ role: "system", content: sys }, { role: "user", content: `[봇: ${c?.name ?? ""}]\n${String(c?.desc ?? "").slice(0, 1200)}\n\n[최근 이야기]\n${lines.join("\n")}${brief ? `\n\n[지금 벌어진 싸움]\n${brief}` : ""}${(() => { try { const q = questLine(ledgerOf(cget(lastKey))); return q ? "\n\n[" + q + "]" : ""; } catch { return ""; } })()}${lore(c)}\n\n위 이야기로 전투 하나를 정해진 줄 형식으로만.` }];
    const run = dusk?.lib?.["src/engine/runai.js"]?.runAI; let out; if (run) out = await run(api, msgs, { mode: model === "model" ? "model" : "submodel", stage: "Dusk Saga 전투 만들기" }, signal); else out = await dusk.ai.run(msgs.slice(1), { system: sys, signal }); let t = String(out ?? ""); if (!parseCompact(t) && t.indexOf("{") < 0 && run) { const again = msgs.concat([{ role: "assistant", content: t.slice(0, 1500) }, { role: "user", content: "형식이 틀렸어요. 설명 없이 위 규칙의 줄(전장 …, 아군 …, 적 …)만 다시 쓰세요." }]); t = String((await run(api, again, { mode: model === "model" ? "model" : "submodel", stage: "Dusk Saga 전투 다시 만들기" }, signal)) ?? ""); } if (parseCompact(t)) return t; // 줄 형식이면 글 그대로 돌려줘 동료 다시 쓰기·성장까지 판에서 읽는다
    const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) throw new Error("모델 답에서 전투를 못 읽었어요"); return JSON.parse(t.slice(a, b + 1)); }; // 적은 토큰 줄 형식이 기본, 예전 JSON 답도 읽는다
  // 짧은 AI 물음(세계 읽기·의뢰 만들기): 지금 채팅의 봇 설명과 최근 대화를 함께 준다. 보조 모델이 기본
  const ask = async (system, want, o = {}) => { const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), c = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti), lines = (chat?.message ?? []).slice(-(o.n || 10)).map((m) => `${m.role === "user" ? "유저" : c?.name ?? "봇"}: ${textOf(m).slice(0, 900)}`), msgs = [{ role: "system", content: system }, { role: "user", content: `[봇: ${c?.name ?? ""}]\n${String(c?.desc ?? "").slice(0, 1500)}${lore(c)}\n\n[최근 이야기]\n${lines.join("\n")}\n\n${want}` }];
    const run = dusk?.lib?.["src/engine/runai.js"]?.runAI, mode = (data["ask-model"] || "submodel") === "model" ? "model" : "submodel"; const out = run ? await run(api, msgs, { mode, stage: "Dusk Saga " + (o.stage || "세계") }, o.signal) : await dusk.ai.run(msgs.slice(1), { system, signal: o.signal }); return String(out ?? ""); };
  // 의뢰 자동 만들기(설정 quest-mode: off·story·auto·manual). 한 채팅에서 10분에 한 번까지
  let questBusy = false, outCount = 0; const questTry = async (why) => { if (questBusy || !lastKey) return; const L = ledgerOf(cget(lastKey)); if ((L.quests || []).filter((q) => q.status === "open").length >= 3) return; if (Date.now() - (L.questAt || 0) < 6e5) return; questBusy = true; try { const t = await ask(QUEST_PROMPT(L, 3), "위 세계와 지금 장면에 맞는 의뢰를 정해진 줄 형식으로만."), qs = parseQuests(L, t); if (qs.length) { const L2 = ledgerOf(cget(lastKey)); addQuests(L2, qs); L2.questAt = Date.now(); cset(lastKey, JSON.stringify(L2)); later(); ctx.toast?.(`새 의뢰 ${qs.length}건이 게시판에 올라왔어요 — 가방 › 길드`, { seconds: 6 }); } } catch (e) { console.log("[Dusk Saga] 의뢰 만들기 실패", why, e?.message ?? e); } finally { questBusy = false; } };
  const QUEST_WORD = /길드|게시판|의뢰|퀘스트|협회|용병|조합|현상금|수배|표국|자경단/;
  // 끝난 전투의 결과를 다음 입력 끝에 한 번만 붙인다(지금 방식: storyNote)
  const KEY = "dusk-saga-dev"; let offRep = null; try { offRep = await api.addRisuReplacer?.("beforeRequest", (messages, type) => { try { if (type !== "model" || !Array.isArray(messages)) return messages; messages = messages.map((m) => (typeof m?.content === "string" && /dsg-(enc|res)|\[\[ENCOUNTER#/.test(m.content) ? { ...m, content: plainResults(m.content.replace(CARD_RE, "").replace(ENC_MARK_RE, "")).replace(/\s+$/, "") } : m)); ENC_MARK_RE.lastIndex = 0; CARD_RE.lastIndex = 0; const raw = data[KEY], S = raw ? JSON.parse(raw) : null, parts = []; if (S && S.battle && S.battle.status !== "active" && S.seq > S.sent) { const n = storyNote(S); if (n) { parts.push(n); S.sent = S.seq; data[KEY] = JSON.stringify(S); } }
      // 장부 기록(전리품·정비·제작)도 이 채팅 것만 한 번 싣는다
      if (lastKey && cget(lastKey)) { const L = ledgerOf(cget(lastKey)), t = ledgerNote(L), pl = partyLine(L), wl = worldLine(L); if (pl) parts.push(pl); if (wl) parts.push(wl); if (data["money-auto"] === "1") parts.push(`(이야기 속에서 일행이 돈을 받거나 쓰면 답 마지막 줄에 [[돈: +금액 이유]] 또는 [[돈: -금액 이유]]. 단위: ${worldOf(L).money.units.map((u) => u.n).join("·")})`); if (t) { parts.push(t); cset(lastKey, JSON.stringify(L)); } }
      // 자동 전투 감지: 켜져 있으면 모델에게 싸움이 터질 때만 표시 한 줄을 달게 한다(짧은 지시 한 줄)
      const hint = data["auto-detect"] !== "0" ? "[Dusk Saga 전투 규칙 — 가장 먼저 지킬 것] 싸움(토벌·습격·결투·매복·몬스터·적과의 교전)은 이야기가 아니라 게임이 결정한다. 이번 답이 싸움 직전이나 싸움으로 이어지는 상황이면 — 적과 마주쳤거나, 적이 모습을 드러냈거나, 대치·포위·습격이 시작됐거나, 유저가 공격·진입·도전을 선언했으면 — 그 순간에서 답을 끝낸다. 그 뒤로는 한 줄도 더 진행하지 않는다: 첫 공격, 기술, 싸움의 경과, 피해, 승패, 도망, 결말을 절대 쓰지 않고, 다음 장면으로 넘어가지도 않는다. 싸움을 피하거나 미루려고 이야기를 비틀지도 않는다. 답의 맨 마지막 줄에 정확히 [[전투: 누가 누구와, 어디서, 왜 — 한 문장]] 을 쓴다(게임이 이것을 읽고 ENCOUNTER 카드를 띄운다). 싸움이 없는 장면이면 아무것도 붙이지 않는다. 이 줄은 화면에서 자동으로 바뀐다. 앞서 [전투 결과]가 입력으로 들어왔다면 그 결과를 사실로 받아 그 뒤를 잇는다(결과를 바꾸거나 싸움을 다시 쓰지 않는다)." : "";
      if (!parts.length && !hint) return messages; const i = messages.map((m) => m.role).lastIndexOf("user"); if (i < 0) return messages; const out = messages.slice(); if (hint) parts.push("(싸움 직전이면 그 순간에서 답을 끝내고 더 진행하지 말 것 — 마지막 줄에 [[전투: 누가 누구와, 어디서, 왜]]만)"); if (parts.length) out[i] = { ...out[i], content: String(out[i].content ?? "") + "\n\n" + parts.join("\n\n") }; if (hint) out.push({ role: "system", content: hint }); later(); return out; } catch (e) { console.log("[Dusk Saga] 결과 싣기 실패", e?.message ?? e); return messages; } }); } catch (e) { console.log("[Dusk Saga] 결과 싣기 등록 실패", e?.message ?? e); }
  // 답에서 [[전투: …]] 표시를 지우고, 이 채팅의 ‘다음 전투 요약’으로 기억한 뒤 알린다
  // 요청 종류: 본 답이 아닌 것(기억 요약·번역·감정 등)만 건너뛴다
  const AUX = new Set(["memory", "emotion", "translate", "otherAx", "submodel-memory"]);
  const fire = (brief) => { if (lastKey) { cset("brief:" + lastKey, brief); cset("enc-idx:" + lastKey, null); later(); } encHot = Date.now() + 40000; setTimeout(() => encSync().catch(() => {}), 400);
    if (data["auto-open"] === "1") setTimeout(async () => { try { await duskOpen(); await open("gen"); } catch (e) { console.log("[Dusk Saga] 자동 열기 실패", e?.message ?? e); } }, 900); };
  // 본문 카드: 싸움 직전 답의 말풍선 바로 아래에 ‘⚔️ 전투 시작’ 카드를 붙인다(리스가 다시 그려도 다시 붙인다). 전투를 만들거나 넘기면 사라진다
  const encEsc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const CARD_RE = /<div [^>]*(?:dsg-enc|--dsg:enc)[^>]*>[\s\S]*?<\/div>/g;
  const CBTN = "display:inline-block;border-radius:6px;padding:8px 16px;font-weight:900;font-size:13px;cursor:pointer;user-select:none";
  const STRIPE = "display:block;height:10px;background:repeating-linear-gradient(-60deg,#111 0 12px,#f2c230 12px 24px)";
  /** 본문에 넣는 경고 카드(인라인 스타일, 안쪽은 span만 — 정규식으로 통째로 찾고 바꾸기 쉽게) */
  const ENC_MARK_RE = /\[\[ENCOUNTER#([a-z0-9]+)(?: (이어짐|넘김))?: ?([^\]]{0,260})\]\]/g, newId = () => Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const encDone = (state, brief) => (state === "이어짐" ? `<div style="margin:10px 0 4px;padding:6px 12px;border-radius:8px;border-left:4px solid #e0283a;background:#16070b;color:#f6ecdf;font-size:.9em">⚔️ 전투로 이어짐 — ${encEsc(brief)}</div>` : `<div style="margin:10px 0 4px;padding:6px 12px;border-radius:8px;border-left:4px solid #777;background:#1a1a1e;color:#cfc6b6;font-size:.9em">↩ 싸우지 않고 넘김</div>`);
  /** 표시할 때만: 본문의 짧은 표식 → 카드(저장되는 글에는 표식만 남는다) */
  const toCards = (text) => String(text).replace(CARD_RE, (m) => { const id = /(?:--dsg:go-|dsg-id-)([a-z0-9]+)/.exec(m)?.[1]; const b = (/dsg-brief[^>]*>([\s\S]*?)<\/span>/.exec(m)?.[1] || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); return /dsg-done/.test(m) ? m : encCard(b, id || newId()); }).replace(/<div [^>]*(?:dsg-res|--dsg:res)[^>]*>[\s\S]*?<\/div>/g, (m) => cardFromPlain(plainResults(m))).replace(ENC_MARK_RE, (m, id, st, b) => (st ? encDone(st, b) : encCard(b, id))).replace(RESULT_BLOCK_RE, (m) => cardFromPlain(m));
  const encCard = (brief, id = newId()) => { return `<div class="dsg-enc" style="--dsg:enc;display:block;margin:12px 0 6px;border-radius:10px;overflow:hidden;background:#16070b;border-top:3px solid #e0283a;border-bottom:3px solid #e0283a;color:#f6ecdf;box-shadow:0 6px 18px #0008"><span class="dsg-stripe" style="${STRIPE}"></span><span style="display:flex;gap:14px;align-items:center;padding:12px 14px"><span class="dsg-tri" style="flex:none;width:50px;height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;box-sizing:border-box;background:#f2c230;clip-path:polygon(50% 0,100% 100%,0 100%);color:#16070b;font:900 24px/1 sans-serif">!</span><span style="flex:1;min-width:0;display:block"><span class="dsg-title" style="display:block;font:900 19px/1 sans-serif;letter-spacing:.18em;color:#ff5a5a;text-shadow:0 0 10px #ff2a3a99">ENCOUNTER</span><span style="display:block;font-weight:900;color:#f2c230;margin:4px 0 2px">⚔️ 전투 직전</span><span class="dsg-brief" style="display:block;opacity:.92;margin-bottom:10px">${encEsc(brief).slice(0, 220)}</span><span style="display:flex;gap:8px;flex-wrap:wrap"><span class="dsg-go dsg-id-${id}" style="--dsg:go-${id};${CBTN};background:#e0283a;color:#fff;box-shadow:0 0 0 2px #f2c230 inset">전투 시작</span><span class="dsg-skip dsg-id-${id}" style="--dsg:skip-${id};${CBTN};background:#ffffff14;color:#f6ecdf">싸우지 않고 넘기기</span></span></span></span><span class="dsg-stripe" style="${STRIPE}"></span></div>`; };
  const ENC_CSS = `[x-dsg="card"]{position:relative;display:block;width:100%;max-width:100%;box-sizing:border-box;margin:12px 0 6px;overflow:hidden;border-radius:10px;background:#16070b;border-top:3px solid #e0283a;border-bottom:3px solid #e0283a;box-shadow:0 0 0 1px #e0283a55,0 6px 24px #e0283a33;color:#f6ecdf;font-size:13px;line-height:1.5;writing-mode:horizontal-tb;animation:dsgIn .5s cubic-bezier(.2,.9,.3,1.2) both}
[x-dsg="glow"]{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 50%,#b5202b66,transparent 70%);animation:dsgPulse 1.6s ease-in-out infinite;pointer-events:none}
[x-dsg~="stripe"]{position:relative;height:12px;background:repeating-linear-gradient(-60deg,#111 0 12px,#f2c230 12px 24px);background-size:28px 100%;animation:dsgRun .6s linear infinite}
[x-dsg~="low"]{animation-direction:reverse}
[x-dsg="mid"]{position:relative;display:flex;gap:14px;align-items:center;padding:12px 14px}
[x-dsg="tri"]{flex:none;width:54px;height:48px;display:grid;place-items:end center;padding-bottom:4px;box-sizing:border-box;background:#f2c230;clip-path:polygon(50% 0,100% 100%,0 100%);color:#16070b;font:900 26px/1 sans-serif;animation:dsgSlam .55s cubic-bezier(.3,1.6,.5,1) .15s both,dsgBlink 1.2s steps(2) .8s infinite}
[x-dsg="box"]{flex:1;min-width:0}
[x-dsg="title"]{font:900 20px/1 sans-serif;letter-spacing:.18em;color:#ff5a5a;text-shadow:0 0 10px #ff2a3a99;animation:dsgShake .4s .2s both}
[x-dsg="sub"]{font-weight:900;color:#f2c230;margin:4px 0 2px}
[x-dsg="text"]{opacity:.92;word-break:keep-all;margin-bottom:10px}
[x-dsg="row"]{display:flex;gap:8px;flex-wrap:wrap}
[x-dsg="go"],[x-dsg="skip"]{border:0;border-radius:6px;padding:8px 16px;font-weight:900;font-size:13px;cursor:pointer}
[x-dsg="go"]{background:#e0283a;color:#fff;box-shadow:0 0 0 2px #f2c230 inset;animation:dsgPulseBtn 1.2s ease-in-out infinite}
[x-dsg="skip"]{background:#ffffff14;color:#f6ecdf}
@keyframes dsgIn{from{opacity:0;transform:translateY(8px) scaleY(.6)}}
@keyframes dsgRun{to{background-position:28px 0}}
@keyframes dsgPulse{50%{opacity:.35}}
@keyframes dsgSlam{from{transform:scale(3) rotate(-30deg);opacity:0}}
@keyframes dsgBlink{50%{filter:brightness(1.35)}}
@keyframes dsgShake{0%{transform:translateX(-6px);opacity:0}30%{transform:translateX(5px)}60%{transform:translateX(-3px)}100%{transform:none;opacity:1}}
@keyframes dsgPulseBtn{50%{box-shadow:0 0 0 2px #f2c230 inset,0 0 14px #e0283a}}
@media (prefers-reduced-motion:reduce){[x-dsg]{animation:none!important}}
.x-risu-dsg-go,.dsg-go{animation:dsgPulseBtn 1.2s ease-in-out infinite}.x-risu-dsg-stripe,.dsg-stripe{background-size:28px 100%!important;animation:dsgRun .6s linear infinite}.x-risu-dsg-tri,.dsg-tri{animation:dsgSlam .55s cubic-bezier(.3,1.6,.5,1) both}.x-risu-dsg-title,.dsg-title{animation:dsgShake .4s .2s both}`;
  const ENC = "x-dusk-saga-enc"; let encBusy = false, encDenied = false;
  // 본문 카드: 카드는 답 본문 안에 실제로 들어 있다(채팅과 함께 저장·동기화). 여기서는 화면의 버튼에 눌림만 잇는다
  let encStyled = false, encHot = 0;
  const encSync = async () => {
    if (encBusy || encDenied || dead || typeof api.getRootDocument !== "function") return; encBusy = true;
    try {
      const root = await api.getRootDocument(); if (!root) return;
      let found = false; if (!encStyled && !(await root.querySelector('style[x-dusk="saga-enc"]'))) { const st = await root.createElement("style"); await st.setAttribute("x-dusk", "saga-enc"); await st.setInnerText(ENC_CSS); const head = (await root.querySelector("head")) || (await root.querySelector("body")); await head.appendChild(st); } encStyled = true;
      for (let n = 0; n < 12; n++) {
        const bt = await root.querySelector('[style*="--dsg:go-"]:not([x-dsgb]), [style*="--dsg:skip-"]:not([x-dsgb]), .x-risu-dsg-go:not([x-dsgb]), .x-risu-dsg-skip:not([x-dsgb]), .dsg-go:not([x-dsgb]), .dsg-skip:not([x-dsgb])'); if (!bt) break; await bt.setAttribute("x-dsgb", "1");
        const cls = String((await bt.getAttribute("style")) || "") + " " + String((await bt.getAttribute("class")) || ""), id = /--dsg:(?:go|skip)-([a-z0-9]+)|dsg-id-([a-z0-9]+)/.exec(cls)?.slice(1).find(Boolean) || "", go = /--dsg:go-|dsg-go/.test(cls); found = true;
        await bt.addEventListener("click", async () => { try { await encClick(id, go); } catch (e) { ctx.toast?.("전투 카드 처리 실패: " + (e?.message ?? e)); } });
      }
    } catch (e) { if (/permission|denied|권한/i.test(String(e?.message ?? e))) encDenied = true; } finally { encBusy = false; }
  };
  // 카드 버튼: 전투 시작 → 이번 싸움 요약을 넘기고 전투 판, 넘기기 → 카드를 작은 표시로. 어느 쪽이든 그 메시지 본문의 카드를 바꿔 저장한다
  const encClick = async (id, go) => {
    const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), ch = await api.getChatFromIndex(ci, ti); if (!ch) return;
    const msgs = ch.message ?? []; let k = -1; for (let i = msgs.length - 1; i >= 0; i--) if (String(msgs[i]?.data ?? "").includes("#" + id) || String(msgs[i]?.data ?? "").includes("-" + id)) { k = i; break; } if (k < 0) return;
    const mk0 = new RegExp("\\[\\[ENCOUNTER#" + id + ": ?([^\\]]{0,260})\\]\\]").exec(String(msgs[k].data));
    if (mk0) { const brief = mk0[1]; const message = msgs.slice(); message[k] = { ...msgs[k], data: String(msgs[k].data).replace(mk0[0], `[[ENCOUNTER#${id} ${go ? "이어짐" : "넘김"}: ${brief}]]`) }; await api.setChatToIndex(ci, ti, { ...ch, message }); const key = await chatKey(); if (go) { cset("brief:" + key, brief); await duskOpen(); await open("gen"); } else cset("brief:" + key, null); return; }
    const card = CARD_RE.exec(String(msgs[k].data)); CARD_RE.lastIndex = 0; const brief = card ? (/dsg-brief[^>]*>([\s\S]*?)<\/span>/.exec(card[0])?.[1] || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";
    const done = go ? `<div class="dsg-enc dsg-done" style="margin:10px 0 4px;padding:6px 12px;border-radius:8px;border-left:4px solid #e0283a;background:#16070b;color:#f6ecdf;font-size:.9em">⚔️ 전투로 이어짐 — ${encEsc(brief)}</div>` : `<div class="dsg-enc dsg-done" style="margin:10px 0 4px;padding:6px 12px;border-radius:8px;border-left:4px solid #777;background:#1a1a1e;color:#cfc6b6;font-size:.9em">↩ 싸우지 않고 넘김</div>`;
    const message = msgs.slice(); message[k] = { ...msgs[k], data: String(msgs[k].data).replace(CARD_RE, done) }; CARD_RE.lastIndex = 0; await api.setChatToIndex(ci, ti, { ...ch, message });
    const key = await chatKey(); if (go) { cset("brief:" + key, brief); await duskOpen(); await open("gen"); } else cset("brief:" + key, null);
  };
  const encTimer = setInterval(() => { if (Date.now() < encHot || ++encTick % 4 === 0) encSync().catch(() => {}); }, 1500); let encTick = 0;   // 카드가 막 생긴 뒤 40초는 1.5초마다, 평소엔 6초마다(리스와 주고받는 횟수 줄이기)
  // 표시를 빼먹은 답: 끝부분에 싸움 직전 신호가 둘 이상이고 결말(쓰러뜨렸다·끝났다)이 없으면 진입으로 본다
  const CUE = /안광|눈빛이 번뜩|번뜩였|포효|으르렁|울부짖|덮쳐|달려들|모습을 드러|살기|살의|검을 뽑|칼을 뽑|무기를 (?:뽑|들|겨누)|활시위|자세를 낮|전투 태세|습격|매복|에워싸|포위|괴물|마물|마수|거대한 (?:그림자|몸|형체)|적이|적들이|기척|돌진|발톱|송곳니|이빨을 드러|결계가 (?:찢|깨)|문이 열리|봉인이 풀/g;
  const END = /쓰러뜨렸|쓰러졌다|숨이 끊|처치했|물리쳤|전투가 끝|싸움이 끝|승리했|패배했|도망쳤|후퇴했/;
  const onEdge = (text) => { const tail = String(text).replace(/<[^>]+>/g, " ").slice(-500); const n = (tail.match(CUE) || []).length; if (n < 2 || END.test(tail)) return ""; const ss = tail.split(/(?<=[.!?…다])\s+/).map((x) => x.trim()).filter((x) => x.length > 4); return ss.slice(-2).join(" ").slice(0, 200); };
  // 답 훑기: afterRequest(답 받은 직후)와 output(표시 직전) 두 곳에 건다. 환경마다 한쪽만 불리는 일이 있어서. 같은 답은 한 번만
  const stat = { after: 0, out: 0, hit: 0, last: "" }; let seenTail = "";
  // 답을 받을 때: 돈 표시(켰을 때만) 지갑에 반영하고 지우기, 의뢰 자동 만들기
  let moneySeen = ""; const worldScan = (content, type) => { if (AUX.has(type) || typeof content !== "string") return content; try {
    if (data["money-auto"] === "1" && MONEY_RE.test(content)) { MONEY_RE.lastIndex = 0; const tail = content.slice(-200); if (tail !== moneySeen && lastKey) { moneySeen = tail; const L = ledgerOf(cget(lastKey)), n = applyMoneyMarks(L, content); if (n) { cset(lastKey, JSON.stringify(L)); later(); } } content = content.replace(MONEY_RE, "").replace(/\s+$/, ""); }
    MONEY_RE.lastIndex = 0; const mode = data["quest-mode"] || "story"; if (mode === "story" && QUEST_WORD.test(content.slice(-1500))) questTry("story"); else if (mode === "auto" && ++outCount % 8 === 0) questTry("auto");
  } catch (e) { console.log("[Dusk Saga] 세계 훑기 실패", e?.message ?? e); } return content; };
  const scan = (content, type, via) => { try { stat[via]++; content = worldScan(content, type); if (AUX.has(type) || typeof content !== "string" || data["auto-detect"] === "0") return content;
      const m = /(?:\[\[|【|\[|<|\()\s*(?:전투|교전|battle|encounter)\s*[:：]\s*([^\]】>)\n]{2,200})\s*(?:\]\]|】|\]|>|\))/i.exec(content) || /<전투>([^<]{2,200})<\/전투>/.exec(content);
      let out = m ? content.replace(m[0], "").replace(/\s+$/, "") : content; if (/dsg-enc|\[\[ENCOUNTER#/.test(out)) return out; const tail = out.slice(-160); if (tail === seenTail) return out;
      const b = m ? m[1].trim() : onEdge(content); if (!b) return out; seenTail = tail; stat.hit++; stat.last = b.slice(0, 80); fire(b); return out + "\n\n[[ENCOUNTER#" + newId() + ": " + b.replace(/[\]\n]/g, " ").slice(0, 240) + "]]";
    } catch (e) { console.log("[Dusk Saga] 답 훑기 실패", e?.message ?? e); return content; } };
  let offAfter = null; try { if (typeof api.requestPluginPermission === "function") await api.requestPluginPermission("mainDom").catch(() => false); } catch { /* 권한 없음 */ } try { offAfter = await api.addRisuReplacer?.("afterRequest", (content, type) => scan(content, type, "after")); } catch (e) { console.log("[Dusk Saga] afterRequest 등록 실패", e?.message ?? e); }
  // 화면에 보일 때만 표식 → 카드(저장되는 본문은 그대로)
  let dispOn = false; const onDisp = (text) => { try { return typeof text === "string" && (text.includes("[[ENCOUNTER#") || text.includes("[전투 결과 — ") || text.includes("dsg-")) ? toCards(text) : text; } catch { return text; } }; try { if (typeof api.addRisuScriptHandler === "function") { await api.addRisuScriptHandler("display", onDisp); dispOn = true; } } catch (e) { console.log("[Dusk Saga] display 등록 실패", e?.message ?? e); }
  let outOn = false; const onOut = (text) => scan(text, "model", "out"); try { if (typeof api.addRisuScriptHandler === "function") { await api.addRisuScriptHandler("output", onOut); outOn = true; } } catch (e) { console.log("[Dusk Saga] output 등록 실패", e?.message ?? e); }
  // 전투 결과를 이 채팅의 유저 입력으로 넣는다(보내기는 사람이 누른다). 전투를 만든 채팅이 아니면 넣지 않는다
  const toChat = async (text, want) => { try { const key = await chatKey(); if (want && want !== key) return false; const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), ch = await api.getChatFromIndex(ci, ti); if (!ch) return false; const message = [...(ch.message ?? []), { role: "user", data: String(text), time: Date.now(), chatId: "saga-" + Date.now().toString(36) }]; await api.setChatToIndex(ci, ti, { ...ch, message }); ctx.toast?.("전투 결과를 채팅에 넣었어요 — 빈 입력으로 보내기를 누르면 이야기가 이어져요"); return true; } catch (e) { console.log("[Dusk Saga] 결과 넣기 실패", e?.message ?? e); return false; } };
  // Dusk 창이 닫혀 있다가 전투 때문에 연 거라면, 전투를 닫을 때 Dusk 창도 닫아 채팅 화면으로 돌아간다
  let duskWas = true; const duskOpen = async () => { const r = ctx.app?.root; duskWas = !!r && !r.hidden; await dusk?.open?.(); };
  const close = () => { if (!host) return; H.paused = true; host.style.display = "none"; flush(); if (!duskWas) { duskWas = true; try { const r = ctx.app?.root; if (r) r.hidden = true; Promise.resolve(api.hideContainer?.()).catch(() => {}); ctx.app?.onClosed?.(); } catch (e) { console.log("[Dusk Saga] 창 닫기 실패", e?.message ?? e); } } };
  // 가방: 전투 화면과 따로 뜨는 가벼운 화면(3D·전투 코드를 안 불러온다)
  let bagHost = null, bagApi = null;
  const closeBag = () => { if (!bagHost) return; bagHost.style.display = "none"; flush(); if (!duskWas && !(host && host.style.display !== "none")) { duskWas = true; try { const r = ctx.app?.root; if (r) r.hidden = true; Promise.resolve(api.hideContainer?.()).catch(() => {}); ctx.app?.onClosed?.(); } catch { /* 이미 닫힘 */ } } };
  async function openBag(start = "bag") {
    if (dead) return; if (bagHost) { bagHost.style.display = "block"; await bagApi?.refresh?.(start); return; }
    bagHost = document.createElement("div"); bagHost.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483001;display:block"; const root = bagHost.attachShadow({ mode: "open" }), st = document.createElement("style"), box = document.createElement("div");
    st.textContent = BAG_CSS; box.style.cssText = "position:absolute;inset:0"; root.append(st, box); document.body.append(bagHost);
    try { const { mountBag } = await import("./bagapp.js"); bagApi = await mountBag(box, { ledger, store, close: closeBag, unlock5: data["bag-unlock5"] === "1", start, ask, questMode: () => data["quest-mode"] || "story" }); } catch (e) { console.log("[Dusk Saga] 가방 열기 실패", e); bagHost.remove(); bagHost = null; ctx.toast?.("가방을 열지 못했어요: " + (e?.message ?? e), { error: true }); }
  }
  async function open(want) {
    if (dead) return; if (host) { H.paused = false; host.style.display = "block"; dispatchEvent(new Event("resize")); if (want === "gen") H.startGen?.(); if (want === "bag") H.startBag?.(); return; }
    host = document.createElement("div"); host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483000;display:block"; const root = host.attachShadow({ mode: "open" }), st = document.createElement("style"), body = document.createElement("div"), app = document.createElement("div"); st.textContent = css; body.className = "sbody"; body.dataset.mode = "3d"; body.style.cssText = "position:absolute;inset:0"; app.id = "app"; body.append(app); root.append(st, body); document.body.append(host);
    H = globalThis.__duskSaga = { root, body, store, close, cast, gen, ledger, chatKey, brief: async () => cget("brief:" + (await chatKey())) || "", toChat, memState: async (names) => (memory?.ready?.() ? await memory.state(names) : null), ask, paused: false };
    try { await import("./app3d.js"); if (want === "gen") setTimeout(() => H.startGen?.(), 300); if (want === "bag") setTimeout(() => H.startBag?.(), 300); } catch (e) { console.log("[Dusk Saga] 열기 실패", e); host.remove(); host = null; ctx.toast?.("Dusk Saga를 열지 못했어요: " + (e?.message ?? e), { error: true }); }
  }
  dusk?.addPage?.({ title: "Dusk Saga", render(el) { const u = dusk.ui; void 0; u.replace(el, u.pageHead?.("Dusk Saga", { sub: "시험판 — 모의 전투" }) ?? "", u.card("모의 전투", u.note("info", `전투 감지 상태 — 답 받기 훅 ${stat.after}회 · 표시 훅 ${stat.out}회 · 감지 ${stat.hit}회${stat.last ? " · 마지막: " + stat.last : ""}`), u.note("info", "3D 전술 전투를 시험하는 화면이에요. 전투 결과·전리품·정비 기록은 채팅의 다음 입력에 짧게 실려요. 채팅 전투 감지를 켜 두면 모델이 싸움이 터질 때 표시를 달고, 그 표시는 답에서 지워져요."), u.btn("이야기로 전투 만들기", { kind: "primary", onClick: () => open("gen") }), u.btn("게임 열기", { onClick: () => open() }), u.btn("가방 · 정비 · 제작", { onClick: () => openBag() }), u.btn(data["auto-open"] === "1" ? "감지되면 바로 열기: 켬" : "감지되면 바로 열기: 끔(본문 카드만)", { onClick: () => { data["auto-open"] = data["auto-open"] === "1" ? "0" : "1"; later(); ctx.toast?.(data["auto-open"] === "1" ? "이제 전투 판을 바로 열어요" : "이제 본문 아래 카드만 띄워요"); } }), u.btn(data["auto-detect"] === "0" ? "채팅 전투 감지 켜기" : "채팅 전투 감지 끄기", { onClick: () => { data["auto-detect"] = data["auto-detect"] === "0" ? "1" : "0"; later(); ctx.toast?.(data["auto-detect"] === "0" ? "채팅 전투 감지를 껐어요" : "채팅 전투 감지를 켰어요"); } })), (() => { const QM = { off: "끔", story: "이야기에서 길드·게시판이 나올 때", auto: "자동(답 8번마다)", manual: "직접 요청할 때만" }, order = ["story", "auto", "manual", "off"], cur = data["quest-mode"] || "story", rerender = () => { try { this.render(el); } catch { /* 다음에 열 때 */ } };
    return u.card("세계 · 길드 · 상점", u.note("info", "길드·화폐·상점은 AI가 이 채팅의 배경(판타지·무협·현대·SF·마을·학원)을 읽고 정해요. 가방의 [길드]·[상점] 탭에서 봐요."),
      u.btn("의뢰 만들기: " + QM[cur], { onClick: () => { data["quest-mode"] = order[(order.indexOf(cur) + 1) % order.length]; later(); ctx.toast?.("의뢰 만들기: " + QM[data["quest-mode"]]); rerender(); } }),
      u.btn(data["money-auto"] === "1" ? "이야기 속 돈 자동 반영: 켬" : "이야기 속 돈 자동 반영: 끔", { onClick: () => { data["money-auto"] = data["money-auto"] === "1" ? "0" : "1"; later(); ctx.toast?.(data["money-auto"] === "1" ? "답에 [[돈: …]] 표시를 받아 지갑에 반영해요(잘못 읽을 수 있어요)" : "돈은 상점·의뢰에서만 오가요"); rerender(); } }),
      u.btn("세계·의뢰를 읽는 모델: " + ((data["ask-model"] || "submodel") === "model" ? "메인" : "보조"), { onClick: () => { data["ask-model"] = (data["ask-model"] || "submodel") === "model" ? "submodel" : "model"; later(); rerender(); } })); })()); } });
  // 버튼은 고정 id로 단다: 지웠다 다시 깔거나 껐다 켜도 같은 자리에 하나만. 예전 인스턴스가 늦게 꺼져도 새 버튼을 지우지 않게 주인 표시를 둔다
  const me = Symbol("dusk-saga"); globalThis.__duskSagaOwner = me; const BTN = ["dusk-saga-gen", "dusk-saga-bag", "dusk-saga-menu"];
  // 예전 인스턴스(다시 깔기·다시 켜기)가 남긴 것: 실제로 받은 버튼 id·막대·타이머를 전역에 적어 두고 새로 켤 때 모두 걷는다
  const G = (globalThis.__duskSagaLive ||= { parts: [] });
  for (const b of new Set([...G.parts.splice(0), ...BTN])) { try { await api.unregisterUIPart?.(b); } catch { /* 없음 */ } }
  const reg = async (o, fn) => { for (let i = 0; i < 3; i++) { try { const r = await api.registerButton?.(o, fn), pid = r?.id ?? (typeof r === "string" || typeof r === "number" ? r : o.id); G.parts.push(pid); return pid; } catch (e) { console.log("[Dusk Saga] 버튼 등록 재시도", o.name, e?.message ?? e); await new Promise((r) => setTimeout(r, 600)); } } return null; };
  // 떠 있는 막대는 코어(2.2.64 fabhub)가 그린다: 전투·가방 칸만 붙인다. 코어가 막대를 못 그리면(권한 없음·옛 코어) 리스 버튼으로
  const F = ctx.app?.fab ?? globalThis.__duskFab; G.hub ||= []; for (const f of G.hub.splice(0)) { try { await f(); } catch { /* 이미 없음 */ } }
  const hubOffs = []; let docked = false;
  if (F) try { const a = await F.add({ key: "gen", title: "전투 만들기", order: 30, open: async () => { await duskOpen(); open("gen"); } }); if (a) { hubOffs.push(a); const b = await F.add({ key: "bag", title: "가방", order: 40, open: async () => { await duskOpen(); openBag(); } }); if (b) hubOffs.push(b); const c = await F.add({ key: "gear", title: "정비", order: 45, icon: GEAR_ICON, open: async () => { await duskOpen(); openBag("gear"); } }); if (c) hubOffs.push(c); docked = true; G.hub.push(...hubOffs); } } catch (e) { console.log("[Dusk Saga] 막대 칸 붙이기 실패", e?.message ?? e); }
  let id2 = null; if (!docked) try { id2 = await reg({ name: "전투 만들기", icon: "⚔️", iconType: "html", location: "action", id: BTN[0] }, async () => { await duskOpen(); open("gen"); }); } catch (e) { console.log("[Dusk Saga] 전투 버튼 등록 실패", e?.message ?? e); }
  let id3 = null; if (!docked) try { id3 = await reg({ name: "가방", icon: "🎒", iconType: "html", location: "action", id: BTN[1] }, async () => { await duskOpen(); openBag(); }); } catch (e) { console.log("[Dusk Saga] 가방 버튼 등록 실패", e?.message ?? e); }
  let id = null; try { id = await reg({ name: "Dusk Saga", icon: "⚔️", iconType: "html", location: "hamburger", id: BTN[2] }, async () => { await dusk?.open?.(); }); } catch (e) { console.log("[Dusk Saga] 버튼 등록 실패", e?.message ?? e); }
  return { memory, open, close, deactivate() { dead = true; flush(); bagHost?.remove(); for (const f of hubOffs) { f().catch?.(() => {}); G.hub = G.hub.filter((x) => x !== f); } try { H?.dispose?.(); } catch { /* 이미 없음 */ } host?.remove(); if (globalThis.__duskSaga === H) delete globalThis.__duskSaga; try { offTab?.(); } catch { /* 이미 떨어짐 */ } try { if (globalThis.__duskSagaOwner === me) { delete globalThis.__duskSagaOwner; for (const b of [id, id2, id3]) if (b != null) { api.unregisterUIPart?.(b); G.parts = G.parts.filter((x) => x !== b); } } } catch { /* 이미 없음 */ } try { offRep?.(); offAfter?.(); if (outOn) api.removeRisuScriptHandler?.("output", onOut); if (dispOn) api.removeRisuScriptHandler?.("display", onDisp); } catch { /* 이미 떨어짐 */ } clearInterval(keyTimer); clearInterval(encTimer); api.getRootDocument?.().then(async (d) => { for (const q of [`[${ENC}]`, 'style[x-dusk="saga-enc"]']) { const o = await d?.querySelector(q); await o?.remove(); } }).catch(() => {}); } };
}
