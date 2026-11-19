// 갈래 보기 탭(장기기억 애드온 전용): 같은 봇의 채팅들을 분기 관계로 이은 나무 + 두 갈래의 인물 호감 비교.
// 고치지 않고 보기만 한다. 분기 원본은 engine/branchtree.js가 기억 폴더(adoptedFrom)·위키(forkedFrom)에서 읽는다.
import { h, replace } from "../dom.js";
import { emptyState, loading, pageHead } from "../kit.js";
import { loadUserName } from "./memory/username.js";
import { buildBranchTree, compareBranches, flattenTree } from "../../engine/branchtree.js";

export const BRANCH_CSS = `.rb-br{display:flex;flex-direction:column;gap:12px}
.rb-br-app{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}@media (max-width:820px){.rb-br-app{grid-template-columns:1fr}}
.rb-br-tree{display:flex;flex-direction:column;gap:2px;padding:8px}
.rb-br-row{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 10px;border:1px solid transparent;border-radius:12px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background .18s var(--rb-ease-out,ease),border-color .18s var(--rb-ease-out,ease)}
.rb-br-row:hover{background:var(--rb-surf2)}.rb-br-row.is-a{border-color:var(--rb-acc);background:color-mix(in srgb,var(--rb-acc) 10%,transparent)}.rb-br-row.is-b{border-color:var(--rb-blue);background:color-mix(in srgb,var(--rb-blue) 10%,transparent)}
.rb-br-rail{display:inline-block;flex:none;width:18px;align-self:stretch;position:relative}.rb-br-rail.v::before,.rb-br-rail.j::before{content:"";position:absolute;left:8px;top:-6px;bottom:-6px;border-left:2px solid var(--rb-line)}.rb-br-rail.j.last::before{bottom:50%}.rb-br-rail.j::after{content:"";position:absolute;left:8px;right:0;top:50%;border-top:2px solid var(--rb-line)}
.rb-br-dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--rb-sub)}.rb-br-row.is-cur .rb-br-dot{background:var(--rb-acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--rb-acc) 25%,transparent)}
.rb-br-t{display:flex;flex-direction:column;min-width:0;flex:1}.rb-br-t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rb-br-t small{color:var(--rb-sub);font-size:12px}
.rb-br-tag{flex:none;font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--rb-surf2)}.rb-br-tag.a{color:var(--rb-acc)}.rb-br-tag.b{color:var(--rb-blue)}
.rb-br-cmp{padding:12px 14px;display:flex;flex-direction:column;gap:10px}.rb-br-cmp h3{margin:0;font-size:14px}.rb-br-cmp p{margin:0;color:var(--rb-sub);font-size:12px}
.rb-br-p{display:grid;grid-template-columns:minmax(64px,auto) 1fr auto;align-items:center;gap:4px 10px;font-size:13px}
.rb-br-bars{display:flex;flex-direction:column;gap:3px}.rb-br-bar{height:6px;border-radius:3px;background:color-mix(in srgb,currentColor 10%,transparent);overflow:hidden}.rb-br-bar i{display:block;height:100%;border-radius:3px;transition:width .3s var(--rb-ease-out,ease)}
.rb-br-bar.a i{background:var(--rb-acc)}.rb-br-bar.b i{background:var(--rb-blue)}
.rb-br-d{font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;min-width:38px;text-align:right}.rb-br-d.up{color:var(--rb-rose)}.rb-br-d.down{color:var(--rb-blue)}`;

function ensureCss(ctx) {
  try {
    const docs = new Set([ctx?.win?.ownerDocument, typeof document !== "undefined" ? document : null].filter(Boolean));
    for (const d of docs) if (!d.getElementById("rb-branch-css")) d.head.appendChild(h("style", { id: "rb-branch-css" }, BRANCH_CSS));
  } catch { /* 문서 없음 */ }
}

const MAX_CHATS = 40;

