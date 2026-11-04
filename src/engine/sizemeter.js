// 용량 측정 (v1.9.2, 순수): 봇·모듈·플러그인·플러그인 저장소의 크기를 분류별로 재고, 꺼진 것의 낭비 용량과 화면 렌더에 끼어드는 플러그인·모듈을 찾아낸다.
// 아이디어와 분류 방식은 RisuMeter(스페셜 땡스)에서 가져왔고, 계산은 이 프로젝트에 맞게 다시 썼다.
// 크기는 JSON 바이트로 잰 값이라 호스트 저장 형식에 따라 실제 파일 크기와 다를 수 있다.

/** UTF-8 바이트 수 (큰 버퍼를 만들지 않고 센다) */
export function utf8Len(str) {
  if (!str) return 0;
  const s = String(str);
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { n += 4; i++; } else n += 3;
    } else n += 3;
  }
  return n;
}

/** JSON으로 바꿨을 때의 바이트 수. 바꿀 수 없으면 0 */
export function jsonBytes(v) {
  if (v === undefined) return 0;
  try {
    const s = JSON.stringify(v);
    return s ? utf8Len(s) : 0;
  } catch {
    return 0;
  }
}

export function pct(part, total) {
  if (!(total > 0) || !(part > 0)) return "0.0%";
  const p = (part / total) * 100;
  return p < 0.1 ? "<0.1%" : p.toFixed(1) + "%";
}

const arr = (v) => (Array.isArray(v) ? v : []);
const keep = (parts) => parts.filter((p) => p.bytes > 0);

// ── 코드 훑기: 주석을 지우고, 문자열 안의 // 는 주석으로 보지 않는다 ──
function skipString(s, i) {
  const q = s[i], n = s.length;
  let j = i + 1;
  while (j < n) {
    const c = s[j];
    if (c === "\\") { j += 2; continue; }
    if (c === q) return j + 1;
    if (q !== "`" && c === "\n") return j; // 닫히지 않은 따옴표는 줄 끝에서 멈춘다(정규식 리터럴 오인 피해를 한 줄로 제한)
    j++;
  }
  return n;
}
export function blankComments(src) {
  const s = String(src ?? ""), n = s.length, out = [];
  let i = 0, from = 0;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '"' || c === "'" || c === "`") { i = skipString(s, i); continue; }
    if (c === "/" && d === "/") {
      out.push(s.slice(from, i), " ");
      const e = s.indexOf("\n", i);
      i = from = e < 0 ? n : e;
      continue;
    }
    if (c === "/" && d === "*") {
      out.push(s.slice(from, i), " ");
      const e = s.indexOf("*/", i + 2);
      i = from = e < 0 ? n : e + 2;
      continue;
    }
    i++;
  }
  out.push(s.slice(from));
  return out.join("");
}
function matchParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") { i = skipString(s, i) - 1; continue; }
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i;
  }
  return s.length;
}

