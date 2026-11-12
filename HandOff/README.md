# HandOff — 다른 AI/새 세션용 시작 문서

> 저장소 `Pyser08/Dusk-Atelier`만 연결하면 이 폴더부터 읽고 바로 작업할 수 있게 정리한 문서.

## 현재 작업 브랜치 (바뀔 때마다 이 표를 갱신할 것)

| 저장소 | 작업 브랜치 | 비고 |
|---|---|---|
| Dusk-Atelier | `SD-Studio` | v2.1.7 코어 릴리스(11-12, 봇 업데이트 뒤 옛 Lua 트리거 남는 버그. 장기기억 애드온 0.2.11 배포). 에셋 제작(sdstudio) 애드온은 아직 배포 안 함 — 이어서 할 일은 SD-Studio의 STATE.md 맨 아래 |
| Dusk-Cellar | `feat/0.1.0` | 기억 저장소(`/cellar/mem`) — Atelier 쪽 연동은 위 Atelier 브랜치에서 작업 |

- **작업 브랜치가 바뀌면(새로 만들거나 옮길 때) 같은 작업 안에서 이 표를 main의 `HandOff/README.md`에 고치고 push한다.** 이 문서는 main에서 읽히므로, 표가 낡으면 다음 AI가 옛 브랜치에서 작업하게 된다. (이 표만 고치는 main 수정은 릴리스가 되지 않는다.)
- 각 브랜치의 `HandOff/STATE.md`가 진행 상황의 기준이다. 표의 브랜치가 실제 최신인지 의심되면 `git ls-remote --heads origin 'feat/*'`로 확인하고 사용자에게 묻는다.

## 1. 이 프로젝트는
RisuAI 플러그인 **Dusk Atelier** — 모듈·봇 관리, 인물별 장기기억, 로어북·테마 도구.
소스는 `src/`(ES 모듈), 배포물은 빌드된 단일 파일 `dusk_atelier.js`(IIFE, git에 포함).

## 2. 읽는 순서 (토큰 절약)
1. `HandOff/README.md` (이 문서) — 작업 규칙
2. `HandOff/STATE.md` — 지금 브랜치 상태·남은 일
3. `HandOff/TASK-MAP.md` — "이런 작업이면 이 파일들만"
4. 작업 종류별 문서 (해당하는 것만):
   - 버그 수정 → `HandOff/DEBUG.md`
   - 외부 JS 병합/기능 추가 → `HandOff/MERGE-JS.md`
   - 화면 만들기/수정 → `HandOff/UI-STYLE.md`
   - 아카라이브 업데이트 글 HTML → `HandOff/ARCA-POST.md`
   - 어떤 작업이든 api·훅·저장을 건드리면 → `HandOff/HOST-COMPAT.md` (RisuAI·RisuBard·PocketRisu 공통 동작 규칙)
5. `HandOff/source-map.md` — 전체 파일 지도 (필요한 줄만 검색해서)
6. 그다음 **필요한 소스 파일만** 읽는다. `dusk_atelier.js`(3.6MB 빌드물)는 절대 읽지 않는다.

## 3. 환경 준비
```bash
git clone --depth 1 -b <위 표의 작업 브랜치> https://github.com/Pyser08/Dusk-Atelier
cd Dusk-Atelier
npm ci            # 막히면: esbuild·acorn·eslint-scope를 /opt/npm-tools/node_modules 등에서 node_modules/로 심볼릭 링크
```
- Node 22 기준. 얕은 복제라 main과 비교하려면 `git fetch --depth=80 origin main:refs/remotes/origin/main`.

## 4. 사용자 허락 없이 하지 말 것 (최우선)
- **버전 올리기 금지**: `package.json` version, `CHANGELOG.md`의 새 버전 섹션, `docs/GUIDE-v*.md` 새 파일을 사용자가 지시하지 않으면 만들거나 바꾸지 않는다. 기존 버전 섹션에 내용 추가도 지시가 있을 때만.
- **브랜치 생성·전환 금지**: 사용자가 지정한 브랜치에서만 작업한다. 지정이 없으면 묻는다. 새 브랜치를 임의로 만들지 않는다.
- **main 수정·머지·태그 금지**: main push는 릴리스가 되지 않는다(2026-11-03부터 자동 릴리스 꺼짐 — `v*` 태그를 푸시해야 릴리스). 사용자가 명시적으로 요청할 때만.
- 파일 삭제·이름 변경, 저장 데이터 형식 변경, 워크플로 수정도 먼저 확인받는다.
- 판단이 애매하면 작업 전에 한 줄로 묻는다.

