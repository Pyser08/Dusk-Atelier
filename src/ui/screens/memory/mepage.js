// '나' 화면 (1.8.3): 다른 인물들이 나({{user}})를 어떻게 기억하는지 한 화면에. 인물 위키와 같은 카드·칩·감정 막대를 쓴다.
// 맨 위에는 예전에 페르소나 이름으로 따로 쌓인 인물을 '나'로 합치는 카드(미리 보기 → 확인 뒤 실행).
import { h, replace } from "../../dom.js";
import { btn, confirmDialog, emptyState, pageHead } from "../../kit.js";
import { icon } from "../../icons.js";
import { mem, avatar, fail } from "./common.js";
import { EMO_TAGS, EMO_LABEL, GAUGE_MAX } from "../../../engine/memoryemo.js";
import { meView, userMergePlan, mergeIntoUser, TONE_LABEL } from "../../../engine/memoryuser.js";
import { dbRead } from "../../../data/dbcache.js";

async function personaNames(ctx) {
  try { const db = await dbRead(ctx.api, ["username"]); return db?.username ? [String(db.username)] : []; } catch { return []; }
}
const bar = (t, val) => h("div", { class: "rb-wk2-bar" }, h("i", { class: `dot e-${t}`, "aria-hidden": "true" }), h("span", null, EMO_LABEL[t]),
  h("span", { class: "track", role: "progressbar", "aria-label": EMO_LABEL[t], "aria-valuemin": 0, "aria-valuemax": GAUGE_MAX, "aria-valuenow": val }, h("i", { class: `e-${t}`, style: { width: `${(val / GAUGE_MAX) * 100}%` } })),
  h("small", null, `${val}/${GAUGE_MAX}`));
const kv = (k, v) => (v ? h("div", { class: "rb-me-kv" }, h("span", null, k), h("b", null, v)) : null);

function otherCard(o, openWiki) {
  const feelRows = EMO_TAGS.filter((t) => (o.feel[t] ?? 0) > 0).map((t) => bar(t, o.feel[t]));
  return h("article", { class: "rb-card bordered rb-me-card", "data-who": o.name },
    h("header", { class: "rb-me-chead" }, avatar(o.name),
      h("span", { class: "t" }, h("b", null, o.name), h("small", null, `함께한 장면 ${o.shared}개`)),
      h("span", { class: `rb-me-stage s-${o.stage.replace(/\s+/g, "-")}` }, o.stageLabel)),
    h("section", { class: "rb-me-sec" }, h("span", { class: "h" }, `${o.name}이(가) 나에게 느끼는 감정`),
      feelRows.length ? feelRows : h("small", { class: "rb-muted" }, "아직 기록된 감정이 없어요.")),
    (o.callsMe || o.iCall || o.face) ? h("section", { class: "rb-me-sec" }, h("span", { class: "h" }, "호칭 · 태도"),
      kv("나를 부르는 말", o.callsMe ? `${o.callsMe}${o.toneToMe ? ` · ${TONE_LABEL[o.toneToMe] ?? o.toneToMe}` : ""}` : ""),
      kv("내가 부르는 말", o.iCall),
      o.face ? kv("둘이 있을 때", o.face.alone) : null, o.face ? kv("남들 앞에서", o.face.public) : null) : null,
    o.bond ? h("section", { class: "rb-me-sec" }, h("span", { class: "h" }, "둘만의 추억"), h("p", { class: "rb-me-quote" }, o.bond)) : null,
    o.rifts.length || o.beliefs.length ? h("div", { class: "rb-chips rb-me-flags" },
      ...o.rifts.map((r) => h("span", { class: "rb-chip warn" }, `갈등 · ${r.about || "풀리지 않음"}`)),
      ...o.beliefs.map((b) => h("span", { class: "rb-chip" }, `오해 · ${b}`))) : null,
    h("footer", { class: "rb-me-foot" }, h("button", { type: "button", class: "rb-textlink", onClick: () => openWiki(o.name) }, `${o.name} 인물 위키`, icon("chevron", 14))));
}

