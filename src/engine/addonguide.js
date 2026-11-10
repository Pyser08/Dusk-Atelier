// 커스텀 애드온 만들기 안내(2.1.0): '애드온 만들기' 창이 AI에게 그대로 넘기는 지침과 빈 틀.
// 긴 설명·예시는 docs/addons/SKILL.md(같은 약속). SDK(data/addonsdk.js)를 바꾸면 두 곳을 함께 고친다.
export const ADDON_TEMPLATE = `// Dusk Atelier 커스텀 애드온 — 이 파일 하나를 홈 → 애드온 → 불러오기로 넣어요.
export const meta = {
  id: "my-addon",          // 영어 소문자·숫자·- (같은 id로 다시 불러오면 새 버전으로 바뀌어요)
  name: "내 애드온",
  version: "1.0.0",
  desc: "무엇을 하는 애드온인지 한 줄로",
  author: "",
  minCore: "2.1.0"
};

export async function activate(api, ctx) {
  const { ui, storage, toast } = ctx.dusk;
  let count = await storage.get("count", 0);
  ctx.dusk.addPage({
    title: "내 애드온",
    render(el) {
      const label = ui.h("p", null, \`눌린 횟수: \${count}\`);
      ui.replace(el, ui.card("안녕하세요", label, ui.btn("눌러 보기", { kind: "primary", onClick: async () => {
        count += 1; await storage.set("count", count);
        label.textContent = \`눌린 횟수: \${count}\`; toast("저장했어요");
      } })));
    }
  });
  return { deactivate() { /* 직접 단 타이머·DOM·registerButton은 여기서 떼요 */ } };
}
`;