## 5. 작업 루프
1. 사용자가 지정한 브랜치에서 작업한다.
2. 소스 수정 → `npm test` (현재 443 pass / 9 skip / 0 fail)
3. `npm run build` → `dusk_atelier.js` 재생성, `npm run check`로 "동일함" 확인. **빌드물도 함께 커밋.**
4. UI를 건드렸으면 `node tests/e2e/run-smoke.mjs`로 연기 시험.
5. (사용자가 버전 올리라고 했을 때만) `package.json` version + `CHANGELOG.md` 맨 위 `## vX.Y.Z (YYYY-MM-DD)` 섹션 (앱 내 '새로 바뀐 점'에 그대로 표시됨, 사용자 대상 존댓말 "~해요").
6. 구조(파일 추가/삭제/역할 변경)가 바뀌면 `node tools/source-map.mjs > docs/source-map.md && cp docs/source-map.md HandOff/source-map.md`로 재생성(두 파일 동일 유지) 후 커밋.
6-1. **기능 설명이 바뀌거나 새 기능이 생기면 안내서 사이트(`docs/site/guide/*.html`)도 같이 고친다**(사용자 지시). 내용은 CHANGELOG·코드 문구 기준. 아카 글(`docs/arca/v*.html`)은 사용자가 요청할 때만.
7. 작업을 마칠 때 **`HandOff/STATE.md`의 "남은 일"과 변경 요약을 최신으로 고친다**(다음 AI가 이어받는 기준. 끝낸 항목은 `[x]`, 새로 발견한 문제는 추가).
8. 참고: main에 push(머지)되면 `release.yml`이 package.json 버전으로 GitHub 릴리스를 자동 생성한다 → 그래서 main은 사용자 지시 없이는 건드리지 않는다.

## 6. 반드시 지킬 규칙
- 계층: `src/engine/` 순수 로직(브라우저·api 없이 테스트) / `src/data/` api·저장소 / `src/ui/` 화면 / `src/tide/` RisuTide.
- `src/engine/pot/`, `src/data/pot/`는 `tools/pot-split.mjs`가 **자동 생성** → 직접 수정 금지.
- UI는 부분 갱신 우선(전체 재렌더는 버벅임 원인). DOM은 `ui/dom.js`의 `h()`/`replace()`, 공용 위젯은 `ui/kit.js`.
- 장기기억 저장 데이터는 사용자 기기에 이미 쌓여 있음 → 식별자·스키마 변경 시 **반드시 예전 데이터 마이그레이션 + 테스트** (v1.8.1이 그 예시).
- 원본 봇·채팅은 수정하지 않고 새 객체만 만든다(합성·되감기 등).
- **AI를 쓰는 모든 작업은 '생성 중지' 버튼에 잡혀야 한다(2.1.0, 사용자 상시 지시).** 코어·애드온 모두 AI 호출은 `engine/runai.js`의 `runAI` 또는 `api.runLLMModel`(main.js가 감싼 것)로만 부른다 — 둘 다 `engine/aistop.js`가 세어 오른쪽 아래 버튼(`ui/aistopbtn.js`)을 띄운다. fetch로 직접 모델을 부르는 새 코드는 `trackAi(label, signal)`로 감싸고 `race()`·`end()`를 쓴다. **여러 번 부르는 작업은 이름을 붙여 묶는다**: `runAITask("작업 이름", api, msgs, pick, signal)` 또는 `aiTask("작업 이름", fn)` — 버튼에 ‘생성 중지 · 작업 이름’이 보이고, 중지하면 그 작업이 끝날 때까지 남은 호출이 바로 끊긴다(대기열까지 멈춤). 중지 오류는 `isStopError(e)`로 가려 실패 알림·자동 재시도를 하지 않는다. 새 AI 기능 e2e에는 "작업 중 버튼 보임 → 누르면 멈춤" 확인을 넣는다(`tests/e2e/run-persona-sop.mjs` 끝 참고).
- `git remote set-url` 차단됨. push 전 `git fetch origin <브랜치>` 후 rebase.
- 커밋 메시지는 영어 짧게, 사용자 대상 문구(CHANGELOG·UI)는 한국어.

## 7. 참고 문서
- 이전 인계: `docs/HANDOFF-v1.6.4.md`(리수폿 통합·장기기억 구조), `docs/HANDOFF-v1.6.7.md`
- 버전 안내: `docs/GUIDE-v*.md`, 아카라이브 글: `docs/arca/v*.html`
- 백그라운드 서버: 별도 저장소 **Pyser08/Dusk-Cellar** (진행 상황은 STATE.md 'Dusk Cellar')
- 안내서 사이트: `docs/site/` — 기능 설명이 바뀌면 같이 수정(STATE.md '안내서 사이트' 참고)

- 모든 작업 전에 `HandOff/QUALITY.md`(검토 지침·박스 여백 규칙)를 읽는다.
