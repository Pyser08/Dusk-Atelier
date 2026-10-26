# 인수인계: Dusk Atelier v1.6.2 "장기 기억" 구현

> 이 문서는 **아무 맥락도 없는 새 Claude 세션**이 바로 일을 시작하도록 쓴 입문서입니다. 먼저 이 문서를 끝까지 읽고, 그다음 `docs/PLAN-v1.6.2-memory.md`(상세 설계, 정본)를 읽으세요.

## 1. 프로젝트와 사용자

- **Dusk Atelier**: 사용자가 만들어 배포하는 **RisuAI 플러그인**(모듈·봇 관리, 로어북 규칙, 페르소나 빌더 등). 한국어 사용자층(아카라이브)이 있고 UI·문서·변경 기록은 전부 **한국어(해요체)**.
- 저장소: `https://github.com/Pyser08/Dusk-Atelier` (구 `dusk-atelier` 주소에서 이동됨). 기본 브랜치 `main`, 현재 버전 1.6.1 → 목표 **1.6.2**.
- 사용자는 한국어로 대화하고, **답변은 간결하게** 원합니다. 토큰/할당량을 아끼는 중이라 긴 대화가 쌓이면 새 챗을 권하고, 가능하면 짧은 요약 위주로 보고하세요.
- 사용자 지시(프로젝트 설정): 새 챗에서 **버전을 언급하며 요구사항을 말하면, 먼저 저장소를 연결하고 소스코드를 보며 요구사항을 판단**하세요. 저장소는 **읽기 전용이 아니라 모든 권한(push 포함)** 으로 연결하세요(`add_repo`의 access를 push로).
- 커밋 메시지·PR 설명 끝에는 세션이 알려 주는 attribution 문구를 붙입니다(세션 시스템 알림에 나옴).

## 2. 이번 작업이 무엇인가

**목표**: 롤플레이 채팅을 하는 동안 AI 응답마다 **보조(서브) 모델이 인물 행동과 현재 상황을 짧게 기록**하고, 이를 ① 기억 탭에서 보게 하고 ② **2번째 턴부터 프롬프트에 장기기억으로 주입**하고 ③ 나중에 인물별로 꺼내 **새 봇을 합성**하거나 **저장된 데이터로 새 채팅**을 만들 수 있게 합니다. 리스바드(RisuBard)에서는 자체 **BardWiki**를 대신 사용합니다.

### 결정된 사항 (사용자가 확정)
1. **마크 방식 폐기**: 출력에 `⟦C:이름⟧` 같은 숨김 마크를 찍던 초기 안은 **전부 버립니다**. 마크 관련 코드는 모두 삭제.
2. **기록 방식**: 응답이 끝날 때마다 서브 모델이 직전 대화+새 응답을 분석해 **등장인물별 행동 기록**(짧게)과 **상황 요약**을 만듭니다. 누구를 기록할지는 서브 모델이 판단(제외 이름 목록은 지원).
3. **등급 D~A 4단계**: 행동의 중요도를 자동 평가. 모델이 등급을 직접 고르지 않고 **지속성(p)·변화(s)·파급(r) 각 0~3 점수**만 내고, 플러그인이 합계로 계산(≤1 기록 안 함, 2–3 D, 4–5 C, 6–7 B, 8–9 A).
4. **폴더 구조**: 봇 검색 → 채팅 번호 선택 → 그 안에서 **등장인물 폴더 / 상황 탭**. 인물 폴더에서 등급·검색 필터.
5. **자동 기록 기본 켜짐**(봇별 끄기 가능). 비용 안전장치 포함.
6. **채팅 되돌리기 기능은 만들지 않음**. 대신 **"저장된 데이터로 새 채팅 만들기"**만 제공(원본 채팅은 수정 안 함).
7. **장기기억 주입**: 2번째 턴부터 요청에 `[Dusk Memory]` 블록(현재 상황+관련 인물 기억)을 고정 예산(목표 1,200 / 상한 2,500토큰)으로 삽입. 설계는 리스바드 BardWiki를 **참고만**(복제 금지).
8. **리스바드**: `risuai.bardWiki` API가 있으면 플러그인 자체 분석·주입을 끄고 BardWiki를 **읽어서** 같은 화면에 보여 줌(상세는 계획서 §4B).
9. **UI 전면 재설계**: 기억 탭 UI는 새로 만들되 앱 분위기(황혼, 파랑→보라)와 기존 컴포넌트(`h`, `replace`, `btn`, `badge`, `icon`) 사용.

## 3. 현재 코드 상태 (알아야 할 것)

- **PR #4** (`feat/character-split-v1.6.2`, 열린 상태)에 "장기기억 시험판"이 **이미 들어 있습니다**: `src/data/episodicmemory.js`, `src/ui/screens/episodicmemory.js`, `src/engine/runai.js`, `airesponse.js`, `textmarks.js` 등. 등급은 E~S 6단계, 단일 JSON 키 저장 등 **계획서 §1에 적은 7가지 문제**가 있어 재작성 대상입니다. **이 브랜치 위에서 이어서 개발**하세요(새 브랜치를 따로 파도 되지만 PR #4 내용을 기반으로).
- `main`에는 계획 문서만 추가돼 있습니다(`docs/PLAN-v1.6.2-memory.md`, 이 문서). 코드는 PR 브랜치에 있습니다.
- 처음에 `git clone --depth 1`로 받고 필요하면 `git fetch --depth=1000 origin feat/character-split-v1.6.2`로 브랜치를 받으세요(프록시 제약: 동시 clone 금지, 시간 넉넉히).

