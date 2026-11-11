// 에셋 제작 창(애드온 sdstudio 전용): 개발 탭 버튼 줄 아래 '에셋 제작' → NovelAI로 만들고 → 고른 그림을 그 봇·모듈 에셋에 넣는다.
// 넣기는 기존 에셋 뒤에 덧붙이기만 한다(이름이 겹치면 번호). 원본 에셋은 건드리지 않는다.
import { h, replace } from "../dom.js";
import { btn, modal, segmented } from "../kit.js";
import { isStopError } from "../../engine/aistop.js";
import { isGenerating } from "../../engine/safety.js";
import { SIZES, assetSlotsOf, withAsset, uniqueAssetName } from "../../engine/sdstudio/nai.js";

var SLOT_KO = { additionalAssets: "추가 에셋", emotionImages: "감정 이미지", assets: "모듈 에셋" };

async function loadTarget(ctx, info) {
  if (info.kind === "module") {
    const m = (await ctx.svc.load({ fresh: true })).entries.find((e) => e.module.id === info.id)?.module;
    if (!m) throw new Error("모듈을 찾지 못했어요");
    return m;
  }
  const c = await ctx.api.getCharacterFromIndex(info.index);
  if (!c || c.chaId !== info.id) throw new Error("봇을 찾지 못했어요. 목록을 새로 고친 뒤 다시 해 주세요");
  return c;
}
async function saveTarget(ctx, info, next) {
  if (info.kind === "module") {
    await ctx.svc.run("update", info.id, { assets: next.assets });
    ctx.state.modDirty = true;
    return;
  }
  await ctx.api.setCharacterToIndex(info.index, next);
  ctx.state.charsDirty = true;
}

