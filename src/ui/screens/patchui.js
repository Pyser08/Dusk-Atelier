import { stableJson } from '../../engine/util.js';
import { createStore } from '../../engine/store.js';
import { Busy, backupSnapshot, isGenerating } from '../../engine/safety.js';
import { safeFileName } from '../../engine/export.js';
import { download, pickFiles } from '../dom.js';
import { confirmDialog } from '../kit.js';
import { applyPatch, buildPatch, parsePatch, planPatch } from '../../engine/patch.js';
import { baseViewOf } from './devtools.js';

var keyOf2 = (kind, obj) => kind === "module" ? `m:${obj.id}` : `c:${obj.chaId}`;
export async function exportMyChanges(ctx, kind, obj) {
  const store = createStore(ctx.api);
  const base = await store.getBaseline(keyOf2(kind, obj));
  if (!base) {
    const ok = await confirmDialog(ctx.win, { title: "원본 기록이 없어요", body: '이 플러그인으로 가져오거나 업데이트한 적이 없어서 "제작자 원본"을 몰라요.\n지금 상태를 원본으로 기록해 둘까요? 그 뒤에 고친 것부터 내보낼 수 있어요.', ok: "지금 상태로 기록 시작" });
    if (ok) {
      await store.setBaseline(keyOf2(kind, obj), baseViewOf(kind, obj));
      ctx.toast("기록을 시작했어요. 이제부터 고친 내용을 내보낼 수 있어요.");
    }
    return;
  }
  const includeAssets = await confirmDialog(ctx.win, { title: "바꾼 에셋도 넣을까요?", body: "넣으면 받는 사람이 같은 이미지를 따로 구하지 않아도 돼요. 파일이 커질 수 있어요.", ok: "에셋 넣기", cancel: "글자만" });
  const t = ctx.toast("패치 만드는 중…", { seconds: 120 });
  try {
    const patch = await buildPatch({ kind, name: obj.name, namespace: obj.namespace ?? obj.moduleNamespace, base, current: obj, readAsset: (p) => ctx.assets.read(p), includeAssets });
    t.close();
    if (!patch) {
      ctx.toast("원본과 달라진 내용이 없어요");
      return;
    }
    download(`${safeFileName(obj.name)}.rbupatch`, JSON.stringify(patch), "application/json");
    ctx.toast("내 수정 패치를 내보냈어요");
  } catch (e) {
    t.close();
    ctx.toast(`만들지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
export async function applyPatchFile(ctx, kind, getTarget, save) {
  const [f] = await pickFiles({ accept: ".rbupatch,application/json" });
  if (!f) return;
  let patch;
  try {
    patch = parsePatch(await f.text());
  } catch (e) {
    ctx.toast(e?.message ?? String(e), { error: true });
    return;
  }
  if (patch.kind !== kind) {
    ctx.toast(`${patch.kind === "module" ? "모듈" : "캐릭터"}용 패치예요`, { error: true });
    return;
  }
  const target = await getTarget();
  const plan = planPatch(patch, target);
  const s = plan.summary;
  const lines = [
    `패치: ${patch.name}${patch.version ? ` v${patch.version}` : ""}${patch.name !== target.name ? ` → 적용 대상: ${target.name}` : ""}`,
    patch.author ? `제작자: ${patch.author}` : "",
    patch.note ? `변경 내용:
${patch.note}` : "",
    `패치의 수정 ${s.update ?? 0} · 내 수정 유지 ${s.mine ?? 0} · 충돌 ${s.conflict ?? 0}(패치 쪽으로) · 추가 ${s.added ?? 0} · 삭제 ${s.removed ?? 0}`,
    Object.keys(patch.assets ?? {}).length ? `에셋 ${Object.keys(patch.assets).length}개를 올려요` : "",
    "적용하기 전 상태는 백업해요."
  ].filter(Boolean);
  if (!plan.items.length) {
    ctx.toast("적용할 내용이 없어요 (이미 같아요)");
    return;
  }
  if (!await confirmDialog(ctx.win, { title: "패치를 적용할까요?", body: lines.join("\n"), ok: "적용" })) return;
  try {
    const cur = await getTarget();
    if (kind === "character" && isGenerating(cur)) throw new Busy();
    await createStore(ctx.api).addBackup({ kind, target: kind === "module" ? cur.id : cur.chaId, name: cur.name, snapshot: backupSnapshot(kind, cur), note: "패치 적용 전", summary: `${f.name}` });
    const r = await applyPatch(patch, cur, { saveAsset: (d) => ctx.api.saveAsset(d) });
    await save(r.result, cur);
    ctx.toast("패치를 적용했어요");
  } catch (e) {
    ctx.toast(`적용하지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
export function changedKeys(before, after) {
  const out = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) if (k !== "id" && stableJson(before[k] ?? null) !== stableJson(after[k] ?? null)) out[k] = after[k];
  return out;
}
