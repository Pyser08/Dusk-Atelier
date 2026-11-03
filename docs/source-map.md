# Dusk Atelier 소스 구조 지도 (v1.8.2 기준, tools/source-map.mjs로 자동 생성)

> **다른 AI/새 세션 인계:** 먼저 `HandOff/README.md` → `HandOff/STATE.md` → `HandOff/TASK-MAP.md` 순서로 읽는다.

새 채팅에서 파일을 찾을 때 먼저 이 문서를 보고, 필요한 파일만 읽는다. 저장소: Pyser08/Dusk-Atelier. 기능 작업은 브랜치에서 하고 main에 push하면 release.yml이 package.json 버전으로 릴리스한다. 갱신: `node tools/source-map.mjs > docs/source-map.md` 후 프로젝트 문서 `claude/source-map.md`로 올린다(`project_write` + `local_path`).

## 빌드·테스트·릴리즈
- 진입 `src/main.js` → esbuild(`tools/build.mjs`)로 `dusk_atelier.js` 한 파일(IIFE). `__VERSION__`·`__CHANGELOG__`는 빌드 define. 산출물도 git에 포함되니 소스 수정 후 `node tools/build.mjs`로 다시 빌드(`npm run check`로 동일 확인).
- 테스트 `node --test` (tests/*.test.js, 순수 엔진 위주, v{{VERSION}} 기준 241개). UI는 `node tests/e2e/run-smoke.mjs`(가짜 ctx 브라우저 연기 시험)·Playwright로 확인.
- 버전: `package.json` + `CHANGELOG.md` 맨 위 `## vX.Y.Z (날짜)` 섹션(앱의 '새로 바뀐 점'에 표시) + `docs/GUIDE-vX.Y.Z.md`.
- 아카 글 HTML: `docs/arca/v버전.html` (형식은 프로젝트 문서 arca-post-preset.html, 이전 형식은 arca-post-header.md).
- 주의: `git remote set-url`은 차단됨. 저장소가 얕은 복제일 수 있으니 병합 전 `git fetch origin main`/`--depth=N origin 브랜치`. 클라우드 샌드박스는 npm 레지스트리가 막혀 있을 수 있음 → esbuild·acorn·eslint-scope는 `/opt/npm-tools/node_modules/`(또는 `/opt/node-tools/`)에서 `node_modules/`로 링크.
- 리수폿 원본: 저장소 `ref/risupot` 브랜치의 `risupot_v2_3_0.js`(챗에 첨부하지 않음). `src/engine/pot/`·`src/data/pot/`는 `tools/pot-split.mjs`(+`tools/pot-patches.json`)가 자동 생성하므로 **직접 고치지 않는다**. 자세한 인계는 `docs/HANDOFF-v1.6.4.md`.

## 계층 규칙
- `engine/` 순수 로직(브라우저·api 없이 테스트 가능), `data/` api·저장소 접근, `ui/` 화면(DOM은 `ui/dom.js`의 `h()`/`replace()`, 공용 위젯 `ui/kit.js`), `tide/` RisuTide 통합.
- UI 상태는 `ctx.state` 아래 객체(기억 탭은 `ctx.state.mem`, 카드 탭은 `m.ctab`). 화면 전환은 부분 갱신 우선(전체 재렌더 금지: 버벅임 원인). plugins·tools·settings 탭은 DOM을 보존하고 재방문 시 재렌더 생략(`ui/app.js`).
- 장기기억(v1.6.4): 저장소 `data/memorystore3.js`(키 `dusk.mem.v3.*`) → 턴 흐름 `data/memoryturn.js`(리수폿 컨트롤러 + Dusk 러너/주입, `memory.flow`) → 화면 `ui/screens/memory/`. 설정은 `index.settings.flow`(기본 꺼짐)와 리수폿 설정(`memory.flow.settings()`). 모델은 `data/modelhub.js`(`runAI`의 `pick.mode:"custom"`).

## 파일 목록
### src/
- `main.js` (248줄) 

### src/data/
- `addcharacter.js` (46줄) 새 봇을 DB에 추가하는 공용 흐름 (legacy.js의 '캐릭터 추가'에서 추출, 동작 동일). — insertCharacter, createBotDraft
- `affhud.js` (177줄) 호감도 HUD 프리셋 런타임: 응답이 끝나면 호감도를 채팅 변수($aff…)에 써 둔다. — createAffHud
- `assetfix.js` (92줄) v1.8.2 에셋 태그 고치기(도구 탭, 사용자가 누를 때만): 지금 열린 채팅 읽기 · 고친 응답 … — UNDO_KEY, loadRange, applyFix, lastUndo, undoFix
- `assetfolders.js` (65줄) — foldersOf, childFolders, folderPath, createFolder, renameFolder
- `cardassets.js` (6줄) 카드 에셋(자동 생성): 기본 프레임 1장(글자 제거·투명 처리, 1024x1536 WebP)과 Gi… — CARD_FRAME_DATA, CARD_FONT_DATA, CARD_FRAME_SIZE
- `cardbot.js` (34줄) 카드로 새 봇 객체 만들기. 원본 봇은 수정하지 않고 새 객체만 반환한다. — buildCardCharacter
- `cardflow.js` (78줄) 카드 만들기 흐름(AI 호출 3회: 카드·연결·첫 메시지)과 에셋 고르기. 화면 코드 없이 api만 … — roleNamesOf, generateCard, generateLink, listBotImages, pickIllustrations
- `cardstore.js` (42줄) 카드 저장소: 카드 본문(dusk.mem.v2.card.<id>), 목록 인덱스, 카드 설정. 직렬 … — CARD_PREFIX, CARD_INDEX_KEY, CARD_CFG_KEY, DEFAULT_CARD_CFG, createCardStore
- `charorder.js` (114줄) — layout, moveChar, createFolder2, setMembers, renameFolder2
- `chatmenu.js` (44줄) 채팅 입력창 옆 메뉴(≡)의 빠른 설정 (1.8.3): [장기 기억 바로가기] · 공정한 전개 · 유… — CHAT_MENU_KEY, createChatMenu
- `dbcache.js` (65줄) 읽기 전용 getDatabase 짧은 캐시 (v1.8.1 최적화). — dbRead, cacheGen, bumpCacheGen, WRITE_RE, createDbCache
- `embed.js` (88줄) v1.7.1 임베딩 호출·저장. 설정과 키는 이 기기의 로컬 저장소에만 둔다(백업·공유 내보내기에 안… — createEmbedder
- `fairplay.js` (88줄) 공정한 전개 훅 (v1.6.8). 장기기억과 무관하게 설정에서 켜고 끈다. 기본 꺼짐. — FAIR_KEY, DICE_KEY, DICE_MODE_KEY, DICE_LEVEL_KEY, DICE_CUTS_KEY
- `gauge.js` (141줄) 게이지 서비스: 정의(idx.gauges[chaId]) · 값/이력(folder.gauge) 저장, … — createGaugeService
- `genstate.js` (9줄) 응답 스트리밍 신호. output 훅이 불릴 때마다 시각을 남겨, 생성 중인지 알아보려고 캐릭터·채팅… — noteStreamChunk, recentlyStreamed, resetStreamSignal
- `hookbus.js` (51줄) 리스 스크립트 훅(input·output·display) 묶음 (v1.8.1 최적화). — createHookBus
- `hypaimport.js` (57줄) v1.8.1 HypaPlus 가져오기(데이터): 같은 저장소(pluginStorage)에 남은 Hyp… — createHypaImporter
- `imgtagfix.js` (142줄) v1.8.2 AI 이미지 태그 교정·알림 훅. 설정에서 각각 켜고 끈다(기본 꺼짐). 모델 호출은 늘… — IMGFIX_KEY, IMGFIX_HINT_KEY, IMGFIX_UNKNOWN_KEY, createImgTagFix
- `interopSnippet.js` (4줄) DA Interop v1 스니펫 원본: https://github.com/Pyser08/dusk-at…
- `lorelog.js` (204줄) 로어북 로그 런타임 — LORE_LOG_KEY, loadLoreLog, clearLoreLog, createLoreLog
- `lorerules.js` (264줄) 로어북 규칙 런타임 — LORE_SETTINGS_KEY, LORE_DEFAULTS, loadLoreSettings, saveLoreSettings, createLoreRuntime
- `memory-default-prompts.js` (52줄) 장기기억 기본 프롬프트 2개 — MEMORY_DEFAULT_PROMPT_1, MEMORY_DEFAULT_PROMPT_2, DEFAULT_PROMPT_BLOCKS
- `memory.js` (75줄) 장기기억 조립: 저장소·러너·주입·BardWiki 백엔드를 묶고, 선택된 백엔드에 따라 훅을 등록한다… — createMemory
- `memorybackend-bardwiki.js` (69줄) 리스바드 BardWiki 읽기 어댑터 + 스냅샷 캐시(dusk.mem.v2.ext.<folderId>… — createBardWikiBackend
- `memorybackend.js` (16줄) 기억 저장소 백엔드 선택. local = 플러그인 자체 저장·분석·주입, bardwiki = 리스바드… — hasBardWiki, selectBackend, CAPABILITIES, capabilitiesOf
- `memorybot.js` (22줄) 장기기억에서 합성한 새 봇 객체 만들기. 원본 봇은 수정하지 않는다(새 객체만 반환). — buildMemoryCharacter
- `memorybutton.js` (49줄) 채팅 메뉴(입력 옆)의 '장기기억' 버튼을 설정에서 켜고 끄기 (v1.6.5). 기본 켜짐. — MEMORY_BUTTON_KEY, loadMemoryButtonOn, createMemoryButton
- `memoryinject.js` (93줄) 장기기억 주입 훅: 요청 사본에만 [Dusk Memory] 블록을 넣는다(저장 데이터 불변). — createMemoryInjector
- `memoryload.js` (12줄) v1.6.5 읽기 경로 대조: 폴더를 읽어 메모리 사본에서만 앵커 정합성(reconcile)을 맞춘다… — loadReconciled
- `memoryrewind.js` (57줄) 저장된 기억으로 새 채팅 만들기. 원본 채팅·봇 데이터는 수정하지 않고 새 채팅만 추가한다. — sliceFolder, sceneAt, draftFirstMessage, createRewindChat
- `memoryrunner.js` (280줄) 장기기억 러너: output 훅 → 디바운스 → 마지막 AI 응답 분석 → 폴더 반영. 훅 안에서는 … — createMemoryRunner
- `memorystore.js` (121줄) 장기기억 v2 저장소: 인덱스 + 폴더별 키 분할, 직렬 쓰기 큐, v1 마이그레이션. — INDEX_KEY, FOLDER_PREFIX, EXT_PREFIX, LEGACY_KEY, DEFAULT_SETTINGS
- `memorystore3.js` (151줄) 장기기억 v3 저장소: v2와 같은 메서드 + 채팅별 인물 위키(wiki) + 리수폿 가져오기. 직렬… — INDEX_KEY, FOLDER_PREFIX, createMemoryStoreV3
- `memoryswitches.js` (71줄) v1.7.0 2단계: 화면이 쓰는 '기억 · 리수폿' 스위치 묶음. 저장은 인덱스(store.upda… — currentChat, createSwitches
- `memorytools.js` (33줄) 인물 AI 도구(7단계 B): 리수폿 컨트롤러를 한 묶음으로 만든다. 턴 흐름이 켜져 있고 그 채팅이… — makeTools
- `memoryturn.js` (237줄) 턴 흐름 (v1.6.4 4단계): 리수폿 인물 위키(고르기·정리 노트·기록하기)와 Dusk 기록을 한… — promptKeysOf, stageOf, createTurnFlow
- `modelhub.js` (73줄) 모델 허브 (v1.6.4 3단계): 모델 프리셋 저장·키 보관·내 API 호출·토큰 사용량. 화면은 … — getCfg, saveCfg, keyStore, pickForStage, getUsage
- `modules.js` (245줄) — loadCharacters, readDb, entriesOf, loadModuleState, moduleCounts
- `persona.js` (152줄) — loadPersonaMap, savePersonaMap, setPersonaLink, syncPersonaModules
- `personabuilder.js` (353줄) 페르소나 빌더: 설명 양식(프리셋) 파싱·조립, AI 프롬프트, 저장소, 공유 코드 — parseTemplate, addField, removeField, addSection, removeSection
- `personaroulette.js` (52줄) 페르소나 룰렛: 칸마다 범주를 고르고 무작위로 뽑아 콘셉트에 보탠다. — spin, wheelItems
- `pluginTemplate.js` (185줄) 플러그인 만들기 — 템플릿, 머리말·등록 코드 동기화, 검사, 설치용 객체, 도움말 — buildTemplate, syncMeta, isValidVersion, cmpVersion, checkCode
- `plugins.js` (225줄) 플러그인 탭 데이터 계층 — DA Interop v1 호스트 + 플러그인 관리 — listInterop, sendPatch, presetValues, waitAck, pruneInterop
- `potstorage.js` (59줄) 리수폿 컨트롤러가 쓰는 저장소(pluginStorage 모양)를 Dusk 저장소 v3 위에 얹는 어댑… — scopeIdsOf, createPotStorage
- `presets.js` (140줄) — loadPresets, savePresets, snapshotOf, recordActive, applyPreset
- `regexprep.js` (25줄) v1.8.1 정규식 전처리 공급자: 이 채팅에 적용할 정규식 목록을 모아 준다. 읽기만 하며 실패하면… — createRegexPrep
- `retrytoast.js` (58줄) 채팅 화면 오른쪽 아래에 뜨는 작은 알림. 자동 위키 기록이 막혔을 때 플러그인을 열지 않고 바로 다… — createRetryToast, judgeAutoResult
- `service.js` (131줄) — createService, groupByFolder
- `skillguide.js` (3줄) cocoA(gent!) SKILL_GUIDE.md 원문(스킬 형식 규격). AI 스킬 만들기 대화의 … — SKILL_GUIDE
- `skillstore.js` (70줄) 스킬 저장소·가져오기·주입 공급자 (v1.8.1). 추가 AI 호출 없음. 실패해도 기억 흐름을 막지… — SKILL_LIB_KEY, COCOA_PRESETS_KEY, COCOA_LIB_KEY, createSkillStore
- `storytime.js` (44줄) 이야기 시간 훅 (v1.6.8). 장기기억을 켜든 끄든 독립으로 동작하고, 설정에서 켜고 끈다. 기본… — STORY_TIME_KEY, loadStoryTimeOn, createStoryTime
- `themebuilder.js` (789줄) 테마 빌더: 고르기만 해서 채팅 테마(커스텀 HTML + CSS)를 만든다. — hexToOklch, oklch, contrast, ensureContrast, makePalette
- `themes.js` (374줄) 테마 스튜디오: 일반 리스 / 포켓리스 계열 테마를 따로 만들고 저장·적용한다. — detectTarget, loadThemes, saveThemes, newTheme, duplicateTheme
- `turninfo.js` (166줄) 응답 아래 표시 런타임 (1.8.3): ② 주사위 결과 · ③ 모델 호출 정보(+ 화면 구석 상태 칩… — DICE_SHOW_KEY, CALL_SHOW_KEY, CACHE_ALERT_KEY, TURN_LOG_KEY, loadDiceShow
- `webtools.js` (53줄) 웹 검색·가져오기 도구 (v1.8.1). 기본 꺼짐. 켠 단계(기본: 정리 노트)에서만 모델이 도구를… — WEB_KEY, WEB_STAGES, defaultWebCfg, normalizeWebCfg, createWebTools
- `workshop.js` (58줄) 봇빌더(risu_story_workshop) 연동 (v1.8.1): 설치·연동판 감지, 화면 열기, … — HANDOFF_KEY, WS_PREFIX, createWorkshopLink
- `workshoppatch.js` (44줄) 봇빌더(risu_story_workshop) DA Interop 연동판 만들기 (v1.8.1) — 순… — MARK, patchWorkshop, isPatchedWorkshop

### src/data/pot/
- `pot/*.js` 33개 — 리수폿 저장소·모델 클라이언트·훅·추적(자동 생성, prompts.json·MANIFEST.json 포함)

### src/dev/aibuild/
- `bridge.js` (52줄) 실시간 반영 다리 (v1.6.7 2단계). — toDraft, toView, hostFromEditor
- `controller.js` (370줄) AI로 제작 컨트롤러 (화면 없음). 봇빌더 Workshop 클래스의 로직 부분을 이식하고, — createAiBuild
- `core.js` (497줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — withKind, MODULE_ONLY_OFF, editable, blankCharacter, newSession
- `duskdesign.js` (621줄) v1.6.7 4단계: 로어북 'Dusk 방식'. — hasDusk, resolveLoreMode, ruleToDesign, ruleLine, duskContext
- `index.js` (10줄) AI로 제작(봇빌더 v0.3.2 이식) 공개 진입점. 화면 없이 쓸 수 있는 엔진 + 컨트롤러. — createAiBuild, createAiStore, normalizeSettings, DEFAULT_SETTINGS, STORE_PREFIX
- `limits.js` (35줄) 요청 용량 한도 (v1.6.8). 토큰이 아니라 글자 수·바이트 수로만 잰다(정확한 토큰 계산 없음)… — DEFAULT_INPUT_CHARS, MAX_INPUT_CHARS, MIN_INPUT_CHARS, INPUT_LIMIT_VERSION, PROMPT_BYTES_LIMIT
- `lorerefine.js` (118줄) 로어북 더스크화 2단계 '규칙 설계' (v1.8.1) — 순수 함수. — REFINE_BATCH, refineTargets, refineMessages, readRefine, refineStep
- `loreselect.js` (76줄) 로어북 선택·부분 수정 (v1.6.8, 순수). 요청에 실을 로어북을 항목별로 고르고, — loreSelection, validLoreIncluded, reconcileLoreSelection, requestLorebook, assertLoreRefsIncluded
- `model.js` (62줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — responseText, callModel
- `modules.js` (111줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — MODULE_LIMIT, badKeys, tree, normalizeModule, normalizeModules
- `partrewrite.js` (38줄) 로어북 부분 다시 쓰기 (v1.6.8, 순수): 고른 글 한 토막만 AI에게 맡기는 요청을 만들고 응… — CTX_CHARS, partMessages, cleanPart
- `preset-calc.js` (108줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — precedence, isOperator, isNumber, toRPN, calculate
- `preset-engine.js` (466줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — newPresetState, validatePresetState, toggleDefinitions, presetValues, tokenize
- `preset-format.js` (108줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — rpackMap, import_index_no_eval, PRESET_LIMIT, key, expand
- `preset-v2.js` (65줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — parseToggleSyntax, parseToggleTree, toggleDefault, ops, safeArg
- `regextest.js` (68줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — expandReplacement, regexTest
- `store.js` (99줄) AI로 제작(봇빌더 이식) 저장소 — 키는 전부 da_aibuild:* (봇빌더 원본 키와 분리). — STORE_PREFIX, AUTOSAVE_MS, DEFAULT_SETTINGS, normalizeSettings, createAiStore
- `util.js` (37줄) 봇빌더(BB) v0.3.2 (arca.live/b/characterai/187289284)에서 이식.… — VERSION, PREFIX, FIELDS, ARRAY_FIELDS, dangerous

### src/engine/
- `affhud.js` (144줄) 호감도 HUD 프리셋(순수): 배경 HTML 조각·기본 변수 설치/제거, 리스폿 수치 읽기, 자체 보… — MARK_A, AFF_DEFAULTS, AFF_KEYS, hudHtml, hasHud
- `affprompts.js` (54줄) 호감도 HUD가 보조모델에 보내는 기본 프롬프트. 문구만 고치면 되도록 한곳에 모았다. (로직은 af… — JUDGE_SYSTEM, JUDGE_USER, DESIGN_SYSTEM, DESIGN_USER, DESIGN_RETRY
- `airesponse.js` (30줄) — extractRunAIText
- `assetfix.js` (180줄) v1.8.2 에셋 태그 고치기(도구 탭, 수동). 순수 로직. — MAX_ITEMS, scanReplies, aiItems, aiMessages, parseAiReply
- `bardwikiadapt.js` (98줄) 리스바드 BardWiki 문서 → 장기기억 폴더(§2.2 모양) 변환. 순수 함수. 필드가 없으면 건… — VIRTUAL_MARK, parseSections, bullets, SUMMARY_TITLES, eventBullets
- `character.js` (221줄) — characterAssetKeys, characterView, planCharacter, buildMergedCharacter, newCharacterBase
- `chattext.js` (51줄) 채팅 메시지 텍스트 공통 처리 (장기기억용). — extractMessageText, isUserMessage, confirmedAiIndex, hashText, fullTextHash
- `cocoamigrate.js` (57줄) 코코아전트에서 옮겨오기 (v1.8.1, 순수). 코코아전트가 pluginStorage에 남긴 스킬 라… — dusStagesOf, readCocoa, suggestStageRefs, agentToSkillSet
- `conflict.js` (52줄) v1.7.0 4단계: 롤백 충돌 '변경 비교'(순수). 응답을 고치기 전의 자동 기록이 있는데 그 뒤… — compareChanges, dismissConflict
- `customprompt.js` (16줄) 내 프롬프트(장기기억 분석 단계)를 플러그인의 모든 AI 호출에 같은 위치(앞·중간·뒤)로 끼운다 (… — USER_PROMPT_MARK, applyUserPrompts
- `cyclememo.js` (47줄) 월경·임신 → Dusk 기록 연결(v1.6.4, 순수): 위키의 월경·임신 구획이 바뀐 것 중 등급이… — cycleStates, cycleMilestones, milestonesBetween, addMilestones
- `devcheck.js` (153줄) — projView, loreActivation, regexRun, devLint, devStats
- `devfile.js` (263줄) 개발 모드 전용 파일 불러오기·내보내기 (1.5.4). — readWorkFile, identityDiff, parseListFile, applyListImport, listExportText
- `duskwriter.js` (36줄) v1.6.4 기록 호출 합치기(순수): 리수폿 Writer 프롬프트에 Dusk 기록 구획을 덧붙이고,… — SECTION_MARK, appendDuskSection, splitDusk, checkDusk
- `embed.js` (57줄) v1.7.1 임베딩(순수): 요청·응답 모양, 벡터 압축, 유사도, 검색 가중치. 네트워크·저장은 d… — DEFAULT_EMBED, normCfg, endpointOf, isContextual, isReady
- `export.js` (42줄) — rpackEncode, buildRisum, moduleJson
- `fairplay.js` (126줄) 공정한 전개 (v1.6.8, 순수). AI가 사용자 쪽에 유리하게만 풀어 가는 편향을 줄이는 지침 블… — FAIR_MARK, FAIR_TEXT, DICE_COUNT, DICE_MODES, DICE_LEVEL_IDS
- `firstrun.js` (29줄) 처음 쓰는 사람용(순수): 설정을 하나도 안 만져도 켜기만 하면 작동하도록 기본값을 정한다. — WIZARD, firstRunFeatures, isPotName, potInstalled, isBbName
- `flowsteps.js` (19줄) 이번 턴 진행 점 5개(고르기 → 회상 → 정리 → 주입 → 저장). 순수 함수: 마지막 턴 기록만 … — STEP_LABELS, stepsOf
- `gauge.js` (198줄) 사용자 정의 게이지(v1.8.1): 순수 로직. 정의(캐릭터별) · 현재값(채팅×인물별) · 변경 이… — EVERY_TURNS, LOG_CAP, SUGGEST, SHAPES, gkey
- `gaugeview.js` (49줄) 게이지 박스 모양(HTML 문자열). 리스 채팅 안에 들어가므로 인라인 style만 쓴다. 순수 함수… — shapeHtml, gaugeBoxHtml
- `greetings.js` (105줄) 퍼스트 메시지(첫 메시지 + 추가 인사말 + 그룹 전용 인사말)를 한 목록으로 다루는 순수 로직 (v… — KIND_LABEL, toItems, fromItems, applyToDraft, addItem
- `hash.js` (132줄) — sha256js, sha256
- `hypaimport.js` (84줄) v1.8.1 HypaPlus 가져오기(순수): HypaPlus의 요약 노드(event/facts)를 … — HYPA_STATE_PREFIX, MAX_ACT, parseHypaKey, readHypaNodes, cut
- `image.js` (177줄) — imageSize, readMetadata, stripMetadata, canEncode, convertImage
- `imghint.js` (90줄) v1.8.2 이미지 태그 알림 (순수 로직, 추가 AI 호출 없음). — HINT_MARK, textOf, presentChars, buildHint, insertHint
- `imgtagfix.js` (420줄) v1.8.2 AI 이미지 태그 교정 (순수 로직, 모델 호출 없음). — norm, stem, buildAssetIndex, fixImgTags, readTags
- `impact.js` (62줄) 업데이트 영향 미리보기 (1.4.6) — moduleImpact, characterImpact, impactHtml, impactText
- `index.js` (20줄) — rpackDecode, assetKey, sha256, sha256js, Cancelled
- `issuehelp.js` (40줄) 편집기 검증 경고의 '왜 뜨나요 / 어떻게 하나요' 설명 (순수). 문구 패턴으로 찾고, 없으면 일반… — explainIssue, issueKey, splitIssues
- `loredusk.js` (372줄) 로어북 더스크화: 기존 로어북을 Dusk 폴더·소속·장소 구조로 바꾸는 계획을 만들고 적용한다 (순수… — dividerName, sigOf, rulePlan, batches, batchMessages
- `lorelist.js` (72줄) 로어북 목록 구조 계산(순수): 폴더 트리 만들기, 이름순 정렬. — nameOf, byName, childrenMap, sortLoreByName, pickTree
- `lorelog.js` (122줄) 로어북 로그: 이번 응답에 어떤 로어북 항목이 들어갔는지 알아낸다 (순수 함수) — squash, probeLines, bodyLines, canFire, detectInPrompt
- `lorerules.js` (788줄) Dusk 로어북 규칙 (DA Lore Rules v1) — RULE_VERSION, DONT_ACTIVATE, STATE_VAR, SET_OPS, MAX_HIST
- `match.js` (60줄) — normalizeName, stripTrailingNumber, findCandidates
- `memoryapply.js` (89줄) 분석 결과를 폴더에 반영하는 순수 함수. — findPersonKey, latestScene, applyAnalysis, DONE_MAX, doneHashes
- `memorycompose.js` (91줄) 새 봇 합성: 기록 선택 → 상황 블록 → 로어북 후보 → 생성 프롬프트. 순수 함수. — selectRecords, sceneBlocks, pickLore, relationshipPrompt, descPrompt
- `memorydelete.js` (27줄) 기록 삭제 연쇄 처리 (v1.6.5 4단계, 순수): 같은 응답에서 나온 관계 변화·떡밥 찾기, di… — TOMB_MAX, tombKey, isTombed, relatedOf, deleteRecord
- `memorydiag.js` (9줄) 자동 기록 진단 문구(순수 함수). 기억 탭 상태 카드에서 쓴다. — diagText
- `memorydigest.js` (26줄) 인물별 digest(압축) 조건·프롬프트·반영. — DIGEST_MIN_RECORDS, undigested, needsDigest, digestTargets, digestMessages
- `memoryedit.js` (121줄) v1.7.1 기억 편집기(순수): 화면에 보이는 값을 그 자리에서 고치면 원본 데이터에 반영한다. — locate, editTarget, undoLast, setAct, setKind
- `memoryemo.js` (132줄) v1.7.1 2단계: 다차원 감정 태그(순수). 호감도 하나를 6태그로 나누고, 코드가 게이지와 종합… — EMO_TAGS, EMO_LABEL, GAUGE_MIN, validateEmo, applyEmo
- `memorygrade.js` (71줄) 장기기억 등급 D < C < B < A < S < EX. 모델은 p·s·r(0~3)만 내고 등급은 여… — GRADES, GRADE_WEIGHT, SCORE_TABLE, GRADE_CAP, MAX_PER_RESPONSE
- `memoryguide.js` (10줄) 장기기억 첫 켜기 가이드 글(순수 데이터). 화면마다 작은 ? 버튼이 이걸 보여 준다. — GUIDE_ORDER, GUIDE
- `memoryhuman.js` (403줄) v1.8.3 사람다운 기억(순수). 추가 AI 호출 없음. — COOL_HALF, COOL_FLOOR, effectiveTags, coolEmo, GAP_MIN
- `memoryinject.js` (185줄) 장기기억 주입: 고정 예산으로 [Dusk Memory] 블록을 조립한다. 순수 함수. — MARKER, HEADER, estimateTokens, hasLiveMemory, injectVerdict
- `memoryinner.js` (151줄) v1.7.1 3단계: 인물 관점과 내면(순수). 전부 '중요한 상황에만', 선택 기입. — IMPORTANT_MIN, POV_MAX, validateSelf, validateInner, isImportant
- `memorykeys.js` (43줄) v1.7.1 2단계: 검색 키(순수). 기억을 만들 때 인물·장소·키워드를 함께 저장하고, 현재 장면… — KEYS_MAX, normText, validateKeys, keysOf, keyHits
- `memorylore.js` (94줄) v1.7.1 주입 로어 편집(순수): 대화에 들어가는 [Dusk Memory] 블록을 줄 단위로 고치… — NOTES_TITLE, NOTE_MAX, lineKey, emptyLore, splitBlock
- `memoryplus.js` (129줄) v1.6.2 장기기억 확장(순수): 지식 경계·열린 항목·관계 변화·세계 시간선·기억 강화/망각·원문… — OPEN_KINDS, OPEN_CAP, validateKnow, validatePlus, applyRel
- `memoryprompt.js` (122줄) 장기기억 분석 프롬프트·응답 파싱·검증. — SYSTEM_PROMPT, withCustom, buildMessages, parseJson, validate
- `memoryreconcile.js` (143줄) 앵커 정합성. 기록/상황은 {at, mid?, h}를 가진다. 순수 함수 — 폴더를 직접 수정한다. — indexMessages, srcOf, cleanOrphans, reconcile
- `memoryswitch.js` (95줄) v1.7.0 2단계: 기억 스위치와 리수폿 스위치를 서로 분리해서 다루는 순수 로직. — migrateIndex, memoryState, potState, setMemoryForBot, setPotForBot
- `memorytrust.js` (188줄) v1.7.1 1단계: 기억의 신뢰성(순수). 출처·확신도·유효성, 충돌 판정, 반복 횟수 중복 제거. — CONF_RANK, CONF_LABEL, KIND_LABEL, ATTR_CATS, HIST_MAX
- `memoryusage.js` (29줄) v1.7.0 3단계: 기억 화면 '저장된 기록 막대'(순수). 기록 N건이 마지막 요청에서 어떻게 쓰… — usageOf, injectLine
- `memoryuser.js` (100줄) {{user}} = 나(플레이어) (1.8.3, 순수). 분석 결과에서 플레이어를 가리키는 이름을 모… — USER, userKeySet, normalizeUserNames, userMergePlan, mergeIntoUser
- `memoryv3.js` (58줄) 장기기억 v3 순수 변환: v2 → v3, 리수폿 백업/저장소 덤프 → v3 조각, 봇 전체 인물 모… — V3, indexV2toV3, folderV2toV3, parsePotBundle, botPeople
- `merge.js` (37줄) 합치기(RisuTide) 연결: 인물·세계관 가져오기, 전체 합치기, 출처별 업데이트, 떼어내기, A… — adaptCharacterPrompt, conflictTidyPrompt, mergeInput, prepareScopedSelection, applyScopedSelection
- `merge3.js` (196줄) — charIncomingView, modIncomingView, pickView, merge3, charSpec
- `modelcfg.js` (90줄) 모델 설정 순수 로직 (v1.6.4 3단계) — 리수폿 모델 프리셋을 Dusk AI 선택(pick)으… — STAGES, STAGE_LABEL, defaultCfg, normalizeCfg, addPreset
- `module.js` (153줄) — loreIdentity, mergeLorebook, planAssets, buildMergedModule, fieldChanges
- `patch.js` (148줄) — viewKeys, buildPatch, parsePatch, planPatch, applyPatch
- `peoplegaps.js` (39줄) 인물 위키에서 '무엇이 비어 있는지'를 계산한다(순수). "비어 있는 인물 채우기"가 수치 유무만 보… — PROFILE_TEXT_FIELDS, FILL_METRIC_SLOTS, gapsOf, isFullyEmpty, hasGap
- `peoplegroup.js` (27줄) 인물 목록 폴더(리수폿 people-folders-ui 대응, 순수 함수). 폴더 배치는 위키 범위의… — UNASSIGNED, layoutOf, hasFolders, newFolderId, groupPeople
- `peoplemerge.js` (58줄) 인물 합치기 순수 로직. 합치기 대상은 'Dusk 인물'이 아니라 '목록에 보이는 항목'이다: — mergeEntries, duskMerge, planEntryMerge, applyEntryMerge
- `personedit.js` (38줄) 인물 페이지에서 바로 고치는 순수 함수(v1.6.4 ③): ✎ 직접 수정 · 📌 고정 · ⏸ 이 인… — scopeKeyOf, editSectionText, editMetricValue, setPin, isPinned
- `personrecords.js` (72줄) 인물 항목 직접 추가·편집·삭제(리수폿 people-records-ui · npc-emotion-ui… — RECORD_GROUPS, groupInfo, EMOTION_HINT, recordGroupOf, listRecords
- `personview.js` (80줄) 인물 페이지용 순수 로직: 위키 문서 찾기 → '지금 상태' 카드, Dusk 기록·위키 변화·관계·약… — TL_FILTERS, findDoc, stateOf, timelineOf, countsOf
- `promptimport.js` (46줄) 기억·리수폿 프롬프트 불러오기 (순수): JSON·리스 프리셋(.risup)에서 '프롬프트 후보'를 … — PROMPT_MAX, toJson, fromPreset, fromJson, fit
- `recall.js` (107줄) v1.6.4 회상(Recall, 순수): 리수폿이 고른 인물의 Dusk 기록을 골라 Director에… — RECALL_DEFAULTS, keywordBoost, scoreRecord, pickPeople, unknownFor
- `regexprep.js` (46줄) v1.8.1 정규식 전처리(순수): 기억 분석 입력과 임베딩 질의에서 상태창·HTML 같은 군더더기를… — DEFAULT_REGEX, normEntry, normEntries, parseRegexFile, collectEntries
- `regexview.js` (28줄) 정규식 '바로 시험' 결과 보기 (v1.6.7 7단계): 입력 글을 일치 위치로 잘라 강조·요약한다.… — segments, describeMatch, summarize
- `rpack.js` (13줄) — rpackDecode
- `runai.js` (73줄) 보조 모델이 {type:"streaming", result: ReadableStream}로 답하면 끝… — drainStream, settleResponse, setUserPromptProvider, withUserPrompts, setCustomRunner
- `safety.js` (32줄) — restoreFromBackup
- `settingsutil.js` (87줄) 기억 설정 도우미(순수): 변경 이력 10개 · 프리셋 공유 코드 · 설정 검색 · 범위 칩 이름. … — HIST_MAX, SHARE_PREFIX, SCOPE_CHIPS, scopeChipLabel, changedKeys
- `skillcfg.js` (40줄) 스킬 주입 설정 (v1.8.1, 순수). 켜기/끄기는 장기기억·코코아와 독립. 기본 꺼짐 → 꺼져 있… — SKILL_STAGES, SKILL_STAGE_LABEL, defaultSkillCfg, normalizeSkillCfg, injectionBlock
- `skillchat.js` (74줄) AI와 대화하며 스킬 만들기(순수, v1.8.1): 시스템 글 만들기, 답에서 파일 뽑기, 초안 합치… — extractSkillFiles, stripSkillFiles, mergeDraft, draftName, draftToSet
- `skillhook.js` (16줄) 스킬 주입 공급자 연결점 + 최근 호출 기록 (v1.8.1). main.js가 등록하고, 리수폿 단계… — setSkillBlockProvider, noteCall, noteTools, recentCalls, clearCalls
- `skills.js` (346줄) 스킬 라이브러리 (v1.8.1, 순수): cocoA(gent!) 스킬 형식과 호환. 세트(폴더 묶음)… — SKILL_LIMITS, SKILL_MD, SKILL_OPEN, SKILL_CLOSE, SKILL_SET_KIND
- `store.js` (317줄) — createStore
- `storydate.js` (20줄) 이야기 날짜 공유(v1.6.4): 응답 글에서 날짜를 프로그램이 한 번만 뽑고, 월경·임신 계산과 세… — latestStoryIso, storyDateOf, mergeWhen
- `storytime.js` (68줄) 이야기 시간 (v1.6.8, 순수). 메인 AI가 응답 맨 위에 적는 상태 줄 `[YYYY-MM-DD… — TIME_MARK, emptyState, timeFromText, parseStatus, latestStoryState
- `tideplan.js` (187줄) RisuTide 판단 로직(src/tide/)을 Dusk 업데이트 흐름에 잇는 곳. — charFields, modFields, fieldsToMod, makePlan, regexAutoNote
- `tidestore.js` (146줄) RisuTide가 남긴 기록을 읽는다 (읽기 전용). — localStore, tideBase, listTideBackups, loadTideBackup, loadProvenance
- `trackpreset.js` (66줄) 추적 수준 프리셋·기능 카드(순수). 리수폿 features(affinity·register·perc… — FEATURE_IDS, FEATURE_CARDS, LEVELS, levelPatch, applyLevel
- `turninfo.js` (94줄) 응답 아래 표시 (1.8.3, 순수): 주사위 결과 · 모델 호출 정보. 리스 메시지 안이라 인라인 … — VERDICTS, judgeRoll, estimateTokens, fmtTokens, fmtSec
- `upload.js` (61줄) — uploadAssets
- `util.js` (29줄) — stableJson, slotted, newId
- `vars.js` (27줄) 초기 변수(defaultVariables) 보기·고치기 (v1.6.7 7단계): 한 줄에 key=va… — parseVars, serializeVars, duplicateKeys
- `webhook.js` (5줄) 웹 도구 공급자 연결점 (v1.8.1). 공급자가 없으면 프롬프트를 그대로 한 번 부른다. — setWebWrapProvider, webWrap
- `websearch.js` (121줄) 웹 검색·가져오기 도구 (v1.8.1, 순수). 검색 서비스별 요청/응답 해석 + 주소 안전 검사(S… — WEB_LIMITS, WEB_PROVIDERS, webReady, buildSearch, parseSearch
- `wikiedit.js` (66줄) 인물 위키 화면이 쓰는 순수 함수: 빈 인물 만들기 · 문서 관리(이름·별칭·태그·연결 문서) · 인… — PROFILE_FIELDS, PROFILE_AXES, listOf, createBlankPerson, editDocMeta
- `workshop.js` (56줄) 봇빌더(risu_story_workshop) 연동 — 순수 함수 (v1.8.1) — WORKSHOP_PLUGIN, WORKSHOP_INTEROP_ID, HANDOFF_TTL, WORKSHOP_FIELDS, makeHandoff
- `zipwrite.js` (71줄) — crc32, createZip

### src/engine/card/
- `card.js` (63줄) 카드 모델: 생성·무결성 해시·이식용 사본. 순수 함수(해시는 crypto.subtle). — CARD_VERSION, sha256Bytes, sha256, hashData, defaultCrop
- `defaulttags.js` (3줄) 기본 태그·스탯 정의(시작값). 설정에서 고칠 수 있다. 형식은 tags.js 참고. — DEFAULT_TAG_TEXT
- `grade.js` (67줄) 카드 등급(D·C·B·A·S·EX) 규칙: 색, 태그 수, 기억 중요도 매핑, 색 파생. 순수 함수. — GRADE_COLOR, TAG_COUNT, MEMORY_LEVEL, MEMORY_LABEL, MEMORY_LIMIT
- `layout.js` (95줄) 카드 레이아웃 계산(순수). 글자 폭은 measure(text, size, family)로 받아서 브… — CARD_W, graphemes, wrap, nameMetrics, cardLayout
- `memories.js` (81줄) 기록 → 카드 기억(M0~M3) 변환, 상대 표식 처리, 원문 발췌. 순수 함수. — ROLE, prose, replaceRole, displayRole, excerptAt
- `png.js` (42줄) PNG tEXt 청크에 카드 JSON을 넣고 읽기. 순수 함수(Uint8Array). — crc32, chunk, chunks, embedCard, extractCard
- `prompt.js` (143줄) 카드 생성·연결·에셋 고르기 프롬프트와 응답 정규화. 순수 함수. — parseLoose, cardPrompt, normalizeCardResponse, LINK_MODES, linkPrompt
- `tags.js` (83줄) 카드 태그·스탯 정의 파서와 계산. 순수 함수. — parseTags, calcStats, displayStats, normalizeTags, tagCatalog

### src/engine/formats/
- `bytes.js` (15줄) — readAssetBytes
- `card.js` (359줄) — convertCharbookEntries, cardToModule, readCharx, cardToCharacter, offSpecToCharacter
- `index.js` (31줄) — readIncoming
- `png.js` (101줄) — readPngCard
- `risum.js` (46줄) — readRange, scanRisum
- `zip.js` (89줄) — readZipDirectory, readZipEntry

### src/engine/pot/
- `pot/*.js` 63개 — 리수폿 순수 로직(자동 생성, 직접 수정 금지 — tools/pot-split.mjs)

### src/ui/
- `aifix.js` (52줄) 로어북 '고칠 부분' 공유 상태 (v1.6.8): 편집기 글칸에서 고른 부분 ↔ AI 창 '고칠 부분…
- `app.js` (546줄) 
- `assets.js` (187줄) 
- `cbs.js` (80줄) 
- `codeedit.js` (514줄) 가벼운 코드 편집기: 투명한 textarea 뒤에 색을 입힌 pre를 겹쳐 VS Code처럼 보이게 …
- `color.js` (93줄) 
- `dicedetail.js` (126줄) 유저 편향 없애기 상세 (1.8.3): 홈 빠른 설정·시작 안내가 같이 쓴다. 박스 한 줄(diceR…
- `dom.js` (133줄) 
- `entrypicker.js` (73줄) 항목 고르기: 폴더 트리 + 검색 모달. 드롭다운(select) 대신 쓴다.
- `hostupdate.js` (85줄) 리스를 켤 때 새 버전이 있으면 메인 화면 오른쪽 위에 큰 알림 카드를 잠깐 띄운다 (닫기 버튼 · …
- `icons.js` (72줄) 
- `kit.js` (627줄) 
- `legacy.js` (1876줄) 
- `lookparts.js` (107줄) 꾸미기 화면과 시작 안내(2단계)가 함께 쓰는 선택 부품: 테마 묶음 · 강조 색 · 그라데이션 · …
- `lorereq-css.js` (16줄) v1.6.8 AI 창: 이번 요청에 포함할 로어북 목록 (모바일: 세로 한 줄씩, 겹침 없이, 목록 …
- `mascot-data.js` (17줄) 마스코트 루네 그림 (1.8.3). 사용자가 준 캐릭터 시트에서 잘라 webp로 줄인 것(자동 생성,…
- `mascot.js` (20줄) 마스코트 루네 (1.8.3). 빈 화면 안내·시작 안내·왼쪽 위 로고에 쓴다. 그림 자체는 masco…
- `multiselect.js` (185줄) 
- `onboarding.js` (283줄) 시작 안내 (1.8.3 목업 6): 플러그인 창을 꽉 채우는 단계별 설정. 0 환영 → 1 화면 → …
- `prefs.js` (68줄) 
- `probpick.js` (190줄) 로어북 내용에서 고른 부분을 확률로 나오게 만들기 (선택 → 🎲 버튼 → 팝업)
- `quickset.js` (90줄) 빠른 설정 묶음 (1.8.3): 홈 '빠른 설정' 카드. 채팅 입력창 옆 메뉴의 토글은 data/ch…
- `screentours.js` (76줄) 화면별 둘러보기 (v1.8.1): ? 버튼과 각 화면의 '둘러보기' 버튼이 같은 하이라이트 방식(처음…
- `sortable.js` (167줄) 마우스·펜: 줄 어디를 잡아도 5px 움직이면 끌기 시작 (클릭은 그대로 클릭).
- `staleguard.js` (24줄) 화면 그리기 경쟁 방지(v1.8.1): 탭 A를 불러오는 중에 탭 B로 가면, 늦게 끝난 A의 그리기…
- `styles.js` (1442줄) 
- `tabs.js` (91줄) 탭 목록과 설명 문구 (홈 카드·위쪽 줄·도움말이 같이 쓴다). 화면 코드 없음.
- `theme.js` (400줄) v1.6.3 UI 리뉴얼: 밝은 회백 + 코랄 포인트가 기본. 색은 전부 여기 토큰에서만 나온다.
- `themekit.js` (79줄) v1.8.3 꾸미기 카탈로그: 테마 묶음 · 강조 색 · 그라데이션 · 모양 · 글꼴. 순수 데이터라…
- `toast.js` (61줄) 리스 메인 화면 오른쪽 위에 띄우는 알림 (메인 화면 접근 권한이 있을 때만)
- `tooltip.js` (88줄) 말풍선 도움말: 마우스를 올리면(0.4초), 모바일은 길게 누르면(0.5초) title 글자를 보여 …
- `tour.js` (124줄) 처음 둘러보기: 다시 설치한 사람에게만 자동으로 뜬다. 탭을 하나씩 설명하며 해당 버튼을 강조하고,
- `undo.js` (96줄) 글 칸 되돌리기·다시 하기 (1.4.6)
- `watch.js` (386줄) 새로 가져온 봇 감지 (RisuTide 기능을 Dusk 방식으로)
- `whatsnew.js` (94줄) 업데이트 뒤 처음 열 때 "새로 바뀐 점" 창. 내용은 빌드 때 CHANGELOG.md에서 넣는다 (…

### src/ui/card/
- `preview.js` (34줄) 카드 미리보기 캔버스. 그림 에셋은 한 번만 읽어 두고, 그리기 요청은 마지막 것만 처리한다.
- `render.js` (169줄) 카드 캔버스 렌더러: 일러스트 → 밤 베일 → 등급색 프레임 → 이름·키워드·태그·대사·등급 문양.

### src/ui/screens/
- `about.js` (28줄) 정보 · 라이선스: 버전, AGPL-3.0 고지(무보증), 소스 위치, 포함된 외부 코드 목록.
- `aibuild.js` (338줄) AI로 제작 팝업(우측 하단). v1.6.7 2단계: 요청 → 수정안 카드 → 적용하면 편집기 탭에 …
- `aitab.js` (352줄) AI로 제작 탭 (v1.6.7 3단계). 봇빌더의 작업 화면을 Dusk 방식으로: 다섯 하위 화면.
- `assetdupes.js` (164줄) 중복 에셋 찾기 (1.4.6)
- `assetfix.js` (122줄) v1.8.2 도구 탭 '에셋 태그 고치기' 창. 누를 때만 동작하고, 미리보기에서 고른 것만 저장된 …
- `assetmgr.js` (1065줄) 
- `characters.js` (676줄) 
- `chareditor.js` (239줄) 
- `chattheme.js` (166줄) 채팅 테마 빌더 (v1.7.0): 도구 안의 한 곳. 만든 테마 목록 · 켜기/끄기 · 코드/파일 내…
- `cocoa.js` (14줄) 사이드바 '기억' 섹션의 코코아 탭(v1.8.1): 장기 기억·기억 카드와 같은 단계. 화면 본체는 …
- `dev.js` (618줄) 
- `devaff.js` (84줄) 개발 탭 → 봇: 호감도 HUD 기능 프리셋 카드. 설치하면 이 봇 배경 HTML에 ♡ 버튼 HUD가…
- `devtools.js` (405줄) 
- `editor.js` (2530줄) 
- `greetings.js` (203줄) 퍼스트 메시지 관리자 (v1.6.7 6단계): 첫 메시지·추가 인사말·그룹 전용 인사말이 많아도 보기…
- `history.js` (142줄) 
- `home.js` (196줄) 홈 (1.8.3 목업 1): 지금 열린 채팅 → 상태 카드(스위치·숫자) → 바로가기 작은 4칸 → …
- `homestate.js` (22줄) 홈 화면이 읽는 열린 채팅 상태(화면 코드와 분리: 무거운 import 없이 테스트하려고).
- `infocard.js` (42줄) 봇·모듈 편집기 '정보' 탭이 같이 쓰는 요약 카드·접는 카드 스타일 (v1.6.9: 모듈도 봇과 같…
- `loredusk.js` (170줄) 로어북 더스크화 창: 구분선 규칙 변환 / AI 분석(소속·장소) → [규칙 설계(조건·반복·유지·그…
- `lorelog.js` (107줄) 도구 → 로어북 로그: 응답마다 어떤 로어북이 들어갔는지
- `modlinks.js` (130줄) 모듈 연결 (v1.7.0 5단계): 전역 · 페르소나 · 캐릭터 · 지금 채팅.
- `modules.js` (708줄) 
- `newbot.js` (58줄) 새 봇 만들기 (v1.7.0 5단계): 빈 봇을 하나 추가하고 편집기를 연다. AI로 만들기는 편집기…
- `patchui.js` (136줄) 
- `peoplescreen.js` (99줄) 인물 화면 + 인물 상세 (1.7.0 4단계, 계획 §3.4): 위키의 인물 문서를 보고 다듬는다. …
- `personabuilder.js` (908줄) 페르소나 빌더 화면: 양식(프리셋)의 ### 섹션 = 폴더, * 항목 = 칸.
- `placeholder.js` (21줄) 
- `plugins.js` (633줄) 플러그인 탭 — 목록·카테고리·업데이트 확인 / DA Interop 연동 설정 / 플러그인 만들기 /…
- `pot.js` (82줄) 리수폿 화면 (1.7.0 4단계, 계획 §3.3). 기억과 완전히 따로: 자기 스위치·자기 설정. 머…
- `presets.js` (217줄) 
- `promptstab.js` (129줄) 설정 → 기억·리수폿 프롬프트 (v1.7.0): 기억·리수폿을 쓸 때 기본 규칙 뒤에 덧붙는 '내 프…
- `roulettepop.js` (64줄) 봇 편집 도구 → 룰렛: 범주별로 무작위 특징을 뽑아 복사하거나 설명 끝에 붙인다.
- `sectionhome.js` (73줄) 그룹 개요(기억·관리·작업실, 1.8.3 목업 1): 한 줄 안내 → (기억) 상태 카드 → 목록형 …
- `settings.js` (178줄) 플러그인 꾸미기 (v1.7.0 7단계, 계획 §3.12 → v1.8.3 확장): 미리보기 → 테마 묶…
- `settingstab.js` (139줄) 설정 탭 (1.8.3 목업 5): 묶음 이름 달기(화면 · 백업 · 도움말). 고급은 묶음별 한 줄 …
- `themebuilder.js` (348줄) 테마 빌더 화면: 스타일 → 대표색 → 밝기만 고르면 테마 완성. 결과는 일반 테마로 저장된다.
- `themestudio.js` (445줄) 테마 스튜디오: 계열(일반 리스/포켓리스)별 테마 편집 · 실시간 미리보기 · 적용 · 공유
- `tools.js` (400줄) 
- `updsettings.js` (76줄) 도구 → 업데이트 설정: 새 봇 자동 감지, 받은 사본 정리, 채팅 백업
- `workshoplink.js` (108줄) 봇빌더 연동 화면 (v1.8.1)

### src/ui/screens/cards/
- `index.js` (91줄) 카드 탭(기억 카드): 장기기억과 따로. 봇을 고르면 그 채팅의 기억으로 카드를 만들고, 카드 목록·…

### src/ui/screens/memory/
- `advanced.js` (149줄) 기억 탭 고급 모드: 리수폿에서 온 세부 기능(추가 프롬프트·관찰자·페르소나 이름·흐름 세부·Hypa…
- `aitools.js` (190줄) 인물 AI 도구 창(고급 모드): 전체 다시 정리 · 직접 지시 · 항목 AI 작성 · 수치 제안.
- `autotrackingbox.js` (54줄) 자동 기록·인물 추적 설정: 기억 탭에서 재사용한다. 기존 위키 화면의 설정과 저장 동작을 그대로 유…
- `botlist.js` (25줄) 
- `cards.js` (50줄) 카드 탭: 이 봇에서 만든 카드를 모아 보고, 크게 보기·PNG 저장·삭제를 한다.
- `chatload.js` (22줄) 봇의 채팅 목록. 이름·개수는 이미 읽은 캐릭터 정보에서 바로 만들고, 본문은 '지금 볼 채팅 하나'…
- `common.js` (51줄) 
- `compose.js` (243줄) 새 봇 만들기 5단계: 인물 → 범위·등급 → 카드 → 연결 → 첫 메시지·확인
- `conflictui.js` (31줄) 롤백 충돌 안내(리수폿 고급·인물 화면): '변경 비교' 창과 '그대로 두기'.
- `editor.js` (183줄) 기억 편집기 (v1.7.1, 고급 모드 전용): 저장된 기억(기록·상황·감정·기대)을 로어북 항목처럼…
- `embeddingguide.js` (21줄) 기억 탭 첫 진입 때 임베딩(의미 검색)을 한 번만 소개한다.
- `embedmodal.js` (37줄) 임베딩 설정 창: 주소·키·모델 입력, 기본 사용 토글, 연결 테스트. 키는 이 기기에만 저장된다(백…
- `fillgaps.js` (22줄) 'AI로 빈칸 채우기' 공용(리수폿·인물 화면): 비어 있는 칸이 있는 인물을 세고, 확인을 받은 뒤…
- `flowsettings.js` (167줄) 기억 탭 설정: 추적 수준 3종 · 기능 카드 6장 · AI 모델(쉬운/고급) · 가져오기·사용량.
- `folderui.js` (46줄) 인물 폴더 정리: 새 폴더 · 이름 바꾸기 · 삭제(인물은 미분류로) · 고른 인물을 폴더로 옮기기(…
- `gaugeui.js` (162줄) 인물 위키의 '게이지' 블록: 보기 · + 추가(이름+설명 → AI 설계 또는 직접) · 관리(켜기/…
- `guide.js` (18줄) 작은 ? 가이드 버튼: 누르면 그 자리를 하이라이트하며 첫 켜기 안내를 하나씩 보여 줘요(처음 둘러보…
- `hypamodal.js` (45줄) v1.8.1 HypaPlus 안내·가져오기 창. 기억 탭에 처음 들어갔을 때 HypaPlus가 감지되…
- `index.js` (23줄) 기억 탭 진입점 (1.7.0 3단계). 화면은 셋: home(기억) · detail(기록 보기) · …
- `infotab.js` (164줄) v1.8.3 인물 위키 '상세 정보' 탭(최종안): 바로가기 · 기본 성격(성향 2열) · 수치(값 …
- `ledger.js` (47줄) v1.6.2 장부 탭: 열린 항목 · 관계 변화 · 세계 시간선. 로컬 저장소일 때만 고칠 수 있다.
- `loreeditor.js` (71줄) 주입 로어 편집 (v1.7.1, 고급 모드 전용): 대화에 실제로 들어가는 [Dusk Memory] …
- `madv.js` (71줄) 기억 화면 '고급' 영역 (1.7.0 3단계). 고급 모드에서만 보인다. 자주 쓰는 것을 위에, 예전…
- `makebot.js` (24줄) 카드 → 새 봇 만들기(공용). 카드 이미지 PNG를 에셋으로 저장하고, 카드를 저장한 뒤, 봇을 추…
- `mbots.js` (43줄) 봇별 기억 (1.7.0 3단계, 계획 §3.2): 검색 · 봇마다 사용 스위치 · 눌러서 기록 보기.
- `mdetail.js` (74줄) 기록 보기 (1.8.3 목업 3): 인물 위키 · 상황 · 시간선 · 열린 항목 · 관계 중 한 번에…
- `menv.js` (16줄) 열린 봇·채팅의 기억 환경(env)을 만든다. 기록 보기·리수폿·인물 화면이 같이 쓴다 (1.7.0 …
- `mepage.js` (115줄) '나' 화면 (1.8.3): 다른 인물들이 나({{user}})를 어떻게 기억하는지 한 화면에. 인물…
- `mergeui.js` (78줄) 인물 합치기(미리보기 포함): 남길 인물과 합칠 인물을 고르면, 인물 문서가 둘 다 있을 때는 리수폿…
- `mhome.js` (204줄) 기억 화면 (1.8.3 목업 3): 상태 카드 하나(스위치·숫자 3·막대·범례) → 지난 대화 분석(…
- `modebar.js` (48줄) 기억 탭 맨 위: 장기기억 방식(저장소). 간단·고급 모드 모두에서 선택을 유지하고 바꿀 수 있다.
- `modeladv.js` (66줄) 고급 모델 설정(고급 모드): 공급자 전체 · 모델 목록 불러오기 · 온도/최대 출력/문맥/제한시간 …
- `people.js` (245줄) 
- `personv2.js` (191줄) v1.8.3 인물 위키 개편: 머리 + 탭(요약 / 관계 / 상세 정보 / 기록). 넓은 화면(@co…
- `recordsui.js` (68줄) 인물 항목 관리: 항목 직접 추가·고치기·지우기와 NPC 감정 기록(리수폿 people-records…
- `recovery.js` (53줄) 복구·실행 기록(고급 모드): Writer 원문 JSON을 붙여넣어 진단 → 고치기 → 반영(또는 강…
- `regexui.js` (28줄) v1.8.1 정규식 전처리 설정 카드: 기억 분석 입력·임베딩 질의에서 상태창 같은 군더더기를 걷어 …
- `scenes.js` (33줄) 
- `settings.js` (142줄) 
- `settingstools.js` (135줄) 기억 설정 도구(7단계 B 그룹 4): 범위 칩 · 설정 검색 · 변경 이력 10개 되돌리기 · 프리…
- `setup.js` (92줄) 처음 설정하기: 3단계(AI 고르기 → 무엇을 기억할까요 → 켜기). 읽을 글은 한 줄씩, 버튼은 크…
- `skillchat.js` (95줄) AI로 스킬 만들기(v1.8.1): 코코아 탭 우하단 버튼 → AI와 대화하며 스킬 초안을 실시간으로…
- `skills.js` (218줄) 기억 탭 → 스킬 (v1.8.1). 코코아전트 호환 스킬 세트를 가져와 정리 노트·기록하기·기억 분석…
- `trackui.js` (57줄) 추적 인물 선택(리수폿 people-tracking-ui 대응): 자동 기록을 ‘모두’로 둘지 ‘고른…
- `username.js` (35줄) 기억 화면에서 {{user}}를 지금 페르소나 이름으로 보여 준다(1.8.3, 사용자 요청). 표시만…
- `wikilog.js` (66줄) 위키 기록 관리(고급 모드): 변경 이력 되돌리기 · 자동 기록 재시도/활동 기록 삭제 · 요약 정리…
- `wikipanel.js` (42줄) 인물 페이지 ‘위키 항목 전체’(고급 모드): 위키 문서의 모든 항목(감정·관계·행동 경향·비밀 …)…
- `wikiview.js` (238줄) 인물 위키 화면: 리수폿의 배치(왼쪽 인물 목록 + 오른쪽 인물 문서)와 기능에 Dusk의 이야기 기…
- `writerui.js` (66줄) 수동 Writer(리수폿 writer-ui 대응): RP 본문을 붙여넣거나 최근 응답을 불러와 AI로…

### src/vendor/
- `fflate-full.js` (1109줄) 봇빌더(BB) v0.3.2의 번들에서 추출한 외부 라이브러리 (MIT). 라이선스: 저장소 NOTIC… — Decompress, strFromU8, strToU8, unzipSync, zipSync
- `fflate.js` (1154줄) fflate 0.8.2 (MIT, https://github.com/101arrowz/fflate) … — gzipSync, gunzipSync, deflateSync, inflateSync, zipSync
- `msgpackr.js` (2252줄) 봇빌더(BB) v0.3.2의 번들에서 추출한 외부 라이브러리 (MIT). 라이선스: 저장소 NOTIC… — unpack
- `noble.js` (877줄) 봇빌더(BB) v0.3.2의 번들에서 추출한 외부 라이브러리 (MIT). 라이선스: 저장소 NOTIC… — sha2562, gcm
- `re2js.js` (6649줄) 봇빌더(BB) v0.3.2의 번들에서 추출한 외부 라이브러리 (MIT). 라이선스: 저장소 NOTIC… — RE2JS

## Risu 플러그인 API (우리 코드가 쓰는 호출, 횟수순)
`getCharacterFromIndex`(59), `getDatabase`(40), `getChatFromIndex`(28), `getCurrentCharacterIndex`(24), `getCurrentChatIndex`(20), `setCharacterToIndex`(17), `setDatabaseLite`(16), `addRisuScriptHandler`(13), `setChatToIndex`(9), `addRisuReplacer`(7), `saveAsset`(6), `nativeFetch`(5), `toggle`(5), `registerButton`(4), `getRootDocument`(3), `hideContainer`(3), `requestPluginPermission`(2), `checkCharOrder`(2), `readImage`(2), `registerSetting`(2), `removeRisuScriptHandler`(2), `getColorScheme`(2), `showContainer`(2), `getDatabaseCached`(1), `getLocalPluginStorage`(1), `getCurrentLorebookEntries`(1), `unregisterUIPart`(1), `removeRisuReplacer`(1), `runLLMModel`(1), `ordered`(1)

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

