---
name: dusk-atelier-addon
description: Dusk Atelier(RisuAI 플러그인)용 커스텀 애드온 JS 파일을 만들거나 고칠 때 사용. 코어를 고치지 않고 ctx.dusk SDK와 RisuAI 플러그인 API v3만으로 기능을 더하는 ES 모듈 한 파일을 만든다.
---

# Dusk Atelier 커스텀 애드온 만들기

Dusk Atelier 2.1.0부터 사용자가 **애드온 파일 하나**(ES 모듈 `.js`)를 홈 → 애드온 → **불러오기**로 넣어 기능을 더할 수 있어요. 코어(플러그인 본체)를 업데이트하지 않아도 돼요.
이 문서는 사람·AI가 그 파일을 만들 때 보는 안내서예요. 앱 안 ‘만들기’ 창이 AI에게 넘기는 짧은 지침은 `src/engine/addonguide.js`(ADDON_GUIDE)이고, 이 문서와 같은 약속을 따라요.

## 1. 결과물

- 파일 하나, `import` 없음, 이름은 `<id>-<버전>.dusk-addon.js` 권장.
- 반드시 두 가지를 export:

```js
export const meta = {
  id: "word-count",        // /^[a-z0-9][a-z0-9-]{0,40}$/ — 같은 id로 다시 불러오면 새 버전으로 바뀜
  name: "글자 수 붙이기",
  version: "1.0.0",        // x.y.z
  desc: "AI 응답 끝에 글자 수를 붙여요",
  author: "닉네임",
  minCore: "2.1.0"         // 필요한 Dusk 최소 버전
  // requires: ["memory"]  // 먼저 켜져 있어야 하는 애드온 id(선택)
};

export async function activate(api, ctx) {
  // ... 시작
  return { deactivate() { /* 직접 단 것 정리 */ } };
}
```

- 모듈 최상단에서는 **정의만** 해요. 불러오기 전 검사 때 파일을 한 번 읽기 때문에, 일(훅 달기·타이머·DOM)은 `activate` 안에서.
- `deactivate`에서 직접 만든 타이머·DOM·이벤트 리스너·`registerButton` 버튼을 모두 되돌려요. 끄고 켜기를 새로고침 없이 하기 때문이에요.

## 2. ctx — activate가 받는 것

| 이름 | 뜻 |
|---|---|
| `ctx.dusk` | 쉬운 도구 모음(SDK v1, 아래). 여기서 단 것은 끌 때 자동으로 떼요. |
| `ctx.addonId`, `ctx.version`, `ctx.custom` | 내 id·버전, 커스텀 애드온이면 true |
| `ctx.toast(text, { error })` | Dusk 창 안 알림 |
| `ctx.openDusk(tab?)` | Dusk 창 열기 |
| `ctx.ext`, `ctx.app` | 고급: 코어 화면 자리·앱 상태(바뀔 수 있음) |

### ctx.dusk (SDK v1)

```js
const { ui, storage, ai, toast } = ctx.dusk;
```

**화면**
- `addPage({ title, render(el, dusk) })` — Dusk 창 안 내 화면. 홈 애드온 상자의 내 줄에 ‘열기’ 버튼이 생겨요. `dusk.open()`으로 열어요.
- `ui.h(tag, props, ...children)` — DOM 만들기. `props`: `class`(문자열·배열), `style`(문자열), `id`, `dataset`, `onClick`/`onInput`/`onChange` 등 이벤트.
- `ui.replace(el, ...nodes)` — 안을 바꿔 그리기.
- `ui.card(title, ...nodes)` — 테두리 카드(안쪽 여백 포함).
- `ui.btn(label, { kind: "primary"|"ghost"|"danger", size: "sm", icon, onClick, disabled, id })`
- `ui.switchEl(on, { label, onChange(v) })`, `ui.toggleRow(title, text, on, onChange)`
- `ui.note("info"|"warn"|"err", text)`, `ui.chip(label, { pressed, onClick })`, `ui.badge(text)`, `ui.emptyState({ title, text })`
- `ui.pageHead(title, { sub })`
- `ui.confirm({ title, body, ok, cancel, danger })` → `Promise<boolean>`
- `ui.prompt({ title, label, value, placeholder })` → `Promise<string|null>`
- `ui.menu(anchorEl, [{ icon, label, onClick, danger }, "sep"])`
- `ui.download(name, textOrBlob, type)`, `ui.copyText(text)`, `ui.pickFiles({ accept, multiple })` → `Promise<File[]>`