export async function openAssetMaker(ctx, info, sd) {
  let target;
  try { target = await loadTarget(ctx, info); } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); return; }
  const mem = ((ctx.state.sdstudio ??= {})[`${info.kind}:${info.id}`] ??= { prompt: "", size: "portrait", count: "1", slot: assetSlotsOf(info.kind)[0], name: "image" });
  const hasToken = !!(await sd.getToken());
  const urls = [];
  const results = [];   // { data, seed, url, on, el }
  let busy = false, abort = null;

  const tokenIn = h("input", { type: "password", class: "rb-input", placeholder: "pst-…", autocomplete: "off", id: "rb-sd-token" });
  const tokenBox = h("div", { style: "display:flex;flex-direction:column;gap:6px" },
    h("label", { class: "rb-label", for: "rb-sd-token" }, "NovelAI 토큰"), tokenIn,
    h("span", { class: "rb-muted", style: "white-space:normal" }, "NovelAI → 계정 설정 → 영구 API 토큰이에요. 이 기기에만 저장돼요."));
  tokenBox.hidden = hasToken;
  const tokenLine = h("div", { style: "display:flex;align-items:center;gap:8px" },
    h("span", { class: "rb-muted", style: "flex:1" }, "NovelAI 토큰 저장됨"),
    btn("바꾸기", { kind: "ghost", size: "sm", onClick: () => { tokenBox.hidden = false; tokenLine.hidden = true; tokenIn.focus(); } }));
  tokenLine.hidden = !hasToken;

  const promptIn = h("textarea", { class: "rb-textarea", rows: 3, placeholder: "예: 1girl, smile, school uniform, upper body", id: "rb-sd-prompt", "data-autofocus": "" });
  promptIn.value = mem.prompt;
  promptIn.addEventListener("input", () => { mem.prompt = promptIn.value; });
  const status = h("span", { class: "rb-muted", style: "white-space:normal;min-height:1em" });
  const grid = h("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px" });

  const nameIn = h("input", { type: "text", class: "rb-input", value: mem.name, id: "rb-sd-name" });
  nameIn.addEventListener("input", () => { mem.name = nameIn.value; });
  const slots = assetSlotsOf(info.kind);
  if (!slots.includes(mem.slot)) mem.slot = slots[0];
  const putBox = h("div", { style: "display:flex;flex-direction:column;gap:8px" },
    slots.length > 1 ? segmented(slots.map((s) => [s, SLOT_KO[s]]), mem.slot, (v) => { mem.slot = v; }, "넣을 자리") : null,
    h("label", { class: "rb-label", for: "rb-sd-name" }, "에셋 이름"), nameIn,
    h("span", { class: "rb-muted", style: "white-space:normal" }, "여러 장이거나 같은 이름이 있으면 뒤에 번호가 붙어요."));
  putBox.hidden = true;

  const picked = () => results.filter((r) => r.on);
  const genBtn = btn("만들기", { kind: "primary", icon: "image", id: "rb-sd-gen", onClick: () => generate() });
  genBtn.style.width = "100%";
  const putBtn = btn("넣기", { kind: "primary", id: "rb-sd-put", disabled: true, onClick: () => put() });
  const paintPick = () => {
    for (const r of results) { r.el.setAttribute("aria-pressed", r.on ? "true" : "false"); r.el.style.outline = r.on ? "2px solid var(--rb-acc)" : "none"; }
    const n = picked().length;
    putBtn.disabled = busy || !n;
    putBtn.querySelector("span").textContent = n > 1 ? `${n}장 넣기` : "넣기";
    putBox.hidden = !results.length;
  };
  const addResult = (r) => {
    r.url = URL.createObjectURL(new Blob([r.data], { type: "image/png" }));
    urls.push(r.url);
    r.on = true;
    r.el = h("button", { type: "button", class: "rb-sd-thumb", title: `시드 ${r.seed}`, style: "padding:0;border:var(--rb-bw,1px) solid var(--rb-line2);border-radius:var(--rb-r2);overflow:hidden;background:var(--rb-surf);cursor:pointer;aspect-ratio:2/3", onClick: () => { r.on = !r.on; paintPick(); } },
      h("img", { src: r.url, alt: "만든 그림", style: "width:100%;height:100%;object-fit:cover;display:block" }));
    results.push(r);
    grid.appendChild(r.el);
    paintPick();
  };

  async function generate() {
    if (busy) return;
    if (!tokenBox.hidden) {
      const v = tokenIn.value.trim();
      if (!v) { status.textContent = "토큰을 넣어 주세요."; tokenIn.focus(); return; }
      await sd.setToken(v);
      tokenBox.hidden = true; tokenLine.hidden = false;
    }
    if (!promptIn.value.trim()) { status.textContent = "프롬프트를 적어 주세요."; promptIn.focus(); return; }
    busy = true; genBtn.disabled = true; paintPick();
    abort = new AbortController();
    const n = Number(mem.count) || 1;
    let made = 0;
    try {
      for (let i = 0; i < n; i++) {
        status.textContent = n > 1 ? `만드는 중 ${i + 1}/${n}…` : "만드는 중…";
        addResult(await sd.generate({ prompt: promptIn.value, size: mem.size }, abort.signal));
        made++;
      }
      status.textContent = "넣을 그림을 골라요. 다시 누르면 고르기가 풀려요.";
    } catch (e) {
      status.textContent = isStopError(e) ? (made ? `${made}장 만들고 멈췄어요.` : "멈췄어요.") : `만들지 못했어요: ${e?.message ?? e}`;
      if (/토큰/.test(e?.message ?? "")) { tokenBox.hidden = false; tokenLine.hidden = true; }
    } finally {
      busy = false; genBtn.disabled = false; abort = null; paintPick();
    }
  }

  async function put() {
    const list = picked();
    if (!list.length || busy) return;
    busy = true; paintPick();
    try {
      status.textContent = "넣는 중…";
      let cur = await loadTarget(ctx, info);
      if (info.kind !== "module" && isGenerating(cur)) throw new Error("봇이 응답을 생성하는 중이에요. 끝난 뒤 다시 해 주세요");
      for (const r of list) {
        const path = await sd.saveAsset(r.data);
        cur = withAsset(cur, mem.slot, uniqueAssetName(cur, mem.slot, nameIn.value), path);
      }
      await saveTarget(ctx, info, cur);
      ctx.toast(`${SLOT_KO[mem.slot]}에 ${list.length}장을 넣었어요`);
      close?.(true);
    } catch (e) {
      status.textContent = `넣지 못했어요: ${e?.message ?? e}`;
      busy = false; paintPick();
    }
  }

  let close = null;
  await modal(ctx.win, (done) => {
    close = done;
    const box = h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "에셋 제작", style: "max-width:560px;max-height:calc(100vh - 32px);overflow:auto", id: "rb-sd-dialog" },
      h("h3", { class: "rb-h3" }, "에셋 제작"),
      h("span", { class: "rb-muted", style: "white-space:normal" }, `${target.name || "이름 없음"}의 ${info.kind === "module" ? "모듈" : "봇"} 에셋으로 넣을 그림을 NovelAI로 만들어요.`),
      tokenLine, tokenBox,
      h("label", { class: "rb-label", for: "rb-sd-prompt" }, "프롬프트"), promptIn,
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
        segmented(Object.entries(SIZES).map(([k, v]) => [k, v.label]), mem.size, (v) => { mem.size = v; }, "크기"),
        segmented([["1", "1장"], ["2", "2장"], ["4", "4장"]], mem.count, (v) => { mem.count = v; }, "장 수")),
      genBtn, status, grid, putBox,
      h("div", { class: "btns" }, btn("닫기", { kind: "ghost", onClick: () => done(null) }), putBtn));
    for (const el of box.children) el.style.flexShrink = "0";   // 창이 스크롤될 때 버튼·그림이 눌려 찌그러지지 않게
    return box;
  });
  abort?.abort();
  for (const u of urls) URL.revokeObjectURL(u);
  replace(grid);
}
