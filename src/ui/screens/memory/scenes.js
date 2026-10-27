import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, emptyState } from "../../kit.js";
import { mem, avatar, gradeBadge, at, visibleRecords } from "./common.js";
import { GRADES } from "../../../engine/memorygrade.js";
import { newChatFrom } from "./people.js";

export async function renderScenes(env, host) {
  const m = mem(env.ctx), { folder, caps } = env;
  const scenes = (folder.scenes ?? []).filter((s) => !s.orphan);
  if (!scenes.length) return replace(host, emptyState({ icon: "list", title: "아직 기록된 상황이 없어요", text: "대화하면 AI 응답마다 상황이 자동으로 쌓여요. 이미 나눈 대화는 한꺼번에 분석할 수도 있어요.", actions: caps.analyze ? [{ label: "지난 대화 분석하기", onClick: () => { m.settingsOpen = true; env.redraw(); } }] : [] }));
  const latest = scenes.at(-1)?.id;
  const ordered = m.sceneDesc ? [...scenes].reverse() : scenes;
  const recsOf = (s) => Object.values(folder.people).flatMap((p) => visibleRecords(p).filter((r) => r.sit === s.id));
  const goPerson = (name) => { const k = Object.keys(folder.people).find((x) => folder.people[x].name === name); if (k) { m.personKey = k; m.tab = "people"; env.redraw(); } };
  const cards = ordered.map((s) => {
    const rs = recsOf(s), top = rs.reduce((b, r) => GRADES.indexOf(r.g) > GRADES.indexOf(b) ? r.g : b, "");
    const card = h("article", { class: ["rb-card", "rb-mem-scene", m.focusScene === s.id && "is-focus"], id: "scene-" + s.id },
      h("div", { class: "rb-mem-shead" }, h("b", null, `${s.at != null ? at(s.at) : "—"}${s.place ? " · " + s.place : ""}`), s.id === latest ? badge("현재 상황", "acc") : null, s.wiki ? badge("위키", "mute") : null, h("span", { style: "flex:1" }), rs.length ? h("span", { class: "rb-muted" }, `기록 ${rs.length} `, gradeBadge(top)) : null),
      h("p", null, s.sum), (s.facts ?? []).length ? h("ul", { class: "rb-mem-facts" }, s.facts.slice(0, 3).map((f) => h("li", null, f))) : null,
      (s.who ?? []).length ? h("div", { class: "rb-mem-who" }, s.who.map((n) => h("button", { type: "button", class: "rb-mem-link", onClick: () => goPerson(n), "aria-label": `${n} 폴더 열기` }, avatar(n), n))) : null,
      h("div", { class: "rb-mem-sact" }, s.at != null ? btn("여기서 새 채팅", { size: "sm", onClick: () => newChatFrom(env, s.at) }) : null,
        s.at != null ? btn("여기까지로 새 봇 만들기", { size: "sm", onClick: () => { m.compose = { keys: Object.keys(folder.people).filter((k) => visibleRecords(folder.people[k]).some((r) => r.sit === s.id)), to: s.at + 1 }; m.ctab = "compose"; env.ctx.go("cards"); } }) : null));
    return card;
  });
  replace(host, h("div", { class: "rb-mem-tools" }, btn(m.sceneDesc ? "최근순" : "오래된순", { size: "sm", onClick: () => { m.sceneDesc = !m.sceneDesc; env.redraw(); } })), h("div", { class: "rb-mem-timeline" }, cards));
  if (m.focusScene) { const el = host.querySelector("#scene-" + CSS.escape(m.focusScene)); el?.scrollIntoView?.({ block: "center" }); m.focusScene = ""; }
}
