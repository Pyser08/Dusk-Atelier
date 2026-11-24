// 장기기억 애드온(0.3.22): 인물 위키에 붙는 새 칸 — 몸 흔적 · 궁합 · 인물 일기 · 다른 봇으로 옮기기.
import { h } from "../../dom.js";
import { characterDocs } from "../../../engine/usernsfw.js";
import { btn, modal, promptDialog, confirmDialog } from "../../kit.js";
import { memStore } from "./memstore.js";
import { editRows, editForm, EDITROWS_CSS } from "./editrows.js";
import { GUIDES_CSS } from "./guidesui.js";
import { cumNow, saturation, bodyOf, capacityOf, fertilityFactor, preventOf, chanceNow, BODY, CONTRA_LABEL, STANDING } from "../../../engine/fertility.js";
import { lifeView } from "../../../engine/nsfwlife.js";
import { mem, fail, loadBots, loadChats } from "./common.js";
import { extraOf, activeMarks, markAge, compatOf, personPack, insertPack, nk, activeStatus, STATUS_LV, OUTFIT_PARTS } from "../../../engine/memextra.js";

import { RACES, RACE_BY_ID, raceView } from "../../../engine/races.js";
import { parseIso, isoOf } from "../../../engine/weather.js";

const note = (t) => h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, t);
const turnOf = (f) => (Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0);
const whenOf = (f) => [...(f?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
const namesOf = (doc) => new Set([doc.title, ...(doc.aliases ?? [])].map(nk));
const save = (env, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, fn)).then(() => env.redraw?.()).catch(fail(env.ctx));

// 몸 흔적: 키스마크·멍·긁힌 자국 등. 이야기 날짜(모르면 턴)로 며칠 뒤 사라진다
export function marksCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, names = namesOf(doc), turn = turnOf(f), when = whenOf(f);
  const all = extraOf(f).marks.map((x, i) => ({ x, i })).filter(({ x }) => names.has(nk(x.name)));
  const { rows, foot } = editRows(env, { kind: "mark", id: `mark:${doc.id}`, title: "몸 흔적", ttl: 14, addLabel: "흔적 추가",
    rows: all.filter(({ x }) => activeMarks([x], turn, when).length), get: (g) => extraOf(g).marks, set: (g, arr) => { const e = extraOf(g); e.marks = arr; g.extra = e; },
    fields: [{ k: "part", label: "부위(예: 목)", len: 20 }, { k: "desc", label: "어떤 흔적(예: 키스마크)", len: 60 }, { k: "days", label: "남는 날(1~14)", type: "num", min: 1, max: 14, def: 3 }],
    make: (v, g) => ({ name: doc.title, ...v, at: turnOf(g), when: whenOf(g), manual: true }),
    row: (m) => { const age = markAge(m, turn, when), left = Math.max(0, (m.days ?? 3) - age);
      return [h("b", null, m.part), h("span", null, m.desc), h("small", { class: "rb-muted" }, `${age + 1}일째 · ${left ? `${left}일 더` : "곧 사라짐"}`),
        h("i", { class: "fade", style: { width: `${Math.round((left / (m.days || 3)) * 100)}%` } })]; } });
  return card("🩹 몸 흔적", [
    note("키스마크·멍·긁힌 자국처럼 몸에 남은 흔적이에요. 기록기가 응답에서 찾아 넣고, 이야기 날짜(없으면 턴)로 며칠 뒤 사라져요. 남아 있는 동안 장면에 넣어 줘요."),
    rows.length ? h("ul", { class: "rb-marks" }, rows) : note("지금 남은 흔적이 없어요."),
    foot,
  ], null, "rb-life");
}

