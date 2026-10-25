# Dusk Atelier v1.6.2 구현 계획: 캐릭터 분리 (멀티 캐릭터 봇 → 단일 봇)

> 다른 AI가 이 문서만 보고 구현하도록 쓴 계획서. 저장소: `Pyser08/Dusk-Atelier` (기준 커밋 e440713, v1.6.1)

## 0. 목표

등장인물이 여럿인 봇에서 대화하는 동안:
1. AI 출력마다 **각 등장인물과 {{user}}의 인터랙션 문장**에 보이지 않는 마크를 찍음
2. 출력마다 **이야기 속 날짜·시간**을 AI가 문맥에 맞게 적게 함 (역시 숨김)
3. 나중에 캐릭터 하나를 골라 **마크된 부분만 모아 AI로 요약**(날짜순 관계 기록)
4. 원본 봇에서 **그 캐릭터의 로어북 + 관련 로어북**을 가져와 요약과 함께 **새 봇**으로 만듦

## 1. 기존 코드에서 재사용할 것 (꼭 먼저 읽기)

| 용도 | 위치 | 비고 |
|---|---|---|
| 요청 직전 훅 / 출력·표시 훅 패턴 | `src/data/lorelog.js` `createLoreLog` | `api.addRisuReplacer("beforeRequest", fn)`, `api.addRisuScriptHandler("output"|"display", fn)`. 스트리밍 중 output이 여러 번 불리는 처리 참고 |
| 훅 등록 위치 | `src/main.js` (loreLog 생성 바로 아래) | 같은 방식으로 `createCharSplit(api)` 생성·`start()` |
| AI 호출 | `src/engine/merge.js` `runAI(api, messages, pick, signal)`, `AI_MODES` | 모델 선택 UI는 `src/ui/screens/personabuilder.js`의 AI 프리셋/모델 선택 패턴 복사 |
| 현재 채팅·캐릭터 얻기 | lorelog.js `gather()` | `getCurrentCharacterIndex`, `getCurrentChatIndex`, `getCharacterFromIndex`, `getDatabase([...])` |
| 새 캐릭터 만들기 | `src/engine/character.js` `newCharacterBase`, `uniqueDisplayName` | |
| 새 캐릭터 DB에 넣기 | `src/ui/legacy.js` 1640~1660줄 흐름 | `loadDb(true)` → 생성 중(`isGenerating`)이면 중단 → `hooks.created(chaId)` → `fresh.push` → `setDatabaseLite({characters})` → `ensureInOrder(chaId)` → `getCharacterFromIndex`로 확인 → `setChatToIndex(idx,0,chat)` |
| 로어북 규칙/폴더 | `src/engine/lorerules.js` `ruleOf`, Dusk 폴더 구조 | 폴더 단위 선택에 사용 |
| 도구 탭 타일 | `src/ui/screens/tools.js` `tile(...)`, `ctx.go("tools", sub)` | |
| 빌드 | `npm run build` / `npm run check` | `package.json` version → 1.6.2 |

`ensureInOrder`가 legacy.js 내부 함수라면 **`src/engine/` 또는 `src/data/`로 꺼내 공용화**하고 legacy.js는 그걸 import하게 바꿀 것 (동작 동일 유지).

## 2. 마크 형식 (데이터 규약)

메시지 본문(`chat.message[i].data`)에 그대로 저장되는 텍스트 태그. 마크다운/HTML 처리에 안 깨지게 특수 괄호 사용.

```
⟦T:2026-03-14 19:20⟧            ← 출력 맨 앞에 1개. 이야기 속 시각. 모르면 ⟦T:?⟧ 대신 앞 시각 기준 추정(예: "D+3 저녁")
⟦C:미나⟧문장…⟦/C⟧               ← 등장인물 '미나'와 {{user}}가 직접 주고받은 문장(대사·행동) 단위
⟦C:미나,하루⟧문장…⟦/C⟧          ← 여러 명이 동시에 {{user}}와 상호작용
```

