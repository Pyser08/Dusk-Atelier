// 장기기억 애드온(0.3.22): 기록 보기 '세계' 구역 — 장소·물건·세력 문서, 인물 목표, 소문(누가 누구에게 들었나).
// 기록기가 응답마다 채우고(추가 호출 없음), 로컬 저장소일 때 직접 추가·고치기·지우기를 한다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, iconBtn, note, openMenu, promptDialog, confirmDialog, segmented } from "../../kit.js";
import { mem, at, shownName, fail } from "./common.js";
import { memStore } from "./memstore.js";
import { extraOf, nk, WORLD_LABEL } from "../../../engine/memextra.js";

const empty = (ic, text) => h("p", { class: "rb-mem-empty1" }, icon(ic, 16), text);
const WORLD_ICON = { place: "globe", item: "sparkle", faction: "users" };
// 저장(로컬). people.js의 editFolder와 같지만, 그 모듈이 무거워 CSS 묶음에서 따로 둔다
const editFolder = (env, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, fn)).then(() => env.redraw()).catch(fail(env.ctx));
export const WORLD_SECS = [["docs", "문서"], ["goals", "목표"], ["rumors", "소문"]];

export function worldCount(folder) {
  const e = extraOf(folder);
  return Object.values(e.world).reduce((n, b) => n + Object.keys(b).length, 0) + Object.values(e.goals).reduce((n, g) => n + g.list.length, 0) + e.rumors.length;
}

