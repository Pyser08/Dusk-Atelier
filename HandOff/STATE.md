# 현재 상태 — feat/2.0.0

## 다음 작업: 기능 애드온 분리 (2026-11-06 확정 — 새 챗에서 시작)
- 묶음·크기·의존: 프로젝트 문서 claude/addon-plan.md. 장기기억·관계도 / 기억카드(+cardassets, 장기기억 필요) / 에로싱크(장기기억 필요) / AI로 봇·페르소나 만들기 / 위젯 / 채팅테마 만들기. **코코아·ProtLink+는 코어에 남김.**
- 규칙: 애드온이 없으면 쓸 수 없는 것(탭·하위 화면·버튼·채팅 메뉴·위젯 칸·설정 행·안내/투어 항목·홈 바로가기)은 전부 그 애드온 쪽으로 옮겨서, 없을 땐 코어에 흔적이 안 남게(숨김). 데이터·설정 키는 그대로(애드온을 다시 받으면 이어서 쓰게).
- 순서: ① 로더 확장 — manifest `requires`(필요 애드온 같이 받기), 코어가 애드온에 넘기는 `ctx.lib`(dom·kit·icons 등, esbuild로 애드온 빌드 때 external→ctx.lib 매핑), 애드온이 탭·화면·메뉴를 코어에 등록하는 자리(registerTab 등) ② 채팅테마로 첫 분리 ③ AI 제작·위젯 ④ 장기기억·관계도 → 기억카드·에로싱크 ⑤ 2.0.0 첫 실행 때 쓰던 기능 애드온 자동 받기.
- 진행: ① 로더 확장(일부) — `src/ui/ext.js` `ctx.ext`(screen·row·slot 자리, add()는 되돌리기 반환), 코어 모듈 공유(`tools/build-addons.mjs`가 코어에 있는 모듈은 애드온에 넣지 않고 `globalThis.__duskLib`로 받게 빌드, 넘겨 줄 목록 `src/addonlib.gen.js` 자동 생성 — 바뀌면 코어 재빌드+minCore 올림). `requires`·첫 실행 자동 받기는 아직.
  ② 채팅테마 분리 끝 — `addons/chattheme/index.js`(v1.0.0, minCore 2.0.0, 84KB, 코어 모듈 7개 공유). 코어에서 tools.js 화면·줄, settings.js 꾸미기 버튼(slot look.mine)·스튜디오 칸(slot look.adv), tabs.js·tour.js 안내 글 제거. 시작 때 테마 적용(restoreActiveTheme)은 `data/themes.js`로 옮겨 코어에 남김.
  e2e `app.entry.js`는 기본으로 기능 애드온 소스를 켜고(`FEATURE_ADDONS`), `coreOnly`면 코어만. `run-addon-chattheme.mjs`(코어만/켬/배포 파일 14개).
  참고: `run-app.mjs`는 수정 전에도 실패(오래된 시험).
- 매 단계 끝: 애드온 없이 코어만으로 npm test·e2e 통과 + 애드온 켠 상태 e2e 통과 확인.

## 2026-11-05 애드온 로더 시험판 (버전 미변경)
- 설계: 프로젝트 문서 claude/addon-plan.md(1순위 방식). 애드온은 리스 플러그인 목록에 안 뜨고, Dusk가 받아 같은 iframe에서 `import(blob:)`로 켠다.
- 순수 `src/engine/addons.js`(parseManifest·cmpVer·pickUpdates·rowState) / 데이터 `src/data/addons.js` `createAddons(api,{core,ctx})`: boot(저장본으로 바로 켬, 3초 뒤 확인)·check(6시간마다, 바뀐 것만 받기·sha256 검사)·install·setOn·remove·되돌리기(prev). 훅 있는 애드온(`hooks:true`) 업데이트는 다음 시작부터(pendingRestart). 저장 키 `dusk.addon.index`·`dusk.addon.code.<id>`·`dusk.addon.prev.<id>`(getLocalPluginStorage→pluginStorage), 목록 주소 키 `dusk.addon.manifestUrl`(기본 feat/2.0.0 raw).
- 애드온 소스 `addons/<id>/index.js`(export activate(api, ctx) → {deactivate}) → `node tools/build-addons.mjs`로 `addons/dist/<id>.js` + `addons/addons.json`(sha256·주소) 생성, `--check`로 확인. 목록 원본 `addons/addons.src.json`. 시험 애드온 `hello`(켜지면 알림 + 햄버거 버튼).
- 화면: 설정 탭 '애드온 (시험)' 카드(`ui/screens/addonsui.js`). main.js에서 boot.
- 테스트: `tests/addons.test.js`(8), e2e `run-addon-loader.mjs`(리스와 같은 sandbox·CSP에서 실제 blob import), `run-addons-ui.mjs`(PC·모바일 12).
- 고침: v3 api의 getLocalPluginStorage()는 Promise로 와서 `d.setItem is not a function` → await 후 메서드 확인, 없으면 pluginStorage, 값은 문자열로만 저장.
- 고침: 버튼 콜백이 toast 반환값(DOM)을 돌려줘 호스트 복제 실패(`failed to post message to parent`) → 콜백·ctx.toast는 아무것도 돌려주지 않게, hello v0.1.1. 애드온 규칙: api에 넘기는 콜백 반환값은 복제 가능한 값만.
- 고침: 알림(ctx.toast)은 Dusk 창 안에만 떠서 창이 닫혀 있으면 안 보임 → 애드온 ctx에 openDusk(tab) 추가, hello v0.1.2는 버튼을 누르면 설정 탭을 연 뒤 알림.
- 2026-11-06 사용자 실기기 확인: 아이패드(WebKit)에서 받기·켜기·햄버거 버튼·Dusk 열기·알림 모두 됨 → blob import 방식 확정.
- 미확인: Firefox, 호스트별(RisuAI·RisuBard·PocketRisu) 차이, 실제 nativeFetch로 raw.githubusercontent 받기. 실패 시 대체 경로(자기 재조립·nonce script) 아직 없음.
- 다음: 실기기 확인 → 실제 기능 하나(작은 것)를 애드온으로 분리, 공유 코드(`ctx.lib`) 구조.

## 2026-11-05 버그 정리 (2.0.0 애드온 작업 전, 버전 미변경)
- 스크롤 튐: `src/ui/scrollguard.js` `installScrollGuard(win, main)`(app.js에서 설치). 안쪽 영역이 '불러오는 중'으로 짧아지거나 떼었다 다시 붙으면 스크롤이 0으로 가던 문제 — 영역별 마지막 위치를 기억해 되돌림. 사용자가 직접 굴린 스크롤·코드의 scrollTop=0/scrollIntoView는 존중, 버튼·링크 클릭 뒤 3초는 새 영역 되돌리지 않음(화면 이동). e2e `run-scrollkeep.mjs`(NOGUARD=1이면 버그 재현).
- 중복 스위치: 기억 고급(`madv.js` 대화에 넣기)의 사람다운 기억·감정 식음·거짓말 추적 제거(간단 '기억 옵션'에만), 예전 세부(`settings.js` renderGlobalSettings)의 기억 넣기 켜기·확장 기억 넣기 제거(고급 '대화에 넣기'에만). e2e `run-dupes.mjs`(탭별 같은 이름 스위치 검사).
- 미확인: 실기기(세 호스트·모바일 터치 스크롤), 하위 화면(봇 세부 설정 등)의 중복.
- 다음: 애드온 구조(프로젝트 문서 claude/addon-plan.md, 1순위 blob import 로더 PoC).


- 회귀(2026-11-05): `engine/regress.js`(regressSlice·regressCandidates·regressLine, 순수) · `data/regress.js`(createRegressChat: 새 채팅 append+chatPage 이동, risupotWikiScopeId=새 id, 폴더 먼저 쓰고 실패 시 deleteFolder) · `ui/screens/regress.js`(신비 창, .rb-rg 범위 CSS) · 진입: chatmenu `dusk-qt-regress`, people.js 더보기·인물 상세, wikiview 헤더. carried 기록은 at:null(주입 최근 제외 회피)·src/hs 제거(대조 되돌림 회피)·회귀자 ctx=always, memoryinject에 Regression 줄. Erosync 값은 옮기지 않음. 테스트 tests/regress.test.js, e2e run-regress.mjs(22). 실기기 미확인.
- 지난 대화 분석 함께 기록(2026-11-05): memoryrunner `backfillExtras`(settings.backfillExtras 기본 true) → link.backfillPot(묶음 끝 index를 auto.schedule)·backfillPotWait(waitForScope 10분)·backfillPotReady(potState+auto.enabled) — memoryturn rt 시작 시 채움. 끝나면 link.backfillErosync(main.js: Erosync 켜짐+read().people 비었을 때 profile start "full"). Erosync 턴 단위 기록은 planner pending 구조라 과거 재생 불가 → 성향 전체 분석으로 대체. 서버 분석 경로는 함께 기록 안 함. 리수폿 일괄: switches.setPotAll/potAllOn(potBots 초기화).
- 이어서 하기(2026-11-05): 회귀 창에서 전부 고르면 `engine/regress.js continueSlice`(폴더 전체 detach·carried, cursor/runs/undo 등 제외, 위키 scope 교체·automation 제거) → `createRegressChat(mode:"continue")`. UI 전체 선택 버튼(.rb-rg-all), 글자 CONTINUE. e2e run-regress 36.
## 2026-11-05 ProtLink+ 통합 (v1.9.2) — Dusk 방식으로 다시 만듦
- `src/protlink/protlink.js`: 원작자 제공 v1.0.0에서 **Proton 연결부만** 쓴다(`loadProtLinkDriver(api)` → `{G3, Sp, Ln, Pa, PZ, Ot}`; G3({kv}).open(url,signal,pw) → share{list,download,thumbnail}, Sp = 폴더 훑기). 원본 화면·앱 로직은 안 쓴다. `node tools/protlink-prune.mjs --write`로 쓰이지 않는 선언을 걷어 냈다(1089KB→912KB, 이름 기준 도달성이라 더 남기는 쪽으로만 틀림). 번들 6.3MB. 고지 `NOTICES.txt`.
- 업데이트 알림: `src/data/updatetoast.js`(retrytoast 방식, mainDom 권한, 실패 시 false→main.js가 앱 내 toast로 대체) + `engine/protlink.js updateMessage`. 실제 호스트(RisuAI/RisuBard/PocketRisu) 동작은 미확인.
- 순수 로직 `src/engine/protlink.js`(파일 종류·연결 후보 순위·스냅샷 비교), 데이터 `src/data/protlink.js`(링크 저장 `dusk.protlink.links.v1`, 설정 `dusk.protlink.settings.v1`, on 키 `dusk.protlink.on` 기본 켜짐, 확인·받기·연결). 원본 `protlink_plus` 켜져 있으면 시작 안 함.
- 화면 `ui/screens/protlink.js`(관리 탭 `protlink`, 플러그인 아래): 링크 추가(주소 → 파일 확인 → 종류·연결 항목 고르기), 목록(새 파일 배지·받아서 업데이트·확인·연결 바꾸기·이름·해제), 시작 확인 설정. 위젯 `protlink`(연결 항목·새 파일 배지, 누르면 탭 열기).
- 받기: 캐릭터·모듈은 `legacy.startWithFiles(files, {target:{kind,id}})` → 가져오기 창에서 연결 항목이 맨 위 후보(`File.protlinkTarget`, legacy.js `candidatesFor`). 플러그인은 파일 저장만(플러그인 목록 쓰기 불가).
- 테스트: `tests/protlink.test.js`, `protlink-engine.test.js`, e2e `run-protlink.mjs`(38), `run-widgethome.mjs`. 스페셜 땡스에 Erosync·ProtLink+ 추가.
- 미확인: 실제 Proton 링크 열기·받기·비밀번호 링크, 받은 파일의 가져오기 창 후보 순위(실제 .risum/.charx), RisuAI/RisuBard/PocketRisu 실기기, 모바일 실기기. 원본 플러그인 저장소의 링크는 자동 이전 안 됨.
- 참고: `run-app.mjs`(리수폿 탭 없음)·`run-tabs.mjs`·`run-hubs.mjs` 첫 항목은 이 작업 이전부터 낡아서 실패/중단.

## 2026-11-05 Erosync 검토 탭·NSFW 기본 칸 (v1.9.2)
- 엔진 `review.list/act`(duskReviewList/Act) → 컨트롤러 `review(op,id)` → `erosyncreviewui.js`(검토 탭). 선호 후보(preferenceState)는 검토 대상 아님.
- 기본 developmentMode = standard_auto(저장값 없는 사용자만 영향). 극단 행동 수위 select는 NSFW+에서만.
- NSFW 탭은 정보 없어도 기본 칸(personv2 `nsfw()`, `.rb-nsfw-base`). 파일 내보내기·불러오기는 인물 위키 ‘더보기’(`peopleMenuItems`).
- 미확인: 실제 호스트(RisuAI/RisuBard/PocketRisu)·실채팅에서 검토 반영/무시, 모바일 실기기 화면. `src/erosync/tape.js` 미사용(삭제는 지시 시).

## Erosync 전체 이전 — 1단계(저장·이전) 완료, 다음은 2단계
- 결정: 저장 키는 원본과 같은 `erosync_*`를 그대로 쓴다(`dusk.ero.v1.*` 이름 변경 안 함). 원본 사용자의 프로필·세션·봇 설정은 복사 없이 이어진다. 기기별 설정(`getLocalPluginStorage`)만 따로일 수 있음.
- `src/data/erosyncmigrate.js` `scanOriginalErosync(api)` — 원본 기록 개수 감지(읽기 전용, 삭제 없음). 테스트 `tests/erosyncmigrate.test.js`.
- 원본 플러그인이 켜져 있으면 시작 막는 동작 유지.
- 2단계 일부 완료: 장기 기억 홈에 "Erosync" 줄(`#rb-mem-go-erosync`, 관계도 줄 옆) → `memory` page `"erosync"`(`erosyncpage.js`: 원본 기록 감지 문구 + 기존 켜기 카드). 홈의 예전 카드는 제거.
- 수위 카드 완료: `erosynclevel.js`(SFW/NSFW/NSFW+, 극단 행동 수위 6단계, NSFW+ 재검사). 엔진 쪽 연결부 `content.get/set`(erosync.js, 허용 키만) → `data/erosync.js content(patch)`.
- 집착 방지 완료: 엔진 `duskGuard`(집착성 상한 clamp + 같은 대상 연속 목표 턴 초과 시 쉬는 턴 동안 pause, `commitPlannedGoals`/`effectiveProfileForDirector`), 저장 키 `dusk.erosync.guard`, 카드 `erosyncguard.js`. 기본 꺼짐.
- 인물 위키 NSFW 탭 완료(상세 정보와 기록 사이, 항상 보임): `personv2.js nsfw()` — Dusk 월경·임신(`parts.adult.cyc`), 성적 욕망·이상성향 후보(`wikiPanel(env,doc,{adult:true})`, 일반 패널에서는 제외), Erosync 성적 항목(`eroNsfwCard`, 켜짐일 때만). 상세 정보의 Erosync 카드는 8축만.
- 데이터 이전 구현 완료: `data/memoryfile.js`(buildMemoryFile/readMemoryFile/applyMemoryFile/clearErosyncData, 파일 kind `dusk-memory-data` v1), `memoryfileui.js`(장기 기억 홈 `#rb-mem-more` 더보기 → 내보내기·불러오기, 위험 구역 `#rb-erosync-clear`). Erosync 켜짐이면 잠깐 멈췄다 다시 켬. 테스트 `tests/memoryfile.test.js`.
- (결정 기록) Erosync "데이터"는 별도 카드 없이 장기 기억 고급의 설정 내보내기·가져오기(`advanced.js`)와 위험 구역 초기화(`madv.js`)에 합친다(Erosync가 꺼져 있어도 저장된 값은 남아 있으므로 엔진 `exportBackup`을 쓰지 않고 저장소의 `erosync_*` 키를 직접 읽고 쓴다. 내보내기에 항상 포함, 가져오기는 같은 키로 복원, 초기화에 "Erosync 값도 지우기" 선택[기본 해제, 켜져 있으면 먼저 끔]. 채팅별 기록은 `keys()` 지원 호스트에서만 찾음).
- AI 제공자 → Dusk 모델 허브 연결 완료: 엔진 `runProviderOnce`에서 기본 제공자(risu)이고 `host.runAI`가 있으면 그쪽으로(main.js `host.runAI` = Dusk `runAI`, stage `erosync-<role>`, noUserPrompts). Erosync 자체 AI 설정에서 다른 제공자를 고른 사람은 그대로 그 경로. 미확인: 실제 모델 호출·동시 호출 충돌(원래 risu 경로의 busy/preempt 처리는 거치지 않음).
- 월경 주기 합치기(방식: Dusk 우선): Dusk ‘월경·임신 기록’(features.openness.cycle && sexualDesireEnabled)이 켜져 있으면 엔진 `cycleOff()`가 참이 되어 Erosync 자체 주기가 쉰다(`flags.set({duskCycle})`, `createErosync cycleProbe` 30초마다 확인). 저장값은 건드리지 않고, Dusk를 끄면 Erosync 주기가 다시 일한다. 미구현: Dusk 날짜를 Erosync 주기 계산에 먹이는 것.
- 동작·분석 / 프롬프트 카드 완료: 엔진 연결부 `config.get/set`(허용 키 11개, normalizeConfig가 범위 정리)·`prompts.get/set`(promptOverrides, 칸 id·갈래 검증) → `data/erosync.js config()/prompts()` → `erosyncconfig.js`·`erosyncprompts.js`. 실제 엔진 대상 테스트는 `tests/erosync-vendor.test.js` 마지막 항목. 이펙트·소리·인트로·화면 배율 등 화면 설정과 시험 도구·초기화·고급 항목은 옮기지 않음(원본 창).
- 원본 UI 제거는 보류: erosync.js 2.6MB 중 화면 코드(약 26000~36800줄, 0.8MB)에 프로필 만들기·분석 실행·값 고치기·비하인드·시험 도구가 있고, Dusk NSFW 탭은 아직 읽기 전용이라 지금 지우면 기능이 사라진다. 먼저 NSFW 탭에 직접 고치기·AI 값으로·다시 분석 연결부를 만든 뒤 제거할 것(이펙트·소리 코드는 이미 쓰지 않음: tape 비움).
- 남은 일: 세 호스트 실기기 확인, 실제 모델 값 확인. (UI·카드·NSFW 탭·원본 UI 제거는 끝)
- 리수폿 성인 항목 기본값은 켜짐 유지(`src/engine/pot/settings.js:163`).