규칙:
- 시간 형식: `YYYY-MM-DD HH:mm` 권장, 날짜를 모르면 `D+n HH:mm` / `D+n 아침|점심|저녁|밤` 허용. 파서는 문자열 그대로 저장하고 정렬은 메시지 순서로 함(시간 문자열은 표시용).
- 이름은 **허용 이름 목록** 중 하나로만(아래 3.2). 목록에 없으면 AI가 새 이름을 그대로 써도 됨 → 나중에 UI에서 별칭 합치기.
- 태그는 중첩 금지. 문장 중간이 아닌 문장 경계에서 열고 닫음.
- 상수로 정의: `src/engine/charsplit.js`에 `MARK = { T: /⟦T:([^⟧]*)⟧/, OPEN: /⟦C:([^⟧]+)⟧/g, CLOSE: "⟦/C⟧" }` 등.

## 3. 런타임 (대화 중) — `src/data/charsplit.js` `createCharSplit(api)`

### 3.1 봇별 켜기
- 저장: `api.pluginStorage` 키 `dusk.charsplit.v1` → `{ v:1, bots: { [chaId]: { on:true, names:["미나","하루"], aliases:{ "미나짱":"미나" } } }, ai:{...프리셋} }`
- 켜진 봇에서만 훅이 동작. 꺼진 봇은 아무것도 안 함(메시지 그대로 반환).

### 3.2 beforeRequest (프롬프트 주입 + 정리)
`addRisuReplacer("beforeRequest", (messages, type) => …)`, `type !== "model"`이면 그대로 반환 (lorelog와 동일).
1. **지시 주입**: messages 끝(마지막 user 메시지 앞이 아니라 **맨 끝 system 메시지**)에 아래 지시를 추가. 영어로 작성(모델 순응도↑):
   ```
   [Dusk Atelier – interaction marks]
   At the very start of your reply, write the in-story date/time as ⟦T:YYYY-MM-DD HH:mm⟧ continuing from the previous time (last: {lastTime}). If the date is unknown use ⟦T:D+n HH:mm⟧.
   Wrap every sentence where a character directly interacts with {{user}} (speaks to, acts toward, reacts to {{user}}) in ⟦C:Name⟧…⟦/C⟧. Use only these names: {names}. Multiple: ⟦C:A,B⟧. Do not nest. Do not mark narration with no {{user}} involvement. These tags are hidden from the reader; never mention them.
   ```
   `{lastTime}`: 현재 채팅의 마지막 `⟦T:…⟧` 값(없으면 "unknown, decide from context"). `{names}`: 봇 설정 names, 비었으면 "any character name as written in the story".
2. **토큰 절약**: 이전 대화 기록 messages에서 `⟦C:…⟧`, `⟦/C⟧` 태그는 제거(본문은 남김). `⟦T:…⟧`는 **마지막 1개만** 남기고 제거. (원본 채팅 데이터는 건드리지 않음 — 프롬프트 사본만.)
3. 훅을 못 쓰는 리스(`addRisuReplacer` 없음): 설정 화면에 "이 RisuAI에선 자동 지시를 넣을 수 없어요. 아래 문구를 봇의 글로벌 노트/후속 지시에 붙여 넣어 주세요" + 복사 버튼으로 같은 지시문 제공.

### 3.3 output
- 텍스트는 **바꾸지 않고** 저장되게 둠(마크가 데이터에 남아야 함). 단, 정리만:
  - 닫히지 않은 `⟦C:x⟧`는 문단 끝에 `⟦/C⟧` 보충, 짝 없는 `⟦/C⟧`는 삭제 (`normalizeMarks(text)` 순수 함수).
  - 별칭 매핑 적용(`⟦C:미나짱⟧` → `⟦C:미나⟧`).