// 상태이상: 취함·부상·감기·최음제 등. 정한 날만큼(0 = 나을 때까지) 행동에 반영
export function statusCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, names = namesOf(doc), turn = turnOf(f), when = whenOf(f);
  const off = env.idx?.settings?.inject?.status === false;
  const all = extraOf(f).status.map((x, i) => ({ x, i })).filter(({ x }) => names.has(nk(x.name)));
  const COL = ["", "#f0b429", "#e07a3f", "#d64545"];
  const { rows, foot } = editRows(env, { kind: "status", id: `status:${doc.id}`, title: "상태이상", ttl: 10, addLabel: "상태이상 추가",
    rows: all.filter(({ x }) => activeStatus([x], turn, when).length), get: (g) => extraOf(g).status, set: (g, arr) => { const e = extraOf(g); e.status = arr; g.extra = e; },
    fields: [{ k: "effect", label: "상태(예: 감기, 취함, 다리 부상)", len: 20 }, { k: "lv", label: "정도", type: "select", def: "2", opts: [["1", STATUS_LV[1]], ["2", STATUS_LV[2]], ["3", STATUS_LV[3]]] }, { k: "days", label: "며칠(0 = 나을 때까지)", type: "num", min: 0, max: 14, def: 3 }],
    make: (v, g) => ({ name: doc.title, ...v, lv: Number(v.lv), at: turnOf(g), when: whenOf(g), manual: true }),
    row: (x) => { const age = markAge(x, turn, when), left = x.days ? Math.max(0, x.days - age) : null, lv = Number(x.lv) || 1;
      return [h("b", { style: { color: COL[lv] } }, x.effect), h("span", null, STATUS_LV[lv]), h("small", { class: "rb-muted" }, `${age + 1}일째 · ${left == null ? "나을 때까지" : left ? `${left}일 더` : "곧 나음"}`),
        h("i", { class: "fade", style: { width: left == null ? "100%" : `${Math.round((left / (x.days || 1)) * 100)}%`, background: COL[lv] } })]; } });
  return card("🤒 상태이상", [
    off ? note("장기 기억 → 설정 → 기억 옵션의 ‘상태이상’이 꺼져 있어서 새로 기록하지 않고 장면에도 넣지 않아요.") : note("취함·부상·감기·최음제·수면 부족처럼 인물에게 생긴 상태예요. 기록기가 응답에서 찾아 넣고, 정한 날이 지나거나 나으면 사라져요. 남아 있는 동안 행동에 반영돼요."),
    rows.length ? h("ul", { class: "rb-marks" }, rows) : note("지금은 아무 상태이상도 없어요."),
    foot,
  ], null, "rb-life");
}

// 임신·피임: 체내 정액량·포화도·늘 쓰는 피임·강제 피임·출산/유산 이력 → 지금 임신 가능성
export function fertilityCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, n = f?.nsfw?.[doc.id], local = env.backend?.id === "local";
  if (!n || !Object.keys(n.sexual ?? {}).length) return null;
  const turn = turnOf(f), when = whenOf(f), L = f?.life?.p?.[doc.id] ?? {};
  const body = bodyOf(n, f?.wiki?.people?.profiles?.[doc.id]?.summary), c = cumNow(L, turn, when), sat = saturation(c.ml, body);
  let v = null; try { v = lifeView(f, doc, turn); } catch { v = null; }
  const ff = fertilityFactor(L, n, turn, when), pv = preventOf(n), ch = v?.phase === "preg" ? null : chanceNow({ phase: v?.phase ?? null, factor: ff.factor, prevent: pv.p });
  const setFert = (patch) => save(env, (g) => { g.nsfw ??= {}; const cur = g.nsfw[doc.id] ?? n; g.nsfw[doc.id] = { ...cur, fert: { ...(cur.fert ?? {}), ...patch } }; });
  const forced = n.fert?.forced === true;
  const hist = Array.isArray(L.hist) ? L.hist : [];
  const addHist = (kind) => save(env, (g) => { g.life ??= {}; g.life.p ??= {}; const LL = (g.life.p[doc.id] ??= {}); LL.hist = [...(LL.hist ?? []), { kind, at: turnOf(g), when: whenOf(g), manual: true }].slice(-20); });
  const sel = (label, value, opts, on) => h("label", { class: "rb-fert-sel" }, h("small", null, label), h("select", { class: "rb-input", disabled: !local || null, "aria-label": label, onChange: (e) => on(e.target.value) }, opts.map(([k, l]) => h("option", { value: k, selected: k === value || null }, l))));
  return card("🌸 임신·피임", [
    h("div", { class: ["rb-fert-force", forced && "on"] },
      h("div", null, h("b", null, forced ? "강제 피임 켜짐" : "강제 피임"), h("small", null, forced ? "이 인물은 어떤 관계에서도 임신하지 않아요. 본문에도 늘 피임한 것으로 넣어요." : "켜면 피임 여부와 상관없이 임신하지 않아요(이 채팅만).")),
      local ? h("button", { type: "button", class: "rb-fert-btn", "aria-pressed": forced ? "true" : "false", onClick: () => setFert({ forced: !forced }) }, forced ? "끄기" : "켜기") : null),
    h("div", { class: "rb-fert-grid" },
      h("div", { class: "rb-fert-tile" }, h("small", null, "체내 정액량"), h("b", null, c.ml >= 0.1 ? `${c.ml >= 10 ? Math.round(c.ml) : c.ml.toFixed(1)} ml` : "없음"), h("span", null, c.days == null ? "기록 없음" : `${c.days < 1 ? `${Math.round(c.days * 24)}시간` : `${c.days.toFixed(1)}일`} 전`)),
      h("div", { class: "rb-fert-tile" }, h("small", null, `포화도 · ${BODY[body][0]}`), h("b", null, `${sat}%`), h("i", { class: "rb-fert-bar" }, h("i", { style: { width: `${sat}%` } })), h("span", null, `최대 약 ${capacityOf(body)}ml`)),
      h("div", { class: ["rb-fert-tile", "chance"] }, h("small", null, "지금 임신 가능성"), h("b", null, ch == null ? "임신 중" : `${(ch * 100).toFixed(ch < 0.01 ? 2 : 1)}%`), h("span", null, `${pv.label}${v?.phase ? "" : " · 주기 모름"}`))),
    ff.why.length ? h("div", { class: "rb-fert-why" }, ...ff.why.map((w) => h("span", null, w))) : null,
    h("div", { class: "rb-fert-sels" },
      sel("체형", body, Object.entries(BODY).map(([k, [l]]) => [k, l]), (val) => setFert({ body: val })),
      sel("늘 쓰는 피임", n.fert?.contra ?? "none", STANDING.map((k) => [k, CONTRA_LABEL[k]]), (val) => setFert({ contra: val }))),
    h("div", { class: "rb-fert-hist" }, h("small", null, "출산·유산 이력"),
      hist.length ? h("div", null, hist.map((x, i) => h("span", { class: x.kind }, `${x.kind === "birth" ? "출산" : "유산"}${x.when ? ` · ${String(x.when).slice(0, 10)}` : ` · #${(x.at ?? 0) + 1}`}`,
        local ? h("button", { type: "button", class: "rb-bzb", title: "이력 지우기", "aria-label": "이력 지우기", onClick: async () => { if (await confirmDialog(env.ctx.win, { title: "이 이력을 지울까요?", ok: "지우기", danger: true })) save(env, (g) => { const LL = g.life?.p?.[doc.id]; if (LL?.hist) LL.hist = LL.hist.filter((y, j) => !(j === i && y.kind === x.kind && y.at === x.at)); }); } }, "✕") : null))) : h("span", { class: "rb-muted" }, "없음"),
      local ? h("span", { class: "acts" }, btn("+ 출산", { size: "sm", onClick: () => addHist("birth") }), btn("+ 유산", { size: "sm", onClick: () => addHist("loss") })) : null),
    note("응답에서 사정(질 안)이 있으면 기록기가 양(ml)과 피임을 적어요. 양은 반나절마다 반으로 줄고, 정자는 며칠 살아 있어요. 관계마다 피임·양·이력으로 보호됐는지 정한 뒤, 보호 안 된 관계만 월경 주기(배란일) 확률로 임신을 굴려요."),
  ], null, "rb-life");
}

