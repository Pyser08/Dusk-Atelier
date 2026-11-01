# 외부 JS를 받았을 때 — 기능 병합/추가 절차

사용자가 다른 플러그인 `.js`나 코드 조각을 주며 "이 기능 넣어줘"라고 할 때.

## 1. 먼저 판단 (코드 붙여넣기 금지)
1. **무엇을 하는 코드인지 요약**: 훅(input/output/display/beforeRequest), UI(버튼·창), 저장(pluginStorage/DB), 네트워크.
2. **이미 있는 기능인지 확인**: `docs/source-map.md`와 `grep`으로 비슷한 기능 검색. 있으면 **기존 모듈 확장**이 우선.
3. **라이선스 확인**: 저장소는 AGPL-3.0-only. 외부 코드를 가져오면 `NOTICE.md`에 출처·라이선스 추가. 호환 불가 라이선스면 동작만 참고해 새로 작성.
4. 받은 파일 자체는 저장소 루트에 커밋하지 않는다(참고용이면 `ref/` 또는 브랜치).

## 2. 어디에 넣나 (계층 분해)
외부 플러그인은 보통 한 파일에 다 섞여 있다. 다음처럼 쪼갠다.
| 원본의 부분 | 넣을 곳 |
|---|---|
| 순수 계산·문자열 처리·파싱 | `src/engine/<기능>.js` (+ `tests/<기능>.test.js`) |
| risuai api 호출, 훅 등록, 저장 | `src/data/<기능>.js` — `createX(api, deps)` 팩토리, `start()`에서 훅 등록(try/catch) |
| 화면 | `src/ui/screens/<기능>.js` — `kit.js` 위젯 사용 (`HandOff/UI-STYLE.md`) |
| 시작 연결 | `src/main.js`에서 `createX(api).start().catch(log)` (다른 기능과 같은 패턴) |
| 메뉴 진입 | `src/ui/tabs.js`의 알맞은 `section`(기억/관리/작업실) |
| 설정 on/off | 기본 **꺼짐**, 키 `dusk.<기능>.*` 또는 기존 설정 화면에 토글 |

## 3. 변환 규칙
- 원본의 `risuai.xxx`/`Risuai.xxx` 전역 호출 → 주입받은 `api.xxx`로.
- 원본의 독자 훅 등록 → 기존 훅과 **같은 이벤트에 여러 개가 걸려도 서로 영향 없도록**(요청 사본만 수정, 반환값 규칙 지키기).
- 원본의 `fetch` → `nativeFetch` 우선 패턴(`HandOff/HOST-COMPAT.md` 3-6).
- 원본의 `innerHTML` 조립 UI → `h()`/`kit.js`로 다시 작성(XSS·스타일 통일).
- 원본의 저장 키 → 충돌 안 나게 새 접두사, 예전 키가 사용자 기기에 있으면 1회 이전.
- 세 호스트 체크리스트(`HOST-COMPAT.md` 5절) 통과.

## 4. 원본 플러그인과 공존해야 할 때
사용자가 원본 플러그인도 같이 켤 수 있으면: 같은 훅에서 중복 처리되지 않게 **감지 후 한쪽 비활성 + 안내**(BardWiki 중복 처리 방식과 동일). 가능하면 DA Interop으로 연동.

## 5. 마무리
테스트 추가 → `npm test` → 빌드·check → CHANGELOG에 사용자 말투로 "~를 추가했어요" → 구조가 바뀌었으면 source-map 재생성.
