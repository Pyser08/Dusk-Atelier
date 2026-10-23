// 중복 에셋 찾기 (1.4.6)
// 같은 내용의 에셋을 묶어 보여 주고, 고른 것만 목록에서 뺀다. 자동으로 지우지 않는다.
import { mimeOf } from '../assets.js';
import { fmtBytes, h, replace } from '../dom.js';
import { btn, note, progressBar } from '../kit.js';

// 내용 해시: SHA-256(가능하면) → 안 되면 FNV-1a 두 벌 + 길이
async function hashBytes(u8) {
  try {
    if (globalThis.crypto?.subtle) {
      const d = new Uint8Array(await crypto.subtle.digest("SHA-256", u8));
      let s = "";
      for (const b of d) s += b.toString(16).padStart(2, "0");
      return s;
    }
  } catch {
  }
  let a = 2166136261, b = 16777619 ^ u8.length;
  for (let i = 0; i < u8.length; i++) {
    a = Math.imul(a ^ u8[i], 16777619) >>> 0;
    b = Math.imul(b ^ u8[u8.length - 1 - i], 2246822507) >>> 0;
  }
  return `f${a.toString(16)}${b.toString(16)}_${u8.length}`;
}

// assets: [name, path, ext][] → 같은 내용끼리 묶은 그룹 (2개 이상만)
export async function findDuplicateAssets(assets, read, onProgress) {
  const byPath = new Map();
  for (const a of assets) {
    if (!a?.[1]) continue;
    if (!byPath.has(a[1])) byPath.set(a[1], []);
    byPath.get(a[1]).push(a);
  }
  const paths = [...byPath.keys()];
  const hashOf = new Map(), sizeOf = new Map();
  let i = 0, done = 0, failed = 0;
  await Promise.all(Array.from({ length: Math.min(8, paths.length) }, async () => {
    while (i < paths.length) {
      const p = paths[i++];
      const d = await read(p).catch(() => null);
      if (d?.length) {
        hashOf.set(p, await hashBytes(d));
        sizeOf.set(p, d.length);
      } else failed++;
      onProgress?.(++done, paths.length);
    }
  }));
  const groups = new Map();
  for (const [p, list] of byPath) {
    // 같은 경로를 가리키면 내용이 같다 (읽기에 실패해도)
    const key = hashOf.get(p) ?? `path:${p}`;
    if (!groups.has(key)) groups.set(key, { key, size: sizeOf.get(p) ?? 0, items: [] });
    groups.get(key).items.push(...list);
  }
  return { groups: [...groups.values()].filter((g) => g.items.length > 1), failed };
}

// 남길 것 고르기: 이름이 가장 짧고 확장자가 없는 쪽을 기본으로 남긴다
function defaultKeep(items) {
  return [...items].sort((x, y) => /\.\w+$/.test(x[0]) - /\.\w+$/.test(y[0]) || x[0].length - y[0].length || x[0].localeCompare(y[0]))[0];
}