## 2026-11-04 Erosync 2차: 위키·관계도 연동 + 기억 방식 기본값 (버전 미변경)
- **원본 UI 제거(완료)**: `tools/erosync-prune.mjs`(acorn 도달성 가지치기)로 `src/erosync/erosync.js`에서 설정 창·이펙트·소리·관계망·열기 진입점(725문장, 982KB)을 걷어냄. 스텁: scheduleUiRefresh/uiWorkSchedule/openSettingsPanel/renderSettingsApp/scheduleCompatibilityUiRefresh. `ctx.openErosync`·`erosync.open`·`host.openRelmap`·설정 항목 등록 삭제. 엔진 본문을 다시 갱신할 땐 원본에 같은 명령으로 재적용. `tape.js`는 이제 미사용(삭제는 사용자 지시 대기). 번들 5.97→5.35MB.
- **Erosync 카드 위치**: 접힌 ‘설정/세부 설정’ 안(`settings.js` body)에 있어 안 보였음 → `mhome.js` `settingsCards`가 만들어 ‘기억 옵션’ 바로 아래(main 칸)에 둠(간단·고급 모드, 채팅 유무 모두). `settings.js`에서는 뺌.
- **리수폿 사용 스위치 이동**: `autotrackingbox.js`(고급 → 자동 기록 · 인물 추적)에서 빼서 `mhome.js` `settingsCards`의 ‘기억 옵션’ 박스 맨 아래로(열린 채팅이 있을 때만; `M.switches.setPot(cur.chaId, v)`, 상태는 `sw.pot.on`). 열린 채팅이 없으면 안 보임.
- **기억 방식 기본 `fast`→`accurate`**: `DEFAULT_SETTINGS.flow.mode`(memorystore.js)·`flowOf`/`setPotGlobal`/`stepsOf` 폴백·설정 화면(flowsettings)·시작 안내(setup)에서 ‘더 정확하게 (권장)’을 앞에. `DUSK_FOLLOW`에 `"flow.mode": { old: ["fast"] }` 추가 → 기록(`settings.edited`)이 없는 예전 fast는 새 기본으로 따라감. **직접 고르는 두 곳(flowsettings·setup)은 `noteEdits`로 `flow.mode`를 직접 수정으로 기록**(안 하면 고른 fast가 다음 읽기에 accurate로 되돌아감). 테스트 `memoryturn.test.js`의 `turnOn`·fast 직접 설정은 `edited`에 `flow.mode`를 넣도록 고침.
- **읽기 연결부**: 본체 반환 객체에 `read()`(= `duskReadSnapshot`)·`open()` 추가. `read()`는 원본 프로필 화면 경로(`getUiContext`→`contextProfiles`→`uiProfileViewOf`)를 그대로 써서 현재 봇·채팅의 인물(8축 원값/현재값·성적 축·선호·판정)·목표·경쟁·관계를 일반 JSON으로 돌려줌(3초 캐시, 쓰기 없음). `getUiContext`는 원본 UI 경로라 카탈로그 갱신 등 부수 효과가 있음(위키를 열 때만 호출). 컨트롤러 `read()/open()`(꺼져 있으면 `{ok:false, reason:"off"}`/false). `app.ctx.openErosync`는 Dusk 창을 먼저 닫고 연다(같은 iframe).
- **순수 함수** `src/engine/erosyncview.js`: `eroPerson`(이름·별칭이 정확히 같고 유일할 때만 맞춤)·`eroAxes`·`eroAdult`(SFW·비인물이면 null)·`eroGoalsOf`·`eroPair`·`eroRelmapLayer`·`eroRelmapData`(관계도 데이터에서 Erosync 층만 남김, `noUser`).
- **위키(1단계, 읽기만)**: `memory/erosyncwiki.js` + `personv2.js` — 요약 ‘지금 노리는 목표’, 관계 ‘Erosync 목표·경쟁’(Dusk 상대가 없으면 Erosync 상대별 카드), 상세 정보 ‘Erosync 성향’(8축, 바뀐 축은 옅은 막대로 원래 값, 성인 항목은 `<details>` 접힘). Erosync 꺼짐·이름 안 맞음이면 칸 없음. 고치기는 ‘Erosync에서 고치기’→Erosync 화면(저장은 `erosync_*` 그대로). **2단계(저장을 `dusk.mem.v3.*`로 옮기기)와 기록 탭 ‘성향 변화’는 미구현.**
- **관계도**: `relmap.js`에 ‘Erosync 목표·경쟁만 보기’ 칩(Erosync 켜짐일 때만). 인물은 이름·별칭으로 위키와 맞추고 못 맞춘 인물 수는 토스트. `canvas.js` `setData`가 `map.noUser`면 {{user}} 선을 만들지 않음. Erosync 화면의 ‘관계망’ 탭은 `bootErosync(api, host)`의 `host.openRelmap`이 있으면 안내 화면으로 바뀌어 `st.relmap.eroOnOpen`을 세우고 관계도를 열어 자동으로 Erosync 층을 켬(원래 은하 화면은 호출 안 됨, 코드만 남음).
- **배경음 제거**: `tape.js`는 `null`로 비움(본체가 문자열이 아니면 건너뜀) → 번들 7.1MB→5.9MB. 저장 복구 화면은 body 전체 대신 `.es-shell/.es-app`만 비움(Dusk 화면 보존).
- **겹치는 기능 정리(결과)**: ① 관계망 → Dusk 관계도로 일원화(위). ② 인물 성향 화면 → Dusk 위키 칸으로 읽기 연동(Erosync 자체 프로필 화면은 편집용으로 유지). ③ **월경 주기**: Dusk(`openness.cycle`, pot 코드 `cycle-tracking.js`는 자동 생성·수정 금지: 날짜 기반 프로그램 계산·임신 판정·위키 기록)와 Erosync(`cycleEnabled`: AI 관찰·장면 판단 반영)는 강점이 달라 한쪽을 자동으로 끄지 않고, **둘 다 켜지면 Erosync 카드에 겹침 안내**만 띄움. ④ **AI 제공자 설정**: Erosync는 자체 AI 탭(기본 ‘RisuAI 보조 모델’)을 유지. Dusk 모델 허브 연결은 `runProviderOnce`(erosync.js `providerId` 분기)에 `dusk` 제공자를 추가하면 됨 — 미구현.
- 테스트: `erosyncview.test.js`(5) · `erosync.test.js`(+read) · `erosync-vendor.test.js`(+read·관계망 분기) · e2e `run-erosync-ui.mjs`(PC·모바일 28: 관계도 버튼·자동 켜짐·위키 3탭·고치기 호출) · `run-erosync.mjs`(+겹침 안내). 
- 못 한 것/미확인: 세 호스트 실기기, 실제 모델로 `read()` 값(축·목표) 채워진 상태, `getLocalPluginStorage`가 플러그인별로 나뉘는지(원본 Erosync 데이터 이어받기), Erosync 화면이 Dusk 창과 같은 iframe에서 겹칠 때 실제 모양(Dusk 창을 닫고 여는 것까지만 구현).

## 2026-11-04 Erosync 격리 이식 (V0.9.1, 버전 미변경; CHANGELOG는 ‘(개발 중) v1.9.2’ 섹션)
- 원작자에게 제공받은 `Erosync V0.9.1.js`(36.8k줄, api 3.0)를 위젯 홈처럼 격리 이식. 기억 설정(전체 설정)의 ‘Erosync (NSFW 장면 강화)’ 카드에서 켜고 끔(키 `dusk.erosync.on`, 기본 꺼짐). **비용 안내 문구 포함**(`EROSYNC_COST_NOTE`). 성인 인물 한정 문구·검사는 사용자 결정으로 넣지 않음(Erosync에 원래 없음).
- 구조: `src/erosync/erosync.js`=원본 본문 그대로 + 3곳만 변경(머리말 `//@` 제거, 즉시실행 함수→`bootErosync(api)`, `R`을 api 프록시로 바꿔 `onUnload`를 가로챔 → 끌 때 `dispose()`가 원본 정리 함수를 부름), `tape.js`=배경음 base64 분리(886KB). `src/data/erosync.js`=컨트롤러(`createErosync`, 본체는 켤 때만 `import()`), `src/ui/screens/memory/erosyncui.js`=카드, `main.js`에서 `app.ctx.erosync`로 연결·`boot()`.
- 원본 `erosync` 플러그인이 켜져 있으면 시작하지 않고 안내(같은 요청 이중 주입·같은 저장 키 방지). 요청 훅(`addRisuReplacer`)이 없으면 시작 안 함. 켜기 실패하면 스위치를 되돌리고 저장값도 off.
- Erosync 자체 UI(채팅 ‘에로싱크’ 버튼, 리스 설정 ‘Erosync’ 항목, 관계 그래프)는 원본 그대로 동작. Dusk 주입(`[Dusk Memory]`)과는 별도 `beforeRequest` 훅 두 개가 나란히 돎(마커가 달라 서로 안 지움).
- 번들 크기 4.9MB → 7.6MB(+2.7MB) → 배경음 제거 뒤 5.9MB. 빌드 경고 1건은 원본의 중복 키 `model`(src/erosync/erosync.js 3890, 원본도 동일).
- 테스트: `tests/erosync.test.js`(컨트롤러 7) · `erosync-vendor.test.js`(실제 본체를 가짜 api로 올려 훅 등록·해제, 지문 5) · e2e `tests/e2e/run-erosync.mjs`(PC·모바일 14). npm test 1013 pass / 9 skip / 0 fail, check 동일함.
- 못 한 것/미확인: 세 호스트 실기기(특히 `getLocalPluginStorage`가 플러그인별로 나뉘면 원본 Erosync의 기존 데이터가 안 보일 수 있음 — 기존 사용자는 확인 필요), Erosync 설정 화면이 Dusk 창과 겹칠 때의 화면 겹침, 켜진 상태에서 Dusk 기억 훅과의 순서·토큰 합산. 비용은 안내 문구만(호출 수 제한 없음). 안내서(`docs/site/guide/memory.html`)·NOTICE.md 갱신함, CHANGELOG는 버전 지시가 없어 안 건드림.

## 2026-11-04 도구 → 용량 측정 (RisuMeter 참고, 버전 미변경)
- 사용자가 준 `risu-meter.js`(v0.6.0)를 분석해 **읽기 전용 측정 부분만** 새로 씀(코드 이식 아님 → NOTICE 불필요, 스페셜 땡스에 `RisuMeter`만 추가: tools.js `THANKS`, README, 안내서 start.html). 버린 것: 연결 편집 모달(전체 `setDatabase` fallback 위험 — 연결 편집은 기존 `modlinks.js`), 바로가기 4종, 자체 CSS·테마, 저장 방식 감지·전송/원본 기준 전환(추정 상수 의존).
- 구조: 순수 `src/engine/sizemeter.js`(바이트·분해·렌더 진단·리포트) / 수집 `src/data/sizemeter.js`(`scanSizes`) / 화면 `src/ui/screens/sizemeter.js` + `sizemeter/css.js`(`SIZE_CSS`, styles.js에서 합침) / 진입 도구 탭 '확인·복구' 행 `rb-tool-sizemeter`(`ctx.go("tools","sizemeter")`).
- 읽기: 봇은 `characterOrder`로 순서를 얻고 `getCharacterFromIndex`를 4개씩 읽자마자 `measureCharacter`로 크기만 남기고 버림(전체 `getDatabase(['characters'])` 안 씀). 채팅은 한 번만 직렬화. 모듈·플러그인은 한 번의 `getDatabase`. Dusk가 꺼 둔 모듈(`rbm:disabledModules:v1`)은 `parked`로 포함하고 그 키는 저장소 목록에서 뺌(중복 방지). 저장소는 `storageKeyList`+`storageGet`을 6개씩.
- 활성 판정: 글로벌(`enabledModules`) · 캐릭터 연결 · 채팅 연결 · 네임스페이스(`moduleIntergration`) 중 하나. 없는 모듈 id(고아)는 캐릭터의 '연결된 모듈'에서 제외.
- 렌더 진단 개선점: display 핸들러 **호출 범위 안**의 `getDatabase/getChar*`만 '고부하'(원본은 스크립트 전체). 주석은 지우고 문자열 안 `//`는 유지. 핸들러를 이름으로만 넘기면 고부하로 단정 안 함(score 2). 화면 감시는 `getRootDocument`+`MutationObserver`/`createMutationObserver`. 모듈은 Lua editDisplay·display 트리거·editdisplay 정규식(8개 이상이면 개입).
- 테스트 `tests/sizemeter.test.js`(16) · `sizemeter-data.test.js`(6, 동시 읽기 ≤4·쓰기 0·취소·저장소 실패), e2e `tests/e2e/run-sizemeter.mjs`(PC·모바일 28개). `run-work.mjs` 기대값을 도구 행 5개·땡스 8줄로 고침(땡스는 이전부터 낡은 값이었음).
- 못 한 것/미확인: 세 호스트 실기기에서 측정 시간·메모리(특히 큰 봇 수백 개), 호스트가 `getCharacterFromIndex`에 채팅 스텁을 줄 때의 크기 해석(스텁이면 채팅이 작게 나옴 — 화면 문구는 'JSON 크기 기준'), 기타 설정(페르소나·CSS)·프롬프트 프리셋은 측정 안 함.

## 2026-11-04 위젯 홈 원본 v1.0.34 병합
- 방법: 원본 v18·v34에 같은 1단계 변환(scratchpad의 port 스크립트)을 적용한 뒤 `git merge-file`로 우리 수정과 3방향 병합. 충돌은 core(themePreset·dusk + photoSlotsRevision), widget-layout(IDS 14개: 원본 realm·photo2·photo3 + Dusk 5개, ORIGINAL 기준 예전 배치 허용), home.js 6곳(툴바 옵션·extras 삽입·Editor 문서 어댑터·realm import·hideBox·dispose)을 손으로 합침. style.js는 v34 CSS로 다시 만들고 우리 수정(overflow-x:clip, overscroll 제거, 편집 CSS) 재적용.
- 새 `lib/realm.cjs`: 소개 창을 Shadow DOM에 붙임(`getRootNode`), 홈 영역 찾기는 전역이 없으면 `home-layout.cjs` require(실패해도 무시). 사진 2·3 파일 입력 복제본도 `sr`에 붙임. 포켓리스 문구 2곳 중립화.
- 원본 테스트 test_photos·test_realm·test_realm_download·test_realm_mobile 이식(`tests/widgethome-*.test.cjs`). test_realm의 dock 기대값은 우리 설정 시트(`openSheet`)로 바꿈.
- 다음에 원본이 또 오면: 같은 방법(1단계 변환 → merge-file). 변환 스크립트는 리포에 없음 → `HandOff`에 옮길지 결정 필요.

## 2026-11-04 채팅 메뉴 버튼 id
- `memorybutton.js` registerButton에 `id:"dusk-memory-button"`, 메인 햄버거 버튼 `id:"dusk-atelier-open"`. 포켓리스의 떠 있는 버튼 위치 옮기기·기억이 id 기준이라는 추정(기기 확인 필요).

## 2026-11-04 위젯 홈 설정 시트·색 테마
- `src/widgethome/sheet.js`: `PRESETS`(18개, 앱 팔레트 형식) · 시트 HTML/CSS · `createSheet`. 위쪽 설정/홈 꾸미기·독 홈 꾸미기·제목 연필이 시트를 연다(제목 연필은 홈 탭). 바꾸면 `setPrefs`로 바로 저장.
- 색: core settings에 `themePreset`. `applyColors`가 리스 색을 따르지 않으면 `presetById(themePreset).base`를 앱 팔레트처럼 써서 모든 위젯에 적용. ‘위젯마다 직접’ = themePreset 비움 + 예전 꾸미기 창.
- Dusk 설정 카드의 위젯 디자인·자동 열기·꾸미기 버튼은 사용자 요청으로 뺌(위젯 홈 안에서 바꿈).

