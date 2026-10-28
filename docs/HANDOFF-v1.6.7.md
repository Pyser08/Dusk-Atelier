# v1.6.7 인계 (0~4단계 완료, 5단계부터 새 챗)

브랜치 `feat/1.6.7` (main에서 분기, 버전은 아직 1.6.6 — 7·8단계에서 1.6.7로 올림). 원본: `ref/botbuilder` 브랜치 `risu_story_workshop.js`(v0.3.2, 번들 14,966줄).

## 완료
- **0단계**: AGPL-3.0 표기(`LICENSE` 안내문·`NOTICE.md`·README·`package.json`·빌드 머리글·설정 → 정보 · 라이선스 `ui/screens/about.js`), 봇빌더 크레딧 카드(도구 탭), 라이선스 대조표 `docs/LICENSE-AUDIT-v1.6.7.md`, 우측 하단 버튼 하나 → [AI 창 · 규칙 시험](봇 편집에서만 AI 창, 모듈은 규칙 시험 단독).
- **1단계**: `src/dev/aibuild/` — `util`(공용), `core`(세션·작업 7종·프롬프트·검증·적용), `model`(스트림·타임아웃·중단), `regextest`(RE2JS), `preset-format/-v2/-calc/-engine`·`modules`(프리셋 요청 조립), `store`(da_aibuild:*: 설정·작업별 프롬프트·프리셋·자동 3분/임시 저장, 봇빌더 JSON 가져오기), `controller`(Workshop 로직 이식, 화면 없음), `bridge`, `index`. 외부 코드는 `src/vendor/{re2js,msgpackr,noble,fflate-full}.js`(번들에서 추출, 고지는 NOTICE.md).
- **2단계**: 편집기(`ui/screens/editor.js`) 작업본을 직접 사용. `replaceDraft`·`undoAi`(적용 1회=되돌리기 1단계)·핸들에 노출. 손으로 고치면 대기 수정안은 stale. 봇빌더 동시 설치 감지(`engine/firstrun.js bbInstalled`) 안내 + 저장본 JSON 가져오기. 임시 AI 창 `ui/screens/aibuild.js`(5단계에서 본격 개편).
- 시험: `tests/aibuild.test.js`(9), `node tests/e2e/run-editor-ai.mjs`(13 항목 통과), 전체 `node --test` 통과.

## 결정·주의
- 봇빌더 core.js를 session/tasks/validate/apply로 나누면 서로 순환 import가 생겨 `core.js` 하나로 합침(plan의 core·tasks·validate·apply 분리는 하지 않음). BB의 listCharacters/readTarget/saveExisting/saveNew는 Dusk 편집기·저장 흐름이 대신하므로 이식하지 않음.
- BB 한국어 문자열은 `\uXXXX` 이스케이프를 읽을 수 있게 풀어서 옮김(동작 동일).
- vendor는 번들 크기 +약 200KB. 지연 로딩은 8단계에서 결정(IIFE 한 파일이라 동적 import로는 분리 안 됨 → 처음 열 때 초기화만 미루는 방식).
- `LICENSE`는 전문을 내려받지 못해 안내문만 있음 → GitHub AGPL-3.0 템플릿으로 교체 필요. risupot·Arcana Card·RisuTide 이식분의 원 라이선스는 확인 못 함(대조표 참고).
- BB `정규식 시험` 엔진(RE2JS)과 Dusk `devcheck.regexRun`은 아직 두 개 — 7단계(정규식 '바로 시험' 합치기)에서 통일.
- 저장본 불러오기는 대화·요청·프리셋만 가져오고 원고는 편집기 것을 유지, 원고가 달라진 수정안은 stale.

