// 글 칸 되돌리기·다시 하기 (1.4.6)
// 브라우저 기본 되돌리기는 Tab 들여쓰기·Enter 자동 들여쓰기처럼 코드로 넣은 글자를 기억하지 못해
// 순서가 꼬인다. 칸마다 직접 기록을 쌓고 Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y를 가로챈다.
var MAX_STEPS = 300;
var MERGE_MS = 900;

function kindOf(e) {
  const t = e?.inputType ?? "";
  if (!t) return "code";
  if (t.startsWith("delete")) return "del";
  if (t === "insertLineBreak" || t === "insertParagraph" || t === "insertFromPaste" || t === "insertFromDrop") return "block";
  return "type";
}

export function attachUndo(ta) {
  if (ta.__rbUndo) return ta.__rbUndo;
  let steps = [{ v: ta.value, s: ta.selectionStart ?? 0, e: ta.selectionEnd ?? 0 }];
  let at = 0, lastAt = 0, lastKind = "", restoring = false;
  const snap = () => ({ v: ta.value, s: ta.selectionStart, e: ta.selectionEnd });
  ta.addEventListener("input", (e) => {
    if (restoring) return;
    if (ta.value === steps[at].v) return;
    const kind = kindOf(e), now = Date.now();
    // 같은 종류를 연달아 치는 동안은 한 단계로 묶는다 (단어 단위로 되돌아가게 공백에서 끊음)
    // 한글 조합 중에는 글자마다 단계를 만들지 않는다
    const ime = !!e?.isComposing || e?.inputType === "insertCompositionText";
    const merge = at > 0 && (ime ? steps[at].ime : !steps[at].ime && kind === lastKind && (kind === "type" || kind === "del") && now - lastAt < MERGE_MS && !(kind === "type" && e?.data === " "));
    steps.length = at + 1;
    if (merge) steps[at] = { ...snap(), ime };
    else {
      steps.push({ ...snap(), ime });
      at++;
      if (steps.length > MAX_STEPS) {
        steps.shift();
        at--;
      }
    }
    lastAt = now;
    lastKind = kind;
  });
  const go = (to) => {
    if (to < 0 || to >= steps.length || to === at) return false;
    at = to;
    const st = steps[at];
    restoring = true;
    try {
      ta.value = st.v;
      ta.setSelectionRange(st.s, st.e);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    } finally {
      restoring = false;
    }
    lastKind = "";
    return true;
  };
  ta.addEventListener("keydown", (e) => {
    if (e.isComposing || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      go(at - 1);
    } else if (k === "z" && e.shiftKey || k === "y" && !e.shiftKey) {
      e.preventDefault();
      go(at + 1);
    }
  });
  // 메뉴의 "실행 취소"나 모바일 흔들기처럼 키 없이 오는 되돌리기도 막고 직접 처리
  ta.addEventListener("beforeinput", (e) => {
    if (e.inputType === "historyUndo") {
      e.preventDefault();
      go(at - 1);
    } else if (e.inputType === "historyRedo") {
      e.preventDefault();
      go(at + 1);
    }
  });
  const api = {
    undo: () => go(at - 1),
    redo: () => go(at + 1),
    get canUndo() {
      return at > 0;
    },
    get canRedo() {
      return at < steps.length - 1;
    },
    // 바깥에서 내용을 통째로 바꿨을 때: 새 글로 보고 기록을 비운다
    reset() {
      steps = [snap()];
      at = 0;
      lastKind = "";
    }
  };
  ta.__rbUndo = api;
  return api;
}
