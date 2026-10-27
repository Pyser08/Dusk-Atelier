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

## ★ 7단계 확정 범위 (2026-10-28, 사용자 지시: 미뤄 둔 것 전부 7단계에서 일괄 진행)
**크레딧(설정 탭, 리스타이드 크레딧 바로 아래, 계획서 8절)**
- 카드 2장: **risupot**(인물 위키·모델 계층·프롬프트) · **Arcana Card**(카드). 각 카드 = 이름 + 한 줄 설명 + ‘허락받아 이식했어요’ + ‘원문 글 보기’ 버튼(새 탭).
- **원작자 이름은 적지 않는다**(사용자 지시). 링크: risupot https://arca.live/b/characterai/185024906 · Arcana Card https://arca.live/b/characterai/185793481
- 애니메이션: 진입 시 위에서 아래로 떠오름(0.08초 간격), 테두리 실 흐름(RisuTide→Arcana→risupot 한 줄 실), 호버 들림·빛, 숨쉬는 SVG 아이콘, 동작 줄이기면 전부 끔(transform·opacity만). 설정 > 정보에 이식 범위 표기.
**5단계에서 미룬 것**
- 범위 칩(이 봇/모든 봇/이 채팅) · 설정 검색창 · 설정 변경 이력 10개 되돌리기 · 프리셋 공유(코드 내보내기/붙여넣기) · 채팅 헤더 ‘이 채팅’ 팝오버(추적 인물·페르소나 이름·관찰자·이 채팅 프롬프트) · ‘다음 턴에 이렇게 들어가요’ 주입 미리보기(토큰 수)
- 월경·임신(11절): 설정>고급>성인 항목 접기(스위치+배수 슬라이더), 인물 페이지 월경·임신 줄(켜짐+성인 여성만), `storyDateFromText` → Dusk 세계 시간선 날짜 공유, 출산 등 높은 등급은 Dusk 기록으로도, 리롤 시 임신 굴림 롤백 시험, 계획서 11절 6항 테스트
- 인물 페이지 ✎(직접 수정)·📌(고정)·⏸(이 인물만 추적 끄기), 장부·상황 탭과 위키 관계·감정 합치기
**원래 7단계**: 탭 진입 속도(DOM 보존 규칙), CHANGELOG·GUIDE·소스맵·아카 글(시리즈 박스 5편 규칙), `node --test` 전부 통과, 실제 리스 시험(마법사로 켜기·내 API 실호출·리롤).
**권장 진행 순서**: ① 크레딧 → ② 월경·임신+날짜 공유 → ③ 인물 ✎📌⏸·장부 합치기 → ④ 범위 칩·검색·되돌리기·공유·팝오버·미리보기 → ⑤ 최적화·문서. 한 챗에 다 넣기엔 크므로 ①~③ / ④~⑤ 두 챗으로 나누는 것을 권장(사용량 절약).

## 7단계 A 결과 (①~③, 2026-10-28) — feat/1.6.4
- **번들은 아직 재빌드 전**: 이 세션에서 `npm install`이 프록시 정책(403)으로 막혀 `npm run build`를 못 했다. 소스·시험(`node --test`)만 확인. 새 챗/PC에서 `npm install && npm run build` 후 `dusk_atelier.js` 커밋 필요. `package.json` version은 아직 1.6.3.
- **① 크레딧**: `ui/screens/tools.js` `creditCards()` — 리스타이드 크레딧(코드상 도구 탭) 바로 아래에 risupot·Arcana Card 카드 2장(원작자 이름 없이 링크만, '허락받아 이식했어요'). 스타일 `.rb-credit*`(진입 떠오름 0.08초 간격·실 테두리·호버·숨쉬는 아이콘, 동작 줄이기 시 끔). 설정 탭으로 옮길지는 사용자 결정 대기. ‘설정 > 정보 이식 범위 표기’는 아직 안 함.
- **② 월경·임신**: 설정 화면 `flowsettings.js`에 ‘고급 > 성인 항목(접힘, 기본 꺼짐)’ 신설 — 욕구 기록·월경·임신 스위치 + 임신 확률 슬라이더(0.5~3), 기능 카드(마음 열기) 안에 있던 토글은 제거. 인물 페이지 `월경·임신` 줄은 `env.cycleOn`(기능 켜짐+욕구 기록 켜짐) + 위키에 구획이 있을 때만(`personview.cycleOf`). 
  - **날짜 공유**: `engine/storydate.js`(`storyDateOf`·`mergeWhen`·`latestStoryIso`). 리수폿 `storyDateFromText`를 `pot/cycle-tracking.js`에서 export(+`tools/pot-split.mjs` PUBLIC 추가)해 Dusk 러너 입력에 `storyDate`로 넣고, 분석 프롬프트에 “날짜는 프로그램이 뽑았으니 추측 금지” 규칙 추가. `applyAnalysis(…, {storyDate})`가 상황에 `iso`를 저장하고 `when`을 합쳐 세계 시간선에 반영.
  - **높은 등급 사건**: `engine/cyclememo.js` — 출산(EX)·임신 확인(S)만 Dusk 기록으로 남김(수정=본인이 모르는 사실은 기록 안 함). `data/memoryturn.js`가 Writer 호출 전 상태를 저장→`link.settle` 뒤 비교→`link.takeCycle()`→러너가 `addMilestones`.
  - 시험 `tests/cyclememo.test.js`(날짜 없는 턴·연도 없는 날짜·역행/1년 초과·출산 +6주·배수 경계·리롤 결정성 등).
