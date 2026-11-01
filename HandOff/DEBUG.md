# 디버그 절차 — "이 부분이 버그예요"를 받았을 때

## 1. 증상 → 위치 찾기
1. 사용자가 말한 **화면 이름/버튼 문구**를 그대로 검색: `grep -rn "버튼 문구" src/ui` → 화면 파일 확정.
2. 화면이 부르는 `data/` 함수 → 그 안의 `engine/` 순수 함수 순서로 따라간다(`HandOff/TASK-MAP.md`).
3. 콘솔 로그는 전부 `[Dusk Atelier]` 접두사. 사용자에게 개발자도구 콘솔에서 이 접두사로 필터한 로그를 받으면 빠르다.
4. `CHANGELOG.md`에서 관련 기능의 최근 변경 버전을 찾고 `git log -S "함수명" --oneline`으로 원인 커밋 추적.

## 2. 재현은 테스트로
- 원인이 `engine/`이면 **실패하는 테스트를 먼저** `tests/<모듈>.test.js`에 추가 → 수정 → 통과 확인. (`node --test tests/x.test.js`로 한 파일만)
- `data/`는 가짜 api 객체로 테스트한다(기존 `tests/memoryrunner.test.js`의 fake api 패턴 복사).
- UI는 `tests/e2e/*.entry.js` + `run-*.mjs`(Playwright, 가짜 ctx). 샌드박스에서 `/opt/npm-tools` 경로를 가정하므로 로컬에선 경로 조정.

## 3. 호스트별로만 나는 버그
- "PocketRisu/RisuBard에서만": `getRuntimeInfo` 분기, 캐릭터 순서, 저장 지연, `getRootDocument` 셀렉터 차이를 먼저 의심 → `HandOff/HOST-COMPAT.md`.
- "저장이 안 돼요": `isHostBlocked` 문구인지 확인(호스트가 막은 것 → 코드 버그 아님, 안내만).
- "기억이 두 번 들어가요": BardWiki와 local 동시 사용 여부(`data/memorybackend.js`).
- "느려요/버벅여요": 전체 재렌더(`ctx.refresh()`)가 원인인 경우가 많다 → 해당 영역만 `replace()`로 부분 갱신.

## 4. 장기기억 버그 특유의 점검
- 메시지 식별은 `engine/chattext.js` `messageIdentity`(v1.8.1, `feat/1.8.1` 브랜치에서 추가 — main에는 아직 없음). 앵커 `{at, mid, h}` 정합성은 `engine/memoryreconcile.js`.
- 리롤·삭제·편집 후 문제 → `reconcile()` 경로. 저장본 대신 **읽을 때 사본에서** 맞추는 게 원칙(`data/memoryload.js`).
- 저장 구조를 바꾸면 이미 쌓인 사용자 데이터가 있다는 걸 잊지 말 것 → 마이그레이션 + 예전 형식 테스트.

## 5. 수정 후
`npm test` → `npm run build` → `npm run check`("동일함") → 빌드물 포함 커밋(사용자가 지정한 브랜치에). 버전·CHANGELOG는 사용자가 요청할 때만.
수정 보고는 사용자에게 **원인 한 줄 + 고친 내용 한 줄 + 영향 범위**로 짧게.