export async function renderWorld(env, host) {
  const { folder } = env, local = env.backend.id === "local", m = mem(env.ctx), e = extraOf(folder);
  m.worldSec ??= "docs";
  const draw = () => replace(host,
    h("p", { class: "rb-muted" }, "응답에 나온 장소·물건·세력, 인물이 이루려는 목표, 누가 누구에게 무엇을 들었는지 모아요. 지금 장면에 나온 것만 요청에 넣어요(AI 호출은 늘지 않아요)."),
    segmented(WORLD_SECS, m.worldSec, (v) => { m.worldSec = v; draw(); }, "세계 구역"),
    m.worldSec === "goals" ? goals() : m.worldSec === "rumors" ? rumors() : docs());

  const del = (title, fn) => async () => { if (!(await confirmDialog(env.ctx.win, { title, ok: "지우기", danger: true }))) return; editFolder(env, (f) => { f.extra = extraOf(f); fn(f.extra); }); };
  function docs() {
    const add = local ? btn("문서 추가", { size: "sm", icon: "plus", onClick: (ev) => openMenu(env.ctx.win, ev.currentTarget, Object.entries(WORLD_LABEL).map(([k, l]) => ({ label: l, onClick: async () => {
      const name = await promptDialog(env.ctx.win, { title: `${l} 추가`, label: "이름", ok: "다음" }); if (!name?.trim()) return;
      const desc = await promptDialog(env.ctx.win, { title: name.trim(), label: "한 줄 설명", ok: "추가" }); if (desc == null) return;
      editFolder(env, (f) => { f.extra = extraOf(f); f.extra.world[k][nk(name)] = { name: name.trim().slice(0, 30), desc: desc.trim().slice(0, 100), at: f.cursor?.at ?? 0, first: f.cursor?.at ?? 0, n: 1, manual: true }; });
    } }))) }) : null;
    const groups = Object.entries(WORLD_LABEL).map(([k, l]) => {
      const list = Object.entries(e.world[k]).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0));
      if (!list.length) return null;
      return h("section", { class: "rb-card rb-mem-sec rb-world-g" }, h("div", { class: "rb-mem-shead" }, icon(WORLD_ICON[k], 16), h("b", null, l), h("span", { class: "rb-muted" }, `${list.length}`)),
        h("ul", { class: "rb-mem-reclist" }, list.map(([key, w]) => h("li", { class: "rb-mem-rec" },
          h("div", { class: "txt" }, h("div", null, h("b", null, w.name), w.desc ? ` — ${w.desc}` : ""),
            h("div", { class: "rb-muted" }, [w.owner ? `주인 ${shownName(w.owner)}` : "", w.members?.length ? `구성원 ${w.members.map(shownName).join(", ")}` : "", `${at(w.first)} 처음 · ${w.n ?? 1}번 나옴`].filter(Boolean).join(" · "))),
          local ? iconBtn("more", "더 보기", { onClick: (ev) => openMenu(env.ctx.win, ev.currentTarget, [
            { label: "설명 고치기", icon: "edit", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: w.name, label: "한 줄 설명", value: w.desc ?? "", ok: "저장" }); if (v == null) return; editFolder(env, (f) => { f.extra = extraOf(f); const o = f.extra.world[k][key]; if (o) o.desc = v.trim().slice(0, 100); }); } },
            { label: "지우기", icon: "trash", danger: true, onClick: del(`${w.name}을(를) 지울까요?`, (x) => { delete x.world[k][key]; }) }]) }) : null))));
    }).filter(Boolean);
    return h("div", { class: "rb-world" }, h("div", { class: "rb-mem-shead" }, h("span", { style: "flex:1" }), add), groups.length ? groups : empty("globe", "아직 기록된 장소·물건·세력이 없어요."));
  }
  function goals() {
    const list = Object.entries(e.goals).filter(([, g]) => g.list.length);
    if (!list.length) return empty("pin", "아직 기록된 목표가 없어요. 인물이 이루려는 일이 응답에 드러나면 기록기가 채워요.");
    const ST = { active: ["진행 중", "acc"], done: ["이룸", "acc2"], dropped: ["접음", "mute"] };
    return h("div", { class: "rb-world" }, list.map(([key, g]) => h("section", { class: "rb-card rb-mem-sec" }, h("div", { class: "rb-mem-shead" }, h("b", null, shownName(g.name))),
      h("ul", { class: "rb-mem-reclist" }, g.list.map((x, i) => h("li", { class: "rb-mem-rec rb-goal" }, badge(ST[x.status]?.[0] ?? "진행 중", ST[x.status]?.[1] ?? "acc"),
        h("div", { class: "txt" }, h("div", null, x.goal), h("i", { class: "rb-goal-bar", "aria-label": `진척 ${x.prog ?? 0}%` }, h("i", { style: { width: `${x.prog ?? 0}%` } })), h("div", { class: "rb-muted" }, `${x.prog ?? 0}% · ${at(x.first)} 처음 · ${at(x.at)} 갱신`)),
        local ? iconBtn("more", "더 보기", { onClick: (ev) => openMenu(env.ctx.win, ev.currentTarget, [
          { label: "진척 고치기", icon: "edit", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: x.goal, label: "진척(0~100)", value: String(x.prog ?? 0), ok: "저장" }); if (v == null) return; const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0))); editFolder(env, (f) => { f.extra = extraOf(f); const o = f.extra.goals[key]?.list?.[i]; if (o) { o.prog = n; if (n >= 100) o.status = "done"; } }); } },
          { label: x.status === "active" ? "접음으로" : "다시 진행", onClick: () => editFolder(env, (f) => { f.extra = extraOf(f); const o = f.extra.goals[key]?.list?.[i]; if (o) o.status = o.status === "active" ? "dropped" : "active"; }) },
          { label: "지우기", icon: "trash", danger: true, onClick: del("이 목표를 지울까요?", (y) => { y.goals[key]?.list?.splice(i, 1); }) }]) }) : null))))));
  }
  function rumors() {
    if (!e.rumors.length) return empty("message", "아직 오간 말이 없어요. 누군가 다른 사람에게 정보를 전하면 기록기가 채워요.");
    return h("div", { class: "rb-world" }, note("info", "들은 사람만 그 사실을 알아요. 장면에 그 사람이 나오면 ‘누가 무엇을 들었는지’를 요청에 넣어, 모르는 인물이 아는 척하지 않게 해요."),
      h("ul", { class: "rb-mem-reclist" }, e.rumors.map((r, i) => [r, i]).reverse().map(([r, i]) => h("li", { class: "rb-mem-rec" }, badge("소문", "acc2"),
        h("div", { class: "txt" }, h("div", null, h("b", null, `${shownName(r.from)} → ${shownName(r.to)}`), ` ${r.info}`), h("div", { class: "rb-muted" }, [at(r.at), r.when].filter(Boolean).join(" · "))),
        local ? iconBtn("trash", "지우기", { onClick: del("이 소문을 지울까요?", (x) => { x.rumors.splice(i, 1); }) }) : null))));
  }
  draw();
}

export const WORLD_CSS = `.rb-world{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.rb-goal-bar{display:block;height:6px;margin:5px 0 3px;border-radius:3px;background:color-mix(in srgb,var(--rb-acc) 14%,transparent);overflow:hidden}
.rb-goal-bar>i{display:block;height:100%;border-radius:3px;background:var(--rb-acc)}`;
