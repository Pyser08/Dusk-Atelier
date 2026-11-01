# HandOff — 다른 AI/새 세션용 시작 문서

> 저장소 `Pyser08/Dusk-Atelier`만 연결하면 이 폴더부터 읽고 바로 작업할 수 있게 정리한 문서.
> 기준: `feat/1.8.1` 브랜치 (2026-11-01, 커밋 `fc8866e`)

## 1. 이 프로젝트는
RisuAI 플러그인 **Dusk Atelier** — 모듈·봇 관리, 인물별 장기기억, 로어북·테마 도구.
소스는 `src/`(ES 모듈), 배포물은 빌드된 단일 파일 `dusk_atelier.js`(IIFE, git에 포함).

## 2. 읽는 순서 (토큰 절약)
1. `HandOff/README.md` (이 문서) — 작업 규칙
2. `HandOff/STATE.md` — 지금 브랜치 상태·남은 일
3. `HandOff/TASK-MAP.md` — "이런 작업이면 이 파일들만"
4. `docs/source-map.md` — 전체 파일 지도 (필요한 줄만 검색해서)
5. 그다음 **필요한 소스 파일만** 읽는다. `dusk_atelier.js`(3.6MB 빌드물)는 절대 읽지 않는다.

## 3. 환경 준비
```bash
git clone --depth 1 -b feat/1.8.1 https://github.com/Pyser08/Dusk-Atelier
cd Dusk-Atelier
npm ci            # 막히면: esbuild·acorn·eslint-scope를 /opt/npm-tools/node_modules 등에서 node_modules/로 심볼릭 링크
```
- Node 22 기준. 얕은 복제라 main과 비교하려면 `git fetch --depth=80 origin main:refs/remotes/origin/main`.

## 4. 작업 루프
1. 브랜치에서 작업 (`feat/x.y.z`). main 직접 수정 금지.
2. 소스 수정 → `npm test` (현재 443 pass / 9 skip / 0 fail)
3. `npm run build` → `dusk_atelier.js` 재생성, `npm run check`로 "동일함" 확인. **빌드물도 함께 커밋.**
4. UI를 건드렸으면 `node tests/e2e/run-smoke.mjs`로 연기 시험.
5. 버전 올릴 때: `package.json` version + `CHANGELOG.md` 맨 위 `## vX.Y.Z (YYYY-MM-DD)` 섹션 (앱 내 '새로 바뀐 점'에 그대로 표시됨, 사용자 대상 존댓말 "~해요").
6. 구조(파일 추가/삭제/역할 변경)가 바뀌면 `node tools/source-map.mjs > docs/source-map.md` 재생성 후 커밋.
7. main에 push(머지)하면 `release.yml`이 package.json 버전으로 GitHub 릴리스 자동 생성.

## 5. 반드시 지킬 규칙
- 계층: `src/engine/` 순수 로직(브라우저·api 없이 테스트) / `src/data/` api·저장소 / `src/ui/` 화면 / `src/tide/` RisuTide.
- `src/engine/pot/`, `src/data/pot/`는 `tools/pot-split.mjs`가 **자동 생성** → 직접 수정 금지.
- UI는 부분 갱신 우선(전체 재렌더는 버벅임 원인). DOM은 `ui/dom.js`의 `h()`/`replace()`, 공용 위젯은 `ui/kit.js`.
- 장기기억 저장 데이터는 사용자 기기에 이미 쌓여 있음 → 식별자·스키마 변경 시 **반드시 예전 데이터 마이그레이션 + 테스트** (v1.8.1이 그 예시).
- 원본 봇·채팅은 수정하지 않고 새 객체만 만든다(합성·되감기 등).
- `git remote set-url` 차단됨. push 전 `git fetch origin <브랜치>` 후 rebase.
- 커밋 메시지는 영어 짧게, 사용자 대상 문구(CHANGELOG·UI)는 한국어.

## 6. 참고 문서
- 이전 인계: `docs/HANDOFF-v1.6.4.md`(리수폿 통합·장기기억 구조), `docs/HANDOFF-v1.6.7.md`
- 버전 안내: `docs/GUIDE-v*.md`, 아카라이브 글: `docs/arca/v*.html`
