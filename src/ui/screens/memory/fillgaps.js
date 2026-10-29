// 'AI로 빈칸 채우기' 공용(리수폿·인물 화면): 비어 있는 칸이 있는 인물을 세고, 확인을 받은 뒤 채운다.
import { confirmDialog } from "../../kit.js";
import { fillPlan, planLine } from "../../../engine/peoplegaps.js";
import { fillEmptyPeople } from "./aitools.js";
import { wikiEditable } from "./people.js";

export function gapPlanOf(env) {
  const wiki = env.folder.wiki, rt = env.ctx.memory.flow?.runtime?.(), ui = rt?.wiki?.userIdentity;
  const userSet = new Set([ui?.title, ...(ui?.aliases ?? []), "{{user}}", "user", "유저"].filter(Boolean).map((x) => String(x).trim().toLowerCase()));
  const docs = Object.values(wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !userSet.has(String(d.title ?? "").trim().toLowerCase()));
  return fillPlan(wiki, docs);
}

export async function askFillGaps(env, plan = gapPlanOf(env)) {
  const { ctx } = env;
  if (!wikiEditable(env)) return ctx.toast("위키가 만들어진 뒤에 쓸 수 있어요. 응답이 한 번 더 오면 생겨요.", { error: true });
  if (!plan.total) return ctx.toast("채울 빈칸이 없어요.");
  const lines = [...plan.full, ...plan.metricOnly].slice(0, 12).map(planLine), more = plan.total > 12 ? `\n…외 ${plan.total - 12}명` : "";
  const ok = await confirmDialog(ctx.win, { title: `AI로 빈칸 채우기 · ${plan.total}명`, body: `${lines.join("\n")}${more}\n\n이미 있는 본문·성격은 고치지 않아요. 인물마다 AI 호출이 일어나요.`, ok: "채우기 시작" });
  if (ok) await fillEmptyPeople(env, plan);
}