- **③ 인물 ✎📌⏸ + 합치기**: `engine/personedit.js`(순수) + `people.js` 연결. ✎=위키 절 본문 직접 수정(고정 항목은 거절), 📌=절·수치 고정(`people.pins`), ⏸=봇 제외 이름 목록에 넣어 **Dusk 사건 기록만** 쉼(위키 수치는 계속 갱신될 수 있음, 안내 문구 있음). 로컬 저장소·스냅샷 아님일 때만 표시. 장부 ‘관계’ 탭에 위키 ‘현재 관계’ 한 줄, 상황 탭 ‘현재 상황’ 카드에 인물별 위키 ‘지금 상태’ 한 줄 합침(`personview.wikiNote`).
  - **버그 수정**: `findDoc`이 `documents`를 배열로만 가정해 실제 위키 범위(객체)에서 인물 페이지가 깨질 수 있었음 → `Object.values`로 수정.
  - 시험 `tests/personedit.test.js` 5개(실제 위키 스키마로 수정·고정 충돌·없는 항목·⏸).
- 전체 `node --test`: 211개 중 202 통과, 실패 0(9 건너뜀).
- **아직 안 한 것(7단계 B)**: 수치 ✎(manuallySetMetric은 정책 필요), 범위 칩·설정 검색·되돌리기 10개·프리셋 공유·‘이 채팅’ 팝오버·주입 미리보기, 위키 감정(NPC emotion)·관계 수치까지 장부와 완전 합치기, 최적화(DOM 보존)·CHANGELOG·GUIDE·소스맵·아카 글, 실제 리스 시험(월경·임신 포함).

