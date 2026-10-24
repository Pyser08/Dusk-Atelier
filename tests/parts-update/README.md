# 파츠 독립 업데이트 시험

이 폴더는 메인 플러그인과 분리된 API 3.0 호스트·파츠 시험용입니다. Host는 공식 `nativeFetch`로 `manifest.json`을 읽어 식별자·버전·스크립트 URL을 표시합니다. 두 플러그인은 각각 `//@version`과 `//@update-url`을 갖고, IPC는 API의 `addPluginChannelListener` / `postPluginChannelMessage`만 사용합니다.

## 실행 순서

1. 이 브랜치의 `manifest.json`을 열어 각 `pluginUrl`을 확인합니다. RisuAI 설정 → 플러그인에서 `host.js`, `part.js` raw URL을 각각 추가합니다. manifest는 시험 파츠의 식별자·버전·URL을 나열하는 인덱스입니다.
2. RisuAI에서 두 플러그인을 켜고 `DA Parts Test Host`를 엽니다. [Part에 ping 보내기]를 누르면 파츠 화면으로 이동하고, [Host로 응답 보내기]를 누르면 host에 pong과 파츠 버전이 표시되는지 확인합니다.
3. 설치된 Part의 버전이 `0.1.0`이고 `//@update-url`이 해당 `part.js` raw URL인지 확인합니다.
4. `part.js`의 `//@version`, `VERSION`, 화면 제목을 `0.1.1`로 올리고, 응답 문구도 바꿔 브랜치에 반영합니다. RisuAI에서 플러그인 업데이트 확인을 실행해 Part만 업데이트한 뒤 `0.1.1`이 표시되는지 확인합니다.
5. Host 버전이 `0.1.0`으로 유지되고 계속 IPC 왕복이 되는지 확인합니다. 그다음 Host 파일만 `0.1.1`로 올려 같은 절차를 별도로 확인합니다.

## 판정 항목

- RisuAI가 raw `pluginUrl`을 API 3.0 플러그인으로 추가할 수 있는가.
- 같은 플러그인 ID와 update URL을 유지할 때 RisuAI의 공식 업데이트 UI가 새 버전을 인식·설치하는가.
- Part 업데이트가 Host 버전·화면·IPC 동작에 영향을 주지 않는가.
- `manifest.json` URL 자체는 RisuAI의 플러그인 업데이트 대상이 아닙니다. 자동 파츠 설치는 API v3 타입 선언에서 공식 지원 API를 찾지 못했습니다. 따라서 이 시험은 manifest에 파츠 정보를 적고, 각 스크립트를 RisuAI의 기본 설치·업데이트 흐름으로 독립 관리하는 구성을 검증합니다.

## 현재 확인된 제한

GitHub에 이 브랜치가 push되어야 위 raw URL이 유효해집니다. push 권한 및 실제 RisuAI에서의 설치·업데이트 결과는 이 작업 환경에서 확인되지 않았습니다. IPC API는 현재 API v3 타입 선언에 있지만 선언에서 변경·폐기 가능성을 명시하므로, 지원하는 RisuAI 버전에서 재검증해야 합니다.
