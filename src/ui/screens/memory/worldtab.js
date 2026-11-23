// 장기기억 애드온(0.3.22): 기록 보기 '세계' 구역 — 장소·물건·세력 문서, 인물 목표, 소문(누가 누구에게 들었나).
// 기록기가 응답마다 채우고(추가 호출 없음), 로컬 저장소일 때 직접 추가·고치기·지우기를 한다.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, iconBtn, note, openMenu, promptDialog, confirmDialog, segmented } from "../../kit.js";
import { mem, at, shownName, fail } from "./common.js";
import { memStore } from "./memstore.js";
import { editRows } from "./editrows.js";
import { addIgnore, ignoreKeyOf } from "../../../engine/memedit.js";
import { extraOf, nk, WORLD_LABEL } from "../../../engine/memextra.js";
import { calOf } from "../../../engine/storycal.js";
import { ZONES } from "../../../engine/weather.js";
import { editForm } from "./editrows.js";

const empty = (ic, text) => h("p", { class: "rb-mem-empty1" }, icon(ic, 16), text);
const WORLD_ICON = { place: "globe", item: "sparkle", faction: "users" };
// 저장(로컬). people.js의 editFolder와 같지만, 그 모듈이 무거워 CSS 묶음에서 따로 둔다
const editFolder = (env, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, fn)).then(() => env.redraw()).catch(fail(env.ctx));
export const WORLD_SECS = [["docs", "문서"], ["goals", "목표"], ["rumors", "소문"], ["cal", "캘린더"]];

export function worldCount(folder) {
  const e = extraOf(folder);
  return Object.values(e.world).reduce((n, b) => n + Object.keys(b).length, 0) + Object.values(e.goals).reduce((n, g) => n + g.list.length, 0) + e.rumors.length;
}

