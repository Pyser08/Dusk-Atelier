import { sha256, sha256js } from '../hash.js';
import { Cancelled } from '../util.js';
import { scanRisum } from './risum.js';
import { readZipDirectory, readZipEntry } from './zip.js';

function convertCharbookEntries(charbook) {
  const out = [];
  for (const src of charbook?.entries ?? []) {
    const book = { ...src };
    let content = book.content;
    if (book.use_regex && !book.keys?.[0]?.startsWith("/")) book.use_regex = false;
    const extensions = JSON.parse(JSON.stringify(book.extensions ?? {}));
    if (extensions.useProbability && extensions.probability !== void 0 && extensions.probability !== 100) {
      content = `@@probability ${extensions.probability}
` + content;
      delete extensions.useProbability;
      delete extensions.probability;
    }
    if (extensions.position === 4 && typeof extensions.depth === "number" && typeof extensions.role === "number") {
      content = `@@depth ${extensions.depth}
@@role ${["system", "user", "assistant"][extensions.role]}
` + content;
      delete extensions.position;
      delete extensions.depth;
      delete extensions.role;
    }
    if (typeof extensions.selectiveLogic === "number" && book.secondary_keys && book.secondary_keys.length > 0) {
      switch (extensions.selectiveLogic) {
        case 1:
          book.selective = false;
          content = `@@exclude_keys_all ${book.secondary_keys.join(",")}
` + content;
          break;
        case 2:
          book.selective = false;
          for (const k of book.secondary_keys) content = `@@exclude_keys ${k}
` + content;
          break;
        case 3:
          book.selective = false;
          for (const k of book.secondary_keys) content = `@@additional_keys ${k}
` + content;
          break;
      }
    }
    if (typeof extensions.delay === "number" && extensions.delay > 0) {
      content = `@@activate_only_after ${extensions.delay}
` + content;
      delete extensions.delay;
    }
    if (extensions.match_whole_words === true) {
      content = `@@match_word_boundary
` + content;
      delete extensions.match_whole_words;
    }
    if (extensions.match_whole_words === false) {
      content = `@@match_partial_word
` + content;
      delete extensions.match_whole_words;
    }
    const rid = extensions.risu_id ?? book.id;
    out.push({
      enabled: book.enabled ?? true,
      key: (book.keys ?? []).join(", "),
      secondkey: book.secondary_keys?.join(", ") ?? "",
      insertorder: book.insertion_order,
      comment: book.name ?? book.comment ?? "",
      content,
      mode: book.mode ?? "normal",
      alwaysActive: book.constant ?? false,
      selective: book.selective ?? false,
      extentions: { ...extensions, risu_case_sensitive: book.case_sensitive },
      activationPercent: book.extensions?.risu_activationPercent,
      loreCache: book.extensions?.risu_loreCache ?? null,
      useRegex: book.use_regex ?? false,
      bookVersion: extensions.risu_bookVersion,
      id: rid === void 0 || rid === null ? void 0 : String(rid),
      folder: book.folder
    });
  }
  return out;
}
export function cardToModule(card2, md, assetRef) {
  const data = card2.data ?? {};
  const risuext = data.extensions?.risuai;
  const assets = [];
  let icon2 = null;
  for (const a of data.assets ?? []) {
    const uri = String(a.uri ?? "");
    let ref = null;
    if (uri.startsWith("__asset:")) ref = assetRef(uri.slice(8), true);
    else if (uri.startsWith("embeded://")) ref = assetRef(uri.slice(10), true);
    else if (uri.startsWith("data:")) ref = assetRef(uri, false);
    else continue;
    if (!ref) continue;
    const name = a.name ?? "";
    if (a.type === "x-risu-asset") assets.push({ ...ref, name: String(name), ext: String(a.ext ?? "unknown") });
    else if (a.type === "icon" && a.name === "main") icon2 = ref;
  }
  let lorebook = md?.lorebook ? JSON.parse(JSON.stringify(md.lorebook)) : convertCharbookEntries(data.character_book);
  const desc = data.description ?? "";
  if (desc) lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From Character Description", content: `@@indicator character_desc

${desc}`, mode: "constant", alwaysActive: true, selective: false });
  const first = data.first_mes ?? "", alts = data.alternate_greetings ?? [];
  if (first || alts.length > 0) {
    let fm = `<FM>
${first}
</FM>`;
    for (const g of alts) fm += `
<FM_alt>
${g}
</FM_alt>`;
    lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From First Messages", content: `@@indicator character_first_message

${fm}`, mode: "constant", alwaysActive: false, selective: false });
  }
  const rgn = risuext && !Object.prototype.hasOwnProperty.call(risuext, "replaceGlobalNote") ? data.post_history_instructions ?? "" : risuext?.replaceGlobalNote ?? "";
  if (rgn) lorebook.push({ key: "", secondkey: "", insertorder: 0, comment: "From Replace Global Note", content: `@@indicator replace_global_note

${rgn}`, mode: "constant", alwaysActive: true, selective: false });
  const mod = {
    name: data.name ?? "",
    description: data.creator_notes ?? "",
    lorebook,
    regex: md ? md.regex ?? [] : risuext?.customScripts ?? [],
    trigger: md ? md.trigger ?? [] : risuext?.triggerscript ?? [],
    lowLevelAccess: risuext?.lowLevelAccess ?? false,
    hideIcon: risuext?.hideChatIcon ?? false,
    namespace: risuext?.moduleNamespace ?? "",
    backgroundEmbedding: risuext?.backgroundHTML,
    customModuleToggle: risuext?.toggles ?? ""
  };
  if (mod.backgroundEmbedding === void 0) delete mod.backgroundEmbedding;
  return { mod, assets, icon: icon2, bardExtension: !!data.extensions?.risubard };
}
var MAX_ZIP_ASSET = 100 * 1024 * 1024;
export async function readCharx(blob, onProgress, shouldStop) {
  const entries = await readZipDirectory(blob);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const cardEntry = byName.get("card.json");
  if (!cardEntry) throw new Error("charx 안에 card.json이 없습니다");
  const card2 = JSON.parse(new TextDecoder().decode(await readZipEntry(blob, cardEntry)));
  if (card2?.spec !== "chara_card_v3") throw new Error("charx의 card.json이 V3 카드가 아닙니다");
  let md = null;
  const mdEntry = byName.get("module.risum");
  if (mdEntry) {
    const bytes = await readZipEntry(blob, mdEntry);
    md = (await scanRisum(new Blob([bytes]))).module;
  }
  const wanted = /* @__PURE__ */ new Set();
  for (const a of card2.data?.assets ?? []) {
    const uri = String(a.uri ?? "");
    if (uri.startsWith("embeded://")) wanted.add(uri.slice(10));
    else if (uri.startsWith("__asset:")) wanted.add(uri.slice(8));
  }
  const refs = /* @__PURE__ */ new Map();
  let doneBytes = 0;
  const totalBytes = [...wanted].reduce((s, n) => s + (byName.get(n)?.compSize ?? 0), 0) || 1;
  let count = 0;
  for (const name of wanted) {
    if (shouldStop?.()) throw new Cancelled();
    const entry2 = byName.get(name);
    if (!entry2 || entry2.name === "card.json" || entry2.name === "module.risum" || entry2.name.endsWith(".json") || entry2.size > MAX_ZIP_ASSET) {
      throw new Error(`charx에 카드가 가리키는 에셋이 없습니다: ${name}`);
    }
    const data = await readZipEntry(blob, entry2);
    refs.set(name, { source: "zip", entry: entry2, size: data.length, hash: await sha256(data) });
    doneBytes += entry2.compSize;
    count++;
    onProgress?.(doneBytes / totalBytes * blob.size, blob.size, count);
  }
  const dataRefs = /* @__PURE__ */ new Map();
  const assetRef = (key, mode) => {
    if (mode === true) return refs.get(key) ?? null;
    if (!key) return null;
    if (!dataRefs.has(key)) dataRefs.set(key, inlineRef(mode === false ? key.split(",")[1] ?? "" : key));
    return dataRefs.get(key);
  };
  const { mod, assets, icon: icon2, bardExtension } = cardToModule(card2, md, assetRef);
  const list = assets.map((a, index) => ({ ...a, index }));
  const character = cardToCharacter(card2, md, assetRef, null);
  return {
    kind: "charx",
    module: mod,
    assets: list,
    icon: icon2,
    character,
    notes: bardExtension ? ["RisuBard 전용 확장(bardLore 등)이 있는 카드입니다. 로어북 처리 결과가 기본 임포트와 조금 다를 수 있습니다."] : []
  };
}
var nullish = (v) => v === null || v === void 0;
export function cardToCharacter(card2, md, assetRef, mainRef) {
  const data = card2.data ?? {};
  const risuext = data.extensions?.risuai ? JSON.parse(JSON.stringify(data.extensions.risuai)) : void 0;
  if (md && risuext) {
    risuext.triggerscript = md.trigger ?? [];
    risuext.customScripts = md.regex ?? [];
  }
  const refs = { emotions: [], additional: [], cc: [], icon: mainRef ?? null, vits: null };
  const v2Ref = (val) => String(val ?? "").startsWith("__asset:") ? assetRef(String(val).slice(8), true) : assetRef(String(val ?? ""), "b64");
  if (risuext && card2.spec === "chara_card_v2") {
    for (const e of risuext.emotions ?? []) {
      const r = v2Ref(e[1]);
      if (r) refs.emotions.push({ ...r, name: String(e[0] ?? "") });
    }
    for (const a of risuext.additionalAssets ?? []) {
      const r = v2Ref(a[1]);
      if (r) refs.additional.push({ ...r, name: String(a[0] ?? ""), ext: a.length >= 3 ? String(a[2] ?? "") : "" });
    }
    const vk = Object.keys(risuext.vits ?? {});
    if (vk.length) refs.vits = vk.map((k) => ({ ...v2Ref(risuext.vits[k]), name: k }));
  }
  for (const a of card2.spec === "chara_card_v3" ? data.assets ?? [] : []) {
    const uri = String(a.uri ?? "");
    let ref = null;
    if (uri.startsWith("__asset:")) ref = assetRef(uri.slice(8), true);
    else if (uri.startsWith("embeded://")) ref = assetRef(uri.slice(10), true);
    else if (uri.startsWith("data:")) ref = assetRef(uri, false);
    else if (uri === "ccdefault:") ref = mainRef ?? null;
    else continue;
    if (!ref) continue;
    const name = String(a.name ?? "");
    if (a.type === "emotion") refs.emotions.push({ ...ref, name });
    else if (a.type === "x-risu-asset") refs.additional.push({ ...ref, name, ext: String(a.ext ?? "unknown") });
    else if (a.type === "icon" && a.name === "main") refs.icon = ref;
    else refs.cc.push({ ...ref, name, type: a.type ?? "asset", ext: a.ext ?? "unknown" });
  }
  const charbook = data.character_book;
  let lorebook = md?.lorebook ? JSON.parse(JSON.stringify(md.lorebook)) : [];
  let loreSettings, loreExt;
  if (charbook) {
    if (!nullish(charbook.recursive_scanning) && !nullish(charbook.scan_depth) && !nullish(charbook.token_budget)) {
      const ex = charbook.extensions ?? {};
      const mm = ex.risu_matchingMode;
      loreSettings = {
        tokenBudget: charbook.token_budget,
        scanDepth: charbook.scan_depth,
        recursiveScanning: charbook.recursive_scanning,
        maxRecursionSteps: ex.risu_maxRecursionSteps ?? 0,
        fullWordMatching: ex.risu_fullWordMatching ?? false,
        matchingMode: mm === "partial" || mm === "whitespace" || mm === "word-boundary" ? mm : ex.risu_fullWordMatching ? "whitespace" : "partial"
      };
    }
    loreExt = charbook.extensions;
    if (!md?.lorebook) lorebook = convertCharbookEntries(charbook);
  }
  const ext = JSON.parse(JSON.stringify(data.extensions ?? {}));
  delete ext.risuai;
  delete ext.risubard;
  delete ext.depth_prompt;
  const fields = {
    name: data.name ?? "",
    firstMessage: data.first_mes ?? "",
    desc: data.description ?? "",
    exampleMessage: data.mes_example ?? "",
    creatorNotes: data.creator_notes ?? "",
    systemPrompt: data.system_prompt ?? "",
    postHistoryInstructions: data.post_history_instructions ?? "",
    alternateGreetings: data.alternate_greetings ?? [],
    tags: data.tags ?? [],
    creator: data.creator ?? "",
    characterVersion: `${data.character_version}` || "",
    personality: data.personality ?? "",
    scenario: data.scenario ?? "",
    additionalData: { tag: data.tags ?? [], creator: data.creator, character_version: data.character_version },
    extentions: ext,
    group_only_greetings: data.group_only_greetings ?? [],
    nickname: data.nickname ?? "",
    source: data.source ?? risuext?.source ?? [],
    creation_date: data.creation_date ?? 0,
    modification_date: data.modification_date ?? 0,
    globalLore: lorebook,
    loreSettings,
    loreExt
  };
  const risuFields = risuext ? {
    bias: risuext.bias ?? [],
    viewScreen: risuext.viewScreen ?? "none",
    customscript: risuext.customScripts ?? [],
    utilityBot: risuext.utilityBot ?? false,
    replaceGlobalNote: !Object.prototype.hasOwnProperty.call(risuext, "replaceGlobalNote") ? data.post_history_instructions ?? "" : risuext.replaceGlobalNote ?? "",
    backgroundHTML: risuext.backgroundHTML,
    license: risuext.license,
    triggerscript: risuext.triggerscript ?? [],
    private: risuext.private ?? false,
    additionalText: risuext.additionalText ?? "",
    largePortrait: risuext.largePortrait ?? false,
    inlayViewScreen: risuext.inlayViewScreen ?? false,
    newGenData: risuext.newGenData ?? void 0,
    lowLevelAccess: risuext.lowLevelAccess ?? false,
    hideChatIcon: risuext.hideChatIcon ?? false,
    moduleNamespace: risuext.moduleNamespace ?? "",
    defaultVariables: risuext.defaultVariables ?? "",
    prebuiltAssetCommand: risuext.prebuiltAssetCommand ?? "",
    prebuiltAssetExclude: risuext.prebuiltAssetExclude ?? [],
    prebuiltAssetStyle: risuext.prebuiltAssetStyle ?? "",
    customModuleToggle: risuext.toggles ?? "",
    ...risuext.sdData ? { sdData: risuext.sdData } : {}
  } : {};
  return { fields, risuFields, refs, hasRisuExt: !!risuext, largePortraitDefault: !risuext };
}
export function offSpecToCharacter(charaData, mainRef) {
  const v2 = charaData.spec_version === "2.0";
  const data = v2 ? charaData.data : charaData;
  const charbook = v2 ? charaData.data.character_book : null;
  let loreSettings, loreExt, lorebook = [];
  if (charbook) {
    if (!nullish(charbook.recursive_scanning) && !nullish(charbook.scan_depth) && !nullish(charbook.token_budget)) {
      const ex = charbook.extensions ?? {}, mm = ex.risu_matchingMode;
      loreSettings = {
        tokenBudget: charbook.token_budget,
        scanDepth: charbook.scan_depth,
        recursiveScanning: charbook.recursive_scanning,
        maxRecursionSteps: ex.risu_maxRecursionSteps ?? 0,
        fullWordMatching: ex.risu_fullWordMatching ?? false,
        matchingMode: mm === "partial" || mm === "whitespace" || mm === "word-boundary" ? mm : ex.risu_fullWordMatching ? "whitespace" : "partial"
      };
    }
    loreExt = charbook.extensions;
    lorebook = convertCharbookEntries(charbook);
  }
  return {
    fields: {
      name: data.name ?? "unknown name",
      firstMessage: data.first_mes ?? "unknown first message",
      desc: data.description ?? "",
      exampleMessage: data.mes_example,
      systemPrompt: (v2 ? charaData.data.system_prompt : "") ?? "",
      postHistoryInstructions: (v2 ? charaData.data.post_history_instructions : "") ?? "",
      personality: data.personality ?? "",
      scenario: data.scenario ?? "",
      globalLore: lorebook,
      loreSettings,
      loreExt
    },
    risuFields: {},
    refs: { emotions: [], additional: [], cc: [], icon: mainRef ?? null, vits: null },
    hasRisuExt: false,
    largePortraitDefault: false,
    offSpec: true
  };
}
export function b64bytes(b642) {
  const bin = atob(String(b642).replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
export function inlineRef(b642) {
  const bytes = b64bytes(b642);
  return { source: "mem", bytes, size: bytes.length, hash: sha256js(bytes) };
}
export function missingRef(key, mode) {
  if (mode === true) throw new Error(`카드가 가리키는 에셋이 파일 안에 없습니다: ${key}`);
  if (!key) return null;
  return inlineRef(mode === false ? key.split(",")[1] ?? "" : key);
}
