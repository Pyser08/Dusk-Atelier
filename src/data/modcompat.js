// 모듈 호환(애드온 modcompat 전용): 리스 훅 셋(output·display·process) + 요청 안내(beforeRequest).
// 봇·모듈·저장 채팅의 '구조'는 바꾸지 않는다. 응답 글의 모듈 이미지 태그만 살짝 감싸 봇 정규식이 지우지 못하게 하고,
// 표시·요청 때 되돌린다(engine/modcompat.js). 훅은 기다리지 않게 문맥을 캐시하고, 봇·채팅이 바뀔 때만 다시 읽는다.
import { buildContext, protectOutput, prepareDisplay, unwrap, keyOf, findTags, resolveName, guardFor, planRender, MEDIA_EXT } from "../engine/modcompat.js";
import { buildBlock, exampleTemplate, injectBlock, promptSubjects } from "../engine/modcompatprompt.js";
import { loadCharacters } from "./modules.js";
import { managedNames, inferFoundValue, varUpdates, setvarText, windowText } from "../engine/modcompatvars.js";

// vars: 인물 감지 변수 — "auto"(봇 변수에서 읽고, 못 읽으면 나오면 0) | "found0" | "found1" | "off"
export const DEFAULTS = Object.freeze({ on: true, guard: true, display: true, prompt: true, promptOff: [], vars: "auto", varWindow: 9 });
const FRESH_MS = 800, MAX_AGE_MS = 15000, FORCE_AGE_MS = 3000;

