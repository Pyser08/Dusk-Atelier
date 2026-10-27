// 업데이트 뒤 처음 열 때 "새로 바뀐 점" 창. 내용은 빌드 때 CHANGELOG.md에서 넣는다 (__CHANGELOG__)
import { h } from './dom.js';
import { btn, modal } from './kit.js';

var KEY = "rbm:seenVersion:v1";
var LOG = typeof __CHANGELOG__ !== "undefined" ? __CHANGELOG__ : [];
export var CHANGELOG = LOG;

function cmp(a, b) {
  const x = String(a).split(".").map((n) => parseInt(n, 10) || 0), y = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

// **굵게**, `코드`만 처리 (나머지는 글자 그대로)
function inline(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let i = 0, m;
  while (m = re.exec(text)) {
    if (m.index > i) out.push(text.slice(i, m.index));
    out.push(m[1] !== void 0 ? h("b", null, m[1]) : h("code", { class: "rb-wn-code" }, m[2]));
    i = re.lastIndex;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}
function body(md) {
  const els = [];
  for (const raw of md.split("\n")) {
    if (!raw.trim()) continue;
    const head = /^#{3,}\s+(.*)/.exec(raw);
    if (head) {
      els.push(h("div", { class: "rb-wn-h" }, inline(head[1])));
      continue;
    }
    const li = /^(\s*)[-*]\s+(.*)/.exec(raw);
    if (li) {
      const depth = Math.min(3, Math.floor(li[1].length / 2));
      els.push(h("div", { class: "rb-wn-li", style: `margin-left:${depth * 16}px` }, h("span", { class: "rb-wn-dot" }, depth ? "◦" : "•"), h("span", null, inline(li[2]))));
      continue;
    }
    els.push(h("div", { class: "rb-wn-p" }, inline(raw.trim())));
  }
  return els;
}

var CSS = `.rb-wn{width:min(620px,calc(100vw - 32px));max-height:min(78vh,720px);display:flex;flex-direction:column;background:var(--rb-surf);color:var(--rb-text);border:1px solid var(--rb-line);border-radius:16px;box-shadow:0 20px 60px rgb(0 0 0/.45);overflow:hidden}
.rb-wn-top{padding:18px 20px 12px;border-bottom:1px solid var(--rb-line)}
.rb-wn-top b{font-size:17px}
.rb-wn-scroll{overflow:auto;padding:6px 20px 16px;font-size:13.5px;line-height:1.7}
.rb-wn-ver{display:flex;align-items:baseline;gap:8px;margin:16px 0 4px;font-weight:800;font-size:15px}
.rb-wn-ver small{font-weight:500;opacity:.6;font-size:12px}
.rb-wn-h{margin:10px 0 2px;font-weight:700;opacity:.85}
.rb-wn-li{display:flex;gap:7px;margin:3px 0;word-break:keep-all;overflow-wrap:anywhere}
.rb-wn-dot{flex:none;opacity:.6}
.rb-wn-p{margin:4px 0}
.rb-wn-code{font-family:ui-monospace,Consolas,monospace;font-size:.9em;padding:0 4px;border-radius:4px;background:var(--rb-line)}
.rb-wn-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--rb-line)}`;
var cssDone = false;

export function openChangelog(ctx, entries = LOG.slice(0, 1), title = "새로 바뀐 점") {
  if (!entries.length) return Promise.resolve();
  if (!cssDone) {
    ctx.win.ownerDocument.head.appendChild(h("style", null, CSS));
    cssDone = true;
  }
  return modal(ctx.win, (done) => h("div", { class: "rb-wn", role: "dialog", "aria-label": title },
    h("div", { class: "rb-wn-top" }, h("b", null, `✨ ${title}`), h("div", { class: "rb-muted", style: "font-size:12px;margin-top:2px" }, `Dusk Atelier v${ctx.version}`)),
    h("div", { class: "rb-wn-scroll" }, ...entries.flatMap((e) => [h("div", { class: "rb-wn-ver" }, `v${e.v}`, e.date ? h("small", null, e.date) : null), ...body(e.body)])),
    h("div", { class: "rb-wn-foot" }, btn("확인", { kind: "primary", onClick: () => done(true) }))));
}

// 열 때마다 부른다. 처음 설치면 기록만 하고, 버전이 올라갔으면 그 사이 변경점을 한 번 보여 준다
export async function maybeShowWhatsNew(ctx) {
  const cur = ctx.version;
  if (!cur || cur === "dev") return;
  let seen = null;
  try {
    seen = await ctx.api.pluginStorage.getItem(KEY);
  } catch {
  }
  const save = () => ctx.api.pluginStorage.setItem(KEY, cur).catch(() => {});
  if (!seen) {
    await save();
    return true; // 처음 설치(또는 다시 설치): 처음 둘러보기를 보여 줄 대상
  }
  if (cmp(cur, seen) <= 0) return;
  const entries = LOG.filter((e) => cmp(e.v, seen) > 0 && cmp(e.v, cur) <= 0);
  await save();
  if (entries.length) await openChangelog(ctx, entries, `v${seen} → v${cur} 새로 바뀐 점`);
}
