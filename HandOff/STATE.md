# 현재 상태 — feat/1.8.1 (main v1.8.0 대비)

검증(2026-11-01): `npm test` 462 pass / 0 fail / 9 skipped(471), `npm run build` 후 `npm run check` → "동일함 (v1.8.1)" (빌드물 최신). 버그 5건 수정분은 아래 "추가 수정" 참고(미커밋 상태일 수 있음: git status 확인).

## v1.8.1 변경 요약: 장기기억 메시지 식별 충돌 수정
**문제:** 메시지 식별에 본문 앞 200자 해시(`hashText`)만 써서, 앞부분이 같은 긴 응답들이 같은 메시지로 취급됨 → 중복 분석 누락·잘못된 앵커 연결.

**해결:** 메시지 ID(`chatId`) + 본문 전체 64비트 해시로 식별.

| 파일 | 변경 |
|---|---|
| `src/engine/chattext.js` | `fullTextHash`(전체 본문, FNV-1a 2개 결합 64비트), `messageIdOf(m)`, `messageIdentity(m)` → `"mid:<id>:<hash>"` 또는 `"body:<hash>"`, `legacyMessageHash(m)`(예전 200자 해시). `hashText`는 호환용으로 유지 |
| `src/engine/memoryreconcile.js` | `indexMessages`에 `byLegacyHash` 추가. `fix()`가 예전 해시를 새 식별자로 **마이그레이션**(at·h·mid 갱신). 같은 ID라도 본문이 바뀌면 새 메시지(리롤 안전). 예전 해시가 여러 메시지와 겹치면 연결하지 않고 orphan → 재분석 대상. `done`/`failedBackfill`/`cursor`/`src`도 새 식별자로 정규화 |
| `src/data/memoryrunner.js` | 앵커·covered·failedBackfill에 `messageIdentity` 사용. `planBackfill`은 폴더 **복사본**을 reconcile해 계획(저장본 미수정) |
| `src/data/memoryturn.js` | 확정 중복 방지 키에 `messageIdentity` 사용 |
| `tests/memoryreconcile.test.js`, `tests/memoryrunner.test.js` | 전체 본문 식별·레거시 마이그레이션·모호 해시·같은 ID 본문 변경 회귀 테스트 |
| `package.json`, `CHANGELOG.md`, `dusk_atelier.js` | 1.8.1 반영·빌드 |

## v1.8.1 추가 수정 (버그 리포트 5건, 버전·CHANGELOG는 건드리지 않음)
| # | 증상 | 원인 | 고친 곳 |
|---|---|---|---|
| 1 | 인물위키에 같은 인물이 생기고 합치기 안 됨 | ① `mergeui.js`가 `applyPersonMerge`의 반환값 `{scope, report}`를 통째로 `folder.wiki`에 넣어 문서가 사라짐 ② 합치기 대상이 Dusk 인물뿐이라, Dusk만 합쳐서 남은 위키 문서(짝 없는 중복)는 다시 합칠 수 없음 ③ 두 인물이 같은 문서를 가리키면 "같은 문서" 오류로 막힘 ④ 빈 인물 추가가 다른 문서의 별칭 중복을 못 막음 | 새 `engine/peoplemerge.js`(항목=Dusk 인물+짝 없는 문서), `ui/screens/memory/mergeui.js`, `engine/wikiedit.js` |
| 2 | AI로 제작 → 작업 프롬프트에서 탭 줄이 세로로 찌그러짐 | 탭 줄(`overflow-x:auto`)이 flex 열에서 최소 높이 0이 되어 긴 화면(textarea 46vh×2)에서 축소됨 | `ui/screens/aitab.js` (`flex-shrink:0`) |
| 3 | 스트리밍 중 버벅임 | 생성 중에도 `getCharacterFromIndex`(채팅 전부 복사) 호출: 기억 재확인(2초), 로어북 로그 청크별 gather, 로어 규칙 display 900ms 뒤 채팅 전체 조회 | `data/genstate.js`(신호), `data/memoryrunner.js`(현재 채팅 1개만 확인), `data/lorelog.js`(잠잠해진 뒤 1회), `data/lorerules.js`(스트리밍 중 미룸), `engine/chattext.js` |
| 4 | 메뉴 'AI로 제작'만 눌러도 새 봇 생성 | 빈 봇을 먼저 DB에 넣고 편집기를 열었음 | `data/addcharacter.js` `createBotDraft`, `ui/screens/chareditor.js`(draftChar), `ui/screens/newbot.js`, `ui/screens/editor.js`(초안은 자동 저장 끔·첫 저장에서만 생성) |
| 5 | 업데이트 뒤 정규식이 깨짐 | 정규식을 항목별로 내 것/새 것 섞어 옛 정규식이 남거나 순서가 꼬임(특히 기준 기록 없음) | `engine/tideplan.js` `regexRule`: 사용자가 정규식을 고친 흔적이 없으면(기준과 같거나 기준이 없음) 새 버전 목록을 순서까지 통째로 채택. `ui/legacy.js`에 안내 한 줄 |