## 2026-11-04 위젯 홈: 사이드바 옆 배치·Dusk 디자인
- `lib/home-layout.cjs` `mainPane()`: 포켓리스 홈이 아니면 `.risu-sidebar/.rs-sidebar` 오른쪽의 가장 큰 본문 요소를 홈 자리로(사이드바를 품은 감싸개 제외). `found.generic`이면 관련 링크·네이티브 컨트롤 안 씀. 프레임 찾기는 `iframe[srcdoc*="dusk-widgethome-open"]`(원본 플러그인과 구분), 속성 접두사 `x-dusk-wh-`. **리스·리스바드의 실제 클래스명(`.risu-sidebar`)은 기기 확인 필요**(PocketRisu 원본 코드가 쓰던 이름).
- `lib/auto-home.cjs` `isHome`: 포켓리스 제목이 없어도 캐릭터 미선택(index<0)+설정/대화상자 없음이면 홈.
- 바로 열기는 자동 감지 연결(`inst.ready()`, 최대 2.5초)을 기다린 뒤 아직 안 떴으면 연다.
- `dusk-style.js`: 설정 창 공통 스타일(스위치·알약 라디오·대화상자)과 `data-surface="dusk"`. surface 값 navy/glass/dusk. 대화상자 바깥 클릭 닫기. 인스턴스 `getPrefs/setPrefs/openSettings` → Dusk 카드(디자인 segmented·홈 자동 열기 스위치·위젯 꾸미기 버튼).
- e2e `tests/e2e/run-widgethome-host.mjs`(가짜 SafeDocument로 사이드바 옆 배치·캐릭터 선택 시 닫힘·홈 복귀 시 다시 열림·사이드바 크기 추적·Dusk 디자인·설정 창).
- 남은 것: Dusk 디자인에서 음악 재생 버튼·시계 바늘·하단 독 활성색 등 원본 고정색 일부는 파란색 그대로.

## 2026-11-04 위젯 추가·크기 조절·스크롤 유지
- 새 위젯 `src/widgethome/extras.js`(HTML·CSS·동작·순수 함수): dusk·dday·timer·dice·stats. `widget-layout.cjs` IDS 11개, `ORIGINAL`(6개)만 있으면 예전 배치로 인정하고 없는 새 위젯은 맨 아래에 붙임. 저장 키 ddays·dice·visits(같은 접두사). Dusk 바로가기는 `createWidgetHome({openDusk})` → main.js `app.open({tab})`.
- 크기 조절: hit의 오른쪽 아래 28px를 마우스로 잡으면 resize, `follow()`가 width/height calc로 따라감. 스냅 히스테리시스 0.65칸, 끄는 동안 격자 min-height 고정(스크롤 되먹임 방지), 가장자리 스크롤 48px·거리 비례.
- 스크롤 유지: `ui/dom.js` `replace()`가 `data-keep-scroll`(app main) 안에서 같은 화면(`data-view`=tab|sub, 첫 자식 data-page/class 같음)을 다시 그리면 `.rb-scroll`·main 스크롤을 복원(불러오는 중 화면을 거쳐도 기억).
- 관계도: `.rb-rm`에 padding(18px 22px, 모바일 12px 16px).
- 테스트 `widgethome-extras.test.js`, e2e 위젯 49개(크기 조절·되돌이 깜빡임·새 위젯·Dusk 바로가기).

## 2026-11-04 위젯 홈 수정(속도·스크롤·드래그·바로 열기)
- 스크롤: `:host`에 overflow-x:hidden/overscroll-behavior를 주면 호스트가 스크롤 상자가 돼 휠이 문서로 안 이어짐 → `overflow-x:clip`만 사용(style.js 머리 주석 참고). e2e가 휠 스크롤을 확인.
- 속도: `open()`이 목록(`reloadCatalog`)을 기다리지 않음(60초 안 캐시면 생략), `themeFollower.refresh`·`auto.configure`도 비동기. boot 때 `restore()`→`reloadCatalog` 미리 읽기. 느린 가짜 호스트(getDatabase 1.5초)에서 열기 1987ms→213ms.
- 바로 열기: `data/widgethome.js` `boot()`가 시작 뒤 `inst.open()`(키 `dusk.widgethome.onload`, 기본 켜짐, 카드에 스위치).
- 드래그: `lib/layout-editor.cjs` — `layout-hit`에 마우스·펜 pointerdown→`begin(move)`, `follow()`가 transform으로 손을 따라가고 `release()`가 놓을 때 해제(CSS transition으로 스냅). 터치는 hit이 `touch-action:pan-y`라 스크롤과 충돌하므로 ⠿ 손잡이만.
- 문구: h1 ‘위젯 홈’, `.related-links`는 `onPane`(포켓리스 홈에 겹칠 때)에서만 표시.
- 자동 열기(inline) 안 되는 원인 후보: 호스트의 화면 접근(`getRootDocument`) 권한이 Dusk 플러그인에 없을 때. 카드의 안내 줄과 위젯 홈 설정의 `.auto-status`에 이유가 뜸. 기기 확인 필요.

## 2026-11-04 {{user}} 표시·집단 이름 걸러내기
- `memory/common.js` `avatar`·`isMe`·`shownName`: {{user}} 동그라미는 `userLabel()` 첫 글자 + `data-me`(강조색, styles.js `.rb-mem-av[data-me]`). `people.js` 카드에 `me` 클래스·‘나’ 배지·맨 앞 정렬, 상세 제목도 표시 이름.
- `engine/collective.js` `isCollectiveName`/`COLLECTIVE_RULE`: 반·학년·동급생·…들 같은 집단 이름. 지난 대화 분석(`memoryprompt.js` 규칙 + `memoryapply.js` 필터)과 위키 writer(`tools/pot-patches.json`에 writer-prompt.js 패치 2개: import + 요청의 `dusk_character_rule`)에 적용. 원본 pot 소스가 없어 pot-split 재생성은 못 돌려 봄 → 다음에 원본이 있으면 패치 일치 확인.
- 로어북 읽기: `writerSearchExistingLore`는 이미 기본 켜짐(기존 인물을 찾는 용도라 집단 이름을 막지 못함). 그래서 규칙+필터로 처리.
- 테스트 `tests/collective.test.js`, e2e `tests/e2e/run-useravatar.mjs`.

## 2026-11-04 위젯 홈 이식 (PocketRisu 위젯 홈 v1.0.18, 격리 이식)
- 원본(사용자 제작, zip)을 `src/widgethome/`로 옮김: `lib/*.cjs`(원본 모듈 14개, require 경로만 .cjs로), `style.js`(원본 style.css의 :root/html/body → :host, `:host([hidden])` 추가), `home.js`(원본 view.js를 `bootWidgetHome(api, hostOpts)`로). 원본 대비 바뀐 곳은 home.js 안에서 `sr`(shadowRoot)·`hostEl`·`showBox/hideBox`·`dispose`를 찾으면 돼요. layout-editor에는 `document:{createElement, querySelector→sr}` 어댑터를 넘김.
- 격리: 문서 body에 `<div data-dusk-widgethome hidden>` + Shadow DOM. 위젯 CSS는 Dusk 화면에 새지 않음(e2e로 확인). 같은 플러그인 iframe을 번갈아 쓰므로 Dusk 창을 열기 전 `widgetHome.yieldToDusk()`로 위젯 홈을 닫음(`main.js`에서 `app.open` 감쌈). 위젯 홈을 Dusk에서 열 때는 `ctx.openWidgetHome()`(Dusk 닫고 열기).
- 켜고 끄기: `src/data/widgethome.js` `createWidgetHome`(키 `dusk.widgethome.on`, 기본 꺼짐). 설정 탭 맨 위 카드(`devtools.js` `widgetHomeCard`, 고급 모드 아니어도 보임) + 도구 화면 ‘위젯 홈’ 행. 끄면 `dispose`가 호스트 제거·메뉴 버튼 해제(`unregisterUIPart`).
- 메뉴 버튼 id `dusk-widgethome-open`(원본의 `pocketrisu-basic-home-open`과 다름). 원본 플러그인(`pocketrisu_basic_home`)이 켜져 있어도 Dusk 쪽이 그대로 동작하고, 카드에 끄라는 안내만 뜸. 저장 접두사 `pocketrisu.basic-home.v1.` 그대로라 기존 데이터를 이어 씀.
- 호스트 대응: 저장은 `getLocalPluginStorage`→`pluginStorage` 대체(원본 동작). `getRootDocument`·`createMutationObserver`가 없으면 자동 열기만 못 하고 메뉴 버튼은 됨(e2e: 최소 api에서 열림·경고창 없음). 자동 열기 감지(`auto-home.cjs` `isHome`)는 PocketRisu 홈 화면의 ‘PocketRisu’ 제목 + ‘Related Links/관련 링크’ + `getCurrentCharacterIndex()<0` 기준이라 **리스·리스바드에서는 화면이 달라 자동으로 안 열릴 수 있음(기기 확인 필요)**.
- 테스트: `tests/widgethome-*.test.cjs`(원본 4개 이식) · `widgethome-ctrl.test.js`(컨트롤러 9) · e2e `tests/e2e/run-widgethome.mjs`(격리·열기/닫기·정리·최소 api·설정 카드·도구 행, PC/모바일).
- 못 한 것: 세 호스트 실제 기기 확인(특히 홈 영역 배치·자동 열기·음악 파일 저장), 원본 design.js의 Butter Home v8 출처 라이선스 확인(NOTICE.md에 메모).

## 2026-11-04 프로바이더는 실험 기능으로만 노출
- `prefs.ui.experimental`(설정→실험 기능, `devtools.js` `experimentalCard`). 꺼짐이면: provider 탭 숨김(`tabs.js` `exp`·`tabHidden`), 꾸미기는 원래 자리(큰 카드), registrar·Dusk 자체 AI 경로 모두 막음(`createProvider({allowed})`, main.js `providerRef.exp`). 켜면 꾸미기는 도구로 이동(`hideWhenExp`). 한 번 등록된 이름은 리스를 다시 열 때까지 남음(removeProvider 없음).

## 2026-11-04 프로바이더(Dusk provider) 1차 구현 (버전 미변경, 미커밋 → 이 커밋에 포함)
- 계획 문서: 프로젝트 문서 `claude/provider-plan.md`. CPM v1.99.7·LBI-pre34-plus는 **기능·구조 분석만** 했고 코드는 가져오지 않음(CPM은 분석만 허락받음, UI·설정 가져오기 제외).
- 구조: 순수 `src/engine/provider/`(catalog·sse·messages·build·repeat·keypool·chain·cost·profile·transforms·tools·translate), 호스트 연결 `src/data/provider/`(keyvault·store·transport·gemcache·risutools·runner·toolexec·models·register·index), 화면 `src/ui/screens/provider.js`+`provider/{more,ui,css}.js`.
- 화면 이동: `look`(플러그인 꾸미기) 탭은 `hide:true`로 목록에서 숨기고(id 유지: 위쪽 팔레트·설정 링크 그대로) 도구 화면에 행 추가, 작업실 큰 카드는 `provider`. 숨김 필터는 app.js 3곳·sectionhome.js.
- Dusk 자체 AI 연결: 용도 `analysis` 프로필 지정 시 `engine/runai.js` `duskPickFor`가 보조 모델 호출을 프로필로 보냄, `modelhub.js` `serverModelOf`는 `provider.serverModel`(Vertex·Responses는 서버 직접 호출 불가 → 중계).
- (2026-11-04 화면에서 제거) 도구·검색·번역기 탭은 사용자 요청으로 화면에서 뺌. 엔진·runner·risutools·translate 코드는 그대로 남아 있고 설정 `tools.enabled`/`translator.enabled`가 기본 꺼짐이라 동작하지 않음(필요하면 more.js에 탭을 다시 달면 됨, git 이력 참고).
- 번역기 다듬기는 runner `handle`에서(서식 보호 토큰·용어집·안내문). `req.__purpose`/`req.__profile`로 용도·프로필 강제.
- 쓰기 도구 안전장치: 설정에서 따로 켬 · 매번 확인 · 바꾸기 전 백업(실패하면 중단, 되돌리기 목록에 뜸) · 요청당 3번. (웹 도구와 같은 요청에서 쓰기 막기는 **의도적으로 넣지 않음**, 화면에 경고 문구만.)
- 검증: provider-engine 29 · provider-runner 26 pass, e2e `run-provider.mjs` PC·모바일 통과. `run-look`은 꾸미기 진입을 `__app.ctx.go("look")`로 바꿈. `run-app.mjs`·`run-hubs.mjs`(기억 개요 3줄)는 변경 전에도 실패하던 낡은 기대값.
- **못 한 것/미확인**: ① 호스트 `addProvider` 실제 동작(RisuAI·RisuBard·PocketRisu) ② 실제 공급자 계정으로 호출 ③ iOS 백그라운드 ④ Bedrock·NovelAI 연결 ⑤ 배치(Anthropic·OpenRouter) ⑥ 참고자료 PDF 변환 ⑦ Cellar 경유 대화 전달(서버 분석만 연결됨) ⑧ 키 암호화·동기화 ⑨ 웹 검색 키는 pluginStorage(동기화될 수 있음) ⑩ Cellar 쪽 시험 추가 없음.
- 메인/보조: `cfg.subProfileId`(profile.js). resolve: 메인=봇별→메인, 그 밖=용도 지정→보조→메인. `analysisPick`(index.js)은 analysis 지정 또는 보조가 있을 때 Dusk 자체 AI를 프로필로 보냄(둘 다 없으면 기존 보조 모델 경로).
- OpenRouter 공급자 순서/폴백 입력(provider.js, `params.provider.{order,allow_fallbacks}`), 프리셋은 params 객체 값을 안쪽 키만 넣고 뺌(presets.js).
- 생각 강도: `thinking.effort` ∈ ""(안 보냄)·none·low·medium·high·xhigh 하나로 통일(build.js: OpenAI 그대로 / Claude 적응형+output_config, none이면 생각 끔 / Gemini 3=thinkingLevel·2.5=thinkingBudget 0). `mode`·`budget`은 고급의 토큰 예산용으로만 남음.
- 빠른 설정 프리셋 `engine/provider/presets.js`(프로필 params·headers·tier에 넣고 뺌, anthropic-beta는 쉼표로 겹침) + 연결 카드 모델 검색(화면 안에서만 거름). 프리셋을 늘리려면 PRESETS 배열에 항목 추가.
- 안내서 `docs/site/guide/provider.html` 추가, CHANGELOG는 v1.9.1 섹션에 적음(버전 올릴 때 옮길 것).

---

## 2026-11-04 기본값 변경 (버전 미변경)
- 기억 넣기 기본값: 목표 2000 · 상한 8000 · 이야기 요약 2000 토큰 (`data/memorystore.js` DEFAULT_SETTINGS, `engine/memoryinject.js` 대체값).
- 기존 인물 로어북 검색(`writerSearchExistingLore`) 기본 켜짐: 생성물 `engine/pot/settings.js`는 `tools/pot-patches.json` 패치로 바꿈(직접 고치지 말 것).
- **직접 안 바꾼 값은 기본값을 따라감**: `engine/defaultfollow.js`(`followDefaults`·`noteEdits`, 표 `DUSK_FOLLOW`·`POT_FOLLOW`).
  - Dusk 설정: 읽을 때 `memorystore3.js` `withFollow`가 적용, 직접 바꾼 키는 `settings.edited`에 기록(`ui/screens/memory/settings.js` save에서 `noteEdits`). 기록이 없던 예전 사용자는 값이 예전 기본값(1200/2500/600)이면 새 기본값으로, 다르면 직접 바꾼 것으로 기록해 지킴.
  - 리수폿 설정: `data/potstorage.js`가 읽을 때 적용, 저장 때 바뀐 키를 `idx.pot.edited`에 기록.
  - 기본값을 또 바꿀 때: DEFAULT_SETTINGS(또는 POT_DEFAULTS)를 고치고, 표의 `old`에 이전 기본값을 추가.
- 테스트 `tests/defaultfollow.test.js`. 검증: npm test 846 pass / 0 fail, build·check "동일함 (v1.9.1)", e2e smoke·memed 통과. `run-app.mjs`는 변경 전에도 같은 오류(`reading 'click'`)로 실패(기존 문제).
- 이 브랜치의 package.json은 아직 1.9.1. CHANGELOG는 맨 위 v1.9.1 섹션에 적었음 — 버전 올릴 때 옮길 것.

