// 개발 모드 전용 파일 불러오기·내보내기 (1.5.4).
// 작업본: 파일을 리스 DB에 넣지 않고 메모리에서만 모듈/봇 객체로 만든다. 에셋 경로는 assets/<hash>.png 로 맞춰서
// 같은 이미지는 기준·새 버전 사이에서 바뀌지 않은 것으로 보인다.
import { HASH_KEY, assetKey } from './hash.js';
import { newId, slotted } from './util.js';
import { readIncoming } from './formats/index.js';
import { readAssetBytes } from './formats/bytes.js';
import { convertCharbookEntries } from './formats/card.js';
import { buildMergedCharacter, newCharacterBase, planCharacter } from './character.js';
import { CHAR_LISTS, MOD_LISTS } from './merge3.js';
import { buildRisum, safeFileName } from './export.js';
import { createZip } from './zipwrite.js';

export var WORK_ACCEPT = { module: ".risum,.json", character: ".charx,.png,.jpg,.jpeg,.json" };

export async function readWorkFile(file, kind) {
  const inc = await readIncoming(file.name, file);
  const refs = /* @__PURE__ */ new Map();
  const add = (r) => {
    if (r?.hash) refs.set(r.hash, r);
  };
  let obj;
  if (kind === "character") {
    if (!inc.character) throw new Error("봇 카드 파일이 아니에요 (.charx · .png · .jpg · 카드 .json)");
    const ch = inc.character;
    const base = newCharacterBase(ch);
    const plan = planCharacter(base, ch, /* @__PURE__ */ new Set(), false);
    obj = buildMergedCharacter(base, ch, plan, /* @__PURE__ */ new Map(), false).character;
    for (const r of [...ch.refs.emotions ?? [], ...ch.refs.additional ?? [], ...ch.refs.cc ?? [], ch.refs.icon, ...ch.refs.vits ?? []]) add(r);
    obj.chaId = `file:${file.name}`;
  } else {
    if (!inc.module || inc.character) throw new Error("모듈 파일이 아니에요 (.risum · 모듈 .json)");
    obj = JSON.parse(JSON.stringify(inc.module));
    obj.assets = (obj.assets ?? []).map((a, i) => {
      const s = inc.assets?.[i];
      if (!s?.hash) return a;
      add(s);
      return [a?.[0] ?? s.name, assetKey(s.hash), a?.[2] ?? s.ext];
    });
  }
  const readAsset = async (path) => {
    const r = refs.get(HASH_KEY.exec(String(path ?? ""))?.[1]);
    return r ? readAssetBytes(file, r) : null;
  };
  return { kind, fileName: file.name, size: file.size, obj, readAsset, notes: inc.notes ?? [] };
}

// 두 쪽이 같은 대상인지. 다르면 사람이 읽을 줄 목록.
export function identityDiff(kind, a, b) {
  const pick = (o) => kind === "module" ? [["이름", o?.name], ["네임스페이스", o?.namespace]] : [["이름", o?.name], ["제작자", o?.creator], ["네임스페이스", o?.moduleNamespace]];
  const B = new Map(pick(b));
  const out = [];
  for (const [k, v] of pick(a)) {
    const x = String(v ?? "").trim(), y = String(B.get(k) ?? "").trim();
    if (x && y && x !== y) out.push(`${k}: ${x} → ${y}`);
  }
  return out;
}