**저장** (이 애드온 전용, JSON 값, 애드온을 지워도 남음)
- `await storage.get(key, fallback)`, `await storage.set(key, value)`, `await storage.remove(key)`

**AI**
- `await ai.run("질문" | [{ role, content }], { system, signal })` → 답 글.
  리스 보조 모델을 써요. 화면 오른쪽 아래 **‘생성 중지’ 버튼**에 자동으로 잡혀요. 애드온의 AI 호출은 반드시 이것으로(직접 fetch로 모델을 부르지 않기).
  중지되면 오류를 던지므로 `catch`에서 조용히 넘어가요.

**기타**
- `toast(text, { error })`, `open()`, `coreVersion`, `sdkVersion`(1), `id`, `version`
- `onCleanup(fn)` — 끌 때 부를 함수 등록(deactivate 대신 써도 됨)
- `lib` — 코어 모듈 전부(`lib["src/engine/hash.js"].sha256` 처럼 경로로). 코어 업데이트로 바뀔 수 있으니 꼭 필요할 때만, 없으면 대신하는 코드를 둬요.

## 3. api — RisuAI 플러그인 API v3

호스트(RisuAI·RisuBard·PocketRisu)마다 없는 함수가 있을 수 있어요. `api.x?.()`·`try/catch`로 감싸요. 대부분 비동기라 `await`.

- 지금 연 봇·채팅
  ```js
  const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
  const char = await api.getCharacterFromIndex(ci);       // char.name, char.desc …
  const chat = await api.getChatFromIndex(ci, ti);         // chat.message = [{ role: "user"|"char", data }]
  ```
- 저장(사용자 데이터를 바꿈 → `ui.confirm` 뒤에만): `api.setCharacterToIndex(ci, char)`, `api.setChatToIndex(ci, ti, chat)`
- 훅(끌 때 Dusk가 자동으로 떼요)
  - `await api.addRisuScriptHandler("output"|"input"|"display", (text) => text)` — 글을 받아 바꾼 글을 돌려줘요.
  - `await api.addRisuReplacer("beforeRequest", (messages, type) => messages)` — 모델에 보내기 직전. `type === "model"`이 본 응답 요청. 배열 `[{ role, content }]`을 꼭 돌려줘요.
  - `"afterRequest"`도 같은 모양(받은 글).
- 리스 화면 버튼: `const id = await api.registerButton({ name, icon: "🧵", iconType: "html", location: "hamburger"|"chat" }, onClick)` → `deactivate`에서 `api.unregisterUIPart(id)`. 콜백은 아무것도 돌려주지 않아요(복제 오류 방지).
- 외부 요청: `await api.nativeFetch(url, { method: "GET" })` (method를 꼭 적기, 없으면 POST). 응답은 `res.text?.()`나 `res.body`.
- 저장은 `api.pluginStorage`를 직접 쓰지 말고 `ctx.dusk.storage`로(키가 다른 애드온과 안 겹쳐요).

## 4. 규칙 (꼭)

1. 사용자 문구는 쉬운 한국어 존댓말 “~해요”.
2. 원본 봇·채팅을 지우거나 덮어쓰지 않아요. 바꿀 땐 먼저 묻고, 가능하면 새로 만들어요.
3. 실패해도 리스가 멈추지 않게 `try/catch`, 오류는 `toast`로 짧게.
4. 훅은 빨리 끝나게(응답마다 불려요). 무거운 일은 미루거나 캐시.
5. 모양은 `ui` 도구만 쓰고, 색은 CSS 변수 `var(--rb-text)`, `var(--rb-sub)`, `var(--rb-mute)`, `var(--rb-accent)`, `var(--rb-line2)`, `var(--rb-surf)`로. 박스 안 글이 테두리에 붙지 않게 여백을 둬요.
6. API 키·채팅 내용을 사용자가 정하지 않은 곳으로 보내지 않아요.
7. 모바일(폭 390px)에서도 깨지지 않게, 가로로 길면 줄바꿈.