## 인물 관계도(반3D) — 1차 구현 완료 (2026-11-04, 미릴리스)
- 목업: 프로젝트 문서 `claude/mockup-relmap.html`, 계획: `claude/relmap-plan.md`.
- 구현: 탭 `relmap`(기억 그룹, `ui/tabs.js`·`ui/app.js`) / 화면 `ui/screens/relmap.js` / canvas `ui/screens/relmap/canvas.js` / CSS `ui/screens/relmap/css.js`(styles.js에서 합침) / 데이터 `engine/relmap.js`(순수, `tests/relmap.test.js`) / e2e `tests/e2e/run-relmap.mjs`.
- 진입: ① 채팅 메뉴 떠 있는 버튼(`data/memorybutton.js`, main.js `openRelMap`, 설정 키 `dusk.ui.memoryButton` 그대로, 이름·아이콘만 관계도로) ② 장기기억 홈 '나에 대한 기억' 아래 줄(`mhome.js` `mapRow`) ③ 사이드 메뉴 탭.
- 빨리 뜨게: `peekCurrent` 캐시 사용, 같은 채팅이면 만든 DOM 재사용(`ctx.state.relmap.view`) + 뒤에서 폴더만 다시 읽어 서명이 바뀔 때만 다시 그림, 탭에서 떨어지면 rAF 루프 정지(`stage.isConnected`), 열 때 `getCharacterFromIndex` 호출 없음.
- 데이터(새 필드 없이 기존 기억만): 호감도 = `folder.emo`(그 인물→{{user}}) 좋은 쪽(애정·신뢰·존경) − 나쁜 쪽(적대·두려움)을 0~100으로, 감정 없으면 50. 중요도 = 기록 수 + 최근 20응답 기록. 이번 턴 = 마지막 분석 응답(`nowOf`)에 기록·장면이 있는 인물. NPC 선 = `folder.rels`(+/− 개수로 색, 개수로 굵기, 최근 5응답 변화는 빛남). 점선 = 풀리지 않은 갈등·오해(rifts/beliefs). 인물 최대 40명(중요도 순).
- 아직 안 한 것(다음): ① 소속(`person.faction`)·상태(`person.status`)는 화면이 읽을 준비만 됨, 추출 안 함(없으면 소속 없이 고르게 배치, 필터 숨김) ② 턴 되감기·▲▼ 변화(턴별 호감도 스냅숏 필요) ③ 선의 특수 관계 종류·원문 인용(`kind`/`q`) ④ 실제 터치 기기의 길게 누르기·두 번 누르기·핀치 미확인(헤드리스에서 포인터 이벤트만 확인) ⑤ BardWiki 저장소일 때의 폴더 읽기는 `M.store.getFolder`만 사용(장기기억 홈과 동일).
- 검증: npm test 전부 통과(tests/uimode.test.js 탭 목록 기대값에 relmap 추가), build·check "동일함", e2e `run-relmap.mjs` 22개 통과(PC·모바일).
- 2026-11-04 추가: 관계도 차가운 색 파랑(`--rb-blue` 토큰, theme.js 팔레트 4종) · {{user}} 이름 모으기를 `data/usernames.js`로 통일(username + 선택/전체 페르소나 + 첫 단어; memoryrunner·mepage가 사용). 테스트 `tests/usernames.test.js`.
- 2026-11-04 추가: 관계도 가운데·안내 글을 페르소나 이름으로 표시(`usernames.js` `primaryUserName`, `username.js` loadUserName), 옛 기록 자동 합치기 `data/usermerge.js` `autoMergeUser`(관계도·'나' 화면을 열 때; '나로 합치기' 버튼은 실패 대비로 남김). 테스트 `tests/usermerge.test.js`.
- Cellar 서버 분석(2026-11-04, Cellar 브랜치 0.1.1): 엔진 묶음 `src/cellar/node-entry.js`(러너·저장소·`callWriterModel`·`toPrompt/fromReply`·`folderIdOf`) + `tools/build-cellar-engine.mjs`(분석·모델 호출 코드를 바꾸면 다시 빌드해 Cellar `engine/atelier-engine.mjs`에 커밋). **연결:** `data/cellaranalysis.js`(`prepare`: 기억이 서버 모드·온라인·features analysis일 때만; 서버가 직접 부를 수 있으면 직접, 아니면 `analysis-relay`면 중계; `run`: start → 폴링 → 취소 시 cancel, 시작 전 실패·501은 null → 기기 방식, 시작 뒤 오류는 던짐, 상태 6번 연속 실패면 '연결 끊김'; `resume`: 리스 화면을 다시 열면 `memory.js` detect 뒤 `runner.resumeServer()`가 중계 대기 작업을 이어받음), `modelhub.js` `serverModelOf`(**중요: 기억 분석의 기본 모델 mode는 리스 쪽(submodel 등)이라 custom이 아님 → 설정 `serverModel.presetId`(기억 설정 '서버 분석에 쓸 모델')로 '내 API' 프리셋을 고른 경우에만 직접 호출.** 프리셋·키를 `{kind:"preset"}`로 보내면 Cellar가 같은 llm-client 코드로 호출 — risuai 프리셋만 거절), `memoryrunner.js` backfill 앞 훅(`server` 옵션, 설정 `serverAnalysis` 기본 true, 끝나면 dropCache + 빈 updateFolder로 인덱스 요약 갱신), 설정 스위치·모델 선택(memory/settings.js). 기억 손실 방지(Cellar): 충돌 시 모델 재호출 없이 새로 읽은 폴더에 재적용, 분석 전 폴더 사본 `dusk-data/analysis-backups/`(최근 5개). 시험 `tests/cellaranalysis.test.js` 11개 + Cellar 동시 쓰기·취소 후 재시작·백업·Vertex JWT 시험. 자동 기록은 서버로 안 보냄. 실제 서버 미확인.
- 버그 수정(2026-11-04): ① 2단계 줄 파서가 'Other'(프롬프트 예시)를 상대 이름으로 저장 → `memorylines.js` `targetName`/`realText`로 거름 ② `stageOf`(memoryhuman.js)가 장면 수만 봐서 친한 사이로 시작해도 '처음 봄' → 추억·rels·반말이 있으면 '처음 봄'만 벗김(그 위 단계는 장면 수·감정 그대로). 테스트 `tests/memory-stage-placeholder.test.js`. 이미 저장된 'Other' 항목은 자동 정리 안 함.
- 초기 관계 감지(2026-11-04): 2단계 줄 `start|상대|close or friendly|원문 인용`(사전관계) → `folder.start[쌍키]={a,b,level,q}`(처음 한 번, 인용이 본문에 있어야 함) → `stageOf`가 close=최소 '친한 사이', friendly=최소 '아는 사이'로 바닥을 깖. 가벼운 모델 모드에서는 이 줄을 안 물음. JSON 응답 경로도 `start` 통과. {{user}}로 합치기(`memoryuser.js` rekey)·`pairView().start`·'나' 화면 칩까지 반영. 아직 안 한 것: 일반 인물 합치기(`peoplemerge.js`)는 emo 등과 마찬가지로 별칭에 의존, 인물 위키 관계 탭 표시.
- 다시 분석(2026-11-04): `memoryrunner.js` `planBackfill(.., {all:true})`·`backfill(.., {redo:true})`·`analyzeAt({redo})`(cursor 중복 방지 우회). 홈의 '지난 대화 분석'(`mhome.js` analyze)에서 미처리가 0이면 "이미 모두 분석했어요" 확인창 → 전체 재분석. 설정 폴드의 '미처리만 분석'(`settings.js`)은 그대로. 테스트 `tests/memoryrunner.test.js`.
- 관계도 성능(2026-11-04): `buildRelMap`이 모든 인물에 `counterparts`·`pairView`를 돌려 큰 기억(인물 400·장면 3000)에서 3.7초 걸림 → 값싼 중요도(기록만)로 상위 40명을 먼저 고른 뒤 그 40명에만 `pairView`(0.2초). `tests/relmap.test.js`에 시간 상한 테스트. 아직 안 본 것: 실제 브라우저에서 그리기 루프 프레임 비용(저사양 폰), 폴더 JSON 읽기 자체의 시간.
- 분석 메모리(2026-11-04): `memoryrunner.js` `backfill`이 묶음(3응답)마다 `getCharacterFromIndex`(딸린 채팅 전부 복사)·`getChatFromIndex`를 다시 읽어 큰 채팅에서 OOM 의심 → 시작 때 1번만 읽고 `analyzeAt({shared})`로 넘김, 생성 확인은 5묶음마다 현재 채팅만. 테스트 `memoryrunner.test.js`(호출 횟수). 실기기(아이폰) 효과는 미확인. 다음 후보: Cellar 서버에서 분석 실행(사용자 결정: 서버 사용자만 더 가볍게, Cellar가 리스 데이터를 읽는 것은 허용).
- 이 브랜치의 package.json은 아직 1.9.1. CHANGELOG 항목은 맨 위 v1.9.1 섹션에 있음 — 버전 올릴 때 옮길 것.

