import { openAssetsCore } from './assetmgr.js';
import { stableJson } from '../../engine/util.js';
import { USER_KEYS } from '../../engine/merge3.js';
import { createStore } from '../../engine/store.js';
import { Busy, backupSnapshot, isGenerating } from '../../engine/safety.js';
import { h } from '../dom.js';
import { btn, iconBtn, note, segmented } from '../kit.js';
import { codeEditor } from '../codeedit.js';
import { icon } from '../icons.js';
import { estimateTokens } from '../../engine/memoryinject.js';
import { createGreetingManager } from './greetings.js';
import { openEditorCore, validateModule } from './editor.js';
import { patchSavedChar } from './characters.js';


var INFO_CSS = `
.rb-info{display:flex;flex-direction:column;gap:12px}
.rb-info-sum{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;padding:14px 16px;border-radius:16px;border:1px solid var(--rb-line2);background:var(--rb-surf)}
.rb-info-name{font-size:18px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-info-tags{display:flex;flex-wrap:wrap;gap:6px}
.rb-info-stats{display:flex;flex-wrap:wrap;gap:8px}
.rb-info-stat{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px;padding:8px 12px;border-radius:12px;border:1px solid var(--rb-line2);background:var(--rb-surf2);color:var(--rb-text);font:inherit;cursor:pointer}
.rb-info-stat:disabled{cursor:default;opacity:1}
.rb-info-stat b{font-size:16px}
.rb-info-stat span{font-size:11px;color:var(--rb-sub)}
@media (hover:hover){.rb-info-stat:not(:disabled):hover{border-color:var(--rb-sel-ring);background:var(--rb-sel-bg)}}
.rb-info-card{border-radius:16px;border:1px solid var(--rb-line2);background:var(--rb-surf)}
.rb-info-card>summary{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none;min-height:24px}
.rb-info-card>summary::-webkit-details-marker{display:none}
.rb-info-card>summary .t{font-weight:700;font-size:15px}
.rb-info-card>summary .h{flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rb-info-card>summary svg{flex:none;transition:transform .15s}
.rb-info-card[open]>summary svg{transform:rotate(180deg)}
.rb-info-body{padding:4px 16px 16px;display:flex;flex-direction:column;gap:12px}
@media (prefers-reduced-motion:reduce){.rb-info-card>summary svg{transition:none}}
`;
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
  groupOnlyGreetings: "그룹 전용 인사말",
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
    renderInfo: ({ draft, field, text, area, check, changed, goTab, ui, emitArea }) => {
      // 위: 요약 카드(누르면 해당 탭) · 아래: 접는 카드 3개 — 기본 / 인사말 / 고급 (열림 상태는 탭을 오가도 기억)
      ui.open ??= { basic: true, greet: true, adv: false };
      const gm = createGreetingManager(ctx, { draft, changed, ui: ui.gm ??= {}, onArea: (a) => emitArea?.(a) });
      const tags = h("input", { class: "rb-input", value: (draft.tags ?? []).join(", "), placeholder: "쉼표로 구분", "aria-label": "태그" });
      tags.addEventListener("input", () => {
        draft.tags = tags.value.split(",").map((s) => s.trim()).filter(Boolean);
        changed();
      });
      const prose = { mono: false };
      // ── 요약 카드 ──
      const SUM_TEXT = ["desc", "personality", "scenario", "systemPrompt", "exampleMessage", "firstMessage", "postHistoryInstructions", "additionalText"];
      const stat = (label, valueEl, tab, title) => h("button", { type: "button", class: "rb-info-stat", title, "aria-label": `${label} ${valueEl.textContent}${tab ? " — 눌러서 열기" : ""}`, onClick: () => tab && goTab(tab), disabled: !tab }, h("b", null, valueEl), h("span", null, label));
      const vTok = h("span"), vLore = h("span"), vRe = h("span"), vTrig = h("span"), vGr = h("span");
      const nameEl = h("div", { class: "rb-info-name" });
      const tagsEl = h("div", { class: "rb-info-tags" });
      const paintSummary = () => {
        const tok = estimateTokens(SUM_TEXT.map((k) => String(draft[k] ?? "")).join("\n"));
        vTok.textContent = `약 ${tok.toLocaleString()}`;
        vLore.textContent = String((draft.lorebook ?? []).length);
        vRe.textContent = String((draft.regex ?? []).length);
        vTrig.textContent = String((draft.trigger ?? []).length);
        vGr.textContent = String(1 + (draft.alternateGreetings?.length ?? 0) + (draft.groupOnlyGreetings?.length ?? 0));
        nameEl.textContent = draft.name || "(이름 없음)";
        tagsEl.replaceChildren(...(draft.tags ?? []).slice(0, 8).map((t) => h("span", { class: "rb-chip", style: "height:24px;padding:0 10px;font-size:12px;cursor:default" }, t)));
      };
      const summary = h("div", { class: "rb-info-sum" },
        h("div", { style: "min-width:0;flex:1 1 220px;display:flex;flex-direction:column;gap:6px" }, nameEl, tagsEl),
        h("div", { class: "rb-info-stats" },
          stat("토큰(추정)", vTok, null, "설명·성격·시나리오·시스템·예시·인사말 등 기본 정보의 대략적인 토큰 수"),
          stat("인사말", vGr, null, "첫 메시지 + 추가 인사말 + 그룹 전용"),
          stat("로어북", vLore, "lorebook", "로어북 탭 열기"),
          stat("정규식", vRe, "regex", "정규식 탭 열기"),
          stat("트리거", vTrig, "trigger", "트리거 탭 열기")));
      paintSummary();
      // ── 접는 카드 ──
      const card = (key, title, hint, ...kids) => {
        const d = h("details", { class: "rb-info-card" },
          h("summary", null, h("span", { class: "t" }, title), h("span", { class: "rb-muted h" }, hint), icon("down", 16)),
          h("div", { class: "rb-info-body" }, ...kids));
        d.open = !!ui.open[key];
        d.addEventListener("toggle", () => { ui.open[key] = d.open; });
        return d;
      };
      const basic = card("basic", "기본", "이름 · 설명 · 성격 · 시나리오",
        h("div", { class: "rb-form" },
          field("이름", text(draft, "name")),
          field("별명", text(draft, "nickname")),
          field("태그", tags, true),
          field("설명", area(draft, "desc", { tall: true, ...prose }), true),
          field("성격", area(draft, "personality", prose), true),
          field("시나리오", area(draft, "scenario", prose), true)));
      const greet = card("greet", "인사말", "첫 메시지 · 추가 인사말 · 그룹 전용", gm.el);
      const adv = card("adv", "고급", "시스템 프롬프트 · 예시 대화 · 제작자 노트 · 변수",
        h("div", { class: "rb-form" },
          field("시스템 프롬프트", area(draft, "systemPrompt", prose), true),
          field("예시 대화", area(draft, "exampleMessage", prose), true),
          field("후속 지시 (post history)", area(draft, "postHistoryInstructions", prose), true),
          field("글로벌 노트 교체", area(draft, "replaceGlobalNote", prose), true),
          field("추가 텍스트", area(draft, "additionalText", prose), true),
          field("제작자", text(draft, "creator")),
          field("버전", text(draft, "characterVersion")),
          field("제작자 노트", area(draft, "creatorNotes", prose), true),
          field("기본 변수 (defaultVariables)", area(draft, "defaultVariables"), true),
          field("모듈 토글 정의 (customModuleToggle)", area(draft, "customModuleToggle"), true),
          field("배경 HTML (backgroundHTML)", area(draft, "backgroundHTML"), true),
          field("모듈 네임스페이스", text(draft, "moduleNamespace")),
          h("div", { class: "wide", style: "display:flex;gap:16px;flex-wrap:wrap" }, check(draft, "lowLevelAccess", "저수준 접근"), check(draft, "utilityBot", "도구 봇"))));
      const wrap = h("div", { class: "rb-info" }, summary, basic, greet, adv, note("info", '채팅·메모는 건드리지 않아요. 이미지는 봇 상세의 "에셋"에서 고쳐요.'));
      // 글자를 치는 동안 요약(토큰·이름·태그)을 가볍게 갱신하고, 인사말 밖에서 입력하면 AI 창 작업을 '설명'으로 되돌린다
      let t = 0;
      wrap.addEventListener("input", () => { clearTimeout(t); t = setTimeout(paintSummary, 300); });
      wrap.addEventListener("focusin", (ev) => { if (!ev.target.closest(".rb-gm")) emitArea?.("info"); });
      if (!document.getElementById("rb-info-style")) document.head.appendChild(h("style", { id: "rb-info-style" }, INFO_CSS));
      return [wrap];
    },
    async save(draft, original) {
      // 빠른 저장: 봇을 한 번만 읽고 곧바로 쓴다 (읽기와 쓰기 사이에 기다리는 일이 없어 두 번 읽어 확인할 필요가 없다).
      // 편집 전 백업은 읽은 그 상태로 뒤에서 남긴다.
      const fresh = await freshChar(ctx, index, chaId);
      if (isGenerating(fresh)) throw new Busy();
      const snap = backupSnapshot("character", fresh);
      const merged = viewToChar(fresh, draft, original);
      await ctx.api.setCharacterToIndex(index, merged);
      patchSavedChar(ctx, index, merged);
      createStore(ctx.api).addBackup({ kind: "character", target: chaId, name: fresh.name, snapshot: snap, note: "편집 전" }).catch((e) => ctx.toast(`편집 전 백업을 남기지 못했어요: ${e?.message ?? e}`, { error: true }));
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
