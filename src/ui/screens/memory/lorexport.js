// 인물 위키의 '정리된 정보'를 봇 로어북으로 내보내기 (v1.8.3). 사용자가 누를 때만, 고른 인물만.
// 기억 기록(사건)이 아니라 위키 문서의 개요·관계·말투와 기본 성격만 글로 정리해 넣는다. 표식으로 같은 인물은 갱신만 한다.
import { h } from "../../dom.js";
import { btn, modal, badge } from "../../kit.js";
import { wikiLoreCandidates, upsertWikiLore, existingWikiMarks } from "../../../engine/wikilore.js";
import { isGenerating } from "../../../engine/safety.js";

export async function openLoreExport(env) {
  const { ctx, bot } = env;
  const cands = wikiLoreCandidates(env.folder?.wiki);
  if (!bot) return ctx.toast("봇을 찾지 못했어요.", { error: true });
  if (!cands.length) return ctx.toast("내보낼 정리된 인물 정보가 아직 없어요. 위키에 개요나 기본 성격이 생기면 쓸 수 있어요.");
  let cur = null;
  try { cur = await ctx.api.getCharacterFromIndex(bot.index); } catch { cur = bot.character ?? null; }
  const have = existingWikiMarks(cur?.globalLore);
  const picked = await modal(ctx.win, (done) => {
    const checks = cands.map((c) => ({ c, el: h("input", { type: "checkbox", "aria-label": `${c.name} 내보내기`, style: "width:18px;height:18px;flex:none;margin:0" }) }));
    const go = btn("내보내기", { kind: "primary", disabled: true, onClick: () => done(checks.filter((x) => x.el.checked).map((x) => x.c)) });
    const sync = () => { const n = checks.filter((x) => x.el.checked).length; go.disabled = !n; go.querySelector("span") ? (go.querySelector("span").textContent = n ? `내보내기 (${n}명)` : "내보내기") : null; };
    for (const x of checks) x.el.addEventListener("change", sync);
    const rows = checks.map(({ c, el }) => h("div", { class: "rb-lorex-row", style: "display:flex;flex-direction:column;align-items:stretch;gap:6px;padding:10px 0;border-bottom:1px solid var(--rb-line2);text-align:left" },
      h("label", { style: "display:flex;align-items:center;justify-content:flex-start;gap:10px;cursor:pointer" }, el, h("b", null, c.name), h("small", { class: "rb-muted" }, `${c.chars}자`), have.has(c.name) ? badge("이미 있음 · 갱신") : badge("새로 추가")),
      h("details", null, h("summary", { class: "rb-muted", style: "cursor:pointer;font-size:12.5px" }, "들어갈 글 보기"), h("pre", { style: "white-space:pre-wrap;word-break:break-word;margin:6px 0 0;font:inherit;font-size:12.5px;line-height:1.6;max-height:220px;overflow:auto" }, c.entry.content))));
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,94vw);max-height:88vh;overflow:auto" },
      h("h3", null, "봇 로어북으로 내보내기"),
      h("p", { class: "rb-muted" }, `‘${bot.character?.name ?? "이 봇"}’의 로어북에 인물 정보를 넣어요. 기억 기록(사건)이 아니라 위키에 정리된 개요·관계·말투와 기본 성격만 들어가고, 이름·별칭이 나올 때 켜져요.`),
      h("p", { class: "rb-muted", style: "font-size:12.5px" }, "비밀·성적 태도·의심 항목은 빼요. 내보낸 뒤 위키가 바뀌어도 로어북은 자동으로 바뀌지 않아요(다시 내보내면 그 인물 항목만 갱신). 장기 기억을 켜 두었다면 같은 내용이 두 번 들어갈 수 있어요."),
      h("div", null, rows),
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), go));
  });
  if (!picked?.length) return;
  try {
    const fresh = await ctx.api.getCharacterFromIndex(bot.index);
    if (!fresh?.chaId || String(fresh.chaId) !== String(bot.id)) throw new Error("봇 목록이 바뀐 것 같아요. 화면을 다시 열고 시도해 주세요.");
    if (isGenerating(fresh)) throw new Error("응답이 나오는 중이에요. 끝난 뒤에 다시 시도해 주세요.");
    const r = upsertWikiLore(fresh.globalLore, picked.map((c) => c.entry));
    await ctx.api.setCharacterToIndex(bot.index, { ...fresh, globalLore: r.list });
    ctx.state.charsDirty = true;   // 캐릭터 탭 목록의 로어북 개수 갱신
    const parts = [r.added ? `${r.added}개 추가` : "", r.updated ? `${r.updated}개 갱신` : "", r.unchanged ? `${r.unchanged}개는 그대로` : ""].filter(Boolean);
    ctx.toast(`봇 로어북에 넣었어요 · ${parts.join(", ")}`);
  } catch (e) {
    ctx.toast(`내보내지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
