// 장기 기억 홈 ‘더보기’ 메뉴: 장기 기억을 파일로 내보내기·불러오기, Erosync 값 지우기.
import { h, pickFiles } from "../../dom.js";
import { btn, confirmDialog, modal } from "../../kit.js";
import { chatKeyOf } from "../../../engine/chatkey.js";
import { fail } from "./common.js";
import { currentChat } from "../../../data/memoryswitches.js";
import { buildMemoryFile, readMemoryFile, applyMemoryFile, summarize, clearErosyncData, planRemap, listLocalChats, FOLDER_VERSIONS } from "../../../data/memoryfile.js";

// 파일에 채팅이 여럿일 때 열린 채팅에 넣을 하나를 고른다(신고 #29). null = 고르지 않음(자동으로 맞춘 자리·원래 자리로)
function pickFolder(ctx, folders, cur) {
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-label": "열린 채팅에 넣을 기억", style: "max-width:520px;display:flex;flex-direction:column;gap:8px" },
    h("h3", { class: "rb-h3" }, "열린 채팅에 넣을 기억을 고를까요?"),
    h("p", { class: "rb-muted", style: "margin:0" }, `지금 열린 채팅(${cur.botName || "봇"} · ${cur.chatName || "이름 없음"})은 파일에 없어요. 다른 기기에서 옮겨 왔다면 아래에서 그 채팅의 기억을 골라 주세요. 고른 기억은 이 채팅에 덮어써요.`),
    h("div", { style: "display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto" },
      ...folders.map((f) => btn(`${f.botName || "봇"} · ${f.chatName || "이름 없음"} — 인물 ${Object.keys(f.people ?? {}).length}명`, { onClick: () => done(f) }))),
    h("div", { class: "btns" }, btn("고르지 않고 불러오기", { onClick: () => done(null) }), btn("그만두기", { onClick: () => done(false) }))));
}

const stamp = () => new Date().toISOString().slice(0, 10);
function save(name, text) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// Erosync가 켜져 있으면 잠시 멈추고(엔진 캐시와 어긋나지 않게) 일을 한 뒤 다시 켠다
async function paused(ctx, fn) {
  const er = ctx.erosync, wasOn = !!er?.on?.();
  if (wasOn) await er.stop?.();
  try { return await fn(); } finally { if (wasOn) await er.set?.(true).catch(() => {}); }
}

