// 2.2.6 인물 위키 NSFW 탭 ‘무작위 다시 뽑기’: 무작위 설정에서 고른 것(성적 욕망·이상성향 후보, 음란도, 첫인상, Erosync 성적 수치)을 이 인물만 다시 뽑는다.
import { h } from "../../dom.js";
import { btn, confirmDialog } from "../../kit.js";
import { readSeedOpt } from "../../../data/adultseed.js";
import { rerollWikiCandidates, rollAdult, seedFirst, seedLewd, SEX_KEYS, normalizeSeedOpt } from "../../../engine/adultseed.js";
import { editMetricValue } from "../../../engine/personedit.js";
import { editFolder, policyOf } from "./people.js";

export function adultRerollCard(env, card, doc, eroPerson, redraw) {
  const { ctx } = env;
  if (!doc?.id) return null;
  const go = async () => {
    const opt = normalizeSeedOpt({ ...(await readSeedOpt(ctx.api)), on: true });
    const parts = [opt.desires && "성적 욕망", opt.kinks && "이상성향", opt.lewd && "음란도", opt.first && "첫인상", opt.sexual && eroPerson && "Erosync 성적 수치"].filter(Boolean);
    if (!parts.length) return ctx.toast("무작위 설정에서 다시 뽑을 것을 하나 이상 켜 주세요(장기 기억 → 기억 옵션).", { error: true });
    if (!(await confirmDialog(ctx.win, { title: "무작위로 다시 뽑을까요?", body: `${parts.join(" · ")}을(를) 이 인물만 새로 정해요. 검토 대기 중인 무작위 후보는 바뀌고, 이미 반영·거부한 후보는 그대로예요.`, ok: "다시 뽑기" }))) return;
    try {
      let n = 1, msg = [];
      await editFolder(env, (f) => {
        f.adultSeedRoll ??= {}; n = f.adultSeedRoll[doc.id] = (f.adultSeedRoll[doc.id] ?? 0) + 1;
        if (opt.desires || opt.kinks) msg.push(`후보 ${rerollWikiCandidates(f.wiki, doc.id, opt, n)}개`);
        const name = doc.title || doc.id, salt = `#${n}`, d = f.wiki?.documents?.[doc.id];
        for (const [slot, val, label] of [["openness.score", opt.lewd ? seedLewd(opt, name, policyOf(env, "openness.score"), salt) : null, "음란도"], ["affinity.taste_band", opt.first ? seedFirst(opt, name, salt) : null, "첫인상"]]) {
          if (val == null) continue;
          const m = d?.metrics?.find((x) => x.slot_id === slot && (slot !== "affinity.taste_band" || (x.target_refs ?? [])[0] === "actor:user"));
          if (!m) continue;
          try { f.wiki = editMetricValue(f.wiki, doc.id, m.id, val, "무작위로 다시 뽑음", policyOf(env, slot)); msg.push(`${label} ${val}`); } catch { /* 이 수치는 고칠 수 없음 */ }
        }
      });
      if (opt.sexual && eroPerson && ctx.erosync?.isRunning?.()) {
        const roll = rollAdult(`${eroPerson.name}#${n}`);
        try { await ctx.erosync.profile("edit", eroPerson.id, Object.fromEntries(SEX_KEYS.map((k) => [k, roll.sexual[k]]))); msg.push("Erosync 성적 수치"); } catch { /* Erosync 실패는 넘김 */ }
      }
      ctx.toast(msg.length ? `다시 뽑았어요 · ${msg.join(" · ")}` : "다시 뽑을 칸이 아직 없어요(수치가 기록된 뒤에 돼요).");
      redraw?.();
    } catch (e) { ctx.toast(String(e?.message ?? e), { error: true }); }
  };
  return card("무작위 다시 뽑기", [h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, "무작위 설정에서 고른 성인 항목을 이 인물만 새로 정해요. 마음에 들 때까지 여러 번 뽑을 수 있어요."),
    h("div", { class: "rb-mem-sact" }, btn("무작위 다시 뽑기", { size: "sm", id: "rb-adult-reroll", onClick: go }))], null, "rb-nsfw-base");
}
