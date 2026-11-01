# 작업별 읽을 파일 (이것만 읽고 시작)

전체 지도는 `HandOff/source-map.md`. 아래는 자주 하는 작업의 최소 묶음. 테스트는 같은 이름의 `tests/<이름>.test.js`.

| 작업 | 먼저 읽을 파일 |
|---|---|
| 앱 진입·훅 등록 | `src/main.js` |
| 메뉴·탭 구성 | `src/ui/tabs.js`, `src/ui/app.js` |
| 홈 화면 | `src/ui/screens/home.js` |
| 장기기억 — 메시지 식별/앵커 | `src/engine/chattext.js`, `src/engine/memoryreconcile.js`, `src/data/memoryload.js` |
| 장기기억 — 자동 분석 흐름 | `src/data/memoryrunner.js`(분석·백필), `src/data/memoryturn.js`(턴 흐름·확정), `src/engine/memoryapply.js`(결과 반영) |
| 장기기억 — 프롬프트 | `src/engine/memoryprompt.js`, `src/data/memory-default-prompts.js` |
| 장기기억 — 주입 | `src/data/memoryinject.js`, `src/engine/memoryinject.js`, `src/engine/recall.js` |
| 장기기억 — 정규식 전처리·[Dusk.memory]·HypaPlus 가져오기 | `src/engine/regexprep.js`, `src/data/regexprep.js`, `src/engine/memoryinject.js`(insertBlock), `src/engine/hypaimport.js`, `src/data/hypaimport.js`, `src/ui/screens/memory/hypamodal.js` |
| 장기기억 — 저장소 | `src/data/memorystore3.js` (키 `dusk.mem.v3.*`), 마이그레이션 `src/engine/memoryv3.js` |
| 장기기억 — 화면 | `src/ui/screens/memory/index.js` → 필요한 하위 파일(`mhome.js`, `wikiview.js`, `settings.js` …) |
| 스킬(코코아전트 호환)·웹 도구 | `src/engine/skills.js`, `src/engine/skillcfg.js`, `src/engine/skillhook.js`, `src/data/skillstore.js`, `src/engine/cocoamigrate.js`, `src/ui/screens/memory/skills.js` / 웹: `src/engine/websearch.js`, `src/data/webtools.js`, `src/engine/webhook.js` / 주입 지점: `src/data/memoryturn.js`(stageCall), `src/data/memoryrunner.js`(run) |
| 모델·API 호출 | `src/data/modelhub.js`, `src/engine/runai.js`, `src/engine/modelcfg.js` |
| 로어북 | `src/engine/lorerules.js`, `src/data/lorerules.js`, `src/ui/screens/loredusk.js` |
| 로어북 더스크화 규칙 설계 | `src/dev/aibuild/lorerefine.js`(duskdesign.js 규격 재사용), `src/ui/screens/loredusk.js` |
| 봇빌더 연동(AI로 봇 만들기) | `src/engine/workshop.js`, `src/data/workshop.js`, `src/data/workshoppatch.js`, `src/ui/screens/workshoplink.js`, `src/data/plugins.js`(DA Interop 동작) |
| 페르소나 빌더 | `src/data/personabuilder.js`, `src/ui/screens/personabuilder.js` |
| AI로 봇 만들기 | `src/ui/screens/aibuild.js`, `src/ui/screens/newbot.js` |
| 테마 빌더/꾸미기 | `src/ui/screens/themebuilder.js`, `src/ui/screens/chattheme.js`, `src/ui/theme.js` |
| 플러그인 탭·DA Interop | `src/data/plugins.js`, `src/data/interopSnippet.js`, `src/ui/screens/plugins.js` |
| 설정 | `src/ui/screens/settingstab.js`, `src/ui/screens/settings.js` |
| 리수폿 통합 (수정 금지 영역) | `tools/pot-split.mjs`, `tools/pot-patches.json` → 원본은 `ref/risupot` 브랜치 |
| 빌드·릴리스 (릴리스·버전은 사용자 지시 시만) | `tools/build.mjs`, `.github/workflows/release.yml`, `package.json`, `CHANGELOG.md` |

## 빠른 검색 팁
- 함수 위치: `grep -rn "export function 이름" src/`
- 사용처: `grep -rln "이름" src/ tests/`
- 큰 파일은 필요한 줄 범위만 읽기.