export async function renderWorld(env, host) {
  const { folder } = env, local = env.backend.id === "local", m = mem(env.ctx), e = extraOf(folder);
  m.worldSec ??= "docs";
  const draw = () => replace(host,
    h("p", { class: "rb-muted" }, "응답에 나온 장소·물건·세력, 인물이 이루려는 목표, 누가 누구에게 무엇을 들었는지 모아요. 지금 장면에 나온 것만 요청에 넣어요(AI 호출은 늘지 않아요)."),
    env.idx?.settings?.inject?.world === true ? null : h("p", { class: "rb-muted rb-world-off" }, "장소·물건·세력·목표·소문 기록이 꺼져 있어요. 장기기억 설정 › 기억 옵션 › ‘세계 탭’을 켜면 응답마다 모아요. 캘린더는 꺼져 있어도 보여요."),
    segmented(WORLD_SECS, m.worldSec, (v) => { m.worldSec = v; draw(); }, "세계 구역"),
    m.worldSec === "goals" ? goals() : m.worldSec === "rumors" ? rumors() : m.worldSec === "cal" ? cal() : docs());

  const del = (title, fn) => async () => { if (!(await confirmDialog(env.ctx.win, { title, ok: "지우기", danger: true }))) return; editFolder(env, (f) => { f.extra = extraOf(f); fn(f.extra, f); }); };
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
            { label: "이름 고치기", icon: "edit", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: w.name, label: "이름", value: w.name, ok: "저장" }); if (!v?.trim() || v.trim() === w.name) return; editFolder(env, (f) => { f.extra = extraOf(f); const box = f.extra.world[k], o = box[key]; if (!o) return; delete box[key]; box[nk(v)] = { ...o, name: v.trim().slice(0, 30), user: true }; }); } },
            { label: "설명 고치기", icon: "edit", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: w.name, label: "한 줄 설명", value: w.desc ?? "", ok: "저장" }); if (v == null) return; editFolder(env, (f) => { f.extra = extraOf(f); const o = f.extra.world[k][key]; if (o) o.desc = v.trim().slice(0, 100); }); } },
            { label: "지우기", icon: "trash", danger: true, onClick: del(`${w.name}을(를) 지울까요?`, (x, f) => { delete x.world[k][key]; addIgnore(f, ignoreKeyOf({ kind: k, name: w.name }), { turn: f.cursor?.at ?? 0 }); }) }]) }) : null))));
    }).filter(Boolean);
    return h("div", { class: "rb-world" }, h("div", { class: "rb-mem-shead" }, h("span", { style: "flex:1" }), add), groups.length ? groups : empty("globe", "아직 기록된 장소·물건·세력이 없어요."));
  }
  function goals() {
    const list = Object.entries(e.goals).filter(([, g]) => g.list.length);
    if (!list.length) return empty("pin", "아직 기록된 목표가 없어요. 인물이 이루려는 일이 응답에 드러나면 기록기가 채워요.");
    const ST = { active: ["진행 중", "acc"], done: ["이룸", "acc2"], dropped: ["접음", "mute"] };
    return h("div", { class: "rb-world" }, list.map(([key, g]) => {
      const { rows, foot } = editRows(env, { kind: "goal", id: `goal:${key}`, title: `${shownName(g.name)} 목표`, base: { name: g.name }, cls: "rb-mem-rec rb-goal", addLabel: "+ 목표",
        rows: g.list.map((x, i) => ({ x, i })),
        get: (f) => extraOf(f).goals[key]?.list ?? [],
        set: (f, arr) => { f.extra = extraOf(f); const gg = (f.extra.goals[key] ??= { name: g.name, list: [] }); gg.list = arr.map((x) => (x.prog >= 100 && x.status === "active" ? { ...x, status: "done" } : x)); },
        fields: [{ k: "goal", label: "목표", len: 60 }, { k: "prog", label: "진척(0~100)", type: "num", min: 0, max: 100, def: 0 }, { k: "status", label: "상태", type: "select", def: "active", opts: Object.entries(ST).map(([k, [l]]) => [k, l]) }],
        make: (v, f) => ({ ...v, at: f?.cursor?.at ?? 0, first: f?.cursor?.at ?? 0 }),
        row: (x) => [badge(ST[x.status]?.[0] ?? "진행 중", ST[x.status]?.[1] ?? "acc"),
          h("div", { class: "txt" }, h("div", null, x.goal), h("i", { class: "rb-goal-bar", "aria-label": `진척 ${x.prog ?? 0}%` }, h("i", { style: { width: `${x.prog ?? 0}%` } })))] });
      return h("section", { class: "rb-card rb-mem-sec" }, h("div", { class: "rb-mem-shead" }, h("b", null, shownName(g.name))), h("ul", { class: "rb-mem-reclist" }, rows), foot);
    }));
  }
  // 이야기 캘린더(기록기가 채우는 생일·연인·약속·특별한 날). 장면 상태창의 ‘다가오는 날’이 이 값을 써요
  function cal() {
    const c = calOf(e), MD = { len: 5, label: "날짜(월/일, 예: 3/14)" };
    const setCal = (f, key, v) => { f.extra = extraOf(f); f.extra.cal = { ...calOf(f.extra), [key]: v }; };
    const asMap = (arr) => Object.fromEntries(arr.map((x) => [nk(x.name), x]));
    const okMd = (v) => ({ ...v, md: (String(v.md).match(/^(\d{1,2})\s*[/.월-]\s*(\d{1,2})/) ?? []).slice(1, 3).map(Number).join("/") || "" });
    const block = (title, rows, foot, hint) => h("section", { class: "rb-card rb-mem-sec" }, h("div", { class: "rb-mem-shead" }, h("b", null, title)),
      rows.length ? h("ul", { class: "rb-mem-reclist" }, rows) : h("p", { class: "rb-muted" }, hint), foot);
    const bd = editRows(env, { kind: "bday", id: "cal:bday", title: "생일", cls: "rb-mem-rec", addLabel: "+ 생일",
      rows: Object.values(c.bday).map((x, i) => ({ x, i })), get: (f) => Object.values(calOf(extraOf(f)).bday), set: (f, arr) => setCal(f, "bday", asMap(arr)),
      fields: [{ k: "name", label: "인물", len: 30 }, { ...MD, k: "md", need: false }], make: (v) => okMd(v),
      row: (x) => [badge("생일", "acc"), h("div", { class: "txt" }, h("b", null, shownName(x.name)), ` ${x.md || "날짜 모름"}`)] });
    const cp = editRows(env, { kind: "couple", id: "cal:couple", title: "연인", cls: "rb-mem-rec", addLabel: "+ 연인",
      rows: Object.values(c.couple).map((x, i) => ({ x, i })), get: (f) => Object.values(calOf(extraOf(f)).couple), set: (f, arr) => setCal(f, "couple", asMap(arr)),
      fields: [{ k: "name", label: "두 사람(예: 카엘·미나)", len: 40 }, { k: "since", label: "사귄 날(YYYY-MM-DD, 모르면 비움)", len: 10, need: false }], make: (v) => v,
      row: (x) => [badge("연인", "acc2"), h("div", { class: "txt" }, h("b", null, x.name), ` ${x.since ? `${x.since}부터` : "시작일 모름"}`)] });
    const pl = editRows(env, { kind: "plan", id: "cal:plans", title: "약속", cls: "rb-mem-rec", addLabel: "+ 약속",
      rows: c.plans.map((x, i) => ({ x, i })), get: (f) => calOf(extraOf(f)).plans, set: (f, arr) => setCal(f, "plans", arr),
      fields: [{ ...MD, k: "md" }, { k: "what", label: "무슨 약속", len: 40 }], make: (v) => okMd(v),
      row: (x) => [badge(x.md || "?", "acc"), h("div", { class: "txt" }, x.what)] });
    const dy = editRows(env, { kind: "day", id: "cal:days", title: "특별한 날", cls: "rb-mem-rec", addLabel: "+ 특별한 날",
      rows: c.days.map((x, i) => ({ x, i })), get: (f) => calOf(extraOf(f)).days, set: (f, arr) => setCal(f, "days", arr),
      fields: [{ ...MD, k: "md" }, { k: "name", label: "이름", len: 30 }, { k: "note", label: "설명", len: 60, need: false }], make: (v) => okMd(v),
      row: (x) => [badge(x.md || "?", "acc2"), h("div", { class: "txt" }, h("b", null, x.name), x.note ? h("div", { class: "rb-muted" }, x.note) : null)] });
    return h("div", { class: "rb-world" }, note("info", "장면 상태창의 ‘다가오는 날’과 요청에 들어가는 날이에요. 기록기가 채우고, 여기서 고치거나 직접 적을 수 있어요."),
      block("🎂 생일", bd.rows, bd.foot, "아직 아는 생일이 없어요."), block("💗 연인", cp.rows, cp.foot, "기념일을 셀 연인이 없어요."),
      block("📅 약속", pl.rows, pl.foot, "잡힌 약속이 없어요."), block("✨ 특별한 날", dy.rows, dy.foot, "적어 둔 특별한 날이 없어요."), climateBox());
  }
  // 날씨·기후: 기록기가 정한 기후대·지역·달력과 지금 날씨를 직접 고친다(다음 보고가 오면 그 값에서 이어감)
  function climateBox() {
    const cl = e.climate, w = e.weather;
    const editCl = async () => { const v = await editForm(env.ctx.win, "기후 고치기", [{ k: "zone", label: "기후대", type: "select", def: "temperate", opts: Object.keys(ZONES).map((z) => [z, ZONES[z].label ?? z]) }, { k: "hemi", label: "반구", type: "select", def: "N", opts: [["N", "북반구"], ["S", "남반구"]] }, { k: "region", label: "지역", len: 30, need: false }, { k: "months", label: "한 해 달 수", type: "num", min: 1, max: 30, def: 12 }, { k: "mdays", label: "한 달 날 수(0 = 현실 달력)", type: "num", min: 0, max: 60, def: 0 }], cl ?? {});
      if (v) editFolder(env, (f) => { f.extra = extraOf(f); f.extra.climate = { ...(f.extra.climate ?? {}), ...v, mdays: v.mdays && v.mdays < 5 ? 5 : v.mdays, src: "user", at: f.cursor?.at ?? 0 }; }); };
    const editW = async () => { const v = await promptDialog(env.ctx.win, { title: "지금 날씨", label: "예: 맑음, 비, 눈. 비우면 지워요", value: w?.w ?? "", ok: "저장" }); if (v == null) return;
      editFolder(env, (f) => { f.extra = extraOf(f); f.extra.weather = v.trim() ? { w: v.trim().slice(0, 20), at: f.cursor?.at ?? 0, when: "", user: true } : null; }); };
    return h("section", { class: "rb-card rb-mem-sec" }, h("div", { class: "rb-mem-shead" }, h("b", null, "🌦️ 날씨·기후")),
      h("ul", { class: "rb-mem-reclist" },
        h("li", { class: "rb-mem-rec rb-er-row" }, badge("기후", "acc"), h("div", { class: "txt" }, cl ? `${ZONES[cl.zone]?.label ?? cl.zone} · ${cl.hemi === "S" ? "남반구" : "북반구"}${cl.region ? ` · ${cl.region}` : ""}${cl.mdays ? ` · ${cl.months ?? 12}달 × ${cl.mdays}일` : ""}` : "아직 몰라요"), local ? h("span", { class: "rb-er-acts" }, h("button", { type: "button", class: "rb-bzb", title: "고치기", "aria-label": "기후 고치기", onClick: () => editCl().catch(fail(env.ctx)) }, "✎")) : null),
        h("li", { class: "rb-mem-rec rb-er-row" }, badge("날씨", "acc2"), h("div", { class: "txt" }, w?.w ?? "기록 없음"), local ? h("span", { class: "rb-er-acts" }, h("button", { type: "button", class: "rb-bzb", title: "고치기", "aria-label": "날씨 고치기", onClick: () => editW().catch(fail(env.ctx)) }, "✎")) : null)));
  }
  function rumors() {
    const { rows, foot } = editRows(env, { kind: "told", id: "rumors", title: "소문", cls: "rb-mem-rec", addLabel: "+ 소문",
      rows: e.rumors.map((x, i) => ({ x, i })).reverse(),
      get: (f) => extraOf(f).rumors, set: (f, arr) => { f.extra = extraOf(f); f.extra.rumors = arr; },
      fields: [{ k: "from", label: "말한 사람", len: 30 }, { k: "to", label: "들은 사람", len: 30 }, { k: "info", label: "들은 내용", len: 80 }],
      make: (v, f) => ({ ...v, at: f?.cursor?.at ?? 0, when: "" }),
      row: (r) => [badge("소문", "acc2"), h("div", { class: "txt" }, h("div", null, h("b", null, `${shownName(r.from)} → ${shownName(r.to)}`), ` ${r.info}`), h("div", { class: "rb-muted" }, [at(r.at), r.when].filter(Boolean).join(" · ")))] });
    return h("div", { class: "rb-world" },
      e.rumors.length ? note("info", "들은 사람만 그 사실을 알아요. 장면에 그 사람이 나오면 ‘누가 무엇을 들었는지’를 요청에 넣어, 모르는 인물이 아는 척하지 않게 해요.") : empty("message", "아직 오간 말이 없어요. 누군가 다른 사람에게 정보를 전하면 기록기가 채워요."),
      rows.length ? h("ul", { class: "rb-mem-reclist" }, rows) : null, foot);
  }
  draw();
}

export const WORLD_CSS = `.rb-world{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.rb-goal-bar{display:block;height:6px;margin:5px 0 3px;border-radius:3px;background:color-mix(in srgb,var(--rb-acc) 14%,transparent);overflow:hidden}
.rb-goal-bar>i{display:block;height:100%;border-radius:3px;background:var(--rb-acc)}`;
