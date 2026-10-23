// 업데이트 영향 미리보기 (1.4.6)
// 업데이트·패치를 적용하기 전에 "이걸 바꾸면 어디에 닿는지"를 모아 준다. 읽기만 한다.

// 모듈: 어떤 봇·채팅·페르소나가 이 모듈을 쓰는지, 지금 켜져 있는지
export function moduleImpact(moduleId, { characters = [], enabledModules = [], personaMap = {}, personas = [], enabled = true } = {}) {
  const bots = [];
  let chats = 0;
  for (const ch of characters) {
    if (!ch || ch.trashTime) continue;
    const onBot = Array.isArray(ch.modules) && ch.modules.includes(moduleId);
    let onChats = 0;
    for (const c of Array.isArray(ch.chats) ? ch.chats : []) if (Array.isArray(c?.modules) && c.modules.includes(moduleId)) onChats++;
    chats += onChats;
    if (onBot || onChats) bots.push({ name: ch.name || "(이름 없음)", chats: onChats, onBot });
  }
  const pname = new Map(personas.filter((p) => p?.id).map((p) => [p.id, p.name || "(이름 없음)"]));
  const persona = Object.entries(personaMap ?? {}).filter(([, ids]) => Array.isArray(ids) && ids.includes(moduleId)).map(([id]) => pname.get(id) ?? "(지운 페르소나)");
  return { kind: "module", global: enabledModules.includes(moduleId), enabled, bots, chats, persona };
}

// 캐릭터: 업데이트해도 그대로인 것(채팅)과, 같이 확인하면 좋은 것(연결 모듈·그룹 채팅)
export function characterImpact(target, { characters = [], modules = [] } = {}) {
  const chatList = Array.isArray(target?.chats) ? target.chats : null;
  const msgs = (chatList ?? []).reduce((n, c) => n + (Array.isArray(c?.message) ? c.message.length : 0), 0);
  const mname = new Map(modules.filter((m) => m?.id).map((m) => [m.id, m.name || "(이름 없음)"]));
  const linked = (Array.isArray(target?.modules) ? target.modules : []).map((id) => mname.get(id) ?? "(없는 모듈)");
  const groups = characters.filter((g) => g && !g.trashTime && g.type === "group" && Array.isArray(g.characters) && g.characters.includes(target?.chaId)).map((g) => g.name || "(이름 없음)");
  return { kind: "character", chats: chatList ? chatList.length : null, messages: msgs, linked, groups };
}

var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var few = (list, n = 4) => list.length ? esc(list.slice(0, n).join(", ")) + (list.length > n ? ` 외 ${list.length - n}` : "") : "";

// 미리보기 칸 HTML (가져오기 화면의 .grid 모양을 그대로 쓴다)
export function impactHtml(imp) {
  if (!imp) return "";
  const rows = [];
  if (imp.kind === "module") {
    rows.push(["상태", `${imp.enabled ? "켜짐" : "꺼짐"}${imp.global ? " · 글로벌 활성" : ""}`]);
    rows.push(["쓰는 봇", imp.bots.length ? `<b>${imp.bots.length}개</b> — ${few(imp.bots.map((b) => b.name))}` : "없음"]);
    if (imp.chats) rows.push(["채팅별 연결", `${imp.chats}개`]);
    if (imp.persona.length) rows.push(["페르소나", `${imp.persona.length}개 — ${few(imp.persona)}`]);
  } else {
    rows.push(["채팅", imp.chats === null ? "이 앱에서는 열지 않은 봇의 채팅을 읽을 수 없어요 — 채팅은 그대로 둬요" : imp.chats ? `${imp.chats}개 (메시지 ${imp.messages}) — 그대로 둬요` : "없음"]);
    if (imp.linked.length) rows.push(["연결 모듈", `${imp.linked.length}개 — ${few(imp.linked)}`]);
    if (imp.groups.length) rows.push(["그룹 채팅", `${imp.groups.length}개 — ${few(imp.groups)}`]);
  }
  const reach = imp.kind === "module" ? imp.global || imp.bots.length || imp.persona.length : imp.groups.length;
  return `<div class="impact"><div class="muted" style="margin:10px 0 4px">${reach ? "이 업데이트가 닿는 곳" : "영향 범위"}</div><div class="grid">${rows.map(([k, v]) => `<b>${esc(k)}</b><span>${v}</span>`).join("")}</div></div>`;
}
// 확인 창(글자만)용 한두 줄 요약
export function impactText(imp) {
  if (!imp) return "";
  const names = (list) => list.slice(0, 3).join(", ") + (list.length > 3 ? ` 외 ${list.length - 3}` : "");
  if (imp.kind === "module") {
    const parts = [imp.enabled ? "켜짐" : "꺼짐", imp.global && "글로벌 활성", imp.bots.length ? `쓰는 봇 ${imp.bots.length}개 (${names(imp.bots.map((b) => b.name))})` : "쓰는 봇 없음", imp.chats && `채팅별 연결 ${imp.chats}개`, imp.persona.length && `페르소나 ${imp.persona.length}개`];
    return `영향: ${parts.filter(Boolean).join(" · ")}`;
  }
  const parts = [imp.chats === null ? "채팅은 그대로" : `채팅 ${imp.chats}개는 그대로`, imp.linked.length && `연결 모듈 ${imp.linked.length}개`, imp.groups.length && `그룹 채팅 ${imp.groups.length}개 (${names(imp.groups)})`];
  return `영향: ${parts.filter(Boolean).join(" · ")}`;
}
