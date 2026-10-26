# Dusk Atelier v1.6.2 가이드 (기능 총정리 + 개발자용 필수 정보)

> 다른 AI/개발자가 이 플러그인에 기능을 추가할 때 이 문서만 읽어도 시작할 수 있게 쓴 문서. 1.6.0 이전 기능의 상세는 `docs/FEATURES-v1.6.0.md`, 설계 배경은 `docs/PLAN-v1.6.2-memory.md`, 인수인계는 `docs/HANDOFF-v1.6.2-memory.md`.

---
# Part 1. v1.6.2 기능 총정리

## 1. 플러그인 개요
RisuAI 플러그인(API 3.0). 모듈·봇 관리/업데이트(RisuTide 이식), 편집기, 로어북 규칙/로그, 페르소나 빌더, 테마, 에셋 관리, 그리고 v1.6.2의 **장기 기억**. 원본 RisuAI·PocketRisu·RisuBard에서 동작. 단일 파일 `dusk_atelier.js`(빌드 산출물)로 배포, `//@update-url`로 자동 업데이트.

## 2. 이전 버전에서 이어지는 기능(요약)
- 1.6.0: 모듈/캐릭터/플러그인/도구/설정/개발 탭, 3-way 업데이트 엔진, 합치기, 빠른 가져오기, 에셋 관리자, 패치(.rbupatch). 자세히는 FEATURES-v1.6.0.md.
- 1.6.1: 페르소나 빌더(설명 양식 프리셋, 손으로/AI로 쓰기, 모델 선택).

## 3. v1.6.2 장기 기억

### 3.1 기록 (자동)
- AI 응답이 끝나면(`output` 스크립트 핸들러, 보조로 `display` 핸들러) 보조 모델(`memory` 모드 기본)이 **등장인물별 행동**과 **현재 상황**을 짧게 JSON으로 기록.
- 저장 구조: 봇 → 채팅 → 폴더(등장인물 / 상황). 누구를 기록할지는 모델이 판단.
- **자동 기록 기본 켜짐**, 봇별 토글. **1번째 AI 응답부터 기록**(설정 `startTurn`, 기본 1). 짧은 응답(`minChars` 120자 미만)·N턴마다(`everyN`)·중복(같은 해시)은 건너뜀. 연속 실패 시 자동 중지. 응답당 호출 1회.
- 생성 중이면 최대 180초 대기 후 분석. 스트리밍 응답(`runLLMModel`이 stream 반환)도 읽음(`drainStream`).
- 진단: 기억 탭 상태 카드에 훅 수신 수, 호출 수, 마지막 오류/건너뜀 이유 표시.
- **지난 대화 분석(백필)**: 범위 지정 → 예상 호출 수 확인 → AI 응답 3개씩 묶어 분석, 취소/실패 묶음만 재시도.

### 3.2 등급
모델은 지속성 p·변화 s·파급 r을 각 0~3으로만 매기고, 플러그인이 합계(0~9)로 등급 산정(`engine/memorygrade.js` SCORE_TABLE): ≤1 기록 안 함, 2–3 D, 4–5 C, 6 B, 7 A, 8 S, 9 EX. 응답당 상한 EX1/S2/A3. 인물별 `personCap`(기본 300) 초과 시 D→C 순으로 정리, B 이상·고정·사용자 수정 기록은 보존. (사용자 원래 요청은 D~A였음 — 사용자가 6단계(D~EX) 유지로 확정: 리스바드 등급 규격도 이에 맞춤.)

### 3.3 프롬프트 주입 (BardWiki 방식, 로컬 모드)
- `beforeRequest` 리플레이서(type==="model"인 메인 요청만)가 **요청 사본**에 `[Dusk Memory — story so far…]` 시스템 블록을 삽입(저장 데이터 불변). 위치: 마지막 사용자 메시지 앞(기본) / 시스템 프롬프트 뒤.
- **1번째 턴부터 주입**(`inject.fromTurn` 기본 1; 폴더에 기록이 있어야 함). 구버전 저장값 2는 1회 1로 이전(`inject.m1`).
- 블록 구성(고정 예산, 항목은 통째로만 포함/제외):
  1. `Current scene:` 현재 상황(+장소+사실, `sceneTokens` 300)
  2. `Story so far:` 이전 장면들을 최신부터 `eventTokens`(600) 안에서 시간순 나열
  3. `Characters (current state):` 인물별 요약(digest)+핵심 순간(등급×0.97^경과 점수 상위 5). 목표 `targetTokens` 1200 / 상한 `capTokens` 2500.