// 옷차림·액세서리: 부위별 간단(보이는 대로) + 상세(삽화용). 기록기가 채우고 직접 고칠 수 있다
export function outfitCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, local = env.backend?.id === "local", m = mem(env.ctx);
  const o = Object.values(extraOf(f).outfit ?? {}).find((x) => namesOf(doc).has(nk(x.name)));
  const detail = !!(m.outfitDetail ??= {})[doc.id];
  const edit = (part) => async () => {
    const cur = part === "acc" ? null : o?.parts?.[part];
    const sv = await promptDialog(env.ctx.win, { title: `${OUTFIT_PARTS.find(([k]) => k === part)?.[1]} — 간단히`, label: "보이는 대로(예: 흰 블라우스). 비우면 지워요", value: cur?.s ?? "", ok: "다음" }); if (sv == null) return;
    const dv = sv.trim() ? await promptDialog(env.ctx.win, { title: "삽화용 상세", label: "색·소재·모양·핏·무늬·지금 상태(젖음·풀림 등)", value: cur?.d ?? "", ok: "저장" }) : "";
    if (dv == null) return;
    save(env, (g) => { const e = extraOf(g), k = nk(doc.title), x = (e.outfit[k] ??= { name: doc.title, parts: {}, acc: [] });
      if (part === "acc") { if (sv.trim()) x.acc = [...(x.acc ?? []), { s: sv.trim().slice(0, 40), d: (dv || sv).trim().slice(0, 200), at: turnOf(g) }].slice(-6); }
      else if (!sv.trim()) delete x.parts[part]; else x.parts[part] = { s: sv.trim().slice(0, 40), d: (dv || sv).trim().slice(0, 200), at: turnOf(g) };
      g.extra = e; });
  };
  const rows = OUTFIT_PARTS.filter(([k]) => k !== "acc").map(([k, l]) => { const p = o?.parts?.[k];
    return h("li", { class: ["rb-of-row", !p && "empty"] }, h("small", null, l), h("div", null, h("b", null, p?.s ?? "—"), detail && p?.d && p.d !== p.s ? h("p", null, p.d) : null),
      local ? h("button", { type: "button", class: "rb-bzb", title: `${l} 고치기`, "aria-label": `${l} 고치기`, onClick: edit(k) }, "✎") : null); });
  const acc = (o?.acc ?? []);
  return card("👗 옷차림·액세서리", [
    h("div", { class: "rb-of-top" }, note("기록기가 응답에서 부위별로 적어요. 간단히는 사람들이 볼 모습, 상세는 삽화를 그릴 때 쓸 설명이에요."),
      h("button", { type: "button", class: ["rb-of-tg", detail && "on"], "aria-pressed": detail ? "true" : "false", onClick: () => { m.outfitDetail[doc.id] = !detail; env.redraw?.(); } }, detail ? "간단히 ‹" : "삽화용 상세 ›")),
    h("ul", { class: "rb-of" }, rows),
    h("div", { class: "rb-of-acc" }, h("small", null, "액세서리"), acc.length ? acc.map((x, i) => h("span", { title: x.d }, x.s, detail && x.d !== x.s ? h("i", null, ` — ${x.d}`) : null, local ? h("button", { type: "button", class: "rb-bzb", "aria-label": "액세서리 고치기", title: "고치기", onClick: async () => { const v = await editForm(env.ctx.win, "액세서리 고치기", [{ k: "s", label: "간단히", len: 40 }, { k: "d", label: "삽화용 상세", len: 200, need: false }], x); if (v) save(env, (g) => { const e = extraOf(g), xx = e.outfit[nk(doc.title)]; if (xx?.acc?.[i]) xx.acc[i] = { ...xx.acc[i], s: v.s, d: v.d || v.s, user: true }; g.extra = e; }); } }, "✎") : null,
      local ? h("button", { type: "button", class: "rb-bzb", "aria-label": "지우기", onClick: () => save(env, (g) => { const e = extraOf(g), xx = e.outfit[nk(doc.title)]; if (xx) xx.acc.splice(i, 1); g.extra = e; }) }, "✕") : null)) : h("span", { class: "rb-muted" }, "없음"),
      local ? btn("+ 추가", { size: "sm", onClick: edit("acc") }) : null),
  ], null, "rb-life");
}

