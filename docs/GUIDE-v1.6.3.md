# Dusk Atelier v1.6.3 구현 메모 (2026-10-27)

v1.6.2 장기 기억 위에 올린 것: 기억 카드 + 장기 기억 확장 6가지. 기준 문서는 `PLAN-v1.6.2-memory.md`, `GUIDE-v1.6.2.md`.

## 1. 기억 카드 (아르카나 카드 이식)
- 순수 엔진: `src/engine/card/` — grade(등급색·태그 수·테마 파생), tags(정의 파서·정규화), memories(기록→M0~M3·발췌·{{user}}), card(모델·sha256 해시 — crypto.subtle 없으면 JS 구현), png(tEXt `dusk-card` 청크), layout(글자 폭 측정 함수를 받는 순수 레이아웃, 태그 줄바꿈 포함), prompt(카드·연결·에셋 고르기 프롬프트와 정규화).
- 데이터: `src/data/cardstore.js`(키 `dusk.mem.v2.card.<id>`·`dusk.mem.v2.cardidx`·`dusk.mem.v2.cardcfg`, `memory.cards`로 노출), `cardflow.js`(AI 호출·에셋 목록), `cardbot.js`(새 봇 객체), `cardassets.js`(프레임 WebP 1장 + Giants woff2, 자동 생성물).
- 화면: `src/ui/card/render.js`(캔버스 렌더러 — 프레임을 밝기→등급색 듀오톤으로 물들임), `preview.js`, `src/ui/screens/memory/compose.js`(5단계), `cards.js`(카드 탭), `settings.js`의 카드 설정.
- 프레임: 은색 SR 프레임의 오른쪽 위 글자를 지운 투명 프레임 1장. 등급 글자(D~EX)는 Giants로 직접 그려요. 6장을 새로 만드는 방식은 쓰지 않았어요.
- 에셋 고르기: 봇(대표·감정·추가 에셋)과 켜진 모듈의 이미지 이름을 AI에 주고 최대 3개를 골라요. 150개를 넘으면 카드 단어와 겹치는 이름을 우선해요.
- 함정: Giants 글꼴은 라틴만 있어 한글 이름은 시스템 명조로 폴백돼요. 카드 PNG는 약 2MB라 에셋으로 넣기 싫으면 설정에서 끌 수 있어요.
- 검증: `node --test`(카드 단위 테스트 포함). 렌더링은 Chromium으로 D·C·EX 카드를 실제로 그려 확인했어요.
- AI 등급·태그: `engine/card/prompt.js`의 gradePrompt/tagPrompt(태그는 카탈로그 이름만 인정), `data/cardflow.js`의 aiGrade/aiTags. 카드를 만들 때 등급을 AI로 하면 +1회.
- 마지막 단계: 카드 만들기(저장, 연결 문서·첫 메시지도 카드에 함께 저장) / 카드와 새 봇 함께 만들기. 카드 탭에서 연결 문서가 있는 카드는 나중에 새 봇으로 만들 수 있다(`screens/memory/makebot.js`).

## 2. 장기 기억 확장 6가지 (`src/engine/memoryplus.js`, 순수)

분석 호출은 늘리지 않는다 — `memoryprompt.js`의 SYSTEM_PROMPT에 know·rel·open 필드를 추가해 같은 응답에서 같이 받는다. `validate()`가 `people[].know`, 최상위 `rel`, `open`을 정리한다(잘못된 값은 버림). 분석 입력에는 열린 항목 최대 12개를 `openItems`(id·kind·text)로 준다(있을 때만).

| 기능 | 저장 | 반영 | 주입(`engine/memoryinject.js` buildBlock) |
|---|---|---|---|
| 지식 경계 | record.know[] | 새 기록에 저장, 중복 기록엔 비었을 때만 채움 | "Knowledge limits" ≤4줄, 예산 knowTokens(160) |
| 원문 복원 | (저장 없음) record.at+h | — | EX·S 기록, `hashText(원문)===r.h`일 때만 발췌 ≤2개, srcTokens(300) |
| 강화·망각 | record.m·lm(반복), u·lu(주입 사용) | 중복 기록 시 reinforce(), 주입 때 `markUsed`(기다리지 않음) | 점수 ×strength, `forgotten()`이면 후보에서 제외 |
| 열린 항목 | folder.open[{id,text,kind,who,at,closed,closedAt}] | applyOpen: 중복(유사도≥0.8) 금지, id로만 닫기, 상한 60(해결된 것부터 정리) | "Open threads" ≤6줄, openTokens(160) |
| 관계 변화 | folder.rels["a>b"]={from,to,items[≤20]} | applyRel: 같은 변화 연속 반복 금지 | "Relationship shifts" ≤5쌍(장면·포함 인물 우선), relTokens(140) |
| 세계 시간선 | scene.when(기존 필드) | 프롬프트에서 형식 유지 지시 | 현재 장면에 `[when]`, 없으면 "Story time (last known)" |

- 설정: `inject.plus`(기본 켜짐), `forgetAfter`(150, 0=끔), `knowTokens/openTokens/relTokens/srcTokens`. 확장 블록은 줄 단위로 넣고 전체 상한(capTokens)을 넘으면 그 줄부터 뺀다.
- 망각은 주입에서만 뺀다. 저장된 기록·카드·새 봇 합성에는 영향이 없다.
- 화면: `screens/memory/ledger.js`(시간선·열린 항목·관계 탭), 인물 기록에 "아는 사람"·"×n 반복".
- BardWiki 모드: 위키 폴더에는 새 필드가 없어 탭이 비어 있다(안내 문구 표시). 주입은 리스바드가 맡는다.
- 아직 안 한 것: 퀴즈형 성능 측정(제외로 결정), 관계 변화의 수동 편집, 열린 항목의 인물별 필터.
