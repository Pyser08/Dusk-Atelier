// Dusk Saga 시험판 애드온: 게임을 섀도 DOM 전체 화면으로 띄운다(본체 화면과 스타일이 섞이지 않게). 게임 코드는 처음 열 때 돈다
import CSS from "./style.css";
import { statTabHtml } from "../../src/rpg/engine/memlink.js";
import { createMemoryLink } from "../../src/rpg/data/memorylink.js";
import { GEN_PROMPT, LATER_PROMPT } from "../../src/rpg/engine/prompts.js";
import { storyNote } from "../../src/rpg/engine/digest.js";
const css = CSS.replace(/:root/g, ":host").replace(/(^|[\s,}>])body(?=[[{:.,\s])/g, "$1.sbody");
export async function activate(api, ctx) {
  const dusk = ctx.dusk, ext = dusk?.ext ?? ctx.ext ?? ctx.app?.ext; let host = null, H = null, timer = 0, dead = false;
  const offTab = ext?.add?.("svc", "rpgStats", { tabFor: (folder, names) => statTabHtml(folder, names) }); let memory = null; try { memory = createMemoryLink(ext, { log: (...a) => console.log("[Dusk Saga]", ...a) }); } catch (e) { console.log("[Dusk Saga] 장기기억 연계 건너뜀", e?.message ?? e); }
  // 저장: 이 애드온 전용 저장소에 한 덩어리로(묶어서 늦게 쓴다)
  const data = { ...((await dusk?.storage?.get?.("game", {})) ?? {}) }, flush = () => { clearTimeout(timer); timer = 0; return dusk?.storage?.set?.("game", data); }, later = () => { clearTimeout(timer); timer = setTimeout(flush, 700); };
  const store = { getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null), setItem: (k, v) => { data[k] = String(v); later(); }, removeItem: (k) => { delete data[k]; later(); } };
  // 지금 채팅의 봇·유저 이름만 가져온다(바깥으로 보내지 않는다)
  const cast = async () => { const ci = await api.getCurrentCharacterIndex(), c = await api.getCharacterFromIndex(ci), out = []; const n = String(c?.name ?? "").trim().slice(0, 20); if (n) out.push(n); return out; };
  // 이야기로 전투 만들기: 최근 대화를 읽혀 JSON 한 덩어리를 받는다. 메인·보조 모델 모두 '생성 중지'에 잡힌다
  const textOf = (m) => String(m?.data ?? m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const gen = async ({ model, later, signal }) => { const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex(), c = await api.getCharacterFromIndex(ci), chat = await api.getChatFromIndex(ci, ti), lines = (chat?.message ?? []).slice(-16).map((m) => `${m.role === "user" ? "유저" : c?.name ?? "봇"}: ${textOf(m).slice(0, 1400)}`), sys = GEN_PROMPT + (later ? "\n\n" + LATER_PROMPT : ""), msgs = [{ role: "system", content: sys }, { role: "user", content: `[봇: ${c?.name ?? ""}]\n${String(c?.desc ?? "").slice(0, 1200)}\n\n[최근 이야기]\n${lines.join("\n")}\n\n위 이야기로 전투 하나를 JSON으로만.` }];
    const run = dusk?.lib?.["src/engine/runai.js"]?.runAI; let out; if (run) out = await run(api, msgs, { mode: model === "model" ? "model" : "submodel", stage: "Dusk Saga 전투 만들기" }, signal); else out = await dusk.ai.run(msgs.slice(1), { system: sys, signal }); const t = String(out ?? ""), a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) throw new Error("모델 답에서 JSON을 못 찾았어요"); return JSON.parse(t.slice(a, b + 1)); };
  // 끝난 전투의 결과를 다음 입력 끝에 한 번만 붙인다(지금 방식: storyNote)
  const KEY = "dusk-saga-dev"; let offRep = null; try { offRep = await api.addRisuReplacer?.("beforeRequest", (messages, type) => { try { if (type !== "model" || !Array.isArray(messages)) return messages; const raw = data[KEY]; if (!raw) return messages; const S = JSON.parse(raw); if (!S.battle || S.battle.status === "active" || S.seq <= S.sent) return messages; const note = storyNote(S); if (!note) return messages; const i = messages.map((m) => m.role).lastIndexOf("user"); if (i < 0) return messages; const out = messages.slice(); out[i] = { ...out[i], content: String(out[i].content ?? "") + "\n\n" + note }; S.sent = S.seq; data[KEY] = JSON.stringify(S); later(); return out; } catch (e) { console.log("[Dusk Saga] 결과 싣기 실패", e?.message ?? e); return messages; } }); } catch (e) { console.log("[Dusk Saga] 결과 싣기 등록 실패", e?.message ?? e); }
  const close = () => { if (!host) return; H.paused = true; host.style.display = "none"; flush(); };
  async function open(want) {
    if (dead) return; if (host) { H.paused = false; host.style.display = "block"; dispatchEvent(new Event("resize")); if (want === "gen") H.startGen?.(); return; }
    host = document.createElement("div"); host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483000;display:block"; const root = host.attachShadow({ mode: "open" }), st = document.createElement("style"), body = document.createElement("div"), app = document.createElement("div"); st.textContent = css; body.className = "sbody"; body.dataset.mode = "3d"; body.style.cssText = "position:absolute;inset:0"; app.id = "app"; body.append(app); root.append(st, body); document.body.append(host);
    H = globalThis.__duskSaga = { root, body, store, close, cast, gen, paused: false };
    try { await import("./app3d.js"); if (want === "gen") setTimeout(() => H.startGen?.(), 300); } catch (e) { console.log("[Dusk Saga] 열기 실패", e); host.remove(); host = null; ctx.toast?.("Dusk Saga를 열지 못했어요: " + (e?.message ?? e), { error: true }); }
  }
  dusk?.addPage?.({ title: "Dusk Saga", render(el) { const u = dusk.ui; void 0; u.replace(el, u.pageHead?.("Dusk Saga", { sub: "시험판 — 모의 전투" }) ?? "", u.card("모의 전투", u.note("info", "3D 전술 전투를 시험하는 화면이에요. 채팅 내용은 바꾸지 않아요."), u.btn("이야기로 전투 만들기", { kind: "primary", onClick: () => open("gen") }), u.btn("게임 열기", { onClick: () => open() }))); } });
  let id2 = null; try { id2 = await api.registerButton?.({ name: "전투 만들기", icon: "⚔️", iconType: "html", location: "action" }, async () => { await dusk?.open?.(); open("gen"); }); } catch (e) { console.log("[Dusk Saga] 전투 버튼 등록 실패", e?.message ?? e); }
  let id = null; try { id = await api.registerButton?.({ name: "Dusk Saga", icon: "⚔️", iconType: "html", location: "hamburger" }, async () => { await dusk?.open?.(); }); } catch (e) { console.log("[Dusk Saga] 버튼 등록 실패", e?.message ?? e); }
  return { memory, open, close, deactivate() { dead = true; flush(); try { H?.dispose?.(); } catch { /* 이미 없음 */ } host?.remove(); if (globalThis.__duskSaga === H) delete globalThis.__duskSaga; try { offTab?.(); } catch { /* 이미 떨어짐 */ } try { if (id != null) api.unregisterUIPart?.(id); if (id2 != null) api.unregisterUIPart?.(id2); } catch { /* 이미 없음 */ } try { offRep?.(); } catch { /* 이미 떨어짐 */ } } };
}
