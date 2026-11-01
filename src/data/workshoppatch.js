// 봇빌더(risu_story_workshop) DA Interop 연동판 만들기 (v1.8.1) — 순수 함수, 화면·api 없음.
// 원본 스크립트 글을 받아 DA Interop 스니펫과 등록 코드(동작 2개)를 넣은 새 글을 돌려준다:
//   open  — 봇빌더 화면 열기 (Dusk의 'AI로 봇 만들기'가 부른다)
//   draft — 작업 중인 원고(편집 가능한 필드만) 돌려주기 (Dusk로 돌아왔을 때 개발 목록에 넣는 데 쓴다)
// 봇빌더 코드가 바뀌어 기준 줄을 못 찾으면 멈춘다(엉뚱한 곳에 넣지 않는다). tools/compat/workshop-interop.mjs와 Dusk 화면이 같이 쓴다.
import { INTEROP_SNIPPET } from "./interopSnippet.js";
import { WORKSHOP_INTEROP_ID } from "../engine/workshop.js";

export const MARK = "/*__DA_WORKSHOP_INTEROP__*/";
const OPEN_LINE = /^(\s*)await this\.api\.registerButton\(\{ name: "\\uBD07\\uBE4C\\uB354", icon: "BB", iconType: "html", location: "hamburger" \}, open\);\s*$/m;
const IIFE_START = /\n\*\/\n\(\(\) => \{\n/;

export function patchWorkshop(src) {
  const text = String(src);
  if (!/^\/\/@name risu_story_workshop\s*$/m.test(text.slice(0, 2048))) throw new Error("봇빌더(risu_story_workshop) 파일이 아니에요.");
  if (text.includes(MARK)) throw new Error("이미 연동판이에요.");
  const version = /^\/\/@version\s+(\S+)/m.exec(text.slice(0, 2048))?.[1] ?? "";
  const iife = IIFE_START.exec(text);
  if (!iife) throw new Error("본문 시작 위치를 찾지 못했어요 (봇빌더 구조가 바뀌었을 수 있어요).");
  if (!/\n  function editable\(raw\) \{/.test(text)) throw new Error("editable 함수를 찾지 못했어요 (봇빌더 구조가 바뀌었을 수 있어요).");
  const m = OPEN_LINE.exec(text);
  if (!m) throw new Error("봇빌더 열기 등록 줄을 찾지 못했어요 (봇빌더 구조가 바뀌었을 수 있어요).");
  const ind = m[1];
  const reg = [
    `${ind}${MARK}`,
    `${ind}registerInterop({`,
    `${ind}  id: ${JSON.stringify(WORKSHOP_INTEROP_ID)}, name: "봇빌더", version: ${JSON.stringify(version)}, pluginName: "risu_story_workshop",`,
    `${ind}  description: "Dusk Atelier에서 봇빌더 화면을 열고, 작업 중인 원고를 넘겨받아요.",`,
    `${ind}  actions: [`,
    `${ind}    { key: "open", label: "봇빌더 열기", run: async () => { await open(); return { opened: true }; } },`,
    `${ind}    { key: "draft", label: "작업 중인 원고 보내기", run: async () => this.s?.draft ? { name: String(this.s.draft.name ?? ""), targetId: this.s.targetId ?? null, started: !!this.started, dirty: !!this.dirty?.(), savedAt: this.slots?.autosave?.savedAt ?? null, draft: editable(this.s.draft) } : null }`,
    `${ind}  ]`,
    `${ind}}).catch((e) => console.warn("[봇빌더] DA Interop 등록 실패", e));`
  ].join("\n");
  const at = m.index + m[0].length;
  let out = text.slice(0, at) + "\n" + reg + text.slice(at);
  const head = "\n*/\n" + `// ${MARK} DA Interop 연동판 — Dusk Atelier tools/compat/workshop-interop.mjs가 아래 스니펫과 init()의 등록 코드를 넣었어요.\n` + INTEROP_SNIPPET + "\n(() => {\n";
  out = out.replace(IIFE_START, head);
  return out;
}

// 이 스크립트가 이미 연동판인지
export const isPatchedWorkshop = (script) => String(script ?? "").includes(MARK);
