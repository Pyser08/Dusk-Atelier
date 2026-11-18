# DA Interop: 다른 플러그인에서 Dusk 기능 부르기 (createDuskClient)

DA Interop 스니펫(2.2.11~) 맨 아래의 `createDuskClient`로 Dusk Atelier 기능을 부를 수 있어요.

```js
const dusk = createDuskClient('my-plugin');           // 소문자·숫자·._- (2~64자)
if (await dusk.available()) {
  const cur = await dusk.call('memory.current');      // { chaId, chatId, ... }
  const folder = await dusk.call('memory.folder', cur);
  await dusk.call('memory.patch', { ...cur, path: ['wiki', 'note'], value: '메모' });
  const text = await dusk.call('ai.run', { prompt: '요약해 줘' }, { timeoutMs: 180000 });
}
```

- 처음 부를 때 리스 화면 오른쪽 위에 허용 알림이 떠요. 누르면 허용되고 기억해요(그냥 두면 이번 요청만 거절).
- 쓰기 메서드(`*.patch`, `*.set`, `*.saveSettings`)는 부를 때마다 알림을 눌러야 해요.
- 같은 플러그인의 호출은 하나씩 차례로 처리돼요. 기본 제한시간 60초, `ai.run`은 길게 주세요.
- 실패하면 `Error('[DA Interop] 이유')`: `denied`, `expired`, `unknown method: …`, `timeout`, 메서드 오류 글.

## 메서드

| 이름 | 종류 | params → 결과 |
|---|---|---|
| `dusk.info` | 읽기 | → `{ version, methods }` |
| `memory.current` | 읽기 | → 지금 채팅 `{ chaId, chatId, ... }` |
| `memory.index` | 읽기 | → 장기기억 폴더 색인 |
| `memory.folder` | 읽기 | `{ chaId, chatId }` → 기억 폴더(위키·사건·카드 등) |
| `memory.patch` | 쓰기 | `{ chaId, chatId, path, value }` → `true` (value 생략 = 지우기, wiki를 바꾸면 revision +1) |
| `storage.keys` / `storage.get` | 읽기 | Dusk 키(`dusk.*`, `rbm:*`, `risupot.*`)만 |
| `storage.set` | 쓰기 | `{ key, value }` |
| `lore.settings` / `lore.saveSettings` | 읽기/쓰기 | 로어북 규칙 설정 |
| `ai.run` | AI | `{ messages \| prompt, mode?: 'submodel' \| 'model' }` → 답 글 (Dusk 모델 설정·생성 중지 적용) |
| `ui.open` / `ui.toast` | 화면 | `{ tab? }` / `{ text }` |

목록은 `await dusk.methods()`로도 볼 수 있어요. 장기기억 메서드는 장기기억 애드온이 켜져 있어야 해요.

## 저장 위치 (pluginStorage)
- `da_interop:dusk` — Dusk가 기록 (버전·메서드 목록)
- `da_interop:call:<id>` — 부르는 쪽 `{ rev, method, params, at }` (30초 지난 요청은 처리 안 함)
- `da_interop:reply:<id>` — Dusk `{ rev, ok, result, error, at }` (결과 8MiB까지)
- 허용 목록: `dusk.bridge.perms.v1`

## 보안 참고
pluginStorage에는 누가 썼는지 확인하는 기능이 없어서 id는 자기 신고예요. 허용은 "그 id로 오는 요청"에 대한 것이에요.