export function createModCompat(api, { storage, log = (...a) => console.log("[Dusk 모듈 호환]", ...a), now = () => Date.now() } = {}) {
  let ctx = null, checkedAt = 0, pending = null, settings = { bots: {} };
  const cardCache = { ci: null, at: 0, card: null };
  const stats = { protected: 0, rendered: 0, vars: 0, lastAt: 0 };

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
  // 봇 목록(그룹 멤버 찾기·채팅 없이 고르기용). 봇마다 카드를 통째로 읽으므로 1분 캐시, 화면·그룹에서만 부른다.
  let bots = null, botsAt = 0, botsPending = null;
  async function listBots({ fresh = false } = {}) {
    if (!fresh && bots && now() - botsAt < 60000) return bots;
    if (botsPending) return botsPending;
    botsPending = (async () => {
      const { list } = await loadCharacters(api);
      bots = list.map((c, ci) => (c ? { ci, chaId: String(c.chaId ?? ""), name: c.name ?? "(이름 없음)", group: c.type === "group", card: c } : null)).filter(Boolean);
      botsAt = now();
      return bots;
    })().finally(() => { botsPending = null; });
    return botsPending;
  }
  // 그룹 채팅: 멤버 봇들의 에셋·정규식·로어북을 합쳐 '봇 쪽'으로 본다(리스는 멤버가 말한 메시지를 그 멤버로 그린다).
  // wait=false(훅): 봇 목록이 아직 없으면 기다리지 않고 멤버 없이 만들고, 목록을 다 읽으면 문맥을 오래된 것으로 표시해 뒤에서 새로 만든다.
  async function groupSide(g, { wait = true } = {}) {
    const ids = new Set((g.characters ?? []).map(String));
    let members = [];
    const have = bots && now() - botsAt < 60000;
    if (!wait && !have) {
      listBots().then(() => { if (ctx?.group) ctx.at = -Infinity; }).catch((e) => log("그룹 멤버를 읽지 못함", e?.message ?? e));
    } else {
      try { members = (await listBots()).filter((b) => ids.has(b.chaId) && !b.group).map((b) => b.card); } catch (e) { log("그룹 멤버를 읽지 못함", e?.message ?? e); }
    }
    return {
      assets: members.flatMap((m) => [...(m.additionalAssets ?? []), ...(m.emotionImages ?? [])]),
      scripts: [...(g.customscript ?? []), ...members.flatMap((m) => m.customscript ?? [])],
      lore: [...(g.globalLore ?? []), ...members.flatMap((m) => m.globalLore ?? [])],
      defaults: members.map((m) => m.defaultVariables ?? "").join("\n"),
      members: members.map((m) => m.name ?? "")
    };
  }
  async function build(ci, chi, { cardOf = null, wait = true } = {}) {
    const ch = cardOf ?? (ci >= 0 ? await card(ci) : null);
    if (!ch) return { ci, chi, chaId: "", empty: true, at: now() };
    let chat = null, db = null, preset = [];
    if (chi >= 0) { try { chat = await api.getChatFromIndex?.(ci, chi); } catch { chat = null; } }
    try { db = await api.getDatabase(["modules", "enabledModules"]); } catch (e) { log("모듈을 읽지 못함", e?.message ?? e); }
    try { preset = (await api.getDatabase(["presetRegex"]))?.presetRegex ?? []; } catch { preset = []; }
    const ids = new Set([...(db?.enabledModules ?? []), ...(ch.modules ?? []), ...(chat?.modules ?? [])]);
    const modules = (db?.modules ?? []).filter((m) => m && ids.has(m.id));
    const group = ch.type === "group";
    const side = group ? await groupSide(ch, { wait }) : { assets: [...(ch.additionalAssets ?? []), ...(ch.emotionImages ?? [])], scripts: ch.customscript ?? [], lore: ch.globalLore ?? [], defaults: ch.defaultVariables ?? "", members: [] };
    const c = buildContext({ botAssets: side.assets, modules, preset, botScripts: side.scripts });
    // 그룹에서는 봇 트리거가 돌지 않는다(모듈 트리거만) → 봇 Lua가 다루는 인물도 없다
    const botForVars = { defaultVariables: side.defaults, triggerscript: group ? [] : ch.triggerscript, globalLore: side.lore };
    const managed = managedNames({ modules, bot: botForVars, subjects: c.reg.subjects });
    const chaId = String(ch.chaId ?? "");
    return Object.assign(c, { ci, chi, chaId, botName: ch.name ?? "", group, members: side.members, modules, managed, botEntries: side.lore, botLua: group ? 0 : luaCount(ch.triggerscript), at: now(), cfg: botCfg(chaId) });
  }
  // 지금 봇·채팅의 문맥. 짧은 시간 안에는 호스트에 묻지 않는다(표시 훅이 메시지마다 불리므로).
  async function current({ force = false } = {}) {
    if (!force && ctx && now() - checkedAt < FRESH_MS) return ctx;
    if (pending) return pending;
    pending = (async () => {
      try {
        const w = await where();
        checkedAt = now();
        const same = ctx && ctx.ci === w.ci && ctx.chi === w.chi;
        // 같은 봇·채팅이면 오래되지 않은 문맥을 쓴다(요청 때는 더 짧게 — 모듈을 막 켜고 끈 경우)
        if (same && now() - ctx.at < (force ? FORCE_AGE_MS : MAX_AGE_MS)) return ctx;
        // 훅(응답 조각·화면)에서는 같은 채팅이면 기다리지 않고 지금 것을 쓰고, 뒤에서 새로 읽는다(HOST-COMPAT 3)
        if (same && !force) { refreshLater(w); return ctx; }
        ctx = await build(w.ci, w.chi, { wait: !!force });
        return ctx;
      } catch (e) { log("문맥 실패", e?.message ?? e); return ctx; }
      finally { pending = null; }
    })();
    return pending;
  }
  let refreshing = null;
  function refreshLater(w) {
    if (refreshing) return;
    refreshing = build(w.ci, w.chi, { wait: false }).then((c) => { if (ctx && ctx.ci === c.ci && ctx.chi === c.chi) { c.lastBlock = ctx.lastBlock; c.lastTemplate = ctx.lastTemplate; if (ctx.template && c.template) c.template = ctx.template; } ctx = c; }).catch((e) => log("새로 읽기 실패", e?.message ?? e)).finally(() => { refreshing = null; });
  }
  const active = (c) => c && !c.empty && c.cfg?.on !== false && c.reg?.mod?.size > 0;
  const varsOn = (c) => c && !c.empty && c.cfg?.on !== false && c.cfg?.vars !== "off" && c.managed?.length > 0;

  // 인물 감지 변수: 최근 대화(+이번 입력)에 모듈 인물이 나왔는지로 값을 정해 {{setvar}}를 덧붙인다(바뀐 것만).
  // 리스 runVar 패스가 프롬프트를 만들기 전에 실행하고 지운다(interop 2절 4번).
  async function varTail(c, extra) {
    let chat = null;
    try { chat = await api.getChatFromIndex?.(c.ci, c.chi); } catch { chat = null; }
    const state = chat?.scriptstate ?? {};
    const text = windowText(chat?.message ?? [], extra, c.cfg.varWindow || 9);
    const found = foundValue(c, state, text);
    c.lastFound = found;
    return setvarText(varUpdates({ managed: c.managed, text, found, scriptstate: state }));
  }
  function foundValue(c, state, text) {
    if (c.cfg.vars === "found0") return "0";
    if (c.cfg.vars === "found1") return "1";
    return inferFoundValue({ scriptstate: state, botEntries: c.botEntries, recentText: text, managed: c.managed }) ?? "0";
  }

  // ---- 훅 ----
  async function onOutput(text) {
    if (typeof text !== "string") return text;
    try {
      const c = await current();
      let out = text;
      if (active(c) && c.cfg.guard !== false) {
        const r = protectOutput(text, c);
        if (r.changed.length) { stats.protected += r.changed.length; stats.lastAt = now(); }
        out = r.text;
      }
      // 감지 변수는 여기서 붙이지 않는다: 리스는 스트리밍 중 조각마다 이 훅을 부르고 그 글을 화면에 그대로 보여 줘서
      // {{setvar}}가 잠깐 글자로 보인다. 변수는 프롬프트를 만들 때만 필요하므로 다음 입력(onInput)에서 맞춘다.
      return out;
    } catch (e) { log("응답 처리 실패", e?.message ?? e); return text; }
  }
  async function onDisplay(text) {
    if (typeof text !== "string" || !text) return text;
    try {
      const c = await current();
      // 막 보낸 입력은 리스가 runVar로 지우기 전 잠깐 그려질 수 있다 → 우리가 붙인 {{setvar}}는 화면에서 뺀다
      if (c?.managed?.length && text.includes("{{setvar::")) text = stripOwnSetvars(text, c.managed);
      if (!active(c) || c.cfg.display === false) return unwrap(text);
      const out = prepareDisplay(text, c);
      if (out !== text) stats.rendered++;
      return out;
    } catch (e) { log("표시 처리 실패", e?.message ?? e); return unwrap(text); }
  }
  // 보내는 글: 인물 감지 변수를 이번 입력까지 넣어 맞춘다(리스가 프롬프트를 만들기 전에 실행)
  async function onInput(text) {
    if (typeof text !== "string" || !text.trim()) return text;   // 빈 입력(이어 쓰기 등)에 메시지를 만들지 않게
    try {
      const c = await current({ force: true });
      if (!varsOn(c)) return text;
      const tail = await varTail(c, text);
      if (tail) stats.vars++;
      return tail ? text + tail : text;
    } catch (e) { log("입력 처리 실패", e?.message ?? e); return text; }
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
  // 진단: ci를 주면(채팅을 열지 않고 고른 봇) 그 봇 기준, 아니면 지금 연 채팅 기준
  async function diagnose({ ci = null } = {}) {
    await loadSettings();
    let c;
    if (ci != null) {
      const live = await current({ force: true });
      if (live && !live.empty && live.ci === ci) c = live;
      else { const b = (await listBots()).find((x) => x.ci === ci); c = b ? await build(ci, -1, { cardOf: b.card }) : null; }
    } else c = await current({ force: true });
    if (!c || c.empty) return { ok: false, reason: "no-bot" };
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
      ok: true, ci: c.ci, live: c.chi >= 0, group: !!c.group, members: c.members ?? [], botName: c.botName, chaId: c.chaId, cfg: c.cfg, template,
      shapes: c.shapes.filter((s) => s.renderer).map((s) => ({ src: s.src, kind: s.renderer.source.kind, name: s.renderer.source.name ?? "", comment: s.renderer.comment, usesList: s.usesList })),
      modules: mods, chars: ps.chars.length, singles: ps.singles.length,
      block: c.lastBlock ?? buildBlock(c, { template, off: c.cfg.promptOff ?? [] }),
      overlaps: overlaps(c), botLua: c.botLua, stats: { ...stats },
      vars: { mode: c.cfg.vars ?? "auto", names: c.managed.map((m) => m.name), found: c.lastFound ?? (c.managed.length ? await (async () => { try { const ch = c.chi >= 0 ? await api.getChatFromIndex?.(c.ci, c.chi) : null; return foundValue(c, ch?.scriptstate ?? {}, windowText(ch?.message ?? [], "", c.cfg.varWindow || 9)); } catch { return null; } })() : null) }
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

  return { current, listBots, where, onInput, onOutput, onDisplay, onProcess, beforeRequest, diagnose, unwrapChat, loadSettings, setBotCfg, botCfg, stats };
}

export function stripOwnSetvars(text, managed) {
  const names = new Set((managed ?? []).map((m) => m.name));
  return String(text).replace(/\{\{setvar::([^:{}]+)::[01]\}\}/g, (all, n) => (names.has(n) ? "" : all));
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