// 0.3.22 종족: 기록기가 알려 준 종족(직접 고르면 그대로 고정) · 일반 체질 · NSFW 체질 · 지금 발정기
const RACE_GROUPS = [["인간형", ["human", "highelf", "elf", "darkelf", "woodelf", "halfelf", "dwarf", "halfling", "gnome", "giant", "halfgiant", "ogre"]], ["수인(케모미미)", null], ["비인간 몸", ["harpy", "lizard", "lamia", "naga", "mermaid", "siren", "shark", "scylla", "bee", "butterfly", "arachne", "ant", "mantis", "centaur"]],
  ["용·신비", ["dragon", "phoenix", "unicorn", "angel", "fallen", "valkyrie", "god", "demigod", "spirit_fire", "spirit_water", "spirit_wind", "spirit_earth", "pixie", "dryad", "nymph"]], ["마족·어둠", ["succubus", "incubus", "demon", "vampire", "dhampir", "werewolf", "undead", "orc", "goblin", "hobgoblin", "troll", "oni"]],
  ["동양 요괴", ["gumiho", "yukionna", "kappa", "tengu", "nekomata", "imugi", "xian"]], ["인공·기타", ["android", "cyborg", "golem", "homunculus", "slime", "alraune", "ghost"]]];
export function raceCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, e = extraOf(f), local = env.backend?.id === "local", k = nk(doc.title);
  const p = parseIso(whenOf(f)), rv = raceView(f, doc, { iso: p ? isoOf(p) : "", cal: e.climate?.mdays ? e.climate : null, hemi: e.climate?.hemi ?? "N" });
  const adult = !!f?.nsfw?.[doc.id] && Object.keys(f.nsfw[doc.id].sexual ?? {}).length > 0;
  const rec = e.race[k] ?? Object.values(e.race).find((x) => namesOf(doc).has(nk(x.name)));
  const set = (id, label = "") => save(env, (g) => { const x = extraOf(g); x.race[k] = { name: doc.title, id, label, manual: true, at: turnOf(g) }; g.extra = x; });
  const groups = RACE_GROUPS.map(([g, ids]) => h("optgroup", { label: g }, (ids ?? RACES.filter((r) => r.frame === "beast" && !["werewolf", "centaur"].includes(r.id)).map((r) => r.id)).map((id) => h("option", { value: id, selected: id === rv.id ? "" : null }, RACE_BY_ID[id]?.label ?? id))));
  const pick = local ? h("div", { class: "rb-race-pick" },
    h("select", { class: "rb-input", "aria-label": "종족 고르기", onChange: (ev) => set(ev.target.value) }, groups),
    btn("이름 직접", { size: "sm", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: "종족 이름", label: "표에 없는 이름(예: 은빛 늑대족). 체질은 위에서 고른 종족을 따라요", value: rv.custom || "", ok: "저장" }); if (v != null) set(rv.id, v.trim().slice(0, 20)); } }),
    rec?.manual ? btn("기록기에 맡기기", { size: "sm", onClick: () => save(env, (g) => { const x = extraOf(g); delete x.race[k]; g.extra = x; }) }) : null) : null;
  const B = rv.body ?? {}, feat = [B.ears && "귀", B.horns && "뿔·더듬이", B.tail && B.tail !== "none" && "꼬리", B.wings && "날개", B.lower && "하반신"].filter(Boolean);
  return card("🧬 종족", [
    h("div", { class: "rb-race-head" }, h("b", null, rv.custom || rv.label), rv.custom ? h("small", null, `체질: ${rv.base}`) : null,
      rv.life ? h("span", { class: "rb-race-tag" }, `수명 ${rv.life >= 9999 ? "끝없음" : `${rv.life.toLocaleString()}년 안팎`}`) : null,
      rv.size && rv.size !== "normal" ? h("span", { class: "rb-race-tag" }, { tiny: "아주 작음", small: "작은 체구", big: "큰 체구", huge: "아주 큰 체구" }[rv.size] ?? "") : null,
      feat.length ? h("span", { class: "rb-race-tag" }, `모형: ${feat.join("·")}`) : null,
      !rv.known ? h("span", { class: "rb-race-tag mute" }, "기록 없음 · 인간으로 봐요") : rec?.manual ? h("span", { class: "rb-race-tag" }, "직접 고름") : h("span", { class: "rb-race-tag" }, "기록기가 정함")),
    rv.gen ? h("p", { class: "rb-race-tx" }, h("small", null, "일반"), rv.gen) : null,
    adult && rv.nsfw ? h("p", { class: "rb-race-tx nsfw" }, h("small", null, "NSFW"), rv.nsfw) : null,
    adult && rv.heat?.label ? h("p", { class: ["rb-race-heat", rv.heat.on && "on"] }, rv.heat.on ? `🔥 지금 ${rv.heat.label}` : rv.heat.label) : null,
    note("성격·말투는 바꾸지 않고 몸·체질·생활만 장면에 넣어요. 날씨·발정기·임신·성감대 계산에 이어져요."),
    pick,
  ], null, "rb-life");
}