### 저장소 구조 요약
- `src/main.js` 진입점(훅·화면 등록). `src/engine/*` 순수 로직, `src/data/*` 저장/훅/런타임, `src/ui/*` 화면(`app.js` 탭, `screens/*`, `kit.js` 컴포넌트, `styles.js` CSS).
- **빌드**: `npm run build` → `tools/build.mjs`가 `src/main.js`를 번들해 **`dusk_atelier.js`(단일 파일, 빌드 결과물 — 직접 수정 금지)** 를 만듭니다. `npm run check`는 결과 일치 확인, 테스트는 `node --test`(PR 브랜치에 `npm test`).
- `CHANGELOG.md` 최근 8개 버전이 번들에 들어가 업데이트 후 "새로 바뀐 점"으로 표시됨. 해요체로 작성. 버전은 `package.json`.
- 참고할 기존 코드: 로어북 로그 `src/data/lorelog.js`(요청 직전 `addRisuReplacer("beforeRequest")`, `addRisuScriptHandler("output"|"display")` 사용 방식), AI 호출 `src/engine/merge.js`/`runai.js`의 `runAI`, AI 프리셋 UI `src/ui/screens/personabuilder.js`, 봇 추가 흐름 `src/ui/legacy.js` 약 1640~1660줄(생성 중 차단 → `setDatabaseLite` → `ensureInOrder` → 확인), 도구 타일 `src/ui/screens/tools.js`.
- 플러그인 API는 `risuai` 객체(코드에서는 `api`): `getDatabase`, `getCharacterFromIndex`, `getChatFromIndex`, `setCharacterToIndex`, `setChatToIndex`, `setDatabaseLite`, `pluginStorage`, `runLLMModel`, `addRisuReplacer`, `addRisuScriptHandler` 등. 캐릭터를 쓰는 호출은 기존 코드의 쓰기 래퍼(`WRITES`) 규칙을 따를 것.

## 4. 리스바드 관련 사실 (원본 소스 확인 결과 요약)

사용자가 리스바드 저장소 zip을 줘서 직접 읽고 계획서 §4B에 반영했습니다. 새 세션에는 zip이 없을 수 있으니 필요하면 사용자에게 `RisuBard-main.zip` 재첨부를 요청하세요. 핵심만:
- 감지: `typeof api.bardWiki?.getDocuments === "function"`.
- 읽기 API(`getContext`, `getDocuments`)는 권한 창 없음, **현재 선택한 캐릭터·저장된 채팅 하나로만** 범위 고정. 쓰기(`saveDocument` 등)는 첫 호출 때 권한 요청, 거부 시 `null`, 수정은 `expectedContentHash` 필요.
- 사건 문서의 `sourceMessageIds` = 채팅 메시지 `chatId` → 메시지 위치로 변환 가능. 위키 분석을 플러그인이 트리거할 방법은 없음.
- 문서 본문 표제는 위키 작성 언어(ko/en)에 따라 다르므로 둘 다 파싱. 자세한 표는 계획서 §4B.1.
- 리스바드가 플러그인에 주는 채팅 복제본에는 위키 가상 컨텍스트(`hypaV3Data.summaries` 등, 표식 `bardwiki-plugin-context-v1`)가 붙으므로 복사할 때 제거해야 함.

## 5. 작업 순서 (계획서 §10 요약)

1. `chattext.js` 분리 + 마크 코드 삭제 + `runAI` 일원화 (동작 변화 없음)
2. 등급/프롬프트/정합성 순수 함수 + 단위 테스트
3. 분할 저장소·직렬 큐·마이그레이션(E~S → D~A) + 테스트
4. 러너(훅·디바운스·수동 분석)
5. UI(봇 목록 → 채팅 선택 → 인물 폴더 → 상황 → 설정)
6. `addcharacter.js` 추출 → 새 봇 합성
7. 새 채팅 만들기 → **장기기억 주입** → 백엔드 추상화·리스바드 읽기
8. `CHANGELOG.md`(E·D·C·B·A·S 문구를 D~A로 정정) → `npm run build` → `npm run check` → `npm test`

한 단계씩 커밋하고 각 단계 끝에 사용자에게 짧게 보고하세요.

## 6. 주의할 점

- **실제 RisuAI에서만 확인되는 것들**(계획서 §11)이 있습니다: `output` 훅 시점에 채팅이 저장돼 있는지, `runLLMModel({mode:"memory"})` 충돌 여부, `beforeRequest`에서 system 메시지 삽입 가능 여부, 채팅 추가 API 동작. 샌드박스에서 검증할 수 없으므로 **구현 후 "사용자 환경에서 확인 필요" 목록을 PR 설명에 분명히 적고**, 확인되지 않은 것을 확인됐다고 쓰지 마세요.
- 서브 모델 호출은 비용입니다. 중복 호출(스트리밍 중 `output` 훅 반복)을 반드시 디바운스로 막으세요.
- 원본 채팅·봇 데이터는 절대 수정하지 마세요(새 채팅/새 봇만 추가).
- `dusk_atelier.js`는 빌드 결과물이라 소스(`src/`)만 고치고 빌드하세요.
- 사용자 데이터가 들어가는 문자열(로그, 오류 메시지)에 대화 본문 전체를 남기지 마세요.

## 7. 시작 방법

1. 저장소를 push 권한으로 연결하고 clone, `feat/character-split-v1.6.2` 브랜치 확인.
2. `docs/PLAN-v1.6.2-memory.md`를 읽는다.
3. 사용자에게 "어느 단계부터 진행할까요?" 정도만 짧게 확인하고(보통 1단계부터), 바로 시작.