export async function renderMemoryMe(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  const back = { label: "장기 기억으로", onClick: () => { m.page = "home"; redraw(); } };
  const cur = await M.switches.currentChat();
  if (!cur) return replace(host, h("div", { class: "rb-me" }, pageHead("나", { back }), emptyState({ icon: "character", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅에서 다른 인물들이 나를 어떻게 기억하는지 보여 줘요." })));
  const [folder, names] = await Promise.all([M.store.getFolder(cur.chaId, cur.chatId).catch(() => null), personaNames(ctx)]);
  const v = folder ? meView(folder) : { records: 0, moments: [], others: [] };
  const plan = folder ? userMergePlan(folder, names) : { people: [], links: 0 };
  const openWiki = (name) => { m.botId = cur.chaId; m.chatIndex = cur.ti; m.tab = "people"; m.personKey = String(name).toLowerCase().replace(/\s+/g, ""); m.page = "detail"; redraw(); };

  const merge = plan.people.length || plan.links ? h("section", { class: "rb-card bordered rb-me-merge" },
    h("div", { class: "t" }, h("b", null, "나로 합칠 수 있는 기록이 있어요"),
      h("small", null, plan.people.length ? `${plan.people.map((p) => `'${p.name}' 기록 ${p.records}개`).join(", ")}${plan.links ? ` · 감정·호칭 등 ${plan.links}개` : ""}가 따로 쌓여 있어요. 합치면 모두 '나'의 기록이 되고, 이름은 별칭으로 남아요.` : `감정·호칭 등 ${plan.links}개가 다른 이름으로 이어져 있어요.`)),
    btn("나로 합치기", { kind: "primary", size: "sm", id: "rb-me-merge", onClick: async () => {
      const ok = await confirmDialog(ctx.win, { title: "나로 합칠까요?", body: `${plan.people.map((p) => `'${p.name}'`).join(", ") || "다른 이름"}의 기록과 감정·호칭·관계를 모두 '나'로 옮겨요. 이 채팅 기억에만 적용되고, 되돌리기는 기억 백업으로만 할 수 있어요.`, ok: "합치기" });
      if (!ok) return;
      try {
        let r = null;
        await M.store.updateFolder(cur.chaId, cur.chatId, (f) => { r = mergeIntoUser(f, names); });
        ctx.toast(`'나'로 합쳤어요 · 인물 ${r?.people ?? 0}명 · 연결 ${r?.links ?? 0}개`);
        redraw();
      } catch (e) { fail(ctx)(e); }
    } })) : null;

  const close = v.others.filter((o) => o.stage === "close" || o.stage === "very close").length;
  const stats = h("div", { class: "rb-hnums rb-me-nums" },
    h("div", { class: "rb-hnum" }, h("b", null, String(v.others.length)), h("small", null, "나를 아는 인물")),
    h("div", { class: "rb-hnum" }, h("b", null, String(close)), h("small", null, "가까운 사이")),
    h("div", { class: "rb-hnum" }, h("b", null, String(v.records)), h("small", null, "내 기록")));
  const head = h("section", { class: "rb-card bordered rb-me-head" },
    h("div", { class: "rb-me-hrow" }, h("span", { class: "rb-mem-av rb-me-av", "aria-hidden": "true" }, "나"),
      h("span", { class: "t" }, h("b", null, "나"), h("small", null, `${cur.botName}${cur.chatName ? " · " + cur.chatName : ""} · 다른 인물들이 기억하는 나`))),
    stats);
  const moments = v.moments.length ? h("section", { class: "rb-card bordered rb-me-moments" }, h("span", { class: "h" }, "내가 남긴 순간"),
    h("ul", null, ...v.moments.map(({ r, vague }) => h("li", { class: vague ? "vague" : "" }, h("span", { class: "rb-grade", "data-g": r.g || "-" }, r.g || "–"), h("span", null, r.act ?? ""))))) : null;
  const list = v.others.length
    ? h("div", { class: "rb-me-grid" }, ...v.others.map((o) => otherCard(o, openWiki)))
    : emptyState({ icon: "character", title: "아직 나를 기억하는 인물이 없어요", text: "대화가 이어지면 인물들이 나에게 느끼는 감정·호칭이 여기에 쌓여요." });
  replace(host, h("div", { class: "rb-me" }, pageHead("나", { back, sub: "다른 인물들이 나를 어떻게 보고 부르는지 모아 봐요." }), merge, head, moments, list));
}