// 궁합: 두 인물의 취향·금기·주도성·성감대로 계산(호출 없음)
export function compatCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, m = mem(env.ctx), mine = f?.nsfw?.[doc.id];
  const others = characterDocs(f).filter((d) => d.id !== doc.id && f?.nsfw?.[d.id]);   // 유저 칸과의 궁합도
  if (!mine || !others.length) return card("💞 궁합", [note(mine ? "궁합을 볼 상대가 없어요. 성인 프로필이 있는 다른 인물이 생기면 보여요." : "이 인물의 성인 프로필이 아직 없어요.")], null, "rb-life");
  m.compat ??= {};
  const pick = others.find((d) => d.id === m.compat[doc.id]) ?? others[0];
  const c = compatOf(mine, f.nsfw[pick.id], { usesA: f?.life?.p?.[doc.id]?.uses ?? {}, usesB: f?.life?.p?.[pick.id]?.uses ?? {} });
  const box = h("div", { class: "rb-compat" });
  const paint = () => env.redraw?.();
  const chips = h("div", { class: "rb-compat-pick", role: "group", "aria-label": "상대 고르기" }, others.map((d) => h("button", { type: "button", class: "rb-chip", "aria-pressed": d.id === pick.id ? "true" : "false", onClick: () => { m.compat[doc.id] = d.id; paint(); } }, d.title)));
  const R = 26, L = 2 * Math.PI * R, list = (t, arr, cls) => arr.length ? h("div", { class: ["row", cls] }, h("small", null, t), h("div", { class: "tags" }, arr.map((x) => h("span", null, x)))) : null;
  box.append(...[
    h("div", { class: "head" },
      h("svg", { svg: true, viewBox: "0 0 64 64", class: "ring", "aria-label": `궁합 ${c.score}점` }, h("circle", { svg: true, cx: 32, cy: 32, r: R, class: "bg" }), h("circle", { svg: true, cx: 32, cy: 32, r: R, class: "fg", "stroke-dasharray": `${(c.score / 100) * L} ${L}`, transform: "rotate(-90 32 32)" }),
        h("text", { svg: true, x: 32, y: 37, "text-anchor": "middle" }, String(c.score))),
      h("div", null, h("b", null, `${doc.title} × ${pick.title}`), h("div", { class: "lab" }, c.label), c.lead ? h("small", { class: "rb-muted" }, c.lead) : null)),
    list("둘 다 좋아함", c.shared, "ok"), list("아직 안 해 본 겹치는 취향", c.untried, "new"),
    list("엇갈림(한쪽은 좋아하고 한쪽은 싫어함)", c.clash.map((x) => `${x.item} — ${x.who === "a" ? doc.title : pick.title}만 좋아함`), "bad"),
    !c.shared.length && !c.clash.length ? note("겹치거나 엇갈리는 취향이 아직 없어요. 체위·플레이·선호·금기 태그가 쌓이면 더 정확해져요.") : null].filter(Boolean));   // 11-24: DOM append에 null을 넘기면 글자 “null”이 찍힌다
  return card("💞 궁합", [chips, box], null, "rb-life");
}