---

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
- (2026-11-02) 목업 2 '코코아·기억 카드' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-2-cocoa-cards.html`, 사진 뺀 판). 요지: 코코아 = 제목 1개+? · 켜기 카드에 '3개 중 1개 사용 중' · '사용할 스킬'과 '스킬 세트'를 한 목록으로(간단=줄마다 스위치, 고급=줄 아래 붙는 곳 칩 4개) · ZIP/JSON/삭제는 ··· · 'AI로 만들기'는 목록 머리(떠 있는 버튼이 모바일 탭바와 겹침) · 고급 묶음 한 줄씩 · PC 2열. 기억 카드 = 봇·채팅 한 줄 카드('바꾸기') · 만든 카드/새로 만들기 segmented · 2열 타일+'＋ 새 카드' · 단계 동그라미 5개 · 이전/다음 아래 오른쪽 고정 · PC는 오른쪽 카드 미리 보기.
- 발견한 버그(구현 때 수정): 기억 카드 탭 새로 만들기 단계 목록이 '1. 1. 인물'로 번호 이중 표시(`ui/screens/memory/compose.js` `ol.rb-mem-steps`, 카드 탭 `rb-cards2`에서 목록 CSS 미적용 추정).
- 촬영 요령 추가: 코코아는 `bootApp` 후 `__app.ctx.skills = createSkillStore(__api)`로 스킬 저장소를 넣고 세트를 importSet해야 실제 화면이 나옴(없으면 '준비되지 않았어요'). 경로는 `ctx.go("cocoa")`, `ctx.go("cards")`(state.mem.ctab="compose"로 새로 만들기).
- (2026-11-02) **목업 2 사용자 승인**("깔끔하고 직관적"). 다음 할 일: 목업 2대로 코코아(`ui/screens/memory/skills.js`, `ui/screens/cocoa.js`)·기억 카드(`ui/screens/cards/index.js`, `memory/cards.js`, `memory/compose.js`) 구현 + 단계 번호 이중 표시 버그 수정. 그다음 목업 3(관리: 캐릭터·모듈·플러그인) → 4(작업실). 목업 1(홈·개요)도 승인 상태라 함께 구현 가능.
- (2026-11-02, 사용자 결정) **진행 방식 변경: 모든 탭 목업을 먼저 하나씩 만들고 확인받은 뒤, 구현은 한 번에.** (위 '다음 할 일: 목업 2 구현'은 보류)
  - 완료·승인: 목업 1 홈·개요(`docs/mockups/ui-polish-1-hubs.html`) · 목업 2 코코아·기억 카드(`docs/mockups/ui-polish-2-cocoa-cards.html`).
  - 남은 목업 순서: ③ 장기 기억 묶음(메인·상황·시간선·열린 항목·관계) → ④ 관리(캐릭터·모듈·플러그인) → ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정). 탭마다 '지금(사진) / 개편안' 모바일 390 + PC 1280, 사용자 확인 후 다음.
  - 목업 공통 규칙(확정): 자주 쓰는 것만 카드 · 부가 동작은 ··· 메뉴 · **? 도움말 버튼은 모든 화면 유지** · 넓으면 2열 · 쉬운 말 · 기존 토큰(--rb-*). 목업 HTML은 scratchpad의 생성 스크립트로 만들고, 저장소엔 사진 뺀 가벼운 판을 `docs/mockups/ui-polish-N-*.html`로 커밋(프로젝트 문서는 용량 가득이라 저장 불가).
  - 구현 단계에서 할 것: 목업 1~5 전부 + 기억 카드 단계 번호 이중 표시 버그. 공용 부품(목록 줄···· 메뉴·segmented·고급 묶음)은 kit.js로 묶기 검토.
- (2026-11-02) 목업 3 '장기 기억' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-3-memory.html`, 사진 뺀 판). 목업 1·2·인물 위키 규칙 그대로. 요지: **메인** = 머리 스위치+'사용 중' 카드를 상태 카드 하나(스위치·숫자 3·막대·범례)로 합침 · '지난 대화 분석'만 큰 버튼 · 인물 위키/기록 보기/카드로 만들기/다른 채팅은 작은 바로가기 4칸 · 기억 옵션 토글 3개 유지 · 설정은 한 줄 요약 목록 · 고급은 한 줄씩 접은 묶음 · PC 2열. **기록 보기**(mdetail.js) = 5구역(인물 위키·상황·시간선·열린 항목·관계) 칩에 개수 표시, **한 번에 한 구역만**(지금은 한 페이지 앵커 스크롤 → 동작 변경, 사용자 확인 필요) · 빈 구역은 한 줄 안내 · 상황·시간선은 세로 점 시간선 · 열린 항목 해결 버튼+···(삭제) · PC는 왼쪽 구역 목록+오른쪽 내용. **봇별 기억** = 틀 유지, '기억 켜짐 N/전체' 요약·지금 채팅 고정·? 추가.
- 촬영 요령 추가: 기록 보기는 `state.mem.page="detail"`만으론 안 열림 → 기억 홈에서 '인물 Wiki' 버튼 클릭으로 진입(botId 설정됨). 테스트 환경에서 봇별 기억·PC 기록 보기는 오류 알림이 섞여 사진 생략.
- (2026-11-02, 목업 3 확정·사용자 결정) 장기 기억 목업 3 전부 승인. **추가 결정: PC 고급 모드에서 '기억 방식'(자동/플러그인/BardWiki/끔 segmented)은 접지 않고 오른쪽 열 맨 위에 바로 보이게**(고급 묶음 목록에서는 뺌). 모바일 고급은 기존대로 접은 묶음(사용자가 PC만 지정함).
- 남은 목업: ④ 관리(캐릭터·모듈·플러그인) → ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정).
- (2026-11-02) 목업 4 '관리(캐릭터·모듈·플러그인)' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-4-manage.html`, 사진 뺀 판). 요지: **캐릭터**(`ui/screens/characters.js`) 도구 두 줄 → 한 줄(개수·정렬 요약 + 'AI로 봇 만들기' + '＋ 새 봇' + ···[선택·폴더·정렬·가져오기]), 줄은 '편집'+···(AI로 다듬기·에셋·폴더 이동은 ···), '지금 채팅' 라벨, PC 2열 카드. **모듈**(`modules.js`) 필터 칩 6→'전체·켜짐·꺼짐'+'종류 ▾'(전역·LLA·MCP), '연결 N'은 이름 아래 작은 칩, 줄은 스위치·편집····, 도구 한 줄('＋ 새 모듈'+···), PC 2열. **플러그인**(`plugins.js`) 제목·설명 중복 제거, 탭(목록·연동 설정·만들기·저장소) 유지, 도구 한 줄('업데이트 확인'+···[새로고침·내보내기]), '미분류 N'은 접는 머리. 개요 화면은 목업 1 기준.
- 남은 목업: ⑤ 작업실(플러그인 꾸미기·AI로 봇 만들기·AI로 페르소나 만들기·도구·설정).
- (2026-11-02, 목업 4 수정·사용자 결정) **캐릭터·모듈은 리스트형 유지(PC 2열 카드 안 함), 정렬·폴더 버튼은 밖에 그대로**, 끌어서 순서 바꾸기(⠿)·폴더 머리 줄 유지. ···에는 드문 것만(캐릭터: 선택·가져오기 / 모듈: 선택). 새 디자인 스타일(카드·줄 모양·'지금 채팅' 라벨·'연결 N' 칩·필터 '종류 ▾')은 승인. 플러그인 개편안은 승인("깔끔").
- (2026-11-02) 목업 4 최종 승인("이대로"). 목업 5 '작업실' 제작 → 사용자 확인 대기(`docs/mockups/ui-polish-5-work.html`). 요지: **꾸미기**(themestudio/look) 제목 1개·색·밝기·글자 크기 한 카드·'내 채팅 테마 만들기'는 한 줄 목록·PC 2열(오른쪽 미리보기 고정). **AI로 봇 만들기**(aitab.js) 1·2·3 번호 단계 카드·'AI 창 열기'는 아래 고정 하나(위쪽 중복 제거)·안쪽 탭 5개는 한 줄 칩·'사용법'은 ?로·봇 편집 머리/탭 줄 유지·PC 오른쪽 시작하기 상자 고정. **AI로 페르소나**(personabuilder.js) 제목 3중 제거·페르소나 한 줄+····AI로 쓰기는 글 상자1+전체 쓰기/빈 칸만 채우기(추가 지시·번역·수정은 ···)·슬롯머신 한 줄로 접기·항목 폴더는 줄(개수·AI·스위치), 누른 것만 펼침·PC 2열·떠 있는 'AI 대화' 유지. **도구**(tools.js) 타일 7개 → '자주 쓰는 도구 3'+'확인·복구 4' 목록·'도움 주신 분들'은 내용 그대로 한 줄 목록·PC 2열. **설정**(settingstab.js) 간단은 묶음 이름만(화면·백업·도움말)·고급은 묶음별 한 줄 목록(현재 값 오른쪽), 재해석/존중은 바로 고르기 유지, 정리·기록 타일→목록, '이럴 땐 여기로'는 ? 안으로·PC 2열.
- (2026-11-02) 버그 2건 수정(사용자 리포트):
  - 홈 '장기 기억(모든 채팅)' 스위치: 원인 = `home.js` refreshStatus가 상태 줄을 다시 그릴 때 처음 읽은 `globalOn`으로 스위치를 새로 만들어 눌러도 되돌아감(끈 뒤 다시 켤 수 없음). 수정 = refreshStatus에서 `memoryGlobalOn(최신 idx)`로 다시 읽음. 시험 `tests/e2e/run-home-memall.mjs`(수정 전 2개 실패 확인).
  - 호감도 HUD가 Yumi Translator 플로팅 버튼과 겹침: 원인 = `engine/affhud.js` 기본 CSS `.dafx-aff{top:12px;right:12px}`. 수정 = `top:max(112px, calc(env(safe-area-inset-top) + 100px)); right:max(12px, env(safe-area-inset-right))`(사용자 제안값), AI 디자인 지침(`affprompts.js`) 위치 문구도 맞춤. 시험 `tests/affhud.test.js` 1개 추가. **이미 설치된 HUD(봇 배경 HTML에 저장됨)는 자동으로 안 바뀜** — 다시 설치해야 적용(자동 마이그레이션은 저장 데이터 변경이라 사용자 확인 필요).
- (2026-11-02, 목업 5 수정·사용자 지시) 도구 '도움 주신 분들'에서 **원문 글 링크 제거**(이름·한 줄 설명만). **플러그인 꾸미기 폭 확장**: 테마 묶음 6(기본 회백·따뜻한 종이·차가운 회색·숯·미드나잇·보랏빛 밤 = 바탕+강조) · 강조 색 6→12(따뜻한/차분한) · 그라데이션 5(노을·황혼·밤하늘·오로라·복숭아)+직접 · 글자 크기 '아주 크게' · 고급 직접 색에 바탕·카드·글자 색(+대비 검사·자동 맞추기) · 모양(모서리·그림자·테두리·글꼴[기본·기기 글꼴·명조·둥근]) · 움직임 줄이기 · 내 테마(저장·테마 코드 주고받기) · PC 3열(미리보기 고정). 구현 시 `theme.js`에 새 토큰·정규화(예전 저장 테마 호환), 대비 검사, 외부 글꼴 불가(기기 글꼴만).
- (2026-11-02, 목업 5 수정 2·사용자 지시 "조금 더") 꾸미기 추가 확장: 테마 묶음 12(+벚꽃·민트 크림·세피아·OLED 블랙·숲속·바다)+'🎲 아무거나' · 강조 색 18(파스텔 6 추가, 버튼 글자 자동 어둡게) · 그라데이션 8(+숲·모래·네온)+방향(가로·대각선·세로) · 밝기 '시간 따라' · 고급 '바탕'(무늬 없음·점·모눈·종이 / 바탕 그라데이션 / 카드 유리 효과 / PC 사이드바 색 / 강조 색 쓰는 곳) · 모양에 아이콘 굵기 · 글자(글꼴 5[+고정폭]·굵기·줄 높이) · 내 테마 여러 개 저장·밝을 때/어두울 때 따로 · 미리보기 밝게/어둡게 전환.
- (2026-11-02, 사용자 요청) 목업 6 '시작 안내'(처음 설치 시 플러그인 창 전체 화면 마법사) 제작 → 확인 대기(`docs/mockups/ui-polish-6-onboarding.html`). 단계: 0 환영('설정하고 시작하기'/'나중에 하기'=기본값) · 1 화면 모드·글자 크기 · 2 테마 묶음·밝기(즉시 미리보기) · 3 장기 기억 켜기·기록할 AI(리스 보조 모델/내 API)·수준(가볍게/기본/전부) · 4 기억 옵션 3·이야기 도우미 4 토글 · 5 이미 쓰던 것(HypaPlus·코코아전트·RisuPot 중복 경고·임베딩, 찾은 것만/없으면 자동 통과) · 6 요약+'바꾸기'+? 안내. 단계마다 건너뛰기·이전, 즉시 적용. PC: 왼쪽 단계 목록·가운데·오른쪽 미리보기.
  - 합칠 것(자동 표시 중단): 처음 둘러보기(`ui/tour.js` 11단계) · 기억 '처음 설정하기'(`memory/setup.js`, `engine/firstrun.js` WIZARD) · 임베딩 안내(`memory/embeddingguide.js`) · HypaPlus 안내(`memory/hypamodal.js`) · 프롬프트 첫 안내(`promptstab.js` maybePromptIntro). 유지: ? 화면별 둘러보기(`ui/screentours.js`, 누를 때만) · '새로 바뀐 점'.
  - 대상: 새로 설치한 사람만 자동. 기존 사용자는 '새로 바뀐 점'에 '시작 안내 다시 보기' 버튼, 설정 → 도움말에도 추가. 기존 설정 건드리지 않음.
- (2026-11-02, 목업 6 승인·수정) 시작 안내 승인. **2단계 꾸미기는 '플러그인 꾸미기' 기본 화면과 같은 선택지**: 미리보기(맨 위) · 테마 묶음 12+🎲 아무거나 · 강조 색 18(따뜻한·차분한·파스텔) · 그라데이션 8+방향 · 밝기 4 · '모양·글꼴 더 고르기' 펼침(모서리·그림자·글꼴·바탕 무늬). 구현 시 꾸미기 화면과 같은 부품을 재사용할 것.
- **목업 1~6 전부 확정 → 다음은 한 번에 구현**(새 챗 권장). 순서 제안: 공용 부품(kit) → theme.js 확장 → 홈·개요 → 장기 기억 → 코코아·기억 카드 → 관리 → 작업실 → 시작 안내(기존 자동 안내 5개 정리) → e2e/스크린샷 확인.
- (2026-11-02, 목업 6 수정) PC 시작 안내 2단계: 가운데 = 테마 묶음·강조 색·그라데이션, **오른쪽 = 미리보기 아래에 밝기 → 그라데이션 방향(가로·대각선·세로) → '모양·글꼴 더 고르기'**.
- (2026-11-02, 사용자 결정·목업 6 최종) **임베딩 설정은 3단계(장기 기억)에서 함께**(5단계에서 빼기). **시작 안내는 기존 사용자·새 사용자 상관없이 처음 한 번은 무조건 자동으로 띄움**(본 적 있는지 저장 키로 한 번만). 앞의 '새로 설치한 사람만' 문구는 이것으로 대체.

# 구현 진행 (목업 1~6, 2026-11-02 시작)
- (2026-11-02, 목업 6 수정·사용자 결정) **3단계 장기 기억에 임베딩 설정 포함**(쓰기 스위치·API 주소·모델·키(이 기기에만)·연결 테스트, 선택 사항 — 기존 `memory/embedmodal.js` 저장 로직 재사용). 5단계에서는 임베딩 뺌. **표시 대상 변경: 새로 받은 사람·기존 사용자 상관없이 이 버전을 처음 열 때 모두에게 한 번 무조건 표시.** 기존 사용자는 현재 설정이 미리 골라진 채 시작(초기화 없음), 끝내거나 '나중에 하기' 후엔 자동으로 다시 안 뜸, 설정 → 도움말 '시작 안내 다시 보기'. (위 '새로 설치한 사람만' 문구는 이걸로 대체)
- (2026-11-02, 사용자 지시) 시작 안내 임베딩: **기존 기본값을 미리 채움**(`engine/embed.js` DEFAULT_EMBED — 주소 `https://api.voyageai.com/v1/embeddings`, 모델 `voyage-4-large`, 스위치 꺼짐). 키만 넣으면 켤 수 있게. 기존 사용자는 저장된 값이 있으면 그 값을 보여 줌.
- (2026-11-02, 구현 1차 완료·푸시) **공용 부품 + 꾸미기**: `ui/themekit.js`(카탈로그: 테마 묶음 12·강조 색 18·그라데이션 8·글꼴 5 등) · `ui/theme.js` 확장(새 필드 기본값=예전 모습, 예전 저장 호환, `applySet/randomSet/themeCode/parseThemeCode/pickLook`, 묶음·직접 색 대비 자동 맞춤, 밝기 'time') · `ui/lookparts.js`(꾸미기·시작 안내가 같이 쓸 선택 부품; `lookParts({get,set})`) · `ui/screens/settings.js` 꾸미기 재작성(PC 2열+미리보기 고정, 내 테마, 코드) · `styles.js` 끝에 새 토큰 CSS · `app.js applyTheme`에 rb-glass/rb-calm. 시험: `tests/theme-v2.test.js`, `tests/e2e/run-look.mjs`(PC·모바일 34항목).
- **남은 구현(순서)**: 홈·기억 개요(목업 1) → 장기 기억(3) → 코코아·기억 카드(2, '1. 1. 인물' 번호 버그) → 관리(4) → 작업실: AI봇·페르소나·도구·설정(5) → 시작 안내(6; 꾸미기 부품 `lookParts` 재사용, `ui/tour.js` 등 자동 안내 5개 정리). 참고: 모바일 아래 탭은 이미 홈·기억·관리·작업실 4칸. 원격에 `build: dusk_atelier.js` 자동 커밋이 올라오니 push 전 `git pull --rebase`(충돌 나면 `npm run build`로 재생성). `tests/e2e/run-app.mjs`는 앞부분이 옛 구조라 '사이드바 순서'에서 막힘(기존 실패).
- (2026-11-02, **구현 완료** · 목업 1~6 전부) 커밋으로 나눠 푸시함. 파일별 요지:
  - 홈 `screens/home.js`(상태 카드+숫자 `rb-hnums`, 작은 바로가기 `rb-hdo-sm`, 이어서 하기 `rb-hcont`) · 개요 `screens/sectionhome.js`(목록 행 `rb-hubrow`+개수, 작업실 큰 카드 2, `app.js`가 개요에서 `rb-on-hub`로 칩 줄 숨김).
  - 장기 기억 `memory/mhome.js`(상태 카드 `rb-mem-statuscard`, 바로가기 4, 고급은 `madv.js advancedGroups()` → 접은 묶음 `rb-mem-grp`; PC 고급은 기억 방식 오른쪽 맨 위) · `mdetail.js`(한 구역씩, 칩 개수, PC 왼쪽 목록) · `ledger.js`/`scenes.js` 빈 구역 한 줄 · `mbots.js` 요약.
  - 코코아 `memory/skills.js`(한 목록···· 메뉴·고급 묶음) · `cocoa.js`+`skillchat.js`(noFab, 목록 머리 'AI로 만들기'). 기억 카드 `cards/index.js`(한 줄 카드·봇/채팅 고르기 창·segmented) · `memory/compose.js`(동그라미 단계·오른쪽 이전/다음·PC 미리 보기) · `memory/cards.js`.
  - 관리 `characters.js`·`modules.js`·`plugins.js`(도구 한 줄+···, 편집+···, 지금 채팅 라벨, 종류 필터, 연결 칩).
  - 작업실 `settings.js`(꾸미기)·`tools.js`(목록 2묶음·도움 주신 분들)·`settingstab.js`(묶음+현재 값 `valRow`)·`aitab.js`(단계 카드·시작하기 상자)·`personabuilder.js`(접기·2열).
  - 시작 안내 `ui/onboarding.js`(`maybeOnboarding`/`openOnboarding`, `ONBOARD_VER=1`, 끝/나중에 → onboardDone·tourDone·promptIntroDone + 임베딩·AI 제작 안내 키 저장). `app.js` 열 때 시작 안내 → 새로 바뀐 점 → 둘러보기 순. 설정 → 도움말 '시작 안내 다시 보기'(`ctx.openOnboarding`). 기억 처음 설정 저장은 `memory/setup.js applyMemorySetup/readMemorySetup`로 나눠 같이 씀.
  - 공용: `ui/themekit.js`·`theme.js`·`lookparts.js`, CSS는 `styles.js` 끝부분 '1.8.3' 블록들. 아이콘 `message-circle`·`arrow-up` 추가(`tests/icons-used.test.js`가 없는 아이콘 이름을 잡음).
  - 시험: `tests/e2e/run-hubs·run-cards·run-manage·run-work·run-onboard·run-look.mjs` 새로. `app.entry.js` bootApp은 시작 안내를 기본 '본 것'으로(시험할 때 `opts.onboard`), 스킬 저장소(`opts.skills`로 세트 3개). `run-memed`는 새 메뉴 구조로 고쳐 통과(32/32). `run-app.mjs`는 앞부분 옛 구조라 여전히 '사이드바 순서'에서 멈춤(기존).
  - 확인 못 함: 실제 RisuAI·RisuBard·PocketRisu 화면, 기기 글꼴 차이, 시작 안내의 '내 API'·임베딩 연결 테스트 실제 호출.
- 다음 할 일 후보: `run-app.mjs` 새 메뉴 구조로 정리 · 버전 올리기/릴리스(사용자 지시 때) · 실제 환경 확인 뒤 다듬기.

## 다음 작업 (사용자 요청 2026-11-02 22:15, 아직 시작 전)
- 완료: 장기 기억 진입 시 임베딩 안내 자동 표시 제거(mhome.js).
- ① [x] **유저 편향 없애기 강도 (완료 2026-11-02)**: 홈 '유저 편향 없애기' 줄은 스위치 대신 박스 버튼(`#rb-dice-row`, 오른쪽에 꺼짐/강도 표시) → 누르면 상세 창(`ui/dicedetail.js` `diceRow`/`openDiceDetail`, 홈·시작 안내 4단계 공용). 상세 = 사용하기 스위치(켜면 공정한 전개도 같이 켬, 기존 setDice 로직) + 강도 약하게·보통·강하게 + ?(작동 방식) + **고급 모드만** 난이도 수치 4개(쉬움≤보통≤어려움≤극악, 1~100)·주사위 개수(1~6) 직접 입력('직접 입력 적용' → level=custom).
  - 수치(엔진 `DICE_LEVELS`): 약하게 10/35/60/85 · **보통 20/50/75/95(예전 값 그대로)** · 강하게 30/60/85/98. 개수는 프리셋 3. 지침 문장에 `easy N, normal N, …`로 들어감. 순수 함수 `normalizeCuts/normalizeCount/resolveDice`(engine/fairplay.js).
  - 저장(추가만, 기존 키 불변·마이그레이션 불필요): `dusk.ui.fairDiceLevel`(weak|normal|strong|custom, 기본 normal) · `dusk.ui.fairDiceCuts`(JSON) · `dusk.ui.fairDiceCount`. `data/fairplay.js`에 `loadDiceLevel/loadDiceCustom`, 훅에 `setDiceLevel/setDiceCustom/diceLevel`.
  - 같이 고침: 시작 안내(z 300) 위에서 여는 모달(z 50)이 가려지던 문제 → `.rb-onb~.rb-modal{z-index:310}`(HypaPlus 가져오기 창도 해당).
  - 시험: `tests/fairplay-level.test.js`(6개, 구현 전 실패 확인) · `tests/e2e/run-home-dice.mjs`(간단·고급 25항목) · `run-home-fair`·`run-hubs`·`run-onboard`는 새 박스 구조에 맞춰 고침.
  - 확인 못 함: 실제 보조모델이 바뀐 수치(약하게/강하게)를 지침대로 따르는지, 실제 RisuAI·RisuBard·PocketRisu 화면.
- ② [x] **주사위 결과 표시 (완료 2026-11-02)** + ③ [x] **모델 호출 표시 (완료)**: 둘 다 `data/turninfo.js`(`createTurnInfo`, main.js에서 `app.ctx.turnInfo`)와 순수 `engine/turninfo.js`. 홈 빠른 설정 토글 2개(`dusk.ui.diceShow` 기본 꺼짐 · `dusk.ui.callShow` 기본 꺼짐(2026-11-03 사용자 요청으로 변경), RisuBard=`bardWiki.getDocuments` 있으면 훅 안 달고 모델 호출 토글 숨김).
  - 흐름: beforeRequest에서 시작 시각·모델명(`getDatabase(["aiModel","subModel"])`, 30초 캐시)·입력 토큰 어림 → output에서 응답 앞부분 열쇠(`headKey`)·첫/마지막 글자 시각 기록(스트리밍은 앞부분 이어지면 갱신, 1.5초 잠잠하면 완료) → display에서 `matchRecord`로 맞는 응답 아래에 접는 블록(`x-dusk="dice"`/`"turn"`) 붙임. 저장 채팅은 그대로. 기록은 `dusk-turn-info`(최근 100).
  - 주사위: `fairPlay.lastDice()`(요청마다 굴림·수치 보관)를 응답 기록에 붙임. 판정 `judgeRoll(roll, 목표)`: 굴림−목표 ≥20 대성공 · ≥5 성공 · ±5 안 애매 · >−25 실패 · 그 이하 대실패, 1은 늘 대실패·100은 늘 대성공. AI가 어떤 난이도를 골랐는지는 알 수 없어서 4난이도 전부에 대한 판정을 보여줌. 굴러가는 애니메이션은 화면 문서에 심는 keyframes(`dusk-dice-roll`, 움직임 줄이기 존중).
  - 모델 호출: 화면 구석 칩(`x-dusk="callchip"`, 리스 화면 문서에 `getRootDocument` 래퍼로 만듦, `<details>`라 클릭만으로 펼침 → 로어북 목록은 `loreLog.last()`). 완료 15초 뒤 사라짐. 보조 호출은 출력 훅이 없어 4초만 '호출 중'으로 알림. 토큰은 글자 수 어림(`estimateTokens`).
  - 시험: `tests/turninfo.test.js`(6개) · `tests/e2e/run-home-turn.mjs`. lorelog에 `recordFor/last` 추가.
  - 확인 못 한 것(실제 호스트 필요): 모델 이름 필드(`aiModel`/`subModel`)가 RisuAI·PocketRisu에서 맞는지, 화면 구석 칩이 실제 화면에서 위치·표시가 괜찮은지(`getRootDocument` 래퍼의 `setInnerHTML` 등), 응답 아래 블록이 호스트 HTML 정리(sanitize)에서 `<details>`·`animation` 인라인 style이 살아남는지, display 훅이 스트리밍 중 반복 호출될 때 부하.
- 다음 후보: 위 '확인 못 한 것'을 실제 환경에서 확인 · 버전 올리기/릴리스(사용자 지시 때) · `run-app.mjs` 새 메뉴 구조로 정리.

