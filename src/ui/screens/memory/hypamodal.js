// v1.8.1 HypaPlus 안내·가져오기 창. 기억 탭에 처음 들어갔을 때 HypaPlus가 감지되면 자동으로 뜬다(설정에서 다시 열 수도 있다).
import { h } from "../../dom.js";
import { btn, modal, note, confirmDialog } from "../../kit.js";
import { mem, fail } from "./common.js";
import { chatKeyOf } from "../../../engine/chatkey.js";

const plural = (n, t) => `${n}${t}`;
export async function openHypaModal(ctx, { det, auto = false } = {}) {
  const M = ctx.memory, I = M.hypa, d = det ?? await I.detect();
  const msg = h("div", { "aria-live": "polite" }), file = h("input", { type: "file", accept: ".json,application/json", "aria-label": "HypaPlus 백업 파일", style: "max-width:100%" });
  let busy = false;
  const show = (kind, text) => msg.replaceChildren(note(kind, text));
  const report = (r) => `가져왔어요 — 채팅 ${r.chats ?? 1}개 · 장면 ${r.scenes}개 · 기록 ${r.records}개 · 새 인물 ${r.people}명${r.upgraded ? ` · 메시지에 연결 ${r.upgraded}개` : ""}${r.already ? ` · 이미 있던 것 ${r.already}개` : ""}${r.skipped ? ` · 인물이 없어 건너뜀 ${r.skipped}개` : ""}${r.unreadable ? ` · 못 읽음 ${r.unreadable}개` : ""}. 원본 HypaPlus 데이터는 그대로예요. 이제 HypaPlus는 꺼 주세요.`;
  const run = async (fn) => { if (busy) return; busy = true; try { await fn(); } catch (e) { show("err", e?.message ?? String(e)); } finally { busy = false; } };
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "HypaPlus 가져오기", style: "max-width:540px;display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, auto ? "HypaPlus를 쓰고 계시네요" : "HypaPlus에서 가져오기"),
    h("p", { class: "rb-p" }, h("b", null, "HypaPlus와 Dusk 기억은 동시에 쓸 수 없어요. "), "둘 다 켜면 같은 요청에 기억이 두 번 들어가 토큰이 낭비되고, HypaPlus가 요약된 메시지를 가리는 방식과 겹쳐 이야기가 끊길 수 있어요. 한쪽만 켜 주세요."),
    h("p", { class: "rb-p" }, "Dusk 기억은 응답마다 인물별 기록(등급), 감정·관계 변화, 열린 떡밥, 누가 무엇을 아는지(지식 경계)를 이어서 쌓고, 지금 장면에 맞는 것만 골라 넣어요. 임베딩 의미 검색과 정규식 전처리도 같은 흐름에서 써요."),
    d.chats.length ? note("info", `HypaPlus 기록이 있는 채팅 ${plural(d.chats.length, "개")}를 찾았어요. 이벤트는 장면과 인물 기록으로, 사실은 인물 기록으로 옮겨요(즐겨찾기는 고정·A등급).`)
      : note("info", d.installed ? "HypaPlus는 설치돼 있지만 이 기기에서 저장된 기록을 찾지 못했어요. 백업 파일이 있으면 아래에서 가져올 수 있어요." : "저장된 HypaPlus 기록을 찾지 못했어요. 백업 파일이 있으면 아래에서 가져올 수 있어요."),
    d.unparsed ? h("p", { class: "rb-muted" }, `아이디를 나눌 수 없는 기록 ${d.unparsed}개는 건너뛰어요. 백업 파일로 가져와 주세요.`) : null,
    h("p", { class: "rb-muted" }, "프롬프트에 [HypaPlus.memory]·[HypaPlus.cached]를 넣어 뒀다면 [Dusk.memory]로 바꿔 주세요. 그 자리에 Dusk 기억이 들어가요."),
    h("div", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:6px" }, h("span", null, "백업 파일로 가져오기 (지금 열린 채팅에 들어가고, 원래 메시지에 연결돼서 리롤·삭제를 따라가요)"), file,
      btn("파일 가져오기", { size: "sm", onClick: () => run(async () => {
        const f = file.files?.[0]; if (!f) return show("info", "HypaPlus 백업(JSON) 파일을 먼저 고르세요.");
        const cur = await M.injector.current(); if (!cur) return show("err", "리수에서 채팅을 연 상태에서 가져올 수 있어요.");
        if (!(await confirmDialog(ctx.win, { title: "이 채팅에 가져올까요?", body: `${cur.character.name} · ${cur.chat.name ?? "채팅"}\n같은 노드는 한 번만 들어가요.`, ok: "가져오기" }))) return;
        show("info", "가져오는 중…"); show("info", report(await I.importFile(await f.text(), cur.character.chaId, chatKeyOf(cur.chat, cur.ti ?? 0), cur.chat.message ?? [])));
      }) })),
    msg,
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      auto ? btn("다시 보지 않기", { size: "sm", onClick: () => I.dismiss().then(() => done(true)).catch(fail(ctx)) }) : null,
      btn(auto ? "나중에" : "닫기", { onClick: () => done(true) }),
      d.chats.length ? btn("지금 가져오기", { kind: "primary", onClick: () => run(async () => {
        show("info", "가져오는 중…"); const cur = await M.injector.current().catch(() => null);  // 지금 열린 채팅은 메시지에 연결(앵커)해서 넣는다
        const r = await I.importAll(d.chats, { onProgress: (i, n) => show("info", `가져오는 중… ${i}/${n}`), messagesFor: async (a, c) => cur && String(cur.character.chaId) === String(a) && chatKeyOf(cur.chat, cur.ti ?? 0) === String(c) ? cur.chat.message ?? [] : null }); show("info", report(r));
      }) }) : null))).catch(fail(ctx));
}

// 기억 탭에 처음 들어갔을 때 HypaPlus가 있으면 한 번 띄운다. 이미 가져왔거나 '다시 보지 않기'를 눌렀으면 조용히 건너뛴다.
export async function maybeAskHypa(ctx) {
  const m = mem(ctx); if (m.hypaChecked || !ctx.memory?.hypa) return; m.hypaChecked = true;
  const idx = await ctx.memory.store.getIndex(); if (idx.hypa?.state) return;
  const det = await ctx.memory.hypa.detect(); if (det.found) await openHypaModal(ctx, { det, auto: true });
}
