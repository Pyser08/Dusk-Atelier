import { characterImpact, impactText, moduleImpact } from '../../engine/impact.js';
import { loadPersonaMap } from '../../data/persona.js';
import { loadCharacters } from '../../data/modules.js';
import { stableJson } from '../../engine/util.js';
import { createStore } from '../../engine/store.js';
import { Busy, backupSnapshot, isGenerating } from '../../engine/safety.js';
import { safeFileName } from '../../engine/export.js';
import { download, pickFiles } from '../dom.js';
import { confirmDialog, modal, btn } from '../kit.js';
import { h } from '../dom.js';
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
// 패치가 닿는 곳 (1.4.6). 읽지 못하면 조용히 뺀다.
async function impactOf(ctx, kind, target) {
  try {
    if (kind === "module") {
      const [db, pm] = await Promise.all([ctx.api.getDatabase(["characters", "enabledModules", "modules", "personas"]), loadPersonaMap(ctx.api)]);
      const chars = (await loadCharacters(ctx.api, db?.characters)).list;
      return impactText(moduleImpact(target.id, { characters: chars, enabledModules: db?.enabledModules ?? [], personaMap: pm.map, personas: db?.personas ?? [], enabled: (db?.modules ?? []).some((m) => m?.id === target.id) }));
    }
    const db = await ctx.api.getDatabase(["characters", "modules"]);
    return impactText(characterImpact(target, { characters: db?.characters ?? [], modules: db?.modules ?? [] }));
  } catch {
    return "";
  }
}
export async function applyPatchFile(ctx, kind, getTarget, save, dropped = null) {
  const f = dropped ?? (await pickFiles({ accept: ".rbupatch,application/json" }))[0];
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
    await impactOf(ctx, kind, target),
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

// 끌어 놓은 .rbupatch: 이름이 같은 캐릭터·모듈을 찾아 같은 순서(미리 보기 → 백업 → 적용)로 적용한다.
export async function applyDroppedPatch(ctx, file) {
  let patch;
  try { patch = parsePatch(await file.text()); } catch (e) { return ctx.toast(e?.message ?? String(e), { error: true }); }
  const isMod = patch.kind === "module";
  let cands;
  try {
    if (isMod) cands = ((await ctx.svc.load()).entries ?? []).map((x) => ({ id: x.module.id, name: x.module.name ?? "", ns: x.module.namespace ?? "" })).filter((x) => x.name === patch.name);
    else cands = ((await ctx.api.getDatabase(["characters"]))?.characters ?? []).map((c, i) => ({ i, chaId: c.chaId, name: c.name ?? "" })).filter((x) => x.name === patch.name);
  } catch (e) { return ctx.toast(`대상을 찾지 못했어요: ${e?.message ?? e}`, { error: true }); }
  if (isMod && patch.namespace && cands.some((x) => x.ns === patch.namespace)) cands = cands.filter((x) => x.ns === patch.namespace);
  if (!cands.length) return ctx.toast(`'${patch.name}' 이름의 ${isMod ? "모듈" : "캐릭터"}를 찾지 못했어요. 목록에서 대상의 ⋯ 메뉴 → 패치 적용으로 골라 주세요.`, { error: true });
  let t = cands[0];
  if (cands.length > 1) {
    t = await modal(ctx.win, (done) => h("div", { class: "rb-dialog" }, h("h2", { class: "rb-h2" }, "어디에 적용할까요?"), h("p", { class: "rb-muted" }, `이름이 같은 ${isMod ? "모듈" : "캐릭터"}가 ${cands.length}개 있어요.`),
      h("div", { style: "display:flex;flex-direction:column;gap:8px;margin:12px 0" }, ...cands.map((c, n) => btn(`${c.name} (${n + 1}번째${isMod && c.ns ? " · " + c.ns : ""})`, { onClick: () => done(c) }))), btn("취소", { onClick: () => done(null) })));
    if (!t) return;
  }
  if (isMod) {
    const cur = async () => ((await ctx.svc.load()).entries.find((x) => x.module.id === t.id)?.module);
    await applyPatchFile(ctx, "module", async () => { const m = await cur(); if (!m) throw new Error("모듈을 다시 찾지 못했어요."); return m; }, async (res, c) => {
      await ctx.svc.run("update", t.id, changedKeys(c, res)); ctx.state.modDirty = true; ctx.refresh();
    }, file);
  } else {
    const full = async () => { const c = await ctx.api.getCharacterFromIndex(t.i); if (!c || c.chaId !== t.chaId) throw new Error("캐릭터를 다시 찾지 못했어요. 목록을 새로 고쳐 주세요."); return c; };
    await applyPatchFile(ctx, "character", full, async (res) => {
      if (isGenerating(await full())) throw new Busy();
      await ctx.api.setCharacterToIndex(t.i, res); ctx.state.charsDirty = true; ctx.refresh();
    }, file);
  }
}