## 2026-11-03 사용자 요청 묶음 (완료)
- **캐시 깨짐(치명)**: 원인 = 주사위 굴림값이 맨 앞 시스템 지침(`buildFairText`)에 들어가 요청마다 접두부가 바뀜. 수정 = `engine/fairplay.js` 고정 규칙 `diceRules`(굴림·힌트 없음)는 앞 지침에, 굴림값 `diceRollText`(`[Dusk Dice]`)는 마지막 user 메시지 바로 앞에 별도 system으로(`insertFairness`). 재해석/존중은 고정 문장만 다름 → 원인 아님. 시험 `fairplay-v168` '캐시' 케이스(마지막 user 앞까지 동일).
- 모델 호출 표시 기본 꺼짐(`loadCallShow`) · 설정 버튼 아이콘 `cog`(icons.js, app.js) · 도구 스페셜 땡스 카드(`tools.js` `.rb-sthanks*`) · 인물 위키 2열을 CSS columns(masonry)로(`.rb-wk3-grid`, `.rb-wk2-cards`) · 열린 채팅 없을 때 기억 홈에 설정 카드·기억 옵션·(고급)전체 설정(`mhome.js settingsCards`).
- **{{user}} = 나**: `engine/memoryuser.js normalizeUserNames`(페르소나 이름·user·유저·플레이어 → `{{user}}`, people·rel·emo·scene.who·know) · 분석 지침에 한 줄 추가(memoryprompt.js) · `applyAnalysis({userNames})`, runner가 `getDatabase(["username"])`(60초 캐시)로 넘김 · 위키 라벨 '나와의 관계'. 시험 `tests/memory-user-identity.test.js`. 기존에 갈라져 쌓인 페르소나 이름 인물은 자동 병합 안 함(저장 데이터 변경이라 필요하면 사용자 확인 후).
- **탭 이동 멈춤**: 원인 추정 = 홈·기억 화면이 탭 진입마다 `currentChat()` → `getCharacterFromIndex`(봇의 모든 채팅 복사, 실제 호스트에서 수백 ms). 수정 = `memoryswitches.js` 위치(ci:ti)별 30초 캐시, 쓰기·창 열기 때 `dbcache.js cacheGen()`으로 비움. 시험 `tests/currentchat-cache.test.js`, 측정 스크립트 `tests/e2e/run-tabperf.mjs`(시험 환경은 API가 즉시라 체감 차이는 실제 호스트에서만 확인 가능).
- 확인 못 함: 실제 호스트에서 캐시 적중률(프로바이더 로그), 탭 이동 체감, 아이콘·땡스 카드 실제 테마별 모양.

## 2026-11-03 추가 기능 (사용자 지시 1·2·4·5·6, 완료)
- RisuAI 소스 확인(kwaroran/RisuAI `src/ts/process/index.svelte.ts`·`request/anthropic.ts`·`request.ts`): 캐시 지점(`cachePoint`)은 리스가 먼저 찍고(자동=마지막 user 3개, 프롬프트 템플릿 'cache' 카드=깊이·역할) 플러그인 beforeRequest는 그 뒤에 받음. Claude 변환에서 첫 메시지 이후 system은 "System: …" user로 바뀌고 같은 역할끼리 한 텍스트 블록으로 합쳐짐(캐시 지점은 합친 블록 끝). → 주사위는 마지막 user와 합쳐지므로, `insertFairness`가 캐시 지점이 1~3개 있을 때만 주사위 앞 assistant에 `cachePoint` 추가(4개 한도, 원본 불변). 시험 `tests/cache-hit.test.js`.
- ① 캐시 적중 어림: `engine/turninfo.js prefixInfo/cacheLine`(직전 메인 요청과 앞부분 같은 토큰·비율, 깨진 메시지 위치, Dusk 표식이면 이름) → `data/turninfo.js` rec.cache, 칩·응답 아래 '캐시(어림)' 줄. 요청 훅은 시작 5초 뒤 remove+add로 맨 뒤로(다른 Dusk 훅 뒤의 최종 프롬프트를 보려고). 실제 프로바이더 적중과 다를 수 있음(어림).
- ② 주사위 기록: `data/fairplay.js` `DICE_LOG_KEY "dusk-dice-log"`(최근 300, 굴릴 때 채팅 정보와 함께, 1.5초 모아 저장), `loadDiceLog/clearDiceLog`, `engine/turninfo.js diceStats`. 화면 `ui/dicedetail.js openDiceLog`(이 채팅/전체·통계·지우기). main에서 `chatRef`로 `memory.switches.currentChat` 연결.
- ④ 합치기: `engine/memoryuser.js userMergePlan/mergeIntoUser`(people·emo·talk·rels·faces·exp·bonds·rifts·beliefs·scenes.who). 저장 데이터 변경이라 '나' 화면에서 미리 보기+확인 후에만. 위키(리수폿 문서)는 건드리지 않음.
- ⑤ '나' 화면: `ui/screens/memory/mepage.js`(m.page="me", 기억 홈 `#rb-mem-go-me` 한 줄 카드), 데이터 `meView`(counterparts/pairView 재사용). CSS `.rb-me*`(styles.js 끝), 넓으면 2열 columns.
- ⑥ 채팅 메뉴: `data/chatmenu.js`(`registerButton` location "chat", id 고정 `dusk-qt-fair|dice|show`로 다시 등록해 이름 갱신). main에서 fairPlay.set/setDice·turnInfo.setDiceShow를 감싸 어디서 바꿔도 이름 갱신. 설정 '로어북 · 채팅 메뉴'에 보임/숨김(`dusk.ui.chatQuick`, 기본 보임).
- 시험: `cache-hit`·`dice-log`·`memory-user-merge`·`chatmenu` 단위, e2e `run-me.mjs`(PC·모바일 16). e2e에서 `.rb-dice .btns button`은 버튼이 2개라 '닫기' 글자로 고름.
- 확인 못 함: 실제 Claude 캐시 적중(프로바이더 사용량), 채팅 메뉴 버튼이 RisuBard·PocketRisu에 있는지(없으면 조용히 생략), '나' 화면의 실제 데이터 품질.
- (2026-11-03, 사용자 결정) 주사위 앞 캐시 지점은 리스가 캐시를 안 써도 찍음(`points < 4`면). 리스 캐시를 안 쓰던 Claude 사용자는 그 지점까지 캐시 쓰기 비용(입력 단가의 약 1.25배)이 생기고 다음 턴부터 읽기 할인을 받음.

## 2026-11-03 추가 2 (사용자 지시 1·2·4·5, 3번은 이미 기본값이라 생략)
- 3번(장기 기억 넣는 위치): 이미 기본 `inject.position = "beforeLastUser"`(마지막 입력 바로 앞), 고급 '삽입 위치'로 변경 가능 → 작업 없음. 리수폿 로어북 방식(lore)은 로어북 위치를 따름.
- ① 리롤 같은 주사위: `engine/fairplay.js turnKey`(Dusk 메시지 뺀 전체 해시) → `data/fairplay.js` sameTurn(같은 열쇠·같은 개수·6시간 안이면 같은 rolls, 기록은 새 턴만). 기존 시험 3개를 '같은 메시지 = 같은 값'에 맞게 고침.
- ⑤ 판정 표식: 고정 규칙에 `<!-- dusk-roll: 행동 | easy|normal|hard|extreme | 굴림 | success|partial|fail -->` 남기기 지시(캐시 영향 없음). `parseRollMarks`, `makeDice`가 지난 턴(마지막 user 앞 assistant) 표식을 `prev`로 → `diceRollText` 'Last turn's judged outcomes'. 화면 `diceHtml(rec, marks)`는 표식이 있으면 실제 행동·난이도. 기억 분석 입력에서는 표식 제거(`memoryrunner.js noRoll`). 모델이 표식을 안 지키면 예전처럼 4난이도 표.
- ② 캐시 깨짐 알림: `data/turninfo.js` `CACHE_ALERT_KEY "dusk.ui.cacheAlert"`(기본 켜짐), 앞부분 < 50% & 전체 ≥ 1500토큰이면 칩 9초(호출 표시가 켜져 있으면 생략). 설정 고급 '이야기 도우미'에 줄(`#rb-set-cachealert`).
- ④ '나' 고치기: `mepage.js editDialog`(호칭·말투·감정 6개) → `setTalk`/`setTag`(잠김). e2e `run-me.mjs` 22항목.
- 확인 못 함: 실제 모델이 판정 표식을 잘 남기는지(특히 작은 모델), 리스 화면에서 HTML 주석이 정말 안 보이는지(마크다운 렌더 기준으론 숨김).

## 2026-11-03 전체 점검 (사용자 지시)
- 고친 버그(시험 `tests/audit-183.test.js` 5개 고치기 전 실패 확인 + e2e `run-home-dice` Esc 항목):
  - turninfo: 응답이 안 오면 '추론 중' 칩 타이머가 영원히 돎 → 5분(`TICK_MAX`) 뒤 멈추고 치움. 호출 표시를 끄면 `stopTick()`. 캐시 알림만 켜져 있으면 `pending`을 안 만들어 응답 기록 저장 안 함.
  - fairplay `turnKey`: system 메시지(기억·이야기 시간 주입)까지 넣어 리롤 판별이 깨짐 → user·assistant만.
  - memoryswitches: 30초 캐시가 채팅 삭제 직후 틀릴 수 있음 → `currentChat({ fresh: true })`, 요청마다 쓰는 내 프롬프트 범위(`data/memory.js`)는 fresh.
  - kit `modal`: 창 위 창에서 Esc가 모든 창을 닫음 → 맨 위 `.rb-modal`만.
  - chatmenu·quickset: RisuBard(응답 아래 표시 불가)에서 '주사위 결과 표시' 숨김. quickset `setDice` 실패 시 다시 던져(`e.shown`) 상세 창 스위치가 되돌아가게.
- 리스 소스로 확인한 것: replacer 두 번째 인자 = `'model'|'submodel'|'memory'|'emotion'|'otherAx'|'translate'`(메인 판별 맞음). `cachePoint`는 Claude 요청에서만 쓰이고 OpenAI 계열은 지워서 보냄(Gemini 요청 코드에서는 안 씀) → '항상 찍기'가 다른 프로바이더에 영향 없음.
- 전체 시험: 단위 719 통과, e2e 18종 통과(`run-tabs`는 4번 중 1번 41줄 모바일 로어북 항목 클릭 타이밍으로 멈춤 — 기존 시험 흔들림, 코드 문제 아님). `run-app.mjs`는 옛 메뉴(리수폿·인물 탭) 기준이라 첫 확인에서 멈춤(기존, 새 시험들이 같은 화면을 다룸).
- 못 한 것: eslint 등 정적 검사(npm 레지스트리 접속 불가), 실제 호스트 확인.

## 2026-11-03 {{user}} 이름 표시 · 마스코트 루네
- 기록 보기에서 {{user}} → 페르소나 이름(`db.username`, 없으면 '나'): `ui/screens/memory/username.js`(userText 조사 맞춤, `watchUserName` MutationObserver로 부분 갱신까지, 입력칸·편집 영역 제외 — 저장 값 불변). mdetail 진입 시 연결, personv2·infotab `shown()`은 `userLabel()`. 시험 `tests/username-display.test.js`, e2e `run-username.mjs`. '나에 대한 기억' 화면은 그대로 '나'.
- 마스코트 '루네'(사용자 지정 이름, 사용자가 준 캐릭터 시트 그림): 넣을 곳 = 시작 안내 환영 화면 · 빈 화면 안내 · 창 왼쪽 위 로고. 사용자 결정: 목업 먼저 보고 결정 → 목업 완료·확인 대기(실제 앱에 얹어 찍은 '지금/개편안' PC·모바일, 사진이 커서 저장소엔 안 넣음). 쓸 그림: 시트에서 자른 표정 4(기본·웃음·놀람·부끄러움)·SD 루네·고양이 정령(배경 투명)·로고 2(고양이/얼굴), webp로 합계 약 40KB. 구현 시: `ui/mascot.js`에 data URL로 넣고 `.rb-logo`(app.js 132줄)·시작 안내 0단계 `.rb-onb-logo`(onboarding.js 251줄)·kit `emptyState`의 `.ico`를 바꿈. 확인할 것: 말풍선 문구, 빈 화면 표정(같게/상황별), 로고(고양이/얼굴).
- (2026-11-03) **루네 구현 완료**: 사용자가 GPT로 새로 뽑은 시트 2장(표정·SD 16칸, 로고·아이콘 9칸) 사용. 결정: 로고 = 로고 시트 1번(얼굴 타일), 빈 화면 = 상황별, 환영 말풍선 그대로. `ui/mascot-data.js`(자동 생성 webp data URL, 얼굴 8·wave·logo 약 110KB) · `ui/mascot.js`(`moodFor` 제목으로 표정: 채팅 없음=surprised, 쓸 수 없음/준비 안 됨=sorry, 기억하는 인물=thinking, 그 밖=basic, `mood`로 직접 지정) · kit `emptyState` 아이콘 → 루네 얼굴 · app.js 로고 → `runeLogo()` · 시작 안내 0단계 SD 손 흔들기+말풍선, 6단계(끝) 머리에 윙크. 시험 `tests/mascot.test.js`. 원본 시트는 저장소에 없음(필요하면 사용자에게 다시 받기).
- (2026-11-03) 루네 추가 자리(사용자 요청 '더 넣어 줘'): 새로 바뀐 점 창 머리 `runeSd("cheer")`(whatsnew.js) · 도구 스페셜 땡스 머리 `runeSd("bow")`(tools.js) · 화면 열기 실패 → `emptyState({mood:"sorry"})`(app.js). mascot-data에 cheer·bow 추가(약 37KB). 확인 못 함: 변경 기록 창 실제 모습(시험 환경에서 버튼 클릭 실패, 빌드·시험은 통과).

## 2026-11-03 아카 글 v1.8.3 디자인 '1+7' 합본 (사용자 요청, 확인 대기)
- 지난 챗의 시안 6종+7번(1+6)은 세션 파일이 없어 사라짐 → 현재 `docs/arca/v1.8.3.html`을 변환해 새로 만듦: `docs/arca/drafts/v1.8.3-design-1plus7.html`(그림 자리 `{{IMG:이름}}`, 최종 글 아님·`v1.8.3.html`은 안 바꿈). 1번(별빛 클래식 카드·요약·접이식 항목) + 7번(금색 가는 테두리·선·세리프 제목·로마숫자 CHAPTER·LD 머리·땡스 카드 통일). 기능별 4색 → 금/라벤더 2색.
- 그림 자리: banner·ld·icon·spot-story·spot-memory·spot-screen·spot-cache·sd-wave·sd-bow·sd-cheer. 사용자가 아카에 올린 주소를 받으면 이 자리를 바꿔 `docs/arca/v1.8.3.html`로 반영.
- 확인: 아카 제약(style·class·script·overflow:hidden) 0건, 360/800px 가로 넘침 없음. 실제 아카 에디터 붙여넣기는 미확인.

- (2026-11-03) 사용자 요청으로 1번 중심+2번 곁들임 판 추가: `docs/arca/drafts/v1.8.3-design-1plus2.html`(네이비 본문 1번 + 장 머리만 밝은 라벤더 종이 카드·동그란 그림·세리프 2번풍, 금색 테두리·선은 뺌). 그림 자리·제약 검사는 1+7판과 같음(0건, 360/800px 넘침 없음). 둘 중 고르면 `v1.8.3.html`에 반영.
- (2026-11-03) 사용자 결정: **디자인은 1번(별빛 클래식)으로** → `docs/arca/drafts/v1.8.3-design-1.html`(배너·LD·장별 작은 루네·금/라벤더 2색). **기능 순서: 새 화면 → 기억 → 이야기 도우미 → 캐시**(번호 1~4·항목 1-1.. 모두 새 순서로, 소개 문장·시리즈 줄도 같은 순서). 머리 제목은 아직 '공정한 주사위, 나를 기억하는 인물들.'(순서와 안 맞으면 바꿀지 확인). 1+7·1+2 초안은 비교용으로 남김. 그림 주소를 받으면 `{{IMG:…}}` 10곳을 바꿔 `v1.8.3.html`로 반영.
- (2026-11-03) **정정**: 사용자가 보낸 실제 1번 시안(`preview-1.html`, 그림 13종 내장)에 순서만 바꿔 `docs/arca/drafts/v1.8.3-design-1-final.html`로 저장 — 위의 `v1.8.3-design-1.html`(내가 다시 만든 판)·1+7·1+2는 쓰지 않음. 순서 새 화면→기억→이야기 도우미→캐시(번호·항목·요약 카드·소개 문장·시리즈 줄 반영). 그림 자리 13곳: icon·guide·banner·ld·spot-screen·spot-memory·spot-story·spot-cache·more·warn·install·thanks·closing(그림 파일은 `arca-images.zip`로 사용자에게 전달, 저장소엔 없음). 머리 제목은 그대로('공정한 주사위, 나를 기억하는 인물들.', 바꿀지 확인 중).
- (2026-11-03) 아카 에디터(Froala)가 이미지에 `fr-dib`(display:block; margin:5px auto)를 붙여 flex 줄 안 그림이 자동 여백으로 글자를 밀어냄 → **flex 줄 안 `<img>`엔 인라인 `margin:0`을 꼭 넣을 것**(ARCA-POST 제약에 추가 필요). `v1.8.3-design-1-final.html`에 반영.
- (2026-11-03) 사용자가 올린 그림 주소(아카 에디터가 만든 `//ac.arca.live/…` 링크)를 그대로 쓰기로 함 → `docs/arca/v1.8.3.html`을 사용자가 붙여 넣은 1번 디자인 소스(+flex 줄 그림 `margin:0` 수정)로 교체. 순서 새 화면→기억→이야기 도우미→캐시. 마무리 루네 그림(closing)은 사용자 소스에 없어서 안 넣음. 머리 제목은 그대로.

