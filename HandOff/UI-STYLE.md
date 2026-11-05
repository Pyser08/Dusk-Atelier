# UI 스타일 가이드 — 기존 모양 그대로 만들기

새 화면은 **새 CSS를 만들지 말고 기존 클래스·위젯·토큰을 조합**한다. 그래야 플러그인 꾸미기(테마)가 자동 적용된다.

## 1. 파일
- 전역 CSS: `src/ui/styles.js`(`CSS2`, 클래스 접두사 `.rb-`)
- 색·크기 토큰: `src/ui/theme.js` (CSS 변수 `--rb-*`, 사용자가 꾸미기에서 바꿈)
- DOM: `src/ui/dom.js` — `h(tag, props, ...children)`, `replace(el, ...children)`, `fadeUp`, `vanish`(모션은 `reduceMotion` 존중)
- 위젯: `src/ui/kit.js`
- 아이콘: `src/ui/icons.js` (`icon(name)`)

## 2. 토큰만 쓴다 (하드코딩 색 금지)
글자 `--rb-text` / 보조 `--rb-sub` / 흐림 `--rb-mute` · 면 `--rb-win` `--rb-surf` `--rb-surf2` `--rb-panel` · 선 `--rb-line` `--rb-line2` `--rb-line3` · 강조 `--rb-acc` `--rb-acc-grad` `--rb-acc-soft` `--rb-on-acc` · 상태 `--rb-ok` `--rb-warn` `--rb-danger`(+`-soft`) · 모서리 `--rb-r1~r4` · 컨트롤 높이 `--rb-ctl` `--rb-ctl-sm` · 그림자 `--rb-shadow*` · 포커스 `--rb-focus`.
새 색이 꼭 필요하면 `theme.js`에 토큰을 추가하고 모든 프리셋에 값을 넣는다.

## 3. 위젯 대응표 (kit.js)
| 필요 | 쓸 것 |
|---|---|
| 버튼 | `btn(label, {kind:"primary"|"ghost"|"danger", size:"sm"|"lg", icon})`, `iconBtn` |
| 켜기/끄기 | `switchEl`, 설명 붙은 줄은 `toggleRow` |
| 선택 | `segmented`, `optionCards`, `chip` |
| 화면 머리 | `pageHead(title, {sub, back})` |
| 상태 표시 | `statusCard`, `badge`, `note(kind,text)`, `progressBar`, `loading`, `spinner`, `emptyState` |
| 대화상자 | `modal`, `confirmDialog`, `promptDialog`, `sheet`(모바일 하단), `popover`, `openMenu` |
| 알림 | `toast(host, text, {action})` |
| 고급 옵션 숨김 | `advFold(ctx, tabId, ...)` — 고급 모드에서만 |
| 안내 | `guidePanel`, `stepsGuide` |

## 4. 디자인 원칙 (기존 화면에서 지켜 온 것)
- 초보자 기본 화면은 단순하게, 세부 설정은 **고급 모드/접이식**으로.
- 문구는 한국어 존댓말 "~해요", 짧게. 버튼은 동사로("저장", "다시 분석").
- **부분 갱신**: 상태가 바뀌면 그 카드만 `replace()`. `ctx.refresh()`(전체) 남용 금지.
- 모바일: 좁은 폭에서 줄바꿈되게(`min-width:0`, `flex-wrap`), 터치 영역 `--rb-ctl` 이상, hover 효과는 `@media (hover:hover)` 안에.
- 접근성: 클릭되는 건 `button`/`a`, 스위치는 `aria-checked`, 포커스 링 유지.
- 화면 상태는 `ctx.state.<탭>` 아래에 둔다(탭 이동 후 돌아와도 유지).
- 리스 본체 화면(채팅 등)에 요소를 넣을 땐 `getRootDocument()`(비동기) + 호스트별 셀렉터, 스타일은 `rb-` 접두사로 격리.

## 4-1. 다시 그리기 규칙 (모든 탭 필수)
쓰는 도중 창을 다시 불러와서 **스크롤이 위로 튀거나 화면이 통째로 바뀌는 일이 있으면 안 된다.**
- 버튼·스위치·저장·불러오기·애드온 켜고 끄기 뒤에는 **바뀐 부분만** 다시 그린다(그 카드·그 줄의 `replace()`). `ctx.refresh()`(전체 다시 그리기)는 화면 구조가 바뀔 때만.
- '불러오는 중'을 보여 줄 땐 영역을 통째로 비우지 말고 그 자리만 바꾼다(높이가 확 줄면 스크롤이 밀린다).
- 화면 이동은 반드시 `ctx.go(tab, sub)` — 이것만 맨 위에서 시작한다(`scrollguard.js` markNav). 그 밖의 다시 그리기는 스크롤 지킴이(`src/ui/scrollguard.js`)가 위치를 되돌린다. 지킴이에 기대지 말고 위 두 줄을 먼저 지킬 것.
- 애드온 자리(`src/ui/ext.js`): 등록·해제는 **지금 화면이 그 자리를 읽었을 때만** 다시 그린다(앱이 그리기 전에 `beginRender()`).
- 확인: `tests/e2e/run-scrollkeep.mjs`(다시 그리기·불러오는 중·스위치), `run-addons-ui.mjs`(애드온 받기·끄기·켜기·지우기 동안 스크롤·창 유지). 새 화면을 만들면 비슷한 검사를 추가.

## 5. 참고할 화면 (비슷한 것 복사해서 시작)
목록+상세: `ui/screens/memory/` · 설정 토글: `ui/screens/settingstab.js` · 카드형 홈: `ui/screens/home.js` · 플로팅 AI 창: `ui/screens/personabuilder.js` · 마법사형 단계: `ui/screens/newbot.js`.
목업은 프로젝트 문서 `claude/mockup-*.html` 참고 가능.

## 6. 확인
`node tests/e2e/run-smoke.mjs`(또는 해당 `run-*.mjs`)로 오류 없는지, 가능하면 스크린샷으로 다크/라이트·좁은 폭 확인.
