// 에셋 제작 — 단축키. 순수. 누른 키를 이름으로 바꾸고, 동작별 키를 사용자 설정으로 덮어쓴다.
// "Mod" = 주 보조키(맥 ⌘ Command, 그 밖 Ctrl). 맥에서 "Ctrl"은 ⌃ Control 키 따로. "Alt" = 맥 ⌥ Option.
// 글자·숫자는 e.code(KeyZ·Digit1)로 읽어 맥 Option 조합(⌥L → ¬)이나 한글 자판에서도 같은 이름이 된다.
export var ACTIONS = {
  run: "생성 시작·멈추기", toggleLeft: "프롬프트 에디터 열고 닫기", undo: "되돌리기", redo: "다시하기", put: "고른 그림 봇에 바로 넣기",
  selectAll: "모두 고르기", search: "검색", newItem: "새 캐릭터·씬", cup: "이미지 월드컵", reserve: "고른 씬 1장 예약", choose: "대표 고르기", putFav: "즐겨찾기 확인하고 봇에 넣기",
  remove: "고른 것 지우기(캐릭터·씬·그림)", unpick: "고르기 모두 풀기", mode1: "씬 모드", mode2: "갤러리 모드", mode3: "검색 모드", mode4: "비교 모드", mode5: "동시편집", help: "도움말"
};
export var DEFAULT_KEYS = { run: "Mod+Enter", toggleLeft: "F1", undo: "Mod+Z", redo: "Mod+Shift+Z", put: "Mod+B", selectAll: "Mod+A", search: "Mod+F", newItem: "N", cup: "W", reserve: "R", choose: "C", putFav: "Mod+Shift+B", remove: "Delete", unpick: "Mod+Shift+A", mode1: "1", mode2: "2", mode3: "3", mode4: "4", mode5: "5", help: "F2" };
export var isMacLike = (nav = globalThis.navigator) => /Mac|iPhone|iPad|iPod/i.test(nav?.userAgentData?.platform ?? nav?.platform ?? nav?.userAgent ?? "");
var MOD_ONLY = new Set(["Control", "Shift", "Alt", "Meta", "OS", "AltGraph", "CapsLock", "Fn"]);
function baseKey(e) {
  const m = /^Key([A-Z])$/.exec(e.code ?? "") ?? /^Digit(\d)$/.exec(e.code ?? "");
  if (m) return m[1];
  if (e.key === " ") return "Space";
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}
export function comboOf(e, mac = isMacLike()) {
  if (!e?.key || MOD_ONLY.has(e.key)) return null;
  const k = baseKey(e), parts = [];
  if (mac ? e.metaKey : e.ctrlKey) parts.push("Mod");
  if (mac && e.ctrlKey) parts.push("Ctrl");
  if (!mac && e.metaKey) parts.push("Meta");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && (k.length > 1 || parts.length)) parts.push("Shift");
  parts.push(k);
  return parts.join("+");
}
// 보이는 이름: 맥 ⌘⇧Z · 그 밖 Ctrl+Shift+Z
var MAC_SYM = { Mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Enter: "↩", Escape: "⎋", Backspace: "⌫", Delete: "⌦", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space" };
var PC_NAME = { Mod: "Ctrl", Meta: "Win", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };
export function keyLabel(combo, mac = isMacLike()) {
  if (!combo) return "";
  const parts = combo.split("+");
  return mac ? parts.map((p) => MAC_SYM[p] ?? p).join("") : parts.map((p) => PC_NAME[p] ?? p).join("+");
}
// 저장값 정리. v2 이전(키 이름에 Mod 없음)은 "Ctrl"이 주 보조키를 뜻했으므로 Mod로 옮김
export function normalizeKeys(saved, { v = 2 } = {}) {
  const out = { ...DEFAULT_KEYS };
  for (const [a, k] of Object.entries(saved && typeof saved === "object" ? saved : {})) {
    if (!(a in ACTIONS) || typeof k !== "string") continue;
    out[a] = (v < 2 ? k.replace(/^Ctrl\+/, "Mod+") : k).slice(0, 40);
  }
  return out;
}
export function rebind(keys, action, combo) {
  const out = { ...keys };
  if (combo) for (const a of Object.keys(out)) if (out[a] === combo && a !== action) out[a] = "";
  out[action] = combo || "";
  return out;
}
export var actionOf = (keys, combo) => (combo ? Object.keys(keys).find((a) => keys[a] === combo) ?? null : null);
// 글자를 쓰는 중에도 먹어도 되는 키(보조키·F키 조합)
export var typingSafe = (combo) => /^(Mod|Ctrl|Alt|Meta)\+/.test(combo ?? "") || /^F\d+$/.test(combo ?? "");
