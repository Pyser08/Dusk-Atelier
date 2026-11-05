# 호스트 호환 규칙 — RisuAI · RisuBard · PocketRisu

Dusk Atelier는 **세 호스트에서 같은 `dusk_atelier.js` 하나로** 돈다. 호스트별 빌드를 만들지 않는다. 차이는 전부 **실행 중 기능 감지**로 흡수한다.

## 1. 플러그인 형식 (바꾸지 말 것)
- 머리말은 `tools/build.mjs`의 `banner`가 만든다: `//@name dusk_atelier`, `//@api 3.0`, `//@version`, `//@update-url`(main의 raw). **`//@name` 변경 금지** — 바꾸면 사용자 저장소(pluginStorage)·업데이트가 끊긴다.
- 본문은 IIFE 한 덩어리. 소스 중간에 `//@` 줄이 있으면 빌드가 실패한다(의도된 검사).
- 진입: `src/main.js`의 `start()` → `globalThis.risuai ?? globalThis.Risuai`. 없으면 조용히 종료.

## 2. 호스트 구분 (어디서 판단하나)
| 신호 | 의미 | 사용 위치 |
|---|---|---|
| `api.getRuntimeInfo?.()` → `platform === "node"` | PocketRisu·RisuBard(서버형) | `ui/watch.js` `persistentWrites`, `data/themes.js` `detectTarget` |
| `api.bardWiki?.getDocuments` 함수 존재 | RisuBard의 BardWiki 사용 가능 | `data/memorybackend.js` `hasBardWiki` |
| `globalThis.__RBM_ENTRY__ === "legacy"` | 구형 진입(간이 UI만 등록) | `src/main.js` |
| 호스트가 저장을 막음(오류 문구 `still loading`, `not loaded`, `history is only partially`) | RisuVault 등 채팅 보호 | `data/modules.js` `isHostBlocked` → `main.js`의 `friendly()` 래퍼가 한국어 오류로 바꿈 |

**규칙:** 호스트 이름으로 분기하지 말고 **"그 기능이 있는가"**로 분기한다. 새 분기가 필요하면 위 함수들을 재사용하거나 같은 파일에 추가한다.

## 3. API 사용 원칙 (충돌·오작동 방지)
1. **선택적 API는 항상 옵셔널 호출 + catch**: `api.getRuntimeInfo?.()`, `api.getRootDocument?.().catch(() => null)`, `api.bardWiki?.…`. 없으면 기능을 끄거나 대체 경로로.
2. **훅 등록은 try/catch로 감싸고 실패해도 앱 전체는 계속 뜬다**(`data/fairplay.js`, `memoryinject.js`, `affhud.js` 패턴). 실패는 `console.log("[Dusk Atelier] …")`로만 남긴다.
3. **훅 안에서 await로 오래 붙잡지 않는다.** output/display 훅은 디바운스 후 비동기 처리(`data/memoryrunner.js` 첫 줄 주석). 응답 렌더를 막으면 호스트 전체가 멈춘다.
4. **주입은 요청 사본에만**(`beforeRequest` replacer). 저장된 채팅·봇 데이터는 건드리지 않는다.
5. **저장 쓰기**: `setCharacterToIndex`·`setDatabaseLite`는 `main.js`의 래퍼를 거친다(호스트 차단 오류 처리). 직접 `setDatabase` 전체 저장은 피한다(서버형 호스트에서 느리고 충돌 위험).
6. **네트워크**: 플러그인 창은 CSP로 `fetch`가 막힐 수 있다 → `api.nativeFetch(url, { method: "GET" })` 먼저(**method 생략 시 POST로 가서 실패**), 실패 시 일반 fetch.
7. **리스 화면 DOM**: `api.getRootDocument()`는 **비동기 래퍼** — 모든 `querySelector` 등에 await. 셀렉터는 RisuAI/Pocket 둘 다 고려(`data/themes.js` 참고).
8. **캐릭터 추가 후 순서**: Pocket·Bard는 `checkCharOrder` 반영이 늦거나 빠짐 → `ensureCharacterInOrder`(`engine/character.js`) 재사용.
9. **저장 키 이름공간**: pluginStorage 키는 `rbm:*` / `dusk.*` 접두사 유지. 다른 플러그인과 같은 저장소를 공유한다(플러그인 탭이 그대로 노출함).
10. **다른 플러그인과의 연동**은 DA Interop v1(`data/plugins.js`, `data/interopSnippet.js`)로만. 다른 플러그인의 전역 변수·DOM을 직접 고치지 않는다.

