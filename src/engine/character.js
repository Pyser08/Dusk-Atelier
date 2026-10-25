import { HASH_KEY, assetKey } from './hash.js';
import { newId, stableJson } from './util.js';
import { mergeLorebook } from './module.js';

export function characterAssetKeys(ch) {
  const keys = [];
  if (ch?.image) keys.push(ch.image);
  for (const e of ch?.emotionImages ?? []) keys.push(e?.[1]);
  for (const a of ch?.additionalAssets ?? []) keys.push(a?.[1]);
  for (const c of ch?.ccAssets ?? []) keys.push(c?.uri);
  return keys.filter(Boolean).map(String);
}
export function characterView(ch) {
  return { name: ch?.name, namespace: ch?.moduleNamespace || void 0, assets: characterAssetKeys(ch).map((k) => ["", k, ""]) };
}
function mergeNamedList(oldList, incoming, keyOf3, keepExistingOnly) {
  const oldBy = /* @__PURE__ */ new Map();
  for (const o of oldList ?? []) {
    const k = keyOf3(o);
    if (!oldBy.has(k)) oldBy.set(k, o);
  }
  const incKeys = new Set(incoming.map((i) => i.key));
  const stat = { added: 0, replaced: 0, unchanged: 0, keptExistingOnly: 0, removedExistingOnly: 0 };
  for (const i of incoming) {
    const o = oldBy.get(i.key);
    if (!o) stat.added++;
    else if (i.same(o)) stat.unchanged++;
    else stat.replaced++;
  }
  const extra = [];
  for (const o of oldList ?? []) {
    if (incKeys.has(keyOf3(o))) continue;
    if (keepExistingOnly) {
      extra.push(o);
      stat.keptExistingOnly++;
    } else stat.removedExistingOnly++;
  }
  return { extra, stat };
}
export function planCharacter(existing, incomingChar, knownKeys, keepExistingOnly) {
  const toUpload = [], byHash = /* @__PURE__ */ new Map();
  let upload = 0, uploadBytes = 0, reused = 0;
  const pathFor = (ref, oldPath) => {
    const key = assetKey(ref.hash);
    if (oldPath && HASH_KEY.exec(oldPath)?.[1] === ref.hash) return oldPath;
    if (knownKeys.has(key)) {
      reused++;
      return key;
    }
    if (!byHash.has(ref.hash)) {
      byHash.set(ref.hash, ref);
      toUpload.push(ref);
      upload++;
      uploadBytes += ref.size ?? 0;
    }
    return key;
  };
  const r = incomingChar.refs;
  const oldEmo = new Map((existing.emotionImages ?? []).map((e) => [String(e[0]).toLowerCase(), e[1]]));
  const oldAdd = new Map((existing.additionalAssets ?? []).map((a) => [`${String(a[0]).toLowerCase()}|${a[2] ?? ""}`, a[1]]));
  const emotions = r.emotions.map((e) => ({ key: e.name.toLowerCase(), name: e.name, path: pathFor(e, oldEmo.get(e.name.toLowerCase())), ref: e }));
  const additional = r.additional.map((a) => {
    const k = `${a.name.toLowerCase()}|${a.ext}`;
    return { key: k, name: a.name, ext: a.ext, path: pathFor(a, oldAdd.get(k)), ref: a };
  });
  const cc = r.cc.map((c) => ({ type: c.type, name: c.name, ext: c.ext, path: pathFor(c), ref: c }));
  const image = r.icon ? pathFor(r.icon, existing.image) : null;
  const oldVits = existing.vits?.files ?? {};
  const vits = r.vits ? r.vits.map((v) => ({ name: v.name, path: pathFor(v, oldVits[v.name]), ref: v })) : null;
  const emoM = mergeNamedList(existing.emotionImages, emotions.map((e) => ({ key: e.key, same: (o) => o[1] === e.path })), (o) => String(o[0]).toLowerCase(), keepExistingOnly);
  const addM = mergeNamedList(existing.additionalAssets, additional.map((a) => ({ key: a.key, same: (o) => o[1] === a.path })), (o) => `${String(o[0]).toLowerCase()}|${o[2] ?? ""}`, keepExistingOnly);
  return {
    toUpload,
    emotions,
    additional,
    cc,
    image,
    vits,
    emoExtra: emoM.extra,
    addExtra: addM.extra,
    stat: { upload, uploadBytes, reused, emotions: emoM.stat, additional: addM.stat, imageChanged: !!image && image !== existing.image }
  };
}
export function buildMergedCharacter(existing, incomingChar, plan, uploaded, keepExistingOnly) {
  const p = (ref, path) => ref?.hash && uploaded.get(ref.hash) || path;
  const merged = { ...existing, ...incomingChar.fields, ...incomingChar.risuFields };
  for (const k of ["loreSettings", "loreExt"]) if (merged[k] === void 0) {
    if (existing[k] !== void 0) merged[k] = existing[k];
    else delete merged[k];
  }
  for (const k of ["backgroundHTML", "license", "newGenData"]) if (merged[k] === void 0) delete merged[k];
  const lore = mergeLorebook(existing.globalLore, incomingChar.fields.globalLore, keepExistingOnly);
  merged.globalLore = lore.lorebook;
  merged.emotionImages = [...plan.emotions.map((e) => [e.name, p(e.ref, e.path)]), ...plan.emoExtra];
  merged.additionalAssets = [...plan.additional.map((a) => [a.name, p(a.ref, a.path), a.ext]), ...plan.addExtra];
  merged.ccAssets = plan.cc.map((c) => ({ type: c.type, uri: p(c.ref, c.path), name: c.name, ext: c.ext }));
  if (plan.image) merged.image = p(incomingChar.refs.icon, plan.image);
  if (plan.vits) {
    merged.vits = { name: "Imported VITS", files: Object.fromEntries(plan.vits.map((v) => [v.name, p(v.ref, v.path)])), id: existing.vits?.id ?? newId().replace(/-/g, "") };
    merged.ttsMode = "vits";
  }
  for (const k of ["chaId", "chats", "chatPage", "chatFolders", "notes", "firstMsgIndex", "type", "trashTime", "bardLore", "bardPainter", "modules"]) {
    if (k in existing) merged[k] = existing[k];
    else delete merged[k];
  }
  return { character: merged, lore: lore.stat };
}
export function newCharacterBase(incomingChar) {
  return {
    type: "character",
    chaId: newId(),
    chatPage: 0,
    notes: "",
    firstMsgIndex: -1,
    removedQuotes: false,
    imported: true,
    virtualscript: "",
    chats: [{ id: newId(), message: [], note: "", name: "Chat 1", localLore: [], supaMemory: false }],
    chatFolders: [],
    vits: null,
    ttsMode: "normal",
    emotionImages: [],
    additionalAssets: [],
    ccAssets: [],
    globalLore: [],
    bias: [],
    viewScreen: "none",
    sdData: [["always", "solo, 1girl"], ["negative", ""], ["|character's appearance", ""], ["current situation", ""], ["$character's pose", ""], ["$character's emotion", ""], ["current location", ""]],
    utilityBot: false,
    customscript: [],
    replaceGlobalNote: "",
    triggerscript: [],
    private: false,
    additionalText: "",
    largePortrait: !!incomingChar.largePortraitDefault,
    inlayViewScreen: false,
    lowLevelAccess: false,
    hideChatIcon: false,
    moduleNamespace: "",
    defaultVariables: "",
    prebuiltAssetCommand: "",
    prebuiltAssetExclude: [],
    prebuiltAssetStyle: "",
    customModuleToggle: "",
    extentions: {},
    exampleMessage: "",
    creatorNotes: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    alternateGreetings: [],
    tags: [],
    creator: "",
    characterVersion: "",
    personality: "",
    scenario: "",
    source: []
  };
}
export function uniqueDisplayName(name, characters) {
  const norm = (v) => typeof v === "string" ? v.trim().normalize("NFC").toUpperCase().toLowerCase() : "";
  const taken = new Set((characters ?? []).map((c) => norm(c?.name)).filter(Boolean));
  const base = String(name ?? "").trim();
  if (!norm(base) || !taken.has(norm(base))) return base;
  let i = 2;
  while (taken.has(norm(`${base} (${i})`))) i++;
  return `${base} (${i})`;
}
export function buildNewCharacter(incomingChar, plan, uploaded, characters) {
  const base = newCharacterBase(incomingChar);
  const { character } = buildMergedCharacter(base, incomingChar, plan, uploaded, false);
  character.name = uniqueDisplayName(character.name, characters);
  return character;
}
export var CHAR_LABELS = {
  name: "이름",
  firstMessage: "첫 메시지",
  desc: "설명",
  exampleMessage: "예시 대화",
  creatorNotes: "제작자 노트",
  systemPrompt: "시스템 프롬프트",
  postHistoryInstructions: "후속 지시",
  alternateGreetings: "추가 인사말",
  personality: "성격",
  scenario: "시나리오",
  customscript: "정규식",
  triggerscript: "트리거",
  backgroundHTML: "배경 HTML",
  lowLevelAccess: "저수준 접근",
  replaceGlobalNote: "글로벌 노트 교체",
  defaultVariables: "기본 변수",
  customModuleToggle: "모듈 토글"
};
export function characterFieldChanges(existing, incomingChar) {
  const all = { ...incomingChar.fields, ...incomingChar.risuFields };
  const norm = (v) => v === void 0 || v === null || v === false || v === "" || Array.isArray(v) && !v.length ? null : v;
  return Object.keys(CHAR_LABELS).filter((k) => k in all && stableJson(norm(existing[k])) !== stableJson(norm(all[k]))).map((k) => CHAR_LABELS[k]);
}

export async function ensureCharacterInOrder(api, chaId) {
  try { await api.checkCharOrder(); } catch {}
  try { for (let i=0;i<3;i++) { const order=(await api.getDatabase(["characterOrder"]))?.characterOrder??[]; if(order.some(x=>x===chaId||Array.isArray(x?.data)&&x.data.includes(chaId)))return; if(i===0)await new Promise(r=>setTimeout(r,300));else await api.setDatabaseLite({characterOrder:[...order,chaId]}); } } catch {}
}