## 3단계 완료 (AI로 제작 탭)
- 탭 순서 **정보(첫 화면)·로어북·정규식·트리거·AI로 제작·JSON** (`editor.js`: `es.tab="info"`, `hasAi`일 때만 AI 탭, 대기 수정안 수 배지). `getBuild()`로 컨트롤러를 한 번만 만들어 AI 탭과 팝업이 공유.
- `ui/screens/aitab.js`: 하위 화면 5개 — ① 시작하기(제작 노트·종류 `build.setBrief`, 로어북 방식 이 봇/새 봇 기본값) ② 프롬프트 프리셋(요청 방식, .risup/.json 열기, 블록 보기, 토글(스위치·선택·글), 설치 모듈 고르기·런타임 제외, 참고자료·전역 변수·제외 스위치, 전송 내용 미리보기) ③ 작업 프롬프트(작업별 시스템/사용자 프롬프트 저장·기본값) ④ 설정(모델·대기 시간·전송 한도·자동 재요청) ⑤ 저장본(자동/임시 불러오기·저장, 봇빌더 JSON 가져오기).
- 프리셋 블록은 보기만 함(순서·내용 편집은 리스에서). 필요하면 7단계 이후 편집 추가.
- 새 봇·charx 열기/내보내기는 Dusk 기존 기능 그대로(개발 탭).

## 4단계 완료 (로어북 방식 토글 Dusk/일반)
- `src/dev/aibuild/duskdesign.js`(순수): 설계 JSON(`data.design` = folders·entries·remove) → Dusk 항목 변환 `convertDesign`, 응답 변환 `applyDesignToResponse`(lorebook 작업과 설계 대화의 lorebook 변경 둘 다), AI용 안내문 `DUSK_GUIDE`·형식 `DESIGN_FORMAT`·예시 `designExamples`(블아), 기존 로어북을 구조로 보여 주는 `duskContext`, 규칙 ⇄ 설계 변환 `ruleToDesign`, 방식 결정 `resolveLoreMode`(봇별 기억 > 설정 > Dusk 규칙 유무).
- 검사 순서: 형식 → 이름 해석(없는 대상·중복 이름·자기 참조·폴더 순환) → `validateRules`(고친·새 항목만) 통과해야 수정안 생성. 자동 수정: 규칙 꺼진 연쇄·with 대상 → 규칙 켬(미리보기에 표시). 경고: 누적 조건+반복 없음, 한 글자 키 등.
- 컨트롤러: `loreMode()/setLoreMode()`(설정 `loreByBot`), 검사 실패 시 오류 문구를 붙여 **한 번 자동 재요청**(설정 `retry`), 수정안에 `dusk:{preview,warnings,fixes}`.
- `core.js`: `composeMessages(..., {lore})`, `formatFor(task, lore)`. 수정안 `packet.dusk===true`일 때만 `extentions`·`folder` 필드 허용(일반 응답엔 불허). 일반 방식에서 관리 항목의 content를 고치면 `nativeContent`로 게이트를 다시 감싸 규칙 유지.
- 팝업(`aibuild.js`): 로어북·설계 대화 작업에서 방식 토글, 수정안 카드에 Dusk 구조 미리보기, **적용 전 규칙 시험**(`editor.js ruleTester({lorebook,onBack})` — 적용되지 않은 상태로 시험, [수정안으로 돌아가기]로 AI 창 복귀).
- 시험: `tests/duskdesign.test.js`(15, 실제 규칙 엔진 평가 포함), `run-editor-ai.mjs` 30항목, 전체 `node --test` 268 통과.
- 주의: 빌드/e2e용 node_modules는 `esbuild`·`@esbuild`는 /opt/npm-tools, `acorn`·`eslint-scope`·`playwright`는 /opt/node-tools에서 개별 심볼릭 링크(디렉터리 통째 링크는 esbuild를 못 찾음).

## 다음 (5단계~)
5단계 AI 팝업 개편(끌어 옮기기·크기 조절·위치 기억·모바일 시트·대기 점/수정안 배지·보고 있는 탭에 맞춰 작업 자동 선택) → 6 정보 탭·퍼스트 메시지 → 7 나머지 탭(정규식 '바로 시험'을 RE2JS로 통일 포함) → 8 처음 사용자·최적화(지연 로딩)·릴리즈(버전 1.6.7, CHANGELOG·GUIDE·소스맵·크레딧). BB 화면 로직 참고: 번들 `src/ui.js` 14061~14956(Workshop 클래스), `preset-ui.js` 13698~14060, `modules-ui.js` 13612~13697.