- **인물별 컨텍스트 모드**(`person.ctx`): `auto`(기본; 현재 장면 인물 또는 최근 2개 메시지에서 언급될 때만 = 관련성 검색), `always`(고정과 같음; 항상, 상한까지), `never`(제외). 인물 화면의 모드 버튼으로 순환 전환.
- 최근 `recentSkip`(8) 메시지와 겹치는 기록은 제외. 마지막 요청에 들어간 내용·제외 사유는 설정의 매니페스트에서 확인.
- 훅이 없는 환경 폴백: 채팅 `localLore`에 `da_mem` 관리 항목을 갱신(멱등).
- 오래된 D/C 기록은 digest로 압축(기록 20개 초과 + 10회 분석마다, 사용자 digest 보호).

### 3.4 리스바드(BardWiki) 모드
- 저장소 설정: 자동 / 플러그인 / BardWiki / 끔. **자동**은 `risuai.bardWiki.getDocuments` 존재 시 BardWiki로 인식.
- BardWiki 모드(명시 또는 자동 인식): **플러그인의 기록·주입 완전 비활성**(이중 비용 방지). 리스바드가 자체 위키를 프롬프트에 넣고, 플러그인은 위키 문서를 읽어 같은 화면에 표시(원본은 수정하지 않음). 위키가 markdown 모드가 아니면 `getDocuments`가 `[]` → 안내 표시. 새 봇/새 채팅 만들기는 위키 내용 기반.
- 어댑터: `engine/bardwikiadapt.js`(문서→폴더 변환, `wikiScore`), `data/memorybackend-bardwiki.js`(실시간 조회, `dusk.mem.v2.ext.<id>` 스냅샷, 등급). 가상 메모리(hypaV3/hypaV2/supaMemory의 `bardwiki-plugin-context-v1`)는 복사 시 제거.
- **등급 연동(리스바드에 `grade` 필드 패치가 있을 때):**
  - 위키 사건 문서의 `grade`(정수 0~9)와 `gradeBy`("user"|"ai")를 읽어 그 문서에서 나온 기록·상황 카드에 표시(0~1은 등급 없음). 위키 등급이 있으면 AI로 다시 채점하지 않음. 기록 옆에 "위키 등급 · 사용자/AI" 또는 "AI 등급 · 플러그인 캐시" 표시.
  - 등급 매기기(`gradeOnDemand`)는 **등급 없는 사건 문서만 문서 단위**로 AI 채점(30개씩). `bardWiki.setGrade`가 있으면 `gradeBy:"ai"`로 위키에 저장, 첫 권한 거부(null) 시 더 묻지 않고 캐시에만 저장, 저장 실패(문서 변경/사용자 등급)도 캐시만 사용. `setGrade`가 없는 구버전은 캐시만 사용(이전 동작 유지).
  - 등급 매기기 결과 토스트: 위키 저장 N개 / 캐시만 M개와 이유(setGrade 없음·권한 거부·저장 실패). 매길 항목이 없으면 "AI 등급 다시 매기기"를 물음(`gradeOnDemand(..., {regrade:true})`, 사용자 지정 등급은 유지; 반환값의 `lastGrade{total,wrote,cacheOnly,reason,error}`).
  - 사용자 지정: 기록 메뉴 "위키 등급 지정"(현재 열린 채팅, `setGrade` 지원 시) → D/C/B/A/S/EX(대표 점수 3/5/6/7/8/9), 0~9, "해제" 입력. `gradeBy:"user"`로 저장되며 AI가 덮어쓰지 않음.
  - 리스바드 쪽 패치 파일: 저장소 루트의 `bardwiki-grade.patch`(및 변경 파일 zip). 규격은 아래 §7-1.

