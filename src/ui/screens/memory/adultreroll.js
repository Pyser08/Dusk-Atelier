// 2.2.6 인물 위키 NSFW 탭 ‘무작위 다시 뽑기’: 무작위 설정에서 고른 것(성적 욕망·이상성향 후보, 음란도, 첫인상, Erosync 성적 수치)을 이 인물만 다시 뽑는다.
import { h } from "../../dom.js";
import { btn, confirmDialog } from "../../kit.js";
import { readSeedOpt } from "../../../data/adultseed.js";
import { rerollWikiCandidates, rollAdult, seedFirst, seedLewd, SEX_KEYS, normalizeSeedOpt } from "../../../engine/adultseed.js";
import { editMetricValue } from "../../../engine/personedit.js";
import { withRolledSexual } from "../../../engine/nsfwprofile.js";
import { regenerate } from "./nsfwcard.js";
import { editFolder, policyOf } from "./people.js";

// addon-rebuild: 다시 뽑기 동작만 따로(성적 욕망·이상성향 카드 우상단 단추가 부른다)
export async function rerollAdult(env, doc, redraw) {
  const { ctx } = env;
  {
    const opt = normalizeSeedOpt({ ...(await readSeedOpt(ctx.api)), on: true });
    const parts = [(opt.desires || opt.kinks) && "성적 욕망·이상성향(+성인 프로필)", opt.lewd && "음란도", opt.first && "첫인상", opt.sexual && "성적 수치"].filter(Boolean);
    if (!parts.length) return ctx.toast("무작위 설정에서 다시 뽑을 것을 하나 이상 켜 주세요(장기 기억 → 기억 옵션).", { error: true });
    if (!(await confirmDialog(ctx.win, { title: "무작위로 다시 뽑을까요?", body: `${parts.join(" · ")}을(를) 이 인물만 새로 정해요. 전에 무작위로 넣은 성적 욕망·이상성향은 빼고 새로 뽑아 바로 반영해요. 거부한 것·AI가 찾은 것은 그대로예요.`, ok: "다시 뽑기" }))) return;
    try {
      let n = 1, msg = [];
      await editFolder(env, (f) => {
        f.adultSeedRoll ??= {}; n = f.adultSeedRoll[doc.id] = (f.adultSeedRoll[doc.id] ?? 0) + 1;
        if (opt.desires || opt.kinks) msg.push(`후보 ${rerollWikiCandidates(f.wiki, doc.id, opt, n, undefined, f.adultLocks)}개`);
        const name = doc.title || doc.id, salt = `#${n}`, d = f.wiki?.documents?.[doc.id];
        for (const [slot, val, label] of [["openness.score", opt.lewd ? seedLewd(opt, name, policyOf(env, "openness.score"), salt) : null, "음란도"], ["affinity.taste_band", opt.first ? seedFirst(opt, name, salt) : null, "첫인상"]]) {
          if (val == null) continue;
          const m = d?.metrics?.find((x) => x.slot_id === slot && (slot !== "affinity.taste_band" || (x.target_refs ?? [])[0] === "actor:user"));
          if (!m) continue;
          try { f.wiki = editMetricValue(f.wiki, doc.id, m.id, val, "무작위로 다시 뽑음", policyOf(env, slot)); msg.push(`${label} ${val}`); } catch { /* 이 수치는 고칠 수 없음 */ }
        }
      });
      // addon-rebuild: 성적 수치는 이 채팅 성인 프로필(folder.nsfw)에
      const roll = rollAdult(`${doc.title || doc.id}#${n}`, null, opt);
      if (opt.sexual) { await editFolder(env, (f) => { f.nsfw ??= {}; f.nsfw[doc.id] = withRolledSexual(f.nsfw[doc.id] ? { ...f.nsfw[doc.id], by: f.nsfw[doc.id].by === "user" ? "roll" : f.nsfw[doc.id].by } : null, roll.sexual); }); msg.push("성적 수치"); }
      // addon-rebuild: 새로 뽑은 성적 욕망·이상성향을 바탕으로 성인 프로필(체위·장소·플레이·유혹 등)도 다시 만든다(호출 1번). 뽑힌 성적 수치·태그는 남긴다
      if (opt.desires || opt.kinks) { ctx.toast(`다시 뽑았어요 · ${msg.join(" · ")} — 성인 프로필도 새로 만드는 중이에요…`); const ok = await regenerate(env, doc, { keep: opt.sexual ? { sexual: roll.sexual } : null, quiet: true }); if (ok) msg.push("성인 프로필"); }
      ctx.toast(msg.length ? `다시 뽑았어요 · ${msg.join(" · ")}` : "다시 뽑을 칸이 아직 없어요(수치가 기록된 뒤에 돼요).");
      redraw?.();
    } catch (e) { ctx.toast(String(e?.message ?? e), { error: true }); }
  }
}
export function adultRerollCard(env, card, doc, redraw) {
  if (!doc?.id) return null;
  const go = () => rerollAdult(env, doc, redraw);
  return card("무작위 다시 뽑기", [h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, "무작위 설정에서 고른 성인 항목을 이 인물만 새로 정해요. 마음에 들 때까지 여러 번 뽑을 수 있어요."),
    h("div", { class: "rb-mem-sact" }, btn("무작위 다시 뽑기", { size: "sm", id: "rb-adult-reroll", onClick: go }))], null, "rb-nsfw-base");
}