추가(드롭): 가져오기 창(`legacy.js` `takePatches`/`setPatchSink`)과 에셋 창(`assetmgr.js`)에 놓은 `.rbupatch`도 창 전체 드롭과 같이 이름으로 봇·모듈을 찾아 자동 적용. 이름이 다르면 안내 토스트(⋯ 메뉴 → 패치 적용). 브라우저에서 실제 드롭은 미확인.

테스트: `tests/peoplemerge.test.js`, `tests/streamperf.test.js`, `tests/tideplan-regex.test.js`(esbuild로 묶어 TS 코어 사용), `tests/addcharacter.test.js` 추가분.
확인 못 한 것: 실제 RisuAI/RisuBard/PocketRisu 화면에서의 동작(합치기 모달, AI로 제작 초안 저장 흐름, 스트리밍 체감 속도). 연기 시험(`tests/e2e/run-smoke.mjs`)은 통과.
설계 메모: ⑤ 기준 기록이 없을 때도 "고친 흔적을 알 수 없음"으로 보아 정규식을 통째로 교체한다(사용자 지시). 사용자가 직접 추가한 정규식을 지키고 싶으면 `regexRule`의 `base ? … : false`를 바꾼다. ③ `getChatRangeFromIndex`는 시그니처를 확인하지 못해 쓰지 않았다(필요하면 `memoryrunner.tick`·`lorerules.prepareReroll`의 채팅 조회를 범위 조회로 교체).

## HypaPlus 병합 (v1.8.1, 버전·CHANGELOG 미변경)
HypaPlus v1.0.9에서 쓸 만한 것만 우리 방식으로 새로 구현(코드 복사 없음, 데이터 형식만 참조 → NOTICE 불필요). 나머지(시간 감쇠·합성 점수·최근 노드 캐시·청크 요약·요약 메시지 숨기기)는 우리 구조와 겹치거나 호환 위험이 커서 보류.
| 기능 | 파일 |
|---|---|
| 정규식 전처리: 분석 입력·임베딩 질의 글에서 `editprocess` 정규식 적용(올린 파일 → 봇 `customscript` → 켜진 모듈 순). 기본 꺼짐, 원본 채팅 불변, 결과가 비면 원문 유지 | `engine/regexprep.js`, `data/regexprep.js`, `data/memoryrunner.js`(gather `rx`), `data/memoryinject.js`(tail), `ui/screens/memory/regexui.js`, 설정 `settings.regex` |
| 주입 자리표시자 `[Dusk.memory]`: 프롬프트에 있으면 그 자리에 블록 삽입(위치 설정보다 우선, 첫 곳만, 블록이 비면 글자 제거) | `engine/memoryinject.js` `insertBlock`/`PLACEHOLDER` |
| HypaPlus 가져오기: `hypaplus_state_<charId>_<chatId>` 키를 직접 읽어 event→장면+인물 기록, facts→인물 기록(legacy·`imp` 표시로 멱등, 즐겨찾기=고정·A등급, 인물 없는 facts는 건너뜀). 백업 JSON은 지금 열린 채팅에 | `engine/hypaimport.js`, `data/hypaimport.js`, `ui/screens/memory/hypamodal.js` |
| 첫 진입 안내: 기억 탭에 처음 들어갈 때 HypaPlus(기록 키·설정 키·설치 이름)가 감지되면 자동 모달(“동시에 쓸 수 없어요”). 가져오기/나중에/다시 보지 않기. 상태 `idx.hypa={state:done|dismissed}`. 설정 → ‘HypaPlus에서 가져오기’로 다시 열기 | `hypamodal.js` `maybeAskHypa`, `ui/screens/memory/index.js`, `settings.js` |
테스트: `tests/regexprep.test.js`, `tests/memoryinject-placeholder.test.js`, `tests/hypaimport.test.js`. 검증: `npm test` 498 pass / 0 fail, build·check "동일함", `run-smoke.mjs` 통과.
확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① `pluginStorage.keys()` 지원(없으면 기록 키 감지가 안 되고 설정 키·설치 이름·백업 파일 경로만 동작) ② `getDatabase(["modules","enabledModules"])`·`character.customscript` 필드 읽기 ③ 모달 표시. 알려진 한계: 가져온 장면은 앵커가 없어 응답 리롤에 따라가지 않고, 임베딩 벡터·대사 원문은 가져오지 않음(대사는 장면 facts 최대 3개로 요약). 아이디에 밑줄이 있는 HypaPlus 키는 건너뜀(백업 파일로 가져오기).

