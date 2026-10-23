import { openAssetsCore } from './assetmgr.js';
import { stableJson } from '../../engine/util.js';
import { USER_KEYS } from '../../engine/merge3.js';
import { createStore } from '../../engine/store.js';
import { Busy, backupSnapshot, isGenerating } from '../../engine/safety.js';
import { h } from '../dom.js';
import { btn, iconBtn, note, segmented } from '../kit.js';
import { codeEditor } from '../codeedit.js';
import { openEditorCore, validateModule } from './editor.js';
import { patchSavedChar } from './characters.js';

var MAP = { lorebook: "globalLore", regex: "customscript", trigger: "triggerscript" };
var SKIP = /* @__PURE__ */ new Set([...USER_KEYS, "emotionImages", "additionalAssets", "ccAssets", "image", "vits", "chats", "chatFolders", "chatPage", "loreCache", "lowLevelHistory"]);
var CHAR_INFO_LABELS = {
  name: "이름",
  nickname: "별명",
  desc: "설명",
  firstMessage: "첫 메시지",
  alternateGreetings: "추가 인사말",
  personality: "성격",
  scenario: "시나리오",
  exampleMessage: "예시 대화",
  systemPrompt: "시스템 프롬프트",
  postHistoryInstructions: "후속 지시",
  replaceGlobalNote: "글로벌 노트 교체",
  additionalText: "추가 텍스트",
  creatorNotes: "제작자 노트",
  creator: "제작자",
  characterVersion: "버전",
  tags: "태그",
  backgroundHTML: "배경 HTML",
  defaultVariables: "기본 변수",
  customModuleToggle: "모듈 토글",
  lowLevelAccess: "저수준 접근",
  utilityBot: "도구 봇",
  moduleNamespace: "모듈 네임스페이스"
};
function charToView(ch) {
  const v = {};
  for (const [k, val] of Object.entries(ch)) if (!SKIP.has(k)) v[k] = val;
  v.chaId = ch.chaId;
  for (const [vk, ck] of Object.entries(MAP)) {
    v[vk] = Array.isArray(ch[ck]) ? ch[ck] : [];
    delete v[ck];
  }
  return v;
}
function viewToChar(fresh, view, original) {
  const out = { ...fresh };
  const unmap = (v) => {
    const o = { ...v };
    for (const [vk, ck] of Object.entries(MAP)) {
      o[ck] = o[vk];
      delete o[vk];
    }
    delete o.chaId;
    return o;
  };
  const want = unmap(view), before = unmap(original);
  for (const k of /* @__PURE__ */ new Set([...Object.keys(want), ...Object.keys(before)])) {
    if (SKIP.has(k)) continue;
    if (stableJson(want[k] ?? null) === stableJson(before[k] ?? null)) continue;
    if (want[k] === void 0) delete out[k];
    else out[k] = want[k];
  }
  return out;
}
async function freshChar(ctx, index, chaId) {
  // 편집 화면을 여는 데 필요한 봇 한 개만 읽는다 (다른 봇은 읽지 않음)
  const cur = await ctx.api.getCharacterFromIndex(index);
  if (!cur || cur.chaId !== chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요.");
  return cur;
}
export async function openCharEditor(ctx, index, chaId) {
  const ch = await freshChar(ctx, index, chaId);
  return openEditorCore(ctx, {
    view: charToView(ch),
    kindLabel: "봇 편집",
    idKey: "chaId",
    infoLabels: CHAR_INFO_LABELS,
    infoTitle: "봇 정보",
    validate: (v) => validateModule(v),
    renderInfo: ({ draft, field, text, area, check, changed }) => {
      // 첫 메시지·추가 인사말: 일반(글 쓰듯, 줄바꿈) / 코드(줄 번호·고정폭). 두 모드 모두 {{CBS}}·<img=…>·태그에 색을 입힌다
      let mode = ctx.prefs?.ui?.textMode === "code" ? "code" : "text";
      const rich = (get, set, { tall, label }) => codeEditor(get() ?? "", {
        lang: "text",
        label,
        tab: "\t",
        gutter: mode === "code",
        wrap: mode !== "code",
        prose: mode !== "code",
        minHeight: tall ? "max(300px,46vh)" : "96px",
        maxHeight: tall ? "70vh" : "50vh",
        onChange: (v) => {
          set(v);
          changed();
        }
      }).el;
      const fmHolder = h("div");
      const paintFm = () => fmHolder.replaceChildren(rich(() => draft.firstMessage, (v) => draft.firstMessage = v, { tall: true, label: "첫 메시지" }));
      const modeSeg = segmented([["text", "일반"], ["code", "코드"]], mode, (v) => {
        if (v === mode) return;
        mode = v;
        ctx.prefs?.saveUi?.({ textMode: v })?.catch?.(() => {
        });
        paintFm();
        paintGreets();
      }, "첫 메시지 입력 모드");
      modeSeg.style.width = "160px";
      const fmBox = h(
        "div",
        { style: "display:flex;flex-direction:column;gap:8px" },
        h(
          "div",
          { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
          modeSeg,
          h("span", { class: "rb-muted", style: "font-size:12px;word-break:keep-all" }, "일반은 글 쓰듯 줄바꿈, 코드는 줄 번호와 고정폭 글꼴이에요. 둘 다 {{CBS}}·<img=…>·태그에 색이 들어가요. 추가 인사말도 같이 바뀌어요.")
        ),
        fmHolder
      );
      const greets = h("div", { class: "wide", style: "display:flex;flex-direction:column;gap:8px" });
      const paintGreets = () => {
        if (!Array.isArray(draft.alternateGreetings)) draft.alternateGreetings = [];
        greets.replaceChildren(
          h("span", { class: "rb-label" }, `추가 인사말 (${draft.alternateGreetings.length})`),
          ...draft.alternateGreetings.map((g, i) => {
            const ta = h("div", { style: "flex:1;min-width:0" }, rich(() => draft.alternateGreetings[i], (v) => draft.alternateGreetings[i] = v, { label: `추가 인사말 ${i + 1}` }));
            return h("div", { style: "display:flex;gap:6px;align-items:flex-start" }, ta, iconBtn("trash", `추가 인사말 ${i + 1} 지우기`, { onClick: () => {
              draft.alternateGreetings.splice(i, 1);
              changed();
              paintGreets();
            } }));
          }),
          h("div", null, btn("인사말 추가", { size: "sm", icon: "plus", onClick: () => {
            draft.alternateGreetings.push("");
            changed();
            paintGreets();
          } }))
        );
      };
      paintFm();
      paintGreets();
      const tags =h("input", { class: "rb-input", value: (draft.tags ?? []).join(", "), placeholder: "쉼표로 구분" });
      tags.addEventListener("input", () => {
        draft.tags = tags.value.split(",").map((s) => s.trim()).filter(Boolean);
        changed();
      });
      const prose = { mono: false };
      return [
        h(
          "div",
          { class: "rb-form" },
          field("이름", text(draft, "name")),
          field("별명", text(draft, "nickname")),
          field("제작자", text(draft, "creator")),
          field("버전", text(draft, "characterVersion")),
          field("태그", tags, true),
          field("설명", area(draft, "desc", { tall: true, ...prose }), true),
          // label로 감싸면 안내 글을 눌러도 '일반' 버튼이 눌리므로 div로 감싼다
          h("div", { class: "rb-field wide" }, h("span", { class: "rb-label" }, "첫 메시지"), fmBox),
          greets,
          field("성격", area(draft, "personality", prose), true),
          field("시나리오", area(draft, "scenario", prose), true),
          field("예시 대화", area(draft, "exampleMessage", prose), true),
          field("시스템 프롬프트", area(draft, "systemPrompt", prose), true),
          field("후속 지시 (post history)", area(draft, "postHistoryInstructions", prose), true),
          field("글로벌 노트 교체", area(draft, "replaceGlobalNote", prose), true),
          field("추가 텍스트", area(draft, "additionalText", prose), true),
          field("제작자 노트", area(draft, "creatorNotes", prose), true),
          field("기본 변수 (defaultVariables)", area(draft, "defaultVariables"), true),
          field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle"), true),
          field("배경 HTML (backgroundHTML)", area(draft, "backgroundHTML"), true),
          field("모듈 네임스페이스", text(draft, "moduleNamespace")),
          h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근"), check(draft, "utilityBot", "도구 봇"))
        ),
        note("info", '채팅·메모는 건드리지 않아요. 이미지는 봇 상세의 "에셋"에서 고쳐요.')
      ];
    },
    async save(draft, original) {
      const fresh = await freshChar(ctx, index, chaId);
      if (isGenerating(fresh)) throw new Busy();
      await createStore(ctx.api).addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "편집 전" });
      const merged = viewToChar(fresh, draft, original);
      const last2 = await freshChar(ctx, index, chaId);
      if (isGenerating(last2) || (last2.chats ?? []).length !== (fresh.chats ?? []).length) throw new Busy();
      merged.chats = last2.chats;
      await ctx.api.setCharacterToIndex(index, merged);
      patchSavedChar(ctx, index, merged);
    }
  });
}
export async function openCharAssets(ctx, index, chaId) {
  const ch = await freshChar(ctx, index, chaId);
  const list = (ch.additionalAssets ?? []).map((a) => [String(a?.[0] ?? ""), String(a?.[1] ?? ""), String(a?.[2] ?? "")]);
  const folderKey = `${chaId}:additional`;
  let backedUp = false;
  return openAssetsCore(ctx, {
    name: ch.name,
    label: "봇 에셋",
    assets: list,
    folders: structuredClone(ctx.prefs.meta.charAssetFolders?.[folderKey] ?? { _folders: [], _mapping: {} }),
    async save(nextAssets, nextFd, note2) {
      const fresh = await freshChar(ctx, index, chaId);
      if (isGenerating(fresh)) throw new Busy();
      if (!backedUp) {
        await createStore(ctx.api).addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot: backupSnapshot("character", fresh), note: "에셋 관리 전", summary: note2 });
        backedUp = true;
      }
      fresh.additionalAssets = nextAssets.map((a) => [...a]);
      await ctx.api.setCharacterToIndex(index, fresh);
      patchSavedChar(ctx, index, fresh);
      const empty = !nextFd._folders.length && !Object.keys(nextFd._mapping).length;
      if (stableJson(ctx.prefs.meta.charAssetFolders?.[folderKey] ?? null) !== stableJson(empty ? null : nextFd)) {
        await ctx.svc.meta((m) => {
          m.charAssetFolders ??= {};
          if (empty) delete m.charAssetFolders[folderKey];
          else m.charAssetFolders[folderKey] = nextFd;
        });
      }
    }
  });
}