export function openDuplicateDialog(ctx, { assets, keyOf, onApply }) {
  const back = h("div", { class: "rb-modal" });
  const body = h("div", { style: "display:flex;flex-direction:column;gap:10px;max-height:min(60vh,560px);overflow:auto" });
  const bar = progressBar(0), txt = h("span", { class: "rb-muted" }, "에셋을 읽는 중…");
  const urls = [];
  const close = () => {
    back.remove();
    for (const u of urls) URL.revokeObjectURL(u);
  };
  const applyBtn = btn("고른 것 빼기", { kind: "danger", disabled: true });
  const dlg = h(
    "div",
    { class: "rb-dialog", role: "dialog", "aria-label": "중복 에셋 찾기", style: "width:min(640px,94vw)" },
    h("h3", { class: "rb-h3" }, "중복 에셋 찾기"),
    h("p", { class: "rb-p" }, "내용이 똑같은 에셋을 묶었어요. 체크한 이름만 목록에서 빠지고, 체크 안 한 이름은 남아요."),
    body,
    h("div", { class: "btns" }, btn("닫기", { onClick: close }), applyBtn)
  );
  back.appendChild(dlg);
  back.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  });
  ctx.win.appendChild(back);
  replace(body, bar, txt);
  const drop = /* @__PURE__ */ new Set();
  findDuplicateAssets(assets, (p) => ctx.assets.read(p, { prio: 50 }), (d, n) => {
    bar.set(d / n * 100);
    txt.textContent = `에셋을 읽는 중… ${d}/${n}`;
  }).then(({ groups, failed }) => {
    if (!groups.length) {
      replace(body, h("div", { class: "rb-empty" }, "중복 에셋이 없어요."), failed ? note("warn", `${failed}개는 파일을 읽지 못해 비교하지 못했어요.`) : null);
      return;
    }
    for (const g of groups) {
      const keep = defaultKeep(g.items);
      for (const a of g.items) if (a !== keep) drop.add(keyOf(a));
    }
    // 같은 파일을 가리키는 이름은 빼도 용량이 줄지 않는다 → 서로 다른 파일 수로 센다
    const saved = groups.reduce((n, g) => n + g.size * (new Set(g.items.map((a) => a[1])).size - 1), 0);
    const count = () => {
      applyBtn.disabled = !drop.size;
      applyBtn.querySelector("span").textContent = drop.size ? `고른 것 빼기 (${drop.size})` : "고른 것 빼기";
    };
    const thumb = (a) => {
      const im = h("img", { alt: "", style: "width:56px;height:56px;object-fit:cover;border-radius:10px;background:var(--rb-surf2);flex-shrink:0" });
      ctx.assets.read(a[1], { prio: 40 }).then((d) => {
        if (!d || !back.isConnected) return;
        const u = URL.createObjectURL(new Blob([d], { type: mimeOf(a[2], d) }));
        urls.push(u);
        im.src = u;
      }).catch(() => {
      });
      return im;
    };
    replace(
      body,
      note("info", `${groups.length}묶음${saved ? ` · 정리하면 ${fmtBytes(saved)} 정도 줄어요` : ""}. 본문·정규식·Lua에서 빼는 이름을 쓰고 있다면 남기는 이름으로 바꿔 주세요.`),
      failed ? note("warn", `${failed}개는 파일을 읽지 못해 비교에서 빠졌어요.`) : null,
      groups.map((g) => h(
        "div",
        { class: "rb-card pad", style: "display:flex;gap:12px;align-items:flex-start" },
        thumb(g.items[0]),
        h(
          "div",
          { style: "flex:1;min-width:0;display:flex;flex-direction:column;gap:4px" },
          h("span", { class: "rb-muted" }, `${g.items.length}개 · ${g.size ? fmtBytes(g.size) : "크기 모름"}`),
          g.items.map((a) => {
            const k = keyOf(a);
            const cb = h("input", { type: "checkbox", checked: drop.has(k), onChange: () => {
              if (cb.checked) drop.add(k);
              else drop.delete(k);
              // 한 묶음을 다 빼면 그 내용이 사라지니 막는다
              if (g.items.every((x) => drop.has(keyOf(x)))) {
                drop.delete(k);
                cb.checked = false;
                ctx.toast("묶음마다 하나는 남겨야 해요");
              }
              count();
            } });
            return h("label", { style: "display:flex;align-items:center;gap:8px;min-width:0" }, cb, h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, a[0]));
          })
        )
      ))
    );
    count();
  }).catch((err) => replace(body, note("err", `중복을 찾지 못했어요: ${err?.message ?? err}`)));
  applyBtn.addEventListener("click", async () => {
    if (!drop.size) return;
    applyBtn.disabled = true;
    try {
      await onApply(new Set(drop));
      close();
    } catch (err) {
      applyBtn.disabled = false;
      ctx.toast(`정리하지 못했어요: ${err?.message ?? err}`, { error: true });
    }
  });
}
