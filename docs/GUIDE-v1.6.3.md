# Dusk Atelier v1.6.3 안내 (개발 메모)

## 이번에 건드린 곳
- `src/engine/lorelist.js` (순수): `sortLoreByName`(폴더 안 정렬, 구분선 제자리), `pickTree`(선택기용 트리), `childrenMap`. 테스트 `tests/lorelist.test.js`.
- `src/ui/entrypicker.js`: 폴더 트리 + 검색 모달 선택기. 에디터의 `pickEntry`(조건·연쇄)가 사용.
- `src/ui/screens/editor.js`: 이름순 버튼(`applySort`/`sortMenu`), `area(..., { tokens: true })` 토큰 표시.
- `src/engine/lorerules.js` evaluate(): 소속 켜짐 이유에 따라 수동(passive) 소속 처리, 장소는 `affs[0]`(가장 가까운 소속)만, 연쇄 루프 복구. 테스트 `tests/loreaff.test.js`.

## 주의
- 이름순 정렬은 배열 순서만 바꾼다. 폴더 구조는 항목의 부모 표시(`da_parent` / 리스 순정 `folder`)가 정하므로 그대로다. 에디터의 `isLoreDivider`는 키·내용이 빈 항목을 구분선으로 보기 때문에 폴더 항목을 먼저 걸러낸다(`lorelist.js`).
- 토큰 수는 `estimateTokens`(engine/memoryinject.js)의 어림값이다. 모델별 실제 토큰 수와 다를 수 있다.
