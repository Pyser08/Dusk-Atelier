// 장기 기억 → Erosync 화면(2단계): 켜기·끄기와 설정만. 인물 값은 인물 위키 NSFW 탭에서 본다.
import { h, replace } from "../../dom.js";
import { pageHead } from "../../kit.js";
import { mem } from "./common.js";
import { erosyncSection } from "./erosyncui.js";
import { scanOriginalErosync } from "../../../data/erosyncmigrate.js";

export const scanLine = (s) => !s?.found ? "" : `원래 Erosync에서 쓰던 기록을 찾았어요 — 인물 프로필 ${s.profiles}개${s.canListSessions ? ` · 채팅 기록 ${s.sessions}개` : ""}${s.botSettings ? ` · 봇별 설정 ${s.botSettings}개` : ""}. 같은 저장 공간을 쓰니 따로 옮길 필요 없이 켜면 그대로 이어져요. 원래 플러그인은 끄고 쓰세요.`;

export async function renderMemoryErosync(ctx, host, { redraw }) {
  const m = mem(ctx);
  const back = { label: "장기 기억으로", onClick: () => { m.page = "home"; redraw(); } };
  const sec = erosyncSection(ctx);
  const s = await scanOriginalErosync(ctx.api).catch(() => null);
  const line = scanLine(s);
  replace(host, h("div", { class: "rb-me rb-ero-page" },
    pageHead("Erosync", { back }),
    line ? h("p", { class: "rb-card bordered rb-muted", id: "rb-erosync-found", style: "white-space:normal;padding:12px" }, line) : null,
    sec));
}
