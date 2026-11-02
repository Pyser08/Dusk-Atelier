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
백업·열린 채팅 가져오기는 청크의 `chatIds`로 마지막 메시지에 앵커(at·mid·h)를 달아 리롤·삭제를 따라가고(못 찾으면 legacy), 먼저 legacy로 넣은 항목도 다시 가져오면 앵커를 달아 줌(`upgraded`). `npm test` 502 pass / 0 fail. CHANGELOG v1.8.1 ‘추가한 것’에 반영.
확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① `pluginStorage.keys()` 지원(없으면 기록 키 감지가 안 되고 설정 키·설치 이름·백업 파일 경로만 동작) ② `getDatabase(["modules","enabledModules"])`·`character.customscript` 필드 읽기 ③ 모달 표시. 알려진 한계: 지금 열린 채팅이 아닌 곳으로 가져온 장면은 앵커가 없어 리롤을 따라가지 않고, 임베딩 벡터·대사 원문은 가져오지 않음(대사는 장면 facts 최대 3개로 요약). 아이디에 밑줄이 있는 HypaPlus 키는 건너뜀(백업 파일로 가져오기).

## 남은 일 / 발견한 문제 (머지 전 권장)
- [ ] (보류, main에도 있던 구조) `CHANGELOG.md`: `## v1.8.0 (2026-10-30)` 헤더가 **여러 번** 나오고 "추가 개선" 섹션 아래에 헤더 없는 목록이 섞여 있음 → 정리 권장 (빌드 때 `__CHANGELOG__`로 앱 '새로 바뀐 점'에 들어가므로 정리 시 표시 내용 확인).
- [x] `memoryreconcile.js` 주석의 일본어 혼입 수정·재빌드 완료.
- [ ] `docs/GUIDE-v1.8.1.md` 없음 (필요 시 작성). ~~GUIDE-v1.9.0~~ → 내용이 더 많은 쪽으로 `docs/GUIDE-v1.8.0.md`에 통합 완료.
- [x] 소스맵: v1.8.1·chattext 새 export·HandOff 안내 반영 완료. `HandOff/source-map.md`로 복사 배치(원본 생성 위치 `docs/source-map.md`와 동일 유지).
- [ ] `.github/workflows/`에 `branch-build.yml`(검증)과 `build-branch.yml`(feat/* 빌드 후 자동 커밋)이 공존 — 의도 확인. 자동 커밋 때문에 push 전 항상 `git pull --rebase` 필요.
- [ ] 루트에 작업과 무관한 파일(`HypaPlus_*.js`, `cocoAgent v1.1.5.4.js`, `*.zip`, `bardwiki-grade.patch`) 있음 — 참고용이면 `ref/` 등으로 이동 고려. 빌드에는 영향 없음.
- [x] (2026-11-01 사용자 지시로 main 머지·릴리스 진행) 릴리스(**사용자 결정 사항**, AI가 임의로 하지 않음): main 머지 시 release.yml이 v1.8.1 릴리스 생성. 아카 글은 `docs/arca/v1.8.1.html`(형식: 기존 `docs/arca/v1.7.1.html` 참고).

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

## 코코아전트(cocoA(gent!)) 기능 이식 — 진행 중 (v1.8.1, 버전·CHANGELOG 미변경)
요구: ① 가치 있는 기능 이식 ② 코코아전트 스킬(SKILL.md 세트·ZIP·JSON `cocoagent.skill-set/library`, `risu-agents.*` 별칭) 전부 호환 ③ 보조모델 **추가 호출 금지**(기존 호출의 프롬프트에 주입만) ④ 장기기억 꺼도/코코아 꺼도 각자 동작 ⑤ 스킬은 기억 탭 아래 별도 탭. 리수폿과 겹치는 기능은 중복 구현 안 함.
- [x] 1단계 엔진: `src/engine/skills.js`(순수; 형식 규격만 따르고 코드는 새로 작성 — cocoAgent 라이선스 미확인이라 복사 안 함) + `tests/skills.test.js` 8개 통과. 아직 어디에도 연결 안 됨(빌드물 불변).
- [x] 2단계 저장·가져오기·주입 연결(완료, 화면은 4단계): `src/data/skillstore.js`(키 `dusk.skills.v1`, 코코아 키 `risu_agents_skill_library_v1`이 있으면 1회 가져오기 제안), ZIP 읽기/쓰기는 `src/vendor/fflate.js` 사용(엔트리 200개 상한, 폭탄 방어), `skillSetFromEntries` 연결.
- [ ] 3단계 주입(추가 호출 없음): 대상 슬롯 ↔ Dusk 호출 매핑 — system_prompt/output_instruction/output_format/checklist/self_check → 리수폿 director·writer, memory_instruction/memory_format → 기억 분석(`engine/memoryprompt.js`). `composeSlot`으로 뒤에 덧붙임, 스킬 0개면 바이트 동일. 재사용 캐시 키에 `skillInjectionSignature` 섞기. 스킬 세트 할당은 호출 단계별(`router/director/writer/analysis`) 설정.
- [x] 4단계 화면(완료): 기억 탭 하위 '스킬' 탭(세트 선택·ZIP/JSON 가져오기·내보내기·frontmatter 슬롯 편집·진단·"에이전트가 보는 색인" 미리보기). UI-STYLE 먼저 읽기.
- [ ] 5단계 후보(★4~3): `skill_read`/`skill_list` 도구(도구 호출 지원하는 호출에서만), Anthropic 프롬프트 캐싱(`modelhub.js`), 롤링 요약(Dusk 장면 기록과 겹침 확인 후), 실행 검사기.
- 결정(사용자): ① 스킬 주입은 **별도 켜기/끄기 토글**(장기기억·코코아와 독립) ② 웹 검색·fetch 도구만 추가 이식(Brave·Tavily·Serper·Exa·DuckDuckGo·Wikipedia·SearXNG 등, SSRF 방어, `nativeFetch` 우선). 나머지 ★2 이하는 안 넣음. 도구는 도구 호출 단계에서만 호출이 늘어나므로 기본 꺼짐.
- 열린 질문: 스킬 주입을 메인 모델 요청에도 넣을지(cocoAgent에는 없는 Dusk 쪽 확장). 기본은 보조 호출(director·writer·기억 분석)만.
- 테스트 전체/빌드/check는 2단계 이후 연결 시 실행(1단계는 미연결).

### 스킬 2단계 결과 (v1.8.1, 버전·CHANGELOG 미변경 — 화면이 붙을 때 CHANGELOG 반영)
- `engine/skillcfg.js`(설정 `{on:false, stages:{router,director,writer,analysis:[세트 참조]}}`, `appendToPrompt/appendToMessages`), `engine/skillhook.js`(공급자 연결점), `data/skillstore.js`(키 `dusk.skills.v1`·`dusk.skills.cfg.v1`, zip/json 가져오기, zip/json 내보내기, 코코아 키 `risu_agents_skill_library_v1` 감지 `detectCocoa`).
- 주입 지점: 리수폿 단계 `data/memoryturn.js` `stageCall`(프롬프트 문자열 뒤), 기억 분석 `data/memoryrunner.js` 기본 `run`(마지막 system 메시지 뒤). 연결: `main.js`에서 `createSkillStore` + `setSkillBlockProvider`. **꺼짐이 기본, 꺼져 있거나 할당이 없으면 프롬프트 원문 그대로, 추가 호출 없음.**
- `vendor/fflate.js`: export에 `zipSync` 추가(zip 내보내기용).
- 테스트: `tests/skills.test.js`, `tests/skillstore.test.js`. 검증: `npm test` 516 pass / 0 fail, build·check "동일함", `run-smoke.mjs` 통과.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 주입된 프롬프트가 모델에 전달되는지, 리수폿 writer의 JSON 응답이 스킬 글 때문에 흔들리는지. 가져온 프롬프트 재사용 캐시(정리 노트 재사용)에 스킬 서명 섞기는 **아직 안 함**(3단계 잔여). gauge(`data/gauge.js`)·감정 HUD 호출에는 아직 미주입.
- 다음: 4단계 화면(기억 탭 '스킬' 탭: 켜기 토글, 단계별 세트 할당, 가져오기/내보내기, 편집, 진단, 주입 미리보기 `previewFor`) → CHANGELOG·source-map 갱신.

### 스킬 4단계 결과 (v1.8.1, CHANGELOG v1.8.1 '새로 생긴 것'에 반영)
- 화면 `ui/screens/memory/skills.js`: 기억 탭 `m.page="skills"`(진입은 `mhome.js` 설정 카드의 '스킬' 줄). 구성: 주입 켜기 토글 · 단계별(router/director/writer/analysis) 세트 칩 · 세트 목록(가져오기 ZIP/JSON·새 세트·삭제·전체 내보내기) · 세트 편집기(파일 칩·원문 textarea·진단·ZIP/JSON 내보내기·주입 미리보기) · **코코아전트에서 옮겨오기**.
- 옮겨오기 `engine/cocoamigrate.js`: 코코아 저장소 키 `risu_agents_skill_library_v1`·`risu_agents_pipeline_presets_v1`를 **읽기만**. 스킬 세트(이름 겹치면 건너뜀) / 켜진 에이전트의 `skillSets` → 단계 연결(pre→director, record 후처리→writer+analysis, 그 밖은 연결 없음) / 에이전트 프롬프트 글→스킬 세트 변환(선택, 기본 꺼짐: 기본값이 섞여 있을 수 있음). 옮긴 뒤에도 주입 토글은 꺼진 채 둔다.
- 연결: `main.js` `app.ctx.skills`, `memory/index.js` PAGES.skills. 테스트 `tests/cocoamigrate.test.js`, 연기 시험 `tests/e2e/smoke.entry.js`에 스킬 탭 4건.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 코코아전트 저장소 키가 보이는지(pluginStorage 공유 여부는 호스트마다 다를 수 있음 → 안 보이면 ZIP/JSON 가져오기), 파일 선택·다운로드(`Blob` 링크)의 모바일 동작, 좁은 폭 레이아웃(스크린샷 미확인), 코코아 `postMode` 값 가정(`record`).


### 스킬 5단계 결과 — 웹 도구·호출 기록 (v1.8.1, CHANGELOG 반영)
- 웹 도구: `engine/websearch.js`(7개 검색 서비스 요청/해석, SSRF 주소 검사 `checkUrl`, `htmlToText`, 글 규약 `[[tool:이름 {json}]]` + `runToolLoop`), `data/webtools.js`(설정 `dusk.web.v1` 기본 꺼짐·키는 이 기기 저장소만, `nativeFetch`만 사용, 페이지 읽기는 `redirect:"error"`), `engine/webhook.js`(연결점), 연결: `data/memoryturn.js` `stageCall`이 스킬 글을 붙인 뒤 `webWrap`으로 감쌈 → 꺼짐/다른 단계/설정 미비면 원문으로 **한 번만** 호출. 켜진 단계에서 모델이 답 전체를 도구 호출 한 줄로 하면 실행 후 결과를 붙여 다시 호출(최대 `maxSteps` 기본 2, 상한 3). 기본 단계=director.
- 호출 기록: `engine/skillhook.js` `recentCalls`(메모리 30건, 저장 안 함) + 화면 '최근 호출 기록'. 스킬 글이 실제로 붙었는지(글자 수)·도구 사용 확인용 → **실제 호스트 검증 때 이걸 먼저 볼 것.**
- 의도적으로 안 한 것(이유): ① Anthropic 프롬프트 캐싱 — 리수폿 모델 클라이언트(`data/pot/llm-client.js`, 자동 생성·수정 금지)가 프롬프트 전체를 사용자 메시지 한 덩어리로 보내 매 턴 달라지는 글이라 캐시 적중이 거의 없고 쓰기 비용만 늘어남. 필요하면 `tools/pot-patches.json` 패치로 시스템/고정 구간을 분리하는 설계부터. ② 롤링 요약 — Dusk 장면 기록(`sum`)과 겹침. ③ 정리 노트 재사용 캐시 서명 — Dusk에는 해당 캐시가 없음(코코아전트 전용). ④ 게이지·감정 HUD 호출 — 스킬 단계가 아니므로 주입 안 함(게이지는 기억 분석 호출에 얹히므로 analysis 스킬이 간접 적용됨). ⑤ 디버그 챗·별도 실행 검사기 — 호출 기록으로 대체.
- 확인 못 한 것: 실제 호스트에서 `nativeFetch` 응답의 `ok/text()` 형태와 검색 서비스별 CORS·응답(특히 DuckDuckGo HTML 형식은 바뀔 수 있음), 모델이 글 규약을 따르는지(JSON만 내는 단계에서 도구 호출 한 줄을 정확히 내는지), 도구를 켠 단계의 응답 시간. 테스트: `tests/websearch.test.js`, `tests/webtools.test.js`, 연기 시험 1건 추가. `npm test` 529 pass / 0 fail.

### Special thanks (v1.8.1)
- `ui/screens/tools.js` `CREDITS`에 cocoA(gent!)(https://arca.live/b/characterai/179542646?p=1)·HypaPlus(…/180803492) 카드, RisuTide 카드에 글 링크(…/186759072), `ui/styles.js` 색상, README 'Special thanks'. 사용자 확인: cocoA(gent!)·HypaPlus·RisuTide 모두 공식 병합(허락 받음) → 카드는 'PORTED WITH PERMISSION'. 코드는 형식 규격 기준으로 새로 작성(복사 없음). 아카라이브 v1.8.1 글(`docs/arca/v1.8.1.html`)에도 같은 땡스 박스를 넣을 것(글은 릴리스 시점에 사용자 지시로 작성).

### 화면별 둘러보기 (v1.8.1, CHANGELOG 반영)
- `ui/tour.js`: `runTour(ctx, steps, {label, doneLabel, skipMissing})` 공용화(처음 둘러보기 `openTour`는 그 위에서 동작·동작 그대로). 단계: `{icon,title,text,target:[css],tab,el,action:{label,onClick}}`; `el`=직접 넘긴 요소, `action`=추가 버튼, `skipMissing`=없는 목표 건너뜀(화면별용).
- `ui/screentours.js`: `SCREEN_TOURS`(home·memory:home·memory:skills·characters·modules·cards·tools·settings), `screenTourSteps/runScreenTour`. 정의 없는 화면은 `tabs.js`의 desc+help를 한 장으로. **새 화면 추가 시 여기에 단계와 CSS 선택자를 넣을 것**(선택자는 기존 클래스/id, 스킬 화면은 `data-tour`).
- 바뀐 곳: `ui/app.js` ? 버튼(`toggleHelp`→`runScreenTour`, 옛 `.rb-help` 팝업 제거), `memory/guide.js`(`showGuide`는 ? 버튼이 든 카드를 강조·`처음 설정 다시 보기`는 `action`), `memory/embeddingguide.js`(임베딩 줄 강조+`임베딩 설정` 버튼), `cards/index.js`(stepsGuide→'카드 만드는 법 둘러보기' 버튼), `home.js`(`#rb-home-tour` 작은 버튼, 원래 만들어만 두고 안 쓰던 `foot`은 그대로 미사용).
- 간단 모드 손질: 기억 설정 카드 제목('기억 세부 설정'), 스킬 줄 문구, 스킬 화면 웹 도구·호출 기록은 `advFold`(고급).
- 안 바꾼 것(튜토리얼이 아니라 참고/기능이라): 캐릭터 편집기 도움말 패널(`editor.js HELP`), 플러그인 필드 도움말(`plugins.js`), 기억 처음 설정 마법사(`setup.js`, 실제 설정 단계), 도구·설정의 '이럴 땐 여기로' 길잡이 패널(`guidePanel`, 이동 메뉴).
- 테스트: `tests/e2e/smoke.entry.js`에 둘러보기 10건(단계 건너뛰기·하이라이트·동작 버튼·정의 검증·가이드 강조). `run-app`의 '[PC] 사이드바 순서'는 이 작업 전부터 실패.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu 화면에서 각 선택자가 잡히는지(특히 모바일 폭에서 가려진 칸은 건너뜀), 둘러보기 카드가 좁은 폭에서 강조 대상을 가리지 않는지 눈으로 확인 안 함.



- 코코아 탭: 사이드바 기억 섹션의 독립 탭 `cocoa`(tabs.js, ui/screens/cocoa.js → memory/skills.js `standalone`). 기억 홈 ‘코코아 · 스킬’ 행은 이 탭으로 이동. 간단 모드=토글+사용할 스킬(연출·집필에 붙임)+목록/편집, 고급 모드=단계별 붙이기·코코아전트 옮기기·웹 도구·호출 기록(advFold). 탭 이름 `코코아`.

- AI로 스킬 만들기: `engine/skillchat.js`(순수: 시스템 글·`<skill-file path>` 파싱·초안 합치기) + `data/skillguide.js`(SKILL_GUIDE 원문, 가이드 바꾸면 재생성) + `ui/screens/memory/skillchat.js`(코코아 탭 우하단 FAB·대화창·초안 미리보기·추가/ZIP/JSON). 모델은 페르소나 빌더의 AI 프리셋(`loadPB`)을 공유. 스트리밍 없음(응답을 한꺼번에 받음). 칩 넘침은 `.rb-skills` 스타일로 해결.
- 한계: 실제 AI 응답으로 만든 스킬의 품질·호스트 확인 못 함.

## 봇빌더 연동 · 로어북 규칙 설계 (v1.8.1, 버전 미변경)
- DA Interop 동작(actions) 확장: 스니펫 `da_interop:action:<id>` 요청 → B 플러그인이 1초마다 확인·실행(15초 지난 요청은 실행 안 함) → reg에 actionRev·actionResult. Dusk `data/plugins.js` sendAction/waitAction/runAction. **외부 저장소 Pyser08/dusk-atelier-interop의 interop-snippet.js·문서는 아직 안 바꿈** (src/data/interopSnippet.js가 앞서 있음).
- 봇빌더 연동판: `data/workshoppatch.js` patchWorkshop(원본 글 → 스니펫 + init()의 open·draft 동작 등록). 명령줄 `tools/compat/workshop-interop.mjs`. 봇빌더 v1.0.1에서 확인.
- 흐름: newbot.js `createBotAndEdit(tab:"ai")` → `ui/screens/workshoplink.js` startWorkshop(연동판이면 open 후 Dusk 닫기, 아니면 안내 창: Dusk에서 만들기/연동판 받기/열러 가기). 인계 `dusk.workshop.handoff.v1`(그때 봇 목록, 24시간). app.open → checkWorkshopReturn: 새 봇·편집한 봇(targetId) → 개발 목록 + 개발 탭(개발 모드 꺼짐이면 편집기). 새 봇이 없으면 원고(연동판=draft 동작, 원본=봇빌더 자동 저장 `risu-character-editor:v1:*`에서 인계 뒤 것) → 새 봇으로 가져올지 확인.
- 로어북 더스크화 규칙 설계: `dev/aibuild/lorerefine.js`. DUSK_GUIDE + 이번 일 안내, 40개씩, 답은 규칙·소속 확률만 남겨(readRefine) convertDesign로 검사, 실패하면 하나씩 넣어 문제 있는 것만 뺌(refineStep). 미리보기에서 항목별 선택(pickRefine).
- 검증: npm test 554/0, build·check 동일함, smoke(봇빌더 연동 6항목·더스크화 3항목) 통과. run-smoke에 fflate alias 추가.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① 연동판 봇빌더가 Dusk 요청으로 화면을 여는지(두 플러그인 창 전환 순서) ② 원본 봇빌더 자동 저장(3분 간격) 읽기 ③ 실제 AI 응답으로 만든 규칙 품질. 봇빌더가 자동 업데이트되면 원본으로 돌아감(Dusk는 안내 창으로 대체).
- 코코아 탭 화면 정리: 카드는 `rb-card bordered pad rb-sk-card`, 버튼 줄은 `rb-sk-bar`(`.rb-row`는 목록 줄 스타일이라 쓰지 말 것). 넓은·좁은 폭 다크 스크린샷 확인.

### 후속 (코코아 노출·둘러보기·봇빌더 순서)
- 홈 기억 타일/기억 개요 문구에 코코아 추가. TOUR_VER=3(코코아 단계 추가) → 업데이트·신규 모두 1회 자동, 이후 수동만.
- startWorkshop: Dusk를 먼저 닫고(L.open 전) 실패 시 ctx.reopen. 실제 리스에서 z-order 확인은 못 함.

### 후속 (지난 대화 분석 실패 — 낮은 추론 모델)
- memoryprompt.js: parseJson 복구(후행 쉼표·잘린 끝, people/scene 있을 때만), analyze 래핑 해제 + 재요청 2회. memoryrunner.js backfill: 일시적 오류 2회 재시도, 반환값에 reasons. UI 알림에 실패 이유. 실제 모델로는 확인 못 함(원인은 응답 형식·한도 추정).

### 후속 (모바일에서 리스 전체가 느려짐)
- gauge.js onDisplay: 메시지마다 store.getIndex() 하던 것을 ensureView 캐시로(게이지 정의 변경 시 view 무효화). watch.js MOD_EVERY 20s→60s. 실제 모바일 측정은 못 함(원인은 코드상 추정: 표시 훅이 메시지 수만큼 호스트와 왕복).

### 후속 (홈 장기 기억 전체 토글)
- home.js 기억 상태 줄(.rb-status) 오른쪽 끝 스위치(.rb-hall, withAll) → switches.setMemoryEverywhere. engine memoryswitch.js memoryGlobalOn 추가. 홈 화면은 e2e로 직접 확인 못 함(run-app은 기존 '사이드바 순서' 실패로 중단).

### 후속 (외부 부담 최적화)
- data/hookbus.js: main.js의 api 프록시가 add/removeRisuScriptHandler(input·output·display)를 종류당 호스트 훅 1개로 합침(기존 모듈은 수정 없음, 순서 유지·예외 격리). watch.js: 폴링 FAST 8s/SLOW 15s, 클릭 후 메뉴 확인 2s 이하. 실제 리스에서 체감 측정은 못 함.

### 후속 (탭 진입 시간)
- data/dbcache.js: 읽기 전용 getDatabase 캐시(TTL 20s, 동시 요청 합침, 복사본 반환, 쓰기 계열 호출·창 열기 때 비움). main.js 프록시가 api.getDatabaseCached/invalidateDbCache 제공, 화면 목록 읽기(dbRead)만 사용: 캐릭터 목록·모듈 탭 사용처 수·기억 봇 목록·플러그인 목록·봇빌더 상태·HypaPlus 감지·RisuTide 확인·편집기 봇빌더 확인. 편집·저장·감지 경로는 getDatabase(항상 새로 읽음). 프로파일(가짜 DB, 봇 150·모듈 40): 탭 진입 비용의 대부분은 getDatabase 복사(300~400ms)였음. 실제 리스 측정은 못 함.

## 추가 최적화 (외부 부담)
- lorerules.prepareReroll: 채팅 읽기 1회, display 디바운스 2500ms. memoryrunner.recentCheck: 채팅 1회 읽기.
- 실제 호스트 체감 속도는 미측정.
- 게이지 제안 기본값 on:true (engine/gauge.js newSuggestState). 기존 저장 상태는 유지.
- engine/loredusk.js referenceText + batchMessages/refineMessages reference 옵션, editor.js duskify에서 전달.
- referenceText 확장: draft 필드(desc 등) + 정규식·트리거 상세, 총 14000자 제한.

## 브랜치 (2026-11-02)
- v1.8.1 릴리스(c7643b1) 이후 변경은 feat/1.8.2에서 이어가요. CHANGELOG는 v1.8.2(개발 중) 구간. 버전(package.json)은 아직 1.8.1.
- engine/loredusk.js: keyFixes/cleanKeyString/plainWordsOfRegex/defaultConfirmWords, plan.keyFixes → applyPlan. UI loredusk.js 키 정리 카드(키만 정리)·미리보기 섹션.

### 이미지 태그 교정 (feat/1.8.2, 버전 미변경, CHANGELOG v1.8.2에 반영)
- 엔진 `src/engine/imgtagfix.js`(순수): `buildAssetIndex(names)`·`fixImgTags(text, idx, {unknown})`. 에셋 이름에서 구분자(점/첫 밑줄)를 추정해 캐릭터·옷·키워드로 나누고, 정규화 비교→오타(편집거리 ≤1~2, 유일할 때만)→옷 보정→`default` 대체 순으로 맞춘다. 한 태그에 합쳐진 키워드는 에셋 목록에서 가장 드문(=구체적인) 것을 고른다(`default`은 가장 낮음). 지침 원문 복사·없는 캐릭터는 삭제(`unknown:"keep"`이면 둠). URL·`{{…}}`·`=` 가 든 다른 속성 태그·이미 정확한 태그는 건드리지 않음(멱등). 같은 줄의 별개 태그는 합치지 않음.
- 연결 `src/data/imgtagfix.js`: output 훅(저장 전). 설정 `dusk.ui.imgFix`(기본 꺼짐)·`dusk.ui.imgFixUnknown`. `<img` 가 있을 때만 에셋 목록(`getCharacterFromIndex`의 additionalAssets + 켜진 모듈 assets; 모듈은 전역 `enabledModules` + 봇에 고정한 `character.modules` + 이 채팅의 `chat.modules`를 모두 합친다(모자라면 멀쩡한 태그를 지우므로 넉넉하게). 캐시 키는 봇·채팅 번호)을 20초 캐시로 읽고, 1.5초 안에 못 읽으면 그 응답은 그대로 둔다. 교정 내역은 콘솔 로그와 `recent()`(메모리 30건). 켜기: 홈 '이미지 태그 자동 교정'(`ui/screens/home.js`), `main.js`에서 `app.ctx.imgFix`.
- 봇을 바꾸면 에셋 목록 캐시를 버린다(현재 봇 번호를 매번 비교). 테스트 `tests/imgtagfix.test.js` 12건 + `tests/imgtagfix-hook.test.js` 2건. 검증: `npm test` 586 pass / 0 fail / 9 skipped, build·check "동일함", `run-smoke.mjs` 통과.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 ① output 훅이 스트리밍 조각마다 불리는지·저장 본문에 반영되는지 ② `getCharacterFromIndex` 응답에 additionalAssets가 있는지 ③ 에셋이 많은 봇(수천 개)에서의 속도. 못 고치는 것: 상황에 안 맞는 키워드, 감정 태그만 쓰는 편향(의미 판단 필요 → 별도 설계 필요).
- 개발 환경 메모: `npm ci`가 막혀서 `/opt/npm-tools/node_modules`의 esbuild·acorn을 `node_modules/`에 링크해 테스트·빌드함(eslint-scope는 없었지만 build·check는 통과).

#### 이미지 태그 2차 (feat/1.8.2)
- 엔진 보강 `engine/imgtagfix.js`: 키워드 맞추기 `pickKeyword`(정확→어간 `stem`→낱말 순서 무시→오타→낱말 포함·덧붙은 낱말 최소 1개), 확장자 제거, 이름 한쪽(`resolveChar` 낱말 부분일치, 유일할 때만), 대체 표정 `FALLBACK`(default·neutral·idle·normal, 없으면 태그 유지 `keep`), `opts.state`(직전 옷). 옷 결정 규칙(사용자 결정 '나'): 옷이 정해지면 옷을 지키고 없는 동작은 그 옷의 기본 표정. 새 export `readTags`, `sceneState`, `stem`.
- 알림 `engine/imghint.js`(순수): `hintForMessages(messages, idx)`→`{hint,state}`(이미지 태그를 쓰는 요청에서만), `presentChars`(최근 3개 응답의 태그 → 마지막 두 글에 이름이 나온 캐릭터, 최대 6명), `buildHint`(우선순위·직전 옷·태그·현재 옷 키워드, 같은 목록은 'same as', 2800자 넘으면 키워드 줄 생략), `insertHint`(마지막 user 앞 system, `HINT_MARK`로 중복 제거).
- 연결 `data/imgtagfix.js`: beforeRequest(type이 model일 때만)로 직전 상황을 뽑아 교정에 넘기고, 알림 켜짐(`dusk.ui.imgFixHint`)이면 요청 사본에 넣음. 교정만 켜도 직전 옷 기억은 동작. 에셋 캐시 5분(봇·채팅 키), 스트리밍 중(`genstate.recentlyStreamed`)엔 새로 읽지 않고 봇 번호 확인도 1초 재사용. 홈 토글 2줄.
- 테스트: `imgtagfix.test.js` 17, `imghint.test.js` 7, `imgtagfix-hook.test.js` 9. `npm test` 607 pass / 0 fail, build·check 동일함, smoke 통과.
- 확인 못 한 것: 실제 호스트에서 beforeRequest messages의 role 이름(assistant 외 char/model도 처리)과 마지막 user 앞 system 삽입이 모델별로 문제없는지, 봇의 editprocess 정규식이 기록 속 `<img>`를 지우면 직전 상황을 못 읽음, 알림의 실제 효과(모델이 따르는지).
- 3번(낱말 단서로 감정→동작 올리기)은 하지 않기로 결정(사용자, 2026-11-02). 1·2번만 사용.

#### 이미지 태그 3차 — 실제 지침 4종 대응 (feat/1.8.2)
- 사용자 제공 지침 4종(해리포터 `name_emotion_x`/`name_position.sex`/`이름_exception_neutral`, 젠레스 `Astra Yao_Sex_Missionary_Cum`, 이로하 `iroha_real_x`+스탠딩 `akira`, 블루아카 `Mika_smile`)을 `tests/imgtagfix-formats.test.js`로 고정.
- 고친 것(`engine/imgtagfix.js`): ① 점 구분 판단을 '점 2개 이름이 절반 이상 또는 90% 이상에 점'으로(키워드 속 점 `missionary.sex` 오판 → 정상 태그 삭제되던 문제) ② 구분자 없는 이름 = 이름만 있는 그림(스탠딩), 대체 그림으로도 사용 ③ 밑줄 형식 형태 감지(모든 키워드가 2~6가지 앞말·각 3개 이상 → 옷처럼; (나) 규칙 적용) ④ `fallbackOf`: 그림 1개뿐이면 그것(예외 캐릭터), 끝 낱말 default(`emotion_default`) ⑤ 이름 속 `'`·`&` 보존(SPLIT에서 제외), 조각 해석 실패 시 통째 해석 결과 사용 ⑥ 합친 태그 동률이면 뒤 키워드(감정+동작 순) ⑦ 지침 자리표시 `[Name]`·`[tag]`·`[emotion]`…와 꺾쇠 원문 `<img="<…>_<…>">` 삭제. 알림: 스탠딩 캐릭터 'name only'.
- 한계: 의미 규칙(해리포터 TS 정체성 전환, 이로하 'NSFW는 real만', 블루아카 '감정·스킨십은 따로 두 태그')은 판단 못 함. 이로하 virtual+NSFW는 (나) 규칙대로 virtual 기본 그림. 블루아카 합친 태그는 둘로 나누지 않고 하나(동작)만 남김.
- 검증: `npm test` 614 pass / 0 fail, build·check 동일함, smoke 통과.

#### 이미지 태그 4차 — 명일방주 형식·모듈 여러 개 (feat/1.8.2)
- 명일방주(`Amiya_smile`, 이름에 밑줄이 든 `Amiya_Demon_King_sad`, `Kal'tsit_…`, NSFW `Amiya_missionary_sex`): 지침의 WRONG 예시 `Amiya smiling`(띄어쓰기) → 앞 낱말부터 캐릭터 찾기(`resolveIn` 낱말 분할), `Amiya_missionary`(뒷말 빠짐) → 동률이면 목록에서 가장 흔한 끝말(`sex`)을 고름(`pickKeyword`, 뚜렷할 때만).
- 모듈 여러 개: `buildAssetIndex`가 묶음 배열([봇, 모듈1, 모듈2…])을 받아 묶음마다 이름 규칙(점/밑줄·형태)을 따로 판단(`parseGroup`), `idx.modes`가 섞이면 `resolveToken`이 두 규칙으로 다 읽어 실제로 맞춘 결과를 우선. `data/imgtagfix.js` `readNames`가 모듈별 묶음을 넘김. 모듈 수 제한 없음(전역+봇 고정+채팅 지정 합집합).
- 테스트: formats 10, hook 10. `npm test` 618 pass / 0 fail, build·check 동일함, smoke 통과.
- 한계: '아미야(마왕)를 Amiya로 쓰는' 같은 의미 오류는 못 고침. 연결 안 된 모듈의 캐릭터 태그는 없는 캐릭터로 보고 지움(설정 `dusk.ui.imgFixUnknown=keep`이면 둠, 아직 화면 토글 없음).

#### 이미지 태그 알림 — 태그 고정 방지 (feat/1.8.2)
- `engine/imghint.js`: ① 문장을 '유지하라' → '직전 상태일 뿐, 동작·단계가 바뀌면 바꾸고 끝나면 감정 태그로' ② `sceneState`의 `streak`(같은 태그를 연달아 쓴 응답 수) ≥3이면 'used in N replies in a row — change it if the scene moved on' ③ `age`(마지막 응답 기준 몇 번째 전) >1이면 '마지막 태그' 줄 생략, 옷만 알림. 교정용 옷 기억(state.outfit)은 기간 제한 없음. 테스트 imghint 10.
- 장기기억 분석에 장면 상태 얹기(4·5번)는 하지 않기로(사용자 결정).

#### 버그: 임베딩 '기본으로 사용' 스위치 (feat/1.8.2)
- 원인: `ui/kit.js` `switchEl`은 스스로 모양을 바꾸지 않음(호출 쪽이 `setSwitch` 해야 함). `memory/embedmodal.js`가 값(f.on)만 바꿔서 화면은 계속 꺼짐 → 켠 것처럼 안 보이고, 켜진 상태에선 클릭마다 false만 나와 끌 수 없었음. 같은 문제: `devtools.js` 패치 만들기의 `row2` 스위치 2개. 둘 다 `setSwitch(el, v)` 추가.
- 테스트: `tests/e2e/smoke.entry.js` '임베딩 스위치' 3항목(수정 전 2개 실패 확인). 다른 `switchEl` 사용처는 setSwitch·aria-checked 직접 변경·redraw로 처리하고 있음을 확인(editor.js set은 redraw, promptstab edit은 paint).
- `npm test` 621 pass / 0 fail, build·check 동일함, smoke 0 실패. 실제 RisuAI에서 저장 후 임베딩이 실제로 쓰이는지는 미확인(저장 로직 자체는 변경 없음).

#### 다음 작업 예정: 도구 탭 '에셋 태그 고치기' (보조모델, 수동)
- 사용자 결정: 범위는 직접 고르기(최근 N개 응답) · 미리보기 후 적용(되돌리기 포함) · 보조모델은 상황 판단까지 · 평소엔 작동 안 함(버튼 누를 때만).
- 결정: (다) 창에서 '엔진이 못 고친 것만 / 상황까지 전부' 선택. → 아래 '구현됨' 참고.
- 설계 메모: ① 엔진(`fixImgTags`) 먼저 → 남은 것만 보조모델에 (태그 앞뒤 문단 + 현재 태그 + 그 캐릭터·옷의 실제 키워드 목록만 전송, 채팅 전체 X) ② 답한 태그는 에셋 색인으로 재검증, 없는 이름은 버림 ③ 저장된 채팅 메시지를 바꾸므로 미리보기·되돌리기 필수 ④ **장기기억 식별 주의**: `messageIdentity`가 본문 전체 해시라 태그만 바꿔도 다른 메시지로 인식 → 고친 메시지의 앵커(at·h·mid)를 새 해시로 옮기는 처리 필요(`memoryreconcile.js` 레거시 마이그레이션 방식 참고) ⑤ 모델은 기존 보조모델 선택(`modelhub.js`) 재사용.

#### 구현됨: 도구 탭 '에셋 태그 고치기' (feat/1.8.2)
- 엔진 `engine/assetfix.js`(순수): `scanReplies`(응답별 태그 분류 exact/case/fuzzy/merged/default/keep/template/unknown, unresolved=default·keep·repeat(3연속), 범위 앞 응답으로 직전 옷 기억) · `aiItems`(mode unresolved|all, 최신부터 MAX_ITEMS 80, 키워드 목록은 sets로 공유, 태그 앞 360·뒤 220자 문맥) · `aiMessages`(봇 규칙 botRules) · `parseAiReply`(그 항목의 실제 키워드만, 같으면 버림, notes) · `changeRows`(AI 제안이 엔진 결과보다 우선) · `applyRows`(고른 줄만, 혼자 있는 줄 삭제 정리) · `renameIds`(기억 폴더 식별자 문자열 교체). `imgtagfix.js`에 `tagSpans`·`renderTag`·`resolveTag` 추가, keep 결과에 char 포함.
- 데이터 `data/assetfix.js`: `loadRange(api,n)`(마지막 n개 AI 응답 + 앞 3개), `applyFix`(다시 읽어 미리보기 뒤 바뀐 응답은 건너뜀, `setChatToIndex`, 기억 폴더가 있을 때만 `messageIdentity` 옛→새 교체, 되돌리기 기록 `dusk.assetfix.undo.v1`), `undoFix`(같은 채팅이 열려 있어야, chatId로 찾음, 그 뒤 바뀐 응답은 건너뜀), `lastUndo`. 에셋 색인은 `ctx.imgFix.assetIndex()`(교정 기능과 같은 캐시·모듈 묶음).
- 화면 `ui/screens/assetfix.js` `openAssetFix(ctx, {runAI})`(모델 선택은 loredusk와 같은 목록, 설정 `dusk.assetfix.ui.v1`), `tools.js` 타일 `#rb-tool-assetfix`(동적 import).
- 테스트: `tests/assetfix.test.js` 7, `tests/assetfix-data.test.js` 4, smoke '에셋 고치기' 5항목. `npm test` 632 pass / 0 fail, build·check 동일함, smoke 0 실패.
- 확인 못 한 것: 실제 RisuAI·RisuBard·PocketRisu에서 `setChatToIndex`로 바꾼 응답이 화면에 바로 반영되는지(새로고침 필요할 수 있음), 실제 보조모델이 JSON 형식을 지키는지·판단 품질, 아주 긴 채팅에서 `getCharacterFromIndex` 지연. 저장된 채팅을 바꾸는 유일한 기능 — '원본 채팅 수정 안 함' 원칙의 예외(사용자 요청, 미리보기·되돌리기로 보완).

#### 기본 프롬프트 위치 통일 (feat/1.8.2)
- 규칙: Dusk의 모든 AI 호출은 `runAI`/`callModel`의 `withUserPrompts`가 '내 프롬프트'(기억 단계, 앞·중간·뒤)를 넣는다. 기본 프롬프트 1(앞)·2(뒤)는 그 목록의 기본 항목(`memoryturn.js` dusk-default-front/back-v1). **지침 글에 MEMORY_DEFAULT_PROMPT_1/2를 직접 붙이지 말 것**(중복·위치 깨짐).
- 바뀐 곳: `data/memory.js` `userPrompts` — 리수폿 설정을 못 읽으면 `DEFAULT_PROMPT_BLOCKS`(앞=1, 뒤=2), 목록이 비어 있으면(사용자가 지움) null. 직접 붙이던 `data/gauge.js` design, `dev/aibuild/core.js` 메시지, `ui/screens/personabuilder.js`(번역·대화 2곳)에서 제거. 장기기억 분석(`noUserPrompts`, 대상 채팅 기준 직접 끼움)은 그대로.
- 테스트 `tests/defaultprompts.test.js` 3. `npm test` 635 pass / 0 fail, build·check 동일함, smoke 0 실패. 실제 모델 응답 영향은 미확인.

## 릴리스 v1.8.2 (2026-11-02, 사용자 지시)
- 릴리스 전 점검으로 추가 수정: 감정 이미지(`emotionImages`)도 에셋으로 읽음(빠지면 정상 태그가 지워질 수 있었음), 그룹 채팅은 교정 안 함, 상황 알림은 최근 응답 20개만 읽음. 테스트 3건 추가(`npm test` 638 pass).
- `package.json` 1.8.2, CHANGELOG `## v1.8.2 (2026-11-02)`(새로 생긴 것/바뀐 점/가벼워진 점/고친 점으로 정리), 아카 글 `docs/arca/v1.8.2.html`(태그 자동 교정이 중심, 시리즈 20편, v1.8.1 글 https://arca.live/b/characterai/187757569).
- feat/1.8.2 → main 빨리감기 머지 → release.yml이 v1.8.2 릴리스 생성.
- 다음 작업은 새 브랜치에서(사용자 지정 필요).

## v1.8.3 개발 중 (feat/1.8.2 브랜치에서 이어서, package.json은 1.8.2 그대로)
- 옷 규칙 변경(사용자 결정 2026-11-02): **동작 우선** — 옷에 없는 키워드는 그 키워드가 있는 다른 옷으로(`engine/imgtagfix.js` resolveIn, kind "outfit"). 어느 옷에도 없으면 그 옷의 default. 이전 (나) 규칙 문구는 모두 이걸로 대체.
- 에셋 태그 고치기: AI 키워드 목록이 그 캐릭터의 모든 옷 키워드(중복 제거), 답은 같은 옷 우선 → 없으면 그 키워드가 있는 옷. 상황 알림 문구에 'action only in another outfit → use that outfit' 추가.
- 테스트 갱신·추가, `npm test` 640 pass / 0 fail.
- (2026-11-02) 사용자 지시로 **v1.8.2 재릴리스**에 포함: CHANGELOG의 v1.8.3(개발 중) 항목을 v1.8.2로 합침, 아카 글 1-2를 '옷보다 동작이 먼저'로, 3-3 문구 수정. release.yml 주석 한 줄로 재실행(같은 버전 → 파일·설명 교체).

## 다음 후보: 장기기억이 사람 사이 커뮤니케이션을 더 잘 반영하게 (사용자와 검토 중, 2026-11-02)
- 확인한 현황: 감정 수치(`engine/memoryemo.js`)는 시간 감쇠 없음 · `attr` 종류는 pref|rel|job|home|belief 5가지(외모·성격 없음) · 거짓말/잘못된 믿음 기록 없음(`know`는 '누가 아는가'만) · 호칭·말투는 리수폿 위키 `core.speech`에만 있고 Dusk 분석엔 없음 · 재등장 공백 표시 없음 · 변화는 `memorytrust.js` classify/chain → 주입 때 `changeNote` "(was: …)".
- 후보: ① 외모·성격·처지 attr 추가 ② 재등장 공백 표시 ③ 변화 이전 기록 '(예전)' 표시 ④ 감정 식기(종류별 속도, 큰 사건은 느리게) ⑤ 잘못된 믿음/거짓말 기록 ⑥ 쌍별 호칭·말투 상태 ⑦ 갈등·사과·앙금 항목 ⑧ '누구 앞에서' 태도. 모두 기존 분석 호출에 얹기(추가 호출 없음). 추천 우선순위: ④·⑥ → ⑤ → ①~③.
- 새 브랜치에서 진행 권장(사용자가 이름 지정).
- 추가 후보(인간다움): ⑨ 관계 진도(쌍별 단계 — 감정 수치·함께한 장면·비밀로 코드 계산, '너무 빨리 친밀해지지 않기') ⑩ 둘만의 추억·농담(분석이 가끔 표시, 그 쌍이 함께 나오면 하나 주입) ⑪ 기억 흐려짐(잊기 전 단계에 '(흐릿한 기억)' 표시, 코드만) ⑫ 인물 목표(바라는 것/막는 것 1개) ⑬ 기념일(이야기 시간과 사건 날짜 일치 시 한 줄, 코드만) ⑭ 첫인상(첫 만남에만 기록, 얕은 관계일 때만 주입).
- 기준 모델: 사용자는 보조모델 하한을 DeepSeek V4 Flash로 봄 → 새 분석 항목은 짧은 규칙·한 줄 예시·'없으면 생략'·항목별 독립 검증(망가져도 기존 people/scene 유지), 판단이 어려운 ⑤는 기본 꺼짐 스위치.
- 추천 1차 묶음: ④ 감정 식기 · ⑥ 호칭·말투 · ② 재등장 공백 · ⑨ 관계 진도 · ⑪ 기억 흐려짐 · ⑩ 둘만의 추억.

# feat/1.8.3 — 사람다운 기억 (진행 중, 2026-11-02 사용자 지시)
범위: ①외모·성격·처지 변화 ②재등장 공백 ③변화 이전 기록 '(earlier)' ④감정 식기 ⑤거짓말·잘못된 믿음(기본 꺼짐) ⑥호칭·말투 ⑨관계 진도 ⑩둘만의 추억 ⑪기억 흐려짐. 추가 AI 호출 없음.
설계:
- 새 순수 모듈 `engine/memoryhuman.js`: 감정 실효값·식기(종류별 반감기, 바닥값), 재등장 공백, earlier 집합, fading, 관계 진도(공유 장면 수 + 애정·신뢰), talk/bond/belief 검증·반영·되돌리기(src, prev), 분석 입력·주입 문장, 분석 규칙 문장.
- 저장(폴더에 새 키, 기존 형식 변경 없음): `folder.talk[from>to]={from,to,call,tone,prev,src,at}`, `folder.bonds[]={id,a,b,moment,hook,at,src,used}`, `folder.beliefs[]={id,who,thinks,truth,by,open,src,at}`.
- 분석: attr 종류에 look·trait·status 추가, `talk`(최대 2, 처음·바뀔 때만), `bond`(중요 응답에서 최대 1), `belief`/`cleared`(설정 켤 때만 규칙·입력 포함). 입력에 talkState·beliefs.
- 감정 식기: 저장값은 분석 직전에 실효값으로 내려 적고(log why "cooled"), 주입·분석 입력은 실효값. 실제 변화(log why≠cooled) 기준 경과로 계산.
- 설정(memory inject): human(②③⑨⑪, 기본 켬) · cool(④, 기본 켬) · beliefs(⑤, 기본 끔). 화면은 기억 고급 설정(madv.js).

## feat/1.8.3 결과 (2026-11-02)
- 구현: `engine/memoryhuman.js`(위 설계 그대로) + 연결: `memoryprompt.js`(규칙 `humanRules`를 본문에 넣은 뒤 `withCustom(custom, base)`로 앞·중간·뒤 적용 — 게이지 규칙이 '뒤' 프롬프트 뒤에 붙던 기존 문제도 함께 해결, 입력 talkState·beliefs·beliefsOn, `validate`→`human`), `memoryapply.js`(applyAnalysis `cool` 옵션: coolEmo 후 applyEmo, applyHuman), `memoryreconcile.js`(revertHuman), `memoryemo.js`(emoForPrompt·emoLines에 `{now, eff}`), `memorytrust.js` ATTR_CATS look·trait·status, `data/memoryrunner.js`(coolOf·talk/belief 입력·cool 옵션), `memoryinject.js`(earlier/vague 표시, 재등장 공백, stage·talk·bond·belief 섹션 각 예산), `ui/screens/memory/madv.js` 스위치 3개(inject.human·cool 기본 켬, beliefs 기본 끔).
- 분석 지침 증가: 약 +100토큰(거짓말 켜면 +190). 주입은 해당 상황에서만, 기존 예산 상한 안.
- 테스트: `tests/memoryhuman.test.js` 11, `tests/memoryhuman-flow.test.js` 4, `prompt-position.test.js` 보강. `npm test` 655 pass / 0 fail, build·check 동일함, smoke 0 실패.
- 확인 못 한 것: 실제 보조모델(특히 DeepSeek V4 Flash 추론 끔/낮음)이 talk·bond·belief 형식을 지키는지와 판단 품질, 실제 대화에서 감정 반감기 값(적대 80·두려움 120·의존 240·애정 400 메시지)이 자연스러운지. 인물 위키 화면에는 talk·bonds·beliefs를 아직 보여 주지 않음(편집 UI 없음) — 필요하면 다음 작업.
- 리수폿 합친 호출(link.take) 결과에는 새 항목이 없음(그 경로는 사람다운 기억 분석 항목 없이 동작, 코드 계산 기능은 그대로 적용).

## 인물 위키 개편 (구현 완료, 2026-11-02, feat/1.8.3)
- 새 `ui/screens/memory/personv2.js` `personTabs(env,{r,doc,p,header,infoBlocks,logBlocks})` — `wikiview.js` personPage가 호출. 상태: `m.wkTab2`(sum|rel|info|log) · `m.wkWith`(관계 상대) · `m.wkFeelRev`.
- 탭 '요약 / 관계 / 상세 정보 / 기록'. 목업의 '달라진 점' 탭 대신 **'상세 정보'**(기존 위키 블록: 프로필·수치·기록 묶음·위키 패널). 달라진 점은 요약 카드 '이전과 달라진 점'에 표시. '기록' = 기존 관리(manage)·이야기 기록.
- 요약: 지금의 ○○(요약글+성격·처지·외모 칩) · 이전과 달라진 점 · 관계 한눈에(4칸 막대, 누르면 관계 탭) · 기억에 남은 순간(A~D, 예전 모습/흐릿한 기억).
- 관계: 상대 고르기 → 관계 진도 · 감정(식기 전 흐린 막대·식은 안내·반대 방향 보기·고치기=setTag) · 호칭·말투(고치기/직접 적기·잠그기·지우기) · 둘만의 추억(고치기·지우기) · 기대 차이 · 오해(진실을 알았어요·지우기).
- 엔진: `engine/memoryhuman.js` 끝 nowOf·counterparts·pairView·changesOf·currentAttrs·momentsOf + 편집 setTalk·toggleTalkLock·deleteTalk·editBond·deleteBond·resolveBelief·deleteBelief(사용자 수정은 user/lock 표시, src 제거). 시험 `tests/memoryhuman-view.test.js`.
- 수치·게이지: `wikiview.js`가 `parts.metrics`(doc.metrics → label·대상 이름) · `parts.gauges`(=`gaugeui.js` `gaugeRows`, 비동기)를 넘김. 요약 '수치 한눈에'(전부) · 관계 탭 '수치'(대상에 그 상대가 있는 것만) · 감정 카드 '아직 없음' 줄. 원래 카드(수치 상태·감정 게이지·게이지 블록)는 상세 정보에 그대로.
- CSS: `styles.js` `.rb-wk2-*` 블록(토큰만). `@container memwrap (min-width:1100px)`에서 요약 칸 고정 + 탭 칸 2열(요약 탭 숨김).
- 단어: 사용자 지시로 "일반적으로 알아들을 수 있을 정도"(관계 진도·감정·호칭·말투·둘만의 추억·기대 차이·오해).
- 확인: 실제 앱(tests/e2e/app.entry.js 기억+기록 데이터에 사람다운 기억·게이지 추가)으로 모바일 390px·PC 1440px 모든 탭 사진. 참고: 실제 앱 창은 PC에서도 기억 영역이 1100px 미만이라 '요약 왼쪽 고정' 2단은 거의 안 보이고 탭으로 동작. 이전엔 Playwright 가짜 데이터로 390px·1300px 사진(가로 넘침 없음, 오류 없음). 실제 RisuAI/RisuBard/PocketRisu 화면·실제 데이터로는 미확인.

## 1.8.3 추가 (2026-11-02): ⑦ 갈등·사과·앙금 · ⑧ 사람 앞 태도 · 상세 정보 탭 정리
- 엔진 `engine/memoryhuman.js`: 분석 `rift`(최대 1: id?, a, b, about, state open|apologized|resolved, grudge none|some|deep, who) · `face`(최대 1: who, to, alone, public). 저장 `folder.rifts[]`(back/src로 되돌리기, 깨끗이 화해=닫힘, 'some' 앙금은 화해 후 GRUDGE_FADE=200응답 뒤 주입 안 함) · `folder.faces{who>to}`. 분석 입력 `rifts`(열린 것), 주입 섹션 rift·face(장면에 둘 다 있을 때, 3명 이상이면 '다른 사람 있음'). 스위치는 inject.human. 규칙 길이 680자(시험 상한 700). 편집 resolveRift·deleteRift·setFace·deleteFace(잠금). 시험 `tests/memoryhuman-rift.test.js`.
- 관계 탭(`personv2.js`): 갈등 카드 · 사람 앞 태도 카드.
- 상세 정보 탭: 새 `ui/screens/memory/infotab.js` `infoTab(env, B)` — `wikiview.js` personPage가 `info: (go) => infoTab(...)`로 넘김(예전 profileBlock·metricCards·emoCards·secCard·blocks 삭제). `gaugeui.js`에 `gaugeSuggestBox`. 빈 항목 칩 → 채우기 창(좁은 화면은 아래 시트, `:has` 미지원이면 가운데 창). 'AI로 빈칸 채우기'는 기존 fillPlan(이 인물만: 빈 수치·성격) 그대로 — 빈 기록 묶음까지 한꺼번에 채우지는 않음.
- 레이아웃: 위키 페이지는 `memwrap` 컨테이너 안이 아니었음(→ 예전 `@container memwrap` 규칙이 안 먹던 원인). `.rb-wk2`를 `container:wk2`로 두고 상세 정보 2열은 `@container wk2 (min-width:760px)`, 요약 고정 2단은 `(min-width:1100px)`.
- 시험: smoke의 감정·게이지 확인 4개가 첫 위키 개편(35566f2)부터 실패하고 있었음(정보가 탭 뒤로 옮겨짐) → 새 구조로 고침, smoke 53/0. `run-app` 사이드바 순서·`run-memed` '기억 방식 아래 편집기'는 main에서도 실패하는 기존 실패.
- 최종 디자인: 인물 위키 최종안 캔버스(탭 4개 모바일·PC). 구현은 여기에 갈등·사람 앞 태도 카드가 더 있음.
- (2026-11-02) 간단 모드 기억 화면에 '기억 옵션' 카드(`mhome.js` memOptions, 고급 모드에선 숨김): inject.human·cool·beliefs 스위치 3개(고급 '대화에 넣기'와 같은 설정, `builders().save`). 주의: human은 inject.plus(장부 넣기, 고급 전용·기본 켬)가 켜져 있어야 동작. `run-app.mjs` 3단계 '간단 모드 스위치 1개' 검사는 머리 스위치만 세게 바꾸고 옵션 3개 검사 추가 — 단, run-app은 그 앞 사이드바 검사(기존 실패)에서 멈춰 3단계까지 못 감. 직접 Playwright로 저장·다시 그리기 확인함.

## 다음 작업: 전체 탭 UI 다듬기 (사용자 결정 2026-11-02, 아직 시작 전)
- 범위: **전체 탭 한 번에** — 홈 / 기억(장기 기억 메인·상황·시간선·열린 항목·관계, 코코아, 기억 카드) / 관리(캐릭터·모듈·플러그인) / 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정). 인물 위키는 끝남.
- 방식: **목업 먼저 → 사용자 확인 → 구현**. 새 Design 캔버스에 탭마다 '지금 / 개편안' 모바일(390) + PC(1280). 기존 UI 스타일(토큰 --rb-*, 카드·칩)은 유지.
- 목표 스타일 = 인물 위키 최종안: 자주 쓰는 것만 카드 · 빈 것/드문 것은 칩·한 줄 · 고정/삭제 등 부가 동작은 '…' 메뉴 · 위쪽 바로가기(넓으면 왼쪽 목록) · 넓은 화면 2열 · 쉬운 말(일반적으로 알아들을 정도).
- 현재 화면 사진: `tests/e2e/app.entry.js`의 `bootApp(seed,{memory:true,story:true})`로 실제 앱을 띄워 찍는다. 모바일은 뷰포트를 7000px로 늘려 요소 사진, PC는 앱 창이 높이 고정이라 안쪽 스크롤 영역을 내려가며 찍어 PIL로 이어 붙임(sticky 요소는 static으로). 첫 둘러보기 '건너뛰기', 임베딩 안내 '나중에'를 먼저 닫아야 함.
- 결정(2026-11-02, 목업 1 확정): 홈은 PC·모바일 모두 개편안(상태 카드+숫자 3개·이어서 하기·최근 기록, 빠른 설정은 지금 토글 5개 그대로 — 공정한 전개·유저 편향 없애기·이야기 시간 자동 삽입·이미지 태그 자동 교정·상황 알림, PC는 오른쪽 열 최근 기록 아래)이되 **바로가기(작은 4칸)와 '처음 둘러보기'는 유지**. 기억·작업실(·관리) 개요는 개편안(목록형 행+한 줄 요약, 작업실은 자주 쓰는 둘만 큰 카드). **모든 화면의 ? 도움말 버튼은 유지.**
- 진행: 목업 1 완료(`docs/mockups/ui-polish-1-hubs.html`, 사진 뺀 가벼운 판), 다음은 목업 2(장기 기억 묶음).
- (이전 기록) 목업 1 제작. 이후 목업 2(장기 기억 메인·상황·시간선·열린 항목·관계, 코코아, 기억 카드) → 3(캐릭터·모듈·플러그인) → 4(꾸미기·AI 봇·AI 페르소나·도구·설정). 구현은 목업 확인 뒤. 소스 코드는 아직 안 건드림.
- 촬영 요령 실제: 환경은 `npm ci` 불가(lock 없음) → `/opt/npm-tools/node_modules`의 esbuild·acorn·@esbuild·playwright를 `node_modules/`에 심볼릭 링크. 앱 화면은 `bootApp({...},{memory:true,story:true})` 후 '건너뛰기'·'나중에' 버튼을 눌러 닫고 촬영(모바일 390 하위 화면은 개요 카드를 눌러 들어가야 함).
- 주의: ① 컨테이너 쿼리는 실제 조상에 그 컨테이너가 있는지 확인(위키는 memwrap 밖이었음) ② e2e는 마지막 줄이 아니라 `grep ✘` 전체로 확인 ③ 기존 실패: run-app '사이드바 순서'(여기서 멈춰 뒤 단계 미실행), run-memed '기억 방식 아래 편집기' — main에서도 실패.

## 설정 '이야기 도우미 세부' 설명 정리 (2026-11-02)
- `ui/screens/settingstab.js` 고급 '이야기 도우미 세부'에서 유저 편향 없애기·공정한 전개 설명 note 2줄 삭제(재해석/존중 segmented와 그 설명, 이야기 시간 설명은 유지). CHANGELOG v1.8.3 '바뀐 점'에 기록.
- 홈 개편 때 참고: 두 기능 설명(유저 편향=공정한 전개 켜져 있을 때만 작동, 공정한 전개=요청이 조금 길어짐)을 홈 토글 쪽(ⓘ 등)에 붙일지 사용자에게 확인 중. 재해석/존중은 고급 설정에 남기는 쪽으로 제안.
- (2026-11-02, 사용자 결정) 홈에서 공정한 전개 꺼짐 + 유저 편향 켜기 → 공정한 전개도 함께 켜고 토스트로 이유 안내(`ui/screens/home.js` setDice, fairCur·fairSw). 공정한 전개를 끌 때 유저 편향은 그대로 둠(요청 없음). 시험 `tests/e2e/run-home-fair.mjs`(수정 전 3개 실패 확인).
- 다음: 전체 탭 UI 다듬기 목업 2 = **코코아 · 기억 카드** 탭부터(사용자 지정).