// 인물 일기: 고른 인물의 시점으로 최근 일을 한 단락. 가장 최근 응답 맨 아래에 보여 준다
export async function openDiary(ctx, { chaId, chatId, ci, doc, folder }) {
  const chat = await ctx.api.getChatFromIndex(ci, (await ctx.api.getCurrentChatIndex()));
  if (!chat) throw new Error("그 채팅을 열어 주세요. 일기는 지금 열린 채팅의 마지막 응답 아래에 붙어요.");
  ctx.toast?.(`${doc.title}의 일기를 쓰는 중이에요…`);
  const { writeDiary } = await import("../../../data/diary.js");   // 모델 고르기 모듈은 누를 때만 읽는다
  const e = await writeDiary(ctx.api, memStore(ctx), { chaId, chatId, chat, doc, folder });
  ctx.memory?.diary?.invalidate?.();
  ctx.toast?.(`${doc.title}의 일기를 마지막 응답 아래에 붙였어요.`, { seconds: 6 });
  return e;
}
export async function diaryFromWiki(env, doc) {
  const cur = await env.ctx.memory?.switches?.currentChat?.({ fresh: true }).catch?.(() => null);
  if (!cur || String(cur.chaId) !== String(env.bot.id) || String(cur.chatId) !== String(env.chatItem.id)) throw new Error("이 채팅을 리스에서 열어 둔 상태에서 눌러 주세요. 일기는 열린 채팅의 마지막 응답 아래에 붙어요.");
  await openDiary(env.ctx, { chaId: cur.chaId, chatId: cur.chatId, ci: cur.ci, doc, folder: env.folder });
}
// 채팅 메뉴에서: 지금 채팅의 인물 고르기 → 일기
export async function openDiaryHere(ctx) {
  const cur = await ctx.memory?.switches?.currentChat?.({ fresh: true }).catch?.(() => null);
  if (!cur) { ctx.toast?.("먼저 채팅을 열어 주세요."); return null; }
  const folder = await memStore(ctx).getFolder(cur.chaId, cur.chatId).catch(() => null);
  const docs = Object.values(folder?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && !/\{\{user\}\}/i.test(d.title));
  if (!docs.length) { ctx.toast?.("이 채팅엔 아직 인물 위키 문서가 없어요."); return null; }
  const doc = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "인물 일기" },
    h("b", null, "📔 누구의 일기를 쓸까요?"), note("그 인물의 시점으로 최근 일을 한 단락 써서 마지막 응답 맨 아래에 붙여요. AI를 한 번 불러요."),
    h("div", { class: "rb-compat-pick" }, docs.map((d) => h("button", { type: "button", class: "rb-chip", onClick: () => done(d) }, d.title))),
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) }))));
  if (!doc) return null;
  return openDiary(ctx, { chaId: cur.chaId, chatId: cur.chatId, ci: cur.ci, doc, folder }).catch((e) => { ctx.toast?.(e?.message ?? String(e), { error: true, seconds: 8 }); return null; });
}

// 인물 일기 목록(기록 탭): 쓴 일기를 보고 고치고 지운다
export function diaryCard(env, card, doc) {
  if (!doc) return null;
  const all = extraOf(env.folder).diary.map((x, i) => ({ x, i })).filter(({ x }) => x.docId === doc.id || nk(x.name) === nk(doc.title));
  const { rows, foot } = editRows(env, { kind: "diary", id: `diary:${doc.id}`, title: "일기", cls: "rb-diary-row",
    rows: all.reverse(), get: (g) => extraOf(g).diary, set: (g, arr) => { const e = extraOf(g); e.diary = arr; g.extra = e; },
    fields: [{ k: "text", label: "일기", type: "area", len: 1200 }],
    row: (d) => h("div", { class: "txt" }, h("small", { class: "rb-muted" }, d.at != null ? `#${d.at + 1} 응답` : ""), h("p", { style: "margin:2px 0;white-space:pre-wrap" }, d.text)) });
  return card("📔 일기", [rows.length ? h("ul", { class: "rb-mem-reclist" }, rows) : note("아직 쓴 일기가 없어요. 인물 머리의 ‘📔 일기’로 써요."), foot], null, "rb-life");
}

