// 에셋 제작 — 그림 크게 보기(라이트박스)·이미지 월드컵·인페인트 붓·변형/디렉터 도구 창. SDStudio ResultViewer·Tournament·InPaintEditor 대응.
import { h, replace, download } from "../../dom.js";
import { btn, modal, segmented, confirmDialog, openMenu, switchEl } from "../../kit.js";
import { AUGMENTS, EMOTIONS, upscaleCost, pngSize } from "../../../engine/sdstudio/nai.js";
import * as P from "../../../engine/sdstudio/project.js";
import { promptArea } from "./left.js";
import { ico } from "./look.js";

var copy = async (S, text, what) => { try { await navigator.clipboard.writeText(String(text)); S.toast(`${what}을 복사했어요`); } catch { S.toast("복사하지 못했어요", { error: true }); } };

// items: [{ cid, sid, path }]
export function openLightbox(S, items, index = 0) {
  let i = Math.max(0, Math.min(items.length - 1, index)), url = null;
  const img = h("img", { alt: "크게 보기", id: "sds-lb-img" });
  const stage = h("div", { class: "stage" }, img);
  const info = h("aside", { class: "info", id: "sds-lb-info" });
  const navL = h("button", { type: "button", class: "nav", style: "left:12px", "aria-label": "이전 그림", onClick: () => go(-1) }, ico("chevL", 22));
  const navR = h("button", { type: "button", class: "nav", style: "right:12px", "aria-label": "다음 그림", onClick: () => go(1) }, ico("chevR", 22));
  stage.append(navL, navR);
  const head = h("div", { class: "rb-full-head", style: "min-height:52px" });
  const over = h("div", { class: "sds-over", role: "dialog", "aria-label": "그림 크게 보기", id: "sds-lightbox", tabIndex: -1 }, head, h("div", { class: "sds-lb" }, stage, info));
  const close = () => { if (url) URL.revokeObjectURL(url); over.remove(); S.paintBody(); };
  const go = (d) => { if (!items.length) return; i = (i + d + items.length) % items.length; paint(); };
  const cur = () => items[i];
  const meta = () => { const it = cur(); const sc = P.sceneOf(S.proj, it.cid, it.sid); return { it, sc, c: P.charOf(S.proj, it.cid), im: sc?.images.find((x) => x.path === it.path) }; };
  async function paint() {
    const { it, sc, c, im } = meta();
    if (!im) { items.splice(i, 1); if (!items.length) return close(); i = Math.min(i, items.length - 1); return paint(); }
    navL.hidden = navR.hidden = items.length < 2;
    replace(head, h("button", { type: "button", class: "rb-icon-btn", "aria-label": "닫기", onClick: close }, ico("x", 20)),
      h("div", { class: "ttl" }, h("small", null, `${c.name} › ${sc.name}`), h("b", null, `${i + 1} / ${items.length}`)));
    const isCover = P.coverOf(sc) === im.path && !!sc.cover;
    const act = (label, icn, fn, opts = {}) => btn(label, { size: "sm", icon: icn, ...opts, onClick: fn });
    replace(info,
      h("div", { style: "display:flex;gap:8px;align-items:center" },
        h("button", { type: "button", class: ["sds-ib", im.fav && "on"], id: "sds-lb-fav", title: "즐겨찾기 (F)", "aria-pressed": String(im.fav), onClick: () => toggleFav() }, ico("star", 18)),
        h("b", { style: "flex:1" }, im.rank ? `${im.rank}위` : im.fav ? "즐겨찾기" : ""),
        im.from ? h("span", { class: "rb-badge" }, { img2img: "변형", infill: "인페인트", upscale: "업스케일" }[im.from] ?? AUGMENTS[im.from] ?? im.from) : null),
      h("div", { class: "sds-acts" },
        act("봇에 넣기", "download", () => S.putPaths([im.path], sc.name), { kind: "primary", id: "sds-lb-put" }),
        act(isCover ? "씬 대표" : "씬 대표로", "check", () => { S.set(P.updateScene(S.proj, it.cid, it.sid, { cover: im.path })); paint(); }, { disabled: isCover }),
        act("캐릭터 대표로", "character", () => { S.set(P.updateChar(S.proj, it.cid, { cover: im.path })); S.toast("캐릭터 카드 대표로 했어요"); })),
      h("div", { class: "sds-acts" },
        act("변형", "refresh", () => derive("img2img")),
        act("인페인트", "brush", () => openInpaint(S, it, im)),
        act("업스케일", "size", () => derive("upscale")),
        act("디렉터 도구", "sparkle", (e) => openMenu(S.ctx.win, e.currentTarget, Object.entries(AUGMENTS).map(([k, t]) => ({ label: t, onClick: () => derive(k) }))))),
      h("div", { class: "sds-acts" },
        act("비교에 넣기", "split", () => { S.addCompare(it); S.toast("비교 모드에 넣었어요"); }),
        act("이 시드로 고정", "zap", () => { if (!im.seed) return; S.set(P.setSettings(S.proj, { seed: { mode: "fixed", value: im.seed } })); S.paintLeft(); S.toast(`시드 ${im.seed}로 고정했어요`); }, { disabled: !im.seed }),
        act("내려받기", "download", async () => download(`${c.name}_${sc.name}_${i + 1}.png`, new Blob([await S.bytes(im.path)], { type: "image/png" }))),
        act("목록에서 빼기", "trash", () => remove(), { kind: "danger" })),
      h("div", { style: "display:flex;gap:8px;align-items:center;font-size:13px" }, h("span", { class: "rb-muted" }, "시드"), h("b", { style: "flex:1" }, im.seed ?? "-"), im.seed ? btn("복사", { size: "sm", kind: "ghost", onClick: () => copy(S, im.seed, "시드") }) : null),
      im.w ? h("div", { class: "rb-muted", style: "font-size:13px" }, `${im.w}×${im.h}`) : null,
      im.prompt ? h("div", { style: "display:flex;flex-direction:column;gap:6px" }, h("div", { style: "display:flex;align-items:center" }, h("span", { class: "rb-label", style: "flex:1" }, "프롬프트"), btn("복사", { size: "sm", kind: "ghost", onClick: () => copy(S, im.prompt, "프롬프트") })), h("pre", null, im.prompt)) : null);
    for (const el of info.children) el.style.flexShrink = "0";
    if (!over.contains(document.activeElement)) over.focus({ preventScroll: true });   // 창이 닫히며 돌려준 버튼이 사라져도 키(← → Esc)가 먹게
    try { const u = await S.url(im.path); if (cur()?.path !== im.path) { URL.revokeObjectURL(u); return; } if (url) URL.revokeObjectURL(url); url = u; img.src = u; } catch { img.removeAttribute("src"); }
  }
  function toggleFav() { const { it, im } = meta(); S.set(P.setImage(S.proj, it.cid, it.sid, im.path, { fav: !im.fav })); paint(); }
  async function remove() {
    const { it } = meta();
    if (!await confirmDialog(S.ctx.win, { title: "목록에서 뺄까요?", body: "이 화면 목록에서만 빠져요. 리스 에셋 저장소 파일과 이미 봇에 넣은 에셋은 그대로예요.", ok: "빼기", danger: true })) return;
    S.set(P.removeImages(S.proj, it.cid, it.sid, [it.path]));
    items.splice(i, 1);
    if (!items.length) return close();
    i = Math.min(i, items.length - 1); paint();
  }
  async function derive(kind) {
    const { it, sc, im } = meta();
    const opts = kind === "img2img" ? await i2iDialog(S, im, sc) : kind === "upscale" ? await upscaleDialog(S, im) : AUGMENTS[kind] ? await augmentDialog(S, kind) : null;
    if (!opts) return;
    const made = await S.derive(it, kind, opts);
    if (made) { items.splice(i, 0, { cid: it.cid, sid: it.sid, path: made }); paint(); }
  }
  over.addEventListener("keydown", (e) => {
    if (S.ctx.win.querySelector(".rb-modal, .rb-menu")) return;
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "f" || e.key === "F") toggleFav();
    else if (e.key === "Delete") remove();
  });
  S.el.appendChild(over);
  over.focus();
  paint();
}

