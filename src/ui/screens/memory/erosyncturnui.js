// NSFW 설정 → 분석·관리: ‘매 턴 계산’ 카드(2.2.0). 장기기억이 턴을 기록하면 그 턴 인물의 성향 값을 변화분만 갱신.
// 처음 값(출발값)은 아래 ‘출발값 만들기’(원래 인물 분석)로. 바뀐 기록은 최근 것부터.
import { h, replace } from "../../dom.js";
import { btn, chip } from "../../kit.js";
import { toggleField } from "../../fields.js";

const p = (t, id) => h("p", { class: "rb-muted", style: "white-space:normal;margin:0", id }, t);
const GROUPS = [["axes", "8가지 성향"], ["sexual", "성적 항목"]];
const LABEL = { initiative: "주도성", spontaneity: "즉흥성", directness: "직설성", goalPersistence: "끈기", obsessiveness: "집착", publicOpenness: "공개성", extremity: "극단성",
  eroticInterest: "성적 관심도", sexualSpontaneity: "성적 즉흥성", sexualOpenness: "성적 개방성", sexualMomentum: "성적 추진력" };
const when = (at) => { try { return new Date(at).toLocaleString(); } catch { return ""; } };
export const turnChangeText = (c) => Object.keys(c.after ?? {}).map((k) => `${LABEL[k] ?? k} ${c.before?.[k] ?? "?"}→${c.after[k]}`).join(", ");

function statusText(s, attached, memOn) {
  if (!memOn) return "장기기억 자동 기록이 꺼져 있어서 매 턴 계산도 쉬어요.";
  if (!attached) return "장기기억 턴 흐름에 아직 연결되지 않았어요. 장기기억을 켜면 연결돼요.";
  if (!s) return "다음 턴부터 계산해요.";
  if (s.phase === "running") return `계산 중 · ${(s.names ?? []).join(", ")}`;
  if (s.phase === "error") return `마지막 계산 실패 · ${s.message}`;
  const n = s.changed?.length ?? 0, miss = s.unmatched?.length ? ` · 출발값 없는 인물: ${s.unmatched.join(", ")}` : "";
  return `${when(s.at)} · ${n ? `${n}명 갱신` : "바뀐 값 없음"}${miss}`;
}

export function erosyncTurnCard(ctx) {
  const T = ctx.erosyncTurn, body = h("div", { style: "display:grid;gap:10px" });
  const card = h("section", { class: "rb-card rb-mem-sec", id: "rb-erosync-turn" }, h("h3", null, "매 턴 계산"),
    p("장기기억이 한 턴을 기록할 때마다, 그 턴에 나온 인물의 성향 값을 대화에 맞게 조금씩 고쳐요. 바뀐 항목만 보조 모델을 한 번 불러 계산하고, 한 턴에 15 넘게는 움직이지 않아요. 직접 고친 값과 잠근 인물은 그대로 둬요."), body);
  if (!T) { replace(body, p("이 버전에서는 매 턴 계산을 쓸 수 없어요.")); return card; }
  const draw = async () => {
    const s = await T.settings(), log = await T.history();
    T.tryAttach?.();
    const memOn = ctx.memory?.flow?.isOn?.() !== false;
    const groups = h("div", { class: "rb-mem-sact", id: "rb-erosync-turn-groups", role: "group", "aria-label": "계산할 항목" },
      ...GROUPS.map(([k, l]) => chip(l, { pressed: s.groups.includes(k), onClick: async () => {
        const next = s.groups.includes(k) ? s.groups.filter((g) => g !== k) : [...s.groups, k];
        if (!next.length) { ctx.toast("항목을 하나는 골라 주세요"); return; }
        await T.save({ groups: next }); void draw();
      } })));
    const rows = log.slice(0, 8).map((c) => h("li", null, h("b", null, c.name), ` · ${turnChangeText(c)}`, c.reason ? h("small", { class: "rb-muted", style: "display:block" }, c.reason) : null));
    replace(body,
      toggleField({ label: "매 턴 계산 켜기", hint: "장기기억 자동 기록이 켜져 있어야 해요", id: "rb-erosync-turn-on", on: s.on, onChange: async (v) => { await T.save({ on: v }); void draw(); } }),
      s.on ? groups : null,
      p(statusText(T.status(), T.attached(), memOn), "rb-erosync-turn-status"),
      log.length ? h("div", { id: "rb-erosync-turn-log" }, h("b", null, "최근 바뀐 값"),
        h("ul", { class: "rb-muted", style: "white-space:normal;padding-left:18px;margin:6px 0 0" }, ...rows),
        h("div", { class: "rb-mem-sact" }, btn("기록 지우기", { size: "sm", id: "rb-erosync-turn-clear", onClick: async () => { await T.clearHistory(); void draw(); } }))) : null);
  };
  void draw();
  return card;
}