## ★ 7단계 B 첫 작업 (사용자 지시 2026-10-28): 리수폿 기능 전부 가져왔는지 대조
- **목표**: 7-B를 끝내면 리수폿 기능이 빠짐없이 Dusk에 있어야 한다. 진행 전에 먼저 대조표를 만든다.
- **방법**: ① `ref/risupot` 브랜치(리수폿 2.3.0)의 UI·설정·명령 목록을 뽑는다(`git fetch --depth=1 origin ref/risupot`, 화면 모듈과 설정 키 `SettingsStore` 기본값, 인물·관리·진단·프롬프트 관련 버튼). ② `src/ui/screens/memory/*`·`engine/pot/*`·`data/pot/*`와 하나씩 짝지어 표로 쓴다: 리수폿 기능 | Dusk 진입 화면 | 상태(있음/엔진만 있고 화면 없음/없음). ③ ‘엔진만 있음·없음’은 7-B 범위에 넣어 구현하거나, 일부러 뺀 것이면 이유를 적고 사용자에게 확인.
- **특히 확인할 것**: 추가 프롬프트 편집(custom-prompts)·프롬프트 초기화, 인물 AI 다시 정리(person-thorough-refresh)·인물 합치기(person-merge)·people-command, 관찰자 모드(observer-mode)·페르소나 이름, 백업·정리·진단·토큰 사용량(설정 5번 ‘관리’), 고아 기록 정리(orphan-cleanup), PDF 참고(pdf-reference), 원문 확인(source-check), 주기 외 성인 항목(욕구·성향·묘사 수위), 수치 직접 수정(manuallySetMetric, 정책 필요), 모델 수정 이력(revision).
- **끝난 뒤**: 대조표를 이 문서에 붙이고, 빠진 것이 없다고 사용자에게 보고한다.
- **Hypa는 가져오지 않는 게 의도(사용자 확인 2026-10-28)**: 리스 기본 메모리(Hypa/Hypa+)는 Dusk 장기기억 플러그인이 대체한다. 대조표에서 Hypa 참고(hypa-reference)와 계획서 2절의 ‘Hypa 참고는 선택 사항으로 유지’는 **의도적 제외**로 표시한다. 단, 이미 이식된 `engine/pot/hypa-reference.js`·설정 옵션·화면 문구(“리스 기본 메모리”)가 있다면 지울지/숨길지 7-B에서 사용자에게 확인한다.
- **Hypa 끄기 적용(2026-10-28)**: `data/memoryturn.js` `syncPot`이 흐름을 켤 때마다 `hypaReferenceEnabled`·`hypaPlusReferenceEnabled`를 false로 강제(생성 파일 settings.js는 건드리지 않음). 화면은 원래 없음. 시험 `memoryturn.test.js` 마지막. 나중에 Hypa 화면을 만들면 이 강제를 설정값 존중으로 바꿀 것.

## 7-B 대조표 (2026-10-28, 리수폿 2.3.0 UI 모듈 ↔ Dusk 화면)
방법: 원본 `// Source: src/*-ui.mjs`(약 35개) 화면 문구를 뽑아 `src/ui/screens/memory/*`와 짝지음. 상태: ✅ 있음 · 🟡 일부 · 🔧 엔진만(화면 없음) · ⛔ 의도적 제외.
엔진 쪽(`engine/pot`·`data/pot`)은 전부 이식돼 있고 `M.flow.settings()`(설정 저장소)로 값이 흐르므로, 🔧는 화면만 만들면 됨.

