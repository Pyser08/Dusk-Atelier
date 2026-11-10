// 모듈 호환(애드온 modcompat 전용): 리스 훅 셋(output·display·process) + 요청 안내(beforeRequest).
// 봇·모듈·저장 채팅의 '구조'는 바꾸지 않는다. 응답 글의 모듈 이미지 태그만 살짝 감싸 봇 정규식이 지우지 못하게 하고,
// 표시·요청 때 되돌린다(engine/modcompat.js). 훅은 기다리지 않게 문맥을 캐시하고, 봇·채팅이 바뀔 때만 다시 읽는다.
import { buildContext, protectOutput, prepareDisplay, unwrap, keyOf, findTags, resolveName, guardFor, planRender, MEDIA_EXT } from "../engine/modcompat.js";
import { buildBlock, exampleTemplate, injectBlock, promptSubjects } from "../engine/modcompatprompt.js";

export const DEFAULTS = Object.freeze({ on: true, guard: true, display: true, prompt: true, promptOff: [] });
const FRESH_MS = 800, MAX_AGE_MS = 15000;

export function createModCompat(api, { storage, log = (...a) => console.log("[Dusk 모듈 호환]", ...a), now = () => Date.now() } = {}) {
  let ctx = null, checkedAt = 0, pending = null, settings = { bots: {} };
  const cardCache = { ci: null, at: 0, card: null };
  const stats = { protected: 0, rendered: 0, lastAt: 0 };

  async function loadSettings() { settings = (await storage?.get?.("settings", null)) ?? { bots: {} }; if (!settings.bots) settings.bots = {}; return settings; }
  const botCfg = (chaId) => ({ ...DEFAULTS, ...(settings.bots?.[chaId] ?? {}) });
  async function setBotCfg(chaId, patch) {
    settings.bots[chaId] = { ...botCfg(chaId), ...patch };
    await storage?.set?.("settings", settings);
    if (ctx?.chaId === chaId) ctx.cfg = botCfg(chaId);
  }

  async function where() {
    const ci = await api.getCurrentCharacterIndex?.(), chi = await api.getCurrentChatIndex?.();
    return { ci: typeof ci === "number" ? ci : -1, chi: typeof chi === "number" ? chi : -1 };
  }
  // 봇 카드는 통째로 복사되므로 봇이 바뀔 때·조금 지났을 때만 읽는다.
  async function card(ci) {
    if (cardCache.ci === ci && cardCache.card && now() - cardCache.at < 60000) return cardCache.card;
    let c = null;
    try { c = await api.getCharacterFromIndex(ci); } catch (e) { log("봇을 읽지 못함", e?.message ?? e); }
    cardCache.ci = ci; cardCache.at = now(); cardCache.card = c;
    return c;
  }
  async function build(ci, chi) {
    const ch = ci >= 0 ? await card(ci) : null;
    if (!ch || ch.type === "group") return { ci, chi, chaId: "", empty: true, at: now() };
    let chat = null, db = null, preset = [];
    try { chat = await api.getChatFromIndex?.(ci, chi); } catch { chat = null; }
    try { db = await api.getDatabase(["modules", "enabledModules"]); } catch (e) { log("모듈을 읽지 못함", e?.message ?? e); }
    try { preset = (await api.getDatabase(["presetRegex"]))?.presetRegex ?? []; } catch { preset = []; }
    const ids = new Set([...(db?.enabledModules ?? []), ...(ch.modules ?? []), ...(chat?.modules ?? [])]);
    const modules = (db?.modules ?? []).filter((m) => m && ids.has(m.id));
    const botAssets = [...(ch.additionalAssets ?? []), ...(ch.emotionImages ?? [])];
    const c = buildContext({ botAssets, modules, preset, botScripts: ch.customscript ?? [] });
    return Object.assign(c, { ci, chi, chaId: String(ch.chaId ?? ""), botName: ch.name ?? "", modules, botLua: luaCount(ch.triggerscript), at: now(), cfg: botCfg(String(ch.chaId ?? "")) });
  }
  // 지금 봇·채팅의 문맥. 짧은 시간 안에는 호스트에 묻지 않는다(표시 훅이 메시지마다 불리므로).
  async function current({ force = false } = {}) {
    if (!force && ctx && now() - checkedAt < FRESH_MS) return ctx;
    if (pending) return pending;
    pending = (async () => {
      try {
        const w = await where();
        checkedAt = now();
        if (!force && ctx && ctx.ci === w.ci && ctx.chi === w.chi && now() - ctx.at < MAX_AGE_MS) return ctx;
        ctx = await build(w.ci, w.chi);
        return ctx;
      } catch (e) { log("문맥 실패", e?.message ?? e); return ctx; }
      finally { pending = null; }
    })();
    return pending;
  }
  const active = (c) => c && !c.empty && c.cfg?.on !== false && c.reg?.mod?.size > 0;

  // ---- 훅 ----
  async function onOutput(text) {
    if (typeof text !== "string") return text;
    try {
      const c = await current();
      if (!active(c) || c.cfg.guard === false) return text;
      const r = protectOutput(text, c);
      if (r.changed.length) { stats.protected += r.changed.length; stats.lastAt = now(); }
      return r.text;
    } catch (e) { log("응답 처리 실패", e?.message ?? e); return text; }
  }
  async function onDisplay(text) {
    if (typeof text !== "string" || !text) return text;
    try {
      const c = await current();
      if (!active(c) || c.cfg.display === false) return unwrap(text);
      const out = prepareDisplay(text, c);
      if (out !== text) stats.rendered++;
      return out;
    } catch (e) { log("표시 처리 실패", e?.message ?? e); return unwrap(text); }
  }
  // 요청에 들어가는 글: 감싼 표식을 원래 태그로(봇의 요청 정규식이 자기 태그처럼 다룬다)
  function onProcess(text) { return typeof text === "string" ? unwrap(text) : text; }
  async function beforeRequest(messages, type) {
    try {
      if (type && type !== "model") return messages;
      const c = await current({ force: true });
      if (!active(c) || c.cfg.prompt === false) return injectBlock(messages, "");
      const texts = (messages ?? []).map((m) => (typeof m?.content === "string" ? m.content : ""));
      const template = exampleTemplate(texts, c);
      const recent = texts.slice(-6).join("\n");
      const block = buildBlock(c, { template, recent, off: c.cfg.promptOff ?? [] });
      c.lastBlock = block; c.lastTemplate = template; c.template = template;
      return injectBlock(messages, block);
    } catch (e) { log("안내 넣기 실패", e?.message ?? e); return messages; }
  }

  // ---- 진단(화면용) ----
  async function diagnose() {
    await loadSettings();
    const c = await current({ force: true });
    if (!c || c.empty) return { ok: false, reason: c?.ci < 0 ? "no-bot" : "group" };
    const template = c.lastTemplate ?? exampleTemplate([], c);
    const ps = promptSubjects(c, { off: c.cfg.promptOff ?? [] });
    const mods = c.modules.map((m) => {
      const names = (m.assets ?? []).map((a) => (Array.isArray(a) ? a[0] : a?.name)).filter(Boolean);
      const own = names.filter((n) => c.reg.mod.get(keyOf(n))?.moduleId === m.id);
      const sample = own.find((n) => !/icon|bg|frame|ui/i.test(n)) ?? own[0];
      let guard = null, render = null;
      if (sample) {
        const tag = template.replace("{name}", String(sample).replace(MEDIA_EXT, ""));
        const hit = findTags(tag, c.shapes)[0];
        const res = hit && resolveName(hit.raw, c.reg);
        guard = res ? guardFor(tag, c.scripts, c.shapes, res.name) : "none";
        render = res ? planRender(tag, c, res).how : "native";
      }
      return { id: m.id, name: m.name ?? "(이름 없음)", assets: names.length, own: own.length, shadowed: names.length - own.length, sample, guard, render, selfRender: ps.selfRender.includes(m.id), promptOff: (c.cfg.promptOff ?? []).includes(m.id), lua: luaCount(m.trigger), regex: (m.regex ?? []).length, lore: (m.lorebook ?? []).length };
    });
    return {
      ok: true, botName: c.botName, chaId: c.chaId, cfg: c.cfg, template,
      shapes: c.shapes.filter((s) => s.renderer).map((s) => ({ src: s.src, kind: s.renderer.source.kind, name: s.renderer.source.name ?? "", comment: s.renderer.comment, usesList: s.usesList })),
      modules: mods, chars: ps.chars.length, singles: ps.singles.length,
      block: c.lastBlock ?? buildBlock(c, { template, off: c.cfg.promptOff ?? [] }),
      overlaps: overlaps(c), botLua: c.botLua, stats: { ...stats }
    };
  }

  // 이 채팅에 저장된 감싼 표식을 풀어 원래 태그로 되돌린다(애드온을 끄기 전에).
  async function unwrapChat() {
    const { ci, chi } = await where();
    if (ci < 0) return 0;
    const chat = await api.getChatFromIndex(ci, chi);
    let n = 0;
    const message = (chat?.message ?? []).map((m) => { const d = unwrap(m?.data ?? ""); if (d !== (m?.data ?? "")) { n++; return { ...m, data: d }; } return m; });
    if (n) await api.setChatToIndex(ci, chi, { ...chat, message });
    return n;
  }

  return { current, onOutput, onDisplay, onProcess, beforeRequest, diagnose, unwrapChat, loadSettings, setBotCfg, botCfg, stats };
}