## 5. 예시

### 응답 끝에 글자 수 붙이기 (훅 + 설정 화면)
```js
export const meta = { id: "word-count", name: "글자 수 붙이기", version: "1.0.0", desc: "AI 응답 끝에 글자 수를 붙여요", minCore: "2.1.0" };

export async function activate(api, ctx) {
  const { ui, storage } = ctx.dusk;
  let on = await storage.get("on", true);
  await api.addRisuScriptHandler("output", (text) => {
    if (!on || typeof text !== "string") return text;
    return `${text}\n\n(${text.replace(/\s/g, "").length}자)`;
  });
  ctx.dusk.addPage({ title: "글자 수 붙이기", render(el) {
    ui.replace(el, ui.card("설정", ui.toggleRow("응답 끝에 붙이기", "새로 오는 응답부터 적용돼요.", on, async (v) => { on = v; await storage.set("on", v); })));
  } });
  return { deactivate() {} };
}
```

### AI로 지금 채팅 요약 (AI 호출 + 생성 중지)
```js
export const meta = { id: "quick-summary", name: "빠른 요약", version: "1.0.0", desc: "지금 채팅 최근 20개를 세 줄로 요약해요", minCore: "2.1.0" };

export async function activate(api, ctx) {
  const { ui, ai, toast } = ctx.dusk;
  ctx.dusk.addPage({ title: "빠른 요약", render(el) {
    const out = ui.h("p", { style: "white-space:pre-wrap;margin:0" });
    const go = ui.btn("요약하기", { kind: "primary", onClick: async () => {
      go.disabled = true; out.textContent = "요약하는 중…";
      try {
        const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
        const chat = await api.getChatFromIndex(ci, ti);
        const text = (chat?.message ?? []).slice(-20).map((m) => `${m.role}: ${m.data}`).join("\n");
        out.textContent = await ai.run(text, { system: "다음 대화를 한국어 세 줄로 요약해." });
      } catch (e) { out.textContent = ""; toast(`요약하지 못했어요: ${e?.message ?? e}`, { error: true }); }
      finally { go.disabled = false; }
    } });
    ui.replace(el, ui.card("지금 채팅 요약", go, out));
  } });
}
```

## 6. 넣기·공유·제안

- 홈 → 애드온 → **불러오기**로 파일을 넣어요. 같은 id면 새 버전으로 바뀌고 켜짐 상태는 그대로예요.
- 커스텀 애드온 줄의 **···** → **내보내기**로 파일을 받아 자유롭게 공유할 수 있어요. **AI로 고치기**는 지금 코드를 붙여 ‘만들기’ 창을 열어요.
- 괜찮은 기능은 Dusk 개발자가 애드온 제작자에게 공식 기능으로 넣고 싶다고 요청할 수 있어요.
- 애드온은 Dusk와 같은 권한으로 돌아요. 남이 만든 파일은 내용을 확인하고 넣어요.

## 7. 개발자 메모 (코어 쪽)

- SDK: `src/data/addonsdk.js`(`createAddonSdk`), 불러오기·실행·내보내기: `src/data/addons.js`(`inspectCustom`·`importCustom`·`setCustomOn`·`removeCustom`·`exportCustom`, 저장 키 `dusk.addon.custom.index`·`dusk.addon.custom.code.<id>`), 검사: `src/engine/addons.js`(`parseCustomMeta`·`extractAddonCode`), 화면: `src/ui/screens/addonsui.js`(홈 상자)·`addonmaker.js`(만들기 창).
- SDK는 **더하기만** 해요. 이름을 바꾸거나 빼면 사람들이 만든 애드온이 깨져요. 바꾸면 이 문서와 `addonguide.js`를 같이 고치고 `sdkVersion`을 올려요.
- 공식 애드온도 같은 `ctx.dusk`를 받아요.
