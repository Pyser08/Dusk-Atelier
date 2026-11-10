// 커스텀 애드온 만들기 창(2.1.0): 요청 적기 → ① 다른 AI(클로드·GPT 등)에게 줄 요청 복사 / ② 여기서 리스 보조 모델로 바로 만들기
// → 만든 코드 붙여 넣고 불러오기. 지침은 engine/addonguide.js(ADDON_GUIDE), 자세한 건 docs/addons/SKILL.md.
import { h, download, copyText } from "../dom.js";
import { btn, modal, confirmDialog, note } from "../kit.js";
import { ADDON_GUIDE, ADDON_TEMPLATE, addonRequestPrompt } from "../../engine/addonguide.js";
import { extractAddonCode } from "../../engine/addons.js";
import { runAI } from "../../engine/runai.js";
import { isStopError } from "../../engine/aistop.js";

export const RISK_TEXT = "애드온은 Dusk와 같은 권한으로 돌아서 봇·채팅·설정을 읽고 바꿀 수 있어요. 믿을 수 있는 사람이 만든 것이나 내용을 확인한 것만 넣어 주세요.";

// 코드 확인 → 넣기. 넣었으면 meta, 아니면 null
export async function confirmCustomImport(ctx, code) {
  const A = ctx.addons;
  if (!(await confirmDialog(ctx.win, { title: "커스텀 애드온 넣기", body: RISK_TEXT, ok: "확인했어요" }))) return null;
  let info;
  try { info = await A.inspectCustom(code); } catch (e) { ctx.toast(`불러오지 못했어요: ${e?.message ?? e}`, { error: true }); return null; }
  const { meta, exists } = info;
  const swap = exists ? (exists.newer > 0 ? `\n지금 있는 v${exists.version}을(를) 새 버전으로 바꿔요.` : exists.newer < 0 ? `\n⚠ 지금 있는 v${exists.version}보다 예전 버전이에요. 바꿀까요?` : `\n같은 버전(v${exists.version})을 다시 넣어요.`) : "";
  const ok = await confirmDialog(ctx.win, { title: `‘${meta.name}’ v${meta.version}`, body: `${meta.desc || "설명 없음"}${meta.author ? `\n만든 사람: ${meta.author}` : ""}${swap}`, ok: exists ? "바꾸기" : "넣기" });
  if (!ok) return null;
  try { return await A.importCustom(code); } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); return null; }
}

export function openAddonMaker(ctx, { existing = "", onDone } = {}) {
  const ask = h("textarea", { class: "rb-input rb-amk-ask", rows: 3, id: "rb-amk-ask", placeholder: existing ? "어떻게 고칠까요? 예) 버튼을 채팅 메뉴에도 달아 줘" : "어떤 애드온을 만들까요? 예) 응답 끝에 글자 수를 붙여 주는 애드온", "aria-label": "만들 애드온 설명", "data-autofocus": "1" });
  const code = h("textarea", { class: "rb-input rb-amk-code", rows: 8, id: "rb-amk-code", spellcheck: "false", placeholder: "AI가 만든 코드(```js … ```째로 붙여도 돼요)", "aria-label": "애드온 코드" });
  const msg = h("p", { class: "rb-muted rb-amk-msg", role: "status" });
  const say = (t) => { msg.textContent = t; };
  let ctl = null;
  const prompt = () => addonRequestPrompt(ask.value, { existing });
  const makeHere = btn("여기서 AI로 만들기", { size: "sm", icon: "sparkle", id: "rb-amk-run", onClick: async () => {
    if (ctl) return;
    ctl = new AbortController(); makeHere.disabled = true; say("리스 보조 모델이 만드는 중이에요… 오른쪽 아래 ‘생성 중지’로 멈출 수 있어요.");
    try {
      const out = await runAI(ctx.api, [{ role: "user", content: prompt() }], { mode: "submodel", stage: "애드온 만들기" }, ctl.signal);
      code.value = extractAddonCode(out);
      say(/export\s+(async\s+)?function\s+activate/.test(code.value) ? "만들었어요. 아래 코드를 확인하고 ‘불러오기’를 눌러요." : "답에서 애드온 코드를 찾지 못했어요. 요청을 바꿔 다시 해 보거나 다른 AI를 써 보세요.");
    } catch (e) { say(isStopError(e) ? "멈췄어요." : `만들지 못했어요: ${e?.message ?? e}`); }
    finally { ctl = null; makeHere.disabled = false; }
  } });
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-amk", role: "dialog", "aria-modal": "true", "aria-label": "애드온 만들기", id: "rb-addon-maker" },
    h("h3", { class: "rb-h3" }, existing ? "AI로 애드온 고치기" : "애드온 만들기"),
    h("p", { class: "rb-muted", style: "margin:0" }, "코어를 고치지 않아도 애드온 파일 하나로 기능을 더할 수 있어요. AI가 만드는 법을 알도록 안내서를 함께 넘겨요."),
    ask,
    h("div", { class: "rb-amk-step" },
      h("b", null, "1. 만들기"),
      h("div", { class: "rb-amk-row" },
        btn("다른 AI에게 줄 요청 복사", { size: "sm", kind: "primary", icon: "code", id: "rb-amk-copy", onClick: async () => say((await copyText(prompt())) ? "복사했어요. 클로드·GPT 같은 AI 채팅에 붙여 넣고, 받은 코드를 아래에 붙여요." : "복사하지 못했어요.") }),
        makeHere),
      h("div", { class: "rb-amk-row" },
        btn("안내서 받기", { size: "sm", kind: "ghost", icon: "book", onClick: () => download("dusk-addon-guide.md", `${ADDON_GUIDE}\n\n## 빈 틀\n\`\`\`js\n${ADDON_TEMPLATE}\`\`\`\n`, "text/markdown") }),
        btn("빈 틀 받기", { size: "sm", kind: "ghost", icon: "download", onClick: () => download("my-addon.dusk-addon.js", ADDON_TEMPLATE, "text/javascript") }))),
    h("div", { class: "rb-amk-step" }, h("b", null, "2. 만든 코드 넣기"), code),
    msg,
    note("warn", RISK_TEXT),
    h("div", { class: "btns" },
      btn("닫기", { onClick: () => { ctl?.abort(); done(null); } }),
      btn("불러오기", { kind: "primary", id: "rb-amk-import", onClick: async () => {
        const c = extractAddonCode(code.value);
        if (!c.trim()) return say("먼저 코드를 붙여 넣어 주세요.");
        const meta = await confirmCustomImport(ctx, c);
        if (meta) { ctx.toast(`‘${meta.name}’ v${meta.version}을(를) 불러왔어요`); done(meta); onDone?.(); }
      } }))));
}