const luaCount = (list) => (Array.isArray(list) ? list : []).filter((t) => (t?.effect ?? []).some((e) => e?.type === "triggerlua" && String(e.code ?? "").trim())).length;

// 모듈끼리·봇과 겹치는 곳(진단만): 같은 정규식, 같은 로어북 이름표, Lua 트리거 수.
export function overlaps(c) {
  const rx = new Map();
  for (const s of c.scripts ?? []) {
    const k = `${s.type}\u0000${s.src}`;
    if (!rx.has(k)) rx.set(k, []);
    rx.get(k).push(s.source.kind === "module" ? s.source.name || "모듈" : s.source.kind === "bot" ? "봇" : "프리셋");
  }
  const regex = [...rx.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ type: k.split("\u0000")[0], src: k.split("\u0000")[1].slice(0, 80), where: v }));
  const lore = new Map();
  for (const m of c.modules ?? []) for (const e of m.lorebook ?? []) {
    if (e?.mode === "folder") continue;
    const key = String(e?.key ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).sort().join(",");
    if (!key) continue;
    if (!lore.has(key)) lore.set(key, new Set());
    lore.get(key).add(m.name ?? "모듈");
  }
  const lorebook = [...lore.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => ({ key: k.slice(0, 60), where: [...v] }));
  const luaMods = (c.modules ?? []).filter((m) => luaCount(m.trigger) > 0).map((m) => m.name ?? "모듈");
  return { regex, lorebook, lua: { bot: c.botLua ?? 0, modules: luaMods } };
}
