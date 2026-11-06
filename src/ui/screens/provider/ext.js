// 프로바이더 화면 ‘확장’ 탭(2.0.0): MCP 서버 · 스킬 · 훅. 비밀(MCP 토큰)은 키 보관함에, 설정에는 안 둔다.
import { h } from "../../dom.js";
import { btn, note, toggleRow } from "../../kit.js";
import { normalizeMcpServer } from "../../../engine/provider/mcp.js";
import { normalizeSkill } from "../../../engine/provider/skills.js";
import { normalizeHook } from "../../../engine/provider/hooks.js";
import { field, text, num, area, grid, select } from "./ui.js";
import { safeName, reqKey, resKey } from "../../../engine/provider/mailbox.js";

export async function ext({ P, cfg, mutate, draw, toast }) {
  const out = [], fail = (e) => toast(e?.message ?? String(e), { error: true });
  // ── MCP ──
  out.push(note("info", "MCP 서버의 도구를 모델이 쓸 수 있게 해요(streamable-http 방식 주소). 읽기 전용이라고 밝힌 도구만 바로 쓰고, 그 밖의 도구는 ‘쓰기 도구 허용’을 켠 서버에서만 — 실행할 때마다 확인해요. 예전 SSE 전용 서버는 안 돼요."));
  const servers = cfg.mcp?.servers ?? [];
  const setSrv = (i, fn) => mutate((x) => { fn(x.mcp.servers[i]); });
  const srvCards = servers.map((s, i) => {
    const keyIn = h("input", { class: "rb-input", type: "password", placeholder: s.keyId ? "저장됨 — 새로 붙여 넣으면 바뀌어요" : "인증 토큰(선택)", "aria-label": "MCP 인증 토큰", autocomplete: "off", onchange: async (e) => { const v = e.target.value.trim(); if (!v) return; try { const id = await P.vault.add(`${s.name} MCP 토큰`, v); e.target.value = ""; await setSrv(i, (q) => { q.keyId = id; }); toast("토큰을 이 기기에 저장했어요"); draw(); } catch (er) { fail(er); } } });
    const names = s.tools.map((t) => `${t.name}${t.annotations?.readOnlyHint ? "" : " (쓰기)"}`).join(", ");
    return h("section", { class: "rb-pcard", dataset: { mcp: s.id } },
      h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, s.name), h("small", { class: "rb-muted" }, s.url || "주소를 적어 주세요")), btn("", { icon: "trash", size: "sm", title: "지우기", onClick: async () => { await mutate((x) => { x.mcp.servers.splice(i, 1); }); P.mcp.forget(s.id); draw(); } })),
      grid(field("이름", text(s.name, (v) => setSrv(i, (q) => { q.name = v || "MCP 서버"; }))), field("주소", text(s.url, (v) => setSrv(i, (q) => { q.url = v.trim(); }), { ph: "https://…/mcp" })), field("인증 토큰", keyIn, "Bearer 토큰. 설정이 아니라 키 보관함에 저장돼요")),
      toggleRow("사용", "끄면 모델이 이 서버의 도구를 못 봐요.", s.enabled, (v) => setSrv(i, (q) => { q.enabled = v; })),
      toggleRow("쓰기 도구 허용", "읽기 전용이라고 밝히지 않은 도구도 보여요. 실행할 때마다 확인창이 떠요.", s.allowWrite, (v) => setSrv(i, (q) => { q.allowWrite = v; })),
      h("div", { class: "acts" }, btn("도구 불러오기", { icon: "refresh", onClick: async () => { try { const tools = await P.mcp.list(s); await setSrv(i, (q) => { Object.assign(q, normalizeMcpServer({ ...q, tools })); }); toast(`도구 ${tools.length}개를 불러왔어요`); draw(); } catch (e) { fail(e); } } })),
      s.tools.length ? h("small", { class: "rb-muted" }, `도구 ${s.tools.length}개: ${names}`) : h("small", { class: "rb-muted" }, "도구를 아직 불러오지 않았어요"));
  });
  out.push(h("section", { class: "rb-pcard" }, h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "MCP 서버"))), ...srvCards, h("div", { class: "rb-actions" }, btn("서버 추가", { icon: "plus", onClick: async () => { await mutate((x) => { x.mcp.servers.push(normalizeMcpServer({ name: "새 서버" })); }); draw(); } }))));
  // ── 스킬 ──
  const skills = cfg.skills ?? [], setSk = (i, fn) => mutate((x) => { fn(x.skills[i]); });
  out.push(h("section", { class: "rb-pcard" }, h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "스킬"), h("small", { class: "rb-muted" }, "요청마다 끼워 넣는 짧은 지침이에요. 모델 이름 조건(정규식)을 비우면 모든 모델에, 적으면 맞는 모델에만 넣어요. 스킬마다 토큰 상한이 있어요."))),
    ...skills.map((k, i) => h("div", { class: "rb-pcard", dataset: { skill: k.id } },
      h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, k.name)), btn("", { icon: "trash", size: "sm", title: "지우기", onClick: async () => { await mutate((x) => { x.skills.splice(i, 1); }); draw(); } })),
      grid(field("이름", text(k.name, (v) => setSk(i, (q) => { q.name = v || "스킬"; }))), field("모델 조건", text(k.models, (v) => setSk(i, (q) => { q.models = v; }), { ph: "예: claude|gemini (비우면 전부)" })), field("최대 토큰", num(k.maxTokens, (v) => setSk(i, (q) => { q.maxTokens = v ?? 1000; }), { step: "50" }))),
      field("내용", area(k.text, (v) => setSk(i, (q) => { q.text = v; }), { rows: 4, ph: "모델에게 알려 줄 지침" })),
      toggleRow("사용", "", k.enabled, (v) => setSk(i, (q) => { q.enabled = v; })))),
    h("div", { class: "rb-actions" }, btn("스킬 추가", { icon: "plus", onClick: async () => { await mutate((x) => { x.skills.push(normalizeSkill({ name: "새 스킬" })); }); draw(); } }))));
  // ── 훅 ──
  const hooks = cfg.hooks ?? [], setHk = (i, fn) => mutate((x) => { fn(x.hooks[i]); });
  out.push(h("section", { class: "rb-pcard" }, h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "훅(앞·뒤 처리)"), h("small", { class: "rb-muted" }, "모델별로 보내기 전 글과 받은 글을 정규식으로 찾아 바꿔요. 코드는 실행하지 않아요. 뒤 처리가 있으면 그 모델의 응답은 한번에 받아서 고쳐요(스트림 불가)."))),
    ...hooks.map((k, i) => h("div", { class: "rb-pcard", dataset: { hook: k.id } },
      h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, k.name)), btn("", { icon: "trash", size: "sm", title: "지우기", onClick: async () => { await mutate((x) => { x.hooks.splice(i, 1); }); draw(); } })),
      grid(field("이름", text(k.name, (v) => setHk(i, (q) => { q.name = v || "훅"; }))), field("모델 조건", text(k.modelRegex, (v) => setHk(i, (q) => { q.modelRegex = v; }), { ph: "예: gpt (비우면 전부)" })),
        field("보내기 전: 찾기", text(k.pre.find, (v) => setHk(i, (q) => { q.pre.find = v; }))), field("보내기 전: 바꾸기", text(k.pre.replace, (v) => setHk(i, (q) => { q.pre.replace = v; }))),
        field("받은 뒤: 찾기", text(k.post.find, (v) => setHk(i, (q) => { q.post.find = v; }))), field("받은 뒤: 바꾸기", text(k.post.replace, (v) => setHk(i, (q) => { q.post.replace = v; })))),
      toggleRow("사용", "", k.enabled, (v) => setHk(i, (q) => { q.enabled = v; })))),
    h("div", { class: "rb-actions" }, btn("훅 추가", { icon: "plus", onClick: async () => { await mutate((x) => { x.hooks.push(normalizeHook({ name: "새 훅" })); }); draw(); } }))));
  // ── 다른 플러그인 창구(11단계) ──
  const ipc = cfg.ipc, setIpc = (fn) => mutate((x) => { fn(x.ipc); }), mb = P.mailbox?.status?.() ?? { inflight: 0, queued: 0, plugins: [] };
  const names = [...new Set([...Object.keys(ipc.plugins), ...(mb.plugins ?? [])])];
  const addIn = h("input", { class: "rb-input", placeholder: "플러그인 이름(미리 허용하려면)", "aria-label": "허용할 플러그인 이름", autocomplete: "off" });
  out.push(h("section", { class: "rb-pcard", dataset: { ipc: "1" } },
    h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "다른 플러그인 창구"), h("small", { class: "rb-muted" }, "다른 플러그인이 Dusk 프로바이더로 모델을 부를 수 있게 해요. 플러그인 저장소에 요청을 적으면 Dusk가 처리해 결과 칸에 돌려줘요. 기본은 꺼짐이고, 처음 보는 플러그인은 허용 여부를 물어요."))),
    toggleRow("창구 켜기", "켜면 몇 초마다 요청 칸을 살펴요. 끄면 아무것도 읽지 않아요.", ipc.enabled, async (v) => { await setIpc((q) => { q.enabled = v; }); draw(); }),
    grid(field("동시에 처리", num(ipc.concurrency, (v) => setIpc((q) => { q.concurrency = v ?? 2; }), { step: "1", ph: "2" }), "1~8. 넘치는 요청은 줄을 서요"),
      field("살피는 간격(초)", num(ipc.pollSec, (v) => setIpc((q) => { q.pollSec = v ?? 3; }), { step: "1", ph: "3" }), "1~30"),
      field("기본 프로필", select([["", "(용도 ‘보조·기타’와 같게)"], ...cfg.profiles.map((p) => [p.id, p.name])], ipc.profileId, (v) => setIpc((q) => { q.profileId = v; }), "창구 기본 프로필"), "요청이 프로필을 지정하지 않을 때")),
    ...names.map((n) => { const a = ipc.plugins[n]?.allow; return h("div", { class: "rb-pcard", dataset: { ipcPlugin: n } },
      h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, n), h("small", { class: "rb-muted" }, a === true ? "허용됨" : a === false ? "거절됨" : "아직 안 물어봤어요")),
        btn("", { icon: "trash", size: "sm", title: "목록에서 지우기", onClick: async () => { await setIpc((q) => { delete q.plugins[n]; }); P.mailbox?.forget?.(n); draw(); } })),
      toggleRow("허용", "끄면 이 플러그인의 요청은 거절 결과로 돌려줘요.", a === true, async (v) => { await setIpc((q) => { q.plugins[n] = { allow: v }; }); draw(); }),
      h("small", { class: "rb-muted" }, `요청 칸 ${reqKey(n)} · 결과 칸 ${resKey(n)}`)); }),
    h("div", { class: "rb-actions" }, addIn, btn("미리 허용", { icon: "plus", onClick: async () => { const n = safeName(addIn.value); if (!n) return toast("플러그인 이름을 적어 주세요", { error: true }); await setIpc((q) => { q.plugins[n] = { allow: true }; }); draw(); } })),
    h("small", { class: "rb-muted" }, `지금 처리 중 ${mb.inflight}개 · 대기 ${mb.queued}개. 재시도·키 순환·대체 사슬·예산은 다른 요청과 똑같이 적용돼요.`)));
  return out;
}
