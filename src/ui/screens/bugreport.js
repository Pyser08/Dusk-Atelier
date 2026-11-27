// 버그 신고 · 기능 건의 창(2.2.46, 건의는 2.2.68): 무슨 일이 있었는지 적고, 보낼 내용을 전부 미리 본 뒤 보낸다. 받은 번호를 알려 준다.
import { h } from '../dom.js';
import { btn, modal, note, segmented } from '../kit.js';

// 건의는 허브 형식을 바꾸지 않고 글 앞에 표시를 붙여 보낸다(허브 목록에서 바로 구분)
export const SUGGEST_TAG = "[기능 건의] ";
export const tagReport = (kind, text) => (kind === "idea" ? SUGGEST_TAG : "") + String(text ?? "");

export async function openBugReport(ctx) {
  const hub = ctx.hub;
  if (!hub || !(await hub.configured())) { ctx.toast("신고·건의 서버가 아직 준비되지 않았어요. GitHub 이슈로 알려 주세요.", { seconds: 6 }); return null; }
  return modal(ctx.win, (done) => {
    let kind = "bug";
    const PH = { bug: "무엇을 하다가 어떤 일이 있었나요? (예: 장기기억 탭을 열면 빈 화면이 떠요)", idea: "있으면 좋겠는 기능이나 바뀌면 좋겠는 점을 적어 주세요 (예: 로어북 여러 개에 확률을 한 번에 넣고 싶어요)" };
    const text = h("textarea", { class: "rb-input", rows: 6, placeholder: PH.bug, style: "width:100%", "data-autofocus": true });
    const kindSeg = segmented([["bug", "버그 신고"], ["idea", "기능 건의"]], kind, (v) => { kind = v; text.placeholder = PH[v]; withLogs.checked = v === "bug"; }, "보낼 종류");
    const contact = h("input", { class: "rb-input", placeholder: "연락받을 곳 (선택 · 아카 닉네임, 디스코드 등)", style: "width:100%" });
    const withLogs = h("input", { type: "checkbox", checked: true });
    const preview = h("pre", { class: "rb-muted", style: "display:none;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:11px;margin:0;padding:10px 12px;border-radius:8px;background:rgba(127,127,127,.12)" });
    const status = h("div");
    let report = null;
    const build = async () => { report = await hub.buildReport({ text: tagReport(kind, text.value), contact: contact.value, withLogs: withLogs.checked }); preview.textContent = JSON.stringify(report, null, 2); return report; };
    const showBtn = btn("보낼 내용 보기", { onClick: async () => { await build(); preview.style.display = preview.style.display === "none" ? "block" : "none"; } });
    const sendBtn = btn("보내기", { kind: "primary", onClick: async () => {
      if (text.value.trim().length < 4) { status.replaceChildren(note("warn", kind === "idea" ? "바라는 점을 한 줄이라도 적어 주세요." : "무슨 일이 있었는지 한 줄이라도 적어 주세요.")); return; }
      sendBtn.disabled = true; status.replaceChildren(note("info", "보내는 중이에요…"));
      try {
        const no = await hub.sendReport(await build());
        status.replaceChildren(note("ok", no ? `보냈어요. ${kind === "idea" ? "건의" : "신고"} 번호는 #${no} 이에요. 해결되면 연락받고 싶다면 아카에 다른 내용 없이 #${no} 리폿했다고만 남겨 주세요.` : "보냈어요. 고마워요!"));
        sendBtn.remove();
      } catch (e) { sendBtn.disabled = false; status.replaceChildren(note("err", e?.message ?? String(e))); }
    } });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-label": "버그 신고 · 기능 건의", style: "max-width:560px;display:flex;flex-direction:column;gap:10px" },
      h("h3", { class: "rb-h3" }, "버그 신고 · 기능 건의"),
      h("p", { class: "rb-muted", style: "margin:0" }, "개발자 서버로 바로 보내요. 대화 내용·봇·API 키는 보내지 않고, 키처럼 보이는 글은 가려요."),
      h("p", { class: "rb-muted", style: "margin:0" }, "보낸 뒤 아카에 다른 내용 없이 #(번호)만 적어 리폿했다고 남겨 주시면, 해결한 뒤 연락받을 수 있어요. 번호는 보내면 알려 드려요."),
      kindSeg, text, contact,
      h("label", { style: "display:flex;gap:8px;align-items:center" }, withLogs, h("span", null, "버전·애드온·환경과 최근 오류 기록을 함께 보내기 (원인 찾기에 큰 도움이 돼요)")),
      preview, status,
      h("div", { class: "btns" }, showBtn, btn("닫기", { onClick: () => done(null) }), sendBtn));
  });
}