const NONE = Object.freeze({ hasHook: false, score: 0, badge: "", tone: "", reasons: [] });
const HEAVY_RE = /\b(?:getDatabase|getChar(?:acter)?(?:FromIndex)?|getChatFromIndex)\s*\(/;

/** 플러그인 코드가 메시지 화면 표시에 끼어드는지. score 0 없음 · 1 화면 감시 · 2 display 훅 · 3 display 훅 안에서 큰 데이터를 읽음 */
export function inspectPluginRender(script) {
  const src = String(script ?? "");
  if (!/addRisuScriptHandler|getRootDocument/.test(src)) return NONE;
  const code = blankComments(src);
  let display = 0, heavy = false;
  const re = /\baddRisuScriptHandler\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    const open = m.index + m[0].length - 1;
    if (!/^\s*['"`](?:edit)?display['"`]/i.test(code.slice(open + 1, open + 40))) continue;
    display++;
    if (HEAVY_RE.test(code.slice(open, matchParen(code, open)))) heavy = true;
  }
  const dom = /\bgetRootDocument\s*\(/.test(code) && /\b(?:createMutationObserver|MutationObserver)\b/.test(code);
  if (!display && !dom) return NONE;
  const reasons = [];
  let score = 1, badge = "렌더 개입 · 화면 감시", tone = "teal";
  if (display) {
    score = 2;
    badge = "렌더 개입 · display 훅";
    reasons.push(`메시지·버튼을 다시 그릴 때마다 차례로 실행되는 display 훅 ${display}개`);
    if (heavy) {
      score = 3;
      badge = "렌더 개입 · 고부하 후보";
      tone = "danger";
      reasons.push("display 훅 안에서 getDatabase·getChar 같은 큰 데이터 읽기를 불러요. 버튼을 누를 때마다 느려질 수 있어요");
    }
  }
  if (dom) reasons.push("채팅 화면(getRootDocument)에 MutationObserver를 달아 화면이 바뀔 때마다 후처리를 해요");
  return { hasHook: true, score, badge, tone, reasons };
}

/** 모듈이 화면 표시에 끼어드는지 (Lua editDisplay · display 트리거 · editdisplay 정규식) */
export function inspectModuleRender(mod) {
  let lua = 0, disp = 0, rx = 0;
  for (const t of arr(mod?.trigger)) {
    if (!t) continue;
    if (t.type === "display") disp++;
    const e0 = Array.isArray(t.effect) ? t.effect[0] : null;
    if (e0?.type === "triggerlua" && typeof e0.code === "string" && /\blistenEdit\s*\(\s*['"`]editDisplay['"`]/.test(e0.code)) lua++;
  }
  for (const r of arr(mod?.regex)) if (r?.type === "editdisplay") rx++;
  if (!lua && !disp && !rx) return NONE;
  const parts = [];
  if (lua) parts.push(`Lua editDisplay ${lua}개`);
  if (disp) parts.push(`display 트리거 ${disp}개`);
  if (rx) parts.push(`표시용 정규식 ${rx}개`);
  let score = 1, badge = `표시 정규식 ${rx}개`, tone = "";
  if (lua || disp) { score = 2; badge = "렌더 개입 · Lua/트리거"; tone = "teal"; }
  else if (rx >= 8) { score = 2; badge = `렌더 개입 · 정규식 ${rx}개`; tone = "teal"; }
  return { hasHook: true, score, badge, tone, reasons: [`메시지를 화면에 그리는 단계마다 실행돼요: ${parts.join(" · ")}`] };
}

// ── 항목 재기 ──
/** 봇 하나. 채팅은 한 번만 직렬화하고 나머지로 분해한다(큰 봇을 두 번 직렬화하지 않음). 읽고 나면 원본은 버려도 된다 */
export function measureCharacter(c, idx) {
  const chaId = c?.chaId || `char_${idx}`;
  const chats = arr(c?.chats);
  const chatBytes = chats.length ? jsonBytes(chats) : 0;
  const { chats: _drop, ...rest } = c ?? {};
  const restBytes = jsonBytes(rest);
  const lore = arr(c?.globalLore), rx = arr(c?.customscript), trig = arr(c?.triggerscript), assets = arr(c?.additionalAssets), alt = arr(c?.alternateGreetings);
  const loreB = lore.length ? jsonBytes(lore) : 0, rxB = rx.length ? jsonBytes(rx) : 0, trigB = trig.length ? jsonBytes(trig) : 0, assetB = assets.length ? jsonBytes(assets) : 0;
  const textB = utf8Len(c?.desc) + utf8Len(c?.personality) + utf8Len(c?.scenario) + utf8Len(c?.firstMessage) + (alt.length ? jsonBytes(alt) : 0) + utf8Len(c?.systemPrompt) + utf8Len(c?.replaceGlobalNote) + utf8Len(c?.defaultVariables);
  const total = restBytes + chatBytes;
  const known = loreB + rxB + trigB + assetB + textB;
  const chatMods = {};
  for (const ch of chats) for (const id of arr(ch?.modules)) if (id) chatMods[id] = (chatMods[id] ?? 0) + 1;
  return {
    key: `char:${chaId}:${idx}`, kind: "characters", kindLabel: c?.type === "group" ? "그룹 채팅" : "캐릭터",
    idx, id: chaId, name: c?.name || `이름 없는 캐릭터 #${idx + 1}`, bytes: total,
    parts: keep([
      { label: `채팅 · ${chats.length}개`, bytes: chatBytes },
      { label: `로어북 · ${lore.length}개`, bytes: loreB },
      { label: `트리거·Lua · ${trig.length}개`, bytes: trigB },
      { label: `정규식 · ${rx.length}개`, bytes: rxB },
      { label: alt.length ? `설명·인사말 · 대체 ${alt.length}개` : "설명·인사말", bytes: textB },
      { label: `추가 에셋 목록 · ${assets.length}개`, bytes: assetB },
      { label: "기타 설정", bytes: Math.max(0, restBytes - known) }
    ]),
    links: { modIds: arr(c?.modules).filter(Boolean), chatMods },
    trashed: !!c?.trashTime
  };
}

export function measureModule(m, idx = 0) {
  const lore = arr(m?.lorebook), rx = arr(m?.regex), trig = arr(m?.trigger), assets = arr(m?.assets);
  const total = jsonBytes(m);
  const loreB = lore.length ? jsonBytes(lore) : 0, rxB = rx.length ? jsonBytes(rx) : 0, trigB = trig.length ? jsonBytes(trig) : 0, assetB = assets.length ? jsonBytes(assets) : 0;
  const embB = utf8Len(m?.backgroundEmbedding) + utf8Len(m?.cbs) + utf8Len(m?.customModuleToggle);
  const known = loreB + rxB + trigB + assetB + embB;
  const id = m?.id || `mod_${idx}`;
  return {
    key: `mod:${id}:${idx}`, kind: "modules", kindLabel: "모듈", idx, id,
    name: m?.name || `이름 없는 모듈 #${idx + 1}`, bytes: total,
    ns: typeof m?.namespace === "string" ? m.namespace.trim().toLowerCase() : "",
    parts: keep([
      { label: `로어북 · ${lore.length}개`, bytes: loreB },
      { label: `정규식 · ${rx.length}개`, bytes: rxB },
      { label: `트리거·Lua · ${trig.length}개`, bytes: trigB },
      { label: "임베딩·CBS·토글", bytes: embB },
      { label: `에셋 목록 · ${assets.length}개`, bytes: assetB },
      { label: "기타", bytes: Math.max(0, total - known) }
    ]),
    render: inspectModuleRender(m)
  };
}

export function measurePlugin(p, idx = 0) {
  const name = p?.name || `plugin_${idx}`;
  const total = jsonBytes(p), script = utf8Len(p?.script);
  const ver = p?.versionOfPlugin || p?.version || "";
  return {
    key: `plug:${name}:${idx}`, kind: "plugins", kindLabel: "플러그인", idx, id: name,
    name: p?.displayName || name, bytes: total, active: p?.enabled !== false,
    badge: ver ? `v${String(ver).replace(/^v/i, "")}` : "",
    parts: keep([{ label: "스크립트 코드", bytes: script }, { label: "설정·메타", bytes: Math.max(0, total - script) }]),
    render: inspectPluginRender(p?.script)
  };
}

/** 플러그인 저장소 키 → 항목. 용량 큰 순. 같은 접두사(: 또는 . 앞)끼리 group으로 묶는다 */
export function storageItems(list) {
  return arr(list)
    .filter((e) => e && typeof e.key === "string")
    .map((e, i) => ({ key: `store:${e.key}`, kind: "storage", kindLabel: "저장소", idx: i, id: e.key, name: e.key, group: e.key.split(/[:.]/)[0] || e.key, bytes: e.bytes || 0, parts: [] }))
    .sort((a, b) => b.bytes - a.bytes);
}

/** 항목들을 묶어 리포트로. 모듈 활성 판정은 글로벌 · 캐릭터 연결 · 채팅 연결 · 네임스페이스 연동 중 하나라도 있으면 활성 */
export function buildReport({ characters = [], modules = [], plugins = [], storage = [], db = {} }) {
  const globalSet = new Set(arr(db?.enabledModules));
  const nsSet = new Set(String(db?.moduleIntergration ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  const modName = new Map(modules.map((m) => [m.id, m.name]));
  const links = new Map(); // moduleId → Map(charIdx → {name, charLinked, chatCount})
  const touch = (id, c) => {
    let by = links.get(id);
    if (!by) links.set(id, (by = new Map()));
    let r = by.get(c.idx);
    if (!r) by.set(c.idx, (r = { idx: c.idx, name: c.name, charLinked: false, chatCount: 0 }));
    return r;
  };
  for (const c of characters) {
    for (const id of c.links?.modIds ?? []) touch(id, c).charLinked = true;
    for (const [id, n] of Object.entries(c.links?.chatMods ?? {})) touch(id, c).chatCount += n;
  }
  for (const c of characters) {
    const mine = new Map();
    for (const id of c.links?.modIds ?? []) mine.set(id, { id, charLinked: true, chatCount: 0 });
    for (const [id, n] of Object.entries(c.links?.chatMods ?? {})) {
      const r = mine.get(id) ?? { id, charLinked: false, chatCount: 0 };
      r.chatCount = n;
      mine.set(id, r);
    }
    c.linkedModules = [...mine.values()].filter((r) => modName.has(r.id)).map((r) => ({ ...r, name: modName.get(r.id) }));
  }
  for (const m of modules) {
    const linkedChars = [...(links.get(m.id)?.values() ?? [])];
    m.isGlobal = globalSet.has(m.id);
    m.linkedChars = linkedChars;
    m.active = m.isGlobal || linkedChars.length > 0 || !!(m.ns && nsSet.has(m.ns));
    m.statusLabel = m.isGlobal ? "글로벌 활성" : linkedChars.length ? (linkedChars.length === 1 ? `캐릭터 연결 · ${linkedChars[0].name}` : `캐릭터 ${linkedChars.length}명 연결`) : m.ns && nsSet.has(m.ns) ? "네임스페이스 연동" : "비활성";
    if (m.parked) { m.active = false; m.statusLabel = "Dusk에서 꺼둠"; } // Dusk가 모듈 목록에서 빼 저장소에 보관 중인 모듈
    m.statusTone = m.active ? "ok" : "warn";
    if (m.render?.hasHook && m.isGlobal && m.render.score >= 2) m.render = { ...m.render, reasons: [...m.render.reasons, "글로벌 활성이라 모든 캐릭터의 리렌더링마다 함께 실행돼요"] };
  }
  for (const p of plugins) {
    p.statusLabel = p.active ? "켜짐" : "꺼짐";
    p.statusTone = p.active ? "ok" : "warn";
  }
  const sum = (a) => a.reduce((n, x) => n + x.bytes, 0);
  const live = characters.filter((c) => !c.trashed);
  const totals = { characters: sum(characters), modules: sum(modules), plugins: sum(plugins), storage: sum(storage) };
  totals.all = totals.characters + totals.modules + totals.plugins + totals.storage;
  const offMods = modules.filter((m) => !m.active), offPlugs = plugins.filter((p) => !p.active);
  return {
    items: { characters, modules, plugins, storage },
    all: [...characters, ...modules, ...plugins, ...storage],
    totals,
    waste: { bytes: sum(offMods) + sum(offPlugs), modules: offMods.length, plugins: offPlugs.length },
    render: {
      plugins: plugins.filter((p) => p.active && p.render.hasHook).length,
      pluginsHeavy: plugins.filter((p) => p.active && p.render.score >= 3).length,
      modules: modules.filter((m) => m.active && m.render.hasHook && m.render.score >= 2).length
    },
    counts: { characters: characters.length, liveCharacters: live.length, modules: modules.length, plugins: plugins.length, storage: storage.length, all: characters.length + modules.length + plugins.length + storage.length }
  };
}
