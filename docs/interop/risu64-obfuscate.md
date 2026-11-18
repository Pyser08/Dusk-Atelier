# Risu64 ↔ Dusk Atelier: Dusk 요청 난독화 (DA Interop 동작)

Dusk Atelier(2.2.11~)는 모델을 부르기 전에 DA Interop 동작 `risu64 / obfuscate`가 등록되어 있는지 봅니다.
있으면 메시지를 그 동작으로 보내고, 돌려받은 메시지로 요청합니다. 없으면 지금처럼 그대로 보냅니다.

- 대상: 리스 보조·메인 모델(`runLLMModel`), Dusk 프로바이더, 내 API — Dusk의 모든 모델 요청
- 주고받는 값: `args = { messages: [{role, content}], source: 'dusk' }` → 결과 `{ messages }` (또는 배열)
- 실패·10초 초과·형식이 틀린 결과면 Dusk는 원문으로 보냅니다.

## Risu64 쪽 수정 (3곳)

### 1. DA Interop 스니펫을 최신으로 교체
지금 들어 있는 `registerInterop` 블록(7180줄 근처)은 `actions`를 지원하지 않는 예전 판입니다.
https://github.com/Pyser08/dusk-atelier-interop/blob/main/interop-snippet.js 의 최신 블록으로 통째로 바꿔 주세요.

### 2. `pmHookFns`에 Dusk용 처리 함수 추가 (3731줄)
IPC 설정(적용 범위·IPC 블록)대로 처리하고, 결과 지문을 `returnedFingerprints`에 넣어
같은 요청이 리스 `beforeRequest`로 다시 들어와도 두 번 난독화하지 않게 합니다.

```js
pmHookFns = {
    ipcRequest: (messages) => beforeRequestHandler(messages, 'ipc'),
    duskRequest: async (messages) => {
        if (isOwnLLMRequest(messages)) return messages;
        const out = await beforeRequestHandler(messages, 'ipc');
        const fp = fingerprintPayload(out);
        if (fp && fp !== fingerprintPayload(messages)) {
            returnedFingerprints.push(fp);
            if (returnedFingerprints.length > 16) returnedFingerprints.shift();
        }
        return out;
    },
    reobfuscateRestored, pmHookState
};
```

### 3. `registerInterop({...})`에 동작 추가 (7549줄)

```js
actions: [{
    key: 'obfuscate',
    label: 'Dusk 요청 난독화',
    description: 'Dusk Atelier의 모델 요청을 IPC 설정대로 난독화합니다',
    run: async (args) => {
        const messages = Array.isArray(args?.messages) ? args.messages : null;
        if (!messages || !pmHookFns?.duskRequest) return { messages };
        return { messages: await pmHookFns.duskRequest(messages) };
    }
}],
```

## 참고
- 동작 확인 주기가 1초라서 요청마다 최대 약 1초가 늦어집니다(Dusk는 요청을 한 줄로 세워 하나씩 보냅니다).
- 플러그인 창이 숨겨져 있으면 스니펫이 확인을 멈춥니다. 이때 Dusk는 10초 뒤 원문으로 보내고, 60초 동안은 묻지 않습니다.