### 3.5 활용
- **새 봇 만들기**: 인물 1명 + 등급 하한/구간 + 로어북 선택 → AI가 관계 기록·설명·첫 메시지 생성 → 새 봇 추가.
- **여기서 새 채팅**: 기록/상황 카드 지점까지의 기억을 이어받는 새 채팅(원문 복사 선택). 채팅 되돌리기(회귀)는 없음.
- 인물 검색, 별칭, 고정, 기록 수정/삭제, 채팅(몇 번째) 선택, 상황 탭, 정렬/페이지.

### 3.6 UI/설정 구조
- 기억 탭 메인: 전체 설정 폴드(저장소/분석 모델/주입/예산/시작 턴/매니페스트), 봇 목록.
- 봇 화면: 토글 옆 "설정" 폴드(지난 대화 분석, 제외 이름, 초기화, 상태). 탭: 등장인물/상황/새 봇 만들기. 폭 900px 이하(컨테이너 쿼리)에서는 목록/상세 한 칸씩.
- 설정 키(`dusk.mem.v2.index`의 `settings`): autoRecord, startTurn, debounceSec, everyN, minChars, personCap, model, backend, inject{on, fromTurn, targetTokens, capTokens, sceneTokens, eventTokens, recentSkip, position}, loreRef.

## 3.7 이번 버전 변경 요약(시간순)
시험판 마크 방식 폐기 → 기록/상황/등급 구조 → 주입 → 새 봇/새 채팅 → 백필 → 리스바드 읽기 어댑터 → 스트리밍 응답 처리 → 모바일 레이아웃 → 설정 구조 개편 → 1번째 턴부터 기록·주입, BardWiki 방식 주입(컨텍스트 모드, Story so far) → 리스바드 등급 필드 연동.

## 4. 아직 실환경 검증 안 된 항목
출력 훅 타이밍, 시스템 메시지 삽입의 모델 수용, `setCharacterToIndex`의 채팅 반영, pluginStorage 용량, BardWiki `sourceMessageIds`↔`chatId` 일치, 폰 UI 시각 확인, 자동 기록이 실제로 생성되는지(진단 줄 확인); 리스바드 `grade` 패치와 플러그인 연동(실제 리스바드에서 setGrade 왕복); 리스바드 전체 vitest.

---
# Part 2. 개발자용 필수 정보 (다른 AI에게)

## 5. 저장소·브랜치·빌드
- 저장소 https://github.com/Pyser08/Dusk-Atelier. main에는 빌드 결과 `dusk_atelier.js`와 문서; 1.6.2 코드는 PR #4 브랜치 `feat/character-split-v1.6.2`.
- **`dusk_atelier.js`는 빌드 산출물**: 직접 고치지 말 것. 소스는 `src/`(main.js 진입).
- `node tools/build.mjs`(esbuild 번들, IIFE 단일 파일, `//@` 머리말 생성, CHANGELOG 최근 8버전 포함), `node tools/build.mjs --check`(저장소 파일과 비교), `node --test`(현재 86개 통과). 버전은 `package.json` + CHANGELOG 맨 위 섹션.
- 줄 맨 앞 `//@`는 RisuAI가 머리말로 읽으므로 번들 안에 생기지 않게 함(minifySyntax 금지).
- 커밋 전 반드시: 테스트 → build → check.

## 6. 파일 지도 (장기 기억)
- `data/memory.js` 조립(스토어·러너·인젝터·백엔드), `start()`가 마이그레이션 후 백엔드 선택. 로컬만 인젝터/러너 start.
- `data/memorybackend.js` selectBackend/CAPABILITIES(local/bardwiki/off), `memorybackend-bardwiki.js` + `engine/bardwikiadapt.js`.
- `data/memorystore.js` 저장소·DEFAULT_SETTINGS·마이그레이션·정리. `data/memoryrunner.js` 훅/디바운스/분석 게이팅/백필. `data/memoryinject.js` 훅 + 폴백. `engine/memoryinject.js` 순수 buildBlock/insertBlock/shouldInject.
- `engine/`: memoryprompt(분석 프롬프트), memorygrade, memoryapply(결과 병합), memoryreconcile(재생성/삭제로 고아 표시), memorydigest, memorycompose, memorydiag, chattext, runai(`runAI`, `drainStream`, `settleResponse`).
- `data/memorybot.js`(새 봇), `memoryrewind.js`(새 채팅), `addcharacter.js`(봇 추가 공용 흐름).
- UI: `ui/screens/memory/{index,botlist,botview,people,scenes,compose,settings,common}.js`, 스타일 `ui/styles.js`.
- 테스트 `tests/*.test.js` — 순수 함수는 엔진에, 부수효과는 `data/`에 두고 가짜 api로 테스트.

