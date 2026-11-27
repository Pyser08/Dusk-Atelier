// 와일즈 PC 기본 키 배치(사용자 제공 표 기준). 키 이름 = KeyboardEvent.code 또는 마우스(M0 좌·M1 휠·M2 우·M3·M4 옆 버튼·WU/WD 휠)
// 각 항목 = [동작 id, 설명, 키들, 방식] 방식: press(누름) · hold(누르고 있기) · double(두 번) · up(뗄 때)
export const KEYMAP = {
  menu: [ // 3.1 메뉴 조작
    ["up", "메뉴 항목 선택(위)", ["KeyW", "ArrowUp"]], ["down", "메뉴 항목 선택(아래)", ["KeyS", "ArrowDown"]], ["left", "메뉴 항목 선택(왼쪽)", ["KeyA", "ArrowLeft"]], ["right", "메뉴 항목 선택(오른쪽)", ["KeyD", "ArrowRight"]],
    ["ok", "결정", ["KeyF", "Space"]], ["back", "뒤로(취소)", ["M2", "Escape"]], ["pageL", "페이지 전환(왼쪽)", ["KeyQ"]], ["pageR", "페이지 전환(오른쪽)", ["KeyE"]], ["catL", "스테이지·카테고리 전환(왼쪽)", ["KeyZ"]], ["catR", "스테이지·카테고리 전환(오른쪽)", ["KeyC"]],
    ["subL", "메뉴 내 페이지 전환·모델 회전(왼쪽)", ["Digit1"]], ["subR", "메뉴 내 페이지 전환·모델 회전(오른쪽)", ["Digit3"]], ["zoomIn", "모델 확대", ["WU"]], ["zoomOut", "모델 축소", ["WD"]],
    ["sub", "서브 메뉴", ["KeyR"]], ["myset", "마이 세트 등록·호출", ["ShiftLeft", "ShiftRight"]], ["column", "조작 칼럼 전환", ["AltLeft"]], ["filter", "표시 필터링", ["KeyX"]], ["sort", "항목·목록 재정렬", ["KeyG"]], ["list", "항목·목록 표시 전환", ["Tab"]],
  ],
  map: [ // 3.1.1 맵 조작
    ["zoomOut", "필드 맵 축소", ["KeyQ", "WD"]], ["zoomIn", "필드 맵 확대", ["KeyE", "WU"]], ["cursorReset", "커서 위치 초기화", ["ShiftLeft"]], ["target", "목표 설정", ["KeyX"]], ["full", "전체 화면·한쪽 화면 전환", ["KeyN"]], ["env", "환경 개요 확인", ["KeyG"]], ["free", "자유 모드", ["ControlLeft"], "hold"],
  ],
  hunter: [ // 3.2 헌터 조작(근접·원거리 공통)
    ["fwd", "앞으로 이동", ["KeyW"], "hold"], ["backw", "뒤로 이동", ["KeyS"], "hold"], ["leftw", "왼쪽으로 이동", ["KeyA"], "hold"], ["rightw", "오른쪽으로 이동", ["KeyD"], "hold"],
    ["dash", "대시(길게 누르기)·무기 넣기", ["ShiftLeft"], "hold"], ["dodge", "앉기·회피", ["Space"]], ["interact", "조사·대화·채취·갈무리", ["KeyF"]], ["item", "아이템 사용·무기 넣기", ["KeyE"]], ["npc", "로비·캠프 안 NPC 대상 전환(오른쪽)", ["KeyR"]], ["start", "시작 메뉴 열기", ["Escape", "KeyH"]],
    ["focus", "집중 모드(근접)", ["M4"], "hold"], ["focusOnce", "집중 모드·슬링어 조준(납도 중, 한 번 누르기)", ["AltLeft"]], ["focusStrike", "집중 공격(집중 모드 중)", ["ShiftLeft"]],
    // 무기 공격(좌클릭·우클릭 등)은 무기별 표가 오면 채운다: WEAPON.<무기>
  ],
  seikretRide: [ // 세크레트 탑승 시
    ["knifeL", "나이프 약공격", ["M0"]], ["knifeH", "나이프 강공격", ["M2"]], ["weapon", "무기 공격", ["KeyR"]], ["dismountHold", "세크레트에서 내리기", ["KeyE"], "hold"], ["brace", "버티기", ["ShiftLeft"]],
  ],
  seikret: [ // 세크레트 조작
    ["callAuto", "세크레트 부르기(자동)·탑승 중 자동 전환", ["Tab"]], ["callManual", "세크레트 부르기(수동)·탑승 중 수동 전환", ["KeyQ"]], ["swap", "무기 교체", ["KeyX"]], ["accel", "가속(두 번)·전속력(길게)", ["ShiftLeft"], "double"], ["brake", "감속·급정지(길게)", ["KeyZ"]], ["dismount", "세크레트에서 내리기", ["Space"]], ["pouch", "세크레트 주머니 확인", ["KeyN"]],
  ],
  shortcut: [ ["show", "커스텀 숏컷 표시", ["KeyV"]], ["palUp", "커스텀 숏컷 팔레트 이동(위)", ["ArrowUp"]], ["palDown", "커스텀 숏컷 팔레트 이동(아래)", ["ArrowDown"]], ["palNext", "다음 숏컷 팔레트로 전환", ["KeyG"]] ],
  camera: [ ["lock", "록온·타깃 카메라 전환", ["KeyB"]], ["zoomIn", "방위·포토 모드 확대", ["KeyC", "WU"]], ["zoomOut", "방위·포토 모드 축소", ["KeyZ", "WD"]] ],
  comms: [ ["chat", "채팅 발언(엔터 키)", ["Enter", "NumpadEnter"]], ["talk", "푸시 투 토크", ["KeyT"]], ["stamp", "스탬프", ["F9"]], ["gesture", "제스처", ["F10"]], ["pose", "포즈 세트", ["F11"]], ["members", "멤버 목록", ["KeyL"]] ],
  direct: [ ["map", "맵·채팅 알림 켜기·대화 건너뛰기", ["KeyM"]], ["pouch", "아이템 주머니 확인", ["KeyI"]], ["sos", "구조신호 보내기", ["ShiftRight"]], ["profile", "헌터 프로필", ["KeyP"]], ["pause", "게임 일시 정지", ["End"]], ["options", "옵션", ["KeyO"]] ],
};
export const WEAPON = {}; // 무기별 커맨드(나중에)
/** 키 → 동작 찾기: layers = 지금 켜진 층 목록(예: ["hunter","camera","direct"]) */
export function lookup(code, layers) { for (const L of layers) for (const [id, , keys] of KEYMAP[L] ?? []) if (keys.includes(code)) return L + "." + id; return null; }
/** 입력 상태: 누르고 있는 키·마우스, 두 번 누르기, 브라우저 기본 동작(우클릭 메뉴·옆 버튼 뒤로 가기·Tab 이동) 막기 */
export function bindInput(el, on) {
  const held = new Set(), last = {}, code = (e) => (e.type.startsWith("mouse") || e.type.startsWith("pointer") ? "M" + e.button : e.code);
  const down = (e) => { const c = code(e); if (/^(M2|M3|M4)$/.test(c) || ["Tab", "Space", "AltLeft", "F9", "F10", "F11", "End"].includes(c)) e.preventDefault(); if (held.has(c)) return; held.add(c); const now = performance.now(), dbl = now - (last[c] ?? 0) < 280; last[c] = now; on("down", c, dbl); };
  const up = (e) => { const c = code(e); if (/^M[234]$/.test(c)) e.preventDefault(); held.delete(c); on("up", c); };
  const wheel = (e) => { e.preventDefault(); on("down", e.deltaY < 0 ? "WU" : "WD"); }, cm = (e) => e.preventDefault(), blur = () => { for (const c of held) on("up", c); held.clear(); };
  el.addEventListener("pointerdown", down); addEventListener("pointerup", up); el.addEventListener("wheel", wheel, { passive: false }); el.addEventListener("contextmenu", cm); el.addEventListener("auxclick", cm); el.addEventListener("mouseup", (e) => { if (e.button > 2) e.preventDefault(); });
  addEventListener("keydown", down, true); addEventListener("keyup", up, true); addEventListener("blur", blur);
  return { held, off: () => { el.removeEventListener("pointerdown", down); removeEventListener("pointerup", up); el.removeEventListener("wheel", wheel); el.removeEventListener("contextmenu", cm); el.removeEventListener("auxclick", cm); removeEventListener("keydown", down, true); removeEventListener("keyup", up, true); removeEventListener("blur", blur); } };
}