| # | 리수폿 기능(원본 모듈) | Dusk 위치 | 상태 |
|---|---|---|---|
| 1 | 전원·추적 수준·6기능 카드(호감·말투·인지·의심·개방·리듬) `ui` | 설정 > 기능 카드 | ✅ |
| 2 | 수치 모드·계산 정책·증감 승수 `ui` | 호감 카드 ‘폭’만 | 🟡 |
| 3 | 관계만 모드·인식 모드 `ui` | 인식 3단계만 | 🟡 |
| 4 | 모델 설정: 공급자·모델·키·연결 시험·단계별 `model-editor` | 설정 > AI 모델 | ✅ |
| 5 | 모델 고급: 모델 목록 불러오기·호출 제한시간·추가 JSON body·reasoning·PDF 전송 방식·Copilot/GitHub 인증·Vertex 서비스계정·키 복사 | 없음(엔진 `llm-client`·`copilot-client`·`vertex-client`) | 🔧 |
| 6 | Router 모드 빠름/정확 `flow-ui` | 설정 > 기억 방식 | ✅ |
| 7 | Director 역할(연출 지시/사실만) · 이전 완료 턴·최근 메시지 수(stage-context) · Writer 입력 예산 · 본문 변경 검사 · 검색 한정 키워드(이 봇/공통) `flow-ui` | 없음 | 🔧 |
| 8 | 리스 보조모델 일괄 사용 · 단계별 전용 모델 `flow-ui` | 설정 > AI 모델 | ✅ |
| 9 | 추가 프롬프트(전체/봇/채팅 범위, 3단계별) `custom-prompts-ui` | 없음(엔진 `custom-prompts`) | 🔧 |
| 10 | 관찰자 모드 · 페르소나 이름 지정/자동 조회 `persona-name-ui` | 없음(엔진 `observer-mode`·`persona-name`) | 🔧 |
| 11 | AI 참고 설정(최근 대화 턴·기억 참조 개수) `manual-ai-settings-ui` | 없음 | 🔧 (Hypa 부분은 ⛔) |
| 12 | Hypa·Hypa+ 참고 | 일부러 안 만듦, `syncPot`이 항상 끔 | ⛔ |
| 13 | 관계 이력 보관 개수 `record-retention-ui` | 없음(Dusk ‘인물당 기록 상한’은 별개) | 🔧 |
| 14 | 인물 목록 폴더 분류(새 폴더·미분류·정리) `people-folders-ui` | 인물 카드 그리드(검색·정렬) | 🟡 |
| 15 | 자동 추적 인물 선택(N명만) `people-tracking-ui` | 인물 ⏸(이 인물만 끔) | 🟡 |
| 16 | 인물 후보 찾기·로어북 선택 분석·수동 새 인물 seed `people-lore-selector-ui`·`people-ui` | 없음(엔진 `people-lore-selector`·`people-import`) | 🔧 |
| 17 | 인물 항목 직접 추가·편집·삭제 `people-records-ui`·`people-field-ui` | 인물 ✎(절 본문 수정) | 🟡 |
| 18 | 항목별 AI 작성(Writer) `people-field-ui`·`people-metric-ai-ui` | 없음 | 🔧 |
| 19 | 수치 직접 편집(호감·의심·음란·첫인상) `people-entry-editor`·`people-metrics-ui` | 없음(`manuallySetMetric` 정책 필요) | 🔧 |
| 20 | 장기 변화 후보(증거·승인/거부) `people-candidate-ui`·`people-patterns-ui` | 없음 | 🔧 |
| 21 | NPC 감정 기록 `npc-emotion-ui` | 위키 ‘지금 상태’ 한 줄만 | 🟡 |
| 22 | 인물 고정(📌) `people-ui` | 인물 📌 | ✅ |
| 23 | 인물 통합(미리보기·항목별 선택·통합 전 백업) `person-merge-ui` | 인물 합치기(별칭 병합) | 🟡 |
| 24 | 인물 AI 다시 정리(구역 선택·꼼꼼 전체 작성) `person-refresh-ui` | 없음(엔진 `person-refresh`·`person-thorough-refresh`) | 🔧 |
| 25 | 직접 지시로 변경안 만들기 `people-command-ui` | 없음(엔진 `people-command`) | 🔧 |
| 26 | 위키 문서 화면: 변경 이력 복원·자동 기록 재시도·활동 기록 삭제·요약 정리 `wiki-ui` | 인물 페이지 + 고급 > 위키 기록 관리 | ✅(요약 정리·이력·재시도) |
| 27 | 수동 Writer: RP 본문 붙여넣어 분석·변경안 검토 `writer-ui` | 지난 대화 분석·마지막 응답만 분석 | 🟡 |
| 28 | 복구: JSON 붙여넣어 강제 반영 `writer-recovery-ui` | 고급 > 복구·실행 기록 | ✅ |
| 29 | 실행 기록 검사기·단계별 재시도·삭제 `inspector`·`inspector-records` | ‘마지막 요청에 들어간 기억 보기’·진단 줄 | 🟡 |
| 30 | 데이터 가져오기 | 설정 > 가져오기 | ✅ |
| 31 | 내보내기·전체 백업·프리셋 공유 `flow-ui` | 고급 > 설정 내보내기·가져오기·프리셋 코드 | ✅ |
| 32 | 고아 기록 정리 · 기억 초기화 | 설정 | ✅ |
| 33 | 토큰 사용량(합계) | 설정 > AI 모델 | ✅ (단계별 표시 없음 🟡) |
| 34 | PDF 참고·PDF 전송 `pdf-reference` | 설정 > 모델 고급 ‘PDF 전송’ | ✅ |
| 35 | 원문 확인(source-check) | 고급 > 본문 변경 검사 스위치 | ✅ |
| 36 | 성인: 욕구 · 월경·임신 | 설정 > 고급 > 성인 항목 | ✅ |
| 37 | 성인: 이상성욕·묘사 수위·성적 태도 항목 | 없음 | 🔧 |
| 38 | 인물 프로필 기능·NPC 간 상호작용 기록 스위치 | 없음 | 🔧 |