## 7. 저장 키/데이터 모델
- pluginStorage: 인덱스 `dusk.mem.v2.index`({v:2, settings, bots, folders, status}), 폴더별 키 `dusk.mem.v2.f.<id>`(FOLDER_PREFIX), 외부 스냅샷 `dusk.mem.v2.ext.<id>`. 읽기-수정-쓰기는 직렬화 큐(`updateIndex`, `updateFolder`)로만.
- 폴더: {chaId, chatId, cursor{at,h}, scenes[{id,at,sum,facts,place,who}], people{key:{name,aliases,pinned,ctx,digest,records[{id,at,mid,h,act,g,pin,orphan,digested}]}}}.
- 앵커 {at(메시지 인덱스), mid(chatId), h(FNV-1a)}; 재생성/삭제는 reconcile이 orphan 표시.
- 새 설정 추가 시: DEFAULT_SETTINGS에 기본값, readIndex 병합이 얕게(1단계 하위) 합치므로 중첩 객체는 병합 코드 확인, 기존 값 변경이면 마이그레이션 플래그 사용(예: `inject.m1`).

## 7-1. 리스바드 등급 규격(패치가 정의한 것)
- 문서 선택 필드: `grade`(정수 0~9, 없으면 미평가), `gradeBy`("user"|"ai"). 프론트매터 `grade:`, `grade_by:`. 구간: 0~1 없음, 2~3 D, 4~5 C, 6 B, 7 A, 8 S, 9 EX(우리 `SCORE_TABLE`과 동일). 점수만 저장하고 글자는 표시 계층에서 계산.
- API: `risuai.bardWiki.setGrade({documentId, grade: 0~9|null, gradeBy?:"user"|"ai" (기본 "ai"), expectedContentHash})` → 문서 또는 null(권한 거부). 서버 라우트 `POST /api/risubard/memory/wiki/document/grade`. 사용자 등급은 AI가 덮어쓸 수 없음. `saveDocument`로 고쳐도 등급 유지.
- 패치가 건드린 곳: server/node/risubard-markdown-wiki.ts(저장·파싱·`setDocumentGrade`), risubard-memory-routes.cjs, risubard-memory-runtime.cjs, src/ts/risubard/memoryWiki.ts(허용 키·`setWikiDocumentGrade`), pluginBardWiki.ts, plugins/apiV3/v3.svelte.ts, risuai.d.ts, docs/ko/bardwiki-plugin-api.md, 서버 테스트. 리스바드 전체 vitest는 실행해 보지 못함.
- 호환 원칙: 플러그인은 항상 `typeof bardWiki.setGrade === "function"`으로 확인하고 없으면 캐시 방식으로 동작.

## 8. RisuAI 플러그인 API (사용 중인 것)
getDatabase, getCharacterFromIndex, getChatFromIndex, getCurrentCharacterIndex/ChatIndex, setCharacterToIndex, setChatToIndex, setDatabaseLite, pluginStorage(getItem/setItem/removeItem/keys), runLLMModel({mode,messages,staticModel,allowPlugins}) — 스트림 객체를 반환할 수 있음, addRisuReplacer("beforeRequest",(messages,type)) — 분석(memory/submodel) 호출은 type이 달라 주입 안 됨, addRisuScriptHandler("output"|"display"|"input").
- 리스바드 `risuai.bardWiki`: getContext/getDocuments(읽기), saveDocument/setContextMode/trashDocument(쓰기 권한 프롬프트, 거부 시 null, expectedContentHash). 범위는 현재 선택된 캐릭터+저장된 채팅. 문서 type event/character/location/scene/faction/creature/item/concept/other, status active/superseded/retracted, contextMode always/auto/never(플러그인의 `ctx`가 이 모델을 따름). 이벤트 `sourceMessageIds` = 메시지 `chatId`.

