# v1.6.7 인계 (0~2단계 완료, 3단계부터 새 챗)

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

## 다음 (3단계~)
3단계 탭 순서 정보·로어북·정규식·트리거·AI로 제작·JSON(하위 화면 5개) → 4단계 로어북 방식 토글(Dusk/일반, 설계 JSON·변환·검증) → 5단계 팝업 개편 → 6 정보 탭·퍼스트 메시지 → 7 나머지 탭 → 8 처음 사용자·최적화·릴리즈(CHANGELOG·GUIDE·소스맵·크레딧). BB 화면 로직 참고: 번들 `src/ui.js` 14061~14956(Workshop 클래스), `preset-ui.js` 13698~14060, `modules-ui.js` 13612~13697.
