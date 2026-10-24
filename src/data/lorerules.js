// 로어북 규칙 런타임
// 사용자가 입력하면(리스가 프롬프트를 조립하기 전) 규칙을 평가해 채팅 변수(da_xxxx)를 1/0으로 쓴다.
// 관리 항목은 '@@activate + {{#if {{getvar::da_xxxx}}}}'로 감싸져 있어서, 리스가 평소대로 CBS 파싱·배치·토큰 계산을 한다.
// 캐릭터·채팅·모듈 로어북 모두 같은 방식으로 동작한다.
//
// 다시 생성(리롤): 리스는 리롤할 때 플러그인에 알려 주는 시점이 프롬프트 조립 '뒤'뿐이다.
//   그래서 응답이 끝나면(화면 갱신이 잠잠해지면) 같은 턴을 미리 한 번 더 계산해 변수를 써 둔다.
//   → 리롤하면 확률이 새로 굴려진 결정이 쓰이고, 그냥 다음 입력을 하면 입력 때 다시 계산한다.
//   리롤이 실제로 일어났는지는 다음 입력 때 마지막 응답 시각으로 판단해 기록(한 번만·쿨다운)에 반영한다.
// 발동 기록은 채팅 변수 da_state에 둔다 (채팅 복사·분기에 따라감, 현재 턴 이상 기록은 무시하므로 되돌리기에도 맞다).
import { STATE_VAR, MAX_HIST, affOf, applySets, collectManaged, evaluate, gateValues, setTargets } from '../engine/lorerules.js';

const sv = (k) => "$" + k;

// 설정 (설정 탭에서 바꿈): reroll = "new"(리롤 때 확률 새로 굴리기) | "keep"(입력 때 결정 그대로)
export const LORE_SETTINGS_KEY = "dusk-lore-settings";
// log: 로어북 로그 남기기, button: AI 응답 아래 '📖 로어북' 버튼
export const LORE_DEFAULTS = { reroll: "new", log: true, button: true };
export async function loadLoreSettings(api) {
  try {
    const raw = await api.pluginStorage.getItem(LORE_SETTINGS_KEY);
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { ...LORE_DEFAULTS, ...(v && typeof v === "object" ? v : {}) };
  } catch {
    return { ...LORE_DEFAULTS };
  }
}
export async function saveLoreSettings(api, v) {
  await api.pluginStorage.setItem(LORE_SETTINGS_KEY, JSON.stringify({ ...LORE_DEFAULTS, ...v }));
}

