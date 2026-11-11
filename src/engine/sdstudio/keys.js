// 에셋 제작 — 단축키. 순수. 누른 키를 "Ctrl+Shift+Z" 같은 이름으로 바꾸고, 동작별 키를 사용자 설정으로 덮어쓴다(⌘는 Ctrl로 본다).
export var ACTIONS = {
  run: "생성 시작·멈추기", toggleLeft: "프롬프트 에디터 열고 닫기", undo: "되돌리기", redo: "다시하기", put: "고른 것 봇에 바로 넣기",
  selectAll: "모두 고르기", search: "검색", newItem: "새 캐릭터·씬", cup: "이미지 월드컵", reserve: "고른 씬 1장 예약",
  mode1: "씬 모드", mode2: "갤러리 모드", mode3: "검색 모드", mode4: "비교 모드", mode5: "동시편집", help: "도움말"
};
export var DEFAULT_KEYS = { run: "Ctrl+Enter", toggleLeft: "F1", undo: "Ctrl+Z", redo: "Ctrl+Shift+Z", put: "Ctrl+B", selectAll: "Ctrl+A", search: "Ctrl+F", newItem: "N", cup: "W", reserve: "R", mode1: "1", mode2: "2", mode3: "3", mode4: "4", mode5: "5", help: "F2" };
var MOD_ONLY = new Set(["Control", "Shift", "Alt", "Meta", "OS"]);
export function comboOf(e) {
  if (!e?.key || MOD_ONLY.has(e.key)) return null;
  let k = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey && (k.length > 1 || parts.length)) parts.push("Shift");
  parts.push(k);
  return parts.join("+");
}
export function normalizeKeys(saved) {
  const out = { ...DEFAULT_KEYS };
  for (const [a, k] of Object.entries(saved && typeof saved === "object" ? saved : {})) if (a in ACTIONS && typeof k === "string") out[a] = k.slice(0, 40);
  return out;
}
export function rebind(keys, action, combo) {
  const out = { ...keys };
  if (combo) for (const a of Object.keys(out)) if (out[a] === combo && a !== action) out[a] = "";
  out[action] = combo || "";
  return out;
}
export var actionOf = (keys, combo) => (combo ? Object.keys(keys).find((a) => keys[a] === combo) ?? null : null);
// 글자를 쓰는 중에도 먹어도 되는 키(보조키·F키·Enter 조합)
export var typingSafe = (combo) => /^(Ctrl|Alt)\+/.test(combo ?? "") || /^F\d+$/.test(combo ?? "");
