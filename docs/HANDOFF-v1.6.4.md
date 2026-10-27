# v1.6.4 인계 메모 (리수폿 이식)

계획: 프로젝트 문서 `claude/v1.6.4-plan.md`. 작업 브랜치: `feat/1.6.4`.

## 원본 (매번 첨부하지 않음)
- 리수폿 원본 번들은 **`ref/risupot` 브랜치**의 `risupot_v2_3_0.js` (2.1MB). main·프로젝트 동기화에는 안 들어감.
- 받기: `git fetch origin ref/risupot` → 일부만 보기: `git show origin/ref/risupot:risupot_v2_3_0.js | sed -n '시작,끝p'`
- 모듈 위치 찾기: `git show origin/ref/risupot:risupot_v2_3_0.js | grep -n '^// Source: src/'` (128개 모듈, 이름은 원본 src/*.mjs).
- 원본에서 안 가져온 것(참고만): 화면 모듈 32개(`*-ui`, `ui`, `inspector*`, `model-editor` 등), CSS·셸 HTML, 조립부 `startPlugin`(plugin 모듈 — **4단계 턴 흐름 연결 때 이 함수의 훅 등록 순서를 참고**).

## 1단계 결과 (완료)
- `tools/pot-split.mjs` (`npm run pot:split`): 번들 → 모듈 자동 분리. 한 스코프였던 최상위 선언을 스코프 분석으로 추적해 import/export를 붙인다. `// Vn` 이력 주석 제거, 파일 머리에 출처 한 줄.
  - 순환 import 안에서 최상위 실행 중 상대 값을 쓰는 선언은 `<모듈>-shared.js`로 옮김(현재 `information-continuity-shared.js` 1개).
  - 생성 파일은 **직접 고치지 말 것**. 리수폿이 업데이트되면 ref 브랜치 파일을 바꾸고 다시 실행. Dusk 쪽 수정은 생성 파일 밖(어댑터)에서.
  - 의존: `acorn`, `eslint-scope`(devDependencies). 샌드박스에서 npm이 막히면 `/opt/npm-tools/node_modules/acorn`, `/opt/node-tools/node_modules/eslint-scope`를 `node_modules/`에 링크.
- `src/engine/pot/` 63개 순수 로직, `src/data/pot/` 33개 입출력(저장소·모델 클라이언트·훅·추적), `src/data/pot/prompts.json`(프롬프트 라이브러리 256KB), `MANIFEST.json`(분류 목록).
  - 호스트 접근은 원본처럼 전부 주입식(인자로 받은 api/doc). 아직 `main.js`에 연결 안 함 → 빌드 결과 변화 없음. esbuild 묶음 시험: 코드 약 591KB + 프롬프트 256KB.
- `tests/pot-port.test.js` 대조 테스트 9개: 원본 번들을 같은 realm에서 실행해 최상위 선언을 꺼내고
  ① 이름 누락 없음 ② 상수 값 동일 ③ 함수 본문 동일(이력 주석만 차이) ④ 엔진 함수 전부 × 블루 아카이브 예제 입력 13종 결과·오류 동일(난수·시각·UUID 고정) ⑤ 유우카·코유키 인물 위키 생성·수정·병합 계획 ⑥ 월경·임신 상태 전이 ⑦ 말투 다변화·CBS 판정 ⑧ 프롬프트 동일 ⑨ 분리 도구 결과 최신. 원본이 없으면 건너뜀.
- `node --test` 149개 통과.

## 2단계 결과 (완료)
- `src/data/memorystore3.js` (`createMemoryStoreV3`): v2와 같은 메서드(getIndex·updateIndex·getFolder·updateFolder·deleteFolder·deleteBot·resetAll·migrate·serial) + `getWiki`·`botFolders`·`botPeople`·`importPot`. 키 `dusk.mem.v3.index` / `dusk.mem.v3.f.<folderId>`. `src/data/memory.js`가 이 저장소를 쓰도록 교체(다른 코드 변경 없음).
- 폴더 v3 = v2 폴더 + `wiki`(리수폿 채팅별 위키 상태, 없으면 null). 채팅 범위는 기존 `folderIdOf(chaId, chatId)` 그대로 — 리수폿 `characterId·chatKey`와 대응. 인덱스 v3 = v2 + `pot: { settings, importedAt, sources }`(리수폿 설정 원본 보관, 정규화는 3단계).
- 이전(`migrate`): v2 → v3 자동(v2 키는 지우지 않음, 인덱스를 마지막에 써서 중간에 끊겨도 재시도), v2가 없으면 v1 → v3 직접. 이미 v3면 0.
- 리수폿 가져오기(`importPot`): `risupot-backup`·`risupot-full-backup`·`risupot-settings-preset`·저장소 덤프(`risupot.*` 키 모음) 지원. 위키는 revision이 더 높을 때만 덮어씀(`force`로 강제), 설정은 비어 있을 때만 채움. **인증 키(localProviderKeys·risupot.provider-keys)는 받지 않음**(`keysIgnored`로 알림). 순수 변환: `src/engine/memoryv3.js`(`parsePotBundle`·`botPeople` 등).
- 봇 전체 보기: `botPeople(chaId)`가 채팅별 폴더 인물을 이름으로 합치고 기록마다 `chatId`를 붙임.
- 시험: `tests/memorystore3.test.js` 6개. `node --test` 155개 전부 통과(원본 대조 9개 포함 — `git fetch origin ref/risupot` 뒤 `git update-ref refs/remotes/origin/ref/risupot FETCH_HEAD`, acorn·eslint-scope 링크 필요).
- 아직 화면에 연결 안 함(가져오기 버튼은 5·6단계). 위키 갱신·주입은 4단계.

## 3단계 결과 (완료)
- `tools/pot-split.mjs`에 `PUBLIC` 목록 추가(LocalKeyStore·LlmClientError·testModelConnection·providerModelList·copilotLoginStep을 항상 export) → `npm run pot:split` 재생성(바뀐 것 2개).
- `src/engine/modelcfg.js`(순수): 설정 `{v:1, easy:{kind:"risuai"|"api",presetId}, presets:[{id,name,preset}], stages:{router|director|writer:{mode:"shared"|"dedicated",presetId}}}`, `pickFor(cfg, stage)` → `{mode:"custom",presetId}` 또는 null(=리스 보조 모델), `toPrompt/fromReply`(글 작업은 `{"text":…}`로 감싸 벗김 — 리수폿 클라이언트가 항상 JSON 하나만 요구하기 때문), 토큰 사용량 누적(`addUsage`).
- `src/data/modelhub.js`: 저장 `dusk.models.v1`(프리셋·단계), 키는 `LocalKeyStore`(플러그인 로컬 저장소 `risupot.provider-keys`, 일반 설정·백업·공유 코드에 안 들어감), 사용량 `dusk.models.usage.v1`(1.5초 묶음 저장). `runAI`가 `pick.mode==="custom"`이면 `setCustomRunner`로 등록된 실행기(→ `callWriterModel`)로 보냄 → **기존 호출처는 pick만 바꾸면 내 API를 쓴다**. 공개 함수: `getCfg/saveCfg/keyStore/pickForStage/getUsage/resetUsage/testPreset/listModels/copilotLogin`. `main.js`에서 import로 등록.
- 시험 `tests/modelhub.test.js` 6개(설정·프롬프트 감싸기·사용량·OpenAI 형식 호출 헤더/키 비저장/사용량·리스 보조 모델 프리셋·연결 시험). `node --test` 161개 통과, 빌드 1802KB.
- 아직 안 한 것(5·6단계 화면): 모델 설정 화면(쉬운 모드/단계별), 기존 AI 프리셋(페르소나 빌더 DPA1)과 UI 통합 — 지금은 pick 객체만 연결. 공유 코드는 키 미포함. 호출처가 `pick.stage`를 넘기면 단계별 사용량이 쌓임(4단계 턴 흐름에서 지정).
- 실호출 확인: 가짜 api로 OpenAI 형식·리스 보조 모델 경로 확인함. **실제 리스에서 OpenAI 키·보조 모델 실호출은 5단계 화면이 생긴 뒤 같이 시험**.

## 4단계 결과 (완료)
- **연결 방식**: 리수폿 컨트롤러(`WikiController`·`AutoWikiController`·`MainWikiHook`·`RuntimeHookManager`)를 그대로 쓰고, Dusk 쪽은 어댑터로 붙임. `src/data/memoryturn.js`(`createTurnFlow`)가 `createMemory(api,{potLibrary})`에서 만들어져 `memory.flow`로 노출. 설정 `index.settings.flow = {on:false, mode:"fast"|"accurate", recallTokens:700}`(기본 꺼짐 → 켜지 않으면 v1.6.2 경로 그대로). `flow.apply()`가 켜기/끄기/모드 전환, 켜면 Dusk 주입 훅을 내리고 **요청 직전 훅 하나**(위키→Dusk 블록)로 합침.
- **저장소 어댑터** `src/data/potstorage.js`: 리수폿이 쓰는 pluginStorage 모양을 v3 저장소에 연결(설정→`pot.settings`, 카탈로그→`pot.catalog`, 채팅별 위키→폴더 `.wiki`, 그 밖은 실제 pluginStorage). 인증 키는 거치지 않음.
- **회상(Recall)** `src/engine/recall.js`: 고른 인물의 Dusk 기록을 점수(등급 가중치×강화×키워드×열린 항목)로 골라 `mergeMemory`로 정리 노트(Director)의 장기기억 참고(`source:"dusk"`)에 합침. 요청 직전 `[Dusk Memory]` 블록은 `focus`(고른 인물)를 받아 장면에 없어도 그 인물 기록을 넣음(`injector.beforeRequest(out,type,{focus})`).
- **기록 합치기** `src/engine/duskwriter.js`: 리수폿 Writer 프롬프트 끝에 `# Dusk Memory Section`을 덧붙여 응답 JSON에 `dusk` 키를 같이 받음 → `splitDusk`로 떼고 `checkDusk`(기존 `validate`)로 **구획별 따로 검증**. 통과분은 `memoryturn`의 stash에 보관, `memoryrunner.analyzeAt`이 `link.take(h)`로 가져가 호출 없이 저장(`session.combined`). dusk가 없거나 깨지면 러너가 기존 방식으로 따로 1회 호출. 리수폿 쪽이 틀려도 dusk 구획은 저장(반대도 동일). 러너는 `link.settle`로 리수폿 Writer가 끝나길 기다림.
- **러너 리팩터** `memoryrunner.js`: `gather/gate/inputOf/prepareLatest` 분리, 동작 동일.
- **리수폿 원본 패치(고정 3곳)** `tools/pot-patches.json` → `pot-split.mjs`가 생성 때 적용(문자열 정확 일치, 안 맞으면 생성 중단): Director 장기기억 참고 합치기 훅(`this.mergeRecall`), Router·Director 호출을 `this.llmCall`(Dusk 모델 허브·사용량 집계)로. 훅이 비면 원본과 동일 동작. `PUBLIC` 목록에 `SettingsStore·WikiController·AutoWikiController·MainWikiHook·RuntimeTraceStore·WriterController·RuntimeHookManager` 추가. `pot-port.test.js`는 패치 반영분만 허용하도록 조정.
- **리롤**: 리수폿 자체 롤백 + Dusk 앵커 정합성(고아 처리) 그대로 — 같은 자리 응답이 바뀌면 이전 응답분 위키·기록이 함께 정리됨(시험 있음).
- **시험** `tests/memoryturn.test.js` 11개(블루 아카이브 10턴: 빠른 모드 응답마다 모델 호출 1회·위키+Dusk 동시 축적, 요청 직전 위키 참고+Dusk 블록 1회씩, 정확하게 모드의 고르기·정리 노트·회상 합류, Dusk 구획 없음/깨짐/리수폿 쪽 오류 독립, 리롤, 저장소 어댑터), `tests/recall.test.js`. `node --test` 182개 통과, 빌드 2.5MB(번들 2653KB).
- **시험 하네스 주의**: 리수폿 Main 훅은 요청에 "직전 AI 응답이 들어 있거나 비시스템 메시지 3개 이상"이어야 본 요청으로 인정함 → 시험의 가짜 요청에 최근 대화를 같이 넣어야 함. 가짜 Writer는 검토 대상 문서마다 `no_canonical_change`를 내야 함(계약).
- **아직 안 한 것(5단계 이후)**: 설정 화면(켜기 스위치·빠른/정확하게·모델), 홈 진행 점 5개, 인물 페이지 통합 타임라인, 리수폿 가져오기 버튼, 월경·임신 날짜 공유(세계 시간선) — 엔진은 이식돼 있으나 `storyDateFromText` → Dusk 시간선 연결은 5~6단계에서. **실제 리스에서의 실호출 시험은 5단계 화면 뒤**(지금은 켜는 UI가 없고 `index.settings.flow.on` 직접 설정 + `memory.flow.apply()`로만 켬).

## 5단계 결과 (완료, 2026-10-28)
- **홈** `ui/screens/memory/home.js`: 켜기 스위치(`index.settings.flow.on` + `memory.flow.apply()`), 상태 문구, 진행 점 5개(`engine/flowsteps.js`), 최근 기록 3줄, ‘처음 설정하기/설정 열기’(지금은 설정 폴드만 엶 — 3단계 마법사는 6단계). 저장소가 로컬이 아니면 스위치 비활성+이유 표시.
- **설정** `ui/screens/memory/flowsettings.js` (설정 폴드 맨 위, 기존 Dusk 설정은 ‘고급: 기록·주입 세부 설정’ 안으로): 추적 수준 3종(가볍게/기본/전부, `engine/trackpreset.js`) · 기능 카드 6장(스위치·요약·세부·기본값으로·의존 안내) · 기억 방식(빠르게/더 정확하게) · AI 모델(리스 보조 모델/내 API, 연결 시험, 고급: 단계별 모델·삭제) · 토큰 사용량 · 리수폿 데이터 가져오기. 바로 저장, 저장 버튼 없음. 리수폿 설정은 `memory.flow.settings()`(켜져 있으면 실행 중 SettingsStore, 꺼져 있으면 따로 읽은 것)로 읽고 쓴다.
- **인물 페이지** `people.js`+`engine/personview.js`: 위키 문서(이름·별칭 일치) ‘지금 상태’ 카드(호감·의심·마음 열기 막대, 관계·호칭·현재·말투 글; 막대를 누르면 ‘상태’ 줄로 걸러 봄) + 사건·관계·상태(위키 이력)·약속을 한 타임라인으로 합침, 칩(전부·사건·관계·상태·약속). 사건 줄은 기존 편집 메뉴 그대로.
- 시험 `tests/memoryscreen.test.js` 6개, 전체 188(9 건너뜀=ref 브랜치 없음) 통과. 화면은 스크린샷으로 확인(가짜 api 하네스는 저장소에 두지 않음).
- **아직 안 한 것**: 범위 칩(이 봇/모든 봇/이 채팅)·설정 검색·되돌리기 이력·프리셋 공유·채팅 헤더 팝오버·다음 턴 미리보기(계획서 12절), 크레딧 카드(8절), 월경·임신 UI·날짜 공유(11절), 성인 항목 접기, 인물 페이지 ✎📌⏸ 편집, 장부·상황 탭과 위키 관계 합치기. **실제 리스에서 켜기·모델 실호출 시험은 아직** — 6단계 전에 사용자가 한 번 켜 보면 좋음.

## 5단계 추가: 카드 탭 분리 (2026-10-28)
- 새 최상위 탭 `cards`(‘기억 카드’, `ui/screens/cards/index.js`, 홈 카드·더보기 메뉴에 등록). 왼쪽: 카드 설정 폴드(`cardSettings`, settings.js에서 export) + 봇 목록, 오른쪽: 봇·채팅 고르기 → ‘만든 카드’(`memory/cards.js`) / ‘새 카드·새 봇 만들기’(`memory/compose.js`). 봇·채팅 선택(`m.botId`·`m.chatIndex`)은 기억 탭과 공유, 카드 탭 상태는 `m.ctab`.
- 기억 탭 봇 화면에서 카드·새 봇 만들기 탭과 카드 설정을 뺌. 인물 페이지·상황의 ‘새 봇 만들기’ 버튼은 `m.compose`를 채우고 `ctx.go("cards")`로 넘김. 저장소는 원래 분리돼 있어 변경 없음.

## 4단계(턴 흐름)에서 볼 곳
- 원본 `startPlugin`(ref 브랜치 plugin 모듈)의 훅 등록 순서, `src/data/pot/router-runtime.js`·`director-runtime.js`·`writer-controller.js`·`runtime-hooks.js`, Dusk 쪽 `src/data/memoryrunner.js`(runAI 호출). 단계 호출은 `pickForStage(api,"router"|"director"|"writer")` 결과에 `stage`를 붙여 `runAI`로.

## (참고) 2단계에서 보던 곳
- 리수폿 저장 형식: `src/data/pot/wiki-store.js`, `src/engine/pot/chat-scope.js`(채팅 범위 키), `src/engine/pot/settings.js`(설정·봇별 기능 세트 `featureSettingsFor`), `src/engine/pot/people-folders.js`·`people-pins.js`.
- Dusk 기존 저장소: `src/data/memorystore.js`(v2 키·직렬 쓰기 큐).

## 6단계 결과 (완료, 2026-10-28)
- **처음 설정하기 마법사** `ui/screens/memory/setup.js`(`openSetup`): 3단계(AI 고르기 → 무엇을 기억할까요 → 켜기), 단계 점·이전/나중에. 끝에서 모델 설정·추적 수준·`flow {on,mode,setupDone}` 저장 후 `flow.apply()`. 리수폿 동시 설치면 ‘가져온 뒤 끄기’ 안내.
- **설정 0개로 켜기** `engine/firstrun.js`: 홈 스위치를 처음 켤 때(`setupDone` 없음) 켜진 기능이 없으면 ‘기본’ 수준을 적용(`firstRunFeatures`). 이미 정한 설정은 그대로.
- 홈: 꺼져 있을 때 ‘처음 설정하기’ → 마법사, 켜져 있으면 ‘설정 열기’. 둘러보기에 장기 기억·기억 카드 문구 갱신.
- 용어: 사용자 화면은 이미 ‘관련 인물 고르기·정리 노트·기록하기’ 사용(Router 등은 고급 단계별 모델 옆 괄호만).
- 시험 `tests/firstrun.test.js` 4개, 전체 192(9 건너뜀) 통과, 빌드 2.5MB.
- **아직 안 한 것**: 크레딧 카드, 범위 칩·설정 검색·되돌리기·프리셋 공유, 월경·임신 UI/날짜 공유, 인물 ✎📌⏸, 실제 리스 시험(마법사로 켜 보기).
- **6단계 추가(가이드 ? 버튼)**: `engine/memoryguide.js`(글)·`ui/screens/memory/guide.js`(`guideBtn`/`showGuide`). 홈 제목·설정 3섹션(무엇을 기억/기억 방식/AI 모델)·인물 페이지 제목 옆 작은 ?. 홈 가이드에서 ‘처음 설정 다시 보기’로 마법사 재실행. 장기 기억 탭 ? 도움말 문구도 갱신. 전체 193(9 건너뜀) 통과.