## 남은 일 / 발견한 문제 (머지 전 권장)
- [ ] (보류, main에도 있던 구조) `CHANGELOG.md`: `## v1.8.0 (2026-10-30)` 헤더가 **여러 번** 나오고 "추가 개선" 섹션 아래에 헤더 없는 목록이 섞여 있음 → 정리 권장 (빌드 때 `__CHANGELOG__`로 앱 '새로 바뀐 점'에 들어가므로 정리 시 표시 내용 확인).
- [x] `memoryreconcile.js` 주석의 일본어 혼입 수정·재빌드 완료.
- [ ] `docs/GUIDE-v1.8.1.md` 없음 (필요 시 작성). ~~GUIDE-v1.9.0~~ → 내용이 더 많은 쪽으로 `docs/GUIDE-v1.8.0.md`에 통합 완료.
- [x] 소스맵: v1.8.1·chattext 새 export·HandOff 안내 반영 완료. `HandOff/source-map.md`로 복사 배치(원본 생성 위치 `docs/source-map.md`와 동일 유지).
- [ ] `.github/workflows/`에 `branch-build.yml`(검증)과 `build-branch.yml`(feat/* 빌드 후 자동 커밋)이 공존 — 의도 확인. 자동 커밋 때문에 push 전 항상 `git pull --rebase` 필요.
- [ ] 루트에 작업과 무관한 파일(`HypaPlus_*.js`, `cocoAgent v1.1.5.4.js`, `*.zip`, `bardwiki-grade.patch`) 있음 — 참고용이면 `ref/` 등으로 이동 고려. 빌드에는 영향 없음.
- [ ] 릴리스(**사용자 결정 사항**, AI가 임의로 하지 않음): main 머지 시 release.yml이 v1.8.1 릴리스 생성. 아카 글은 `docs/arca/v1.8.1.html`(형식: 기존 `docs/arca/v1.7.1.html` 참고).

## 내 프롬프트를 모든 AI 작업에 (v1.8.1)
`engine/customprompt.js`(`applyUserPrompts`: 앞=시스템 글 맨 앞 · 중간=첫 문단 뒤 · 뒤=맨 끝) + `engine/runai.js`(`setUserPromptProvider`, `withUserPrompts`; `runAI` 맨 앞에서 적용) + `dev/aibuild/model.js`(`callModel`도 적용) + `data/memory.js`(`userPrompts()`: 프롬프트 중 '장기기억 분석' 단계를 켠 것, 범위는 지금 열린 채팅) + `main.js`(공급자 등록). 장기기억 분석 호출은 `pick.noUserPrompts`로 건너뜀(대상 채팅 기준으로 직접 끼움). 리수폿 파이프라인(router/director/writer)은 기존 `customPromptBlock`이 그대로 처리. 화면: 기억 설정 카드의 프롬프트 줄과 임베딩 줄을 같은 일반 줄 스타일로(강조 없음), 프롬프트 줄은 항상 표시. 실제 AI 응답 영향 미확인.

## 모바일 가독성 (v1.8.1, 폭 760px 이하)
`styles.js` 끝의 "v1.8.1 모바일 가독성" 블록(CSS만): 경로(crumb) 숨김·"?" 버튼을 설명 옆으로(검색 없는 화면) · 버튼/칩 높이 40px · 11px 글씨 12px · 칩 줄 오른쪽 끝 페이드 · 관리/작업실 타일 2열 · 인물 위키 항목 머리(제목·개수·접기 / 아래 줄 직접 추가·AI 작성) · 기록 줄 글 칸 확장. 실제 폰 미확인(Playwright 375px 사진으로만 확인). 남은 것: 스위치 높이 30px, 빈 항목이 많은 위키의 긴 스크롤. 참고: `tests/e2e/run-app.mjs`의 "[PC] 사이드바 순서" 항목은 이 작업 전부터 실패(시험이 옛 메뉴 구성 기준).

## 탭 화면이 되돌아오는 버그 (v1.8.1)
원인: 탭 A를 불러오는 중 탭 B로 가면, 늦게 끝난 A의 `replace(ctx.main, …)`(기억 탭은 AI 작업 끝의 `redraw`)가 B 화면을 덮어씀. 수정: `ui/staleguard.js` — `render()`마다 번호표를 받아 낡은 화면의 main 변경(replaceChildren 등)을 무시. `app.js`의 `screen(scopeCtx(...))`. 읽기·ctx 쓰기는 그대로. 실제 RisuAI 미확인.

## 기억 탭 진입 속도 (v1.8.1)
`memory/chatload.js`: 채팅 목록의 이름·개수는 이미 읽은 캐릭터 정보에서 만들고 본문은 보는 채팅 1개만 `getChatFromIndex`(예전: 채팅 전부). `memoryswitches.currentChat`은 1초 재사용(여러 화면이 연달아 부를 때 채팅 전체 복사 1회). 개수 정보가 없으면 개수 표시를 생략. 실제 체감 속도 미확인. 아직 손대지 않은 것: `loadBots`의 첫 로딩(`getDatabase(characters)`)과 캐릭터/모듈 탭 첫 로딩.

## 홈 탭 속도 (v1.8.1)
`ui/screens/homestate.js`(홈 상태 읽기)에서 쓰지 않던 백필 계획(`planBackfill`, 전 메시지 해시)과 채팅 통째 읽기(`getChatFromIndex`)를 뺐고, 읽는 동안 로딩 표시. 남은 비용: `currentChat`의 `getCharacterFromIndex`(모든 채팅 복사) — 리스 API 한계. 실제 RisuAI 체감 속도 미확인.

## 자동 게이지 (v1.8.1 구현됨, 실제 RisuAI 미검증)
결정: 게이지 종류 2개(자동 제안 한도, 사용자 직접 추가는 제외) · 정의는 봇당 1벌, 값은 인물×채팅별 · 게이지끼리 연동 없음 · 기존 기억 분석 호출에 얹음(별도 호출 없음) · 수락 시 모든 인물에 적용 · 채팅 박스는 로어북 버튼 '위'.
- 엔진: `src/engine/gauge.js`(정의 검증·델타 적용·8턴 주기·이력 100·되돌리기·제안 한도), `gaugeview.js`(박스 HTML, 인라인 style만). 테스트: `tests/gauge*.test.js`.
- 저장: 정의·제안 `idx.gauges[chaId]={defs,sug,chats}`, 값·이력 `folder.gauge={vals,log,run}`(묶음에 head/tail/snap 저장 → 채팅 표시용).
- 연결: `memoryprompt.js`(gauges/suggestGauge 입력, GAUGE_RULES, validateGaugeOut), `memoryrunner.js`(prepare→apply→afterAnalyze; 리수폿 합친 호출에는 얹지 않음), `memory.js`(gauge 서비스), `lorelog.js`(`above` 훅으로 박스를 버튼 위에 붙임), `main.js`.
- 디자인: AI가 `look`(c1/c2 색, card/fill/track CSS, 모양)을 설계 → `safeCss`로 허용 속성만 남김(url·var·주석 제거). 편집창 "디자인(CSS)"에서 수정·"디자인만 AI로 다시".
- 화면: `ui/screens/memory/gaugeui.js` + `wikiview.js` 수치 상태 끝 블록(+ 추가 · 관리 · 제안 · 되돌리기 · JSON 내보내기/가져오기).
- 한계: 응답 직후 박스는 변화가 있던 응답에만 붙음. 리롤/삭제된 응답의 이력 정리는 이력 100건 한도에 맡김. 실제 RisuAI·RisuBard·PocketRisu 확인 필요(특히 display 핸들러의 인라인 style 통과 여부).

## (참고) 자동 게이지 설계 검토 메모 (원안)
- 위키 수치 엔진(`pot/people-records.js`)은 새 수치를 4개 슬롯만 허용하고 pot은 수정 금지 → 사용자 정의 게이지는 Dusk 쪽 저장소(`folder.emo` 방식)에 둔다.
- 구조 제안: 정의 1개(캐릭터별) + 대상 인물 목록, 값은 채팅×인물별, 이력은 별도 키(모두 `v:1`). 모델은 변화량(±1~3)만 내고 코드가 범위 제한.
- 제안 1건 = 게이지 종류 1개(승인 시 인물별 생성). 하루 한도는 롤링 24h 권장. 8턴 카운트는 `messageIdentity`로 리롤 중복 방지.
- 모든 AI 호출(설계·갱신·제안)에 `MEMORY_DEFAULT_PROMPT_1+2` 포함 여부 테스트. 자동 제안 기본 꺼짐일 때 제안 호출 0회 테스트.
- 결정 대기: ①정의1+인물별 값 구조 ②참조(15·16번) 제거/표시용 유지 ③갱신을 기존 분석에 덧붙일지 독립 호출일지. 구현 순서: 순수 로직→저장소→AI 설계→수동 UI+8턴 갱신→자동 제안.

## 다음 계획 후보 (프로젝트 메모 기준)
- 영어 UI 지원, 로어북 편의 기능 지속.