export const ADDON_GUIDE = `# Dusk Atelier 커스텀 애드온 만들기 (SDK v1, Dusk 2.1.0+)
너는 RisuAI 플러그인 Dusk Atelier의 애드온을 만든다. 결과는 **ES 모듈 JS 파일 하나**를 \`\`\`js 코드 블록 하나로만 낸다.

## 파일 모양 (반드시)
- \`export const meta = { id, name, version, desc, author, minCore: "2.1.0" }\` — id는 /^[a-z0-9][a-z0-9-]{0,40}$/, version은 1.0.0 꼴.
- \`export async function activate(api, ctx) { …; return { deactivate() { … } } }\`
- import 문을 쓰지 않는다(파일 하나로 돈다). 필요한 건 ctx.dusk와 api로만 쓴다. 맨 위(모듈 최상단)에서는 정의만 하고 일은 activate 안에서.
- 끌 때 깨끗이: deactivate에서 직접 만든 타이머(setInterval)·DOM·이벤트·registerButton/registerSetting 등을 모두 되돌린다.

## ctx.dusk (쉬운 도구, 끌 때 자동 정리)
- \`addPage({ title, render(el, dusk) })\` — Dusk 창 안에 애드온 화면 하나. 홈 애드온 상자의 이 애드온 줄에 ‘열기’가 생긴다. el에 그린다.
- \`ui\`: \`h(tag, props, ...children)\`(DOM 만들기; props의 onClick 등은 이벤트, class는 문자열/배열, style 문자열), \`replace(el, ...nodes)\`,
  \`btn(label, { kind: "primary"|"ghost"|"danger", size: "sm", onClick })\`, \`switchEl(on, { label, onChange(v) })\`, \`toggleRow(title, text, on, onChange)\`,
  \`card(title, ...nodes)\`, \`note("info"|"warn"|"err", text)\`, \`chip(label, { pressed, onClick })\`, \`badge(text)\`, \`emptyState({ title, text })\`,
  \`confirm({ title, body, ok, danger }) → Promise<boolean>\`, \`prompt({ title, label, value }) → Promise<string|null>\`, \`menu(anchorEl, [{ label, onClick }])\`,
  \`download(fileName, textOrBlob)\`, \`copyText(text)\`, \`pickFiles({ accept, multiple }) → Promise<File[]>\`.
- \`storage.get(key, fallback)\` / \`storage.set(key, value)\` / \`storage.remove(key)\` — 이 애드온 전용 저장(JSON 값). 비동기.
- \`ai.run(textOrMessages, { system, signal }) → Promise<string>\` — 리스 보조 모델에 묻는다. ‘생성 중지’ 버튼에 자동으로 잡힌다. AI 호출은 반드시 이것으로.
- \`toast(text, { error })\`, \`open()\`(내 화면 열기), \`coreVersion\`, \`id\`, \`version\`.
- 고급: \`lib\`(코어 모듈 전부, 예: lib["src/engine/hash.js"].sha256) — 바뀔 수 있으니 꼭 필요할 때만, 없으면 대신하는 코드를 둔다. \`ext\`(코어 화면 자리).

## api (RisuAI 플러그인 API v3, 비동기가 많다 — await)
- 지금 연 봇·채팅: \`ci = await api.getCurrentCharacterIndex()\`, \`ti = await api.getCurrentChatIndex()\`, \`char = await api.getCharacterFromIndex(ci)\`, \`chat = await api.getChatFromIndex(ci, ti)\`(chat.message = [{ role: "user"|"char", data }]).
- 저장: \`api.setCharacterToIndex(ci, char)\`, \`api.setChatToIndex(ci, ti, chat)\` — 사용자 데이터를 바꾸므로 confirm 뒤에만.
- 훅(끌 때 자동으로 뗌): \`addRisuScriptHandler("output"|"input"|"display", fn)\`, \`addRisuReplacer("beforeRequest"|"afterRequest", fn)\`.
  모양: script 핸들러 \`(text) => 바뀐 text\`, beforeRequest \`(messages, type) => messages\`(type "model"이 본 응답 요청, 배열 [{ role, content }]). 꼭 값을 돌려준다.
  예: 응답 글 바꾸기 → \`await api.addRisuScriptHandler("output", (text) => text.replace(...))\`.
- 리스 화면에 버튼: \`registerButton({ name, icon, iconType: "html", location: "hamburger"|"chat" }, onClick)\` → id. deactivate에서 \`unregisterUIPart(id)\`.
- 그 밖: \`nativeFetch(url, { method: "GET" })\`(외부 요청), \`pluginStorage\`(직접 쓰지 말고 ctx.dusk.storage), \`alert\`류는 쓰지 말고 toast.
- RisuAI·RisuBard·PocketRisu 모두에서 돌게: 없는 함수일 수 있으니 \`api.x?.()\`와 try/catch로 감싼다.

## 규칙
- 사용자 문구는 쉬운 한국어 존댓말("~해요").
- 원본 봇·채팅을 지우거나 덮어쓰지 않는다. 바꿀 땐 사용자에게 confirm으로 묻는다.
- 실패해도 리스가 멈추지 않게 try/catch, 오류는 toast로 짧게.
- 화면은 Dusk 기본 모양(ui 도구)만 쓰고 색은 CSS 변수(var(--rb-text), var(--rb-mute), var(--rb-accent), var(--rb-line2), var(--rb-card))로. 카드 안 여백을 둔다.
- 비밀 키·개인정보를 밖으로 보내지 않는다(사용자가 정한 주소만).

## 내보낼 것
설명 한두 줄 + \`\`\`js 블록 하나(위 모양 그대로). 고칠 때도 파일 전체를 다시 낸다.`;

// 사용자가 적은 요청을 붙인 AI용 프롬프트
export function addonRequestPrompt(request, { existing } = {}) {
  const ask = String(request ?? "").trim() || "(요청을 적지 않았어요 — 간단한 예시 애드온을 만들어 줘)";
  return `${ADDON_GUIDE}\n\n## 빈 틀(참고)\n\`\`\`js\n${ADDON_TEMPLATE}\`\`\`\n${existing ? `\n## 지금 코드(이걸 고쳐 줘)\n\`\`\`js\n${existing}\`\`\`\n` : ""}\n## 사용자 요청\n${ask}`;
}
