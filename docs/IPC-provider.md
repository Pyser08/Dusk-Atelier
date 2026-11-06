# 다른 플러그인 창구 (Dusk 2.0.0, 프로바이더 애드온 0.2.0)

다른 플러그인이 Dusk 프로바이더(키·재시도·대체 사슬·예산)로 모델을 부르는 방법이에요. 기본은 꺼짐이고, 사용자가 프로바이더 → 확장 → ‘다른 플러그인 창구’를 켜야 해요.

## 우편함 규칙 (pluginStorage)
| 칸 | 쓰는 쪽 | 내용 |
|---|---|---|
| `dusk.ipc.v1.req.<플러그인>` | 그 플러그인만 | 요청 하나, 또는 요청 배열(JSON 글) |
| `dusk.ipc.v1.res.<플러그인>` | Dusk만 | `{ "v":1, "results":[ {id, ok, text 또는 error, at, ms} ] }` (최근 10개·1시간) |

- `<플러그인>`은 글자·숫자·`._-`·한글만(나머지는 `_`로 바뀌고 40자까지). 같은 이름을 쓰면 돼요.
- 요청: `{ "v":1, "id":"고유값", "messages":[{"role":"system|user|assistant","content":"글"}], "profile":"프로필 이름 또는 id(선택)", "maxTokens":500, "temperature":0.7, "ts": Date.now() }`
- `id`는 요청마다 달라야 해요(Dusk가 처리한 id는 다시 처리하지 않아요). `ts`를 넣으면 30분이 지난 요청은 무시해요.
- 한 번에 최대 16개, 메시지 200개·50만 자까지. 글만 받아요(스트림 없음, 이미지·도구 없음).
- Dusk는 요청 칸을 고치지 않아요. 다 쓴 요청은 보낸 플러그인이 지우세요.
- 처음 보는 플러그인은 사용자에게 허용 여부를 한 번 물어요. 거절되면 `ok:false`, `error`에 이유가 와요.

## 예제 (보내는 플러그인 쪽)
```js
const NAME = "my_plugin";
const send = async (messages) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await risuai.pluginStorage.setItem(`dusk.ipc.v1.req.${NAME}`, JSON.stringify([{ v: 1, id, messages, ts: Date.now() }]));
  for (let i = 0; i < 120; i++) {   // 최대 2분 기다림
    await new Promise((r) => setTimeout(r, 1000));
    const res = JSON.parse((await risuai.pluginStorage.getItem(`dusk.ipc.v1.res.${NAME}`)) || "{}");
    const hit = (res.results || []).find((r) => r.id === id);
    if (hit) { await risuai.pluginStorage.removeItem?.(`dusk.ipc.v1.req.${NAME}`); if (!hit.ok) throw new Error(hit.error); return hit.text; }
  }
  throw new Error("Dusk가 응답하지 않아요(창구가 꺼져 있을 수 있어요)");
};
```

## 알려진 한계
- 플러그인끼리 `pluginStorage` 칸이 서로 보이는 리스에서만 동작해요(실제 리스에서 확인 필요).
- Dusk가 새 플러그인을 알아채려면 `pluginStorage.keys()`가 필요해요. 없는 환경에선 사용자가 이름을 미리 허용 목록에 적어야 해요.
