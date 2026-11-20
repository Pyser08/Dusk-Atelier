// 장기기억 애드온(0.3.22): 인물 위키에 붙는 새 칸 — 몸 흔적 · 궁합 · 인물 일기 · 다른 봇으로 옮기기.
import { h } from "../../dom.js";
import { btn, modal, promptDialog, confirmDialog } from "../../kit.js";
import { memStore } from "./memstore.js";
import { mem, fail, loadBots, loadChats } from "./common.js";
import { extraOf, activeMarks, markAge, compatOf, personPack, insertPack, nk } from "../../../engine/memextra.js";

const note = (t) => h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, t);
const turnOf = (f) => (Number.isInteger(f?.cursor?.at) ? f.cursor.at : 0);
const whenOf = (f) => [...(f?.scenes ?? [])].filter((x) => !x.orphan && x.when).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0]?.when ?? "";
const namesOf = (doc) => new Set([doc.title, ...(doc.aliases ?? [])].map(nk));
const save = (env, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, fn)).then(() => env.redraw?.()).catch(fail(env.ctx));

// 몸 흔적: 키스마크·멍·긁힌 자국 등. 이야기 날짜(모르면 턴)로 며칠 뒤 사라진다
export function marksCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, names = namesOf(doc), turn = turnOf(f), when = whenOf(f), local = env.backend?.id === "local";
  const all = extraOf(f).marks.map((m, i) => ({ ...m, i })).filter((m) => names.has(nk(m.name)));
  const live = activeMarks(all, turn, when);
  const add = local ? btn("흔적 추가", { size: "sm", onClick: async () => {
    const part = await promptDialog(env.ctx.win, { title: "몸 흔적 추가", label: "부위(예: 목)", ok: "다음" }); if (!part?.trim()) return;
    const desc = await promptDialog(env.ctx.win, { title: part.trim(), label: "어떤 흔적(예: 키스마크)", ok: "다음" }); if (!desc?.trim()) return;
    const days = await promptDialog(env.ctx.win, { title: "며칠 동안 남을까요?", label: "1~14일", value: "3", ok: "추가" }); if (days == null) return;
    save(env, (g) => { const e = extraOf(g); e.marks.push({ name: doc.title, part: part.trim().slice(0, 20), desc: desc.trim().slice(0, 60), days: Math.max(1, Math.min(14, Math.round(Number(days) || 3))), at: turnOf(g), when: whenOf(g), manual: true }); g.extra = e; });
  } }) : null;
  return card("🩹 몸 흔적", [
    note("키스마크·멍·긁힌 자국처럼 몸에 남은 흔적이에요. 기록기가 응답에서 찾아 넣고, 이야기 날짜(없으면 턴)로 며칠 뒤 사라져요. 남아 있는 동안 장면에 넣어 줘요."),
    live.length ? h("ul", { class: "rb-marks" }, live.map((m) => { const age = markAge(m, turn, when), left = Math.max(0, (m.days ?? 3) - age);
      return h("li", null, h("b", null, m.part), h("span", null, m.desc), h("small", { class: "rb-muted" }, `${age + 1}일째 · ${left ? `${left}일 더` : "곧 사라짐"}`),
        h("i", { class: "fade", style: { width: `${Math.round((left / (m.days || 3)) * 100)}%` } }),
        local ? h("button", { type: "button", class: "rb-bzb", title: "지우기", "aria-label": "지우기", onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 흔적을 지울까요?", ok: "지우기", danger: true }))) return; save(env, (g) => { const e = extraOf(g); e.marks = e.marks.filter((x) => !(nk(x.name) === nk(m.name) && x.at === m.at && x.part === m.part && x.desc === m.desc)); g.extra = e; }); } }, "✕") : null); }))
      : note("지금 남은 흔적이 없어요."),
    add ? h("div", { class: "rb-mem-rowact" }, add) : null,
  ], null, "rb-life");
}

// 궁합: 두 인물의 취향·금기·주도성·성감대로 계산(호출 없음)
export function compatCard(env, card, doc) {
  if (!doc) return null;
  const f = env.folder, m = mem(env.ctx), mine = f?.nsfw?.[doc.id];
  const others = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character" && d.id !== doc.id && f?.nsfw?.[d.id]);
  if (!mine || !others.length) return card("💞 궁합", [note(mine ? "궁합을 볼 상대가 없어요. 성인 프로필이 있는 다른 인물이 생기면 보여요." : "이 인물의 성인 프로필이 아직 없어요.")], null, "rb-life");
  m.compat ??= {};
  const pick = others.find((d) => d.id === m.compat[doc.id]) ?? others[0];
  const c = compatOf(mine, f.nsfw[pick.id], { usesA: f?.life?.p?.[doc.id]?.uses ?? {}, usesB: f?.life?.p?.[pick.id]?.uses ?? {} });
  const box = h("div", { class: "rb-compat" });
  const paint = () => env.redraw?.();
  const chips = h("div", { class: "rb-compat-pick", role: "group", "aria-label": "상대 고르기" }, others.map((d) => h("button", { type: "button", class: "rb-chip", "aria-pressed": d.id === pick.id ? "true" : "false", onClick: () => { m.compat[doc.id] = d.id; paint(); } }, d.title)));
  const R = 26, L = 2 * Math.PI * R, list = (t, arr, cls) => arr.length ? h("div", { class: ["row", cls] }, h("small", null, t), h("div", { class: "tags" }, arr.map((x) => h("span", null, x)))) : null;
  box.append(
    h("div", { class: "head" },
      h("svg", { svg: true, viewBox: "0 0 64 64", class: "ring", "aria-label": `궁합 ${c.score}점` }, h("circle", { svg: true, cx: 32, cy: 32, r: R, class: "bg" }), h("circle", { svg: true, cx: 32, cy: 32, r: R, class: "fg", "stroke-dasharray": `${(c.score / 100) * L} ${L}`, transform: "rotate(-90 32 32)" }),
        h("text", { svg: true, x: 32, y: 37, "text-anchor": "middle" }, String(c.score))),
      h("div", null, h("b", null, `${doc.title} × ${pick.title}`), h("div", { class: "lab" }, c.label), c.lead ? h("small", { class: "rb-muted" }, c.lead) : null)),
    list("둘 다 좋아함", c.shared, "ok"), list("아직 안 해 본 겹치는 취향", c.untried, "new"),
    list("엇갈림(한쪽은 좋아하고 한쪽은 싫어함)", c.clash.map((x) => `${x.item} — ${x.who === "a" ? doc.title : pick.title}만 좋아함`), "bad"),
    !c.shared.length && !c.clash.length ? note("겹치거나 엇갈리는 취향이 아직 없어요. 체위·플레이·선호·금기 태그가 쌓이면 더 정확해져요.") : null);
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
  await memStore(ctx).updateFolder(bot.id, chat.id, (f) => { res = insertPack(f, pack); });
  mem(ctx).bots = null;
  ctx.toast(`${bot.character.name} › ${chat.name ?? "채팅"}에 ‘${res?.title ?? doc.title}’을(를) 옮겼어요.`, { seconds: 8 });
}

export const EXTRA_CSS = `.rb-marks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
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