async function i2iDialog(S, im, sc) {
  let strength = 0.7, noise = 0;
  const pa = promptArea({ value: im.prompt || "", rows: 4, label: "변형 프롬프트" });
  const sv = h("span", { class: "rb-muted" }, `세기 ${strength}`), nv = h("span", { class: "rb-muted" }, `노이즈 ${noise}`);
  return modal(S.ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-label": "변형", style: "max-width:520px" },
    h("h3", { class: "rb-h3" }, "이미지 변형(img2img)"),
    h("span", { class: "rb-muted", style: "white-space:normal" }, `이 그림을 바탕으로 다시 그려요. 결과는 ‘${sc.name}’ 씬에 더해져요.`),
    h("span", { class: "rb-label" }, "프롬프트"), pa,
    sv, h("input", { type: "range", min: 0.01, max: 0.99, step: 0.01, value: strength, onInput: (e) => { strength = Number(e.target.value); sv.textContent = `세기 ${strength}`; } }),
    nv, h("input", { type: "range", min: 0, max: 0.99, step: 0.01, value: noise, onInput: (e) => { noise = Number(e.target.value); nv.textContent = `노이즈 ${noise}`; } }),
    h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn("변형", { kind: "primary", id: "sds-i2i-ok", onClick: () => done({ strength, noise, prompt: pa.textarea.value }) }))));
}
async function upscaleDialog(S, im) {
  let cost = null;
  try { const sz = pngSize(await S.bytes(im.path)); cost = upscaleCost(sz.width, sz.height); } catch (e) { S.toast(e?.message ?? String(e), { error: true }); return null; }
  return (await confirmDialog(S.ctx.win, { title: "2배로 키울까요?", body: `NovelAI 업스케일은 Anlas ${cost}가 들어요(서버가 최종 결정). 결과는 같은 씬에 더해져요.`, ok: "업스케일" })) ? {} : null;
}
async function augmentDialog(S, kind) {
  if (kind !== "colorize" && kind !== "emotion") return (await confirmDialog(S.ctx.win, { title: `${AUGMENTS[kind]}`, body: "NovelAI 디렉터 도구로 이 그림을 바꿔요. 결과는 같은 씬에 더해져요. Anlas가 들 수 있어요.", ok: "하기" })) ? {} : null;
  let emotion = "happy", defry = 0;
  const pin = h("input", { class: "rb-input", placeholder: kind === "emotion" ? "더할 말(선택)" : "예: red hair, blue eyes" });
  return modal(S.ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-label": AUGMENTS[kind], style: "max-width:480px" },
    h("h3", { class: "rb-h3" }, AUGMENTS[kind]),
    kind === "emotion" ? h("select", { class: "rb-input", id: "sds-emotion", onChange: (e) => { emotion = e.target.value; } }, ...EMOTIONS.map((x) => h("option", { value: x, selected: x === emotion }, x))) : null,
    pin,
    h("span", { class: "rb-label" }, "약하게(0~5)"), segmented([0, 1, 2, 3, 4, 5].map((x) => [String(x), String(x)]), "0", (v) => { defry = Number(v); }, "약하게"),
    h("div", { class: "btns" }, btn("취소", { kind: "ghost", onClick: () => done(null) }), btn("하기", { kind: "primary", onClick: () => done({ emotion, prompt: pin.value, defry }) }))));
}

