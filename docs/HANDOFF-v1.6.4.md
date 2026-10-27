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

## 2단계(저장소 v3)에서 볼 곳
- 리수폿 저장 형식: `src/data/pot/wiki-store.js`, `src/engine/pot/chat-scope.js`(채팅 범위 키), `src/engine/pot/settings.js`(설정·봇별 기능 세트 `featureSettingsFor`), `src/engine/pot/people-folders.js`·`people-pins.js`.
- Dusk 기존 저장소: `src/data/memorystore.js`(v2 키·직렬 쓰기 큐).
