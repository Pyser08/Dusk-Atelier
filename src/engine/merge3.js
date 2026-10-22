import { slotted, stableJson } from './util.js';
import { AUTHOR_FIELDS, loreIdentity } from './module.js';
import { CHAR_LABELS } from './character.js';

var idName = (e) => String(e?.[0] ?? "").toLowerCase();
var idNameExt = (e) => `${String(e?.[0] ?? "").toLowerCase()}|${e?.[2] ?? ""}`;
var idScript = (e) => JSON.stringify([e?.comment ?? "", e?.type ?? ""]);
export var CHAR_LISTS = { globalLore: loreIdentity, customscript: idScript, triggerscript: idScript, emotionImages: idName, additionalAssets: idNameExt };
export var MOD_LISTS = { lorebook: loreIdentity, regex: idScript, trigger: idScript, assets: idNameExt };
export var USER_KEYS = ["chaId", "chats", "chatPage", "chatFolders", "notes", "firstMsgIndex", "type", "trashTime", "bardLore", "bardPainter", "modules"];
export function charIncomingView(incomingChar, plan, uploaded) {
  const p = (ref, path) => ref?.hash && uploaded.get(ref.hash) || path;
  const v = { ...incomingChar.fields, ...incomingChar.risuFields };
  v.emotionImages = plan.emotions.map((e) => [e.name, p(e.ref, e.path)]);
  v.additionalAssets = plan.additional.map((a) => [a.name, p(a.ref, a.path), a.ext]);
  v.ccAssets = plan.cc.map((c) => ({ type: c.type, uri: p(c.ref, c.path), name: c.name, ext: c.ext }));
  if (plan.image) v.image = p(incomingChar.refs.icon, plan.image);
  if (plan.vits) {
    v.vits = { name: "Imported VITS", files: Object.fromEntries(plan.vits.map((x) => [x.name, p(x.ref, x.path)])) };
    v.ttsMode = "vits";
  }
  return v;
}
export function modIncomingView(incoming, plan, uploaded, knownKeys) {
  const inc = incoming.module;
  const v = {};
  for (const f of AUTHOR_FIELDS) v[f] = inc[f];
  v.lorebook = inc.lorebook ?? [];
  v.assets = plan.entries.map(({ asset, path }) => [asset.name, asset.hash && uploaded.get(asset.hash) || path, asset.ext]);
  if (plan.iconPath) v.icon = incoming.icon?.hash && uploaded.get(incoming.icon.hash) || plan.iconPath;
  else if (inc.icon && knownKeys.has(inc.icon)) v.icon = inc.icon;
  return v;
}
export function pickView(obj, keys) {
  const v = {};
  for (const k of keys) if (obj && k in obj) v[k] = obj[k];
  return v;
}
export function merge3(base, cur, inc, spec, { choices = /* @__PURE__ */ new Map(), keepExistingOnly = true } = {}) {
  const eq = (a, b) => stableJson(a ?? null) === stableJson(b ?? null);
  const items = [];
  const view = {};
  const hasBase = !!base;
  const pick = (id, group, label, b, c, i, inB, inC, inI) => {
    if (!hasBase) {
      if (!inI) return keepExistingOnly ? [c, "kept"] : [void 0, "removed"];
      if (!inC) return [i, "added"];
      return eq(c, i) ? [c, "same"] : [i, "update"];
    }
    if (inC && inI && eq(c, i)) return [c, "same"];
    if (!inB) {
      if (inI && !inC) return [i, "added"];
      if (inC && !inI) return [c, "mine"];
      const ch = choices.get(id) ?? "inc";
      return [ch === "cur" ? c : i, "conflict"];
    }
    if (!inC) {
      if (!inI || eq(i, b)) return [void 0, "mine"];
      return (choices.get(id) ?? "inc") === "cur" ? [void 0, "conflict"] : [i, "conflict"];
    }
    if (!inI) {
      if (eq(c, b)) return [void 0, "removed"];
      return (choices.get(id) ?? "inc") === "cur" ? [c, "conflict"] : [void 0, "conflict"];
    }
    if (eq(c, b)) return [i, "update"];
    if (eq(i, b)) return [c, "mine"];
    return [(choices.get(id) ?? "inc") === "cur" ? c : i, "conflict"];
  };
  const record = (id, group, label, kind, extra) => {
    if (kind !== "same") items.push({ id, group, label, kind, choice: kind === "conflict" ? choices.get(id) ?? "inc" : void 0, ...extra });
  };
  for (const k of spec.scalars) {
    const has2 = (o, key) => !!o && key in o && o[key] !== void 0;
    const inB = hasBase && has2(base, k), inC = has2(cur, k), inI = has2(inc, k);
    if (!inI && !inB) continue;
    if (!hasBase && !inI) continue;
    const [val, kind] = pick(`f:${k}`, "field", spec.label(k), base?.[k], cur[k], inc[k], inB, inC, inI);
    if (kind === "removed" || val === void 0 && kind !== "kept") view[k] = void 0;
    else view[k] = val;
    if (kind === "kept") continue;
    record(`f:${k}`, "field", spec.label(k), kind, { cur: cur[k], inc: inc[k] });
  }
  for (const [k, idOf] of Object.entries(spec.lists)) {
    if (!(k in inc) && !(hasBase && k in base)) continue;
    const B = slotted(hasBase ? base[k] : [], idOf), C = slotted(cur[k], idOf), I = slotted(inc[k], idOf);
    const bm = new Map(B.map((x) => [x.slot, x.item])), cm = new Map(C.map((x) => [x.slot, x.item])), im = new Map(I.map((x) => [x.slot, x.item]));
    const out = [];
    const decide = (slot) => {
      const id = `l:${k}:${slot}`;
      const label = spec.itemLabel(k, cm.get(slot) ?? im.get(slot) ?? bm.get(slot));
      const [val, kind] = pick(id, k, label, bm.get(slot), cm.get(slot), im.get(slot), bm.has(slot), cm.has(slot), im.has(slot));
      record(id, k, label, kind, { cur: cm.get(slot), inc: im.get(slot) });
      return val;
    };
    const done = /* @__PURE__ */ new Set();
    for (const { slot } of I) {
      done.add(slot);
      const v = decide(slot);
      if (v !== void 0) out.push(v);
    }
    for (const { slot } of C) {
      if (done.has(slot)) continue;
      done.add(slot);
      const v = decide(slot);
      if (v !== void 0) out.push(v);
    }
    view[k] = out;
  }
  return { view, items, hasBase };
}
export function charSpec(incomingChar) {
  const scalars = [.../* @__PURE__ */ new Set([...Object.keys(incomingChar.fields), ...Object.keys(incomingChar.risuFields), "image", "ccAssets", ...incomingChar.refs.vits ? ["vits", "ttsMode"] : []])].filter((k) => !(k in CHAR_LISTS));
  return { scalars, lists: CHAR_LISTS, label: (k) => CHAR_LABELS[k] ?? FIELD_EXTRA_LABELS[k] ?? k, itemLabel: listItemLabel };
}
export var MOD_SPEC = { scalars: [...AUTHOR_FIELDS.filter((k) => !(k in MOD_LISTS)), "icon"], lists: MOD_LISTS, label: (k) => MOD_LABELS[k] ?? k, itemLabel: listItemLabel };
var FIELD_EXTRA_LABELS = {
  image: "대표 이미지",
  ccAssets: "기타 카드 에셋",
  vits: "음성(VITS)",
  ttsMode: "TTS 방식",
  tags: "태그",
  creator: "제작자",
  characterVersion: "카드 버전",
  additionalData: "카드 메타데이터",
  extentions: "카드 확장",
  group_only_greetings: "그룹 첫 메시지",
  nickname: "별칭",
  source: "출처",
  creation_date: "작성일",
  modification_date: "수정일",
  loreSettings: "로어북 설정",
  loreExt: "로어북 확장",
  bias: "토큰 편향",
  viewScreen: "캐릭터 화면",
  utilityBot: "도구 봇",
  license: "라이선스",
  private: "비공개 카드",
  additionalText: "추가 텍스트",
  largePortrait: "세로 이미지",
  inlayViewScreen: "인레이 화면",
  newGenData: "이미지 생성 설정",
  hideChatIcon: "아이콘 숨기기",
  moduleNamespace: "모듈 네임스페이스",
  prebuiltAssetCommand: "사전 제작 에셋 명령",
  prebuiltAssetExclude: "사전 제작 에셋 제외",
  prebuiltAssetStyle: "사전 제작 에셋 스타일",
  sdData: "이미지 생성 프롬프트"
};
var MOD_LABELS = {
  name: "이름",
  description: "설명",
  cjs: "스크립트",
  lowLevelAccess: "저수준 접근",
  hideIcon: "아이콘 숨김",
  backgroundEmbedding: "배경 HTML",
  namespace: "네임스페이스",
  customModuleToggle: "모듈 토글",
  mcp: "MCP",
  icon: "아이콘",
  regex: "정규식",
  trigger: "트리거"
};
var LIST_LABELS = {
  globalLore: "로어북",
  lorebook: "로어북",
  customscript: "정규식",
  regex: "정규식",
  triggerscript: "트리거",
  trigger: "트리거",
  emotionImages: "감정 이미지",
  additionalAssets: "에셋",
  assets: "에셋"
};
export function listItemLabel(list, item) {
  const g = LIST_LABELS[list] ?? list;
  if (Array.isArray(item)) return `${g}: ${item[0] || "(이름 없음)"}`;
  return `${g}: ${item?.comment || item?.key || "(이름 없음)"}`;
}
export function applyView(existing, view, { userKeys = [] } = {}) {
  const out = { ...existing };
  for (const [k, v] of Object.entries(view)) {
    if (v === void 0) delete out[k];
    else out[k] = v;
  }
  for (const k of userKeys) {
    if (k in existing) out[k] = existing[k];
    else delete out[k];
  }
  return out;
}
export function summarize(items) {
  const s = { update: 0, mine: 0, conflict: 0, added: 0, removed: 0, kept: 0 };
  for (const it of items) s[it.kind] = (s[it.kind] ?? 0) + 1;
  return s;
}
