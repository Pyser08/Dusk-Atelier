# Dusk Atelier v1.6.4 안내 (개발 메모)

리수폿(risupot 2.3.0) 병합 + 장기기억 완성. 인계·단계별 기록은 `HANDOFF-v1.6.4.md`, 구조 지도는 `source-map.md`(`node tools/source-map.mjs`로 갱신).

## 사용자 흐름
1. 기억 탭 홈 → **처음 설정하기**(AI 고르기 → 추적 수준 → 켜기). 스위치만 켜도 ‘기본’ 수준 적용(`engine/firstrun.js`).
2. 켜면 요청 직전 훅 하나(위키→Dusk 블록), 응답 뒤 기록은 호출 1회(`data/memoryturn.js`). 기본 ‘빠르게’, 홈에서 ‘더 정확하게’.
3. 인물 탭 = 인물 위키 + 상황·시간선·열린 항목·관계 한 페이지(`ui/screens/memory/wikiview.js`, `people.js`). 카드·새 봇은 최상위 ‘기억 카드’ 탭.
4. 고급 모드: 추가 프롬프트·관찰자·페르소나 이름·모델 고급·복구·위키 기록 관리·성인 항목(월경·임신).

## 건드린 곳
- 저장소 v3 `data/memorystore3.js`, 가져오기 `engine/memoryv3.js`, 어댑터 `data/potstorage.js`.
- 모델 `engine/modelcfg.js`·`data/modelhub.js`(키는 로컬 저장소, 설정·백업·공유 코드에 안 들어감).
- 회상 `engine/recall.js`, 기록 합치기 `engine/duskwriter.js`(구획별 따로 검증), 월경·임신 연결 `engine/cyclememo.js`·`storydate.js`.
- 화면 설정 도구 `engine/settingsutil.js`·`ui/screens/memory/settingstools.js`(범위 칩·검색·변경 이력·공유 코드·미리보기).
- 채팅 메뉴 버튼·재시도 알림: `main.js`(`registerButton` location action), `data/retrytoast.js`(메인 화면 권한 필요, 없으면 창으로 대체), 자동 재시도 2회는 `memoryturn.js`.
- 위키 일괄 버튼: `engine/wikiedit.js`·`wikiview.js`(user 제외, 수치는 슬롯별 요청).
- 크레딧 카드 risupot·Arcana Card: `ui/screens/tools.js` `creditCards()`.

## 주의
- `engine/pot/`·`data/pot/`는 생성물. 리수폿이 업데이트되면 `ref/risupot`의 파일을 바꾸고 `npm run pot:split`. 고정 패치 3곳은 `tools/pot-patches.json`.
- Hypa 참고는 `syncPot`이 흐름을 켤 때마다 강제로 끈다(의도).
- ⏸(이 인물만 쉬기)는 Dusk 사건 기록만 멈춘다. 수치 ✎는 고정 수치도 덮어쓰고 고정은 유지한다.
- 원작자 이름은 크레딧에 적지 않고 링크만 둔다(사용자 지시).
- 원본 대조 시험(`pot-port.test.js`)은 `ref/risupot`를 받아 `git update-ref refs/remotes/origin/ref/risupot FETCH_HEAD` 해야 돈다(없으면 9개 건너뜀).

## 릴리즈 체크
- `node --test` 232 통과·실패 0·건너뜀 9, `npm run build` 후 `npm run check` 동일 확인, package.json 1.6.4(약 2.9MB).
- 실제 리스에서 아직 시험하지 못한 것: 처음 설정 마법사로 켜기, 내 API 실호출, 월경·임신, 채팅 메뉴 버튼, 우하단 재시도 알림(메인 화면 권한), 위키 일괄 채우기. 쓰는 중 문제가 나오면 패치로 고친다.
- 아카 글: `docs/arca/v1.6.4.html`.
