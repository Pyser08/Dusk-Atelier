# 현재 상태 — 2.2.0 브랜치 (main fd5fd34, v2.1.9 머지 뒤 분기 · 2026-11-13)

## 목표: 글래스 UI 개편 — 배치 갈아엎기 → 새 테마
- 기준 문서: `HandOff/UI-GLASS.md` (배치가 UI-STYLE.md와 부딪히면 UI-GLASS 우선). 견본 html(dusk-home-glass*.html)은 저장소에 없음 — 필요하면 사용자에게 받기.
- 기존 테마는 유지하고 글래스 테마 6종(dusk·night·sakura·aurora·sunset·mono)을 추가.
- **탭 하나 = 세션 하나.** 사용자가 탭별 변경안을 주면 그 세션에서: 목업(PC 1280·모바일 390) → 사용자 확인 → 구현 → e2e.
- 버전(package.json·CHANGELOG 새 섹션)은 지시 있을 때만.

## ▶ 다음 세션에서 이어갈 것 (11-14 기준)
- **2번 기억 진행 중**: 개요·장기 기억 끝(아래). 다음은 관계도 → 코코아 → 카드. 목업 초안은 `docs/mockups/glass-2-memory.html`, 디자인은 6번(색띠+약한 네온, 선 아이콘)으로 맞춰 다시 목업 → 확인 → 구현.
- **1번 홈까지 끝**(커밋 ac0907e 이후 문서 정리 커밋). 다음은 **2번 기억**: memory-home·memory·relmap·cocoa·cards — 목업(PC 1280·모바일 390) → 확인 → 구현 → e2e.
- 쓸 수 있는 것: 유리 카드 `.rb-gcard`/`.rb-gcell`, 섹션 색 `--sec-k`·`.sec-memory`(분홍보라), 팝업 `--rb-pop-bg`, 테마 22종(밝은·어두운 판). 지침 차이는 `UI-GLASS.md` 맨 위 ‘구현 현황’.
- CHANGELOG에 `## 2.2.0 (작업 중 · 미릴리스)` 섹션을 넣어 둠(사용자 요청으로 문서 반영). 버전(package.json)은 그대로 2.1.9 — 올리기·릴리스는 지시 대기.
- 실기기(RisuBard·PocketRisu·RisuAI) 확인 아직: 위젯 끌기, 테마 색감·블러 성능, 탭 빠른 이동, 태블릿 레일.
- 원래 있던 실패(홈 작업과 무관): npm test 3(pot-port·watch-light·GitHub 태그), e2e look 2·hubs 1·run-info 2·run-app 중간 멈춤, run-memed 불안정.

## 세션 순서와 범위 (TASK-MAP: 메뉴·탭 = src/ui/tabs.js, src/ui/app.js)
| # | 세션 | 대상(tabs.js id) | 상태 |
|---|---|---|---|
| 0 | 공통 기반 | styles.js 글래스 토큰(기존 --rb-* 이름 유지), 배경(stage)·유리 카드 공통 클래스, 탭 틀(app.js) | [x] 11-13 (아래 기록) |
| 1 | 홈 | home | [x] 11-14 끝(F안·사이드바·위쪽 메뉴·모바일 탭바·테마 22종). 실기기 미확인 |
| 2 | 기억 | memory-home, memory, relmap, cocoa, cards | [x] 11-14 끝(개요·장기 기억·인물 위키·NSFW 설정·관계도·코코아·카드). 실기기 미확인 |
| 3 | 작업실 | work-home, provider, look, stealth, aibot, personabuilder, tools, dev | [ ] |
| 4 | 관리 | manage-home, characters, modules, plugins, protlink | [ ] |
| 5 | 설정 | settings (+ 테마 선택 UI, '가벼운 화면' 저사양 모드) | [ ] 테마 선택·가벼운 화면은 11-14에 꾸미기 탭에 먼저 넣음(아래) — 설정 탭 배치만 남음 |
| 6 | 마무리 | 6테마 대비 확인, 전 화면 PC·모바일 e2e, CHANGELOG·안내서 | [ ] |

- 0번은 1번 세션 안에서 같이 해도 됨(홈 변경안을 받을 때 결정).
- 테마 토큰·테마 선택 UI는 배치가 끝난 뒤(UI-GLASS §9의 4번). 배치 세션 동안은 기본 더스크 값만.

## 세션마다 지킬 것
- 기능을 빼지 않기: 옮긴 기능은 이 표 아래 '기능 이동 기록'에 "어디 → 어디"로 남기기.
- `?` 도움말·바로가기·'처음 둘러보기' 유지. 카드 안쪽 여백 18px 20px / 모바일 16px(QUALITY 박스 여백 규칙).
- 애드온 화면(addon 붙은 탭)은 애드온 쪽 코드도 함께 확인.
- 마칠 때: npm test → build → check("동일함") → 관련 e2e, 이 표 상태 갱신.

## 0·1번 기록 (11-13)
- 목업: `docs/mockups/glass-1-home.html`(A~E안), `docs/mockups/glass-1-home-f.html`(**채택 F안**: 사이드 레일 + 포커스 머리 + 스냅 위젯 격자).
- 0번: `src/ui/glasscss.js` GLASS_CSS. `.rb-win.rb-skin-glass`일 때만(app.js applyTheme: theme.skin==="glass" && 보통 대비 && 어두운 scheme). **기존 `--rb-glass`는 블러 값이라 카드 바탕 토큰은 `--rb-glass-bg`**(UI-GLASS 표의 `--rb-glass`와 이름 다름). 배경 바탕 `--rb-gbg = var(--rb-win)`(고른 테마 바탕색 유지, run-look 테마 묶음 시험 때문), 빛 번짐은 `--rb-acc-a/b`에서 만듦 → 테마 6종 토큰은 아직(§9-4). 공통 클래스 `.rb-gcard`·`.rb-gcell`. 레일은 기존 왼쪽 메뉴(.rb-nav)를 유리 카드로, 모바일은 기존 아래 탭바.
- 저사양: `.rb-lite` = theme.lite 또는 UA에 pocket|bard, + `prefers-reduced-transparency`. theme.js에 `skin`("glass"|"classic", 기본 glass)·`lite` 추가, 꾸미기 → 모양 더 고르기에 ‘글래스 화면’·‘가벼운 화면’ 스위치(lookparts.js). 5번 설정 세션에서 설정 탭으로 옮길지 결정.
- 1번: `src/ui/homegrid.js`(배치 계산: 크기 범위 WIDGET_SIZES·DEFAULT_LAYOUT 6/2칸·settle·snap, 시험 `tests/homegrid.test.js` 7) + `screens/homegridui.js`(그리기·포인터 끌기·모서리 크기·키보드) + `screens/homegridcss.js` + `screens/home.js` 전면. 저장 `prefs.ui.homeGrid[6|2]`, 못 보이는 위젯(채팅 없음→숫자, 추천 없음, 관리 숨김)의 자리는 저장값에 남김. 꾸미기 중에만 끌기(touch-action:none).
- 시험: npm test 1507 pass / 3 fail(pot-port·watch-light·GitHub 릴리스 태그 — 변경 전에도 같음). build·check 동일함(v2.1.9). e2e 새 `run-home-grid` 31 통과, smoke·home-memall·home-turn·home-fair·home-dice·onboard·discover 통과, hubs 1 실패·look 2 실패는 변경 전에도 같은 실패. run-hubs 홈 숫자 기대값을 모바일 3→4, `.rb-hdo-sm`→`.rb-hgrid2`로 고침.
- 미확인: 실기기(RisuBard·PocketRisu·RisuAI) 터치 끌기·성능, 밝은 모드(글래스 안 붙음 — 예전 모양).
- CHANGELOG: 2.2.0(작업 중) 섹션에 반영함.
- 안내서: start.html(홈 꾸미기), look.html(글래스·가벼운 화면) 수정.

## 사이드바 개편 (11-13, 0번 이어서)
- 목업 `docs/mockups/glass-0-sidebar.html`(지금·1~5안·추천). 사용자 선택: **1(섹션 접기)+2(섹션 색)+3(아래 정리)+4(레일)**.
- app.js 사이드바: `.rb-nav-lab` 대신 섹션 제목 버튼 `.rb-nav-sec.sec-<section>`(aria-expanded) + `.rb-nav-group`(접힘=max-height 0, 링크는 DOM에 남음). 펼친 섹션 저장 `prefs.ui.navOpen`, 지금 섹션은 늘 펼침(paintSecs, render마다). 보일 탭 없는 섹션은 제목 숨김.
- 아래 칸: `.rb-nav-mini`(끌어다 놓기 · 버전) + ⋯ `.rb-nav-menu`(메뉴 위치 layoutSeg · `#rb-nav-pin` 늘 펼침 · 변경 기록 · 끌어다 놓기 안내). 밖 클릭·Esc로 닫힘(Esc는 창 닫기로 안 번지게 stopPropagation).
- 레일: `.rb-navwrap` 안에 nav. 761px 이상·`.rb-nav-pinned` 아닐 때 68px, 올리거나 포커스하면 216px로 본문 위에 덮어 펼침. 늘 펼침 = `prefs.ui.navPinned`. CSS `src/ui/navcss.js`. 글래스 여백은 `--nav-pl/--nav-pb`.
- 머리 로고 아래 ‘for RisuBard’ 없앰.
- **위쪽 메뉴(.rb-lay-top)도 맞춤**: 홈 + 섹션 알약 3개(`.rb-topsec.sec-*`, topLinks `section:*`, 누르면 섹션 개요) · 탭별 링크는 DOM에 남기고 CSS로 숨김 · 섹션 메뉴는 안쪽 화면에서 칩 줄(moreNav, 데스크톱 위쪽 메뉴일 때만 보임, 개요에선 숨김) · 메뉴 위치 분할 버튼은 오른쪽 ⋯(`.rb-top-more`/`.rb-top-menu`) 안 → 글래스에서 글자와 겹치던 것 없앰. run-nav에 위쪽 시험 6개 추가(24 통과).
- **모바일 맞춤**: 아래 탭바 = 섹션 색 동그라미 아이콘(`.rb-tabbar .sec-*`, 지금 탭은 색 그라데이션+빛), 글래스에선 떠 있는 유리 바. 지금 섹션 색 변수 `--sec-k`(render에서 `win.dataset.sec`) → 칩 줄 지금 칩 테두리·빛. 홈 머리: 모바일은 제목 왼쪽 정렬, ‘홈 꾸미기’는 같은 줄 오른쪽(homegridcss 미디어 쿼리 — NAV_CSS가 HOMEGRID_CSS보다 앞이라 홈 규칙은 homegridcss에 둘 것). e2e run-nav 25·run-home-grid 32.
- run-home-grid가 한 번 1개 실패 후 다시 두 번 모두 통과 — 타이밍 흔들림 의심, 다시 보이면 확인.
- 시험: e2e 새 `run-nav` 18 통과. run-app ‘묶음 라벨’ 기대값을 새 구조로 바꿈(run-app은 원래 다른 곳 TypeError로 중간에 멈춤 — 변경 전과 같음). cards·manage·onboard·work·memed·addon-aibuild·home-grid·smoke·home-memall·discover 통과, hubs 1·look 2 실패는 원래 실패. npm test 1507/3(원래 실패), check 동일함.
- 미확인: 터치 태블릿(761px 이상, 올리기 없음)에서 레일 — 아이콘 탭으로 이동은 되지만 이름은 포커스 때만 보임. 실기기 확인 필요.

## 글래스 테마 6종 + 밝은 판 (11-14)
- `src/ui/glassthemes.js`: GLASS_THEMES(dusk·night·sakura·aurora·sunset·mono, 어두운 판=UI-GLASS 표, 밝은 판=새로 정함) · `glassThemeInput`(themeVars에 a·b·cBg를 그 테마 값으로 → 기존 --rb-* 토큰을 그대로 계산) · `glassExtraVars`(--rb-gb1~4 빛 번짐, --rb-gtint, --rb-gglow; 'mine'이면 비움 → CSS가 강조색에서 만듦).
- theme.js `gtheme`(기본 dusk, 'mine' 허용). app.js applyTheme: 글래스면 밝은·어두운 모드 모두 적용, 밝으면 `.rb-glass-light`, `win.dataset.gtheme`. 고대비면 글래스 끔.
- glasscss.js: 어두운 카드 = `color-mix(바탕 88%+흰색) 50%`(진한 빛 번짐 위 대비 확보), 안쪽 칸 흰 .08, 보조 글자 .84. 밝은 판 토큰 블록(.rb-glass-light: 하얀 .58 카드·#1f1a33 글자). 홈 제목·숫자 그라데이션은 밝은 판에서 글자색→강조 글자색.
- 대비 시험 `tests/glassthemes.test.js`(14): 6종×2판 × 바탕·빛 번짐 4개 위 카드·안쪽 칸에서 본문·보조 4.5:1 이상.
- 꾸미기 탭 맨 위 ‘글래스 테마’ 카드(lookparts `parts.glass`, `.rb-gpick` 7개). 테마 묶음·강조 색·그라데이션·직접 색을 바꾸면 gtheme='mine'(lookparts set 래퍼).
- 정리: 홈 화면 둘러보기 단계 고침(.rb-hdo → 기능 찾기·바로가기 위젯·홈 꾸미기 단계, 대상은 :has 없이), 안 쓰는 예전 홈 CSS(rb-home2·rb-home3·rb-hbody·rb-hmain·rb-hrec-head·rb-home-tourrow) 지움. 애드온 위젯은 애드온 상자 자체 제목·여백 사용.
- 시험: npm test 1521/3(원래 실패), check 동일함. e2e 새 run-glass-theme 19, run-nav 25, run-home-grid 34(둘러보기 대상 시험 추가), smoke·onboard·manage·work·cards·memed·home-*·discover·addon-aibuild·addon-chattheme 통과. look 2·hubs 1 원래 실패. **addons-ui: ‘스크롤 그대로’ PC chattheme 1개 새로 실패**(hello는 원래 PC·모바일 실패) — 위젯 배치는 안 바뀜, 애드온 위젯이 높이 고정이라 안쪽 스크롤 때문으로 보임. 애드온 위젯 높이를 내용에 맞추는 안을 검토할 것.
- CHANGELOG 초안 추가: 글래스 테마 22종(기본 ‘Dusk 황혼’, 밝은·어두운 판), 밝은 모드에서도 글래스, 색을 직접 고르면 ‘내 강조색’.

## 글래스 테마 22종 (11-14 이어서)
- 기본 `dusk` = **‘Dusk 황혼’**으로 다시 정함(보랏빛 하늘 + 지평선 주황·분홍: acc #ff9a76, acc2 #b07cff, 바탕 #171028 / 밝은 판 #fbf3f4). 노을(sunset)은 붉은 쪽으로 구분.
- 추가 16종(glassthemes.js 표에서 생성: 강조·강조2·셋째 빛·어두운/밝은 바탕 → 빛 번짐·tint 자동): 라벤더·깊은 바다·숲·로즈 골드·코랄·체리·은하·네온·모카·얼음·와인·복숭아·레몬·말차·한밤·보랏빛 새벽. theme.js gtheme 허용 목록은 GLASS_IDS에서.
- 대비 시험 46개(22종×2판 + 정리) 모두 통과.
- 고침: 꾸미기 미리보기가 글래스 테마 색을 따르게(settings.js tvars), 접힌 레일에서 메뉴 아이콘이 줄어 안 보이던 것(`.rb-nav a>svg{flex:none}`), 강조 색 버튼을 다시 눌러도 ‘내 강조색’으로.
- 시험: npm test 1553/3(원래 실패), check 동일함, run-glass-theme 23(새 테마·미리보기 추가). 나머지는 위와 같음(look 2·hubs 1·addons-ui PC 스크롤 2).

## 애드온 위젯 높이 (11-14)
- 애드온 위젯은 `autoH`: 내용 높이에 맞춰 줄 수를 자동 조절(homegridui fitAuto, ResizeObserver, 최대 60줄, 저장 안 함). 꾸미기에서 높이를 바꿔도 내용에 다시 맞춰짐(폭만 의미 있음).
- addons-ui: chattheme·모바일 hello 스크롤 시험 통과, **PC hello 1개만 실패**(변경 전에도 PC·모바일 hello 실패). 홈 작업 끝 — 남은 건 실기기 확인.

## 홈 마무리 (11-14)
- 홈으로 오면 사이드바에 펼쳐 둔 섹션을 모두 닫음(render에서 navOpen 비우고 저장).
- 팝업 글래스: `.rb-dialog`·`.rb-wn`(변경 기록)·`.rb-menu`·`.rb-bsheet`·`.rb-tour-card`·⋯ 메뉴·가져오기 창(`#rbu-overlay .win`)을 `--rb-pop-bg`(어두운 판 84% 덮기 / 밝은 판 흰 .84) + 블러 28px, 뒤 막(.rb-modal 등)은 `--rb-pop-back` + 블러 6px. 가벼운 화면은 블러 끔·불투명.
- 기능 찾기: 모든 탭 오른쪽 위(? 옆). 목록 검색이 없는 탭은 그 칸이 ‘기능 찾기’(적으면 홈의 기능 찾기 목록으로, `state.findMode`), 목록 검색이 있는 탭(캐릭터·모듈·플러그인·기록)은 그 검색 + `#rb-find-btn`(✦) 단추. 홈도 머리 줄을 보이고(위치 글자만 숨김), 홈 가운데 찾기 칸(#rb-home-find)은 없앰 — 둘러보기 대상은 `.rb-ph-tools .rb-search`.
- 모바일 애드온 잘림: 애드온 위젯 최대 높이 12→60줄(내용 1785px 잘리던 것).
- 시험: run-nav 35(홈 섹션 닫힘·기능 찾기 5개 탭·모듈 단추·대화상자 유리 추가), run-home-grid 34(끌기 시험을 스크롤과 무관하게), run-addons-ui에 ‘애드온 위젯이 내용을 다 담음’ 추가(47 통과, 모바일 hello 스크롤 1개 실패 — 원래 실패 항목). run-info 2 실패는 2.2.0 시작(70e64ec)에서도 같은 실패.
- (사용자 정정) 기능 찾기: **홈은 가운데(포커스 머리 안 `#rb-home-find`), 다른 탭만 오른쪽 위 ? 옆.** 검색 칸 하나(`searchLabel`)를 옮겨 붙임: 홈 render가 `ctx.mountSearch(slot)`, 다른 탭 render가 `placeSearch(phTools, findBtn)`. 다시 그리기로 칸이 빠졌다 붙어도 1.5초 안에 적고 있었으면 포커스·커서 유지(`lastTyped`). 찾기 결과 화면 위에도 같은 칸. 홈 머리 줄(.rb-pagehead)은 다시 숨김.
- 사이드바 레일: **마우스를 올린 동안만** 펼침(:focus-within 제거 — 눌러도 떼면 접힘), 떼면 ⋯ 메뉴도 닫힘. 키보드(Tab)로 들어오면 `.rb-nav-kbd`로 펼침.
- 팝업 더 비치게: 어두운 판 `--rb-pop-bg` 84%→66%, 밝은 판 흰 .84→.68, 뒤 막 옅게.
- 시험: run-nav 37(홈 가운데 칸·찾기 결과 위 칸 포커스·누른 뒤 떼면 접힘), run-addons-ui 48 모두 통과(스크롤 시험도 이번엔 통과).
- 사이드바 고침(11-14 늦게): ① 애드온이 늦게 켜지면 메뉴 링크만 보이고 섹션 제목(관리 등)은 숨은 채라 창을 다시 열어야 했음 → `refreshTabs()` 끝에서 `paintSecs()`(위쪽 메뉴 섹션 알약도 refreshTabs에서). e2e run-nav ‘애드온이 늦게 켜지면…’(coreOnly로 시작 후 svc 추가, 고치기 전 실패 확인). ② 탭이 바뀌면 손으로 펼친 섹션을 닫고 그 탭의 섹션만 펼침(`navTabSeen`, 홈이면 모두 닫힘). run-nav 39 통과.
- **탭 이동 중 얼어붙음 고침(11-14)**: 원인 = 탭 A(캐릭터 등)를 불러오는 중 B로 가면, 늦게 끝난 A가 `replace(ctx.main)` → `dom.js clear()`의 `while (firstChild) removeChild` 를 도는데 낡은 화면 보호(staleguard)가 removeChild를 무시해 무한 반복(CDP로 멈춘 스택 확인: drawCharacters→replace→clear). 고침 = 지운 자식이 그대로면 멈춤. 같은 꼴의 반복문은 저장소에 이것 하나뿐(검색 확인). 함께: 늦게 끝난 홈이 검색 칸을 화면에 없는 자리로 가져가지 않게 `placeSearch`에서 `parent.isConnected` 확인.
- 시험: unit `tests/staleguard.test.js` ‘낡은 화면의 replace()는 얼지 않고…’(고치기 전 시간 초과 확인), e2e 새 `run-tab-race`(느린 API로 6가지 탭 이동 + 홈→다른 탭 검색 칸 + 이동 뒤 클릭, 고치기 전 ‘페이지 응답 없음’ 확인) 9 통과. npm test 1554/3(원래 실패).
- 참고: **run-memed는 원래 불안정**(같은 코드로 32/32/21/5개 — 고치기 전에도 같음, ‘사실확실성’ select 시간 초과). 따로 볼 것.
- **홈(1번) 끝.** 다음은 2번 기억.

## 기능 이동 기록
- 기능 찾기: 홈은 가운데 칸 그대로, 다른 탭은 오른쪽 위 ? 옆(목록 검색 탭은 ✦ 단추).
- 사이드바 맨 아래 ‘메뉴 위치(왼쪽/위쪽)’ 분할 버튼·‘v… · 변경 기록’·끌어다 놓기 안내 → 아래 한 줄 + ⋯ 메뉴 안(위쪽 바의 분할 버튼은 그대로).
- 홈 ‘장기 기억’ 상태 카드의 숫자 4칸 → 숫자 위젯 4개(n1~n4). 모바일에서도 ‘확인할 것’ 보임(숨기기 가능).
- 홈 바로가기 4칸·최근 기록·빠른 설정·이어서 하기·추천(기능 맛보기)·애드온 상자 → 각각 위젯.
- 홈 ‘설정’ 바닥 버튼(예전 코드에서도 화면에 안 붙어 있었음)은 없앰 — 설정은 머리 줄 톱니·레일에 그대로.

---

# 현재 상태 — perf/startup 브랜치 (main 9acdc8c, v2.1.7에서 분기 · 2026-11-12)

## 목표: 데이터가 많은 순정 호스트에서 빠릿빠릿하게 (봇·모듈 삭제 없이, 호스트 패치 없이)
사용자 RisuBard(Mac Chrome) 측정, **Dusk 켠 상태** 기준값(2026-11-12 21:52):
- 새로고침 → 리스 들어가기 48초, 플러그인 다 뜨기 23.2초, Dusk 열고 애드온까지 13.8초, 리스 설정 열기 약 10초
- **플러그인 전부 끈 상태도 리스 진입 48초로 같음**(22:01). 그중 `/api/read`(database.bin) 40초, 그 안의 Content Download 36초 → 시작 지연은 플러그인이 아니라 전송 크기·회선 문제
- 사용자 판단(22:16): 순정 상태에서 Dusk를 켜든 끄든 쓰는 동안의 체감 성능에 유의미한 차이 없음 → **이 브랜치의 우선순위 낮음**. 남은 Dusk 몫은 'Dusk 열기 13.8초'(첫 화면 전체 읽기)뿐

진단 플러그인(dusk_diag 0.1.0, 별도 파일·저장소 밖) 결과:
- 캐릭터 138개, 채팅 뺀 본문 57.8MB / 모듈 104개(켜짐 6) 36.8MB / pluginCustomStorage 15.7MB / 플러그인 8개(Dusk 2.2MB)
- `getDatabase(["characters"])` 한 번 = **10.8초**, `["modules"]` = 1.8초 (리스의 $state.snapshot + iframe 복사)
- RisuBard는 원본의 콜드 스토리지 복원(changeChar)을 뺐고, Pocket의 캐릭터 비활성화도 없음 → 호스트 쪽 덜어내기 수단 없음

원인 후보(코드 확인):
- `src/ui/watch.js` 새 봇 감시: 시작 300ms 뒤·탭이 다시 보일 때 `check(true)` = 캐릭터 전체 읽기(10.8초). 모듈 전체 읽기 2분마다, + 메뉴 클릭 뒤 3분간 3초마다(MOD_EVERY 12e4, MOD_BURST 3e3).
- `src/main.js` 시작 시 start() 10여 개 동시(storyTime·fairPlay·imgFix·watcher·loreRuntime·loreLog·turnInfo·chatMenu …) — 각자 읽는 것 측정 필요.
- 화면들의 `getDatabase(["characters"])` 10곳(dev·devtools·modlinks·chareditor·newbot·workshoplink·provider/more·patchui·memory/makebot, widgethome/service.cjs) + `dbRead(["characters", …])`. Dusk 첫 화면이 무엇을 읽는지 확인 필요.

## 쓰는 동안 버벅임의 원인 (2026-11-12 22:45, 사용자 성능 기록 Trace-20261112T224101 분석)
- 상호작용 지연 대부분이 '입력 지연'(130~800ms) = 메인 스레드가 배경 작업 중. 처리 자체는 짧음. 봇 바꾸기만 처리 600ms+.
- 배경 작업 1위: RisuBard `src/ts/storage/risuSave.ts` `RisuSavePatcher.set()` — 저장할 때마다(트래킹된 저장 뒤 약 2초 후의 'untracked sweep' 포함, `globalApi.svelte.ts` 1594~1618줄) **모든 캐릭터를 `JSON.stringify(withStubs(curChar))`로 문자열화해 비교**(1131~1140줄 부근). 반응형 프록시 위에서 57.8MB를 훑어 1회 약 0.5초, 99초 기록 중 8번 이상. 데이터 양에 비례, 플러그인과 무관.
- 그 밖: Svelte 반응 갱신(flush) 합계 약 5.5초, 정체 미확인 장기 작업 `kde`(stores.svelte 1862줄)·`zge`/`Fge`(2641~2643줄)·`ase`(1108줄) 각 약 1~3초. V8 DeoptimizeCode 9만 회.
- 결론: Dusk로 고칠 수 없는 호스트 쪽 원인. RisuBard 개발자에게 근거와 함께 전달할 것.
- (23:06) 사용자 RisuBard에 '버벅임 패치'(별도 배포물 RisuBard-perf-patch.zip — set()의 봇·설정 비교 반복문을 8ms마다 scheduler.yield로 나눔, 결과 동일 시험 통과) 적용 → **확실히 효과 있음**. 플러그인을 켜면 다시 조금 버벅임 → Dusk 몫 확인됨.
- 다음 챗: ① 사용자가 'Dusk만 켠' 성능 기록을 줌 → Dusk 함수별 시간 분석 ② `watch.js`부터 수정. 이 세션은 npm 레지스트리 차단으로 esbuild를 못 받아 build/check 불가 — 패키지 설치가 되는 환경에서 진행.

- (11-12 23시 반) **watch.js 가볍게**(시험 tests/watch-light.test.js 4개, 고치기 전 4개 실패 확인): 캐릭터 전체 읽기는 처음 설치·inspect(새 봇)만. 평소엔 순서 목록 + getCharacterFromIndex(봇 수) 끝자리 훑기, 봇 수는 rbm:watch:v1의 `n`에 저장. 순서에서 빠진 봇도 known에 남김(늦게 들어오는 봇 오탐 방지). 순서에서 봇이 빠지면 끝자리를 아래로 맞춤. 탭 복귀 force 제거, force가 모듈 읽기를 부르지 않음. 모듈 MOD_EVERY 2분→5분, 시작 뒤 1분 쉼, burst 3초→20초(누른 뒤 10초부터). npm test는 돌렸고 **build·check·e2e는 패키지 설치 차단으로 못 함** — 다음 세션에서 npm run build → check 필수(dist 미갱신).

## 할 일
- [x] watch.js 전체 읽기 없애기 — (11-12 23시 반) build·check 동일함(v2.1.7), e2e run-smoke 통과, dist 갱신. 실기기 체감 미확인
- [ ] 시작 단계별 시간 기록(Dusk 내부 타이밍 로그) → 23.2초 중 Dusk 몫 측정
- [ ] 캐릭터 요약 캐시(chaId·이름·이미지·바뀐 시각)를 pluginStorage에 두고 바뀐 것만 갱신 → 화면들이 전체 대신 요약 사용
- [ ] 시작 시 무거운 start()는 미루기(첫 채팅·첫 열기 때)
- [ ] pluginCustomStorage 15.7MB 주인 확인(키 접두사별 크기)

---

# 현재 상태 — SD-Studio 브랜치 (2.1.0 끝 e194dd9에서 분기)

## 최근 세션 (2026-11-12 10시 반 — 에셋 제작 다음 작업 명세 1~4, 미커밋·미푸시: 세션에 push 권한 없음)
- 1 캐릭터 폴더 영어 이름: 폴더 `en`(project.js normalize·addFolder·updateFolder), `folderFileName`·`charFolderOf`·`zipDir`. 폴더 대화상자에 영어 이름 칸(#sds-fen). 에셋 이름(charFolderName)·zip 경로(`폴더영어/캐릭터영어/…`)에 영어 이름, 로어북 연동은 표기 이름.
- 2 씬 세트: `proj.sets = { active, list:[{id,name,tpl}], store:{세트id:{chars, members}} }`(기본 SFW·NSFW). 폴더는 공유, 캐릭터 카드·폴더 소속은 세트마다(지금 세트는 chars·members, 나머지는 store). switchSet(copy = 빈 세트에 캐릭터 이름·외형·소속만 새 id로)·addSet·updateSet·removeSet(지금 세트는 못 지움). 세트의 씬 프리셋 = 기존 ‘씬 템플릿’(dusk.sdstudio.templates, 리스 전체) 이름 재사용. 도구 줄 아래 `.sds-setbar`에 [SFW][NSFW][+], 우클릭 메뉴(이름·프리셋·모두에 적용·지우기). 새 캐릭터는 폴더 기본 템플릿 → 없으면 세트 프리셋. 예약·큐는 지금 세트만 돎.
- 3 로어북 연동 양방향: loresync `pullLore` — 연결 안 된 Dusk 폴더·[소속]을 폴더로(소속→group, da_parent 구조 유지, lore id 연결, 고리는 맨 위). 이미 연결된 것의 이름·위치는 에셋 제작 기준. 지운 폴더의 lore id는 `proj.loreSkip`에 남겨 다시 안 가져옴. syncLoreNow: 열 때(loreSync 켰으면)·폴더 바뀔 때 pull → push. **버그 고침**: 봇 쪽 push가 syncLore를 두 번 불러 기록한 lore id와 실제 로어북 id가 어긋났음 → 한 번만 계산.
- 4 튜토리얼 `dlg.tutorial`(4단계: 로어북 연동 끔/켬 · SDStudio 백업 가져오기 · 씬 템플릿 가져오기/세트 프리셋 고르기 · 저장·백업), 첫 실행(prefs.tutorialDone 없을 때)과 도움말 ‘튜토리얼 다시 보기’. 도움말에 씬 세트·로어북 연동 절.
- 시험: unit `tests/sdstudio-sets.test.js`(4) → npm test 1474 pass / 1 fail(pot-port, 원래 실패). build·check 동일함, build-addons --check 동일. e2e run-addon-sdstudio 117 통과(튜토리얼은 e2e에서 tutorialDone으로 건너뜀 — 세트·튜토리얼 e2e는 아직 없음).
- (11시) 캐릭터 카드·폴더는 한 번 누르면 테두리만, 여는 건 더블클릭(selectable·폴더 타일·sds-fopen). 생성 다시 시도: 진행 줄에 마지막 오류 표시(q.lastErr), 429 말고 4xx(NovelAI 오류 400 등)는 다시 해도 같아 멈추고 알림. e2e openCard = dblclick, 117 통과.
- (11시 반) 멈추기 고침: ① 다시 시도 대기(최대 1분)가 abort를 안 들어 그동안 안 멈췄음 → 대기도 q.ctl.signal로 끝남 ② 그림 올 때마다 paintTop이 버튼을 새로 그려 click이 끊길 수 있음 → pointerdown에서 멈춤 ③ 멈추는 동안 ‘멈추는 중…’(q.stopping), 그동안 생성 다시 못 누름. e2e 120(재시도 중 멈추기·오류 문구·400 즉시 멈춤 추가).
- (11시 반) 오류 가독성: 다시 시도 오류는 위 줄 아래 빨간 띠 `#sds-qerr`(줄바꿈, 300자). 프롬프트 만들기 오류(없는 조각 모음 등)는 e.fatal로 요청 없이 바로 멈추고 알림(15초, ‘그 씬 열기’). 제보 원인 = 상위 프롬프트의 없는 조각 모음 참조.
- (11시 40분) 원본 가져오기 모음: 도구 줄 ‘템플릿’ 무리의 `#sds-import-menu`(백업·씬 템플릿·조각 .json/.txt·캐릭터 프리셋 .json→캐릭터 카드·PNG 메타 → 프롬프트). 엔진 `engine/sdstudio/imports.js`(조각 한 모음·옛 형식·전역 백업·세션 library, 같은 이름은 _2 / 와일드카드는 wildcards 모음 / NAI Comment·SDStudio v1 구획). 조각 모음 창에 ‘파일에서 가져오기’·모음 ‘내보내기’(SDStudio 형식). 시험 tests/sdstudio-imports.test.js(4). 안 넣은 원본 가져오기: 작가 라이브러리 이미지·글로벌 프리셋 tar·캐릭터 프리셋의 바이브/레퍼런스 그림·구글 드라이브.
- (11시 40분) 조각 모음 이름 바꾸기(조각 모음 창 #sds-lib-rename) — P.renamePieceLib가 프롬프트 곳곳의 <옛이름.…>(다른 세트 포함)도 고침.
- (11시 50분) 조각 이름 띄어쓰기: 가져오기·이름 바꾸기·조각 창이 띄어쓰기를 지우던 것 → 남김(연속 공백은 하나). findPiece는 정확히 → 없으면 공백·대소문자 무시로 찾음(예전에 띄어쓰기가 빠진 채 가져온 모음도 원래 참조로 읽힘).
- (12시) ‘저장하지 못했어요’ 잦음: 원인 = 생성 중 3초 자동 저장·0.5초 저장이 겹쳐 앞 저장의 다시 읽기 확인이 뒤 저장 내용을 보고 ‘달라요’로 던짐 → data/sdstudio.js saveProject를 한 줄로(대기 중엔 마지막 것만), 실패 시 3번 재시도, 알림은 30초에 한 번. 시험 tests/sdstudio-save.test.js.
- (12시) 원본 가져오기 보강: 전체 백업 __settings__/global_pieces·global_presets·global_character_presets, 글로벌 프리셋 백업(global_presets.json), 프로젝트 템플릿 백업(project_templates.json → 씬 템플릿+프리셋)을 importBackup이 물어보고 가져옴(importSettingsFrom). 글로벌 프리셋 .json 메뉴. presetFromSD: frontPrompt·backPrompt·uc·steps·promptGuidance·cfgRescale·sampling·noiseSchedule·characterPrompts·varietyPlus·useCoords. e2e ‘원본 전체 백업 설정’ 추가. 여전히 못 가져옴: 작가 라이브러리(이미지)·바이브/레퍼런스 그림·이지 모드/I2I/인페인트 워크플로 프리셋·즐겨찾기/북마크/휴지통 등 앱 설정.
- (12시 반) 도구 줄 개편(사용자 승인): 무리 12개·아이콘 25개 → 한 줄 [되돌리기][새로 만들기▾][예약▾][대표 고르기][(씬: 그림▾)][가져오기·내보내기▾] … [검색][봇에 넣기][···]. 항목은 .sds-ddp 안 진짜 버튼(id 그대로), 바깥 누르면 닫힘, fitPanel로 화면 안에. 카드를 고르면 같은 줄이 ‘N개 고름 · 예약·복제·폴더·지우기 · ✕’. 도움말은 위 줄 것만. 모바일(≤600)은 아이콘만. 빠졌던 아이콘(shield·download·upload·edit — ?로 보이던 것) 추가. e2e는 page.click이 숨은 메뉴 항목이면 메뉴를 먼저 엶.
- (13시 반) 도구 줄이 실기기에서 회색 기본 버튼으로 보임: ensureStyle이 같은 id style이 있으면 건너뛰어, 애드온을 새로 고침 없이 바꾸면 예전 CSS가 남았음 → 내용이 다르면 바꿔 넣음.
- (13시 50분) 고른 캐릭터만 예약(고르기 줄 ‘N장씩 예약·예약 비우기’, 테두리 켠 캐릭터·폴더는 예약▾ 첫 항목 #sds-rsv-focus). 강화·약화 칠하기 진하게(빨강·파랑 30% + 밑줄, 음수는 취소선). 즐겨찾기 있는 씬은 예약 버튼 아래 노란 ★N(.favmark). 위 줄 도움말 오른쪽 X(#sds-close) = 에셋 제작만 닫음. **로어북 연동은 로어북 → 에셋 제작 한쪽만**(사용자 결정): 에셋 제작 → 로어북 쓰기 없앰(syncLore·newFolderEntry 안 씀), 열 때 새 폴더가 있으면 물어봄(설정 loreSync = 묻지 않고 자동), 튜토리얼 1단계 물어보기/자동 + 지금 가져오기.
- (14시) 큰 ‘봇에 넣기’(#sds-put-fav) = 즐겨찾기 확인하고 넣기, 미리 보기 기본 체크는 ‘새로’(안 넣었고 이름 안 겹침)만. 고른 그림 바로 넣기는 ··· 메뉴 첫 줄(id sds-put-all/picked/sel 그대로)·⌘B. ⌘A 등 단축키: 포커스가 body로 빠져도 듣게 document keydown(docKey) 추가.
- 남은 일: [ ] 제보 ‘다시 시도 5번 해도 안 됨’ 원인(진행 줄 오류 문구 받아 확인) [ ] 사용자 제보 ‘씬 예약 버튼이 제대로 안 나옴’ — e2e 사진에선 정상, 실기기 화면 확인 필요 [ ] 세트·튜토리얼 e2e [ ] 애드온 배포(minCore 2.1.4) 지시 대기

## 최근 세션 (2026-11-11 22시 — v2.1.4 계속: 보조 호출 내역 + 장기기억 보조 토큰 줄이기, 장기기억 애드온 0.2.8)
- 제보 확정: 숫자는 **보조 모델**(메인 버텍스 아르곤, 보조 버텍스 제미나이 3 플래시, 둘 다 추론 low), 턴당 입력 약 12만·출력 약 3만. 켠 애드온: 장기기억·관계도·기억카드·Erosync. (1.9.2 때 보조 약 7만 = 리수폿 Writer 지침 약 3만 + Director 약 2만 + 데이터)
- **보조 호출 장부** `engine/auxlog.js`(globalThis.__duskAux — 애드온은 import 없이 `globalThis.__duskAux?.note?.()`): 적는 곳 ① `aistop.trackedRunLLM`(api.runLLMModel — 이름 = 열린 aiTask, otherAx = ‘Erosync·애드온’, mode model = ‘플러그인의 메인 모델 호출’, 글자 수 어림) ② `runai` 내 API·Dusk 프로바이더 길(어림) ③ `memoryturn.stageCall`이 onUsage를 받은 경우(직접 연결 = 공급자 실제 토큰, 리스 길은 ①이 적음). turninfo가 메인 요청부터 다음 메인 요청 전까지의 호출을 rec.side(작업별 n·in·out·est)로 묶고 callHtml ‘보조 호출’ 줄 + 접힌 줄 ‘보조 N회’. Erosync 자체 직접 제공자(리스 안 거침)는 아직 안 잡힘.
- **묶어 묻기** `memorylines.linesStage2Group`·`splitGroupReply`(@|이름 묶음), `recorder.recordTurn({group})` — 3명씩 한 호출, 못 읽으면 그 묶음만 한 명씩, 묶음에 빠진 인물 = 변화 없음(실패 아님), 취소는 던짐. 기본값은 recordTurn 인자로는 꺼짐(시험 호환), memoryturn이 `settings.groupPeople !== false`로 켬. **Dusk 단독 분석(memoryprompt.analyzeLines)은 아직 한 명씩**.
- **캐시**: linesStage2가 인물 이름을 지침에 넣지 않음(데이터 focus로만) → 인물마다 지침 글이 같음. 시험 2곳(memorylines·memoryturn) 이름 읽는 곳을 focus로 고침.
- **실패 낭비**: memoryturn writerCall — 기록기 실패 시 기본은 `dusk-recorder-failed`로 던져 ‘다시 시도’(예전 리수폿 Writer 대신 안 함), 설정 `potFallback`(기억 설정 스위치) 켜면 예전처럼. 리수폿 검증 탈락(potNext) 뒤에도 기본은 가벼운 지침으로 새로 기록. 출력 한도 넓히기는 `cutByLimit`(finish_reason length/MAX_TOKENS·stop_reason max_tokens)일 때만, 1.5배·최대 16384(사용자 지시: 토큰 때문이 아니면 올리지 말 것).
- 기억 설정에 스위치 2개(묶어 묻기 기본 켬·실패 시 대신 기본 끔) + 안내서 memory.html·story.html, CHANGELOG.
- 장기기억 애드온 0.2.8 **minCore 2.1.4**(코어 memorylines 새 export 때문) → 코어 2.1.4 전 기기는 held(예전 애드온 유지).
- 시험: `tests/aux-saving.test.js`(12) + memoryturn ‘2.1.4 실패 시 대신 안 함/설정 켜면 대신’ → npm test 1451 pass / 1 fail(pot-port, 원래 실패). build·check 동일함, build-addons --check 동일. e2e recorder-ui 14(스위치 확인 추가)·wiki-recorder·home-turn·smoke 통과.
- (22시 반) **월경·임신 기록도 기록기로**(장기기억 애드온 0.2.9): recordWithDusk가 CYCLE_BLOCK_MARK 있어도 리수폿 Writer로 안 넘김. `recorder.CYCLE_STAGE1`을 1단계 지침에 덧붙여 woman/sex/pregnant/birth 줄을 받고 `cycleFrom` → cycle_report → `applyCycleReportObject`로 리수폿 표식(CYCLE:/SEX:/PREGNANCY KNOWN/BIRTH). 주기 계산은 리수폿 그대로. cyclePending(출산 등 큰 사건)은 기록기 길 전에 잡도록 앞으로 옮김. 시험 `tests/recorder-cycle.test.js`(실제 리수폿 검증 통과·표식 저장).
- 배포: addons 브랜치에 **장기기억 0.2.9만**(minCore 2.1.4) 올림(f8b8a67). publish-addons가 dist 전체를 올려 aibuild·cards·chattheme·erosync·provider(버전 그대로인데 코드가 바뀜)와 sdstudio.js(목록에 없는 남은 파일)까지 올라갔던 것을 되돌림 — 이 애드온들은 버전을 안 올린 채 바뀐 상태라, 다음에 배포할 땐 버전·minCore를 정하고 올릴 것.
- (11-12 0시) 사용자 제보: “다음 응답이 끊겨 다시 생성하면 이미 정리된 이전 대화를 다시 정리”. 조사: 장기기억·리수폿은 재현 안 됨 — 시험 6개 추가(memoryturn ‘끊긴 생성 뒤 다시 생성’ fast/accurate × 출력 없음/잘린 응답 지워짐/플러그인 다시 시작: 추가 호출 0). 이미 영속 중복 방지가 있음(리수폿 identity=메시지ID+본문 → ‘이미 반영된 RP’, Dusk 커서 h·at). Erosync는 잘린 응답이 출력 훅으로 커밋됐다가 지워지면 chat resync(rollback, AI 호출 없음)·그 요청은 계획 없이 통과. 남은 의심: Erosync 계획 캐시(decisionCache: lifecycleEpoch·baseCommit 일치 필요)가 다시 생성 때 안 맞아 긴급 재계획(runEmergencyReplan) — 미확인. 채팅에 태그 넣는 안은 안 함(본편 토큰·모델이 흉내·편집 시 깨짐). 사용자가 2.1.4 ‘보조 호출’ 줄로 다시 생성 때 무엇이 도는지 보고 오면 그쪽을 고칠 것.
- (0시 반) 추가 제보: 검열(‘모델 생산자가 생성을 중지’)·사용자가 직접 중지한 뒤 다시 누르면 보조 모델이 돎, 모바일에서 생성 중지 버튼이 안 보임. 유력 원인: Erosync가 커밋된 출력마다 다음 턴 계획(queueNextTurnLookahead, erosync.js 19532)을 바로 돌림 → 끊긴/중지된 응답에도 한 번, 다시 생성 뒤 새 응답에 또 한 번. 미확인(기기 확인 필요). 생성 중지 버튼은 bottom 16→76px(리스 모바일 입력창·보내기 버튼 자리, 재시도 알림과 같은 높이) — 원인 확정 아님.
- (0시 반) **v2.1.4 코어 릴리스**(main 병합·v2.1.4 태그) + addons 브랜치에 Erosync 0.1.3만 배포(cbe1deb). 장기기억 0.2.9는 앞서 배포. sdstudio는 배포 안 함(사용자 지시).
- 남은 일: [ ] 다시 생성 때 도는 작업 확인(보조 호출 줄) [x] Erosync 0.1.3: 확정 뒤 계획 미리 짜기·인물 재분석·비하인드를 20초 미룸(`src/erosync/lookaheaddelay.js`, erosync.js 확정 직후 lookaheadDelay.delay) — 되돌림(resync, 다시 생성)이면 cancel, 새 입력이면 flush 후 긴급 판단 대기 시간까지만 기다림(리스 제공자·0이면 안 기다림). 시험 tests/erosync-lookahead-delay.test.js(5). 실제 기기 미확인 [ ] 제보자 재측정(보조 호출 줄로 어느 작업이 큰지) [ ] analyzeLines 묶어 묻기 [ ] Erosync 직접 제공자 호출도 장부에 [ ] 정리 노트 factSheet가 위키 참조와 겹치는 칸 [ ] v2.1.4 main 병합·태그(사용자 지시 대기)

## 최근 세션 (2026-11-11 21시 — v2.1.4: 모델 호출 표시 ‘입력 내역’)
- 제보: “장기기억 쓰면 2.0.0 전보다 입력이 7만→13만(응답 아래 모델 호출 칸 기준)”. 조사: 그 숫자는 Dusk turninfo의 메인 요청 어림값. 장기기억이 본편에 넣는 몫은 코드상 상한이 위키 참조 16,000자(관계 전용이면 실제 2~4천 자)+정리 노트 11,900자라 약 7천 토큰이 최대 → 6만 증가는 장기기억만으로 설명 안 됨. 원인 확정 못 함 — 사용자(제보자)가 장기 기억 끄고 다시 생성해 비교하기로.
- 그래서 **입력 내역** 추가: `engine/turninfo.js` promptParts(messages) — 리수폿 위키/정리 노트는 HTML 주석 표식으로 잘라 세고, 메시지 머리 표식([Dusk Memory·[Dusk · module images]·봇 기본 페르소나·공정한 전개·주사위·이야기 시간·이미지 태그·내 프롬프트), 나머지는 system=‘시스템·봇 설정·로어북’, 그 밖=‘채팅 기록’. 큰 것부터 최대 8개를 rec.parts로 저장, callHtml에 ‘입력 내역’ 줄.
- 훅 순서: 애드온(장기 기억 등)이 5초 뒤에 붙으면 호출 표시가 최종 프롬프트를 못 봤음 → `data/replacerorder.js` createReplacerWatch(raw) (main.js가 api.addRisuReplacer를 감쌈) + turninfo `watchReplacers`: 다른 beforeRequest가 붙을 때마다 0.3초 뒤 remove→add로 맨 뒤.
- 시험: unit `turninfo-parts.test.js`(5) 포함 npm test 1438 pass / **1 fail = tests/pot-port.test.js**(customPromptPlain is not defined — 내 변경 전 origin/SD-Studio에서도 같은 실패, 손대지 않음). build·check 동일함(v2.1.4). e2e run-home-turn·run-smoke 통과.
- 남은 일: [ ] 제보자 ‘입력 내역’ 결과 받아 13만의 원인 확인 [ ] 정리 노트(factSheet)가 위키 참조와 겹치는 칸 빼기·기록기 실패 시 리수폿 Writer(약 3만 토큰) 대신 길 줄이기(보조 토큰) — 사용자 결정 대기 [ ] pot-port.test 실패 원인 [ ] v2.1.4 main 병합·태그(사용자 지시 대기)

## 최근 세션 (2026-11-11 11시 40분 — 생성 중지: 작업 이름 표시 + 대기 작업까지 멈춤)
- 사용자: “생성 중지 버튼에 무슨 작업 중인지도 떠야. 버튼이 작동 안 함 — 누르면 뒤에 대기 중인 작업까지 그만두게, 플러그인에서 부른 것만.”
- 원인: ① 버튼은 호출 개수만 보여 줌(대부분 호출에 이름 없음). ② stopAll은 지금 도는 호출만 끊음 → 로어북 정리·기억 기록처럼 여러 번 부르는 작업은 2초 뒤 다음 호출로 그대로 이어짐. ③ 기억 기록이 내 API(provider 직접 fetch)로 돌면 trackAi에 아예 안 잡혀 중지 불가.
- `engine/aistop.js`: `aiTask(label, fn)`(작업 묶음) · `activeTasks()`(최근 먼저, 겹치면 하나, 이름 없으면 ‘AI 작업’) · `describeAi(raw)`(writer→기억 기록, sdstudio→NAI 이미지 생성, erosync-*→Erosync, model:*·모르는 영문 id→"", 한국어 그대로). stopAll이 열린 작업을 ‘중지됨’으로 표시 → 그 작업이 끝날 때까지 새 trackAi는 시작하자마자 abort, runAI·trackedRunLLM은 바로 중지 오류. 막힌 시도마다 유예(3초)를 다시 재서 곧바로 재시도하는 루프도 끊김.
- `engine/runai.js`: `runAITask(label, …)`, runAI는 `pick.label ?? pick.stage`로 이름.
- 이름 붙인 곳: 장기기억 자동 기록(memoryrunner)·장기기억 단계(memoryturn — trackAi로 감싸 내 API도 중지됨)·인물 게이지·호감도 HUD·인물 카드·되감기 첫 메시지·기억 중요도(bardwiki)·페르소나·로어북 정리·테마·스킬 대화·봇 세계관 맞추기/로어 충돌 정리(legacy)·에셋 태그 고치기·봇빌더(aibuild). 애드온은 stage 이름(‘애드온 …’, Erosync, NAI) 그대로.
- `ui/aistopbtn.js`: ‘생성 중지 · 작업 이름 외 N’(긴 이름은 말줄임), title에 전체 목록. 리스 화면 버튼도 같은 글자.
- 시험: unit aistop 10(이름표·작업 묶음·실패해도 정리·pick.label·대기 호출 5개 모두 중지·trackAi 즉시 abort) → npm test 1421 pass / 9 skip. e2e persona-sop(‘생성 중지 · 페르소나 만들기’ 확인 추가)·addon-sdstudio 76·smoke 53·addons-ui 46 통과.
- 남은 일: [ ] 리수폿이 hook에서 직접 도는 기록(main-wiki-hook 등, pot 자동 생성 코드라 못 고침)은 이름 없이 ‘AI 작업’으로 보이고, 3초보다 긴 간격의 pot 자체 재시도는 막지 못함 — 실기기에서 확인 필요.

## 최근 세션 (2026-11-11 11시 반 — 맥 단축키, 고른 그림만 보내기)
- 사용자: “단축키는 맥용도 지원, 각 카드에서 봇으로 이미지를 보낼 때는 선택한 이미지만 내보낼 수 있게.”
- **맥 단축키**(keys.js 다시 씀): 키 이름에 `Mod`(맥 ⌘, 그 밖 Ctrl)를 쓰고 맥의 `Ctrl`(⌃)·`Alt`(⌥)는 따로. 글자·숫자는 e.code(KeyZ·Digit1)로 읽어 ⌥ 조합(¬ 등)·한글 자판도 같은 이름. 보이는 이름 keyLabel(맥 ⌘⇧Z·⌘↩, 그 밖 Ctrl+Shift+Z). isMacLike = userAgentData.platform → platform → userAgent. 저장은 prefs.keys2(예전 prefs.keys는 v1으로 읽어 Ctrl→Mod). 도구 설명·도움말·왼쪽 도움말이 실제 키 이름을 보여 줌.
- **되돌리기 묶음 고침**: 예전엔 0.7초 안의 모든 바꿈을 하나로 묶어 ‘캐릭터 추가 + 감정 세트’가 한 번에 되돌아갔음 → 이제 input 이벤트(글자 입력) 중 잇단 바꿈만 묶고 버튼 동작은 하나씩(history.push(prev, { typing })).
- **고른 그림만 보내기**: 그림 체크(또는 Ctrl/⌘+클릭) = 그림에 `pick` 저장(씬을 옮기거나 다시 열어도 남음, 되돌리기 기록 안 함). 씬·캐릭터 카드 캡션에 `✓N`. 씬 화면 ‘고른 그림 N장 바로 넣기’, 캐릭터 화면 ‘고른 그림 N장 바로 넣기’(모든 씬에서 고른 것, 씬 순서, 이름 = 씬 이름) + ‘넣는 방법 고르고 넣기…’ + ‘고르기 모두 풀기’. 단축키 ‘고른 그림 봇에 바로 넣기’도 고른 것만. **예전 ‘씬 대표 그림 넣기’(자동으로 대표를 골라 보내던 것)는 없앰.** 보낸 그림은 고르기가 풀림. 크게 보기에 ‘보낼 그림으로 고르기’ 토글과 ‘이 그림만 봇에 넣기’. 넣는 방법 창은 이름(비우면 씬 이름)·자리·같은 이름 규칙 → quickPut과 같은 길(변환·되돌리기 알림 그대로).
- 엔진 project.js: setPicks·clearPicks·pickCount·pickedImages, normImage에 pick.
- 시험: unit 1416 pass(keys 3·history·pick 1 추가/수정). e2e run-addon-sdstudio 76(카드마다 고르기·✓표시·Ctrl+B 고른 것만·보낸 뒤 풀림, 맥 흉내 블록: ⌘B 표시·⌘Z/⌘⇧Z·⌃Z는 따로·단축키 창 기호·⌃U로 바꾸기). 관련 e2e 6묶음 통과.

## 최근 세션 (2026-11-11 11시 — 바로 넣기·WebP/AVIF·부스트·템플릿·되돌리기·단축키, ‘프로젝트’ 없앰)
- 사용자: “프로젝트는 없애도 됨(봇당 이미지). 선택해서 봇으로 직접 넣기(최대한 빠르게), 넣을 때 webp·avif로 용량 줄이기. 부스트 모드·템플릿 관리·단축키 설정·실행 취소, SDStudio 씬 템플릿 가져오기. 최상위에서 템플릿 가져오면 모든 폴더·캐릭터에 적용, 씬이 이미 있으면 합칠지 바꿀지.”
- ‘프로젝트’ 없앰 = 화면에서만: 왼쪽 위 ‘프로젝트’ 무리(작업 묶음 파일 내보내기·가져오기) 지움 → ‘도구’(조각 모음·문제 확인)+‘프리셋’, 레일 글자 ‘프롬프트’. 봇·모듈별 저장(pluginStorage dusk.sdstudio.p./m.)은 그대로.
- **바로 넣기**(studio.js quickPut): 대화상자 없이 설정의 자리(봇 기본 감정 이미지/모듈 에셋)·형식·같은 이름 규칙대로, 변환은 3장씩 동시에, 봇 쓰기는 한 번, 알림에 용량(원본→변환)과 ‘되돌리기’(그 자리 목록을 넣기 전으로). 입구: 씬 화면 ‘고른 그림 바로 넣기’, 그림 카드 ‘넣기’, 캐릭터 화면 ‘씬 대표 바로 넣기’(고른 씬 또는 전부, 이름 = 씬 이름), 크게 보기 ‘봇에 바로 넣기’, Ctrl+B. 예전 대화상자는 ‘넣는 방법 고르고 넣기…’(sliders 아이콘)로 남김.
- **변환**(data/sdstudio.js convertImage): createImageBitmap → (Offscreen)Canvas → image/webp·image/avif(quality). AVIF를 못 만들면 WebP, 더 커지면 원본. 변환본은 새로 saveAsset(생성 때 저장한 PNG 원본도 저장소에 남음). 설정: prefs(로컬 dusk.sdstudio.prefs) putSlot·putFormat(기본 webp)·putQuality(0.85)·dup(number|replace).
- **부스트 모드**: 설정에서 끔/켬(켤 때 NovelAI 제재 경고 확인 — SDStudio 원본 안내와 같음), 토큰 여러 개(로컬 dusk.sdstudio.tokens, 첫 칸 = 기본 토큰). 켜고 토큰 2개 이상이면 runQueue가 토큰마다 한 줄씩(최대 4) 동시에 그림(sd.call token 넘김). 생성 버튼에 ‘부스트’ 표시.
- **템플릿**(engine/sdstudio/template.js): 캐릭터 씬 → 템플릿(이름·슬롯·크기, 조각 모음 포함, 그림·예약 제외), 저장 pluginStorage dusk.sdstudio.templates. 가져오기: Dusk 파일(format dusk-sdstudio-template)·SDStudio 씬 템플릿(type sdstudio-scene-template, session.scenes·library, resolution 키 그대로, custom은 WxH)·SDStudio 세션 JSON. 적용 범위: 맨 위 = 모든 캐릭터, 폴더 안 = 그 폴더(안의 폴더 포함) 캐릭터, 캐릭터 안 = 그 캐릭터. 처음 상태(빈 default 하나) 캐릭터는 그냥 바꿈, 씬 있는 캐릭터가 있으면 합치기(없는 씬만 뒤에)/바꾸기(템플릿 목록으로 — 같은 이름 씬은 id·그림·예약 지키고 슬롯·크기만, 템플릿에 없는 씬은 빠짐) 고름. 조각 모음은 없는 모음·조각만 더함. 가져오기 = 저장 + 바로 적용. 템플릿 관리 창(적용·이름·내보내기·지우기). 도구 줄 ‘템플릿’ 무리.
- **되돌리기**(history.js): S.set이 직전 상태를 쌓음(0.7초 안 잇단 바꿈은 하나로, 60개). 그리기 결과·예약 줄이기·바이브 캐시·변형 결과는 {undo:false}. 도구 줄 ‘되돌리기’ 무리, Ctrl+Z / Ctrl+Shift+Z(글 쓰는 칸 안에서는 칸 자체 되돌리기). 봇에 넣은 것은 알림의 되돌리기로.
- **단축키**(keys.js): 16개 동작(생성·에디터·되돌리기/다시·바로 넣기·모두 고르기·검색·새로 만들기·월드컵·예약·모드1~5·도움말), ⌘=Ctrl, 설정 → 단축키 설정(줄 누르고 키, Backspace로 지움, 겹치면 상대 비움, 기본값), 로컬 prefs.keys.
- 시험: unit `sdstudio-tools.test.js`(6) → npm test 1413 pass. e2e `run-addon-sdstudio` 65(바로 넣기·WebP 확인·되돌리기 알림·넣기 방법·Ctrl+B·템플릿 저장/적용/SD 파일 가져오기(filechooser)/바꾸기/폴더 범위·되돌리기 버튼·Ctrl+Z·단축키 바꾸기·부스트 두 토큰 동시). 가짜 리스가 봇 쓰기를 기억하게 고침. dev-slot 8·chattheme 14·widgets 10·addons-ui 46·scrollkeep 12·smoke 53 통과.
- 남은 일(추가): [ ] 실기기에서 WebP/AVIF 변환(플러그인 칸에서 createImageBitmap·OffscreenCanvas 되는지) [ ] 부스트는 실제 계정 2개로 확인 못 함

## 최근 세션 (2026-11-11 10시 — SDStudio 사진처럼 전체 이식 + 에셋 버튼을 편집 화면으로)
- 사용자: “사진(SDStudio 씬 갤러리)과 최대한 비슷하게, 우리 디자인으로. 이 플러그인만 완전 풀스크린 OK. 에셋·에셋 제작 버튼은 봇/모듈 편집 ‘적용’ 아래로, 밖의 버튼 2개는 지움. SDStudio 기능은 가능한 한 모두. 우리 독자 기능은 폴더뿐.” 질문으로 정함: **캐릭터 안에 씬**(카드=캐릭터, 열면 사진 같은 씬 갤러리, 씬 이름 = 감정 이미지 이름), **에셋 제작은 봇·모듈 둘 다**(모듈은 모듈 에셋).
- **코어**: `editor.js` 머리 아래 `#rb-edit-sub`(오른쪽 정렬) = ‘에셋’(cfg.openAssets) + 애드온 자리 **`slot "editor.actions"`**(부품 (ctx, cfg.target), target = {kind:"module", id} | {kind:"character", id, index}, 봇 초안이면 target 없음 → 줄 안 그림). 모듈 openEditor·chareditor가 target/openAssets 넘김. `dev.js` 상세의 ‘에셋’ 버튼과 `dev.actions` 자리는 없앰(미릴리스라 영향 없음). CHANGELOG ‘다음 버전’·안내서 manage.html(에셋 관리자 ‘여는 곳’) 갱신.
- **애드온 `addons/sdstudio`**(아직 addons.src.json 미등록): editor.actions에 ‘에셋 제작’ → `ui/screens/sdstudio/studio.js` openAssetStudio(ctx, target, sd). 연 동안 `ctx.root` padding 0 + `ctx.win` 크기 제한·모서리 없앰(닫으면 원래 style 되돌림) = 플러그인만 화면 가득. 루트 `.rb-full.sds`(앱 Esc가 창을 닫지 않게 rb-full 붙임, overflow:hidden — 없으면 포커스 때 창이 옆으로 밀림).
  - 화면(사진 대응): 왼쪽 레일 ‘F1 프로젝트’(프롬프트 에디터 접기) · 왼쪽 ‘프롬프트 에디터’(프로젝트[작업 묶음 파일·조각 모음·문제 확인]/프리셋[저장·불러오기], 상위·(캐릭터 연 동안)외형·하위·네거티브 — 문법 색칠, 시드(값·잠금·완전 랜덤/고정/장마다 이어서), 이미지 사이즈(각 씬대로·SDStudio 크기 11종·직접), 캐릭터 프롬프트(NAI 다인, 위치), 샘플링/모델, 바이브, 레퍼런스(0/2)) · 위 줄(제목·조합 N개·예약된 씬 a/b 알약·모드 탭[씬/캐릭터·갤러리·검색·비교·동시편집]·생성/멈추기·도움말) · 도구 줄(무리 이름 작게: 예약·씬 도구·이미지·관리·도움말·설정 … 검색·보기[이름 표시·카드 크기 41%]) · 카드 2:3 + 아래 이름·장 수, 예약 배지 +N, 마우스 올리면 +1/−1, 체크·Ctrl로 여러 개.
  - 단계: 캐릭터 갤러리(폴더 줄=한 줄에 카드 여러 장, 안에 폴더·여러 폴더) → 씬 갤러리 → 씬(조합 슬롯 편집·미리보기·크기·예약·‘지금 1장’ + 그림). 감정 세트(20개) 더하기.
  - 그림: 라이트박스(← → Esc F Delete, 즐겨찾기·씬/캐릭터 대표·봇에 넣기·변형(img2img)·인페인트(붓 마스크)·업스케일(Anlas 안내)·디렉터 도구 6종·비교에 넣기·이 시드로 고정·내려받기·목록에서 빼기), 이미지 월드컵(순위, 1위=씬 대표), zip(고른 것/씬 대표/전부), 봇·모듈에 넣기(고른 그림 / 씬 대표를 씬 이름으로 — 같은 이름 ‘번호 붙여 더하기/그림 바꾸기’).
  - 큐: 예약 1장 = 그 씬 조합 전부(SDStudio 규칙), MAX_JOBS 500, 다 그린 묶음마다 예약 −1, 생성 중지 버튼(trackAi)·멈추기. 바이브는 V4.x에서 encode-vibe 결과를 설정에 캐시(모델·정보량 같을 때), 레퍼런스는 1024×1536/1536×1024/1472×1472에 가운데 맞춤.
- **엔진**: `engine/sdstudio/nai.js` 전면(모델 7종 V5 Full/Medium/Curated·V4.5·V4, 샘플러·노이즈·크기, 품질·UC 프리셋 원문 그대로, V5 tag_hint·Medium 고정값·cfg_rescale 생략, 캐릭터 프롬프트·바이브 정규화·디렉터 레퍼런스·Variety+·img2img·infill, augment·upscale(비용)·encode-vibe 본문, zip 첫/마지막 항목·pngSize, 가중치 띄어쓰기) · 새 `prompt.js`(##주석##·줄바꿈·{a|b}·<모음.조각>(여러 줄 무작위·순환 오류)·상위 | 끼움·조합 개수/i번째·문법 칠하기) · `project.js` v2(settings·pieces·chars→scenes·folders, v1 마이그레이션(그림→default 씬), 씬 CRUD·정렬·복제, 이미지 순위/즐겨찾기/대표, 예약·planJobs·reserveSummary, seedFor(xorshift)·sizeFor, 월드컵). `data/sdstudio.js`: call/image/augment/upscale/encodeVibe, toB64/fromB64, 저장 키 봇 `dusk.sdstudio.p.<chaId>`·모듈 `dusk.sdstudio.m.<id>`, 프리셋 `dusk.sdstudio.presets`(기기 전체).
- 시험: unit `sdstudio.test.js`(12)·`sdstudio-project.test.js`(8) → npm test 1407 pass / 0 fail. e2e `run-addon-sdstudio` 45(1600×1000 + 390, 캔버스 PNG·zip 가짜 NAI, `SHOTS=dir`로 사진 7장), `run-dev-slot`(편집 화면 자리로 바뀜) 8, chattheme 14·widgets 10·addons-ui 46·scrollkeep 12·smoke 53 통과. **`run-app`·`run-editor-ai`는 원래 2.1.0 끝(e194dd9)에서도 같은 오류로 실패**(내 변경과 무관, 그대로 둠).
- 남은 일:
  - [ ] addons.src.json 등록(category "make"?) + minCore = editor.actions 든 코어 버전 → 코어 릴리스 후 publish(사용자 지시 대기). 그때 안내서에 에셋 제작 쪽 추가.
  - [ ] 실기기(RisuBard)에서: 창 풀스크린 되돌림, ctx.assets(readImage)로 다시 연 그림이 보이는지(0단계 시험에서 readImage 응답 없음), 바이브·레퍼런스·인페인트 실제 NAI 응답.
  - [ ] SDStudio 중 아직 없는 것: 태그 자동완성(DB 22만 줄이라 제외), 부스트 모드(제재 위험), 로컬 배경 제거·포토샵 연동·구글 드라이브(데스크톱 전용), 씬 템플릿 관리, 단축키 설정, 실행 취소.

## 최근 세션 (2026-11-11 9시 — SD-Studio 브랜치 시작: SDStudio 이식 0단계 시험 + 개발 탭 애드온 자리)
- 목표(사용자): 개발 탭에서 봇/모듈을 만들 때 **‘에셋’ 버튼 옆 버튼**으로 그 봇에 원하는 에셋(NAI 이미지)을 자동으로 넣기. 원본은 SDStudio(Electron, sunho, MIT) — 통째 이식은 안 하고 NAI 생성·씬/프리셋·월드컵만 애드온 `sdstudio`로 새로 짓는 계획.
- **0단계 시험(커스텀 애드온 sdtest 0.1.2, 저장소에 넣지 않음) — RisuBard(PocketRisu 기반) 결과:**
  - `api.nativeFetch` → `image.novelai.net/ai/generate-image` POST: status 200, body=ReadableStream, 1.3MB zip을 약 2초에 받음. 웹리스의 ‘직전 응답 재사용’ 문제는 안 보임.
  - NAI zip은 **flags=8(데이터 기술자)** → 로컬 머리 크기 0. 크기는 EOCD→중앙 디렉터리에서 읽어야 함. 압축 해제는 `new Response(stream)`이 호스트에서 “Failed to fetch”로 깨짐 → DecompressionStream writer/reader 직접. (본 구현은 `src/vendor/fflate.js` unzipSync를 쓰면 됨.)
  - **IndexedDB 금지**(“access to the Indexed Database API is denied in this context”) → 이미지 보관은 `api.saveAsset`(630ms, `assets/<sha>.png`) + 경로만 저장, 후보 이미지는 메모리만. Cellar 있으면 Cellar 저장 검토.
  - `additionalAssets`에 `[name, path, "png"]` 추가 → `setCharacterToIndex` → 다시 읽어 보임, 실제 봇에 들어간 것 사용자 확인. `readImage(path)`는 응답 없이 멈춤(결과 줄 안 나옴) → 본 구현은 시간 제한 + 메모리 바이트로 미리보기.
  - `getRuntimeInfo()`가 `{}` — 호스트 구분 신호로 못 씀. `/user/data`의 tier 필드 경로는 틀림(본 구현은 `/user/subscription`).
  - 남은 확인: RisuAI 웹·PocketRisu 단독에서 같은 시험.
- **코어: 개발 탭 애드온 자리 `slot "dev.actions"`** — `ui/screens/dev.js` actions()의 ‘에셋’ 바로 뒤. 부품은 `(ctx, info)`, info = 모듈 `{ kind: "module", id }` / 봇 `{ kind: "character", id, index }`. `ui/ext.js` `render(kind, key, ctx, info)` 넷째 인자 추가(더하기만, 기존 슬롯 영향 없음). e2e `tests/e2e/run-dev-slot.mjs`(7). 애드온이 이 자리를 쓰려면 이 코어가 릴리스돼야 함(minCore 올리기) — 릴리스는 지시 대기.
- **(9시 반) 자리를 버튼 줄 아래로 옮김 + 애드온 `addons/sdstudio` ‘에셋 제작’ 첫 판** — 사용자: “불러오기·내보내기 밑에 길쭉한 에셋 제작 버튼”.
  - `dev.js` actions(): 슬롯 부품이 있으면 `#rb-dev-actions`(세로) = 버튼 줄 + 그 아래 부품들(폭 가득). 없으면 예전 줄 그대로.
  - 새 파일(애드온 전용, 코어 import 없음): `engine/sdstudio/nai.js`(buildGenerateBody v4.5·SIZES 세로/가로/정사각 Opus 무료 범위·readZipFirst(데이터 기술자 zip, fflate inflateSync)·assetSlotsOf·withAsset·uniqueAssetName) · `data/sdstudio.js`(토큰 `dusk.sdstudio.token`은 getLocalPluginStorage만·없으면 메모리, nativeFetch(signal 안 넘김)→fetch, 바디 어느 꼴이든, trackAi로 생성 중지, 401/402/429 문구, saveAsset 3번 시도) · `ui/screens/sdstudio.js`(창: 토큰(저장됨/바꾸기)·프롬프트·크기·1/2/4장·만들기·그림 고르기·봇은 추가 에셋/감정 이미지·이름·넣기 → 덧붙이기만, 봇 생성 중이면 막음, 모듈은 svc.run update assets). 창 상태는 `ctx.state.sdstudio["kind:id"]`.
  - 시험: `tests/sdstudio.test.js`(5), e2e `run-addon-sdstudio.mjs`(21, PC+390, 중지·틀린 토큰·Esc 포함, `SHOTS=dir`로 사진), `run-dev-slot` 위치 검사 갱신.
  - **아직 `addons/addons.src.json`에 안 넣음**(배포 목록) — minCore를 이 슬롯이 든 코어 버전으로 정해야 해서. 코어 릴리스·애드온 배포·버전은 사용자 지시 대기.
- **(9시 40분) 에셋 제작을 전체 화면으로(SDStudio 씬 갤러리 모양) — 봇만** — 사용자: “다른 창들처럼 플러그인 내 풀스크린, 사진(SDStudio)처럼. 가운데는 그 봇에 들어갈 캐릭터. 폴더는 한 줄에 여러 명, 복장 베리에이션·소속 정리, 겹칠 수 있게, 안에 캐릭터 카드와 생성 이미지.”
  - ‘겹친다’는 두 뜻 모두 지원: **폴더 안에 폴더**(parent) + **한 캐릭터를 여러 폴더에**(members는 참조). 폴더 지우면 하위 폴더도 지우고 캐릭터·그림은 남음.
  - 새 `engine/sdstudio/project.js`(emptyProject·normalizeProject(고리·유령 정리)·add/update/removeChar·add/update/move/removeFolder·setMember·foldersOf·view(맨 위=폴더 없는 캐릭터)·rowChars(하위 폴더까지)·pathOf·addImage(새 것 앞, 200장 상한)·removeImage·coverOf·composePrompt). 테스트 `tests/sdstudio-project.test.js`(6).
  - `data/sdstudio.js` loadProject/saveProject — pluginStorage `dusk.sdstudio.p.<chaId>`(서버형 호스트에서도 이어짐). 만든 그림은 **바로 saveAsset**으로 저장, 경로만 기록(다시 열면 ctx.assets(readImage)로 읽음). 봇에 넣을 땐 경로만 덧붙임(다시 저장 안 함). 목록에서 빼도 호스트 에셋 파일은 남음.
  - `ui/screens/sdstudio.js` openAssetStudio: `.rb-full`(에셋 관리와 같은 틀) — 머리(닫기·폴더·캐릭터 추가, 좁으면 아이콘만) / 왼쪽 `.side`(공통 프롬프트·고른 캐릭터 이름·프롬프트·폴더 칩(여러 개 켜기)·네거티브·크기·장 수·토큰·만들기) / 오른쪽(경로 칩 ‘전체 › …’ + 폴더 메뉴, 폴더 줄 = 카드 가로 한 줄, 캐릭터 카드 2:3 + 이름·장 수, 고른 캐릭터의 이미지, 고르면 아래 넣기 줄: 추가 에셋/감정 이미지·이름(비우면 캐릭터 이름)·대표 그림·목록에서 빼기). Esc = 고르기 풀기 → 닫기. 상태 `ctx.state.sdstudio[chaId]`(보던 폴더·캐릭터·장 수·자리).
  - 애드온: 모듈엔 버튼 안 그림(봇만). 예전 창(openAssetMaker) 대체.
  - e2e `run-addon-sdstudio.mjs` 29(PC 1280 + 390, 캔버스로 만든 진짜 PNG, 폴더 한 줄·안에 폴더·두 폴더·넣기·다시 열기·중지·Esc). `SHOTS=dir`로 화면 사진.
- 남은 일:
  - [ ] 애드온 목록 등록(addons.src.json, category "make"?) + minCore 결정 → 코어 릴리스 후 publish
  - [ ] 실기기(RisuBard)에서 확인 — 방금 만든 그림(blob URL)·다시 연 그림(readImage — 0단계 시험에서 응답이 늦거나 멈춤)이 보이는지
  - [ ] 다음 후보: 시드 고정·캐릭터 프롬프트(NAI char_captions)·감정별 한 번에 만들기·그림 크게 보기·이미지 월드컵·폴더로 캐릭터 끌어 넣기
  - [ ] 나머지 두 호스트 시험 결과 받기
  - [ ] 애드온 `addons/sdstudio` 1단계: 엔진 이식(`src/engine/sdstudio/` — nai 요청 본문·모델 목록·품질/UC 프리셋·시드, SDStudio jest 테스트 옮김), 전송 `data/sdstudio/`(nativeFetch→risuFetch, fflate unzip, 토큰은 getLocalPluginStorage)
  - [ ] 다음: 봇/모듈 정보로 프롬프트 초안(ai.run)·감정별 한 번에 만들기·SDStudio 프리셋/월드컵·i2i
  - [ ] CHANGELOG·안내서는 사용자에게 보이는 기능이 생길 때(슬롯만으로는 보이는 변화 없음)

## 최근 세션 (2026-11-11 20시 — v2.1.2 릴리스(main에 2.1.0 머지, 사용자 지시) / 이전 제목: 20시 — 태그 교정: 확장자 붙은 에셋 이름, 코어 수정·미릴리스)
- 제보: 정혜(에셋 이름이 `X.webp`) + 향하율 모듈에서 태그 교정 켜면 경자 이미지 안 나옴. 원인: buildAssetIndex가 이름의 확장자를 떼고 색인해 교정 결과에서 `.webp`가 빠짐. 고침: 뗀 이름으로 읽되 entry.name·byName은 실제 이름(src/engine/imgtagfix.js buildAssetIndex/indexOf). 테스트 tests/imgtagfix.test.js 끝.
- 참고: 그 전 “이미지 작게 나옴”(얼터네이트 헌터즈 V2 (2))은 사용자가 켠 다른 모듈 배경 CSS의 max-width:80px 탓으로 판명, Dusk 무관. modcompat 0.1.4 배포 완료.

## 최근 세션 (2026-11-11 18시 — modcompat 0.1.3: 감싼 태그 앞뒤 공백)
- 실기기 화면: 편집으로 넣은 테스트 태그가 작게 나옴 → 원인은 편집이라 봇 editoutput ‘에셋 커맨드 개행’(`\s*(<img=…>)\s*`→`\n\n$1\n\n`)이 안 돌아 태그들이 한 문단에 붙은 것(봇 이미지도 같이 작음, 패널이 없던 건 첫 메시지의 ※※ 표식을 지워서). 같은 일이 실제 생성에서도 감싼(soft/hard) 모듈 태그에 일어남 → `botPadding`: 같은 모양의 봇 에셋 태그를 봇 editoutput 사슬에 넣어(앞뒤 표식 \uE0F0/\uE0F1) 바뀐 앞뒤 공백을 감싼 태그에 그대로 붙임.

## 최근 세션 (2026-11-11 저녁 — 얼터네이트 헌터즈 V2 모드팩 지원, modcompat 0.1.2)
- 모드팩(.risum, 로어 792·정규식 15·에셋 4618·Lua 74KB) 분석: 자체 그리기 정규식(이름 목록 in, `{{raw::$1}}`)·화이트리스트·글노덮(@@position pt_GlobalNote) 있음 → 이미지는 기존 로직으로 keep/selfRender. 문제는 Lua에 `function onOutput`이 3번 정의돼 마지막(MD)만 살아, 앞의 700명 characterMap(나오면 "0")·MMH("1")가 안 돌아 NPC List [절약](`equal::{{getvar::이름}}::1`) 변수가 비어 있음.
- `engine/modcompatvars.js`: `luaSegments`(맨 바깥 `function X(`/`X = async(function(` 단위, 같은 이름은 마지막만 live) → 봇·모듈 Lua 제외 판단은 live 코드만 / `foundHints`(죽은 정의 포함, 그 정의의 `isFound and "X"` → 인물별 found) / `luaKeywords`(`{ id=…, keywords={…} }`) → managed 항목에 found·키워드. varUpdates는 항목 found가 있으면 그것 우선. 실제 모드팩+더 많은 헌터들: 관리 503명(모드팩 443명 found 0, 4명 found 1).

## 최근 세션 (2026-11-11 1시 — 모듈 탭 전환·채팅 없이 설정·그룹 지원, manage 0.1.2·modcompat 0.1.1 배포)
- 사용자: 모듈 탭 위에 크게 ‘모듈 / 모듈 병합’ 선택(애드온 둘만 수정) + 채팅 안 들어가도 설정 + 그룹 채팅도 되게.
- manage `addons/manage/index.js` `renderModulesTab`: 위에 segmented(📦 모듈 / 🧩 모듈 병합, `ctx.state.modView`), 아래 칸(`.rb-modsw-body`)에 모듈 목록은 `Object.create(ctx)`로 main만 바꿔 core `renderModules` 그대로 / 모듈 병합은 `ext.get("svc","modcompat").render(el)`, 없으면 받기 안내. 코어 변경 없음.
- modcompat: svc "modcompat" 등록(onCleanup으로 해제). `data/modcompat.js` `listBots`(core `loadCharacters`, 1분 캐시) · `diagnose({ci})`(채팅 없이 고른 봇, chi -1이면 채팅 모듈 없이) · 그룹 `groupSide`(멤버 카드의 에셋·customscript·globalLore·defaultVariables 합침, 그룹은 봇 Lua 없음) — 훅에서는 봇 목록을 기다리지 않고(wait:false) 뒤에서 읽은 뒤 ctx.at=-Infinity로 다시 만들게. 화면: ‘설정할 봇’ select(지금 연 채팅 표시, 마지막 고른 봇 `lastBot` 저장), 그룹·채팅 없이 보는 중 안내.
- 시험 39(그룹·채팅 없이 3개 추가), e2e run-modcompat(전환·그룹·애드온 없을 때 포함).

## 최근 세션 (2026-11-11 0시 — v2.1.0 릴리스 + 애드온 배포, 사용자 지시)
- 모드 매니저(risu-mod-manager, 노예였던것님, GPL-3.0) 스페셜 땡스: 도구 탭 THANKS(15개, run-work e2e 15로), README Special thanks, 안내서 addons.html 모듈 호환 절. 코드는 가져오지 않아 about PARTS·NOTICE에는 넣지 않음.
- CHANGELOG ‘다음 버전’을 v2.1.0(2026-11-11)으로 합침, main HandOff/README 작업 브랜치 표를 2.1.0으로(참고: 이 두 파일과 dusk_atelier.js는 00:18에 이 작업 폴더에서 이미 같은 내용으로 바뀌어 있었음 — 다른 세션으로 보임, 그대로 씀).
- main을 2.1.0으로 빨리감기 병합, `v2.1.0` 태그 → release.yml이 릴리스. 이어서 publish-addons(modcompat 0.1.0 새로 포함).

## 최근 세션 (2026-11-10 밤 3 — 모듈 호환 애드온 modcompat 0.1.0, 미배포)
- 사용자 목표: 폐쇄형 봇(이름 화이트리스트·{{assetlist}} 확인·이미지 정규식 없음 등)에 확장 모듈을 켜도 **모듈 에셋이 원본 봇 이미지처럼 나오고 완벽히 적용**. Lua는 어쩔 수 없음. 모드 매니저 zip은 참고만(파일 사전 병합이라 방식이 다름).
- 리스 소스 확인(업스트림 RisuAI): 플러그인 훅은 CBS·정규식보다 먼저(scripts.ts processScriptFull) / `{{raw::}}`·`{{img::}}`·`<img src="이름">`은 모듈 에셋도 찾음(parser.svelte.ts·ChatBody.svelte) / `{{assetlist}}`는 봇 에셋만(cbs.ts) / Lua 트리거는 모드별 엔진 하나에 코드가 다르면 새로 만들어 각자 실행 → 이름 충돌 없음, 대신 느려짐(scriptings.ts). RisuBard 저장소는 이 세션 접근 목록에 없어 업스트림으로 확인.
- 구조(봇을 가정하지 않음): `engine/modcompat.js` — 그리기 정규식(editdisplay·out에 에셋 CBS·$참조)의 in을 이 봇의 태그 모양으로 학습 + 기본 모양 → output 훅이 모듈 에셋 태그만 봇 editoutput 사슬을 흉내 내 지워지면 감쌈(WJ 한 글자 → 그래도 지워지면 b64 표식) → process 훅이 되돌림(봇 요청 정규식이 자기 태그처럼 처리) → display 훅이 되돌린 뒤 planRender: keep(봇 정규식이 그대로 그림) / inline(봇 out이 {{assetlist}}를 보거나 이름 규칙(.png 붙이기 등)이 안 맞으면 같은 out을 모듈 이름으로 대신 적용, `<img x-dusk-mc`로 재매치 막음) / 봇과 다른 모양이면 봇 모양으로 바꿔 다시 판단 / 최후 `{{img::이름}}`. 이름 오타는 같은 인물의 가까운 표정(default 우선)으로.
- `engine/modcompatprompt.js` — 요청 글에서 봇의 실제 태그 예시를 찾아 `{name}` 틀(없으면 정규식에서 합성), 인물·표정 묶기(groupSubjects: 여러 인물에 반복되는 꼬리=표정), 스스로 그리는 모듈은 제외, 최근 나온 인물 먼저, 3500자 상한. beforeRequest(model만)로 `[Dusk · module images]` 블록 하나.
- `data/modcompat.js` — 문맥 캐시(0.8초 안엔 호스트에 안 물음, 봇 카드 60초), 봇별 설정(on·guard·display·prompt·promptOff) `dusk.addon.data.modcompat.settings`, 진단(모듈별 처리·겹치는 정규식/로어북/Lua), ‘이 채팅의 지킴 표식 풀기’. 화면 `ui/screens/modcompat.js`(SDK addPage). 애드온 `addons/modcompat`(manage, hooks, minCore 2.1.0 — SDK addPage가 2.1.0부터). 코어 변경 없음(dusk_atelier.js 동일함, 공유 코어 모듈 0개).
- 시험: `tests/modcompat.test.js`(27, 고정 데이터 `tests/fixtures/modcompat.js` = 헌터물 화이트리스트형·대학 assetlist형·정규식 없는 봇 + 확장 모듈·자체 렌더 모듈 구조만 줄임), e2e `tests/e2e/run-modcompat.mjs`(24, PC·모바일, 훅 포함; app.entry에 opts.modcompat). 실제 업로드한 세 봇·두 모듈로도 스크래치 확인(한 응답 처리 1~3ms). 참고: 올려 준 헌터물 정규식의 화이트리스트(에셋 찐빠 수정6)는 JS에서 잘못된 정규식이라 원래 꺼져 있음.
- 확인: npm test 1375 pass / 1 fail(pot-port, 원래부터), build·check 동일함, build-addons --check 동일함, run-modcompat 24/24, run-smoke·run-addons-ui(46) 통과. 실기기·실제 모델 미확인.
- 이어서(11-11 0시, 사용자 "버그 싹 체크하며 끝까지", 감지 변수 기본=자동·못 읽으면 헌터 방식, 겹침은 진단만):
  - 인물 감지 변수 `engine/modcompatvars.js`: 모듈 로어북의 `{{getvar::이름}}` 중 모듈 인물(로어북 키·이름표·이미지 주제)이고 봇·모듈 Lua·봇 기본 변수·봇 로어북이 다루지 않는 것만(`managedNames`). 값 규칙은 채팅 scriptstate의 봇 인물 0/1과 최근 대화를 맞춰 읽음(`inferFoundValue`, 3개 이상·2배 차이일 때만), 못 읽으면 "0". **입력(onInput) 끝에만** `{{setvar::이름::값}}`(바뀐 것만) → runVar 패스 1이 프롬프트 빌드 전에 실행·소거. 응답 훅에 붙이지 않는 이유: 리스가 스트리밍 조각마다 editoutput 훅을 부르고 그 글을 그대로 그려 setvar가 글자로 보임(index.svelte.ts 1657). 막 보낸 입력이 runVar 전에 그려질 때를 위해 display 훅이 우리 setvar만 지움. 빈 입력엔 안 붙임. 설정 vars auto/found0/found1/off, varWindow 9.
  - 고친 버그: ① planRender가 태그를 남겨 두는 표시 정규식(감싸기 등)을 '지우는 것'으로 보고 대신 적용하던 것 → 지나침 ② inline 결과를 아무 표시 정규식이나 다시 잡으면 기본 그리기로 떨어지던 것 → 그리기 정규식만 검사 ③ 요청마다 문맥을 다시 만들던 것 → 3초 ④ 오래된 문맥 때 output/display 훅이 봇·모듈을 다시 읽느라 기다리던 것 → 같은 채팅이면 지금 것 쓰고 뒤에서 새로 읽음 ⑤ 태그 예시를 다른 모듈 글에서 먼저 집던 것 → 봇 에셋 예시 → 봇 그리기 모양 → 모듈 모양 순(청원대처럼 봇 그리기 정규식이 봇에 딸린 모듈 안에 있어도) ⑥ 합성 틀이 특정 이름만 받는 모듈 모양을 고르던 것 ⑦ 소스에 눈에 안 보이는 글자가 그대로 들어가 있던 것 → \u 이스케이프.
  - 확인한 리스 사실: `{{#each}}`는 JSON 배열·공백 있는 이름 가능(parser parseArray·lastIndexOf(' ')), afterRequest는 스트리밍이면 안 불림(request.ts 285), v3 addRisuScriptHandler는 'edit'+mode로 연결.
  - 시험 36개(감지 변수·스트리밍 표시·비동기 새로 읽기 포함), e2e run-modcompat 28.
- 남은 일: [ ] 세 호스트 실기기에서 input/output/display/process 훅 순서·성능(긴 채팅 열기) 확인 [ ] 코어 이미지 태그 자동 교정(imgtagfix)과 함께 켰을 때 실기기 확인(코드상 충돌 없음: 감싼 태그는 교정 대상이 아님) [ ] 감지 변수: 이어 쓰기·리롤(입력 없음) 땐 갱신 안 됨 — 필요하면 다음 단계 [ ] 모듈끼리 같은 정규식·로어북은 진단만(사용자 결정) [ ] 배포(publish-addons)는 사용자 지시 대기, 2.1.0 코어 릴리스 필요.

## 최근 세션 (2026-11-10 밤 2 — 애드온 상자 홈 이동·카테고리·커스텀 애드온)
- 홈 `ui/screens/addonsui.js` `addonBox`(hmain, 바로가기 아래). 설정 탭 `addonCard`는 '홈에서 보기' 안내만. 카테고리 `engine/addons.js` ADDON_CATS·categoryOf(목록 category → 없으면 id 표)·groupByCategory, addons.src.json에 category(코드 dist는 그대로).
- 커스텀 애드온: `data/addons.js` inspectCustom·importCustom·setCustomOn·removeCustom·exportCustom·bootCustom(공식 다음), 키 `dusk.addon.custom.index`/`dusk.addon.custom.code.<id>`, 실행 표 "custom:<id>".
- SDK `data/addonsdk.js`: 모든 애드온 ctx.dusk(ui·storage·ai.run(=runAI, 생성 중지)·addPage·toast·lib·ext), 끌 때 cleanup. 페이지 탭 키 `addon-<id>`/`addon-c-<id>`. **더하기만**(바꾸면 docs/addons/SKILL.md·engine/addonguide.js 함께).
- 만들기 창 `ui/screens/addonmaker.js`(요청 복사·여기서 만들기·안내서/빈 틀·붙여 넣기 불러오기, 위험 안내 확인). 기능 찾기 2항목, 홈 검색에서 홈 안으로 갈 때 검색 비움(app.go).
- 확인: npm test 1348 pass, build·check 동일함, build-addons --check 동일함, e2e run-addons-ui 46/46(PC·모바일), smoke·onboard 통과. 실기기·실제 모델로 '여기서 만들기' 미확인.
- 남은 일: [ ] 실기기에서 파일 불러오기(pickFiles)·blob import 확인(세 호스트) [ ] 코어 릴리스 필요(애드온만으로는 안 나감).

## 최근 세션 (2026-11-10 밤 — 로어북에 있는 인물만 위키에 새로, memory 0.2.6 애드온만 배포)
- 사용자: "로어북에 명시된 캐릭터가 아니면 위키에 안 떠야" → 기본 켜짐 + 애드온만 배포.
- 새 파일(애드온 전용, 코어 import 없음): `engine/castfilter.js`(loreCast·inCast·dropCreates, 순수) · `data/castlore.js`(createCastReader: 캐릭터 globalLore + 채팅 localLore + 켜진 모듈(전역·봇·채팅) lorebook + 봇 이름·desc·personality, ci:ti 60초 캐시, 기록 중 위키 봇(chaId)과 열린 봇이 다르면 null).
- 맞춤: 정규화(소문자·공백 제거·{{…}} 제거) 후 이름/별칭이 로어북 글(key·secondkey·comment·content)에 들어 있거나, 키워드(2자+)가 이름 안에 있으면 통과. 로어북 항목 0개 → 막지 않음.
- 적용: `recorder.recordTurn({cast})` — 새 인물만 거름(묻지도 않음, `rec.skipped`·summarize.skipped). `memoryturn.writerCall` — 예전 리수폿 Writer 응답(JSON)도 `dropCreates`로 새 인물 create와 그 ref를 가리키는 entries·metric/people ops·issues 제거(`lastSkipped`). 설정 `settings.loreOnly`(기본 undefined=켜짐), 캐시 열쇠에 포함. UI: 고급 → 분석 스위치 + 최근 기록 결과에 ‘로어북에 없어 새로 만들지 않음’.
- 안 막는 길: Dusk 자체 ‘지난 대화 분석’(코어 memoryprompt) — 다음 코어 때 검토. 기능 찾기 목록(코어 featurefind)에 항목 미추가.
- 이어서(20시): **‘로어북에 없는 인물 지우기’**(memory 0.2.7, 사용자 "올려" 후 publish 완료). `castfilter.strangers(docs, cast, isUser)` · `castlore.castOfCard/modulesOf`(createCastReader도 이걸 씀). UI `ui/screens/memory/wikiview.js` 인물 문서 머리 줄 버튼(위키 있음·편집 가능일 때) → 누를 때 getCharacterFromIndex(env.bot.index)+env.chatItem 채팅으로 판단 → 체크 목록(기본 전부 체크) → `removePerson`(고정핀 있으면 건너뜀·안내) + 같은 인물 `folder.people[k]`(keyOfDoc) 삭제. 로어북 빈 봇은 토스트로 안내. e2e `tests/e2e/run-wiki-strangers.mjs`(12, PC·모바일; app.entry에 `window.__testLib` 추가). npm test 1335, run-wiki-recorder 60/60.
- 확인: npm test 1334 pass/0 fail, build·check 동일함(v2.1.0, 코어 변경 없음), build-addons --check 동일함, 공유 모듈 56개 export가 2.0.7(79a0578)에 모두 있음, e2e run-recorder-ui 12/12. 실기기 미확인.

## 최근 세션 (2026-11-10 저녁 — 2.1.0: 페르소나 빌더 SOP 3단계 + 페르소나 공방 기능)
- 사용자 요청: AI로 페르소나 만들기를 사용자 SOP 시트(첨부 txt) 기준으로 바꾸고, 지침을 초안(시트 머리글)·검토 보고서(OOC 감사)·최종(OOC 다시 쓰기) 3개로. 페르소나 공방(canister2668/Risu-persona-forge 1.0.0)에만 있는 기능은 가져오기.
- **새 파일 `src/data/personasop.js`(애드온 전용, 코어가 import하지 않음 → 코어 2.0.7에서도 aibuild 켜짐, 공유 export 12개 모듈 main 대조 확인)**: SOP_TEMPLATE(75칸, [한글] 이름), SOP_DRAFT/REVIEW/FINAL(사용자 문구 그대로), `stepPrompt`(프리셋 `sopDraft/sopReview/sopFinal`, 비면 기본), `ensureSop`(sop 양식 추가, 처음 한 번 `pb.sopV1` — 쓰던 값 없으면 sop 선택), `readSheet`(들여 쓴 하위 목록을 ` | `로 접어 코어 readValues), `buildStepPrompt`(draft·fill·edit 모두 1단계 지침 기준), `buildReviewPrompt`/`buildFinalPrompt`(사용자 OOC 흐름 그대로: 요청→시트(assistant)→검토 OOC→보고서(assistant)→최종 OOC+고른 항목+메모), `parseReport`(## 분류·**분류:**·줄 안 분류·번호·하위 목록), NAI 태그(`naiTagPrompt`/`cleanTags`), `estimateTokens`, `lineDiff`, 공유 코드 `DPA2`(단계 지침 포함, DPA1·DPB1은 코어 readCode).
- 화면 `ui/screens/personabuilder.js`: 단계 버튼 ‘1 초안 쓰기 › 2 검토 보고서 › 3 최종 다듬기’, 검토 패널(분류별 체크·모두 적용/해제·원문/번역 접기·메모·‘고른 항목으로 최종 다듬기’, 시트 바뀌면 경고), 최종 적용 = 켜진 섹션 칸 전부 교체(30% 미만으로 줄면 확인), ‘바뀐 점 보기’(diff 모달), 미리보기 토큰 추정, NAI 캐릭터 태그 접기, 백업 ‘지금 내용과 비교’, ··· 안 ‘빈 칸만 채우기’·‘전부 비우기’, AI 프리셋 편집 ‘단계별 지침’(기본값으로). sop 양식 ‘처음 상태로’ 처리. draft에 `review`·`naiTags` 저장.
- 가져오지 않은 공방 기능: 기본 이미지 템플릿 80장(남의 그림·저장소 호스팅), 보관함 판 관리·파일 백업, 봇 기본 페르소나·설명 주입 자동 갱신(페르소나 연결과 겹침 — 사용자 확인 필요), 업데이트 서버.
- aibuild 애드온 0.1.1 → 0.1.2(build-addons). 저녁에 권한을 받아 push·publish-addons 함.
- 확인: npm test 1318 pass / 1 fail(pot-port, 원래부터), build·check 동일함(코어 변경 없음), build-addons --check 동일함, e2e `run-persona-sop.mjs` 36(PC 1280·모바일 390), `run-addon-aibuild.mjs`·`run-smoke.mjs` 통과. 실제 모델·실기기 미확인.
- 이어서(같은 날 18시~): 사용자가 권한을 주고 **공방 UI를 우리 식으로 쓰라**고 함 + 크레딧 = 페르소나 공방·SOP Lite. 화면 재구성: `.rb-pb-cols`(PC 2단, 오른쪽 `.rb-pb-sidec` sticky) — 기본 정보 카드(`.rb-pb-idc`, 이름·편집할 페르소나·양식·상태 배지·백업 보기) → ‘설명으로 AI 전체 생성’ 접는 카드(`.rb-pb-fcard`, 안은 예전 AI 상자) → ‘페르소나 만들기’ 머리 → 섹션 번호 탭(`.rb-pb-tabs`, ✓=채움, 마지막 미리보기·＋폴더, 모바일 가로 스크롤) → 한 섹션 카드 + 요청 막대(`.rb-pb-gen`: 요청대로 고치기=edit+요청, 이 섹션 새로 쓰기) + 이전/다음 → 아래 sticky 저장 막대(`.rb-pb-foot`, AI 대화 버튼을 떠 있는 버튼 대신 여기로). 오른쪽 시트 미리보기 카드(`.rb-pb-sheetc`)는 미리보기 탭에서 숨김. 지금 탭은 `pb.uiStep`. 공방의 칩 템플릿·생성 길이·보관함·원본·채팅 적용·이미지는 우리에게 없는 기능이라 뺌.
- 크레딧: 도구 탭 THANKS(14개, run-work e2e 14로), about PARTS, README Special thanks, 빌더 화면 아래 줄.
- 이어서(19시~): 공방의 **봇 기본 페르소나**·**파일 백업** 추가(aibuild 0.1.3, `hooks: true`). `src/data/personabotdef.js`(저장 키 `dusk.personaBotDefaults` = {chaId:{pid,bot}}; `createBotDefaults(api)` — 정해 둔 봇이 있을 때만 beforeRequest 훅, type model만, chat.bindedPersona 있으면 안 넣음, pid가 전역 선택 페르소나면 안 넣음, 설명은 요청마다 getDatabase personas에서 읽음=자동 갱신, 봇 정보는 ci 바뀔 때만 getCharacterFromIndex; MARK 블록을 첫 memo 메시지 앞에). 애드온 index.js가 만들어 svc.botDefaults로 노출, deactivate에서 훅 제거. `src/data/personafile.js`(형식 `dusk.personabuilder.backup` v1: personas·images(b64)·templates·ais·backups·botDefaults; `planImport` 같으면 건너뜀/같은 id 다른 내용은 '(가져옴)' 사본·봇 기본 pid도 사본 id로; builtin 양식 충돌은 사본; draft는 안 건드림). 화면: 오른쪽 ‘현재 채팅’ 카드(`.rb-pb-cs`), 기본 정보 카드 ‘백업 ▾’ 메뉴(덮어쓰기 전 백업 보기·파일로 백업·파일에서 가져오기). 공방의 ‘채팅별 설명 주입’은 넣지 않음(요청 없음).
- 이어서(19시 40분~): 사용자가 SOP 원문 txt를 다시 주며 "기본 규칙은 이거, 맞춰 정리, 버튼도 이 내용 중심". → `SOP_RAW`(원문 글자 그대로, tests/fixtures/sop-sheet.txt와 같음)에서 `SOP_DRAFT`(Instruction~첫 ###)·`SOP_TEMPLATE`(### 섹션 [SOP_KO]·* 항목 [SOP_KO]: 원문 힌트)를 만든다. 섹션 이름 원문대로 'Optional: Key Relationship'·'Optional Module: Sexuality'. `ensureSop` sopV2: 내장 SOP 양식이 예전 글(해시 75873812)이면 새 글로, 이름 'SOP 기본 규칙', 맨 앞, 예전 default는 '예전 기본 양식', draft values·off·ko의 섹션 이름 옮김. `SOP_RULES`(fill·mechanize·scene·omit = 1단계 지침 문단 그대로) + `dropPlaceholders`. 화면: 섹션 요청 막대·AI 카드에 규칙 칩(`.rb-pb-rules`), '규칙 원문' 창, ··· 의 '빈 칸만 채우기'는 '빠짐없이 채우기' 칩으로 대체. aibuild 0.1.4.
- 이어서(20시~): **AI 생성 중지 버튼(코어)** — `engine/aistop.js`(활성 호출 세기·`stopAll`·`trackedRunLLM`·중지 뒤 2초 재호출 막기), `engine/runai.js`가 모든 호출을 `trackAi`로 감쌈, `main.js`가 `wrapped.runLLMModel`을 감쌈(리수폿·Erosync·봇빌더 직접 호출도 잡힘), `ui/aistopbtn.js`(0.4초 뒤 표시, Dusk 창 열림=창 안 fixed 오른쪽 아래 `.rb-ai-stop`, 닫힘=리스 화면 mainDom 버튼 `x-dusk-ai-stop`, 1.5초마다 자리 확인). 상시 규칙은 HandOff/README 6절. **코어 변경이라 2.1.0 코어 릴리스 때 사용자에게 감.** 테스트 tests/aistop.test.js, e2e run-persona-sop 끝.
- 남은 일: [ ] 실제 모델로 초안·보고서 형식(분류 머리글) 확인 [ ] 봇 기본 페르소나·생성 중지(리스 화면 쪽) 세 호스트 실기기 확인 [ ] 중지 뒤 각 기능의 실패 알림이 과하지 않은지(isStopError로 거르기) 기능별 점검

## 최근 세션 (2026-11-10 오후 — 3.0.8: 기능 접근성·채팅 속도·Erosync 인물 고르기·자동 기록 잠김)
- 사용자 제보: "켠 것처럼 보이는데 안 돈다"(월경·임신 기록은 고급 모드 안 ‘관계만 기록할 때 인지·정체 인식’이 ‘켬’이어야 동작) + 기능이 어디 있는지 못 찾음 + 채팅 느려짐 + Erosync 인물 선택 분석 + 장기기억 꼬이면 번호를 손으로 고쳐야 갱신됨.
- **설정 선행 조건 자동 맞춤**: `engine/settingdeps.js`(DEPS 표: cycle→sexualDesireEnabled, cycle+relOnly→relationshipPerceptionMode "on"; `healDeps`·`depState`·`lockedBy`). 쓰는 곳: `ui/screens/memory/flowsettings.js`(모든 저장에 healDeps + 토스트 ‘필요한 설정을 함께 켰어요’, 성인 항목 아래 `cycleNote` 동작 중/아직 동작하지 않아요+‘함께 켜기’), `advanced.js`(인지·정체 segmented 잠김 안내 `#rb-mem-perc-lock`), `data/memoryturn.js` apply에서 healDeps(화면 안 거친 예전 설정도 시작 때 맞춤). 새 선행 조건은 DEPS에 한 줄.
- **서사관계 전용 모드 강제 1회만**: memoryturn이 시작마다 `forceRelationshipOnlyMode()` 하던 것을 `idx.pot.relOnlyDefaultV1`로 처음 한 번만(고급에서 끈 값이 새로고침마다 되돌아가던 문제).
- **기능 찾기**(코어): `engine/featurefind.js`(FEATURES 표: 이름·다른 말·위치·tab/sub/mem/find/adv/addon, `findFeatures`) + `ui/screens/featurefind.js`(홈 검색창 `SEARCH.home`, 결과 목록 → `openFeature`: ctx.state.mem 세팅 후 go, 제목 글 찾아 스크롤·`.rb-found` 강조, 고급 전용이면 안내) · `home.js`가 검색어 있으면 대신 그림. 화면 제목이 바뀌면 FEATURES의 find·path도 고칠 것(tests/featurefind.test.js).
- **Erosync 인물 골라서 분석**: 본체 `src/erosync/erosync.js`에 `duskLoreList`/`duskLoreSelect`(원본 ‘인물 로어북 분석’ selectedLore 흐름 재사용, profiles.lore·start("lore", ids)) → `data/erosync.js` op "lore"(예전 본체면 이유 반환) → `ui/screens/memory/erosyncpick.js`(체크 목록 창, 검색·모두/해제·‘분석됨’) → `erosyncpage.js` 버튼. 메모리 애드온(화면)과 Erosync 애드온(본체) 양쪽 배포 필요.
- **리수폿 자동 기록 ‘정리된 범위’ 영구 잠김**(= "번호 손으로 고쳐야" 제보로 판단): 채팅이 짧아져(삭제·되감기) 새 턴 messageIndex ≤ `automation.prunedThrough`면 모든 새 턴이 '이전 자동 기록이 정리된 범위'. `tools/pot-patches.json` 패치 3개: wiki-retention `automaticRecordExpired`에 `latestAssistantIndex` 옵션(꼬리=지금 채팅 마지막 AI 응답이면 막지 않음) + `latestAssistantIndex(chat)` export, auto-wiki 호출부에 전달. 시험 `tests/wiki-retention-tail.test.js`. 재생성: `git fetch --depth 1 origin ref/risupot` 후 `node tools/pot-split.mjs`.
- **채팅 속도**: `engine/lorelog.js` `squashedOf`(글→눌린 열쇠 8개 메모, export 안 함 — 애드온이 코어 export 이름을 검사해 2.0.7에서 안 켜질까 봐), headKey/tailKey/matchRecord가 공유 → 조각마다 4~5번·메시지마다 3번 걷던 것 1번. `data/memoryrunner.js` schedule이 조각마다 `store.getIndex()`(인덱스 전체 파싱) 하던 것 3초 캐시. 실기기 체감은 미측정. 큰 지연(응답 시작 전 Router·Director 호출)은 설계상 ‘빠르게’ 모드로만 줄어듦 — 안 바꿈.
- 배포: memory 0.2.5·erosync 0.1.2 build → `publish-addons`(아래 결과 참고). 코어(기능 찾기·lorelog 메모)는 릴리스 안 함(사용자 지시 대기). 공유 모듈 56개가 2.0.7에 모두 있고 새 export 요구 없음(스크립트로 확인).
- 확인: npm test 1304 pass / 1 fail(`tests/pot-port.test.js` — ref/risupot 받으면 원래부터 실패, customPromptPlain 원본 없음) / 9 skip, build·check 동일함, build-addons --check 동일함, run-smoke 통과. 안내서 memory.html(설정 자동 맞춤·정리된 범위·인물 골라서 분석)·start.html(기능 찾기) 수정. 실기기(RisuAI·RisuBard·PocketRisu) 미확인.
- 남은 일: [ ] 실기기에서 ‘함께 켜기’·기능 찾기·인물 골라서 분석 확인. [ ] 느려짐 원인을 실제 측정(어느 훅이 얼마나 걸리는지) — 필요하면 `tests/e2e`에 측정 스크립트. [ ] 다른 "켰는데 안 도는" 조합이 더 있으면 DEPS에 추가(제보 수집).

## 최근 세션 (2026-11-10 — 3.0.8: 리수폿/장기기억 자동 기록 실패율 급증)
- 증상(사용자): 2.0.0 이후 실패가 30회 중 2~4 → 3회 중 1~2. 추론 20k~30k 토큰을 쓰고도 기억이 안 생김(검열 아님).
- 원인: `data/pot/llm-client.js` callWriterModel은 모든 호출(Claude·OpenAI호환·리스 보조모델)에 시스템 "Return one JSON object only"를 붙이고, DeepSeek 생각 끔이면 response_format json_object까지 강제. 2.0.0 기록기(`engine/recorder.js`)는 'LINES ONLY'를 요구 → ① 지시 충돌로 추론 과다·빈 응답 ② JSON으로 낸 '변화 없음'(`{"lines":[]}`)을 형식 오류로 보고 인물마다 3번씩 재질문 ③ 빈 응답은 반환이 아니라 예외(empty-model-response)라 ask()의 재시도를 건너뛰고 1단계 한 번 빈 답에 기록 전체 실패 → 리수폿이 실패 처리, 대신 길 없음.
- 수정: `recorder.js` `recorderText`(맨 끝에 `RECORDER_OUTPUT` — 출력은 JSON {"lines":[…]}, 없으면 {"lines":[]})를 기록기·정리 노트 방향 호출에 사용(`memoryturn.js`). `ask()`가 empty-model-response를 빈 답으로 받아 다시 묻고, 인물 단계는 최대 2번(`tries`). `memorylines.isNoneReply`가 `{"lines":[]}`·`["none"]`·`[]`도 '변화 없음'으로. `attemptDuskRecord`: 기록기가 끝내 실패하면 null → 예전 리수폿 Writer 한 번 호출로 대신(취소 model-aborted는 그대로 던짐), `lastRecord.fallback="risupot"`. "Director Dusk" 응답은 cleanJsonReply 거치지 않음.
- 시험: `tests/recorder-json-transport.test.js`(12). npm test 1287 pass/9 skip/0 fail, build·check 동일함, build-addons --check 동일함.
- 2차(같은 날, 사용자 "약한 모델~강한 모델 전체 검토"): 장기기억·리수폿·Erosync 호출 구조 전수 검토 후 추가 수정.
  - 같은 실패 반복: auto-wiki 자동 재시도(json-contract·target-ref 2회)와 토스트 '다시 시도'가 `recDone` 캐시의 같은 envelope을 다시 받아 결정적으로 재실패 → `memoryturn.js` auto.subscribe에서 failed면 그 열쇠를 `potNext`에 넣어 다음 시도는 예전 리수폿 Writer로, 토스트 재시도는 recDone·recCache 비움.
  - '수치 상태가 비어 있는 인물' 토스트 반복: `buildEnvelope`이 like 줄이 있을 때만 affinity.score init → like 없어도 init(0). `judgeAutoResult({names})`는 이번에 기록한 인물만 봄(`summarize().names`).
  - 내 API 경로(`modelcfg.toPrompt`): 'LINES ONLY' 프롬프트(분석 1·2단계, 게이지)에 `LINES_AS_JSON` 덧붙임. `memoryprompt.askLines`도 empty-model-response를 빈 답으로 받아 다시 물음. 기록기는 빈 응답 뒤 maxTokens를 넓혀(2배, 16k~32k) 보냄.
  - 검토만 하고 안 고친 것: ① 대신 길인 리수폿 Writer는 여전히 11만 자 지침(약한 모델은 여기서도 실패 가능) ② 2단계 지침은 전체 기능 켜면 줄 종류 20여 개·3.4천 자 — 약한 모델은 '가벼운 모델' 토글(light, 1.6천 자) 권장, 자동 판별 없음 ③ 응답당 호출 수 = 1 + 인물 수(최대 6) + 방향 1 + 고르기 1 — 추론 모델은 기록 단계 추론 강도를 낮추길 권장 ④ Erosync는 격리 이식(수정 금지): 자체 JSON 복구 1회 있음, 재시도 횟수 기본 0 ⑤ 인물 도구(수치 AI·직접 지시·새로고침)는 리수폿 JSON 프롬프트 그대로 + cleanJsonReply.
- 3차(가벼운 지침 자동 전환, 사용자 승인): `recorder.recordTurn`·`memoryprompt.analyzeLines` — 2단계가 형식 오류(code recorder-format / e.raw)로 끝나면 그 인물을 light 지침으로 다시 묻고 그 응답의 남은 인물도 light. 기록기는 `auto`(memoryturn의 `autoLight`, 메모리 상태·저장 안 함): 연속 2응답 전환 → 다음 10응답 처음부터 light → 끝나면 전체 지침 재시험(streak 1). 연결 오류·취소는 전환하지 않음. `summarize().lightAuto` → 설정 '최근 기록 결과'에 표시(settings.js recordBox). 시험 3개 추가. 안내서 guide는 미수정.
- 배포(11-10, 사용자 "코어는 배포하지 말고 애드온만"): **memory 애드온 0.2.4만 publish**(minCore 2.0.0, 코어 2.0.7 그대로·태그 없음·main 안 건드림). 애드온은 코어 공유 모듈의 export 이름을 전부 검사해 없으면 안 켜지므로 modelcfg `LINES_AS_JSON`은 export하지 않음(recorder.js에 같은 글 `RECORDER_OUTPUT`, JSON 꼴 '변화 없음'은 recorder.js 자체 `isNoneReply`). 확인: 애드온이 쓰는 공유 모듈 56개의 export가 2.0.7(79a0578)에 모두 있음.
  - 애드온으로 나간 것: 리수폿 기록기 경로 전부(JSON 형식 맞춤·빈 답 다시 묻기·호출 상한·리수폿 대신 길·실패 캐시 재사용 막기·호감도 init·알림 판단·가벼운 지침 자동 전환·설정 표시).
  - **코어에만 있어 아직 안 나간 것**(다음 코어 릴리스 때): `memorylines.isNoneReply` JSON 꼴, `memoryprompt.askLines` 빈 답 다시 묻기·Dusk 분석 가벼운 지침 전환, `modelcfg.toPrompt` 줄 지침 JSON 맞춤(내 API로 돌리는 Dusk 자체 분석·게이지). CHANGELOG '다음 버전'에 적어 둠.
- 남은 일: [ ] 실기기(실제 추론 모델)로 실패율 확인 — 개선 단정 금지. [ ] UI freeze(‘리수폿 설정 열기’ 빠른 조작) 미진행. [ ] main HandOff/README.md 작업 브랜치 표를 3.0.8로 고칠지 사용자 확인.

## 최근 세션 (2026-11-09 — v2.0.7 버전 정리)
- v2.0.7: `package.json` 버전 및 CHANGELOG 정식 항목으로 정리. 포함 버그 수정은 장기기억/관계도 게이지 fallback(원문 유지) 1건.
- 버그 2번의 미검증 초안은 main에 포함하지 않음. 계속 `feat/2.0.7`에서 별도 분석.
- 빌드 결과물 `dusk_atelier.js` 재생성 및 `npm test`/`npm run build`/`npm run check` 검증은 로컬 저장소 필요.

## 최근 세션 (2026-11-09 — feat/2.0.7 시작: 장기기억/관계도 버그 3건 조사·수정)
- 완료(1): `src/main.js` 로어북 로그의 `above` fallback을 `?? ""`에서 `?? t`로 수정. 장기기억 게이지/서비스가 없거나 결과를 반환하지 않을 때 원문 메시지를 유지해요. CHANGELOG에 기록.
- 미진행(2): 리수폿/장기기억 기록 방식 변경 후 자동 기록 실패율 상승(기존 30회 중 2~4회 → 최근 3회 중 1~2회). 실패 분류·로그/호출 흐름과 재시도/중복 방지 확인, 기존 기록 방식 비교.
- 미진행(3): 장기기억 → 기억 방식 → 고급 → 세부 설정 → ‘리수폿 설정 열기’에서 빠른 조작 시 UI freeze. 탭 전환·렌더 경쟁/동시 호스트 호출 확인. 수정 전 재현 테스트 작성.
- 작업 원칙: 실패율은 실제 모델·호스트별 실기기 결과가 없으면 개선 확인으로 단정하지 않는다. RisuAI·RisuBard·PocketRisu 호환 확인.

## 최근 세션 (2026-11-07 — 새 챗은 여기부터, 아래 로드맵도 함께)
- (11-08) 웹리스: nativeFetch/risuFetch가 주소와 무관하게 같은 응답(직전 것)을 줌(시험 플러그인 dusk_fetch_test.js로 확인). 해결: publish-addons가 dist/<id>.<sha12>.mjs(export default 문자열)와 addons.json.mjs를 jsDelivr용으로 함께 올리고, src/data/addons.js가 확인값 불일치/목록 이상 시 import()로 받아 같은 sha256 확인(moduleUrls·importModuleText). 지난 .mjs는 남겨 둠. 실기기 확인 전. 애드온 브랜치는 '배포해' 때 새 형식으로 다시 올려야 함.
- (11-08) 애드온 '파일 확인값이 목록과 달라요': 발행된 addons 브랜치는 sha 전부 일치 확인 → 원인은 raw 캐시가 목록/파일을 서로 다른 시점으로 줌. src/data/addons.js install()이 확인값 오류면 loadManifest(true)(커밋 고정)로 한 번 재시도. 본체 수정이라 릴리스 필요(미실시, 지시 대기).
- **v2.0.0 릴리스(11-08 20시, 사용자 지시)**: 안내서에 guide/addons.html·guide/stealth.html 새로, 메뉴(site.js NAV·widgets.js PAGES)에 애드온·스텔스·프로바이더·위젯 홈, 장기 기억 ‘기록 방식’ 절, 위젯 홈 자동 열기·프로바이더 한계 갱신, FAQ 2개. 모든 애드온 minCore 2.0.0. CHANGELOG ‘다음 버전’을 v2.0.0(2026-11-08)으로 합침. main은 11-06 롤백(0b410b7)을 되돌린 뒤 feat/2.0.0 병합, `v2.0.0` 태그. 아카 글 docs/arca/v2.0.0.html.
- 작업 브랜치 `feat/2.0.0`(예전 `feat/stealth`를 빨리감기로 합침, stealth 브랜치는 남아 있음). main은 v1.9.2 그대로. 작업 전 `HandOff/QUALITY.md`(검토 지침·박스 여백·호스트 제약) 필독.
- **장기기억 프롬프트·기록 개편(11-08, 사용자 요청 "모델 상관없이 잘 정리")**: 원인 ① 리수폿 Writer 지침이 빈 위키에서도 ~11.7만 자(규칙 20여 묶음 같은 무게)+복잡한 JSON → 누락·우선순위 흐림 ② 기본 프롬프트 '뒤'(장면 작성 점검표)가 memory·router·director·writer 단계 맨 끝에 붙음 ③ 사망 등 상태가 일반 기록과 섞여 주입에 우선순위 없음 ④ 합친 기록 경로에선 게이지를 아예 안 물음(gx=null).
  - `engine/recorder.js`(새): `parseWriterRun`(리수폿 프롬프트의 REFERENCE DATA·Text Control Manifest JSON만 꺼냄) → `recordTurn`(1단계 LINES_STAGE1 + 인물별 linesStage2(wiki:true), 같은 응답 1단계는 캐시) → `buildEnvelope`(리수폿 envelope: relationship·current_appraisal·appraisal·identity·speech·behavior·knowledge·perception.secret·npc_emotion, affinity.score init/delta(인용은 `exactQuote`로 원문 구간), 새 인물 people_ops init) + `buildDusk`(Dusk 분석 객체 → stash). 실제 executeWriterBatches 검증 통과(tests/recorder.test.js). register·suspicion·rhythm·taste_band 등은 기록기가 안 씀(기존 값 유지).
  - 연결: `data/memoryturn.js` writerCall에서 label "Writer batch"면 `recordWithDusk`(settings.recorder!=="pot", 월경 표식 있으면·해석 실패면 예전 길). 사용자 writer front/back 프롬프트는 앞뒤로. `flow.lastRecord()`.
  - `memorylines.js` 지침 전면 개편(목적→줄 종류 우선순위→짧은 규칙, `state|`·`close|`·`new|` 추가, JSON만 내는 모델용 `{"lines":[…]}` 받기, 성+이름 부분 일치). 상태 줄은 본문 인용 필수 → 인물 기록 attr status.
  - 주입(`memoryinject.js`): `stateLines`/'Current facts' 섹션(관련도 무관, 사라진 상태 먼저), 이름 옆 [상태], 제목 줄 토큰도 상한에 셈. `memorytrust.currentState/isGoneState`, knownPeople에 state.
  - 게이지: `memoryrunner` 분석 뒤 게이지 차례면 `gaugeMessages`/`parseGaugeLines` 따로 호출(합친 경로 포함). analyzeStaged는 게이지 때문에 JSON으로 바꾸지 않음.
  - 기본 프롬프트 '뒤': 새로 추가 안 함 + 손대지 않은 기존 것 끔(`idx.pot.defaultBackOffV2`).
  - 리수폿 단계 응답 `engine/jsonreply.js cleanJsonReply`(stageCall에서, 기록기 줄 응답 제외) — 인물 도구 "완성된 JSON을 읽지 못했습니다" 줄이기(사용자 제보, Erosync 자체 파서는 이미 관대함).
  - UI: 기억 설정 → 고급 → 분석 '기록 방식'(dusk/pot)·'최근 기록 결과'. e2e `run-recorder-ui.mjs`(12). memory 애드온 0.2.0. 코어 모듈(memorylines·memoryprompt·memoryinject·memorytrust·memorystore)도 바뀌어 **dusk_atelier.js도 새로 받아야 함**.
  - 2차(11-08 저녁, 사용자 "남은 부분도 다, 모든 값 안정적으로"): 기록기 `DEEP_SLOTS`/`deepMenu`(affinity.intent·stance·bind·private·approach·surface_actual, register.*, openness.context → `deep|열쇠|글`, `suspect|`·`react|`·`clue|`·`taste|`·`lewd|` → suspicion.case/response/clue·suspicion.score·taste_band derive·openness.score). 모든 기능 켠 상태로 실제 검증 통과(tests/recorder.test.js).
  - 정리 노트: `engine/director.js`(parseDirectorRun → `factSheet` 저장값 그대로 + `directionMessages` 짧은 방향 1번 → `directorEnvelope`). memoryturn `main.llmCall` 래퍼(label "Director pass*", recorder!=="pot"). pass 1에서 바로 final(검색 단계 없음). directorRole facts면 방향 호출 없음.
  - 다시 요청 재사용: `engine/retrycache.js` routerKey(플레이어 말+최근 대화+문서 이름)·swapRequestRef, 방향 캐시 directionKey, 기록 결과 recDone. hooks.chatListener에서 리수폿 director 캐시 비우기 제거. `flow.retryHits()`.
  - UI 버그: people.js personDetail에서 m.grades/search 없으면 오류(관계도·나에 대한 기억에서 들어올 때) → 기본값. wikiview가 personKey를 무시하던 것 → 그 인물 선택 후 비움. 위키 탭 nowrap+가로 스크롤. e2e `run-wiki-recorder.mjs`(고급·간단 × PC·모바일 60, 고정 데이터 tests/e2e/fixtures-recorder-wiki.json = /home 스크립트로 기록기 생성).
  - 남은 것: 실제 모델(아르곤·딥시크 등)로 품질 확인 못 함, 기존 tests/pot-port.test.js 실패는 원래부터(customPromptPlain 원본 없음).
- **코어: 훅 애드온 즉시 적용(11-08 19시, 사용자 요청)**: `src/data/addonscope.js` — 로더가 애드온마다 api 사본(scopeApi)을 넘겨 add/removeRisuReplacer·ScriptHandler·ChatListener를 기록, stop 때 남은 것 모두 제거. addProvider는 `createProviderRelay`로 이름당 호스트 1회 등록 후 처리기만 교체(꺼지면 "꺼져 있어요" 오류). install은 `applyNow ?? true`(pendingRestart 경로는 applyNow:false일 때만), 업데이트한 애드온을 requires로 쓰는 켜진 애드온도 stop→start. api를 열쇠로 쓰는 WeakMap(store.js 잠금·modelhub)은 `Symbol.for("dusk.baseApi")`로 원본 기준. 단위 tests/addons.test.js. 코어 변경이라 dusk_atelier.js 새로 받아야 함. 실기기 미확인(특히 장기기억 훅 갈아 끼우기 중 요청).
- **스텔스 0.3.46(11-08 19시)**: 사용자 "시작부터 위젯 홈 안 뜸·사이드바 크기 맞춤 안 나옴" → 원인: stealth-shell widgetHomeOn이 저장값 "on"(widgethome.js 형식)을 못 읽어 항상 꺼짐 → 홈에서도 셸·표식을 그려 위젯 홈 자동 감지를 가림. `isWidgetHomeOnValue`로 고침(시험 추가). 실기기 미확인. 주의: ‘홈 화면도 바꾸기’를 켜면 홈 CSS가 바뀌어 위젯 홈과 부딪힐 수 있음.
- **스텔스 0.3.45(11-08 저녁)**: 화면 개편 — 켜기 토글(toggleRow, 끄면 확인 없이 disable), 켜진 상태에서 카드 누르면 바로 enableStealth, 적용 버튼 없음, 문구 칸 change 시 켜진 모양이면 refresh. ‘원래 테마로 되돌리기’(확인창)는 밝기 segmented 위(켜졌을 때만). `details[data-fold=detail]`(이미지 접기·아바타·사이드바 숨김·아이콘·문구), `[data-fold=diag]`(최소 모드·진단·복사, 진단 누르면 자동 열림), 열림 상태는 모듈 변수 openFolds. 새 설정 `changeHome`(기본 false=offHome 적용, true면 홈도 바꿈). hello 애드온은 addons.src.json에서 뺌(폴더·dist는 e2e용으로 남김, `tests/e2e/hello-fixture.mjs`가 목록에 붙임). 땡스에 claudestealth·yumi. e2e `run-stealth-ui.mjs`(PC·모바일 20, app.entry `opts.stealth`). 실기기 미확인.
- **더스크 스텔스 애드온**(`addons/stealth`, 최신 0.3.14): 클로드·클로드 코드·GPT·코덱스·제미나이·딥시크 프리셋. 파일 `src/data/stealth.js`(CSS·채팅 HTML 생성), `stealth-apply.js`(켜기·끄기·진단·`reapplyIfUpdated`), `stealth-shell.js`(사이드바·상단 줄 껍데기), `src/ui/screens/stealth.js`(화면), `stealth-fold.js`(예전 훅 방식, 지금은 안 씀).
  - 호스트 제약: 루트 문서 `setAttribute`는 `x-`만, `setInnerHTML`은 class를 지움 → 안쪽 요소는 `x-c`로 표시하고 CSS `[x-c~=…]`. 클릭 대행 불가(SafeElement에 click 없음).
  - 이미지 접기(0.3.12~ 최종): 스텔스가 화면에서 이미지·배경 그림마다 `[x-st-fw]` 상자로 감싸고 위에 `[x-st-fl]` '›_ 명령어 N개 실행함 ›' 줄(누르면 x-open 토글, `stealth-shell.js` wrapMedia, 1.5초마다). 접힌 이미지는 1px 투명(배경 그림 미리 받기). 48px 미만 아이콘은 그대로. 감싸기 실패는 숨기고 '명령어 N개 실패함'(눌러 펼침). 포켓리스는 채팅 HTML의 `<details>`를 지워서 메시지 단위 방식(0.3.6~0.3.11)은 폐기, display 훅(0.3.0)도 폐기(느림·정규식 이미지 못 잡음).
  - 사용자 확인: 이미지 접기 동작함(11:35). 휴대폰 펼침 속도는 0.3.14에서 개선 — 확인 대기.
  - 애드온 업데이트 시 켜 둔 모양을 리스 설정에 자동 재적용(`reapplyIfUpdated`, `appliedVer`).
  - 껍데기: 기본 접힘(^로 펴기), 채팅 화면에서만(x-vis), Dusk 창 열림은 iframe 크기 + showContainer 감싸기로 감지, 모바일은 상단 줄(≡·봇/채팅·✎·⋮) — 줄은 터치를 통과시켜 ≡ 자리의 순정 사이드바 버튼이 눌리게.
  - 0.3.15(11-07 15시): 사용자 제보(클로드, PC) "사이드바 접은 상태인데 스텔스 사이드바(^ 버튼)가 안 보이고, 채팅이 왼쪽 절반에 쏠림(입력창은 가운데)". 코드로는 원인 못 정함 → 화면 진단에 **배치 추적**(글→body 상자별 왼쪽·폭, `layoutTrace`)과 **사이드바 판단 근거**(채팅 화면 찾음·Dusk 창 열림 판단·크기·호출·접힘 → 보임/숨김, `shellInfo.flags`)·'결과 복사' 추가. 의심: ① Dusk 창 '열림'으로 잘못 판단(iframe 크기>0)해 x-vis=0 ② 메시지 상위 상자 하나가 절반 폭. → **0.3.16(23시)**: 진단 결과(포켓리스, PC 1800px)로 원인 확정 — ① `.st-msg` 바로 위 상자(div.svelte-…)가 글 폭(313px)으로 줄어 가운데 맞춤이 안 먹음 → `:has(> .st-msg){width:100%;flex:1 1 100%}`(자식만 보는 싼 :has라 :has 개수 제한 시험에서 뺌, 브라우저 재현·확인). ② 포켓리스는 창을 닫아도 iframe 크기가 남고 hideContainer가 안 잡혀 '열림'에 갇힘 → `duskIsOpen(size, call, shown)`에 Dusk 본체 `.rb-root.hidden` 추가(1초 확인으로 풀림). 진단의 사이드바 판단 근거는 이제 진단 순간 값(`shellFlags`). → 사용자: "여전히 안 나옴, 보통 바깥을 눌러 닫음". **0.3.17**: 바깥 클릭으로 닫으면 .rb-root도 그대로라 신호가 없음 → 리스 화면 body에 pointerdown을 한 번 달아 누르면 닫힘으로 본다(`noteHostClick`, 다시 열면 showContainer 감싸기로 숨김). 진단 결과를 화면 밖 변수에 둬 다시 열어도 남고(`redraw`), 복사는 clipboard 막히면 textarea+execCommand. → 진단(23:24): 채팅 가운데 정상, 사이드바 '보임·접힘'인데 사용자 눈엔 회색 점 → 접힌 버튼이 다크에서 배경=--st-side·옅은 테두리라 안 보였음 → **0.3.18** 버튼 36px·대비 테두리·그림자. 미해결: 사용자 "‘명령어 N개 실행함’ 줄이 아예 안 보임"(상자 26개는 감싸짐) — 진단에 접힘 줄·펼친 상자 개수 추가, 채팅 화면 스크린샷 요청함. → **0.3.19**(사용자 요청): 기본 펼침(고른 적 없을 때만, 화면 폭 >760일 때; 휴대폰은 접힘), 순정 사이드바(.rs-sidebar·.risu-sidebar 크기>0)가 열려 있으면 스텔스 껍데기 숨김·자리 비움 해제(`nativeSidebarOpen`, 4초 주기 + 리스 화면 클릭 350ms 뒤 재확인). 예전 '스텔스 펼치면 순정 사이드바 display:none' 규칙은 없앰. → 실기기(23:50 포켓리스 PC): 사이드바 위치는 맞는데 **모양 없음(글자만)** = 리스 화면에 만든 <style>이 안 먹음(포켓리스가 막는 듯; 리스 본가는 style 허용) → **0.3.20**: SHELL_CSS를 `stealth-shellcss.js`로 빼서 buildStealth가 커스텀 CSS에도 넣음(최소 모드 제외). 이미지 접힘 줄 안 보임도 같은 원인 가능성(접힘 줄 상자 26/줄 26/펼침 0인데 화면엔 이미지가 그대로) — 진단에 `foldTrace`(크기 있는 줄 수·접혔는데 보이는 이미지 수·부모 크기) 추가, 결과 대기. → 실기기(11-08 00:19): 0.3.20도 사이드바 글자만. **진짜 원인**: 호스트 setInnerHTML이 DOMPurify 기본 설정이라 `x-c`·`x-st-chat` 같은 x-* 속성을 지움(리스 본가는 통과, 포켓리스는 지움) → CSS도 버튼 연결도 안 됨. **0.3.21**: 사이드바·상단 줄·설정 팝업 HTML을 `class`·`data-st-*`로(토큰 on/serif/act → st-on/st-serif/st-act), CSS도 class 선택자. 시험: shellHtml에 DOMPurify가 지우는 속성 없음. 접힘은 정상 동작 확인(줄 26/26 보임, 새는 이미지 0) — 다만 감싼 것이 봇 위젯 아이콘(x-risu-status-widget…)·캐릭터 이미지(x-risu-character-img-container 190px)이고, 본문 큰 일러스트는 안 접힘(인라인 style이 아닌 클래스 배경 그림이거나 래퍼 밖일 가능성) — 사용자 선택: **큰 일러스트만 접기** → **0.3.22**: 재기 전 숨김을 1px→visibility(자리 유지)로 바꿔 실제 크기를 잰 뒤 짧은 변 ≥220px(`FOLD_MIN`)만 접음, 작으면 x-st-m="s", 크기 0(안 받음)은 표시 안 하고 다음 차례에 다시. 대상 선택자 `[style*="background-image"]`→`[style*="url("]`(background 줄임 꼴 포함 — 큰 일러스트가 이것일 가능성). 진단에 '작아서 그대로 둔 그림'. → 사용자 확인(00:33): **이미지 접기 정상.** 사이드바는 0.3.21·22에도 글자만 → 포켓리스 소독기가 class도 지우는 것으로 판단. **0.3.23**: ROOT·TOP·NOTE는 `mountHtml`(iframe의 DOMParser로 우리 HTML을 읽어 createElement+setAttribute("x-c"/"x-st-*")+setInnerText로 하나씩 붙임, svg만 setInnerHTML, style은 setStyleAttribute) — 이미지 접힘 상자와 같은 길이라 어느 판에서나 남음. CSS는 다시 [x-c~=…], 설정 팝업(체크·값 필요)만 setInnerHTML + class 선택자 사본. 브라우저에서 class·x-*·data-* 전부 지우는 소독기 흉내로 확인(모양 정상). 실기기 미확인. → **0.3.24**(사용자 요청): 접기(^) 버튼·저장(rbm:stealth:fold)·toggleFold 없앰. 접힘은 화면 폭으로만(>760 펼침, 휴대폰 접힘=숨김). 접힌 작은 버튼 CSS도 지움. 실기기 미확인.
  - **0.3.25**: 사이드바 최근 항목 정렬 — 날짜 없을 때 번호 내림차순이라 오래된 것부터·30개 자를 때 최신이 빠짐 → 번호 오름차순(리스는 새 채팅을 0번에 넣음). 실기기 미확인.
  - **0.3.26**: 따옴표 부분 회색 — 리스가 이미 `<mark risu-mark="quote1|quote2">`로 감싸므로 CSS 한 줄(`--st-dim`). 리스 설정 '따옴표 서식 끄기(unformatQuotes)'를 켜면 mark가 없어 안 먹음.
  - **0.3.27**: 클로드 사이드바 머리에 패널 아이콘 + 오른쪽 말풍선|</> 묶음(장식, `SHELL_KINDS.claude.headSeg`).
  - **0.3.28**: 접힘 줄 글 '파일 N개 읽음, 명령어 N개 실행함'(wrapMedia, 두 수 따로 1~9).
  - **docs/STEALTH.md**(11-08): 스텔스 모양 만드는 법(호스트 제약·사이드바 규칙·순서·확인). 다음: 사용자가 클로드 코드·GPT·코덱스·제미나이·딥시크 실물 사진을 하나씩 보내면 7절에 형태를 정리한 뒤 만든다 — **사진 전에 먼저 만들지 말 것**(사용자 지시). → GPT 사진 받음 → **0.3.29** GPT 사이드바(`sidebar:"gpt"`, SHELL_KINDS.gpt), 위 줄 chat 모드, 처리 시간 줄(`markThinking`→x-st-th, `gptExtraCss`), 따옴표 ・ 줄. 남은 사진: 클로드 코드·코덱스·제미나이·딥시크. **0.3.30**: 따옴표 ・ 줄을 `quoteDot` 프리셋 키로 빼 클로드에도. **0.3.31** 코덱스: 사진대로 터미널 모양 폐기(`terminal` 키, 지금 쓰는 모양 없음), 레일+사이드바(`rail`, x-rail="1"), Codex ⌄·종/검색, 시작하기 발, 사이드바 폭 넓힘. **0.3.32** 클로드 코드(7-3: 사이드바 클로드식·</> 선택·New 배지·점 목록, 사용자 글 파란 상자 `codeExtraCss`)·제미나이(7-4: `top:"none"`, quoteDot ◦)·딥시크(7-5: 파란 글자, 새로운 채팅 버튼, ··· 설정, 위 줄 이름+공유). **여섯 모양 모두 사이드바, 모두 실기기 미확인.** **0.3.33** 머리 아이콘 그림: 사용자 선택(`state.icons`, 64px PNG data)이 먼저, 기본값 `SHELL_KINDS[kind].icon`은 모두 빈 칸. 실제 회사 로고(고래·무지개 별)를 기본값/자동 다운로드로 넣는 건 하지 않기로 함(사용자와 논의 11-08) — 기본값은 저장소 관리자가 로고가 아닌 그림으로 채우기로. **0.3.36** 휴대폰 접기 기준 = min(220, 화면 폭/2). 다음: 사용자 요청 '모바일 전부 검토' — 모양별 휴대폰 스크린샷·진단 받아 항목별 점검. **0.3.34** 코덱스 시작하기 상자 뺌(foot "noav"). 사용자 요청: 사용자가 올린 개인 파일(그림 등)은 열어 보지 말 것.
  - 장기기억 0.1.11(11-08 오후): 사용자 제보 "모든 채팅 끔인데 인물위키가 돎" → `potState`가 inject.on=false면 끔(memory-all-off), memoryturn 훅(`botPotOff`)이 봇별만 보던 것을 potState 전체 판단으로. 모바일 접기: 좁은 창 진단(11-08 14:08) 19개 모두 '작음' → 그림을 받기 전 자리만 작게 잡힌 순간에 재서 영구 's'. **0.3.37**: s는 `SMALL_SEL`로 차례마다 다시 재고(최대 60개) 20초(`RECHECK_MS`) 지나면 "S"로 굳힘, 좁은 화면 기준 화면 폭 40%. 진단에 '작게 본 크기'(x-st-sz). → 좁은 창 사진: 안 접힌 건 가로 띠 그림(416×95, 캐릭터 컷) → **0.3.39** 폭 ≥320·높이 ≥60도 접음(`WIDE_W/H`). 74px 아이콘 18개는 기준대로 그대로. **0.3.40** 휴대폰 위 줄(GPT·제미나이·딥시크 사진): `SHELL_KINDS[kind].mtop`, topHtml이 넓은 화면 쪽(st-top-do)·휴대폰 쪽(st-top-mo)을 함께 그리고 CSS가 고름. **0.3.41** 클로드·코드: [패널] 프로젝트(캐릭터) / 채팅 ⌄ … [문서] [공유+글자], 코덱스=GPT와 같음. **0.3.42** 홈(채팅 밖)에선 화면 전체 규칙(색 변수·글꼴·배경·순정 사이드바) 끔: 셸이 body에 `x-dusk-chat` 표식, CSS는 `offHome()`이 `:root:not(:has(> body[x-dusk-chat="0"]))`로 좁힘(위젯 홈 충돌 의심).
  - 코어(11-08 오후): '업데이트 확인' 버튼 = `check({ force, fresh })` → api.github.com `git/ref/heads/<브랜치>`로 커밋을 받아 raw 주소를 커밋 고정(`pinFresh`), 목록·애드온 파일 둘 다. 실패하면 예전 ?t= 길. 자동 확인(1시간·창 열 때)은 그대로(API 횟수 제한 60/시간 아끼려고).
  - 코어(11-08): 사용자 "애드온 올린 걸 코어가 바로 인식 못 함" → 원인: 목록 주소엔 이미 ?t= 캐시 깨기가 있음, 창 열 때 확인이 마지막 확인 10분 뒤에만 돌았음(`SOON_EVERY`) → 1분. 코어 변경이라 dusk_atelier.js가 바뀌어야 반영(애드온 배포만으론 안 됨). 진단 주의 "reading chatPage"(호스트 오류, 사이드바엔 영향 없음) 미조사. → **0.3.17(23:10)**: 0.3.16 뒤 "채팅 로딩 또 느림" 제보. 맨 `:has(> .st-msg)`(대상이 모든 요소)가 의심 원인 → `.risu-chat .grow > div:has(> .st-msg)`로 범위 축소, 성능 시험도 이 형태만 예외. 같은 로그의 `RisuBard narrative inquiry timed out 10000ms`(BardWiki 호환)는 리스바드 자체 코드라 Dusk와 무관(별도 확인 필요), `message handler 782ms`는 출처 미확정.
  - 미확인(실기기 필요): 포켓리스 모바일 입력창 배치, ≡가 순정 버튼과 겹치는지, 채팅 로드 속도, 상단 줄 숨김.
  - 남은 요청: 클로드 기준 틀 확정 뒤 다른 프리셋(GPT 등) 전용 CSS, 플러그인 전체 로드 속도 측정·개선(어느 화면이 느린지 사용자 정보 필요).
- 코어(2.0.0 릴리스 때 반영): Cellar 끄기/켜기(`loadCellarEnabled`, 끄면 요청 0회)·실패 시 백오프, 작업실 ‘더스크 스텔스’ 탭(tabs.js), 애드온 화면 스크롤 상자, 애드온 동시 받기(목록 저장 직렬화·줄 단위 병합 `setIndex(idx, ids)`)·‘모두 받기·업데이트’·자동 업데이트 동시, host-gate.
- Cellar(`Pyser08/Dusk-Cellar` main 0.1.2): 안정성 점검 끝(태그 없음).

### 다음 큰 작업: 전체 기능 점검(사용자 요청 2026-11-07, `HandOff/QUALITY.md` A절 8항목 기준)
1. ~~기능별 '사용자 약속' 목록~~ **1차 끝(11-07 오후)**: `docs/PROMISES.md`(M·F·T·C·A·S·E·P, 상태 ✅/◐/✘/📱). e2e `app.entry.js opts.host` = 리스 훅 흉내(`__host.request/output/display`) + main.js와 같은 fairPlay·turnInfo. 저장값만 보던 run-home-memall·fair·dice·turn을 '모델에 가는 글·응답 아래 블록' 기준으로 고침. 단위 `tests/promises-memory.test.js`·`promises-fairplay.test.js`.
   - **버그 발견·수정**: 홈 '장기 기억(모든 채팅)' 끔·저장 위치 '끔'이 러너에 안 먹어 응답마다 보조 모델을 불렀음 → `memoryrunner.js gate`가 `memoryState` 하나로 판단(M-2).
   - 남은 ◐/✘: M-5(복사 채팅 실제 주입)·M-6(페르소나 이름 기능별)·M-9·S-2·A-4 → 2·3번 작업 때 채운다.
2. 실데이터 모양 픽스처 `tests/fixtures/`(오래된·필드 빠진·복사/분기/가져온 채팅, 채팅별 페르소나, 긴 채팅, 머리말 같은 응답) — 제보마다 하나씩 추가.
3. 한 곳 계산: 현재 페르소나 이름·채팅 범위 키(chat.id vs risupotWikiScopeId)·기능 켜짐 여부 → 함수 하나로, 원본 필드 직접 읽기를 막는 grep 검사 테스트.
4. 호스트 동작 하네스(reroll·edit·delete·copyChat·switchChat·switchPersona·stop·reload)와 시드 고정 무작위 순서 + 불변식.
5. 모델 응답 녹화 픽스처 `tests/fixtures/llm/`(깨진 형식 포함)로 Writer 등 재생.
6. 버그는 실패 테스트 먼저(이미 규칙).
7. 출시: release.yml에 `npm test` 단계(main 수정 — 사용자 지시 필요), `cellarlatest.test.js` 네트워크 목 확인, 베타 링크 검토.
8. '이번 턴 보조 호출 N회 — 기능·설정' 진단 화면.
+ ~~작업실 프로바이더 화면: 버튼 글·배치 정리~~ **끝(11-07)**: 원인은 `.rb-pcard`가 인물 화면 카드와 이름이 겹쳐(align-items:flex-start·cursor:pointer) 카드 안이 늘어나지 않던 것 → 프로바이더 카드는 `.rb-pvcard`. 연결 카드: ‘API 키’ 칸 제목, 모델 칸(모델 불러오기/다시 불러오기 → 검색 → 칩 → ‘빈 프로필 추가’), ‘연결 지우기’는 맨 아래 줄 오른쪽(구분선). 프로필 카드: 아래 줄 ‘연결 시험·복제 … 프로필 지우기’. 이름 통일: 추가=목록에 새 항목, 지우기(삭제 X), ‘프로필 직접 만들기/만들기’ → ‘빈 프로필 추가’·‘프로필 추가’. e2e run-provider에 배치 검사(P-4). 애드온 버전 provider 0.2.2·memory 0.1.10(러너 수정) — **11-07 13:15 publish-addons로 addons 브랜치에 배포함**(사용자 지시). 실기기 미확인.

## 로드맵 (2026-11-06 정리, 11-07 갱신)
### 끝난 것
- 애드온 구조: 로더(blob import)·requires(받기·시작 순서·끄기 연쇄)·동시 시작·1시간/창 열 때 업데이트 확인·캐시 우회·훅 애드온 새로고침 알림·첫 실행 자동 받기(adopt)·코어 모듈 전부 공유(애드온만 고쳐도 됨).
- 애드온(배포: `addons` 브랜치, `node tools/publish-addons.mjs`): memory(장기기억·관계도·회귀·HUD) · cards · erosync · manage(캐릭터·모듈·플러그인) · protlink · provider(실험) · widgets · aibuild · chattheme. 코어만으로 홈·가져오기·편집기·코코아·꾸미기·도구·설정 동작.
- 장기기억 → 리수폿 화면(Erosync 짜임, 채팅 없이도 켜기·설정), 기능 맛보기(engine/discover.js 표), 시작 안내 v2(애드온 고르기), 화면별 ? 안내 보강.
- 버그: 폴더 키 통일+예전 기억 이전, 기억 파일 v3, 합치기 관계, 페르소나 중앙, 리수폿 일괄, 월경 cycle_report, 모바일 스크롤, 새로고침 직후 먹통.
### 남은 것 (순서대로 — 맨 위 '전체 기능 점검'이 우선)
0. **전체 기능 점검**(위 8항목) + 프로바이더 화면 버튼 글·배치 정리.
1. **실기기 확인**(RisuAI·RisuBard·PocketRisu, PC·모바일): 애드온 받기·자동 받기·동시 시작 속도·기억 훅 순서·예전 기억 이전·리수폿 개요·새로고침 알림·월경 cycle_report 실제 응답. 문제 나오면 DEBUG.md 순서로(실패 시험 먼저).
2. **2.0.0 출시 준비**(사용자가 시킬 때만, 스텔스 minCore도 2.0.0 검토 — 작업실 탭·애드온 동시 받기 등 코어 변경 포함): package 버전 2.0.0 → 모든 애드온 minCore 2.0.0·버전 정리 → build·check → publish-addons → main 머지 → `v2.0.0` 태그. 아카 글(docs/arca)은 요청 시.
3. **넘어오는 유저용 패치**(사용자 결정 대기): 원본 플러그인(리수폿·Erosync·HypaPlus 등) 느낌 살리기 — 어떤 기능을 맞출지 사용자가 정함.
4. **프로바이더 보완**(docs/PLAN-provider-pm.md, Provider Manager v1.19.3 — 원작자 허락, 참고·일부 코드 가져오기 가능, 가져오면 파일 머리에 출처 + NOTICE.md. 원본 파일은 사용자에게 다시 받아야 함): 1~11단계(…·확장·다른 플러그인 창구, 프로바이더 애드온 0.2.1, 스킬은 뺌) 끝(남은 것: 실제 리스에서 다른 플러그인끼리 pluginStorage 칸이 보이는지 확인). 11단계: engine/provider/mailbox.js(키·요청 읽기·결과 정리·설정) + data/provider/mailbox.js(감시기: 동시 처리 수·허용 묻기·결과 쓰기, 요청 칸은 안 건드림, 처리한 id는 결과 칸 보고 기억) + 확장 탭 카드, 규칙 docs/IPC-provider.md. 10단계: engine/provider/{mcp,hooks}.js + data/provider/mcpclient.js + ui/screens/provider/ext.js, MCP는 streamable-http만(레거시 SSE 없음), 토큰은 vault, 실제 MCP 서버로는 확인 못 함(가짜 전송으로만). 9단계: engine/provider/router.js, 우선순위 = 예산 전환 > 요청 지정 > 라우터 > 용도·봇별. 8단계: Anthropic만(engine/provider/batch.js, 진행 중 배치 저장 dusk.prov.batch.v1), OpenAI 배치(파일 업로드)·Cellar 대기는 안 함. 7단계: Claude만(격자 cache.grid, 학습 cache.learn=직전 요청 턴 해시 메모리 보관). Gemini 캐시 학습은 기존 gemcache(observe/auto). 6단계: 토큰은 어림값(engine/provider/tokens.js), 추론 요약/생략=Claude만, 해상도=Gemini generationConfig.mediaResolution. 5단계 한계: Bedrock IAM(SigV4)·네이티브 invoke는 안 함, OpenCode Zen·Gemini Express 주소는 실제 호출로 확인 못 함. 로그는 engine/provider/errlog.js + 저장 dusk.prov.log.v1. 진행 창 카드→로그 바로 열기는 창이 리스 쪽 DOM이라 못 함(로그 탭에서 보기).
5. 정리 후보: cards·memory가 비코어 공유 모듈을 각자 들고 있음(크기 중복), 원래부터 실패하는 e2e 6개(run-app·run-hubs·run-tabs·run-editor-ai·run-lorereq·run-popup) 고치기, 기능 맛보기 숫자 조정(사용자 피드백).
### 애드온만 고칠 때
소스 수정 → `addons/addons.src.json` 버전 올림 → `node tools/build-addons.mjs` → (빌드가 "코어가 넘겨 줄 모듈이 바뀌었어요"라고 하면 코어도 내고 해당 애드온 minCore 올림) → `node tools/publish-addons.mjs`. 훅 애드온(memory·erosync·provider)은 새로고침해야 적용.

---
# ▼ 이하 지난 기록(참고용 — 현재 상태는 위 세 칸이 기준)

## 기록: 기능 애드온 분리 (2026-11-06)
- 묶음·크기·의존: 프로젝트 문서 claude/addon-plan.md. 장기기억·관계도 / 기억카드(+cardassets, 장기기억 필요) / 에로싱크(장기기억 필요) / AI로 봇·페르소나 만들기 / 위젯 / 채팅테마 만들기. **코코아·ProtLink+는 코어에 남김.**
- 규칙: 애드온이 없으면 쓸 수 없는 것(탭·하위 화면·버튼·채팅 메뉴·위젯 칸·설정 행·안내/투어 항목·홈 바로가기)은 전부 그 애드온 쪽으로 옮겨서, 없을 땐 코어에 흔적이 안 남게(숨김). 데이터·설정 키는 그대로(애드온을 다시 받으면 이어서 쓰게).
- 순서: ① 로더 확장 — manifest `requires`(필요 애드온 같이 받기), 코어가 애드온에 넘기는 `ctx.lib`(dom·kit·icons 등, esbuild로 애드온 빌드 때 external→ctx.lib 매핑), 애드온이 탭·화면·메뉴를 코어에 등록하는 자리(registerTab 등) ② 채팅테마로 첫 분리 ③ AI 제작·위젯 ④ 장기기억·관계도 → 기억카드·에로싱크 ⑤ 2.0.0 첫 실행 때 쓰던 기능 애드온 자동 받기.
- 진행: ① 로더 확장(일부) — `src/ui/ext.js` `ctx.ext`(screen·row·slot 자리, add()는 되돌리기 반환), 코어 모듈 공유(`tools/build-addons.mjs`가 코어에 있는 모듈은 애드온에 넣지 않고 `globalThis.__duskLib`로 받게 빌드, 넘겨 줄 목록 `src/addonlib.gen.js` 자동 생성 — 바뀌면 코어 재빌드+minCore 올림). `requires`·첫 실행 자동 받기는 아직.
  ② 채팅테마 분리 끝 — `addons/chattheme/index.js`(v1.0.0, minCore 1.9.2 — 지금 코어 버전이 1.9.2라 실기기 시험용, 2.0.0 출시 때 minCore 2.0.0으로, 84KB, 코어 모듈 7개 공유). 코어에서 tools.js 화면·줄, settings.js 꾸미기 버튼(slot look.mine)·스튜디오 칸(slot look.adv), tabs.js·tour.js 안내 글 제거. 시작 때 테마 적용(restoreActiveTheme)은 `data/themes.js`로 옮겨 코어에 남김.
  e2e `app.entry.js`는 기본으로 기능 애드온 소스를 켜고(`FEATURE_ADDONS`), `coreOnly`면 코어만. `run-addon-chattheme.mjs`(코어만/켬/배포 파일 14개).
  참고: `run-app.mjs`는 수정 전에도 실패(오래된 시험).
  ③ AI 제작·위젯 분리 끝(11-06) — `addons/aibuild`(152KB: 편집기 AI는 svc "aibuild" = {load, aitab, openAiPopup, loadPopupGeom}, editor.js `hasAi = !!ctx.ext.get("svc","aibuild")`; 페르소나 빌더는 tab "personabuilder"; tabs.js `addon:` 표시 탭은 `setAddonCheck`로 svc가 있을 때만 보임; characters 버튼·onboarding 소개도 svc 기준. data/personabuilder.js·regextest·lorerefine·preset-format은 코어). `addons/widgets`(246KB: data/widgethome.js+src/widgethome 통째, svc "widgethome"·도구 row(when)·설정 slot "settings.cards"; 카드는 `addons/widgets/card.js`로 옮김(원래 devtools.js widgetHomeCard), 켜고 끄면 카드만 다시 그림). main.js는 `ctx.widgetHome` getter(svc)·openWidgetHome·app.open의 yieldToDusk·onClosed resume만 남김. 애드온 ctx에 `app`(앱 ctx) 추가. ext 변경이 tab·svc뿐이면 메뉴만 고침(refreshTabs). e2e `run-addon-aibuild.mjs`(13)·`run-addon-widgets.mjs`(9). 코어 번들 6,271KB.
  다음: 세 호스트 실기기 확인 → 2.0.0 출시 준비(minCore 2.0.0, 매니페스트 주소 main으로). 사용자 결정 대기: 다른 플러그인에서 넘어오는 유저용 패치(원본 느낌 살리기).
  ④ 조사 결과(11-06, 아직 코드 안 바꿈):
  - main.js 연결: createMemory(L100) · chatRef.of(L101) · affhud(store·link, L102) · setUserPromptProvider(L104) · memory.start(L109) · 위젯 홈 memory.search(L115) · loreLog gauge(L195) · chatMenu openMemory/openRegress(L200) · app.ctx.memory(L241) · erosync cycleProbe·memory.link.backfillErosync(L266~286) · app.ctx.cellar = memory.cellar(L292) · openMemory/regress(L321~) · createMemoryButton 관계도 버튼(L330) · POT_PROMPTS(prompts.json 244KB) · app.js renderMemory·renderRelMap.
  - 코어에 남길 것: data/cellar.js(설정·플러그인 탭은 이미 `ctx.memory?.cellar ?? createCellar()`), data/memoryswitches.js currentChat(provider가 직접 import), pot/의 LLM 클라이언트(llm-client·local-keys·vertex·copilot·model-options — provider·modelhub가 씀), 코코아(cocoa.js → memory/skills.js, data/skillstore·engine/skillhook).
  - 코어 화면의 ctx.memory 사용은 대부분 `?.`라 없으면 건너뜀: settingstab(memoryButton·remote), sectionhome(기억 통계), assetfix(store), promptstab(flow.settings), homestate, characters, onboarding, dicedetail(switches.currentChat). → 애드온이 svc "memory"로 등록하고 main.js는 `ctx.memory` getter(svc)로.
  - 애드온 쪽: data/memory.js와 runner·inject·flow, ui/screens/memory/*(skills.js 제외), relmap, regress, peoplescreen, pot.js, 관계도 버튼(memorybutton), chatMenu의 기억·회귀 항목(slot/svc로), loreLog gauge 연결, userPrompts 공급.
  - 확인할 것: affhud(호감도 HUD, 개발 탭 기능 프리셋)가 memory.store 없이 어떻게 동작할지, memory/skills.js가 기억 모듈을 import하는지, 훅(beforeRequest 주입)이 data/memory.js 안에서 등록되는지(main.js hooks 객체).
  - 에로싱크·기억카드: requires ["memory"], svc "memory"로 flow·link·store 받기.
  ④⑤ 완료(11-06, 2번째 세션): 장기기억·관계도 `addons/memory`(1,491KB, hooks:true: createMemory+affhud+관계도 버튼+userPrompts, svc memory·affhud·memoryButton·memoryui{tracked,STAGE_NAMES,cardSettings}, tab memory·relmap, needsMemory 표시, 채팅 메뉴 `chatMenu.addLink`로 장기 기억·회귀), 기억카드 `addons/cards`(640KB, requires memory, tab cards — cardSettings는 svc memoryui로), Erosync `addons/erosync`(826KB, hooks:true, requires memory, svc erosync). main.js의 ctx.memory·affhud·memoryButton·erosync·cellar는 svc getter. 코어 6,280KB→3,270KB(남은 큰 것: 없음 — cardassets·erosync·pot은 빠짐).
  - manifest `requires`: engine/addons.js `installOrder`·`bootOrder`, data/addons.js install(필요 것 먼저)·boot(순서, 필요 것이 안 켜졌으면 건너뜀)·setOn(켜면 필요 것도 켬, 끄면 의존하는 것도 끔)·remove(의존하는 것도). 설치 기록에 requires 저장.
  - 첫 실행 자동 받기 `addons.adopt(probes)`(키 `dusk.addon.adopted.v2`, 하나라도 실패하면 다음 시작에 재시도): main.js ADOPT — memory(dusk.mem.v3/v2 index·risupot.settings) · cards(cardidx 목록) · erosync(dusk.erosync.on) · widgets(dusk.widgethome.on). 주의: 첫 실행 한 번은 받는 동안 기억 훅이 없음.
  - app.js: 기억 화면은 `ctx.memory.ready()`(memory.js start를 한 번만, 실패해도 풀림)를 최대 20초 기다림(needsMemory). 화면 오류에 '다시 시도'.
  - e2e app.entry.js: opts.memory면 실제 memory·cards 애드온(app.memoryForTest), 아니면 탭 자리만. 2.0.0 출시 때 각 애드온 minCore 2.0.0으로.
  - 남은 것: 실기기(세 호스트)에서 기억 훅이 애드온 로드 뒤에 붙는 순서·첫 실행 자동 받기, cards와 memory가 비코어 공유 모듈을 각자 들고 있음(상태 없는 것뿐이라 동작 문제는 없지만 크기 중복 — 애드온 간 모듈 공유는 미구현).
  프로바이더 애드온(11-06): `addons/provider`(101KB, hooks:true — addProvider는 뺄 수 없음, svc provider·tab provider, setDuskRoute·setDuskServerModel을 애드온이 설정·끌 때 null, adopt 조건 = 실험 기능 켬 + dusk.prov.v1 있음). tabs provider는 exp+addon. 코어 2,024KB.
  기억 이전(11-06): chatKeyOf로 바꾼 뒤 원래 리수폿을 쓰던 채팅(scopeId≠chat.id)은 예전 기억이 chat.id 폴더에 남아 화면이 비었음 → adoptFolder를 모든 칸 일반 병합(빈 칸·없는 항목만, wiki는 지금 것 유지, adoptedFrom으로 1회)으로, switches.cachedCurrent·chatload(고른 채팅)·runner·aitools에서 호출. currentChat 결과에 숨은 legacyId. memoryswitches·memorystore3는 코어 모듈 → 코어도 교체 필요.
  애드온 동시 시작(11-06): boot가 코드를 한꺼번에 읽고(Promise.all) 각 애드온은 requires의 시작 약속만 기다림(launch 메모). bootOrder는 이제 안 씀(engine에 남김). memory 애드온의 chatMenu.addLink는 기다리지 않음.
  애드온 확인 주기(11-06): 켤 때 1번 + 1시간마다(setInterval, timers 주입 가능) + Dusk 창 열 때 checkSoon(10분). 목록 주소엔 ?t=시각, 파일 주소엔 ?v=sha 앞 12자(GitHub raw 캐시 우회). 시험 가짜 fetcher는 ? 뒤를 떼고 비교.
  4차(11-06): 관리 애드온 `addons/manage`(72KB: characters·modules·plugins 화면 탭, svc manage, adopt 조건 rbm:ui:v1 있음). legacy(가져오기)·editor·assetmgr·백업은 코어. app.js 기본 탭 home. 모바일 탭바·홈 '관리' 칸은 보일 탭 없으면 숨김. tour.js visibleTour(애드온 없는 탭 단계 뺌). build-addons: 코어 모듈 전부를 addonlib으로 넘김(279개, 코어 +46KB) → 애드온이 새 코어 모듈을 써도 코어 재배포 불필요(ext 자리·api가 바뀔 때만 코어). 코어 2,120KB.
  코어만 확인(11-06): 애드온 0개로 PC·모바일 전 탭 열기 오류 0, 메뉴는 홈·코코아·캐릭터·모듈·플러그인·꾸미기·도구·설정·개발만(모바일 홈·기억·관리·작업실). 숨긴 탭을 주소로 열면 '준비 중'.
  다음 후보(보류 — 사용자가 '코어만으로도 작동'을 원해 1번안+관리 애드온으로 진행함. 아래는 참고): 코어 = 로더+ext+최소 화면만, 지금 코어 기능(관리·화면 공용 모듈)은 기본 애드온 base로 → 첫 실행 자동 받기(인터넷 필요), 이후 저장본으로 켬, 실패 시 되돌리기, 그래도 안 되면 코어가 '기본 기능 다시 받기' 버튼. 애드온 간 모듈 공유(requires 대상이 모듈을 넘겨주는 구조)가 필요함. 새 챗에서 시작.
  버전(11-06): 애드온 버전 전부 0.1.0으로 초기화(사용자 지시). 주의: 시험으로 1.0.0을 받아 둔 기기는 pickUpdates가 낮은 버전으로 내리지 않으므로 애드온을 지우고 다시 받아야 함. 배포 위치: 전용 브랜치 `addons`(빌드 결과·목록만). 기본 목록 주소 ADDON_MANIFEST_URL·build-addons 기본 BRANCH = addons. 올리기: `node tools/publish-addons.mjs`(--dry 가능, 먼저 build-addons --check). 애드온만 고칠 땐 소스 수정 → addons.src.json 버전 올림 → build-addons → publish-addons. 본체 모듈 목록(addonlib.gen.js)이 바뀌면 본체도 내고 minCore 올림.
  3차(11-06): ProtLink+ 애드온 `addons/protlink`(947KB, svc protlink·tab protlink, 코어 app.ctx.updatePluginScript를 씀, 위젯 애드온은 ctx.app.protlink를 그때그때 읽음, adopt 조건 = 링크 있음). 코어 2,136KB. 장기 기억 → 리수폿 화면 `memory/potpage.js`(page "pot", 탭 개요=pot.js potOverview · 설정=flowSections · 자동 기록=autoTrackingBox(noAdvanced) · 고급=advancedPot), 홈 줄 #rb-mem-go-pot. madv '자동 기록 · 인물 추적'과 settings '세부 설정'의 흐름 칸은 리수폿 화면으로 가는 버튼만 남김. 기능 맛보기: `engine/discover.js`(DISCOVER 목록·pickDiscover) + `ui/discovercard.js`(홈 카드, prefs.ui.discover {seen,off,snoozeUntil}, prefs.ui.opens는 app.open마다 +1, prefs.ui.visited는 app render·memory 페이지에서). 설정 '기능 맛보기 다시 켜기'. screentours: memory:home 선택자 고침, memory:detail·pot·erosync·relmap·protlink·plugins 추가. e2e run-potpage·run-discover.
  시작 안내(11-06): ONBOARD_VER 2(모두에게 한 번 더), 1단계 ‘기능’ = 애드온 고르기(onboarding.js addonStep: 켜면 install/setOn(true), 끄면 setOn(false)만, 목록 못 받으면 안내), 이후 단계 번호 +1(7단계), 요약에 기능 줄. e2e run-onboard는 가짜 ctx.addons(app.entry opts.onboard).
  버그 수정(11-06, 사용자 제보): ① 폴더 키 규칙 `engine/chatkey.js chatKeyOf`(risupotWikiScopeId→id→index)를 runner·inject·turn·switches·affhud·assetfix·rewind·hypa·chatload가 같이 씀, 예전 키 폴더는 `store.adoptFolder`로 빈 칸만 옮김(러너·aitools), aitools는 범위 불일치를 따로 안내, memorystore3 set·potstorage가 setItem===false를 실패로. ② memoryfile v2만 받던 것 → v2·v3, `only`(열린 채팅만)·`target`(열린 채팅에 넣기). 합치기 `relinkNames`(memoryuser.js, {{user}} 합치기와 공용)로 rels·emo·talk 등 이름 옮김, peopledupe `fullAndGiven`(성+이름). ③ usernames `primaryUserName(db, chat)` 채팅 묶인 페르소나 우선·fresh 읽기, relmap 화면 키에 이름. ④ switches.setPot = setPotAll. ⑤ `engine/cyclereport.js`: 월경 추적 켜짐이면 Writer에 `cycle_report` 칸 요구 → 표식 줄로 바꿔 current_state 항목에 붙임(없으면 같은 제목 create → dedupe가 update로). pot 코드는 안 건드림. 스크롤: scrollguard가 목록 밖 rb- 스크롤 영역을 배움(learned), relmap canvas 모바일 flat 클래스 처음부터. 기억 넣기 토큰 → mhome 기억 옵션. ProtLink 플러그인: hooks.updatePlugin(main.js, Cellar 플러그인 편집 있으면 바로 교체, 없으면 파일).
  - 실기기 미확인: 위 전부. 월경 cycle_report는 실제 모델 응답 미확인.
  - 참고: run-app·run-hubs·run-tabs·run-editor-ai·run-lorereq·run-popup은 이 작업 전부터 실패(원래 브랜치에서 같은 결과 확인). run-info 모바일 한 항목은 가끔 실패(재실행하면 통과).
  할 일(11-06, 사용자 요청 '필요한 부분 말고는 다시 그리지 않게'): 화면이 자기 전체를 다시 그리는 곳을 바뀐 부분만 그리게 바꾸기 — characters.js(11곳)·presets.js(7)·plugins.js(7)·dev.js(7)·history.js(6)·lorelog.js(4)·settingstab.js(3)·tools/relmap/pot/people/memory/home/cocoa/cards(각 1), ctx.refresh: patchui·newbot(2)·characters(1). 지금은 스크롤 지킴이로 위치만 지켜짐. 기억 화면들은 애드온으로 옮길 때 같이.
  고침(11-06): 애드온 켜고 끌 때 전체 다시 그리기·스크롤 튐 → ext는 지금 화면이 읽은 자리만 다시 그림, 스크롤 지킴이는 클릭 대신 `ctx.go` 화면 이동(markNav)만 맨 위로. 규칙은 UI-STYLE.md 4-1.
- 매 단계 끝: 애드온 없이 코어만으로 npm test·e2e 통과 + 애드온 켠 상태 e2e 통과 확인.

## 2026-11-05 애드온 로더 시험판 (버전 미변경)
- 설계: 프로젝트 문서 claude/addon-plan.md(1순위 방식). 애드온은 리스 플러그인 목록에 안 뜨고, Dusk가 받아 같은 iframe에서 `import(blob:)`로 켠다.
- 순수 `src/engine/addons.js`(parseManifest·cmpVer·pickUpdates·rowState) / 데이터 `src/data/addons.js` `createAddons(api,{core,ctx})`: boot(저장본으로 바로 켬, 3초 뒤 확인)·check(6시간마다, 바뀐 것만 받기·sha256 검사)·install·setOn·remove·되돌리기(prev). 훅 있는 애드온(`hooks:true`) 업데이트는 다음 시작부터(pendingRestart). 저장 키 `dusk.addon.index`·`dusk.addon.code.<id>`·`dusk.addon.prev.<id>`(getLocalPluginStorage→pluginStorage), 목록 주소 키 `dusk.addon.manifestUrl`(기본 feat/2.0.0 raw).
- 애드온 소스 `addons/<id>/index.js`(export activate(api, ctx) → {deactivate}) → `node tools/build-addons.mjs`로 `addons/dist/<id>.js` + `addons/addons.json`(sha256·주소) 생성, `--check`로 확인. 목록 원본 `addons/addons.src.json`. 시험 애드온 `hello`(켜지면 알림 + 햄버거 버튼).
- 화면: 설정 탭 '애드온 (시험)' 카드(`ui/screens/addonsui.js`). main.js에서 boot.
- 테스트: `tests/addons.test.js`(8), e2e `run-addon-loader.mjs`(리스와 같은 sandbox·CSP에서 실제 blob import), `run-addons-ui.mjs`(PC·모바일 12).
- 고침: v3 api의 getLocalPluginStorage()는 Promise로 와서 `d.setItem is not a function` → await 후 메서드 확인, 없으면 pluginStorage, 값은 문자열로만 저장.
- 고침: 버튼 콜백이 toast 반환값(DOM)을 돌려줘 호스트 복제 실패(`failed to post message to parent`) → 콜백·ctx.toast는 아무것도 돌려주지 않게, hello v0.1.1. 애드온 규칙: api에 넘기는 콜백 반환값은 복제 가능한 값만.
- 고침: 알림(ctx.toast)은 Dusk 창 안에만 떠서 창이 닫혀 있으면 안 보임 → 애드온 ctx에 openDusk(tab) 추가, hello v0.1.2는 버튼을 누르면 설정 탭을 연 뒤 알림.
- 2026-11-06 사용자 실기기 확인: 아이패드(WebKit)에서 받기·켜기·햄버거 버튼·Dusk 열기·알림 모두 됨 → blob import 방식 확정.
- 미확인: Firefox, 호스트별(RisuAI·RisuBard·PocketRisu) 차이, 실제 nativeFetch로 raw.githubusercontent 받기. 실패 시 대체 경로(자기 재조립·nonce script) 아직 없음.
- 다음: 실기기 확인 → 실제 기능 하나(작은 것)를 애드온으로 분리, 공유 코드(`ctx.lib`) 구조.

## 2026-11-05 버그 정리 (2.0.0 애드온 작업 전, 버전 미변경)
- 스크롤 튐: `src/ui/scrollguard.js` `installScrollGuard(win, main)`(app.js에서 설치). 안쪽 영역이 '불러오는 중'으로 짧아지거나 떼었다 다시 붙으면 스크롤이 0으로 가던 문제 — 영역별 마지막 위치를 기억해 되돌림. 사용자가 직접 굴린 스크롤·코드의 scrollTop=0/scrollIntoView는 존중, 버튼·링크 클릭 뒤 3초는 새 영역 되돌리지 않음(화면 이동). e2e `run-scrollkeep.mjs`(NOGUARD=1이면 버그 재현).
- 중복 스위치: 기억 고급(`madv.js` 대화에 넣기)의 사람다운 기억·감정 식음·거짓말 추적 제거(간단 '기억 옵션'에만), 예전 세부(`settings.js` renderGlobalSettings)의 기억 넣기 켜기·확장 기억 넣기 제거(고급 '대화에 넣기'에만). e2e `run-dupes.mjs`(탭별 같은 이름 스위치 검사).
- 미확인: 실기기(세 호스트·모바일 터치 스크롤), 하위 화면(봇 세부 설정 등)의 중복.
- 다음: 애드온 구조(프로젝트 문서 claude/addon-plan.md, 1순위 blob import 로더 PoC).

- 회귀(2026-11-05): `engine/regress.js`(regressSlice·regressCandidates·regressLine, 순수) · `data/regress.js`(createRegressChat: 새 채팅 append+chatPage 이동, risupotWikiScopeId=새 id, 폴더 먼저 쓰고 실패 시 deleteFolder) · `ui/screens/regress.js`(신비 창, .rb-rg 범위 CSS) · 진입: chatmenu `dusk-qt-regress`, people.js 더보기·인물 상세, wikiview 헤더. carried 기록은 at:null(주입 최근 제외 회피)·src/hs 제거(대조 되돌림 회피)·회귀자 ctx=always, memoryinject에 Regression 줄. Erosync 값은 옮기지 않음. 테스트 tests/regress.test.js, e2e run-regress.mjs(22). 실기기 미확인.
- 지난 대화 분석 함께 기록(2026-11-05): memoryrunner `backfillExtras`(settings.backfillExtras 기본 true) → link.backfillPot(묶음 끝 index를 auto.schedule)·backfillPotWait(waitForScope 10분)·backfillPotReady(potState+auto.enabled) — memoryturn rt 시작 시 채움. 끝나면 link.backfillErosync(main.js: Erosync 켜짐+read().people 비었을 때 profile start "full"). Erosync 턴 단위 기록은 planner pending 구조라 과거 재생 불가 → 성향 전체 분석으로 대체. 서버 분석 경로는 함께 기록 안 함. 리수폿 일괄: switches.setPotAll/potAllOn(potBots 초기화).
- 이어서 하기(2026-11-05): 회귀 창에서 전부 고르면 `engine/regress.js continueSlice`(폴더 전체 detach·carried, cursor/runs/undo 등 제외, 위키 scope 교체·automation 제거) → `createRegressChat(mode:"continue")`. UI 전체 선택 버튼(.rb-rg-all), 글자 CONTINUE. e2e run-regress 36.
## 2026-11-05 ProtLink+ 통합 (v1.9.2) — Dusk 방식으로 다시 만듦
- `src/protlink/protlink.js`: 원작자 제공 v1.0.0에서 **Proton 연결부만** 쓴다(`loadProtLinkDriver(api)` → `{G3, Sp, Ln, Pa, PZ, Ot}`; G3({kv}).open(url,signal,pw) → share{list,download,thumbnail}, Sp = 폴더 훑기). 원본 화면·앱 로직은 안 쓴다. `node tools/protlink-prune.mjs --write`로 쓰이지 않는 선언을 걷어 냈다(1089KB→912KB, 이름 기준 도달성이라 더 남기는 쪽으로만 틀림). 번들 6.3MB. 고지 `NOTICES.txt`.
- 업데이트 알림: `src/data/updatetoast.js`(retrytoast 방식, mainDom 권한, 실패 시 false→main.js가 앱 내 toast로 대체) + `engine/protlink.js updateMessage`. 실제 호스트(RisuAI/RisuBard/PocketRisu) 동작은 미확인.
- 순수 로직 `src/engine/protlink.js`(파일 종류·연결 후보 순위·스냅샷 비교), 데이터 `src/data/protlink.js`(링크 저장 `dusk.protlink.links.v1`, 설정 `dusk.protlink.settings.v1`, on 키 `dusk.protlink.on` 기본 켜짐, 확인·받기·연결). 원본 `protlink_plus` 켜져 있으면 시작 안 함.
- 화면 `ui/screens/protlink.js`(관리 탭 `protlink`, 플러그인 아래): 링크 추가(주소 → 파일 확인 → 종류·연결 항목 고르기), 목록(새 파일 배지·받아서 업데이트·확인·연결 바꾸기·이름·해제), 시작 확인 설정. 위젯 `protlink`(연결 항목·새 파일 배지, 누르면 탭 열기).
- 받기: 캐릭터·모듈은 `legacy.startWithFiles(files, {target:{kind,id}})` → 가져오기 창에서 연결 항목이 맨 위 후보(`File.protlinkTarget`, legacy.js `candidatesFor`). 플러그인은 파일 저장만(플러그인 목록 쓰기 불가).
- 테스트: `tests/protlink.test.js`, `protlink-engine.test.js`, e2e `run-protlink.mjs`(38), `run-widgethome.mjs`. 스페셜 땡스에 Erosync·ProtLink+ 추가.
- 미확인: 실제 Proton 링크 열기·받기·비밀번호 링크, 받은 파일의 가져오기 창 후보 순위(실제 .risum/.charx), RisuAI/RisuBard/PocketRisu 실기기, 모바일 실기기. 원본 플러그인 저장소의 링크는 자동 이전 안 됨.
- 참고: `run-app.mjs`(리수폿 탭 없음)·`run-tabs.mjs`·`run-hubs.mjs` 첫 항목은 이 작업 이전부터 낡아서 실패/중단.

## 2026-11-05 Erosync 검토 탭·NSFW 기본 칸 (v1.9.2)
- 엔진 `review.list/act`(duskReviewList/Act) → 컨트롤러 `review(op,id)` → `erosyncreviewui.js`(검토 탭). 선호 후보(preferenceState)는 검토 대상 아님.
- 기본 developmentMode = standard_auto(저장값 없는 사용자만 영향). 극단 행동 수위 select는 NSFW+에서만.
- NSFW 탭은 정보 없어도 기본 칸(personv2 `nsfw()`, `.rb-nsfw-base`). 파일 내보내기·불러오기는 인물 위키 ‘더보기’(`peopleMenuItems`).
- 미확인: 실제 호스트(RisuAI/RisuBard/PocketRisu)·실채팅에서 검토 반영/무시, 모바일 실기기 화면. `src/erosync/tape.js` 미사용(삭제는 지시 시).

## Erosync 전체 이전 — 1단계(저장·이전) 완료, 다음은 2단계
- 결정: 저장 키는 원본과 같은 `erosync_*`를 그대로 쓴다(`dusk.ero.v1.*` 이름 변경 안 함). 원본 사용자의 프로필·세션·봇 설정은 복사 없이 이어진다. 기기별 설정(`getLocalPluginStorage`)만 따로일 수 있음.
- `src/data/erosyncmigrate.js` `scanOriginalErosync(api)` — 원본 기록 개수 감지(읽기 전용, 삭제 없음). 테스트 `tests/erosyncmigrate.test.js`.
- 원본 플러그인이 켜져 있으면 시작 막는 동작 유지.
- 2단계 일부 완료: 장기 기억 홈에 "Erosync" 줄(`#rb-mem-go-erosync`, 관계도 줄 옆) → `memory` page `"erosync"`(`erosyncpage.js`: 원본 기록 감지 문구 + 기존 켜기 카드). 홈의 예전 카드는 제거.
- 수위 카드 완료: `erosynclevel.js`(SFW/NSFW/NSFW+, 극단 행동 수위 6단계, NSFW+ 재검사). 엔진 쪽 연결부 `content.get/set`(erosync.js, 허용 키만) → `data/erosync.js content(patch)`.
- 집착 방지 완료: 엔진 `duskGuard`(집착성 상한 clamp + 같은 대상 연속 목표 턴 초과 시 쉬는 턴 동안 pause, `commitPlannedGoals`/`effectiveProfileForDirector`), 저장 키 `dusk.erosync.guard`, 카드 `erosyncguard.js`. 기본 꺼짐.
- 인물 위키 NSFW 탭 완료(상세 정보와 기록 사이, 항상 보임): `personv2.js nsfw()` — Dusk 월경·임신(`parts.adult.cyc`), 성적 욕망·이상성향 후보(`wikiPanel(env,doc,{adult:true})`, 일반 패널에서는 제외), Erosync 성적 항목(`eroNsfwCard`, 켜짐일 때만). 상세 정보의 Erosync 카드는 8축만.
- 데이터 이전 구현 완료: `data/memoryfile.js`(buildMemoryFile/readMemoryFile/applyMemoryFile/clearErosyncData, 파일 kind `dusk-memory-data` v1), `memoryfileui.js`(장기 기억 홈 `#rb-mem-more` 더보기 → 내보내기·불러오기, 위험 구역 `#rb-erosync-clear`). Erosync 켜짐이면 잠깐 멈췄다 다시 켬. 테스트 `tests/memoryfile.test.js`.
- (결정 기록) Erosync "데이터"는 별도 카드 없이 장기 기억 고급의 설정 내보내기·가져오기(`advanced.js`)와 위험 구역 초기화(`madv.js`)에 합친다(Erosync가 꺼져 있어도 저장된 값은 남아 있으므로 엔진 `exportBackup`을 쓰지 않고 저장소의 `erosync_*` 키를 직접 읽고 쓴다. 내보내기에 항상 포함, 가져오기는 같은 키로 복원, 초기화에 "Erosync 값도 지우기" 선택[기본 해제, 켜져 있으면 먼저 끔]. 채팅별 기록은 `keys()` 지원 호스트에서만 찾음).
- AI 제공자 → Dusk 모델 허브 연결 완료: 엔진 `runProviderOnce`에서 기본 제공자(risu)이고 `host.runAI`가 있으면 그쪽으로(main.js `host.runAI` = Dusk `runAI`, stage `erosync-<role>`, noUserPrompts). Erosync 자체 AI 설정에서 다른 제공자를 고른 사람은 그대로 그 경로. 미확인: 실제 모델 호출·동시 호출 충돌(원래 risu 경로의 busy/preempt 처리는 거치지 않음).
- 월경 주기 합치기(방식: Dusk 우선): Dusk ‘월경·임신 기록’(features.openness.cycle && sexualDesireEnabled)이 켜져 있으면 엔진 `cycleOff()`가 참이 되어 Erosync 자체 주기가 쉰다(`flags.set({duskCycle})`, `createErosync cycleProbe` 30초마다 확인). 저장값은 건드리지 않고, Dusk를 끄면 Erosync 주기가 다시 일한다. 미구현: Dusk 날짜를 Erosync 주기 계산에 먹이는 것.
- 동작·분석 / 프롬프트 카드 완료: 엔진 연결부 `config.get/set`(허용 키 11개, normalizeConfig가 범위 정리)·`prompts.get/set`(promptOverrides, 칸 id·갈래 검증) → `data/erosync.js config()/prompts()` → `erosyncconfig.js`·`erosyncprompts.js`. 실제 엔진 대상 테스트는 `tests/erosync-vendor.test.js` 마지막 항목. 이펙트·소리·인트로·화면 배율 등 화면 설정과 시험 도구·초기화·고급 항목은 옮기지 않음(원본 창).
- 원본 UI 제거는 보류: erosync.js 2.6MB 중 화면 코드(약 26000~36800줄, 0.8MB)에 프로필 만들기·분석 실행·값 고치기·비하인드·시험 도구가 있고, Dusk NSFW 탭은 아직 읽기 전용이라 지금 지우면 기능이 사라진다. 먼저 NSFW 탭에 직접 고치기·AI 값으로·다시 분석 연결부를 만든 뒤 제거할 것(이펙트·소리 코드는 이미 쓰지 않음: tape 비움).
- 남은 일: 세 호스트 실기기 확인, 실제 모델 값 확인. (UI·카드·NSFW 탭·원본 UI 제거는 끝)
- 리수폿 성인 항목 기본값은 켜짐 유지(`src/engine/pot/settings.js:163`).

## 2026-11-04 Erosync 2차: 위키·관계도 연동 + 기억 방식 기본값 (버전 미변경)
- **원본 UI 제거(완료)**: `tools/erosync-prune.mjs`(acorn 도달성 가지치기)로 `src/erosync/erosync.js`에서 설정 창·이펙트·소리·관계망·열기 진입점(725문장, 982KB)을 걷어냄. 스텁: scheduleUiRefresh/uiWorkSchedule/openSettingsPanel/renderSettingsApp/scheduleCompatibilityUiRefresh. `ctx.openErosync`·`erosync.open`·`host.openRelmap`·설정 항목 등록 삭제. 엔진 본문을 다시 갱신할 땐 원본에 같은 명령으로 재적용. `tape.js`는 이제 미사용(삭제는 사용자 지시 대기). 번들 5.97→5.35MB.
- **Erosync 카드 위치**: 접힌 ‘설정/세부 설정’ 안(`settings.js` body)에 있어 안 보였음 → `mhome.js` `settingsCards`가 만들어 ‘기억 옵션’ 바로 아래(main 칸)에 둠(간단·고급 모드, 채팅 유무 모두). `settings.js`에서는 뺌.
- **리수폿 사용 스위치 이동**: `autotrackingbox.js`(고급 → 자동 기록 · 인물 추적)에서 빼서 `mhome.js` `settingsCards`의 ‘기억 옵션’ 박스 맨 아래로(열린 채팅이 있을 때만; `M.switches.setPot(cur.chaId, v)`, 상태는 `sw.pot.on`). 열린 채팅이 없으면 안 보임.
- **기억 방식 기본 `fast`→`accurate`**: `DEFAULT_SETTINGS.flow.mode`(memorystore.js)·`flowOf`/`setPotGlobal`/`stepsOf` 폴백·설정 화면(flowsettings)·시작 안내(setup)에서 ‘더 정확하게 (권장)’을 앞에. `DUSK_FOLLOW`에 `"flow.mode": { old: ["fast"] }` 추가 → 기록(`settings.edited`)이 없는 예전 fast는 새 기본으로 따라감. **직접 고르는 두 곳(flowsettings·setup)은 `noteEdits`로 `flow.mode`를 직접 수정으로 기록**(안 하면 고른 fast가 다음 읽기에 accurate로 되돌아감). 테스트 `memoryturn.test.js`의 `turnOn`·fast 직접 설정은 `edited`에 `flow.mode`를 넣도록 고침.
- **읽기 연결부**: 본체 반환 객체에 `read()`(= `duskReadSnapshot`)·`open()` 추가. `read()`는 원본 프로필 화면 경로(`getUiContext`→`contextProfiles`→`uiProfileViewOf`)를 그대로 써서 현재 봇·채팅의 인물(8축 원값/현재값·성적 축·선호·판정)·목표·경쟁·관계를 일반 JSON으로 돌려줌(3초 캐시, 쓰기 없음). `getUiContext`는 원본 UI 경로라 카탈로그 갱신 등 부수 효과가 있음(위키를 열 때만 호출). 컨트롤러 `read()/open()`(꺼져 있으면 `{ok:false, reason:"off"}`/false). `app.ctx.openErosync`는 Dusk 창을 먼저 닫고 연다(같은 iframe).
- **순수 함수** `src/engine/erosyncview.js`: `eroPerson`(이름·별칭이 정확히 같고 유일할 때만 맞춤)·`eroAxes`·`eroAdult`(SFW·비인물이면 null)·`eroGoalsOf`·`eroPair`·`eroRelmapLayer`·`eroRelmapData`(관계도 데이터에서 Erosync 층만 남김, `noUser`).
- **위키(1단계, 읽기만)**: `memory/erosyncwiki.js` + `personv2.js` — 요약 ‘지금 노리는 목표’, 관계 ‘Erosync 목표·경쟁’(Dusk 상대가 없으면 Erosync 상대별 카드), 상세 정보 ‘Erosync 성향’(8축, 바뀐 축은 옅은 막대로 원래 값, 성인 항목은 `<details>` 접힘). Erosync 꺼짐·이름 안 맞음이면 칸 없음. 고치기는 ‘Erosync에서 고치기’→Erosync 화면(저장은 `erosync_*` 그대로). **2단계(저장을 `dusk.mem.v3.*`로 옮기기)와 기록 탭 ‘성향 변화’는 미구현.**
- **관계도**: `relmap.js`에 ‘Erosync 목표·경쟁만 보기’ 칩(Erosync 켜짐일 때만). 인물은 이름·별칭으로 위키와 맞추고 못 맞춘 인물 수는 토스트. `canvas.js` `setData`가 `map.noUser`면 {{user}} 선을 만들지 않음. Erosync 화면의 ‘관계망’ 탭은 `bootErosync(api, host)`의 `host.openRelmap`이 있으면 안내 화면으로 바뀌어 `st.relmap.eroOnOpen`을 세우고 관계도를 열어 자동으로 Erosync 층을 켬(원래 은하 화면은 호출 안 됨, 코드만 남음).
- **배경음 제거**: `tape.js`는 `null`로 비움(본체가 문자열이 아니면 건너뜀) → 번들 7.1MB→5.9MB. 저장 복구 화면은 body 전체 대신 `.es-shell/.es-app`만 비움(Dusk 화면 보존).
- **겹치는 기능 정리(결과)**: ① 관계망 → Dusk 관계도로 일원화(위). ② 인물 성향 화면 → Dusk 위키 칸으로 읽기 연동(Erosync 자체 프로필 화면은 편집용으로 유지). ③ **월경 주기**: Dusk(`openness.cycle`, pot 코드 `cycle-tracking.js`는 자동 생성·수정 금지: 날짜 기반 프로그램 계산·임신 판정·위키 기록)와 Erosync(`cycleEnabled`: AI 관찰·장면 판단 반영)는 강점이 달라 한쪽을 자동으로 끄지 않고, **둘 다 켜지면 Erosync 카드에 겹침 안내**만 띄움. ④ **AI 제공자 설정**: Erosync는 자체 AI 탭(기본 ‘RisuAI 보조 모델’)을 유지. Dusk 모델 허브 연결은 `runProviderOnce`(erosync.js `providerId` 분기)에 `dusk` 제공자를 추가하면 됨 — 미구현.
- 테스트: `erosyncview.test.js`(5) · `erosync.test.js`(+read) · `erosync-vendor.test.js`(+read·관계망 분기) · e2e `run-erosync-ui.mjs`(PC·모바일 28: 관계도 버튼·자동 켜짐·위키 3탭·고치기 호출) · `run-erosync.mjs`(+겹침 안내). 
- 못 한 것/미확인: 세 호스트 실기기, 실제 모델로 `read()` 값(축·목표) 채워진 상태, `getLocalPluginStorage`가 플러그인별로 나뉘는지(원본 Erosync 데이터 이어받기), Erosync 화면이 Dusk 창과 같은 iframe에서 겹칠 때 실제 모양(Dusk 창을 닫고 여는 것까지만 구현).

## 2026-11-04 Erosync 격리 이식 (V0.9.1, 버전 미변경; CHANGELOG는 ‘(개발 중) v1.9.2’ 섹션)
- 원작자에게 제공받은 `Erosync V0.9.1.js`(36.8k줄, api 3.0)를 위젯 홈처럼 격리 이식. 기억 설정(전체 설정)의 ‘Erosync (NSFW 장면 강화)’ 카드에서 켜고 끔(키 `dusk.erosync.on`, 기본 꺼짐). **비용 안내 문구 포함**(`EROSYNC_COST_NOTE`). 성인 인물 한정 문구·검사는 사용자 결정으로 넣지 않음(Erosync에 원래 없음).
- 구조: `src/erosync/erosync.js`=원본 본문 그대로 + 3곳만 변경(머리말 `//@` 제거, 즉시실행 함수→`bootErosync(api)`, `R`을 api 프록시로 바꿔 `onUnload`를 가로챔 → 끌 때 `dispose()`가 원본 정리 함수를 부름), `tape.js`=배경음 base64 분리(886KB). `src/data/erosync.js`=컨트롤러(`createErosync`, 본체는 켤 때만 `import()`), `src/ui/screens/memory/erosyncui.js`=카드, `main.js`에서 `app.ctx.erosync`로 연결·`boot()`.
- 원본 `erosync` 플러그인이 켜져 있으면 시작하지 않고 안내(같은 요청 이중 주입·같은 저장 키 방지). 요청 훅(`addRisuReplacer`)이 없으면 시작 안 함. 켜기 실패하면 스위치를 되돌리고 저장값도 off.
- Erosync 자체 UI(채팅 ‘에로싱크’ 버튼, 리스 설정 ‘Erosync’ 항목, 관계 그래프)는 원본 그대로 동작. Dusk 주입(`[Dusk Memory]`)과는 별도 `beforeRequest` 훅 두 개가 나란히 돎(마커가 달라 서로 안 지움).
- 번들 크기 4.9MB → 7.6MB(+2.7MB) → 배경음 제거 뒤 5.9MB. 빌드 경고 1건은 원본의 중복 키 `model`(src/erosync/erosync.js 3890, 원본도 동일).
- 테스트: `tests/erosync.test.js`(컨트롤러 7) · `erosync-vendor.test.js`(실제 본체를 가짜 api로 올려 훅 등록·해제, 지문 5) · e2e `tests/e2e/run-erosync.mjs`(PC·모바일 14). npm test 1013 pass / 9 skip / 0 fail, check 동일함.
- 못 한 것/미확인: 세 호스트 실기기(특히 `getLocalPluginStorage`가 플러그인별로 나뉘면 원본 Erosync의 기존 데이터가 안 보일 수 있음 — 기존 사용자는 확인 필요), Erosync 설정 화면이 Dusk 창과 겹칠 때의 화면 겹침, 켜진 상태에서 Dusk 기억 훅과의 순서·토큰 합산. 비용은 안내 문구만(호출 수 제한 없음). 안내서(`docs/site/guide/memory.html`)·NOTICE.md 갱신함, CHANGELOG는 버전 지시가 없어 안 건드림.

## 2026-11-04 도구 → 용량 측정 (RisuMeter 참고, 버전 미변경)
- 사용자가 준 `risu-meter.js`(v0.6.0)를 분석해 **읽기 전용 측정 부분만** 새로 씀(코드 이식 아님 → NOTICE 불필요, 스페셜 땡스에 `RisuMeter`만 추가: tools.js `THANKS`, README, 안내서 start.html). 버린 것: 연결 편집 모달(전체 `setDatabase` fallback 위험 — 연결 편집은 기존 `modlinks.js`), 바로가기 4종, 자체 CSS·테마, 저장 방식 감지·전송/원본 기준 전환(추정 상수 의존).
- 구조: 순수 `src/engine/sizemeter.js`(바이트·분해·렌더 진단·리포트) / 수집 `src/data/sizemeter.js`(`scanSizes`) / 화면 `src/ui/screens/sizemeter.js` + `sizemeter/css.js`(`SIZE_CSS`, styles.js에서 합침) / 진입 도구 탭 '확인·복구' 행 `rb-tool-sizemeter`(`ctx.go("tools","sizemeter")`).
- 읽기: 봇은 `characterOrder`로 순서를 얻고 `getCharacterFromIndex`를 4개씩 읽자마자 `measureCharacter`로 크기만 남기고 버림(전체 `getDatabase(['characters'])` 안 씀). 채팅은 한 번만 직렬화. 모듈·플러그인은 한 번의 `getDatabase`. Dusk가 꺼 둔 모듈(`rbm:disabledModules:v1`)은 `parked`로 포함하고 그 키는 저장소 목록에서 뺌(중복 방지). 저장소는 `storageKeyList`+`storageGet`을 6개씩.
- 활성 판정: 글로벌(`enabledModules`) · 캐릭터 연결 · 채팅 연결 · 네임스페이스(`moduleIntergration`) 중 하나. 없는 모듈 id(고아)는 캐릭터의 '연결된 모듈'에서 제외.
- 렌더 진단 개선점: display 핸들러 **호출 범위 안**의 `getDatabase/getChar*`만 '고부하'(원본은 스크립트 전체). 주석은 지우고 문자열 안 `//`는 유지. 핸들러를 이름으로만 넘기면 고부하로 단정 안 함(score 2). 화면 감시는 `getRootDocument`+`MutationObserver`/`createMutationObserver`. 모듈은 Lua editDisplay·display 트리거·editdisplay 정규식(8개 이상이면 개입).
- 테스트 `tests/sizemeter.test.js`(16) · `sizemeter-data.test.js`(6, 동시 읽기 ≤4·쓰기 0·취소·저장소 실패), e2e `tests/e2e/run-sizemeter.mjs`(PC·모바일 28개). `run-work.mjs` 기대값을 도구 행 5개·땡스 8줄로 고침(땡스는 이전부터 낡은 값이었음).
- 못 한 것/미확인: 세 호스트 실기기에서 측정 시간·메모리(특히 큰 봇 수백 개), 호스트가 `getCharacterFromIndex`에 채팅 스텁을 줄 때의 크기 해석(스텁이면 채팅이 작게 나옴 — 화면 문구는 'JSON 크기 기준'), 기타 설정(페르소나·CSS)·프롬프트 프리셋은 측정 안 함.

## 2026-11-04 위젯 홈 원본 v1.0.34 병합
- 방법: 원본 v18·v34에 같은 1단계 변환(scratchpad의 port 스크립트)을 적용한 뒤 `git merge-file`로 우리 수정과 3방향 병합. 충돌은 core(themePreset·dusk + photoSlotsRevision), widget-layout(IDS 14개: 원본 realm·photo2·photo3 + Dusk 5개, ORIGINAL 기준 예전 배치 허용), home.js 6곳(툴바 옵션·extras 삽입·Editor 문서 어댑터·realm import·hideBox·dispose)을 손으로 합침. style.js는 v34 CSS로 다시 만들고 우리 수정(overflow-x:clip, overscroll 제거, 편집 CSS) 재적용.
- 새 `lib/realm.cjs`: 소개 창을 Shadow DOM에 붙임(`getRootNode`), 홈 영역 찾기는 전역이 없으면 `home-layout.cjs` require(실패해도 무시). 사진 2·3 파일 입력 복제본도 `sr`에 붙임. 포켓리스 문구 2곳 중립화.
- 원본 테스트 test_photos·test_realm·test_realm_download·test_realm_mobile 이식(`tests/widgethome-*.test.cjs`). test_realm의 dock 기대값은 우리 설정 시트(`openSheet`)로 바꿈.
- 다음에 원본이 또 오면: 같은 방법(1단계 변환 → merge-file). 변환 스크립트는 리포에 없음 → `HandOff`에 옮길지 결정 필요.

## 2026-11-04 채팅 메뉴 버튼 id
- `memorybutton.js` registerButton에 `id:"dusk-memory-button"`, 메인 햄버거 버튼 `id:"dusk-atelier-open"`. 포켓리스의 떠 있는 버튼 위치 옮기기·기억이 id 기준이라는 추정(기기 확인 필요).

## 2026-11-04 위젯 홈 설정 시트·색 테마
- `src/widgethome/sheet.js`: `PRESETS`(18개, 앱 팔레트 형식) · 시트 HTML/CSS · `createSheet`. 위쪽 설정/홈 꾸미기·독 홈 꾸미기·제목 연필이 시트를 연다(제목 연필은 홈 탭). 바꾸면 `setPrefs`로 바로 저장.
- 색: core settings에 `themePreset`. `applyColors`가 리스 색을 따르지 않으면 `presetById(themePreset).base`를 앱 팔레트처럼 써서 모든 위젯에 적용. ‘위젯마다 직접’ = themePreset 비움 + 예전 꾸미기 창.
- Dusk 설정 카드의 위젯 디자인·자동 열기·꾸미기 버튼은 사용자 요청으로 뺌(위젯 홈 안에서 바꿈).

## 2026-11-04 위젯 홈: 사이드바 옆 배치·Dusk 디자인
- `lib/home-layout.cjs` `mainPane()`: 포켓리스 홈이 아니면 `.risu-sidebar/.rs-sidebar` 오른쪽의 가장 큰 본문 요소를 홈 자리로(사이드바를 품은 감싸개 제외). `found.generic`이면 관련 링크·네이티브 컨트롤 안 씀. 프레임 찾기는 `iframe[srcdoc*="dusk-widgethome-open"]`(원본 플러그인과 구분), 속성 접두사 `x-dusk-wh-`. **리스·리스바드의 실제 클래스명(`.risu-sidebar`)은 기기 확인 필요**(PocketRisu 원본 코드가 쓰던 이름).
- `lib/auto-home.cjs` `isHome`: 포켓리스 제목이 없어도 캐릭터 미선택(index<0)+설정/대화상자 없음이면 홈.
- 바로 열기는 자동 감지 연결(`inst.ready()`, 최대 2.5초)을 기다린 뒤 아직 안 떴으면 연다.
- `dusk-style.js`: 설정 창 공통 스타일(스위치·알약 라디오·대화상자)과 `data-surface="dusk"`. surface 값 navy/glass/dusk. 대화상자 바깥 클릭 닫기. 인스턴스 `getPrefs/setPrefs/openSettings` → Dusk 카드(디자인 segmented·홈 자동 열기 스위치·위젯 꾸미기 버튼).
- e2e `tests/e2e/run-widgethome-host.mjs`(가짜 SafeDocument로 사이드바 옆 배치·캐릭터 선택 시 닫힘·홈 복귀 시 다시 열림·사이드바 크기 추적·Dusk 디자인·설정 창).
- 남은 것: Dusk 디자인에서 음악 재생 버튼·시계 바늘·하단 독 활성색 등 원본 고정색 일부는 파란색 그대로.

## 2026-11-04 위젯 추가·크기 조절·스크롤 유지
- 새 위젯 `src/widgethome/extras.js`(HTML·CSS·동작·순수 함수): dusk·dday·timer·dice·stats. `widget-layout.cjs` IDS 11개, `ORIGINAL`(6개)만 있으면 예전 배치로 인정하고 없는 새 위젯은 맨 아래에 붙임. 저장 키 ddays·dice·visits(같은 접두사). Dusk 바로가기는 `createWidgetHome({openDusk})` → main.js `app.open({tab})`.
- 크기 조절: hit의 오른쪽 아래 28px를 마우스로 잡으면 resize, `follow()`가 width/height calc로 따라감. 스냅 히스테리시스 0.65칸, 끄는 동안 격자 min-height 고정(스크롤 되먹임 방지), 가장자리 스크롤 48px·거리 비례.
- 스크롤 유지: `ui/dom.js` `replace()`가 `data-keep-scroll`(app main) 안에서 같은 화면(`data-view`=tab|sub, 첫 자식 data-page/class 같음)을 다시 그리면 `.rb-scroll`·main 스크롤을 복원(불러오는 중 화면을 거쳐도 기억).
- 관계도: `.rb-rm`에 padding(18px 22px, 모바일 12px 16px).
- 테스트 `widgethome-extras.test.js`, e2e 위젯 49개(크기 조절·되돌이 깜빡임·새 위젯·Dusk 바로가기).

## 2026-11-04 위젯 홈 수정(속도·스크롤·드래그·바로 열기)
- 스크롤: `:host`에 overflow-x:hidden/overscroll-behavior를 주면 호스트가 스크롤 상자가 돼 휠이 문서로 안 이어짐 → `overflow-x:clip`만 사용(style.js 머리 주석 참고). e2e가 휠 스크롤을 확인.
- 속도: `open()`이 목록(`reloadCatalog`)을 기다리지 않음(60초 안 캐시면 생략), `themeFollower.refresh`·`auto.configure`도 비동기. boot 때 `restore()`→`reloadCatalog` 미리 읽기. 느린 가짜 호스트(getDatabase 1.5초)에서 열기 1987ms→213ms.
- 바로 열기: `data/widgethome.js` `boot()`가 시작 뒤 `inst.open()`(키 `dusk.widgethome.onload`, 기본 켜짐, 카드에 스위치).
- 드래그: `lib/layout-editor.cjs` — `layout-hit`에 마우스·펜 pointerdown→`begin(move)`, `follow()`가 transform으로 손을 따라가고 `release()`가 놓을 때 해제(CSS transition으로 스냅). 터치는 hit이 `touch-action:pan-y`라 스크롤과 충돌하므로 ⠿ 손잡이만.
- 문구: h1 ‘위젯 홈’, `.related-links`는 `onPane`(포켓리스 홈에 겹칠 때)에서만 표시.
- 자동 열기(inline) 안 되는 원인 후보: 호스트의 화면 접근(`getRootDocument`) 권한이 Dusk 플러그인에 없을 때. 카드의 안내 줄과 위젯 홈 설정의 `.auto-status`에 이유가 뜸. 기기 확인 필요.

## 2026-11-04 {{user}} 표시·집단 이름 걸러내기
- `memory/common.js` `avatar`·`isMe`·`shownName`: {{user}} 동그라미는 `userLabel()` 첫 글자 + `data-me`(강조색, styles.js `.rb-mem-av[data-me]`). `people.js` 카드에 `me` 클래스·‘나’ 배지·맨 앞 정렬, 상세 제목도 표시 이름.
- `engine/collective.js` `isCollectiveName`/`COLLECTIVE_RULE`: 반·학년·동급생·…들 같은 집단 이름. 지난 대화 분석(`memoryprompt.js` 규칙 + `memoryapply.js` 필터)과 위키 writer(`tools/pot-patches.json`에 writer-prompt.js 패치 2개: import + 요청의 `dusk_character_rule`)에 적용. 원본 pot 소스가 없어 pot-split 재생성은 못 돌려 봄 → 다음에 원본이 있으면 패치 일치 확인.
- 로어북 읽기: `writerSearchExistingLore`는 이미 기본 켜짐(기존 인물을 찾는 용도라 집단 이름을 막지 못함). 그래서 규칙+필터로 처리.
- 테스트 `tests/collective.test.js`, e2e `tests/e2e/run-useravatar.mjs`.

## 2026-11-04 위젯 홈 이식 (PocketRisu 위젯 홈 v1.0.18, 격리 이식)
- 원본(사용자 제작, zip)을 `src/widgethome/`로 옮김: `lib/*.cjs`(원본 모듈 14개, require 경로만 .cjs로), `style.js`(원본 style.css의 :root/html/body → :host, `:host([hidden])` 추가), `home.js`(원본 view.js를 `bootWidgetHome(api, hostOpts)`로). 원본 대비 바뀐 곳은 home.js 안에서 `sr`(shadowRoot)·`hostEl`·`showBox/hideBox`·`dispose`를 찾으면 돼요. layout-editor에는 `document:{createElement, querySelector→sr}` 어댑터를 넘김.
- 격리: 문서 body에 `<div data-dusk-widgethome hidden>` + Shadow DOM. 위젯 CSS는 Dusk 화면에 새지 않음(e2e로 확인). 같은 플러그인 iframe을 번갈아 쓰므로 Dusk 창을 열기 전 `widgetHome.yieldToDusk()`로 위젯 홈을 닫음(`main.js`에서 `app.open` 감쌈). 위젯 홈을 Dusk에서 열 때는 `ctx.openWidgetHome()`(Dusk 닫고 열기).
- 켜고 끄기: `src/data/widgethome.js` `createWidgetHome`(키 `dusk.widgethome.on`, 기본 꺼짐). 설정 탭 맨 위 카드(`devtools.js` `widgetHomeCard`, 고급 모드 아니어도 보임) + 도구 화면 ‘위젯 홈’ 행. 끄면 `dispose`가 호스트 제거·메뉴 버튼 해제(`unregisterUIPart`).
- 메뉴 버튼 id `dusk-widgethome-open`(원본의 `pocketrisu-basic-home-open`과 다름). 원본 플러그인(`pocketrisu_basic_home`)이 켜져 있어도 Dusk 쪽이 그대로 동작하고, 카드에 끄라는 안내만 뜸. 저장 접두사 `pocketrisu.basic-home.v1.` 그대로라 기존 데이터를 이어 씀.
- 호스트 대응: 저장은 `getLocalPluginStorage`→`pluginStorage` 대체(원본 동작). `getRootDocument`·`createMutationObserver`가 없으면 자동 열기만 못 하고 메뉴 버튼은 됨(e2e: 최소 api에서 열림·경고창 없음). 자동 열기 감지(`auto-home.cjs` `isHome`)는 PocketRisu 홈 화면의 ‘PocketRisu’ 제목 + ‘Related Links/관련 링크’ + `getCurrentCharacterIndex()<0` 기준이라 **리스·리스바드에서는 화면이 달라 자동으로 안 열릴 수 있음(기기 확인 필요)**.
- 테스트: `tests/widgethome-*.test.cjs`(원본 4개 이식) · `widgethome-ctrl.test.js`(컨트롤러 9) · e2e `tests/e2e/run-widgethome.mjs`(격리·열기/닫기·정리·최소 api·설정 카드·도구 행, PC/모바일).
- 못 한 것: 세 호스트 실제 기기 확인(특히 홈 영역 배치·자동 열기·음악 파일 저장), 원본 design.js의 Butter Home v8 출처 라이선스 확인(NOTICE.md에 메모).

## 2026-11-04 프로바이더는 실험 기능으로만 노출
- `prefs.ui.experimental`(설정→실험 기능, `devtools.js` `experimentalCard`). 꺼짐이면: provider 탭 숨김(`tabs.js` `exp`·`tabHidden`), 꾸미기는 원래 자리(큰 카드), registrar·Dusk 자체 AI 경로 모두 막음(`createProvider({allowed})`, main.js `providerRef.exp`). 켜면 꾸미기는 도구로 이동(`hideWhenExp`). 한 번 등록된 이름은 리스를 다시 열 때까지 남음(removeProvider 없음).

## 2026-11-04 프로바이더(Dusk provider) 1차 구현 (버전 미변경, 미커밋 → 이 커밋에 포함)
- 계획 문서: 프로젝트 문서 `claude/provider-plan.md`. CPM v1.99.7·LBI-pre34-plus는 **기능·구조 분석만** 했고 코드는 가져오지 않음(CPM은 분석만 허락받음, UI·설정 가져오기 제외).
- 구조: 순수 `src/engine/provider/`(catalog·sse·messages·build·repeat·keypool·chain·cost·profile·transforms·tools·translate), 호스트 연결 `src/data/provider/`(keyvault·store·transport·gemcache·risutools·runner·toolexec·models·register·index), 화면 `src/ui/screens/provider.js`+`provider/{more,ui,css}.js`.
- 화면 이동: `look`(플러그인 꾸미기) 탭은 `hide:true`로 목록에서 숨기고(id 유지: 위쪽 팔레트·설정 링크 그대로) 도구 화면에 행 추가, 작업실 큰 카드는 `provider`. 숨김 필터는 app.js 3곳·sectionhome.js.
- Dusk 자체 AI 연결: 용도 `analysis` 프로필 지정 시 `engine/runai.js` `duskPickFor`가 보조 모델 호출을 프로필로 보냄, `modelhub.js` `serverModelOf`는 `provider.serverModel`(Vertex·Responses는 서버 직접 호출 불가 → 중계).
- (2026-11-04 화면에서 제거) 도구·검색·번역기 탭은 사용자 요청으로 화면에서 뺌. 엔진·runner·risutools·translate 코드는 그대로 남아 있고 설정 `tools.enabled`/`translator.enabled`가 기본 꺼짐이라 동작하지 않음(필요하면 more.js에 탭을 다시 달면 됨, git 이력 참고).
- 번역기 다듬기는 runner `handle`에서(서식 보호 토큰·용어집·안내문). `req.__purpose`/`req.__profile`로 용도·프로필 강제.
- 쓰기 도구 안전장치: 설정에서 따로 켬 · 매번 확인 · 바꾸기 전 백업(실패하면 중단, 되돌리기 목록에 뜸) · 요청당 3번. (웹 도구와 같은 요청에서 쓰기 막기는 **의도적으로 넣지 않음**, 화면에 경고 문구만.)
- 검증: provider-engine 29 · provider-runner 26 pass, e2e `run-provider.mjs` PC·모바일 통과. `run-look`은 꾸미기 진입을 `__app.ctx.go("look")`로 바꿈. `run-app.mjs`·`run-hubs.mjs`(기억 개요 3줄)는 변경 전에도 실패하던 낡은 기대값.
- **못 한 것/미확인**: ① 호스트 `addProvider` 실제 동작(RisuAI·RisuBard·PocketRisu) ② 실제 공급자 계정으로 호출 ③ iOS 백그라운드 ④ Bedrock·NovelAI 연결 ⑤ 배치(Anthropic·OpenRouter) ⑥ 참고자료 PDF 변환 ⑦ Cellar 경유 대화 전달(서버 분석만 연결됨) ⑧ 키 암호화·동기화 ⑨ 웹 검색 키는 pluginStorage(동기화될 수 있음) ⑩ Cellar 쪽 시험 추가 없음.
- 메인/보조: `cfg.subProfileId`(profile.js). resolve: 메인=봇별→메인, 그 밖=용도 지정→보조→메인. `analysisPick`(index.js)은 analysis 지정 또는 보조가 있을 때 Dusk 자체 AI를 프로필로 보냄(둘 다 없으면 기존 보조 모델 경로).
- OpenRouter 공급자 순서/폴백 입력(provider.js, `params.provider.{order,allow_fallbacks}`), 프리셋은 params 객체 값을 안쪽 키만 넣고 뺌(presets.js).
- 생각 강도: `thinking.effort` ∈ ""(안 보냄)·none·low·medium·high·xhigh 하나로 통일(build.js: OpenAI 그대로 / Claude 적응형+output_config, none이면 생각 끔 / Gemini 3=thinkingLevel·2.5=thinkingBudget 0). `mode`·`budget`은 고급의 토큰 예산용으로만 남음.
- 빠른 설정 프리셋 `engine/provider/presets.js`(프로필 params·headers·tier에 넣고 뺌, anthropic-beta는 쉼표로 겹침) + 연결 카드 모델 검색(화면 안에서만 거름). 프리셋을 늘리려면 PRESETS 배열에 항목 추가.
- 안내서 `docs/site/guide/provider.html` 추가, CHANGELOG는 v1.9.1 섹션에 적음(버전 올릴 때 옮길 것).

---

## 2026-11-04 기본값 변경 (버전 미변경)
- 기억 넣기 기본값: 목표 2000 · 상한 8000 · 이야기 요약 2000 토큰 (`data/memorystore.js` DEFAULT_SETTINGS, `engine/memoryinject.js` 대체값).
- 기존 인물 로어북 검색(`writerSearchExistingLore`) 기본 켜짐: 생성물 `engine/pot/settings.js`는 `tools/pot-patches.json` 패치로 바꿈(직접 고치지 말 것).
- **직접 안 바꾼 값은 기본값을 따라감**: `engine/defaultfollow.js`(`followDefaults`·`noteEdits`, 표 `DUSK_FOLLOW`·`POT_FOLLOW`).
  - Dusk 설정: 읽을 때 `memorystore3.js` `withFollow`가 적용, 직접 바꾼 키는 `settings.edited`에 기록(`ui/screens/memory/settings.js` save에서 `noteEdits`). 기록이 없던 예전 사용자는 값이 예전 기본값(1200/2500/600)이면 새 기본값으로, 다르면 직접 바꾼 것으로 기록해 지킴.
  - 리수폿 설정: `data/potstorage.js`가 읽을 때 적용, 저장 때 바뀐 키를 `idx.pot.edited`에 기록.
  - 기본값을 또 바꿀 때: DEFAULT_SETTINGS(또는 POT_DEFAULTS)를 고치고, 표의 `old`에 이전 기본값을 추가.
- 테스트 `tests/defaultfollow.test.js`. 검증: npm test 846 pass / 0 fail, build·check "동일함 (v1.9.1)", e2e smoke·memed 통과. `run-app.mjs`는 변경 전에도 같은 오류(`reading 'click'`)로 실패(기존 문제).
- 이 브랜치의 package.json은 아직 1.9.1. CHANGELOG는 맨 위 v1.9.1 섹션에 적었음 — 버전 올릴 때 옮길 것.

## 인물 관계도(반3D) — 1차 구현 완료 (2026-11-04, 미릴리스)
- 목업: 프로젝트 문서 `claude/mockup-relmap.html`, 계획: `claude/relmap-plan.md`.
- 구현: 탭 `relmap`(기억 그룹, `ui/tabs.js`·`ui/app.js`) / 화면 `ui/screens/relmap.js` / canvas `ui/screens/relmap/canvas.js` / CSS `ui/screens/relmap/css.js`(styles.js에서 합침) / 데이터 `engine/relmap.js`(순수, `tests/relmap.test.js`) / e2e `tests/e2e/run-relmap.mjs`.
- 진입: ① 채팅 메뉴 떠 있는 버튼(`data/memorybutton.js`, main.js `openRelMap`, 설정 키 `dusk.ui.memoryButton` 그대로, 이름·아이콘만 관계도로) ② 장기기억 홈 '나에 대한 기억' 아래 줄(`mhome.js` `mapRow`) ③ 사이드 메뉴 탭.
- 빨리 뜨게: `peekCurrent` 캐시 사용, 같은 채팅이면 만든 DOM 재사용(`ctx.state.relmap.view`) + 뒤에서 폴더만 다시 읽어 서명이 바뀔 때만 다시 그림, 탭에서 떨어지면 rAF 루프 정지(`stage.isConnected`), 열 때 `getCharacterFromIndex` 호출 없음.
- 데이터(새 필드 없이 기존 기억만): 호감도 = `folder.emo`(그 인물→{{user}}) 좋은 쪽(애정·신뢰·존경) − 나쁜 쪽(적대·두려움)을 0~100으로, 감정 없으면 50. 중요도 = 기록 수 + 최근 20응답 기록. 이번 턴 = 마지막 분석 응답(`nowOf`)에 기록·장면이 있는 인물. NPC 선 = `folder.rels`(+/− 개수로 색, 개수로 굵기, 최근 5응답 변화는 빛남). 점선 = 풀리지 않은 갈등·오해(rifts/beliefs). 인물 최대 40명(중요도 순).
- 아직 안 한 것(다음): ① 소속(`person.faction`)·상태(`person.status`)는 화면이 읽을 준비만 됨, 추출 안 함(없으면 소속 없이 고르게 배치, 필터 숨김) ② 턴 되감기·▲▼ 변화(턴별 호감도 스냅숏 필요) ③ 선의 특수 관계 종류·원문 인용(`kind`/`q`) ④ 실제 터치 기기의 길게 누르기·두 번 누르기·핀치 미확인(헤드리스에서 포인터 이벤트만 확인) ⑤ BardWiki 저장소일 때의 폴더 읽기는 `M.store.getFolder`만 사용(장기기억 홈과 동일).
- 검증: npm test 전부 통과(tests/uimode.test.js 탭 목록 기대값에 relmap 추가), build·check "동일함", e2e `run-relmap.mjs` 22개 통과(PC·모바일).
- 2026-11-04 추가: 관계도 차가운 색 파랑(`--rb-blue` 토큰, theme.js 팔레트 4종) · {{user}} 이름 모으기를 `data/usernames.js`로 통일(username + 선택/전체 페르소나 + 첫 단어; memoryrunner·mepage가 사용). 테스트 `tests/usernames.test.js`.
- 2026-11-04 추가: 관계도 가운데·안내 글을 페르소나 이름으로 표시(`usernames.js` `primaryUserName`, `username.js` loadUserName), 옛 기록 자동 합치기 `data/usermerge.js` `autoMergeUser`(관계도·'나' 화면을 열 때; '나로 합치기' 버튼은 실패 대비로 남김). 테스트 `tests/usermerge.test.js`.
- Cellar 서버 분석(2026-11-04, Cellar 브랜치 0.1.1): 엔진 묶음 `src/cellar/node-entry.js`(러너·저장소·`callWriterModel`·`toPrompt/fromReply`·`folderIdOf`) + `tools/build-cellar-engine.mjs`(분석·모델 호출 코드를 바꾸면 다시 빌드해 Cellar `engine/atelier-engine.mjs`에 커밋). **연결:** `data/cellaranalysis.js`(`prepare`: 기억이 서버 모드·온라인·features analysis일 때만; 서버가 직접 부를 수 있으면 직접, 아니면 `analysis-relay`면 중계; `run`: start → 폴링 → 취소 시 cancel, 시작 전 실패·501은 null → 기기 방식, 시작 뒤 오류는 던짐, 상태 6번 연속 실패면 '연결 끊김'; `resume`: 리스 화면을 다시 열면 `memory.js` detect 뒤 `runner.resumeServer()`가 중계 대기 작업을 이어받음), `modelhub.js` `serverModelOf`(**중요: 기억 분석의 기본 모델 mode는 리스 쪽(submodel 등)이라 custom이 아님 → 설정 `serverModel.presetId`(기억 설정 '서버 분석에 쓸 모델')로 '내 API' 프리셋을 고른 경우에만 직접 호출.** 프리셋·키를 `{kind:"preset"}`로 보내면 Cellar가 같은 llm-client 코드로 호출 — risuai 프리셋만 거절), `memoryrunner.js` backfill 앞 훅(`server` 옵션, 설정 `serverAnalysis` 기본 true, 끝나면 dropCache + 빈 updateFolder로 인덱스 요약 갱신), 설정 스위치·모델 선택(memory/settings.js). 기억 손실 방지(Cellar): 충돌 시 모델 재호출 없이 새로 읽은 폴더에 재적용, 분석 전 폴더 사본 `dusk-data/analysis-backups/`(최근 5개). 시험 `tests/cellaranalysis.test.js` 11개 + Cellar 동시 쓰기·취소 후 재시작·백업·Vertex JWT 시험. 자동 기록은 서버로 안 보냄. 실제 서버 미확인.
- 버그 수정(2026-11-04): ① 2단계 줄 파서가 'Other'(프롬프트 예시)를 상대 이름으로 저장 → `memorylines.js` `targetName`/`realText`로 거름 ② `stageOf`(memoryhuman.js)가 장면 수만 봐서 친한 사이로 시작해도 '처음 봄' → 추억·rels·반말이 있으면 '처음 봄'만 벗김(그 위 단계는 장면 수·감정 그대로). 테스트 `tests/memory-stage-placeholder.test.js`. 이미 저장된 'Other' 항목은 자동 정리 안 함.
- 초기 관계 감지(2026-11-04): 2단계 줄 `start|상대|close or friendly|원문 인용`(사전관계) → `folder.start[쌍키]={a,b,level,q}`(처음 한 번, 인용이 본문에 있어야 함) → `stageOf`가 close=최소 '친한 사이', friendly=최소 '아는 사이'로 바닥을 깖. 가벼운 모델 모드에서는 이 줄을 안 물음. JSON 응답 경로도 `start` 통과. {{user}}로 합치기(`memoryuser.js` rekey)·`pairView().start`·'나' 화면 칩까지 반영. 아직 안 한 것: 일반 인물 합치기(`peoplemerge.js`)는 emo 등과 마찬가지로 별칭에 의존, 인물 위키 관계 탭 표시.
- 다시 분석(2026-11-04): `memoryrunner.js` `planBackfill(.., {all:true})`·`backfill(.., {redo:true})`·`analyzeAt({redo})`(cursor 중복 방지 우회). 홈의 '지난 대화 분석'(`mhome.js` analyze)에서 미처리가 0이면 "이미 모두 분석했어요" 확인창 → 전체 재분석. 설정 폴드의 '미처리만 분석'(`settings.js`)은 그대로. 테스트 `tests/memoryrunner.test.js`.
- 관계도 성능(2026-11-04): `buildRelMap`이 모든 인물에 `counterparts`·`pairView`를 돌려 큰 기억(인물 400·장면 3000)에서 3.7초 걸림 → 값싼 중요도(기록만)로 상위 40명을 먼저 고른 뒤 그 40명에만 `pairView`(0.2초). `tests/relmap.test.js`에 시간 상한 테스트. 아직 안 본 것: 실제 브라우저에서 그리기 루프 프레임 비용(저사양 폰), 폴더 JSON 읽기 자체의 시간.
- 분석 메모리(2026-11-04): `memoryrunner.js` `backfill`이 묶음(3응답)마다 `getCharacterFromIndex`(딸린 채팅 전부 복사)·`getChatFromIndex`를 다시 읽어 큰 채팅에서 OOM 의심 → 시작 때 1번만 읽고 `analyzeAt({shared})`로 넘김, 생성 확인은 5묶음마다 현재 채팅만. 테스트 `memoryrunner.test.js`(호출 횟수). 실기기(아이폰) 효과는 미확인. 다음 후보: Cellar 서버에서 분석 실행(사용자 결정: 서버 사용자만 더 가볍게, Cellar가 리스 데이터를 읽는 것은 허용).
- 이 브랜치의 package.json은 아직 1.9.1. CHANGELOG 항목은 맨 위 v1.9.1 섹션에 있음 — 버전 올릴 때 옮길 것.

---

# 현재 상태 — feat/1.8.1 (main v1.8.0 대비)

검증(2026-11-01): `npm test` 462 pass / 0 fail / 9 skipped(471), `npm run build` 후 `npm run check` → "동일함 (v1.8.1)" (빌드물 최신). 버그 5건 수정분은 아래 "추가 수정" 참고(미커밋 상태일 수 있음: git status 확인).

## v1.8.1 변경 요약: 장기기억 메시지 식별 충돌 수정
**문제:** 메시지 식별에 본문 앞 200자 해시(`hashText`)만 써서, 앞부분이 같은 긴 응답들이 같은 메시지로 취급됨 → 중복 분석 누락·잘못된 앵커 연결.

**해결:** 메시지 ID(`chatId`) + 본문 전체 64비트 해시로 식별.

| 파일 | 변경 |
|---|---|
| `src/engine/chattext.js` | `fullTextHash`(전체 본문, FNV-1a 2개 결합 64비트), `messageIdOf(m)`, `messageIdentity(m)` → `"mid:<id>:<hash>"` 또는 `"body:<hash>"`, `legacyMessageHash(m)`(예전 200자 해시). `hashText`는 호환용으로 유지 |
| `src/engine/memoryreconcile.js` | `indexMessages`에 `byLegacyHash` 추가. `fix()`가 예전 해시를 새 식별자로 **마이그레이션**(at·h·mid 갱신). 같은 ID라도 본문이 바뀌면 새 메시지(리롤 안전). 예전 해시가 여러 메시지와 겹치면 연결하지 않고 orphan → 재분석 대상. `done`/`failedBackfill`/`cursor`/`src`도 새 식별자로 정규화 |
| `src/data/memoryrunner.js` | 앵커·covered·failedBackfill에 `messageIdentity` 사용. `planBackfill`은 폴더 **복사본**을 reconcile해 계획(저장본 미수정) |
| `src/data/memoryturn.js` | 확정 중복 방지 키에 `messageIdentity` 사용 |
| `tests/memoryreconcile.test.js`, `tests/memoryrunner.test.js` | 전체 본문 식별·레거시 마이그레이션·모호 해시·같은 ID 본문 변경 회귀 테스트 |
| `package.json`, `CHANGELOG.md`, `dusk_atelier.js` | 1.8.1 반영·빌드 |

## v1.8.1 추가 수정 (버그 리포트 5건, 버전·CHANGELOG는 건드리지 않음)
| # | 증상 | 원인 | 고친 곳 |
|---|---|---|---|
| 1 | 인물위키에 같은 인물이 생기고 합치기 안 됨 | ① `mergeui.js`가 `applyPersonMerge`의 반환값 `{scope, report}`를 통째로 `folder.wiki`에 넣어 문서가 사라짐 ② 합치기 대상이 Dusk 인물뿐이라, Dusk만 합쳐서 남은 위키 문서(짝 없는 중복)는 다시 합칠 수 없음 ③ 두 인물이 같은 문서를 가리키면 "같은 문서" 오류로 막힘 ④ 빈 인물 추가가 다른 문서의 별칭 중복을 못 막음 | 새 `engine/peoplemerge.js`(항목=Dusk 인물+짝 없는 문서), `ui/screens/memory/mergeui.js`, `engine/wikiedit.js` |
| 2 | AI로 제작 → 작업 프롬프트에서 탭 줄이 세로로 찌그러짐 | 탭 줄(`overflow-x:auto`)이 flex 열에서 최소 높이 0이 되어 긴 화면(textarea 46vh×2)에서 축소됨 | `ui/screens/aitab.js` (`flex-shrink:0`) |
| 3 | 스트리밍 중 버벅임 | 생성 중에도 `getCharacterFromIndex`(채팅 전부 복사) 호출: 기억 재확인(2초), 로어북 로그 청크별 gather, 로어 규칙 display 900ms 뒤 채팅 전체 조회 | `data/genstate.js`(신호), `data/memoryrunner.js`(현재 채팅 1개만 확인), `data/lorelog.js`(잠잠해진 뒤 1회), `data/lorerules.js`(스트리밍 중 미룸), `engine/chattext.js` |
| 4 | 메뉴 'AI로 제작'만 눌러도 새 봇 생성 | 빈 봇을 먼저 DB에 넣고 편집기를 열었음 | `data/addcharacter.js` `createBotDraft`, `ui/screens/chareditor.js`(draftChar), `ui/screens/newbot.js`, `ui/screens/editor.js`(초안은 자동 저장 끔·첫 저장에서만 생성) |
| 5 | 업데이트 뒤 정규식이 깨짐 | 정규식을 항목별로 내 것/새 것 섞어 옛 정규식이 남거나 순서가 꼬임(특히 기준 기록 없음) | `engine/tideplan.js` `regexRule`: 사용자가 정규식을 고친 흔적이 없으면(기준과 같거나 기준이 없음) 새 버전 목록을 순서까지 통째로 채택. `ui/legacy.js`에 안내 한 줄 |

추가(드롭): 가져오기 창(`legacy.js` `takePatches`/`setPatchSink`)과 에셋 창(`assetmgr.js`)에 놓은 `.rbupatch`도 창 전체 드롭과 같이 이름으로 봇·모듈을 찾아 자동 적용. 이름이 다르면 안내 토스트(⋯ 메뉴 → 패치 적용). 브라우저에서 실제 드롭은 미확인.

테스트: `tests/peoplemerge.test.js`, `tests/streamperf.test.js`, `tests/tideplan-regex.test.js`(esbuild로 묶어 TS 코어 사용), `tests/addcharacter.test.js` 추가분.
확인 못 한 것: 실제 RisuAI/RisuBard/PocketRisu 화면에서의 동작(합치기 모달, AI로 제작 초안 저장 흐름, 스트리밍 체감 속도). 연기 시험(`tests/e2e/run-smoke.mjs`)은 통과.
설계 메모: ⑤ 기준 기록이 없을 때도 "고친 흔적을 알 수 없음"으로 보아 정규식을 통째로 교체한다(사용자 지시). 사용자가 직접 추가한 정규식을 지키고 싶으면 `regexRule`의 `base ? … : false`를 바꾼다. ③ `getChatRangeFromIndex`는 시그니처를 확인하지 못해 쓰지 않았다(필요하면 `memoryrunner.tick`·`lorerules.prepareReroll`의 채팅 조회를 범위 조회로 교체).

## HypaPlus 병합 (v1.8.1, 버전·CHANGELOG 미변경)
HypaPlus v1.0.9에서 쓸 만한 것만 우리 방식으로 새로 구현(코드 복사 없음, 데이터 형식만 참조 → NOTICE 불필요). 나머지(시간 감쇠·합성 점수·최근 노드 캐시·청크 요약·요약 메시지 숨기기)는 우리 구조와 겹치거나 호환 위험이 커서 보류.
| 기능 | 파일 |
|---|---|
| 정규식 전처리: 분석 입력·임베딩 질의 글에서 `editprocess` 정규식 적용(올린 파일 → 봇 `customscript` → 켜진 모듈 순). 기본 꺼짐, 원본 채팅 불변, 결과가 비면 원문 유지 | `engine/regexprep.js`, `data/regexprep.js`, `data/memoryrunner.js`(gather `rx`), `data/memoryinject.js`(tail), `ui/screens/memory/regexui.js`, 설정 `settings.regex` |
| 주입 자리표시자 `[Dusk.memory]`: 프롬프트에 있으면 그 자리에 블록 삽입(위치 설정보다 우선, 첫 곳만, 블록이 비면 글자 제거) | `engine/memoryinject.js` `insertBlock`/`PLACEHOLDER` |
| HypaPlus 가져오기: `hypaplus_state_<charId>_<chatId>` 키를 직접 읽어 event→장면+인물 기록, facts→인물 기록(legacy·`imp` 표시로 멱등, 즐겨찾기=고정·A등급, 인물 없는 facts는 건너뜀). 백업 JSON은 지금 열린 채팅에 | `engine/hypaimport.js`, `data/hypaimport.js`, `ui/screens/memory/hypamodal.js` |
| 첫 진입 안내: 기억 탭에 처음 들어갈 때 HypaPlus(기록 키·설정 키·설치 이름)가 감지되면 자동 모달(“동시에 쓸 수 없어요”). 가져오기/나중에/다시 보지 않기. 상태 `idx.hypa={state:done|dismissed}`. 설정 → ‘HypaPlus에서 가져오기’로 다시 열기 | `hypamodal.js` `maybeAskHypa`, `ui/screens/memory/index.js`, `settings.js` |
테스트: `tests/regexprep.test.js`, `tests/memoryinject-placeholder.test.js`, `tests/hypaimport.test.js`. 검증: `npm test` 498 pass / 0 fail, build·check "동일함", `run-smoke.mjs` 통과.
백업·열린 채팅 가져오기는 청크의 `chatIds`로 마지막 메시지에 앵커(at·mid·h)를 달아 리롤·삭제를 따라가고(못 찾으면 legacy), 먼저 legacy로 넣은 항목도 다시 가져오면 앵커를 달아 줌(`upgraded`). `npm test` 502 pass / 0 fail. CHANGELOG v1.8.1 ‘추가한 것’에 반영.
확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① `pluginStorage.keys()` 지원(없으면 기록 키 감지가 안 되고 설정 키·설치 이름·백업 파일 경로만 동작) ② `getDatabase(["modules","enabledModules"])`·`character.customscript` 필드 읽기 ③ 모달 표시. 알려진 한계: 지금 열린 채팅이 아닌 곳으로 가져온 장면은 앵커가 없어 리롤을 따라가지 않고, 임베딩 벡터·대사 원문은 가져오지 않음(대사는 장면 facts 최대 3개로 요약). 아이디에 밑줄이 있는 HypaPlus 키는 건너뜀(백업 파일로 가져오기).

## 남은 일 / 발견한 문제 (머지 전 권장)
- [ ] (보류, main에도 있던 구조) `CHANGELOG.md`: `## v1.8.0 (2026-10-30)` 헤더가 **여러 번** 나오고 "추가 개선" 섹션 아래에 헤더 없는 목록이 섞여 있음 → 정리 권장 (빌드 때 `__CHANGELOG__`로 앱 '새로 바뀐 점'에 들어가므로 정리 시 표시 내용 확인).
- [x] `memoryreconcile.js` 주석의 일본어 혼입 수정·재빌드 완료.
- [ ] `docs/GUIDE-v1.8.1.md` 없음 (필요 시 작성). ~~GUIDE-v1.9.0~~ → 내용이 더 많은 쪽으로 `docs/GUIDE-v1.8.0.md`에 통합 완료.
- [x] 소스맵: v1.8.1·chattext 새 export·HandOff 안내 반영 완료. `HandOff/source-map.md`로 복사 배치(원본 생성 위치 `docs/source-map.md`와 동일 유지).
- [ ] `.github/workflows/`에 `branch-build.yml`(검증)과 `build-branch.yml`(feat/* 빌드 후 자동 커밋)이 공존 — 의도 확인. 자동 커밋 때문에 push 전 항상 `git pull --rebase` 필요.
- [ ] 루트에 작업과 무관한 파일(`HypaPlus_*.js`, `cocoAgent v1.1.5.4.js`, `*.zip`, `bardwiki-grade.patch`) 있음 — 참고용이면 `ref/` 등으로 이동 고려. 빌드에는 영향 없음.
- [x] (2026-11-01 사용자 지시로 main 머지·릴리스 진행) 릴리스(**사용자 결정 사항**, AI가 임의로 하지 않음): main 머지 시 release.yml이 v1.8.1 릴리스 생성. 아카 글은 `docs/arca/v1.8.1.html`(형식: 기존 `docs/arca/v1.7.1.html` 참고).

## 내 프롬프트를 모든 AI 작업에 (v1.8.1)
`engine/customprompt.js`(`applyUserPrompts`: 앞=시스템 글 맨 앞 · 중간=첫 문단 뒤 · 뒤=맨 끝) + `engine/runai.js`(`setUserPromptProvider`, `withUserPrompts`; `runAI` 맨 앞에서 적용) + `dev/aibuild/model.js`(`callModel`도 적용) + `data/memory.js`(`userPrompts()`: 프롬프트 중 '장기기억 분석' 단계를 켠 것, 범위는 지금 열린 채팅) + `main.js`(공급자 등록). 장기기억 분석 호출은 `pick.noUserPrompts`로 건너뜀(대상 채팅 기준으로 직접 끼움). 리수폿 파이프라인(router/director/writer)은 기존 `customPromptBlock`이 그대로 처리. 화면: 기억 설정 카드의 프롬프트 줄과 임베딩 줄을 같은 일반 줄 스타일로(강조 없음), 프롬프트 줄은 항상 표시. 실제 AI 응답 영향 미확인.

## 모바일 가독성 (v1.8.1, 폭 760px 이하)
`styles.js` 끝의 "v1.8.1 모바일 가독성" 블록(CSS만): 경로(crumb) 숨김·"?" 버튼을 설명 옆으로(검색 없는 화면) · 버튼/칩 높이 40px · 11px 글씨 12px · 칩 줄 오른쪽 끝 페이드 · 관리/작업실 타일 2열 · 인물 위키 항목 머리(제목·개수·접기 / 아래 줄 직접 추가·AI 작성) · 기록 줄 글 칸 확장. 실제 폰 미확인(Playwright 375px 사진으로만 확인). 남은 것: 스위치 높이 30px, 빈 항목이 많은 위키의 긴 스크롤. 참고: `tests/e2e/run-app.mjs`의 "[PC] 사이드바 순서" 항목은 이 작업 전부터 실패(시험이 옛 메뉴 구성 기준).

## 탭 화면이 되돌아오는 버그 (v1.8.1)
원인: 탭 A를 불러오는 중 탭 B로 가면, 늦게 끝난 A의 `replace(ctx.main, …)`(기억 탭은 AI 작업 끝의 `redraw`)가 B 화면을 덮어씀. 수정: `ui/staleguard.js` — `render()`마다 번호표를 받아 낡은 화면의 main 변경(replaceChildren 등)을 무시. `app.js`의 `screen(scopeCtx(...))`. 읽기·ctx 쓰기는 그대로. 실제 RisuAI 미확인.

## 기억 탭 진입 속도 (v1.8.1)
`memory/chatload.js`: 채팅 목록의 이름·개수는 이미 읽은 캐릭터 정보에서 만들고 본문은 보는 채팅 1개만 `getChatFromIndex`(예전: 채팅 전부). `memoryswitches.currentChat`은 1초 재사용(여러 화면이 연달아 부를 때 채팅 전체 복사 1회). 개수 정보가 없으면 개수 표시를 생략. 실제 체감 속도 미확인. 아직 손대지 않은 것: `loadBots`의 첫 로딩(`getDatabase(characters)`)과 캐릭터/모듈 탭 첫 로딩.

## 홈 탭 속도 (v1.8.1)
`ui/screens/homestate.js`(홈 상태 읽기)에서 쓰지 않던 백필 계획(`planBackfill`, 전 메시지 해시)과 채팅 통째 읽기(`getChatFromIndex`)를 뺐고, 읽는 동안 로딩 표시. 남은 비용: `currentChat`의 `getCharacterFromIndex`(모든 채팅 복사) — 리스 API 한계. 실제 RisuAI 체감 속도 미확인.

## 자동 게이지 (v1.8.1 구현됨, 실제 RisuAI 미검증)
결정: 게이지 종류 2개(자동 제안 한도, 사용자 직접 추가는 제외) · 정의는 봇당 1벌, 값은 인물×채팅별 · 게이지끼리 연동 없음 · 기존 기억 분석 호출에 얹음(별도 호출 없음) · 수락 시 모든 인물에 적용 · 채팅 박스는 로어북 버튼 '위'.
- 엔진: `src/engine/gauge.js`(정의 검증·델타 적용·8턴 주기·이력 100·되돌리기·제안 한도), `gaugeview.js`(박스 HTML, 인라인 style만). 테스트: `tests/gauge*.test.js`.
- 저장: 정의·제안 `idx.gauges[chaId]={defs,sug,chats}`, 값·이력 `folder.gauge={vals,log,run}`(묶음에 head/tail/snap 저장 → 채팅 표시용).
- 연결: `memoryprompt.js`(gauges/suggestGauge 입력, GAUGE_RULES, validateGaugeOut), `memoryrunner.js`(prepare→apply→afterAnalyze; 리수폿 합친 호출에는 얹지 않음), `memory.js`(gauge 서비스), `lorelog.js`(`above` 훅으로 박스를 버튼 위에 붙임), `main.js`.
- 디자인: AI가 `look`(c1/c2 색, card/fill/track CSS, 모양)을 설계 → `safeCss`로 허용 속성만 남김(url·var·주석 제거). 편집창 "디자인(CSS)"에서 수정·"디자인만 AI로 다시".
- 화면: `ui/screens/memory/gaugeui.js` + `wikiview.js` 수치 상태 끝 블록(+ 추가 · 관리 · 제안 · 되돌리기 · JSON 내보내기/가져오기).
- 한계: 응답 직후 박스는 변화가 있던 응답에만 붙음. 리롤/삭제된 응답의 이력 정리는 이력 100건 한도에 맡김. 실제 RisuAI·RisuBard·PocketRisu 확인 필요(특히 display 핸들러의 인라인 style 통과 여부).

## (참고) 자동 게이지 설계 검토 메모 (원안)
- 위키 수치 엔진(`pot/people-records.js`)은 새 수치를 4개 슬롯만 허용하고 pot은 수정 금지 → 사용자 정의 게이지는 Dusk 쪽 저장소(`folder.emo` 방식)에 둔다.
- 구조 제안: 정의 1개(캐릭터별) + 대상 인물 목록, 값은 채팅×인물별, 이력은 별도 키(모두 `v:1`). 모델은 변화량(±1~3)만 내고 코드가 범위 제한.
- 제안 1건 = 게이지 종류 1개(승인 시 인물별 생성). 하루 한도는 롤링 24h 권장. 8턴 카운트는 `messageIdentity`로 리롤 중복 방지.
- 모든 AI 호출(설계·갱신·제안)에 `MEMORY_DEFAULT_PROMPT_1+2` 포함 여부 테스트. 자동 제안 기본 꺼짐일 때 제안 호출 0회 테스트.
- 결정 대기: ①정의1+인물별 값 구조 ②참조(15·16번) 제거/표시용 유지 ③갱신을 기존 분석에 덧붙일지 독립 호출일지. 구현 순서: 순수 로직→저장소→AI 설계→수동 UI+8턴 갱신→자동 제안.

## 다음 계획 후보 (프로젝트 메모 기준)
- 영어 UI 지원, 로어북 편의 기능 지속.

## 코코아전트(cocoA(gent!)) 기능 이식 — 진행 중 (v1.8.1, 버전·CHANGELOG 미변경)
요구: ① 가치 있는 기능 이식 ② 코코아전트 스킬(SKILL.md 세트·ZIP·JSON `cocoagent.skill-set/library`, `risu-agents.*` 별칭) 전부 호환 ③ 보조모델 **추가 호출 금지**(기존 호출의 프롬프트에 주입만) ④ 장기기억 꺼도/코코아 꺼도 각자 동작 ⑤ 스킬은 기억 탭 아래 별도 탭. 리수폿과 겹치는 기능은 중복 구현 안 함.
- [x] 1단계 엔진: `src/engine/skills.js`(순수; 형식 규격만 따르고 코드는 새로 작성 — cocoAgent 라이선스 미확인이라 복사 안 함) + `tests/skills.test.js` 8개 통과. 아직 어디에도 연결 안 됨(빌드물 불변).
- [x] 2단계 저장·가져오기·주입 연결(완료, 화면은 4단계): `src/data/skillstore.js`(키 `dusk.skills.v1`, 코코아 키 `risu_agents_skill_library_v1`이 있으면 1회 가져오기 제안), ZIP 읽기/쓰기는 `src/vendor/fflate.js` 사용(엔트리 200개 상한, 폭탄 방어), `skillSetFromEntries` 연결.
- [ ] 3단계 주입(추가 호출 없음): 대상 슬롯 ↔ Dusk 호출 매핑 — system_prompt/output_instruction/output_format/checklist/self_check → 리수폿 director·writer, memory_instruction/memory_format → 기억 분석(`engine/memoryprompt.js`). `composeSlot`으로 뒤에 덧붙임, 스킬 0개면 바이트 동일. 재사용 캐시 키에 `skillInjectionSignature` 섞기. 스킬 세트 할당은 호출 단계별(`router/director/writer/analysis`) 설정.
- [x] 4단계 화면(완료): 기억 탭 하위 '스킬' 탭(세트 선택·ZIP/JSON 가져오기·내보내기·frontmatter 슬롯 편집·진단·"에이전트가 보는 색인" 미리보기). UI-STYLE 먼저 읽기.
- [ ] 5단계 후보(★4~3): `skill_read`/`skill_list` 도구(도구 호출 지원하는 호출에서만), Anthropic 프롬프트 캐싱(`modelhub.js`), 롤링 요약(Dusk 장면 기록과 겹침 확인 후), 실행 검사기.
- 결정(사용자): ① 스킬 주입은 **별도 켜기/끄기 토글**(장기기억·코코아와 독립) ② 웹 검색·fetch 도구만 추가 이식(Brave·Tavily·Serper·Exa·DuckDuckGo·Wikipedia·SearXNG 등, SSRF 방어, `nativeFetch` 우선). 나머지 ★2 이하는 안 넣음. 도구는 도구 호출 단계에서만 호출이 늘어나므로 기본 꺼짐.
- 열린 질문: 스킬 주입을 메인 모델 요청에도 넣을지(cocoAgent에는 없는 Dusk 쪽 확장). 기본은 보조 호출(director·writer·기억 분석)만.
- 테스트 전체/빌드/check는 2단계 이후 연결 시 실행(1단계는 미연결).

### 스킬 2단계 결과 (v1.8.1, 버전·CHANGELOG 미변경 — 화면이 붙을 때 CHANGELOG 반영)
- `engine/skillcfg.js`(설정 `{on:false, stages:{router,director,writer,analysis:[세트 참조]}}`, `appendToPrompt/appendToMessages`), `engine/skillhook.js`(공급자 연결점), `data/skillstore.js`(키 `dusk.skills.v1`·`dusk.skills.cfg.v1`, zip/json 가져오기, zip/json 내보내기, 코코아 키 `risu_agents_skill_library_v1` 감지 `detectCocoa`).
- 주입 지점: 리수폿 단계 `data/memoryturn.js` `stageCall`(프롬프트 문자열 뒤), 기억 분석 `data/memoryrunner.js` 기본 `run`(마지막 system 메시지 뒤). 연결: `main.js`에서 `createSkillStore` + `setSkillBlockProvider`. **꺼짐이 기본, 꺼져 있거나 할당이 없으면 프롬프트 원문 그대로, 추가 호출 없음.**
- `vendor/fflate.js`: export에 `zipSync` 추가(zip 내보내기용).
- 테스트: `tests/skills.test.js`, `tests/skillstore.test.js`. 검증: `npm test` 516 pass / 0 fail, build·check "동일함", `run-smoke.mjs` 통과.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 주입된 프롬프트가 모델에 전달되는지, 리수폿 writer의 JSON 응답이 스킬 글 때문에 흔들리는지. 가져온 프롬프트 재사용 캐시(정리 노트 재사용)에 스킬 서명 섞기는 **아직 안 함**(3단계 잔여). gauge(`data/gauge.js`)·감정 HUD 호출에는 아직 미주입.
- 다음: 4단계 화면(기억 탭 '스킬' 탭: 켜기 토글, 단계별 세트 할당, 가져오기/내보내기, 편집, 진단, 주입 미리보기 `previewFor`) → CHANGELOG·source-map 갱신.

### 스킬 4단계 결과 (v1.8.1, CHANGELOG v1.8.1 '새로 생긴 것'에 반영)
- 화면 `ui/screens/memory/skills.js`: 기억 탭 `m.page="skills"`(진입은 `mhome.js` 설정 카드의 '스킬' 줄). 구성: 주입 켜기 토글 · 단계별(router/director/writer/analysis) 세트 칩 · 세트 목록(가져오기 ZIP/JSON·새 세트·삭제·전체 내보내기) · 세트 편집기(파일 칩·원문 textarea·진단·ZIP/JSON 내보내기·주입 미리보기) · **코코아전트에서 옮겨오기**.
- 옮겨오기 `engine/cocoamigrate.js`: 코코아 저장소 키 `risu_agents_skill_library_v1`·`risu_agents_pipeline_presets_v1`를 **읽기만**. 스킬 세트(이름 겹치면 건너뜀) / 켜진 에이전트의 `skillSets` → 단계 연결(pre→director, record 후처리→writer+analysis, 그 밖은 연결 없음) / 에이전트 프롬프트 글→스킬 세트 변환(선택, 기본 꺼짐: 기본값이 섞여 있을 수 있음). 옮긴 뒤에도 주입 토글은 꺼진 채 둔다.
- 연결: `main.js` `app.ctx.skills`, `memory/index.js` PAGES.skills. 테스트 `tests/cocoamigrate.test.js`, 연기 시험 `tests/e2e/smoke.entry.js`에 스킬 탭 4건.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 코코아전트 저장소 키가 보이는지(pluginStorage 공유 여부는 호스트마다 다를 수 있음 → 안 보이면 ZIP/JSON 가져오기), 파일 선택·다운로드(`Blob` 링크)의 모바일 동작, 좁은 폭 레이아웃(스크린샷 미확인), 코코아 `postMode` 값 가정(`record`).

### 스킬 5단계 결과 — 웹 도구·호출 기록 (v1.8.1, CHANGELOG 반영)
- 웹 도구: `engine/websearch.js`(7개 검색 서비스 요청/해석, SSRF 주소 검사 `checkUrl`, `htmlToText`, 글 규약 `[[tool:이름 {json}]]` + `runToolLoop`), `data/webtools.js`(설정 `dusk.web.v1` 기본 꺼짐·키는 이 기기 저장소만, `nativeFetch`만 사용, 페이지 읽기는 `redirect:"error"`), `engine/webhook.js`(연결점), 연결: `data/memoryturn.js` `stageCall`이 스킬 글을 붙인 뒤 `webWrap`으로 감쌈 → 꺼짐/다른 단계/설정 미비면 원문으로 **한 번만** 호출. 켜진 단계에서 모델이 답 전체를 도구 호출 한 줄로 하면 실행 후 결과를 붙여 다시 호출(최대 `maxSteps` 기본 2, 상한 3). 기본 단계=director.
- 호출 기록: `engine/skillhook.js` `recentCalls`(메모리 30건, 저장 안 함) + 화면 '최근 호출 기록'. 스킬 글이 실제로 붙었는지(글자 수)·도구 사용 확인용 → **실제 호스트 검증 때 이걸 먼저 볼 것.**
- 의도적으로 안 한 것(이유): ① Anthropic 프롬프트 캐싱 — 리수폿 모델 클라이언트(`data/pot/llm-client.js`, 자동 생성·수정 금지)가 프롬프트 전체를 사용자 메시지 한 덩어리로 보내 매 턴 달라지는 글이라 캐시 적중이 거의 없고 쓰기 비용만 늘어남. 필요하면 `tools/pot-patches.json` 패치로 시스템/고정 구간을 분리하는 설계부터. ② 롤링 요약 — Dusk 장면 기록(`sum`)과 겹침. ③ 정리 노트 재사용 캐시 서명 — Dusk에는 해당 캐시가 없음(코코아전트 전용). ④ 게이지·감정 HUD 호출 — 스킬 단계가 아니므로 주입 안 함(게이지는 기억 분석 호출에 얹히므로 analysis 스킬이 간접 적용됨). ⑤ 디버그 챗·별도 실행 검사기 — 호출 기록으로 대체.
- 확인 못 한 것: 실제 호스트에서 `nativeFetch` 응답의 `ok/text()` 형태와 검색 서비스별 CORS·응답(특히 DuckDuckGo HTML 형식은 바뀔 수 있음), 모델이 글 규약을 따르는지(JSON만 내는 단계에서 도구 호출 한 줄을 정확히 내는지), 도구를 켠 단계의 응답 시간. 테스트: `tests/websearch.test.js`, `tests/webtools.test.js`, 연기 시험 1건 추가. `npm test` 529 pass / 0 fail.

### Special thanks (v1.8.1)
- `ui/screens/tools.js` `CREDITS`에 cocoA(gent!)(https://arca.live/b/characterai/179542646?p=1)·HypaPlus(…/180803492) 카드, RisuTide 카드에 글 링크(…/186759072), `ui/styles.js` 색상, README 'Special thanks'. 사용자 확인: cocoA(gent!)·HypaPlus·RisuTide 모두 공식 병합(허락 받음) → 카드는 'PORTED WITH PERMISSION'. 코드는 형식 규격 기준으로 새로 작성(복사 없음). 아카라이브 v1.8.1 글(`docs/arca/v1.8.1.html`)에도 같은 땡스 박스를 넣을 것(글은 릴리스 시점에 사용자 지시로 작성).

### 화면별 둘러보기 (v1.8.1, CHANGELOG 반영)
- `ui/tour.js`: `runTour(ctx, steps, {label, doneLabel, skipMissing})` 공용화(처음 둘러보기 `openTour`는 그 위에서 동작·동작 그대로). 단계: `{icon,title,text,target:[css],tab,el,action:{label,onClick}}`; `el`=직접 넘긴 요소, `action`=추가 버튼, `skipMissing`=없는 목표 건너뜀(화면별용).
- `ui/screentours.js`: `SCREEN_TOURS`(home·memory:home·memory:skills·characters·modules·cards·tools·settings), `screenTourSteps/runScreenTour`. 정의 없는 화면은 `tabs.js`의 desc+help를 한 장으로. **새 화면 추가 시 여기에 단계와 CSS 선택자를 넣을 것**(선택자는 기존 클래스/id, 스킬 화면은 `data-tour`).
- 바뀐 곳: `ui/app.js` ? 버튼(`toggleHelp`→`runScreenTour`, 옛 `.rb-help` 팝업 제거), `memory/guide.js`(`showGuide`는 ? 버튼이 든 카드를 강조·`처음 설정 다시 보기`는 `action`), `memory/embeddingguide.js`(임베딩 줄 강조+`임베딩 설정` 버튼), `cards/index.js`(stepsGuide→'카드 만드는 법 둘러보기' 버튼), `home.js`(`#rb-home-tour` 작은 버튼, 원래 만들어만 두고 안 쓰던 `foot`은 그대로 미사용).
- 간단 모드 손질: 기억 설정 카드 제목('기억 세부 설정'), 스킬 줄 문구, 스킬 화면 웹 도구·호출 기록은 `advFold`(고급).
- 안 바꾼 것(튜토리얼이 아니라 참고/기능이라): 캐릭터 편집기 도움말 패널(`editor.js HELP`), 플러그인 필드 도움말(`plugins.js`), 기억 처음 설정 마법사(`setup.js`, 실제 설정 단계), 도구·설정의 '이럴 땐 여기로' 길잡이 패널(`guidePanel`, 이동 메뉴).
- 테스트: `tests/e2e/smoke.entry.js`에 둘러보기 10건(단계 건너뛰기·하이라이트·동작 버튼·정의 검증·가이드 강조). `run-app`의 '[PC] 사이드바 순서'는 이 작업 전부터 실패.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu 화면에서 각 선택자가 잡히는지(특히 모바일 폭에서 가려진 칸은 건너뜀), 둘러보기 카드가 좁은 폭에서 강조 대상을 가리지 않는지 눈으로 확인 안 함.


- 코코아 탭: 사이드바 기억 섹션의 독립 탭 `cocoa`(tabs.js, ui/screens/cocoa.js → memory/skills.js `standalone`). 기억 홈 ‘코코아 · 스킬’ 행은 이 탭으로 이동. 간단 모드=토글+사용할 스킬(연출·집필에 붙임)+목록/편집, 고급 모드=단계별 붙이기·코코아전트 옮기기·웹 도구·호출 기록(advFold). 탭 이름 `코코아`.

- AI로 스킬 만들기: `engine/skillchat.js`(순수: 시스템 글·`<skill-file path>` 파싱·초안 합치기) + `data/skillguide.js`(SKILL_GUIDE 원문, 가이드 바꾸면 재생성) + `ui/screens/memory/skillchat.js`(코코아 탭 우하단 FAB·대화창·초안 미리보기·추가/ZIP/JSON). 모델은 페르소나 빌더의 AI 프리셋(`loadPB`)을 공유. 스트리밍 없음(응답을 한꺼번에 받음). 칩 넘침은 `.rb-skills` 스타일로 해결.
- 한계: 실제 AI 응답으로 만든 스킬의 품질·호스트 확인 못 함.

## 봇빌더 연동 · 로어북 규칙 설계 (v1.8.1, 버전 미변경)
- DA Interop 동작(actions) 확장: 스니펫 `da_interop:action:<id>` 요청 → B 플러그인이 1초마다 확인·실행(15초 지난 요청은 실행 안 함) → reg에 actionRev·actionResult. Dusk `data/plugins.js` sendAction/waitAction/runAction. **외부 저장소 Pyser08/dusk-atelier-interop의 interop-snippet.js·문서는 아직 안 바꿈** (src/data/interopSnippet.js가 앞서 있음).
- 봇빌더 연동판: `data/workshoppatch.js` patchWorkshop(원본 글 → 스니펫 + init()의 open·draft 동작 등록). 명령줄 `tools/compat/workshop-interop.mjs`. 봇빌더 v1.0.1에서 확인.
- 흐름: newbot.js `createBotAndEdit(tab:"ai")` → `ui/screens/workshoplink.js` startWorkshop(연동판이면 open 후 Dusk 닫기, 아니면 안내 창: Dusk에서 만들기/연동판 받기/열러 가기). 인계 `dusk.workshop.handoff.v1`(그때 봇 목록, 24시간). app.open → checkWorkshopReturn: 새 봇·편집한 봇(targetId) → 개발 목록 + 개발 탭(개발 모드 꺼짐이면 편집기). 새 봇이 없으면 원고(연동판=draft 동작, 원본=봇빌더 자동 저장 `risu-character-editor:v1:*`에서 인계 뒤 것) → 새 봇으로 가져올지 확인.
- 로어북 더스크화 규칙 설계: `dev/aibuild/lorerefine.js`. DUSK_GUIDE + 이번 일 안내, 40개씩, 답은 규칙·소속 확률만 남겨(readRefine) convertDesign로 검사, 실패하면 하나씩 넣어 문제 있는 것만 뺌(refineStep). 미리보기에서 항목별 선택(pickRefine).
- 검증: npm test 554/0, build·check 동일함, smoke(봇빌더 연동 6항목·더스크화 3항목) 통과. run-smoke에 fflate alias 추가.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① 연동판 봇빌더가 Dusk 요청으로 화면을 여는지(두 플러그인 창 전환 순서) ② 원본 봇빌더 자동 저장(3분 간격) 읽기 ③ 실제 AI 응답으로 만든 규칙 품질. 봇빌더가 자동 업데이트되면 원본으로 돌아감(Dusk는 안내 창으로 대체).
- 코코아 탭 화면 정리: 카드는 `rb-card bordered pad rb-sk-card`, 버튼 줄은 `rb-sk-bar`(`.rb-row`는 목록 줄 스타일이라 쓰지 말 것). 넓은·좁은 폭 다크 스크린샷 확인.

### 후속 (코코아 노출·둘러보기·봇빌더 순서)
- 홈 기억 타일/기억 개요 문구에 코코아 추가. TOUR_VER=3(코코아 단계 추가) → 업데이트·신규 모두 1회 자동, 이후 수동만.
- startWorkshop: Dusk를 먼저 닫고(L.open 전) 실패 시 ctx.reopen. 실제 리스에서 z-order 확인은 못 함.

### 후속 (지난 대화 분석 실패 — 낮은 추론 모델)
- memoryprompt.js: parseJson 복구(후행 쉼표·잘린 끝, people/scene 있을 때만), analyze 래핑 해제 + 재요청 2회. memoryrunner.js backfill: 일시적 오류 2회 재시도, 반환값에 reasons. UI 알림에 실패 이유. 실제 모델로는 확인 못 함(원인은 응답 형식·한도 추정).

### 후속 (모바일에서 리스 전체가 느려짐)
- gauge.js onDisplay: 메시지마다 store.getIndex() 하던 것을 ensureView 캐시로(게이지 정의 변경 시 view 무효화). watch.js MOD_EVERY 20s→60s. 실제 모바일 측정은 못 함(원인은 코드상 추정: 표시 훅이 메시지 수만큼 호스트와 왕복).

### 후속 (홈 장기 기억 전체 토글)
- home.js 기억 상태 줄(.rb-status) 오른쪽 끝 스위치(.rb-hall, withAll) → switches.setMemoryEverywhere. engine memoryswitch.js memoryGlobalOn 추가. 홈 화면은 e2e로 직접 확인 못 함(run-app은 기존 '사이드바 순서' 실패로 중단).

### 후속 (외부 부담 최적화)
- data/hookbus.js: main.js의 api 프록시가 add/removeRisuScriptHandler(input·output·display)를 종류당 호스트 훅 1개로 합침(기존 모듈은 수정 없음, 순서 유지·예외 격리). watch.js: 폴링 FAST 8s/SLOW 15s, 클릭 후 메뉴 확인 2s 이하. 실제 리스에서 체감 측정은 못 함.

### 후속 (탭 진입 시간)
- data/dbcache.js: 읽기 전용 getDatabase 캐시(TTL 20s, 동시 요청 합침, 복사본 반환, 쓰기 계열 호출·창 열기 때 비움). main.js 프록시가 api.getDatabaseCached/invalidateDbCache 제공, 화면 목록 읽기(dbRead)만 사용: 캐릭터 목록·모듈 탭 사용처 수·기억 봇 목록·플러그인 목록·봇빌더 상태·HypaPlus 감지·RisuTide 확인·편집기 봇빌더 확인. 편집·저장·감지 경로는 getDatabase(항상 새로 읽음). 프로파일(가짜 DB, 봇 150·모듈 40): 탭 진입 비용의 대부분은 getDatabase 복사(300~400ms)였음. 실제 리스 측정은 못 함.

## 추가 최적화 (외부 부담)
- lorerules.prepareReroll: 채팅 읽기 1회, display 디바운스 2500ms. memoryrunner.recentCheck: 채팅 1회 읽기.
- 실제 호스트 체감 속도는 미측정.
- 게이지 제안 기본값 on:true (engine/gauge.js newSuggestState). 기존 저장 상태는 유지.
- engine/loredusk.js referenceText + batchMessages/refineMessages reference 옵션, editor.js duskify에서 전달.
- referenceText 확장: draft 필드(desc 등) + 정규식·트리거 상세, 총 14000자 제한.

## 브랜치 (2026-11-02)
- v1.8.1 릴리스(c7643b1) 이후 변경은 feat/1.8.2에서 이어가요. CHANGELOG는 v1.8.2(개발 중) 구간. 버전(package.json)은 아직 1.8.1.
- engine/loredusk.js: keyFixes/cleanKeyString/plainWordsOfRegex/defaultConfirmWords, plan.keyFixes → applyPlan. UI loredusk.js 키 정리 카드(키만 정리)·미리보기 섹션.

### 이미지 태그 교정 (feat/1.8.2, 버전 미변경, CHANGELOG v1.8.2에 반영)
- 엔진 `src/engine/imgtagfix.js`(순수): `buildAssetIndex(names)`·`fixImgTags(text, idx, {unknown})`. 에셋 이름에서 구분자(점/첫 밑줄)를 추정해 캐릭터·옷·키워드로 나누고, 정규화 비교→오타(편집거리 ≤1~2, 유일할 때만)→옷 보정→`default` 대체 순으로 맞춘다. 한 태그에 합쳐진 키워드는 에셋 목록에서 가장 드문(=구체적인) 것을 고른다(`default`은 가장 낮음). 지침 원문 복사·없는 캐릭터는 삭제(`unknown:"keep"`이면 둠). URL·`{{…}}`·`=` 가 든 다른 속성 태그·이미 정확한 태그는 건드리지 않음(멱등). 같은 줄의 별개 태그는 합치지 않음.
- 연결 `src/data/imgtagfix.js`: output 훅(저장 전). 설정 `dusk.ui.imgFix`(기본 꺼짐)·`dusk.ui.imgFixUnknown`. `<img` 가 있을 때만 에셋 목록(`getCharacterFromIndex`의 additionalAssets + 켜진 모듈 assets; 모듈은 전역 `enabledModules` + 봇에 고정한 `character.modules` + 이 채팅의 `chat.modules`를 모두 합친다(모자라면 멀쩡한 태그를 지우므로 넉넉하게). 캐시 키는 봇·채팅 번호)을 20초 캐시로 읽고, 1.5초 안에 못 읽으면 그 응답은 그대로 둔다. 교정 내역은 콘솔 로그와 `recent()`(메모리 30건). 켜기: 홈 '이미지 태그 자동 교정'(`ui/screens/home.js`), `main.js`에서 `app.ctx.imgFix`.
- 봇을 바꾸면 에셋 목록 캐시를 버린다(현재 봇 번호를 매번 비교). 테스트 `tests/imgtagfix.test.js` 12건 + `tests/imgtagfix-hook.test.js` 2건. 검증: `npm test` 586 pass / 0 fail / 9 skipped, build·check "동일함", `run-smoke.mjs` 통과.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① output 훅이 스트리밍 조각마다 불리는지·저장 본문에 반영되는지 ② `getCharacterFromIndex` 응답에 additionalAssets가 있는지 ③ 에셋이 많은 봇(수천 개)에서의 속도. 못 고치는 것: 상황에 안 맞는 키워드, 감정 태그만 쓰는 편향(의미 판단 필요 → 별도 설계 필요).
- 개발 환경 메모: `npm ci`가 막혀서 `/opt/npm-tools/node_modules`의 esbuild·acorn을 `node_modules/`에 링크해 테스트·빌드함(eslint-scope는 없었지만 build·check는 통과).

#### 이미지 태그 2차 (feat/1.8.2)
- 엔진 보강 `engine/imgtagfix.js`: 키워드 맞추기 `pickKeyword`(정확→어간 `stem`→낱말 순서 무시→오타→낱말 포함·덧붙은 낱말 최소 1개), 확장자 제거, 이름 한쪽(`resolveChar` 낱말 부분일치, 유일할 때만), 대체 표정 `FALLBACK`(default·neutral·idle·normal, 없으면 태그 유지 `keep`), `opts.state`(직전 옷). 옷 결정 규칙(사용자 결정 '나'): 옷이 정해지면 옷을 지키고 없는 동작은 그 옷의 기본 표정. 새 export `readTags`, `sceneState`, `stem`.
- 알림 `engine/imghint.js`(순수): `hintForMessages(messages, idx)`→`{hint,state}`(이미지 태그를 쓰는 요청에서만), `presentChars`(최근 3개 응답의 태그 → 마지막 두 글에 이름이 나온 캐릭터, 최대 6명), `buildHint`(우선순위·직전 옷·태그·현재 옷 키워드, 같은 목록은 'same as', 2800자 넘으면 키워드 줄 생략), `insertHint`(마지막 user 앞 system, `HINT_MARK`로 중복 제거).
- 연결 `data/imgtagfix.js`: beforeRequest(type이 model일 때만)로 직전 상황을 뽑아 교정에 넘기고, 알림 켜짐(`dusk.ui.imgFixHint`)이면 요청 사본에 넣음. 교정만 켜도 직전 옷 기억은 동작. 에셋 캐시 5분(봇·채팅 키), 스트리밍 중(`genstate.recentlyStreamed`)엔 새로 읽지 않고 봇 번호 확인도 1초 재사용. 홈 토글 2줄.
- 테스트: `imgtagfix.test.js` 17, `imghint.test.js` 7, `imgtagfix-hook.test.js` 9. `npm test` 607 pass / 0 fail, build·check 동일함, smoke 통과.
- 확인 못 한 것: 실제 호스트에서 beforeRequest messages의 role 이름(assistant 외 char/model도 처리)과 마지막 user 앞 system 삽입이 모델별로 문제없는지, 봇의 editprocess 정규식이 기록 속 `<img>`를 지우면 직전 상황을 못 읽음, 알림의 실제 효과(모델이 따르는지).
- 3번(낱말 단서로 감정→동작 올리기)은 하지 않기로 결정(사용자, 2026-11-02). 1·2번만 사용.

#### 이미지 태그 3차 — 실제 지침 4종 대응 (feat/1.8.2)
- 사용자 제공 지침 4종(해리포터 `name_emotion_x`/`name_position.sex`/`이름_exception_neutral`, 젠레스 `Astra Yao_Sex_Missionary_Cum`, 이로하 `iroha_real_x`+스탠딩 `akira`, 블루아카 `Mika_smile`)을 `tests/imgtagfix-formats.test.js`로 고정.
- 고친 것(`engine/imgtagfix.js`): ① 점 구분 판단을 '점 2개 이름이 절반 이상 또는 90% 이상에 점'으로(키워드 속 점 `missionary.sex` 오판 → 정상 태그 삭제되던 문제) ② 구분자 없는 이름 = 이름만 있는 그림(스탠딩), 대체 그림으로도 사용 ③ 밑줄 형식 형태 감지(모든 키워드가 2~6가지 앞말·각 3개 이상 → 옷처럼; (나) 규칙 적용) ④ `fallbackOf`: 그림 1개뿐이면 그것(예외 캐릭터), 끝 낱말 default(`emotion_default`) ⑤ 이름 속 `'`·`&` 보존(SPLIT에서 제외), 조각 해석 실패 시 통째 해석 결과 사용 ⑥ 합친 태그 동률이면 뒤 키워드(감정+동작 순) ⑦ 지침 자리표시 `[Name]`·`[tag]`·`[emotion]`…와 꺾쇠 원문 `<img="<…>_<…>">` 삭제. 알림: 스탠딩 캐릭터 'name only'.
- 한계: 의미 규칙(해리포터 TS 정체성 전환, 이로하 'NSFW는 real만', 블루아카 '감정·스킨십은 따로 두 태그')은 판단 못 함. 이로하 virtual+NSFW는 (나) 규칙대로 virtual 기본 그림. 블루아카 합친 태그는 둘로 나누지 않고 하나(동작)만 남김.
- 검증: `npm test` 614 pass / 0 fail, build·check 동일함, smoke 통과.

#### 이미지 태그 4차 — 명일방주 형식·모듈 여러 개 (feat/1.8.2)
- 명일방주(`Amiya_smile`, 이름에 밑줄이 든 `Amiya_Demon_King_sad`, `Kal'tsit_…`, NSFW `Amiya_missionary_sex`): 지침의 WRONG 예시 `Amiya smiling`(띄어쓰기) → 앞 낱말부터 캐릭터 찾기(`resolveIn` 낱말 분할), `Amiya_missionary`(뒷말 빠짐) → 동률이면 목록에서 가장 흔한 끝말(`sex`)을 고름(`pickKeyword`, 뚜렷할 때만).
- 모듈 여러 개: `buildAssetIndex`가 묶음 배열([봇, 모듈1, 모듈2…])을 받아 묶음마다 이름 규칙(점/밑줄·형태)을 따로 판단(`parseGroup`), `idx.modes`가 섞이면 `resolveToken`이 두 규칙으로 다 읽어 실제로 맞춘 결과를 우선. `data/imgtagfix.js` `readNames`가 모듈별 묶음을 넘김. 모듈 수 제한 없음(전역+봇 고정+채팅 지정 합집합).
- 테스트: formats 10, hook 10. `npm test` 618 pass / 0 fail, build·check 동일함, smoke 통과.
- 한계: '아미야(마왕)를 Amiya로 쓰는' 같은 의미 오류는 못 고침. 연결 안 된 모듈의 캐릭터 태그는 없는 캐릭터로 보고 지움(설정 `dusk.ui.imgFixUnknown=keep`이면 둠, 아직 화면 토글 없음).

#### 이미지 태그 알림 — 태그 고정 방지 (feat/1.8.2)
- `engine/imghint.js`: ① 문장을 '유지하라' → '직전 상태일 뿐, 동작·단계가 바뀌면 바꾸고 끝나면 감정 태그로' ② `sceneState`의 `streak`(같은 태그를 연달아 쓴 응답 수) ≥3이면 'used in N replies in a row — change it if the scene moved on' ③ `age`(마지막 응답 기준 몇 번째 전) >1이면 '마지막 태그' 줄 생략, 옷만 알림. 교정용 옷 기억(state.outfit)은 기간 제한 없음. 테스트 imghint 10.
- 장기기억 분석에 장면 상태 얹기(4·5번)는 하지 않기로(사용자 결정).

#### 버그: 임베딩 '기본으로 사용' 스위치 (feat/1.8.2)
- 원인: `ui/kit.js` `switchEl`은 스스로 모양을 바꾸지 않음(호출 쪽이 `setSwitch` 해야 함). `memory/embedmodal.js`가 값(f.on)만 바꿔서 화면은 계속 꺼짐 → 켠 것처럼 안 보이고, 켜진 상태에선 클릭마다 false만 나와 끌 수 없었음. 같은 문제: `devtools.js` 패치 만들기의 `row2` 스위치 2개. 둘 다 `setSwitch(el, v)` 추가.
- 테스트: `tests/e2e/smoke.entry.js` '임베딩 스위치' 3항목(수정 전 2개 실패 확인). 다른 `switchEl` 사용처는 setSwitch·aria-checked 직접 변경·redraw로 처리하고 있음을 확인(editor.js set은 redraw, promptstab edit은 paint).
- `npm test` 621 pass / 0 fail, build·check 동일함, smoke 0 실패. 실제 RisuAI에서 저장 후 임베딩이 실제로 쓰이는지는 미확인(저장 로직 자체는 변경 없음).

#### 다음 작업 예정: 도구 탭 '에셋 태그 고치기' (보조모델, 수동)
- 사용자 결정: 범위는 직접 고르기(최근 N개 응답) · 미리보기 후 적용(되돌리기 포함) · 보조모델은 상황 판단까지 · 평소엔 작동 안 함(버튼 누를 때만).
- 결정: (다) 창에서 '엔진이 못 고친 것만 / 상황까지 전부' 선택. → 아래 '구현됨' 참고.
- 설계 메모: ① 엔진(`fixImgTags`) 먼저 → 남은 것만 보조모델에 (태그 앞뒤 문단 + 현재 태그 + 그 캐릭터·옷의 실제 키워드 목록만 전송, 채팅 전체 X) ② 답한 태그는 에셋 색인으로 재검증, 없는 이름은 버림 ③ 저장된 채팅 메시지를 바꾸므로 미리보기·되돌리기 필수 ④ **장기기억 식별 주의**: `messageIdentity`가 본문 전체 해시라 태그만 바꿔도 다른 메시지로 인식 → 고친 메시지의 앵커(at·h·mid)를 새 해시로 옮기는 처리 필요(`memoryreconcile.js` 레거시 마이그레이션 방식 참고) ⑤ 모델은 기존 보조모델 선택(`modelhub.js`) 재사용.

#### 구현됨: 도구 탭 '에셋 태그 고치기' (feat/1.8.2)
- 엔진 `engine/assetfix.js`(순수): `scanReplies`(응답별 태그 분류 exact/case/fuzzy/merged/default/keep/template/unknown, unresolved=default·keep·repeat(3연속), 범위 앞 응답으로 직전 옷 기억) · `aiItems`(mode unresolved|all, 최신부터 MAX_ITEMS 80, 키워드 목록은 sets로 공유, 태그 앞 360·뒤 220자 문맥) · `aiMessages`(봇 규칙 botRules) · `parseAiReply`(그 항목의 실제 키워드만, 같으면 버림, notes) · `changeRows`(AI 제안이 엔진 결과보다 우선) · `applyRows`(고른 줄만, 혼자 있는 줄 삭제 정리) · `renameIds`(기억 폴더 식별자 문자열 교체). `imgtagfix.js`에 `tagSpans`·`renderTag`·`resolveTag` 추가, keep 결과에 char 포함.
- 데이터 `data/assetfix.js`: `loadRange(api,n)`(마지막 n개 AI 응답 + 앞 3개), `applyFix`(다시 읽어 미리보기 뒤 바뀐 응답은 건너뜀, `setChatToIndex`, 기억 폴더가 있을 때만 `messageIdentity` 옛→새 교체, 되돌리기 기록 `dusk.assetfix.undo.v1`), `undoFix`(같은 채팅이 열려 있어야, chatId로 찾음, 그 뒤 바뀐 응답은 건너뜀), `lastUndo`. 에셋 색인은 `ctx.imgFix.assetIndex()`(교정 기능과 같은 캐시·모듈 묶음).
- 화면 `ui/screens/assetfix.js` `openAssetFix(ctx, {runAI})`(모델 선택은 loredusk와 같은 목록, 설정 `dusk.assetfix.ui.v1`), `tools.js` 타일 `#rb-tool-assetfix`(동적 import).
- 테스트: `tests/assetfix.test.js` 7, `tests/assetfix-data.test.js` 4, smoke '에셋 고치기' 5항목. `npm test` 632 pass / 0 fail, build·check 동일함, smoke 0 실패.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 `setChatToIndex`로 바꾼 응답이 화면에 바로 반영되는지(새로고침 필요할 수 있음), 실제 보조모델이 JSON 형식을 지키는지·판단 품질, 아주 긴 채팅에서 `getCharacterFromIndex` 지연. 저장된 채팅을 바꾸는 유일한 기능 — '원본 채팅 수정 안 함' 원칙의 예외(사용자 요청, 미리보기·되돌리기로 보완).

#### 기본 프롬프트 위치 통일 (feat/1.8.2)
- 규칙: Dusk의 모든 AI 호출은 `runAI`/`callModel`의 `withUserPrompts`가 '내 프롬프트'(기억 단계, 앞·중간·뒤)를 넣는다. 기본 프롬프트 1(앞)·2(뒤)는 그 목록의 기본 항목(`memoryturn.js` dusk-default-front/back-v1). **지침 글에 MEMORY_DEFAULT_PROMPT_1/2를 직접 붙이지 말 것**(중복·위치 깨짐).
- 바뀐 곳: `data/memory.js` `userPrompts` — 리수폿 설정을 못 읽으면 `DEFAULT_PROMPT_BLOCKS`(앞=1, 뒤=2), 목록이 비어 있으면(사용자가 지움) null. 직접 붙이던 `data/gauge.js` design, `dev/aibuild/core.js` 메시지, `ui/screens/personabuilder.js`(번역·대화 2곳)에서 제거. 장기기억 분석(`noUserPrompts`, 대상 채팅 기준 직접 끼움)은 그대로.
- 테스트 `tests/defaultprompts.test.js` 3. `npm test` 635 pass / 0 fail, build·check 동일함, smoke 0 실패. 실제 모델 응답 영향은 미확인.

## 릴리스 v1.8.2 (2026-11-02, 사용자 지시)
- 릴리스 전 점검으로 추가 수정: 감정 이미지(`emotionImages`)도 에셋으로 읽음(빠지면 정상 태그가 지워질 수 있었음), 그룹 채팅은 교정 안 함, 상황 알림은 최근 응답 20개만 읽음. 테스트 3건 추가(`npm test` 638 pass).
- `package.json` 1.8.2, CHANGELOG `## v1.8.2 (2026-11-02)`(새로 생긴 것/바뀐 점/가벼워진 점/고친 점으로 정리), 아카 글 `docs/arca/v1.8.2.html`(태그 자동 교정이 중심, 시리즈 20편, v1.8.1 글 https://arca.live/b/characterai/187757569).
- feat/1.8.2 → main 빨리감기 머지 → release.yml이 v1.8.2 릴리스 생성.
- 다음 작업은 새 브랜치에서(사용자 지정 필요).

## v1.8.3 개발 중 (feat/1.8.2 브랜치에서 이어서, package.json은 1.8.2 그대로)
- 옷 규칙 변경(사용자 결정 2026-11-02): **동작 우선** — 옷에 없는 키워드는 그 키워드가 있는 다른 옷으로(`engine/imgtagfix.js` resolveIn, kind "outfit"). 어느 옷에도 없으면 그 옷의 default. 이전 (나) 규칙 문구는 모두 이걸로 대체.
- 에셋 태그 고치기: AI 키워드 목록이 그 캐릭터의 모든 옷 키워드(중복 제거), 답은 같은 옷 우선 → 없으면 그 키워드가 있는 옷. 상황 알림 문구에 'action only in another outfit → use that outfit' 추가.
- 테스트 갱신·추가, `npm test` 640 pass / 0 fail.
- (2026-11-02) 사용자 지시로 **v1.8.2 재릴리스**에 포함: CHANGELOG의 v1.8.3(개발 중) 항목을 v1.8.2로 합침, 아카 글 1-2를 '옷보다 동작이 먼저'로, 3-3 문구 수정. release.yml 주석 한 줄로 재실행(같은 버전 → 파일·설명 교체).

## 다음 후보: 장기기억이 사람 사이 커뮤니케이션을 더 잘 반영하게 (사용자와 검토 중, 2026-11-02)
- 확인한 현황: 감정 수치(`engine/memoryemo.js`)는 시간 감쇠 없음 · `attr` 종류는 pref|rel|job|home|belief 5가지(외모·성격 없음) · 거짓말/잘못된 믿음 기록 없음(`know`는 '누가 아는가'만) · 호칭·말투는 리수폿 위키 `core.speech`에만 있고 Dusk 분석엔 없음 · 재등장 공백 표시 없음 · 변화는 `memorytrust.js` classify/chain → 주입 때 `changeNote` "(was: …)".
- 후보: ① 외모·성격·처지 attr 추가 ② 재등장 공백 표시 ③ 변화 이전 기록 '(예전)' 표시 ④ 감정 식기(종류별 속도, 큰 사건은 느리게) ⑤ 잘못된 믿음/거짓말 기록 ⑥ 쌍별 호칭·말투 상태 ⑦ 갈등·사과·앙금 항목 ⑧ '누구 앞에서' 태도. 모두 기존 분석 호출에 얹기(추가 호출 없음). 추천 우선순위: ④·⑥ → ⑤ → ①~③.
- 새 브랜치에서 진행 권장(사용자가 이름 지정).
- 추가 후보(인간다움): ⑨ 관계 진도(쌍별 단계 — 감정 수치·함께한 장면·비밀로 코드 계산, '너무 빨리 친밀해지지 않기') ⑩ 둘만의 추억·농담(분석이 가끔 표시, 그 쌍이 함께 나오면 하나 주입) ⑪ 기억 흐려짐(잊기 전 단계에 '(흐릿한 기억)' 표시, 코드만) ⑫ 인물 목표(바라는 것/막는 것 1개) ⑬ 기념일(이야기 시간과 사건 날짜 일치 시 한 줄, 코드만) ⑭ 첫인상(첫 만남에만 기록, 얕은 관계일 때만 주입).
- 기준 모델: 사용자는 보조모델 하한을 DeepSeek V4 Flash로 봄 → 새 분석 항목은 짧은 규칙·한 줄 예시·'없으면 생략'·항목별 독립 검증(망가져도 기존 people/scene 유지), 판단이 어려운 ⑤는 기본 꺼짐 스위치.
- 추천 1차 묶음: ④ 감정 식기 · ⑥ 호칭·말투 · ② 재등장 공백 · ⑨ 관계 진도 · ⑪ 기억 흐려짐 · ⑩ 둘만의 추억.

# feat/1.8.3 — 사람다운 기억 (진행 중, 2026-11-02 사용자 지시)
범위: ①외모·성격·처지 변화 ②재등장 공백 ③변화 이전 기록 '(earlier)' ④감정 식기 ⑤거짓말·잘못된 믿음(기본 꺼짐) ⑥호칭·말투 ⑨관계 진도 ⑩둘만의 추억 ⑪기억 흐려짐. 추가 AI 호출 없음.
설계:
- 새 순수 모듈 `engine/memoryhuman.js`: 감정 실효값·식기(종류별 반감기, 바닥값), 재등장 공백, earlier 집합, fading, 관계 진도(공유 장면 수 + 애정·신뢰), talk/bond/belief 검증·반영·되돌리기(src, prev), 분석 입력·주입 문장, 분석 규칙 문장.
- 저장(폴더에 새 키, 기존 형식 변경 없음): `folder.talk[from>to]={from,to,call,tone,prev,src,at}`, `folder.bonds[]={id,a,b,moment,hook,at,src,used}`, `folder.beliefs[]={id,who,thinks,truth,by,open,src,at}`.
- 분석: attr 종류에 look·trait·status 추가, `talk`(최대 2, 처음·바뀔 때만), `bond`(중요 응답에서 최대 1), `belief`/`cleared`(설정 켤 때만 규칙·입력 포함). 입력에 talkState·beliefs.
- 감정 식기: 저장값은 분석 직전에 실효값으로 내려 적고(log why "cooled"), 주입·분석 입력은 실효값. 실제 변화(log why≠cooled) 기준 경과로 계산.
- 설정(memory inject): human(②③⑨⑪, 기본 켬) · cool(④, 기본 켬) · beliefs(⑤, 기본 끔). 화면은 기억 고급 설정(madv.js).

## feat/1.8.3 결과 (2026-11-02)
- 구현: `engine/memoryhuman.js`(위 설계 그대로) + 연결: `memoryprompt.js`(규칙 `humanRules`를 본문에 넣은 뒤 `withCustom(custom, base)`로 앞·중간·뒤 적용 — 게이지 규칙이 '뒤' 프롬프트 뒤에 붙던 기존 문제도 함께 해결, 입력 talkState·beliefs·beliefsOn, `validate`→`human`), `memoryapply.js`(applyAnalysis `cool` 옵션: coolEmo 후 applyEmo, applyHuman), `memoryreconcile.js`(revertHuman), `memoryemo.js`(emoForPrompt·emoLines에 `{now, eff}`), `memorytrust.js` ATTR_CATS look·trait·status, `data/memoryrunner.js`(coolOf·talk/belief 입력·cool 옵션), `memoryinject.js`(earlier/vague 표시, 재등장 공백, stage·talk·bond·belief 섹션 각 예산), `ui/screens/memory/madv.js` 스위치 3개(inject.human·cool 기본 켬, beliefs 기본 끔).
- 분석 지침 증가: 약 +100토큰(거짓말 켜면 +190). 주입은 해당 상황에서만, 기존 예산 상한 안.
- 테스트: `tests/memoryhuman.test.js` 11, `tests/memoryhuman-flow.test.js` 4, `prompt-position.test.js` 보강. `npm test` 655 pass / 0 fail, build·check 동일함, smoke 0 실패.
- 확인 못 한 것: 실제 보조모델(특히 DeepSeek V4 Flash 추론 끔/낮음)이 talk·bond·belief 형식을 지키는지와 판단 품질, 실제 대화에서 감정 반감기 값(적대 80·두려움 120·의존 240·애정 400 메시지)이 자연스러운지. 인물 위키 화면에는 talk·bonds·beliefs를 아직 보여 주지 않음(편집 UI 없음) — 필요하면 다음 작업.
- 리수폿 합친 호출(link.take) 결과에는 새 항목이 없음(그 경로는 사람다운 기억 분석 항목 없이 동작, 코드 계산 기능은 그대로 적용).

## 인물 위키 개편 (구현 완료, 2026-11-02, feat/1.8.3)
- 새 `ui/screens/memory/personv2.js` `personTabs(env,{r,doc,p,header,infoBlocks,logBlocks})` — `wikiview.js` personPage가 호출. 상태: `m.wkTab2`(sum|rel|info|log) · `m.wkWith`(관계 상대) · `m.wkFeelRev`.
- 탭 '요약 / 관계 / 상세 정보 / 기록'. 목업의 '달라진 점' 탭 대신 **'상세 정보'**(기존 위키 블록: 프로필·수치·기록 묶음·위키 패널). 달라진 점은 요약 카드 '이전과 달라진 점'에 표시. '기록' = 기존 관리(manage)·이야기 기록.
- 요약: 지금의 ○○(요약글+성격·처지·외모 칩) · 이전과 달라진 점 · 관계 한눈에(4칸 막대, 누르면 관계 탭) · 기억에 남은 순간(A~D, 예전 모습/흐릿한 기억).
- 관계: 상대 고르기 → 관계 진도 · 감정(식기 전 흐린 막대·식은 안내·반대 방향 보기·고치기=setTag) · 호칭·말투(고치기/직접 적기·잠그기·지우기) · 둘만의 추억(고치기·지우기) · 기대 차이 · 오해(진실을 알았어요·지우기).
- 엔진: `engine/memoryhuman.js` 끝 nowOf·counterparts·pairView·changesOf·currentAttrs·momentsOf + 편집 setTalk·toggleTalkLock·deleteTalk·editBond·deleteBond·resolveBelief·deleteBelief(사용자 수정은 user/lock 표시, src 제거). 시험 `tests/memoryhuman-view.test.js`.
- 수치·게이지: `wikiview.js`가 `parts.metrics`(doc.metrics → label·대상 이름) · `parts.gauges`(=`gaugeui.js` `gaugeRows`, 비동기)를 넘김. 요약 '수치 한눈에'(전부) · 관계 탭 '수치'(대상에 그 상대가 있는 것만) · 감정 카드 '아직 없음' 줄. 원래 카드(수치 상태·감정 게이지·게이지 블록)는 상세 정보에 그대로.
- CSS: `styles.js` `.rb-wk2-*` 블록(토큰만). `@container memwrap (min-width:1100px)`에서 요약 칸 고정 + 탭 칸 2열(요약 탭 숨김).
- 단어: 사용자 지시로 "일반적으로 알아들을 수 있을 정도"(관계 진도·감정·호칭·말투·둘만의 추억·기대 차이·오해).
- 확인: 실제 앱(tests/e2e/app.entry.js 기억+기록 데이터에 사람다운 기억·게이지 추가)으로 모바일 390px·PC 1440px 모든 탭 사진. 참고: 실제 앱 창은 PC에서도 기억 영역이 1100px 미만이라 '요약 왼쪽 고정' 2단은 거의 안 보이고 탭으로 동작. 이전엔 Playwright 가짜 데이터로 390px·1300px 사진(가로 넘침 없음, 오류 없음). 실제 RisuAI/RisuBard/PocketRisu 화면·실제 데이터로는 미확인.

## 1.8.3 추가 (2026-11-02): ⑦ 갈등·사과·앙금 · ⑧ 사람 앞 태도 · 상세 정보 탭 정리
- 엔진 `engine/memoryhuman.js`: 분석 `rift`(최대 1: id?, a, b, about, state open|apologized|resolved, grudge none|some|deep, who) · `face`(최대 1: who, to, alone, public). 저장 `folder.rifts[]`(back/src로 되돌리기, 깨끗이 화해=닫힘, 'some' 앙금은 화해 후 GRUDGE_FADE=200응답 뒤 주입 안 함) · `folder.faces{who>to}`. 분석 입력 `rifts`(열린 것), 주입 섹션 rift·face(장면에 둘 다 있을 때, 3명 이상이면 '다른 사람 있음'). 스위치는 inject.human. 규칙 길이 680자(시험 상한 700). 편집 resolveRift·deleteRift·setFace·deleteFace(잠금). 시험 `tests/memoryhuman-rift.test.js`.
- 관계 탭(`personv2.js`): 갈등 카드 · 사람 앞 태도 카드.
- 상세 정보 탭: 새 `ui/screens/memory/infotab.js` `infoTab(env, B)` — `wikiview.js` personPage가 `info: (go) => infoTab(...)`로 넘김(예전 profileBlock·metricCards·emoCards·secCard·blocks 삭제). `gaugeui.js`에 `gaugeSuggestBox`. 빈 항목 칩 → 채우기 창(좁은 화면은 아래 시트, `:has` 미지원이면 가운데 창). 'AI로 빈칸 채우기'는 기존 fillPlan(이 인물만: 빈 수치·성격) 그대로 — 빈 기록 묶음까지 한꺼번에 채우지는 않음.
- 레이아웃: 위키 페이지는 `memwrap` 컨테이너 안이 아니었음(→ 예전 `@container memwrap` 규칙이 안 먹던 원인). `.rb-wk2`를 `container:wk2`로 두고 상세 정보 2열은 `@container wk2 (min-width:760px)`, 요약 고정 2단은 `(min-width:1100px)`.
- 시험: smoke의 감정·게이지 확인 4개가 첫 위키 개편(35566f2)부터 실패하고 있었음(정보가 탭 뒤로 옮겨짐) → 새 구조로 고침, smoke 53/0. `run-app` 사이드바 순서·`run-memed` '기억 방식 아래 편집기'는 main에서도 실패하는 기존 실패.
- 최종 디자인: 인물 위키 최종안 캔버스(탭 4개 모바일·PC). 구현은 여기에 갈등·사람 앞 태도 카드가 더 있음.
- (2026-11-02) 간단 모드 기억 화면에 '기억 옵션' 카드(`mhome.js` memOptions, 고급 모드에선 숨김): inject.human·cool·beliefs 스위치 3개(고급 '대화에 넣기'와 같은 설정, `builders().save`). 주의: human은 inject.plus(장부 넣기, 고급 전용·기본 켬)가 켜져 있어야 동작. `run-app.mjs` 3단계 '간단 모드 스위치 1개' 검사는 머리 스위치만 세게 바꾸고 옵션 3개 검사 추가 — 단, run-app은 그 앞 사이드바 검사(기존 실패)에서 멈춰 3단계까지 못 감. 직접 Playwright로 저장·다시 그리기 확인함.

## 다음 작업: 전체 탭 UI 다듬기 (사용자 결정 2026-11-02, 아직 시작 전)
- 범위: **전체 탭 한 번에** — 홈 / 기억(장기 기억 메인·상황·시간선·열린 항목·관계, 코코아, 기억 카드) / 관리(캐릭터·모듈·플러그인) / 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정). 인물 위키는 끝남.
- 방식: **목업 먼저 → 사용자 확인 → 구현**. 새 Design 캔버스에 탭마다 '지금 / 개편안' 모바일(390) + PC(1280). 기존 UI 스타일(토큰 --rb-*, 카드·칩)은 유지.
- 목표 스타일 = 인물 위키 최종안: 자주 쓰는 것만 카드 · 빈 것/드문 것은 칩·한 줄 · 고정/삭제 등 부가 동작은 '…' 메뉴 · 위쪽 바로가기(넓으면 왼쪽 목록) · 넓은 화면 2열 · 쉬운 말(일반적으로 알아들을 정도).
- 현재 화면 사진: `tests/e2e/app.entry.js`의 `bootApp(seed,{memory:true,story:true})`로 실제 앱을 띄워 찍는다. 모바일은 뷰포트를 7000px로 늘려 요소 사진, PC는 앱 창이 높이 고정이라 안쪽 스크롤 영역을 내려가며 찍어 PIL로 이어 붙임(sticky 요소는 static으로). 첫 둘러보기 '건너뛰기', 임베딩 안내 '나중에'를 먼저 닫아야 함.
- 결정(2026-11-02, 목업 1 확정): 홈은 PC·모바일 모두 개편안(상태 카드+숫자 3개·이어서 하기·최근 기록, 빠른 설정은 지금 토글 5개 그대로 — 공정한 전개·유저 편향 없애기·이야기 시간 자동 삽입·이미지 태그 자동 교정·상황 알림, PC는 오른쪽 열 최근 기록 아래)이되 **바로가기(작은 4칸)와 '처음 둘러보기'는 유지**. 기억·작업실(·관리) 개요는 개편안(목록형 행+한 줄 요약, 작업실은 자주 쓰는 둘만 큰 카드). **모든 화면의 ? 도움말 버튼은 유지.**
- 진행: 목업 1 완료(`docs/mockups/ui-polish-1-hubs.html`, 사진 뺀 가벼운 판), 다음은 목업 2(장기 기억 묶음).
- (이전 기록) 목업 1 제작. 이후 목업 2(장기 기억 메인·상황·시간선·열린 항목·관계, 코코아, 기억 카드) → 3(캐릭터·모듈·플러그인) → 4(꾸미기·AI 봇·AI 페르소나·도구·설정). 구현은 목업 확인 뒤. 소스 코드는 아직 안 건드림.
- 촬영 요령 실제: 환경은 `npm ci` 불가(lock 없음) → `/opt/npm-tools/node_modules`의 esbuild·acorn·@esbuild·playwright를 `node_modules/`에 심볼릭 링크. 앱 화면은 `bootApp({...},{memory:true,story:true})` 후 '건너뛰기'·'나중에' 버튼을 눌러 닫고 촬영(모바일 390 하위 화면은 개요 카드를 눌러 들어가야 함).
- 주의: ① 컨테이너 쿼리는 실제 조상에 그 컨테이너가 있는지 확인(위키는 memwrap 밖이었음) ② e2e는 마지막 줄이 아니라 `grep ✘` 전체로 확인 ③ 기존 실패: run-app '사이드바 순서'(여기서 멈춰 뒤 단계 미실행), run-memed '기억 방식 아래 편집기' — main에서도 실패.

## 설정 '이야기 도우미 세부' 설명 정리 (2026-11-02)
- `ui/screens/settingstab.js` 고급 '이야기 도우미 세부'에서 유저 편향 없애기·공정한 전개 설명 note 2줄 삭제(재해석/존중 segmented와 그 설명, 이야기 시간 설명은 유지). CHANGELOG v1.8.3 '바뀐 점'에 기록.
- 홈 개편 때 참고: 두 기능 설명(유저 편향=공정한 전개 켜져 있을 때만 작동, 공정한 전개=요청이 조금 길어짐)을 홈 토글 쪽(ⓘ 등)에 붙일지 사용자에게 확인 중. 재해석/존중은 고급 설정에 남기는 쪽으로 제안.
- (2026-11-02, 사용자 결정) 홈에서 공정한 전개 꺼짐 + 유저 편향 켜기 → 공정한 전개도 함께 켜고 토스트로 이유 안내(`ui/screens/home.js` setDice, fairCur·fairSw). 공정한 전개를 끌 때 유저 편향은 그대로 둠(요청 없음). 시험 `tests/e2e/run-home-fair.mjs`(수정 전 3개 실패 확인).
- 다음: 전체 탭 UI 다듬기 목업 2 = **코코아 · 기억 카드** 탭부터(사용자 지정).
- (2026-11-02) 목업 2 '코코아·기억 카드' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-2-cocoa-cards.html`, 사진 뺀 판). 요지: 코코아 = 제목 1개+? · 켜기 카드에 '3개 중 1개 사용 중' · '사용할 스킬'과 '스킬 세트'를 한 목록으로(간단=줄마다 스위치, 고급=줄 아래 붙는 곳 칩 4개) · ZIP/JSON/삭제는 ··· · 'AI로 만들기'는 목록 머리(떠 있는 버튼이 모바일 탭바와 겹침) · 고급 묶음 한 줄씩 · PC 2열. 기억 카드 = 봇·채팅 한 줄 카드('바꾸기') · 만든 카드/새로 만들기 segmented · 2열 타일+'＋ 새 카드' · 단계 동그라미 5개 · 이전/다음 아래 오른쪽 고정 · PC는 오른쪽 카드 미리 보기.
- 발견한 버그(구현 때 수정): 기억 카드 탭 새로 만들기 단계 목록이 '1. 1. 인물'로 번호 이중 표시(`ui/screens/memory/compose.js` `ol.rb-mem-steps`, 카드 탭 `rb-cards2`에서 목록 CSS 미적용 추정).
- 촬영 요령 추가: 코코아는 `bootApp` 후 `__app.ctx.skills = createSkillStore(__api)`로 스킬 저장소를 넣고 세트를 importSet해야 실제 화면이 나옴(없으면 '준비되지 않았어요'). 경로는 `ctx.go("cocoa")`, `ctx.go("cards")`(state.mem.ctab="compose"로 새로 만들기).
- (2026-11-02) **목업 2 사용자 승인**("깔끔하고 직관적"). 다음 할 일: 목업 2대로 코코아(`ui/screens/memory/skills.js`, `ui/screens/cocoa.js`)·기억 카드(`ui/screens/cards/index.js`, `memory/cards.js`, `memory/compose.js`) 구현 + 단계 번호 이중 표시 버그 수정. 그다음 목업 3(관리: 캐릭터·모듈·플러그인) → 4(작업실). 목업 1(홈·개요)도 승인 상태라 함께 구현 가능.
- (2026-11-02, 사용자 결정) **진행 방식 변경: 모든 탭 목업을 먼저 하나씩 만들고 확인받은 뒤, 구현은 한 번에.** (위 '다음 할 일: 목업 2 구현'은 보류)
  - 완료·승인: 목업 1 홈·개요(`docs/mockups/ui-polish-1-hubs.html`) · 목업 2 코코아·기억 카드(`docs/mockups/ui-polish-2-cocoa-cards.html`).
  - 남은 목업 순서: ③ 장기 기억 묶음(메인·상황·시간선·열린 항목·관계) → ④ 관리(캐릭터·모듈·플러그인) → ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정). 탭마다 '지금(사진) / 개편안' 모바일 390 + PC 1280, 사용자 확인 후 다음.
  - 목업 공통 규칙(확정): 자주 쓰는 것만 카드 · 부가 동작은 ··· 메뉴 · **? 도움말 버튼은 모든 화면 유지** · 넓으면 2열 · 쉬운 말 · 기존 토큰(--rb-*). 목업 HTML은 scratchpad의 생성 스크립트로 만들고, 저장소엔 사진 뺀 가벼운 판을 `docs/mockups/ui-polish-N-*.html`로 커밋(프로젝트 문서는 용량 가득이라 저장 불가).
  - 구현 단계에서 할 것: 목업 1~5 전부 + 기억 카드 단계 번호 이중 표시 버그. 공용 부품(목록 줄···· 메뉴·segmented·고급 묶음)은 kit.js로 묶기 검토.
- (2026-11-02) 목업 3 '장기 기억' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-3-memory.html`, 사진 뺀 판). 목업 1·2·인물 위키 규칙 그대로. 요지: **메인** = 머리 스위치+'사용 중' 카드를 상태 카드 하나(스위치·숫자 3·막대·범례)로 합침 · '지난 대화 분석'만 큰 버튼 · 인물 위키/기록 보기/카드로 만들기/다른 채팅은 작은 바로가기 4칸 · 기억 옵션 토글 3개 유지 · 설정은 한 줄 요약 목록 · 고급은 한 줄씩 접은 묶음 · PC 2열. **기록 보기**(mdetail.js) = 5구역(인물 위키·상황·시간선·열린 항목·관계) 칩에 개수 표시, **한 번에 한 구역만**(지금은 한 페이지 앵커 스크롤 → 동작 변경, 사용자 확인 필요) · 빈 구역은 한 줄 안내 · 상황·시간선은 세로 점 시간선 · 열린 항목 해결 버튼+···(삭제) · PC는 왼쪽 구역 목록+오른쪽 내용. **봇별 기억** = 틀 유지, '기억 켜짐 N/전체' 요약·지금 채팅 고정·? 추가.
- 촬영 요령 추가: 기록 보기는 `state.mem.page="detail"`만으론 안 열림 → 기억 홈에서 '인물 Wiki' 버튼 클릭으로 진입(botId 설정됨). 테스트 환경에서 봇별 기억·PC 기록 보기는 오류 알림이 섞여 사진 생략.
- (2026-11-02, 목업 3 확정·사용자 결정) 장기 기억 목업 3 전부 승인. **추가 결정: PC 고급 모드에서 '기억 방식'(자동/플러그인/BardWiki/끔 segmented)은 접지 않고 오른쪽 열 맨 위에 바로 보이게**(고급 묶음 목록에서는 뺌). 모바일 고급은 기존대로 접은 묶음(사용자가 PC만 지정함).
- 남은 목업: ④ 관리(캐릭터·모듈·플러그인) → ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정).
- (2026-11-02) 목업 4 '관리(캐릭터·모듈·플러그인)' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-4-manage.html`, 사진 뺀 판). 요지: **캐릭터**(`ui/screens/characters.js`) 도구 두 줄 → 한 줄(개수·정렬 요약 + 'AI로 봇 만들기' + '＋ 새 봇' + ···[선택·폴더·정렬·가져오기]), 줄은 '편집'+···(AI로 다듬기·에셋·폴더 이동은 ···), '지금 채팅' 라벨, PC 2열 카드. **모듈**(`modules.js`) 필터 칩 6→'전체·켜짐·꺼짐'+'종류 ▾'(전역·LLA·MCP), '연결 N'은 이름 아래 작은 칩, 줄은 스위치·편집····, 도구 한 줄('＋ 새 모듈'+···), PC 2열. **플러그인**(`plugins.js`) 제목·설명 중복 제거, 탭(목록·연동 설정·만들기·저장소) 유지, 도구 한 줄('업데이트 확인'+···[새로고침·내보내기]), '미분류 N'은 접는 머리. 개요 화면은 목업 1 기준.
- 남은 목업: ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정).
- (2026-11-02, 목업 4 수정·사용자 결정) **캐릭터·모듈은 리스트형 유지(PC 2열 카드 안 함), 정렬·폴더 버튼은 밖에 그대로**, 끌어서 순서 바꾸기(⠿)·폴더 머리 줄 유지. ···에는 드문 것만(캐릭터: 선택·가져오기 / 모듈: 선택). 새 디자인 스타일(카드·줄 모양·'지금 채팅' 라벨·'연결 N' 칩·필터 '종류 ▾')은 승인. 플러그인 개편안은 승인("깔끔").
- (2026-11-02) 목업 4 최종 승인("이대로"). 목업 5 '작업실' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-5-work.html`). 요지: **꾸미기**(themestudio/look) 제목 1개·색·밝기·글자 크기 한 카드·'내 채팅 테마 만들기'는 한 줄 목록·PC 2열(오른쪽 미리보기 고정). **AI로 봇 만들기**(aitab.js) 1·2·3 번호 단계 카드·'AI 창 열기'는 아래 고정 하나(위쪽 중복 제거)·안쪽 탭 5개는 한 줄 칩·'사용법'은 ?로·봇 편집 머리/탭 줄 유지·PC 오른쪽 시작하기 상자 고정. **AI로 페르소나**(personabuilder.js) 제목 3중 제거·페르소나 한 줄+····AI로 쓰기는 글 상자1+전체 쓰기/빈 칸만 채우기(추가 지시·번역·수정은 ···)·슬롯머신 한 줄로 접기·항목 폴더는 줄(개수·AI·스위치), 누른 것만 펼침·PC 2열·떠 있는 'AI 대화' 유지. **도구**(tools.js) 타일 7개 → '자주 쓰는 도구 3'+'확인·복구 4' 목록·'도움 주신 분들'은 내용 그대로 한 줄 목록·PC 2열. **설정**(settingstab.js) 간단은 묶음 이름만(화면·백업·도움말)·고급은 묶음별 한 줄 목록(현재 값 오른쪽), 재해석/존중은 바로 고르기 유지, 정리·기록 타일→목록, '이럴 땐 여기로'는 ? 안으로·PC 2열.
- (2026-11-02) 버그 2건 수정(사용자 리포트):
  - 홈 '장기 기억(모든 채팅)' 스위치: 원인 = `home.js` refreshStatus가 상태 줄을 다시 그릴 때 처음 읽은 `globalOn`으로 스위치를 새로 만들어 눌러도 되돌아감(끈 뒤 다시 켤 수 없음). 수정 = refreshStatus에서 `memoryGlobalOn(최신 idx)`로 다시 읽음. 시험 `tests/e2e/run-home-memall.mjs`(수정 전 2개 실패 확인).
  - 호감도 HUD가 Yumi Translator 플로팅 버튼과 겹침: 원인 = `engine/affhud.js` 기본 CSS `.dafx-aff{top:12px;right:12px}`. 수정 = `top:max(112px, calc(env(safe-area-inset-top) + 100px)); right:max(12px, env(safe-area-inset-right))`(사용자 제안값), AI 디자인 지침(`affprompts.js`) 위치 문구도 맞춤. 시험 `tests/affhud.test.js` 1개 추가. **이미 설치된 HUD(봇 배경 HTML에 저장됨)는 자동으로 안 바뀜** — 다시 설치해야 적용(자동 마이그레이션은 저장 데이터 변경이라 사용자 확인 필요).
- (2026-11-02, 목업 5 수정·사용자 지시) 도구 '도움 주신 분들'에서 **원문 글 링크 제거**(이름·한 줄 설명만). **플러그인 꾸미기 폭 확장**: 테마 묶음 6(기본 회백·따뜻한 종이·차가운 회색·숯·미드나잇·보랏빛 밤 = 바탕+강조) · 강조 색 6→12(따뜻한/차분한) · 그라데이션 5(노을·황혼·밤하늘·오로라·복숭아)+직접 · 글자 크기 '아주 크게' · 고급 직접 색에 바탕·카드·글자 색(+대비 검사·자동 맞추기) · 모양(모서리·그림자·테두리·글꼴[기본·기기 글꼴·명조·둥근]) · 움직임 줄이기 · 내 테마(저장·테마 코드 주고받기) · PC 3열(미리보기 고정). 구현 시 `theme.js`에 새 토큰·정규화(예전 저장 테마 호환), 대비 검사, 외부 글꼴 불가(기기 글꼴만).
- (2026-11-02, 목업 5 수정 2·사용자 지시 "조금 더") 꾸미기 추가 확장: 테마 묶음 12(+벚꽃·민트 크림·세피아·OLED 블랙·숲속·바다)+'🎲 아무거나' · 강조 색 18(파스텔 6 추가, 버튼 글자 자동 어둡게) · 그라데이션 8(+숲·모래·네온)+방향(가로·대각선·세로) · 밝기 '시간 따라' · 고급 '바탕'(무늬 없음·점·모눈·종이 / 바탕 그라데이션 / 카드 유리 효과 / PC 사이드바 색 / 강조 색 쓰는 곳) · 모양에 아이콘 굵기 · 글자(글꼴 5[+고정폭]·굵기·줄 높이) · 내 테마 여러 개 저장·밝을 때/어두울 때 따로 · 미리보기 밝게/어둡게 전환.
- (2026-11-02, 사용자 요청) 목업 6 '시작 안내'(처음 설치 시 플러그인 창 전체 화면 마법사) 제작 → 확인 대기(`docs/mockups/ui-polish-6-onboarding.html`). 단계: 0 환영('설정하고 시작하기'/'나중에 하기'=기본값) · 1 화면 모드·글자 크기 · 2 테마 묶음·밝기(즉시 미리보기) · 3 장기 기억 켜기·기록할 AI(리스 보조 모델/내 API)·수준(가볍게/기본/전부) · 4 기억 옵션 3·이야기 도우미 4 토글 · 5 이미 쓰던 것(HypaPlus·코코아전트·RisuPot 중복 경고·임베딩, 찾은 것만/없으면 자동 통과) · 6 요약+'바꾸기'+? 안내. 단계마다 건너뛰기·이전, 즉시 적용. PC: 왼쪽 단계 목록·가운데·오른쪽 미리보기.
  - 합칠 것(자동 표시 중단): 처음 둘러보기(`ui/tour.js` 11단계) · 기억 '처음 설정하기'(`memory/setup.js`, `engine/firstrun.js` WIZARD) · 임베딩 안내(`memory/embeddingguide.js`) · HypaPlus 안내(`memory/hypamodal.js`) · 프롬프트 첫 안내(`promptstab.js` maybePromptIntro). 유지: ? 화면별 둘러보기(`ui/screentours.js`, 누를 때만) · '새로 바뀐 점'.
  - 대상: 새로 설치한 사람만 자동. 기존 사용자는 '새로 바뀐 점'에 '시작 안내 다시 보기' 버튼, 설정 → 도움말에도 추가. 기존 설정 건드리지 않음.
- (2026-11-02, 목업 6 승인·수정) 시작 안내 승인. **2단계 꾸미기는 '플러그인 꾸미기' 기본 화면과 같은 선택지**: 미리보기(맨 위) · 테마 묶음 12+🎲 아무거나 · 강조 색 18(따뜻한·차분한·파스텔) · 그라데이션 8+방향 · 밝기 4 · '모양·글꼴 더 고르기' 펼침(모서리·그림자·글꼴·바탕 무늬). 구현 시 꾸미기 화면과 같은 부품을 재사용할 것.
- **목업 1~6 전부 확정 → 다음은 한 번에 구현**(새 챗 권장). 순서 제안: 공용 부품(kit) → theme.js 확장 → 홈·개요 → 장기 기억 → 코코아·기억 카드 → 관리 → 작업실 → 시작 안내(기존 자동 안내 5개 정리) → e2e/스크린샷 확인.
- (2026-11-02, 목업 6 수정) PC 시작 안내 2단계: 가운데 = 테마 묶음·강조 색·그라데이션, **오른쪽 = 미리보기 아래에 밝기 → 그라데이션 방향(가로·대각선·세로) → '모양·글꼴 더 고르기'**.
- (2026-11-02, 사용자 결정·목업 6 최종) **임베딩 설정은 3단계(장기 기억)에서 함께**(5단계에서 빼기). **시작 안내는 기존 사용자·새 사용자 상관없이 처음 한 번은 무조건 자동으로 띄움**(본 적 있는지 저장 키로 한 번만). 앞의 '새로 설치한 사람만' 문구는 이것으로 대체.

# 구현 진행 (목업 1~6, 2026-11-02 시작)
- (2026-11-02, 목업 6 수정·사용자 결정) **3단계 장기 기억에 임베딩 설정 포함**(쓰기 스위치·API 주소·모델·키(이 기기에만)·연결 테스트, 선택 사항 — 기존 `memory/embedmodal.js` 저장 로직 재사용). 5단계에서는 임베딩 뺌. **표시 대상 변경: 새로 받은 사람·기존 사용자 상관없이 이 버전을 처음 열 때 모두에게 한 번 무조건 표시.** 기존 사용자는 현재 설정이 미리 골라진 채 시작(초기화 없음), 끝내거나 '나중에 하기' 후엔 자동으로 다시 안 뜸, 설정 → 도움말 '시작 안내 다시 보기'. (위 '새로 설치한 사람만' 문구는 이걸로 대체)
- (2026-11-02, 사용자 지시) 시작 안내 임베딩: **기존 기본값을 미리 채움**(`engine/embed.js` DEFAULT_EMBED — 주소 `https://api.voyageai.com/v1/embeddings`, 모델 `voyage-4-large`, 스위치 꺼짐). 키만 넣으면 켤 수 있게. 기존 사용자는 저장된 값이 있으면 그 값을 보여 줌.
- (2026-11-02, 구현 1차 완료·푸시) **공용 부품 + 꾸미기**: `ui/themekit.js`(카탈로그: 테마 묶음 12·강조 색 18·그라데이션 8·글꼴 5 등) · `ui/theme.js` 확장(새 필드 기본값=예전 모습, 예전 저장 호환, `applySet/randomSet/themeCode/parseThemeCode/pickLook`, 묶음·직접 색 대비 자동 맞춤, 밝기 'time') · `ui/lookparts.js`(꾸미기·시작 안내가 같이 쓸 선택 부품; `lookParts({get,set})`) · `ui/screens/settings.js` 꾸미기 재작성(PC 2열+미리보기 고정, 내 테마, 코드) · `styles.js` 끝에 새 토큰 CSS · `app.js applyTheme`에 rb-glass/rb-calm. 시험: `tests/theme-v2.test.js`, `tests/e2e/run-look.mjs`(PC·모바일 34항목).
- **남은 구현(순서)**: 홈·기억 개요(목업 1) → 장기 기억(3) → 코코아·기억 카드(2, '1. 1. 인물' 번호 버그) → 관리(4) → 작업실: AI봇·페르소나·도구·설정(5) → 시작 안내(6; 꾸미기 부품 `lookParts` 재사용, `ui/tour.js` 등 자동 안내 5개 정리). 참고: 모바일 아래 탭은 이미 홈·기억·관리·작업실 4칸. 원격에 `build: dusk_atelier.js` 자동 커밋이 올라오니 push 전 `git pull --rebase`(충돌 나면 `npm run build`로 재생성). `tests/e2e/run-app.mjs`는 앞부분이 옛 구조라 '사이드바 순서'에서 막힘(기존 실패).
- (2026-11-02, **구현 완료** · 목업 1~6 전부) 커밋으로 나눠 푸시함. 파일별 요지:
  - 홈 `screens/home.js`(상태 카드+숫자 `rb-hnums`, 작은 바로가기 `rb-hdo-sm`, 이어서 하기 `rb-hcont`) · 개요 `screens/sectionhome.js`(목록 행 `rb-hubrow`+개수, 작업실 큰 카드 2, `app.js`가 개요에서 `rb-on-hub`로 칩 줄 숨김).
  - 장기 기억 `memory/mhome.js`(상태 카드 `rb-mem-statuscard`, 바로가기 4, 고급은 `madv.js advancedGroups()` → 접은 묶음 `rb-mem-grp`; PC 고급은 기억 방식 오른쪽 맨 위) · `mdetail.js`(한 구역씩, 칩 개수, PC 왼쪽 목록) · `ledger.js`/`scenes.js` 빈 구역 한 줄 · `mbots.js` 요약.
  - 코코아 `memory/skills.js`(한 목록···· 메뉴·고급 묶음) · `cocoa.js`+`skillchat.js`(noFab, 목록 머리 'AI로 만들기'). 기억 카드 `cards/index.js`(한 줄 카드·봇/채팅 고르기 창·segmented) · `memory/compose.js`(동그라미 단계·오른쪽 이전/다음·PC 미리 보기) · `memory/cards.js`.
  - 관리 `characters.js`·`modules.js`·`plugins.js`(도구 한 줄+···, 편집+···, 지금 채팅 라벨, 종류 필터, 연결 칩).
  - 작업실 `settings.js`(꾸미기)·`tools.js`(목록 2묶음·도움 주신 분들)·`settingstab.js`(묶음+현재 값 `valRow`)·`aitab.js`(단계 카드·시작하기 상자)·`personabuilder.js`(접기·2열).
  - 시작 안내 `ui/onboarding.js`(`maybeOnboarding`/`openOnboarding`, `ONBOARD_VER=1`, 끝/나중에 → onboardDone·tourDone·promptIntroDone + 임베딩·AI 제작 안내 키 저장). `app.js` 열 때 시작 안내 → 새로 바뀐 점 → 둘러보기 순. 설정 → 도움말 '시작 안내 다시 보기'(`ctx.openOnboarding`). 기억 처음 설정 저장은 `memory/setup.js applyMemorySetup/readMemorySetup`로 나눠 같이 씀.
  - 공용: `ui/themekit.js`·`theme.js`·`lookparts.js`, CSS는 `styles.js` 끝부분 '1.8.3' 블록들. 아이콘 `message-circle`·`arrow-up` 추가(`tests/icons-used.test.js`가 없는 아이콘 이름을 잡음).
  - 시험: `tests/e2e/run-hubs·run-cards·run-manage·run-work·run-onboard·run-look.mjs` 새로. `app.entry.js` bootApp은 시작 안내를 기본 '본 것'으로(시험할 때 `opts.onboard`), 스킬 저장소(`opts.skills`로 세트 3개). `run-memed`는 새 메뉴 구조로 고쳐 통과(32/32). `run-app.mjs`는 앞부분 옛 구조라 여전히 '사이드바 순서'에서 멈춤(기존).
  - 확인 못 함: 실제 RisuAI·RisuBard·PocketRisu 화면, 기기 글꼴 차이, 시작 안내의 '내 API'·임베딩 연결 테스트 실제 호출.
- 다음 할 일 후보: `run-app.mjs` 새 메뉴 구조로 정리 · 버전 올리기/릴리스(사용자 지시 때) · 실제 환경 확인 뒤 다듬기.

## 다음 작업 (사용자 요청 2026-11-02 22:15, 아직 시작 전)
- 완료: 장기 기억 진입 시 임베딩 안내 자동 표시 제거(mhome.js).
- ① [x] **유저 편향 없애기 강도 (완료 2026-11-02)**: 홈 '유저 편향 없애기' 줄은 스위치 대신 박스 버튼(`#rb-dice-row`, 오른쪽에 꺼짐/강도 표시) → 누르면 상세 창(`ui/dicedetail.js` `diceRow`/`openDiceDetail`, 홈·시작 안내 4단계 공용). 상세 = 사용하기 스위치(켜면 공정한 전개도 같이 켬, 기존 setDice 로직) + 강도 약하게·보통·강하게 + ?(작동 방식) + **고급 모드만** 난이도 수치 4개(쉬움≤보통≤어려움≤극악, 1~100)·주사위 개수(1~6) 직접 입력('직접 입력 적용' → level=custom).
  - 수치(엔진 `DICE_LEVELS`): 약하게 10/35/60/85 · **보통 20/50/75/95(예전 값 그대로)** · 강하게 30/60/85/98. 개수는 프리셋 3. 지침 문장에 `easy N, normal N, …`로 들어감. 순수 함수 `normalizeCuts/normalizeCount/resolveDice`(engine/fairplay.js).
  - 저장(추가만, 기존 키 불변·마이그레이션 불필요): `dusk.ui.fairDiceLevel`(weak|normal|strong|custom, 기본 normal) · `dusk.ui.fairDiceCuts`(JSON) · `dusk.ui.fairDiceCount`. `data/fairplay.js`에 `loadDiceLevel/loadDiceCustom`, 훅에 `setDiceLevel/setDiceCustom/diceLevel`.
  - 같이 고침: 시작 안내(z 300) 위에서 여는 모달(z 50)이 가려지던 문제 → `.rb-onb~.rb-modal{z-index:310}`(HypaPlus 가져오기 창도 해당).
  - 시험: `tests/fairplay-level.test.js`(6개, 구현 전 실패 확인) · `tests/e2e/run-home-dice.mjs`(간단·고급 25항목) · `run-home-fair`·`run-hubs`·`run-onboard`는 새 박스 구조에 맞춰 고침.
  - 확인 못 함: 실제 보조모델이 바뀐 수치(약하게/강하게)를 지침대로 따르는지, 실제 RisuAI·RisuBard·PocketRisu 화면.
- ② [x] **주사위 결과 표시 (완료 2026-11-02)** + ③ [x] **모델 호출 표시 (완료)**: 둘 다 `data/turninfo.js`(`createTurnInfo`, main.js에서 `app.ctx.turnInfo`)와 순수 `engine/turninfo.js`. 홈 빠른 설정 토글 2개(`dusk.ui.diceShow` 기본 꺼짐 · `dusk.ui.callShow` 기본 꺼짐(2026-11-03 사용자 요청으로 변경), RisuBard=`bardWiki.getDocuments` 있으면 훅 안 달고 모델 호출 토글 숨김).
  - 흐름: beforeRequest에서 시작 시각·모델명(`getDatabase(["aiModel","subModel"])`, 30초 캐시)·입력 토큰 어림 → output에서 응답 앞부분 열쇠(`headKey`)·첫/마지막 글자 시각 기록(스트리밍은 앞부분 이어지면 갱신, 1.5초 잠잠하면 완료) → display에서 `matchRecord`로 맞는 응답 아래에 접는 블록(`x-dusk="dice"`/`"turn"`) 붙임. 저장 채팅은 그대로. 기록은 `dusk-turn-info`(최근 100).
  - 주사위: `fairPlay.lastDice()`(요청마다 굴림·수치 보관)를 응답 기록에 붙임. 판정 `judgeRoll(roll, 목표)`: 굴림−목표 ≥20 대성공 · ≥5 성공 · ±5 안 애매 · >−25 실패 · 그 이하 대실패, 1은 늘 대실패·100은 늘 대성공. AI가 어떤 난이도를 골랐는지는 알 수 없어서 4난이도 전부에 대한 판정을 보여줌. 굴러가는 애니메이션은 화면 문서에 심는 keyframes(`dusk-dice-roll`, 움직임 줄이기 존중).
  - 모델 호출: 화면 구석 칩(`x-dusk="callchip"`, 리스 화면 문서에 `getRootDocument` 래퍼로 만듦, `<details>`라 클릭만으로 펼침 → 로어북 목록은 `loreLog.last()`). 완료 15초 뒤 사라짐. 보조 호출은 출력 훅이 없어 4초만 '호출 중'으로 알림. 토큰은 글자 수 어림(`estimateTokens`).
  - 시험: `tests/turninfo.test.js`(6개) · `tests/e2e/run-home-turn.mjs`. lorelog에 `recordFor/last` 추가.
  - 확인 못 한 것(실제 호스트 필요): 모델 이름 필드(`aiModel`/`subModel`)가 RisuAI·PocketRisu에서 맞는지, 화면 구석 칩이 실제 화면에서 위치·표시가 괜찮은지(`getRootDocument` 래퍼의 `setInnerHTML` 등), 응답 아래 블록이 호스트 HTML 정리(sanitize)에서 `<details>`·`animation` 인라인 style이 살아남는지, display 훅이 스트리밍 중 반복 호출될 때 부하.
- 다음 후보: 위 '확인 못 한 것'을 실제 환경에서 확인 · 버전 올리기/릴리스(사용자 지시 때) · `run-app.mjs` 새 메뉴 구조로 정리.

## 2026-11-03 사용자 요청 묶음 (완료)
- **캐시 깨짐(치명)**: 원인 = 주사위 굴림값이 맨 앞 시스템 지침(`buildFairText`)에 들어가 요청마다 접두부가 바뀜. 수정 = `engine/fairplay.js` 고정 규칙 `diceRules`(굴림·힌트 없음)는 앞 지침에, 굴림값 `diceRollText`(`[Dusk Dice]`)는 마지막 user 메시지 바로 앞에 별도 system으로(`insertFairness`). 재해석/존중은 고정 문장만 다름 → 원인 아님. 시험 `fairplay-v168` '캐시' 케이스(마지막 user 앞까지 동일).
- 모델 호출 표시 기본 꺼짐(`loadCallShow`) · 설정 버튼 아이콘 `cog`(icons.js, app.js) · 도구 스페셜 땡스 카드(`tools.js` `.rb-sthanks*`) · 인물 위키 2열을 CSS columns(masonry)로(`.rb-wk3-grid`, `.rb-wk2-cards`) · 열린 채팅 없을 때 기억 홈에 설정 카드·기억 옵션·(고급)전체 설정(`mhome.js settingsCards`).
- **{{user}} = 나**: `engine/memoryuser.js normalizeUserNames`(페르소나 이름·user·유저·플레이어 → `{{user}}`, people·rel·emo·scene.who·know) · 분석 지침에 한 줄 추가(memoryprompt.js) · `applyAnalysis({userNames})`, runner가 `getDatabase(["username"])`(60초 캐시)로 넘김 · 위키 라벨 '나와의 관계'. 시험 `tests/memory-user-identity.test.js`. 기존에 갈라져 쌓인 페르소나 이름 인물은 자동 병합 안 함(저장 데이터 변경이라 필요하면 사용자 확인 후).
- **탭 이동 멈춤**: 원인 추정 = 홈·기억 화면이 탭 진입마다 `currentChat()` → `getCharacterFromIndex`(봇의 모든 채팅 복사, 실제 호스트에서 수백 ms). 수정 = `memoryswitches.js` 위치(ci:ti)별 30초 캐시, 쓰기·창 열기 때 `dbcache.js cacheGen()`으로 비움. 시험 `tests/currentchat-cache.test.js`, 측정 스크립트 `tests/e2e/run-tabperf.mjs`(시험 환경은 API가 즉시라 체감 차이는 실제 호스트에서만 확인 가능).
- 확인 못 함: 실제 호스트에서 캐시 적중률(프로바이더 로그), 탭 이동 체감, 아이콘·땡스 카드 실제 테마별 모양.

## 2026-11-03 추가 기능 (사용자 지시 1·2·4·5·6, 완료)
- RisuAI 소스 확인(kwaroran/RisuAI `src/ts/process/index.svelte.ts`·`request/anthropic.ts`·`request.ts`): 캐시 지점(`cachePoint`)은 리스가 먼저 찍고(자동=마지막 user 3개, 프롬프트 템플릿 'cache' 카드=깊이·역할) 플러그인 beforeRequest는 그 뒤에 받음. Claude 변환에서 첫 메시지 이후 system은 "System: …" user로 바뀌고 같은 역할끼리 한 텍스트 블록으로 합쳐짐(캐시 지점은 합친 블록 끝). → 주사위는 마지막 user와 합쳐지므로, `insertFairness`가 캐시 지점이 1~3개 있을 때만 주사위 앞 assistant에 `cachePoint` 추가(4개 한도, 원본 불변). 시험 `tests/cache-hit.test.js`.
- ① 캐시 적중 어림: `engine/turninfo.js prefixInfo/cacheLine`(직전 메인 요청과 앞부분 같은 토큰·비율, 깨진 메시지 위치, Dusk 표식이면 이름) → `data/turninfo.js` rec.cache, 칩·응답 아래 '캐시(어림)' 줄. 요청 훅은 시작 5초 뒤 remove+add로 맨 뒤로(다른 Dusk 훅 뒤의 최종 프롬프트를 보려고). 실제 프로바이더 적중과 다를 수 있음(어림).
- ② 주사위 기록: `data/fairplay.js` `DICE_LOG_KEY "dusk-dice-log"`(최근 300, 굴릴 때 채팅 정보와 함께, 1.5초 모아 저장), `loadDiceLog/clearDiceLog`, `engine/turninfo.js diceStats`. 화면 `ui/dicedetail.js openDiceLog`(이 채팅/전체·통계·지우기). main에서 `chatRef`로 `memory.switches.currentChat` 연결.
- ④ 합치기: `engine/memoryuser.js userMergePlan/mergeIntoUser`(people·emo·talk·rels·faces·exp·bonds·rifts·beliefs·scenes.who). 저장 데이터 변경이라 '나' 화면에서 미리 보기+확인 후에만. 위키(리수폿 문서)는 건드리지 않음.
- ⑤ '나' 화면: `ui/screens/memory/mepage.js`(m.page="me", 기억 홈 `#rb-mem-go-me` 한 줄 카드), 데이터 `meView`(counterparts/pairView 재사용). CSS `.rb-me*`(styles.js 끝), 넓으면 2열 columns.
- ⑥ 채팅 메뉴: `data/chatmenu.js`(`registerButton` location "chat", id 고정 `dusk-qt-fair|dice|show`로 다시 등록해 이름 갱신). main에서 fairPlay.set/setDice·turnInfo.setDiceShow를 감싸 어디서 바꿔도 이름 갱신. 설정 '로어북 · 채팅 메뉴'에 보임/숨김(`dusk.ui.chatQuick`, 기본 보임).
- 시험: `cache-hit`·`dice-log`·`memory-user-merge`·`chatmenu` 단위, e2e `run-me.mjs`(PC·모바일 16). e2e에서 `.rb-dice .btns button`은 버튼이 2개라 '닫기' 글자로 고름.
- 확인 못 함: 실제 Claude 캐시 적중(프로바이더 사용량), 채팅 메뉴 버튼이 RisuBard·PocketRisu에 있는지(없으면 조용히 생략), '나' 화면의 실제 데이터 품질.
- (2026-11-03, 사용자 결정) 주사위 앞 캐시 지점은 리스가 캐시를 안 써도 찍음(`points < 4`면). 리스 캐시를 안 쓰던 Claude 사용자는 그 지점까지 캐시 쓰기 비용(입력 단가의 약 1.25배)이 생기고 다음 턴부터 읽기 할인을 받음.

## 2026-11-03 추가 2 (사용자 지시 1·2·4·5, 3번은 이미 기본값이라 생략)
- 3번(장기 기억 넣는 위치): 이미 기본 `inject.position = "beforeLastUser"`(마지막 입력 바로 앞), 고급 '삽입 위치'로 변경 가능 → 작업 없음. 리수폿 로어북 방식(lore)은 로어북 위치를 따름.
- ① 리롤 같은 주사위: `engine/fairplay.js turnKey`(Dusk 메시지 뺀 전체 해시) → `data/fairplay.js` sameTurn(같은 열쇠·같은 개수·6시간 안이면 같은 rolls, 기록은 새 턴만). 기존 시험 3개를 '같은 메시지 = 같은 값'에 맞게 고침.
- ⑤ 판정 표식: 고정 규칙에 `<!-- dusk-roll: 행동 | easy|normal|hard|extreme | 굴림 | success|partial|fail -->` 남기기 지시(캐시 영향 없음). `parseRollMarks`, `makeDice`가 지난 턴(마지막 user 앞 assistant) 표식을 `prev`로 → `diceRollText` 'Last turn's judged outcomes'. 화면 `diceHtml(rec, marks)`는 표식이 있으면 실제 행동·난이도. 기억 분석 입력에서는 표식 제거(`memoryrunner.js noRoll`). 모델이 표식을 안 지키면 예전처럼 4난이도 표.
- ② 캐시 깨짐 알림: `data/turninfo.js` `CACHE_ALERT_KEY "dusk.ui.cacheAlert"`(기본 켜짐), 앞부분 < 50% & 전체 ≥ 1500토큰이면 칩 9초(호출 표시가 켜져 있으면 생략). 설정 고급 '이야기 도우미'에 줄(`#rb-set-cachealert`).
- ④ '나' 고치기: `mepage.js editDialog`(호칭·말투·감정 6개) → `setTalk`/`setTag`(잠김). e2e `run-me.mjs` 22항목.
- 확인 못 함: 실제 모델이 판정 표식을 잘 남기는지(특히 작은 모델), 리스 화면에서 HTML 주석이 정말 안 보이는지(마크다운 렌더 기준으론 숨김).

## 2026-11-03 전체 점검 (사용자 지시)
- 고친 버그(시험 `tests/audit-183.test.js` 5개 고치기 전 실패 확인 + e2e `run-home-dice` Esc 항목):
  - turninfo: 응답이 안 오면 '추론 중' 칩 타이머가 영원히 돎 → 5분(`TICK_MAX`) 뒤 멈추고 치움. 호출 표시를 끄면 `stopTick()`. 캐시 알림만 켜져 있으면 `pending`을 안 만들어 응답 기록 저장 안 함.
  - fairplay `turnKey`: system 메시지(기억·이야기 시간 주입)까지 넣어 리롤 판별이 깨짐 → user·assistant만.
  - memoryswitches: 30초 캐시가 채팅 삭제 직후 틀릴 수 있음 → `currentChat({ fresh: true })`, 요청마다 쓰는 내 프롬프트 범위(`data/memory.js`)는 fresh.
  - kit `modal`: 창 위 창에서 Esc가 모든 창을 닫음 → 맨 위 `.rb-modal`만.
  - chatmenu·quickset: RisuBard(응답 아래 표시 불가)에서 '주사위 결과 표시' 숨김. quickset `setDice` 실패 시 다시 던져(`e.shown`) 상세 창 스위치가 되돌아가게.
- 리스 소스로 확인한 것: replacer 두 번째 인자 = `'model'|'submodel'|'memory'|'emotion'|'otherAx'|'translate'`(메인 판별 맞음). `cachePoint`는 Claude 요청에서만 쓰이고 OpenAI 계열은 지워서 보냄(Gemini 요청 코드에서는 안 씀) → '항상 찍기'가 다른 프로바이더에 영향 없음.
- 전체 시험: 단위 719 통과, e2e 18종 통과(`run-tabs`는 4번 중 1번 41줄 모바일 로어북 항목 클릭 타이밍으로 멈춤 — 기존 시험 흔들림, 코드 문제 아님). `run-app.mjs`는 옛 메뉴(리수폿·인물 탭) 기준이라 첫 확인에서 멈춤(기존, 새 시험들이 같은 화면을 다룸).
- 못 한 것: eslint 등 정적 검사(npm 레지스트리 접속 불가), 실제 호스트 확인.

## 2026-11-03 {{user}} 이름 표시 · 마스코트 루네
- 기록 보기에서 {{user}} → 페르소나 이름(`db.username`, 없으면 '나'): `ui/screens/memory/username.js`(userText 조사 맞춤, `watchUserName` MutationObserver로 부분 갱신까지, 입력칸·편집 영역 제외 — 저장 값 불변). mdetail 진입 시 연결, personv2·infotab `shown()`은 `userLabel()`. 시험 `tests/username-display.test.js`, e2e `run-username.mjs`. '나에 대한 기억' 화면은 그대로 '나'.
- 마스코트 '루네'(사용자 지정 이름, 사용자가 준 캐릭터 시트 그림): 넣을 곳 = 시작 안내 환영 화면 · 빈 화면 안내 · 창 왼쪽 위 로고. 사용자 결정: 목업 먼저 보고 결정 → 목업 완료·확인 대기(실제 앱에 얹어 찍은 '지금/개편안' PC·모바일, 사진이 커서 저장소엔 안 넣음). 쓸 그림: 시트에서 자른 표정 4(기본·웃음·놀람·부끄러움)·SD 루네·고양이 정령(배경 투명)·로고 2(고양이/얼굴), webp로 합계 약 40KB. 구현 시: `ui/mascot.js`에 data URL로 넣고 `.rb-logo`(app.js 132줄)·시작 안내 0단계 `.rb-onb-logo`(onboarding.js 251줄)·kit `emptyState`의 `.ico`를 바꿈. 확인할 것: 말풍선 문구, 빈 화면 표정(같게/상황별), 로고(고양이/얼굴).
- (2026-11-03) **루네 구현 완료**: 사용자가 GPT로 새로 뽑은 시트 2장(표정·SD 16칸, 로고·아이콘 9칸) 사용. 결정: 로고 = 로고 시트 1번(얼굴 타일), 빈 화면 = 상황별, 환영 말풍선 그대로. `ui/mascot-data.js`(자동 생성 webp data URL, 얼굴 8·wave·logo 약 110KB) · `ui/mascot.js`(`moodFor` 제목으로 표정: 채팅 없음=surprised, 쓸 수 없음/준비 안 됨=sorry, 기억하는 인물=thinking, 그 밖=basic, `mood`로 직접 지정) · kit `emptyState` 아이콘 → 루네 얼굴 · app.js 로고 → `runeLogo()` · 시작 안내 0단계 SD 손 흔들기+말풍선, 6단계(끝) 머리에 윙크. 시험 `tests/mascot.test.js`. 원본 시트는 저장소에 없음(필요하면 사용자에게 다시 받기).
- (2026-11-03) 루네 추가 자리(사용자 요청 '더 넣어 줘'): 새로 바뀐 점 창 머리 `runeSd("cheer")`(whatsnew.js) · 도구 스페셜 땡스 머리 `runeSd("bow")`(tools.js) · 화면 열기 실패 → `emptyState({mood:"sorry"})`(app.js). mascot-data에 cheer·bow 추가(약 37KB). 확인 못 함: 변경 기록 창 실제 모습(시험 환경에서 버튼 클릭 실패, 빌드·시험은 통과).

## 2026-11-03 아카 글 v1.8.3 디자인 '1+7' 합본 (사용자 요청, 확인 대기)
- 지난 챗의 시안 6종+7번(1+6)은 세션 파일이 없어 사라짐 → 현재 `docs/arca/v1.8.3.html`을 변환해 새로 만듦: `docs/arca/drafts/v1.8.3-design-1plus7.html`(그림 자리 `{{IMG:이름}}`, 최종 글 아님·`v1.8.3.html`은 안 바꿈). 1번(별빛 클래식 카드·요약·접이식 항목) + 7번(금색 가는 테두리·선·세리프 제목·로마숫자 CHAPTER·LD 머리·땡스 카드 통일). 기능별 4색 → 금/라벤더 2색.
- 그림 자리: banner·ld·icon·spot-story·spot-memory·spot-screen·spot-cache·sd-wave·sd-bow·sd-cheer. 사용자가 아카에 올린 주소를 받으면 이 자리를 바꿔 `docs/arca/v1.8.3.html`로 반영.
- 확인: 아카 제약(style·class·script·overflow:hidden) 0건, 360/800px 가로 넘침 없음. 실제 아카 에디터 붙여넣기는 미확인.

- (2026-11-03) 사용자 요청으로 1번 중심+2번 곁들임 판 추가: `docs/arca/drafts/v1.8.3-design-1plus2.html`(네이비 본문 1번 + 장 머리만 밝은 라벤더 종이 카드·동그란 그림·세리프 2번풍, 금색 테두리·선은 뺌). 그림 자리·제약 검사는 1+7판과 같음(0건, 360/800px 넘침 없음). 둘 중 고르면 `v1.8.3.html`에 반영.
- (2026-11-03) 사용자 결정: **디자인은 1번(별빛 클래식)으로** → `docs/arca/drafts/v1.8.3-design-1.html`(배너·LD·장별 작은 루네·금/라벤더 2색). **기능 순서: 새 화면 → 기억 → 이야기 도우미 → 캐시**(번호 1~4·항목 1-1.. 모두 새 순서로, 소개 문장·시리즈 줄도 같은 순서). 머리 제목은 아직 '공정한 주사위, 나를 기억하는 인물들.'(순서와 안 맞으면 바꿀지 확인). 1+7·1+2 초안은 비교용으로 남김. 그림 주소를 받으면 `{{IMG:…}}` 10곳을 바꿔 `v1.8.3.html`로 반영.
- (2026-11-03) **정정**: 사용자가 보낸 실제 1번 시안(`preview-1.html`, 그림 13종 내장)에 순서만 바꿔 `docs/arca/drafts/v1.8.3-design-1-final.html`로 저장 — 위의 `v1.8.3-design-1.html`(내가 다시 만든 판)·1+7·1+2는 쓰지 않음. 순서 새 화면→기억→이야기 도우미→캐시(번호·항목·요약 카드·소개 문장·시리즈 줄 반영). 그림 자리 13곳: icon·guide·banner·ld·spot-screen·spot-memory·spot-story·spot-cache·more·warn·install·thanks·closing(그림 파일은 `arca-images.zip`로 사용자에게 전달, 저장소엔 없음). 머리 제목은 그대로('공정한 주사위, 나를 기억하는 인물들.', 바꿀지 확인 중).
- (2026-11-03) 아카 에디터(Froala)가 이미지에 `fr-dib`(display:block; margin:5px auto)를 붙여 flex 줄 안 그림이 자동 여백으로 글자를 밀어냄 → **flex 줄 안 `<img>`엔 인라인 `margin:0`을 꼭 넣을 것**(ARCA-POST 제약에 추가 필요). `v1.8.3-design-1-final.html`에 반영.
- (2026-11-03) 사용자가 올린 그림 주소(아카 에디터가 만든 `//ac.arca.live/…` 링크)를 그대로 쓰기로 함 → `docs/arca/v1.8.3.html`을 사용자가 붙여 넣은 1번 디자인 소스(+flex 줄 그림 `margin:0` 수정)로 교체. 순서 새 화면→기억→이야기 도우미→캐시. 마무리 루네 그림(closing)은 사용자 소스에 없어서 안 넣음. 머리 제목은 그대로.

## 안내서 사이트 (docs/site/)
- GitHub Pages(feat/1.8.3 · /docs, `docs/.nojekyll` 필수 — Jekyll이 옛 문서의 `{{` 때문에 빌드 실패했음). 주소 `…/Dusk-Atelier/site/`.
- 13페이지: 허브, guide/(start·memory·story·cocoa·image-tags·look·manage·switches·faq), dev/(index·host·workflow). HTML이 원본(생성기 없음) — 직접 고친다.
- 공용: `assets/site.css`(v1→v4 덮어쓰기), `assets/site.js`(상단 바·왼쪽 메뉴 NAV), `assets/widgets.js`(검색 Ctrl+K·탭·체크리스트·표 필터·코드 복사·체험 위젯: 주사위/관계/감정/게이지/태그/코코아/꾸미기/패치). 다크·라이트는 브라우저 설정을 따르고, 상단 GitHub 오른쪽 버튼(🌙/☀️)으로 바꾸면 `da-theme`(localStorage)에 저장돼 `:root[data-theme]`가 우선함.
- 허브는 목업 B(배너 + 큰 검색창 + 낱말 칩 + 벤토 타일). 다른 페이지 제목부는 site.js가 `.phero` 카드(벤토 큰 타일 모양 + 페이지별 루네 그림, IMG 표)로 감싼다. 목업 원본은 `docs/site/mockups/`.
- 새 페이지: site.js NAV, widgets.js PAGES(검색 색인), 허브 타일, 이전/다음 링크를 함께 고친다. 주사위 위젯의 수치(LV·judge)는 `src/engine/fairplay.js`·`turninfo.js`와 같아야 함.
- 내용 출처는 README/CHANGELOG/코드 문구만. 버전이 바뀌면 CHANGELOG 기준으로 갱신.
- **상시 규칙(사용자 지시, 2026-11-03):** 기능 설명이 바뀌거나 새 기능이 생기면 안내서 사이트(docs/site/guide/*.html)의 해당 페이지도 함께 고치고 CHANGELOG에 맞춘다. (아카 글 `docs/arca/v<버전>.html`은 사용자가 요청할 때 갱신.)
- 이번 대화에서 안내서 story(재해석·존중 위치)·memory(봇 로어북 내보내기)와 아카 v1.8.3 글(2-6 로어북 내보내기, 3-1 재해석·존중, 4-4 속도)을 갱신함. 아카 글 '재해석·존중' 문구는 3-1에 있음.
- 아카 v1.8.3 글: 맨 위 '처음이라면' 접이식 상자를 안내서 사이트 안내 큰 상자(NEW · GUIDE SITE, 열기 버튼 + 5개 바로가기 + 예전 가이드 2.0 링크)로 교체. 사이트 주소는 Pages 배포 확인 후 게시할 것(`https://pyser08.github.io/Dusk-Atelier/site/`).
- 채팅 메뉴(입력창 옆, location "chat") 맨 위에 '장기 기억' 바로가기 추가(`data/chatmenu.js` openMemory, main.js에서 memoryRef.open 연결). 토글이 아니라 화면을 여는 버튼(이름에 켜짐/꺼짐 없음), 빠른 설정을 숨기면 함께 숨김. 별도로 location "action"의 기존 '장기기억' 버튼(`memorybutton.js`)은 그대로 — 호스트에서 두 메뉴가 같은 곳으로 보이면 중복이니 실기기 확인 필요(미확인).

- 홈 속도(1.8.3, 이 대화): ① `data/memorystore3.js` 인덱스 원문 5초 캐시(문자열만 캐시·읽을 때마다 파싱, set/rm 때 비움, 문자열 아니면 캐시 안 함) ② `ui/screens/homestate.js` 인덱스·기록 자동 설정 읽기를 currentChat과 동시에 ③ `ui/screens/home.js` quickSettingsCard를 readState와 동시에. 시험: memorystore3·homestate 각 1건. 미측정: PocketRisu 실제 체감. 남은 후보(미착수): watch.js 모듈 전체 폴링(60초) 가볍게, createApp 지연 생성, 번들 데이터(카드 에셋·프롬프트·마스코트 ~1MB) 분리, 홈 상태는 나중에 채우기(골격 먼저), getFolder 대신 최근 기록 요약만 읽기.
- 홈 속도 2(1.8.3): `data/memoryswitches.js` `peekCurrent`(위치 ci:ti 같으면 직전 currentChat 값을 바로 주고 뒤에서 fresh 확인, 달라지면 onChange → `homestate.js`가 홈 refresh). 시험 1건(memoryswitch). 위험: 봇 순서가 바뀐 직후엔 잠깐 이전 봇 이름이 보였다가 바로 다시 그려짐. PocketRisu 체감 미측정.
- 속도 3(1.8.3): memorystore3 원문 캐시를 인덱스+폴더(최대 6키, 5초)로 일반화, 기억 홈(mhome) currentChat을 안내·모드 막대와 동시에(peekCurrent), watch.js MOD_EVERY 60s→120s. 의도적으로 안 한 것: createApp 지연 생성(sync가 app.ctx.svc를 써서 창을 열기 전엔 페르소나 동기화가 멈춤 → 별도 분리 필요), 번들 데이터 분리(CSP·로드 방식 확인 필요), 에셋 저장소로 기억 이전(정리 기능에 지워질 위험).
- 속도 4(1.8.3): `data/dbcache.js` 재작성 — 키별 캐시(TTL 45s), `dbRead`는 shared(복사 없음, 읽기 전용 약속·최상위 객체만 새로 줌), `warm`(watch.js의 characters·modules 읽기가 캐시를 채움), `soften`(창 열 때 15초 안 것 유지; 쓰기 계열은 그대로 hard invalidate). dbRead 호출처(characters·modules·sectionhome·memory/common loadBots·plugins 등)는 값을 고치지 않음을 확인. 새 dbRead 호출처는 반드시 읽기 전용으로. 미측정: 실제 호스트 체감, '응답 없음'의 진짜 원인이 호스트 쪽 복사라면 한계 있음.
- 속도 5(1.8.3): 캐릭터 탭 첫 읽기 단계별(`characters.js fetchCharsStaged`: 캐시 없음+봇 30개 이상일 때 characterOrder→modules→`loadCharacters(onBatch)` 12개씩, 24개 모이면 먼저 그림, 끝나면 `api.storeDbCache`로 캐시). dbcache에 has/store 추가, main.js hasDbCache/storeDbCache. 모듈·플러그인 탭은 아직 통째 읽기. 호스트 쪽 복사 자체는 못 줄임. 미측정.
- 홈 골격 먼저(1.8.3): `home.js` — 바로가기(grid)·처음 둘러보기는 정적으로 먼저 그리고, 머리·상태·이어서·최근·빠른 설정은 자리표시(rb-skel) → `adopt(box, el)`로 내용만 교체(refreshStatus는 statusEl에 씀). 빠른 설정은 readState와 따로 qsP가 끝나는 대로 채움(실패 시 안내 글). 확인: e2e run-home-dice 통과, 느린 저장소로 자리표시 화면 사진 확인.
- CI(1.8.3): `.github/workflows/branch-build.yml`·`build-branch.yml`을 검증만 하도록 바꿈(테스트·빌드·문법, 봇의 '빌드 결과 커밋' 제거, contents: read). 이유: 봇 커밋이 끼어 푸시가 계속 거절됨. 이제 dusk_atelier.js는 로컬 `npm run build` 결과를 직접 커밋. 주의: 봇 빌드가 로컬과 달랐던 원인(번들에 넣는 CHANGELOG 부분 추정) 미확인 → 릴리스 전 release.yml의 `build --check`가 CI에서 통과하는지 확인. release.yml·main은 손대지 않음.
- 봇 로어북 내보내기(1.8.3): `engine/wikilore.js`(순수: wikiLoreText/Entry/Candidates, upsertWikiLore 멱등, 표식 extentions.da_wiki=인물 이름, 비밀·openness·suspicion 구획 제외, 기본 2000자) + `ui/screens/memory/lorexport.js`(체크 목록·미리보기·확인 후 `setCharacterToIndex`로 globalLore 저장, 생성 중이면 거절) + people.js 더보기 메뉴(local 백엔드+위키 있을 때). 시험: tests/wikilore.test.js, tests/e2e/run-lorexport.mjs(app.entry.js 목 setCharacterToIndex가 window.__charWrites에 기록). 미확인: 실제 RisuAI·RisuBard·PocketRisu에서 봇 로어북 저장·화면 반영, 채팅 보호(RisuVault)가 막는 경우. 위키 상세정보 없을 때 칸이 좁아지는 버그는 PC1280·태블릿820·모바일390·간단/고급·위키 없음/빈 문서에서 재현 안 됨 → 사용자 사진 필요.
- 모듈·플러그인 속도(1.8.3): `readDb(api,keys,{cached})`(loadModuleState만 캐시, commit은 새로 읽음), modules.js `linkUseCounts`(60초 기억·200ms 뒤 시작·봇 처음 읽으면 storeDbCache), plugins `listInterop`/`listPlugins` 병렬, viewList 병렬. 시험 tests/modplug-load.test.js. 미확인: 실제 PocketRisu 체감 속도.
- 위키 상세정보 좁아짐 버그(1.8.3): 원인=문서 없을 때 .rb-wk3가 넓은 화면 2칸 grid(140px 목차+본문)에 목차 없이 들어가 카드가 140px. 고침=infotab 없는-문서 뿌리에 rb-wk3-solo + styles.js 덮어쓰기. 시험 tests/wikisolo.test.js(정적). 미확인: 실제 RisuBard PC 화면 재확인.
- 유저 편향 상세(dicedetail.js)에 재해석/존중 세그먼트를 강도 위에 추가(설정 탭과 같은 DICE_MODE_KEY). e2e run-home-dice 선택자는 '강도' 구획으로 한정.
- 설정 고급 '이야기 도우미'의 재해석/존중 행 제거(유저 편향 상세로 이동, 저장 키 DICE_MODE_KEY 동일).
- 버전 1.8.3으로 올림(사용자 지시 2026-11-03): package.json·CHANGELOG 머리(개발 중→2026-11-03)·빌드 산출물. 릴리스는 main push 때만 — 아직 main 머지 안 함.
- 릴리스 전 점검(2026-11-03): main은 브랜치보다 앞선 커밋 없음·충돌 없음, 사이트 링크 깨짐 0, e2e 23개 중 22개 통과. `tests/e2e/run-app.mjs`는 옛 탭 이름(리수폿·인물·꾸미기) 기준이라 사이드바 확인 2개만 새 구성에 맞췄고 그 뒤 단계는 38줄에서 멈춤 → 새 탭 구성(장기 기억·코코아·기억 카드·플러그인 꾸미기 등)에 맞춰 다시 써야 함(회귀 아님, 이전부터 낡음). 릴리스 뒤 Pages 소스를 main /docs로 바꿀 것.
- 자동 릴리스 끔(사용자 지시 2026-11-03): release.yml은 main push로 돌지 않고 `v*` 태그 푸시(package.json 버전과 같아야 함)일 때만 릴리스. 릴리스하려면 사용자가 지시한 뒤 `git tag v1.8.3 <main 커밋> && git push origin v1.8.3`.

## Dusk Cellar (백그라운드 서버, 별도 저장소) — 진행 상황 2026-11-03
- 저장소: **Pyser08/Dusk-Cellar** (main, b48c204). 리스 폴더 안에 클론 → `node setup.cjs` 한 번으로 설치. 그쪽 `HandOff/STATE.md`가 상세 기준.
- 지금 있는 것(뼈대): `setup.cjs`(리스 시작 파일 자동 찾기 → pnpm/npm 빌드 → pm2 목록 보여 주고 지울 것 고르기(리스 직접 실행 항목 '추천') → 실행기 pm2 등록·save → 응답 확인), `cellar-start.cjs`(리스+Cellar 함께 켜고 끄기, Cellar만 재시작), `/cellar/health`(토큰 없이), 그 외 주소는 `dusk-data/token.txt` 토큰 필수, 127.0.0.1:6011. 시험 12개 통과(가짜 pm2·npm 전체 흐름 포함).
- 실제 설치: RisuBard 우분투 서버(pm2)에서 5/5 통과·health 응답(2026-11-03). 미확인: 윈도우·맥·Termux·원본 RisuAI.
- 결정됨: 이름 Dusk Cellar / 리스 프로세스 안에 섞지 않고 실행기로 함께 실행 / 서버는 선택 기능(없으면 플러그인 지금 방식) / 리스 데이터는 건드리지 않음.
- 플러그인 연결(2026-11-03): `src/data/cellar.js`(probeCellar: `api.nativeFetch(GET)` → 실패 시 fetch, health의 name==='dusk-cellar'만 연결, createCellar 1분 기억·동시 요청 합치기, 주소 키 `dusk.cellar.url` 기본 http://127.0.0.1:6011) + 설정 탭 '서버' 카드의 Dusk Cellar 줄(상태·다시 확인, 고급은 주소). 원리: 리스 노드 서버에서 nativeFetch는 리스 서버의 /proxy2(리스 암호 필요, 대상 제한 없음)가 대신 보내므로 127.0.0.1 = 그 서버 → Cellar는 loopback 요청을 토큰 없이 받음(`--require-token`이면 토큰 필수). 호스팅 RisuAI·PocketRisu는 '없음'이 정상. 시험 tests/cellar.test.js, e2e tests/e2e/run-cellar.mjs. 실제 RisuBard(Oracle VM)에서 '연결됨' 확인(2026-11-03). 미확인: PocketRisu·PC 앱.
- 다음: ① 1단계 기억 백업 + 화면에 필요한 조각만 돌려주기(효과 측정) ② (효과 있으면) 분석·임베딩 서버 실행.
- 장기기억 서버 저장(2026-11-03, 사용자 결정: 서버 감지 시 서버에만, 끊기면 플러그인에 임시 대기열): `src/data/memoryremote.js` — `memorystore3.js`에 `storage`를 주입(get/set/rm 3곳)해 `dusk.mem.v3.f.*`만 서버로. 인덱스·설정은 플러그인. 표시 `dusk.cellar.mem`(공유 저장소라 기기마다 다시 올리지 않음), 대기열 `dusk.cellar.queue`(폴더당 마지막 값, opId, baseRev null=모름 → 받아서 합침). 처음 감지 시 전부 올리고 다시 읽어 확인 후 표시. 옛 플러그인 사본은 지우지 않음(끊겼을 때 읽기, 되돌리기). 충돌은 `mergeFolder`(기록·장면 id 합치기, 위키 revision 큰 쪽, 이 기기 삭제 우선). 연속 2번 실패하면 30초 끊김으로 보고 대기열. `memory.js` start: `remote.init()`(표시만, 빠름) → migrate → `remote.detect()`(기다리지 않음). 설정 '서버' 창에 저장 위치·'기억을 이 기기로 되돌리기'. 시험 tests/memoryremote.test.js(13), e2e run-cellar.
- 세이브 백업(2026-11-03): Cellar `/cellar/backup`(증분 하드링크 스냅샷, 복원은 실행기가 리스 멈추고 처리) + `src/data/cellarbackup.js` + 설정 '서버' 창의 '세이브 백업…'(features에 backup일 때만). 시험 tests/cellarbackup.test.js, e2e run-cellar.
- 플러그인 코드 수정(2026-11-03, RisuBard만, 사용자 결정: 리스 암호는 다시 안 묻고 확인 창 + 고치기 전 백업이 대신): 리스가 플러그인의 다른 플러그인 수정을 막아(PR #1572) Cellar `POST /cellar/plugins`(action list·get·apply, features에 `plugins`)가 리스 설정 파일(`settings/app.json`, 비밀 이름이 섞이면 `secrets/credentials.json`)의 그 플러그인 `script`만 고치고 `/api/external-changes/resolve`(accept)로 리스가 받아들이게 한다(자세한 순서·안전장치는 Cellar HandOff/STATE.md). 플러그인 쪽: `src/data/cellarplugins.js`(호출·`lineDiff`·`headerProblem`·`describeEditError`), `src/ui/screens/pluginedit.js`(편집 → 변경 확인 → 백업 선택 → 적용 → 결과·되돌리기), 플러그인 탭 행 메뉴 '코드 수정'(`hasPluginEdit`일 때만). 600KB 넘는 코드는 색 없이 줄 번호만 있는 편집기(측정: 색 편집기는 1MB에 4초·2.3MB에 6초 멈추고, 글자를 칠 때마다 전체를 다시 칠함). 큰 코드는 gzip(scriptZ)으로 주고받는다(리스 프록시가 응답을 조각조각 넘겨 2.3MB가 20~30초 걸린 것이 원인 추정). `cellar.js`: 5xx에도 본문을 오류에 남김(`err.json`), `withTimeout`이 타이머를 지움. 시험 tests/cellarplugins.test.js, e2e run-pluginedit.mjs(+app.entry.js 가짜 /cellar/plugins·__bkJob). CHANGELOG·버전은 건드리지 않음(릴리스 때 반영).
- 플러그인 수정 미확인(실제 RisuBard 서버, 사용자 확인 필요): ① 우리가 고친 settings/app.json을 리스가 '외부 변경 검토'로 잡고 accept로 받아들이는지(소스상 /api/external-changes[/resolve]), ② 열린 화면이 새로고침 전에 저장할 때 우리 수정이 덮이는지(리스는 409로 막는 구조), ③ nativeFetch POST로 3.6MB 본문이 /proxy2를 지나는지, ④ 고치기 전 세이브 백업 시간(31만 파일)과 백업 5개 보관 한도에 수동 백업이 밀려나는 문제(플러그인 수정 때마다 1개씩 씀). 이 환경에선 npm 레지스트리에 못 닿아 실제 RisuBard 서버를 띄우지 못했다(가짜 서버로만 시험).
- 미확인: 실제 RisuBard에서 nativeFetch POST(/proxy2 → Cellar) 동작, 서버 저장 후 기억 화면·주입 체감 속도, 31만 파일 백업 시간, 복원 직후 열린 화면이 옛 DB를 다시 저장하는지.
- 정리 대기(삭제는 사용자 지시 필요): 이 저장소의 `server/dusk-start.cjs`, `tests/dusk-start.test.js`는 Cellar로 옮겨 가 중복.

## 플러그인 매니저(v3.0.1) 기능 이식 (사용자 요청 2026-11-03) — 1~4단계 구현, 5단계(인자 제어 문법)는 매니저 독자 규격이라 제외(사용자 확인)
기준: 사용자가 첨부한 `plugin-manager-v3_3.0.1.js`. 리스가 `setDatabaseLite`의 `plugins`를 잘라 내므로(v3.svelte.ts) 목록을 바꾸는 모든 일은 Cellar `/cellar/plugins`의 `mutate`가 한다(RisuBard만, features `plugins`).
- 데이터: `src/data/pluginmgr.js`(Cellar 호출·`parseRegister`/`buildRegister`/`convertApi21`·`dupPlan`·`makeBackup`/`planRestore`·프리셋 `snapshotPreset`/`presetOps`/`exportPresets`/`importPresets`·카테고리 JSON·`orphanMeta`·`pairTarget`), `src/data/storagemgr.js`(스토리지 저장 충돌 검사·내보내기·가져오기). 화면: `ui/screens/pluginmgr.js`(줄 작업·등록·중복·백업/복원·프리셋·메타 정리), `ui/screens/storageedit.js`(값 수정·새 키·가져오기), `plugins.js`에 연결(줄마다 켜기/끄기 스위치, 줄 메뉴 별칭·위로·아래로·삭제, ··· 메뉴 파일에서 등록·글로벌 프리셋·중복 정리·전체 백업·백업 복원·메타데이터 정리). 시험: tests/pluginmgr.test.js, storagemgr.test.js, e2e run-pluginmgr.mjs.
- 프리셋 = 켜짐/꺼짐 + 순서 + 카테고리(`rbm:pluginPresets:v1`). 설정값·플러그인 스토리지는 안 넣는다. 디바이스 페어는 이름만 저장(`pair.mobile/desktop`) — **화면 너비에 따라 자동 전환하는 동작은 아직 안 넣음**(`pairTarget`·`deviceKind` 함수만 있음).
- 하지 못한 것: TypeScript → JavaScript 변환(등록 화면이 TS로 보이면 경고만), 스토리지 5종 중 pluginStorage만(safeLocalStorage·IndexedDB·서버 저장소·DB 저장 데이터는 아직), 백업에 플러그인 스토리지 미포함(매니저와 같음), 실제 RisuBard 서버 확인 전부 미확인(가짜 서버 시험만).
- 알려진 위험: 백업 복원·통째 바꾸기는 목록 해시로 그새 바뀜을 막지만, 열려 있는 리스 화면이 나중에 저장하면 덮어쓸 수 있다(새로고침 안내).
- (2026-11-03 점검) 플러그인 탭: 서버 기능(Cellar plugins)이 있으면 **서버가 아는 목록**을 보여 준다(`getPlugins`가 `fromServerList`). 리스는 메모리 목록을 들고 있어 Cellar로 바꾼 직후 `getDatabase`는 옛 상태이기 때문. 리스 쪽과 다르면(`needsReload`) '새로고침 필요' 안내. 탭을 열 때 Cellar 확인을 기다리지 않는다(없는 사용자에게 1.5초 지연이 생기던 것 제거; 찾으면 한 번 다시 그림). 자기 자신(dusk_atelier)의 스위치·삭제는 막음. Cellar `replaceAll`(복원)은 머리말 이름 검사를 하지 않음(옛 플러그인 복원용). 백업(`/cellar/backup`)은 호스트 무관(폴더 스냅샷; PocketRisu SQLite는 온라인 백업) — 플러그인 '수정'만 RisuBard 전용.

- Cellar 업데이트 버튼(2026-11-03): `src/data/cellarupdate.js`(check/apply/rollback + 재연결 대기), 설정 → 서버 → Dusk Cellar 창 `rb-cellar-update`(features에 "update"일 때만). 서버는 Dusk-Cellar `update.cjs`·`POST /cellar/update`. 서버 실물 확인은 아직 못 함.

- 플러그인 수정 3호스트(2026-11-03): Cellar `plugins.cjs`가 risubard·risuai·pocketrisu 지원. 결과에 `overwritten`(브라우저가 옛 목록으로 덮어씀) 반영(pluginedit·pluginmgr). 실서버 확인은 아직.
- 업데이트 적용은 응답을 못 받아도(재시작 중 연결 끊김) 재연결 뒤 check로 끝났는지 확인(cellarupdate.js restarting).

## 1.9.0 — Cellar 새 버전 알림 (2026-11-03)
- `src/data/cellarlatest.js`: GitHub 최신 릴리스(Dusk-Cellar) 태그 vs 연결된 Cellar 버전 비교 → toast 1회(버전별, `dusk.cellar.notified`) + 설정 Cellar 줄에 '새 버전 vX'(`ctx.cellarNew`). app.js 열 때 호출. 시험: tests/cellarlatest.test.js.
- 확인 못 한 것: 실제 GitHub API 응답(Cellar 릴리스 v0.1.0이 있어야 동작), 리스 안에서 nativeFetch가 api.github.com을 통과하는지.

## 단계별 분석 (2026-11-04, 1.9.0)
- 원인(추정): 분석 프롬프트가 한 응답에 장면·인물·관계·감정·속마음·신뢰도…를 전부 요구해 길어지면 잘리거나 JSON이 깨져 실패/연속 실패(자동 기록 중단).
- 수정: `memoryprompt.js` `analyzeStaged` — 1단계(개요: 인물 name/act/p/s/r + 장면·관계·떡밥·게이지) 1번 + 점수 ≥1인 인물마다 세부 1번(최대 6명). 세부 실패는 개요만 남기고 계속(`onWarn` 로그). 설정 `settings.staged`(기본 true, 기억 설정에서 끔 → 예전 한 번 호출). 러너 analyzeAt가 사용(자동 기록·지난 대화 전체 분석 모두).
- 시험: tests/memoryprompt-staged.test.js. 한 번 호출을 전제로 한 기존 시험은 `staged=false` 고정.
- 확인 못 한 것: 실제 모델에서의 실패율 변화·호출 시간/비용, 개요 단계가 세부 필드를 안 내보내는지(프롬프트 준수), Risupot 합친 호출(link)은 그대로.

## 줄 형식 분석·가벼운 모드 (2026-11-04, 1.9.1)
- `engine/memorylines.js`: 줄 형식 파서/보정(`who|`,`rel|`,`to|…|인용`), 인용 검증, 이름 정규화. `memoryprompt.js analyzeLines`(1단계 개요→인물별 2단계, 200자 미만은 1단계만, 실패 시 형식 재안내→축소 재시도, 오류에 응답 앞부분). `settings.format="json"`이면 옛 JSON 경로.
- `applyEmo` smooth: ±1 약신호는 같은 방향 2회 누적 시 1칸, 반대는 상쇄, |d|≥2는 즉시, 잠금 값 불변.
- 가벼운 모드: `settings.light===true`일 때만(자동 판별 제거). 기억 설정 스위치.
- 저장소 `auto` = 항상 local(BardWiki는 직접 선택). 첫 진입 BardWiki 질문 제거(`modebar.js maybeAskBardWiki`는 no-op).
- 확인 못 한 것: 실제 약한 모델(DeepSeek flash 등)에서의 준수율·인용 검증 엄격도.

## 중복 인물 방지·한 번에 합치기 (2026-11-04, 1.9.1)
- 원인: Writer가 모델의 `create`를 그대로 믿어 같은 인물이 새 문서로 또 생김(구간이 겹치는 분석 등). 리스바드 BardWiki는 후보의 action을 믿지 않고 서버가 id→제목·별칭 키→별칭=제목→id 오타 순으로 대상을 다시 찾는다(`risubard-memory-analysis.ts resolveCanonicalTarget`), 모호하면 새로 만들지 않고 경고.
- 수정: `engine/pot-dedupe.js redirectDuplicateCreates`(character만) + `tools/pot-patches.json` 패치 2개(writer-apply.js에 import·호출). 이식 원본은 이 환경에 없어 생성 파일에 같은 문자열로 직접 적용 — 다음에 pot-split을 돌릴 때 패치가 같은 결과를 낸다.
- `engine/peopledupe.js`(묶음 찾기·일괄 합치기), UI `mergeui.js mergeSameNames`(더보기 메뉴, 합치기 되돌리기 가능).
- 인물 위키 왼쪽 목록 sticky + 내부 스크롤(`styles.js .rb-wk-side`), 좁은 화면은 기존 가로 목록.
- 확인 못 한 것: 실제 화면에서의 sticky 동작·큰 위키(50명+)에서 일괄 합치기 속도·충돌 많은 문서의 결과.

## BardWiki 비교 반영 P1·P2 (2026-11-04, 1.9.1)
- 실패 종류 구분: `memorylines.js failureKind/RETRY_NOTE/isNoneReply`, `memoryprompt.js askLines`(잘림→최소 요청, 빈 응답→최종 답 요구), 잘린 JSON은 개요 성공으로 치지 않음. 2단계 `none` 응답은 정상(저장 안 함).
- 이름 보정 `canonName`: 별칭만 겹침·오타 후보 여럿은 합치지 않음, 성/이름만 나오면 유일할 때만 합침. `pot-dedupe.js`: 같은 제목 여럿이면 sections 많은 문서, 별칭만 겹침은 합치지 않고 `ambiguous` 카운트.
- 과거 장면 회상: `memoryinject.js pastScenes`(settings.pastTokens 기본 200, 겹치는 낱말 2개 이상, 최대 2개).
- digest 안전: `memorydigest.js coversRecord`(bigram 40%) — 못 담은 기록은 digested 표시 안 함.
- 위키 점검: `engine/wikihealth.js`, UI `mergeui.js openWikiHealth`(더보기 → 위키 점검).
- 하지 않은 것: 전체 재분석 교체(Dusk의 backfill은 이미 추가식·재개식이라 덮어쓰지 않음, 별도 '초기화 후 재분석' 기능이 없음), 스키마 강제 출력·재순위·아크 지도(P3).
- 확인 못 한 것: 실제 모델에서 잘림 판별 휴리스틱(길이 1500자 이상 문장 중간 종료)이 맞는 비율, digest 40% 기준이 한국어 요약에서 너무 엄격한지, 과거 장면 회상의 낱말 겹침 기준(2개) 적정성.

## 스페셜 땡스: 위젯 홈 (v1.9.1 작업 중)
- `src/ui/screens/tools.js` THANKS에 `widgethome` 추가(플러그인 안에는 링크 없음).
- 다음 아카 글의 SPECIAL THANKS 블록에는 위젯 홈 원작 글 링크 사용: https://arca.live/b/characterai/188006855
- 위젯 홈 덮는 범위: `home-layout.cjs` `railEdge`/`boxOf`(generic일 때 아이콘 줄 오른쪽부터), `auto-home.cjs` isHome에 'setting' 클래스 큰 요소 차단 추가. 실제 RisuBard 클래스명은 미검증.
- 리스바드 실제 화면 기준: 아이콘 줄은 CSS 약 44px → railEdge 최소 너비 32px. 설정 화면은 '설정 검색' 입력칸/'앱으로 돌아가기' 버튼으로 감지.
- 원인: 홈 자리에 떠 있으면 auto-home check가 바로 return해서 설정 이동을 못 봄 → 떠 있을 땐 settingsOpen만 검사해 닫음. host e2e에 설정 화면 2항목 추가.
- 위젯 홈 리스바드 3건(2026-11-04 20시): ①새로고침 시 전체 화면 → boot는 화면 접근 되면 `open(false,{automatic,quiet})`로 홈 자리에만 6회 재시도 ②홈 복귀 시 안 뜸 → 자동 열기 실패 시 pause+alert 하던 것 제거(다음 감지 때 재시도), 클릭 후 0.7·1.6초 재검사, 설정 감지는 화면 안에 보이는 요소만 ③아이콘 줄 못 찾음 → `rect()`가 160px 미만을 버려서였음, `rawRect`로 측정(3번에 1번 재측정). host e2e에 44px 아이콘 줄 항목 추가.
- 아이콘 줄 끝 +1px 여유, aside/nav 등도 후보(사이드바 삐짐 대응).
- 리스바드 실측: 아이콘 줄 = `.rs-sidebar.character-list-sidebar`(80px), 안쪽 `.character-list` 72px → 사이드바 자체가 좁으면 그 끝을 경계로.
- Dusk 열었다 닫기: controller yieldToDusk가 resumeAfterDusk 표시 → app.js close() 끝에 ctx.onClosed → main.js에서 widgetHome.resume(). 홈 배치 코드는 건드리지 않음.
- 열린 항목 중복: applyOpen이 닫기를 먼저 처리, 중복 판정에 닫힌 항목 포함(같은 kind 0.5/다른 kind 0.8), openForPrompt 24개, 프롬프트 문구 보강. 모델이 안 닫아 주면 자동으론 안 닫힘(미해결).

## 다음 작업(NSFW 추가 기능, 사용자 승인됨: "저거 다 만들고")
1. Dusk 이야기 날짜를 Erosync 주기 계산에 반영(지금은 Dusk 월경 기록이 켜져 있으면 Erosync 주기만 쉼; `cycleProbe`/`duskFlagsSet` 참고)
2. 봇별 수위 프리셋(수위·동작·집착 방지 값 묶음 저장/적용; `erosynclevel.js`·`erosyncconfig.js`·`erosyncguard.js`)
3. 장면 되돌리기(직전 장면 판단·프로필 변화 한 턴 되돌림)
4. 인물 위키 NSFW 탭 위쪽 한 줄 요약(지금 목표·최근 변화·쉬는 턴; `erosyncwiki.js` `eroNsfwCard`)
5. 인물 1명 NSFW 프로필만 내보내기/가져오기(`memoryfile.js` 재사용)
6. NSFW 기록 확장(아래): 장면 타임라인, 관계 수위 변화 그래프, 비하인드 검색·고정, 장면 메모, 직전 판단 이유 보기, 기록 CSV/MD 내보내기 — 모두 AI 추가 호출 없이 이미 저장된 값만 사용.
규칙: 비용 늘리는 기능(장면마다 AI 추가 호출)은 넣지 않음. 시작 전 STATE.md·`erosyncwiki.js`부터 읽을 것.

## NSFW 추가 기능 구현 완료(2026-11-05, 같은 브랜치)
- 새 데이터 모듈: `src/data/erosyncpreset.js`(프리셋 `dusk.erosync.presets`), `erosynctags.js`(태그 `erosync_dusk_tags_v1` → 장기 기억 파일에 자동 포함), `eroprofilefile.js`(인물 1명 파일 `dusk-ero-profile` v1). 컨트롤러 `createErosync`에 presets/savePreset/applyPreset/deletePreset/tags/setTags/tempTrend/undoScene 추가.
- 엔진(`src/erosync/erosync.js`) 추가: `duskTags*`(선호·금기를 `selectedProfileSummary`에 넣음), `duskTempRecord/Line/Series`(확정 때 관계 온도 기록 `state.duskTemp`, 최근 120턴, 되돌린 뒤 앞선 기록 무시, `flags.tempTrend`), `duskUndoLastScene`(`undo.lastScene`: `undoCommitEntries` + 최신 응답을 읽은 것으로 표시), `duskStoryAbsolute`(`host.storyStatus`로 Dusk 이야기 시간 날짜를 주기 시계에 우선 적용; main.js에서 연결), 읽기 값에 `rests`·`temp` 추가.
- **버그 수정**: `normalizeSessionState`가 `state.duskGuard`를 떨어뜨려 집착 방지 연속/쉬는 턴이 턴을 넘어 이어지지 않았음 → 보존하도록 수정(테스트 있음).
- UI: 수위 탭 `erosyncpresetui.js`, 동작 탭 `erosyncundoui.js`, NSFW 탭 `eroSummaryCard`(erosyncwiki.js)·`erosynctempui.js`·`erosynctagsui.js`·프로필 내보내기/가져오기 버튼(`erosyncprofilefileui.js`). 순수 함수 `eroSummary/eroTemp/tempPath`는 `src/engine/erosyncview.js`.
- 못 한 것/미확인: 실제 채팅·모델에서 장면 되돌리기·관계 온도 기록·태그 주입·이야기 날짜 시계가 도는지(엔진 함수는 단위 시험·소스 확인만), 세 호스트 실기기. 관계 온도의 ‘반감’은 엔진의 hatred 값(별도 ‘긴장’ 값은 없음). 되돌리기 뒤 집착 방지 상태(`duskGuard`)와 온도 기록은 같은 턴 이상만 다음 기록 때 정리됨.
- **값 입력 칸 UI(2026-11-05)**: `src/ui/fields.js`(sliderField·selectField·controlField·toggleField) + `styles.js`의 `.rb-fld`·`.rb-range`. Erosync 수위/동작/분석/집착 방지 카드가 사용. 다른 화면의 기본 모양 input은 이번에 건드리지 않음.
- 집착성 상한 기본 20(엔진·컨트롤러·UI). 선택 칸은 `choiceField`(optionCards+설명), 스위치는 `.rb-toggle`(장기 기억과 같은 모양). '검토 후 반영'(기본값)은 Dusk에 확인 화면이 없어 후보만 쌓임 → 설명에 적어 둠, 기본값 변경은 사용자 결정 필요.

- Erosync 수위 일괄화: 엔진 `globalContent` 오버레이(getBotOverride) + `inst.content.global()`, 값은 dusk.erosync.level(src/data/erosync.js). 봇별 저장은 더 안 씀(기존 봇별 값은 일괄 값이 있으면 가려짐). 지난 대화 분석: 미분석만, 없으면 전체 재분석(안내 후 확인).

## 최근 세션 (2026-11-11 14시 — 에셋·에셋 제작 버튼을 탭 줄로)
- 사용자 지시: '에셋'·'에셋 제작'은 정보·로어북·정규식 탭이 있는 줄에 같이. `editor.js`의 `#rb-edit-sub`을 `.rb-tabs-row`(탭 + 버튼) 안 오른쪽 끝으로 옮김(초안 봇은 target 없어 버튼 없음). run-dev-slot 판정도 '탭 줄 안'으로 바꿈.

## 최근 세션 (2026-11-11 14시 반 — 끌어 옮기기·테두리 선택·샘플링 설명)
- 카드/폴더 한 번 누르면 테두리(`.cur`, `st.focus`), 켜진 걸 다시 누르면 열림(`selectable(card,key,open,kind)`·`setFocus`). 폴더를 고른 채 '새 캐릭터' → 그 폴더 안, 만들어도 열지 않고 테두리+스크롤만(`addChar`).
- 드래그(HTML5 DnD, `studio.js`의 `dragSource`/`dropTarget`): 캐릭터 카드→폴더 줄·경로 칩(전체›…)·다른 카드 앞뒤·바닥 영역, 폴더→다른 폴더 안/앞뒤/경로 칩, 씬 카드→같은 캐릭터 순서·아래 '다른 캐릭터로' 줄. Alt/⌥=복사. 엔진: `project.js`의 `moveChars/reorderChars/placeFolder/reorderScenes/moveScenesToChar`(단위 시험 3개). e2e는 DragEvent를 직접 보냄(`dnd` 헬퍼).
- 샘플링/모델: 토글마다 설명 한 줄, legacy UC·바이브 합은 '고급' 접이식으로.
- 미확인: 터치 화면(리스바드·모바일)에서 HTML5 끌기가 되는지 — 안 되면 포인터 기반 끌기로 바꿔야 함. 실기기 미확인.
- (14시 50분) 폴더만 있고 캐릭터 0명일 때 폴더가 안 보이던 것 수정(빈 화면 조건). 하위 폴더를 상위 폴더 줄 안에 타일(`subTile`, 비어도 보임)로. 끌 때 놓을 곳 위에 '‘X’ 안에 넣기/위에 놓기' 라벨(`data-drop-hint`).
- (15시) 하위 폴더를 타일 대신 상위 폴더 줄 안의 같은 모양 줄로(재귀 `folderRow`, 8단까지). 줄 안 카드는 그 폴더에 바로 든 캐릭터만, 수는 하위 포함.
- (15시 반) 샘플링 토글 즉시 반영(setSwitch, 원인: switchEl은 스스로 모양을 안 바꿈). 넣는 자리 기본=추가 에셋. 에셋 이름 규칙 prefs.nameStyle(scene|us 폴더_캐릭터_씬.ext|dot). 검색 옆 '봇으로 넣기'(#sds-put-all, 보는 범위의 고른 그림). 하위 폴더 줄 적층(.sds-subrows flex-wrap). 폴더 종류 '복장'→'캐릭터'(값은 outfit 그대로).
- 씬: 한 번=고르기, 더블클릭=열기. 그림: 한 번=보낼 그림 고르기, 더블클릭=크게 보기. 맨 위·폴더 갤러리에 일괄 줄(#sds-gbulk: 모두 고르기·풀기·넣기·빼기). 단축키 추가: Delete=고른 것 지우기, Ctrl/⌘+Shift+A=고르기 풀기, 갤러리 Ctrl+A=그림 모두 고르기, Ctrl+B는 어디서든.
- 폴더 프롬프트(folder.prompt): 상위→하위→캐릭터 외형 순으로 붙음(`P.folderPromptFor/ownPrompt`).
- 미룸: 코어 탭 빠르게 누르면 멈춤(에뮬레이터 재현 안 됨, 사용자 상세 대기). 다음: 태그 자동완성 방식 상의.
- (16시) 위 `<` = 한 단계 위로(모드→씬→캐릭터→상위 폴더→닫기). 스위치 옆 이름 보이게(dialogs/viewer의 래퍼 switchEl). 즐겨찾기 끄기(도구 버튼이 켜기만 했음). 우클릭: 그림·폴더 머리·빈 곳 메뉴 추가. 폴더 접기(st.folded). 맨 위 폴더 줄도 적층(.sds-toprows). 봇으로 넣기 = 글자 있는 큰 버튼.
- 생성: 진행 막대(%·장수·예상 시간·재시도). 끊기지 않게 — 네트워크·서버 오류는 3s→6s→15s→30s→60s 간격으로 끝없이 다시, 토큰/결제 오류·멈추기만 멈춤. 3초마다 자동 저장, wakeLock, 창 닫아도 계속(LIVE 맵에 화면을 살려 두고 다시 열면 붙임), prefs.resume로 꺼졌다 켜지면 '이어 그리기' 알림.
- 태그 자동완성: `data/sdstudio/tags_v5.csv.gz`(SDStudio db_v5.csv, MIT 사본 LICENSE-SDStudio.txt) → 처음 쓸 때 raw.githubusercontent(main → jsdelivr → SD-Studio 순)에서 받아 getLocalPluginStorage에 base64로 둠. 엔진 `engine/sdstudio/tags.js`, UI `left.js attachTags`. **주의: main에 이 파일이 올라가야 실제로 받아짐**(지금은 로컬 커밋만). 설정에 '파일에서 불러오기'.
- (17시) 한글 태그 이름 보충 427줄(`data/sdstudio/tags_ko_extra.csv` → `src/engine/sdstudio/tags_ko.js` KO_EXTRA, 사전을 읽을 때 덧붙임). 자모·초성 한글 검색. 작가 태그 창(`S.dlg.artists`, 사전의 작가 종류 → 상위 프롬프트에 artist:이름, 자주 쓰는 작가 prefs.artistFav). 폴더 기본 템플릿(folder.tpl, 하위 폴더로 이어짐, 새 캐릭터에 바꾸기로 적용, 폴더 메뉴에서 정하기·안 캐릭터 모두 적용).
- SDStudio 작가 분석(Kaloscope·WD 태거 ONNX 450MB~1.2GB, 데스크톱 추론)은 플러그인에서 불가 → 작가 태그 고르기 창으로 대신.

## 한글 태그 이름 2차 보충 (SD-Studio)
- tags_ko_extra.csv / tags_ko.js: 일반 태그 상위(빈도 순, 한글 없는 것) 1,977개 추가 → 총 2,404줄. 형식 `분류/한글,0,빈도,영어`.
- 다음 묶음은 빈도 약 9,300 이하부터(일반 태그만, 고유명사 제외). 후보 추출: 사전에서 category 0 · redirect null · 한글 줄/KO_EXTRA에 없는 것.

## 한글 태그 이름 3차 (규칙 생성 + 손번역)
- tags_ko_extra.csv 총 6,911줄. 이번 추가 4,507개 = 규칙 생성 4,067(색·무늬·소재 + 옷·소품·동물 등 머리말 명사 사전, 'holding/no/unworn/torn X') + 손번역 440.
- 생성 규칙/사전은 /tmp/g(세션 임시)였음 — 필요하면 비슷하게 다시 만들 것. 남은 일반 태그 약 28,900개는 사용 횟수 약 2,000 이하의 긴 꼬리.
- `(cosplay)`, `(meme)`, 작품명 괄호가 붙은 태그는 캐릭터·작품 관련이라 제외.

## 대표 고르기 · ★ 없는 씬 · 내보내기 확인 · SDStudio 백업 가져오기 (SD-Studio)
- chooser.js(새): 대표 고르기 오버레이 `#sds-chooser`. ←/→ 후보, ↑/↓·PageUp/Down 씬, F 즐겨찾기, Enter 정하고 다음 씬(★ 없으면 지금 그림 ★), 1~9 후보, '즐겨찾기 없는 씬만'(지금 씬은 남김). 도구 무리 '대표'(`#sds-choose`, `#sds-rsv-nofav`), 씬 메뉴 '여기서 대표 고르기', 단축키 choose=C·putFav=Mod+Shift+B.
- ★ 없는 씬: 씬 카드 `.nofav` 배지, 캐릭터 씬 머리 `#sds-nofav-pill`(누르면 ★ 없는 씬만 대표 고르기), `P.reserveNoFav`(그림 없는 씬 포함).
- 내보내기 확인: `#sds-put-fav` → `dlg.exportPreview`(새로/같은 이름/이미 넣음, 자리·같은 이름 규칙, 안 넣은 것만). 넣으면 그림에 `sent`(넣은 에셋 이름) 기록 → 다음에 '이미 넣음'·체크 꺼짐. project.js: favImages·hasFav·scenesNoFav·reserveNoFav·markSent, normImage에 sent.
- backup.js(새, 순수): tar(pax·GNU 긴 이름) 목록은 File.slice로 머리글만 읽음(큰 백업도 메모리에 안 올림). 프로젝트/폴더(_folder.json)/전체(_backup.json) 백업, zip·gz·프로젝트 .json도. SDStudio 프로젝트 1개 = 캐릭터 1명(이름 겹치면 번호), 씬(인페인트 씬 제외)·조각·앞 프롬프트→외형, 뒤·UC는 비었을 때만 설정에, mains→★, imageMap 순서, 폴더 이름으로 폴더. 그림: 즐겨찾기만/모두/없이. 진입: 맨 위 캐릭터 도구 `#sds-import-backup`, 빈 곳 우클릭.
- 태그 한글 검색 순위: 이름 첫머리·낱말 첫머리 매치를 먼저(‘긴 머’ → 긴 머리가 ‘넘긴 머리’보다 앞).
- 시험: tests/sdstudio-backup.test.js(+tests/tar-helper.mjs), sdstudio-project 즐겨찾기 시험, e2e 대표 고르기·내보내기 확인·백업 가져오기 블록.
- 실기기 미확인: 수천 장 백업 가져오기 속도·리스 저장소 용량, webp 그림(SDStudio 설정이 webp면) 썸네일.

## v2.1.2 릴리스 + 에셋 제작(sdstudio) 0.1.0 배포 (11-11 저녁, 사용자 "배포해줘")
- origin/main(v2.1.1)을 SD-Studio에 병합 → package 2.1.2(코어 변경: 에셋 버튼 편집 탭 줄로). addons.src.json에 sdstudio 0.1.0(minCore 2.1.1 — 탭 줄 아니어도 2.1.1 슬롯에서 동작). 안내서 addons.html#sdstudio, CHANGELOG v2.1.2.
- 순서: test·build·check·e2e → publish-addons → main 빨리감기 → v2.1.2 태그.
- **배포 취소(11-11 20:33, 사용자 지시)**: 위 순서 중 publish-addons만 실행됐었음 → 그 사이 다른 세션이 main에 v2.1.2(모듈 호환 0.1.2~0.1.4·태그 교정)를 올려 둔 상태라 내 배포가 modcompat를 0.1.1로 덮어씀 → addons 브랜치를 4e6ca0f(b31d2d4 배포)와 똑같이 되돌림(새 커밋, 강제 푸시 아님). main 푸시·v2.1.2 태그는 안 됨(main은 앞서 감, 태그 푸시는 403).
- 다시 배포하려면: origin/main(다른 세션 v2.1.2)을 이 브랜치에 병합 → CHANGELOG·addons.src.json 충돌은 둘 다 살림(sdstudio 줄 추가) → 코어 버전은 2.1.3 등 새로 정함(main이 이미 2.1.2) → test·build·check·e2e → publish-addons → main 빨리감기 → 태그(여기선 403이라 사용자가 올려야 할 수 있음).
- 이 브랜치의 package.json 2.1.2·CHANGELOG v2.1.2 문구는 배포용으로 바꾼 것이라 다시 배포할 때 손볼 것.

## v2.1.3 코어 릴리스 (11-11 21시, 사용자 "코어만 2.1.3")
- origin/main(다른 세션 v2.1.2)을 병합. 코어 변경: 에셋 버튼 편집 탭 줄로(editor.js), 오른쪽 위 업데이트 알림 작게(hostupdate.js·toast.js `compact`), 설정 → 업데이트 설정 → ‘업데이트 알림’ 스위치(ui.updateNotice, 기본 켜짐 — main.js `noticeOn`이 새 버전·새로고침·새 애드온 알림을 막음). tests/updatenotice.test.js.
- **에셋 제작(sdstudio) 애드온은 배포 안 함**: 소스(addons/sdstudio, src/engine·ui sdstudio, data/sdstudio)는 main에 같이 들어가지만 addons.src.json에 없음 → 사용자에게 안 보임. 배포할 때 addons.src.json 줄 추가(minCore 2.1.1) + 안내서 addons.html#sdstudio 다시 넣기(초안은 커밋 0090c54의 docs/site/guide/addons.html) + CHANGELOG.
- 태그 푸시가 이 환경에서 403이면 사용자가 `v2.1.3` 태그를 올려야 릴리스됨.
- addons/dist/sdstudio.js(취소된 배포 때 만든 빌드물)가 main에도 들어가지만 addons.json에 없어 쓰이지 않음. 지울지는 사용자 결정.

## 태그 한글 이름 4차 (1000회 이상 마무리)
- 일반 태그 중 사용 1,000회 이상·괄호 없는 미번역 3,954개를 직접 번역해 `data/sdstudio/tags_ko_extra.csv`(10,865줄)·`src/engine/sdstudio/tags_ko.js`에 추가.
- 남은 일반 태그: 1,000회 미만과 괄호 붙은 작품·캐릭터 계열. (기본 사전에 이미 한글 항목이 있는 태그는 영어 쪽 값으로 걸러내야 중복이 안 생김)
- 확인: npm test(fail 0) · build · check 동일함. e2e는 안 돌림(데이터만 바뀜). sdstudio 애드온 배포는 여전히 보류.

## 에셋 제작 2026-11-12 (커밋됨, 애드온 미배포 — 시험 파일 0.1.6)
- 포커스 복귀 시 전체화면 재요청(`studio.js` refull). 씬 카드 우측 상단 예약 버튼(`.rsvbtn`, 호버 +1 없앰). 하위 폴더에서 캐릭터 열면 경로 유지(`openChar(id, from)`).
- 저장 안정성: 플러그인 저장소 + 기기 로컬 복사본(`dusk.sdstudio.mirror.*`) + 봇 안 사본(`engine/sdstudio/botdata.js`, char.extentions.dusk_sdstudio / module.dusk_sdstudio, gzip+b64, 닫을 때·3분·백업 때). 가장 최근 것으로 열기. 방패 버튼으로 봇 사본 끄기(배포용). 코어 내보내기(.charx·.risum·모듈 json)는 이 칸을 뺌(export.js·devfile.js 인라인 stripSnap — 코어 릴리스 필요).
- 백업 둘: 이미지만 zip / 프로젝트 전체 백업 zip(`engine/sdstudio/fullbackup.js`, dusk-sdstudio-backup.json + img/*), 복원은 '백업 가져오기'.
- 폴더 → 로어북 폴더 연동(`engine/sdstudio/loresync.js`, 설정 loreSync 기본 끔, 지워도 로어북은 남김, 코어 editor.js newFolderEntry 사용 → 배포 시 minCore 2.1.4).
- 캐릭터 표기 이름/영어 이름(`en`, `P.fileName`) — zip·에셋 이름에 영어 이름.
- 다음(새 챗): 캐릭터 폴더도 표기/영어 이름, 튜토리얼(로어북 연동·이전 설정 가져오기·씬 프리셋), 봇 로어북 소속 구조 → 폴더로 가져오기, 툴바 프리셋 버튼(SFW·NSFW·+). 세부 결정은 대화에서 정한 것 참고.

### 다음 작업 명세 (사용자 결정, 2026-11-12)
1. **캐릭터 폴더(kind "outfit")도 표기/영어 이름** — 폴더 대화상자에 영어 이름 칸, `charFolderName`(에셋 이름)·zip 경로에 영어 이름 사용. 로어북 연동은 표기 이름.
2. **씬 프리셋 버튼**: 툴바 '즐겨찾기 넣기'·'보기' 아래 줄에 [SFW] [NSFW] [+]. 프리셋 = 씬 세트(씬 이름·프롬프트 묶음)만. 누르면 그 세트로 전환해 SFW/NSFW 그림을 편하게 생성(봇 데이터는 안 바뀜). 폴더 구조(소속·캐릭터 폴더)는 세트와 무관하게 프로젝트에서 공유, 캐릭터 카드는 공유 안 함. '+'로 새 세트. 기본 씬 프리셋은 리스 전체(플러그인 저장소)에 저장해 다른 봇에서도 씀. 기존 '씬 템플릿'과의 관계 정리 필요(재사용 권장).
3. **로어북 연동 양방향**(설정 loreSync 켰을 때): 봇·모듈 로어북에서 만든 Dusk 폴더/[소속] 폴더 구조를 에셋 제작 폴더로 가져옴(소속→group, 하위 구조 유지, lore id로 연결). 지우기는 양쪽 다 전파 안 함.
4. **애드온 튜토리얼**(첫 실행·도움말에서): 로어북 연동 켜기/끄기(기본 끔) 선택, 원본 SDStudio 백업 가져오기 안내, 씬 프리셋(SFW/NSFW) 가져오기·고르기, 봇 안 저장·전체 백업 설명.

## 2026-11-12 오후 — 애드온 박스형·기억 화면 정리·기록기 버그 4건 (커밋됨, 버전·CHANGELOG 안 바꿈)
- 홈 애드온 상자: 줄 목록 → 카드 격자(`addonsui.js` tile, `.rb-addon-grid/.rb-addon-tile/.rb-addon-chip`). 상태 칩은 짧은 말(받기 전·새 버전·켜짐·꺼짐·코어 업데이트 필요, 긴 말은 title). e2e run-addons-ui 문구 맞춤.
- 기억 홈(`mhome.js`): 리수폿 일괄 사용 줄 삭제(리수폿 화면에 있음), 기억 넣기 토큰·남길 최근 턴을 카드 맨 아래로. 안내서 memory.html 고침, e2e run-mem-trim 순서 맞춤.
- 기록기(`engine/recorder.js`, **장기기억 애드온에 들어가므로 애드온 배포해야 사용자에게 적용**):
  1) parseWriterRun이 retrieval_candidate_review·tracking_review refs를 `run.reviewRefs`로 읽고, buildEnvelope 끝에서 안 다룬 후보마다 no_canonical_change("이번 장면에 등장하지 않음").
  2) `stripThoughts`: <Thoughts>/<think> 블록 제거 + 첫 줄이 아닌 {"lines":…} 찾기. ask()의 모든 응답과 parseLinesLoose에 적용.
  4) recordTurn이 인원 상한으로 잘린 인물을 `capped`로 돌려주고 envelope에서 "인원 상한으로 이번엔 묻지 않음".
  시험: tests/recorder-review.test.js(실제 리수폿 검증 통과 확인 포함).
- 3) 업데이트 알림이 업데이트 후 남는 문제: 켜질 때 `clearStaleUpdateToast`로 남은 알림 제거(main.js, 업데이트 알림이 켜져 있을 때만). tests/updatenotice.test.js.
- [x] **Erosync ‘user에게도 적용’**(사용자 선택: ① 관찰만). 엔진 원칙(user 계획·목표·관계 출발 금지, 12444~ 정리 코드)은 안 건드리고 따로 칸 `state.duskUser.log`(턴별, 읽을 때 지금 턴 이후 버림 → 되돌리기 대응)에 상태·user 행동·성향 신호·개방도(±3, 인용 필수, 50 기준 ×5)를 남김. 장면 판단 입력에 `userTracking`(관찰 전용 안내+현재 값+`previousTurnUpdate.userObservation` 응답 칸 설명, SFW는 성적 항목 없음). 확정 `applyPreviousTurnUpdate`에서 `duskUserRecord`. 저장 정리·SESSION_VARIANT_FIELDS에 duskUser 추가. 플래그 `flags.set({userTrack})`, 읽기 `read().user`, `user.view`. Dusk: data/erosync.js `USER_KEY dusk.erosync.userTrack`(기본 꺼짐)·`userTrack()`, erosyncui.js `#rb-ero-user` 스위치, 안내서 memory.html#erosync-user. 시험: erosync-vendor 마지막 시험, e2e run-erosync-ui.
  - 남은 것: [ ] 관찰한 user 값을 화면(인물 위키 NSFW 탭 등)에 보여 주기(`read().user`는 준비됨). [ ] 실제 모델이 userObservation을 잘 채우는지 실기기 확인 못 함.
- [x] 애드온 배포(11-12 14:5x, 사용자 "애드온만, sdstudio 제외"): memory 0.2.10·erosync 0.1.4만 addons 브랜치에 손으로 올림(3f54b34). publish-addons는 cards·chattheme·provider 빌드물도 바뀌고 sdstudio.js까지 실어서 쓰지 않음 — 그 셋은 버전 그대로라 배포 안 함(차이 원인 미확인). 고치기 전 커밋 빌드가 배포본 해시와 같음을 확인. minCore 그대로(바뀐 파일은 코어 공유 모듈 아님).
- [ ] 코어(애드온 상자 박스형·업데이트 알림 남는 문제) 릴리스는 사용자 지시 시.
## 더스크 스텔스 0.3.48 — 휴대폰 입력창·위 줄 사진 맞춤 + 따옴표 상자 (11-12, 애드온 배포)
- 사진 4장(클로드·클로드 코드·GPT·제미나이 모바일) 기준으로 입력창·위 줄만 바꿈(본문 제외). 규칙은 docs/STEALTH.md 4·4-1절.
- stealth.js: `mobileInputCss`(prest `mob`), `splitModel`, `quoteBoxCss`(모든 모양 따옴표 = 인라인 코드 상자, ・ 줄 없앰), 색 `cbg/cline/cfg/mi/mline/mb/ms/msf/mic`, 아이콘 `--st-i-*`(data: SVG).
- stealth-shell.js: mtop.style(center/center2/float/gemini), 아이콘 menu3·menu2b·menu2e·compose·ring·hdots·docr, 위 줄에 `x-mt`. stealth-shellcss.js 휴대폰 규칙.
- 확인: npm test·build·check 동일함·e2e run-stealth-ui, 브라우저 흉내(390px)로 네 모양 눈 확인. **실기기 미확인**: 리스 입력 줄 실제 칸 순서(스티커 켰을 때), 포켓리스의 data: 아이콘, 위 줄 ≡ 자리와 순정 버튼 겹침.
- **0.3.49(11-12 15시, 배포)**: 사용자 화면(웹, 좁은 폭)에서 + ·마이크가 안 보이고 알약 앞에 빈 칸, 사용자 말풍선 따옴표가 봇 CSS의 노랑·파랑 막대 줄로 나옴 → ① '+' 칸을 마지막 칸 대신 "svg 있는 다른 칸"으로, 빈 칸(:empty) 숨김 ② 따옴표 상자 선택자 강화(`body .st-body mark[risu-mark^=quote][risu-mark]`, display·테두리·여백 !important, ::before/::after 끔) ③ 앱 공식 글꼴: 제미나이 Google Sans Flex(구글 폰트 @import), 딥시크 Inter, 클로드 "Anthropic Sans"·GPT/코덱스 "OpenAI Sans"(비공개라 기기에 있을 때만) ④ 진단에 '입력창 추적'(입력 줄 칸 순서·크기, 사용자 따옴표 요소). 원인은 실기기 진단으로 확정 필요.
- **0.3.50(11-12 15시 반)**: '+'가 둘(포켓리스 '채팅 키우기' 버튼) → 보내기/멈춤 바로 뒤 칸만 '+', 나머지 아이콘 칸 숨김(:has 안에 :has 금지라 `:not(.button-icon-send + *)` 꼴). 따옴표 안 끝 '.'이면 mark가 아닌 다른 꾸밈(왼쪽 막대)으로 나옴 → `.chattext` 안 `[style*=border-left]`·`[class*=quote|dialog]`도 상자로(추정, 진단의 '사용자 말풍선 요소'로 확인 필요). 글꼴: Inter+Pretendard(클로드·GPT·코덱스·딥시크), Google Sans(+Flex)+Noto Sans KR(제미나이), @import 여러 개.
- **0.3.51**: 0.3.50에서 '+'가 아예 사라짐(포켓리스는 메뉴가 보내기 바로 뒤가 아님) → 아이콘 버튼 중 첫 번째만 '+', 뒤따르는 것 숨김. 진짜 순서는 진단 '입력창 추적'으로 확인 필요.
- **0.3.52**: 진단(포켓리스) — 입력 줄 = [button(+ 자리) 34] [textarea] [button.composer-expand-btn 0×0] [button.order-2 보내기]. 0.3.51의 '첫 아이콘 버튼만 +'가 맞음. 사용자 따옴표는 봇 정규식 div.x-risu-regex-quote-block("…")·x-risu-regex-thought-block('…') → thought도 상자 대상에 추가.
- **0.3.53**: '…'(quote2 mark·thought-block) 상자는 강조색 쪽 글자색으로 구분.
- **0.3.54**: 포켓리스 '채팅 키우기'(.composer-expand-btn)를 모델 알약 모양으로(누르면 키우기), 없으면 예전처럼 상자 ::before/::after 알약. 클로드·클로드 코드·GPT·제미나이 입력창 버튼 모양을 PC에도 적용(760 밖으로, PC는 본문 폭 가운데). 안내 글 ::before는 휴대폰만. :has 개수 시험은 이 묶음(주석 '입력창 버튼 모양')을 뺌.

## 2026-11-12 16시 — 홈 애드온 상자: 맨 위 받기·업데이트 줄 + ‘업데이트’ 묶음 + 탭 열기 (코어, 미릴리스)
- addonsui.js paint: 맨 위 `.rb-addon-bar`(실패 문구·모두 받기·업데이트 확인), 그다음 새 버전 있는 애드온만 모은 `data-cat=update` 묶음(원래 분류에선 뺌, 카드에 `v옛 → v새`). openBtn은 page가 없으면 tabs.js `addon:` 탭으로 `ctx.go`(protlink·memory·cards·manage 등). e2e: tests/e2e/run-addons-top.mjs.
- [x] v2.1.5 코어 릴리스(11-12, 사용자 지시): SD-Studio → main 빨리감기 + v2.1.5 태그.

## 2026-11-12 17시 — 상자 여백 정리 + v2.1.6 코어 릴리스 (사용자 지시)
- 여백 0이라 내용이 테두리에 붙던 상자: styles.js `.rb-discover{padding:14px 16px}`, `.rb-mem-chg{padding…;flex column;gap 8}`(aitools·writerui·mergeui 비교 상자, 코어 CSS라 코어만으로 적용). gaugeui.js 제안 상자 2개 `pad`, 목록 줄 인라인 padding → **장기기억 애드온 배포 때 적용**(아직 배포 안 함).
- 확인: npm test(실패 0)·build·check 동일함·e2e run-discover. 다른 화면 눈 확인은 못 함.

## 2026-11-12 17시 반 — 봇 업데이트 뒤 옛 버전 Lua 트리거가 남는 버그 (v2.1.7 릴리스)
- 원인: 트리거는 comment로 짝짓고 이름 바뀜 감지는 내용 해시가 같을 때만 → comment(버전)·코드가 함께 바뀐 Lua가 따로 놂. 기록 없으면 unknownExtra가 '기존 유지'로 남고, 기록 있으면 남은 옛 것이 mineAdded(keep)로 계속 남음. 옛 것이 앞에 있어 먼저 실행됨.
- 고침: characterUpdateMerge.ts — `isLuaTrigger`·`luaStem`(버전 표기 제거). 짝 없는 Lua끼리 이름 줄기가 같으면(아니면 하나씩만 남을 때) 교체로 짝지음(기록 있으면 기록에 있는 제작자 것만). mineAdded 옛 Lua는 새 버전에 같은 줄기 Lua가 있으면 keep false. tideplan.js keepSet: '기존 유지'에서 Lua 트리거 제외. characterUpdate.ts 요약 `luaTriggers`, legacy.js 요약에 2개 이상이면 `#rv-lua-warn` 경고, 체크박스 문구에 트리거 추가. 안내서 manage.html.
- 시험: tests/tideplan-lua.test.js. 업데이트 화면 e2e는 없음(눈 확인 못 함).

- [x] 장기기억 애드온 0.2.11 배포(11-12 17시 반, 사용자 지시): 게이지 상자 여백. 다른 애드온은 빌드물 변화 없음.
- ⚠ publish-addons.mjs를 돌리니 버전 그대로인 aibuild·cards·chattheme·provider 빌드물과 미배포 sdstudio.js까지 실림 → addons 브랜치를 손으로 되돌려 memory만 남김(2b1edad). **publish-addons 쓰지 말 것**(원인 미확인, 같은 버전인데 빌드 해시가 다름).

## 버그리포트 대응 (11-13, perf/startup에서 작업)
- [x] 내 API Base URL: 빈 주소 → 공급자 기본 주소(`modelcfg.withDefaultBaseUrl`, modelhub의 presetOf가 적용). 쉬운 설정 saveApi가 주소를 지우던 것 → `easyApiPatch`(같은 공급자면 유지). 시험 tests/modelhub.test.js 2개 추가(고치기 전 실패 확인). v2.1.9·장기기억 애드온 0.2.12로 올림(배포 안 함: 태그 푸시·publish-addons 미실행).
- [x] 나머지 4건(시험 tests/bugreport-1113.test.js 4개, 고치기 전 4개 실패 확인): ① pot-patches relationship-mode 'on'에 cycle.state ② pot-patches cycle-tracking: 기준일 없으면 임시 연도 2000, 연도 있는 날짜(full) 나오면 2000- 기준에서 옮겨 감 ③ 원인은 Dusk `cyclereport.js`가 `new:cycle-N-<한글이름>` 참조를 만들어 new: ASCII 검증에서 제안 전체가 거부 → 문서 ID(ASCII 정리)로 ④ pot-patches main-wiki-hook: `databaseMatched`에 `evidence.matched` 추가(경고 표시는 안 함). 재생성 `node tools/pot-split.mjs`, --check 0개.
- e2e는 Playwright 브라우저(chromium_headless_shell-1254) 미설치로 못 돌림. ④는 훅 단위 시험이 없어 소스 확인 시험만 있음.
- 참고: npm test 기존 실패 3개(pot-port, watch-light, GitHub 릴리스 태그 네트워크)는 이번 변경 전에도 실패.

## 기억 개요 (11-14, 2번 세션 1/5)
- 목업: `docs/mockups/glass-2-memory.html`(5화면 초안), `glass-2-memory-hub.html`(배치 4안, 안 씀), `glass-2-memory-hub2.html`(디자인 6판 — **채택 6번: 왼쪽 색띠 + 약한 네온**, 선 아이콘).
- 구현: `src/ui/screens/sectionhome.js` drawMemory(section==='memory'일 때만) — 상태 줄 `.rb-mhub-stat`(+`.rb-hubstat`, 채팅 이름·켜짐·기억 수·‘지난 대화 분석’→memory 탭의 #rb-mem-analyze로) → 타일 `.rb-hubrow.rb-mtile.k-<id>`(바로가기·옛 시험 호환 위해 rb-hubrow 유지, 칩=저장 N건/인물 N명) → 최근 기록 `.rb-mhub-rec`(mhome.js `recentOf` export, 4건). CSS `src/ui/screens/memhubcss.js`(MEMHUB_CSS, styles.js 끝에 붙임). 관리·작업실 개요는 예전 그대로.
- PC에서는 memory-home이 mobileOnly라 위쪽 메뉴 섹션 알약으로만 열림(그대로).
- 시험: npm test 1554/3(원래 실패), check 동일함. run-hubs 기억 개요 기대값을 새 구조로 바꿈 → 전부 통과(이전 실패 1개도 해소). cards·memed 32·nav·home-grid·smoke·glass-theme·dupes 통과. 실기기 미확인.

## 장기 기억 B안 (11-14, 2번 세션 2/5)
- 목업 `docs/mockups/glass-2-memory-main.html`(A 두 단·B 칸 나누기·C 목차) → **B 채택 + 리수폿은 옵션 칸으로**(사용자).
- `mhome.js` renderMemoryHome(채팅 있을 때): 상태 카드·분석 버튼·진행 막대는 위 고정 → `.rb-mem4-tabs`(#rb-mem-tab-glance/rec/opt/set, 고른 칸 `m.memTab`에 기억) → 칸 패널 `[data-memtab]`(안 고른 칸은 hidden, DOM엔 남음).
  - 한눈에: 바로가기·최근 기록 3 | 나에 대한 기억·인물 관계도. 기록: 최근 기록 12 + 인물 위키·기록 보기 버튼. 옵션: 기억 옵션(토큰 포함) | 리수폿·Erosync 줄. 설정: 예전 오른쪽(프롬프트·임베딩, 고급 모드면 기억 방식·고급 묶음 `.rb-mem4-set`).
  - 채팅 없을 때도 같은 칸 나누기(한눈에=빈 화면 안내·옵션·설정, 기록 칸 없음). 공통 함수 memTabs. CSS는 memhubcss.js 아래쪽(`.rb-mem4*`, 카드 색띠).
- 화면 둘러보기(screentours memory:home) 리수폿·옵션·세부 기능 단계를 칸 단추로 가리키게 바꿈. **임베딩 안내(embeddingguide, [data-tour=mem-embed])는 설정 칸이 닫혀 있으면 대상이 숨겨져 건너뛸 수 있음 — 필요하면 안내 시작 때 설정 칸 열기.**
- 시험: npm test 1554/3(원래 실패), check 동일함. e2e memed 32(고급은 설정 칸 클릭 후 확인으로 수정)·erosync-ui(옵션 칸 클릭 추가; 더보기 메뉴 2개는 원래 실패)·discover·potpage·relmap·username·hubs·cards·smoke·dupes·me·home-memall 통과. run-app 107줄 `.rb-mem-options` 확인은 run-app이 원래 중간에 멈춰 못 봄.
- **(11-14 추가) 장기 기억 화면은 장기기억 애드온(addons/dist/memory.js)에 들어감** — 본체 빌드만으론 안 바뀜. `node tools/build-addons.mjs`로 다시 빌드함(memory 0.2.12 그대로 → **기기에 받게 하려면 버전 올림 + publish-addons 필요, 사용자 지시 대기**). recentOf는 core가 mhome을 끌어오지 않게 `src/engine/memoryusage.js`로 옮김(안 옮기면 core가 2.7MB로 커짐). addonlib.gen.js 재생성(2.2.0 core 전용 모듈 glasscss·homegrid·navcss·memhubcss 등 추가 — 애드온은 안 씀, minCore 그대로 둠).
- (11-14) 개요 아이콘 grid. PC 사이드바엔 개요 안 넣음(사용자). 개요는 폭 제한 없음, 채팅 없을 때 ‘다른 채팅 보기’·최근 기록 자리 안내. 사이드바 아이콘 34/20px, 장기 기억 아이콘 네모 네온형. 시험판은 `node tools/custom-addon.mjs memory cards erosync` → test-addons/.
- (11-14) **라이트바 컨셉** 확정(UI-GLASS 맨 위). 홈은 내용 카드(최근 기록·빠른 설정·이어서 하기·추천)와 위 장기 기억 상태 칸에만 라이트바(바로가기·숫자 칸엔 없음 — 사용자 ‘막 넣지 말고 어울리게’). 남은 기억 화면(관계도·코코아·카드)·3~5번 세션도 이 컨셉으로 목업.
- (11-14) 사이드바 섹션·홈 아이콘과 홈 바로가기 4칸 아이콘을 네온 선형으로(navcss·homegridcss, 지금 섹션은 더 밝게). run-nav 아이콘 기대값 수정.
- (11-14) 모바일 탭바도 네온 아이콘, 아이콘 속 색 더 채움(60%→30%).
- (11-14) 장기 기억 **설정 칸 → 옵션 칸으로 합침**(칸: 한눈에·기록·옵션). 옵션 칸 = 기억 옵션 | 리수폿·Erosync·프롬프트/임베딩 + (고급 모드) ‘고급: 기록·기억 넣기 세부 설정’(madv store+more 합침)·진단·위험 구역. **기억 방식(modeHost) 화면에서 뺌**(renderModeBar는 저장소 맞추기용으로 계속 호출), **자동 기록·인물 추적 묶음 뺌**(리수폿에 있음 — 봇별 ‘기록하지 않을 이름’도 같이 빠짐, 리수폿에 같은 기능 있는지 확인 필요). 장기 기억 폭 제한 없앰. memed 시험 수정.
- (11-14) 장기 기억 기록 칸 없앰(칸: 한눈에·옵션). 한눈에 아래에 최근 기록 12건을 전체 폭으로.
- (11-14) 한눈에 위쪽: 바로가기 4칸 | ‘인물’(나에 대한 기억·인물 관계도) 넓은 칸 2개, 높이 맞춤(.rb-mem4-top).
- (11-14) 채팅 없을 때 옵션 칸 고급: renderGlobalSettings `bare` 모드(설정 찾기·모드 표시·변경 이력·리수폿 안내·프리셋 공유 없이 ‘기록·기억 넣기 세부 설정’ 내용만). 채팅 있을 때 고급 묶음의 세부 설정도 bare. 모바일 홈 바로가기 4칸 안쪽 스크롤 없앰.
- **실시간 미리보기**: `node tools/preview.mjs`(또는 .claude/launch.json ‘preview’) → http://localhost:5178/?chat=0&adv=1&light=1&tab=memory. 소스 고치면 자동 새로고침(e2e 가짜 호스트, `bootApp` opts.noChat 추가). 결과물 .preview/(gitignore). 오른쪽 위 ‘채팅 켬/끔’ 단추로 지금 탭 유지한 채 전환. Erosync 실제 애드온도 켬(opts.erosync, 요청 훅은 opts.host 가짜) — ?eroon=1이면 켠 상태로 시작, ?ero=0이면 뺌.
- (11-14) 옵션 칸 고급 묶음 디자인: 묶음 왼쪽 라이트바(파랑 세부 설정·민트 진단·빨강 위험), 안쪽 칸은 카드 대신 구분선 + 제목 색 막대(memhubcss).
- (11-14) 고급 세부 설정 보기 정리: `src/ui/screens/memory/advorganize.js` organizeAdv — 칸들을 주제 3묶음(기록·분석 / 대화에 넣기 / 저장소·가져오기)으로 옮기고 칸마다 접힌 한 줄(제목+설명). 내용·코드는 그대로 옮겨 담기만, 늦게 붙는 칸도 MutationObserver로 정리.
- (11-14) 장기 기억 칸 이름 ‘옵션’→‘설정’(id는 opt 그대로). 설정 칸: ‘리수폿’ 줄 → **인물 위키 설정**, ‘Erosync’ 줄 → **NSFW 설정**(설명 길게, 오른쪽 열이 왼쪽 기억 옵션과 같은 높이, 모바일은 이 둘이 위로).
- 인물 위키 설정 화면(potpage): 화면 글자 ‘리수폿’ → ‘인물 위키’(pot.js·autotrackingbox·trackui·writerui·conflictui 포함, 주석 제외). **켜기 스위치 없앰 — 열 때 꺼져 있으면 setPotAll(true)로 켬**. 칸 = 개요·설정·고급(고급 = 예전 자동 기록 + 고급 합침). NSFW 설정 화면 머리 ‘NSFW 설정’.
- 두 화면 라이트바 디자인(memhubcss 끝: .rb-pot-page 파랑·.rb-ero-page 분홍, 큰 카드 초록, 칸 고르기 네온). run-potpage 기대값 수정.
- npm test 통과 수가 1551/1554로 왔다 갔다 함(실패는 늘 같은 3개) — 흔들리는 시험 확인 필요.
- (11-14) 인물 위키 설정: 설정 탭의 ‘고급 모드’ 스위치 없앰 → 그 세부 기능(advancedGlobal·advancedModel)은 고급 탭에 늘 보임(flowSections part "basic"/"adv"). 고급 탭 = 세부 기능(채팅 없어도) + 인물 추적·저장·되돌리기(채팅 있을 때).
- (11-14) NSFW 설정 탭 8개 → 3개: 개요 · 장면·수위(수위·집착 방지·프리셋·동작·장면 되돌리기·비하인드) · 분석·관리(인물 분석·분석 설정·성격 변화 검토·프롬프트·데이터). 예전 m.eroTab 값은 새 탭으로 이어 줌(OLD_TAB). run-erosync-ui 탭 이름 수정.
- 인물 위키 설정 ‘AI 모델’ 칸은 설정 탭에서 빼고 고급 탭 맨 위(모델 고르기 + 세부).
- (11-14) 설명 문구 정리: 바뀐 UI·이름에 맞게(리수폿→인물 위키 설정, ‘검토’ 탭→분석·관리, 기억 옵션 위치, 프롬프트 이름 ‘기억·인물 위키 프롬프트’ 등). 외부 리수폿 플러그인·예전 ‘리수폿 기록’ 방식을 가리키는 말은 그대로.
- 관계도(.rb-rm 파랑)·코코아(.rb-skills 민트)·기억 카드(.rb-cards2 주황) 라이트바 디자인: 새 `src/ui/screens/memthemecss.js`(styles.js 끝). 코코아는 한 단 배치.
- 인물 위키 설정의 ‘성인 항목’ → NSFW 설정 장면·수위 탭(flowSections part "adult"). 순서: 수위 · 집착 방지 · 성인 항목 · 동작 · 비하인드 · 장면 되돌리기 · 프리셋.
- **2번 기억 세션: 5화면 모두 끝(디자인). 남은 것 실기기 확인.** 다음은 3번 작업실.
- (11-14) 중복 확인: 장기 기억 고급에서 ‘저장·기록’(분석 모델·자동 기록 시점·응답 대기 시간)이 세부 설정 ‘분석’ 칸과 같은 값이라 madv에서 뺌(묶음 이름 ‘대화에 넣기’). 인물 위키 고급의 기록 시점은 따로 저장되는 값이라 이름을 ‘인물 위키 기록 시점’으로 구분. 나머지 이름 겹침은 같은 칸의 글자·스위치 이름 또는 다른 기능(NSFW ‘분석’)이라 그대로.
