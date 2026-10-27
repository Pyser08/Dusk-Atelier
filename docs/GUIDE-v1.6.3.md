# Dusk Atelier v1.6.3 안내 (개발 메모)

## 이번에 건드린 곳
- `src/engine/lorelist.js` (순수): `sortLoreByName`(폴더 안 정렬, 구분선 제자리), `pickTree`(선택기용 트리), `childrenMap`. 테스트 `tests/lorelist.test.js`.
- `src/ui/entrypicker.js`: 폴더 트리 + 검색 모달 선택기. 에디터의 `pickEntry`(조건·연쇄)가 사용.
- `src/ui/screens/editor.js`: 이름순 버튼(`applySort`/`sortMenu`), `area(..., { tokens: true })` 토큰 표시.
- `src/engine/lorerules.js` evaluate(): 소속 켜짐 이유에 따라 수동(passive) 소속 처리, 장소는 `affs[0]`(가장 가까운 소속)만, 연쇄 루프 복구. 테스트 `tests/loreaff.test.js`.

## 주의
- 이름순 정렬은 배열 순서만 바꾼다. 폴더 구조는 항목의 부모 표시(`da_parent` / 리스 순정 `folder`)가 정하므로 그대로다. 에디터의 `isLoreDivider`는 키·내용이 빈 항목을 구분선으로 보기 때문에 폴더 항목을 먼저 걸러낸다(`lorelist.js`).
- 토큰 수는 `estimateTokens`(engine/memoryinject.js)의 어림값이다. 모델별 실제 토큰 수와 다를 수 있다.

## 2~6단계에서 건드린 곳 (개발 메모)
- 최적화: `src/ui/app.js` 탭 DOM 보존(plugins·tools·settings), 기억 탭은 오른쪽 칸만 재렌더 + loadChats 캐시. 1단계(측정 하네스)는 생략해서 전후 수치는 없다.
- 에디터: `src/ui/screens/editor.js` 자동 저장(2분)·Ctrl+P/H·트리 키보드·정규식 시험.
- 더스크화: `src/engine/loredusk.js`(순수, 규칙 변환 + AI 응답 해석), `src/ui/screens/loredusk.js`(미리보기·적용), `tests/loredusk.test.js`.
- UI 리뉴얼: `src/ui/theme.js`(토큰·프리셋), `src/ui/tooltip.js`, `src/ui/tour.js`(처음 둘러보기).

## 릴리즈 체크 (7단계)
- `npm test` 140개 통과, `npm run build` 후 `npm run check` 동일 확인, package.json 1.6.3.
- 장소 동작 변경(가장 가까운 소속만)은 CHANGELOG "알아 두세요"에 적었다.
- 아카 글: `docs/arca/v1.6.3.html`.