- 스트리밍으로 여러 번 불려도 멱등이어야 함.

### 3.4 display
- 화면에서만 숨김: `⟦T:x⟧` → 설정 "시간 표시" 켜짐이면 `<span class="dusk-time">🕒 x</span>`, 아니면 제거. `⟦C:…⟧`/`⟦/C⟧` → 제거 (설정 "마크 보기(디버그)" 켜짐이면 `<span class="dusk-mark" data-c="미나">…</span>` 밑줄 표시).
- 꺼진 봇이어도 태그가 있으면 숨기기는 함(봇 끈 뒤 태그 노출 방지).
- 다른 Dusk display 훅(lorelog 버튼, lorerules)과 순서 충돌 없게: 문자열 치환만, `x-dusk` 마크업은 건드리지 않음.

## 4. 엔진 (순수 함수) — `src/engine/charsplit.js`

```js
export function normalizeMarks(text, aliases = {})            // 3.3
export function stripMarksForPrompt(text, { keepTime=false }) // 3.2-2
export function hideMarksForDisplay(text, { showTime, debug })// 3.4
export function lastTime(messages)                            // 마지막 ⟦T⟧
export function scanChat(messages, aliases = {})
// → { times: [{i, t}], chars: { [name]: [{ i, t, text, userBefore }] } }
//   i = 메시지 인덱스, t = 그 메시지 시점(같은 메시지 ⟦T⟧ 또는 직전 ⟦T⟧), text = 마크 안 문장(다른 태그 제거),
//   userBefore = 직전 user 메시지 앞 300자(맥락용)
export function mergeScans(scans)                             // 여러 채팅 합치기 (채팅 순서 유지)
export function chunkEntries(entries, maxChars = 6000)        // 요약용 청크
export function pickLore(globalLore, name, { aliases, depth=1 }) // 5.2
export function summaryPrompt / mergePrompt / profilePrompt / greetingPrompt  // 6
```
`src/engine/index.js`에 export 추가.

## 5. 도구 화면 — `src/ui/screens/charsplit.js`

`tools.js`에 타일 추가: `tile("character", "캐릭터 분리", "여러 인물이 나오는 봇에서 한 인물과의 관계를 요약해 새 봇으로 만들기", () => ctx.go("tools","charsplit"), "rb-tool-charsplit")` + `if (ctx.state.sub === "charsplit") return renderCharSplit(ctx);`

단계형 화면(뒤로 가기 가능, 상태는 메모리):

### 5.1 ① 봇·채팅 고르기
- 봇 목록(검색). 고른 봇의 설정 패널:
  - **인터랙션 마크 켜기** 스위치, **허용 이름 목록**(칩 입력, "로어북에서 이름 가져오기" 버튼 = 로어북 항목 comment/폴더명 후보 제시), 시간 표시/디버그 스위치.
- 채팅 체크박스(여러 개 가능, 기본 현재 채팅). 각 채팅 옆에 마크 개수.

### 5.2 ② 인물 고르기
- `scanChat` 결과: 인물별 마크 문장 수, 첫/마지막 시각. 목록에서 1명 선택.
- **별칭 합치기**: 인물 둘 이상 체크 → "하나로 합치기" → 봇 설정 aliases에 저장.
- 마크가 0이면 안내: "이 봇에서 마크 켜기 후 대화한 내용만 모을 수 있어요."
- 미리보기: 선택 인물의 마크 문장 타임라인(시각 + 문장, 가상 스크롤 또는 최근 200개).