export async function renderBranches(ctx) {
  const M = ctx.memory, st = (ctx.state.branches ??= {});
  if (!M) return replace(ctx.main, h("div", { class: "rb-empty" }, "기억 기능이 아직 준비되지 않았어요. 플러그인을 다시 불러와 주세요."));
  ensureCss(ctx);
  const cur = await (M.switches.peekCurrent ? M.switches.peekCurrent({}) : M.switches.currentChat());
  if (!cur) return replace(ctx.main, h("div", { class: "rb-br" }, pageHead("갈래 보기"), emptyState({ icon: "users", title: "열린 채팅이 없어요", text: "채팅을 열면 그 봇의 채팅 갈래를 보여 줘요." })));
  replace(ctx.main, h("div", { class: "rb-br" }, loading("갈래를 불러오는 중")));
  const uname = await loadUserName(ctx).catch(() => "") || "나";
  const list = (await M.store.botFolders(cur.chaId).catch(() => [])).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, MAX_CHATS);
  const folders = (await Promise.all(list.map((f) => M.store.getFolder(String(cur.chaId), String(f.chatId)).then((x) => x && { ...x, updatedAt: f.updatedAt }).catch(() => null)))).filter(Boolean);
  if (ctx.state.tab !== "branches") return;
  const tree = buildBranchTree(folders, { names: { [String(cur.chatId)]: cur.chatName }, current: String(cur.chatId) });
  const head = pageHead("갈래 보기", { sub: `${cur.botName ?? ""} · 채팅 ${folders.length}개` });
  if (!tree.branched) {
    return replace(ctx.main, h("div", { class: "rb-br", "data-page": "branches" }, head, emptyState({ icon: "split", title: "아직 갈라진 채팅이 없어요", text: "리스에서 채팅을 분기·복사하면 여기에 갈래 나무가 생겨요. 분기 기억 이어받기가 켜져 있어야 이어진 갈래로 알아봐요.", actions: [{ label: "장기 기억 열기", icon: "brain", onClick: () => ctx.go("memory") }] })));
  }
  // 처음 고르기: 지금 채팅(B)과 그 부모(A). 부모가 없으면 첫 자식과 비교.
  const me = tree.byId[String(cur.chatId)];
  if (!tree.byId[st.a] || !tree.byId[st.b]) {
    st.a = me?.parent || tree.roots[0]?.id || ""; st.b = me?.parent ? me.id : (me?.children[0]?.id ?? tree.roots[0]?.children[0]?.id ?? "");
  }
  const treeEl = h("div", { class: "rb-card bordered rb-br-tree", role: "list", "aria-label": "채팅 갈래" });
  const cmpEl = h("div", { class: "rb-card bordered rb-br-cmp", "aria-live": "polite" });
  let pickNext = "b";
  const paint = () => {
    replace(treeEl, ...flattenTree(tree.roots).map(rowOf));
    paintCompare();
  };
  function rowOf({ node: n, depth, rails, last }) {
    const side = n.id === st.a ? "a" : n.id === st.b ? "b" : "";
    const railEls = rails.slice(1).map((v) => h("span", { class: ["rb-br-rail", v && "v"], "aria-hidden": "true" }));
    if (depth > 0) railEls.push(h("span", { class: ["rb-br-rail", "j", last && "last"], "aria-hidden": "true" }));
    const sub = [n.turns ? `응답 ${n.turns}개` : "기록 없음", n.parent ? (n.forkAt >= 0 ? `#${n.forkAt + 1} 뒤에 갈라짐` : "갈라진 지점 모름") : "", `인물 ${n.people.length}명`].filter(Boolean).join(" · ");
    return h("button", { type: "button", role: "listitem", class: ["rb-br-row", side && `is-${side}`, n.current && "is-cur"], dataset: { id: n.id }, "aria-pressed": side ? "true" : "false", onClick: () => pick(n.id) },
      ...railEls, h("span", { class: "rb-br-dot", "aria-hidden": "true" }),
      h("span", { class: "rb-br-t" }, h("b", null, n.name), h("small", null, sub)),
      n.current ? h("span", { class: "rb-br-tag" }, "지금") : null,
      side ? h("span", { class: ["rb-br-tag", side] }, side === "a" ? "A" : "B") : null);
  }
  function pick(id) {
    if (id === st.a || id === st.b) return;
    st[pickNext] = id; pickNext = pickNext === "a" ? "b" : "a";
    paint();
  }
  function paintCompare() {
    const A = tree.byId[st.a], B = tree.byId[st.b];
    if (!A || !B) return replace(cmpEl, h("h3", null, "두 갈래를 골라 주세요"), h("p", null, "나무에서 채팅을 누르면 A·B 순서로 바뀌어요."));
    const rows = compareBranches(A, B);
    const pct = (v) => `${v == null ? 0 : v}%`;
    replace(cmpEl,
      h("h3", null, "갈래별 호감 비교"),
      h("p", null, `A ${A.name} ↔ B ${B.name} · 인물이 ${uname}에게 느끼는 호감(0~100). 채팅을 누르면 비교 대상이 바뀌어요.`),
      ...(rows.length ? rows.map((r) => {
        const d = r.diff;
        return h("div", { class: "rb-br-p" },
          h("b", null, r.name),
          h("span", { class: "rb-br-bars" },
            h("span", { class: "rb-br-bar a", title: `A ${r.a ?? "없음"}` }, h("i", { style: `width:${pct(r.a)}` })),
            h("span", { class: "rb-br-bar b", title: `B ${r.b ?? "없음"}` }, h("i", { style: `width:${pct(r.b)}` }))),
          h("span", { class: ["rb-br-d", d > 0 && "up", d < 0 && "down"] }, d == null ? (r.a == null ? "B만" : "A만") : d > 0 ? `+${d}` : String(d)));
      }) : [h("p", null, "두 갈래 모두 아직 기록된 인물이 없어요.")]));
  }
  paint();
  replace(ctx.main, h("div", { class: "rb-br rb-scroll", "data-page": "branches" }, head, h("div", { class: "rb-br-app" }, treeEl, cmpEl)));
}
