// 더스크 스텔스: 답변 속 이미지를 '명령어 N개 실행함 ▸' 접힘 안에 넣는다(리스 display 훅, 저장된 채팅은 그대로).
// CSS만으로는 이미지를 접힘 안으로 옮길 수 없어서, 화면에 그리기 직전 글에서 이미지 묶음을 <details>로 감싼다.
// 이미지 토큰: <img>, <video>…</video>, 마크다운 ![](…), 리스 {{img::…}}·{{inlay::…}} 계열. 붙어 있는(공백·<br>만 사이에 있는) 것은 한 묶음.

var TOKEN = String.raw`(?:<img\b[^>]*>|<video\b[^>]*>[\s\S]*?<\/video>|!\[[^\]\n]*\]\([^)\n]*\)|\{\{(?:img|image|inlay|inlayed|inlayeddata|asset|emotion)::[^}]*\}\})`;
var GAP = String.raw`(?:\s|<br\s*\/?>)*`;
var RUN = new RegExp(`${TOKEN}(?:${GAP}${TOKEN})*`, "gi");
// 지금 접을지(스텔스가 켜져 있고 '본문 이미지 숨기기'가 켜졌을 때). syncShell이 갱신한다
export var foldState = { on: false };
export var foldDisplay = (text) => (foldState.on ? foldImages(text) : text);
export var FOLD_MARK = "st-fold";

/** 글 → 1~9 (같은 글이면 늘 같은 수: 다시 그려도 바뀌지 않게) */
export function foldCount(text, salt = 0) {
  let h = 2166136261 ^ salt;
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 9) + 1;
}

/** 이미지 묶음을 접힘으로 감싼다. 이미 감싼 글·이미지 없는 글은 그대로. */
export function foldImages(text, { label = (n) => `명령어 ${n}개 실행함` } = {}) {
  if (typeof text !== "string" || !text || /class="(?:x-risu-)?st-fold"/.test(text)) return text;
  let i = 0;
  return text.replace(RUN, (run) => {
    const n = foldCount(run, i++);
    return `\n\n<details class="${FOLD_MARK}"><summary>${label(n)}</summary>\n\n${run}\n\n</details>\n\n`;
  });
}

// 접힘 모양(채팅 커스텀 CSS에 들어간다). summary 기본 삼각형 대신 오른쪽 ▸, 펼치면 ▾
// 리스가 채팅 안 class 앞에 x-risu- 를 붙이는 판도 있어 두 이름 모두에 건다
export var FOLD_CSS = `details.st-fold , details.x-risu-st-fold { margin: 4px 0 10px; }
details.st-fold > summary , details.x-risu-st-fold > summary { list-style: none; cursor: pointer; width: fit-content; color: var(--st-dim, #888); font-size: 14px; line-height: 1.5; user-select: none; }
details.st-fold > summary::-webkit-details-marker , details.x-risu-st-fold > summary::-webkit-details-marker { display: none; }
details.st-fold > summary::after , details.x-risu-st-fold > summary::after { content: "  ▸"; }
details.st-fold[open] > summary::after , details.x-risu-st-fold[open] > summary::after { content: "  ▾"; }
details.st-fold > summary:hover , details.x-risu-st-fold > summary:hover { color: var(--st-fg, inherit); }
details[open] img, details[open] video { display: block !important; max-width: 100%; height: auto; margin-top: 8px; border-radius: 8px; }
details:not([open]) > :not(summary) { display: none !important; }`;
