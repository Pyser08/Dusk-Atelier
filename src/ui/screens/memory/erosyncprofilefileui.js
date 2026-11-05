// 인물 위키 NSFW 탭: 이 인물의 NSFW 프로필(직접 고친 값 + 선호·금기 태그)을 파일로 내보내고 불러오기.
import { pickFiles } from "../../dom.js";
import { confirmDialog } from "../../kit.js";
import { buildProfileFile, readProfileFile, profilePatch } from "../../../data/eroprofilefile.js";

const slug = (s) => String(s || "profile").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
function save(name, text) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function exportProfile(ctx, person) {
  const got = await ctx.erosync.profile("get", person.id);
  if (!got?.ok) { ctx.toast(got?.reason || "프로필을 읽지 못했어요", { error: true }); return; }
  const tags = await ctx.erosync.tags?.(person.id).catch(() => null);
  save(`dusk-ero-${slug(person.name)}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(buildProfileFile(got, tags)));
  ctx.toast(`${person.name}의 프로필을 내보냈어요`);
}
export async function importProfile(ctx, person, onDone) {
  try {
    const [file] = await pickFiles({ accept: ".json" }); if (!file) return;
    const f = readProfileFile(await file.text());
    const same = !f.name || f.name === person.name;
    const n = Object.keys(f.scalars).length + (f.eroticInterest != null ? 1 : 0) + f.tags.likes.length + f.tags.limits.length;
    const ok = await confirmDialog(ctx.win, { title: `${person.name}에게 불러올까요?`,
      body: `${same ? "" : `파일은 ‘${f.name}’의 프로필이에요. `}직접 고친 값과 태그 ${n}개를 이 인물에 덮어써요. 파일에 없는 칸은 AI 분석값으로 돌아가요.`, ok: "불러오기", danger: !same });
    if (!ok) return;
    const got = await ctx.erosync.profile("get", person.id);
    if (!got?.ok) throw new Error(got?.reason || "프로필을 읽지 못했어요");
    const r = await ctx.erosync.profile("edit", person.id, profilePatch(got, f));
    if (!r?.ok) throw new Error(r?.reason || "값을 적용하지 못했어요");
    const t = await ctx.erosync.setTags?.(person.id, f.tags);
    if (t && !t.ok) throw new Error(t.reason);
    ctx.toast("프로필을 불러왔어요"); onDone?.();
  } catch (e) { ctx.toast(String(e?.message ?? e), { error: true }); }
}
