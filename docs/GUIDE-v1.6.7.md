# Dusk Atelier v1.6.7 안내 (개발 메모)

개발 탭 봇 편집 화면 리뉴얼 + 봇빌더(v0.3.2) 이식 = 'AI로 제작'. 단계별 기록·결정은 `HANDOFF-v1.6.7.md`, 라이선스 대조는 `LICENSE-AUDIT-v1.6.7.md`, 구조 지도는 `source-map.md`(`node tools/source-map.mjs`로 갱신).

## 사용자 흐름
1. 개발 탭에서 봇·모듈을 열면 **정보 탭**이 첫 화면. 탭 순서는 정보 · 로어북 · 정규식 · 트리거 · AI로 제작 · JSON.
2. **AI로 제작 탭**(프리셋은 블록 편집·이름 수정·JSON 내보내기 가능): 시작하기(제작 노트·로어북 방식 기본값) → 프롬프트 프리셋 → 작업 프롬프트 → 설정(모델·대기·전송 한도·자동 재요청) → 저장본. 첫 진입에 3장 안내(`da_aibuild:intro`, [사용법]으로 다시 열기).
3. 우측 하단 버튼 하나 → **AI 창 · 규칙 시험**. 작업이 로어북·설계 대화·시작 상황이면 **Dusk 방식 / 일반 방식** 토글이 나온다.
4. 수정안 카드에서 **적용** → 편집기 작업본에 바로 반영(1회 = 되돌리기 1단계). 저장은 기존 Dusk 저장 흐름(변경 요약·백업·충돌 검사).
5. 정보 탭: 요약 카드 + 접는 카드(기본·인사말·고급). 모든 탭에 ? 도움말(우측 서랍·모바일 아래 시트)과 ⓘ 팁 — 설명은 눌렀을 때만 보인다. 로어북·정규식·트리거는 위쪽 줄 + 목록(탭·검색·거르기) + 접는 카드 구성. **퍼스트 메시지 관리자**에서 인사말 다수를 검색·정렬·비교.
6. 정규식 **바로 시험**(RE2JS), 트리거 **초기 변수**(`engine/vars.js`), JSON 탭 오류 줄 번호.
7. 봇 편집 우측 하단 **도구** 버튼(AI 창·룰렛·규칙 시험을 '도구' 패널로 묶어 표시). 룰렛은 페르소나 빌더 룰렛 데이터(`data/personaroulette.js`)를 씀.
8. 기억 탭: BardWiki 사용 중에도 리수폿 기능 스위치 온오프.

## 건드린 곳
- AI 엔진(화면 없음): `src/dev/aibuild/` — `core`(세션·작업 7종·검증·적용), `model`, `controller`, `bridge`, `store`(키 `da_aibuild:*`), `preset-*`·`modules`(프리셋 요청 조립), `regextest`(RE2JS), `duskdesign`(Dusk 설계 JSON ⇄ 규칙 변환·검사).
- 화면: `ui/screens/aibuild.js`(팝업), `aitab.js`(AI 탭), `chareditor.js`(정보 탭), `greetings.js`+`engine/greetings.js`(퍼스트 메시지), `editor.js`(탭·접는 카드·?도움말·ⓘ·정규식 시험·초기 변수·JSON), `engine/regexview.js`, `engine/vars.js`.
- 외부 코드: `src/vendor/{re2js,msgpackr,noble,fflate-full}.js`(봇빌더 번들에서 추출, 고지는 `NOTICE.md`). 번들 약 +200KB. AI 엔진은 처음 쓸 때만 초기화(동적 import → 같은 파일 안 지연 초기화).
- 라이선스: AGPL-3.0 표기(`LICENSE`·`NOTICE.md`·README·`package.json`·빌드 머리글·설정 → 정보 `ui/screens/about.js`), 도구 탭 크레딧에 봇빌더 카드.
- 별도 수정: 페르소나 빌더 '전체 고치기' 입력칸(`onkeydown`이 `false`를 돌려주면 입력이 취소되던 문제).

## 주의
- 봇빌더 원본은 `ref/botbuilder` 브랜치(`risu_story_workshop.js`). 봇빌더의 `core.js`는 순환 import 때문에 나누지 않고 하나로 두었다.
- Dusk 방식에서 AI는 `extentions`·`@@activate`·게이트를 직접 쓰지 않고 **설계 JSON**만 낸다. 변환·검사(형식 → 이름 해석 → `validateRules`)를 통과해야 수정안이 만들어진다. 실패하면 오류 문구를 붙여 한 번 자동 재요청한다.
- 일반 방식에서 관리 항목의 content를 고치면 `nativeContent`로 게이트를 다시 감싸 규칙을 유지한다.
- 저장본 불러오기는 대화·요청·프리셋만 가져오고 원고는 편집기 것을 유지한다.
- BB `정규식 시험`(RE2JS)과 Dusk `devcheck.regexRun`은 시험 화면에서 RE2JS로 통일했다(CBS·@@는 기존 간이 시험).
- 빌드/e2e용 node_modules는 `esbuild`·`@esbuild`는 `/opt/npm-tools`, `acorn`·`eslint-scope`·`playwright`는 `/opt/node-tools`에서 개별 심볼릭 링크한다(디렉터리 통째 링크는 esbuild를 못 찾는다).

## 릴리즈 체크
- `node --test` 288개 중 279 통과·실패 0·건너뜀 9. e2e는 `node tests/e2e/<이름>.mjs`(run-editor-ai 30 · run-popup 32 · run-info 53 · run-tabs 57 · run-persona 12 · run-smoke 13 항목 통과, 이전 단계 기록). `node tools/build.mjs` 후 `dusk_atelier.js` v1.6.7(약 3.2MB).
- **릴리즈 후 할 일:** `LICENSE`를 AGPL-3.0 전문으로 교체(샌드박스에서 못 받아 안내문 상태, GitHub에서 템플릿으로 교체), risupot·Arcana Card·RisuTide 이식분의 원 라이선스 확인(`LICENSE-AUDIT-v1.6.7.md`), 실제 리스·리스바드 수동 시험(작업 7종·로어북 두 방식·프리셋 요청·적용→저장→재진입·charx 왕복·모바일).
- 아카 글은 릴리즈 때 결정(`docs/arca/v1.6.7.html`).