## 9. UI 규약·함정
- `ui/dom.js` `h(tag, props, ...children)` / `replace(host, ...)`: `hidden:true`는 속성, false는 생략, `class`는 배열 가능. 이벤트는 `onClick` 식.
- `ui/kit.js`: btn(`kind,size,icon,onClick,title,disabled,id` — **class 옵션 없음**, 필요하면 span으로 감쌈), badge, switchEl/setSwitch, confirmDialog, promptDialog, progressBar. 아이콘 이름은 `ui/icons.js`에서 확인.
- 함정: `.rb-card{overflow:hidden}`가 column flex에서 자식을 찌그러뜨림 → `flex-shrink:0`. 폭 분기는 JS 폭 측정이 아니라 CSS 컨테이너 쿼리(`@container memwrap`). 파일 이름이 같은 경로 평탄화로 `src/ui/screens/settings.js`를 덮어쓴 사고 있음 — 새 파일은 `screens/memory/` 아래.
- 기억 UI는 `mem(ctx)` 상태 객체(common.js)와 `env.redraw()`로 다시 그림.
- 한국어 UI 문구, 짧고 부드러운 어투("…해요").

## 10. 기능 추가 체크리스트
1. 순수 로직은 `engine/`, 저장/훅은 `data/`, 화면은 `ui/screens/`.
2. 설정 기본값 + 마이그레이션 + 설정 UI(`settings.js`) 세 곳 모두.
3. 리스바드 모드에서 동작해야 하는지(CAPABILITIES) 결정; 로컬 전용이면 `caps`로 UI를 숨김.
4. 테스트 추가 → `node --test` → `node tools/build.mjs` → `--check` → CHANGELOG(새 버전 섹션, 부드러운 어투) → package.json 버전.
5. 커밋 메시지에 세션 attribution 줄 포함, PR #4 브랜치에 푸시.
6. 비용 주의: 사용자는 토큰 절감을 중시 — 호출은 응답당 1회, 새 AI 호출 추가는 사용자 확인 후.


## 기억 카드 (아르카나 카드 이식, 2026-10-27)
- 순수 엔진: `src/engine/card/` — grade(등급색·태그 수·테마 파생), tags(정의 파서·정규화), memories(기록→M0~M3·발췌·{{user}}), card(모델·sha256 해시 — crypto.subtle 없으면 JS 구현), png(tEXt `dusk-card` 청크), layout(글자 폭 측정 함수를 받는 순수 레이아웃, 태그 줄바꿈 포함), prompt(카드·연결·에셋 고르기 프롬프트와 정규화).
- 데이터: `src/data/cardstore.js`(키 `dusk.mem.v2.card.<id>`·`dusk.mem.v2.cardidx`·`dusk.mem.v2.cardcfg`, `memory.cards`로 노출), `cardflow.js`(AI 호출·에셋 목록), `cardbot.js`(새 봇 객체), `cardassets.js`(프레임 WebP 1장 + Giants woff2, 자동 생성물).
- 화면: `src/ui/card/render.js`(캔버스 렌더러 — 프레임을 밝기→등급색 듀오톤으로 물들임), `preview.js`, `src/ui/screens/memory/compose.js`(5단계), `cards.js`(카드 탭), `settings.js`의 카드 설정.
- 프레임: 은색 SR 프레임의 오른쪽 위 글자를 지운 투명 프레임 1장. 등급 글자(D~EX)는 Giants로 직접 그려요. 6장을 새로 만드는 방식은 쓰지 않았어요.
- 에셋 고르기: 봇(대표·감정·추가 에셋)과 켜진 모듈의 이미지 이름을 AI에 주고 최대 3개를 골라요. 150개를 넘으면 카드 단어와 겹치는 이름을 우선해요.
- 함정: Giants 글꼴은 라틴만 있어 한글 이름은 시스템 명조로 폴백돼요. 카드 PNG는 약 2MB라 에셋으로 넣기 싫으면 설정에서 끌 수 있어요.
- 검증: `node --test`(카드 단위 테스트 포함). 렌더링은 Chromium으로 D·C·EX 카드를 실제로 그려 확인했어요.
