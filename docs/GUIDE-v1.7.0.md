# Dusk Atelier v1.7.0 안내 (개발 메모)

UI 전면 개편("간단하게, 바로 쓰게"). 설계·목업·§체크리스트는 `PLAN-v1.7.0-ui.md`, 구조 지도는 `source-map.md`.

## 사용자 흐름
1. 메뉴: 홈 · 기억 · 리수폿 · 인물 + 더보기(캐릭터·모듈·기억 카드·꾸미기·도구·플러그인·설정, 개발자 모드면 개발). PC는 `theme.layout` left/top(`home` 레이아웃은 `left`로 이전).
2. 화면 모드 `prefs.ui.uiMode` simple|advanced(기본 simple). 고급 영역은 `kit.advFold`가 간단 모드에서 링크만 띄운다. 개발자 모드(고급에서만 켬)가 켜져야 캐릭터·모듈의 오른쪽 `rb-detail` 패널·개발 탭이 보인다.
3. 기억(`screens/memory/` mhome·madv·mdetail·mbots)과 리수폿(`screens/pot.js`)은 스위치·설정이 분리(`engine/memoryswitch.js` → `data/memoryswitches.js`, 설정 `potStore`). 인물(`screens/peoplescreen.js`)의 스위치는 `autoWriterEnabled`.
4. 모듈 연결은 `screens/modlinks.js`(패널·팝오버·시트 공용), 새 봇·AI로 봇 만들기는 `screens/newbot.js`.
5. 꾸미기·설정(`screens/settings.js`·`settingstab.js`)은 간단 모드에서 핵심만. 처음 둘러보기 12장(`ui/tour.js`), 홈 첫 안내 1회(`simpleNoticeDone`).
6. 채팅 테마: 도구 → `chattheme`(`screens/chattheme.js`, 목록·코드·파일), `themebuilder`·`themestudio`도 도구 하위(설정 호출은 `app.js go()`가 도구로 돌림). 세 화면 위에 `themeTabs`. 이 sub들은 목록이 바뀌므로 패널 캐시에서 뺌.
7. 기억·리수폿 프롬프트: 설정 → `prompts`(`screens/promptstab.js`), 값은 리수폿 설정 `customPrompts`(모든 채팅 범위). 불러오기 후보 추출은 순수 `engine/promptimport.js`, 처음 켤 때 안내는 `maybePromptIntro`(`ui.promptIntroDone`). e2e 기본 시드는 안내를 꺼 둠(`opts.intro`로 보존).
8. 롤백 충돌 `변경 비교`(`engine/conflict.js`·`memory/conflictui.js`), 테마 공유 코드 `DTB2:`(`data/themebuilder.js`, STYLES·AVATARS·FONTS·WIDTHS는 끝에만 추가).

## 8단계에서 한 것
- 모듈 도구 줄을 칩 줄(`.rb-chips`)과 동작 줄(`.rb-modacts`)로 분리(`.rb-modbar`): 모바일에서 `새 모듈`이 가로 스크롤 밖에 숨던 문제.
- e2e(`run-app.mjs`): 모바일 5폭(320·360·390·480·768) × 간단·고급 × 11개 탭 가로 넘침, 다크 모드(PC·모바일 × 간단·고급) 11개 탭 글자 대비 3:1 미만 0개. 넘침 검사는 가로 스크롤 조상(overflow-x)을 허용.
- `run-popup.mjs`: 안내 창이 모달로 바뀐 것에 맞춰 버튼을 DOM으로 누름.

## 알려진 남은 것
- `potStore.backend`(리수폿 저장 위치)는 저장만 하고 엔진은 아직 안 쓴다.
- `pot/` 자동 생성 문구 "문서 없음/저장 안 됨" 분리, 기억 카드 줄의 `PNG 받기`·썸네일(목업과 다름), 플러그인 줄 켜기 스위치(⋯ 메뉴만).
- 1.6.8 아카 글은 미게시라 1.7.0 시리즈 박스에서 링크 없이 표기(게시 후 링크 추가).

## 릴리즈 체크
- `node --test` 372개 중 363 통과·실패 0·건너뜀 9. `SHOTS=<폴더> node tests/e2e/run-app.mjs` 183 항목 통과. run-smoke·run-popup·run-tabs 통과. `node tools/build.mjs` 후 `dusk_atelier.js` v1.7.0.
- 실제 리스에서 수동 확인: 메뉴 위치 전환, 기억/리수폿 각각 켜고 끄기, 모듈 연결, 모바일 아래 탭바.