## 4. 기억 백엔드
- `local`: 플러그인이 분석·저장·주입 (기본).
- `bardwiki`: RisuBard 위키 읽기 + 등급 쓰기만(분석·주입 안 함 → 중복 방지). 설정 변경 후 **새로고침 필요**(훅 재등록).
- 둘 다 켜면 중복 → UI가 경고. 새 기억 기능을 추가하면 `CAPABILITIES`에 백엔드별 가능 여부를 먼저 추가한다.

## 5. 새 기능 체크리스트 (세 호스트 공통)
- [ ] 새로 쓰는 `api.*` 메서드가 세 호스트 모두에 있는가? 확신 없으면 `?.` + 대체 경로.
- [ ] 실패해도 다른 기능·리스 본체가 계속 동작하는가?
- [ ] 저장 데이터 형식이 바뀌면 예전 데이터 읽기·마이그레이션 테스트가 있는가?
- [ ] 모바일(좁은 폭, 터치)에서도 쓸 수 있는가?
- [ ] 원본 봇·채팅을 수정하지 않는가(새 객체/요청 사본만)?

## 위젯 홈 (v1.9.2)
- 위젯 홈은 Dusk와 **같은 플러그인 iframe**을 `showContainer('fullscreen')`로 번갈아 쓴다. 호스트 요소는 Shadow DOM이고, Dusk 창을 열 때는 위젯 홈을 먼저 닫는다(`yieldToDusk`). 위젯 홈이 홈 영역에 겹쳐 떠 있는 동안 Dusk 쪽 일시 창(`confirmAnywhere`, 고아 정리)이 `hideContainer`를 부르면 위젯 홈도 같이 가려질 수 있다.
- 쓰는 호스트 기능: `registerButton`(hamburger), `unregisterUIPart`, `showContainer/hideContainer`, `getColorScheme`, `getDatabase`, `getCharacterFromIndex`, `getChatFromIndex`, `getCurrentCharacterIndex`, `readImage`, `getLocalPluginStorage`(없으면 `pluginStorage`), `getRootDocument`·`createMutationObserver`(자동 열기 전용, 없어도 동작). 없는 기능은 try/catch로 건너뛰고 경고창을 띄우지 않는다.
- 세 호스트 실제 기기 확인은 아직 못 함.

## addProvider (프로바이더, v1.9.3)
- `api.addProvider(name, handler, {tokenizer})`로 'Dusk 자동'·'Dusk · 프로필'을 등록(`data/provider/register.js`). **세 호스트(RisuAI·RisuBard·PocketRisu) 지원 여부는 아직 실제 기기에서 확인 못 함.** 없으면 `supported()`가 false가 되어 등록을 건너뛰고 화면에 안내만 띄움(설정은 저장 가능).
- 전송은 `nativeFetch` → 실패하면 `risuFetch`(`data/provider/transport.js`). 스트림은 `nativeFetch`일 때만 이어 받고 `risuFetch`는 통째로 받음.
- 키 값은 `getLocalPluginStorage` → `safeLocalStorage` 순으로 로컬에만 저장(`data/provider/keyvault.js`). 둘 다 없으면 키 추가가 실패함.
- 쓰기 도구 확인창은 Dusk 창이 닫혀 있어도 `ctx.confirmAnywhere`(app.js)가 잠깐 띄움. 못 띄우면 허락 안 한 것으로 처리.