// ── 로어북·정규식·트리거 목록 ──
export var LIST_FIELD = { module: { lore: "lorebook", regex: "regex", trigger: "trigger" }, character: { lore: "globalLore", regex: "customscript", trigger: "triggerscript" } };
export var LIST_KO = { lore: "로어북", regex: "정규식", trigger: "트리거" };
var isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
var LOOKS = {
  regex: (x) => isObj(x) && "in" in x && "out" in x,
  trigger: (x) => isObj(x) && ("effect" in x || "conditions" in x),
  lore: (x) => isObj(x) && "content" in x && ("key" in x || "keys" in x || "mode" in x || "alwaysActive" in x || "comment" in x)
};
function classify(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  for (const k of ["regex", "trigger", "lore"]) if (arr.every(LOOKS[k])) return k;
  return null;
}
var fromCharbook = (book) => convertCharbookEntries(book);
var asLore = (arr) => arr.some((x) => isObj(x) && "keys" in x && !("key" in x)) ? fromCharbook({ entries: arr }) : arr;
export function parseListFile(text) {
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error("JSON을 읽지 못했어요");
  }
  const out = {};
  const put = (k, arr) => {
    if (Array.isArray(arr) && arr.length) out[k] = (out[k] ?? []).concat(JSON.parse(JSON.stringify(arr)));
  };
  if (Array.isArray(j)) {
    const k = classify(j);
    if (!k) throw new Error("로어북·정규식·트리거 중 어느 것인지 알아보지 못했어요");
    put(k, k === "lore" ? asLore(j) : j);
  } else if (j?.type === "risuModule") {
    const m = j.module ?? j;
    put("lore", m.lorebook);
    put("regex", m.regex);
    put("trigger", m.trigger);
  } else if (j?.spec === "chara_card_v2" || j?.spec === "chara_card_v3") {
    const d = j.data ?? {}, r = d.extensions?.risuai ?? {};
    if (d.character_book) put("lore", fromCharbook(d.character_book));
    put("regex", r.customScripts);
    put("trigger", r.triggerscript);
  } else if (Array.isArray(j?.entries)) {
    put("lore", fromCharbook(j));
  } else if (Array.isArray(j?.data)) {
    const k = j.type === "regex" ? "regex" : j.type === "trigger" ? "trigger" : classify(j.data) ?? (j.type === "risu" ? "lore" : null);
    if (!k) throw new Error("로어북·정규식·트리거 중 어느 것인지 알아보지 못했어요");
    put(k, k === "lore" ? asLore(j.data) : j.data);
  } else {
    for (const [k, f] of [["lore", "lorebook"], ["lore", "globalLore"], ["regex", "regex"], ["regex", "customscript"], ["trigger", "trigger"], ["trigger", "triggerscript"]]) put(k, j?.[f]);
  }
  if (!Object.keys(out).length) throw new Error("파일에서 로어북·정규식·트리거를 찾지 못했어요");
  return out;
}
// mode: "replace" = 목록 전체 교체, "merge" = 같은 항목(이름·키 기준)은 바꾸고 새 항목은 뒤에 추가
export function applyListImport(kind, obj, lists, mode) {
  const F = LIST_FIELD[kind], ids = kind === "module" ? MOD_LISTS : CHAR_LISTS;
  const next = {}, stat = {};
  for (const [k, inc] of Object.entries(lists)) {
    const f = F[k], cur = obj?.[f] ?? [];
    if (mode === "replace") {
      next[f] = inc;
      stat[k] = { removed: cur.length, added: inc.length, updated: 0 };
      continue;
    }
    const idOf = ids[f];
    const incS = slotted(inc, idOf), incBy = new Map(incS.map((x) => [x.slot, x.item]));
    const used = /* @__PURE__ */ new Set();
    let updated = 0, added = 0;
    const list = slotted(cur, idOf).map((x) => {
      if (!incBy.has(x.slot)) return x.item;
      used.add(x.slot);
      updated++;
      return incBy.get(x.slot);
    });
    for (const x of incS) if (!used.has(x.slot)) {
      list.push(x.item);
      added++;
    }
    next[f] = list;
    stat[k] = { removed: 0, added, updated };
  }
  return { next, stat };
}
export function listExportText(kind, obj, k) {
  const data = obj?.[LIST_FIELD[kind][k]] ?? [];
  return JSON.stringify(k === "lore" ? { type: "risu", ver: 1, data } : { type: k, data }, null, 2);
}