// 인페인트: 그림 위에 붓으로 칠한 곳만 다시 그림
export async function openInpaint(S, it, im) {
  const src = await S.bytes(im.path);
  const sz = pngSize(src) ?? { width: im.w || 832, height: im.h || 1216 };
  const base = new Image();
  const u = URL.createObjectURL(new Blob([src], { type: "image/png" }));
  await new Promise((r) => { base.onload = r; base.onerror = r; base.src = u; });
  const view = h("canvas", { width: sz.width, height: sz.height, id: "sds-inpaint-canvas", style: "cursor:crosshair" });
  const mask = Object.assign(document.createElement("canvas"), { width: sz.width, height: sz.height });
  const vctx = view.getContext("2d"), mctx = mask.getContext("2d");
  let brush = 64, erase = false, strength = 1, keep = true, drawing = false, last = null;
  const redraw = () => { vctx.clearRect(0, 0, sz.width, sz.height); vctx.drawImage(base, 0, 0, sz.width, sz.height); vctx.globalAlpha = 0.45; vctx.drawImage(mask, 0, 0); vctx.globalAlpha = 1; };
  const pt = (e) => { const r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) * (sz.width / r.width), y: (e.clientY - r.top) * (sz.height / r.height) }; };
  const stroke = (a, b) => { mctx.globalCompositeOperation = erase ? "destination-out" : "source-over"; mctx.strokeStyle = "#ff3b6b"; mctx.lineWidth = brush; mctx.lineCap = "round"; mctx.beginPath(); mctx.moveTo(a.x, a.y); mctx.lineTo(b.x, b.y); mctx.stroke(); redraw(); };
  view.addEventListener("pointerdown", (e) => { drawing = true; last = pt(e); view.setPointerCapture?.(e.pointerId); stroke(last, last); });
  view.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pt(e); stroke(last, p); last = p; });
  view.addEventListener("pointerup", () => { drawing = false; });
  redraw();
  const pa = promptArea({ value: im.prompt || "", rows: 3, label: "인페인트 프롬프트" });
  const bl = h("span", { class: "rb-muted" }, `붓 ${brush}`);
  const res = await new Promise((resolve) => {
    const over = h("div", { class: "sds-over", role: "dialog", "aria-label": "인페인트", id: "sds-inpaint" },
      h("div", { class: "rb-full-head" }, h("button", { type: "button", class: "rb-icon-btn", "aria-label": "닫기", onClick: () => { over.remove(); resolve(null); } }, ico("x", 20)), h("div", { class: "ttl" }, h("small", null, "인페인트"), h("b", null, "다시 그릴 곳을 칠해요"))),
      h("div", { class: "sds-lb" }, h("div", { class: "sds-paint" }, view),
        h("aside", { class: "info" },
          bl, h("input", { type: "range", min: 8, max: 256, value: brush, onInput: (e) => { brush = Number(e.target.value); bl.textContent = `붓 ${brush}`; } }),
          segmented([["paint", "칠하기"], ["erase", "지우개"]], "paint", (v) => { erase = v === "erase"; }, "붓"),
          btn("칠한 것 모두 지우기", { size: "sm", kind: "ghost", onClick: () => { mctx.clearRect(0, 0, sz.width, sz.height); redraw(); } }),
          h("span", { class: "rb-label" }, "프롬프트"), pa,
          h("span", { class: "rb-label" }, "세기"), h("input", { type: "range", min: 0.01, max: 1, step: 0.01, value: strength, onInput: (e) => { strength = Number(e.target.value); } }),
          switchEl(keep, { label: "칠하지 않은 곳은 그대로 두기", onChange: (v) => { keep = v; } }),
          btn("인페인트", { kind: "primary", id: "sds-inpaint-ok", onClick: async () => {
            const out = Object.assign(document.createElement("canvas"), { width: sz.width, height: sz.height }), o = out.getContext("2d");
            o.fillStyle = "#000"; o.fillRect(0, 0, sz.width, sz.height);
            const tmp = Object.assign(document.createElement("canvas"), { width: sz.width, height: sz.height }), t = tmp.getContext("2d");
            t.drawImage(mask, 0, 0); t.globalCompositeOperation = "source-in"; t.fillStyle = "#fff"; t.fillRect(0, 0, sz.width, sz.height);
            o.drawImage(tmp, 0, 0);
            const blob = await new Promise((r) => out.toBlob(r, "image/png"));
            over.remove(); resolve({ mask: new Uint8Array(await blob.arrayBuffer()), prompt: pa.textarea.value, strength, keep });
          } }))));
    for (const el of over.querySelector(".info").children) el.style.flexShrink = "0";
    S.el.appendChild(over);
  });
  URL.revokeObjectURL(u);
  if (res) await S.derive(it, "infill", res);
}