**결론**: ✅ 9 · 🟡 12 · 🔧 17 · ⛔ 1(+11의 Hypa 부분). ‘리수폿 기능 전부 사용 가능’ 목표엔 🔧·🟡 화면이 필요. 아래 묶음으로 7-B를 나눠 진행 제안.
**제안 묶음**: ⓐ 설정 화면(7·9·10·11·13·31·37·38, 한 곳 ‘고급’ 접기) → ⓑ 인물 화면(17·18·19·20·21·23·24·25) → ⓒ 모델 고급·위키/복구/검사기(5·26·28·29·34·35) → ⓓ 범위 칩·검색·되돌리기·공유·팝오버·미리보기 → ⓔ 최적화·CHANGELOG·GUIDE·소스맵·아카 글·빌드.
**사용자 확인 필요**: 19(수치 직접 편집 정책: 고정핀과 충돌 시 거절/덮어쓰기), 5(Copilot·Vertex 인증까지 이식할지 — 일반 사용자에겐 무거움), 34(PDF 참고 필요 여부), 12(Hypa 설정값 코드 정리 여부).

## 7-B 진행 결과 — 그룹 3 나머지 · 그룹 4 (2026-10-28)
- **기록 정정**: ⓐ(설정 고급)·ⓑ(인물 AI 도구)·ⓒ 앞부분(모델 고급 `modeladv.js`·위키 항목 `wikipanel.js`·복구/실행 기록 `recovery.js`)은 코드에 이미 있었으나 이 문서에 결과가 적혀 있지 않았다. 이번에 코드로 확인해 대조표를 고침.
- **ⓒ 나머지** `ui/screens/memory/wikilog.js`(고급 모드 ‘위키 기록 관리’): 변경 이력 되돌리기·이력 지우기(26), 자동 기록 재시도·실패 기록/활동 기록 지우기(26·29), 인물 문서 요약 정리(26, `SummaryController`를 `pot-split` PUBLIC에 추가해 export, `memorytools.js`에 `summary` 추가). 34(PDF 전송 방식)는 `modeladv.js`, 35(원문 확인 스위치)는 `advanced.js`에 이미 있어 ✅로 정정. 29의 ‘실행 기록 한 건 다시 실행’은 재생 입력이 세션 메모리에만 있어 못 옮김(실행 기록 보기·삭제와 자동 기록 재시도로 대체) → 🟡.
- **ⓓ** `engine/settingsutil.js`(순수, 시험 `settingsutil.test.js`) + `ui/screens/memory/settingstools.js`:
  - 범위 칩(모든 봇/이 봇/이 채팅) — 설정 섹션 제목 옆. 추가 프롬프트·초기화는 항목마다 범위가 달라 칩 없음.
  - 설정 검색창 — 전체 설정 폴드 위. 화면이 다시 그려져도 검색어 유지(MutationObserver).
  - 설정 변경 이력 10개 되돌리기 — 화면에서 바꾼 것만 기록(`tracked()`로 감싼 기억 흐름 설정 + Dusk 기록·주입 설정 `save`). 바뀐 큰 항목의 이전 값만 저장, **모델·API 키 묶음은 절대 저장하지 않음**. 저장 위치 `index.settingsHistory`.
  - 프리셋 공유 코드 `DAMEM1:…`(체크섬 포함) — 모델·키·봇/채팅별 값 제외, 추가 프롬프트는 ‘모든 곳’ 범위만. 적용 전 확인, 적용도 변경 이력에 남음.
  - ‘이 채팅’ 요약 창(봇 화면 설정 버튼 옆) — 추적 인물·위키 인물·페르소나 이름·관찰자·이 채팅 프롬프트(읽기 전용; 고치기는 고급 설정).
  - 다음 턴 주입 미리보기 — `injector.preview()`(저장·사용 횟수 변경 없음), 토큰 수·포함/제외 목록. 위키 쪽(Router·Director)은 AI 호출이 필요해 미리보기에서 제외, 안내 문구 있음.
- 번들은 `/opt/npm-tools` esbuild 링크로 재빌드 성공(라벨은 아직 v1.6.3). 전체 `node --test` 225개 중 216 통과·실패 0.
- **남은 것**: ⓑ 중 사용자 정책 확인(19 수치 직접 편집 충돌 정책), 5의 Copilot·Vertex는 이미 `modeladv.js`에 있음 → 유지 여부만 확인, ⓔ(최적화·CHANGELOG·GUIDE·소스맵·아카 글·버전 올리기), 실제 리스 시험(월경·임신·검색 필터·이력 되돌리기·미리보기 포함). 이번 화면들은 Playwright 시험을 못 돌렸음.