// 다른 봇으로 옮기기: 문서·기본 성격·성인 프로필·몸과 마음·기억 기록·목표를 복사(원본은 그대로, 관계는 옮기지 않음)
export async function openMovePerson(env, doc) {
  const { ctx } = env, bots = (await loadBots(ctx)).filter((b) => b.character?.chats?.length);
  const bot = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "다른 봇으로 옮기기" },
    h("b", null, `↗ ${doc.title}을(를) 어느 봇으로 옮길까요?`),
    note("인물 문서·기본 성격·성인 프로필·몸과 마음·기억 기록·목표를 복사해요. 원래 채팅은 그대로고, 관계는 그 봇에 없는 사람들이라 옮기지 않아요."),
    h("div", { class: "rb-move-list" }, bots.map((b) => h("button", { type: "button", class: "rb-chip", onClick: () => done(b) }, b.character.name || "이름 없는 봇", b.id === env.bot.id ? " (이 봇)" : ""))),
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) }))));
  if (!bot) return;
  const chats = await Promise.all(Array.from({ length: bot.character.chats.length }, (_, i) => loadChats(ctx, bot, false, i).then((l) => l[i]).catch(() => null)));
  const items = chats.filter(Boolean).filter((c) => !(bot.id === env.bot.id && c.id === env.chatItem.id));
  if (!items.length) { ctx.toast("옮길 채팅이 없어요."); return; }
  const chat = items.length === 1 ? items[0] : await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "채팅 고르기" },
    h("b", null, `${bot.character.name}의 어느 채팅에 넣을까요?`),
    h("div", { class: "rb-move-list" }, items.map((c) => h("button", { type: "button", class: "rb-chip", onClick: () => done(c) }, `${c.index + 1}. ${c.name ?? "채팅"}`))),
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) }))));
  if (!chat) return;
  const pack = personPack(env.folder, doc.id);
  if (!pack) throw new Error("이 인물의 위키 문서를 찾지 못했어요.");
  let res = null;
  await memStore(ctx).updateFolder(bot.id, chat.id, (f) => { res = insertPack(f, pack, { scope: { characterId: String(bot.id), chatKey: String(chat.id), characterName: bot.character.name ?? "", chatName: chat.name ?? "" } }); });
  mem(ctx).bots = null;
  ctx.toast(`${bot.character.name} › ${chat.name ?? "채팅"}에 ‘${res?.title ?? doc.title}’을(를) 옮겼어요.`, { seconds: 8 });
}