## 안내서 사이트 (docs/site/)
- GitHub Pages(feat/1.8.3 · /docs, `docs/.nojekyll` 필수 — Jekyll이 옛 문서의 `{{` 때문에 빌드 실패했음). 주소 `…/Dusk-Atelier/site/`.
- 13페이지: 허브, guide/(start·memory·story·cocoa·image-tags·look·manage·switches·faq), dev/(index·host·workflow). HTML이 원본(생성기 없음) — 직접 고친다.
- 공용: `assets/site.css`(v1→v4 덮어쓰기), `assets/site.js`(상단 바·왼쪽 메뉴 NAV), `assets/widgets.js`(검색 Ctrl+K·탭·체크리스트·표 필터·코드 복사·체험 위젯: 주사위/관계/감정/게이지/태그/코코아/꾸미기/패치). 다크·라이트는 브라우저 설정을 따르고, 상단 GitHub 오른쪽 버튼(🌙/☀️)으로 바꾸면 `da-theme`(localStorage)에 저장돼 `:root[data-theme]`가 우선함.
- 허브는 목업 B(배너 + 큰 검색창 + 낱말 칩 + 벤토 타일). 다른 페이지 제목부는 site.js가 `.phero` 카드(벤토 큰 타일 모양 + 페이지별 루네 그림, IMG 표)로 감싼다. 목업 원본은 `docs/site/mockups/`.
- 새 페이지: site.js NAV, widgets.js PAGES(검색 색인), 허브 타일, 이전/다음 링크를 함께 고친다. 주사위 위젯의 수치(LV·judge)는 `src/engine/fairplay.js`·`turninfo.js`와 같아야 함.
- 내용 출처는 README/CHANGELOG/코드 문구만. 버전이 바뀌면 CHANGELOG 기준으로 갱신.
- **상시 규칙(사용자 지시, 2026-11-03):** 기능 설명이 바뀌거나 새 기능이 생기면 안내서 사이트(docs/site/guide/*.html)의 해당 페이지도 함께 고치고 CHANGELOG에 맞춘다. (아카 글 `docs/arca/v<버전>.html`은 사용자가 요청할 때 갱신.)
- 이번 대화에서 안내서 story(재해석·존중 위치)·memory(봇 로어북 내보내기)와 아카 v1.8.3 글(2-6 로어북 내보내기, 3-1 재해석·존중, 4-4 속도)을 갱신함. 아카 글 '재해석·존중' 문구는 3-1에 있음.
- 아카 v1.8.3 글: 맨 위 '처음이라면' 접이식 상자를 안내서 사이트 안내 큰 상자(NEW · GUIDE SITE, 열기 버튼 + 5개 바로가기 + 예전 가이드 2.0 링크)로 교체. 사이트 주소는 Pages 배포 확인 후 게시할 것(`https://pyser08.github.io/Dusk-Atelier/site/`).
- 채팅 메뉴(입력창 옆, location "chat") 맨 위에 '장기 기억' 바로가기 추가(`data/chatmenu.js` openMemory, main.js에서 memoryRef.open 연결). 토글이 아니라 화면을 여는 버튼(이름에 켜짐/꺼짐 없음), 빠른 설정을 숨기면 함께 숨김. 별도로 location "action"의 기존 '장기기억' 버튼(`memorybutton.js`)은 그대로 — 호스트에서 두 메뉴가 같은 곳으로 보이면 중복이니 실기기 확인 필요(미확인).

- 홈 속도(1.8.3, 이 대화): ① `data/memorystore3.js` 인덱스 원문 5초 캐시(문자열만 캐시·읽을 때마다 파싱, set/rm 때 비움, 문자열 아니면 캐시 안 함) ② `ui/screens/homestate.js` 인덱스·기록 자동 설정 읽기를 currentChat과 동시에 ③ `ui/screens/home.js` quickSettingsCard를 readState와 동시에. 시험: memorystore3·homestate 각 1건. 미측정: PocketRisu 실제 체감. 남은 후보(미착수): watch.js 모듈 전체 폴링(60초) 가볍게, createApp 지연 생성, 번들 데이터(카드 에셋·프롬프트·마스코트 ~1MB) 분리, 홈 상태는 나중에 채우기(골격 먼저), getFolder 대신 최근 기록 요약만 읽기.
- 홈 속도 2(1.8.3): `data/memoryswitches.js` `peekCurrent`(위치 ci:ti 같으면 직전 currentChat 값을 바로 주고 뒤에서 fresh 확인, 달라지면 onChange → `homestate.js`가 홈 refresh). 시험 1건(memoryswitch). 위험: 봇 순서가 바뀐 직후엔 잠깐 이전 봇 이름이 보였다가 바로 다시 그려짐. PocketRisu 체감 미측정.
- 속도 3(1.8.3): memorystore3 원문 캐시를 인덱스+폴더(최대 6키, 5초)로 일반화, 기억 홈(mhome) currentChat을 안내·모드 막대와 동시에(peekCurrent), watch.js MOD_EVERY 60s→120s. 의도적으로 안 한 것: createApp 지연 생성(sync가 app.ctx.svc를 써서 창을 열기 전엔 페르소나 동기화가 멈춤 → 별도 분리 필요), 번들 데이터 분리(CSP·로드 방식 확인 필요), 에셋 저장소로 기억 이전(정리 기능에 지워질 위험).
- 속도 4(1.8.3): `data/dbcache.js` 재작성 — 키별 캐시(TTL 45s), `dbRead`는 shared(복사 없음, 읽기 전용 약속·최상위 객체만 새로 줌), `warm`(watch.js의 characters·modules 읽기가 캐시를 채움), `soften`(창 열 때 15초 안 것 유지; 쓰기 계열은 그대로 hard invalidate). dbRead 호출처(characters·modules·sectionhome·memory/common loadBots·plugins 등)는 값을 고치지 않음을 확인. 새 dbRead 호출처는 반드시 읽기 전용으로. 미측정: 실제 호스트 체감, '응답 없음'의 진짜 원인이 호스트 쪽 복사라면 한계 있음.
- 속도 5(1.8.3): 캐릭터 탭 첫 읽기 단계별(`characters.js fetchCharsStaged`: 캐시 없음+봇 30개 이상일 때 characterOrder→modules→`loadCharacters(onBatch)` 12개씩, 24개 모이면 먼저 그림, 끝나면 `api.storeDbCache`로 캐시). dbcache에 has/store 추가, main.js hasDbCache/storeDbCache. 모듈·플러그인 탭은 아직 통째 읽기. 호스트 쪽 복사 자체는 못 줄임. 미측정.
- 홈 골격 먼저(1.8.3): `home.js` — 바로가기(grid)·처음 둘러보기는 정적으로 먼저 그리고, 머리·상태·이어서·최근·빠른 설정은 자리표시(rb-skel) → `adopt(box, el)`로 내용만 교체(refreshStatus는 statusEl에 씀). 빠른 설정은 readState와 따로 qsP가 끝나는 대로 채움(실패 시 안내 글). 확인: e2e run-home-dice 통과, 느린 저장소로 자리표시 화면 사진 확인.
- CI(1.8.3): `.github/workflows/branch-build.yml`·`build-branch.yml`을 검증만 하도록 바꿈(테스트·빌드·문법, 봇의 '빌드 결과 커밋' 제거, contents: read). 이유: 봇 커밋이 끼어 푸시가 계속 거절됨. 이제 dusk_atelier.js는 로컬 `npm run build` 결과를 직접 커밋. 주의: 봇 빌드가 로컬과 달랐던 원인(번들에 넣는 CHANGELOG 부분 추정) 미확인 → 릴리스 전 release.yml의 `build --check`가 CI에서 통과하는지 확인. release.yml·main은 손대지 않음.
- 봇 로어북 내보내기(1.8.3): `engine/wikilore.js`(순수: wikiLoreText/Entry/Candidates, upsertWikiLore 멱등, 표식 extentions.da_wiki=인물 이름, 비밀·openness·suspicion 구획 제외, 기본 2000자) + `ui/screens/memory/lorexport.js`(체크 목록·미리보기·확인 후 `setCharacterToIndex`로 globalLore 저장, 생성 중이면 거절) + people.js 더보기 메뉴(local 백엔드+위키 있을 때). 시험: tests/wikilore.test.js, tests/e2e/run-lorexport.mjs(app.entry.js 목 setCharacterToIndex가 window.__charWrites에 기록). 미확인: 실제 RisuAI·RisuBard·PocketRisu에서 봇 로어북 저장·화면 반영, 채팅 보호(RisuVault)가 막는 경우. 위키 상세정보 없을 때 칸이 좁아지는 버그는 PC1280·태블릿820·모바일390·간단/고급·위키 없음/빈 문서에서 재현 안 됨 → 사용자 사진 필요.
- 모듈·플러그인 속도(1.8.3): `readDb(api,keys,{cached})`(loadModuleState만 캐시, commit은 새로 읽음), modules.js `linkUseCounts`(60초 기억·200ms 뒤 시작·봇 처음 읽으면 storeDbCache), plugins `listInterop`/`listPlugins` 병렬, viewList 병렬. 시험 tests/modplug-load.test.js. 미확인: 실제 PocketRisu 체감 속도.
- 위키 상세정보 좁아짐 버그(1.8.3): 원인=문서 없을 때 .rb-wk3가 넓은 화면 2칸 grid(140px 목차+본문)에 목차 없이 들어가 카드가 140px. 고침=infotab 없는-문서 뿌리에 rb-wk3-solo + styles.js 덮어쓰기. 시험 tests/wikisolo.test.js(정적). 미확인: 실제 RisuBard PC 화면 재확인.
- 유저 편향 상세(dicedetail.js)에 재해석/존중 세그먼트를 강도 위에 추가(설정 탭과 같은 DICE_MODE_KEY). e2e run-home-dice 선택자는 '강도' 구획으로 한정.
- 설정 고급 '이야기 도우미'의 재해석/존중 행 제거(유저 편향 상세로 이동, 저장 키 DICE_MODE_KEY 동일).
- 버전 1.8.3으로 올림(사용자 지시 2026-11-03): package.json·CHANGELOG 머리(개발 중→2026-11-03)·빌드 산출물. 릴리스는 main push 때만 — 아직 main 머지 안 함.
- 릴리스 전 점검(2026-11-03): main은 브랜치보다 앞선 커밋 없음·충돌 없음, 사이트 링크 깨짐 0, e2e 23개 중 22개 통과. `tests/e2e/run-app.mjs`는 옛 탭 이름(리수폿·인물·꾸미기) 기준이라 사이드바 확인 2개만 새 구성에 맞췄고 그 뒤 단계는 38줄에서 멈춤 → 새 탭 구성(장기 기억·코코아·기억 카드·플러그인 꾸미기 등)에 맞춰 다시 써야 함(회귀 아님, 이전부터 낡음). 릴리스 뒤 Pages 소스를 main /docs로 바꿀 것.
- 자동 릴리스 끔(사용자 지시 2026-11-03): release.yml은 main push로 돌지 않고 `v*` 태그 푸시(package.json 버전과 같아야 함)일 때만 릴리스. 릴리스하려면 사용자가 지시한 뒤 `git tag v1.8.3 <main 커밋> && git push origin v1.8.3`.

## Dusk Cellar (백그라운드 서버, 별도 저장소) — 진행 상황 2026-11-03
- 저장소: **Pyser08/Dusk-Cellar** (main, b48c204). 리스 폴더 안에 클론 → `node setup.cjs` 한 번으로 설치. 그쪽 `HandOff/STATE.md`가 상세 기준.
- 지금 있는 것(뼈대): `setup.cjs`(리스 시작 파일 자동 찾기 → pnpm/npm 빌드 → pm2 목록 보여 주고 지울 것 고르기(리스 직접 실행 항목 '추천') → 실행기 pm2 등록·save → 응답 확인), `cellar-start.cjs`(리스+Cellar 함께 켜고 끄기, Cellar만 재시작), `/cellar/health`(토큰 없이), 그 외 주소는 `dusk-data/token.txt` 토큰 필수, 127.0.0.1:6011. 시험 12개 통과(가짜 pm2·npm 전체 흐름 포함).
- 실제 설치: RisuBard 우분투 서버(pm2)에서 5/5 통과·health 응답(2026-11-03). 미확인: 윈도우·맥·Termux·원본 RisuAI.
- 결정됨: 이름 Dusk Cellar / 리스 프로세스 안에 섞지 않고 실행기로 함께 실행 / 서버는 선택 기능(없으면 플러그인 지금 방식) / 리스 데이터는 건드리지 않음.
- 플러그인 연결(2026-11-03): `src/data/cellar.js`(probeCellar: `api.nativeFetch(GET)` → 실패 시 fetch, health의 name==='dusk-cellar'만 연결, createCellar 1분 기억·동시 요청 합치기, 주소 키 `dusk.cellar.url` 기본 http://127.0.0.1:6011) + 설정 탭 '서버' 카드의 Dusk Cellar 줄(상태·다시 확인, 고급은 주소). 원리: 리스 노드 서버에서 nativeFetch는 리스 서버의 /proxy2(리스 암호 필요, 대상 제한 없음)가 대신 보내므로 127.0.0.1 = 그 서버 → Cellar는 loopback 요청을 토큰 없이 받음(`--require-token`이면 토큰 필수). 호스팅 RisuAI·PocketRisu는 '없음'이 정상. 시험 tests/cellar.test.js, e2e tests/e2e/run-cellar.mjs. 실제 RisuBard(Oracle VM)에서 '연결됨' 확인(2026-11-03). 미확인: PocketRisu·PC 앱.
- 다음: ① 1단계 기억 백업 + 화면에 필요한 조각만 돌려주기(효과 측정) ② (효과 있으면) 분석·임베딩 서버 실행.
- 장기기억 서버 저장(2026-11-03, 사용자 결정: 서버 감지 시 서버에만, 끊기면 플러그인에 임시 대기열): `src/data/memoryremote.js` — `memorystore3.js`에 `storage`를 주입(get/set/rm 3곳)해 `dusk.mem.v3.f.*`만 서버로. 인덱스·설정은 플러그인. 표시 `dusk.cellar.mem`(공유 저장소라 기기마다 다시 올리지 않음), 대기열 `dusk.cellar.queue`(폴더당 마지막 값, opId, baseRev null=모름 → 받아서 합침). 처음 감지 시 전부 올리고 다시 읽어 확인 후 표시. 옛 플러그인 사본은 지우지 않음(끊겼을 때 읽기, 되돌리기). 충돌은 `mergeFolder`(기록·장면 id 합치기, 위키 revision 큰 쪽, 이 기기 삭제 우선). 연속 2번 실패하면 30초 끊김으로 보고 대기열. `memory.js` start: `remote.init()`(표시만, 빠름) → migrate → `remote.detect()`(기다리지 않음). 설정 '서버' 창에 저장 위치·'기억을 이 기기로 되돌리기'. 시험 tests/memoryremote.test.js(13), e2e run-cellar.
- 세이브 백업(2026-11-03): Cellar `/cellar/backup`(증분 하드링크 스냅샷, 복원은 실행기가 리스 멈추고 처리) + `src/data/cellarbackup.js` + 설정 '서버' 창의 '세이브 백업…'(features에 backup일 때만). 시험 tests/cellarbackup.test.js, e2e run-cellar.
- 플러그인 코드 수정(2026-11-03, RisuBard만, 사용자 결정: 리스 암호는 다시 안 묻고 확인 창 + 고치기 전 백업이 대신): 리스가 플러그인의 다른 플러그인 수정을 막아(PR #1572) Cellar `POST /cellar/plugins`(action list·get·apply, features에 `plugins`)가 리스 설정 파일(`settings/app.json`, 비밀 이름이 섞이면 `secrets/credentials.json`)의 그 플러그인 `script`만 고치고 `/api/external-changes/resolve`(accept)로 리스가 받아들이게 한다(자세한 순서·안전장치는 Cellar HandOff/STATE.md). 플러그인 쪽: `src/data/cellarplugins.js`(호출·`lineDiff`·`headerProblem`·`describeEditError`), `src/ui/screens/pluginedit.js`(편집 → 변경 확인 → 백업 선택 → 적용 → 결과·되돌리기), 플러그인 탭 행 메뉴 '코드 수정'(`hasPluginEdit`일 때만). 600KB 넘는 코드는 색 없이 줄 번호만 있는 편집기(측정: 색 편집기는 1MB에 4초·2.3MB에 6초 멈추고, 글자를 칠 때마다 전체를 다시 칠함). 큰 코드는 gzip(scriptZ)으로 주고받는다(리스 프록시가 응답을 조각조각 넘겨 2.3MB가 20~30초 걸린 것이 원인 추정). `cellar.js`: 5xx에도 본문을 오류에 남김(`err.json`), `withTimeout`이 타이머를 지움. 시험 tests/cellarplugins.test.js, e2e run-pluginedit.mjs(+app.entry.js 가짜 /cellar/plugins·__bkJob). CHANGELOG·버전은 건드리지 않음(릴리스 때 반영).
- 플러그인 수정 미확인(실제 RisuBard 서버, 사용자 확인 필요): ① 우리가 고친 settings/app.json을 리스가 '외부 변경 검토'로 잡고 accept로 받아들이는지(소스상 /api/external-changes[/resolve]), ② 열린 화면이 새로고침 전에 저장할 때 우리 수정이 덮이는지(리스는 409로 막는 구조), ③ nativeFetch POST로 3.6MB 본문이 /proxy2를 지나는지, ④ 고치기 전 세이브 백업 시간(31만 파일)과 백업 5개 보관 한도에 수동 백업이 밀려나는 문제(플러그인 수정 때마다 1개씩 씀). 이 환경에선 npm 레지스트리에 못 닿아 실제 RisuBard 서버를 띄우지 못했다(가짜 서버로만 시험).
- 미확인: 실제 RisuBard에서 nativeFetch POST(/proxy2 → Cellar) 동작, 서버 저장 후 기억 화면·주입 체감 속도, 31만 파일 백업 시간, 복원 직후 열린 화면이 옛 DB를 다시 저장하는지.
- 정리 대기(삭제는 사용자 지시 필요): 이 저장소의 `server/dusk-start.cjs`, `tests/dusk-start.test.js`는 Cellar로 옮겨 가 중복.

## 플러그인 매니저(v3.0.1) 기능 이식 (사용자 요청 2026-11-03) — 1~4단계 구현, 5단계(인자 제어 문법)는 매니저 독자 규격이라 제외(사용자 확인)
기준: 사용자가 첨부한 `plugin-manager-v3_3.0.1.js`. 리스가 `setDatabaseLite`의 `plugins`를 잘라 내므로(v3.svelte.ts) 목록을 바꾸는 모든 일은 Cellar `/cellar/plugins`의 `mutate`가 한다(RisuBard만, features `plugins`).
- 데이터: `src/data/pluginmgr.js`(Cellar 호출·`parseRegister`/`buildRegister`/`convertApi21`·`dupPlan`·`makeBackup`/`planRestore`·프리셋 `snapshotPreset`/`presetOps`/`exportPresets`/`importPresets`·카테고리 JSON·`orphanMeta`·`pairTarget`), `src/data/storagemgr.js`(스토리지 저장 충돌 검사·내보내기·가져오기). 화면: `ui/screens/pluginmgr.js`(줄 작업·등록·중복·백업/복원·프리셋·메타 정리), `ui/screens/storageedit.js`(값 수정·새 키·가져오기), `plugins.js`에 연결(줄마다 켜기/끄기 스위치, 줄 메뉴 별칭·위로·아래로·삭제, ··· 메뉴 파일에서 등록·글로벌 프리셋·중복 정리·전체 백업·백업 복원·메타데이터 정리). 시험: tests/pluginmgr.test.js, storagemgr.test.js, e2e run-pluginmgr.mjs.
- 프리셋 = 켜짐/꺼짐 + 순서 + 카테고리(`rbm:pluginPresets:v1`). 설정값·플러그인 스토리지는 안 넣는다. 디바이스 페어는 이름만 저장(`pair.mobile/desktop`) — **화면 너비에 따라 자동 전환하는 동작은 아직 안 넣음**(`pairTarget`·`deviceKind` 함수만 있음).
- 하지 못한 것: TypeScript → JavaScript 변환(등록 화면이 TS로 보이면 경고만), 스토리지 5종 중 pluginStorage만(safeLocalStorage·IndexedDB·서버 저장소·DB 저장 데이터는 아직), 백업에 플러그인 스토리지 미포함(매니저와 같음), 실제 RisuBard 서버 확인 전부 미확인(가짜 서버 시험만).
- 알려진 위험: 백업 복원·통째 바꾸기는 목록 해시로 그새 바뀜을 막지만, 열려 있는 리스 화면이 나중에 저장하면 덮어쓸 수 있다(새로고침 안내).
- (2026-11-03 점검) 플러그인 탭: 서버 기능(Cellar plugins)이 있으면 **서버가 아는 목록**을 보여 준다(`getPlugins`가 `fromServerList`). 리스는 메모리 목록을 들고 있어 Cellar로 바꾼 직후 `getDatabase`는 옛 상태이기 때문. 리스 쪽과 다르면(`needsReload`) '새로고침 필요' 안내. 탭을 열 때 Cellar 확인을 기다리지 않는다(없는 사용자에게 1.5초 지연이 생기던 것 제거; 찾으면 한 번 다시 그림). 자기 자신(dusk_atelier)의 스위치·삭제는 막음. Cellar `replaceAll`(복원)은 머리말 이름 검사를 하지 않음(옛 플러그인 복원용). 백업(`/cellar/backup`)은 호스트 무관(폴더 스냅샷; PocketRisu SQLite는 온라인 백업) — 플러그인 '수정'만 RisuBard 전용.

- Cellar 업데이트 버튼(2026-11-03): `src/data/cellarupdate.js`(check/apply/rollback + 재연결 대기), 설정 → 서버 → Dusk Cellar 창 `rb-cellar-update`(features에 "update"일 때만). 서버는 Dusk-Cellar `update.cjs`·`POST /cellar/update`. 서버 실물 확인은 아직 못 함.

- 플러그인 수정 3호스트(2026-11-03): Cellar `plugins.cjs`가 risubard·risuai·pocketrisu 지원. 결과에 `overwritten`(브라우저가 옛 목록으로 덮어씀) 반영(pluginedit·pluginmgr). 실서버 확인은 아직.
- 업데이트 적용은 응답을 못 받아도(재시작 중 연결 끊김) 재연결 뒤 check로 끝났는지 확인(cellarupdate.js restarting).

## 1.9.0 — Cellar 새 버전 알림 (2026-11-03)
- `src/data/cellarlatest.js`: GitHub 최신 릴리스(Dusk-Cellar) 태그 vs 연결된 Cellar 버전 비교 → toast 1회(버전별, `dusk.cellar.notified`) + 설정 Cellar 줄에 '새 버전 vX'(`ctx.cellarNew`). app.js 열 때 호출. 시험: tests/cellarlatest.test.js.
- 확인 못 한 것: 실제 GitHub API 응답(Cellar 릴리스 v0.1.0이 있어야 동작), 리스 안에서 nativeFetch가 api.github.com을 통과하는지.

## 단계별 분석 (2026-11-04, 1.9.0)
- 원인(추정): 분석 프롬프트가 한 응답에 장면·인물·관계·감정·속마음·신뢰도…를 전부 요구해 길어지면 잘리거나 JSON이 깨져 실패/연속 실패(자동 기록 중단).
- 수정: `memoryprompt.js` `analyzeStaged` — 1단계(개요: 인물 name/act/p/s/r + 장면·관계·떡밥·게이지) 1번 + 점수 ≥1인 인물마다 세부 1번(최대 6명). 세부 실패는 개요만 남기고 계속(`onWarn` 로그). 설정 `settings.staged`(기본 true, 기억 설정에서 끔 → 예전 한 번 호출). 러너 analyzeAt가 사용(자동 기록·지난 대화 전체 분석 모두).
- 시험: tests/memoryprompt-staged.test.js. 한 번 호출을 전제로 한 기존 시험은 `staged=false` 고정.
- 확인 못 한 것: 실제 모델에서의 실패율 변화·호출 시간/비용, 개요 단계가 세부 필드를 안 내보내는지(프롬프트 준수), Risupot 합친 호출(link)은 그대로.

## 줄 형식 분석·가벼운 모드 (2026-11-04, 1.9.1)
- `engine/memorylines.js`: 줄 형식 파서/보정(`who|`,`rel|`,`to|…|인용`), 인용 검증, 이름 정규화. `memoryprompt.js analyzeLines`(1단계 개요→인물별 2단계, 200자 미만은 1단계만, 실패 시 형식 재안내→축소 재시도, 오류에 응답 앞부분). `settings.format="json"`이면 옛 JSON 경로.
- `applyEmo` smooth: ±1 약신호는 같은 방향 2회 누적 시 1칸, 반대는 상쇄, |d|≥2는 즉시, 잠금 값 불변.
- 가벼운 모드: `settings.light===true`일 때만(자동 판별 제거). 기억 설정 스위치.
- 저장소 `auto` = 항상 local(BardWiki는 직접 선택). 첫 진입 BardWiki 질문 제거(`modebar.js maybeAskBardWiki`는 no-op).
- 확인 못 한 것: 실제 약한 모델(DeepSeek flash 등)에서의 준수율·인용 검증 엄격도.

## 중복 인물 방지·한 번에 합치기 (2026-11-04, 1.9.1)
- 원인: Writer가 모델의 `create`를 그대로 믿어 같은 인물이 새 문서로 또 생김(구간이 겹치는 분석 등). 리스바드 BardWiki는 후보의 action을 믿지 않고 서버가 id→제목·별칭 키→별칭=제목→id 오타 순으로 대상을 다시 찾는다(`risubard-memory-analysis.ts resolveCanonicalTarget`), 모호하면 새로 만들지 않고 경고.
- 수정: `engine/pot-dedupe.js redirectDuplicateCreates`(character만) + `tools/pot-patches.json` 패치 2개(writer-apply.js에 import·호출). 이식 원본은 이 환경에 없어 생성 파일에 같은 문자열로 직접 적용 — 다음에 pot-split을 돌릴 때 패치가 같은 결과를 낸다.
- `engine/peopledupe.js`(묶음 찾기·일괄 합치기), UI `mergeui.js mergeSameNames`(더보기 메뉴, 합치기 되돌리기 가능).
- 인물 위키 왼쪽 목록 sticky + 내부 스크롤(`styles.js .rb-wk-side`), 좁은 화면은 기존 가로 목록.
- 확인 못 한 것: 실제 화면에서의 sticky 동작·큰 위키(50명+)에서 일괄 합치기 속도·충돌 많은 문서의 결과.

## BardWiki 비교 반영 P1·P2 (2026-11-04, 1.9.1)
- 실패 종류 구분: `memorylines.js failureKind/RETRY_NOTE/isNoneReply`, `memoryprompt.js askLines`(잘림→최소 요청, 빈 응답→최종 답 요구), 잘린 JSON은 개요 성공으로 치지 않음. 2단계 `none` 응답은 정상(저장 안 함).
- 이름 보정 `canonName`: 별칭만 겹침·오타 후보 여럿은 합치지 않음, 성/이름만 나오면 유일할 때만 합침. `pot-dedupe.js`: 같은 제목 여럿이면 sections 많은 문서, 별칭만 겹침은 합치지 않고 `ambiguous` 카운트.
- 과거 장면 회상: `memoryinject.js pastScenes`(settings.pastTokens 기본 200, 겹치는 낱말 2개 이상, 최대 2개).
- digest 안전: `memorydigest.js coversRecord`(bigram 40%) — 못 담은 기록은 digested 표시 안 함.
- 위키 점검: `engine/wikihealth.js`, UI `mergeui.js openWikiHealth`(더보기 → 위키 점검).
- 하지 않은 것: 전체 재분석 교체(Dusk의 backfill은 이미 추가식·재개식이라 덮어쓰지 않음, 별도 '초기화 후 재분석' 기능이 없음), 스키마 강제 출력·재순위·아크 지도(P3).
- 확인 못 한 것: 실제 모델에서 잘림 판별 휴리스틱(길이 1500자 이상 문장 중간 종료)이 맞는 비율, digest 40% 기준이 한국어 요약에서 너무 엄격한지, 과거 장면 회상의 낱말 겹침 기준(2개) 적정성.

## 스페셜 땡스: 위젯 홈 (v1.9.1 작업 중)
- `src/ui/screens/tools.js` THANKS에 `widgethome` 추가(플러그인 안에는 링크 없음).
- 다음 아카 글의 SPECIAL THANKS 블록에는 위젯 홈 원작 글 링크 사용: https://arca.live/b/characterai/188006855
- 위젯 홈 덮는 범위: `home-layout.cjs` `railEdge`/`boxOf`(generic일 때 아이콘 줄 오른쪽부터), `auto-home.cjs` isHome에 'setting' 클래스 큰 요소 차단 추가. 실제 RisuBard 클래스명은 미검증.
- 리스바드 실제 화면 기준: 아이콘 줄은 CSS 약 44px → railEdge 최소 너비 32px. 설정 화면은 '설정 검색' 입력칸/'앱으로 돌아가기' 버튼으로 감지.
- 원인: 홈 자리에 떠 있으면 auto-home check가 바로 return해서 설정 이동을 못 봄 → 떠 있을 땐 settingsOpen만 검사해 닫음. host e2e에 설정 화면 2항목 추가.
- 위젯 홈 리스바드 3건(2026-11-04 20시): ①새로고침 시 전체 화면 → boot는 화면 접근 되면 `open(false,{automatic,quiet})`로 홈 자리에만 6회 재시도 ②홈 복귀 시 안 뜸 → 자동 열기 실패 시 pause+alert 하던 것 제거(다음 감지 때 재시도), 클릭 후 0.7·1.6초 재검사, 설정 감지는 화면 안에 보이는 요소만 ③아이콘 줄 못 찾음 → `rect()`가 160px 미만을 버려서였음, `rawRect`로 측정(3번에 1번 재측정). host e2e에 44px 아이콘 줄 항목 추가.
- 아이콘 줄 끝 +1px 여유, aside/nav 등도 후보(사이드바 삐짐 대응).
- 리스바드 실측: 아이콘 줄 = `.rs-sidebar.character-list-sidebar`(80px), 안쪽 `.character-list` 72px → 사이드바 자체가 좁으면 그 끝을 경계로.
- Dusk 열었다 닫기: controller yieldToDusk가 resumeAfterDusk 표시 → app.js close() 끝에 ctx.onClosed → main.js에서 widgetHome.resume(). 홈 배치 코드는 건드리지 않음.
- 열린 항목 중복: applyOpen이 닫기를 먼저 처리, 중복 판정에 닫힌 항목 포함(같은 kind 0.5/다른 kind 0.8), openForPrompt 24개, 프롬프트 문구 보강. 모델이 안 닫아 주면 자동으론 안 닫힘(미해결).

## 다음 작업(NSFW 추가 기능, 사용자 승인됨: "저거 다 만들고")
1. Dusk 이야기 날짜를 Erosync 주기 계산에 반영(지금은 Dusk 월경 기록이 켜져 있으면 Erosync 주기만 쉼; `cycleProbe`/`duskFlagsSet` 참고)
2. 봇별 수위 프리셋(수위·동작·집착 방지 값 묶음 저장/적용; `erosynclevel.js`·`erosyncconfig.js`·`erosyncguard.js`)
3. 장면 되돌리기(직전 장면 판단·프로필 변화 한 턴 되돌림)
4. 인물 위키 NSFW 탭 위쪽 한 줄 요약(지금 목표·최근 변화·쉬는 턴; `erosyncwiki.js` `eroNsfwCard`)
5. 인물 1명 NSFW 프로필만 내보내기/가져오기(`memoryfile.js` 재사용)
6. NSFW 기록 확장(아래): 장면 타임라인, 관계 수위 변화 그래프, 비하인드 검색·고정, 장면 메모, 직전 판단 이유 보기, 기록 CSV/MD 내보내기 — 모두 AI 추가 호출 없이 이미 저장된 값만 사용.
규칙: 비용 늘리는 기능(장면마다 AI 추가 호출)은 넣지 않음. 시작 전 STATE.md·`erosyncwiki.js`부터 읽을 것.

## NSFW 추가 기능 구현 완료(2026-11-05, 같은 브랜치)
- 새 데이터 모듈: `src/data/erosyncpreset.js`(프리셋 `dusk.erosync.presets`), `erosynctags.js`(태그 `erosync_dusk_tags_v1` → 장기 기억 파일에 자동 포함), `eroprofilefile.js`(인물 1명 파일 `dusk-ero-profile` v1). 컨트롤러 `createErosync`에 presets/savePreset/applyPreset/deletePreset/tags/setTags/tempTrend/undoScene 추가.
- 엔진(`src/erosync/erosync.js`) 추가: `duskTags*`(선호·금기를 `selectedProfileSummary`에 넣음), `duskTempRecord/Line/Series`(확정 때 관계 온도 기록 `state.duskTemp`, 최근 120턴, 되돌린 뒤 앞선 기록 무시, `flags.tempTrend`), `duskUndoLastScene`(`undo.lastScene`: `undoCommitEntries` + 최신 응답을 읽은 것으로 표시), `duskStoryAbsolute`(`host.storyStatus`로 Dusk 이야기 시간 날짜를 주기 시계에 우선 적용; main.js에서 연결), 읽기 값에 `rests`·`temp` 추가.
- **버그 수정**: `normalizeSessionState`가 `state.duskGuard`를 떨어뜨려 집착 방지 연속/쉬는 턴이 턴을 넘어 이어지지 않았음 → 보존하도록 수정(테스트 있음).
- UI: 수위 탭 `erosyncpresetui.js`, 동작 탭 `erosyncundoui.js`, NSFW 탭 `eroSummaryCard`(erosyncwiki.js)·`erosynctempui.js`·`erosynctagsui.js`·프로필 내보내기/가져오기 버튼(`erosyncprofilefileui.js`). 순수 함수 `eroSummary/eroTemp/tempPath`는 `src/engine/erosyncview.js`.
- 못 한 것/미확인: 실제 채팅·모델에서 장면 되돌리기·관계 온도 기록·태그 주입·이야기 날짜 시계가 도는지(엔진 함수는 단위 시험·소스 확인만), 세 호스트 실기기. 관계 온도의 ‘반감’은 엔진의 hatred 값(별도 ‘긴장’ 값은 없음). 되돌리기 뒤 집착 방지 상태(`duskGuard`)와 온도 기록은 같은 턴 이상만 다음 기록 때 정리됨.
- **값 입력 칸 UI(2026-11-05)**: `src/ui/fields.js`(sliderField·selectField·controlField·toggleField) + `styles.js`의 `.rb-fld`·`.rb-range`. Erosync 수위/동작/분석/집착 방지 카드가 사용. 다른 화면의 기본 모양 input은 이번에 건드리지 않음.
- 집착성 상한 기본 20(엔진·컨트롤러·UI). 선택 칸은 `choiceField`(optionCards+설명), 스위치는 `.rb-toggle`(장기 기억과 같은 모양). '검토 후 반영'(기본값)은 Dusk에 확인 화면이 없어 후보만 쌓임 → 설명에 적어 둠, 기본값 변경은 사용자 결정 필요.

- Erosync 수위 일괄화: 엔진 `globalContent` 오버레이(getBotOverride) + `inst.content.global()`, 값은 dusk.erosync.level(src/data/erosync.js). 봇별 저장은 더 안 씀(기존 봇별 값은 일괄 값이 있으면 가려짐). 지난 대화 분석: 미분석만, 없으면 전체 재분석(안내 후 확인).
