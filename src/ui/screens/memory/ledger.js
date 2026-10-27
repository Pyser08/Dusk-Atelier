// v1.6.2 장부 탭: 열린 항목 · 관계 변화 · 세계 시간선. 로컬 저장소일 때만 고칠 수 있다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, note, promptDialog, confirmDialog } from "../../kit.js";
import { mem, at } from "./common.js";
import { editFolder } from "./people.js";
import { OPEN_KINDS, openItems, timelineOf } from "../../../engine/memoryplus.js";

const empty = (ic, text) => h("div", { class: "rb-empty" }, icon(ic, 24), h("div", null, text));
const readonlyNote = (env) => env.backend.id !== "local" ? note("info", "BardWiki 모드에서는 위키에 없는 항목이라 비어 있을 수 있고, 고칠 수도 없어요.") : null;

export async function renderOpen(env, host) {
  const { folder } = env, local = env.backend.id === "local", m = mem(env.ctx);
  const open = openItems(folder), done = openItems(folder, { closed: true });
  const row = (x, closed) => h("li", { class: "rb-mem-rec" }, badge(OPEN_KINDS[x.kind] ?? "항목", x.kind === "promise" ? "acc" : x.kind === "foreshadow" ? "acc2" : "mute"),
    h("div", { class: "txt" }, h("div", null, x.text), h("div", { class: "rb-muted" }, [x.at != null ? at(x.at) : "", (x.who ?? []).join(", "), closed && x.closedAt != null ? `해결 ${at(x.closedAt)}` : ""].filter(Boolean).join(" · "))), h("span", { style: "flex:1" }),
    local ? btn(closed ? "다시 열기" : "해결", { size: "sm", onClick: () => editFolder(env, (f) => { const o = f.open.find((y) => y.id === x.id); if (o) { o.closed = !closed; if (!closed) { o.closedAt = f.cursor?.at ?? null; o.closed_ms = Date.now(); } } }) }) : null,
    local ? btn("삭제", { size: "sm", onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 항목을 지울까요?", body: "지운 항목은 되돌릴 수 없어요. 해결된 일이라면 지우지 말고 '해결'을 눌러 두세요.", ok: "삭제", danger: true }))) return; editFolder(env, (f) => { f.open = f.open.filter((y) => y.id !== x.id); }); } }) : null);
  const add = local ? btn("항목 추가", { size: "sm", icon: "plus", onClick: async () => {
    const v = await promptDialog(env.ctx.win, { title: "열린 항목 추가", label: "약속·복선·의문 (80자)", ok: "추가" }); if (!v?.trim()) return;
    editFolder(env, (f) => { (f.open ??= []).push({ id: "o_" + Date.now().toString(36), text: v.trim().slice(0, 80), kind: "question", who: [], at: f.cursor?.at ?? null, at_ms: Date.now(), closed: false }); });
  } }) : null;
  replace(host, readonlyNote(env), h("p", { class: "rb-muted" }, "AI 응답에서 아직 풀리지 않은 약속·복선·의문을 모아요. 해결되면 자동으로 닫히고, 열린 항목은 장기기억 주입에 들어가요."), h("div", { class: "rb-mem-tools" }, add),
    open.length ? h("ul", { class: "rb-mem-reclist" }, open.slice().reverse().map((x) => row(x, false))) : empty("list", "열린 항목이 없어요."),
    done.length ? h("details", { class: "rb-mem-man", open: !!m.openDone, onToggle: (e) => { m.openDone = e.target.open; } }, h("summary", null, `해결된 항목 ${done.length}개`), h("ul", { class: "rb-mem-reclist" }, done.slice().reverse().map((x) => row(x, true)))) : null);
}

export async function renderRels(env, host) {
  const { folder } = env, local = env.backend.id === "local";
  const pairs = Object.entries(folder.rels ?? {}).filter(([, p]) => p.items?.length).sort((a, b) => (b[1].items.at(-1).at_ms ?? 0) - (a[1].items.at(-1).at_ms ?? 0));
  if (!pairs.length) return replace(host, readonlyNote(env), empty("list", "아직 기록된 관계 변화가 없어요."));
  replace(host, readonlyNote(env), h("p", { class: "rb-muted" }, "두 인물 사이에서 눈에 띄게 달라진 점을 쌍별로 모아요. 최근 변화가 주입에 들어가요."),
    pairs.map(([k, p]) => h("article", { class: "rb-card rb-mem-sec" }, h("div", { class: "rb-mem-shead" }, h("b", null, `${p.from} → ${p.to}`), h("span", { style: "flex:1" }), local ? btn("지우기", { size: "sm", onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 관계 기록을 지울까요?", body: `${p.from} → ${p.to} 사이에 쌓인 변화가 모두 사라져요. 되돌릴 수 없어요.`, ok: "삭제", danger: true }))) return; editFolder(env, (f) => { delete f.rels[k]; }); } }) : null),
      h("ul", { class: "rb-mem-facts" }, p.items.slice().reverse().slice(0, 8).map((i) => h("li", null, `${i.at != null ? at(i.at) + " " : ""}${i.d}${i.dir === "+" ? " ↑" : i.dir === "-" ? " ↓" : ""}`))))));
}

export async function renderTimeline(env, host) {
  const m = mem(env.ctx), tl = timelineOf(env.folder);
  if (!tl.length) return replace(host, readonlyNote(env), empty("list", "이야기 속 날짜·시간이 적힌 상황이 아직 없어요."));
  replace(host, readonlyNote(env), h("p", { class: "rb-muted" }, "본문에 적힌(또는 분명히 알 수 있는) 이야기 속 시각만 기록해요. 현재 시각은 장기기억 주입에 들어가요."),
    h("ol", { class: "rb-mem-timeline" }, tl.map((x, i) => h("li", { class: "rb-card rb-mem-scene" }, h("div", { class: "rb-mem-shead" }, h("b", null, x.when), i === tl.length - 1 ? badge("지금", "acc") : null, h("span", { style: "flex:1" }), h("span", { class: "rb-muted" }, `${x.at != null ? at(x.at) : ""}${x.place ? " · " + x.place : ""}`)),
      h("p", null, x.sum), h("div", { class: "rb-mem-sact" }, btn("상황 보기", { size: "sm", onClick: () => { m.tab = "scenes"; m.focusScene = x.id; env.redraw(); } }))))));
}