// ── 봇 카드 .charx (V3 + module.risum) ──
var extOf = (p) => /\.([a-z0-9]{1,8})$/i.exec(String(p ?? ""))?.[1]?.toLowerCase() ?? "";
var isAssetPath = (p) => typeof p === "string" && p.startsWith("assets/");
var splitKeys = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
var clean = (o) => {
  for (const k of Object.keys(o)) if (o[k] === void 0) delete o[k];
  return o;
};
export async function buildCharx(ch, readAsset, { onProgress } = {}) {
  const zip = createZip();
  const assets = [], used = /* @__PURE__ */ new Set(), cache = /* @__PURE__ */ new Map();
  const jobs = [];
  if (isAssetPath(ch.image)) jobs.push({ type: "icon", name: "main", ext: "png", path: ch.image });
  for (const e of ch.emotionImages ?? []) if (isAssetPath(e?.[1])) jobs.push({ type: "emotion", name: String(e[0] ?? ""), ext: extOf(e[1]) || "png", path: e[1] });
  for (const a of ch.additionalAssets ?? []) if (isAssetPath(a?.[1])) jobs.push({ type: "x-risu-asset", name: String(a[0] ?? ""), ext: String(a[2] || extOf(a[1]) || "png"), path: a[1] });
  for (const c of ch.ccAssets ?? []) if (isAssetPath(c?.uri) && !(c.type === "icon" && c.name === "main")) jobs.push({ type: c.type || "asset", name: String(c.name ?? ""), ext: String(c.ext || extOf(c.uri) || "png"), path: c.uri });
  let n = 0;
  for (const j of jobs) {
    let p = cache.get(j.path);
    if (!p) {
      const data = await readAsset(j.path);
      if (!data?.length) throw new Error(`에셋을 읽지 못했어요: ${j.name || j.path}`);
      const ext = safeFileName(j.ext).replace(/\./g, "") || "png";
      const dir = `assets/${safeFileName(j.type)}/`;
      const stem = safeFileName(j.name || "asset");
      p = `${dir}${stem}.${ext}`;
      for (let i = 2; used.has(p.toLowerCase()); i++) p = `${dir}${stem}_${i}.${ext}`;
      used.add(p.toLowerCase());
      cache.set(j.path, p);
      zip.add(p, data instanceof Uint8Array ? data : new Uint8Array(data));
    }
    assets.push({ type: j.type, uri: `embeded://${p}`, name: j.name, ext: j.ext });
    onProgress?.(++n, jobs.length);
  }
  const ls = ch.loreSettings;
  const lore = ch.globalLore ?? [];
  const book = clean({
    name: ch.name ?? "",
    entries: lore.map((l, i) => ({
      keys: splitKeys(l.key),
      secondary_keys: splitKeys(l.secondkey),
      content: l.content ?? "",
      extensions: {},
      enabled: true,
      insertion_order: l.insertorder ?? 100,
      constant: !!l.alwaysActive,
      selective: !!l.selective,
      name: l.comment ?? "",
      comment: l.comment ?? "",
      case_sensitive: false,
      use_regex: !!l.useRegex,
      id: i
    })),
    extensions: { ...ch.loreExt ?? {}, ...ls ? { risu_fullWordMatching: ls.fullWordMatching, risu_maxRecursionSteps: ls.maxRecursionSteps, risu_matchingMode: ls.matchingMode } : {} },
    scan_depth: ls?.scanDepth,
    token_budget: ls?.tokenBudget,
    recursive_scanning: ls?.recursiveScanning
  });
  const risuai = clean({
    bias: ch.bias ?? [],
    viewScreen: ch.viewScreen ?? "none",
    customScripts: ch.customscript ?? [],
    utilityBot: !!ch.utilityBot,
    replaceGlobalNote: ch.replaceGlobalNote ?? "",
    backgroundHTML: ch.backgroundHTML,
    license: ch.license,
    triggerscript: ch.triggerscript ?? [],
    private: !!ch.private,
    additionalText: ch.additionalText ?? "",
    largePortrait: !!ch.largePortrait,
    inlayViewScreen: !!ch.inlayViewScreen,
    newGenData: ch.newGenData,
    lowLevelAccess: !!ch.lowLevelAccess,
    hideChatIcon: !!ch.hideChatIcon,
    moduleNamespace: ch.moduleNamespace ?? "",
    defaultVariables: ch.defaultVariables ?? "",
    prebuiltAssetCommand: ch.prebuiltAssetCommand ?? "",
    prebuiltAssetExclude: ch.prebuiltAssetExclude ?? [],
    prebuiltAssetStyle: ch.prebuiltAssetStyle ?? "",
    toggles: ch.customModuleToggle ?? "",
    sdData: ch.sdData
  });
  const card = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: ch.name ?? "",
      description: ch.desc ?? "",
      personality: ch.personality ?? "",
      scenario: ch.scenario ?? "",
      first_mes: ch.firstMessage ?? "",
      mes_example: ch.exampleMessage ?? "",
      creator_notes: ch.creatorNotes ?? "",
      system_prompt: ch.systemPrompt ?? "",
      post_history_instructions: ch.postHistoryInstructions ?? "",
      alternate_greetings: ch.alternateGreetings ?? [],
      character_book: book,
      tags: ch.tags ?? [],
      creator: ch.creator ?? "",
      character_version: ch.characterVersion ?? "",
      extensions: { ...ch.extentions ?? {}, risuai },
      group_only_greetings: ch.group_only_greetings ?? [],
      nickname: ch.nickname ?? "",
      source: ch.source ?? [],
      creation_date: ch.creation_date || Math.floor(Date.now() / 1e3),
      modification_date: Math.floor(Date.now() / 1e3),
      assets
    }
  };
  // 로어북·정규식·트리거는 module.risum에 그대로 넣어 리스에서 다시 불러올 때 손실이 없게 한다.
  const md = await buildRisum({ name: ch.name ?? "", description: "", id: newId(), lorebook: lore, regex: ch.customscript ?? [], trigger: ch.triggerscript ?? [], assets: [] }, async () => null);
  zip.add("card.json", JSON.stringify(card, null, 2));
  zip.add("module.risum", new Uint8Array(await md.arrayBuffer()));
  return zip.blob();
}
