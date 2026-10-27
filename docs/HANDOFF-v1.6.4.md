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

## 4단계(턴 흐름)에서 볼 곳
- 원본 `startPlugin`(ref 브랜치 plugin 모듈)의 훅 등록 순서, `src/data/pot/router-runtime.js`·`director-runtime.js`·`writer-controller.js`·`runtime-hooks.js`, Dusk 쪽 `src/data/memoryrunner.js`(runAI 호출). 단계 호출은 `pickForStage(api,"router"|"director"|"writer")` 결과에 `stage`를 붙여 `runAI`로.

## (참고) 2단계에서 보던 곳
- 리수폿 저장 형식: `src/data/pot/wiki-store.js`, `src/engine/pot/chat-scope.js`(채팅 범위 키), `src/engine/pot/settings.js`(설정·봇별 기능 세트 `featureSettingsFor`), `src/engine/pot/people-folders.js`·`people-pins.js`.
- Dusk 기존 저장소: `src/data/memorystore.js`(v2 키·직렬 쓰기 큐).