export function createLoreRuntime(api, { log = (...a) => console.log("[Dusk 규칙]", ...a) } = {}) {
  let lastFired = [];
  let prepTimer = null;
  let prepKey = "";
  let busy = false;

  async function moduleLore(charIdx, chatIdx) {
    try {
      const db = await api.getDatabase(["modules", "enabledModules"]);
      const ch = await api.getCharacterFromIndex(charIdx);
      const chat = ch?.chats?.[chatIdx];
      const ids = new Set([...(db?.enabledModules ?? []), ...(ch?.modules ?? []), ...(chat?.modules ?? [])]);
      const lore = (db?.modules ?? []).filter((m) => ids.has(m.id)).flatMap((m) => m.lorebook ?? []);
      return { ch, lore: [...(ch?.globalLore ?? []), ...(chat?.localLore ?? []), ...lore] };
    } catch {
      const ch = await api.getCharacterFromIndex(charIdx);
      return { ch, lore: [...(ch?.globalLore ?? []), ...(ch?.chats?.[chatIdx]?.localLore ?? [])] };
    }
  }
  async function loreEntries(charIdx, chatIdx) {
    if (typeof api.getCurrentLorebookEntries === "function") {
      try {
        const r = await api.getCurrentLorebookEntries();
        if (Array.isArray(r)) return r;
      } catch {
      }
    }
    return (await moduleLore(charIdx, chatIdx)).lore;
  }
  const readState = (ss) => {
    try {
      const s = JSON.parse(String(ss?.[sv(STATE_VAR)] ?? "{}"));
      return s && typeof s === "object" ? s : {};
    } catch {
      return {};
    }
  };
  const toMsgs = (chat) => (chat?.message ?? []).map((m) => ({ role: m.role === "user" ? "user" : "char", data: m.data ?? "" }));
  const turnOf = (msgs) => msgs.filter((m) => m.role === "user").length;
  const hasRandom = (items) => items.some((it) => {
    if (Number(it.rule.prob ?? 100) < 100 || (it.rule.chain ?? []).some((c) => Number(c.prob ?? 100) < 100)) return true;
    // 소속: 구성원 확률이 100 미만이거나 최대 인원이 있으면 리롤 때 다시 뽑는다
    const a = affOf(it.entry);
    return !!a && (a.max !== "" || a.def < 100 || Object.values(a.prob).some((p) => p !== "" && Number(p) < 100));
  });

  // 변수 값 읽기·쓰기 보조 (scriptstate 키는 '$이름')
  const finalVars = (base, targets, out) => {
    const v = { ...base };
    for (const n of targets) if (n in out) v[sv(n)] = out[n];
    return v;
  };

  // 순수 계산: 입력 때. 바뀔 scriptstate 조각을 돌려준다
  function decide(entries, chat, input) {
    const items = collectManaged(entries);
    if (!items.length) return null;
    const msgs = toMsgs(chat);
    if (input !== void 0 && input !== null) msgs.push({ role: "user", data: String(input) });
    const turn = turnOf(msgs);
    const ss = chat?.scriptstate ?? {};
    const st = readState(ss);
    const targets = setTargets(items);
    // 직전 턴에 리롤이 있었으면(미리 계산한 결정이 쓰였으면) 그 결정을 기록으로 확정
    const f = { ...(st.f ?? {}) }, t = { ...(st.t ?? {}) };
    const vars = { ...ss };
    const p = st.p;
    const lastChar = [...(chat?.message ?? [])].reverse().find((m) => m.role !== "user");
    if (p && p.turn === turn - 1) {
      if (typeof lastChar?.time === "number" && lastChar.time > p.at) {
        for (const k of Object.keys(f)) f[k] = f[k].filter((x) => x !== p.turn);
        for (const k of Object.keys(t)) t[k] = t[k].filter((x) => x !== p.turn);
        for (const rid of p.fired ?? []) f[rid] = [...(f[rid] ?? []), p.turn].slice(-MAX_HIST);
        for (const rid of p.trig ?? []) t[rid] = [...(t[rid] ?? []), p.turn].slice(-MAX_HIST);
      } else if (p.vars && st.b?.turn === p.turn) {
        // 리롤이 없었으면 대비로 써 둔 변수를 입력 때 결과로 되돌린다 (그 사이 다른 곳에서 바뀌지 않은 것만)
        for (const [n, v] of Object.entries(p.vars)) {
          if (n in (st.b.out ?? {}) && String(vars[sv(n)] ?? "") === String(v)) vars[sv(n)] = st.b.out[n];
        }
      }
    }
    const res = evaluate({ items, messages: msgs, turn, state: { f, t }, vars });
    const out = applySets(res.fired, vars, { turn });
    const after = finalVars(vars, targets, out);
    const patch = { [sv(STATE_VAR)]: "" };
    for (const [k, v] of Object.entries(gateValues(items, res.fired))) patch[sv(k)] = v;
    for (const n of targets) {
      const nv = after[sv(n)];
      if (nv !== void 0 && String(nv) !== String(ss[sv(n)] ?? "")) patch[sv(n)] = String(nv);
    }
    const b = targets.length ? { turn, base: Object.fromEntries(targets.map((n) => [n, vars[sv(n)] ?? null])), out: Object.fromEntries(targets.map((n) => [n, String(after[sv(n)] ?? "")])) } : void 0;
    patch[sv(STATE_VAR)] = JSON.stringify({ ...res.state, ...b ? { b } : {} });
    return { patch, fired: res.fired, turn, trace: res.trace, sets: out };
  }

  // 순수 계산: 응답이 끝난 뒤, 리롤 대비. 마지막 사용자 메시지까지로 같은 턴을 다시 계산한다.
  // 기록(f·t)은 건드리지 않고 미리 계산한 결정(p)과 변수만 바꾼다.
  function prepare(entries, chat, now = Date.now()) {
    const items = collectManaged(entries);
    if (!items.length) return null;
    const all = toMsgs(chat);
    let end = all.length;
    while (end > 0 && all[end - 1].role !== "user") end--;
    if (!end || end === all.length) return null; // 아직 응답이 없음
    const msgs = all.slice(0, end);
    const turn = turnOf(msgs);
    const ss = chat?.scriptstate ?? {};
    const st = readState(ss);
    const targets = setTargets(items);
    const vars = { ...ss };
    // 입력 때 바꾸기 전 값으로 돌려 놓고 같은 턴을 다시 계산한다
    if (st.b?.turn === turn) {
      for (const n of targets) {
        const v = st.b.base?.[n];
        if (v === null || v === void 0) delete vars[sv(n)];
        else vars[sv(n)] = v;
      }
    }
    const res = evaluate({ items, messages: msgs, turn, state: { f: st.f ?? {}, t: st.t ?? {} }, vars });
    const out = applySets(res.fired, vars, { turn });
    const after = finalVars(vars, targets, out);
    const pv = Object.fromEntries(targets.map((n) => [n, String(after[sv(n)] ?? "")]));
    const p = { turn, fired: res.fired.map((a) => a.rid), trig: res.fired.filter((a) => a.why !== "지속").map((a) => a.rid), at: now };
    if (targets.length) p.vars = pv;
    const patch = { [sv(STATE_VAR)]: JSON.stringify({ f: st.f ?? {}, t: st.t ?? {}, p, ...st.b ? { b: st.b } : {} }) };
    for (const [k, v] of Object.entries(gateValues(items, res.fired))) patch[sv(k)] = v;
    for (const n of targets) patch[sv(n)] = pv[n];
    return { patch, fired: res.fired, trace: res.trace, turn, random: hasRandom(items) };
  }

  async function writePatch(charIdx, chatIdx, patch) {
    // 가장 최신 채팅을 다시 읽어 변수만 덮는다
    const chat = await api.getChatFromIndex(charIdx, chatIdx);
    if (!chat) return false;
    chat.scriptstate = { ...(chat.scriptstate ?? {}), ...patch };
    await api.setChatToIndex(charIdx, chatIdx, chat);
    return true;
  }

  async function onInput(text) {
    clearTimeout(prepTimer);
    try {
      busy = true;
      const charIdx = await api.getCurrentCharacterIndex();
      const chatIdx = await api.getCurrentChatIndex();
      if (!(charIdx >= 0) || !(chatIdx >= 0)) return text;
      const entries = await loreEntries(charIdx, chatIdx);
      if (!collectManaged(entries).length) return text;
      const chat = await api.getChatFromIndex(charIdx, chatIdx);
      if (!chat) return text;
      const d = decide(entries, chat, text);
      if (!d) return text;
      chat.scriptstate = { ...(chat.scriptstate ?? {}), ...d.patch };
      await api.setChatToIndex(charIdx, chatIdx, chat);
      lastFired = d.fired.map((a) => ({ name: a.entry.comment || a.rid, why: a.why }));
      log(`턴 ${d.turn}: ${lastFired.length ? lastFired.map((x) => `${x.name}(${x.why})`).join(", ") : "켜진 항목 없음"}`);
      // 확률·최대 인원으로 빠진 항목도 보여 준다 (조건이 안 맞은 항목은 너무 많아 뺀다)
      const miss = (d.trace ?? []).filter((x) => !x.on && /확률|최대 \d+명/.test(x.why));
      if (miss.length) log(`턴 ${d.turn} 빠짐: ${miss.map((x) => `${x.name}(${x.why})`).join(", ")}`);
    } catch (e) {
      log("규칙 적용 실패 — 이번 턴은 직전 결정을 그대로 씀", e?.message ?? e);
    } finally {
      busy = false;
    }
    return text;
  }

  const streaming = (chat) => chat?.isStreaming === true || chat?.message?.at?.(-1)?.isStreaming === true || chat?.message?.at?.(-1)?.streaming === true;
  const sig = (chat) => `${chat?.id ?? ""}|${chat?.message?.length ?? 0}|${chat?.message?.at?.(-1)?.data?.length ?? 0}|${chat?.message?.at?.(-1)?.time ?? ""}`;

  // 응답이 끝나 화면이 잠잠해지면 리롤용 결정을 미리 써 둔다
  let settings = null;
  async function prepareReroll() {
    if (busy) return;
    try {
      settings ??= await loadLoreSettings(api);
      // '이전 결과 유지'면 리롤 때도 입력 때 결정을 그대로 쓴다
      if (settings.reroll === "keep") return;
      const charIdx = await api.getCurrentCharacterIndex();
      const chatIdx = await api.getCurrentChatIndex();
      if (!(charIdx >= 0) || !(chatIdx >= 0)) return;
      const first = await api.getChatFromIndex(charIdx, chatIdx);
      if (!first || streaming(first)) return;
      const key = `${charIdx}:${chatIdx}:${sig(first)}`;
      if (key === prepKey) return;
      // 리스가 응답 뒤 처리(출력 트리거 등)를 끝낼 때까지 한 번 더 기다려 같은지 확인
      await new Promise((r) => setTimeout(r, 1200));
      const chat = await api.getChatFromIndex(charIdx, chatIdx);
      if (!chat || streaming(chat) || sig(chat) !== sig(first) || busy) return;
      const entries = await loreEntries(charIdx, chatIdx);
      const d = prepare(entries, chat);
      prepKey = key;
      if (!d) return;
      // 리롤하면 이 결정이 쓰이므로 로그용 이유도 바꿔 둔다 (다음 입력 때 다시 정해짐)
      lastFired = d.fired.map((a) => ({ name: a.entry.comment || a.rid, why: a.why }));
      const ss = chat.scriptstate ?? {};
      const gatesSame = Object.entries(d.patch).every(([k, v]) => k === sv(STATE_VAR) || String(ss[k] ?? "") === v);
      // 확률이 없고 변수도 그대로면 쓸 필요 없음 (채팅을 건드리지 않는다)
      if (!d.random && gatesSame) return;
      await writePatch(charIdx, chatIdx, d.patch);
      log(`다시 생성 대비 (턴 ${d.turn}): ${d.fired.length ? d.fired.map((a) => a.entry.comment || a.rid).join(", ") : "켜진 항목 없음"}`);
    } catch (e) {
      log("다시 생성 대비 실패", e?.message ?? e);
    }
  }
  const onDisplay = (text) => {
    clearTimeout(prepTimer);
    prepTimer = setTimeout(() => prepareReroll(), 900);
    return text;
  };

  async function start() {
    await api.addRisuScriptHandler("input", onInput);
    await api.addRisuScriptHandler("display", onDisplay);
  }

  return { setSettings(v) {
    settings = { ...LORE_DEFAULTS, ...v };
  }, start, decide, prepare, onInput, prepareReroll, get lastFired() {
    return lastFired;
  } };
}