// 이미지 월드컵: 한 씬의 그림으로 토너먼트 → 순위(1위 = 대표)
export async function openCup(S, cid, sid) {
  const sc = P.sceneOf(S.proj, cid, sid);
  if (!sc || sc.images.length < 2) { S.toast("그림이 2장 이상 있어야 해요"); return; }
  let g = P.startCup(sc.images.map((i) => i.path));
  const urls = [];
  const head = h("div", { class: "rb-full-head" });
  const pair = h("div", { class: "pair" });
  const over = h("div", { class: "sds-over", role: "dialog", "aria-label": "이미지 월드컵", id: "sds-cup", tabIndex: -1 }, head, h("div", { class: "sds-cup" }, pair, h("div", { class: "rb-muted", style: "text-align:center;padding:0 0 14px" }, "더 마음에 드는 쪽을 눌러요 · ← → 키")));
  const close = (applied) => { for (const u of urls) URL.revokeObjectURL(u); over.remove(); if (applied) S.paintBody(); };
  const pick = (side) => { g = P.cupPick(g, side); paint(); };
  async function paint() {
    if (P.cupDone(g)) {
      S.set(P.updateScene(P.applyCup(S.proj, cid, sid, g.ranks), cid, sid, { cover: Object.keys(g.ranks).find((k) => g.ranks[k] === 1) ?? "" }));
      S.toast("순위를 매겼어요. 1위가 씬 대표가 됐어요");
      return close(true);
    }
    const [a, b] = P.cupPair(g);
    const done = (g.at / 2) + 1, total = Math.floor(g.players.length / 2);
    replace(head, h("button", { type: "button", class: "rb-icon-btn", "aria-label": "그만하기", onClick: () => close(false) }, ico("x", 20)),
      h("div", { class: "ttl" }, h("small", null, `이미지 월드컵 · ${sc.name}`), h("b", null, `${P.cupRoundLabel(g)} ${done}/${total}`)));
    const mk = async (path, side) => { const b2 = h("button", { type: "button", "aria-label": side ? "오른쪽 고르기" : "왼쪽 고르기", class: "sds-cup-pick", onClick: () => pick(side) }); try { const u = await S.url(path); urls.push(u); b2.append(h("img", { src: u, alt: "" })); } catch { /* 못 읽음 */ } return b2; };
    replace(pair, await mk(a, 0), await mk(b, 1));
    if (!over.contains(document.activeElement)) over.focus({ preventScroll: true });
  }
  over.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(false); } else if (e.key === "ArrowLeft") pick(0); else if (e.key === "ArrowRight") pick(1); });
  S.el.appendChild(over);
  over.focus();
  paint();
}
