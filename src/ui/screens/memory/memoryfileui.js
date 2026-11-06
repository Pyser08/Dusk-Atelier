// 장기 기억 홈 ‘더보기’ 메뉴: 장기 기억을 파일로 내보내기·불러오기, Erosync 값 지우기.
import { h, pickFiles } from "../../dom.js";
import { confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { currentChat } from "../../../data/memoryswitches.js";
import { buildMemoryFile, readMemoryFile, applyMemoryFile, summarize, clearErosyncData } from "../../../data/memoryfile.js";

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
        // 채팅 하나짜리 파일이고 다른 채팅이 열려 있으면, 그 채팅(예: 복사한 채팅)에 넣을지 고르게 한다.
        const cur = s.chats === 1 ? await currentChat(ctx.api).catch(() => null) : null, f0 = d.folders[0];
        let target = null;
        if (cur && (String(f0?.chaId) !== String(cur.chaId) || String(f0?.chatId) !== String(cur.chatId))) {
          const into = await confirmDialog(ctx.win, { title: "열린 채팅에 넣을까요?", body: `파일의 채팅(${f0?.chatName || "이름 없음"}) 기억을 지금 열린 채팅(${cur.chatName || "이름 없음"})에 덮어써요. ‘아니요’를 누르면 원래 채팅으로 불러와요.`, ok: "열린 채팅에 넣기", cancel: "원래 채팅으로" });
          if (into) target = { chaId: cur.chaId, chatId: cur.chatId, chatIndex: cur.ti, chatName: cur.chatName };
        }
        const ok = await confirmDialog(ctx.win, { title: "장기 기억을 불러올까요?", body: `채팅 ${s.chats}개 · 인물 ${s.people}명${d.erosync ? ` · Erosync 값 ${s.ero}개` : ""}. 같은 채팅의 기억이 이미 있으면 파일 내용으로 바뀌고, 파일에 없는 채팅은 그대로예요.`, ok: "불러오기" });
        if (!ok) return;
        const r = await paused(ctx, () => applyMemoryFile(ctx.api, M.store, d, { target }));
        try { await M.flow?.runtime?.()?.wiki?.refresh?.(); } catch { /* 다음 응답 때 맞춰짐 */ }
        ctx.toast(`불러왔어요 — 채팅 ${r.chats}개${r.ero ? ` · Erosync 값 ${r.ero}개` : ""}`);
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
