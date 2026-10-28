# Dusk Atelier 소스 구조 지도 (v{{VERSION}} 기준, tools/source-map.mjs로 자동 생성)

새 채팅에서 파일을 찾을 때 먼저 이 문서를 보고, 필요한 파일만 읽는다. 저장소: Pyser08/Dusk-Atelier. 기능 작업은 브랜치에서 하고 main에 push하면 release.yml이 package.json 버전으로 릴리스한다. 갱신: `node tools/source-map.mjs > docs/source-map.md` 후 프로젝트 문서 `claude/source-map.md`로 올린다(`project_write` + `local_path`).

## 빌드·테스트·릴리즈
- 진입 `src/main.js` → esbuild(`tools/build.mjs`)로 `dusk_atelier.js` 한 파일(IIFE). `__VERSION__`·`__CHANGELOG__`는 빌드 define. 산출물도 git에 포함되니 소스 수정 후 `node tools/build.mjs`로 다시 빌드(`npm run check`로 동일 확인).
- 테스트 `node --test` (tests/*.test.js, 순수 엔진 위주, v{{VERSION}} 기준 {{TESTS}}개). UI는 `node tests/e2e/run-smoke.mjs`(가짜 ctx 브라우저 연기 시험)·Playwright로 확인.
- 버전: `package.json` + `CHANGELOG.md` 맨 위 `## vX.Y.Z (날짜)` 섹션(앱의 '새로 바뀐 점'에 표시) + `docs/GUIDE-vX.Y.Z.md`.
- 아카 글 HTML: `docs/arca/v버전.html` (형식은 프로젝트 문서 arca-post-preset.html, 이전 형식은 arca-post-header.md).
- 주의: `git remote set-url`은 차단됨. 저장소가 얕은 복제일 수 있으니 병합 전 `git fetch origin main`/`--depth=N origin 브랜치`. 클라우드 샌드박스는 npm 레지스트리가 막혀 있을 수 있음 → esbuild·acorn·eslint-scope는 `/opt/npm-tools/node_modules/`(또는 `/opt/node-tools/`)에서 `node_modules/`로 링크.
- 리수폿 원본: 저장소 `ref/risupot` 브랜치의 `risupot_v2_3_0.js`(챗에 첨부하지 않음). `src/engine/pot/`·`src/data/pot/`는 `tools/pot-split.mjs`(+`tools/pot-patches.json`)가 자동 생성하므로 **직접 고치지 않는다**. 자세한 인계는 `docs/HANDOFF-v1.6.4.md`.

## 계층 규칙
- `engine/` 순수 로직(브라우저·api 없이 테스트 가능), `data/` api·저장소 접근, `ui/` 화면(DOM은 `ui/dom.js`의 `h()`/`replace()`, 공용 위젯 `ui/kit.js`), `tide/` RisuTide 통합.
- UI 상태는 `ctx.state` 아래 객체(기억 탭은 `ctx.state.mem`, 카드 탭은 `m.ctab`). 화면 전환은 부분 갱신 우선(전체 재렌더 금지: 버벅임 원인). plugins·tools·settings 탭은 DOM을 보존하고 재방문 시 재렌더 생략(`ui/app.js`).
- 장기기억(v1.6.4): 저장소 `data/memorystore3.js`(키 `dusk.mem.v3.*`) → 턴 흐름 `data/memoryturn.js`(리수폿 컨트롤러 + Dusk 러너/주입, `memory.flow`) → 화면 `ui/screens/memory/`. 설정은 `index.settings.flow`(기본 꺼짐)와 리수폿 설정(`memory.flow.settings()`). 모델은 `data/modelhub.js`(`runAI`의 `pick.mode:"custom"`).

## 파일 목록
{{FILES}}

## Risu 플러그인 API (우리 코드가 쓰는 호출, 횟수순)
{{API}}

## RisuAI 본체 구조 (kwaroran/RisuAI, 2026.10.220 기준)
읽기 전용 클론: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/kwaroran/risuai` (add_repo로 읽기만 가능, 쓰기 불가). 전체를 읽지 말고 아래 위치만 grep한다.
- 스택: Svelte 5 + TypeScript, Tauri(데스크톱), Vite, pnpm. 가이드 문서 `plugins.md`(1649줄), 구조 설명 `AGENTS.md`.
- `src/ts/plugins/apiV3/risuai.d.ts` (2145줄): **플러그인 API 타입의 원본**. 새 API 확인은 여기부터. `v3.svelte.ts`(호스트 구현), `factory.ts`·`transpiler.ts`(샌드박스 iframe).
- `src/ts/storage/database.svelte.ts`: 데이터 모델. `loreBook`(key, secondkey, insertorder, comment, content, mode: multiple|constant|normal|child|folder, alwaysActive, selective, activationPercent, useRegex, id, folder, extentions{}), `Message`(role user|char, data, time, disabled…), 캐릭터·챗·설정 전체.
- `src/ts/process/`: 채팅 처리. `index.svelte.ts`(메인 오케스트레이션), `prompt.ts`(프롬프트 조립), `lorebook.svelte.ts`(로어북 활성화), `scripts.ts`(정규식 스크립트), `triggers.ts`, `modules.ts`(모듈), `memory/`(HypaMemory·SupaMemory), `request/`(모델 요청), `pluginStorageStore.ts`.
- `src/ts/parser/parser.svelte.ts` CBS(`{{...}}`) 파싱, `src/ts/cbs.ts`. `src/ts/characterCards.ts` 카드(.charx/PNG) 입출력. `src/ts/globalApi.svelte.ts` 전역 API. `src/ts/stores.svelte.ts` 상태.
- `src/lib/`: Svelte UI(ChatScreens, SideBars, Setting, UI …). 리스 화면 DOM 선택자를 쓸 때 여기서 클래스 확인.

## Risu 플러그인 API v3 전체 목록 (risuai.d.ts)
모든 호출은 비동기(Promise). 샌드박스 iframe에서 실행되고 리스 DOM은 SafeElement로만 접근.
- 일반: `log`, `showContainer(mode)`, `hideContainer`, `getRuntimeInfo`, `requestPluginPermission`, `onUnload`, `loadPlugins`, `checkCharOrder`
- DOM: `getRootDocument`, `createMutationObserver`, SafeElement(appendChild, setStyle, addClass, querySelector, addEventListener …), SafeDocument.createElement
- 캐릭터·챗: `getCharacter/setCharacter`(=getChar/setChar), `getCharacterFromIndex`, `setCharacterToIndex`, `getChatFromIndex`, `setChatToIndex`, `parseRisuChat`, `getCurrentCharacterIndex`, `getCurrentChatIndex`, `getCurrentLorebookEntries`
- 저장소: `pluginStorage`(권장, getItem/setItem/keys…), `safeLocalStorage`, `getLocalPluginStorage`, `getArgument/setArgument`, `getArg/setArg`
- DB: `getDatabase(includeOnly|'all')`, `setDatabaseLite`, `setDatabase`
- 테마: `changeColorScheme/setColorScheme/getColorScheme`, `changeTextTheme/setCustomTextTheme/getTextTheme`
- 네트워크: `nativeFetch`, `saveSecretHeader`, `getFetchLogs`, `registerBodyIntercepter`
- UI 등록: `registerSetting`, `registerButton`, `unregisterUIPart`
- 스크립트·치환: `addRisuScriptHandler/remove…`, `addRisuReplacer/remove…`, `addRisuChatListener/remove…`
- 확장: `registerMCP/unregisterMCP`, `addProvider`(커스텀 AI), `addTTSPreprocessor/Postprocessor`, `runLLMModel`, `sendChat`
- 에셋: `readImage`, `readInlay`, `saveAsset`
- 플러그인 간: `addPluginChannelListener`, `postPluginChannelMessage`
- 번역 캐시: `searchTranslationCache`, `getTranslationCache`

## Dusk가 만지는 Risu 데이터 (자주 쓰는 경로)
- 캐릭터 목록 `getDatabase(["characters","characterOrder"])`, 개별 캐릭터는 `getCharacterFromIndex`, 채팅은 `getChatFromIndex(bot.index, chatIndex)`(본문 읽기가 느림 → 캐시 필수).
- 로어북은 캐릭터의 `globalLore`와 모듈의 lorebook. Dusk 규칙은 항목 `extentions.da_rid`·`da_rule`에 저장(engine/lorerules.js).
- 쓰기는 `setCharacterToIndex`/`setDatabaseLite`(둘 다 호스트 차단 시 친절한 오류로 감싸는 래퍼 있음: main.js).
- 채팅 메뉴 버튼 `registerButton({location:"action"})`(main.js), 우하단 알림은 메인 화면(mainDom) 권한이 있을 때만(`data/retrytoast.js`·`ui/toast.js`).