export const EXTRA_CSS = `${EDITROWS_CSS}${GUIDES_CSS}.rb-btn.rb-mem-fill{background:linear-gradient(135deg,#f7d154,#eaa82a)!important;color:#2a1c00!important;border-color:transparent!important;box-shadow:0 6px 18px rgba(234,168,42,.35)!important;animation:rbFillPulse 2.4s ease-in-out infinite}.rb-btn.rb-mem-fill svg{color:#2a1c00}@keyframes rbFillPulse{0%,100%{box-shadow:0 6px 18px rgba(234,168,42,.3)}50%{box-shadow:0 6px 26px rgba(234,168,42,.6)}}
.rb-race-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.rb-race-head>b{font-size:16px}.rb-race-head>small{opacity:.7}
.rb-race-tag{font-size:11px;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,#3aa597 14%,transparent);border:1px solid color-mix(in srgb,#3aa597 35%,transparent)}.rb-race-tag.mute{opacity:.65;background:transparent}
.rb-race-tx{margin:8px 0 0;font-size:13px;line-height:1.6;white-space:normal}.rb-race-tx small{display:inline-block;margin-right:6px;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:#3aa597}.rb-race-tx.nsfw small{color:#e8578e}
.rb-race-heat{margin:6px 0 0;font-size:12.5px;opacity:.8}.rb-race-heat.on{color:#e8578e;opacity:1;font-weight:700}
.rb-race-pick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.rb-race-pick select{flex:1;min-width:160px}
.rb-of-top{display:flex;gap:10px;align-items:flex-start}.rb-of-top>p{flex:1}
.rb-of-tg{flex:none;border:1px solid color-mix(in srgb,var(--rb-acc) 45%,transparent);background:transparent;color:var(--rb-acc);border-radius:999px;padding:4px 12px;font:inherit;font-size:12px;cursor:pointer}.rb-of-tg.on{background:color-mix(in srgb,var(--rb-acc) 14%,transparent)}
.rb-of{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px}
.rb-of-row{display:grid;grid-template-columns:5em 1fr auto;gap:8px;align-items:start;padding:8px 10px;border-radius:12px;background:var(--rb-surf2)}.rb-of-row small{color:var(--rb-mute);font-size:11.5px;padding-top:2px}.rb-of-row.empty b{color:var(--rb-mute);font-weight:400}
.rb-of-row p{margin:3px 0 0;font-size:12px;line-height:1.5;color:var(--rb-sub)}
.rb-of-acc{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}.rb-of-acc>small{color:var(--rb-mute);font-size:11.5px;margin-right:4px}.rb-of-acc>span{font-size:12px;padding:2px 6px 2px 10px;border-radius:999px;background:var(--rb-surf2)}.rb-of-acc>span i{font-style:normal;color:var(--rb-sub)}
.rb-fert-force{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:var(--rb-surf2);border:1px solid var(--rb-line2)}
.rb-fert-force>div{flex:1;display:flex;flex-direction:column;gap:2px}.rb-fert-force small{color:var(--rb-mute);font-size:11.5px}
.rb-fert-force.on{background:linear-gradient(90deg,color-mix(in srgb,#5cb6a8 18%,var(--rb-surf2)),var(--rb-surf2));border-color:color-mix(in srgb,#5cb6a8 50%,transparent)}.rb-fert-force.on b{color:#3c9a8c}
.rb-fert-btn{flex:none;border:0;border-radius:999px;padding:7px 16px;font:inherit;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#5cb6a8,#3c9a8c);color:#fff}.rb-fert-force.on .rb-fert-btn{background:var(--rb-surf);color:var(--rb-sub);border:1px solid var(--rb-line)}
.rb-fert-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px}
.rb-fert-tile{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:var(--rb-surf2)}.rb-fert-tile small{font-size:11px;color:var(--rb-mute)}.rb-fert-tile b{font-size:18px}.rb-fert-tile span{font-size:11px;color:var(--rb-mute)}
.rb-fert-tile.chance b{color:#ec4f86}.rb-fert-bar{display:block;height:5px;border-radius:3px;background:color-mix(in srgb,#ec4f86 14%,transparent);overflow:hidden;margin:3px 0}.rb-fert-bar>i{display:block;height:100%;background:linear-gradient(90deg,#f7a8c0,#ec4f86)}
.rb-fert-why{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.rb-fert-why span{font-size:11.5px;padding:2px 9px;border-radius:999px;background:color-mix(in srgb,#9b7fe0 14%,var(--rb-surf2))}
.rb-fert-sels{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px}.rb-fert-sel{display:flex;flex-direction:column;gap:4px}.rb-fert-sel small{font-size:11px;color:var(--rb-mute)}
.rb-fert-hist{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 6px}.rb-fert-hist>small{font-size:11px;color:var(--rb-mute);margin-right:4px}.rb-fert-hist span.birth,.rb-fert-hist span.loss{font-size:11.5px;padding:2px 9px;border-radius:999px;background:var(--rb-surf2)}.rb-fert-hist span.loss{color:#5c8bd6}.rb-fert-hist .acts{margin-left:auto;display:inline-flex;gap:4px}
.rb-marks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.rb-marks li{position:relative;display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:8px 12px;border-radius:12px;background:var(--rb-surf2);overflow:hidden;font-size:12.5px}
.rb-marks li .fade{position:absolute;left:0;bottom:0;height:2px;background:linear-gradient(90deg,#c2185b,#f7a8c0)}
.rb-compat-pick,.rb-move-list{display:flex;flex-wrap:wrap;gap:6px}
.rb-compat{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.rb-compat .head{display:flex;align-items:center;gap:12px}.rb-compat .lab{font-weight:700;color:#c2185b}
.rb-compat .ring{width:64px;height:64px;flex:none}.rb-compat .ring .bg{fill:none;stroke:color-mix(in srgb,#ec4f86 14%,transparent);stroke-width:6}
.rb-compat .ring .fg{fill:none;stroke:#ec4f86;stroke-width:6;stroke-linecap:round}.rb-compat .ring text{font-size:16px;font-weight:800;fill:var(--rb-text)}
.rb-compat .row{display:flex;flex-direction:column;gap:4px}.rb-compat .row small{font-size:11px;color:var(--rb-mute)}
.rb-compat .tags{display:flex;flex-wrap:wrap;gap:4px}.rb-compat .tags span{font-size:12px;padding:2px 9px;border-radius:999px;background:var(--rb-surf2)}
.rb-compat .row.ok .tags span{background:color-mix(in srgb,#ec4f86 14%,var(--rb-surf2))}.rb-compat .row.new .tags span{border:1px dashed #ec4f86}.rb-compat .row.bad .tags span{background:color-mix(in srgb,#5c8bd6 14%,var(--rb-surf2))}`;