### 5.3 ③ 로어북 고르기 — `pickLore`
원본 봇 `globalLore`(+ 선택: 봇에 연결된 모듈 로어북)에서 후보를 이유와 함께 체크리스트로:
- **본인**(기본 체크): key/secondkey에 이름·별칭 포함, 또는 comment가 이름 포함, 또는 이름 폴더 안 항목(Dusk 폴더면 하위 폴더 전부).
- **관련**(기본 체크): 본인 항목 content에 등장하는 다른 항목의 key가 걸리는 항목(depth 1), 본인 이름이 content에 나오는 항목.
- **세계관/공통**(기본 해제): alwaysActive(constant) 항목.
- 나머지는 접힌 "다른 항목"에서 수동 선택.
- 항목마다 이유 배지(본인/관련: '하루' 항목이 언급/상시). 폴더 단위 전체 선택.

### 5.4 ④ AI 요약
- AI 프리셋/모델 선택(페르소나 빌더와 같은 UI·같은 `AI_MODES`, 프리셋은 charsplit 저장소에 따로). 출력 언어: English(기본)/한국어. 추가 지시 칸.
- 실행 (취소 가능, `AbortController`, 진행 표시 "청크 3/7"):
  1. `chunkEntries` → 청크마다 `summaryPrompt` → 시각별 사건 bullet (`- [2026-03-14 19:20] …`)
  2. 청크가 2개 이상이면 `mergePrompt`로 합쳐 최종 **관계 기록**: ⓐ 시간순 주요 사건 ⓑ 지금 관계 상태/감정 ⓒ {{user}}에 대한 호칭·말투·약속·비밀 ⓓ 마지막 시점(시각·장소·상황)
  3. `profilePrompt`: 선택된 '본인' 로어북 + 관계 기록 → 새 봇 **설명(desc)** 초안 ({{char}} 시점, 기존 설정 보존, 관계 반영)
  4. `greetingPrompt`: 마지막 시점에서 이어지는 **첫 메시지** 초안 (첫 줄 `⟦T:…⟧` 포함하지 말 것 — 새 봇 마크는 선택)
- 결과 세 칸(관계 기록/설명/첫 메시지) 모두 편집 가능, 칸별 "다시 쓰기", 한국어 번역 보기(페르소나 빌더 `translatePrompt` 재사용 가능).
- 청크 요약 결과는 메모리에 캐시해서 3·4단계만 재실행 가능.

### 5.5 ⑤ 새 봇 만들기
- 이름(기본 인물 이름, `uniqueDisplayName`), 이미지: 원본 봇 이미지 쓰기/없음(에셋 매칭되는 표정 이미지가 원본 `emotionImages`/`additionalAssets`에 이름 포함이면 복사 옵션).
- 생성 내용:
  - `newCharacterBase({})` 기반, `name`, `desc`=설명, `firstMessage`=첫 메시지, `creatorNotes`= "Dusk Atelier 캐릭터 분리: 원본 '{원본봇}'에서 {날짜} 생성"
  - `globalLore` = 선택한 로어북 **깊은 복사**(Dusk 폴더/규칙 메타 유지, 폴더 구조 유지) + 새 항목 `{ comment:"{{user}}와의 관계 기록", content:관계 기록, alwaysActive:true, key:"", insertorder:… }`
  - 텍스트 치환: 복사한 로어북·설명 안의 **원본 `{{char}}`** → 원본 봇 이름 문자열로, **새 인물 이름**은 그대로 둠(옵션 체크 시 `{{char}}`로 바꾸기, 기본 끔).
  - 원본 봇의 `customscript`/`triggerscript`/모듈은 복사 안 함(옵션 "정규식 같이 복사", 기본 끔).
- DB 삽입은 1장의 legacy.js 흐름 그대로(생성 중이면 막기, 확인, ensureInOrder). 생성 전 확인 창 + 끝나면 "새 봇 열기" 버튼.
- 원본 봇·채팅은 **절대 수정하지 않음**.

## 6. 프롬프트 (engine/charsplit.js, 영어, messages 배열 반환)

