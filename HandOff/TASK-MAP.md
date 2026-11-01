# 작업별 읽을 파일 (이것만 읽고 시작)

전체 지도는 `docs/source-map.md`. 아래는 자주 하는 작업의 최소 묶음. 테스트는 같은 이름의 `tests/<이름>.test.js`.

| 작업 | 먼저 읽을 파일 |
|---|---|
| 앱 진입·훅 등록 | `src/main.js` |
| 메뉴·탭 구성 | `src/ui/tabs.js`, `src/ui/app.js` |
| 홈 화면 | `src/ui/screens/home.js` |
| 장기기억 — 메시지 식별/앵커 | `src/engine/chattext.js`, `src/engine/memoryreconcile.js`, `src/data/memoryload.js` |
| 장기기억 — 자동 분석 흐름 | `src/data/memoryrunner.js`(분석·백필), `src/data/memoryturn.js`(턴 흐름·확정), `src/engine/memoryapply.js`(결과 반영) |
| 장기기억 — 프롬프트 | `src/engine/memoryprompt.js`, `src/data/memory-default-prompts.js` |
| 장기기억 — 주입 | `src/data/memoryinject.js`, `src/engine/memoryinject.js`, `src/engine/recall.js` |
| 장기기억 — 저장소 | `src/data/memorystore3.js` (키 `dusk.mem.v3.*`), 마이그레이션 `src/engine/memoryv3.js` |
| 장기기억 — 화면 | `src/ui/screens/memory/index.js` → 필요한 하위 파일(`mhome.js`, `wikiview.js`, `settings.js` …) |
| 모델·API 호출 | `src/data/modelhub.js`, `src/engine/runai.js`, `src/engine/modelcfg.js` |
| 로어북 | `src/engine/lorerules.js`, `src/data/lorerules.js`, `src/ui/screens/loredusk.js` |
| 페르소나 빌더 | `src/data/personabuilder.js`, `src/ui/screens/personabuilder.js` |
| AI로 봇 만들기 | `src/ui/screens/aibuild.js`, `src/ui/screens/newbot.js` |
| 테마 빌더/꾸미기 | `src/ui/screens/themebuilder.js`, `src/ui/screens/chattheme.js`, `src/ui/theme.js` |
| 플러그인 탭·DA Interop | `src/data/plugins.js`, `src/data/interopSnippet.js`, `src/ui/screens/plugins.js` |
| 설정 | `src/ui/screens/settingstab.js`, `src/ui/screens/settings.js` |
| 리수폿 통합 (수정 금지 영역) | `tools/pot-split.mjs`, `tools/pot-patches.json` → 원본은 `ref/risupot` 브랜치 |
| 빌드·릴리스 | `tools/build.mjs`, `.github/workflows/release.yml`, `package.json`, `CHANGELOG.md` |

## 빠른 검색 팁
- 함수 위치: `grep -rn "export function 이름" src/`
- 사용처: `grep -rln "이름" src/ tests/`
- 큰 파일은 필요한 줄 범위만 읽기.