export function memoryFileItems(ctx, redraw) {
  const M = ctx.memory;
  return [
    { label: "장기 기억 파일로 내보내기", onClick: async () => {
      try {
        const d = await buildMemoryFile(ctx.api, M.store), s = summarize(d);
        save(`dusk-memory-${stamp()}.json`, JSON.stringify(d));
        ctx.toast(`내보냈어요 — 채팅 ${s.chats}개 · 인물 ${s.people}명${d.erosync ? ` · Erosync 값 ${s.ero}개` : ""}${d.erosync && !d.erosync.listable ? " (이 환경은 채팅별 Erosync 기록을 찾지 못해요)" : ""}`);
      } catch (e) { fail(ctx)(e); }
    } },
    { label: "열린 채팅만 내보내기", onClick: async () => {
      try {
        const cur = await currentChat(ctx.api).catch(() => null);
        if (!cur) return ctx.toast("리스에서 채팅을 연 뒤 눌러 주세요.", { error: true });
        const d = await buildMemoryFile(ctx.api, M.store, { only: cur, erosync: false }), s = summarize(d);
        if (!s.chats) return ctx.toast("이 채팅에는 아직 저장된 기억이 없어요.", { error: true });
        save(`dusk-memory-${(cur.chatName || "chat").replace(/[\\/:*?"<>|]/g, "_")}-${stamp()}.json`, JSON.stringify(d));
        ctx.toast(`내보냈어요 — 인물 ${s.people}명`);
      } catch (e) { fail(ctx)(e); }
    } },
    { label: "장기 기억 파일 불러오기", onClick: async () => {
      try {
        const [file] = await pickFiles({ accept: ".json" }); if (!file) return;
        const d = readMemoryFile(await file.text()), s = summarize(d);
        // 신고 #29: 다른 기기에서 내보낸 파일은 봇·채팅 ID가 달라 그대로 넣으면 아무 채팅에도 안 보였다 → 이 기기의 봇·채팅에 맞춘다
        const list = d.folders.filter((f) => f?.chaId && f?.chatId && FOLDER_VERSIONS.includes(f.v));
        const plan = planRemap(list, await listLocalChats(ctx.api, chatKeyOf));
        const placeOf = new Map(list.map((f, i) => [f, plan[i]]));
        const missing = plan.filter((p) => p === null).length;
        const cur = await currentChat(ctx.api).catch(() => null);
        const lands = (f) => { const p = placeOf.get(f); const at = p && p !== "same" ? p : f; return String(at.chaId) === String(cur?.chaId) && String(at.chatId) === String(cur?.chatId); };
        let target = null, pick = null;
        if (cur && list.length && !list.some(lands)) {
          if (list.length === 1) {
            const f0 = list[0];
            const into = await confirmDialog(ctx.win, { title: "열린 채팅에 넣을까요?", body: `파일의 채팅(${f0?.chatName || "이름 없음"}) 기억을 지금 열린 채팅(${cur.chatName || "이름 없음"})에 덮어써요. ‘아니요’를 누르면 ${placeOf.get(f0) === null ? "원래 채팅 ID로 불러와요(이 기기에 그 채팅이 없으면 보이지 않아요)" : "맞는 채팅을 찾아 불러와요"}.`, ok: "열린 채팅에 넣기", cancel: "아니요" });
            if (into) { target = { chaId: cur.chaId, chatId: cur.chatId, chatIndex: cur.ti, chatName: cur.chatName }; pick = f0; }
          } else if (missing) {
            const f = await pickFolder(ctx, list.filter((x) => placeOf.get(x) === null), cur);
            if (f === false) return;
            if (f) { target = { chaId: cur.chaId, chatId: cur.chatId, chatIndex: cur.ti, chatName: cur.chatName }; pick = f; }
          }
        }
        const note2 = !target && missing ? ` 이 기기에서 맞는 채팅을 못 찾은 ${missing}개는 원래 ID로 들어가 보이지 않을 수 있어요(그 채팅을 열고 ‘열린 채팅만’ 파일로 다시 불러오면 돼요).` : "";
        const ok = await confirmDialog(ctx.win, { title: "장기 기억을 불러올까요?", body: target ? `파일의 ‘${pick.chatName || "이름 없음"}’ 기억(인물 ${Object.keys(pick.people ?? {}).length}명)을 열린 채팅에 덮어써요.${s.chats > 1 ? ` 나머지 ${s.chats - 1}개 채팅은 이 기기에서 맞는 채팅을 찾아 넣어요.` : ""}` : `채팅 ${s.chats}개 · 인물 ${s.people}명${d.erosync ? ` · Erosync 값 ${s.ero}개` : ""}. 같은 채팅의 기억이 이미 있으면 파일 내용으로 바뀌고, 파일에 없는 채팅은 그대로예요.${note2}`, ok: "불러오기" });
        if (!ok) return;
        const remap = (f) => { const p = placeOf.get(f); return p && p !== "same" ? p : null; };
        const r = await paused(ctx, () => applyMemoryFile(ctx.api, M.store, d, { target, pick, remap }));
        try { await M.flow?.runtime?.()?.wiki?.refresh?.(); } catch { /* 다음 응답 때 맞춰짐 */ }
        ctx.toast(`불러왔어요 — 채팅 ${r.chats}개${r.moved ? ` (이 기기의 채팅에 맞춘 것 ${r.moved}개)` : ""}${r.ero ? ` · Erosync 값 ${r.ero}개` : ""}`, { seconds: 6 });
        redraw();
      } catch (e) { fail(ctx)(e); }
    } }
  ];
}

// 위험 구역 버튼: Erosync 저장 값 지우기(원래 Erosync 플러그인이 쓰던 기록도 같은 키라 함께 지워진다)
export async function clearErosyncFlow(ctx, redraw) {
  const ok = await confirmDialog(ctx.win, { title: "Erosync 값을 지울까요?", body: "인물 프로필·채팅 기록·봇별 설정 등 Erosync가 저장한 값을 모두 지워요. 원래 Erosync 플러그인이 쓰던 기록도 같은 곳이라 함께 지워져요. 장기 기억 기록은 그대로예요.", ok: "지우기", danger: true });
  if (!ok) return;
  try { const n = await paused(ctx, () => clearErosyncData(ctx.api)); ctx.toast(`Erosync 값 ${n}개를 지웠어요.`); redraw(); } catch (e) { fail(ctx)(e); }
}