- 공통 system: "You are a careful story archivist. Use only the given material. Do not invent events."
- `summaryPrompt({name, entries, lang})`: entries를 `[time] (context: userBefore 요약) sentence` 줄로. 출력: 시간순 bullet, 각 줄 `- [time] event`, 감정 변화·약속·호칭 변화 표시.
- `mergePrompt({name, parts, lang})`: 위 ⓐ~ⓓ 헤더 고정(`## Timeline`, `## Relationship now`, `## Between {{user}} and {{char}}`, `## Last scene`), 2000단어 이내.
- `profilePrompt({name, lore, record, lang})`: 원본 설정 문장은 최대한 유지, 관계 변화만 반영, 마크다운 섹션.
- `greetingPrompt({name, record, lang})`: Last scene 이어서, 3~6문단, {{user}} 행동 대신 쓰지 않기.
- 응답 파싱 실패/빈 응답은 `runAI`가 재시도. 결과는 trim만.

## 7. 설정·호환

- 설정 탭(`settingstab.js`)에 "캐릭터 분리" 묶음: 전역 끄기(훅 해제), 시간 표시 기본값. 봇별 설정은 도구 화면에서.
- 기존 채팅(마크 없음) 지원: ②에서 "마크 없이 전체 대화에서 이 인물 부분 찾기(AI)" 옵션 — 메시지 전체를 청크로 보내 이 인물과 {{user}} 상호작용만 추출 요청 → 같은 요약 파이프라인. (비용 경고 표시) *선택 구현, 시간 남으면.*
- PocketRisu/RisuBard: lorelog와 똑같이 `addRisuReplacer` 없으면 3.2-3 대체 안내.
- 대체 스크립트 `dusk_atelier.js`는 빌드 결과물 — 직접 수정 금지.

## 8. 테스트

`tools/test-charsplit.mjs` (node 단독 실행, 의존성 없음, `node tools/test-charsplit.mjs`):
- normalizeMarks: 미닫힘/짝없는 닫힘/별칭/멱등(두 번 적용 동일)
- scanChat: 여러 메시지·시간 상속·다중 인물 태그·user 맥락
- stripMarksForPrompt: 마지막 ⟦T⟧만 남김
- hideMarksForDisplay: 태그 완전 제거, x-dusk 마크업 보존
- pickLore: 키·comment·폴더·관련 depth1·상수 분류
- chunkEntries: 경계·순서
수동 확인: 실제 RisuAI에서 봇 켜기 → 3턴 대화 → 화면에 태그 안 보임 / 데이터에 태그 있음 / 분리 → 새 봇 생성·사이드바 표시·첫 메시지.

## 9. 마무리 체크리스트

1. `package.json` version `1.6.2`
2. `CHANGELOG.md` 맨 위 `## v1.6.2 (날짜)` — 기존 말투(해요체, "### 새 기능 / ### 바뀐 점") 맞춰 작성
3. `npm run build` → `dusk_atelier.js` 갱신, `npm run check` 통과
4. 커밋 메시지 예: `feat(1.6.2): 캐릭터 분리 — 인터랙션 마크·시간 기록·요약·새 봇 만들기`

## 10. 파일 요약

| 새 파일 | 내용 |
|---|---|
| `src/engine/charsplit.js` | 마크 규약·파싱·청크·로어북 선택·프롬프트 (순수 함수) |
| `src/data/charsplit.js` | 저장소 + 런타임 훅(beforeRequest/output/display) |
| `src/ui/screens/charsplit.js` | 도구 화면 5단계 |
| `tools/test-charsplit.mjs` | 단위 테스트 |

| 수정 파일 | 내용 |
|---|---|
| `src/main.js` | `createCharSplit(api).start()` 등록 |
| `src/ui/screens/tools.js` | 타일 + 라우팅 |
| `src/ui/screens/settingstab.js` | 전역 설정 |
| `src/engine/index.js` | export |
| `src/ui/legacy.js` | `ensureInOrder` 공용화 시 import로 교체 |
| `package.json`, `CHANGELOG.md`, `dusk_atelier.js` | 버전·기록·빌드 |
